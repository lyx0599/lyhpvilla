import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDrawingItemGeneratedFingerprint } from "../lib/drawing-items.ts";
import { syncRelatedDrawingItemsToFurniture } from "../lib/furniture-placement.ts";
import { generateLightingDesignV1 } from "../lib/lighting-design.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260717-before-model-refinement-round2.json");

if (!fs.existsSync(backupPath)) fs.copyFileSync(workspacePath, backupPath);

const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const structures = workspace.houseStructuresByFloor;
const now = new Date().toISOString();

function byId(items, id, label) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing ${label}: ${id}`);
  return item;
}

function furniture(id) {
  return byId(workspace.furniture, id, "furniture");
}

function setPositionMm(item, xMm, yMm, rotation = item.position.rotation) {
  item.position = { x: xMm / 120, y: yMm / 90, rotation };
}

function bindWall(item, wallId) {
  item.hostWallId = wallId;
  item.constructionMeta = {
    ...item.constructionMeta,
    wallDependency: `绑定 ${wallId}，安装前按墙面完成面复尺并复核收口。`
  };
}

function removeFurniture(...ids) {
  const removed = new Set(ids);
  workspace.furniture = workspace.furniture.filter((item) => !removed.has(item.id));
  workspace.drawingItems = workspace.drawingItems.filter((item) => !item.relatedFurnitureId || !removed.has(item.relatedFurnitureId));
}

function upsertById(items, next) {
  const index = items.findIndex((item) => item.id === next.id);
  if (index >= 0) items[index] = next;
  else items.push(next);
  return next;
}

function roomArea(boundary) {
  return Math.round(Math.abs(boundary.reduce((sum, point, index) => {
    const next = boundary[(index + 1) % boundary.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2);
}

function refreshDrawingItem(id) {
  const item = workspace.drawingItems.find((candidate) => candidate.id === id);
  if (item?.generatedFingerprint) item.generatedFingerprint = getDrawingItemGeneratedFingerprint(item);
  return item;
}

function basicFurniture({ id, code, name, type, moduleCategory, moduleType, floorId, roomId, width, depth, height, xMm, yMm, rotation, material, note, assetType, variantId, primaryMaterial = "warmOak", secondaryMaterial = "warmWhiteCeramic", accentMaterial = "brushedBronze", hostWallId }) {
  return {
    id,
    code,
    name,
    type,
    catalogId: `${moduleCategory}-${moduleType}`,
    moduleCategory,
    moduleType,
    floorId,
    roomId,
    dimensions: { width, depth, height, unit: "cm" },
    material,
    note,
    constructionNote: note,
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    position: { x: xMm / 120, y: yMm / 90, rotation },
    color: "#cfc4b5",
    render3d: {
      assetType,
      detailLevel: "presentation",
      stylePreset: "modernNatural",
      primaryMaterial,
      secondaryMaterial,
      accentMaterial,
      visibleIn3d: true,
      selectableIn3d: true,
      childrenMode: "grouped",
      variantId,
      variationSeed: Array.from(id).reduce((seed, character) => ((seed * 33) ^ character.charCodeAt(0)) >>> 0, 5381),
      styleSource: "manual",
      elevationMm: 0
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
      customMade: false,
      installType: "finishedFurniture",
      reserveSize: `${width}x${depth}x${height}cm`,
      wallDependency: hostWallId ? `绑定 ${hostWallId}，安装前按墙面完成面复尺并复核收口。` : "",
      floorDependency: "按完成面标高校核落地尺寸",
      ceilingDependency: "",
      waterproofRequired: false,
      inspectionAccessRequired: false,
      purchaseCategory: "成品家具",
      supplierType: "成品家具供应商",
      notes: note
    },
    ...(hostWallId ? { hostWallId } : {}),
    verificationMeta: { status: "estimated", source: "manual-input", sourceNote: "用户自然语言设计意图", toleranceMm: 50 }
  };
}

// 1F kitchen and living: turn the fridge toward the cooktop, keep the widened water bar, and exchange the two current W-1F-011 cabinet zones.
const fridge = furniture("furn-fridge-001");
setPositionMm(fridge, 7200, 2215, 270);
bindWall(fridge, "W-1F-005");
fridge.note = "冰箱门整体旋转 90°，正面朝向灶台；保留嵌入柜散热和完整开门回转空间。";
fridge.constructionNote = "冰箱正面朝西对灶台，设备独立回路不变；现场复核 90° 开门、抽屉完全抽出和东墙散热间隙。";
fridge.mepMeta.notes = fridge.constructionNote;
fridge.constructionMeta.notes = fridge.constructionNote;

const waterBar = furniture("furn-living-waterbar-001");
waterBar.dimensions.width = 180;
setPositionMm(waterBar, 9210, 4750, 90);
bindWall(waterBar, "W-1F-011");
waterBar.note = "与零食柜再次交换当前区位后，1800mm 水吧台位于 W-1F-011 北段。";
waterBar.constructionNote = "1800mm 水吧台、净饮、小水槽、咖啡机及杯具操作整体迁至北段；给排水和三组电源随柜体同步迁移并复核管线路径。";
waterBar.constructionMeta.reserveSize = "180x55x90cm";
waterBar.constructionMeta.notes = waterBar.constructionNote;
waterBar.mepMeta.notes = waterBar.constructionNote;
waterBar.clearanceMeta = { ...waterBar.clearanceMeta, frontMm: 600, serviceMm: 600 };

const waterBarUpper = furniture("furn-living-waterbar-upper-001");
waterBarUpper.dimensions.width = 180;
setPositionMm(waterBarUpper, 9325, 4750, 90);
bindWall(waterBarUpper, "W-1F-011");
waterBarUpper.note = "吊柜随水吧台迁移至 W-1F-011 北段，保持 1800mm 宽并与下柜同轴。";
waterBarUpper.constructionNote = "下沿标高 1450mm；复核墙体基层、柜下灯带电源与 1800mm 柜体分格。";
waterBarUpper.constructionMeta.reserveSize = "180x32x80cm";
waterBarUpper.constructionMeta.notes = waterBarUpper.constructionNote;
waterBarUpper.mepMeta.notes = waterBarUpper.constructionNote;

const snackCabinet = furniture("furn-living-snack-pullout-001");
setPositionMm(snackCabinet, 9330, 6850, 90);
bindWall(snackCabinet, "W-1F-011");
snackCabinet.name = "W-1F-011 南段零食柜";
snackCabinet.note = "与水吧柜再次交换当前区位后，零食柜改放 W-1F-011 南段。";
snackCabinet.constructionNote = "保持 320mm 浅柜和朝客厅抽拉方向，复核餐椅后退区与抽拉净空。";
snackCabinet.cabinetDesign = {
  ...snackCabinet.cabinetDesign,
  title: "W-1F-011 南段零食柜设计",
  designThinking: "将零食、茶包与日常补给收纳集中在 W-1F-011 南段，与北段水吧形成明确分区，减少包装外露并保持客厅动线清爽。",
  recommendedPlacement: "1F 客厅侧，贴 W-1F-011 南段墙面，与北段 1800mm 水吧柜分区对应。",
  layoutNotes: [
    "柜体贴 W-1F-011 南段横向布置，宽度按 1200mm 控制",
    "深度保持 320mm，避让餐椅后退和主通道",
    "拉篮朝客厅方向抽出，前方保持完整抽拉净空"
  ],
  cautionNotes: [
    "现场复核 W-1F-011 南段墙面、踢脚线与餐椅后退净距。",
    "若抽拉净空不足，优先减少柜深，不侵占主通道。"
  ]
};
snackCabinet.mepMeta.notes = snackCabinet.constructionNote;
snackCabinet.constructionMeta.notes = snackCabinet.constructionNote;

const kitchenIsland = furniture("furn-kitchen-entry-island-001");
kitchenIsland.lightingDesignExcluded = true;
const removedIslandDrawingIds = new Set(workspace.drawingItems
  .filter((item) => item.controlGroupId === "CG-1F-1F-005-ISLAND" || item.relatedFurnitureId === kitchenIsland.id && item.category === "light")
  .map((item) => item.id));
workspace.drawingItems = workspace.drawingItems.filter((item) => !removedIslandDrawingIds.has(item.id));
if (workspace.drawingPackage?.drawingItemIds) {
  workspace.drawingPackage.drawingItemIds = workspace.drawingPackage.drawingItemIds.filter((id) => !removedIslandDrawingIds.has(id));
}
for (const scene of workspace.lightingDesign?.scenes ?? []) {
  scene.groupStates = scene.groupStates.filter((state) => state.controlGroupId !== "CG-1F-1F-005-ISLAND");
}

// All bathroom vanity mirrors become taller square mirror cabinets while retaining their existing widths.
const vanityIds = ["furn-b1-bath-vanity-001", "furn-bath-vanity-001", "furn-2f-guest-vanity-001", "furn-2f-master-vanity-001"];
for (const id of vanityIds) {
  const vanity = furniture(id);
  vanity.material = "暖木/防潮台盆柜 + 同宽高柜式方形镜柜";
  vanity.note = "镜面保持与台盆柜同宽，改为更高的方形镜柜，增加日常洗漱收纳。";
  vanity.constructionNote = "镜柜深度 110mm、高度 950mm，复核龙头、墙面电源、镜柜灯和柜门开启。";
  vanity.render3d.wetAreaVisual = {
    ...vanity.render3d.wetAreaVisual,
    mirrorStyle: "cabinet",
    mirrorHeightMm: 950,
    mirrorCabinetDepthMm: 110
  };
  vanity.mepMeta.notes = vanity.constructionNote;
  vanity.constructionMeta.notes = vanity.constructionNote;
  for (const drawingItem of workspace.drawingItems.filter((item) => item.relatedFurnitureId === id && item.category === "light" && /mirror/i.test(`${item.type} ${item.lightType} ${item.controlGroupId}`))) {
    drawingItem.heightMm = 2050;
    drawingItem.label = drawingItem.label.replace(/镜前灯|镜柜灯/g, "方形镜柜灯");
    drawingItem.notes = "高柜式方形镜柜上沿/柜内集成照明，避开柜门开启并保留驱动检修。";
    if (drawingItem.generatedFingerprint) drawingItem.generatedFingerprint = getDrawingItemGeneratedFingerprint(drawingItem);
  }
}

// 2F walk-in closet: use full-height gray transparent glass fronts on both wall cabinet runs.
for (const id of ["module-2f-cloak-left", "module-2f-cloak-right"]) {
  const cabinet = furniture(id);
  cabinet.material = "暖木柜体 + 满门灰色透明玻璃 + 黑钛窄框 + 感应灯带";
  cabinet.note = "满墙到顶柜体的所有正面门板统一改为灰色透明玻璃，降低衣帽间压迫感，同时保留柜内可视收纳。";
  cabinet.constructionNote = "满墙到顶柜体采用灰色透明玻璃门和黑钛窄框；复核玻璃安全等级、门缝、铰链及柜内感应灯带。";
  cabinet.render3d = {
    ...cabinet.render3d,
    secondaryMaterial: "graySmokedGlass",
    accentMaterial: "blackTitanium",
    cabinetVisual: { frontStyle: "glass", handleStyle: "edgePull", glassTone: "gray", allDoorPanels: true }
  };
  cabinet.mepMeta.notes = cabinet.constructionNote;
  cabinet.constructionMeta.notes = cabinet.constructionNote;
}

// Master bedroom: add two nightstands, align the chest with the door frame and widen the wardrobe.
const masterWardrobe = furniture("furn-2f-master-bedroom-large-wardrobe-001");
masterWardrobe.dimensions.width = 220;
setPositionMm(masterWardrobe, 9190, 6500, 90);
masterWardrobe.note = "W-2F-011 南段大衣柜由 1900mm 加宽至 2200mm，保持到顶收纳并与五斗柜留出收口缝。";
masterWardrobe.constructionNote = "按 2200x600x2400mm 深化，复核主卧床尾净距、柜门形式、灯带电源与南端收口。";
masterWardrobe.constructionMeta.reserveSize = "220x60x240cm";
masterWardrobe.constructionMeta.notes = masterWardrobe.constructionNote;
masterWardrobe.mepMeta.notes = masterWardrobe.constructionNote;

const masterChest = furniture("furn-2f-master-bedroom-chest-001");
setPositionMm(masterChest, 9260, 4825, 90);
masterChest.note = "五斗柜向南微移，北侧边线与主卧入口门框完成面对齐，形成整齐的入口立面。";
masterChest.constructionNote = "以 D-2F-008 南侧门框完成面为定位基准，现场复核门套厚度和柜体开合。";
masterChest.mepMeta.notes = masterChest.constructionNote;
masterChest.constructionMeta.notes = masterChest.constructionNote;

for (const nightstand of [
  basicFurniture({ id: "furn-2f-master-nightstand-north-001", code: "NS-2F-M-01", name: "主卧北侧床头柜", type: "nightstand", moduleCategory: "bedroom", moduleType: "nightstand", floorId: "2F", roomId: "ROOM-2F-006", width: 45, depth: 40, height: 50, xMm: 6742, yMm: 5400, rotation: 270, material: "悬浮暖木床头柜 + 暖白抽屉", note: "贴床头墙设置，保留床侧通道，集成五孔、USB-C 与阅读灯控制。", assetType: "nightstand", variantId: "floating", hostWallId: "W-2F-016" }),
  basicFurniture({ id: "furn-2f-master-nightstand-south-001", code: "NS-2F-M-02", name: "主卧南侧床头柜", type: "nightstand", moduleCategory: "bedroom", moduleType: "nightstand", floorId: "2F", roomId: "ROOM-2F-006", width: 45, depth: 40, height: 50, xMm: 6742, yMm: 7480, rotation: 270, material: "悬浮暖木床头柜 + 暖白抽屉", note: "贴床头墙设置，保留床侧通道，集成五孔、USB-C 与阅读灯控制。", assetType: "nightstand", variantId: "floating", hostWallId: "W-2F-016" })
]) {
  nightstand.serviceRequirements.power = true;
  nightstand.mepMeta = { ...nightstand.mepMeta, needsSocket: true, socketCount: 2, socketHeight: 650, needsSwitch: true, switchControl: ["床头阅读灯", "卧室主灯双控"], needsNetwork: true, relatedCircuit: "卧室床头回路", notes: nightstand.note };
  nightstand.constructionMeta = { ...nightstand.constructionMeta, customMade: true, installType: "wallMounted", purchaseCategory: "定制柜体/硬装", supplierType: "全屋定制/木作供应商" };
  nightstand.constructionAnchors = {
    points: [{ id: `${nightstand.id}-power`, type: "power", label: "床头五孔 + USB-C", positionMm: { x: 0, y: 650, z: -160 }, installationHeightMm: 650 }],
    installationHeightMm: 480,
    notes: "床头电源随床头柜定位，不被柜体背板遮挡。"
  };
  upsertById(workspace.furniture, nightstand);
}

// Bedrooms 1 and 2: integrate a display/charging shelf into the headboard so separate nightstands are unnecessary.
for (const id of ["furn-2f-bedroom1-bed-001", "furn-2f-bedroom2-bed-001"]) {
  const bed = furniture(id);
  bed.material = "软包床头 + 暖木一体置物层板 + 暗藏灯带";
  bed.note = "床与床头之间增加一体置物层板、双侧凹龛与充电位，不再单独设置床头柜；床侧和床尾通道保持原布局复核。";
  bed.constructionNote = "床头一体置物深 180mm、高约 640mm，预留五孔/USB-C、阅读灯双控和可检修灯带电源。";
  bed.render3d = {
    ...bed.render3d,
    variantId: "lowUpholstered",
    bedVisual: { headboardStyle: "storageShelf", shelfDepthMm: 180, shelfHeightMm: 640, chargingNiche: true }
  };
  bed.mepMeta.notes = bed.constructionNote;
  bed.constructionMeta.notes = bed.constructionNote;
}

// B1 activity area: a movable beanbag lounge seat and a compact wall shelf.
const b1BeanBag = basicFurniture({
  id: "furn-b1-activity-beanbag-001", code: "BB-B1-01", name: "B1 活动区舒适懒人沙发", type: "sofa", moduleCategory: "living", moduleType: "sofa", floorId: "B1", roomId: "ROOM-B1-004",
  width: 110, depth: 105, height: 75, xMm: 3000, yMm: 6250, rotation: 25, material: "可拆洗米灰绒布 + 高回弹颗粒填充", note: "低重心、可移动的包裹式懒人沙发，朝向活动区中心，保留周边自由通行。", assetType: "sofa", variantId: "beanBag", primaryMaterial: "taupeFabric", secondaryMaterial: "creamFabric", accentMaterial: "camelFabric"
});
b1BeanBag.clearanceMeta = { frontMm: 700, sideMm: 450 };
upsertById(workspace.furniture, b1BeanBag);

const b1Shelf = basicFurniture({
  id: "furn-b1-activity-small-shelf-001", code: "SH-B1-01", name: "B1 活动区小置物架", type: "bookshelf", moduleCategory: "storage", moduleType: "bookshelf", floorId: "B1", roomId: "ROOM-B1-004",
  width: 80, depth: 30, height: 105, xMm: 1120, yMm: 6800, rotation: 90, material: "暖木开放架 + 圆角层板", note: "贴 W-B1-007 设置的小型开放置物架，收纳书、手柄、香薰和随手小物。", assetType: "bookshelf", variantId: "openClosedMix", hostWallId: "W-B1-007"
});
b1Shelf.constructionMeta = { ...b1Shelf.constructionMeta, customMade: true, installType: "wallSecured", purchaseCategory: "定制柜体/硬装", supplierType: "全屋定制/木作供应商" };
upsertById(workspace.furniture, b1Shelf);

// B2: remove Wall 009, move the sofa to a direct TV axis, form an under-stair storage room and rotate the wider rectangular slab table.
structures.B2.walls = structures.B2.walls.filter((wall) => wall.id !== "W-B2-009");
const partitionMeta = { status: "estimated", source: "manual-input", sourceNote: "用户自然语言设计意图", toleranceMm: 50 };
upsertById(structures.B2.walls, {
  id: "W-B2-STORAGE-001", floorId: "B2", name: "楼梯下储物间东侧轻质隔墙", kind: "straight", geometryType: "line",
  start: { x: 2350, y: 3050 }, end: { x: 2350, y: 4100 }, thickness: 120, height: 2100, length: 1050,
  material: "轻钢龙骨双层板 + 隔音棉", verificationMeta: partitionMeta
});
upsertById(structures.B2.walls, {
  id: "W-B2-STORAGE-002", floorId: "B2", name: "楼梯下储物间南侧轻质隔墙", kind: "straight", geometryType: "line",
  start: { x: 2350, y: 4100 }, end: { x: 950, y: 4100 }, thickness: 120, height: 2100, length: 1400,
  material: "轻钢龙骨双层板 + 隔音棉", verificationMeta: partitionMeta
});
upsertById(structures.B2.doors, {
  id: "D-B2-STORAGE-001", floorId: "B2", name: "楼梯下储物间矮移门", geometryType: "line", hostId: "W-B2-STORAGE-002", hostType: "wall",
  positionOnWall: 0.55, width: 620, height: 900, openDirection: "sliding", operation: "sliding", material: "暖木矮门 + 内嵌拉手", verificationMeta: partitionMeta
});

const underStairBoundary = [{ x: 950, y: 3050 }, { x: 2350, y: 3050 }, { x: 2350, y: 4100 }, { x: 950, y: 4100 }];
const stairBoundary = [{ x: 2350, y: 3050 }, { x: 3897, y: 3050 }, { x: 3897, y: 4500 }, { x: 2350, y: 4500 }, { x: 2350, y: 5150 }, { x: 950, y: 5150 }, { x: 950, y: 4100 }, { x: 2350, y: 4100 }];
const studyBoundary = [{ x: 2350, y: 4500 }, { x: 3897, y: 4500 }, { x: 3897, y: 5150 }, { x: 5750, y: 5150 }, { x: 5750, y: 7800 }, { x: 950, y: 7800 }, { x: 950, y: 5150 }, { x: 2350, y: 5150 }];
const underStairRoom = byId(structures.B2.rooms, "ROOM-B2-004", "room");
Object.assign(underStairRoom, { name: "楼梯下储物间", boundary: underStairBoundary, area: roomArea(underStairBoundary), sourceWallIds: ["W-B2-007", "W-B2-008", "W-B2-STORAGE-001", "W-B2-STORAGE-002"], verificationMeta: partitionMeta });
const stairRoom = byId(structures.B2.rooms, "ROOM-B2-002", "room");
Object.assign(stairRoom, { boundary: stairBoundary, area: roomArea(stairBoundary), sourceWallIds: ["W-B2-007", "W-B2-008", "W-B2-STORAGE-001", "W-B2-STORAGE-002"], verificationMeta: partitionMeta });
const studyRoom = byId(structures.B2.rooms, "ROOM-B2-005", "room");
Object.assign(studyRoom, { boundary: studyBoundary, area: roomArea(studyBoundary), sourceWallIds: ["W-B2-008", "W-B2-010", "W-B2-011"], verificationMeta: partitionMeta });

const b2StorageShelves = [
  basicFurniture({
    id: "furn-b2-under-stair-shelf-001", code: "SH-B2-ST-01", name: "B2 楼梯下迷你仓储架 A", type: "bookshelf", moduleCategory: "storage", moduleType: "bookshelf", floorId: "B2", roomId: "ROOM-B2-004",
    width: 70, depth: 30, height: 110, xMm: 1125, yMm: 3400, rotation: 90, material: "可调节暖木层板 + 黑色金属立柱", note: "沿西墙设置高位主货架，收纳箱包、工具与清洁用品；与另外两组矮架组成密集迷你仓库。", assetType: "bookshelf", variantId: "openClosedMix", hostWallId: "W-B2-008"
  }),
  basicFurniture({
    id: "furn-b2-under-stair-shelf-002", code: "SH-B2-ST-02", name: "B2 楼梯下迷你仓储架 B", type: "bookshelf", moduleCategory: "storage", moduleType: "bookshelf", floorId: "B2", roomId: "ROOM-B2-004",
    width: 70, depth: 30, height: 85, xMm: 1650, yMm: 3225, rotation: 0, material: "浅木层板 + 深灰金属框", note: "贴北侧斜底布置中矮货架，分层放周转箱、备品和低频物件。", assetType: "bookshelf", variantId: "openClosedMix", hostWallId: "W-B2-007"
  }),
  basicFurniture({
    id: "furn-b2-under-stair-shelf-003", code: "SH-B2-ST-03", name: "B2 楼梯下迷你仓储架 C", type: "bookshelf", moduleCategory: "storage", moduleType: "bookshelf", floorId: "B2", roomId: "ROOM-B2-004",
    width: 70, depth: 30, height: 70, xMm: 2175, yMm: 3500, rotation: 90, material: "浅木层板 + 深灰金属框", note: "沿东侧最低处布置矮货架，放鞋盒、耗材和小型收纳筐，中央保留取物带。", assetType: "bookshelf", variantId: "openClosedMix", hostWallId: "W-B2-STORAGE-001"
  })
];
for (const shelf of b2StorageShelves) {
  shelf.constructionMeta = { ...shelf.constructionMeta, customMade: true, installType: "wallSecured", purchaseCategory: "定制柜体/硬装", supplierType: "全屋定制/木作供应商", ceilingDependency: "按楼梯斜底逐格复尺，最高点不与梯段结构冲突" };
  upsertById(workspace.furniture, shelf);
}

const b2Sofa = furniture("furn-b2-living-long-sofa-001");
setPositionMm(b2Sofa, 5750, 4300, 180);
b2Sofa.note = "长沙发从边界移到客厅中心轴，正面直接朝向 W-B2-001 电视柜，形成完整观影视距。";
b2Sofa.constructionNote = "电视柜中心约 x=5640mm，沙发中心约 x=5750mm；西端退入客厅边界，两侧保留主通道，侧边插座/落地灯电源随位置复核。";
b2Sofa.mepMeta.notes = b2Sofa.constructionNote;
b2Sofa.constructionMeta.notes = b2Sofa.constructionNote;
removeFurniture("furn-b2-living-coffee-table-001");

const b2Table = furniture("furn-b2-study-slab-table-001");
b2Table.dimensions.width = 320;
b2Table.dimensions.depth = 110;
setPositionMm(b2Table, 3000, 6175, 90);
b2Table.material = "3200x1100mm 长方形原木大板桌 + 黑色金属桌脚";
b2Table.note = "桌面加宽为 1100mm、长度调整为 3200mm，整体旋转 90°，长边与书房柜体方向平行。";
b2Table.constructionNote = "长方形桌面按 3200x1100mm 复尺；旋转后复核椅后通道、地插、上方线性灯和圆柱避让。";
b2Table.render3d = { ...b2Table.render3d, variantId: "rectTimber" };
b2Table.constructionMeta.reserveSize = "320x110x75cm";
b2Table.constructionMeta.notes = b2Table.constructionNote;
b2Table.mepMeta.notes = b2Table.constructionNote;

for (const item of [fridge, waterBar, waterBarUpper, snackCabinet, masterWardrobe, masterChest, b2Sofa, b2Table]) {
  const structure = structures[item.floorId];
  workspace.drawingItems = syncRelatedDrawingItemsToFurniture(workspace.drawingItems, item, structure, { moveUntouchedGenerated: true, markReviewed: true });
}

const regeneratedLighting = generateLightingDesignV1({
  structuresByFloor: structures,
  furniture: workspace.furniture,
  existingItems: workspace.drawingItems,
  floorIds: workspace.floors.map((floor) => floor.id),
  now
});
workspace.drawingItems = regeneratedLighting.items;
if (workspace.drawingPackage?.drawingItemIds) workspace.drawingPackage.drawingItemIds = workspace.drawingItems.map((item) => item.id);

// Preserve the requested mirror-cabinet presentation as an intentional user override on top of regenerated lighting.
for (const id of vanityIds) {
  for (const drawingItem of workspace.drawingItems.filter((item) => item.relatedFurnitureId === id && item.category === "light" && /mirror/i.test(`${item.type} ${item.lightType} ${item.controlGroupId}`))) {
    drawingItem.heightMm = 2050;
    drawingItem.label = drawingItem.label.replace(/镜前灯|镜柜灯/g, "方形镜柜灯");
    drawingItem.notes = "高柜式方形镜柜上沿/柜内集成照明，避开柜门开启并保留驱动检修。";
  }
}

const storageLight = byId(workspace.drawingItems, workspace.drawingItems.find((item) => item.generatedKey === "lighting-design-v1:B2:CG-B2-B2-004-AMBIENT:light:1")?.id, "drawing item");
Object.assign(storageLight, {
  positionMm: { x: 1650, y: 3525 }, heightMm: 1900, type: "underStairCeilingLight", lightType: "underStairCeilingLight",
  mountingType: "surfaceMounted", label: "L-B2-V1-09 · 楼梯下储物间吸顶灯", notes: "低矮楼梯下空间采用小型明装吸顶灯，避开梯段结构并保证置物架取物照度。",
  lightSpec: { ...storageLight.lightSpec, powerW: 8, luminousFluxLm: 650, fixtureFamily: "compact-surface-downlight", trimColor: "哑白" }
});
const storageSwitch = byId(workspace.drawingItems, workspace.drawingItems.find((item) => item.generatedKey === "lighting-design-v1:B2:CG-B2-B2-004-AMBIENT:switch")?.id, "drawing item");
Object.assign(storageSwitch, { positionMm: { x: 1950, y: 4070 }, heightMm: 1200, hostWallId: "W-B2-STORAGE-002", label: "SW-B2-V1-09 · 楼梯下储物间照明控制", notes: "设于储物间移门侧，控制 L-B2-V1-09；最终位置避开门套。" });

const b1ActivityView = workspace.cameraViews.find((view) => view.id === "view-b1-activity");
if (b1ActivityView) b1ActivityView.description = "查看 B1 活动区懒人沙发、小置物架与中央灵活留白。";
const b2ActivityView = workspace.cameraViews.find((view) => view.id === "view-b2-activity");
if (b2ActivityView) b2ActivityView.description = "查看正对电视的长沙发、无茶几观影区与楼梯下独立储物间。";

const tableLight = workspace.drawingItems.find((item) => item.generatedKey === "lighting-design-v1:B2:CG-B2-B2-005-DESK:light:1");
if (tableLight) {
  tableLight.directionDeg = 90;
  tableLight.notes = "线性吊灯与 3200mm 长方形大板桌长轴平行；吊装高度、桌面照度和椅后通道现场复核。";
}

workspace.defaultWorkspaceRevision = "2026-07-17-model-refinement-v4";
workspace.savedAt = now;
workspace.updatedAt = now;
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  revision: workspace.defaultWorkspaceRevision,
  fridgeRotationDeg: fridge.position.rotation,
  waterBarWidthMm: waterBar.dimensions.width * 10,
  mirrorCabinetCount: vanityIds.filter((id) => furniture(id).render3d.wetAreaVisual.mirrorStyle === "cabinet").length,
  islandPendantRemoved: !workspace.drawingItems.some((item) => item.controlGroupId === "CG-1F-1F-005-ISLAND"),
  masterWardrobeWidthMm: masterWardrobe.dimensions.width * 10,
  b1BeanBagAdded: workspace.furniture.some((item) => item.id === b1BeanBag.id),
  b2Wall009Removed: !structures.B2.walls.some((wall) => wall.id === "W-B2-009"),
  b2UnderStairRoomAreaMm2: underStairRoom.area,
  b2CoffeeTableRemoved: !workspace.furniture.some((item) => item.id === "furn-b2-living-coffee-table-001"),
  b2TableRotationDeg: b2Table.position.rotation
}, null, 2));
