import assert from "node:assert/strict";
import {
  drawingSheetTypeLabels,
  legacyPlanSheetModeAliases,
  normalizeDrawingSheetType,
  normalizePlanCanvasMode,
  officialDrawingSheetTypes,
  planCanvasModeLabels
} from "../lib/drawing-sheets.ts";

const expectedDrawingTypes = [
  "sitePlan",
  "structurePlan",
  "demolitionAndBuildPlan",
  "furniturePlan",
  "socketPlan",
  "switchPlan",
  "lightingPlan",
  "waterSupplyPlan",
  "drainagePlan",
  "ceilingPlan",
  "floorFinishPlan",
  "wallFinishPlan",
  "materialPlan",
  "annotationPlan"
];

assert.deepEqual(officialDrawingSheetTypes, expectedDrawingTypes);

assert.equal(normalizeDrawingSheetType("site"), "sitePlan");
assert.equal(normalizeDrawingSheetType("structure"), "structurePlan");
assert.equal(normalizeDrawingSheetType("construction"), "demolitionAndBuildPlan");
assert.equal(normalizeDrawingSheetType("furnishing"), "furniturePlan");
assert.equal(normalizeDrawingSheetType("water"), "waterSupplyPlan");
assert.equal(normalizeDrawingSheetType("drainage"), "drainagePlan");
assert.equal(normalizeDrawingSheetType("flooring"), "floorFinishPlan");
assert.equal(normalizeDrawingSheetType("sync"), null);
assert.equal(normalizeDrawingSheetType("preview"), null);

assert.equal(normalizePlanCanvasMode("sync"), "structureSyncCheck");
assert.equal(normalizePlanCanvasMode("preview"), "presentationView");
assert.equal(normalizePlanCanvasMode("water"), "waterSupplyPlan");
assert.equal(normalizePlanCanvasMode("drainage"), "drainagePlan");

for (const drawingType of officialDrawingSheetTypes) {
  assert.equal(normalizeDrawingSheetType(drawingType), drawingType);
  assert.ok(drawingSheetTypeLabels[drawingType], `${drawingType} must have a drawing label.`);
  assert.ok(planCanvasModeLabels[drawingType], `${drawingType} must have a canvas label.`);
}

for (const [legacyKey, canvasMode] of Object.entries(legacyPlanSheetModeAliases)) {
  assert.equal(normalizePlanCanvasMode(legacyKey), canvasMode);
}

assert.equal(drawingSheetTypeLabels.waterSupplyPlan, "给水点位图");
assert.equal(drawingSheetTypeLabels.drainagePlan, "排水点位图");
assert.equal(planCanvasModeLabels.structureSyncCheck, "结构联动检查");
assert.equal(planCanvasModeLabels.presentationView, "展示视图");

console.log("Drawing sheet naming checks passed.");
