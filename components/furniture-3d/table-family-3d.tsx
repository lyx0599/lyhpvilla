"use client";

import { resolveFurnitureVariant, stableVariationValue } from "@/lib/furniture-variants";
import { DiningChair3D } from "./chair-family-3d";
import { FurnitureMaterial } from "./materials";
import { CylinderPart, RoundedPart, SpherePart } from "./primitives";
import type { FurnitureFamily3DProps } from "./types";

export function SitStandDesk3D(props: FurnitureFamily3DProps) {
  const { item, asset, width, depth, height } = props;
  const floorY = -height / 2;
  const topThickness = Math.min(0.05, Math.max(0.038, height * 0.06));
  const topY = height / 2 - topThickness / 2;
  const frameTopY = topY - topThickness / 2 - 0.055;
  const columnHeight = Math.max(0.46, height - topThickness - 0.1);
  const electric = item.render3d?.variantId === "electricSitStandWood";

  return (
    <group name={electric ? "electric-sit-stand-desk" : "slim-writing-desk"}>
      <RoundedPart size={[width * 0.98, topThickness, depth * 0.96]} position={[0, topY, 0]} radius={0.025} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[6, 2.4]} />
      <RoundedPart size={[width * 0.68, 0.045, 0.065]} position={[0, frameTopY, 0]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="metal" />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * width * 0.36, 0, 0]}>
          <RoundedPart size={[0.095, columnHeight * 0.54, 0.095]} position={[0, floorY + columnHeight * 0.27 + 0.045, 0]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="metal" />
          <RoundedPart size={[0.073, columnHeight * 0.46, 0.073]} position={[0, floorY + columnHeight * 0.77 + 0.045, 0]} radius={0.01} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="metal" />
          <RoundedPart size={[0.085, 0.045, depth * 0.72]} position={[0, floorY + 0.023, 0]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="metal" />
          {[-1, 1].map((front) => <CylinderPart key={front} radiusTop={0.018} height={0.018} position={[0, floorY + 0.008, front * depth * 0.3]} material={asset.materials.accent} role="metal" sides={16} />)}
        </group>
      ))}
      {electric && <>
        <RoundedPart size={[width * 0.56, 0.032, depth * 0.16]} position={[0, frameTopY - 0.05, depth * 0.18]} radius={0.01} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="metal" />
        <RoundedPart size={[0.12, 0.035, 0.055]} position={[width * 0.38, topY - 0.055, depth * 0.41]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" />
      </>}
    </group>
  );
}

export function DiningTableFamily3D(props: FurnitureFamily3DProps) {
  const { item, asset, width, depth, height } = props;
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const variant = resolved.variant.id;
  const floorY = -height / 2;
  const tableWidth = width * 0.58;
  const tableDepth = depth * 0.54;
  const topY = floorY + Math.min(0.76, height * 0.84);
  const topThickness = variant === "stoneTop" ? 0.085 : 0.065;
  const poweredRound = variant === "poweredRoundExtension";
  const round = poweredRound || variant === "roundPedestal" || variant === "roundFourLeg";
  const oval = variant === "ovalSlab" || variant === "stoneTop";
  const metalFrame = variant === "lightMetalFrame";
  const chairBase = ["timberDining", "upholsteredDining", "wovenDining"][Math.floor(stableVariationValue(resolved.seed, 31) * 3)];
  const topMaterial = asset.materials.primary;
  const chairFabric = {
    ...asset.materials.secondary,
    role: "fabric" as const,
    roughness: Math.max(0.84, asset.materials.secondary.roughness),
    metalness: 0
  };
  // Keep the authored material token on the table. The previous round-table
  // branch forced a walnut fallback, which made the 1F light-oak table brown.
  const woodMaterial = {
    ...asset.materials.primary,
    role: "wood" as const,
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
            <FurnitureMaterial layer={woodMaterial} role="wood" repeat={[5.4, 5.4]} roughness={0.52} />
          </mesh>
          {asset.detailLevel === "presentation" && <>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -topThickness * 0.04, 0]} castShadow>
              <torusGeometry args={[roundRadius - 0.012, 0.018, 14, 80]} />
              <FurnitureMaterial layer={woodMaterial} role="wood" repeat={[7, 1]} roughness={0.48} />
            </mesh>
            {Array.from({ length: poweredRound ? 4 : 18 }, (_, index) => {
              const seamCount = poweredRound ? 4 : 18;
              const angle = index / seamCount * Math.PI * 2;
              return <RoundedPart key={`veneer-seam-${index}`} size={[0.006, 0.004, roundRadius * 0.82]} position={[Math.cos(angle) * roundRadius * 0.43, topThickness * 0.54, Math.sin(angle) * roundRadius * 0.43]} rotation={[0, Math.PI / 2 - angle, 0]} radius={0.002} detailLevel={asset.detailLevel} material={woodMaterial} role="wood" roughness={0.5} />;
            })}
            <CylinderPart radiusTop={roundRadius * 0.59} height={poweredRound ? 0.012 : 0.028} position={[0, topThickness * (poweredRound ? 0.59 : 0.72), 0]} material={poweredRound ? woodMaterial : darkStoneMaterial} role={poweredRound ? "wood" : "stone"} color={poweredRound ? undefined : "#454b42"} roughness={poweredRound ? 0.46 : 0.27} sides={64} />
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, topThickness * 0.9, 0]} castShadow>
              <torusGeometry args={[roundRadius * 0.59 - 0.009, poweredRound ? 0.006 : 0.009, 10, 64]} />
              <FurnitureMaterial layer={asset.materials.accent} role="metal" color="#2f302d" roughness={0.24} metalness={0.55} />
            </mesh>
            {poweredRound && <>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, topThickness * 0.82, 0]} castShadow>
                <torusGeometry args={[roundRadius * 0.16, 0.0035, 8, 64]} />
                <FurnitureMaterial layer={asset.materials.accent} role="metal" color="#6d5d4d" roughness={0.28} metalness={0.5} />
              </mesh>
              <RoundedPart size={[0.095, 0.012, 0.042]} position={[roundRadius * 0.72, topThickness * 0.62, 0]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#272927" roughness={0.2} metalness={0.64} />
              <CylinderPart radiusTop={0.006} height={0.006} position={[roundRadius * 0.72, topThickness * 0.635, 0]} material={asset.materials.secondary} role="ceramic" color="#e8d8b5" sides={16} />
            </>}
          </>}
        </group>
      ) : oval ? (
        <SpherePart radius={1} scale={[tableWidth / 2, topThickness / 2, tableDepth / 2]} position={[0, topY, 0]} material={topMaterial} role={variant === "stoneTop" ? "stone" : "wood"} segments={asset.detailLevel === "presentation" ? 48 : 30} />
      ) : (
        <RoundedPart size={[tableWidth, topThickness, tableDepth]} position={[0, topY, 0]} radius={metalFrame ? 0.025 : 0.045} detailLevel={asset.detailLevel} material={topMaterial} role={metalFrame ? "stone" : "wood"} repeat={[5, 3]} />
      )}
      {!round && <RoundedPart size={[tableWidth * 0.88, 0.022, tableDepth * 0.82]} position={[0, topY - topThickness * 0.72, 0]} radius={0.01} detailLevel={asset.detailLevel} material={asset.materials.accent} role={metalFrame ? "metal" : "wood"} color="#625a52" />}

      {poweredRound ? (
        <group name="powered-extension-pedestal">
          <CylinderPart radiusTop={0.18} radiusBottom={0.24} height={topY - floorY - 0.12} position={[0, floorY + (topY - floorY) / 2, 0]} material={woodMaterial} role="wood" sides={48} />
          <CylinderPart radiusTop={0.23} radiusBottom={0.29} height={0.075} position={[0, floorY + 0.038, 0]} material={asset.materials.accent} role="metal" color="#292b29" roughness={0.24} metalness={0.62} sides={48} />
          <CylinderPart radiusTop={0.22} radiusBottom={0.22} height={0.11} position={[0, topY - 0.1, 0]} material={asset.materials.accent} role="metal" color="#3b3c39" roughness={0.22} metalness={0.58} sides={40} />
          <RoundedPart size={[0.32, 0.055, 0.18]} position={[0, topY - 0.16, 0]} radius={0.022} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#30322f" roughness={0.25} metalness={0.56} />
        </group>
      ) : variant === "roundPedestal" ? (
        <group name="walnut-star-base">
          <CylinderPart radiusTop={0.1} radiusBottom={0.13} height={topY - floorY - 0.12} position={[0, floorY + (topY - floorY) / 2, 0]} material={asset.materials.accent} role="metal" color="#2d2a28" sides={18} />
          {Array.from({ length: 4 }, (_, index) => {
            const angle = Math.PI / 4 + index * Math.PI / 2;
            const x = Math.cos(angle) * 0.17;
            const z = Math.sin(angle) * 0.17;
            return <CylinderPart key={`star-leg-${index}`} radiusTop={0.042} radiusBottom={0.064} height={topY - floorY - 0.11} position={[x, floorY + (topY - floorY) / 2 - 0.01, z]} rotation={[Math.sin(angle) * 0.13, 0, -Math.cos(angle) * 0.13]} material={woodMaterial} role="wood" sides={10} />;
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

      {Array.from({ length: item.render3d?.seatCount ?? 6 }, (_, index) => {
        const seatCount = item.render3d?.seatCount ?? 6;
        const angle = index / seatCount * Math.PI * 2;
        const radiusX = width * 0.405;
        const radiusZ = depth * 0.405;
        const chairVariant = poweredRound || variant === "roundPedestal" ? "wrapDining" : asset.detailLevel === "presentation" && (index === 0 || index === 3) ? "armHost" : chairBase;
        const offset = (stableVariationValue(resolved.seed, 40 + index) - 0.5) * 0.055;
        return (
          <group key={index} position={[Math.cos(angle) * (radiusX + offset), floorY + 0.36, Math.sin(angle) * (radiusZ + offset)]} rotation={[0, -angle - Math.PI / 2 + offset * 0.2, 0]}>
            <DiningChair3D variantId={chairVariant} seed={resolved.seed + index * 97} primary={poweredRound || variant === "roundPedestal" ? woodMaterial : asset.materials.primary} secondary={chairFabric} accent={asset.materials.accent} detailLevel={asset.detailLevel} />
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
