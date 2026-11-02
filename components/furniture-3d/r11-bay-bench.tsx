'use client';
import {PbrMaterial} from '@/components/scene-3d/pbr-material';

/** Exact declared1600×550×450 envelope; no generic sideboard cap overhang.
 * Base cabinet415 + removable35 cushion. Fronts open toward the bedroom.
 * This is an explicit candidate interface replacement, not unchanged old mesh.
 */
export function R11BayBench({width,depth,height,openAmount=0}:{width:number;depth:number;height:number;openAmount?:number}){
 const bottom=-height/2,travel=Math.min(.35,depth-.08)*Math.max(0,Math.min(1,openAmount));
 const wood=(name:string,size:[number,number,number],at:[number,number,number])=>
   <mesh key={name} name={'bay-bench-'+name} position={[at[0],bottom+at[1],at[2]]} castShadow receiveShadow>
     <boxGeometry args={size}/><PbrMaterial token="warmOak" fallbackRole="joineryMain" color="#c6ac87" roughness={.7} surfaceSizeM={[size[0],size[1]]}/>
   </mesh>;
 const wall=.016,insideWidth=width-2*wall,drawerWidth=(insideWidth-.02)/2;
 return <group name="r11-baybench-declared-envelope-1600-550-450">
   {wood('bottom',[width,.018,depth],[0,.029,0])}
   {wood('top-no-overhang',[width,.018,depth],[0,.406,0])}
   {wood('rear',[insideWidth,.36,wall],[0,.218,depth/2-wall/2])}
   {[-1,1].map(side=>wood('side-'+side,[wall,.36,depth],[side*(width/2-wall/2),.218,0]))}
   {wood('center',[wall,.36,depth-.02],[0,.218,0])}
   {[-1,1].map(side=><group key={side} name={'bay-bench-ordinary-drawer-'+side} position={[side*(drawerWidth+.02)/2,0,-travel]}>
     {wood('drawer-floor',[drawerWidth-.024,.012,depth-.06],[0,.087,0])}
     {[-1,1].map(edge=>wood('drawer-side-'+edge,[.012,.26,depth-.06],[edge*(drawerWidth/2-.006),.217,0]))}
     {wood('drawer-back',[drawerWidth-.024,.26,.012],[0,.217,depth/2-.036])}
     {wood('flush-drawer-front',[drawerWidth,.305,.018],[0,.226,-depth/2+.009])}
     {/* Recessed finger groove: no invented handle projects into the host wall. */}
     <mesh name="bay-bench-front-finger-recess" position={[0,bottom+.366,-depth/2+.007]}>
       <boxGeometry args={[drawerWidth-.09,.012,.004]}/><meshStandardMaterial color="#63503d" roughness={.85}/>
     </mesh>
   </group>)}
   <mesh name="bay-bench-removable-cushion-35" position={[0,bottom+.4325,0]} castShadow>
     <boxGeometry args={[width-.06,.035,depth-.06]}/>
     <PbrMaterial token="beigeFabric" fallbackRole="fabricMain" color="#d7c8b1" roughness={.92} surfaceSizeM={[width-.06,depth-.06]}/>
   </mesh>
 </group>;
}
