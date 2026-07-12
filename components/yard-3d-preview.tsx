"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { FixedCameraView, Furniture, HouseFence, HouseOutdoor, HouseOutdoorSurface, HouseStructure, MmPoint } from "@/types/space";
import { getSyncCoordinateSystem, normalizeObjectForSync, resolveVisibility } from "@/lib/object-sync-adapter";

type Yard3DPreviewProps = {
  houseStructure: HouseStructure;
  furniture: Furniture[];
  initialFocus?: YardPreviewFocus;
  cameraViews?: FixedCameraView[];
  cameraViewRequest?: { view: FixedCameraView; nonce: number } | null;
  onSelectCameraView?: (view: FixedCameraView) => void;
  onExit?: () => void;
  onEditYard?: (yard: "north" | "south") => void;
  selectedObjectId?: string;
  onSelectObject?: (objectId: string) => void;
};

type YardPreviewFocus = "all" | "north" | "south";

const MM_TO_M = 0.001;
const YardCoordinateContext = createContext(getSyncCoordinateSystem());
const BUILDING_POLYGON: MmPoint[] = [
  { x: 950, y: 350 },
  { x: 9495, y: 350 },
  { x: 9495, y: 7800 },
  { x: 950, y: 7800 }
];
const FALLBACK_OUTDOORS: HouseOutdoor[] = [
  {
    id: "OD-1F-NORTH-001",
    floorId: "1F",
    name: "北院",
    spaceType: "Outdoor",
    geometryType: "polygon",
    outdoorType: "bbq",
    polygon: [
      { x: 950, y: -1650 },
      { x: 9495, y: -1650 },
      { x: 9495, y: 350 },
      { x: 950, y: 350 }
    ],
    area: 17090000
  },
  {
    id: "OD-1F-SOUTH-001",
    floorId: "1F",
    name: "南院",
    spaceType: "Outdoor",
    geometryType: "polygon",
    outdoorType: "backYard",
    polygon: [
      { x: 950, y: 7800 },
      { x: 9495, y: 7800 },
      { x: 9495, y: 11800 },
      { x: 950, y: 11800 }
    ],
    area: 34180000
  }
];

const surfaceColors: Record<HouseOutdoorSurface["material"], string> = {
  stone: "#b7aaa0",
  slate: "#9ca3af",
  pebble: "#d6bd8b",
  wood: "#b98254",
  concrete: "#cfd6df",
  tile: "#d8d3c7",
  gravel: "#d7c2a3",
  grass: "#86b96b",
  shrub: "#6fad63",
  soil: "#9a7656"
};

const furnitureColors: Record<string, string> = {
  "ph-1f-north-bbq-island": "#8a97a3",
  "ph-1f-south-drying-rack": "#64748b",
  "ph-1f-south-lounge-set": "#a88b6b",
  "ph-1f-south-dog-house": "#9b6b42",
  "ph-1f-south-pet-water": "#64b5d6"
};

const cameraPresets: Record<YardPreviewFocus, { position: [number, number, number]; target: [number, number, number] }> = {
  all: { position: [8.2, 7.2, 10.5], target: [0, 0.3, 0] },
  north: { position: [4.6, 4.8, -9.4], target: [0, 0.3, -5.7] },
  south: { position: [6.2, 5.2, 10.2], target: [1.4, 0.3, 5.1] }
};

function toScenePoint(point: MmPoint): [number, number] {
  return [point.x * MM_TO_M, point.y * MM_TO_M];
}

function useFurniturePoint(item: Furniture) {
  const coordinateSystem = useContext(YardCoordinateContext);
  return normalizeObjectForSync(item, coordinateSystem).positionMm;
}

function getPolygonCenter(points: MmPoint[]) {
  const center = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  return { x: center.x / points.length, y: center.y / points.length };
}

function getSegmentLength(start: MmPoint, end: MmPoint) {
  return Math.hypot(end.x - start.x, end.y - start.y) * MM_TO_M;
}

function getSegmentAngle(start: MmPoint, end: MmPoint) {
  return -Math.atan2((end.y - start.y) * MM_TO_M, (end.x - start.x) * MM_TO_M);
}

function createShapeGeometry(points: MmPoint[]) {
  const shape = new THREE.Shape();
  points.forEach((point, index) => {
    const [x, z] = toScenePoint(point);
    if (index === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function createLabelTexture(text: string) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const fontSize = 42;
  const fontFamily = "-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif";
  const font = `700 ${fontSize}px ${fontFamily}`;
  const metricsContext = context;
  const measuredWidth = metricsContext ? (() => {
    metricsContext.font = font;
    return metricsContext.measureText(text).width;
  })() : text.length * fontSize;
  const paddingX = 26;
  const paddingY = 15;
  canvas.width = Math.ceil(measuredWidth + paddingX * 2);
  canvas.height = fontSize + paddingY * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.strokeStyle = "rgba(23, 32, 51, 0.16)";
  ctx.lineWidth = 3;
  roundRect(ctx, 2, 2, canvas.width - 4, canvas.height - 4, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#172033";
  ctx.fillText(text, paddingX, canvas.height / 2 + 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function OutdoorSurfaceMesh({ surface, yOffset = 0.015 }: { surface: HouseOutdoorSurface | HouseOutdoor; yOffset?: number }) {
  const geometry = useMemo(() => createShapeGeometry("polygon" in surface ? surface.polygon : []), [surface]);
  const color = "material" in surface ? surfaceColors[surface.material] ?? "#8fc878" : "#8fc878";
  const roughness = "surfaceType" in surface && surface.surfaceType === "path" ? 0.82 : 0.92;
  return (
    <mesh geometry={geometry} position={[0, yOffset, 0]} receiveShadow>
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.02} side={THREE.DoubleSide} />
    </mesh>
  );
}

function LabelSprite({ text, position }: { text: string; position: [number, number, number] }) {
  const texture = useMemo(() => createLabelTexture(text), [text]);
  const aspect = texture.image ? texture.image.width / texture.image.height : Math.max(2.4, text.length * 0.45);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[aspect * 0.34, 0.34, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} />
    </sprite>
  );
}

function BuildingMass() {
  const center = getPolygonCenter(BUILDING_POLYGON);
  const [x, z] = toScenePoint(center);
  return (
    <group>
      <mesh position={[x, 0.86, z]} castShadow receiveShadow>
        <boxGeometry args={[8.545, 1.72, 7.45]} />
        <meshStandardMaterial color="#d9e0e7" roughness={0.86} metalness={0.02} />
      </mesh>
      <LabelSprite text="建筑主体" position={[x + 1.7, 2.25, z - 1.05]} />
    </group>
  );
}

function OutdoorArea({ outdoor }: { outdoor: HouseOutdoor }) {
  const center = getPolygonCenter(outdoor.polygon);
  const [x, z] = toScenePoint(center);
  return (
    <group>
      <OutdoorSurfaceMesh surface={outdoor} yOffset={0} />
      <LabelSprite text={outdoor.name.includes("北") ? "北院" : outdoor.name.includes("南") ? "南院" : outdoor.name} position={[x, 1.35, z]} />
    </group>
  );
}

function FenceSegment({ fence }: { fence: HouseFence }) {
  const [x1, z1] = toScenePoint(fence.start);
  const [x2, z2] = toScenePoint(fence.end);
  const length = getSegmentLength(fence.start, fence.end);
  const height = Math.max(0.65, fence.height * MM_TO_M);
  const postCount = Math.max(2, Math.ceil(length / 1.25));
  return (
    <group position={[(x1 + x2) / 2, 0, (z1 + z2) / 2]} rotation={[0, getSegmentAngle(fence.start, fence.end), 0]}>
      {Array.from({ length: postCount }, (_, index) => {
        const x = -length / 2 + (index / Math.max(1, postCount - 1)) * length;
        return (
          <mesh key={`${fence.id}-post-${index}`} position={[x, height / 2, 0]} castShadow>
            <boxGeometry args={[0.07, height, 0.07]} />
            <meshStandardMaterial color="#8f785e" roughness={0.7} />
          </mesh>
        );
      })}
      {[0.3, 0.72].map((ratio) => (
        <mesh key={`${fence.id}-rail-${ratio}`} position={[0, height * ratio, 0]} castShadow>
          <boxGeometry args={[length, 0.065, 0.05]} />
          <meshStandardMaterial color="#a48a6a" roughness={0.68} />
        </mesh>
      ))}
      {Array.from({ length: Math.max(2, Math.floor(length / 0.22)) }, (_, index) => {
        const count = Math.max(2, Math.floor(length / 0.22));
        const x = -length / 2 + ((index + 0.5) / count) * length;
        return (
          <mesh key={`${fence.id}-slat-${index}`} position={[x, height * 0.52, 0]} castShadow>
            <boxGeometry args={[0.055, height * 0.78, 0.026]} />
            <meshStandardMaterial color="#b69a76" roughness={0.74} />
          </mesh>
        );
      })}
    </group>
  );
}

function FurnitureBox({ item, label = true }: { item: Furniture; label?: boolean }) {
  const point = useFurniturePoint(item);
  const [x, z] = toScenePoint(point);
  const width = item.dimensions.width * 0.01;
  const depth = item.dimensions.depth * 0.01;
  const height = Math.max(0.08, item.dimensions.height * 0.01);
  const color = furnitureColors[item.id] ?? item.color ?? "#a3a3a3";
  const rotationY = -THREE.MathUtils.degToRad(item.position.rotation ?? 0);
  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.72} metalness={0.03} />
      </mesh>
      {label && <LabelSprite text={item.name.replace("占位｜", "占位 | ")} position={[0, height + 0.45, 0]} />}
    </group>
  );
}

function BbqIsland({ item }: { item: Furniture }) {
  const point = useFurniturePoint(item);
  const [x, z] = toScenePoint(point);
  const width = item.dimensions.width * 0.01;
  const depth = item.dimensions.depth * 0.01;
  return (
    <group position={[x, 0, z]} rotation={[0, -THREE.MathUtils.degToRad(item.position.rotation ?? 0), 0]}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.9, depth]} />
        <meshStandardMaterial color="#8a97a3" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.93, 0]} castShadow>
        <boxGeometry args={[width + 0.12, 0.08, depth + 0.12]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.58} />
      </mesh>
      <mesh position={[-0.55, 0.99, 0]} castShadow>
        <boxGeometry args={[0.72, 0.055, 0.48]} />
        <meshStandardMaterial color="#1f2937" roughness={0.32} />
      </mesh>
      <mesh position={[0.56, 1, 0]} castShadow>
        <boxGeometry args={[0.78, 0.055, 0.46]} />
        <meshStandardMaterial color="#d9dee4" roughness={0.42} metalness={0.22} />
      </mesh>
      <LabelSprite text="占位 | 烧烤岛台" position={[0, 1.55, 0]} />
    </group>
  );
}

function DryingRack({ item }: { item: Furniture }) {
  const point = useFurniturePoint(item);
  const [x, z] = toScenePoint(point);
  return (
    <group position={[x, 0, z]}>
      {[-0.95, 0.95].flatMap((offsetX) => [-0.35, 0.35].map((offsetZ) => (
        <mesh key={`${offsetX}-${offsetZ}`} position={[offsetX, 0.72, offsetZ]} castShadow>
          <boxGeometry args={[0.045, 1.44, 0.045]} />
          <meshStandardMaterial color="#64748b" roughness={0.52} metalness={0.2} />
        </mesh>
      )))}
      {[0.35, -0.35, 0].map((offsetZ) => (
        <mesh key={offsetZ} position={[0, offsetZ === 0 ? 1.28 : 1.45, offsetZ]} castShadow>
          <boxGeometry args={[1.95, 0.045, 0.045]} />
          <meshStandardMaterial color={offsetZ === 0 ? "#94a3b8" : "#64748b"} roughness={0.5} metalness={0.22} />
        </mesh>
      ))}
      <LabelSprite text="占位 | 晾晒区" position={[0, 1.85, 0]} />
    </group>
  );
}

function LoungeSet({ item }: { item: Furniture }) {
  const point = useFurniturePoint(item);
  const [x, z] = toScenePoint(point);
  const chairPositions: Array<[number, number]> = [[-0.9, 0], [0.9, 0], [0, -0.75], [0, 0.75]];
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.25, 0.44, 0.72]} />
        <meshStandardMaterial color="#a88b6b" roughness={0.7} />
      </mesh>
      {chairPositions.map(([offsetX, offsetZ]) => (
        <mesh key={`${offsetX}-${offsetZ}`} position={[offsetX, 0.26, offsetZ]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.52, 0.48]} />
          <meshStandardMaterial color="#6f8f72" roughness={0.76} />
        </mesh>
      ))}
      <LabelSprite text="占位 | 休闲活动区" position={[0, 1.18, 0]} />
    </group>
  );
}

function DogHouse({ item }: { item: Furniture }) {
  const point = useFurniturePoint(item);
  const [x, z] = toScenePoint(point);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.76, 0.85]} />
        <meshStandardMaterial color="#9b6b42" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.96, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.76, 0.46, 4]} />
        <meshStandardMaterial color="#7c3f22" roughness={0.82} />
      </mesh>
      <LabelSprite text="占位 | 狗窝" position={[0, 1.45, 0]} />
    </group>
  );
}

function PetWater({ item }: { item: Furniture }) {
  const point = useFurniturePoint(item);
  const [x, z] = toScenePoint(point);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.42, 0.9, 0.42]} />
        <meshStandardMaterial color="#64b5d6" roughness={0.42} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.08, 0.42]} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.36, 0.12, 28]} />
        <meshStandardMaterial color="#8ecae6" roughness={0.36} metalness={0.05} />
      </mesh>
      <LabelSprite text="占位 | 宠物饮水" position={[0, 1.35, 0]} />
    </group>
  );
}

function YardGate({ item }: { item: Furniture }) {
  const [x, z] = toScenePoint(useFurniturePoint(item));
  const width = Math.max(1.1, item.dimensions.width * 0.01);
  const height = Math.max(1.45, item.dimensions.height * 0.01);
  return (
    <group position={[x, 0, z]} rotation={[0, -THREE.MathUtils.degToRad(item.position.rotation ?? 0), 0]}>
      {[-1, 1].map((side) => <mesh key={side} position={[side * width * 0.48, height / 2, 0]} castShadow><boxGeometry args={[0.09, height, 0.09]} /><meshStandardMaterial color="#3f4447" roughness={0.34} metalness={0.56} /></mesh>)}
      {Array.from({ length: 7 }, (_, index) => <mesh key={index} position={[-width * 0.4 + index * width * 0.133, height * 0.52, 0]} castShadow><boxGeometry args={[0.045, height * 0.78, 0.035]} /><meshStandardMaterial color="#4a5053" roughness={0.32} metalness={0.58} /></mesh>)}
      {[0.18, 0.86].map((ratio) => <mesh key={ratio} position={[0, height * ratio, 0]}><boxGeometry args={[width * 0.92, 0.055, 0.05]} /><meshStandardMaterial color="#3b4043" roughness={0.3} metalness={0.62} /></mesh>)}
    </group>
  );
}

function OutdoorCabinet({ item }: { item: Furniture }) {
  const [x, z] = toScenePoint(useFurniturePoint(item));
  const width = item.dimensions.width * 0.01;
  const depth = item.dimensions.depth * 0.01;
  return (
    <group position={[x, 0, z]} rotation={[0, -THREE.MathUtils.degToRad(item.position.rotation ?? 0), 0]}>
      <mesh position={[0, 0.46, 0]} castShadow receiveShadow><boxGeometry args={[width, 0.86, depth]} /><meshStandardMaterial color="#9c8a74" roughness={0.66} /></mesh>
      <mesh position={[0, 0.92, 0]} castShadow><boxGeometry args={[width + 0.08, 0.07, depth + 0.08]} /><meshStandardMaterial color="#c8c3bb" roughness={0.6} /></mesh>
      {[-0.25, 0.25].map((offset) => <mesh key={offset} position={[offset * width, 0.5, depth / 2 + 0.012]}><boxGeometry args={[0.018, 0.62, 0.018]} /><meshStandardMaterial color="#3f4447" roughness={0.28} metalness={0.6} /></mesh>)}
      <mesh position={[width * 0.22, 1.08, -depth * 0.1]}><cylinderGeometry args={[0.018, 0.018, 0.24, 14]} /><meshStandardMaterial color="#78644f" roughness={0.25} metalness={0.66} /></mesh>
    </group>
  );
}

function YardLight({ item }: { item: Furniture }) {
  const [x, z] = toScenePoint(useFurniturePoint(item));
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.48, 0]} castShadow><cylinderGeometry args={[0.035, 0.055, 0.96, 12]} /><meshStandardMaterial color="#3f4447" roughness={0.32} metalness={0.62} /></mesh>
      <mesh position={[0, 0.98, 0]} castShadow><cylinderGeometry args={[0.16, 0.12, 0.22, 20]} /><meshStandardMaterial color="#ffe6ac" emissive="#ffd98c" emissiveIntensity={0.62} roughness={0.32} /></mesh>
      <pointLight position={[0, 0.98, 0]} color="#ffdca0" intensity={0.28} distance={2.3} />
    </group>
  );
}

function YardDrain({ item }: { item: Furniture }) {
  const [x, z] = toScenePoint(useFurniturePoint(item));
  return <mesh position={[x, 0.045, z]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.2, 24]} /><meshStandardMaterial color="#62686b" roughness={0.38} metalness={0.48} /></mesh>;
}

function YardSocket({ item }: { item: Furniture }) {
  const [x, z] = toScenePoint(useFurniturePoint(item));
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.32, 0]} castShadow><boxGeometry args={[0.18, 0.64, 0.14]} /><meshStandardMaterial color="#41474a" roughness={0.38} metalness={0.48} /></mesh>
      <mesh position={[0, 0.42, 0.075]}><boxGeometry args={[0.13, 0.15, 0.018]} /><meshStandardMaterial color="#d3d5d3" roughness={0.42} /></mesh>
      {[-0.035, 0.035].map((offset) => <mesh key={offset} position={[offset, 0.42, 0.087]}><circleGeometry args={[0.012, 12]} /><meshStandardMaterial color="#33383a" roughness={0.5} /></mesh>)}
    </group>
  );
}

function YardTap({ item }: { item: Furniture }) {
  const [x, z] = toScenePoint(useFurniturePoint(item));
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.36, 0]} castShadow><boxGeometry args={[0.24, 0.72, 0.2]} /><meshStandardMaterial color="#c4beb4" roughness={0.74} /></mesh>
      <mesh position={[0, 0.68, 0.13]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.02, 0.02, 0.18, 14]} /><meshStandardMaterial color="#9a7755" roughness={0.24} metalness={0.68} /></mesh>
      <mesh position={[0, 0.75, 0.05]}><torusGeometry args={[0.07, 0.012, 10, 24]} /><meshStandardMaterial color="#9a7755" roughness={0.24} metalness={0.68} /></mesh>
    </group>
  );
}

function YardTree({ item }: { item: Furniture }) {
  const [x, z] = toScenePoint(useFurniturePoint(item));
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.72, 0]} castShadow><cylinderGeometry args={[0.08, 0.12, 1.44, 12]} /><meshStandardMaterial color="#80654b" roughness={0.82} /></mesh>
      {Array.from({ length: 9 }, (_, index) => {
        const angle = index / 9 * Math.PI * 2;
        return <mesh key={index} position={[Math.cos(angle) * (0.28 + index % 3 * 0.1), 1.55 + index % 2 * 0.18, Math.sin(angle) * (0.28 + index % 3 * 0.1)]} scale={[1.15, 0.8, 1]} castShadow><sphereGeometry args={[0.42, 18, 12]} /><meshStandardMaterial color={index % 2 ? "#728b63" : "#80976c"} roughness={0.8} /></mesh>;
      })}
    </group>
  );
}

function YardFurnitureObject({ item, selected, onSelect }: { item: Furniture; selected: boolean; onSelect: (id: string) => void }) {
  const content = (() => {
  if (item.id === "ph-1f-north-bbq-island") return <BbqIsland item={item} />;
  if (item.id === "ph-1f-south-drying-rack") return <DryingRack item={item} />;
  if (item.id === "ph-1f-south-lounge-set") return <LoungeSet item={item} />;
  if (item.id === "ph-1f-south-dog-house") return <DogHouse item={item} />;
  if (item.id === "ph-1f-south-pet-water") return <PetWater item={item} />;
  if (item.name.includes("庭院门") || item.name.includes("院门")) return <YardGate item={item} />;
  if (item.name.includes("户外柜") || item.name.includes("庭院柜")) return <OutdoorCabinet item={item} />;
  if (item.name.includes("庭院灯") || item.name.includes("草坪灯")) return <YardLight item={item} />;
  if (item.name.includes("户外插座") || item.name.includes("地插")) return <YardSocket item={item} />;
  if (item.name.includes("给水龙头") || item.name.includes("户外龙头")) return <YardTap item={item} />;
  if (item.name.includes("排水点") || item.name.includes("地漏")) return <YardDrain item={item} />;
  if (item.type === "plant") return <YardTree item={item} />;
  return <FurnitureBox item={item} />;
  })();
  return (
    <group
      onClick={(event) => { event.stopPropagation(); onSelect(item.id); }}
      scale={selected ? 1.035 : 1}
    >
      {content}
    </group>
  );
}

function YardCameraRig({ focus, fixedView, requestVersion }: { focus: YardPreviewFocus; fixedView: FixedCameraView | null; requestVersion: number }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const transitionRef = useRef<{ elapsed: number; startPosition: THREE.Vector3; endPosition: THREE.Vector3; startTarget: THREE.Vector3; endTarget: THREE.Vector3; startZoom: number; endZoom: number } | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.rotateSpeed = 0.58;
    controls.zoomSpeed = 0.82;
    controls.minDistance = 3.2;
    controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI / 2.08;
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl.domElement]);

  useEffect(() => {
    const preset = cameraPresets[focus];
    const endPosition = fixedView
      ? new THREE.Vector3(fixedView.cameraPosition.x, fixedView.cameraPosition.y, fixedView.cameraPosition.z)
      : new THREE.Vector3(...preset.position);
    const endTarget = fixedView
      ? new THREE.Vector3(fixedView.target.x, fixedView.target.y, fixedView.target.z)
      : new THREE.Vector3(...preset.target);
    transitionRef.current = {
      elapsed: 0,
      startPosition: camera.position.clone(),
      endPosition,
      startTarget: controlsRef.current?.target.clone() ?? new THREE.Vector3(...preset.target),
      endTarget,
      startZoom: camera.zoom,
      // Yard preview uses a perspective Canvas; fixed orthographic zoom is applied as an equivalent lens zoom.
      endZoom: fixedView?.zoom ?? 1
    };
  }, [camera, fixedView, focus, requestVersion]);

  useFrame((_, delta) => {
    const transition = transitionRef.current;
    if (transition) {
      transition.elapsed = Math.min(0.9, transition.elapsed + delta);
      const raw = transition.elapsed / 0.9;
      const progress = raw * raw * (3 - 2 * raw);
      const target = transition.startTarget.clone().lerp(transition.endTarget, progress);
      camera.position.lerpVectors(transition.startPosition, transition.endPosition, progress);
      camera.zoom = THREE.MathUtils.lerp(transition.startZoom, transition.endZoom, progress);
      controlsRef.current?.target.copy(target);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      if (raw >= 1) transitionRef.current = null;
    }
    controlsRef.current?.update();
  });

  return null;
}

function YardScene({ houseStructure, furniture, focus, fixedView, requestVersion, selectedObjectId, onSelectObject }: { houseStructure: HouseStructure; furniture: Furniture[]; focus: YardPreviewFocus; fixedView: FixedCameraView | null; requestVersion: number; selectedObjectId: string; onSelectObject: (id: string) => void }) {
  const coordinateSystem = getSyncCoordinateSystem(houseStructure.coordinateSystem);
  const outdoors = useMemo(() => {
    const namedOutdoors = houseStructure.outdoors.filter((outdoor) => outdoor.id.includes("NORTH") || outdoor.id.includes("SOUTH") || outdoor.name.includes("院"));
    return namedOutdoors.length ? namedOutdoors : FALLBACK_OUTDOORS;
  }, [houseStructure.outdoors]);
  const yardFurniture = useMemo(() => (
    furniture.filter((item) => resolveVisibility(item).visible3d && (item.floorId === "YARD" || (item.floorId === "1F" && (item.id.startsWith("ph-1f-") || item.roomId.startsWith("OD-1F")))))
  ), [furniture]);

  return (
    <>
      <color attach="background" args={["#e8ece7"]} />
      <fog attach="fog" args={["#edf1ea", 9, 24]} />
      <hemisphereLight args={["#f8fbff", "#96b77a", 1.45]} />
      <directionalLight position={[4, 9, 5]} intensity={2.1} castShadow shadow-mapSize={[2048, 2048]} />
      <ambientLight intensity={0.38} />
      <YardCameraRig focus={focus} fixedView={fixedView} requestVersion={requestVersion} />
      <YardCoordinateContext.Provider value={coordinateSystem}>
      <group position={[-(coordinateSystem.origin.x + coordinateSystem.width / 2) / 1000, 0, -(coordinateSystem.origin.y + coordinateSystem.height / 2) / 1000]}>
        {outdoors.map((outdoor) => (
          <group key={outdoor.id} onClick={(event) => { event.stopPropagation(); onSelectObject(outdoor.id); }} scale={selectedObjectId === outdoor.id ? 1.01 : 1}><OutdoorArea outdoor={outdoor} /></group>
        ))}
        {houseStructure.outdoorSurfaces.map((surface) => (
          <group key={surface.id} onClick={(event) => { event.stopPropagation(); onSelectObject(surface.id); }} scale={selectedObjectId === surface.id ? 1.01 : 1}>
            <OutdoorSurfaceMesh surface={surface} yOffset={0.028} />
            <LabelSprite text={surface.name.replace("占位｜", "占位 | ")} position={[toScenePoint(getPolygonCenter(surface.polygon))[0], 0.38, toScenePoint(getPolygonCenter(surface.polygon))[1]]} />
          </group>
        ))}
        <BuildingMass />
        {houseStructure.fences.map((fence) => <group key={fence.id} onClick={(event) => { event.stopPropagation(); onSelectObject(fence.id); }} scale={selectedObjectId === fence.id ? 1.02 : 1}><FenceSegment fence={fence} /></group>)}
        {yardFurniture.map((item) => <YardFurnitureObject key={item.id} item={item} selected={selectedObjectId === item.id} onSelect={onSelectObject} />)}
      </group>
      </YardCoordinateContext.Provider>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.018, 0]} receiveShadow>
        <planeGeometry args={[20, 18]} />
        <shadowMaterial transparent opacity={0.18} />
      </mesh>
    </>
  );
}

export function Yard3DPreview({ houseStructure, furniture, initialFocus = "all", cameraViews = [], cameraViewRequest = null, onSelectCameraView, onExit, onEditYard, selectedObjectId = "", onSelectObject = () => {} }: Yard3DPreviewProps) {
  const [focus, setFocus] = useState<YardPreviewFocus>(initialFocus);
  const [fixedView, setFixedView] = useState<FixedCameraView | null>(cameraViewRequest?.view.floor === "YARD" ? cameraViewRequest.view : null);
  const [cameraRequestVersion, setCameraRequestVersion] = useState(0);
  const yardCameraViews = useMemo(() => cameraViews.filter((view) => view.floor === "YARD"), [cameraViews]);
  useEffect(() => {
    if (cameraViewRequest?.view.floor !== "YARD") return;
    setFixedView(cameraViewRequest.view);
    setCameraRequestVersion((version) => version + 1);
  }, [cameraViewRequest?.nonce, cameraViewRequest?.view]);
  const focusOptions: Array<{ id: YardPreviewFocus; label: string }> = [
    { id: "all", label: "全院" },
    { id: "south", label: "南院" },
    { id: "north", label: "北院" }
  ];

  return (
    <section className="relative min-h-0 flex-1 overflow-hidden bg-[#e8ece7]">
      <Canvas
        camera={{ position: cameraPresets[focus].position, fov: 42, near: 0.1, far: 80 }}
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <YardScene houseStructure={houseStructure} furniture={furniture} focus={focus} fixedView={fixedView} requestVersion={cameraRequestVersion} selectedObjectId={selectedObjectId} onSelectObject={onSelectObject} />
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-4 z-10 w-[min(360px,calc(100%-2rem))] rounded-lg border border-white/70 bg-white/90 p-3 shadow-[0_18px_54px_rgba(15,23,42,0.16)] backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Yard 3D</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">院子 3D 预览</h2>
          </div>
          {onExit && (
            <button className="pointer-events-auto rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-clay" onClick={onExit} type="button">退出</button>
          )}
        </div>
        <div className="pointer-events-auto mt-3 grid grid-cols-3 gap-2">
          {focusOptions.map((option) => (
            <button
              key={option.id}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                focus === option.id ? "bg-blue-600 text-white shadow-sm" : "bg-white text-ink ring-1 ring-stone-200 hover:bg-stone-50"
              }`}
              onClick={() => {
                setFixedView(null);
                setFocus(option.id);
                setCameraRequestVersion((version) => version + 1);
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="pointer-events-auto mt-2 grid grid-cols-2 gap-2">
          <select
            aria-label="当前庭院固定视角"
            className="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs font-semibold text-ink"
            value={fixedView?.floor === "YARD" ? fixedView.id : ""}
            onChange={(event) => {
              const view = yardCameraViews.find((item) => item.id === event.target.value);
              if (view) onSelectCameraView?.(view);
            }}
          >
            <option value="">当前庭院视角</option>
            {yardCameraViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
          </select>
          <select
            aria-label="全部关键视角"
            className="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs font-semibold text-ink"
            value={fixedView?.id ?? ""}
            onChange={(event) => {
              const view = cameraViews.find((item) => item.id === event.target.value);
              if (view) onSelectCameraView?.(view);
            }}
          >
            <option value="">全部关键视角</option>
            {cameraViews.map((view) => <option key={view.id} value={view.id}>{view.floor} · {view.name}</option>)}
          </select>
        </div>
        {fixedView?.description && (
          <p className="pointer-events-auto mt-2 rounded-lg bg-white/75 px-3 py-2 text-xs font-semibold leading-5 text-stone-600">
            {fixedView.name} · {fixedView.mode === "orthographic" ? "正交轴测" : "透视视角"}：{fixedView.description}
          </p>
        )}
        {onEditYard && (
          <div className="pointer-events-auto mt-2 grid grid-cols-2 gap-2">
            <button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100" onClick={() => onEditYard("south")} type="button">定位南院</button>
            <button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100" onClick={() => onEditYard("north")} type="button">定位北院</button>
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 grid gap-2 text-xs font-semibold text-stone-600 sm:grid-cols-4">
        {[
          ["#cfd6df", "硬化占位"],
          ["#b7aaa0", "石板休闲"],
          ["#d6bd8b", "连接小路"],
          ["#86b96b", "保留绿地"]
        ].map(([color, label]) => (
          <span key={label} className="inline-flex items-center gap-2 rounded-lg border border-white/70 bg-white/85 px-3 py-2 shadow-sm backdrop-blur">
            <i className="size-3 rounded-full border border-black/10" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
