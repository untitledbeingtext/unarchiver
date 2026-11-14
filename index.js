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

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "0";
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d");

  const hoverCells = new Map();
  const plantedFlowers = [];
  let lastFlowerIndex = -1;
  let paletteIndex = 0;

  const webTitleElement = document.querySelector(".webtitle");
  let webTitleBounds = null;

  function updateNoteBounds() {
    const noteEl = document.querySelector(".note");
    if (!noteEl) return;
    const rect = noteEl.getBoundingClientRect();
    webTitleBounds = {
      minCol: Math.floor((rect.left + window.scrollX) / GRID_SIZE) + 2,
      maxCol: Math.ceil((rect.right + window.scrollX) / GRID_SIZE) - 2,
      minRow: Math.floor((rect.top + window.scrollY) / GRID_SIZE) + 2,
      maxRow: Math.ceil((rect.bottom + window.scrollY) / GRID_SIZE) - 2
    };
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

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    updateNoteBounds();
  }
  window.addEventListener("resize", resizeCanvas);
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

  // iphone
  window.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  function handlePlantFlower(clientX, clientY) {
    if (!flowersList || flowersList.length === 0) return;

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
    handlePlantFlower(e.clientX, e.clientY);
  });

  window.addEventListener("touchstart", (e) => {
    lastTouchTime = Date.now();
    if (e.touches.length > 0) {
      handlePlantFlower(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  function render(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    for (const [key, cell] of hoverCells.entries()) {
      const screenX = cell.col * GRID_SIZE - scrollX;
      const screenY = cell.row * GRID_SIZE - scrollY;

      if (
        screenX + GRID_SIZE >= 0 &&
        screenX <= canvas.width &&
        screenY + GRID_SIZE >= 0 &&
        screenY <= canvas.height
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
            screenX > canvas.width ||
            screenY + GRID_SIZE < 0 ||
            screenY > canvas.height
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