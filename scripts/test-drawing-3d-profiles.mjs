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
assert.match(floor3dSource, /灯具实体近看/, "Scene-lighting controls must expose a physical-fixture close-up, not a drawing specialty.");
assert.match(floor3dSource, /灯具盘点/, "Room lighting must expose a dedicated oblique inventory view.");
assert.match(floor3dSource, /selected-light-location-beacon/, "A selected light must receive an unmistakable 3D location beacon.");
assert.match(floor3dSource, /toggleLightingItem/, "Lighting experience must support individual fixture switching.");
assert.match(floor3dSource, /已开 \{selectedLightingSpace\.enabledLightCount\} \/ \{selectedLightingSpace\.totalLightCount\} 盏/, "Room view must show enabled and total fixture counts together.");
assert.match(floor3dSource, /data-testid="lighting-blackout-overlay"/, "Night mode with every scoped fixture off must render a perceptible blackout state.");
assert.match(floor3dSource, /lightingSummary\.enabledLights === 0/, "The blackout state must derive from the shared per-light runtime state.");
assert.doesNotMatch(floor3dSource, /lighting-free-browse-minimap/, "Lighting free browse must use the shared canvas controls instead of a duplicate minimap.");
assert.doesNotMatch(floor3dSource, /threeDDrawingItems|drawingItems3D\s*=/, "3D must not create a separate drawing item store.");
assert.match(floor3dSource, /filterSceneFurniture/, "All 3D modes must resolve furniture through the unified scene visibility layer.");
assert.match(floor3dSource, /sceneLod=\{presentationMode \? sceneVisibility\.lod : "balanced"\}/, "Current-floor views must keep a shared semantic asset while applying presentation-only LOD.");
assert.match(floor3dSource, /notifySelection && view\.fixedView/, "A selected fixed camera view must notify the shared workspace state.");

const spacePlannerSource = await readFile(new URL("../components/space-planner.tsx", import.meta.url), "utf8");
const objectListSource = await readFile(new URL("../components/editor/unified-object-list.tsx", import.meta.url), "utf8");
assert.match(spacePlannerSource, /view\.scope === "courtyard"/, "Courtyard camera views must be recognized as unified site overviews.");
assert.match(spacePlannerSource, /setSharedPlanCanvasMode\("sitePlan"\)/, "Opening the courtyard overview must activate the site-plan scene profile.");
assert.match(spacePlannerSource, /action: "locate"/, "Selecting a light in the object list must send a 3D locate request.");
assert.match(spacePlannerSource, /action: "toggle"/, "The object list must send an individual light toggle request.");
assert.match(objectListSource, /灯光开关/, "Every light row in the unified object list must expose a direct on/off control.");

console.log("Shared drawing 3D profile checks passed.");
