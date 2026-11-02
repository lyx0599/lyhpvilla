type MeshEvidence={name:string;entityId:string|null;physical:boolean;matrixWorld:number[];worldBoundingBox:{min:number[];max:number[]}};
type DiningCapture={meshes:MeshEvidence[];loaded1FDailyContract?:{states:{daily:{id:string;centerMm:number[]}[]}}};
export function oneFDiningEvidence(data:DiningCapture){
 const parts=data.meshes.filter(p=>p.physical),seat=parts.find(p=>p.entityId==='L1'&&p.name==='L1-seat');
 const top=parts.find(p=>p.entityId==='furn-1f-independent-long-table-r05:table'&&p.name==='exact-long-top');
 const legs=parts.filter(p=>p.entityId==='furn-1f-independent-long-table-r05:table'&&p.name==='long-table-leg');
 const pose=data.loaded1FDailyContract?.states.daily.find(p=>p.id==='L1');
 if(!seat||!top||legs.length!==2||!pose)throw new Error('Actual L1/table parts or loaded contract unavailable');
 const front=[-seat.matrixWorld[0],-seat.matrixWorld[2]],length=Math.hypot(...front);front[0]/=length;front[1]/=length;
 if(front[0]<.999999||Math.abs(front[1])>1e-6)throw new Error('This readout requires the actual east-facing L1');
 const sb=seat.worldBoundingBox,tb=top.worldBoundingBox,tableCenter=[(tb.min[0]+tb.max[0])*500+6000,(tb.min[2]+tb.max[2])*500+4500];
 const v=[tableCenter[0]-pose.centerMm[0],tableCenter[1]-pose.centerMm[1]];
 const nearestLeg=legs.reduce((a,b)=>a.worldBoundingBox.min[0]<b.worldBoundingBox.min[0]?a:b);
 return {source:'Actual captured native seat/top/two leg bounds and seat matrix; loaded daily pose, not manually drawn geometry',frontWorldXY:front,angleToTableCenterDeg:Math.acos(Math.max(-1,Math.min(1,(front[0]*v[0]+front[1]*v[1])/Math.hypot(...v))))*180/Math.PI,
 chairFrontToTableEdgeMm:(tb.min[0]-sb.max[0])*1000,
 chairFrontToLegMm:(nearestLeg.worldBoundingBox.min[0]-sb.max[0])*1000,
 tableEdgeToLegMm:(nearestLeg.worldBoundingBox.min[0]-tb.min[0])*1000,
 seatTopToTableUndersideMm:(tb.min[1]-sb.max[1])*1000,
 lateralCenterOffsetMm:pose.centerMm[1]-tableCenter[1],
 sharedTableWidthOverlapMm:Math.max(0,Math.min(sb.max[2],tb.max[2])-Math.max(sb.min[2],tb.min[2]))*1000,
 seatWidthMm:(sb.max[2]-sb.min[2])*1000,
 limits:'Nominal model geometry only. No thighs/knees, comfort or manufactured-table/chair certification.'};
}
