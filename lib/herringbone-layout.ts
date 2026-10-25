type Point = { x: number; y: number };
export type HerringboneBounds = { minX: number; maxX: number; minY: number; maxY: number };

/** A true two-plank herringbone lattice, in metres and anchored to the floor. */
export function buildHerringbonePlanks(bounds: HerringboneBounds, length: number, width: number, angle = Math.PI / 4): Point[][] {
  if (!(length > 0 && width > 0) || !Number.isFinite(length + width + angle)) return [];
  if (!Object.values(bounds).every(Number.isFinite) || bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) return [];
  const c = Math.cos(angle), s = Math.sin(angle);
  const rotate = (x: number, y: number): Point => ({ x: x * c - y * s, y: x * s + y * c });
  const corners = [bounds.minX, bounds.maxX].flatMap((x) => [bounds.minY, bounds.maxY].map((y) => ({ x: x * c + y * s, y: -x * s + y * c })));
  const iValues = corners.map(({ x, y }) => (x + y) / (2 * length));
  const jValues = corners.map(({ x, y }) => (y - x) / (2 * width));
  const padding = Math.ceil(length / width) + 2;
  const planks: Point[][] = [];
  for (let i = Math.floor(Math.min(...iValues)) - 2; i <= Math.ceil(Math.max(...iValues)) + 2; i++) {
    for (let j = Math.floor(Math.min(...jValues)) - padding; j <= Math.ceil(Math.max(...jValues)) + padding; j++) {
      // The pair's area equals the lattice cell: 2 * length * width.
      const x = i * length - j * width, y = i * length + j * width;
      const pair = [
        [[x, y], [x + length, y], [x + length, y + width], [x, y + width]],
        [[x + length, y], [x + length + width, y], [x + length + width, y + length], [x + length, y + length]]
      ];
      for (const points of pair) {
        const polygon = points.map(([px, py]) => rotate(px, py));
        if (Math.max(...polygon.map((p) => p.x)) < bounds.minX || Math.min(...polygon.map((p) => p.x)) > bounds.maxX
          || Math.max(...polygon.map((p) => p.y)) < bounds.minY || Math.min(...polygon.map((p) => p.y)) > bounds.maxY) continue;
        planks.push(polygon);
      }
    }
  }
  return planks;
}
