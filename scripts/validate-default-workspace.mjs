import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { formatWorkspaceIssues, validateWorkspaceDocument } from "./workspace-schema-validator.mjs";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));

function assertValid(value, label) {
  const issues = validateWorkspaceDocument(value);
  assert.equal(issues.length, 0, `${label}\n${formatWorkspaceIssues(issues)}`);
}

function assertInvalid(mutator, expectedPattern, label) {
  const broken = structuredClone(workspace);
  mutator(broken);
  const issues = validateWorkspaceDocument(broken);
  assert.ok(issues.length > 0, `${label} must fail validation.`);
  const output = formatWorkspaceIssues(issues);
  assert.match(output, expectedPattern, `${label} failed for the wrong reason:\n${output}`);
}

assertValid(workspace, "default-workspace.json must be valid");
assertInvalid((value) => { delete value.floors; }, /workspace\.floors/, "missing floors");
assertInvalid((value) => { value.semanticObjects[0].id = value.furniture[0].id; }, /duplicates/, "duplicate id");
assertInvalid((value) => { value.furniture[0].roomId = "ROOM-MISSING"; }, /roomId|ROOM-MISSING/, "orphan roomId");
assertInvalid((value) => { value.furniture[0].position.x = Number.NaN; }, /finite/, "NaN position");
assertInvalid((value) => { delete value.houseStructuresByFloor["1F"].walls[0].verificationMeta; }, /verificationMeta/, "missing verification metadata");
assertInvalid((value) => { value.houseStructuresByFloor["1F"].doors[0].verificationMeta.status = "approved"; }, /verificationMeta.*status/, "unsupported verification status");
assertInvalid((value) => { value.houseStructuresByFloor["1F"].windows[0].verificationMeta.toleranceMm = -1; }, /toleranceMm/, "negative verification tolerance");
assertInvalid((value) => { value.furniture[0].wallAnchor = { positionOnWall: 1.2, offsetMm: 0, side: "left", followWall: true }; }, /positionOnWall/, "wall anchor outside host range");
assertInvalid((value) => { value.furniture[0].wallAnchor = { positionOnWall: 0.5, offsetMm: 0, side: "outside", followWall: true }; }, /wallAnchor.*side/, "unsupported wall anchor side");
assertInvalid((value) => { value.furniture[0].clearanceMeta = { serviceMm: -10 }; }, /clearanceMeta.*serviceMm/, "negative service clearance");

const verificationCollections = ["walls", "doors", "windows", "bayWindows", "stairs", "columns", "rooms", "outdoors", "skylights", "partitions"];
const verificationObjects = Object.values(workspace.houseStructuresByFloor).flatMap((structure) => verificationCollections.flatMap((collection) => structure[collection]));
assert.ok(verificationObjects.length > 0);
assert.ok(verificationObjects.every((object) => object.verificationMeta));
assert.ok(verificationObjects.every((object) => object.verificationMeta.status !== "confirmed"), "Estimated default geometry must not be auto-confirmed.");
assert.ok(workspace.furniture.filter((item) => item.roomId.startsWith("OD-")).every((item) => item.outdoorId === item.roomId), "Outdoor furniture must explicitly retain outdoorId.");
assert.ok(workspace.drawingItems.filter((item) => item.relatedFurnitureId).every((item) => item.relatedFurniturePositionMm), "Linked drawing items must retain their furniture-position baseline.");
assert.equal(workspace.stairSystems.length, 3, "Every adjacent floor pair must have one stair system.");
assert.equal(workspace.stairLandings.length, 3, "Every stair system must have one explicit landing.");
assert.equal(workspace.stairOpenings.length, 3, "Every stair system must have one explicit opening.");
assert.ok(Object.values(workspace.houseStructuresByFloor).flatMap((structure) => structure.stairs).every((stair) => stair.stepCount === 10 && stair.height === 1400 && stair.stairSystemId && stair.landingId), "Every persisted stair flight must retain its 10-step system binding.");
assert.equal(workspace.cameraViews.filter((view) => view.id.startsWith("stair-view-")).length, 15, "Dedicated stair inspection views must remain available.");

console.log("default-workspace schema validation passed");
