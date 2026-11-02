'use client';
import {useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {r09ClosetMapping} from '@/lib/r09-closet-mapping';
import {r11CycleState,r11CycleCabinetMatches,r11CycleSource} from '@/lib/r11-cycle-binding';
import {resolveCabinetMaterialLayer} from '@/lib/render3d-assets';
import {RoundedPart,CylinderPart} from './primitives';
import type {FurnitureFamily3DProps} from './types';

// Geometry extracted from reviewed c303c3e9 / 11991a2e. No R04 outboard
// supports or hidden 180-degree hinges, and no global debug control mutation.
export function R09ThreeDoorCloset(props:FurnitureFamily3DProps){
 const {item,asset,width:w,height:h,depth:d}=props, q=useSearchParams();
 const side=item.id.endsWith('left')?'left':'right', map=r09ClosetMapping(item,w,h,d);
 const [manualAngles,setAngles]=useState(()=>Array.from({length:map.count},(_,i)=>q.get('open')===`${side}-${i}`?80:0));
 const cycle=r11CycleCabinetMatches(item)?r11CycleState(q.get('closetCycle'),Number(q.get('cycleFrame')??0)):null;
 const active=cycle?.side===side;
 const angles=cycle?Array.from({length:map.count},(_,i)=>active&&i===cycle.leaf?cycle.angle:0):manualAngles;
 const travel=cycle?(active?cycle.travel:0):q.get('drawer')===side?350:0;
 const metal={...resolveCabinetMaterialLayer(item,asset.materials,'carcass'),resourceId:item.render3d?.primaryMaterialResourceId};
 const hardware={...resolveCabinetMaterialLayer(item,asset.materials,'hardware'),resourceId:item.render3d?.accentMaterialResourceId};
 const glass=resolveCabinetMaterialLayer(item,asset.materials,'glass'), t=map.panel;
 const posts=[-w/2+t/2,...map.modules.filter(m=>m.kind==='divider').map(m=>m.xM),w/2-t/2];
 return <group name={`${item.id}-r09-three-swing`} userData={{mapping:map,sourceObjectId:item.id,materialTokensUnchanged:true}}>
  {cycle&&active&&(()=>{const origin=r11CycleSource.closet.originGlobalMm,dx=(origin[0]+cycle.body[0]-item.position.x*120)/1000,dz=(origin[1]+cycle.body[1]-item.position.y*90)/1000,r=(item.position.rotation??0)*Math.PI/180;return <mesh name="R11-C1-full600-body-proxy" userData={{auditEntityId:'R11-C1-body',auditKind:'human-proxy',auditNonPhysical:true,cycleFrame:cycle.frame,sourceBodyLocalMm:cycle.body,sourceAngle:cycle.angle,sourceTravel:cycle.travel}} position={[Math.cos(r)*dx+Math.sin(r)*dz,.85-h/2,-Math.sin(r)*dx+Math.cos(r)*dz]}><cylinderGeometry args={[.3,.3,1.7,48]}/><meshStandardMaterial color="#3d8aa0" transparent opacity={.27} depthWrite={false}/></mesh>;})()}
  {posts.map((x,i)=><group key={i} name={`${item.id}-adjustable-upright-${i}`}>
   <RoundedPart name={`${item.id}-metal-post-${i}`} size={[t,h,.018]} position={[x,0,-d/2+.009]} radius={.003} material={metal} role="metal"/>
   {Array.from({length:23},(_,j)=><RoundedPart key={j} name={`${item.id}-slot-${i}-${j}`} size={[.006,.016,.003]} position={[x,-h/2+.12+j*.10,-d/2+.020]} radius={.001} material={hardware} role="metal" color="#171919"/>)}
  </group>)}
  {[-1,1].map(s=><RoundedPart key={s} name={`${item.id}-metal-frame-${s}`} size={[w,t,d]} position={[0,s*(h/2-t/2),0]} radius={.003} material={metal} role="metal"/>)}
  {map.modules.map(m=>{
   if(m.kind==='divider')return null;
   if(m.kind==='hanging')return <group key={m.id} name={`${item.id}-module-${m.id}`} userData={{sourceModuleId:m.id,moduleKind:m.kind}}>
    <CylinderPart name={`${m.id}-rail`} radiusTop={.012} height={m.widthM*.88} position={[m.xM,m.yM+m.heightM/2,m.zM]} rotation={[0,0,Math.PI/2]} material={hardware} role="metal"/>
   </group>;
   if(m.physicalPartRef)return <group key={m.id} name={`${item.id}-module-${m.id}`} userData={{sourceModuleId:m.id,physicalPartRef:m.physicalPartRef}}/>;
   const drawer=m.kind==='drawer';
   const pos:[number,number,number]=[m.xM,m.yM,m.zM+(drawer?travel/1000:0)];
   if(drawer)return <group key={m.id} name={`${item.id}-module-${m.id}`} position={pos} userData={{sourceModuleId:m.id,moduleKind:m.kind,drawerTravelMm:travel}}>
    <RoundedPart name={`${m.id}-bottom`} size={[m.widthM,.018,m.depthM]} position={[0,-m.heightM/2+.009,0]} radius={.002} material={metal} role="metal"/>
    {[-1,1].map(s=><RoundedPart key={s} name={`${m.id}-side-${s}`} size={[.018,m.heightM-.018,m.depthM]} position={[s*(m.widthM/2-.009),.009,0]} radius={.002} material={metal} role="metal"/>)}
    {[-1,1].map(s=><RoundedPart key={s} name={`${m.id}-end-${s}`} size={[m.widthM-.036,m.heightM-.018,.018]} position={[0,.009,s*(m.depthM/2-.009)]} radius={.002} material={metal} role="metal"/>)}
    <RoundedPart name={`${m.id}-pull`} size={[.14,.018,.012]} position={[0,0,m.depthM/2+.007]} radius={.002} material={hardware} role="metal"/>
   </group>;
   return <RoundedPart key={m.id} name={`${item.id}-module-${m.id}`} userData={{sourceModuleId:m.id,moduleKind:m.kind}} size={[m.widthM,m.heightM,m.depthM]} position={pos} radius={.004} material={metal} role="metal"/>;
  })}
  {item.render3d?.cabinetVisual?.interiorLighting&&<mesh name={`${item.id}-source-interior-light-strip`} position={[0,h/2-.055,-d/2+.065]}><boxGeometry args={[w-.09,.014,.015]}/><meshStandardMaterial color="#ffe2b2" emissive="#ffd394" emissiveIntensity={.82}/></mesh>}
  {Array.from({length:map.count},(_,i)=>{
   const c=-w/2+map.gap+map.doorWidth/2+i*(map.doorWidth+map.gap),hinge=map.hingeSides[i],leafX=-hinge*map.doorWidth/2;
   return <group key={i} name={`${item.id}-cabinet-door-${i}`} position={[c+hinge*map.doorWidth/2,0,map.frontZ]} rotation={[0,angles[i]*Math.PI/180*hinge,0]}
    userData={{doorIndex:i,openingMode:'swing',hingeSide:hinge,angleDegrees:angles[i],leafCount:map.count,materialPart:'smokedGlassDoor'}}
    onClick={e=>{e.stopPropagation();if(!cycle)setAngles(a=>a.map((v,j)=>j===i?(v?0:80):v));}}>
    <RoundedPart name={`${item.id}-door-glass-${i}`} size={[map.doorWidth-2*t,map.doorHeight-2*t,.008]} position={[leafX,0,0]} radius={.002} material={glass} role="glass"/>
    {[-1,1].map(s=><RoundedPart key={`v${s}`} name={`${item.id}-door-frame-${i}-v${s}`} size={[t,map.doorHeight,.024]} position={[leafX+s*(map.doorWidth/2-t/2),0,0]} radius={.002} material={hardware} role="metal"/>)}
    {[-1,1].map(s=><RoundedPart key={`h${s}`} name={`${item.id}-door-frame-${i}-h${s}`} size={[map.doorWidth,t,.024]} position={[leafX,s*(map.doorHeight/2-t/2),0]} radius={.002} material={hardware} role="metal"/>)}
    <RoundedPart name={`${item.id}-door-pull-${i}`} size={[.012,.22,.026]} position={[leafX-hinge*(map.doorWidth/2-.045),-.12,.026]} radius={.003} material={hardware} role="metal"/>
   </group>;
  })}
 </group>;
}
