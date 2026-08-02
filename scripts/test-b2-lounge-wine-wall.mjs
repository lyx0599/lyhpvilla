import assert from "node:assert/strict";
import fs from "node:fs";

const workspace = JSON.parse(fs.readFileSync(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const byId = (id) => workspace.furniture.find((item) => item.id === id);

const sofa = byId("furn-b2-living-long-sofa-001");
assert.equal(sofa.render3d.variantId, "sectionalLShape");
assert.equal(sofa.render3d.primaryMaterial, "cognacLeather");
assert.match(sofa.material, /真皮/);

const coffeeTable = byId("furn-b2-living-coffee-table-001");
assert.equal(coffeeTable.render3d.variantId, "clearGlassTop");
assert.equal(coffeeTable.render3d.primaryMaterial, "clearGlass");
assert.deepEqual(coffeeTable.dimensions, { width: 120, depth: 70, height: 38, unit: "cm" });

const slabTable = byId("furn-b2-study-slab-table-001");
assert.deepEqual(slabTable.dimensions, { width: 230, depth: 80, height: 80, unit: "cm" });
assert.equal(slabTable.position.rotation, 90);

const wineCabinet = byId("furn-b2-study-wine-cabinet-001");
const handwash = byId("furn-b2-study-handwash-001");
const memorial = byId("furn-b2-study-souvenir-cabinet-001");
assert.equal(wineCabinet.hostWallId, "W-B2-011");
assert.equal(wineCabinet.render3d.variantId, "b2WineStorageCabinet");
assert.deepEqual(wineCabinet.dimensions, { width: 185, depth: 45, height: 240, unit: "cm" });
assert.equal(handwash.render3d.wetAreaVisual.mirrorStyle, "none");
assert.equal(handwash.serviceRequirements.water, true);
assert.equal(handwash.hostWallId, "W-B2-010");
assert.equal(handwash.render3d.variantId, "b2MiniWaterBar");
assert.equal(handwash.mepMeta.needsSocket, true);
assert.match(handwash.note, /直饮/);
assert.equal(byId("furn-b2-study-water-dispenser-001"), undefined, "Drinking water should be integrated into the mini water bar");
assert.equal(byId("furn-b2-study-lego-display-001"), undefined, "LEGO models should not use a separate cabinet");
assert.equal(memorial.render3d.variantId, "b2MemorialLegoDisplay");
assert.deepEqual(memorial.dimensions, { width: 260, depth: 68, height: 220, unit: "cm" });
assert.match(memorial.constructionNote, /780x520x680mm/);
assert.match(memorial.constructionNote, /650x650x380mm/);
assert.match(memorial.note, /霍格沃茨城堡/);
assert.match(memorial.note, /罗马斗兽场/);

const wineExtent = { left: wineCabinet.position.x * 120 - 925, right: wineCabinet.position.x * 120 + 925 };
assert.ok(Math.abs(wineExtent.left - 3897) <= 5 && Math.abs(wineExtent.right - 5747) <= 5, "The wine cabinet must fill the full study segment of W-B2-011");
const waterBarExtent = { left: handwash.position.x * 120 - 600, right: handwash.position.x * 120 + 600 };
assert.ok(waterBarExtent.left >= 950 && waterBarExtent.right <= 2350, "The mini water bar must sit at the left study corner");

console.log("B2 lounge, LEGO display, corner mini water bar and full wine wall checks passed.");
