import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyModernNaturalStyle, cycleFurnitureVariant, furnitureVariantCatalog, getFurniturePlanShapeKey,
  getFurnitureFamily, isModernNaturalStyleEligible,
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
assert.equal(getFurnitureFamily({ ...sofaA, note: "面向电视壁炉墙" }), "sofa", "Explicit sofa assets must not be reclassified by note text.");

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

const yardFixture = furniture("yard-light", "南院低位庭院灯", "YARD", "OD-YARD-SOUTH-001", "yardLight");
yardFixture.type = "custom";
yardFixture.position = { x: 18, y: 92, rotation: 15 };
assert.equal(isModernNaturalStyleEligible(yardFixture), false);
const placementSource = { ...source, roomId: "ROOM-1F-005", position: { x: 57.8, y: 70.6, rotation: 0 } };
const placementApplied = applyModernNaturalStyle([placementSource, yardFixture], { type: "house" }).furniture;
for (const key of ["floorId", "roomId", "outdoorId", "position"]) assert.deepEqual(placementApplied[0][key], placementSource[key]);
assert.strictEqual(placementApplied[1], yardFixture);

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

const rendererSources = Object.fromEntries(await Promise.all([
  "bed-family-3d.tsx", "sofa-family-3d.tsx", "table-family-3d.tsx", "chair-family-3d.tsx", "cabinet-family-3d.tsx", "media-wall-3d.tsx", "wet-area-family-3d.tsx"
].map(async (file) => [file, await readFile(new URL(`../components/furniture-3d/${file}`, import.meta.url), "utf8")])));
const floor3dSource = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
assert.match(
  rendererSources["table-family-3d.tsx"],
  /rotation=\{\[0, -angle - Math\.PI \/ 2 \+ offset \* 0\.2, 0\]\}/,
  "Fine dining chairs must face toward the table.",
);
assert.match(floor3dSource, /rotation=\{\[0, -angle - Math\.PI \/ 2, 0\]\}/, "Legacy dining chairs must face toward the table.");
const island = workspace.furniture.find((item) => item.id === "furn-kitchen-entry-island-001");
assert.deepEqual(island.dimensions, { width: 190, depth: 55, height: 80, unit: "cm" }, "The walkability-adjusted island envelope must persist.");
const diningSet = workspace.furniture.find((item) => item.id === "module-1f-table-001");
assert.equal(diningSet.roomId, "ROOM-1F-005", "The six-person dining set must remain assigned to the living room.");
assert.equal(diningSet.render3d.variantId, "roundPedestal");
assert.equal(diningSet.render3d.detailLevel, "presentation");
assert.equal(diningSet.render3d.primaryMaterial, "warmOak");
assert.equal(diningSet.render3d.secondaryMaterial, "warmOak");
const livingSofa = workspace.furniture.find((item) => item.id === "furn-1f-living-main-sofa-001");
assert.equal(livingSofa.render3d.variantId, "boucleCurve");
assert.equal(livingSofa.render3d.primaryMaterial, "beigeFabric");
const waterBar = workspace.furniture.find((item) => item.id === "furn-living-waterbar-001");
const waterBarUpper = workspace.furniture.find((item) => item.id === "furn-living-waterbar-upper-001");
assert.equal(waterBar.render3d.variantId, "mirroredReferenceBuffetBase");
assert.equal(waterBarUpper.render3d.variantId, "mirroredReferenceBuffetUpper");
assert.equal(waterBarUpper.render3d.cabinetVisual.gridColumns, 4);
assert.equal(waterBar.dimensions.width, 240);
assert.equal(waterBarUpper.dimensions.width, 240);
const livingPulloutPantry = workspace.furniture.find((item) => item.id === "furn-living-snack-pullout-001");
assert.equal(livingPulloutPantry.render3d.variantId, "mirroredReferenceBuffetTower");
assert.equal(livingPulloutPantry.render3d.cabinetVisual.doorCount, 2);

const showcaseIds = [
  "furn-1f-living-main-sofa-001",
  "furn-living-fireplace-south-001", "furn-2f-master-bedroom-bed-001", "furn-2f-master-bedroom-large-wardrobe-001"
];
assert.equal(workspace.furniture.some((item) => item.id === "furn-1f-living-rug-001"), false, "The confirmed 1F living-room rug removal must persist.");
assert.equal(workspace.furniture.some((item) => item.id === "furn-1f-living-coffee-table-001"), false, "The confirmed 1F living room must not regain a central coffee table.");
for (const id of showcaseIds) {
  const item = workspace.furniture.find((candidate) => candidate.id === id);
  assert.ok(item, `${id} must exist in the default workspace`);
  assert.ok(Number.isInteger(item.render3d?.variationSeed), `${id} must persist a stable variation seed`);
  assert.equal(item.render3d?.stylePreset, "tuscanWabiSabi", `${id} must use the Tuscan wabi-sabi preset`);
  assert.equal(item.render3d?.detailLevel, "presentation", `${id} must render at presentation detail`);
}

assert.match(rendererSources["bed-family-3d.tsx"], /tallPanelHeadboard/);
assert.match(rendererSources["bed-family-3d.tsx"], /floatingPlatform/);
assert.match(rendererSources["sofa-family-3d.tsx"], /sectionalLShape/);
assert.match(rendererSources["sofa-family-3d.tsx"], /curvedSofa/);
assert.match(rendererSources["sofa-family-3d.tsx"], /sculptural-boucle-curve-sofa/);
assert.match(rendererSources["table-family-3d.tsx"], /roundPedestal/);
assert.match(rendererSources["table-family-3d.tsx"], /nestedDouble/);
assert.match(rendererSources["chair-family-3d.tsx"], /wovenDining/);
assert.match(rendererSources["chair-family-3d.tsx"], /wrapDining/);
assert.match(rendererSources["cabinet-family-3d.tsx"], /openClosedMix/);
assert.match(rendererSources["cabinet-family-3d.tsx"], /archedBuffet/);
assert.match(rendererSources["cabinet-family-3d.tsx"], /parametric-arched-upper-cabinet/);
assert.match(rendererSources["cabinet-family-3d.tsx"], /double-door-pullout-pantry/);
assert.match(rendererSources["media-wall-3d.tsx"], /consoleHeight/);
assert.match(rendererSources["media-wall-3d.tsx"], /integrated-fireplace-flames/);
assert.match(rendererSources["bed-family-3d.tsx"], /integrated-storage-headboard/);
assert.match(rendererSources["sofa-family-3d.tsx"], /bean-bag-lounge-sofa/);
assert.match(rendererSources["cabinet-family-3d.tsx"], /forceGlassDoors/);
assert.match(rendererSources["wet-area-family-3d.tsx"], /square-mirror-cabinet/);
assert.match(floor3dSource, /function RealisticLightFixture/);
for (const physicalFixtureName of ["realistic-recessed-downlight", "realistic-surface-downlight", "realistic-adjustable-spotlight", "realistic-round-pendant", "realistic-mirror-light", "realistic-linear-strip", "realistic-wall-reading-light"]) assert.match(floor3dSource, new RegExp(physicalFixtureName));
assert.match(floor3dSource, /实体灯具（隐藏点位）/);
assert.match(floor3dSource, /lightingActive && showFixtureModels && !selected/);
assert.match(floor3dSource, /physical-fixture-closeup-/);

assert.equal(workspace.furniture.find((item) => item.id === "furn-fridge-001")?.position.rotation, 90);
assert.equal(workspace.furniture.find((item) => item.id === "furn-living-waterbar-001")?.dimensions.width, 240);
assert.ok(Number.isFinite(workspace.furniture.find((item) => item.id === "furn-living-waterbar-001")?.position.y));
assert.ok(Number.isFinite(workspace.furniture.find((item) => item.id === "furn-living-snack-pullout-001")?.position.y));
assert.equal(workspace.furniture.find((item) => item.id === "furn-2f-master-bedroom-large-wardrobe-001")?.dimensions.width, 220);
assert.equal(workspace.furniture.filter((item) => item.id.startsWith("furn-2f-master-nightstand-")).length, 2);
assert.equal(workspace.furniture.find((item) => item.id === "furn-2f-bedroom1-bed-001")?.render3d?.variantId, "timberFrame");
assert.equal(workspace.furniture.find((item) => item.id === "furn-2f-bedroom2-bed-001")?.render3d?.variantId, "lowUpholstered");
for (const id of ["furn-2f-bedroom1-bed-001", "furn-2f-bedroom2-bed-001"]) assert.equal(workspace.furniture.find((item) => item.id === id)?.render3d?.bedVisual?.headboardStyle, "standard");
for (const id of ["module-2f-cloak-left", "module-2f-cloak-right"]) assert.equal(workspace.furniture.find((item) => item.id === id)?.render3d?.cabinetVisual?.allDoorPanels, false);
assert.equal(workspace.furniture.find((item) => item.id === "furn-b1-bath-vanity-001")?.render3d?.wetAreaVisual?.mirrorStyle, "none");
for (const id of ["furn-bath-vanity-001", "furn-2f-guest-vanity-001", "furn-2f-master-vanity-001"]) assert.equal(workspace.furniture.find((item) => item.id === id)?.render3d?.wetAreaVisual?.mirrorStyle, "cabinet");
assert.equal(workspace.furniture.find((item) => item.id === "furn-b1-activity-beanbag-001")?.render3d?.variantId, "beanBag");
assert.equal(workspace.furniture.find((item) => item.id === "furn-b2-living-coffee-table-001")?.render3d?.variantId, "clearGlassTop");
assert.deepEqual(workspace.furniture.find((item) => item.id === "furn-b2-study-slab-table-001")?.dimensions, { width: 230, depth: 80, height: 80, unit: "cm" });
assert.equal(workspace.furniture.find((item) => item.id === "furn-b2-study-slab-table-001")?.position.rotation, 90);

console.log("Furniture variant, stable seed, style protection and snapshot checks passed.");
