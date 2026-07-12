import { CURRENT_WORKSPACE_DATA_REVISION, CURRENT_WORKSPACE_SCHEMA_VERSION } from "../lib/workspace-migrations.ts";
import { validateWorkspaceReferences } from "../lib/workspace-reference-validator.ts";

export const REQUIRED_FLOOR_IDS = ["B2", "B1", "1F", "2F", "YARD"];
const STRUCTURE_COLLECTIONS = [
  "walls", "rooms", "partitions", "stairs", "columns", "fences", "outdoorSurfaces",
  "doors", "windows", "bayWindows", "skylights", "outdoors"
];

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
    [workspace.semanticObjects, "semanticObjects"],
    [workspace.cameraViews, "cameraViews"]
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
      if (label !== "floors" && !REQUIRED_FLOOR_IDS.includes(floorId)) {
        issues.push(issue(`${path}.${floorField}`, floorId ? `unknown floor ${floorId}` : "must be a valid floor id", id || path));
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
