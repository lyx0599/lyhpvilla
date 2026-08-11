import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const structure = workspace.houseStructuresByFloor.B1;
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
assert.equal(room("ROOM-B1-004").area, 19_448_246);

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
assert.deepEqual(guestBed.dimensions, { width: 165, depth: 200, height: 95, unit: "cm" });
const wardrobe = furniture("furn-b1-room-seasonal-wardrobe-001");
assert.deepEqual(wardrobe.dimensions, { width: 270, depth: 60, height: 275, unit: "cm" });
assert.equal(wardrobe.render3d.variantId, "fullHeightFlat");

const openShelf = furniture("furn-b1-activity-bookshelf-001");
assert.equal(openShelf.name, "B1 活动区开放式展示收纳墙");
assert.deepEqual(openShelf.dimensions, { width: 280, depth: 45, height: 240, unit: "cm" });
assert.equal(openShelf.render3d.variantId, "b1ShowroomLibraryWall");
const smallShelf = furniture("furn-b1-activity-small-shelf-001");
assert.equal(smallShelf.render3d.variantId, "openClosedMix");
assert.equal(furniture("furn-b1-activity-beanbag-001").render3d.variantId, "beanBag");
assert.equal(furniture("furn-b1-activity-instrument-rack-001").render3d.variantId, "wallMountedGuitarUkulele");
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
assert.match(renderer, /b1ShowroomLibraryWall/);
assert.match(renderer, /b1ShowroomEllipticalCove/);

console.log("B1 final design checks passed: source-aligned stair, guest room, open activity storage and ten viewpoints are retained.");
