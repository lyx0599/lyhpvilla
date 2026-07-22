import { getDrawingItemGeneratedFingerprint } from "./drawing-items.ts";
import type { DesignWorkspaceId } from "./drawing-workspaces.ts";
import type { ValidationCategory, ValidationSeverity } from "./validation-rules.ts";
import type {
  DrawingItem,
  FloorCoordinateSystem,
  Furniture,
  FurnitureWallAnchor,
  HouseStructure,
  MmPoint,
  StraightHouseWall
} from "../types/space";

export type FurnitureSpaceAssignment = {
  roomId?: string;
  outdoorId?: string;
  primarySpaceId?: string;
  candidateSpaceIds: string[];
  spanning: boolean;
  outside: boolean;
};

export type FurniturePlacementWarningCode =
  | "OUTSIDE_ASSIGNED_SPACE"
  | "CENTER_ROOM_MISMATCH"
  | "SPANS_MULTIPLE_SPACES"
  | "CROSSES_STRUCTURE"
  | "BLOCKS_DOOR"
  | "BLOCKS_WINDOW"
  | "FURNITURE_OVERLAP"
  | "PASSAGE_TOO_NARROW"
  | "MISSING_WALL_HOST"
  | "WALL_HOST_NEEDS_REBIND"
  | "MISSING_MEP_REQUIREMENT"
  | "INSUFFICIENT_SERVICE_CLEARANCE"
  | "RELATED_POINT_NEEDS_SYNC";

export type FurniturePlacementWarning = {
  code: FurniturePlacementWarningCode;
  furnitureId: string;
  relatedObjectId?: string;
  message: string;
  ruleId?: string;
  severity?: ValidationSeverity;
  category?: ValidationCategory;
  actualValue?: string;
  requiredValue?: string;
  checkPosition?: string;
  suggestion?: string;
  canAutoFix?: boolean;
  rootCauseKey?: string;
};

export type FurnitureValidationContext = {
  workspaceId?: DesignWorkspaceId;
};

export type FurnitureWallReconciliationResult = {
  furniture: Furniture[];
  warnings: FurniturePlacementWarning[];
};

const SAMPLE_STEPS = 5;
const POSITION_SYNC_TOLERANCE_MM = 20;

type FurnitureSemanticKind =
  | "rug" | "bed" | "nightstand" | "sofa" | "sideTable" | "coffeeTable"
  | "baseCabinet" | "wallCabinet" | "tallCabinet" | "countertop"
  | "sink" | "cooktop" | "embeddedAppliance" | "appliance" | "sanitary"
  | "wallMounted" | "decorative" | "fireplace" | "dining" | "solidFurniture";

function semanticSource(item: Furniture) {
  return [item.moduleType, item.type, item.render3d?.assetType, item.constructionMeta?.installType]
    .filter(Boolean).join(" ").toLowerCase();
}

export function getFurnitureSemanticKind(item: Furniture): FurnitureSemanticKind {
  const stable = semanticSource(item);
  const legacyName = item.name.toLowerCase();
  if (/rug/.test(stable) || /地毯|地垫/.test(legacyName)) return "rug";
  if (/边几/.test(legacyName)) return "sideTable";
  if (/floorlamp|yardlight|plant|decoration|decor/.test(stable) || /落地灯|庭院灯|绿植|装饰/.test(legacyName)) return "decorative";
  if (/television|\btv\b/.test(stable) || /电视(?!柜)/.test(legacyName)) return "wallMounted";
  if (/wallcabinet/.test(stable) || item.constructionMeta?.installType === "wallMounted") return "wallCabinet";
  if (/cooktop|hob/.test(stable)) return "cooktop";
  if (/sink|basin/.test(stable)) return "sink";
  if (/fridge|dishwasher|oven|steamoven/.test(stable) || item.constructionMeta?.installType === "embedded") return "embeddedAppliance";
  if (/nightstand/.test(stable)) return "nightstand";
  if (/coffeetable|loungecoffeetable/.test(stable)) return "coffeeTable";
  if (/sidetable/.test(stable) || /边几/.test(legacyName)) return "sideTable";
  if (/bed/.test(stable)) return "bed";
  if (/sofa/.test(stable)) return "sofa";
  if (/fireplace/.test(stable)) return "fireplace";
  if (/toilet|shower|bathtub|vanity/.test(stable)) return "sanitary";
  if (/wallmounted|walllight|under.?cabinet/.test(stable)) return "wallMounted";
  if (/tallcabinet|wardrobe|entrycabinet|sideboard|bookshelf/.test(stable)) return "tallCabinet";
  if (/kitchencabinet|cabinet|island|snackcabinet/.test(stable)) return "baseCabinet";
  if (/countertop|worktop|台面/.test(stable) || /台面/.test(legacyName)) return "countertop";
  if (/fridge|washer|dryer|appliance/.test(stable)) return "appliance";
  if (/dining|chair|table/.test(stable)) return "dining";
  return "solidFurniture";
}

export function getFurnitureHeightInterval(item: Furniture) {
  const kind = getFurnitureSemanticKind(item);
  const configuredElevation = item.render3d?.elevationMm;
  const inferredElevation = kind === "wallCabinet" ? 1350 : kind === "wallMounted" ? 1100 : 0;
  const minZ = configuredElevation ?? inferredElevation;
  return { minZ, maxZ: minZ + item.dimensions.height * 10 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCoordinateSystem(structure: HouseStructure): FloorCoordinateSystem {
  return structure.coordinateSystem;
}

export function getFurnitureCenterMm(furniture: Furniture, structure: HouseStructure): MmPoint {
  const system = getCoordinateSystem(structure);
  return {
    x: system.origin.x + furniture.position.x / 100 * system.width,
    y: system.origin.y + furniture.position.y / 100 * system.height
  };
}

function centerMmToPosition(center: MmPoint, structure: HouseStructure) {
  const system = getCoordinateSystem(structure);
  return {
    x: (center.x - system.origin.x) / system.width * 100,
    y: (center.y - system.origin.y) / system.height * 100
  };
}

function rotateLocalPoint(point: MmPoint, rotationDeg: number) {
  const radians = rotationDeg * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

export function getFurnitureFootprint(furniture: Furniture, structure: HouseStructure): MmPoint[] {
  const center = getFurnitureCenterMm(furniture, structure);
  const halfWidth = furniture.dimensions.width * 5;
  const halfDepth = furniture.dimensions.depth * 5;
  return [
    { x: -halfWidth, y: -halfDepth },
    { x: halfWidth, y: -halfDepth },
    { x: halfWidth, y: halfDepth },
    { x: -halfWidth, y: halfDepth }
  ].map((point) => {
    const rotated = rotateLocalPoint(point, furniture.position.rotation);
    return { x: center.x + rotated.x, y: center.y + rotated.y };
  });
}

export function pointInPolygon(point: MmPoint, polygon: MmPoint[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < (previousPoint.x - currentPoint.x) * (point.y - currentPoint.y) / ((previousPoint.y - currentPoint.y) || Number.EPSILON) + currentPoint.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function getFurnitureSamplePoints(furniture: Furniture, structure: HouseStructure) {
  const center = getFurnitureCenterMm(furniture, structure);
  const width = furniture.dimensions.width * 10;
  const depth = furniture.dimensions.depth * 10;
  const points: MmPoint[] = [];
  for (let row = 0; row < SAMPLE_STEPS; row += 1) {
    for (let column = 0; column < SAMPLE_STEPS; column += 1) {
      const local = {
        x: -width / 2 + width * column / (SAMPLE_STEPS - 1),
        y: -depth / 2 + depth * row / (SAMPLE_STEPS - 1)
      };
      const rotated = rotateLocalPoint(local, furniture.position.rotation);
      points.push({ x: center.x + rotated.x, y: center.y + rotated.y });
    }
  }
  return points;
}

export function resolveFurnitureSpaceAssignment(furniture: Furniture, structure: HouseStructure): FurnitureSpaceAssignment {
  const spaces = [
    ...structure.rooms.map((room) => ({ id: room.id, kind: "room" as const, polygon: room.boundary })),
    ...structure.outdoors.map((outdoor) => ({ id: outdoor.id, kind: "outdoor" as const, polygon: outdoor.polygon }))
  ];
  const center = getFurnitureCenterMm(furniture, structure);
  const samples = getFurnitureSamplePoints(furniture, structure);
  const scores = spaces.map((space) => ({
    ...space,
    centerInside: pointInPolygon(center, space.polygon),
    score: samples.filter((point) => pointInPolygon(point, space.polygon)).length
  })).filter((space) => space.score > 0 || space.centerInside);
  const centered = scores.find((space) => space.centerInside);
  const primary = centered ?? scores.slice().sort((left, right) => right.score - left.score)[0];
  const candidateSpaceIds = scores.filter((space) => space.score > 0).map((space) => space.id);
  return {
    roomId: primary?.kind === "room" ? primary.id : undefined,
    outdoorId: primary?.kind === "outdoor" ? primary.id : undefined,
    primarySpaceId: primary?.id,
    candidateSpaceIds,
    spanning: candidateSpaceIds.length > 1,
    outside: !primary
  };
}

export function commitFurnitureSpaceAssignment(furniture: Furniture, structure: HouseStructure) {
  const assignment = resolveFurnitureSpaceAssignment(furniture, structure);
  if (furniture.roomAssignmentLocked || !assignment.primarySpaceId) return { furniture, assignment };
  return {
    furniture: {
      ...furniture,
      roomId: assignment.primarySpaceId,
      outdoorId: assignment.outdoorId
    },
    assignment
  };
}

function straightWalls(structure: HouseStructure) {
  return structure.walls.filter((wall): wall is StraightHouseWall => wall.kind === "straight");
}

function projectPointToWall(point: MmPoint, wall: StraightHouseWall) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const lengthSquared = dx * dx + dy * dy;
  const rawT = lengthSquared ? ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / lengthSquared : 0;
  const t = clamp(rawT, 0, 1);
  const projected = { x: wall.start.x + dx * t, y: wall.start.y + dy * t };
  const length = Math.max(1, Math.hypot(dx, dy));
  const signedDistance = ((point.x - projected.x) * -dy + (point.y - projected.y) * dx) / length;
  return { t, projected, signedDistance, distance: Math.abs(signedDistance) };
}

function applyWallAnchor(furniture: Furniture, structure: HouseStructure, wall: StraightHouseWall, anchor: FurnitureWallAnchor): Furniture {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const point = {
    x: wall.start.x + dx * clamp(anchor.positionOnWall, 0, 1),
    y: wall.start.y + dy * clamp(anchor.positionOnWall, 0, 1)
  };
  const sideSign = anchor.side === "left" ? 1 : anchor.side === "right" ? -1 : 0;
  const centerDistance = anchor.side === "center"
    ? anchor.offsetMm
    : wall.thickness / 2 + furniture.dimensions.depth * 5 + anchor.offsetMm;
  const center = {
    x: point.x + (-dy / length) * centerDistance * sideSign,
    y: point.y + (dx / length) * centerDistance * sideSign
  };
  const position = centerMmToPosition(center, structure);
  const wallRotation = Math.atan2(dy, dx) * 180 / Math.PI;
  const { suggestedWallId: _suggestedWallId, ...activeAnchor } = anchor;
  return {
    ...furniture,
    hostWallId: wall.id,
    wallAnchor: { ...activeAnchor, positionOnWall: clamp(anchor.positionOnWall, 0, 1), needsRebind: false },
    position: {
      ...furniture.position,
      x: position.x,
      y: position.y,
      rotation: (wallRotation + (anchor.side === "right" ? 180 : 0) + 360) % 360
    }
  };
}

export function anchorFurnitureToWall(
  furniture: Furniture,
  structure: HouseStructure,
  wallId?: string,
  patch: Partial<FurnitureWallAnchor> = {}
) {
  const center = getFurnitureCenterMm(furniture, structure);
  const candidates = straightWalls(structure).map((wall) => ({ wall, projection: projectPointToWall(center, wall) }));
  const chosen = wallId
    ? candidates.find((candidate) => candidate.wall.id === wallId)
    : candidates.slice().sort((left, right) => left.projection.distance - right.projection.distance)[0];
  if (!chosen) return furniture;
  const current = furniture.wallAnchor;
  const side = patch.side ?? current?.side ?? (chosen.projection.signedDistance >= 0 ? "left" : "right");
  const anchor: FurnitureWallAnchor = {
    positionOnWall: patch.positionOnWall ?? chosen.projection.t,
    offsetMm: Math.max(0, patch.offsetMm ?? current?.offsetMm ?? Math.max(0, chosen.projection.distance - chosen.wall.thickness / 2 - furniture.dimensions.depth * 5)),
    side,
    followWall: patch.followWall ?? current?.followWall ?? true,
    needsRebind: false
  };
  return applyWallAnchor(furniture, structure, chosen.wall, anchor);
}

export function refreshFurnitureWallAnchorFromPosition(furniture: Furniture, structure: HouseStructure): Furniture {
  if (!furniture.hostWallId || !furniture.wallAnchor) return furniture;
  const wall = straightWalls(structure).find((candidate) => candidate.id === furniture.hostWallId);
  if (!wall) return { ...furniture, wallAnchor: { ...furniture.wallAnchor, needsRebind: true } };
  const projection = projectPointToWall(getFurnitureCenterMm(furniture, structure), wall);
  const side: FurnitureWallAnchor["side"] = Math.abs(projection.signedDistance) < 1 ? "center" : projection.signedDistance > 0 ? "left" : "right";
  const { suggestedWallId: _suggestedWallId, ...activeAnchor } = furniture.wallAnchor;
  return {
    ...furniture,
    wallAnchor: {
      ...activeAnchor,
      positionOnWall: Number(projection.t.toFixed(6)),
      side,
      offsetMm: Math.max(0, Math.round(projection.distance - (side === "center" ? 0 : wall.thickness / 2 + furniture.dimensions.depth * 5))),
      needsRebind: false
    }
  };
}

export function reconcileFurnitureWallAnchors(
  previousStructure: HouseStructure,
  nextStructure: HouseStructure,
  furniture: Furniture[]
): FurnitureWallReconciliationResult {
  const warnings: FurniturePlacementWarning[] = [];
  const nextWalls = straightWalls(nextStructure);
  return {
    furniture: furniture.map((item) => {
      if (!item.hostWallId || !item.wallAnchor?.followWall) return item;
      const wall = nextWalls.find((candidate) => candidate.id === item.hostWallId);
      if (wall) return applyWallAnchor(item, nextStructure, wall, item.wallAnchor);
      const oldWall = straightWalls(previousStructure).find((candidate) => candidate.id === item.hostWallId);
      const oldPoint = oldWall
        ? { x: oldWall.start.x + (oldWall.end.x - oldWall.start.x) * item.wallAnchor.positionOnWall, y: oldWall.start.y + (oldWall.end.y - oldWall.start.y) * item.wallAnchor.positionOnWall }
        : getFurnitureCenterMm(item, previousStructure);
      const suggestion = nextWalls.map((candidate) => ({ wall: candidate, distance: projectPointToWall(oldPoint, candidate).distance }))
        .sort((left, right) => left.distance - right.distance)[0];
      warnings.push({
        code: "WALL_HOST_NEEDS_REBIND",
        furnitureId: item.id,
        relatedObjectId: item.hostWallId,
        message: `${item.name} 的原墙体 ${item.hostWallId} 已删除或更名，请确认新的靠墙关系。`
      });
      return {
        ...item,
        wallAnchor: { ...item.wallAnchor, needsRebind: true, suggestedWallId: suggestion?.wall.id }
      };
    }),
    warnings
  };
}

function getBounds(points: MmPoint[]) {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y))
  };
}

function boundsIntersect(left: ReturnType<typeof getBounds>, right: ReturnType<typeof getBounds>, padding = 0) {
  return left.minX <= right.maxX + padding && left.maxX >= right.minX - padding && left.minY <= right.maxY + padding && left.maxY >= right.minY - padding;
}

function boundsOverlapDepth(left: ReturnType<typeof getBounds>, right: ReturnType<typeof getBounds>) {
  return {
    x: Math.min(left.maxX, right.maxX) - Math.max(left.minX, right.minX),
    y: Math.min(left.maxY, right.maxY) - Math.max(left.minY, right.minY)
  };
}

function segmentBounds(start: MmPoint, end: MmPoint, padding = 0) {
  return { minX: Math.min(start.x, end.x) - padding, maxX: Math.max(start.x, end.x) + padding, minY: Math.min(start.y, end.y) - padding, maxY: Math.max(start.y, end.y) + padding };
}

function orientation(a: MmPoint, b: MmPoint, c: MmPoint) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsIntersect(a: MmPoint, b: MmPoint, c: MmPoint, d: MmPoint) {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0));
}

function polygonsIntersect(left: MmPoint[], right: MmPoint[]) {
  if (left.some((point) => pointInPolygon(point, right)) || right.some((point) => pointInPolygon(point, left))) return true;
  return left.some((start, index) => {
    const end = left[(index + 1) % left.length];
    return right.some((otherStart, otherIndex) => segmentsIntersect(start, end, otherStart, right[(otherIndex + 1) % right.length]));
  });
}

function lineCrossesFurniture(start: MmPoint, end: MmPoint, footprint: MmPoint[]) {
  const center = {
    x: footprint.reduce((sum, point) => sum + point.x, 0) / footprint.length,
    y: footprint.reduce((sum, point) => sum + point.y, 0) / footprint.length
  };
  const inset = footprint.map((point) => ({
    x: center.x + (point.x - center.x) * 0.88,
    y: center.y + (point.y - center.y) * 0.88
  }));
  if (pointInPolygon(start, inset) || pointInPolygon(end, inset)) return true;
  return inset.some((edgeStart, index) => segmentsIntersect(start, end, edgeStart, inset[(index + 1) % inset.length]));
}

function openingClearancePolygon(structure: HouseStructure, hostId: string, positionOnWall: number, width: number, depth: number) {
  const host = getHostLine(structure, hostId);
  if (!host) return null;
  const dx = host.end.x - host.start.x;
  const dy = host.end.y - host.start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const center = { x: host.start.x + dx * positionOnWall, y: host.start.y + dy * positionOnWall };
  const tangent = { x: dx / length, y: dy / length };
  const normal = { x: -dy / length, y: dx / length };
  const halfWidth = width / 2;
  return [
    { x: center.x - tangent.x * halfWidth - normal.x * depth, y: center.y - tangent.y * halfWidth - normal.y * depth },
    { x: center.x + tangent.x * halfWidth - normal.x * depth, y: center.y + tangent.y * halfWidth - normal.y * depth },
    { x: center.x + tangent.x * halfWidth + normal.x * depth, y: center.y + tangent.y * halfWidth + normal.y * depth },
    { x: center.x - tangent.x * halfWidth + normal.x * depth, y: center.y - tangent.y * halfWidth + normal.y * depth }
  ];
}

function doorClearancePolygon(structure: HouseStructure, door: HouseStructure["doors"][number]) {
  const host = getHostLine(structure, door.hostId);
  if (!host) return null;
  const dx = host.end.x - host.start.x;
  const dy = host.end.y - host.start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const center = { x: host.start.x + dx * door.positionOnWall, y: host.start.y + dy * door.positionOnWall };
  const tangent = { x: dx / length, y: dy / length };
  const normalBase = { x: -dy / length, y: dx / length };
  const inward = /In$/.test(door.openDirection);
  const normal = inward ? normalBase : { x: -normalBase.x, y: -normalBase.y };
  const hingeOnLeft = door.openDirection.startsWith("left");
  const along = hingeOnLeft ? tangent : { x: -tangent.x, y: -tangent.y };
  const halfWidth = door.width / 2;
  if (door.operation === "sliding") {
    return openingClearancePolygon(structure, door.hostId, door.positionOnWall, door.width, 220);
  }
  const hinge = { x: center.x - along.x * halfWidth, y: center.y - along.y * halfWidth };
  return [
    { x: hinge.x - normal.x * 120, y: hinge.y - normal.y * 120 },
    { x: hinge.x + along.x * door.width - normal.x * 120, y: hinge.y + along.y * door.width - normal.y * 120 },
    { x: hinge.x + along.x * door.width + normal.x * door.width, y: hinge.y + along.y * door.width + normal.y * door.width },
    { x: hinge.x + normal.x * door.width, y: hinge.y + normal.y * door.width }
  ];
}

function operationFaceZone(item: Furniture, structure: HouseStructure, requiredMm: number) {
  const footprint = getFurnitureFootprint(item, structure);
  const center = getFurnitureCenterMm(item, structure);
  const radians = item.position.rotation * Math.PI / 180;
  const front = { x: -Math.sin(radians), y: Math.cos(radians) };
  const side = { x: Math.cos(radians), y: Math.sin(radians) };
  const halfWidth = item.dimensions.width * 5;
  const halfDepth = item.dimensions.depth * 5;
  const edgeCenter = { x: center.x + front.x * halfDepth, y: center.y + front.y * halfDepth };
  return {
    footprint,
    polygon: [
      { x: edgeCenter.x - side.x * halfWidth, y: edgeCenter.y - side.y * halfWidth },
      { x: edgeCenter.x + side.x * halfWidth, y: edgeCenter.y + side.y * halfWidth },
      { x: edgeCenter.x + side.x * halfWidth + front.x * requiredMm, y: edgeCenter.y + side.y * halfWidth + front.y * requiredMm },
      { x: edgeCenter.x - side.x * halfWidth + front.x * requiredMm, y: edgeCenter.y - side.y * halfWidth + front.y * requiredMm }
    ],
    front
  };
}

function distanceBetweenBounds(left: ReturnType<typeof getBounds>, right: ReturnType<typeof getBounds>) {
  const gapX = Math.max(0, right.minX - left.maxX, left.minX - right.maxX);
  const gapY = Math.max(0, right.minY - left.maxY, left.minY - right.maxY);
  return Math.round(Math.hypot(gapX, gapY));
}

function getHostLine(structure: HouseStructure, hostId: string) {
  return structure.walls.find((wall): wall is StraightHouseWall => wall.id === hostId && wall.kind === "straight")
    ?? structure.partitions.find((partition) => partition.id === hostId);
}

function isCustomOrFixedFurniture(item: Furniture) {
  const installType = item.constructionMeta?.installType;
  return Boolean(item.constructionMeta?.customMade || item.cabinetDesign || item.wardrobeDesign || ["customCabinet", "builtIn", "wallMounted", "embedded"].includes(installType ?? ""));
}

function intervalsOverlap(left: ReturnType<typeof getFurnitureHeightInterval>, right: ReturnType<typeof getFurnitureHeightInterval>) {
  return left.minZ < right.maxZ - 10 && right.minZ < left.maxZ - 10;
}

const cabinetKinds = new Set<FurnitureSemanticKind>(["baseCabinet", "wallCabinet", "tallCabinet", "countertop"]);
const integratedKinds = new Set<FurnitureSemanticKind>(["sink", "cooktop", "embeddedAppliance"]);

export function shouldCheckCollision(left: Furniture, right: Furniture) {
  const leftKind = getFurnitureSemanticKind(left);
  const rightKind = getFurnitureSemanticKind(right);
  if (leftKind === "rug" || rightKind === "rug") return false;
  if (leftKind === "decorative" || rightKind === "decorative") return false;
  const adjacency = new Set([leftKind, rightKind]);
  if (adjacency.has("bed") && adjacency.has("nightstand") || adjacency.has("sofa") && adjacency.has("sideTable")) return false;
  if ((integratedKinds.has(leftKind) && cabinetKinds.has(rightKind)) || (integratedKinds.has(rightKind) && cabinetKinds.has(leftKind))) return false;
  if ((leftKind === "countertop" && cabinetKinds.has(rightKind)) || (rightKind === "countertop" && cabinetKinds.has(leftKind))) return false;
  const outdoorPair = new Set([left.outdoorObjectType, right.outdoorObjectType]);
  if (outdoorPair.has("outdoorIsland") && (outdoorPair.has("bbq") || outdoorPair.has("waterTap"))) return false;
  if (left.outdoorZoneId && left.outdoorZoneId === right.outdoorZoneId && outdoorPair.has("outdoorCabinet") && outdoorPair.has("hoseReel")) return false;
  if (left.outdoorZoneId && left.outdoorZoneId === right.outdoorZoneId && (
    (left.render3d?.assetType === "outdoorSocket" && right.outdoorObjectType === "outdoorCabinet")
    || (right.render3d?.assetType === "outdoorSocket" && left.outdoorObjectType === "outdoorCabinet")
  )) return false;
  if (outdoorPair.has("shadeUmbrella") && [left, right].some((item) => item.outdoorObjectType === "outdoorCabinet" && /休闲|桌椅|茶几/.test(item.name))) return false;
  return intervalsOverlap(getFurnitureHeightInterval(left), getFurnitureHeightInterval(right));
}

function isIntentionalFurnitureAdjacency(left: Furniture, right: Furniture) {
  const pair = new Set([getFurnitureSemanticKind(left), getFurnitureSemanticKind(right)]);
  return pair.has("bed") && pair.has("nightstand")
    || pair.has("sofa") && pair.has("sideTable")
    || pair.has("sofa") && pair.has("coffeeTable");
}

function missingMepLabels(item: Furniture) {
  const requirements = item.serviceRequirements;
  if (!requirements) return [];
  const mep = item.mepMeta ?? {};
  return [
    requirements.power && !mep.needsSocket ? "电源" : "",
    requirements.water && !mep.needsWaterSupply ? "给水" : "",
    requirements.drainage && !mep.needsDrainage ? "排水" : "",
    requirements.exhaust && !mep.needsVentilation ? "通风" : ""
  ].filter(Boolean);
}

export function isDrawingItemManuallyAdjusted(item: DrawingItem) {
  return Boolean(item.generatedKey && (!item.generatedFingerprint || getDrawingItemGeneratedFingerprint(item) !== item.generatedFingerprint));
}

export function getRelatedDrawingItemSyncState(item: DrawingItem, furniture: Furniture, structure: HouseStructure) {
  if (item.relatedFurnitureId !== furniture.id || !item.relatedFurniturePositionMm) return { needsSync: false, deltaMm: { x: 0, y: 0 }, distanceMm: 0, canMoveWithFurniture: false };
  const center = getFurnitureCenterMm(furniture, structure);
  const deltaMm = { x: center.x - item.relatedFurniturePositionMm.x, y: center.y - item.relatedFurniturePositionMm.y };
  const distanceMm = Math.hypot(deltaMm.x, deltaMm.y);
  return {
    needsSync: distanceMm > POSITION_SYNC_TOLERANCE_MM,
    deltaMm,
    distanceMm,
    canMoveWithFurniture: Boolean(item.generatedKey && item.generatedFingerprint && !isDrawingItemManuallyAdjusted(item))
  };
}

export function syncRelatedDrawingItemsToFurniture(
  items: DrawingItem[],
  furniture: Furniture,
  structure: HouseStructure,
  options: { moveUntouchedGenerated?: boolean; markReviewed?: boolean } = {}
) {
  const center = getFurnitureCenterMm(furniture, structure);
  return items.map((item) => {
    if (item.relatedFurnitureId !== furniture.id) return item;
    const state = getRelatedDrawingItemSyncState(item, furniture, structure);
    const shouldMove = options.moveUntouchedGenerated && state.needsSync && state.canMoveWithFurniture;
    const next: DrawingItem = {
      ...item,
      positionMm: shouldMove ? { x: item.positionMm.x + state.deltaMm.x, y: item.positionMm.y + state.deltaMm.y } : item.positionMm,
      roomId: shouldMove ? furniture.roomId : item.roomId,
      relatedRoomId: shouldMove ? furniture.roomId : item.relatedRoomId,
      relatedFurniturePositionMm: shouldMove || options.markReviewed ? { x: Math.round(center.x), y: Math.round(center.y) } : item.relatedFurniturePositionMm,
      updatedAt: shouldMove || options.markReviewed ? new Date().toISOString() : item.updatedAt
    };
    if (shouldMove && next.generatedFingerprint) next.generatedFingerprint = getDrawingItemGeneratedFingerprint(next);
    return next;
  });
}

export function validateFurniturePlacement(structure: HouseStructure, furniture: Furniture[], drawingItems: DrawingItem[] = [], context: FurnitureValidationContext = {}) {
  const warnings: FurniturePlacementWarning[] = [];
  const includeGeometry = !context.workspaceId || context.workspaceId === "furniture" || structure.floorId === "YARD";
  const includeMepMetadata = !context.workspaceId || context.workspaceId === "mep";
  const push = (warning: FurniturePlacementWarning) => warnings.push(warning);
  const footprints = new Map(furniture.map((item) => [item.id, getFurnitureFootprint(item, structure)]));
  const bounds = new Map(Array.from(footprints, ([id, points]) => [id, getBounds(points)]));
  const spacePolygons = new Map<string, MmPoint[]>([
    ...structure.rooms.map((room): [string, MmPoint[]] => [room.id, room.boundary]),
    ...structure.outdoors.map((outdoor): [string, MmPoint[]] => [outdoor.id, outdoor.polygon])
  ]);

  furniture.forEach((item) => {
    const footprint = footprints.get(item.id) ?? [];
    const kind = getFurnitureSemanticKind(item);
    const assignment = resolveFurnitureSpaceAssignment(item, structure);
    const assignedPolygon = spacePolygons.get(item.roomId);
    const outsideCornerCount = assignedPolygon ? footprint.filter((point) => !pointInPolygon(point, assignedPolygon)).length : 0;
    if (includeGeometry && assignedPolygon && outsideCornerCount > 0 && (kind !== "rug" || outsideCornerCount >= 2)) {
      const clearlyOutside = outsideCornerCount >= Math.ceil(footprint.length / 2);
      push({ code: "OUTSIDE_ASSIGNED_SPACE", ruleId: "FURNITURE_OUTSIDE_SPACE", severity: kind === "rug" || structure.floorId === "YARD" || !clearlyOutside ? "warning" : "error", category: "geometry", furnitureId: item.id, relatedObjectId: item.roomId, actualValue: `${outsideCornerCount}/${footprint.length} 个角点越界`, requiredValue: structure.floorId === "YARD" ? "位于真实场地 polygon 内" : "完整位于有效空间内", rootCauseKey: `POSITION:${item.id}`, message: kind === "rug" ? `${item.name} 明显超出所属空间，请确认软装覆盖范围。` : structure.floorId === "YARD" ? `${item.name} 接近或局部超出场地边界，需要确认。` : clearlyOutside ? `${item.name} 明显超出所属空间。` : `${item.name} 接近空间边界，需要确认。`, suggestion: "目视确认边界与对象定位；不要自动移动对象。" });
    }
    if (includeGeometry && assignment.primarySpaceId && assignment.primarySpaceId !== item.roomId) push({ code: "CENTER_ROOM_MISMATCH", ruleId: "ROOM_RELATION", severity: "warning", category: "relation", furnitureId: item.id, relatedObjectId: assignment.primarySpaceId, rootCauseKey: `POSITION:${item.id}`, message: `${item.name} 的中心点位于 ${assignment.primarySpaceId}，与 roomId ${item.roomId} 不一致。`, suggestion: "确认对象归属；只有候选空间唯一时才可自动补齐 roomId。", canAutoFix: assignment.candidateSpaceIds.length === 1 });
    if (includeGeometry && assignment.spanning && kind !== "rug") push({ code: "SPANS_MULTIPLE_SPACES", ruleId: "ROOM_RELATION", severity: "warning", category: "relation", furnitureId: item.id, rootCauseKey: `POSITION:${item.id}`, message: `${item.name} 跨越 ${assignment.candidateSpaceIds.join("、")}，归属存在歧义。`, suggestion: "人工确认对象属于哪个空间或是否为跨空间固定构件。" });
    const itemBounds = bounds.get(item.id)!;
    if (includeGeometry && kind !== "rug" && kind !== "wallMounted") [...straightWalls(structure), ...structure.partitions].forEach((host) => {
      if (host.id === item.hostWallId) return;
      if (boundsIntersect(itemBounds, segmentBounds(host.start, host.end)) && lineCrossesFurniture(host.start, host.end, footprint)) push({ code: "CROSSES_STRUCTURE", ruleId: "FURNITURE_CROSSES_STRUCTURE", severity: "error", category: "geometry", furnitureId: item.id, relatedObjectId: host.id, rootCauseKey: `POSITION:${item.id}`, message: `${item.name} 的实体轮廓穿越 ${host.name}。`, suggestion: "核对定位、旋转角度和墙体边界。" });
    });
    if (includeGeometry && kind !== "rug" && kind !== "wallMounted") structure.doors.forEach((door) => {
      const clearance = doorClearancePolygon(structure, door);
      if (!clearance || !polygonsIntersect(footprint, clearance)) return;
      const overlap = boundsOverlapDepth(itemBounds, getBounds(clearance));
      const fullyBlocks = Math.min(overlap.x, overlap.y) >= Math.min(door.width * 0.35, 300);
      push({ code: "BLOCKS_DOOR", ruleId: "DOOR_CLEARANCE", severity: fullyBlocks ? "error" : "warning", category: "geometry", furnitureId: item.id, relatedObjectId: door.id, actualValue: `侵入开启区约 ${Math.max(0, Math.round(Math.min(overlap.x, overlap.y)))}mm`, requiredValue: "门洞及开启范围无实体阻挡", checkPosition: door.operation === "sliding" ? "门洞净宽" : `${door.openDirection} 开启侧`, rootCauseKey: `DOOR:${door.id}:${item.id}`, message: fullyBlocks ? `${item.name} 明显进入 ${door.name} 的门洞或门扇开启范围。` : `${item.name} 靠近 ${door.name} 的开启范围，需要确认。`, suggestion: "结合门扇方向目视确认；必要时调整家具或门扇方案。" });
    });
    if (includeGeometry && kind !== "rug" && kind !== "wallMounted") structure.windows.forEach((windowObject) => {
      const clearance = openingClearancePolygon(structure, windowObject.hostId, windowObject.positionOnWall, windowObject.width + 200, 300);
      if (!clearance || !polygonsIntersect(footprint, clearance)) return;
      const height = getFurnitureHeightInterval(item);
      if (windowObject.operation === "fixed") return;
      if (windowObject.sillHeightMm !== undefined && height.maxZ <= windowObject.sillHeightMm) return;
      const lacksOpeningData = windowObject.sillHeightMm === undefined || windowObject.operation === undefined;
      push({ code: "BLOCKS_WINDOW", ruleId: "WINDOW_OPERATION", severity: "warning", category: lacksOpeningData ? "metadata" : "geometry", furnitureId: item.id, relatedObjectId: windowObject.id, actualValue: `家具高度 ${Math.round(height.maxZ)}mm${windowObject.sillHeightMm === undefined ? "" : `，窗台 ${windowObject.sillHeightMm}mm`}`, requiredValue: "不影响开启与操作", checkPosition: "窗前操作区", rootCauseKey: `WINDOW:${windowObject.id}:${item.id}`, message: lacksOpeningData ? `${item.name} 位于 ${windowObject.name} 前方，但窗台高度或开启方式资料不足，无法判定是否遮挡。` : `${item.name} 可能影响 ${windowObject.name} 的开启或操作。`, suggestion: lacksOpeningData ? "补齐窗台高度和开启方式后重新检查。" : "结合开启方向和家具高度目视确认。" });
    });
    if ((!context.workspaceId || context.workspaceId === "furniture") && isCustomOrFixedFurniture(item) && !item.hostWallId) push({ code: "MISSING_WALL_HOST", ruleId: "MISSING_OBJECT_METADATA", severity: "info", category: "metadata", furnitureId: item.id, rootCauseKey: `HOST:${item.id}`, message: `${item.name} 属于定制或固定安装对象，但尚未绑定墙体。`, suggestion: "存在唯一宿主墙时可自动绑定；墙角或多候选情况需要人工确认。", canAutoFix: false });
    if ((!context.workspaceId || context.workspaceId === "furniture") && item.wallAnchor?.needsRebind) push({ code: "WALL_HOST_NEEDS_REBIND", ruleId: "ROOM_RELATION", severity: "warning", category: "relation", furnitureId: item.id, relatedObjectId: item.hostWallId, rootCauseKey: `HOST:${item.id}`, message: `${item.name} 的墙体关联需要重新确认。` });
    const missingMep = missingMepLabels(item);
    if (includeMepMetadata && missingMep.length) push({ code: "MISSING_MEP_REQUIREMENT", ruleId: "MISSING_OBJECT_METADATA", severity: "info", category: "metadata", furnitureId: item.id, rootCauseKey: `MEP:${item.id}`, message: `${item.name} 缺少必要机电需求：${missingMep.join("、")}。`, suggestion: "依据设备规格补齐电源、给水、排水或通风资料。" });
    if (includeMepMetadata && item.constructionMeta?.inspectionAccessRequired && (item.clearanceMeta?.serviceMm ?? 0) < 300) push({ code: "INSUFFICIENT_SERVICE_CLEARANCE", ruleId: "OPERATION_CLEARANCE", severity: "warning", category: "geometry", furnitureId: item.id, actualValue: `${item.clearanceMeta?.serviceMm ?? 0}mm`, requiredValue: "≥300mm", checkPosition: "设备检修面", rootCauseKey: `SERVICE:${item.id}`, message: `${item.name} 需要检修，但检修空间未设置或不足 300mm。` });
    drawingItems.filter((drawingItem) => drawingItem.relatedFurnitureId === item.id).forEach((drawingItem) => {
      if (includeMepMetadata && getRelatedDrawingItemSyncState(drawingItem, item, structure).needsSync) push({ code: "RELATED_POINT_NEEDS_SYNC", ruleId: "MISSING_OBJECT_METADATA", severity: "info", category: "metadata", furnitureId: item.id, relatedObjectId: drawingItem.id, rootCauseKey: `MEP:${item.id}`, message: `${drawingItem.label} 仍在家具移动前的位置，需要同步派生点位。`, suggestion: "同步未手工调整的派生点位。", canAutoFix: getRelatedDrawingItemSyncState(drawingItem, item, structure).canMoveWithFurniture });
    });
  });

  for (let leftIndex = 0; leftIndex < furniture.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < furniture.length; rightIndex += 1) {
      const left = furniture[leftIndex];
      const right = furniture[rightIndex];
      if (!includeGeometry || !shouldCheckCollision(left, right)) continue;
      const leftBounds = bounds.get(left.id)!;
      const rightBounds = bounds.get(right.id)!;
      const overlap = boundsOverlapDepth(leftBounds, rightBounds);
      if (overlap.x > 30 && overlap.y > 30) {
        push({ code: "FURNITURE_OVERLAP", ruleId: "FURNITURE_OVERLAP_3D", severity: "error", category: "geometry", furnitureId: left.id, relatedObjectId: right.id, actualValue: `${Math.round(overlap.x)}×${Math.round(overlap.y)}mm 平面交叠，且高度区间重叠`, requiredValue: "实体体积不重叠", rootCauseKey: `OVERLAP:${[left.id, right.id].sort().join(":")}`, message: `${left.name} 与 ${right.name} 发生不可接受的三维实体重叠。`, suggestion: "确认是否属于同一组合；否则调整定位或尺寸。" });
        continue;
      }
      if (left.roomId !== right.roomId || isIntentionalFurnitureAdjacency(left, right)) continue;
      for (const [operationItem, obstacle] of [[left, right], [right, left]] as const) {
        const required = operationItem.clearanceMeta?.frontMm ?? getRecommendedClearance(operationItem).frontMm;
        if (!required) continue;
        const zone = operationFaceZone(operationItem, structure, required);
        const obstacleFootprint = footprints.get(obstacle.id)!;
        if (!polygonsIntersect(zone.polygon, obstacleFootprint)) continue;
        const actual = distanceBetweenBounds(bounds.get(operationItem.id)!, bounds.get(obstacle.id)!);
        push({ code: "PASSAGE_TOO_NARROW", ruleId: "OPERATION_CLEARANCE", severity: "warning", category: "geometry", furnitureId: operationItem.id, relatedObjectId: obstacle.id, actualValue: `${actual}mm`, requiredValue: `≥${required}mm`, checkPosition: `${operationItem.name} 正面操作面`, rootCauseKey: `CLEARANCE:${[operationItem.id, obstacle.id].sort().join(":")}`, message: `${operationItem.name} 正面操作净空约 ${actual}mm，低于配置要求 ${required}mm。`, suggestion: "目视确认实际操作方向；必要时调整对象位置或净空配置。" });
      }
    }
  }
  return warnings;
}

export function getRecommendedClearance(item: Furniture) {
  const type = `${item.type} ${item.moduleType ?? ""} ${item.render3d?.assetType ?? ""}`.toLowerCase();
  if (/wardrobe|cabinet|drawer|fridge|dishwasher/.test(type)) return { frontMm: 900, rearMm: /fridge/.test(type) ? 100 : 0, serviceMm: /fridge|dishwasher/.test(type) ? 600 : undefined, doorSwingMm: 700 };
  if (/washer|dryer/.test(type)) return { frontMm: 900, rearMm: 100, serviceMm: 700, doorSwingMm: 600 };
  if (/toilet/.test(type)) return { frontMm: 700, leftMm: 350, rightMm: 350, serviceMm: 500 };
  if (/shower/.test(type)) return { frontMm: 800, serviceMm: 500, doorSwingMm: 700 };
  if (/bed/.test(type)) return { frontMm: 600, leftMm: 600, rightMm: 600 };
  if (/chair|dining/.test(type)) return { frontMm: 750, rearMm: 450 };
  return {};
}
