import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compareWorkspace, getWorkspaceValidationErrors, normalizeWorkspace } from "../lib/workspace-persistence.ts";
import { getVerificationTargetEntries } from "../lib/dimension-verification.ts";
import { createStraightWall, generateRoomsFromWalls, getLineLength } from "../lib/house-geometry.ts";
import { validateWorkspaceReferences } from "../lib/workspace-reference-validator.ts";
import { validateWorkspaceDocument } from "./workspace-schema-validator.mjs";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const entries = getVerificationTargetEntries(workspace.houseStructuresByFloor);
assert.ok(entries.length > 0);
assert.ok(entries.every((entry) => entry.object.verificationMeta));

const exportedWorkspace = JSON.stringify(normalizeWorkspace(workspace));
const importedWorkspace = JSON.parse(exportedWorkspace);
assert.equal(compareWorkspace(importedWorkspace, workspace), true, "Workspace JSON import/export must preserve verification metadata.");
assert.equal(getWorkspaceValidationErrors(importedWorkspace).length, 0, "Imported workspace must pass application validation.");
assert.equal(validateWorkspaceDocument(importedWorkspace).length, 0, "Imported workspace must pass schema validation.");
assert.equal(validateWorkspaceReferences(importedWorkspace).errors.length, 0, "Imported workspace references must remain valid.");
assert.deepEqual(
  importedWorkspace.houseStructuresByFloor["1F"].walls[0].verificationMeta,
  workspace.houseStructuresByFloor["1F"].walls[0].verificationMeta
);

const floorId = "1F";
const walls = [
  createStraightWall("W-TEST-TOP", floorId, { x: 1000, y: 1000 }, { x: 4000, y: 1000 }),
  createStraightWall("W-TEST-RIGHT", floorId, { x: 4000, y: 1000 }, { x: 4000, y: 3000 }),
  createStraightWall("W-TEST-BOTTOM", floorId, { x: 4000, y: 3000 }, { x: 1000, y: 3000 }),
  createStraightWall("W-TEST-LEFT", floorId, { x: 1000, y: 3000 }, { x: 1000, y: 1000 })
];
const initialRooms = generateRoomsFromWalls(floorId, walls);
assert.equal(initialRooms.length, 1);
initialRooms[0].verificationMeta = {
  status: "site-measured",
  source: "site-measurement",
  toleranceMm: 5,
  notes: "测试房间现场复尺"
};
const resizedWalls = walls.map((wall) => {
  if (wall.kind !== "straight") return wall;
  if (wall.id === "W-TEST-TOP") return { ...wall, end: { x: 4500, y: 1000 }, length: 3500 };
  if (wall.id === "W-TEST-RIGHT") return { ...wall, start: { x: 4500, y: 1000 }, end: { x: 4500, y: 3000 }, length: 2000 };
  if (wall.id === "W-TEST-BOTTOM") return { ...wall, start: { x: 4500, y: 3000 }, length: 3500 };
  return wall;
});
const recomputedRooms = generateRoomsFromWalls(floorId, resizedWalls, initialRooms);
assert.equal(recomputedRooms.length, 1);
assert.equal(recomputedRooms[0].id, initialRooms[0].id, "Room recompute must preserve the room ID when source wall IDs stay stable.");
assert.deepEqual(recomputedRooms[0].verificationMeta, initialRooms[0].verificationMeta, "Room recompute must preserve verification metadata.");
assert.equal(recomputedRooms[0].area, 7_000_000);
assert.equal(getLineLength(resizedWalls[0].start, resizedWalls[0].end), 3500);

const editableStructure = structuredClone(workspace.houseStructuresByFloor["1F"]);
const editedWall = editableStructure.walls.find((wall) => wall.kind === "straight");
const hostedOpening = editableStructure.doors.find((door) => door.hostId === editedWall.id)
  ?? editableStructure.windows.find((windowObject) => windowObject.hostId === editedWall.id);
assert.ok(editedWall);
editedWall.end = { x: editedWall.end.x + 120, y: editedWall.end.y };
editedWall.length = getLineLength(editedWall.start, editedWall.end);
if (hostedOpening) {
  const openingId = hostedOpening.id;
  hostedOpening.width += 80;
  hostedOpening.positionOnWall = Math.min(0.95, hostedOpening.positionOnWall + 0.02);
  assert.equal(hostedOpening.id, openingId, "Opening dimensions and host position must be editable without rebuilding the floor.");
  assert.equal(hostedOpening.hostId, editedWall.id);
}
assert.equal(editableStructure.rooms.length, workspace.houseStructuresByFloor["1F"].rooms.length);

console.log("Dimension verification import/export and geometry update checks passed.");
