"use client";

import type { ReactNode } from "react";
import { resolveFurnitureVariant } from "@/lib/furniture-variants";
import { FurnitureMaterial } from "./materials";
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

function ArchedUpperCabinet3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height, item } = props;
  const config = item.render3d?.cabinetVisual;
  const panelCount = Math.max(3, Math.min(6, Math.round(config?.gridColumns ?? width / 0.44)));
  const gap = Math.max(0.012, width * 0.006);
  const panelWidth = (width - gap * (panelCount + 1)) / panelCount;
  const frontZ = depth / 2 + 0.014;
  const glassColor = config?.glassTone === "smoked" ? "#817a73" : config?.glassTone === "gray" ? "#a4adb0" : undefined;
  return (
    <group name="parametric-arched-upper-cabinet">
      <RoundedPart size={[width, height, depth]} radius={Math.min(0.025, height * 0.04)} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[Math.max(3, panelCount), 3]} />
      {Array.from({ length: panelCount }, (_, index) => {
        const x = -width / 2 + gap + panelWidth / 2 + index * (panelWidth + gap);
        const solidWood = index === 0 || index === panelCount - 1;
        const archWidth = panelWidth * 0.68;
        const archHeight = height * 0.72;
        const archRadius = Math.max(0.035, archWidth / 2);
        const archLength = Math.max(0.025, archHeight - archRadius * 2);
        return (
          <group key={`arched-door-${index}`} position={[x, 0, frontZ]}>
            <RoundedPart size={[panelWidth, height * 0.92, 0.042]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[2, 4]} />
            <mesh position={[0, height * 0.015, 0.03]} scale={[1, 1, 0.16]} castShadow>
              <capsuleGeometry args={[archRadius, archLength, 8, 28]} />
              <FurnitureMaterial layer={asset.materials.accent} role="metal" roughness={0.38} metalness={0.42} />
            </mesh>
            <mesh position={[0, height * 0.015, 0.036]} scale={[0.91, 0.94, 0.13]} castShadow>
              <capsuleGeometry args={[archRadius, archLength, 8, 28]} />
              <FurnitureMaterial layer={solidWood ? asset.materials.primary : asset.materials.secondary} role={solidWood ? "wood" : "glass"} color={solidWood ? undefined : glassColor} opacity={solidWood ? 1 : 0.32} repeat={[2, 5]} />
            </mesh>
            {!solidWood && asset.detailLevel === "presentation" && Array.from({ length: 7 }, (_, ribIndex) => {
              const ratio = (ribIndex - 3) / 7;
              const ribHeight = archHeight * (0.66 - Math.abs(ratio) * 0.18);
              return <RoundedPart key={`flute-${ribIndex}`} size={[0.009, ribHeight, 0.009]} position={[ratio * archWidth * 0.72, 0, 0.055]} radius={0.003} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" opacity={0.42} />;
            })}
            <CylinderPart radiusTop={0.012} height={0.024} position={[panelWidth * (index % 2 ? -0.31 : 0.31), -height * 0.37, 0.07]} rotation={[Math.PI / 2, 0, 0]} material={asset.materials.accent} role="metal" sides={16} />
          </group>
        );
      })}
      <WarmStrip width={width * 0.94} position={[0, -height / 2 - 0.012, depth / 2 + 0.018]} />
    </group>
  );
}

function ArchedBuffetCabinet3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const floorY = -height / 2;
  const lowerHeight = Math.max(0.62, Math.min(height * 0.37, 0.92));
  const nicheHeight = Math.max(0.42, Math.min(height * 0.27, 0.68));
  const upperHeight = Math.max(0.48, height - lowerHeight - nicheHeight);
  const sideWidth = Math.max(0.28, Math.min(width * 0.19, 0.54));
  const centerWidth = Math.max(0.62, width - sideWidth * 2);
  const counterY = floorY + lowerHeight;
  const upperY = counterY + nicheHeight + upperHeight / 2;
  const bayCount = Math.max(3, Math.min(6, Math.round(width / 0.52)));
  const bayWidth = width / bayCount;
  return (
    <group name="parametric-arched-buffet-cabinet">
      <RoundedPart size={[width, lowerHeight, depth]} position={[0, floorY + lowerHeight / 2, 0]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[bayCount, 3]} />
      {Array.from({ length: bayCount }, (_, index) => {
        const x = -width / 2 + bayWidth * (index + 0.5);
        const drawerBay = index >= bayCount - 2;
        return <group key={`lower-bay-${index}`} position={[x, floorY + lowerHeight * 0.48, depth / 2 + 0.024]}>
          {drawerBay ? [-0.29, 0.01, 0.31].map((ratio) => <RoundedPart key={ratio} size={[bayWidth * 0.91, lowerHeight * 0.27, 0.04]} position={[0, ratio * lowerHeight, 0]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" />) : <RoundedPart size={[bayWidth * 0.91, lowerHeight * 0.88, 0.04]} radius={0.009} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" />}
          <CylinderPart radiusTop={0.011} height={0.022} position={[0, drawerBay ? 0 : lowerHeight * 0.03, 0.04]} rotation={[Math.PI / 2, 0, 0]} material={asset.materials.accent} role="metal" sides={16} />
        </group>;
      })}
      {Array.from({ length: Math.max(8, Math.round(width / 0.14)) }, (_, index) => <RoundedPart key={`base-flute-${index}`} size={[0.012, lowerHeight * 0.16, 0.018]} position={[-width * 0.46 + index * (width * 0.92 / Math.max(7, Math.round(width / 0.14) - 1)), floorY + lowerHeight * 0.87, depth / 2 + 0.052]} radius={0.003} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" opacity={0.5} />)}
      <RoundedPart size={[width + 0.06, 0.055, depth + 0.035]} position={[0, counterY + 0.028, 0.012]} radius={0.014} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="stone" repeat={[5, 2]} />
      <RoundedPart size={[centerWidth, nicheHeight, 0.04]} position={[0, counterY + nicheHeight / 2, -depth * 0.45]} radius={0.01} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="ceramic" />
      {[-1, 1].map((side) => <RoundedPart key={`tower-${side}`} size={[sideWidth, nicheHeight + upperHeight, depth]} position={[side * (width / 2 - sideWidth / 2), counterY + (nicheHeight + upperHeight) / 2, 0]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[2, 6]} />)}
      {[-1, 1].map((side) => <group key={`tower-door-${side}`} position={[side * (width / 2 - sideWidth / 2), counterY + (nicheHeight + upperHeight) / 2, depth / 2 + 0.025]}><RoundedPart size={[sideWidth * 0.88, (nicheHeight + upperHeight) * 0.91, 0.04]} radius={0.016} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" /><RoundedPart size={[sideWidth * 0.6, (nicheHeight + upperHeight) * 0.72, 0.018]} position={[0, 0, 0.035]} radius={Math.min(sideWidth * 0.28, 0.17)} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" /></group>)}
      <group position={[0, upperY, 0]}><ArchedUpperCabinet3D {...props} width={centerWidth} height={upperHeight} /></group>
      <WarmStrip width={centerWidth * 0.95} position={[0, counterY + nicheHeight - 0.025, depth / 2 + 0.02]} />
      <RoundedPart size={[width * 0.2, nicheHeight * 0.32, depth * 0.28]} position={[centerWidth * 0.28, counterY + nicheHeight * 0.2, depth * 0.2]} radius={0.025} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="metal" />
      {[-0.18, 0, 0.18].map((ratio) => <CylinderPart key={`counter-jar-${ratio}`} radiusTop={0.035} radiusBottom={0.04} height={nicheHeight * 0.2} position={[ratio * centerWidth, counterY + nicheHeight * 0.12, depth * 0.22]} material={asset.materials.primary} role="ceramic" sides={22} />)}
    </group>
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

function DoubleDoorPulloutPantry3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height, item } = props;
  const floorY = -height / 2;
  const frontZ = depth / 2 + 0.025;
  const openAmount = Math.max(0, Math.min(1, props.openAmount ?? 0));
  const basketCount = Math.max(4, Math.min(8, Math.round(item.render3d?.cabinetVisual?.basketCount ?? 6)));
  const innerHeight = height * 0.86;
  const basketWidth = width * 0.4;
  const basketDepth = depth * 0.68;
  return (
    <group name="double-door-pullout-pantry">
      <RoundedPart size={[width, height, depth]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[3, 7]} />
      <RoundedPart size={[width * 0.91, height * 0.91, 0.025]} position={[0, 0, -depth * 0.47]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="wood" color="#d9c09c" />
      <RoundedPart size={[0.025, height * 0.9, depth * 0.82]} position={[0, 0, -depth * 0.03]} radius={0.004} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" />
      {[-1, 1].map((side) => (
        <group key={`basket-column-${side}`} position={[side * width * 0.245, 0, 0]}>
          {Array.from({ length: basketCount }, (_, index) => {
            const y = floorY + height * 0.08 + innerHeight * (index + 0.5) / basketCount;
            return (
              <group key={`pullout-basket-${index}`} position={[0, y, openAmount * depth * 0.42]}>
                <RoundedPart size={[basketWidth, 0.035, basketDepth]} radius={0.006} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#b7a98f" metalness={0.34} roughness={0.38} />
                {[-1, 1].map((edge) => <RoundedPart key={edge} size={[0.016, 0.12, basketDepth]} position={[edge * basketWidth * 0.47, 0.06, 0]} radius={0.004} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#aa987c" metalness={0.42} />)}
                <RoundedPart size={[basketWidth, 0.014, 0.018]} position={[0, 0.115, basketDepth * 0.47]} radius={0.004} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#aa987c" metalness={0.42} />
              </group>
            );
          })}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <AnimatedCabinetLeaf key={`pantry-door-${side}`} position={[side * width * 0.25, 0, frontZ]} width={width * 0.49} hingeSide={side as -1 | 1} openAmount={openAmount}>
          <RoundedPart size={[width * 0.48, height * 0.94, 0.045]} radius={0.014} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[2, 7]} />
          <RoundedPart size={[width * 0.36, height * 0.84, 0.018]} position={[0, 0, 0.034]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" opacity={0.56} />
          <CylinderPart radiusTop={0.011} height={0.024} position={[-side * width * 0.17, 0, 0.065]} rotation={[Math.PI / 2, 0, 0]} material={asset.materials.accent} role="metal" sides={16} />
        </AnimatedCabinetLeaf>
      ))}
      <RoundedPart size={[width * 0.9, 0.08, depth * 0.74]} position={[0, floorY + 0.04, -depth * 0.03]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.accent} role="wood" color="#6c5947" />
    </group>
  );
}

function SquareGridDisplayCabinet3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height, item } = props;
  const config = item.render3d?.cabinetVisual;
  const columns = Math.max(3, Math.min(7, Math.round(config?.gridColumns ?? 5)));
  const rows = Math.max(3, Math.min(6, Math.round(config?.gridRows ?? 4)));
  const floorY = -height / 2;
  const frame = Math.min(0.055, Math.max(0.032, width * 0.018));
  const usableWidth = width - frame * 2;
  const usableHeight = height - frame * 2;
  const cellWidth = usableWidth / columns;
  const cellHeight = usableHeight / rows;
  const frontZ = depth / 2 + 0.012;
  const glassColor = config?.glassTone === "smoked" ? "#889295" : config?.glassTone === "gray" ? "#a8b1b3" : "#d8eef0";
  return (
    <group name="square-grid-glass-display-cabinet">
      <RoundedPart size={[width * 0.98, height * 0.98, 0.035]} position={[0, 0, -depth * 0.46]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="wood" color="#b99b78" repeat={[6, 6]} />
      {[-1, 1].map((side) => <RoundedPart key={`side-${side}`} size={[frame, height, depth]} position={[side * (width / 2 - frame / 2), 0, 0]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[1, 6]} />)}
      {[-1, 1].map((side) => <RoundedPart key={`cap-${side}`} size={[width, frame, depth]} position={[0, side * (height / 2 - frame / 2), 0]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[6, 1]} />)}
      {Array.from({ length: columns - 1 }, (_, index) => {
        const x = -usableWidth / 2 + cellWidth * (index + 1);
        return <RoundedPart key={`divider-v-${index}`} size={[frame * 0.58, usableHeight, depth * 0.9]} position={[x, 0, -depth * 0.02]} radius={0.006} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[1, rows]} />;
      })}
      {Array.from({ length: rows - 1 }, (_, index) => {
        const y = floorY + frame + cellHeight * (index + 1);
        return <RoundedPart key={`divider-h-${index}`} size={[usableWidth, frame * 0.58, depth * 0.9]} position={[0, y, -depth * 0.02]} radius={0.006} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[columns, 1]} />;
      })}
      {Array.from({ length: columns * rows }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = -usableWidth / 2 + cellWidth * (column + 0.5);
        const y = floorY + frame + cellHeight * (row + 0.5);
        const showObject = config?.displayContents !== false && (index % 3 !== 1 || row === rows - 1);
        return (
          <group key={`cell-${column}-${row}`} position={[x, y, 0]}>
            {showObject && (index % 4 === 0 ? (
              <group position={[0, -cellHeight * 0.18, depth * 0.08]}>
                <CylinderPart radiusTop={Math.min(cellWidth, cellHeight) * 0.13} radiusBottom={Math.min(cellWidth, cellHeight) * 0.16} height={cellHeight * 0.3} position={[0, 0, 0]} material={asset.materials.secondary} role="ceramic" color={index % 8 === 0 ? "#b8735a" : "#d2bd9f"} sides={24} />
              </group>
            ) : (
              <RoundedPart size={[cellWidth * 0.42, cellHeight * 0.42, depth * 0.26]} position={[0, -cellHeight * 0.17, depth * 0.02]} rotation={[0, 0, index % 2 ? 0.08 : -0.08]} radius={0.025} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="ceramic" color={index % 2 ? "#8eaa9b" : "#c4a47d"} />
            ))}
            <RoundedPart size={[cellWidth - frame * 0.72, cellHeight - frame * 0.72, 0.028]} position={[0, 0, frontZ]} radius={0.009} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="glass" color={glassColor} opacity={0.22} />
            <CylinderPart radiusTop={0.009} height={0.018} position={[cellWidth * 0.34, 0, frontZ + 0.025]} rotation={[Math.PI / 2, 0, 0]} material={asset.materials.accent} role="metal" sides={14} />
          </group>
        );
      })}
      {config?.interiorLighting !== false && Array.from({ length: rows }, (_, row) => {
        const y = floorY + frame + cellHeight * (row + 1) - frame * 0.45;
        return <WarmStrip key={`grid-light-${row}`} width={usableWidth * 0.94} position={[0, y, depth * 0.31]} />;
      })}
      <RoundedPart size={[width * 0.88, 0.08, depth * 0.78]} position={[0, floorY + 0.04, -depth * 0.03]} radius={0.014} detailLevel={asset.detailLevel} material={asset.materials.accent} role="wood" color="#554b42" />
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
  const cabinetVisual = item.render3d?.cabinetVisual;
  const forceGlassDoors = cabinetVisual?.frontStyle === "glass" && cabinetVisual.allDoorPanels !== false;
  const glass = forceGlassDoors || variant === "glassDisplay" || variant === "slimGlassFrame";
  const open = variant === "openClosedMix" || variant === "woodWarmWhite";
  const glassColor = cabinetVisual?.glassTone === "gray" ? "#a4adb0" : undefined;
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
        const openBay = !forceGlassDoors && open && index === openIndex;
        const glassBay = forceGlassDoors || (glass && (index === openIndex || (panelCount > 4 && index === openIndex - 1)));
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
            <RoundedPart size={[panelWidth, height * 0.91, 0.045]} radius={0.012} detailLevel={asset.detailLevel} material={glassBay ? asset.materials.secondary : index % 3 === 1 && variant === "woodWarmWhite" ? asset.materials.secondary : asset.materials.primary} role={glassBay ? "glass" : index % 3 === 1 && variant === "woodWarmWhite" ? "ceramic" : "wood"} color={glassBay ? glassColor : undefined} opacity={glassBay ? 0.3 : 1} repeat={[2, 6]} />
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
  const variant = props.item.render3d?.variantId;
  if (variant === "archedBuffet") return <ArchedBuffetCabinet3D {...props} />;
  if (variant === "archedBuffetUpper") return <ArchedUpperCabinet3D {...props} />;
  if (variant === "doubleDoorPulloutPantry") return <DoubleDoorPulloutPantry3D {...props} />;
  if (props.item.render3d?.cabinetVisual?.layout === "squareGrid") return <SquareGridDisplayCabinet3D {...props} />;
  if (type === "wardrobe" || type === "walkInCloset" || props.height > 1.45) return <TallCabinet3D {...props} />;
  if (type === "island" || type === "kitchenCabinet") return <IslandCabinet3D {...props} />;
  if (type === "bathroomVanity") return <BathroomVanity3D {...props} />;
  return <LowStorageCabinet3D {...props} />;
}
