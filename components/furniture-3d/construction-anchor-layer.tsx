"use client";

import type { ConstructionAnchor } from "@/types/space";

const anchorStyle = {
  coldWater: { color: "#38bdf8", emissive: "#0284c7" },
  hotWater: { color: "#fb7185", emissive: "#be123c" },
  filteredWater: { color: "#22d3ee", emissive: "#0e7490" },
  drain: { color: "#22c55e", emissive: "#15803d" },
  power: { color: "#f59e0b", emissive: "#b45309" },
  gas: { color: "#a78bfa", emissive: "#6d28d9" },
  exhaust: { color: "#ef4444", emissive: "#b91c1c" }
} as const;

export function ConstructionAnchorLayer({ anchors, selected = false }: { anchors: ConstructionAnchor[]; selected?: boolean }) {
  return (
    <group name="construction-anchor-layer" userData={{ hiddenInPresentation: true }}>
      {anchors.map((anchor) => {
        const style = anchorStyle[anchor.type];
        const color = selected ? "#2563eb" : style.color;
        const position: [number, number, number] = [
          anchor.positionMm.x / 1000,
          Math.max(18, anchor.positionMm.y) / 1000,
          anchor.positionMm.z / 1000
        ];
        return (
          <group key={anchor.id} name={anchor.id} position={position} userData={{ anchorType: anchor.type, label: anchor.label }}>
            {anchor.type === "drain" ? (
              <>
                <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={40}>
                  <torusGeometry args={[0.075, 0.012, 10, 32]} />
                  <meshStandardMaterial color={color} emissive={style.emissive} emissiveIntensity={0.32} roughness={0.34} depthTest={false} />
                </mesh>
                <mesh position={[0, 0.012, 0]} renderOrder={41}>
                  <cylinderGeometry args={[0.045, 0.045, 0.022, 24]} />
                  <meshStandardMaterial color={color} emissive={style.emissive} emissiveIntensity={0.24} roughness={0.3} depthTest={false} />
                </mesh>
              </>
            ) : anchor.type === "power" ? (
              <mesh renderOrder={41}>
                <boxGeometry args={[0.105, 0.105, 0.035]} />
                <meshStandardMaterial color={color} emissive={style.emissive} emissiveIntensity={0.28} roughness={0.3} depthTest={false} />
              </mesh>
            ) : anchor.type === "exhaust" ? (
              <mesh rotation={[Math.PI, 0, 0]} renderOrder={41}>
                <coneGeometry args={[0.07, 0.15, 20]} />
                <meshStandardMaterial color={color} emissive={style.emissive} emissiveIntensity={0.3} roughness={0.32} depthTest={false} />
              </mesh>
            ) : (
              <>
                <mesh renderOrder={41}>
                  <sphereGeometry args={[0.052, 18, 12]} />
                  <meshStandardMaterial color={color} emissive={style.emissive} emissiveIntensity={0.34} roughness={0.3} depthTest={false} />
                </mesh>
                <mesh position={[0, -0.065, 0]} renderOrder={40}>
                  <cylinderGeometry args={[0.012, 0.012, 0.11, 10]} />
                  <meshStandardMaterial color={color} roughness={0.3} metalness={0.18} depthTest={false} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}
