import {useSyncExternalStore} from 'react';
export const b2FloorDoorIds=['D-B2-001','D-B2-STORAGE-001','D-B2-LW-N','D-B2-LW-S'] as const;
type State=Readonly<Record<string,number>>;
const empty:State=Object.freeze({});let state:State=empty;const listeners=new Set<()=>void>();
function subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function useB2DoorOperation(){return useSyncExternalStore(subscribe,()=>state,()=>empty);}
export function setB2DoorInspection(amount:number){if(!Number.isFinite(amount))return;const t=Math.max(0,Math.min(1,amount));state=Object.fromEntries(b2FloorDoorIds.map(id=>[id,t]));listeners.forEach(fn=>fn());}
