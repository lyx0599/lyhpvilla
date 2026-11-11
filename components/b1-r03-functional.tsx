"use client";
import {useSearchParams} from 'next/navigation';
import C from '@/data/b1-r03-functional.json';
import {evaluateFix1} from '@/lib/b1-r03-fix1-state';
import {useB1CabinetOperation} from '@/lib/b1-cabinet-operation';
import {getB1BedProfile} from '@/lib/b1-bed-profile';

type P=[number,number];
export function b1R03State(query:URLSearchParams){
 const name=query.get('r03Op')??(query.get('b1State')==='bed'?'bedExpanded':'daily'),t=Math.max(0,Math.min(1,Number(query.get('r03T')??0))),angles:{[k:string]:number}={bath:0,cleaning:0,washer:0,dryer:0};let actor:P|null=null;
 const q=(C.sequences as Record<string,unknown>)[name] as {door?:string;bathAngle?:number;cleaningAngle?:number;washerAngle?:number;dryerAngle?:number;keyframes?:Array<[number,number[]]>;points?:number[][]}|undefined;
 if(q){angles.bath=q.bathAngle??0;angles.cleaning=q.cleaningAngle??0;angles.washer=q.washerAngle??0;angles.dryer=q.dryerAngle??0;
  if(q.keyframes){const k=Math.min(q.keyframes.length-2,Math.floor(t*(q.keyframes.length-1))),u=t===1?1:t*(q.keyframes.length-1)-k,a=q.keyframes[k],b=q.keyframes[k+1];angles[q.door!]=a[0]+(b[0]-a[0])*u;actor=[a[1][0]+(b[1][0]-a[1][0])*u,a[1][1]+(b[1][1]-a[1][1])*u];}
  else if(q.points){const k=Math.min(q.points.length-2,Math.floor(t*(q.points.length-1))),u=t===1?1:t*(q.points.length-1)-k,a=q.points[k],b=q.points[k+1];actor=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];}
 }
 if(name==='bedConvert')actor=[7150,2060+650*t];
 if(name==='bedExpanded')actor=[7150,2710];
 if(name==='storageSouth')actor=[8467.5,2380];
 if(name==='storageNorth')actor=[8467.5,1120];
 const fix=evaluateFix1(C,name,t);if(fix&&name.includes('Pullout'))angles.cleaning=90;
 return{name,t,angles,actor:fix?.actor??actor,actors:fix?.actors??null,fix,extract:fix?.deviceTranslation[0]??0,deviceY:fix?.deviceTranslation[1]??0,bed:name==='bedConvert'?t:name==='bedExpanded'?1:0,wardrobe:query.get('r03Wardrobe')??(name==='storageSouth'?'south':name==='storageNorth'?'north':'closed')};
}
const world=(x:number,y:number,z:number):[number,number,number]=>[(x-6000)/1000,z/1000,(y-4500)/1000];
function Box({name,x,y,z,w,d,h,color='#aaa59a',nonPhysical=false}:{name:string;x:number;y:number;z:number;w:number;d:number;h:number;color?:string;nonPhysical?:boolean}){return <mesh name={name} position={world(x,y,z)} userData={{auditNonPhysical:nonPhysical}} castShadow receiveShadow><boxGeometry args={[w/1000,h/1000,d/1000]}/><meshStandardMaterial color={color} roughness={.8} transparent={nonPhysical} opacity={nonPhysical?.12:1} wireframe={nonPhysical}/></mesh>;}
function Panel({name,a,b,bottom=35,height=2100,thick=40,color='#aaa59a'}:{name:string;a:P;b:P;bottom?:number;height?:number;thick?:number;color?:string}){const dx=b[0]-a[0],dy=b[1]-a[1];return <mesh name={name} position={world((a[0]+b[0])/2,(a[1]+b[1])/2,bottom+height/2)} rotation={[0,-Math.atan2(dy,dx),0]} castShadow receiveShadow><boxGeometry args={[Math.hypot(dx,dy)/1000,height/1000,thick/1000]}/><meshStandardMaterial color={color} roughness={.8}/></mesh>;}
export function B1R03BathDoor(){const p=useSearchParams(),s=b1R03State(new URLSearchParams(p.toString())),a=s.angles.bath*Math.PI/180,h=C.door.hingeMm as P,l=C.door.panelLengthMm,j:[number,number]=[h[0]-l*Math.cos(a),h[1]-l*Math.sin(a)],f:[number,number]=[h[0]-2*l*Math.cos(a),h[1]],offset=20*Math.sin(a),oy=-20*Math.cos(a);return <group name="R03-bath-bifold-exact-contract" userData={{auditEntityId:'D-B1-001',auditKind:'door',operation:s.name,operationFraction:s.t}}>
  <Panel name="R03-bifold-pivot-leaf" a={[h[0]+offset,h[1]+oy]} b={[j[0]+offset,j[1]+oy]} height={C.door.leafHeightMm}/><Panel name="R03-bifold-guided-leaf" a={[j[0]-offset,j[1]+oy]} b={[f[0]-offset,f[1]+oy]} height={C.door.leafHeightMm}/>
  {[C.door.leftJambRectMm,C.door.rightJambRectMm,C.door.pivotStopRectMm].map((r,i)=><Box key={i} name={['left-door-jamb','right-door-jamb','south-side-pivot-stop'][i]} x={(r[0]+r[2])/2} y={(r[1]+r[3])/2} z={35+C.door.heightMm/2} w={r[2]-r[0]} d={r[3]-r[1]} h={C.door.heightMm}/>)}
  <Box name="door-guide-track-within-source-head" x={5004} y={1935} z={2080} w={880} d={40} h={40} color="#81735d"/>
  <Box name="guided-leaf-flush-pull" x={f[0]+70*Math.cos(a)} y={f[1]-70*Math.sin(a)} z={1035} w={16} d={16} h={100} color="#8b7b63"/>
  <Box name="crease-auxiliary-pull" x={h[0]-C.door.knobRadiusMm*Math.cos(a)} y={h[1]-C.door.knobRadiusMm*Math.sin(a)} z={1035} w={16} d={16} h={100} color="#8b7b63"/>
 </group>;}
function ApplianceDoor({kind,front,y,base,angle}:{kind:'washer'|'dryer';front:number;y:number;base:number;angle:number}){const a=angle*Math.PI/180,sign=kind==='washer'?-1:1,h:[number,number]=[front,y+(kind==='washer'?240:-240)],e:[number,number]=[front+480*Math.sin(a),h[1]+sign*480*Math.cos(a)];return <Panel name={`R03-${kind}-conservative-door`} a={h} b={e} bottom={base+260} height={480} thick={52} color="#545b58"/>;}
export function B1R03Entity({id}:{id:string}){const p=useSearchParams(),operation=useB1CabinetOperation(),legacy=p.get('audit')==='1'&&p.has('r03Op')&&!operation.userTouched,s=b1R03State(legacy?new URLSearchParams(p.toString()):new URLSearchParams());if(!legacy){s.bed=operation.bedAmount;s.name=operation.bedAmount?'bedExpanded':'daily';s.t=operation.bedAmount;}let parts;
 if(id==='furn-b1-guest-bed-001'){const b=C.bed,t=s.bed,profile=getB1BedProfile(b,t),depth=profile.depthMm;return <group name="R03-sofa-bed-design-motion-not-OEM" userData={{auditEntityId:id,auditKind:'furniture',motionIsDesignProxy:true,operation:s.name,operationFraction:s.t,declaredFlatHeightMm:b.flatHeightMm,declaredFoldedHeightMm:b.foldedHeightMm}}><Box name="bed-complete-reserved-motion-envelope" x={b.centerX} y={b.northY+b.conservativeMotionDepthMm/2} z={470} w={2000} d={1700} h={870} nonPhysical/><Box name="bed-fixed-storage-base" x={b.centerX} y={b.northY+400} z={200} w={2000} d={800} h={330}/><Box name="bed-seat-moving-platform" x={b.centerX} y={b.northY+depth/2} z={profile.seatCenterMm} w={2000} d={depth} h={profile.seatHeightMm} color="#a9a89c"/><Box name="back-folding-proxy-not-factory-kinematics" x={b.centerX} y={b.northY+80+250*t} z={profile.backCenterMm} w={2000} d={160+500*t} h={profile.backHeightMm} color="#bbb9ad"/>{t>0&&<Box name="automatic-leg-design-proxy" x={b.centerX} y={b.northY+depth-100} z={175} w={1750} d={40} h={280} color="#4f5550"/>}</group>;}
 if(id===C.items.washerNiche.id){const n=C.items.washerNiche,rear=n.machineRearX,cy=n.centerY,shift=s.extract,fy=35;
  parts=<><Box name="R03-complete-installation-reservation" x={4407} y={2705} z={985} w={700} d={650} h={1900} nonPhysical/>
   <Box name="washer-full-body" x={rear+588/2} y={cy} z={fy+845/2} w={588} d={598} h={845} color="#dbddd8"/>
   <Box name="stacking-kit-35" x={rear+580/2} y={cy} z={fy+845+17.5} w={580} d={593} h={35} color="#8b8f88"/>
   <Box name="dryer-full-body" x={rear+613/2+shift} y={cy+s.deviceY} z={fy+845+35+842/2} w={613} d={598} h={842} color="#dbddd8"/>
   <ApplianceDoor kind="washer" front={rear+632-26} y={cy} base={fy} angle={s.angles.washer}/><group position={[shift/1000,0,s.deviceY/1000]}><ApplianceDoor kind="dryer" front={rear+648-26} y={cy} base={fy+845+35} angle={s.angles.dryer}/></group>
   <Box name="front-access-service-panel" x={4745} y={2430} z={1150} w={20} d={80} h={150} color="#8b7b63"/>
   {s.fix?.cartCenter&&<group name="FIX1-temporary-table-not-selected-product" userData={{auditEntityId:'FIX1-LIFT-TABLE',auditKind:'temporary-tool',supportTransferVerified:false}}><Box name="temporary-rated-professional-lift-table" x={s.fix.cartCenter[0]} y={s.fix.cartCenter[1]} z={895} w={700} d={700} h={40} color="#59695f"/><Box name="temporary-lift-base-not-operating-platform" x={s.fix.cartCenter[0]} y={s.fix.cartCenter[1]} z={445} w={500} d={450} h={850} color="#69786c"/></group>}
  </>;
 }else if(id===C.items.wc.id){parts=<><Box name="WC-complete-installation-reservation" x={4432} y={780} z={460} w={750} d={450} h={850} nonPhysical/>
  <Box name="WC-floor-pan-complete" x={4460} y={780} z={235} w={594} d={370} h={400} color="#f0f1ec"/>
  <Box name="WC-cistern-395-full-width" x={4197} y={780} z={635} w={180} d={395} h={350} color="#f0f1ec"/>
  <Box name="WC-seat" x={4510} y={780} z={455} w={430} d={376} h={40} color="#e5e7df"/></>;
 }else if(id===C.items.basin.id){parts=<><Box name="basin-installed-service-envelope" x={5750} y={1365} z={560} w={280} d={450} h={1050} nonPhysical/>
  <Box name="basin-400x220-ceramic" x={5780} y={1365} z={825} w={220} d={400} h={120} color="#eff0e9"/>
  <Box name="extended-trap-not-floor-cabinet" x={5820} y={1365} z={635} w={80} d={70} h={260} color="#9eaaa5"/>
  <Box name="faucet-full-projection" x={5800} y={1530} z={965} w={140} d={45} h={180} color="#9b917a"/></>;
 }else if(id===C.items.cleaning.id){const a=s.angles.cleaning*Math.PI/180,h=C.items.cleaning.doorHingeMm as P;parts=<><Box name="cleaner-complete-installed-reservation" x={4269.5} y={1460} z={1085} w={425} d={380} h={2100} nonPhysical/>
  <Box name="cleaning-back" x={4084} y={1460} z={1085} w={18} d={380} h={2100}/>
  <Box name="cleaning-north-side" x={4250} y={1279} z={1085} w={350} d={18} h={2100}/><Box name="cleaning-south-side" x={4250} y={1641} z={1085} w={350} d={18} h={2100}/>
  {[44,2140-18].map(z=><Box key={z} name="cleaning-base-or-top" x={4250} y={1460} z={z} w={350} d={344} h={18}/>)}
  {[944,1294].map(z=><Box key={z} name="original-fixed-shelf" x={4275} y={1385} z={z} w={300} d={194} h={18}/>)}
  {[215,1745].map((z,i)=><Box key={z} name={i?'original-tool-pullout':'original-laundry-pullout'} x={4285+(s.fix?.drawerShifts[i]??0)} y={1385} z={z} w={280} d={194} h={i?420:360} color="#8f948b"/>)}
  <Panel name="cleaning-single-full-door" a={h} b={[h[0]+380*Math.sin(a),h[1]+380*Math.cos(a)]} bottom={35} height={2100} thick={24}/></>;
 }else return null;
 return <group name={`R03-${id}`} userData={{auditEntityId:id,auditKind:'furniture',operation:s.name,operationFraction:s.t}}>{parts}</group>;
}
export function B1R03Actor(){
 const p=useSearchParams(),s=b1R03State(new URLSearchParams(p.toString()));
 const actors=s.actors??(s.actor?[{id:'R03-BODY-600',position:s.actor,shoulderHeightMm:/washer/.test(s.name)?900:1400,posture:'retained-R03-design-proxy'}]:[]);
 return <>{actors.map((a,i)=>{const h=s.actors?(a.shoulderHeightMm<1000?600:1500):(/washer/.test(s.name)?900:1500);return <group key={a.id} name={'FIX1-'+a.id} userData={{auditEntityId:a.id,auditKind:'body-proxy',auditNonPhysical:true,posture:a.posture,shoulderHeightMm:a.shoulderHeightMm,operation:s.name,operationFraction:s.t}}>
  <mesh name={'FIX1-'+a.id+'-body-diameter600'} position={world(a.position[0],a.position[1],35+h/2)}><cylinderGeometry args={[.3,.3,h/1000,48]}/><meshStandardMaterial color={i?'#95683c':'#3e827a'} transparent opacity={.42}/></mesh>
  <mesh name={'FIX1-'+a.id+'-head'} position={world(a.position[0],a.position[1],35+h+190)}><sphereGeometry args={[.11,24,16]}/><meshStandardMaterial color={i?'#95683c':'#3e827a'}/></mesh>
  {s.actors&&<Box name={'FIX1-'+a.id+'-reach-origin-height-'+a.shoulderHeightMm} x={a.position[0]} y={a.position[1]} z={a.shoulderHeightMm} w={70} d={70} h={30} color="#edbd56"/>}
 </group>;})}</>;
}

export function B1R03Fix1Controls(){const p=useSearchParams(),s=b1R03State(new URLSearchParams(p.toString()));return <div className="rounded border border-[#b9c9bd] bg-[#f3f5ed] px-3 py-1 text-xs"><div className="flex items-center gap-3"><strong>R03 FIX1 · 600人体不缩</strong><select aria-label="Fix1独立操作状态" value={s.name} onChange={e=>{const q=new URLSearchParams(p.toString());q.set('r03Op',e.target.value);q.set('r03T','1');q.set('r03Cut','1');q.set('camera',e.target.value.startsWith('svc')?'review-b1-r03-fix1-service':'review-b1-r03-wet-top');window.location.search=q.toString();}}><option value="daily">原R03日常</option>{C.fix1.serviceStages.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}{Object.keys(C.fix1.pulloutStates).map(x=><option key={x} value={x}>{x}</option>)}</select><span>{s.name} / t={s.t}</span></div><p>{s.fix?.label??'原R03状态保留'} · 上机承托转接未证，完整检修未关闭；非现场或厂家操作批准。</p></div>;}
