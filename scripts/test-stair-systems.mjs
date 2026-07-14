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
  assert.deepEqual(lowerHeights, { startHeightMm: 1400, endHeightMm: 0 });
  assert.deepEqual(upperHeights, { startHeightMm: -1400, endHeightMm: 0 });
  assert.equal(lowerHeights.startHeightMm, upperHeights.startHeightMm + system.floorToFloorHeightMm, `${system.id} flights must meet at one landing elevation.`);

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
