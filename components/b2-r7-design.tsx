"use client";
import {useEffect,useMemo} from 'react';
import {useSearchParams} from 'next/navigation';
import * as THREE from 'three';
import display from '@/data/b2-r7-design-contract.json';

// PMO-adopted R7 design roles. Reference geometry is not purchased equipment,
// comfort/clearance or construction approval. Diagnostics are opt-in only.
export function R7Label({text,position,width=1.25,color='#183a40'}:{text:string;position:[number,number,number];width?:number;color?:string}){
 const params=useSearchParams();
 const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=1024;c.height=144;const g=c.getContext('2d')!;g.fillStyle='#fffdf2';g.fillRect(0,0,c.width,c.height);g.strokeStyle=color;g.lineWidth=8;g.strokeRect(4,4,c.width-8,c.height-8);g.fillStyle=color;g.font='bold 52px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,512,73,990);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;},[text,color]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 if(params.get('diagnostics')!=='1'||/^B2-R7-eye-/.test(params.get('camera')??''))return null;
 return <sprite name={'R7-label-'+text} userData={{auditKind:'annotation',auditPart:'not-physical'}} position={position} scale={[width,width*144/1024,1]} renderOrder={30}><spriteMaterial map={texture} depthTest={false} depthWrite={false}/></sprite>;
}
function Box({name,size,position=[0,0,0],color='#b9b4a7',opacity=1}:{name:string;size:[number,number,number];position?:[number,number,number];color?:string;opacity?:number}){
 return <mesh name={name} position={position} castShadow={opacity===1} receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.9} transparent={opacity<1} opacity={opacity} depthWrite={opacity===1}/></mesh>;
}
export function R7Envelope({name,width,depth,height=.002,y=0,color='#b67927'}:{name:string;width:number;depth:number;height?:number;y?:number;color?:string}){
 const diagnostics=useSearchParams().get('diagnostics')==='1';
 const edges=useMemo(()=>{const b=new THREE.BoxGeometry(width,height,depth),e=new THREE.EdgesGeometry(b);b.dispose();return e;},[width,depth,height]);useEffect(()=>()=>edges.dispose(),[edges]);
 if(!diagnostics)return null;
 return <group name={name} userData={{auditKind:'source-envelope',auditPart:name}} position={[0,y,0]}>
  <lineSegments geometry={edges}><lineBasicMaterial color={color}/></lineSegments>
  <mesh name={name+'-exact-plan'}><boxGeometry args={[width,.002,depth]}/><meshBasicMaterial color={color} transparent opacity={.08} depthWrite={false}/></mesh>
 </group>;
}
export function R7ChairStudyOutline({id,width,depth,height}:{id:string;width:number;depth:number;height:number}){
 const p=useSearchParams(),pull=Number(p.get('pull')??0),west=(p.get('seat')??'west-1').startsWith('west'),selected=id===`furn-b2-chair-${p.get('seat')??'west-1'}-candidate-20261030`,show=p.get('sweep')==='1'&&selected,dir=west?1:-1;
 if(p.get('diagnostics')!=='1')return null;
 return <group>
  <R7Envelope name="R7-chair-source-550x400-full-not-fine-gap" width={width} depth={depth} y={-height/2+.006}/>
  {show&&<group name="R7-chair-single-continuous-0-300-translation-envelope" userData={{auditKind:'source-sweep',auditPart:'translation-only-not-multi-person'}}>
   <group position={[dir*(pull/1000-.15),0,0]}><R7Envelope name="R7-chair-continuous-850x400-sweep" width={width+.3} depth={depth} y={-height/2+.009} color="#a33b91"/></group>
   {[0,75,150,225,300].map(v=><group key={v} position={[dir*(pull-v)/1000,0,0]}><R7Envelope name={'R7-chair-ghost-'+v} width={width} depth={depth} y={-height/2+.012} color="#659bc0"/></group>)}
   <R7Label text="550×400 / 0·75·150·225·300扫框" position={[0,.25,0]} width={2}/>
  </group>}
 </group>;
}
function Bicycle(){
 return <group name="R7-existing-bicycle-1500x600-study" userData={{auditPart:'existing-bicycle-not-purchase'}}>
  <R7Envelope name="R7-bike-source-1500x600" width={1.5} depth={.6} height={1.3} y={.65} color="#336f80"/>
  {[-.48,.48].map(x=><mesh key={x} name="R7-bicycle-wheel" position={[x,.34,0]}><torusGeometry args={[.30,.025,8,40]}/><meshStandardMaterial color="#324450"/></mesh>)}
  <Box name="R7-bicycle-frame" size={[.95,.045,.04]} position={[0,.51,0]} color="#45879b"/>
  <Box name="R7-bicycle-seat-post" size={[.035,.48,.035]} position={[-.15,.72,0]} color="#45879b"/>
  <Box name="R7-bicycle-seat" size={[.25,.055,.15]} position={[-.15,.97,0]} color="#374552"/>
  <Box name="R7-bicycle-handle-post" size={[.035,.68,.035]} position={[.43,.88,0]} color="#45879b"/>
  <Box name="R7-bicycle-handlebar" size={[.04,.04,.56]} position={[.43,1.24,0]} color="#374552"/>
 </group>;
}
function Trainer(){return <group name="R7-independent-trainer-600x800-study" userData={{auditPart:'independent-trainer-not-integrated-bike'}}>
 <R7Envelope name="R7-trainer-source-600x800" width={.6} depth={.8} height={.42} y={.21} color="#9a632f"/>
 {[-.35,.35].map(z=><Box key={z} name="R7-trainer-foot" size={[.6,.06,.1]} position={[0,.03,z]} color="#a16f39"/>)}
 <Box name="R7-trainer-stand" size={[.08,.38,.08]} position={[0,.23,0]} color="#a16f39"/>
 <Box name="R7-trainer-axle" size={[.56,.06,.06]} position={[0,.4,0]} color="#a16f39"/>
 </group>;}
export function B2R7RoleParts({role,width,depth,height}:{role:'castle'|'sports'|'bike'|'sofa';width:number;depth:number;height:number}){
 const params=useSearchParams(),stowed=params.get('bike')==='S';
 if(role==='sofa')return <group name="R7-RESIDENCE-code3-official-four-two-wide-cushions" position={[0,-height/2,0]} scale={[width/2.6,height/.85,depth/1.08]}>
  <R7Envelope name="R7-RESIDENCE-source-2600x1080x850" width={2.6} depth={1.08} height={.85} y={.425}/>
  <Box name="R7-RESIDENCE-neutral-base" size={[2.6,.10,1.08]} position={[0,.19,0]} color="#42362f"/>
  {[-1.15,1.15].map(x=><Box key={x} name="R7-RESIDENCE-arm-300-top650" size={[.3,.49,1.08]} position={[x,.405,0]} color="#896a50"/>)}
  {[-.5,.5].map(x=><group key={x}>
   <Box name="R7-RESIDENCE-wide-seat-cushion-two-only" size={[.99,.17,.62]} position={[x,.325,.23]} color="#a78b6d"/>
   <Box name="R7-RESIDENCE-wide-back-cushion-two-only" size={[.99,.44,.34]} position={[x,.63,-.37]} color="#97785b"/>
   <Box name="R7-RESIDENCE-lumbar-role" size={[.94,.19,.12]} position={[x,.505,-.03]} color="#ab8c6d"/>
  </group>)}
  {[-1.1,1.1].flatMap(x=>[-.4,.4].map(z=><Box key={x+':'+z} name="R7-RESIDENCE-leg-role-not-chosen-finish" size={[.035,.14,.035]} position={[x,.07,z]} color="#5e5951"/>))}
  {[-.75,-.25,.25,.75].map((x,i)=><group key={x} name={'R7-assumed-adult-allocation-seat-'+(4-i)} position={[x,.414,.23]} userData={{auditKind:'allocation-marker',auditPart:'500mm-per-adult-inference-not-cushion'}}><R7Envelope name={'R7-allocation-500x620-seat-'+(4-i)} width={.5} depth={.62} color="#69a0a5"/></group>)}
  <R7Label text="RESIDENCE参考 / 两宽垫·紧凑四席" position={[0,1.05,0]} width={2.2}/>
 </group>;
 const state=display.contract.bike[stowed?'S':'U'];
 const placement=(r:number[],w:number)=>({position:[((r[0]+r[2])/2-7350)/1000,0,((r[1]+r[3])/2-6500)/1000] as [number,number,number],rotation:[0,Math.abs(r[2]-r[0]-w)<1e-4?0:-Math.PI/2,0] as [number,number,number]});
 if(role==='bike')return <group position={[0,-height/2,0]} scale={[width/1.5,height/1.3,depth/.8]} name={'R7-bike-state-'+(stowed?'S':'U')}>
  {/* Parent stays at the exact U source placement. S alternatives are explicit
      unchanged-size component transforms, not a changed source document. */}
  <group {...placement(state.bicycleStudyEnvelopeMm,1500)}><Bicycle/></group>
  <group {...placement(state.trainerStudyEnvelopeMm,600)}><Trainer/></group>
  <R7Label text={stowed?'R7 S新收存 / 动作线缆未验':'U 现有车 + 独立骑行台'} position={[0,1.62,0]} width={1.85}/>
 </group>;
 if(role==='castle')return <group name="R7-castle-south-east-glass-only">
  <R7Envelope name="R7-castle-source-1100x750" width={width} depth={depth} height={height}/>
  <Box name="R7-castle-west-neutral" size={[.018,height,depth]} position={[-width/2+.009,0,0]}/>
  <Box name="R7-castle-north-neutral" size={[width,height,.018]} position={[0,0,-depth/2+.009]}/>
  <Box name="R7-castle-base" size={[width,.018,depth]} position={[0,-height/2+.009,0]}/>
  <Box name="R7-castle-top" size={[width,.018,depth]} position={[0,height/2-.009,0]}/>
  <mesh name="R7-castle-glass-south-y5170" position={[0,0,depth/2]}><planeGeometry args={[width,height]}/><meshStandardMaterial color="#64c5e1" transparent opacity={.32} depthWrite={false} side={THREE.DoubleSide}/></mesh>
  <mesh name="R7-castle-glass-east-x8150" position={[width/2,0,0]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[depth,height]}/><meshStandardMaterial color="#64c5e1" transparent opacity={.32} depthWrite={false} side={THREE.DoubleSide}/></mesh>
  <R7Label text="CASTLE 防尘 / 南东双玻" position={[0,height/2+.17,0]} width={1.5}/>
 </group>;
 return <group name="R7-sports-rack-rail-removable-bins">
  <R7Envelope name="R7-sports-source-1200x500" width={width} depth={depth} height={height}/>
  {[-1,1].map(s=><Box key={s} name="R7-sports-upright" size={[.025,height,.025]} position={[s*(width/2-.0125),0,-depth/2+.0125]} color="#576454"/>)}
  {[-height/2+.025,-.15,.48].map(y=><Box key={y} name="R7-sports-adjustable-shelf" size={[width,.025,depth]} position={[0,y,0]} color="#8e9982"/>)}
  <Box name="R7-sports-hanging-rail" size={[width-.05,.025,.025]} position={[0,height/2-.12,0]} color="#576454"/>
  {[-.28,.28].map(x=><Box key={x} name="R7-sports-removable-bin" size={[.4,.30,.36]} position={[x,-height/2+.19,0]} color="#a7b8a2"/>)}
  <R7Label text="运动露营 / 架·杆·可移箱" position={[0,height/2+.18,0]} width={1.7}/>
 </group>;
}
function Route({name,points,color}:{name:string;points:number[][];color:string}){
 const curve=useMemo(()=>new THREE.CurvePath<THREE.Vector3>(),[]);
 const geometry=useMemo(()=>{curve.curves=[];for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(new THREE.Vector3((points[i-1][0]-6000)/1000,.065,(points[i-1][1]-4500)/1000),new THREE.Vector3((points[i][0]-6000)/1000,.065,(points[i][1]-4500)/1000)));return new THREE.TubeGeometry(curve,Math.max(8,points.length*4),.009,5,false);},[curve,points]);useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh name={name} geometry={geometry} userData={{auditKind:'annotation',auditPart:'declared-line-not-clearance-proof'}}><meshBasicMaterial color={color}/></mesh>;
}
export function B2R7EvidenceOverlay(){
 const p=useSearchParams(),bike=p.get('bike')==='S'?'S':'U',state=p.get('state')==='party6'?'party6':'daily4',eye=/^B2-R7-eye-/.test(p.get('camera')??'');
 // Exact seated photograph keeps geometry and occlusion; no floating notes in
 // front of the 100-inch screen. Its warnings live outside the camera canvas.
 if(p.get('diagnostics')!=='1'||eye)return null;
 const routes=display.routesByState[(state+'-'+bike) as keyof typeof display.routesByState];
 return <group name="R7-new-declared-source-annotation" userData={{auditKind:'annotation'}}>
  <Route name="R7-new-public-to-stair" points={routes.public_to_stair_front.polylineMm} color="#19856f"/>
  <Route name="R7-new-entry-to-lounge" points={routes.entry_to_lounge.polylineMm} color="#278ab4"/>
  <Route name="R7-new-public-to-waterbar" points={routes.public_to_waterbar.polylineMm} color="#b07d36"/>
  <R7Label text="作者全拉300静态声明线 / 本图非同态复核" position={[-1.5,.25,-.2]} width={2.6}/>
 </group>;
}
