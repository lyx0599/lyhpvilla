import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Matrix4,Vector3} from 'three';
import {c03aDesignReferences,getC03ADesignTransform,hasC03ADesignContract} from '../lib/c03a-design-contract.ts';
import {applyWorkspaceMigrations} from '../lib/workspace-migrations.ts';
const model=JSON.parse(await readFile(new URL('../data/default-workspace.json',import.meta.url),'utf8'));
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function world(item,sourcePoint){
 const height=item.dimensions.height/100,t=getC03ADesignTransform(item,height),ref=t.reference;
 const p=new Vector3((sourcePoint[0]-ref.xMm)/1000,(sourcePoint[2]-ref.elevationMm)/1000-ref.heightMm/2000,(sourcePoint[1]-ref.yMm)/1000);
 const mat=new Matrix4().makeTranslation(item.position.x*.12-6,(item.render3d?.elevationMm??0)/1000+height/2+.035,item.position.y*.09-4.5)
  .multiply(new Matrix4().makeRotationY(-(item.position.rotation||0)*Math.PI/180)).multiply(new Matrix4().makeRotationY(t.rotationY)).multiply(new Matrix4().makeScale(...t.scale));
 return p.applyMatrix4(mat).toArray();
}
assert.equal(Object.keys(c03aDesignReferences).length,4);
const migrated=applyWorkspaceMigrations(model).workspace;
const oldVersion=structuredClone(model);oldVersion.dataRevision='2026-07-13-dimension-verification-shared-3d-v1';
const migratedOld=applyWorkspaceMigrations(oldVersion,{canonicalWorkspace:model}).workspace;
for(const [id,ref]of Object.entries(c03aDesignReferences)){
 const item=model.furniture.find(f=>f.id===id);assert.ok(item,id);assert.equal(item.dimensions.width*10,ref.widthMm);assert.equal(item.dimensions.depth*10,ref.depthMm);assert.equal(item.dimensions.height*10,ref.heightMm);
 near(item.position.x*120,ref.xMm);near(item.position.y*90,ref.yMm);assert.equal(item.position.rotation,ref.rotation);
 assert.equal(item.cabinetInterior,undefined,'old oversized interior must not survive '+id);
 assert.deepEqual(migrated.furniture.find(f=>f.id===id).position,item.position,'normal migration must not reset adopted layout');
 assert.deepEqual(migratedOld.furniture.find(f=>f.id===id).position,item.position,'old-version migration must not reset the adopted/newer north layout');
 const point=[ref.xMm+100,ref.yMm+150,ref.elevationMm+200],a=world(item,point);
 [point[0]/1000-6,point[2]/1000+.035,point[1]/1000-4.5].forEach((v,i)=>near(a[i],v));
 const moved=structuredClone(item);moved.position.x+=1;moved.position.y+=2;const b=world(moved,point);near(b[0]-a[0],.12);near(b[2]-a[2],.18);near(b[1],a[1]);
 const rotated=structuredClone(item);rotated.position.rotation+=90;const c=world(rotated,point);near(c[0],ref.xMm/1000-6-.15);near(c[2],ref.yMm/1000-4.5+.1);
 const resized=structuredClone(item);resized.dimensions.width*=1.1;resized.dimensions.depth*=1.2;resized.dimensions.height*=1.3;const d=world(resized,point);near(d[0],ref.xMm/1000-6+.1*(ref.rotation===90?1.2:1.1));near(d[2],ref.yMm/1000-4.5+.15*(ref.rotation===90?1.1:1.2));near(d[1],ref.elevationMm/1000+.2*1.3+.035);
}
assert.equal(hasC03ADesignContract('OUT-N-TAP'),false,'hidden research tap not a second rendered fixture');
assert.equal(hasC03ADesignContract('OUT-S-LAUNDRY'),false,'south yard outside adoption');
const cold=model.furniture.find(f=>f.id==='OUT-N-BBQ');near(cold.position.x*120,5601);near(cold.position.y*90,-1325);
const plumbing=model.drawingItems.find(d=>d.id==='MEP-OUT-N-KITCHEN-WATER');assert.deepEqual(plumbing.positionMm,{x:4250,y:-850});assert.deepEqual(plumbing.relatedFurniturePositionMm,{x:6480,y:-1224},'do not mark unverified old interface as reviewed');
assert.match(model.defaultWorkspaceRevision,/^main-model-(?:four-items-mechanical-20261101-r10-m1|source-ratio-A-integrated-\d{8}-r12-[\w-]+)$/);
assert.ok(model.furniture.some(f=>f.id==='furn-b2-sofa-residence-four-reference-20261031-r7'),'subsequent approved B2 adoption must not remove C03A');
for(const collection of ['outdoorSurfaces','outdoorZones'])for(const old of model.houseStructuresByFloor.YARD[collection].filter(o=>['OS-YARD-NORTH-PLANT','OS-YARD-NORTH-KITCHEN-DECK','OZ-NORTH-PLANT-001','OZ-NORTH-KITCHEN-001','OZ-NORTH-STORAGE-001'].includes(o.id)))assert.deepEqual(migratedOld.houseStructuresByFloor.YARD[collection].find(o=>o.id===old.id).polygon,old.polygon,'legacy migration must preserve the companion design polygon');
console.log('C03A adopted cold layout retained across B2 R7 adoption: four assets/native transforms/migrations, stale interiors removed, unchanged source MEP and no C03B.');
