export type TrimPoint = { x: number; y: number };
export type FinishTrimFlushRange = {
  startOffsetMm: number;
  endOffsetMm: number;
  side: "left" | "right";
  sourceObjectId: string;
  note: string;
};

/** Split finish only. Host wall endpoints, thickness and opening cuts never change. */
export function buildWallFinishTrim(
  hostStart: TrimPoint, hostEnd: TrimPoint,
  start: TrimPoint, end: TrimPoint,
  coreWidthMm: number, projectionMm: number,
  ranges: FinishTrimFlushRange[] = []
) {
  const length = Math.hypot(hostEnd.x-hostStart.x,hostEnd.y-hostStart.y);
  if (length < 1e-6) throw new Error("Degenerate finish host");
  const ux=(hostEnd.x-hostStart.x)/length, uy=(hostEnd.y-hostStart.y)/length;
  const offset=(p:TrimPoint)=>(p.x-hostStart.x)*ux+(p.y-hostStart.y)*uy;
  const a=offset(start),b=offset(end),lo=Math.min(a,b),hi=Math.max(a,b);
  const bounds=[lo,hi,...ranges.flatMap(r=>[r.startOffsetMm,r.endOffsetMm])]
    .filter(v=>v>=lo&&v<=hi).sort((x,y)=>x-y)
    .filter((v,i,all)=>!i||v-all[i-1]>1e-6);
  return bounds.slice(0,-1).map((from,i)=>{
    const to=bounds[i+1],mid=(from+to)/2;
    const active=ranges.filter(r=>r.startOffsetMm<=mid&&r.endOffsetMm>=mid);
    const left=active.some(r=>r.side==="left")?0:projectionMm;
    const right=active.some(r=>r.side==="right")?0:projectionMm;
    const shift=(left-right)/2;
    const point=(t:number)=>({x:hostStart.x+ux*t-uy*shift,y:hostStart.y+uy*t+ux*shift});
    return {start:point(a<=b?from:to),end:point(a<=b?to:from),
      widthMm:coreWidthMm+left+right,leftProjectionMm:left,rightProjectionMm:right,
      sourceObjectIds:active.map(r=>r.sourceObjectId)};
  });
}
