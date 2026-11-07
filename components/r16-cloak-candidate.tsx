'use client';
import {useMemo,useState} from 'react';
import {useSearchParams,useRouter} from 'next/navigation';
import {Floor3DView} from '@/components/floor-3d-view';
import {defaultSpaceData} from '@/data/mock-space';
import model from '@/data/default-workspace.json';
import {getModelPreviewScene} from '@/lib/model-preview';
import {r16State,r16Cycles,r16Contract} from '@/lib/r16-cloak-binding';
import type {FixedCameraView} from '@/types/space';
const noop=()=>undefined;
export function R16CloakCandidate(){
 const q=useSearchParams(),router=useRouter(),state=r16State(q),workspace=model as unknown as typeof defaultSpaceData.workspace,floor=defaultSpaceData.floors.find(f=>f.id==='2F')!;
 const scene=useMemo(()=>getModelPreviewScene('2F',workspace.houseStructuresByFloor,workspace.furniture),[workspace]);
 const views:FixedCameraView[]=[{id:'eye',name:'入口看同款双柜／保留飘窗',floor:'2F',cameraPosition:{x:-.044,y:1.6,z:-1.72},target:{x:-.044,y:1.45,z:-3.85},fov:62},{id:'plan',name:'同全局平面／真实前框与摆幅',floor:'2F',cameraPosition:{x:-.044,y:7,z:-2.68},target:{x:-.044,y:0,z:-2.68},fov:34},{id:'left',name:'左柜真实四门与原12模块',floor:'2F',cameraPosition:{x:.18,y:1.35,z:-2.68},target:{x:-.934,y:1.3,z:-2.68},fov:72},{id:'right',name:'右柜真实四门与原12模块',floor:'2F',cameraPosition:{x:-.22,y:1.35,z:-2.68},target:{x:.846,y:1.3,z:-2.68},fov:72},{id:'whole',name:'实际2F上下文／非隔离房间',floor:'2F',cameraPosition:{x:0,y:14,z:.1},target:{x:0,y:0,z:0},fov:42}];
 // Front views are declared inspection cameras, not accessible-body stations.
 views.find(v=>v.id==='left')!.cameraPosition={x:.54,y:1.27,z:-2.68};views.find(v=>v.id==='left')!.fov=96;
 views.find(v=>v.id==='right')!.cameraPosition={x:-.628,y:1.27,z:-2.68};views.find(v=>v.id==='right')!.fov=96;
 const selected=views.find(v=>v.id===q.get('view'))??views[0];
 const cameraRequest=useMemo(()=>({view:selected,nonce:selected.id.split('').reduce((h,c)=>h*31+c.charCodeAt(0),0)}),[selected.id]);
 const [note,setNote]=useState(''),[raw,setRaw]=useState('');
 const set=(fields:Record<string,string>)=>{const n=new URLSearchParams(q.toString());n.set('audit','1');for(const [k,v]of Object.entries(fields)){if(v==='')n.delete(k);else n.set(k,v)}router.replace('?'+n.toString(),{scroll:false});};
 const manual=(mode:string,side=state.side,leaf='0')=>set({cycle:'',frame:'',mode,side,leaf,angle:'90',travel:mode==='drawer'?'350':'0'});
 const chooseCycle=(name:string)=>set({cycle:name,frame:'0',mode:'closed',view:'plan'});
 const download=()=>{const h=window as unknown as {__ModelEvidenceCapture?:()=>unknown};if(!h.__ModelEvidenceCapture){setNote('实际场景仍在加载');return}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(h.__ModelEvidenceCapture())],{type:'application/json'}));a.download='R02-current-actual-native.json';a.click();setNote('已导出当前实际场景，不是预制示意JSON');};
 return <main className="min-h-screen bg-[#f3efe5] text-[#34463d]">
  <header className="border-b bg-[#faf7ef] px-5 py-3"><h1 className="text-xl font-bold">2F衣帽间｜已采用八门设计实体 · 分侧正常使用</h1><p className="text-sm">每侧2240×600×2470；闭门道1180；540研究门＋普通90°铰链＋新前框。保留原24功能与650抽屉、850台座。两边同款灰茶半反射玻璃，灯开关不换玻璃参数。</p>
   <p className="mt-1 text-xs text-amber-900">600×1700有限刚性代理的最薄独立保守余量为2.5mm，非舒适／工程通过。四处松手再握未建完整上肢轨迹。保留地面实体；门底／抽屉底研究上抬14，外高不改，不当现场门缝定型。半镜光学、12×18前框、铰链承载和完整换握待深化；不任意同时开两侧，不将台座降至图示420。</p>
  </header>
  <section className="px-4 py-3 text-sm"><nav className="flex flex-wrap gap-3">{views.map(v=><button className="rounded border bg-white px-3 py-1" aria-pressed={selected.id===v.id} key={v.id} onClick={()=>set({view:v.id})}>{v.name}</button>)}<button className="rounded border bg-white px-3 py-1" onClick={()=>set({lights:state.lights?'off':'on'})}>{state.lights?'关闭柜内灯':'打开柜内灯'}</button><button className="rounded border bg-white px-3 py-1" onClick={()=>manual('closed')}>八门／抽屉归位</button></nav>
   <div className="my-2 flex flex-wrap gap-2">{(['left','right'] as const).map(side=><span key={side} className="flex flex-wrap gap-2 rounded border p-2"><b>{side==='left'?'左柜':'右柜'}</b>{[0,1,2,3].map(i=><button key={i} className="rounded bg-white px-2" onClick={()=>manual('single',side,String(i))}>{i}号门90°</button>)}<button className="rounded bg-white px-2" onClick={()=>manual('pair',side)}>抽屉双门90°</button><button className="rounded bg-white px-2" onClick={()=>manual('drawer',side)}>650抽屉拉350</button><button className="rounded bg-white px-2" onClick={()=>chooseCycle(side+'-pair23-drawer350')}>完整开取关循环</button></span>)}</div>
   <div className="my-2 flex flex-wrap items-center gap-4"><label>单门角度 <input aria-label="门开启角度" type="range" min="0" max="90" value={state.mode==='single'?state.angles[Number(q.get('leaf')??0)]:0} onChange={e=>set({cycle:'',frame:'',mode:'single',angle:e.target.value,travel:'0'})}/></label><label>抽屉行程 <input aria-label="抽屉行程" type="range" min="0" max="350" value={state.travel} onChange={e=>set({cycle:'',frame:'',mode:'drawer',travel:e.target.value})}/></label><label>新四门循环 <select aria-label="四门新动作选择" value={state.cycle??''} onChange={e=>e.target.value?chooseCycle(e.target.value):manual('closed')}><option value="">手动端态</option>{r16Cycles.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}</select></label>{state.cycle&&<label>连续链帧 <input aria-label="新四门连续链帧" type="range" min="0" max={state.total-1} value={state.frame} onChange={e=>set({frame:e.target.value})}/> {state.frame}/{state.total-1}</label>}</div>
   <p className="mb-2 text-xs" role="status">当前{state.side==='left'?'左':'右'}柜 · 门{state.angles.join('/')}° · 抽屉{state.travel}mm · 灯{state.lights?'开':'关'} · {state.stage}。抽屉模式强制2+3双开；切单门先归抽屉。柜内三分区不被四扇门误分成四个窄抽屉。</p>
   <div className="relative h-[720px] overflow-hidden rounded-xl border bg-[#e5dfd2]" data-testid="r16-native-canvas"><Floor3DView floor={floor} houseStructure={scene.structure} houseStructuresByFloor={workspace.houseStructuresByFloor} stairSystems={workspace.stairSystems} stairLandings={workspace.stairLandings} stairOpenings={workspace.stairOpenings} furniture={scene.furniture} allFurniture={scene.furniture} drawingItems={workspace.drawingItems.filter(d=>d.floorId==='2F')} allDrawingItems={workspace.drawingItems.filter(d=>d.floorId==='2F')} drawingSheetType="sitePlan" cameraViews={workspace.cameraViews} cameraViewRequest={cameraRequest} cameraLockEnabledOverride roomTourViews={workspace.roomTourViews} lightingDesign={workspace.lightingDesign} selectedObjectId="" selectedFurnitureId="" showObjectIds={false} externalPresentationMode hidePresentationUi presentationWallDisplayMode={selected.id==='plan'||selected.id==='whole'?'cutaway':'full'} cameraCollisionEnabledOverride={false} mobileQuality="balanced" onShowObjectIdsChange={noop} onSelectStructure={noop} onSelectFurniture={noop} onSelectDrawingItem={noop} onHoverObject={noop} onClearHoverObject={noop}/><div className="pointer-events-none absolute left-3 top-3 rounded bg-white/90 px-3 py-1 text-xs">{selected.name}｜{r16Contract.revision}｜原生模型，不是AI效果图</div></div>
   <div className="mt-2 flex flex-wrap gap-4 text-xs"><button onClick={download}>导出当前实际实体依据</button><button onClick={()=>{const h=window as unknown as {__ModelEvidenceCapture?:()=>unknown};const data=h.__ModelEvidenceCapture?.();if(data)setRaw(JSON.stringify(data));}}>显示当前原生场景JSON</button>{raw&&<button onClick={()=>setRaw('')}>收起原生场景</button>}<span>{note}</span><span>{model.defaultWorkspaceRevision}</span><span>2F仅两柜实体与必要表达变化；本层房界/飘窗/其他家具保持公开873d基线。本次实体增量另含1F三柜与三草稿关联。</span></div>
   {raw&&<textarea aria-label="R16当前实际场景JSON" readOnly value={raw} className="h-32 w-full"/>}
  </section>
 </main>;
}
