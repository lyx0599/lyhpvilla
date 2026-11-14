'use client';
import * as THREE from 'three';
import M from '@/data/default-workspace.json';
// Zero-thickness, nonphysical concept finish plane at retained model reference2.8m.
// It does not assert measured headroom, a new slab, beam or suspended-ceiling build-up.
export function B1D01Ceiling(){return <group name="D01-concept-ceiling-not-measured" userData={{auditEntityId:'D01-B1-CEILING-CONCEPT',auditNonPhysical:true}}>{M.houseStructuresByFloor.B1.rooms.filter(r=>['ROOM-B1-001','ROOM-B1-002','ROOM-B1-004','ROOM-B1-006','ROOM-B1-007'].includes(r.id)).map(r=>{const shape=new THREE.Shape();r.boundary.forEach((v,i)=>{const x=(v.x-6000)/1000,y=(v.y-4500)/1000;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);});shape.closePath();return <mesh key={r.id} name={'D01-ceiling-'+r.id} position={[0,2.8,0]} rotation={[Math.PI/2,0,0]}><shapeGeometry args={[shape]}/><meshStandardMaterial color="#dedbd4" roughness={.9} side={THREE.FrontSide}/></mesh>;})}</group>;}
