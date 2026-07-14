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
assert.match(floor3dSource, /onDrawingSheetTypeChange/);
assert.doesNotMatch(floor3dSource, /threeDDrawingItems|drawingItems3D\s*=/, "3D must not create a separate drawing item store.");

console.log("Shared drawing 3D profile checks passed.");
