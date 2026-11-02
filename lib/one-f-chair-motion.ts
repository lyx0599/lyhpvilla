/** Piecewise-linear declared chair motion; no simultaneous-chair inference. */
export function oneFChairMotionOffset(path: readonly (readonly number[])[], progress: number): [number, number] {
  if (!path.length || path.some(p => p.length !== 2 || p.some(v => !Number.isFinite(v)))) throw new Error('Invalid chair motion path');
  const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  let remaining = lengths.reduce((a, b) => a + b, 0) * Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] && lengths[i] > 0) {
      const f = remaining / lengths[i];
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f];
    }
    remaining -= lengths[i];
  }
  return [path[path.length - 1][0], path[path.length - 1][1]];
}
