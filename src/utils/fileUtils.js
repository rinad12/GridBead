const BEAD_FORMAT_VERSION = '1.0';

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

/** Trigger browser download of a .bead file */
export function downloadBead(state) {
  const json = serializeProject(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.projectName.replace(/\s+/g, '_') || 'loomy_design'}.bead`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse a .bead file content string, return project data or throw */
export function parseBead(jsonString) {
  const data = JSON.parse(jsonString);
  if (!data.version || !data.cells) throw new Error('Invalid .bead file');
  return data;
}

/** Open a file picker and return parsed project data */
export function openBeadFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bead,application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          resolve(parseBead(ev.target.result));
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
 * Export the current grid as a high-resolution PNG.
 * @param {Object} state   - Project state
 * @param {string} bg      - 'transparent' | 'white' | 'black'
 * @param {number} scale   - Pixels per bead (e.g. 20, 40)
 */
export function exportPng(state, bg = 'transparent', scale = 40) {
  const { cells, gridType, width, height, colors } = state;
  const cs = scale;

  // Canvas size must accommodate brick/peyote offsets
  const extraW = gridType === 'brick' ? cs / 2 : 0;
  const extraH = gridType === 'peyote' ? cs / 2 : 0;
  const canvasW = width * cs + extraW;
  const canvasH = height * cs + extraH;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(canvasW);
  canvas.height = Math.ceil(canvasH);
  const ctx = canvas.getContext('2d');

  // Background
  if (bg === 'white') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (bg === 'black') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // transparent = no fill

  // Draw each bead
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

      // Subtle highlight
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

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(state.projectName || 'loomy_design').replace(/\s+/g, '_')}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
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
