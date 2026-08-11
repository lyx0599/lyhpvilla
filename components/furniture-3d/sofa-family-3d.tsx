"use client";

import { resolveFurnitureVariant } from "@/lib/furniture-variants";
import { CylinderPart, RoundedPart, SpherePart } from "./primitives";
import type { FurnitureFamily3DProps, Vec3 } from "./types";

type ModuleLayout = {
  x: number;
  z: number;
  rotation: number;
  width: number;
  seatDepth: number;
  chaise: boolean;
};

function BeanBagSofa3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const floorY = -height / 2;
  return (
    <group name="bean-bag-lounge-sofa">
      <SpherePart radius={0.5} position={[0, floorY + height * 0.36, depth * 0.06]} scale={[width * 0.96, height * 0.62, depth * 0.9]} segments={36} material={asset.materials.primary} role="fabric" color="#c8b9aa" roughness={0.96} />
      <SpherePart radius={0.5} position={[0, floorY + height * 0.72, -depth * 0.22]} rotation={[0.2, 0, 0]} scale={[width * 0.82, height * 0.68, depth * 0.42]} segments={34} material={asset.materials.secondary} role="fabric" color="#b6a492" roughness={0.94} />
      <RoundedPart size={[width * 0.58, 0.045, depth * 0.48]} position={[0, floorY + height * 0.46, depth * 0.15]} radius={0.022} detailLevel={asset.detailLevel} material={asset.materials.accent} role="fabric" color="#9f8e7e" />
      <RoundedPart size={[width * 0.7, 0.018, depth * 0.025]} position={[0, floorY + height * 0.67, -depth * 0.41]} radius={0.006} detailLevel={asset.detailLevel} material={asset.materials.accent} role="fabric" color="#8f7d6d" />
    </group>
  );
}

function SculpturalBoucleSofa3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const floorY = -height / 2;
  const seatY = floorY + height * 0.34;
  const backY = floorY + height * 0.68;
  const upholstery = asset.materials.primary;
  const pillowRadius = Math.min(0.17, width * 0.06, height * 0.21);
  return (
    <group name="sculptural-boucle-curve-sofa">
      <RoundedPart size={[width * 0.82, 0.075, depth * 0.55]} position={[0, floorY + 0.038, depth * 0.04]} radius={0.032} detailLevel={asset.detailLevel} material={asset.materials.accent} role="fabric" />
      <SpherePart radius={0.5} position={[-width * 0.16, seatY, depth * 0.045]} scale={[width * 0.64, height * 0.46, depth * 0.7]} segments={asset.detailLevel === "presentation" ? 44 : 32} material={upholstery} role="fabric" roughness={0.98} />
      <SpherePart radius={0.5} position={[width * 0.3, seatY + height * 0.005, depth * 0.11]} rotation={[0, -0.12, 0]} scale={[width * 0.38, height * 0.48, depth * 0.82]} segments={asset.detailLevel === "presentation" ? 44 : 32} material={asset.materials.secondary} role="fabric" roughness={0.98} />
      <SpherePart radius={0.5} position={[-width * 0.03, backY, -depth * 0.31]} rotation={[0.04, 0, 0]} scale={[width * 0.83, height * 0.82, depth * 0.31]} segments={asset.detailLevel === "presentation" ? 48 : 34} material={upholstery} role="fabric" roughness={0.99} />
      {[-1, 1].map((side) => (
        <SpherePart
          key={`wrap-arm-${side}`}
          radius={0.5}
          position={[side * width * 0.43, floorY + height * 0.5, side > 0 ? depth * 0.02 : -depth * 0.01]}
          rotation={[0, side * 0.16, 0]}
          scale={[width * 0.23, height * 0.7, depth * (side > 0 ? 0.64 : 0.56)]}
          segments={asset.detailLevel === "presentation" ? 42 : 30}
          material={upholstery}
          role="fabric"
          roughness={0.99}
        />
      ))}
      <RoundedPart size={[0.014, height * 0.25, depth * 0.46]} position={[width * 0.12, seatY + height * 0.02, depth * 0.1]} radius={0.005} detailLevel={asset.detailLevel} material={asset.materials.accent} role="fabric" opacity={0.48} />
      {asset.detailLevel === "presentation" && [-0.15, 0.01].map((xRatio, index) => (
        <SpherePart
          key={`boucle-ball-pillow-${index}`}
          radius={pillowRadius}
          position={[xRatio * width, floorY + height * (0.72 + index * 0.015), -depth * (0.12 - index * 0.015)]}
          segments={36}
          material={index ? asset.materials.secondary : upholstery}
          role="fabric"
          roughness={1}
        />
      ))}
    </group>
  );
}

function ContinuousLowCurvedSofa3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const floorY = -height / 2;
  const seatY = floorY + height * 0.38;
  const upholsteryRole = asset.materials.primary.role === "leather" ? "leather" : "fabric";
  const segments = asset.detailLevel === "presentation" ? 52 : 36;
  return (
    <group name="continuous-low-curved-sofa">
      <SpherePart
        radius={0.5}
        position={[0, floorY + height * 0.2, depth * 0.04]}
        scale={[width * 0.91, height * 0.34, depth * 0.68]}
        segments={segments}
        material={asset.materials.accent}
        role={upholsteryRole}
        roughness={0.96}
      />
      <SpherePart
        radius={0.5}
        position={[0, seatY, depth * 0.08]}
        scale={[width * 0.87, height * 0.42, depth * 0.72]}
        segments={segments}
        material={asset.materials.primary}
        role={upholsteryRole}
        roughness={0.98}
      />
      <SpherePart
        radius={0.5}
        position={[0, floorY + height * 0.66, -depth * 0.31]}
        rotation={[0.05, 0, 0]}
        scale={[width * 0.78, height * 0.5, depth * 0.24]}
        segments={segments}
        material={asset.materials.primary}
        role={upholsteryRole}
        roughness={0.99}
      />
      {[-1, 1].map((side) => (
        <SpherePart
          key={`continuous-wrap-arm-${side}`}
          radius={0.5}
          position={[side * width * 0.43, floorY + height * 0.48, depth * 0.01]}
          rotation={[0, side * 0.24, 0]}
          scale={[width * 0.19, height * 0.52, depth * 0.62]}
          segments={segments}
          material={asset.materials.primary}
          role={upholsteryRole}
          roughness={0.99}
        />
      ))}
      <RoundedPart
        size={[width * 0.58, 0.055, depth * 0.42]}
        position={[0, floorY + 0.03, depth * 0.02]}
        radius={0.025}
        detailLevel={asset.detailLevel}
        material={asset.materials.accent}
        role="wood"
      />
    </group>
  );
}

function getModuleLayout(props: FurnitureFamily3DProps) {
  const { item, asset, width, depth } = props;
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const variant = resolved.variant.id;
  const compact = variant === "compactLoveseat";
  const deep = variant === "deepLounge";
  const curved = variant === "curvedSofa" || variant === "lowCurvedSofa";
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
  if (variant === "beanBag") return <BeanBagSofa3D {...props} />;
  if (variant === "boucleCurve") return <SculpturalBoucleSofa3D {...props} />;
  if (variant === "lowCurvedSofa") return <ContinuousLowCurvedSofa3D {...props} />;
  const floorY = -height / 2;
  const slim = variant === "slimLegSofa";
  const deep = variant === "deepLounge";
  const curved = variant === "curvedSofa" || variant === "lowCurvedSofa";
  const lowCurved = variant === "lowCurvedSofa";
  const modular = variant === "lowModular" || variant === "sectionalLShape";
  const compact = variant === "compactLoveseat";
  const modules = getModuleLayout(props);
  const baseHeight = slim ? 0.12 : 0.14;
  const baseY = floorY + (slim ? 0.26 : 0.12) + baseHeight / 2;
  const seatHeight = deep ? 0.2 : 0.17;
  const seatY = baseY + baseHeight / 2 + seatHeight / 2 + 0.025;
  const backHeight = height * (lowCurved ? 0.34 : deep ? 0.55 : slim ? 0.46 : 0.48);
  const armWidth = compact ? 0.11 : slim ? 0.09 : deep ? 0.2 : 0.14;
  const baseDepth = depth * (deep ? 0.75 : 0.62);
  const upholsteryRole = asset.materials.primary.role === "leather" ? "leather" : "fabric";

  return (
    <group>
      <RoundedPart
        size={[width * (curved ? 0.82 : 0.9), baseHeight, baseDepth]}
        position={[0, baseY, depth * 0.04]}
        radius={0.04}
        detailLevel={asset.detailLevel}
        material={asset.materials.accent}
        role={slim ? "wood" : "fabric"}
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
            role={upholsteryRole}
            repeat={[2, 3]}
          />
          <RoundedPart
            size={[module.width * 0.82, 0.014, Math.max(0.08, module.seatDepth * 0.82)]}
            position={[0, seatY + seatHeight * 0.42, module.chaise ? depth * 0.24 : depth * 0.07]}
            radius={0.006}
            detailLevel={asset.detailLevel}
            material={asset.materials.accent}
            role={upholsteryRole}
          />
          {!module.chaise && (
            <group>
              <RoundedPart
                size={[module.width * 0.92, backHeight, deep ? 0.18 : 0.145]}
                position={[0, seatY + backHeight * (lowCurved ? 0.34 : 0.48), -depth * (deep ? 0.34 : 0.31)]}
                rotation={[0.08, 0, 0]}
                radius={0.07}
                detailLevel={asset.detailLevel}
                material={asset.materials.primary}
                role={upholsteryRole}
                repeat={[2, 2]}
              />
              <RoundedPart size={[module.width * 0.78, 0.012, 0.012]} position={[0, seatY + backHeight * 0.5, -depth * (deep ? 0.425 : 0.38)]} radius={0.005} detailLevel={asset.detailLevel} material={asset.materials.accent} role="fabric" />
            </group>
          )}
        </group>
      ))}
      {asset.detailLevel === "presentation" && !lowCurved && modules.slice(0, Math.min(3, modules.length)).map((module, index) => (
        <group
          key={`throw-pillow-${index}`}
          position={[module.x + (index % 2 ? -0.08 : 0.08), seatY + backHeight * 0.42, -depth * 0.25]}
          rotation={[0.05, index % 2 ? -0.14 : 0.12, index % 2 ? -0.05 : 0.06]}
        >
          <SpherePart
            radius={0.5}
            position={[0, 0, 0]}
            scale={[Math.min(0.38, module.width * 0.7), Math.min(0.34, backHeight * 0.72), 0.12]}
            segments={32}
            material={index === 1 ? asset.materials.secondary : asset.materials.primary}
            role={upholsteryRole}
            roughness={0.92}
          />
          <RoundedPart size={[Math.min(0.3, module.width * 0.55), 0.012, 0.012]} position={[0, 0, -0.061]} radius={0.005} detailLevel={asset.detailLevel} material={asset.materials.accent} role={upholsteryRole} />
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
            role={upholsteryRole}
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
          role={upholsteryRole}
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
