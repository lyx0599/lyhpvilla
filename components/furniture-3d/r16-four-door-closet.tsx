'use client';
import {useEffect} from 'react';
import {useThree} from '@react-three/fiber';
import {useSearchParams,useRouter} from 'next/navigation';
import * as THREE from 'three';
import {r16State,r16Contract,r16ClosetMapping} from '@/lib/r16-cloak-binding';
import {resolveCabinetMaterialLayer} from '@/lib/render3d-assets';
import {RoundedPart,CylinderPart} from './primitives';
import type {FurnitureFamily3DProps} from './types';

// Isolated R02 candidate only. Four real leaves, explicit fixed front supports,
// normal90 hinges, actual hollow drawer. All original12 modules each stay1:1.
export function R16FourDoorCloset(props:FurnitureFamily3DProps){
 const {item,asset,width:w,height:h,depth:d}=props,q=useSearchParams(),router=useRouter(),native=useThree();
 const map=r16ClosetMapping(item,w,h,d),side=item.id.endsWith('left')?'left':'right',state=r16State(q),active=state.side===side;
 const angles=active?state.angles:[0,0,0,0],travel=active?state.travel:0,t=map.panel;
 const bronze={...resolveCabinetMaterialLayer(item,asset.materials,'hardware'),resourceId:item.render3d?.accentMaterialResourceId};
 const metal={...resolveCabinetMaterialLayer(item,asset.materials,'carcass'),resourceId:item.render3d?.primaryMaterialResourceId};
 const rearPosts=[-w/2+t/2,...map.modules.filter(m=>m.kind==='divider').map(m=>m.xM),w/2-t/2];
 const supports=r16Contract.frontPostsLocalUmm.map(x=>x/1000);
 useEffect(()=>{const host=window as unknown as Record<string,unknown>;host.__R16Native={...native,THREE,state,query:q.toString(),contract:r16Contract};},[native.scene,native.gl,native.camera,q]);
 const choose=(i:number)=>{const n=new URLSearchParams(q.toString());n.delete('cycle');n.delete('frame');n.set('mode','single');n.set('side',side);n.set('leaf',String(i));n.set('angle',String(active&&angles[i]>0?0:90));router.replace('?'+n.toString(),{scroll:false});};
 return <group name={`${item.id}-r16-four-real-leaves`} userData={{sourceObjectId:item.id,doorCount:4,hinges:r16Contract.hinges,originalModuleIds:map.sourceModuleIds,candidateOnly:true}}>
  {active&&state.body&&(()=>{const dx=(4766+state.body[0]-item.position.x*120)/1000,dz=(460+state.body[1]-item.position.y*90)/1000,r=(item.position.rotation??0)*Math.PI/180;return <mesh name="R16-full600x1700-body" userData={{auditEntityId:'R16-body',auditKind:'human-proxy',auditNonPhysical:true,bodyLocalMm:state.body,frame:state.frame}} position={[Math.cos(r)*dx+Math.sin(r)*dz,.0625+.85-(.035+h/2),-Math.sin(r)*dx+Math.cos(r)*dz]}><cylinderGeometry args={[.3,.3,1.7,96]}/><meshStandardMaterial color="#238f9d" transparent opacity={.26} depthWrite={false}/></mesh>;})()}
  {rearPosts.map((x,i)=><group key={i} name={`${item.id}-adjustable-upright-${i}`}>
   <RoundedPart name={`${item.id}-metal-post-${i}`} size={[t,h,.018]} position={[x,0,-d/2+.009]} radius={.003} material={metal} role="metal" color="#594532" roughness={.26} metalness={.78}/>
   {Array.from({length:23},(_,j)=><RoundedPart key={j} name={`${item.id}-slot-${i}-${j}`} size={[.006,.016,.003]} position={[x,-h/2+.12+j*.10,-d/2+.020]} radius={.001} material={bronze} role="metal" color="#191914"/>)}
  </group>)}
  {[-1,1].map(s=><RoundedPart key={s} name={`${item.id}-metal-frame-${s}`} size={[w,t,d]} position={[0,s*(h/2-t/2),0]} radius={.003} material={metal} color="#82634b" roughness={.55} metalness={.04}/>)}
  {rearPosts.slice(0,-1).map((x,i)=>{const a=x+t/2,b=rearPosts[i+1]-t/2;return <mesh key={i} name={`${item.id}-r16-walnut-back-${i}`} userData={{auditKind:'r16-back',bayIndex:i,addedWithinOldBack18:true}} position={[(a+b)/2,0,-.291]}><boxGeometry args={[b-a,2.434,.018]}/><meshStandardMaterial color="#73533e" roughness={.58} metalness={.02}/></mesh>;})}
  {map.modules.map(m=>{
   if(m.kind==='divider')return null;
   if(m.kind==='hanging')return <group key={m.id} name={`${item.id}-module-${m.id}`} userData={{sourceModuleId:m.id,moduleKind:m.kind}}><CylinderPart name={`${m.id}-rail`} radiusTop={.012} height={m.widthM*.88} position={[m.xM,m.yM+m.heightM/2,m.zM]} rotation={[0,0,Math.PI/2]} material={bronze} role="metal" color="#594532"/></group>;
   if(m.physicalPartRef)return <group key={m.id} name={`${item.id}-module-${m.id}`} userData={{sourceModuleId:m.id,physicalPartRef:m.physicalPartRef}}/>;
   const drawer=m.kind==='drawer',pos:[number,number,number]=[m.xM,m.yM,m.zM+(drawer?travel/1000:0)];
   if(drawer)return <group key={m.id} name={`${item.id}-module-${m.id}`} position={pos} userData={{sourceModuleId:m.id,moduleKind:m.kind,drawerTravelMm:travel,requiresLeaves:[2,3]}}>
    <RoundedPart name={`${m.id}-bottom`} size={[m.widthM,.018,m.depthM]} position={[0,-m.heightM/2+.009,0]} radius={.002} material={metal} color="#82634b" roughness={.55} metalness={.04}/>
    {[-1,1].map(s=><RoundedPart key={s} name={`${m.id}-side-${s}`} size={[.018,m.heightM-.018,m.depthM]} position={[s*(m.widthM/2-.009),.009,0]} radius={.002} material={metal} color="#82634b" roughness={.55} metalness={.04}/>)}
    {[-1,1].map(s=><RoundedPart key={s} name={`${m.id}-end-${s}`} size={[m.widthM-.036,m.heightM-.018,.018]} position={[0,.009,s*(m.depthM/2-.009)]} radius={.002} material={metal} color="#82634b" roughness={.55} metalness={.04}/>)}
    <RoundedPart name={`${m.id}-pull`} size={[.14,.018,.012]} position={[0,0,m.depthM/2+.007]} radius={.002} material={bronze} role="metal" color="#594532"/>
   </group>;
   return <RoundedPart key={m.id} name={`${item.id}-module-${m.id}`} userData={{sourceModuleId:m.id,moduleKind:m.kind}} size={[m.widthM,m.heightM,m.depthM]} position={pos} radius={.004} material={metal} color="#82634b" roughness={.55} metalness={.04}/>;
  })}
  {supports.map((u,i)=><RoundedPart key={i} name={`${item.id}-r16-front-stile-${i}`} userData={{auditKind:'r16-front-stile',researchSectionOnly:true}} size={[.012,2.434,.018]} position={[u,0,.237]} radius={.001} material={bronze} role="metal" color="#594532" roughness={.26} metalness={.78}/>)}
  {supports.map((u,i)=>[-.95,-.30,.35,.95].map((y,j)=>{const hinge=r16Contract.hinges[i];return <group key={`${i}-${j}`} name={`${item.id}-r16-hinge-${i}-${j}`} userData={{auditKind:'r16-hinge',leaf:i,researchOrdinary90:true,intendedOwnPinBearingContact:true}}>
   <RoundedPart name={`${item.id}-r16-hinge-stub-${i}-${j}`} size={[.006,.024,.012]} position={[u+hinge*.003,y,.252]} radius={.001} material={bronze} role="metal" color="#594532"/>
   <CylinderPart name={`${item.id}-r16-hinge-pin-${i}-${j}`} radiusTop={.003} height={.024} position={[u,y,.261]} material={bronze} role="metal" color="#594532"/>
  </group>;}))}
  <mesh name={`${item.id}-source-interior-light-strip`} position={[0,h/2-.055,-d/2+.065]}><boxGeometry args={[w-.09,.014,.015]}/><meshStandardMaterial color={state.lights?'#ffe2b2':'#49443d'} emissive="#ffd394" emissiveIntensity={state.lights?2:0}/></mesh>
  {[.45,-.45].map((y,i)=><pointLight key={i} name={`${item.id}-r16-interior-light-${i}`} position={[0,y,.03]} color="#ffd6a2" intensity={state.lights?6:0} distance={2.6} decay={2}/>)}
  {Array.from({length:4},(_,i)=>{const hinge=r16Contract.hinges[i],start=-w/2+.016+i*(.540+.016),u=start+(hinge===1?.540:0),leafX=-hinge*.540/2;return <group key={i} name={`${item.id}-r16-leaf-${i}`} position={[u,.007,.261]} rotation={[0,angles[i]*Math.PI/180*hinge,0]} userData={{auditKind:'r16-door',leafIndex:i,angleDegrees:angles[i],hingeSide:hinge,normalLimitDeg:90,bottomDisplayMm:67}} onClick={e=>{e.stopPropagation();choose(i);}}>
   <mesh name={`${item.id}-r16-glass-${i}`} position={[leafX,0,0]} userData={{auditKind:'r16-glass',sameGlassBothSides:true}}><boxGeometry args={[.540-2*t,2.420-2*t,.008]}/><meshPhysicalMaterial name="R16-uniform-gray-tea-half-reflective" color={r16Contract.glassVisual.color} roughness={r16Contract.glassVisual.roughness} metalness={r16Contract.glassVisual.metalness} transmission={r16Contract.glassVisual.transmission} transparent={r16Contract.glassVisual.transparent} opacity={r16Contract.glassVisual.opacity} depthWrite thickness={.008} ior={1.5} clearcoat={1} clearcoatRoughness={.08} envMapIntensity={1.25} side={THREE.FrontSide}/></mesh>
   {[-1,1].map(s=><RoundedPart key={`v${s}`} name={`${item.id}-r16-frame-${i}-v${s}`} size={[t,2.420,.024]} position={[leafX+s*(.540/2-t/2),0,0]} radius={.002} material={bronze} role="metal" color="#594532" roughness={.26} metalness={.78}/>)}
   {[-1,1].map(s=><RoundedPart key={`h${s}`} name={`${item.id}-r16-frame-${i}-h${s}`} size={[.540,t,.024]} position={[leafX,s*(2.420/2-t/2),0]} radius={.002} material={bronze} role="metal" color="#594532" roughness={.26} metalness={.78}/>)}
   <RoundedPart name={`${item.id}-r16-pull-${i}`} size={[.012,.22,.026]} position={[leafX-hinge*(.540/2-.045),-.12,.026]} radius={.003} material={bronze} role="metal" color="#594532" roughness={.26} metalness={.78}/>
  </group>;})}
 </group>;
}
