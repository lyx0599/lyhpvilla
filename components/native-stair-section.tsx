"use client";
import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {useSearchParams} from 'next/navigation';
import * as THREE from 'three';
/** A real material clipping plane through the actual lower run; never replaces meshes. */
export function NativeStairSection({cutPlanYMm}:{cutPlanYMm:number|undefined}){
 const q=useSearchParams(),{scene,gl}=useThree();
 const enabled=q.get('section')==='stair'&&cutPlanYMm!==undefined;
 const plane=useMemo(()=>new THREE.Plane(new THREE.Vector3(0,0,1),-((cutPlanYMm??4500)-4500)/1000),[cutPlanYMm]);
 const originals=useRef(new Map<THREE.Material,THREE.Plane[]|null>());
 useFrame(()=>{if(!enabled)return;gl.localClippingEnabled=true;scene.traverse(o=>{if(!(o instanceof THREE.Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(!originals.current.has(m)){originals.current.set(m,m.clippingPlanes);m.clippingPlanes=[...(m.clippingPlanes??[]),plane];m.needsUpdate=true;}});});
 useEffect(()=>{const saved=originals.current,previous=gl.localClippingEnabled;return()=>{for(const [m,p] of Array.from(saved.entries())){m.clippingPlanes=p;m.needsUpdate=true;}saved.clear();gl.localClippingEnabled=previous;};},[enabled,plane,gl]);
 return null;
}
