"use client";
import * as THREE from 'three';
import {useMemo} from 'react';
import {useSearchParams} from 'next/navigation';
import geometry from '@/data/option-b-geometry.json';
import type {FurnitureFamily3DProps} from './types';
export const hasOptionBGeometry=(item:FurnitureFamily3DProps['item']) => (item.render3d as {geometryContractId?:string})?.geometryContractId==='OPTION-B-20261114-CLOSEOUT' && [geometry.sofa.id,geometry.mobileTv.id].includes(item.id);
function Solid({name,points,bottom,top,color}:{name:string;points:number[][];bottom:number;top:number;color:string}){
 const g=useMemo(()=>{const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(p[0],-p[1]):s.moveTo(p[0],-p[1]));s.closePath();return new THREE.ExtrudeGeometry(s,{depth:top-bottom,bevelEnabled:false,steps:1});},[points,bottom,top]);
 return <mesh name={name} geometry={g} rotation={[-Math.PI/2,0,0]} position={[0,bottom,0]} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.85}/></mesh>;
}
function Box({name,size,position,color}:{name:string;size:[number,number,number];position:[number,number,number];color:string}){return <mesh name={name} position={position} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.5}/></mesh>;}
export function OptionBGeometry({item,height}:FurnitureFamily3DProps){
 const query=useSearchParams(),floor=-height/2-.017; // shared parent +35mm lift corrected to actual +18mm finished floor
 const rot=(item.position.rotation||0)*Math.PI/180;
 const center=[item.position.x*120,item.position.y*90];
 const relative=(p:number[])=>[(p[0]-center[0])/1000,(p[1]-center[1])/1000];
 const sofa=item.id===geometry.sofa.id;
 const outline=geometry.sofa.outlineWorldMm.map(relative),back=geometry.sofa.backBandWorldMm.map(relative);
 const tvShift=query.get('tv')==='park'?-.75:0;
 return <group rotation={[0,rot,0]} userData={{auditEntityId:item.id,auditKind:sofa?'option-b-curved-sofa':'option-b-mobile-tv',geometryContractId:geometry.revision}}>
 <group position={[0,0,sofa?0:tvShift]}>
 {sofa?<>
  <Solid name="curved-sofa-base" points={outline} bottom={floor+.12} top={floor+.35} color="#c5b9a7"/>
  <Solid name="curved-sofa-cushion" points={outline} bottom={floor+.35} top={floor+.43} color="#e5d9c7"/>
  <Solid name="curved-sofa-back-band90" points={back} bottom={floor+.35} top={floor+.7} color="#d4c6b0"/>
  {geometry.sofa.parts.legsCentersMm.map((p,i)=>{const r=relative(p);return <mesh key={i} name={`sofa-leg-${i+1}`} position={[r[0],floor+.06,r[1]]} castShadow><cylinderGeometry args={[.03,.03,.12,16]}/><meshStandardMaterial color="#514537"/></mesh>;})}
 </>:<>
  <Box name="tv-base-body" size={[.475,.045,.825]} position={[0,floor+.0975,0]} color="#44494b"/>
  {geometry.mobileTv.casterCentersRelativeMm.map((p,i)=><mesh key={i} name={`tv-caster-${i+1}`} position={[p[0]/1000,floor+.0375,p[1]/1000]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.0375,.0375,.075,20]}/><meshStandardMaterial color="#242627"/></mesh>)}
  <Box name="tv-upright" size={[.06,1.58,.06]} position={[0,floor+.91,0]} color="#464b4d"/>
  <Box name="tv-screen-frame" size={[.06,.85,1.45]} position={[0,floor+1.25,0]} color="#1c2226"/>
  <Box name="tv-screen-east-face" size={[.002,.806,1.406]} position={[.029,floor+1.25,0]} color="#364b59"/>
 </>}
 </group></group>;
}
