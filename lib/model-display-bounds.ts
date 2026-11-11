import type { HouseStructure, MmPoint } from '../types/space';
export type ModelDisplayBounds={x:number;y:number;width:number;height:number};
// Display/interaction extent is not the stored percent-to-mm coordinate system.
// Keep the old frame origin/width/height stable so existing owners do not drift.
export function getModelDisplayBounds(structure:HouseStructure,minimum:ModelDisplayBounds,padding=160):ModelDisplayBounds{
 let minX=minimum.x,minY=minimum.y,maxX=minimum.x+minimum.width,maxY=minimum.y+minimum.height;
 const point=(p:MmPoint,extent=0)=>{if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;minX=Math.min(minX,p.x-extent-padding);minY=Math.min(minY,p.y-extent-padding);maxX=Math.max(maxX,p.x+extent+padding);maxY=Math.max(maxY,p.y+extent+padding);};
 structure.rooms.forEach(r=>r.boundary.forEach(p=>point(p)));
 for(const rows of [structure.outdoors,structure.outdoorSurfaces])rows.forEach(r=>r.polygon.forEach(p=>point(p)));
 structure.walls.forEach(w=>{if(w.kind==='arc'){point(w.center,w.radius+w.thickness/2);}else{point(w.start,w.thickness/2);point(w.end,w.thickness/2);}});
 structure.stairs.forEach(s=>{point(s.start,s.width/2);point(s.end,s.width/2);});
 structure.fences.forEach(f=>{point(f.start,f.thickness/2);point(f.end,f.thickness/2);});
 structure.columns.forEach(c=>point(c.center,c.radius??0));
 structure.skylights.forEach(s=>point(s.center,Math.hypot(s.width,s.depth)/2));
 for(const b of structure.bayWindows){const w=structure.walls.find(w=>w.id===b.wallId);if(w?.kind!=='arc'&&w){point({x:w.start.x+(w.end.x-w.start.x)*b.positionOnWall,y:w.start.y+(w.end.y-w.start.y)*b.positionOnWall},b.width/2+b.depth);}}
 return{x:minX,y:minY,width:maxX-minX,height:maxY-minY};
}
export function getDisplayPercentBounds(structure:HouseStructure,bounds:ModelDisplayBounds){const c=structure.coordinateSystem;return{minX:(bounds.x-c.origin.x)/c.width*100,maxX:(bounds.x+bounds.width-c.origin.x)/c.width*100,minY:(bounds.y-c.origin.y)/c.height*100,maxY:(bounds.y+bounds.height-c.origin.y)/c.height*100};}
