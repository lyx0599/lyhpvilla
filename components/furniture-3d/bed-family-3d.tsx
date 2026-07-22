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

function LayeredBedding({ props, width, depth, mattressY, mattressHeight, timber }: { props: FurnitureFamily3DProps; width: number; depth: number; mattressY: number; mattressHeight: number; timber: boolean }) {
  const { asset } = props;
  const topY = mattressY + mattressHeight / 2;
  const duvetDepth = depth * 0.58;
  const duvetZ = depth * 0.075;
  const pillowY = topY + 0.115;
  const pillowZ = -depth * 0.27;
  return (
    <group name="layered-realistic-bedding">
      <RoundedPart size={[width * 0.9, 0.11, duvetDepth]} position={[0, topY + 0.045, duvetZ]} radius={0.055} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="fabric" color="#e9dfd1" repeat={[5, 5]} />
      <RoundedPart size={[width * 0.89, 0.032, depth * 0.16]} position={[0, topY + 0.008, depth * 0.375]} rotation={[0.1, 0, 0]} radius={0.014} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="fabric" color="#d6c8b7" repeat={[4, 2]} />
      {[-1, 1].map((side) => (
        <RoundedPart key={`duvet-drop-${side}`} size={[0.055, 0.22, depth * 0.48]} position={[side * width * 0.455, topY - 0.055, depth * 0.095]} radius={0.022} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="fabric" color="#dfd3c4" repeat={[1, 4]} />
      ))}
      {[-1, 1].map((side) => (
        <RoundedPart key={`sleep-pillow-${side}`} size={[width * 0.36, 0.16, depth * 0.18]} position={[side * width * 0.205, pillowY, pillowZ]} rotation={[-0.11, side * 0.035, side * 0.025]} radius={0.075} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="fabric" color="#f0e7dc" repeat={[3, 2]} />
      ))}
      {!timber && [-1, 1].map((side) => (
        <RoundedPart key={`back-pillow-${side}`} size={[width * 0.3, 0.22, depth * 0.12]} position={[side * width * 0.17, pillowY + 0.075, pillowZ - depth * 0.045]} rotation={[-0.18, side * 0.04, side * 0.035]} radius={0.065} detailLevel={asset.detailLevel} material={asset.materials.accent} role="fabric" color="#c5ad96" repeat={[3, 2]} />
      ))}
      <RoundedPart size={[width * 0.74, 0.018, depth * 0.24]} position={[0, topY + 0.105, depth * 0.19]} rotation={[0.035, 0, 0]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.accent} role="fabric" color="#a88d72" repeat={[4, 3]} />
    </group>
  );
}

function StorageShelfHeadboard({ width, height, depth, props }: { width: number; height: number; depth: number; props: FurnitureFamily3DProps }) {
  const { asset, item } = props;
  const config = item.render3d?.bedVisual;
  const floorY = -props.height / 2;
  const shelfDepth = Math.min(0.24, Math.max(0.12, (config?.shelfDepthMm ?? 180) / 1000));
  const shelfY = floorY + Math.min(0.78, Math.max(0.5, (config?.shelfHeightMm ?? 640) / 1000));
  return (
    <group name="integrated-storage-headboard">
      <RoundedPart size={[width * 0.98, height * 0.9, 0.12]} position={[0, floorY + height * 0.46, -depth * 0.47]} radius={0.045} detailLevel={asset.detailLevel} material={asset.materials.primary} role="fabric" repeat={[4, 3]} />
      <RoundedPart size={[width * 0.96, 0.065, shelfDepth]} position={[0, shelfY, -depth * 0.42]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="wood" repeat={[5, 1]} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * width * 0.36, shelfY - 0.13, -depth * 0.405]}>
          <RoundedPart size={[width * 0.2, 0.22, shelfDepth * 0.9]} radius={0.025} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="wood" repeat={[2, 2]} />
          <RoundedPart size={[width * 0.15, 0.13, shelfDepth * 0.45]} position={[0, 0.015, shelfDepth * 0.25]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.accent} role="wood" color="#615950" />
          {config?.chargingNiche !== false && <CylinderPart radiusTop={0.018} height={0.012} position={[0, 0.12, 0]} material={asset.materials.accent} role="metal" color="#343331" sides={18} />}
        </group>
      ))}
      <RoundedPart size={[width * 0.72, 0.016, 0.022]} position={[0, shelfY - 0.045, -depth * 0.31]} radius={0.004} detailLevel={asset.detailLevel} material={asset.materials.accent} role="light" color="#ffe0a3" emissiveIntensity={0.64} />
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
  const storageHeadboard = item.render3d?.bedVisual?.headboardStyle === "storageShelf";
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
      {storageHeadboard
        ? <StorageShelfHeadboard width={width} height={headboardHeight} depth={depth} props={props} />
        : !noHeadboard && (timber
        ? <TimberHeadboard width={width * 0.98} height={headboardHeight} depth={depth} props={props} />
        : <UpholsteredHeadboard width={width} height={headboardHeight} depth={depth} tall={tall} props={props} />)}
      <LayeredBedding props={props} width={width} depth={depth} mattressY={mattressY} mattressHeight={mattressHeight} timber={timber} />
      {child && <RoundedPart size={[0.075, 0.25, depth * 0.62]} position={[width * 0.47 * resolved.variation.openSide, mattressY + 0.06, 0.04]} radius={0.035} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" />}
      {!floating && !low && [-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <CylinderPart key={`${x}-${z}`} radiusTop={0.024} height={0.15} position={[x * width * 0.41, floorY + 0.075, z * depth * 0.35]} material={timber ? asset.materials.primary : asset.materials.accent} role={timber ? "wood" : "metal"} sides={12} />
      )))}
    </group>
  );
}
