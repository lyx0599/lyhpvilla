import assert from "node:assert/strict";
import fs from "node:fs";

const workspace = JSON.parse(fs.readFileSync(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const byId = (id) => {
  const item = workspace.furniture.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing furniture ${id}`);
  return item;
};
const mm = (item) => ({ x: item.position.x * 120, y: item.position.y * 90 });

const prep = byId("furn-kitchen-u-right-run");
assert.deepEqual(prep.dimensions, { width: 90, depth: 55, height: 90, unit: "cm" });
assert.equal(Math.round(mm(prep).y), 1250);

const entry = byId("furn-entry-slim-hanging-001");
assert.equal(entry.moduleType, "entryCabinet");
assert.equal(entry.hostWallId, "W-1F-004");
assert.equal(entry.render3d.variantId, "slimHangingRail");
assert.ok(!/洞洞板/.test(`${entry.name} ${entry.material}`));

const bed = byId("module-1f-bed-002");
assert.equal(bed.render3d.variantId, "tallPanelHeadboard");
assert.ok(byId("furn-1f-bedroom-nightstand-north-001"));
assert.ok(byId("furn-1f-bedroom-nightstand-south-001"));
const oneFloorStructure = workspace.houseStructuresByFloor["1F"];
assert.ok(!oneFloorStructure.windows.some((item) => item.id === "WIN-1F-003"));
const bedroomBayWindow = oneFloorStructure.bayWindows.find((item) => item.id === "BW-1F-003");
assert.equal(bedroomBayWindow?.openDirection, "inward");
assert.equal(bedroomBayWindow?.wallId, "W-1F-014");
const livingWindow = oneFloorStructure.windows.find((item) => item.id === "WIN-1F-006");
assert.equal(livingWindow?.width, 3600);
assert.equal(livingWindow?.height, 1900);
assert.equal(livingWindow?.sillHeightMm, 550);
assert.equal(livingWindow?.operation, "fixed");
assert.equal(oneFloorStructure.doors.find((item) => item.id === "D-1F-005")?.visual?.style, "archedReededGlass");
assert.equal(oneFloorStructure.doors.find((item) => item.id === "D-1F-003")?.visual?.style, "wovenReliefWood");
const twoFloorStructure = workspace.houseStructuresByFloor["2F"];
for (const id of ["D-2F-006", "D-2F-007"]) assert.equal(twoFloorStructure.doors.find((item) => item.id === id)?.visual?.style, "archedReededGlass");
for (const id of ["D-2F-003", "D-2F-004"]) assert.equal(twoFloorStructure.doors.find((item) => item.id === id)?.visual?.style, "wovenReliefWood");
const masterDoor = twoFloorStructure.doors.find((item) => item.id === "D-2F-008");
assert.equal(masterDoor?.width, 1600);
assert.equal(masterDoor?.visual?.style, "doubleLeafWood");
assert.equal(masterDoor?.visual?.leafCount, 2);

const waterBar = byId("furn-living-waterbar-001");
const snackCabinet = byId("furn-living-snack-pullout-001");
assert.ok(mm(waterBar).y > mm(snackCabinet).y, "Water bar must be closer to the south courtyard than the snack cabinet.");

for (const id of ["furn-bath-vanity-001", "furn-2f-guest-vanity-001", "furn-2f-master-vanity-001"]) {
  assert.equal(byId(id).render3d.wetAreaVisual.mirrorStyle, "cabinet");
}
assert.equal(byId("furn-bath-vanity-001").position.rotation, 90);
assert.equal(byId("furn-2f-guest-vanity-001").position.rotation, 90);

const b1Toilet = byId("furn-b1-bath-toilet-001");
const b1Vanity = byId("furn-b1-bath-vanity-001");
const washer = byId("furn-b1-laundry-washer-001");
assert.equal(b1Toilet.hostWallId, "W-B1-015");
assert.equal(b1Vanity.hostWallId, "W-B1-001");
const toiletCenter = mm(b1Toilet);
const washerCenter = mm(washer);
const vanityCenter = mm(b1Vanity);
assert.ok(washerCenter.x < vanityCenter.x, "B1 washer niche must occupy the left side of the back wall.");
assert.ok(toiletCenter.x > washerCenter.x && toiletCenter.y > vanityCenter.y, "B1 toilet must align with the right/front concealed-cistern cabinet wall.");

for (const [id, rotation] of [
  ["furn-b2-activity-outdoor-pegboard-001", 180],
  ["furn-b2-study-souvenir-cabinet-001", 270],
  ["furn-b1-activity-small-shelf-001", 270],
  ["furn-b2-under-stair-shelf-001", 270],
  ["furn-2f-master-bathtub-001", 270],
  ["furn-2f-master-toilet-001", 270]
]) assert.equal(byId(id).position.rotation, rotation);

for (const item of workspace.furniture.filter((candidate) => candidate.hostWallId)) {
  const structure = workspace.houseStructuresByFloor[item.floorId];
  const room = structure?.rooms.find((candidate) => candidate.id === item.roomId);
  if (!structure || !room) continue;
  const center = room.boundary.reduce((sum, point) => ({ x: sum.x + point.x / room.boundary.length, y: sum.y + point.y / room.boundary.length }), { x: 0, y: 0 });
  const position = mm(item);
  const radians = (item.position.rotation ?? 0) * Math.PI / 180;
  const front = { x: -Math.sin(radians), y: Math.cos(radians) };
  const towardRoom = { x: center.x - position.x, y: center.y - position.y };
  const dot = front.x * towardRoom.x + front.y * towardRoom.y;
  assert.ok(dot >= 0, `${item.id} still faces away from its room.`);
}

const b2Sofa = byId("furn-b2-living-long-sofa-001");
assert.equal(Math.round(mm(b2Sofa).y), 3800);
assert.equal(b2Sofa.position.rotation, 180);
assert.deepEqual(byId("module-2f-window-desk").dimensions, { width: 180, depth: 70, height: 75, unit: "cm" });

console.log("Model refinement round 4 checks passed.");
