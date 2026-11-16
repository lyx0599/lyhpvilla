import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {applyWorkspaceMigrations} from '../lib/workspace-migrations.ts';
import {validateWorkspaceReferences} from '../lib/workspace-reference-validator.ts';
const bytes=fs.readFileSync(new URL('../data/default-workspace.json',import.meta.url)),model=JSON.parse(bytes);
const binding=JSON.parse(fs.readFileSync(new URL('../public/model-releases/2026-11-16-r11-publication.json',import.meta.url)));
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'f499eea10c268abce76be40fc2212341615e4f646f92c6c5c442179f95b6a6c2');
assert.equal(binding.modelSha256,crypto.createHash('sha256').update(bytes).digest('hex'));
assert.deepEqual(applyWorkspaceMigrations(model).workspace,model,'Current frozen model must load unchanged; no legacy migration injects old stairs or furniture');
assert.deepEqual(validateWorkspaceReferences(model).errors,[]);
assert.equal(binding.reviewedRenderSourceSha256,'9fca55a72258452313aa00740d72601b4870ed454907a4652dbba2f07991e16a');
process.env.R11_RELEASE_VALIDATE_ONLY='1';
await import('./write-r11-release-manifest.mjs');
console.log('R11 exact frozen model, unchanged migration, references and separately declared publication adapters verified. Native passage/interface conclusions retain independent bounded scopes.');

await import('./test-current-native-plan.mjs');

await import('./test-r11-metadata-adapter.mjs');
