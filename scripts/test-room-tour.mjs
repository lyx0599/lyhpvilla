import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
assert.ok(masterBedroom.linkedNodeIds.some((id) => id.includes("floor-overview")), "Room nodes should link back to floor overview");
assert.equal(tourNodeToCameraView(masterBedroom).mode, "perspective");
assert.equal(JSON.stringify(workspace), snapshot, "Tour derivation must not mutate workspace data");

console.log(`Room tour checks passed (${nodes.length} derived nodes).`);
