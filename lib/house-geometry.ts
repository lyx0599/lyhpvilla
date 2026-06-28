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
  StraightHouseWall
} from "@/types/space";

export const STRUCTURE_WIDTH_MM = 12000;
export const STRUCTURE_HEIGHT_MM = 9000;
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
    if (wall.kind === "arc") return [];
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

export function generateRoomsFromWalls(floorId: FloorId, walls: HouseWall[]) {
  const straightWalls = walls.filter((wall): wall is StraightHouseWall => wall.kind === "straight");
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
      const boundary = loopWalls.map((wall) => wall.start);
      rooms.push({
        id: `ROOM-${floorId}-${String(rooms.length + 1).padStart(3, "0")}`,
        floorId,
        name: `${floorId} Room ${rooms.length + 1}`,
        spaceType: "Room",
        geometryType: "polygon",
        boundary,
        area: getPolygonArea(boundary),
        sourceWallIds: loopWalls.map((wall) => wall.id)
      });
    }
  });

  return rooms;
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
