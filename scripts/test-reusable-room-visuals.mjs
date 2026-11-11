import { readHistoricalWorkspace } from "./read-historical-workspace.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Historical release scope: old adopted coordinates/roles are immutable fixtures.
// Current model is checked by test-four-floor-calibration.mjs and native review.
const workspace = readHistoricalWorkspace();
const wetTypes = new Set(["vanity", "toilet", "shower", "bathtub"]);
const storageTypes = new Set(["wardrobe", "cabinet", "bookshelf", "snackCabinet"]);
const wetItems = workspace.furniture.filter((item) => wetTypes.has(item.moduleType ?? item.type));

assert.equal(wetItems.length, 13, "the confirmed B1 no-shower layout plus B2 study handwash should keep the wet-area fixture set");
assert.equal(workspace.furniture.some((item) => item.id === "furn-b1-bath-shower-001"), false, "B1 must not restore the removed shower.");
assert.ok(workspace.furniture.some((item) => item.id === "furn-b1-laundry-washer-001"), "B1 laundry must keep its washing machine.");
for (const item of wetItems) {
  const type = item.moduleType ?? item.type;
  assert.equal(item.render3d?.detailLevel, "presentation", `${item.id} should use presentation geometry`);
  assert.equal(item.render3d?.childrenMode, "grouped", `${item.id} should remain editable as a grouped visual family`);
  assert.equal(item.render3d?.wetAreaVisual?.fixtureKind, type, `${item.id} should declare its reusable wet-area family`);
  const anchorTypes = new Set((item.constructionAnchors?.points ?? []).map((point) => point.type));
  // Adopted B2 relocation deliberately retires old furniture-relative anchors:
  // claiming them bound at the new cabinet would invent relocated plumbing.
  // Check the retained absolute, explicitly unverified source points instead.
  if(item.id==='furn-b2-study-handwash-001'&&workspace.furniture.some(f=>f.id==='furn-b2-sofa-residence-four-reference-20261031-r7')){
    assert.equal(anchorTypes.size,0);
    for(const category of['waterSupply','drainage']){const point=workspace.drawingItems.find(d=>d.relatedFurnitureId===item.id&&d.category===category);assert.ok(point);assert.equal(point.status,'todo');assert.deepEqual(point.positionMm,{x:2375,y:7525});assert.match(point.notes,/历史坐标/);}
    continue;
  }
  assert.ok(anchorTypes.has("drain"), `${item.id} should have a bound drain point`);
  assert.ok(anchorTypes.has("coldWater"), `${item.id} should have a bound cold-water point`);
  if (type !== "toilet") assert.ok(anchorTypes.has("hotWater"), `${item.id} should have a bound hot-water point`);
  if (type === "shower") assert.ok(anchorTypes.has("exhaust"), `${item.id} should have a bound exhaust point`);
}

const storageItems = workspace.furniture.filter((item) => storageTypes.has(item.moduleType ?? item.type));
assert.ok(storageItems.length >= 10, "storage-family sample should cover multiple rooms and floors");
assert.ok(storageItems.every((item) => ["standard", "presentation"].includes(item.render3d?.detailLevel)||(item.id==='furn-b2-study-souvenir-cabinet-001'&&item.render3d?.variantId==='b2TwoGlassCastleDesign'&&item.dimensions.height===140)), "legacy storage families retain presentation detail; adopted two-glass reference uses its explicit role adapter, not legacy selected cabinetry");

const kitchenSamples = [
  "furn-kitchen-run-001",
  "furn-kitchen-u-left-run",
  "furn-kitchen-u-right-run",
  "furn-living-waterbar-001"
].map((id) => workspace.furniture.find((item) => item.id === id));
assert.ok(kitchenSamples.every(Boolean), "kitchen presentation samples should remain available");
assert.ok(kitchenSamples.every((item) => item.render3d?.kitchenVisual?.handleStyle), "kitchen samples should declare realistic front hardware");
assert.ok(kitchenSamples.every((item) => item.render3d?.kitchenVisual?.countertopEdge), "base kitchen samples should declare a countertop edge profile");

console.log("Reusable kitchen, wet-area and storage visual checks passed.");
