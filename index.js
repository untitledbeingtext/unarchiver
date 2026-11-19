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
    ],
    flowers: []
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

  const flowersList = flowerLibrary.flowers || [];
  const paletteList = flowerLibrary.palette || FALLBACK_DATA.palette;

  document.documentElement.style.overscrollBehavior = "none";
  document.body.style.overscrollBehavior = "none";

  function snapToGrid(value) {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }

  function getViewportSize() {
    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    return { width, height };
  }

  function getClampedScroll() {
    const { width, height } = getViewportSize();
    const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, width);
    const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, height);

    const maxScrollX = Math.max(0, docWidth - width);
    const maxScrollY = Math.max(0, docHeight - height);

    const rawScrollX = Math.max(0, Math.min(window.scrollX, maxScrollX));
    const rawScrollY = Math.max(0, Math.min(window.scrollY, maxScrollY));

    const scrollX = Math.min(snapToGrid(rawScrollX), maxScrollX);
    const scrollY = Math.min(snapToGrid(rawScrollY), maxScrollY);

    return { scrollX, scrollY };
  }

  // gridsnap
  let scrollSnapTimer = null;
  let isSnappingScroll = false;

  function snapWindowScrollToGrid() {
    const { width, height } = getViewportSize();
    const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, width);
    const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, height);

    const maxScrollX = Math.max(0, docWidth - width);
    const maxScrollY = Math.max(0, docHeight - height);

    const currentX = window.scrollX;
    const currentY = window.scrollY;

    const snappedX = Math.max(0, Math.min(snapToGrid(currentX), maxScrollX));
    const snappedY = Math.max(0, Math.min(snapToGrid(currentY), maxScrollY));

    if (Math.abs(currentX - snappedX) >= 1 || Math.abs(currentY - snappedY) >= 1) {
      isSnappingScroll = true;
      window.scrollTo({
        left: snappedX,
        top: snappedY,
        behavior: "smooth"
      });
      setTimeout(() => {
        isSnappingScroll = false;
      }, 150);
    }
  }

  window.addEventListener("scroll", () => {
    if (isSnappingScroll) return;
    clearTimeout(scrollSnapTimer);
    scrollSnapTimer = setTimeout(snapWindowScrollToGrid, 90);
  }, { passive: true });

  // gridsnap both items
  function makeDraggable(targetEl, handleEl, options = {}) {
    const {
      ignoreSelector = "button",
      onDragMove = null,
      onDragEnd = null
    } = options;

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
      initialLeft = snapToGrid(rect.left);
      initialTop = snapToGrid(rect.top);
      startX = clientX;
      startY = clientY;

      targetEl.style.position = "fixed";
      targetEl.style.margin = "0";
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

      const { width, height } = getViewportSize();
      const snappedLeft = snapToGrid(initialLeft + dx);
      const snappedTop = snapToGrid(initialTop + dy);

      const maxLeft = Math.max(0, Math.floor((width - targetEl.offsetWidth) / GRID_SIZE) * GRID_SIZE);
      const maxTop = Math.max(0, Math.floor((height - targetEl.offsetHeight) / GRID_SIZE) * GRID_SIZE);

      targetEl.style.left = `${Math.max(0, Math.min(snappedLeft, maxLeft))}px`;
      targetEl.style.top = `${Math.max(0, Math.min(snappedTop, maxTop))}px`;

      if (onDragMove) onDragMove();
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      if (onDragEnd) onDragEnd(hasMoved);
    }

    handleEl.addEventListener("mousedown", (e) => {
      if (ignoreSelector && e.target.closest(ignoreSelector) && handleEl !== targetEl) return;
      onStart(e.clientX, e.clientY);
    });

    window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
    window.addEventListener("mouseup", onEnd);

    handleEl.addEventListener("touchstart", (e) => {
      if (ignoreSelector && e.target.closest(ignoreSelector) && handleEl !== targetEl) return;
      if (e.touches.length > 0) onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (isDragging && e.touches.length > 0) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener("touchend", onEnd);

    return () => hasMoved;
  }

  // --- QUẢN LÝ TỜ NOTE (DRAG + GRID SNAP) ---
  const noteEl = document.querySelector(".note");
  let webTitleBounds = null;
  let hasUserDraggedNote = false;

  function updateNoteBounds() {
    if (!noteEl) return;
    const { scrollX, scrollY } = getClampedScroll();
    const rect = noteEl.getBoundingClientRect();
    webTitleBounds = {
      minCol: Math.floor((rect.left + scrollX) / GRID_SIZE),
      maxCol: Math.ceil((rect.right + scrollX) / GRID_SIZE) - 1,
      minRow: Math.floor((rect.top + scrollY) / GRID_SIZE),
      maxRow: Math.ceil((rect.bottom + scrollY) / GRID_SIZE) - 1
    };
  }

  function keepNoteInViewport() {
    if (!noteEl || !hasUserDraggedNote) return;
    const { width, height } = getViewportSize();
    const maxLeft = Math.max(0, Math.floor((width - noteEl.offsetWidth) / GRID_SIZE) * GRID_SIZE);
    const maxTop = Math.max(0, Math.floor((height - noteEl.offsetHeight) / GRID_SIZE) * GRID_SIZE);
    const curLeft = parseInt(noteEl.style.left, 10) || 0;
    const curTop = parseInt(noteEl.style.top, 10) || 0;
    noteEl.style.left = `${Math.max(0, Math.min(snapToGrid(curLeft), maxLeft))}px`;
    noteEl.style.top = `${Math.max(0, Math.min(snapToGrid(curTop), maxTop))}px`;
  }

  if (noteEl) {
    let noteWasDragged = false;

    makeDraggable(noteEl, noteEl, {
      ignoreSelector: "a, button",
      onDragMove: () => {
        hasUserDraggedNote = true;
        updateNoteBounds();
      },
      onDragEnd: (moved) => {
        noteWasDragged = moved;
        if (moved) {
          hasUserDraggedNote = true;
          updateNoteBounds();
        }
      }
    });

    // avoid click into the link when dragging the note
    noteEl.addEventListener("click", (e) => {
      if (noteWasDragged) {
        e.preventDefault();
        e.stopPropagation();
        noteWasDragged = false;
      }
    }, true);

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(() => updateNoteBounds());
      resizeObserver.observe(noteEl);
    }
  }

  function isCellInNoteZone(col, row) {
    if (!webTitleBounds) return false;
    return (
      col >= webTitleBounds.minCol &&
      col <= webTitleBounds.maxCol &&
      row >= webTitleBounds.minRow &&
      row <= webTitleBounds.maxRow
    );
  }

  // gridsnap console and note managing system
  const guideConsole = document.getElementById("guideConsole");
  const consoleToggleBtn = document.getElementById("consoleToggleBtn");
  const consoleCloseBtn = document.getElementById("consoleCloseBtn");
  const consoleAppBtn = document.getElementById("consoleAppBtn");
  const consoleHeader = guideConsole ? guideConsole.querySelector(".console-header") : null;

  let hasUserDraggedConsole = false;

  function centerConsoleBottom() {
    const { width, height } = getViewportSize();

    if (guideConsole && guideConsole.style.display !== "none" && !hasUserDraggedConsole) {
      guideConsole.style.maxWidth = `${Math.max(240, width - GRID_SIZE * 2)}px`;
      guideConsole.style.position = "fixed";
      guideConsole.style.right = "auto";
      guideConsole.style.bottom = "auto";

      const boxWidth = guideConsole.offsetWidth;
      const boxHeight = guideConsole.offsetHeight;

      const targetLeft = snapToGrid(Math.max(GRID_SIZE, (width - boxWidth) / 2));
      const targetTop = snapToGrid(Math.max(GRID_SIZE, height - boxHeight - GRID_SIZE * 2));

      guideConsole.style.left = `${targetLeft}px`;
      guideConsole.style.top = `${targetTop}px`;
    } else if (guideConsole && guideConsole.style.display !== "none" && hasUserDraggedConsole) {
      const maxLeft = Math.max(0, Math.floor((width - guideConsole.offsetWidth) / GRID_SIZE) * GRID_SIZE);
      const maxTop = Math.max(0, Math.floor((height - guideConsole.offsetHeight) / GRID_SIZE) * GRID_SIZE);
      const curLeft = parseInt(guideConsole.style.left, 10) || 0;
      const curTop = parseInt(guideConsole.style.top, 10) || 0;
      guideConsole.style.left = `${Math.max(0, Math.min(snapToGrid(curLeft), maxLeft))}px`;
      guideConsole.style.top = `${Math.max(0, Math.min(snapToGrid(curTop), maxTop))}px`;
    }

    if (consoleAppBtn && consoleAppBtn.style.display !== "none") {
      consoleAppBtn.style.position = "fixed";
      consoleAppBtn.style.right = "auto";
      consoleAppBtn.style.bottom = "auto";

      const btnWidth = consoleAppBtn.offsetWidth || 40;
      const btnHeight = consoleAppBtn.offsetHeight || 40;
      const targetLeft = snapToGrid(Math.max(GRID_SIZE, (width - btnWidth) / 2));
      const targetTop = snapToGrid(Math.max(GRID_SIZE, height - btnHeight - GRID_SIZE * 2));

      consoleAppBtn.style.left = `${targetLeft}px`;
      consoleAppBtn.style.top = `${targetTop}px`;
    }
  }

  if (guideConsole && consoleToggleBtn && consoleCloseBtn && consoleAppBtn && consoleHeader) {
    let consoleWasDragged = false;
    let appBtnWasDragged = false;

    makeDraggable(guideConsole, consoleHeader, {
      ignoreSelector: "button",
      onDragEnd: (moved) => {
        consoleWasDragged = moved;
        if (moved) hasUserDraggedConsole = true;
      }
    });

    makeDraggable(consoleAppBtn, consoleAppBtn, {
      ignoreSelector: null,
      onDragEnd: (moved) => {
        appBtnWasDragged = moved;
      }
    });

    const toggleMinimize = () => {
      const isMinimized = guideConsole.classList.toggle("minimized");
      consoleToggleBtn.textContent = isMinimized ? "+" : "-";
      consoleToggleBtn.title = isMinimized ? "Mở rộng" : "Thu lại";
      centerConsoleBottom();
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
      guideConsole.style.display = "none";
      consoleAppBtn.style.display = "flex";
      centerConsoleBottom();
    });

    consoleAppBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (appBtnWasDragged) {
        appBtnWasDragged = false;
        return;
      }
      consoleAppBtn.style.display = "none";
      guideConsole.style.display = "block";
      hasUserDraggedConsole = false;
      centerConsoleBottom();
    });

    centerConsoleBottom();
  }

  // --- CANVAS & LOGIC TRỒNG CÂY ---
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

  function pickNextFlowerIndex() {
    if (!flowersList || flowersList.length === 0) return -1;
    let idx = Math.floor(Math.random() * flowersList.length);
    if (flowersList.length > 1 && idx === lastFlowerIndex) {
      idx = (idx + 1) % flowersList.length;
    }
    lastFlowerIndex = idx;
    return idx;
  }

  let nextFlowerIndex = pickNextFlowerIndex();
  let hoverGridPos = null;
  let isHoveringUI = false;

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = getViewportSize();

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    keepNoteInViewport();
    updateNoteBounds();
    centerConsoleBottom();
  }

  window.addEventListener("resize", resizeCanvas);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resizeCanvas);
  }
  resizeCanvas();

  function getGridCoords(clientX, clientY) {
    const { scrollX, scrollY } = getClampedScroll();
    const pageX = clientX + scrollX;
    const pageY = clientY + scrollY;
    return {
      col: Math.floor(pageX / GRID_SIZE),
      row: Math.floor(pageY / GRID_SIZE)
    };
  }

  // Tính toán khung bao thật của cây + khung mở rộng 1 grid xung quanh
  function getFlowerBounds(baseCol, baseRow, flower) {
    const pattern = flower.pattern || [];
    const totalRows = pattern.length;
    const totalCols = (pattern[0] && pattern[0].length) || 1;
    const anchorCol = flower.anchorCol ?? Math.floor(totalCols / 2);

    let minPatternCol = totalCols;
    let maxPatternCol = -1;
    let minPatternRow = totalRows;
    let maxPatternRow = -1;

    for (let r = 0; r < totalRows; r++) {
      const rowStr = pattern[r] || "";
      for (let c = 0; c < rowStr.length; c++) {
        if (rowStr[c] !== ".") {
          if (c < minPatternCol) minPatternCol = c;
          if (c > maxPatternCol) maxPatternCol = c;
          if (r < minPatternRow) minPatternRow = r;
          if (r > maxPatternRow) maxPatternRow = r;
        }
      }
    }

    if (maxPatternCol < minPatternCol) {
      minPatternCol = 0;
      maxPatternCol = totalCols - 1;
      minPatternRow = 0;
      maxPatternRow = totalRows - 1;
    }

    const minCol = baseCol + (minPatternCol - anchorCol);
    const maxCol = baseCol + (maxPatternCol - anchorCol);
    const minRow = baseRow - (totalRows - 1 - minPatternRow);
    const maxRow = baseRow - (totalRows - 1 - maxPatternRow);

    return {
      //pixel plant
      minCol,
      maxCol,
      minRow,
      maxRow,
      offsetMaxCol: maxCol,
      offsetMinRow: minRow,
      offsetMaxRow: maxRow
    };
  }

  // Kiểm tra đè lên cây cũ hoặc đè lên tờ note
  function checkFlowerOverlap(bounds) {
    for (const existing of plantedFlowers) {
      const ex = existing.bounds;
      const isOverlapping =
        bounds.offsetMinCol <= ex.maxCol &&
        bounds.offsetMaxCol >= ex.minCol &&
        bounds.offsetMinRow <= ex.maxRow &&
        bounds.offsetMaxRow >= ex.minRow;

      if (isOverlapping) return true;
    }

    if (webTitleBounds) {
      const overlapsNote =
        bounds.minCol <= webTitleBounds.maxCol &&
        bounds.maxCol >= webTitleBounds.minCol &&
        bounds.minRow <= webTitleBounds.maxRow &&
        bounds.maxRow >= webTitleBounds.minRow;

      if (overlapsNote) return true;
    }

    return false;
  }

  function isUIElement(targetEl) {
    return (
      targetEl &&
      (targetEl.closest(".console-box") ||
        targetEl.closest(".console-app-btn") ||
        targetEl.closest(".note"))
    );
  }

  let lastHoverKey = "";
  function handleInteraction(clientX, clientY, targetEl) {
    isHoveringUI = Boolean(isUIElement(targetEl));
    const { col, row } = getGridCoords(clientX, clientY);
    hoverGridPos = { col, row };

    if (isHoveringUI || isCellInNoteZone(col, row)) return;

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
    handleInteraction(e.clientX, e.clientY, e.target);
  });

  window.addEventListener("mouseleave", () => {
    hoverGridPos = null;
  });

  window.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }
  }, { passive: true });

  function handlePlantFlower(clientX, clientY, targetEl) {
    if (!flowersList || flowersList.length === 0 || nextFlowerIndex < 0) return;
    if (isUIElement(targetEl)) return;

    const { col, row } = getGridCoords(clientX, clientY);
    if (isCellInNoteZone(col, row)) return;

    const selectedFlower = flowersList[nextFlowerIndex];
    const bounds = getFlowerBounds(col, row, selectedFlower);

    // Nếu đè lên cây cũ (hoặc đè vào tờ note) thì không cho trồng
    if (checkFlowerOverlap(bounds)) {
      return;
    }

    const selectedPalette = paletteList[paletteIndex % paletteList.length];
    paletteIndex++;

    plantedFlowers.push({
      baseCol: col,
      baseRow: row,
      anchorCol: selectedFlower.anchorCol,
      pattern: selectedFlower.pattern,
      bounds: bounds,
      stemColor: selectedPalette.stem,
      headColor: selectedPalette.head,
      currentRowOffset: 0,
      lastGrowTime: performance.now(),
      growSpeed: 50
    });

    nextFlowerIndex = pickNextFlowerIndex();
  }

  let lastTouchTime = 0;

  window.addEventListener("click", (e) => {
    if (Date.now() - lastTouchTime < 500) return;
    handlePlantFlower(e.clientX, e.clientY, e.target);
  });

  window.addEventListener("touchstart", (e) => {
    lastTouchTime = Date.now();
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY, e.target);
      handlePlantFlower(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }
  }, { passive: true });

  function render(now) {
    const { width: viewWidth, height: viewHeight } = getViewportSize();

    ctx.clearRect(0, 0, viewWidth, viewHeight);

    const { scrollX, scrollY } = getClampedScroll();
    document.body.style.backgroundPosition = `${-scrollX}px ${-scrollY}px`;

    // Vẽ vệt hover trên lưới
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

    // Vẽ các cây đã trồng
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

    // Vẽ khung căn cây (offset 1 grid bên ngoài) khi rê chuột
    if (
      hoverGridPos &&
      !isHoveringUI &&
      !isCellInNoteZone(hoverGridPos.col, hoverGridPos.row) &&
      flowersList.length > 0 &&
      nextFlowerIndex >= 0
    ) {
      const previewFlower = flowersList[nextFlowerIndex];
      const previewBounds = getFlowerBounds(hoverGridPos.col, hoverGridPos.row, previewFlower);
      const isBlocked = checkFlowerOverlap(previewBounds);

      if (!isBlocked) {
        document.body.style.cursor = "pointer";
        const selectedPalette = paletteList[paletteIndex % paletteList.length];
        const guideColor = selectedPalette.stem || "#556B2F";

        ctx.save();
        ctx.fillStyle = guideColor;

        const minC = previewBounds.offsetMinCol;
        const maxC = previewBounds.offsetMaxCol;
        const minR = previewBounds.offsetMinRow;
        const maxR = previewBounds.offsetMaxRow;

        // 4 góc bo chữ L ở viền offset 1 grid bên ngoài
        const cornerCoords = [
          { c: minC, r: minR }, { c: minC + 1, r: minR }, { c: minC, r: minR + 1 },
          { c: maxC, r: minR }, { c: maxC - 1, r: minR }, { c: maxC, r: minR + 1 },
          { c: minC, r: maxR }, { c: minC + 1, r: maxR }, { c: minC, r: maxR - 1 },
          { c: maxC, r: maxR }, { c: maxC - 1, r: maxR }, { c: maxC, r: maxR - 1 }
        ];

        for (const pt of cornerCoords) {
          const screenX = pt.c * GRID_SIZE - scrollX;
          const screenY = pt.r * GRID_SIZE - scrollY;

          if (
            screenX + GRID_SIZE >= 0 &&
            screenX <= viewWidth &&
            screenY + GRID_SIZE >= 0 &&
            screenY <= viewHeight
          ) {
            ctx.fillRect(screenX + 1, screenY + 1, GRID_SIZE - 1, GRID_SIZE - 1);
          }
        }

        // Điểm neo gốc cây tại vị trí con trỏ
        const anchorX = hoverGridPos.col * GRID_SIZE - scrollX;
        const anchorY = hoverGridPos.row * GRID_SIZE - scrollY;
        ctx.fillRect(anchorX + 1, anchorY + 1, GRID_SIZE - 1, GRID_SIZE - 1);

        ctx.restore();
      } else {
        document.body.style.cursor = "not-allowed";
      }
    } else {
      document.body.style.cursor = "default";
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();