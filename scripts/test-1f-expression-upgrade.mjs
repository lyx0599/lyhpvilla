import assert from "node:assert/strict";
import fs from "node:fs";

const workspace = JSON.parse(fs.readFileSync(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const structure = workspace.houseStructuresByFloor["1F"];
const byId = (items, id, label) => {
  const value = items.find((item) => item.id === id);
  assert.ok(value, `Missing ${label}: ${id}`);
  return value;
};
const room = (id) => byId(structure.rooms, id, "room");
const wall = (id) => byId(structure.walls, id, "wall");
const furniture = (id) => byId(workspace.furniture, id, "furniture");
const drawing = (id) => byId(workspace.drawingItems, id, "drawing item");
const tour = (id) => byId(workspace.roomTourViews, id, "room tour view");

assert.equal(workspace.dataRevision, "2026-08-03-unified-pbr-material-language-v1");
assert.ok(workspace.revision >= 12);
assert.ok(!structure.windows.some((item) => item.hostId === "W-1F-011"), "The middle-unit east living wall must remain solid");
assert.deepEqual(furniture("module-1f-table-001").position, { x: 65.41666666666667, y: 70.55555555555556, rotation: 0 });
assert.deepEqual(furniture("module-1f-table-001").dimensions, { width: 180, depth: 180, height: 75, unit: "cm" });
assert.equal(workspace.furniture.some((item) => item.id === "furn-kitchen-entry-island-001"), false);

for (const roomId of ["ROOM-1F-001", "ROOM-1F-002", "ROOM-1F-005", "ROOM-1F-006"]) {
  const finish = room(roomId).surfaceFinishes.floor;
  assert.equal(finish.pattern, "showroomHerringboneStone");
  assert.equal(finish.materialResourceId, "showroomPaleHerringbone");
}
for (const wallId of ["W-1F-003", "W-1F-009", "W-1F-011"]) {
  assert.equal(wall(wallId).surfaceFinish.materialResourceId, "showroomWarmOakVertical");
}
for (const id of ["WFIN-1F-ENTRY-WEST-02", "WFIN-1F-SERVICE-SOUTH-02", "WFIN-1F-LIVING-EAST-02"]) {
  const item = drawing(id);
  assert.equal(item.wallFinishZone.materialResourceId, "showroomWarmOakVertical");
  assert.equal(item.wallFinishZone.seamWidthMm, 8);
  assert.ok(workspace.drawingPackage.drawingItemIds.includes(id));
}

for (const id of ["furn-kitchen-run-001", "furn-kitchen-u-left-run", "furn-kitchen-u-right-run"]) {
  const item = furniture(id);
  assert.equal(item.render3d.primaryMaterial, "showroomOatTaupe");
  assert.equal(item.render3d.secondaryMaterial, "showroomVeinedStone");
  assert.equal(item.render3d.kitchenVisual.frontStyle, "slab");
  assert.equal(item.render3d.kitchenVisual.panelGapMm, 2);
}
assert.deepEqual(furniture("furn-kitchen-run-001").render3d.kitchenVisual.countertopCutouts, [{ kind: "sink", offsetMm: -10, widthMm: 820, depthMm: 500, cornerRadiusMm: 18 }]);
assert.deepEqual(furniture("furn-kitchen-u-left-run").render3d.kitchenVisual.countertopCutouts, [{ kind: "cooktop", offsetMm: 144, widthMm: 920, depthMm: 510, cornerRadiusMm: 12 }]);
assert.equal(furniture("furn-sink-001").render3d.kitchenVisual.sinkBowls, 1);
assert.equal(furniture("furn-kitchen-corner-spice-rack-001").render3d.variantId, "1fIntegratedSpiceRack");
assert.equal(furniture("furn-fridge-001").position.x, 7330 / 120);

assert.equal(furniture("furn-bath-vanity-001").dimensions.width, 70);
assert.equal(furniture("furn-bath-toilet-001").dimensions.width, 65);
assert.equal(furniture("module-1f-bed-002").position.x, 1950 / 120);
assert.equal(furniture("module-1f-bed-002").render3d.showRug, false);
assert.equal(furniture("furn-1f-bedroom-headboard-panel-001").render3d.bedVisual.panelCount, 6);
assert.equal(furniture("furn-living-waterbar-001").dimensions.depth, 45);
assert.equal(furniture("furn-living-waterbar-001").render3d.primaryMaterialResourceId, "showroomBurlAmber");
assert.ok(!workspace.furniture.some((item) => item.floorId === "1F" && /地毯|地垫|rug|carpet/i.test(`${item.name} ${item.material} ${item.catalogId ?? ""}`)));

for (const stair of structure.stairs) {
  assert.equal(stair.width, 950);
  assert.equal(stair.visual.style, "showroomLightStone");
  assert.equal(stair.visual.glassGuard, true);
}
for (const id of ["L-1F-SHOWROOM-LIVING-COVE-01", "L-1F-SHOWROOM-BEDROOM-COVE-01", "L-1F-V1-07", "L-1F-V1-08", "L-1F-V1-09"]) {
  assert.ok(drawing(id).linearLightPath.pathMm.length >= 2, `${id} should own a reusable linear-light path`);
}
assert.ok(drawing("C-1F-LIVING-PERIMETER-N").coveProfile.pathMm.length >= 4);
assert.ok(drawing("C-1F-BEDROOM-PERIMETER-N").coveProfile.pathMm.length >= 4);

assert.equal(tour("tour-1F-ROOM-1F-002").compositionMode, "authored");
assert.deepEqual(tour("tour-1F-ROOM-1F-002").cameraPosition, { x: 0.78, y: 2.3, z: -1.92 });
assert.equal(tour("tour-1F-ROOM-1F-002").clearSelectionOnActivate, true);
assert.deepEqual(tour("tour-1F-ROOM-1F-002").linkedNodeIds, ["tour-1F-KITCHEN-WORKTOP-001"]);
assert.equal(tour("tour-1F-KITCHEN-WORKTOP-001").type, "viewpoint");
assert.equal(tour("tour-1F-KITCHEN-WORKTOP-001").compositionMode, "authored");
assert.equal(tour("tour-1F-KITCHEN-WORKTOP-001").clearSelectionOnActivate, true);
assert.equal(tour("tour-1F-ROOM-1F-005").compositionMode, "authored");
assert.equal(tour("tour-1F-ROOM-1F-004").compositionMode, "authored");

const materialSource = fs.readFileSync(new URL("../lib/showroom-material-resources.ts", import.meta.url), "utf8");
const floor3dSource = fs.readFileSync(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
const kitchen3dSource = fs.readFileSync(new URL("../components/furniture-3d/kitchen-family-3d.tsx", import.meta.url), "utf8");
const planSource = fs.readFileSync(new URL("../components/plan-canvas.tsx", import.meta.url), "utf8");
assert.match(materialSource, /license: "project-authored"/);
assert.match(floor3dSource, /function WallFinishZone3DLayer/);
assert.match(floor3dSource, /function CoveProfile3DLayer/);
assert.match(floor3dSource, /function LinearLightPath3DLayer/);
assert.match(floor3dSource, /getHostedOpeningCuts\(structure, wall\.id, "wall"/);
assert.doesNotMatch(floor3dSource, /kitchenVisual\?\.frontStyle === "slab"\) return <FurnitureBlock/);
assert.match(kitchen3dSource, /countertopParts/);
assert.match(planSource, /parameterPath/);
assert.doesNotMatch(JSON.stringify({ furniture: workspace.furniture.filter((item) => item.floorId === "1F"), drawingItems: workspace.drawingItems.filter((item) => item.floorId === "1F") }), /洗手池和酒柜细节|洗手池.*MOV/);

console.log("1F expression upgrade checks passed: protected geometry retained, reusable detail systems active, kitchen openings visible and excluded washbasin video absent.");
