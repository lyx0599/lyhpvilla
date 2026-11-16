import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const model=read('../data/default-workspace.json'),outlines=read('../data/current-furniture-plan-outlines.json'),plans=read('../public/model-plans/r11/manifest.json');
assert.equal(outlines.modelSha256,plans.modelSha256);
let checked=0,maxErrorMm=0;
for(const f of plans.files.filter(x=>x.state!=='expanded')){
 const svg=fs.readFileSync(new URL('../public/model-plans/r11/'+f.file,import.meta.url),'utf8');
 for(const id of f.metadata.furnitureOwners){
  const item=model.furniture.find(x=>x.id===id),o=outlines.items[id];assert.ok(item&&o,id);
  assert.deepEqual(o.originalPosition,item.position);assert.deepEqual(o.originalDimensions,item.dimensions);
  const element=[...svg.matchAll(/<path\b[^>]*>/g)].map(x=>x[0]).find(x=>x.includes('data-owner-id="'+id+'"'));assert.ok(element,id);
  const raw=element.match(/\bd="([^"]+)"/)[1],numbers=s=>s.match(/-?\d+(?:\.\d+)?/g).map(Number),a=numbers(raw),b=numbers(o.normalizedPath);
  assert.equal(a.length,b.length,id);const theta=(item.position.rotation||0)*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);
  for(let i=0;i<a.length;i+=2){const x=(b[i]-50)/100*item.dimensions.width*10,y=(b[i+1]-50)/100*item.dimensions.depth*10;const dx=item.position.x*120+x*c-y*s-a[i],dy=item.position.y*90+x*s+y*c-a[i+1];maxErrorMm=Math.max(maxErrorMm,Math.hypot(dx,dy));assert.ok(Math.hypot(dx,dy)<.05,id+' native projection roundtrip');}
  checked++;
 }
}
const table=outlines.items['module-1f-table-001'];assert.ok(table.normalizedPath.includes('M'));
assert.equal(checked,78);console.log(JSON.stringify({actualFurnitureOwnersRoundtripped:checked,maxErrorMm,chairsRetained:plans.files.filter(x=>x.floor==='1F').every(x=>x.metadata.chairIds.length===6)}));
