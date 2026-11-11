import {setB2DoorInspection,useB2DoorOperation} from '../lib/b2-door-operation';

export function B2FloorDoorControls(){
  const state=useB2DoorOperation();const opened=Object.values(state).some(v=>v>0);
  return <div aria-label="B2概念门叶检查" className="flex flex-wrap items-center gap-3 rounded border bg-white px-3 py-1 text-xs"><span>概念门叶检查</span><button aria-pressed={!opened} onClick={()=>setB2DoorInspection(0)}>B2四门闭态</button><button aria-pressed={opened} onClick={()=>setB2DoorInspection(1)}>B2四门开72°</button><span>安装关系检查；梯下取用与采光井交付仍未确认。</span></div>;
}

/** Only four B2 nominal portals affected by the new35mm finished surface.
 * Preserve44mm flush panel and12x220x16 pull; selected hardware remains future.
 */
export function B2FloorFittedLeaf({id,width,height,direction,side,color}:{id:string;width:number;height:number;direction:number;side:number;color:string}){
  return <group name={`${id}-R30-floor-fitted-flush-leaf`} position={[direction*width/2,.045+height/2,-side*.030]} userData={{auditEntityId:id,auditKind:'hinged-leaf',leafWidthMm:width*1000,leafHeightMm:height*1000,leafBottomMm:45,leafThicknessMm:44,sideGapMm:3,designStatus:'proposed-nominal-portal-fit-not-SKU'}}>
    <mesh name={`${id}-R30-flush44-moving-panel`} castShadow receiveShadow><boxGeometry args={[width,height,.044]}/><meshStandardMaterial color={color} roughness={.7}/></mesh>
    {[-1,1].map(s=><mesh key={s} name={`${id}-R30-reveal-${s}`} position={[s*(width/2-.008),0,.026]}><boxGeometry args={[.008,height*.985,.008]}/><meshStandardMaterial color="#4c443c" roughness={.7}/></mesh>)}
    <mesh name={`${id}-R30-original12x220x16-pull`} position={[direction*width*.42,0,.035]}><boxGeometry args={[.012,.220,.016]}/><meshStandardMaterial color="#765f45" metalness={.64} roughness={.28}/></mesh>
  </group>;
}
export function B2FloorHingeMount({id,pivotX,height,direction,side}:{id:string;pivotX:number;height:number;direction:number;side:number}){
  return <group name={`${id}-R30-concept-hinges`} userData={{auditEntityId:id,auditKind:'door-fixed-hinge-mount',conceptOnly:true}}>
    {[.045+.2,.045+height/2,.045+height-.2].map((y,i)=><group key={i}>
      <mesh name={`${id}-R30-hinge-barrel-${i}`} position={[pivotX,y,side*.030]}><cylinderGeometry args={[.006,.006,.080,16]}/><meshStandardMaterial color="#856443" metalness={.65}/></mesh>
      <mesh name={`${id}-R30-fixed-hinge-plate-${i}`} position={[pivotX-direction*.014,y,side*.030]}><boxGeometry args={[.020,.080,.003]}/><meshStandardMaterial color="#856443" metalness={.65}/></mesh>
    </group>)}
  </group>;
}
