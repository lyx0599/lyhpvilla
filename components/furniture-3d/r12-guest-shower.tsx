'use client';
import {useSearchParams} from 'next/navigation';
import {Box} from '@/components/r11-integrated-primitives';
import type {FurnitureFamily3DProps} from './types';
const metal='#8c795f';
export const isR12GuestShower=(p:FurnitureFamily3DProps)=>p.item.id==='furn-2f-guest-shower-001'&&(p.item.render3d as {geometryContractId?:string}|undefined)?.geometryContractId==='R12-guest-normal900-corner-slide';
// The original 2F R12 candidate's new normal900 design, attached to the real
// furniture root. Reference local origin is the shower NW corner, not a second
// room shell. Full WC/vanity remain the existing ordinary native components.
export function R12GuestShower(p:FurnitureFamily3DProps){
 const q=useSearchParams(),east=Math.max(0,Math.min(440,Number(q.get('guestEastSlide')??0))),south=Math.max(0,Math.min(440,Number(q.get('guestSouthSlide')??0)));
 return <group name="R12-guest-new900-local" position={[-.45,-p.height/2,-.45]}>
  <Box name="guest-shower-new900-square-wet-floor" b={[0,0,900,900]} z={[-8,0]} color="#a5b2a4"/>
  <Box name="guest-fixed-south" b={[0,870,455,880]} z={[20,2100]} color="#88b9c5" opacity={.25}/><Box name="guest-fixed-east" b={[870,0,880,455]} z={[20,2100]} color="#88b9c5" opacity={.25}/>
  <group name="guest-south-moving-glass" position={[-south/1000,0,0]}><Box name="guest-south-slider" b={[440,890,890,900]} z={[20,2100]} color="#a6cbd2" opacity={.3}/><Box name="guest-south-outside-pull" b={[850,915,870,935]} z={[950,1150]} color={metal}/><Box name="guest-south-inside-pull" b={[850,855,870,875]} z={[950,1150]} color={metal}/></group>
  <group name="guest-east-moving-glass" position={[0,0,-east/1000]}><Box name="guest-east-slider" b={[890,440,900,890]} z={[20,2100]} color="#a6cbd2" opacity={.3}/><Box name="guest-east-outside-pull" b={[915,850,935,870]} z={[950,1150]} color={metal}/><Box name="guest-east-inside-pull" b={[855,850,875,870]} z={[950,1150]} color={metal}/></group>
  {[0,1].map(i=><group key={i}><Box name={'guest-south-track-'+i} b={[0,868+i*20,900,878+i*20]} z={[2100,2130]} color={metal}/><Box name={'guest-east-track-'+i} b={[868+i*20,0,878+i*20,900]} z={[2100,2130]} color={metal}/></group>)}
  <Box name="guest-south20-water-rail" b={[0,870,900,900]} z={[0,20]} color={metal}/><Box name="guest-east20-water-rail" b={[870,0,900,900]} z={[0,20]} color={metal}/>
  <Box name="guest-shower-column" b={[0,160,40,190]} z={[700,2050]} color={metal}/><Box name="guest-shower-head" b={[20,140,250,340]} z={[2030,2050]} color={metal}/><Box name="guest-shower-drain" b={[70,100,110,600]} z={[0,3]} color="#5c6a60"/>
 </group>;
}
