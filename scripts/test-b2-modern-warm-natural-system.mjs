import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  modernWarmNaturalCanonicalTokens,
  modernWarmNaturalLightingPolicy,
  modernWarmNaturalSceneKeys
} from "../lib/modern-warm-natural-system.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceArgIndex = process.argv.indexOf("--workspace");
if (workspaceArgIndex >= 0 && !process.argv[workspaceArgIndex + 1]) throw new Error("--workspace requires a file path");
const workspacePath = workspaceArgIndex >= 0
  ? path.resolve(process.argv[workspaceArgIndex + 1])
  : path.join(root, "data/default-workspace.json");
const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const floor3DSource = fs.readFileSync(path.join(root, "components/floor-3d-view.tsx"), "utf8");
const canonical = new Set(modernWarmNaturalCanonicalTokens);
const b2Furniture = workspace.furniture.filter((item) => item.floorId === "B2");

const requiredIds = [
  "furn-b2-living-tv-console-001",
  "furn-b2-living-large-tv-001",
  "furn-b2-living-long-sofa-001",
  "furn-b2-entry-slim-foyer-cabinet-001",
  "furn-b2-entry-left-wall-foyer-001",
  "furn-b2-activity-outdoor-pegboard-001",
  "furn-b2-study-souvenir-cabinet-001",
  "furn-b2-study-slab-table-001",
  "furn-b2-under-stair-room-shell-001",
  "furn-b2-under-stair-shelf-001",
  "furn-b2-under-stair-shelf-002",
  "furn-b2-under-stair-shelf-003",
  "furn-b2-living-coffee-table-001",
  "furn-b2-study-wine-cabinet-001",
  "furn-b2-study-handwash-001"
];

for (const id of requiredIds) {
  const item = b2Furniture.find((candidate) => candidate.id === id);
  assert.ok(item, `${id} must exist`);
  assert.equal(item.render3d?.stylePreset, "modernNatural", `${id} must use the shared modern-natural preset`);
  assert.equal(item.render3d?.detailLevel, "presentation", `${id} must render at presentation detail`);
  assert.equal(item.render3d?.styleLocked, true, `${id} must preserve the approved B2 design`);
  for (const key of ["primaryMaterial", "secondaryMaterial", "accentMaterial"]) {
    assert.ok(canonical.has(item.render3d?.[key]), `${id}.${key} must use a canonical whole-house material token`);
  }
}

const sofa = b2Furniture.find((item) => item.id === "furn-b2-living-long-sofa-001");
assert.equal(sofa.render3d.primaryMaterial, "blackTopGrainLeather");
assert.equal(sofa.render3d.variantId, "b2FourSeatLeather");
const wine = b2Furniture.find((item) => item.id === "furn-b2-study-wine-cabinet-001");
assert.equal(wine.render3d.variantId, "b2CurvedCornerWineCabinet");
assert.equal(wine.render3d.cabinetMaterialOverrides.glass, "smokedGlass");
const foyer = b2Furniture.find((item) => item.id === "furn-b2-entry-slim-foyer-cabinet-001");
const foyerLeft = b2Furniture.find((item) => item.id === "furn-b2-entry-left-wall-foyer-001");
assert.equal(foyer.render3d.variantId, "b2OpenFoyerRack");
assert.equal(foyerLeft.render3d.variantId, "b2LeftWallFoyerRun");
const memorial = b2Furniture.find((item) => item.id === "furn-b2-study-souvenir-cabinet-001");
assert.equal(memorial.hostWallId, "W-B2-008", "the memorial cabinet must bind the existing west wall, never removed W-B2-009");
assert.equal(JSON.stringify(memorial).includes("W-B2-009"), false, "removed wall W-B2-009 must not survive in memorial cabinet notes or construction metadata");

for (const room of workspace.houseStructuresByFloor.B2.rooms) {
  assert.equal(room.surfaceFinishes?.floor?.materialToken, "warmGreyStone", `${room.id} floor must share the warm-grey stone identity`);
  assert.equal(room.surfaceFinishes?.wall?.materialToken, "warmWhiteMineral", `${room.id} wall must share the warm-white mineral identity`);
}

const b2Lights = workspace.drawingItems.filter((item) => item.floorId === "B2" && item.category === "light");
for (const light of b2Lights) {
  const expected = modernWarmNaturalLightingPolicy.fixtureExceptions[light.lightSpec?.fixtureFamily]
    ?? modernWarmNaturalLightingPolicy.colorTemperatureByLayer[light.lightingLayer];
  assert.equal(light.colorTemperature, expected, `${light.id} color temperature must follow the shared layer policy`);
  assert.equal(light.lightColorTemperature, expected, `${light.id} duplicate color-temperature field must stay synchronized`);
}

const b2Groups = new Set(b2Lights.map((light) => light.controlGroupId).filter(Boolean));
const b2Scenes = workspace.lightingDesign.scenes.filter((scene) => scene.floorId === "B2");
assert.deepEqual(
  new Set(b2Scenes.map((scene) => scene.id)),
  new Set(modernWarmNaturalSceneKeys.map((key) => `SCENE-MWN-V1-B2-${key.toUpperCase()}`)),
  "B2 must expose exactly the five shared whole-house scene categories"
);
for (const scene of b2Scenes) {
  for (const state of scene.groupStates) assert.ok(b2Groups.has(state.controlGroupId), `${scene.id} must not reference another floor's control group`);
}
const activity = b2Scenes.find((scene) => scene.id.endsWith("-ACTIVITY"));
const night = b2Scenes.find((scene) => scene.id.endsWith("-NIGHT"));
const peak = (scene) => Math.max(...scene.groupStates.map((state) => state.brightness));
assert.ok(peak(activity) > peak(night), "B2 gathering/activity must be brighter than the movie/night scene");
assert.equal(
  workspace.roomTourViews.find((view) => view.id === "lighting-view-b2-relax")?.recommendedLightingSceneId,
  "SCENE-MWN-V1-B2-NIGHT"
);

for (const variantId of [
  "b2CurvedCornerWineCabinet",
  "b2StorageTvWall",
  "b2MiniWaterBar",
  "b2FourSeatLeather",
  "b2ModernNestedCoffeeTable",
  "b2GrandSlabDining",
  "b2OpenFoyerRack",
  "b2LeftWallFoyerRun",
  "b2UnderStairRoomShell",
  "b2MemorialLegoDisplay"
]) assert.ok(floor3DSource.includes(`variantId === "${variantId}"`) || floor3DSource.includes(`"${variantId}"].includes`), `${variantId} must remain a dedicated B2 geometry`);

for (const token of ["blackTopGrainLeather", "darkWalnut", "warmOak", "travertine", "smokedGlass", "clearGlass", "brushedBronze", "blackTitanium", "warmWhiteMineral"]) {
  assert.ok(floor3DSource.includes(`materialToken="${token}"`) || floor3DSource.includes(`token="${token}"`), `B2 custom geometry must consume ${token} through PBR`);
}

console.log(`B2 modern-warm-natural tests passed: ${requiredIds.length} furniture items, ${b2Lights.length} lights, ${b2Scenes.length} scenes.`);
