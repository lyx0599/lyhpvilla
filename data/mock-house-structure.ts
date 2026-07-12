import { createColumn, createFence, createFloorCoordinateSystem, createOutdoor, createOutdoorSurface, createStair, createStraightWall, generateRoomsFromWalls, getPolygonArea } from "@/lib/house-geometry";
import { syncHouseStructuresToReference } from "@/lib/villa-structure-sync";
import type { FloorId, HouseBayWindow, HouseColumn, HouseDoor, HouseFence, HouseOutdoor, HouseOutdoorSurface, HousePartition, HouseRoom, HouseSkylight, HouseStair, HouseStructure, HouseWall, HouseWindow } from "@/types/space";

function wall(id: string, floorId: FloorId, start: { x: number; y: number }, end: { x: number; y: number }): HouseWall {
  return createStraightWall(id, floorId, start, end);
}

function railingWall(id: string, floorId: FloorId, start: { x: number; y: number }, end: { x: number; y: number }): HouseWall {
  const baseWall = wall(id, floorId, start, end);
  return {
    ...baseWall,
    name: `${baseWall.name} · 挑空镂空栏杆`,
    barrierType: "railing",
    material: "metal",
    openness: 0.72,
    thickness: 90,
    height: 1100
  };
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
  columns?: HouseColumn[];
  rooms?: HouseRoom[];
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

function skylight(id: string, name: string, center: { x: number; y: number }, floorId: FloorId = "B1", width = 800, depth = 560, rotation = 0): HouseSkylight {
  return {
    id,
    floorId,
    name,
    geometryType: "polygon",
    center,
    width,
    depth,
    height: 120,
    rotation,
    operation: "electricOperable",
    openable: true,
    motorized: true,
    note: floorId === "B2"
      ? "沿 W-B2-012 设置地下室采光井天窗，预留防水收边、排水坡度、电源、检修和防坠落措施。"
      : "电动可活动天窗，预留防水收边、排水坡度、电源和控制线路。",
    editable: true,
    removable: true
  };
}

function outdoor(id: string, floorId: FloorId, name: string, polygon: { x: number; y: number }[]): HouseOutdoor {
  return {
    ...createOutdoor(id, floorId, polygon),
    name
  };
}

function fence(id: string, floorId: FloorId, name: string, start: { x: number; y: number }, end: { x: number; y: number }): HouseFence {
  return {
    ...createFence(id, floorId, start, end),
    name,
    material: "wood"
  };
}

function surface(
  id: string,
  floorId: FloorId,
  name: string,
  surfaceType: HouseOutdoorSurface["surfaceType"],
  polygon: { x: number; y: number }[]
): HouseOutdoorSurface {
  return {
    ...createOutdoorSurface(id, floorId, surfaceType, polygon),
    name
  };
}

function stair(id: string, floorId: FloorId, start: { x: number; y: number }, end: { x: number; y: number }, width = 900): HouseStair {
  return {
    ...createStair(id, floorId, start, end),
    width
  };
}

const stairStackRuns = {
  upper: {
    start: { x: 4146, y: 3575 },
    end: { x: 950, y: 3575 },
    width: 1050
  },
  lower: {
    start: { x: 4146, y: 4625 },
    end: { x: 950, y: 4625 },
    width: 1050
  }
} as const;

function stairStackStair(id: string, floorId: FloorId, lane: keyof typeof stairStackRuns): HouseStair {
  const run = stairStackRuns[lane];
  return stair(id, floorId, run.start, run.end, run.width);
}

function column(id: string, floorId: FloorId, center: { x: number; y: number }, radius = 360): HouseColumn {
  return createColumn(id, floorId, center, radius);
}

function turningStairs(floorId: FloorId): HouseStair[] {
  if (floorId === "1F") {
    return [
      {
        ...stairStackStair("ST-1F-001", floorId, "upper"),
        name: "右侧平台上行梯段",
        baseHeight: 0,
        height: 1400,
        stepCount: 10,
        direction: "up"
      },
      {
        ...stairStackStair("ST-1F-002", floorId, "lower"),
        name: "右侧平台下行梯段",
        baseHeight: 0,
        height: 1400,
        stepCount: 10,
        direction: "down"
      }
    ];
  }

  if (floorId === "B1") {
    return [
      {
        ...stairStackStair("ST-B1-001", floorId, "lower"),
        name: "B1 上行至 1F 梯段",
        baseHeight: 0,
        height: 1400,
        stepCount: 10,
        direction: "up"
      },
      {
        ...stairStackStair("ST-B1-002", floorId, "upper"),
        name: "B1 下行至 B2 梯段",
        baseHeight: 0,
        height: 1400,
        stepCount: 10,
        direction: "down"
      }
    ];
  }

  return [
    {
      ...stair(`ST-${floorId}-001`, floorId, { x: 3676, y: 3050 }, { x: 950, y: 3050 }),
      name: "右侧平台上行梯段",
      baseHeight: 0,
      height: 1400,
      stepCount: 10,
      direction: "up"
    },
    {
      ...stair(`ST-${floorId}-002`, floorId, { x: 3676, y: 4000 }, { x: 950, y: 4000 }),
      name: "右侧平台下行梯段",
      baseHeight: 0,
      height: 1400,
      stepCount: 10,
      direction: "down"
    }
  ];
}

function topFloorArrivalStair(floorId: FloorId): HouseStair[] {
  return [
    {
      ...stairStackStair(`ST-${floorId}-001`, floorId, "upper"),
      name: "W-2F-012 1F→2F 到达梯段",
      baseHeight: 0,
      height: 2800,
      stepCount: 14,
      direction: "up"
    }
  ];
}

function room(id: string, floorId: FloorId, roomNumber: string, name: string, boundary: { x: number; y: number }[], sourceWallIds: string[]): HouseRoom {
  return {
    id,
    floorId,
    roomNumber,
    name,
    spaceType: "Room",
    geometryType: "polygon",
    boundary,
    area: getPolygonArea(boundary),
    sourceWallIds
  };
}

const b2LivingRoomBoundary = [
  { x: 3676, y: 350 },
  { x: 7610, y: 350 },
  { x: 7610, y: 4222 },
  { x: 9495, y: 4222 },
  { x: 9495, y: 5150 },
  { x: 3897, y: 5150 },
  { x: 3897, y: 3050 },
  { x: 3676, y: 3050 }
];

const b2StairRoomBoundary = [
  { x: 950, y: 3050 },
  { x: 4146, y: 3050 },
  { x: 4146, y: 5150 },
  { x: 950, y: 5150 }
];

const b2StorageRoomBoundary = [
  { x: 950, y: 4300 },
  { x: 2050, y: 4300 },
  { x: 950, y: 5150 }
];

const b2StudyRoomBoundary = [
  { x: 950, y: 5150 },
  { x: 5750, y: 5150 },
  { x: 5750, y: 7800 },
  { x: 950, y: 7800 }
];

const b2ActivityRoomBoundary = [
  { x: 5750, y: 5150 },
  { x: 9495, y: 5150 },
  { x: 9495, y: 7800 },
  { x: 5750, y: 7800 }
];

const b2DefinedRooms: HouseRoom[] = [
  room("ROOM-B2-001", "B2", "R-B2-001", "客厅", b2LivingRoomBoundary, ["W-B2-001", "W-B2-003", "W-B2-004", "W-B2-006", "W-B2-012"]),
  room("ROOM-B2-002", "B2", "R-B2-002", "楼梯间", b2StairRoomBoundary, ["W-B2-007", "W-B2-008", "W-B2-009"]),
  room("ROOM-B2-004", "B2", "R-B2-003", "储物间", b2StorageRoomBoundary, ["W-B2-008", "W-B2-009"]),
  room("ROOM-B2-005", "B2", "R-B2-004", "书房", b2StudyRoomBoundary, ["W-B2-010", "W-B2-011"]),
  room("ROOM-B2-003", "B2", "R-B2-005", "活动区", b2ActivityRoomBoundary, ["W-B2-011", "W-B2-012"])
];

const b2SupportColumns: HouseColumn[] = [
  {
    ...column("COL-B2-001", "B2", { x: 5750, y: 6200 }, 360),
    name: "B2圆柱立柱 / 支撑B1",
    supportsFloorId: "B1"
  }
];

function structure(floorId: FloorId, walls: HouseWall[], partitions: HousePartition[] = [], addons: StructureAddons = {}): HouseStructure {
  return {
    floorId,
    coordinateSystem: createFloorCoordinateSystem(floorId),
    walls,
    rooms: addons.rooms ?? generateRoomsFromWalls(floorId, walls),
    partitions,
    stairs: addons.stairs ?? [],
    columns: addons.columns ?? [],
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
    outdoors: [
      outdoor("OD-1F-NORTH-001", "1F", "北院 / 入户庭院 · 2m", [{ x: 950, y: -1650 }, { x: 9495, y: -1650 }, { x: 9495, y: 350 }, { x: 950, y: 350 }]),
      outdoor("OD-1F-SOUTH-001", "1F", "南院 / 生活庭院 · 4m", [{ x: 950, y: 7800 }, { x: 9495, y: 7800 }, { x: 9495, y: 11800 }, { x: 950, y: 11800 }])
    ],
    fences: [
      fence("FN-1F-NORTH-001", "1F", "北院北侧木篱笆", { x: 950, y: -1650 }, { x: 9495, y: -1650 }),
      fence("FN-1F-NORTH-002", "1F", "北院西侧分户木篱笆", { x: 950, y: -1650 }, { x: 950, y: 350 }),
      fence("FN-1F-NORTH-003", "1F", "北院东侧分户木篱笆", { x: 9495, y: -1650 }, { x: 9495, y: 350 }),
      fence("FN-1F-SOUTH-001", "1F", "南院南侧木篱笆", { x: 950, y: 11800 }, { x: 9495, y: 11800 }),
      fence("FN-1F-SOUTH-002", "1F", "南院西侧分户木篱笆", { x: 950, y: 7800 }, { x: 950, y: 11800 }),
      fence("FN-1F-SOUTH-003", "1F", "南院东侧分户木篱笆", { x: 9495, y: 7800 }, { x: 9495, y: 11800 })
    ],
    outdoorSurfaces: [
      { ...surface("OS-1F-NORTH-BBQ-HARD-PH", "1F", "占位｜北院烧烤硬化区", "hardscape", [{ x: 2600, y: -1550 }, { x: 7950, y: -1550 }, { x: 7950, y: 150 }, { x: 2600, y: 150 }]), material: "concrete" },
      { ...surface("OS-1F-SOUTH-DRYING-PH", "1F", "占位｜南院晾晒硬化区", "hardscape", [{ x: 1200, y: 8200 }, { x: 3650, y: 8200 }, { x: 3650, y: 9650 }, { x: 1200, y: 9650 }]), material: "concrete" },
      { ...surface("OS-1F-SOUTH-LOUNGE-PH", "1F", "占位｜南院休闲活动硬化区", "hardscape", [{ x: 5400, y: 8450 }, { x: 9100, y: 8450 }, { x: 9100, y: 10100 }, { x: 5400, y: 10100 }]), material: "stone" },
      { ...surface("OS-1F-SOUTH-PATH-PH", "1F", "占位｜南院连接小路", "path", [{ x: 3450, y: 8950 }, { x: 4200, y: 8700 }, { x: 5850, y: 9400 }, { x: 5600, y: 10150 }, { x: 4050, y: 9550 }]), material: "pebble" },
      { ...surface("OS-1F-SOUTH-PET-CORNER-PH", "1F", "占位｜南院宠物角排水铺装", "hardscape", [{ x: 7600, y: 10400 }, { x: 9250, y: 10400 }, { x: 9250, y: 11600 }, { x: 7600, y: 11600 }]), material: "pebble" }
    ],
    stairs: turningStairs("1F")
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
    stairs: topFloorArrivalStair("2F")
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
    railingWall("W-B1-012", "B1", { x: 5385, y: 5853 }, { x: 6650, y: 5853 }),
    railingWall("W-B1-013", "B1", { x: 6650, y: 5853 }, { x: 6650, y: 7800 })
  ], [], {
    stairs: turningStairs("B1"),
    skylights: [
      skylight("SKY-B1-W002-001", "W-B1-002 电动可活动天窗 1", { x: 6100, y: 760 }),
      skylight("SKY-B1-W002-002", "W-B1-002 电动可活动天窗 2", { x: 7350, y: 760 }),
      skylight("SKY-B1-W002-003", "W-B1-002 电动可活动天窗 3", { x: 8600, y: 760 }),
      skylight("SKY-B1-W009-001", "W-B1-009 电动可活动天窗 1", { x: 1850, y: 7350 }),
      skylight("SKY-B1-W009-002", "W-B1-009 电动可活动天窗 2", { x: 3000, y: 7350 })
    ]
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
    stairs: [{
      ...stairStackStair("ST-B2-001", "B2", "upper"),
      name: "B2 上行至 B1 楼梯",
      baseHeight: 0,
      height: 2800,
      stepCount: 14,
      direction: "up"
    }],
    columns: b2SupportColumns,
    rooms: b2DefinedRooms,
    doors: [door("D-B2-001", "B2", "W-B2-003", 0.525, 900)],
    skylights: [
      skylight("SKY-B2-W012-001", "W-B2-012 电动采光天窗 1", { x: 9140, y: 5200 }, "B2", 620, 950, 90),
      skylight("SKY-B2-W012-002", "W-B2-012 电动采光天窗 2", { x: 9140, y: 6820 }, "B2", 620, 950, 90)
    ]
  }),
  "YARD": structure("YARD", [], [], {
    outdoors: [createOutdoor("OD-YARD-001", "YARD", [{ x: 900, y: 850 }, { x: 10700, y: 850 }, { x: 10700, y: 7100 }, { x: 900, y: 7100 }])],
    fences: [
      createFence("FN-YARD-001", "YARD", { x: 900, y: 850 }, { x: 10700, y: 850 }),
      createFence("FN-YARD-002", "YARD", { x: 10700, y: 850 }, { x: 10700, y: 7100 })
    ],
    outdoorSurfaces: [
      { ...createOutdoorSurface("OS-YARD-001", "YARD", "hardscape", [{ x: 1600, y: 1400 }, { x: 4600, y: 1400 }, { x: 4600, y: 3200 }, { x: 1600, y: 3200 }]), name: "石板休闲平台", material: "stone" },
      { ...createOutdoorSurface("OS-YARD-002", "YARD", "path", [{ x: 4550, y: 2300 }, { x: 5550, y: 2300 }, { x: 9050, y: 6100 }, { x: 8050, y: 6100 }]), name: "鹅卵石步道", material: "pebble" },
      { ...createOutdoorSurface("OS-YARD-003", "YARD", "planting", [{ x: 1300, y: 3900 }, { x: 4200, y: 3900 }, { x: 4200, y: 6600 }, { x: 1300, y: 6600 }]), name: "边界花境", material: "shrub" }
    ]
  })
};

function withStructureDefaults(structures: Record<FloorId, HouseStructure>): Record<FloorId, HouseStructure> {
  return Object.fromEntries(
    Object.entries(structures).map(([floorId, structure]) => [
      floorId,
      {
        ...structure,
        columns: structure.columns ?? []
      }
    ])
  ) as Record<FloorId, HouseStructure>;
}

/**
 * Legacy migration material only. Runtime project data must come from
 * data/default-workspace.json through applyWorkspaceMigrations.
 */
export const legacyHouseStructureFallback: Record<FloorId, HouseStructure> = withStructureDefaults(syncHouseStructuresToReference(rawInitialHouseStructures));
