import type { DrawingItem, Floor, FloorId, HouseStructure, LightingLayer } from "@/types/space";
import type { LightingDesign, WorkspaceDataCategory, WorkspaceDataSourceReport, WorkspaceDocument } from "@/types/workspace";
import { normalizeVerificationMeta, verificationTargetCollections } from "./dimension-verification.ts";
import { getDrawingItemGeneratedFingerprint, getLegacyDrawingItemGeneratedFingerprintV13 } from "./drawing-items.ts";
import { generateLightingDesignV1 } from "./lighting-design.ts";
import { withFurnitureVariantDefaults } from "./furniture-variants.ts";
import { buildManagedStairInfrastructure, normalizeManagedStairFlights } from "./stair-systems.ts";

export const CURRENT_WORKSPACE_SCHEMA_VERSION = 18;
export const CURRENT_WORKSPACE_DATA_REVISION = "2026-07-23-yard-realism-v2";

const trackedCategories: WorkspaceDataCategory[] = [
  "floors",
  "houseStructuresByFloor",
  "stairSystems",
  "stairLandings",
  "stairOpenings",
  "furniture",
  "drawingItems",
  "drawingPackage",
  "semanticObjects",
  "cameraViews",
  "roomTourViews",
  "lightingDesign",
  "visualSettingsByFloor",
  "cleanPatchesByFloor"
];

function emptyLightingDesign(): LightingDesign {
  return {
    version: "modern-warm-v1",
    style: "modern-warm",
    generatedAt: "",
    fixtureFamilies: [],
    scenes: [],
    pendingConfirmations: []
  };
}

type WorkspaceMigrationOptions = {
  canonicalWorkspace?: WorkspaceDocument;
};

function hasOwn(value: object, key: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergeManagedItems<T extends { id: string }>(existing: T[] | undefined, managed: T[]) {
  const managedIds = new Set(managed.map((item) => item.id));
  return [...(existing ?? []).filter((item) => !managedIds.has(item.id)), ...cloneJson(managed)];
}

function emptyStructure(floorId: FloorId): HouseStructure {
  return {
    floorId,
    coordinateSystem: {
      floorId,
      origin: { x: 0, y: 0 },
      unit: "mm",
      width: 10000,
      height: 10000,
      scale: 100,
      note: "Migration fallback coordinate system"
    },
    walls: [],
    rooms: [],
    partitions: [],
    stairs: [],
    columns: [],
    fences: [],
    outdoorSurfaces: [],
    doors: [],
    windows: [],
    bayWindows: [],
    skylights: [],
    outdoors: [],
    outdoorZones: []
  };
}

function sourceReportFor(workspace: Record<string, unknown>): WorkspaceDataSourceReport {
  return Object.fromEntries(trackedCategories.map((category) => [
    category,
    hasOwn(workspace, category) ? "default-workspace" : "migration"
  ])) as WorkspaceDataSourceReport;
}

function migrateFloorStructure(
  floorId: FloorId,
  current: Partial<HouseStructure> | undefined,
  canonical: HouseStructure | undefined,
  canMigrate: boolean
): { structure: HouseStructure; migrated: boolean } {
  if (!current) {
    if (!canMigrate) throw new Error(`Current workspace is missing houseStructuresByFloor.${floorId}.`);
    return { structure: cloneJson(canonical ?? emptyStructure(floorId)), migrated: true };
  }
  const fallback = canonical ?? emptyStructure(floorId);
  const collections: Array<keyof HouseStructure> = [
    "walls",
    "rooms",
    "partitions",
    "stairs",
    "columns",
    "fences",
    "outdoorSurfaces",
    "doors",
    "windows",
    "bayWindows",
    "skylights",
    "outdoors",
    "outdoorZones"
  ];
  const migrated = { ...current, floorId } as HouseStructure;
  let changed = false;
  if (!current.coordinateSystem) {
    if (!canMigrate) throw new Error(`Current workspace is missing houseStructuresByFloor.${floorId}.coordinateSystem.`);
    migrated.coordinateSystem = cloneJson(fallback.coordinateSystem);
    changed = true;
  }
  collections.forEach((collection) => {
    if (!hasOwn(current, collection)) {
      if (!canMigrate) throw new Error(`Current workspace is missing houseStructuresByFloor.${floorId}.${collection}.`);
      (migrated as unknown as Record<string, unknown>)[collection] = cloneJson(fallback[collection]);
      changed = true;
    }
  });
  return { structure: migrated, migrated: changed };
}

function migrateStairLaneConvention(workspace: Partial<WorkspaceDocument>) {
  const structures = workspace.houseStructuresByFloor;
  if (!structures) return false;
  let changed = false;
  const labels: Partial<Record<FloorId, Record<string, string>>> = {
    "1F": {
      "ST-1F-001": "右侧上行至 2F 梯段",
      "ST-1F-002": "左侧下行至 B1 梯段"
    },
    B1: {
      "ST-B1-001": "右侧上行至 1F 梯段",
      "ST-B1-002": "左侧下行至 B2 梯段"
    }
  };

  Object.entries(labels).forEach(([floorId, floorLabels]) => {
    const structure = structures[floorId as FloorId];
    if (!structure) return;
    structure.stairs.forEach((stair) => {
      const nextName = floorLabels?.[stair.id];
      if (!nextName || stair.name === nextName) return;
      stair.name = nextName;
      changed = true;
    });
  });

  const b1 = structures.B1;
  const upRun = b1?.stairs.find((stair) => stair.id === "ST-B1-001" && stair.direction === "up");
  const downRun = b1?.stairs.find((stair) => stair.id === "ST-B1-002" && stair.direction === "down");
  if (upRun && downRun && upRun.start.y > downRun.start.y) {
    const upStart = cloneJson(upRun.start);
    const upEnd = cloneJson(upRun.end);
    upRun.start = cloneJson(downRun.start);
    upRun.end = cloneJson(downRun.end);
    downRun.start = upStart;
    downRun.end = upEnd;
    changed = true;
  }
  return changed;
}

function migrateDimensionVerification(workspace: Partial<WorkspaceDocument>) {
  const structures = workspace.houseStructuresByFloor;
  if (!structures) return false;
  let changed = false;
  Object.values(structures).forEach((structure) => {
    if (!structure) return;
    verificationTargetCollections.forEach((collection) => {
      structure[collection].forEach((object) => {
        if (object.verificationMeta?.status && object.verificationMeta?.source) return;
        object.verificationMeta = normalizeVerificationMeta(object.verificationMeta, collection);
        changed = true;
      });
    });
  });
  return changed;
}

function migrateWholeHouseSurfaceFinishes(workspace: Partial<WorkspaceDocument>, canonical?: WorkspaceDocument) {
  if (!workspace.houseStructuresByFloor || !canonical?.houseStructuresByFloor) return false;
  let changed = false;
  Object.entries(canonical.houseStructuresByFloor).forEach(([floorId, canonicalStructure]) => {
    const structure = workspace.houseStructuresByFloor?.[floorId as FloorId];
    if (!structure || !canonicalStructure) return;
    canonicalStructure.rooms.forEach((canonicalRoom) => {
      if (!canonicalRoom.surfaceFinishes) return;
      const room = structure.rooms.find((candidate) => candidate.id === canonicalRoom.id);
      if (!room) return;
      room.surfaceFinishes ??= {};
      if (!room.surfaceFinishes.floor && canonicalRoom.surfaceFinishes.floor) {
        room.surfaceFinishes.floor = cloneJson(canonicalRoom.surfaceFinishes.floor);
        changed = true;
      }
      if (!room.surfaceFinishes.wall && canonicalRoom.surfaceFinishes.wall) {
        room.surfaceFinishes.wall = cloneJson(canonicalRoom.surfaceFinishes.wall);
        changed = true;
      }
    });
  });
  return changed;
}

function migrateLivingWindowAndWaterbar(workspace: Partial<WorkspaceDocument>, canonical?: WorkspaceDocument) {
  if (!workspace.furniture || !canonical?.furniture) return false;
  const managedFurnitureIds = new Set([
    "furn-living-waterbar-001",
    "furn-living-waterbar-upper-001",
    "furn-living-snack-pullout-001"
  ]);
  const canonicalFurniture = new Map(canonical.furniture.filter((item) => managedFurnitureIds.has(item.id)).map((item) => [item.id, item]));
  let changed = false;
  workspace.furniture = workspace.furniture.map((item) => {
    const managed = canonicalFurniture.get(item.id);
    if (!managed || JSON.stringify(item) === JSON.stringify(managed)) return item;
    changed = true;
    return cloneJson(managed);
  });
  const windows = workspace.houseStructuresByFloor?.["1F"]?.windows;
  const canonicalWindow = canonical.houseStructuresByFloor?.["1F"]?.windows.find((window) => window.id === "WIN-1F-006");
  const windowIndex = windows?.findIndex((window) => window.id === "WIN-1F-006") ?? -1;
  if (windows && canonicalWindow && windowIndex >= 0 && JSON.stringify(windows[windowIndex]) !== JSON.stringify(canonicalWindow)) {
    windows[windowIndex] = cloneJson(canonicalWindow);
    changed = true;
  }
  return changed;
}

function migrateInteriorDoorDesigns(workspace: Partial<WorkspaceDocument>, canonical?: WorkspaceDocument) {
  const managedDoorIds = new Set([
    "D-B1-001",
    "D-1F-003",
    "D-1F-005",
    "D-2F-003",
    "D-2F-004",
    "D-2F-006",
    "D-2F-007",
    "D-2F-008"
  ]);
  if (!workspace.houseStructuresByFloor || !canonical?.houseStructuresByFloor) return false;
  let changed = false;
  for (const floorId of ["B1", "1F", "2F"] as const) {
    const doors = workspace.houseStructuresByFloor[floorId]?.doors;
    const canonicalDoors = new Map((canonical.houseStructuresByFloor[floorId]?.doors ?? []).filter((door) => managedDoorIds.has(door.id)).map((door) => [door.id, door]));
    if (!doors) continue;
    for (let index = 0; index < doors.length; index += 1) {
      const managed = canonicalDoors.get(doors[index].id);
      if (!managed || JSON.stringify(doors[index]) === JSON.stringify(managed)) continue;
      doors[index] = cloneJson(managed);
      changed = true;
    }
  }
  return changed;
}

function migrateFurniturePlacement(workspace: Partial<WorkspaceDocument>) {
  if (!workspace.furniture || !workspace.drawingItems || !workspace.houseStructuresByFloor) return false;
  let changed = false;
  const furnitureById = new Map(workspace.furniture.map((item) => [item.id, item]));
  workspace.furniture.forEach((item) => {
    if (!item.outdoorId && item.roomId.startsWith("OD-")) {
      item.outdoorId = item.roomId;
      changed = true;
    }
  });
  workspace.drawingItems.forEach((item) => {
    if (!item.relatedFurnitureId || item.relatedFurniturePositionMm) return;
    const furniture = furnitureById.get(item.relatedFurnitureId);
    const structure = furniture ? workspace.houseStructuresByFloor?.[furniture.floorId] : undefined;
    if (!furniture || !structure) return;
    item.relatedFurniturePositionMm = {
      x: Math.round(structure.coordinateSystem.origin.x + furniture.position.x / 100 * structure.coordinateSystem.width),
      y: Math.round(structure.coordinateSystem.origin.y + furniture.position.y / 100 * structure.coordinateSystem.height)
    };
    changed = true;
  });
  return changed;
}

/** Reconciles old browser drafts against the real north/south yard boundary. */
function migrateOutdoorObjectBoundaries(workspace: Partial<WorkspaceDocument>) {
  const yard = workspace.houseStructuresByFloor?.YARD;
  if (!yard || !workspace.furniture) return false;
  let changed = false;
  workspace.furniture.forEach((item) => {
    if (item.floorId !== "YARD" || !item.outdoorObjectType) return;
    const outdoor = yard.outdoors.find((candidate) => candidate.id === (item.outdoorId ?? item.roomId));
    if (!outdoor?.polygon.length) return;
    const minX = Math.min(...outdoor.polygon.map((point) => point.x));
    const maxX = Math.max(...outdoor.polygon.map((point) => point.x));
    const minY = Math.min(...outdoor.polygon.map((point) => point.y));
    const maxY = Math.max(...outdoor.polygon.map((point) => point.y));
    const halfWidth = item.dimensions.width * 5;
    const halfDepth = item.dimensions.depth * 5;
    const currentX = yard.coordinateSystem.width * item.position.x / 100;
    const currentY = yard.coordinateSystem.height * item.position.y / 100;
    const nextX = Math.min(maxX - halfWidth, Math.max(minX + halfWidth, currentX));
    const nextY = Math.min(maxY - halfDepth, Math.max(minY + halfDepth, currentY));
    const nextPosition = { ...item.position, x: Number((nextX / yard.coordinateSystem.width * 100).toFixed(3)), y: Number((nextY / yard.coordinateSystem.height * 100).toFixed(3)) };
    if (nextPosition.x === item.position.x && nextPosition.y === item.position.y) return;
    item.position = nextPosition;
    changed = true;
  });
  return changed;
}

/** Gives legacy drafts the same edge planting layout as the canonical yard. */
function migrateOutdoorLandscapeEdgeLayout(workspace: Partial<WorkspaceDocument>) {
  if (!workspace.furniture) return false;
  const positions: Record<string, { x: number; y: number }> = {
    "furn-plant-001": { x: 37.5, y: -11.5 },
    "OUT-N-PLANTER": { x: 72, y: -14 },
    "OUT-S-GARDEN-BED": { x: 52, y: 125 }
  };
  let changed = false;
  workspace.furniture.forEach((item) => {
    const position = positions[item.id];
    if (!position || item.floorId !== "YARD" || (item.position.x === position.x && item.position.y === position.y)) return;
    item.position = { ...item.position, ...position };
    changed = true;
  });
  return changed;
}

function migrateYardRealismLayout(workspace: Partial<WorkspaceDocument>) {
  if (!workspace.furniture) return false;
  const layouts: Record<string, { x?: number; y?: number; width?: number; depth?: number; height?: number }> = {
    "ph-1f-north-yard-gate": { x: 36.5 },
    "OUT-S-RELAX": { x: 64, y: 95, width: 240, depth: 150 },
    "OUT-S-UMBRELLA": { x: 64, y: 100, width: 220, depth: 220, height: 250 },
    "OUT-S-DRYING": { y: 113 },
    "OUT-S-PET-HOUSE": { x: 73, y: 119, width: 90, depth: 70, height: 78 },
    "OUT-S-PET-WASH": { x: 75, y: 116 }
  };
  let changed = false;
  workspace.furniture.forEach((item) => {
    const layout = layouts[item.id];
    if (!layout || item.floorId !== "YARD") return;
    const nextPosition = { ...item.position, x: layout.x ?? item.position.x, y: layout.y ?? item.position.y };
    const nextDimensions = { ...item.dimensions, width: layout.width ?? item.dimensions.width, depth: layout.depth ?? item.dimensions.depth, height: layout.height ?? item.dimensions.height };
    if (JSON.stringify(nextPosition) !== JSON.stringify(item.position)) { item.position = nextPosition; changed = true; }
    if (JSON.stringify(nextDimensions) !== JSON.stringify(item.dimensions)) { item.dimensions = nextDimensions; changed = true; }
  });
  const cameraLayouts: Record<string, { cameraPosition: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } }> = {
    "view-yard-south": { cameraPosition: { x: 2.7, y: 2.5, z: 6.8 }, target: { x: 0.3, y: 0.45, z: 5.15 } },
    "view-yard-south-living": { cameraPosition: { x: 2.8, y: 1.8, z: 6.65 }, target: { x: 1, y: 0.55, z: 4.9 } },
    "view-yard-north": { cameraPosition: { x: 0, y: 2.9, z: -7.3 }, target: { x: 0.45, y: 0.52, z: -4.8 } },
    "view-yard-entry": { cameraPosition: { x: -0.35, y: 1.7, z: -5.3 }, target: { x: 1, y: 0.5, z: -4.55 } }
  };
  workspace.cameraViews?.forEach((view) => {
    const layout = cameraLayouts[view.id];
    if (!layout) return;
    if (JSON.stringify(view.cameraPosition) !== JSON.stringify(layout.cameraPosition)) { view.cameraPosition = layout.cameraPosition; changed = true; }
    if (JSON.stringify(view.target) !== JSON.stringify(layout.target)) { view.target = layout.target; changed = true; }
  });
  return changed;
}

/** Aligns the north-yard buildable edge with 1F wall W-003 and repacks its program. */
function migrateNorthYardW003Alignment(workspace: Partial<WorkspaceDocument>) {
  const yard = workspace.houseStructuresByFloor?.YARD;
  if (!yard || !workspace.furniture) return false;
  let changed = false;
  const polygon = (coordinates: Array<[number, number]>) => coordinates.map(([x, y]) => ({ x, y }));
  const area = (points: Array<{ x: number; y: number }>) => Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
  const replacePolygon = (items: Array<{ id: string; polygon: Array<{ x: number; y: number }>; area: number }> | undefined, id: string, coordinates: Array<[number, number]>) => {
    const item = items?.find((candidate) => candidate.id === id);
    if (!item) return;
    const next = polygon(coordinates);
    if (JSON.stringify(item.polygon) === JSON.stringify(next)) return;
    item.polygon = next;
    item.area = area(next);
    changed = true;
  };
  replacePolygon(yard.outdoors, "OD-YARD-NORTH-001", [[3676, -1650], [9495, -1650], [9495, 350], [3676, 350]]);
  replacePolygon(yard.outdoorZones, "OZ-NORTH-KITCHEN-001", [[5400, -1550], [7900, -1550], [7900, 120], [5400, 120]]);
  replacePolygon(yard.outdoorZones, "OZ-NORTH-PLANT-001", [[8050, -1550], [9400, -1550], [9400, 220], [8050, 220]]);
  replacePolygon(yard.outdoorZones, "OZ-NORTH-STORAGE-001", [[3800, -1500], [5050, -1500], [5050, 120], [3800, 120]]);
  replacePolygon(yard.outdoorSurfaces, "OS-YARD-NORTH-KITCHEN-DECK", [[5400, -1550], [7900, -1550], [7900, 120], [5400, 120]]);
  replacePolygon(yard.outdoorSurfaces, "OS-YARD-NORTH-PLANT", [[8050, -1550], [9400, -1550], [9400, 220], [8050, 220]]);
  replacePolygon(yard.outdoorSurfaces, "OS-YARD-NORTH-STORAGE", [[3800, -1500], [5050, -1500], [5050, 120], [3800, 120]]);
  const yardSkylight = (id: string, sourceId: string, name: string, x: number, y: number) => ({
    id, floorId: "YARD" as const, name, geometryType: "polygon" as const, center: { x, y }, width: 800, depth: 560, height: 120,
    rotation: 0, operation: "electricOperable" as const, openable: true, motorized: true,
    note: `地下室天窗地面投影，对应 ${sourceId}；四周预留 600mm 检修、开启与排水净空，禁止布置家具或种植箱。`,
    editable: true as const, removable: true as const, verificationMeta: { status: "drawing-derived" as const, source: "developer-plan" as const, toleranceMm: 80 }
  });
  const skylights = [
    yardSkylight("SKY-YARD-B1-N-001", "SKY-B1-W002-001", "北院 · 地下室采光天窗 1", 6100, 70),
    yardSkylight("SKY-YARD-B1-N-002", "SKY-B1-W002-002", "北院 · 地下室采光天窗 2", 7350, 70),
    yardSkylight("SKY-YARD-B1-N-003", "SKY-B1-W002-003", "北院 · 地下室采光天窗 3", 8600, 70),
    yardSkylight("SKY-YARD-B1-S-001", "SKY-B1-W009-001", "南院 · 地下室采光天窗 1", 1850, 8080),
    yardSkylight("SKY-YARD-B1-S-002", "SKY-B1-W009-002", "南院 · 地下室采光天窗 2", 3000, 8080)
  ];
  if (JSON.stringify(yard.skylights) !== JSON.stringify(skylights)) {
    yard.skylights = skylights;
    changed = true;
  }
  const positions: Record<string, { x: number; y: number }> = {
    "ph-1f-north-outdoor-socket": { x: 32, y: -9 },
    "OUT-N-KITCHEN-ISLAND": { x: 54, y: -13.6 },
    "OUT-N-BBQ": { x: 60, y: -13 },
    "OUT-N-TAP": { x: 48, y: -12.2 },
    "OUT-N-STORAGE": { x: 37, y: -9.1 },
    "OUT-N-HOSE": { x: 38, y: -9.2 },
    "OUT-S-LAUNDRY": { x: 23, y: 103.2 }
  };
  const depths: Record<string, number> = {
    "OUT-N-KITCHEN-ISLAND": 80,
    "OUT-N-PLANTER": 50
  };
  workspace.furniture.forEach((item) => {
    const position = positions[item.id];
    if (item.floorId !== "YARD") return;
    if (position && (item.position.x !== position.x || item.position.y !== position.y)) {
      item.position = { ...item.position, ...position };
      changed = true;
    }
    if (depths[item.id] !== undefined && item.dimensions.depth !== depths[item.id]) {
      item.dimensions = { ...item.dimensions, depth: depths[item.id] };
      changed = true;
    }
  });
  return changed;
}

function migrateFurnitureVariants(workspace: Partial<WorkspaceDocument>) {
  if (!workspace.furniture) return false;
  let changed = false;
  workspace.furniture = workspace.furniture.map((item) => {
    if (item.render3d?.variantId && Number.isInteger(item.render3d.variationSeed) && item.render3d.variationSeed! >= 0) return item;
    changed = true;
    return withFurnitureVariantDefaults(item);
  });
  return changed;
}

function inferLightingLayer(item: DrawingItem): LightingLayer {
  const text = `${item.type} ${item.label}`.toLowerCase();
  if (/cabinet|wardrobe|strip|柜|灯带/.test(text)) return "cabinetStrip";
  if (/mirror|镜/.test(text)) return "mirrorLight";
  if (item.floorId === "YARD" || /outdoor|yard|path|fence|plant|庭院|路径|围栏|植物/.test(text)) return "outdoor";
  if (/accent|spot|重点|壁炉|背景/.test(text)) return "accent";
  if (/decorative|mood|night|bedside|氛围|夜灯|床头/.test(text)) return "decorative";
  if (/task|desk|counter|shower|功能|台面|书桌|淋浴/.test(text)) return "task";
  return "ambient";
}

function inferMountingType(layer: LightingLayer): NonNullable<DrawingItem["mountingType"]> {
  if (layer === "cabinetStrip") return "cabinetIntegrated";
  if (layer === "mirrorLight") return "mirrorIntegrated";
  if (layer === "outdoor") return "wallMounted";
  if (layer === "decorative") return "wallMounted";
  return "recessed";
}

function migrateLightingDrawingItemsV1(workspace: Partial<WorkspaceDocument>) {
  const items = workspace.drawingItems;
  if (!items) return false;
  let changed = false;
  const switches = items.filter((item) => item.category === "switch");
  items.forEach((item) => {
    if (item.relatedRoomId === undefined) { item.relatedRoomId = item.roomId; changed = true; }
    if (item.controlGroupId === undefined) { item.controlGroupId = item.lightGroupId ?? null; changed = true; }
    if (item.smartControl === undefined) { item.smartControl = Boolean(item.needsSmartControl); changed = true; }
    if (item.dimming === undefined) { item.dimming = false; changed = true; }
    if (item.category !== "light") return;
    if (item.lightType === undefined) { item.lightType = item.type || "lighting"; changed = true; }
    if (item.lightingLayer === undefined) { item.lightingLayer = inferLightingLayer(item); changed = true; }
    if (item.colorTemperature === undefined) { item.colorTemperature = item.lightColorTemperature ?? "3000K"; changed = true; }
    if (item.beamAngle === undefined) { item.beamAngle = null; changed = true; }
    if (item.mountingType === undefined) { item.mountingType = inferMountingType(item.lightingLayer ?? inferLightingLayer(item)); changed = true; }
    if (item.hostCeilingAreaId === undefined) { item.hostCeilingAreaId = null; changed = true; }
    if (item.relatedSwitchId === undefined) {
      item.relatedSwitchId = switches.find((candidate) => candidate.controlledLightIds?.includes(item.id) || (item.controlGroupId && (candidate.controlGroupId ?? candidate.lightGroupId) === item.controlGroupId))?.id ?? null;
      changed = true;
    }
  });
  return changed;
}

/**
 * Keeps MEP intent attached to the existing DrawingItem model.  Until developer
 * drawings and site measurements exist, absolute coordinates are explicitly a
 * scheme recommendation rather than a construction instruction.
 */
function migrateMepSchemePositioning(workspace: Partial<WorkspaceDocument>) {
  if (!workspace.drawingItems) return false;
  const mepCategories = new Set(["socket", "network", "switch", "light", "waterSupply", "drainage"]);
  let changed = false;
  workspace.drawingItems.forEach((item) => {
    if (!mepCategories.has(item.category)) return;
    if (item.confidence === undefined) { item.confidence = "schemePositioned"; changed = true; }
    if (item.positioningBasis === undefined) { item.positioningBasis = item.relatedFurnitureId ? "currentFurnitureLayout" : "currentCabinetLayout"; changed = true; }
    if (item.serviceScenario === undefined) { item.serviceScenario = item.relatedFurnitureId ? "家具/设备关联需求" : "空间使用与控制需求"; changed = true; }
    if (item.pendingConfirmations === undefined) {
      item.pendingConfirmations = ["developerOriginalPoint", "finishedWallDimension", "existingCircuit", "cabinetShopDrawing"];
      changed = true;
    }
    if (item.positionRule === undefined) {
      item.positionRule = item.relatedFurnitureId
        ? { type: "relativeToObject", anchor: /洗碗机|净水|冰箱|烤箱|蒸箱/.test(`${item.label} ${item.notes}`) ? "rearOrAdjacentCabinet" : "objectEdge", offsetMm: 150, side: "rear" }
        : item.hostWallId ? { type: "relativeToWall", anchor: "wallCenter", offsetMm: 0, side: "center" } : null;
      changed = true;
    }
  });
  return changed;
}

function migrateLightingSemanticCorrections(workspace: Partial<WorkspaceDocument>) {
  if (!workspace.drawingItems || !workspace.houseStructuresByFloor) return false;
  let changed = false;
  const kitchenRoomIds = new Set(Object.values(workspace.houseStructuresByFloor)
    .flatMap((structure) => structure?.rooms ?? [])
    .filter((room) => /厨房/.test(room.name))
    .map((room) => room.id));
  const invalidKitchenLights = workspace.drawingItems.filter((item) => (
    item.category === "light"
    && kitchenRoomIds.has(item.relatedRoomId ?? item.roomId ?? "")
    && (item.lightingLayer === "mirrorLight" || /镜前灯|镜柜灯|马桶夜灯/.test(item.label))
  ));
  const removedLightIds = new Set(invalidKitchenLights.map((item) => item.id));
  const removedControlGroupIds = new Set(invalidKitchenLights.map((item) => item.controlGroupId).filter((id): id is string => Boolean(id)));
  if (removedLightIds.size > 0) {
    workspace.drawingItems = workspace.drawingItems.filter((item) => (
      !removedLightIds.has(item.id)
      && !(item.category === "switch" && Boolean(item.controlGroupId && removedControlGroupIds.has(item.controlGroupId)))
    ));
    changed = true;
  }

  const ambientGroupIds = new Set(workspace.drawingItems
    .filter((item) => item.category === "light" && item.lightingLayer === "ambient")
    .map((item) => item.controlGroupId)
    .filter((id): id is string => Boolean(id)));
  workspace.drawingItems.forEach((item) => {
    let itemChanged = false;
    if (item.controlledLightIds?.some((id) => removedLightIds.has(id))) {
      item.controlledLightIds = item.controlledLightIds.filter((id) => !removedLightIds.has(id));
      itemChanged = true;
    }
    if (item.relatedLightIds?.some((id) => removedLightIds.has(id))) {
      item.relatedLightIds = item.relatedLightIds.filter((id) => !removedLightIds.has(id));
      itemChanged = true;
    }
    if (item.category === "light" && item.lightingLayer === "ambient") {
      const currentSpec = item.lightSpec ?? {};
      if ((currentSpec.luminousFluxLm ?? 0) < 950 || (currentSpec.powerW ?? 0) < 11) {
        item.lightSpec = { ...currentSpec, luminousFluxLm: Math.max(currentSpec.luminousFluxLm ?? 0, 950), powerW: Math.max(currentSpec.powerW ?? 0, 11) };
        itemChanged = true;
      }
    }
    if (itemChanged) {
      if (item.generatedKey) item.generatedFingerprint = getDrawingItemGeneratedFingerprint(item);
      changed = true;
    }
  });

  const sceneAmbientMinimum = new Map([
    ["日常", 85],
    ["会客", 75],
    ["烹饪", 85],
    ["1F 客厅日常会客", 80]
  ]);
  workspace.lightingDesign?.scenes.forEach((scene) => {
    const minimum = sceneAmbientMinimum.get(scene.name);
    const previousStates = scene.groupStates;
    scene.groupStates = previousStates
      .filter((state) => !removedControlGroupIds.has(state.controlGroupId))
      .map((state) => minimum && state.on && ambientGroupIds.has(state.controlGroupId) && state.brightness < minimum
        ? { ...state, brightness: minimum }
        : state);
    if (JSON.stringify(previousStates) !== JSON.stringify(scene.groupStates)) changed = true;
  });
  const validDrawingItemIds = new Set(workspace.drawingItems.map((item) => item.id));
  if (workspace.drawingPackage?.drawingItemIds.some((id) => !validDrawingItemIds.has(id))) {
    workspace.drawingPackage.drawingItemIds = workspace.drawingPackage.drawingItemIds.filter((id) => validDrawingItemIds.has(id));
    changed = true;
  }
  return changed;
}

/**
 * Upgrades persisted workspace data without replacing any field or collection
 * that already exists. Empty arrays are intentional user data and stay empty.
 */
export function applyWorkspaceMigrations(
  input: Partial<WorkspaceDocument>,
  options: WorkspaceMigrationOptions = {}
) {
  const original = input as Record<string, unknown>;
  const canonical = options.canonicalWorkspace;
  const sources = sourceReportFor(original);
  const workspace = cloneJson(input) as Partial<WorkspaceDocument>;
  const canMigrate = (input.schemaVersion ?? 0) < CURRENT_WORKSPACE_SCHEMA_VERSION
    || input.dataRevision !== CURRENT_WORKSPACE_DATA_REVISION;
  const needsModernWarmLighting = (input.schemaVersion ?? 0) < 14
    || !hasOwn(original, "lightingDesign")
    || !input.lightingDesign?.fixtureFamilies?.length
    || Boolean(input.drawingItems?.some((item) => item.generatedKey?.startsWith("lighting-design-v1:") && item.category === "light" && !item.lightSpec?.fixtureFamily));

  const migrateMissingCategory = <K extends WorkspaceDataCategory>(key: K, fallback: WorkspaceDocument[K]) => {
    if (hasOwn(original, key)) return;
    if (!canMigrate) throw new Error(`Current workspace is missing ${key}.`);
    (workspace as unknown as Record<string, unknown>)[key] = cloneJson(fallback);
    sources[key] = "migration";
  };

  migrateMissingCategory("floors", canonical?.floors ?? []);
  migrateMissingCategory("furniture", canonical?.furniture ?? []);
  migrateMissingCategory("drawingItems", []);
  migrateMissingCategory("drawingPackage", canonical?.drawingPackage ?? {
    id: "drawing-package-main",
    name: "施工图纸包",
    drawingItemIds: [],
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z"
  });
  migrateMissingCategory("semanticObjects", canonical?.semanticObjects ?? []);
  migrateMissingCategory("cameraViews", canonical?.cameraViews ?? []);
  if (canMigrate && canonical?.cameraViews && hasOwn(original, "cameraViews")) {
    const existingIds = new Set((workspace.cameraViews ?? []).map((view) => view.id));
    const stairInspectionViews = canonical.cameraViews.filter((view) => view.id.startsWith("stair-view-") && !existingIds.has(view.id));
    if (stairInspectionViews.length > 0) {
      workspace.cameraViews = [...(workspace.cameraViews ?? []), ...cloneJson(stairInspectionViews)];
      sources.cameraViews = "migration";
    }
  }
  migrateMissingCategory("roomTourViews", canonical?.roomTourViews ?? []);
  migrateMissingCategory("lightingDesign", canonical?.lightingDesign ?? emptyLightingDesign());
  migrateMissingCategory("visualSettingsByFloor", canonical?.visualSettingsByFloor ?? {} as WorkspaceDocument["visualSettingsByFloor"]);
  migrateMissingCategory("cleanPatchesByFloor", canonical?.cleanPatchesByFloor ?? {} as WorkspaceDocument["cleanPatchesByFloor"]);

  const floors = workspace.floors ?? [];
  const currentStructures = workspace.houseStructuresByFloor ?? {} as WorkspaceDocument["houseStructuresByFloor"];
  const canonicalStructures = canonical?.houseStructuresByFloor;
  let structureMigrated = !hasOwn(original, "houseStructuresByFloor");
  workspace.houseStructuresByFloor = Object.fromEntries(floors.map((floor) => {
    const result = migrateFloorStructure(floor.id, currentStructures[floor.id], canonicalStructures?.[floor.id], canMigrate);
    structureMigrated = structureMigrated || result.migrated;
    return [floor.id, result.structure];
  })) as WorkspaceDocument["houseStructuresByFloor"];
  if (canMigrate && migrateStairLaneConvention(workspace)) structureMigrated = true;
  if (canMigrate) {
    const normalized = normalizeManagedStairFlights(workspace.houseStructuresByFloor);
    workspace.houseStructuresByFloor = normalized.structuresByFloor;
    structureMigrated = true;
    const needsStairAccessMigration = (input.schemaVersion ?? 0) < 17
      || input.dataRevision !== CURRENT_WORKSPACE_DATA_REVISION;
    if (!hasOwn(original, "stairSystems") || needsStairAccessMigration) {
      workspace.stairSystems = mergeManagedItems(workspace.stairSystems, normalized.infrastructure.stairSystems);
      sources.stairSystems = "migration";
    }
    if (!hasOwn(original, "stairLandings") || needsStairAccessMigration) {
      workspace.stairLandings = mergeManagedItems(workspace.stairLandings, normalized.infrastructure.stairLandings);
      sources.stairLandings = "migration";
    }
    if (!hasOwn(original, "stairOpenings") || needsStairAccessMigration) {
      workspace.stairOpenings = mergeManagedItems(workspace.stairOpenings, normalized.infrastructure.stairOpenings);
      sources.stairOpenings = "migration";
    }
  }
  if (!workspace.stairSystems || !workspace.stairLandings || !workspace.stairOpenings) {
    const infrastructure = buildManagedStairInfrastructure(workspace.houseStructuresByFloor);
    workspace.stairSystems ??= cloneJson(canonical?.stairSystems ?? infrastructure.stairSystems);
    workspace.stairLandings ??= cloneJson(canonical?.stairLandings ?? infrastructure.stairLandings);
    workspace.stairOpenings ??= cloneJson(canonical?.stairOpenings ?? infrastructure.stairOpenings);
  }
  if (canMigrate && migrateDimensionVerification(workspace)) structureMigrated = true;
  if (canMigrate && migrateWholeHouseSurfaceFinishes(workspace, canonical)) structureMigrated = true;
  if (canMigrate && migrateLivingWindowAndWaterbar(workspace, canonical)) {
    structureMigrated = true;
    sources.furniture = "migration";
  }
  if (canMigrate && migrateInteriorDoorDesigns(workspace, canonical)) structureMigrated = true;
  if (canMigrate && migrateFurniturePlacement(workspace)) {
    sources.furniture = "migration";
    sources.drawingItems = "migration";
  }
  if (canMigrate && migrateNorthYardW003Alignment(workspace)) {
    sources.houseStructuresByFloor = "migration";
    sources.furniture = "migration";
  }
  if (canMigrate && migrateOutdoorObjectBoundaries(workspace)) sources.furniture = "migration";
  if (canMigrate && migrateOutdoorLandscapeEdgeLayout(workspace)) sources.furniture = "migration";
  if (canMigrate && migrateYardRealismLayout(workspace)) sources.furniture = "migration";
  if (canMigrate && migrateFurnitureVariants(workspace)) sources.furniture = "migration";
  if (canMigrate && migrateLightingDrawingItemsV1(workspace)) sources.drawingItems = "migration";
  if (migrateMepSchemePositioning(workspace)) sources.drawingItems = "migration";
  if (canMigrate && migrateLightingSemanticCorrections(workspace)) {
    sources.drawingItems = "migration";
    sources.lightingDesign = "migration";
  }
  if (canMigrate && needsModernWarmLighting && hasOwn(original, "drawingItems") && workspace.furniture && workspace.drawingItems && workspace.houseStructuresByFloor) {
    workspace.drawingItems.forEach((item) => {
      if (!item.generatedKey?.startsWith("lighting-design-v1:") || item.status === "confirmed" || !item.generatedFingerprint) return;
      if (item.generatedFingerprint === getLegacyDrawingItemGeneratedFingerprintV13(item)) item.generatedFingerprint = getDrawingItemGeneratedFingerprint(item);
    });
    const lighting = generateLightingDesignV1({
      structuresByFloor: workspace.houseStructuresByFloor,
      furniture: workspace.furniture,
      existingItems: workspace.drawingItems,
      floorIds: (workspace.floors ?? []).map((floor) => floor.id),
      now: "2026-07-14T08:00:00.000Z"
    });
    workspace.drawingItems = lighting.items;
    workspace.lightingDesign = lighting.lightingDesign;
    workspace.roomTourViews = [
      ...(workspace.roomTourViews ?? []).filter((view) => !view.id.startsWith("lighting-view-")),
      ...lighting.recommendedViews
    ];
    sources.drawingItems = "migration";
    sources.lightingDesign = "migration";
    sources.roomTourViews = "migration";
  }
  if (structureMigrated) sources.houseStructuresByFloor = "migration";

  workspace.floors = floors.map((floor): Floor => {
    const missingVisualSettings = !hasOwn(floor, "visualSettings");
    const missingCleanPatches = !hasOwn(floor, "cleanPatches");
    if (!canMigrate && missingVisualSettings) throw new Error(`Current workspace is missing floors.${floor.id}.visualSettings.`);
    if (!canMigrate && missingCleanPatches) throw new Error(`Current workspace is missing floors.${floor.id}.cleanPatches.`);
    if (missingVisualSettings || missingCleanPatches) sources.floors = "migration";
    return {
      ...floor,
      visualSettings: floor.visualSettings ?? workspace.visualSettingsByFloor?.[floor.id],
      cleanPatches: floor.cleanPatches ?? workspace.cleanPatchesByFloor?.[floor.id] ?? []
    };
  });
  workspace.selectedFloorId = workspace.selectedFloorId ?? workspace.floors[0]?.id ?? "1F";
  workspace.selectedDrawingSheetType = workspace.selectedDrawingSheetType ?? "sitePlan";
  workspace.wallSyncOverrides = workspace.wallSyncOverrides ?? {};
  workspace.schemaVersion = CURRENT_WORKSPACE_SCHEMA_VERSION;
  workspace.dataRevision = CURRENT_WORKSPACE_DATA_REVISION;

  return { workspace: workspace as WorkspaceDocument, sources };
}

export function reportWorkspaceDataSources(report: WorkspaceDataSourceReport, context: string) {
  if (process.env.NODE_ENV !== "development" || typeof console === "undefined") return;
  console.groupCollapsed(`[workspace source] ${context}`);
  console.table(Object.entries(report).map(([category, source]) => ({ category, source })));
  console.groupEnd();
}
