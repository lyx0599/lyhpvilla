import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {resolve3DAsset} from '../lib/render3d-assets.ts';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url))),r=read('../public/model-releases/2026-11-16-r11-metadata-adapter.json'),model=read('../data/default-workspace.json');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(sha(fs.readFileSync(new URL('../data/default-workspace.json',import.meta.url))),r.productionModelSha256);
assert.equal(r.reviewedModelSha256,'5d30e26e861900bc1f31b92209aae70301cdb88ae397801959b8f12a66bbd75b');
const expected=['/furniture/110/render3d/variantId','/furniture/110/render3d/variationSeed','/drawingItems/70/relatedFurnitureId','/drawingItems/169/relatedFurnitureId'];
assert.deepEqual(r.changes.map(x=>x.path).sort(),expected.sort());
const reconstructed=structuredClone(model);
for(const change of r.changes){const keys=change.path.split('/').slice(1),key=keys.pop();let target=reconstructed;for(const k of keys)target=target[k];if(change.before?.absent)delete target[key];else target[key]=change.before;}
assert.equal(sha(JSON.stringify(canonical(reconstructed))),r.canonicalReviewedModelSha256,'All non-four-field content must match the reviewed baseline');
assert.deepEqual(resolve3DAsset(reconstructed.furniture[110]),resolve3DAsset(model.furniture[110]));
assert.equal(reconstructed.furniture[110].id,'furn-1f-mobile-tv-001');
console.log('R11 four-field publication metadata delta and unchanged resolved TV/material/seed verified.');
