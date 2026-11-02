'use client';
import {Matrix4,Vector3} from 'three';
import type {buildMasterNativeDimensions} from '@/lib/master-native-dimensions';
export type MasterDimensionEvidence={masterDimensions:NonNullable<ReturnType<typeof buildMasterNativeDimensions>>;camera:{matrixWorld:number[];projectionMatrix:number[]};canvas:{width:number;height:number}};
export function MasterNativeDimensionsOverlay({evidence:e}:{evidence:MasterDimensionEvidence}){
 const d=e.masterDimensions,v=new Matrix4().fromArray(e.camera.matrixWorld).invert(),p=new Matrix4().fromArray(e.camera.projectionMatrix),{width,height}=e.canvas;
 const project=(a:number[])=>{const q=new Vector3(a[0],a[1],a[2]).applyMatrix4(v).applyMatrix4(p);return [(q.x+1)*width/2,(1-q.y)*height/2];};
 return <><svg aria-label="当前真实网格尺寸标注" className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`}>
 {d.metrics.map(m=>{const a=project(m.a),b=project(m.b),color=m.mm<0?'#af2828':'#245e70';return <g key={m.id}><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth="2"/><circle cx={a[0]} cy={a[1]} r="3" fill={color}/><circle cx={b[0]} cy={b[1]} r="3" fill={color}/><text x={(a[0]+b[0])/2+7} y={(a[1]+b[1])/2-7} fill={color} stroke="#fff" strokeWidth="3" paintOrder="stroke" fontSize="14" fontWeight="700">{m.id} {m.mm.toFixed(1)}</text></g>;})}</svg>
 <div className="pointer-events-none absolute left-3 top-14 max-w-[245px] rounded-lg border bg-white/95 p-3 text-xs leading-5 text-slate-800"><p className="font-semibold">实际网格净距 · mm</p>{d.metrics.map(m=><p key={m.id} className={m.mm<0?'text-red-700':''}>{m.id} {m.label}：{m.mm.toFixed(1)}</p>)}<hr className="my-1"/><p>床名义2000×1800；真实包络{d.bedEnvelopeMm.map(v=>v.toFixed(0)).join('×')}</p><p>两400柜＋床整组：{d.groupLengthMm.toFixed(0)}</p><p>可用墙段：{d.availableWallLengthMm.toFixed(0)}</p><p>入口：{d.entranceWidthMm}；南飘窗1600×550保留</p><p className="mt-1 text-[10px] text-amber-900">注记直接来自当前渲染网格，红色为相交；叠加在真实模型上，非测绘或通路验收。</p></div></>;
}
