"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { resolveFurnitureVariant, stableVariationValue } from "@/lib/furniture-variants";
import type { Resolved3DAsset } from "@/lib/render3d-assets";
import type { Furniture } from "@/types/space";

type Vec3 = [number, number, number];

type Props = {
  item: Furniture;
  asset: Resolved3DAsset;
  width: number;
  depth: number;
  height: number;
};

function SoftBox({ size, position = [0, 0, 0], rotation, color, radius = 0.04, roughness = 0.7, metalness = 0.02, opacity = 1 }: {
  size: Vec3;
  position?: Vec3;
  rotation?: Vec3;
  color: string;
  radius?: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
}) {
  const geometry = useMemo(() => {
    const safeRadius = Math.min(radius, Math.max(0.004, Math.min(...size) * 0.42));
    return new RoundedBoxGeometry(size[0], size[1], size[2], 3, safeRadius);
  }, [radius, size[0], size[1], size[2]]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh castShadow receiveShadow position={position} rotation={rotation}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
    </mesh>
  );
}

function Cylinder({ radius, height, position, color, rotation, sides = 20, roughness = 0.55, metalness = 0.05 }: {
  radius: number;
  height: number;
  position: Vec3;
  color: string;
  rotation?: Vec3;
  sides?: number;
  roughness?: number;
  metalness?: number;
}) {
  return (
    <mesh castShadow receiveShadow position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, height, sides]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

function BedFamily({ item, asset, width, depth, height }: Props) {
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const id = resolved.variant.id;
  const primary = asset.materials.primary.color;
  const bedding = asset.materials.secondary.color;
  const accent = asset.materials.accent.color;
  const floorY = -height / 2;
  const child = id === "childBed";
  const timber = id === "timberFrame" || id === "guestBed" || child;
  const floating = id === "floatingPlatform";
  const noHeadboard = id === "minimalNoHeadboard";
  const tall = id === "tallPanelHeadboard";
  const low = id === "lowUpholstered";
  const frameHeight = child ? 0.15 : floating ? 0.12 : timber ? 0.18 : 0.24;
  const frameY = floorY + (floating ? 0.22 : 0.12) + frameHeight / 2;
  const mattressHeight = child ? 0.14 : 0.18;
  const mattressY = frameY + frameHeight / 2 + mattressHeight / 2 - 0.015;
  const duvetY = mattressY + mattressHeight / 2 + 0.045;
  const headboardHeight = tall ? Math.max(0.82, height * 0.95) : low ? Math.max(0.46, height * 0.58) : timber ? Math.max(0.58, height * 0.7) : Math.max(0.62, height * 0.76);
  const pillowCount = asset.detailLevel === "draft" ? 2 : width >= 1.7 ? (resolved.variation.cushionBias > 0.56 ? 4 : 3) : 2;
  const pillowWidth = Math.min(0.48, width * (pillowCount > 2 ? 0.22 : 0.31));
  return (
    <group>
      {floating && <SoftBox size={[width * 0.66, 0.18, depth * 0.58]} position={[0, floorY + 0.09, 0.04]} color="#70665c" radius={0.035} />}
      <SoftBox size={[width * (floating ? 1.08 : 0.99), frameHeight, depth * (floating ? 0.94 : 0.9)]} position={[0, frameY, 0.035]} color={timber || floating ? primary : accent} radius={timber ? 0.025 : 0.07} roughness={timber ? 0.52 : 0.9} />
      <SoftBox size={[width * 0.94, mattressHeight, depth * 0.78]} position={[0, mattressY, 0.02]} color="#f5efe6" radius={0.08} roughness={0.93} />
      <SoftBox size={[width * 0.89, 0.1, depth * (child ? 0.48 : 0.56)]} position={[0, duvetY, depth * 0.09]} color={bedding} radius={0.09} roughness={0.95} />
      {!noHeadboard && (
        timber ? (
          <group>
            <SoftBox size={[width * 0.98, 0.08, 0.1]} position={[0, floorY + headboardHeight, -depth * 0.47]} color={primary} radius={0.025} roughness={0.52} />
            {[-0.45, -0.15, 0.15, 0.45].map((ratio) => <SoftBox key={ratio} size={[0.055, headboardHeight * 0.88, 0.09]} position={[ratio * width, floorY + headboardHeight * 0.52, -depth * 0.47]} color={primary} radius={0.018} roughness={0.52} />)}
          </group>
        ) : (
          <group>
            <SoftBox size={[width * (tall ? 1.08 : 1.0), headboardHeight, tall ? 0.17 : 0.13]} position={[0, floorY + headboardHeight / 2 + 0.03, -depth * 0.47]} color={primary} radius={tall ? 0.045 : 0.07} roughness={0.91} />
            {asset.detailLevel !== "draft" && Array.from({ length: tall ? 6 : 3 }, (_, index) => {
              const count = tall ? 6 : 3;
              return <SoftBox key={index} size={[0.012, headboardHeight * 0.72, 0.012]} position={[-width * 0.43 + index * width * 0.86 / Math.max(1, count - 1), floorY + headboardHeight * 0.52, -depth * 0.375]} color="#fff7ee" radius={0.004} opacity={0.34} />;
            })}
          </group>
        )
      )}
      {Array.from({ length: pillowCount }, (_, index) => {
        const row = pillowCount > 2 && index >= 2 ? 1 : 0;
        const side = index % 2 ? 1 : -1;
        return <SoftBox key={index} size={[pillowWidth, 0.105, depth * 0.15]} position={[side * width * (row ? 0.13 : 0.25), duvetY + 0.11 + row * 0.045, -depth * (row ? 0.14 : 0.25)]} rotation={[0, 0, side * (0.04 + resolved.variation.asymmetry * 0.025)]} color={row ? accent : "#fbf7ef"} radius={0.055} roughness={0.96} />;
      })}
      {child && <SoftBox size={[0.075, 0.22, depth * 0.64]} position={[width * 0.47 * resolved.variation.openSide, mattressY + 0.04, 0.05]} color={primary} radius={0.035} roughness={0.56} />}
      {!floating && !low && [-1, 1].flatMap((x) => [-1, 1].map((z) => <Cylinder key={`${x}-${z}`} radius={0.023} height={0.15} position={[x * width * 0.4, floorY + 0.075, z * depth * 0.34]} color={timber ? primary : "#4a4540"} sides={12} />))}
    </group>
  );
}

function SofaFamily({ item, asset, width, depth, height }: Props) {
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const id = resolved.variant.id;
  const fabric = asset.materials.primary.color;
  const secondary = asset.materials.secondary.color;
  const accent = asset.materials.accent.color;
  const floorY = -height / 2;
  const slim = id === "slimLegSofa";
  const deep = id === "deepLounge";
  const modular = id === "lowModular" || id === "sectionalLShape";
  const curved = id === "curvedSofa";
  const loveseat = id === "compactLoveseat";
  const modules = loveseat ? 2 : Math.max(2, Math.min(5, Math.round(width / (deep ? 0.82 : 0.7))));
  const armWidth = slim ? 0.08 : deep ? 0.2 : 0.14;
  const seatHeight = slim ? 0.17 : deep ? 0.2 : 0.16;
  const seatY = floorY + (slim ? 0.36 : 0.22) + seatHeight / 2;
  const moduleWidth = (width - armWidth * 2 - 0.06) / modules;
  const chaiseSide = resolved.variation.openSide;
  return (
    <group>
      {Array.from({ length: modules }, (_, index) => {
        const x = -width / 2 + armWidth + 0.03 + moduleWidth * (index + 0.5);
        const edge = index === (chaiseSide > 0 ? modules - 1 : 0);
        const angle = curved ? (index - (modules - 1) / 2) * -0.12 : 0;
        const z = curved ? Math.abs(index - (modules - 1) / 2) * 0.045 : 0.04;
        const seatDepth = id === "sectionalLShape" && edge ? depth * 1.2 : depth * (deep ? 0.82 : 0.68);
        return (
          <group key={index} position={[x, 0, z]} rotation={[0, angle, 0]}>
            <SoftBox size={[moduleWidth * 0.92, seatHeight, seatDepth]} position={[0, seatY, id === "sectionalLShape" && edge ? depth * 0.12 : depth * 0.06]} color={index % 2 && modular ? secondary : fabric} radius={0.075} roughness={0.94} />
            {!(id === "sectionalLShape" && edge) && <SoftBox size={[moduleWidth * 0.9, height * (deep ? 0.52 : 0.46), 0.13]} position={[0, seatY + height * 0.3, -depth * 0.37]} rotation={[0.06, 0, 0]} color={fabric} radius={0.065} roughness={0.93} />}
          </group>
        );
      })}
      {!modular && !curved && [-1, 1].map((side) => <SoftBox key={side} size={[armWidth, height * 0.52, depth * 0.8]} position={[side * (width / 2 - armWidth / 2), floorY + height * 0.42, 0]} color={fabric} radius={slim ? 0.035 : 0.07} roughness={0.92} />)}
      {curved && [-1, 1].map((side) => <SoftBox key={side} size={[width * 0.18, height * 0.48, depth * 0.48]} position={[side * width * 0.42, floorY + height * 0.42, depth * 0.06]} rotation={[0, side * 0.34, 0]} color={fabric} radius={0.11} roughness={0.93} />)}
      {asset.detailLevel !== "draft" && Array.from({ length: resolved.variation.cushionBias > 0.65 ? 3 : 2 }, (_, index) => <SoftBox key={index} size={[Math.min(0.38, width * 0.15), 0.28, 0.105]} position={[(-0.18 + index * 0.22) * width + resolved.variation.asymmetry * 0.04, seatY + 0.25 + (index % 2) * 0.025, -depth * 0.21]} rotation={[0, 0, index % 2 ? -0.11 : 0.08]} color={index % 2 ? accent : secondary} radius={0.065} roughness={0.96} />)}
      {slim && [-1, 1].flatMap((x) => [-1, 1].map((z) => <Cylinder key={`${x}-${z}`} radius={0.018} height={0.28} position={[x * width * 0.41, floorY + 0.14, z * depth * 0.3]} color="#3c3a37" sides={10} metalness={0.62} roughness={0.28} />))}
      {!slim && <SoftBox size={[width * 0.78, 0.1, depth * 0.5]} position={[0, floorY + 0.09, 0.02]} color="#655f57" radius={0.03} />}
    </group>
  );
}

function DiningSeat({ x, z, rotation, variantId, primary, secondary, accent, host = false }: { x: number; z: number; rotation: number; variantId: string; primary: string; secondary: string; accent: string; host?: boolean }) {
  const upholstered = variantId === "upholsteredDining" || host;
  const woven = variantId === "wovenDining";
  const metal = variantId === "lightSide";
  return (
    <group position={[x, -0.12, z]} rotation={[0, rotation, 0]}>
      <SoftBox size={[host ? 0.46 : 0.4, 0.08, 0.39]} position={[0, 0, 0]} color={upholstered ? secondary : primary} radius={0.045} roughness={upholstered ? 0.92 : 0.56} />
      {woven ? (
        <group position={[0, 0.25, -0.18]}>
          <SoftBox size={[0.42, 0.42, 0.04]} color={primary} radius={0.035} roughness={0.55} />
          {[-0.12, 0, 0.12].map((offset) => <SoftBox key={offset} size={[0.028, 0.32, 0.048]} position={[offset, 0, 0.025]} color={secondary} radius={0.01} roughness={0.84} />)}
        </group>
      ) : <SoftBox size={[host ? 0.48 : 0.4, host ? 0.46 : 0.4, 0.07]} position={[0, 0.24, -0.18]} color={upholstered ? secondary : primary} radius={host ? 0.12 : 0.055} roughness={upholstered ? 0.92 : 0.56} />}
      {(host ? [-1, 1] : []).map((side) => <Cylinder key={side} radius={0.018} height={0.42} position={[side * 0.23, 0.14, 0]} color={accent} rotation={[0, 0, Math.PI / 2]} metalness={0.45} />)}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Cylinder key={`${sx}-${sz}`} radius={metal ? 0.014 : 0.019} height={0.34} position={[sx * 0.14, -0.19, sz * 0.13]} color={metal ? accent : primary} sides={10} metalness={metal ? 0.62 : 0.02} />))}
    </group>
  );
}

function DiningTableFamily({ item, asset, width, depth, height }: Props) {
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const id = resolved.variant.id;
  const primary = asset.materials.primary.color;
  const secondary = asset.materials.secondary.color;
  const accent = asset.materials.accent.color;
  const floorY = -height / 2;
  const tableW = width * 0.58;
  const tableD = depth * 0.52;
  const topY = floorY + Math.min(0.76, height * 0.82);
  const round = id === "roundPedestal" || id === "roundFourLeg";
  const oval = id === "ovalSlab" || id === "stoneTop";
  const metalFrame = id === "lightMetalFrame";
  const chairVariant = ["timberDining", "upholsteredDining", "wovenDining", "lightSide"][Math.floor(stableVariationValue(resolved.seed, 31) * 4)];
  return (
    <group>
      {round ? (
        <mesh castShadow receiveShadow position={[0, topY, 0]}><cylinderGeometry args={[Math.min(tableW, tableD) / 2, Math.min(tableW, tableD) / 2, 0.065, asset.detailLevel === "draft" ? 24 : 48]} /><meshStandardMaterial color={primary} roughness={0.48} metalness={0.03} /></mesh>
      ) : oval ? (
        <mesh castShadow receiveShadow position={[0, topY, 0]} scale={[tableW / 2, 0.065, tableD / 2]}><sphereGeometry args={[1, asset.detailLevel === "draft" ? 20 : 40, 12]} /><meshStandardMaterial color={primary} roughness={id === "stoneTop" ? 0.34 : 0.5} metalness={0.03} /></mesh>
      ) : <SoftBox size={[tableW, 0.068, tableD]} position={[0, topY, 0]} color={primary} radius={metalFrame ? 0.025 : 0.045} roughness={0.5} />}
      {id === "roundPedestal" || id === "stoneTop" ? (
        <><Cylinder radius={0.095} height={topY - floorY - 0.04} position={[0, floorY + (topY - floorY) / 2, 0]} color={id === "stoneTop" ? accent : primary} sides={24} metalness={id === "stoneTop" ? 0.55 : 0.02} /><Cylinder radius={Math.min(tableW, tableD) * 0.2} height={0.04} position={[0, floorY + 0.02, 0]} color={accent} sides={32} metalness={0.48} /></>
      ) : id === "ovalSlab" ? [-1, 1].map((side) => <SoftBox key={side} size={[0.12, topY - floorY - 0.06, tableD * 0.46]} position={[side * tableW * 0.27, floorY + (topY - floorY) / 2, 0]} color={secondary} radius={0.025} roughness={0.52} />)
      : [-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Cylinder key={`${sx}-${sz}`} radius={metalFrame ? 0.022 : 0.035} height={topY - floorY - 0.05} position={[sx * tableW * 0.38, floorY + (topY - floorY) / 2, sz * tableD * 0.34]} color={metalFrame ? accent : primary} sides={12} metalness={metalFrame ? 0.62 : 0.02} />))}
      {Array.from({ length: 6 }, (_, index) => {
        const angle = index / 6 * Math.PI * 2;
        const x = Math.cos(angle) * width * 0.4;
        const z = Math.sin(angle) * depth * 0.4;
        return <DiningSeat key={index} x={x} z={z} rotation={-angle + Math.PI / 2} variantId={chairVariant} primary={primary} secondary={secondary} accent={accent} host={index === 0 && resolved.variation.panelBias > 0.48} />;
      })}
    </group>
  );
}

function CoffeeTableFamily({ item, asset, width, depth, height }: Props) {
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const id = resolved.variant.id;
  const primary = asset.materials.primary.color;
  const secondary = asset.materials.secondary.color;
  const accent = asset.materials.accent.color;
  const floorY = -height / 2;
  const topY = floorY + Math.max(0.26, height * 0.72);
  if (id === "nestedDouble") return <group><mesh castShadow position={[-width * 0.14, topY, 0]}><cylinderGeometry args={[Math.min(width, depth) * 0.31, Math.min(width, depth) * 0.31, 0.06, 36]} /><meshStandardMaterial color={primary} roughness={0.42} /></mesh><mesh castShadow position={[width * 0.18, topY + 0.08, depth * 0.08]}><cylinderGeometry args={[Math.min(width, depth) * 0.23, Math.min(width, depth) * 0.23, 0.055, 36]} /><meshStandardMaterial color={secondary} roughness={0.36} /></mesh>{[-0.14, 0.18].map((x, index) => <Cylinder key={x} radius={0.055} height={topY - floorY + index * 0.08} position={[x * width, floorY + (topY - floorY) / 2, index ? depth * 0.08 : 0]} color={accent} metalness={0.58} />)}</group>;
  if (id === "lowRound") return <group><mesh castShadow position={[0, topY, 0]}><cylinderGeometry args={[Math.min(width, depth) * 0.42, Math.min(width, depth) * 0.44, 0.08, 48]} /><meshStandardMaterial color={primary} roughness={0.46} /></mesh><Cylinder radius={Math.min(width, depth) * 0.22} height={topY - floorY} position={[0, floorY + (topY - floorY) / 2, 0]} color={secondary} sides={32} /></group>;
  if (id === "softOrganic") return <group><mesh castShadow receiveShadow position={[0, topY, 0]} scale={[width * 0.46, 0.065, depth * 0.38]} rotation={[0, resolved.variation.asymmetry * 0.2, 0]}><sphereGeometry args={[1, 40, 16]} /><meshStandardMaterial color={primary} roughness={0.38} /></mesh>{[-0.2, 0.22].map((x) => <Cylinder key={x} radius={0.065} height={topY - floorY} position={[x * width, floorY + (topY - floorY) / 2, 0]} color={secondary} sides={24} />)}</group>;
  return <group><SoftBox size={[width * 0.9, 0.08, depth * 0.78]} position={[0, topY, 0]} color={primary} radius={id === "travertineBlock" ? 0.08 : 0.035} roughness={id === "travertineBlock" ? 0.36 : 0.52} />{[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Cylinder key={`${sx}-${sz}`} radius={0.025} height={topY - floorY} position={[sx * width * 0.34, floorY + (topY - floorY) / 2, sz * depth * 0.27]} color={id === "travertineBlock" ? accent : secondary} sides={12} metalness={id === "travertineBlock" ? 0.56 : 0.02} />))}</group>;
}

function ChairFamily({ item, asset, width, depth }: Props) {
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  return <DiningSeat x={0} z={0} rotation={0} variantId={resolved.variant.id} primary={asset.materials.primary.color} secondary={asset.materials.secondary.color} accent={asset.materials.accent.color} host={resolved.variant.id === "armHost"} />;
}

function CabinetFamily({ item, asset, width, depth, height }: Props) {
  const resolved = resolveFurnitureVariant(item, asset.assetType);
  const id = resolved.variant.id;
  const primary = asset.materials.primary.color;
  const secondary = asset.materials.secondary.color;
  const accent = asset.materials.accent.color;
  const floorY = -height / 2;
  const floating = id === "floating" || id === "wallMounted";
  const glass = id === "glassDisplay" || id === "slimGlassFrame";
  const open = id === "openClosedMix" || id === "woodWarmWhite";
  const counter = ["island", "kitchenCabinet", "sideboard", "bathroomVanity", "outdoorCabinet"].includes(asset.assetType);
  const lift = floating ? Math.min(0.28, height * 0.24) : 0.06;
  const bodyHeight = Math.max(0.18, height - lift - (counter ? 0.06 : 0.02));
  const bodyY = floorY + lift + bodyHeight / 2;
  const panelCount = Math.max(2, Math.min(7, Math.round(width / (height > 1.5 ? 0.55 : 0.7))));
  const openIndex = Math.min(panelCount - 1, Math.floor(resolved.variation.panelBias * panelCount));
  const panelWidth = width / panelCount;
  return (
    <group>
      <SoftBox size={[width, bodyHeight, depth]} position={[0, bodyY, 0]} color={id === "woodWarmWhite" ? secondary : primary} radius={0.025} roughness={0.56} />
      {Array.from({ length: panelCount }, (_, index) => {
        const x = -width / 2 + panelWidth * (index + 0.5);
        const isOpen = open && index === openIndex;
        if (isOpen) return <group key={index} position={[x, bodyY, depth / 2 + 0.024]}><SoftBox size={[panelWidth * 0.88, bodyHeight * 0.82, 0.045]} color="#806f5e" radius={0.016} roughness={0.62} />{[-0.22, 0.04, 0.28].map((ratio) => <SoftBox key={ratio} size={[panelWidth * 0.8, 0.025, depth * 0.18]} position={[0, ratio * bodyHeight, 0.045]} color={primary} radius={0.008} roughness={0.54} />)}</group>;
        return <group key={index} position={[x, bodyY, depth / 2 + 0.03]}><SoftBox size={[panelWidth * 0.92, bodyHeight * 0.9, 0.045]} color={glass ? secondary : index % 3 === 1 && id === "woodWarmWhite" ? primary : secondary} radius={0.014} roughness={glass ? 0.08 : 0.55} metalness={glass ? 0.05 : 0.02} opacity={glass ? 0.44 : 1} />{glass && <><SoftBox size={[panelWidth * 0.86, 0.022, 0.065]} position={[0, bodyHeight * 0.43, 0.02]} color={accent} radius={0.006} metalness={0.64} /><SoftBox size={[panelWidth * 0.86, 0.022, 0.065]} position={[0, -bodyHeight * 0.43, 0.02]} color={accent} radius={0.006} metalness={0.64} /></>}{id !== "handleless" && id !== "fullHeightFlat" && !glass && <SoftBox size={[Math.min(0.16, panelWidth * 0.42), 0.014, 0.018]} position={[0, 0, 0.045]} color={accent} radius={0.005} metalness={0.68} />}</group>;
      })}
      {counter && <SoftBox size={[width + 0.08, 0.055, depth + 0.06]} position={[0, floorY + lift + bodyHeight + 0.028, 0]} color={asset.assetType === "bathroomVanity" ? "#ded2bd" : secondary} radius={0.022} roughness={0.34} />}
      {!floating && <SoftBox size={[width * 0.88, 0.09, depth * 0.72]} position={[0, floorY + 0.045, -depth * 0.04]} color="#5a554e" radius={0.018} roughness={0.62} />}
      {floating && <SoftBox size={[width * 0.86, 0.018, 0.025]} position={[0, floorY + lift - 0.02, depth / 2 + 0.02]} color="#ffe4b5" radius={0.006} roughness={0.2} metalness={0.02} />}
      {id === "handleless" && <SoftBox size={[width * 0.9, 0.025, 0.035]} position={[0, bodyY + bodyHeight * 0.12, depth / 2 + 0.065]} color="#887966" radius={0.007} roughness={0.5} />}
    </group>
  );
}

export function FurnitureFamily3D(props: Props) {
  const family = resolveFurnitureVariant(props.item, props.asset.assetType).family;
  if (family === "bed") return <BedFamily {...props} />;
  if (family === "sofa") return <SofaFamily {...props} />;
  if (family === "diningTable") return <DiningTableFamily {...props} />;
  if (family === "coffeeTable") return <CoffeeTableFamily {...props} />;
  if (family === "chair") return <ChairFamily {...props} />;
  if (family === "cabinet") return <CabinetFamily {...props} />;
  return null;
}
