import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildFloorCameraViews, splitFloorCameraViews } from "../lib/floor-camera-views.ts";
import { deriveRoomTourViews } from "../lib/room-tour.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const roomTourViews = deriveRoomTourViews(workspace);

function viewsFor(floorId, sheetType = "furniturePlan", structureOverride) {
  const floor = workspace.floors.find((item) => item.id === floorId);
  return buildFloorCameraViews({
    floor,
    structure: structureOverride ?? workspace.houseStructuresByFloor[floorId],
    sheetType,
    cameraViews: workspace.cameraViews,
    roomTourViews
  });
}

function names(floorId, sheetType) {
  return viewsFor(floorId, sheetType).map((view) => view.name);
}

const firstFloorNames = names("1F");
assert.ok(firstFloorNames.some((name) => /厨房/.test(name)), "1F should expose a real kitchen view");
assert.ok(firstFloorNames.some((name) => /客厅|起居/.test(name)), "1F should expose living views");
assert.ok(firstFloorNames.some((name) => /壁炉/.test(name)), "1F should expose the fireplace feature view");

const secondFloorNames = names("2F");
assert.ok(secondFloorNames.some((name) => /主卧/.test(name)), "2F should expose the main bedroom");
assert.ok(secondFloorNames.some((name) => /衣帽/.test(name)), "2F should expose the closet");
assert.ok(secondFloorNames.some((name) => /主卫/.test(name)), "2F should expose the main bathroom");
assert.equal(secondFloorNames.some((name) => /厨房|壁炉/.test(name)), false, "2F must not inherit 1F views");

assert.ok(names("B1").some((name) => /客房|房间/.test(name)), "B1 should expose its actual guest/room space");
assert.ok(names("B2").some((name) => /书房/.test(name)), "B2 should expose its study");
assert.ok(names("B2").some((name) => /活动/.test(name)), "B2 should expose its activity zone");
assert.ok(names("YARD", "sitePlan").some((name) => /北院/.test(name)), "YARD should expose north-yard views");
assert.ok(names("YARD", "sitePlan").some((name) => /南院/.test(name)), "YARD should expose south-yard views");

for (const floor of workspace.floors) {
  const floorViews = viewsFor(floor.id);
  assert.ok(floorViews.every((view) => view.floorId === floor.id && view.fixedView.floor === floor.id), `${floor.id} must not contain cross-floor targets`);
  const { primary, more } = splitFloorCameraViews(floorViews);
  assert.ok(primary.length >= 4 && primary.length <= 6, `${floor.id} should show 4–6 primary workspace-derived views`);
  assert.ok(more.some((view) => view.name === "前") && more.some((view) => view.name === "后"), `${floor.id} more menu should contain secondary general views`);
}

const lightingViews = viewsFor("1F", "lightingPlan");
assert.equal(lightingViews.find((view) => view.defaultForFloor)?.category, "lighting-scene", "lightingPlan should default to an interior lighting experience");
assert.equal(splitFloorCameraViews(lightingViews).primary.some((view) => ["前", "后", "左", "右"].includes(view.name)), false, "lightingPlan should not prioritize distant directional views");

const ceilingViews = viewsFor("2F", "ceilingPlan");
assert.equal(ceilingViews.find((view) => view.defaultForFloor)?.name, "顶面观察", "ceilingPlan should default to the ceiling view");
assert.equal(names("2F", "furniturePlan").includes("顶面观察"), false, "sheet-specific views must stay out of unrelated specialties");

const secondFloorWithoutMainBedroom = {
  ...workspace.houseStructuresByFloor["2F"],
  rooms: workspace.houseStructuresByFloor["2F"].rooms.filter((room) => room.id !== "ROOM-2F-006")
};
const withoutRoomNames = viewsFor("2F", "furniturePlan", secondFloorWithoutMainBedroom).map((view) => view.name);
assert.equal(withoutRoomNames.includes("主卧"), false, "missing workspace rooms must not produce room buttons");

const source = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
assert.match(source, /requestFreeBrowse/);
assert.match(source, /transitionRef\.current = null/);
assert.match(source, /controls\.enableRotate = true/);
assert.match(source, /data-testid="camera-adjustment-bar"/);
assert.match(source, /data-testid="mobile-camera-bar"/);

console.log(`Floor camera view checks passed (${roomTourViews.length} workspace-derived nodes).`);
