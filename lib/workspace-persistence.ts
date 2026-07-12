import { validateWorkspaceReferences } from "@/lib/workspace-reference-validator";

const UI_TEMPORARY_WORKSPACE_KEYS = new Set([
  "savedAt",
  "updatedAt",
  "saveMode",
  "uiState",
  "viewMode",
  "plannerMode",
  "drawTool",
  "selectedFurnitureId",
  "selectedSemanticObjectId",
  "activeObjectId",
  "draftSaveState",
  "codeSaveState",
  "publishState"
]);

const OMIT_VALUE = Symbol("omit-workspace-value");

function normalizeJsonValue(value: unknown, path: string): unknown | typeof OMIT_VALUE {
  if (value === undefined) return OMIT_VALUE;
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${path} contains NaN or Infinity.`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.reduce<unknown[]>((items, item, index) => {
      const normalized = normalizeJsonValue(item, `${path}[${index}]`);
      if (normalized !== OMIT_VALUE) items.push(normalized);
      return items;
    }, []);
  }
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const normalized = normalizeJsonValue((value as Record<string, unknown>)[key], `${path}.${key}`);
        if (normalized !== OMIT_VALUE) result[key] = normalized;
        return result;
      }, {});
  }
  throw new Error(`${path} contains unsupported ${typeof value} data.`);
}

export function normalizeWorkspace(workspace: unknown) {
  if (!workspace || typeof workspace !== "object" || Array.isArray(workspace)) {
    throw new Error("Workspace must be an object.");
  }
  const persistedWorkspace = Object.keys(workspace as Record<string, unknown>).reduce<Record<string, unknown>>((result, key) => {
    if (!UI_TEMPORARY_WORKSPACE_KEYS.has(key)) result[key] = (workspace as Record<string, unknown>)[key];
    return result;
  }, {});
  const normalized = normalizeJsonValue(persistedWorkspace, "workspace");
  if (normalized === OMIT_VALUE || !normalized || typeof normalized !== "object" || Array.isArray(normalized)) {
    throw new Error("Workspace normalization produced an invalid value.");
  }
  return normalized as Record<string, unknown>;
}

export function stableStringify(value: unknown) {
  const normalized = normalizeJsonValue(value, "value");
  if (normalized === OMIT_VALUE) throw new Error("Cannot stringify an undefined root value.");
  return JSON.stringify(normalized);
}

export async function getWorkspaceHash(workspace: unknown) {
  const bytes = new TextEncoder().encode(stableStringify(normalizeWorkspace(workspace)));
  if (!globalThis.crypto?.subtle) throw new Error("当前环境不支持保存校验所需的 SHA-256。");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function compareWorkspace(left: unknown, right: unknown) {
  return stableStringify(normalizeWorkspace(left)) === stableStringify(normalizeWorkspace(right));
}

const REQUIRED_FLOOR_IDS = ["B2", "B1", "1F", "2F", "YARD"];

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function getArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function collectWorkspaceObjects(workspace: Record<string, unknown>) {
  const objects = new Map<string, Record<string, unknown>>();
  const addItems = (items: unknown[]) => {
    items.forEach((item) => {
      const record = asRecord(item);
      if (record && typeof record.id === "string") objects.set(record.id, record);
    });
  };
  addItems(getArray(workspace.furniture));
  addItems(getArray(workspace.drawingItems));
  addItems(getArray(workspace.semanticObjects));
  addItems(getArray(workspace.cameraViews));
  const structures = asRecord(workspace.houseStructuresByFloor) ?? {};
  Object.values(structures).forEach((structureValue) => {
    const structure = asRecord(structureValue);
    if (!structure) return;
    Object.values(structure).forEach((collection) => {
      if (Array.isArray(collection)) addItems(collection);
    });
  });
  return objects;
}

function valuesDiffer(left: unknown, right: unknown) {
  if (left === undefined && right === undefined) return false;
  if (left === undefined || right === undefined) return true;
  return stableStringify(left) !== stableStringify(right);
}

function collectFieldPaths(value: unknown, path = "", fields = new Set<string>()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectFieldPaths(item, `${path}[]`, fields));
    return fields;
  }
  const record = asRecord(value);
  if (!record) return fields;
  Object.entries(record).forEach(([key, child]) => {
    const childPath = path ? `${path}.${key}` : key;
    fields.add(childPath);
    collectFieldPaths(child, childPath, fields);
  });
  return fields;
}

export function getWorkspaceValidationErrors(value: unknown) {
  const errors: string[] = [];
  const workspace = asRecord(value);
  if (!workspace) return ["Workspace 必须是 JSON 对象。"];
  try {
    normalizeWorkspace(workspace);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Workspace 包含无法标准化的数据。");
  }
  const structures = asRecord(workspace.houseStructuresByFloor);
  if (!structures) errors.push("缺少 houseStructuresByFloor。");
  REQUIRED_FLOOR_IDS.forEach((floorId) => {
    if (!asRecord(structures?.[floorId])) errors.push(`缺少楼层 ${floorId}。`);
  });
  if (!Array.isArray(workspace.furniture)) errors.push("缺少 furniture 数组。");
  if (!Array.isArray(workspace.semanticObjects)) errors.push("缺少 semanticObjects 数组。");
  const schemaVersion = typeof workspace.schemaVersion === "number" ? workspace.schemaVersion : 0;
  if (schemaVersion >= 5) {
    if (!Array.isArray(workspace.floors)) errors.push("schemaVersion 5+ 缺少 floors 数组。");
    if (typeof workspace.dataRevision !== "string" || !workspace.dataRevision) errors.push("schemaVersion 5+ 缺少 dataRevision。");
    const floorIds = new Set(getArray(workspace.floors).map((floor) => asRecord(floor)?.id).filter((id): id is string => typeof id === "string"));
    REQUIRED_FLOOR_IDS.forEach((floorId) => {
      if (!floorIds.has(floorId)) errors.push(`floors 缺少楼层 ${floorId}。`);
    });
    if (!Array.isArray(workspace.cameraViews)) errors.push("schemaVersion 5+ 缺少 cameraViews 数组。");
    if (!asRecord(workspace.visualSettingsByFloor)) errors.push("schemaVersion 5+ 缺少 visualSettingsByFloor。");
    if (!asRecord(workspace.cleanPatchesByFloor)) errors.push("schemaVersion 5+ 缺少 cleanPatchesByFloor。");
    getArray(workspace.floors).forEach((floor, index) => {
      const floorRecord = asRecord(floor);
      if (!floorRecord) return;
      if (!asRecord(floorRecord.visualSettings)) errors.push(`floors[${index}] 缺少 visualSettings。`);
      if (!Array.isArray(floorRecord.cleanPatches)) errors.push(`floors[${index}] 缺少 cleanPatches 数组。`);
    });
  }
  if (schemaVersion >= 6) {
    if (!Array.isArray(workspace.drawingItems)) errors.push("schemaVersion 6+ 缺少 drawingItems 数组。");
    if (!asRecord(workspace.drawingPackage)) errors.push("schemaVersion 6+ 缺少 drawingPackage。");
  }

  const seenIds = new Set<string>();
  const validateItems = (items: unknown[], label: string) => {
    items.forEach((item, index) => {
      const record = asRecord(item);
      if (!record) {
        errors.push(`${label}[${index}] 不是对象。`);
        return;
      }
      if (typeof record.id !== "string" || !record.id.trim()) {
        errors.push(`${label}[${index}] 缺少 id。`);
        return;
      }
      if (seenIds.has(record.id)) errors.push(`对象 id 重复：${record.id}。`);
      seenIds.add(record.id);
    });
  };
  validateItems(getArray(workspace.furniture), "furniture");
  validateItems(getArray(workspace.drawingItems), "drawingItems");
  validateItems(getArray(workspace.semanticObjects), "semanticObjects");
  validateItems(getArray(workspace.cameraViews), "cameraViews");
  Object.entries(structures ?? {}).forEach(([floorId, structureValue]) => {
    const structure = asRecord(structureValue);
    if (!structure) return;
    Object.entries(structure).forEach(([key, collection]) => {
      if (Array.isArray(collection)) validateItems(collection, `houseStructuresByFloor.${floorId}.${key}`);
    });
  });
  validateWorkspaceReferences(workspace).errors.forEach((issue) => {
    errors.push(`${issue.path}: ${issue.message}`);
  });
  return Array.from(new Set(errors));
}

export function getWorkspaceStats(value: unknown) {
  const workspace = asRecord(value) ?? {};
  const structures = asRecord(workspace.houseStructuresByFloor) ?? {};
  return {
    floorIds: Object.keys(structures).sort(),
    floorCount: Object.keys(structures).length,
    moduleCount: getArray(workspace.furniture).length,
    drawingItemCount: getArray(workspace.drawingItems).length,
    semanticObjectCount: getArray(workspace.semanticObjects).length,
    cameraViewCount: getArray(workspace.cameraViews).length,
    updatedAt: typeof workspace.updatedAt === "string"
      ? workspace.updatedAt
      : typeof workspace.savedAt === "string" ? workspace.savedAt : undefined
  };
}

export function getDetailedWorkspaceDifference(pageValue: unknown, codeValue: unknown) {
  const page = normalizeWorkspace(pageValue);
  const code = normalizeWorkspace(codeValue);
  const pageStats = getWorkspaceStats(pageValue);
  const codeStats = getWorkspaceStats(codeValue);
  const pageObjects = collectWorkspaceObjects(page);
  const codeObjects = collectWorkspaceObjects(code);
  const pageIds = Array.from(pageObjects.keys()).sort();
  const codeIds = Array.from(codeObjects.keys()).sort();
  const addedObjectIds = pageIds.filter((id) => !codeObjects.has(id));
  const removedObjectIds = codeIds.filter((id) => !pageObjects.has(id));
  const commonIds = pageIds.filter((id) => codeObjects.has(id));
  const positionChangedObjectIds: string[] = [];
  const sizeChangedObjectIds: string[] = [];
  const materialChangedObjectIds: string[] = [];
  const mepMetaChangedObjectIds: string[] = [];
  const constructionMetaChangedObjectIds: string[] = [];

  commonIds.forEach((id) => {
    const pageObject = pageObjects.get(id) ?? {};
    const codeObject = codeObjects.get(id) ?? {};
    if (valuesDiffer(pageObject.position, codeObject.position)) positionChangedObjectIds.push(id);
    if (valuesDiffer(pageObject.dimensions ?? pageObject.size, codeObject.dimensions ?? codeObject.size)) sizeChangedObjectIds.push(id);
    const pageMaterial = { material: pageObject.material, color: pageObject.color, render3d: pageObject.render3d };
    const codeMaterial = { material: codeObject.material, color: codeObject.color, render3d: codeObject.render3d };
    if (valuesDiffer(pageMaterial, codeMaterial)) materialChangedObjectIds.push(id);
    if (valuesDiffer(pageObject.mepMeta, codeObject.mepMeta)) mepMetaChangedObjectIds.push(id);
    if (valuesDiffer(pageObject.constructionMeta, codeObject.constructionMeta)) constructionMetaChangedObjectIds.push(id);
  });

  const pageFields = Array.from(collectFieldPaths(page)).sort();
  const codeFields = Array.from(collectFieldPaths(code)).sort();
  return {
    equal: compareWorkspace(page, code),
    floorsMatch: stableStringify(pageStats.floorIds) === stableStringify(codeStats.floorIds),
    pageStats,
    codeStats,
    addedObjectIds,
    removedObjectIds,
    positionChangedObjectIds,
    sizeChangedObjectIds,
    materialChangedObjectIds,
    mepMetaChangedObjectIds,
    constructionMetaChangedObjectIds,
    pageOnlyFields: pageFields.filter((key) => !codeFields.includes(key)).sort(),
    codeOnlyFields: codeFields.filter((key) => !pageFields.includes(key)).sort()
  };
}

export function validateWorkspacePayload(value: unknown): value is Record<string, unknown> {
  return getWorkspaceValidationErrors(value).length === 0;
}

export function getWorkspaceDifferenceSummary(left: unknown, right: unknown) {
  const leftWorkspace = normalizeWorkspace(left);
  const rightWorkspace = normalizeWorkspace(right);
  const keys = Array.from(new Set([...Object.keys(leftWorkspace), ...Object.keys(rightWorkspace)])).sort();
  return keys.filter((key) => {
    const leftHasKey = Object.prototype.hasOwnProperty.call(leftWorkspace, key);
    const rightHasKey = Object.prototype.hasOwnProperty.call(rightWorkspace, key);
    if (leftHasKey !== rightHasKey) return true;
    return stableStringify(leftWorkspace[key]) !== stableStringify(rightWorkspace[key]);
  });
}

// Compatibility aliases for older save call sites.
export const canonicalWorkspaceJson = (workspace: unknown) => stableStringify(normalizeWorkspace(workspace));
export const hashWorkspace = getWorkspaceHash;
