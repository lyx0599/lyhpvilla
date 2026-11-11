"use client";
import{useSearchParams}from'next/navigation';import type{FurnitureFamily3DProps}from'./types';
export const hasCal5900Media=(p:FurnitureFamily3DProps)=>String((p.item.render3d as{geometryContractId?:string})?.geometryContractId??'').startsWith('CAL5900-new-m');
function Part({name,size,p,color='#b8aa95',glow=false}:{name:string;size:[number,number,number];p:[number,number,number];color?:string;glow?:boolean}){return <mesh name={name}position={p}castShadow receiveShadow userData={{auditEntityId:'CAL5900-media:'+name,auditKind:'cal5900-media',auditPart:name}}><boxGeometry args={size}/><meshStandardMaterial color={color}roughness={.6}emissive={glow?'#dd8034':'#000000'}emissiveIntensity={glow?.6:0}/></mesh>}
export function Cal5900Media(props:FurnitureFamily3DProps){const q=useSearchParams(),floor=-props.height/2,mobile=(props.item.render3d as{geometryContractId?:string})?.geometryContractId==='CAL5900-new-mobile1300';
if(mobile){const use=q.get('tvState')==='use',x=use?8000:9850,y=use?7900:8550,a=use?180:90,owner=props.item.position;return <group rotation={[0,owner.rotation*Math.PI/180,0]}><group position={[(x-owner.x*120)/1000,0,(y-owner.y*90)/1000]}rotation={[0,-a*Math.PI/180,0]}name="CAL5900-new-mobile-TV-proposal"><Part name="mobile-crossbase"size={[1.0,.06,.58]}p={[0,floor+.13,0]}color="#4e5350"/><Part name="mobile-pole"size={[.08,1.2,.08]}p={[0,floor+.78,0]}color="#4e5350"/>{[-1,1].flatMap(s=>[-1,1].map(t=><Part key={s+':'+t}name={'mobile-wheel-'+s+'-'+t}size={[.09,.10,.07]}p={[s*.45,floor+.055,t*.25]}color="#333936"/>))}<Part name="mobile-preserved-frame1269"size={[1.269,.74225,.026]}p={[0,floor+1.18,.02]}color="#353d3a"/><Part name="mobile-preserved-screen1204"size={[1.204,.67725,.025]}p={[0,floor+1.18,.055]}color="#151d1a"/></group></group>}
return <group name="CAL5900-new2200-media-redesign-not-scaled2500">
 <Part name="media2200-back"size={[2.2,1.776,.05]}p={[0,floor+.888,-.15]}color="#e3ddd0"/>
 {[-1,1].map(s=><group key={s}><Part name={'media2200-niche-back-'+s}size={[.25,1.5984,.126]}p={[s*.925,floor+.888,-.025]}color="#ab8d69"/><Part name={'media2200-niche-base-'+s}size={[.25,.5328,.168]}p={[s*.925,floor+.3064,.02]}color="#ab8d69"/>{[.5878,1.12,1.5].map(h=><Part key={h}name={'media2200-shelf-'+s+'-'+h}size={[.25,h===.5878?.045:.025,.175]}p={[s*.925,floor+h,.02]}color="#ab8d69"/>)}<Part name={'media2200-retained-display-'+s}size={s<0?[.12,.136,.096]:[.12,.12,.072]}p={[s*.925,floor+.6758,.11]}color={s<0?'#e0d3ba':'#5e5948'}/></group>)}
 <Part name="media2200-preserved-frame1269"size={[1.269,.74225,.026]}p={[0,floor+1.21,.11]}color="#514c45"/>
 <Part name="media2200-preserved-screen1204"size={[1.204,.67725,.025]}p={[0,floor+1.21,.14]}color="#151b18"/>
 <Part name="media2200-preserved-surround1078"size={[1.078,.3,.035]}p={[0,floor+.55,.095]}color="#b8ac97"/>
 <Part name="media2200-preserved-fireplace1008"size={[1.008,.22,.04]}p={[0,floor+.55,.125]}color="#282c29"/>
 <Part name="media2200-preserved-fire-glow"size={[.82656,.018,.012]}p={[0,floor+.50,.16]}color="#cc9e63"glow/>
 <Part name="media2200-preserved-console1400"size={[1.4,.34,.32]}p={[0,floor+.23,0]}color="#9d805c"/>
 </group>}
