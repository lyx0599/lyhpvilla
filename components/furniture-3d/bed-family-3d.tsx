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

function MasterBedsideComposition({ width, depth, floorY, props }: { width: number; depth: number; floorY: number; props: FurnitureFamily3DProps }) {
  const { asset } = props;
  if (asset.detailLevel !== "presentation" || !/主卧|master/i.test(props.item.name)) return null;
  return (
    <group>
      <RoundedPart size={[0.48, 0.2, 0.34]} position={[-width * 0.62, floorY + 0.31, -depth * 0.25]} radius={0.04} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="wood" repeat={[2, 1]} />
      <RoundedPart size={[0.38, 0.035, 0.3]} position={[-width * 0.62, floorY + 0.425, -depth * 0.25]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.accent} role="stone" />
      <CylinderPart radiusTop={0.16} radiusBottom={0.18} height={0.035} position={[width * 0.62, floorY + 0.11, -depth * 0.2]} material={asset.materials.accent} role="metal" />
      <CylinderPart radiusTop={0.032} height={0.36} position={[width * 0.62, floorY + 0.3, -depth * 0.2]} material={asset.materials.accent} role="metal" />
      <RoundedPart size={[0.42, 0.055, 0.42]} position={[width * 0.62, floorY + 0.5, -depth * 0.2]} radius={0.2} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[2, 2]} />
      <CylinderPart radiusTop={0.11} radiusBottom={0.19} height={0.24} position={[-width * 0.62, floorY + 0.83, -depth * 0.23]} material={asset.materials.secondary} role="fabric" />
      <mesh position={[-width * 0.62, floorY + 0.78, -depth * 0.23]}>
        <sphereGeometry args={[0.055, 18, 12]} />
        <meshStandardMaterial color="#ffe4ad" emissive="#ffd58a" emissiveIntensity={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[width * 0.62, floorY + 1.12, -depth * 0.31]}>
        <cylinderGeometry args={[0.07, 0.16, 0.2, 24]} />
        <meshStandardMaterial color="#f5eadb" roughness={0.78} />
      </mesh>
      <mesh position={[width * 0.62, floorY + 1.08, -depth * 0.31]}>
        <sphereGeometry args={[0.04, 16, 10]} />
        <meshStandardMaterial color="#ffe4ad" emissive="#ffd58a" emissiveIntensity={0.75} />
      </mesh>
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
  const duvetY = mattressY + mattressHeight / 2 + 0.06;
  const headboardHeight = tall ? Math.max(0.9, height * 0.98) : low ? Math.max(0.5, height * 0.58) : Math.max(0.62, height * 0.72);
  const pillowCount = asset.detailLevel === "draft" ? 2 : width > 1.65 ? (resolved.variation.cushionBias > 0.5 ? 4 : 3) : 2;

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
      <RoundedPart size={[width * 0.89, 0.105, depth * 0.58]} position={[0, duvetY, depth * 0.1]} radius={0.085} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="fabric" repeat={[4, 5]} />
      <RoundedPart size={[width * 0.9, 0.045, depth * 0.17]} position={[0, duvetY + 0.065, depth * 0.31]} radius={0.02} detailLevel={asset.detailLevel} material={asset.materials.accent} role="fabric" repeat={[4, 2]} />
      {!noHeadboard && (timber
        ? <TimberHeadboard width={width * 0.98} height={headboardHeight} depth={depth} props={props} />
        : <UpholsteredHeadboard width={width} height={headboardHeight} depth={depth} tall={tall} props={props} />)}
      {Array.from({ length: pillowCount }, (_, index) => {
        const rear = index < 2;
        const side = index % 2 === 0 ? -1 : 1;
        const x = side * width * (rear ? 0.24 : 0.15) + resolved.variation.asymmetry * 0.035;
        return (
          <RoundedPart
            key={index}
            size={[rear ? Math.min(0.52, width * 0.3) : Math.min(0.42, width * 0.23), rear ? 0.13 : 0.11, rear ? depth * 0.17 : depth * 0.14]}
            position={[x, duvetY + (rear ? 0.13 : 0.2), -depth * (rear ? 0.25 : 0.12)]}
            rotation={[0, side * (rear ? 0.02 : 0.08), side * (0.05 + resolved.variation.asymmetry * 0.025)]}
            radius={0.065}
            detailLevel={asset.detailLevel}
            material={rear ? asset.materials.secondary : asset.materials.accent}
            role="fabric"
            repeat={[2, 1]}
          />
        );
      })}
      {child && <RoundedPart size={[0.075, 0.25, depth * 0.62]} position={[width * 0.47 * resolved.variation.openSide, mattressY + 0.06, 0.04]} radius={0.035} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" />}
      {!floating && !low && [-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <CylinderPart key={`${x}-${z}`} radiusTop={0.024} height={0.15} position={[x * width * 0.41, floorY + 0.075, z * depth * 0.35]} material={timber ? asset.materials.primary : asset.materials.accent} role={timber ? "wood" : "metal"} sides={12} />
      )))}
      <MasterBedsideComposition width={width} depth={depth} floorY={floorY} props={props} />
    </group>
  );
}
