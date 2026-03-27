const BEAD_FORMAT_VERSION = '1.0';

const FSA_SUPPORTED =
  typeof window !== 'undefined' &&
  'showSaveFilePicker' in window &&
  'showOpenFilePicker' in window;

// ─────────────────────────────────────────────
// Serialization
// ─────────────────────────────────────────────

/** Serialize project state to a .bead JSON string */
export function serializeProject(state) {
  return JSON.stringify(
    {
      version: BEAD_FORMAT_VERSION,
      projectName: state.projectName,
      gridType: state.gridType,
      width: state.width,
      height: state.height,
      colors: state.colors,
      cells: state.cells,
    },
    null,
    2
  );
}

/** Parse a .bead file content string, return project data or throw */
export function parseBead(jsonString) {
  const data = JSON.parse(jsonString);
  if (!data.version || !data.cells) throw new Error('Invalid .bead file');
  return data;
}

// ─────────────────────────────────────────────
// Save — native (File System Access API) with download fallback
// ─────────────────────────────────────────────

/**
 * Save project using the File System Access API when available.
 * If `existingHandle` is provided, writes directly to it (no picker).
 * Falls back to a browser download trigger when FSA is unsupported.
 *
 * @param {Object} state
 * @param {FileSystemFileHandle|null} existingHandle
 * @returns {FileSystemFileHandle|null} The handle written to, or null on cancel/fallback.
 */
export async function saveBeadNative(state, existingHandle = null) {
  const json = serializeProject(state);
  const blob = new Blob([json], { type: 'application/json' });
  const suggestedName = `${(state.projectName || 'gridbead_design').replace(/\s+/g, '_')}.bead`;

  if (FSA_SUPPORTED) {
    try {
      let handle = existingHandle;
      if (!handle) {
        handle = await window.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'GridBead Pattern',
              accept: { 'application/json': ['.bead'] },
            },
          ],
        });
      }
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return handle;
    } catch (err) {
      if (err.name === 'AbortError') return null; // user cancelled
      // Fall through to download
    }
  }

  _downloadBlob(blob, suggestedName);
  return null;
}

/**
 * Always shows the save-as picker (ignores any existing handle).
 */
export async function saveBeadAs(state) {
  return saveBeadNative(state, null);
}

// ─────────────────────────────────────────────
// Open — native (File System Access API) with input fallback
// ─────────────────────────────────────────────

/**
 * Open a .bead file, preferring the File System Access API.
 * @returns {{ data, fileHandle, fileName } | null} null if user cancelled.
 */
export async function openBeadNative() {
  if (FSA_SUPPORTED) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'GridBead Pattern',
            accept: { 'application/json': ['.bead'] },
          },
        ],
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      const data = parseBead(text);
      return { data, fileHandle: handle, fileName: file.name };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  }

  // Fallback: hidden <input type="file">
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bead,application/json';

    // Detect cancel via window focus after picker closes
    const onFocus = () => {
      setTimeout(() => {
        if (!input.files?.length) resolve(null);
      }, 300);
    };
    window.addEventListener('focus', onFocus, { once: true });

    input.onchange = (e) => {
      window.removeEventListener('focus', onFocus);
      const file = e.target.files[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = parseBead(ev.target.result);
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

// ─────────────────────────────────────────────
// PNG export
// ─────────────────────────────────────────────

/** Build an off-screen canvas with the rendered bead grid. */
function _buildExportCanvas(state, bg, scale) {
  const { cells, gridType, width, height } = state;
  const cs = scale;

  const extraW = gridType === 'brick' ? cs / 2 : 0;
  const extraH = gridType === 'peyote' ? cs / 2 : 0;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * cs + extraW);
  canvas.height = Math.ceil(height * cs + extraH);
  const ctx = canvas.getContext('2d');

  if (bg === 'white') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (bg === 'black') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const color = cells[`${col},${row}`] ?? null;
      if (!color) continue;

      const { x, y } = getCellPixelPos(col, row, gridType, cs);
      const radius = cs / 2 - 1;
      const cx = x + cs / 2;
      const cy = y + cs / 2;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      const grad = ctx.createRadialGradient(
        cx - radius * 0.2, cy - radius * 0.25, radius * 0.05,
        cx, cy, radius
      );
      grad.addColorStop(0, 'rgba(255,255,255,0.25)');
      grad.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  return canvas;
}

/**
 * Export the grid as PNG using the File System Access API when available,
 * falling back to a browser download trigger.
 */
export async function exportPngNative(state, bg = 'transparent', scale = 40) {
  const canvas = _buildExportCanvas(state, bg, scale);
  const suggestedName = `${(state.projectName || 'gridbead_design').replace(/\s+/g, '_')}.png`;

  if (FSA_SUPPORTED) {
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
          } catch (err) {
            reject(err);
          }
        }, 'image/png');
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      // Fall through to download
    }
  }

  canvas.toBlob((blob) => _downloadBlob(blob, suggestedName), 'image/png');
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function _downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
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

export function pushRecentFile(name) {
  const files = loadRecentFiles().filter((f) => f.name !== name);
  files.unshift({ name, savedAt: new Date().toISOString() });
  localStorage.setItem(RECENT_KEY, JSON.stringify(files.slice(0, 5)));
}
