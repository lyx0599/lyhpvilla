import { generateRoomsFromWalls, getLineLength, getPolygonArea, projectPointToSegment } from "@/lib/house-geometry";
import type {
  Furniture,
  HouseStructure,
  HouseWall,
  MmPoint,
  ObjectInteractionState,
  Position2D,
  StraightHouseWall
} from "@/types/space";

export type InteractionModel = {
  houseStructure: HouseStructure;
  furniture: Furniture[];
};

export type DragDelta = {
  x: number;
  y: number;
};

export type ResizeParams =
  | { kind: "wall-endpoint"; pointKey: "start" | "end"; point: MmPoint }
  | { kind: "window-width"; width: number }
  | { kind: "door-width"; width: number };

export type SnapTarget =
  | { kind: "wall"; wallId: string; point: MmPoint }
  | { kind: "room"; roomId: string };

export const emptyInteractionState: ObjectInteractionState = {
  selectedObjectId: "",
  hoveredObjectId: "",
  editingObjectId: "",
  lockedObjectIds: []
};

export function isLocked(state: ObjectInteractionState, objectId: string) {
  return state.lockedObjectIds.includes(objectId);
}

export function handleSelect(state: ObjectInteractionState, objectId: string): ObjectInteractionState {
  return {
    ...state,
    selectedObjectId: objectId,
    editingObjectId: objectId
  };
}

export function handleHover(state: ObjectInteractionState, objectId: string): ObjectInteractionState {
  return {
    ...state,
    hoveredObjectId: objectId
  };
}

export function handleEdit(state: ObjectInteractionState, objectId: string): ObjectInteractionState {
  if (isLocked(state, objectId)) return state;
  return {
    ...state,
    editingObjectId: objectId,
    selectedObjectId: objectId
  };
}

export function toggleLock(state: ObjectInteractionState, objectId: string): ObjectInteractionState {
  const locked = isLocked(state, objectId);
  return {
    ...state,
    lockedObjectIds: locked
      ? state.lockedObjectIds.filter((id) => id !== objectId)
      : [...state.lockedObjectIds, objectId],
    editingObjectId: locked ? state.editingObjectId : state.editingObjectId === objectId ? "" : state.editingObjectId
  };
}

function refreshRooms(structure: HouseStructure): HouseStructure {
  return {
    ...structure,
    rooms: generateRoomsFromWalls(structure.floorId, structure.walls, structure.rooms)
  };
}

function moveWall(wall: HouseWall, delta: DragDelta): HouseWall {
  if (wall.kind === "arc") {
    return { ...wall, center: { x: wall.center.x + delta.x, y: wall.center.y + delta.y } };
  }
  return {
    ...wall,
    start: { x: wall.start.x + delta.x, y: wall.start.y + delta.y },
    end: { x: wall.end.x + delta.x, y: wall.end.y + delta.y }
  };
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function handleDrag(model: InteractionModel, state: ObjectInteractionState, objectId: string, delta: DragDelta): InteractionModel {
  if (isLocked(state, objectId)) return model;

  if (model.houseStructure.walls.some((wall) => wall.id === objectId)) {
    return {
      ...model,
      houseStructure: refreshRooms({
        ...model.houseStructure,
        walls: model.houseStructure.walls.map((wall) => wall.id === objectId ? moveWall(wall, delta) : wall)
      })
    };
  }

  if (model.houseStructure.partitions.some((partition) => partition.id === objectId)) {
    return {
      ...model,
      houseStructure: {
        ...model.houseStructure,
        partitions: model.houseStructure.partitions.map((partition) => partition.id === objectId
          ? {
              ...partition,
              start: { x: partition.start.x + delta.x, y: partition.start.y + delta.y },
              end: { x: partition.end.x + delta.x, y: partition.end.y + delta.y }
            }
          : partition)
      }
    };
  }

  if (model.houseStructure.stairs.some((stair) => stair.id === objectId)) {
    return {
      ...model,
      houseStructure: {
        ...model.houseStructure,
        stairs: model.houseStructure.stairs.map((stair) => stair.id === objectId
          ? {
              ...stair,
              start: { x: stair.start.x + delta.x, y: stair.start.y + delta.y },
              end: { x: stair.end.x + delta.x, y: stair.end.y + delta.y }
            }
          : stair)
      }
    };
  }

  if (model.houseStructure.fences.some((fence) => fence.id === objectId)) {
    return {
      ...model,
      houseStructure: {
        ...model.houseStructure,
        fences: model.houseStructure.fences.map((fence) => fence.id === objectId
          ? {
              ...fence,
              start: { x: fence.start.x + delta.x, y: fence.start.y + delta.y },
              end: { x: fence.end.x + delta.x, y: fence.end.y + delta.y }
            }
          : fence)
      }
    };
  }

  return {
    ...model,
    furniture: model.furniture.map((item) => item.id === objectId
      ? {
          ...item,
          position: {
            ...item.position,
            x: clampPercent(item.position.x + delta.x),
            y: clampPercent(item.position.y + delta.y)
          }
        }
      : item)
  };
}

export function handleResize(model: InteractionModel, state: ObjectInteractionState, objectId: string, params: ResizeParams): InteractionModel {
  if (isLocked(state, objectId)) return model;

  if (params.kind === "wall-endpoint") {
    return {
      ...model,
      houseStructure: refreshRooms({
        ...model.houseStructure,
        walls: model.houseStructure.walls.map((wall) => {
          if (wall.id !== objectId || wall.kind !== "straight") return wall;
          const nextWall = { ...wall, [params.pointKey]: params.point };
          return { ...nextWall, length: getLineLength(nextWall.start, nextWall.end) };
        })
      })
    };
  }

  if (params.kind === "window-width") {
    return {
      ...model,
      houseStructure: {
        ...model.houseStructure,
        windows: model.houseStructure.windows.map((windowObject) => windowObject.id === objectId ? { ...windowObject, width: params.width } : windowObject)
      }
    };
  }

  return {
    ...model,
    houseStructure: {
      ...model.houseStructure,
      doors: model.houseStructure.doors.map((door) => door.id === objectId ? { ...door, width: params.width } : door)
    }
  };
}

export function handleSnap(model: InteractionModel, state: ObjectInteractionState, objectId: string, target: SnapTarget): InteractionModel {
  if (isLocked(state, objectId)) return model;

  if (target.kind === "room") {
    return {
      ...model,
      furniture: model.furniture.map((item) => item.id === objectId ? { ...item, roomId: target.roomId } : item)
    };
  }

  const wall = model.houseStructure.walls.find((item): item is StraightHouseWall => item.id === target.wallId && item.kind === "straight");
  if (!wall) return model;
  const projection = projectPointToSegment(target.point, wall.start, wall.end);
  const positionOnWall = Number(projection.t.toFixed(3));

  return {
    ...model,
    houseStructure: {
      ...model.houseStructure,
      doors: model.houseStructure.doors.map((door) => door.id === objectId ? { ...door, hostType: "wall", hostId: wall.id, positionOnWall } : door),
      windows: model.houseStructure.windows.map((windowObject) => windowObject.id === objectId ? { ...windowObject, hostType: "wall", hostId: wall.id, positionOnWall } : windowObject)
    }
  };
}

export function rotateFurniture(furniture: Furniture[], state: ObjectInteractionState, objectId: string, degrees = 15) {
  if (isLocked(state, objectId)) return furniture;
  return furniture.map((item) => item.id === objectId
    ? { ...item, position: { ...item.position, rotation: (item.position.rotation + degrees + 360) % 360 } }
    : item);
}

export function rotateDoor(structure: HouseStructure, state: ObjectInteractionState, objectId: string): HouseStructure {
  if (isLocked(state, objectId)) return structure;
  const directions = ["leftIn", "rightIn", "leftOut", "rightOut"] as const;
  return {
    ...structure,
    doors: structure.doors.map((door) => {
      if (door.id !== objectId) return door;
      const index = directions.indexOf(door.openDirection);
      return { ...door, openDirection: directions[(index + 1) % directions.length] };
    })
  };
}

export function splitWall(structure: HouseStructure, state: ObjectInteractionState, wallId: string): HouseStructure {
  if (isLocked(state, wallId)) return structure;
  const wall = structure.walls.find((item): item is StraightHouseWall => item.id === wallId && item.kind === "straight");
  if (!wall) return structure;
  const midpoint = { x: Math.round((wall.start.x + wall.end.x) / 2), y: Math.round((wall.start.y + wall.end.y) / 2) };
  const left: StraightHouseWall = { ...wall, id: `${wall.id}-A`, end: midpoint, length: getLineLength(wall.start, midpoint) };
  const right: StraightHouseWall = { ...wall, id: `${wall.id}-B`, start: midpoint, length: getLineLength(midpoint, wall.end) };
  return refreshRooms({
    ...structure,
    walls: structure.walls.flatMap((item) => item.id === wallId ? [left, right] : [item])
  });
}

export function mergeWall(structure: HouseStructure, state: ObjectInteractionState, wallId: string): HouseStructure {
  if (isLocked(state, wallId)) return structure;
  const wall = structure.walls.find((item): item is StraightHouseWall => item.id === wallId && item.kind === "straight");
  if (!wall) return structure;
  const candidate = structure.walls.find((item): item is StraightHouseWall => {
    if (item.id === wall.id || item.kind !== "straight") return false;
    return item.start.x === wall.end.x && item.start.y === wall.end.y;
  });
  if (!candidate) return structure;
  const merged: StraightHouseWall = {
    ...wall,
    id: `${wall.id}-M`,
    end: candidate.end,
    length: getLineLength(wall.start, candidate.end)
  };
  return refreshRooms({
    ...structure,
    walls: structure.walls.filter((item) => item.id !== wall.id && item.id !== candidate.id).concat(merged)
  });
}

export function recalcRoomArea(structure: HouseStructure): HouseStructure {
  return {
    ...structure,
    rooms: structure.rooms.map((room) => ({ ...room, area: getPolygonArea(room.boundary) }))
  };
}

export function lockFurnitureToFloor(furniture: Furniture[], objectId: string) {
  return furniture.map((item) => item.id === objectId ? { ...item, locked: !item.locked } : item);
}
