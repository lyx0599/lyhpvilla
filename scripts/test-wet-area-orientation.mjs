import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const wetAreaSource = await readFile(new URL("../components/furniture-3d/wet-area-family-3d.tsx", import.meta.url), "utf8");
const floorRendererSource = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");

function pointToSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}

function furnitureCenterMm(item, structure) {
  const coordinateSystem = structure.coordinateSystem;
  return {
    x: coordinateSystem.origin.x + item.position.x / 100 * coordinateSystem.width,
    y: coordinateSystem.origin.y + item.position.y / 100 * coordinateSystem.height
  };
}

const fixtures = workspace.furniture.filter((item) => ["bathroomVanity", "sink"].includes(item.render3d?.assetType));
assert.ok(fixtures.length >= 5, "The whole-house audit should include every currently modeled vanity and fixed sink.");

for (const item of fixtures) {
  const structure = workspace.houseStructuresByFloor[item.floorId];
  const center = furnitureCenterMm(item, structure);
  const rotation = (item.position.rotation ?? 0) * Math.PI / 180;
  const front = { x: -Math.sin(rotation), y: Math.cos(rotation) };
  const halfDepthMm = item.dimensions.depth * 5;
  const frontPoint = { x: center.x + front.x * halfDepthMm, y: center.y + front.y * halfDepthMm };
  const backPoint = { x: center.x - front.x * halfDepthMm, y: center.y - front.y * halfDepthMm };
  const hostWall = item.hostWallId ? structure.walls.find((wall) => wall.id === item.hostWallId && wall.kind === "straight") : null;
  const room = structure.rooms.find((candidate) => candidate.id === item.roomId);
  const boundarySegments = hostWall
    ? [[hostWall.start, hostWall.end]]
    : (room?.boundary ?? []).map((point, index, boundary) => [point, boundary[(index + 1) % boundary.length]]);

  assert.ok(boundarySegments.length > 0, `${item.id} must have a host wall or room boundary for orientation checks.`);
  const backDistance = Math.min(...boundarySegments.map(([start, end]) => pointToSegmentDistance(backPoint, start, end)));
  const frontDistance = Math.min(...boundarySegments.map(([start, end]) => pointToSegmentDistance(frontPoint, start, end)));
  assert.ok(backDistance + 50 < frontDistance, `${item.id} is reversed: its user-facing side points toward the wall.`);
}

assert.match(wetAreaSource, /mirrorMountZ[\s\S]*?-depth \/ 2/, "Parametric vanity mirrors must mount on the wall/back edge.");
assert.match(floorRendererSource, /mirrorBackZ = -depth \/ 2/, "Fallback vanity mirrors must mount on the wall/back edge.");

console.log(`Whole-house wet-area orientation checks passed: ${fixtures.length} vanities and fixed sinks.`);
