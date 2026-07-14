"use client";

import { RoundedPart } from "./primitives";
import type { FurnitureFamily3DProps } from "./types";

export function MediaWall3D({ asset, width, depth, height }: FurnitureFamily3DProps) {
  const floorY = -height / 2;
  const panelHeight = Math.min(height * 0.92, 1.62);
  const panelY = floorY + panelHeight / 2 + 0.08;
  const consoleHeight = Math.min(0.46, height * 0.22);
  const consoleY = floorY + 0.28 + consoleHeight / 2;
  const stoneWidth = width * 0.48;
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
      <RoundedPart size={[stoneWidth * 0.78, height * 0.13, 0.08]} position={[-width * 0.12, floorY + 0.53, depth * 0.46]} radius={0.018} detailLevel={asset.detailLevel} material={asset.materials.accent} role="metal" color="#171918" roughness={0.26} />
      <mesh position={[-width * 0.12, floorY + 0.53, depth * 0.505]}>
        <planeGeometry args={[stoneWidth * 0.68, height * 0.09]} />
        <meshStandardMaterial color="#d45f2d" emissive="#ff6a2d" emissiveIntensity={0.7} roughness={0.4} />
      </mesh>
      <RoundedPart size={[width * 0.23, 0.045, depth * 0.42]} position={[width * 0.35, floorY + height * 0.35, depth * 0.05]} radius={0.012} detailLevel={asset.detailLevel} material={asset.materials.primary} role="wood" repeat={[3, 1]} />
      <mesh position={[width * 0.35, floorY + height * 0.37, depth * 0.06]}><boxGeometry args={[width * 0.19, 0.012, 0.018]} /><meshStandardMaterial color="#ffe2a8" emissive="#ffd182" emissiveIntensity={0.7} /></mesh>
    </group>
  );
}
