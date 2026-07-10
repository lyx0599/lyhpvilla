import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { access, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.LOCAL_CODE_SYNC_PORT ?? 3011);
const defaultWorkspacePath = resolve("data/default-workspace.json");
const temporaryWorkspacePath = resolve("data/default-workspace.json.tmp");
const backupDirectoryPath = resolve("data/backups");
const currentBrowserWorkspacePath = resolve(".codex-current-browser-workspace.json");
const requiredFloorIds = ["B2", "B1", "1F", "2F", "YARD"];
const maxBodyBytes = 5 * 1024 * 1024;
const uiTemporaryWorkspaceKeys = new Set([
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
const omitValue = Symbol("omit-workspace-value");

function getAllowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return null;
  return /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin) ? origin : null;
}

function sendJson(request, response, statusCode, payload) {
  const allowedOrigin = getAllowedOrigin(request);
  const headers = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8"
  };
  if (allowedOrigin) headers["Access-Control-Allow-Origin"] = allowedOrigin;
  response.writeHead(statusCode, headers);
  response.end(JSON.stringify(payload));
}

function normalizeJsonValue(value, path) {
  if (value === undefined) return omitValue;
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${path} contains NaN or Infinity.`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.reduce((items, item, index) => {
      const normalized = normalizeJsonValue(item, `${path}[${index}]`);
      if (normalized !== omitValue) items.push(normalized);
      return items;
    }, []);
  }
  if (typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      const normalized = normalizeJsonValue(value[key], `${path}.${key}`);
      if (normalized !== omitValue) result[key] = normalized;
      return result;
    }, {});
  }
  throw new Error(`${path} contains unsupported ${typeof value} data.`);
}

function normalizeWorkspace(workspace) {
  if (!workspace || typeof workspace !== "object" || Array.isArray(workspace)) throw new Error("Workspace must be an object.");
  const persistedWorkspace = Object.keys(workspace).reduce((result, key) => {
    if (!uiTemporaryWorkspaceKeys.has(key)) result[key] = workspace[key];
    return result;
  }, {});
  const normalized = normalizeJsonValue(persistedWorkspace, "workspace");
  if (normalized === omitValue || !normalized || typeof normalized !== "object" || Array.isArray(normalized)) {
    throw new Error("Workspace normalization produced an invalid value.");
  }
  return normalized;
}

function stableStringify(value) {
  const normalized = normalizeJsonValue(value, "value");
  if (normalized === omitValue) throw new Error("Cannot stringify an undefined root value.");
  return JSON.stringify(normalized);
}

function getWorkspaceHash(workspace) {
  return createHash("sha256").update(stableStringify(normalizeWorkspace(workspace))).digest("hex");
}

function compareWorkspace(left, right) {
  return stableStringify(normalizeWorkspace(left)) === stableStringify(normalizeWorkspace(right));
}

function formatBackupTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function getBackupWorkspacePath() {
  const baseName = `default-workspace-${formatBackupTimestamp()}`;
  let suffix = 0;
  while (true) {
    const candidate = resolve(backupDirectoryPath, `${baseName}${suffix ? `-${String(suffix).padStart(2, "0")}` : ""}.json`);
    try {
      await access(candidate);
      suffix += 1;
    } catch {
      return candidate;
    }
  }
}

function readRequestBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBodyBytes) {
        request.destroy();
        rejectBody(new Error("Workspace payload exceeds 5 MB."));
      }
    });
    request.on("end", () => resolveBody(body));
    request.on("error", rejectBody);
  });
}

function validateObjectArray(items, label, seenIds) {
  if (!Array.isArray(items)) return `${label} must be an array.`;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) return `${label}[${index}] must be an object.`;
    if (typeof item.id !== "string" || !item.id.trim()) return `${label}[${index}] is missing id.`;
    if (seenIds.has(item.id)) return `Duplicate object id: ${item.id}.`;
    seenIds.add(item.id);
  }
  return "";
}

function validateNumericContainer(value, path) {
  if (!value || typeof value !== "object") return `${path} must be an object or array.`;
  if (Object.keys(value).length === 0) return `${path} must not be empty.`;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (typeof child === "number") {
      if (!Number.isFinite(child)) return `${childPath} must be a finite number.`;
      continue;
    }
    if (key === "unit" && typeof child === "string") continue;
    if (child && typeof child === "object") {
      const nestedError = validateNumericContainer(child, childPath);
      if (nestedError) return nestedError;
      continue;
    }
    return `${childPath} must not be null, undefined, NaN, Infinity, or non-numeric.`;
  }
  return "";
}

function validateGeometryValues(value, path = "workspace") {
  if (!value || typeof value !== "object") return "";
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (key === "rotation") {
      if (typeof child !== "number" || !Number.isFinite(child)) return `${childPath} must be a finite number.`;
    }
    if (key === "position" || key === "size" || key === "dimensions") {
      const containerError = validateNumericContainer(child, childPath);
      if (containerError) return containerError;
      if (key === "position") {
        if (typeof child.x !== "number" || !Number.isFinite(child.x) || typeof child.y !== "number" || !Number.isFinite(child.y)) {
          return `${childPath} must contain finite x and y values.`;
        }
      }
    }
    if (child && typeof child === "object") {
      const nestedError = validateGeometryValues(child, childPath);
      if (nestedError) return nestedError;
    }
  }
  return "";
}

function validateWorkspace(workspace) {
  if (!workspace || typeof workspace !== "object" || Array.isArray(workspace)) return "Workspace must be a JSON object.";
  if (Object.keys(workspace).length === 0) return "Workspace must not be empty.";

  const structures = workspace.houseStructuresByFloor;
  if (!structures || typeof structures !== "object" || Array.isArray(structures)) return "Missing houseStructuresByFloor.";
  for (const floorId of requiredFloorIds) {
    const structure = structures[floorId];
    if (!structure || typeof structure !== "object" || Array.isArray(structure) || Object.keys(structure).length === 0) {
      return `Missing or empty houseStructuresByFloor.${floorId}.`;
    }
  }

  if (!Array.isArray(workspace.furniture) || workspace.furniture.length === 0) return "furniture must be a non-empty array.";
  if (!Array.isArray(workspace.semanticObjects) || workspace.semanticObjects.length === 0) return "semanticObjects must be a non-empty array.";

  const seenIds = new Set();
  const topLevelCollections = [
    [workspace.furniture, "furniture"],
    [workspace.semanticObjects, "semanticObjects"]
  ];
  if (workspace.cameraViews !== undefined) topLevelCollections.push([workspace.cameraViews, "cameraViews"]);
  if (workspace.modules !== undefined) topLevelCollections.push([workspace.modules, "modules"]);

  for (const [items, label] of topLevelCollections) {
    const arrayError = validateObjectArray(items, label, seenIds);
    if (arrayError) return arrayError;
  }

  for (const floorId of requiredFloorIds) {
    const structure = structures[floorId];
    for (const [collectionName, items] of Object.entries(structure)) {
      if (!Array.isArray(items)) continue;
      const arrayError = validateObjectArray(items, `houseStructuresByFloor.${floorId}.${collectionName}`, seenIds);
      if (arrayError) return arrayError;
    }
  }

  return validateGeometryValues(workspace);
}

async function readDefaultWorkspace() {
  const [content, fileStats] = await Promise.all([
    readFile(defaultWorkspacePath, "utf8"),
    stat(defaultWorkspacePath)
  ]);
  const workspace = JSON.parse(content);
  return { content, workspace, updatedAt: fileStats.mtime.toISOString() };
}

async function restoreOldWorkspace(oldContent) {
  await writeFile(temporaryWorkspacePath, oldContent, "utf8");
  await rename(temporaryWorkspacePath, defaultWorkspacePath);
}

const server = createServer(async (request, response) => {
  if (request.headers.origin && !getAllowedOrigin(request)) {
    sendJson(request, response, 403, { ok: false, error: "Origin is not allowed." });
    return;
  }

  if (request.method === "OPTIONS") {
    sendJson(request, response, 204, { ok: true });
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(request, response, 200, { ok: true, filePath: defaultWorkspacePath });
    return;
  }

  if (request.method === "GET" && request.url?.startsWith("/default-workspace")) {
    try {
      const { workspace, updatedAt } = await readDefaultWorkspace();
      const validationError = validateWorkspace(workspace);
      if (validationError) {
        sendJson(request, response, 500, { ok: false, error: `Stored workspace is invalid: ${validationError}` });
        return;
      }
      sendJson(request, response, 200, {
        ok: true,
        workspace,
        filePath: defaultWorkspacePath,
        updatedAt,
        hash: getWorkspaceHash(workspace)
      });
    } catch (error) {
      sendJson(request, response, 500, { ok: false, error: error instanceof Error ? error.message : "Read failed." });
    }
    return;
  }

  if (request.method !== "POST" || request.url !== "/default-workspace") {
    sendJson(request, response, 404, { ok: false, error: "Not found." });
    return;
  }

  let workspace;
  try {
    const body = await readRequestBody(request);
    workspace = JSON.parse(body);
  } catch (error) {
    sendJson(request, response, 400, { ok: false, verified: false, error: error instanceof Error ? error.message : "Invalid JSON." });
    return;
  }

  const validationError = validateWorkspace(workspace);
  if (validationError) {
    sendJson(request, response, 400, { ok: false, verified: false, error: validationError });
    return;
  }

  let oldContent = "";
  let replaced = false;
  let backupPath = "";
  try {
    oldContent = await readFile(defaultWorkspacePath, "utf8");
    await mkdir(backupDirectoryPath, { recursive: true });
    backupPath = await getBackupWorkspacePath();
    await writeFile(backupPath, oldContent, "utf8");

    const nextContent = `${JSON.stringify(workspace, null, 2)}\n`;
    await writeFile(temporaryWorkspacePath, nextContent, "utf8");
    await rename(temporaryWorkspacePath, defaultWorkspacePath);
    replaced = true;

    const { workspace: verifiedWorkspace, updatedAt } = await readDefaultWorkspace();
    const verifiedValidationError = validateWorkspace(verifiedWorkspace);
    if (verifiedValidationError) throw new Error(`Written workspace is invalid: ${verifiedValidationError}`);
    if (!compareWorkspace(verifiedWorkspace, workspace)) {
      throw new Error("Workspace verification failed after write: readback content differs from request.");
    }

    let draftMirrorWarning;
    try {
      await writeFile(currentBrowserWorkspacePath, nextContent, "utf8");
    } catch (error) {
      draftMirrorWarning = error instanceof Error ? error.message : "Draft mirror write failed.";
    }

    sendJson(request, response, 200, {
      ok: true,
      verified: true,
      filePath: defaultWorkspacePath,
      backupPath,
      hash: getWorkspaceHash(verifiedWorkspace),
      savedAt: workspace.savedAt ?? updatedAt,
      ...(draftMirrorWarning ? { draftMirrorWarning } : {})
    });
  } catch (error) {
    let rollbackError;
    if (replaced && oldContent) {
      try {
        await restoreOldWorkspace(oldContent);
      } catch (restoreError) {
        rollbackError = restoreError instanceof Error ? restoreError.message : "Rollback failed.";
      }
    } else {
      try {
        await unlink(temporaryWorkspacePath);
      } catch {
        // The temporary file may not exist.
      }
    }
    const message = error instanceof Error ? error.message : "Write failed.";
    sendJson(request, response, 500, {
      ok: false,
      verified: false,
      error: rollbackError ? `${message} Rollback error: ${rollbackError}` : message,
      ...(backupPath ? { backupPath } : {})
    });
  }
});

server.listen(port, host, () => {
  console.log(`Local code sync server listening on http://${host}:${port}`);
});
