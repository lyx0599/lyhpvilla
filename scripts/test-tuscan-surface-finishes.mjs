import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const room = (floorId, roomId) => workspace.houseStructuresByFloor[floorId].rooms.find((candidate) => candidate.id === roomId);

for (const structure of Object.values(workspace.houseStructuresByFloor)) {
  for (const candidate of structure.rooms) {
    assert.ok(candidate.surfaceFinishes?.floor?.materialToken, `${candidate.id} must define a canonical floor finish.`);
    assert.ok(candidate.surfaceFinishes?.wall?.materialToken, `${candidate.id} must define a canonical wall finish.`);
  }
}

for (const roomId of ["ROOM-1F-001", "ROOM-1F-002", "ROOM-1F-005", "ROOM-1F-006"]) {
  const finish = room("1F", roomId).surfaceFinishes.floor;
  assert.equal(finish.materialToken, "warmGreyStone");
  assert.equal(finish.materialResourceId, "showroomWarmGreyLimestoneFloor");
  assert.equal(finish.tileWidthMm, 600);
  assert.equal(finish.tileLengthMm, 1200);
}

const bedroomFloor = room("1F", "ROOM-1F-004").surfaceFinishes.floor;
assert.equal(bedroomFloor.materialToken, "oakFloor");
assert.equal(bedroomFloor.tileWidthMm, 200);
assert.equal(bedroomFloor.tileLengthMm, 1800);

for (const roomId of ["ROOM-2F-002", "ROOM-2F-004", "ROOM-2F-005", "ROOM-2F-006", "ROOM-2F-007", "ROOM-2F-008"]) {
  const candidate = room("2F", roomId);
  assert.equal(candidate.surfaceFinishes.floor.materialToken, "oakFloor");
  assert.equal(candidate.surfaceFinishes.wall.materialToken, "warmWhiteMineral");
  assert.equal(candidate.surfaceFinishes.wall.materialResourceId, "showroomLimePlaster");
}

for (const roomId of ["ROOM-1F-003", "ROOM-B1-001", "ROOM-2F-001", "ROOM-2F-003"]) {
  const floorId = roomId.startsWith("ROOM-1F") ? "1F" : roomId.startsWith("ROOM-B1") ? "B1" : "2F";
  const finish = room(floorId, roomId).surfaceFinishes.floor;
  assert.equal(finish.materialToken, "wetAreaTile");
  assert.equal(finish.tileWidthMm, 300);
  assert.equal(finish.tileLengthMm, 600);
}

for (const roomId of ["ROOM-B1-002", "ROOM-B1-003", "ROOM-B1-004", "ROOM-B1-005"]) {
  const candidate = room("B1", roomId);
  assert.equal(candidate.surfaceFinishes.floor.materialToken, "microCement");
  assert.notEqual(candidate.surfaceFinishes.wall.materialToken, "microCement", `${roomId} walls must remain visually lighter or intentionally featured.`);
}

for (const candidate of workspace.houseStructuresByFloor.B2.rooms) {
  assert.equal(candidate.surfaceFinishes.floor.materialToken, "warmGreyStone");
  assert.equal(candidate.surfaceFinishes.wall.materialToken, "warmWhiteMineral");
}

const renderer = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
assert.match(renderer, /floorStyle\.tileWidthMm \?\? 200/);
assert.match(renderer, /floorStyle\.tileLengthMm \?\? 1800/);
assert.match(renderer, /wallFinish\.material\) \? "microcement" : "wall"/);

console.log("Whole-house canonical floor and wall finish checks passed.");
