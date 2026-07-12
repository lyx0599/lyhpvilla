import type {
  FloorCoordinateSystem,
  Furniture,
  HouseBayWindow,
  HouseDoor,
  HouseStructure,
  HouseStructureObject,
  HouseSkylight,
  HouseWall,
  HouseWindow,
  MmPoint,
  ObjectInteractionState,
  StraightHouseWall
} from "@/types/space";

export type SyncObjectKind =
  | "furniture" | "cabinet" | "wall" | "partition" | "door" | "window" | "bayWindow"
  | "skylight" | "stair" | "column" | "fence" | "outdoorSurface" | "outdoor" | "room";

export type SyncDimensionsMm = { width: number; depth: number; height: number };

export type NormalizedSyncObject<T = Furniture | HouseStructureObject> = {
  id: string;
  floorId: string;
  kind: SyncObjectKind;
  positionMm: MmPoint;
  dimensionsMm: SyncDimensionsMm;
  rotationDeg: number;
  material: string;
  locked: boolean;
  visible: boolean;
  selectable: boolean;
  sourceRef: T;
};

export type SyncVisibility = { visible2d: boolean; visible3d: boolean };
export type SyncLock = { locked2d: boolean; locked3d: boolean; selectable: boolean };
export type SceneSyncObject<T = Furniture | HouseStructureObject> = NormalizedSyncObject<T> & {
  scenePosition: { x: number; y: number; z: number };
  sceneDimensions: { width: number; depth: number; height: number };
  rotationY: number;
};

type StatefulObject = {
  visible?: boolean;
  hidden?: boolean;
  locked?: boolean;
  interaction?: { locked?: boolean };
  render3d?: { visibleIn3d?: boolean; selectableIn3d?: boolean };
};

const DEFAULT_WIDTH_MM = 12_000;
const DEFAULT_HEIGHT_MM = 9_000;

export function getSyncCoordinateSystem(coordinateSystem?: FloorCoordinateSystem | null): FloorCoordinateSystem {
  return coordinateSystem ?? {
    floorId: "1F",
    origin: { x: 0, y: 0 },
    unit: "mm",
    width: DEFAULT_WIDTH_MM,
    height: DEFAULT_HEIGHT_MM,
    scale: 1,
    note: "2D/3D sync fallback coordinate system"
  };
}

export function resolveVisibility(object: StatefulObject): SyncVisibility {
  const visible2d = object.visible !== false && object.hidden !== true;
  return {
    visible2d,
    visible3d: visible2d && object.render3d?.visibleIn3d !== false
  };
}

export function resolveLock(object: StatefulObject, interactionState?: ObjectInteractionState): SyncLock {
  const locked = object.locked === true || object.interaction?.locked === true;
  const stateLocked = interactionState?.lockedObjectIds.includes((object as StatefulObject & { id?: string }).id ?? "") ?? false;
  const resolved = locked || stateLocked;
  return {
    locked2d: resolved,
    locked3d: resolved,
    selectable: object.render3d?.selectableIn3d !== false
  };
}

function midpoint(start: MmPoint, end: MmPoint): MmPoint {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

function polygonCenter(points: MmPoint[]): MmPoint {
  if (!points.length) return { x: 0, y: 0 };
  return points.reduce((sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }), { x: 0, y: 0 });
}

function polygonDimensions(points: MmPoint[]): SyncDimensionsMm {
  if (!points.length) return { width: 0, depth: 0, height: 0 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return { width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...ys) - Math.min(...ys), height: 0 };
}

function structureKind(object: HouseStructureObject): SyncObjectKind {
  if ("kind" in object) return "wall";
  if ("spaceType" in object && object.spaceType === "Partition") return "partition";
  if ("openDirection" in object) return "door";
  if ("hostType" in object) return "window";
  if ("wallId" in object) return "bayWindow";
  if ("stepCount" in object) return "stair";
  if ("columnType" in object) return "column";
  if ("surfaceType" in object) return "outdoorSurface";
  if ("outdoorType" in object) return "outdoor";
  if ("material" in object && "start" in object && "end" in object) return "fence";
  if ("center" in object && "rotation" in object) return "skylight";
  return "room";
}

function hostPosition(object: HouseDoor | HouseWindow | HouseBayWindow, structure?: HouseStructure): MmPoint {
  const hostId = "wallId" in object ? object.wallId : object.hostId;
  const host = structure?.walls.find((wall): wall is StraightHouseWall => wall.id === hostId && wall.kind === "straight")
    ?? structure?.partitions.find((partition) => partition.id === hostId);
  if (!host) return { x: 0, y: 0 };
  return {
    x: host.start.x + (host.end.x - host.start.x) * object.positionOnWall,
    y: host.start.y + (host.end.y - host.start.y) * object.positionOnWall
  };
}

export function normalizeObjectForSync<T extends Furniture | HouseStructureObject>(
  object: T,
  coordinateSystem?: FloorCoordinateSystem | null,
  structure?: HouseStructure,
  interactionState?: ObjectInteractionState
): NormalizedSyncObject<T> {
  const system = getSyncCoordinateSystem(coordinateSystem);
  const visibility = resolveVisibility(object as StatefulObject);
  const lock = resolveLock(object as StatefulObject, interactionState);

  if ("dimensions" in object && "position" in object) {
    const furniture = object as Furniture;
    const kind: SyncObjectKind = furniture.cabinetDesign || furniture.wardrobeDesign || furniture.moduleType?.toLowerCase().includes("cabinet") ? "cabinet" : "furniture";
    return {
      id: furniture.id,
      floorId: furniture.floorId,
      kind,
      positionMm: {
        x: system.origin.x + furniture.position.x / 100 * system.width,
        y: system.origin.y + furniture.position.y / 100 * system.height
      },
      dimensionsMm: {
        width: furniture.dimensions.width * 10,
        depth: furniture.dimensions.depth * 10,
        height: furniture.dimensions.height * 10
      },
      rotationDeg: furniture.position.rotation ?? 0,
      material: furniture.material,
      locked: lock.locked2d,
      visible: visibility.visible2d,
      selectable: lock.selectable,
      sourceRef: object
    };
  }

  const item = object as HouseStructureObject;
  const kind = structureKind(item);
  let positionMm: MmPoint = { x: 0, y: 0 };
  let dimensionsMm: SyncDimensionsMm = { width: 0, depth: 0, height: 0 };
  let rotationDeg = 0;

  if ("start" in item && "end" in item) {
    positionMm = midpoint(item.start, item.end);
    const length = Math.hypot(item.end.x - item.start.x, item.end.y - item.start.y);
    dimensionsMm = { width: length, depth: "thickness" in item ? item.thickness : "width" in item ? item.width : 0, height: item.height };
    rotationDeg = Math.atan2(item.end.y - item.start.y, item.end.x - item.start.x) * 180 / Math.PI;
  } else if ("polygon" in item) {
    positionMm = polygonCenter(item.polygon);
    dimensionsMm = polygonDimensions(item.polygon);
  } else if ("boundary" in item) {
    positionMm = polygonCenter(item.boundary);
    dimensionsMm = polygonDimensions(item.boundary);
  } else if ("center" in item) {
    positionMm = item.center;
    dimensionsMm = "radius" in item
      ? { width: item.radius * 2, depth: item.radius * 2, height: item.height }
      : { width: item.width, depth: item.depth, height: item.height };
    rotationDeg = "rotation" in item ? item.rotation : 0;
  } else if (kind === "door" || kind === "window" || kind === "bayWindow") {
    const opening = item as HouseDoor | HouseWindow | HouseBayWindow;
    positionMm = hostPosition(opening, structure);
    dimensionsMm = { width: opening.width, depth: "depth" in opening ? opening.depth : 0, height: opening.height };
  }

  return {
    id: item.id,
    floorId: item.floorId,
    kind,
    positionMm,
    dimensionsMm,
    rotationDeg,
    material: "material" in item ? String(item.material ?? "") : "",
    locked: lock.locked2d,
    visible: visibility.visible2d,
    selectable: lock.selectable,
    sourceRef: object
  };
}

export function toPlanObject<T>(object: NormalizedSyncObject<T>, coordinateSystem?: FloorCoordinateSystem | null) {
  const system = getSyncCoordinateSystem(coordinateSystem);
  return {
    ...object,
    positionPercent: {
      x: (object.positionMm.x - system.origin.x) / system.width * 100,
      y: (object.positionMm.y - system.origin.y) / system.height * 100
    },
    dimensionsPercent: {
      width: object.dimensionsMm.width / system.width * 100,
      depth: object.dimensionsMm.depth / system.height * 100
    }
  };
}

export function toSceneObject<T>(object: NormalizedSyncObject<T>, coordinateSystem?: FloorCoordinateSystem | null): SceneSyncObject<T> {
  const system = getSyncCoordinateSystem(coordinateSystem);
  return {
    ...object,
    scenePosition: {
      x: (object.positionMm.x - system.origin.x - system.width / 2) / 1000,
      y: object.dimensionsMm.height / 2000,
      z: (object.positionMm.y - system.origin.y - system.height / 2) / 1000
    },
    sceneDimensions: {
      width: object.dimensionsMm.width / 1000,
      depth: object.dimensionsMm.depth / 1000,
      height: object.dimensionsMm.height / 1000
    },
    rotationY: -object.rotationDeg * Math.PI / 180
  };
}

export function applyPlanDelta(
  item: Furniture,
  deltaMm: MmPoint,
  coordinateSystem?: FloorCoordinateSystem | null,
  bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 }
): Furniture {
  const system = getSyncCoordinateSystem(coordinateSystem);
  return {
    ...item,
    position: {
      ...item.position,
      x: Math.max(bounds.minX, Math.min(bounds.maxX, item.position.x + deltaMm.x / system.width * 100)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, item.position.y + deltaMm.y / system.height * 100))
    }
  };
}

export function applySceneDelta(item: Furniture, deltaScene: { x: number; z: number }, coordinateSystem?: FloorCoordinateSystem | null): Furniture {
  return applyPlanDelta(item, { x: deltaScene.x * 1000, y: deltaScene.z * 1000 }, coordinateSystem);
}

export type ResolvedSelection = { id: string; floorId: string; kind: SyncObjectKind; sourceRef: Furniture | HouseStructureObject };

export function resolveSelection(id: string, furniture: Furniture[], structures: HouseStructure | HouseStructure[]): ResolvedSelection | null {
  const furnitureObject = furniture.find((item) => item.id === id);
  if (furnitureObject) {
    const normalized = normalizeObjectForSync(furnitureObject, Array.isArray(structures) ? structures.find((item) => item.floorId === furnitureObject.floorId)?.coordinateSystem : structures.coordinateSystem);
    return { id, floorId: normalized.floorId, kind: normalized.kind, sourceRef: furnitureObject };
  }
  for (const structure of Array.isArray(structures) ? structures : [structures]) {
    for (const collection of getStructureCollections(structure)) {
      const sourceRef = collection.find((item) => item.id === id);
      if (sourceRef) return { id, floorId: sourceRef.floorId, kind: structureKind(sourceRef), sourceRef };
    }
  }
  return null;
}

export function getStructureCollections(structure: HouseStructure): HouseStructureObject[][] {
  return [structure.walls, structure.partitions, structure.stairs, structure.columns ?? [], structure.fences, structure.outdoorSurfaces,
    structure.rooms, structure.doors, structure.windows, structure.bayWindows, structure.skylights, structure.outdoors];
}

type HostedSkylight = HouseSkylight & ({ wallId: string; positionOnWall: number } | { hostId: string; positionOnWall: number });
type HostedOpening = HouseDoor | HouseWindow | HouseBayWindow | HostedSkylight;
export type HostedOpeningWarning = { openingId: string; message: string };

function openingHostId(opening: HostedOpening): string {
  if ("wallId" in opening && opening.wallId) return opening.wallId;
  if ("hostId" in opening && opening.hostId) return "hostType" in opening && opening.hostType !== "wall" ? "" : opening.hostId;
  return "";
}

function updateOpeningHost<T extends HostedOpening>(opening: T, wallId: string, positionOnWall: number): T {
  return ({ ...opening, ...( "wallId" in opening ? { wallId } : "hostType" in opening ? { hostId: wallId, hostType: "wall" } : { hostId: wallId }), positionOnWall } as T);
}

function wallPoint(wall: StraightHouseWall, t: number): MmPoint {
  return { x: wall.start.x + (wall.end.x - wall.start.x) * t, y: wall.start.y + (wall.end.y - wall.start.y) * t };
}

function projectToWall(point: MmPoint, wall: StraightHouseWall) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const lengthSquared = dx * dx + dy * dy;
  const rawT = lengthSquared ? ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / lengthSquared : 0;
  const t = Math.max(0, Math.min(1, rawT));
  const projected = wallPoint(wall, t);
  return { t, distance: Math.hypot(point.x - projected.x, point.y - projected.y) };
}

export function syncHostedOpeningsOnWallIdChange(
  structure: HouseStructure,
  replacements: Array<{ oldWalls: StraightHouseWall[]; newWalls: StraightHouseWall[] }>,
  onWarning?: (warning: HostedOpeningWarning) => void
): HouseStructure {
  const migrate = <T extends HostedOpening>(opening: T): T => {
    const hostId = openingHostId(opening);
    const replacement = replacements.find((item) => item.oldWalls.some((wall) => wall.id === hostId));
    if (!replacement || !hostId) return opening;
    const oldWall = replacement.oldWalls.find((wall) => wall.id === hostId)!;
    const point = wallPoint(oldWall, Math.max(0, Math.min(1, opening.positionOnWall)));
    const candidates = replacement.newWalls.map((wall) => ({ wall, ...projectToWall(point, wall) })).sort((a, b) => a.distance - b.distance);
    const best = candidates[0];
    if (!best) {
      onWarning?.({ openingId: opening.id, message: `No replacement wall found for ${hostId}` });
      return opening;
    }
    if (best.distance > 2) onWarning?.({ openingId: opening.id, message: `Opening was attached to nearest replacement wall ${best.wall.id} (${best.distance.toFixed(1)}mm)` });
    return updateOpeningHost(opening, best.wall.id, Number(best.t.toFixed(6)));
  };
  return {
    ...structure,
    doors: structure.doors.map(migrate),
    windows: structure.windows.map(migrate),
    bayWindows: structure.bayWindows.map(migrate),
    skylights: structure.skylights.map((skylight) => {
      if ((!skylight.wallId && !skylight.hostId) || skylight.positionOnWall === undefined) return skylight;
      return migrate(skylight as HostedSkylight);
    })
  };
}

export function validateHostedOpenings(structure: HouseStructure): HostedOpeningWarning[] {
  const warnings: HostedOpeningWarning[] = [];
  const wallIds = new Set(structure.walls.map((wall) => wall.id));
  const partitionIds = new Set(structure.partitions.map((partition) => partition.id));
  const validate = (opening: HostedOpening) => {
    const hostId = openingHostId(opening) || ("hostId" in opening ? opening.hostId ?? "" : "");
    const validHost = "hostType" in opening && opening.hostType === "partition" ? partitionIds.has(hostId) : wallIds.has(hostId);
    if (!validHost) warnings.push({ openingId: opening.id, message: `Orphan host reference: ${hostId}` });
    if (!Number.isFinite(opening.positionOnWall) || opening.positionOnWall < 0 || opening.positionOnWall > 1) {
      warnings.push({ openingId: opening.id, message: `positionOnWall out of range: ${opening.positionOnWall}` });
    }
  };
  [...structure.doors, ...structure.windows, ...structure.bayWindows].forEach(validate);
  structure.skylights.forEach((skylight) => {
    if ((!skylight.wallId && !skylight.hostId) || skylight.positionOnWall === undefined) return;
    validate(skylight as HostedSkylight);
  });
  return warnings;
}

export type SyncSelfCheckReport = {
  floorId: string;
  objectCount: number;
  visible2dCount: number;
  visible3dCount: number;
  visible2dIds: string[];
  visible3dIds: string[];
  duplicateIds: string[];
  orphanHosts: HostedOpeningWarning[];
  furnitureCoordinateDifferences: Array<{ id: string; deltaMm: number }>;
  selectionConflicts: string[];
  yardObjectsWithoutBacklink: string[];
};

export function createSyncSelfCheckReport({
  structure,
  furniture,
  selectedFurnitureId = "",
  selectedStructureId = "",
  selectedSemanticObjectId = "",
  yardObjectIds = []
}: {
  structure: HouseStructure;
  furniture: Furniture[];
  selectedFurnitureId?: string;
  selectedStructureId?: string;
  selectedSemanticObjectId?: string;
  yardObjectIds?: string[];
}): SyncSelfCheckReport {
  const structureObjects = getStructureCollections(structure).flat();
  const sourceObjects: Array<Furniture | HouseStructureObject> = [...structureObjects, ...furniture];
  const normalized = sourceObjects.map((item) => normalizeObjectForSync(item, structure.coordinateSystem, structure));
  const seen = new Set<string>();
  const duplicateIds = Array.from(new Set(normalized.flatMap((item) => {
    if (seen.has(item.id)) return [item.id];
    seen.add(item.id);
    return [];
  })));
  const furnitureCoordinateDifferences = furniture.flatMap((item) => {
    const normalizedItem = normalizeObjectForSync(item, structure.coordinateSystem, structure);
    const scene = toSceneObject(normalizedItem, structure.coordinateSystem);
    const system = getSyncCoordinateSystem(structure.coordinateSystem);
    const roundTrip = {
      x: scene.scenePosition.x * 1000 + system.origin.x + system.width / 2,
      y: scene.scenePosition.z * 1000 + system.origin.y + system.height / 2
    };
    const deltaMm = Math.hypot(roundTrip.x - normalizedItem.positionMm.x, roundTrip.y - normalizedItem.positionMm.y);
    return deltaMm > 0.01 ? [{ id: item.id, deltaMm }] : [];
  });
  const activeSelections = [selectedFurnitureId, selectedStructureId, selectedSemanticObjectId].filter(Boolean);
  const selectionConflicts = activeSelections.length > 1 ? [`Mutually exclusive selections are active: ${activeSelections.join(", ")}`] : [];
  const sourceIds = new Set(sourceObjects.map((item) => item.id));
  const visible2dIds = sourceObjects.filter((item) => resolveVisibility(item).visible2d).map((item) => item.id).sort();
  const visible3dIds = sourceObjects.filter((item) => resolveVisibility(item).visible3d).map((item) => item.id).sort();
  return {
    floorId: structure.floorId,
    objectCount: normalized.length,
    visible2dCount: visible2dIds.length,
    visible3dCount: visible3dIds.length,
    visible2dIds,
    visible3dIds,
    duplicateIds,
    orphanHosts: validateHostedOpenings(structure),
    furnitureCoordinateDifferences,
    selectionConflicts,
    yardObjectsWithoutBacklink: yardObjectIds.filter((id) => !sourceIds.has(id))
  };
}
