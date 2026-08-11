import assert from "node:assert/strict";
import { render3DMaterialTokenCatalog, resolveCabinetMaterialLayer, resolveRender3DMaterials } from "../lib/render3d-assets.ts";
import { readFile } from "node:fs/promises";

function cabinet(overrides) {
  return {
    id: "test-wardrobe",
    code: "WD-TEST",
    name: "测试衣柜",
    type: "wardrobe",
    moduleType: "wardrobe",
    floorId: "2F",
    roomId: "ROOM-2F-006",
    dimensions: { width: 220, depth: 60, height: 260, unit: "cm" },
    material: "浅燕麦灰褐哑光饰面",
    note: "测试实例",
    position: { x: 0, y: 0, rotation: 0 },
    color: "#b6a68f",
    render3d: {
      assetType: "wardrobe",
      variantId: "fullHeightFlat",
      variationSeed: 1,
      primaryMaterial: "warmOak",
      secondaryMaterial: "oatTaupeLacquer",
      accentMaterial: "brushedBronze",
      cabinetMaterialOverrides: overrides
    }
  };
}

const legacy = cabinet(undefined);
const legacyMaterials = resolveRender3DMaterials(legacy);
assert.equal(resolveCabinetMaterialLayer(legacy, legacyMaterials, "carcass").token, "warmOak");
assert.equal(resolveCabinetMaterialLayer(legacy, legacyMaterials, "door").token, "oatTaupeLacquer");

const strongDifferenceTokens = ["oatTaupeLacquer", "warmOak", "travertine", "blackTitanium", "clearGlass"];
const observedDoorProfiles = [];
for (const token of strongDifferenceTokens) {
  const item = cabinet({ door: token });
  const materials = resolveRender3DMaterials(item);
  const door = resolveCabinetMaterialLayer(item, materials, "door");
  assert.equal(door.token, token, `柜门覆盖应使用 ${token}`);
  assert.equal(door.color, render3DMaterialTokenCatalog[token].color, `柜门颜色应随 ${token} 改变`);
  assert.ok(typeof door.roughness === "number");
  assert.ok(typeof door.metalness === "number");
  observedDoorProfiles.push(`${door.color}/${door.roughness}/${door.metalness}/${door.opacity ?? 1}/${door.transmission ?? 0}`);
}
assert.equal(new Set(observedDoorProfiles).size, strongDifferenceTokens.length, "五种强差异材质必须产生不同的 PBR 外观参数");
const glass = resolveCabinetMaterialLayer(cabinet({ door: "clearGlass" }), resolveRender3DMaterials(cabinet({ door: "clearGlass" })), "door");
assert.ok((glass.opacity ?? 1) < 1 || (glass.transmission ?? 0) > 0, "低铁玻璃必须保留透明或透射属性");

const inspectorSource = await readFile(new URL("../lib/material-inspector.ts", import.meta.url), "utf8");
assert.ok(inspectorSource.includes('"实例覆盖"'));
assert.ok(inspectorSource.includes('{ part: "柜门", layer: resolveCabinetMaterialLayer'));
assert.ok(inspectorSource.includes('{ part: "拉手/五金", layer: resolveCabinetMaterialLayer'));

const kitchen = cabinet({ door: "travertine", carcass: "warmOak", countertop: "blackTitanium", hardware: "blackTitanium" });
kitchen.moduleType = "kitchenCabinet";
kitchen.render3d.assetType = "kitchenCabinet";
const kitchenMaterials = resolveRender3DMaterials(kitchen);
assert.equal(resolveCabinetMaterialLayer(kitchen, kitchenMaterials, "countertop").token, "blackTitanium");
assert.equal(resolveCabinetMaterialLayer(kitchen, kitchenMaterials, "door").token, "travertine");

console.log("Cabinet material override tests passed: legacy fallback, 5 strong differences, inspector identity, kitchen instance.");
