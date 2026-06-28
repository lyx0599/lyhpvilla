import { createStair, generateRoomsFromWalls, getLineLength } from "@/lib/house-geometry";
import type { FloorId, HouseStair, HouseStructure, HouseWall } from "@/types/space";

const REFERENCE_FLOOR_ID: FloorId = "1F";
const OUTER_SYNC_FLOORS = new Set<FloorId>(["1F", "2F", "B2"]);
const INNER_SYNC_FLOORS = new Set<FloorId>(["1F", "2F"]);
const OUTER_WALL_SUFFIXES = new Set(["016", "007", "006", "009", "004", "014", "015", "008"]);
const INNER_WALL_SUFFIXES = new Set(["017", "001", "011", "010", "012", "022"]);
const LOCAL_ONLY_WALL_SUFFIXES = new Set(["014", "016", "017", "022"]);

type SyncOptions = {
  syncCrossFloor?: boolean;
};

function getWallSuffix(id: string) {
  return id.split("-").at(-1) ?? id;
}

function getSyncedWallId(floorId: FloorId, referenceWall: HouseWall) {
  return `W-${floorId}-${getWallSuffix(referenceWall.id)}`;
}

function getWallSyncFloors(wall: HouseWall) {
  const suffix = getWallSuffix(wall.id);
  if (LOCAL_ONLY_WALL_SUFFIXES.has(suffix)) return null;
  if (OUTER_WALL_SUFFIXES.has(suffix)) return OUTER_SYNC_FLOORS;
  if (INNER_WALL_SUFFIXES.has(suffix)) return INNER_SYNC_FLOORS;
  return null;
}

function refreshRooms(structure: HouseStructure): HouseStructure {
  return {
    ...structure,
    rooms: generateRoomsFromWalls(structure.floorId, structure.walls, structure.rooms)
  };
}

function copyReferenceWallToFloor(referenceWall: HouseWall, floorId: FloorId, existingWall?: HouseWall): HouseWall {
  const id = getSyncedWallId(floorId, referenceWall);
  if (referenceWall.kind === "arc") {
    return {
      ...referenceWall,
      ...(existingWall?.kind === "arc" ? {
        name: existingWall.name,
        thickness: existingWall.thickness,
        height: existingWall.height
      } : {}),
      id,
      floorId,
      center: { ...referenceWall.center },
      length: Math.round((Math.abs(referenceWall.endAngle - referenceWall.startAngle) * Math.PI * referenceWall.radius) / 180)
    };
  }

  const existingStraight = existingWall?.kind === "straight" ? existingWall : null;
  const start = { ...referenceWall.start };
  const end = { ...referenceWall.end };
  return {
    ...referenceWall,
    ...(existingStraight ? {
      name: existingStraight.name,
      thickness: existingStraight.thickness,
      height: existingStraight.height
    } : {}),
    id,
    floorId,
    start,
    end,
    length: getLineLength(start, end)
  };
}

function copyReferenceStairsToFloor(referenceStairs: HouseStair[], floorId: FloorId, existingStairs: HouseStair[]) {
  return referenceStairs.map((stair, index) => {
    const id = `ST-${floorId}-${String(index + 1).padStart(3, "0")}`;
    const existing = existingStairs[index];
    return {
      ...(existing ?? createStair(id, floorId, stair.start, stair.end)),
      id,
      floorId,
      name: existing?.name ?? `Stair ${String(index + 1).padStart(3, "0")}`,
      start: { ...stair.start },
      end: { ...stair.end },
      width: stair.width,
      height: stair.height,
      stepCount: stair.stepCount,
      direction: stair.direction
    };
  });
}

export function syncStructureFromSourceFloor(sourceStructure: HouseStructure, targetStructure: HouseStructure): HouseStructure {
  if (targetStructure.floorId === sourceStructure.floorId) return refreshRooms(targetStructure);

  const syncedSourceWalls = sourceStructure.walls.filter((wall) => {
    const floors = getWallSyncFloors(wall);
    return Boolean(floors?.has(sourceStructure.floorId) && floors.has(targetStructure.floorId));
  });
  const syncedWallIds = new Set(syncedSourceWalls.map((wall) => getSyncedWallId(targetStructure.floorId, wall)));
  const preservedLocalWalls = targetStructure.walls.filter((wall) => !syncedWallIds.has(wall.id));
  const syncedWalls = syncedSourceWalls.map((referenceWall) => {
    const id = getSyncedWallId(targetStructure.floorId, referenceWall);
    const existingWall = targetStructure.walls.find((wall) => wall.id === id);
    return copyReferenceWallToFloor(referenceWall, targetStructure.floorId, existingWall);
  });
  const walls = [...syncedWalls, ...preservedLocalWalls];
  const shouldSyncStairs = OUTER_SYNC_FLOORS.has(sourceStructure.floorId) && OUTER_SYNC_FLOORS.has(targetStructure.floorId);

  return {
    ...targetStructure,
    walls,
    stairs: shouldSyncStairs ? copyReferenceStairsToFloor(sourceStructure.stairs, targetStructure.floorId, targetStructure.stairs) : targetStructure.stairs,
    rooms: generateRoomsFromWalls(targetStructure.floorId, walls, targetStructure.rooms)
  };
}

export function syncHouseStructuresToReference(
  structures: Record<FloorId, HouseStructure>,
  sourceFloorId: FloorId = REFERENCE_FLOOR_ID,
  options: SyncOptions = {}
) {
  if (!options.syncCrossFloor) {
    return Object.fromEntries(
      Object.entries(structures).map(([floorId, structure]) => [
        floorId,
        refreshRooms(structure as HouseStructure)
      ])
    ) as Record<FloorId, HouseStructure>;
  }

  const sourceStructure = structures[sourceFloorId] ?? structures[REFERENCE_FLOOR_ID];
  if (!sourceStructure) return structures;

  return Object.fromEntries(
    Object.entries(structures).map(([floorId, structure]) => [
      floorId,
      syncStructureFromSourceFloor(sourceStructure, structure as HouseStructure)
    ])
  ) as Record<FloorId, HouseStructure>;
}
