import { readHistoricalWorkspace } from "./read-historical-workspace.mjs";
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyWorkspaceMigrations} from '../lib/workspace-migrations.ts';
// Historical377 design regression, current5900 is covered separately.
const model=readHistoricalWorkspace();
const byId=id=>{const f=model.furniture.find(f=>f.id===id);assert.ok(f,id);return f;};
assert.match(model.defaultWorkspaceRevision,/^main-model-(?:four-items-mechanical-20261101-r10-m1|source-ratio-A-integrated-\d{8}-(?:r12|r15(?:-r16)?)-[\w-]+)$/);
const b2=model.furniture.filter(f=>f.floorId==='B2');assert.equal(b2.length,24);assert.equal(new Set(b2.map(f=>f.id)).size,24);
assert.ok(!b2.some(f=>f.id==='furn-b2-living-long-sofa-001'));
const sofa=byId('furn-b2-sofa-residence-four-reference-20261031-r7');assert.deepEqual(sofa.dimensions,{width:260,depth:108,height:85,unit:'cm'});assert.equal(sofa.position.rotation,180);assert.equal(sofa.render3d.variantId,'b2ResidenceFourReferenceR7');assert.match(sofa.material,/皮/);assert.match(sofa.note,/未|参考|推算/);
for(const [id,x,y]of[['furn-b2-living-tv-console-001',6100,670],['furn-b2-living-large-tv-001',6100,905],[sofa.id,6150,3500],['furn-b2-study-wine-cabinet-001',8500,7350],['furn-b2-activity-outdoor-pegboard-001',6000,7720]]){const f=byId(id);assert.ok(Math.abs(f.position.x*120-x)<1e-6);assert.ok(Math.abs(f.position.y*90-y)<1e-6);}
assert.equal(byId('furn-b2-study-slab-table-001').dimensions.width,240);assert.equal(byId('furn-b2-study-slab-table-001').dimensions.depth,90);
const chairs=b2.filter(f=>/^furn-b2-chair-/.test(f.id));assert.equal(chairs.length,6);for(const f of chairs){assert.equal(f.dimensions.width,55);assert.equal(f.dimensions.depth,40);}
assert.equal(chairs.filter(f=>!/^furn-b2-chair-(west|east)-2-/.test(f.id)).length,4);
assert.equal(b2.filter(f=>f.id==='furn-b2-bike-trainer-candidate-20261030').length,1,'same bicycle/trainer object has alternative states, not duplicated procurement');
assert.deepEqual(byId('furn-b2-fireplace-east-candidate-20261030').dimensions,{width:60,depth:60,height:100,unit:'cm'});
assert.equal(byId('furn-b2-entry-slim-foyer-cabinet-001').cabinetInterior,undefined,'stale1808 interior cannot survive1200 entry rack');
const door=model.houseStructuresByFloor.B2.doors.find(d=>d.id==='D-B2-STORAGE-001');assert.equal(door.positionOnWall,.6071428571428571);assert.equal(door.width,700);assert.equal(door.height,1250);
const lamp=model.drawingItems.find(d=>d.id==='L-B2-V1-04');assert.equal(lamp.relatedFurnitureId,sofa.id);assert.equal(lamp.generatedFingerprint,undefined);assert.deepEqual(lamp.positionMm,{x:6600,y:3800});assert.match(lamp.notes,/历史坐标/);
for(const input of[model,{...structuredClone(model),dataRevision:'2026-07-13-dimension-verification-shared-3d-v1'}]){const migrated=applyWorkspaceMigrations(input,{canonicalWorkspace:model}).workspace;for(const f of b2){const now=migrated.furniture.find(x=>x.id===f.id);assert.ok(now);assert.deepEqual(now.position,f.position);assert.deepEqual(now.dimensions,f.dimensions);}assert.ok(!migrated.furniture.some(f=>f.id==='furn-b2-living-long-sofa-001'));}
const render=await readFile(new URL('../components/b2-r7-design.tsx',import.meta.url),'utf8'),floor=await readFile(new URL('../components/floor-3d-view.tsx',import.meta.url),'utf8'),ui=await readFile(new URL('../components/model-preview.tsx',import.meta.url),'utf8');
assert.match(render,/diagnostics/);assert.match(render,/params\.get\('diagnostics'\)!=='1'/);assert.match(floor,/props\.b2ExplicitChairs \? \[\] : chairPositions/);assert.match(floor,/B2UnselectedIntentEnvelope/);assert.match(ui,/方案设计中，尺寸待核/);for(const text of['日常四椅','聚餐六椅','骑行使用','分件收存'])assert.ok(ui.includes(text));
console.log('B2 R7 adopted design:24 stable IDs,9-operation target geometry,new reference identity,4/6 chair states,same bike alternatives,gray intent,stale interior/cache cleanup,old/current migration preservation and diagnostics-off UI.');
