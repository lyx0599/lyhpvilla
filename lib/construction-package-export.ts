import { validateWorkspaceReferences } from "./workspace-reference-validator.ts";
import type { DrawingItem, DrawingItemCategory, DrawingSheetType, Furniture, HouseStructure } from "../types/space";
import type { WorkspaceDocument } from "../types/workspace";

export const constructionPackageSheets: Array<{ sheetNo: string; title: string; type: DrawingSheetType | null; categories: DrawingItemCategory[] }> = [
  { sheetNo: "A-00", title: "图纸目录/总说明", type: null, categories: [] },
  { sheetNo: "A-01", title: "总平面图", type: "sitePlan", categories: [] },
  { sheetNo: "A-02", title: "结构图", type: "structurePlan", categories: [] },
  { sheetNo: "A-03", title: "拆改施工图", type: "demolitionAndBuildPlan", categories: [] },
  { sheetNo: "F-01", title: "家具定位图", type: "furniturePlan", categories: ["cabinet"] },
  { sheetNo: "E-01", title: "插座点位图", type: "socketPlan", categories: ["socket", "network"] },
  { sheetNo: "E-02", title: "开关控制图", type: "switchPlan", categories: ["switch"] },
  { sheetNo: "L-01", title: "灯光点位图", type: "lightingPlan", categories: ["light"] },
  { sheetNo: "W-01", title: "给水点位图", type: "waterSupplyPlan", categories: ["waterSupply"] },
  { sheetNo: "W-02", title: "排水点位图", type: "drainagePlan", categories: ["drainage"] },
  { sheetNo: "C-01", title: "吊顶图", type: "ceilingPlan", categories: ["ceiling"] },
  { sheetNo: "M-01", title: "地面铺装图", type: "floorFinishPlan", categories: ["floorFinish"] },
  { sheetNo: "M-02", title: "墙面材料图", type: "wallFinishPlan", categories: ["wallFinish"] },
  { sheetNo: "M-03", title: "材料索引图", type: "materialPlan", categories: ["floorFinish", "wallFinish", "cabinet"] },
  { sheetNo: "N-01", title: "施工标注/待确认项", type: "annotationPlan", categories: ["annotation"] }
];

export const constructionPackageRecordFields = [
  "floorId", "roomId", "objectId", "category", "type", "label", "quantity", "heightMm", "materialId",
  "relatedFurnitureId", "hostWallId", "circuitId", "status", "notes", "createdAt", "updatedAt"
] as const;

type ExportRecord = Record<string, unknown> & Record<(typeof constructionPackageRecordFields)[number], unknown>;

function esc(value: unknown) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function drawingRecord(item: DrawingItem, table: string): ExportRecord {
  return {
    table, floorId: item.floorId, roomId: item.roomId, objectId: item.id, category: item.category, type: item.type,
    label: item.label, quantity: item.quantity, heightMm: item.heightMm, materialId: item.materialId ?? item.material ?? null,
    relatedFurnitureId: item.relatedFurnitureId, hostWallId: item.hostWallId ?? item.wallId ?? null,
    circuitId: item.circuitId ?? item.relatedCircuit ?? null, status: item.status, notes: item.notes,
    createdAt: item.createdAt, updatedAt: item.updatedAt, switchControl: item.switchControl ?? [],
    controlledLightIds: item.controlledLightIds ?? [], lightGroupId: item.lightGroupId ?? null,
    polygon: item.polygon ?? null, ceilingHeightMm: item.ceilingHeightMm ?? null, relatedLightIds: item.relatedLightIds ?? [],
    inspectionAccess: Boolean(item.inspectionAccess), airVent: Boolean(item.airVent), returnAir: Boolean(item.returnAir),
    maintenanceOpening: Boolean(item.maintenanceOpening), pattern: item.pattern ?? null, directionDeg: item.directionDeg ?? null,
    startPoint: item.startPoint ?? null, seamWidthMm: item.seamWidthMm ?? null, threshold: item.threshold ?? null,
    transition: item.transition ?? null, heightRange: item.heightRange ?? null, area: item.area ?? null,
    waterproofHeightMm: item.waterproofHeightMm ?? null, specialTreatment: item.specialTreatment ?? null
  };
}

function furnitureRecord(item: Furniture, related: DrawingItem[], table: string): ExportRecord {
  return {
    table, floorId: item.floorId, roomId: item.roomId, objectId: item.id, category: "cabinet", type: item.moduleType ?? item.type,
    label: item.name, quantity: 1, heightMm: item.dimensions.height * 10, materialId: item.material,
    relatedFurnitureId: item.id, hostWallId: item.constructionMeta?.wallDependency ?? null,
    circuitId: item.mepMeta?.relatedCircuit ?? null, status: "draft", notes: item.constructionMeta?.notes ?? item.constructionNote ?? item.note,
    createdAt: null, updatedAt: null, dimensions: item.dimensions, constructionMeta: item.constructionMeta ?? null,
    mepMeta: item.mepMeta ?? null, cabinetDesign: item.cabinetDesign ?? null, relatedDrawingItems: related.map((drawingItem) => drawingItem.id)
  };
}

export function validateConstructionPackage(workspace: WorkspaceDocument) {
  const references = validateWorkspaceReferences(workspace);
  const draftItems = workspace.drawingItems.filter((item) => item.status === "draft");
  const reviewItems = workspace.drawingItems.filter((item) => item.status === "todo" || /待复核|待确认|人工确认/.test(item.notes));
  const orphanIssues = references.errors.filter((issue) => issue.code.includes("ORPHAN") || issue.code.includes("INVALID_DRAWING_ITEM"));
  return { valid: references.errors.length === 0, errors: references.errors, warnings: references.warnings, orphanIssues, draftItems, reviewItems };
}

export function buildConstructionPackageData(workspace: WorkspaceDocument) {
  const drawingItems = workspace.drawingItems;
  const byCategories = (categories: DrawingItemCategory[], table: string) => drawingItems.filter((item) => categories.includes(item.category)).map((item) => drawingRecord(item, table));
  const cabinetFurniture = workspace.furniture.filter((item) => item.cabinetDesign || item.type === "cabinet" || item.moduleType === "cabinet");
  const procurementFurniture = workspace.furniture.filter((item) => item.material || item.constructionMeta?.purchaseCategory);
  const tables = {
    socketAndNetwork: byCategories(["socket", "network"], "socketAndNetwork"),
    switchControl: byCategories(["switch"], "switchControl"),
    lighting: byCategories(["light"], "lighting"),
    waterSupply: byCategories(["waterSupply"], "waterSupply"),
    drainage: byCategories(["drainage"], "drainage"),
    ceiling: byCategories(["ceiling"], "ceiling"),
    floorFinish: byCategories(["floorFinish"], "floorFinish"),
    wallFinish: byCategories(["wallFinish"], "wallFinish"),
    cabinet: cabinetFurniture.map((item) => furnitureRecord(item, drawingItems.filter((drawingItem) => drawingItem.relatedFurnitureId === item.id), "cabinet")),
    procurementAndMaterials: [
      ...byCategories(["floorFinish", "wallFinish", "cabinet"], "procurementAndMaterials"),
      ...procurementFurniture.map((item) => furnitureRecord(item, drawingItems.filter((drawingItem) => drawingItem.relatedFurnitureId === item.id), "procurementAndMaterials"))
    ],
    annotationsAndTodos: drawingItems.filter((item) => item.category === "annotation" || item.status === "todo" || /待复核|待确认|人工确认/.test(item.notes)).map((item) => drawingRecord(item, "annotationsAndTodos"))
  };
  return {
    packageVersion: workspace.defaultWorkspaceRevision ?? workspace.dataRevision ?? `schema-${workspace.schemaVersion ?? "unknown"}`,
    schemaVersion: workspace.schemaVersion, exportedAt: new Date().toISOString(), validation: validateConstructionPackage(workspace),
    sheets: constructionPackageSheets, cameraViews: workspace.cameraViews, tables,
    records: Object.values(tables).flat()
  };
}

function floorSvg(structure: HouseStructure, furniture: Furniture[], items: DrawingItem[], sheet: (typeof constructionPackageSheets)[number]) {
  const cs = structure.coordinateSystem;
  const filtered = sheet.categories.length ? items.filter((item) => sheet.categories.includes(item.category)) : [];
  const walls = structure.walls.map((wall) => wall.kind === "straight" ? `<line x1="${wall.start.x}" y1="${wall.start.y}" x2="${wall.end.x}" y2="${wall.end.y}" stroke="#334155" stroke-width="${Math.max(60, wall.thickness)}" />` : "").join("");
  const rooms = structure.rooms.map((room) => room.boundary.length > 2 ? `<polygon points="${room.boundary.map((point) => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="#94a3b8" stroke-width="24"/><text x="${room.boundary[0].x + 120}" y="${room.boundary[0].y + 220}" font-size="150" fill="#475569">${esc(room.name)}</text>` : "").join("");
  const furnitureSvg = sheet.type === "furniturePlan" || sheet.type === "sitePlan" ? furniture.map((item) => {
    const x = cs.origin.x + item.position.x / 100 * cs.width;
    const y = cs.origin.y + item.position.y / 100 * cs.height;
    return `<rect x="${x - item.dimensions.width * 5}" y="${y - item.dimensions.depth * 5}" width="${item.dimensions.width * 10}" height="${item.dimensions.depth * 10}" fill="#e2e8f0" stroke="#64748b" stroke-width="20"/><text x="${x}" y="${y}" text-anchor="middle" font-size="120">${esc(item.code)}</text>`;
  }).join("") : "";
  const itemSvg = filtered.map((item, index) => {
    const area = item.polygon?.length && item.polygon.length >= 3 ? `<polygon points="${item.polygon.map((point) => `${point.x},${point.y}`).join(" ")}" fill="rgba(37,99,235,.12)" stroke="#2563eb" stroke-width="35"/>` : "";
    return `${area}<circle cx="${item.positionMm.x}" cy="${item.positionMm.y}" r="150" fill="#fff" stroke="#2563eb" stroke-width="38"/><text x="${item.positionMm.x + 190}" y="${item.positionMm.y + 50}" font-size="135" font-weight="700">${index + 1}. ${esc(item.label)}</text>`;
  }).join("");
  return `<svg viewBox="${cs.origin.x} ${cs.origin.y} ${cs.width} ${cs.height}" role="img" aria-label="${esc(sheet.title)}"><rect x="${cs.origin.x}" y="${cs.origin.y}" width="${cs.width}" height="${cs.height}" fill="#fff"/>${rooms}${walls}${furnitureSvg}${itemSvg}</svg>`;
}

export function constructionPackageToHtml(workspace: WorkspaceDocument) {
  const data = buildConstructionPackageData(workspace);
  const validation = data.validation;
  const floorSections = workspace.floors.map((floor) => {
    const structure = workspace.houseStructuresByFloor[floor.id];
    if (!structure) return "";
    const furniture = workspace.furniture.filter((item) => item.floorId === floor.id);
    const items = workspace.drawingItems.filter((item) => item.floorId === floor.id);
    return `<section><h2>${esc(floor.label)} · ${esc(floor.subtitle)}</h2>${constructionPackageSheets.filter((sheet) => sheet.type).map((sheet) => `<article><header><strong>${sheet.sheetNo} ${esc(sheet.title)}</strong><span>${items.some((item) => sheet.categories.includes(item.category) && item.status === "confirmed") ? "已确认" : items.some((item) => sheet.categories.includes(item.category)) ? "待复核" : "示意"}</span></header>${floorSvg(structure, furniture, items, sheet)}<p>${sheet.categories.length ? `图纸对象 ${items.filter((item) => sheet.categories.includes(item.category)).length} 项` : "基于当前主数据生成"}</p></article>`).join("")}</section>`;
  }).join("");
  const cameraRows = workspace.cameraViews.map((view) => `<tr><td>${esc(view.floor)}</td><td>${esc(view.name)}</td><td>${esc(view.mode ?? "perspective")}</td><td>${esc(view.description ?? "")}</td><td>手动截图入口：在 3D 固定视角中选择 ${esc(view.name)}</td></tr>`).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>施工沟通包</title><style>body{margin:0;background:#eef1f4;color:#17202a;font-family:-apple-system,BlinkMacSystemFont,"Microsoft YaHei",sans-serif}main{max-width:1180px;margin:auto;padding:28px}section{background:#fff;border:1px solid #d7dde5;margin:0 0 24px;padding:22px;break-inside:avoid}h1,h2{margin:0 0 14px}article{border-top:1px solid #d7dde5;padding:18px 0}article header{display:flex;justify-content:space-between;gap:16px}article header span{color:#475569}svg{display:block;width:100%;max-height:720px;border:1px solid #d7dde5;margin-top:12px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #d7dde5;padding:8px;text-align:left;vertical-align:top}.warn{background:#fff7ed;border-color:#fed7aa}.meta{color:#64748b;font-size:13px}@media print{body{background:#fff}main{padding:0}section{border-color:#999}}</style></head><body><main><section><h1>装修施工沟通包</h1><p class="meta">版本 ${esc(data.packageVersion)} · 导出时间 ${esc(data.exportedAt)}</p><p>本包用于施工队、家人和供应商沟通。状态分为“示意 / 待复核 / 已确认”；所有尺寸、材料和设备点位在施工前应结合现场复尺与厂家资料确认。</p></section><section><h2>A-00 图纸目录/总说明</h2><table><thead><tr><th>图号</th><th>图名</th></tr></thead><tbody>${constructionPackageSheets.map((sheet) => `<tr><td>${sheet.sheetNo}</td><td>${esc(sheet.title)}</td></tr>`).join("")}</tbody></table></section><section class="warn"><h2>导出校验</h2><p>引用错误 ${validation.errors.length} 项；孤立点位 ${validation.orphanIssues.length} 项；草稿 ${validation.draftItems.length} 项；待复核 ${validation.reviewItems.length} 项。</p>${[...validation.errors, ...validation.warnings].map((issue) => `<p>${esc(issue.objectId)} · ${esc(issue.message)}</p>`).join("") || "<p>引用校验通过。</p>"}</section>${floorSections}<section><h2>固定视角与手动截图入口</h2><table><thead><tr><th>楼层</th><th>视角</th><th>模式</th><th>说明</th><th>截图</th></tr></thead><tbody>${cameraRows || "<tr><td colspan='5'>暂无固定视角。</td></tr>"}</tbody></table></section></main></body></html>`;
}

function csvCell(value: unknown) {
  const text = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function constructionPackageToCsv(workspace: WorkspaceDocument) {
  const data = buildConstructionPackageData(workspace);
  const extraFields = ["table", ...constructionPackageRecordFields, "switchControl", "controlledLightIds", "lightGroupId", "polygon", "constructionMeta", "mepMeta", "cabinetDesign", "relatedDrawingItems"];
  return [extraFields, ...data.records.map((record) => extraFields.map((field) => record[field]))].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function constructionPackageToJson(workspace: WorkspaceDocument) {
  return JSON.stringify(buildConstructionPackageData(workspace), null, 2);
}
