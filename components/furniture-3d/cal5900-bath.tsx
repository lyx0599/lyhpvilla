"use client";
import {useSearchParams} from 'next/navigation';
import type {FurnitureFamily3DProps} from './types';
import {ParametricBathroomVanity} from './wet-area-family-3d';
const binding=(p:FurnitureFamily3DProps)=>(p.item.render3d as {geometryContractId?:string}|undefined)?.geometryContractId;
export const hasCal5900Bath=(p:FurnitureFamily3DProps)=>p.item.id==='furn-bath-vanity-001'||binding(p)==='CAL5900-new-shower1500';
function Part({name,size,at,color='#8b9894',glass=false}:{name:string;size:[number,number,number];at:[number,number,number];color?:string;glass?:boolean}){return <mesh name={name} position={at} castShadow receiveShadow userData={{auditEntityId:'CAL5900:'+name,auditKind:'cal5900-fixture',auditPart:name}}><boxGeometry args={size}/><meshStandardMaterial color={color} transparent={glass} opacity={glass?.24:1} roughness={glass?.12:.6} metalness={glass?.1:.05}/></mesh>}
export function Cal5900Bath(p:FurnitureFamily3DProps){const q=useSearchParams(),open=Math.max(0,Math.min(1,Number(q.get('showerOpen')??p.openAmount??0))),mirror=Math.max(0,Math.min(1,Number(q.get('bathMirror')??p.openAmount??0))),f=-p.height/2;
 if(p.item.id==='furn-bath-vanity-001'&&binding(p)!=='CAL5900-new-vanity600')return <ParametricBathroomVanity {...p} openAmount={mirror}/>;
 if(p.item.id==='furn-bath-vanity-001')return <group name="CAL5900-new600-vanity-not-scaled-old900">
  <Part name="new600-carcass" size={[.6,.55,.45]} at={[0,f+.525,0]} color="#ad9679"/><Part name="new600-counter" size={[.62,.04,.475]} at={[0,f+.82,0]} color="#d8d0bc"/>
  <Part name="new600-basin" size={[.4,.08,.29]} at={[0,f+.88,.015]} color="#ecece3"/><Part name="new600-faucet" size={[.035,.24,.035]} at={[.19,f+.98,-.14]} color="#64584b"/>
  <Part name="new600-mirrorbox" size={[.58,.85,.11]} at={[0,f+1.42,-.185]} color="#ad9679"/>
  <group name="new600-mirror-door" position={[-.29,f+1.42,-.11]} rotation={[0,-mirror*Math.PI*.42,0]}><Part name="new600-mirror-leaf" size={[.58,.85,.022]} at={[.29,0,0]} color="#b5c2bc"/></group>
 </group>;
 return <group name="CAL5900-new1500-shower-entity-not-old1780-scaled">
  <Part name="new1500-wet-floor" size={[1.5,.018,.9]} at={[0,f+.009,0]} color="#a8afa4"/>
  {[-1,1].map(s=><Part key={s} name={'new1500-jamb-'+s} size={[.02,2.1,.025]} at={[s*.74,f+1.05,.44]} color="#4e5651"/>)}
  <Part name="new1500-top-rail" size={[1.5,.025,.045]} at={[0,f+2.0875,.44]} color="#4e5651"/>
  <Part name="new1500-fixed-right-glass" size={[.75,2.05,.012]} at={[.375,f+1.05,.435]} glass/>
  <group name="new1500-slide750-travel720" position={[open*.72,0,0]} userData={{auditKind:'cal5900-sliding-leaf',travelMm:open*720}}>
   <Part name="new1500-moving-left-glass" size={[.75,2.05,.012]} at={[-.375,f+1.05,.415]} glass/>
   <Part name="new1500-moving-handle" size={[.018,.28,.035]} at={[-.07,f+1.05,.44]} color="#4e5651"/>
  </group>
  <Part name="new1500-column" size={[.035,1.2,.04]} at={[.42,f+1.35,-.41]} color="#615d52"/>
  <Part name="new1500-head" size={[.22,.025,.22]} at={[.42,f+1.96,-.29]} color="#615d52"/>
  <Part name="new1500-drain" size={[.6,.006,.04]} at={[0,f+.022,-.29]} color="#615d52"/>
 </group>;
}
