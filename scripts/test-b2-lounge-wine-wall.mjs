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
const waterStation = byId("furn-b2-study-water-dispenser-001");
assert.equal(wineCabinet.hostWallId, "W-B2-011");
assert.equal(wineCabinet.render3d.variantId, "b2WineStorageCabinet");
assert.equal(handwash.render3d.wetAreaVisual.mirrorStyle, "none");
assert.equal(handwash.serviceRequirements.water, true);
assert.equal(waterStation.render3d.variantId, "b2DrinkingWaterStation");
assert.equal(waterStation.serviceRequirements.drainage, true);

const extents = [
  [wineCabinet, 400],
  [handwash, 275],
  [waterStation, 200]
].map(([item, halfWidth]) => ({ left: item.position.x * 120 - halfWidth, right: item.position.x * 120 + halfWidth }));
assert.ok(extents[0].left >= 3897 && extents[2].right <= 5750, "The wine wall must stay inside the study segment of W-B2-011");
assert.ok(extents[0].right < extents[1].left && extents[1].right < extents[2].left, "Wine wall modules must not overlap");

console.log("B2 leather lounge, glass coffee table, true-size slab table and wine wall checks passed.");
