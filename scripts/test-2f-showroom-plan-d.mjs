import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  modernWarmNaturalFloorProfiles,
  modernWarmNaturalSceneId,
  modernWarmNaturalSceneKeys
} from "../lib/modern-warm-natural-system.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const structure = workspace.houseStructuresByFloor["2F"];
const byId = (items, id, label) => {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing ${label}: ${id}`);
  return item;
};
const room = (id) => byId(structure.rooms, id, "room");
const furniture = (id) => byId(workspace.furniture, id, "furniture");
const door = (id) => byId(structure.doors, id, "door");

assert.deepEqual(room("ROOM-2F-004").boundary, [{ x: 950, y: 5150 }, { x: 3897, y: 5150 }, { x: 3897, y: 7800 }, { x: 950, y: 7800 }]);
assert.deepEqual(room("ROOM-2F-005").boundary, [{ x: 3897, y: 5150 }, { x: 6542, y: 5150 }, { x: 6542, y: 7800 }, { x: 3897, y: 7800 }]);
assert.deepEqual(room("ROOM-2F-006").boundary, [{ x: 7681, y: 3050 }, { x: 9495, y: 3050 }, { x: 9495, y: 7800 }, { x: 6542, y: 7800 }, { x: 6542, y: 5150 }, { x: 7681, y: 5150 }]);

assert.deepEqual(structure.stairs.map(({ id, start, end, width, landingDepthMm, direction }) => ({ id, start, end, width, landingDepthMm, direction })), [
  { id: "ST-2F-001", start: { x: 4123, y: 4470 }, end: { x: 950, y: 4470 }, width: 900, landingDepthMm: 900, direction: "down" }
]);
assert.equal(structure.stairs[0].verificationMeta.status, "drawing-derived");
assert.equal(structure.stairs[0].visual.style, "showroomLightStone");

const dressingOpening = door("D-2F-002");
assert.deepEqual(
  { hostId: dressingOpening.hostId, width: dressingOpening.width, height: dressingOpening.height, style: dressingOpening.visual.style, leafCount: dressingOpening.visual.leafCount, material: dressingOpening.material },
  { hostId: "W-2F-009", width: 1500, height: 2300, style: "openPassage", leafCount: 0, material: "none" }
);

assert.deepEqual(structure.outdoors.map(({ id, polygon }) => ({ id, polygon })), [
  { id: "OD-2F-BALCONY-01", polygon: [{ x: 950, y: 7800 }, { x: 3897, y: 7800 }, { x: 3897, y: 9100 }, { x: 950, y: 9100 }] },
  { id: "OD-2F-BALCONY-02", polygon: [{ x: 3897, y: 7800 }, { x: 6542, y: 7800 }, { x: 6542, y: 9100 }, { x: 3897, y: 9100 }] }
]);
const balconyDivider = byId(structure.fences, "FN-2F-BALCONY-DIVIDER", "balcony divider");
assert.deepEqual({ start: balconyDivider.start, end: balconyDivider.end, thickness: balconyDivider.thickness, material: balconyDivider.material }, { start: { x: 3897, y: 7800 }, end: { x: 3897, y: 9100 }, thickness: 180, material: "wall" });

const bed = furniture("furn-2f-master-bedroom-bed-001");
assert.deepEqual(bed.dimensions, { width: 180, depth: 200, height: 95, unit: "cm" });
assert.equal(bed.hostWallId, "W-2F-016");
assert.equal(bed.position.rotation, 270);

const wardrobe = furniture("furn-2f-master-bedroom-large-wardrobe-001");
assert.deepEqual(wardrobe.dimensions, { width: 300, depth: 35, height: 275, unit: "cm" });
assert.equal(wardrobe.hostWallId, "W-2F-011");
assert.equal(wardrobe.render3d.variantId, "shallowTopHungSlidingTextile");
assert.equal(wardrobe.render3d.cabinetVisual.doorCount, 4);

const desk = furniture("module-2f-window-desk");
assert.deepEqual(desk.dimensions, { width: 180, depth: 70, height: 74, unit: "cm" });
assert.equal(desk.render3d.variantId, "luxuryElectricBladePedestal");

assert.deepEqual(furniture("furn-2f-master-bathtub-001").dimensions, { width: 170, depth: 70, height: 60, unit: "cm" });
assert.deepEqual(furniture("furn-2f-master-toilet-001").dimensions, { width: 60, depth: 70, height: 78, unit: "cm" });
assert.equal(furniture("furn-2f-master-vanity-001").render3d.wetAreaVisual.basinCount, 2);

for (const roomId of ["ROOM-2F-002", "ROOM-2F-004", "ROOM-2F-005", "ROOM-2F-006", "ROOM-2F-007", "ROOM-2F-008"]) {
  assert.equal(room(roomId).surfaceFinishes.floor.materialToken, "oakFloor");
  assert.equal(room(roomId).surfaceFinishes.wall.materialToken, "warmWhiteMineral");
}
for (const roomId of ["ROOM-2F-001", "ROOM-2F-003"]) {
  assert.equal(room(roomId).surfaceFinishes.floor.materialToken, "wetAreaTile");
  assert.equal(room(roomId).surfaceFinishes.wall.materialToken, "travertine");
}

const cameras = workspace.cameraViews.filter((view) => view.floor === "2F" && view.id.startsWith("designer-camera-2f-v3-"));
assert.equal(cameras.length, 10);
assert.deepEqual(cameras.map((view) => view.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.equal(byId(cameras, "designer-camera-2f-v3-04-master-bed", "master-bedroom camera").targetArea, "ROOM-2F-006");

const profile = modernWarmNaturalFloorProfiles["2F"];
assert.equal(profile.exposureCompensationEv, -0.08);
assert.equal(profile.ambientFill, 0.96);
assert.deepEqual(modernWarmNaturalSceneKeys.map((key) => modernWarmNaturalSceneId("2F", key)), [
  "SCENE-MWN-V1-2F-DAYLIGHT", "SCENE-MWN-V1-2F-DAILY", "SCENE-MWN-V1-2F-ACTIVITY", "SCENE-MWN-V1-2F-NIGHT", "SCENE-MWN-V1-2F-CLEANING"
]);

console.log("2F final layout checks passed: frozen rooms, open dressing passage, two balconies, master suite and shared profile are retained.");
