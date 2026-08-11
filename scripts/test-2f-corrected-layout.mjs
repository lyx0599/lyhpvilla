import assert from "node:assert/strict";
import fs from "node:fs";

const workspace = JSON.parse(fs.readFileSync(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const structure = workspace.houseStructuresByFloor["2F"];
const furniture = (id) => {
  const item = workspace.furniture.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing furniture ${id}`);
  return item;
};
const centerMm = (item) => ({
  x: Math.round(item.position.x / 100 * structure.coordinateSystem.width),
  y: Math.round(item.position.y / 100 * structure.coordinateSystem.height)
});

const bay = structure.bayWindows.find((item) => item.id === "BW-2F-002");
assert.ok(bay);
assert.equal(bay.wallId, "W-2F-020", "The master bay window must remain on the lower wall shown by the source plan.");
assert.equal(bay.width, 1600);
assert.equal(structure.bayWindows.filter((item) => item.wallId === "W-2F-020").length, 1, "The master bedroom has exactly one bay window.");
assert.ok(!structure.windows.some((item) => item.hostId === "W-2F-011" || ["WIN-2F-004", "WIN-2F-005"].includes(item.id)), "Incorrect side/bedroom windows must not return.");

const balcony = structure.outdoors.find((item) => item.id === "OD-2F-SHARED-BALCONY-001");
assert.ok(balcony, "The parent and child bedrooms need one shared balcony object.");
assert.deepEqual(balcony.polygon, [{ x: 950, y: 7800 }, { x: 6542, y: 7800 }, { x: 6542, y: 9300 }, { x: 950, y: 9300 }]);
assert.equal(structure.fences.filter((item) => item.id.startsWith("FN-2F-BALCONY-")).length, 3, "The connected balcony has one continuous exterior guard and no middle divider.");
for (const [id, hostId] of [["D-2F-009", "W-2F-018"], ["D-2F-010", "W-2F-019"]]) {
  const door = structure.doors.find((item) => item.id === id);
  assert.ok(door);
  assert.deepEqual({ hostId: door.hostId, width: door.width, height: door.height, operation: door.operation, material: door.material }, { hostId, width: 1500, height: 2300, operation: "sliding", material: "glass" });
}
assert.equal(structure.doors.find((item) => item.id === "D-2F-008")?.defaultOpenAmount, 0.88, "The corridor camera must see through a genuinely open master door.");

const sitStandDesk = furniture("module-2f-window-desk");
assert.deepEqual(sitStandDesk.dimensions, { width: 180, depth: 70, height: 75, unit: "cm" });
assert.deepEqual(centerMm(sitStandDesk), { x: 6532, y: 700 });
assert.equal(sitStandDesk.render3d.assetType, "desk");
assert.equal(sitStandDesk.render3d.variantId, "electricSitStandWood");
assert.equal(sitStandDesk.constructionMeta.reserveSize, "180x70x65-125cm");
const deskTaskLight = workspace.drawingItems.find((item) => item.relatedFurnitureId === sitStandDesk.id && item.category === "light");
assert.ok(deskTaskLight);
assert.equal(deskTaskLight.lightType, "deskTaskLight");
assert.match(deskTaskLight.label, /电脑桌功能灯/);
assert.equal(deskTaskLight.controlGroupId, "CG-2F-2F-002-DESK");

const parentBed = furniture("furn-2f-bedroom1-bed-001");
assert.deepEqual(parentBed.dimensions, { width: 150, depth: 200, height: 95, unit: "cm" });
assert.deepEqual(centerMm(parentBed), { x: 1950, y: 6950 });
assert.equal(parentBed.position.rotation, 270);
assert.equal(3897 - (centerMm(parentBed).x + 1000), 947, "Bedroom 1 must keep the right-side door-to-balcony route clear.");
assert.deepEqual(centerMm(furniture("furn-2f-bedroom1-wardrobe-001")), { x: 1650, y: 5450 });

const childBed = furniture("furn-2f-bedroom2-bed-001");
const childDesk = furniture("furn-2f-bedroom2-desk-001");
assert.deepEqual(childBed.dimensions, { width: 120, depth: 200, height: 78, unit: "cm" });
assert.deepEqual(centerMm(childBed), { x: 5942, y: 6750 });
assert.equal(childBed.render3d.variantId, "childBed");
assert.deepEqual(centerMm(furniture("module-2f-wardrobe-002")), { x: 5842, y: 5425 });
assert.deepEqual(centerMm(childDesk), { x: 4122, y: 6500 });
assert.equal((centerMm(childBed).x - 600) - (centerMm(childDesk).x + 225), 995, "Bedroom 2 must keep a usable passage between the shallow desk and pull-out bed.");

const masterBed = furniture("furn-2f-master-bedroom-bed-001");
assert.deepEqual(masterBed.dimensions, { width: 180, depth: 200, height: 95, unit: "cm" });
assert.deepEqual(centerMm(masterBed), { x: 7542, y: 6475 });
assert.equal(masterBed.position.rotation, 270);
assert.equal(masterBed.hostWallId, "W-2F-016");
const masterWardrobe = furniture("furn-2f-master-bedroom-large-wardrobe-001");
assert.deepEqual(masterWardrobe.dimensions, { width: 220, depth: 60, height: 275, unit: "cm" });
assert.deepEqual(centerMm(masterWardrobe), { x: 9195, y: 4200 });
assert.equal(masterWardrobe.hidden, false);
assert.equal(masterWardrobe.visible, true);
assert.equal(masterWardrobe.render3d.visibleIn3d, true);
const masterChest = furniture("furn-2f-master-bedroom-chest-001");
assert.deepEqual(masterChest.dimensions, { width: 80, depth: 35, height: 90, unit: "cm" });
assert.deepEqual(centerMm(masterChest), { x: 9320, y: 5700 });
assert.equal((9495 - 350) - (7542 + 1000), 603, "The shallow dresser must preserve the best feasible local bed-foot clearance.");
assert.equal(furniture("furn-2f-master-bay-bench-001").hostWallId, "W-2F-020");

for (const id of ["module-2f-cloak-left", "module-2f-cloak-right"]) {
  const item = furniture(id);
  assert.equal(item.render3d.variantId, "glassDisplay");
  assert.equal(item.render3d.cabinetVisual.glassTone, "smoked");
  assert.equal(item.render3d.cabinetVisual.allDoorPanels, true);
  assert.ok(item.render3d.cabinetVisual.bays.every((bay) => bay.frontType === "glass"));
}

assert.deepEqual(furniture("furn-2f-master-shower-001").dimensions, { width: 90, depth: 90, height: 210, unit: "cm" });
assert.deepEqual(furniture("furn-2f-master-bathtub-001").dimensions, { width: 170, depth: 70, height: 58, unit: "cm" });
assert.deepEqual(furniture("furn-2f-master-vanity-001").dimensions, { width: 160, depth: 50, height: 85, unit: "cm" });
assert.deepEqual(centerMm(furniture("furn-2f-master-toilet-001")), { x: 8031, y: 2400 });
assert.equal(structure.doors.filter((item) => item.hostId === "W-2F-009" && item.positionOnWall > 0.7).length, 1, "The main bath must retain exactly one entrance.");

const twoFloorCameras = workspace.cameraViews.filter((item) => item.floor === "2F" && item.id.startsWith("designer-camera-2f-"));
assert.equal(twoFloorCameras.length, 10);
assert.deepEqual(twoFloorCameras.map((item) => item.id), [
  "designer-camera-2f-01-stair-arrival",
  "designer-camera-2f-02-stair-opening-night",
  "designer-camera-2f-03-corridor-master-open",
  "designer-camera-2f-04-guest-bath",
  "designer-camera-2f-05-master-overview",
  "designer-camera-2f-06-master-reverse-storage",
  "designer-camera-2f-07-dark-glass-dressing",
  "designer-camera-2f-08-master-bath",
  "designer-camera-2f-09-parent-balcony",
  "designer-camera-2f-10-child-balcony"
]);
assert.equal(twoFloorCameras[0].cameraPosition.y, 1.62);
assert.equal(twoFloorCameras[0].target.y, 1.46, "The corridor view must remain near eye level instead of pointing at the floor.");
assert.ok(twoFloorCameras[1].target.y >= 1.2, "The stair-opening view must not return to a floor-dominant downward pitch.");
assert.deepEqual(twoFloorCameras[5].cameraPosition, { x: 0.2, y: 1.62, z: -0.5 }, "The master storage camera must stay outside the door-leaf swing and cabinet body.");
assert.ok(twoFloorCameras[9].fov >= 70, "The child-room camera needs enough field of view to include its wardrobe, bed and balcony door.");

const circulationFurniture = workspace.furniture.filter((item) => item.floorId === "2F" && ["ROOM-2F-007", "ROOM-2F-008"].includes(item.roomId) && !item.hidden && item.visible !== false);
assert.deepEqual(circulationFurniture, [], "The 2F hall and stair landing must remain free of furniture.");

console.log("2F corrected bedroom flow, bay-window wall and sit-stand desk checks passed.");
