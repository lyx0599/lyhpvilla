'use client';
import {useRouter,useSearchParams} from 'next/navigation';
import {r11CycleState} from '@/lib/r11-cycle-binding';
import identity from '@/data/default-workspace.json';
export function R11CycleControls(){
 const q=useSearchParams(),router=useRouter(),state=r11CycleState(q.get('closetCycle'),Number(q.get('cycleFrame')??0));
 const set=(side:string,index:number)=>{const next=new URLSearchParams(q.toString());next.set('closetCycle',side);next.set('cycleFrame',String(index));next.set('camera','review-g02-north');router.replace('?'+next.toString(),{scroll:false});};
 return <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px]" aria-label="R11-C1实际柜体完整循环"><button onClick={()=>set('left',0)}>左柜完整循环</button><button onClick={()=>set('right',0)}>右柜完整循环</button>{state&&<><button onClick={()=>set(state.side,state.side==='left'?350:245)}>取物阶段</button><label className="flex items-center gap-2">源帧<input aria-label="衣帽完整循环帧" type="range" min="0" max={state.total-1} value={state.frame} onChange={e=>set(state.side,Number(e.target.value))}/>{state.frame}/{state.total-1}</label><span>{state.stage} · 源门索引{state.leaf} · {state.angle}° · 抽屉{state.travel}mm · 600身体不缩</span></>}<span className="text-amber-900">{identity.defaultWorkspaceRevision.includes('source-ratio-A-integrated')?'单侧原循环及本轮静态场景绑定已核；不含两侧同时敞开。':'原局部循环已通过；当前共同场景绑定待审，不含两侧同时敞开。'}</span></div>;
}
