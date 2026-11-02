import assert from 'node:assert/strict';
import { buildWallFinishTrim } from './wall-finish-trim.ts';
const p=(x:number,y:number)=>({x,y});
const r=[{startOffsetMm:350,endOffsetMm:2590,side:'right' as const,sourceObjectId:'cabinet',note:'localized'}];
const parts=buildWallFinishTrim(p(5383,350),p(5383,3300),p(5383,350),p(5383,3300),160,18,r);
assert.equal(parts.length,3);
assert.deepEqual(parts.map(s=>s.widthMm),[196,178,196]);
assert.equal(parts[1].start.x+parts[1].widthMm/2,5463); // flush east face
assert.equal(parts[1].start.x-parts[1].widthMm/2,5285); // opposite finish retained
assert.deepEqual(parts[0].start,p(5383,350));
const panel=buildWallFinishTrim(p(5383,350),p(5383,3300),p(5383,800),p(5383,1700),160,14,r);
assert.equal(panel.length,1);assert.equal(panel[0].widthMm,174);
const untouched=buildWallFinishTrim(p(0,0),p(1000,0),p(0,0),p(1000,0),220,18);
assert.equal(untouched[0].widthMm,256);assert.deepEqual(untouched[0].start,p(0,0));
console.log('localized finish: core retained, opposite face retained, opening panel clipped, untouched segment retained');
