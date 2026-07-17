import { getFlightLocalEndpointHeights } from "./stair-systems.ts";
import type { Furniture, FloorId, HouseDoor, HouseStair, HouseStructure, MmPoint } from "@/types/space";

const MM_TO_M = 1 / 1000;
// A slim adult body envelope. The mushroom cap is decorative and does not
// participate in navigation, matching common third-person game collision.
export const EXPLORATION_CHARACTER_RADIUS = 0.18;
// The structural wall at the stair landing begins before the mathematical
// flight endpoint. Hand off between the paired live flights while the
// character capsule is still inside the collision-safe landing approach.
const STAIR_HANDOFF_T = 0.84;

export type ExplorationEditorMode = "design" | "exploration";
export type ExplorationViewMode = "firstPerson" | "thirdPerson";
export type ExplorationLightingMode = "day" | "night";

export type ExplorationDoorState = {
  open: boolean;
  currentAngle: number;
};

export type ExplorationDoorStates = Record<string, ExplorationDoorState>;

export type ExplorationCabinetState = {
  open: boolean;
  currentAmount: number;
};

export type ExplorationCabinetStates = Record<string, ExplorationCabinetState>;

export type ExplorationPoint = {
  x: number;
  y: number;
  z: number;
};

type CollisionSegment = {
  id: string;
  kind: "wall" | "partition" | "door" | "window" | "fence";
  start: { x: number; z: number };
  end: { x: number; z: number };
  halfThickness: number;
};

type CollisionBox = {
  id: string;
  kind: "furniture" | "column";
  center: { x: number; z: number };
  halfWidth: number;
  halfDepth: number;
  rotation: number;
};

export type ExplorationStairSurface = {
  id: string;
  stairSystemId?: string;
  connectedToFloorId?: FloorId;
  flightRole?: HouseStair["flightRole"];
  start: { x: number; z: number };
  end: { x: number; z: number };
  width: number;
  startHeight: number;
  endHeight: number;
};

export type ExplorationDoorRuntime = {
  door: HouseDoor;
  center: { x: number; z: number };
  open: boolean;
};

export type ExplorationCollisionWorld = {
  floorId: FloorId;
  segments: CollisionSegment[];
  boxes: CollisionBox[];
  walkablePolygons: Array<Array<{ x: number; z: number }>>;
  stairs: ExplorationStairSurface[];
  doors: ExplorationDoorRuntime[];
};

export type ExplorationCommand =
  | "move"
  | "look"
  | "toggle-view"
  | "toggle-door"
  | "toggle-cabinet"
  | "reset-position"
  | "toggle-lighting"
  | "exit"
  | "create"
  | "delete"
  | "transform"
  | "edit-property"
  | "change-material"
  | "undo"
  | "redo"
  | "copy"
  | "paste"
  | "import"
  | "ai-edit";

const explorationCommands = new Set<ExplorationCommand>([
  "move",
  "look",
  "toggle-view",
  "toggle-door",
  "toggle-cabinet",
  "reset-position",
  "toggle-lighting",
  "exit"
]);

export function canExecuteEditorCommand(editorMode: ExplorationEditorMode, command: ExplorationCommand) {
  return editorMode !== "exploration" || explorationCommands.has(command);
}

export function createExplorationDoorStates(structuresByFloor: Partial<Record<FloorId, HouseStructure>>): ExplorationDoorStates {
  return Object.values(structuresByFloor).reduce<ExplorationDoorStates>((states, structure) => {
    structure?.doors.forEach((door) => {
      states[door.id] = { open: false, currentAngle: 0 };
    });
    return states;
  }, {});
}

export function reconcileExplorationDoorStates(
  current: ExplorationDoorStates,
  structuresByFloor: Partial<Record<FloorId, HouseStructure>>
): ExplorationDoorStates {
  const next = createExplorationDoorStates(structuresByFloor);
  Object.keys(next).forEach((doorId) => {
    if (current[doorId]) next[doorId] = current[doorId];
  });
  return next;
}

const explorationCabinetTypes = new Set([
  "cabinet",
  "wallCabinet",
  "kitchenCabinet",
  "snackCabinet",
  "tallCabinet",
  "wardrobe",
  "walkInCloset",
  "entryCabinet",
  "sideboard",
  "island",
  "outdoorCabinet"
]);

export function isExplorationCabinet(item: Furniture) {
  if (item.hidden || item.visible === false || item.render3d?.visibleIn3d === false) return false;
  const semanticTypes = [item.type, item.moduleType, item.render3d?.assetType].filter((value): value is string => Boolean(value));
  if (semanticTypes.some((type) => explorationCabinetTypes.has(type))) return true;
  return /衣柜|橱柜|柜体|收纳柜|餐边柜|鞋柜|玄关柜|水吧柜/.test(item.name);
}

export function createExplorationCabinetStates(furniture: Furniture[]): ExplorationCabinetStates {
  return furniture.reduce<ExplorationCabinetStates>((states, item) => {
    if (isExplorationCabinet(item)) states[item.id] = { open: false, currentAmount: 0 };
    return states;
  }, {});
}

export function reconcileExplorationCabinetStates(
  current: ExplorationCabinetStates,
  furniture: Furniture[]
): ExplorationCabinetStates {
  const next = createExplorationCabinetStates(furniture);
  Object.keys(next).forEach((cabinetId) => {
    if (current[cabinetId]) next[cabinetId] = current[cabinetId];
  });
  return next;
}

function structureSize(structure: HouseStructure) {
  return {
    width: structure.coordinateSystem?.width || 12000,
    height: structure.coordinateSystem?.height || 9000
  };
}

export function explorationScenePoint(point: MmPoint, structure: HouseStructure) {
  const size = structureSize(structure);
  return {
    x: (point.x - size.width / 2) * MM_TO_M,
    z: (point.y - size.height / 2) * MM_TO_M
  };
}

function sceneFurnitureCenter(item: Furniture, structure: HouseStructure) {
  const size = structureSize(structure);
  return {
    x: ((item.position.x / 100) * size.width - size.width / 2) * MM_TO_M,
    z: ((item.position.y / 100) * size.height - size.height / 2) * MM_TO_M
  };
}

function segmentLength(start: { x: number; z: number }, end: { x: number; z: number }) {
  return Math.max(0.0001, Math.hypot(end.x - start.x, end.z - start.z));
}

function interpolateSegment(start: { x: number; z: number }, end: { x: number; z: number }, t: number) {
  return {
    x: start.x + (end.x - start.x) * t,
    z: start.z + (end.z - start.z) * t
  };
}

function addHostedLineCollision(input: {
  id: string;
  kind: "wall" | "partition";
  startMm: MmPoint;
  endMm: MmPoint;
  thicknessMm: number;
  structure: HouseStructure;
  doors: HouseDoor[];
  doorStates: ExplorationDoorStates;
  output: CollisionSegment[];
}) {
  const start = explorationScenePoint(input.startMm, input.structure);
  const end = explorationScenePoint(input.endMm, input.structure);
  const length = segmentLength(start, end);
  const hostedDoors = input.doors
    .map((door) => ({
      door,
      startT: Math.max(0, door.positionOnWall - (door.width * MM_TO_M) / length / 2),
      endT: Math.min(1, door.positionOnWall + (door.width * MM_TO_M) / length / 2)
    }))
    .sort((left, right) => left.startT - right.startT);
  let cursor = 0;
  hostedDoors.forEach(({ door, startT, endT }) => {
    if (startT > cursor) {
      input.output.push({
        id: `${input.id}:${cursor.toFixed(3)}-${startT.toFixed(3)}`,
        kind: input.kind,
        start: interpolateSegment(start, end, cursor),
        end: interpolateSegment(start, end, startT),
        halfThickness: Math.max(0.035, input.thicknessMm * MM_TO_M / 2)
      });
    }
    if (!input.doorStates[door.id]?.open) {
      input.output.push({
        id: door.id,
        kind: "door",
        start: interpolateSegment(start, end, startT),
        end: interpolateSegment(start, end, endT),
        halfThickness: Math.max(0.035, input.thicknessMm * MM_TO_M / 2)
      });
    }
    cursor = Math.max(cursor, endT);
  });
  if (cursor < 1) {
    input.output.push({
      id: `${input.id}:${cursor.toFixed(3)}-1.000`,
      kind: input.kind,
      start: interpolateSegment(start, end, cursor),
      end,
      halfThickness: Math.max(0.035, input.thicknessMm * MM_TO_M / 2)
    });
  }
}

function arcPoints(structure: HouseStructure, wall: Extract<HouseStructure["walls"][number], { kind: "arc" }>) {
  const startAngle = wall.startAngle * Math.PI / 180;
  const endAngle = wall.endAngle * Math.PI / 180;
  let sweep = endAngle - startAngle;
  if (wall.direction === "clockwise" && sweep < 0) sweep += Math.PI * 2;
  if (wall.direction === "counterclockwise" && sweep > 0) sweep -= Math.PI * 2;
  const steps = Math.max(10, Math.ceil(Math.abs(sweep) * wall.radius / 450));
  return Array.from({ length: steps + 1 }, (_, index) => explorationScenePoint({
    x: wall.center.x + Math.cos(startAngle + sweep * (index / steps)) * wall.radius,
    y: wall.center.y + Math.sin(startAngle + sweep * (index / steps)) * wall.radius
  }, structure));
}

function isFurnitureBlocker(item: Furniture) {
  if (item.hidden || item.visible === false || item.render3d?.visibleIn3d === false) return false;
  if ((item.render3d?.elevationMm ?? 0) > 450) return false;
  if (/地毯|铺装|灯|插座|排水|地漏/.test(item.name)) return false;
  const footprint = item.dimensions.width * item.dimensions.depth;
  return item.dimensions.height >= 32 && footprint >= 1800;
}

export function buildExplorationCollisionWorld(input: {
  structure: HouseStructure;
  furniture: Furniture[];
  doorStates: ExplorationDoorStates;
}): ExplorationCollisionWorld {
  const { structure, furniture, doorStates } = input;
  const segments: CollisionSegment[] = [];
  structure.walls.forEach((wall) => {
    if (wall.hidden || wall.visible === false) return;
    if (wall.kind === "arc") {
      const points = arcPoints(structure, wall);
      points.slice(0, -1).forEach((start, index) => segments.push({
        id: `${wall.id}:${index}`,
        kind: "wall",
        start,
        end: points[index + 1],
        halfThickness: Math.max(0.035, wall.thickness * MM_TO_M / 2)
      }));
      return;
    }
    addHostedLineCollision({
      id: wall.id,
      kind: "wall",
      startMm: wall.start,
      endMm: wall.end,
      thicknessMm: wall.thickness,
      structure,
      doors: structure.doors.filter((door) => door.hostId === wall.id),
      doorStates,
      output: segments
    });
  });
  structure.partitions.forEach((partition) => {
    if (partition.hidden || partition.visible === false) return;
    addHostedLineCollision({
      id: partition.id,
      kind: "partition",
      startMm: partition.start,
      endMm: partition.end,
      thicknessMm: partition.thickness,
      structure,
      doors: structure.doors.filter((door) => door.hostId === partition.id),
      doorStates,
      output: segments
    });
  });
  structure.fences.forEach((fence) => {
    if (fence.hidden || fence.visible === false) return;
    segments.push({
      id: fence.id,
      kind: "fence",
      start: explorationScenePoint(fence.start, structure),
      end: explorationScenePoint(fence.end, structure),
      halfThickness: Math.max(0.04, fence.thickness * MM_TO_M / 2)
    });
  });

  const boxes: CollisionBox[] = furniture.filter(isFurnitureBlocker).map((item) => ({
    id: item.id,
    kind: "furniture",
    center: sceneFurnitureCenter(item, structure),
    halfWidth: Math.max(0.06, item.dimensions.width / 200),
    halfDepth: Math.max(0.04, item.dimensions.depth / 200),
    rotation: -(item.position.rotation || 0) * Math.PI / 180
  }));
  structure.columns.filter((column) => !column.hidden && column.visible !== false).forEach((column) => {
    boxes.push({
      id: column.id,
      kind: "column",
      center: explorationScenePoint(column.center, structure),
      halfWidth: Math.max(0.05, column.radius * MM_TO_M),
      halfDepth: Math.max(0.05, column.radius * MM_TO_M),
      rotation: 0
    });
  });

  const walkablePolygons = [
    ...structure.rooms.filter((room) => !room.hidden && room.visible !== false).map((room) => room.boundary),
    ...structure.outdoors.filter((outdoor) => !outdoor.hidden && outdoor.visible !== false).map((outdoor) => outdoor.polygon)
  ].filter((polygon) => polygon.length >= 3).map((polygon) => polygon.map((point) => explorationScenePoint(point, structure)));

  const stairs = structure.stairs.filter((stair) => !stair.hidden && stair.visible !== false).map((stair) => {
    const localHeights = getFlightLocalEndpointHeights(stair);
    return {
      id: stair.id,
      stairSystemId: stair.stairSystemId,
      connectedToFloorId: stair.connectedToFloorId,
      flightRole: stair.flightRole,
      start: explorationScenePoint(stair.start, structure),
      end: explorationScenePoint(stair.end, structure),
      width: Math.max(0.5, stair.width * MM_TO_M),
      startHeight: localHeights.startHeightMm * MM_TO_M,
      endHeight: localHeights.endHeightMm * MM_TO_M
    } satisfies ExplorationStairSurface;
  });

  const doors = structure.doors.flatMap((door) => {
    const host = structure.walls.find((wall) => wall.id === door.hostId && wall.kind === "straight")
      ?? structure.partitions.find((partition) => partition.id === door.hostId);
    if (!host || !("start" in host)) return [];
    const start = explorationScenePoint(host.start, structure);
    const end = explorationScenePoint(host.end, structure);
    return [{ door, center: interpolateSegment(start, end, door.positionOnWall), open: Boolean(doorStates[door.id]?.open) }];
  });

  return { floorId: structure.floorId, segments, boxes, walkablePolygons, stairs, doors };
}

function pointInPolygon(point: { x: number; z: number }, polygon: Array<{ x: number; z: number }>) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index];
    const b = polygon[previous];
    if ((a.z > point.z) !== (b.z > point.z) && point.x < ((b.x - a.x) * (point.z - a.z)) / ((b.z - a.z) || 0.0001) + a.x) inside = !inside;
  }
  return inside;
}

function distanceToSegment(point: { x: number; z: number }, start: { x: number; z: number }, end: { x: number; z: number }) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared <= 0.000001 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
  const closest = { x: start.x + dx * t, z: start.z + dz * t };
  return { distance: Math.hypot(point.x - closest.x, point.z - closest.z), t, closest };
}

function hitsBox(point: { x: number; z: number }, box: CollisionBox, radius: number) {
  const dx = point.x - box.center.x;
  const dz = point.z - box.center.z;
  const cosine = Math.cos(-box.rotation);
  const sine = Math.sin(-box.rotation);
  const localX = dx * cosine - dz * sine;
  const localZ = dx * sine + dz * cosine;
  return Math.abs(localX) < box.halfWidth + radius && Math.abs(localZ) < box.halfDepth + radius;
}

export function isExplorationPositionSafe(world: ExplorationCollisionWorld, point: { x: number; z: number }, radius = EXPLORATION_CHARACTER_RADIUS) {
  const onStair = world.stairs.some((stair) => distanceToSegment(point, stair.start, stair.end).distance <= stair.width / 2);
  const inOpenDoorway = world.doors.some((door) => door.open && Math.hypot(door.center.x - point.x, door.center.z - point.z) <= door.door.width * MM_TO_M / 2 + radius);
  if (world.walkablePolygons.length > 0 && !onStair && !inOpenDoorway && !world.walkablePolygons.some((polygon) => pointInPolygon(point, polygon))) return false;
  if (world.segments.some((segment) => distanceToSegment(point, segment.start, segment.end).distance < segment.halfThickness + radius)) return false;
  if (world.boxes.some((box) => hitsBox(point, box, radius))) return false;
  return true;
}

export function resolveExplorationMovement(
  world: ExplorationCollisionWorld,
  current: ExplorationPoint,
  candidate: ExplorationPoint,
  radius = EXPLORATION_CHARACTER_RADIUS
): ExplorationPoint {
  if (isExplorationPositionSafe(world, candidate, radius)) return candidate;
  const xOnly = { ...current, x: candidate.x };
  if (isExplorationPositionSafe(world, xOnly, radius)) return xOnly;
  const zOnly = { ...current, z: candidate.z };
  if (isExplorationPositionSafe(world, zOnly, radius)) return zOnly;
  return current;
}

export function resolveExplorationCameraPlanPosition(
  world: ExplorationCollisionWorld,
  target: { x: number; z: number },
  desired: { x: number; z: number },
  radius = 0.12
) {
  const dx = desired.x - target.x;
  const dz = desired.z - target.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= 0.001) return { ...target };
  const steps = Math.max(1, Math.ceil(distance / 0.1));
  let safe = { ...target };
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const candidate = { x: target.x + dx * t, z: target.z + dz * t };
    if (!isExplorationPositionSafe(world, candidate, radius)) break;
    safe = candidate;
  }
  return safe;
}

export function resolveExplorationThirdPersonCameraPlanPosition(
  world: ExplorationCollisionWorld,
  target: { x: number; z: number },
  yaw: number,
  desiredDistance: number
) {
  const offsets = [0, 0.48, -0.48, 0.96, -0.96, 1.42, -1.42];
  let best = { x: target.x, z: target.z, distance: 0, score: Number.NEGATIVE_INFINITY };
  offsets.forEach((offset) => {
    const angle = yaw + offset;
    const desired = {
      x: target.x - Math.sin(angle) * desiredDistance,
      z: target.z + Math.cos(angle) * desiredDistance
    };
    const safe = resolveExplorationCameraPlanPosition(world, target, desired);
    const distance = Math.hypot(safe.x - target.x, safe.z - target.z);
    const score = distance - Math.abs(offset) * 0.16;
    if (score > best.score) best = { ...safe, distance, score };
  });
  return { x: best.x, z: best.z, distance: best.distance };
}

export function getExplorationGroundHeight(world: ExplorationCollisionWorld, point: { x: number; z: number }, previousHeight = 0) {
  const candidates = world.stairs.flatMap((stair) => {
    const projection = distanceToSegment(point, stair.start, stair.end);
    if (projection.distance > stair.width / 2 + 0.12) return [];
    return [{ height: stair.startHeight + (stair.endHeight - stair.startHeight) * projection.t, distance: projection.distance }];
  });
  if (candidates.length === 0) return 0;
  return candidates.sort((left, right) => (Math.abs(left.height - previousHeight) + left.distance) - (Math.abs(right.height - previousHeight) + right.distance))[0].height;
}

export function findNearestExplorationDoor(world: ExplorationCollisionWorld, point: { x: number; z: number }, maxDistance = 1.35) {
  const nearest = world.doors
    .map((door) => ({ ...door, distance: Math.hypot(door.center.x - point.x, door.center.z - point.z) }))
    .filter((door) => door.distance <= maxDistance)
    .sort((left, right) => left.distance - right.distance)[0];
  return nearest ?? null;
}

export function findNearestExplorationCabinet(
  furniture: Furniture[],
  structure: HouseStructure,
  point: { x: number; y?: number; z: number },
  yaw: number,
  pitch = 0,
  maxDistance = 1.75
) {
  const forward = {
    x: Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch)
  };
  const eyeY = (point.y ?? 0) + 1.62;
  return furniture
    .filter(isExplorationCabinet)
    .flatMap((item) => {
      const center = sceneFurnitureCenter(item, structure);
      const rotation = -(item.position.rotation || 0) * Math.PI / 180;
      const front = { x: Math.sin(rotation), z: Math.cos(rotation) };
      const interactionPoint = {
        x: center.x + front.x * (item.dimensions.depth / 200 + 0.18),
        y: Math.max(0.42, (item.render3d?.elevationMm ?? 0) * MM_TO_M + item.dimensions.height / 200),
        z: center.z + front.z * (item.dimensions.depth / 200 + 0.18)
      };
      const dx = interactionPoint.x - point.x;
      const dy = interactionPoint.y - eyeY;
      const dz = interactionPoint.z - point.z;
      const distance = Math.hypot(dx, dy, dz);
      if (distance > maxDistance || distance < 0.001) return [];
      const gazeAlignment = (dx * forward.x + dy * forward.y + dz * forward.z) / distance;
      if (gazeAlignment < 0.28) return [];
      const playerDistanceFromCenter = Math.max(0.001, Math.hypot(point.x - center.x, point.z - center.z));
      const frontApproach = ((point.x - center.x) * front.x + (point.z - center.z) * front.z) / playerDistanceFromCenter;
      const score = distance + (1 - gazeAlignment) * 0.72 + Math.max(0, 0.2 - frontApproach) * 0.36;
      return [{ item, interactionPoint, distance, gazeAlignment, score }];
    })
    .sort((left, right) => left.score - right.score)[0] ?? null;
}

export function findExplorationStairTransition(world: ExplorationCollisionWorld, point: { x: number; z: number }) {
  return world.stairs.flatMap((stair) => {
    if (!stair.connectedToFloorId) return [];
    const projection = distanceToSegment(point, stair.start, stair.end);
    if (projection.distance > stair.width / 2 + 0.08 || projection.t < STAIR_HANDOFF_T) return [];
    return [{ stair, score: projection.distance + (1 - projection.t) }];
  }).sort((left, right) => left.score - right.score)[0]?.stair ?? null;
}

export function getConnectedStairArrival(
  targetStructure: HouseStructure,
  sourceStair: ExplorationStairSurface
): { position: ExplorationPoint; stairId: string } | null {
  const target = targetStructure.stairs.find((stair) => stair.stairSystemId === sourceStair.stairSystemId && stair.id !== sourceStair.id)
    ?? targetStructure.stairs.find((stair) => stair.connectedToFloorId === sourceStair.connectedToFloorId);
  if (!target) return null;
  const start = explorationScenePoint(target.start, targetStructure);
  const end = explorationScenePoint(target.end, targetStructure);
  const localHeights = getFlightLocalEndpointHeights(target);
  const t = STAIR_HANDOFF_T;
  return {
    stairId: target.id,
    position: {
      ...interpolateSegment(start, end, t),
      y: (localHeights.startHeightMm + (localHeights.endHeightMm - localHeights.startHeightMm) * t) * MM_TO_M
    }
  };
}

function polygonCentroid(polygon: Array<{ x: number; z: number }>) {
  return polygon.reduce((center, point) => ({
    x: center.x + point.x / polygon.length,
    z: center.z + point.z / polygon.length
  }), { x: 0, z: 0 });
}

export function findNearestSafeExplorationPosition(
  world: ExplorationCollisionWorld,
  preferred: { x: number; z: number },
  radius = EXPLORATION_CHARACTER_RADIUS
): ExplorationPoint | null {
  if (isExplorationPositionSafe(world, preferred, radius)) return { ...preferred, y: getExplorationGroundHeight(world, preferred) };
  for (let ring = 1; ring <= 14; ring += 1) {
    const distance = ring * radius;
    const steps = Math.max(8, ring * 6);
    for (let index = 0; index < steps; index += 1) {
      const angle = (index / steps) * Math.PI * 2;
      const candidate = { x: preferred.x + Math.cos(angle) * distance, z: preferred.z + Math.sin(angle) * distance };
      if (isExplorationPositionSafe(world, candidate, radius)) return { ...candidate, y: getExplorationGroundHeight(world, candidate) };
    }
  }
  return null;
}

export function resolveExplorationSpawn(structure: HouseStructure, world: ExplorationCollisionWorld) {
  const preferredRoom = [...structure.rooms].sort((left, right) => {
    const score = (name: string) => /玄关|入口|门厅/.test(name) ? 0 : /客厅|起居/.test(name) ? 1 : /楼梯/.test(name) ? 3 : 2;
    return score(left.name) - score(right.name);
  })[0];
  const preferredPolygon = preferredRoom?.boundary.map((point) => explorationScenePoint(point, structure))
    ?? structure.outdoors[0]?.polygon.map((point) => explorationScenePoint(point, structure))
    ?? world.walkablePolygons[0];
  const preferred = preferredPolygon?.length ? polygonCentroid(preferredPolygon) : { x: 0, z: 0 };
  return findNearestSafeExplorationPosition(world, preferred) ?? { ...preferred, y: 0 };
}

export function getExplorationSpaceName(structure: HouseStructure, point: { x: number; z: number }) {
  const room = structure.rooms.find((candidate) => pointInPolygon(point, candidate.boundary.map((item) => explorationScenePoint(item, structure))));
  if (room) return room.name;
  const outdoor = structure.outdoors.find((candidate) => pointInPolygon(point, candidate.polygon.map((item) => explorationScenePoint(item, structure))));
  return outdoor?.name ?? "通行区域";
}
