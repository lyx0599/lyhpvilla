"use client";
import {useMemo} from 'react';
import {useSearchParams} from 'next/navigation';
import * as THREE from 'three';
import source from '@/data/r14-geometry.json';
import type {FurnitureFamily3DProps} from './types';
type P={id:string;owner:string;shape:string;centerMm?:number[];sizeMm?:number[];angleDeg?:number;material:string;movingGroup?:string;polygonMm?:number[][];bottomMm?:number;heightMm?:number;radiusBottomMm?:number;radiusTopMm?:number};
type Op={kind:string;pivotMm?:number[];openDeg?:number;openDeltaMm?:number[]};
export const approvedR14Role=(item:FurnitureFamily3DProps['item'])=>{
 const role=Object.entries(source.ownerIds).find(([,id])=>id===item.id)?.[0],binding=(item.render3d as {geometryContractId?:string}|undefined)?.geometryContractId;
 return role==='tall'?binding==='R08-R14-native-tall-D005-clear':!!role&&binding===`R14-native-${role}`;
};
function R14Mesh({part:p,baseX,baseY,floorY,op,value}:{part:P;baseX:number;baseY:number;floorY:number;op?:Op;value:number}){
 let c=p.centerMm?[...p.centerMm]:[0,0,0],angle=p.angleDeg??0;
 if(op?.kind==='rotate'&&op.pivotMm){const a=(op.openDeg??0)*value*Math.PI/180,x=c[0]-op.pivotMm[0],y=c[1]-op.pivotMm[1];c[0]=op.pivotMm[0]+x*Math.cos(a)-y*Math.sin(a);c[1]=op.pivotMm[1]+x*Math.sin(a)+y*Math.cos(a);angle+=(op.openDeg??0)*value;}
 if(op?.kind==='translate'&&op.openDeltaMm){c[0]+=op.openDeltaMm[0]*value;c[1]+=op.openDeltaMm[1]*value;}
 const material=(source.materials as Record<string,{color:string;metalness:number;roughness:number;opacity?:number;emissive?:string;emissiveIntensity?:number}>)[p.material];
 const shape=useMemo(()=>{const s=new THREE.Shape();p.polygonMm?.forEach(([x,y],i)=>{if(i===0)s.moveTo((x-baseX)/1000,-(y-baseY)/1000);else s.lineTo((x-baseX)/1000,-(y-baseY)/1000);});if(p.polygonMm?.length)s.closePath();return s;},[p.polygonMm,baseX,baseY]);
 const data={auditEntityId:p.id,auditKind:'r14-part',auditPart:p.shape,r14Owner:p.owner,r14Material:p.material,operation:p.movingGroup??null,operationFraction:value};
 if(p.shape==='extruded-plan')return <mesh name={p.id} userData={data} position={[0,floorY+(p.bottomMm??0)/1000,0]} rotation={[-Math.PI/2,0,0]} castShadow receiveShadow><extrudeGeometry args={[shape,{depth:(p.heightMm??20)/1000,bevelEnabled:false}]}/><meshStandardMaterial {...material}/></mesh>;
 return <mesh name={p.id} userData={data} position={[(c[0]-baseX)/1000,floorY+c[2]/1000,(c[1]-baseY)/1000]} rotation={[0,-angle*Math.PI/180,0]} castShadow receiveShadow>
  {p.shape==='cylinder'?<cylinderGeometry args={[(p.radiusTopMm??10)/1000,(p.radiusBottomMm??10)/1000,(p.heightMm??10)/1000,48]}/>:<boxGeometry args={[(p.sizeMm?.[0]??1)/1000,(p.sizeMm?.[2]??1)/1000,(p.sizeMm?.[1]??1)/1000]}/>}
  <meshStandardMaterial {...material} transparent={(material.opacity??1)<1} depthWrite/>
 </mesh>;
}
export function R14ApprovedSubset(props:FurnitureFamily3DProps){
 const q=useSearchParams(),state=q.get('r14')??'closed',fraction=Math.max(0,Math.min(1,Number(q.get('r14t')??1))),{item,height}=props;
 const role=Object.entries(source.ownerIds).find(([,id])=>id===item.id)?.[0]??'base';const elevation=item.render3d?.elevationMm??0,floorY=-height/2-elevation/1000;
 const anchor=(source.ownerAnchorsMm as Record<string,number[]>)[role];
 const requestedOp=q.get('r14Op'),singleOp=requestedOp&&Object.prototype.hasOwnProperty.call(source.operations,requestedOp)?requestedOp:null;
 const values:Record<string,number>=singleOp?{...(singleOp.startsWith('basket-')?{'pantry-door':1}:{}),[singleOp]:1}:(source.states as Record<string,Record<string,number>>)[state]??{},baseX=anchor[0],baseY=anchor[1];
 return <group name={'R14-native-'+role} rotation={[0,anchor[2]*Math.PI/180,0]}>
  {(source.parts as P[]).filter(p=>p.owner===role).map(p=><R14Mesh key={p.id} part={p} baseX={baseX} baseY={baseY} floorY={floorY} op={p.movingGroup?(source.operations as Record<string,Op>)[p.movingGroup]:undefined} value={(p.movingGroup?values[p.movingGroup]??0:0)*fraction}/>)}
 </group>;
}
