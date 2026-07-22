import { readFile, writeFile } from "node:fs/promises";
import { CURRENT_WORKSPACE_DATA_REVISION, CURRENT_WORKSPACE_SCHEMA_VERSION } from "../lib/workspace-migrations.ts";

const url = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(url, "utf8"));
const realismNote = "庭院写实化布局：按真实使用尺度布置，并避开天窗、活动区及相邻模块。";
const layouts = {
  "ph-1f-north-yard-gate": { x: 36.5 },
  "OUT-S-RELAX": { x: 64, y: 95, width: 240, depth: 150 },
  "OUT-S-UMBRELLA": { x: 64, y: 100, width: 220, depth: 220, height: 250 },
  "OUT-S-DRYING": { y: 113 },
  "OUT-S-PET-HOUSE": { x: 73, y: 119, width: 90, depth: 70, height: 78 },
  "OUT-S-PET-WASH": { x: 75, y: 116 }
};

workspace.furniture = workspace.furniture.map((item) => {
  const layout = layouts[item.id];
  if (!layout || item.floorId !== "YARD") return item;
  return {
    ...item,
    position: { ...item.position, x: layout.x ?? item.position.x, y: layout.y ?? item.position.y },
    dimensions: { ...item.dimensions, width: layout.width ?? item.dimensions.width, depth: layout.depth ?? item.dimensions.depth, height: layout.height ?? item.dimensions.height },
    note: `${(item.note ?? "").split(realismNote).join("").trim()} ${realismNote}`.trim()
  };
});

const cameraLayouts = {
  "view-yard-south": { cameraPosition: { x: 2.7, y: 2.5, z: 6.8 }, target: { x: 0.3, y: 0.45, z: 5.15 } },
  "view-yard-south-living": { cameraPosition: { x: 2.8, y: 1.8, z: 6.65 }, target: { x: 1, y: 0.55, z: 4.9 } },
  "view-yard-north": { cameraPosition: { x: 0, y: 2.9, z: -7.3 }, target: { x: 0.45, y: 0.52, z: -4.8 } },
  "view-yard-entry": { cameraPosition: { x: -0.35, y: 1.7, z: -5.3 }, target: { x: 1, y: 0.5, z: -4.55 } }
};
workspace.cameraViews = workspace.cameraViews.map((view) => cameraLayouts[view.id] ? { ...view, ...cameraLayouts[view.id] } : view);

const yard = workspace.houseStructuresByFloor.YARD;
const furnitureById = new Map(workspace.furniture.map((item) => [item.id, item]));
workspace.drawingItems = workspace.drawingItems.map((item) => {
  if (!item.relatedFurnitureId) return item;
  const furniture = furnitureById.get(item.relatedFurnitureId);
  if (!furniture || furniture.floorId !== "YARD") return item;
  const positionMm = {
    x: Math.round(yard.coordinateSystem.origin.x + yard.coordinateSystem.width * furniture.position.x / 100),
    y: Math.round(yard.coordinateSystem.origin.y + yard.coordinateSystem.height * furniture.position.y / 100)
  };
  return { ...item, relatedFurniturePositionMm: positionMm };
});

workspace.schemaVersion = CURRENT_WORKSPACE_SCHEMA_VERSION;
workspace.dataRevision = CURRENT_WORKSPACE_DATA_REVISION;
workspace.defaultWorkspaceRevision = CURRENT_WORKSPACE_DATA_REVISION;
workspace.updatedAt = "2026-07-23T06:00:00.000Z";
await writeFile(url, `${JSON.stringify(workspace, null, 2)}\n`, "utf8");
console.log("Yard realism layout applied.");
