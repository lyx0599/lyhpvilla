"use client";

import { useEffect, useMemo } from "react";
import type {} from "@react-three/fiber";
import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import data from "./B2_EXPLICIT_ASSETS.json";

type V3 = [number, number, number];
type Part = {
  id: string; part: string; h: number[]; poly?: number[][];
  corners3D?: number[][]; circle?: number[]; capsule?: (number[] | number)[];
  ellipsoid?: { c: number[]; axes: number[][]; r: number[] };
};
type Operation = { kind: string; pivot?: number[]; anglePlanRad?: number; delta?: number[]; partIndices: number[] };
type Owner = { id: string; parts: Part[]; operations: Record<string, Operation[]> };
const owners = data.owners as unknown as Record<string, Owner>;
export const b2SpaceRevision = data.revision;
export const hasB2SpaceFurniture = (id: string) => Object.prototype.hasOwnProperty.call(owners, id);

function geometryFor(p: Part): THREE.BufferGeometry {
  if (p.corners3D) {
    const points = Array.from(new Map(p.corners3D.map(v => [v.join(","), new THREE.Vector3(...v as V3)])).values());
    // A source PlaneGeometry has four coplanar corners. A 3D convex hull can drop
    // one corner; triangulate the exact zero-thickness polygon instead.
    if (points.length === 4) {
      const center = points.reduce((c, v) => c.add(v), new THREE.Vector3()).multiplyScalar(.25);
      const u = points[0].clone().sub(center).normalize();
      const normal = new THREE.Vector3().crossVectors(points[1].clone().sub(points[0]), points[2].clone().sub(points[0])).normalize();
      const v = new THREE.Vector3().crossVectors(normal, u);
      const sorted = points.sort((a, b) => Math.atan2(a.clone().sub(center).dot(v), a.clone().sub(center).dot(u)) - Math.atan2(b.clone().sub(center).dot(v), b.clone().sub(center).dot(u)));
      const geometry = new THREE.BufferGeometry().setFromPoints(sorted);
      geometry.setIndex([0, 1, 2, 0, 2, 3]); geometry.computeVertexNormals();
      return geometry;
    }
    return new ConvexGeometry(points);
  }
  if (p.circle) {
    const [x, z, r] = p.circle;
    return new THREE.CylinderGeometry(r, r, p.h[1] - p.h[0], 48).translate(x, (p.h[0] + p.h[1]) / 2, z);
  }
  if (p.capsule) {
    const a = new THREE.Vector3(...p.capsule[0] as V3), b = new THREE.Vector3(...p.capsule[1] as V3);
    const direction = b.clone().sub(a), middle = a.clone().add(b).multiplyScalar(.5);
    return new THREE.CapsuleGeometry(p.capsule[2] as number, direction.length(), 8, 16)
      .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
      .translate(middle.x, middle.y, middle.z);
  }
  if (p.ellipsoid) {
    const e = p.ellipsoid;
    const basis = new THREE.Matrix4().makeBasis(...e.axes.map((a, i) => new THREE.Vector3(...a as V3).multiplyScalar(e.r[i])) as [THREE.Vector3, THREE.Vector3, THREE.Vector3]);
    basis.setPosition(new THREE.Vector3(...e.c as V3));
    return new THREE.SphereGeometry(1, 40, 28).applyMatrix4(basis);
  }
  return new ConvexGeometry((p.poly ?? []).flatMap(([x, z]) => p.h.map(y => new THREE.Vector3(x, y, z))));
}
function appearance(p: Part) {
  const n = p.part.toLowerCase();
  const glass = p.id.startsWith("W-") || p.id.startsWith("R3-") || /glass|s07-west-door-|s07-wine-front-door-/.test(n);
  const metal = /handle|oem-|post30|faucet|guide|bike|bicycle|trainer/.test(n);
  const dark = /television|tv-screen/.test(n) || p.id.includes("large-tv");
  const sofa = p.id.includes("sofa");
  const stone = /stone|basin/.test(n);
  const color = glass ? "#b6d2d5" : dark ? "#273944" : metal ? "#727c7d" : stone ? "#d5d1c6" : sofa ? "#b2a59c" : /71043/.test(n) ? "#b4a181" : /bottle|cup/.test(n) ? "#658271" : /rack/.test(p.id) ? "#8c9d9f" : "#ad8b69";
  return { color, glass, metal };
}
export function B2SourcePart({ part }: { part: Part }) {
  const geometry = useMemo(() => geometryFor(part), [part]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const a = appearance(part);
  return <mesh name={part.part} geometry={geometry} castShadow={!a.glass} receiveShadow userData={{ owningObjectId: part.id, materialPart: part.part, sourceRevision: b2SpaceRevision }}>
    <meshStandardMaterial color={a.color} roughness={a.glass ? .14 : .66} metalness={a.metal ? .35 : .02} transparent={a.glass} opacity={a.glass ? .25 : 1} depthWrite={!a.glass} side={THREE.DoubleSide} />
  </mesh>;
}
function SourceOwner({ source, operation, openAmount = 0 }: { source: Owner; operation?: string; openAmount?: number }) {
  const t = Math.max(0, Math.min(1, openAmount));
  const opName = operation ?? (source.operations.castle ? "castle" : source.operations.wine ? "wine" : source.operations.drawer ? "drawer" : "");
  const ops = source.operations[opName] ?? [];
  const moving = new Set(ops.flatMap(o => o.partIndices));
  return <>
    {source.parts.map((part, i) => moving.has(i) ? null : <B2SourcePart key={`${part.part}-${i}`} part={part} />)}
    {ops.map((op, i) => {
      const children = op.partIndices.map(j => <B2SourcePart key={`${source.parts[j].part}-${j}`} part={source.parts[j]} />);
      if (op.kind === "rotate" && op.pivot) return <group key={i} position={[op.pivot[0], 0, op.pivot[1]]} rotation={[0, -(op.anglePlanRad ?? 0) * t, 0]}><group position={[-op.pivot[0], 0, -op.pivot[1]]}>{children}</group></group>;
      const d = op.delta ?? [0, 0, 0];
      return <group key={i} position={[d[0] * t, d[1] * t, d[2] * t]}>{children}</group>;
    })}
  </>;
}
export function B2SpaceFurniture({ ownerId, position, rotationDeg, operation, openAmount = 0, onSelect, onHover, onClearHover }: {
  ownerId: string; position: { x: number; z: number }; rotationDeg: number;
  operation?: "castle" | "wine" | "fridge" | "drawer"; openAmount?: number;
  onSelect?: (part: string) => void; onHover?: () => void; onClearHover?: () => void;
}) {
  const source = owners[ownerId];
  if (!source) return null;
  // Source localH already includes the35mm model finishedfloor. No extra elevation/fit-box scaling.
  return <group name={`${ownerId}-b2-r08-source`} position={[position.x, 0, position.z]} rotation={[0, -rotationDeg * Math.PI / 180, 0]}
    onClick={e => { e.stopPropagation(); onSelect?.(e.object.name); }}
    onPointerOver={e => { e.stopPropagation(); onHover?.(); }} onPointerOut={e => { e.stopPropagation(); onClearHover?.(); }}>
    <SourceOwner source={source} operation={operation} openAmount={openAmount} />
  </group>;
}
export function B2NorthStorageDoor({ pivotScene, openAmount = 0, onSelect }: { pivotScene: { x: number; z: number }; openAmount?: number; onSelect?: () => void }) {
  const source = data.northDoor;
  const moving = new Set(source.movingPartIndices), t = Math.max(0, Math.min(1, openAmount));
  return <group name="D-B2-NSTORE-R4-explicit" position={[pivotScene.x, 0, pivotScene.z]} onClick={e => { e.stopPropagation(); onSelect?.(); }}>
    {(source.parts as Part[]).map((p, i) => moving.has(i) ? null : <B2SourcePart key={i} part={p} />)}
    <group rotation={[0, -source.anglePlanRad * t, 0]}>{(source.parts as Part[]).map((p, i) => moving.has(i) ? <B2SourcePart key={i} part={p} /> : null)}</group>
  </group>;
}
