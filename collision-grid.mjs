// Static broad phase. Query again after each push-out pass: a wall can push
// the player into a neighbouring cell. Dynamic vehicles/NPCs stay separate.
export class CollisionGrid {
  constructor(cellSize = 8) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.seen = new Set();
  }
  insert(bounds, value) {
    const s = this.cellSize;
    for (let x = Math.floor(bounds.minX / s); x <= Math.floor(bounds.maxX / s); x++) {
      for (let z = Math.floor(bounds.minZ / s); z <= Math.floor(bounds.maxZ / s); z++) {
        const key = `${x},${z}`;
        if (!this.cells.has(key)) this.cells.set(key, []);
        this.cells.get(key).push(value);
      }
    }
  }
  query(x, z, radius, result) {
    result.length = 0;
    this.seen.clear();
    const s = this.cellSize;
    for (let cx = Math.floor((x - radius) / s); cx <= Math.floor((x + radius) / s); cx++) {
      for (let cz = Math.floor((z - radius) / s); cz <= Math.floor((z + radius) / s); cz++) {
        const cell = this.cells.get(`${cx},${cz}`);
        if (!cell) continue;
        for (const value of cell) {
          if (this.seen.has(value)) continue;
          this.seen.add(value);
          result.push(value);
        }
      }
    }
    // Preserve the old solver's insertion order at corners and overlapping walls.
    result.sort((a, b) => a - b);
    return result;
  }
}

export function cameraObstructionFraction(startX, startZ, endX, endZ, boxes, indices, pad = .28) {
  let fraction = 1;
  const dx = endX - startX, dz = endZ - startZ;
  for (const i of indices) {
    const b = boxes[i];
    if (b.maxX - b.minX < 1.8 && b.maxZ - b.minZ < 1.8) continue;
    let entry = 0, exit = 1;
    for (let axis = 0; axis < 2; axis++) {
      const start = axis ? startZ : startX, direction = axis ? dz : dx;
      const min = (axis ? b.minZ : b.minX) - pad, max = (axis ? b.maxZ : b.maxX) + pad;
      if (Math.abs(direction) < 1e-6) {
        if (start < min || start > max) { exit = -1; break; }
      } else {
        const a = (min - start) / direction, c = (max - start) / direction;
        entry = Math.max(entry, Math.min(a, c));
        exit = Math.min(exit, Math.max(a, c));
      }
    }
    if (entry <= exit) fraction = Math.min(fraction, entry);
  }
  return fraction;
}
