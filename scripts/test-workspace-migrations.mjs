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
assert.equal(current.workspace.selectedDrawingSheetType, canonical.selectedDrawingSheetType, "Current drawing specialty must pass through unchanged.");
assert.deepEqual(current.workspace.houseStructuresByFloor, canonical.houseStructuresByFloor, "Current structures must pass through unchanged.");

const legacy = structuredClone(canonical);
legacy.schemaVersion = 4;
delete legacy.dataRevision;
delete legacy.floors;
delete legacy.cameraViews;
delete legacy.roomTourViews;
delete legacy.drawingItems;
delete legacy.drawingPackage;
delete legacy.selectedDrawingSheetType;
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
assert.equal(migrated.workspace.selectedDrawingSheetType, "sitePlan");
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

const confirmedLighting = structuredClone(canonical);
confirmedLighting.schemaVersion = 13;
confirmedLighting.dataRevision = "2026-07-13-furniture-placement-reliability-v1";
delete confirmedLighting.lightingDesign;
const confirmedLight = confirmedLighting.drawingItems.find((item) => item.category === "light" && item.generatedKey?.startsWith("lighting-design-v1:"));
confirmedLight.status = "confirmed";
confirmedLight.positionMm.x += 137;
confirmedLight.label = `${confirmedLight.label} · 人工确认`;
delete confirmedLight.lightSpec;
const migratedConfirmedLighting = applyWorkspaceMigrations(confirmedLighting, { canonicalWorkspace: canonical });
const preservedConfirmedLight = migratedConfirmedLighting.workspace.drawingItems.find((item) => item.id === confirmedLight.id);
assert.equal(preservedConfirmedLight.status, "confirmed", "Confirmed lights must not be overwritten by the modern-warm migration.");
assert.equal(preservedConfirmedLight.positionMm.x, confirmedLight.positionMm.x, "Confirmed light positions must be preserved.");
assert.equal(preservedConfirmedLight.label, confirmedLight.label, "Confirmed light labels must be preserved.");
assert.equal(migratedConfirmedLighting.workspace.lightingDesign.fixtureFamilies.length, 18, "Legacy workspaces must receive the modern-warm family library.");

const verificationCollections = ["walls", "doors", "windows", "bayWindows", "stairs", "columns", "rooms", "outdoors", "skylights", "partitions"];
const legacyVerification = structuredClone(canonical);
legacyVerification.schemaVersion = 11;
legacyVerification.dataRevision = "2026-07-13-shared-drawing-3d-v1";
for (const structure of Object.values(legacyVerification.houseStructuresByFloor)) {
  for (const collection of verificationCollections) {
    for (const object of structure[collection]) delete object.verificationMeta;
  }
}
const geometryBeforeVerificationMigration = structuredClone(legacyVerification.houseStructuresByFloor);
const migratedVerification = applyWorkspaceMigrations(legacyVerification, { canonicalWorkspace: canonical });
for (const structure of Object.values(migratedVerification.workspace.houseStructuresByFloor)) {
  for (const collection of verificationCollections) {
    for (const object of structure[collection]) {
      assert.ok(object.verificationMeta, `${object.id} must receive verificationMeta`);
      assert.notEqual(object.verificationMeta.status, "confirmed", `${object.id} must not be auto-confirmed`);
    }
  }
}
const geometryAfterVerificationMigration = structuredClone(migratedVerification.workspace.houseStructuresByFloor);
for (const structure of Object.values(geometryAfterVerificationMigration)) {
  for (const collection of verificationCollections) {
    for (const object of structure[collection]) delete object.verificationMeta;
  }
}
assert.deepEqual(geometryAfterVerificationMigration, geometryBeforeVerificationMigration, "Verification migration must preserve all geometry, IDs, names and references.");
assert.equal(migratedVerification.sources.houseStructuresByFloor, "migration");

const customVerification = structuredClone(legacyVerification);
const customWall = customVerification.houseStructuresByFloor["1F"].walls[0];
customWall.verificationMeta = { status: "site-measured", source: "site-measurement", toleranceMm: 5, notes: "现场激光复尺" };
const migratedCustomVerification = applyWorkspaceMigrations(customVerification, { canonicalWorkspace: canonical });
assert.deepEqual(migratedCustomVerification.workspace.houseStructuresByFloor["1F"].walls[0].verificationMeta, customWall.verificationMeta, "Existing verification metadata must pass through unchanged.");

const legacyFurniturePlacement = structuredClone(canonical);
legacyFurniturePlacement.schemaVersion = 12;
legacyFurniturePlacement.dataRevision = "2026-07-13-dimension-verification-shared-3d-v1";
legacyFurniturePlacement.furniture.forEach((item) => delete item.outdoorId);
legacyFurniturePlacement.drawingItems.forEach((item) => delete item.relatedFurniturePositionMm);
const placementGeometryBefore = structuredClone(legacyFurniturePlacement.furniture.map((item) => ({ id: item.id, position: item.position, dimensions: item.dimensions, roomId: item.roomId })));
const migratedFurniturePlacement = applyWorkspaceMigrations(legacyFurniturePlacement, { canonicalWorkspace: canonical });
assert.ok(migratedFurniturePlacement.workspace.furniture.filter((item) => item.roomId.startsWith("OD-")).every((item) => item.outdoorId === item.roomId), "Outdoor furniture must receive outdoorId without changing roomId.");
assert.ok(migratedFurniturePlacement.workspace.drawingItems.filter((item) => item.relatedFurnitureId).every((item) => item.relatedFurniturePositionMm), "Linked drawing items must receive a furniture-position baseline.");
assert.deepEqual(migratedFurniturePlacement.workspace.furniture.map((item) => ({ id: item.id, position: item.position, dimensions: item.dimensions, roomId: item.roomId })), placementGeometryBefore, "Furniture placement migration must preserve existing geometry and room IDs.");

const preservedPlacement = structuredClone(legacyFurniturePlacement);
preservedPlacement.furniture[0].hostWallId = preservedPlacement.houseStructuresByFloor[preservedPlacement.furniture[0].floorId].walls[0].id;
preservedPlacement.furniture[0].wallAnchor = { positionOnWall: 0.4, offsetMm: 20, side: "left", followWall: true };
preservedPlacement.furniture[0].clearanceMeta = { frontMm: 800, serviceMm: 600, notes: "现场复核" };
const migratedPreservedPlacement = applyWorkspaceMigrations(preservedPlacement, { canonicalWorkspace: canonical });
assert.deepEqual(migratedPreservedPlacement.workspace.furniture[0].wallAnchor, preservedPlacement.furniture[0].wallAnchor);
assert.deepEqual(migratedPreservedPlacement.workspace.furniture[0].clearanceMeta, preservedPlacement.furniture[0].clearanceMeta);

const legacyFurnitureVariants = structuredClone(canonical);
legacyFurnitureVariants.schemaVersion = 14;
legacyFurnitureVariants.dataRevision = "2026-07-14-modern-warm-lighting-v1";
legacyFurnitureVariants.furniture.forEach((item) => {
  delete item.render3d.variantId;
  delete item.render3d.variationSeed;
});
const variantProtectedData = legacyFurnitureVariants.furniture.map((item) => ({ id: item.id, name: item.name, floorId: item.floorId, roomId: item.roomId, position: item.position, dimensions: item.dimensions, material: item.material, primaryMaterial: item.render3d.primaryMaterial }));
const migratedFurnitureVariants = applyWorkspaceMigrations(legacyFurnitureVariants, { canonicalWorkspace: canonical });
assert.ok(migratedFurnitureVariants.workspace.furniture.every((item) => item.render3d.variantId && Number.isInteger(item.render3d.variationSeed)), "Legacy furniture must receive stable variant metadata.");
assert.deepEqual(migratedFurnitureVariants.workspace.furniture.map((item) => ({ id: item.id, name: item.name, floorId: item.floorId, roomId: item.roomId, position: item.position, dimensions: item.dimensions, material: item.material, primaryMaterial: item.render3d.primaryMaterial })), variantProtectedData, "Furniture variant migration must preserve geometry, identity, room and existing material data.");

const invalidCurrent = structuredClone(canonical);
delete invalidCurrent.floors;
assert.throws(
  () => applyWorkspaceMigrations(invalidCurrent, { canonicalWorkspace: canonical }),
  /Current workspace is missing floors/
);

console.log("Workspace migration checks passed.");
