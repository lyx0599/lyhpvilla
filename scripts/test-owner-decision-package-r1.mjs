import fs from "node:fs";
import assert from "node:assert/strict";

const root = process.cwd();
const source = fs.readFileSync(`${root}/lib/owner-decision-package-r1.ts`, "utf8");
const artifact = JSON.parse(fs.readFileSync(`${root}/docs/artifacts/owner-decision-package-r1/OWNER_DECISION_PACKAGE_R1.json`, "utf8"));
const page = fs.readFileSync(`${root}/components/owner-decision-package-r1.tsx`, "utf8");
const route = fs.readFileSync(`${root}/app/owner-communication/decisions/page.tsx`, "utf8");
assert.equal(artifact.packageId, "OWNER_DECISION_PACKAGE_R1");
assert.equal(artifact.revision, "whole-house-lighting-cabinet-yard-integration-v1-20260812");
assert.equal(artifact.dataSha, "8790920b120e37b5fdd7515479caf1c28e478bd78823621434b14acfa18be831");
assert.equal(artifact.items.length, 22);
assert.equal(artifact.ownerDecisionRequiredCount, 2);
for (const item of artifact.items) {
  assert.match(source, new RegExp(`id: "${item.id}"`));
  assert.match(source, new RegExp(`status: "${item.status}"`));
  assert.ok(item.objectIds.length > 0, `${item.id} must have objectIds`);
}
assert.match(source, /minimalUserQuestions/);
assert.match(source, /defaultDeferredMeaning/);
assert.match(page, /data-testid="minimal-user-questions"/);
assert.match(page, /data-testid="decision-register"/);
assert.match(route, /OwnerDecisionPackageR1/);
assert.doesNotMatch(artifact.items.map((item) => item.objectIds).flat().join("|"), /L\/SW-22|L-SW-22|SW-YARD-V1-22/);
console.log(`owner decision package PASS: ${artifact.items.length} items, ${artifact.ownerDecisionRequiredCount} owner questions`);
