import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const structure = workspace.houseStructuresByFloor.B1;
const byId = (items, id, label) => {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing ${label}: ${id}`);
  return item;
};
const room = byId(structure.rooms, "ROOM-B1-001", "B1 laundry room");
const wall = (id) => byId(structure.walls, id, "wall");
const furniture = (id) => byId(workspace.furniture, id, "furniture");
const centerMm = (item) => ({
  x: Math.round(item.position.x / 100 * structure.coordinateSystem.width),
  y: Math.round(item.position.y / 100 * structure.coordinateSystem.height)
});

assert.deepEqual(room.boundary, [{ x: 3947, y: 350 }, { x: 6000, y: 350 }, { x: 6000, y: 1800 }, { x: 3947, y: 1800 }]);
assert.equal(room.area, 2_976_850);
assert.deepEqual({ start: wall("W-B1-001").start, end: wall("W-B1-001").end }, { start: { x: 3947, y: 350 }, end: { x: 6000, y: 350 } });
assert.deepEqual({ start: wall("W-B1-015").start, end: wall("W-B1-015").end }, { start: { x: 6000, y: 350 }, end: { x: 6000, y: 1800 } });
assert.deepEqual({ start: wall("W-B1-016").start, end: wall("W-B1-016").end }, { start: { x: 6000, y: 1800 }, end: { x: 3947, y: 1800 } });

const door = byId(structure.doors, "D-B1-001", "door");
assert.deepEqual(
  { hostId: door.hostId, positionOnWall: door.positionOnWall, width: door.width, height: door.height, openDirection: door.openDirection },
  { hostId: "W-B1-016", positionOnWall: 0.485, width: 900, height: 2100, openDirection: "leftOut" }
);

assert.equal(room.surfaceFinishes.floor.materialToken, "wetAreaTile");
assert.equal(room.surfaceFinishes.floor.materialResourceId, "polyhavenWarmBeigeTile08");
assert.equal(room.surfaceFinishes.wall.materialToken, "travertine");

const washer = furniture("furn-b1-laundry-washer-001");
assert.deepEqual(washer.dimensions, { width: 60, depth: 62, height: 170, unit: "cm" });
assert.deepEqual(centerMm(washer), { x: 5150, y: 690 });
assert.equal(washer.render3d.variantId, "washerDryerStack");

const cleaningCabinet = furniture("furn-b1-laundry-cleaning-cabinet-001");
assert.deepEqual(cleaningCabinet.dimensions, { width: 38, depth: 35, height: 210, unit: "cm" });
assert.equal(cleaningCabinet.render3d.variantId, "b1CleaningStorageCabinet");

const vanity = furniture("furn-b1-bath-vanity-001");
assert.deepEqual(vanity.dimensions, { width: 45, depth: 35, height: 82, unit: "cm" });
assert.equal(vanity.hostWallId, "W-B1-015");
assert.equal(vanity.render3d.wetAreaVisual.mirrorStyle, "none");

const toilet = furniture("furn-b1-bath-toilet-001");
assert.deepEqual(toilet.dimensions, { width: 68, depth: 74, height: 76, unit: "cm" });
assert.equal(toilet.hostWallId, "W-B1-001");

const lights = workspace.drawingItems.filter((item) => item.floorId === "B1" && item.roomId === room.id && item.category === "light");
assert.ok(lights.some((item) => item.lightingLayer === "ambient" && item.colorTemperature === "3000K"));
assert.ok(lights.some((item) => item.lightingLayer === "task" && item.colorTemperature === "3000K"));
assert.ok(lights.some((item) => item.lightingLayer === "mirrorLight" && item.colorTemperature === "3000K"));

console.log("B1 laundry checks passed: final envelope, sanitary fixtures, storage and lighting are registered.");
