"use client";
import type {Furniture} from '@/types/space';
import {getC03ADesignTransform,hasC03ADesignContract} from '@/lib/c03a-design-contract';
export const hasC03AStudy=hasC03ADesignContract;
export function YardC03AStudy({item,height}:{item:Furniture;height:number}){
 const transform=getC03ADesignTransform(item,height);if(!transform)return null;
 const ref=transform.reference,bx=ref.xMm,by=ref.yMm,elevation=ref.elevationMm,referenceHeight=ref.heightMm/1000;
 const box=(name:string,x0:number,y0:number,x1:number,y1:number,z0:number,z1:number,color='#6b6a5e',metal=false)=><mesh name={name} key={name} position={[(x0+x1)/2000-bx/1000,-referenceHeight/2+(z0+z1)/2000-elevation/1000,(y0+y1)/2000-by/1000]} castShadow receiveShadow><boxGeometry args={[(x1-x0)/1000,(z1-z0)/1000,(y1-y0)/1000]}/><meshStandardMaterial color={color} roughness={metal?.32:.74} metalness={metal?.65:.12}/></mesh>;
 const cap=(name:string,x0:number,y0:number,x1:number,y1:number,z0:number,z1:number)=>box(name,x0,y0,x1,y1,z0,z1,'#b8b3a5');
 let content;
 if(item.id==='OUT-N-KITCHEN-ISLAND')content=<>
  {box('C03A-sink-back',9387,-1550,9405,-850,120,868)}
  {box('C03A-sink-end-north',8855,-1550,9405,-1532,120,868)}{box('C03A-sink-end-south',8855,-868,9405,-850,120,868)}
  {box('C03A-sink-plinth',8855,-1550,9405,-850,0,120,'#55564f')}
  {box('C03A-service-two-panels-north',8855,-1532,8873,-1201,120,720)}{box('C03A-service-two-panels-south',8855,-1199,8873,-868,120,720)}
  {box('C03A-service-frame-above',8855,-1532,8873,-868,720,868)}
  {cap('C03A-counter-near-45',8855,-1550,8900,-850,868,900)}{cap('C03A-counter-far',9280,-1550,9405,-850,868,900)}
  {cap('C03A-counter-north',8900,-1550,9280,-1420,868,900)}{cap('C03A-counter-south',8900,-980,9280,-850,868,900)}
  {box('C03A-basin-bottom-reference',8920,-1400,9260,-1000,750,758,'#9b9f9b',true)}
  {box('C03A-basin-near-wall-reference',8912,-1400,8920,-1000,750,900,'#9b9f9b',true)}{box('C03A-basin-far-wall-reference',9260,-1400,9268,-1000,750,900,'#9b9f9b',true)}
  {box('C03A-basin-north-wall-reference',8920,-1408,9260,-1400,750,900,'#9b9f9b',true)}{box('C03A-basin-south-wall-reference',8920,-1000,9260,-992,750,900,'#9b9f9b',true)}
  {box('C03A-basin-rim-near-35',8890,-1430,8920,-970,896,900,'#aeb1ac',true)}{box('C03A-basin-rim-far',9260,-1430,9290,-970,896,900,'#aeb1ac',true)}
  {box('C03A-basin-rim-north',8920,-1430,9260,-1400,896,900,'#aeb1ac',true)}{box('C03A-basin-rim-south',8920,-1000,9260,-970,896,900,'#aeb1ac',true)}
  {box('C03A-unselected-tap-body',8938,-1502,8962,-1478,900,1050,'#6b706b',true)}
  {box('C03A-unselected-170-spout',8940,-1490,8960,-1320,1010,1030,'#6b706b',true)}
  {box('C03A-unselected-control',8925,-1515,8975,-1465,1040,1050,'#6b706b',true)}
 </>;
 else if(item.id==='OUT-N-BBQ')content=<>
  {cap('C03A-cold-park-support',5276,-1550,5926,-1100,870,900)}
  {[5296,5886].flatMap((x,i)=>[-1530,-1140].map((y,j)=>box(`C03A-unselected-support-leg-${i}-${j}`,x,y,x+20,y+20,0,870,'#4b4f48',true)))}
  {box('C03A-SAME-grill-cold-reference-only',5334,-1480,5868,-1170,900,1269,'#30332f',true)}
 </>;
 else {
  const w=ref.widthMm,d=ref.depthMm,h=ref.heightMm,x0=bx-w/2,y0=by-d/2,x1=bx+w/2,y1=by+d/2,z=elevation;
  content=<>{box(item.id+'-carcass',x0,y0,x1,y1,z,z+h-32)}{cap(item.id+'-top',x0,y0,x1,y1,z+h-32,z+h)}{box(item.id+'-two-door-seam',bx-1,y1-1,bx+1,y1,z+40,z+h-50,'#383d36')}</>;
 }
 return <group name="C03A-exact-source-interface-study" rotation={[0,transform.rotationY,0]}><group scale={transform.scale}>{content}</group></group>;
}
