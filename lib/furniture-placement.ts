import { getDrawingItemGeneratedFingerprint } from "./drawing-items.ts";
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
};

export type FurnitureWallReconciliationResult = {
  furniture: Furniture[];
  warnings: FurniturePlacementWarning[];
};

const SAMPLE_STEPS = 5;
const POSITION_SYNC_TOLERANCE_MM = 20;

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

function getHostLine(structure: HouseStructure, hostId: string) {
  return structure.walls.find((wall): wall is StraightHouseWall => wall.id === hostId && wall.kind === "straight")
    ?? structure.partitions.find((partition) => partition.id === hostId);
}

function isCustomOrFixedFurniture(item: Furniture) {
  const installType = item.constructionMeta?.installType;
  return Boolean(item.constructionMeta?.customMade || item.cabinetDesign || item.wardrobeDesign || ["customCabinet", "builtIn", "wallMounted", "embedded"].includes(installType ?? ""));
}

function isIntentionalFurnitureStack(left: Furniture, right: Furniture) {
  const text = (item: Furniture) => `${item.type} ${item.moduleType ?? ""} ${item.render3d?.assetType ?? ""} ${item.name}`.toLowerCase();
  const leftText = text(left);
  const rightText = text(right);
  const wallMounted = (value: string) => /wallcabinet|wallmounted|吊柜|壁挂/.test(value);
  const integrated = (value: string) => /sink|basin|cooktop|hob|水槽|台盆|灶台/.test(value);
  const cabinetLike = (value: string) => /cabinet|counter|vanity|sideboard|橱柜|柜|台面/.test(value);
  return wallMounted(leftText) || wallMounted(rightText)
    || (integrated(leftText) && cabinetLike(rightText))
    || (integrated(rightText) && cabinetLike(leftText));
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

export function validateFurniturePlacement(structure: HouseStructure, furniture: Furniture[], drawingItems: DrawingItem[] = []) {
  const warnings: FurniturePlacementWarning[] = [];
  const footprints = new Map(furniture.map((item) => [item.id, getFurnitureFootprint(item, structure)]));
  const bounds = new Map(Array.from(footprints, ([id, points]) => [id, getBounds(points)]));
  const spacePolygons = new Map<string, MmPoint[]>([
    ...structure.rooms.map((room): [string, MmPoint[]] => [room.id, room.boundary]),
    ...structure.outdoors.map((outdoor): [string, MmPoint[]] => [outdoor.id, outdoor.polygon])
  ]);

  furniture.forEach((item) => {
    const footprint = footprints.get(item.id) ?? [];
    const assignment = resolveFurnitureSpaceAssignment(item, structure);
    const assignedPolygon = spacePolygons.get(item.roomId);
    if (assignedPolygon && footprint.some((point) => !pointInPolygon(point, assignedPolygon))) warnings.push({ code: "OUTSIDE_ASSIGNED_SPACE", furnitureId: item.id, relatedObjectId: item.roomId, message: `${item.name} 未完整落在所属空间内。` });
    if (assignment.primarySpaceId && assignment.primarySpaceId !== item.roomId) warnings.push({ code: "CENTER_ROOM_MISMATCH", furnitureId: item.id, relatedObjectId: assignment.primarySpaceId, message: `${item.name} 的中心点位于 ${assignment.primarySpaceId}，与 roomId ${item.roomId} 不一致。` });
    if (assignment.spanning) warnings.push({ code: "SPANS_MULTIPLE_SPACES", furnitureId: item.id, message: `${item.name} 跨越 ${assignment.candidateSpaceIds.join("、")}，请人工确认归属。` });
    const itemBounds = bounds.get(item.id)!;
    [...straightWalls(structure), ...structure.partitions].forEach((host) => {
      if (host.id === item.hostWallId) return;
      if (boundsIntersect(itemBounds, segmentBounds(host.start, host.end)) && lineCrossesFurniture(host.start, host.end, footprint)) warnings.push({ code: "CROSSES_STRUCTURE", furnitureId: item.id, relatedObjectId: host.id, message: `${item.name} 可能穿越 ${host.name}。` });
    });
    structure.doors.forEach((door) => {
      const clearance = openingClearancePolygon(structure, door.hostId, door.positionOnWall, door.width, Math.min(door.width, 900));
      if (clearance && polygonsIntersect(footprint, clearance)) warnings.push({ code: "BLOCKS_DOOR", furnitureId: item.id, relatedObjectId: door.id, message: `${item.name} 可能遮挡 ${door.name} 或门扇开启范围。` });
    });
    structure.windows.forEach((windowObject) => {
      const clearance = openingClearancePolygon(structure, windowObject.hostId, windowObject.positionOnWall, windowObject.width + 200, 300);
      if (clearance && polygonsIntersect(footprint, clearance)) warnings.push({ code: "BLOCKS_WINDOW", furnitureId: item.id, relatedObjectId: windowObject.id, message: `${item.name} 可能遮挡 ${windowObject.name} 或影响开窗。` });
    });
    if (isCustomOrFixedFurniture(item) && !item.hostWallId) warnings.push({ code: "MISSING_WALL_HOST", furnitureId: item.id, message: `${item.name} 属于定制或固定安装对象，但尚未绑定墙体。` });
    if (item.wallAnchor?.needsRebind) warnings.push({ code: "WALL_HOST_NEEDS_REBIND", furnitureId: item.id, relatedObjectId: item.hostWallId, message: `${item.name} 的墙体关联需要重新确认。` });
    const missingMep = missingMepLabels(item);
    if (missingMep.length) warnings.push({ code: "MISSING_MEP_REQUIREMENT", furnitureId: item.id, message: `${item.name} 缺少必要机电需求：${missingMep.join("、")}。` });
    if (item.constructionMeta?.inspectionAccessRequired && (item.clearanceMeta?.serviceMm ?? 0) < 300) warnings.push({ code: "INSUFFICIENT_SERVICE_CLEARANCE", furnitureId: item.id, message: `${item.name} 需要检修，但检修空间未设置或不足 300 mm。` });
    drawingItems.filter((drawingItem) => drawingItem.relatedFurnitureId === item.id).forEach((drawingItem) => {
      if (getRelatedDrawingItemSyncState(drawingItem, item, structure).needsSync) warnings.push({ code: "RELATED_POINT_NEEDS_SYNC", furnitureId: item.id, relatedObjectId: drawingItem.id, message: `${drawingItem.label} 仍在家具移动前的位置，可能需要同步。` });
    });
  });

  for (let leftIndex = 0; leftIndex < furniture.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < furniture.length; rightIndex += 1) {
      const left = furniture[leftIndex];
      const right = furniture[rightIndex];
      if (isIntentionalFurnitureStack(left, right)) continue;
      const leftBounds = bounds.get(left.id)!;
      const rightBounds = bounds.get(right.id)!;
      const overlap = boundsOverlapDepth(leftBounds, rightBounds);
      if (overlap.x > 30 && overlap.y > 30) {
        warnings.push({ code: "FURNITURE_OVERLAP", furnitureId: left.id, relatedObjectId: right.id, message: `${left.name} 与 ${right.name} 明显重叠。` });
        continue;
      }
      if (left.roomId !== right.roomId) continue;
      const horizontalGap = Math.max(rightBounds.minX - leftBounds.maxX, leftBounds.minX - rightBounds.maxX);
      const verticalGap = Math.max(rightBounds.minY - leftBounds.maxY, leftBounds.minY - rightBounds.maxY);
      const passage = Math.max(horizontalGap, verticalGap);
      if (passage > 0 && passage < 600 && (horizontalGap <= 0 || verticalGap <= 0)) warnings.push({ code: "PASSAGE_TOO_NARROW", furnitureId: left.id, relatedObjectId: right.id, message: `${left.name} 与 ${right.name} 之间通行宽度约 ${Math.round(passage)} mm。` });
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
