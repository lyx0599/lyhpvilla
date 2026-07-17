import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  getFlightLocalEndpointHeights,
  STAIR_FLIGHT_RISE_MM,
  STAIR_FLIGHT_STEP_COUNT,
  STAIR_RISER_HEIGHT_MM,
  STAIR_TOTAL_STEP_COUNT,
  validateStairSystems
} from "../lib/stair-systems.ts";
import {
  buildStairRenderSystemGeometry,
  formatStairRenderDebug,
  getFloorWorldElevationMm,
  getStairRenderContinuity
} from "../lib/stair-render-geometry.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const validate = (value, includeFurniture = false) => validateStairSystems({
  structuresByFloor: value.houseStructuresByFloor,
  stairSystems: value.stairSystems,
  stairLandings: value.stairLandings,
  stairOpenings: value.stairOpenings,
  furniture: includeFurniture ? value.furniture : undefined
});

assert.equal(STAIR_RISER_HEIGHT_MM, 140);
assert.equal(STAIR_FLIGHT_RISE_MM, 1400);
assert.equal(workspace.stairSystems.length, 3);
assert.deepEqual(validate(workspace), [], "The canonical stair systems must have no structural warnings.");
assert.equal(validate(workspace, true).some((issue) => /rug/i.test(issue.objectId) || /地毯/.test(issue.message)), false, "Rugs must not trigger stair-clearance warnings.");

const flightIndex = new Map(
  Object.values(workspace.houseStructuresByFloor).flatMap((structure) => structure.stairs.map((stair) => [stair.id, stair]))
);
for (const system of workspace.stairSystems) {
  const lower = flightIndex.get(system.lowerFlightId);
  const upper = flightIndex.get(system.upperFlightId);
  assert.ok(lower && upper, `${system.id} must retain both existing flight IDs.`);
  assert.equal(lower.stepCount, STAIR_FLIGHT_STEP_COUNT);
  assert.equal(upper.stepCount, STAIR_FLIGHT_STEP_COUNT);
  assert.equal(system.totalStepCount, STAIR_TOTAL_STEP_COUNT);
  assert.equal(lower.height, STAIR_FLIGHT_RISE_MM);
  assert.equal(upper.height, STAIR_FLIGHT_RISE_MM);
  assert.equal(lower.landingId, system.landingId);
  assert.equal(upper.landingId, system.landingId);
  const lowerHeights = getFlightLocalEndpointHeights(lower);
  const upperHeights = getFlightLocalEndpointHeights(upper);
  assert.deepEqual(lowerHeights, { startHeightMm: 0, endHeightMm: 1400 });
  assert.deepEqual(upperHeights, { startHeightMm: 0, endHeightMm: -1400 });
  assert.equal(lowerHeights.endHeightMm, upperHeights.endHeightMm + system.floorToFloorHeightMm, `${system.id} flights must meet at one landing elevation.`);

  const landing = workspace.stairLandings.find((candidate) => candidate.id === system.landingId);
  const opening = workspace.stairOpenings.find((candidate) => candidate.id === system.openingId);
  const lowerStructure = workspace.houseStructuresByFloor[system.lowerFloorId];
  const renderSystem = buildStairRenderSystemGeometry({
    system,
    structuresByFloor: workspace.houseStructuresByFloor,
    currentStructure: lowerStructure,
    currentFloorId: system.lowerFloorId,
    landing,
    opening,
    mode: "system-analysis"
  });
  const continuity = getStairRenderContinuity(renderSystem);
  const debug = formatStairRenderDebug(renderSystem);
  assert.ok(continuity, `Missing full render continuity.\n${debug}`);
  assert.ok(continuity.lowerToLandingMm <= lower.width, `Lower flight is visually detached from landing.\n${debug}`);
  assert.ok(continuity.upperToLandingMm <= upper.width, `Upper flight is visually detached from landing.\n${debug}`);
  assert.equal(renderSystem.landing?.worldElevationMm, getFloorWorldElevationMm(system.lowerFloorId) + STAIR_FLIGHT_RISE_MM, `Landing must be at half-floor elevation.\n${debug}`);
  assert.equal(renderSystem.lowerFlight?.worldPlatformElevationMm, renderSystem.landing?.worldElevationMm, `Lower flight top must meet landing.\n${debug}`);
  assert.equal(renderSystem.upperFlight?.worldPlatformElevationMm, renderSystem.landing?.worldElevationMm, `Upper flight lower end must meet landing.\n${debug}`);
  assert.deepEqual(renderSystem.lowerFlight?.floorPlanPoint, lower.start, `Lower-floor access must remain at the living-room side.\n${debug}`);
  assert.deepEqual(renderSystem.upperFlight?.floorPlanPoint, upper.start, `Upper-floor access must remain at the living-room side.\n${debug}`);
  assert.ok((renderSystem.lowerFlight?.platformPlanPoint.x ?? Infinity) < lower.start.x, `Half landing must be on the far side of the run.\n${debug}`);
  assert.ok((renderSystem.upperFlight?.platformPlanPoint.x ?? Infinity) < upper.start.x, `Half landing must be on the far side of the run.\n${debug}`);

  const explodedOffsetMm = 1750;
  const explodedSystem = buildStairRenderSystemGeometry({
    system,
    structuresByFloor: workspace.houseStructuresByFloor,
    currentStructure: lowerStructure,
    currentFloorId: system.lowerFloorId,
    landing,
    opening,
    mode: "system-analysis",
    presentationOffsetMm: explodedOffsetMm
  });
  const explodedDebug = formatStairRenderDebug(explodedSystem);
  for (const flight of [explodedSystem.lowerFlight, explodedSystem.upperFlight].filter(Boolean)) {
    assert.equal(flight.finalPlatformYMm - flight.realPlatformYMm, explodedOffsetMm, `Presentation offset must apply exactly once at flight platform.\n${explodedDebug}`);
    assert.equal(flight.finalFloorYMm - flight.realFloorYMm, explodedOffsetMm, `Presentation offset must apply exactly once at flight floor.\n${explodedDebug}`);
  }
  assert.equal(explodedSystem.landing?.finalYMm - explodedSystem.landing?.realYMm, explodedOffsetMm, `Presentation offset must apply exactly once at landing.\n${explodedDebug}`);
  const explodedContinuity = getStairRenderContinuity(explodedSystem);
  assert.ok(explodedContinuity && explodedContinuity.lowerToLandingMm <= lower.width && explodedContinuity.upperToLandingMm <= upper.width, `Shared/exploded stair system must remain continuous.\n${explodedDebug}`);
}

assert.deepEqual(workspace.houseStructuresByFloor.B2.stairs.map((stair) => stair.direction), ["up"], "B2 must terminate with an up-only path.");
assert.deepEqual(workspace.houseStructuresByFloor["2F"].stairs.map((stair) => stair.direction), ["down"], "2F must terminate with a down-only path.");
assert.equal(workspace.cameraViews.filter((view) => view.id.startsWith("stair-view-")).length, 15, "All dedicated stair inspection views must persist.");

const b1CurrentLayer = workspace.stairSystems
  .filter((system) => system.lowerFloorId === "B1" || system.upperFloorId === "B1")
  .map((system) => buildStairRenderSystemGeometry({
    system,
    structuresByFloor: workspace.houseStructuresByFloor,
    currentStructure: workspace.houseStructuresByFloor.B1,
    currentFloorId: "B1",
    landing: workspace.stairLandings.find((candidate) => candidate.id === system.landingId),
    opening: workspace.stairOpenings.find((candidate) => candidate.id === system.openingId),
    mode: "current-floor"
  }));
assert.equal(b1CurrentLayer.flatMap((system) => [system.lowerFlight, system.upperFlight].filter(Boolean)).length, 2, "B1 ordinary 3D must only render its two current-floor stair flights.");
assert.ok(b1CurrentLayer.every((system) => !system.landing), `B1 ordinary 3D must not render remote half-level floating landings.\n${b1CurrentLayer.map(formatStairRenderDebug).join("\n\n")}`);
assert.ok(b1CurrentLayer.some((system) => system.upperFlight?.stair.id === "ST-B1-002"), "B1 ordinary 3D must keep the left/down path toward B2.");
assert.ok(b1CurrentLayer.some((system) => system.lowerFlight?.stair.id === "ST-B1-001"), "B1 ordinary 3D must keep the right/up path toward 1F.");
const b1DownFlight = b1CurrentLayer.flatMap((system) => [system.lowerFlight, system.upperFlight].filter(Boolean)).find((flight) => flight.stair.id === "ST-B1-002");
assert.equal(b1DownFlight?.finalFloorYMm, 0, "B1 down flight must begin on the B1 finished floor.");
assert.equal(b1DownFlight?.finalPlatformYMm, -STAIR_FLIGHT_RISE_MM, "B1 down flight must visibly descend toward the B2 half landing.");
assert.ok(b1CurrentLayer.some((system) => system.opening?.opening.floorId === "B1"), "B1 ordinary 3D must retain the opening that reveals the down flight.");

const b2CurrentLayer = workspace.stairSystems
  .filter((system) => system.lowerFloorId === "B2" || system.upperFloorId === "B2")
  .flatMap((system) => {
    const renderSystem = buildStairRenderSystemGeometry({
      system,
      structuresByFloor: workspace.houseStructuresByFloor,
      currentStructure: workspace.houseStructuresByFloor.B2,
      currentFloorId: "B2",
      landing: workspace.stairLandings.find((candidate) => candidate.id === system.landingId),
      opening: workspace.stairOpenings.find((candidate) => candidate.id === system.openingId),
      mode: "current-floor"
    });
    return [renderSystem.lowerFlight, renderSystem.upperFlight].filter(Boolean);
  });
assert.deepEqual(b2CurrentLayer.map((flight) => flight.stair.direction), ["up"], "B2 current 3D must not render a false down flight.");

const twoFCurrentLayer = workspace.stairSystems
  .filter((system) => system.lowerFloorId === "2F" || system.upperFloorId === "2F")
  .flatMap((system) => {
    const renderSystem = buildStairRenderSystemGeometry({
      system,
      structuresByFloor: workspace.houseStructuresByFloor,
      currentStructure: workspace.houseStructuresByFloor["2F"],
      currentFloorId: "2F",
      landing: workspace.stairLandings.find((candidate) => candidate.id === system.landingId),
      opening: workspace.stairOpenings.find((candidate) => candidate.id === system.openingId),
      mode: "current-floor"
    });
    return [renderSystem.lowerFlight, renderSystem.upperFlight].filter(Boolean);
  });
assert.deepEqual(twoFCurrentLayer.map((flight) => flight.stair.direction), ["down"], "2F current 3D must not render a false up flight.");
assert.equal(twoFCurrentLayer[0]?.stair.id, "ST-2F-001", "2F must render the real arrival/down flight connected to 1F.");
assert.equal(twoFCurrentLayer[0]?.finalFloorYMm, 0, "2F arrival flight must meet the 2F finished floor.");
assert.equal(twoFCurrentLayer[0]?.finalPlatformYMm, -STAIR_FLIGHT_RISE_MM, "2F arrival flight must continue down toward the 1F half landing.");

const invalidSteps = structuredClone(workspace);
invalidSteps.houseStructuresByFloor.B1.stairs[0].stepCount = 9;
assert.ok(validate(invalidSteps).some((issue) => issue.code === "INVALID_STEP_COUNT"));
assert.ok(validate(invalidSteps).some((issue) => issue.code === "LIGHTING_RESYNC_REQUIRED"));

const invalidLanding = structuredClone(workspace);
invalidLanding.houseStructuresByFloor.B1.stairs[0].landingId = "LANDING-MISSING";
assert.ok(validate(invalidLanding).some((issue) => issue.code === "LANDING_MISMATCH"));

const invalidOpening = structuredClone(workspace);
invalidOpening.stairOpenings[0].polygon = invalidOpening.stairOpenings[0].polygon.map((point) => ({ x: point.x + 2500, y: point.y }));
assert.ok(validate(invalidOpening).some((issue) => issue.code === "OPENING_TOO_SMALL"));

const invalidBottom = structuredClone(workspace);
invalidBottom.houseStructuresByFloor.B2.stairs[0].direction = "down";
assert.ok(validate(invalidBottom).some((issue) => issue.code === "FALSE_B2_DOWN"));

console.log("Stair system checks passed.");
