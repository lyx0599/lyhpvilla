"use client";

import { resolveFurnitureVariant } from "@/lib/furniture-variants";
import { CylinderPart, RoundedPart } from "./primitives";
import type { FurnitureFamily3DProps, Vec3 } from "./types";

type ModuleLayout = {
  x: number;
  z: number;
  rotation: number;
  width: number;
  seatDepth: number;
  chaise: boolean;
};

function getModuleLayout(props: FurnitureFamily3DProps) {
  const { item, asset, width, depth } = props;
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const variant = resolved.variant.id;
  const compact = variant === "compactLoveseat";
  const deep = variant === "deepLounge";
  const curved = variant === "curvedSofa";
  const sectional = variant === "sectionalLShape";
  const modules = compact ? 2 : Math.max(3, Math.min(5, Math.round(width / (deep ? 0.82 : 0.72))));
  const gap = 0.035;
  const usableWidth = width * 0.88;
  const moduleWidth = (usableWidth - gap * (modules - 1)) / modules;
  return Array.from({ length: modules }, (_, index): ModuleLayout => {
    const centeredIndex = index - (modules - 1) / 2;
    const edge = index === (resolved.variation.openSide > 0 ? modules - 1 : 0);
    const curveAngle = curved ? centeredIndex * -0.14 : 0;
    return {
      x: centeredIndex * (moduleWidth + gap),
      z: curved ? Math.abs(centeredIndex) * 0.09 : 0,
      rotation: curveAngle,
      width: moduleWidth,
      seatDepth: sectional && edge ? depth * 1.3 : depth * (deep ? 0.82 : 0.7),
      chaise: sectional && edge
    };
  });
}
export function SofaFamily3D(props: FurnitureFamily3DProps) {
  const { item, asset, width, depth, height } = props;
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const variant = resolved.variant.id;
  const floorY = -height / 2;
  const slim = variant === "slimLegSofa";
  const deep = variant === "deepLounge";
  const curved = variant === "curvedSofa";
  const modular = variant === "lowModular" || variant === "sectionalLShape";
  const compact = variant === "compactLoveseat";
  const modules = getModuleLayout(props);
  const baseHeight = slim ? 0.12 : 0.14;
  const baseY = floorY + (slim ? 0.26 : 0.12) + baseHeight / 2;
  const seatHeight = deep ? 0.2 : 0.17;
  const seatY = baseY + baseHeight / 2 + seatHeight / 2 + 0.025;
  const backHeight = height * (deep ? 0.55 : slim ? 0.46 : 0.48);
  const armWidth = compact ? 0.11 : slim ? 0.09 : deep ? 0.2 : 0.14;
  const baseDepth = depth * (deep ? 0.75 : 0.62);

  return (
    <group>
      <RoundedPart
        size={[width * (curved ? 0.82 : 0.9), baseHeight, baseDepth]}
        position={[0, baseY, depth * 0.04]}
        radius={0.04}
        detailLevel={asset.detailLevel}
        material={asset.materials.accent}
        role={slim ? "wood" : "fabric"}
        color={slim ? undefined : "#746a60"}
        repeat={[5, 3]}
      />
      {modules.map((module, index) => (
        <group key={index} position={[module.x, 0, module.z]} rotation={[0, module.rotation, 0]}>
          <RoundedPart
            size={[module.width * 0.94, seatHeight, module.seatDepth]}
            position={[0, seatY, module.chaise ? depth * 0.24 : depth * 0.07]}
            radius={deep ? 0.095 : 0.075}
            detailLevel={asset.detailLevel}
            material={index % 2 === 1 && modular ? asset.materials.secondary : asset.materials.primary}
            role="fabric"
            repeat={[2, 3]}
          />
          <RoundedPart
            size={[module.width * 0.82, 0.014, Math.max(0.08, module.seatDepth * 0.82)]}
            position={[0, seatY + seatHeight * 0.42, module.chaise ? depth * 0.24 : depth * 0.07]}
            radius={0.006}
            detailLevel={asset.detailLevel}
            material={asset.materials.accent}
            role="fabric"
            color="#8b8177"
          />
          {!module.chaise && (
            <group>
              <RoundedPart
                size={[module.width * 0.92, backHeight, deep ? 0.18 : 0.145]}
                position={[0, seatY + backHeight * 0.48, -depth * (deep ? 0.34 : 0.31)]}
                rotation={[0.08, 0, 0]}
                radius={0.07}
                detailLevel={asset.detailLevel}
                material={asset.materials.primary}
                role="fabric"
                repeat={[2, 2]}
              />
              <RoundedPart size={[module.width * 0.78, 0.012, 0.012]} position={[0, seatY + backHeight * 0.5, -depth * (deep ? 0.425 : 0.38)]} radius={0.005} detailLevel={asset.detailLevel} material={asset.materials.accent} role="fabric" color="#81776e" />
            </group>
          )}
        </group>
      ))}
      {!modular && [-1, 1].map((side) => {
        const position: Vec3 = [side * (width * 0.46 - armWidth / 2), floorY + (deep ? 0.43 : 0.39), depth * 0.02];
        return (
          <RoundedPart
            key={side}
            size={[armWidth, height * (deep ? 0.56 : 0.48), depth * (deep ? 0.78 : 0.68)]}
            position={position}
            rotation={curved ? [0, side * 0.22, 0] : undefined}
            radius={curved ? 0.11 : slim ? 0.035 : 0.07}
            detailLevel={asset.detailLevel}
            material={asset.materials.primary}
            role="fabric"
            repeat={[1, 3]}
          />
        );
      })}
      {modular && [-1, 1].map((side) => (
        <RoundedPart
          key={side}
          size={[0.11, height * 0.32, depth * 0.55]}
          position={[side * width * 0.46, floorY + 0.34, depth * 0.07]}
          radius={0.055}
          detailLevel={asset.detailLevel}
          material={asset.materials.primary}
          role="fabric"
        />
      ))}
      {slim ? [-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <CylinderPart key={`${x}-${z}`} radiusTop={0.018} height={0.28} position={[x * width * 0.4, floorY + 0.14, z * depth * 0.27]} material={asset.materials.accent} role="metal" sides={10} />
      ))) : (
        <RoundedPart size={[width * 0.68, 0.08, depth * 0.42]} position={[0, floorY + 0.045, depth * 0.02]} radius={0.025} detailLevel={asset.detailLevel} material={asset.materials.accent} role="wood" color="#544d46" />
      )}
    </group>
  );
}
