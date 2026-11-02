import assert from 'node:assert/strict';
import fs from 'node:fs';
import {r09ClosetMapping} from '../lib/r09-closet-mapping.ts';
const model=JSON.parse(fs.readFileSync(new URL('../data/default-workspace.json',import.meta.url)));
const table=model.furniture.find(f=>f.id==='module-1f-table-001');
assert.equal(table.dimensions.width,135);assert.equal(table.dimensions.depth,135);
assert.equal(table.render3d.closedDiameterCm,135);
const long=model.furniture.find(f=>f.id==='furn-1f-independent-long-table-r05');
assert.equal(long.dimensions.width,229.8);assert.equal(long.dimensions.depth,55);assert.equal(long.dimensions.height,75);
for(const id of ['module-2f-cloak-left','module-2f-cloak-right']){
 const f=model.furniture.find(f=>f.id===id), m=r09ClosetMapping(f,2.24,2.47,.6);
 assert.equal(m.count,3);assert.equal(f.render3d.cabinetVisual.bays.length,3);
 assert.equal(f.render3d.cabinetVisual.leafCount,3);assert.equal(m.innerWidthMm,2204);assert.equal(m.innerHeightMm,2434);
 assert.equal(m.scaleX,1);assert.equal(m.scaleY,1);assert.equal(m.modules.length,12);
 const hangs=m.modules.filter(m=>m.kind==='hanging');
 assert.deepEqual(hangs.map(m=>Math.round((m.yM+m.heightM/2+2.47/2)*1000)).sort((a,b)=>a-b),[1000,2000,2000]);
 assert.deepEqual(hangs.map(m=>Math.round(m.heightM*1000)).sort((a,b)=>a-b),[930,930,1750]);
 for(const p of m.modules)assert(p.x>=0&&p.y>=0&&p.x+p.width<=2204+1e-6&&p.y+p.height<=2434+1e-6,p.id);
 assert.equal(m.modules.filter(m=>m.physicalPartRef).length,1);
 const drawer=m.modules.find(m=>m.kind==='drawer');assert.equal(drawer.width,650);assert.equal(drawer.depth,510);
}
console.log('PASS four-items mechanical dimensions, three-leaf mapping, 24 identities, functional rods and module bounds; NOT final layout/operations approval');
