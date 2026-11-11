import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {PerspectiveCamera,Vector3} from 'three';
import {applyWorkspaceMigrations} from '../lib/workspace-migrations.ts';
import {validateWorkspaceReferences} from '../lib/workspace-reference-validator.ts';
import {validateStairSystems,getStairSystemGeometryFingerprint} from '../lib/stair-systems.ts';
import {buildModelInspectionCameras} from '../lib/model-inspection-cameras.ts';
import {getModelDisplayBounds,getDisplayPercentBounds} from '../lib/model-display-bounds.ts';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const bytes=fs.readFileSync(new URL('../data/default-workspace.json',import.meta.url)),m=JSON.parse(bytes);
assert.match(m.defaultWorkspaceRevision,/four-floor/);
const binding=read('../public/model-releases/2026-11-11-four-floor-candidate.json');
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),binding.modelSha256);
assert.deepEqual(applyWorkspaceMigrations(m).workspace,m,'Loading current reviewed data must preserve absent MEP placement rules');
const refs=validateWorkspaceReferences(m);assert.deepEqual(refs.errors,[]);assert.deepEqual(refs.warnings,[]);
const brand=structuredClone(m);brand.furniture[0].note='Duravit D-Neo073940400x220; D-Neo model';assert.deepEqual(validateWorkspaceReferences(brand).warnings,[]);brand.furniture[0].note+=' D-2F-MISSING-999';assert.ok(validateWorkspaceReferences(brand).warnings.some(x=>x.value==='D-2F-MISSING-999'),'Missing real door IDs still warn');
assert.equal(m.furniture.length,102);assert.equal(new Set(m.furniture.map(x=>x.id)).size,102);
const byId=id=>{const f=m.furniture.find(x=>x.id===id);assert.ok(f,id);return f;};
const vertical=m.houseStructuresByFloor['1F'].walls.filter(x=>x.kind==='straight'&&Math.abs(x.start.x-x.end.x)<.001),east=vertical.find(x=>Math.abs(x.start.x-10264.057)<.001),divider=vertical.find(x=>Math.abs(x.start.x-4144.057)<.001);assert.ok(east&&divider);assert.ok(Math.abs(east.start.x-east.thickness/2-divider.start.x-divider.thickness/2-5900)<.001);
assert.equal(m.stairSystems.length,3);
for(const sys of m.stairSystems){assert.equal(sys.floorToFloorHeightMm,2800);assert.equal(sys.totalStepCount,20);const flights=Object.values(m.houseStructuresByFloor).flatMap(x=>x.stairs).filter(x=>[sys.lowerFlightId,sys.upperFlightId].includes(x.id));assert.equal(flights.length,2);for(const f of flights){assert.equal(f.height,1400);assert.equal(f.stepCount,10);assert.ok(Math.abs(f.width-1065.974)<.001);assert.ok(Math.abs(f.start.x-4097.429)<.001);assert.ok(Math.abs(f.end.x-950)<.001);}assert.equal(sys.lighting.geometryFingerprint,getStairSystemGeometryFingerprint(sys,m.houseStructuresByFloor));assert.equal(sys.lighting.syncStatus,'pending-review');}
const sw=validateStairSystems({structuresByFloor:m.houseStructuresByFloor,stairSystems:m.stairSystems,stairLandings:m.stairLandings,stairOpenings:m.stairOpenings});assert.equal(sw.length,3);assert.ok(sw.every(x=>x.code==='LIGHTING_RESYNC_REQUIRED'),'Only explicitly pending physical stair lighting warnings remain');
for(const floor of ['B2','B1','1F','2F','YARD']){const s=m.houseStructuresByFloor[floor];assert.equal(s.coordinateSystem.width,12000);assert.equal(s.coordinateSystem.height,9000);const b=getModelDisplayBounds(s,{x:0,y:0,width:12000,height:9000});for(const p of [...s.rooms.flatMap(r=>r.boundary),...s.outdoors.flatMap(r=>r.polygon)])assert.ok(p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height);if(floor==='2F')assert.ok(getDisplayPercentBounds(s,b).maxY>100);
for(const viewport of [{width:958,height:439},{width:390,height:600}]){const views=buildModelInspectionCameras(floor,s,viewport,m.furniture.filter(x=>x.floorId===floor));assert.ok(views.length>=2);for(const v of views){assert.equal(v.fov,42);assert.match(v.description,/虚拟检查相机/);assert.ok(Object.values(v.cameraPosition).every(Number.isFinite));}if(floor==='2F'){const v=views.find(x=>x.id==='current-2F-plan'),c=new PerspectiveCamera(v.fov,viewport.width/viewport.height,.1,80);c.position.set(v.cameraPosition.x,v.cameraPosition.y,v.cameraPosition.z);c.lookAt(v.target.x,v.target.y,v.target.z);c.updateMatrixWorld();for(const p of s.outdoors.flatMap(x=>x.polygon)){const q=new Vector3((p.x-6000)/1000,0,(p.y-4500)/1000).project(c);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1&&q.z>-1&&q.z<1,'Both2F balconies inside actualH/V frustum');}}}}
const b2=m.furniture.filter(x=>x.floorId==='B2');assert.equal(b2.length,22);assert.equal(b2.filter(x=>x.render3d?.variantId==='b2SourceChairDesign').length,4);assert.deepEqual(byId('furn-b2-study-slab-table-001').dimensions,{width:200,depth:90,height:75,unit:'cm'});assert.equal(byId('furn-b2-study-handwash-001').dimensions.width,127);assert.equal(byId('furn-b2-study-handwash-001').render3d.variantId,'b2-west-layout-r2');assert.equal(byId('furn-b2-under-stair-shelf-003').roomId,'ROOM-B2-005');
const pending=m.drawingItems.filter(x=>x.status==='todo'&&x.confidence==='requirementConfirmed');assert.ok(pending.length>=35);assert.ok(pending.some(x=>x.floorId==='B2'));assert.ok(pending.some(x=>x.floorId==='1F'));
for(const d of m.houseStructuresByFloor.B1.skylights){assert.notEqual(d.verificationMeta.status,'confirmed');assert.equal(d.width,800);assert.equal(d.depth,560);}
const historic=read('../public/model-releases/2026-11-11-historical-camera-scopes.json');assert.ok(JSON.stringify(historic).includes('533'));assert.ok(JSON.stringify(historic).includes('775'));
console.log('Current5900 model binding/migration/references/net/stairs/currentB2/MEP/2Dextent and desktop+portrait2F balcony H/V framing passed. Independent native/use review scopes remain separate.');
