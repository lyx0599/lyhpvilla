import assert from "node:assert/strict";
import fs from "node:fs";

const workspace = JSON.parse(fs.readFileSync(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const byId = (id) => {
  const item = workspace.furniture.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing furniture ${id}`);
  return item;
};

const fridge = byId("furn-fridge-001");
assert.equal(fridge.position.rotation, 90);
assert.equal(fridge.hostWallId, undefined);
assert.equal(fridge.render3d.kitchenVisual.fridgeSurround, "none");

const sink = byId("furn-sink-001");
assert.deepEqual(sink.dimensions, { width: 146, depth: 48, height: 20, unit: "cm" });
assert.equal(sink.render3d.kitchenVisual.sinkBowls, 2);
assert.equal(sink.render3d.kitchenVisual.faucetPlacement, "center");
assert.ok(!workspace.furniture.some((item) => item.id === "furn-sink-002"));
assert.ok(!workspace.furniture.some((item) => item.id === "furn-kitchen-u-right-run"));

for (const id of ["furn-b1-activity-floor-lamp-001", "furn-b1-activity-small-shelf-001", "furn-b1-activity-bookshelf-001", "furn-b1-activity-instrument-rack-001"]) byId(id);
const b1Vanity = byId("furn-b1-bath-vanity-001");
assert.deepEqual(b1Vanity.dimensions, { width: 45, depth: 35, height: 82, unit: "cm" });
assert.equal(b1Vanity.render3d.wetAreaVisual.mirrorStyle, "none");
assert.ok(!workspace.drawingItems.some((item) => item.controlGroupId === "CG-B1-B1-001-MIRROR"));
const b1Laundry = workspace.houseStructuresByFloor.B1.rooms.find((room) => room.id === "ROOM-B1-001");
assert.ok(b1Laundry.area < 3_100_000, "B1 washroom/laundry should remain close to 3 square metres");
const washer = byId("furn-b1-laundry-washer-001");
assert.equal(washer.render3d.variantId, "washerDryerStack");
assert.equal(washer.dimensions.height, 170);

assert.ok(workspace.stairLandings.every((landing) => landing.depth === 600));
for (const structure of Object.values(workspace.houseStructuresByFloor)) {
  for (const stair of structure.stairs ?? []) {
    if (!stair.stairSystemId) continue;
    assert.equal(stair.start.x, 3676);
    assert.equal(stair.landingDepthMm, 600);
  }
}

const pegboard = byId("furn-b2-activity-outdoor-pegboard-001");
assert.equal(pegboard.hostWallId, "W-B2-011");
assert.equal(pegboard.dimensions.width, 360);
const memorial = byId("furn-b2-study-souvenir-cabinet-001");
assert.deepEqual({ columns: memorial.render3d.cabinetVisual.gridColumns, rows: memorial.render3d.cabinetVisual.gridRows, layout: memorial.render3d.cabinetVisual.layout }, { columns: 5, rows: 4, layout: "squareGrid" });
assert.equal(memorial.render3d.cabinetVisual.frontStyle, "glass");
const slabTable = byId("furn-b2-study-slab-table-001");
assert.deepEqual(slabTable.dimensions, { width: 160, depth: 60, height: 80, unit: "cm" });

const kitchenSource = fs.readFileSync(new URL("../components/furniture-3d/kitchen-family-3d.tsx", import.meta.url), "utf8");
const wetAreaSource = fs.readFileSync(new URL("../components/furniture-3d/wet-area-family-3d.tsx", import.meta.url), "utf8");
const cabinetSource = fs.readFileSync(new URL("../components/furniture-3d/cabinet-family-3d.tsx", import.meta.url), "utf8");
const floor3dSource = fs.readFileSync(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
const planSource = fs.readFileSync(new URL("../components/plan-canvas.tsx", import.meta.url), "utf8");
assert.match(kitchenSource, /single-centered-faucet/);
assert.match(kitchenSource, /fridgeSurround !== "none"/);
assert.match(wetAreaSource, /mirrorStyle !== "none"/);
assert.match(cabinetSource, /square-grid-glass-display-cabinet/);
assert.match(floor3dSource, /peg-hole-/);
assert.match(floor3dSource, /washerDryerStack/);
assert.match(floor3dSource, /InstrumentRack3DGroup/);
assert.match(planSource, /displayPosition\.y < 16 \? "below" : "above"/);

console.log("Model refinement round 3 checks passed.");
