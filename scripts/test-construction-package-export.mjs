import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildConstructionPackageData,
  constructionPackageRecordFields,
  constructionPackageSheets,
  constructionPackageToCsv,
  constructionPackageToHtml,
  constructionPackageToJson,
  validateConstructionPackage
} from "../lib/construction-package-export.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const data = buildConstructionPackageData(workspace);

assert.equal(constructionPackageSheets.length, 15);
for (const title of ["图纸目录/总说明", "总平面图", "结构图", "拆改施工图", "家具定位图", "插座点位图", "开关控制图", "灯光点位图", "给水点位图", "排水点位图", "吊顶图", "地面铺装图", "墙面材料图", "材料索引图", "施工标注/待确认项"]) {
  assert.ok(constructionPackageSheets.some((sheet) => sheet.title === title), `missing sheet ${title}`);
}

for (const table of ["socketAndNetwork", "switchControl", "lighting", "waterSupply", "drainage", "ceiling", "floorFinish", "wallFinish", "cabinet", "procurementAndMaterials", "annotationsAndTodos"]) {
  assert.ok(Array.isArray(data.tables[table]), `missing export table ${table}`);
}
for (const record of data.records) {
  for (const field of constructionPackageRecordFields) assert.ok(Object.hasOwn(record, field), `${record.table} record missing ${field}`);
}

const html = constructionPackageToHtml(workspace);
assert.match(html, /A-00 图纸目录\/总说明/);
assert.match(html, /固定视角与手动截图入口/);
assert.match(html, /导出校验/);
for (const floor of workspace.floors) assert.ok(html.includes(floor.subtitle));
for (const view of workspace.cameraViews) assert.ok(html.includes(view.name));

const csv = constructionPackageToCsv(workspace);
for (const field of constructionPackageRecordFields) assert.ok(csv.split("\n")[0].includes(field));
const json = JSON.parse(constructionPackageToJson(workspace));
assert.equal(json.packageVersion, workspace.defaultWorkspaceRevision);
assert.deepEqual(json.sheets.map((sheet) => sheet.sheetNo), constructionPackageSheets.map((sheet) => sheet.sheetNo));

const broken = structuredClone(workspace);
broken.drawingItems.push({
  id: "DI-EXPORT-ORPHAN", floorId: "1F", roomId: null, category: "socket", type: "power", positionMm: { x: 1000, y: 1000 },
  hostObjectId: null, hostWallId: null, relatedFurnitureId: "furniture-missing", heightMm: 300, circuitId: null, materialId: null,
  label: "孤立测试点", notes: "需人工确认", source: "manual", status: "draft", quantity: 1,
  createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z"
});
broken.drawingPackage.drawingItemIds.push("DI-EXPORT-ORPHAN");
const validation = validateConstructionPackage(broken);
assert.equal(validation.valid, false);
assert.equal(validation.orphanIssues.length > 0, true);
assert.equal(validation.draftItems.some((item) => item.id === "DI-EXPORT-ORPHAN"), true);
assert.equal(validation.reviewItems.some((item) => item.id === "DI-EXPORT-ORPHAN"), true);

console.log("Construction communication package export checks passed.");
