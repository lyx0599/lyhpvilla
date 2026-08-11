import assert from "node:assert/strict";
import {
  createDefaultCabinetInteriorLayout,
  getCabinetInteriorTemplate,
  isEditableCabinetFurniture,
  normalizeCabinetInteriorLayout,
  validateCabinetInteriorLayout
} from "../lib/cabinet-interior.ts";

function cabinet(name, type, extra = {}) {
  return {
    id: `cabinet-${type}`,
    code: `CAB-${type}`,
    name,
    type,
    moduleType: type,
    floorId: "1F",
    roomId: "ROOM-1F-001",
    dimensions: { width: 240, depth: 60, height: 240, unit: "cm" },
    material: "浅燕麦灰褐哑光饰面",
    color: "#b6a68f",
    position: { x: 0, y: 0, rotation: 0 },
    render3d: { assetType: type, variantId: type, variationSeed: 1, cabinetVisual: {} },
    ...extra
  };
}

const cases = [
  ["衣柜", "wardrobe", "wardrobe"],
  ["厨房地柜", "kitchenCabinet", "kitchenBase"],
  ["厨房吊柜", "wallCabinet", "kitchenWall"],
  ["厨房高柜", "tallCabinet", "kitchenTall"],
  ["中岛柜体", "island", "island"],
  ["卫浴柜", "bathroomVanity", "bathroomVanity"],
  ["玄关柜", "entryCabinet", "entry"],
  ["鞋柜", "cabinet", "shoe"],
  ["书柜", "bookshelf", "bookshelf"],
  ["玻璃展示柜", "cabinet", "display"],
  ["转角柜", "cabinet", "corner"]
];

for (const [name, type, template] of cases) {
  const item = cabinet(name, type);
  assert.equal(isEditableCabinetFurniture(item), true, `${name} 应可进入柜体设计`);
  const layout = createDefaultCabinetInteriorLayout(item);
  assert.equal(getCabinetInteriorTemplate(item), template);
  assert.ok(layout.modules.length > 0, `${name} 应有默认内部模块`);
  assert.equal(validateCabinetInteriorLayout(item, layout).some((check) => check.severity === "error"), false);
}

const oldWardrobe = cabinet("旧衣柜", "wardrobe", {
  wardrobeDesign: { columns: 2, rows: 3, modules: [{ id: "legacy-shelf", kind: "folded", label: "叠放区", column: 0, row: 1, columnSpan: 1, rowSpan: 1, x: 0, y: 35, width: 50, height: 30 }] }
});
const migrated = createDefaultCabinetInteriorLayout(oldWardrobe);
assert.equal(migrated.createdFrom, "legacyWardrobe");
assert.ok(migrated.modules.some((module) => module.label === "叠放区"));

const bounded = normalizeCabinetInteriorLayout({ ...migrated, modules: [{ ...migrated.modules[0], x: 99999, y: 99999 }] }, oldWardrobe);
assert.ok(bounded.modules[0].x <= bounded.interiorWidthMm - bounded.modules[0].width);
assert.ok(bounded.modules[0].y <= bounded.interiorHeightMm - bounded.modules[0].height);

const invalid = { ...migrated, modules: [{ ...migrated.modules[0], width: migrated.interiorWidthMm + 100 }] };
const invalidChecks = validateCabinetInteriorLayout(oldWardrobe, invalid);
assert.ok(invalidChecks.some((check) => check.severity === "error"));
assert.equal(isEditableCabinetFurniture(cabinet("装饰壁炉", "fireplace")), false);

console.log(`Cabinet interior tests passed: ${cases.length} cabinet cases, legacy layout compatibility, bounds, invalid-save guard, decorative classification.`);
