import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const workspaceUrl = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspaceUrl, "utf8"));
const floor = workspace.houseStructuresByFloor["1F"];
const furniture = workspace.furniture;
let drawingItems = workspace.drawingItems ?? [];

const byId = (items, id, label = id) => {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing ${label}: ${id}`);
  return item;
};

const xPct = (millimetres) => millimetres / 12000 * 100;
const yPct = (millimetres) => millimetres / 9000 * 100;
const roomId = "ROOM-1F-004";
const updatedAt = "2026-08-10T23:20:00.000+08:00";

// Room: x=950..3897, y=5150..7800, clear size 2947 x 2650 mm.
// User-approved showroom relationship: bed and wardrobe run north/south in parallel,
// with the bedroom door relocated to the north-east end of the north wall.
const door = byId(floor.doors, "D-1F-003", "1F bedroom door");
Object.assign(door, {
  name: "1F卧室东北角900mm内开门（门扇贴东墙）",
  positionOnWall: 2397 / 2947,
  width: 900,
  height: 2100,
  operation: "swing",
  openDirection: "rightIn",
  defaultOpenAmount: 0.82,
  verificationMeta: {
    status: "estimated",
    source: "manual-input",
    sourceNote: "用户于2026-08-10确认将卧室门洞向东移动，以实现样板间床与衣柜平行关系；门扇向卧室内开并贴东墙，禁止向楼梯侧外开。",
    toleranceMm: 30
  }
});

const bed = byId(furniture, "module-1f-bed-002", "1F bedroom bed");
Object.assign(bed, {
  name: "1F卧室1500mm纵向低靠背床（朝飘窗）",
  dimensions: { width: 150, depth: 200, height: 95, unit: "cm" },
  position: { x: xPct(1800), y: yPct(6280), rotation: 0 },
  note: "1500×2000mm床改为南北向，床头靠北墙、床尾朝1200mm飘窗；西侧靠墙，东侧作为主要上下床通道。门侧不设置独立床头柜或通顶侧柜。",
  constructionNote: "床头与北墙之间保留130mm连续长条台；床体东侧至衣柜完成面约797mm，床尾至南墙约520mm。床上方不得设置吊柜。",
  render3d: {
    ...bed.render3d,
    variantId: "lowUpholstered",
    primaryMaterial: "beigeFabric",
    secondaryMaterial: "creamFabric",
    accentMaterial: "warmOak",
    bedVisual: {
      ...(bed.render3d?.bedVisual ?? {}),
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
    sourceNote: "用户确认参考样板间，将1.5m床旋转为与东墙衣柜平行的纵向布置。",
    toleranceMm: 30
  }
});

const wardrobe = byId(furniture, "module-1f-wardrobe-001", "1F bedroom wardrobe");
Object.assign(wardrobe, {
  code: "WD-1F-BED-E",
  name: "1F卧室东墙1200mm通顶移门衣柜",
  dimensions: { width: 120, depth: 55, height: 255, unit: "cm" },
  position: { x: xPct(3622), y: yPct(6700), rotation: 90 },
  material: "暖白织物感柜门 + 浅橡木收口 + 暖橡木内柜",
  note: "衣柜设置在入门后的东墙，柜体长向与床身平行。北端避开900mm门扇开启范围，南端不侵入飘窗转角。采用移门避免占用床侧通道。",
  constructionNote: "1200×550×2550mm通顶移门柜；柜体北端距北墙950mm，门扇完全开启后与柜体预留约50mm安全缝。柜前至床侧净距约797mm。",
  doorType: "sliding",
  hostWallId: "W-1F-013",
  clearanceMeta: { frontMm: 797, status: "comfortable-compact" },
  wardrobeDesign: {
    columns: 3,
    rows: 4,
    columnWidths: [40, 34, 26],
    cells: [
      { id: "east-cell-0", column: 0, row: 0, kind: "hanging-long" },
      { id: "east-cell-1", column: 1, row: 0, kind: "hanging-short" },
      { id: "east-cell-2", column: 2, row: 0, kind: "folded" }
    ],
    modules: [
      { id: "east-top", kind: "open", label: "换季被褥区", column: 0, columnSpan: 3, x: 0, y: 0, width: 100, height: 20, shelfCount: 1 },
      { id: "east-long", kind: "hanging-long", label: "长衣区", column: 0, columnSpan: 1, x: 0, y: 20, width: 40, height: 80 },
      { id: "east-short", kind: "hanging-short", label: "短衣双挂区", column: 1, columnSpan: 1, x: 40, y: 20, width: 34, height: 56 },
      { id: "east-drawer", kind: "drawer", label: "贴身衣物抽屉", column: 1, columnSpan: 1, x: 40, y: 76, width: 34, height: 24, drawerRows: 2, drawerColumns: 1 },
      { id: "east-folded", kind: "folded", label: "叠放与包袋区", column: 2, columnSpan: 1, x: 74, y: 20, width: 26, height: 80, shelfCount: 4 }
    ],
    notes: "小卧室主衣柜：移门、挂衣优先，顶部收纳换季被褥。"
  },
  render3d: {
    ...wardrobe.render3d,
    assetType: "wardrobe",
    variantId: "slidingPanels",
    primaryMaterial: "warmWhiteLacquer",
    secondaryMaterial: "warmOak",
    accentMaterial: "brushedBronze",
    cabinetVisual: {
      ...(wardrobe.render3d?.cabinetVisual ?? {}),
      frontStyle: "slab",
      handleStyle: "edgePull",
      allDoorPanels: true,
      doorCount: 2,
      sideScribeMm: 20,
      plinthSetbackMm: 80
    },
    styleSource: "manual"
  },
  constructionMeta: {
    ...(wardrobe.constructionMeta ?? {}),
    customMade: true,
    installType: "customCabinet",
    reserveSize: "120x55x255cm",
    wallDependency: "绑定W-1F-013；北端避让D-1F-003门扇900mm开启范围，南端避让飘窗窗帘收口。",
    floorDependency: "按完成面标高校核落地尺寸",
    ceilingDependency: "通顶柜与吊顶、柜内灯带电源协同",
    notes: "移门不得突出柜前通道；现场复核东墙垂直度和门套完成面。"
  },
  constructionAnchors: {
    points: [{
      id: "module-1f-wardrobe-001-lighting-power",
      type: "power",
      label: "东墙衣柜感应灯电源",
      positionMm: { x: 0, y: 2280, z: -180 },
      installationHeightMm: 2280
    }],
    notes: "驱动电源设在柜体顶部可检修区。"
  },
  verificationMeta: {
    status: "estimated",
    source: "manual-input",
    sourceNote: "用户确认参考样板间，在门旁东墙设置与床身平行的通顶衣柜。",
    toleranceMm: 30
  }
});

const removedFurnitureIds = new Set([
  "furn-1f-bedroom-wardrobe-south-001"
]);
workspace.furniture = furniture.filter((item) => !removedFurnitureIds.has(item.id));

const ledge = byId(workspace.furniture, "furn-1f-bedroom-headboard-ledge-001", "headboard ledge");
Object.assign(ledge, {
  name: "1F卧室床后1700mm悬浮长条置物台",
  dimensions: { width: 170, depth: 13, height: 7, unit: "cm" },
  position: { x: xPct(1800), y: yPct(5215), rotation: 0 },
  hostWallId: "W-1F-012",
  note: "床头与北墙之间的1700×130mm悬浮长条台，左右各超出床身100mm，替代独立床头柜；门侧不再设置落地柜。",
  constructionNote: "台面底标高650mm、完成高度720mm；前缘R20圆角并设止物边。插座和USB-C布置在床宽范围两端，避开枕头正后方。",
  constructionMeta: {
    ...(ledge.constructionMeta ?? {}),
    reserveSize: "170x13x7cm",
    wallDependency: "固定于W-1F-012西段，东端避让D-1F-003门套。",
    ceilingDependency: "床头正上方完全留空"
  },
  constructionAnchors: {
    points: [
      { id: "furn-1f-bedroom-headboard-ledge-left-power", type: "power", label: "西侧五孔+USB-C", positionMm: { x: -610, y: 720, z: -20 }, installationHeightMm: 720 },
      { id: "furn-1f-bedroom-headboard-ledge-right-power", type: "power", label: "东侧五孔+USB-C", positionMm: { x: 610, y: 720, z: -20 }, installationHeightMm: 720 }
    ],
    installationHeightMm: 650,
    notes: "电源点随新床头方向调整，避开软包靠背和门套。"
  },
  verificationMeta: {
    status: "estimated",
    source: "manual-input",
    sourceNote: "保留用户确认的床后长条台，随床旋转至北墙。",
    toleranceMm: 20
  }
});

// Synchronise room lighting. Keep the former desk control group alive by
// repurposing it as a wardrobe-front dressing light, because whole-house
// scenes and the drawing package already reference that stable group/id.
const removeDrawingIds = new Set([
  "L-1F-BEDROOM-SOUTH-TOWER-01"
]);
drawingItems = drawingItems.filter((item) => !removeDrawingIds.has(item.id));

for (const [id, x, label] of [
  ["L-1F-V1-18", 1200, "西侧"],
  ["L-1F-V1-19", 2400, "东侧"]
]) {
  const light = byId(drawingItems, id, `${label} reading light`);
  Object.assign(light, {
    positionMm: { x, y: 5220 },
    hostWallId: "W-1F-012",
    heightMm: 1050,
    relatedFurnitureId: bed.id,
    relatedFurniturePositionMm: { x: 1800, y: 6280 },
    label: `${id} · 卧室床头${label}壁装阅读灯`,
    notes: "壁装定向阅读灯，不占长条台台面；开关与USB-C集中在长条台对应端。",
    source: "generated-from-furniture",
    updatedAt
  });
  delete light.generatedFingerprint;
  delete light.generatedKey;
}

const wardrobeLight = byId(drawingItems, "L-1F-V1-20", "wardrobe light");
Object.assign(wardrobeLight, {
  positionMm: { x: 3622, y: 6700 },
  relatedFurnitureId: wardrobe.id,
  relatedFurniturePositionMm: { x: 3622, y: 6700 },
  label: "L-1F-V1-20 · 东墙通顶衣柜感应灯带",
  notes: "1200mm通顶移门柜门控感应灯；驱动电源留顶部可检修区。",
  source: "generated-from-furniture",
  updatedAt
});
delete wardrobeLight.generatedFingerprint;
delete wardrobeLight.generatedKey;

const wardrobeSwitch = drawingItems.find((item) => item.id === "SW-1F-V1-16");
if (wardrobeSwitch) {
  Object.assign(wardrobeSwitch, {
    positionMm: { x: 2780, y: 5270 },
    controlledLightIds: [wardrobeLight.id],
    relatedLightIds: [wardrobeLight.id],
    notes: "控制东墙通顶衣柜感应灯；日常由移门门控自动触发。",
    source: "manual",
    updatedAt
  });
  delete wardrobeSwitch.generatedFingerprint;
  delete wardrobeSwitch.generatedKey;
}

let dressingLight = drawingItems.find((item) => item.id === "L-1F-V1-21");
if (!dressingLight) {
  dressingLight = structuredClone(wardrobeLight);
  dressingLight.id = "L-1F-V1-21";
  drawingItems.push(dressingLight);
}
Object.assign(dressingLight, {
  type: "deskTaskLight",
  positionMm: { x: 3000, y: 6700 },
  relatedFurnitureId: wardrobe.id,
  heightMm: 2100,
  label: "L-1F-V1-21 · 衣柜前换衣功能灯",
  notes: "原书桌功能灯改为衣柜前低眩洗墙/换衣照明，保留原控制组以兼容既有全屋场景。",
  relatedSwitchId: "SW-1F-V1-17",
  controlGroupId: "CG-1F-1F-004-DESK",
  lightGroupId: "CG-1F-1F-004-DESK",
  lightType: "deskTaskLight",
  lightingLayer: "task",
  mountingType: "surfaceMounted",
  relatedFurniturePositionMm: { x: 3622, y: 6700 },
  lightSpec: {
    powerW: 8,
    luminousFluxLm: 600,
    cri: 95,
    glareRating: "低眩",
    fixtureFamily: "desk-task",
    trimColor: "暖白"
  },
  source: "generated-from-furniture",
  updatedAt
});
delete dressingLight.generatedFingerprint;
delete dressingLight.generatedKey;

let dressingSwitch = drawingItems.find((item) => item.id === "SW-1F-V1-17");
if (!dressingSwitch) {
  dressingSwitch = structuredClone(wardrobeSwitch);
  dressingSwitch.id = "SW-1F-V1-17";
  drawingItems.push(dressingSwitch);
}
Object.assign(dressingSwitch, {
  positionMm: { x: 2780, y: 5400 },
  label: "SW-1F-V1-17 · 衣柜前功能照明控制",
  notes: "控制衣柜前换衣照明；保留原DESK控制组标识以兼容既有场景。",
  controlGroupId: "CG-1F-1F-004-DESK",
  lightGroupId: "CG-1F-1F-004-DESK",
  controlledLightIds: [dressingLight.id],
  relatedLightIds: [dressingLight.id],
  dimming: true,
  source: "manual",
  updatedAt
});
delete dressingSwitch.generatedFingerprint;
delete dressingSwitch.generatedKey;

const generalLight = drawingItems.find((item) => item.id === "L-1F-V1-17");
if (generalLight) generalLight.positionMm = { x: 2100, y: 6350 };
const nightLight = drawingItems.find((item) => item.id === "L-1F-V1-22");
if (nightLight) {
  nightLight.positionMm = { x: 2800, y: 7200 };
  nightLight.relatedFurniturePositionMm = { x: 1800, y: 6280 };
}
workspace.drawingItems = drawingItems;

const camera = byId(workspace.cameraViews, "designer-camera-1f-09-bedroom", "1F bedroom camera");
Object.assign(camera, {
  name: "1F小卧室样板间式床柜平行布局",
  cameraPosition: { x: -3.2, y: 1.48, z: 3.15 },
  target: { x: -3.75, y: 1.05, z: 1.72 },
  zoom: 1.04,
  fov: 38,
  description: "严格按2947×2650mm表现：门洞移至北墙东端，900mm门向卧室内开并贴东墙；1500×2000mm床头靠北、床尾朝南侧1200mm飘窗；东墙1200×550mm通顶移门衣柜与床身平行，门扇与衣柜之间留50mm，柜前至床侧约797mm；床头后方1700×130mm长条台，无床头柜、无床上吊柜。禁止广角虚增空间。"
});

workspace.defaultWorkspaceRevision = "1f-bedroom-showroom-parallel-layout-20260810";
workspace.savedAt = updatedAt;

await writeFile(workspaceUrl, `${JSON.stringify(workspace, null, 2)}\n`);
console.log(JSON.stringify({
  door: { positionOnWall: door.positionOnWall, spanMm: [2897, 3797], openDirection: door.openDirection },
  bed: { centerMm: [1800, 6280], footprintMm: [1050, 5280, 2550, 7280] },
  wardrobe: { centerMm: [3622, 6700], footprintMm: [3347, 6100, 3897, 7300] },
  clearancesMm: { doorLeafToWardrobe: 50, bedToWardrobe: 797, bedFootToSouthWall: 520 },
  removedFurniture: [...removedFurnitureIds],
  removedDrawingItems: [...removeDrawingIds]
}, null, 2));
