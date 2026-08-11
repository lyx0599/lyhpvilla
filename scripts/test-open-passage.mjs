import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getDoorOpeningRenderPolicy } from "../lib/opening-render-policy.ts";
import { getHostedOpeningCuts } from "../lib/structure-3d-geometry.ts";
import { normalizeObjectForSync } from "../lib/object-sync-adapter.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const structure = workspace.houseStructuresByFloor["2F"];
const opening = structure.doors.find((door) => door.id === "D-2F-002");
assert.ok(opening, "D-2F-002 must exist.");
assert.equal(opening.visual?.style, "openPassage");
assert.equal(opening.visual?.leafCount, 0);

const policy = getDoorOpeningRenderPolicy(opening);
assert.deepEqual(policy, {
  mode: "openPassage",
  drawFrame: false,
  drawLeaf: false,
  drawTrack: false,
  drawHardware: false,
  drawGlass: false,
  drawSwingArc: false
});

const host = structure.walls.find((wall) => wall.id === opening.hostId);
assert.ok(host && host.kind === "straight", "Open passage host wall must exist.");
const hostLength = Math.hypot(host.end.x - host.start.x, host.end.y - host.start.y);
const cut = getHostedOpeningCuts(structure, host.id, "wall", hostLength, host.height).find((item) => item.id === opening.id);
assert.ok(cut, "Open passage must retain a wall opening cut.");
assert.equal(Math.round(cut.endMm - cut.startMm), 1500);
assert.equal(cut.bottomMm, 0);
assert.equal(cut.topMm, 2300);

const normalized = normalizeObjectForSync(opening, structure.coordinateSystem);
assert.equal(normalized.kind, "door");
assert.equal(normalized.dimensionsMm.width, 1500);

const ordinary = Object.values(workspace.houseStructuresByFloor)
  .flatMap((item) => item.doors)
  .find((door) => door.id !== opening.id && door.visual?.leafCount !== 0);
assert.ok(ordinary, "At least one ordinary door must exist.");
const ordinaryPolicy = getDoorOpeningRenderPolicy(ordinary);
assert.equal(ordinaryPolicy.mode, "door");
assert.equal(ordinaryPolicy.drawFrame, true);
assert.equal(ordinaryPolicy.drawLeaf, true);
assert.equal(ordinaryPolicy.drawHardware, true);
assert.equal(ordinaryPolicy.drawTrack, ordinary.operation === "sliding");

const floor3dSource = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
const planSource = await readFile(new URL("../components/plan-canvas.tsx", import.meta.url), "utf8");
assert.match(floor3dSource, /getDoorOpeningRenderPolicy\(opening as HouseDoor\)/);
assert.match(floor3dSource, /doorRenderPolicy\?\.mode === "openPassage" \? null/);
assert.match(planSource, /getDoorOpeningRenderPolicy\(door\)/);
assert.match(planSource, /renderPolicy\.mode === "openPassage" \? null/);

const balconies = structure.outdoors.filter((item) => item.outdoorType === "balcony");
assert.deepEqual(balconies.map((item) => item.id).sort(), ["OD-2F-BALCONY-01", "OD-2F-BALCONY-02"]);
const divider = structure.fences.find((item) => item.id === "FN-2F-BALCONY-DIVIDER");
assert.ok(divider, "The two confirmed balconies must keep their solid divider.");
assert.equal(divider.material, "wall");
assert.equal(divider.thickness, 180);

console.log("openPassage shared 2D/3D policy checks passed");
