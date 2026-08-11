import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const workspaceUrl = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspaceUrl, "utf8"));
const updatedAt = "2026-08-11T00:35:00.000+08:00";
const byId = (items, id, label = id) => {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing ${label}: ${id}`);
  return item;
};

const wardrobe = byId(workspace.furniture, "module-1f-wardrobe-001", "1F bedroom valet cabinet");
assert.deepEqual(wardrobe.dimensions, { width: 70, depth: 45, height: 175, unit: "cm" });
Object.assign(wardrobe, {
  code: "WD-1F-BED-OPEN-VALET",
  name: "1F卧室东墙700mm半开放酒店衣帽架",
  material: "低饱和深胡桃木圆角框架 + 燕麦灰抽屉面 + 拉丝古铜侧拉衣通",
  note: "取消封闭柜门，改为半开放酒店衣帽架：上层小包搁板、中部开放侧拉挂衣、下部封闭双抽。保持700×450×1750mm与原落位，床侧净通道约897mm。",
  constructionNote: "700×450×1750mm定制半开放衣帽架；前后向侧拉挂衣杆收纳6–8件短外套/衬衫，下部双抽隐藏零碎衣物。背板、侧框和顶板圆角一体，柜体防倾倒固定；长外套使用入户收纳。",
  render3d: {
    ...wardrobe.render3d,
    assetType: "wardrobe",
    variantId: "boutiqueOpenValetRack",
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
      frontStyle: "slab",
      handleStyle: "edgePull",
      openingMode: "open",
      allDoorPanels: false,
      doorCount: 0,
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
    installType: "customOpenValetAnchored",
    reserveSize: "70x45x175cm",
    wallDependency: "贴W-1F-013安装；北端避让D-1F-003开启门扇100mm。",
    floorDependency: "80mm内收暗踢脚，正面不出现独立柜脚",
    ceilingDependency: "柜顶距2800mm顶面约1050mm，按轻量家具尺度收口",
    notes: "开放区仅展示少量同色系衣物；真正零碎收纳进入下部双抽，避免视觉杂乱。"
  }
});

const light = byId(workspace.drawingItems ?? [], "L-1F-V1-20", "valet light");
Object.assign(light, {
  positionMm: { x: 3672, y: 6500 },
  relatedFurniturePositionMm: { x: 3672, y: 6500 },
  heightMm: 1350,
  label: "L-1F-V1-20 · 半开放衣帽架层板灯",
  notes: "上层搁板下方2700K高显色灯带，光源不可见。",
  updatedAt
});

for (const id of [
  "designer-camera-1f-09-bedroom",
  "designer-camera-1f-bedroom-small-wardrobe-doorway",
  "designer-camera-1f-bedroom-small-wardrobe-bay",
  "designer-camera-1f-bedroom-small-wardrobe-detail"
]) {
  const camera = byId(workspace.cameraViews, id, "bedroom camera");
  camera.name = camera.name.replace(/轻量衣帽柜|酒店式临时衣柜|小衣柜/, "半开放衣帽架");
  camera.description = "严格按2947×2650mm卧室：1500×2000mm床靠西、床头朝北；北墙东端900mm门洞，东侧保留100mm墙垛，门扇内开后贴东墙；门扇后100mm开始700×450×1750mm半开放衣帽架，床侧净通道约897mm，柜体南侧留空950mm。禁止把门洞画到东墙、禁止镜像、斜放和虚增空间。";
}

workspace.defaultWorkspaceRevision = "1f-bedroom-open-valet-rack-20260811";
workspace.savedAt = updatedAt;
await writeFile(workspaceUrl, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  revision: workspace.defaultWorkspaceRevision,
  wardrobe: { dimensions: wardrobe.dimensions, position: wardrobe.position, variantId: wardrobe.render3d.variantId },
  clearancesMm: { doorToWardrobe: 100, bedToWardrobe: 897, wardrobeToSouthWall: 950, topGap: 1050 }
}, null, 2));
