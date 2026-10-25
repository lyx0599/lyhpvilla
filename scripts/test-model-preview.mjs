import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PerspectiveCamera, Vector3 } from "three";
import { buildModelPreviewOverview, getModelPreviewCameras, getModelPreviewScene, modelPreviewCameraLabel, modelPreviewFloors, resolveModelPreviewFloor } from "../lib/model-preview.ts";
import { getStructureCameraBounds } from "../lib/camera-composition.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const before = JSON.stringify(workspace);
assert.equal(resolveModelPreviewFloor(null), "1F");
assert.equal(resolveModelPreviewFloor("invalid"), "1F");
for (const floor of modelPreviewFloors) {
  assert.equal(resolveModelPreviewFloor(floor), floor);
  const scene = getModelPreviewScene(floor, workspace.houseStructuresByFloor, workspace.furniture);
  assert.ok(scene.furniture.length > 0, `${floor} has visible furniture`);
  assert.ok(scene.furniture.every((item) => item.floorId === floor || (floor === "YARD" && item.floorId === "1F")));
  assert.equal(new Set(scene.furniture.map((item) => item.id)).size, scene.furniture.length);
  const views = getModelPreviewCameras(floor, workspace.cameraViews);
  assert.ok(views.length >= (floor === "YARD" ? 5 : 10), `${floor} retains authored cameras`);
  assert.ok(views.every((view) => view.floor === floor));
  assert.ok(views.every((view) => !/北院入户/.test(modelPreviewCameraLabel(view))));
  for (const viewport of [{ width: 1118, height: 696 }, { width: 364, height: 480 }, { width: 790, height: 420 }]) {
    const view = buildModelPreviewOverview(floor, scene.structure, viewport);
    const bounds = getStructureCameraBounds(scene.structure, true);
    const camera = new PerspectiveCamera(view.fov, viewport.width / viewport.height, 0.1, 500);
    camera.position.set(view.cameraPosition.x, view.cameraPosition.y, view.cameraPosition.z);
    camera.lookAt(view.target.x, view.target.y, view.target.z);
    camera.updateMatrixWorld();
    for (const x of [bounds.minX, bounds.maxX]) for (const y of [bounds.minY, bounds.maxY]) for (const z of [bounds.minZ, bounds.maxZ]) {
      const projected = new Vector3(x, y, z).project(camera);
      assert.ok(Math.abs(projected.x) <= 0.831 && Math.abs(projected.y) <= 0.831 && projected.z < 1, `${floor} ${viewport.width}x${viewport.height} overview contains every corner`);
    }
  }
}
const yard = getModelPreviewScene("YARD", workspace.houseStructuresByFloor, workspace.furniture);
assert.ok(yard.furniture.some((item) => item.floorId === "1F"), "yard must retain adjoining indoor furniture");
assert.deepEqual(yard.structure.windows, workspace.houseStructuresByFloor["1F"].windows, "yard retains house windows");
assert.deepEqual(yard.structure.skylights, workspace.houseStructuresByFloor["1F"].skylights, "yard retains house skylights");
assert.equal(JSON.stringify(workspace), before, "preview never mutates workspace geometry or camera definitions");
console.log("Model preview PASS: five regions, authored cameras, indoor/yard context, 15 responsive perspective fits and immutable data.");
