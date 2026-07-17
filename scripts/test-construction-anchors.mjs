import assert from "node:assert/strict";
import {
  constructionAnchorLabel,
  constructionAnchorToPlanPoint,
  getConstructionAnchorsForSheet
} from "../lib/construction-anchors.ts";

const layer = {
  points: [
    { id: "cold", type: "coldWater", label: "冷水", positionMm: { x: 100, y: 520, z: 0 }, installationHeightMm: 520 },
    { id: "drain", type: "drain", label: "排水", positionMm: { x: 0, y: 80, z: -120 }, installationHeightMm: 80 },
    { id: "power", type: "power", label: "电源", positionMm: { x: 240, y: 300, z: 0 }, installationHeightMm: 300 }
  ]
};

assert.deepEqual(getConstructionAnchorsForSheet(layer, "waterSupplyPlan").map((point) => point.id), ["cold"]);
assert.deepEqual(getConstructionAnchorsForSheet(layer, "drainagePlan").map((point) => point.id), ["drain"]);
assert.deepEqual(getConstructionAnchorsForSheet(layer, "socketPlan").map((point) => point.id), ["power"]);
assert.equal(getConstructionAnchorsForSheet(layer, "furniturePlan").length, 3);

const furniture = { position: { x: 50, y: 50, rotation: 90 } };
const rotated = constructionAnchorToPlanPoint(furniture, { x: 6000, y: 4500 }, layer.points[0]);
assert.ok(Math.abs(rotated.x - 6000) < 0.001);
assert.ok(Math.abs(rotated.y - 4600) < 0.001);
assert.equal(constructionAnchorLabel(layer.points[0]), "冷水 H520");

console.log("Construction anchor sheet filtering, binding and rotation checks passed.");
