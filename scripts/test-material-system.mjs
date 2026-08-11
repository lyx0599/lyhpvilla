import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  getMaterialResolution,
  getPbrMaterialDefinition,
  materialIndexRows,
  pbrMaterialCatalog,
  resolveMaterialUvTransform,
  resolvePbrMaterialToken,
  modernNaturalRoleTokens
} from "../lib/material-system.ts";

const tokens = Object.keys(pbrMaterialCatalog);
assert.equal(new Set(tokens).size, tokens.length, "canonical token ids must be unique");
for (const token of tokens) {
  const { definition } = getPbrMaterialDefinition(token);
  assert.ok(definition.label && definition.source.license, `${token} needs identity and license`);
  assert.ok(definition.physicalSizeMm[0] > 0 && definition.physicalSizeMm[1] > 0, `${token} needs real dimensions`);
  assert.ok(definition.channels.baseColor, `${token} needs a base-color channel`);
  assert.ok(definition.quality.standard.desktop >= definition.quality.standard.mobile, `${token} mobile tier should not exceed desktop`);
  assert.ok(definition.quality.presentation.desktop >= definition.quality.draft.desktop, `${token} presentation tier should be the highest quality`);
}
for (const [role, token] of Object.entries(modernNaturalRoleTokens)) {
  assert.ok(tokens.includes(token), `${role} must resolve to a canonical token`);
}
assert.equal(resolvePbrMaterialToken("showroomWarmOakVertical"), "warmOak");
assert.equal(resolvePbrMaterialToken("showroomBoucleCream2F"), "beigeFabric");
assert.equal(resolvePbrMaterialToken("bathroom tile"), "wetAreaTile");
assert.equal(resolvePbrMaterialToken("courtyard paving"), "courtyardStone");
assert.equal(getPbrMaterialDefinition("warmOak").definition.baseColor, "#b99570");
assert.equal(getPbrMaterialDefinition("warmOak").definition.normalStrength, 0.10);
assert.equal(getPbrMaterialDefinition("warmOak").definition.roughness, 0.70);
assert.equal(getPbrMaterialDefinition("travertine").definition.baseColor, "#ded2bd");
assert.equal(getPbrMaterialDefinition("travertine").definition.normalStrength, 0.14);
assert.equal(getPbrMaterialDefinition("travertine").definition.roughness, 0.46);
assert.equal(new Set(materialIndexRows.map(({ code }) => code)).size, materialIndexRows.length, "2D index ids must be unique");
const oakRepeat = resolveMaterialUvTransform("oakFloor", [4.2, 0.9]);
assert.ok(Math.max(...oakRepeat.repeat) > 1 && oakRepeat.rotation !== 0, "UV repeat and direction should use real surface dimensions");
assert.ok(getMaterialResolution("oakFloor", "presentation", "desktop") >= getMaterialResolution("oakFloor", "draft", "mobile"));
const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
assert.equal(workspace.schemaVersion, 19, "default workspace should use the unified material schema revision");
const formalPbrSource = await readFile(new URL("../components/scene-3d/pbr-material.tsx", import.meta.url), "utf8");
assert.equal(formalPbrSource.includes("bumpMap: maps?.bumpMap"), false, "formal PbrMaterial must not attach synthesized Height");
const auditPageSource = await readFile(new URL("../app/pbr-audit/page.tsx", import.meta.url), "utf8");
for (const mode of ["height-a", "height-b", "height-c"]) assert.ok(auditPageSource.includes(mode), `${mode} must remain isolated to the audit page`);
console.log(`material-system checks passed (${tokens.length} canonical tokens)`);
