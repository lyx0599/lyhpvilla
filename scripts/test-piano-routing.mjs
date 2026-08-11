import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve3DAsset } from "../lib/render3d-assets.ts";

const piano = {
  id: "test-piano",
  code: "test-piano",
  name: "紧凑型数码钢琴",
  type: "custom",
  moduleType: "piano",
  floorId: "B1",
  roomId: "ROOM-B1-001",
  dimensions: { width: 140, depth: 45, height: 85, unit: "cm" },
  material: "blackTitanium",
  note: "",
  position: { x: 50, y: 50, rotation: 0 },
  color: "#252728",
  render3d: { assetType: "piano", variantId: "compactDigitalPiano" }
};

assert.equal(resolve3DAsset(piano).assetType, "piano");
assert.equal(resolve3DAsset({ ...piano, render3d: { ...piano.render3d, assetType: "generic" } }).assetType, "piano", "moduleType must keep the semantic piano route.");

const floor3dSource = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
assert.match(floor3dSource, /piano: Piano3DGroup/, "The shared 3D component map must route piano assets.");
assert.match(floor3dSource, /moduleType === "piano"/, "The fine-asset route must recognize the semantic piano module.");

console.log("piano shared type and 3D routing checks passed");
