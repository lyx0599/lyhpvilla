import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildConstructionPackageData,
  constructionPackageRecordFields,
  constructionPackageSheets,
  constructionPackageToCsv,
  constructionPackageToHtml,
  constructionPackageToJson,
  requiredConstructionCameraViewIds,
  validateConstructionPackage
} from "../lib/construction-package-export.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const data = buildConstructionPackageData(workspace);

assert.equal(constructionPackageSheets.length, 15);
for (const title of ["图纸目录/总说明", "总平面图", "结构图", "拆改施工图", "家具定位图", "插座点位图", "开关控制图", "灯光点位图", "给水点位图", "排水点位图", "吊顶图", "地面铺装图", "墙面材料图", "材料索引清单（辅助输出）", "待确认项清单（检查附件）"]) {
  assert.ok(constructionPackageSheets.some((sheet) => sheet.title === title), `missing sheet ${title}`);
}

for (const table of ["socketAndNetwork", "switchControl", "lighting", "waterSupply", "drainage", "ceiling", "floorFinish", "wallFinish", "yardFinish", "outdoorMep", "furniturePlacement", "cabinet", "procurementAndMaterials", "annotationsAndTodos", "dimensionVerification"]) {
  assert.ok(Array.isArray(data.tables[table]), `missing export table ${table}`);
}
for (const record of data.records) {
  for (const field of constructionPackageRecordFields) assert.ok(Object.hasOwn(record, field), `${record.table} record missing ${field}`);
}

const html = constructionPackageToHtml(workspace);
assert.match(html, /A-00 图纸目录\/总说明/);
assert.match(html, /固定 3D 视角截图入口/);
assert.match(html, /使用说明与复尺提醒/);
assert.match(html, /施工包检查/);
assert.match(html, /未完成图纸/);
assert.match(html, /缺失内容/);
assert.match(html, /庭院专项/);
assert.match(html, /柜体深化表/);
assert.match(html, /家具定位复核表/);
assert.match(html, /尺寸复核台账/);
assert.match(html, /版本 .*导出时间/);
assert.doesNotMatch(html, /debug overlay|开发工具|对象调试字段/);
for (const floor of workspace.floors) assert.ok(html.includes(floor.subtitle));
for (const view of data.cameraViews) assert.ok(html.includes(view.name));
for (const id of requiredConstructionCameraViewIds) assert.ok(data.cameraViews.some((view) => view.id === id), `missing construction camera ${id}`);

const csv = constructionPackageToCsv(workspace);
for (const field of constructionPackageRecordFields) assert.ok(csv.split("\n")[0].includes(field));
const json = JSON.parse(constructionPackageToJson(workspace));
assert.equal(json.packageVersion, workspace.defaultWorkspaceRevision);
assert.deepEqual(json.sheets.map((sheet) => sheet.sheetNo), constructionPackageSheets.map((sheet) => sheet.sheetNo));
assert.deepEqual(json.cameraViews.map((view) => view.id), requiredConstructionCameraViewIds);
assert.equal(data.tables.yardFinish.length, workspace.houseStructuresByFloor.YARD.outdoorSurfaces.length);
assert.ok(data.tables.yardFinish.every((record) => ["YARD-SOUTH", "YARD-NORTH", "YARD-ALL"].includes(record.roomId)));
assert.ok(data.tables.cabinet.length > 0, "cabinet schedule must include custom and built-in cabinets");
assert.ok(data.tables.cabinet.every((record) => Object.hasOwn(record, "dimensions") && Object.hasOwn(record, "customMade") && Object.hasOwn(record, "installType") && Array.isArray(record.requirements)));
assert.equal(data.tables.furniturePlacement.length, workspace.furniture.length);
assert.ok(data.tables.furniturePlacement.every((record) => Object.hasOwn(record, "outdoorId") && Object.hasOwn(record, "roomAssignmentLocked") && Object.hasOwn(record, "wallAnchor") && Object.hasOwn(record, "clearanceMeta") && Array.isArray(record.placementWarnings)));
assert.ok(data.records.filter((record) => record.relatedFurnitureId).every((record) => Object.hasOwn(record, "relatedFurniturePositionMm")), "Linked point exports must retain the furniture-position baseline field.");
assert.ok(data.validation.warningCounts.furniturePlacement >= 0);
assert.equal(data.validation.valid, true, "Unconfirmed dimensions must warn without blocking export or design work.");
assert.equal(data.tables.dimensionVerification.length, data.validation.verificationEntries.length);
assert.equal(data.validation.warningCounts.dimensionUnconfirmed, data.tables.dimensionVerification.length);
assert.ok(data.validation.warningCounts.dimensionEstimated > 0);
assert.ok(data.tables.dimensionVerification.every((record) => record.verificationStatus && record.verificationSource));
assert.ok(data.tables.dimensionVerification.every((record) => Object.hasOwn(record, "verificationToleranceMm") && Object.hasOwn(record, "verificationNotes")));
assert.ok(data.tables.dimensionVerification.every((record) => record.structureObject.verificationMeta), "JSON export must retain verification metadata with the structure snapshot.");
assert.ok(csv.includes("drawing-derived") || csv.includes("estimated"));
assert.ok(json.tables.dimensionVerification.some((record) => record.verificationSource === "developer-plan"));
assert.deepEqual(json.tables.furniturePlacement.map((record) => record.objectId), workspace.furniture.map((item) => item.id));

const broken = structuredClone(workspace);
broken.drawingItems.push({
  id: "DI-EXPORT-ORPHAN", floorId: "1F", roomId: null, category: "socket", type: "power", positionMm: { x: 1000, y: 1000 },
  hostObjectId: null, hostWallId: null, relatedFurnitureId: "furniture-missing", heightMm: 300, circuitId: null, materialId: null,
  label: "孤立测试点", notes: "需人工确认", source: "manual", status: "draft", quantity: 1,
  createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z"
});
broken.drawingItems.push(
  { id: "DI-WARN-SOCKET", floorId: "1F", roomId: null, category: "socket", type: "power", positionMm: { x: 1200, y: 1200 }, hostObjectId: null, hostWallId: null, relatedFurnitureId: null, heightMm: null, circuitId: null, materialId: null, label: "缺高度插座", notes: "", source: "manual", status: "todo", quantity: 1, createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z" },
  { id: "DI-WARN-SWITCH", floorId: "1F", roomId: null, category: "switch", type: "single", positionMm: { x: 1300, y: 1300 }, hostObjectId: null, hostWallId: null, relatedFurnitureId: null, heightMm: 1200, circuitId: null, materialId: null, label: "缺灯具开关", notes: "", source: "manual", status: "draft", quantity: 1, createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z" },
  { id: "DI-WARN-LIGHT", floorId: "1F", roomId: null, category: "light", type: "spot", positionMm: { x: 1400, y: 1400 }, hostObjectId: null, hostWallId: null, relatedFurnitureId: null, heightMm: 2800, circuitId: null, materialId: null, label: "缺色温灯具", notes: "", source: "manual", status: "draft", quantity: 1, createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z" },
  { id: "DI-WARN-DRAIN", floorId: "YARD", roomId: null, category: "drainage", type: "drainage", positionMm: { x: 1500, y: 1500 }, hostObjectId: null, hostWallId: null, relatedFurnitureId: null, heightMm: 0, circuitId: null, materialId: null, label: "庭院排水", notes: "待复核", source: "manual", status: "todo", quantity: 1, createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z" },
  { id: "DI-WARN-FINISH", floorId: "1F", roomId: null, category: "floorFinish", type: "roomFinish", positionMm: { x: 1600, y: 1600 }, hostObjectId: null, hostWallId: null, relatedFurnitureId: null, heightMm: null, circuitId: null, materialId: null, label: "缺材质铺装", notes: "", source: "manual", status: "draft", quantity: 1, createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z" }
);
broken.drawingPackage.drawingItemIds.push("DI-EXPORT-ORPHAN");
broken.houseStructuresByFloor["1F"].doors[0].hostId = "W-MISSING-VERIFICATION";
const validation = validateConstructionPackage(broken);
assert.equal(validation.valid, false);
assert.equal(validation.orphanIssues.length > 0, true);
assert.equal(validation.draftItems.some((item) => item.id === "DI-EXPORT-ORPHAN"), true);
assert.equal(validation.reviewItems.some((item) => item.id === "DI-EXPORT-ORPHAN"), true);
assert.equal(validation.warningCounts.socketMissingHeight, 1);
assert.equal(validation.warningCounts.switchMissingLights, 1);
assert.equal(validation.warningCounts.lightMissingColorTemperature, 1);
assert.equal(validation.warningCounts.drainageMissingType, 1);
assert.equal(validation.warningCounts.finishMissingMaterial, 1);
assert.ok(validation.warningCounts.todo >= 2);
assert.ok(validation.warningCounts.yardNeedsReview >= 1);
assert.ok(validation.warningCounts.dimensionConflicts >= 1);

console.log("Construction communication package export checks passed.");
