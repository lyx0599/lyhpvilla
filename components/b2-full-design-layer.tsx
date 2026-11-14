'use client';
import {useFrame,useThree} from '@react-three/fiber';
import {useSearchParams} from 'next/navigation';
import {useEffect,useRef} from 'react';
import * as T from 'three';
import D from '@/data/b2-full-design.json';
const xyz=(p:number[])=>new T.Vector3((p[0]-6000)/1000,p[1]/1000,(p[2]-4500)/1000);
function RawBox({name,p,size,color,wire=false}:{name:string;p:number[];size:number[];color:string;wire?:boolean}){return <mesh name={name} position={xyz(p)} userData={{auditKind:wire?'concept-reservation-nonphysical':'design-proposed-part',auditEntityId:name,auditNonPhysical:wire}}><boxGeometry args={size.map(v=>v/1000) as [number,number,number]}/><meshStandardMaterial color={color} roughness={.9} wireframe={wire}/></mesh>}
function Pipe({a,b}:{a:number[];b:number[]}){const p=xyz(a),q=xyz(b),v=q.clone().sub(p),rot=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());return <mesh name="PROPOSED-DN50-ISLAND-PIPE-NOT-SITE-CONNECTION" position={p.add(q).multiplyScalar(.5)} quaternion={rot} userData={{auditKind:'proposed-island-pipe'}}><cylinderGeometry args={[.025,.025,v.length(),20]}/><meshStandardMaterial color="#b4b2ab" roughness={.5}/></mesh>}
export function B2FullDesignLayer(){const{scene}=useThree(),q=useSearchParams(),detail=q.get('detail')??'normal';
 const originals=useRef(new Map<T.Mesh,T.Material|T.Material[]>());
 useEffect(()=>()=>{for(const[o,original]of Array.from(originals.current)){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();o.material=original;}originals.current.clear();},[scene]);
 useFrame(()=>{const records:any[]=[];scene.traverse((obj)=>{const o=obj as T.Mesh;if(!o.isMesh)return;let a:T.Object3D|null=o,id='',kind='';while(a){if(!id&&a.userData.auditEntityId)id=a.userData.auditEntityId;if(!kind&&a.userData.auditKind)kind=a.userData.auditKind;a=a.parent;}let color='';if(id.startsWith('ROOM-B2')&&['room-floor','floor-finish'].includes(kind))color=D.palette.floor;if(id.startsWith('W-B2')&&kind==='wall')color=D.palette.wall;if(id.startsWith('furn-b2')&&/cabinet|storage|shelf|handwash|foyer|tv-console/.test(id)&&!id.includes('souvenir'))color=D.palette.cabinet;
 if(id.includes('furn-b2-sofa'))color=D.palette.soft;
 const wm=o.matrixWorld.elements,cx=wm[12]*1000+6000,cz=wm[14]*1000+4500;
 if(o.geometry.type==='CylinderGeometry'&&((Math.abs(cx-5750)<.1&&Math.abs(cz-6200)<.1)||(Math.abs(cx-4300)<.1&&Math.abs(cz-5050)<.1)))color=(o.geometry as any).parameters?.height<.1?D.palette.bronze:D.palette.wall;
 if(color===D.palette.cabinet&&/pullbar|handle|shared-front-bronze/.test(o.name))color=D.palette.bronze;
 if((color||(id==='furn-b2-study-handwash-001'&&/sink-service|island-|stone-|OEM/.test(o.name)))&&!originals.current.has(o)){originals.current.set(o,o.material);o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}
 const materials=(Array.isArray(o.material)?o.material:[o.material])as T.MeshStandardMaterial[];for(const m of materials){if(color&&m.color&&!m.transparent){m.color.set(color);m.roughness=.9;}if(id==='furn-b2-study-handwash-001'&&/sink-service|island-|stone-|OEM/.test(o.name)){m.transparent=detail==='services';m.opacity=detail==='services'?.18:1;m.depthWrite=detail!=='services';}if(m.color)records.push({name:o.name,id,kind,color:'#'+m.color.getHexString(),opacity:m.opacity});}});(window as any).__B2DesignCapture=()=>({revision:D.revision,detail,contract:D,materials:records});});
 return <group name={'B2-FULL-DESIGN-'+D.revision}>
 <RawBox name="CONDITIONAL-C-under-stair-target700-REQUIRES-MEASURED820-NO-CONCRETE-CUT" p={[3100,385,5557.229]} size={[700,700,450]} color="#b77b43" wire/>

 {D.sink.pipeCentrelineRawMm.slice(1).map((p,i)=><Pipe key={i} a={D.sink.pipeCentrelineRawMm[i]} b={p}/>)}
 <RawBox name="PROPOSED-LEAK-TRAY-NOT-EXISTING-DRAIN" p={[2910,490,8700]} size={[420,15,400]} color="#625f59"/>
 <RawBox name="LEAK-SENSOR-CONCEPT" p={[2750,510,8690]} size={[45,18,45]} color="#9b8059"/>
 {[[3650,2660,7350],[3650,2660,8250],[8100,2660,5400]].map((p,i)=><group key={i}><RawBox name={'PROPOSED-3000K-LINEAR-'+i} p={p} size={[35,25,600]} color="#ae9472"/><pointLight position={xyz([p[0],p[1]-50,p[2]])} color="#fff0d8" intensity={.45} distance={4} decay={2}/></group>)}
 {[[6600,2620,2800],[5200,2620,7400]].map((p,i)=><RawBox key={i} name={'PROPOSED-ABSORPTIVE-RAFT-'+i} p={p} size={[1200,40,600]} color="#b0aaa0"/>)}
 {detail==='ceiling'&&<><RawBox name="HV-DEHUMIDIFIER-CONCEPT-RESERVE-NOT-BEAM" p={[7400,2615,6800]} size={[1600,330,800]} color="#bb6859" wire/><RawBox name="600-ACCESS-NO-BEAM-CUT" p={[7400,2445,6800]} size={[600,10,600]} color="#bb6859" wire/></>}
 <RawBox name="RIDER-PREPARATION-BAY-NONPHYSICAL" p={[7550,40,5300]} size={[600,5,850]} color="#9b8059" wire/>
 </group>
}
