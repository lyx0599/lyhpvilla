"use client";
import {useSearchParams} from 'next/navigation';
import type {HouseDoor,HouseStructure} from '@/types/space';

/** D003 only.900 is the structural portal, not a900 leaf forced into its frame.
 * Concept installation dimensions, not a selected product or field anchor design.
 * Original30 relief blocks and72mm knob retain their actual dimensions.
 */
export function OneFD003Fit({door,structure}:{door:HouseDoor;structure:HouseStructure}){
 const query=useSearchParams(),host=structure.walls.find(w=>w.id===door.hostId);
 if(!host||!('start'in host)||!('end'in host)||door.hostId!=='W-1F-012'||door.width!==900||door.height!==2100)throw new Error('D003 fit requires its declared north900x2100 portal');
 const dx=host.end.x-host.start.x,dy=host.end.y-host.start.y,cx=host.start.x+dx*door.positionOnWall,cy=host.start.y+dy*door.positionOnWall;
 const requested=Number(query.get('d003')??((door.defaultOpenAmount??.82)*72)),angle=Math.max(0,Math.min(90,requested));
 const wood=door.visual?.woodColor??'#9a7654',frame=door.visual?.frameColor??'#8f704f',metal=door.visual?.hardwareColor??'#8a6844';
 const frameCentre=.42475,pivot=.4015,hingePlane=.128,leafW=.803,leafH=2.0255,bottom=.026,leafMid=bottom+leafH/2;
 const box=(name:string,size:[number,number,number],position:[number,number,number],color:string)=> <mesh key={name} name={name} position={position} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.7}/></mesh>;
 return <group name="D003-R04-north-portal-concept-fit" position={[(cx-structure.coordinateSystem.width/2)/1000,0,(cy-structure.coordinateSystem.height/2)/1000]} rotation={[0,-Math.atan2(dy,dx),0]} userData={{auditEntityId:door.id,auditKind:'door-installation-concept',nominalPortalMm:[900,2100],frameOuterWidthMm:890,frameClearWidthMm:809,leafCoreMm:[803,2025.5,55],selectedProduct:false,fieldAnchorVerified:false}}>
  {[-1,1].map(s=>box(`D003-fit-jamb-${s}`,[.0405,2.095,.220],[s*frameCentre,2.095/2,0],frame))}
  {box('D003-fit-header',[.809,.0405,.220],[0,2.07475,0],frame)}
  {[-1,1].flatMap(s=>[.25,1.05,1.90].map((y,i)=>box(`D003-fit5mm-installation-packer-${s}-${i}`,[.005,.080,.180],[s*.4475,y,0],frame)))}
  {[-.25,.25].map((x,i)=>box(`D003-fit5mm-head-packer-${i}`,[.080,.005,.180],[x,2.0975,0],frame))}
  <group name="D003-fit-fixed-hinge-connection" userData={{auditEntityId:door.id,auditKind:'door-fixed-hinge-mount',conceptNotOEM:true}}>
   {box('D003-fit-continuous-room-side-liner',[.020,2.0365,.0205],[pivot+.014,1.03625,.11825],frame)}
   {[.25,1.05,1.90].map((y,i)=><group key={i}>
    <mesh name={`D003-fit-hinge-barrel-${i}`} position={[pivot,y,hingePlane]}><cylinderGeometry args={[.006,.006,.080,16]}/><meshStandardMaterial color={metal} metalness={.65}/></mesh>
    {box(`D003-fit-fixed-hinge-plate-${i}`,[.020,.080,.003],[pivot+.014,y,hingePlane],metal)}
    <mesh name={`D003-fit-frame-screw-${i}`} position={[pivot+.014,y,.1155]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.004,.004,.050,12]}/><meshStandardMaterial color={metal} metalness={.65}/></mesh>
   </group>)}
  </group>
  <group name="D003-R04-full-moving-leaf-and-original-relief" position={[pivot,0,hingePlane]} rotation={[0,angle*Math.PI/180,0]} userData={{auditEntityId:door.id,auditKind:'d003-leaf',actualAngleDeg:angle,leafBottomMm:26,leafHeightMm:2025.5,leafWidthMm:803,nominalPortalWidthMm:900,originalReliefDimensionsRetained:true}}>
   {box('D003-fit-803x2025_5x55-leaf',[leafW,leafH,.055],[-leafW/2,leafMid,-.0275],wood)}
   {Array.from({length:30},(_,i)=>{const col=i%3,row=Math.floor(i/3);return <mesh key={i} name={`D003-original-woven-block-${i}`} position={[-leafW/2+.162+(col-1)*.0585,1.05+(row-4.5)*.1638,.0066]} rotation={[0,0,(col+row)%2?.08:-.08]}><boxGeometry args={[.0648,.1386,.024]}/><meshStandardMaterial color={i%2?'#b08b61':'#c19b6e'} roughness={.68}/></mesh>;})}
   <mesh name="D003-original72mm-knob-99mm-backset" position={[-leafW+.099,1.05,.0231]}><sphereGeometry args={[.036,16,10]}/><meshStandardMaterial color={metal} metalness={.72} roughness={.24}/></mesh>
   <mesh name="D003-matching-public-side72mm-knob-99mm-backset" position={[-leafW+.099,1.05,-.0781]}><sphereGeometry args={[.036,16,10]}/><meshStandardMaterial color={metal} metalness={.72} roughness={.24}/></mesh>
  </group>
 </group>;
}
