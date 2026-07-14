"use client";

import { resolveFurnitureVariant, stableVariationValue } from "@/lib/furniture-variants";
import { DiningChair3D } from "./chair-family-3d";
import { CylinderPart, RoundedPart, SpherePart } from "./primitives";
import type { FurnitureFamily3DProps } from "./types";

export function DiningTableFamily3D(props: FurnitureFamily3DProps) {
  const { item, asset, width, depth, height } = props;
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const variant = resolved.variant.id;
  const floorY = -height / 2;
  const tableWidth = width * 0.58;
  const tableDepth = depth * 0.54;
  const topY = floorY + Math.min(0.76, height * 0.84);
  const topThickness = variant === "stoneTop" ? 0.085 : 0.065;
  const round = variant === "roundPedestal" || variant === "roundFourLeg";
  const oval = variant === "ovalSlab" || variant === "stoneTop";
  const metalFrame = variant === "lightMetalFrame";
  const chairBase = ["timberDining", "upholsteredDining", "wovenDining"][Math.floor(stableVariationValue(resolved.seed, 31) * 3)];
  const topMaterial = variant === "stoneTop" ? asset.materials.primary : asset.materials.primary;
  const chairFabric = {
    ...asset.materials.primary,
    token: "beigeFabric",
    role: "fabric" as const,
    color: "#d7c7b7",
    roughness: 0.88,
    metalness: 0
  };

  return (
    <group>
      {round ? (
        <mesh castShadow receiveShadow position={[0, topY, 0]}>
          <cylinderGeometry args={[Math.min(tableWidth, tableDepth) / 2, Math.min(tableWidth, tableDepth) / 2, topThickness, asset.detailLevel === "presentation" ? 64 : 36]} />
          <meshStandardMaterial color={topMaterial.color} roughness={topMaterial.roughness} metalness={topMaterial.metalness} />
        </mesh>
      ) : oval ? (
        <SpherePart radius={1} scale={[tableWidth / 2, topThickness / 2, tableDepth / 2]} position={[0, topY, 0]} material={topMaterial} role={variant === "stoneTop" ? "stone" : "wood"} segments={asset.detailLevel === "presentation" ? 48 : 30} />
      ) : (
        <RoundedPart size={[tableWidth, topThickness, tableDepth]} position={[0, topY, 0]} radius={metalFrame ? 0.025 : 0.045} detailLevel={asset.detailLevel} material={topMaterial} role={metalFrame ? "stone" : "wood"} repeat={[5, 3]} />
      )}

      {variant === "roundPedestal" ? (
        <group>
          <CylinderPart radiusTop={0.12} radiusBottom={Math.min(tableWidth, tableDepth) * 0.25} height={0.24} position={[0, floorY + 0.12, 0]} material={asset.materials.secondary} role="wood" sides={40} />
          <CylinderPart radiusTop={0.18} radiusBottom={0.1} height={topY - floorY - 0.27} position={[0, floorY + 0.24 + (topY - floorY - 0.27) / 2, 0]} material={asset.materials.secondary} role="wood" sides={40} />
        </group>
      ) : variant === "stoneTop" ? (
        <group>
          <CylinderPart radiusTop={0.11} radiusBottom={Math.min(tableWidth, tableDepth) * 0.23} height={0.2} position={[0, floorY + 0.1, 0]} material={asset.materials.accent} role="metal" sides={40} />
          <CylinderPart radiusTop={0.2} radiusBottom={0.12} height={topY - floorY - 0.22} position={[0, floorY + 0.2 + (topY - floorY - 0.22) / 2, 0]} material={asset.materials.secondary} role="wood" sides={36} />
        </group>
      ) : variant === "ovalSlab" ? (
        [-1, 1].map((side) => <RoundedPart key={side} size={[0.13, topY - floorY - 0.06, tableDepth * 0.5]} position={[side * tableWidth * 0.27, floorY + (topY - floorY) / 2, 0]} radius={0.035} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="wood" repeat={[1, 4]} />)
      ) : (
        [-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
          <CylinderPart key={`${sx}-${sz}`} radiusTop={metalFrame ? 0.018 : 0.035} height={topY - floorY - 0.05} position={[sx * tableWidth * 0.37, floorY + (topY - floorY) / 2, sz * tableDepth * 0.33]} rotation={[0, 0, sx * (metalFrame ? 0.12 : 0.06)]} material={metalFrame ? asset.materials.accent : asset.materials.secondary} role={metalFrame ? "metal" : "wood"} sides={metalFrame ? 10 : 14} />
        )))
      )}

      {Array.from({ length: 6 }, (_, index) => {
        const angle = index / 6 * Math.PI * 2;
        const radiusX = width * 0.405;
        const radiusZ = depth * 0.405;
        const chairVariant = asset.detailLevel === "presentation" && (index === 0 || index === 3) ? "armHost" : chairBase;
        const offset = (stableVariationValue(resolved.seed, 40 + index) - 0.5) * 0.055;
        return (
          <group key={index} position={[Math.cos(angle) * (radiusX + offset), floorY + 0.36, Math.sin(angle) * (radiusZ + offset)]} rotation={[0, -angle - Math.PI / 2 + offset * 0.2, 0]}>
            <DiningChair3D variantId={chairVariant} seed={resolved.seed + index * 97} primary={asset.materials.primary} secondary={chairFabric} accent={asset.materials.accent} detailLevel={asset.detailLevel} />
          </group>
        );
      })}
    </group>
  );
}

export function CoffeeTableFamily3D(props: FurnitureFamily3DProps) {
  const { item, asset, width, depth, height } = props;
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const variant = resolved.variant.id;
  const floorY = -height / 2;
  const topY = floorY + Math.max(0.27, height * 0.72);
  if (variant === "nestedDouble") {
    return (
      <group>
        <CylinderPart radiusTop={Math.min(width, depth) * 0.31} height={0.065} position={[-width * 0.14, topY, 0]} material={asset.materials.primary} role="wood" sides={48} />
        <CylinderPart radiusTop={Math.min(width, depth) * 0.23} height={0.055} position={[width * 0.18, topY + 0.09, depth * 0.08]} material={asset.materials.secondary} role="stone" sides={48} />
        <CylinderPart radiusTop={0.055} height={topY - floorY} position={[-width * 0.14, floorY + (topY - floorY) / 2, 0]} material={asset.materials.accent} role="metal" />
        <CylinderPart radiusTop={0.045} height={topY - floorY + 0.09} position={[width * 0.18, floorY + (topY - floorY + 0.09) / 2, depth * 0.08]} material={asset.materials.accent} role="metal" />
      </group>
    );
  }
  if (variant === "lowRound") return <group><CylinderPart radiusTop={Math.min(width, depth) * 0.43} radiusBottom={Math.min(width, depth) * 0.45} height={0.085} position={[0, topY, 0]} material={asset.materials.primary} role="wood" sides={56} /><CylinderPart radiusTop={Math.min(width, depth) * 0.18} radiusBottom={Math.min(width, depth) * 0.25} height={topY - floorY} position={[0, floorY + (topY - floorY) / 2, 0]} material={asset.materials.secondary} role="stone" sides={40} /></group>;
  if (variant === "softOrganic") return <group><SpherePart radius={1} scale={[width * 0.46, 0.065, depth * 0.38]} position={[0, topY, 0]} rotation={[0, resolved.variation.asymmetry * 0.18, 0]} material={asset.materials.primary} role="stone" segments={48} />{[-0.21, 0.23].map((x) => <CylinderPart key={x} radiusTop={0.065} height={topY - floorY} position={[x * width, floorY + (topY - floorY) / 2, 0]} material={asset.materials.secondary} role="wood" sides={24} />)}</group>;
  return (
    <group>
      <RoundedPart size={[width * 0.9, variant === "travertineBlock" ? 0.16 : 0.08, depth * 0.78]} position={[0, topY, 0]} radius={variant === "travertineBlock" ? 0.08 : 0.035} detailLevel={asset.detailLevel} material={asset.materials.primary} role={variant === "travertineBlock" ? "stone" : "wood"} repeat={[4, 3]} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <CylinderPart key={`${sx}-${sz}`} radiusTop={0.026} height={topY - floorY} position={[sx * width * 0.34, floorY + (topY - floorY) / 2, sz * depth * 0.27]} material={variant === "travertineBlock" ? asset.materials.accent : asset.materials.secondary} role={variant === "travertineBlock" ? "metal" : "wood"} sides={12} />))}
    </group>
  );
}
