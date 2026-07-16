import type { DrawingItem, Floor, FloorId, HouseStructure, LightingLayer } from "@/types/space";
import type { LightingDesign, WorkspaceDataCategory, WorkspaceDataSourceReport, WorkspaceDocument } from "@/types/workspace";
import { normalizeVerificationMeta, verificationTargetCollections } from "./dimension-verification.ts";
import { getDrawingItemGeneratedFingerprint, getLegacyDrawingItemGeneratedFingerprintV13 } from "./drawing-items.ts";
import { generateLightingDesignV1 } from "./lighting-design.ts";
import { withFurnitureVariantDefaults } from "./furniture-variants.ts";
import { buildManagedStairInfrastructure, normalizeManagedStairFlights } from "./stair-systems.ts";

export const CURRENT_WORKSPACE_SCHEMA_VERSION = 17;
export const CURRENT_WORKSPACE_DATA_REVISION = "2026-07-15-stair-access-platform-v2";

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
    outdoors: []
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
    "outdoors"
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
  if (canMigrate && migrateFurniturePlacement(workspace)) {
    sources.furniture = "migration";
    sources.drawingItems = "migration";
  }
  if (canMigrate && migrateFurnitureVariants(workspace)) sources.furniture = "migration";
  if (canMigrate && migrateLightingDrawingItemsV1(workspace)) sources.drawingItems = "migration";
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
