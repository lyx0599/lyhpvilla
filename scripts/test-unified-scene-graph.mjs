import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildUnifiedSceneGraph,
  filterSceneDrawingItems,
  filterSceneFurniture,
  getUnifiedSceneConsistencySnapshot,
  resolveUnifiedSceneDetailLevel,
  resolveUnifiedSceneScope,
  resolveUnifiedSceneVisibility
} from "../lib/unified-scene-graph.ts";

const workspaceText = await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8");
const workspace = JSON.parse(workspaceText);
const graph = buildUnifiedSceneGraph({
  structuresByFloor: workspace.houseStructuresByFloor,
  furniture: workspace.furniture,
  drawingItems: workspace.drawingItems
});

assert.equal(graph.furniture, workspace.furniture, "The scene graph must retain the canonical furniture array.");
assert.equal(graph.drawingItems, workspace.drawingItems, "The scene graph must retain the canonical drawing-item array.");
assert.deepEqual(graph.duplicateObjectIds, [], "Unified scene object IDs must remain globally unique.");

const courtyardScope = resolveUnifiedSceneScope(graph, ["1F", "YARD"]);
const expectedCourtyardFurniture = workspace.furniture.filter((item) => item.floorId === "1F" || item.floorId === "YARD");
assert.equal(courtyardScope.furniture.length, expectedCourtyardFurniture.length);
courtyardScope.furniture.forEach((item) => {
  assert.equal(item, workspace.furniture.find((source) => source.id === item.id), `${item.id} must be the canonical source object, not an overview copy.`);
});

const overviewPolicy = resolveUnifiedSceneVisibility({
  mode: "overview3d",
  sheetType: "sitePlan",
  workspaceFurnitureMode: "major",
  workspaceDrawingCategories: []
});
const overviewFurniture = filterSceneFurniture({ furniture: workspace.furniture, policy: overviewPolicy });
const sourceVisibleFurniture = workspace.furniture.filter((item) => item.visible !== false && item.hidden !== true && item.render3d?.visibleIn3d !== false);
assert.deepEqual(overviewFurniture.map((item) => item.id), sourceVisibleFurniture.map((item) => item.id), "Overview must include every current visible furniture object, even when a legacy profile requests only major objects.");
assert.equal(overviewPolicy.showTechnicalMarkers, false);
assert.equal(overviewPolicy.showRelationshipLines, false);
assert.equal(overviewPolicy.showConstructionAnchors, false);
assert.equal(overviewPolicy.labelMode, "selectionOnly");

const physicalOverviewItems = filterSceneDrawingItems(workspace.drawingItems, overviewPolicy, "physical");
assert.deepEqual(overviewPolicy.physicalDrawingCategories, ["light", "ventilation"], "Overview may render physical light fixtures and air vents.");
assert.ok(physicalOverviewItems.every((item) => ["light", "ventilation"].includes(item.category)), "Overview may render physical fixtures but not professional point symbols.");
assert.equal(physicalOverviewItems.some((item) => ["switch", "socket", "waterSupply", "drainage"].includes(item.category)), false);

const socketPolicy = resolveUnifiedSceneVisibility({
  mode: "workspace3d",
  sheetType: "socketPlan",
  workspaceFurnitureMode: "relatedOnly",
  workspaceDrawingCategories: ["socket", "network"],
  workspaceShowsRelationshipLines: true
});
assert.equal(socketPolicy.showTechnicalMarkers, true, "Professional workspaces must retain their technical expression layer.");
assert.equal(socketPolicy.showRelationshipLines, true);
assert.equal(socketPolicy.showConstructionAnchors, true);

assert.equal(resolveUnifiedSceneDetailLevel("presentation", "source"), "presentation", "Current-floor overview must keep source detail.");
assert.equal(resolveUnifiedSceneDetailLevel("presentation", "balanced"), "standard", "Whole-building LOD may reduce tessellation.");
assert.equal(resolveUnifiedSceneDetailLevel("standard", "balanced"), "standard");
assert.equal(resolveUnifiedSceneDetailLevel("draft", "balanced"), "draft", "LOD must never substitute a different semantic asset.");

const firstFurniture = workspace.furniture[0];
const movedWorkspace = {
  ...workspace,
  furniture: workspace.furniture.map((item) => item.id === firstFurniture.id
    ? { ...item, position: { ...item.position, x: item.position.x + 1.25 }, dimensions: { ...item.dimensions, width: item.dimensions.width + 5 } }
    : item)
};
const movedGraph = buildUnifiedSceneGraph({
  structuresByFloor: movedWorkspace.houseStructuresByFloor,
  furniture: movedWorkspace.furniture,
  drawingItems: movedWorkspace.drawingItems
});
const movedOverview = filterSceneFurniture({ furniture: movedGraph.furniture, policy: overviewPolicy }).find((item) => item.id === firstFurniture.id);
assert.equal(movedOverview?.position.x, firstFurniture.position.x + 1.25, "Overview must reflect transform changes without a manual sync action.");
assert.equal(movedOverview?.dimensions.width, firstFurniture.dimensions.width + 5, "Overview must reflect dimension changes from canonical state.");

const deletedGraph = buildUnifiedSceneGraph({
  structuresByFloor: workspace.houseStructuresByFloor,
  furniture: workspace.furniture.filter((item) => item.id !== firstFurniture.id),
  drawingItems: workspace.drawingItems
});
assert.equal(filterSceneFurniture({ furniture: deletedGraph.furniture, policy: overviewPolicy }).some((item) => item.id === firstFurniture.id), false, "Deleted objects must not remain in overview.");

const reloadedWorkspace = JSON.parse(JSON.stringify(workspace));
const reloadedGraph = buildUnifiedSceneGraph({
  structuresByFloor: reloadedWorkspace.houseStructuresByFloor,
  furniture: reloadedWorkspace.furniture,
  drawingItems: reloadedWorkspace.drawingItems
});
assert.deepEqual(
  getUnifiedSceneConsistencySnapshot(reloadedGraph),
  getUnifiedSceneConsistencySnapshot(graph),
  "Save/reload must preserve IDs, transforms, dimensions, materials, assets and visibility."
);

console.log("Unified scene graph checks passed.");
