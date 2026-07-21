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
assert.equal(current.sources.drawingItems, "migration");
assert.deepEqual(current.workspace.furniture, canonical.furniture, "Current furniture must pass through without injected defaults.");
assert.ok(current.workspace.drawingItems.filter((item) => ["socket", "network", "switch", "light", "waterSupply", "drainage"].includes(item.category)).every((item) => item.confidence === "schemePositioned"), "Current MEP points must carry scheme-stage confidence.");
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

const legacyLivingSurfaces = structuredClone(canonical);
legacyLivingSurfaces.dataRevision = "2026-07-18-yard-skylight-clearance-v7";
const legacyLivingRoom = legacyLivingSurfaces.houseStructuresByFloor["1F"].rooms.find((room) => room.id === "ROOM-1F-005");
delete legacyLivingRoom.surfaceFinishes;
const migratedLivingSurfaces = applyWorkspaceMigrations(legacyLivingSurfaces, { canonicalWorkspace: canonical });
const migratedLivingRoom = migratedLivingSurfaces.workspace.houseStructuresByFloor["1F"].rooms.find((room) => room.id === "ROOM-1F-005");
assert.equal(migratedLivingRoom.surfaceFinishes.floor.tileWidthMm, 600, "Legacy drafts must receive the living-room tile specification.");
assert.equal(migratedLivingRoom.surfaceFinishes.wall.material, "mineralTextureWallpaper", "Legacy drafts must receive the living-room wall finish.");
assert.equal(migratedLivingSurfaces.sources.houseStructuresByFloor, "migration");

const customLivingSurfaces = structuredClone(legacyLivingSurfaces);
const customLivingRoom = customLivingSurfaces.houseStructuresByFloor["1F"].rooms.find((room) => room.id === "ROOM-1F-005");
customLivingRoom.surfaceFinishes = { floor: { ...canonical.houseStructuresByFloor["1F"].rooms.find((room) => room.id === "ROOM-1F-005").surfaceFinishes.floor, baseColor: "#abcdef" } };
const migratedCustomLivingSurfaces = applyWorkspaceMigrations(customLivingSurfaces, { canonicalWorkspace: canonical });
const preservedLivingRoom = migratedCustomLivingSurfaces.workspace.houseStructuresByFloor["1F"].rooms.find((room) => room.id === "ROOM-1F-005");
assert.equal(preservedLivingRoom.surfaceFinishes.floor.baseColor, "#abcdef", "Existing user-selected floor finishes must be preserved.");
assert.ok(preservedLivingRoom.surfaceFinishes.wall, "A missing wall finish may be added without replacing the custom floor finish.");

const legacyLivingJoinery = structuredClone(canonical);
legacyLivingJoinery.dataRevision = "2026-07-22-living-surface-finishes-v8";
legacyLivingJoinery.furniture.find((item) => item.id === "furn-living-waterbar-001").dimensions.width = 180;
legacyLivingJoinery.furniture.find((item) => item.id === "furn-living-waterbar-upper-001").dimensions.width = 180;
legacyLivingJoinery.furniture.find((item) => item.id === "furn-living-snack-pullout-001").render3d.variantId = "handleless";
const legacyLivingWindow = legacyLivingJoinery.houseStructuresByFloor["1F"].windows.find((window) => window.id === "WIN-1F-006");
legacyLivingWindow.width = 1200;
legacyLivingWindow.height = 1400;
legacyLivingWindow.sillHeightMm = 900;
const migratedLivingJoinery = applyWorkspaceMigrations(legacyLivingJoinery, { canonicalWorkspace: canonical });
assert.equal(migratedLivingJoinery.workspace.furniture.find((item) => item.id === "furn-living-waterbar-001").dimensions.width, 240);
assert.equal(migratedLivingJoinery.workspace.furniture.find((item) => item.id === "furn-living-snack-pullout-001").render3d.variantId, "doubleDoorPulloutPantry");
assert.equal(migratedLivingJoinery.workspace.houseStructuresByFloor["1F"].windows.find((window) => window.id === "WIN-1F-006").width, 3600);

const legacyInteriorDoors = structuredClone(canonical);
legacyInteriorDoors.dataRevision = "2026-07-22-living-window-waterbar-v9";
for (const structure of Object.values(legacyInteriorDoors.houseStructuresByFloor)) {
  for (const door of structure.doors) delete door.visual;
}
const legacyMasterDoor = legacyInteriorDoors.houseStructuresByFloor["2F"].doors.find((door) => door.id === "D-2F-008");
legacyMasterDoor.width = 900;
legacyMasterDoor.height = 2100;
const migratedInteriorDoors = applyWorkspaceMigrations(legacyInteriorDoors, { canonicalWorkspace: canonical });
assert.equal(migratedInteriorDoors.workspace.houseStructuresByFloor["1F"].doors.find((door) => door.id === "D-1F-005").visual.style, "archedReededGlass");
assert.equal(migratedInteriorDoors.workspace.houseStructuresByFloor["2F"].doors.find((door) => door.id === "D-2F-003").visual.style, "wovenReliefWood");
assert.equal(migratedInteriorDoors.workspace.houseStructuresByFloor["2F"].doors.find((door) => door.id === "D-2F-008").width, 1600);
assert.equal(migratedInteriorDoors.workspace.houseStructuresByFloor["2F"].doors.find((door) => door.id === "D-2F-008").visual.leafCount, 2);

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
assert.equal(upgradedLight.confidence, "schemePositioned", "Legacy MEP points must default to scheme positioning, not construction confirmation.");
assert.ok(upgradedLight.positioningBasis, "Migrated MEP points must retain a positioning basis.");
assert.ok(Array.isArray(upgradedLight.pendingConfirmations) && upgradedLight.pendingConfirmations.includes("developerOriginalPoint"), "Migrated MEP points must record developer-drawing confirmation work.");

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

const legacyIndependentFlights = structuredClone(canonical);
legacyIndependentFlights.schemaVersion = 15;
legacyIndependentFlights.dataRevision = "2026-07-14-furniture-variants-v1";
delete legacyIndependentFlights.stairSystems;
delete legacyIndependentFlights.stairLandings;
delete legacyIndependentFlights.stairOpenings;
legacyIndependentFlights.cameraViews = legacyIndependentFlights.cameraViews.filter((view) => !view.id.startsWith("stair-view-"));
const legacyFlightIds = Object.values(legacyIndependentFlights.houseStructuresByFloor).flatMap((structure) => structure.stairs.map((stair) => stair.id));
for (const structure of Object.values(legacyIndependentFlights.houseStructuresByFloor)) {
  for (const stair of structure.stairs) {
    delete stair.stairSystemId;
    delete stair.flightRole;
    delete stair.connectedFromFloorId;
    delete stair.connectedToFloorId;
    delete stair.landingId;
  }
}
const legacyB2Flight = legacyIndependentFlights.houseStructuresByFloor.B2.stairs.find((stair) => stair.id === "ST-B2-001");
legacyB2Flight.stepCount = 14;
legacyB2Flight.height = 2800;
const legacy2FFlight = legacyIndependentFlights.houseStructuresByFloor["2F"].stairs.find((stair) => stair.id === "ST-2F-001");
legacy2FFlight.start.y = 3575;
legacy2FFlight.end.y = 3575;
legacy2FFlight.direction = "up";
legacy2FFlight.stepCount = 14;
legacy2FFlight.height = 2800;
const migratedStairSystems = applyWorkspaceMigrations(legacyIndependentFlights, { canonicalWorkspace: canonical });
const migratedFlightIds = Object.values(migratedStairSystems.workspace.houseStructuresByFloor).flatMap((structure) => structure.stairs.map((stair) => stair.id));
assert.deepEqual(migratedFlightIds, legacyFlightIds, "Stair migration must bind existing IDs without creating duplicate flights.");
assert.equal(migratedStairSystems.workspace.stairSystems.length, 3);
assert.equal(migratedStairSystems.workspace.stairLandings.length, 3);
assert.equal(migratedStairSystems.workspace.stairOpenings.length, 3);
assert.ok(Object.values(migratedStairSystems.workspace.houseStructuresByFloor).flatMap((structure) => structure.stairs).every((stair) => stair.stepCount === 10 && stair.height === 1400 && stair.stairSystemId && stair.landingId));
assert.equal(migratedStairSystems.workspace.houseStructuresByFloor["2F"].stairs[0].direction, "down");
assert.equal(migratedStairSystems.workspace.houseStructuresByFloor["2F"].stairs[0].start.y, 4625);
assert.equal(migratedStairSystems.workspace.cameraViews.filter((view) => view.id.startsWith("stair-view-")).length, 15, "Existing legacy camera collections must receive the stair inspection views.");
assert.equal(migratedStairSystems.sources.stairSystems, "migration");
assert.equal(migratedStairSystems.sources.stairLandings, "migration");
assert.equal(migratedStairSystems.sources.stairOpenings, "migration");

const legacyNearLivingLanding = structuredClone(canonical);
legacyNearLivingLanding.schemaVersion = 16;
legacyNearLivingLanding.dataRevision = "2026-07-14-stair-systems-v1";
for (const landing of legacyNearLivingLanding.stairLandings) {
  landing.polygon = [
    { x: 4146, y: 3050 },
    { x: 4146, y: 5150 },
    { x: 3096, y: 5150 },
    { x: 3096, y: 3050 }
  ];
  landing.centerLine = { start: { x: 4146, y: 3575 }, end: { x: 4146, y: 4625 } };
}
const migratedFarLanding = applyWorkspaceMigrations(legacyNearLivingLanding, { canonicalWorkspace: canonical });
assert.ok(migratedFarLanding.workspace.stairLandings.every((landing) => landing.centerLine.start.x === 950 && landing.centerLine.end.x === 950), "Schema 16 workspaces must move the half landing away from the living-room access side.");
assert.ok(migratedFarLanding.workspace.stairLandings.every((landing) => Math.max(...landing.polygon.map((point) => point.x)) === 2000), "Migrated landings must connect at the far ends of both runs.");
assert.equal(migratedFarLanding.sources.stairLandings, "migration");

const invalidCurrent = structuredClone(canonical);
delete invalidCurrent.floors;
assert.throws(
  () => applyWorkspaceMigrations(invalidCurrent, { canonicalWorkspace: canonical }),
  /Current workspace is missing floors/
);

console.log("Workspace migration checks passed.");
