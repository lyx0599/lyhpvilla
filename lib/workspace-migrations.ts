import type { Floor, FloorId, HouseStructure } from "@/types/space";
import type { WorkspaceDataCategory, WorkspaceDataSourceReport, WorkspaceDocument } from "@/types/workspace";

export const CURRENT_WORKSPACE_SCHEMA_VERSION = 5;
export const CURRENT_WORKSPACE_DATA_REVISION = "2026-07-11-data-source-convergence-v1";

const trackedCategories: WorkspaceDataCategory[] = [
  "floors",
  "houseStructuresByFloor",
  "furniture",
  "semanticObjects",
  "cameraViews",
  "visualSettingsByFloor",
  "cleanPatchesByFloor"
];

type WorkspaceMigrationOptions = {
  canonicalWorkspace?: WorkspaceDocument;
};

function hasOwn(value: object, key: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

  const migrateMissingCategory = <K extends WorkspaceDataCategory>(key: K, fallback: WorkspaceDocument[K]) => {
    if (hasOwn(original, key)) return;
    if (!canMigrate) throw new Error(`Current workspace is missing ${key}.`);
    (workspace as unknown as Record<string, unknown>)[key] = cloneJson(fallback);
    sources[key] = "migration";
  };

  migrateMissingCategory("floors", canonical?.floors ?? []);
  migrateMissingCategory("furniture", canonical?.furniture ?? []);
  migrateMissingCategory("semanticObjects", canonical?.semanticObjects ?? []);
  migrateMissingCategory("cameraViews", canonical?.cameraViews ?? []);
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
