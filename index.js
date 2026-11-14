(async function initPixelGarden() {
  const GRID_SIZE = 10;

  const FALLBACK_DATA = {
    palette: [
      { stem: "#9e9a51", head: "#9dcbed" },
      { stem: "#4e4f27", head: "#95aaad" },
      { stem: "#5b4722", head: "#b1b4d5" },
      { stem: "#b0b735", head: "#9dcbed" },
      { stem: "#556B2F", head: "#E07A5F" },
      { stem: "#9babaa", head: "#4f181d" },
      { stem: "#b0b735", head: "#e49cff" },
      { stem: "#556B2F", head: "#b0b735" },
      { stem: "#57552e", head: "#e3a3a4" },
      { stem: "#b0b735", head: "#f3c817" },
      { stem: "#6a332c", head: "#f58021" }
    ]
  };

  let flowerLibrary = FALLBACK_DATA;

  try {
    const response = await fetch("./flowers.json");
    if (response.ok) {
      flowerLibrary = await response.json();
    }
  } catch (err) {
    console.warn("Live server json load", err);
  }

  const flowersList = flowerLibrary.flowers;
  const paletteList = flowerLibrary.palette;

  const guideConsole = document.getElementById("guideConsole");
  const consoleToggleBtn = document.getElementById("consoleToggleBtn");
  const consoleCloseBtn = document.getElementById("consoleCloseBtn");
  const consoleAppBtn = document.getElementById("consoleAppBtn");
  const consoleHeader = guideConsole ? guideConsole.querySelector(".console-header") : null;

  function makeDraggable(targetEl, handleEl, onDragEndCallback) {
    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    function onStart(clientX, clientY) {
      isDragging = true;
      hasMoved = false;
      const rect = targetEl.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      startX = clientX;
      startY = clientY;

      targetEl.style.left = `${initialLeft}px`;
      targetEl.style.top = `${initialTop}px`;
      targetEl.style.right = "auto";
      targetEl.style.bottom = "auto";
    }

    function onMove(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
      }

      const maxLeft = window.innerWidth - targetEl.offsetWidth;
      const maxTop = window.innerHeight - targetEl.offsetHeight;

      const newLeft = Math.max(0, Math.min(initialLeft + dx, maxLeft));
      const newTop = Math.max(0, Math.min(initialTop + dy, maxTop));

      targetEl.style.left = `${newLeft}px`;
      targetEl.style.top = `${newTop}px`;
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      if (onDragEndCallback) {
        onDragEndCallback(hasMoved);
      }
    }

    handleEl.addEventListener("mousedown", (e) => {
      if (e.target.closest("button") && handleEl !== targetEl) return;
      onStart(e.clientX, e.clientY);
    });

    window.addEventListener("mousemove", (e) => {
      onMove(e.clientX, e.clientY);
    });

    window.addEventListener("mouseup", onEnd);

    handleEl.addEventListener("touchstart", (e) => {
      if (e.target.closest("button") && handleEl !== targetEl) return;
      if (e.touches.length > 0) {
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (isDragging && e.touches.length > 0) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener("touchend", onEnd);

    return () => hasMoved;
  }

  if (guideConsole && consoleToggleBtn && consoleCloseBtn && consoleAppBtn && consoleHeader) {
    let consoleWasDragged = false;
    let appBtnWasDragged = false;

    makeDraggable(guideConsole, consoleHeader, (moved) => {
      consoleWasDragged = moved;
    });

    makeDraggable(consoleAppBtn, consoleAppBtn, (moved) => {
      appBtnWasDragged = moved;
    });

    const toggleMinimize = () => {
      const isMinimized = guideConsole.classList.toggle("minimized");
      consoleToggleBtn.textContent = isMinimized ? "+" : "-";
      consoleToggleBtn.title = isMinimized ? "Mở rộng" : "Thu lại";
    };

    consoleToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMinimize();
    });

    consoleHeader.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      if (consoleWasDragged) {
        consoleWasDragged = false;
        return;
      }
      toggleMinimize();
    });

    consoleCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = guideConsole.getBoundingClientRect();
      guideConsole.style.display = "none";

      consoleAppBtn.style.display = "flex";
      const appLeft = Math.min(rect.left, window.innerWidth - consoleAppBtn.offsetWidth - 10);
      const appTop = Math.min(rect.top, window.innerHeight - consoleAppBtn.offsetHeight - 10);
      consoleAppBtn.style.left = `${Math.max(10, appLeft)}px`;
      consoleAppBtn.style.top = `${Math.max(10, appTop)}px`;
      consoleAppBtn.style.right = "auto";
      consoleAppBtn.style.bottom = "auto";
    });

    consoleAppBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (appBtnWasDragged) {
        appBtnWasDragged = false;
        return;
      }
      const rect = consoleAppBtn.getBoundingClientRect();
      consoleAppBtn.style.display = "none";
      guideConsole.style.display = "block";

      const maxLeft = window.innerWidth - guideConsole.offsetWidth - 10;
      const maxTop = window.innerHeight - guideConsole.offsetHeight - 10;
      guideConsole.style.left = `${Math.max(10, Math.min(rect.left, maxLeft))}px`;
      guideConsole.style.top = `${Math.max(10, Math.min(rect.top, maxTop))}px`;
      guideConsole.style.right = "auto";
      guideConsole.style.bottom = "auto";
    });
  }

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "0";
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d");

  const hoverCells = new Map();
  const plantedFlowers = [];
  let lastFlowerIndex = -1;
  let paletteIndex = 0;

  let webTitleBounds = null;
  const noteEl = document.querySelector(".note");

  function updateNoteBounds() {
    if (!noteEl) return;
    const rect = noteEl.getBoundingClientRect();
    webTitleBounds = {
      minCol: Math.floor((rect.left + window.scrollX) / GRID_SIZE) + 2,
      maxCol: Math.ceil((rect.right + window.scrollX) / GRID_SIZE) - 2,
      minRow: Math.floor((rect.top + window.scrollY) / GRID_SIZE) + 2,
      maxRow: Math.ceil((rect.bottom + window.scrollY) / GRID_SIZE) - 2
    };
  }

  if (noteEl && "ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(() => updateNoteBounds());
    resizeObserver.observe(noteEl);
  }

  function isCellInNoteZone(col, row) {
    if (window.innerWidth <= 600) return false;

    if (!webTitleBounds) return false;
    return (
      col >= webTitleBounds.minCol &&
      col <= webTitleBounds.maxCol &&
      row >= webTitleBounds.minRow &&
      row <= webTitleBounds.maxRow
    );
  }

  function getViewportSize() {
    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    return { width, height };
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = getViewportSize();

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateNoteBounds();
  }

  window.addEventListener("resize", resizeCanvas);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resizeCanvas);
  }
  resizeCanvas();

  function getGridCoords(clientX, clientY) {
    const pageX = clientX + window.scrollX;
    const pageY = clientY + window.scrollY;
    return {
      col: Math.floor(pageX / GRID_SIZE),
      row: Math.floor(pageY / GRID_SIZE)
    };
  }

  let lastHoverKey = "";
  function handleInteraction(clientX, clientY) {
    const { col, row } = getGridCoords(clientX, clientY);
    if (isCellInNoteZone(col, row)) return;

    const key = `${col},${row}`;
    if (key !== lastHoverKey) {
      lastHoverKey = key;
      const isEven = (col + row) % 2 === 0;
      hoverCells.set(key, {
        col,
        row,
        alpha: 0.5,
        color: isEven ? "#C7DC7C" : "#8B9E44"
      });
    }
  }

  window.addEventListener("mousemove", (e) => {
    handleInteraction(e.clientX, e.clientY);
  });

  window.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  function handlePlantFlower(clientX, clientY, targetEl) {
    if (!flowersList || flowersList.length === 0) return;

    if (
      targetEl &&
      (targetEl.closest(".console-box") ||
        targetEl.closest(".console-app-btn") ||
        targetEl.closest(".note"))
    ) {
      return;
    }

    const { col, row } = getGridCoords(clientX, clientY);
    if (isCellInNoteZone(col, row)) return;

    let nextIndex = Math.floor(Math.random() * flowersList.length);
    if (flowersList.length > 1 && nextIndex === lastFlowerIndex) {
      nextIndex = (nextIndex + 1) % flowersList.length;
    }
    lastFlowerIndex = nextIndex;

    const selectedFlower = flowersList[nextIndex];
    const selectedPalette = paletteList[paletteIndex % paletteList.length];
    paletteIndex++;

    plantedFlowers.push({
      baseCol: col,
      baseRow: row,
      anchorCol: selectedFlower.anchorCol,
      pattern: selectedFlower.pattern,
      stemColor: selectedPalette.stem,
      headColor: selectedPalette.head,
      currentRowOffset: 0,
      lastGrowTime: performance.now(),
      growSpeed: 50
    });
  }

  let lastTouchTime = 0;

  window.addEventListener("click", (e) => {
    if (Date.now() - lastTouchTime < 500) return;
    handlePlantFlower(e.clientX, e.clientY, e.target);
  });

  window.addEventListener("touchstart", (e) => {
    lastTouchTime = Date.now();
    if (e.touches.length > 0) {
      handlePlantFlower(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }
  }, { passive: true });

  function render(now) {
    const { width: viewWidth, height: viewHeight } = getViewportSize();

    ctx.clearRect(0, 0, viewWidth, viewHeight);

    const scrollX = Math.round(window.scrollX);
    const scrollY = Math.round(window.scrollY);

    for (const [key, cell] of hoverCells.entries()) {
      const screenX = cell.col * GRID_SIZE - scrollX;
      const screenY = cell.row * GRID_SIZE - scrollY;

      if (
        screenX + GRID_SIZE >= 0 &&
        screenX <= viewWidth &&
        screenY + GRID_SIZE >= 0 &&
        screenY <= viewHeight
      ) {
        ctx.save();
        ctx.globalAlpha = cell.alpha;
        ctx.fillStyle = cell.color;
        ctx.fillRect(screenX + 1, screenY + 1, GRID_SIZE - 1, GRID_SIZE - 1);
        ctx.restore();
      }

      cell.alpha -= 0.02;
      if (cell.alpha <= 0) {
        hoverCells.delete(key);
      }
    }

    for (const flower of plantedFlowers) {
      const pattern = flower.pattern;
      const totalRows = pattern.length;
      const centerOffset = flower.anchorCol;

      if (flower.currentRowOffset < totalRows - 1) {
        if (now - flower.lastGrowTime >= flower.growSpeed) {
          flower.currentRowOffset++;
          flower.lastGrowTime = now;
        }
      }

      for (let step = 0; step <= flower.currentRowOffset; step++) {
        const patternRowIndex = totalRows - 1 - step;
        const rowStr = pattern[patternRowIndex];
        const targetGridRow = flower.baseRow - step;

        for (let c = 0; c < rowStr.length; c++) {
          const pixelType = rowStr[c];
          if (pixelType === ".") continue;

          const targetGridCol = flower.baseCol + (c - centerOffset);

          if (isCellInNoteZone(targetGridCol, targetGridRow)) {
            continue;
          }

          const screenX = targetGridCol * GRID_SIZE - scrollX;
          const screenY = targetGridRow * GRID_SIZE - scrollY;

          if (
            screenX + GRID_SIZE < 0 ||
            screenX > viewWidth ||
            screenY + GRID_SIZE < 0 ||
            screenY > viewHeight
          ) {
            continue;
          }

          ctx.fillStyle = pixelType === "S" ? flower.stemColor : flower.headColor;
          ctx.fillRect(screenX + 1, screenY + 1, GRID_SIZE - 1, GRID_SIZE - 1);
        }
      }
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();