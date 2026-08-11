import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import {
  buildManagedStairInfrastructure,
  STAIR_CENTER_GAP_MM,
  STAIR_FLIGHT_CLEAR_WIDTH_MM,
  STAIR_HALF_LANDING_DEPTH_MM
} from "../lib/stair-systems.ts";

const workspaceUrl = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspaceUrl, "utf8"));
const structures = workspace.houseStructuresByFloor;

const SOURCE_CORE = {
  startX: 4123,
  farX: 950,
  upperCenterY: 3500,
  lowerCenterY: 3500 + STAIR_FLIGHT_CLEAR_WIDTH_MM + STAIR_CENTER_GAP_MM
};

const flightLane = new Map([
  ["ST-B2-001", "upper"],
  ["ST-B1-001", "upper"],
  ["ST-B1-002", "lower"],
  ["ST-1F-001", "upper"],
  ["ST-1F-002", "lower"],
  ["ST-2F-001", "lower"]
]);

for (const structure of Object.values(structures)) {
  for (const stair of structure.stairs ?? []) {
    const lane = flightLane.get(stair.id);
    if (!lane) continue;
    const centerY = lane === "upper" ? SOURCE_CORE.upperCenterY : SOURCE_CORE.lowerCenterY;
    Object.assign(stair, {
      start: { x: SOURCE_CORE.startX, y: centerY },
      end: { x: SOURCE_CORE.farX, y: centerY },
      width: STAIR_FLIGHT_CLEAR_WIDTH_MM,
      landingDepthMm: STAIR_HALF_LANDING_DEPTH_MM,
      visual: {
        ...(stair.visual ?? {}),
        style: "showroomLightStone",
        glassGuard: true,
        nosingColor: "#67584b",
        nosingWidthMm: 18,
        handrailColor: "#5f5145",
        handrailWidthMm: 42,
        finishBuildUpPerSideMm: 15
      },
      verificationMeta: {
        status: "drawing-derived",
        source: "developer-plan",
        sourceNote: "依据原始户型图：楼梯净区约3173×1870mm；双跑各900mm，中缝约70mm，半层平台900mm。B2图示3370×1889mm作为含边界的结构楼梯湾复核值。",
        toleranceMm: 30
      }
    });
  }
}

// Keep the room-selection overlays aligned with the rebuilt stair core. The
// surrounding structural walls remain drawing-controlled and are not inferred
// from this migration.
for (const floorId of ["B2", "B1", "1F", "2F"]) {
  const structure = structures[floorId];
  const stairRoom = structure?.rooms?.find((room) => /楼梯间/.test(room.name));
  if (!stairRoom) continue;
  stairRoom.boundary = [
    { x: SOURCE_CORE.farX, y: 3050 },
    { x: SOURCE_CORE.startX, y: 3050 },
    { x: SOURCE_CORE.startX, y: 4920 },
    { x: SOURCE_CORE.farX, y: 4920 }
  ];
  stairRoom.area = 3173 * 1870 / 1_000_000;
  stairRoom.verificationMeta = {
    status: "drawing-derived",
    source: "developer-plan",
    sourceNote: "楼梯房间覆盖层按1F原图3173×1870mm净区重建；结构墙边界仍以各层原图为准。",
    toleranceMm: 30
  };
}

const bedroomDoor = structures["1F"].doors.find((door) => door.id === "D-1F-003");
assert.ok(bedroomDoor, "Missing 1F bedroom door.");
Object.assign(bedroomDoor, {
  name: "1F 卧室向室内右开浅橡木门（避让楼梯）",
  openDirection: "rightIn",
  verificationMeta: {
    status: "drawing-derived",
    source: "developer-plan",
    sourceNote: "门扇保持向卧室内开，不侵入楼梯侧边与公共通行区；现场复核门套完成面。",
    toleranceMm: 30
  }
});

const cameraUpdates = {
  "designer-camera-1f-10-stair-public-route": {
    cameraPosition: { x: -0.72, y: 1.62, z: 0.72 },
    target: { x: -3.55, y: 0.28, z: -0.48 },
    fov: 36,
    zoom: 1.08,
    description: "从客厅近距离只看楼梯核心与1F卧室门：画面左侧下B1、右侧上2F；不带入电视柜、厨房或水吧。卧室门向室内开，门洞保持矩形。"
  },
  "stair-view-1f-living-front": {
    cameraPosition: { x: -0.72, y: 1.65, z: 0.72 },
    target: { x: -3.55, y: 0.25, z: -0.48 },
    fov: 36,
    zoom: 1.08
  },
  "stair-view-1f-down-entry": {
    cameraPosition: { x: -1.2, y: 1.58, z: 0.12 },
    target: { x: -3.75, y: -0.65, z: -0.03 },
    fov: 40,
    zoom: 1.05
  },
  "stair-view-1f-up-entry": {
    cameraPosition: { x: -1.2, y: 1.58, z: -1.08 },
    target: { x: -3.75, y: 1.2, z: -1 },
    fov: 40,
    zoom: 1.05
  },
  "stair-view-1f-landing": {
    cameraPosition: { x: -1.05, y: 2.35, z: 0.35 },
    target: { x: -4.15, y: 0, z: -0.5 },
    fov: 42,
    zoom: 1.02,
    description: "以轻微俯视角检查上下两个真实半层平台、900mm转身深度及扶手连续性；不使用超高鸟瞰。"
  }
};

for (const camera of workspace.cameraViews ?? []) {
  const update = cameraUpdates[camera.id];
  if (update) Object.assign(camera, update);
}

const infrastructure = buildManagedStairInfrastructure(structures);
workspace.stairSystems = infrastructure.stairSystems;
workspace.stairLandings = infrastructure.stairLandings;
workspace.stairOpenings = infrastructure.stairOpenings;

const expectedCoreWidth = STAIR_FLIGHT_CLEAR_WIDTH_MM * 2 + STAIR_CENTER_GAP_MM;
assert.equal(expectedCoreWidth, 1870);
assert.equal(SOURCE_CORE.startX - SOURCE_CORE.farX, 3173);
assert.equal(SOURCE_CORE.lowerCenterY - SOURCE_CORE.upperCenterY, 970);
assert.equal(workspace.stairSystems.length, 3);

await writeFile(workspaceUrl, `${JSON.stringify(workspace, null, 2)}\n`);
console.log(JSON.stringify({
  updatedFlights: [...flightLane.keys()],
  stairCoreMm: { length: 3173, width: expectedCoreWidth },
  flightWidthMm: STAIR_FLIGHT_CLEAR_WIDTH_MM,
  centerGapMm: STAIR_CENTER_GAP_MM,
  landingDepthMm: STAIR_HALF_LANDING_DEPTH_MM,
  stairSystems: workspace.stairSystems.map((system) => system.id),
  updatedCameras: Object.keys(cameraUpdates)
}, null, 2));
