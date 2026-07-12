import assert from "node:assert/strict";
import { createDrawingItem, generateDrawingItemsFromFurniture, getDrawingItemCategoriesForSheet } from "../lib/drawing-items.ts";

assert.deepEqual(getDrawingItemCategoriesForSheet("socketPlan"), ["socket", "network"]);
assert.deepEqual(getDrawingItemCategoriesForSheet("lightingPlan"), ["light"]);
assert.deepEqual(getDrawingItemCategoriesForSheet("waterSupplyPlan"), ["waterSupply"]);
assert.deepEqual(getDrawingItemCategoriesForSheet("drainagePlan"), ["drainage"]);
assert.deepEqual(getDrawingItemCategoriesForSheet("ceilingPlan"), ["ceiling"]);
assert.deepEqual(getDrawingItemCategoriesForSheet("floorFinishPlan"), ["floorFinish"]);
assert.deepEqual(getDrawingItemCategoriesForSheet("wallFinishPlan"), ["wallFinish"]);
assert.deepEqual(getDrawingItemCategoriesForSheet("annotationPlan"), ["annotation"]);
assert.deepEqual(getDrawingItemCategoriesForSheet("structurePlan"), []);

const item = createDrawingItem({ id: "DI-1F-001", floorId: "1F", category: "socket", positionMm: { x: 1200, y: 800 }, now: "2026-07-12T00:00:00.000Z" });
assert.equal(item.source, "manual");
assert.equal(item.status, "draft");
assert.equal(item.quantity, 1);
assert.deepEqual(item.positionMm, { x: 1200, y: 800 });
assert.equal(item.createdAt, item.updatedAt);

const furniture = [{
  id: "furn-test-001", code: "TEST", name: "测试洗手台", type: "generic", floorId: "1F", roomId: "ROOM-1F-001",
  dimensions: { width: 80, depth: 50, height: 85, unit: "cm" }, material: "", note: "",
  position: { x: 50, y: 50, rotation: 0, flipX: false, flipY: false }, color: "#fff",
  mepMeta: {
    needsSocket: true, socketCount: 2, socketHeight: 350, relatedCircuit: "C-01",
    needsSwitch: true, switchControl: ["镜前灯", "柜下灯"],
    needsLighting: true, lightingType: "mirrorLight", lightColorTemperature: "3500K", needsSmartControl: true,
    needsWaterSupply: true, waterSupplyType: "hotCold", needsDrainage: true, drainageType: "cabinetDrain",
    needsNetwork: true, needsVentilation: true
  },
  constructionMeta: { inspectionAccessRequired: true }
}];
const structure = {
  floorId: "1F", coordinateSystem: { floorId: "1F", origin: { x: 0, y: 0 }, unit: "mm", width: 12000, height: 10000, scale: 100, note: "test" },
  walls: [], rooms: [], partitions: [], stairs: [], columns: [], fences: [], outdoorSurfaces: [], doors: [], windows: [], bayWindows: [], skylights: [], outdoors: []
};
const generated = generateDrawingItemsFromFurniture({ furniture, structuresByFloor: { "1F": structure }, existingItems: [], now: "2026-07-12T01:00:00.000Z" });
assert.equal(generated.created, 8);
assert.equal(new Set(generated.items.map((generatedItem) => generatedItem.generatedKey)).size, 8);
assert.equal(generated.items.find((generatedItem) => generatedItem.category === "socket").quantity, 2);
assert.equal(generated.items.find((generatedItem) => generatedItem.category === "socket").heightMm, 350);
assert.equal(generated.items.find((generatedItem) => generatedItem.category === "socket").electricalClass, "strong");
assert.equal(generated.items.find((generatedItem) => generatedItem.category === "socket").dedicatedCircuit, true);
assert.equal(generated.items.find((generatedItem) => generatedItem.category === "light").lightColorTemperature, "3500K");
assert.equal(generated.items.find((generatedItem) => generatedItem.category === "waterSupply").waterSupplyKind, "hotCold");
assert.equal(generated.items.find((generatedItem) => generatedItem.category === "drainage").drainageKind, "cabinetDrain");
assert.deepEqual(generated.items.find((generatedItem) => generatedItem.category === "switch").switchControl, ["镜前灯", "柜下灯"]);

const areaItem = {
  ...createDrawingItem({ id: "DI-AREA-001", floorId: "1F", category: "floorFinish", positionMm: { x: 1000, y: 1000 }, now: "2026-07-12T00:00:00.000Z" }),
  roomId: "ROOM-1F-001", polygon: [{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 2000, y: 3000 }, { x: 0, y: 3000 }],
  material: "woodFloor", pattern: "工字铺", directionDeg: 90, startPoint: { x: 0, y: 0 }, seamWidthMm: 2, transition: "铜条", area: 6
};
assert.equal(areaItem.polygon.length, 4);
assert.equal(areaItem.material, "woodFloor");

const repeated = generateDrawingItemsFromFurniture({ furniture, structuresByFloor: { "1F": structure }, existingItems: generated.items, now: "2026-07-12T02:00:00.000Z" });
assert.equal(repeated.items.length, generated.items.length, "Repeated generation must not duplicate demands.");
assert.equal(repeated.created, 0);
assert.equal(repeated.updated, 0);

const adjusted = structuredClone(generated.items);
adjusted.find((generatedItem) => generatedItem.category === "socket").positionMm.x += 200;
const protectedResult = generateDrawingItemsFromFurniture({ furniture, structuresByFloor: { "1F": structure }, existingItems: adjusted, now: "2026-07-12T03:00:00.000Z" });
assert.equal(protectedResult.conflicts.length, 1, "A manually adjusted generated item must be reported as a conflict.");
assert.equal(protectedResult.items.find((generatedItem) => generatedItem.category === "socket").positionMm.x, adjusted.find((generatedItem) => generatedItem.category === "socket").positionMm.x, "Manual position must not be overwritten.");

console.log("Drawing item model checks passed.");
