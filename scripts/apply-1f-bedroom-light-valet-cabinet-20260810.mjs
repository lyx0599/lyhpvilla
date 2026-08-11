import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const workspaceUrl = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspaceUrl, "utf8"));
const updatedAt = "2026-08-11T00:20:00.000+08:00";
const byId = (items, id, label = id) => {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing ${label}: ${id}`);
  return item;
};
const xPct = (mm) => mm / 12000 * 100;
const yPct = (mm) => mm / 9000 * 100;

const wardrobe = byId(workspace.furniture, "module-1f-wardrobe-001", "1F bedroom wardrobe");
Object.assign(wardrobe, {
  code: "WD-1F-BED-VALET",
  name: "1F卧室东墙700mm轻量酒店衣帽柜",
  dimensions: { width: 70, depth: 45, height: 175, unit: "cm" },
  position: { x: xPct(3672), y: yPct(6500), rotation: 90 },
  material: "低饱和深胡桃木圆角外框 + 燕麦灰竖纹卷帘感双门 + 拉丝古铜双拉手",
  note: "由高瘦衣帽塔改为700×450×1750mm家具型衣帽柜。柜体仍贴东墙、与床平行；采用前后向侧拉挂衣杆容纳6–8件短外套/衬衫，450mm深度即可使用，并把床侧净通道提高到约897mm。",
  constructionNote: "700×450×1750mm定制柜；双向卷帘感滑移门不占通道。上层小包位，中部前后向侧拉挂衣杆，下部双抽与拖鞋位；柜体防倾倒固定。北端距开启门扇100mm，南端距南墙950mm。长外套使用入户收纳。",
  clearanceMeta: { frontMm: 897, status: "comfortable" },
  wardrobeDesign: {
    columns: 1,
    rows: 4,
    columnWidths: [100],
    cells: [
      { id: "valet-cell-top", column: 0, row: 0, kind: "open" },
      { id: "valet-cell-hanging", column: 0, row: 1, kind: "hanging-short" },
      { id: "valet-cell-drawer", column: 0, row: 2, kind: "drawer" },
      { id: "valet-cell-bottom", column: 0, row: 3, kind: "shoe" }
    ],
    modules: [
      { id: "valet-top", kind: "open", label: "旅行包/备用枕", column: 0, columnSpan: 1, x: 0, y: 0, width: 100, height: 18, shelfCount: 1 },
      { id: "valet-pullout-hanging", kind: "hanging-short", label: "侧拉挂衣6–8件", column: 0, columnSpan: 1, x: 0, y: 18, width: 100, height: 56 },
      { id: "valet-drawers", kind: "drawer", label: "睡衣/贴身衣物双抽", column: 0, columnSpan: 1, x: 0, y: 74, width: 100, height: 16, drawerRows: 2, drawerColumns: 1 },
      { id: "valet-bottom", kind: "shoe", label: "拖鞋/折叠行李", column: 0, columnSpan: 1, x: 0, y: 90, width: 100, height: 10 }
    ],
    notes: "轻量偶住收纳：侧拉挂衣解决450mm薄柜深度，不承担家庭主衣柜功能。"
  },
  render3d: {
    ...wardrobe.render3d,
    assetType: "wardrobe",
    variantId: "boutiqueValetCabinet",
    detailLevel: "presentation",
    primaryMaterial: "darkWalnut",
    secondaryMaterial: "greigeLinen",
    accentMaterial: "agedBrass",
    cabinetMaterialOverrides: {
      carcass: "darkWalnut",
      door: "greigeLinen",
      hardware: "agedBrass"
    },
    cabinetVisual: {
      ...(wardrobe.render3d?.cabinetVisual ?? {}),
      frontStyle: "fluted",
      handleStyle: "edgePull",
      openingMode: "sliding",
      allDoorPanels: true,
      doorCount: 2,
      sideScribeMm: 42,
      plinthSetbackMm: 80,
      toeKickHeightMm: 80,
      cornerRadiusMm: 28,
      interiorLighting: true
    },
    styleSource: "manual",
    styleLocked: true
  },
  constructionMeta: {
    ...(wardrobe.constructionMeta ?? {}),
    customMade: true,
    installType: "customFreestandingAnchored",
    reserveSize: "70x45x175cm",
    wallDependency: "贴W-1F-013安装；北端避让D-1F-003开启门扇100mm。",
    floorDependency: "80mm内收暗踢脚，正面不出现独立柜脚",
    ceilingDependency: "柜顶距2800mm顶面约1050mm，明确按家具尺度收口，不伪装通顶柜",
    notes: "450mm薄柜必须采用前后向侧拉衣通；普通横向挂衣杆会导致衣架深度不足，禁止替换。"
  }
});

const wardrobeLight = byId(workspace.drawingItems ?? [], "L-1F-V1-20", "wardrobe light");
Object.assign(wardrobeLight, {
  positionMm: { x: 3672, y: 6500 },
  relatedFurniturePositionMm: { x: 3672, y: 6500 },
  heightMm: 1600,
  label: "L-1F-V1-20 · 轻量衣帽柜感应灯",
  notes: "450mm薄柜内侧高显色门控灯带，驱动位于柜顶可检修区。",
  updatedAt
});

const dressingLight = (workspace.drawingItems ?? []).find((item) => item.id === "L-1F-V1-21");
if (dressingLight) {
  dressingLight.positionMm = { x: 3000, y: 6500 };
  dressingLight.relatedFurniturePositionMm = { x: 3672, y: 6500 };
  dressingLight.label = "L-1F-V1-21 · 897mm通道换衣功能灯";
  dressingLight.updatedAt = updatedAt;
}

for (const id of [
  "designer-camera-1f-09-bedroom",
  "designer-camera-1f-bedroom-small-wardrobe-doorway",
  "designer-camera-1f-bedroom-small-wardrobe-bay",
  "designer-camera-1f-bedroom-small-wardrobe-detail"
]) {
  const camera = byId(workspace.cameraViews, id, "bedroom camera");
  camera.name = camera.name.replace(/酒店式临时衣柜|小衣柜/, "轻量衣帽柜");
  camera.description = `严格按2947×2650mm卧室：1500×2000mm床靠西、床头朝北；东墙700×450×1750mm轻量衣帽柜与床平行，门扇后留100mm，床侧净通道约897mm，柜体南侧留空950mm。柜门为不占通道的卷帘感滑移门，内部采用侧拉挂衣。自然50mm感低畸变透视，禁止镜像、斜放和虚增空间。`;
}

workspace.defaultWorkspaceRevision = "1f-bedroom-light-valet-cabinet-20260811";
workspace.savedAt = updatedAt;
await writeFile(workspaceUrl, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  revision: workspace.defaultWorkspaceRevision,
  wardrobe: { dimensions: wardrobe.dimensions, position: wardrobe.position, variantId: wardrobe.render3d.variantId },
  clearancesMm: { doorToWardrobe: 100, bedToWardrobe: 897, wardrobeToSouthWall: 950, topGap: 1050 }
}, null, 2));
