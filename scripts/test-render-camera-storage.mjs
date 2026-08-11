import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  LEGACY_RENDER_CAMERA_STORAGE_KEY,
  RENDER_CAMERA_STORAGE_KEY,
  dedupeSavedRenderCameras,
  parseSavedRenderCameras,
  serializeSavedRenderCameras,
  validateSavedRenderCamera
} from "../lib/render-camera-storage.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const legacy = [{
  id: "legacy-camera",
  name: "旧摄影机",
  floor: "1F",
  cameraPosition: { x: 1, y: 1.6, z: 2 },
  target: { x: 0, y: 0.8, z: 0 },
  mode: "perspective",
  fov: 200,
  lightingScene: "night",
  presentationMode: true,
  materialPreview: true,
  designStyle: "warmJapandi",
  wallDisplayMode: "cutaway",
  createdAt: "2025-01-01T00:00:00.000Z"
}];
const migrated = parseSavedRenderCameras(null, JSON.stringify(legacy));
assert.equal(migrated.length, 1);
assert.equal(migrated[0].schemaVersion, 2);
assert.equal(migrated[0].fov, 75, "legacy FOV must be clamped during compatibility migration");
assert.equal(migrated[0].focus.kind, "floor");
assert.equal(migrated[0].roomCeilingMode, "hidden");
assert.equal(parseSavedRenderCameras("not-json", JSON.stringify(legacy)).length, 1, "invalid v2 data must fall back to legacy data without writing it back");

const duplicate = { ...migrated[0], id: "newer-camera", name: "同一构图的新名称", createdAt: "2026-01-01T00:00:00.000Z" };
assert.deepEqual(dedupeSavedRenderCameras([migrated[0], duplicate]).map((item) => item.id), ["newer-camera"], "near-identical cameras in the same context must not be stored twice");
assert.equal(parseSavedRenderCameras(serializeSavedRenderCameras([migrated[0]])).length, 1);

const validationContext = {
  structuresByFloor: workspace.houseStructuresByFloor,
  furniture: workspace.furniture,
  drawingObjectIds: new Set(workspace.drawingItems.map((item) => item.id))
};
assert.equal(validateSavedRenderCamera(migrated[0], validationContext).valid, true);
const missingFloor = { ...migrated[0], floor: "2F", focus: { kind: "room", floorId: "2F", roomId: "ROOM-DELETED" } };
assert.equal(validateSavedRenderCamera(missingFloor, validationContext).valid, false, "deleted room references must be rejected before restoring a saved view");

const source = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
assert.match(source, /RENDER_CAMERA_STORAGE_KEY/);
assert.match(source, /LEGACY_RENDER_CAMERA_STORAGE_KEY/);
assert.equal((source.match(/localStorage\.setItem/g) ?? []).length, 1, "localStorage writes must happen only through explicit camera save/generate/delete actions");
assert.match(source, /pendingRenderCameraRef/);
assert.match(source, /validateSavedRenderCamera/);

console.log("Render camera migration, deduplication, explicit persistence, and stale-reference checks passed.");
