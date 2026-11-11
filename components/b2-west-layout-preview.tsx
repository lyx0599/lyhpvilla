'use client';
import {useMemo} from 'react';
import {useSearchParams} from 'next/navigation';
import {Floor3DView} from '@/components/floor-3d-view';
import {defaultSpaceData} from '@/data/mock-space';
import model from '@/data/default-workspace.json';
import J from '@/data/b2-south-scene.json';
import VIEWS from '@/data/b2-r3-viewer-frames.json';
import {getModelPreviewScene} from '@/lib/model-preview';
import type {FixedCameraView} from '@/types/space';
const noop=()=>undefined;
export function B2WestLayoutPreview(){
 const q=useSearchParams(),party=q.get('state')==='party6',phase=q.get('phase')??'closed',view=VIEWS.views.find(v=>v.id===(q.get('frame')??'0'))??VIEWS.views[0];
 const views:FixedCameraView[]=[{id:'whole',name:'整层北上',floor:'B2',cameraPosition:{x:0,y:19,z:.001},target:{x:0,y:0,z:0},fov:50},{id:'social',name:'南岛北桌·侧接变体',floor:'B2',cameraPosition:{x:-4,y:6,z:0},target:{x:-2.5,y:.8,z:3.5},fov:65},{id:'doors',name:'东柜深外挂及停车',floor:'B2',cameraPosition:{x:1,y:4,z:4},target:{x:3.7,y:1,z:2.2},fov:68},{id:'east',name:'东侧纵骑与中部留白',floor:'B2',cameraPosition:{x:3.3,y:3.8,z:3.4},target:{x:1.8,y:.7,z:.8},fov:68}];
 const selected=views.find(v=>v.id===(q.get('camera')??'whole'))??views[0];
 const workspace=useMemo(()=>{const d=structuredClone(model) as unknown as typeof defaultSpaceData.workspace;d.furniture=d.furniture.filter(f=>{const k=Object.entries(J.chairStableIds).find(([,v])=>v===f.id)?.[0];return !k||k in view.commonChairPoses;}).map(f=>{const k=Object.entries(J.chairStableIds).find(([,v])=>v===f.id)?.[0];if(!k||!f.render3d)return f;const p=(view.commonChairPoses as Record<string,number[]>)[k];f.position={x:p[0]/120,y:p[1]/90,rotation:p[2]};f.render3d={...f.render3d,elevationMm:127.5};return f;});return d as unknown as typeof defaultSpaceData.workspace;},[view]);
 const floor=defaultSpaceData.floors.find(f=>f.id==='B2')!;
 const scene=useMemo(()=>getModelPreviewScene('B2',workspace.houseStructuresByFloor,workspace.furniture),[workspace]);
 const items=workspace.drawingItems.filter(i=>i.floorId==='B2');
 const link=(v:Record<string,string>)=>{const n=new URLSearchParams(q.toString());n.set('audit','1');for(const[k,x]of Object.entries(v))n.set(k,x);return'?'+n.toString()};
 return <main className="min-h-screen bg-[#eeece6] text-[#293d36]"><header className="border-b bg-white px-5 py-3 text-sm leading-6"><h1 className="text-lg font-semibold">B2 R06 R4｜四人新建筑 · 南岛北桌2000×900</h1><p>{J.revision} · 当前集成设计的独立动作视图 · 偶六/备用椅已取消 · 有限研究动作 · 非采购或施工批准</p><p>源墙柱门梯、2600沙发/100寸电视及四把普通椅原生网格保留；无假定东侧天窗；全屋预算口径70万不含备用金；彩色人体是同源尺寸研究代理，不冒充制造商铰点、现场结构或承重证明。</p><p className="text-red-800">{view.name} · {view.description}</p><nav className="flex flex-wrap gap-3">{views.map(v=><a className="underline" key={v.id} href={link({camera:v.id})}>{v.name}</a>)}</nav><nav className="flex flex-wrap gap-3">{VIEWS.views.map(v=><a className="underline" key={v.id} href={link({frame:v.id,slide:String(v.slide),fridge:String(v.fridge),group:v.group})}>{v.name}</a>)}</nav></header><div className="relative h-[850px] overflow-hidden" data-testid="west-model-canvas"><Floor3DView floor={floor} houseStructure={scene.structure} houseStructuresByFloor={workspace.houseStructuresByFloor} stairSystems={workspace.stairSystems} stairLandings={workspace.stairLandings} stairOpenings={workspace.stairOpenings} furniture={scene.furniture} allFurniture={scene.furniture} drawingItems={items} allDrawingItems={items} drawingSheetType="sitePlan" cameraViews={workspace.cameraViews} cameraViewRequest={{view:selected,nonce:0}} cameraLockEnabledOverride roomTourViews={workspace.roomTourViews} lightingDesign={workspace.lightingDesign} selectedObjectId="" selectedFurnitureId="" showObjectIds={false} externalPresentationMode hidePresentationUi presentationWallDisplayMode="cutaway" cameraCollisionEnabledOverride={false} mobileQuality="balanced" onShowObjectIdsChange={noop} onSelectStructure={noop} onSelectFurniture={noop} onSelectDrawingItem={noop} onHoverObject={noop} onClearHoverObject={noop}/><div className="pointer-events-none absolute left-3 top-3 bg-white/90 px-3 py-1 text-xs">{selected.name} · {view.name} · {q.get('bike')??'U'} · {J.revision}</div></div></main>;
}
