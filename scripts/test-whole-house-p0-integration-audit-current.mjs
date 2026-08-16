import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";

const root = process.cwd();
const dataPath = `${root}/data/default-workspace.json`;
const reportPath = `${root}/docs/whole-house-audits/whole-house-P0-integration-audit-2026-08-12.md`;
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const workspace = data.workspace ?? data;
const report = fs.readFileSync(reportPath, "utf8");
const sha = crypto.createHash("sha256").update(fs.readFileSync(dataPath)).digest("hex");

assert.equal(sha, "8790920b120e37b5fdd7515479caf1c28e478bd78823621434b14acfa18be831");
assert.match(report, /当前复审修正（2026-08-16）/);
assert.match(report, /2026-08-12 历史快照/);
assert.match(report, /app\/yard-preview\/page\.tsx/);
assert.match(report, /25 个 `cabinetInterior`/);
assert.match(report, /仍 BLOCKED/);
assert.ok((workspace.furniture ?? []).filter((item) => item.cabinetInterior).length > 0);
assert.ok((workspace.lightingDesign?.scenes ?? []).length > 0);
for (const file of [
  "app/preview/page.tsx",
  "app/yard-preview/page.tsx",
  "app/owner-communication/page.tsx",
  "components/yard-preview.tsx",
  "components/owner-communication-model.tsx"
]) assert.ok(fs.existsSync(`${root}/${file}`), `${file} must exist in current baseline`);
console.log(`current whole-house P0 audit baseline PASS: data SHA ${sha}, furniture ${workspace.furniture?.length}, cabinetInterior ${(workspace.furniture ?? []).filter((item) => item.cabinetInterior).length}, scenes ${workspace.lightingDesign?.scenes?.length}`);
