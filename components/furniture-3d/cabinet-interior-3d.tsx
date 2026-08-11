"use client";

import type { Furniture } from "@/types/space";
import { resolveCabinetMaterialLayer, resolveRender3DMaterials } from "@/lib/render3d-assets";
import { normalizeCabinetInteriorLayout } from "@/lib/cabinet-interior";
import { CylinderPart, RoundedPart } from "./primitives";
import type { FurnitureFamily3DProps } from "./types";

function modulePosition(item: Furniture, width: number, height: number, depth: number, module: { x: number; y: number; z: number; width: number; height: number; depth: number }) {
  const layout = normalizeCabinetInteriorLayout(item.cabinetInterior, item);
  return [
    -width / 2 + (module.x + module.width / 2) / 1000,
    -height / 2 + (module.y + module.height / 2) / 1000,
    -depth / 2 + (module.z + module.depth / 2) / 1000
  ] as [number, number, number];
}

export function CabinetInteriorModules3D({ props, openAmount = 0 }: { props: FurnitureFamily3DProps; openAmount?: number }) {
  if (!props.item.cabinetInterior || openAmount <= 0.04) return null;
  const item = props.item;
  const layout = normalizeCabinetInteriorLayout(item.cabinetInterior, item);
  const materials = resolveRender3DMaterials(item);
  const carcass = resolveCabinetMaterialLayer(item, materials, "carcass");
  const hardware = resolveCabinetMaterialLayer(item, materials, "hardware");
  const width = Math.max(0.12, props.width);
  const height = Math.max(0.12, props.height);
  const depth = Math.max(0.08, props.depth);
  return (
    <group name={`${item.id}-cabinet-interior-modules`} userData={{ materialPart: "cabinet-interior" }}>
      {layout.modules.map((module) => {
        const position = modulePosition(item, width, height, depth, module);
        const size: [number, number, number] = [Math.max(0.012, module.width / 1000), Math.max(0.012, module.height / 1000), Math.max(0.012, module.depth / 1000)];
        if (module.kind === "hanging") {
          return (
            <group key={module.id} name={`${item.id}-interior-${module.id}`} userData={{ materialPart: "cabinet-interior", moduleKind: module.kind }}>
              <CylinderPart radiusTop={0.012} height={Math.max(0.08, size[0] * 0.88)} position={[position[0], position[1] + size[1] * 0.22, position[2] + depth * 0.22]} rotation={[0, 0, Math.PI / 2]} material={hardware} role="metal" />
            </group>
          );
        }
        if (module.kind === "clearance" || module.kind === "void") {
          return <mesh key={module.id} name={`${item.id}-interior-${module.id}`} position={position} userData={{ materialPart: "cabinet-interior", moduleKind: module.kind }}><boxGeometry args={size} /><meshBasicMaterial color="#f59e0b" wireframe transparent opacity={0.34} /></mesh>;
        }
        if (module.kind === "appliance" || module.kind === "plumbing" || module.kind === "waste") {
          return (
            <mesh key={module.id} name={`${item.id}-interior-${module.id}`} position={position} userData={{ materialPart: "cabinet-interior", moduleKind: module.kind }}>
              <boxGeometry args={size} />
              <meshStandardMaterial color={module.kind === "plumbing" ? "#2f80ed" : module.kind === "waste" ? "#59636b" : "#343b42"} transparent opacity={0.28} roughness={0.42} metalness={0.15} />
            </mesh>
          );
        }
        return (
          <RoundedPart
            key={module.id}
            name={`${item.id}-interior-${module.id}`}
            userData={{ materialPart: "cabinet-interior", moduleKind: module.kind }}
            size={size}
            position={position}
            radius={Math.min(0.008, size[0] * 0.16)}
            detailLevel={props.asset.detailLevel}
            material={module.kind === "drawer" || module.kind === "pullout" ? hardware : carcass}
            role={module.kind === "drawer" || module.kind === "pullout" ? "metal" : "wood"}
            opacity={module.kind === "open" ? 0.78 : undefined}
          />
        );
      })}
    </group>
  );
}
