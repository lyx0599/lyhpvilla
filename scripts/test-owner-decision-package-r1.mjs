import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "lib/owner-decision-package-r1.ts"), "utf8");
const page = fs.readFileSync(path.join(root, "components/owner-decision-package-r1.tsx"), "utf8");
const route = fs.readFileSync(path.join(root, "app/owner-communication/decisions/page.tsx"), "utf8");

assert.match(source, /packageId: "OWNER_DECISION_PACKAGE_R1"/);
assert.match(source, /revision: "whole-house-lighting-cabinet-yard-integration-v1-20260812"/);
assert.match(source, /dataSha: "8790920b120e37b5fdd7515479caf1c28e478bd78823621434b14acfa18be831"/);
assert.equal((source.match(/id: "(?:CONF|DEC|FIELD|VENDOR|PRO|BLOCK)-[^"\n]+"/g) ?? []).length, 22, "decision register must retain 22 records");
assert.equal((source.match(/status: "OWNER_DECISION_REQUIRED"/g) ?? []).length, 2, "decision register must retain two owner questions");
assert.match(source, /minimalUserQuestions/);
assert.match(source, /defaultDeferredMeaning/);
assert.match(page, /data-testid="minimal-user-questions"/);
assert.match(page, /data-testid="decision-register"/);
assert.match(route, /OwnerDecisionPackageR1/);
assert.match(page, /min-h-11/);
assert.match(page, /items-center/);
assert.doesNotMatch(source, /objectIds: \[[^\]]*(?:L\/SW-22|L-SW-22|SW-YARD-V1-22)/);
for (const match of source.matchAll(/sourcePaths:\s*\[([^\]]*)\]/g)) {
  for (const sourcePath of match[1].matchAll(/"([^"]+)"/g)) {
    assert.ok(fs.existsSync(path.join(root, sourcePath[1])), `decision sourcePath missing: ${sourcePath[1]}`);
  }
}
console.log("owner decision package PASS: 22 records, two owner questions, 44px CTA, sourcePaths closed, canonical revision/data SHA bound");
