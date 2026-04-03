document.addEventListener("DOMContentLoaded", () => {
  const items = document.querySelectorAll(".scrap-item");
  const container = document.getElementById("canvas-area");
  const scrollContainer = document.getElementById("canvas-container");

  let zIndexCounter = 100;

  // Zoom and Pan state
  let canvasX = -window.innerWidth; // Initial pan logic to center
  let canvasY = -window.innerHeight;
  let canvasScale = 1;

  function updateCanvas() {
    container.style.transform = `translate(${canvasX}px, ${canvasY}px) scale(${canvasScale})`;
  }
  updateCanvas();

  // Function to randomize positions and rotations
  function scatterItems() {
    items.forEach(item => {
      const centerX = container.clientWidth / 2;
      const centerY = container.clientHeight / 2;

      const spreadX = window.innerWidth * 1.5;
      const spreadY = window.innerHeight * 1.5;

      const randomX = centerX + (Math.random() - 0.5) * spreadX - (item.offsetWidth / 2);
      const randomY = centerY + (Math.random() - 0.5) * spreadY - (item.offsetHeight / 2);

      const randomRot = (Math.random() - 0.5) * 40;

      zIndexCounter++;
      item.style.zIndex = zIndexCounter;

      item.style.left = `${randomX}px`;
      item.style.top = `${randomY}px`;
      item.style.transform = `rotate(${randomRot}deg)`;

      item.dataset.rot = randomRot;
    });
  }

  scatterItems();
  setTimeout(scatterItems, 200);

  // Pan Canvas logic
  let isPanningCanvas = false;
  let panStartX = 0;
  let panStartY = 0;

  scrollContainer.addEventListener('pointerdown', (e) => {
    // If we click on an item or toolbar, don't pan the canvas
    if (e.target.closest('.scrap-item') || e.target.closest('.toolbar')) return;

    if (e.button === 0 || e.button === 1 || e.pointerType === 'touch') {
      isPanningCanvas = true;
      panStartX = e.clientX - canvasX;
      panStartY = e.clientY - canvasY;
      scrollContainer.style.cursor = 'grabbing';
      scrollContainer.setPointerCapture(e.pointerId);
    }
  });

  scrollContainer.addEventListener('pointermove', (e) => {
    if (!isPanningCanvas) return;
    canvasX = e.clientX - panStartX;
    canvasY = e.clientY - panStartY;
    updateCanvas();
  });

  const endPanCanvas = (e) => {
    if (isPanningCanvas) {
      isPanningCanvas = false;
      scrollContainer.style.cursor = 'grab';
      scrollContainer.releasePointerCapture(e.pointerId);
    }
  };

  scrollContainer.addEventListener('pointerup', endPanCanvas);
  scrollContainer.addEventListener('pointercancel', endPanCanvas);

  // Zoom Canvas logic
  scrollContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = 0.01;
      const zoomDelta = e.deltaY * -zoomFactor;
      let newScale = canvasScale * Math.exp(zoomDelta);
      newScale = Math.min(Math.max(newScale, 0.5), 5); // limit scale (min 0.35, max 5)

      // Zoom towards pointer
      const pointerX = e.clientX;
      const pointerY = e.clientY;

      // Where is pointer in canvas space?
      const canvasPointerX = (pointerX - canvasX) / canvasScale;
      const canvasPointerY = (pointerY - canvasY) / canvasScale;

      canvasScale = newScale;

      // Adjust canvas translation to keep pointer fixed
      canvasX = pointerX - canvasPointerX * canvasScale;
      canvasY = pointerY - canvasPointerY * canvasScale;

      updateCanvas();
    } else {
      // Pan
      canvasX -= e.deltaX;
      canvasY -= e.deltaY;
      updateCanvas();
    }
  }, { passive: false });

  // Drag and Drop Logic for items
  let activeItem = null;
  let itemOffsetX = 0;
  let itemOffsetY = 0;
  let isDraggingItem = false;

  items.forEach(item => {
    item.addEventListener('pointerdown', (e) => {
      // Only drag if left click
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      isDraggingItem = true;
      activeItem = item;

      zIndexCounter++;
      activeItem.style.zIndex = zIndexCounter;
      activeItem.classList.add('is-dragging');

      // Calculate pointer pos in transformed canvas space
      const pointerX = e.clientX;
      const pointerY = e.clientY;

      const x = (pointerX - canvasX) / canvasScale;
      const y = (pointerY - canvasY) / canvasScale;

      const elemLeft = parseFloat(activeItem.style.left || 0);
      const elemTop = parseFloat(activeItem.style.top || 0);

      itemOffsetX = x - elemLeft;
      itemOffsetY = y - elemTop;

      const rot = activeItem.dataset.rot || 0;
      activeItem.style.transform = `rotate(${rot}deg) scale(1.05)`;

      activeItem.setPointerCapture(e.pointerId);
      e.stopPropagation(); // Prevent canvas panning
    });

    item.addEventListener('pointermove', (e) => {
      if (!isDraggingItem || activeItem !== item) return;

      const pointerX = e.clientX;
      const pointerY = e.clientY;
      const x = (pointerX - canvasX) / canvasScale;
      const y = (pointerY - canvasY) / canvasScale;

      activeItem.style.left = `${x - itemOffsetX}px`;
      activeItem.style.top = `${y - itemOffsetY}px`;
    });

    item.addEventListener('pointerup', (e) => {
      if (!isDraggingItem || activeItem !== item) return;
      endDragItem(item, e.pointerId);
    });

    item.addEventListener('pointercancel', (e) => {
      if (!isDraggingItem || activeItem !== item) return;
      endDragItem(item, e.pointerId);
    });
  });

  function endDragItem(item, pointerId) {
    isDraggingItem = false;
    item.classList.remove('is-dragging');
    const rot = item.dataset.rot || 0;
    item.style.transform = `rotate(${rot}deg) scale(1)`;
    item.releasePointerCapture(pointerId);
    activeItem = null;
  }

  // Toolbar Scatter Button
  const scatterBtn = document.getElementById("scatter-btn");
  scatterBtn.addEventListener("click", () => {
    scatterItems();
    // Re-center viewport
    canvasX = -window.innerWidth;
    canvasY = -window.innerHeight;
    canvasScale = 1;
    updateCanvas();
  });

  // Filters logic
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const filter = btn.dataset.filter;

      items.forEach(item => {
        if (filter === "all" || item.dataset.category === filter) {
          item.classList.remove("dimmed");
          if (filter !== "all") {
            zIndexCounter++;
            item.style.zIndex = zIndexCounter;
          }
        } else {
          item.classList.add("dimmed");
        }
      });
    });
  });

});