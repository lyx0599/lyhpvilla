/** R02 local geometric support intent. Derives anchor plane from the actual opening
 * edge, never adds a floor patch. Anchor/load capacity remains unspecified. */
type P={x:number;z:number};
export function R02GuardSideSupports({polygon,edges,elevation}:{polygon:P[];edges:{id:string;start:P;end:P}[];elevation:number}){
  const area=polygon.reduce((s,p,i)=>{const q=polygon[(i+1)%polygon.length];return s+p.x*q.z-q.x*p.z},0);
  const points:P[]=[];
  for(const e of edges)for(const t of [0,.5,1]){const p={x:e.start.x+(e.end.x-e.start.x)*t,z:e.start.z+(e.end.z-e.start.z)*t};if(!points.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<.00001))points.push(p);}
  return <group name="R02-edge-derived-side-mounts" userData={{auditEntityId:'OPENING-1F-2F',auditKind:'guard-side-support',supportStatus:'actual-geometry-connection-only-not-anchor-load-certification'}}>{points.map((p,i)=>{
    let best:{q:P;dx:number;dz:number;distance:number}|null=null;
    polygon.forEach((a,j)=>{const b=polygon[(j+1)%polygon.length],dx=b.x-a.x,dz=b.z-a.z,L=Math.hypot(dx,dz);if(L<1e-6)return;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(L*L))),q={x:a.x+t*dx,z:a.z+t*dz},distance=Math.hypot(p.x-q.x,p.z-q.z);if(!best||distance<best.distance)best={q,dx:dx/L,dz:dz/L,distance};});
    if(!best)return null;const e=best as {q:P;dx:number;dz:number;distance:number};
    // +Z points to the inside of a positive-area opening polygon.
    const sign=area>=0?1:-1,dx=e.dx*sign,dz=e.dz*sign,d=Math.max(0,(p.x-e.q.x)*(-dz)+(p.z-e.q.z)*dx);
    return <group key={i} name={`R02-guard-support-${i}`} position={[e.q.x,elevation,e.q.z]} rotation={[0,Math.atan2(-dz,dx),0]}>
      <mesh name={`R02-guard-${i}-edge-face-plate`} position={[0,-.070,.005]}><boxGeometry args={[.060,.140,.010]}/><meshStandardMaterial color="#625e58" metalness={.7}/></mesh>
      <mesh name={`R02-guard-${i}-underfloor-arm`} position={[0,-.010,(d+.023)/2]}><boxGeometry args={[.040,.010,Math.max(.008,d+.007)]}/><meshStandardMaterial color="#625e58" metalness={.7}/></mesh>
      <mesh name={`R02-guard-${i}-post-socket`} position={[0,-.005,d]}><boxGeometry args={[.040,.070,.040]}/><meshStandardMaterial color="#625e58" metalness={.7}/></mesh>
      {[-.018,.018].flatMap((x,j)=>[-.04,-.105].map((y,k)=><mesh key={`${j}-${k}`} name={`R02-guard-${i}-edge-anchor-${j}-${k}`} position={[x,y,-.030]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.006,.006,.080,12]}/><meshStandardMaterial color="#8b7656" metalness={.7}/></mesh>))}
    </group>;
  })}</group>;
}
