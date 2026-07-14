import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildFloorCameraViews } from "../lib/floor-camera-views.ts";
import { deriveRoomTourViews, tourNodeToCameraView } from "../lib/room-tour.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const snapshot = JSON.stringify(workspace);
const nodes = deriveRoomTourViews(workspace);

for (const floor of workspace.floors) {
  const floorNodes = nodes.filter((node) => node.floorId === floor.id);
  assert.ok(floorNodes.some((node) => node.isFloorOverview), `${floor.id} must have a floor overview node`);
  const sourceCount = workspace.houseStructuresByFloor[floor.id].rooms.length + workspace.houseStructuresByFloor[floor.id].outdoors.length;
  assert.ok(floorNodes.length >= sourceCount + 1, `${floor.id} must derive nodes from every real room/outdoor`);
}

for (const name of ["全院", "南院", "北院", "南院生活区", "北院入户区"]) {
  assert.ok(nodes.some((node) => node.floorId === "YARD" && node.name === name), `YARD must include ${name}`);
}

const masterBedroom = nodes.find((node) => node.roomId === "ROOM-2F-006");
assert.ok(masterBedroom?.sourceCameraViewId === "view-2f-master-bedroom", "Master bedroom should reuse its fixed camera direction/metadata");
const masterBedroomSource = workspace.cameraViews.find((view) => view.id === "view-2f-master-bedroom");
assert.deepEqual(masterBedroom.cameraPosition, masterBedroomSource.cameraPosition, "Authored room cameras must preserve their exact position.");
assert.deepEqual(masterBedroom.target, masterBedroomSource.target, "Authored room cameras must preserve their furniture-height target.");
assert.ok(masterBedroom.linkedNodeIds.some((id) => id.includes("floor-overview")), "Room nodes should link back to floor overview");
assert.equal(tourNodeToCameraView(masterBedroom).mode, "perspective");
const b1DownSource = workspace.cameraViews.find((view) => view.id === "stair-view-b1-down-b2");
const b1DownNode = nodes.find((node) => node.sourceCameraViewId === b1DownSource.id);
assert.deepEqual(b1DownNode.cameraPosition, b1DownSource.cameraPosition, "Stair inspection nodes must preserve collision-safe camera positions.");
assert.deepEqual(b1DownNode.target, b1DownSource.target, "Stair inspection nodes must preserve their vertical target.");
const b1Floor = workspace.floors.find((floor) => floor.id === "B1");
assert.ok(b1Floor, "B1 floor must exist for stair camera checks.");
const b1StairCameraView = buildFloorCameraViews({
  floor: b1Floor,
  structure: workspace.houseStructuresByFloor.B1,
  sheetType: "sitePlan",
  cameraViews: workspace.cameraViews,
  roomTourViews: nodes
}).find((view) => view.id === b1DownNode.id);
assert.equal(b1StairCameraView.cameraMode, "fixed", "Stair inspection cameras must not use tour mode because it clamps high cutaway views back into walls/furniture.");
const livingSource = workspace.cameraViews.find((view) => view.id === "view-1f-fireplace");
const livingNode = nodes.find((node) => node.sourceCameraViewId === livingSource.id);
assert.deepEqual(livingNode.cameraPosition, livingSource.cameraPosition, "Feature cameras must preserve their exact authored position.");
assert.deepEqual(livingNode.target, livingSource.target, "Feature cameras must preserve their exact authored target.");
assert.equal(tourNodeToCameraView(b1DownNode).targetArea, "stair-down", "Stair focus metadata must survive the camera/tour adapter.");
assert.equal(JSON.stringify(workspace), snapshot, "Tour derivation must not mutate workspace data");

console.log(`Room tour checks passed (${nodes.length} derived nodes).`);
