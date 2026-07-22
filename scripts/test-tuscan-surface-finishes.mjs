import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const room = (floorId, roomId) => workspace.houseStructuresByFloor[floorId].rooms.find((candidate) => candidate.id === roomId);

for (const structure of Object.values(workspace.houseStructuresByFloor)) {
  for (const candidate of structure.rooms) {
    assert.ok(candidate.surfaceFinishes?.floor, `${candidate.id} must define an editable floor finish.`);
    assert.ok(candidate.surfaceFinishes?.wall, `${candidate.id} must define an editable wall finish.`);
  }
}

assert.equal(room("1F", "ROOM-1F-005").surfaceFinishes.floor.name, "暖米灰石灰岩纹哑光瓷砖");
assert.equal(room("1F", "ROOM-1F-005").surfaceFinishes.floor.tileWidthMm, 600);
assert.equal(room("1F", "ROOM-1F-005").surfaceFinishes.floor.tileLengthMm, 1200);
assert.equal(room("1F", "ROOM-1F-005").surfaceFinishes.wall.material, "limewash");
assert.equal(room("1F", "ROOM-1F-002").surfaceFinishes.wall.material, "mineralSilicatePaint");

for (const roomId of ["ROOM-1F-004", "ROOM-2F-004", "ROOM-2F-005", "ROOM-2F-006", "ROOM-2F-007"]) {
  const floorId = roomId.startsWith("ROOM-1F") ? "1F" : "2F";
  const finish = room(floorId, roomId).surfaceFinishes.floor;
  assert.equal(finish.material, "woodFloor");
  assert.equal(finish.tileWidthMm, 200);
  assert.equal(finish.tileLengthMm, 1800);
}

for (const structure of [workspace.houseStructuresByFloor.B1, workspace.houseStructuresByFloor.B2]) {
  for (const candidate of structure.rooms.filter((item) => !/卫|盥洗|洗衣/.test(item.name))) {
    assert.equal(candidate.surfaceFinishes.floor.material, "microcement", `${candidate.id} must use warm microcement.`);
    assert.equal(candidate.surfaceFinishes.wall.material === "microcement", false, `${candidate.id} walls must stay lighter than the floor.`);
  }
}

for (const roomId of ["ROOM-1F-003", "ROOM-2F-001", "ROOM-2F-003", "ROOM-B1-001"]) {
  const floorId = roomId.startsWith("ROOM-1F") ? "1F" : roomId.startsWith("ROOM-2F") ? "2F" : "B1";
  const finish = room(floorId, roomId).surfaceFinishes.floor;
  assert.equal(finish.name, "浅米洞石纹防滑瓷砖");
  assert.equal(finish.tileWidthMm, 300);
  assert.equal(finish.tileLengthMm, 600);
}

const renderer = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
assert.match(renderer, /floorStyle\.tileWidthMm \?\? 200/);
assert.match(renderer, /floorStyle\.tileLengthMm \?\? 1800/);
assert.match(renderer, /wallFinish\s*\? \/microcement\|cement\/i/);

console.log("Whole-house modern Tuscan floor and wall finish checks passed.");
