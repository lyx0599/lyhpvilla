import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  modernWarmNaturalCanonicalTokens,
  modernWarmNaturalLegacyMaterialMappings,
  modernWarmNaturalLightingPolicy,
  modernWarmNaturalSceneKeys,
  modernWarmNaturalSceneId
} from "../lib/modern-warm-natural-system.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const structure = workspace.houseStructuresByFloor["2F"];
const furniture = workspace.furniture.filter((item) => item.floorId === "2F");
const lights = workspace.drawingItems.filter((item) => item.floorId === "2F" && item.category === "light");
const scenes = workspace.lightingDesign.scenes.filter((scene) => scene.floorId === "2F");
const canonical = new Set(modernWarmNaturalCanonicalTokens);

for (const roomId of ["ROOM-2F-002", "ROOM-2F-004", "ROOM-2F-005", "ROOM-2F-006", "ROOM-2F-007", "ROOM-2F-008"]) {
  const room = structure.rooms.find((candidate) => candidate.id === roomId);
  assert.equal(room.surfaceFinishes.floor.materialToken, "oakFloor", `${roomId} must use the shared dry-floor identity.`);
  assert.equal(room.surfaceFinishes.wall.materialToken, "warmWhiteMineral", `${roomId} must use the shared warm-ivory wall identity.`);
  assert.equal(room.surfaceFinishes.wall.materialResourceId, "showroomLimePlaster");
}
for (const roomId of ["ROOM-2F-001", "ROOM-2F-003"]) {
  const room = structure.rooms.find((candidate) => candidate.id === roomId);
  assert.equal(room.surfaceFinishes.floor.materialToken, "wetAreaTile");
  assert.equal(room.surfaceFinishes.floor.materialResourceId, "polyhavenWarmBeigeTile08");
  assert.equal(room.surfaceFinishes.wall.materialToken, "travertine");
  assert.equal(room.surfaceFinishes.wall.materialResourceId, "showroomWarmVeinedStone");
}

for (const item of furniture) {
  assert.equal(item.render3d?.stylePreset, "modernNatural", `${item.id} must consume the whole-house style.`);
  for (const key of ["primaryMaterial", "secondaryMaterial", "accentMaterial"]) {
    assert.ok(canonical.has(item.render3d?.[key]), `${item.id}.${key} must be canonical.`);
    assert.equal(Object.hasOwn(modernWarmNaturalLegacyMaterialMappings, item.render3d?.[key]), false, `${item.id}.${key} still writes a legacy token.`);
  }
  for (const token of Object.values(item.render3d?.cabinetMaterialOverrides ?? {})) assert.ok(canonical.has(token), `${item.id} cabinet override must be canonical.`);
}

const masterWardrobe = furniture.find((item) => item.id === "furn-2f-master-bedroom-large-wardrobe-001");
assert.deepEqual(masterWardrobe.dimensions, { width: 300, depth: 35, height: 275, unit: "cm" });
assert.equal(masterWardrobe.render3d.primaryMaterial, "darkWalnut");
assert.equal(masterWardrobe.render3d.secondaryMaterial, "oatTaupeLacquer");
assert.equal(masterWardrobe.render3d.secondaryMaterialResourceId, "showroomOatTaupeLacquer");
assert.equal(masterWardrobe.render3d.accentMaterial, "blackTitanium");
const desk = furniture.find((item) => item.id === "module-2f-window-desk");
assert.deepEqual(desk.dimensions, { width: 180, depth: 70, height: 74, unit: "cm" });
assert.deepEqual([desk.render3d.primaryMaterial, desk.render3d.secondaryMaterial, desk.render3d.accentMaterial], ["darkWalnut", "brushedBronze", "brushedBronze"]);

assert.deepEqual(scenes.map((scene) => scene.id), modernWarmNaturalSceneKeys.map((key) => modernWarmNaturalSceneId("2F", key)));
assert.ok(scenes.every((scene) => scene.groupStates.every((state) => state.controlGroupId.startsWith("CG-2F-"))), "2F scenes may only control 2F groups.");
for (const light of lights) {
  const expected = modernWarmNaturalLightingPolicy.fixtureExceptions[light.lightSpec?.fixtureFamily]
    ?? modernWarmNaturalLightingPolicy.colorTemperatureByLayer[light.lightingLayer];
  assert.equal(light.colorTemperature, expected, `${light.id} must use the shared temperature policy.`);
  const preciseTask = ["task", "cabinetStrip", "mirrorLight"].includes(light.lightingLayer);
  assert.ok((light.lightSpec?.cri ?? 0) >= (preciseTask ? 95 : 90), `${light.id} CRI is below contract.`);
}

const doors = structure.doors;
assert.equal(doors.find((door) => door.id === "D-2F-008").visual.leafCount, 2, "Master bedroom keeps the confirmed double door.");
assert.equal(doors.find((door) => door.id === "D-2F-002").visual.style, "openPassage", "Walk-in closet keeps the doorless opening metadata.");
assert.deepEqual(structure.outdoors.map((outdoor) => outdoor.id), ["OD-2F-BALCONY-01", "OD-2F-BALCONY-02"], "2F keeps two separately enclosed balconies.");
const cameras = workspace.cameraViews.filter((camera) => camera.floor === "2F" && Number.isInteger(camera.order) && camera.order >= 1 && camera.order <= 10).sort((a, b) => a.order - b.order);
assert.equal(cameras.length, 10);
assert.match(cameras[4].description, /飘窗不入镜/);
for (const [furnitureId, outdoorId] of [["furn-2f-balcony-01-cabinet", "OD-2F-BALCONY-01"], ["furn-2f-balcony-02-cabinet", "OD-2F-BALCONY-02"]]) {
  const item = furniture.find((candidate) => candidate.id === furnitureId);
  assert.equal(item.roomId, outdoorId);
  assert.equal(item.outdoorId, outdoorId);
}

console.log("2F shared visual contract v16 checks passed");
