import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const wetTypes = new Set(["vanity", "toilet", "shower", "bathtub"]);
const storageTypes = new Set(["wardrobe", "cabinet", "bookshelf", "snackCabinet"]);
const wetItems = workspace.furniture.filter((item) => wetTypes.has(item.moduleType ?? item.type));

assert.equal(wetItems.length, 12, "the confirmed B1 no-shower layout should keep the remaining wet-area fixtures");
assert.equal(workspace.furniture.some((item) => item.id === "furn-b1-bath-shower-001"), false, "B1 must not restore the removed shower.");
assert.ok(workspace.furniture.some((item) => item.id === "furn-b1-laundry-washer-001"), "B1 laundry must keep its washing machine.");
for (const item of wetItems) {
  const type = item.moduleType ?? item.type;
  assert.equal(item.render3d?.detailLevel, "presentation", `${item.id} should use presentation geometry`);
  assert.equal(item.render3d?.childrenMode, "grouped", `${item.id} should remain editable as a grouped visual family`);
  assert.equal(item.render3d?.wetAreaVisual?.fixtureKind, type, `${item.id} should declare its reusable wet-area family`);
  const anchorTypes = new Set((item.constructionAnchors?.points ?? []).map((point) => point.type));
  assert.ok(anchorTypes.has("drain"), `${item.id} should have a bound drain point`);
  assert.ok(anchorTypes.has("coldWater"), `${item.id} should have a bound cold-water point`);
  if (type !== "toilet") assert.ok(anchorTypes.has("hotWater"), `${item.id} should have a bound hot-water point`);
  if (type === "shower") assert.ok(anchorTypes.has("exhaust"), `${item.id} should have a bound exhaust point`);
}

const storageItems = workspace.furniture.filter((item) => storageTypes.has(item.moduleType ?? item.type));
assert.ok(storageItems.length >= 10, "storage-family sample should cover multiple rooms and floors");
assert.ok(storageItems.every((item) => item.render3d?.detailLevel === "presentation"), "storage families should share presentation detail");

const kitchenSamples = [
  "furn-kitchen-run-001",
  "furn-kitchen-u-left-run",
  "furn-kitchen-u-right-run",
  "furn-kitchen-entry-island-001",
  "furn-living-waterbar-001"
].map((id) => workspace.furniture.find((item) => item.id === id));
assert.ok(kitchenSamples.every(Boolean), "kitchen presentation samples should remain available");
assert.ok(kitchenSamples.every((item) => item.render3d?.kitchenVisual?.handleStyle), "kitchen samples should declare realistic front hardware");
assert.ok(kitchenSamples.every((item) => item.render3d?.kitchenVisual?.countertopEdge), "base kitchen samples should declare a countertop edge profile");

console.log("Reusable kitchen, wet-area and storage visual checks passed.");
