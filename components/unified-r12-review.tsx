'use client';
import {useEffect,useMemo,useState} from 'react';
import {useSearchParams,useRouter} from 'next/navigation';
import Link from 'next/link';
import {isR16Cloak} from '@/lib/r16-cloak-binding';
import {Floor3DView} from '@/components/floor-3d-view';
import {MasterNativeDimensionsOverlay,type MasterDimensionEvidence} from '@/components/master-native-dimensions-overlay';
import {R11CycleControls} from '@/components/r11-cycle-controls';
import {defaultSpaceData} from '@/data/mock-space';
import currentModel from '@/data/default-workspace.json';
import {getModelPreviewScene,resolveModelPreviewFloor} from '@/lib/model-preview';
import {oneFDiningEvidence} from '@/lib/one-f-dining-evidence';
import r14Geometry from '@/data/r14-geometry.json';
import type {FixedCameraView} from '@/types/space';
const noop=()=>undefined;
export function UnifiedR12Review(){
 const router=useRouter();
 const q=useSearchParams(),floorId=resolveModelPreviewFloor(q.get('floor')),before=false;
 const identity=currentModel,workspace=identity as unknown as typeof defaultSpaceData.workspace;
 const r16Stage=workspace.furniture.some(isR16Cloak);
 const floor=defaultSpaceData.floors.find(f=>f.id===floorId)!;
 const scene=useMemo(()=>getModelPreviewScene(floorId,workspace.houseStructuresByFloor,workspace.furniture),[floorId,workspace]);
 const [cameraId,setCameraId]=useState(q.get('camera')??'review-r12-plan');
 const [cutaway,setCutaway]=useState(true),[raw,setRaw]=useState('');
 const [dimension,setDimension]=useState<MasterDimensionEvidence|null>(null);
 const [captureNote,setCaptureNote]=useState('');
 const [dining,setDining]=useState<ReturnType<typeof oneFDiningEvidence>|null>(null);
 useEffect(()=>{setCameraId(q.get('camera')??'review-r12-plan');setDimension(null);setDining(null);setRaw('');},[q]);
 const views:FixedCameraView[]=[
  {id:'review-r12-plan',name:`${floorId} 同一实际俯视机位`,floor:floorId,cameraPosition:{x:0,y:14,z:.1},target:{x:0,y:0,z:0},fov:42},
  {id:'review-r12-north',name:`${floorId} 北部房间实际模型`,floor:floorId,cameraPosition:{x:.3,y:7,z:-.2},target:{x:.3,y:.6,z:-2.4},fov:48},
  {id:'review-r12-master',name:'主卧已选内部A与床尾真实薄柜',floor:floorId,cameraPosition:{x:2.5,y:7,z:1.7},target:{x:2.5,y:0,z:1.5},fov:44},
  {id:'review-r12-r14',name:'R15实际柜体和D005｜本地候选',floor:floorId,cameraPosition:{x:0,y:1.7,z:1.4},target:{x:3.3,y:1.1,z:1.4},fov:52}
  ,{id:'review-r12-guest',name:'客卫新900转角双移门｜实际统一场景',floor:floorId,cameraPosition:{x:-2.3,y:5,z:-2.4},target:{x:-2.3,y:0,z:-2.4},fov:42}
  ,{id:'review-r12-mainbath',name:'主卫完整原尺寸设施｜实际统一场景',floor:floorId,cameraPosition:{x:2.5,y:6,z:-2.5},target:{x:2.5,y:0,z:-2.5},fov:42}
  ,{id:'review-r12-tables',name:'固定八席｜桌椅原尺寸，板腿待深化',floor:floorId,cameraPosition:{x:.5,y:4.6,z:-.35},target:{x:.5,y:0,z:-.35},fov:42}
  ,{id:'review-r12-l1-eye',name:'L1面对桌端及真实支腿｜非人体舒适认证',floor:floorId,cameraPosition:{x:-.75,y:1.3,z:-1.05},target:{x:-.2,y:.5,z:-.334},fov:48}
  ,{id:'review-r12-coat',name:'当前取衣站8550/4380｜600×1800计算代理',floor:floorId,cameraPosition:{x:2.4,y:3.2,z:.15},target:{x:2.4,y:0,z:.15},fov:42}
 ];
 const selected=views.find(v=>v.id===cameraId)??(cameraId.endsWith('north')?views[1]:views[0]);
 const cameraRequest=useMemo(()=>({view:selected,nonce:(floorId+selected.id+String(before)).split('').reduce((h,c)=>(h*31+c.charCodeAt(0))|0,0)}),[floorId,selected.id,before]);
 const link=(fields:Record<string,string|null>)=>{const n=new URLSearchParams(q.toString());n.delete('variant');n.set('audit','1');if('r14' in fields&&!('r14Op' in fields)){n.delete('r14Op');n.delete('r14Actor');}if('r14Op' in fields&&!('r14Actor'in fields))n.delete('r14Actor');for(const [k,v]of Object.entries(fields))v===null?n.delete(k):n.set(k,v);return '?'+n.toString();};
 const capture=()=>{const fn=(window as unknown as {__ModelEvidenceCapture?:()=>unknown}).__ModelEvidenceCapture;return fn?.();};
 const setView=(id:string)=>{setCameraId(id);setDimension(null);};
 const items=workspace.drawingItems.filter(d=>d.floorId===floorId);
 return <main className="min-h-screen bg-[#f4f1e9] text-[#343c34]">
  <header className="border-b bg-[#faf8f2] px-4 py-2 text-xs leading-5">
   <h1 className="text-base font-semibold">{floorId}｜整合方案模型：按图比例推定，待复尺</h1>
   <p className="text-amber-900">R15本地分项集成候选：126构件／14操作，待原审及PMO二看、未发布。<Link className="ml-2 underline" href="/r15/?audit=1">柜体与低视角实景</Link></p>
   <p>内部A北220／门1400已采用；保西实墙、原床两400柜、南沿7800、B1原弧2250及楼梯。东9870为工作择值，非唯一实测。固定八席按600代理、分次动作校核，通路很紧；长桌板腿与腿膝空间待深化，不代表舒适或施工确认。</p>
   <nav className="flex flex-wrap gap-x-4"><a href={link({floor:'1F',camera:'review-r12-plan',closetCycle:null,cycleFrame:null})}>1F整层</a><a href={link({floor:'2F',camera:'review-r12-plan',closetCycle:null,cycleFrame:null})}>2F整层</a><a href={link({floor:'B1',camera:'review-r12-plan',closetCycle:null,cycleFrame:null})}>B1整层</a><button onClick={()=>setView('review-r12-north')}>北部局部</button>{floorId==='2F'&&<button onClick={()=>setView('review-r12-master')}>主卧局部</button>}{floorId==='1F'&&<button onClick={()=>setView('review-r12-r14')}>餐边柜实景</button>}</nav>
   {floorId==='2F'&&!before&&!r16Stage&&<R11CycleControls/>}
   {floorId==='2F'&&r16Stage&&<p className="text-amber-900">衣帽间新八门本地集成，旧三门循环禁用；600×1700有限代理、最薄2.5mm保守余量，四处松手再握不等于完整上肢动作。<Link className="ml-2 underline" href="/closet-candidate/?audit=1">新四门与分侧动作</Link></p>}
   {floorId==='2F'&&!before&&<nav aria-label="本轮卫浴实际分态" className="flex flex-wrap gap-x-4"><a href={link({camera:'review-r12-guest',d006:'0',guestEastSlide:'0',guestSouthSlide:'0',closetCycle:null,cycleFrame:null})}>客卫闭门</a><a href={link({camera:'review-r12-guest',d006:'90',closetCycle:null,cycleFrame:null})}>客卫向北开90°</a><a href={link({camera:'review-r12-guest',d006:'0',guestEastSlide:'440',guestSouthSlide:'440',closetCycle:null,cycleFrame:null})}>新900淋浴双移门</a><a href={link({camera:'review-r12-mainbath',entryOpen:'1',bathAction:'windowDrawer',closetCycle:null,cycleFrame:null})}>主卫靠窗抽屉</a><a href={link({camera:'review-r12-mainbath',entryOpen:'1',bathAction:'doorDrawer',closetCycle:null,cycleFrame:null})}>主卫靠门抽屉</a></nav>}
   {floorId==='1F'&&!before&&<nav aria-label="R15餐边柜和公卫门分态" className="flex flex-wrap gap-x-4">{[['closed','关闭柜'],['base-open','底柜单门'],['upper-open','上柜单门'],['coat-open','挂衣门'],['basket-open','单篮400']].map(([state,label])=><a key={state} href={link({camera:'review-r12-r14',r14:state,r14Op:null,r14Actor:null,d005:'0',phase:'closed',t:'0'})}>{label}</a>)}<a href={link({camera:'review-r12-north',d005:'0'})}>公卫门关闭</a><a href={link({camera:'review-r12-north',d005:'72'})}>公卫门全开72°</a></nav>}
   {floorId==='1F'&&!before&&<nav className="flex flex-wrap gap-x-4"><button onClick={()=>setView('review-r12-tables')}>八席与长桌局部</button><button onClick={()=>setView('review-r12-l1-eye')}>L1桌端支腿实景</button><button onClick={()=>{const d=capture();if(d)setDining(oneFDiningEvidence(d as Parameters<typeof oneFDiningEvidence>[0]));}}>量取当前L1桌位</button></nav>}
   {floorId==='1F'&&!before&&<nav aria-label="本轮原生动作检查" className="flex flex-wrap items-center gap-x-3"><button onClick={()=>router.replace(link({phase:'closed',r14:'closed',r14Op:null,t:'0'}),{scroll:false})}>八椅归位</button>{['R1','R2','R3','R4','R5','R6','L1','L2'].map(seat=><button key={seat} onClick={()=>router.replace(link({phase:'chairs-pulled',seat,t:'1',camera:'review-r12-plan',d005:'72',r14:'closed',r14Op:null}),{scroll:false})}>核{seat}端态</button>)}<label>单椅进度<input aria-label="单椅动作进度" type="range" min="0" max="1000" value={Math.round(Number(q.get('t')??1)*1000)} onChange={e=>router.replace(link({t:String(Number(e.target.value)/1000)}),{scroll:false})}/></label><label>R14单项<select aria-label="逐项原生R14操作" value={q.get('r14Op')??''} onChange={e=>router.replace(link({phase:'closed',r14:'closed',r14Op:e.target.value||null,r14t:'1',d005:'0',camera:'review-r12-r14'}),{scroll:false})}><option value="">全部关闭</option>{Object.keys(r14Geometry.operations).map(id=><option key={id} value={id}>{id}</option>)}</select></label><span>{q.get('seat')??'—'}／{q.get('phase')??'closed'}／R14 {q.get('r14Op')??q.get('r14')??'closed'}，只核声明分次状态</span></nav>}
   {floorId==='1F'&&!before&&<button onClick={()=>router.replace(link({phase:'closed',r14:'coat-open',r14Op:null,r14Actor:null,r15Actor:'coat',r14t:'1',d005:'0',camera:'review-r12-coat'}),{scroll:false})}>取衣600代理实景</button>}
  </header>
  <div className="px-3 py-2">
   {floorId==='1F'&&dining&&<aside className="mb-2 rounded border bg-white p-2 text-xs leading-5" aria-label="实际L1桌位量取">实际原生几何：椅前至桌边 {dining.chairFrontToTableEdgeMm.toFixed(1)}mm；椅前至支腿 {dining.chairFrontToLegMm.toFixed(1)}mm；座面至桌底 {dining.seatTopToTableUndersideMm.toFixed(1)}mm；沿桌宽中心偏 {dining.lateralCenterOffsetMm.toFixed(1)}mm；朝向桌心偏角 {dining.angleToTableCenterDeg.toFixed(2)}°；座宽与桌端投影交叠 {dining.sharedTableWidthOverlapMm.toFixed(1)}/{dining.seatWidthMm.toFixed(1)}mm。仅模型桌椅关系，不是腿膝人体／舒适或成品认证。</aside>}
   <div className="mb-2 flex gap-3 text-xs"><button onClick={()=>setView('review-r12-plan')}>固定整层机位</button><button aria-pressed={cutaway} onClick={()=>{setCutaway(v=>!v);setDimension(null);}}>{cutaway?'剖切看布局':'完整看空间'}</button>{floorId==='2F'&&<button onClick={()=>{const d=capture() as MasterDimensionEvidence|undefined;if(d?.masterDimensions)setDimension(d);}}>标注当前模型净距</button>}<span className="ml-auto text-amber-900">真实原生模型；非手绘／施工或整层通路通过</span></div>
   <div className="relative h-[500px] overflow-hidden rounded-xl border bg-[#e7e0d5]" data-testid="r12-model-canvas">
    <Floor3DView floor={floor} houseStructure={scene.structure} houseStructuresByFloor={workspace.houseStructuresByFloor} stairSystems={workspace.stairSystems} stairLandings={workspace.stairLandings} stairOpenings={workspace.stairOpenings} furniture={scene.furniture} allFurniture={scene.furniture} drawingItems={items} allDrawingItems={items} drawingSheetType="sitePlan" cameraViews={workspace.cameraViews} cameraViewRequest={cameraRequest} cameraLockEnabledOverride={q.get('audit')==='1'} roomTourViews={workspace.roomTourViews} lightingDesign={workspace.lightingDesign} selectedObjectId="" selectedFurnitureId="" showObjectIds={false} externalPresentationMode hidePresentationUi presentationWallDisplayMode={cutaway?'cutaway':'full'} cameraCollisionEnabledOverride={false} mobileQuality="balanced" onShowObjectIdsChange={noop} onSelectStructure={noop} onSelectFurniture={noop} onSelectDrawingItem={noop} onHoverObject={noop} onClearHoverObject={noop}/>
    {dimension&&<MasterNativeDimensionsOverlay evidence={dimension}/>}
    <div className="pointer-events-none absolute left-3 top-3 rounded bg-white/95 px-3 py-1 text-xs">{selected.name}｜{before?'前态':'按图比例推定'}</div>
   </div>
   <div className="mt-2 flex flex-wrap gap-5 text-xs"><button onClick={()=>{const data=capture() as {meshes?:unknown[];loadedSourceModel?:{defaultWorkspaceRevision?:string}}|undefined;if(!data?.meshes?.length){setCaptureNote('场景尚在加载，未生成模型证据；请待实际模型出现后重试。');return;}setRaw(JSON.stringify(data));setCaptureNote(`实际已载${data.meshes.length}个网格 · ${data.loadedSourceModel?.defaultWorkspaceRevision??'未识别版本'}`);}}>显示实景几何 JSON</button>{raw&&<button onClick={()=>setRaw('')}>收起几何明细</button>}<span>{identity.defaultWorkspaceRevision}</span><span role="status">{captureNote}</span></div>
   {raw&&<textarea aria-label="当前实际场景JSON" readOnly value={raw} className="mt-2 h-28 w-full text-xs"/>}
  </div>
 </main>;
}
