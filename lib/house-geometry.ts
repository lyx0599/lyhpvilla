import type {
  FloorId,
  HouseBayWindow,
  HouseDoor,
  FloorCoordinateSystem,
  HouseFence,
  HouseOutdoor,
  HouseOutdoorSurface,
  HousePartition,
  HouseRoom,
  HouseSkylight,
  HouseStair,
  HouseStructure,
  HouseWall,
  HouseWindow,
  MmPoint,
  ArcHouseWall,
  StraightHouseWall
} from "@/types/space";

export const STRUCTURE_WIDTH_MM = 12000;
export const STRUCTURE_HEIGHT_MM = 9000;
export const SITE_PLAN_MIN_Y_MM = -2200;
export const SITE_PLAN_MAX_Y_MM = 11600;
export const DEFAULT_WALL_THICKNESS_MM = 220;
export const DEFAULT_WALL_HEIGHT_MM = 2800;
export const DEFAULT_PARTITION_THICKNESS_MM = 90;
export const DEFAULT_PARTITION_HEIGHT_MM = 2400;
export const DEFAULT_STAIR_WIDTH_MM = 1100;
export const DEFAULT_STAIR_HEIGHT_MM = 2800;
export const DEFAULT_STAIR_STEP_COUNT = 14;
const SNAP_MM = 180;

export function createFloorCoordinateSystem(floorId: FloorId): FloorCoordinateSystem {
  return {
    floorId,
    origin: { x: 0, y: 0 },
    unit: "mm",
    width: STRUCTURE_WIDTH_MM,
    height: STRUCTURE_HEIGHT_MM,
    scale: 1,
    note: "统一楼层坐标：左上角为原点，所有结构对象使用毫米。底图仅作为参考层。"
  };
}

export function getDistance(a: MmPoint, b: MmPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getLineLength(start: MmPoint, end: MmPoint) {
  return Math.round(getDistance(start, end));
}

function getPointAtAngle(center: MmPoint, radius: number, angle: number): MmPoint {
  const radians = (angle * Math.PI) / 180;
  return {
    x: Math.round(center.x + Math.cos(radians) * radius),
    y: Math.round(center.y + Math.sin(radians) * radius)
  };
}

export function getArcWallEndpoints(wall: ArcHouseWall) {
  return {
    start: getPointAtAngle(wall.center, wall.radius, wall.startAngle),
    end: getPointAtAngle(wall.center, wall.radius, wall.endAngle)
  };
}

export function getPolygonArea(points: MmPoint[]) {
  if (points.length < 3) return 0;
  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  return Math.round(Math.abs(area) / 2);
}

export function snapPoint(point: MmPoint, candidates: MmPoint[], origin?: MmPoint) {
  let snapped = { ...point };
  const endpoint = candidates.find((candidate) => getDistance(candidate, point) <= SNAP_MM);
  if (endpoint) snapped = { ...endpoint };
  if (origin) {
    const dx = Math.abs(snapped.x - origin.x);
    const dy = Math.abs(snapped.y - origin.y);
    if (dx < dy * 0.45) snapped.x = origin.x;
    if (dy < dx * 0.45) snapped.y = origin.y;
  }
  return snapped;
}

export function getWallEndpoints(walls: HouseWall[]) {
  return walls.flatMap((wall) => {
    if (wall.kind === "arc") {
      const { start, end } = getArcWallEndpoints(wall);
      return [start, end];
    }
    return [wall.start, wall.end];
  });
}

export function createStraightWall(id: string, floorId: FloorId, start: MmPoint, end: MmPoint): StraightHouseWall {
  return {
    id,
    floorId,
    name: `Wall ${id.split("-").slice(-1)[0]}`,
    kind: "straight",
    geometryType: "line",
    start,
    end,
    thickness: DEFAULT_WALL_THICKNESS_MM,
    height: DEFAULT_WALL_HEIGHT_MM,
    length: getLineLength(start, end)
  };
}

export function createArcWall(
  id: string,
  floorId: FloorId,
  center: MmPoint,
  radius: number,
  startAngle: number,
  endAngle: number,
  direction: "clockwise" | "counterclockwise" = "clockwise"
): HouseWall {
  return {
    id,
    floorId,
    name: `Arc Wall ${id.split("-").slice(-1)[0]}`,
    kind: "arc",
    geometryType: "arc",
    center,
    radius,
    startAngle,
    endAngle,
    thickness: DEFAULT_WALL_THICKNESS_MM,
    height: DEFAULT_WALL_HEIGHT_MM,
    direction,
    length: Math.round((Math.abs(endAngle - startAngle) * Math.PI * radius) / 180)
  };
}

export function createArcWallFromEndpoints(
  id: string,
  floorId: FloorId,
  start: MmPoint,
  end: MmPoint,
  sweepAngle = 90,
  direction: "clockwise" | "counterclockwise" = "clockwise"
): HouseWall {
  const chord = Math.max(1, getDistance(start, end));
  const clampedSweepAngle = Math.min(180, Math.max(10, Math.abs(sweepAngle)));
  const halfSweepRadians = (clampedSweepAngle * Math.PI) / 360;
  const radius = Math.max(1, chord / (2 * Math.sin(halfSweepRadians)));
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  };
  const unit = {
    x: (end.x - start.x) / chord,
    y: (end.y - start.y) / chord
  };
  const centerDistance = Math.sqrt(Math.max(0, radius * radius - (chord / 2) * (chord / 2)));
  const normal = direction === "clockwise"
    ? { x: -unit.y, y: unit.x }
    : { x: unit.y, y: -unit.x };
  const center = {
    x: Math.round(midpoint.x + normal.x * centerDistance),
    y: Math.round(midpoint.y + normal.y * centerDistance)
  };
  const startAngle = (Math.atan2(start.y - center.y, start.x - center.x) * 180) / Math.PI;
  const endAngle = startAngle + (direction === "clockwise" ? clampedSweepAngle : -clampedSweepAngle);

  return {
    id,
    floorId,
    name: `Arc Wall ${id.split("-").slice(-1)[0]}`,
    kind: "arc",
    geometryType: "arc",
    center,
    radius: Math.round(radius),
    startAngle: Number(startAngle.toFixed(2)),
    endAngle: Number(endAngle.toFixed(2)),
    thickness: DEFAULT_WALL_THICKNESS_MM,
    height: DEFAULT_WALL_HEIGHT_MM,
    direction,
    length: Math.round((clampedSweepAngle * Math.PI * radius) / 180)
  };
}

export function createPartition(id: string, floorId: FloorId, start: MmPoint, end: MmPoint): HousePartition {
  return {
    id,
    name: `Partition ${id.split("-").slice(-1)[0]}`,
    floorId,
    roomIds: [],
    type: "partition",
    spaceType: "Partition",
    geometryType: "line",
    material: "glass",
    transparency: 0.45,
    start,
    end,
    thickness: DEFAULT_PARTITION_THICKNESS_MM,
    height: DEFAULT_PARTITION_HEIGHT_MM,
    editable: true,
    removable: true
  };
}

export function createStair(id: string, floorId: FloorId, start: MmPoint, end: MmPoint): HouseStair {
  return {
    id,
    floorId,
    name: `Stair ${id.split("-").slice(-1)[0]}`,
    geometryType: "line",
    start,
    end,
    width: DEFAULT_STAIR_WIDTH_MM,
    height: DEFAULT_STAIR_HEIGHT_MM,
    stepCount: DEFAULT_STAIR_STEP_COUNT,
    direction: "up",
    editable: true,
    removable: true
  };
}

export function createFence(id: string, floorId: FloorId, start: MmPoint, end: MmPoint): HouseFence {
  return {
    id,
    floorId,
    name: `Fence ${id.split("-").slice(-1)[0]}`,
    geometryType: "line",
    start,
    end,
    height: 1200,
    thickness: 80,
    material: "metal",
    editable: true,
    removable: true
  };
}

function samePoint(a: MmPoint, b: MmPoint) {
  return getDistance(a, b) <= SNAP_MM;
}

function getRoomSignature(sourceWallIds: string[]) {
  return [...sourceWallIds].sort().join("|");
}

function getRoomNumber(floorId: FloorId, index: number) {
  return `R-${floorId}-${String(index + 1).padStart(3, "0")}`;
}

function createGeneratedRoom(
  floorId: FloorId,
  rooms: HouseRoom[],
  boundary: MmPoint[],
  sourceWallIds: string[],
  previousRoomBySignature: Map<string, HouseRoom>
) {
  const previousRoom = previousRoomBySignature.get(getRoomSignature(sourceWallIds));
  rooms.push({
    id: previousRoom?.id ?? `ROOM-${floorId}-${String(rooms.length + 1).padStart(3, "0")}`,
    floorId,
    roomNumber: previousRoom?.roomNumber ?? getRoomNumber(floorId, rooms.length),
    name: previousRoom?.name ?? `${floorId} 房间 ${rooms.length + 1}`,
    spaceType: "Room",
    geometryType: "polygon",
    boundary,
    area: getPolygonArea(boundary),
    sourceWallIds
  });
}

function uniqueSorted(values: number[]) {
  return Array.from(new Set(values.map((value) => Math.round(value)))).sort((a, b) => a - b);
}

function getAxisAlignedWallGroups(walls: StraightHouseWall[]) {
  const horizontalWalls = walls.filter((wall) => Math.abs(wall.start.y - wall.end.y) <= 1 && Math.abs(wall.start.x - wall.end.x) > 1);
  const verticalWalls = walls.filter((wall) => Math.abs(wall.start.x - wall.end.x) <= 1 && Math.abs(wall.start.y - wall.end.y) > 1);
  return { horizontalWalls, verticalWalls };
}

function getHorizontalCover(walls: StraightHouseWall[], y: number, x1: number, x2: number) {
  return walls.find((wall) => {
    if (Math.abs(wall.start.y - y) > 1 || Math.abs(wall.end.y - y) > 1) return false;
    const minX = Math.min(wall.start.x, wall.end.x);
    const maxX = Math.max(wall.start.x, wall.end.x);
    return minX <= x1 + 1 && maxX >= x2 - 1;
  });
}

function getVerticalCover(walls: StraightHouseWall[], x: number, y1: number, y2: number) {
  return walls.find((wall) => {
    if (Math.abs(wall.start.x - x) > 1 || Math.abs(wall.end.x - x) > 1) return false;
    const minY = Math.min(wall.start.y, wall.end.y);
    const maxY = Math.max(wall.start.y, wall.end.y);
    return minY <= y1 + 1 && maxY >= y2 - 1;
  });
}

function hasInternalDivider(
  horizontalWalls: StraightHouseWall[],
  verticalWalls: StraightHouseWall[],
  x1: number,
  x2: number,
  y1: number,
  y2: number
) {
  const fullHeightDivider = verticalWalls.some((wall) => {
    const x = wall.start.x;
    if (x <= x1 + 1 || x >= x2 - 1) return false;
    const minY = Math.min(wall.start.y, wall.end.y);
    const maxY = Math.max(wall.start.y, wall.end.y);
    return minY <= y1 + 1 && maxY >= y2 - 1;
  });
  if (fullHeightDivider) return true;

  return horizontalWalls.some((wall) => {
    const y = wall.start.y;
    if (y <= y1 + 1 || y >= y2 - 1) return false;
    const minX = Math.min(wall.start.x, wall.end.x);
    const maxX = Math.max(wall.start.x, wall.end.x);
    return minX <= x1 + 1 && maxX >= x2 - 1;
  });
}

function generateGridRoomsFromWalls(
  floorId: FloorId,
  straightWalls: StraightHouseWall[],
  previousRoomBySignature: Map<string, HouseRoom>
) {
  const { horizontalWalls, verticalWalls } = getAxisAlignedWallGroups(straightWalls);
  const xs = uniqueSorted(straightWalls.flatMap((wall) => [wall.start.x, wall.end.x]));
  const ys = uniqueSorted(straightWalls.flatMap((wall) => [wall.start.y, wall.end.y]));
  const rooms: HouseRoom[] = [];
  const seenSignatures = new Set<string>();

  for (let yStartIndex = 0; yStartIndex < ys.length - 1; yStartIndex += 1) {
    for (let yEndIndex = yStartIndex + 1; yEndIndex < ys.length; yEndIndex += 1) {
      const y1 = ys[yStartIndex];
      const y2 = ys[yEndIndex];
      if (y2 - y1 < 300) continue;
      for (let xStartIndex = 0; xStartIndex < xs.length - 1; xStartIndex += 1) {
        for (let xEndIndex = xStartIndex + 1; xEndIndex < xs.length; xEndIndex += 1) {
          const x1 = xs[xStartIndex];
          const x2 = xs[xEndIndex];
          if (x2 - x1 < 300) continue;

          const top = getHorizontalCover(horizontalWalls, y1, x1, x2);
          const right = getVerticalCover(verticalWalls, x2, y1, y2);
          const bottom = getHorizontalCover(horizontalWalls, y2, x1, x2);
          const left = getVerticalCover(verticalWalls, x1, y1, y2);
          if (!top || !right || !bottom || !left) continue;
          if (hasInternalDivider(horizontalWalls, verticalWalls, x1, x2, y1, y2)) continue;

          const sourceWallIds = Array.from(new Set([top.id, right.id, bottom.id, left.id]));
          const signature = getRoomSignature(sourceWallIds);
          if (seenSignatures.has(signature)) continue;
          seenSignatures.add(signature);
          createGeneratedRoom(
            floorId,
            rooms,
            [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }],
            sourceWallIds,
            previousRoomBySignature
          );
        }
      }
    }
  }

  return rooms;
}

function generateLoopRoomsFromWalls(
  floorId: FloorId,
  straightWalls: StraightHouseWall[],
  previousRoomBySignature: Map<string, HouseRoom>
) {
  const rooms: HouseRoom[] = [];
  const used = new Set<string>();

  straightWalls.forEach((startWall) => {
    if (used.has(startWall.id)) return;
    const loopWalls = [startWall];
    used.add(startWall.id);
    let cursor = startWall.end;

    for (let guard = 0; guard < straightWalls.length; guard += 1) {
      if (samePoint(cursor, startWall.start) && loopWalls.length >= 3) break;
      const next = straightWalls.find((wall) => !used.has(wall.id) && samePoint(wall.start, cursor));
      if (!next) break;
      loopWalls.push(next);
      used.add(next.id);
      cursor = next.end;
    }

    if (loopWalls.length >= 3 && samePoint(loopWalls[loopWalls.length - 1].end, startWall.start)) {
      createGeneratedRoom(
        floorId,
        rooms,
        loopWalls.map((wall) => wall.start),
        loopWalls.map((wall) => wall.id),
        previousRoomBySignature
      );
    }
  });

  return rooms;
}

export function generateRoomsFromWalls(floorId: FloorId, walls: HouseWall[], previousRooms: HouseRoom[] = []) {
  const straightWalls = walls.filter((wall): wall is StraightHouseWall => wall.kind === "straight");
  const previousRoomBySignature = new Map(previousRooms.map((room) => [getRoomSignature(room.sourceWallIds), room]));
  const gridRooms = generateGridRoomsFromWalls(floorId, straightWalls, previousRoomBySignature);
  return gridRooms.length > 0 ? gridRooms : generateLoopRoomsFromWalls(floorId, straightWalls, previousRoomBySignature);
}

export function projectPointToSegment(point: MmPoint, start: MmPoint, end: MmPoint) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.min(1, Math.max(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
  return {
    t,
    point: { x: start.x + dx * t, y: start.y + dy * t },
    distance: getDistance(point, { x: start.x + dx * t, y: start.y + dy * t })
  };
}

export function findNearestHost(point: MmPoint, walls: HouseWall[], partitions: HousePartition[]) {
  const wallHosts = walls
    .filter((wall): wall is StraightHouseWall => wall.kind === "straight")
    .map((wall) => ({ hostId: wall.id, hostType: "wall" as const, start: wall.start, end: wall.end }));
  const partitionHosts = partitions.map((partition) => ({
    hostId: partition.id,
    hostType: "partition" as const,
    start: partition.start,
    end: partition.end
  }));

  return [...wallHosts, ...partitionHosts]
    .map((host) => ({ ...host, projection: projectPointToSegment(point, host.start, host.end) }))
    .filter((host) => host.projection.distance <= 260)
    .sort((a, b) => a.projection.distance - b.projection.distance)[0] ?? null;
}

export function createDoor(id: string, floorId: FloorId, host: NonNullable<ReturnType<typeof findNearestHost>>): HouseDoor {
  return {
    id,
    floorId,
    name: `Door ${id.split("-").slice(-1)[0]}`,
    geometryType: "line",
    hostId: host.hostId,
    hostType: host.hostType,
    positionOnWall: Number(host.projection.t.toFixed(3)),
    width: 900,
    height: 2100,
    openDirection: "leftIn"
  };
}

export function createWindow(id: string, floorId: FloorId, host: NonNullable<ReturnType<typeof findNearestHost>>): HouseWindow {
  return {
    id,
    floorId,
    name: `Window ${id.split("-").slice(-1)[0]}`,
    geometryType: "line",
    hostId: host.hostId,
    hostType: host.hostType,
    positionOnWall: Number(host.projection.t.toFixed(3)),
    width: 1200,
    height: 1400
  };
}

export function createBayWindow(id: string, floorId: FloorId, host: NonNullable<ReturnType<typeof findNearestHost>>): HouseBayWindow | null {
  if (host.hostType !== "wall") return null;
  return {
    id,
    floorId,
    name: `BayWindow ${id.split("-").slice(-1)[0]}`,
    geometryType: "line",
    wallId: host.hostId,
    positionOnWall: Number(host.projection.t.toFixed(3)),
    width: 1600,
    depth: 550,
    height: 900
  };
}

export function createSkylight(id: string, floorId: FloorId, center: MmPoint): HouseSkylight {
  return {
    id,
    floorId,
    name: `Skylight ${id.split("-").slice(-1)[0]}`,
    geometryType: "polygon",
    center,
    width: 1200,
    depth: 900,
    height: 120,
    rotation: 0,
    editable: true,
    removable: true
  };
}

export function createOutdoor(id: string, floorId: FloorId, polygon: MmPoint[]): HouseOutdoor {
  return {
    id,
    floorId,
    name: `Outdoor ${id.split("-").slice(-1)[0]}`,
    spaceType: "Outdoor",
    geometryType: "polygon",
    outdoorType: "patio",
    polygon,
    area: getPolygonArea(polygon)
  };
}

export function createOutdoorSurface(
  id: string,
  floorId: FloorId,
  surfaceType: HouseOutdoorSurface["surfaceType"],
  polygon: MmPoint[]
): HouseOutdoorSurface {
  const materialByType: Record<HouseOutdoorSurface["surfaceType"], HouseOutdoorSurface["material"]> = {
    hardscape: "stone",
    path: "gravel",
    planting: "grass"
  };
  return {
    id,
    floorId,
    name: `${surfaceType === "hardscape" ? "Hardscape" : surfaceType === "path" ? "Path" : "Planting"} ${id.split("-").slice(-1)[0]}`,
    geometryType: "polygon",
    surfaceType,
    polygon,
    area: getPolygonArea(polygon),
    material: materialByType[surfaceType],
    editable: true,
    removable: true
  };
}

export function createEmptyStructure(floorId: FloorId): HouseStructure {
  return {
    floorId,
    coordinateSystem: createFloorCoordinateSystem(floorId),
    walls: [],
    rooms: [],
    partitions: [],
    stairs: [],
    fences: [],
    outdoorSurfaces: [],
    doors: [],
    windows: [],
    bayWindows: [],
    skylights: [],
    outdoors: []
  };
}
