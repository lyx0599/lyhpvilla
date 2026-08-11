import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncRelatedDrawingItemsToFurniture } from "../lib/furniture-placement.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const structure = workspace.houseStructuresByFloor.B1;
const now = "2026-08-03T02:30:00.000Z";

function byId(items, id, label) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing ${label}: ${id}`);
  return item;
}

const room = (id) => byId(structure.rooms, id, "room");
const wall = (id) => byId(structure.walls, id, "wall");
const furniture = (id) => byId(workspace.furniture, id, "furniture");

function polygonArea(points) {
  return Math.round(Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2);
}

function setPositionMm(item, xMm, yMm, rotation = item.position.rotation) {
  item.position = {
    x: (xMm - structure.coordinateSystem.origin.x) / structure.coordinateSystem.width * 100,
    y: (yMm - structure.coordinateSystem.origin.y) / structure.coordinateSystem.height * 100,
    rotation
  };
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

function removeDrawingItems(ids) {
  const removed = new Set(ids);
  workspace.drawingItems = workspace.drawingItems.filter((item) => !removed.has(item.id));
  workspace.drawingPackage.drawingItemIds = workspace.drawingPackage.drawingItemIds.filter((id) => !removed.has(id));
  for (const item of workspace.drawingItems) {
    if (Array.isArray(item.relatedLightIds)) item.relatedLightIds = item.relatedLightIds.filter((id) => !removed.has(id));
    if (Array.isArray(item.controlledLightIds)) item.controlledLightIds = item.controlledLightIds.filter((id) => !removed.has(id));
    if (item.relatedSwitchId && removed.has(item.relatedSwitchId)) item.relatedSwitchId = null;
  }
}

function verification(sourceNote) {
  return {
    status: "estimated",
    source: "visual-estimate",
    sourceNote,
    toleranceMm: 100
  };
}

function makeBuiltIn({ id, code, name, dimensions, positionMm, rotation, hostWallId, variantId, material, note }) {
  return {
    id,
    code,
    name,
    type: "custom",
    moduleCategory: "storage",
    moduleType: "cabinet",
    floorId: "B1",
    roomId: "ROOM-B1-001",
    roomAssignmentLocked: true,
    hostWallId,
    dimensions: { ...dimensions, unit: "cm" },
    cabinetHeight: { kind: "fullHeight", topClosureMm: 100, source: "explicit" },
    material,
    note,
    constructionNote: `${note} 所有尺寸须按墙面、地面完成面及设备实物复尺。`,
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    position: {
      x: positionMm.x / structure.coordinateSystem.width * 100,
      y: positionMm.y / structure.coordinateSystem.height * 100,
      rotation
    },
    color: "#c8b69a",
    render3d: {
      assetType: "generic",
      variantId,
      detailLevel: "presentation",
      stylePreset: "modernNatural",
      primaryMaterial: "warmOak",
      secondaryMaterial: "travertine",
      accentMaterial: "blackTitanium",
      visibleIn3d: true,
      selectableIn3d: true,
      childrenMode: "grouped",
      styleSource: "manual",
      styleLocked: true,
      variationSeed: Array.from(id).reduce((seed, character) => ((seed * 33) ^ character.charCodeAt(0)) >>> 0, 5381)
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
      relatedCircuit: "无",
      notes: note
    },
    constructionMeta: {
      customMade: true,
      installType: "builtIn",
      reserveSize: `${dimensions.width}x${dimensions.depth}x${dimensions.height}cm`,
      wallDependency: `绑定 ${hostWallId}，按完成面复尺并校核阴影缝。`,
      floorDependency: "按完成面标高复核并做好防潮封边",
      ceilingDependency: "柜顶保留约100mm收口，按2800mm现有层高复核",
      waterproofRequired: true,
      inspectionAccessRequired: variantId === "b1ShowroomToiletCabinetWall",
      purchaseCategory: "定制柜体/硬装",
      supplierType: "全屋定制/木作供应商",
      notes: note
    },
    clearanceMeta: variantId === "b1ShowroomToiletCabinetWall" ? { frontMm: 700, sideMm: 100, serviceMm: 400 } : { frontMm: 900, sideMm: 10, serviceMm: 600 },
    verificationMeta: verification("依据用户确认的B1洗衣房全部硬装调整及专项视频00:00–00:05估算；建筑外框和层高不变，洗衣房东侧非结构内隔墙向西移动250mm")
  };
}

function baseDrawingItem({ id, category, type, positionMm, label, notes }) {
  return {
    id,
    floorId: "B1",
    roomId: "ROOM-B1-001",
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
    relatedRoomId: "ROOM-B1-001",
    createdAt: now,
    updatedAt: now,
    verificationMeta: verification("依据用户确认的B1洗衣房方案A及专项视频；具体材料型号、排版起点和柜体加工尺寸施工前复核")
  };
}

// Approved revision B1-LAUNDRY-SIZE-01: retain the building envelope and room
// depth, but reduce the compact laundry/powder room width by moving its east
// non-structural partition 250mm west. The adjacent B1 room receives the area.
const laundryRoom = room("ROOM-B1-001");
const adjacentRoom = room("ROOM-B1-002");
const revisedEastX = 5750;
const geometryVerification = verification("B1洗衣房视频00:00–00:06显示洗烘塔与较短台盆柜组成紧凑空间；用户确认按偏小方向全部调整。建筑外轮廓不变，仅内部房间分界估算调整", 100);

laundryRoom.boundary = [
  { x: 3947, y: 350 },
  { x: revisedEastX, y: 350 },
  { x: revisedEastX, y: 1800 },
  { x: 3947, y: 1800 }
];
laundryRoom.area = polygonArea(laundryRoom.boundary);
laundryRoom.verificationMeta = geometryVerification;

adjacentRoom.boundary = [
  { x: revisedEastX, y: 350 },
  { x: 9495, y: 350 },
  { x: 9495, y: 3117 },
  { x: 5281, y: 3117 },
  { x: 3947, y: 3117 },
  { x: 3947, y: 1800 },
  { x: revisedEastX, y: 1800 }
];
adjacentRoom.area = polygonArea(adjacentRoom.boundary);
adjacentRoom.verificationMeta = geometryVerification;

Object.assign(wall("W-B1-001"), {
  end: { x: revisedEastX, y: 350 },
  length: revisedEastX - 3947,
  verificationMeta: geometryVerification
});
Object.assign(wall("W-B1-002"), {
  start: { x: revisedEastX, y: 350 },
  length: 9495 - revisedEastX,
  verificationMeta: geometryVerification
});
Object.assign(wall("W-B1-015"), {
  start: { x: revisedEastX, y: 350 },
  end: { x: revisedEastX, y: 1800 },
  length: 1450,
  verificationMeta: geometryVerification
});
Object.assign(wall("W-B1-016"), {
  start: { x: revisedEastX, y: 1800 },
  length: revisedEastX - 3947,
  verificationMeta: geometryVerification
});

const laundryDoor = byId(structure.doors, "D-B1-001", "door");
laundryDoor.positionOnWall = 0.5;
laundryDoor.verificationMeta = geometryVerification;

laundryRoom.surfaceFinishes = {
  floor: {
    material: "stone",
    name: "暖米色哑光洞石纹大板防滑地面",
    baseColor: "#ddd0b8",
    jointColor: "#c7b89f",
    textureAccent: "#eee3d0",
    roughness: 0.78,
    tileWidthMm: 900,
    tileLengthMm: 1800,
    seamWidthMm: 1.5,
    directionDeg: 0,
    textureScale: 2.2
  },
  wall: {
    material: "woodVeneerPanel",
    name: "暖灰浅橡木竖纹防水饰面（墙地10mm深古铜阴影缝）",
    baseColor: "#c9b99f",
    textureAccent: "#a89578",
    roughness: 0.78,
    textureScale: 0.72
  }
};

// Back wall: 670mm open washer/dryer niche plus a compact 1130mm vanity run.
const washer = furniture("furn-b1-laundry-washer-001");
setPositionMm(washer, 4282, 685, 0);
washer.name = "B1 洗烘叠放机组（嵌入开放柜）";
washer.note = "设备规格保持600x620x1700mm不变，仅移入样板间左侧670mm到顶开放柜；两侧各约10mm设备净缝。";
washer.constructionNote = "使用原厂叠放件和防倾倒固定；柜内电源、给水、排水、散热和检修不得被侧板封死。";
washer.roomAssignmentLocked = true;
washer.hostWallId = "W-B1-001";
washer.clearanceMeta = { frontMm: 900, sideMm: 10, serviceMm: 600 };
washer.verificationMeta = verification("专项视频显示洗烘叠放设备位于正面墙左端；设备本身尺寸沿用现有型号，位置按现有2053mm墙宽适配")

const vanity = furniture("furn-b1-bath-vanity-001");
vanity.name = "B1 样板间一体式落地台盆柜";
vanity.dimensions = { width: 113, depth: 53, height: 86, unit: "cm" };
vanity.material = "竖纹浅橡木防潮平板柜门 + 暖米白哑光洞石台面 + 矩形台下盆";
vanity.note = "正面墙右侧1130mm紧凑连续落地柜，三扇平板门、无明装拉手；上方保持完整木饰面，不设镜柜和装饰画。";
vanity.constructionNote = "1130x530x860mm估算；台面约45mm厚、矩形台下盆，柜门竖纹通顺，墙地以约10mm深色阴影缝收口。";
setPositionMm(vanity, 5185, 615, 0);
vanity.roomAssignmentLocked = true;
vanity.hostWallId = "W-B1-001";
vanity.render3d = {
  ...vanity.render3d,
  assetType: "bathroomVanity",
  variantId: "handleless",
  detailLevel: "presentation",
  stylePreset: "modernNatural",
  primaryMaterial: "warmOak",
  secondaryMaterial: "travertine",
  accentMaterial: "brushedBronze",
  visibleIn3d: true,
  selectableIn3d: true,
  childrenMode: "grouped",
  styleSource: "manual",
  styleLocked: true,
  cabinetVisual: { frontStyle: "slab", handleStyle: "groove", allDoorPanels: true, layout: "panels", doorCount: 3 },
  wetAreaVisual: {
    fixtureKind: "vanity",
    basinCount: 1,
    basinShape: "rectangular",
    countertopThicknessMm: 45,
    floating: false,
    mirrorStyle: "none",
    frameFinish: "bronze",
    mirrorHeightMm: 0,
    mirrorCabinetDepthMm: 0
  }
};
vanity.mepMeta = {
  ...vanity.mepMeta,
  needsSocket: true,
  socketCount: 2,
  socketHeight: 1100,
  needsSwitch: false,
  switchControl: [],
  needsLighting: false,
  lightingType: "none",
  lightColorTemperature: null,
  notes: "台盆冷热水、墙排和两个防溅插座随正面墙新柜定位；不预留镜柜灯。"
};
vanity.constructionMeta = {
  ...vanity.constructionMeta,
  customMade: true,
  installType: "customCabinet",
  reserveSize: "113x53x86cm",
  wallDependency: "绑定 W-B1-001，安装前按墙面完成面复尺并与左侧洗烘开放柜共用收口线。",
  floorDependency: "落地柜按完成面标高复核，底部防潮并设置约10mm深色阴影收口",
  ceilingDependency: "上方保持完整墙面，不设置镜柜",
  waterproofRequired: true,
  inspectionAccessRequired: true,
  purchaseCategory: "定制柜体/硬装",
  supplierType: "全屋定制/木作供应商",
  notes: vanity.constructionNote
};
vanity.constructionAnchors = {
  ...vanity.constructionAnchors,
  points: (vanity.constructionAnchors?.points ?? []).map((point) => point.type === "power" ? { ...point, label: "台面防溅插座", positionMm: { x: 500, y: 1100, z: -245 } } : point),
  openingSizeMm: { width: 240, depth: 190 },
  installationHeightMm: 860,
  notes: "给排水和防溅插座随正面墙台盆柜中心线重新定位；不设置镜柜灯电源。"
};
vanity.clearanceMeta = { frontMm: 700, sideMm: 10, serviceMm: 400 };
vanity.lightingDesignExcluded = true;
vanity.cabinetDesign = {
  template: "cabinet",
  title: "B1样板间落地台盆柜",
  designThinking: "以四扇竖纹浅木平板门和暖米色厚边石材台面复现专项视频中的连续正立面。",
  recommendedPlacement: "W-B1-001正面墙右侧，与左侧洗烘开放柜齐口。",
  layoutNotes: ["柜宽约1380mm，施工前按净墙宽复尺", "单矩形台下盆", "无镜柜、无明装拉手", "底部10mm深色阴影收口"],
  zones: [
    { id: "B1-WASH-VANITY-DOORS", label: "四扇平板门", role: "storage", widthPercent: 100, heightPercent: 82, detail: "浅橡木竖纹、防潮基层、反弹开启" },
    { id: "B1-WASH-VANITY-TOP", label: "洞石台面", role: "countertop", widthPercent: 100, heightPercent: 18, detail: "约45mm厚暖米白哑光石材，矩形台下盆", serviceNote: "复核台盆、龙头和墙排" }
  ],
  cautionNotes: ["视频尺寸为估算，施工前复尺", "石材、木饰面必须封样", "柜内保留给排水检修"]
};
vanity.verificationMeta = verification("专项视频00:00–00:05多帧显示台盆柜明显短于原1380mm方案；以600mm洗衣机为比例参照缩至约1130mm，施工前复尺")

const niche = makeBuiltIn({
  id: "furn-b1-laundry-washer-niche-001",
  code: "CAB-B1-WASH-01",
  name: "B1 洗烘机到顶开放柜",
  dimensions: { width: 67, depth: 67, height: 270 },
  positionMm: { x: 4282, y: 685 },
  rotation: 0,
  hostWallId: "W-B1-001",
  variantId: "b1ShowroomOpenLaundryNiche",
  material: "防水浅橡木竖纹侧板和顶板 + 10mm深色阴影缝",
  note: "正面墙左端670mm宽开放柜，包覆洗烘叠放机组但不设柜门；柜顶距2800mm顶面约100mm。"
});
niche.cabinetDesign = {
  template: "cabinet",
  title: "B1洗烘机开放柜",
  designThinking: "用两侧竖纹木饰面板和顶板形成设备建筑化壁龛，同时保留散热、检修和原厂叠放条件。",
  recommendedPlacement: "W-B1-001正面墙最左侧，与台盆柜共面。",
  layoutNotes: ["外宽约670mm", "柜深约670mm", "设备两侧各约10mm净缝", "柜顶约100mm收口"],
  zones: [{ id: "B1-WASH-NICHE-OPENING", label: "洗烘设备开放位", role: "appliance", widthPercent: 92, heightPercent: 96, detail: "600x620x1700mm现有机组", serviceNote: "保留电源、给水、排水、通风和检修" }],
  cautionNotes: ["按设备实物复尺", "不得封堵散热", "侧板与台盆柜统一木纹和阴影缝"]
};
upsertFurniture(niche);

// Right wall: retain the sanitary fixture but align it with the concealed-cistern cabinet wall.
const toilet = furniture("furn-b1-bath-toilet-001");
setPositionMm(toilet, 5380, 1360, 90);
toilet.hostWallId = "W-B1-015";
toilet.roomAssignmentLocked = true;
toilet.note = "现有洁具规格保持不变，仅与右侧隐藏水箱柜墙对齐；不作为样板间家具造型复制对象。";
toilet.constructionNote = "复核现有坑距、墙排条件、角阀、防溅插座和隐藏水箱检修口；无法墙排时不得强行实施。";
toilet.render3d = { ...toilet.render3d, wetAreaVisual: { ...(toilet.render3d?.wetAreaVisual ?? {}), fixtureKind: "toilet", toiletType: "wallHung" } };
toilet.constructionMeta = { ...toilet.constructionMeta, wallDependency: "绑定 W-B1-015，并与隐藏水箱柜墙同轴复核。", notes: toilet.constructionNote };
toilet.verificationMeta = verification("专项视频显示洁具位于入口右前方、背靠右侧隐藏水箱柜墙；洁具型号沿用现有对象，仅调整硬装配合位置")

const toiletWall = makeBuiltIn({
  id: "furn-b1-laundry-toilet-cabinet-wall-001",
  code: "CAB-B1-WASH-02",
  name: "B1 隐藏水箱与上部到顶浅柜",
  dimensions: { width: 80, depth: 30, height: 270 },
  positionMm: { x: 5600, y: 1360 },
  rotation: 90,
  hostWallId: "W-B1-015",
  variantId: "b1ShowroomToiletCabinetWall",
  material: "防水浅橡木竖纹平板门 + 拉丝银色冲水面板 + 深色细分缝",
  note: "右侧800mm宽连续柜墙：下部约1000mm隐藏水箱箱体，上部约1700mm双扇浅柜到顶。"
});
toiletWall.cabinetDesign = {
  template: "cabinet",
  title: "B1隐藏水箱柜墙",
  designThinking: "将隐藏水箱、检修面板和上部储物柜整合为一条浅木竖纹立面。",
  recommendedPlacement: "W-B1-015右侧墙，和洁具中心线对齐。",
  layoutNotes: ["总宽约800mm", "深约300mm", "下部水箱箱体高约1000mm", "上部双门柜做到2700mm"],
  zones: [
    { id: "B1-WASH-CISTERN", label: "隐藏水箱箱体", role: "service", widthPercent: 100, heightPercent: 37, detail: "木饰面检修构造和拉丝银色冲水面板", serviceNote: "水箱和墙排条件须现场确认" },
    { id: "B1-WASH-UPPER", label: "上部双门浅柜", role: "storage", widthPercent: 100, heightPercent: 63, detail: "竖纹平板门、反弹开启、到顶收口" }
  ],
  cautionNotes: ["保留可拆检修口", "不得遮挡角阀和插座", "无法隐藏水箱时暂停本项"]
};
upsertFurniture(toiletWall);

// The sample has no mirror cabinet or mirror light above the vanity.
removeDrawingItems(["L-B1-V1-02", "SW-B1-V1-02"]);
for (const scene of workspace.lightingDesign?.scenes ?? []) {
  scene.groupStates = (scene.groupStates ?? []).filter((state) => state.controlGroupId !== "CG-B1-B1-001-MIRROR");
}

// Synchronize untouched generated points bound to the retained sanitary/appliance objects.
for (const item of [washer, vanity, toilet]) {
  workspace.drawingItems = syncRelatedDrawingItemsToFurniture(workspace.drawingItems, item, structure, { moveUntouchedGenerated: true, markReviewed: true });
}
for (const item of workspace.drawingItems.filter((candidate) => [washer.id, vanity.id, toilet.id].includes(candidate.relatedFurnitureId))) {
  item.updatedAt = now;
}

upsertDrawingItem({
  ...baseDrawingItem({
    id: "F-B1-WASH-SHOWROOM-01",
    category: "floorFinish",
    type: "largeFormatTravertineTile",
    positionMm: { x: 4849, y: 1075 },
    label: "B1洗衣房暖米洞石纹大板地面",
    notes: "只调整完成面视觉和排版，不改变楼板标高；采用900x1800mm估算模块、1.5mm同色缝和R10防滑要求。"
  }),
  material: "暖米色哑光洞石纹防滑瓷砖",
  pattern: "900x1800mm大板顺房间长边排版，起铺点现场放样",
  directionDeg: 0,
  seamWidthMm: 1.5,
  area: 2.61435,
  transition: "门下同色窄缝；墙地10mm深古铜阴影收口"
});

for (const [id, wallId, positionMm] of [
  ["WFIN-B1-WASH-001", "W-B1-001", { x: 4849, y: 350 }],
  ["WFIN-B1-WASH-003", "W-B1-003", { x: 3947, y: 1075 }],
  ["WFIN-B1-WASH-015", "W-B1-015", { x: 5750, y: 1075 }],
  ["WFIN-B1-WASH-016", "W-B1-016", { x: 4849, y: 1800 }]
]) {
  upsertDrawingItem({
    ...baseDrawingItem({
      id,
      category: "wallFinish",
      type: "verticalWaterproofWoodVeneer",
      positionMm,
      label: `${wallId} B1洗衣房浅橡木竖纹防水饰面`,
      notes: "浅橡木/白蜡木低饱和竖纹，防潮基层，减少显性分缝；材料颜色和纹理须现场封样。"
    }),
    hostWallId: wallId,
    wallId,
    material: "woodVeneerPanel",
    heightRange: { minMm: 0, maxMm: 2800 },
    specialTreatment: "墙地约10mm深古铜阴影缝；柜墙交界2–3mm深色细缝"
  });
}

for (const [id, relatedFurnitureId, hostWallId, label, positionMm, material] of [
  ["CAB-B1-WASH-VANITY-01", vanity.id, "W-B1-001", "B1样板间落地台盆柜", { x: 5185, y: 615 }, vanity.material],
  ["CAB-B1-WASH-NICHE-01", niche.id, "W-B1-001", "B1洗烘机到顶开放柜", { x: 4282, y: 685 }, niche.material],
  ["CAB-B1-WASH-TOILET-WALL-01", toiletWall.id, "W-B1-015", "B1隐藏水箱与上部到顶浅柜", { x: 5600, y: 1360 }, toiletWall.material]
]) {
  upsertDrawingItem({
    ...baseDrawingItem({ id, category: "cabinet", type: "builtInCabinet", positionMm, label, notes: "按B1洗衣房方案A与专项视频复现；属于固定硬装柜体，不作为可移动家具。" }),
    hostWallId,
    relatedFurnitureId,
    relatedFurniturePositionMm: positionMm,
    material,
    specialTreatment: "浅橡木竖纹平板、无明装拉手、深色窄阴影缝"
  });
}

workspace.defaultWorkspaceRevision = "2026-08-03-b1-laundry-showroom-all-hard-finish-v2";
workspace.savedAt = now;
workspace.updatedAt = now;
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  revision: workspace.defaultWorkspaceRevision,
  room: { boundary: laundryRoom.boundary, floor: laundryRoom.surfaceFinishes.floor, wall: laundryRoom.surfaceFinishes.wall },
  vanity: { dimensions: vanity.dimensions, position: vanity.position, hostWallId: vanity.hostWallId },
  washer: { dimensions: washer.dimensions, position: washer.position },
  toilet: { dimensions: toilet.dimensions, position: toilet.position },
  builtIns: [niche.id, toiletWall.id],
  removedMirrorItems: ["L-B1-V1-02", "SW-B1-V1-02"]
}, null, 2));
