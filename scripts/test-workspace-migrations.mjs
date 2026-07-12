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
assert.deepEqual(current.workspace.drawingItems, canonical.drawingItems, "Current drawing items must pass through unchanged.");
assert.deepEqual(current.workspace.semanticObjects, canonical.semanticObjects, "Current semantic objects must pass through unchanged.");
assert.deepEqual(current.workspace.cameraViews, canonical.cameraViews, "Current camera views must pass through unchanged.");
assert.deepEqual(current.workspace.roomTourViews, canonical.roomTourViews, "Current room tour views must pass through unchanged.");
assert.deepEqual(current.workspace.houseStructuresByFloor, canonical.houseStructuresByFloor, "Current structures must pass through unchanged.");

const legacy = structuredClone(canonical);
legacy.schemaVersion = 4;
delete legacy.dataRevision;
delete legacy.floors;
delete legacy.cameraViews;
delete legacy.roomTourViews;
delete legacy.drawingItems;
delete legacy.drawingPackage;
delete legacy.houseStructuresByFloor.B1.columns;
legacy.furniture = [];
legacy.semanticObjects = [];
legacy.houseStructuresByFloor.B1.rooms = [];

const migrated = applyWorkspaceMigrations(legacy, { canonicalWorkspace: canonical });
assert.equal(migrated.sources.floors, "migration");
assert.equal(migrated.sources.cameraViews, "migration");
assert.equal(migrated.sources.roomTourViews, "migration");
assert.equal(migrated.sources.drawingItems, "migration");
assert.equal(migrated.sources.drawingPackage, "migration");
assert.deepEqual(migrated.workspace.drawingItems, []);
assert.equal(migrated.sources.houseStructuresByFloor, "migration");
assert.deepEqual(migrated.workspace.furniture, [], "An existing empty furniture array must not receive defaults.");
assert.deepEqual(migrated.workspace.semanticObjects, [], "An existing empty semantic array must not receive defaults.");
assert.deepEqual(migrated.workspace.houseStructuresByFloor.B1.rooms, [], "An existing empty room array must stay empty.");
assert.deepEqual(migrated.workspace.houseStructuresByFloor.B1.columns, canonical.houseStructuresByFloor.B1.columns);

const migratedTwice = applyWorkspaceMigrations(migrated.workspace, { canonicalWorkspace: canonical });
assert.deepEqual(migratedTwice.workspace, migrated.workspace, "Workspace migrations must be idempotent.");
assert.ok(Object.values(migratedTwice.sources).every((source) => source === "default-workspace"));

const legacyStairLanes = structuredClone(canonical);
legacyStairLanes.dataRevision = "2026-07-12-mobile-room-tour-v1";
const legacyB1Up = legacyStairLanes.houseStructuresByFloor.B1.stairs.find((stair) => stair.id === "ST-B1-001");
const legacyB1Down = legacyStairLanes.houseStructuresByFloor.B1.stairs.find((stair) => stair.id === "ST-B1-002");
legacyB1Up.name = "B1 上行至 1F 梯段";
legacyB1Up.start.y = 4625;
legacyB1Up.end.y = 4625;
legacyB1Down.name = "B1 下行至 B2 梯段";
legacyB1Down.start.y = 3575;
legacyB1Down.end.y = 3575;
const migratedStairLanes = applyWorkspaceMigrations(legacyStairLanes, { canonicalWorkspace: canonical });
assert.equal(migratedStairLanes.workspace.houseStructuresByFloor.B1.stairs.find((stair) => stair.id === "ST-B1-001").start.y, 3575);
assert.equal(migratedStairLanes.workspace.houseStructuresByFloor.B1.stairs.find((stair) => stair.id === "ST-B1-002").start.y, 4625);
assert.equal(migratedStairLanes.workspace.houseStructuresByFloor.B1.stairs.find((stair) => stair.id === "ST-B1-001").name, "右侧上行至 1F 梯段");
assert.equal(migratedStairLanes.sources.houseStructuresByFloor, "migration");

const legacyLighting = structuredClone(canonical);
legacyLighting.schemaVersion = 8;
legacyLighting.dataRevision = "2026-07-12-stair-lane-convention-v1";
const legacyLight = legacyLighting.drawingItems.find((item) => item.category === "light");
for (const field of ["lightType", "lightingLayer", "colorTemperature", "beamAngle", "mountingType", "relatedSwitchId", "controlGroupId", "smartControl", "dimming", "relatedRoomId", "hostCeilingAreaId"]) delete legacyLight[field];
const migratedLighting = applyWorkspaceMigrations(legacyLighting, { canonicalWorkspace: canonical });
const upgradedLight = migratedLighting.workspace.drawingItems.find((item) => item.id === legacyLight.id);
assert.equal(upgradedLight.lightType, upgradedLight.type);
assert.equal(upgradedLight.colorTemperature, upgradedLight.lightColorTemperature);
assert.equal(upgradedLight.relatedRoomId, upgradedLight.roomId);
assert.ok(upgradedLight.lightingLayer);
assert.ok(upgradedLight.mountingType);
assert.ok(upgradedLight.relatedSwitchId);
assert.equal(migratedLighting.sources.drawingItems, "migration");

const invalidCurrent = structuredClone(canonical);
delete invalidCurrent.floors;
assert.throws(
  () => applyWorkspaceMigrations(invalidCurrent, { canonicalWorkspace: canonical }),
  /Current workspace is missing floors/
);

console.log("Workspace migration checks passed.");
