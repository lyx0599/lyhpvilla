import { readHistoricalWorkspace } from "./read-historical-workspace.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Historical release scope: old adopted coordinates/roles are immutable fixtures.
// Current model is checked by test-four-floor-calibration.mjs and native review.
const workspace = readHistoricalWorkspace();
const structure = workspace.houseStructuresByFloor.B1;
const selected2250 = /b1-selected2250-staged|source-ratio-A-integrated/.test(workspace.defaultWorkspaceRevision);
const byId = (items, id, label) => {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing ${label}: ${id}`);
  return item;
};
const room = (id) => byId(structure.rooms, id, "room");
const furniture = (id) => byId(workspace.furniture, id, "furniture");

assert.deepEqual(room("ROOM-B1-002").boundary, [
  { x: 6000, y: 350 }, { x: 9495, y: 350 }, { x: 9495, y: 3117 },
  { x: 5281, y: 3117 }, { x: 3947, y: 3117 }, { x: 3947, y: 1800 }, { x: 6000, y: 1800 }
]);
assert.equal(room("ROOM-B1-002").area, 12_374_466);
const polygonAreaMm2 = points => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + point.x * next.y - next.x * point.y;
}, 0) / 2);
assert.equal(room("ROOM-B1-004").area, selected2250 ? 18_425_405.5 : 20_567_105.5, "Use the adopted contour revision, retaining the original arc and body.");
assert.ok(Math.abs(room("ROOM-B1-003").area - polygonAreaMm2(room("ROOM-B1-003").boundary)) < 0.001);
assert.equal(room("ROOM-B1-004").area, polygonAreaMm2(room("ROOM-B1-004").boundary), "Derived design area must use its polygon, not the old inconsistent cache.");
assert.equal(Math.max(...room("ROOM-B1-004").boundary.map(point => point.x)), selected2250 ? 8900 : 10000);
assert.equal(Math.max(...room("ROOM-B1-004").boundary.map(point => point.y)), 7800);
const originalArc = byId(structure.walls, "AW-B1-014", "original arc guard");
assert.deepEqual([originalArc.center.x, originalArc.center.y, originalArc.radius, originalArc.startAngle, originalArc.endAngle], [4708, 4523, 1936, -47.18, 42.82]);
const sampledArc = room("ROOM-B1-003").boundary.filter(point => Math.abs(Math.hypot(point.x - 4708, point.y - 4523) - 1936) < 0.001);
assert.equal(sampledArc.length, 19, "Approved floor contour must retain the original natural arc samples.");
const shortGuard = byId(structure.walls, "W-B1-012", "short guard");
const movedGuard = byId(structure.walls, "W-B1-013", "outer upper-edge guard");
assert.deepEqual(movedGuard.start, shortGuard.end);
assert.deepEqual(movedGuard.end, { x: selected2250 ? 8900 : 10000, y: 5853 });
assert.equal(movedGuard.length, selected2250 ? 2250 : 3350);
assert.equal(movedGuard.height, 1100);
assert.equal(movedGuard.thickness, 90);
assert.ok(workspace.stairOpenings.some(opening => opening.id === "OPENING-B2-B1" && opening.floorId === "B1"), "Original stair void must remain a real opening, not a filled room floor.");

assert.deepEqual(structure.stairs.map(({ id, start, end, width, stepCount, landingDepthMm, direction }) => ({ id, start, end, width, stepCount, landingDepthMm, direction })), [
  { id: "ST-B1-001", start: { x: 4123, y: 3500 }, end: { x: 950, y: 3500 }, width: 900, stepCount: 10, landingDepthMm: 900, direction: "up" },
  { id: "ST-B1-002", start: { x: 4123, y: 4470 }, end: { x: 950, y: 4470 }, width: 900, stepCount: 10, landingDepthMm: 900, direction: "down" }
]);
for (const stair of structure.stairs) {
  assert.equal(stair.verificationMeta.status, "drawing-derived");
  assert.equal(stair.visual.style, "showroomLightStone");
  assert.equal(stair.visual.glassGuard, true);
}

for (const roomId of ["ROOM-B1-002", "ROOM-B1-003", "ROOM-B1-004", "ROOM-B1-005"]) {
  assert.equal(room(roomId).surfaceFinishes.floor.materialToken, "microCement");
}

const guestBed = furniture("furn-b1-guest-bed-001");
assert.deepEqual(guestBed.dimensions, { width: 200, depth: 103, height: 85, unit: "cm" });
const wardrobe = furniture("furn-b1-room-seasonal-wardrobe-001");
assert.deepEqual(wardrobe.dimensions, { width: 250, depth: 60, height: 275, unit: "cm" });
assert.equal(wardrobe.render3d.variantId, "slidingPanels");

const openShelf = furniture("furn-b1-activity-bookshelf-001");
assert.equal(openShelf.name, "B1 阅读与轻松休闲综合收纳柜（原 2.8m 综合柜）");
assert.deepEqual(openShelf.dimensions, { width: 280, depth: 45, height: 240, unit: "cm" });
assert.equal(openShelf.render3d.variantId, "openClosedMix");
const smallShelf = furniture("furn-b1-activity-small-shelf-001");
assert.equal(smallShelf.render3d.variantId, "openClosedMix");
assert.equal(furniture("furn-b1-activity-beanbag-001").render3d.variantId, "beanBag");
assert.equal(furniture("furn-b1-activity-instrument-rack-001").render3d.variantId, "legacyHiddenInstrumentRack");
assert.equal(workspace.furniture.some((item) => item.floorId === "B1" && item.render3d?.assetType === "piano"), false, "The approved activity zone uses an open shelf instead of a piano model.");

const designerCameras = workspace.cameraViews.filter((view) => view.floor === "B1" && view.id.startsWith("designer-camera-b1-"));
assert.equal(designerCameras.length, 10, "B1 must retain ten designer viewpoints.");
for (const view of designerCameras) {
  assert.ok(view.targetArea, `${view.id} must declare its real target area.`);
  assert.ok((view.fov ?? 50) <= 54, `${view.id} must avoid an exaggerated ultra-wide lens.`);
}

const ceiling = byId(workspace.drawingItems, "C-B1-SHOWROOM-ACTIVITY-COVE-01", "activity ceiling");
assert.equal(ceiling.category, "ceiling");
assert.equal(ceiling.polygon.length, 49);
assert.ok(workspace.drawingPackage.drawingItemIds.includes(ceiling.id));

const renderer = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
const cabinetRenderer = await readFile(new URL("../components/furniture-3d/cabinet-family-3d.tsx", import.meta.url), "utf8");
assert.match(cabinetRenderer, /openClosedMix/);
assert.match(renderer, /b1ShowroomEllipticalCove/);

console.log("B1 final design checks passed: source-aligned stair, guest room, open activity storage and ten viewpoints are retained.");
