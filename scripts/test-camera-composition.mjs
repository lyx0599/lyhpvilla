import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  composeCameraView,
  getStructureCameraBounds,
  getWholeVillaCameraBounds
} from "../lib/camera-composition.ts";
import { adjustCameraPose, cameraPoseDistance } from "../lib/camera-adjustment.ts";
import { buildExplorationCollisionWorld, isExplorationPositionSafe } from "../lib/exploration-mode.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const originalHash = JSON.stringify({
  structures: workspace.houseStructuresByFloor,
  furniture: workspace.furniture
});
const desktop = { width: 1440, height: 900, leftInset: 304, rightInset: 336, bottomInset: 72 };
const mobilePortrait = { width: 390, height: 844, topInset: 68, bottomInset: 96, mobile: true };
const mobileLandscape = { width: 844, height: 390, leftInset: 44, rightInset: 44, bottomInset: 78, mobile: true };

function finitePoint(point, label) {
  assert.ok([point.x, point.y, point.z].every(Number.isFinite), `${label} must use finite coordinates`);
}

for (const floor of workspace.floors) {
  const structure = workspace.houseStructuresByFloor[floor.id];
  if (!structure) continue;
  const floorFurniture = workspace.furniture.filter((item) => item.floorId === floor.id);
  const overviewDesktop = composeCameraView({ kind: "floorOverview", structure, viewport: desktop, furniture: floorFurniture });
  const overviewPortrait = composeCameraView({ kind: "floorOverview", structure, viewport: mobilePortrait, furniture: floorFurniture });
  const overviewLandscape = composeCameraView({ kind: "floorOverview", structure, viewport: mobileLandscape, furniture: floorFurniture });
  for (const [label, result] of [["desktop", overviewDesktop], ["mobile portrait", overviewPortrait], ["mobile landscape", overviewLandscape]]) {
    finitePoint(result.cameraPosition, `${floor.id} ${label} overview camera`);
    finitePoint(result.target, `${floor.id} ${label} overview target`);
    assert.ok(result.targetCoverage <= 0.96, `${floor.id} ${label} overview must not be visibly cropped`);
    assert.ok(result.targetCoverage >= 0.18, `${floor.id} ${label} overview must not make the floor too small`);
  }
  assert.notDeepEqual(overviewDesktop.cameraPosition, overviewPortrait.cameraPosition, `${floor.id} desktop and phone framing must account for different visible aspect ratios`);

  const world = buildExplorationCollisionWorld({
    structure,
    furniture: floorFurniture,
    doorStates: Object.fromEntries(structure.doors.map((door) => [door.id, { open: true, currentAngle: 1 }]))
  });
  for (const room of structure.rooms) {
    const roomView = composeCameraView({ kind: "room", structure, furniture: floorFurniture, roomId: room.id, viewport: desktop });
    finitePoint(roomView.cameraPosition, `${floor.id}/${room.name} room camera`);
    finitePoint(roomView.target, `${floor.id}/${room.name} room target`);
    assert.equal(isExplorationPositionSafe(world, { x: roomView.cameraPosition.x, z: roomView.cameraPosition.z }, 0.12), true, `${floor.id}/${room.name} camera must not be inside a wall, cabinet, or large furniture`);
    assert.ok(roomView.distance >= roomView.safety.minDistance - 0.001, `${floor.id}/${room.name} camera must respect its near safety bound`);
    assert.ok(roomView.distance <= roomView.safety.maxDistance + 0.001, `${floor.id}/${room.name} camera must respect its far safety bound`);
    assert.ok(roomView.fov <= 62, `${floor.id}/${room.name} must not rely on an extreme wide angle`);

    const pose = { cameraPosition: roomView.cameraPosition, target: roomView.target, fov: roomView.fov };
    const left = adjustCameraPose(pose, { action: "orbit", yawDelta: -Math.PI / 12 }, roomView.safety);
    const right = adjustCameraPose(pose, { action: "orbit", yawDelta: Math.PI / 12 }, roomView.safety);
    assert.deepEqual(left.target, pose.target, `${floor.id}/${room.name} left orbit must preserve focus`);
    assert.deepEqual(right.target, pose.target, `${floor.id}/${room.name} right orbit must preserve focus`);
    assert.ok(Math.abs(cameraPoseDistance(left) - cameraPoseDistance(pose)) < 0.000001, `${floor.id}/${room.name} orbit must preserve distance`);
    const close = adjustCameraPose(pose, { action: "zoom", zoomFactor: 0.01 }, roomView.safety);
    const far = adjustCameraPose(pose, { action: "zoom", zoomFactor: 99 }, roomView.safety);
    assert.ok(cameraPoseDistance(close) >= roomView.safety.minDistance - 0.000001, `${floor.id}/${room.name} zoom-in must stop before the target`);
    assert.ok(cameraPoseDistance(far) <= roomView.safety.maxDistance + 0.000001, `${floor.id}/${room.name} zoom-out must remain bounded`);
  }

  for (const wall of structure.walls.filter((item) => item.kind === "straight").slice(0, 4)) {
    for (const kind of ["wallFront", "wallLeft", "wallRight"]) {
      const view = composeCameraView({ kind, structure, furniture: floorFurniture, wallId: wall.id, viewport: desktop });
      finitePoint(view.cameraPosition, `${wall.id} ${kind} camera`);
      assert.ok(view.distance >= 1.05 && view.distance <= 7.3, `${wall.id} ${kind} distance must be derived within a useful range`);
    }
  }

  const ceilingRoom = [...structure.rooms].sort((a, b) => b.area - a.area)[0];
  if (ceilingRoom) {
    const ceiling = composeCameraView({ kind: "ceiling", structure, furniture: floorFurniture, roomId: ceilingRoom.id, viewport: desktop });
    assert.ok(ceiling.cameraPosition.y > 0.8, `${floor.id} ceiling camera must stay at a usable indoor height`);
    assert.ok(ceiling.target.y > ceiling.cameraPosition.y, `${floor.id} ceiling camera must look upward`);
  }

  for (const item of floorFurniture.filter((candidate) => candidate.visible !== false && !candidate.hidden).slice(0, 8)) {
    const objectView = composeCameraView({ kind: "object", structure, furniture: floorFurniture, objectId: item.id, viewport: desktop });
    finitePoint(objectView.cameraPosition, `${item.id} object camera`);
    assert.ok(objectView.fov <= 54, `${item.id} object focus must use a natural near/mid-shot FOV`);
  }

  const bounds = getStructureCameraBounds(structure, true);
  assert.ok(bounds.maxX > bounds.minX && bounds.maxZ > bounds.minZ, `${floor.id} structure bounds must come from live geometry`);
}

const wholeBounds = getWholeVillaCameraBounds(workspace.houseStructuresByFloor);
const whole = composeCameraView({ kind: "wholeVilla", structuresByFloor: workspace.houseStructuresByFloor, viewport: desktop });
const angled = composeCameraView({ kind: "wholeVilla", structuresByFloor: workspace.houseStructuresByFloor, viewport: desktop, direction: "right" });
assert.ok(wholeBounds.maxY - wholeBounds.minY > 8, "whole-villa bounds must include stacked storey heights");
assert.notDeepEqual(whole.cameraPosition, angled.cameraPosition, "whole-villa and angled overview must use distinct dynamic compositions");
assert.equal(JSON.stringify({ structures: workspace.houseStructuresByFloor, furniture: workspace.furniture }), originalHash, "camera composition must not modify real plan data");

const source = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
assert.equal(source.includes("const cameraPositions"), false, "legacy fixed cameraPositions must be removed");
assert.equal(source.includes("cameraPositions.overview"), false, "initial pose must use live floor bounds");
assert.equal(source.includes("x: targetPoint.x + 2.6"), false, "current object must not use the legacy fixed diagonal offset");
assert.match(source, /data-testid="camera-adjustment-bar"/);
assert.match(source, /cameraAdjustmentRequest/);
assert.match(source, /effectiveCameraWallDisplayMode/);

console.log("Unified camera composition checks passed for all floors, rooms, representative walls, objects, and responsive viewports.");
