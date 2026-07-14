"use client";

import { resolveFurnitureVariant } from "@/lib/furniture-variants";
import { CylinderPart, RoundedPart } from "./primitives";
import type { FurnitureFamily3DProps } from "./types";

export function SoftDecor3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height, item } = props;
  const variant = resolveFurnitureVariant(item, asset.assetType).variant.id;
  const floorY = -height / 2;
  if (variant === "areaRug") {
    return (
      <group>
        <RoundedPart size={[width, 0.028, depth]} position={[0, floorY + 0.014, 0]} radius={0.07} detailLevel={asset.detailLevel} material={asset.materials.primary} role="fabric" repeat={[9, 7]} receiveShadow />
        <RoundedPart size={[width * 0.82, 0.012, depth * 0.72]} position={[0, floorY + 0.034, 0]} radius={0.06} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="fabric" opacity={0.54} repeat={[7, 5]} castShadow={false} />
      </group>
    );
  }
  if (variant === "floorLamp") {
    return (
      <group>
        <CylinderPart radiusTop={Math.min(0.19, width * 0.36)} radiusBottom={Math.min(0.2, width * 0.38)} height={0.045} position={[0, floorY + 0.023, 0]} material={asset.materials.accent} role="metal" sides={36} />
        <CylinderPart radiusTop={0.018} height={height * 0.68} position={[0, floorY + height * 0.36, 0]} material={asset.materials.accent} role="metal" sides={14} />
        <CylinderPart radiusTop={0.16} radiusBottom={Math.min(0.28, width * 0.46)} height={height * 0.22} position={[0, floorY + height * 0.8, 0]} material={asset.materials.primary} role="fabric" sides={36} opacity={0.92} />
        <mesh position={[0, floorY + height * 0.76, 0]}>
          <sphereGeometry args={[0.06, 18, 12]} />
          <meshStandardMaterial color="#ffe4ad" emissive="#ffd386" emissiveIntensity={0.9} roughness={0.16} />
        </mesh>
        <pointLight color="#ffd89a" distance={2.4} intensity={0.35} position={[0, floorY + height * 0.74, 0]} />
      </group>
    );
  }
  if (variant === "pendantLight") {
    return (
      <group>
        <CylinderPart radiusTop={0.012} height={height * 0.5} position={[0, floorY + height * 0.76, 0]} material={asset.materials.accent} role="metal" sides={10} />
        <CylinderPart radiusTop={Math.min(0.12, width * 0.25)} radiusBottom={Math.min(0.26, width * 0.48)} height={height * 0.22} position={[0, floorY + height * 0.46, 0]} material={asset.materials.primary} role="fabric" sides={40} opacity={0.88} />
        <mesh position={[0, floorY + height * 0.41, 0]}><sphereGeometry args={[0.055, 18, 12]} /><meshStandardMaterial color="#ffe5ae" emissive="#ffd386" emissiveIntensity={0.95} /></mesh>
      </group>
    );
  }
  return null;
}
