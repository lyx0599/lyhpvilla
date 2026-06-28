import { createStair, generateRoomsFromWalls, getLineLength } from "@/lib/house-geometry";
import type { FloorId, HouseStair, HouseStructure, HouseWall } from "@/types/space";

const REFERENCE_FLOOR_ID: FloorId = "1F";
const SYNCED_FLOORS: FloorId[] = ["B2", "B1", "2F"];
const REFERENCE_OUTER_WALL_SUFFIXES = new Set(["001", "002", "003", "004", "005", "006", "007", "008"]);

function getWallSuffix(id: string) {
  return id.split("-").at(-1) ?? id;
}

function getSyncedWallId(floorId: FloorId, referenceWall: HouseWall) {
  return `W-${floorId}-${getWallSuffix(referenceWall.id)}`;
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

export function syncStructureToReferenceFloor(referenceStructure: HouseStructure, targetStructure: HouseStructure): HouseStructure {
  if (targetStructure.floorId === REFERENCE_FLOOR_ID || !SYNCED_FLOORS.includes(targetStructure.floorId)) return targetStructure;

  const referenceOuterWalls = referenceStructure.walls.filter((wall) => REFERENCE_OUTER_WALL_SUFFIXES.has(getWallSuffix(wall.id)));
  const referenceWallIds = new Set(referenceOuterWalls.map((wall) => getSyncedWallId(targetStructure.floorId, wall)));
  const preservedLocalWalls = targetStructure.walls.filter((wall) => !referenceWallIds.has(wall.id));
  const syncedWalls = referenceOuterWalls.map((referenceWall) => {
    const id = getSyncedWallId(targetStructure.floorId, referenceWall);
    const existingWall = targetStructure.walls.find((wall) => wall.id === id);
    return copyReferenceWallToFloor(referenceWall, targetStructure.floorId, existingWall);
  });
  const walls = [...syncedWalls, ...preservedLocalWalls];

  return {
    ...targetStructure,
    walls,
    stairs: copyReferenceStairsToFloor(referenceStructure.stairs, targetStructure.floorId, targetStructure.stairs),
    rooms: generateRoomsFromWalls(targetStructure.floorId, walls)
  };
}

export function syncHouseStructuresToReference(structures: Record<FloorId, HouseStructure>) {
  const referenceStructure = structures[REFERENCE_FLOOR_ID];
  if (!referenceStructure) return structures;

  return Object.fromEntries(
    Object.entries(structures).map(([floorId, structure]) => [
      floorId,
      syncStructureToReferenceFloor(referenceStructure, structure as HouseStructure)
    ])
  ) as Record<FloorId, HouseStructure>;
}
