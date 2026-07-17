"use client";

import type { ReactNode } from "react";
import { resolveFurnitureVariant } from "@/lib/furniture-variants";
import { CylinderPart, RoundedPart } from "./primitives";
import type { FurnitureFamily3DProps } from "./types";

function WarmStrip({ width, position }: { width: number; position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[width, 0.018, 0.025]} />
      <meshStandardMaterial color="#ffe4b0" emissive="#ffd386" emissiveIntensity={0.82} roughness={0.18} />
    </mesh>
  );
}

function AnimatedCabinetLeaf({
  children,
  position,
  width,
  hingeSide,
  openAmount
}: {
  children: ReactNode;
  position: [number, number, number];
  width: number;
  hingeSide: -1 | 1;
  openAmount: number;
}) {
  const hingeOffset = hingeSide * width / 2;
  return (
    <group
      position={[position[0] + hingeOffset, position[1], position[2]]}
      rotation={[0, -hingeSide * openAmount * Math.PI * 0.48, 0]}
    >
      <group position={[-hingeOffset, 0, 0]}>{children}</group>
    </group>
  );
}

function TallCabinet3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height, item } = props;
  const runtimeOpenAmount = Math.max(0, Math.min(1, props.openAmount ?? 0));
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const variant = resolved.variant.id;
  const sliding = variant === "slidingPanels";
  const floorY = -height / 2;
  const glass = variant === "glassDisplay" || variant === "slimGlassFrame";
  const open = variant === "openClosedMix" || variant === "woodWarmWhite";
  const panelCount = Math.max(3, Math.min(6, Math.round(width / 0.58)));
  const gap = 0.018;
  const panelWidth = (width - gap * (panelCount + 1)) / panelCount;
  const openIndex = Math.min(panelCount - 1, Math.floor(resolved.variation.panelBias * panelCount));
  const carcassThickness = Math.min(0.045, Math.max(0.025, width * 0.018));
  const carcassY = floorY + height * 0.5;
  return (
    <group>
      <RoundedPart size={[width - carcassThickness * 2, height * 0.91, carcassThickness]} position={[0, carcassY, -depth * 0.46]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="ceramic" color="#eee9e1" repeat={[Math.max(3, panelCount), 6]} />
      {[-1, 1].map((side) => (
        <RoundedPart key={side} size={[carcassThickness, height * 0.96, depth * 0.92]} position={[side * (width / 2 - carcassThickness / 2), carcassY, 0]} radius={0.009} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[1, 6]} />
      ))}
      {[-1, 1].map((side) => (
        <RoundedPart key={side} size={[width, carcassThickness, depth * 0.92]} position={[0, carcassY + side * (height * 0.48 - carcassThickness / 2), 0]} radius={0.009} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[Math.max(3, panelCount), 1]} />
      ))}
      {Array.from({ length: panelCount - 1 }, (_, index) => (
        <RoundedPart key={index} size={[0.018, height * 0.89, depth * 0.76]} position={[-width / 2 + (index + 1) * (width / panelCount), carcassY, -depth * 0.05]} radius={0.005} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" />
      ))}
      <RoundedPart size={[width * 0.94, 0.08, depth * 0.76]} position={[0, floorY + 0.04, -depth * 0.04]} radius={0.014} detailLevel={asset.detailLevel} material={asset.materials.accent} role="wood" color="#574f47" />
      {runtimeOpenAmount > 0.01 && <RoundedPart size={[width * 0.94, height * 0.88, 0.024]} position={[0, carcassY, depth * 0.455]} radius={0.006} detailLevel={asset.detailLevel} material={asset.materials.accent} role="wood" color="#3d342c" />}
      {sliding && [-1, 1].map((side) => <RoundedPart key={`track-${side}`} size={[width * 0.94, 0.018, 0.045]} position={[0, floorY + height * (side > 0 ? 0.945 : 0.055), depth * 0.47]} radius={0.004} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" />)}
      {Array.from({ length: panelCount }, (_, index) => {
        const x = -width / 2 + gap + panelWidth / 2 + index * (panelWidth + gap);
        const openBay = open && index === openIndex;
        const glassBay = glass && (index === openIndex || (panelCount > 4 && index === openIndex - 1));
        if (openBay) {
          return (
            <group key={index} position={[x, floorY + height * 0.5, depth * 0.49]}>
              <RoundedPart size={[panelWidth, height * 0.91, 0.035]} position={[0, 0, -depth * 0.36]} radius={0.01} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" color="#9f8567" repeat={[2, 5]} />
              {[0.34, 0.07, -0.2].map((ratio) => <RoundedPart key={ratio} size={[panelWidth * 0.92, 0.035, depth * 0.72]} position={[0, ratio * height, -depth * 0.17]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[2, 2]} />)}
              <CylinderPart radiusTop={0.012} height={panelWidth * 0.75} position={[0, height * 0.25, -depth * 0.12]} rotation={[0, 0, Math.PI / 2]} material={asset.materials.accent} role="metal" sides={12} />
              {[-0.35, -0.25].map((ratio) => <RoundedPart key={ratio} size={[panelWidth * 0.85, height * 0.075, depth * 0.68]} position={[0, ratio * height, -depth * 0.14]} radius={0.016} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="wood" />)}
              <WarmStrip width={panelWidth * 0.78} position={[0, height * 0.405, -depth * 0.08]} />
            </group>
          );
        }
        const panel = <>
            <RoundedPart size={[panelWidth, height * 0.91, 0.045]} radius={0.012} detailLevel={asset.detailLevel} material={glassBay ? asset.materials.secondary : index % 3 === 1 && variant === "woodWarmWhite" ? asset.materials.secondary : asset.materials.primary} role={glassBay ? "glass" : index % 3 === 1 && variant === "woodWarmWhite" ? "ceramic" : "wood"} opacity={glassBay ? 0.36 : 1} repeat={[2, 6]} />
            {glassBay && (
              <group>
                {[-1, 1].map((side) => <RoundedPart key={side} size={[0.025, height * 0.89, 0.055]} position={[side * panelWidth * 0.47, 0, 0.018]} radius={0.006} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" />)}
                {[-1, 1].map((side) => <RoundedPart key={side} size={[panelWidth * 0.94, 0.025, 0.055]} position={[0, side * height * 0.445, 0.018]} radius={0.006} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" />)}
              </group>
            )}
            {!glassBay && variant !== "fullHeightFlat" && !sliding && <RoundedPart size={[0.018, Math.min(0.22, height * 0.13), 0.025]} position={[panelWidth * 0.34 * (index % 2 ? -1 : 1), 0, 0.035]} radius={0.006} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" />}
          </>;
        const panelPosition: [number, number, number] = [x, floorY + height * 0.5, depth * (sliding && index % 2 ? 0.46 : 0.495)];
        if (sliding) {
          const slideDirection = index % 2 ? -1 : 1;
          return <group key={index} position={[panelPosition[0] + slideDirection * runtimeOpenAmount * panelWidth * 0.72, panelPosition[1], panelPosition[2]]}>{panel}</group>;
        }
        return (
          <AnimatedCabinetLeaf key={index} position={panelPosition} width={panelWidth} hingeSide={index % 2 ? 1 : -1} openAmount={runtimeOpenAmount}>
            {panel}
          </AnimatedCabinetLeaf>
        );
      })}
    </group>
  );
}

function LowStorageCabinet3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height, item } = props;
  const runtimeOpenAmount = Math.max(0, Math.min(1, props.openAmount ?? 0));
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const variant = resolved.variant.id;
  const floorY = -height / 2;
  const floating = variant === "floating" || variant === "wallMounted";
  const lift = floating ? Math.min(0.28, height * 0.28) : 0.1;
  const bodyHeight = height - lift - 0.07;
  const bodyY = floorY + lift + bodyHeight / 2;
  const bayCount = Math.max(2, Math.min(5, Math.round(width / 0.55)));
  const bayWidth = width / bayCount;
  const openIndex = Math.min(bayCount - 1, Math.floor(resolved.variation.panelBias * bayCount));
  const glass = variant === "glassDisplay" || variant === "slimGlassFrame";
  const open = variant === "openClosedMix" || variant === "woodWarmWhite" || glass;
  return (
    <group>
      <RoundedPart size={[width, bodyHeight, depth]} position={[0, bodyY, 0]} radius={0.025} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[Math.max(3, bayCount), 3]} />
      {runtimeOpenAmount > 0.01 && <RoundedPart size={[width * 0.94, bodyHeight * 0.84, 0.024]} position={[0, bodyY, depth * 0.505]} radius={0.006} detailLevel={asset.detailLevel} material={asset.materials.accent} role="wood" color="#3d342c" />}
      {Array.from({ length: bayCount }, (_, index) => {
        const x = -width / 2 + bayWidth * (index + 0.5);
        const openBay = open && index === openIndex;
        if (openBay) {
          return (
            <group key={index} position={[x, bodyY, depth * 0.51]}>
              <RoundedPart size={[bayWidth * 0.9, bodyHeight * 0.84, 0.035]} position={[0, 0, -depth * 0.35]} radius={0.01} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" color="#92785f" />
              {[-0.28, 0.05, 0.36].map((ratio) => <RoundedPart key={ratio} size={[bayWidth * 0.84, 0.028, depth * 0.66]} position={[0, ratio * bodyHeight, -depth * 0.15]} radius={0.007} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" />)}
              {glass && <RoundedPart size={[bayWidth * 0.88, bodyHeight * 0.8, 0.035]} position={[0, 0, 0.03]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="glass" opacity={0.32} />}
              {asset.detailLevel === "presentation" && <WarmStrip width={bayWidth * 0.78} position={[0, bodyHeight * 0.39, -depth * 0.07]} />}
            </group>
          );
        }
        const drawer = index < Math.ceil(bayCount / 2);
        const panel = <>
            {drawer ? [-0.23, 0.08, 0.35].map((ratio) => <RoundedPart key={ratio} size={[bayWidth * 0.9, bodyHeight * 0.27, 0.045]} position={[0, ratio * bodyHeight, 0]} radius={0.012} detailLevel={asset.detailLevel} material={index % 2 ? asset.materials.secondary : asset.materials.primary} role={index % 2 ? "ceramic" : "wood"} />) : <RoundedPart size={[bayWidth * 0.9, bodyHeight * 0.88, 0.045]} radius={0.012} detailLevel={asset.detailLevel} material={index % 2 ? asset.materials.secondary : asset.materials.primary} role={index % 2 ? "ceramic" : "wood"} />}
            {variant !== "handleless" && <RoundedPart size={[Math.min(0.14, bayWidth * 0.45), 0.014, 0.02]} position={[0, drawer ? bodyHeight * 0.08 : 0, 0.035]} radius={0.005} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" />}
          </>;
        const panelPosition: [number, number, number] = [x, bodyY, depth * 0.515];
        if (drawer) {
          return <group key={index} position={[panelPosition[0], panelPosition[1], panelPosition[2] + runtimeOpenAmount * Math.min(0.36, depth * 0.66)]}>{panel}</group>;
        }
        return (
          <AnimatedCabinetLeaf key={index} position={panelPosition} width={bayWidth * 0.9} hingeSide={index % 2 ? 1 : -1} openAmount={runtimeOpenAmount}>
            {panel}
          </AnimatedCabinetLeaf>
        );
      })}
      {Array.from({ length: bayCount - 1 }, (_, index) => (
        <RoundedPart
          key={`front-reveal-${index}`}
          size={[0.012, bodyHeight * 0.84, 0.012]}
          position={[-width / 2 + bayWidth * (index + 1), bodyY, depth * 0.535]}
          radius={0.004}
          detailLevel={asset.detailLevel}
          material={asset.materials.accent}
          role="metal"
          color="#5b554f"
        />
      ))}
      <RoundedPart size={[width + 0.08, 0.06, depth + 0.06]} position={[0, floorY + lift + bodyHeight + 0.03, 0]} radius={0.022} detailLevel={asset.detailLevel} material={asset.materials.secondary} role={asset.materials.secondary.role === "glass" ? "glass" : asset.materials.secondary.role === "wood" ? "wood" : "stone"} repeat={[5, 2]} />
      {!floating && <RoundedPart size={[width * 0.86, 0.09, depth * 0.7]} position={[0, floorY + 0.045, -depth * 0.03]} radius={0.015} detailLevel={asset.detailLevel} material={asset.materials.accent} role="wood" color="#514b44" />}
      {floating && <WarmStrip width={width * 0.84} position={[0, floorY + lift - 0.018, depth * 0.46]} />}
    </group>
  );
}

function IslandCabinet3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const floorY = -height / 2;
  const bodyHeight = height * 0.82;
  const bodyY = floorY + 0.08 + bodyHeight / 2;
  const panelWidth = width / 3;
  return (
    <group>
      <RoundedPart size={[width * 0.94, bodyHeight, depth * 0.86]} position={[-width * 0.02, bodyY, 0]} radius={0.025} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[5, 3]} />
      {[-1, 0, 1].map((index) => (
        <group key={index} position={[index * panelWidth * 0.82, bodyY, depth * 0.445]}>
          {index === 1 ? [-0.24, 0.08, 0.37].map((ratio) => <RoundedPart key={ratio} size={[panelWidth * 0.76, bodyHeight * 0.27, 0.045]} position={[0, ratio * bodyHeight, 0]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="ceramic" />) : <RoundedPart size={[panelWidth * 0.76, bodyHeight * 0.9, 0.045]} radius={0.012} detailLevel={asset.detailLevel} material={index < 0 ? asset.materials.primary : asset.materials.secondary} role={index < 0 ? "wood" : "ceramic"} />}
        </group>
      ))}
      <RoundedPart size={[width + 0.18, 0.085, depth + 0.18]} position={[0.05, floorY + height - 0.045, 0]} radius={0.03} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="stone" repeat={[6, 3]} />
      <RoundedPart size={[width * 0.34, 0.04, depth * 0.58]} position={[width * 0.23, bodyY + bodyHeight * 0.24, -depth * 0.45]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" />
      <RoundedPart size={[width * 0.82, 0.08, depth * 0.66]} position={[0, floorY + 0.04, -depth * 0.04]} radius={0.015} detailLevel={asset.detailLevel} material={asset.materials.accent} role="wood" color="#4f4943" />
    </group>
  );
}

function BathroomVanity3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const floorY = -height / 2;
  const bodyHeight = height * 0.54;
  const bodyY = floorY + height * 0.35 + bodyHeight / 2;
  return (
    <group>
      <RoundedPart size={[width, bodyHeight, depth]} position={[0, bodyY, 0]} radius={0.04} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[4, 2]} />
      {[-0.19, 0.15].map((ratio) => <RoundedPart key={ratio} size={[width * 0.92, bodyHeight * 0.42, 0.045]} position={[0, bodyY + ratio * bodyHeight, depth * 0.515]} radius={0.016} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" />)}
      <RoundedPart size={[width + 0.08, 0.065, depth + 0.05]} position={[0, bodyY + bodyHeight / 2 + 0.032, 0]} radius={0.025} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="stone" repeat={[4, 2]} />
      <CylinderPart radiusTop={Math.min(0.22, width * 0.22)} radiusBottom={Math.min(0.18, width * 0.18)} height={0.11} position={[0, bodyY + bodyHeight / 2 + 0.105, 0]} material={asset.materials.secondary} role="ceramic" sides={40} />
      <CylinderPart radiusTop={0.018} height={0.25} position={[width * 0.2, bodyY + bodyHeight / 2 + 0.19, -depth * 0.12]} material={asset.materials.accent} role="metal" sides={16} />
      <WarmStrip width={width * 0.82} position={[0, floorY + height * 0.34, depth * 0.46]} />
    </group>
  );
}

export function CabinetFamily3D(props: FurnitureFamily3DProps) {
  const type = props.asset.assetType;
  if (type === "wardrobe" || type === "walkInCloset" || props.height > 1.45) return <TallCabinet3D {...props} />;
  if (type === "island" || type === "kitchenCabinet") return <IslandCabinet3D {...props} />;
  if (type === "bathroomVanity") return <BathroomVanity3D {...props} />;
  return <LowStorageCabinet3D {...props} />;
}
