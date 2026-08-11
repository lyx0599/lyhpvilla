"use client";

import { RoundedPart } from "./primitives";
import type { FurnitureFamily3DProps } from "./types";

function FloatingNicheMediaWall3D({ asset, width, depth, height }: FurnitureFamily3DProps) {
  const floorY = -height / 2;
  const panelHeight = Math.min(height * 0.94, 1.74);
  const panelY = floorY + panelHeight / 2 + 0.045;
  const frontZ = depth * 0.18;
  const nicheWidth = width * 0.2;
  const mediaCenterX = width * 0.11;
  const tvWidth = width * 0.52;
  const tvHeight = Math.min(panelHeight * 0.44, tvWidth * 9 / 16);
  const tvY = floorY + panelHeight * 0.69;
  const fireplaceWidth = width * 0.56;
  const fireplaceY = floorY + 0.48;
  const consoleY = floorY + 0.22;
  return (
    <group name="floating-niche-media-wall">
      <RoundedPart size={[width * 0.98, panelHeight, Math.max(0.07, depth * 0.28)]} position={[0, panelY, -depth * 0.28]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="ceramic" color="#eee8df" repeat={[7, 5]} />
      <RoundedPart size={[nicheWidth, panelHeight * 0.88, Math.max(0.1, depth * 0.42)]} position={[-width * 0.39, panelY, -depth * 0.18]} radius={0.016} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[3, 7]} />
      {[0.22, -0.08, -0.38].map((ratio) => <RoundedPart key={ratio} size={[nicheWidth * 0.78, 0.035, depth * 0.54]} position={[-width * 0.39, panelY + ratio * panelHeight, frontZ]} radius={0.009} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" />)}
      <mesh position={[-width * 0.39, panelY + panelHeight * 0.36, frontZ + 0.015]}><boxGeometry args={[nicheWidth * 0.72, 0.012, 0.016]} /><meshStandardMaterial color="#ffe2a8" emissive="#ffd182" emissiveIntensity={0.62} /></mesh>
      <RoundedPart size={[tvWidth + 0.055, tvHeight + 0.055, 0.026]} position={[mediaCenterX, tvY, frontZ]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="ceramic" color="#ddd6cc" />
      <RoundedPart size={[tvWidth, tvHeight, 0.028]} position={[mediaCenterX, tvY, frontZ + 0.025]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.accent} role="glass" color="#151918" opacity={0.9} />
      <RoundedPart size={[fireplaceWidth + 0.06, 0.29, 0.04]} position={[mediaCenterX, fireplaceY, frontZ + 0.006]} radius={0.01} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="stone" color="#d7cfc4" />
      <RoundedPart size={[fireplaceWidth, 0.22, 0.045]} position={[mediaCenterX, fireplaceY, frontZ + 0.035]} radius={0.007} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#222321" roughness={0.2} />
      <mesh position={[mediaCenterX, fireplaceY - 0.025, frontZ + 0.066]}><boxGeometry args={[fireplaceWidth * 0.86, 0.018, 0.018]} /><meshStandardMaterial color="#ffbf73" emissive="#ff9d43" emissiveIntensity={1.35} /></mesh>
      <RoundedPart size={[width * 0.72, 0.28, depth * 0.58]} position={[mediaCenterX, consoleY, frontZ - depth * 0.02]} radius={0.014} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[7, 2]} />
      {[-0.23, 0, 0.23].map((ratio) => <RoundedPart key={ratio} size={[0.01, 0.22, 0.012]} position={[mediaCenterX + ratio * width * 0.72, consoleY, frontZ + depth * 0.29]} radius={0.003} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#81766c" opacity={0.34} />)}
      <mesh position={[mediaCenterX, floorY + 0.055, frontZ + depth * 0.25]}><boxGeometry args={[width * 0.62, 0.012, 0.016]} /><meshStandardMaterial color="#ffe2a8" emissive="#ffd182" emissiveIntensity={0.44} /></mesh>
    </group>
  );
}

function DualNicheMediaWall3D({ asset, width, depth, height }: FurnitureFamily3DProps) {
  const floorY = -height / 2;
  const panelHeight = Math.min(height * 0.94, 1.74);
  const panelY = floorY + panelHeight / 2 + 0.045;
  const frontZ = depth * 0.18;
  const outerMargin = width * 0.03;
  const nicheWidth = width * 0.15;
  const nicheX = width / 2 - outerMargin - nicheWidth / 2;
  const reveal = width * 0.018;
  const mediaWidth = width - 2 * (outerMargin + nicheWidth + reveal);
  const tvWidth = mediaWidth * 0.84;
  const tvHeight = Math.min(panelHeight * 0.43, tvWidth * 9 / 16);
  const tvY = floorY + panelHeight * 0.69;
  const fireplaceWidth = mediaWidth * 0.7;
  const fireplaceY = floorY + 0.48;
  const consoleY = floorY + 0.22;
  const nicheShelfY = panelY - panelHeight * 0.1;
  return (
    <group name="dual-niche-media-wall">
      <RoundedPart size={[width * 0.98, panelHeight, Math.max(0.07, depth * 0.28)]} position={[0, panelY, -depth * 0.28]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="ceramic" color="#eee8df" repeat={[7, 5]} />
      {[-nicheX, nicheX].map((x, index) => (
        <group key={x} position={[x, 0, 0]}>
          <RoundedPart size={[nicheWidth, panelHeight * 0.88, Math.max(0.1, depth * 0.42)]} position={[0, panelY, -depth * 0.18]} radius={nicheWidth * 0.42} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[3, 7]} />
          <RoundedPart size={[nicheWidth * 0.78, 0.035, depth * 0.54]} position={[0, nicheShelfY, frontZ]} radius={0.009} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" />
          <RoundedPart size={[nicheWidth * 0.82, panelHeight * 0.3, depth * 0.48]} position={[0, floorY + panelHeight * 0.18, frontZ - depth * 0.03]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[3, 2]} />
          <mesh position={[0, panelY + panelHeight * 0.36, frontZ + 0.015]}><boxGeometry args={[nicheWidth * 0.72, 0.012, 0.016]} /><meshStandardMaterial color="#ffe2a8" emissive="#ffd182" emissiveIntensity={0.62} /></mesh>
          {index === 0 ? (
            <RoundedPart size={[nicheWidth * 0.28, nicheWidth * 0.34, nicheWidth * 0.24]} position={[0, nicheShelfY + nicheWidth * 0.2, frontZ + depth * 0.1]} radius={0.06} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="ceramic" color="#a37b57" />
          ) : (
            <RoundedPart size={[nicheWidth * 0.3, nicheWidth * 0.3, nicheWidth * 0.18]} position={[0, nicheShelfY + nicheWidth * 0.18, frontZ + depth * 0.1]} radius={0.1} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#302d29" />
          )}
        </group>
      ))}
      <RoundedPart size={[tvWidth + 0.055, tvHeight + 0.055, 0.026]} position={[0, tvY, frontZ]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="ceramic" color="#ddd6cc" />
      <RoundedPart size={[tvWidth, tvHeight, 0.028]} position={[0, tvY, frontZ + 0.025]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.accent} role="glass" color="#151918" opacity={0.9} />
      <RoundedPart size={[fireplaceWidth + 0.06, 0.29, 0.04]} position={[0, fireplaceY, frontZ + 0.006]} radius={0.01} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="stone" color="#d7cfc4" />
      <RoundedPart size={[fireplaceWidth, 0.22, 0.045]} position={[0, fireplaceY, frontZ + 0.035]} radius={0.007} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#222321" roughness={0.2} />
      <mesh position={[0, fireplaceY - 0.025, frontZ + 0.066]}><boxGeometry args={[fireplaceWidth * 0.86, 0.018, 0.018]} /><meshStandardMaterial color="#ffbf73" emissive="#ff9d43" emissiveIntensity={1.35} /></mesh>
      <RoundedPart size={[mediaWidth, 0.28, depth * 0.58]} position={[0, consoleY, frontZ - depth * 0.02]} radius={0.014} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[7, 2]} />
      {[-0.25, 0, 0.25].map((ratio) => <RoundedPart key={ratio} size={[0.01, 0.22, 0.012]} position={[ratio * mediaWidth, consoleY, frontZ + depth * 0.29]} radius={0.003} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#81766c" opacity={0.34} />)}
      <mesh position={[0, floorY + 0.055, frontZ + depth * 0.25]}><boxGeometry args={[mediaWidth * 0.9, 0.012, 0.016]} /><meshStandardMaterial color="#ffe2a8" emissive="#ffd182" emissiveIntensity={0.44} /></mesh>
    </group>
  );
}

export function MediaWall3D(props: FurnitureFamily3DProps) {
  if (props.item.render3d?.variantId === "dualNicheMediaWall") return <DualNicheMediaWall3D {...props} />;
  if (props.item.render3d?.variantId === "floatingNicheMediaWall") return <FloatingNicheMediaWall3D {...props} />;
  const { asset, width, depth, height } = props;
  const floorY = -height / 2;
  const panelHeight = Math.min(height * 0.92, 1.62);
  const panelY = floorY + panelHeight / 2 + 0.08;
  const consoleHeight = Math.min(0.46, height * 0.22);
  const consoleY = floorY + 0.28 + consoleHeight / 2;
  const stoneWidth = width * 0.48;
  const fireboxWidth = stoneWidth * 0.76;
  const fireboxHeight = Math.min(0.36, height * 0.2);
  const fireboxY = floorY + 0.53;
  const fireboxFrontZ = depth * 0.49;
  return (
    <group>
      <RoundedPart size={[width, panelHeight, Math.max(0.08, depth * 0.34)]} position={[0, panelY, -depth * 0.3]} radius={0.025} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="stone" color="#e8e1d7" repeat={[7, 5]} />
      <RoundedPart size={[width * 0.24, panelHeight * 0.96, Math.max(0.1, depth * 0.42)]} position={[-width * 0.38, panelY, -depth * 0.2]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[3, 7]} />
      <RoundedPart size={[width * 0.54, Math.min(0.72, panelHeight * 0.45), 0.06]} position={[width * 0.16, panelY + panelHeight * 0.13, depth * 0.02]} radius={0.025} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#252625" roughness={0.22} />
      <RoundedPart size={[width * 0.49, Math.min(0.63, panelHeight * 0.39), 0.025]} position={[width * 0.16, panelY + panelHeight * 0.13, depth * 0.06]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.accent} role="glass" color="#111514" opacity={0.72} />
      <RoundedPart size={[width * 0.88, consoleHeight, depth * 0.72]} position={[width * 0.04, consoleY, depth * 0.08]} radius={0.035} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[7, 2]} />
      {[-0.26, 0.02, 0.29].map((ratio, index) => (
        <group key={ratio} position={[ratio * width, consoleY, depth * 0.45]}>
          {index === 1 ? (
            <group>
              <RoundedPart size={[width * 0.22, consoleHeight * 0.78, 0.035]} position={[0, 0, -depth * 0.33]} radius={0.008} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" color="#866f5a" />
              <RoundedPart size={[width * 0.2, 0.025, depth * 0.58]} position={[0, 0.08, -depth * 0.12]} radius={0.006} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" />
              <mesh position={[0, consoleHeight * 0.34, -depth * 0.04]}><boxGeometry args={[width * 0.18, 0.012, 0.018]} /><meshStandardMaterial color="#ffe2a8" emissive="#ffd182" emissiveIntensity={0.75} /></mesh>
            </group>
          ) : (
            [-0.22, 0.16].map((y) => <RoundedPart key={y} size={[width * 0.25, consoleHeight * 0.42, 0.04]} position={[0, y * consoleHeight, 0]} radius={0.012} detailLevel={asset.detailLevel} material={index === 0 ? asset.materials.primary : asset.materials.secondary} role={index === 0 ? "wood" : "ceramic"} />)
          )}
        </group>
      ))}
      <RoundedPart size={[width * 0.94, 0.06, depth * 0.86]} position={[width * 0.03, consoleY + consoleHeight / 2 + 0.03, depth * 0.03]} radius={0.02} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="stone" repeat={[7, 2]} />
      <RoundedPart size={[stoneWidth, height * 0.25, Math.max(0.12, depth * 0.58)]} position={[-width * 0.12, floorY + 0.53, depth * 0.12]} radius={0.025} detailLevel={asset.detailLevel} material={asset.materials.secondary} role="stone" repeat={[4, 2]} />
      <RoundedPart size={[stoneWidth * 0.82, height * 0.15, 0.08]} position={[-width * 0.12, fireboxY, depth * 0.46]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#111514" roughness={0.22} />
      <group name="integrated-fireplace-flames" position={[-width * 0.12, fireboxY, fireboxFrontZ]}>
        <pointLight color="#ff9f4a" intensity={1.8} distance={2.4} position={[0, 0.08, 0.18]} />
        <mesh position={[0, -fireboxHeight * 0.42, 0.005]}>
          <boxGeometry args={[fireboxWidth, 0.055, 0.09]} />
          <meshStandardMaterial color="#3a1d14" emissive="#8b2f16" emissiveIntensity={0.7} roughness={0.62} />
        </mesh>
        {[-0.2, 0, 0.21].map((offset, index) => (
          <mesh key={`fireplace-log-${index}`} position={[offset * fireboxWidth, -fireboxHeight * 0.31 + index * 0.012, 0.04]} rotation={[0, 0, Math.PI / 2 + (index % 2 ? -0.18 : 0.2)]}>
            <cylinderGeometry args={[0.028, 0.038, fireboxWidth * 0.34, 14]} />
            <meshStandardMaterial color="#5a3220" emissive="#7c2d12" emissiveIntensity={0.28} roughness={0.78} />
          </mesh>
        ))}
        {[-0.31, -0.1, 0.12, 0.32].map((offset, index) => {
          const flameHeight = fireboxHeight * (index % 2 ? 0.86 : 0.68);
          return (
            <group key={`fireplace-flame-${index}`} position={[offset * fireboxWidth, -fireboxHeight * 0.12 + flameHeight * 0.35, 0.075]} rotation={[0, 0, offset * 0.34]}>
              <mesh>
                <coneGeometry args={[0.07 + (index % 2) * 0.014, flameHeight, 18]} />
                <meshStandardMaterial color="#fb6a22" emissive="#ff5a1f" emissiveIntensity={3.2} transparent opacity={0.94} roughness={0.16} depthWrite={false} />
              </mesh>
              <mesh position={[0, -flameHeight * 0.08, 0.012]}>
                <coneGeometry args={[0.038, flameHeight * 0.62, 16]} />
                <meshStandardMaterial color="#fde68a" emissive="#facc15" emissiveIntensity={3.6} transparent opacity={0.96} roughness={0.12} depthWrite={false} />
              </mesh>
            </group>
          );
        })}
        {Array.from({ length: 7 }, (_, index) => (
          <mesh key={`fireplace-ember-${index}`} position={[(index - 3) * fireboxWidth * 0.105, -fireboxHeight * 0.38 + (index % 2) * 0.012, 0.09]}>
            <sphereGeometry args={[0.016, 10, 8]} />
            <meshStandardMaterial color="#fb923c" emissive="#f97316" emissiveIntensity={1.7} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.11]} renderOrder={8}>
          <planeGeometry args={[fireboxWidth * 1.02, fireboxHeight * 1.08]} />
          <meshStandardMaterial color="#2b211a" transparent opacity={0.12} roughness={0.08} metalness={0.08} depthWrite={false} />
        </mesh>
      </group>
      <RoundedPart size={[width * 0.23, 0.045, depth * 0.42]} position={[width * 0.35, floorY + height * 0.35, depth * 0.05]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[3, 1]} />
      <mesh position={[width * 0.35, floorY + height * 0.37, depth * 0.06]}><boxGeometry args={[width * 0.19, 0.012, 0.018]} /><meshStandardMaterial color="#ffe2a8" emissive="#ffd182" emissiveIntensity={0.7} /></mesh>
    </group>
  );
}
