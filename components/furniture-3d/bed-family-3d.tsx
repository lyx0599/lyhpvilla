"use client";

import { resolveFurnitureVariant } from "@/lib/furniture-variants";
import { CylinderPart, RoundedPart } from "./primitives";
import type { FurnitureFamily3DProps } from "./types";

function UpholsteredHeadboard({ width, height, depth, tall, props }: { width: number; height: number; depth: number; tall: boolean; props: FurnitureFamily3DProps }) {
  const { asset } = props;
  const panels = tall ? 6 : 3;
  const panelGap = 0.025;
  const panelWidth = (width * (tall ? 1.08 : 1.01) - panelGap * (panels - 1)) / panels;
  return (
    <group position={[0, -props.height / 2 + height / 2 + 0.025, -depth * 0.47]}>
      {Array.from({ length: panels }, (_, index) => (
        <RoundedPart
          key={index}
          size={[panelWidth, height, tall ? 0.17 : 0.14]}
          position={[(index - (panels - 1) / 2) * (panelWidth + panelGap), 0, 0]}
          radius={tall ? 0.045 : 0.07}
          detailLevel={asset.detailLevel}
          material={asset.materials.primary}
          role="fabric"
          repeat={[1.4, 2.4]}
        />
      ))}
    </group>
  );
}
function TimberHeadboard({ width, height, depth, props }: { width: number; height: number; depth: number; props: FurnitureFamily3DProps }) {
  const { asset } = props;
  return (
    <group position={[0, -props.height / 2, -depth * 0.47]}>
      <RoundedPart size={[width, 0.095, 0.09]} position={[0, height, 0]} radius={0.02} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[5, 1]} />
      {[-0.46, -0.23, 0, 0.23, 0.46].map((ratio) => (
        <RoundedPart key={ratio} size={[0.055, height * 0.9, 0.08]} position={[ratio * width, height * 0.48, 0]} radius={0.016} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[1, 4]} />
      ))}
    </group>
  );
}

export function BedFamily3D(props: FurnitureFamily3DProps) {
  const { item, asset, width, depth, height } = props;
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const variant = resolved.variant.id;
  const floorY = -height / 2;
  const timber = variant === "timberFrame" || variant === "guestBed" || variant === "childBed";
  const floating = variant === "floatingPlatform";
  const noHeadboard = variant === "minimalNoHeadboard";
  const tall = variant === "tallPanelHeadboard";
  const low = variant === "lowUpholstered";
  const child = variant === "childBed";
  const frameHeight = child ? 0.16 : floating ? 0.11 : timber ? 0.18 : 0.24;
  const frameY = floorY + (floating ? 0.2 : 0.1) + frameHeight / 2;
  const mattressHeight = child ? 0.15 : 0.2;
  const mattressY = frameY + frameHeight / 2 + mattressHeight / 2 - 0.015;
  const headboardHeight = tall ? Math.max(0.9, height * 0.98) : low ? Math.max(0.5, height * 0.58) : Math.max(0.62, height * 0.72);

  return (
    <group>
      {floating && <RoundedPart size={[width * 0.64, 0.18, depth * 0.55]} position={[0, floorY + 0.09, 0.04]} radius={0.035} detailLevel={asset.detailLevel} material={asset.materials.accent} role="wood" color="#5a5148" />}
      <RoundedPart
        size={[width * (floating ? 1.08 : 0.99), frameHeight, depth * (floating ? 0.94 : 0.91)]}
        position={[0, frameY, 0.03]}
        radius={timber ? 0.025 : 0.075}
        detailLevel={asset.detailLevel}
        material={timber || floating ? asset.materials.primary : asset.materials.accent}
        role={timber || floating ? "wood" : "fabric"}
        repeat={[4, 4]}
      />
      <RoundedPart size={[width * 0.94, mattressHeight, depth * 0.8]} position={[0, mattressY, 0.015]} radius={0.085} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="fabric" color="#f5efe6" repeat={[5, 5]} />
      <RoundedPart size={[width * 0.91, 0.018, depth * 0.77]} position={[0, mattressY + mattressHeight / 2 + 0.008, 0.015]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.accent} role="fabric" color="#e4ddd3" repeat={[6, 6]} />
      <RoundedPart size={[width * 0.94, 0.026, depth * 0.025]} position={[0, mattressY + mattressHeight * 0.12, depth * 0.405]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.accent} role="fabric" color="#d7cfc4" />
      {[-1, 1].map((side) => (
        <RoundedPart key={side} size={[0.022, frameHeight * 0.64, depth * 0.78]} position={[side * width * 0.475, frameY, depth * 0.03]} radius={0.007} detailLevel={asset.detailLevel} material={asset.materials.accent} role={timber || floating ? "wood" : "fabric"} color="#665f57" />
      ))}
      {!noHeadboard && (timber
        ? <TimberHeadboard width={width * 0.98} height={headboardHeight} depth={depth} props={props} />
        : <UpholsteredHeadboard width={width} height={headboardHeight} depth={depth} tall={tall} props={props} />)}
      {child && <RoundedPart size={[0.075, 0.25, depth * 0.62]} position={[width * 0.47 * resolved.variation.openSide, mattressY + 0.06, 0.04]} radius={0.035} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" />}
      {!floating && !low && [-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <CylinderPart key={`${x}-${z}`} radiusTop={0.024} height={0.15} position={[x * width * 0.41, floorY + 0.075, z * depth * 0.35]} material={timber ? asset.materials.primary : asset.materials.accent} role={timber ? "wood" : "metal"} sides={12} />
      )))}
    </group>
  );
}
