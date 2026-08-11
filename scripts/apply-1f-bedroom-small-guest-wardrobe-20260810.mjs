import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const workspaceUrl = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspaceUrl, "utf8"));
const furniture = workspace.furniture;
const drawingItems = workspace.drawingItems ?? [];
const updatedAt = "2026-08-10T23:50:00.000+08:00";

const byId = (items, id, label = id) => {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing ${label}: ${id}`);
  return item;
};
const xPct = (mm) => mm / 12000 * 100;
const yPct = (mm) => mm / 9000 * 100;

// Keep the approved bed and north-east inward-opening door. Only reduce the
// east-wall wardrobe to a hotel-style temporary clothes cabinet.
const wardrobe = byId(furniture, "module-1f-wardrobe-001", "1F bedroom wardrobe");
Object.assign(wardrobe, {
  code: "WD-1F-BED-GUEST",
  name: "1F卧室东墙700mm酒店式临时衣柜",
  dimensions: { width: 70, depth: 55, height: 220, unit: "cm" },
  position: { x: xPct(3622), y: yPct(6500), rotation: 90 },
  material: "暖白织物感双门 + 浅橡木侧板 + 暖橡木内柜",
  note: "替代原1200mm通顶大衣柜，仅承担少量临时挂衣。柜体位于东墙、紧接卧室门扇开启区之后；与门扇末端留100mm，与床侧保持约797mm净通道。",
  constructionNote: "700×550×2200mm成品感双门衣柜，必须用防倾倒件固定于东墙。两扇350mm柜门一次开启一扇，五金带缓冲。柜体北端距北墙1000mm，南端距南墙950mm。",
  doorType: "hinged",
  hostWallId: "W-1F-013",
  clearanceMeta: { frontMm: 797, status: "comfortable-compact" },
  wardrobeDesign: {
    columns: 2,
    rows: 3,
    columnWidths: [58, 42],
    cells: [
      { id: "guest-cell-hanging", column: 0, row: 0, kind: "hanging-short" },
      { id: "guest-cell-drawer", column: 1, row: 0, kind: "drawer" }
    ],
    modules: [
      { id: "guest-top", kind: "open", label: "旅行包/备用枕头", column: 0, columnSpan: 2, x: 0, y: 0, width: 100, height: 20, shelfCount: 1 },
      { id: "guest-hanging", kind: "hanging-short", label: "6–8件临时挂衣", column: 0, columnSpan: 1, x: 0, y: 20, width: 58, height: 62 },
      { id: "guest-folded", kind: "folded", label: "睡衣/叠放区", column: 1, columnSpan: 1, x: 58, y: 20, width: 42, height: 40, shelfCount: 2 },
      { id: "guest-drawer", kind: "drawer", label: "贴身衣物双抽", column: 1, columnSpan: 1, x: 58, y: 60, width: 42, height: 22, drawerRows: 2, drawerColumns: 1 },
      { id: "guest-bottom", kind: "shoe", label: "拖鞋/小行李", column: 0, columnSpan: 2, x: 0, y: 82, width: 100, height: 18 }
    ],
    notes: "酒店式临时衣柜：少量挂衣、双抽与旅行包位，不承担家庭主衣柜功能。"
  },
  render3d: {
    ...wardrobe.render3d,
    assetType: "wardrobe",
    variantId: "integratedTaupeWardrobe",
    primaryMaterial: "warmWhiteLacquer",
    secondaryMaterial: "warmOak",
    accentMaterial: "brushedBronze",
    cabinetVisual: {
      ...(wardrobe.render3d?.cabinetVisual ?? {}),
      frontStyle: "slab",
      handleStyle: "edgePull",
      allDoorPanels: true,
      doorCount: 2,
      sideScribeMm: 12,
      plinthSetbackMm: 70,
      cornerRadiusMm: 18
    },
    styleSource: "manual"
  },
  constructionMeta: {
    ...(wardrobe.constructionMeta ?? {}),
    customMade: false,
    installType: "finishedFurnitureAnchored",
    reserveSize: "70x55x220cm",
    wallDependency: "贴W-1F-013安装，并设置防倾倒连接件；北端避让D-1F-003门扇100mm。",
    floorDependency: "按完成面找平，底部内收踢脚70mm",
    ceilingDependency: "柜顶距2800mm顶面约600mm，不与吊顶相接",
    notes: "柜体按成品家具表达，未来可拆换；现场复核门扇、开关和东墙完成面。"
  },
  verificationMeta: {
    status: "estimated",
    source: "manual-input",
    sourceNote: "用户确认不需要大衣柜，仅保留少量临时衣物收纳橱。",
    toleranceMm: 30
  }
});

wardrobe.constructionAnchors = {
  ...(wardrobe.constructionAnchors ?? {}),
  points: [{
    id: "module-1f-wardrobe-001-lighting-power",
    type: "power",
    label: "临时衣柜感应灯电源",
    positionMm: { x: 0, y: 2000, z: -180 },
    installationHeightMm: 2000
  }],
  notes: "可选电池感应灯；若采用有线灯带，电源留在柜顶可检修区。"
};

const wardrobeLight = byId(drawingItems, "L-1F-V1-20", "wardrobe light");
Object.assign(wardrobeLight, {
  positionMm: { x: 3622, y: 6500 },
  relatedFurnitureId: wardrobe.id,
  relatedFurniturePositionMm: { x: 3622, y: 6500 },
  heightMm: 1950,
  label: "L-1F-V1-20 · 临时衣柜感应灯",
  notes: "700mm酒店式临时衣柜门控感应灯，可优先采用可更换电池灯具。",
  updatedAt
});

const dressingLight = drawingItems.find((item) => item.id === "L-1F-V1-21");
if (dressingLight) {
  dressingLight.positionMm = { x: 3020, y: 6500 };
  dressingLight.relatedFurniturePositionMm = { x: 3622, y: 6500 };
  dressingLight.label = "L-1F-V1-21 · 小衣柜前换衣功能灯";
  dressingLight.updatedAt = updatedAt;
}

const bedroomCamera = byId(workspace.cameraViews, "designer-camera-1f-09-bedroom", "1F bedroom camera");
Object.assign(bedroomCamera, {
  name: "1F小卧室1.5米床与酒店式临时衣柜",
  fov: 38,
  zoom: 1.04,
  description: "严格按2947×2650mm表现：900mm门洞位于北墙东端并向内贴东墙开启；1500×2000mm床头靠北、床尾朝1200mm飘窗；东墙仅设置700×550×2200mm酒店式临时衣柜，与门扇留100mm，与床侧约797mm；南侧东墙保持约950mm空白。床后1700×130mm长条台，无床头柜、无床上吊柜。"
});

const extraViews = [
  {
    id: "designer-camera-1f-bedroom-small-wardrobe-doorway",
    name: "1F卧室门口看床与飘窗（小衣柜版）",
    cameraPosition: { x: -3.2, y: 1.48, z: 3.15 },
    target: { x: -3.75, y: 1.05, z: 1.72 },
    description: "从东北门洞内侧向西南看：床在左、700mm小衣柜在右侧近门处、衣柜之后东墙留白、前方为飘窗。"
  },
  {
    id: "designer-camera-1f-bedroom-small-wardrobe-bay",
    name: "1F卧室飘窗回看门洞与小衣柜",
    cameraPosition: { x: -4.2, y: 1.45, z: 0.9 },
    target: { x: -3.5, y: 1.0, z: 2.8 },
    description: "从飘窗侧回看北墙：床头长条台、东北门洞及其后700mm小衣柜关系必须清楚，禁止把柜体拉成长墙。"
  },
  {
    id: "designer-camera-1f-bedroom-small-wardrobe-detail",
    name: "1F卧室临时衣柜与床侧通道细节",
    cameraPosition: { x: -3.0, y: 1.35, z: 1.95 },
    target: { x: -2.95, y: 1.1, z: 2.75 },
    description: "近景展示700×550×2200mm暖白双门临时衣柜、100mm门扇避让和约797mm床侧通道；柜体必须是独立小柜而非通顶整墙柜。"
  }
];
for (const view of extraViews) {
  const existing = workspace.cameraViews.find((candidate) => candidate.id === view.id);
  const value = {
    ...view,
    floor: "1F",
    mode: "perspective",
    scope: "floor",
    targetArea: "ROOM-1F-004",
    fov: 38,
    zoom: 1.04
  };
  if (existing) Object.assign(existing, value);
  else workspace.cameraViews.push(value);
}

workspace.defaultWorkspaceRevision = "1f-bedroom-small-guest-wardrobe-20260810";
workspace.savedAt = updatedAt;
await writeFile(workspaceUrl, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  wardrobe: { dimensions: wardrobe.dimensions, position: wardrobe.position },
  geometryMm: {
    doorLeafZoneY: [5150, 6050],
    wardrobeY: [6150, 6850],
    doorToWardrobe: 100,
    bedToWardrobe: 797,
    wardrobeToSouthWall: 950
  },
  cameras: extraViews.map((view) => view.id)
}, null, 2));
