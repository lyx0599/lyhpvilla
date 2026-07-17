import { CURRENT_WORKSPACE_DATA_REVISION, CURRENT_WORKSPACE_SCHEMA_VERSION } from "../lib/workspace-migrations.ts";
import { validateWorkspaceReferences } from "../lib/workspace-reference-validator.ts";
import { getVerificationMetaIssues, verificationTargetCollections } from "../lib/dimension-verification.ts";

export const REQUIRED_FLOOR_IDS = ["B2", "B1", "1F", "2F", "YARD"];
const STRUCTURE_COLLECTIONS = [
  "walls", "rooms", "partitions", "stairs", "columns", "fences", "outdoorSurfaces",
  "doors", "windows", "bayWindows", "skylights", "outdoors", "outdoorZones"
];
const DRAWING_ITEM_CATEGORIES = new Set(["socket", "switch", "light", "waterSupply", "drainage", "ceiling", "floorFinish", "wallFinish", "cabinet", "annotation", "network", "ventilation"]);
const DRAWING_ITEM_SOURCES = new Set(["manual", "generated-from-furniture", "generated-from-room"]);
const DRAWING_ITEM_STATUSES = new Set(["draft", "confirmed", "todo", "deprecated"]);
const DRAWING_SHEET_TYPES = new Set(["sitePlan", "structurePlan", "demolitionAndBuildPlan", "furniturePlan", "socketPlan", "switchPlan", "lightingPlan", "waterSupplyPlan", "drainagePlan", "ceilingPlan", "floorFinishPlan", "wallFinishPlan", "materialPlan", "annotationPlan"]);
const TOUR_NODE_TYPES = new Set(["room", "yard", "corridor", "stair", "viewpoint"]);
const TOUR_NODE_STATUSES = new Set(["active", "draft", "disabled"]);
const LIGHTING_LAYERS = new Set(["ambient", "task", "accent", "decorative", "cabinetStrip", "mirrorLight", "outdoor"]);
const LIGHT_COLOR_TEMPERATURES = new Set(["2700K", "3000K", "3500K", "4000K"]);
const LIGHT_MOUNTING_TYPES = new Set(["recessed", "surfaceMounted", "pendant", "wallMounted", "concealed", "cabinetIntegrated", "mirrorIntegrated", "stepMounted", "floorMounted", "bollard", "groundSpike"]);
const OUTDOOR_ZONE_TYPES = new Set(["outdoorKitchen", "relax", "laundry", "drying", "pet", "garden", "storage", "plant"]);
const OUTDOOR_OBJECT_TYPES = new Set(["bbq", "outdoorIsland", "outdoorCabinet", "waterTap", "dryingRack", "dogHouse", "planter", "pathwayLight", "raisedGardenBed", "shadeUmbrella", "petWash", "hoseReel", "toolRack", "outdoorLaundry", "landscapeRock"]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function issue(path, message, objectId = "workspace") {
  return { path, objectId, message };
}

function scanJsonValues(value, path, issues, ownerId = "workspace") {
  if (value === undefined) {
    issues.push(issue(path, "must not be undefined", ownerId));
    return;
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    issues.push(issue(path, "must be a finite number", ownerId));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => scanJsonValues(child, `${path}[${index}]`, issues, ownerId));
    return;
  }
  if (!isRecord(value)) return;
  const nextOwnerId = typeof value.id === "string" && value.id ? value.id : ownerId;
  Object.entries(value).forEach(([key, child]) => scanJsonValues(child, `${path}.${key}`, issues, nextOwnerId));
}

function validateGeometry(value, path, issues, ownerId) {
  if (!isRecord(value)) {
    issues.push(issue(path, "must be a non-empty object", ownerId));
    return;
  }
  if (Object.keys(value).length === 0) issues.push(issue(path, "must not be empty", ownerId));
  Object.entries(value).forEach(([key, child]) => {
    if (key === "rotation" && (typeof child !== "number" || !Number.isFinite(child))) {
      issues.push(issue(`${path}.${key}`, "must be a finite number", ownerId));
      return;
    }
    if (typeof child === "number" && !Number.isFinite(child)) issues.push(issue(`${path}.${key}`, "must be a finite number", ownerId));
  });
}

function collectPersistedObjects(workspace) {
  const collections = [
    [workspace.floors, "floors"],
    [workspace.furniture, "furniture"],
    [workspace.drawingItems, "drawingItems"],
    [workspace.semanticObjects, "semanticObjects"],
    [workspace.cameraViews, "cameraViews"],
    [workspace.roomTourViews, "roomTourViews"],
    [workspace.stairSystems, "stairSystems"],
    [workspace.stairLandings, "stairLandings"],
    [workspace.stairOpenings, "stairOpenings"]
  ];
  const structures = isRecord(workspace.houseStructuresByFloor) ? workspace.houseStructuresByFloor : {};
  for (const floorId of REQUIRED_FLOOR_IDS) {
    const structure = isRecord(structures[floorId]) ? structures[floorId] : {};
    for (const key of STRUCTURE_COLLECTIONS) collections.push([structure[key], `houseStructuresByFloor.${floorId}.${key}`]);
  }
  return collections;
}

export function validateWorkspaceDocument(workspace) {
  const issues = [];
  if (!isRecord(workspace)) return [issue("workspace", "must be a JSON object")];
  if (Object.keys(workspace).length === 0) return [issue("workspace", "must not be empty")];

  if (workspace.schemaVersion !== CURRENT_WORKSPACE_SCHEMA_VERSION) {
    issues.push(issue("workspace.schemaVersion", `must equal ${CURRENT_WORKSPACE_SCHEMA_VERSION}`));
  }
  if (workspace.dataRevision !== CURRENT_WORKSPACE_DATA_REVISION) {
    issues.push(issue("workspace.dataRevision", `must equal ${CURRENT_WORKSPACE_DATA_REVISION}`));
  }

  if (!Array.isArray(workspace.floors)) issues.push(issue("workspace.floors", "must be an array"));
  if (!isRecord(workspace.lightingDesign)) issues.push(issue("workspace.lightingDesign", "must be an object"));
  else {
    if (workspace.lightingDesign.version !== "modern-warm-v1") issues.push(issue("workspace.lightingDesign.version", "must equal modern-warm-v1"));
    if (!Array.isArray(workspace.lightingDesign.fixtureFamilies) || workspace.lightingDesign.fixtureFamilies.length === 0) issues.push(issue("workspace.lightingDesign.fixtureFamilies", "must be a non-empty array"));
    if (!Array.isArray(workspace.lightingDesign.scenes) || workspace.lightingDesign.scenes.length === 0) issues.push(issue("workspace.lightingDesign.scenes", "must be a non-empty array"));
  }
  const floorIds = new Set(Array.isArray(workspace.floors) ? workspace.floors.map((floor) => floor?.id) : []);
  REQUIRED_FLOOR_IDS.forEach((floorId) => {
    if (!floorIds.has(floorId)) issues.push(issue("workspace.floors", `missing floor ${floorId}`, floorId));
  });
  const structures = workspace.houseStructuresByFloor;
  if (!isRecord(structures)) issues.push(issue("workspace.houseStructuresByFloor", "must be an object"));
  REQUIRED_FLOOR_IDS.forEach((floorId) => {
    if (!isRecord(structures?.[floorId]) || Object.keys(structures[floorId]).length === 0) {
      issues.push(issue(`workspace.houseStructuresByFloor.${floorId}`, "must be a non-empty structure", floorId));
    }
  });
  for (const [key, allowEmpty] of [["furniture", false], ["semanticObjects", false], ["cameraViews", true]]) {
    if (!Array.isArray(workspace[key])) issues.push(issue(`workspace.${key}`, "must be an array"));
    else if (!allowEmpty && workspace[key].length === 0) issues.push(issue(`workspace.${key}`, "must not be empty"));
  }
  if (!Array.isArray(workspace.roomTourViews)) issues.push(issue("workspace.roomTourViews", "must be an array"));
  if (!Array.isArray(workspace.stairSystems) || workspace.stairSystems.length !== 3) issues.push(issue("workspace.stairSystems", "must contain the three adjacent-floor stair systems"));
  if (!Array.isArray(workspace.stairLandings) || workspace.stairLandings.length !== 3) issues.push(issue("workspace.stairLandings", "must contain one landing per stair system"));
  if (!Array.isArray(workspace.stairOpenings) || workspace.stairOpenings.length !== 3) issues.push(issue("workspace.stairOpenings", "must contain one opening per stair system"));
  if (workspace.schemaVersion >= 11 && !DRAWING_SHEET_TYPES.has(workspace.selectedDrawingSheetType)) issues.push(issue("workspace.selectedDrawingSheetType", "must be a supported DrawingSheetType"));
  if (!Array.isArray(workspace.drawingItems)) issues.push(issue("workspace.drawingItems", "must be an array"));
  if (!isRecord(workspace.drawingPackage)) issues.push(issue("workspace.drawingPackage", "must be an object"));

  const seenIds = new Map();
  for (const [items, label] of collectPersistedObjects(workspace)) {
    if (!Array.isArray(items)) continue;
    items.forEach((item, index) => {
      const path = `workspace.${label}[${index}]`;
      if (!isRecord(item)) {
        issues.push(issue(path, "must be an object"));
        return;
      }
      const id = typeof item.id === "string" ? item.id.trim() : "";
      if (!id) issues.push(issue(`${path}.id`, "must be a non-empty string"));
      else if (seenIds.has(id)) issues.push(issue(`${path}.id`, `duplicates ${seenIds.get(id)}`, id));
      else seenIds.set(id, `${path}.id`);

      const isCamera = label === "cameraViews";
      const floorField = isCamera ? "floor" : "floorId";
      const floorId = typeof item[floorField] === "string" ? item[floorField] : "";
      if (label !== "floors" && !["stairSystems", "stairLandings", "stairOpenings"].includes(label) && !REQUIRED_FLOOR_IDS.includes(floorId)) {
        issues.push(issue(`${path}.${floorField}`, floorId ? `unknown floor ${floorId}` : "must be a valid floor id", id || path));
      }
      const structureCollection = label.split(".").at(-1);
      if (workspace.schemaVersion >= 10 && verificationTargetCollections.includes(structureCollection)) {
        getVerificationMetaIssues(item.verificationMeta).forEach((message) => {
          issues.push(issue(`${path}.verificationMeta`, message, id || path));
        });
      }
      for (const key of ["position", "dimensions", "size", "geometry"]) {
        if (key in item) validateGeometry(item[key], `${path}.${key}`, issues, id || path);
      }
      if ("rotation" in item && (typeof item.rotation !== "number" || !Number.isFinite(item.rotation))) {
        issues.push(issue(`${path}.rotation`, "must be a finite number", id || path));
      }
      if (isRecord(item.position) && (typeof item.position.x !== "number" || !Number.isFinite(item.position.x) || typeof item.position.y !== "number" || !Number.isFinite(item.position.y))) {
        issues.push(issue(`${path}.position`, "must contain finite x and y", id || path));
      }
      if (label === "drawingItems") {
        if (!DRAWING_ITEM_CATEGORIES.has(item.category)) issues.push(issue(`${path}.category`, "must be a supported drawing item category", id || path));
        if (!DRAWING_ITEM_SOURCES.has(item.source)) issues.push(issue(`${path}.source`, "must be a supported drawing item source", id || path));
        if (!DRAWING_ITEM_STATUSES.has(item.status)) issues.push(issue(`${path}.status`, "must be a supported drawing item status", id || path));
        if (!isRecord(item.positionMm) || !Number.isFinite(item.positionMm.x) || !Number.isFinite(item.positionMm.y)) issues.push(issue(`${path}.positionMm`, "must contain finite millimeter x and y", id || path));
        if (!Number.isInteger(item.quantity) || item.quantity < 1) issues.push(issue(`${path}.quantity`, "must be a positive integer", id || path));
        for (const key of ["type", "label", "notes", "createdAt", "updatedAt"]) if (typeof item[key] !== "string") issues.push(issue(`${path}.${key}`, "must be a string", id || path));
        if (item.polygon !== undefined && (!Array.isArray(item.polygon) || item.polygon.length < 3 || item.polygon.some((point) => !isRecord(point) || !Number.isFinite(point.x) || !Number.isFinite(point.y)))) issues.push(issue(`${path}.polygon`, "must contain at least three finite millimeter points", id || path));
        for (const key of ["controlledLightIds", "relatedLightIds", "switchControl"]) if (item[key] !== undefined && (!Array.isArray(item[key]) || item[key].some((value) => typeof value !== "string"))) issues.push(issue(`${path}.${key}`, "must be a string array", id || path));
        for (const key of ["smartControl", "dimming"]) if (item[key] !== undefined && typeof item[key] !== "boolean") issues.push(issue(`${path}.${key}`, "must be a boolean", id || path));
        for (const key of ["relatedSwitchId", "controlGroupId", "relatedRoomId", "hostCeilingAreaId", "hostWallId", "relatedFurnitureId"]) if (item[key] !== undefined && item[key] !== null && typeof item[key] !== "string") issues.push(issue(`${path}.${key}`, "must be a string or null", id || path));
        if (item.relatedFurniturePositionMm !== undefined && (!isRecord(item.relatedFurniturePositionMm) || !Number.isFinite(item.relatedFurniturePositionMm.x) || !Number.isFinite(item.relatedFurniturePositionMm.y))) issues.push(issue(`${path}.relatedFurniturePositionMm`, "must contain finite millimeter x and y", id || path));
        if (item.category === "light") {
          if (typeof item.lightType !== "string" || !item.lightType) issues.push(issue(`${path}.lightType`, "must be a non-empty string for light items", id || path));
          if (!LIGHTING_LAYERS.has(item.lightingLayer)) issues.push(issue(`${path}.lightingLayer`, "must be a supported lighting layer", id || path));
          if (!LIGHT_COLOR_TEMPERATURES.has(item.colorTemperature)) issues.push(issue(`${path}.colorTemperature`, "must be a supported color temperature", id || path));
          if (item.beamAngle !== null && (!Number.isFinite(item.beamAngle) || item.beamAngle <= 0 || item.beamAngle > 180)) issues.push(issue(`${path}.beamAngle`, "must be null or an angle between 0 and 180", id || path));
          if (!LIGHT_MOUNTING_TYPES.has(item.mountingType)) issues.push(issue(`${path}.mountingType`, "must be a supported mounting type", id || path));
          for (const key of ["smartControl", "dimming"]) if (typeof item[key] !== "boolean") issues.push(issue(`${path}.${key}`, "must be present for light items", id || path));
          if (!isRecord(item.lightSpec)) issues.push(issue(`${path}.lightSpec`, "must be an object for light items", id || path));
          else {
            if (!Number.isFinite(item.lightSpec.cri) || item.lightSpec.cri < 90) issues.push(issue(`${path}.lightSpec.cri`, "must be at least 90", id || path));
            if (typeof item.lightSpec.fixtureFamily !== "string" || !item.lightSpec.fixtureFamily) issues.push(issue(`${path}.lightSpec.fixtureFamily`, "must identify a fixture family", id || path));
          }
        }
        if (item.heightRange !== undefined && item.heightRange !== null && (!isRecord(item.heightRange) || !Number.isFinite(item.heightRange.minMm) || !Number.isFinite(item.heightRange.maxMm))) issues.push(issue(`${path}.heightRange`, "must contain finite minMm and maxMm", id || path));
      }
      if (label === "furniture" && workspace.schemaVersion >= 13) {
        for (const key of ["outdoorId", "hostWallId"]) if (item[key] !== undefined && typeof item[key] !== "string") issues.push(issue(`${path}.${key}`, "must be a string", id || path));
        if (item.roomAssignmentLocked !== undefined && typeof item.roomAssignmentLocked !== "boolean") issues.push(issue(`${path}.roomAssignmentLocked`, "must be a boolean", id || path));
        if (item.wallAnchor !== undefined) {
          if (!isRecord(item.wallAnchor)) issues.push(issue(`${path}.wallAnchor`, "must be an object", id || path));
          else {
            if (!Number.isFinite(item.wallAnchor.positionOnWall) || item.wallAnchor.positionOnWall < 0 || item.wallAnchor.positionOnWall > 1) issues.push(issue(`${path}.wallAnchor.positionOnWall`, "must be between 0 and 1", id || path));
            if (!Number.isFinite(item.wallAnchor.offsetMm) || item.wallAnchor.offsetMm < 0) issues.push(issue(`${path}.wallAnchor.offsetMm`, "must be a non-negative finite number", id || path));
            if (!["left", "right", "center"].includes(item.wallAnchor.side)) issues.push(issue(`${path}.wallAnchor.side`, "must be left, right or center", id || path));
            if (typeof item.wallAnchor.followWall !== "boolean") issues.push(issue(`${path}.wallAnchor.followWall`, "must be a boolean", id || path));
          }
        }
        if (item.clearanceMeta !== undefined) {
          if (!isRecord(item.clearanceMeta)) issues.push(issue(`${path}.clearanceMeta`, "must be an object", id || path));
          else for (const key of ["frontMm", "leftMm", "rightMm", "rearMm", "serviceMm", "doorSwingMm"]) if (item.clearanceMeta[key] !== undefined && (!Number.isFinite(item.clearanceMeta[key]) || item.clearanceMeta[key] < 0)) issues.push(issue(`${path}.clearanceMeta.${key}`, "must be a non-negative finite number", id || path));
        }
        if (workspace.schemaVersion >= 15) {
          if (!isRecord(item.render3d)) issues.push(issue(`${path}.render3d`, "must be an object", id || path));
          else {
            if (typeof item.render3d.variantId !== "string" || !item.render3d.variantId) issues.push(issue(`${path}.render3d.variantId`, "must be a non-empty string", id || path));
            if (!Number.isInteger(item.render3d.variationSeed) || item.render3d.variationSeed < 0) issues.push(issue(`${path}.render3d.variationSeed`, "must be a non-negative integer", id || path));
            if (item.render3d.styleSource !== undefined && !["generated", "manual"].includes(item.render3d.styleSource)) issues.push(issue(`${path}.render3d.styleSource`, "must be generated or manual", id || path));
            if (item.render3d.styleLocked !== undefined && typeof item.render3d.styleLocked !== "boolean") issues.push(issue(`${path}.render3d.styleLocked`, "must be a boolean", id || path));
            if (item.render3d.detailLevel !== undefined && !["draft", "standard", "presentation"].includes(item.render3d.detailLevel)) issues.push(issue(`${path}.render3d.detailLevel`, "must be draft, standard or presentation", id || path));
            for (const key of ["modelAssetId", "assetUrl"]) if (item.render3d[key] !== undefined && typeof item.render3d[key] !== "string") issues.push(issue(`${path}.render3d.${key}`, "must be a string", id || path));
          }
        }
        if (workspace.schemaVersion >= 18 && item.outdoorObjectType !== undefined) {
          if (!OUTDOOR_OBJECT_TYPES.has(item.outdoorObjectType)) issues.push(issue(`${path}.outdoorObjectType`, "must be a supported OutdoorObjectType", id || path));
          if (typeof item.outdoorId !== "string" || typeof item.outdoorZoneId !== "string") issues.push(issue(`${path}.outdoorZoneId`, "outdoor objects must identify outdoorId and outdoorZoneId", id || path));
        }
      }
      if (label === "roomTourViews") {
        if (!TOUR_NODE_TYPES.has(item.type)) issues.push(issue(`${path}.type`, "must be a supported tour node type", id || path));
        if (!TOUR_NODE_STATUSES.has(item.status)) issues.push(issue(`${path}.status`, "must be a supported tour node status", id || path));
        for (const key of ["cameraPosition", "target"]) {
          const point = item[key];
          if (!isRecord(point) || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) issues.push(issue(`${path}.${key}`, "must contain finite x, y and z", id || path));
        }
        for (const key of ["yaw", "pitch"]) if (!Number.isFinite(item[key])) issues.push(issue(`${path}.${key}`, "must be a finite number", id || path));
        if (!Array.isArray(item.linkedNodeIds) || item.linkedNodeIds.some((value) => typeof value !== "string")) issues.push(issue(`${path}.linkedNodeIds`, "must be a string array", id || path));
        for (const key of ["name", "description"]) if (typeof item[key] !== "string") issues.push(issue(`${path}.${key}`, "must be a string", id || path));
      }
    });
  }

  const yardStructure = structures?.YARD;
  if (workspace.schemaVersion >= 18) {
    if (!Array.isArray(yardStructure?.outdoorZones) || yardStructure.outdoorZones.length === 0) issues.push(issue("workspace.houseStructuresByFloor.YARD.outdoorZones", "must contain outdoor functional zones", "YARD"));
    else yardStructure.outdoorZones.forEach((zone, index) => {
      const path = `workspace.houseStructuresByFloor.YARD.outdoorZones[${index}]`;
      if (!OUTDOOR_ZONE_TYPES.has(zone.zoneType)) issues.push(issue(`${path}.zoneType`, "must be a supported OutdoorZoneType", zone.id || path));
      if (!Array.isArray(zone.polygon) || zone.polygon.length < 3) issues.push(issue(`${path}.polygon`, "must contain at least three points", zone.id || path));
      if (typeof zone.outdoorId !== "string" || !yardStructure.outdoors?.some((yard) => yard.id === zone.outdoorId)) issues.push(issue(`${path}.outdoorId`, "must reference a YARD outdoor boundary", zone.id || path));
    });
  }

  scanJsonValues(workspace, "workspace", issues);
  const references = validateWorkspaceReferences(workspace);
  references.errors.forEach((reference) => issues.push(issue(reference.path, reference.message, reference.objectId)));
  return issues;
}

export function formatWorkspaceIssues(issues) {
  return issues.map((item) => `${item.path} [${item.objectId}]: ${item.message}`).join("\n");
}
