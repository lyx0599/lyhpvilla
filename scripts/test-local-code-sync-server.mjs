import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const canonical = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const temporaryKeys = new Set(["savedAt", "updatedAt", "saveMode", "uiState", "viewMode", "plannerMode", "drawTool", "selectedFurnitureId", "selectedSemanticObjectId", "activeObjectId", "draftSaveState", "codeSaveState", "publishState"]);

function normalized(value) {
  if (Array.isArray(value)) return value.map(normalized);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result, key) => {
    if (!temporaryKeys.has(key)) result[key] = normalized(value[key]);
    return result;
  }, {});
}

function workspaceHash(value) {
  return createHash("sha256").update(JSON.stringify(normalized(value))).digest("hex");
}

async function startServer(paths, extraEnv = {}) {
  const child = spawn(process.execPath, ["--experimental-strip-types", "scripts/local-code-sync-server.mjs"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: "test",
      LOCAL_CODE_SYNC_PORT: "0",
      LOCAL_CODE_SYNC_WORKSPACE_PATH: paths.workspace,
      LOCAL_CODE_SYNC_BACKUP_DIR: paths.backups,
      LOCAL_CODE_SYNC_DRAFT_MIRROR_PATH: paths.mirror,
      ...extraEnv
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  const port = await new Promise((resolvePort, reject) => {
    const timer = setTimeout(() => reject(new Error(`Save service start timed out. ${stderr}`)), 10_000);
    child.stdout.on("data", (chunk) => {
      const match = chunk.toString().match(/127\.0\.0\.1:(\d+)/);
      if (!match) return;
      clearTimeout(timer);
      resolvePort(Number(match[1]));
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Save service exited early (${code}). ${stderr}`));
    });
  });
  return { child, baseUrl: `http://127.0.0.1:${port}` };
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolveExit) => {
    const timer = setTimeout(resolveExit, 2_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolveExit();
    });
  });
}

const root = await mkdtemp(join(tmpdir(), "villa-save-service-"));
const paths = {
  workspace: join(root, "default-workspace.json"),
  backups: join(root, "backups"),
  mirror: join(root, "draft-mirror.json")
};
const originalContent = `${JSON.stringify(canonical, null, 2)}\n`;
await mkdir(paths.backups, { recursive: true });
await writeFile(paths.workspace, originalContent, "utf8");

let running;
try {
  running = await startServer(paths);
  const changed = structuredClone(canonical);
  changed.savedAt = new Date().toISOString();
  changed.furniture[0].note = `${changed.furniture[0].note ?? ""} save-service-test`.trim();
  const postResponse = await fetch(`${running.baseUrl}/default-workspace`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:3010" },
    body: JSON.stringify(changed)
  });
  const postResult = await postResponse.json();
  assert.equal(postResponse.status, 200);
  assert.equal(postResult.ok, true);
  assert.equal(postResult.verified, true);
  assert.equal(postResult.hash, workspaceHash(changed));

  const backups = await readdir(paths.backups);
  assert.equal(backups.length, 1, "A successful write must create exactly one backup.");
  assert.equal(await readFile(join(paths.backups, backups[0]), "utf8"), originalContent);

  const readbackResponse = await fetch(`${running.baseUrl}/default-workspace`);
  const readback = await readbackResponse.json();
  assert.equal(readback.ok, true);
  assert.deepEqual(normalized(readback.workspace), normalized(changed));
  assert.equal(readback.hash, workspaceHash(changed));

  const beforeInvalid = await readFile(paths.workspace, "utf8");
  const invalidResponse = await fetch(`${running.baseUrl}/default-workspace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  assert.equal(invalidResponse.status, 400);
  assert.equal((await invalidResponse.json()).verified, false);
  assert.equal(await readFile(paths.workspace, "utf8"), beforeInvalid, "Invalid payload must not overwrite the workspace.");
  await stopServer(running.child);
  running = undefined;

  await writeFile(paths.workspace, originalContent, "utf8");
  const rollbackServer = await startServer(paths, { LOCAL_CODE_SYNC_TEST_FAIL_AFTER_REPLACE: "true" });
  running = rollbackServer;
  const rollbackResponse = await fetch(`${rollbackServer.baseUrl}/default-workspace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changed)
  });
  const rollbackResult = await rollbackResponse.json();
  assert.equal(rollbackResponse.status, 500);
  assert.equal(rollbackResult.verified, false);
  assert.match(rollbackResult.error, /Injected failure/);
  assert.equal(await readFile(paths.workspace, "utf8"), originalContent, "Failed verification must roll back the original file.");
  console.log("local code sync service integration tests passed");
} finally {
  if (running) await stopServer(running.child);
  await rm(root, { recursive: true, force: true });
}
