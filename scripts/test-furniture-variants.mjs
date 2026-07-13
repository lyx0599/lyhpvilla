import assert from "node:assert/strict";
import {
  applyModernNaturalStyle, cycleFurnitureVariant, furnitureVariantCatalog, getFurniturePlanShapeKey,
  previewModernNaturalApplication, resolveFurnitureVariant, stableFurnitureSeed, stableVariationValue,
  withFurnitureVariantDefaults
} from "../lib/furniture-variants.ts";
import { resolve3DAsset } from "../lib/render3d-assets.ts";

function furniture(id, name, floorId = "2F", roomId = "ROOM-2F-006", assetType = "bed") {
  return {
    id, code: id, name, type: assetType === "sofa" ? "sofa" : assetType === "diningChair" ? "chair" : assetType.includes("Table") ? "table" : assetType === "bed" ? "bed" : "cabinet",
    floorId, roomId, dimensions: { width: assetType === "bed" ? 180 : 240, depth: assetType === "bed" ? 200 : 90, height: 82, unit: "cm" },
    material: "existing", note: "", position: { x: 20, y: 30, rotation: 0 }, color: "#ddd", render3d: { assetType },
    mepMeta: { needsSocket: true, socketCount: 2 }, constructionMeta: { customMade: assetType === "cabinet", installType: "finishedFurniture" }
  };
}

const masterBed = withFurnitureVariantDefaults(furniture("master-bed", "主卧床"));
const guestBed = withFurnitureVariantDefaults(furniture("guest-bed", "B1 客房床", "B1", "ROOM-B1-003"));
assert.notEqual(masterBed.render3d.variantId, guestBed.render3d.variantId);

const sofaA = { ...withFurnitureVariantDefaults(furniture("sofa-a", "客厅主沙发", "1F", "ROOM-1F-001", "sofa")), render3d: { ...withFurnitureVariantDefaults(furniture("sofa-a", "客厅主沙发", "1F", "ROOM-1F-001", "sofa")).render3d, variantId: "lowModular" } };
const sofaB = { ...sofaA, id: "sofa-b", render3d: { ...sofaA.render3d, variantId: "curvedSofa" } };
assert.equal(resolve3DAsset(sofaA).assetType, resolve3DAsset(sofaB).assetType);
assert.notEqual(resolve3DAsset(sofaA).variantId, resolve3DAsset(sofaB).variantId);

const basementLounge = withFurnitureVariantDefaults(furniture("b1-sofa", "地下休闲沙发", "B1", "ROOM-B1-001", "sofa"));
const basementMedia = withFurnitureVariantDefaults(furniture("b2-sofa", "影音厅沙发", "B2", "ROOM-B2-001", "sofa"));
assert.equal(basementLounge.render3d.variantId, "deepLounge");
assert.equal(basementMedia.render3d.variantId, "sectionalLShape");

const stableSeed = stableFurnitureSeed("stable-id");
assert.equal(stableSeed, stableFurnitureSeed("stable-id"));
assert.equal(stableVariationValue(stableSeed, 3), stableVariationValue(stableSeed, 3));
assert.notEqual(stableVariationValue(stableSeed, 3), stableVariationValue(stableSeed + 1, 3));
assert.deepEqual(withFurnitureVariantDefaults(furniture("refresh", "次卧床")), withFurnitureVariantDefaults(furniture("refresh", "次卧床")));

const source = withFurnitureVariantDefaults(furniture("export", "客房床"));
assert.deepEqual(resolveFurnitureVariant(JSON.parse(JSON.stringify(source))), resolveFurnitureVariant(source));
const changed = cycleFurnitureVariant(source);
for (const key of ["id", "floorId", "roomId", "position", "dimensions", "mepMeta", "constructionMeta"]) assert.deepEqual(changed[key], source[key]);

const protectedItem = { ...source, id: "protected", locked: true };
const manualItem = { ...source, id: "manual", render3d: { ...source.render3d, styleSource: "manual", variantId: "timberFrame" } };
const preview = previewModernNaturalApplication([source, protectedItem, manualItem], { type: "house" });
assert.deepEqual([preview.adjustable, preview.skipped], [1, 2]);
const applied = applyModernNaturalStyle([source, protectedItem, manualItem], { type: "house" });
assert.strictEqual(applied.furniture[1], protectedItem);
assert.strictEqual(applied.furniture[2], manualItem);

const before = [source, protectedItem];
const after = applyModernNaturalStyle(before, { type: "house" }).furniture;
let snapshot = after;
snapshot = before;
assert.deepEqual(snapshot, before);
snapshot = after;
assert.deepEqual(snapshot, after);

assert.notEqual(getFurniturePlanShapeKey({ ...masterBed, render3d: { ...masterBed.render3d, variantId: "lowUpholstered" } }), getFurniturePlanShapeKey({ ...masterBed, render3d: { ...masterBed.render3d, variantId: "floatingPlatform" } }));
for (const family of ["bed", "sofa", "diningTable", "coffeeTable", "chair", "cabinet"]) assert.ok(furnitureVariantCatalog[family].length >= 5);
assert.equal(resolve3DAsset({ ...source, render3d: { ...source.render3d, detailLevel: "draft" } }).detailLevel, "draft");

console.log("Furniture variant, stable seed, style protection and snapshot checks passed.");
