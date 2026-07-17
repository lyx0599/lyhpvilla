import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { officialDrawingSheetTypes } from "../lib/drawing-sheets.ts";
import {
  drawing3DPresentationProfiles,
  drawing3DViewPresets,
  getDrawing3DPresentationProfile
} from "../lib/drawing-3d-profiles.ts";

assert.deepEqual(Object.keys(drawing3DPresentationProfiles), [...officialDrawingSheetTypes], "Every official drawing sheet must have exactly one 3D profile.");
for (const sheetType of officialDrawingSheetTypes) {
  const profile = getDrawing3DPresentationProfile(sheetType);
  assert.equal(profile.sheetType, sheetType);
  assert.ok(profile.label);
  assert.ok(profile.summary);
  assert.ok(drawing3DViewPresets.includes(profile.defaultPreset));
}

assert.equal(getDrawing3DPresentationProfile("structurePlan").defaultPreset, "cutawayEdit");
assert.equal(getDrawing3DPresentationProfile("structurePlan").furnitureMode, "hidden");
assert.equal(getDrawing3DPresentationProfile("sitePlan").furnitureMode, "all", "Overview must render all current furniture, not a major-object subset.");
assert.equal(getDrawing3DPresentationProfile("sitePlan").materialMode, "realistic", "Overview must use the same detailed material/model path as furniture 3D.");
assert.equal(getDrawing3DPresentationProfile("sitePlan").wallMode, "allTransparent", "Overview must reveal the interior through translucent interior and exterior walls without changing real wall geometry.");
assert.equal(getDrawing3DPresentationProfile("sitePlan").showRelationshipLines, false);
assert.equal(getDrawing3DPresentationProfile("sitePlan").showStructureIds, false);
assert.equal(getDrawing3DPresentationProfile("furniturePlan").defaultPreset, "birdseyeEdit");
assert.equal(getDrawing3DPresentationProfile("lightingPlan").defaultPreset, "interiorTour");
assert.equal(getDrawing3DPresentationProfile("lightingPlan").wallMode, "full");
assert.equal(getDrawing3DPresentationProfile("lightingPlan").showCeiling, true);
assert.equal(getDrawing3DPresentationProfile("lightingPlan").realTimeLighting, true);
assert.equal(getDrawing3DPresentationProfile("ceilingPlan").defaultPreset, "ceilingUp");
assert.equal(getDrawing3DPresentationProfile("ceilingPlan").showCeiling, true);
assert.equal(getDrawing3DPresentationProfile("wallFinishPlan").defaultPreset, "wallElevation");
assert.equal(getDrawing3DPresentationProfile("switchPlan").showRelationshipLines, true);

const floor3dSource = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
assert.match(floor3dSource, /data-drawing-sheet-type=/);
assert.match(floor3dSource, /DrawingItems3DLayer/);
assert.match(floor3dSource, /lightingSceneModeLabels/);
assert.doesNotMatch(floor3dSource, /onDrawingSheetTypeChange/, "3D must follow the selected workspace instead of exposing a professional switcher in its top bar.");
assert.doesNotMatch(floor3dSource, /3D 图纸专项/, "Professional drawing selection must stay in the workspace selector.");
assert.match(floor3dSource, /场景灯光预览/, "Scene-lighting controls must be named as a visual preview, not a drawing specialty.");
assert.match(floor3dSource, /data-testid="lighting-free-browse-minimap"/, "Lighting free browse must expose the draggable floor-plan minimap.");
assert.match(floor3dSource, /cameraMode === "orbit" && !activeCameraViewId/, "The lighting minimap must only appear in free browse.");
assert.match(floor3dSource, /navigationRequest\.targetX - controls\.target\.x/, "Dragging the minimap must translate the camera focus without changing its relative view.");
assert.doesNotMatch(floor3dSource, /threeDDrawingItems|drawingItems3D\s*=/, "3D must not create a separate drawing item store.");
assert.match(floor3dSource, /filterSceneFurniture/, "All 3D modes must resolve furniture through the unified scene visibility layer.");
assert.match(floor3dSource, /sceneLod=\{sceneVisibility\.lod\}/, "Current-floor views must keep a shared semantic asset while applying view-only LOD.");
assert.match(floor3dSource, /notifySelection && view\.fixedView/, "A selected fixed camera view must notify the shared workspace state.");

const spacePlannerSource = await readFile(new URL("../components/space-planner.tsx", import.meta.url), "utf8");
assert.match(spacePlannerSource, /view\.scope === "courtyard"/, "Courtyard camera views must be recognized as unified site overviews.");
assert.match(spacePlannerSource, /setSharedPlanCanvasMode\("sitePlan"\)/, "Opening the courtyard overview must activate the site-plan scene profile.");

console.log("Shared drawing 3D profile checks passed.");
