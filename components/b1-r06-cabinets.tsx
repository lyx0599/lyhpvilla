'use client';
import {useSearchParams} from 'next/navigation';
import C from '@/data/b1-r06.json';
import {r06State} from '@/lib/b1-r06-state';
import {setB1CabinetOperation,useB1CabinetOperation} from '@/lib/b1-cabinet-operation';
const world=(p:number[]):[number,number,number]=>[(p[0]-6000)/1000,p[2]/1000,(p[1]-4500)/1000];
export function B1R06Controls(){
  const state=useB1CabinetOperation();
  return <div className="flex flex-wrap items-center gap-3 rounded border bg-white px-3 py-2 text-xs" aria-label="B1柜门与偶住状态">
    <label>单扇柜门 <select aria-label="B1选择柜门" value={state.doorId??'closed'} onChange={e=>setB1CabinetOperation({doorId:e.target.value==='closed'?null:e.target.value,amount:e.target.value==='closed'?0:1})}><option value="closed">两柜关闭</option>{C.doors.map(d=><option key={d.id} value={d.id}>{d.face==='east'?'阅读柜':'便携柜'} · {C.doors.filter(x=>x.entity===d.entity).findIndex(x=>x.id===d.id)+1}号门</option>)}</select></label>
    <label>开度 <input aria-label="B1柜门开度" type="range" min="0" max="100" step="1" value={Math.round(state.amount*100)} disabled={!state.doorId} onChange={e=>setB1CabinetOperation({amount:Number(e.target.value)/100})}/>{Math.round(state.amount*90)}°</label>
    <button aria-pressed={state.bedAmount===1} onClick={()=>setB1CabinetOperation({bedAmount:state.bedAmount===1?0:1})}>{state.bedAmount===1?'收合沙发床':'展开沙发床1500'}</button>
    <button aria-pressed={state.bathDoorAmount===1} onClick={()=>setB1CabinetOperation({bathDoorAmount:state.bathDoorAmount===1?0:1})}>{state.bathDoorAmount===1?'关闭盥洗门':'打开盥洗门72°'}</button>
    <span>已做分项条件校核：单门分次，其余柜门关闭；任意同时展开组合未核。</span>
  </div>;
}
export function B1R06Cabinet({id}:{id:string}){
  const q=useSearchParams(),operation=useB1CabinetOperation(),legacy=q.get('audit')==='1'&&q.has('r06Door')&&!operation.userTouched;
  const normal=new URLSearchParams();if(operation.doorId)normal.set('r06Door',operation.doorId);normal.set('r06T',String(operation.amount));
  const s=r06State(legacy?new URLSearchParams(q.toString()):normal);
  return <group name={'R06-'+id} userData={{auditEntityId:id,auditKind:'furniture',revision:C.revision,r06Door:s.id,r06Fraction:s.t,operationSource:legacy?'diagnostic-query':'production-cabinet-state'}}>
    {C.parts.filter(x=>x.id===id).map((b,i)=><mesh key={i} name={'R06-'+b.name} position={world(b.center)} castShadow receiveShadow><boxGeometry args={[b.size[0]/1000,b.size[2]/1000,b.size[1]/1000]}/><meshStandardMaterial color="#aaa59a" roughness={.8}/></mesh>)}
    {C.doors.filter(d=>d.entity===id).map(d=>{const angle=d.id===s.id?s.angle*Math.PI/180:0,east=d.face==='east',a=d.hinge,b=east?[a[0]+d.length*Math.sin(angle),a[1]+d.dir*d.length*Math.cos(angle)]:[a[0]+d.dir*d.length*Math.cos(angle),a[1]-d.length*Math.sin(angle)],dx=b[0]-a[0],dy=b[1]-a[1];return <mesh key={d.id} name={'R06-door-'+d.id} position={world([(a[0]+b[0])/2,(a[1]+b[1])/2,d.bottom+d.height/2])} rotation={[0,-Math.atan2(dy,dx),0]} onClick={e=>{e.stopPropagation();setB1CabinetOperation({doorId:d.id,amount:operation.doorId===d.id&&operation.amount>0?0:1});}} castShadow receiveShadow><boxGeometry args={[d.length/1000,d.height/1000,.018]}/><meshStandardMaterial color="#aaa59a" roughness={.82}/></mesh>;})}
    {legacy&&s.door?.entity===id&&s.actor&&<group name="R06-operator600" userData={{auditEntityId:'R06-BODY-600',auditNonPhysical:true,shoulderHeightMm:s.door.shoulder}}><mesh name="R06-body-diameter600" position={world([s.actor[0],s.actor[1],35+s.door.shoulder/2])}><cylinderGeometry args={[.3,.3,s.door.shoulder/1000,48]}/><meshStandardMaterial color="#3e827a" transparent opacity={.38}/></mesh><mesh name="R06-shoulder-marker" position={world([s.actor[0],s.actor[1],s.door.shoulder])}><boxGeometry args={[.07,.03,.07]}/><meshStandardMaterial color="#e4b454"/></mesh></group>}
  </group>;
}
