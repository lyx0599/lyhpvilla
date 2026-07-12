import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { repairWorkspaceReferences, renameWorkspaceObjectId, validateWorkspaceReferences } from "../lib/workspace-reference-validator.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const currentReport = validateWorkspaceReferences(workspace);
assert.equal(currentReport.errors.length, 0, JSON.stringify(currentReport.errors, null, 2));
assert.equal(currentReport.warnings.length, 0, JSON.stringify(currentReport.warnings, null, 2));

const broken = structuredClone(workspace);
broken.drawingItems.push({
  id: "DI-TEST-001", floorId: "1F", roomId: "ROOM-MISSING", category: "socket", type: "five-hole",
  positionMm: { x: 1000, y: 1000 }, hostObjectId: null, hostWallId: "W-MISSING", relatedFurnitureId: "furn-missing",
  heightMm: 300, circuitId: null, materialId: null, label: "测试插座", notes: "", source: "manual", status: "draft",
  quantity: 1, createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z"
});
broken.drawingPackage.drawingItemIds.push("DI-MISSING");
broken.furniture.find((item) => item.id === "furn-plant-001").roomId = "room-yard";
broken.houseStructuresByFloor.B2.walls = broken.houseStructuresByFloor.B2.walls.filter((wall) => wall.id !== "W-B2-009");
broken.semanticObjects.find((item) => item.id === "R-B1-LAUNDRY").details.structureRoomId = "ROOM-MISSING";
const brokenReport = validateWorkspaceReferences(broken);
assert.ok(brokenReport.errors.some((issue) => issue.code === "ORPHAN_FURNITURE_ROOM"));
assert.ok(brokenReport.errors.some((issue) => issue.code === "ORPHAN_SOURCE_WALL"));
assert.ok(brokenReport.errors.some((issue) => issue.code === "ORPHAN_SEMANTIC_ROOM"));
assert.ok(brokenReport.errors.some((issue) => issue.code === "ORPHAN_DRAWING_ITEM_ROOMID"));
assert.ok(brokenReport.errors.some((issue) => issue.code === "ORPHAN_DRAWING_ITEM_HOSTWALLID"));
assert.ok(brokenReport.errors.some((issue) => issue.code === "ORPHAN_DRAWING_ITEM_RELATEDFURNITUREID"));
assert.ok(brokenReport.errors.some((issue) => issue.code === "ORPHAN_DRAWING_PACKAGE_ITEM"));

const repaired = repairWorkspaceReferences(broken);
assert.equal(repaired.workspace.furniture.find((item) => item.id === "furn-plant-001").roomId, "OD-YARD-001");
assert.equal(repairWorkspaceReferences(repaired.workspace).repairs.length, 0, "repair must be idempotent");

const renamed = renameWorkspaceObjectId(workspace, "W-B2-009", "W-B2-009-RENAMED");
assert.ok(renamed.updatedPaths.length >= 3);
assert.equal(validateWorkspaceReferences(renamed.workspace).errors.length, 0);

console.log("workspace reference validation tests passed");
