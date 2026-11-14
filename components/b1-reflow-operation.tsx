'use client';
import {useSearchParams} from 'next/navigation';
import * as THREE from 'three';
import C from '@/data/b1-layout-r01.json';
import R from '@/data/b1-r06.json';
import {r06State} from '@/lib/b1-r06-state';
const unit=(n:string|null)=>Math.max(0,Math.min(1,Number(n??0)));
const route=(pts:number[][],t:number)=>{const i=Math.min(pts.length-2,Math.floor(t*(pts.length-1))),f=t===1?1:t*(pts.length-1)-i;return[pts[i][0]+(pts[i+1][0]-pts[i][0])*f,pts[i][1]+(pts[i+1][1]-pts[i][1])*f];};
export function B1ReflowActor(){
 const p=useSearchParams(),phase=p.get('reflowPhase'),t=unit(p.get('reflowT'));let a:number[]|null=null;
 if(phase==='entry')a=route([[4800,4300],[5500,4000],[5540,3600],[5540,3100],[5900,3080],[6800,3080],[7410,2910]],t);
 if(phase==='laundry-entry')a=route([[5580,3100],[5580,2800],[5580,2650],[5500,2350],[5500,2200],[5100,2200],[4800,2200]],t);
 if(phase==='bath-entry')a=route([[5500,2250],[5432,2050],[5432,1800],[5432,1535],[5240,1400],[5240,1000]],t);
 if(phase==='washer')a=[4800+400*t,2200];
 if(phase==='dryer')a=[5000+400*Math.sin(Math.PI*t)-300*t,2200];
 if(phase==='cleaner')a=[5500-400*t-100*Math.sin(Math.PI*t),2200];
 if(phase==='bed')a=[7410,2400+510*t];
 if(phase==='reserve-north')a=[8770,1500];
 if(phase==='reserve-south')a=[8770,3000];
 if(phase==='cabinet'){const v=r06State(new URLSearchParams(p.toString()));a=v.actor;}
 if(!a)return null;
 const base=phase==='cabinet'&&R.doors.find(d=>d.id===p.get('r06Door'))?.face==='east'?.055:.035;
 return <group name="R06-current-operation600" userData={{auditEntityId:'B1-R06-BODY-600',auditKind:'body-proxy',auditNonPhysical:true,operation:phase,operationFraction:t,diameterMm:600,posture:'upright-design-proxy-not-personal-fit'}}>
  <mesh name="R06-body-diameter600" position={[(a[0]-6000)/1000,base+.75,(a[1]-4500)/1000]}><cylinderGeometry args={[.3,.3,1.5,64]}/><meshStandardMaterial color="#348478" transparent opacity={.45}/></mesh>
  <mesh name="R06-head" position={[(a[0]-6000)/1000,base+1.69,(a[1]-4500)/1000]}><sphereGeometry args={[.11,24,16]}/><meshStandardMaterial color="#348478"/></mesh>
 </group>;
}
export function B1ReflowControls(){
 const p=useSearchParams(),link=(values:Record<string,string>)=>{const q=new URLSearchParams(p.toString());for(const k of['layoutBath','layoutLaundry','layoutGuest','layoutWasher','layoutDryer','layoutClean','layoutBed','reflowPhase','reflowT','reflowReserve','r06Door','r06T'])q.delete(k);Object.entries(values).forEach(([k,v])=>q.set(k,v));return'?'+q.toString();};
 const states=[['日常关门',{}],['进入客房600',{layoutLaundry:'1',layoutGuest:'1',reflowPhase:'entry',reflowT:'1'}],['进入洗衣600',{layoutLaundry:'1',reflowPhase:'laundry-entry',reflowT:'1'}],['经洗衣入卫生间',{layoutBath:'1',layoutLaundry:'1',reflowPhase:'bath-entry',reflowT:'1'}],['洗衣机单开',{layoutLaundry:'1',layoutWasher:'1',reflowPhase:'washer',reflowT:'1'}],['烘干机单开',{layoutLaundry:'1',layoutDryer:'1',reflowPhase:'dryer',reflowT:'1'}],['家政柜单开',{layoutLaundry:'1',layoutClean:'1',reflowPhase:'cleaner',reflowT:'1'}],['开床及操作600',{layoutGuest:'1',layoutBed:'1',reflowPhase:'bed',reflowT:'1'}],['储备柜北半取用',{layoutGuest:'1',layoutBed:'1',reflowReserve:'north',reflowPhase:'reserve-north',reflowT:'1'}],['储备柜南半取用',{layoutGuest:'1',layoutBed:'1',reflowReserve:'south',reflowPhase:'reserve-south',reflowT:'1'}]] as Array<[string,Record<string,string>]>;
 const step=(t:string)=>{const q=new URLSearchParams(p.toString());q.set('reflowT',t);q.set('r06T',t);const k=({washer:'layoutWasher',dryer:'layoutDryer',cleaner:'layoutClean',bed:'layoutBed'} as Record<string,string>)[p.get('reflowPhase')??''];if(k)q.set(k,t);return'?'+q.toString();};
 return <nav aria-label="R06当前动作证据" className="flex flex-wrap gap-3 border p-2 text-xs">{states.map(([n,v])=><a key={n} href={link(v)}>{n}</a>)}{p.has('reflowPhase')&&[0,.5,1].map(t=><a key={t} href={step(String(t))}>动作{t*100}%</a>)}<span>600人体为同态几何代理；设备分次操作，非OEM／完整检修或现场通过。</span></nav>;
}
