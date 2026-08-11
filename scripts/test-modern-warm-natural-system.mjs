import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  MODERN_WARM_NATURAL_SYSTEM_ID,
  createModernWarmNaturalFloorScenes,
  modernWarmNaturalCanonicalTokens,
  modernWarmNaturalFloorProfiles,
  modernWarmNaturalLegacyMaterialMappings,
  modernWarmNaturalLightingPolicy,
  modernWarmNaturalNativePbrTokens,
  modernWarmNaturalSceneId,
  modernWarmNaturalSceneKeys,
  modernWarmNaturalShowroomCalibration
} from "../lib/modern-warm-natural-system.ts";
import { pbrMaterialCatalog, resolvePbrMaterialToken } from "../lib/material-system.ts";
import { render3DMaterialTokenCatalog } from "../lib/render3d-assets.ts";
import { showroomMaterialResources } from "../lib/showroom-material-resources.ts";
import { modernWarmFixtureFamilies } from "../lib/lighting-design.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
assert.equal(MODERN_WARM_NATURAL_SYSTEM_ID, "modern-warm-natural-v1");
assert.equal(new Set(modernWarmNaturalCanonicalTokens).size, modernWarmNaturalCanonicalTokens.length);
for (const token of modernWarmNaturalCanonicalTokens) assert.ok(pbrMaterialCatalog[token], `${token} must be canonical.`);
for (const [token, resourceId] of Object.entries(modernWarmNaturalShowroomCalibration)) {
  assert.ok(pbrMaterialCatalog[token], `${token} calibration must target a canonical token.`);
  assert.ok(showroomMaterialResources[resourceId], `${resourceId} calibration resource must exist.`);
}
assert.deepEqual(modernWarmNaturalLegacyMaterialMappings, {
  smokedWalnut: "darkWalnut",
  champagneBronze: "brushedBronze",
  smokedOatTaupe: "oatTaupeLacquer",
  darkBronze: "blackTitanium",
  warmTaupeLeather: "brushedBronze"
});
for (const token of modernWarmNaturalNativePbrTokens) assert.ok(pbrMaterialCatalog[token], `${token} must use native canonical PBR.`);
for (const [legacy, canonical] of Object.entries(modernWarmNaturalLegacyMaterialMappings)) {
  assert.equal(resolvePbrMaterialToken(legacy), canonical, `${legacy} must resolve to ${canonical}.`);
}
assert.equal(render3DMaterialTokenCatalog.smokedOatTaupe.pbrToken, "oatTaupeLacquer");

for (const [floorId, profile] of Object.entries(modernWarmNaturalFloorProfiles)) {
  for (const token of Object.keys(profile.materialBalance)) assert.ok(modernWarmNaturalCanonicalTokens.includes(token), `${floorId} may not introduce ${token}.`);
  assert.deepEqual(Object.keys(profile.sceneBrightness), [...modernWarmNaturalSceneKeys]);
}
assert.deepEqual(modernWarmNaturalLightingPolicy.layers, ["ambient", "task", "accent", "decorative", "cabinetStrip", "mirrorLight", "outdoor"]);
assert.equal(modernWarmNaturalLightingPolicy.colorTemperatureByLayer.ambient, "3000K");
assert.equal(modernWarmNaturalLightingPolicy.colorTemperatureByLayer.task, "3000K");
assert.equal(modernWarmNaturalLightingPolicy.colorTemperatureByLayer.accent, "2700K");
assert.equal(modernWarmFixtureFamilies.find((family) => family.id === "wide-downlight")?.defaultColorTemperature, "3000K");
assert.equal(modernWarmFixtureFamilies.find((family) => family.id === "deep-cup-downlight")?.defaultColorTemperature, "3000K");
assert.deepEqual(modernWarmNaturalFloorProfiles["2F"].materialBalance, {
  warmWhiteMineral: 42,
  warmOak: 7,
  oakFloor: 24,
  beigeFabric: 14,
  darkWalnut: 9,
  travertine: 2,
  warmGreyStone: 2
});
assert.equal(Object.values(modernWarmNaturalFloorProfiles["2F"].materialBalance).reduce((sum, value) => sum + value, 0), 100);
assert.deepEqual(modernWarmNaturalFloorProfiles["2F"].sceneBrightness.daily, {
  ambient: 64, task: 72, accent: 42, decorative: 38, cabinetStrip: 55, mirrorLight: 70, outdoor: 20
});
assert.deepEqual(modernWarmNaturalFloorProfiles["2F"].sceneBrightness.activity, {
  ambient: 42, task: 45, accent: 50, decorative: 58, cabinetStrip: 52, mirrorLight: 45, outdoor: 15
});

const oneFScenes = workspace.lightingDesign.scenes.filter((scene) => scene.floorId === "1F");
assert.deepEqual(oneFScenes.map((scene) => scene.id), modernWarmNaturalSceneKeys.map((key) => modernWarmNaturalSceneId("1F", key)));
assert.ok(oneFScenes.every((scene) => scene.groupStates.every((state) => state.controlGroupId.startsWith("CG-1F-"))), "1F scenes may not reference another floor.");
assert.deepEqual(
  createModernWarmNaturalFloorScenes(workspace.drawingItems, "1F").map((scene) => scene.id),
  oneFScenes.map((scene) => scene.id)
);

const oneFRooms = workspace.houseStructuresByFloor["1F"].rooms;
for (const roomId of ["ROOM-1F-001", "ROOM-1F-002", "ROOM-1F-005", "ROOM-1F-006"]) {
  const room = oneFRooms.find((candidate) => candidate.id === roomId);
  assert.equal(room.surfaceFinishes.floor.materialToken, "warmGreyStone");
  assert.equal(room.surfaceFinishes.wall.materialToken, "warmWhiteMineral");
}
assert.equal(oneFRooms.find((room) => room.id === "ROOM-1F-004").surfaceFinishes.wall.materialToken, "warmWhiteMineral");
assert.equal(oneFRooms.find((room) => room.id === "ROOM-1F-003").surfaceFinishes.floor.materialToken, "wetAreaTile");

const bedroomCamera = workspace.cameraViews.find((camera) => camera.id === "designer-camera-1f-09-bedroom");
assert.match(bedroomCamera.description, /南墙中央1200mm飘窗/);
assert.match(bedroomCamera.description, /禁止在西墙新增窗户/);
assert.ok(workspace.furniture.filter((item) => item.floorId === "1F" && item.render3d).every((item) => item.render3d.stylePreset === "modernNatural"));
assert.ok(workspace.roomTourViews.filter((view) => view.floorId === "1F" && view.recommendedLightingSceneId).every((view) => workspace.lightingDesign.scenes.some((scene) => scene.id === view.recommendedLightingSceneId)), "1F lighting views must bind existing canonical scenes.");

console.log("modern-warm-natural-v1 shared system checks passed");
