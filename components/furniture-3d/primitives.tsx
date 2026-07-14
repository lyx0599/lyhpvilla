"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { ResolvedRender3DMaterialLayer, Render3DMaterialRole } from "@/lib/render3d-assets";
import type { Render3DMeta } from "@/types/space";
import { FurnitureMaterial } from "./materials";
import type { Vec3 } from "./types";

type SurfaceProps = {
  material: ResolvedRender3DMaterialLayer;
  role?: Render3DMaterialRole;
  color?: string;
  repeat?: [number, number];
  roughness?: number;
  metalness?: number;
  opacity?: number;
  emissiveIntensity?: number;
};

export function RoundedPart({ size, position = [0, 0, 0], rotation, radius = 0.035, detailLevel = "standard", castShadow = true, receiveShadow = true, material, ...surface }: SurfaceProps & {
  size: Vec3;
  position?: Vec3;
  rotation?: Vec3;
  radius?: number;
  detailLevel?: NonNullable<Render3DMeta["detailLevel"]>;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const segments = detailLevel === "presentation" ? 5 : detailLevel === "standard" ? 3 : 2;
  const geometry = useMemo(() => {
    const safeRadius = Math.min(radius, Math.max(0.003, Math.min(...size) * 0.44));
    return new RoundedBoxGeometry(size[0], size[1], size[2], segments, safeRadius);
  }, [detailLevel, radius, size[0], size[1], size[2]]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh castShadow={castShadow} receiveShadow={receiveShadow} position={position} rotation={rotation}>
      <primitive object={geometry} attach="geometry" />
      <FurnitureMaterial layer={material} {...surface} />
    </mesh>
  );
}

export function CylinderPart({ radiusTop, radiusBottom = radiusTop, height, position, rotation, sides = 24, material, ...surface }: SurfaceProps & {
  radiusTop: number;
  radiusBottom?: number;
  height: number;
  position: Vec3;
  rotation?: Vec3;
  sides?: number;
}) {
  return (
    <mesh castShadow receiveShadow position={position} rotation={rotation}>
      <cylinderGeometry args={[radiusTop, radiusBottom, height, sides]} />
      <FurnitureMaterial layer={material} {...surface} />
    </mesh>
  );
}

export function SpherePart({ radius, position, rotation, scale = [1, 1, 1], segments = 28, material, ...surface }: SurfaceProps & {
  radius: number;
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  segments?: number;
}) {
  return (
    <mesh castShadow receiveShadow position={position} rotation={rotation} scale={scale}>
      <sphereGeometry args={[radius, segments, Math.max(12, Math.round(segments * 0.55))]} />
      <FurnitureMaterial layer={material} {...surface} />
    </mesh>
  );
}
