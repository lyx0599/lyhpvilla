import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {resolve3DAsset} from '../lib/render3d-assets.ts';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const bytes=fs.readFileSync(process.argv[2]);const original=JSON.parse(bytes),production=structuredClone(original);
assert.equal(sha(bytes),'5d30e26e861900bc1f31b92209aae70301cdb88ae397801959b8f12a66bbd75b');
const tv=production.furniture.find(x=>x.id==='furn-1f-mobile-tv-001'),before=resolve3DAsset(tv);
assert.equal(tv.render3d.variantId,undefined);assert.equal(tv.render3d.variationSeed,undefined);
tv.render3d.variantId=before.variantId;tv.render3d.variationSeed=before.variationSeed;
assert.deepEqual(resolve3DAsset(tv),before,'Existing resolved asset/materials/seed must remain exactly identical');
for(const id of ['L-1F-V1-26','L-1F-V1-27']){const light=production.drawingItems.find(x=>x.id===id);assert.equal(light.relatedFurnitureId,'furn-living-fireplace-south-001');delete light.relatedFurnitureId;}
const changes=[];
function diff(a,b,p=''){
 if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[key],b[key],p+'/'+key);return;}
 if(a!==b)changes.push({path:p,before:a===undefined?{absent:true}:a,after:b===undefined?{absent:true}:b});
}
diff(original,production);assert.equal(changes.length,4);
const out=JSON.stringify(production,null,2)+'\n';fs.writeFileSync('data/default-workspace.json',out);
const record={reviewedModelSha256:sha(bytes),productionModelSha256:sha(out),reviewedRenderSourceSha256:'9fca55a72258452313aa00740d72601b4870ed454907a4652dbba2f07991e16a',canonicalReviewedModelSha256:sha(JSON.stringify(canonical(original))),resolvedTvBeforeAndAfterExactlyEqual:true,changes,scope:'Only missing schema metadata defaults and removed furniture optional references repaired. All other parsed fields exactly equal. Geometry/cameras/material resolution and action states unchanged. Reviewed artifact preserved separately.'};
fs.writeFileSync('public/model-releases/2026-11-16-r11-metadata-adapter.json',JSON.stringify(record,null,2)+'\n');
const identity=JSON.parse(fs.readFileSync('data/b1-reflow-identity.json'));
identity.reviewedModelFileSha256=identity.modelFileSha256;identity.modelFileSha256=record.productionModelSha256;identity.publicationMetadataAdapterRecord='model-releases/2026-11-16-r11-metadata-adapter.json';identity.scope+=' Publication model has only four schema/reference metadata repairs; reviewed model and source identities are preserved as provenance; publication source is bound separately.';fs.writeFileSync('data/b1-reflow-identity.json',JSON.stringify(identity,null,2)+'\n');
console.log(JSON.stringify(record));
