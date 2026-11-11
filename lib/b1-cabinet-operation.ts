'use client';
import {useSyncExternalStore} from 'react';
import contract from '../data/b1-r06.json';
export type B1CabinetOperationState={doorId:string|null;amount:number;bedAmount:number;bathDoorAmount:number;userTouched:boolean};
const initial:B1CabinetOperationState={doorId:null,amount:0,bedAmount:0,bathDoorAmount:0,userTouched:false};
let current=initial;
const subscribers=new Set<()=>void>();
const subscribe=(fn:()=>void)=>{subscribers.add(fn);return()=>{subscribers.delete(fn);};};
const snapshot=()=>current,serverSnapshot=()=>initial;
const unit=(v:number)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;
export function setB1CabinetOperation(patch:Partial<B1CabinetOperationState>){
  const next={...current,...patch,userTouched:true};
  if(next.doorId!==null&&!contract.doors.some(d=>d.id===next.doorId))throw new Error('Unknown B1 cabinet leaf');
  current={...next,amount:next.doorId===null?0:unit(next.amount),bedAmount:unit(next.bedAmount),bathDoorAmount:unit(next.bathDoorAmount)};
  subscribers.forEach(fn=>fn());
}
/** One production state permits one selected leaf; every other leaf stays closed. */
export function useB1CabinetOperation(){return useSyncExternalStore(subscribe,snapshot,serverSnapshot);}
