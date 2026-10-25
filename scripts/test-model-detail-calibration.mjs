import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CylinderGeometry } from "three";
import { pbrMaterialCatalog } from "../lib/material-system.ts";
import { proceduralKindForFamily, relativeRoughnessByte, resolveGlassPreviewOpacity } from "../lib/render-material-calibration.ts";
import { createMetricCylinderGeometry } from "../lib/furniture-surface-geometry.ts";
import { isFloorOverviewPresentation } from "../lib/scene-presentation.ts";
import { buildHerringbonePlanks } from "../lib/herringbone-layout.ts";
import { resolveStructureStoryHeightMm } from "../lib/scene-height-system.ts";
import { buildModelPreviewOverview, getModelPreviewCameras, getModelPreviewScene, modelPreviewFloors } from "../lib/model-preview.ts";

for (const [token, definition] of Object.entries(pbrMaterialCatalog)) {
  const kind = proceduralKindForFamily(definition.family);
  assert.equal(kind, { paint: "wall", woodFloor: "wood", tile: "stone" }[definition.family] ?? definition.family, token);
  assert.equal(relativeRoughnessByte(Math.round(definition.roughness * 255), definition.roughness), 255, `${token} keeps its base roughness`);
  for (let value = 0; value < 256; value++) {
    const normalized = relativeRoughnessByte(value, definition.roughness);
    assert.ok(Number.isInteger(normalized) && normalized >= 0 && normalized <= 255);
  }
}
assert.equal(proceduralKindForFamily("leather"), "leather");
assert.equal(relativeRoughnessByte(0, 0), 255, "perfectly smooth bases remain finite");
assert.ok(Math.abs(relativeRoughnessByte(64, 0.5) / 255 * 0.5 - 0.25) < 0.002);
assert.equal(resolveGlassPreviewOpacity(0.92, 0.95, false, 0.22), 0.22);
assert.equal(resolveGlassPreviewOpacity(0.88, 0.72, false, 0.34), 0.34);
assert.equal(resolveGlassPreviewOpacity(0.1, 0.95, false, 0.22), 0.1, "explicit lighter alpha retained");
assert.equal(resolveGlassPreviewOpacity(0.92, 0.95, true, 0.22), 0.92, "physical glass retains transmission/alpha");
assert.equal(resolveGlassPreviewOpacity(1, 0, false, 0.22), 1, "opaque authored materials unchanged");

for (const args of [[0.8, 0.8, 0.065, 40], [0.8, 0.8, 0.012, 72], [0.18, 0.24, 0.6, 48], [0, 0.2, 0.5, 24], [0.006, 0.006, 0.006, 16]]) {
  const reference = new CylinderGeometry(...args);
  const geometry = createMetricCylinderGeometry(...args);
  assert.deepEqual(geometry.getAttribute("position").array, reference.getAttribute("position").array, "dimensions and silhouette unchanged");
  assert.deepEqual(geometry.index.array, reference.index.array, "no added triangles");
  assert.deepEqual(geometry.groups, reference.groups, "no added draw calls");
  const uv = geometry.getAttribute("uv"), normal = geometry.getAttribute("normal"), position = geometry.getAttribute("position");
  const originalUv = reference.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) {
    assert.ok(Number.isFinite(uv.getX(i)) && Number.isFinite(uv.getY(i)));
    if (Math.abs(normal.getY(i)) > 0.9999) {
      assert.ok(Math.abs(uv.getX(i) - position.getX(i)) < 1e-6);
      assert.ok(Math.abs(uv.getY(i) - position.getZ(i)) < 1e-6, "caps use both planar metre axes, not side height");
    } else {
      assert.ok(Math.abs(uv.getX(i) - originalUv.getX(i) * Math.PI * (args[0] + args[1])) < 1e-6);
      assert.ok(Math.abs(uv.getY(i) - originalUv.getY(i) * args[2]) < 1e-6);
    }
  }
  geometry.dispose(); reference.dispose();
}

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
// A malformed overlay can look plausible in one camera. Verify the actual
// tessellation has exactly one plank under every non-boundary sample point.
for (const angle of [0, Math.PI / 4, Math.PI / 6]) {
  const bounds = { minX: -3.7, maxX: 4.1, minY: -2.3, maxY: 5.2 };
  const planks = buildHerringbonePlanks(bounds, 0.72, 0.18, angle);
  const contains = (polygon, point) => polygon.every((p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    return (q.x - p.x) * (point.y - p.y) - (q.y - p.y) * (point.x - p.x) > 1e-10;
  });
  for (const polygon of planks) {
    const lengths = polygon.map((p, i) => Math.hypot(p.x - polygon[(i + 1) % 4].x, p.y - polygon[(i + 1) % 4].y)).sort((a, b) => a - b);
    assert.ok(Math.abs(lengths[0] - 0.18) < 1e-9 && Math.abs(lengths[3] - 0.72) < 1e-9, "authored plank dimensions unchanged");
  }
  for (let i = 1; i <= 900; i++) {
    const x = bounds.minX + ((i * 0.61803398875) % 1) * (bounds.maxX - bounds.minX);
    const y = bounds.minY + ((i * 0.41421356237) % 1) * (bounds.maxY - bounds.minY);
    assert.equal(planks.filter((polygon) => contains(polygon, { x, y })).length, 1, `continuous non-overlapping herringbone at ${x},${y}`);
  }
}
assert.deepEqual(buildHerringbonePlanks({ minX: 0, maxX: 1, minY: 0, maxY: 1 }, 0, 0.18), []);
const before = JSON.stringify(workspace);
const flags = { presentationMode: true, stackedVillaOverview: false, currentSpaceActive: false, exploration: false };
let interiorCount = 0;
for (const floor of modelPreviewFloors) {
  const scene = getModelPreviewScene(floor, workspace.houseStructuresByFloor, workspace.furniture);
  const storyHeightMm = resolveStructureStoryHeightMm(scene.structure);
  const args = { ...flags, storyHeightMm, fixedView: buildModelPreviewOverview(floor, scene.structure, { width: 1118, height: 696 }) };
  assert.ok(isFloorOverviewPresentation(args), `${floor} overview retains cutaway lighting`);
  assert.equal(isFloorOverviewPresentation({ ...args, exploration: true }), false);
  assert.equal(isFloorOverviewPresentation({ ...args, presentationMode: false }), false);
  assert.equal(isFloorOverviewPresentation({ ...args, currentSpaceActive: true }), false);
  assert.equal(isFloorOverviewPresentation({ ...args, stackedVillaOverview: true }), false);
  for (const view of getModelPreviewCameras(floor, workspace.cameraViews)) {
    if (view.cameraPosition.y < storyHeightMm / 1000) {
      assert.equal(isFloorOverviewPresentation({ ...args, fixedView: view }), false, `${view.id} must not inherit bird's-eye lighting`);
      interiorCount++;
    }
  }
}
assert.ok(interiorCount >= 30, "check actual authored eye-level cameras across floors");
assert.equal(JSON.stringify(workspace), before, "calibration never mutates model data");
console.log(`Model detail PASS: ${Object.keys(pbrMaterialCatalog).length} material tokens, glass quality fallback, 5 unchanged cylinder meshes, 2700 herringbone coverage samples, ${interiorCount} authored closeups and 5 overviews.`);
