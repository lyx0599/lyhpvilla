"use client";
import {useMemo} from "react";
import * as THREE from "three";
// Geometry reused from the original R11 native authoring source.
const metal='#8e7757',stone='#e4dbca',wood='#73604b';
export function Box({name,b,z=[0,1000],color=stone,opacity=1}:{name:string,b:number[],z?:number[],color?:string,opacity?:number}){
 return <mesh name={name} position={[(b[0]+b[2])/2000,(z[0]+z[1])/2000,(b[1]+b[3])/2000]} castShadow={opacity===1} receiveShadow>
  <boxGeometry args={[(b[2]-b[0])/1000,(z[1]-z[0])/1000,(b[3]-b[1])/1000]}/><meshStandardMaterial color={color} roughness={opacity<1?.15:.6} metalness={color===metal?.7:0} transparent={opacity<1} opacity={opacity} depthWrite={opacity===1}/>
 </mesh>;
}
export function Tub({width}:{width:number}){
 const geo=useMemo(()=>new THREE.LatheGeometry([new THREE.Vector2(0,.08),new THREE.Vector2(.82,.08),new THREE.Vector2(.95,.20),new THREE.Vector2(1,.6),new THREE.Vector2(.93,.6),new THREE.Vector2(.81,.17),new THREE.Vector2(0,.17)],80),[]);
 return <group name="r11-bathtub-native" position={[width/2000,0,.35]}>
  <mesh geometry={geo} scale={[.85,1,.35]} castShadow receiveShadow><meshStandardMaterial color="#faf7ef" roughness={.18}/></mesh>
  <mesh position={[-.72,.60,-.22]}><cylinderGeometry args={[.018,.018,.55,16]}/><meshStandardMaterial color={metal} metalness={.7}/></mesh>
  <Box name="tub-spout" b={[-730,-230,-530,-205]} z={[850,875]} color={metal}/>
 </group>;
}
export function Vanity({width,action}:{width:number,action:string}){
 const ext=[action==='windowDrawer'?.3:0,action==='doorDrawer'?.2:0];
 function local(name:string,x:number,y:number,z:number,w:number,h:number,d:number,c=wood){return <mesh key={name} name={name} position={[x,y,z]} castShadow receiveShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color={c} roughness={c===metal?.25:.48} metalness={c===metal?.7:0}/></mesh>}
 return <group name="r11-vanity-native" position={[(width-225)/1000,0,1.86]} rotation={[0,-Math.PI/2,0]}>
  {local('left-side',-.79,.545,-.02,.02,.57,.41)}{local('right-side',.79,.545,-.02,.02,.57,.41)}
  {local('back',0,.545,-.215,1.56,.57,.02)}{local('bottom',0,.27,-.02,1.56,.02,.41)}
  {local('counter-front',0,.84,.185,1.6,.045,.08,stone)}{local('counter-back',0,.84,-.19,1.6,.045,.07,stone)}
  {[-.78,0,.78].map((x,i)=>local('counter-side-'+i,x,.84,-.015,i===1?.16:.04,.045,.27,stone))}
  {[-.4,.4].map((x,i)=><group key={i}>
   {local('basin-bottom-'+i,x,.788,-.01,.54,.025,.28,'#faf8ef')}
   {local('basin-front-'+i,x,.818,.125,.56,.06,.018,'#faf8ef')}{local('basin-back-'+i,x,.818,-.145,.56,.06,.018,'#faf8ef')}
   {[-1,1].map(v=>local('basin-edge-'+i+v,x+v*.271,.818,-.01,.018,.06,.27,'#faf8ef'))}
   {local('faucet-stem-'+i,x,.96,-.178,.025,.25,.025,metal)}{local('faucet-spout-'+i,x,1.075,-.125,.025,.025,.12,metal)}
   {local('service-pipe-'+i,x,.47,-.17,.075,.40,.075,'#969d98')}{local('service-elbow-'+i,x,.69,-.09,.065,.065,.22,'#969d98')}
   {local('upper-service-front-'+i,x,.70,.19,.74,.20,.02)}
   <group name={'r11-drawer-'+i} position={[0,0,ext[i]]}>
    {local('tray-floor-'+i,x,.322,.03,.65,.018,.3)}
    {local('tray-left-'+i,x-.317,.405,.03,.016,.17,.3)}{local('tray-right-'+i,x+.317,.405,.03,.016,.17,.3)}
    {local('tray-back-'+i,x,.405,-.112,.65,.17,.016)}{local('tray-front-'+i,x,.405,.19,.74,.20,.02)}
    {local('drawer-pull-'+i,x,.405,.215,.14,.018,.02,metal)}
   </group>
  </group>)}
  {local('mirror-frame',0,1.5,-.207,1.55,.95,.025,metal)}
  <mesh name="mirror" position={[0,1.5,-.19]}><boxGeometry args={[1.49,.89,.006]}/><meshStandardMaterial color="#b9cbd0" roughness={.08} metalness={.88}/></mesh>
 </group>;
}
