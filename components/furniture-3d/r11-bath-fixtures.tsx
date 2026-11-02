'use client';
import {useSearchParams} from 'next/navigation';
import type {FurnitureFamily3DProps} from './types';
import {Box,Tub,Vanity} from '@/components/r11-integrated-primitives';
import type {HouseStructure} from '@/types/space';
const metal='#8c795f';
const refs:Record<string,{anchor:number[],rotation:number}>={
 'furn-2f-master-bathtub-001':{anchor:[1130,350],rotation:0},
 'furn-2f-master-vanity-001':{anchor:[2035,1860],rotation:90},
 'furn-2f-master-shower-001':{anchor:[480,2030],rotation:0},
};
export function hasR11BathFixture(props:FurnitureFamily3DProps){
 return Boolean(refs[props.item.id]) && props.item.note?.includes('G02/R11');
}
// The source authored in room-local coordinates is attached to the actual
// stable furniture transform. No extra isolated room or duplicate fixtures.
export function R11BathFixture(props:FurnitureFamily3DProps){
 const ref=refs[props.item.id],q=useSearchParams(),action=q.get('bathAction')??'closed';
 const shower=Math.max(0,Math.min(1,Number(q.get('showerOpen')??(action==='showerOpen'?1:0))));
 return <group rotation={[0,ref.rotation*Math.PI/180,0]}>
  <group position={[-ref.anchor[0]/1000,-props.height/2,-ref.anchor[1]/1000]} name={`${props.item.id}-r11-authored-local`}>
   {props.item.id==='furn-2f-master-bathtub-001'&&<>
    <Tub width={2260}/><Box name="tub-normal200-step" b={[1250,700,1750,1000]} z={[0,200]} color="#a5a895"/>
    {Array.from({length:9},(_,i)=><Box key={i} name={'step-antislip-rib-'+i} b={[1260+i*55,710,1268+i*55,990]} z={[200,203]} color="#737b69"/>)}
    <Box name="tub-rail-floor-base" b={[1810,810,1890,890]} z={[0,12]} color={metal}/>
    <Box name="tub-rail-floor-post" b={[1834,834,1866,866]} z={[0,1150]} color={metal}/>
    <Box name="tub-rail-grip" b={[1834,650,1866,1000]} z={[1134,1166]} color={metal}/>
   </>}
   {props.item.id==='furn-2f-master-vanity-001'&&<Vanity width={2260} action={action}/>}
   {props.item.id==='furn-2f-master-shower-001'&&<>
    <Box name="shower-wet-floor" b={[0,1400,960,2660]} z={[-8,0]} color="#a5aca0"/>
    <Box name="glass1-north-fixed" b={[0,1390,950,1400]} z={[20,2100]} color="#8cbbc5" opacity={.24}/>
    <Box name="glass2-east-south-fixed" b={[930,2100,940,2660]} z={[20,2100]} color="#8cbbc5" opacity={.24}/>
    <group name="shower-normal700-outward-leaf" position={[.955,0,2.1]} rotation={[0,-shower*Math.PI/2,0]}>
     <Box name="glass3-moving-leaf" b={[-5,-700,5,0]} z={[20,2100]} color="#a3cad0" opacity={.28}/>
     <Box name="shower-free-edge-frame" b={[-8,-700,8,-680]} z={[20,2100]} color={metal}/>
     <Box name="shower-inner-pull" b={[-30,-650,-10,-630]} z={[940,1160]} color={metal}/>
     <Box name="shower-outer-pull" b={[20,-650,40,-630]} z={[940,1160]} color={metal}/>
    </group>
    {[600,1850].map(z=><Box key={z} name={'ordinary-hinge-'+z} b={[940,2085,970,2115]} z={[z,z+70]} color={metal}/>)}
    <Box name="north-top-support-channel" b={[0,1385,955,1405]} z={[2100,2130]} color={metal}/>
    <Box name="south-fixed-top-support-channel" b={[925,2100,945,2660]} z={[2100,2130]} color={metal}/>
    <Box name="shower-bottom20-water-rail" b={[925,1400,965,2660]} z={[0,20]} color={metal}/>
    <Box name="north-fixed-bottom-channel" b={[0,1385,950,1405]} z={[0,20]} color={metal}/>
    <Box name="shower-column" b={[0,1700,45,1730]} z={[700,2050]} color={metal}/>
    <Box name="shower-head" b={[20,1660,260,1860]} z={[2030,2050]} color={metal}/>
    <Box name="shower-drain" b={[70,2170,110,2570]} z={[0,3]} color="#4c5a54"/>
   </>}
  </group>
 </group>;
}
export function R11BathEntry({structure,door}:{structure:HouseStructure,door:HouseStructure['doors'][number]}){
 const q=useSearchParams(),travel=Math.max(0,Math.min(1,Number(q.get('entryOpen')??0)));
 const wall=structure.walls.find(w=>w.id===door.hostId);
 if(!wall || !('start' in wall)) return null;
 const cx=wall.start.x+(wall.end.x-wall.start.x)*door.positionOnWall;
 const cy=wall.start.y+(wall.end.y-wall.start.y)*door.positionOnWall;
 const origin={x:cx-1325,y:cy-2840},c=structure.coordinateSystem;
 const leaf=[850-775*travel,2730,1800-775*travel,2750];
 return <group name="D-2F-007-r11-host-bound-entry" userData={{auditEntityId:door.id,auditKind:'door',hostId:door.hostId,travelMm:775*travel}} position={[(origin.x-c.origin.x-c.width/2)/1000,.035,(origin.y-c.origin.y-c.height/2)/1000]}>
  {[875,1775].map(x=><Box key={x} name={'entry-jamb-'+x} b={[x-10,2760,x+10,2920]} z={[0,2300]} color={metal}/>)}
  <Box name="entry-header" b={[865,2760,1785,2920]} z={[2300,2320]} color={metal}/>
  <Box name="entry-slider-glass" b={leaf} z={[0,2300]} color="#a0c3c7" opacity={.23}/>
  <Box name="entry-upper-track" b={[65,2725,1810,2755]} z={[2300,2330]} color={metal}/>
  <Box name="entry-leading-graspable20mm-frame" b={[leaf[2]-20,2715,leaf[2],2755]} z={[0,2300]} color={metal}/>
  <Box name="entry-outside-pull" b={[leaf[2]-85,2750,leaf[2]-65,2775]} z={[940,1160]} color={metal}/>
 </group>;
}
