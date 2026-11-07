import type { HouseStructure, MmPoint } from '../types/space';

// Render-only correction. The source wall/rail axes, dimensions, room polygons,
// finishes and structural claims are deliberately not changed.
export function b1WallDisplayProfile(floorId: string, widthMm: number) {
  const flush = floorId === 'B1' && widthMm === 220;
  return { flush, bodyMm: widthMm, capMm: widthMm + (flush ? 0 : 64),
    shadowMm: widthMm + (flush ? 0 : 28), baseboardMm: widthMm + (flush ? 0 : 36) };
}

type RailSegment = { id: string; start: MmPoint; end: MmPoint; postStops: number[] };
export type B1RailJoint = { previous?: MmPoint; next?: MmPoint; postStops: number[] };
const cache = new WeakMap<HouseStructure, RailSegment[]>();
const key = (p: MmPoint) => `${Math.round(p.x * 10)},${Math.round(p.y * 10)}`;
const same = (a: MmPoint, b: MmPoint) => key(a) === key(b);

export function b1RailSegments(s: HouseStructure): RailSegment[] {
  const prior = cache.get(s); if (prior) return prior;
  const segments: RailSegment[] = [];
  if (s.floorId !== 'B1') return segments;
  for (const w of s.walls.filter(w => w.barrierType === 'railing')) {
    if (w.kind === 'arc') {
      let sweep = w.endAngle - w.startAngle;
      if (w.direction === 'clockwise' && sweep < 0) sweep += 360;
      if (w.direction === 'counterclockwise' && sweep > 0) sweep -= 360;
      const points = Array.from({ length: 21 }, (_, i) => {
        const a = (w.startAngle + sweep * i / 20) * Math.PI / 180;
        return { x: Math.round(w.center.x + Math.cos(a) * w.radius), y: Math.round(w.center.y + Math.sin(a) * w.radius) };
      });
      for (let i = 0; i < 20; i++) segments.push({ id: w.id, start: points[i], end: points[i + 1],
        postStops: i === 19 ? [0, 1] : i % 4 === 0 ? [0] : [] });
    } else {
      const count = Math.max(2, Math.ceil(Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) / 900) + 1);
      segments.push({ id: w.id, start: w.start, end: w.end, postStops: Array.from({ length: count }, (_, i) => i / (count - 1)) });
    }
  }
  // Ownership is assigned only among posts that actually exist. No new support
  // pattern is inferred; a shared endpoint is one post, not two overlapping ones.
  const seen = new Set<string>();
  for (const seg of segments) seg.postStops = seg.postStops.filter(t => {
    const p = { x: seg.start.x + (seg.end.x - seg.start.x) * t, y: seg.start.y + (seg.end.y - seg.start.y) * t };
    const k = key(p); if (seen.has(k)) return false; seen.add(k); return true;
  });
  cache.set(s, segments); return segments;
}

export function b1RailJoint(s: HouseStructure, id: string, start: MmPoint, end: MmPoint): B1RailJoint {
  const all = b1RailSegments(s), own = all.find(a => a.id === id && same(a.start, start) && same(a.end, end));
  const neighbor = (p: MmPoint) => {
    const matches = all.filter(a => a !== own && (same(a.start, p) || same(a.end, p)));
    if (matches.length !== 1) return undefined; // Do not invent a route through a branch or gap.
    return same(matches[0].start, p) ? matches[0].end : matches[0].start;
  };
  return { previous: neighbor(start), next: neighbor(end), postStops: own?.postStops ?? [] };
}

function normal(a: MmPoint, b: MmPoint) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (length < .001) throw new Error('Zero-length B1 railing segment');
  return { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
}
function miter(a: MmPoint, b: MmPoint, halfWidth: number) {
  const denominator = 1 + a.x * b.x + a.y * b.y;
  if (denominator < .25) throw new Error('B1 railing reverses too sharply; review the actual joint');
  return { x: (a.x + b.x) * halfWidth / denominator, y: (a.y + b.y) * halfWidth / denominator };
}

// Four plan corners, shared exactly with the adjoining segment. No round join
// that would inflate the nominal section, and no independently capped tails.
export function b1MiterFootprint(start: MmPoint, end: MmPoint, widthMm: number, joint: B1RailJoint) {
  const n = normal(start, end), h = widthMm / 2;
  const a = joint.previous ? miter(normal(joint.previous, start), n, h) : { x: n.x * h, y: n.y * h };
  const b = joint.next ? miter(n, normal(end, joint.next), h) : { x: n.x * h, y: n.y * h };
  return [{ x: start.x + a.x, y: start.y + a.y }, { x: end.x + b.x, y: end.y + b.y },
    { x: end.x - b.x, y: end.y - b.y }, { x: start.x - a.x, y: start.y - a.y }];
}
