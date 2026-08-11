import {
  buildExplorationCollisionWorld,
  explorationScenePoint,
  findNearestSafeExplorationPosition,
  isExplorationPositionSafe
} from "./exploration-mode.ts";
import type { Furniture, FixedCameraView, FloorId, HouseRoom, HouseStructure, MmPoint } from "../types/space.ts";

const MM_TO_M = 1 / 1000;
const DEFAULT_VIEWPORT = { width: 1280, height: 720, leftInset: 0, rightInset: 0, topInset: 0, bottomInset: 0, mobile: false };

export type CameraCompositionKind =
  | "wholeVilla"
  | "floorOverview"
  | "floorDirection"
  | "room"
  | "object"
  | "wallFront"
  | "wallLeft"
  | "wallRight"
  | "ceiling";

export type CameraViewport = {
  width: number;
  height: number;
  leftInset?: number;
  rightInset?: number;
  topInset?: number;
  bottomInset?: number;
  mobile?: boolean;
};

export type CameraCompositionBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export type CameraCompositionCandidate = {
  id: string;
  source: "authored" | "recommended" | "door" | "corner" | "edge" | "fallback";
  cameraPosition: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
  score: number;
  targetCoverage: number;
  occlusionCount: number;
  nearestObstacleDistance: number;
  safe: boolean;
  rejectionReasons: string[];
};

export type CameraOrbitConstraints = {
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  maxTargetOffset: number;
  collisionPadding: number;
};

export type CameraCompositionResult = {
  kind: CameraCompositionKind;
  cameraPosition: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
  distance: number;
  score: number;
  source: CameraCompositionCandidate["source"];
  fallbackLevel: 0 | 1 | 2 | 3 | 4;
  targetCoverage: number;
  occlusionIds: string[];
  safety: CameraOrbitConstraints;
  candidates: CameraCompositionCandidate[];
};

export type CameraCompositionRequest = {
  kind: CameraCompositionKind;
  structure?: HouseStructure;
  structuresByFloor?: Partial<Record<FloorId, HouseStructure>>;
  furniture?: Furniture[];
  roomId?: string;
  outdoorId?: string;
  objectId?: string;
  objectSubject?: {
    id: string;
    roomId?: string;
    center: { x: number; z: number };
    width: number;
    depth: number;
    height: number;
    elevation?: number;
    rotationDeg?: number;
    hostWallId?: string;
  };
  wallId?: string;
  direction?: "front" | "right" | "back" | "left";
  viewport?: CameraViewport;
  margin?: number;
  preferredView?: Pick<FixedCameraView, "cameraPosition" | "target"> & { fov?: number };
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function viewportMetrics(viewport?: CameraViewport) {
  const source = { ...DEFAULT_VIEWPORT, ...viewport };
  const width = Math.max(240, source.width - (source.leftInset ?? 0) - (source.rightInset ?? 0));
  const height = Math.max(240, source.height - (source.topInset ?? 0) - (source.bottomInset ?? 0));
  return { ...source, visibleWidth: width, visibleHeight: height, aspect: clamp(width / height, 0.52, 2.5) };
}

function emptyBounds(): CameraCompositionBounds {
  return { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
}

function includePoint(bounds: CameraCompositionBounds, point: { x: number; y?: number; z: number }) {
  bounds.minX = Math.min(bounds.minX, point.x);
  bounds.maxX = Math.max(bounds.maxX, point.x);
  bounds.minY = Math.min(bounds.minY, point.y ?? 0);
  bounds.maxY = Math.max(bounds.maxY, point.y ?? 0);
  bounds.minZ = Math.min(bounds.minZ, point.z);
  bounds.maxZ = Math.max(bounds.maxZ, point.z);
  return bounds;
}

function validBounds(bounds: CameraCompositionBounds) {
  return Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX) && Number.isFinite(bounds.minZ) && Number.isFinite(bounds.maxZ);
}

function boundsFromPoints(points: MmPoint[], structure: HouseStructure, minY = 0, maxY = 0): CameraCompositionBounds {
  const bounds = emptyBounds();
  points.forEach((point) => includePoint(bounds, { ...explorationScenePoint(point, structure), y: minY }));
  if (validBounds(bounds)) bounds.maxY = Math.max(bounds.maxY, maxY);
  return bounds;
}

function mergeBounds(bounds: CameraCompositionBounds, next: CameraCompositionBounds) {
  if (!validBounds(next)) return bounds;
  includePoint(bounds, { x: next.minX, y: next.minY, z: next.minZ });
  includePoint(bounds, { x: next.maxX, y: next.maxY, z: next.maxZ });
  return bounds;
}

export function getStructureCameraBounds(structure: HouseStructure, includeOutdoors = true): CameraCompositionBounds {
  const bounds = emptyBounds();
  structure.rooms.forEach((room) => mergeBounds(bounds, boundsFromPoints(room.boundary, structure, 0, (room.finishedCeilingHeightMm ?? structure.storyHeightMm ?? 2800) * MM_TO_M)));
  if (includeOutdoors) structure.outdoors.forEach((outdoor) => mergeBounds(bounds, boundsFromPoints(outdoor.polygon, structure, 0, 0.4)));
  structure.walls.forEach((wall) => {
    if (wall.kind === "arc") {
      const radius = wall.radius * MM_TO_M;
      const center = explorationScenePoint(wall.center, structure);
      includePoint(bounds, { x: center.x - radius, y: 0, z: center.z - radius });
      includePoint(bounds, { x: center.x + radius, y: wall.height * MM_TO_M, z: center.z + radius });
    } else {
      includePoint(bounds, { ...explorationScenePoint(wall.start, structure), y: 0 });
      includePoint(bounds, { ...explorationScenePoint(wall.end, structure), y: wall.height * MM_TO_M });
    }
  });
  if (!validBounds(bounds)) {
    const width = (structure.coordinateSystem?.width ?? 12000) * MM_TO_M;
    const depth = (structure.coordinateSystem?.height ?? 9000) * MM_TO_M;
    return { minX: -width / 2, maxX: width / 2, minY: 0, maxY: 2.8, minZ: -depth / 2, maxZ: depth / 2 };
  }
  return bounds;
}

const stackedFloorOrder: FloorId[] = ["B2", "B1", "1F", "2F"];

export function getWholeVillaCameraBounds(structuresByFloor: Partial<Record<FloorId, HouseStructure>>): CameraCompositionBounds {
  const bounds = emptyBounds();
  let elevation = 0;
  stackedFloorOrder.forEach((floorId) => {
    const structure = structuresByFloor[floorId];
    if (!structure) return;
    const next = getStructureCameraBounds(structure, false);
    mergeBounds(bounds, { ...next, minY: next.minY + elevation, maxY: next.maxY + elevation });
    elevation += (structure.storyHeightMm ?? Math.max(...structure.walls.map((wall) => wall.height || 2800), 2800)) * MM_TO_M;
  });
  const yard = structuresByFloor.YARD;
  if (yard) {
    const yardElevation = stackedFloorOrder.slice(0, 2).reduce((sum, floorId) => sum + ((structuresByFloor[floorId]?.storyHeightMm ?? 2800) * MM_TO_M), 0);
    const yardBounds = getStructureCameraBounds(yard, true);
    mergeBounds(bounds, { ...yardBounds, minY: yardBounds.minY + yardElevation, maxY: yardBounds.maxY + yardElevation });
  }
  return validBounds(bounds) ? bounds : { minX: -6, maxX: 6, minY: 0, maxY: 11.2, minZ: -4.5, maxZ: 4.5 };
}

function boundsCenter(bounds: CameraCompositionBounds) {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2
  };
}

function boundsSpan(bounds: CameraCompositionBounds) {
  return {
    x: Math.max(0.1, bounds.maxX - bounds.minX),
    y: Math.max(0.1, bounds.maxY - bounds.minY),
    z: Math.max(0.1, bounds.maxZ - bounds.minZ)
  };
}

function distance3d(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function normalize2d(vector: { x: number; z: number }) {
  const length = Math.max(0.0001, Math.hypot(vector.x, vector.z));
  return { x: vector.x / length, z: vector.z / length };
}

function targetCoverage(bounds: CameraCompositionBounds, cameraPosition: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }, fov: number, aspect: number) {
  const span = boundsSpan(bounds);
  const distance = Math.max(0.2, distance3d(cameraPosition, target));
  const verticalHalf = distance * Math.tan(fov * Math.PI / 360);
  const horizontalHalf = verticalHalf * aspect;
  return Math.max(span.y / Math.max(0.1, verticalHalf * 2), Math.max(span.x, span.z) / Math.max(0.1, horizontalHalf * 2));
}

function fitDistance(bounds: CameraCompositionBounds, fov: number, aspect: number, margin: number) {
  const span = boundsSpan(bounds);
  // Angled overview cameras project both plan axes into the image. Fitting only
  // max(width, depth) clips opposite corners; use the plan diagonal and the
  // depth contribution to projected height instead.
  const horizontalSpan = Math.hypot(span.x, span.z);
  const verticalSpan = span.y + Math.min(span.x, span.z) * 0.62;
  const verticalDistance = verticalSpan / 2 / Math.tan(fov * Math.PI / 360);
  const horizontalDistance = horizontalSpan / 2 / Math.tan(fov * Math.PI / 360) / aspect;
  // Leave a little extra breathing room for the perspective projection and
  // the viewport area lost to the editor chrome. The bounds are plan-space
  // bounds, while the renderer projects them along an angled orbit.
  return Math.max(verticalDistance, horizontalDistance, 1.2) * (1 + margin) * 1.14;
}

function orbitConstraints(distance: number, subjectRadius: number, kind: CameraCompositionKind): CameraOrbitConstraints {
  const closeup = kind === "object" || kind.startsWith("wall");
  const requestedMinDistance = Math.max(closeup ? 0.32 : 0.58, subjectRadius * (closeup ? 0.62 : 0.4));
  return {
    minDistance: Math.min(Math.max(0.28, distance * 0.82), requestedMinDistance),
    maxDistance: Math.max(distance * (closeup ? 2.2 : 2.5), subjectRadius * 2.4, 2.4),
    minPolarAngle: kind === "ceiling" ? Math.PI * 0.05 : Math.PI * 0.16,
    maxPolarAngle: kind === "ceiling" ? Math.PI * 0.92 : Math.PI * 0.72,
    maxTargetOffset: Math.max(0.4, subjectRadius * 0.35),
    collisionPadding: closeup ? 0.12 : 0.18
  };
}

function composeOverview(request: CameraCompositionRequest): CameraCompositionResult {
  const viewport = viewportMetrics(request.viewport);
  const bounds = request.kind === "wholeVilla"
    ? getWholeVillaCameraBounds(request.structuresByFloor ?? {})
    : getStructureCameraBounds(request.structure!, true);
  const center = boundsCenter(bounds);
  const span = boundsSpan(bounds);
  const margin = clamp(request.margin ?? (viewport.mobile ? 0.22 : 0.16), 0.08, 0.82);
  const fov = request.kind === "wholeVilla" ? (viewport.mobile ? 50 : 44) : viewport.mobile ? 48 : 42;
  const distance = fitDistance(bounds, fov, viewport.aspect, margin);
  const directionName = request.direction ?? "front";
  const directions: Record<string, { x: number; y: number; z: number }> = {
    overview: { x: 0.58, y: request.kind === "wholeVilla" ? 0.88 : 0.78, z: 0.66 },
    front: { x: 0, y: 0.42, z: 1 },
    right: { x: 1, y: 0.42, z: 0 },
    back: { x: 0, y: 0.42, z: -1 },
    left: { x: -1, y: 0.42, z: 0 }
  };
  const rawDirection = request.kind === "floorDirection" || (request.kind === "wholeVilla" && request.direction)
    ? directions[directionName]
    : directions.overview;
  const directionLength = Math.hypot(rawDirection.x, rawDirection.y, rawDirection.z);
  const direction = { x: rawDirection.x / directionLength, y: rawDirection.y / directionLength, z: rawDirection.z / directionLength };
  const cameraPosition = {
    x: center.x + direction.x * distance,
    y: center.y + direction.y * distance,
    z: center.z + direction.z * distance
  };
  const coverage = targetCoverage(bounds, cameraPosition, center, fov, viewport.aspect);
  const radius = Math.hypot(span.x, span.y, span.z) / 2;
  const candidate: CameraCompositionCandidate = {
    id: `${request.kind}-${directionName}`,
    source: "recommended",
    cameraPosition,
    target: center,
    fov,
    score: 1000 - Math.abs(0.72 - coverage) * 180,
    targetCoverage: coverage,
    occlusionCount: 0,
    nearestObstacleDistance: distance,
    safe: true,
    rejectionReasons: []
  };
  return {
    kind: request.kind,
    cameraPosition,
    target: center,
    fov,
    distance,
    score: candidate.score,
    source: candidate.source,
    fallbackLevel: 0,
    targetCoverage: coverage,
    occlusionIds: [],
    safety: orbitConstraints(distance, radius, request.kind),
    candidates: [candidate]
  };
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
  const t = lengthSquared <= 0.000001 ? 0 : clamp(((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared, 0, 1);
  return Math.hypot(point.x - (start.x + dx * t), point.z - (start.z + dz * t));
}

function orientation(a: { x: number; z: number }, b: { x: number; z: number }, c: { x: number; z: number }) {
  return (b.z - a.z) * (c.x - b.x) - (b.x - a.x) * (c.z - b.z);
}

function segmentsIntersect(a: { x: number; z: number }, b: { x: number; z: number }, c: { x: number; z: number }, d: { x: number; z: number }) {
  return orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0;
}

function lineHitsRotatedBox(start: { x: number; z: number }, end: { x: number; z: number }, box: { center: { x: number; z: number }; halfWidth: number; halfDepth: number; rotation: number }) {
  const transform = (point: { x: number; z: number }) => {
    const dx = point.x - box.center.x;
    const dz = point.z - box.center.z;
    const cosine = Math.cos(-box.rotation);
    const sine = Math.sin(-box.rotation);
    return { x: dx * cosine - dz * sine, z: dx * sine + dz * cosine };
  };
  const a = transform(start);
  const b = transform(end);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  let minT = 0;
  let maxT = 1;
  for (const [origin, delta, min, max] of [[a.x, dx, -box.halfWidth, box.halfWidth], [a.z, dz, -box.halfDepth, box.halfDepth]] as const) {
    if (Math.abs(delta) < 0.000001) {
      if (origin < min || origin > max) return false;
      continue;
    }
    const first = (min - origin) / delta;
    const second = (max - origin) / delta;
    minT = Math.max(minT, Math.min(first, second));
    maxT = Math.min(maxT, Math.max(first, second));
    if (minT > maxT) return false;
  }
  return minT < 0.86 && maxT > 0.04;
}

function createOpenWorld(structure: HouseStructure, furniture: Furniture[]) {
  return buildExplorationCollisionWorld({
    structure,
    furniture,
    doorStates: Object.fromEntries(structure.doors.map((door) => [door.id, { open: true, currentAngle: 1 }]))
  });
}

function cameraSubjectBounds(room: HouseRoom, structure: HouseStructure, furniture: Furniture[]) {
  const height = (room.finishedCeilingHeightMm ?? structure.storyHeightMm ?? 2800) * MM_TO_M;
  const bounds = boundsFromPoints(room.boundary, structure, 0, height);
  furniture.filter((item) => item.roomId === room.id && item.visible !== false && !item.hidden).forEach((item) => {
    const center = furnitureSceneCenter(item, structure);
    const halfWidth = item.dimensions.width / 200;
    const halfDepth = item.dimensions.depth / 200;
    includePoint(bounds, { x: center.x - halfWidth, y: 0, z: center.z - halfDepth });
    includePoint(bounds, { x: center.x + halfWidth, y: item.dimensions.height / 100, z: center.z + halfDepth });
  });
  return bounds;
}

function furnitureSceneCenter(item: Furniture, structure: HouseStructure) {
  const width = structure.coordinateSystem?.width ?? 12000;
  const height = structure.coordinateSystem?.height ?? 9000;
  return {
    x: ((item.position.x / 100) * width - width / 2) * MM_TO_M,
    z: ((item.position.y / 100) * height - height / 2) * MM_TO_M
  };
}

function candidateOcclusions(
  world: ReturnType<typeof createOpenWorld>,
  position: { x: number; z: number },
  target: { x: number; z: number },
  ignoredIds: Set<string>
) {
  const ids: string[] = [];
  world.segments.forEach((segment) => {
    if (!ignoredIds.has(segment.id) && segmentsIntersect(position, target, segment.start, segment.end)) ids.push(segment.id);
  });
  world.boxes.forEach((box) => {
    if (!ignoredIds.has(box.id) && lineHitsRotatedBox(position, target, box)) ids.push(box.id);
  });
  return ids;
}

function scoreCandidate(input: {
  id: string;
  source: CameraCompositionCandidate["source"];
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
  bounds: CameraCompositionBounds;
  polygon: Array<{ x: number; z: number }>;
  world: ReturnType<typeof createOpenWorld>;
  aspect: number;
  ignoredIds?: Set<string>;
  allowOutside?: boolean;
}) {
  const reasons: string[] = [];
  const planPosition = { x: input.position.x, z: input.position.z };
  const insideSpace = pointInPolygon(planPosition, input.polygon);
  const safe = isExplorationPositionSafe(input.world, planPosition, 0.14);
  if (!input.allowOutside && !insideSpace) reasons.push("相机不在目标空间内");
  if (!safe && !input.allowOutside) reasons.push("相机位于墙体、柜体或家具安全区内");
  const nearestObstacle = Math.min(
    ...input.world.segments.map((segment) => Math.max(0, distanceToSegment(planPosition, segment.start, segment.end) - segment.halfThickness)),
    99
  );
  if (nearestObstacle < 0.18) reasons.push("相机离墙过近");
  const occlusions = candidateOcclusions(input.world, planPosition, input.target, input.ignoredIds ?? new Set());
  if (occlusions.length) reasons.push("视线存在墙体或大型家具遮挡");
  const coverage = targetCoverage(input.bounds, input.position, input.target, input.fov, input.aspect);
  if (coverage > 0.96) reasons.push("目标可能被裁切");
  if (coverage < 0.24) reasons.push("目标占画面过小");
  const distance = distance3d(input.position, input.target);
  let score = 1000;
  if (!input.allowOutside && !insideSpace) score -= 850;
  if (!safe && !input.allowOutside) score -= 900;
  score -= occlusions.length * 260;
  score -= Math.max(0, 0.32 - nearestObstacle) * 520;
  score -= Math.abs(0.68 - clamp(coverage, 0, 1.5)) * 210;
  score -= Math.max(0, coverage - 0.92) * 740;
  score -= Math.max(0, 0.24 - coverage) * 360;
  score -= Math.max(0, input.fov - 62) * 14;
  score -= Math.max(0, 0.9 - input.position.y) * 120;
  score -= Math.max(0, input.position.y - 2.35) * 45;
  score += input.source === "door" ? 30 : input.source === "corner" ? 22 : input.source === "authored" ? 12 : 0;
  return {
    candidate: {
      id: input.id,
      source: input.source,
      cameraPosition: input.position,
      target: input.target,
      fov: input.fov,
      score,
      targetCoverage: coverage,
      occlusionCount: occlusions.length,
      nearestObstacleDistance: nearestObstacle,
      safe: reasons.length === 0,
      rejectionReasons: reasons
    } satisfies CameraCompositionCandidate,
    occlusions,
    distance
  };
}

function resolveSpace(request: CameraCompositionRequest) {
  const structure = request.structure!;
  const room = request.roomId ? structure.rooms.find((candidate) => candidate.id === request.roomId) : undefined;
  const outdoor = request.outdoorId ? structure.outdoors.find((candidate) => candidate.id === request.outdoorId) : undefined;
  const points = room?.boundary ?? outdoor?.polygon ?? [];
  return { room, outdoor, points, polygon: points.map((point) => explorationScenePoint(point, structure)) };
}

function composeRoom(request: CameraCompositionRequest): CameraCompositionResult {
  const structure = request.structure!;
  const furniture = request.furniture ?? [];
  const viewport = viewportMetrics(request.viewport);
  const { room, points, polygon } = resolveSpace(request);
  if (!points.length) return composeOverview({ ...request, kind: "floorOverview" });
  const bounds = room ? cameraSubjectBounds(room, structure, furniture) : boundsFromPoints(points, structure, 0, 1.2);
  const center = boundsCenter(bounds);
  const span = boundsSpan(bounds);
  const target = { x: center.x, y: room ? clamp(span.y * 0.34, 0.72, 1.15) : 0.72, z: center.z };
  const world = createOpenWorld(structure, furniture);
  const inset = clamp(Math.min(span.x, span.z) * 0.18, 0.32, 0.72);
  const candidates: Array<{ id: string; source: CameraCompositionCandidate["source"]; point: { x: number; z: number }; preferredFov?: number }> = [];
  if (request.preferredView) candidates.push({ id: "authored", source: "authored", point: request.preferredView.cameraPosition, preferredFov: request.preferredView.fov });
  if (room) {
    structure.doors.filter((door) => room.sourceWallIds.includes(door.hostId)).forEach((door, index) => {
      const host = structure.walls.find((wall) => wall.id === door.hostId && wall.kind === "straight") ?? structure.partitions.find((partition) => partition.id === door.hostId);
      if (!host || !("start" in host)) return;
      const start = explorationScenePoint(host.start, structure);
      const end = explorationScenePoint(host.end, structure);
      const doorCenter = { x: start.x + (end.x - start.x) * door.positionOnWall, z: start.z + (end.z - start.z) * door.positionOnWall };
      const inward = normalize2d({ x: center.x - doorCenter.x, z: center.z - doorCenter.z });
      candidates.push({ id: `door-${index}`, source: "door", point: { x: doorCenter.x + inward.x * Math.max(0.58, inset), z: doorCenter.z + inward.z * Math.max(0.58, inset) } });
    });
  }
  polygon.forEach((corner, index) => {
    const inward = normalize2d({ x: center.x - corner.x, z: center.z - corner.z });
    candidates.push({ id: `corner-${index}`, source: "corner", point: { x: corner.x + inward.x * inset, z: corner.z + inward.z * inset } });
    const next = polygon[(index + 1) % polygon.length];
    const edge = { x: (corner.x + next.x) / 2, z: (corner.z + next.z) / 2 };
    const edgeInward = normalize2d({ x: center.x - edge.x, z: center.z - edge.z });
    candidates.push({ id: `edge-${index}`, source: "edge", point: { x: edge.x + edgeInward.x * inset, z: edge.z + edgeInward.z * inset } });
  });
  const scored = candidates.map((candidate) => {
    const distance = Math.max(0.5, Math.hypot(candidate.point.x - target.x, candidate.point.z - target.z));
    const desiredFov = clamp(2 * Math.atan((Math.hypot(span.x, span.z) * 0.46) / distance / Math.max(0.62, viewport.aspect)) * 180 / Math.PI, viewport.mobile ? 48 : 42, viewport.mobile ? 66 : 62);
    return scoreCandidate({
      id: candidate.id,
      source: candidate.source,
      position: { x: candidate.point.x, y: room && /楼梯/.test(room.name) ? 1.7 : room && /卫生间|洗衣/.test(room.name) ? 1.48 : 1.58, z: candidate.point.z },
      target,
      fov: candidate.preferredFov ?? desiredFov,
      bounds,
      polygon,
      world,
      aspect: viewport.aspect
    });
  }).sort((a, b) => b.candidate.score - a.candidate.score);
  let best = scored[0];
  let fallbackLevel: CameraCompositionResult["fallbackLevel"] = best?.candidate.safe ? 0 : 1;
  if (!best || best.candidate.score < 180) {
    const nearestSafe = findNearestSafeExplorationPosition(world, { x: center.x - Math.min(0.6, span.x * 0.15), z: center.z - Math.min(0.6, span.z * 0.15) });
    if (nearestSafe) {
      best = scoreCandidate({
        id: "fallback-safe-angled",
        source: "fallback",
        position: { x: nearestSafe.x, y: clamp(span.y * 0.72, 1.85, 2.45), z: nearestSafe.z },
        target: { ...target, y: 0.72 },
        fov: viewport.mobile ? 62 : 56,
        bounds,
        polygon,
        world,
        aspect: viewport.aspect
      });
      fallbackLevel = 3;
    }
  }
  if (!best) return composeOverview({ ...request, kind: "floorOverview" });
  const subjectRadius = Math.hypot(span.x, span.y, span.z) / 2;
  return {
    kind: request.kind,
    cameraPosition: best.candidate.cameraPosition,
    target: best.candidate.target,
    fov: best.candidate.fov,
    distance: best.distance,
    score: best.candidate.score,
    source: best.candidate.source,
    fallbackLevel,
    targetCoverage: best.candidate.targetCoverage,
    occlusionIds: best.occlusions,
    safety: orbitConstraints(best.distance, subjectRadius, request.kind),
    candidates: scored.map((entry) => entry.candidate)
  };
}

function composeObject(request: CameraCompositionRequest): CameraCompositionResult {
  const structure = request.structure!;
  const furniture = request.furniture ?? [];
  const item = furniture.find((candidate) => candidate.id === request.objectId);
  const subject = request.objectSubject;
  if (!item && !subject) return composeRoom({ ...request, kind: "room", roomId: request.roomId });
  const center = subject?.center ?? furnitureSceneCenter(item!, structure);
  const width = Math.max(0.08, subject?.width ?? item!.dimensions.width / 100);
  const depth = Math.max(0.08, subject?.depth ?? item!.dimensions.depth / 100);
  const height = Math.max(0.08, subject?.height ?? item!.dimensions.height / 100);
  const elevation = subject?.elevation ?? (item!.render3d?.elevationMm ?? 0) * MM_TO_M;
  const target = { x: center.x, y: elevation + height * 0.52, z: center.z };
  const bounds = { minX: center.x - width / 2, maxX: center.x + width / 2, minY: elevation, maxY: elevation + height, minZ: center.z - depth / 2, maxZ: center.z + depth / 2 };
  const roomId = subject?.roomId ?? item!.roomId;
  const room = structure.rooms.find((candidate) => candidate.id === roomId)
    ?? structure.rooms.find((candidate) => candidate.sourceWallIds.includes(subject?.hostWallId ?? ""));
  const polygon = (room?.boundary ?? []).map((point) => explorationScenePoint(point, structure));
  if (!polygon.length) return composeOverview({ ...request, kind: "floorOverview" });
  const world = createOpenWorld(structure, furniture);
  const viewport = viewportMetrics(request.viewport);
  const radius = Math.max(width, depth, height) / 2;
  const fov = viewport.mobile ? 54 : 46;
  const desiredDistance = clamp(radius / Math.tan(fov * Math.PI / 360) * 1.45, 1.05, 5.8);
  const angle = (subject?.rotationDeg ?? item!.position.rotation ?? 0) * Math.PI / 180;
  const directions = [
    { x: Math.sin(angle), z: Math.cos(angle) },
    { x: -Math.sin(angle), z: -Math.cos(angle) },
    { x: Math.sin(angle + Math.PI / 4), z: Math.cos(angle + Math.PI / 4) },
    { x: Math.sin(angle - Math.PI / 4), z: Math.cos(angle - Math.PI / 4) },
    { x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }
  ];
  const hostWallId = subject?.hostWallId ?? item!.hostWallId;
  const host = hostWallId ? structure.walls.find((wall) => wall.id === hostWallId && wall.kind === "straight") : undefined;
  if (host?.kind === "straight") {
    const start = explorationScenePoint(host.start, structure);
    const end = explorationScenePoint(host.end, structure);
    const normal = normalize2d({ x: -(end.z - start.z), z: end.x - start.x });
    directions.unshift(normal, { x: -normal.x, z: -normal.z });
  }
  const ignoredIds = new Set([subject?.id ?? item!.id]);
  const scored = directions.map((direction, index) => {
    const desired = { x: center.x + direction.x * desiredDistance, z: center.z + direction.z * desiredDistance };
    const safe = isExplorationPositionSafe(world, desired, 0.12) ? desired : findNearestSafeExplorationPosition(world, desired) ?? desired;
    return scoreCandidate({
      id: `object-${index}`,
      source: index < 2 ? "recommended" : "corner",
      position: { x: safe.x, y: clamp(target.y + Math.max(0.18, height * 0.12), 1.05, 2.35), z: safe.z },
      target,
      fov,
      bounds,
      polygon,
      world,
      aspect: viewport.aspect,
      ignoredIds
    });
  }).sort((a, b) => b.candidate.score - a.candidate.score);
  const best = scored[0];
  if (!best) return composeRoom({ ...request, kind: "room", roomId });
  return {
    kind: "object",
    cameraPosition: best.candidate.cameraPosition,
    target,
    fov,
    distance: best.distance,
    score: best.candidate.score,
    source: best.candidate.source,
    fallbackLevel: best.candidate.safe ? 0 : 2,
    targetCoverage: best.candidate.targetCoverage,
    occlusionIds: best.occlusions,
    safety: orbitConstraints(best.distance, radius, "object"),
    candidates: scored.map((entry) => entry.candidate)
  };
}

function composeWall(request: CameraCompositionRequest): CameraCompositionResult {
  const structure = request.structure!;
  const wall = structure.walls.find((candidate) => candidate.id === request.wallId && candidate.kind === "straight");
  if (!wall || wall.kind !== "straight") return composeOverview({ ...request, kind: "floorOverview" });
  const start = explorationScenePoint(wall.start, structure);
  const end = explorationScenePoint(wall.end, structure);
  const length = Math.max(0.1, Math.hypot(end.x - start.x, end.z - start.z));
  const tangent = normalize2d({ x: end.x - start.x, z: end.z - start.z });
  const normal = { x: -tangent.z, z: tangent.x };
  const center = { x: (start.x + end.x) / 2, y: wall.height * MM_TO_M / 2, z: (start.z + end.z) / 2 };
  const bounds = { minX: center.x - length / 2, maxX: center.x + length / 2, minY: 0, maxY: wall.height * MM_TO_M, minZ: center.z - 0.04, maxZ: center.z + 0.04 };
  const viewport = viewportMetrics(request.viewport);
  const fov = viewport.mobile ? 52 : 46;
  const horizontalFov = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * viewport.aspect);
  const distance = clamp(Math.max(length / 2 / Math.tan(horizontalFov / 2), wall.height * MM_TO_M / 2 / Math.tan(fov * Math.PI / 360)) * 1.16, 1.1, 7.2);
  const world = createOpenWorld(structure, request.furniture ?? []);
  const linkedRooms = structure.rooms.filter((room) => room.sourceWallIds.includes(wall.id));
  const polygons = linkedRooms.map((room) => room.boundary.map((point) => explorationScenePoint(point, structure)));
  const lateral = request.kind === "wallLeft" ? -Math.min(0.9, length * 0.18) : request.kind === "wallRight" ? Math.min(0.9, length * 0.18) : 0;
  const directions = [normal, { x: -normal.x, z: -normal.z }];
  const scored = directions.map((direction, index) => {
    const position = { x: center.x + direction.x * distance + tangent.x * lateral, y: center.y, z: center.z + direction.z * distance + tangent.z * lateral };
    const polygon = polygons.find((candidate) => pointInPolygon(position, candidate)) ?? polygons[0] ?? [start, end, center];
    return scoreCandidate({
      id: `wall-${index}`,
      source: "recommended",
      position,
      target: center,
      fov,
      bounds,
      polygon,
      world,
      aspect: viewport.aspect,
      ignoredIds: new Set([wall.id])
    });
  }).sort((a, b) => b.candidate.score - a.candidate.score);
  const best = scored[0];
  return {
    kind: request.kind,
    cameraPosition: best.candidate.cameraPosition,
    target: center,
    fov,
    distance: best.distance,
    score: best.candidate.score,
    source: best.candidate.source,
    fallbackLevel: best.candidate.safe ? 0 : 2,
    targetCoverage: best.candidate.targetCoverage,
    occlusionIds: best.occlusions,
    safety: orbitConstraints(best.distance, Math.max(length, wall.height * MM_TO_M) / 2, request.kind),
    candidates: scored.map((entry) => entry.candidate)
  };
}

function composeCeiling(request: CameraCompositionRequest): CameraCompositionResult {
  const structure = request.structure!;
  const requestedRoom = request.roomId ? structure.rooms.find((room) => room.id === request.roomId) : undefined;
  const room = requestedRoom ?? [...structure.rooms].sort((a, b) => b.area - a.area)[0];
  if (!room) return composeOverview({ ...request, kind: "floorOverview" });
  const bounds = boundsFromPoints(room.boundary, structure, 0, (room.finishedCeilingHeightMm ?? structure.storyHeightMm ?? 2800) * MM_TO_M);
  const center = boundsCenter(bounds);
  const span = boundsSpan(bounds);
  const ceilingHeight = bounds.maxY;
  const world = createOpenWorld(structure, request.furniture ?? []);
  const desired = { x: center.x - Math.min(0.35, span.x * 0.08), z: center.z - Math.min(0.35, span.z * 0.08) };
  const safe = isExplorationPositionSafe(world, desired, 0.12) ? desired : findNearestSafeExplorationPosition(world, desired) ?? desired;
  const cameraPosition = { x: safe.x, y: clamp(ceilingHeight - Math.max(1.25, Math.min(span.x, span.z) * 0.42), 0.9, 1.65), z: safe.z };
  const target = { x: center.x, y: ceilingHeight - 0.04, z: center.z };
  const viewport = viewportMetrics(request.viewport);
  const fov = viewport.mobile ? 62 : 56;
  const distance = distance3d(cameraPosition, target);
  const coverage = targetCoverage({ ...bounds, minY: ceilingHeight - 0.02 }, cameraPosition, target, fov, viewport.aspect);
  const candidate: CameraCompositionCandidate = {
    id: "ceiling-room",
    source: "recommended",
    cameraPosition,
    target,
    fov,
    score: 1000 - Math.abs(0.72 - coverage) * 200,
    targetCoverage: coverage,
    occlusionCount: 0,
    nearestObstacleDistance: 0.5,
    safe: true,
    rejectionReasons: []
  };
  return {
    kind: "ceiling",
    cameraPosition,
    target,
    fov,
    distance,
    score: candidate.score,
    source: candidate.source,
    fallbackLevel: 0,
    targetCoverage: coverage,
    occlusionIds: [],
    safety: orbitConstraints(distance, Math.hypot(span.x, span.z) / 2, "ceiling"),
    candidates: [candidate]
  };
}

export function composeCameraView(request: CameraCompositionRequest): CameraCompositionResult {
  if (request.kind === "wholeVilla" || request.kind === "floorOverview" || request.kind === "floorDirection") return composeOverview(request);
  if (request.kind === "room") return composeRoom(request);
  if (request.kind === "object") return composeObject(request);
  if (request.kind === "wallFront" || request.kind === "wallLeft" || request.kind === "wallRight") return composeWall(request);
  return composeCeiling(request);
}

export function compositionToFixedView(input: {
  id: string;
  name: string;
  floor: FloorId;
  composition: CameraCompositionResult;
  description?: string;
  targetArea?: FixedCameraView["targetArea"];
}): FixedCameraView {
  return {
    id: input.id,
    name: input.name,
    floor: input.floor,
    cameraPosition: input.composition.cameraPosition,
    target: input.composition.target,
    fov: input.composition.fov,
    mode: "perspective",
    description: input.description,
    targetArea: input.targetArea
  };
}
