import { readFile, writeFile } from "node:fs/promises";
import { generateLightingDesignV1 } from "../lib/lighting-design.ts";
import { CURRENT_WORKSPACE_DATA_REVISION, CURRENT_WORKSPACE_SCHEMA_VERSION } from "../lib/workspace-migrations.ts";

const workspaceUrl = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspaceUrl, "utf8"));
const now = "2026-07-14T08:00:00.000Z";
const result = generateLightingDesignV1({
  structuresByFloor: workspace.houseStructuresByFloor,
  furniture: workspace.furniture,
  existingItems: workspace.drawingItems,
  floorIds: workspace.floors.map((floor) => floor.id),
  overwriteConflicts: true,
  now
});

workspace.schemaVersion = CURRENT_WORKSPACE_SCHEMA_VERSION;
workspace.dataRevision = CURRENT_WORKSPACE_DATA_REVISION;
workspace.defaultWorkspaceRevision = CURRENT_WORKSPACE_DATA_REVISION;
workspace.selectedDrawingSheetType ??= "sitePlan";
workspace.drawingItems = result.items;
workspace.lightingDesign = result.lightingDesign;
workspace.roomTourViews = [
  ...(workspace.roomTourViews ?? []).filter((view) => !view.id.startsWith("lighting-view-")),
  ...result.recommendedViews
];
workspace.drawingPackage = {
  ...workspace.drawingPackage,
  name: "施工图纸包 · 灯光设计专项 v1",
  drawingItemIds: result.items.map((item) => item.id),
  updatedAt: now
};
workspace.updatedAt = now;

await writeFile(workspaceUrl, `${JSON.stringify(workspace, null, 2)}\n`, "utf8");
console.log(`Lighting design v1 applied: ${result.lightCount} lights, ${result.switchCount} switches, ${result.created} drawing items created.`);
