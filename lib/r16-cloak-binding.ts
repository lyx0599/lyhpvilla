import cycles from '@/data/r16-cloak-cycles.json';
import contract from '@/data/r16-cloak-contract.json';
import type {Furniture} from '@/types/space';
export const r16Contract=contract;
export const r16Cycles=cycles;
export function r16ClosetMapping(item:Furniture,w:number,h:number,d:number){
 const layout=item.cabinetInterior!,panel=layout.panelThicknessMm/1000;
 const modules=layout.modules.map(m=>({...m,physicalPartRef:(m as typeof m&{physicalPartRef?:string}).physicalPartRef,widthM:m.width/1000,heightM:m.height/1000,depthM:m.depth/1000,xM:-w/2+panel+(m.x+m.width/2)/1000,yM:-h/2+panel+(m.y+m.height/2)/1000,zM:-d/2+panel+(m.z+m.depth/2)/1000}));
 return {count:4,panel,gap:.016,doorWidth:.540,doorHeight:2.420,frontZ:.261,hingeSides:contract.hinges,modules,sourceModuleIds:modules.map(m=>m.id)};
}
export function isR16Cloak(item:Furniture){return ['module-2f-cloak-left','module-2f-cloak-right'].includes(item.id)&&item.cabinetInterior?.doorCount===4&&item.render3d?.cabinetVisual?.doorCount===4;}
type Query={get:(name:string)=>string|null};
export function r16State(q:Query){
 const side=q.get('side')==='right'?'right':'left',mode=q.get('mode')??'closed';
 const cycle=cycles.find(c=>c.name===q.get('cycle'));const frame=cycle?Math.max(0,Math.min(cycle.states.length-1,Math.trunc(Number(q.get('frame')??0)||0))):0;
 const pose=cycle?.states[frame],activeSide=cycle?.side??side;
 const leaf=Math.max(0,Math.min(3,Math.trunc(Number(q.get('leaf')??0)||0))),angle=Math.max(0,Math.min(90,Number(q.get('angle')??90)||0));
 const angles=pose?.angles??Array.from({length:4},(_,i)=>mode==='single'&&i===leaf?angle:(mode==='pair'||mode==='drawer')&&i>=2?90:mode==='all'?90:0);
 const travel=pose?.travel??(mode==='drawer'?Math.max(0,Math.min(350,Number(q.get('travel')??350)||0)):0);
 return {side:activeSide,mode:cycle?'cycle':mode,angles,travel,lights:q.get('lights')!=='off',body:pose?.body??null,cycle:cycle?.name??null,frame,total:cycle?.states.length??0,stage:pose?.stage??mode};
}
