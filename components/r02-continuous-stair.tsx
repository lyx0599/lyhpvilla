"use client";
import { useMemo } from "react";
import * as THREE from "three";
import contract from "@/data/r02-continuous-stair.json";
import {useSearchParams} from 'next/navigation';

export type RegisteredStairContract = {
 upperFlightId:string;
 treads:{id:string;role:string;polygonMm:number[][];topAbove1FFinishMm?:number;topAboveLowerFinishMm?:number}[];
 risers:{id:string;role:string;a:number[];b:number[];bottomMm:number;topMm:number}[];
 registeredRails:{id:string;role:string;a:number[];b:number[];ha:number;hb:number}[];
};

function DirectionTrace({registration,upper,base}:{registration:RegisteredStairContract;upper:boolean;base:number}){
 const arrows=useMemo(()=>{
  const all=registration.treads.map(t=>{const p=t.polygonMm;let area=0,cx=0,cy=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],s=a[0]*b[1]-b[0]*a[1];area+=s;cx+=(a[0]+b[0])*s;cy+=(a[1]+b[1])*s;}return {role:t.role,v:new THREE.Vector3(cx/(3*area)/1000-6,(base+(t.topAboveLowerFinishMm??t.topAbove1FFinishMm??0))/1000+.07,cy/(3*area)/1000-4.5),poly:p};});
  let points=upper?all.filter(x=>x.role==='upper').map(x=>x.v):all.filter(x=>x.role!=='upper').map(x=>x.v);
  if(upper){const previous=all.filter(x=>x.role!=='upper').at(-1);if(previous)points.unshift(previous.v);const last=all.at(-1);if(last)points.push(new THREE.Vector3(Math.max(...last.poly.map(p=>p[0]))/1000-6+.19,(base+2800)/1000+.07,last.v.z));}
  else {const first=all[0];points.unshift(new THREE.Vector3(Math.max(...first.poly.map(p=>p[0]))/1000-6+.19,base/1000+.07,first.v.z));}
  const down=registration.upperFlightId==='ST-1F-002'&&base<0;if(down)points=points.slice().reverse();
  const color=registration.upperFlightId==='ST-1F-002'?0x236b9b:0xc15b26;
  return points.slice(1).map((b,i)=>{const a=points[i],d=b.clone().sub(a);return new THREE.ArrowHelper(d.clone().normalize(),a,d.length(),color,.075,.04);});
 },[registration,upper,base]);
 return <group name="native-model-direction-trace-not-body-certificate" userData={{auditNonPhysical:true,auditKind:'diagnostic-direction-trace',notBodyOrSupportCertificate:true}}>{arrows.map((a,i)=><primitive key={i} object={a}/>)}</group>;
}

function Tread({points,top,id}:{points:number[][];top:number;id:string}) {
  const g=useMemo(()=>{const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo((x-6000)/1000,(y-4500)/1000):s.moveTo((x-6000)/1000,(y-4500)/1000));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:.1,bevelEnabled:false});g.rotateX(Math.PI/2);return g;},[points]);
  return <mesh name={id} userData={{auditPart:"actual-tread",r02Continuous:true}} position={[0,top/1000,0]} geometry={g} castShadow receiveShadow><meshStandardMaterial color="#d9d0c2" roughness={.72}/></mesh>;
}
function Riser({a,b,low,top,id}:{a:number[];b:number[];low:number;top:number;id:string}){
 const dx=b[0]-a[0],dy=b[1]-a[1];return <mesh name={id} userData={{auditPart:"actual-riser"}} position={[(a[0]+b[0])/2000-6,(low+top)/2000,(a[1]+b[1])/2000-4.5]} rotation={[0,-Math.atan2(dy,dx),0]}><boxGeometry args={[Math.hypot(dx,dy)/1000,(top-low)/1000,.012]}/><meshStandardMaterial color="#e0d7c9" roughness={.76}/></mesh>;
}
function Rail({a,b,ha,hb,id}:{a:number[];b:number[];ha:number;hb:number;id:string}){
 const geom=useMemo(()=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),nx=-dy/len*9,ny=dx/len*9;
  const p=[[a[0]-nx,ha,a[1]-ny],[b[0]-nx,hb,b[1]-ny],[b[0]+nx,hb,b[1]+ny],[a[0]+nx,ha,a[1]+ny]];
  const vertices=[...p,...p.map(([x,y,z])=>[x,y+900,z])].flatMap(([x,y,z])=>[(x-6000)/1000,y/1000,(z-4500)/1000]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);g.computeVertexNormals();return g;
 },[a,b,ha,hb]);
 const va=new THREE.Vector3((a[0]-6000)/1000,(ha+1000)/1000,(a[1]-4500)/1000),vb=new THREE.Vector3((b[0]-6000)/1000,(hb+1000)/1000,(b[1]-4500)/1000),d=vb.clone().sub(va),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
 return <><mesh name={id+'-glass'} userData={{auditPart:'stair-guard-glass'}} geometry={geom}><meshPhysicalMaterial color="#cfdfdf" transparent opacity={.35} roughness={.15} side={THREE.DoubleSide}/></mesh><mesh name={id+'-handrail'} userData={{auditPart:'stair-handrail'}} position={va.clone().add(vb).multiplyScalar(.5)} quaternion={q}><cylinderGeometry args={[.023,.023,d.length(),12]}/><meshStandardMaterial color="#705744" roughness={.55}/></mesh></>;
}
export function R02ContinuousStairPart({flightId,lowerFinishRelativeMm,registration=contract}:{flightId:string;lowerFinishRelativeMm:number;registration?:RegisteredStairContract}){
 const query=useSearchParams();
 const upper=flightId===registration.upperFlightId;
 const treads=registration.treads.filter(t=>upper?t.role==='upper':t.role!=='upper');
 const risers=registration.risers.filter(t=>upper?t.role==='upper':t.role==='lower');
 const rails=registration.registeredRails.filter(r=>upper?r.role==='upper':r.role!=='upper').map(r=>({...r,ha:lowerFinishRelativeMm+r.ha,hb:lowerFinishRelativeMm+r.hb}));
 return <group name={'C1-joint-source-candidate-'+flightId} userData={{auditEntityId:flightId,auditKind:'registered-stair-flight',estimatedConcept:true,jointRegistrationCandidate:true,sourceRegistrationAccepted:false}}>
  {treads.map(t=>{const h=t.topAboveLowerFinishMm??t.topAbove1FFinishMm;if(typeof h!=='number')throw new Error('Registered tread has no lower-floor-relative height: '+t.id);return <Tread key={t.id} id={t.id} points={t.polygonMm} top={lowerFinishRelativeMm+h}/>;})}
  {risers.map(r=><Riser key={r.id} id={r.id} a={r.a} b={r.b} low={lowerFinishRelativeMm+r.bottomMm} top={lowerFinishRelativeMm+r.topMm}/>)}
  {rails.map(r=><Rail key={r.id} {...r}/>)}
  {query.get('route')==='stairs'&&<DirectionTrace registration={registration} upper={upper} base={lowerFinishRelativeMm}/>}
 </group>;
}
