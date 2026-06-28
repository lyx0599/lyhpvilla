import { createFence, createFloorCoordinateSystem, createOutdoor, createOutdoorSurface, createStair, createStraightWall, generateRoomsFromWalls } from "@/lib/house-geometry";
import { syncHouseStructuresToReference } from "@/lib/villa-structure-sync";
import type { FloorId, HouseBayWindow, HouseDoor, HouseFence, HouseOutdoor, HouseOutdoorSurface, HousePartition, HouseSkylight, HouseStair, HouseStructure, HouseWall, HouseWindow } from "@/types/space";

function wall(id: string, floorId: FloorId, start: { x: number; y: number }, end: { x: number; y: number }): HouseWall {
  return createStraightWall(id, floorId, start, end);
}

type StructureAddons = {
  doors?: HouseDoor[];
  windows?: HouseWindow[];
  bayWindows?: HouseBayWindow[];
  skylights?: HouseSkylight[];
  outdoors?: HouseOutdoor[];
  fences?: HouseFence[];
  outdoorSurfaces?: HouseOutdoorSurface[];
  stairs?: HouseStair[];
};

function door(id: string, floorId: FloorId, hostId: string, positionOnWall: number, width = 900): HouseDoor {
  return {
    id,
    floorId,
    name: `Door ${id.split("-").slice(-1)[0]}`,
    geometryType: "line",
    hostId,
    hostType: "wall",
    positionOnWall,
    width,
    height: 2100,
    openDirection: "leftIn"
  };
}

function windowObject(id: string, floorId: FloorId, hostId: string, positionOnWall: number, width = 1200): HouseWindow {
  return {
    id,
    floorId,
    name: `Window ${id.split("-").slice(-1)[0]}`,
    geometryType: "line",
    hostId,
    hostType: "wall",
    positionOnWall,
    width,
    height: 1400
  };
}

function bayWindow(id: string, floorId: FloorId, wallId: string, positionOnWall: number, width = 1600): HouseBayWindow {
  return {
    id,
    floorId,
    name: `Bay Window ${id.split("-").slice(-1)[0]}`,
    geometryType: "line",
    wallId,
    positionOnWall,
    width,
    depth: 550,
    height: 900
  };
}

function stair(id: string, floorId: FloorId, start: { x: number; y: number }, end: { x: number; y: number }, width = 900): HouseStair {
  return {
    ...createStair(id, floorId, start, end),
    width
  };
}

function structure(floorId: FloorId, walls: HouseWall[], partitions: HousePartition[] = [], addons: StructureAddons = {}): HouseStructure {
  return {
    floorId,
    coordinateSystem: createFloorCoordinateSystem(floorId),
    walls,
    rooms: generateRoomsFromWalls(floorId, walls),
    partitions,
    stairs: addons.stairs ?? [],
    fences: addons.fences ?? [],
    outdoorSurfaces: addons.outdoorSurfaces ?? [],
    doors: addons.doors ?? [],
    windows: addons.windows ?? [],
    bayWindows: addons.bayWindows ?? [],
    skylights: addons.skylights ?? [],
    outdoors: addons.outdoors ?? []
  };
}

const rawInitialHouseStructures: Record<FloorId, HouseStructure> = {
  "1F": structure("1F", [
    wall("W-1F-001", "1F", { x: 3676, y: 350 }, { x: 5383, y: 350 }),
    wall("W-1F-002", "1F", { x: 5383, y: 350 }, { x: 9495, y: 350 }),
    wall("W-1F-003", "1F", { x: 3676, y: 350 }, { x: 3676, y: 3050 }),
    wall("W-1F-004", "1F", { x: 5383, y: 350 }, { x: 5383, y: 3050 }),
    wall("W-1F-005", "1F", { x: 7681, y: 350 }, { x: 7681, y: 3050 }),
    wall("W-1F-006", "1F", { x: 9495, y: 350 }, { x: 9495, y: 3050 }),
    wall("W-1F-007", "1F", { x: 950, y: 3050 }, { x: 3676, y: 3050 }),
    wall("W-1F-008", "1F", { x: 3676, y: 3050 }, { x: 5383, y: 3050 }),
    wall("W-1F-009", "1F", { x: 5383, y: 3050 }, { x: 9495, y: 3050 }),
    wall("W-1F-010", "1F", { x: 950, y: 3050 }, { x: 950, y: 7800 }),
    wall("W-1F-011", "1F", { x: 9495, y: 3050 }, { x: 9495, y: 7800 }),
    wall("W-1F-012", "1F", { x: 950, y: 5150 }, { x: 3897, y: 5150 }),
    wall("W-1F-013", "1F", { x: 3897, y: 5150 }, { x: 3897, y: 7800 }),
    wall("W-1F-014", "1F", { x: 950, y: 7800 }, { x: 3897, y: 7800 }),
    wall("W-1F-015", "1F", { x: 3897, y: 7800 }, { x: 9495, y: 7800 })
  ], [], {
    doors: [door("D-1F-001", "1F", "W-1F-007", 0.78, 900), door("D-1F-002", "1F", "W-1F-015", 0.1, 900)],
    windows: [windowObject("WIN-1F-001", "1F", "W-1F-001", 0.5, 1200), windowObject("WIN-1F-002", "1F", "W-1F-002", 0.72, 1200)],
    bayWindows: [bayWindow("BW-1F-001", "1F", "W-1F-015", 0.78, 1200)],
    stairs: [stair("ST-1F-001", "1F", { x: 4146, y: 4100 }, { x: 950, y: 4100 })]
  }),
  "2F": structure("2F", [
    wall("W-2F-001", "2F", { x: 3676, y: 350 }, { x: 5383, y: 350 }),
    wall("W-2F-002", "2F", { x: 5383, y: 350 }, { x: 9495, y: 350 }),
    wall("W-2F-003", "2F", { x: 3676, y: 350 }, { x: 3676, y: 3050 }),
    wall("W-2F-004", "2F", { x: 5383, y: 350 }, { x: 5383, y: 3050 }),
    wall("W-2F-005", "2F", { x: 7681, y: 350 }, { x: 7681, y: 3050 }),
    wall("W-2F-006", "2F", { x: 9495, y: 350 }, { x: 9495, y: 3050 }),
    wall("W-2F-007", "2F", { x: 950, y: 3050 }, { x: 3676, y: 3050 }),
    wall("W-2F-008", "2F", { x: 3676, y: 3050 }, { x: 5383, y: 3050 }),
    wall("W-2F-009", "2F", { x: 5383, y: 3050 }, { x: 9495, y: 3050 }),
    wall("W-2F-010", "2F", { x: 950, y: 3050 }, { x: 950, y: 7800 }),
    wall("W-2F-011", "2F", { x: 9495, y: 3050 }, { x: 9495, y: 7800 }),
    wall("W-2F-012", "2F", { x: 950, y: 5150 }, { x: 3897, y: 5150 }),
    wall("W-2F-013", "2F", { x: 3897, y: 5150 }, { x: 6542, y: 5150 }),
    wall("W-2F-014", "2F", { x: 6542, y: 5150 }, { x: 7681, y: 5150 }),
    wall("W-2F-015", "2F", { x: 3897, y: 5150 }, { x: 3897, y: 7800 }),
    wall("W-2F-016", "2F", { x: 6542, y: 5150 }, { x: 6542, y: 7800 }),
    wall("W-2F-017", "2F", { x: 7681, y: 3050 }, { x: 7681, y: 5150 }),
    wall("W-2F-018", "2F", { x: 950, y: 7800 }, { x: 3897, y: 7800 }),
    wall("W-2F-019", "2F", { x: 3897, y: 7800 }, { x: 6542, y: 7800 }),
    wall("W-2F-020", "2F", { x: 6542, y: 7800 }, { x: 9495, y: 7800 })
  ], [], {
    doors: [
      door("D-2F-001", "2F", "W-2F-007", 0.78, 900),
      door("D-2F-002", "2F", "W-2F-009", 0.36, 900),
      door("D-2F-003", "2F", "W-2F-012", 0.78, 900),
      door("D-2F-004", "2F", "W-2F-013", 0.18, 900),
      door("D-2F-005", "2F", "W-2F-014", 0.38, 900)
    ],
    windows: [windowObject("WIN-2F-001", "2F", "W-2F-001", 0.5, 1200), windowObject("WIN-2F-002", "2F", "W-2F-002", 0.7, 1200)],
    bayWindows: [bayWindow("BW-2F-001", "2F", "W-2F-011", 0.84, 1200)],
    stairs: [stair("ST-2F-001", "2F", { x: 4146, y: 4100 }, { x: 950, y: 4100 })]
  }),
  "B1": structure("B1", [
    wall("W-B1-001", "B1", { x: 3947, y: 350 }, { x: 5385, y: 350 }),
    wall("W-B1-002", "B1", { x: 5385, y: 350 }, { x: 9495, y: 350 }),
    wall("W-B1-003", "B1", { x: 3947, y: 350 }, { x: 3947, y: 3117 }),
    wall("W-B1-004", "B1", { x: 9495, y: 350 }, { x: 9495, y: 3117 }),
    wall("W-B1-005", "B1", { x: 950, y: 3117 }, { x: 3947, y: 3117 }),
    wall("W-B1-006", "B1", { x: 3947, y: 3117 }, { x: 4692, y: 3117 }),
    wall("W-B1-007", "B1", { x: 950, y: 3117 }, { x: 950, y: 7800 }),
    wall("W-B1-008", "B1", { x: 9495, y: 3117 }, { x: 9495, y: 7800 }),
    wall("W-B1-009", "B1", { x: 950, y: 7800 }, { x: 3897, y: 7800 }),
    wall("W-B1-010", "B1", { x: 3897, y: 7800 }, { x: 6650, y: 7800 }),
    wall("W-B1-011", "B1", { x: 6650, y: 7800 }, { x: 9495, y: 7800 }),
    wall("W-B1-012", "B1", { x: 5385, y: 5853 }, { x: 6650, y: 5853 }),
    wall("W-B1-013", "B1", { x: 6650, y: 5853 }, { x: 6650, y: 7800 })
  ], [], {
    stairs: [stair("ST-B1-001", "B1", { x: 4146, y: 4100 }, { x: 950, y: 4100 })]
  }),
  "B2": structure("B2", [
    wall("W-B2-001", "B2", { x: 3676, y: 350 }, { x: 5383, y: 350 }),
    wall("W-B2-002", "B2", { x: 5383, y: 350 }, { x: 9495, y: 350 }),
    wall("W-B2-003", "B2", { x: 3676, y: 350 }, { x: 3676, y: 3050 }),
    wall("W-B2-004", "B2", { x: 7610, y: 350 }, { x: 7610, y: 4222 }),
    wall("W-B2-005", "B2", { x: 9495, y: 350 }, { x: 9495, y: 4222 }),
    wall("W-B2-006", "B2", { x: 7610, y: 4222 }, { x: 9495, y: 4222 }),
    wall("W-B2-007", "B2", { x: 950, y: 3050 }, { x: 3676, y: 3050 }),
    wall("W-B2-008", "B2", { x: 950, y: 3050 }, { x: 950, y: 7800 }),
    wall("W-B2-009", "B2", { x: 950, y: 5150 }, { x: 3897, y: 5150 }),
    wall("W-B2-010", "B2", { x: 950, y: 7800 }, { x: 3897, y: 7800 }),
    wall("W-B2-011", "B2", { x: 3897, y: 7800 }, { x: 9495, y: 7800 }),
    wall("W-B2-012", "B2", { x: 9495, y: 4222 }, { x: 9495, y: 7800 })
  ], [], {
    stairs: [stair("ST-B2-001", "B2", { x: 4146, y: 4100 }, { x: 950, y: 4100 })]
  }),
  "YARD": structure("YARD", [], [], {
    outdoors: [createOutdoor("OD-YARD-001", "YARD", [{ x: 900, y: 850 }, { x: 10700, y: 850 }, { x: 10700, y: 7100 }, { x: 900, y: 7100 }])],
    fences: [
      createFence("FN-YARD-001", "YARD", { x: 900, y: 850 }, { x: 10700, y: 850 }),
      createFence("FN-YARD-002", "YARD", { x: 10700, y: 850 }, { x: 10700, y: 7100 })
    ],
    outdoorSurfaces: [
      createOutdoorSurface("OS-YARD-001", "YARD", "hardscape", [{ x: 1600, y: 1400 }, { x: 4600, y: 1400 }, { x: 4600, y: 3200 }, { x: 1600, y: 3200 }]),
      createOutdoorSurface("OS-YARD-002", "YARD", "path", [{ x: 4550, y: 2300 }, { x: 5550, y: 2300 }, { x: 9050, y: 6100 }, { x: 8050, y: 6100 }]),
      createOutdoorSurface("OS-YARD-003", "YARD", "planting", [{ x: 1300, y: 3900 }, { x: 4200, y: 3900 }, { x: 4200, y: 6600 }, { x: 1300, y: 6600 }])
    ]
  })
};

export const initialHouseStructures: Record<FloorId, HouseStructure> = syncHouseStructuresToReference(rawInitialHouseStructures);
