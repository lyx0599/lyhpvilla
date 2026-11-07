import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { b1MiterFootprint, b1RailJoint } from '@/lib/b1-boundary-profile';
import { PbrMaterial } from '@/components/scene-3d/pbr-material';
import type { HouseStructure, MmPoint } from '@/types/space';

function JoinedPrism({ id, part, start, end, widthMm, bottomMm, heightMm, structure, color, selected }:
  { id: string; part: string; start: MmPoint; end: MmPoint; widthMm: number; bottomMm: number; heightMm: number; structure: HouseStructure; color: string; selected: boolean }) {
  const geometry = useMemo(() => {
    const points = b1MiterFootprint(start, end, widthMm, b1RailJoint(structure, id, start, end));
    const size = structure.coordinateSystem, positions: number[] = [];
    for (const z of [bottomMm, bottomMm + heightMm]) for (const p of points)
      positions.push((p.x - size.width / 2) / 1000, z / 1000, (p.y - size.height / 2) / 1000);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);
    // Flat faces and UVs keep this the actual PBR rail, not an audit-only proxy.
    const flat = g.toNonIndexed(); g.dispose(); flat.computeVertexNormals();
    const a = flat.getAttribute('position'), uv: number[] = [];
    for (let i = 0; i < a.count; i++) uv.push(a.getX(i) + a.getZ(i), a.getY(i));
    flat.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return flat;
  }, [id, start, end, widthMm, bottomMm, heightMm, structure]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh name={`${id}-b1-continuous-${part}`} geometry={geometry} receiveShadow castShadow={part !== 'glass'}
    userData={{ auditPart: `b1-joined-${part}`, sectionWidthMm: widthMm, sectionHeightMm: heightMm }} renderOrder={part === 'glass' ? 4 : 5}>
    {part === 'glass' ? <meshStandardMaterial color={color} transparent opacity={selected ? .38 : .28} roughness={.04} metalness={.03} depthWrite={false} side={THREE.DoubleSide}/>
      : part === 'handrail' ? <PbrMaterial token="warmOak" fallbackRole="joineryMain" color={color} accentColor="#4d2b18" surfaceSizeM={[Math.hypot(end.x-start.x,end.y-start.y)/1000,.07]} roughness={.7}/>
        : <PbrMaterial fallbackRole="wallBase" color={color} opacity={selected ? .94 : .76} roughness={.7} depthWrite surfaceSizeM={[Math.hypot(end.x-start.x,end.y-start.y)/1000,.04]}/>}
  </mesh>;
}

export function B1JoinedRailing({ id, start, end, structure, widthMm, heightMm, selected, onSelect, onHover, onClearHover }:
  { id: string; start: MmPoint; end: MmPoint; structure: HouseStructure; widthMm: number; heightMm: number; selected: boolean;
    onSelect: (id: string) => void; onHover: (id: string) => void; onClearHover: (id: string) => void }) {
  const joint = b1RailJoint(structure, id, start, end);
  // Retain source section/height expression. Nominal1100 -> actual1070 is an
  // existing unresolved height item, not silently changed by this thickness fix.
  const glassBottom = 80, glassHeight = Math.max(480, Math.max(720,heightMm) - 80 - 70 - 30), postHeight = glassBottom + glassHeight;
  const wood = selected ? '#3b82f6' : '#78411f', metal = selected ? '#3b82f6' : '#6f675e';
  return <group name={`${id}-b1-joint-${start.x}-${start.y}`} userData={{ auditPart: 'b1-continuous-railing-not-solid-wall' }}
    onClick={e=>{e.stopPropagation();onSelect(id);}} onPointerOver={e=>{e.stopPropagation();onHover(id);}} onPointerOut={e=>{e.stopPropagation();onClearHover(id);}}>
    <JoinedPrism {...{id,start,end,structure,selected}} part="glass" widthMm={18} bottomMm={80} heightMm={glassHeight} color={selected?'#93c5fd':'#c4e2e3'}/>
    <JoinedPrism {...{id,start,end,structure,selected}} part="handrail" widthMm={Math.max(75,widthMm*.84)} bottomMm={postHeight} heightMm={70} color={wood}/>
    <JoinedPrism {...{id,start,end,structure,selected}} part="base" widthMm={32} bottomMm={65} heightMm={40} color={metal}/>
    {joint.postStops.map((t,index)=>{
      const x=start.x+(end.x-start.x)*t, y=start.y+(end.y-start.y)*t;
      return <mesh key={index} name={`${id}-b1-single-post-${index}`} position={[(x-structure.coordinateSystem.width/2)/1000,postHeight/2000,(y-structure.coordinateSystem.height/2)/1000]}
        rotation={[0,-Math.atan2(end.y-start.y,end.x-start.x),0]} castShadow renderOrder={5} userData={{auditPart:'b1-single-joint-post',sourcePlanMm:{x,y}}}>
        <boxGeometry args={[.022,postHeight/1000,.022]}/><meshStandardMaterial color={metal} roughness={.28} metalness={.56} transparent opacity={selected?.95:.76}/>
      </mesh>;
    })}
  </group>;
}
