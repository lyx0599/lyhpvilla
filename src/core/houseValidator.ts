import { createFloorCoordinateSystem, generateRoomsFromWalls, getArcWallEndpoints, getDistance, getLineLength, getPolygonArea, projectPointToSegment, SITE_PLAN_MAX_Y_MM, SITE_PLAN_MIN_Y_MM, STRUCTURE_HEIGHT_MM, STRUCTURE_WIDTH_MM } from "@/lib/house-geometry";
import { createManualVerificationMeta } from "../../lib/dimension-verification.ts";
import type { FloorId, Furniture, HousePartition, HouseRoom, HouseStair, HouseStructure, HouseWall, MmPoint, StraightHouseWall } from "@/types/space";

export type HouseValidationIssueType = "wall" | "door" | "window" | "room" | "stair" | "column" | "outdoor" | "furniture" | "coordinate";

export type HouseValidationIssue = {
  type: HouseValidationIssueType;
  id: string;
  message: string;
  ruleId?: string;
  category?: "blocking" | "geometry" | "relation" | "metadata";
  severity?: "blocking" | "error" | "warning" | "info";
  suggestion?: string;
  canAutoFix?: boolean;
  rootCauseKey?: string;
};

export type HouseValidationResult = {
  valid: boolean;
  errors: HouseValidationIssue[];
  warnings: HouseValidationIssue[];
  infos: HouseValidationIssue[];
};

export type HouseAutoRepairResult = {
  structure: HouseStructure;
  furniture: Furniture[];
  repairs: string[];
};

const POINT_EPSILON_MM = 180;
const REPAIR_SNAP_MM = 420;
const ORTHOGONAL_SNAP_MM = 260;
const ORTHOGONAL_RATIO = 0.16;
const FOOTPRINT_BOUNDARY_TOLERANCE_MM = 35;
const FOOTPRINT_EDGE_SAMPLE_MM = 180;
const PLACEMENT_REPAIR_STEP_MM = 180;
const PLACEMENT_REPAIR_MAX_RADIUS_MM = 1440;
const PROJECTED_CONNECTION_WALL_SUFFIXES = new Set(["016", "007", "006", "009", "004", "014", "015", "008", "001", "005", "010", "012", "022"]);
const FORCED_HORIZONTAL_WALL_SUFFIXES = new Set(["012", "022"]);
const MODULE_SERVICE_KEYS = ["water", "drainage", "power", "exhaust"] as const;
const STAIR_STACK_ROOM_BOUNDARY: MmPoint[] = [
  { x: 950, y: 3050 },
  { x: 4146, y: 3050 },
  { x: 4146, y: 5150 },
  { x: 950, y: 5150 }
];
const STAIR_STACK_SOURCE_WALL_IDS = {
  B2: ["W-B2-007", "W-B2-008", "W-B2-009"],
  B1: ["W-B1-005", "W-B1-007", "W-B1-012"],
  "1F": ["W-1F-010", "W-1F-012", "W-1F-016"],
  "2F": ["W-2F-010", "W-2F-012", "W-2F-007"]
} as const satisfies Partial<Record<FloorId, readonly string[]>>;
const STAIR_STACK_ROOM_IDS = {
  B2: "ROOM-B2-002",
  B1: "ROOM-B1-005",
  "1F": "ROOM-1F-006",
  "2F": "ROOM-2F-008"
} as const satisfies Partial<Record<FloorId, string>>;
const STAIR_STACK_ROOM_NUMBERS = {
  B2: "R-B2-002",
  B1: "R-B1-005",
  "1F": "R-1F-006",
  "2F": "R-2F-008"
} as const satisfies Partial<Record<FloorId, string>>;

type GroundPolygon = {
  id: string;
  polygon: MmPoint[];
  type: "room" | "outdoor";
};

type Footprint = {
  center: MmPoint;
  corners: MmPoint[];
};

type StairStackLane = "upper" | "lower";

type StairStackConfig = {
  id: string;
  name: string;
  lane: StairStackLane;
  direction: HouseStair["direction"];
  height: number;
  stepCount: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidMmPoint(point: Partial<MmPoint> | undefined) {
  if (!point) return false;
  return isFiniteNumber(point.x) && isFiniteNumber(point.y);
}

function isPointInsideFloor(point: MmPoint) {
  return point.x >= 0 && point.x <= STRUCTURE_WIDTH_MM && point.y >= 0 && point.y <= STRUCTURE_HEIGHT_MM;
}

function isPointInsideOutdoorBounds(floorId: FloorId, point: MmPoint) {
  if (floorId !== "1F" && floorId !== "YARD") return isPointInsideFloor(point);
  return point.x >= 0 && point.x <= STRUCTURE_WIDTH_MM && point.y >= SITE_PLAN_MIN_Y_MM && point.y <= SITE_PLAN_MAX_Y_MM;
}

function isValidPercentPoint(point: { x?: number; y?: number } | undefined) {
  if (!point || !isFiniteNumber(point.x) || !isFiniteNumber(point.y)) return false;
  return point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100;
}

function isValidFurniturePercentPoint(floorId: FloorId, point: { x?: number; y?: number } | undefined) {
  if (!point || !isFiniteNumber(point.x) || !isFiniteNumber(point.y)) return false;
  const usesSitePlan = floorId === "1F" || floorId === "YARD";
  const minY = usesSitePlan ? (SITE_PLAN_MIN_Y_MM / STRUCTURE_HEIGHT_MM) * 100 : 0;
  const maxY = usesSitePlan ? (SITE_PLAN_MAX_Y_MM / STRUCTURE_HEIGHT_MM) * 100 : 100;
  return point.x >= 0 && point.x <= 100 && point.y >= minY && point.y <= maxY;
}

function samePoint(a: MmPoint, b: MmPoint, tolerance = POINT_EPSILON_MM) {
  return getDistance(a, b) <= tolerance;
}

function getStraightWalls(walls: HouseWall[]) {
  return walls.filter((wall): wall is StraightHouseWall => wall.kind === "straight");
}

function getWallSuffix(wallId: string) {
  return wallId.split("-").at(-1) ?? wallId;
}

function allowsProjectedConnection(wallId: string) {
  return PROJECTED_CONNECTION_WALL_SUFFIXES.has(getWallSuffix(wallId));
}

function getWallEndpointPair(wall: HouseWall) {
  if (wall.kind === "arc") return getArcWallEndpoints(wall);
  return { start: wall.start, end: wall.end };
}

function countConnections(point: MmPoint, walls: HouseWall[], selfId: string) {
  return walls.filter((wall) => {
    if (wall.id === selfId) return false;
    const endpoints = getWallEndpointPair(wall);
    if (samePoint(point, endpoints.start) || samePoint(point, endpoints.end)) return true;
    return wall.kind === "straight" && allowsProjectedConnection(selfId) && projectPointToSegment(point, wall.start, wall.end).distance <= POINT_EPSILON_MM;
  }).length;
}

function lineOrientation(a: MmPoint, b: MmPoint, c: MmPoint) {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function pointOnSegment(a: MmPoint, b: MmPoint, c: MmPoint) {
  return c.x <= Math.max(a.x, b.x) && c.x >= Math.min(a.x, b.x) && c.y <= Math.max(a.y, b.y) && c.y >= Math.min(a.y, b.y);
}

function segmentsIntersect(a1: MmPoint, a2: MmPoint, b1: MmPoint, b2: MmPoint) {
  const o1 = lineOrientation(a1, a2, b1);
  const o2 = lineOrientation(a1, a2, b2);
  const o3 = lineOrientation(b1, b2, a1);
  const o4 = lineOrientation(b1, b2, a2);

  if (o1 === 0 && pointOnSegment(a1, a2, b1)) return true;
  if (o2 === 0 && pointOnSegment(a1, a2, b2)) return true;
  if (o3 === 0 && pointOnSegment(b1, b2, a1)) return true;
  if (o4 === 0 && pointOnSegment(b1, b2, a2)) return true;

  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

function pointOnPolygonBoundary(point: MmPoint, polygon: MmPoint[], tolerance = FOOTPRINT_BOUNDARY_TOLERANCE_MM) {
  return polygon.some((current, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return projectPointToSegment(point, current, next).distance <= tolerance;
  });
}

function pointInPolygon(point: MmPoint, polygon: MmPoint[]) {
  if (polygon.length < 3) return false;
  if (pointOnPolygonBoundary(point, polygon)) return true;
  let inside = false;
  for (let currentIndex = 0, previousIndex = polygon.length - 1; currentIndex < polygon.length; previousIndex = currentIndex, currentIndex += 1) {
    const current = polygon[currentIndex];
    const previous = polygon[previousIndex];
    const intersects = ((current.y > point.y) !== (previous.y > point.y)) &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function polygonSegmentIntersects(segmentStart: MmPoint, segmentEnd: MmPoint, polygon: MmPoint[]) {
  return polygon.some((current, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return segmentsIntersect(segmentStart, segmentEnd, current, next);
  });
}

function footprintEdges(footprint: Footprint) {
  return footprint.corners.map((corner, index) => ({
    start: corner,
    end: footprint.corners[(index + 1) % footprint.corners.length]
  }));
}

function segmentFitsWithinPolygon(segmentStart: MmPoint, segmentEnd: MmPoint, polygon: MmPoint[]) {
  const sampleCount = Math.max(2, Math.ceil(getLineLength(segmentStart, segmentEnd) / FOOTPRINT_EDGE_SAMPLE_MM));
  for (let index = 0; index <= sampleCount; index += 1) {
    const ratio = index / sampleCount;
    const point = {
      x: segmentStart.x + (segmentEnd.x - segmentStart.x) * ratio,
      y: segmentStart.y + (segmentEnd.y - segmentStart.y) * ratio
    };
    if (!pointInPolygon(point, polygon)) return false;
  }
  return true;
}

function polygonFitsWithinGround(footprint: Footprint, ground: GroundPolygon) {
  return pointInPolygon(footprint.center, ground.polygon) &&
    footprint.corners.every((corner) => pointInPolygon(corner, ground.polygon)) &&
    footprintEdges(footprint).every((edge) => segmentFitsWithinPolygon(edge.start, edge.end, ground.polygon));
}

function getGroundPolygons(floorId: FloorId, structure: HouseStructure): GroundPolygon[] {
  const roomPolygons = structure.rooms.map((room) => ({
    id: room.id,
    polygon: room.boundary,
    type: "room" as const
  }));
  const outdoorPolygons = structure.outdoors.map((outdoor) => ({
    id: outdoor.id,
    polygon: outdoor.polygon,
    type: "outdoor" as const
  }));
  return [...roomPolygons, ...outdoorPolygons].filter((ground) => ground.polygon.length >= 3);
}

function getStairStackRoom(floorId: FloorId, previousRooms: HouseRoom[]): HouseRoom | null {
  if (floorId === "YARD") return null;
  const roomId = STAIR_STACK_ROOM_IDS[floorId];
  const roomNumber = STAIR_STACK_ROOM_NUMBERS[floorId];
  const sourceWallIds = STAIR_STACK_SOURCE_WALL_IDS[floorId];
  if (!roomId || !roomNumber || !sourceWallIds) return null;
  const previousRoom = previousRooms.find((room) => room.id === roomId);
  return {
    ...previousRoom,
    id: roomId,
    floorId,
    roomNumber: previousRoom?.roomNumber ?? roomNumber,
    name: previousRoom?.name ?? "楼梯间",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: STAIR_STACK_ROOM_BOUNDARY.map((point) => ({ ...point })),
    area: getPolygonArea(STAIR_STACK_ROOM_BOUNDARY),
    sourceWallIds: [...sourceWallIds],
    verificationMeta: previousRoom?.verificationMeta ?? createManualVerificationMeta()
  };
}

function normalizeRepairRooms(floorId: FloorId, rooms: HouseRoom[], previousRooms: HouseRoom[]) {
  const stairRoom = getStairStackRoom(floorId, previousRooms);
  if (!stairRoom) return rooms;
  const hasStairRoom = rooms.some((room) => room.id === stairRoom.id);
  if (!hasStairRoom) return [...rooms, stairRoom];
  return rooms.map((room) => room.id === stairRoom.id ? stairRoom : room);
}

function mmPointFromFurniturePosition(position: Furniture["position"]): MmPoint {
  return {
    x: (position.x / 100) * STRUCTURE_WIDTH_MM,
    y: (position.y / 100) * STRUCTURE_HEIGHT_MM
  };
}

function getRotatedRectangleFootprint(center: MmPoint, widthMm: number, depthMm: number, rotationDegrees: number): Footprint {
  const radians = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const halfWidth = widthMm / 2;
  const halfDepth = depthMm / 2;
  const corners = [
    { x: -halfWidth, y: -halfDepth },
    { x: halfWidth, y: -halfDepth },
    { x: halfWidth, y: halfDepth },
    { x: -halfWidth, y: halfDepth }
  ].map((corner) => ({
    x: center.x + corner.x * cos - corner.y * sin,
    y: center.y + corner.x * sin + corner.y * cos
  }));
  return { center, corners };
}

function footprintPolygonsOverlap(left: Footprint, right: Footprint) {
  const getAxes = (footprint: Footprint) => footprint.corners.map((point, index) => {
    const nextPoint = footprint.corners[(index + 1) % footprint.corners.length];
    const edgeX = nextPoint.x - point.x;
    const edgeY = nextPoint.y - point.y;
    const length = Math.max(1, Math.hypot(edgeX, edgeY));
    return { x: -edgeY / length, y: edgeX / length };
  });
  const axes = [...getAxes(left), ...getAxes(right)];
  return axes.every((axis) => {
    const project = (footprint: Footprint) => footprint.corners.map((point) => point.x * axis.x + point.y * axis.y);
    const leftProjection = project(left);
    const rightProjection = project(right);
    const leftMin = Math.min(...leftProjection);
    const leftMax = Math.max(...leftProjection);
    const rightMin = Math.min(...rightProjection);
    const rightMax = Math.max(...rightProjection);
    return Math.min(leftMax, rightMax) - Math.max(leftMin, rightMin) > 1;
  });
}

function isSofaFurniture(item: Furniture) {
  return item.type === "sofa" || item.moduleType === "sofa" || item.render3d?.assetType === "sofa" || /沙发|sofa/i.test(item.name);
}

function isCoffeeTableFurniture(item: Furniture) {
  const assetType = item.render3d?.assetType;
  return assetType === "coffeeTable" || assetType === "loungeCoffeeTable" || /茶几|coffee\s*table/i.test(item.name);
}

function getStairFootprint(stair: { start: MmPoint; end: MmPoint; width: number }): Footprint {
  const length = Math.max(1, getLineLength(stair.start, stair.end));
  const normal = {
    x: -(stair.end.y - stair.start.y) / length,
    y: (stair.end.x - stair.start.x) / length
  };
  const halfWidth = stair.width / 2;
  return {
    center: {
      x: (stair.start.x + stair.end.x) / 2,
      y: (stair.start.y + stair.end.y) / 2
    },
    corners: [
      { x: stair.start.x + normal.x * halfWidth, y: stair.start.y + normal.y * halfWidth },
      { x: stair.end.x + normal.x * halfWidth, y: stair.end.y + normal.y * halfWidth },
      { x: stair.end.x - normal.x * halfWidth, y: stair.end.y - normal.y * halfWidth },
      { x: stair.start.x - normal.x * halfWidth, y: stair.start.y - normal.y * halfWidth }
    ]
  };
}

function findGroundContainingFootprint(footprint: Footprint, groundPolygons: GroundPolygon[]) {
  return groundPolygons.find((ground) => polygonFitsWithinGround(footprint, ground)) ?? null;
}

function findGroundContainingPoint(point: MmPoint, groundPolygons: GroundPolygon[]) {
  return groundPolygons.find((ground) => pointInPolygon(point, ground.polygon)) ?? null;
}

function footprintIntersectsSolidWall(footprint: Footprint, walls: HouseWall[]) {
  return getStraightWalls(walls).find((wall) => {
    if (wall.barrierType === "railing") return false;
    if (!polygonSegmentIntersects(wall.start, wall.end, footprint.corners)) return false;
    const sampleCount = Math.max(8, Math.ceil(getLineLength(wall.start, wall.end) / 250));
    for (let index = 1; index < sampleCount; index += 1) {
      const ratio = index / sampleCount;
      const point = {
        x: wall.start.x + (wall.end.x - wall.start.x) * ratio,
        y: wall.start.y + (wall.end.y - wall.start.y) * ratio
      };
      if (pointInPolygon(point, footprint.corners) && !pointOnPolygonBoundary(point, footprint.corners)) return true;
    }
    return false;
  }) ?? null;
}

function polygonSelfIntersects(points: MmPoint[]) {
  for (let i = 0; i < points.length; i += 1) {
    const a1 = points[i];
    const a2 = points[(i + 1) % points.length];
    for (let j = i + 1; j < points.length; j += 1) {
      const b1 = points[j];
      const b2 = points[(j + 1) % points.length];
      const adjacent = Math.abs(i - j) <= 1 || (i === 0 && j === points.length - 1);
      if (!adjacent && segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function getHostLine(structure: HouseStructure, hostId: string, hostType: "wall" | "partition") {
  if (hostType === "partition") {
    const partition = structure.partitions.find((item) => item.id === hostId);
    return partition ? { start: partition.start, end: partition.end, id: partition.id } : null;
  }
  const wall = structure.walls.find((item): item is StraightHouseWall => item.id === hostId && item.kind === "straight");
  return wall ? { start: wall.start, end: wall.end, id: wall.id } : null;
}

function connectedRoomCount(hostId: string, rooms: HouseRoom[], partitions: HousePartition[]) {
  const roomsFromWalls = rooms.filter((room) => room.sourceWallIds.includes(hostId)).length;
  const roomsFromPartitions = partitions.find((partition) => partition.id === hostId)?.roomIds.length ?? 0;
  return roomsFromWalls + roomsFromPartitions;
}

function pushCoordinateError(errors: HouseValidationIssue[], id: string, message: string, rootCauseKey?: string) {
  errors.push({ type: "coordinate", id, ruleId: rootCauseKey?.startsWith("SITE_BOUNDARY") ? "SITE_BOUNDARY" : "STRUCTURE_GEOMETRY", category: "geometry", severity: "error", rootCauseKey, message });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizePoint(point: MmPoint): MmPoint {
  return {
    x: clamp(isFiniteNumber(point.x) ? point.x : 0, 0, STRUCTURE_WIDTH_MM),
    y: clamp(isFiniteNumber(point.y) ? point.y : 0, 0, STRUCTURE_HEIGHT_MM)
  };
}

function sanitizeOutdoorPoint(floorId: FloorId, point: MmPoint): MmPoint {
  return {
    x: clamp(isFiniteNumber(point.x) ? point.x : 0, 0, STRUCTURE_WIDTH_MM),
    y: clamp(isFiniteNumber(point.y) ? point.y : 0, floorId === "1F" ? SITE_PLAN_MIN_Y_MM : 0, floorId === "1F" ? SITE_PLAN_MAX_Y_MM : STRUCTURE_HEIGHT_MM)
  };
}

function getFurniturePercentYBounds(floorId: FloorId) {
  return {
    min: floorId === "1F" ? (SITE_PLAN_MIN_Y_MM / STRUCTURE_HEIGHT_MM) * 100 : 0,
    max: floorId === "1F" ? (SITE_PLAN_MAX_Y_MM / STRUCTURE_HEIGHT_MM) * 100 : 100
  };
}

function sanitizeFurniturePosition(floorId: FloorId, position: Furniture["position"]) {
  const yBounds = getFurniturePercentYBounds(floorId);
  return {
    ...position,
    x: clamp(isFiniteNumber(position.x) ? position.x : 0, 0, 100),
    y: clamp(isFiniteNumber(position.y) ? position.y : 0, yBounds.min, yBounds.max),
    rotation: isFiniteNumber(position.rotation) ? position.rotation : 0
  };
}

function mmPointToFurniturePosition(floorId: FloorId, center: MmPoint, rotation: number): Furniture["position"] {
  const yBounds = getFurniturePercentYBounds(floorId);
  return {
    x: Math.round(clamp((center.x / STRUCTURE_WIDTH_MM) * 100, 0, 100) * 100) / 100,
    y: Math.round(clamp((center.y / STRUCTURE_HEIGHT_MM) * 100, yBounds.min, yBounds.max) * 100) / 100,
    rotation
  };
}

function translatePoint(point: MmPoint, dx: number, dy: number): MmPoint {
  return {
    x: Math.round(point.x + dx),
    y: Math.round(point.y + dy)
  };
}

function translateFootprint(footprint: Footprint, dx: number, dy: number): Footprint {
  return {
    center: translatePoint(footprint.center, dx, dy),
    corners: footprint.corners.map((corner) => translatePoint(corner, dx, dy))
  };
}

function getPolygonBounds(points: MmPoint[]) {
  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    maxX: Math.max(bounds.maxX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxY: Math.max(bounds.maxY, point.y)
  }), {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY
  });
}

function getPolygonCentroid(points: MmPoint[]): MmPoint {
  if (points.length === 0) return { x: 0, y: 0 };
  let twiceArea = 0;
  let weightedX = 0;
  let weightedY = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const cross = point.x * next.y - next.x * point.y;
    twiceArea += cross;
    weightedX += (point.x + next.x) * cross;
    weightedY += (point.y + next.y) * cross;
  });
  if (Math.abs(twiceArea) < 1) {
    return {
      x: Math.round(points.reduce((sum, point) => sum + point.x, 0) / points.length),
      y: Math.round(points.reduce((sum, point) => sum + point.y, 0) / points.length)
    };
  }
  return {
    x: Math.round(weightedX / (3 * twiceArea)),
    y: Math.round(weightedY / (3 * twiceArea))
  };
}

function getGroundCenterCandidates(ground: GroundPolygon) {
  const bounds = getPolygonBounds(ground.polygon);
  return [
    getPolygonCentroid(ground.polygon),
    {
      x: Math.round((bounds.minX + bounds.maxX) / 2),
      y: Math.round((bounds.minY + bounds.maxY) / 2)
    }
  ];
}

function getPlacementCandidateCenters(originalCenter: MmPoint, grounds: GroundPolygon[], blockingWall: StraightHouseWall | null) {
  const candidates: MmPoint[] = [originalCenter];

  if (blockingWall) {
    const wallLength = Math.max(1, getLineLength(blockingWall.start, blockingWall.end));
    const normal = {
      x: -(blockingWall.end.y - blockingWall.start.y) / wallLength,
      y: (blockingWall.end.x - blockingWall.start.x) / wallLength
    };
    for (let distance = PLACEMENT_REPAIR_STEP_MM; distance <= PLACEMENT_REPAIR_MAX_RADIUS_MM; distance += PLACEMENT_REPAIR_STEP_MM) {
      candidates.push(translatePoint(originalCenter, normal.x * distance, normal.y * distance));
      candidates.push(translatePoint(originalCenter, -normal.x * distance, -normal.y * distance));
    }
  }

  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ];
  for (let distance = PLACEMENT_REPAIR_STEP_MM; distance <= PLACEMENT_REPAIR_MAX_RADIUS_MM; distance += PLACEMENT_REPAIR_STEP_MM) {
    directions.forEach((direction) => {
      const length = Math.hypot(direction.x, direction.y);
      candidates.push(translatePoint(originalCenter, (direction.x / length) * distance, (direction.y / length) * distance));
    });
  }

  grounds.forEach((ground) => {
    const bounds = getPolygonBounds(ground.polygon);
    candidates.push(...getGroundCenterCandidates(ground));
    candidates.push({
      x: Math.round(clamp(originalCenter.x, bounds.minX, bounds.maxX)),
      y: Math.round(clamp(originalCenter.y, bounds.minY, bounds.maxY))
    });
  });

  const seen = new Set<string>();
  return candidates
    .filter((candidate) => Number.isFinite(candidate.x) && Number.isFinite(candidate.y))
    .sort((left, right) => getDistance(left, originalCenter) - getDistance(right, originalCenter))
    .filter((candidate) => {
      const key = `${Math.round(candidate.x)}:${Math.round(candidate.y)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getFootprintLegalGround(footprint: Footprint, walls: HouseWall[], grounds: GroundPolygon[]) {
  const ground = findGroundContainingFootprint(footprint, grounds);
  if (!ground) return null;
  if (footprintIntersectsSolidWall(footprint, walls)) return null;
  return ground;
}

function findNearestLegalTranslatedFootprint(footprint: Footprint, walls: HouseWall[], grounds: GroundPolygon[]) {
  if (grounds.length === 0) return null;
  const blockingWall = footprintIntersectsSolidWall(footprint, walls);
  const candidates = getPlacementCandidateCenters(footprint.center, grounds, blockingWall);
  for (const candidateCenter of candidates) {
    const translated = translateFootprint(footprint, candidateCenter.x - footprint.center.x, candidateCenter.y - footprint.center.y);
    const ground = getFootprintLegalGround(translated, walls, grounds);
    if (ground) {
      return {
        center: translated.center,
        ground
      };
    }
  }
  return null;
}

function getFittableFurnitureWidthCm(item: Furniture, ground: GroundPolygon) {
  if (!item.dimensions || !isFiniteNumber(item.dimensions.width) || !isFiniteNumber(item.dimensions.depth)) return null;
  const bounds = getPolygonBounds(ground.polygon);
  const availableX = Math.max(1, bounds.maxX - bounds.minX - FOOTPRINT_BOUNDARY_TOLERANCE_MM * 2);
  const availableY = Math.max(1, bounds.maxY - bounds.minY - FOOTPRINT_BOUNDARY_TOLERANCE_MM * 2);
  const depthMm = Math.max(1, item.dimensions.depth * 10);
  const rotation = isFiniteNumber(item.position.rotation) ? item.position.rotation : 0;
  const radians = (rotation * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(radians));
  const absSin = Math.abs(Math.sin(radians));
  let maxWidthMm = Number.POSITIVE_INFINITY;

  if (absCos > 0.01) {
    maxWidthMm = Math.min(maxWidthMm, (availableX - depthMm * absSin) / absCos);
  } else if (depthMm * absSin > availableX) {
    return null;
  }

  if (absSin > 0.01) {
    maxWidthMm = Math.min(maxWidthMm, (availableY - depthMm * absCos) / absSin);
  } else if (depthMm * absCos > availableY) {
    return null;
  }

  const widthCm = Math.floor(maxWidthMm / 10);
  if (!Number.isFinite(widthCm) || widthCm < 30 || widthCm >= item.dimensions.width) return null;
  return widthCm;
}

function canAutoResizeFurniture(item: Furniture) {
  return item.type === "wardrobe" || item.moduleType === "wardrobe" || item.catalogId === "storage-wardrobe";
}

function getOrthogonalStatus(start: MmPoint, end: MmPoint) {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const major = Math.max(dx, dy);
  const minor = Math.min(dx, dy);
  return {
    horizontal: dy === 0,
    vertical: dx === 0,
    nearHorizontal: dx > 0 && (dy <= ORTHOGONAL_SNAP_MM || dy <= dx * ORTHOGONAL_RATIO),
    nearVertical: dy > 0 && (dx <= ORTHOGONAL_SNAP_MM || dx <= dy * ORTHOGONAL_RATIO),
    diagonal: major > 0 && minor > ORTHOGONAL_SNAP_MM && minor > major * ORTHOGONAL_RATIO
  };
}

function straightenNearOrthogonalWalls(walls: HouseWall[]) {
  const repairs: string[] = [];
  const nextWalls = walls.map((wall) => {
    if (wall.kind !== "straight") return wall;
    const start = sanitizePoint(wall.start);
    const end = sanitizePoint(wall.end);
    const suffix = getWallSuffix(wall.id);

    if (FORCED_HORIZONTAL_WALL_SUFFIXES.has(suffix) && start.y !== end.y && Math.abs(end.x - start.x) > POINT_EPSILON_MM) {
      const y = Math.round((start.y + end.y) / 2);
      const nextStart = sanitizePoint({ ...start, y });
      const nextEnd = sanitizePoint({ ...end, y });
      repairs.push(`已将直墙 ${wall.id} 修正为水平。`);
      return { ...wall, start: nextStart, end: nextEnd, length: getLineLength(nextStart, nextEnd) };
    }

    const status = getOrthogonalStatus(start, end);

    if (status.horizontal || status.vertical || status.diagonal) {
      return { ...wall, start, end, length: getLineLength(start, end) };
    }

    if (status.nearHorizontal) {
      const y = Math.round((start.y + end.y) / 2);
      const nextStart = sanitizePoint({ ...start, y });
      const nextEnd = sanitizePoint({ ...end, y });
      repairs.push(`已将直墙 ${wall.id} 修正为水平。`);
      return { ...wall, start: nextStart, end: nextEnd, length: getLineLength(nextStart, nextEnd) };
    }

    if (status.nearVertical) {
      const x = Math.round((start.x + end.x) / 2);
      const nextStart = sanitizePoint({ ...start, x });
      const nextEnd = sanitizePoint({ ...end, x });
      repairs.push(`已将直墙 ${wall.id} 修正为垂直。`);
      return { ...wall, start: nextStart, end: nextEnd, length: getLineLength(nextStart, nextEnd) };
    }

    return { ...wall, start, end, length: getLineLength(start, end) };
  });

  return { walls: nextWalls, repairs };
}

function snapNearbyEndpoints(walls: HouseWall[]) {
  const repairs: string[] = [];
  const straightWalls = getStraightWalls(walls);
  const endpointGroups: MmPoint[][] = [];

  straightWalls.flatMap((wall) => [wall.start, wall.end]).forEach((point) => {
    const group = endpointGroups.find((items) => items.some((item) => samePoint(item, point, REPAIR_SNAP_MM)));
    if (group) {
      group.push(point);
      return;
    }
    endpointGroups.push([point]);
  });

  const snappedPoints = endpointGroups
    .filter((group) => group.length > 1)
    .map((group) => ({
      group,
      target: {
        x: Math.round(group.reduce((sum, point) => sum + point.x, 0) / group.length),
        y: Math.round(group.reduce((sum, point) => sum + point.y, 0) / group.length)
      }
    }));

  const nextWalls = walls.map((wall) => {
    if (wall.kind !== "straight") return wall;
    let start = sanitizePoint(wall.start);
    let end = sanitizePoint(wall.end);
    snappedPoints.forEach(({ group, target }) => {
      if (group.some((point) => samePoint(point, start, REPAIR_SNAP_MM))) start = target;
      if (group.some((point) => samePoint(point, end, REPAIR_SNAP_MM))) end = target;
    });
    if (!samePoint(start, wall.start, 0) || !samePoint(end, wall.end, 0)) {
      repairs.push(`已吸附墙体端点：${wall.id}`);
    }
    return { ...wall, start, end, length: getLineLength(start, end) };
  });

  return { walls: nextWalls, repairs };
}

function snapEndpointsToNearbySegments(walls: HouseWall[]) {
  const repairs: string[] = [];
  const straightWalls = getStraightWalls(walls);

  const nextWalls = walls.map((wall) => {
    if (wall.kind !== "straight") return wall;

    const snapEndpoint = (point: MmPoint, pointKey: "start" | "end") => {
      let best: { point: MmPoint; distance: number; wallId: string } | null = null;
      straightWalls.forEach((candidate) => {
        if (candidate.id === wall.id) return;
        const projection = projectPointToSegment(point, candidate.start, candidate.end);
        if (projection.distance > REPAIR_SNAP_MM) return;
        if (!best || projection.distance < best.distance) {
          best = {
            point: {
              x: Math.round(projection.point.x),
              y: Math.round(projection.point.y)
            },
            distance: projection.distance,
            wallId: candidate.id
          };
        }
      });
      if (best) {
        const target = best as { point: MmPoint; distance: number; wallId: string };
        repairs.push(`已将 ${wall.id} 的${pointKey === "start" ? "起点" : "终点"}吸附到 ${target.wallId}`);
        return target.point;
      }
      return point;
    };

    const start = snapEndpoint(sanitizePoint(wall.start), "start");
    const end = snapEndpoint(sanitizePoint(wall.end), "end");
    return { ...wall, start, end, length: getLineLength(start, end) };
  });

  return { walls: nextWalls, repairs };
}

function getStairStackConfigs(floorId: FloorId): StairStackConfig[] {
  if (floorId === "B2") {
    return [{
      id: "ST-B2-001",
      name: "B2 上行至 B1 楼梯",
      lane: "upper",
      direction: "up",
      height: 1400,
      stepCount: 10
    }];
  }
  if (floorId === "B1") {
    return [
      {
        id: "ST-B1-001",
        name: "B1 上行至 1F 梯段",
        lane: "upper",
        direction: "up",
        height: 1400,
        stepCount: 10
      },
      {
        id: "ST-B1-002",
        name: "B1 下行至 B2 梯段",
        lane: "lower",
        direction: "down",
        height: 1400,
        stepCount: 10
      }
    ];
  }
  if (floorId === "1F") {
    return [
      {
        id: "ST-1F-001",
        name: "右侧平台上行梯段",
        lane: "upper",
        direction: "up",
        height: 1400,
        stepCount: 10
      },
      {
        id: "ST-1F-002",
        name: "右侧平台下行梯段",
        lane: "lower",
        direction: "down",
        height: 1400,
        stepCount: 10
      }
    ];
  }
  if (floorId === "2F") {
    return [{
      id: "ST-2F-001",
      name: "2F 下行至 1F 梯段",
      lane: "lower",
      direction: "down",
      height: 1400,
      stepCount: 10
    }];
  }
  return [];
}

function getStairStackLaneGeometry(lane: StairStackLane) {
  const bounds = getPolygonBounds(STAIR_STACK_ROOM_BOUNDARY);
  const stairwellDepth = bounds.maxY - bounds.minY;
  const centerY = lane === "upper"
    ? Math.round(bounds.minY + stairwellDepth / 4)
    : Math.round(bounds.minY + (stairwellDepth * 3) / 4);
  return {
    start: sanitizePoint({ x: Math.round(bounds.maxX), y: centerY }),
    end: sanitizePoint({ x: Math.round(bounds.minX), y: centerY }),
    width: Math.round(stairwellDepth / 2)
  };
}

function isManagedStairStackId(floorId: FloorId, stairId: string) {
  return stairId.startsWith(`ST-${floorId}-00`) && (floorId === "B2" || floorId === "B1" || floorId === "1F" || floorId === "2F");
}

function getAlignedStair(floorId: FloorId, config: StairStackConfig, existing: HouseStair | undefined): HouseStair {
  const geometry = getStairStackLaneGeometry(config.lane);
  return {
    ...(existing ?? {}),
    id: config.id,
    floorId,
    name: config.name,
    geometryType: "line",
    start: geometry.start,
    end: geometry.end,
    width: geometry.width,
    baseHeight: Math.max(0, isFiniteNumber(existing?.baseHeight) ? existing.baseHeight : 0),
    height: config.height,
    stepCount: config.stepCount,
    direction: config.direction,
    editable: true,
    removable: true,
    verificationMeta: existing?.verificationMeta ?? createManualVerificationMeta()
  };
}

function stairNeedsAlignment(current: HouseStair | undefined, next: HouseStair) {
  return !current ||
    current.floorId !== next.floorId ||
    current.name !== next.name ||
    current.start.x !== next.start.x ||
    current.start.y !== next.start.y ||
    current.end.x !== next.end.x ||
    current.end.y !== next.end.y ||
    current.width !== next.width ||
    current.height !== next.height ||
    current.stepCount !== next.stepCount ||
    current.direction !== next.direction;
}

function alignStairStack(floorId: FloorId, stairs: HouseStair[]) {
  const repairs: string[] = [];
  const configs = getStairStackConfigs(floorId);
  if (configs.length === 0) return { stairs, repairs };
  const expectedIds = new Set(configs.map((config) => config.id));
  const expectedStairs = configs.map((config) => {
    const current = stairs.find((stair) => stair.id === config.id);
    const next = getAlignedStair(floorId, config, current);
    if (stairNeedsAlignment(current, next)) {
      repairs.push(`已按跨楼层动线校准楼梯 ${next.id}。`);
    }
    return next;
  });
  const extraManagedStairs = stairs.filter((stair) => isManagedStairStackId(floorId, stair.id) && !expectedIds.has(stair.id));
  extraManagedStairs.forEach((stair) => {
    repairs.push(`已移除 ${floorId} 多余楼梯 ${stair.id}，保持楼梯栈数量正确。`);
  });
  const otherStairs = stairs.filter((stair) => !isManagedStairStackId(floorId, stair.id));

  return { stairs: [...expectedStairs, ...otherStairs], repairs };
}

function repairStairPlacements(floorId: FloorId, stairs: HouseStair[], walls: HouseWall[], groundPolygons: GroundPolygon[]) {
  const repairs: string[] = [];
  const alignedStairStack = alignStairStack(floorId, stairs);
  repairs.push(...alignedStairStack.repairs);
  const nextStairs = alignedStairStack.stairs.map((stair) => {
    if (getStairStackConfigs(floorId).some((config) => config.id === stair.id)) return stair;
    if (!isFiniteNumber(stair.width) || stair.width <= 0 || getLineLength(stair.start, stair.end) <= 0) return stair;
    const footprint = getStairFootprint(stair);
    if (getFootprintLegalGround(footprint, walls, groundPolygons)) return stair;
    const currentGround = findGroundContainingPoint(footprint.center, groundPolygons);
    const targetGrounds = currentGround ? [currentGround] : groundPolygons;
    const repaired = findNearestLegalTranslatedFootprint(footprint, walls, targetGrounds);
    if (!repaired) return stair;

    const dx = repaired.center.x - footprint.center.x;
    const dy = repaired.center.y - footprint.center.y;
    repairs.push(`已将楼梯 ${stair.id} 挪回 ${repaired.ground.id} 内，避开实体墙/房间边界。`);
    return {
      ...stair,
      start: sanitizePoint(translatePoint(stair.start, dx, dy)),
      end: sanitizePoint(translatePoint(stair.end, dx, dy))
    };
  });
  return { stairs: nextStairs, repairs };
}

function repairFurniturePlacements(floorId: FloorId, furniture: Furniture[], walls: HouseWall[], groundPolygons: GroundPolygon[]) {
  const repairs: string[] = [];
  const nextFurniture = furniture.map((item) => {
    if (
      !item.dimensions ||
      !isFiniteNumber(item.dimensions.width) ||
      !isFiniteNumber(item.dimensions.depth) ||
      item.dimensions.width <= 0 ||
      item.dimensions.depth <= 0 ||
      !isValidFurniturePercentPoint(floorId, item.position)
    ) {
      return item;
    }

    const footprint = getRotatedRectangleFootprint(
      mmPointFromFurniturePosition(item.position),
      item.dimensions.width * 10,
      item.dimensions.depth * 10,
      isFiniteNumber(item.position.rotation) ? item.position.rotation : 0
    );
    const linkedGround = groundPolygons.find((ground) => ground.id === item.roomId) ?? null;
    const currentGround = findGroundContainingPoint(footprint.center, groundPolygons);
    const targetGrounds = linkedGround ? [linkedGround] : currentGround ? [currentGround] : groundPolygons;
    if (getFootprintLegalGround(footprint, walls, targetGrounds)) return item;

    let repaired = findNearestLegalTranslatedFootprint(footprint, walls, targetGrounds);
    let nextDimensions = item.dimensions;
    for (let groundIndex = 0; !repaired && canAutoResizeFurniture(item) && groundIndex < targetGrounds.length; groundIndex += 1) {
      const targetGround = targetGrounds[groundIndex];
      const fittableWidth = getFittableFurnitureWidthCm(item, targetGround);
      if (!fittableWidth) continue;
      const adjustedFootprint = getRotatedRectangleFootprint(
        footprint.center,
        fittableWidth * 10,
        item.dimensions.depth * 10,
        isFiniteNumber(item.position.rotation) ? item.position.rotation : 0
      );
      const adjustedRepair = findNearestLegalTranslatedFootprint(adjustedFootprint, walls, [targetGround]);
      if (adjustedRepair) {
        repaired = adjustedRepair;
        nextDimensions = {
          ...item.dimensions,
          width: fittableWidth
        };
      }
    }
    if (!repaired) return item;

    const nextPosition = mmPointToFurniturePosition(floorId, repaired.center, isFiniteNumber(item.position.rotation) ? item.position.rotation : 0);
    repairs.push(nextDimensions.width !== item.dimensions.width
      ? `已将家具 ${item.id} 缩短到 ${nextDimensions.width}cm 并挪回 ${repaired.ground.id} 内，避开实体墙/房间边界。`
      : `已将家具 ${item.id} 挪回 ${repaired.ground.id} 内，避开实体墙/房间边界。`);
    return {
      ...item,
      dimensions: nextDimensions,
      roomId: linkedGround || item.roomId.startsWith("room-") ? item.roomId : repaired.ground.id,
      position: {
        ...item.position,
        ...nextPosition
      }
    };
  });
  return { furniture: nextFurniture, repairs };
}

export function autoRepairHouse(floorId: FloorId, structure: HouseStructure, furniture: Furniture[]): HouseAutoRepairResult {
  const repairs: string[] = [];
  const sanitizedWalls = structure.walls
    .filter((wall) => {
      const keep = wall.kind === "arc" ? wall.length > 0 && wall.radius > 0 : getLineLength(wall.start, wall.end) > 0;
      if (!keep) repairs.push(`已移除零长度墙体：${wall.id}`);
      return keep;
    })
    .map((wall): HouseWall => {
      if (wall.kind === "arc") {
        return {
          ...wall,
          floorId,
          center: sanitizePoint(wall.center),
          radius: Math.max(1, wall.radius),
          length: Math.max(1, wall.length)
        };
      }
      const start = sanitizePoint(wall.start);
      const end = sanitizePoint(wall.end);
      const length = getLineLength(start, end);
      if (wall.floorId !== floorId || length !== wall.length || !samePoint(start, wall.start) || !samePoint(end, wall.end)) {
        repairs.push(`已修正墙体坐标/楼层：${wall.id}`);
      }
      return { ...wall, floorId, start, end, length };
    });

  const snapped = snapNearbyEndpoints(sanitizedWalls);
  const straightened = straightenNearOrthogonalWalls(snapped.walls);
  const segmentSnapped = snapEndpointsToNearbySegments(straightened.walls);
  const snappedAgain = snapNearbyEndpoints(segmentSnapped.walls);
  repairs.push(...snapped.repairs, ...straightened.repairs, ...segmentSnapped.repairs, ...snappedAgain.repairs);

  const hostExists = (hostId: string, hostType: "wall" | "partition") => Boolean(getHostLine({ ...structure, walls: snappedAgain.walls }, hostId, hostType));
  const nextPartitions = structure.partitions.map((partition) => ({
    ...partition,
    floorId,
    start: sanitizePoint(partition.start),
    end: sanitizePoint(partition.end)
  }));
  const nextStairs = structure.stairs.map((stair) => ({
    ...stair,
    floorId,
    start: sanitizePoint(stair.start),
    end: sanitizePoint(stair.end),
    width: Math.max(1, isFiniteNumber(stair.width) ? stair.width : 1100),
    baseHeight: Math.max(0, isFiniteNumber(stair.baseHeight) ? stair.baseHeight : 0),
    height: Math.max(1, isFiniteNumber(stair.height) ? stair.height : 2800),
    stepCount: Math.max(1, Math.round(isFiniteNumber(stair.stepCount) ? stair.stepCount : 14))
  }));
  const nextColumns = (structure.columns ?? []).map((column) => ({
    ...column,
    floorId,
    center: sanitizePoint(column.center),
    radius: Math.max(50, isFiniteNumber(column.radius) ? column.radius : 360),
    height: Math.max(1, isFiniteNumber(column.height) ? column.height : 2800)
  }));
  const nextFences = structure.fences.map((fence) => ({
    ...fence,
    floorId,
    start: sanitizeOutdoorPoint(floorId, fence.start),
    end: sanitizeOutdoorPoint(floorId, fence.end),
    height: Math.max(1, isFiniteNumber(fence.height) ? fence.height : 1200),
    thickness: Math.max(1, isFiniteNumber(fence.thickness) ? fence.thickness : 80)
  }));
  const nextOutdoorSurfaces = structure.outdoorSurfaces.map((surface) => {
    const polygon = surface.polygon.map((point) => sanitizeOutdoorPoint(floorId, point));
    return {
      ...surface,
      floorId,
      polygon,
      area: getPolygonArea(polygon)
    };
  });

  const nextStructureBase: HouseStructure = {
    ...structure,
    floorId,
    coordinateSystem: createFloorCoordinateSystem(floorId),
    walls: snappedAgain.walls,
    partitions: nextPartitions,
    stairs: nextStairs,
    columns: nextColumns,
    fences: nextFences,
    outdoorSurfaces: nextOutdoorSurfaces,
    doors: structure.doors
      .filter((door) => {
        const keep = hostExists(door.hostId, door.hostType);
        if (!keep) repairs.push(`已移除缺少宿主的门：${door.id}`);
        return keep;
      })
      .map((door) => {
        const nextPosition = clamp(isFiniteNumber(door.positionOnWall) ? door.positionOnWall : 0.5, 0, 1);
        if (door.floorId !== floorId || nextPosition !== door.positionOnWall) repairs.push(`已修正门位置/楼层：${door.id}`);
        return { ...door, floorId, positionOnWall: nextPosition };
      }),
    windows: structure.windows
      .filter((windowObject) => {
        const keep = windowObject.hostType === "wall" && hostExists(windowObject.hostId, windowObject.hostType);
        if (!keep) repairs.push(`已移除缺少墙体宿主的窗：${windowObject.id}`);
        return keep;
      })
      .map((windowObject) => {
        const nextPosition = clamp(isFiniteNumber(windowObject.positionOnWall) ? windowObject.positionOnWall : 0.5, 0, 1);
        if (windowObject.floorId !== floorId || nextPosition !== windowObject.positionOnWall) repairs.push(`已修正窗位置/楼层：${windowObject.id}`);
        return { ...windowObject, floorId, hostType: "wall" as const, positionOnWall: nextPosition };
      }),
    bayWindows: structure.bayWindows
      .filter((bayWindow) => {
        const keep = hostExists(bayWindow.wallId, "wall");
        if (!keep) repairs.push(`已移除缺少墙体宿主的飘窗：${bayWindow.id}`);
        return keep;
      })
      .map((bayWindow) => ({
        ...bayWindow,
        floorId,
        positionOnWall: clamp(isFiniteNumber(bayWindow.positionOnWall) ? bayWindow.positionOnWall : 0.5, 0, 1)
      })),
    skylights: structure.skylights.map((skylight) => ({
      ...skylight,
      floorId,
      center: sanitizePoint(skylight.center),
      width: Math.max(1, isFiniteNumber(skylight.width) ? skylight.width : 1200),
      depth: Math.max(1, isFiniteNumber(skylight.depth) ? skylight.depth : 900),
      height: Math.max(1, isFiniteNumber(skylight.height) ? skylight.height : 120),
      rotation: isFiniteNumber(skylight.rotation) ? skylight.rotation : 0
    })),
    outdoors: structure.outdoors.map((outdoor) => ({
      ...outdoor,
      floorId,
      polygon: outdoor.polygon.map((point) => sanitizeOutdoorPoint(floorId, point))
    }))
  };

  const generatedRooms = generateRoomsFromWalls(floorId, nextStructureBase.walls, structure.rooms);
  const generatedStructure = {
    ...nextStructureBase,
    rooms: normalizeRepairRooms(floorId, generatedRooms, structure.rooms)
  };

  const groundPolygons = getGroundPolygons(floorId, generatedStructure);
  const repairedStairPlacements = repairStairPlacements(floorId, generatedStructure.stairs, generatedStructure.walls, groundPolygons);
  repairs.push(...repairedStairPlacements.repairs);
  const nextStructure = {
    ...generatedStructure,
    stairs: repairedStairPlacements.stairs
  };

  const sanitizedFurniture = furniture.map((item) => {
    const position = sanitizeFurniturePosition(floorId, item.position);
    if (item.floorId !== floorId || position.x !== item.position.x || position.y !== item.position.y || position.rotation !== item.position.rotation) {
      repairs.push(`已修正家具楼层/坐标：${item.id}`);
    }
    return {
      ...item,
      floorId,
      position
    };
  });
  const repairedFurniturePlacements = repairFurniturePlacements(floorId, sanitizedFurniture, nextStructure.walls, groundPolygons);
  repairs.push(...repairedFurniturePlacements.repairs);

  return {
    structure: nextStructure,
    furniture: repairedFurniturePlacements.furniture,
    repairs: Array.from(new Set(repairs))
  };
}

export function validateHouse(floorId: FloorId, structure: HouseStructure, furniture: Furniture[]): HouseValidationResult {
  const errors: HouseValidationIssue[] = [];
  const warnings: HouseValidationIssue[] = [];
  const infos: HouseValidationIssue[] = [];
  const allowOpenBoundary = floorId === "YARD";

  if (structure.floorId !== floorId) {
    errors.push({ type: "coordinate", id: structure.floorId, message: "结构楼层 ID 与当前校验楼层不一致。" });
  }

  if (structure.coordinateSystem.floorId !== floorId) {
    errors.push({ type: "coordinate", id: floorId, message: "坐标系统 floorId 与当前楼层不一致。" });
  }
  if (structure.coordinateSystem.unit !== "mm") {
    errors.push({ type: "coordinate", id: floorId, message: "结构模型单位必须统一为 mm。" });
  }
  if (structure.coordinateSystem.origin.x !== 0 || structure.coordinateSystem.origin.y !== 0) {
    errors.push({ type: "coordinate", id: floorId, message: "每层结构原点必须固定为 (0, 0)。" });
  }
  if (structure.coordinateSystem.width !== STRUCTURE_WIDTH_MM || structure.coordinateSystem.height !== STRUCTURE_HEIGHT_MM) {
    errors.push({ type: "coordinate", id: floorId, message: "楼层坐标范围必须与统一结构画布一致。" });
  }

  structure.walls.forEach((wall) => {
    if (wall.floorId !== floorId) {
      errors.push({ type: "wall", id: wall.id, message: "墙体 floorId 与当前楼层不一致。" });
    }

    if (wall.kind === "straight") {
      if (!isValidMmPoint(wall.start) || !isValidMmPoint(wall.end)) {
        pushCoordinateError(errors, wall.id, "墙体端点坐标存在 NaN、undefined 或非法值。");
        return;
      }
      if (!isPointInsideFloor(wall.start) || !isPointInsideFloor(wall.end)) {
        pushCoordinateError(errors, wall.id, "墙体端点超出统一楼层坐标范围。");
      }
      if (getLineLength(wall.start, wall.end) <= 0) {
        errors.push({ type: "wall", id: wall.id, message: "墙体长度必须大于 0。" });
      }
      const orthogonalStatus = getOrthogonalStatus(wall.start, wall.end);
      if (orthogonalStatus.diagonal) {
        warnings.push({ type: "wall", id: wall.id, message: "直墙应保持横平竖直；如需弧形或特殊墙体，请使用弧墙对象。" });
      } else if (!orthogonalStatus.horizontal && !orthogonalStatus.vertical) {
        warnings.push({ type: "wall", id: wall.id, message: "直墙接近水平/垂直但未完全归正，自动修复会尝试拉平或拉直。" });
      }
      if (!allowOpenBoundary && countConnections(wall.start, structure.walls, wall.id) === 0 && countConnections(wall.end, structure.walls, wall.id) === 0) {
        errors.push({ type: "wall", id: wall.id, message: "墙体不能为孤立线段，至少需要与其他墙体连接。" });
      }
      if (!allowOpenBoundary && (countConnections(wall.start, structure.walls, wall.id) === 0 || countConnections(wall.end, structure.walls, wall.id) === 0)) {
        warnings.push({ type: "wall", id: wall.id, message: "墙体存在开放端点；非院子/开放边界应形成闭合结构。" });
      }
      return;
    }

    if (!isValidMmPoint(wall.center) || !isFiniteNumber(wall.radius) || wall.radius <= 0) {
      pushCoordinateError(errors, wall.id, "弧形墙中心或半径坐标非法。");
    }
    if (wall.length <= 0) {
      errors.push({ type: "wall", id: wall.id, message: "弧形墙长度必须大于 0。" });
    }
  });

  if (!allowOpenBoundary && structure.walls.length > 0 && structure.rooms.length === 0) {
    errors.push({ type: "wall", id: floorId, message: "当前楼层墙体未形成可生成房间的闭合结构。" });
  }

  const groundPolygons = getGroundPolygons(floorId, structure);

  structure.rooms.forEach((room) => {
    if (room.floorId !== floorId) {
      errors.push({ type: "room", id: room.id, message: "房间必须属于当前 floorId。" });
    }
    if (room.boundary.length < 3) {
      errors.push({ type: "room", id: room.id, message: "房间必须由合法 polygon 生成，边界点不能少于 3 个。" });
    }
    if (room.boundary.some((point) => !isValidMmPoint(point) || !isPointInsideFloor(point))) {
      pushCoordinateError(errors, room.id, "房间 polygon 存在非法坐标或超出楼层坐标范围。");
    }
    if (room.boundary.length >= 3 && polygonSelfIntersects(room.boundary)) {
      errors.push({ type: "room", id: room.id, message: "房间 polygon 不能自交。" });
    }
    if (!isFiniteNumber(room.area) || room.area <= 0) {
      errors.push({ type: "room", id: room.id, message: "房间面积必须由合法 polygon 自动计算。" });
    }
  });

  structure.partitions.forEach((partition) => {
    if (!isValidMmPoint(partition.start) || !isValidMmPoint(partition.end)) {
      pushCoordinateError(errors, partition.id, "隔断端点坐标存在非法值。");
    }
  });

  structure.stairs.forEach((stair) => {
    if (stair.floorId !== floorId) {
      errors.push({ type: "stair", id: stair.id, message: "楼梯 floorId 与当前楼层不一致。" });
    }
    if (!isValidMmPoint(stair.start) || !isValidMmPoint(stair.end)) {
      pushCoordinateError(errors, stair.id, "楼梯端点坐标存在非法值。");
      return;
    }
    if (!isPointInsideFloor(stair.start) || !isPointInsideFloor(stair.end)) {
      pushCoordinateError(errors, stair.id, "楼梯端点超出统一楼层坐标范围。");
    }
    if (getLineLength(stair.start, stair.end) <= 0) {
      errors.push({ type: "stair", id: stair.id, message: "楼梯长度必须大于 0。" });
    }
    if (!isFiniteNumber(stair.width) || stair.width <= 0 || !isFiniteNumber(stair.height) || stair.height <= 0) {
      errors.push({ type: "stair", id: stair.id, message: "楼梯必须有合法宽度和层高，单位为 mm。" });
    }
    if (!isFiniteNumber(stair.stepCount) || stair.stepCount < 1) {
      errors.push({ type: "stair", id: stair.id, message: "楼梯踏步数必须大于 0。" });
    }
    if (isFiniteNumber(stair.width) && stair.width > 0 && getLineLength(stair.start, stair.end) > 0) {
      const footprint = getStairFootprint(stair);
      const centerGround = findGroundContainingPoint(footprint.center, groundPolygons);
      const containingGround = findGroundContainingFootprint(footprint, groundPolygons);
      const stairRoomId = (STAIR_STACK_ROOM_IDS as Partial<Record<FloorId, string>>)[floorId];
      const stairRoom = structure.rooms.find((room) => room.id === stairRoomId || /楼梯/.test(room.name));
      const stairRoomBoundaryWallIds = new Set(stairRoom?.sourceWallIds ?? []);
      const blockingWall = footprintIntersectsSolidWall(footprint, structure.walls.filter((wall) => !stairRoomBoundaryWallIds.has(wall.id)));
      if (!centerGround) {
        errors.push({ type: "stair", id: stair.id, message: "楼梯中心没有落在任何房间地面内，可能漂浮在结构外。" });
      } else if (!containingGround) {
        errors.push({ type: "stair", id: stair.id, message: "楼梯轮廓跨出房间边界，可能穿墙或压到非楼梯间区域。" });
      }
      if (blockingWall) {
        errors.push({ type: "stair", id: stair.id, message: `楼梯轮廓穿过实体墙 ${blockingWall.id}，请调整楼梯或墙体边界。` });
      }
    }
  });

  (structure.columns ?? []).forEach((column) => {
    if (column.floorId !== floorId) {
      errors.push({ type: "column", id: column.id, message: "立柱 floorId 与当前楼层不一致。" });
    }
    if (column.columnType !== "cylindrical") {
      errors.push({ type: "column", id: column.id, message: "当前立柱功能只支持圆柱形立柱。" });
    }
    if (!isValidMmPoint(column.center)) {
      pushCoordinateError(errors, column.id, "立柱中心点坐标存在非法值。");
      return;
    }
    if (!isPointInsideFloor(column.center)) {
      pushCoordinateError(errors, column.id, "立柱中心点超出统一楼层坐标范围。");
    }
    if (!isFiniteNumber(column.radius) || column.radius <= 0) {
      errors.push({ type: "column", id: column.id, message: "圆柱立柱半径必须大于 0，单位为 mm。" });
    }
    if (!isFiniteNumber(column.height) || column.height <= 0) {
      errors.push({ type: "column", id: column.id, message: "圆柱立柱高度必须大于 0，单位为 mm。" });
    }
  });

  structure.fences.forEach((fence) => {
    if (fence.floorId !== floorId) {
      errors.push({ type: "outdoor", id: fence.id, message: "篱笆 floorId 与当前楼层不一致。" });
    }
    if (!isValidMmPoint(fence.start) || !isValidMmPoint(fence.end)) {
      pushCoordinateError(errors, fence.id, "篱笆端点坐标存在非法值。");
      return;
    }
    if (!isPointInsideOutdoorBounds(floorId, fence.start) || !isPointInsideOutdoorBounds(floorId, fence.end)) {
      pushCoordinateError(errors, fence.id, "篱笆端点超出真实场地边界。", floorId === "YARD" ? "SITE_BOUNDARY:YARD" : undefined);
    }
    if (getLineLength(fence.start, fence.end) <= 0) {
      errors.push({ type: "outdoor", id: fence.id, message: "篱笆长度必须大于 0。" });
    }
    if (!isFiniteNumber(fence.height) || fence.height <= 0 || !isFiniteNumber(fence.thickness) || fence.thickness <= 0) {
      errors.push({ type: "outdoor", id: fence.id, message: "篱笆必须有合法高度和厚度，单位为 mm。" });
    }
  });

  structure.outdoorSurfaces.forEach((surface) => {
    if (surface.floorId !== floorId) {
      errors.push({ type: "outdoor", id: surface.id, message: "户外面层 floorId 与当前楼层不一致。" });
    }
    if (surface.polygon.length < 3) {
      errors.push({ type: "outdoor", id: surface.id, message: "硬地/小路/绿化区域至少需要 3 个边界点。" });
    }
    if (surface.polygon.some((point) => !isValidMmPoint(point) || !isPointInsideOutdoorBounds(floorId, point))) {
      pushCoordinateError(errors, surface.id, "硬地/小路/绿化区域存在非法坐标或超出真实场地边界。", floorId === "YARD" ? "SITE_BOUNDARY:YARD" : undefined);
    }
    if (!isFiniteNumber(surface.area) || surface.area <= 0) {
      errors.push({ type: "outdoor", id: surface.id, message: "硬地/小路/绿化区域必须有合法面积。" });
    }
  });

  structure.doors.forEach((door) => {
    const host = getHostLine(structure, door.hostId, door.hostType);
    if (door.floorId !== floorId) {
      errors.push({ type: "door", id: door.id, message: "门的 floorId 与当前楼层不一致。" });
    }
    if (!host) {
      errors.push({ type: "door", id: door.id, message: "门必须挂在存在的墙体或隔断上。" });
      return;
    }
    if (!isFiniteNumber(door.positionOnWall) || door.positionOnWall < 0 || door.positionOnWall > 1) {
      errors.push({ type: "door", id: door.id, message: "门窗必须位于墙体线段范围内，positionOnWall 需要在 0~1。" });
    }
    if (!isFiniteNumber(door.width) || door.width <= 0 || !isFiniteNumber(door.height) || door.height <= 0) {
      errors.push({ type: "door", id: door.id, message: "门必须有合法宽度和高度，单位为 mm。" });
    }
    if (connectedRoomCount(door.hostId, structure.rooms, structure.partitions) < 2) {
      infos.push({ type: "door", id: door.id, ruleId: "MISSING_OBJECT_METADATA", category: "metadata", severity: "info", message: "门已挂在墙上，但两侧房间/室外关系还未完整标注。", suggestion: "补齐相邻房间关系。" });
    }
    const point = {
      x: host.start.x + (host.end.x - host.start.x) * door.positionOnWall,
      y: host.start.y + (host.end.y - host.start.y) * door.positionOnWall
    };
    if (projectPointToSegment(point, host.start, host.end).distance > POINT_EPSILON_MM) {
      errors.push({ type: "door", id: door.id, message: "门的位置没有落在宿主墙体/隔断线段上。" });
    }
  });

  structure.windows.forEach((windowObject) => {
    if (windowObject.floorId !== floorId) {
      errors.push({ type: "window", id: windowObject.id, message: "窗的 floorId 与当前楼层不一致。" });
    }
    if (windowObject.hostType !== "wall") {
      errors.push({ type: "window", id: windowObject.id, message: "窗必须挂在墙体或外墙上，不能挂在隔断上。" });
    }
    const host = getHostLine(structure, windowObject.hostId, windowObject.hostType);
    if (!host) {
      errors.push({ type: "window", id: windowObject.id, message: "窗必须挂在存在的墙体上。" });
      return;
    }
    if (!isFiniteNumber(windowObject.positionOnWall) || windowObject.positionOnWall < 0 || windowObject.positionOnWall > 1) {
      errors.push({ type: "window", id: windowObject.id, message: "窗必须位于墙体线段范围内，positionOnWall 需要在 0~1。" });
    }
    if (!isFiniteNumber(windowObject.width) || windowObject.width <= 0 || !isFiniteNumber(windowObject.height) || windowObject.height <= 0) {
      errors.push({ type: "window", id: windowObject.id, message: "窗必须有合法宽度和高度，单位为 mm。" });
    }
  });

  structure.bayWindows.forEach((bayWindow) => {
    if (bayWindow.floorId !== floorId) {
      errors.push({ type: "window", id: bayWindow.id, message: "飘窗的 floorId 与当前楼层不一致。" });
    }
    const host = getHostLine(structure, bayWindow.wallId, "wall");
    if (!host) {
      errors.push({ type: "window", id: bayWindow.id, message: "飘窗必须挂在存在的结构墙上。" });
      return;
    }
    if (!isFiniteNumber(bayWindow.positionOnWall) || bayWindow.positionOnWall < 0 || bayWindow.positionOnWall > 1) {
      errors.push({ type: "window", id: bayWindow.id, message: "飘窗必须位于墙体线段范围内，positionOnWall 需要在 0~1。" });
    }
    if (!isFiniteNumber(bayWindow.width) || bayWindow.width <= 0 || !isFiniteNumber(bayWindow.depth) || bayWindow.depth <= 0 || !isFiniteNumber(bayWindow.height) || bayWindow.height <= 0) {
      errors.push({ type: "window", id: bayWindow.id, message: "飘窗必须有合法宽度、进深和高度，单位为 mm。" });
    }
  });

  structure.skylights.forEach((skylight) => {
    if (skylight.floorId !== floorId) {
      errors.push({ type: "window", id: skylight.id, message: "天窗的 floorId 与当前楼层不一致。" });
    }
    if (!isValidMmPoint(skylight.center) || !isPointInsideFloor(skylight.center)) {
      pushCoordinateError(errors, skylight.id, "天窗中心点坐标非法或超出统一楼层坐标范围。");
    }
    if (!isFiniteNumber(skylight.width) || skylight.width <= 0 || !isFiniteNumber(skylight.depth) || skylight.depth <= 0 || !isFiniteNumber(skylight.height) || skylight.height <= 0) {
      errors.push({ type: "window", id: skylight.id, message: "天窗必须有合法宽度、进深和高度，单位为 mm。" });
    }
  });

  furniture.forEach((item) => {
    if (item.floorId !== floorId) {
      errors.push({ type: "furniture", id: item.id, message: "家具必须有当前楼层 floorId。" });
    }
    if (!item.roomId) {
      errors.push({ type: "furniture", id: item.id, message: "家具必须属于某个 Room 或 Zone。" });
    }
    if (
      !item.dimensions ||
      !isFiniteNumber(item.dimensions.width) ||
      !isFiniteNumber(item.dimensions.depth) ||
      !isFiniteNumber(item.dimensions.height) ||
      item.dimensions.width <= 0 ||
      item.dimensions.depth <= 0 ||
      item.dimensions.height <= 0 ||
      item.dimensions.unit !== "cm"
    ) {
      errors.push({ type: "furniture", id: item.id, message: "家具/硬装模块必须有合法宽度、进深、高度，单位为 cm。" });
    }
    if (!isValidFurniturePercentPoint(floorId, item.position)) {
      pushCoordinateError(errors, item.id, floorId === "1F" || floorId === "YARD"
        ? "家具 overlay 坐标必须落在真实场地或室内图纸范围内。"
        : "家具 overlay 坐标必须使用 0~100 的楼层百分比坐标。");
    }
    if (item.moduleCategory && !item.moduleType) {
      infos.push({ type: "furniture", id: item.id, ruleId: "MISSING_OBJECT_METADATA", category: "metadata", severity: "info", canAutoFix: true, message: "硬装模块缺少 moduleType，后续清单统计可能不完整。", suggestion: "可在类型唯一明确时自动补齐。" });
    }
    if (item.moduleCategory) {
      const serviceRequirements = item.serviceRequirements as Record<string, unknown> | undefined;
      const invalidServiceKeys = MODULE_SERVICE_KEYS.filter((key) => typeof serviceRequirements?.[key] !== "boolean");
      if (invalidServiceKeys.length > 0) {
        infos.push({ type: "furniture", id: item.id, ruleId: "MISSING_OBJECT_METADATA", category: "metadata", severity: "info", message: "硬装模块缺少完整的给水、排水、电源、排烟需求标记。", suggestion: "依据设备规格补齐机电需求。" });
      }
    }
    const linkedGround = groundPolygons.find((ground) => ground.id === item.roomId) ?? null;
    const roomExists = Boolean(linkedGround);
    if (!roomExists) {
      warnings.push({ type: "furniture", id: item.id, ruleId: "ROOM_RELATION", category: "relation", severity: "warning", rootCauseKey: `POSITION:${item.id}`, message: "家具引用的 Room/Zone 不在当前结构房间或院子中，归属需要确认。" });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos
  };
}
