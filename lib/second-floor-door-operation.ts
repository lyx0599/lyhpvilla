import {useSyncExternalStore} from 'react';
type DoorState=Readonly<Record<string,number>>;
const empty:DoorState=Object.freeze({});
let state:DoorState=empty;
const listeners=new Set<()=>void>();
const ids=['D-2F-003','D-2F-004','D-2F-006'];
export function setSecondFloorDoor(id:string,amount:number){
  if(!ids.includes(id)||!Number.isFinite(amount))return;
  state={...state,[id]:Math.max(0,Math.min(1,amount))};
  listeners.forEach(fn=>fn());
}
function subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function useSecondFloorDoorOperation(){return useSyncExternalStore(subscribe,()=>state,()=>empty);}
