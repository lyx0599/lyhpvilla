import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { externalAssetManifest } from "../lib/external-asset-manifest.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicPath = (assetPath) => path.join(repoRoot, "public", assetPath.replace(/^\/+/, ""));

const entries = Object.values(externalAssetManifest);
assert.equal(entries.length, 7, "expected the seven reviewed external assets");
for (const entry of entries) {
  assert.equal(entry.license, "CC0", `${entry.id} must be CC0`);
  assert.match(entry.sourceUrl, /^https:\/\//, `${entry.id} needs an authoritative HTTPS source`);
  assert.match(entry.downloadDate, /^2026-08-06$/, `${entry.id} download date must be recorded`);
  assert.ok(entry.author, `${entry.id} author must be recorded`);
  assert.ok(entry.originalFormat, `${entry.id} original format must be recorded`);
  assert.ok(entry.projectUsage, `${entry.id} project usage must be recorded`);
  assert.ok(fs.existsSync(publicPath(entry.assetPath)), `${entry.id} asset path is missing`);
  for (const file of entry.externalMaps ?? []) {
    assert.ok(fs.existsSync(publicPath(file)), `${entry.id} map is missing: ${file}`);
  }
}

for (const entry of entries.filter((candidate) => candidate.kind === "model")) {
  const gltfPath = publicPath(entry.assetPath);
  const gltf = JSON.parse(fs.readFileSync(gltfPath, "utf8"));
  for (const uri of [
    ...(gltf.buffers ?? []).map((buffer) => buffer.uri),
    ...(gltf.images ?? []).map((image) => image.uri),
  ]) {
    assert.ok(uri && !uri.startsWith("data:"), `unexpected embedded or empty URI: ${uri}`);
    assert.ok(fs.existsSync(path.resolve(path.dirname(gltfPath), uri)), `${entry.id} glTF dependency is missing: ${uri}`);
  }
}
const sideTable = entries.find((entry) => entry.id === "polyhavenSideTable01");
assert.equal(sideTable.triangles, 2756, "side table triangle count changed unexpectedly");

const tile = entries.find((entry) => entry.id === "polyhavenWarmBeigeTile08");
assert.deepEqual(tile.channels, ["Base Color", "Normal GL", "Roughness", "AO"]);
assert.ok(!tile.channels.includes("Height"), "tile height must remain disabled without a connected Height map");

const wall = entries.find((entry) => entry.id === "polyhavenWarmBeigeWall001");
assert.deepEqual(wall.channels, ["Base Color", "Normal GL", "Roughness", "AO"]);
assert.ok(!wall.channels.includes("Height"), "wall height must remain disabled");

for (const modelId of ["polyhavenCoffeeTableRound01", "polyhavenModernArmChair01"]) {
  const model = entries.find((entry) => entry.id === modelId);
  assert.ok(model.triangles < 10_000, `${modelId} must stay below the ordinary-mode triangle budget`);
}

console.log(`external asset checks passed (${entries.length} manifest entries, glTF dependencies present)`);
