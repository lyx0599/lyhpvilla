import { validateWorkspaceReferences } from "./workspace-reference-validator.ts";
import type { DrawingItem, DrawingItemCategory, DrawingSheetType, FixedCameraView, Furniture, HouseOutdoorSurface, HouseStructure } from "../types/space";
import type { WorkspaceDocument } from "../types/workspace";

export const constructionPackageSheets: Array<{ sheetNo: string; title: string; type: DrawingSheetType | null; categories: DrawingItemCategory[]; scale: string }> = [
  { sheetNo: "A-00", title: "图纸目录/总说明", type: null, categories: [], scale: "NTS" },
  { sheetNo: "A-01", title: "总平面图", type: "sitePlan", categories: [], scale: "1:100" },
  { sheetNo: "A-02", title: "结构图", type: "structurePlan", categories: [], scale: "1:50" },
  { sheetNo: "A-03", title: "拆改施工图", type: "demolitionAndBuildPlan", categories: [], scale: "1:50" },
  { sheetNo: "F-01", title: "家具定位图", type: "furniturePlan", categories: ["cabinet"], scale: "1:50" },
  { sheetNo: "E-01", title: "插座点位图", type: "socketPlan", categories: ["socket", "network"], scale: "1:50" },
  { sheetNo: "E-02", title: "开关控制图", type: "switchPlan", categories: ["switch"], scale: "1:50" },
  { sheetNo: "L-01", title: "灯光点位图", type: "lightingPlan", categories: ["light"], scale: "1:50" },
  { sheetNo: "W-01", title: "给水点位图", type: "waterSupplyPlan", categories: ["waterSupply"], scale: "1:50" },
  { sheetNo: "W-02", title: "排水点位图", type: "drainagePlan", categories: ["drainage"], scale: "1:50" },
  { sheetNo: "C-01", title: "吊顶图", type: "ceilingPlan", categories: ["ceiling"], scale: "1:50" },
  { sheetNo: "M-01", title: "地面铺装图", type: "floorFinishPlan", categories: ["floorFinish"], scale: "1:50" },
  { sheetNo: "M-02", title: "墙面材料图", type: "wallFinishPlan", categories: ["wallFinish"], scale: "1:50" },
  { sheetNo: "M-03", title: "材料索引图", type: "materialPlan", categories: ["floorFinish", "wallFinish", "cabinet"], scale: "NTS" },
  { sheetNo: "N-01", title: "施工标注/待确认项", type: "annotationPlan", categories: ["annotation"], scale: "NTS" }
];

export const constructionPackageRecordFields = [
  "floorId", "roomId", "roomName", "objectId", "category", "type", "label", "quantity", "heightMm", "materialId",
  "lightType", "lightingLayer", "colorTemperature", "beamAngle", "mountingType", "controlGroupId", "smartControl", "dimming",
  "relatedSwitchId", "relatedRoomId", "hostCeilingAreaId", "relatedFurnitureId", "relatedFurnitureName", "hostWallId", "circuitId", "status", "notes", "createdAt", "updatedAt"
] as const;

export const requiredConstructionCameraViewIds = [
  "view-1f-yard-overview", "view-yard-south-living", "view-yard-entry", "view-1f-living-dining-overview",
  "view-2f-master-bedroom", "view-2f-closet", "view-b2-activity", "view-b1-guest-room"
] as const;

type ExportRecord = Record<string, unknown> & Record<(typeof constructionPackageRecordFields)[number], unknown>;

export type ConstructionPackageWarningCounts = {
  draft: number; todo: number; orphan: number; socketMissingHeight: number; switchMissingLights: number;
  lightMissingColorTemperature: number; lightIncompleteSystemFields: number; controlGroupMismatch: number;
  drainageMissingType: number; finishMissingMaterial: number; yardNeedsReview: number;
};

function esc(value: unknown) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function roomNames(workspace: WorkspaceDocument) {
  const result = new Map<string, string>();
  Object.values(workspace.houseStructuresByFloor).forEach((structure) => {
    structure?.rooms.forEach((room) => result.set(room.id, room.name));
    structure?.outdoors.forEach((outdoor) => result.set(outdoor.id, outdoor.name));
  });
  return result;
}

function inferYardArea(item: { id: string; name?: string; label?: string }) {
  const text = `${item.id} ${item.name ?? ""} ${item.label ?? ""}`;
  if (/南院/.test(text) || /south/i.test(text)) return { id: "YARD-SOUTH", name: "南院" };
  if (/北院|入户/.test(text) || /north|entry/i.test(text)) return { id: "YARD-NORTH", name: "北院/入户庭院" };
  return { id: "YARD-ALL", name: "全院" };
}

function drawingRecord(item: DrawingItem, table: string, rooms: Map<string, string>, furniture: Map<string, Furniture>): ExportRecord {
  const relatedFurniture = item.relatedFurnitureId ? furniture.get(item.relatedFurnitureId) : undefined;
  const yardArea = item.floorId === "YARD" && !item.roomId ? inferYardArea(item) : null;
  return {
    table, floorId: item.floorId, roomId: item.roomId ?? yardArea?.id ?? null,
    roomName: (item.roomId ? rooms.get(item.roomId) : yardArea?.name) ?? "未关联区域", objectId: item.id,
    category: item.category, type: item.type, label: item.label, quantity: item.quantity, heightMm: item.heightMm,
    lightType: item.lightType ?? (item.category === "light" ? item.type : null), lightingLayer: item.lightingLayer ?? null,
    colorTemperature: item.colorTemperature ?? item.lightColorTemperature ?? null, beamAngle: item.beamAngle ?? null,
    mountingType: item.mountingType ?? null, controlGroupId: item.controlGroupId ?? item.lightGroupId ?? null,
    smartControl: item.smartControl ?? item.needsSmartControl ?? false, dimming: item.dimming ?? false,
    relatedSwitchId: item.relatedSwitchId ?? null, relatedRoomId: item.relatedRoomId ?? item.roomId ?? null,
    hostCeilingAreaId: item.hostCeilingAreaId ?? null,
    materialId: item.materialId ?? item.material ?? null, relatedFurnitureId: item.relatedFurnitureId,
    relatedFurnitureName: relatedFurniture?.name ?? null, hostWallId: item.hostWallId ?? item.wallId ?? null,
    circuitId: item.circuitId ?? item.relatedCircuit ?? null, status: item.status, notes: item.notes,
    createdAt: item.createdAt, updatedAt: item.updatedAt, switchControl: item.switchControl ?? [],
    controlledLightIds: item.controlledLightIds ?? [], lightGroupId: item.lightGroupId ?? null,
    lightColorTemperature: item.lightColorTemperature ?? null, polygon: item.polygon ?? null,
    ceilingHeightMm: item.ceilingHeightMm ?? null, inspectionAccess: Boolean(item.inspectionAccess),
    airVent: Boolean(item.airVent), returnAir: Boolean(item.returnAir), maintenanceOpening: Boolean(item.maintenanceOpening),
    pattern: item.pattern ?? null, directionDeg: item.directionDeg ?? null, seamWidthMm: item.seamWidthMm ?? null,
    threshold: item.threshold ?? null, transition: item.transition ?? null, heightRange: item.heightRange ?? null,
    area: item.area ?? null, waterproofHeightMm: item.waterproofHeightMm ?? null, specialTreatment: item.specialTreatment ?? null
  };
}

function cabinetRecord(item: Furniture, related: DrawingItem[], rooms: Map<string, string>): ExportRecord {
  const mep = item.mepMeta ?? {};
  const construction = item.constructionMeta ?? {};
  const requirements = [
    mep.needsSocket ? `插座 x${mep.socketCount ?? 1}` : "", mep.needsLighting ? `灯带/灯光 ${mep.lightingType ?? ""}` : "",
    mep.needsWaterSupply ? `给水 ${mep.waterSupplyType ?? ""}` : "", mep.needsDrainage ? `排水 ${mep.drainageType ?? ""}` : "",
    construction.inspectionAccessRequired ? "检修口" : ""
  ].filter(Boolean);
  return {
    table: "cabinet", floorId: item.floorId, roomId: item.roomId, roomName: rooms.get(item.roomId) ?? "未关联区域",
    objectId: item.id, category: "cabinet", type: item.moduleType ?? item.type, label: item.name, quantity: 1,
    heightMm: item.dimensions.height * 10, materialId: item.material, relatedFurnitureId: item.id,
    lightType: null, lightingLayer: null, colorTemperature: null, beamAngle: null, mountingType: null,
    controlGroupId: null, smartControl: false, dimming: false, relatedSwitchId: null,
    relatedRoomId: item.roomId, hostCeilingAreaId: null,
    relatedFurnitureName: item.name, hostWallId: construction.wallDependency ?? null, circuitId: mep.relatedCircuit ?? null,
    status: "draft", notes: construction.notes ?? item.constructionNote ?? item.note, createdAt: null, updatedAt: null,
    dimensions: item.dimensions, customMade: Boolean(construction.customMade), installType: construction.installType ?? null,
    reserveSize: construction.reserveSize ?? null, requirements, constructionMeta: item.constructionMeta ?? null,
    mepMeta: item.mepMeta ?? null, cabinetDesign: item.cabinetDesign ?? null, relatedDrawingItems: related.map((drawingItem) => drawingItem.id)
  };
}

function outdoorSurfaceRecord(item: HouseOutdoorSurface): ExportRecord {
  const area = inferYardArea(item);
  return {
    table: "yardFinish", floorId: "YARD", roomId: area.id, roomName: area.name, objectId: item.id,
    category: item.category ?? item.surfaceType, type: item.surfaceType, label: item.label ?? item.name, quantity: 1,
    heightMm: null, materialId: item.material, relatedFurnitureId: null, relatedFurnitureName: null, hostWallId: null,
    lightType: null, lightingLayer: null, colorTemperature: null, beamAngle: null, mountingType: null,
    controlGroupId: null, smartControl: false, dimming: false, relatedSwitchId: null,
    relatedRoomId: area.id, hostCeilingAreaId: null,
    circuitId: null, status: item.status ?? "draft", notes: item.notes ?? "", createdAt: null, updatedAt: null,
    polygon: item.polygon, pathPoints: item.pathPoints ?? null, pathWidthMm: item.pathWidthMm ?? null, area: item.area
  };
}

export function validateConstructionPackage(workspace: WorkspaceDocument) {
  const references = validateWorkspaceReferences(workspace);
  const draftItems = workspace.drawingItems.filter((item) => item.status === "draft");
  const todoItems = workspace.drawingItems.filter((item) => item.status === "todo");
  const reviewItems = workspace.drawingItems.filter((item) => item.status === "todo" || /待复核|待确认|人工确认/.test(item.notes));
  const orphanIssues = references.errors.filter((issue) => issue.code.includes("ORPHAN") || issue.code.includes("INVALID_DRAWING_ITEM"));
  const yardItems = workspace.drawingItems.filter((item) => item.floorId === "YARD");
  const yardSurfaces = workspace.houseStructuresByFloor.YARD?.outdoorSurfaces ?? [];
  const warningCounts: ConstructionPackageWarningCounts = {
    draft: draftItems.length, todo: todoItems.length, orphan: orphanIssues.length,
    socketMissingHeight: workspace.drawingItems.filter((item) => ["socket", "network"].includes(item.category) && !item.heightMm).length,
    switchMissingLights: workspace.drawingItems.filter((item) => item.category === "switch" && !(item.controlledLightIds?.length || item.controlGroupId || item.lightGroupId)).length,
    lightMissingColorTemperature: workspace.drawingItems.filter((item) => item.category === "light" && !(item.colorTemperature || item.lightColorTemperature)).length,
    lightIncompleteSystemFields: workspace.drawingItems.filter((item) => item.category === "light" && !(item.lightType && item.lightingLayer && item.mountingType && (item.relatedRoomId || item.roomId) && (item.controlGroupId || item.lightGroupId))).length,
    controlGroupMismatch: workspace.drawingItems.filter((item) => {
      if (item.category !== "light" || !item.relatedSwitchId) return false;
      const relatedSwitch = workspace.drawingItems.find((candidate) => candidate.id === item.relatedSwitchId && candidate.category === "switch");
      return !relatedSwitch || (item.controlGroupId ?? item.lightGroupId) !== (relatedSwitch.controlGroupId ?? relatedSwitch.lightGroupId);
    }).length,
    drainageMissingType: workspace.drawingItems.filter((item) => item.category === "drainage" && (!item.type || item.type === "drainage")).length,
    finishMissingMaterial: workspace.drawingItems.filter((item) => ["floorFinish", "wallFinish"].includes(item.category) && !(item.materialId || item.material)).length,
    yardNeedsReview: yardItems.filter((item) => item.status !== "confirmed").length + yardSurfaces.filter((item) => item.status !== "confirmed").length
  };
  return { valid: references.errors.length === 0, errors: references.errors, warnings: references.warnings, orphanIssues, draftItems, todoItems, reviewItems, warningCounts };
}

function isCabinet(item: Furniture) {
  return Boolean(item.cabinetDesign || item.wardrobeDesign || item.constructionMeta?.customMade || ["cabinet", "wardrobe", "sideboard", "island", "vanity"].includes(item.moduleType ?? "") || /柜|中岛|橱柜/.test(item.name));
}

export function buildConstructionPackageData(workspace: WorkspaceDocument) {
  const rooms = roomNames(workspace);
  const furniture = new Map(workspace.furniture.map((item) => [item.id, item]));
  const byCategories = (categories: DrawingItemCategory[], table: string) => workspace.drawingItems.filter((item) => categories.includes(item.category)).map((item) => drawingRecord(item, table, rooms, furniture));
  const cabinets = workspace.furniture.filter(isCabinet).map((item) => cabinetRecord(item, workspace.drawingItems.filter((drawingItem) => drawingItem.relatedFurnitureId === item.id), rooms));
  const yardSurfaces = workspace.houseStructuresByFloor.YARD?.outdoorSurfaces ?? [];
  const outdoorCategories: DrawingItemCategory[] = ["socket", "network", "light", "waterSupply", "drainage"];
  const lightingRecords = byCategories(["light"], "lighting");
  const luminaireGroups = new Map<string, ExportRecord[]>();
  lightingRecords.forEach((record) => {
    const key = [record.lightType, record.lightingLayer, record.colorTemperature, record.beamAngle, record.mountingType].join("|");
    luminaireGroups.set(key, [...(luminaireGroups.get(key) ?? []), record]);
  });
  const luminaireSchedule = Array.from(luminaireGroups.values()).map((records, index): ExportRecord => ({
    ...records[0], table: "luminaireSchedule", objectId: `FIXTURE-${String(index + 1).padStart(2, "0")}`,
    label: `${records[0].lightType ?? records[0].type} · ${records[0].colorTemperature ?? "色温待定"}`,
    quantity: records.reduce((sum, record) => sum + Number(record.quantity ?? 1), 0),
    roomId: null, roomName: "多空间汇总", relatedSwitchId: null, controlGroupId: null,
    notes: `点位：${records.map((record) => record.objectId).join("、")}`
  }));
  const smartControlNotes = workspace.drawingItems
    .filter((item) => ["light", "switch"].includes(item.category) && Boolean(item.smartControl ?? item.needsSmartControl))
    .map((item) => drawingRecord(item, "smartControlNotes", rooms, furniture));
  const tables = {
    socketAndNetwork: byCategories(["socket", "network"], "socketAndNetwork"), switchControl: byCategories(["switch"], "switchControl"),
    lighting: lightingRecords, luminaireSchedule, smartControlNotes, waterSupply: byCategories(["waterSupply"], "waterSupply"),
    drainage: byCategories(["drainage"], "drainage"), ceiling: byCategories(["ceiling"], "ceiling"),
    floorFinish: byCategories(["floorFinish"], "floorFinish"), wallFinish: byCategories(["wallFinish"], "wallFinish"),
    yardFinish: yardSurfaces.map(outdoorSurfaceRecord),
    outdoorMep: workspace.drawingItems.filter((item) => item.floorId === "YARD" && outdoorCategories.includes(item.category)).map((item) => drawingRecord(item, "outdoorMep", rooms, furniture)),
    cabinet: cabinets,
    procurementAndMaterials: [
      ...byCategories(["floorFinish", "wallFinish"], "procurementAndMaterials"),
      ...yardSurfaces.map((item) => ({ ...outdoorSurfaceRecord(item), table: "procurementAndMaterials" })),
      ...cabinets.map((item) => ({ ...item, table: "procurementAndMaterials" }))
    ],
    annotationsAndTodos: workspace.drawingItems.filter((item) => item.category === "annotation" || item.status === "todo" || /待复核|待确认|人工确认/.test(item.notes)).map((item) => drawingRecord(item, "annotationsAndTodos", rooms, furniture))
  };
  const cameraViews = requiredConstructionCameraViewIds.map((id) => workspace.cameraViews.find((view) => view.id === id)).filter((view): view is FixedCameraView => Boolean(view));
  const records = Object.values(tables).flat() as ExportRecord[];
  return {
    packageVersion: workspace.defaultWorkspaceRevision ?? workspace.dataRevision ?? `schema-${workspace.schemaVersion ?? "unknown"}`,
    schemaVersion: workspace.schemaVersion, exportedAt: new Date().toISOString(), validation: validateConstructionPackage(workspace),
    sheets: constructionPackageSheets, cameraViews, tables, records
  };
}

function sheetStatus(items: DrawingItem[], categories: DrawingItemCategory[]) {
  const relevant = categories.length ? items.filter((item) => categories.includes(item.category)) : [];
  if (relevant.length > 0 && relevant.every((item) => item.status === "confirmed")) return "已确认";
  return relevant.length > 0 ? "待复核" : "示意";
}

function floorSvg(structure: HouseStructure, furniture: Furniture[], items: DrawingItem[], sheet: (typeof constructionPackageSheets)[number]) {
  const cs = structure.coordinateSystem;
  const filtered = sheet.categories.length ? items.filter((item) => sheet.categories.includes(item.category)) : [];
  const walls = structure.walls.map((wall) => wall.kind === "straight" ? `<line x1="${wall.start.x}" y1="${wall.start.y}" x2="${wall.end.x}" y2="${wall.end.y}" stroke="#334155" stroke-width="${Math.max(60, wall.thickness)}"/>` : "").join("");
  const rooms = [...structure.rooms.map((room) => ({ name: room.name, points: room.boundary })), ...structure.outdoors.map((room) => ({ name: room.name, points: room.polygon }))].map((room) => room.points.length > 2 ? `<polygon points="${room.points.map((point) => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="#94a3b8" stroke-width="24"/><text x="${room.points[0].x + 120}" y="${room.points[0].y + 220}" font-size="150" fill="#475569">${esc(room.name)}</text>` : "").join("");
  const surfaces = sheet.type === "sitePlan" || sheet.type === "floorFinishPlan" ? structure.outdoorSurfaces.map((surface) => `<polygon points="${surface.polygon.map((point) => `${point.x},${point.y}`).join(" ")}" fill="${surface.surfaceType === "planting" ? "#dcfce7" : "#f1f5f9"}" stroke="#64748b" stroke-width="24"/><text x="${surface.polygon[0]?.x ?? 0}" y="${(surface.polygon[0]?.y ?? 0) + 150}" font-size="120">${esc(surface.label ?? surface.name)}</text>`).join("") : "";
  const furnitureSvg = ["furniturePlan", "sitePlan", "socketPlan", "lightingPlan", "waterSupplyPlan", "drainagePlan"].includes(sheet.type ?? "") ? furniture.map((item) => { const x = cs.origin.x + item.position.x / 100 * cs.width; const y = cs.origin.y + item.position.y / 100 * cs.height; return `<rect x="${x - item.dimensions.width * 5}" y="${y - item.dimensions.depth * 5}" width="${item.dimensions.width * 10}" height="${item.dimensions.depth * 10}" fill="#e2e8f0" stroke="#64748b" stroke-width="20"/><text x="${x}" y="${y}" text-anchor="middle" font-size="110">${esc(item.code)}</text>`; }).join("") : "";
  const controlLines = sheet.type === "switchPlan" ? filtered.flatMap((item) => (item.controlledLightIds ?? []).map((lightId) => {
    const light = items.find((candidate) => candidate.id === lightId && candidate.category === "light");
    return light ? `<line x1="${item.positionMm.x}" y1="${item.positionMm.y}" x2="${light.positionMm.x}" y2="${light.positionMm.y}" stroke="#2563eb" stroke-width="24" stroke-dasharray="90 60" opacity=".7"/>` : "";
  })).join("") : "";
  const itemSvg = filtered.map((item, index) => {
    const number = item.id || String(index + 1).padStart(2, "0");
    const main = item.category === "light" ? `${number} · ${item.lightType ?? item.type}` : `${number} · ${item.label}`;
    const detail = item.category === "light"
      ? `${item.colorTemperature ?? item.lightColorTemperature ?? "色温待定"} · ${item.controlGroupId ?? item.lightGroupId ?? "未分组"} · ${item.smartControl ? "智能" : "常规"}/${item.dimming ? "调光" : "不调光"} · ${item.relatedSwitchId ?? "未关联开关"}`
      : item.category === "switch" ? `${item.controlGroupId ?? item.lightGroupId ?? "未分组"} · 控制 ${(item.controlledLightIds ?? []).join("、") || "待关联"}`
      : `x${item.quantity}${item.heightMm ? ` · H${item.heightMm}` : ""}`;
    return `${item.polygon?.length ? `<polygon points="${item.polygon.map((point) => `${point.x},${point.y}`).join(" ")}" fill="#dbeafe" fill-opacity=".5" stroke="#2563eb" stroke-width="35"/>` : ""}<circle cx="${item.positionMm.x}" cy="${item.positionMm.y}" r="150" fill="#fff" stroke="#2563eb" stroke-width="38"/><text x="${item.positionMm.x + 190}" y="${item.positionMm.y + 20}" font-size="130" font-weight="700">${esc(main)}</text><text x="${item.positionMm.x + 190}" y="${item.positionMm.y + 160}" font-size="105" fill="#475569">${esc(detail)}</text>`;
  }).join("");
  return `<svg viewBox="${cs.origin.x} ${cs.origin.y} ${cs.width} ${cs.height}" role="img" aria-label="${esc(sheet.title)}"><rect x="${cs.origin.x}" y="${cs.origin.y}" width="${cs.width}" height="${cs.height}" fill="#fff"/>${surfaces}${rooms}${walls}${furnitureSvg}${controlLines}${itemSvg}</svg>`;
}

function recordsTable(title: string, records: ExportRecord[]) {
  const isLightingTable = records.some((record) => ["lighting", "luminaireSchedule", "switchControl", "smartControlNotes"].includes(String(record.table)));
  if (isLightingTable) {
    const rows = records.map((record) => `<tr><td>${esc(record.floorId)}</td><td>${esc(record.roomName)}</td><td>${esc(record.objectId)}</td><td>${esc(record.lightType ?? record.type)}</td><td>${esc(record.lightingLayer)}</td><td>${esc(record.colorTemperature)}</td><td>${esc(record.beamAngle)}</td><td>${esc(record.mountingType)}</td><td>${esc(record.heightMm)}</td><td>${esc(record.controlGroupId)}</td><td>${esc(record.smartControl ? "是" : "否")}</td><td>${esc(record.dimming ? "是" : "否")}</td><td>${esc(record.relatedSwitchId)}</td><td>${esc(record.status)}</td><td>${esc(record.notes)}</td></tr>`).join("");
    return `<section><h2>${esc(title)}</h2><table><thead><tr><th>楼层</th><th>区域</th><th>编号</th><th>灯具/控制类型</th><th>分层</th><th>色温</th><th>光束角</th><th>安装</th><th>高度</th><th>控制组</th><th>智能</th><th>调光</th><th>关联开关</th><th>状态</th><th>备注</th></tr></thead><tbody>${rows || "<tr><td colspan='15'>暂无记录</td></tr>"}</tbody></table></section>`;
  }
  const rows = records.map((record) => `<tr><td>${esc(record.floorId)}</td><td>${esc(record.roomName)}</td><td>${esc(record.label)}</td><td>${esc(record.type)}</td><td>${esc(record.quantity)}</td><td>${esc(record.heightMm)}</td><td>${esc(record.materialId)}</td><td>${esc(record.relatedFurnitureName)}</td><td>${esc(record.status)}</td><td>${esc(record.notes)}</td></tr>`).join("");
  return `<section><h2>${esc(title)}</h2><table><thead><tr><th>楼层</th><th>区域</th><th>名称</th><th>类型</th><th>数量</th><th>高度</th><th>材料</th><th>关联家具</th><th>状态</th><th>备注</th></tr></thead><tbody>${rows || "<tr><td colspan='10'>暂无记录</td></tr>"}</tbody></table></section>`;
}

export function constructionPackageToHtml(workspace: WorkspaceDocument) {
  const data = buildConstructionPackageData(workspace);
  const warning = data.validation.warningCounts;
  const floorSections = workspace.floors.map((floor) => {
    const structure = workspace.houseStructuresByFloor[floor.id];
    if (!structure) return "";
    const furniture = workspace.furniture.filter((item) => item.floorId === floor.id);
    const items = workspace.drawingItems.filter((item) => item.floorId === floor.id);
    const drawings = constructionPackageSheets.filter((sheet) => sheet.type).map((sheet) => `<article><header><div><strong>${sheet.sheetNo} ${esc(sheet.title)}</strong><small>${esc(floor.label)} · ${esc(floor.subtitle)} · ${sheet.scale}</small></div><span>${sheetStatus(items, sheet.categories)}</span></header>${floorSvg(structure, furniture, items, sheet)}<footer>版本 ${esc(data.packageVersion)} · 导出时间 ${esc(data.exportedAt)}</footer></article>`).join("");
    return `<section class="floor"><h2>${esc(floor.label)} · ${esc(floor.subtitle)}</h2>${drawings}</section>`;
  }).join("");
  const warningRows = Object.entries({ "草稿项": warning.draft, "待确认项": warning.todo, "孤立引用": warning.orphan, "插座缺少高度": warning.socketMissingHeight, "开关缺少关联灯具": warning.switchMissingLights, "灯具缺少色温": warning.lightMissingColorTemperature, "灯具系统字段不完整": warning.lightIncompleteSystemFields, "灯具/开关控制组不一致": warning.controlGroupMismatch, "排水点缺少类型": warning.drainageMissingType, "铺装/墙面缺少材质": warning.finishMissingMaterial, "庭院待复核": warning.yardNeedsReview }).map(([label, count]) => `<tr><td>${label}</td><td>${count}</td><td>${count ? "导出后继续复核" : "通过"}</td></tr>`).join("");
  const cameraRows = data.cameraViews.map((view) => `<tr><td>${esc(view.floor)}</td><td>${esc(view.name)}</td><td>${esc(view.description ?? "")}</td><td><button type="button" data-camera-view="${esc(view.id)}">在应用中打开固定视角并手动截图</button></td></tr>`).join("");
  const tableSections = [
    ["插座/弱电点位表", data.tables.socketAndNetwork], ["开关控制表", data.tables.switchControl], ["灯光点位表", data.tables.lighting],
    ["灯具清单", data.tables.luminaireSchedule], ["智能控制备注", data.tables.smartControlNotes],
    ["给水点位表", data.tables.waterSupply], ["排水点位表", data.tables.drainage], ["吊顶区域表", data.tables.ceiling],
    ["地面铺装表", data.tables.floorFinish], ["墙面材料表", data.tables.wallFinish], ["庭院铺装/绿化表", data.tables.yardFinish],
    ["户外水电点位表", data.tables.outdoorMep], ["柜体深化表", data.tables.cabinet], ["材料/采购清单", data.tables.procurementAndMaterials],
    ["施工备注/待确认项表", data.tables.annotationsAndTodos]
  ].map(([title, records]) => recordsTable(title as string, records as ExportRecord[])).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>施工沟通包</title><style>body{margin:0;background:#eef1f4;color:#17202a;font-family:-apple-system,BlinkMacSystemFont,"Microsoft YaHei",sans-serif}main{max-width:1180px;margin:auto;padding:28px}section{background:#fff;border:1px solid #d7dde5;margin:0 0 24px;padding:22px}h1,h2{margin:0 0 14px}.cover{min-height:55vh;display:flex;flex-direction:column;justify-content:center}.meta,small,footer{display:block;color:#64748b;font-size:12px}.notice{border-left:5px solid #d97706;background:#fff7ed}article{border-top:1px solid #d7dde5;padding:18px 0;break-inside:avoid}article header{display:flex;justify-content:space-between;gap:16px}article header span{font-weight:700;color:#475569}svg{display:block;width:100%;max-height:720px;border:1px solid #d7dde5;margin:12px 0}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d7dde5;padding:7px;text-align:left;vertical-align:top}button{border:1px solid #cbd5e1;background:#fff;padding:6px 9px}@media print{body{background:#fff}main{padding:0}section{border-color:#999}.cover{page-break-after:always}button{display:none}}</style></head><body><main><section class="cover"><p class="meta">CONSTRUCTION COMMUNICATION PACKAGE</p><h1>装修施工沟通包</h1><p>面向施工队、家人和供应商的第一版沟通文件</p><p class="meta">版本 ${esc(data.packageVersion)} · 导出时间 ${esc(data.exportedAt)}</p></section><section class="notice"><h2>使用说明与复尺提醒</h2><p>本包表达方案意图、预留点位、控制关系、材料与待确认事项，不是专业机电管线路径图。所有尺寸、标高、设备参数、材料批次和安装条件必须在施工前结合现场复尺、厂家深化图和专业人员意见确认。</p></section><section><h2>A-00 图纸目录/总说明</h2><table><thead><tr><th>图号</th><th>图名</th><th>比例</th></tr></thead><tbody>${constructionPackageSheets.map((sheet) => `<tr><td>${sheet.sheetNo}</td><td>${esc(sheet.title)}</td><td>${sheet.scale}</td></tr>`).join("")}<tr><td>M-01Y</td><td>庭院铺装/绿化专项</td><td>NTS</td></tr></tbody></table></section><section class="notice"><h2>施工包检查</h2><table><thead><tr><th>检查项</th><th>数量</th><th>处理建议</th></tr></thead><tbody>${warningRows}</tbody></table></section>${floorSections}<section><h2>庭院专项</h2><p>庭院铺装、绿化和户外点位来自 YARD 主数据，并按南院、北院/入户庭院或全院标识。</p></section>${tableSections}<section><h2>固定 3D 视角截图入口</h2><p>截图时请在应用中关闭编辑控件、选择框和调试层，只保留模型、家具、庭院及必要标注。</p><table><thead><tr><th>楼层</th><th>视角</th><th>说明</th><th>截图入口</th></tr></thead><tbody>${cameraRows}</tbody></table></section></main></body></html>`;
}

function csvCell(value: unknown) {
  const text = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function constructionPackageToCsv(workspace: WorkspaceDocument) {
  const data = buildConstructionPackageData(workspace);
  const fields = ["table", ...constructionPackageRecordFields];
  return [fields, ...data.records.map((record) => fields.map((field) => record[field]))].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function constructionPackageToJson(workspace: WorkspaceDocument) {
  return JSON.stringify(buildConstructionPackageData(workspace), null, 2);
}
