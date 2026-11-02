"use client";
import type {HouseStructure,Furniture} from '@/types/space';
// Independent research adapter: one HouseDoor owns the exact front aperture.
// The rectangular source envelope is not a measured sloping stair soffit.
export function B2LowdoorStudy({item,structure,width,depth,height,groupY}:{item:Furniture;structure:HouseStructure;width:number;depth:number;height:number;groupY:number}){
 const door=structure.doors.find(d=>d.id==='D-B2-STORAGE-001');if(!door)return null;
 const host=structure.walls.find(w=>w.id===door.hostId);if(!host||host.kind!=='straight')return null;
 const cx=host.start.x+(host.end.x-host.start.x)*door.positionOnWall,cy=host.start.y+(host.end.y-host.start.y)*door.positionOnWall;
 const localX=(cx-item.position.x*structure.coordinateSystem.width/100)/1000,frontZ=(cy-item.position.y*structure.coordinateSystem.height/100)/1000;
 const x0=-width/2,x1=width/2,l=localX-door.width/2000,r=localX+door.width/2000,h=door.height/1000;
 const box=(name:string,a:number,b:number,z0:number,z1:number,y0:number,y1:number)=><mesh key={name} name={name} position={[(a+b)/2,(y0+y1)/2-groupY,(z0+z1)/2]} castShadow receiveShadow><boxGeometry args={[b-a,y1-y0,z1-z0]}/><meshStandardMaterial color='#d4cbbb' roughness={.87}/></mesh>;
 return <group name="B2-R5-HouseDoor-exact-aperture" userData={{doorId:door.id,worldApertureXmm:[cx-door.width/2,cx+door.width/2],worldApertureYmm:cy,doorHeightMm:door.height,stairSoffitUnmeasured:true}}>
  {box('B2-R5-front-west-exact',x0,l,frontZ-.045,frontZ+.045,.035,height+.035)}
  {box('B2-R5-front-east-exact',r,x1,frontZ-.045,frontZ+.045,.035,height+.035)}
  {box('B2-R5-above-door-exact',l,r,frontZ-.045,frontZ+.045,h,height+.035)}
  {box('B2-R5-side-envelope',x1-.08,x1,-depth/2,depth/2,.035,height+.035)}
  {/* Old hard-coded seven segments, bins, shelf rods and threshold trim are
      deliberately not evidence. Storage zoning remains unverified. */}
 </group>;
}
