import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createEmptyStructure } from "../lib/house-geometry.ts";
import { getDrawingItemGeneratedFingerprint } from "../lib/drawing-items.ts";
import { getWorkspaceValidationErrors } from "../lib/workspace-persistence.ts";
import {
  anchorFurnitureToWall,
  commitFurnitureSpaceAssignment,
  getFurnitureCenterMm,
  getRelatedDrawingItemSyncState,
  reconcileFurnitureWallAnchors,
  resolveFurnitureSpaceAssignment,
  syncRelatedDrawingItemsToFurniture
} from "../lib/furniture-placement.ts";

function room(id, minX, maxX) {
  return {
    id,
    floorId: "1F",
    roomNumber: id,
    name: id,
    geometryType: "polygon",
    boundary: [{ x: minX, y: 0 }, { x: maxX, y: 0 }, { x: maxX, y: 9000 }, { x: minX, y: 9000 }],
    area: (maxX - minX) * 9000,
    sourceWallIds: [],
    verificationMeta: { status: "drawing-derived", source: "developer-plan" }
  };
}

function furniture(overrides = {}) {
  return {
    id: "F-TEST",
    code: "FT-001",
    name: "测试柜体",
    type: "cabinet",
    floorId: "1F",
    roomId: "ROOM-A",
    dimensions: { width: 100, depth: 60, height: 90, unit: "cm" },
    material: "wood",
    note: "",
    position: { x: 25, y: 50, rotation: 0 },
    color: "#aaaaaa",
    ...overrides
  };
}

const structure = {
  ...createEmptyStructure("1F"),
  rooms: [room("ROOM-A", 0, 6000), room("ROOM-B", 6000, 12000)],
  walls: [{
    id: "W-TEST",
    floorId: "1F",
    name: "测试墙",
    kind: "straight",
    start: { x: 0, y: 1000 },
    end: { x: 12000, y: 1000 },
    thickness: 200,
    height: 2800,
    length: 12000,
    verificationMeta: { status: "drawing-derived", source: "developer-plan" }
  }]
};

const movedAcrossRooms = furniture({ position: { x: 75, y: 50, rotation: 0 } });
const assignment = resolveFurnitureSpaceAssignment(movedAcrossRooms, structure);
assert.equal(assignment.primarySpaceId, "ROOM-B");
assert.equal(commitFurnitureSpaceAssignment(movedAcrossRooms, structure).furniture.roomId, "ROOM-B", "Furniture roomId must update after crossing rooms.");

const lockedRoom = furniture({ position: { x: 75, y: 50, rotation: 0 }, roomAssignmentLocked: true });
assert.equal(commitFurnitureSpaceAssignment(lockedRoom, structure).furniture.roomId, "ROOM-A", "A manually locked roomId must not be overwritten.");

const spanning = furniture({ dimensions: { width: 200, depth: 60, height: 90, unit: "cm" }, position: { x: 50, y: 50, rotation: 0 } });
assert.equal(resolveFurnitureSpaceAssignment(spanning, structure).spanning, true, "Furniture crossing the room boundary must be reported.");

const outdoorStructure = {
  ...createEmptyStructure("YARD"),
  outdoors: [{ id: "OD-YARD-TEST", floorId: "YARD", name: "测试庭院", geometryType: "polygon", outdoorType: "patio", polygon: [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 9000 }, { x: 0, y: 9000 }], area: 108_000_000, verificationMeta: { status: "estimated", source: "visual-estimate" } }]
};
const outdoorFurniture = furniture({ floorId: "YARD", roomId: "OD-OLD" });
const committedOutdoor = commitFurnitureSpaceAssignment(outdoorFurniture, outdoorStructure).furniture;
assert.equal(committedOutdoor.roomId, "OD-YARD-TEST");
assert.equal(committedOutdoor.outdoorId, "OD-YARD-TEST");

const anchored = anchorFurnitureToWall(furniture(), structure, "W-TEST", { followWall: true, offsetMm: 50, side: "left" });
const anchoredCenter = getFurnitureCenterMm(anchored, structure);
const movedWallStructure = { ...structure, walls: structure.walls.map((wall) => ({ ...wall, start: { x: wall.start.x, y: wall.start.y + 1000 }, end: { x: wall.end.x, y: wall.end.y + 1000 } })) };
const followed = reconcileFurnitureWallAnchors(structure, movedWallStructure, [anchored]).furniture[0];
assert.equal(Math.round(getFurnitureCenterMm(followed, movedWallStructure).y - anchoredCenter.y), 1000, "Anchored furniture must follow wall movement.");

const splitStructure = { ...structure, walls: [{ ...structure.walls[0], id: "W-TEST-A", end: { x: 6000, y: 1000 }, length: 6000 }, { ...structure.walls[0], id: "W-TEST-B", start: { x: 6000, y: 1000 }, length: 6000 }] };
const splitResult = reconcileFurnitureWallAnchors(structure, splitStructure, [anchored]);
assert.equal(splitResult.furniture[0].hostWallId, "W-TEST", "Original host ID must be retained until rebind is confirmed.");
assert.equal(splitResult.furniture[0].wallAnchor.needsRebind, true);
assert.ok(splitResult.furniture[0].wallAnchor.suggestedWallId);
assert.equal(splitResult.warnings.length, 1);

const mergedStructure = { ...structure, walls: [{ ...structure.walls[0], id: "W-MERGED" }] };
assert.equal(reconcileFurnitureWallAnchors(structure, mergedStructure, [anchored]).furniture[0].wallAnchor.needsRebind, true, "Wall merge must require rebind confirmation.");
const deletedStructure = { ...structure, walls: [] };
const deletedResult = reconcileFurnitureWallAnchors(structure, deletedStructure, [anchored]);
assert.equal(deletedResult.furniture[0].wallAnchor.needsRebind, true, "Wall deletion must retain a visible rebind state.");
assert.equal(deletedResult.furniture[0].hostWallId, "W-TEST");

const originalFurniture = furniture();
const originalCenter = getFurnitureCenterMm(originalFurniture, structure);
const baseItem = {
  id: "DI-TEST",
  floorId: "1F",
  roomId: "ROOM-A",
  category: "socket",
  type: "power",
  positionMm: { x: originalCenter.x + 300, y: originalCenter.y },
  hostObjectId: null,
  hostWallId: null,
  relatedFurnitureId: originalFurniture.id,
  relatedFurniturePositionMm: originalCenter,
  heightMm: 300,
  circuitId: null,
  materialId: null,
  label: "测试插座",
  notes: "",
  source: "generated-from-furniture",
  status: "draft",
  quantity: 1,
  generatedKey: "F-TEST:socket:power",
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z"
};
baseItem.generatedFingerprint = getDrawingItemGeneratedFingerprint(baseItem);
const movedFurniture = furniture({ position: { x: 35, y: 50, rotation: 0 } });
const syncState = getRelatedDrawingItemSyncState(baseItem, movedFurniture, structure);
assert.equal(syncState.needsSync, true, "Furniture movement must flag linked points at the old location.");
assert.equal(syncState.canMoveWithFurniture, true);
const movedItems = syncRelatedDrawingItemsToFurniture([baseItem], movedFurniture, structure, { moveUntouchedGenerated: true });
assert.equal(movedItems[0].positionMm.x - baseItem.positionMm.x, 1200, "Untouched generated points may move with furniture when requested.");
assert.equal(getDrawingItemGeneratedFingerprint(movedItems[0]), movedItems[0].generatedFingerprint, "Moving an untouched generated point must retain its generated protection fingerprint.");

const manuallyAdjusted = { ...baseItem, positionMm: { x: baseItem.positionMm.x + 80, y: baseItem.positionMm.y } };
const protectedItems = syncRelatedDrawingItemsToFurniture([manuallyAdjusted], movedFurniture, structure, { moveUntouchedGenerated: true });
assert.deepEqual(protectedItems[0].positionMm, manuallyAdjusted.positionMm, "A manually adjusted point must never be overwritten by furniture movement.");

const snapshot = { furniture: [anchored], drawingItems: [baseItem] };
const roundTrip = JSON.parse(JSON.stringify(snapshot));
assert.deepEqual(roundTrip, snapshot, "Furniture placement and point linkage metadata must survive import/export.");
const changedSnapshot = { furniture: [followed], drawingItems: movedItems };
const undoState = structuredClone(snapshot);
const redoState = structuredClone(changedSnapshot);
assert.deepEqual(undoState, snapshot, "Undo snapshots must restore furniture position, room and wall anchor fields.");
assert.deepEqual(redoState, changedSnapshot, "Redo snapshots must restore furniture and linked point changes.");

const canonicalWorkspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
assert.equal(getWorkspaceValidationErrors(canonicalWorkspace).length, 0, "Current placement metadata must pass application import validation.");
const invalidImport = structuredClone(canonicalWorkspace);
invalidImport.furniture[0].wallAnchor = { positionOnWall: 2, offsetMm: -1, side: "outside", followWall: "yes" };
invalidImport.furniture[0].clearanceMeta = { serviceMm: -100 };
invalidImport.drawingItems[0].relatedFurniturePositionMm = { x: "invalid", y: 0 };
assert.ok(getWorkspaceValidationErrors(invalidImport).length >= 5, "Application import validation must reject malformed wall, clearance and linkage metadata.");

console.log("Furniture placement, wall anchoring and drawing-item synchronization checks passed.");
