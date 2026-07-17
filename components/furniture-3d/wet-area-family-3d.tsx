"use client";

import * as THREE from "three";
import type { ResolvedRender3DMaterialLayer, Render3DMaterialRole } from "@/lib/render3d-assets";
import type { WetAreaVisualConfig } from "@/types/space";
import { FurnitureMaterial } from "./materials";
import { CylinderPart, RoundedPart, SpherePart } from "./primitives";
import type { FurnitureFamily3DProps } from "./types";

function layerFor(props: FurnitureFamily3DProps, roles: Render3DMaterialRole[], fallback: ResolvedRender3DMaterialLayer) {
  const { primary, secondary, accent } = props.asset.materials;
  return [primary, secondary, accent].find((layer) => roles.includes(layer.role)) ?? fallback;
}

function wetConfig(props: FurnitureFamily3DProps): WetAreaVisualConfig {
  return props.item.render3d?.wetAreaVisual ?? {};
}

function MetalBar({
  material,
  position,
  length,
  axis = "x",
  color
}: {
  material: ResolvedRender3DMaterialLayer;
  position: [number, number, number];
  length: number;
  axis?: "x" | "y" | "z";
  color?: string;
}) {
  const rotation: [number, number, number] = axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return <CylinderPart radiusTop={0.012} height={length} position={position} rotation={rotation} material={material} role="metal" color={color} sides={14} />;
}

function Basin({
  props,
  x,
  y,
  width,
  depth
}: {
  props: FurnitureFamily3DProps;
  x: number;
  y: number;
  width: number;
  depth: number;
}) {
  const ceramic = layerFor(props, ["ceramic"], props.asset.materials.secondary);
  const metal = layerFor(props, ["metal"], props.asset.materials.accent);
  const radius = Math.min(width, depth) * 0.31;
  return (
    <group position={[x, y, 0]} name="countertop-basin">
      <SpherePart radius={radius} position={[0, -0.02, 0]} scale={[1.28, 0.34, 0.88]} segments={32} material={ceramic} role="ceramic" color="#f5f1e9" roughness={0.2} />
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.72, 0.014, 12, 36]} />
        <FurnitureMaterial layer={ceramic} role="ceramic" color="#fffaf3" roughness={0.18} />
      </mesh>
      <CylinderPart radiusTop={0.019} height={0.23} position={[radius * 0.72, 0.12, -depth * 0.3]} material={metal} role="metal" sides={16} />
      <MetalBar material={metal} position={[radius * 0.43, 0.225, -depth * 0.3]} length={radius * 0.62} axis="x" />
      <CylinderPart radiusTop={0.026} height={0.012} position={[0, -radius * 0.12, 0]} material={metal} role="metal" color="#777b79" sides={20} />
    </group>
  );
}

export function ParametricBathroomVanity(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const config = wetConfig(props);
  const wood = layerFor(props, ["wood"], asset.materials.primary);
  const stone = layerFor(props, ["stone", "ceramic"], asset.materials.secondary);
  const metal = layerFor(props, ["metal"], asset.materials.accent);
  const glass = layerFor(props, ["glass"], asset.materials.secondary);
  const floating = config.floating ?? true;
  const floorY = -height / 2;
  const lift = floating ? Math.min(0.28, height * 0.25) : 0.08;
  const topThickness = Math.min(0.065, Math.max(0.035, height * 0.065));
  const bodyHeight = Math.max(0.32, height - lift - topThickness - 0.08);
  const bodyY = floorY + lift + bodyHeight / 2;
  const topY = floorY + lift + bodyHeight + topThickness / 2;
  const bayCount = Math.max(2, Math.min(4, Math.round(width / 0.5)));
  const bayWidth = width / bayCount;
  const basinCount = config.basinCount ?? (width >= 1.25 ? 2 : 1);
  const mirrorStyle = config.mirrorStyle ?? (width < 1 ? "round" : "roundedRect");
  const frontZ = depth / 2 + 0.025;
  return (
    <group name="parametric-bathroom-vanity">
      <RoundedPart size={[width, bodyHeight, depth * 0.9]} position={[0, bodyY, -depth * 0.02]} radius={0.026} detailLevel={asset.detailLevel} material={wood} role="wood" repeat={[Math.max(2, bayCount), 2]} />
      {Array.from({ length: bayCount }, (_, index) => {
        const x = -width / 2 + bayWidth * (index + 0.5);
        return (
          <group key={index} position={[x, bodyY, frontZ]}>
            <RoundedPart size={[bayWidth - 0.016, bodyHeight * 0.9, 0.042]} radius={0.011} detailLevel={asset.detailLevel} material={index % 2 ? asset.materials.secondary : wood} role={index % 2 ? "ceramic" : "wood"} />
            <RoundedPart size={[bayWidth * 0.46, 0.012, 0.016]} position={[0, bodyHeight * 0.32, 0.03]} radius={0.004} detailLevel={asset.detailLevel} material={metal} role="metal" />
            <RoundedPart size={[bayWidth * 0.84, 0.012, 0.012]} position={[0, -bodyHeight * 0.02, 0.034]} radius={0.003} detailLevel={asset.detailLevel} material={metal} role="metal" color="#3d3630" />
          </group>
        );
      })}
      <RoundedPart size={[width + 0.06, topThickness, depth + 0.035]} position={[0, topY, 0.005]} radius={0.018} detailLevel={asset.detailLevel} material={stone} role="stone" repeat={[Math.max(3, width * 2), 2]} roughness={0.3} />
      {Array.from({ length: basinCount }, (_, index) => (
        <Basin key={index} props={props} x={basinCount === 1 ? 0 : (index ? 0.25 : -0.25) * width} y={topY + topThickness * 0.65} width={width / basinCount} depth={depth} />
      ))}
      {floating && (
        <>
          <RoundedPart size={[width * 0.84, 0.016, 0.024]} position={[0, floorY + lift - 0.012, depth * 0.4]} radius={0.004} detailLevel={asset.detailLevel} material={asset.materials.accent} role="light" color="#ffe0a3" emissiveIntensity={0.7} />
          <MetalBar material={metal} position={[0, floorY + lift + bodyHeight * 0.48, -depth * 0.49]} length={width * 0.7} axis="x" />
        </>
      )}
      <group position={[0, height * 0.72, frontZ + 0.045]}>
        {mirrorStyle === "round" ? (
          <>
            <CylinderPart radiusTop={Math.min(0.38, width * 0.4)} height={0.028} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={metal} role="metal" sides={48} />
            <CylinderPart radiusTop={Math.min(0.35, width * 0.37)} height={0.03} position={[0, 0, 0.018]} rotation={[Math.PI / 2, 0, 0]} material={glass} role="glass" color="#aeb8b5" opacity={0.72} sides={48} />
          </>
        ) : (
          <>
            <RoundedPart size={[width * 0.9, Math.min(0.62, height * 0.7), 0.04]} radius={0.035} detailLevel={asset.detailLevel} material={metal} role="metal" />
            <RoundedPart size={[width * 0.86, Math.min(0.58, height * 0.66), 0.022]} position={[0, 0, 0.026]} radius={0.03} detailLevel={asset.detailLevel} material={glass} role="glass" color="#aeb8b5" opacity={0.72} />
          </>
        )}
        <RoundedPart size={[width * 0.78, 0.022, 0.026]} position={[0, Math.min(0.36, height * 0.41), 0.045]} radius={0.006} detailLevel={asset.detailLevel} material={asset.materials.accent} role="light" color="#ffe4ad" emissiveIntensity={0.82} />
      </group>
    </group>
  );
}

export function ParametricToilet(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const config = wetConfig(props);
  const ceramic = layerFor(props, ["ceramic"], asset.materials.primary);
  const metal = layerFor(props, ["metal"], asset.materials.secondary);
  const smart = (config.toiletType ?? "smart") === "smart";
  const radius = Math.min(width, depth) * 0.29;
  return (
    <group name="parametric-toilet">
      <RoundedPart size={[width * 0.58, height * 0.34, depth * 0.52]} position={[0, -height * 0.31, depth * 0.08]} radius={0.075} detailLevel={asset.detailLevel} material={ceramic} role="ceramic" color="#f8f4ed" roughness={0.22} />
      <SpherePart radius={radius} position={[0, -height * 0.08, depth * 0.05]} scale={[1.12, 0.36, 1.34]} segments={34} material={ceramic} role="ceramic" color="#fbf8f2" roughness={0.2} />
      <mesh position={[0, height * 0.02, depth * 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.65, 0.026, 14, 42]} />
        <FurnitureMaterial layer={ceramic} role="ceramic" color="#f4eee6" roughness={0.22} />
      </mesh>
      <RoundedPart size={[width * 0.62, 0.052, depth * 0.54]} position={[0, height * 0.08, depth * 0.025]} radius={0.05} detailLevel={asset.detailLevel} material={ceramic} role="ceramic" color="#f7f2ea" roughness={0.25} />
      <RoundedPart size={[width * 0.76, height * 0.4, depth * 0.17]} position={[0, height * 0.25, -depth * 0.38]} radius={0.04} detailLevel={asset.detailLevel} material={ceramic} role="ceramic" color="#f8f4ed" roughness={0.24} />
      <RoundedPart size={[width * 0.26, 0.018, 0.018]} position={[width * 0.18, height * 0.45, -depth * 0.47]} radius={0.005} detailLevel={asset.detailLevel} material={metal} role="metal" />
      {smart && (
        <group position={[width * 0.38, -height * 0.04, -depth * 0.12]} rotation={[0, -0.18, 0]}>
          <RoundedPart size={[0.1, 0.055, 0.22]} radius={0.022} detailLevel={asset.detailLevel} material={metal} role="metal" color="#5d5d59" />
          {[-0.055, 0, 0.055].map((z) => <CylinderPart key={z} radiusTop={0.01} height={0.01} position={[0, 0.035, z]} material={metal} role="light" color="#d8b36d" emissiveIntensity={0.5} sides={12} />)}
        </group>
      )}
    </group>
  );
}

export function ParametricShower(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const config = wetConfig(props);
  const glass = layerFor(props, ["glass"], asset.materials.primary);
  const metal = layerFor(props, ["metal"], asset.materials.secondary);
  const stone = layerFor(props, ["stone", "ceramic"], asset.materials.accent);
  const frameColor = config.frameFinish === "bronze" ? "#8b6f47" : config.frameFinish === "minimal" ? "#a7a39b" : "#25282a";
  const frontZ = depth / 2;
  return (
    <group name="parametric-shower">
      <RoundedPart size={[width * 0.96, 0.055, depth * 0.96]} position={[0, -height / 2 + 0.028, 0]} radius={0.025} detailLevel={asset.detailLevel} material={stone} role="stone" color="#aaa39a" roughness={0.7} />
      <RoundedPart size={[width * 0.94, 0.045, 0.055]} position={[0, -height / 2 + 0.055, frontZ * 0.91]} radius={0.012} detailLevel={asset.detailLevel} material={stone} role="stone" color="#d6c9b7" />
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <RoundedPart key={`${x}-${z}`} size={[0.025, height * 0.92, 0.025]} position={[x * width * 0.47, 0, z * depth * 0.47]} radius={0.005} detailLevel={asset.detailLevel} material={metal} role="metal" color={frameColor} />))}
      <RoundedPart size={[width * 0.86, height * 0.82, 0.018]} position={[0, height * 0.04, frontZ * 0.96]} radius={0.006} detailLevel={asset.detailLevel} material={glass} role="glass" color="#b8d7dd" opacity={0.22} castShadow={false} />
      {[-1, 1].map((side) => <RoundedPart key={side} size={[0.018, height * 0.78, depth * 0.84]} position={[side * width * 0.47, height * 0.04, 0]} radius={0.006} detailLevel={asset.detailLevel} material={glass} role="glass" color="#b8d7dd" opacity={0.16} castShadow={false} />)}
      <MetalBar material={metal} position={[width * 0.25, height * 0.02, frontZ + 0.025]} length={height * 0.42} axis="y" color={frameColor} />
      <MetalBar material={metal} position={[width * 0.24, height * 0.1, -depth * 0.39]} length={height * 0.62} axis="y" />
      <CylinderPart radiusTop={0.11} height={0.025} position={[width * 0.24, height * 0.43, -depth * 0.33]} rotation={[Math.PI / 2, 0, 0]} material={metal} role="metal" sides={30} />
      <CylinderPart radiusTop={0.035} height={0.16} position={[width * 0.12, -height * 0.05, -depth * 0.37]} material={metal} role="metal" sides={18} />
      {config.showNiche !== false && (
        <group position={[-width * 0.25, height * 0.06, -depth * 0.44]}>
          <RoundedPart size={[Math.min(0.36, width * 0.36), 0.2, 0.04]} radius={0.012} detailLevel={asset.detailLevel} material={stone} role="stone" color="#6e655b" />
          <RoundedPart size={[Math.min(0.31, width * 0.31), 0.018, 0.024]} position={[0, 0.08, 0.03]} radius={0.005} detailLevel={asset.detailLevel} material={asset.materials.accent} role="light" color="#ffe2a5" emissiveIntensity={0.65} />
          {[-0.07, 0.07].map((x) => <CylinderPart key={x} radiusTop={0.025} radiusBottom={0.03} height={0.09} position={[x, -0.03, 0.04]} material={stone} role="ceramic" color="#d8c8b5" sides={16} />)}
        </group>
      )}
      {config.showLinearDrain !== false && <RoundedPart size={[width * 0.44, 0.012, 0.055]} position={[0, -height / 2 + 0.064, depth * 0.24]} radius={0.005} detailLevel={asset.detailLevel} material={metal} role="metal" color="#555a59" />}
    </group>
  );
}

export function ParametricBathtub(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const ceramic = layerFor(props, ["ceramic"], asset.materials.primary);
  const metal = layerFor(props, ["metal"], asset.materials.secondary);
  const water = layerFor(props, ["glass"], asset.materials.accent);
  const builtIn = wetConfig(props).bathtubType === "builtIn";
  return (
    <group name="parametric-bathtub">
      <RoundedPart size={[width * 0.96, height * 0.76, depth * 0.92]} position={[0, -height * 0.06, 0]} radius={builtIn ? 0.07 : Math.min(width, depth) * 0.18} detailLevel={asset.detailLevel} material={ceramic} role="ceramic" color="#fbf8f1" roughness={0.2} />
      <RoundedPart size={[width * 0.72, height * 0.18, depth * 0.62]} position={[0, height * 0.18, 0]} radius={Math.min(width, depth) * 0.13} detailLevel={asset.detailLevel} material={water} role="glass" color="#cce6ea" opacity={0.52} roughness={0.1} castShadow={false} />
      {[-1, 1].map((side) => <MetalBar key={side} material={ceramic} position={[side * width * 0.39, height * 0.24, 0]} length={depth * 0.65} axis="z" color="#fffaf4" />)}
      <MetalBar material={metal} position={[width * 0.32, height * 0.38, -depth * 0.25]} length={0.25} axis="y" />
      <MetalBar material={metal} position={[width * 0.24, height * 0.5, -depth * 0.25]} length={0.18} axis="x" />
      <CylinderPart radiusTop={0.032} height={0.012} position={[width * 0.2, height * 0.08, depth * 0.28]} material={metal} role="metal" color="#606463" sides={20} />
      <CylinderPart radiusTop={0.024} height={0.012} position={[0, height * 0.17, depth * 0.29]} rotation={[Math.PI / 2, 0, 0]} material={metal} role="metal" sides={18} />
    </group>
  );
}

export function WetAreaFamily3D(props: FurnitureFamily3DProps) {
  const type = props.asset.assetType;
  if (type === "bathroomVanity") return <ParametricBathroomVanity {...props} />;
  if (type === "toilet") return <ParametricToilet {...props} />;
  if (type === "shower") return <ParametricShower {...props} />;
  return <ParametricBathtub {...props} />;
}
