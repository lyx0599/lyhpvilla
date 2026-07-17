import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEFAULT_CABINET_TOP_CLOSURE_MM,
  getFurnitureBoundsMm,
  getWallRenderPolicy,
  inferCabinetHeightKind,
  resolveStructureStoryHeightMm,
  synchronizeFurnitureHeight,
  validateSceneHeightSystem
} from "../lib/scene-height-system.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const rendererSource = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
const plannerSource = await readFile(new URL("../components/space-planner.tsx", import.meta.url), "utf8");
const structure = workspace.houseStructuresByFloor["1F"];
assert.equal(resolveStructureStoryHeightMm(structure), 2800, "Dominant real wall height should resolve the legacy storey height.");

const fullHeightCandidate = workspace.furniture.find((item) => inferCabinetHeightKind(item) === "fullHeight" && item.floorId === "1F");
assert.ok(fullHeightCandidate, "Workspace should contain a full-height cabinet candidate.");
const synchronized = synchronizeFurnitureHeight(fullHeightCandidate, structure);
assert.equal(synchronized.cabinetHeight.kind, "fullHeight");
assert.equal(synchronized.cabinetHeight.topClosureMm, DEFAULT_CABINET_TOP_CLOSURE_MM);
assert.equal(synchronized.dimensions.height * 10 + (synchronized.render3d?.elevationMm ?? 0), 2800 - DEFAULT_CABINET_TOP_CLOSURE_MM);

const baseBounds = getFurnitureBoundsMm(synchronized, "workspace3d", "full");
for (const mode of ["full", "cutaway", "exteriorHidden", "exteriorTransparent"]) {
  assert.deepEqual(getFurnitureBoundsMm(synchronized, "overview3d", mode), baseBounds, `${mode} must not alter furniture bounds.`);
}

const wall = structure.walls.find((item) => item.barrierType !== "railing");
assert.ok(wall);
for (const mode of ["full", "cutaway", "exteriorHidden", "exteriorTransparent"]) {
  assert.equal(getWallRenderPolicy(wall, structure, mode).sourceHeightMm, wall.height, `${mode} must preserve wall geometry height.`);
}
assert.equal(getWallRenderPolicy(wall, structure, "cutaway").clipHeightMm, 1176, "Cutaway height must be a view-only ratio of storey height.");

const normalizedFurniture = workspace.furniture.map((item) => {
  const itemStructure = workspace.houseStructuresByFloor[item.floorId] ?? structure;
  return synchronizeFurnitureHeight(item, itemStructure);
});
const invariantFailures = Object.values(workspace.houseStructuresByFloor).flatMap((floorStructure) =>
  validateSceneHeightSystem(floorStructure, normalizedFurniture).filter((finding) => finding.ruleId === "FURNITURE_SCENE_BOUNDS" || finding.ruleId === "WALL_MODE_FURNITURE_INVARIANCE" || finding.ruleId === "FULL_HEIGHT_CABINET_CEILING" || finding.ruleId === "CABINET_CEILING_PENETRATION")
);
assert.deepEqual(invariantFailures, [], "Normalized project state must pass ceiling and cross-view bounds checks.");

assert.doesNotMatch(rendererSource, /WALL_PREVIEW_HEIGHT_MM|WALL_SELECTED_HEIGHT_MM|CUTAWAY_OBJECT_MAX_HEIGHT|getFurnitureCutawayHeight|getFurnitureVisualHeight|getFurnitureVisualElevation/);
assert.match(rendererSource, /localClippingEnabled = true/, "Wall cutaway must use renderer clipping.");
assert.match(rendererSource, /clippingPlanes=\{clippingPlanes \?\? null\}/, "Materials without a wall cut plane must retain Three.js's null clipping default.");
assert.match(rendererSource, /const explorationWallDisplayMode: Drawing3DWallMode = "full"/, "Exploration must keep walls at their real full height.");
assert.match(plannerSource, /furnitureHeightMode: "actual"/, "All shared 3D scenes must use actual furniture dimensions.");
assert.match(plannerSource, /validateSceneHeightSystem/, "Automatic height validation must be connected to project findings.");

console.log("Scene height system checks passed.");
