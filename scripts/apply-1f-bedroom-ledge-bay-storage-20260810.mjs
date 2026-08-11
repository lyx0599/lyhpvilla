import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const workspaceUrl = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspaceUrl, "utf8"));
const furniture = workspace.furniture;
const drawingItems = workspace.drawingItems ?? [];

const byId = (items, id, label = id) => {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing ${label}: ${id}`);
  return item;
};

const xPct = (millimetres) => millimetres / 12000 * 100;
const yPct = (millimetres) => millimetres / 9000 * 100;
const roomId = "ROOM-1F-004";

// Verified room geometry: 2947 x 2650 mm, west wall x=950, north wall y=5150,
// south wall y=7800. The 1200 mm bay is centred on the south wall.
const bed = byId(furniture, "module-1f-bed-002", "1F bedroom bed");
Object.assign(bed, {
  name: "1F卧室1500mm低靠背床（床后130mm长条置物台）",
  dimensions: { width: 150, depth: 200, height: 95, unit: "cm" },
  position: { x: xPct(2080), y: yPct(6475), rotation: 270 },
  note: "1500×2000mm床保持东西向、床头朝西；床体前移130mm容纳床后长条台。东侧不再设置深衣柜，床尾完成面通道约750–800mm。",
  constructionNote: "床架外长控制在2050mm以内；床头不设吊柜。两侧通顶侧柜与床身留柔性收口，阅读灯、插座和USB-C按长条台两端定位。",
  render3d: {
    ...bed.render3d,
    variantId: "lowUpholstered",
    primaryMaterial: "beigeFabric",
    secondaryMaterial: "creamFabric",
    accentMaterial: "warmOak",
    bedVisual: {
      headboardStyle: "standard",
      chargingNiche: false,
      noOverheadCabinet: true,
      relatedLedgeId: "furn-1f-bedroom-headboard-ledge-001"
    },
    styleSource: "manual"
  },
  verificationMeta: {
    status: "estimated",
    source: "manual-input",
    sourceNote: "用户确认：保留1.5m床，床正上方不做柜，床后用长条台替代独立床头柜。",
    toleranceMm: 30
  }
});

const makeTowerDesign = (label) => ({
  columns: 1,
  rows: 3,
  cells: [
    { id: `${label}-cell-hanging-long`, column: 0, row: 0, kind: "hanging-long" },
    { id: `${label}-cell-hanging-short`, column: 0, row: 1, kind: "hanging-short" },
    { id: `${label}-cell-drawer`, column: 0, row: 2, kind: "drawer" }
  ],
  modules: [
    { id: `${label}-hanging`, kind: "hanging-long", label: "日常挂衣", column: 0, columnSpan: 1, x: 0, y: 0, width: 100, height: 72 },
    { id: `${label}-drawer`, kind: "drawer", label: "贴身衣物抽屉", column: 0, columnSpan: 1, drawerRows: 2, drawerColumns: 1, x: 0, y: 72, width: 100, height: 28 }
  ],
  columnWidths: [100],
  notes: "窄幅单门侧柜：中下段日常挂衣，底部双抽；床正上方完全留空。"
});

const northTower = byId(furniture, "module-1f-wardrobe-001", "existing bedroom wardrobe");
Object.assign(northTower, {
  code: "WD-1F-BED-N",
  name: "1F卧室床头北侧450mm通顶挂衣柜",
  dimensions: { width: 45, depth: 55, height: 255, unit: "cm" },
  position: { x: xPct(1225), y: yPct(5375), rotation: 90 },
  material: "浅暖灰哑光柜门 + 暖橡木内柜",
  note: "床头北侧独立通顶侧柜，柜宽450mm、深550mm；不跨越床头上方。承担一人常穿短衣和少量长衣。",
  constructionNote: "单门暗拉手，门扇向远离床侧开启；柜角做R20柔和收口，底部内收踢脚100mm。",
  wardrobeDesign: makeTowerDesign("north"),
  render3d: {
    ...northTower.render3d,
    variantId: "integratedTaupeWardrobe",
    cabinetVisual: {
      ...(northTower.render3d?.cabinetVisual ?? {}),
      frontStyle: "slab",
      handleStyle: "groove",
      allDoorPanels: true,
      doorCount: 1,
      sideScribeMm: 20,
      plinthSetbackMm: 100
    },
    styleSource: "manual"
  },
  constructionMeta: {
    ...northTower.constructionMeta,
    reserveSize: "45x55x255cm",
    wallDependency: "贴W-1F-010北端安装，与北墙和床后长条台收口。",
    notes: "床上方不设吊柜；侧柜门、床侧进出与卧室门扇现场复核。"
  },
  verificationMeta: {
    status: "estimated",
    source: "manual-input",
    sourceNote: "根据2947×2650mm卧室净尺寸重排，替代原东墙2500mm深衣柜。",
    toleranceMm: 30
  }
});
northTower.constructionAnchors = {
  ...(northTower.constructionAnchors ?? {}),
  points: [{
    id: "module-1f-wardrobe-001-lighting-power",
    type: "power",
    label: "北侧柜内感应灯电源",
    positionMm: { x: 0, y: 2280, z: -180 },
    installationHeightMm: 2280
  }],
  notes: "柜内感应灯驱动留在顶部可检修区。"
};

const southTower = structuredClone(northTower);
Object.assign(southTower, {
  id: "furn-1f-bedroom-wardrobe-south-001",
  code: "WD-1F-BED-S",
  name: "1F卧室床头南侧450mm通顶挂衣柜",
  position: { x: xPct(1225), y: yPct(7575), rotation: 90 },
  note: "床头南侧独立通顶侧柜，柜宽450mm、深550mm；与北侧柜对称但床正上方完全留空。",
  constructionNote: "单门暗拉手，门扇向远离床侧开启；南端避让飘窗墙体与窗帘收口。",
  wardrobeDesign: makeTowerDesign("south"),
  verificationMeta: {
    status: "estimated",
    source: "manual-input",
    sourceNote: "用户确认的床头两侧柜方案；不设置床头上方柜体。",
    toleranceMm: 30
  }
});
southTower.constructionMeta = {
  ...southTower.constructionMeta,
  wallDependency: "贴W-1F-010南端安装，避让W-1F-014飘窗窗帘和墙角收口。"
};
southTower.constructionAnchors = {
  ...(southTower.constructionAnchors ?? {}),
  points: [{
    id: "furn-1f-bedroom-wardrobe-south-001-lighting-power",
    type: "power",
    label: "南侧柜内感应灯电源",
    positionMm: { x: 0, y: 2280, z: -180 },
    installationHeightMm: 2280
  }]
};
if (!furniture.some((item) => item.id === southTower.id)) furniture.push(southTower);

const shelf = {
  id: "furn-1f-bedroom-headboard-ledge-001",
  code: "HB-1F-LEDGE-01",
  name: "1F卧室床后1750mm悬浮长条置物台",
  type: "sideboard",
  catalogId: "storage-sideboard",
  moduleCategory: "bedroom",
  moduleType: "sideboard",
  floorId: "1F",
  roomId,
  dimensions: { width: 175, depth: 13, height: 7, unit: "cm" },
  material: "暖橡木实木皮 + 圆角耐磨清漆",
  note: "床头与西墙之间的连续悬浮置物台，深130mm、台面完成高度约720mm，替代两个独立床头柜。",
  constructionNote: "台面底标高650mm、厚70mm；前缘R20圆角并设10mm止物边。左右端分别预留五孔、USB-C和阅读灯双控，插座不设在枕头正后方。",
  serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
  position: { x: xPct(1015), y: yPct(6475), rotation: 90 },
  color: "#b58f68",
  render3d: {
    assetType: "sideboard",
    detailLevel: "presentation",
    stylePreset: "tuscanWabiSabi",
    primaryMaterial: "warmOak",
    secondaryMaterial: "warmWhiteCeramic",
    accentMaterial: "brushedBronze",
    visibleIn3d: true,
    selectableIn3d: true,
    childrenMode: "grouped",
    variantId: "floating",
    variationSeed: 17101301,
    styleSource: "manual",
    elevationMm: 650
  },
  mepMeta: {
    needsSocket: true,
    socketCount: 4,
    socketHeight: 720,
    needsSwitch: true,
    switchControl: ["左右阅读灯独立控制", "卧室主灯双控"],
    needsLighting: false,
    lightingType: "none",
    needsWaterSupply: false,
    waterSupplyType: "none",
    needsDrainage: false,
    drainageType: "none",
    needsNetwork: true,
    needsVentilation: false,
    needsSmartControl: false,
    relatedCircuit: "卧室床头回路",
    notes: "左右端各设五孔+USB-C，中心区不设插座，避免位于枕头正后方。"
  },
  constructionMeta: {
    customMade: true,
    installType: "wallMounted",
    reserveSize: "175x13x7cm",
    wallDependency: "固定于W-1F-010，墙内预埋连续基层；与两侧通顶柜收口。",
    floorDependency: "台面完成高度720mm",
    ceilingDependency: "床头正上方完全留空",
    waterproofRequired: false,
    inspectionAccessRequired: false,
    purchaseCategory: "定制柜体/硬装",
    supplierType: "全屋定制/木作供应商",
    notes: "承重按局部20kg校核；电源检修口设在两端侧柜内。"
  },
  hostWallId: "W-1F-010",
  verificationMeta: {
    status: "estimated",
    source: "manual-input",
    sourceNote: "用户确认以床后长条小台替代独立床头柜。",
    toleranceMm: 20
  },
  constructionAnchors: {
    points: [
      { id: "furn-1f-bedroom-headboard-ledge-left-power", type: "power", label: "北侧五孔+USB-C", positionMm: { x: -680, y: 720, z: -20 }, installationHeightMm: 720 },
      { id: "furn-1f-bedroom-headboard-ledge-right-power", type: "power", label: "南侧五孔+USB-C", positionMm: { x: 680, y: 720, z: -20 }, installationHeightMm: 720 }
    ],
    installationHeightMm: 650,
    notes: "电源点随长条台定位，避开软包靠背及枕头中心区。"
  }
};
const shelfIndex = furniture.findIndex((item) => item.id === shelf.id);
if (shelfIndex >= 0) furniture[shelfIndex] = shelf;
else furniture.push(shelf);

const bayTemplate = byId(furniture, "furn-2f-master-bay-bench-001", "2F bay bench template");
const bayStorage = structuredClone(bayTemplate);
Object.assign(bayStorage, {
  id: "furn-1f-bedroom-bay-storage-001",
  code: "BN-1F-BAY-01",
  name: "1F卧室1200mm飘窗收纳坐榻",
  floorId: "1F",
  roomId,
  dimensions: { width: 120, depth: 55, height: 45, unit: "cm" },
  position: { x: xPct(950 + 2947 * 0.539), y: yPct(8075), rotation: 0 },
  material: "浅橡木柜体 + 燕麦色可拆洗坐垫",
  note: "利用1200×550mm外挑飘窗投影做低柜，不占室内2650mm净深；收纳床品、换季衣物和杂物。",
  constructionNote: "柜体位于W-1F-014墙外飘窗投影内，台面高450mm。采用两格气撑上翻柜并辅以浅抽，确保内开窗扇、把手和窗帘均可使用。",
  hostWallId: "W-1F-014",
  verificationMeta: {
    status: "estimated",
    source: "manual-input",
    sourceNote: "用户确认利用1F卧室飘窗增加储物。",
    toleranceMm: 30
  }
});
bayStorage.render3d = {
  ...bayStorage.render3d,
  assetType: "sideboard",
  variantId: "floating",
  variationSeed: 17101302,
  styleSource: "manual"
};
bayStorage.constructionMeta = {
  ...bayStorage.constructionMeta,
  reserveSize: "120x55x45cm",
  wallDependency: "绑定W-1F-014与BW-1F-003，按飘窗完成面复尺。",
  floorDependency: "柜体落于飘窗结构台，非室内地面通道",
  notes: "优先上翻收纳，避免抽屉全开与床侧通道冲突。"
};
const bayIndex = furniture.findIndex((item) => item.id === bayStorage.id);
if (bayIndex >= 0) furniture[bayIndex] = bayStorage;
else furniture.push(bayStorage);

const removedNightstandIds = new Set([
  "furn-1f-bedroom-nightstand-north-001",
  "furn-1f-bedroom-nightstand-south-001"
]);
workspace.furniture = furniture.filter((item) => !removedNightstandIds.has(item.id));

const readingLightNorth = byId(drawingItems, "L-1F-V1-18", "north bedside reading light");
const readingLightSouth = byId(drawingItems, "L-1F-V1-19", "south bedside reading light");
for (const [light, y, label] of [
  [readingLightNorth, 5875, "北侧"],
  [readingLightSouth, 7075, "南侧"]
]) {
  Object.assign(light, {
    positionMm: { x: 1080, y },
    hostWallId: "W-1F-010",
    heightMm: 1050,
    label: `${light.id} · 卧室${label}壁装阅读灯`,
    notes: "壁装定向阅读灯，不占长条台台面；开关与USB-C集中在长条台对应端。",
    source: "manual",
    updatedAt: "2026-08-10T22:30:00.000+08:00",
    relatedFurniturePositionMm: { x: 2080, y: 6475 }
  });
  delete light.generatedFingerprint;
  delete light.generatedKey;
}

const northWardrobeLight = byId(drawingItems, "L-1F-V1-20", "north wardrobe light");
Object.assign(northWardrobeLight, {
  positionMm: { x: 1225, y: 5375 },
  relatedFurnitureId: northTower.id,
  relatedFurniturePositionMm: { x: 1225, y: 5375 },
  label: "L-1F-V1-20 · 北侧床头柜内感应灯带",
  notes: "北侧450mm通顶侧柜门控感应灯；驱动电源留顶部可检修区。",
  source: "manual",
  updatedAt: "2026-08-10T22:30:00.000+08:00"
});
delete northWardrobeLight.generatedFingerprint;
delete northWardrobeLight.generatedKey;

const southLightId = "L-1F-BEDROOM-SOUTH-TOWER-01";
let southWardrobeLight = drawingItems.find((item) => item.id === southLightId);
if (!southWardrobeLight) {
  southWardrobeLight = structuredClone(northWardrobeLight);
  southWardrobeLight.id = southLightId;
  drawingItems.push(southWardrobeLight);
}
Object.assign(southWardrobeLight, {
  positionMm: { x: 1225, y: 7575 },
  relatedFurnitureId: southTower.id,
  relatedFurniturePositionMm: { x: 1225, y: 7575 },
  label: "L-1F-BEDROOM-SOUTH-TOWER-01 · 南侧床头柜内感应灯带",
  notes: "南侧450mm通顶侧柜门控感应灯；驱动电源留顶部可检修区。",
  source: "manual",
  updatedAt: "2026-08-10T22:30:00.000+08:00"
});
delete southWardrobeLight.generatedFingerprint;
delete southWardrobeLight.generatedKey;

const wardrobeSwitch = drawingItems.find((item) => item.id === "SW-1F-V1-16");
if (wardrobeSwitch) {
  wardrobeSwitch.controlledLightIds = [northWardrobeLight.id, southWardrobeLight.id];
  wardrobeSwitch.relatedLightIds = [northWardrobeLight.id, southWardrobeLight.id];
  wardrobeSwitch.notes = "控制两侧床头通顶柜内感应灯；日常由门控自动触发。";
  wardrobeSwitch.positionMm = { x: 2050, y: 5270 };
  wardrobeSwitch.source = "manual";
  delete wardrobeSwitch.generatedFingerprint;
  delete wardrobeSwitch.generatedKey;
}

workspace.drawingItems = drawingItems;

const bedroomCamera = byId(workspace.cameraViews, "designer-camera-1f-09-bedroom", "1F bedroom camera");
Object.assign(bedroomCamera, {
  name: "1F小卧室床后长条台与飘窗收纳",
  cameraPosition: { x: -3.45, y: 1.5, z: 0.92 },
  target: { x: -3.68, y: 1.0, z: 2.68 },
  zoom: 1.04,
  fov: 40,
  description: "按2947×2650mm真实尺度表现：1500×2000mm床头朝西并前移130mm；床后1750×130mm悬浮长条台替代床头柜；床头南北两侧各450×550mm通顶侧柜，床正上方完全留空；1200×550mm飘窗投影内设置低位收纳坐榻；东墙不设深柜。禁止广角虚增空间。"
});

workspace.defaultWorkspaceRevision = "1f-bedroom-ledge-bay-storage-20260810";
workspace.savedAt = "2026-08-10T22:30:00.000+08:00";

await writeFile(workspaceUrl, `${JSON.stringify(workspace, null, 2)}\n`);
console.log(JSON.stringify({
  bed: bed.position,
  northTower: northTower.position,
  southTower: southTower.position,
  shelf: shelf.position,
  bayStorage: bayStorage.position,
  removedNightstands: [...removedNightstandIds],
  bedroomCamera: bedroomCamera.id
}, null, 2));
