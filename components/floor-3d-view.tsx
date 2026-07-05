"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {
  Floor,
  Furniture,
  HouseBayWindow,
  HouseDoor,
  HousePartition,
  HouseStair,
  HouseStructure,
  HouseWall,
  HouseWindow,
  MmPoint
} from "@/types/space";

type Floor3DViewProps = {
  floor: Floor;
  houseStructure: HouseStructure;
  furniture: Furniture[];
  selectedObjectId: string;
  selectedFurnitureId: string;
  showObjectIds: boolean;
  onShowObjectIdsChange: (visible: boolean) => void;
  onSelectStructure: (objectId: string) => void;
  onSelectFurniture: (furniture: Furniture) => void;
  onHoverObject: (objectId: string) => void;
  onClearHoverObject: (objectId: string) => void;
};

type ScenePoint = {
  x: number;
  z: number;
};

type HostSegment = {
  start: MmPoint;
  end: MmPoint;
  thickness: number;
  height: number;
};

type CameraPreset = "overview" | "front" | "right" | "back" | "left" | "living" | "kitchen";
type CameraMode = "orbit" | "walkthrough";
type DesignStylePreset = "naturalWood" | "softCream" | "modernStone" | "warmJapandi";

type FurnitureMaterialStyle = {
  label: string;
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
};

type DesignStylePalette = {
  label: string;
  background: string;
  floorBase: string;
  floorVein: string;
  floorJoint: string;
  wall: string;
  kitchenCabinet: string;
  islandBase: string;
  islandTop: string;
  countertop: string;
  wood: string;
  fabric: string;
  leather: string;
  metal: string;
  glass: string;
  plant: string;
  accent: string;
  light: string;
  grid: string;
};

const MM_TO_M = 1 / 1000;
const DEFAULT_STRUCTURE_WIDTH_MM = 12000;
const DEFAULT_STRUCTURE_HEIGHT_MM = 9000;
const WALL_PREVIEW_HEIGHT_MM = 1480;
const WALL_SELECTED_HEIGHT_MM = 2250;
const WALL_PREVIEW_OPACITY = 0.36;
const WALL_SELECTED_OPACITY = 0.78;
const CAMERA_TARGET = new THREE.Vector3(0, 0.42, 0);
const cameraPositions: Record<CameraPreset, [number, number, number]> = {
  overview: [7.4, 8.2, 8.6],
  front: [0, 5.9, 10.4],
  right: [10.4, 5.9, 0],
  back: [0, 5.9, -10.4],
  left: [-10.4, 5.9, 0],
  living: [5.8, 3.9, 7.2],
  kitchen: [1.6, 4.8, -7.8]
};
const cameraRotationOrder: CameraPreset[] = ["front", "right", "back", "left"];
const cameraViewOptions: Array<[CameraPreset, string]> = [
  ["overview", "鸟瞰"],
  ["front", "前"],
  ["right", "右"],
  ["back", "后"],
  ["left", "左"],
  ["living", "客厅"],
  ["kitchen", "厨房"]
];
const designStyleOptions: Array<[DesignStylePreset, string]> = [
  ["naturalWood", "浅木自然"],
  ["softCream", "奶油白"],
  ["modernStone", "现代灰"],
  ["warmJapandi", "暖木"]
];
const designStylePalettes: Record<DesignStylePreset, DesignStylePalette> = {
  naturalWood: {
    label: "浅木自然",
    background: "#f5f1e8",
    floorBase: "#eee9dd",
    floorVein: "#bfc6c1",
    floorJoint: "#d5d0c5",
    wall: "#f4efe5",
    kitchenCabinet: "#f8f6f1",
    islandBase: "#e9e5dd",
    islandTop: "#c9cdd0",
    countertop: "#e6e3dc",
    wood: "#c49a6f",
    fabric: "#d9c9ba",
    leather: "#9a735c",
    metal: "#bec5c8",
    glass: "#a8d8e8",
    plant: "#7faa72",
    accent: "#b9895d",
    light: "#fff5d5",
    grid: "#e5ded0"
  },
  softCream: {
    label: "奶油白",
    background: "#f6f1e9",
    floorBase: "#f2eee5",
    floorVein: "#d4ccc0",
    floorJoint: "#ded7cc",
    wall: "#f7f1e6",
    kitchenCabinet: "#fbfaf6",
    islandBase: "#eee6d9",
    islandTop: "#d5d1ca",
    countertop: "#ede9df",
    wood: "#d0aa7c",
    fabric: "#e4d3c4",
    leather: "#a78268",
    metal: "#c7c7c2",
    glass: "#add9e4",
    plant: "#84a96f",
    accent: "#c6965f",
    light: "#fff0c2",
    grid: "#e8dfd2"
  },
  modernStone: {
    label: "现代灰",
    background: "#f1f2ef",
    floorBase: "#e4e5e1",
    floorVein: "#aab2b3",
    floorJoint: "#c7cccc",
    wall: "#edf0ec",
    kitchenCabinet: "#f4f5f2",
    islandBase: "#d7d9d6",
    islandTop: "#bfc4c7",
    countertop: "#d9dcda",
    wood: "#b18b65",
    fabric: "#c8c5bd",
    leather: "#7e6a5c",
    metal: "#b0b8bd",
    glass: "#9ed3e4",
    plant: "#6f9772",
    accent: "#8f9b8f",
    light: "#fff3cf",
    grid: "#d9dedc"
  },
  warmJapandi: {
    label: "暖木",
    background: "#f3eee4",
    floorBase: "#ebe2d2",
    floorVein: "#c8b9a4",
    floorJoint: "#d8cab8",
    wall: "#f2eadf",
    kitchenCabinet: "#f5efe5",
    islandBase: "#dfc4a2",
    islandTop: "#c8c2b8",
    countertop: "#ded3c2",
    wood: "#ba8154",
    fabric: "#d7c0ad",
    leather: "#936247",
    metal: "#b6aca0",
    glass: "#a8d0d8",
    plant: "#789d66",
    accent: "#a36f45",
    light: "#ffe8ae",
    grid: "#dfd2bf"
  }
};
const walkthroughStops = [
  { position: new THREE.Vector3(-4.6, 1.35, 6.1), target: new THREE.Vector3(-1.4, 0.85, 2.2) },
  { position: new THREE.Vector3(-1.2, 1.45, 4.1), target: new THREE.Vector3(1.4, 0.9, 0.9) },
  { position: new THREE.Vector3(2.7, 1.45, 3.1), target: new THREE.Vector3(0.6, 0.85, -0.9) },
  { position: new THREE.Vector3(3.8, 1.55, -2.8), target: new THREE.Vector3(0.2, 0.9, -0.4) },
  { position: new THREE.Vector3(-2.8, 1.5, -3.2), target: new THREE.Vector3(-0.8, 0.85, 0.8) }
];
const walkthroughSegmentSeconds = 4.6;

function getStructureSize(structure: HouseStructure) {
  return {
    width: structure.coordinateSystem?.width || DEFAULT_STRUCTURE_WIDTH_MM,
    height: structure.coordinateSystem?.height || DEFAULT_STRUCTURE_HEIGHT_MM
  };
}

function toScenePoint(point: MmPoint, structure: HouseStructure): ScenePoint {
  const size = getStructureSize(structure);
  return {
    x: (point.x - size.width / 2) * MM_TO_M,
    z: (point.y - size.height / 2) * MM_TO_M
  };
}

function toShapePoint(point: MmPoint, structure: HouseStructure) {
  const size = getStructureSize(structure);
  return new THREE.Vector2((point.x - size.width / 2) * MM_TO_M, -(point.y - size.height / 2) * MM_TO_M);
}

function lineMetrics(start: MmPoint, end: MmPoint, structure: HouseStructure) {
  const startPoint = toScenePoint(start, structure);
  const endPoint = toScenePoint(end, structure);
  const dx = endPoint.x - startPoint.x;
  const dz = endPoint.z - startPoint.z;
  const length = Math.max(0.01, Math.hypot(dx, dz));
  return {
    startPoint,
    endPoint,
    length,
    midpoint: {
      x: (startPoint.x + endPoint.x) / 2,
      z: (startPoint.z + endPoint.z) / 2
    },
    rotationY: Math.atan2(-dz, dx),
    normal: {
      x: -dz / length,
      z: dx / length
    }
  };
}

function getArcWallPoints(wall: Extract<HouseWall, { kind: "arc" }>, steps = 20) {
  const startAngle = wall.startAngle * Math.PI / 180;
  const endAngle = wall.endAngle * Math.PI / 180;
  let sweep = endAngle - startAngle;
  if (wall.direction === "clockwise" && sweep > 0) sweep -= Math.PI * 2;
  if (wall.direction === "counterclockwise" && sweep < 0) sweep += Math.PI * 2;
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = startAngle + sweep * (index / steps);
    return {
      x: Math.round(wall.center.x + Math.cos(angle) * wall.radius),
      y: Math.round(wall.center.y + Math.sin(angle) * wall.radius)
    };
  });
}

function getHostSegment(structure: HouseStructure, hostId: string): HostSegment | null {
  const wall = structure.walls.find((item) => item.id === hostId);
  if (wall?.kind === "straight") {
    return { start: wall.start, end: wall.end, thickness: wall.thickness, height: wall.height };
  }
  const partition = structure.partitions.find((item) => item.id === hostId);
  if (partition) {
    return { start: partition.start, end: partition.end, thickness: partition.thickness, height: partition.height };
  }
  return null;
}

function getFurnitureScenePosition(item: Furniture, structure: HouseStructure): ScenePoint {
  const size = getStructureSize(structure);
  return {
    x: ((item.position.x / 100) * size.width - size.width / 2) * MM_TO_M,
    z: ((item.position.y / 100) * size.height - size.height / 2) * MM_TO_M
  };
}

function getFurnitureHeight(item: Furniture) {
  const height = item.dimensions.height / 100;
  if (isRugLike(item)) return 0.024;
  if (item.moduleType === "pegboard" || item.moduleType === "fireplace") return Math.max(0.08, Math.min(height, 1.8));
  if (item.moduleType === "shower") return Math.max(1.9, height);
  if (item.moduleType === "fridge" || item.moduleType === "wardrobe" || item.moduleType === "tallCabinet") return Math.max(1.8, height);
  return Math.max(0.12, Math.min(height, 2.4));
}

function getFurnitureColor(item: Furniture) {
  if (item.moduleType === "shower") return "#9bd7ef";
  if (item.moduleType === "fireplace") return "#b56b50";
  if (item.moduleType === "island") return "#cfd8d3";
  if (item.moduleType === "kitchenCabinet") return "#d8e3dc";
  if (item.moduleType === "snackCabinet") return "#f4d4a1";
  if (item.moduleType === "pegboard") return "#b7dac9";
  if (item.moduleType === "sink") return "#9cc7dc";
  if (item.moduleType === "cooktop") return "#56616f";
  if (item.moduleType === "fridge") return "#dbe4ec";
  if (item.moduleType === "toilet" || item.moduleType === "vanity") return "#eef2f7";
  return item.color || "#d8d4cb";
}

function materialText(item: Furniture) {
  return `${item.material} ${item.name} ${item.moduleType ?? ""} ${item.type}`.toLowerCase();
}

function isCabinetLike(item: Furniture) {
  return item.moduleType === "kitchenCabinet" ||
    item.moduleType === "snackCabinet" ||
    item.moduleType === "wardrobe" ||
    item.moduleType === "entryCabinet" ||
    item.moduleType === "cabinet" ||
    item.moduleType === "sideboard" ||
    item.moduleType === "tallCabinet" ||
    item.moduleType === "vanity";
}

function isTableLike(item: Furniture) {
  return item.type === "table" || item.moduleType === "table";
}

function isSofaLike(item: Furniture) {
  return item.type === "sofa" || item.moduleType === "sofa";
}

function isBedLike(item: Furniture) {
  return item.type === "bed" || item.moduleType === "bed";
}

function isChairLike(item: Furniture) {
  return item.type === "chair";
}

function isPlantLike(item: Furniture) {
  return item.type === "plant" || item.moduleType === "plant";
}

function isRugLike(item: Furniture) {
  const text = materialText(item);
  return text.includes("rug") || text.includes("地毯") || text.includes("羊毛毯");
}

function isDiningTableLike(item: Furniture, width: number, depth: number) {
  const text = materialText(item);
  return isTableLike(item) && (
    text.includes("餐桌") ||
    text.includes("dining") ||
    text.includes("餐椅") ||
    Math.max(width, depth) >= 1.65
  );
}

function isCoffeeTableLike(item: Furniture, width: number, depth: number, height: number) {
  const text = materialText(item);
  return isTableLike(item) && !isDiningTableLike(item, width, depth) && (
    text.includes("茶几") ||
    text.includes("边几") ||
    text.includes("coffee") ||
    height <= 0.55
  );
}

function getFurnitureMaterialStyle(item: Furniture, materialPreview: boolean, designStyle: DesignStylePreset): FurnitureMaterialStyle {
  const palette = designStylePalettes[designStyle];
  if (!materialPreview) {
    return {
      label: "白模",
      color: getFurnitureColor(item),
      roughness: 0.62,
      metalness: 0.03,
      opacity: item.moduleType === "shower" ? 0.42 : item.moduleType === "fireplace" ? 0.82 : item.type === "plant" ? 0.78 : 1
    };
  }

  const text = materialText(item);
  if (isRugLike(item)) {
    return { label: "低饱和羊毛地毯", color: "#d8d1c3", roughness: 0.92, metalness: 0, opacity: 0.96 };
  }
  if (isSofaLike(item) || isChairLike(item)) {
    return { label: "自然色布艺软包", color: palette.fabric, roughness: 0.88, metalness: 0, opacity: 1 };
  }
  if (item.moduleType === "island") {
    return { label: "浅灰岩板岛台", color: palette.islandBase, roughness: 0.42, metalness: 0.03, opacity: 1 };
  }
  if (item.moduleType === "kitchenCabinet") {
    return { label: "白色系橱柜", color: palette.kitchenCabinet, roughness: 0.48, metalness: 0.02, opacity: 1 };
  }
  if (item.moduleType === "wardrobe" || item.moduleType === "entryCabinet" || item.moduleType === "cabinet" || item.moduleType === "sideboard" || item.moduleType === "snackCabinet" || item.moduleType === "tallCabinet") {
    return { label: "浅木柜体", color: item.moduleType === "snackCabinet" ? palette.kitchenCabinet : palette.wood, roughness: 0.55, metalness: 0.02, opacity: 1 };
  }
  if (item.moduleType === "bed") {
    return { label: "浅木软包床", color: palette.fabric, roughness: 0.78, metalness: 0, opacity: 1 };
  }
  if (item.moduleType === "table") {
    return { label: "浅木餐桌", color: palette.wood, roughness: 0.58, metalness: 0.01, opacity: 1 };
  }
  if (isPlantLike(item)) {
    return { label: "室内绿植", color: palette.plant, roughness: 0.72, metalness: 0, opacity: 0.92 };
  }
  if (text.includes("glass") || text.includes("玻璃") || text.includes("透明")) {
    return { label: "玻璃", color: palette.glass, roughness: 0.12, metalness: 0.02, opacity: 0.42 };
  }
  if (text.includes("metal") || text.includes("金属") || text.includes("不锈钢") || text.includes("铝")) {
    return { label: "金属", color: palette.metal, roughness: 0.24, metalness: 0.68, opacity: 1 };
  }
  if (text.includes("stone") || text.includes("石") || text.includes("岩板") || text.includes("石英") || text.includes("大理石")) {
    return { label: "石材", color: palette.countertop, roughness: 0.36, metalness: 0.04, opacity: 1 };
  }
  if (text.includes("wood") || text.includes("木") || text.includes("原木") || text.includes("木色")) {
    return { label: "木作", color: palette.wood, roughness: 0.54, metalness: 0.02, opacity: 1 };
  }
  if (text.includes("leather") || text.includes("皮革") || text.includes("皮")) {
    return { label: "皮革", color: palette.leather, roughness: 0.58, metalness: 0.01, opacity: 1 };
  }
  if (text.includes("fabric") || text.includes("布") || text.includes("绒") || text.includes("软包")) {
    return { label: "布艺", color: palette.fabric, roughness: 0.86, metalness: 0, opacity: 1 };
  }
  if (text.includes("plant") || text.includes("植物") || text.includes("绿植")) {
    return { label: "绿植", color: palette.plant, roughness: 0.72, metalness: 0, opacity: 0.86 };
  }
  if (text.includes("white") || text.includes("白") || text.includes("米色") || text.includes("浅色")) {
    return { label: "浅色饰面", color: palette.kitchenCabinet, roughness: 0.64, metalness: 0.02, opacity: 1 };
  }
  if (text.includes("gray") || text.includes("grey") || text.includes("灰")) {
    return { label: "灰色饰面", color: palette.islandTop, roughness: 0.58, metalness: 0.04, opacity: 1 };
  }
  return { label: "自定义", color: item.color || getFurnitureColor(item), roughness: 0.62, metalness: 0.03, opacity: 1 };
}

function RoomFloorMesh({
  room,
  index,
  structure,
  designStyle
}: {
  room: HouseStructure["rooms"][number];
  index: number;
  structure: HouseStructure;
  designStyle: DesignStylePreset;
}) {
  const key = room.boundary.map((point) => `${point.x},${point.y}`).join(" ");
  const palette = designStylePalettes[designStyle];
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    room.boundary.forEach((point, pointIndex) => {
      const nextPoint = toShapePoint(point, structure);
      if (pointIndex === 0) shape.moveTo(nextPoint.x, nextPoint.y);
      else shape.lineTo(nextPoint.x, nextPoint.y);
    });
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [key, structure]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018 + index * 0.002, 0]}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color={palette.floorBase} roughness={0.52} metalness={0.03} />
    </mesh>
  );
}

function MarbleFloorOverlay({ structure, designStyle }: { structure: HouseStructure; designStyle: DesignStylePreset }) {
  const size = getStructureSize(structure);
  const width = size.width * MM_TO_M + 0.45;
  const depth = size.height * MM_TO_M + 0.45;
  const palette = designStylePalettes[designStyle];
  const tileSize = 1.2;
  const xLines = Math.floor(width / tileSize);
  const zLines = Math.floor(depth / tileSize);
  return (
    <group position={[0, 0.045, 0]}>
      {Array.from({ length: xLines + 1 }, (_, index) => {
        const x = -width / 2 + index * tileSize;
        return (
          <mesh key={`floor-x-${index}`} position={[x, 0, 0]}>
            <boxGeometry args={[0.012, 0.004, depth]} />
            <meshStandardMaterial color={palette.floorJoint} transparent opacity={0.42} roughness={0.8} />
          </mesh>
        );
      })}
      {Array.from({ length: zLines + 1 }, (_, index) => {
        const z = -depth / 2 + index * tileSize;
        return (
          <mesh key={`floor-z-${index}`} position={[0, 0, z]}>
            <boxGeometry args={[width, 0.004, 0.012]} />
            <meshStandardMaterial color={palette.floorJoint} transparent opacity={0.42} roughness={0.8} />
          </mesh>
        );
      })}
      {Array.from({ length: 7 }, (_, index) => {
        const z = -depth / 2 + 0.8 + index * 1.1;
        const x = -width / 2 + 0.7 + (index % 3) * 1.4;
        return (
          <mesh key={`floor-vein-${index}`} position={[x, 0.004, z]} rotation={[0, Math.PI * (0.16 + index * 0.025), 0]}>
            <boxGeometry args={[Math.min(width * 0.75, 5.8), 0.003, 0.014]} />
            <meshStandardMaterial color={palette.floorVein} transparent opacity={0.3} roughness={0.88} />
          </mesh>
        );
      })}
    </group>
  );
}

function getRoomSceneCenter(room: HouseStructure["rooms"][number], structure: HouseStructure): ScenePoint {
  if (!room.boundary.length) return { x: 0, z: 0 };
  const center = room.boundary.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  return toScenePoint({ x: center.x / room.boundary.length, y: center.y / room.boundary.length }, structure);
}

function RoomLightingPlaceholders({ structure, designStyle }: { structure: HouseStructure; designStyle: DesignStylePreset }) {
  const palette = designStylePalettes[designStyle];
  return (
    <group>
      {structure.rooms.map((room, index) => {
        const center = getRoomSceneCenter(room, structure);
        const isKitchen = room.name.includes("厨");
        const isLiving = room.name.includes("客");
        const spotCount = isLiving ? 4 : isKitchen ? 3 : 1;
        return (
          <group key={`light-${room.id}`}>
            <pointLight color={palette.light} distance={isLiving ? 4.2 : 3.2} intensity={isLiving ? 0.45 : 0.28} position={[center.x, 2.35, center.z]} />
            <mesh position={[center.x, 2.48, center.z]}>
              <cylinderGeometry args={[isLiving ? 0.16 : 0.11, isLiving ? 0.16 : 0.11, 0.025, 28]} />
              <meshStandardMaterial color={palette.light} emissive={palette.light} emissiveIntensity={0.35} roughness={0.28} />
            </mesh>
            {Array.from({ length: spotCount }, (_, spotIndex) => {
              const offset = (spotIndex - (spotCount - 1) / 2) * 0.48;
              return (
                <mesh key={`spot-${room.id}-${spotIndex}`} position={[center.x + offset, 2.46, center.z + (isKitchen ? 0.36 : -0.36)]}>
                  <cylinderGeometry args={[0.055, 0.055, 0.018, 20]} />
                  <meshStandardMaterial color="#fffaf0" emissive={palette.light} emissiveIntensity={0.5} roughness={0.2} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

function LineBox({
  id,
  start,
  end,
  widthMm,
  heightMm,
  structure,
  color,
  opacity = 1,
  yOffset = 0,
  selected = false,
  onSelect,
  onHover,
  onClearHover
}: {
  id: string;
  start: MmPoint;
  end: MmPoint;
  widthMm: number;
  heightMm: number;
  structure: HouseStructure;
  color: string;
  opacity?: number;
  yOffset?: number;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string) => void;
  onClearHover?: (id: string) => void;
}) {
  const metrics = useMemo(() => lineMetrics(start, end, structure), [start, end, structure]);
  const width = Math.max(0.025, widthMm * MM_TO_M);
  const height = Math.max(0.04, heightMm * MM_TO_M);
  return (
    <mesh
      castShadow={selected || opacity >= 0.72}
      receiveShadow={opacity >= 0.5}
      position={[metrics.midpoint.x, yOffset + height / 2, metrics.midpoint.z]}
      rotation={[0, metrics.rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover?.(id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover?.(id);
      }}
    >
      <boxGeometry args={[metrics.length, height, width]} />
      <meshStandardMaterial
        color={selected ? "#2563eb" : color}
        depthWrite={opacity >= 0.72}
        transparent={opacity < 1}
        opacity={opacity}
        roughness={0.7}
      />
    </mesh>
  );
}

function WallMesh({
  wall,
  structure,
  wallColor,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  wall: HouseWall;
  structure: HouseStructure;
  wallColor: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  if (wall.kind === "arc") {
    const points = getArcWallPoints(wall);
    const heightMm = Math.min(wall.height, selected ? WALL_SELECTED_HEIGHT_MM : WALL_PREVIEW_HEIGHT_MM);
    return (
      <group>
        {points.slice(0, -1).map((point, index) => (
          <LineBox
            key={`${wall.id}-${index}`}
            id={wall.id}
            start={point}
            end={points[index + 1]}
            widthMm={wall.thickness}
            heightMm={heightMm}
            structure={structure}
            color={wallColor}
            opacity={selected ? WALL_SELECTED_OPACITY : WALL_PREVIEW_OPACITY}
            selected={selected}
            onSelect={onSelect}
            onHover={onHover}
            onClearHover={onClearHover}
          />
        ))}
      </group>
    );
  }

  return (
    <LineBox
      id={wall.id}
      start={wall.start}
      end={wall.end}
      widthMm={wall.thickness}
      heightMm={Math.min(wall.height, selected ? WALL_SELECTED_HEIGHT_MM : WALL_PREVIEW_HEIGHT_MM)}
      structure={structure}
      color={wallColor}
      opacity={selected ? WALL_SELECTED_OPACITY : WALL_PREVIEW_OPACITY}
      selected={selected}
      onSelect={onSelect}
      onHover={onHover}
      onClearHover={onClearHover}
    />
  );
}

function PartitionMesh({
  partition,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  partition: HousePartition;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  return (
    <LineBox
      id={partition.id}
      start={partition.start}
      end={partition.end}
      widthMm={partition.thickness}
      heightMm={partition.height}
      structure={structure}
      color={partition.material === "glass" ? "#bae6fd" : "#ddd6c8"}
      opacity={partition.transparency ? Math.max(0.28, 1 - partition.transparency) : 0.82}
      selected={selected}
      onSelect={onSelect}
      onHover={onHover}
      onClearHover={onClearHover}
    />
  );
}

function OpeningMesh({
  opening,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  opening: HouseDoor | HouseWindow;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const host = getHostSegment(structure, opening.hostId);
  if (!host) return null;
  const metrics = lineMetrics(host.start, host.end, structure);
  const t = Math.min(1, Math.max(0, opening.positionOnWall));
  const center = {
    x: metrics.startPoint.x + (metrics.endPoint.x - metrics.startPoint.x) * t + metrics.normal.x * ((host.thickness / 2) * MM_TO_M + 0.035),
    z: metrics.startPoint.z + (metrics.endPoint.z - metrics.startPoint.z) * t + metrics.normal.z * ((host.thickness / 2) * MM_TO_M + 0.035)
  };
  const isDoor = "openDirection" in opening;
  const width = Math.max(0.2, opening.width * MM_TO_M);
  const height = Math.max(0.3, opening.height * MM_TO_M);
  const y = isDoor ? height / 2 + 0.02 : 1.35;
  const isGlassDoor = isDoor && "material" in opening && opening.material?.toLowerCase().includes("glass");
  const color = selected ? "#2563eb" : isDoor ? (isGlassDoor ? "#7dd3fc" : "#fbbf24") : "#60a5fa";
  const opacity = isDoor ? ("transparency" in opening && opening.transparency ? Math.max(0.28, 1 - opening.transparency) : 0.45) : 0.5;

  return (
    <mesh
      castShadow
      position={[center.x, y, center.z]}
      rotation={[0, metrics.rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(opening.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(opening.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover(opening.id);
      }}
    >
      <boxGeometry args={[width, height, 0.05]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.35} metalness={0.02} />
    </mesh>
  );
}

function BayWindowMesh({
  bayWindow,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  bayWindow: HouseBayWindow;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const host = getHostSegment(structure, bayWindow.wallId);
  if (!host) return null;
  const metrics = lineMetrics(host.start, host.end, structure);
  const t = Math.min(1, Math.max(0, bayWindow.positionOnWall));
  const center = {
    x: metrics.startPoint.x + (metrics.endPoint.x - metrics.startPoint.x) * t + metrics.normal.x * ((host.thickness / 2 + bayWindow.depth / 2) * MM_TO_M),
    z: metrics.startPoint.z + (metrics.endPoint.z - metrics.startPoint.z) * t + metrics.normal.z * ((host.thickness / 2 + bayWindow.depth / 2) * MM_TO_M)
  };
  return (
    <mesh
      castShadow
      receiveShadow
      position={[center.x, 0.55, center.z]}
      rotation={[0, metrics.rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(bayWindow.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(bayWindow.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover(bayWindow.id);
      }}
    >
      <boxGeometry args={[bayWindow.width * MM_TO_M, 1.1, bayWindow.depth * MM_TO_M]} />
      <meshStandardMaterial color={selected ? "#2563eb" : "#bfdbfe"} transparent opacity={0.55} roughness={0.28} />
    </mesh>
  );
}

function StairMesh({
  stair,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  stair: HouseStair;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const metrics = useMemo(() => lineMetrics(stair.start, stair.end, structure), [stair, structure]);
  const count = Math.max(1, stair.stepCount);
  const stepLength = metrics.length / count;
  const totalHeight = Math.max(0.4, stair.height * MM_TO_M);
  const stairWidth = Math.max(0.5, stair.width * MM_TO_M);
  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onSelect(stair.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(stair.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover(stair.id);
      }}
    >
      {Array.from({ length: count }, (_, index) => {
        const t = (index + 0.5) / count;
        const height = totalHeight * ((index + 1) / count);
        const center = {
          x: metrics.startPoint.x + (metrics.endPoint.x - metrics.startPoint.x) * t,
          z: metrics.startPoint.z + (metrics.endPoint.z - metrics.startPoint.z) * t
        };
        return (
          <mesh key={`${stair.id}-step-${index}`} castShadow receiveShadow position={[center.x, height / 2, center.z]} rotation={[0, metrics.rotationY, 0]}>
            <boxGeometry args={[stepLength * 0.92, height, stairWidth]} />
            <meshStandardMaterial color={selected ? "#2563eb" : "#d6c6ae"} roughness={0.72} />
          </mesh>
        );
      })}
    </group>
  );
}

function FurnitureBlock({
  item,
  structure,
  materialPreview,
  designStyle,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  item: Furniture;
  structure: HouseStructure;
  materialPreview: boolean;
  designStyle: DesignStylePreset;
  selected: boolean;
  onSelect: (item: Furniture) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const position = getFurnitureScenePosition(item, structure);
  const width = Math.max(0.12, item.dimensions.width / 100);
  const depth = Math.max(0.08, item.dimensions.depth / 100);
  const height = getFurnitureHeight(item);
  const rotation = -(item.position.rotation || 0) * Math.PI / 180;
  const palette = designStylePalettes[designStyle];
  const materialStyle = getFurnitureMaterialStyle(item, materialPreview, designStyle);
  const color = selected ? "#2563eb" : materialStyle.color;
  const opacity = selected ? Math.max(0.78, materialStyle.opacity) : materialStyle.opacity;
  const transparent = opacity < 1;
  const cabinetLike = isCabinetLike(item);
  const counterLike = item.moduleType === "island" || item.moduleType === "kitchenCabinet" || item.moduleType === "sideboard" || item.moduleType === "vanity";
  const tableLike = isTableLike(item);
  const sofaLike = isSofaLike(item);
  const bedLike = isBedLike(item);
  const chairLike = isChairLike(item);
  const plantLike = isPlantLike(item);
  const rugLike = isRugLike(item);
  const diningTableLike = isDiningTableLike(item, width, depth);
  const coffeeTableLike = isCoffeeTableLike(item, width, depth, height);
  const renderMainBody = !tableLike && !chairLike && !plantLike && !rugLike;
  const bodyHeight = sofaLike ? height * 0.36 : bedLike ? height * 0.22 : height;
  const bodyY = sofaLike ? -height * 0.22 : bedLike ? -height * 0.3 : 0;
  const panelCount = Math.min(5, Math.max(2, Math.round(width / 0.62)));
  const frontZ = depth / 2 + 0.01;
  const floorLift = rugLike ? 0.012 : 0.035;
  const groupY = height / 2 + floorLift;
  const topLocalY = height / 2 + 0.025;
  const ceilingLocalY = 2.28 - groupY;
  const furnitureColor = selected ? "#2563eb" : color;

  return (
    <group
      position={[position.x, groupY, position.z]}
      rotation={[0, rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(item.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover(item.id);
      }}
    >
      {renderMainBody && (
        <mesh castShadow receiveShadow position={[0, bodyY, 0]}>
          <boxGeometry args={[width, bodyHeight, depth]} />
          <meshStandardMaterial
            color={furnitureColor}
            depthWrite={!transparent}
            transparent={transparent}
            opacity={opacity}
            roughness={materialStyle.roughness}
            metalness={materialStyle.metalness}
          />
        </mesh>
      )}
      {rugLike && (
        <group>
          <mesh receiveShadow position={[0, -height * 0.12, 0]}>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={selected ? "#2563eb" : materialStyle.color} roughness={0.94} transparent opacity={selected ? 0.82 : 0.9} />
          </mesh>
          {materialPreview && (
            <group>
              {Array.from({ length: 5 }, (_, index) => {
                const x = -width * 0.38 + index * width * 0.19;
                return (
                  <mesh key={`${item.id}-rug-stripe-${index}`} position={[x, -height * 0.01, 0]}>
                    <boxGeometry args={[0.018, 0.004, depth * 0.86]} />
                    <meshStandardMaterial color="#eee8db" transparent opacity={0.34} roughness={1} />
                  </mesh>
                );
              })}
            </group>
          )}
        </group>
      )}
      {tableLike && (
        <group>
          {diningTableLike ? (
            <>
              <mesh castShadow receiveShadow position={[0, topLocalY, 0]}>
                <cylinderGeometry args={[Math.min(width, depth) * 0.22, Math.min(width, depth) * 0.22, 0.07, 64]} />
                <meshStandardMaterial color={selected ? "#2563eb" : palette.wood} roughness={0.48} metalness={0.02} />
              </mesh>
              <mesh castShadow receiveShadow position={[0, -height * 0.07, 0]}>
                <cylinderGeometry args={[0.08, 0.11, height * 0.72, 24]} />
                <meshStandardMaterial color={palette.metal} roughness={0.26} metalness={0.48} />
              </mesh>
              <mesh receiveShadow position={[0, -height * 0.44, 0]}>
                <cylinderGeometry args={[Math.min(width, depth) * 0.12, Math.min(width, depth) * 0.14, 0.035, 36]} />
                <meshStandardMaterial color={palette.metal} roughness={0.34} metalness={0.35} />
              </mesh>
              {Array.from({ length: 6 }, (_, index) => {
                const angle = (index / 6) * Math.PI * 2;
                const chairRadius = Math.min(width, depth) * 0.36;
                return (
                  <group
                    key={`${item.id}-chair-${index}`}
                    position={[Math.cos(angle) * chairRadius, -height * 0.02, Math.sin(angle) * chairRadius]}
                    rotation={[0, -angle + Math.PI / 2, 0]}
                  >
                    <mesh castShadow receiveShadow position={[0, -0.02, 0]}>
                      <boxGeometry args={[0.38, 0.09, 0.38]} />
                      <meshStandardMaterial color={palette.fabric} roughness={0.86} />
                    </mesh>
                    <mesh castShadow receiveShadow position={[0, 0.19, -0.18]}>
                      <boxGeometry args={[0.4, 0.42, 0.075]} />
                      <meshStandardMaterial color={palette.fabric} roughness={0.84} />
                    </mesh>
                    {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
                      <mesh key={`${xSide}-${zSide}`} castShadow position={[xSide * 0.145, -0.22, zSide * 0.145]}>
                        <boxGeometry args={[0.035, 0.34, 0.035]} />
                        <meshStandardMaterial color={palette.wood} roughness={0.56} />
                      </mesh>
                    )))}
                  </group>
                );
              })}
              {materialPreview && (
                <group>
                  <mesh position={[0, ceilingLocalY, 0]}>
                    <boxGeometry args={[0.018, 0.46, 0.018]} />
                    <meshStandardMaterial color={palette.metal} roughness={0.3} metalness={0.45} />
                  </mesh>
                  <mesh position={[0, ceilingLocalY - 0.26, 0]}>
                    <cylinderGeometry args={[0.23, 0.3, 0.16, 36]} />
                    <meshStandardMaterial color={palette.light} emissive={palette.light} emissiveIntensity={0.55} roughness={0.38} />
                  </mesh>
                </group>
              )}
            </>
          ) : (
            <>
              <mesh castShadow receiveShadow position={[0, topLocalY, 0]}>
                <boxGeometry args={[width * (coffeeTableLike ? 0.92 : 0.78), 0.06, depth * (coffeeTableLike ? 0.82 : 0.78)]} />
                <meshStandardMaterial color={selected ? "#2563eb" : palette.wood} roughness={0.48} metalness={0.02} />
              </mesh>
              {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
                <mesh key={`${item.id}-leg-${xSide}-${zSide}`} castShadow position={[xSide * width * 0.32, -height * 0.08, zSide * depth * 0.28]}>
                  <boxGeometry args={[0.04, height * 0.62, 0.04]} />
                  <meshStandardMaterial color={palette.metal} roughness={0.28} metalness={0.5} />
                </mesh>
              )))}
              {coffeeTableLike && materialPreview && (
                <mesh position={[0, topLocalY + 0.05, 0]}>
                  <boxGeometry args={[width * 0.42, 0.024, depth * 0.24]} />
                  <meshStandardMaterial color={palette.countertop} roughness={0.35} metalness={0.02} />
                </mesh>
              )}
            </>
          )}
        </group>
      )}
      {chairLike && (
        <group>
          <mesh castShadow receiveShadow position={[0, -height * 0.18, 0]}>
            <boxGeometry args={[width * 0.82, height * 0.18, depth * 0.72]} />
            <meshStandardMaterial color={selected ? "#2563eb" : palette.fabric} roughness={0.86} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, height * 0.1, -depth * 0.34]}>
            <boxGeometry args={[width * 0.82, height * 0.72, 0.085]} />
            <meshStandardMaterial color={selected ? "#2563eb" : palette.fabric} roughness={0.84} />
          </mesh>
          {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
            <mesh key={`${item.id}-chair-leg-${xSide}-${zSide}`} castShadow position={[xSide * width * 0.28, -height * 0.41, zSide * depth * 0.22]}>
              <boxGeometry args={[0.035, height * 0.48, 0.035]} />
              <meshStandardMaterial color={palette.wood} roughness={0.58} />
            </mesh>
          )))}
        </group>
      )}
      {plantLike && (
        <group>
          <mesh castShadow receiveShadow position={[0, -height * 0.31, 0]}>
            <cylinderGeometry args={[Math.min(width, depth) * 0.18, Math.min(width, depth) * 0.23, height * 0.22, 28]} />
            <meshStandardMaterial color={palette.accent} roughness={0.66} />
          </mesh>
          <mesh castShadow position={[0, -height * 0.08, 0]}>
            <cylinderGeometry args={[0.035, 0.045, height * 0.48, 12]} />
            <meshStandardMaterial color="#7c5f42" roughness={0.72} />
          </mesh>
          {Array.from({ length: 7 }, (_, index) => {
            const angle = (index / 7) * Math.PI * 2;
            const radius = Math.min(width, depth) * (index % 2 ? 0.18 : 0.26);
            return (
              <mesh
                key={`${item.id}-leaf-${index}`}
                castShadow
                position={[Math.cos(angle) * radius, height * (0.1 + (index % 3) * 0.06), Math.sin(angle) * radius]}
                scale={[1.15, 0.68, 0.86]}
              >
                <sphereGeometry args={[Math.min(width, depth) * 0.17, 18, 12]} />
                <meshStandardMaterial color={selected ? "#2563eb" : palette.plant} roughness={0.74} />
              </mesh>
            );
          })}
        </group>
      )}
      {materialPreview && opacity >= 0.85 && (
        <>
          {counterLike && (
            <mesh castShadow receiveShadow position={[0, height / 2 + 0.028, 0]}>
              <boxGeometry args={[width + 0.08, 0.055, depth + 0.08]} />
              <meshStandardMaterial
                color={item.moduleType === "island" ? palette.islandTop : palette.countertop}
                roughness={0.31}
                metalness={0.04}
              />
            </mesh>
          )}
          {cabinetLike && (
            <group>
              {Array.from({ length: panelCount - 1 }, (_, index) => {
                const x = -width / 2 + ((index + 1) * width) / panelCount;
                return (
                  <mesh key={`${item.id}-panel-${index}`} position={[x, -height * 0.05, frontZ]}>
                    <boxGeometry args={[0.012, Math.max(0.28, height * 0.62), 0.014]} />
                    <meshStandardMaterial color={palette.floorJoint} roughness={0.7} />
                  </mesh>
                );
              })}
              {Array.from({ length: panelCount }, (_, index) => {
                const x = -width / 2 + ((index + 0.5) * width) / panelCount;
                return (
                  <mesh key={`${item.id}-handle-${index}`} position={[x, -height * 0.04, frontZ + 0.01]}>
                    <boxGeometry args={[Math.min(0.18, width / (panelCount * 3)), 0.018, 0.018]} />
                    <meshStandardMaterial color={palette.metal} roughness={0.28} metalness={0.58} />
                  </mesh>
                );
              })}
              {(item.moduleType === "kitchenCabinet" || item.moduleType === "sideboard" || item.moduleType === "vanity") && (
                <mesh position={[0, height * 0.24, frontZ + 0.012]}>
                  <boxGeometry args={[width * 0.88, 0.026, 0.018]} />
                  <meshStandardMaterial color={palette.light} emissive={palette.light} emissiveIntensity={0.75} roughness={0.18} />
                </mesh>
              )}
            </group>
          )}
          {item.moduleType === "island" && (
            <group>
              <mesh position={[-width / 2 - 0.035, 0.04, 0]}>
                <boxGeometry args={[0.055, height * 0.84, depth + 0.08]} />
                <meshStandardMaterial color={palette.islandTop} roughness={0.34} metalness={0.04} />
              </mesh>
              <mesh position={[width / 2 + 0.035, 0.04, 0]}>
                <boxGeometry args={[0.055, height * 0.84, depth + 0.08]} />
                <meshStandardMaterial color={palette.islandTop} roughness={0.34} metalness={0.04} />
              </mesh>
              {[-0.52, 0, 0.52].map((xOffset, index) => (
                <group key={`${item.id}-island-pendant-${index}`} position={[xOffset * Math.min(width, 2.2), 0, 0]}>
                  <mesh position={[0, ceilingLocalY, 0]}>
                    <boxGeometry args={[0.018, 0.42, 0.018]} />
                    <meshStandardMaterial color={palette.metal} roughness={0.3} metalness={0.48} />
                  </mesh>
                  <mesh position={[0, ceilingLocalY - 0.24, 0]}>
                    <cylinderGeometry args={[0.12, 0.16, 0.12, 28]} />
                    <meshStandardMaterial color={palette.light} emissive={palette.light} emissiveIntensity={0.52} roughness={0.36} />
                  </mesh>
                </group>
              ))}
            </group>
          )}
          {bedLike && (
            <group>
              <mesh castShadow receiveShadow position={[0, -height * 0.13, 0.04]}>
                <boxGeometry args={[width * 0.9, 0.16, depth * 0.76]} />
                <meshStandardMaterial color={palette.fabric} roughness={0.9} />
              </mesh>
              <mesh castShadow receiveShadow position={[0, -height * 0.02, depth * 0.07]}>
                <boxGeometry args={[width * 0.82, 0.05, depth * 0.52]} />
                <meshStandardMaterial color="#efe7dc" roughness={0.92} />
              </mesh>
              <mesh castShadow receiveShadow position={[0, height * 0.03, -depth / 2 - 0.055]}>
                <boxGeometry args={[width, height * 0.72, 0.12]} />
                <meshStandardMaterial color={palette.wood} roughness={0.6} />
              </mesh>
              {[-0.24, 0.24].map((xOffset) => (
                <mesh key={`${item.id}-pillow-${xOffset}`} castShadow receiveShadow position={[xOffset * width, height * 0.07, -depth * 0.27]}>
                  <boxGeometry args={[width * 0.28, 0.09, depth * 0.16]} />
                  <meshStandardMaterial color="#f7f1e8" roughness={0.95} />
                </mesh>
              ))}
            </group>
          )}
          {sofaLike && (
            <group>
              <mesh castShadow receiveShadow position={[0, -height * 0.04, -depth / 2 + 0.08]}>
                <boxGeometry args={[width, height * 0.72, 0.16]} />
                <meshStandardMaterial color={palette.fabric} roughness={0.88} />
              </mesh>
              <mesh castShadow receiveShadow position={[-width / 2 + 0.08, -height * 0.08, 0]}>
                <boxGeometry args={[0.16, height * 0.55, depth * 0.88]} />
                <meshStandardMaterial color={palette.fabric} roughness={0.88} />
              </mesh>
              <mesh castShadow receiveShadow position={[width / 2 - 0.08, -height * 0.08, 0]}>
                <boxGeometry args={[0.16, height * 0.55, depth * 0.88]} />
                <meshStandardMaterial color={palette.fabric} roughness={0.88} />
              </mesh>
              {Array.from({ length: Math.max(2, Math.min(4, Math.round(width / 0.72))) }, (_, index) => {
                const cushionWidth = width / Math.max(2, Math.min(4, Math.round(width / 0.72))) - 0.06;
                const x = -width / 2 + cushionWidth / 2 + 0.12 + index * (cushionWidth + 0.04);
                return (
                  <mesh key={`${item.id}-seat-cushion-${index}`} castShadow receiveShadow position={[x, -height * 0.01, depth * 0.08]}>
                    <boxGeometry args={[cushionWidth, 0.065, depth * 0.62]} />
                    <meshStandardMaterial color="#e8d9c9" roughness={0.92} />
                  </mesh>
                );
              })}
              {[-0.24, 0.2].map((xOffset, index) => (
                <mesh key={`${item.id}-throw-pillow-${index}`} castShadow receiveShadow position={[xOffset * width, height * 0.12, -depth * 0.24]} rotation={[0, 0, index ? -0.12 : 0.12]}>
                  <boxGeometry args={[0.32, 0.25, 0.08]} />
                  <meshStandardMaterial color={index ? palette.accent : "#f4eee5"} roughness={0.9} />
                </mesh>
              ))}
            </group>
          )}
          {item.moduleType === "sink" && (
            <group>
              <mesh position={[0, height / 2 + 0.018, 0]}>
                <boxGeometry args={[width * 0.78, 0.035, depth * 0.68]} />
                <meshStandardMaterial color="#8fa6ad" roughness={0.2} metalness={0.45} />
              </mesh>
              <mesh position={[0, height / 2 + 0.04, 0]}>
                <boxGeometry args={[width * 0.56, 0.018, depth * 0.46]} />
                <meshStandardMaterial color="#d8e1e3" roughness={0.18} metalness={0.58} />
              </mesh>
              <mesh position={[width * 0.22, height / 2 + 0.18, -depth * 0.08]}>
                <cylinderGeometry args={[0.022, 0.022, 0.28, 14]} />
                <meshStandardMaterial color={palette.metal} roughness={0.18} metalness={0.7} />
              </mesh>
              <mesh position={[width * 0.13, height / 2 + 0.3, -depth * 0.08]}>
                <boxGeometry args={[0.2, 0.026, 0.026]} />
                <meshStandardMaterial color={palette.metal} roughness={0.18} metalness={0.7} />
              </mesh>
            </group>
          )}
          {item.moduleType === "cooktop" && (
            <group>
              <mesh position={[0, height / 2 + 0.02, 0]}>
                <boxGeometry args={[width * 0.84, 0.032, depth * 0.7]} />
                <meshStandardMaterial color="#111827" roughness={0.18} metalness={0.35} />
              </mesh>
              {[-0.22, 0.22].flatMap((xOffset) => [-0.18, 0.18].map((zOffset) => (
                <mesh key={`${item.id}-burner-${xOffset}-${zOffset}`} position={[xOffset * width, height / 2 + 0.042, zOffset * depth]}>
                  <cylinderGeometry args={[0.085, 0.085, 0.012, 28]} />
                  <meshStandardMaterial color="#374151" roughness={0.24} metalness={0.42} />
                </mesh>
              )))}
            </group>
          )}
          {item.moduleType === "fridge" && (
            <group>
              <mesh position={[0, 0, frontZ]}>
                <boxGeometry args={[0.014, height * 0.9, 0.016]} />
                <meshStandardMaterial color="#c9d0d4" roughness={0.32} metalness={0.32} />
              </mesh>
              <mesh position={[width * 0.34, -height * 0.05, frontZ + 0.012]}>
                <boxGeometry args={[0.035, height * 0.58, 0.026]} />
                <meshStandardMaterial color={palette.metal} roughness={0.2} metalness={0.68} />
              </mesh>
              <mesh position={[0, height * 0.44, frontZ + 0.012]}>
                <boxGeometry args={[width * 0.72, 0.035, 0.018]} />
                <meshStandardMaterial color="#edf2f4" roughness={0.4} />
              </mesh>
            </group>
          )}
          {item.moduleType === "fireplace" && (
            <group>
              <mesh position={[0, 0, frontZ + 0.01]}>
                <boxGeometry args={[width * 0.72, height * 0.46, 0.04]} />
                <meshStandardMaterial color="#201a17" roughness={0.62} />
              </mesh>
              {[-0.18, 0, 0.18].map((xOffset, index) => (
                <mesh key={`${item.id}-flame-${index}`} position={[xOffset * width, -height * 0.06 + index * 0.025, frontZ + 0.04]} rotation={[0, 0, xOffset * 1.6]}>
                  <coneGeometry args={[0.055, 0.22, 16]} />
                  <meshStandardMaterial color={index === 1 ? "#fbbf24" : "#f97316"} emissive={index === 1 ? "#f59e0b" : "#ea580c"} emissiveIntensity={0.8} roughness={0.38} />
                </mesh>
              ))}
              <mesh position={[0, -height * 0.42, frontZ + 0.02]}>
                <boxGeometry args={[width * 1.12, 0.05, 0.24]} />
                <meshStandardMaterial color={palette.countertop} roughness={0.46} />
              </mesh>
            </group>
          )}
          {item.moduleType === "pegboard" && (
            <group>
              <mesh position={[0, height * 0.24, frontZ]}>
                <boxGeometry args={[width * 0.88, 0.035, 0.12]} />
                <meshStandardMaterial color={palette.wood} roughness={0.58} />
              </mesh>
              {Array.from({ length: 5 }, (_, index) => {
                const x = -width * 0.36 + index * width * 0.18;
                return (
                  <mesh key={`${item.id}-hook-${index}`} position={[x, -height * 0.02, frontZ + 0.04]}>
                    <boxGeometry args={[0.024, 0.18, 0.035]} />
                    <meshStandardMaterial color={palette.metal} roughness={0.28} metalness={0.52} />
                  </mesh>
                );
              })}
            </group>
          )}
        </>
      )}
    </group>
  );
}

function CameraRig({ preset, requestVersion, mode }: { preset: CameraPreset; requestVersion: number; mode: CameraMode }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const walkStartRef = useRef<number | null>(null);
  const walkTargetRef = useRef(new THREE.Vector3());

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.panSpeed = 0.55;
    controls.rotateSpeed = 0.56;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 3.8;
    controls.maxDistance = 18;
    controls.minPolarAngle = Math.PI / 8;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.target.copy(CAMERA_TARGET);
    controls.update();
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl.domElement]);

  useEffect(() => {
    camera.position.set(...cameraPositions[preset]);
    camera.lookAt(CAMERA_TARGET);
    controlsRef.current?.target.copy(CAMERA_TARGET);
    controlsRef.current?.update();
    camera.updateProjectionMatrix();
    walkStartRef.current = null;
  }, [camera, preset, requestVersion]);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.enabled = mode === "orbit";
    walkStartRef.current = null;
  }, [mode]);

  useFrame((state) => {
    if (mode === "walkthrough") {
      if (walkStartRef.current === null) walkStartRef.current = state.clock.elapsedTime;
      const elapsed = state.clock.elapsedTime - walkStartRef.current;
      const rawSegment = elapsed / walkthroughSegmentSeconds;
      const segmentIndex = Math.floor(rawSegment) % walkthroughStops.length;
      const nextIndex = (segmentIndex + 1) % walkthroughStops.length;
      const segmentProgress = rawSegment - Math.floor(rawSegment);
      const easedProgress = 0.5 - Math.cos(segmentProgress * Math.PI) / 2;
      camera.position.lerpVectors(walkthroughStops[segmentIndex].position, walkthroughStops[nextIndex].position, easedProgress);
      walkTargetRef.current.lerpVectors(walkthroughStops[segmentIndex].target, walkthroughStops[nextIndex].target, easedProgress);
      camera.lookAt(walkTargetRef.current);
      camera.updateProjectionMatrix();
      return;
    }
    controlsRef.current?.update();
  });

  return null;
}

function Floor3DScene({
  cameraPreset,
  cameraRequestVersion,
  cameraMode,
  materialPreview,
  designStyle,
  houseStructure,
  furniture,
  selectedObjectId,
  selectedFurnitureId,
  onSelectStructure,
  onSelectFurniture,
  onHoverObject,
  onClearHoverObject
}: {
  cameraPreset: CameraPreset;
  cameraRequestVersion: number;
  cameraMode: CameraMode;
  materialPreview: boolean;
  designStyle: DesignStylePreset;
  houseStructure: HouseStructure;
  furniture: Furniture[];
  selectedObjectId: string;
  selectedFurnitureId: string;
  onSelectStructure: (objectId: string) => void;
  onSelectFurniture: (furniture: Furniture) => void;
  onHoverObject: (objectId: string) => void;
  onClearHoverObject: (objectId: string) => void;
}) {
  const size = getStructureSize(houseStructure);
  const palette = designStylePalettes[designStyle];
  return (
    <>
      <CameraRig preset={cameraPreset} requestVersion={cameraRequestVersion} mode={cameraMode} />
      <color attach="background" args={[palette.background]} />
      <ambientLight intensity={0.62} />
      <directionalLight castShadow position={[4, 8, 5]} intensity={1.08} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <hemisphereLight args={["#dbeafe", palette.background, 0.58]} />

      <mesh receiveShadow position={[0, -0.012, 0]}>
        <boxGeometry args={[size.width * MM_TO_M + 0.5, 0.02, size.height * MM_TO_M + 0.5]} />
        <meshStandardMaterial color={palette.floorBase} roughness={0.9} />
      </mesh>

      {houseStructure.rooms.map((room, index) => (
        <RoomFloorMesh key={room.id} room={room} index={index} structure={houseStructure} designStyle={designStyle} />
      ))}
      <MarbleFloorOverlay structure={houseStructure} designStyle={designStyle} />
      <RoomLightingPlaceholders structure={houseStructure} designStyle={designStyle} />

      {houseStructure.walls.map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          structure={houseStructure}
          wallColor={palette.wall}
          selected={selectedObjectId === wall.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.partitions.map((partition) => (
        <PartitionMesh
          key={partition.id}
          partition={partition}
          structure={houseStructure}
          selected={selectedObjectId === partition.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.doors.map((door) => (
        <OpeningMesh
          key={door.id}
          opening={door}
          structure={houseStructure}
          selected={selectedObjectId === door.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.windows.map((windowObject) => (
        <OpeningMesh
          key={windowObject.id}
          opening={windowObject}
          structure={houseStructure}
          selected={selectedObjectId === windowObject.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.bayWindows.map((bayWindow) => (
        <BayWindowMesh
          key={bayWindow.id}
          bayWindow={bayWindow}
          structure={houseStructure}
          selected={selectedObjectId === bayWindow.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.stairs.map((stair) => (
        <StairMesh
          key={stair.id}
          stair={stair}
          structure={houseStructure}
          selected={selectedObjectId === stair.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {furniture.map((item) => (
        <FurnitureBlock
          key={item.id}
          item={item}
          structure={houseStructure}
          materialPreview={materialPreview}
          designStyle={designStyle}
          selected={selectedFurnitureId === item.id || selectedObjectId === item.id}
          onSelect={onSelectFurniture}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      <gridHelper args={[14, 14, palette.floorJoint, palette.grid]} position={[0, 0.006, 0]} />
    </>
  );
}

export function Floor3DView({
  floor,
  houseStructure,
  furniture,
  selectedObjectId,
  selectedFurnitureId,
  showObjectIds,
  onShowObjectIdsChange,
  onSelectStructure,
  onSelectFurniture,
  onHoverObject,
  onClearHoverObject
}: Floor3DViewProps) {
  const [cameraRequest, setCameraRequest] = useState<{ preset: CameraPreset; version: number }>({ preset: "overview", version: 0 });
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const [materialPreview, setMaterialPreview] = useState(true);
  const [designStyle, setDesignStyle] = useState<DesignStylePreset>("naturalWood");
  const selectedFurniture = furniture.find((item) => item.id === selectedFurnitureId || item.id === selectedObjectId);
  const selectedStructure =
    houseStructure.walls.find((item) => item.id === selectedObjectId) ??
    houseStructure.partitions.find((item) => item.id === selectedObjectId) ??
    houseStructure.stairs.find((item) => item.id === selectedObjectId) ??
    houseStructure.doors.find((item) => item.id === selectedObjectId) ??
    houseStructure.windows.find((item) => item.id === selectedObjectId) ??
    houseStructure.bayWindows.find((item) => item.id === selectedObjectId) ??
    null;
  const selectedName = selectedFurniture?.name ?? selectedStructure?.name ?? selectedObjectId;
  const requestCameraPreset = (preset: CameraPreset) => {
    setCameraMode("orbit");
    setCameraRequest((current) => ({ preset, version: current.version + 1 }));
  };
  const rotateCameraPreset = (direction: -1 | 1) => {
    setCameraMode("orbit");
    setCameraRequest((current) => {
      const currentIndex = cameraRotationOrder.indexOf(current.preset);
      const fallbackIndex = direction > 0 ? -1 : 0;
      const nextIndex = ((currentIndex >= 0 ? currentIndex : fallbackIndex) + direction + cameraRotationOrder.length) % cameraRotationOrder.length;
      return { preset: cameraRotationOrder[nextIndex], version: current.version + 1 };
    });
  };

  return (
    <div className="relative h-full min-h-[560px] overflow-hidden rounded-[1.75rem] border border-white/70 bg-[#ede7da] shadow-inner">
      <Canvas shadows camera={{ fov: 42, near: 0.1, far: 80 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <Floor3DScene
          cameraPreset={cameraRequest.preset}
          cameraRequestVersion={cameraRequest.version}
          cameraMode={cameraMode}
          materialPreview={materialPreview}
          designStyle={designStyle}
          houseStructure={houseStructure}
          furniture={furniture}
          selectedObjectId={selectedObjectId}
          selectedFurnitureId={selectedFurnitureId}
          onSelectStructure={onSelectStructure}
          onSelectFurniture={onSelectFurniture}
          onHoverObject={onHoverObject}
          onClearHoverObject={onClearHoverObject}
        />
      </Canvas>

      <div className="pointer-events-none absolute left-4 top-4 z-[80]">
        <div className="pointer-events-auto rounded-lg border border-white/80 bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">1F 3D White Model</div>
          <div className="mt-1 text-lg font-black text-stone-900">{floor.label} · {floor.subtitle}</div>
          <div className="mt-1 text-xs font-semibold text-stone-500">墙体 / 门窗 / 楼梯 / 家具都来自当前 1F 模型</div>
        </div>
      </div>
      <div className="pointer-events-none absolute right-4 top-4 z-[90] flex max-w-[calc(100%-2rem)] justify-end">
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2 rounded-lg border border-white/80 bg-white/88 p-2 shadow-sm backdrop-blur">
          <button
            aria-label="逆时针旋转视图"
            className="grid size-8 place-items-center rounded-md text-base font-black text-stone-600 transition hover:bg-stone-100"
            onClick={() => rotateCameraPreset(-1)}
            title="逆时针旋转视图"
            type="button"
          >
            ↺
          </button>
          <select
            aria-label="风格方案"
            className="h-8 rounded-md border border-stone-200 bg-white px-2 text-xs font-bold text-stone-700 outline-none transition hover:bg-stone-50"
            value={designStyle}
            onChange={(event) => setDesignStyle(event.target.value as DesignStylePreset)}
          >
            {designStyleOptions.map(([preset, label]) => (
              <option key={preset} value={preset}>{label}</option>
            ))}
          </select>
          <button
            aria-pressed={materialPreview}
            className={`rounded-md px-3 py-2 text-xs font-bold transition ${materialPreview ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
            onClick={() => setMaterialPreview((visible) => !visible)}
            type="button"
          >
            材质
          </button>
          <button
            aria-pressed={cameraMode === "walkthrough"}
            className={`rounded-md px-3 py-2 text-xs font-bold transition ${cameraMode === "walkthrough" ? "bg-emerald-700 text-white" : "text-stone-600 hover:bg-stone-100"}`}
            onClick={() => setCameraMode((mode) => mode === "walkthrough" ? "orbit" : "walkthrough")}
            type="button"
          >
            {cameraMode === "walkthrough" ? "退出漫游" : "漫游"}
          </button>
          <div className="flex flex-wrap gap-1">
            {cameraViewOptions.map(([preset, label]) => (
              <button
                key={preset}
                className={`rounded-md px-3 py-2 text-xs font-bold transition ${cameraRequest.preset === preset ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
                onClick={() => requestCameraPreset(preset)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <button
            aria-label="顺时针旋转视图"
            className="grid size-8 place-items-center rounded-md text-base font-black text-stone-600 transition hover:bg-stone-100"
            onClick={() => rotateCameraPreset(1)}
            title="顺时针旋转视图"
            type="button"
          >
            ↻
          </button>
          <label className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100">
            <input checked={showObjectIds} onChange={(event) => onShowObjectIdsChange(event.target.checked)} type="checkbox" />
            对象信息
          </label>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[70] max-w-sm rounded-lg border border-white/80 bg-white/88 p-4 text-sm leading-6 text-stone-600 shadow-sm backdrop-blur">
        <div className="font-black text-stone-900">{materialPreview ? "1F 材质预览" : "1F 立体白模"}</div>
        <div className="mt-1">
          {cameraMode === "walkthrough"
            ? "正在按客餐厨动线自动漫游；退出后可继续拖拽旋转和切换视角。"
            : materialPreview
              ? `${designStylePalettes[designStyle].label}方案：浅灰岩板岛台、白色系橱柜、大理石地砖和灯光点位均为可替换占位。`
              : "先用白模确认空间比例、通道和家具体量；材质、灯光和漫游可随时切回。"}
        </div>
        {showObjectIds && (
          <div className="mt-3 rounded-md bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600">
            {selectedObjectId ? `当前选中：${selectedObjectId}${selectedName ? ` · ${selectedName}` : ""}` : "点选墙体、楼梯、门窗或家具后，这里显示对象信息。"}
          </div>
        )}
      </div>
    </div>
  );
}
