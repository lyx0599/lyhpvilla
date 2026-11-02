import cycles from '@/data/r11-c1-cycles.json';
import binding from '@/data/r11-c1-binding.json';
import type {Furniture} from '@/types/space';
export function r11CycleState(side:string|null,index:number){
 const cycle=cycles.cycles.find(c=>c.side===side);if(!cycle)return null;
 const frame=Number.isFinite(index)?Math.max(0,Math.min(cycle.states.length-1,Math.trunc(index))):0;
 return {side:cycle.side,leaf:cycle.leaf,frame,total:cycle.states.length,...cycle.states[frame]};
}
export function r11CycleCabinetMatches(item:Furniture){
 const side=item.id==='module-2f-cloak-left'?'left':item.id==='module-2f-cloak-right'?'right':null;if(!side)return false;
 const c=binding.closet,p=c.globalCenters[side],d=c.cabinetMm;
 return Math.abs(item.position.x*120-p[0])<1e-6&&Math.abs(item.position.y*90-p[1])<1e-6&&item.position.rotation===c.rotationDegrees[side]&&Math.abs(item.dimensions.width*10-d[0])<1e-6&&Math.abs(item.dimensions.depth*10-d[1])<1e-6&&Math.abs(item.dimensions.height*10-d[2])<1e-6;
}
export const r11CycleSource=binding;
