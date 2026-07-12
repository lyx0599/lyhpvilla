import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyWorkspaceMigrations,
  CURRENT_WORKSPACE_DATA_REVISION,
  CURRENT_WORKSPACE_SCHEMA_VERSION
} from "../lib/workspace-migrations.ts";

const canonical = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));

const current = applyWorkspaceMigrations(canonical);
assert.equal(current.workspace.schemaVersion, CURRENT_WORKSPACE_SCHEMA_VERSION);
assert.equal(current.workspace.dataRevision, CURRENT_WORKSPACE_DATA_REVISION);
assert.ok(Object.values(current.sources).every((source) => source === "default-workspace"));
assert.deepEqual(current.workspace.furniture, canonical.furniture, "Current furniture must pass through without injected defaults.");
assert.deepEqual(current.workspace.semanticObjects, canonical.semanticObjects, "Current semantic objects must pass through unchanged.");
assert.deepEqual(current.workspace.cameraViews, canonical.cameraViews, "Current camera views must pass through unchanged.");
assert.deepEqual(current.workspace.houseStructuresByFloor, canonical.houseStructuresByFloor, "Current structures must pass through unchanged.");

const legacy = structuredClone(canonical);
legacy.schemaVersion = 4;
delete legacy.dataRevision;
delete legacy.floors;
delete legacy.cameraViews;
delete legacy.houseStructuresByFloor.B1.columns;
legacy.furniture = [];
legacy.semanticObjects = [];
legacy.houseStructuresByFloor.B1.rooms = [];

const migrated = applyWorkspaceMigrations(legacy, { canonicalWorkspace: canonical });
assert.equal(migrated.sources.floors, "migration");
assert.equal(migrated.sources.cameraViews, "migration");
assert.equal(migrated.sources.houseStructuresByFloor, "migration");
assert.deepEqual(migrated.workspace.furniture, [], "An existing empty furniture array must not receive defaults.");
assert.deepEqual(migrated.workspace.semanticObjects, [], "An existing empty semantic array must not receive defaults.");
assert.deepEqual(migrated.workspace.houseStructuresByFloor.B1.rooms, [], "An existing empty room array must stay empty.");
assert.deepEqual(migrated.workspace.houseStructuresByFloor.B1.columns, canonical.houseStructuresByFloor.B1.columns);

const migratedTwice = applyWorkspaceMigrations(migrated.workspace, { canonicalWorkspace: canonical });
assert.deepEqual(migratedTwice.workspace, migrated.workspace, "Workspace migrations must be idempotent.");
assert.ok(Object.values(migratedTwice.sources).every((source) => source === "default-workspace"));

const invalidCurrent = structuredClone(canonical);
delete invalidCurrent.floors;
assert.throws(
  () => applyWorkspaceMigrations(invalidCurrent, { canonicalWorkspace: canonical }),
  /Current workspace is missing floors/
);

console.log("Workspace migration checks passed.");
