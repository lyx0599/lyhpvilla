"use client";

import { resolveFurnitureVariant, stableVariationValue } from "@/lib/furniture-variants";
import { DiningChair3D } from "./chair-family-3d";
import { FurnitureMaterial } from "./materials";
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
    ...asset.materials.secondary,
    token: "creamFabric",
    role: "fabric" as const,
    color: "#e6d8ca",
    roughness: 0.84,
    metalness: 0
  };
  const walnutMaterial = {
    ...asset.materials.primary,
    token: "walnut",
    role: "wood" as const,
    color: "#754629",
    roughness: 0.42,
    metalness: 0.01
  };
  const lightOakMaterial = {
    ...asset.materials.primary,
    token: "warmOak",
    role: "wood" as const,
    color: "#c8ad8b",
    roughness: 0.52,
    metalness: 0.02
  };
  const darkStoneMaterial = {
    ...asset.materials.accent,
    token: "warmGreyStone",
    role: "stone" as const,
    color: "#4c5046",
    roughness: 0.3,
    metalness: 0.05
  };
  const roundRadius = Math.min(tableWidth, tableDepth) / 2;

  return (
    <group>
      {round ? (
        <group position={[0, topY, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[roundRadius, roundRadius, topThickness, asset.detailLevel === "presentation" ? 72 : 40]} />
            <FurnitureMaterial layer={walnutMaterial} role="wood" repeat={[5.4, 5.4]} roughness={0.42} />
          </mesh>
          {asset.detailLevel === "presentation" && <>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -topThickness * 0.04, 0]} castShadow>
              <torusGeometry args={[roundRadius - 0.012, 0.018, 14, 80]} />
              <FurnitureMaterial layer={walnutMaterial} role="wood" color="#4a2b1c" repeat={[7, 1]} roughness={0.38} />
            </mesh>
            {Array.from({ length: 18 }, (_, index) => {
              const angle = index / 18 * Math.PI * 2;
              return <RoundedPart key={`veneer-seam-${index}`} size={[0.006, 0.004, roundRadius * 0.82]} position={[Math.cos(angle) * roundRadius * 0.43, topThickness * 0.54, Math.sin(angle) * roundRadius * 0.43]} rotation={[0, Math.PI / 2 - angle, 0]} radius={0.002} detailLevel={asset.detailLevel} material={walnutMaterial} role="wood" color="#4f2c1d" roughness={0.5} />;
            })}
            <CylinderPart radiusTop={roundRadius * 0.59} height={0.028} position={[0, topThickness * 0.72, 0]} material={darkStoneMaterial} role="stone" color="#454b42" roughness={0.27} sides={64} />
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, topThickness * 0.9, 0]} castShadow>
              <torusGeometry args={[roundRadius * 0.59 - 0.009, 0.009, 10, 64]} />
              <FurnitureMaterial layer={asset.materials.accent} role="metal" color="#2f302d" roughness={0.24} metalness={0.55} />
            </mesh>
          </>}
        </group>
      ) : oval ? (
        <SpherePart radius={1} scale={[tableWidth / 2, topThickness / 2, tableDepth / 2]} position={[0, topY, 0]} material={topMaterial} role={variant === "stoneTop" ? "stone" : "wood"} segments={asset.detailLevel === "presentation" ? 48 : 30} />
      ) : (
        <RoundedPart size={[tableWidth, topThickness, tableDepth]} position={[0, topY, 0]} radius={metalFrame ? 0.025 : 0.045} detailLevel={asset.detailLevel} material={topMaterial} role={metalFrame ? "stone" : "wood"} repeat={[5, 3]} />
      )}
      {!round && <RoundedPart size={[tableWidth * 0.88, 0.022, tableDepth * 0.82]} position={[0, topY - topThickness * 0.72, 0]} radius={0.01} detailLevel={asset.detailLevel} material={asset.materials.accent} role={metalFrame ? "metal" : "wood"} color="#625a52" />}

      {variant === "roundPedestal" ? (
        <group name="walnut-star-base">
          <CylinderPart radiusTop={0.1} radiusBottom={0.13} height={topY - floorY - 0.12} position={[0, floorY + (topY - floorY) / 2, 0]} material={asset.materials.accent} role="metal" color="#2d2a28" sides={18} />
          {Array.from({ length: 4 }, (_, index) => {
            const angle = Math.PI / 4 + index * Math.PI / 2;
            const x = Math.cos(angle) * 0.17;
            const z = Math.sin(angle) * 0.17;
            return <CylinderPart key={`star-leg-${index}`} radiusTop={0.042} radiusBottom={0.064} height={topY - floorY - 0.11} position={[x, floorY + (topY - floorY) / 2 - 0.01, z]} rotation={[Math.sin(angle) * 0.13, 0, -Math.cos(angle) * 0.13]} material={walnutMaterial} role="wood" color="#4f3123" sides={10} />;
          })}
          <CylinderPart radiusTop={0.25} radiusBottom={0.29} height={0.045} position={[0, floorY + 0.023, 0]} material={asset.materials.accent} role="metal" color="#262525" roughness={0.3} metalness={0.68} sides={40} />
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
        const chairVariant = variant === "roundPedestal" ? "wrapDining" : asset.detailLevel === "presentation" && (index === 0 || index === 3) ? "armHost" : chairBase;
        const offset = (stableVariationValue(resolved.seed, 40 + index) - 0.5) * 0.055;
        return (
          <group key={index} position={[Math.cos(angle) * (radiusX + offset), floorY + 0.36, Math.sin(angle) * (radiusZ + offset)]} rotation={[0, -angle - Math.PI / 2 + offset * 0.2, 0]}>
            <DiningChair3D variantId={chairVariant} seed={resolved.seed + index * 97} primary={variant === "roundPedestal" ? lightOakMaterial : asset.materials.primary} secondary={chairFabric} accent={asset.materials.accent} detailLevel={asset.detailLevel} />
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
  if (variant === "clearGlassTop") {
    const frameHeight = topY - floorY;
    return (
      <group name="clear-glass-coffee-table">
        <RoundedPart size={[width * 0.9, 0.035, depth * 0.78]} position={[0, topY, 0]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.primary} role="glass" />
        <RoundedPart size={[width * 0.82, 0.025, depth * 0.68]} position={[0, floorY + frameHeight * 0.42, 0]} radius={0.01} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="glass" />
        {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
          <CylinderPart key={`${sx}-${sz}`} radiusTop={0.018} height={frameHeight} position={[sx * width * 0.38, floorY + frameHeight / 2, sz * depth * 0.31]} material={asset.materials.accent} role="metal" sides={12} />
        )))}
      </group>
    );
  }
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
