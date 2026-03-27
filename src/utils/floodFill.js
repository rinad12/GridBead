/**
 * BFS flood-fill on the bead grid.
 * @param {Object} cells   - Sparse map { "col,row": hexColor }
 * @param {number} col     - Start column
 * @param {number} row     - Start row
 * @param {string|null} fillColor - Color to paint (null = erase)
 * @param {number} width   - Grid width
 * @param {number} height  - Grid height
 * @returns {Object} New cells map
 */
export function floodFill(cells, col, row, fillColor, width, height) {
  const key = (c, r) => `${c},${r}`;
  const startColor = cells[key(col, row)] ?? null;

  // No-op: fill and start colors are the same
  if (startColor === fillColor) return cells;

  const newCells = { ...cells };
  const queue = [[col, row]];
  const visited = new Set();

  while (queue.length > 0) {
    const [c, r] = queue.pop();
    const k = key(c, r);

    if (visited.has(k)) continue;
    if (c < 0 || c >= width || r < 0 || r >= height) continue;
    if ((newCells[k] ?? null) !== startColor) continue;

    visited.add(k);

    if (fillColor === null) {
      delete newCells[k];
    } else {
      newCells[k] = fillColor;
    }

    queue.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }

  return newCells;
}
