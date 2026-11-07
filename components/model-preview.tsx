"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Floor3DView } from "@/components/floor-3d-view";
import { defaultSpaceData } from "@/data/mock-space";
import defaultWorkspaceIdentity from "@/data/default-workspace.json";
import b2DesignCameras from "@/data/b2-r7-design-cameras.json";
import cabinetGeometry from '@/data/r14-geometry.json';
import {isR16Cloak} from '@/lib/r16-cloak-binding';
import { R11CycleControls } from '@/components/r11-cycle-controls';
import { buildModelPreviewOverview, getModelPreviewCameras, getModelPreviewScene, modelPreviewCameraLabel, modelPreviewFloors, modelPreviewLabels, resolveModelPreviewFloor } from "@/lib/model-preview";
import type { Drawing3DWallMode } from "@/lib/drawing-3d-profiles";
import type { MobileQuality, FixedCameraView } from "@/types/space";

const noop = () => undefined;
const controlClass = "min-h-11 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#586349]";

export function ModelPreview() {
  const searchParams = useSearchParams();
  const mechanicalStage = defaultWorkspaceIdentity.defaultWorkspaceRevision.includes('four-items-');
  const r14SubsetStage=defaultWorkspaceIdentity.defaultWorkspaceRevision.includes('r14-r08-integrated');
  const m3B1Stage=defaultWorkspaceIdentity.defaultWorkspaceRevision.includes('b1-selected2250-staged');
  const unifiedR12Stage=defaultWorkspaceIdentity.defaultWorkspaceRevision.includes('source-ratio-A-integrated');
  const r15Stage=Object.hasOwn(cabinetGeometry.operations,'coat-north');
  const [actualEvidence,setActualEvidence]=useState('');
  const floorId = resolveModelPreviewFloor(searchParams.get("floor"));
  const b1Review=floorId==='B1'&&searchParams.get('review')==='1';
  const workspace = defaultSpaceData.workspace;
  const r16Stage=workspace.furniture.some(isR16Cloak);
  const floor = defaultSpaceData.floors.find((item) => item.id === floorId)!;
  const [selection, setSelection] = useState({ floorId, id: searchParams.get("camera") ?? "overview", nonce: 0 });
  const [wallOverride, setWallOverride] = useState<Drawing3DWallMode | null>(null);
  const [quality, setQuality] = useState<MobileQuality>("balanced");
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 1000, height: 700 });
  const diagnostics=searchParams.get('diagnostics')==='1',evidence=(floorId==='B2'&&diagnostics&&searchParams.get('evidence')==='1')||(floorId==='2F'&&searchParams.get('toiletReview')==='1');
  const b2Party=searchParams.get('state')==='party6',b2Bike=searchParams.get('bike')==='S'?'S':'U',pull=diagnostics?Math.max(0,Math.min(300,Number(searchParams.get('pull')??0))):0,seat=searchParams.get('seat')??'west-1';
  const scene = useMemo(() => {const furniture=floorId==='B2'?workspace.furniture.filter(f=>b2Party||!/^furn-b2-chair-(west|east)-2-/.test(f.id)).map(f=>f.id===`furn-b2-chair-${seat}-candidate-20261030`?{...f,position:{...f.position,x:f.position.x+(seat.startsWith('west')?-pull:pull)/120}}:f):workspace.furniture;return getModelPreviewScene(floorId,workspace.houseStructuresByFloor,furniture);}, [floorId, workspace,b2Party,pull,seat]);
  const b2Link=(key:string,value:string)=>{const q=new URLSearchParams(searchParams.toString());q.set('floor','B2');q.set(key,value);return '?'+q.toString();};
  const cameras = useMemo(() => [...(floorId==='B2'?b2DesignCameras.cameras.map(view=>({...view,name:({'B2-R7-overall':'整体空间','B2-R7-eye-1':'左侧座位视角','B2-R7-eye-2':'中央偏左座位视角','B2-R7-eye-3':'中央偏右座位视角','B2-R7-eye-4':'右侧座位视角','B2-R7-role-inspection':'收纳与骑行区','B2-R7-sofa-inspection':'沙发与茶几','B2-R7-chair-inspection':'餐桌与座椅'} as Record<string,string>)[view.id]??view.name})) as FixedCameraView[]:getModelPreviewCameras(floorId, workspace.cameraViews)), ...(floorId === "1F" ? [
    ...(!unifiedR12Stage?[
    {id:"review-c2-dining",name:"C2设计桌椅关系·待成品细化",floor:"1F",cameraPosition:{x:1.145,y:2.6,z:3.1},target:{x:1.145,y:.65,z:1.35},fov:62},
    {id:"review-c2-basket",name:"中篮与邻椅·分次使用设计",floor:"1F",cameraPosition:{x:1.6,y:2.2,z:2.8},target:{x:2.7,y:.45,z:2.2},fov:56}]:[]),
    {id:"review-entry-B",name:"入口B单抽动作·五金待核",floor:"1F",cameraPosition:{x:-1.85,y:1.6,z:-2.7},target:{x:-1.25,y:.5,z:-3.1},fov:52},
    {id:"review-entry-B-wide",name:"入口B五抽屉完整柜体",floor:"1F",cameraPosition:{x:-1.9,y:1.4,z:-1.8},target:{x:-1.05,y:.5,z:-3.1},fov:52},
    {id:'review-r10-tables',name:'固定八席与长桌｜板腿待深化',floor:'1F',cameraPosition:{x:.5,y:4.6,z:-.35},target:{x:.5,y:0,z:-.35},fov:42},
    {id:'review-r10-r14',name:'R15餐边柜与分次取物',floor:'1F',cameraPosition:{x:0,y:1.7,z:1.4},target:{x:3.1,y:1.1,z:1.4},fov:52},
    {id:'review-r10-d005',name:'公卫门与餐边柜新弧端接口',floor:'1F',cameraPosition:{x:2.4,y:6.8,z:1.2},target:{x:2.8,y:.4,z:-.4},fov:45}
  ] as FixedCameraView[] : []), ...(floorId === "YARD" ? [
    {id:"review-c03a-overall",name:"C03A已采纳冷态布局·界线待核",floor:"YARD",cameraPosition:{x:7.8,y:6.8,z:-10},target:{x:.6,y:.6,z:-4.7},fov:53},
    {id:"review-c03a-sink",name:"C03A东端朝西池·接口待选型",floor:"YARD",cameraPosition:{x:2.1,y:1.6,z:-5.8},target:{x:3.09,y:.86,z:-5.7},fov:58},
    {id:"review-c03a-cold-park",name:"C03A同一炉冷归位·非热态许可",floor:"YARD",cameraPosition:{x:-.6,y:2.3,z:-4.7},target:{x:-.2,y:.85,z:-5.75},fov:56}
  ] as FixedCameraView[] : []),...(floorId==='2F'?[
    ...(unifiedR12Stage?[
     {id:'review-r12-master',name:'主卧布局与南飘窗｜按图比例推定',floor:'2F',cameraPosition:{x:2.5,y:7,z:1.7},target:{x:2.5,y:0,z:1.5},fov:44},
     {id:'review-g02-north',name:'双侧衣帽四门与分侧新循环',floor:'2F',cameraPosition:{x:.3,y:7,z:-.2},target:{x:.3,y:.6,z:-2.4},fov:48},
     {id:'review-r12-mainbath',name:'主卫四件与实际入口',floor:'2F',cameraPosition:{x:2.5,y:6,z:-2.5},target:{x:2.5,y:0,z:-2.5},fov:42},
     {id:'review-r12-guest',name:'客卫普通900转角双移门',floor:'2F',cameraPosition:{x:-2.3,y:5,z:-2.4},target:{x:-2.3,y:0,z:-2.4},fov:42}
    ]:[
     {id:'review-approved-toilet',name:'主卫坐便西背东向已准增量｜缸盆等冲突保留',floor:'2F',cameraPosition:{x:2.6,y:5.8,z:.15},target:{x:2.6,y:.5,z:-2.8},fov:42},
     {id:'review-r10-closets',name:'已合每侧三门和功能高度｜摆位接续中',floor:'2F',cameraPosition:{x:.55,y:4.8,z:.6},target:{x:.55,y:1,z:-2.5},fov:47}
    ])
  ] as FixedCameraView[]:[]),...(floorId==='B1'?[
    {id:'review-b1-2250-whole',name:'B1已选2250尾长｜保原弧主体',floor:'B1',cameraPosition:{x:0,y:15,z:.1},target:{x:0,y:0,z:0},fov:42},
    {id:'review-b1-2250-local',name:'B1 · 2250尾段原生地坪与右界｜非工程验收',floor:'B1',cameraPosition:{x:1.85,y:5.9,z:3.1},target:{x:1.5,y:.25,z:2.3},fov:48}
  ] as FixedCameraView[]:[])].filter(view=>!unifiedR12Stage||floorId!=='2F'||view.id.startsWith('review-r12-')||view.id==='review-g02-north'||['designer-camera-2f-v3-08-parent','designer-camera-2f-v3-09-child','designer-camera-2f-v3-10-balcony'].includes(view.id)).map(view=>unifiedR12Stage?{...view,name:({'designer-camera-2f-v3-08-parent':'客房1｜原有床柜与封窗阳台','designer-camera-2f-v3-09-child':'客房2｜原有床柜布局','designer-camera-2f-v3-10-balcony':'客房2封窗阳台｜收纳与活动面'} as Record<string,string>)[view.id]??view.name}:view), [floorId, workspace.cameraViews, unifiedR12Stage]);
  const selectedCameraId = selection.floorId === floorId ? selection.id : "overview";
  const authored = cameras.find((view) => view.id === selectedCameraId);
  const overview = useMemo(() => buildModelPreviewOverview(floorId, scene.structure, { ...viewport, topInset: 20, bottomInset: 20 }), [floorId, scene.structure, viewport]);
  const selectedView = authored ?? overview;
  const requestedCamera = useMemo(() => ({ view: selectedView, nonce: `${floorId}:${selectedView.id}:${selection.nonce}:${authored ? "fixed" : `${viewport.width}x${viewport.height}`}`.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0) }), [authored, floorId, selectedView, selection.nonce, viewport]);
  const drawingItems = useMemo(() => workspace.drawingItems.filter((item) => item.floorId === floorId || (floorId === "YARD" && item.floorId === "1F")), [floorId, workspace.drawingItems]);
  const wallMode = wallOverride ?? (authored ? "full" : "cutaway");

  useEffect(() => {
    const element = canvasAreaRef.current;
    if (!element) return;
    const update = () => {
      const bounds = element.getBoundingClientRect();
      const next = { width: Math.max(240, Math.round(bounds.width)), height: Math.max(240, Math.round(bounds.height)) };
      setViewport((current) => current.width === next.width && current.height === next.height ? current : next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSelection((current) => ({ floorId, id: searchParams.get("camera") ?? "overview", nonce: current.nonce + 1 }));
    setWallOverride(null);
  }, [floorId, searchParams]);

  const selectView = (id: string) => {
    setSelection((current) => ({ floorId, id, nonce: current.nonce + 1 }));
    setWallOverride(null);
  };

  return (
    <main className="flex min-h-dvh flex-col bg-[#f3efe7] text-[#32382f] lg:h-dvh lg:overflow-hidden" data-testid="model-preview" data-preview-floor={floorId} data-model-revision={defaultWorkspaceIdentity.defaultWorkspaceRevision}>
      {b1Review&&<header className="shrink-0 border-b bg-[#faf8f2] px-4 py-2 text-sm"><h1>B1 墙栏R03局部修正｜保原弧与2250尾长</h1><p className="text-xs">墙帽齐220原轴、原截面栏杆连续斜接及去重复柱；实际栏高1070、板厚／承载／现场待核，不是地下室全案批准。</p><nav className="flex gap-4 text-xs"><button onClick={()=>selectView('review-b1-2250-whole')}>B1整层</button><button onClick={()=>selectView('review-b1-2250-local')}>2250局部</button></nav></header>}
      <header style={b1Review?{display:'none'}:undefined} className="shrink-0 border-b border-[#d9d5ca] bg-[#faf8f2] px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7c816e]">LIN YU LAKESIDE / LIVE MODEL</p>
            <h1 className="mt-1 text-xl font-medium tracking-tight">{modelPreviewLabels[floorId].title}</h1>
            <p className="mt-2 text-xs text-[#7c816e]" data-testid="model-design-note">方案设计中，尺寸待核</p>
            {r15Stage&&<p data-testid="r15-integration-status" className="mt-2 max-w-4xl text-xs leading-5 text-amber-900">已采用柜体：1F餐边柜{cabinetGeometry.parts.length}构件／{Object.keys(cabinetGeometry.operations).length}操作；{r16Stage?'2F每侧四门、原24模块保留；':''}另接B1墙栏R03局部修正，模型JSON不变；不含新B2或材料全案，不是工程认证。<Link className="ml-2 underline" href="/r15/?audit=1">1F开关门／低视角</Link>{r16Stage&&<Link className="ml-2 underline" href="/closet-candidate/?audit=1">2F新八门／新分侧循环</Link>}</p>}
            {mechanicalStage&&!m3B1Stage&&<p data-testid="integration-stage-status" className="mt-2 max-w-4xl text-xs leading-5 text-amber-900">{r14SubsetStage?'R10-M2 独立增量，未发布：M1基础上已接餐边柜R08全部113真实零件、退让弧端／普通柜门、D005房界门向、全尺寸灯与L34关联。原审已关闭门弧柜冲突，实际合入本版本继续复核。':'R10-M1 分部集成，尚未发布：已合1350圆桌／2298长桌实体、衣帽每侧三门及功能高度。'} 桌椅最终布局及两层共同墙轴仍待统一整合；不代表四项完成，B2、墙轴、楼梯和沙发不改。</p>}
            {m3B1Stage&&<p data-testid="integration-stage-status" className="mt-2 max-w-4xl text-xs leading-5 text-amber-900">M3a 独立暂存，未发布：已验M2桌体／衣帽／原生餐边柜113件、D005、L34全部保持，仅加已选B1右尾2250与对应地坪/研究护栏。原弧主体、其他家具与楼梯不改；不是四项完成，最终1F八席及共同1F2F/R11方案尚待整合、验收和采用。</p>}
            {unifiedR12Stage&&<p data-testid="integration-stage-status" className="mt-2 max-w-4xl text-xs leading-5 text-amber-900">本次整合：B1已选2250尾长、1350圆桌／2298长桌与固定八席、餐边柜、每侧{r16Stage?'四':'三'}门衣帽及两层按图比例协调。主卧内部A北220／入口1400已采用。尺寸为方案推定，待复尺；不代表结构、成品安装、舒适或全屋任意同时使用确认。<Link className="ml-2 underline" href={`/unified-r12/?floor=${floorId}&camera=review-r12-plan&audit=1`}>整层与局部实景</Link></p>}
            {(r14SubsetStage||unifiedR12Stage)&&floorId==='1F'&&<nav aria-label="餐边柜实体分态" className="mt-2 flex flex-wrap gap-2 text-xs">{[['closed','柜门关闭'],['base-open','底柜单门'],['upper-open','吊柜单门'],['coat-open',r15Stage?'挂衣双门':'挂衣单门'],['basket-open','单篮全开']].map(([state,label])=>{const q=new URLSearchParams(searchParams.toString());q.set('r14',state);q.delete('r14Op');q.delete('r14Actor');q.set('phase','closed');q.set('t','0');q.set('d005','0');q.set('camera','review-r10-r14');return <a key={state} className={controlClass+' bg-white'} href={'?'+q.toString()}>{label}</a>;})}</nav>}
            {unifiedR12Stage&&floorId==='2F'&&!r16Stage&&<R11CycleControls/>}{r16Stage&&floorId==='2F'&&<p className="mt-2 text-xs text-amber-900">新八门按另一侧关闭、2+3双开后抽屉350的分次条件校核；600×1700有限代理，最薄2.5mm保守余量，不是舒适或完整换握认证。</p>}
            {floorId==='B2'&&<nav className="mt-2 flex flex-wrap gap-2 text-xs" aria-label="地下二层使用方式">
              <a className={controlClass+' bg-white'} href={b2Link('state','daily4')} aria-current={!b2Party?'page':undefined}>日常四椅</a><a className={controlClass+' bg-white'} href={b2Link('state','party6')} aria-current={b2Party?'page':undefined}>聚餐六椅</a>
              <a className={controlClass+' bg-white'} href={b2Link('bike','U')} aria-current={b2Bike==='U'?'page':undefined}>骑行使用</a><a className={controlClass+' bg-white'} href={b2Link('bike','S')} aria-current={b2Bike==='S'?'page':undefined}>分件收存</a>
            </nav>}
            {floorId === "YARD" && diagnostics && <p className="mt-2 max-w-4xl text-xs leading-5 text-amber-900">北院C03A冷态设计布局已采纳，待成品/构造深化：东端朝西池、独立350浅备餐储物、薄柜、同一炉冷归位及绿化工作铺装联动。C03B东点火位未采用；170/120、盆边35/45及664×600服务口仅待选型接口。真实檐口、挂装承载、MEP与热态未批准，旧护栏显示不代表美观或材性认可。</p>}
            {floorId === "1F" && <>
              {diagnostics&&!unifiedR12Stage&&<p className="mt-2 max-w-4xl text-xs leading-5 text-amber-900" data-testid="c2-design-limits">已采纳设计方向，待成品细化：L2侧偏72.61°的真面向/腿部、篮把485.4mm平面距与546–564mm模型高度、入口37.9mm名义及门套五金仍待核。单人分次使用；非任意动作同时开、舒适/加工或最终PBR通过。</p>}
              {unifiedR12Stage&&<p className="mt-2 max-w-4xl text-xs leading-5 text-amber-900">日常固定八席按600×1800代理、分次离座和收椅校核；约612mm名义夹口及5mm额外边余很紧，不代表舒适。长桌实心板腿保留，椅前至腿152.5mm、座面至桌底210mm，腿膝与久坐待深化。1750拓展／聚会十席目标保留，未复验，不显示未采用座位。</p>}
              <nav className="mt-2 flex flex-wrap gap-2 text-xs" aria-label="C2真实三维动作状态">
                {(unifiedR12Stage?[["daily","closed","日常6+2席"],["daily","chairs-pulled","单椅声明动作"],["daily","entry-open","入口单抽全开400"]]:[["daily","closed","日常6+2席"],["party","closed","聚餐10+2席"],["party","basket-open","单篮全开400"],["party","chairs-pulled","单椅拉出400"],["daily","entry-open","入口B第3抽全开400"]]).map(([state,phase,label]) => <a key={phase+state} className="rounded border px-2 py-1" href={`?floor=1F&state=${state}&phase=${phase}&camera=${searchParams.get("camera")??"overview"}&seat=${searchParams.get("seat")??"R1"}`}>{label}</a>)}
                {searchParams.get("phase") === "chairs-pulled" && <select aria-label="逐椅拉出对象" value={searchParams.get("seat")??"R1"} onChange={event => {const next=new URLSearchParams(searchParams.toString());next.set("seat",event.target.value);next.set('t','1');window.location.search=next.toString();}}>{[...Array.from({length:!unifiedR12Stage&&searchParams.get("state")==="party"?10:6},(_,index)=>`R${index+1}`),"L1","L2"].map(id=><option key={id}>{id}</option>)}</select>}
              </nav>
            </>}
            {diagnostics&&floorId==='B2'&&<details open data-testid="b2-design-diagnostics" className="mt-2 max-w-4xl text-xs leading-5 text-amber-900"><summary>尺寸与校核说明</summary><p>R7设计已采纳，非采购或四成人舒适批准。四眼高1150/Y3500为假设，竖50°；精确16:10证据须evidence=1。当前{b2Party?'六':'四'}椅、{b2Bike==='S'?'分件收存':'骑行使用'}，单{seat}拉{pull}、其余0。线路仅参考作者全拉300静态，不同态复验；源估差大于10.8204等微余，真人多人坐起/登梯、骑行负重收放线缆、热工MEP及现场未准。单台现车+独立台U/S非两套采购；RESIDENCE四席皮沙发仅参考，非已买/确认布艺。原生35mm显示抬高、TV源60/细模80及屏面前凸口径留档。</p><nav>{[0,75,150,225,300].map(v=><a className="mr-3 underline" key={v} href={b2Link('pull',String(v))}>单椅{v}</a>)}</nav></details>}
          </div>
          <Link href="/preview" className="shrink-0 rounded-full border border-[#d5d6ca] px-4 py-2.5 text-xs hover:bg-[#eeeee5]">全屋入口 ↗</Link>
        </div>
        <nav aria-label="切换预览区域" className="mt-3 flex gap-1.5 overflow-x-auto">
          {modelPreviewFloors.map((id) => <Link key={id} href={`/model-preview?floor=${id}`} aria-current={id === floorId ? "page" : undefined} className={`min-h-11 min-w-14 rounded-xl px-4 py-3 text-center text-sm font-semibold transition sm:min-w-20 ${id === floorId ? "bg-[#46563e] text-white" : "bg-[#eae9df] text-[#69705e] hover:bg-[#dedfd2]"}`}>{id === "YARD" ? "院子" : id}</Link>)}
        </nav>
      </header>

      <div style={b1Review?{display:'block',minHeight:0}:evidence?{display:'block',width:1632,flex:'none'}:undefined} className="grid min-h-0 flex-1 gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_272px]">
        <section className="flex min-w-0 flex-col gap-2.5">
          <div className="flex shrink-0 flex-wrap items-center gap-2" aria-label="模型显示设置">
            <button type="button" onClick={() => selectView("overview")} className={`${controlClass} border-[#c5ccbc] bg-white`} data-testid="model-overview">↖ 全区总览</button>
            <a data-testid="model-diagnostics-toggle" className={`${controlClass} inline-flex items-center border-[#c5ccbc] bg-white`} href={'?'+(()=>{const q=new URLSearchParams(searchParams.toString());q.set('floor',floorId);if(diagnostics){q.delete('diagnostics');q.delete('evidence');q.delete('pull');q.delete('sweep');}else q.set('diagnostics','1');return q.toString();})()}>{diagnostics?'返回干净预览':'尺寸与校核'}</a>
            <div className="flex items-center rounded-xl border border-[#d1d3c6] bg-white p-0.5" role="group" aria-label="墙体显示">
              {([["cutaway", "剖切看布局"], ["full", "完整看空间"]] as const).map(([mode, label]) => <button key={mode} type="button" aria-pressed={wallMode === mode} onClick={() => setWallOverride(mode)} className={`min-h-10 rounded-lg px-3 text-xs ${wallMode === mode ? "bg-[#e2e7d8] font-semibold text-[#394630]" : "text-[#757a6d] hover:bg-stone-50"}`}>{label}</button>)}
            </div>
            <label className="ml-auto flex min-h-11 items-center gap-1.5 rounded-xl border border-[#d1d3c6] bg-white px-2.5 text-xs">
              <span className="text-[#757a6d]">画质</span>
              <select aria-label="模型画质" value={quality} onChange={(event) => setQuality(event.target.value as MobileQuality)} className="min-h-10 bg-transparent text-[#394630] outline-none">
                <option value="balanced">流畅</option><option value="high">精细</option>
              </select>
            </label>
          </div>
          <div ref={canvasAreaRef} style={b1Review?{height:'calc(100svh - 190px)',minHeight:350,flex:'none'}:evidence?{width:1600,height:1000,minHeight:1000,flex:'none',border:0,borderRadius:0}:undefined} className="relative h-[62svh] min-h-[420px] overflow-hidden rounded-[24px] border border-[#d6d3c7] bg-[#e7e0d5] lg:h-auto lg:min-h-0 lg:flex-1" data-testid="model-canvas-area">
            <Floor3DView
              floor={floor}
              houseStructure={scene.structure}
              houseStructuresByFloor={workspace.houseStructuresByFloor}
              stairSystems={workspace.stairSystems}
              stairLandings={workspace.stairLandings}
              stairOpenings={workspace.stairOpenings}
              furniture={scene.furniture}
              allFurniture={scene.furniture}
              drawingItems={drawingItems}
              allDrawingItems={drawingItems}
              drawingSheetType="sitePlan"
              cameraViews={workspace.cameraViews}
              cameraViewRequest={requestedCamera}
              cameraLockEnabledOverride={b1Review&&searchParams.get('audit')==='1'&&selectedCameraId.startsWith('review-b1-2250')}
              roomTourViews={workspace.roomTourViews}
              lightingDesign={workspace.lightingDesign}
              selectedObjectId=""
              selectedFurnitureId=""
              showObjectIds={false}
              externalPresentationMode
              hidePresentationUi
              presentationWallDisplayMode={wallMode}
              cameraCollisionEnabledOverride={false}
              mobileQuality={quality}
              onShowObjectIdsChange={noop}
              onSelectStructure={noop}
              onSelectFurniture={noop}
              onSelectDrawingItem={noop}
              onHoverObject={noop}
              onClearHoverObject={noop}
            />
            <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-xl border border-white/60 bg-[#faf8f2]/90 px-3 py-2 text-xs text-[#4c5544] shadow-sm backdrop-blur" data-testid="model-active-view">{authored ? modelPreviewCameraLabel(authored) : "全区总览 · 可自由旋转"}</div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-[#777c70]">
            {(searchParams.get('toiletReview')==='1'||searchParams.get('audit')==='1')&&<button type="button" onClick={()=>{const capture=(window as unknown as {__ModelEvidenceCapture?:()=>unknown}).__ModelEvidenceCapture;if(!capture)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(capture())],{type:'application/json'}));a.download=`${defaultWorkspaceIdentity.defaultWorkspaceRevision}-${floorId}-actual-scene.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}}>导出当前模型实景依据</button>}
            {searchParams.get('audit')==='1'&&<button type="button" onClick={()=>{const capture=(window as unknown as {__ModelEvidenceCapture?:()=>unknown}).__ModelEvidenceCapture;if(capture)setActualEvidence(JSON.stringify(capture()));}}>显示实景几何 JSON</button>}
            {actualEvidence&&<button onClick={()=>setActualEvidence('')}>收起几何明细</button>}
            <p>拖动旋转 · 滚轮缩放 · 右键拖动平移 · 触屏双指缩放和平移</p>
            <button type="button" className="min-h-9 rounded-lg px-2 font-semibold text-[#46563e] hover:bg-[#e4e7dc]" onClick={() => setSelection((current) => ({ floorId, id: authored?.id ?? "overview", nonce: current.nonce + 1 }))}>恢复当前机位</button>
          </div>
          {actualEvidence&&<textarea aria-label="当前实际场景JSON" readOnly value={actualEvidence} className="h-28 w-full shrink-0 text-xs"/>}
        </section>

        <aside style={b1Review||evidence?{display:'none'}:undefined} className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#d8d8cd] bg-[#faf8f2]">
          <div className="border-b border-[#e3e1d7] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#858c77]">SPACE & FURNITURE</p>
            <h2 className="mt-1 text-base font-semibold">{modelPreviewLabels[floorId].subtitle}</h2>
            <p className="mt-2 text-xs leading-5 text-[#818575]">选择机位看细节，随时回到总览。机位切换后仍可拖动观察。</p>
          </div>
          <nav aria-label="设计机位" className="grid gap-1.5 p-3 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-1 lg:overflow-y-auto lg:content-start">
            {cameras.map((view, index) => <button key={view.id} type="button" aria-pressed={authored?.id === view.id} onClick={() => selectView(view.id)} className={`flex min-h-14 items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${authored?.id === view.id ? "border-[#a8b39b] bg-[#e7ecdf] text-[#364c30]" : "border-transparent text-[#66705d] hover:border-[#d9ddcf] hover:bg-[#f0f1e8]"}`} data-model-camera={view.id}>
              <span className="pt-0.5 text-xs tabular-nums text-[#969f86]">{String(index + 1).padStart(2, "0")}</span><span className="text-xs leading-5">{modelPreviewCameraLabel(view)}</span>
            </button>)}
          </nav>
          <div className="shrink-0 border-t border-[#e3e1d7] px-4 py-3 text-[11px] leading-5 text-[#858575]">
            <p>当前模型 · 家具与空间方案讨论</p>
            <p>默认流畅预览；精细档拖动时降低采样，松手恢复。家具和材质不切换。</p>
            {floorId === "YARD" && <p className="mt-1">沿冻结源院界、窗与天窗，不占西争议带；颜色/炉形为参考，不是已选产品。既有水电与灯位未随柜移动，仍需独立核接口；不据早期讨论进深或护栏外观放行施工。</p>}
            <p>建筑尺寸待正式图纸校核。</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
