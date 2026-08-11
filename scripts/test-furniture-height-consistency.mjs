import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const indoorFloorIds = new Set(["B2", "B1", "1F", "2F"]);
const expectedHeightRangesCm = {
  fridge: [175, 220],
  wardrobe: [210, 260],
  shower: [190, 230],
  tallCabinet: [180, 260],
  kitchenCabinet: [75, 100],
  island: [75, 100],
  vanity: [70, 100],
  toilet: [60, 90]
};

function expectedHeightRange(item) {
  const kind = item.moduleType ?? item.type;
  if (kind === "tallCabinet" && /tower|fullHeight/i.test(item.render3d?.variantId ?? "")) return [240, 275];
  if (kind !== "wardrobe") return expectedHeightRangesCm[kind];
  if (item.render3d?.variantId === "boutiqueOpenValetRack") return [160, 220];
  if (item.render3d?.assetType === "walkInCloset" || /fullHeight|TopHung/i.test(item.render3d?.variantId ?? "")) return [240, 275];
  return expectedHeightRangesCm.wardrobe;
}

for (const floorId of indoorFloorIds) {
  const structure = workspace.houseStructuresByFloor[floorId];
  assert.ok(structure, `${floorId} should have a house structure`);
  assert.ok(structure.walls.length > 0, `${floorId} should have walls`);
  assert.ok(structure.walls.some((wall) => wall.height >= 2600 && wall.height <= 3200), `${floorId} should retain full-height residential walls`);
  assert.ok(structure.walls.every((wall) => (wall.height >= 900 && wall.height <= 1400) || (wall.id.startsWith("W-B2-STORAGE-") && wall.height === 2100) || (wall.height >= 2600 && wall.height <= 3200)), `${floorId} walls should be low partitions, under-stair partitions or full-height walls`);
}

for (const item of workspace.furniture.filter((candidate) => indoorFloorIds.has(candidate.floorId))) {
  const structure = workspace.houseStructuresByFloor[item.floorId];
  const wallHeightMm = Math.max(...structure.walls.map((wall) => wall.height));
  const actualTopMm = (item.render3d?.elevationMm ?? 0) + item.dimensions.height * 10;
  assert.ok(actualTopMm <= wallHeightMm, `${item.id} should not exceed the ${item.floorId} wall height`);

  const range = expectedHeightRange(item);
  if (range) {
    assert.ok(item.dimensions.height >= range[0] && item.dimensions.height <= range[1], `${item.id} should use a plausible ${(item.moduleType ?? item.type)} height`);
  }
}

const fridge = workspace.furniture.find((item) => item.moduleType === "fridge");
const wardrobes = workspace.furniture.filter((item) => item.moduleType === "wardrobe");
assert.ok(fridge, "the whole-house furniture schedule should retain a refrigerator");
assert.ok(wardrobes.length >= 2, "the whole-house furniture schedule should cover wardrobes on multiple rooms/floors");
assert.ok(fridge.dimensions.height * 10 < 2800, "the refrigerator should remain below the full-height wall envelope");
assert.ok(wardrobes.every((item) => item.dimensions.height * 10 < 2800), "wardrobes should remain below the full-height wall envelope");

console.log("Whole-house furniture height consistency checks passed.");
