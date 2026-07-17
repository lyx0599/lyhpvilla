import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { drawingWorkspaces, legacyDrawingEntryAudit, resolveDrawingWorkspace } from "../lib/drawing-workspaces.ts";
import { evaluateOutputDrawings, outputDrawingDefinitions } from "../lib/output-drawings.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
assert.deepEqual(drawingWorkspaces.map((item) => item.name), ["总平面", "空间布局", "拆改", "家具与设备", "水电与照明", "顶面与饰面"]);
assert.equal(drawingWorkspaces.length, 6);
const overview = drawingWorkspaces.find((item) => item.id === "overview");
assert.equal(overview?.mode, "sitePlan");
assert.equal(overview?.persistedSheet, "sitePlan");
assert.equal(overview?.visibleLayers.furnitureOverlay, true);
assert.equal(overview?.visibleLayers.semanticOverlay, false);
assert.equal(resolveDrawingWorkspace("overview").tabs, undefined);
assert.deepEqual(drawingWorkspaces.find((item) => item.id === "mep")?.tabs?.map((tab) => tab.name), ["插座", "开关", "灯光", "给水", "排水"]);
assert.deepEqual(drawingWorkspaces.find((item) => item.id === "finishes")?.tabs?.map((tab) => tab.name), ["吊顶", "地面", "墙面", "材料"]);
assert.equal(drawingWorkspaces.some((item) => item.id.includes("stair") || item.name === "楼梯图"), false);
assert.equal(drawingWorkspaces.flatMap((item) => item.views).every((view) => view.formalDrawing === false), true);
assert.equal(resolveDrawingWorkspace("mep", "lighting").persistedSheet, "lightingPlan");
assert.equal(legacyDrawingEntryAudit.flatMap((group) => group.entries).includes("楼梯图"), true);
assert.equal(outputDrawingDefinitions.length, 12);

const floorId = "1F";
const structure = workspace.houseStructuresByFloor[floorId];
const readiness = evaluateOutputDrawings({
  structure,
  furniture: workspace.furniture.filter((item) => item.floorId === floorId),
  drawingItems: workspace.drawingItems.filter((item) => item.floorId === floorId),
  stairSystems: workspace.stairSystems.filter((item) => item.lowerFloorId === floorId || item.upperFloorId === floorId),
  stairLandings: workspace.stairLandings.filter((item) => item.lowerFloorId === floorId || item.upperFloorId === floorId),
  stairOpenings: workspace.stairOpenings.filter((item) => item.floorId === floorId),
  errorCount: 0,
  warningCount: 0
});
const stairDetail = readiness.find((item) => item.id === "stair-detail");
assert.equal(stairDetail?.status, "incomplete");
assert.equal(stairDetail?.exportable, false);
for (const missing of ["楼梯剖面", "净高", "栏杆高度"]) assert.ok(stairDetail?.missing.includes(missing));
assert.ok(readiness.every((item) => item.status === "ready" || item.missing.length > 0));

console.log("Drawing workspace, view and output maturity checks passed.");
