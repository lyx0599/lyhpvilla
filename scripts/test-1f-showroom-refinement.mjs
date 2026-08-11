import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const structure = workspace.houseStructuresByFloor["1F"];
const byId = (items, id, label) => {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing ${label}: ${id}`);
  return item;
};
const room = (id) => byId(structure.rooms, id, "room");
const furniture = (id) => byId(workspace.furniture, id, "furniture");

assert.deepEqual(room("ROOM-1F-002").boundary, [{ x: 5383, y: 350 }, { x: 7681, y: 350 }, { x: 7681, y: 3050 }, { x: 5383, y: 3050 }]);
assert.equal(room("ROOM-1F-002").area, 6_204_600);
assert.deepEqual(room("ROOM-1F-004").boundary, [{ x: 950, y: 5150 }, { x: 3897, y: 5150 }, { x: 3897, y: 7800 }, { x: 950, y: 7800 }]);
assert.equal(room("ROOM-1F-004").area, 7_809_550);
assert.equal(room("ROOM-1F-005").area, 27_054_600);

assert.deepEqual(structure.stairs.map(({ id, start, end, width, landingDepthMm, direction }) => ({ id, start, end, width, landingDepthMm, direction })), [
  { id: "ST-1F-001", start: { x: 4123, y: 3500 }, end: { x: 950, y: 3500 }, width: 900, landingDepthMm: 900, direction: "up" },
  { id: "ST-1F-002", start: { x: 4123, y: 4470 }, end: { x: 950, y: 4470 }, width: 900, landingDepthMm: 900, direction: "down" }
]);
for (const stair of structure.stairs) {
  assert.equal(stair.verificationMeta.status, "drawing-derived");
  assert.equal(stair.visual.style, "showroomLightStone");
  assert.equal(stair.visual.glassGuard, true);
}

assert.equal(structure.windows.some((item) => item.hostId === "W-1F-011"), false, "The confirmed east living wall must remain solid behind the water bar.");
const livingWindow = byId(structure.windows, "WIN-1F-006", "living room window");
assert.deepEqual({ hostId: livingWindow.hostId, width: livingWindow.width, height: livingWindow.height, sillHeightMm: livingWindow.sillHeightMm }, { hostId: "W-1F-015", width: 3600, height: 1900, sillHeightMm: 550 });

const table = furniture("module-1f-table-001");
assert.deepEqual(table.dimensions, { width: 270, depth: 270, height: 75, unit: "cm" });
assert.equal(table.render3d.variantId, "poweredRoundExtension");
assert.equal(table.render3d.primaryMaterial, "warmOak");
assert.equal(table.render3d.secondaryMaterial, "beigeFabric");

const kitchenRun = furniture("furn-kitchen-run-001");
assert.deepEqual(kitchenRun.dimensions, { width: 210, depth: 55, height: 90, unit: "cm" });
assert.equal(kitchenRun.render3d.primaryMaterial, "warmWhiteCeramic");
assert.equal(kitchenRun.render3d.secondaryMaterial, "warmOak");
assert.equal(furniture("furn-sink-001").render3d.kitchenVisual.sinkBowls, 2);

assert.equal(furniture("furn-1f-living-main-sofa-001").render3d.variantId, "lowCurvedSofa");
assert.equal(furniture("furn-living-fireplace-south-001").render3d.variantId, "dualNicheMediaWall");
assert.equal(furniture("furn-living-waterbar-001").render3d.variantId, "mirroredReferenceBuffetBase");

const bed = furniture("module-1f-bed-002");
assert.deepEqual(bed.dimensions, { width: 150, depth: 200, height: 95, unit: "cm" });
assert.notEqual(bed.render3d.showRug, true);
const valet = furniture("module-1f-wardrobe-001");
assert.deepEqual(valet.dimensions, { width: 70, depth: 45, height: 175, unit: "cm" });
assert.equal(valet.render3d.variantId, "boutiqueOpenValetRack");

for (const roomId of ["ROOM-1F-001", "ROOM-1F-002", "ROOM-1F-005", "ROOM-1F-006"]) {
  assert.equal(room(roomId).surfaceFinishes.floor.materialToken, "warmGreyStone");
  assert.equal(room(roomId).surfaceFinishes.wall.materialToken, "warmWhiteMineral");
}
assert.equal(room("ROOM-1F-004").surfaceFinishes.floor.materialToken, "oakFloor");
assert.equal(room("ROOM-1F-003").surfaceFinishes.floor.materialToken, "wetAreaTile");

const designerCameras = workspace.cameraViews.filter((view) => view.floor === "1F" && /^designer-camera-1f-\d{2}-/.test(view.id));
assert.equal(designerCameras.length, 10, "1F must retain the ten whole-floor designer viewpoints.");
assert.equal(byId(designerCameras, "designer-camera-1f-03-living-overview", "living overview").targetArea, "ROOM-1F-005");
assert.equal(byId(designerCameras, "designer-camera-1f-10-stair-public-route", "stair view").targetArea, "ROOM-1F-006");

const renderer = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
const kitchenRenderer = await readFile(new URL("../components/furniture-3d/kitchen-family-3d.tsx", import.meta.url), "utf8");
assert.match(renderer, /WallFinishZone3DLayer/);
assert.match(renderer, /LinearLightPath3DLayer/);
assert.match(kitchenRenderer, /countertopParts/);

console.log("1F final showroom checks passed: source-aligned shell, current furniture, canonical finishes and ten viewpoints are retained.");
