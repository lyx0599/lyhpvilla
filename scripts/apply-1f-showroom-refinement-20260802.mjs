import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateLightingDesignV1 } from "../lib/lighting-design.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260802-before-1f-showroom-refinement.json");
if (!fs.existsSync(backupPath)) fs.copyFileSync(workspacePath, backupPath);

const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const baselineWorkspace = JSON.parse(fs.readFileSync(backupPath, "utf8"));
const structure = workspace.houseStructuresByFloor["1F"];
const now = "2026-08-02T08:00:00.000Z";

function byId(items, id, label) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing ${label}: ${id}`);
  return item;
}

const furniture = (id) => byId(workspace.furniture, id, "furniture");
const room = (id) => byId(structure.rooms, id, "room");
const wall = (id) => byId(structure.walls, id, "wall");
const drawing = (id) => byId(workspace.drawingItems, id, "drawing item");

function setPositionMm(item, xMm, yMm, rotation = item.position.rotation) {
  item.position = { x: xMm / 120, y: yMm / 90, rotation };
}

function upsertFurniture(next) {
  const index = workspace.furniture.findIndex((item) => item.id === next.id);
  if (index >= 0) workspace.furniture[index] = next;
  else workspace.furniture.push(next);
  return next;
}

function upsertDrawingItem(next) {
  const index = workspace.drawingItems.findIndex((item) => item.id === next.id);
  if (index >= 0) workspace.drawingItems[index] = next;
  else workspace.drawingItems.push(next);
  workspace.drawingPackage.drawingItemIds ??= [];
  if (!workspace.drawingPackage.drawingItemIds.includes(next.id)) workspace.drawingPackage.drawingItemIds.push(next.id);
  return next;
}

function upsertRoomTourView(next) {
  const index = workspace.roomTourViews.findIndex((item) => item.id === next.id);
  if (index >= 0) workspace.roomTourViews[index] = next;
  else workspace.roomTourViews.push(next);
  return next;
}

function removeDrawingItem(id) {
  workspace.drawingItems = workspace.drawingItems.filter((item) => item.id !== id);
  workspace.drawingPackage.drawingItemIds = workspace.drawingPackage.drawingItemIds.filter((candidate) => candidate !== id);
  for (const item of workspace.drawingItems) {
    if (Array.isArray(item.relatedLightIds)) item.relatedLightIds = item.relatedLightIds.filter((candidate) => candidate !== id);
    if (Array.isArray(item.controlledLightIds)) item.controlledLightIds = item.controlledLightIds.filter((candidate) => candidate !== id);
  }
}

function linkLightToSwitch(lightId, switchId) {
  const item = drawing(switchId);
  item.controlledLightIds ??= [];
  item.relatedLightIds ??= [];
  if (!item.controlledLightIds.includes(lightId)) item.controlledLightIds.push(lightId);
  if (!item.relatedLightIds.includes(lightId)) item.relatedLightIds.push(lightId);
  item.updatedAt = now;
}

function preserveLightingGenerationIdentity(item) {
  const baseline = byId(baselineWorkspace.drawingItems, item.id, "baseline drawing item");
  item.source = baseline.source;
  item.generatedKey = baseline.generatedKey;
  item.generatedFingerprint = baseline.generatedFingerprint;
}

function baseDrawingItem({ id, roomId, category, type, positionMm, label, notes }) {
  return {
    id,
    floorId: "1F",
    roomId,
    category,
    type,
    positionMm,
    hostObjectId: null,
    hostWallId: null,
    relatedFurnitureId: null,
    heightMm: null,
    circuitId: null,
    materialId: null,
    label,
    notes,
    source: "manual",
    status: "confirmed",
    quantity: 1,
    relatedRoomId: roomId,
    createdAt: now,
    updatedAt: now,
    verificationMeta: {
      status: "estimated",
      source: "visual-estimate",
      sourceNote: "依据用户提供的样板间照片与明确确认；最终尺寸仍需现场复尺",
      toleranceMm: 100
    }
  };
}

function ceilingItem({ id, roomId, polygon, height, label, notes, relatedLightIds = [] }) {
  return {
    ...baseDrawingItem({ id, roomId, category: "ceiling", type: "steppedCoveCeiling", positionMm: polygon[0], label, notes }),
    polygon,
    ceilingHeightMm: height,
    heightMm: height,
    relatedLightIds,
    inspectionAccess: false,
    airVent: false,
    returnAir: false,
    maintenanceOpening: false
  };
}

function makeGenericFurniture({ id, code, name, roomId, dimensions, positionMm, rotation, material, note, assetType = "generic", variantId, elevationMm = 0, primaryMaterial = "warmOak", secondaryMaterial = "oatTaupeLacquer", accentMaterial = "agedBrass", hostWallId }) {
  return {
    id,
    code,
    name,
    type: assetType === "bookshelf" ? "bookshelf" : "custom",
    catalogId: assetType === "bookshelf" ? "storage-bookshelf" : "decor-custom",
    moduleCategory: assetType === "bookshelf" ? "storage" : "decor",
    floorId: "1F",
    roomId,
    roomAssignmentLocked: true,
    ...(hostWallId ? { hostWallId } : {}),
    dimensions: { ...dimensions, unit: "cm" },
    material,
    note,
    constructionNote: note,
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    position: { x: positionMm.x / 120, y: positionMm.y / 90, rotation },
    color: "#c8b59e",
    render3d: {
      assetType,
      detailLevel: "presentation",
      stylePreset: "tuscanWabiSabi",
      primaryMaterial,
      secondaryMaterial,
      accentMaterial,
      visibleIn3d: true,
      selectableIn3d: true,
      childrenMode: "grouped",
      variantId,
      variationSeed: Array.from(id).reduce((seed, character) => ((seed * 33) ^ character.charCodeAt(0)) >>> 0, 5381),
      styleSource: "manual",
      elevationMm
    },
    mepMeta: {
      needsSocket: false,
      socketCount: 0,
      socketHeight: 0,
      needsSwitch: false,
      switchControl: [],
      needsLighting: false,
      lightingType: "none",
      needsWaterSupply: false,
      waterSupplyType: "none",
      needsDrainage: false,
      drainageType: "none",
      needsNetwork: false,
      needsVentilation: false,
      needsSmartControl: false,
      relatedCircuit: "常规插座回路",
      notes: note
    },
    constructionMeta: {
      customMade: true,
      installType: hostWallId ? "wallSecured" : "finishedFurniture",
      reserveSize: `${dimensions.width}x${dimensions.depth}x${dimensions.height}cm`,
      wallDependency: hostWallId ? `绑定 ${hostWallId}，按完成面复尺并采用可逆安装。` : "",
      floorDependency: "按完成面标高校核",
      ceilingDependency: "",
      waterproofRequired: false,
      inspectionAccessRequired: false,
      purchaseCategory: "定制柜体/硬装",
      supplierType: "全屋定制/木作供应商",
      notes: note
    },
    verificationMeta: {
      status: "estimated",
      source: "visual-estimate",
      sourceNote: "依据样板间照片比例估算，用户已确认造型方向，施工前复尺",
      toleranceMm: 100
    }
  };
}

function roomTourOverride({ id, roomId, name, cameraPosition, target, fov, description }) {
  const dx = target.x - cameraPosition.x;
  const dy = target.y - cameraPosition.y;
  const dz = target.z - cameraPosition.z;
  return {
    id,
    floorId: "1F",
    roomId,
    name,
    type: "room",
    cameraPosition,
    target,
    yaw: Math.atan2(dx, dz),
    pitch: Math.atan2(dy, Math.max(0.0001, Math.hypot(dx, dz))),
    fov,
    linkedNodeIds: [],
    description,
    status: "active"
  };
}

// The delivery structure is a hard constraint. This script deliberately does not edit walls, doors, windows, room boundaries, the dining table, or the entry island.

// Living room: diagonal warm-stone floor, shallow wood veneer on the solid east wall, restrained indirect light and a visually unified snack/water-bar composition.
const living = room("ROOM-1F-005");
living.surfaceFinishes.floor = {
  ...living.surfaceFinishes.floor,
  name: "暖米灰石灰岩纹哑光瓷砖",
  pattern: "45°斜向通铺（样板间意向，模块与起铺点待现场放样）",
  directionDeg: 45
};
const livingSolidWall = wall("W-1F-011");
livingSolidWall.name = "客厅东侧实墙 · 浅橡木圆角木饰面";
livingSolidWall.surfaceFinish = {
  material: "woodVeneer",
  name: "浅橡木竖向木饰面 + 圆角收口",
  baseColor: "#b99672",
  textureAccent: "#d8c3aa",
  roughness: 0.64,
  textureScale: 2.2
};

const livingCabinetVisual = {
  frontStyle: "slab",
  handleStyle: "groove",
  panelGapMm: 2,
  endPanelThicknessMm: 20,
  countertopEdge: "thin",
  showCountertopSeams: false,
  showInternalShadowGap: true
};
for (const id of ["furn-living-waterbar-001", "furn-living-waterbar-upper-001", "furn-living-snack-pullout-001"]) {
  const item = furniture(id);
  item.material = id.includes("upper")
    ? "浅橡木木饰面 + 暖灰褐哑光门板 + 柜下灯带"
    : "浅橡木木饰面 + 暖灰褐哑光门板 + 浅色石材";
  item.color = "#b99b7a";
  item.note = "原水吧、吊柜或通顶高柜的功能、尺寸和位置不变；造型统一为浅橡木竖纹、暖灰褐无明装拉手门板、深色细缝与圆角端头。";
  item.constructionNote = "仅调整饰面、分缝、灯光和收口；柜体投影尺寸、功能点位与位置保持不变。";
  item.render3d = {
    ...item.render3d,
    primaryMaterial: "warmOak",
    secondaryMaterial: "oatTaupeLacquer",
    accentMaterial: "agedBrass",
    detailLevel: "presentation",
    kitchenVisual: item.render3d?.kitchenVisual ? { ...item.render3d.kitchenVisual, ...livingCabinetVisual } : undefined,
    cabinetVisual: item.render3d?.cabinetVisual ? { ...item.render3d.cabinetVisual, frontStyle: "slab", handleStyle: "groove", interiorLighting: true } : undefined
  };
}

upsertDrawingItem({
  ...baseDrawingItem({
    id: "F-1F-LIVING-SHOWROOM-01",
    roomId: living.id,
    category: "floorFinish",
    type: "diagonalStoneTile",
    positionMm: { x: 6585, y: 5425 },
    label: "1F 客厅暖色石材斜向地面",
    notes: "沿用现有地面完成面，不改标高；采用样板间暖米色石材气质与 45° 斜向关系，具体砖板尺寸、对缝和起铺点待现场排版。"
  }),
  material: "tile",
  pattern: living.surfaceFinishes.floor.pattern,
  directionDeg: 45,
  seamWidthMm: 2,
  area: living.area / 1_000_000,
  transition: "与厨房门槛同色窄缝收口"
});
upsertDrawingItem({
  ...baseDrawingItem({
    id: "WFIN-1F-LIVING-EAST-01",
    roomId: living.id,
    category: "wallFinish",
    type: "woodVeneer",
    positionMm: { x: 9495, y: 5425 },
    label: "1F 客厅东侧实墙浅橡木木饰面",
    notes: "中间套无样板间边窗，此处保留完整实墙；只加浅层木饰面、竖向分缝和圆角收口，不开洞、不动墙。"
  }),
  hostWallId: livingSolidWall.id,
  wallId: livingSolidWall.id,
  material: "woodVeneer",
  heightRange: { minMm: 0, maxMm: 2720 },
  specialTreatment: "圆角端头 + 深色 2–3mm 阴缝"
});

const livingCeilings = [
  ["C-1F-LIVING-PERIMETER-N", [{ x: 3676, y: 3050 }, { x: 9495, y: 3050 }, { x: 9495, y: 3410 }, { x: 3676, y: 3410 }]],
  ["C-1F-LIVING-PERIMETER-E", [{ x: 9135, y: 3410 }, { x: 9495, y: 3410 }, { x: 9495, y: 7440 }, { x: 9135, y: 7440 }]],
  ["C-1F-LIVING-PERIMETER-S", [{ x: 3897, y: 7440 }, { x: 9495, y: 7440 }, { x: 9495, y: 7800 }, { x: 3897, y: 7800 }]],
  ["C-1F-LIVING-PERIMETER-W1", [{ x: 3676, y: 3410 }, { x: 4036, y: 3410 }, { x: 4036, y: 5150 }, { x: 3676, y: 5150 }]],
  ["C-1F-LIVING-PERIMETER-W2", [{ x: 3897, y: 5150 }, { x: 4036, y: 5150 }, { x: 4036, y: 7440 }, { x: 3897, y: 7440 }]]
];
for (const [id, polygon] of livingCeilings) upsertDrawingItem(ceilingItem({
  id,
  roomId: living.id,
  polygon,
  height: 2720,
  label: "1F 客厅轻薄周边跌级吊顶",
  notes: "周边局部下落 80mm，形成连续柔和灯槽；中央净高保持 2800mm。"
}));
upsertDrawingItem(ceilingItem({
  id: "C-1F-LIVING-CENTER",
  roomId: living.id,
  polygon: [{ x: 4036, y: 3410 }, { x: 9135, y: 3410 }, { x: 9135, y: 7440 }, { x: 4036, y: 7440 }],
  height: 2800,
  label: "1F 客厅中央原顶",
  notes: "中央区域保持原 2800mm 净高，不做厚重满吊。"
}));
upsertDrawingItem({
  ...baseDrawingItem({
    id: "L-1F-SHOWROOM-LIVING-COVE-01",
    roomId: living.id,
    category: "light",
    type: "indirectCoveStrip",
    positionMm: { x: 6585, y: 5425 },
    label: "1F 客厅连续周边灯槽",
    notes: "2700K 暖光、不可见光源、独立调光；以间接光为主，中央不增加密集筒灯。"
  }),
  heightMm: 2740,
  source: "generated-from-room",
  status: "draft",
  lightType: "indirectLinearLight",
  lightingLayer: "decorative",
  colorTemperature: "2700K",
  lightColorTemperature: "2700K",
  beamAngle: 120,
  mountingType: "concealed",
  hostCeilingAreaId: "C-1F-LIVING-PERIMETER-N",
  relatedSwitchId: "SW-1F-V1-24",
  controlGroupId: "CG-1F-1F-005-CURTAIN",
  lightGroupId: "CG-1F-1F-005-CURTAIN",
  smartControl: true,
  needsSmartControl: true,
  dimming: true,
  lightSpec: { powerW: 14, cri: 95, glareRating: "不可见光源", fixtureFamily: "continuous-cove-strip", trimColor: "隐藏安装" }
});
linkLightToSwitch("L-1F-SHOWROOM-LIVING-COVE-01", "SW-1F-V1-24");
for (const id of ["L-1F-V1-24", "L-1F-V1-25"]) {
  const item = drawing(id);
  item.status = "draft";
  item.notes = "仅保留少量深杯防眩基础照明，2700K、可调光；避开沙发与餐桌视线，不形成密集筒灯网格。";
  item.updatedAt = now;
  preserveLightingGenerationIdentity(item);
}
Object.assign(drawing("L-1F-V1-29"), {
  positionMm: { x: 6976, y: 7650 },
  hostWallId: "W-1F-015",
  label: "L-1F-V1-29 · 客厅实际南窗窗帘盒灯带",
  notes: "只服务中间套实际保留的南侧观景窗；东侧实墙不设置窗帘。2700K 低亮度并与主照明分组。",
  status: "draft",
  updatedAt: now
});
preserveLightingGenerationIdentity(drawing("L-1F-V1-29"));

// Kitchen: preserve every cabinet footprint and the fridge bay; copy the sample-room finish language and replace the double sink with one large sink.
const kitchen = room("ROOM-1F-002");
kitchen.surfaceFinishes.floor = {
  ...kitchen.surfaceFinishes.floor,
  name: "暖米灰石灰岩纹哑光瓷砖",
  pattern: "45°斜向通铺（与客餐厅连续，起铺点待现场放样）",
  directionDeg: 45
};
const kitchenDesign = {
  template: "kitchenCabinet",
  title: "1F 样板间 U 型厨房",
  designThinking: "不改变 2298×2700mm 厨房边界与 U 型柜体投影，左侧烹饪、北侧窗下洗涤、右侧备餐，南端独立留冰箱。",
  recommendedPlacement: "现有 U 型位置保持不变；冰箱继续独立放在右侧空位，不做柜壳包覆。",
  layoutNotes: [
    "北侧窗下设置 800mm 大单槽，主龙头与净水龙头分设",
    "柜门采用暖灰褐哑光无明装拉手，台面与墙面用浅色细纹石材连续处理",
    "左侧灶具上方采用隐藏式烟机，右侧 900mm 备餐台不得侵占冰箱空位",
    "转角增加深棕/古铜三层置物架，柜下灯带提供台面任务光"
  ],
  zones: [
    { id: "cook-left", label: "左侧烹饪", role: "烹饪 / 排烟", widthPercent: 32, heightPercent: 100, detail: "现有 2000mm 左侧柜段不动，隐藏烟机与暖灰褐柜门统一。", serviceNote: "复核烟道、燃气/电源和止逆阀。" },
    { id: "window-sink", label: "窗下大单槽", role: "洗涤 / 净水", widthPercent: 38, heightPercent: 100, detail: "2100mm 窗下柜段中置 800mm 单槽。", serviceNote: "冷热水、净水、排水与检修集中复核。" },
    { id: "prep-fridge-right", label: "右侧备餐与冰箱", role: "备餐 / 冷藏", widthPercent: 30, heightPercent: 100, detail: "保留 900mm 备餐台和 920mm 独立冰箱位。", serviceNote: "冰箱两侧、背部、顶部及开门按设备说明留空。" }
  ],
  cautionNotes: [
    "内部通道按当前模型约 1198mm，最终以完成面复尺；不通过移动隔墙换取画面效果。",
    "水槽、净水龙头、烟机、插座与台面开孔必须在下单前由现场和设备样本共同确认。"
  ]
};
const kitchenBaseVisual = {
  countertopThicknessMm: 20,
  backsplashHeightMm: 600,
  toeKickHeightMm: 90,
  overhangMm: 15,
  frontStyle: "slab",
  handleStyle: "groove",
  countertopEdge: "thin",
  panelGapMm: 2,
  endPanelThicknessMm: 20,
  showCountertopSeams: false,
  showInternalShadowGap: true
};
for (const id of ["furn-kitchen-run-001", "furn-kitchen-u-left-run", "furn-kitchen-u-right-run"]) {
  const item = furniture(id);
  if (id === "furn-kitchen-run-001") item.name = "U型橱柜靠窗大单槽（水槽）段";
  item.cabinetDesign = kitchenDesign;
  item.material = "暖灰褐哑光门板 + 浅色细纹石材台面/墙面 + 深色踢脚";
  item.color = "#b8aa9a";
  const runDescription = id === "furn-kitchen-run-001"
    ? "北侧窗下 2100mm 大单槽柜段"
    : id === "furn-kitchen-u-left-run"
      ? "左侧 2000mm 灶台柜段"
      : "右侧 900mm 备餐柜段";
  item.note = `${runDescription}的尺寸和位置不变；参照样板间统一哑光平板、隐形拉手、深色踢脚与浅色细纹石材。`;
  item.constructionNote = `${runDescription}保持现有投影；下单前复核墙面完成面、设备、门窗和点位。`;
  item.render3d = {
    ...item.render3d,
    primaryMaterial: "oatTaupeLacquer",
    secondaryMaterial: "travertine",
    accentMaterial: "agedBrass",
    kitchenVisual: {
      ...item.render3d.kitchenVisual,
      ...kitchenBaseVisual,
      showUpperCabinets: id !== "furn-kitchen-run-001",
      showRangeHood: id === "furn-kitchen-u-left-run"
    }
  };
  item.mepMeta.notes = item.constructionNote;
  item.constructionMeta.notes = item.constructionNote;
}

const sink = furniture("furn-sink-001");
sink.name = "窗下居中 800mm 大单槽";
sink.dimensions = { width: 80, depth: 48, height: 20, unit: "cm" };
setPositionMm(sink, 6528, 675, 0);
sink.material = "不锈钢台下大单槽 + 主龙头 + 独立净水龙头";
sink.note = "按样板间改为窗下居中大单槽，主龙头和净水龙头分设；不改变窗下柜段位置。";
sink.constructionNote = "建议成品外框 750–850mm，本模型按 800×480mm 表示；台面开孔、龙头孔和给排水施工前按实物复尺。";
sink.render3d = {
  ...sink.render3d,
  primaryMaterial: "brushedSteel",
  secondaryMaterial: "agedBrass",
  accentMaterial: "warmWhiteCeramic",
  elevationMm: 700,
  kitchenVisual: { ...sink.render3d.kitchenVisual, sinkBowls: 1, faucetPlacement: "center", countertopThicknessMm: 20 }
};
sink.constructionMeta.reserveSize = "80x48x20cm";
sink.constructionMeta.notes = sink.constructionNote;
sink.mepMeta.notes = sink.constructionNote;
sink.lightingDesignExcluded = true;
sink.constructionAnchors.openingSizeMm = { width: 760, depth: 440 };
sink.constructionAnchors.notes = "点位坐标相对大单槽对象；主龙头与净水龙头孔位按成品模板深化。";
workspace.furniture = workspace.furniture.filter((item) => item.id !== "furn-sink-002");

const fridge = furniture("furn-fridge-001");
fridge.material = "独立成品冰箱（右侧留白区，不做柜壳包覆）";
fridge.note = "保持 920×700×1900mm 和当前位置；右侧空地专用于冰箱，四周散热与正面开门净空按设备说明保留。";
fridge.constructionNote = "严禁用新增高柜侵占冰箱位；现场复核门体 90° 以上开启、抽屉全拉出、插座与散热。";
fridge.render3d.kitchenVisual = { ...(fridge.render3d.kitchenVisual ?? {}), fridgeSurround: "none" };
fridge.constructionAnchors ??= { points: [] };
fridge.constructionAnchors.ventilationClearanceMm = { top: 100, left: 50, right: 50, rear: 100 };
fridge.constructionAnchors.notes = "散热净距为模型预留建议，最终以选定冰箱说明书为准。";
fridge.constructionMeta.notes = fridge.constructionNote;
fridge.mepMeta.notes = fridge.constructionNote;

upsertFurniture(makeGenericFurniture({
  id: "furn-kitchen-corner-spice-rack-001",
  code: "KR-1F-SPICE-01",
  name: "厨房左上角三层置物架",
  roomId: kitchen.id,
  dimensions: { width: 45, depth: 16, height: 72 },
  positionMm: { x: 5650, y: 1030 },
  rotation: 90,
  material: "深棕木层板 + 古铜细框",
  note: "参照样板间在左侧转角台面上设置三层轻量置物架；仅放调料和常用小物，不遮窗、不压灶具安全区。",
  assetType: "bookshelf",
  variantId: "openShelves",
  elevationMm: 900,
  primaryMaterial: "darkWalnut",
  secondaryMaterial: "warmOak",
  accentMaterial: "agedBrass"
}));
upsertDrawingItem({
  ...baseDrawingItem({
    id: "F-1F-KITCHEN-SHOWROOM-01",
    roomId: kitchen.id,
    category: "floorFinish",
    type: "diagonalStoneTile",
    positionMm: { x: 6532, y: 1700 },
    label: "1F 厨房暖色石材斜向地面",
    notes: "与客餐厅使用同一暖米色石材语言和 45° 方向；不改地面标高，具体对缝在门槛和柜脚位置现场排版。"
  }),
  material: "tile",
  pattern: kitchen.surfaceFinishes.floor.pattern,
  directionDeg: 45,
  seamWidthMm: 2,
  area: kitchen.area / 1_000_000,
  transition: "双移门下同色窄缝连续收口"
});
removeDrawingItem("L-1F-V1-11");
Object.assign(drawing("L-1F-V1-10"), {
  positionMm: { x: 6528, y: 255 },
  relatedFurnitureId: sink.id,
  relatedFurniturePositionMm: { x: 6528, y: 675 },
  label: "L-1F-V1-10 · 厨房大单槽任务灯",
  notes: "单灯对准 800mm 大单槽操作者前上方，避免身体遮光；与窗扇、吊顶及风口复核。",
  status: "draft",
  updatedAt: now
});
preserveLightingGenerationIdentity(drawing("L-1F-V1-10"));
Object.assign(drawing("L-1F-V1-04"), {
  notes: "厨房只保留必要的深杯防眩基础光，台面主要由柜下灯和水槽/灶台任务光承担；不做密集筒灯网格。",
  status: "draft",
  updatedAt: now
});
preserveLightingGenerationIdentity(drawing("L-1F-V1-04"));

// Bedroom: preserve bed, wardrobe, window and bay geometry; add a shallow headboard panel, removable bay cushion, light cove, pendants and a visual wardrobe reskin.
const bedroom = room("ROOM-1F-004");
const wardrobe = furniture("module-1f-wardrobe-001");
wardrobe.name = "1F 卧室暖灰褐通顶衣柜";
wardrobe.material = "浅橡木/暖灰褐哑光平板门 + 隐形拉手 + 圆角外露端板";
wardrobe.note = "原 2500×500×2400mm 柜体和位置不变；仅参照样板间调整门板、分缝、拉手与外露端头。";
wardrobe.constructionNote = "保持现有投影尺寸与内部功能；外露端板做柔和圆角，柜顶与吊顶留可控阴缝。";
wardrobe.color = "#b5a692";
wardrobe.render3d = {
  ...wardrobe.render3d,
  primaryMaterial: "oatTaupeLacquer",
  secondaryMaterial: "warmOak",
  accentMaterial: "agedBrass",
  cabinetVisual: { frontStyle: "slab", handleStyle: "groove", doorCount: 4, interiorLighting: true }
};
wardrobe.constructionMeta.notes = wardrobe.constructionNote;

const bed = furniture("module-1f-bed-002");
bed.material = "暖米灰织物床架 + 独立浅层软包床头背景";
bed.note = "床的 1500×2000mm 尺寸和位置不变；床后增加可逆浅层软包背景，不挪床、不改墙。";
bed.render3d = { ...bed.render3d, primaryMaterial: "beigeFabric", secondaryMaterial: "creamFabric", accentMaterial: "taupeFabric" };

upsertFurniture(makeGenericFurniture({
  id: "furn-1f-bedroom-headboard-panel-001",
  code: "HB-1F-BED-01",
  name: "1F 卧室浅层软包床头背景",
  roomId: bedroom.id,
  dimensions: { width: 240, depth: 5, height: 230 },
  positionMm: { x: 975, y: 6600 },
  rotation: 90,
  material: "暖米灰织物软包 + 浅橡木细边 + 竖向分缝",
  note: "2400×50×2300mm 浅层可逆安装床头背景，控制厚度不侵占床侧通道；避开插座、开关和床头柜。",
  assetType: "generic",
  variantId: "upholsteredWallPanel",
  primaryMaterial: "beigeFabric",
  secondaryMaterial: "warmOak",
  accentMaterial: "agedBrass",
  hostWallId: "W-1F-010"
}));
upsertFurniture(makeGenericFurniture({
  id: "furn-1f-bedroom-bay-cushion-001",
  code: "BC-1F-BAY-01",
  name: "1F 卧室飘窗可移动坐垫",
  roomId: bedroom.id,
  dimensions: { width: 120, depth: 55, height: 12 },
  positionMm: { x: 2538, y: 8075 },
  rotation: 0,
  material: "暖米灰可拆洗织物 + 高回弹薄垫",
  note: "仅放置在现有 1200×550mm 飘窗台上的可移动薄垫；不封窗、不改窗，开启内开窗前可直接取下。",
  assetType: "generic",
  variantId: "removableBayCushion",
  elevationMm: 550,
  primaryMaterial: "beigeFabric",
  secondaryMaterial: "creamFabric",
  accentMaterial: "taupeFabric"
}));

const bedroomCeilings = [
  ["C-1F-BEDROOM-PERIMETER-N", [{ x: 950, y: 5150 }, { x: 3897, y: 5150 }, { x: 3897, y: 5450 }, { x: 950, y: 5450 }]],
  ["C-1F-BEDROOM-PERIMETER-E", [{ x: 3597, y: 5450 }, { x: 3897, y: 5450 }, { x: 3897, y: 7500 }, { x: 3597, y: 7500 }]],
  ["C-1F-BEDROOM-PERIMETER-S", [{ x: 950, y: 7500 }, { x: 3897, y: 7500 }, { x: 3897, y: 7800 }, { x: 950, y: 7800 }]],
  ["C-1F-BEDROOM-PERIMETER-W", [{ x: 950, y: 5450 }, { x: 1250, y: 5450 }, { x: 1250, y: 7500 }, { x: 950, y: 7500 }]]
];
for (const [id, polygon] of bedroomCeilings) upsertDrawingItem(ceilingItem({
  id,
  roomId: bedroom.id,
  polygon,
  height: 2720,
  label: "1F 卧室轻薄周边跌级吊顶",
  notes: "周边下落 80mm 形成轻灯槽和窗帘盒关系，中央保持原 2800mm 净高。"
}));
upsertDrawingItem(ceilingItem({
  id: "C-1F-BEDROOM-CENTER",
  roomId: bedroom.id,
  polygon: [{ x: 1250, y: 5450 }, { x: 3597, y: 5450 }, { x: 3597, y: 7500 }, { x: 1250, y: 7500 }],
  height: 2800,
  label: "1F 卧室中央原顶",
  notes: "中央保持 2800mm 原净高，不做厚重满吊。"
}));
upsertDrawingItem({
  ...baseDrawingItem({
    id: "L-1F-SHOWROOM-BEDROOM-COVE-01",
    roomId: bedroom.id,
    category: "light",
    type: "indirectCoveStrip",
    positionMm: { x: 2424, y: 6475 },
    label: "1F 卧室周边柔光灯槽",
    notes: "2700K、不可见光源、可调光，与床头吊灯分组；作为卧室主氛围光。"
  }),
  heightMm: 2740,
  source: "generated-from-room",
  status: "draft",
  lightType: "indirectLinearLight",
  lightingLayer: "decorative",
  colorTemperature: "2700K",
  lightColorTemperature: "2700K",
  beamAngle: 120,
  mountingType: "concealed",
  hostCeilingAreaId: "C-1F-BEDROOM-PERIMETER-N",
  relatedSwitchId: "SW-1F-V1-19",
  controlGroupId: "CG-1F-1F-004-CURTAIN",
  lightGroupId: "CG-1F-1F-004-CURTAIN",
  smartControl: true,
  needsSmartControl: true,
  dimming: true,
  lightSpec: { powerW: 10, cri: 95, glareRating: "不可见光源", fixtureFamily: "continuous-cove-strip", trimColor: "隐藏安装" }
});
linkLightToSwitch("L-1F-SHOWROOM-BEDROOM-COVE-01", "SW-1F-V1-19");

const bedroomPendants = [
  ["L-1F-V1-18", "北侧", { x: 1220, y: 5550 }],
  ["L-1F-V1-19", "南侧", { x: 1220, y: 7575 }]
];
for (const [id, side, positionMm] of bedroomPendants) {
  const item = drawing(id);
  Object.assign(item, {
    type: "slenderBedsidePendant",
    lightType: "bedsidePendant",
    positionMm,
    heightMm: 1350,
    mountingType: "pendant",
    beamAngle: 30,
    label: `${id} · 卧室${side}细长床头吊灯`,
    notes: "2700K 细长吊灯，落点对准现有床头柜且左右独立调光；床、床头柜位置不变，最终吊线长度按床垫完成面复核。",
    status: "draft",
    updatedAt: now,
    lightSpec: { powerW: 5, luminousFluxLm: 320, cri: 95, glareRating: "低亮独立调光", fixtureFamily: "slender-bedside-pendant", trimColor: "做旧黄铜 / 暖棕" }
  });
  preserveLightingGenerationIdentity(item);
}
Object.assign(drawing("L-1F-V1-23"), {
  positionMm: { x: 2538, y: 7650 },
  hostWallId: "W-1F-014",
  hostCeilingAreaId: "C-1F-BEDROOM-PERIMETER-S",
  label: "L-1F-V1-23 · 卧室飘窗隐藏窗帘盒灯带",
  notes: "服务现有南侧内开飘窗；采用暖色柔光帘/罗马帘意向，窗帘盒与内开窗扇、检修空间共同复核。",
  status: "draft",
  updatedAt: now
});
preserveLightingGenerationIdentity(drawing("L-1F-V1-23"));

upsertDrawingItem({
  ...baseDrawingItem({
    id: "A-1F-BEDROOM-WINDOW-01",
    roomId: bedroom.id,
    category: "annotation",
    type: "curtainAndBayNote",
    positionMm: { x: 2538, y: 7800 },
    label: "1F 卧室飘窗软装与开启约束",
    notes: "窗洞、窗扇与飘窗尺寸完全保留；只增加可拆薄垫和暖色柔光帘。任何帘盒/坐垫不得阻碍内开窗。"
  }),
  hostWallId: "W-1F-014",
  relatedFurnitureId: "furn-1f-bedroom-bay-cushion-001",
  relatedFurniturePositionMm: { x: 2538, y: 8075 },
  specialTreatment: "可逆安装；内开窗净空优先"
});

// The former automatic room cameras sat behind the fridge or inside large furniture.
// These presentation-only overrides improve review visibility without moving any object.
upsertRoomTourView(roomTourOverride({
  id: "tour-1F-ROOM-1F-002",
  roomId: "ROOM-1F-002",
  name: "厨房",
  cameraPosition: { x: 0.5, y: 1.45, z: -1.62 },
  target: { x: 0.5, y: 1.08, z: -3.58 },
  fov: 66,
  description: "从厨房南侧双移门内侧看向窗下大单槽，避开右侧冰箱与两侧柜体遮挡。"
}));
upsertRoomTourView(roomTourOverride({
  id: "tour-1F-ROOM-1F-005",
  roomId: "ROOM-1F-005",
  name: "客厅",
  cameraPosition: { x: 2.35, y: 1.48, z: 0.05 },
  target: { x: -1.35, y: 0.98, z: 1.82 },
  fov: 64,
  description: "从客厅东北侧公共通道看向沙发与电视壁炉墙，避开圆桌、沙发和落地灯遮挡。"
}));
upsertRoomTourView(roomTourOverride({
  id: "tour-1F-ROOM-1F-004",
  roomId: "ROOM-1F-004",
  name: "卧室",
  cameraPosition: { x: -2.98, y: 1.45, z: 0.92 },
  target: { x: -4.68, y: 1.02, z: 2.18 },
  fov: 68,
  description: "从卧室北侧通道看向床头软包与飘窗，避开床体和衣柜遮挡。"
}));

workspace.updatedAt = now;
workspace.revision = Math.max(Number(workspace.revision) || 0, 9);
workspace.drawingPackage.updatedAt = now;

// Keep the generated-lighting engine idempotent after adding explicit ceiling hosts,
// while preserving the user-approved positions and fixture language above.
const lightingPreview = generateLightingDesignV1({
  structuresByFloor: workspace.houseStructuresByFloor,
  furniture: workspace.furniture,
  existingItems: workspace.drawingItems,
  floorIds: workspace.floors.map((floor) => floor.id),
  now
});
if (lightingPreview.created !== 0) throw new Error(`Lighting refinement would create ${lightingPreview.created} unexpected generated item(s).`);
const previewByGeneratedKey = new Map(lightingPreview.items.filter((item) => item.generatedKey).map((item) => [item.generatedKey, item]));
for (const item of workspace.drawingItems) {
  if (!item.generatedKey) continue;
  const preview = previewByGeneratedKey.get(item.generatedKey);
  if (preview?.generatedFingerprint) item.generatedFingerprint = preview.generatedFingerprint;
}

fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);
console.log("Applied confirmed 1F showroom refinement without changing delivery partitions, doors, windows, dining table or entry island.");
