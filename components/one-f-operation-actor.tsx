'use client';
import {useSearchParams} from 'next/navigation';
/** Explicit diagnostic proxy only, absent from ordinary model states. */
export function OneFOperationActor(){
 const q=useSearchParams();if(q.get('r14Actor')!=='coat'||(q.get('r14Op')!=='coat-door'&&q.get('r14')!=='coat-open'))return null;
 return <group name="R12-coat-operator600x1800" position={[(8550-6000)/1000,.022,(4380-4500)/1000]} userData={{auditEntityId:'R12-1F-coat-operator',auditKind:'diagnostic-body',diameterMm:600,heightMm:1800,notArticulatedOrComfortEvidence:true}}>
  <mesh name="R12-coat-body600x1800" position={[0,.9,0]}><cylinderGeometry args={[.3,.3,1.8,64]}/><meshStandardMaterial color="#d98a26" transparent opacity={.38} depthWrite={false}/></mesh>
  <mesh name="R12-coat-body-footprint" position={[0,.002,0]} rotation={[-Math.PI/2,0,0]} userData={{auditNonPhysical:true}}><ringGeometry args={[.296,.304,64]}/><meshBasicMaterial color="#bb711b" side={2}/></mesh>
 </group>;
}
