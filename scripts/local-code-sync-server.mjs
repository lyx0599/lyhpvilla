import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.LOCAL_CODE_SYNC_PORT ?? 3011);
const defaultWorkspacePath = resolve("data/default-workspace.json");
const backupWorkspacePath = resolve(".codex-current-browser-workspace.json");
const maxBodyBytes = 5 * 1024 * 1024;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "http://127.0.0.1:3010",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBodyBytes) {
        request.destroy();
        rejectBody(new Error("Workspace payload is too large."));
      }
    });
    request.on("end", () => resolveBody(body));
    request.on("error", rejectBody);
  });
}

function validateWorkspace(workspace) {
  if (!workspace || typeof workspace !== "object") return "Workspace JSON is invalid.";
  if (!workspace.houseStructuresByFloor || typeof workspace.houseStructuresByFloor !== "object") return "Missing houseStructuresByFloor.";
  if (!Array.isArray(workspace.furniture)) return "Missing furniture.";
  return "";
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { ok: true, path: defaultWorkspacePath });
    return;
  }

  if (request.method !== "POST" || request.url !== "/default-workspace") {
    sendJson(response, 404, { ok: false, error: "Not found." });
    return;
  }

  try {
    const body = await readRequestBody(request);
    const workspace = JSON.parse(body);
    const validationError = validateWorkspace(workspace);
    if (validationError) {
      sendJson(response, 400, { ok: false, error: validationError });
      return;
    }
    const nextContent = `${JSON.stringify(workspace, null, 2)}\n`;
    await writeFile(defaultWorkspacePath, nextContent, "utf8");
    await writeFile(backupWorkspacePath, nextContent, "utf8");
    sendJson(response, 200, {
      ok: true,
      path: defaultWorkspacePath,
      savedAt: workspace.savedAt ?? new Date().toISOString()
    });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : "Write failed." });
  }
});

server.listen(port, host, () => {
  console.log(`Local code sync server listening on http://${host}:${port}`);
});
