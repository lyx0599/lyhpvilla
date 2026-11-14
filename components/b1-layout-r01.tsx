'use client';
import {useSearchParams} from 'next/navigation';
import C from '@/data/b1-layout-r01.json';
import M from '@/data/default-workspace.json';
import {B1R03Entity} from './b1-r03-functional';
const world=(x:number,y:number,z:number):[number,number,number]=>[(x-6000)/1000,z/1000,(y-4500)/1000];
const unit=(x:string|null)=>Math.max(0,Math.min(1,Number(x??0)));
function Box({name,x,y,z,w,d,h,color='#918e87',angle=0}:{name:string;x:number;y:number;z:number;w:number;d:number;h:number;color?:string;angle?:number}){return <mesh name={name} position={world(x,y,z)} rotation={[0,-angle,0]} castShadow receiveShadow><boxGeometry args={[w/1000,h/1000,d/1000]}/><meshStandardMaterial color={color} roughness={.84}/></mesh>;}
export function B1LayoutDoor({id}:{id:string}){
 const q=useSearchParams(),d=C.doors.find(x=>x.id===id)!;
 const t=unit(q.get(id==='D-B1-001'?'layoutBath':id==='D-B1-LAUNDRY-R01'?'layoutLaundry':'layoutGuest'));
 const r=d.roughOpening,horizontal=r[1]===r[3],fw=d.frameWidth,top=2100,thickness=id==='D-B1-001'?120:90;
 const frames=horizontal?[[r[0]+fw/2,r[1],fw,thickness],[r[2]-fw/2,r[1],fw,thickness]]:[[r[0],r[1]+fw/2,thickness,fw],[r[0],r[3]-fw/2,thickness,fw]];
 let a:number[],b:number[];
 if(d.mode==='sliding'){
  const c=d.closedCenter!,v=d.translationAtFull!;a=[c[0]+v[0]*t-d.leafWidth!/2,c[1]+v[1]*t];b=[a[0]+d.leafWidth!,a[1]];
 }else{
  const h=d.hinge!,u=d.closedVector!,v=d.fullVector!,angle=t*Math.PI/2;a=h;b=[h[0]+d.leafLength!*(u[0]*Math.cos(angle)+v[0]*Math.sin(angle)),h[1]+d.leafLength!*(u[1]*Math.cos(angle)+v[1]*Math.sin(angle))];
 }
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),nx=-dy/len,ny=dx/len;
 const current=M.houseStructuresByFloor.B1.doors.find(x=>x.id===id)!,wall=M.houseStructuresByFloor.B1.walls.find(x=>x.id===current.hostId)! as any;const cx=wall.start.x+(wall.end.x-wall.start.x)*current.positionOnWall,cy=wall.start.y+(wall.end.y-wall.start.y)*current.positionOnWall;const oldCx=(r[0]+r[2])/2,oldCy=(r[1]+r[3])/2;let theta=Math.atan2(wall.end.y-wall.start.y,wall.end.x-wall.start.x)-(horizontal?0:Math.PI/2);while(theta>Math.PI/2)theta-=Math.PI;while(theta< -Math.PI/2)theta+=Math.PI;

 return <group position={world(cx,cy,0)} rotation={[0,-theta,0]} userData={{auditModelHost:current.hostId,auditModelPlacementCorrection:true,ownerOperationRecheckPending:true}}><group position={[-(oldCx-6000)/1000,0,-(oldCy-4500)/1000]}><group name={'R01-actual-door-'+id} userData={{auditEntityId:id,auditKind:'door',layoutFraction:t,mode:d.mode,conditionalDesign:true}}>
  {frames.map((f,i)=><Box key={i} name={'R01-jamb-'+i} x={f[0]} y={f[1]} z={top/2} w={f[2]} d={f[3]} h={top} color="#8a8174"/>)}
  <Box name="R01-head" x={(r[0]+r[2])/2} y={(r[1]+r[3])/2} z={top-fw/2} w={horizontal?r[2]-r[0]:thickness} d={horizontal?thickness:r[3]-r[1]} h={fw} color="#8a8174"/>
  <Box name="R01-fitted-moving-leaf" x={(a[0]+b[0])/2} y={(a[1]+b[1])/2} z={d.bottom+d.leafHeight/2} w={len} d={d.leafThickness} h={d.leafHeight} angle={angle}/>
  {[-1,1].map(sign=><Box key={sign} name={'R01-handle-'+sign} x={b[0]-dx/len*120+sign*nx*25} y={b[1]-dy/len*120+sign*ny*25} z={1035} w={28} d={10} h={90} angle={angle} color="#8a6844"/>)}
  {d.mode==='sliding'&&<Box name="R01-full-travel-track" x={(d.track![0]+d.track![1])/2} y={d.closedCenter![1]} z={d.track![2]} w={d.track![1]-d.track![0]} d={32} h={35} color="#8a8174"/>}
 </group></group></group>;
}
export function B1LayoutCleaning(){
 const f=M.furniture.find(f=>f.id==='furn-b1-laundry-cleaning-cabinet-001')!;
 // R03 source center4269.5/1460, rigidly mapped to current model pose; no rescaling.
 return <group name="R01-cleaning-rigid-transform" position={world(f.position.x*120,f.position.y*90,0)} rotation={[0,-Math.PI,0]}><group position={[1.7305,0,3.04]}><B1R03Entity id={f.id}/></group></group>;
}
export function B1LayoutWasher(){
 const f=M.furniture.find(f=>f.id==='furn-b1-laundry-washer-001')!;
 // Source entire installation center4407/2705 rotated -90 degrees in plan.
 return <group name="R01-washer-rigid-transform" position={world(f.position.x*120,f.position.y*90,0)} rotation={[0,Math.PI/2,0]}><group position={[1.593,0,1.795]}><B1R03Entity id={f.id}/></group></group>;
}
export function B1LayoutControls(){const q=useSearchParams();const link=(values:Record<string,string>)=>{const p=new URLSearchParams(q.toString());for(const k of ['layoutBath','layoutLaundry','layoutGuest','layoutWasher','layoutDryer','layoutClean','layoutBed'])p.delete(k);Object.entries(values).forEach(([k,v])=>p.set(k,v));return '?'+p.toString();};return <nav aria-label="R01当前门态" className="flex flex-wrap gap-3 border p-2 text-xs">
 <a href={link({})}>R01日常关闭</a><a href={link({layoutBath:'1',layoutLaundry:'1',layoutGuest:'1'})}>三入口全开</a><a href={link({layoutBath:'1',layoutLaundry:'1',layoutGuest:'1',layoutWasher:'1',layoutDryer:'1',layoutClean:'1'})}>洗烘/柜门及入口同态</a><a href={link({layoutGuest:'1',layoutBed:'1'})}>客房门开+睡面深1500（预留深1700）</a><span>门与设备为设计几何，非OEM/现场；客房临空边仍半开敞。</span>
 </nav>;}
