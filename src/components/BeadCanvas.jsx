import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { getCellPixelPos } from '../utils/fileUtils.js';

const BASE_CELL = 22; // base bead size in pixels
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 8;

// ─────────────────────────────────────────────
// Hit-test: convert canvas pixel → grid cell
// ─────────────────────────────────────────────
function pixelToCell(px, py, gridType, cs, gridW, gridH) {
  const findNearest = (candidates) => {
    let best = null;
    let bestD = Infinity;
    for (const { col, row } of candidates) {
      if (col < 0 || col >= gridW || row < 0 || row >= gridH) continue;
      const pos = getCellPixelPos(col, row, gridType, cs);
      const cx = pos.x + cs / 2;
      const cy = pos.y + cs / 2;
      const d = (px - cx) ** 2 + (py - cy) ** 2;
      if (d < bestD) { bestD = d; best = { col, row }; }
    }
    return best;
  };

  if (gridType === 'brick') {
    const ar = Math.round(py / cs);
    const candidates = [];
    for (let dr = -1; dr <= 1; dr++) {
      const row = ar + dr;
      const offset = row % 2 === 1 ? cs / 2 : 0;
      const ac = Math.floor((px - offset) / cs);
      for (let dc = -1; dc <= 1; dc++) candidates.push({ col: ac + dc, row });
    }
    return findNearest(candidates);
  }

  if (gridType === 'peyote') {
    const ac = Math.round(px / cs);
    const candidates = [];
    for (let dc = -1; dc <= 1; dc++) {
      const col = ac + dc;
      const offset = col % 2 === 1 ? cs / 2 : 0;
      const ar = Math.floor((py - offset) / cs);
      for (let dr = -1; dr <= 1; dr++) candidates.push({ col, row: ar + dr });
    }
    return findNearest(candidates);
  }

  // square
  const col = Math.floor(px / cs);
  const row = Math.floor(py / cs);
  if (col >= 0 && col < gridW && row >= 0 && row < gridH) return { col, row };
  return null;
}

// ─────────────────────────────────────────────
// Drawing helpers
// ─────────────────────────────────────────────
function drawBead(ctx, cx, cy, radius, color, showGrid, isHover, zoom, emptyColor) {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);

  if (color) {
    ctx.fillStyle = color;
    ctx.fill();
    // Radial highlight for 3-D bead effect
    const grad = ctx.createRadialGradient(
      cx - radius * 0.25, cy - radius * 0.3, radius * 0.05,
      cx, cy, radius
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.28)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.04)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = grad;
    ctx.fill();
  } else {
    ctx.fillStyle = emptyColor;
    ctx.fill();
  }

  if (showGrid || isHover) {
    ctx.strokeStyle = isHover ? 'rgba(128,128,200,0.9)' : 'rgba(128,128,180,0.35)';
    ctx.lineWidth = isHover ? Math.max(1.5, 1.5 / zoom) : Math.max(0.4, 0.6 / zoom);
    ctx.stroke();
  }

  if (isHover) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(3, 3 / zoom);
    ctx.stroke();
  }
}

function renderGrid(ctx, cells, gridType, width, height, cs, zoom, showGrid, hoverCell, emptyColor) {
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const { x, y } = getCellPixelPos(col, row, gridType, cs);
      const cx = x + cs / 2;
      const cy = y + cs / 2;
      const radius = cs / 2 - Math.max(0.5, 0.8 / zoom);
      const color = cells[`${col},${row}`] ?? null;
      const isHover = hoverCell?.col === col && hoverCell?.row === row;
      drawBead(ctx, cx, cy, radius, color, showGrid, isHover, zoom, emptyColor);
    }
  }
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
const BeadCanvas = forwardRef(function BeadCanvas({
  cells, gridType, width, height,
  selectedColor, tool, showGrid,
  onCellPaint, onColorPick, onStrokeStart,
  isDark, t,
}, ref) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef({});  // mutable render state to avoid closure stale refs

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [hoverCell, setHoverCell] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const panStart = useRef(null);

  // Expose zoom controls to parent via ref
  useImperativeHandle(ref, () => ({
    zoomIn:    () => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25)),
    zoomOut:   () => setZoom((z) => Math.max(MIN_ZOOM, z / 1.25)),
    resetZoom: () => { setZoom(1); setPan({ x: 40, y: 40 }); },
  }), []);

  // Keep stateRef in sync so event handlers always see fresh values
  stateRef.current = { zoom, pan, hoverCell, isDrawing, isPanning, spaceDown, cells, gridType, width, height, selectedColor, tool, showGrid, isDark, onStrokeStart };

  // ── Resize observer ──────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      scheduleRender();
    });
    ro.observe(container);
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    return () => ro.disconnect();
  }, []);

  // ── Render ───────────────────────────────────────
  const scheduleRender = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const { zoom, pan, hoverCell, cells, gridType, width, height, showGrid, isDark } = stateRef.current;
      const emptyColor = isDark ? '#16162a' : '#e8eaf2';
      const cs = BASE_CELL * zoom;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(pan.x, pan.y);
      renderGrid(ctx, cells, gridType, width, height, cs, zoom, showGrid, hoverCell, emptyColor);
      ctx.restore();
    });
  }, []);

  // Re-render when props change
  useEffect(() => { scheduleRender(); },
    [cells, gridType, width, height, showGrid, zoom, pan, hoverCell, isDark, scheduleRender]);

  // ── Keyboard: spacebar for pan mode ──────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') setSpaceDown(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  // ── Convert mouse to canvas-space coords ─────────
  const toCanvas = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { pan, zoom } = stateRef.current;
    const mx = (e.clientX - rect.left - pan.x) / (BASE_CELL * zoom);
    const my = (e.clientY - rect.top - pan.y) / (BASE_CELL * zoom);
    return { mx: mx * BASE_CELL, my: my * BASE_CELL };
  }, []);

  const getCell = useCallback((e) => {
    const { mx, my } = toCanvas(e);
    const { zoom, gridType, width, height } = stateRef.current;
    return pixelToCell(mx, my, gridType, BASE_CELL, width, height);
  }, [toCanvas]);

  // ── Paint a cell ──────────────────────────────────
  const paintCell = useCallback((e) => {
    const cell = getCell(e);
    if (!cell) return;
    const { tool, selectedColor } = stateRef.current;

    if (tool === 'pencil') {
      onCellPaint({ type: 'SET_CELL', col: cell.col, row: cell.row, color: selectedColor });
    } else if (tool === 'eraser') {
      onCellPaint({ type: 'ERASE_CELL', col: cell.col, row: cell.row });
    } else if (tool === 'fill') {
      onCellPaint({ type: 'FLOOD_FILL', col: cell.col, row: cell.row, fillColor: selectedColor });
    } else if (tool === 'eyedropper') {
      const color = stateRef.current.cells[`${cell.col},${cell.row}`] ?? null;
      if (color) onColorPick(color);
    }
  }, [getCell, onCellPaint, onColorPick]);

  // ── Mouse events ──────────────────────────────────
  const onMouseDown = useCallback((e) => {
    const { spaceDown, tool, onStrokeStart } = stateRef.current;
    if (e.button === 1 || spaceDown) {
      // Middle click or spacebar → pan
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX - stateRef.current.pan.x, y: e.clientY - stateRef.current.pan.y };
      return;
    }
    if (e.button === 0) {
      setIsDrawing(true);
      // Snapshot history at stroke start (pencil/eraser can span many cells via drag)
      if (tool === 'pencil' || tool === 'eraser') {
        onStrokeStart?.();
      }
      paintCell(e);
    }
  }, [paintCell]);

  const onMouseMove = useCallback((e) => {
    const { isPanning, isDrawing, tool } = stateRef.current;

    if (isPanning && panStart.current) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
      return;
    }

    // Update hover
    const cell = getCell(e);
    setHoverCell(cell);

    if (isDrawing && (tool === 'pencil' || tool === 'eraser')) {
      paintCell(e);
    }
  }, [getCell, paintCell]);

  const onMouseUp = useCallback((e) => {
    setIsDrawing(false);
    setIsPanning(false);
    panStart.current = null;
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoverCell(null);
    setIsDrawing(false);
    setIsPanning(false);
  }, []);

  // ── Wheel zoom ────────────────────────────────────
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setZoom((prev) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * factor));
      // Zoom toward mouse position
      setPan((p) => ({
        x: mouseX - (mouseX - p.x) * (next / prev),
        y: mouseY - (mouseY - p.y) * (next / prev),
      }));
      return next;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  // ── Cursor style ──────────────────────────────────
  const getCursor = () => {
    if (isPanning || spaceDown) return 'grabbing';
    switch (tool) {
      case 'pencil': return 'crosshair';
      case 'eraser': return 'cell';
      case 'fill': return 'copy';
      case 'eyedropper': return 'zoom-in';
      default: return 'default';
    }
  };

  // ── Hover tooltip data ─────────────────────────────
  const tooltipInfo = hoverCell
    ? {
        coord: `${hoverCell.col + 1}, ${hoverCell.row + 1}`,
        color: cells[`${hoverCell.col},${hoverCell.row}`] ?? null,
      }
    : null;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-studio-bg overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        style={{ cursor: getCursor(), display: 'block' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Status bar */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 text-xs text-studio-muted bg-studio-panel/90 backdrop-blur border border-studio-border rounded-full px-4 py-1.5 pointer-events-none">
        <span>{t.statusZoom}: {Math.round(zoom * 100)}%</span>
        <span className="text-studio-border">|</span>
        <span>{t.statusGrid}: {width}×{height}</span>
        {tooltipInfo && (
          <>
            <span className="text-studio-border">|</span>
            <span>{t.coord}: ({tooltipInfo.coord})</span>
            {tooltipInfo.color && (
              <>
                <span className="text-studio-border">|</span>
                <span
                  className="w-3 h-3 rounded-full border border-studio-border inline-block"
                  style={{ backgroundColor: tooltipInfo.color }}
                />
                <span>{tooltipInfo.color}</span>
              </>
            )}
            {!tooltipInfo.color && <span className="text-studio-muted">— {t.empty}</span>}
          </>
        )}
      </div>

      {/* Mini zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25))}
          className="w-7 h-7 rounded bg-studio-panel border border-studio-border text-studio-text hover:bg-studio-border flex items-center justify-center text-base font-bold"
          title="Zoom in"
        >+</button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 40, y: 40 }); }}
          className="w-7 h-7 rounded bg-studio-panel border border-studio-border text-studio-muted hover:bg-studio-border flex items-center justify-center text-xs"
          title="Reset zoom"
        >1:1</button>
        <button
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.25))}
          className="w-7 h-7 rounded bg-studio-panel border border-studio-border text-studio-text hover:bg-studio-border flex items-center justify-center text-base font-bold"
          title="Zoom out"
        >−</button>
      </div>
    </div>
  );
});

export default BeadCanvas;
