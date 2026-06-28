import { createStair, generateRoomsFromWalls, getLineLength } from "@/lib/house-geometry";
import type { FloorId, HouseStair, HouseStructure, HouseWall } from "@/types/space";

const REFERENCE_FLOOR_ID: FloorId = "1F";
const ALL_LEVEL_SYNC_FLOORS = new Set<FloorId>(["1F", "2F", "B2", "B1"]);
const ABOVE_GRADE_SYNC_FLOORS = new Set<FloorId>(["1F", "2F"]);
const BASEMENT_SYNC_FLOORS = new Set<FloorId>(["B1", "B2"]);
const STAIR_SYNC_FLOORS = ALL_LEVEL_SYNC_FLOORS;
const REMOVED_WALL_IDS = new Set(["W-B1-016", "W-B1-017"]);
const WALL_SYNC_GROUPS = [
  {
    id: "all-level",
    label: "1F / 2F / B2 / B1",
    color: "#2563eb",
    floors: ALL_LEVEL_SYNC_FLOORS,
    suffixes: new Set(["007", "003", "010"])
  },
  {
    id: "above-grade",
    label: "1F / 2F",
    color: "#16a34a",
    floors: ABOVE_GRADE_SYNC_FLOORS,
    suffixes: new Set(["001", "002", "004", "005", "008", "009", "021", "011", "012", "018", "019", "020", "015", "013", "014", "016", "017"])
  },
  {
    id: "basement",
    label: "B1 / B2",
    color: "#f97316",
    floors: BASEMENT_SYNC_FLOORS,
    suffixes: new Set(["001", "002", "009"])
  }
];

type SyncOptions = {
  syncCrossFloor?: boolean;
};

function getWallSuffix(id: string) {
  return id.split("-").at(-1) ?? id;
}

export function getWallSyncRule(floorId: FloorId, wallId: string) {
  const suffix = getWallSuffix(wallId);
  return WALL_SYNC_GROUPS.find((group) => group.floors.has(floorId) && group.suffixes.has(suffix)) ?? null;
}

export function getWallSyncLegend() {
  return WALL_SYNC_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    color: group.color,
    suffixes: Array.from(group.suffixes).sort()
  }));
}

export function getStairSyncRule() {
  return {
    id: "stair-all-level",
    label: "楼梯：1F / 2F / B2 / B1",
    color: "#7c3aed",
    floors: Array.from(STAIR_SYNC_FLOORS)
  };
}

function getSyncedWallId(floorId: FloorId, referenceWall: HouseWall) {
  return `W-${floorId}-${getWallSuffix(referenceWall.id)}`;
}

function getWallSyncFloors(wall: HouseWall) {
  return getWallSyncRule(wall.floorId, wall.id)?.floors ?? null;
}

function refreshRooms(structure: HouseStructure): HouseStructure {
  const walls = structure.walls.filter((wall) => !REMOVED_WALL_IDS.has(wall.id));
  return {
    ...structure,
    walls,
    rooms: generateRoomsFromWalls(structure.floorId, walls, structure.rooms)
  };
}

function copyReferenceWallToFloor(referenceWall: HouseWall, floorId: FloorId, existingWall?: HouseWall): HouseWall {
  const id = getSyncedWallId(floorId, referenceWall);
  if (referenceWall.kind === "arc") {
    return {
      ...referenceWall,
      ...(existingWall?.kind === "arc" ? {
        thickness: existingWall.thickness,
        height: existingWall.height
      } : {}),
      id,
      floorId,
      name: referenceWall.name,
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
      thickness: existingStraight.thickness,
      height: existingStraight.height
    } : {}),
    id,
    floorId,
    name: referenceWall.name,
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
      name: stair.name,
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
    if (REMOVED_WALL_IDS.has(wall.id)) return false;
    const floors = getWallSyncFloors(wall);
    return Boolean(floors?.has(sourceStructure.floorId) && floors.has(targetStructure.floorId));
  });
  const syncedWallIds = new Set(syncedSourceWalls.map((wall) => getSyncedWallId(targetStructure.floorId, wall)));
  const preservedLocalWalls = targetStructure.walls.filter((wall) => !REMOVED_WALL_IDS.has(wall.id) && !syncedWallIds.has(wall.id));
  const syncedWalls = syncedSourceWalls.map((referenceWall) => {
    const id = getSyncedWallId(targetStructure.floorId, referenceWall);
    const existingWall = targetStructure.walls.find((wall) => wall.id === id);
    return copyReferenceWallToFloor(referenceWall, targetStructure.floorId, existingWall);
  });
  const walls = [...syncedWalls, ...preservedLocalWalls];
  const shouldSyncStairs = STAIR_SYNC_FLOORS.has(sourceStructure.floorId) && STAIR_SYNC_FLOORS.has(targetStructure.floorId);

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
