const BEADGRID_VERSION = '1.0';

/** Returns true when running inside the Electron renderer process. */
function isElectron() {
  return typeof window !== 'undefined' && window.electronAPI != null;
}

/** Returns true when the browser File System Access API is available (non-Electron). */
function isFSA() {
  return !isElectron() &&
    typeof window !== 'undefined' &&
    'showSaveFilePicker' in window &&
    'showOpenFilePicker' in window;
}

// ─────────────────────────────────────────────
// Serialization
// ─────────────────────────────────────────────

/**
 * Serialize project state to a .beadgrid JSON string.
 *
 * Data structure:
 *   version     — format version string
 *   projectName — user-facing name
 *   gridType    — "square" | "brick" | "peyote"
 *   dimensions  — { width, height }
 *   palette     — Array<{ id, name, hex }>
 *   cells       — { "col,row": "#RRGGBB", … }
 */
export function serializeProject(state) {
  return JSON.stringify(
    {
      version:     BEADGRID_VERSION,
      projectName: state.projectName,
      gridType:    state.gridType,
      dimensions:  { width: state.width, height: state.height },
      palette:     state.colors,
      cells:       state.cells,
    },
    null,
    2
  );
}

/**
 * Parse the contents of a .beadgrid file.
 * Also handles the legacy .bead format (flat width/height/colors fields).
 *
 * @param {string} jsonString
 * @returns {object}  Normalized project data with width, height, colors, cells.
 * @throws  If the file is missing required fields.
 */
export function parseBeadgrid(jsonString) {
  const data = JSON.parse(jsonString);
  if (!data.version || !data.cells) {
    throw new Error('Invalid .beadgrid file: missing version or cells.');
  }

  // Normalize legacy flat format → new nested format
  return {
    ...data,
    width:  data.dimensions?.width  ?? data.width,
    height: data.dimensions?.height ?? data.height,
    colors: data.palette            ?? data.colors ?? [],
  };
}

// ─────────────────────────────────────────────
// Save — Electron IPC → FSA → download fallback
// ─────────────────────────────────────────────

/**
 * Save the project.
 *
 * - In Electron: uses native dialog.showSaveDialog via IPC.
 *   `existingRef` is the previously returned file path string.
 * - In a browser with FSA support: uses showSaveFilePicker.
 *   `existingRef` is a FileSystemFileHandle.
 * - Fallback: triggers a browser download.
 *
 * @param {object}                       state
 * @param {string|FileSystemFileHandle|null} existingRef  Previously stored handle/path.
 * @returns {string|FileSystemFileHandle|null}  Ref to write to next time, or null on cancel.
 */
export async function saveBeadNative(state, existingRef = null) {
  const json         = serializeProject(state);
  const suggestedName = `${(state.projectName || 'gridbead_design').replace(/\s+/g, '_')}.beadgrid`;

  // ── Electron ────────────────────────────────────────────────
  if (isElectron()) {
    let filePath = typeof existingRef === 'string' ? existingRef : null;
    if (!filePath) {
      filePath = await window.electronAPI.showSaveDialog(suggestedName);
      if (!filePath) return null; // user cancelled
    }
    await window.electronAPI.writeFile(filePath, json);
    return filePath;
  }

  // ── File System Access API (browser) ────────────────────────
  if (isFSA()) {
    try {
      let handle = existingRef instanceof FileSystemFileHandle ? existingRef : null;
      if (!handle) {
        handle = await window.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'GridBead Pattern',
              accept: { 'application/json': ['.beadgrid'] },
            },
          ],
        });
      }
      const writable = await handle.createWritable();
      await writable.write(new Blob([json], { type: 'application/json' }));
      await writable.close();
      return handle;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      // Fall through to download
    }
  }

  // ── Download fallback ────────────────────────────────────────
  _downloadBlob(new Blob([json], { type: 'application/json' }), suggestedName);
  return null;
}

/**
 * Always shows a Save-As picker (ignores any existing handle/path).
 */
export async function saveBeadAs(state) {
  return saveBeadNative(state, null);
}

// ─────────────────────────────────────────────
// Open — Electron IPC → FSA → <input> fallback
// ─────────────────────────────────────────────

/**
 * Open a .beadgrid file.
 *
 * @returns {{ data, fileHandle, fileName } | null}
 *   `fileHandle` is a file-path string in Electron or a FileSystemFileHandle in browsers.
 *   Returns null if the user cancelled.
 */
export async function openBeadNative() {
  // ── Electron ────────────────────────────────────────────────
  if (isElectron()) {
    const filePath = await window.electronAPI.showOpenDialog();
    if (!filePath) return null;
    const text     = await window.electronAPI.readFile(filePath);
    const data     = parseBeadgrid(text);
    const fileName = filePath.replace(/\\/g, '/').split('/').pop();
    return { data, fileHandle: filePath, fileName };
  }

  // ── File System Access API (browser) ────────────────────────
  if (isFSA()) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'GridBead Pattern',
            accept: { 'application/json': ['.beadgrid'] },
          },
        ],
        multiple: false,
      });
      const file     = await handle.getFile();
      const text     = await file.text();
      const data     = parseBeadgrid(text);
      return { data, fileHandle: handle, fileName: file.name };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  }

  // ── Fallback: hidden <input type="file"> ─────────────────────
  return new Promise((resolve, reject) => {
    const input  = document.createElement('input');
    input.type   = 'file';
    input.accept = '.beadgrid,application/json';

    const onFocus = () => {
      setTimeout(() => { if (!input.files?.length) resolve(null); }, 300);
    };
    window.addEventListener('focus', onFocus, { once: true });

    input.onchange = (e) => {
      window.removeEventListener('focus', onFocus);
      const file = e.target.files[0];
      if (!file) { resolve(null); return; }
      const reader    = new FileReader();
      reader.onload   = (ev) => {
        try {
          const data = parseBeadgrid(ev.target.result);
          resolve({ data, fileHandle: null, fileName: file.name });
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    };

    input.click();
  });
}

/**
 * Open a .beadgrid file directly from a known absolute path (Electron only).
 * Used when the app is launched via OS file association.
 *
 * @param {string} filePath
 * @returns {{ data, fileHandle, fileName }}
 */
export async function openBeadgridFromPath(filePath) {
  const text     = await window.electronAPI.readFile(filePath);
  const data     = parseBeadgrid(text);
  const fileName = filePath.replace(/\\/g, '/').split('/').pop();
  return { data, fileHandle: filePath, fileName };
}

// ─────────────────────────────────────────────
// PNG export
// ─────────────────────────────────────────────

/** Build an off-screen canvas with padding, row/col labels, grid, and color legend. */
function _buildExportCanvas(state, bg, scale) {
  const { cells, gridType, width, height, colors = [] } = state;
  const cs = scale;

  const dark = bg === 'black';
  const bgColor = bg === 'white' ? '#ffffff' : dark ? '#111114' : '#f7f8fa';

  // ── Metrics ──────────────────────────────────────────────────
  const PAD       = Math.max(18, cs * 0.75);
  const FONT      = Math.max(9, Math.min(15, cs * 0.52));
  const LABEL_GAP = Math.max(3, cs * 0.18);
  const LINE_H    = FONT * 1.5;

  const labelStep = Math.max(1, Math.ceil((FONT * 1.6) / cs));

  const rowDigits  = String(height).length;
  const ROW_LBL_W  = FONT * rowDigits * 0.65 + LABEL_GAP;
  const COL_LBL_H  = LINE_H + LABEL_GAP;

  const extraW = gridType === 'brick'  ? cs / 2 : 0;
  const extraH = gridType === 'peyote' ? cs / 2 : 0;
  const GRID_W = width  * cs + extraW;
  const GRID_H = height * cs + extraH;

  // ── Color legend ──────────────────────────────────────────────
  const hexCounts = {};
  for (const hex of Object.values(cells)) {
    hexCounts[hex] = (hexCounts[hex] || 0) + 1;
  }
  const usedColors = colors
    .filter((c) => hexCounts[c.hex] > 0)
    .sort((a, b) => (hexCounts[b.hex] || 0) - (hexCounts[a.hex] || 0));

  const ITEM_H     = Math.max(18, FONT * 1.7);
  const SWATCH_R   = ITEM_H * 0.34;
  const SWATCH_GAP = SWATCH_R * 2 + LABEL_GAP;

  const legendAreaW = GRID_W;
  const approxColW  = FONT * 0.62 * 26 + SWATCH_GAP + PAD * 0.5;
  const legendCols  = Math.max(1, Math.min(3, Math.floor(legendAreaW / approxColW)));
  const legendRows  = Math.ceil(usedColors.length / legendCols);
  const LEGEND_H    = usedColors.length > 0
    ? PAD * 0.8 + LINE_H + PAD * 0.4 + legendRows * ITEM_H + PAD
    : 0;

  const TOTAL_W = Math.ceil(PAD + ROW_LBL_W + GRID_W + PAD);
  const TOTAL_H = Math.ceil(PAD + COL_LBL_H + GRID_H + LEGEND_H + PAD);

  const canvas  = document.createElement('canvas');
  canvas.width  = TOTAL_W;
  canvas.height = TOTAL_H;
  const ctx     = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, TOTAL_W, TOTAL_H);

  const OX = PAD + ROW_LBL_W;
  const OY = PAD + COL_LBL_H;

  const labelColor = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const gridStroke = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.13)';
  const emptyFill  = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const beadStroke = dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.26)';
  const gridLineW  = Math.max(0.5, cs * 0.025);
  const textColor  = dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.78)';
  const mutedColor = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)';

  ctx.font         = `${FONT}px monospace`;
  ctx.fillStyle    = labelColor;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  for (let col = 0; col < width; col++) {
    if (col !== 0 && (col + 1) % labelStep !== 0) continue;
    const { x } = getCellPixelPos(col, 0, gridType, cs);
    ctx.fillText(String(col + 1), OX + x + cs / 2, OY - LABEL_GAP);
  }

  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  for (let row = 0; row < height; row++) {
    if (row !== 0 && (row + 1) % labelStep !== 0) continue;
    const { y } = getCellPixelPos(0, row, gridType, cs);
    ctx.fillText(String(row + 1), OX - LABEL_GAP, OY + y + cs / 2);
  }

  ctx.save();
  ctx.translate(OX, OY);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const color  = cells[`${col},${row}`] ?? null;
      const { x, y } = getCellPixelPos(col, row, gridType, cs);
      const radius = cs / 2 - 1;
      const cx     = x + cs / 2;
      const cy     = y + cs / 2;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);

      if (color) {
        ctx.fillStyle = color;
        ctx.fill();
        const grad = ctx.createRadialGradient(
          cx - radius * 0.2, cy - radius * 0.25, radius * 0.05, cx, cy, radius
        );
        grad.addColorStop(0, 'rgba(255,255,255,0.25)');
        grad.addColorStop(1, 'rgba(0,0,0,0.15)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = beadStroke;
        ctx.lineWidth   = gridLineW;
        ctx.stroke();
      } else {
        ctx.fillStyle   = emptyFill;
        ctx.fill();
        ctx.strokeStyle = gridStroke;
        ctx.lineWidth   = gridLineW;
        ctx.stroke();
      }
    }
  }

  ctx.restore();

  if (usedColors.length > 0) {
    let ly = OY + GRID_H + PAD * 0.8;

    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
    ctx.lineWidth   = 0.75;
    ctx.beginPath();
    ctx.moveTo(OX, ly - PAD * 0.4);
    ctx.lineTo(OX + GRID_W, ly - PAD * 0.4);
    ctx.stroke();

    ctx.font         = `bold ${Math.round(FONT * 1.05)}px sans-serif`;
    ctx.fillStyle    = textColor;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Color Legend', OX, ly);
    ly += LINE_H + PAD * 0.35;

    const colW = GRID_W / legendCols;
    ctx.font   = `${FONT}px sans-serif`;

    usedColors.forEach((c, i) => {
      const col  = i % legendCols;
      const row  = Math.floor(i / legendCols);
      const ix   = OX + col * colW;
      const iy   = ly + row * ITEM_H;
      const midY = iy + ITEM_H / 2;

      ctx.beginPath();
      ctx.arc(ix + SWATCH_R, midY, SWATCH_R, 0, Math.PI * 2);
      ctx.fillStyle   = c.hex;
      ctx.fill();
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.20)';
      ctx.lineWidth   = 0.6;
      ctx.stroke();

      ctx.fillStyle    = textColor;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.name || c.hex, ix + SWATCH_GAP, midY);

      const nameW = ctx.measureText(c.name || c.hex).width;
      ctx.fillStyle = mutedColor;
      ctx.fillText(c.hex, ix + SWATCH_GAP + nameW + FONT * 0.8, midY);

      ctx.textAlign = 'right';
      ctx.fillStyle = textColor;
      ctx.fillText(`×${hexCounts[c.hex]}`, ix + colW - LABEL_GAP, midY);
    });
  }

  return canvas;
}

/**
 * Export the grid as PNG.
 * Uses Electron's native Save dialog when available,
 * then falls back to the FSA API, then to a browser download.
 */
export async function exportPngNative(state, bg = 'transparent', scale = 40) {
  const canvas        = _buildExportCanvas(state, bg, scale);
  const suggestedName = `${(state.projectName || 'gridbead_design').replace(/\s+/g, '_')}.png`;

  // ── File System Access API ────────────────────────────────────
  if (isFSA()) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }],
      });
      await new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          try {
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            resolve();
          } catch (err) { reject(err); }
        }, 'image/png');
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  canvas.toBlob((blob) => _downloadBlob(blob, suggestedName), 'image/png');
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function _downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getCellPixelPos(col, row, gridType, cs) {
  switch (gridType) {
    case 'brick':
      return { x: col * cs + (row % 2 === 1 ? cs / 2 : 0), y: row * cs };
    case 'peyote':
      return { x: col * cs, y: row * cs + (col % 2 === 1 ? cs / 2 : 0) };
    default:
      return { x: col * cs, y: row * cs };
  }
}

// ─────────────────────────────────────────────
// Recent files (localStorage)
// ─────────────────────────────────────────────

const RECENT_KEY = 'gridbead_recent_files';

export function loadRecentFiles() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export function pushRecentFile(name, filePath = null) {
  const files = loadRecentFiles().filter((f) => f.name !== name);
  files.unshift({ name, filePath, savedAt: new Date().toISOString() });
  localStorage.setItem(RECENT_KEY, JSON.stringify(files.slice(0, 5)));
}
