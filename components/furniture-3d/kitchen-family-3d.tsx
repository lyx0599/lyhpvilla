"use client";

import type { ReactNode } from "react";
import type { ResolvedRender3DMaterialLayer, Render3DMaterialRole } from "@/lib/render3d-assets";
import type { KitchenVisualConfig } from "@/types/space";
import { FurnitureMaterial } from "./materials";
import { CylinderPart, RoundedPart } from "./primitives";
import type { FurnitureFamily3DProps } from "./types";

function layerFor(props: FurnitureFamily3DProps, roles: Render3DMaterialRole[], fallback: ResolvedRender3DMaterialLayer) {
  const { primary, secondary, accent } = props.asset.materials;
  return [primary, secondary, accent].find((layer) => roles.includes(layer.role)) ?? fallback;
}

function kitchenConfig(props: FurnitureFamily3DProps): KitchenVisualConfig {
  return props.item.render3d?.kitchenVisual ?? {};
}

function WarmTaskStrip({ width, y, z, material }: { width: number; y: number; z: number; material: ResolvedRender3DMaterialLayer }) {
  return (
    <mesh position={[0, y, z]}>
      <boxGeometry args={[width, 0.016, 0.022]} />
      <FurnitureMaterial layer={material} role="light" color="#ffe4ad" emissiveIntensity={0.82} roughness={0.18} />
    </mesh>
  );
}

function AnimatedKitchenLeaf({
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
    <group position={[position[0] + hingeOffset, position[1], position[2]]} rotation={[0, -hingeSide * openAmount * Math.PI * 0.48, 0]}>
      <group position={[-hingeOffset, 0, 0]}>{children}</group>
    </group>
  );
}

export function ParametricCountertop({
  props,
  width,
  depth,
  y,
  overhangMm = 25,
  thicknessMm = 38,
  backsplashHeightMm = 80
}: {
  props: FurnitureFamily3DProps;
  width: number;
  depth: number;
  y: number;
  overhangMm?: number;
  thicknessMm?: number;
  backsplashHeightMm?: number;
}) {
  const stone = layerFor(props, ["stone", "ceramic"], props.asset.materials.secondary);
  const config = kitchenConfig(props);
  const overhang = Math.max(0, overhangMm) / 1000;
  const thickness = Math.max(0.024, thicknessMm / 1000);
  const backsplashHeight = Math.max(0, backsplashHeightMm / 1000);
  const thinEdge = config.countertopEdge === "thin";
  const slabThickness = thinEdge ? Math.min(0.026, thickness) : thickness;
  return (
    <group>
      <RoundedPart
        size={[width + overhang * 2, slabThickness, depth + overhang * 1.4]}
        position={[0, y - slabThickness / 2, overhang * 0.2]}
        radius={thinEdge ? 0.008 : 0.018}
        detailLevel={props.asset.detailLevel}
        material={stone}
        role="stone"
        repeat={[Math.max(2, width * 2.4), Math.max(1, depth * 2)]}
        roughness={0.31}
      />
      {config.showCountertopSeams !== false && width > 1.45 && [-0.25, 0.25].map((ratio) => (
        <RoundedPart key={ratio} size={[0.007, 0.006, depth * 0.84]} position={[ratio * width, y + 0.001, overhang * 0.2]} radius={0.002} detailLevel={props.asset.detailLevel} material={stone} role="stone" color="#9f978c" roughness={0.46} />
      ))}
      {config.countertopEdge === "waterfall" && [-1, 1].map((side) => (
        <RoundedPart key={side} size={[slabThickness, Math.max(0.2, y + props.height / 2), depth + overhang]} position={[side * (width / 2 + overhang - slabThickness / 2), y / 2 - props.height / 4, overhang * 0.1]} radius={0.009} detailLevel={props.asset.detailLevel} material={stone} role="stone" repeat={[1, 3]} roughness={0.32} />
      ))}
      {backsplashHeight > 0 && (
        <RoundedPart
          size={[width, backsplashHeight, 0.024]}
          position={[0, y + backsplashHeight / 2 - thickness * 0.15, -depth / 2 + 0.015]}
          radius={0.008}
          detailLevel={props.asset.detailLevel}
          material={stone}
          role="stone"
          repeat={[Math.max(2, width * 2), 1]}
          roughness={0.36}
        />
      )}
    </group>
  );
}

function CabinetFrontPanel({
  props,
  width,
  height,
  x,
  y,
  z,
  drawerRows = 0,
  appliance = false,
  openAmount = 0,
  openDistance = 0.3,
  hingeSide = -1
}: {
  props: FurnitureFamily3DProps;
  width: number;
  height: number;
  x: number;
  y: number;
  z: number;
  drawerRows?: number;
  appliance?: boolean;
  openAmount?: number;
  openDistance?: number;
  hingeSide?: -1 | 1;
}) {
  const wood = layerFor(props, ["wood"], props.asset.materials.primary);
  const panel = layerFor(props, ["ceramic", "wood"], props.asset.materials.secondary);
  const metal = layerFor(props, ["metal"], props.asset.materials.accent);
  const config = kitchenConfig(props);
  const frontStyle = config.frontStyle ?? "slab";
  const handleStyle = config.handleStyle ?? "bar";
  const rows = drawerRows > 0 ? drawerRows : 1;
  const gap = 0.014;
  const rowHeight = (height - gap * (rows - 1)) / rows;
  if (appliance) {
    return (
      <group position={[x, y, z]}>
        <RoundedPart size={[width, height, 0.045]} radius={0.01} detailLevel={props.asset.detailLevel} material={metal} role="metal" color="#343331" />
        <RoundedPart size={[width * 0.82, height * 0.58, 0.018]} position={[0, height * 0.05, 0.032]} radius={0.008} detailLevel={props.asset.detailLevel} material={metal} role="glass" color="#17191a" opacity={0.86} />
        <RoundedPart size={[width * 0.62, 0.018, 0.02]} position={[0, height * 0.39, 0.038]} radius={0.006} detailLevel={props.asset.detailLevel} material={metal} role="metal" />
        {[-0.14, 0, 0.14].map((offset) => (
          <CylinderPart key={offset} radiusTop={0.012} height={0.012} position={[offset * width, height * 0.35, 0.044]} rotation={[Math.PI / 2, 0, 0]} material={metal} role="metal" sides={14} />
        ))}
      </group>
    );
  }
  return (
    <group>
      {Array.from({ length: rows }, (_, index) => {
        const rowY = y - height / 2 + rowHeight / 2 + index * (rowHeight + gap);
        const face = <>
            <RoundedPart
              size={[width, rowHeight, 0.04]}
              radius={0.009}
              detailLevel={props.asset.detailLevel}
              material={index % 2 ? panel : wood}
              role={index % 2 ? "ceramic" : "wood"}
              repeat={[Math.max(1, width * 2), 1]}
            />
            {frontStyle === "shaker" && (
              <>
                {[-1, 1].map((side) => <RoundedPart key={`v-${side}`} size={[0.035, rowHeight * 0.78, 0.012]} position={[side * width * 0.39, 0, 0.027]} radius={0.004} detailLevel={props.asset.detailLevel} material={wood} role="wood" />)}
                {[-1, 1].map((side) => <RoundedPart key={`h-${side}`} size={[width * 0.78, 0.035, 0.012]} position={[0, side * rowHeight * 0.38, 0.027]} radius={0.004} detailLevel={props.asset.detailLevel} material={wood} role="wood" />)}
              </>
            )}
            {frontStyle === "fluted" && Array.from({ length: 6 }, (_, rib) => (
              <RoundedPart key={rib} size={[0.012, rowHeight * 0.86, 0.012]} position={[-width * 0.36 + rib * width * 0.144, 0, 0.028]} radius={0.003} detailLevel={props.asset.detailLevel} material={wood} role="wood" color="#8c735a" />
            ))}
            {config.showInternalShadowGap !== false && <RoundedPart size={[width * 0.92, 0.008, 0.008]} position={[0, -rowHeight * 0.46, 0.029]} radius={0.002} detailLevel={props.asset.detailLevel} material={metal} role="metal" color="#332f2b" />}
            {handleStyle === "bar" && <RoundedPart size={[width * 0.48, 0.012, 0.016]} position={[0, rowHeight * 0.34, 0.035]} radius={0.004} detailLevel={props.asset.detailLevel} material={metal} role="metal" />}
            {handleStyle === "edgePull" && <RoundedPart size={[width * 0.68, 0.018, 0.014]} position={[0, rowHeight * 0.43, 0.034]} radius={0.003} detailLevel={props.asset.detailLevel} material={metal} role="metal" color="#6f655b" />}
            {handleStyle === "groove" && <RoundedPart size={[width * 0.58, 0.016, 0.01]} position={[0, rowHeight * 0.34, 0.031]} radius={0.006} detailLevel={props.asset.detailLevel} material={metal} role="metal" color="#4a423a" />}
            {handleStyle === "knob" && <CylinderPart radiusTop={0.018} height={0.026} position={[width * 0.31, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]} material={metal} role="metal" sides={16} />}
          </>;
        if (drawerRows > 0) {
          return <group key={index} position={[x, rowY, z + openAmount * openDistance]}>{face}</group>;
        }
        return (
          <AnimatedKitchenLeaf key={index} position={[x, rowY, z]} width={width} hingeSide={hingeSide} openAmount={openAmount}>
            {face}
          </AnimatedKitchenLeaf>
        );
      })}
    </group>
  );
}

export function ParametricCabinet(props: FurnitureFamily3DProps) {
  const { asset, item, width, depth, height } = props;
  const runtimeOpenAmount = Math.max(0, Math.min(1, props.openAmount ?? 0));
  const config = kitchenConfig(props);
  const kind = config.cabinetKind ?? (asset.assetType === "wallCabinet" ? "wall" : asset.assetType === "island" ? "island" : "base");
  const wallMounted = kind === "wall";
  const island = kind === "island";
  const floorY = -height / 2;
  const toeKick = wallMounted ? 0 : Math.min(0.13, Math.max(0.07, (config.toeKickHeightMm ?? 95) / 1000));
  const topThickness = wallMounted ? 0.028 : Math.min(0.065, Math.max(0.026, (config.countertopThicknessMm ?? 38) / 1000));
  const bodyHeight = Math.max(0.18, height - toeKick - topThickness);
  const bodyY = floorY + toeKick + bodyHeight / 2;
  const bayCount = Math.max(2, Math.min(7, config.doorCount ?? Math.round(width / (wallMounted ? 0.48 : 0.55))));
  const gap = Math.min(0.018, width * 0.01);
  const bayWidth = (width - gap * (bayCount + 1)) / bayCount;
  const frontZ = depth / 2 + 0.018;
  const wood = layerFor(props, ["wood"], asset.materials.primary);
  const metal = layerFor(props, ["metal"], asset.materials.accent);
  const applianceIndex = Math.max(0, Math.min(bayCount - 1, Math.floor(bayCount * 0.22)));
  const appliancePanel = config.appliancePanel ?? (/水槽/.test(item.name) ? "dishwasher" : /灶/.test(item.name) ? "oven" : "none");
  const drawerRows = Math.max(0, Math.min(4, config.drawerCount ?? (island ? 3 : /灶|备餐/.test(item.name) ? 3 : 1)));
  return (
    <group name="parametric-cabinet">
      <RoundedPart size={[width, bodyHeight, depth * 0.92]} position={[0, bodyY, -depth * 0.02]} radius={0.016} detailLevel={asset.detailLevel} material={wood} role="wood" repeat={[Math.max(3, bayCount), 3]} />
      {runtimeOpenAmount > 0.01 && <RoundedPart size={[width * 0.95, bodyHeight * 0.88, 0.022]} position={[0, bodyY, frontZ - 0.035]} radius={0.005} detailLevel={asset.detailLevel} material={metal} role="wood" color="#39322c" />}
      {[-1, 1].map((side) => <RoundedPart key={side} size={[Math.max(0.02, (config.endPanelThicknessMm ?? 22) / 1000), bodyHeight * 1.02, depth * 0.96]} position={[side * (width / 2 - 0.012), bodyY, -depth * 0.01]} radius={0.009} detailLevel={asset.detailLevel} material={wood} role="wood" repeat={[1, 3]} />)}
      {Array.from({ length: bayCount }, (_, index) => {
        const x = -width / 2 + gap + bayWidth / 2 + index * (bayWidth + gap);
        const appliance = appliancePanel !== "none" && index === applianceIndex;
        return (
          <CabinetFrontPanel
            key={index}
            props={props}
            width={bayWidth}
            height={bodyHeight * 0.91}
            x={x}
            y={bodyY}
            z={frontZ}
            drawerRows={!appliance && (index === bayCount - 1 || (island && index === 0)) ? drawerRows : 0}
            appliance={appliance}
            openAmount={appliance ? 0 : runtimeOpenAmount}
            openDistance={Math.min(0.36, depth * 0.66)}
            hingeSide={index % 2 ? 1 : -1}
          />
        );
      })}
      {!wallMounted && <RoundedPart size={[width * 0.9, toeKick, depth * 0.74]} position={[0, floorY + toeKick / 2, -depth * 0.06]} radius={0.01} detailLevel={asset.detailLevel} material={metal} role="wood" color="#514b44" />}
      {!wallMounted && <RoundedPart size={[width * 0.84, 0.018, 0.022]} position={[0, floorY + toeKick + 0.01, depth * 0.42]} radius={0.004} detailLevel={asset.detailLevel} material={metal} role="metal" color="#302b27" />}
      {wallMounted ? (
        <WarmTaskStrip width={width * 0.9} y={floorY + 0.012} z={frontZ - 0.03} material={asset.materials.accent} />
      ) : (
        <ParametricCountertop
          props={props}
          width={width}
          depth={depth}
          y={height / 2}
          overhangMm={config.overhangMm ?? (island ? 90 : 28)}
          thicknessMm={config.countertopThicknessMm}
          backsplashHeightMm={island ? 0 : config.backsplashHeightMm ?? 75}
        />
      )}
      {island && (
        <>
          <RoundedPart size={[width * 0.84, bodyHeight * 0.54, 0.035]} position={[0, bodyY + bodyHeight * 0.08, -depth / 2 - 0.018]} radius={0.01} detailLevel={asset.detailLevel} material={wood} role="wood" />
          <RoundedPart size={[width * 0.9, 0.026, depth * 0.16]} position={[0, floorY + toeKick + 0.24, -depth / 2 - 0.12]} radius={0.009} detailLevel={asset.detailLevel} material={metal} role="metal" />
        </>
      )}
      {config.showUpperCabinets && !wallMounted && (
        <group position={[0, 1.27 - height / 2, -depth * 0.08]}>
          <RoundedPart size={[width * 0.92, 0.72, depth * 0.54]} radius={0.014} detailLevel={asset.detailLevel} material={wood} role="wood" repeat={[Math.max(3, bayCount), 2]} />
          {Array.from({ length: bayCount }, (_, index) => {
            const upperBayWidth = width * 0.86 / bayCount;
            const x = -width * 0.43 + upperBayWidth * (index + 0.5);
            return (
              <AnimatedKitchenLeaf key={index} position={[x, 0, depth * 0.285]} width={upperBayWidth - 0.012} hingeSide={index % 2 ? 1 : -1} openAmount={runtimeOpenAmount}>
                <RoundedPart size={[upperBayWidth - 0.012, 0.64, 0.035]} radius={0.008} detailLevel={asset.detailLevel} material={index % 3 === 1 ? asset.materials.secondary : wood} role={index % 3 === 1 ? "ceramic" : "wood"} />
              </AnimatedKitchenLeaf>
            );
          })}
          <WarmTaskStrip width={width * 0.82} y={-0.37} z={depth * 0.25} material={asset.materials.accent} />
        </group>
      )}
    </group>
  );
}

export function ParametricSink(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const config = kitchenConfig(props);
  const metal = layerFor(props, ["metal"], asset.materials.secondary);
  const topY = height / 2;
  const rim = Math.min(0.045, Math.max(0.022, Math.min(width, depth) * 0.07));
  const bowlWidth = width * 0.78;
  const bowlDepth = depth * 0.72;
  const bowlHeight = Math.max(0.1, height * 0.72);
  const bowlCount = config.sinkBowls ?? 1;
  const faucetX = config.faucetPlacement === "center" || bowlCount === 2 ? 0 : width * 0.32;
  const bowlGap = bowlCount === 2 ? 0.028 : 0;
  const eachBowlWidth = bowlCount === 2 ? (bowlWidth - bowlGap) / 2 : bowlWidth;
  return (
    <group name="parametric-sink">
      <RoundedPart size={[bowlWidth + rim * 2, 0.026, rim]} position={[0, topY + 0.006, -bowlDepth / 2 - rim / 2]} radius={0.008} detailLevel={asset.detailLevel} material={metal} role="metal" roughness={0.2} metalness={0.72} />
      <RoundedPart size={[bowlWidth + rim * 2, 0.026, rim]} position={[0, topY + 0.006, bowlDepth / 2 + rim / 2]} radius={0.008} detailLevel={asset.detailLevel} material={metal} role="metal" roughness={0.2} metalness={0.72} />
      {[-1, 1].map((side) => <RoundedPart key={side} size={[rim, 0.026, bowlDepth]} position={[side * (bowlWidth / 2 + rim / 2), topY + 0.006, 0]} radius={0.008} detailLevel={asset.detailLevel} material={metal} role="metal" roughness={0.2} metalness={0.72} />)}
      {Array.from({ length: bowlCount }, (_, index) => {
        const x = bowlCount === 2 ? (index ? 1 : -1) * (eachBowlWidth + bowlGap) / 2 : 0;
        return (
          <group key={index} position={[x, 0, 0]}>
            <RoundedPart size={[eachBowlWidth, 0.035, bowlDepth]} position={[0, topY - bowlHeight, 0]} radius={0.045} detailLevel={asset.detailLevel} material={metal} role="metal" color="#aeb7b8" roughness={0.22} metalness={0.68} />
            <RoundedPart size={[eachBowlWidth, bowlHeight * 0.82, 0.028]} position={[0, topY - bowlHeight * 0.52, -bowlDepth / 2 + 0.02]} radius={0.012} detailLevel={asset.detailLevel} material={metal} role="metal" color="#b9c1c2" roughness={0.24} metalness={0.64} />
            <RoundedPart size={[eachBowlWidth, bowlHeight * 0.82, 0.028]} position={[0, topY - bowlHeight * 0.52, bowlDepth / 2 - 0.02]} radius={0.012} detailLevel={asset.detailLevel} material={metal} role="metal" color="#b9c1c2" roughness={0.24} metalness={0.64} />
            <CylinderPart radiusTop={0.028} height={0.012} position={[0, topY - bowlHeight + 0.022, 0]} material={metal} role="metal" color="#6b7475" sides={24} />
          </group>
        );
      })}
      <group position={[faucetX, 0, 0]} name="single-centered-faucet">
        <CylinderPart radiusTop={0.018} height={0.29} position={[0, topY + 0.145, -depth * 0.32]} material={metal} role="metal" sides={16} />
        <CylinderPart radiusTop={0.018} height={0.24} position={[0, topY + 0.282, -depth * 0.2]} rotation={[Math.PI / 2, 0, 0]} material={metal} role="metal" sides={16} />
        <CylinderPart radiusTop={0.021} radiusBottom={0.018} height={0.055} position={[0, topY + 0.255, -depth * 0.08]} material={metal} role="metal" sides={16} />
        <RoundedPart size={[0.065, 0.014, 0.014]} position={[0.055, topY + 0.22, -depth * 0.315]} rotation={[0, 0, -0.18]} radius={0.004} detailLevel={asset.detailLevel} material={metal} role="metal" />
      </group>
      <CylinderPart radiusTop={0.022} radiusBottom={0.026} height={0.075} position={[-width * 0.34, topY + 0.038, -depth * 0.28]} material={asset.materials.accent} role="metal" color="#b89b72" sides={18} />
    </group>
  );
}

export function ParametricRangeHood(props: FurnitureFamily3DProps) {
  const { asset, item, width } = props;
  const metal = layerFor(props, ["metal"], asset.materials.primary);
  const elevation = (item.render3d?.elevationMm ?? 0) / 1000;
  const groupWorldY = elevation + props.height / 2 + 0.035;
  const hoodWidth = Math.max(0.68, width * 0.88);
  const hoodHeight = 0.28;
  const hoodBottom = 1.48;
  const centerY = hoodBottom + hoodHeight / 2 - groupWorldY;
  return (
    <group name="parametric-range-hood" position={[0, centerY, -props.depth * 0.04]}>
      <RoundedPart size={[hoodWidth, hoodHeight, 0.38]} radius={0.025} detailLevel={asset.detailLevel} material={metal} role="metal" color="#373735" roughness={0.28} metalness={0.64} />
      <RoundedPart size={[hoodWidth * 0.82, 0.026, 0.28]} position={[0, -hoodHeight / 2 - 0.012, 0.035]} radius={0.009} detailLevel={asset.detailLevel} material={metal} role="metal" color="#191a19" />
      {[-0.2, -0.1, 0, 0.1, 0.2].map((x) => <RoundedPart key={x} size={[0.028, 0.018, 0.22]} position={[x * hoodWidth, -hoodHeight / 2 - 0.03, 0.04]} radius={0.004} detailLevel={asset.detailLevel} material={metal} role="metal" color="#777b78" />)}
      {[-0.28, 0.28].map((x) => <CylinderPart key={x} radiusTop={0.018} height={0.012} position={[x * hoodWidth, -hoodHeight / 2 - 0.036, 0.12]} material={asset.materials.accent} role="light" color="#ffe5a8" emissiveIntensity={0.75} sides={18} />)}
      <RoundedPart size={[hoodWidth * 0.3, 0.72, 0.25]} position={[0, hoodHeight / 2 + 0.36, -0.03]} radius={0.014} detailLevel={asset.detailLevel} material={metal} role="metal" color="#454542" />
      <CylinderPart radiusTop={0.095} height={0.035} position={[0, hoodHeight / 2 + 0.72, -0.03]} material={asset.materials.accent} role="metal" sides={28} />
    </group>
  );
}

export function ParametricCooktop(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const metal = layerFor(props, ["metal"], asset.materials.primary);
  const topY = height / 2;
  const burnerRadius = Math.min(width, depth) * 0.14;
  return (
    <group name="parametric-cooktop">
      <RoundedPart size={[width * 0.94, 0.035, depth * 0.88]} position={[0, topY, 0]} radius={0.018} detailLevel={asset.detailLevel} material={metal} role="metal" color="#151718" roughness={0.16} metalness={0.46} />
      {[-0.24, 0.24].flatMap((x) => [-0.2, 0.2].map((z) => (
        <group key={`${x}-${z}`} position={[x * width, topY + 0.025, z * depth]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[burnerRadius, 0.014, 10, 32]} />
            <FurnitureMaterial layer={metal} role="metal" color="#5c6262" roughness={0.24} metalness={0.65} />
          </mesh>
          <CylinderPart radiusTop={burnerRadius * 0.42} height={0.016} position={[0, 0.006, 0]} material={metal} role="metal" color="#2a2d2d" sides={24} />
          {[0, Math.PI / 2].map((rotation) => <RoundedPart key={rotation} size={[burnerRadius * 2.35, 0.018, 0.018]} position={[0, 0.018, 0]} rotation={[0, rotation, 0]} radius={0.004} detailLevel={asset.detailLevel} material={metal} role="metal" color="#383c3c" />)}
        </group>
      )))}
      {[-0.22, 0, 0.22].map((x) => <CylinderPart key={x} radiusTop={0.027} height={0.024} position={[x * width, topY + 0.032, depth * 0.34]} rotation={[Math.PI / 2, 0, 0]} material={asset.materials.accent} role="metal" sides={18} />)}
      {kitchenConfig(props).showRangeHood !== false && <ParametricRangeHood {...props} />}
    </group>
  );
}

export function ParametricFridge(props: FurnitureFamily3DProps) {
  const { asset, width, depth, height } = props;
  const config = kitchenConfig(props);
  const metal = layerFor(props, ["metal"], asset.materials.secondary);
  const wood = layerFor(props, ["wood"], asset.materials.accent);
  const showCabinetSurround = config.fridgeSurround !== "none";
  const frontZ = depth / 2 + 0.018;
  const doorGap = 0.018;
  const topDoorHeight = height * 0.63;
  const lowerDoorHeight = height * 0.25;
  return (
    <group name="parametric-fridge">
      <RoundedPart size={[width * 0.92, height * 0.96, depth * 0.94]} radius={0.026} detailLevel={asset.detailLevel} material={metal} role="metal" color="#686c6b" roughness={0.3} metalness={0.48} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width * 0.23 + doorGap / 2), height * 0.11, frontZ]}>
          <RoundedPart size={[width * 0.45 - doorGap, topDoorHeight, 0.045]} radius={0.014} detailLevel={asset.detailLevel} material={metal} role="metal" color={side < 0 ? "#767b7a" : "#6d7271"} roughness={0.26} metalness={0.54} />
          <RoundedPart size={[0.022, topDoorHeight * 0.66, 0.025]} position={[-side * width * 0.16, -topDoorHeight * 0.04, 0.035]} radius={0.006} detailLevel={asset.detailLevel} material={metal} role="metal" color="#c5c9c7" roughness={0.2} metalness={0.72} />
        </group>
      ))}
      <RoundedPart size={[width * 0.91, lowerDoorHeight, 0.045]} position={[0, -height * 0.35, frontZ]} radius={0.014} detailLevel={asset.detailLevel} material={metal} role="metal" color="#646968" roughness={0.28} metalness={0.52} />
      <RoundedPart size={[width * 0.42, 0.022, 0.025]} position={[0, -height * 0.25, frontZ + 0.035]} radius={0.006} detailLevel={asset.detailLevel} material={metal} role="metal" color="#c5c9c7" />
      {showCabinetSurround && <RoundedPart size={[width + 0.11, 0.06, depth + 0.1]} position={[0, height / 2 + 0.015, -0.015]} radius={0.014} detailLevel={asset.detailLevel} material={wood} role="wood" />}
      {showCabinetSurround && [-1, 1].map((side) => <RoundedPart key={side} size={[0.055, height + 0.05, depth + 0.08]} position={[side * (width / 2 + 0.028), 0, -0.015]} radius={0.012} detailLevel={asset.detailLevel} material={wood} role="wood" repeat={[1, 5]} />)}
      <RoundedPart size={[width * 0.76, 0.055, depth * 0.7]} position={[0, -height / 2 + 0.028, -depth * 0.03]} radius={0.01} detailLevel={asset.detailLevel} material={metal} role="metal" color="#323433" />
      <group position={[0, height * 0.47, frontZ + 0.026]}>
        {Array.from({ length: 8 }, (_, index) => <RoundedPart key={index} size={[width * 0.055, 0.01, 0.012]} position={[(-0.245 + index * 0.07) * width, 0, 0]} radius={0.002} detailLevel={asset.detailLevel} material={metal} role="metal" color="#292c2b" />)}
      </group>
      <RoundedPart size={[width * 0.18, height * 0.085, 0.018]} position={[width * 0.25, height * 0.13, frontZ + 0.034]} radius={0.008} detailLevel={asset.detailLevel} material={metal} role="glass" color="#151a1d" opacity={0.82} />
    </group>
  );
}

function WaterBar3D(props: FurnitureFamily3DProps) {
  return (
    <group name="parametric-water-bar">
      <ParametricCabinet {...props} />
      <group position={[props.width * 0.28, props.height / 2 - 0.065, 0]}>
        <ParametricSink {...props} width={props.width * 0.28} depth={props.depth * 0.52} height={0.13} />
      </group>
      <group position={[-props.width * 0.25, props.height / 2 + 0.12, -props.depth * 0.06]}>
        <CylinderPart radiusTop={0.052} radiusBottom={0.065} height={0.19} position={[0, 0, 0]} material={props.asset.materials.accent} role="metal" color="#e7e1d7" sides={22} />
        <RoundedPart size={[0.14, 0.13, 0.1]} position={[0.14, 0.01, 0]} radius={0.018} detailLevel={props.asset.detailLevel} material={props.asset.materials.primary} role="generic" color="#d8c5ad" />
      </group>
    </group>
  );
}

export function KitchenFamily3D(props: FurnitureFamily3DProps) {
  const type = props.asset.assetType;
  if (type === "sink") return <ParametricSink {...props} />;
  if (type === "cooktop") return <ParametricCooktop {...props} />;
  if (type === "fridge") return <ParametricFridge {...props} />;
  if (type === "sideboard" && (props.item.serviceRequirements?.water || props.item.mepMeta?.needsWaterSupply || /水吧/.test(props.item.name))) return <WaterBar3D {...props} />;
  return <ParametricCabinet {...props} />;
}
