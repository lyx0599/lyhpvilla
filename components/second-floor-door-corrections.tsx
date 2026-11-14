import {useSearchParams} from 'next/navigation';
import currentModel from '@/data/default-workspace.json';
import {setSecondFloorDoor,useSecondFloorDoorOperation} from '../lib/second-floor-door-operation';

export function SecondFloorDoorControls(){
  const state=useSecondFloorDoorOperation(),query=useSearchParams();
  const defaultAmount=(id:string)=>{
    const door=currentModel.houseStructuresByFloor['2F'].doors.find(d=>d.id===id);
    if(id==='D-2F-006'&&query.has('d006')){const max=(door as {notes?:string}|undefined)?.notes?.includes('R02-NORTH-110')?110:90;return Math.max(0,Math.min(1,Number(query.get('d006'))/max));}
    return (door as {defaultOpenAmount?:number}|undefined)?.defaultOpenAmount??0;
  };
  return <div aria-label="二层入口门操作" className="flex flex-wrap items-center gap-4 rounded border bg-white px-3 py-2 text-xs">
    {[['D-2F-003','客房1外开90°'],['D-2F-004','客房2滑门850（设计候选）'],['D-2F-006','客卫平开110°候选'],['D-2F-009','父母阳台门西侧开启'],['D-2F-010','儿童阳台门西侧开启']].map(([id,label])=><label key={id} className="flex items-center gap-2">{label}<input aria-label={label} type="range" min="0" max="100" step="1" value={Math.round((state[id]??defaultAmount(id))*100)} onChange={e=>setSecondFloorDoor(id,Number(e.target.value)/100)}/></label>)}
    <button onClick={()=>['D-2F-003','D-2F-004','D-2F-006','D-2F-009','D-2F-010'].forEach(id=>setSecondFloorDoor(id,0))}>全部门关闭</button>
    <span>按模型成品地面拟合门叶；轨道锚固与成品五金待定。</span>
  </div>;
}

/** R20 design proposal: explicit local model datum, not a selected hardware SKU.
 * D004 actual W013 points West to East: local +X is East, +Z is child-room South.
 * Track hangers terminate at the existing 2800 model ceiling datum. Anchor/load
 * design remains unverified; these solids declare the proposed support path.
 */
export function D004PublicSlidingLeaf({amount,sideOffsetMm=-166}:{amount:number;sideOffsetMm?:number}) {
  const t=Math.max(0,Math.min(1,amount));
  const travel=.850*t, side=sideOffsetMm/1000, bottom=.0725, leafHeight=2.058;
  const railCenter=.421344, railLength=1.732;
  return <group name="D004-R02-current-host-room-side-east850" userData={{auditEntityId:'D-2F-004',auditKind:'door-installation-proposal',fullTravelMm:850,roomSideOffsetMm:sideOffsetMm,leafBottomMm:72.5,supportStatus:'ceiling-anchor-and-hardware-load-not-verified'}}>
    <mesh name="D004-R20-continuous-track" position={[railCenter,2.160,side]} castShadow><boxGeometry args={[railLength,.040,.070]}/><meshStandardMaterial color="#625e58" metalness={.65} roughness={.35}/></mesh>
    {[1.229344,.679344,.129344,-.380656].map((x,i)=><group key={i}>
      <mesh name={`D004-R20-ceiling-plate-${i}`} position={[x,2.795,side]}><boxGeometry args={[.100,.010,.100]}/><meshStandardMaterial color="#625e58"/></mesh>
      <mesh name={`D004-R20-declared-ceiling-hanger-${i}`} position={[x,2.485,side]}><boxGeometry args={[.016,.610,.016]}/><meshStandardMaterial color="#625e58" metalness={.65}/></mesh>
    </group>)}
    {[1.270344,-.421656].map((x,i)=><mesh key={i} name={`D004-R20-endstop-${i}`} position={[x,2.145,side]}><boxGeometry args={[.020,.030,.060]}/><meshStandardMaterial color="#302d29"/></mesh>)}
    <group name="D004-R20-moving-panel-and-pulls" position={[travel,0,side]} userData={{auditEntityId:'D-2F-004',auditKind:'sliding-leaf',operationFraction:t}}>
      <mesh name="D004-R20-full833x2058x36-leaf" position={[0,bottom+leafHeight/2,0]} castShadow receiveShadow><boxGeometry args={[.833,leafHeight,.036]}/><meshStandardMaterial color="#ad9575" roughness={.7}/></mesh>
      {[-1,1].map(s=><mesh key={s} name={`D004-R20-normal-pull-${s}`} position={[-.833*.37,1.10,s*.028]} castShadow><boxGeometry args={[.022,.240,.020]}/><meshStandardMaterial color="#8b7656" metalness={.6} roughness={.3}/></mesh>)}
      {[-1,1].map(s=><mesh key={'edge-'+s} name={`D004-AREA-leading-edge-pull-${s}`} position={[-.4065,1.10,s*.028]} castShadow><boxGeometry args={[.020,.240,.020]}/><meshStandardMaterial color="#8b7656" metalness={.6} roughness={.3}/></mesh>)}
      {[-.300,.300].map((x,i)=><group key={i}>
        <mesh name={`D004-R20-leaf-hanger-${i}`} position={[x,2.139,0]}><boxGeometry args={[.024,.017,.020]}/><meshStandardMaterial color="#625e58"/></mesh>
        <mesh name={`D004-R20-track-carriage-${i}`} position={[x,2.151,0]}><boxGeometry args={[.060,.018,.030]}/><meshStandardMaterial color="#302d29"/></mesh>
      </group>)}
    </group>
  </group>;
}

/** Nominal 900 portal remains. Actual 859.5 frame clear minus two 3mm gaps
 * gives a declared 853.5 leaf, not a purchased 900 panel or a new aperture.
 * Pivot is on the room-side corner of the 55mm leaf to clear the hinge jamb. */
export function SecondFloorFinishedHingedLeaf({id,width,direction,color,insideSide}:{id:string;width:number;direction:number;color:string;insideSide:number}) {
  return <group name={`${id}-R23-finished-floor-leaf`} position={[direction*width/2,1.0725,-insideSide*.0275]} userData={{auditEntityId:id,auditKind:'hinged-leaf',leafBottomMm:72.5,leafHeightMm:2000,leafWidthMm:width*1000,portalHeightMm:2100,nominalPortalWidthMm:900,sideGapMm:3,designStatus:'proposed-leaf-fit-not-SKU'}}>
    <mesh name={`${id}-R23-fit853_5x2000x55-leaf`} castShadow receiveShadow><boxGeometry args={[width,2,.055]}/><meshStandardMaterial color={color} roughness={.7}/></mesh>
    {[-1,1].map(s=><mesh key={s} name={`${id}-R20-normal-knob-${s}`} position={[direction*width*.39,0,s*.0506]}><sphereGeometry args={[.036,20,16]}/><meshStandardMaterial color="#c9a46a" metalness={.6} roughness={.3}/></mesh>)}
  </group>;
}

export function SecondFloorHingeMount({id,pivotX,insideSide,direction,jambExtension=false}:{id:string;pivotX:number;insideSide:number;direction:number;jambExtension?:boolean}){
  return <group name={`${id}-R23-three-concept-hinges`} userData={{auditEntityId:id,auditKind:'door-fixed-hinge-mount',designStatus:'concept-hinge-not-OEM-or-load-design'}}>
    {jambExtension && <group name={`${id}-R02-continuous-jamb-extension`} userData={{auditEntityId:id,auditKind:'door-jamb-extension',designStatus:'declared-frame-connection-not-anchor-load-certification'}}>
      <mesh name={`${id}-R02-20x20_5-full-height-jamb-liner`} position={[pivotX-direction*.014,1.047,insideSide*(.0275-.00975)]} castShadow><boxGeometry args={[.020,2.058,.0205]}/><meshStandardMaterial color="#987d58" roughness={.6}/></mesh>
      {[.25,1.05,1.90].map((y,i)=><mesh key={i} name={`${id}-R02-jamb-screw-${i}`} position={[pivotX-direction*.014,y,insideSide*(.0275-.022)]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.004,.004,.050,12]}/><meshStandardMaterial color="#8a6844" metalness={.65}/></mesh>)}
    </group>}
    {[.25,1.05,1.90].map((y,i)=><group key={i}>
      <mesh name={`${id}-R23-hinge-barrel-${i}`} position={[pivotX,y,insideSide*.0275]}><cylinderGeometry args={[.006,.006,.080,16]}/><meshStandardMaterial color="#8a6844" metalness={.65}/></mesh>
      <mesh name={`${id}-R23-fixed-hinge-plate-${i}`} position={[pivotX-direction*.014,y,insideSide*.0275]}><boxGeometry args={[.020,.080,.003]}/><meshStandardMaterial color="#8a6844" metalness={.65}/></mesh>
    </group>)}
  </group>;
}
