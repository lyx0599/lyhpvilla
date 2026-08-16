import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const modelSource = await readFile(new URL("../components/owner-communication-model.tsx", import.meta.url), "utf8");
const previewSource = await readFile(new URL("../app/preview/page.tsx", import.meta.url), "utf8");
const yardSource = await readFile(new URL("../components/yard-preview.tsx", import.meta.url), "utf8");

assert.match(modelSource, /OWNER COMMUNICATION MODEL · R1/);
assert.match(modelSource, /NOT FOR CONSTRUCTION/);
assert.match(modelSource, /FIELD_REMEASURE/);
assert.match(modelSource, /VENDOR/);
assert.match(modelSource, /PROFESSIONAL/);
assert.match(modelSource, /A\/A\/A/);
assert.match(modelSource, /data-floor-brief/);
assert.match(previewSource, /href="\/owner-communication"/);
assert.match(yardSource, /data-yard-source="canonical-default-workspace"/);
assert.match(yardSource, /data-yard-revision=\{canonicalRevision\}/);
assert.match(yardSource, /data-yard-data-sha=\{canonicalDataSha\}/);

console.log("Owner communication model and canonical YARD source checks passed");
