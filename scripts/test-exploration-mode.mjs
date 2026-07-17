import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildExplorationCollisionWorld,
  canExecuteEditorCommand,
  createExplorationDoorStates,
  EXPLORATION_CHARACTER_RADIUS,
  findExplorationStairTransition,
  findNearestExplorationDoor,
  findNearestSafeExplorationPosition,
  getConnectedStairArrival,
  getExplorationGroundHeight,
  isExplorationPositionSafe,
  reconcileExplorationDoorStates,
  resolveExplorationCameraPlanPosition,
  resolveExplorationThirdPersonCameraPlanPosition,
  resolveExplorationMovement,
  resolveExplorationSpawn
} from "../lib/exploration-mode.ts";

assert.equal(EXPLORATION_CHARACTER_RADIUS, 0.18, "Exploration navigation should use a 36 cm adult body envelope.");

const coordinateSystem = {
  floorId: "1F",
  origin: { x: 0, y: 0 },
  unit: "mm",
  width: 4000,
  height: 4000,
  scale: 1,
  note: "exploration test"
};

const door = {
  id: "D-TEST-001",
  floorId: "1F",
  name: "测试门",
  geometryType: "line",
  hostId: "W-TEST-001",
  hostType: "wall",
  positionOnWall: 0.5,
  width: 1000,
  height: 2100,
  openDirection: "leftIn"
};

const structure = {
  floorId: "1F",
  coordinateSystem,
  walls: [{
    id: "W-TEST-001",
    floorId: "1F",
    name: "中墙",
    kind: "straight",
    geometryType: "line",
    start: { x: 0, y: 2000 },
    end: { x: 4000, y: 2000 },
    thickness: 200,
    height: 2800,
    length: 4000
  }],
  rooms: [{
    id: "ROOM-TEST-001",
    floorId: "1F",
    roomNumber: "R-01",
    name: "玄关",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 4000 }, { x: 0, y: 4000 }],
    area: 16_000_000,
    sourceWallIds: ["W-TEST-001"]
  }],
  partitions: [],
  stairs: [],
  columns: [],
  fences: [],
  outdoorSurfaces: [],
  doors: [door],
  windows: [],
  bayWindows: [],
  skylights: [],
  outdoors: []
};

const furniture = [{
  id: "F-TEST-001",
  code: "TEST-01",
  name: "固定柜体",
  type: "cabinet",
  floorId: "1F",
  roomId: "ROOM-TEST-001",
  dimensions: { width: 100, depth: 60, height: 220, unit: "cm" },
  material: "wood",
  note: "",
  position: { x: 75, y: 75, rotation: 20 },
  color: "#ddd"
}];

assert.equal(canExecuteEditorCommand("exploration", "move"), true);
for (const blocked of ["create", "delete", "transform", "edit-property", "change-material", "undo", "redo", "copy", "paste", "import", "ai-edit"]) {
  assert.equal(canExecuteEditorCommand("exploration", blocked), false, `${blocked} must be blocked in exploration mode`);
}

const closedStates = createExplorationDoorStates({ "1F": structure });
assert.deepEqual(closedStates[door.id], { open: false, currentAngle: 0 });
const closedWorld = buildExplorationCollisionWorld({ structure, furniture, doorStates: closedStates });
assert.equal(isExplorationPositionSafe(closedWorld, { x: 0, z: 0 }), false, "A closed door must block the opening.");
assert.equal(findNearestExplorationDoor(closedWorld, { x: 0, z: 0.8 })?.door.id, door.id);
const wallClampedCamera = resolveExplorationCameraPlanPosition(closedWorld, { x: 0, z: 1 }, { x: 0, z: -1 });
assert.ok(wallClampedCamera.z > 0.15, "A third-person camera must remain in front of a blocking wall or closed door.");
const adaptiveCamera = resolveExplorationThirdPersonCameraPlanPosition(closedWorld, { x: 0, z: 1 }, Math.PI, 3.65);
assert.ok(adaptiveCamera.distance > Math.hypot(wallClampedCamera.x, wallClampedCamera.z - 1), "A blocked game camera must find a wider side or diagonal view.");

const openStates = { ...closedStates, [door.id]: { open: true, currentAngle: 1 } };
const openWorld = buildExplorationCollisionWorld({ structure, furniture, doorStates: openStates });
assert.equal(isExplorationPositionSafe(openWorld, { x: 0, z: 0 }), true, "An open door must expose the shared wall opening.");
assert.equal(isExplorationPositionSafe(openWorld, { x: 1, z: 1 }), false, "Large furniture must be a blocker.");
const stopped = resolveExplorationMovement(openWorld, { x: 0, y: 0, z: 0.45 }, { x: 1, y: 0, z: 1 });
assert.notDeepEqual(stopped, { x: 1, y: 0, z: 1 }, "Movement must not enter a furniture blocker.");
assert.ok(findNearestSafeExplorationPosition(openWorld, { x: 1, z: 1 }), "Invalid positions must resolve to a nearby safe point.");
assert.ok(resolveExplorationSpawn(structure, openWorld), "A safe entrance spawn must be derived from unified room data.");

const stairStructure = structuredClone(structure);
stairStructure.walls = [];
stairStructure.doors = [];
stairStructure.stairs = [{
  id: "ST-LOWER",
  floorId: "1F",
  name: "上行梯段",
  geometryType: "line",
  start: { x: 500, y: 1000 },
  end: { x: 2500, y: 1000 },
  width: 900,
  baseHeight: 0,
  height: 1400,
  stepCount: 10,
  direction: "up",
  stairSystemId: "STAIR-SYS-TEST",
  flightRole: "lower-flight",
  connectedFromFloorId: "1F",
  connectedToFloorId: "2F",
  landingId: "LANDING-TEST",
  editable: true,
  removable: true
}];
const stairWorld = buildExplorationCollisionWorld({ structure: stairStructure, furniture: [], doorStates: {} });
assert.equal(getExplorationGroundHeight(stairWorld, { x: -1.5, z: -1 }), 0);
assert.ok(getExplorationGroundHeight(stairWorld, { x: 0.5, z: -1 }) > 1.3, "Stair height must follow the current stair geometry.");
const stairHandoffPoint = {
  x: stairWorld.stairs[0].start.x + (stairWorld.stairs[0].end.x - stairWorld.stairs[0].start.x) * 0.85,
  z: stairWorld.stairs[0].start.z + (stairWorld.stairs[0].end.z - stairWorld.stairs[0].start.z) * 0.85
};
assert.equal(findExplorationStairTransition(stairWorld, stairHandoffPoint)?.id, "ST-LOWER", "A walkable landing approach must trigger the paired-flight handoff.");

const upperStructure = structuredClone(stairStructure);
upperStructure.floorId = "2F";
upperStructure.coordinateSystem.floorId = "2F";
upperStructure.rooms[0].floorId = "2F";
upperStructure.stairs = [{
  ...stairStructure.stairs[0],
  id: "ST-UPPER",
  floorId: "2F",
  name: "下行梯段",
  flightRole: "upper-flight",
  direction: "down",
  connectedFromFloorId: "2F",
  connectedToFloorId: "1F"
}];
const arrival = getConnectedStairArrival(upperStructure, stairWorld.stairs[0]);
assert.equal(arrival?.stairId, "ST-UPPER", "Stair transitions must reuse the connected live stair object.");

const reconciled = reconcileExplorationDoorStates(openStates, { "2F": upperStructure });
assert.equal(reconciled[door.id], undefined, "Deleted doors must not remain in exploration runtime state.");

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const floor3DSource = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
const plannerSource = await readFile(new URL("../components/space-planner.tsx", import.meta.url), "utf8");
const explorationRendererSource = floor3DSource.slice(floor3DSource.indexOf("export function Exploration3DView"), floor3DSource.indexOf("export function Floor3DView"));
const explorationEntrySource = plannerSource.slice(plannerSource.indexOf("if (isExplorationMode)"), plannerSource.indexOf("if (mobileShellActive)"));
assert.equal(explorationRendererSource.includes('drawingSheetType="materialPlan"'), false, "Exploration must not force the material-plan scene.");
assert.equal(explorationRendererSource.includes('designStyle="warmJapandi"'), false, "Exploration must inherit the active 3D design style.");
assert.equal(explorationRendererSource.includes('drawingViewPreset={viewMode'), false, "First/third person must not change scene geometry presets.");
assert.equal(explorationRendererSource.includes("furnitureHeightModeOverride={sceneSettings.furnitureHeightMode}"), true, "Exploration must reuse the ordinary 3D furniture height mode.");
assert.equal(explorationRendererSource.includes("wallDisplayModeOverride={sceneSettings.wallDisplayMode}"), true, "Exploration must reuse the ordinary 3D wall display mode.");
assert.equal(explorationRendererSource.includes("allDrawingItems={allDrawingItems}"), true, "Exploration must retain the same finish and technical drawing data.");
assert.equal(explorationEntrySource.includes('drawingSheetType: "sitePlan"'), false, "The exploration entry must not replace the active workspace sheet.");
assert.equal(explorationEntrySource.includes('furnitureHeightMode: "actual"'), false, "The exploration entry must not replace the active furniture height mode.");
assert.equal(explorationEntrySource.includes('wallDisplayMode: "full"'), false, "The exploration entry must not replace the active wall mode.");
const canonicalDoorStates = createExplorationDoorStates(workspace.houseStructuresByFloor);
for (const floor of workspace.floors) {
  const canonicalStructure = workspace.houseStructuresByFloor[floor.id];
  if (!canonicalStructure) continue;
  const canonicalWorld = buildExplorationCollisionWorld({
    structure: canonicalStructure,
    furniture: workspace.furniture.filter((item) => item.floorId === floor.id),
    doorStates: canonicalDoorStates
  });
  const canonicalSpawn = resolveExplorationSpawn(canonicalStructure, canonicalWorld);
  assert.equal(isExplorationPositionSafe(canonicalWorld, canonicalSpawn), true, `${floor.id} must derive a collision-safe live-data spawn.`);
  for (const stair of canonicalWorld.stairs.filter((candidate) => candidate.connectedToFloorId)) {
    const handoffPoint = {
      x: stair.start.x + (stair.end.x - stair.start.x) * 0.85,
      z: stair.start.z + (stair.end.z - stair.start.z) * 0.85
    };
    assert.equal(isExplorationPositionSafe(canonicalWorld, handoffPoint), true, `${stair.id} must reach its landing handoff before structural collision.`);
    assert.equal(findExplorationStairTransition(canonicalWorld, handoffPoint)?.id, stair.id, `${stair.id} must trigger a floor transition from a reachable point.`);
    const targetStructure = workspace.houseStructuresByFloor[stair.connectedToFloorId];
    const targetArrival = targetStructure ? getConnectedStairArrival(targetStructure, stair) : null;
    assert.ok(targetArrival, `${stair.id} must resolve its paired live-flight arrival.`);
    const targetWorld = buildExplorationCollisionWorld({
      structure: targetStructure,
      furniture: workspace.furniture.filter((item) => item.floorId === targetStructure.floorId),
      doorStates: canonicalDoorStates
    });
    assert.equal(isExplorationPositionSafe(targetWorld, targetArrival.position), true, `${stair.id} must arrive at a collision-safe point on ${targetStructure.floorId}.`);
  }
}

console.log("Exploration mode checks passed.");
