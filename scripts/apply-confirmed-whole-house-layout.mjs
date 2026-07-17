import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDrawingItemGeneratedFingerprint } from "../lib/drawing-items.ts";
import { getFurnitureCenterMm, syncRelatedDrawingItemsToFurniture } from "../lib/furniture-placement.ts";
import { generateLightingDesignV1 } from "../lib/lighting-design.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const now = new Date().toISOString();

const structures = workspace.houseStructuresByFloor;
const byId = (items, id, label) => {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing ${label}: ${id}`);
  return item;
};
const furniture = (id) => byId(workspace.furniture, id, "furniture");
const structure = (floorId) => {
  const item = structures[floorId];
  if (!item) throw new Error(`Missing structure: ${floorId}`);
  return item;
};
const wall = (floorId, id) => byId(structures[floorId].walls, id, "wall");
const room = (floorId, id) => byId(structures[floorId].rooms, id, "room");
const door = (floorId, id) => byId(structures[floorId].doors, id, "door");
const windowItem = (floorId, id) => byId(structures[floorId].windows, id, "window");
const drawingItem = (id) => byId(workspace.drawingItems, id, "drawing item");
const setPosition = (item, xMm, yMm, rotation = item.position.rotation) => {
  item.position = { x: xMm / 120, y: yMm / 90, rotation };
};
const bindWall = (item, wallId) => {
  item.hostWallId = wallId;
  item.constructionMeta = {
    ...item.constructionMeta,
    wallDependency: `绑定 ${wallId}，安装前按墙面完成面复尺并复核收口。`
  };
};
const updateReserveSize = (item) => {
  if (!item.constructionMeta) return;
  const { width, depth, height } = item.dimensions;
  item.constructionMeta.reserveSize = `${width}x${depth}x${height}cm`;
};
const removeFurniture = (...ids) => {
  const remove = new Set(ids);
  workspace.furniture = workspace.furniture.filter((item) => !remove.has(item.id));
};
const polygonArea = (points) => Math.round(Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + point.x * next.y - next.x * point.y;
}, 0)) / 2);
const refreshFingerprint = (item) => {
  if (item.generatedFingerprint) item.generatedFingerprint = getDrawingItemGeneratedFingerprint(item);
};
// B2 — garage entry vestibule, 1.2 m circulation, living room and wall-bound cabinetry.
const b2TvConsole = furniture("furn-b2-living-tv-console-001");
const b2Tv = furniture("furn-b2-living-large-tv-001");
const b2Sofa = furniture("furn-b2-living-long-sofa-001");
const b2CoffeeTable = furniture("furn-b2-living-coffee-table-001");
const b2StudyCabinet = furniture("furn-b2-study-souvenir-cabinet-001");
bindWall(b2TvConsole, "W-B2-001");
bindWall(b2Tv, "W-B2-001");
bindWall(b2StudyCabinet, "W-B2-008");
b2StudyCabinet.clearanceMeta = { frontMm: 900, sideMm: 200, serviceMm: 600 };
b2Sofa.dimensions.depth = 90;
setPosition(b2Sofa, 7200, 4675, 0);
b2Sofa.note = "大沙发正对 W-B2-001 电视墙；左缘距楼梯区域约 1.25m，保留从车库小门进入、绕过玄关隔断后进入客厅的 1.2m 通道。";
b2Sofa.constructionNote = "沙发左侧保持不少于 1200mm 主通道；侧边预留五孔插座和落地灯电源。";
updateReserveSize(b2Sofa);
setPosition(b2CoffeeTable, 6900, 3350, 0);
b2CoffeeTable.note = "布置在电视墙与大沙发之间，采用可移动款，不侵占左侧 1.2m 入户通道。";
if (!workspace.furniture.some((item) => item.id === "furn-b2-entry-divider-001")) {
  workspace.furniture.push({
    id: "furn-b2-entry-divider-001",
    code: "PT-B2-01",
    name: "B2 车库入户玄关隔断",
    type: "custom",
    catalogId: "storage-entry-divider",
    moduleCategory: "storage",
    moduleType: "entryDivider",
    floorId: "B2",
    roomId: "ROOM-B2-001",
    dimensions: { width: 160, depth: 18, height: 210, unit: "cm" },
    material: "木饰面格栅 + 半透玻璃 + 低柜",
    note: "车库小门进入后先经过玄关隔断，再转入客厅；隔断西侧保留约 1.23m 净通行宽度，不做实体封闭墙。",
    constructionNote: "隔断落地固定但保持视觉通透；西侧至 W-B2-003 保留不少于 1200mm 通道，避免遮挡车库门开启。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    position: { x: 5000 / 120, y: 2400 / 90, rotation: 90 },
    color: "#c8ad8d",
    render3d: {
      assetType: "sideboard", detailLevel: "presentation", stylePreset: "modernNatural",
      primaryMaterial: "warmOak", secondaryMaterial: "smokedGlass", accentMaterial: "brushedBronze",
      visibleIn3d: true, selectableIn3d: true, childrenMode: "grouped", variantId: "entryScreen", variationSeed: 2202401, styleSource: "generated"
    },
    mepMeta: {
      needsSocket: false, socketCount: 0, socketHeight: 0, needsSwitch: false, switchControl: [],
      needsLighting: false, lightingType: "none", needsWaterSupply: false, waterSupplyType: "none",
      needsDrainage: false, drainageType: "none", needsNetwork: false, needsVentilation: false,
      needsSmartControl: false, notes: "通透玄关隔断，无机电需求。"
    },
    constructionMeta: {
      customMade: true, installType: "builtIn", reserveSize: "160x18x210cm",
      wallDependency: "不依附实体墙，按车库门和通道完成面定位。", floorDependency: "落地固定并复核地暖/管线。",
      ceilingDependency: "顶部不封死，保留通透感。", waterproofRequired: false, inspectionAccessRequired: false,
      purchaseCategory: "定制柜体/硬装", supplierType: "全屋定制/木作供应商",
      notes: "西侧净通道不少于 1200mm。"
    }
  });
}
setPosition(furniture("furn-b2-entry-divider-001"), 5300, 2600, 90);

// B1 — enlarge the flexible laundry/washroom and fit washer, vanity and toilet; no shower.
const b1LaundryBoundary = [
  { x: 3947, y: 350 }, { x: 6500, y: 350 }, { x: 6500, y: 2095 }, { x: 3947, y: 2095 }
];
const b1RoomBoundary = [
  { x: 6500, y: 350 }, { x: 9495, y: 350 }, { x: 9495, y: 3117 },
  { x: 5281, y: 3117 }, { x: 3947, y: 3117 }, { x: 3947, y: 2095 }, { x: 6500, y: 2095 }
];
Object.assign(wall("B1", "W-B1-001"), { end: { x: 6500, y: 350 }, length: 2553 });
Object.assign(wall("B1", "W-B1-002"), { start: { x: 6500, y: 350 }, length: 2995 });
Object.assign(wall("B1", "W-B1-015"), { start: { x: 6500, y: 350 }, end: { x: 6500, y: 2095 }, length: 1745 });
Object.assign(wall("B1", "W-B1-016"), { start: { x: 6500, y: 2095 }, end: { x: 3947, y: 2095 }, length: 2553 });
Object.assign(room("B1", "ROOM-B1-001"), { boundary: b1LaundryBoundary, area: polygonArea(b1LaundryBoundary) });
Object.assign(room("B1", "ROOM-B1-002"), { boundary: b1RoomBoundary, area: polygonArea(b1RoomBoundary) });
const b1Vanity = furniture("furn-b1-bath-vanity-001");
const b1Toilet = furniture("furn-b1-bath-toilet-001");
const b1Wardrobe = furniture("furn-b1-room-seasonal-wardrobe-001");
setPosition(b1Vanity, 5060, 610, 0);
bindWall(b1Vanity, "W-B1-001");
b1Vanity.roomId = "ROOM-B1-001";
b1Vanity.name = "B1 洗衣房单台盆柜";
b1Vanity.clearanceMeta = { frontMm: 700, sideMm: 100, serviceMm: 400 };
setPosition(b1Toilet, 6080, 1600, 90);
bindWall(b1Toilet, "W-B1-015");
b1Toilet.roomId = "ROOM-B1-001";
b1Toilet.clearanceMeta = { frontMm: 700, sideMm: 200, serviceMm: 400 };
setPosition(b1Wardrobe, 9190, 1735, 90);
bindWall(b1Wardrobe, "W-B1-004");
b1Wardrobe.roomId = "ROOM-B1-002";
b1Wardrobe.name = "B1 房间 W-B1-004 整墙换季大衣柜";
removeFurniture("furn-b1-bath-shower-001");
removeFurniture("furn-b1-nightstand-left-001", "furn-b1-nightstand-right-001");
const b1GuestBed = furniture("furn-b1-guest-bed-001");
b1GuestBed.dimensions.width = 140;
setPosition(b1GuestBed, 7200, 1400, 0);
b1GuestBed.note = "床头贴北墙布置，床尾与 W-B1-014 玻璃护栏保持约 600mm，避免形成 360mm 人物不可通过的夹缝。";
updateReserveSize(b1GuestBed);
Object.assign(door("B1", "D-B1-001"), { operation: "swing", openDirection: "leftOut" });
if (!workspace.furniture.some((item) => item.id === "furn-b1-laundry-washer-001")) {
  workspace.furniture.push({
    id: "furn-b1-laundry-washer-001", code: "WM-B1-01", name: "B1 洗衣房洗衣机",
    type: "appliance", catalogId: "appliance-washing-machine", moduleCategory: "appliance", moduleType: "washingMachine",
    floorId: "B1", roomId: "ROOM-B1-001", dimensions: { width: 65, depth: 65, height: 85, unit: "cm" },
    material: "暖白金属面板 + 深色玻璃舱门", note: "靠西北角布置，和单台盆、马桶组成洗衣卫生间，不设置淋浴区。",
    constructionNote: "预留独立防溅插座、冷热水/洗衣机龙头、专用排水和前方不少于 900mm 操作空间。",
    serviceRequirements: { water: true, drainage: true, power: true, exhaust: false },
    position: { x: 4322 / 120, y: 725 / 90, rotation: 0 }, color: "#e7e5e4",
    render3d: {
      assetType: "generic", detailLevel: "presentation", stylePreset: "modernNatural", primaryMaterial: "warmWhiteCeramic",
      secondaryMaterial: "smokedGlass", accentMaterial: "blackTitanium", visibleIn3d: true, selectableIn3d: true,
      childrenMode: "merged", variantId: "frontLoadWasher", variationSeed: 110101, styleSource: "generated"
    },
    mepMeta: {
      needsSocket: true, socketCount: 1, socketHeight: 1300, needsSwitch: false, switchControl: [], needsLighting: false,
      lightingType: "none", needsWaterSupply: true, waterSupplyType: "cold", needsDrainage: true, drainageType: "floorDrain",
      needsNetwork: false, needsVentilation: true, needsSmartControl: false, relatedCircuit: "B1 洗衣机独立回路",
      notes: "插座不得布置在机器正后方积水风险区，排水需可检修。"
    },
    constructionMeta: {
      customMade: false, installType: "floorStanding", reserveSize: "65x65x85cm", wallDependency: "",
      floorDependency: "完成面找平并设置可靠排水。", ceilingDependency: "", waterproofRequired: true,
      inspectionAccessRequired: true, purchaseCategory: "家电", supplierType: "洗衣设备供应商", notes: "保留前方操作和侧后方检修空间。"
    }
  });
}
furniture("furn-b1-laundry-washer-001").clearanceMeta = { frontMm: 900, sideMm: 100, serviceMm: 600 };
workspace.drawingItems = workspace.drawingItems.filter((item) => !String(item.generatedKey ?? "").includes("CG-B1-B1-001-SHOWER"));

// 1F — two kitchen sinks, one bathroom vanity, dining/water bar/fireplace relationship, doors and windows.
removeFurniture("furn-1f-living-rug-001");
const dining = furniture("module-1f-table-001");
const waterbar = furniture("furn-living-waterbar-001");
const waterbarUpper = workspace.furniture.find((item) => item.id === "furn-living-waterbar-upper-001");
const fireplace = furniture("furn-living-fireplace-south-001");
setPosition(dining, 7850, 6350, 0);
dining.dimensions.width = 180;
dining.dimensions.depth = 180;
dining.note = "六人圆桌采用紧凑可扩展款，常态收拢至 1800mm 动线包络；与主沙发保持约 740mm 连续通道。";
updateReserveSize(dining);
setPosition(waterbar, 9210, 4300, 90);
if (waterbarUpper) setPosition(waterbarUpper, 9325, 4300, 90);
bindWall(waterbar, "W-1F-011");
if (waterbarUpper) bindWall(waterbarUpper, "W-1F-011");
removeFurniture("furn-living-waterbar-upper-001");
setPosition(fireplace, 4072, 6475, 270);
bindWall(fireplace, "W-1F-013");
fireplace.dimensions.width = 250;
fireplace.name = "1F 客厅 W-1F-013 电视壁炉收纳组合墙";
fireplace.note = "整组贴 W-1F-013：电视、壁炉、下柜和收纳统一在一面组合墙中，不作为孤立壁炉摆件。";
fireplace.cabinetDesign = {
  template: "fireplace",
  title: "1F 电视壁炉收纳组合墙",
  designThinking: "将电视、壁炉、低柜与展示收纳整合为一面连续立面，减少零散家具并强化客厅视觉中心。",
  recommendedPlacement: "整组贴 W-1F-013，按墙面完成面复尺后居中布置。",
  layoutNotes: ["上部为电视与展示面", "中部嵌入壁炉并设置隔热构造", "下部连续低柜收纳影音设备", "边侧留检修与散热缝"],
  zones: [
    { id: "tv-zone", label: "电视区", role: "影音", widthPercent: 44, heightPercent: 58, detail: "电视居中，线缆走柜后隐藏。", serviceNote: "预留电源、网络和影音线管。" },
    { id: "fireplace-zone", label: "壁炉区", role: "氛围 / 取暖", widthPercent: 32, heightPercent: 42, detail: "壁炉嵌入组合墙并采用耐热基层。", serviceNote: "复核散热、检修与防火距离。" },
    { id: "storage-zone", label: "收纳区", role: "设备 / 展示", widthPercent: 24, heightPercent: 100, detail: "封闭柜与开放格组合，收纳设备及摆件。" }
  ],
  cautionNotes: ["壁炉类型确定后复核电源或烟道条件。", "电视与壁炉之间按厂家要求设置隔热和散热构造。"]
};
updateReserveSize(fireplace);
Object.assign(door("1F", "D-1F-004"), { operation: "sliding" });
Object.assign(door("1F", "D-1F-005"), { operation: "swing", openDirection: "rightIn" });
for (const [id, sillHeightMm, operation] of [
  ["WIN-1F-002", 1200, "sliding"], ["WIN-1F-003", 900, "casement"], ["WIN-1F-004", 1050, "sliding"],
  ["WIN-1F-005", 900, "casement"], ["WIN-1F-006", 900, "sliding"]
]) Object.assign(windowItem("1F", id), { sillHeightMm, operation });
setPosition(furniture("furn-bath-toilet-001"), 9100, 1665, 90);
const oneFloorIsland = furniture("furn-kitchen-entry-island-001");
const oneFloorSofa = furniture("furn-1f-living-main-sofa-001");
const oneFloorCoffeeTable = furniture("furn-1f-living-coffee-table-001");
oneFloorIsland.dimensions.width = 190;
oneFloorIsland.dimensions.depth = 70;
setPosition(oneFloorIsland, 6530, 4070, 0);
oneFloorIsland.note = "岛台向厨房侧回收，和主沙发之间保留约 640mm 连续通道，同时不改变厨房推拉门洞。";
updateReserveSize(oneFloorIsland);
oneFloorSofa.dimensions.width = 260;
setPosition(oneFloorSofa, 5650, 6400, 90);
oneFloorSofa.note = "主沙发略向西调整，与紧凑圆餐桌形成约 740mm 的客餐厅连续通道。";
oneFloorCoffeeTable.dimensions.width = 80;
oneFloorCoffeeTable.dimensions.depth = 35;
setPosition(oneFloorCoffeeTable, 4550, 6400, 90);
oneFloorCoffeeTable.note = "改为窄型可移动组合茶几，保留沙发西侧 360mm 人物通行缝；需要更大活动面时可展开。";
updateReserveSize(oneFloorCoffeeTable);

// 2F — right-sized bedroom cabinets and a complete, unobstructed main bedroom.
const bedroom1Wardrobe = furniture("furn-2f-bedroom1-wardrobe-001");
bedroom1Wardrobe.dimensions.width = 160;
setPosition(bedroom1Wardrobe, 3592, 7000, 90);
bindWall(bedroom1Wardrobe, "W-2F-015");
updateReserveSize(bedroom1Wardrobe);
removeFurniture("furn-2f-bedroom2-wardrobe-001");
const bedroom2Wardrobe = furniture("module-2f-wardrobe-002");
bedroom2Wardrobe.roomId = "ROOM-2F-005";
bedroom2Wardrobe.name = "卧室2 W-2F-013 通顶移门衣柜";
bedroom2Wardrobe.dimensions.width = 160;
setPosition(bedroom2Wardrobe, 5700, 5455, 0);
bindWall(bedroom2Wardrobe, "W-2F-013");
bedroom2Wardrobe.material = "暖白通顶柜体 + 前后错轨移门";
bedroom2Wardrobe.note = "贴 W-2F-013 布置，采用移门避免门扇占用床与柜体之间的紧凑通道。";
bedroom2Wardrobe.constructionNote = "按墙面完成面复尺；使用上承重或可靠下轨移门五金，门板分格、轨道检修和防跳装置由柜体厂家深化。";
bedroom2Wardrobe.render3d = { ...bedroom2Wardrobe.render3d, variantId: "slidingPanels" };
bedroom2Wardrobe.clearanceMeta = { frontMm: 500, sideMm: 100, serviceMm: 300 };
updateReserveSize(bedroom2Wardrobe);
const bedroom2Bed = workspace.furniture.find((item) => item.floorId === "2F" && item.roomId === "ROOM-2F-005" && item.type === "bed");
if (bedroom2Bed) {
  setPosition(bedroom2Bed, 5500, 7045, 90);
  bedroom2Bed.note = "床向南微调，为 W-2F-013 通顶移门衣柜保留约 540mm 柜前净距；移门不占用外摆门扇空间。";
}
const bedroom2WardrobeLight = drawingItem("L-2F-V1-23");
Object.assign(bedroom2WardrobeLight, {
  relatedFurnitureId: bedroom2Wardrobe.id, roomId: bedroom2Wardrobe.roomId, relatedRoomId: bedroom2Wardrobe.roomId,
  positionMm: { x: 5700, y: 5455 }, relatedFurniturePositionMm: { x: 5700, y: 5455 }, updatedAt: now
});
refreshFingerprint(bedroom2WardrobeLight);
const masterBed = furniture("furn-2f-master-bedroom-bed-001");
const masterWardrobe = furniture("furn-2f-master-bedroom-large-wardrobe-001");
const masterChest = furniture("furn-2f-master-bedroom-chest-001");
const masterRug = furniture("furn-2f-master-rug-001");
const cloakRight = furniture("module-2f-cloak-right");
cloakRight.dimensions.width = 120;
setPosition(cloakRight, 7370, 2400, 90);
bindWall(cloakRight, "W-2F-005");
updateReserveSize(cloakRight);
const masterBoundary = [
  { x: 7681, y: 3050 }, { x: 9495, y: 3050 }, { x: 9495, y: 7800 },
  { x: 6542, y: 7800 }, { x: 6542, y: 5150 }, { x: 7681, y: 5150 }
];
Object.assign(room("2F", "ROOM-2F-006"), { boundary: masterBoundary, area: polygonArea(masterBoundary) });
setPosition(masterBed, 7542, 6440, 90);
bindWall(masterBed, "W-2F-016");
masterBed.dimensions.width = 160;
masterBed.name = "主卧 W-2F-016 床头大床";
masterBed.note = "床头贴 W-2F-016，采用 1600mm 大床；床身向东伸入主卧下半段，并让床头、床尾两侧都通过 360mm 人物动线检查。";
updateReserveSize(masterBed);
masterWardrobe.dimensions.width = 200;
masterWardrobe.dimensions.width = 190;
setPosition(masterWardrobe, 9190, 4510, 90);
bindWall(masterWardrobe, "W-2F-011");
masterWardrobe.note = "衣柜沿 W-2F-011 向南退出 D-2F-007 门洞缓冲区，北端距门墙约 450mm。";
updateReserveSize(masterWardrobe);
masterChest.dimensions.width = 80;
setPosition(masterChest, 9270, 6500, 90);
bindWall(masterChest, "W-2F-011");
masterChest.name = "主卧 入门正对五斗柜";
masterChest.note = "从主卧入口可见，贴东墙 W-2F-011 下段；与大床侧边保持约 500mm，并和衣柜分段布置。";
updateReserveSize(masterChest);
masterRug.dimensions.width = 190;
masterRug.dimensions.depth = 200;
setPosition(masterRug, 7600, 6440, 90);
updateReserveSize(masterRug);
const masterShower = furniture("furn-2f-master-shower-001");
const masterBathtub = furniture("furn-2f-master-bathtub-001");
const masterVanity = furniture("furn-2f-master-vanity-001");
const masterToilet = furniture("furn-2f-master-toilet-001");
masterShower.dimensions.width = 80;
masterShower.dimensions.depth = 80;
setPosition(masterShower, 9095, 750, 0);
bindWall(masterShower, "W-2F-002");
masterShower.name = "主卫东北角 800mm 玻璃淋浴间";
masterShower.note = "淋浴间置于东北角，入口朝南；南侧留出与双台盆之间的转身区。";
updateReserveSize(masterShower);
masterBathtub.dimensions.width = 160;
masterBathtub.dimensions.depth = 65;
setPosition(masterBathtub, 8006, 1250, 90);
bindWall(masterBathtub, "W-2F-005");
masterBathtub.name = "主卫西墙紧凑浴缸";
masterBathtub.note = "浴缸纵向贴西墙 W-2F-005；与东侧双台盆重叠段形成约 664mm 中央通道。";
updateReserveSize(masterBathtub);
masterVanity.dimensions.width = 120;
masterVanity.dimensions.depth = 50;
setPosition(masterVanity, 9245, 2150, 90);
bindWall(masterVanity, "W-2F-006");
masterVanity.name = "主卫 W-2F-006 紧凑双台盆";
masterVanity.note = "采用 1200mm 紧凑双台盆，纵向贴东墙，避免占用 D-2F-007 入门中央通道。";
updateReserveSize(masterVanity);
masterToilet.dimensions.width = 60;
masterToilet.dimensions.depth = 70;
setPosition(masterToilet, 8036, 2740, 90);
bindWall(masterToilet, "W-2F-005");
masterToilet.name = "主卫西南角壁排马桶";
masterToilet.note = "马桶置于西南角并避开门洞中心；与浴缸端部错开约 390mm，与东侧台盆之间保持约 609mm 门内通道。";
updateReserveSize(masterToilet);
for (const [id, sillHeightMm, operation] of [
  ["WIN-2F-001", 1200, "sliding"], ["WIN-2F-002", 1200, "sliding"], ["WIN-2F-003", 850, "sliding"],
  ["WIN-2F-004", 900, "casement"], ["WIN-2F-005", 900, "casement"]
]) Object.assign(windowItem("2F", id), { sillHeightMm, operation });

// Yard — keep generated layout, move the north-yard tree fully inside its polygon and sync generated MEP/annotation points.
const yardPlant = furniture("furn-plant-001");
setPosition(yardPlant, 8800, -650, 0);
yardPlant.note = "北院桂花树已移入院界内，保留树冠、树池与边界退距，作为入户视线焦点。";
setPosition(furniture("ph-1f-south-lounge-set"), 7250, 9000, 0);
setPosition(furniture("ph-1f-south-drain-point"), 9200, 11200, 0);
furniture("ph-1f-south-outdoor-cabinet").clearanceMeta = { frontMm: 900, sideMm: 200, serviceMm: 600 };

const regeneratedLighting = generateLightingDesignV1({
  structuresByFloor: workspace.houseStructuresByFloor,
  furniture: workspace.furniture,
  existingItems: workspace.drawingItems,
  floorIds: workspace.floors.map((floor) => floor.id),
  now
});
workspace.drawingItems = regeneratedLighting.items;

// Sync untouched generated points for every moved object; mark known related points reviewed.
for (const item of workspace.furniture) {
  const floorStructure = structures[item.floorId];
  if (!floorStructure) continue;
  workspace.drawingItems = syncRelatedDrawingItemsToFurniture(workspace.drawingItems, item, floorStructure, {
    moveUntouchedGenerated: true,
    markReviewed: true
  });
}

workspace.dataRevision = "2026-07-15-stair-access-platform-v2";
workspace.defaultWorkspaceRevision = "2026-07-17-confirmed-whole-house-layout-v1";
workspace.savedAt = now;
workspace.updatedAt = now;
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

const changedSummary = {
  revision: workspace.dataRevision,
  furnitureCount: workspace.furniture.length,
  B1LaundryAreaM2: room("B1", "ROOM-B1-001").area / 1_000_000,
  B2SofaCenterMm: getFurnitureCenterMm(b2Sofa, structure("B2")),
  B2EntryClearanceMm: 5210 - 3676
};
console.log(JSON.stringify(changedSummary, null, 2));
