import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const workspace = JSON.parse(fs.readFileSync(new URL("data/default-workspace.json", root), "utf8"));
const backup = JSON.parse(fs.readFileSync(new URL("data/backups/default-workspace-20260802-before-b2-showroom-plan-b.json", root), "utf8"));
const structure = workspace.houseStructuresByFloor.B2;
const beforeStructure = backup.houseStructuresByFloor.B2;
const byId = (items, id) => items.find((item) => item.id === id);

const livingSideFireplaceColumn = byId(structure.columns, "COL-B2-001");
assert.deepEqual(livingSideFireplaceColumn.center, { x: 5750, y: 6200 });
assert.equal(livingSideFireplaceColumn.radius, 300);
assert.equal(livingSideFireplaceColumn.height, 2800);
assert.equal(livingSideFireplaceColumn.visualStyle, "concealedByFinish");
assert.match(livingSideFireplaceColumn.name, /客厅侧.*装饰壁炉/);

const stairSideRoundColumn = byId(structure.columns, "COL-B2-002");
assert.deepEqual(stairSideRoundColumn.center, { x: 4300, y: 5050 });
assert.equal(stairSideRoundColumn.radius, 360);
assert.equal(stairSideRoundColumn.supportsFloorId, "B1");
assert.equal(stairSideRoundColumn.visualStyle, "showroomLightStone");
assert.match(stairSideRoundColumn.name, /楼梯\/吧台侧圆角/);
assert.equal(stairSideRoundColumn.verificationMeta.status, "estimated");
assert.ok(stairSideRoundColumn.verificationMeta.toleranceMm >= 500);
assert.match(stairSideRoundColumn.verificationMeta.sourceNote, /无现场实测|无实测/);
assert.match(stairSideRoundColumn.verificationMeta.sourceNote, /2026-08-03/);

const fireplace = byId(workspace.furniture, "furn-b2-showroom-column-fireplace-001");
assert.equal(fireplace.render3d.variantId, "b2ShowroomColumnFireplace");
assert.deepEqual(fireplace.dimensions, { width: 135, depth: 75, height: 280, unit: "cm" });
assert.match(fireplace.note, /承重柱的装饰包覆/);
assert.match(fireplace.note, /收窄视觉体量/);
assert.match(fireplace.mepMeta.notes, /非燃烧|不按真火/);
assert.equal(fireplace.verificationMeta.status, "estimated");
assert.match(fireplace.verificationMeta.sourceNote, /1350×750mm/);
assert.match(fireplace.verificationMeta.sourceNote, /跟随COL-B2-001/);
assert.deepEqual(fireplace.position, { x: 5750 / 12000 * 100, y: 6200 / 9000 * 100, rotation: 0 });

const tvWall = byId(workspace.furniture, "furn-b2-living-tv-console-001");
assert.match(tvWall.material, /石材大板.*浅橡木.*阴影缝.*悬浮/);
assert.equal(tvWall.cabinetHeight.topClosureMm, 30);
assert.equal(tvWall.render3d.secondaryMaterial, "travertine");
assert.equal(tvWall.render3d.accentMaterial, "smokedGlass");

const wineCabinet = byId(workspace.furniture, "furn-b2-study-wine-cabinet-001");
assert.match(wineCabinet.material, /竖纹.*烟灰玻璃.*内收踢脚.*阴影/);
assert.equal(wineCabinet.cabinetHeight.topClosureMm, 30);

assert.equal(byId(workspace.furniture, "furn-b2-study-handwash-001"), undefined);
assert.equal(byId(workspace.drawingItems, "L-B2-SHOWROOM-BAR-COVE-01"), undefined);
assert.equal(workspace.drawingItems.some((item) => item.relatedFurnitureId === "furn-b2-study-handwash-001"), false);

assert.equal(byId(workspace.furniture, "furn-b2-study-slab-table-001"), undefined);
assert.equal(workspace.drawingItems.some((item) => item.relatedFurnitureId === "furn-b2-study-slab-table-001"), false);
assert.equal((workspace.lightingDesign?.scenes ?? []).some((scene) => (scene.groupStates ?? []).some((state) => state.controlGroupId === "CG-B2-B2-005-DESK")), false);
assert.equal(workspace.furniture.some((item) => item.floorId === "B2" && /棋牌|麻将|mahjong/i.test(`${item.name} ${item.catalogId ?? ""} ${item.render3d?.variantId ?? ""}`)), false);

for (const room of structure.rooms) {
  assert.equal(room.surfaceFinishes.floor.pattern, "showroomHerringboneStone");
  assert.equal(room.surfaceFinishes.floor.material, "stone");
}
assert.ok(byId(workspace.drawingItems, "C-B2-SHOWROOM-OVAL-01"));
const fireplaceWash = byId(workspace.drawingItems, "L-B2-SHOWROOM-FIREPLACE-WASH-01");
assert.deepEqual(fireplaceWash.positionMm, { x: 5750, y: 5800 });
assert.deepEqual(fireplaceWash.relatedFurniturePositionMm, { x: 5750, y: 6200 });
assert.ok(byId(workspace.drawingItems, "L-B2-SHOWROOM-TV-UNDERSIDE-01"));
assert.ok(byId(workspace.drawingItems, "L-B2-SHOWROOM-WINE-COVE-01"));
assert.equal(byId(workspace.drawingItems, "L-B2-SHOWROOM-TV-UNDERSIDE-01").mountingType, "cabinetIntegrated");
assert.equal(byId(workspace.drawingItems, "L-B2-SHOWROOM-WINE-COVE-01").lightingLayer, "cabinetStrip");
assert.equal(workspace.drawingPackage.drawingItemIds.includes("L-B2-SHOWROOM-TV-UNDERSIDE-01"), true);
assert.equal(workspace.drawingPackage.drawingItemIds.includes("L-B2-SHOWROOM-WINE-COVE-01"), true);
const showroomSwitch = byId(workspace.drawingItems, "SW-B2-SHOWROOM-ATMOSPHERE-01");
assert.equal(showroomSwitch.controlledLightIds.length, 4);
assert.equal(workspace.drawingPackage.drawingItemIds.includes(showroomSwitch.id), true);
const showroomScene = byId(workspace.lightingDesign.scenes, "SCENE-B2-SHOWROOM-ATMOSPHERE");
assert.equal(showroomScene.floorId, "B2");
assert.equal(showroomScene.groupStates.find((state) => state.controlGroupId === "CG-B2-SHOWROOM-ATMOSPHERE").brightness, 72);

for (const room of structure.rooms) {
  assert.equal(room.surfaceFinishes.wall.roughness, 0.88);
  assert.equal(room.surfaceFinishes.wall.textureScale, 1.25);
  assert.equal(room.surfaceFinishes.floor.textureScale, 4.2);
}

// Plan B adds one column and hard finishes, but must not mutate outer envelope,
// internal room geometry, stairs, openings, doors, windows or skylights.
for (const key of ["walls", "rooms", "stairs", "partitions", "doors", "windows", "bayWindows", "skylights"]) {
  const stripFinishes = (value) => JSON.parse(JSON.stringify(value, (property, nested) => property === "surfaceFinish" || property === "surfaceFinishes" ? undefined : nested));
  assert.deepEqual(stripFinishes(structure[key]), stripFinishes(beforeStructure[key]), `B2 ${key} geometry changed unexpectedly`);
}
// The apply script snapshots every non-B2 structure and all connected stair data
// before mutation, and refuses to write if any of them changed during its run.

const source = fs.readFileSync(new URL("components/floor-3d-view.tsx", root), "utf8");
const topViewSource = fs.readFileSync(new URL("components/furniture-top-view.tsx", root), "utf8");
assert.match(source, /b2ShowroomColumnFireplace/);
assert.match(source, /herringboneStone/);
assert.match(source, /showroomOvalFloatingCeiling/);
assert.match(source, /tv-stone-vertical-joint/);
assert.match(source, /wine-lower-door-gap/);
assert.match(topViewSource, /b2ShowroomColumnFireplace/);
assert.match(topViewSource, /b2StorageTvWall/);
assert.match(topViewSource, /b2WineStorageCabinet/);

console.log("B2 showroom expression v3 column-role swap, wall/ceiling/material/cabinet/light, removed sink-bar and no-sample-furniture checks passed.");
