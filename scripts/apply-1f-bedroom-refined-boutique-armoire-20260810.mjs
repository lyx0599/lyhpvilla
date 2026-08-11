import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const workspaceUrl = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspaceUrl, "utf8"));
const updatedAt = "2026-08-10T23:58:00.000+08:00";
const byId = (items, id, label = id) => {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing ${label}: ${id}`);
  return item;
};

const wardrobe = byId(workspace.furniture, "module-1f-wardrobe-001", "1F bedroom wardrobe");
assert.deepEqual(wardrobe.dimensions, { width: 70, depth: 55, height: 220, unit: "cm" });
Object.assign(wardrobe, {
  code: "WD-1F-BED-BOUTIQUE",
  name: "1F卧室东墙700mm精品酒店衣帽塔",
  material: "低饱和深胡桃木圆角外框 + 燕麦灰织物感双门 + 拉丝古铜贯穿拉手",
  note: "维持700×550×2200mm及原落位不变。以圆角胡桃木门套包裹燕麦灰软质感门板，取消成品柜脚和小拉手，使小体量柜成为房间的精致端景。",
  constructionNote: "700×550×2200mm定制衣帽塔；45–55mm深胡桃木圆角外框，双扇约300mm织物纹理耐磨门板，双侧贯穿式古铜拉手，80mm内收暗踢脚。柜门一次仅开启一扇并配置缓冲铰链，柜体必须防倾倒固定。",
  render3d: {
    ...wardrobe.render3d,
    assetType: "wardrobe",
    variantId: "boutiquePortalArmoire",
    detailLevel: "presentation",
    primaryMaterial: "darkWalnut",
    secondaryMaterial: "greigeLinen",
    accentMaterial: "agedBrass",
    cabinetMaterialOverrides: {
      ...(wardrobe.render3d?.cabinetMaterialOverrides ?? {}),
      carcass: "darkWalnut",
      door: "greigeLinen",
      hardware: "agedBrass"
    },
    cabinetVisual: {
      ...(wardrobe.render3d?.cabinetVisual ?? {}),
      frontStyle: "textileInset",
      handleStyle: "fullHeightEdgePull",
      allDoorPanels: true,
      doorCount: 2,
      sideScribeMm: 48,
      plinthSetbackMm: 85,
      cornerRadiusMm: 30,
      interiorLighting: true
    },
    styleSource: "manual",
    styleLocked: true
  },
  constructionMeta: {
    ...(wardrobe.constructionMeta ?? {}),
    customMade: true,
    installType: "customFreestandingAnchored",
    reserveSize: "70x55x220cm",
    floorDependency: "80mm内收暗踢脚，柜体落地但正面呈悬浮效果",
    ceilingDependency: "柜顶距2800mm顶面约600mm；顶部不封死，用柜顶洗墙光弱化高度差",
    notes: "圆角外框由柜厂打样确认，织物纹理门板应选可擦洗硬质饰面，避免使用真正软包积灰。"
  }
});

wardrobe.wardrobeDesign.notes = "精品酒店衣帽塔：外观克制，内部保留6–8件短衣挂放、双抽、叠衣和旅行包位；不承担家庭主衣柜功能。";

const ledge = byId(workspace.furniture, "furn-1f-bedroom-headboard-ledge-001", "headboard ledge");
Object.assign(ledge, {
  material: "低饱和深胡桃木薄板 + 圆角实木封边",
  note: "1700×130mm悬浮长条台继续替代床头柜；改为与衣帽塔同色的深胡桃木，并设置柔和圆角、底部2700K微光与隐藏USB-C插座。",
  constructionNote: "保持1700×130mm尺度与原位置；台面厚35–40mm，外角R20，底部灯带见光不见灯。"
});
ledge.render3d = {
  ...(ledge.render3d ?? {}),
  primaryMaterial: "darkWalnut",
  secondaryMaterial: "oatTaupeLacquer",
  accentMaterial: "agedBrass",
  detailLevel: "presentation",
  styleSource: "manual",
  styleLocked: true
};

const bay = byId(workspace.furniture, "furn-1f-bedroom-bay-storage-001", "bay storage");
Object.assign(bay, {
  material: "燕麦灰哑光柜门 + 深胡桃木窗台 + 可拆洗米灰坐垫",
  note: "利用原1200×550mm飘窗结构做隐藏收纳坐榻；以同色胡桃木窗台和米灰坐垫呼应衣帽塔，不增加独立小家具。"
});
bay.render3d = {
  ...(bay.render3d ?? {}),
  primaryMaterial: "oatTaupeLacquer",
  secondaryMaterial: "darkWalnut",
  accentMaterial: "greigeLinen",
  detailLevel: "presentation",
  styleSource: "manual",
  styleLocked: true
};

const bed = byId(workspace.furniture, "module-1f-bed-002", "1F bedroom bed");
Object.assign(bed, {
  material: "燕麦米灰细纹布艺 + 低饱和胡桃木床脚",
  note: `${bed.note} 软装控制为燕麦、骨白和一处烟褐色腰枕，避免靠枕过多显拥挤。`
});
bed.render3d = {
  ...(bed.render3d ?? {}),
  primaryMaterial: "greigeLinen",
  secondaryMaterial: "creamBoucle",
  accentMaterial: "darkWalnut",
  detailLevel: "presentation",
  styleSource: "manual",
  styleLocked: true
};

for (const id of [
  "designer-camera-1f-09-bedroom",
  "designer-camera-1f-bedroom-small-wardrobe-doorway",
  "designer-camera-1f-bedroom-small-wardrobe-bay",
  "designer-camera-1f-bedroom-small-wardrobe-detail"
]) {
  const camera = byId(workspace.cameraViews, id, "bedroom camera");
  camera.description = `${camera.description} 材质定稿：深胡桃木圆角衣帽塔、燕麦灰织物感双门、贯穿古铜拉手、同色悬浮床头长条台、米灰飘窗坐垫；使用自然50mm感低畸变透视。`;
}

// Derive all authored bedroom cameras from the verified 1F coordinate system:
// scene x=(plan x-6000)/1000, scene z=(plan y-4500)/1000.
// This replaces earlier hand-guessed poses that landed too close to the stair.
Object.assign(byId(workspace.cameraViews, "designer-camera-1f-09-bedroom"), {
  cameraPosition: { x: -2.55, y: 1.45, z: 0.92 },
  target: { x: -4.05, y: 0.98, z: 2.42 },
  fov: 38,
  zoom: 1.02
});
Object.assign(byId(workspace.cameraViews, "designer-camera-1f-bedroom-small-wardrobe-doorway"), {
  cameraPosition: { x: -2.55, y: 1.45, z: 0.92 },
  target: { x: -4.05, y: 0.98, z: 2.42 },
  fov: 38,
  zoom: 1.02
});
Object.assign(byId(workspace.cameraViews, "designer-camera-1f-bedroom-small-wardrobe-bay"), {
  cameraPosition: { x: -4.18, y: 1.42, z: 3.08 },
  target: { x: -2.72, y: 1.02, z: 1.28 },
  fov: 38,
  zoom: 1.02
});
Object.assign(byId(workspace.cameraViews, "designer-camera-1f-bedroom-small-wardrobe-detail"), {
  cameraPosition: { x: -3.22, y: 1.38, z: 2.72 },
  target: { x: -2.38, y: 1.12, z: 2.0 },
  fov: 36,
  zoom: 1.05
});

workspace.defaultWorkspaceRevision = "1f-bedroom-refined-boutique-armoire-20260810";
workspace.savedAt = updatedAt;
await writeFile(workspaceUrl, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  revision: workspace.defaultWorkspaceRevision,
  wardrobe: {
    dimensions: wardrobe.dimensions,
    position: wardrobe.position,
    variantId: wardrobe.render3d.variantId,
    materials: wardrobe.render3d.cabinetMaterialOverrides
  },
  unchangedClearancesMm: { doorToWardrobe: 100, bedToWardrobe: 797, wardrobeToSouthWall: 950 }
}, null, 2));
