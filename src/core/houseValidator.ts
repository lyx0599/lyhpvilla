import { createFloorCoordinateSystem, generateRoomsFromWalls, getArcWallEndpoints, getDistance, getLineLength, getPolygonArea, projectPointToSegment, SITE_PLAN_MAX_Y_MM, SITE_PLAN_MIN_Y_MM, STRUCTURE_HEIGHT_MM, STRUCTURE_WIDTH_MM } from "@/lib/house-geometry";
import type { FloorId, Furniture, HousePartition, HouseRoom, HouseStructure, HouseWall, MmPoint, StraightHouseWall } from "@/types/space";

export type HouseValidationIssueType = "wall" | "door" | "window" | "room" | "stair" | "outdoor" | "furniture" | "coordinate";

export type HouseValidationIssue = {
  type: HouseValidationIssueType;
  id: string;
  message: string;
};

export type HouseValidationResult = {
  valid: boolean;
  errors: HouseValidationIssue[];
  warnings: HouseValidationIssue[];
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
const PROJECTED_CONNECTION_WALL_SUFFIXES = new Set(["016", "007", "006", "009", "004", "014", "015", "008", "001", "005", "010", "012", "022"]);
const FORCED_HORIZONTAL_WALL_SUFFIXES = new Set(["012", "022"]);

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
  if (floorId !== "1F") return isPointInsideFloor(point);
  return point.x >= 0 && point.x <= STRUCTURE_WIDTH_MM && point.y >= SITE_PLAN_MIN_Y_MM && point.y <= SITE_PLAN_MAX_Y_MM;
}

function isValidPercentPoint(point: { x?: number; y?: number } | undefined) {
  if (!point || !isFiniteNumber(point.x) || !isFiniteNumber(point.y)) return false;
  return point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100;
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

function pushCoordinateError(errors: HouseValidationIssue[], id: string, message: string) {
  errors.push({ type: "coordinate", id, message });
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
    height: Math.max(1, isFiniteNumber(stair.height) ? stair.height : 2800),
    stepCount: Math.max(1, Math.round(isFiniteNumber(stair.stepCount) ? stair.stepCount : 14))
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

  const nextStructure = {
    ...nextStructureBase,
    rooms: generateRoomsFromWalls(floorId, nextStructureBase.walls, structure.rooms)
  };

  const nextFurniture = furniture.map((item) => {
    const x = clamp(isFiniteNumber(item.position.x) ? item.position.x : 0, 0, 100);
    const y = clamp(isFiniteNumber(item.position.y) ? item.position.y : 0, 0, 100);
    const rotation = isFiniteNumber(item.position.rotation) ? item.position.rotation : 0;
    if (item.floorId !== floorId || x !== item.position.x || y !== item.position.y || rotation !== item.position.rotation) {
      repairs.push(`已修正家具楼层/坐标：${item.id}`);
    }
    return {
      ...item,
      floorId,
      position: {
        ...item.position,
        x,
        y,
        rotation
      }
    };
  });

  return {
    structure: nextStructure,
    furniture: nextFurniture,
    repairs: Array.from(new Set(repairs))
  };
}

export function validateHouse(floorId: FloorId, structure: HouseStructure, furniture: Furniture[]): HouseValidationResult {
  const errors: HouseValidationIssue[] = [];
  const warnings: HouseValidationIssue[] = [];
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
      pushCoordinateError(errors, fence.id, "篱笆端点超出当前图纸坐标范围。");
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
      pushCoordinateError(errors, surface.id, "硬地/小路/绿化区域存在非法坐标或超出当前图纸坐标范围。");
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
      warnings.push({ type: "door", id: door.id, message: "门已挂在墙上，但两侧房间/室外关系还未完整标注。" });
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
    if (!isValidPercentPoint(item.position)) {
      pushCoordinateError(errors, item.id, "家具 overlay 坐标必须使用 0~100 的楼层百分比坐标。" );
    }
    const roomExists = structure.rooms.some((room) => room.id === item.roomId) || item.roomId.startsWith("room-");
    if (!roomExists) {
      warnings.push({ type: "furniture", id: item.id, message: "家具引用的 Room/Zone 不在当前结构房间中，可能漂浮在未定义空间。" });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
