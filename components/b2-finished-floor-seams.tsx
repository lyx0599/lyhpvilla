import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
/** Surface material on the actual clipped room polygon, not floating seam boxes. */
export function B2FinishedFloorSeams({geometry,width,depth,elevation,joint,wood,tileWidthMm,tileLengthMm,directionDeg=0,surfaceId}:{surfaceId?:string;geometry:THREE.BufferGeometry;width:number;depth:number;elevation:number;joint:string;wood:boolean;tileWidthMm?:number;tileLengthMm?:number;directionDeg?:number}){
  const texture=useMemo(()=>{
    if(typeof document==='undefined')return null;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
    const ctx=canvas.getContext('2d');if(!ctx)return null;
    const sx=2048/Math.max(.1,width),sy=2048/Math.max(.1,depth);
    ctx.clearRect(0,0,2048,2048);ctx.translate(1024,1024);ctx.rotate(directionDeg*Math.PI/180);ctx.translate(-1024,-1024);
    ctx.strokeStyle=joint;ctx.lineWidth=Math.max(1,(wood ? .002 : .004)*Math.min(sx,sy));
    const tw=Math.max(wood ? .14 : .3,(tileWidthMm??(wood?200:720))/1000)*sx;
    const tl=Math.max(wood ? .8 : .3,(tileLengthMm??(wood?1800:900))/1000)*sy;
    ctx.beginPath();
    for(let x=-2048;x<=4096;x+=tw){ctx.moveTo(x,-2048);ctx.lineTo(x,4096);}
    for(let y=-2048;y<=4096;y+=tl){ctx.moveTo(-2048,y);ctx.lineTo(4096,y);}
    ctx.stroke();const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
  },[width,depth,joint,wood,tileWidthMm,tileLengthMm,directionDeg]);
  useEffect(()=>()=>texture?.dispose(),[texture]);
  return <mesh name={surfaceId ? surfaceId+"-coplanar-material-seams" : "B2-35mm-coplanar-finish-seams"} rotation={[-Math.PI/2,0,0]} position={[0,elevation,0]} userData={{auditKind:'floor-finish',auditPart:'b2-coplanar-material-seams',finishedSurfaceMm:elevation*1000,...(surfaceId?{auditEntityId:surfaceId}:{})}}>
    <primitive object={geometry} attach="geometry"/>
    <meshStandardMaterial map={texture??undefined} transparent opacity={texture ? .38 : 0} depthWrite={false} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} roughness={.8}/>
  </mesh>;
}
