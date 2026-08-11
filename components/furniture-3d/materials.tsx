"use client";

import * as THREE from "three";
import type { ResolvedRender3DMaterialLayer, Render3DMaterialRole } from "@/lib/render3d-assets";
import { PbrMaterial } from "@/components/scene-3d/pbr-material";
import type { MaterialDeviceClass, MaterialQualityTier, MaterialRole } from "@/lib/material-system";

type Props = {
  layer: ResolvedRender3DMaterialLayer;
  role?: Render3DMaterialRole;
  color?: string;
  repeat?: [number, number];
  surfaceSizeM?: readonly [number, number];
  uvRotationDeg?: number;
  quality?: MaterialQualityTier;
  device?: MaterialDeviceClass;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  emissiveIntensity?: number;
  side?: THREE.Side;
};

function materialRoleForFurnitureRole(role: Render3DMaterialRole): MaterialRole {
  if (role === "wood") return "joineryMain";
  if (role === "fabric" || role === "leather") return "fabricMain";
  if (role === "stone" || role === "ceramic") return "countertop";
  if (role === "metal") return "trimMetal";
  if (role === "glass") return "glassMain";
  return "wallBase";
}

export function FurnitureMaterial({
  layer,
  role = layer.role,
  color,
  repeat = [1, 1],
  surfaceSizeM,
  uvRotationDeg,
  quality,
  device,
  roughness,
  metalness,
  opacity,
  emissiveIntensity,
  side
}: Props) {
  return (
    <PbrMaterial
      token={layer.pbrToken ?? layer.token}
      fallbackRole={materialRoleForFurnitureRole(role)}
      resourceId={layer.resourceId}
      color={color ?? layer.color}
      surfaceSizeM={surfaceSizeM}
      uvScale={surfaceSizeM ? [1, 1] : repeat}
      uvRotationDeg={uvRotationDeg ?? layer.uvRotationDeg}
      quality={quality}
      device={device}
      roughness={roughness ?? layer.roughness}
      metalness={metalness ?? layer.metalness}
      opacity={opacity ?? layer.opacity}
      normalStrength={layer.normalStrength}
      transmission={role === "glass" ? layer.transmission ?? 0.72 : undefined}
      thicknessMm={role === "glass" ? layer.thicknessMm ?? 18 : undefined}
      clearcoat={layer.clearcoat}
      clearcoatRoughness={layer.clearcoatRoughness}
      emissive={layer.emissive}
      emissiveIntensity={emissiveIntensity ?? layer.emissiveIntensity ?? 0}
      side={side}
    />
  );
}
