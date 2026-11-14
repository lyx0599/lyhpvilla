"use client";
import {useSearchParams} from 'next/navigation';
import type {Furniture} from '@/types/space';
import {B2SpaceFurniture,B2NorthStorageDoor} from './B2SpaceFurniture';
import source from './B2_EXPLICIT_ASSETS.json';
type Operation='castle'|'wine'|'fridge'|'drawer';
export function B2R08Furniture({item,position,openAmount=0,onSelect,onHover,onClearHover}:{item:Furniture;position:{x:number;z:number};openAmount?:number;onSelect?:(part:string)=>void;onHover?:()=>void;onClearHover?:()=>void}){
 const query=useSearchParams(),chosen=query.get('b2Op');
 const owner=(source.owners as unknown as Record<string,{operations:Record<string,unknown>}>)[item.id];
 const active=chosen&&chosen in owner.operations;
 const amount=chosen?active?1:0:openAmount;
 return <B2SpaceFurniture ownerId={item.id} position={position} rotationDeg={item.position.rotation||0} operation={active?chosen as Operation:undefined} openAmount={amount} onSelect={onSelect} onHover={onHover} onClearHover={onClearHover}/>;
}
export function B2R08NorthDoor({pivotScene,openAmount=0,onSelect}:{pivotScene:{x:number;z:number};openAmount?:number;onSelect?:()=>void}){
 const query=useSearchParams(),chosen=query.get('b2Op');
 return <group userData={{auditEntityId:'D-B2-NSTORE-R4',auditKind:'door'}}><B2NorthStorageDoor pivotScene={pivotScene} openAmount={chosen?chosen==='north'?1:0:openAmount} onSelect={onSelect}/></group>;
}
