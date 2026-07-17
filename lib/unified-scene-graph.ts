import { resolveVisibility } from "./object-sync-adapter.ts";
import type {
  DrawingItem,
  DrawingItemCategory,
  DrawingSheetType,
  FloorId,
  Furniture,
  HouseStructure,
  HouseStructureObject,
  Render3DMeta
} from "../types/space";

export type UnifiedSceneMode = "workspace3d" | "overview3d" | "wholeBuilding3d" | "exploration";
export type UnifiedSceneFurnitureMode = "all" | "major" | "relatedOnly" | "dim" | "hidden";
export type UnifiedSceneLod = "source" | "balanced";
export type UnifiedSceneLabelMode = "none" | "selectionOnly" | "professional";

export type UnifiedSceneObject = {
  id: string;
  floorId: FloorId;
  kind: "structure" | "furniture" | "drawingItem";
  source: HouseStructureObject | Furniture | DrawingItem;
};

export type UnifiedSceneGraph = {
  structuresByFloor: Partial<Record<FloorId, HouseStructure>>;
  furniture: Furniture[];
  drawingItems: DrawingItem[];
  objects: UnifiedSceneObject[];
  objectsById: ReadonlyMap<string, UnifiedSceneObject>;
  duplicateObjectIds: string[];
};

export type UnifiedSceneScope = {
  floorIds: FloorId[];
  structuresByFloor: Partial<Record<FloorId, HouseStructure>>;
  furniture: Furniture[];
  drawingItems: DrawingItem[];
};

export type UnifiedSceneVisibilityPolicy = {
  mode: UnifiedSceneMode;
  furnitureMode: UnifiedSceneFurnitureMode;
  specialtyDrawingCategories: DrawingItemCategory[];
  physicalDrawingCategories: DrawingItemCategory[];
  showTechnicalMarkers: boolean;
  showRelationshipLines: boolean;
  showConstructionAnchors: boolean;
  labelMode: UnifiedSceneLabelMode;
  lod: UnifiedSceneLod;
};

const structureCollections = (structure: HouseStructure): HouseStructureObject[][] => [
  structure.walls,
  structure.partitions,
  structure.stairs,
  structure.columns ?? [],
  structure.fences,
  structure.outdoorSurfaces,
  structure.rooms,
  structure.doors,
  structure.windows,
  structure.bayWindows,
  structure.skylights,
  structure.outdoors
];

const overviewSpecialtyCategories: DrawingItemCategory[] = [
  "ceiling",
  "floorFinish",
  "wallFinish",
  "cabinet",
  "light",
  "ventilation"
];

const technicalSheetTypes = new Set<DrawingSheetType>([
  "socketPlan",
  "switchPlan",
  "lightingPlan",
  "waterSupplyPlan",
  "drainagePlan",
  "ceilingPlan"
]);

export function buildUnifiedSceneGraph({
  structuresByFloor,
  furniture,
  drawingItems
}: {
  structuresByFloor: Partial<Record<FloorId, HouseStructure>>;
  furniture: Furniture[];
  drawingItems: DrawingItem[];
}): UnifiedSceneGraph {
  const objects: UnifiedSceneObject[] = [];
  Object.values(structuresByFloor).forEach((structure) => {
    if (!structure) return;
    structureCollections(structure).flat().forEach((source) => objects.push({
      id: source.id,
      floorId: source.floorId,
      kind: "structure",
      source
    }));
  });
  furniture.forEach((source) => objects.push({ id: source.id, floorId: source.floorId, kind: "furniture", source }));
  drawingItems.forEach((source) => objects.push({ id: source.id, floorId: source.floorId, kind: "drawingItem", source }));

  const objectsById = new Map<string, UnifiedSceneObject>();
  const duplicateObjectIds = new Set<string>();
  objects.forEach((object) => {
    if (objectsById.has(object.id)) duplicateObjectIds.add(object.id);
    else objectsById.set(object.id, object);
  });

  return {
    structuresByFloor,
    furniture,
    drawingItems,
    objects,
    objectsById,
    duplicateObjectIds: Array.from(duplicateObjectIds).sort()
  };
}

/**
 * Selects source objects for a view without cloning geometry or model metadata.
 * A view may narrow the floor scope, but every returned entity keeps the exact
 * object identity from UnifiedProjectState.
 */
export function resolveUnifiedSceneScope(graph: UnifiedSceneGraph, floorIds: FloorId[]): UnifiedSceneScope {
  const floorIdSet = new Set(floorIds);
  return {
    floorIds,
    structuresByFloor: Object.fromEntries(floorIds.flatMap((floorId) => {
      const structure = graph.structuresByFloor[floorId];
      return structure ? [[floorId, structure]] : [];
    })) as Partial<Record<FloorId, HouseStructure>>,
    furniture: graph.furniture.filter((item) => floorIdSet.has(item.floorId)),
    drawingItems: graph.drawingItems.filter((item) => floorIdSet.has(item.floorId))
  };
}

export function resolveUnifiedSceneVisibility({
  mode,
  sheetType,
  workspaceFurnitureMode,
  workspaceDrawingCategories = [],
  workspaceShowsRelationshipLines = false
}: {
  mode: UnifiedSceneMode;
  sheetType: DrawingSheetType;
  workspaceFurnitureMode: UnifiedSceneFurnitureMode;
  workspaceDrawingCategories?: DrawingItemCategory[];
  workspaceShowsRelationshipLines?: boolean;
}): UnifiedSceneVisibilityPolicy {
  if (mode === "overview3d") {
    return {
      mode,
      furnitureMode: "all",
      specialtyDrawingCategories: overviewSpecialtyCategories,
      physicalDrawingCategories: ["light", "ventilation"],
      showTechnicalMarkers: false,
      showRelationshipLines: false,
      showConstructionAnchors: false,
      labelMode: "selectionOnly",
      lod: "source"
    };
  }

  if (mode === "wholeBuilding3d") {
    return {
      mode,
      furnitureMode: "all",
      specialtyDrawingCategories: overviewSpecialtyCategories,
      physicalDrawingCategories: ["light", "ventilation"],
      showTechnicalMarkers: false,
      showRelationshipLines: false,
      showConstructionAnchors: false,
      labelMode: "none",
      lod: "balanced"
    };
  }

  if (mode === "exploration") {
    return {
      mode,
      furnitureMode: "all",
      specialtyDrawingCategories: overviewSpecialtyCategories,
      physicalDrawingCategories: ["light", "ventilation"],
      showTechnicalMarkers: false,
      showRelationshipLines: false,
      showConstructionAnchors: false,
      labelMode: "none",
      lod: "source"
    };
  }

  const showTechnicalMarkers = technicalSheetTypes.has(sheetType);
  return {
    mode,
    furnitureMode: workspaceFurnitureMode,
    specialtyDrawingCategories: workspaceDrawingCategories,
    physicalDrawingCategories: showTechnicalMarkers ? workspaceDrawingCategories : ["light"],
    showTechnicalMarkers,
    showRelationshipLines: showTechnicalMarkers && workspaceShowsRelationshipLines,
    showConstructionAnchors: showTechnicalMarkers,
    labelMode: showTechnicalMarkers ? "professional" : "selectionOnly",
    lod: "source"
  };
}

export function filterSceneFurniture({
  furniture,
  policy,
  relatedFurnitureIds = new Set<string>(),
  selectedObjectIds = new Set<string>()
}: {
  furniture: Furniture[];
  policy: UnifiedSceneVisibilityPolicy;
  relatedFurnitureIds?: ReadonlySet<string>;
  selectedObjectIds?: ReadonlySet<string>;
}) {
  const visibleFurniture = furniture.filter((item) => resolveVisibility(item).visible3d);
  if (policy.furnitureMode === "hidden") return [];
  if (policy.furnitureMode === "relatedOnly") {
    return visibleFurniture.filter((item) => relatedFurnitureIds.has(item.id) || selectedObjectIds.has(item.id));
  }
  if (policy.furnitureMode === "major") {
    return visibleFurniture.filter((item) => item.dimensions.width * item.dimensions.depth >= 12_000 || item.floorId === "YARD");
  }
  return visibleFurniture;
}

export function filterSceneDrawingItems(
  drawingItems: DrawingItem[],
  policy: UnifiedSceneVisibilityPolicy,
  purpose: "specialty" | "physical" = "specialty"
) {
  const categories = purpose === "physical" ? policy.physicalDrawingCategories : policy.specialtyDrawingCategories;
  const allowed = new Set(categories);
  return drawingItems.filter((item) => allowed.has(item.category) && item.status !== "deprecated");
}

/** Balanced LOD keeps the same family, variant, dimensions and materials. */
export function resolveUnifiedSceneDetailLevel(
  sourceDetailLevel: NonNullable<Render3DMeta["detailLevel"]>,
  lod: UnifiedSceneLod
): NonNullable<Render3DMeta["detailLevel"]> {
  if (lod === "balanced" && sourceDetailLevel === "presentation") return "standard";
  return sourceDetailLevel;
}

export function getUnifiedSceneConsistencySnapshot(graph: UnifiedSceneGraph) {
  return graph.furniture.map((item) => ({
    id: item.id,
    floorId: item.floorId,
    roomId: item.roomId,
    position: item.position,
    dimensions: item.dimensions,
    material: item.material,
    render3d: item.render3d,
    visible3d: resolveVisibility(item).visible3d
  })).sort((left, right) => left.id.localeCompare(right.id));
}
