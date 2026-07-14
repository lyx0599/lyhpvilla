import { getFlightLocalEndpointHeights, STAIR_FLIGHT_RISE_MM } from "./stair-systems.ts";
import type { FloorId, HouseStair, HouseStructure, MmPoint, StairLanding, StairOpening, StairSystem } from "@/types/space";

export type StairRenderMode = "current-floor" | "system-analysis";

export type StairRenderPoint = {
  x: number;
  z: number;
  yMm: number;
};

export type StairRenderFlight = {
  systemId: string;
  stair: HouseStair;
  role: "lower-flight" | "upper-flight";
  sourceFloorId: FloorId;
  platformPlanPoint: MmPoint;
  floorPlanPoint: MmPoint;
  worldPlatformElevationMm: number;
  worldFloorElevationMm: number;
  realPlatformYMm: number;
  realFloorYMm: number;
  finalPlatformYMm: number;
  finalFloorYMm: number;
  presentationOffsetMm: number;
  muted: boolean;
};

export type StairRenderLanding = {
  landing: StairLanding;
  worldElevationMm: number;
  realYMm: number;
  finalYMm: number;
  presentationOffsetMm: number;
  planBounds: { minX: number; maxX: number; minY: number; maxY: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
};

export type StairRenderOpening = {
  opening: StairOpening;
  worldElevationMm: number;
  realYMm: number;
  finalYMm: number;
  presentationOffsetMm: number;
};

export type StairRenderSystemGeometry = {
  system: StairSystem;
  lowerFlight: StairRenderFlight | null;
  upperFlight: StairRenderFlight | null;
  landing: StairRenderLanding | null;
  opening: StairRenderOpening | null;
  mode: StairRenderMode;
  presentationOffsetMm: number;
  finalBounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
};

export const STAIR_FLOOR_WORLD_ELEVATION_MM: Record<FloorId, number> = {
  B2: 0,
  B1: 2800,
  "1F": 5600,
  "2F": 8400,
  YARD: 5600
};

function clonePoint(point: MmPoint): MmPoint {
  return { x: point.x, y: point.y };
}

export function getFloorWorldElevationMm(floorId: FloorId) {
  return STAIR_FLOOR_WORLD_ELEVATION_MM[floorId] ?? 0;
}

export function getStructureSizeForStairRender(structure: HouseStructure) {
  return {
    width: structure.coordinateSystem?.width || 12000,
    height: structure.coordinateSystem?.height || 9000
  };
}

export function toStairRenderScenePoint(point: MmPoint, structure: HouseStructure) {
  const size = getStructureSizeForStairRender(structure);
  return {
    x: point.x - size.width / 2,
    z: point.y - size.height / 2
  };
}

function lineLength(start: MmPoint, end: MmPoint) {
  return Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
}

export function getStairPlatformPlanPoint(stair: HouseStair, landingDepthMm: number) {
  const length = lineLength(stair.start, stair.end);
  const inset = Math.min(Math.max(0, landingDepthMm), length * 0.42);
  return {
    x: stair.start.x + ((stair.end.x - stair.start.x) / length) * inset,
    y: stair.start.y + ((stair.end.y - stair.start.y) / length) * inset
  };
}

function getFlightRecord(structuresByFloor: Partial<Record<FloorId, HouseStructure>>, stairId: string) {
  for (const structure of Object.values(structuresByFloor)) {
    const stair = structure?.stairs.find((candidate) => candidate.id === stairId);
    if (stair) return { stair, structure };
  }
  return null;
}

function landingSceneBounds(landing: StairLanding, structure: HouseStructure) {
  const points = landing.polygon.map((point) => toStairRenderScenePoint(point, structure));
  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    maxX: Math.max(bounds.maxX, point.x),
    minZ: Math.min(bounds.minZ, point.z),
    maxZ: Math.max(bounds.maxZ, point.z)
  }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
}

function landingPlanBounds(landing: StairLanding) {
  return landing.polygon.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    maxX: Math.max(bounds.maxX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxY: Math.max(bounds.maxY, point.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
}

function createFlight(input: {
  system: StairSystem;
  stair: HouseStair;
  structure: HouseStructure;
  role: "lower-flight" | "upper-flight";
  currentFloorId: FloorId;
  landingDepthMm: number;
  presentationOffsetMm: number;
}) {
  const sourceFloorWorldY = getFloorWorldElevationMm(input.stair.floorId);
  const currentFloorWorldY = getFloorWorldElevationMm(input.currentFloorId);
  const localHeights = getFlightLocalEndpointHeights(input.stair);
  const platformPoint = getStairPlatformPlanPoint(input.stair, input.landingDepthMm);
  const worldPlatformElevationMm = sourceFloorWorldY + localHeights.startHeightMm;
  const worldFloorElevationMm = sourceFloorWorldY + localHeights.endHeightMm;
  return {
    systemId: input.system.id,
    stair: input.stair,
    role: input.role,
    sourceFloorId: input.stair.floorId,
    platformPlanPoint: platformPoint,
    floorPlanPoint: clonePoint(input.stair.end),
    worldPlatformElevationMm,
    worldFloorElevationMm,
    realPlatformYMm: worldPlatformElevationMm - currentFloorWorldY,
    realFloorYMm: worldFloorElevationMm - currentFloorWorldY,
    finalPlatformYMm: worldPlatformElevationMm - currentFloorWorldY + input.presentationOffsetMm,
    finalFloorYMm: worldFloorElevationMm - currentFloorWorldY + input.presentationOffsetMm,
    presentationOffsetMm: input.presentationOffsetMm,
    muted: input.stair.floorId !== input.currentFloorId
  } satisfies StairRenderFlight;
}

function includeFlight(mode: StairRenderMode, currentFloorId: FloorId, flight: StairRenderFlight) {
  if (mode === "system-analysis") return true;
  return flight.sourceFloorId === currentFloorId;
}

function boundsFromParts(parts: Array<{ points: MmPoint[]; yValues: number[] }>, structure: HouseStructure) {
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  parts.forEach((part) => {
    part.points.forEach((point) => {
      const scene = toStairRenderScenePoint(point, structure);
      bounds.minX = Math.min(bounds.minX, scene.x);
      bounds.maxX = Math.max(bounds.maxX, scene.x);
      bounds.minZ = Math.min(bounds.minZ, scene.z);
      bounds.maxZ = Math.max(bounds.maxZ, scene.z);
    });
    part.yValues.forEach((value) => {
      bounds.minY = Math.min(bounds.minY, value);
      bounds.maxY = Math.max(bounds.maxY, value);
    });
  });
  return bounds;
}

export function buildStairRenderSystemGeometry(input: {
  system: StairSystem;
  structuresByFloor: Partial<Record<FloorId, HouseStructure>>;
  currentStructure: HouseStructure;
  currentFloorId: FloorId;
  landing?: StairLanding;
  opening?: StairOpening;
  mode: StairRenderMode;
  presentationOffsetMm?: number;
}): StairRenderSystemGeometry {
  const presentationOffsetMm = input.presentationOffsetMm ?? 0;
  const landingDepthMm = input.landing?.depth ?? 0;
  const lowerRecord = getFlightRecord(input.structuresByFloor, input.system.lowerFlightId);
  const upperRecord = getFlightRecord(input.structuresByFloor, input.system.upperFlightId);
  const rawLower = lowerRecord ? createFlight({
    system: input.system,
    stair: lowerRecord.stair,
    structure: lowerRecord.structure,
    role: "lower-flight",
    currentFloorId: input.currentFloorId,
    landingDepthMm,
    presentationOffsetMm
  }) : null;
  const rawUpper = upperRecord ? createFlight({
    system: input.system,
    stair: upperRecord.stair,
    structure: upperRecord.structure,
    role: "upper-flight",
    currentFloorId: input.currentFloorId,
    landingDepthMm,
    presentationOffsetMm
  }) : null;
  const lowerFlight = rawLower && includeFlight(input.mode, input.currentFloorId, rawLower) ? rawLower : null;
  const upperFlight = rawUpper && includeFlight(input.mode, input.currentFloorId, rawUpper) ? rawUpper : null;
  const currentFloorWorldY = getFloorWorldElevationMm(input.currentFloorId);
  const lowerFloorWorldY = getFloorWorldElevationMm(input.system.lowerFloorId);
  const landingWorldElevationMm = lowerFloorWorldY + STAIR_FLIGHT_RISE_MM;
  const landing = input.landing && input.mode === "system-analysis" ? {
    landing: input.landing,
    worldElevationMm: landingWorldElevationMm,
    realYMm: landingWorldElevationMm - currentFloorWorldY,
    finalYMm: landingWorldElevationMm - currentFloorWorldY + presentationOffsetMm,
    presentationOffsetMm,
    planBounds: landingPlanBounds(input.landing),
    bounds: landingSceneBounds(input.landing, input.currentStructure)
  } satisfies StairRenderLanding : null;
  const openingWorldElevationMm = input.opening ? getFloorWorldElevationMm(input.opening.floorId) : 0;
  const opening = input.opening && (input.mode === "system-analysis" || input.opening.floorId === input.currentFloorId) ? {
    opening: input.opening,
    worldElevationMm: openingWorldElevationMm,
    realYMm: openingWorldElevationMm - currentFloorWorldY,
    finalYMm: openingWorldElevationMm - currentFloorWorldY + presentationOffsetMm,
    presentationOffsetMm
  } satisfies StairRenderOpening : null;
  const parts = [
    lowerFlight ? { points: [lowerFlight.platformPlanPoint, lowerFlight.floorPlanPoint], yValues: [lowerFlight.finalPlatformYMm, lowerFlight.finalFloorYMm] } : null,
    upperFlight ? { points: [upperFlight.platformPlanPoint, upperFlight.floorPlanPoint], yValues: [upperFlight.finalPlatformYMm, upperFlight.finalFloorYMm] } : null,
    landing ? { points: landing.landing.polygon, yValues: [landing.finalYMm] } : null,
    opening ? { points: opening.opening.polygon, yValues: [opening.finalYMm] } : null
  ].filter((part): part is { points: MmPoint[]; yValues: number[] } => Boolean(part));
  return {
    system: input.system,
    lowerFlight,
    upperFlight,
    landing,
    opening,
    mode: input.mode,
    presentationOffsetMm,
    finalBounds: boundsFromParts(parts, input.currentStructure)
  };
}

export function getStairRenderContinuity(input: StairRenderSystemGeometry) {
  const lower = input.lowerFlight;
  const upper = input.upperFlight;
  const landing = input.landing;
  if (!lower || !upper || !landing) return null;
  const lowerToLandingMm = Math.max(
    Math.max(landing.planBounds.minX - lower.platformPlanPoint.x, lower.platformPlanPoint.x - landing.planBounds.maxX, 0),
    Math.max(landing.planBounds.minY - lower.platformPlanPoint.y, lower.platformPlanPoint.y - landing.planBounds.maxY, 0),
    Math.abs(lower.finalPlatformYMm - landing.finalYMm)
  );
  const upperToLandingMm = Math.max(
    Math.max(landing.planBounds.minX - upper.platformPlanPoint.x, upper.platformPlanPoint.x - landing.planBounds.maxX, 0),
    Math.max(landing.planBounds.minY - upper.platformPlanPoint.y, upper.platformPlanPoint.y - landing.planBounds.maxY, 0),
    Math.abs(upper.finalPlatformYMm - landing.finalYMm)
  );
  return { lowerToLandingMm, upperToLandingMm };
}

export function formatStairRenderDebug(system: StairRenderSystemGeometry) {
  const flightLine = (label: string, flight: StairRenderFlight | null) => {
    if (!flight) return `${label}: hidden`;
    return `${label}: ${flight.stair.id} world platform/floor ${flight.worldPlatformElevationMm}/${flight.worldFloorElevationMm} final platform/floor ${flight.finalPlatformYMm}/${flight.finalFloorYMm} plan platform (${Math.round(flight.platformPlanPoint.x)},${Math.round(flight.platformPlanPoint.y)}) floor (${flight.floorPlanPoint.x},${flight.floorPlanPoint.y}) offset ${flight.presentationOffsetMm}`;
  };
  const bounds = system.finalBounds;
  return [
    `systemId: ${system.system.id}`,
    flightLine("lowerFlight world start/end", system.lowerFlight),
    `landing world bounds: ${system.landing ? `${system.landing.worldElevationMm}mm x=${Math.round(system.landing.bounds.minX)}..${Math.round(system.landing.bounds.maxX)} z=${Math.round(system.landing.bounds.minZ)}..${Math.round(system.landing.bounds.maxZ)} finalY=${system.landing.finalYMm} offset=${system.landing.presentationOffsetMm}` : "hidden"}`,
    flightLine("upperFlight world start/end", system.upperFlight),
    `floor elevations: lower=${getFloorWorldElevationMm(system.system.lowerFloorId)} upper=${getFloorWorldElevationMm(system.system.upperFloorId)}`,
    `presentation offsets: system=${system.presentationOffsetMm}`,
    `final rendered bounds: x=${Math.round(bounds.minX)}..${Math.round(bounds.maxX)} y=${Math.round(bounds.minY)}..${Math.round(bounds.maxY)} z=${Math.round(bounds.minZ)}..${Math.round(bounds.maxZ)}`
  ].join("\n");
}
