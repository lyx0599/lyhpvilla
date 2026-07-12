import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COURTYARD_CAMERA_VIEW_IDS, createUnifiedCourtyardModel } from "../lib/courtyard-model.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const cameraIds = new Set(workspace.cameraViews.map((view) => view.id));
for (const id of Object.values(COURTYARD_CAMERA_VIEW_IDS)) assert.ok(cameraIds.has(id), `missing courtyard camera view ${id}`);

const input = {
  oneFloorStructure: workspace.houseStructuresByFloor["1F"],
  yardStructure: workspace.houseStructuresByFloor.YARD,
  furniture: workspace.furniture
};
const oneFloorEntryModel = createUnifiedCourtyardModel(input);
const yardEntryModel = createUnifiedCourtyardModel(input);
const project = (model) => ({
  surfaces: model.houseStructure.outdoorSurfaces.map(({ id, polygon, material }) => ({ id, polygon, material })),
  fences: model.houseStructure.fences.map(({ id, start, end, material }) => ({ id, start, end, material })),
  outdoors: model.houseStructure.outdoors.map(({ id, polygon }) => ({ id, polygon })),
  furniture: model.furniture.map(({ id, position, dimensions, material }) => ({ id, position, dimensions, material }))
});

assert.deepEqual(project(oneFloorEntryModel), project(yardEntryModel), "1F and YARD entries must render the same courtyard objects.");
assert.deepEqual(oneFloorEntryModel.houseStructure.outdoorSurfaces, workspace.houseStructuresByFloor.YARD.outdoorSurfaces);
assert.deepEqual(oneFloorEntryModel.houseStructure.fences, workspace.houseStructuresByFloor.YARD.fences);
assert.equal(new Set(oneFloorEntryModel.houseStructure.outdoorSurfaces.map((item) => item.id)).size, oneFloorEntryModel.houseStructure.outdoorSurfaces.length);

console.log("Unified courtyard model checks passed.");
