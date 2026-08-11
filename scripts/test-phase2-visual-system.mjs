import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getMaterialResolution, pbrMaterialCatalog } from "../lib/material-system.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const pbrSource = await readFile(new URL("../components/scene-3d/procedural-pbr.ts", import.meta.url), "utf8");
const pbrMaterialSource = await readFile(new URL("../components/scene-3d/pbr-material.tsx", import.meta.url), "utf8");
const furnitureMaterialSource = await readFile(new URL("../components/furniture-3d/materials.tsx", import.meta.url), "utf8");
const topViewSource = await readFile(new URL("../components/furniture-top-view.tsx", import.meta.url), "utf8");
const planCanvasSource = await readFile(new URL("../components/plan-canvas.tsx", import.meta.url), "utf8");
const sceneSource = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");

const furniture = workspace.furniture ?? workspace.workspace?.furniture ?? [];
assert.ok(furniture.length > 0, "默认工作区必须包含家具对象，避免空集合误通过");
const ids = furniture.map((item) => item.id);
assert.equal(new Set(ids).size, ids.length, "家具对象 ID 必须全局唯一");
for (const item of furniture) {
  assert.ok(item.floorId, `${item.id} 缺少楼层归属`);
  assert.ok(item.dimensions?.width > 0 && item.dimensions?.depth > 0 && item.dimensions?.height > 0, `${item.id} 缺少有效三维尺寸`);
  assert.equal(typeof item.position?.rotation, "number", `${item.id} 缺少共享旋转状态`);
}

for (const channel of ["normalMap", "roughnessMap", "aoMap"]) {
  assert.ok(pbrSource.includes(channel), `程序化 PBR 缺少 ${channel}`);
  assert.ok(pbrMaterialSource.includes(channel), `统一 PBR 材质未消费 ${channel}`);
}
assert.ok(furnitureMaterialSource.includes("<PbrMaterial"), "家具材质必须复用统一 PBR 材质组件");
assert.ok(pbrMaterialSource.includes("MeshPhysicalMaterial"), "玻璃应使用物理材质");
assert.ok(pbrMaterialSource.includes("transmission"), "玻璃应支持透射");
assert.ok(sceneSource.includes("SelectionBounds"), "3D 选中状态应使用轮廓而不是整块染色");
assert.ok(topViewSource.includes("assetType") && topViewSource.includes("variantId") && topViewSource.includes("footprint"), "2D 顶视必须消费 3D 家族、variant 与尺寸");
assert.ok(planCanvasSource.includes("assetType={renderAsset.assetType}") && planCanvasSource.includes("variantId={renderAsset.variantId}"), "2D 画布必须使用与 3D 相同的解析结果");
assert.ok(pbrMaterialCatalog.clearGlass.transmission >= 0.9, "低铁玻璃应以物理透射为主，避免蓝色塑料片效果");
assert.ok(pbrMaterialCatalog.clearGlass.opacity >= 0.8, "物理玻璃不应依赖低透明度混合模拟透光");
for (const token of Object.keys(pbrMaterialCatalog)) {
  assert.ok(getMaterialResolution(token, "presentation", "desktop") <= 1024, `${token} 桌面展示纹理超出显存预算`);
  assert.ok(getMaterialResolution(token, "presentation", "mobile") <= 512, `${token} 手机展示纹理超出显存预算`);
}

console.log(`Phase 2 visual system checks passed: ${furniture.length} furniture objects share IDs, dimensions, rotation and render identities.`);
