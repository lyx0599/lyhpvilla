import { createArcWall, createFence, createFloorCoordinateSystem, createOutdoor, createOutdoorSurface, createStair, createStraightWall, generateRoomsFromWalls } from "@/lib/house-geometry";
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
    wall("W-1F-001", "1F", { x: 950, y: 2700 }, { x: 4200, y: 2700 }),
    wall("W-1F-002", "1F", { x: 4200, y: 2700 }, { x: 4200, y: 7800 }),
    wall("W-1F-003", "1F", { x: 4200, y: 7800 }, { x: 950, y: 7800 }),
    wall("W-1F-004", "1F", { x: 950, y: 7800 }, { x: 950, y: 2700 }),
    wall("W-1F-005", "1F", { x: 4200, y: 3000 }, { x: 9500, y: 3000 }),
    wall("W-1F-006", "1F", { x: 9500, y: 3000 }, { x: 9500, y: 7800 }),
    wall("W-1F-007", "1F", { x: 9500, y: 7800 }, { x: 4200, y: 7800 }),
    wall("W-1F-008", "1F", { x: 6200, y: 350 }, { x: 9500, y: 350 }),
    wall("W-1F-009", "1F", { x: 9500, y: 350 }, { x: 9500, y: 3000 }),
    wall("W-1F-010", "1F", { x: 7600, y: 350 }, { x: 7600, y: 3000 })
  ], [], {
    doors: [door("D-1F-001", "1F", "W-1F-003", 0.72, 1050), door("D-1F-002", "1F", "W-1F-005", 0.28, 900)],
    windows: [windowObject("WIN-1F-001", "1F", "W-1F-001", 0.42, 1800), windowObject("WIN-1F-002", "1F", "W-1F-006", 0.58, 1500)],
    bayWindows: [bayWindow("BW-1F-001", "1F", "W-1F-008", 0.55, 1700)],
    stairs: [createStair("ST-1F-001", "1F", { x: 7100, y: 950 }, { x: 7100, y: 2850 })]
  }),
  "2F": structure("2F", [
    wall("W-2F-001", "2F", { x: 900, y: 600 }, { x: 9300, y: 600 }),
    wall("W-2F-002", "2F", { x: 9300, y: 600 }, { x: 9300, y: 7400 }),
    wall("W-2F-003", "2F", { x: 9300, y: 7400 }, { x: 6500, y: 7400 }),
    wall("W-2F-004", "2F", { x: 6500, y: 7400 }, { x: 6500, y: 8600 }),
    wall("W-2F-005", "2F", { x: 6500, y: 8600 }, { x: 900, y: 8600 }),
    wall("W-2F-006", "2F", { x: 900, y: 8600 }, { x: 900, y: 2400 }),
    wall("W-2F-007", "2F", { x: 900, y: 2400 }, { x: 2400, y: 2400 }),
    wall("W-2F-008", "2F", { x: 2400, y: 2400 }, { x: 2400, y: 600 }),
    wall("W-2F-009", "2F", { x: 4200, y: 600 }, { x: 4200, y: 4500 }),
    wall("W-2F-010", "2F", { x: 7000, y: 600 }, { x: 7000, y: 3200 }),
    wall("W-2F-011", "2F", { x: 6500, y: 4500 }, { x: 6500, y: 8600 })
  ], [], {
    doors: [door("D-2F-001", "2F", "W-2F-005", 0.24, 900)],
    windows: [windowObject("WIN-2F-001", "2F", "W-2F-001", 0.36, 1800), windowObject("WIN-2F-002", "2F", "W-2F-002", 0.5, 1600)]
  }),
  "B1": structure("B1", [
    wall("W-B1-001", "B1", { x: 2600, y: 300 }, { x: 8500, y: 300 }),
    wall("W-B1-002", "B1", { x: 8500, y: 300 }, { x: 8500, y: 3500 }),
    wall("W-B1-003", "B1", { x: 8500, y: 3500 }, { x: 5100, y: 3500 }),
    createArcWall("AW-B1-001", "B1", { x: 1750, y: 7000 }, 800, 90, 180, "clockwise"),
    wall("W-B1-004", "B1", { x: 5100, y: 6700 }, { x: 6900, y: 6700 }),
    wall("W-B1-005", "B1", { x: 6900, y: 6700 }, { x: 6900, y: 8600 }),
    wall("W-B1-006", "B1", { x: 6900, y: 8600 }, { x: 1200, y: 8600 }),
    wall("W-B1-007", "B1", { x: 1200, y: 8600 }, { x: 1200, y: 3500 }),
    wall("W-B1-008", "B1", { x: 1200, y: 3500 }, { x: 2600, y: 3500 }),
    wall("W-B1-009", "B1", { x: 2600, y: 3500 }, { x: 2600, y: 300 })
  ], [], {
    doors: [door("D-B1-001", "B1", "W-B1-006", 0.58, 950)],
    windows: [windowObject("WIN-B1-001", "B1", "W-B1-001", 0.55, 1500)]
  }),
  "B2": structure("B2", [
    wall("W-B2-001", "B2", { x: 4400, y: 350 }, { x: 8100, y: 350 }),
    wall("W-B2-002", "B2", { x: 8100, y: 350 }, { x: 8100, y: 7400 }),
    wall("W-B2-003", "B2", { x: 8100, y: 7400 }, { x: 5400, y: 7400 }),
    wall("W-B2-004", "B2", { x: 5400, y: 7400 }, { x: 5400, y: 8600 }),
    wall("W-B2-005", "B2", { x: 5400, y: 8600 }, { x: 1000, y: 8600 }),
    wall("W-B2-006", "B2", { x: 1000, y: 8600 }, { x: 1000, y: 3600 }),
    wall("W-B2-007", "B2", { x: 1000, y: 3600 }, { x: 3600, y: 3600 }),
    wall("W-B2-008", "B2", { x: 3600, y: 3600 }, { x: 3600, y: 2100 }),
    wall("W-B2-009", "B2", { x: 3600, y: 2100 }, { x: 4400, y: 2100 }),
    wall("W-B2-010", "B2", { x: 4400, y: 2100 }, { x: 4400, y: 350 })
  ], [], {
    doors: [door("D-B2-001", "B2", "W-B2-005", 0.52, 950)],
    windows: [windowObject("WIN-B2-001", "B2", "W-B2-002", 0.42, 1300)]
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
