"use client";
import {useEffect} from 'react';
import {useThree} from '@react-three/fiber';
import {useSearchParams} from 'next/navigation';
import * as THREE from 'three';
import {buildMasterNativeDimensions} from '@/lib/master-native-dimensions';
import {r11CycleState,r11CycleSource} from '@/lib/r11-cycle-binding';
import defaultSourceModel from '@/data/default-workspace.json';
import daily1FContract from '@/data/research-1f-contract.json';
import r15Geometry from '@/data/r14-geometry.json';
import {isR16Cloak,r16State,r16Contract} from '@/lib/r16-cloak-binding';

// Read-only evidence hook in the isolated review viewer. No replacement meshes,
// visibility overrides, or material changes are made to the rendered scene.
export function DesignEvidenceAudit(){
 const {scene,camera,gl}=useThree();
 const query=useSearchParams(),enabled=query.get('diagnostics')==='1'||query.get('audit')==='1';
 const loadedSourceModel=defaultSourceModel;
 useEffect(()=>{
  if(!enabled)return;
  const capture=()=>{
   scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
   const meshes:unknown[]=[];
   scene.traverse(object=>{
    if(!(object instanceof THREE.Mesh)||!object.geometry)return;
    const lineage=[];let current:THREE.Object3D|null=object,entityId:string|null=null,kind:string|null=null,visible=true,nonPhysical=false;
    while(current){visible=visible&&current.visible;nonPhysical=nonPhysical||Boolean(current.userData.auditNonPhysical);lineage.push(current.name||current.type);entityId??=current.userData.auditEntityId??null;kind??=current.userData.auditKind??null;current=current.parent;}
    const materials=Array.isArray(object.material)?object.material:[object.material];
    const materialInfo=materials.map(m=>({type:m.type,name:m.name,opacity:m.opacity,transparent:m.transparent,visible:m.visible,depthWrite:m.depthWrite,side:m.side,clippingPlanes:m.clippingPlanes?.map((p:THREE.Plane)=>({normal:p.normal.toArray(),constant:p.constant}))??[]}));
    const physical=visible&&!nonPhysical&&materials.some(m=>m.visible&&m.opacity>.001&&!(m instanceof THREE.ShadowMaterial));
    object.geometry.computeBoundingBox();const box=object.geometry.boundingBox;
    if(!box)return;
    const corners=[box.min.x,box.max.x].flatMap(x=>[box.min.y,box.max.y].flatMap(y=>[box.min.z,box.max.z].map(z=>new THREE.Vector3(x,y,z).applyMatrix4(object.matrixWorld).toArray())));
    const world=new THREE.Box3().setFromObject(object,true);
    const floorTriangles:number[][][]=[];
    const lightwellMaterialShape=kind==='floor-finish'&&object.geometry.type==='ShapeGeometry'&&['OS-OD-B2-LIGHTWELL-N','OS-OD-B2-LIGHTWELL-SE'].includes(entityId??'')&&object.userData.auditPart==='b2-coplanar-material-seams';
    if((kind==='room-floor'||lightwellMaterialShape)&&object.geometry.type==='ShapeGeometry'){
     const a=object.geometry.attributes.position,indices=object.geometry.index;
     const count=indices?indices.count:a.count;
     for(let i=0;i<count;i+=3)floorTriangles.push([0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(a,indices?indices.getX(i+j):i+j).applyMatrix4(object.matrixWorld).toArray()));
    }
    const nativeGeometry=lightwellMaterialShape||kind==='r14-part'||kind==='d005-leaf'||kind==='d006-leaf'||String(object.userData.auditPart??'').startsWith('b1-joined-')?{position:Array.from(object.geometry.attributes.position.array),index:object.geometry.index?Array.from(object.geometry.index.array):null}:null;
    meshes.push({name:object.name,uuid:object.uuid,entityId,kind,part:object.userData.auditPart??null,r14Owner:object.userData.r14Owner??null,operation:object.userData.operation??null,operationFraction:object.userData.operationFraction??null,lineage,visible,physical,materialInfo,geometryType:object.geometry.type,vertexCount:object.geometry.attributes.position?.count??0,matrixWorld:object.matrixWorld.toArray(),worldBoundingBox:{min:world.min.toArray(),max:world.max.toArray()},localBoundingBox:{min:box.min.toArray(),max:box.max.toArray()},worldCorners:corners,floorTriangles,nativeGeometry});
   });
   const c=camera as THREE.PerspectiveCamera;
   const diagnosticObjects:unknown[]=[];scene.traverse(object=>{if(object instanceof THREE.Sprite||object instanceof THREE.LineSegments){const lineage=[];let p:THREE.Object3D|null=object;while(p){lineage.push(p.name||p.type);p=p.parent;}if(lineage.some(n=>n.startsWith('R7-')))diagnosticObjects.push({name:object.name,type:object.type,lineage});}});
   // Additional read-only live diagnostics; no proxy or rendered material is changed.
   const r16GlassMaterials:unknown[]=[],r16Groups:unknown[]=[],r16Lights:unknown[]=[];
   scene.traverse(object=>{
    if(object instanceof THREE.Mesh&&object.name.includes('-r16-glass-')){const m=object.material as THREE.MeshPhysicalMaterial;r16GlassMaterials.push({name:object.name,type:m.type,color:m.color.getHexString(),roughness:m.roughness,metalness:m.metalness,transmission:m.transmission,ior:m.ior,thickness:m.thickness,clearcoat:m.clearcoat,opacity:m.opacity});}
    if(object.name.includes('-r16-leaf-')||object.name.endsWith('-drawers')){const box=new THREE.Box3().setFromObject(object);r16Groups.push({name:object.name,rotation:object.rotation.toArray(),position:object.position.toArray(),matrixWorld:object.matrixWorld.toArray(),min:box.min.toArray(),max:box.max.toArray()});}
    if(object instanceof THREE.PointLight&&object.name.includes('-r16-interior-light-'))r16Lights.push({name:object.name,intensity:object.intensity});
   });
   const masterDimensions=buildMasterNativeDimensions(meshes as Parameters<typeof buildMasterNativeDimensions>[0],loadedSourceModel.houseStructuresByFloor['2F']);
   const newClosets=loadedSourceModel.furniture.some(item=>isR16Cloak(item as Parameters<typeof isR16Cloak>[0]));
   const activeClosetCycle=newClosets?null:r11CycleState(query.get('closetCycle'),Number(query.get('cycleFrame')??0));
   return {r16GlassMaterials,r16Groups,r16Lights,loadedSourceModel,loadedCabinetGeometry:r15Geometry,loadedCloakContract:newClosets?r16Contract:null,activeR16State:newClosets?r16State(query):null,loaded1FDailyContract:daily1FContract,active1FState:{seat:query.get('seat'),phase:query.get('phase')??'closed',t:Number(query.get('t')??1),r14:query.get('r14')??'closed',r14Op:query.get('r14Op'),r14t:Number(query.get('r14t')??1),d005:Number(query.get('d005')??0)},masterDimensions,activeClosetCycle,cycleSourceSha256:newClosets?null:r11CycleSource.cycleSha256,camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),matrixWorld:camera.matrixWorld.toArray(),projectionMatrix:camera.projectionMatrix.toArray(),fov:c.fov,verticalFovDeg:c.getEffectiveFOV(),horizontalFovDeg:2*Math.atan(Math.tan(c.getEffectiveFOV()*Math.PI/360)*c.aspect)*180/Math.PI,zoom:c.zoom,aspect:c.aspect,near:c.near,far:c.far},canvas:{width:gl.domElement.clientWidth,height:gl.domElement.clientHeight},meshes,diagnosticObjects};
  };
  const host=window as unknown as Record<string,unknown>;host.__ModelEvidenceCapture=capture;
  return()=>{delete host.__ModelEvidenceCapture;};
 },[scene,camera,gl,enabled,loadedSourceModel,query]);
 return null;
}
