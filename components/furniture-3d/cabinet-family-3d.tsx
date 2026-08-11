"use client";

import type { ReactNode } from "react";
import { resolveCabinetMaterialLayer } from "@/lib/render3d-assets";
import { resolveFurnitureVariant } from "@/lib/furniture-variants";
import { FurnitureMaterial } from "./materials";
import { CabinetInteriorModules3D } from "./cabinet-interior-3d";
import { CylinderPart, RoundedPart } from "./primitives";
import type { FurnitureFamily3DProps } from "./types";

function cabinetLayer(props: FurnitureFamily3DProps, part: "door" | "carcass" | "countertop" | "glass" | "hardware") {
  return resolveCabinetMaterialLayer(props.item, props.asset.materials, part);
}

function cabinetPartData(part: string) {
  return { materialPart: part };
}

function WarmStrip({ width, position }: { width: number; position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[width, 0.018, 0.025]} />
      <meshStandardMaterial color="#ffe4b0" emissive="#ffd386" emissiveIntensity={0.82} roughness={0.18} />
    </mesh>
  );
}

function SlimHangingRail3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const floorY = -height / 2;
  const frontZ = depth / 2 + 0.018;
  return (
    <group name="slim-entry-hanging-panel-no-drawers">
      <RoundedPart size={[width, height, Math.min(depth, 0.08)]} position={[0, 0, -depth * 0.18]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[5, 8]} />
      <RoundedPart size={[width * 0.9, 0.045, depth * 0.82]} position={[0, floorY + 0.18, frontZ]} radius={0.014} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="wood" />
      <RoundedPart size={[width * 0.9, 0.035, depth * 0.72]} position={[0, floorY + height - 0.12, frontZ]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="wood" />
      <CylinderPart radiusTop={0.014} height={width * 0.78} position={[0, floorY + height * 0.72, frontZ + 0.04]} rotation={[0, 0, Math.PI / 2]} material={asset.materials.accent} role="metal" sides={18} />
      {[-0.32, -0.1, 0.12, 0.34].map((ratio) => (
        <group key={ratio} position={[ratio * width, floorY + height * 0.55, frontZ + 0.055]}>
          <CylinderPart radiusTop={0.012} height={0.055} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={asset.materials.accent} role="metal" sides={16} />
          <CylinderPart radiusTop={0.01} height={0.075} position={[0, -0.028, 0.035]} rotation={[0.55, 0, 0]} material={asset.materials.accent} role="metal" sides={14} />
        </group>
      ))}
    </group>
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

function MirroredReferenceBuffetUpper3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const frontZ = depth / 2 + 0.025;
  const backHeight = 0.64;
  const backY = -height / 2 - 0.2;
  const upperHeight = 0.48;
  const upperY = height * 0.12;
  const closedWidth = width * 0.25;
  const openWidth = width - closedWidth;
  return (
    <group name="mirrored-reference-buffet-upper">
      <RoundedPart size={[width, backHeight, 0.035]} position={[0, backY, -depth * 0.36]} radius={0.006} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" color="#8f704f" repeat={[8, 3]} />
      {Array.from({ length: Math.max(18, Math.round(width / 0.09)) }, (_, index) => {
        const count = Math.max(18, Math.round(width / 0.09));
        return <RoundedPart key={`backsplash-flute-${index}`} size={[0.018, backHeight * 0.94, 0.025]} position={[-width * 0.47 + index * width * 0.94 / (count - 1), backY, frontZ - 0.02]} radius={0.003} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" color="#a48663" />;
      })}
      <RoundedPart size={[width + 0.03, 0.045, depth * 0.74]} position={[0, backY + backHeight / 2 + 0.025, -depth * 0.01]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" color="#5a301f" />
      <RoundedPart size={[openWidth, upperHeight, depth]} position={[-closedWidth / 2, upperY, 0]} radius={0.01} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" color="#806247" repeat={[6, 2]} />
      <RoundedPart size={[closedWidth * 0.96, upperHeight * 0.92, 0.045]} position={[width / 2 - closedWidth / 2, upperY, frontZ]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" color="#653620" repeat={[2, 2]} />
      {Array.from({ length: 3 }, (_, index) => {
        const bayWidth = openWidth / 3;
        const x = -width / 2 + bayWidth * (index + 0.5);
        return (
          <group key={`open-bay-${index}`} position={[x, upperY, frontZ]}>
            <RoundedPart size={[bayWidth * 0.94, upperHeight * 0.84, 0.025]} position={[0, 0, -depth * 0.58]} radius={0.004} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" color="#3e2118" />
            {[-0.18, 0, 0.18].map((ratio, jar) => <CylinderPart key={ratio} radiusTop={0.025 + jar * 0.004} radiusBottom={0.029 + jar * 0.004} height={0.1 + jar * 0.025} position={[ratio * bayWidth * 2.1, -upperHeight * 0.27 + jar * 0.01, 0.025]} material={asset.materials.secondary} role="glass" color={jar % 2 ? "#b39a7e" : "#ddd1c2"} opacity={0.78} sides={18} />)}
          </group>
        );
      })}
      {[-width / 2 + openWidth / 3, -width / 2 + openWidth * 2 / 3].map((x) => <RoundedPart key={x} size={[0.035, upperHeight * 0.88, depth * 0.92]} position={[x, upperY, 0]} radius={0.005} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" color="#5d321f" />)}
      <WarmStrip width={width * 0.95} position={[0, upperY - upperHeight / 2 - 0.018, frontZ]} />
    </group>
  );
}

function MirroredReferenceBuffetTower3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const frontZ = depth / 2 + 0.026;
  const nicheHeight = 0.44;
  const nicheY = -height * 0.08;
  return (
    <group name="mirrored-reference-buffet-tower">
      <RoundedPart size={[width, height, depth]} radius={0.014} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="ceramic" color="#e9e7e1" repeat={[3, 7]} />
      {[-0.255, 0.255].map((x) => <RoundedPart key={`tower-door-${x}`} size={[width * 0.485, height * 0.94, 0.042]} position={[x * width, 0, frontZ]} radius={0.009} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="ceramic" color="#efeee9" repeat={[2, 7]} />)}
      <RoundedPart size={[width * 0.48, nicheHeight, 0.055]} position={[width * 0.255, nicheY, frontZ + 0.018]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#171717" roughness={0.2} metalness={0.34} />
      <RoundedPart size={[width * 0.36, nicheHeight * 0.56, 0.025]} position={[width * 0.255, nicheY + 0.025, frontZ + 0.055]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.accent} role="glass" color="#080909" opacity={0.9} />
      <CylinderPart radiusTop={0.04} radiusBottom={0.05} height={0.09} position={[width * 0.255, nicheY - nicheHeight * 0.22, frontZ + 0.085]} material={asset.materials.secondary} role="ceramic" color="#ded8ce" sides={24} />
      <RoundedPart size={[width * 0.16, 0.02, 0.018]} position={[width * 0.255, nicheY + nicheHeight * 0.34, frontZ + 0.078]} radius={0.004} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#a4a19b" />
      <RoundedPart size={[width * 0.88, 0.075, depth * 0.72]} position={[0, -height / 2 + 0.038, -depth * 0.04]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="ceramic" color="#d9d6cf" />
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
  const integratedWardrobe = variant === "integratedTaupeWardrobe";
  const floorY = -height / 2;
  const cabinetVisual = item.render3d?.cabinetVisual;
  const forceGlassDoors = cabinetVisual?.frontStyle === "glass" && cabinetVisual.allDoorPanels !== false;
  const glass = forceGlassDoors || variant === "glassDisplay" || variant === "slimGlassFrame";
  const open = variant === "openClosedMix" || variant === "woodWarmWhite";
  const glassColor = cabinetVisual?.glassTone === "gray"
    ? "#8f989a"
    : cabinetVisual?.glassTone === "smoked"
      ? "#55473f"
      : undefined;
  const configuredBays = cabinetVisual?.bays?.filter((bay) => bay.widthRatio > 0).slice(0, 8) ?? [];
  const fallbackPanelCount = Math.max(3, Math.min(6, Math.round(width / 0.58)));
  const panelCount = configuredBays.length || fallbackPanelCount;
  const gap = 0.006;
  const bayRatios = configuredBays.length
    ? configuredBays.map((bay) => bay.widthRatio)
    : Array.from({ length: panelCount }, () => 1);
  const ratioTotal = Math.max(0.001, bayRatios.reduce((sum, ratio) => sum + ratio, 0));
  const usableBayWidth = Math.max(0.12, width - gap * (panelCount + 1));
  let bayCursor = -width / 2 + gap;
  const bayMetrics = bayRatios.map((ratio, index) => {
    const bayWidth = usableBayWidth * ratio / ratioTotal;
    const result = { x: bayCursor + bayWidth / 2, width: bayWidth, config: configuredBays[index] };
    bayCursor += bayWidth + gap;
    return result;
  });
  const openIndex = Math.min(panelCount - 1, Math.floor(resolved.variation.panelBias * panelCount));
  const carcassThickness = Math.min(0.045, Math.max(0.025, width * 0.018));
  const carcassY = floorY + height * 0.5;
  const carcassMaterial = cabinetLayer(props, "carcass");
  const doorMaterial = cabinetLayer(props, "door");
  const glassMaterial = cabinetLayer(props, "glass");
  const hardwareMaterial = cabinetLayer(props, "hardware");
  const doorRole = doorMaterial.role;
  return (
    <group name="realistic-built-in-tall-cabinet">
      <RoundedPart name={`${item.id}-cabinet-body-back`} userData={cabinetPartData("cabinet-body")} size={[width - carcassThickness * 2, height * 0.91, carcassThickness]} position={[0, carcassY, -depth * 0.46]} radius={0.008} detailLevel={asset.detailLevel} material={carcassMaterial} role={carcassMaterial.role} repeat={[Math.max(3, panelCount), 6]} />
      {[-1, 1].map((side) => (
        <RoundedPart key={side} name={`${item.id}-cabinet-body-side-${side}`} userData={cabinetPartData("cabinet-body")} size={[carcassThickness, height * 0.96, depth * 0.92]} position={[side * (width / 2 - carcassThickness / 2), carcassY, 0]} radius={0.009} detailLevel={asset.detailLevel} material={carcassMaterial} role={carcassMaterial.role} repeat={[1, 6]} />
      ))}
      {[-1, 1].map((side) => (
        <RoundedPart key={side} name={`${item.id}-cabinet-body-cap-${side}`} userData={cabinetPartData("cabinet-body")} size={[width, carcassThickness, depth * 0.92]} position={[0, carcassY + side * (height * 0.48 - carcassThickness / 2), 0]} radius={0.009} detailLevel={asset.detailLevel} material={carcassMaterial} role={carcassMaterial.role} repeat={[Math.max(3, panelCount), 1]} />
      ))}
      <RoundedPart name={`${item.id}-cabinet-door-top`} userData={cabinetPartData("cabinet-door")} size={[width * 0.995, Math.min(0.075, height * 0.035), depth * 0.96]} position={[0, floorY + height - Math.min(0.075, height * 0.035) / 2, 0]} radius={0.006} detailLevel={asset.detailLevel} material={doorMaterial} role={doorRole} repeat={[Math.max(3, panelCount), 1]} />
      {[-1, 1].map((side) => {
        const scribeWidth = Math.max(0.012, Math.min(0.09, (cabinetVisual?.sideScribeMm ?? Math.min(55, width * 25)) / 1000));
        return <RoundedPart key={`scribe-${side}`} name={`${item.id}-cabinet-door-scribe-${side}`} userData={cabinetPartData("cabinet-door")} size={[scribeWidth, height * 0.94, depth * 0.98]} position={[side * (width / 2 - scribeWidth / 2), floorY + height * 0.5, 0]} radius={0.005} detailLevel={asset.detailLevel} material={doorMaterial} role={doorRole} repeat={[1, 7]} />;
      })}
      {bayMetrics.slice(0, -1).map((bay, index) => (
        <RoundedPart key={index} name={`${item.id}-cabinet-body-divider-${index}`} userData={cabinetPartData("cabinet-body")} size={[0.018, height * 0.89, depth * 0.76]} position={[bay.x + bay.width / 2 + gap / 2, carcassY, -depth * 0.05]} radius={0.005} detailLevel={asset.detailLevel} material={carcassMaterial} role={carcassMaterial.role} />
      ))}
      <RoundedPart
        size={[width * (integratedWardrobe ? 0.94 : 0.9), integratedWardrobe ? 0.065 : 0.09, Math.max(0.12, depth - (cabinetVisual?.plinthSetbackMm ?? (integratedWardrobe ? 110 : 80)) / 1000)]}
        position={[0, floorY + 0.045, -Math.max(0.04, (cabinetVisual?.plinthSetbackMm ?? 80) / 2000)]}
        radius={0.009}
        detailLevel={asset.detailLevel}
        material={carcassMaterial}
        role={carcassMaterial.role}
        color="#75614d"
      />
      {runtimeOpenAmount > 0.01 && <RoundedPart size={[width * 0.94, height * 0.88, 0.024]} position={[0, carcassY, depth * 0.455]} radius={0.006} detailLevel={asset.detailLevel} material={asset.materials.accent} role="wood" color="#3d342c" />}
      {sliding && [-1, 1].map((side) => <RoundedPart key={`track-${side}`} name={`${item.id}-cabinet-hardware-track-${side}`} userData={cabinetPartData("cabinet-hardware")} size={[width * 0.94, 0.018, 0.045]} position={[0, floorY + height * (side > 0 ? 0.945 : 0.055), depth * 0.47]} radius={0.004} detailLevel={asset.detailLevel} material={hardwareMaterial} role="metal" />)}
      {bayMetrics.map((bay, index) => {
        const { x, width: panelWidth } = bay;
        const requestedFront = bay.config?.frontType;
        const openBay = requestedFront === "open" || (!requestedFront && !forceGlassDoors && open && index === openIndex);
        const glassBay = requestedFront === "glass" || (!requestedFront && (forceGlassDoors || (glass && (index === openIndex || (panelCount > 4 && index === openIndex - 1)))));
        const drawerBay = requestedFront === "drawer";
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
        if (drawerBay) {
          const drawerCount = Math.max(2, Math.min(6, Math.round(bay.config?.shelfCount ?? 4)));
          return (
            <group key={index} position={[x, floorY + height * 0.5, depth * 0.495]}>
              {Array.from({ length: drawerCount }, (_, drawerIndex) => {
                const drawerHeight = height * 0.88 / drawerCount;
                return (
                  <group key={`${index}-drawer-${drawerIndex}`} position={[0, -height * 0.44 + drawerHeight * (drawerIndex + 0.5), 0]}>
                    <RoundedPart name={`${item.id}-cabinet-door-drawer-${index}-${drawerIndex}`} userData={cabinetPartData("cabinet-door")} size={[panelWidth, drawerHeight - gap, 0.045]} radius={0.008} detailLevel={asset.detailLevel} material={doorMaterial} role={doorRole} repeat={[2, 2]} />
                    <RoundedPart name={`${item.id}-cabinet-hardware-drawer-${index}-${drawerIndex}`} userData={cabinetPartData("cabinet-hardware")} size={[panelWidth * 0.42, 0.012, 0.018]} position={[0, drawerHeight * 0.16, 0.035]} radius={0.004} detailLevel={asset.detailLevel} material={hardwareMaterial} role="metal" />
                  </group>
                );
              })}
            </group>
          );
        }
        const panel = <>
            <RoundedPart name={`${item.id}-${glassBay ? "cabinet-glass" : "cabinet-door"}-${index}`} userData={cabinetPartData(glassBay ? "cabinet-glass" : "cabinet-door")} size={[panelWidth, height * 0.91, 0.045]} radius={0.008} detailLevel={asset.detailLevel} material={glassBay ? glassMaterial : doorMaterial} role={glassBay ? "glass" : doorRole} color={glassBay ? glassColor : undefined} opacity={glassBay ? 0.3 : undefined} repeat={[2, 6]} />
            {glassBay && (
              <group>
                {[-1, 1].map((side) => <RoundedPart key={side} name={`${item.id}-cabinet-hardware-glass-frame-${side}`} userData={cabinetPartData("cabinet-hardware")} size={[0.025, height * 0.89, 0.055]} position={[side * panelWidth * 0.47, 0, 0.018]} radius={0.006} detailLevel={asset.detailLevel} material={hardwareMaterial} role="metal" />)}
                {[-1, 1].map((side) => <RoundedPart key={side} name={`${item.id}-cabinet-hardware-glass-frame-${side}`} userData={cabinetPartData("cabinet-hardware")} size={[panelWidth * 0.94, 0.025, 0.055]} position={[0, side * height * 0.445, 0.018]} radius={0.006} detailLevel={asset.detailLevel} material={hardwareMaterial} role="metal" />)}
              </group>
            )}
            {!glassBay && variant !== "fullHeightFlat" && !integratedWardrobe && !sliding && <RoundedPart name={`${item.id}-cabinet-hardware-handle-${index}`} userData={cabinetPartData("cabinet-hardware")} size={[0.012, Math.min(0.18, height * 0.1), 0.018]} position={[panelWidth * 0.37 * (index % 2 ? -1 : 1), 0, 0.035]} radius={0.004} detailLevel={asset.detailLevel} material={hardwareMaterial} role="metal" />}
            {!glassBay && integratedWardrobe && <RoundedPart name={`${item.id}-cabinet-hardware-recess-${index}`} userData={cabinetPartData("cabinet-hardware")} size={[0.009, height * 0.72, 0.012]} position={[panelWidth * 0.465 * (index % 2 ? -1 : 1), 0, 0.034]} radius={0.003} detailLevel={asset.detailLevel} material={hardwareMaterial} role="metal" color="#8d8175" opacity={0.32} />}
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

function BoutiquePortalArmoire3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height, item } = props;
  const runtimeOpenAmount = Math.max(0, Math.min(1, props.openAmount ?? 0));
  const floorY = -height / 2;
  const carcassMaterial = cabinetLayer(props, "carcass");
  const doorMaterial = cabinetLayer(props, "door");
  const hardwareMaterial = cabinetLayer(props, "hardware");
  const valetCabinet = item.render3d?.variantId === "boutiqueValetCabinet";
  const frontZ = depth * 0.505;
  const frame = Math.min(0.055, width * 0.075);
  const innerWidth = width - frame * 2 - 0.018;
  const panelWidth = innerWidth / 2;
  const doorHeight = height * 0.84;
  const doorY = floorY + height * 0.51;
  return (
    <group name="boutique-hotel-portal-armoire">
      <RoundedPart name={`${item.id}-cabinet-body`} userData={cabinetPartData("cabinet-body")} size={[width, height * 0.94, depth]} position={[0, floorY + height * 0.5, 0]} radius={0.032} detailLevel={asset.detailLevel} material={carcassMaterial} role="wood" repeat={[3, 7]} />
      <RoundedPart name={`${item.id}-portal-top`} userData={cabinetPartData("cabinet-body")} size={[width, frame * 1.15, depth * 1.035]} position={[0, floorY + height * 0.94 - frame * 0.55, 0]} radius={0.026} detailLevel={asset.detailLevel} material={carcassMaterial} role="wood" repeat={[4, 1]} />
      {[-1, 1].map((side) => (
        <RoundedPart key={`portal-side-${side}`} name={`${item.id}-portal-side-${side}`} userData={cabinetPartData("cabinet-body")} size={[frame, height * 0.88, depth * 1.035]} position={[side * (width / 2 - frame / 2), floorY + height * 0.49, 0]} radius={0.024} detailLevel={asset.detailLevel} material={carcassMaterial} role="wood" repeat={[1, 7]} />
      ))}
      {[-1, 1].map((side, index) => {
        const x = side * panelWidth / 2;
        const panel = (
          <group>
            <RoundedPart name={`${item.id}-cabinet-door-${index}`} userData={cabinetPartData("cabinet-door")} size={[panelWidth - 0.008, doorHeight, 0.05]} radius={0.022} detailLevel={asset.detailLevel} material={doorMaterial} role="fabric" repeat={[3, 8]} />
            <RoundedPart size={[panelWidth * 0.84, doorHeight * 0.93, 0.012]} position={[0, 0, 0.033]} radius={0.018} detailLevel={asset.detailLevel} material={doorMaterial} role="fabric" opacity={0.72} />
            {valetCabinet && Array.from({ length: 7 }, (_, ribIndex) => (
              <RoundedPart key={`valet-rib-${ribIndex}`} size={[0.006, doorHeight * 0.9, 0.009]} position={[(ribIndex - 3) * panelWidth * 0.105, 0, 0.044]} radius={0.003} detailLevel={asset.detailLevel} material={doorMaterial} role="fabric" opacity={0.42} />
            ))}
            <RoundedPart name={`${item.id}-cabinet-hardware-handle-${index}`} userData={cabinetPartData("cabinet-hardware")} size={[0.014, doorHeight * 0.68, 0.022]} position={[-side * panelWidth * 0.39, 0, 0.048]} radius={0.006} detailLevel={asset.detailLevel} material={hardwareMaterial} role="metal" />
          </group>
        );
        return (
          <AnimatedCabinetLeaf key={`boutique-door-${side}`} position={[x, doorY, frontZ]} width={panelWidth} hingeSide={side < 0 ? -1 : 1} openAmount={runtimeOpenAmount}>
            {panel}
          </AnimatedCabinetLeaf>
        );
      })}
      <RoundedPart size={[width * 0.82, 0.075, depth * 0.68]} position={[0, floorY + 0.038, -depth * 0.08]} radius={0.014} detailLevel={asset.detailLevel} material={hardwareMaterial} role="metal" color="#342b25" />
      <WarmStrip width={width * 0.72} position={[0, floorY + height * 0.9, frontZ + 0.038]} />
    </group>
  );
}

function BoutiqueOpenValetRack3D(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height, item } = props;
  const floorY = -height / 2;
  const carcassMaterial = cabinetLayer(props, "carcass");
  const doorMaterial = cabinetLayer(props, "door");
  const hardwareMaterial = cabinetLayer(props, "hardware");
  const frame = Math.min(0.052, width * 0.075);
  const frontZ = depth * 0.5;
  const drawerHeight = height * 0.28;
  const drawerY = floorY + 0.09 + drawerHeight / 2;
  const openCenterY = floorY + height * 0.58;
  return (
    <group name="boutique-open-valet-rack">
      <RoundedPart name={`${item.id}-valet-back`} userData={cabinetPartData("cabinet-body")} size={[width, height * 0.94, 0.032]} position={[0, floorY + height * 0.5, -depth * 0.46]} radius={0.026} detailLevel={asset.detailLevel} material={carcassMaterial} role="wood" repeat={[4, 8]} />
      {[-1, 1].map((side) => (
        <RoundedPart key={`valet-side-${side}`} name={`${item.id}-valet-side-${side}`} userData={cabinetPartData("cabinet-body")} size={[frame, height * 0.94, depth]} position={[side * (width / 2 - frame / 2), floorY + height * 0.5, 0]} radius={0.024} detailLevel={asset.detailLevel} material={carcassMaterial} role="wood" repeat={[1, 7]} />
      ))}
      <RoundedPart name={`${item.id}-valet-top`} userData={cabinetPartData("cabinet-body")} size={[width, frame, depth]} position={[0, floorY + height * 0.94, 0]} radius={0.022} detailLevel={asset.detailLevel} material={carcassMaterial} role="wood" repeat={[4, 1]} />
      <RoundedPart name={`${item.id}-valet-upper-shelf`} userData={cabinetPartData("cabinet-body")} size={[width - frame * 1.2, 0.038, depth * 0.9]} position={[0, floorY + height * 0.78, -depth * 0.02]} radius={0.012} detailLevel={asset.detailLevel} material={carcassMaterial} role="wood" repeat={[4, 1]} />
      <RoundedPart size={[width - frame * 1.5, drawerHeight, depth * 0.9]} position={[0, drawerY, -depth * 0.02]} radius={0.024} detailLevel={asset.detailLevel} material={carcassMaterial} role="wood" repeat={[4, 2]} />
      {[-0.21, 0.21].map((ratio, index) => (
        <group key={`valet-drawer-${index}`} position={[0, drawerY + ratio * drawerHeight, frontZ + 0.015]}>
          <RoundedPart name={`${item.id}-valet-drawer-front-${index}`} userData={cabinetPartData("cabinet-door")} size={[width - frame * 1.8, drawerHeight * 0.42, 0.04]} radius={0.014} detailLevel={asset.detailLevel} material={doorMaterial} role="fabric" repeat={[3, 1]} />
          <RoundedPart size={[width * 0.2, 0.012, 0.018]} position={[0, drawerHeight * 0.08, 0.03]} radius={0.004} detailLevel={asset.detailLevel} material={hardwareMaterial} role="metal" />
        </group>
      ))}
      <CylinderPart radiusTop={0.012} height={depth * 0.72} position={[0, openCenterY + height * 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={hardwareMaterial} role="metal" sides={18} />
      {[-0.18, 0.04, 0.24].map((ratio, index) => (
        <RoundedPart key={`valet-garment-${index}`} size={[width * (0.62 - index * 0.05), height * (0.25 + index * 0.015), 0.04]} position={[ratio * width, openCenterY - height * 0.02, frontZ + 0.025 - index * 0.018]} radius={0.035} detailLevel={asset.detailLevel} material={doorMaterial} role="fabric" color={index === 1 ? "#9f8b78" : undefined} opacity={0.94} />
      ))}
      <WarmStrip width={width * 0.74} position={[0, floorY + height * 0.76, frontZ + 0.025]} />
      <RoundedPart size={[width * 0.82, 0.075, depth * 0.66]} position={[0, floorY + 0.038, -depth * 0.08]} radius={0.014} detailLevel={asset.detailLevel} material={hardwareMaterial} role="metal" color="#342b25" />
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
  const content = variant === "slimHangingRail"
    ? <SlimHangingRail3D {...props} />
    : variant === "boutiqueOpenValetRack"
      ? <BoutiqueOpenValetRack3D {...props} />
    : variant === "boutiquePortalArmoire" || variant === "boutiqueValetCabinet"
      ? <BoutiquePortalArmoire3D {...props} />
    : variant === "archedBuffet"
    ? <ArchedBuffetCabinet3D {...props} />
    : variant === "archedBuffetUpper"
      ? <ArchedUpperCabinet3D {...props} />
      : variant === "mirroredReferenceBuffetUpper"
        ? <MirroredReferenceBuffetUpper3D {...props} />
        : variant === "mirroredReferenceBuffetTower"
          ? <MirroredReferenceBuffetTower3D {...props} />
          : variant === "doubleDoorPulloutPantry"
            ? <DoubleDoorPulloutPantry3D {...props} />
            : props.item.render3d?.cabinetVisual?.layout === "squareGrid"
              ? <SquareGridDisplayCabinet3D {...props} />
              : type === "wardrobe" || type === "walkInCloset" || props.height > 1.45
                ? <TallCabinet3D {...props} />
                : type === "island" || type === "kitchenCabinet"
                  ? <IslandCabinet3D {...props} />
                  : type === "bathroomVanity"
                    ? <BathroomVanity3D {...props} />
                    : <LowStorageCabinet3D {...props} />;
  return <group>{content}<CabinetInteriorModules3D props={props} openAmount={props.openAmount} /></group>;
}
