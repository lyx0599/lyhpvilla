"use client";

import { useSearchParams } from "next/navigation";
import contract from "@/data/research-1f-contract.json";
import {oneFChairMotionOffset} from '@/lib/one-f-chair-motion';
import type { FurnitureFamily3DProps } from "./types";

type ChairPose={id:string;centerMm:number[];angleDeg:number;parent?:string;kind?:string};
const ids=new Set(['module-1f-table-001','furn-1f-independent-long-table-r05','furn-entry-slim-hanging-001','furn-living-waterbar-001']);
export const hasResearch1FContract=(id:string)=>ids.has(id);

function Part({name,size,position=[0,0,0],color='#a58b6c',metal=false}:{name:string;size:[number,number,number];position?:[number,number,number];color?:string;metal?:boolean}){
 return <mesh name={name} position={position} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} metalness={metal?.65:.02} roughness={metal?.35:.72}/></mesh>;
}

// Contract angle is the outward pull/back axis in the plan, not a chair-facing
// yaw. Local X is outward, Z is chair width. Front (-X) faces the table.
function ContractChair({pose,baseX,baseY,floorY,offset}:{pose:ChairPose;baseX:number;baseY:number;floorY:number;offset:number[]}){
 const a=pose.angleDeg*Math.PI/180,x=(pose.centerMm[0]-baseX+offset[0])/1000,z=(pose.centerMm[1]-baseY+offset[1])/1000;
 return <group name={`${pose.id}-contract-chair`} userData={{auditEntityId:pose.id,auditKind:'contract-chair',chairAngleDeg:pose.angleDeg,chairFront:'local-negative-X',chairBack:'local-positive-X',chairWorldOffsetMm:offset}} position={[x,floorY,z]} rotation={[0,-a,0]}>
  <Part name={`${pose.id}-seat`} size={[.495,.075,.54]} position={[.0275,.4425,0]} color='#bbad98'/>
  <Part name={`${pose.id}-back`} size={[.05,.34,.54]} position={[.25,.65,0]} color='#b4a58e'/>
  {[-.16,.20].flatMap((x)=>[-.22,.22].map(z=><Part key={`${x}-${z}`} name={`${pose.id}-leg`} size={[.032,.405,.032]} position={[x,.2025,z]} color='#755d46'/>))}
 </group>;
}

export function Research1FContract(props:FurnitureFamily3DProps){
 // Public release only renders the adopted daily eight. 1750/10 remains a design goal, not an adopted pose.
 const query=useSearchParams(),party=false,phase=query.get('phase')??'closed';
 const {item,width,depth,height}=props,floorY=-height/2,baseX=item.position.x*120,baseY=item.position.y*90;
 const worldRotation=(item.position.rotation||0)*Math.PI/180;
 const authored=(item.render3d as {authoredSeatLayoutsMm?:{daily?:Array<ChairPose&{kind:string;parent:string}>}}|undefined)?.authoredSeatLayoutsMm?.daily;
 const state=(party?contract.states.party:authored??contract.states.daily) as unknown as Array<ChairPose&{kind:string;parent:string}>;
 const selectedPullSeat=query.get('seat')??'R1';
 const offsetFor=(p:ChairPose):[number,number]=>{
  if(phase!=='chairs-pulled'||p.id!==selectedPullSeat)return [0,0];
  const a=p.angleDeg*Math.PI/180;
  const paths=(contract as unknown as {dailyActions?:Record<string,number[][]>}).dailyActions;
  const path=!party&&paths?.[p.id]||[[0,0],[400*Math.cos(a),400*Math.sin(a)]];
  return oneFChairMotionOffset(path,Number(query.get('t')??1));
 };
 if(item.id==='module-1f-table-001'||item.id==='furn-1f-independent-long-table-r05'){
  const round=item.id==='module-1f-table-001';
  // The adopted mechanical update must change real meshes, not just labels.
  const expandedCm=Number((item.render3d as {expandedSizeCm?:string}|undefined)?.expandedSizeCm?.split('x')[0]);
  const diameter=party&&Number.isFinite(expandedCm)&&expandedCm>0?expandedCm/100:width;
  const chairs=state.filter(p=>p.kind==='chair'&&p.parent===(round?'round-table':'long-table'));
  return <group rotation={[0,worldRotation,0]}>
   <group name={`${item.id}-exact-table`} userData={{auditEntityId:`${item.id}:table`,auditKind:'contract-table'}}>
    {round?<mesh name="exact-round-top" position={[0,floorY+height-.03,0]} castShadow receiveShadow><cylinderGeometry args={[diameter/2,diameter/2,.06,96]}/><meshStandardMaterial color='#baa07f' roughness={.55}/></mesh>:<Part name="exact-long-top" size={[width,.06,depth]} position={[0,floorY+height-.03,0]} color='#baa07f'/>}
    {round?<mesh name="round-pedestal-research" position={[0,floorY+.345,0]} castShadow><cylinderGeometry args={[.20,.26,.69,48]}/><meshStandardMaterial color='#51483c' roughness={.5}/></mesh>:[-1,1].map(sign=><Part key={sign} name="long-table-leg" size={[.055,height-.06,Math.max(.1,depth-.13)]} position={[sign*(width/2-.15),floorY+(height-.06)/2,0]} color='#544a3c'/>)}
   </group>
   {chairs.map(p=><ContractChair key={p.id} pose={p} baseX={baseX} baseY={baseY} floorY={floorY} offset={offsetFor(p)}/>)}
  </group>;
 }
 if(item.id==='furn-entry-slim-hanging-001'){
  const open=phase==='entry-open'?.4:0;
  return <group name="entry-B-five-drawer-model">
   <Part name="entry-back" size={[width,.94,.018]} position={[0,floorY+.53,-depth/2+.009]}/>
   {[-1,1].map(s=><Part key={s} name={`entry-side-${s}`} size={[.018,.96,depth]} position={[s*(width/2-.009),floorY+.52,0]}/>)}
   <Part name="entry-top" size={[width,.025,depth]} position={[0,floorY+.9875,0]}/>
   <Part name="entry-bottom" size={[width,.04,depth]} position={[0,floorY+.02,0]}/>
   {Array.from({length:5},(_,i)=>{const travel=i===2?open:0;return <group key={i} name={`entry-drawer-${i+1}`} userData={{auditEntityId:`entry-drawer-${i+1}`,auditKind:'entry-drawer',travelMm:travel*1000}} position={[0,floorY+.06+i*.18,travel]}>
    <Part name={`drawer-${i+1}-front`} size={[width-.04,.172,.025]} position={[0,.086,depth/2-.0125]} color='#ac9274'/>
    <Part name={`drawer-${i+1}-base`} size={[width-.065,.018,depth-.045]} position={[0,.018,0]} color='#7b6752'/>
    <Part name={`drawer-${i+1}-handle`} size={[.18,.018,.018]} position={[0,.09,depth/2+.009]} color='#4d4b43' metal/>
   </group>;})}
  </group>;
 }
 // True outer envelope is unchanged. Basket vertical placement and internal
 // dividers are explicitly estimated visualization, not a selected hardware SKU.
 const travel=phase==='basket-open'?.4:0;
 return <group name="drybar-C2-contract-model">
  <Part name="drybar-top" size={[width,.038,depth]} position={[0,floorY+height-.019,0]} color='#171919'/>
  <Part name="drybar-back" size={[width,height-.038,.02]} position={[0,floorY+(height-.038)/2,-depth/2+.01]} color='#474a48'/>
  {[-1,1].map(s=><Part key={s} name={`drybar-end-${s}`} size={[.02,height-.038,depth]} position={[s*(width/2-.01),floorY+(height-.038)/2,0]} color='#3b3e3b' metal/>)}
  <Part name="drybar-left-front" size={[1.18,.82,.02]} position={[-.6,floorY+.41,depth/2-.01]} color='#3b3e3b' metal/>
  <Part name="drybar-right-front" size={[.58,.82,.02]} position={[.9,floorY+.41,depth/2-.01]} color='#3b3e3b' metal/>
  <group name="middle-basket-600x400" userData={{auditEntityId:'C2-middle-basket',auditKind:'contract-basket',travelMm:travel*1000,verticalPlacement:'estimated-visual-only'}} position={[.3,floorY+.2,.075+travel]}>
   <Part name="basket-bottom" size={[.6,.018,.4]} position={[0,.009,0]} color='#4d514d' metal/>
   {[-1,1].map(s=><Part key={s} name={`basket-side-${s}`} size={[.015,.36,.4]} position={[s*.2925,.18,0]} color='#555c56' metal/>)}
   <Part name="basket-front" size={[.6,.4,.018]} position={[0,.2,.191]} color='#3b3e3b' metal/>
   <Part name="basket-handle" size={[.25,.018,.018]} position={[0,.32,.209]} color='#a89b7b' metal/>
  </group>
 </group>;
}
