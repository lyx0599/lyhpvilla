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
assert.equal(b1Toilet.hostWallId, "W-B1-001");
assert.equal(b1Vanity.hostWallId, "W-B1-015");
const toiletCenter = mm(b1Toilet);
const washerCenter = mm(washer);
const toiletRight = toiletCenter.x + b1Toilet.dimensions.width * 5;
const washerLeft = washerCenter.x - washer.dimensions.width * 5;
assert.ok(toiletRight < washerLeft, "B1 toilet must not block the washer footprint.");

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
assert.deepEqual(byId("module-2f-window-desk").dimensions, { width: 120, depth: 50, height: 80, unit: "cm" });

console.log("Model refinement round 4 checks passed.");
