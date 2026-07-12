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

console.log("default-workspace schema validation passed");
