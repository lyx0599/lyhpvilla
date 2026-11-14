"use client";
import {useSearchParams} from 'next/navigation';
import type {Furniture} from '@/types/space';
import contract from '@/data/north-bath-geometry.json';
function Box({name,p,size,color='#d6d1c4',glass=false,kind}:{name:string;p:[number,number,number];size:[number,number,number];color?:string;glass?:boolean;kind?:string}){return <mesh name={name} position={p} userData={{auditPart:name,...(kind?{auditKind:kind}:{})}} castShadow receiveShadow><boxGeometry args={size}/>{glass?<meshPhysicalMaterial color={color} transparent opacity={.3} roughness={.1}/>:<meshStandardMaterial color={color} roughness={.6}/>}</mesh>;}
function NorthShower(){
 const q=useSearchParams(),amount=Math.max(0,Math.min(1,Number(q.get('northShower')??0)));
 const W=contract.rearWidthMm/1000,D=.9,H=2.1,hinge=contract.frontDoor.hingeXmm/1000-(contract.westMm+contract.eastMm)/2000,L=.76,front=.45;
 const left=hinge+W/2,right=W/2-hinge-L;
 return <>
 <Box name="north-wet-floor" p={[0,.0005,0]} size={[W,.001,D]} color="#dfd5c6" kind="floor-finish"/>
 <Box name="north-front-fixed-west" p={[-W/2+left/2,H/2,front]} size={[left-.024,H,.008]} glass color="#c6e0df"/>
 <Box name="north-front-fixed-east" p={[hinge+L+right/2,H/2,front]} size={[right-.024,H,.008]} glass color="#c6e0df"/>
 {[-W/2+.01,W/2-.01,hinge-.016,hinge+L+.016].map((x,i)=><Box key={i} name={'north-front-post-'+i} p={[x,H/2,front]} size={[.012,H,.024]} color="#5c5b55"/>)}
 <Box name="north-front-header" p={[0,H-.008,front]} size={[W,.016,.024]} color="#5c5b55"/>
 <group name="north-real-shower-hinged-leaf" position={[hinge,0,front]} rotation={[0,amount*Math.PI/2,0]} userData={{auditKind:'hinged-leaf',openingFraction:amount}}>
 <Box name="north-shower-moving-glass" p={[L/2,1.012,0]} size={[L-.008,2,.008]} glass color="#c6e0df"/>
 {[-1,1].map(sign=><Box key={sign} name={'north-shower-handle-'+sign} p={[L-.075,1.02,sign*.034]} size={[.018,.28,.012]} color="#5e5c54"/>)}
 </group>
 <Box name="north-shower-mixer" p={[-W/2+.055,1.06,-.12]} size={[.08,.08,.2]} color="#878c89"/>
 <Box name="north-shower-column" p={[-W/2+.05,1.47,-.12]} size={[.018,.9,.018]} color="#878c89"/>
 <Box name="north-shower-head" p={[-W/2+.16,2,-.12]} size={[.24,.018,.2]} color="#a9adab"/>
 <Box name="north-shower-linear-drain" p={[0,.003,-.4]} size={[W-.12,.006,.035]} color="#757c79" kind="floor-finish"/>
 </>;
}
function NorthVanity(){return <>
 <Box name="north-official-cabinet904x462x500" p={[0,.48,-.0125]} size={[.904,.5,.462]} color="#706759"/>
 {[-1,1].map((sign,i)=><group key={i}><Box name={'north-cabinet-front-'+i} p={[sign*.226,.48,.2095]} size={[.448,.494,.018]} color="#857a67"/><Box name={'north-cabinet-handle-'+i} p={[sign*.226,.68,.231]} size={[.25,.012,.025]} color="#575a55"/></group>)}
 <Box name="north-official-basin925x475-total-envelope" p={[0,.814,-.006]} size={[.925,.072,.475]} color="#f0eee6"/>
 <mesh name="north-basin-bowl" position={[0,.757,.015]} scale={[.29,.093,.16]}><sphereGeometry args={[1,24,14]}/><meshStandardMaterial color="#e9e9e1" roughness={.3}/></mesh>
 <Box name="north-faucet-base" p={[0,.96,-.14]} size={[.038,.22,.038]} color="#a5aaa5"/>
 <Box name="north-faucet-spout" p={[0,1.06,-.09]} size={[.035,.03,.12]} color="#a5aaa5"/>
 <Box name="north-mirror-cabinet" p={[0,1.63,-.1885]} size={[.9,.95,.11]} color="#68746e"/>
 <Box name="north-mirror-face" p={[0,1.63,-.1315]} size={[.87,.92,.004]} color="#bccdca"/>
 </>;}
export function R02NorthBathAsset({item}:{item:Furniture}){
 const x=(item.position.x*120-6000)/1000,z=(item.position.y*90-4500)/1000;
 return <group name={'north-source-'+item.id} userData={{auditEntityId:item.id,auditKind:'furniture'}} position={[x,.018,z]} rotation={[0,-item.position.rotation*Math.PI/180,0]}>{item.render3d?.variantId==='r02SourceNorthShower'?<NorthShower/>:<NorthVanity/>}</group>;
}
