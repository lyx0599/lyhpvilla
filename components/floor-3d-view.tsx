"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { resolve3DAsset, resolveRender3DMaterials } from "@/lib/render3d-assets";
import { normalizeObjectForSync, resolveVisibility, toSceneObject } from "@/lib/object-sync-adapter";
import type { Resolved3DAsset, ResolvedRender3DMaterialLayer, ResolvedRender3DMaterials } from "@/lib/render3d-assets";
import type {
  Floor,
  FixedCameraView,
  Furniture,
  HouseBayWindow,
  HouseColumn,
  HouseDoor,
  HouseFence,
  HouseOutdoor,
  HouseOutdoorSurface,
  HousePartition,
  HouseStair,
  HouseStructure,
  HouseWall,
  HouseWindow,
  MobileQuality,
  ModuleServiceRequirements,
  MmPoint,
  Render3DAssetType
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
  cameraViews?: FixedCameraView[];
  cameraViewRequest?: { view: FixedCameraView; nonce: number } | null;
  mobilePresentationMode?: boolean;
  mobileQuality?: MobileQuality;
  resetViewRequest?: number;
  onSelectCameraView?: (view: FixedCameraView) => void;
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

type CameraPreset = "overview" | "front" | "right" | "back" | "left" | "living" | "kitchen" | "stair" | "fireplace";
type CameraMode = "orbit" | "walkthrough";
type DesignStylePreset = "naturalWood" | "softCream" | "modernStone" | "warmJapandi";
type ServiceMarkerKey = keyof ModuleServiceRequirements;

type FurnitureMaterialStyle = {
  label: string;
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
};

type EffectMaterial = {
  label: string;
  color: string;
  roughness: number;
  metalness: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  envMapIntensity?: number;
};

type EffectMaterialKey = keyof typeof effectMaterialCatalog;

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
const WALL_PREVIEW_HEIGHT_MM = 1180;
const WALL_SELECTED_HEIGHT_MM = 2250;
const WALL_PREVIEW_OPACITY = 0.94;
const WALL_SELECTED_OPACITY = 0.78;
const WALL_CAP_HEIGHT_MM = 86;
const WALL_CAP_COLOR = "#2f3538";
const WALL_CAP_SELECTED_COLOR = "#1d4ed8";
const CUTAWAY_OBJECT_MAX_HEIGHT_M = (WALL_PREVIEW_HEIGHT_MM - 90) * MM_TO_M;
const RAILING_COLOR = "#0891b2";
const RAILING_SELECTED_COLOR = "#2563eb";
const CAMERA_TARGET = new THREE.Vector3(0.12, 0.42, 0.32);
const cameraPositions: Record<CameraPreset, [number, number, number]> = {
  overview: [6.7, 7.85, 7.45],
  front: [0, 5.9, 10.4],
  right: [10.4, 5.9, 0],
  back: [0, 5.9, -10.4],
  left: [-10.4, 5.9, 0],
  living: [5.8, 3.9, 7.2],
  kitchen: [1.6, 4.8, -7.8],
  stair: [-0.85, 4.85, 1.35],
  fireplace: [-4.1, 2.05, 3.18]
};
const cameraTargets: Record<CameraPreset, THREE.Vector3> = {
  overview: CAMERA_TARGET,
  front: CAMERA_TARGET,
  right: CAMERA_TARGET,
  back: CAMERA_TARGET,
  left: CAMERA_TARGET,
  living: CAMERA_TARGET,
  kitchen: CAMERA_TARGET,
  stair: new THREE.Vector3(-3.75, 0.42, -0.98),
  fireplace: new THREE.Vector3(-2.04, 0.44, 1.98)
};
const cameraRotationOrder: CameraPreset[] = ["front", "right", "back", "left"];
const cameraViewOptions: Array<[CameraPreset, string]> = [
  ["overview", "鸟瞰"],
  ["front", "前"],
  ["right", "右"],
  ["back", "后"],
  ["left", "左"],
  ["living", "客厅"],
  ["kitchen", "厨房"],
  ["stair", "楼梯"],
  ["fireplace", "壁炉"]
];
const designStyleOptions: Array<[DesignStylePreset, string]> = [
  ["naturalWood", "浅木自然"],
  ["softCream", "奶油白"],
  ["modernStone", "现代灰"],
  ["warmJapandi", "托斯卡纳阳光"]
];
const serviceMarkerOptions: Array<{ key: ServiceMarkerKey; label: string; color: string; emissive: string; angle: number }> = [
  { key: "water", label: "给水", color: "#38bdf8", emissive: "#0284c7", angle: -0.75 },
  { key: "drainage", label: "排水", color: "#22c55e", emissive: "#15803d", angle: 0.05 },
  { key: "power", label: "电源", color: "#f59e0b", emissive: "#b45309", angle: 0.85 },
  { key: "exhaust", label: "排烟", color: "#ef4444", emissive: "#b91c1c", angle: 1.55 }
];
const effectMaterialCatalog: Record<string, EffectMaterial> = {
  wallPaint: { label: "暖白乳胶漆墙面", color: "#f2eadf", roughness: 0.82, metalness: 0.01 },
  wallCap: { label: "深灰微水泥剖切墙帽", color: WALL_CAP_COLOR, roughness: 0.58, metalness: 0.03 },
  baseboard: { label: "浅橡木踢脚线", color: "#c2a17b", roughness: 0.54, metalness: 0.02 },
  doorWood: { label: "浅橡木门板/门套", color: "#c2a17c", roughness: 0.48, metalness: 0.02 },
  windowGlass: { label: "低铁玻璃", color: "#a8d0d8", roughness: 0.08, metalness: 0.02, opacity: 0.42 },
  blackMetal: { label: "黑钛金属框/拉手", color: "#2f3538", roughness: 0.26, metalness: 0.58 },
  fireplaceGlass: { label: "壁炉耐热玻璃", color: "#1f2526", roughness: 0.08, metalness: 0.16, opacity: 0.46 },
  fireplaceEmber: { label: "壁炉仿真木柴/余烬", color: "#5a3220", roughness: 0.72, metalness: 0 },
  warmStone: { label: "暖灰岩板/石材台面", color: "#ded3c2", roughness: 0.31, metalness: 0.04 },
  cabinetPaint: { label: "浅灰哑光柜门饰面", color: "#e9e7e2", roughness: 0.5, metalness: 0.02 },
  woodVeneer: { label: "浅橡木木饰面", color: "#c9aa82", roughness: 0.52, metalness: 0.02 },
  wovenFabric: { label: "米灰织物软包", color: "#d7c0ad", roughness: 0.9, metalness: 0 },
  ceramic: { label: "暖白陶瓷", color: "#f7f4ee", roughness: 0.28, metalness: 0.01 },
  plantLeaf: { label: "自然绿植", color: "#789d66", roughness: 0.74, metalness: 0 },
  outdoorStone: { label: "庭院石材铺装", color: "#b8afa2", roughness: 0.82, metalness: 0.02 },
  pebble: { label: "鹅卵石/砾石", color: "#aaa29a", roughness: 0.95, metalness: 0 },
  concrete: { label: "浅灰混凝土硬化地", color: "#bcb8ae", roughness: 0.88, metalness: 0.01 },
  warmLight: { label: "暖色氛围灯带", color: "#ffe8ae", roughness: 0.2, metalness: 0, emissive: "#ffe8ae", emissiveIntensity: 0.72 }
};
const interiorMaterialCatalog = {
  warmOak: { label: "浅橡木", color: "#c8ad8b", roughness: 0.52, metalness: 0.02, envMapIntensity: 0.42 },
  walnut: { label: "低饱和胡桃木", color: "#927965", roughness: 0.5, metalness: 0.02, envMapIntensity: 0.42 },
  honeyWood: { label: "蜂蜜木", color: "#c5a47d", roughness: 0.54, metalness: 0.02, envMapIntensity: 0.4 },
  creamFabric: { label: "奶油布艺", color: "#eee3d6", roughness: 0.92, metalness: 0, envMapIntensity: 0.24 },
  beigeFabric: { label: "米灰布艺", color: "#d8cabc", roughness: 0.94, metalness: 0, envMapIntensity: 0.22 },
  taupeFabric: { label: "灰褐布艺", color: "#aa9786", roughness: 0.93, metalness: 0, envMapIntensity: 0.22 },
  camelFabric: { label: "浅驼软装", color: "#b99876", roughness: 0.9, metalness: 0, envMapIntensity: 0.22 },
  warmGreyStone: { label: "暖灰石材", color: "#d8d1c6", roughness: 0.34, metalness: 0.04, envMapIntensity: 0.62 },
  travertine: { label: "米色洞石", color: "#ded2bd", roughness: 0.38, metalness: 0.03, envMapIntensity: 0.58 },
  microCement: { label: "暖灰微水泥", color: "#cbc3b8", roughness: 0.72, metalness: 0.02, envMapIntensity: 0.36 },
  warmWhiteCeramic: { label: "暖白陶瓷", color: "#fbf8f1", roughness: 0.26, metalness: 0.01, envMapIntensity: 0.58 },
  blackTitanium: { label: "黑钛金属", color: "#343331", roughness: 0.28, metalness: 0.68, envMapIntensity: 0.72 },
  brushedBronze: { label: "拉丝古铜", color: "#a17f5b", roughness: 0.26, metalness: 0.72, envMapIntensity: 0.78 },
  clearGlass: { label: "低铁玻璃", color: "#c9e7e8", roughness: 0.04, metalness: 0.02, opacity: 0.34, envMapIntensity: 0.92 },
  smokedGlass: { label: "茶色玻璃", color: "#8f8379", roughness: 0.08, metalness: 0.04, opacity: 0.38, envMapIntensity: 0.78 },
  mirror: { label: "镜面", color: "#b9c4c4", roughness: 0.06, metalness: 0.82, opacity: 0.68, envMapIntensity: 1.1 },
  warmLightEmissive: { label: "2700K-3000K 暖光", color: "#ffe7b0", roughness: 0.18, metalness: 0, emissive: "#ffe7b0", emissiveIntensity: 0.74, envMapIntensity: 0.35 },
  plantSoftGreen: { label: "低饱和绿植", color: "#7f936c", roughness: 0.72, metalness: 0, envMapIntensity: 0.26 },
  shadowLine: { label: "柔和分缝", color: "#7d7166", roughness: 0.7, metalness: 0.03, opacity: 0.46, envMapIntensity: 0.2 }
} satisfies Record<string, EffectMaterial>;
type InteriorMaterialKey = keyof typeof interiorMaterialCatalog;
const materialLegendText = [
  effectMaterialCatalog.wallPaint.label,
  effectMaterialCatalog.wallCap.label,
  interiorMaterialCatalog.travertine.label,
  interiorMaterialCatalog.warmOak.label,
  interiorMaterialCatalog.creamFabric.label,
  interiorMaterialCatalog.clearGlass.label,
  interiorMaterialCatalog.brushedBronze.label
].join(" / ");
function effectMaterialProps(key: EffectMaterialKey) {
  const material = effectMaterialCatalog[key];
  return {
    color: material.color,
    roughness: material.roughness,
    metalness: material.metalness,
    transparent: material.opacity !== undefined && material.opacity < 1,
    opacity: material.opacity ?? 1,
    emissive: material.emissive,
    emissiveIntensity: material.emissiveIntensity ?? 0,
    envMapIntensity: material.envMapIntensity ?? 0.7
  };
}
function interiorMaterialProps(key: InteriorMaterialKey, overrides: Partial<EffectMaterial> = {}) {
  const material = { ...interiorMaterialCatalog[key], ...overrides };
  return {
    color: material.color,
    roughness: material.roughness,
    metalness: material.metalness,
    transparent: material.opacity !== undefined && material.opacity < 1,
    opacity: material.opacity ?? 1,
    emissive: material.emissive,
    emissiveIntensity: material.emissiveIntensity ?? 0,
    envMapIntensity: material.envMapIntensity ?? 0.65
  };
}
function materialColor(key: InteriorMaterialKey) {
  return interiorMaterialCatalog[key].color;
}
function materialLayerProps(layer: ResolvedRender3DMaterialLayer, overrides: Partial<EffectMaterial> = {}) {
  const material = { ...layer, ...overrides };
  return {
    color: material.color,
    roughness: material.roughness,
    metalness: material.metalness,
    transparent: material.opacity !== undefined && material.opacity < 1,
    opacity: material.opacity ?? 1,
    emissive: material.emissive,
    emissiveIntensity: material.emissiveIntensity ?? 0,
    envMapIntensity: material.envMapIntensity ?? 0.65
  };
}
type Render3DMaterialRole = ResolvedRender3DMaterialLayer["role"];
function pickMaterialLayer(materials: ResolvedRender3DMaterials, roles: Render3DMaterialRole[], fallback: ResolvedRender3DMaterialLayer) {
  return [materials.primary, materials.secondary, materials.accent].find((layer) => roles.includes(layer.role)) ?? fallback;
}
function CatalogMaterial({
  materialKey,
  map = null,
  side,
  depthWrite,
  overrides = {}
}: {
  materialKey: InteriorMaterialKey;
  map?: THREE.Texture | null;
  side?: THREE.Side;
  depthWrite?: boolean;
  overrides?: Partial<EffectMaterial>;
}) {
  const props = interiorMaterialProps(materialKey, overrides);
  return <meshStandardMaterial {...props} map={map ?? undefined} side={side} depthWrite={depthWrite} />;
}
const designStylePalettes: Record<DesignStylePreset, DesignStylePalette> = {
  naturalWood: {
    label: "浅木自然",
    background: "#f5f1e8",
    floorBase: "#eee9dd",
    floorVein: "#bfc6c1",
    floorJoint: "#d5d0c5",
    wall: "#d8cec0",
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
    wall: "#ddd2c2",
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
    wall: "#c8c6bf",
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
    label: "托斯卡纳阳光",
    background: "#f7f2ea",
    floorBase: "#ebe4d8",
    floorVein: "#c9bfb1",
    floorJoint: "#d9cec0",
    wall: "#eadfd2",
    kitchenCabinet: "#f0ede7",
    islandBase: "#e4ddd1",
    islandTop: "#d9d2c8",
    countertop: "#e6e0d6",
    wood: "#c7ad8b",
    fabric: "#ded0c1",
    leather: "#9b806a",
    metal: "#a29b91",
    glass: "#b7d9dd",
    plant: "#819b67",
    accent: "#a77f62",
    light: "#ffe8b8",
    grid: "#ded3c4"
  }
};
const MASTER_BATH_ROOM_ID = "ROOM-2F-003";
const masterBathPalette = {
  floor: "#d5ccc0",
  floorJoint: "#b9aea1",
  floorVein: "#eee7dc",
  wall: "#d8cec1",
  wood: "#c7ad8d",
  woodDark: "#a69078",
  stoneTop: "#eee9df",
  ceramic: "#f7f4ee",
  glass: "#b7d9dd",
  metal: "#706b63",
  light: "#ffe8b8"
};
const bathroomModuleTypes = new Set(["shower", "vanity", "bathtub", "toilet", "sink"]);
const walkthroughStops = [
  { position: new THREE.Vector3(-4.25, 1.35, -0.4), target: new THREE.Vector3(-1.2, 0.85, -0.35) },
  { position: new THREE.Vector3(-1.2, 1.45, 4.1), target: new THREE.Vector3(1.4, 0.9, 0.9) },
  { position: new THREE.Vector3(2.7, 1.45, 3.1), target: new THREE.Vector3(0.6, 0.85, -0.9) },
  { position: new THREE.Vector3(3.8, 1.55, -2.8), target: new THREE.Vector3(0.2, 0.9, -0.4) },
  { position: new THREE.Vector3(-2.8, 1.5, -3.2), target: new THREE.Vector3(-0.8, 0.85, 0.8) }
];
const walkthroughSegmentSeconds = 4.6;

type ProceduralTextureKind = "wood" | "stone" | "fabric" | "wall";
type Vec3Tuple = [number, number, number];

function RoundedBoxMesh({
  args,
  radius = 0.035,
  smoothness = 3,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  map = null,
  roughness = 0.62,
  metalness = 0.02,
  opacity = 1,
  transparent,
  emissive = "#000000",
  emissiveIntensity = 0,
  castShadow = true,
  receiveShadow = true,
  depthWrite = true,
  renderOrder,
  envMapIntensity = 0.6
}: {
  args: Vec3Tuple;
  radius?: number;
  smoothness?: number;
  position?: Vec3Tuple;
  rotation?: Vec3Tuple;
  color: string;
  map?: THREE.Texture | null;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  transparent?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  depthWrite?: boolean;
  renderOrder?: number;
  envMapIntensity?: number;
}) {
  const geometry = useMemo(() => {
    const minSide = Math.min(...args);
    const safeRadius = Math.min(radius, Math.max(0.006, minSide * 0.42));
    return new RoundedBoxGeometry(args[0], args[1], args[2], smoothness, safeRadius);
  }, [args, radius, smoothness]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      position={position}
      rotation={rotation}
      renderOrder={renderOrder}
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={color}
        map={map ?? undefined}
        roughness={roughness}
        metalness={metalness}
        transparent={transparent ?? opacity < 1}
        opacity={opacity}
        depthWrite={depthWrite}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        envMapIntensity={envMapIntensity}
      />
    </mesh>
  );
}

function shouldUseFineAsset({ materialPreview, resolvedAsset }: FurnitureAssetGroupProps) {
  return materialPreview && resolvedAsset.detailLevel !== "draft";
}

function isClosetFurnitureModule(item: Furniture, structure: HouseStructure) {
  const room = structure.rooms.find((candidate) => candidate.id === item.roomId);
  return Boolean(room && isClosetRoom(room)) || item.name.includes("衣帽间");
}

function useFineAssetMetrics({ item, structure, designStyle, resolvedAsset }: FurnitureAssetGroupProps) {
  const position = getFurnitureScenePosition(item, structure);
  const width = Math.max(0.12, item.dimensions.width / 100);
  const depth = Math.max(0.08, item.dimensions.depth / 100);
  const height = getFurnitureHeight(item);
  const rotation = -(item.position.rotation || 0) * Math.PI / 180;
  const groupY = height / 2 + 0.035;
  const palette = designStylePalettes[designStyle];
  const materials = resolvedAsset.materials;
  const renderVariant = getFurnitureRenderVariant(item, palette, materials);
  return {
    position,
    width,
    depth,
    height,
    rotation,
    groupY,
    frontZ: depth / 2 + 0.01,
    topLocalY: height / 2 + 0.025,
    ceilingLocalY: 2.28 - groupY,
    palette,
    materials,
    renderVariant
  };
}

function SelectableFurnitureGroup({
  props,
  groupY,
  position,
  rotation,
  children
}: {
  props: FurnitureAssetGroupProps;
  groupY: number;
  position: ScenePoint;
  rotation: number;
  children: ReactNode;
}) {
  const { item, resolvedAsset, onSelect, onHover, onClearHover } = props;
  const childContent = resolvedAsset.childrenMode === "grouped"
    ? <group name={`${item.id}-render3d-children`} userData={{ childrenMode: "grouped" }}>{children}</group>
    : children;
  return (
    <group
      name={`${item.id}-render3d-root`}
      userData={{ childrenMode: resolvedAsset.childrenMode, assetType: resolvedAsset.assetType }}
      position={[position.x, groupY, position.z]}
      rotation={[0, rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        if (resolvedAsset.selectableIn3d) onSelect(item);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (resolvedAsset.selectableIn3d) onHover(item.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        if (resolvedAsset.selectableIn3d) onClearHover(item.id);
      }}
    >
      {childContent}
    </group>
  );
}

function Bed3DAsset(props: FurnitureAssetGroupProps) {
  const { item } = props;
  const metrics = useFineAssetMetrics(props);
  const { position, width, depth, height, rotation, groupY, renderVariant } = metrics;
  const isMaster = item.roomId === "ROOM-2F-006";
  const woodTexture = useProceduralTexture("wood", renderVariant.wood, renderVariant.woodGrain, 2.4, 1.25);
  const fabricTexture = useProceduralTexture("fabric", renderVariant.fabric, renderVariant.runner, 3.2, 3.2);
  const accentTexture = useProceduralTexture("fabric", renderVariant.accent, renderVariant.runner, 2.4, 2.4);
  const pillowCount = width >= 1.65 ? 4 : 2;
  const pillowWidth = Math.min(0.5, width * (pillowCount > 2 ? 0.22 : 0.32));
  const pillowRows = pillowCount > 2 ? [-0.34, -0.2] : [-0.3];
  const pillowXs = pillowCount > 2 ? [-0.24, 0.24] : [-0.22, 0.22];
  const headboardHeight = Math.min(height * (isMaster ? 0.92 : 0.78), isMaster ? 0.9 : 0.74);
  const mattressY = -height * 0.12;
  const duvetY = height * 0.035;

  return (
    <SelectableFurnitureGroup props={props} position={position} groupY={groupY} rotation={rotation}>
      <RoundedBoxMesh
        args={[width * 1.22, 0.026, depth * 1.04]}
        position={[0, -height * 0.5, 0.06]}
        radius={0.08}
        smoothness={5}
        color={renderVariant.rug}
        map={fabricTexture}
        transparent
        opacity={0.78}
        roughness={0.94}
        castShadow={false}
      />
      <RoundedBoxMesh
        args={[width * 1.03, 0.24, depth * 0.88]}
        position={[0, -height * 0.29, 0.04]}
        radius={0.085}
        smoothness={5}
        color={renderVariant.wood}
        map={woodTexture}
        roughness={interiorMaterialCatalog.warmOak.roughness}
        metalness={interiorMaterialCatalog.warmOak.metalness}
      />
      <RoundedBoxMesh
        args={[width * 0.96, 0.18, depth * 0.76]}
        position={[0, mattressY, depth * 0.045]}
        radius={0.095}
        smoothness={7}
        color={renderVariant.fabric}
        map={fabricTexture}
        roughness={interiorMaterialCatalog.creamFabric.roughness}
      />
      <RoundedBoxMesh
        args={[width * 0.9, 0.12, depth * 0.56]}
        position={[0, duvetY, depth * 0.11]}
        radius={0.11}
        smoothness={8}
        color={isMaster ? "#efe2d4" : "#f1e8dd"}
        map={fabricTexture}
        roughness={0.94}
      />
      {Array.from({ length: 5 }, (_, index) => (
        <RoundedBoxMesh
          key={`${item.id}-duvet-soft-fold-${index}`}
          args={[width * (0.76 - index * 0.035), 0.017, 0.02]}
          position={[0, duvetY + 0.064 + Math.sin(index) * 0.004, depth * (-0.08 + index * 0.088)]}
          radius={0.013}
          smoothness={3}
          color="#fff7ee"
          transparent
          opacity={0.36}
          roughness={0.98}
          castShadow={false}
        />
      ))}
      <RoundedBoxMesh
        args={[width * 1.08, headboardHeight, 0.16]}
        position={[0, height * 0.02, -depth / 2 - 0.06]}
        radius={0.07}
        smoothness={5}
        color={renderVariant.bedding}
        map={fabricTexture}
        roughness={0.9}
      />
      {Array.from({ length: isMaster ? 5 : 4 }, (_, index) => {
        const count = isMaster ? 5 : 4;
        const x = -width * 0.45 + (index * width * 0.9) / Math.max(1, count - 1);
        return (
          <mesh key={`${item.id}-headboard-seam-${index}`} position={[x, height * 0.03, -depth / 2 + 0.028]}>
            <boxGeometry args={[0.014, headboardHeight * 0.74, 0.018]} />
            <CatalogMaterial materialKey="shadowLine" />
          </mesh>
        );
      })}
      {pillowRows.flatMap((rowZ, rowIndex) => pillowXs.map((xRatio, index) => (
        <RoundedBoxMesh
          key={`${item.id}-pillow-${rowIndex}-${index}`}
          args={[pillowWidth, 0.1, Math.min(0.34, depth * 0.14)]}
          position={[xRatio * width, height * (rowIndex ? 0.115 : 0.075), depth * rowZ]}
          rotation={[0, 0, rowIndex ? (index ? -0.05 : 0.05) : 0]}
          radius={0.065}
          smoothness={7}
          color={rowIndex ? "#e3d4c2" : "#fbf4ea"}
          map={fabricTexture}
          roughness={0.96}
        />
      )))}
      {Array.from({ length: isMaster ? 2 : 1 }, (_, index) => (
        <RoundedBoxMesh
          key={`${item.id}-accent-cushion-${index}`}
          args={[width * 0.17, 0.09, depth * 0.12]}
          position={[(index ? 0.12 : -0.12) * width, height * 0.16, -depth * 0.13]}
          rotation={[0, 0, index ? -0.1 : 0.1]}
          radius={0.048}
          smoothness={6}
          color={index ? renderVariant.accent : renderVariant.runner}
          map={accentTexture}
          roughness={0.93}
        />
      ))}
      <RoundedBoxMesh
        args={[width * 0.86, 0.052, depth * 0.18]}
        position={[0, height * 0.07, depth * 0.22]}
        radius={0.045}
        smoothness={5}
        color={isMaster ? "#9b806a" : "#a89480"}
        map={accentTexture}
        roughness={0.92}
      />
      <mesh castShadow receiveShadow position={[0, height * 0.105, depth * 0.33]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.052, 0.052, width * 0.72, 28]} />
        <CatalogMaterial materialKey="beigeFabric" map={fabricTexture} />
      </mesh>
      {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
        <mesh key={`${item.id}-fine-bed-leg-${xSide}-${zSide}`} castShadow position={[xSide * width * 0.41, -height * 0.42, zSide * depth * 0.34]}>
          <cylinderGeometry args={[0.025, 0.032, 0.16, 12]} />
          <CatalogMaterial materialKey={isMaster ? "walnut" : "warmOak"} />
        </mesh>
      )))}
      {isMaster && <pointLight color={renderVariant.light} intensity={0.28} distance={1.8} position={[0, 0.52, -depth * 0.42]} />}
    </SelectableFurnitureGroup>
  );
}

function Nightstand3DAsset(props: FurnitureAssetGroupProps) {
  const { item } = props;
  const metrics = useFineAssetMetrics(props);
  const { position, width, depth, height, rotation, groupY, topLocalY } = metrics;
  const woodTexture = useProceduralTexture("wood", materialColor("warmOak"), "#a99174", 1.6, 1.1);

  return (
    <SelectableFurnitureGroup props={props} position={position} groupY={groupY} rotation={rotation}>
      <RoundedBoxMesh
        args={[width * 0.92, height * 0.74, depth * 0.88]}
        position={[0, -height * 0.08, 0]}
        radius={0.045}
        smoothness={5}
        color={materialColor("warmOak")}
        map={woodTexture}
        roughness={interiorMaterialCatalog.warmOak.roughness}
        metalness={interiorMaterialCatalog.warmOak.metalness}
      />
      <RoundedBoxMesh
        args={[width, 0.048, depth * 0.96]}
        position={[0, topLocalY, 0]}
        radius={0.03}
        color={materialColor("travertine")}
        roughness={interiorMaterialCatalog.travertine.roughness}
        metalness={interiorMaterialCatalog.travertine.metalness}
      />
      {[-0.1, -0.28].map((yOffset, index) => (
        <group key={`${item.id}-nightstand-drawer-${index}`} position={[0, yOffset * height, depth * 0.45 + 0.016]}>
          <mesh>
            <boxGeometry args={[width * 0.78, 0.014, 0.016]} />
            <CatalogMaterial materialKey="shadowLine" />
          </mesh>
          <mesh position={[0, -height * 0.055, 0.012]}>
            <boxGeometry args={[width * 0.32, 0.014, 0.018]} />
            <CatalogMaterial materialKey="brushedBronze" />
          </mesh>
        </group>
      ))}
      <pointLight color={materialColor("warmLightEmissive")} intensity={0.22} distance={1.15} position={[0, height * 0.7, 0]} />
      <mesh position={[0, height * 0.4, 0]}>
        <cylinderGeometry args={[0.025, 0.025, height * 0.38, 14]} />
        <CatalogMaterial materialKey="brushedBronze" />
      </mesh>
      <mesh position={[0, height * 0.68, 0]}>
        <cylinderGeometry args={[Math.min(width, depth) * 0.18, Math.min(width, depth) * 0.25, height * 0.22, 32]} />
        <CatalogMaterial materialKey="warmLightEmissive" overrides={{ emissiveIntensity: 0.42 }} />
      </mesh>
      <group position={[-width * 0.24, topLocalY + 0.04, depth * 0.12]}>
        <RoundedBoxMesh args={[width * 0.26, 0.018, depth * 0.2]} radius={0.01} color={materialColor("taupeFabric")} roughness={0.86} />
        <RoundedBoxMesh args={[width * 0.22, 0.02, depth * 0.16]} position={[0.012, 0.024, -0.008]} radius={0.01} color={materialColor("creamFabric")} roughness={0.9} />
      </group>
      <group position={[width * 0.24, topLocalY + 0.04, -depth * 0.08]}>
        <mesh>
          <cylinderGeometry args={[0.038, 0.046, 0.08, 18]} />
          <CatalogMaterial materialKey="travertine" />
        </mesh>
        <mesh position={[0, 0.09, 0]} scale={[1, 0.62, 1]}>
          <sphereGeometry args={[0.08, 16, 10]} />
          <CatalogMaterial materialKey="plantSoftGreen" />
        </mesh>
      </group>
    </SelectableFurnitureGroup>
  );
}

function Wardrobe3DAsset(props: FurnitureAssetGroupProps & { forceOpen?: boolean }) {
  const { item, structure, forceOpen = false } = props;
  const metrics = useFineAssetMetrics(props);
  const { position, width, depth, height, rotation, groupY, frontZ, renderVariant } = metrics;
  const closetMode = forceOpen || isClosetFurnitureModule(item, structure);
  const woodKey: InteriorMaterialKey = item.roomId === "ROOM-2F-006" ? "walnut" : "warmOak";
  const woodTexture = useProceduralTexture("wood", renderVariant.wood, renderVariant.woodGrain, 2.6, 1.2);
  const interiorTexture = useProceduralTexture("wood", renderVariant.wardrobeInterior, renderVariant.darkWood, 2.2, 1.1);
  const fabricTexture = useProceduralTexture("fabric", renderVariant.fabric, renderVariant.runner, 2.4, 2.4);
  const openRatio = closetMode ? 0.78 : item.roomId === "ROOM-2F-006" ? 0.58 : 0.44;
  const openWidth = Math.max(width * openRatio, Math.min(width * 0.72, 0.72));
  const closedPanelWidth = Math.max(0, (width - openWidth) / 2);
  const doorCount = Math.max(2, Math.min(5, Math.round(width / 0.55)));
  const drawerCount = Math.max(2, Math.min(4, Math.round(width / 0.7)));
  const clothCount = Math.max(4, Math.min(8, Math.round(openWidth / 0.24)));
  const hasGlass = closetMode || item.name.includes("玻璃") || item.name.includes("包");

  return (
    <SelectableFurnitureGroup props={props} position={position} groupY={groupY} rotation={rotation}>
      <RoundedBoxMesh
        args={[width, height * 0.96, depth * 0.88]}
        position={[0, 0, -depth * 0.04]}
        radius={0.034}
        smoothness={4}
        color={renderVariant.wood}
        map={woodTexture}
        roughness={interiorMaterialCatalog[woodKey].roughness}
        metalness={interiorMaterialCatalog[woodKey].metalness}
      />
      <RoundedBoxMesh
        args={[width * 1.02, 0.06, depth * 0.94]}
        position={[0, height * 0.5 + 0.02, -depth * 0.04]}
        radius={0.018}
        color={renderVariant.wood}
        map={woodTexture}
        roughness={0.52}
      />
      <RoundedBoxMesh
        args={[width * 1.01, 0.07, depth * 0.92]}
        position={[0, -height * 0.48, -depth * 0.035]}
        radius={0.018}
        color={renderVariant.metal}
        roughness={0.34}
        metalness={0.36}
      />
      <RoundedBoxMesh
        args={[openWidth, height * 0.72, depth * 0.72]}
        position={[0, height * 0.03, frontZ - depth * 0.38]}
        radius={0.026}
        color={renderVariant.wardrobeInterior}
        map={interiorTexture}
        roughness={0.56}
        metalness={0.02}
      />
      {[-1, 1].map((xSide) => (
        <mesh key={`${item.id}-closet-side-frame-${xSide}`} position={[xSide * openWidth * 0.5, height * 0.04, frontZ - depth * 0.04]}>
          <boxGeometry args={[0.034, height * 0.76, 0.06]} />
          <CatalogMaterial materialKey={woodKey} map={woodTexture} />
        </mesh>
      ))}
      {[-0.23, 0.02, 0.27].map((yRatio) => (
        <mesh key={`${item.id}-closet-open-shelf-${yRatio}`} position={[0, yRatio * height, frontZ - depth * 0.03]}>
          <boxGeometry args={[openWidth * 0.94, 0.027, 0.07]} />
          <CatalogMaterial materialKey="honeyWood" map={interiorTexture} />
        </mesh>
      ))}
      <mesh position={[0, height * 0.41, frontZ - depth * 0.02]}>
        <boxGeometry args={[openWidth * 0.94, 0.022, 0.034]} />
        <CatalogMaterial materialKey="warmLightEmissive" overrides={{ emissiveIntensity: closetMode ? 0.82 : 0.58 }} />
      </mesh>
      <mesh position={[0, height * 0.19, frontZ - depth * 0.01]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, openWidth * 0.82, 14]} />
        <CatalogMaterial materialKey="brushedBronze" />
      </mesh>
      {Array.from({ length: clothCount }, (_, index) => {
        const x = -openWidth * 0.39 + (index * openWidth * 0.78) / Math.max(1, clothCount - 1);
        const clothColor = renderVariant.clothColors[index % renderVariant.clothColors.length];
        return (
          <group key={`${item.id}-fine-cloth-${index}`} position={[x, height * (0.03 - (index % 3) * 0.012), frontZ + 0.02]}>
            <RoundedBoxMesh
              args={[Math.max(0.08, openWidth * 0.07), height * (0.26 + (index % 3) * 0.035), 0.048]}
              radius={0.018}
              color={clothColor}
              map={fabricTexture}
              roughness={0.88}
            />
            <mesh position={[0, height * 0.16, 0.02]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.009, 0.009, Math.max(0.07, openWidth * 0.06), 10]} />
              <CatalogMaterial materialKey="brushedBronze" />
            </mesh>
          </group>
        );
      })}
      {Array.from({ length: drawerCount }, (_, index) => {
        const drawerWidth = (openWidth * 0.92) / drawerCount;
        const x = -openWidth * 0.46 + drawerWidth * (index + 0.5);
        return (
          <group key={`${item.id}-fine-wardrobe-drawer-${index}`} position={[x, -height * 0.3, frontZ + 0.026]}>
            <RoundedBoxMesh
              args={[drawerWidth - 0.025, height * 0.12, 0.052]}
              radius={0.018}
              color={renderVariant.wood}
              map={woodTexture}
              roughness={0.54}
              metalness={0.02}
            />
            <mesh position={[0, 0, 0.036]}>
              <boxGeometry args={[Math.min(0.16, drawerWidth * 0.42), 0.012, 0.016]} />
              <CatalogMaterial materialKey="brushedBronze" />
            </mesh>
          </group>
        );
      })}
      {closedPanelWidth > 0.08 && [-1, 1].map((xSide) => (
        <group key={`${item.id}-closed-door-zone-${xSide}`} position={[xSide * (openWidth / 2 + closedPanelWidth / 2), height * 0.03, frontZ + 0.025]}>
          <RoundedBoxMesh
            args={[closedPanelWidth * 0.9, height * 0.74, 0.05]}
            radius={0.024}
            color={renderVariant.wood}
            map={woodTexture}
            roughness={0.52}
            metalness={0.02}
          />
          {hasGlass && (
            <mesh position={[0, height * 0.05, 0.035]}>
              <boxGeometry args={[closedPanelWidth * 0.7, height * 0.5, 0.018]} />
              <CatalogMaterial materialKey="smokedGlass" depthWrite={false} />
            </mesh>
          )}
          <mesh position={[xSide * closedPanelWidth * 0.28, -height * 0.02, 0.05]}>
            <boxGeometry args={[0.018, height * 0.44, 0.018]} />
            <CatalogMaterial materialKey="brushedBronze" />
          </mesh>
        </group>
      ))}
      {Array.from({ length: doorCount - 1 }, (_, index) => {
        const x = -width / 2 + ((index + 1) * width) / doorCount;
        return (
          <mesh key={`${item.id}-fine-door-gap-${index}`} position={[x, 0, frontZ + 0.058]}>
            <boxGeometry args={[0.01, height * 0.76, 0.012]} />
            <CatalogMaterial materialKey="shadowLine" />
          </mesh>
        );
      })}
      {Array.from({ length: Math.max(2, Math.min(4, Math.round(openWidth / 0.48))) }, (_, index) => {
        const boxWidth = openWidth / Math.max(2, Math.min(4, Math.round(openWidth / 0.48))) - 0.05;
        const x = -openWidth / 2 + boxWidth / 2 + 0.045 + index * (boxWidth + 0.045);
        return (
          <RoundedBoxMesh
            key={`${item.id}-closet-storage-box-${index}`}
            args={[boxWidth, height * 0.082, 0.14]}
            position={[x, -height * 0.155, frontZ + 0.055]}
            radius={0.018}
            color={index % 2 ? renderVariant.accent : renderVariant.fabric}
            map={fabricTexture}
            roughness={0.86}
          />
        );
      })}
      {closetMode && <pointLight color={renderVariant.light} intensity={0.34} distance={1.55} position={[0, height * 0.38, frontZ + 0.12]} />}
    </SelectableFurnitureGroup>
  );
}

function BathroomVanity3DAsset(props: FurnitureAssetGroupProps) {
  const { item } = props;
  const metrics = useFineAssetMetrics(props);
  const { position, width, depth, height, rotation, groupY, frontZ, topLocalY } = metrics;
  const { renderVariant } = metrics;
  const woodTexture = useProceduralTexture("wood", renderVariant.wood, renderVariant.woodGrain, 1.8, 1.1);
  const stoneTexture = useProceduralTexture("stone", renderVariant.stone, "#b8aa98", 1.6, 1.2);
  const basinCount = width >= 1.25 ? 2 : 1;

  return (
    <SelectableFurnitureGroup props={props} position={position} groupY={groupY} rotation={rotation}>
      <RoundedBoxMesh
        args={[width * 0.96, height * 0.58, depth * 0.82]}
        position={[0, -height * 0.15, 0]}
        radius={0.045}
        smoothness={5}
        color={renderVariant.wood}
        map={woodTexture}
        roughness={interiorMaterialCatalog.warmOak.roughness}
        metalness={interiorMaterialCatalog.warmOak.metalness}
      />
      <RoundedBoxMesh
        args={[width * 1.04, 0.065, depth * 0.92]}
        position={[0, topLocalY, 0]}
        radius={0.03}
        color={renderVariant.stone}
        map={stoneTexture}
        roughness={interiorMaterialCatalog.travertine.roughness}
        metalness={interiorMaterialCatalog.travertine.metalness}
      />
      {Array.from({ length: Math.max(2, Math.min(4, Math.round(width / 0.45))) }, (_, index) => {
        const drawerWidth = (width * 0.88) / Math.max(2, Math.min(4, Math.round(width / 0.45)));
        const x = -width * 0.44 + drawerWidth * (index + 0.5);
        return (
          <group key={`${item.id}-vanity-drawer-${index}`} position={[x, -height * 0.13, frontZ + 0.03]}>
            <mesh>
              <boxGeometry args={[drawerWidth * 0.88, 0.012, 0.014]} />
              <CatalogMaterial materialKey="shadowLine" />
            </mesh>
            <mesh position={[0, -height * 0.08, 0.014]}>
              <boxGeometry args={[Math.min(0.16, drawerWidth * 0.44), 0.012, 0.014]} />
              <CatalogMaterial materialKey="brushedBronze" />
            </mesh>
          </group>
        );
      })}
      {Array.from({ length: basinCount }, (_, index) => {
        const x = basinCount === 1 ? 0 : (index ? 0.24 : -0.24) * width;
        return (
          <group key={`${item.id}-fine-basin-${index}`} position={[x, topLocalY + 0.045, -depth * 0.04]}>
            <mesh receiveShadow scale={[1.2, 0.28, 0.8]}>
              <sphereGeometry args={[Math.min(width / basinCount, depth) * 0.17, 36, 18]} />
              <CatalogMaterial materialKey="warmWhiteCeramic" />
            </mesh>
            <mesh position={[0, 0.018, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[Math.min(width / basinCount, depth) * 0.145, 0.012, 12, 36]} />
              <CatalogMaterial materialKey="warmWhiteCeramic" />
            </mesh>
            <mesh position={[Math.min(0.16, width * 0.09), 0.11, -depth * 0.12]}>
              <cylinderGeometry args={[0.014, 0.014, 0.18, 14]} />
              <CatalogMaterial materialKey="brushedBronze" />
            </mesh>
            <mesh position={[Math.min(0.09, width * 0.06), 0.19, -depth * 0.12]}>
              <boxGeometry args={[0.16, 0.018, 0.022]} />
              <CatalogMaterial materialKey="brushedBronze" />
            </mesh>
          </group>
        );
      })}
      <RoundedBoxMesh
        args={[width * 0.88, Math.min(0.42, height * 0.54), 0.035]}
        position={[0, Math.min(height * 0.75, 0.62), frontZ + 0.046]}
        radius={0.025}
        smoothness={4}
        color={renderVariant.glass}
        roughness={interiorMaterialCatalog.mirror.roughness}
        metalness={interiorMaterialCatalog.mirror.metalness}
        transparent
        opacity={interiorMaterialCatalog.mirror.opacity}
        depthWrite={false}
      />
      <mesh position={[0, Math.min(height * 1.02, 0.84), frontZ + 0.07]}>
        <boxGeometry args={[width * 0.82, 0.026, 0.03]} />
        <meshStandardMaterial color={renderVariant.light} emissive={renderVariant.light} emissiveIntensity={0.76} roughness={0.18} />
      </mesh>
      <group position={[width * 0.34, topLocalY + 0.08, depth * 0.12]}>
        <mesh>
          <cylinderGeometry args={[0.028, 0.036, 0.085, 18]} />
          <CatalogMaterial materialKey="travertine" />
        </mesh>
        <mesh position={[0, 0.09, 0]} scale={[1, 0.62, 1]}>
          <sphereGeometry args={[0.076, 16, 10]} />
          <CatalogMaterial materialKey="plantSoftGreen" />
        </mesh>
      </group>
      <pointLight color={renderVariant.light} intensity={0.2} distance={1.4} position={[0, 0.72, frontZ + 0.16]} />
    </SelectableFurnitureGroup>
  );
}

function Toilet3DAsset(props: FurnitureAssetGroupProps) {
  const { item } = props;
  const metrics = useFineAssetMetrics(props);
  const { position, width, depth, height, rotation, groupY } = metrics;
  const ceramicRadius = Math.min(width, depth) * 0.28;

  return (
    <SelectableFurnitureGroup props={props} position={position} groupY={groupY} rotation={rotation}>
      <RoundedBoxMesh
        args={[width * 0.58, height * 0.34, depth * 0.5]}
        position={[0, -height * 0.28, depth * 0.08]}
        radius={0.08}
        smoothness={7}
        color={materialColor("warmWhiteCeramic")}
        roughness={interiorMaterialCatalog.warmWhiteCeramic.roughness}
        metalness={interiorMaterialCatalog.warmWhiteCeramic.metalness}
      />
      <mesh castShadow receiveShadow position={[0, -height * 0.05, depth * 0.05]} scale={[1.12, 0.34, 1.28]}>
        <sphereGeometry args={[ceramicRadius, 36, 18]} />
        <CatalogMaterial materialKey="warmWhiteCeramic" />
      </mesh>
      <mesh position={[0, height * 0.055, depth * 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ceramicRadius * 0.62, 0.024, 14, 42]} />
        <CatalogMaterial materialKey="warmWhiteCeramic" />
      </mesh>
      <RoundedBoxMesh
        args={[width * 0.62, 0.055, depth * 0.52]}
        position={[0, height * 0.105, depth * 0.025]}
        radius={0.052}
        smoothness={5}
        color="#f4eee6"
        roughness={0.32}
        metalness={0.01}
      />
      <RoundedBoxMesh
        args={[width * 0.78, height * 0.42, depth * 0.16]}
        position={[0, height * 0.24, -depth * 0.38]}
        radius={0.04}
        smoothness={5}
        color={materialColor("warmWhiteCeramic")}
        roughness={0.3}
        metalness={0.01}
      />
      <mesh position={[width * 0.25, height * 0.42, -depth * 0.47]}>
        <boxGeometry args={[0.11, 0.018, 0.012]} />
        <CatalogMaterial materialKey="brushedBronze" />
      </mesh>
      <mesh position={[-width * 0.38, -height * 0.05, -depth * 0.18]}>
        <cylinderGeometry args={[0.014, 0.014, 0.16, 12]} />
        <CatalogMaterial materialKey="brushedBronze" />
      </mesh>
    </SelectableFurnitureGroup>
  );
}

function Bathtub3DAsset(props: FurnitureAssetGroupProps) {
  const { item } = props;
  const metrics = useFineAssetMetrics(props);
  const { position, width, depth, height, rotation, groupY } = metrics;

  return (
    <SelectableFurnitureGroup props={props} position={position} groupY={groupY} rotation={rotation}>
      <RoundedBoxMesh
        args={[width * 0.94, height * 0.72, depth * 0.88]}
        position={[0, -height * 0.06, 0]}
        radius={Math.min(width, depth) * 0.18}
        smoothness={10}
        color={materialColor("warmWhiteCeramic")}
        roughness={0.22}
        metalness={0.01}
      />
      <RoundedBoxMesh
        args={[width * 0.7, height * 0.18, depth * 0.58]}
        position={[0, height * 0.16, 0]}
        radius={Math.min(width, depth) * 0.14}
        smoothness={9}
        color="#dceff1"
        transparent
        opacity={0.55}
        roughness={0.12}
        metalness={0.03}
        depthWrite={false}
      />
      {[-1, 1].map((xSide) => (
        <mesh key={`${item.id}-fine-bath-rim-${xSide}`} position={[xSide * width * 0.38, height * 0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, depth * 0.64, 18]} />
          <CatalogMaterial materialKey="warmWhiteCeramic" />
        </mesh>
      ))}
      <mesh position={[width * 0.32, height * 0.4, -depth * 0.22]}>
        <cylinderGeometry args={[0.018, 0.018, 0.24, 16]} />
        <CatalogMaterial materialKey="brushedBronze" />
      </mesh>
      <mesh position={[width * 0.24, height * 0.5, -depth * 0.22]}>
        <boxGeometry args={[0.18, 0.02, 0.024]} />
        <CatalogMaterial materialKey="brushedBronze" />
      </mesh>
      <mesh position={[width * 0.2, height * 0.28, depth * 0.28]}>
        <cylinderGeometry args={[0.035, 0.035, 0.012, 20]} />
        <CatalogMaterial materialKey="blackTitanium" />
      </mesh>
    </SelectableFurnitureGroup>
  );
}

function Shower3DAsset(props: FurnitureAssetGroupProps) {
  const { item } = props;
  const metrics = useFineAssetMetrics(props);
  const { position, width, depth, height, rotation, groupY, frontZ } = metrics;

  return (
    <SelectableFurnitureGroup props={props} position={position} groupY={groupY} rotation={rotation}>
      <RoundedBoxMesh
        args={[width * 0.96, 0.052, depth * 0.96]}
        position={[0, -height * 0.48, 0]}
        radius={0.028}
        color={materialColor("microCement")}
        roughness={interiorMaterialCatalog.microCement.roughness}
        metalness={interiorMaterialCatalog.microCement.metalness}
      />
      {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
        <mesh key={`${item.id}-fine-shower-post-${xSide}-${zSide}`} position={[xSide * width * 0.47, 0.02, zSide * depth * 0.47]}>
          <boxGeometry args={[0.024, height * 0.9, 0.024]} />
          <CatalogMaterial materialKey="blackTitanium" />
        </mesh>
      )))}
      <mesh position={[0, height * 0.1, frontZ + 0.01]}>
        <boxGeometry args={[width * 0.78, height * 0.78, 0.02]} />
        <CatalogMaterial materialKey="clearGlass" depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((xSide) => (
        <mesh key={`${item.id}-fine-shower-side-${xSide}`} position={[xSide * width * 0.47, height * 0.1, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[depth * 0.84, height * 0.76, 0.018]} />
          <CatalogMaterial materialKey="clearGlass" depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, height * 0.5, frontZ + 0.025]}>
        <boxGeometry args={[width * 0.86, 0.024, 0.026]} />
        <CatalogMaterial materialKey="blackTitanium" />
      </mesh>
      <mesh position={[width * 0.24, height * 0.18, -depth * 0.36]}>
        <cylinderGeometry args={[0.012, 0.012, height * 0.62, 12]} />
        <CatalogMaterial materialKey="brushedBronze" />
      </mesh>
      <mesh position={[width * 0.24, height * 0.43, -depth * 0.31]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.026, 32]} />
        <CatalogMaterial materialKey="brushedBronze" />
      </mesh>
      <mesh position={[-width * 0.26, height * 0.08, -depth * 0.38]}>
        <boxGeometry args={[0.2, 0.15, 0.035]} />
        <CatalogMaterial materialKey="warmLightEmissive" overrides={{ emissiveIntensity: 0.48 }} />
      </mesh>
      <mesh position={[width * 0.28, -height * 0.435, depth * 0.24]}>
        <cylinderGeometry args={[0.055, 0.055, 0.012, 24]} />
        <CatalogMaterial materialKey="blackTitanium" />
      </mesh>
    </SelectableFurnitureGroup>
  );
}

function Desk3DAsset(props: FurnitureAssetGroupProps) {
  const { item } = props;
  const metrics = useFineAssetMetrics(props);
  const { position, width, depth, height, rotation, groupY, topLocalY, frontZ } = metrics;
  const woodTexture = useProceduralTexture("wood", materialColor("warmOak"), "#ad9678", 1.8, 1.1);
  const isDresser = item.name.includes("梳妆") || item.name.includes("化妆") || item.name.includes("整理");

  return (
    <SelectableFurnitureGroup props={props} position={position} groupY={groupY} rotation={rotation}>
      <RoundedBoxMesh
        args={[width, 0.065, depth * 0.82]}
        position={[0, topLocalY, 0]}
        radius={0.028}
        color={materialColor("warmOak")}
        map={woodTexture}
        roughness={0.52}
        metalness={0.02}
      />
      <RoundedBoxMesh
        args={[width * 0.42, height * 0.26, depth * 0.74]}
        position={[width * 0.25, -height * 0.14, 0]}
        radius={0.026}
        color={materialColor("warmOak")}
        map={woodTexture}
        roughness={0.54}
        metalness={0.02}
      />
      {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
        <mesh key={`${item.id}-desk-leg-${xSide}-${zSide}`} position={[xSide * width * 0.42, -height * 0.2, zSide * depth * 0.28]}>
          <cylinderGeometry args={[0.018, 0.024, height * 0.54, 12]} />
          <CatalogMaterial materialKey="blackTitanium" />
        </mesh>
      )))}
      {[-0.04, -0.17].map((yOffset, index) => (
        <group key={`${item.id}-desk-drawer-${index}`} position={[width * 0.25, yOffset * height, frontZ + 0.008]}>
          <mesh>
            <boxGeometry args={[width * 0.32, 0.012, 0.014]} />
            <CatalogMaterial materialKey="shadowLine" />
          </mesh>
          <mesh position={[0, -height * 0.045, 0.014]}>
            <boxGeometry args={[width * 0.16, 0.012, 0.016]} />
            <CatalogMaterial materialKey="brushedBronze" />
          </mesh>
        </group>
      ))}
      <group position={[-width * 0.24, topLocalY + 0.045, -depth * 0.02]}>
        <RoundedBoxMesh args={[width * 0.23, 0.018, depth * 0.2]} radius={0.01} color={materialColor("taupeFabric")} roughness={0.86} />
        <RoundedBoxMesh args={[width * 0.19, 0.02, depth * 0.16]} position={[0.012, 0.024, -0.01]} radius={0.01} color={materialColor("creamFabric")} roughness={0.9} />
      </group>
      <pointLight color={materialColor("warmLightEmissive")} intensity={0.18} distance={1.1} position={[-width * 0.36, height * 0.58, 0]} />
      <mesh position={[-width * 0.36, height * 0.34, 0]}>
        <cylinderGeometry args={[0.016, 0.016, height * 0.36, 12]} />
        <CatalogMaterial materialKey="brushedBronze" />
      </mesh>
      <mesh position={[-width * 0.32, height * 0.54, -depth * 0.02]} rotation={[0, 0, -0.34]}>
        <cylinderGeometry args={[0.075, 0.11, 0.12, 24]} />
        <CatalogMaterial materialKey="warmLightEmissive" overrides={{ emissiveIntensity: 0.42 }} />
      </mesh>
      <group position={[0, -height * 0.34, depth * 0.68]} rotation={[0, Math.PI, 0]}>
        <RoundedBoxMesh args={[width * 0.36, 0.08, depth * 0.42]} radius={0.04} color={materialColor("beigeFabric")} roughness={0.9} />
        <RoundedBoxMesh args={[width * 0.38, height * 0.38, 0.06]} position={[0, height * 0.2, -depth * 0.18]} radius={0.035} color={materialColor("beigeFabric")} roughness={0.9} />
        {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
          <mesh key={`${item.id}-desk-chair-leg-${xSide}-${zSide}`} position={[xSide * width * 0.13, -height * 0.17, zSide * depth * 0.13]}>
            <cylinderGeometry args={[0.012, 0.016, height * 0.32, 10]} />
            <CatalogMaterial materialKey="blackTitanium" />
          </mesh>
        )))}
      </group>
      {isDresser && (
        <RoundedBoxMesh
          args={[width * 0.34, height * 0.42, 0.028]}
          position={[-width * 0.02, height * 0.52, -depth * 0.38]}
          radius={0.022}
          color={materialColor("mirror")}
          roughness={interiorMaterialCatalog.mirror.roughness}
          metalness={interiorMaterialCatalog.mirror.metalness}
          transparent
          opacity={interiorMaterialCatalog.mirror.opacity}
          depthWrite={false}
        />
      )}
    </SelectableFurnitureGroup>
  );
}

function makeProceduralTexture(kind: ProceduralTextureKind, baseColor: string, accentColor: string, repeatX: number, repeatY: number) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (kind === "wood") {
    for (let index = 0; index < 18; index += 1) {
      const y = 10 + index * 14 + Math.sin(index * 1.7) * 4;
      ctx.strokeStyle = index % 3 === 0 ? "rgba(93, 59, 34, 0.18)" : "rgba(255, 244, 224, 0.22)";
      ctx.lineWidth = index % 4 === 0 ? 3 : 1.4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= canvas.width; x += 24) {
        ctx.lineTo(x, y + Math.sin((x + index * 18) * 0.035) * 5);
      }
      ctx.stroke();
    }
    for (let index = 0; index < 7; index += 1) {
      ctx.strokeStyle = "rgba(83, 48, 24, 0.18)";
      ctx.strokeRect(index * 42, 0, 1.2, canvas.height);
    }
  }

  if (kind === "stone") {
    for (let index = 0; index < 9; index += 1) {
      ctx.strokeStyle = index % 2 ? "rgba(255, 255, 255, 0.28)" : "rgba(80, 72, 62, 0.14)";
      ctx.lineWidth = index % 3 === 0 ? 2.2 : 1.1;
      ctx.beginPath();
      ctx.moveTo(-20, 30 + index * 27);
      for (let x = -20; x <= canvas.width + 20; x += 22) {
        ctx.lineTo(x, 30 + index * 27 + Math.sin((x + index * 31) * 0.032) * 15);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = accentColor;
    ctx.globalAlpha = 0.34;
    for (let x = 0; x <= canvas.width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (kind === "fabric") {
    ctx.strokeStyle = "rgba(88, 73, 61, 0.12)";
    for (let x = 0; x < canvas.width; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 250, 241, 0.18)";
    for (let y = 0; y < canvas.height; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  if (kind === "wall") {
    for (let index = 0; index < 24; index += 1) {
      ctx.fillStyle = index % 2 ? "rgba(255,255,255,0.08)" : "rgba(64,56,48,0.055)";
      ctx.fillRect(0, index * 11, canvas.width, 5);
    }
    ctx.strokeStyle = "rgba(91, 85, 78, 0.14)";
    for (let x = 0; x <= canvas.width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function useProceduralTexture(kind: ProceduralTextureKind | null, baseColor: string, accentColor: string, repeatX: number, repeatY: number) {
  const texture = useMemo(
    () => kind ? makeProceduralTexture(kind, baseColor, accentColor, repeatX, repeatY) : null,
    [kind, baseColor, accentColor, repeatX, repeatY]
  );
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

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

function getMobileDefaultCameraView(floor: Floor, structure: HouseStructure): FixedCameraView {
  const size = getStructureSize(structure);
  const sceneWidth = Math.max(size.width * MM_TO_M, 8.8);
  const sceneDepth = Math.max(size.height * MM_TO_M, 7.2);
  const distance = Math.max(sceneWidth, sceneDepth) * 0.94;
  const targetByFloor: Record<Floor["id"], { x: number; y: number; z: number; zoom: number; description: string }> = {
    B2: { x: -0.25, y: 0.38, z: 0.18, zoom: 31, description: "活动区、书房和休闲区总览" },
    B1: { x: 0.18, y: 0.38, z: 0.1, zoom: 31, description: "客房、卫生间和休闲角总览" },
    "1F": { x: 0.88, y: 0.38, z: -0.72, zoom: 24, description: "客餐厨、中岛和餐桌总览" },
    "2F": { x: 0.05, y: 0.38, z: -0.18, zoom: 31, description: "卧室、衣帽间和卫生间总览" },
    YARD: { x: 0, y: 0.34, z: 0, zoom: 22, description: "南北院、围栏、铺装和庭院柜总览" }
  };
  const target = targetByFloor[floor.id];
  return {
    id: `mobile-default-${floor.id}`,
    name: `${floor.label} 手机默认轴测`,
    floor: floor.id,
    cameraPosition: {
      x: target.x - distance * 0.64,
      y: Math.max(6.2, distance * 0.78),
      z: target.z + distance * 0.68
    },
    target: { x: target.x, y: target.y, z: target.z },
    zoom: target.zoom,
    mode: "orthographic",
    description: target.description
  };
}

function isMasterBathRoom(room: HouseStructure["rooms"][number]) {
  return room.id === MASTER_BATH_ROOM_ID;
}

function isMasterBathFurniture(item: Furniture) {
  return item.floorId === "2F" && item.roomId === MASTER_BATH_ROOM_ID;
}

function isBathroomFurniture(item: Furniture) {
  const moduleType = item.moduleType ?? item.type;
  return item.moduleCategory === "bath" || bathroomModuleTypes.has(moduleType);
}

function isBedroomRoom(room: HouseStructure["rooms"][number]) {
  return room.name.includes("卧");
}

function isClosetRoom(room: HouseStructure["rooms"][number]) {
  return room.name.includes("衣帽");
}

function isBathroomRoom(room: HouseStructure["rooms"][number]) {
  return room.name.includes("卫");
}

function getRoomFloorStyle(room: HouseStructure["rooms"][number], designStyle: DesignStylePreset) {
  const palette = designStylePalettes[designStyle];
  if (isBathroomRoom(room)) {
    return {
      base: isMasterBathRoom(room) ? masterBathPalette.floor : "#d7d0c5",
      joint: isMasterBathRoom(room) ? masterBathPalette.floorJoint : "#bdb3a6",
      vein: "#eee8de",
      roughness: 0.6,
      kind: "stone" as const
    };
  }
  if (isBedroomRoom(room)) {
    return {
      base: designStyle === "modernStone" ? "#c7ad8c" : "#c9a379",
      joint: "#8f6a48",
      vein: "#e2c49e",
      roughness: 0.72,
      kind: "wood" as const
    };
  }
  if (isClosetRoom(room)) {
    return {
      base: "#d8bd99",
      joint: "#9a7655",
      vein: "#ecd8bd",
      roughness: 0.7,
      kind: "wood" as const
    };
  }
  return {
    base: palette.floorBase,
    joint: palette.floorJoint,
    vein: palette.floorVein,
    roughness: 0.56,
    kind: "tile" as const
  };
}

function isMasterBathWall(wall: HouseWall, structure: HouseStructure) {
  const room = structure.rooms.find(isMasterBathRoom);
  return Boolean(room?.sourceWallIds.includes(wall.id));
}

function isBathroomWall(wall: HouseWall, structure: HouseStructure) {
  return structure.rooms.some((room) => isBathroomRoom(room) && room.sourceWallIds.includes(wall.id));
}

function getSceneBounds(points: MmPoint[], structure: HouseStructure) {
  const scenePoints = points.map((point) => toScenePoint(point, structure));
  return scenePoints.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    maxX: Math.max(bounds.maxX, point.x),
    minZ: Math.min(bounds.minZ, point.z),
    maxZ: Math.max(bounds.maxZ, point.z)
  }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
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

function isRailingWall(wall: HouseWall) {
  return wall.barrierType === "railing";
}

type StairLandingConnection = {
  id: string;
  fromId: string;
  toId: string;
  start: MmPoint;
  end: MmPoint;
  width: number;
  bounds: { x: number; y: number; width: number; height: number };
};

function getStairLandingConnections(stairs: HouseStair[]): StairLandingConnection[] {
  const firstRun = stairs.find((stair) => stair.id.endsWith("-001"));
  const secondRun = stairs.find((stair) => stair.id.endsWith("-002") && stair.direction === "down");
  if (!firstRun || !secondRun) return [];
  const length = Math.hypot(firstRun.start.x - secondRun.start.x, firstRun.start.y - secondRun.start.y);
  if (length <= 0 || length > 3400) return [];
  const width = Math.min(firstRun.width, secondRun.width);
  const minX = Math.min(firstRun.start.x, secondRun.start.x) - width / 2;
  const maxX = Math.max(firstRun.start.x, secondRun.start.x) + width / 2;
  const minY = Math.min(firstRun.start.y, secondRun.start.y) - width / 2;
  const maxY = Math.max(firstRun.start.y, secondRun.start.y) + width / 2;
  return [{
    id: `${firstRun.id}-${secondRun.id}-landing`,
    fromId: firstRun.id,
    toId: secondRun.id,
    start: firstRun.start,
    end: secondRun.start,
    width,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }];
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
  const scene = toSceneObject(normalizeObjectForSync(item, structure.coordinateSystem, structure), structure.coordinateSystem);
  return {
    x: scene.scenePosition.x,
    z: scene.scenePosition.z
  };
}

function getFurnitureHeight(item: Furniture) {
  const height = item.dimensions.height / 100;
  if (isRugLike(item)) return 0.024;
  if (item.moduleType === "pegboard" || item.moduleType === "fireplace") return Math.max(0.08, Math.min(height, CUTAWAY_OBJECT_MAX_HEIGHT_M));
  if (item.moduleType === "shower") return Math.max(0.86, Math.min(height * 0.46, CUTAWAY_OBJECT_MAX_HEIGHT_M));
  if (item.moduleType === "wardrobe") return Math.max(0.88, Math.min(height * 0.42, CUTAWAY_OBJECT_MAX_HEIGHT_M - 0.04));
  if (item.moduleType === "tallCabinet" || item.moduleType === "fridge") return Math.max(0.92, Math.min(height * 0.44, CUTAWAY_OBJECT_MAX_HEIGHT_M - 0.02));
  if (item.moduleType === "cabinet" || item.moduleType === "sideboard" || item.moduleType === "entryCabinet" || item.moduleType === "snackCabinet") return Math.max(0.68, Math.min(height * 0.86, 0.92));
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

function hashString(value: string) {
  return value.split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function pickByHash<T>(items: T[], key: string) {
  return items[Math.abs(hashString(key)) % items.length];
}

function getFurnitureRenderVariant(item: Furniture, palette: DesignStylePalette, materials: ResolvedRender3DMaterials = resolveRender3DMaterials(item)) {
  const isMasterBedroom = item.roomId === "ROOM-2F-006";
  const isBedroomOne = item.roomId === "ROOM-2F-004";
  const isBedroomTwo = item.roomId === "ROOM-2F-005";
  const isCloset = item.roomId === "ROOM-2F-002";
  const isBath = isBathroomFurniture(item);
  const seed = `${item.roomId}-${item.id}-${item.moduleType ?? item.type}`;
  const woodOptions = isMasterBedroom
    ? ["#c9ad88", "#d6c1a2", "#bfa17c"]
    : isBedroomOne
      ? ["#d2b892", "#c7ad89", "#ded1bd"]
      : isBedroomTwo
        ? ["#d8c4a7", "#cdb596", "#e2d6c5"]
        : isCloset
          ? ["#d6c4aa", "#cfc9be", "#e0ddd6"]
          : [palette.wood, "#d5bea0", "#d9d6cf"];
  const fabricOptions = isMasterBedroom
    ? ["#ddd1c5", "#d4c4b4", "#ebe2d8"]
    : isBedroomOne
      ? ["#d8ccc0", "#cec0b1", "#ebe3d8"]
      : isBedroomTwo
        ? ["#e3d6c7", "#d0bfad", "#f1e8dc"]
        : [palette.fabric, "#d8cabd", "#cbb9a8"];
  const accentOptions = isMasterBedroom
    ? ["#a9876b", "#8f7764", "#bd9871"]
    : isBedroomOne
      ? ["#888078", "#a18b75", "#b09778"]
      : isBedroomTwo
        ? ["#ad947a", "#ba9d7b", "#8f8378"]
        : ["#b78d66", "#9a8068", "#c4a078"];
  const wood = pickByHash(woodOptions, seed);
  const fabric = pickByHash(fabricOptions, `${seed}-fabric`);
  const accent = pickByHash(accentOptions, `${seed}-accent`);
  const woodLayer = pickMaterialLayer(materials, ["wood"], materials.primary);
  const fabricLayer = pickMaterialLayer(materials, ["fabric"], materials.primary);
  const stoneLayer = pickMaterialLayer(materials, ["stone", "ceramic"], materials.secondary);
  const metalLayer = pickMaterialLayer(materials, ["metal"], materials.accent);
  const glassLayer = pickMaterialLayer(materials, ["glass"], materials.secondary);
  const lightLayer = pickMaterialLayer(materials, ["light"], materials.accent);
  const primaryColor = materials.primary.color;
  const secondaryColor = materials.secondary.color;
  const accentColor = materials.accent.color;
  return {
    wood: woodLayer.role === "wood" ? woodLayer.color : primaryColor || wood,
    darkWood: woodLayer.role === "wood" ? woodLayer.color : isCloset || isMasterBedroom ? "#a28d73" : "#ad9474",
    woodGrain: secondaryColor || (isMasterBedroom ? "#b69d7d" : "#bfa582"),
    fabric: fabricLayer.role === "fabric" ? fabricLayer.color : primaryColor || fabric,
    bedding: materials.secondary.role === "fabric" ? secondaryColor : isMasterBedroom ? "#f1e9de" : isBedroomOne ? "#eee7dc" : isBedroomTwo ? "#f4ece1" : "#efe7dc",
    runner: materials.accent.role === "fabric" ? accentColor : isMasterBedroom ? "#b69576" : isBedroomOne ? "#92887f" : isBedroomTwo ? "#bda27f" : accent,
    accent: accentColor || accent,
    rug: materials.secondary.role === "fabric" ? secondaryColor : isMasterBedroom ? "#d6cabb" : isBedroomOne ? "#d7cec4" : isBedroomTwo ? "#d9cab9" : "#d8cfc0",
    metal: metalLayer.role === "metal" ? metalLayer.color : isBath ? masterBathPalette.metal : "#8f8a82",
    stone: stoneLayer.role === "stone" || stoneLayer.role === "ceramic" ? stoneLayer.color : isBath ? masterBathPalette.stoneTop : palette.countertop,
    glass: glassLayer.role === "glass" ? glassLayer.color : palette.glass,
    light: lightLayer.role === "light" ? lightLayer.color : palette.light,
    wardrobeInterior: materials.secondary.role === "wood" ? secondaryColor : isCloset || isMasterBedroom ? "#d8d2c8" : "#d2c7b8",
    clothColors: isMasterBedroom
      ? ["#dfd0bf", "#a58c78", "#f1e8dd", "#bda184", "#8d7b70", "#d1bda7"]
      : isBedroomOne
        ? ["#dccdbb", "#a48a74", "#eee6dc", "#b99876", "#8b7a6e"]
        : isBedroomTwo
          ? ["#eadcc9", "#b99773", "#d6c2ad", "#8f8378", "#f3eadf"]
          : ["#dcc9b4", "#a38568", "#e8dfd3", "#b39a82", "#f1eadf", "#96785f", "#cdbba7"],
    openShelfRatio: isCloset ? 0.86 : isMasterBedroom ? 0.72 : 0.58
  };
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

  const resolvedMaterials = resolveRender3DMaterials(item);
  if (item.render3d?.primaryMaterial) {
    const primary = resolvedMaterials.primary;
    return {
      label: primary.label,
      color: primary.color,
      roughness: primary.roughness,
      metalness: primary.metalness,
      opacity: primary.opacity ?? 1
    };
  }

  const text = materialText(item);
  if (isBathroomFurniture(item)) {
    if (item.moduleType === "shower") {
      return { label: "无框玻璃淋浴房", color: masterBathPalette.glass, roughness: 0.09, metalness: 0.02, opacity: 0.36 };
    }
    if (item.moduleType === "vanity") {
      return { label: "浅木悬浮浴室柜", color: masterBathPalette.wood, roughness: 0.48, metalness: 0.02, opacity: 1 };
    }
    if (item.moduleType === "bathtub" || item.moduleType === "toilet") {
      return { label: "暖白陶瓷洁具", color: masterBathPalette.ceramic, roughness: 0.34, metalness: 0.01, opacity: 1 };
    }
  }
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

function getFurnitureServiceRequirements(item: Furniture): ModuleServiceRequirements {
  if (item.mepMeta) {
    return {
      water: Boolean(item.mepMeta.needsWaterSupply ?? item.serviceRequirements?.water),
      drainage: Boolean(item.mepMeta.needsDrainage ?? item.serviceRequirements?.drainage),
      power: Boolean(item.mepMeta.needsSocket ?? item.serviceRequirements?.power),
      exhaust: Boolean(item.mepMeta.needsVentilation ?? item.serviceRequirements?.exhaust)
    };
  }
  if (item.serviceRequirements) return item.serviceRequirements;
  const text = materialText(item);
  const moduleType = item.moduleType ?? item.type;
  const water = moduleType === "sink" || moduleType === "vanity" || moduleType === "shower" || moduleType === "bathtub" || text.includes("水槽") || text.includes("给水");
  const drainage = water || moduleType === "toilet" || text.includes("排水") || text.includes("地漏");
  const power =
    moduleType === "cooktop" ||
    moduleType === "fridge" ||
    moduleType === "island" ||
    moduleType === "kitchenCabinet" ||
    moduleType === "snackCabinet" ||
    moduleType === "sideboard" ||
    moduleType === "fireplace" ||
    moduleType === "cabinet" ||
    moduleType === "tallCabinet" ||
    text.includes("电源") ||
    text.includes("插座") ||
    text.includes("灯") ||
    text.includes("咖啡机");
  const exhaust = moduleType === "cooktop" || moduleType === "kitchenCabinet" || text.includes("排烟") || text.includes("烟道");
  return { water, drainage, power, exhaust };
}

function getFurnitureServiceMarkers(item: Furniture) {
  const requirements = getFurnitureServiceRequirements(item);
  return serviceMarkerOptions.filter((service) => requirements[service.key]);
}

function countServiceMarkers(furniture: Furniture[]) {
  return furniture.reduce((total, item) => total + getFurnitureServiceMarkers(item).length, 0);
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

  const floorStyle = getRoomFloorStyle(room, designStyle);
  const floorTexture = useProceduralTexture(
    floorStyle.kind === "wood" ? "wood" : "stone",
    floorStyle.base,
    floorStyle.joint,
    floorStyle.kind === "wood" ? 4.8 : 3.2,
    floorStyle.kind === "wood" ? 1.5 : 3.2
  );
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018 + index * 0.002, 0]}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={floorStyle.base}
        map={floorTexture ?? undefined}
        roughness={floorStyle.roughness}
        metalness={0.03}
      />
    </mesh>
  );
}

function RoomFloorFinishOverlay({
  room,
  structure,
  designStyle
}: {
  room: HouseStructure["rooms"][number];
  structure: HouseStructure;
  designStyle: DesignStylePreset;
}) {
  const bounds = getSceneBounds(room.boundary, structure);
  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minZ)) return null;

  const width = Math.max(0.1, bounds.maxX - bounds.minX);
  const depth = Math.max(0.1, bounds.maxZ - bounds.minZ);
  const centerX = bounds.minX + width / 2;
  const centerZ = bounds.minZ + depth / 2;
  const floorStyle = getRoomFloorStyle(room, designStyle);
  const isWood = floorStyle.kind === "wood";
  const tileSize = floorStyle.kind === "stone" ? 0.72 : 0.9;
  const plankSize = 0.26;
  if (isWood) {
    const plankCount = Math.max(2, Math.floor(width / plankSize));
    return (
      <group position={[0, 0.057, 0]}>
        {Array.from({ length: plankCount + 1 }, (_, index) => {
          const x = bounds.minX + index * plankSize;
          return (
            <mesh key={`${room.id}-plank-${index}`} position={[x, 0, centerZ]}>
              <boxGeometry args={[0.012, 0.004, depth]} />
              <meshStandardMaterial color={floorStyle.joint} transparent opacity={0.34} roughness={0.8} />
            </mesh>
          );
        })}
        {Array.from({ length: Math.max(2, Math.floor(depth / 0.82)) }, (_, index) => {
          const z = bounds.minZ + (index + 0.5) * 0.82;
          return (
            <mesh key={`${room.id}-wood-grain-${index}`} position={[centerX, 0.004, z]} rotation={[0, Math.PI * (0.01 + index * 0.015), 0]}>
              <boxGeometry args={[width * 0.82, 0.003, 0.012]} />
              <meshStandardMaterial color={floorStyle.vein} transparent opacity={0.24} roughness={0.9} />
            </mesh>
          );
        })}
      </group>
    );
  }
  const xLines = Math.floor(width / tileSize);
  const zLines = Math.floor(depth / tileSize);

  return (
    <group position={[0, 0.057, 0]}>
      {Array.from({ length: xLines + 1 }, (_, index) => {
        const x = bounds.minX + index * tileSize;
        return (
          <mesh key={`master-bath-tile-x-${index}`} position={[x, 0, centerZ]}>
            <boxGeometry args={[0.01, 0.004, depth]} />
            <meshStandardMaterial color={floorStyle.joint} transparent opacity={floorStyle.kind === "stone" ? 0.42 : 0.32} roughness={0.84} />
          </mesh>
        );
      })}
      {Array.from({ length: zLines + 1 }, (_, index) => {
        const z = bounds.minZ + index * tileSize;
        return (
          <mesh key={`master-bath-tile-z-${index}`} position={[centerX, 0, z]}>
            <boxGeometry args={[width, 0.004, 0.01]} />
            <meshStandardMaterial color={floorStyle.joint} transparent opacity={floorStyle.kind === "stone" ? 0.42 : 0.32} roughness={0.84} />
          </mesh>
        );
      })}
      {floorStyle.kind === "stone" && Array.from({ length: 5 }, (_, index) => (
        <mesh
          key={`master-bath-vein-${index}`}
          position={[
            bounds.minX + width * (0.18 + index * 0.14),
            0.006,
            bounds.minZ + depth * (0.18 + (index % 3) * 0.22)
          ]}
          rotation={[0, Math.PI * (0.1 + index * 0.08), 0]}
        >
          <boxGeometry args={[Math.min(width * 0.72, 1.8), 0.003, 0.012]} />
          <meshStandardMaterial color={floorStyle.vein} transparent opacity={0.32} roughness={0.88} />
        </mesh>
      ))}
    </group>
  );
}

function RoomAmbientOcclusion({ room, structure }: { room: HouseStructure["rooms"][number]; structure: HouseStructure }) {
  const bounds = getSceneBounds(room.boundary, structure);
  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minZ)) return null;

  const width = Math.max(0.1, bounds.maxX - bounds.minX);
  const depth = Math.max(0.1, bounds.maxZ - bounds.minZ);
  const centerX = bounds.minX + width / 2;
  const centerZ = bounds.minZ + depth / 2;
  const band = Math.min(0.22, Math.max(0.12, Math.min(width, depth) * 0.08));
  const color = "#4b4035";
  return (
    <group position={[0, 0.065, 0]}>
      <mesh position={[centerX, 0, bounds.minZ + band / 2]}>
        <boxGeometry args={[width, 0.005, band]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <mesh position={[centerX, 0, bounds.maxZ - band / 2]}>
        <boxGeometry args={[width, 0.005, band]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[bounds.minX + band / 2, 0, centerZ]}>
        <boxGeometry args={[band, 0.005, depth]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[bounds.maxX - band / 2, 0, centerZ]}>
        <boxGeometry args={[band, 0.005, depth]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

function FurnitureContactShadow({ item, structure }: { item: Furniture; structure: HouseStructure }) {
  if (isRugLike(item) || isPlantLike(item)) return null;
  const position = getFurnitureScenePosition(item, structure);
  const width = Math.max(0.16, item.dimensions.width / 100);
  const depth = Math.max(0.12, item.dimensions.depth / 100);
  const rotation = -(item.position.rotation || 0) * Math.PI / 180;
  const area = width * depth;
  const opacity = Math.min(0.18, Math.max(0.07, area * 0.028));
  return (
    <mesh position={[position.x, 0.071, position.z]} rotation={[-Math.PI / 2, 0, rotation]} scale={[width * 0.58, depth * 0.42, 1]}>
      <circleGeometry args={[1, 48]} />
      <meshBasicMaterial color="#302821" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function PolygonSurfaceMesh({
  id,
  points,
  structure,
  y,
  color,
  roughness,
  metalness = 0.02,
  opacity = 1,
  textureKind = null,
  textureAccent,
  onSelect,
  onHover,
  onClearHover
}: {
  id: string;
  points: MmPoint[];
  structure: HouseStructure;
  y: number;
  color: string;
  roughness: number;
  metalness?: number;
  opacity?: number;
  textureKind?: ProceduralTextureKind | null;
  textureAccent?: string;
  onSelect?: (id: string) => void;
  onHover?: (id: string) => void;
  onClearHover?: (id: string) => void;
}) {
  const key = points.map((point) => `${point.x},${point.y}`).join(" ");
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    points.forEach((point, pointIndex) => {
      const nextPoint = toShapePoint(point, structure);
      if (pointIndex === 0) shape.moveTo(nextPoint.x, nextPoint.y);
      else shape.lineTo(nextPoint.x, nextPoint.y);
    });
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [key, structure]);
  const bounds = getSceneBounds(points, structure);
  const repeatX = Number.isFinite(bounds.maxX) ? Math.max(1, bounds.maxX - bounds.minX) : 1;
  const repeatY = Number.isFinite(bounds.maxZ) ? Math.max(1, bounds.maxZ - bounds.minZ) : 1;
  const texture = useProceduralTexture(textureKind, color, textureAccent ?? color, repeatX, repeatY);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, y, 0]}
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
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={color}
        map={texture ?? undefined}
        roughness={roughness}
        metalness={metalness}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

function outdoorSurfaceStyle(surface: HouseOutdoorSurface) {
  if (surface.material === "pebble" || surface.material === "gravel") {
    return { color: effectMaterialCatalog.pebble.color, accent: "#7f7770", roughness: effectMaterialCatalog.pebble.roughness, textureKind: "stone" as const };
  }
  if (surface.material === "concrete") {
    return { color: effectMaterialCatalog.concrete.color, accent: "#8e8981", roughness: effectMaterialCatalog.concrete.roughness, textureKind: "stone" as const };
  }
  if (surface.material === "grass" || surface.material === "shrub" || surface.material === "soil" || surface.surfaceType === "planting") {
    return { color: "#9caf82", accent: "#64784f", roughness: 0.92, textureKind: null };
  }
  if (surface.material === "wood") {
    return { color: effectMaterialCatalog.woodVeneer.color, accent: "#b79b7c", roughness: effectMaterialCatalog.woodVeneer.roughness, textureKind: "wood" as const };
  }
  return { color: effectMaterialCatalog.outdoorStone.color, accent: "#8d8479", roughness: effectMaterialCatalog.outdoorStone.roughness, textureKind: "stone" as const };
}

function OutdoorGroundMesh({
  outdoor,
  structure,
  onSelect,
  onHover,
  onClearHover
}: {
  outdoor: HouseOutdoor;
  structure: HouseStructure;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  return (
    <PolygonSurfaceMesh
      id={outdoor.id}
      points={outdoor.polygon}
      structure={structure}
      y={0.011}
      color="#b9c6a3"
      roughness={0.96}
      metalness={0}
      textureKind={null}
      onSelect={onSelect}
      onHover={onHover}
      onClearHover={onClearHover}
    />
  );
}

function OutdoorSurfaceDetails({ surface, structure }: { surface: HouseOutdoorSurface; structure: HouseStructure }) {
  const bounds = getSceneBounds(surface.polygon, structure);
  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minZ)) return null;
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const centerX = bounds.minX + width / 2;
  const centerZ = bounds.minZ + depth / 2;
  const isPlanting = surface.surfaceType === "planting" || surface.material === "shrub" || surface.material === "grass" || surface.material === "soil";
  const isPebble = surface.material === "pebble" || surface.material === "gravel";

  if (isPlanting) {
    return (
      <group>
        {Array.from({ length: Math.max(3, Math.min(12, Math.floor(width * depth * 0.8))) }, (_, index) => {
          const x = bounds.minX + width * (0.18 + ((index * 37) % 64) / 100);
          const z = bounds.minZ + depth * (0.2 + ((index * 23) % 58) / 100);
          const radius = 0.12 + (index % 3) * 0.035;
          return (
            <group key={`${surface.id}-plant-${index}`} position={[x, 0.13 + radius * 0.25, z]}>
              <mesh castShadow>
                <sphereGeometry args={[radius, 18, 12]} />
                <meshStandardMaterial color={effectMaterialCatalog.plantLeaf.color} roughness={effectMaterialCatalog.plantLeaf.roughness} />
              </mesh>
              <mesh castShadow position={[0, -0.12, 0]}>
                <cylinderGeometry args={[0.025, 0.035, 0.22, 10]} />
                <meshStandardMaterial color="#73533a" roughness={0.74} />
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }

  if (isPebble) {
    return (
      <group>
        {Array.from({ length: Math.max(8, Math.min(22, Math.floor(width * depth))) }, (_, index) => (
          <mesh
            key={`${surface.id}-pebble-${index}`}
            position={[
              bounds.minX + width * (0.12 + ((index * 29) % 76) / 100),
              0.071,
              bounds.minZ + depth * (0.14 + ((index * 41) % 72) / 100)
            ]}
            scale={[1.2 + (index % 3) * 0.24, 0.28, 0.82 + (index % 4) * 0.16]}
          >
            <sphereGeometry args={[0.045, 12, 8]} />
            <meshStandardMaterial color={index % 2 ? "#b8b0a8" : "#928b84"} roughness={0.96} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group position={[0, 0.071, 0]}>
      {Array.from({ length: Math.max(2, Math.floor(width / 0.72)) + 1 }, (_, index) => (
        <mesh key={`${surface.id}-paver-x-${index}`} position={[bounds.minX + index * 0.72, 0, centerZ]}>
          <boxGeometry args={[0.012, 0.006, depth]} />
          <meshStandardMaterial color="#8f877d" transparent opacity={0.34} roughness={0.88} />
        </mesh>
      ))}
      {Array.from({ length: Math.max(2, Math.floor(depth / 0.72)) + 1 }, (_, index) => (
        <mesh key={`${surface.id}-paver-z-${index}`} position={[centerX, 0, bounds.minZ + index * 0.72]}>
          <boxGeometry args={[width, 0.006, 0.012]} />
          <meshStandardMaterial color="#8f877d" transparent opacity={0.34} roughness={0.88} />
        </mesh>
      ))}
    </group>
  );
}

function OutdoorSurfaceMesh({
  surface,
  structure,
  onSelect,
  onHover,
  onClearHover
}: {
  surface: HouseOutdoorSurface;
  structure: HouseStructure;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const style = outdoorSurfaceStyle(surface);
  return (
    <group>
      <PolygonSurfaceMesh
        id={surface.id}
        points={surface.polygon}
        structure={structure}
        y={0.044}
        color={style.color}
        roughness={style.roughness}
        metalness={0.02}
        textureKind={style.textureKind}
        textureAccent={style.accent}
        onSelect={onSelect}
        onHover={onHover}
        onClearHover={onClearHover}
      />
      <OutdoorSurfaceDetails surface={surface} structure={structure} />
    </group>
  );
}

function FenceMesh({
  fence,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  fence: HouseFence;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  return (
    <group>
      <LineBox
        id={fence.id}
        start={fence.start}
        end={fence.end}
        widthMm={Math.max(70, fence.thickness)}
        heightMm={Math.min(980, Math.max(520, fence.height))}
        structure={structure}
        color={fence.material === "metal" ? effectMaterialCatalog.blackMetal.color : effectMaterialCatalog.woodVeneer.color}
        opacity={selected ? 0.9 : 0.86}
        selected={selected}
        textureKind={fence.material === "wood" ? "wood" : null}
        textureAccent="#6f4c34"
        onSelect={onSelect}
        onHover={onHover}
        onClearHover={onClearHover}
      />
    </group>
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
        const bounds = getSceneBounds(room.boundary, structure);
        const roomWidth = Number.isFinite(bounds.maxX) ? bounds.maxX - bounds.minX : 1.8;
        const roomDepth = Number.isFinite(bounds.maxZ) ? bounds.maxZ - bounds.minZ : 1.8;
        const isKitchen = room.name.includes("厨");
        const isLiving = room.name.includes("客");
        const isMasterBath = isMasterBathRoom(room);
        const isBathroom = isBathroomRoom(room);
        const isBedroom = isBedroomRoom(room);
        const isCloset = isClosetRoom(room);
        const isCorridor = room.name.includes("走廊");
        const spotCount = isMasterBath ? 2 : isBathroom ? 1 : isLiving ? 2 : isKitchen ? 2 : 0;
        const pointIntensity = isBedroom ? 0.12 : isCloset ? 0.16 : isLiving ? 0.36 : isBathroom ? 0.28 : 0.18;
        return (
          <group key={`light-${room.id}`}>
            <pointLight color={isMasterBath ? masterBathPalette.light : palette.light} distance={isLiving ? 4.2 : isBathroom ? 3.2 : 2.6} intensity={pointIntensity} position={[center.x, 2.1, center.z]} />
            {isCorridor && (
              <mesh position={[center.x, 1.08, center.z]}>
                <boxGeometry args={[Math.min(roomWidth * 0.58, 1.8), 0.026, 0.035]} />
                <meshStandardMaterial color={palette.light} emissive={palette.light} emissiveIntensity={0.58} transparent opacity={0.62} roughness={0.2} />
              </mesh>
            )}
            {!isBedroom && !isCloset && !isBathroom && !isCorridor && (
              <mesh position={[center.x, 1.1, center.z]}>
                <cylinderGeometry args={[isLiving ? 0.13 : 0.095, isLiving ? 0.13 : 0.095, 0.02, 28]} />
                <meshStandardMaterial color={palette.light} emissive={palette.light} emissiveIntensity={0.28} roughness={0.28} />
              </mesh>
            )}
            {isKitchen && (
              <group position={[center.x, 1.08, center.z]}>
                <mesh>
                  <boxGeometry args={[Math.min(roomWidth * 0.34, 1.18), 0.014, 0.026]} />
                  <meshStandardMaterial color={palette.metal} roughness={0.32} metalness={0.48} transparent opacity={0.68} />
                </mesh>
                {[-0.36, 0, 0.36].map((offset, trackIndex) => (
                  <group key={`${room.id}-track-${trackIndex}`} position={[offset * Math.min(roomWidth, 1.16), -0.05, 0]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[0.034, 0.04, 0.07, 18]} />
                      <meshStandardMaterial color={palette.metal} roughness={0.28} metalness={0.58} />
                    </mesh>
                    <pointLight color={palette.light} intensity={0.18} distance={1.8} position={[0, -0.05, 0]} />
                  </group>
                ))}
              </group>
            )}
            {(isLiving || isKitchen) && (
              <>
                <mesh position={[center.x, 1.06, center.z - roomDepth * 0.34]}>
                  <boxGeometry args={[Math.min(roomWidth * 0.48, 1.8), 0.014, 0.024]} />
                  <meshStandardMaterial color={palette.light} emissive={palette.light} emissiveIntensity={0.52} transparent opacity={0.72} roughness={0.18} />
                </mesh>
                <mesh position={[center.x, 1.06, center.z + roomDepth * 0.34]}>
                  <boxGeometry args={[Math.min(roomWidth * 0.48, 1.8), 0.014, 0.024]} />
                  <meshStandardMaterial color={palette.light} emissive={palette.light} emissiveIntensity={0.42} transparent opacity={0.58} roughness={0.18} />
                </mesh>
              </>
            )}
            {Array.from({ length: spotCount }, (_, spotIndex) => {
              const offset = (spotIndex - (spotCount - 1) / 2) * 0.48;
              return (
                <group key={`spot-${room.id}-${spotIndex}`} position={[center.x + offset, 1.12, center.z + (isKitchen ? 0.36 : -0.36)]}>
                  <mesh>
                    <cylinderGeometry args={[isBathroom ? 0.054 : 0.064, isBathroom ? 0.054 : 0.064, 0.012, 24]} />
                    <meshStandardMaterial color={effectMaterialCatalog.blackMetal.color} roughness={0.32} metalness={0.48} />
                  </mesh>
                  <mesh position={[0, -0.012, 0]}>
                    <cylinderGeometry args={[0.046, 0.046, 0.018, 20]} />
                    <meshStandardMaterial color="#fffaf0" emissive={isMasterBath ? masterBathPalette.light : palette.light} emissiveIntensity={isMasterBath ? 0.78 : 0.58} roughness={0.2} />
                  </mesh>
                </group>
              );
            })}
            {isMasterBath && (
              <>
                <mesh position={[center.x + 0.42, 1.03, center.z - 0.72]}>
                  <boxGeometry args={[1.42, 0.026, 0.045]} />
                  <meshStandardMaterial color={masterBathPalette.light} emissive={masterBathPalette.light} emissiveIntensity={0.95} roughness={0.2} />
                </mesh>
                <mesh position={[center.x - 0.66, 0.92, center.z - 0.92]}>
                  <boxGeometry args={[0.42, 0.028, 0.055]} />
                  <meshStandardMaterial color={masterBathPalette.light} emissive={masterBathPalette.light} emissiveIntensity={0.72} roughness={0.2} />
                </mesh>
              </>
            )}
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
  textureKind = null,
  textureAccent,
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
  textureKind?: ProceduralTextureKind | null;
  textureAccent?: string;
  onSelect?: (id: string) => void;
  onHover?: (id: string) => void;
  onClearHover?: (id: string) => void;
}) {
  const metrics = useMemo(() => lineMetrics(start, end, structure), [start, end, structure]);
  const width = Math.max(0.025, widthMm * MM_TO_M);
  const height = Math.max(0.04, heightMm * MM_TO_M);
  const texture = useProceduralTexture(textureKind, color, textureAccent ?? "#8a8075", Math.max(1.2, metrics.length * 0.9), Math.max(1, height * 1.8));
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
        map={texture ?? undefined}
        depthWrite={opacity >= 0.72}
        transparent={opacity < 1}
        opacity={opacity}
        roughness={0.7}
      />
    </mesh>
  );
}

function RailingSegment({
  id,
  start,
  end,
  structure,
  widthMm,
  heightMm,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  id: string;
  start: MmPoint;
  end: MmPoint;
  structure: HouseStructure;
  widthMm: number;
  heightMm: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const metrics = useMemo(() => lineMetrics(start, end, structure), [start, end, structure]);
  const lengthMm = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
  const postCount = Math.max(2, Math.floor(lengthMm / 620) + 1);
  const railingHeight = Math.max(0.72, heightMm * MM_TO_M);
  const postWidth = Math.max(0.045, widthMm * MM_TO_M * 0.72);
  const railHeightMm = 58;
  const color = selected ? RAILING_SELECTED_COLOR : RAILING_COLOR;
  const railOffsets = [
    0.18,
    Math.max(0.38, railingHeight * 0.54),
    Math.max(0.52, railingHeight - railHeightMm * MM_TO_M)
  ];

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onSelect(id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover(id);
      }}
    >
      {railOffsets.map((offset, index) => (
        <LineBox
          key={`${id}-rail-${index}`}
          id={id}
          start={start}
          end={end}
          widthMm={widthMm}
          heightMm={railHeightMm}
          structure={structure}
          color={color}
          opacity={selected ? 0.9 : 0.76}
          yOffset={offset}
          selected={selected}
          onSelect={onSelect}
          onHover={onHover}
          onClearHover={onClearHover}
        />
      ))}
      {Array.from({ length: postCount }, (_, index) => {
        const t = postCount === 1 ? 0 : index / (postCount - 1);
        const x = metrics.startPoint.x + (metrics.endPoint.x - metrics.startPoint.x) * t;
        const z = metrics.startPoint.z + (metrics.endPoint.z - metrics.startPoint.z) * t;
        return (
          <mesh key={`${id}-post-${index}`} castShadow position={[x, railingHeight / 2, z]} rotation={[0, metrics.rotationY, 0]}>
            <boxGeometry args={[postWidth, railingHeight, postWidth]} />
            <meshStandardMaterial color={color} roughness={0.48} metalness={0.36} transparent opacity={selected ? 0.95 : 0.82} />
          </mesh>
        );
      })}
    </group>
  );
}

function SolidWallSegment({
  id,
  start,
  end,
  structure,
  widthMm,
  heightMm,
  color,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  id: string;
  start: MmPoint;
  end: MmPoint;
  structure: HouseStructure;
  widthMm: number;
  heightMm: number;
  color: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const capHeightMm = Math.min(WALL_CAP_HEIGHT_MM, Math.max(24, heightMm * 0.18));
  const bodyHeightMm = Math.max(42, heightMm - capHeightMm);
  return (
    <group>
      <LineBox
        id={id}
        start={start}
        end={end}
        widthMm={widthMm}
        heightMm={bodyHeightMm}
        structure={structure}
        color={selected ? "#bfdbfe" : color}
        opacity={selected ? WALL_SELECTED_OPACITY : WALL_PREVIEW_OPACITY}
        textureKind="wall"
        textureAccent={effectMaterialCatalog.wallPaint.color}
        selected={selected}
        onSelect={onSelect}
        onHover={onHover}
        onClearHover={onClearHover}
      />
      <LineBox
        id={id}
        start={start}
        end={end}
        widthMm={widthMm + 28}
        heightMm={42}
        structure={structure}
        color={selected ? "#bfdbfe" : "#9b7250"}
        opacity={selected ? 0.72 : 0.88}
        yOffset={0.08}
        textureKind="wood"
        textureAccent="#5d3d26"
        selected={selected}
        onSelect={onSelect}
        onHover={onHover}
        onClearHover={onClearHover}
      />
      <LineBox
        id={id}
        start={start}
        end={end}
        widthMm={widthMm + 64}
        heightMm={capHeightMm}
        structure={structure}
        color={selected ? WALL_CAP_SELECTED_COLOR : WALL_CAP_COLOR}
        opacity={1}
        yOffset={bodyHeightMm * MM_TO_M}
        selected={selected}
        onSelect={onSelect}
        onHover={onHover}
        onClearHover={onClearHover}
      />
      {!selected && (
        <LineBox
          id={id}
          start={start}
          end={end}
          widthMm={widthMm + 36}
          heightMm={72}
          structure={structure}
          color={effectMaterialCatalog.baseboard.color}
          opacity={1}
          yOffset={0.018}
          textureKind="wood"
          textureAccent="#6f4c34"
          selected={false}
          onSelect={onSelect}
          onHover={onHover}
          onClearHover={onClearHover}
        />
      )}
    </group>
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
  if (isRailingWall(wall)) {
    const railingHeightMm = wall.height || 1100;
    if (wall.kind === "arc") {
      const points = getArcWallPoints(wall);
      return (
        <group>
          {points.slice(0, -1).map((point, index) => (
            <RailingSegment
              key={`${wall.id}-railing-${index}`}
              id={wall.id}
              start={point}
              end={points[index + 1]}
              widthMm={wall.thickness}
              heightMm={railingHeightMm}
              structure={structure}
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
      <RailingSegment
        id={wall.id}
        start={wall.start}
        end={wall.end}
        widthMm={wall.thickness}
        heightMm={railingHeightMm}
        structure={structure}
        selected={selected}
        onSelect={onSelect}
        onHover={onHover}
        onClearHover={onClearHover}
      />
    );
  }

  if (wall.kind === "arc") {
    const points = getArcWallPoints(wall);
    const heightMm = Math.min(wall.height, selected ? WALL_SELECTED_HEIGHT_MM : WALL_PREVIEW_HEIGHT_MM);
    return (
      <group>
        {points.slice(0, -1).map((point, index) => (
          <SolidWallSegment
            key={`${wall.id}-${index}`}
            id={wall.id}
            start={point}
            end={points[index + 1]}
            widthMm={wall.thickness}
            heightMm={heightMm}
            structure={structure}
            color={wallColor}
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
    <SolidWallSegment
      id={wall.id}
      start={wall.start}
      end={wall.end}
      widthMm={wall.thickness}
      heightMm={Math.min(wall.height, selected ? WALL_SELECTED_HEIGHT_MM : WALL_PREVIEW_HEIGHT_MM)}
      structure={structure}
      color={wallColor}
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

function ColumnMesh({
  column,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  column: HouseColumn;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const center = toScenePoint(column.center, structure);
  const radius = Math.max(0.05, column.radius * MM_TO_M);
  const height = Math.max(0.2, column.height * MM_TO_M);

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onSelect(column.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(column.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover(column.id);
      }}
    >
      <mesh castShadow receiveShadow position={[center.x, height / 2, center.z]}>
        <cylinderGeometry args={[radius, radius, height, 40]} />
        <meshStandardMaterial color={selected ? "#2563eb" : "#74777d"} roughness={0.66} metalness={0.04} />
      </mesh>
      <mesh receiveShadow position={[center.x, 0.032, center.z]}>
        <cylinderGeometry args={[radius * 1.18, radius * 1.18, 0.064, 40]} />
        <meshStandardMaterial color={selected ? "#bfdbfe" : "#d1d5db"} roughness={0.78} />
      </mesh>
    </group>
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
  const rawHeight = Math.max(0.3, opening.height * MM_TO_M);
  const height = isDoor
    ? Math.min(rawHeight * 0.48, CUTAWAY_OBJECT_MAX_HEIGHT_M - 0.06)
    : Math.min(rawHeight * 0.42, 0.58);
  const y = isDoor ? height / 2 + 0.02 : Math.min(0.78, CUTAWAY_OBJECT_MAX_HEIGHT_M - height / 2 - 0.08);
  const isGlassDoor = isDoor && "material" in opening && opening.material?.toLowerCase().includes("glass");
  const color = selected ? "#2563eb" : isDoor ? (isGlassDoor ? "#8fd3e8" : effectMaterialCatalog.doorWood.color) : "#b6ddeb";
  const opacity = isDoor ? (isGlassDoor ? 0.44 : 1) : 0.42;
  const woodTexture = useProceduralTexture(isDoor && !isGlassDoor ? "wood" : null, effectMaterialCatalog.doorWood.color, "#b59b7f", 1.2, 2.2);

  return (
    <group
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
      <mesh castShadow={isDoor} receiveShadow>
        <boxGeometry args={[width, height, isDoor ? 0.072 : 0.04]} />
        <meshStandardMaterial
          color={color}
          map={woodTexture ?? undefined}
          transparent={opacity < 1}
          opacity={opacity}
          roughness={isDoor ? 0.58 : 0.08}
          metalness={isDoor ? 0.02 : 0.08}
        />
      </mesh>
      <mesh position={[0, height * 0.02, 0.048]}>
        <boxGeometry args={[width + 0.08, 0.035, 0.035]} />
        <meshStandardMaterial color={isDoor ? "#2f2520" : "#25313a"} roughness={0.32} metalness={0.42} />
      </mesh>
      {!isDoor && (
        <>
          {[-1, 1].map((xSide) => (
            <mesh key={`${opening.id}-window-side-${xSide}`} position={[xSide * width * 0.5, 0, 0.052]}>
              <boxGeometry args={[0.045, height * 1.02, 0.045]} />
              <meshStandardMaterial color="#25313a" roughness={0.32} metalness={0.48} />
            </mesh>
          ))}
          <mesh position={[0, height * 0.28, 0.052]}>
            <boxGeometry args={[width * 0.92, 0.035, 0.045]} />
            <meshStandardMaterial color="#25313a" roughness={0.32} metalness={0.48} />
          </mesh>
        </>
      )}
      {isDoor && !isGlassDoor && (
        <mesh position={[width * 0.32, 0.02, 0.056]}>
          <sphereGeometry args={[0.04, 16, 10]} />
          <meshStandardMaterial color="#c9a46a" roughness={0.26} metalness={0.72} />
        </mesh>
      )}
    </group>
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

function StairLandingMesh({
  connection,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  connection: StairLandingConnection;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const platform = useMemo(() => {
    const min = toScenePoint({ x: connection.bounds.x, y: connection.bounds.y }, structure);
    const max = toScenePoint({ x: connection.bounds.x + connection.bounds.width, y: connection.bounds.y + connection.bounds.height }, structure);
    return {
      center: { x: (min.x + max.x) / 2, z: (min.z + max.z) / 2 },
      width: Math.max(0.5, connection.bounds.width * MM_TO_M),
      depth: Math.max(0.5, connection.bounds.height * MM_TO_M)
    };
  }, [connection, structure]);
  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onSelect(connection.toId);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(connection.toId);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover(connection.toId);
      }}
    >
      <mesh castShadow receiveShadow position={[platform.center.x, 0.105, platform.center.z]}>
        <boxGeometry args={[platform.width, 0.13, platform.depth]} />
        <meshStandardMaterial color={selected ? "#2563eb" : "#0f766e"} roughness={0.62} transparent opacity={selected ? 0.92 : 0.88} />
      </mesh>
    </group>
  );
}

function StairDirectionCue({
  metrics,
  stairWidth,
  isDownRun,
  selected
}: {
  metrics: ReturnType<typeof lineMetrics>;
  stairWidth: number;
  isDownRun: boolean;
  selected: boolean;
}) {
  const cueStart = Math.min(0.46, metrics.length * 0.18);
  const cueLength = Math.max(0.62, metrics.length - cueStart - 0.56);
  const cueWidth = Math.min(0.18, Math.max(0.1, stairWidth * 0.18));
  const color = selected ? "#2563eb" : isDownRun ? "#dc2626" : "#0284c7";
  const cueY = isDownRun ? 0.34 : 0.76;
  return (
    <group position={[metrics.startPoint.x, cueY, metrics.startPoint.z]} rotation={[0, metrics.rotationY, 0]}>
      <mesh position={[cueStart + cueLength / 2, 0, 0]} renderOrder={22}>
        <boxGeometry args={[cueLength, 0.045, cueWidth]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} roughness={0.42} transparent opacity={0.86} depthTest={false} />
      </mesh>
      <mesh position={[cueStart + cueLength + 0.16, 0, 0]} rotation={[0, 0, -Math.PI / 2]} renderOrder={23}>
        <coneGeometry args={[cueWidth * 1.2, 0.36, 3]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.12} roughness={0.38} transparent opacity={0.92} depthTest={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function StairMesh({
  stair,
  structure,
  materialPreview,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  stair: HouseStair;
  structure: HouseStructure;
  materialPreview: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const metrics = useMemo(() => lineMetrics(stair.start, stair.end, structure), [stair, structure]);
  const count = Math.max(1, stair.stepCount);
  const stepLength = metrics.length / count;
  const totalHeight = Math.max(0.4, stair.height * MM_TO_M);
  const isTopFloorArrivalRun = structure.floorId === "2F" && stair.id === "ST-2F-001" && stair.direction === "up";
  const baseHeight = isTopFloorArrivalRun ? -totalHeight : (stair.baseHeight ?? 0) * MM_TO_M;
  const stairWidth = Math.max(0.5, stair.width * MM_TO_M);
  const isDownRun = stair.direction === "down";
  const landingY = baseHeight + (isDownRun ? -totalHeight : totalHeight);
  const landingDepth = Math.min(1.1, Math.max(0.72, stepLength * 1.55));
  const stepMaterialColor = selected ? "#2563eb" : isTopFloorArrivalRun ? "#d99b45" : isDownRun ? "#9b846b" : "#d6c6ae";
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
      <mesh receiveShadow position={[metrics.midpoint.x, 0.052, metrics.midpoint.z]} rotation={[0, metrics.rotationY, 0]}>
        <boxGeometry args={[metrics.length + 0.32, 0.032, stairWidth + 0.32]} />
        <meshStandardMaterial color={isTopFloorArrivalRun ? "#92400e" : isDownRun ? "#1f2937" : "#6f5a41"} transparent opacity={isTopFloorArrivalRun ? 0.38 : isDownRun ? 0.76 : 0.28} roughness={0.88} />
      </mesh>
      {Array.from({ length: count }, (_, index) => {
        const t = (index + 0.5) / count;
        const height = isDownRun
          ? totalHeight * ((count - index) / count)
          : totalHeight * ((index + 1) / count);
        const centerY = isDownRun
          ? baseHeight - totalHeight + height / 2
          : baseHeight + height / 2;
        const center = {
          x: metrics.startPoint.x + (metrics.endPoint.x - metrics.startPoint.x) * t,
          z: metrics.startPoint.z + (metrics.endPoint.z - metrics.startPoint.z) * t
        };
        return (
          <mesh key={`${stair.id}-step-${index}`} castShadow receiveShadow position={[center.x, centerY, center.z]} rotation={[0, metrics.rotationY, 0]}>
            <boxGeometry args={[stepLength * 0.92, height, stairWidth]} />
            <meshStandardMaterial color={stepMaterialColor} roughness={0.72} depthTest={!isDownRun} />
          </mesh>
        );
      })}
      {isDownRun && (
        <mesh castShadow receiveShadow position={[metrics.startPoint.x, baseHeight + 0.045, metrics.startPoint.z]} rotation={[0, metrics.rotationY, 0]}>
          <boxGeometry args={[landingDepth, 0.09, stairWidth]} />
          <meshStandardMaterial color={selected ? "#2563eb" : "#7b6652"} roughness={0.72} />
        </mesh>
      )}
      <mesh castShadow receiveShadow position={[metrics.endPoint.x, landingY + (isDownRun ? -0.035 : 0.035), metrics.endPoint.z]} rotation={[0, metrics.rotationY, 0]}>
        <boxGeometry args={[landingDepth, 0.07, stairWidth]} />
        <meshStandardMaterial color={selected ? "#2563eb" : isTopFloorArrivalRun ? "#fbbf24" : isDownRun ? "#4b5563" : "#c8b89f"} transparent opacity={isDownRun ? 0.92 : 1} roughness={0.76} depthTest={!isDownRun} />
      </mesh>
      {!materialPreview && <StairDirectionCue metrics={metrics} stairWidth={stairWidth} isDownRun={isDownRun} selected={selected} />}
    </group>
  );
}

type FurnitureAssetGroupProps = {
  item: Furniture;
  structure: HouseStructure;
  materialPreview: boolean;
  designStyle: DesignStylePreset;
  selected: boolean;
  resolvedAsset: Resolved3DAsset;
  onSelect: (item: Furniture) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
};

function FurnitureBlock({
  item,
  structure,
  materialPreview,
  designStyle,
  selected,
  resolvedAsset,
  onSelect,
  onHover,
  onClearHover
}: FurnitureAssetGroupProps) {
  const position = getFurnitureScenePosition(item, structure);
  const width = Math.max(0.12, item.dimensions.width / 100);
  const depth = Math.max(0.08, item.dimensions.depth / 100);
  const height = getFurnitureHeight(item);
  const rotation = -(item.position.rotation || 0) * Math.PI / 180;
  const palette = designStylePalettes[designStyle];
  const assetType = resolvedAsset.assetType;
  const renderVariant = getFurnitureRenderVariant(item, palette, resolvedAsset.materials);
  const materialStyle = getFurnitureMaterialStyle(item, materialPreview, designStyle);
  const useSelectionTint = selected && !materialPreview;
  const color = useSelectionTint ? "#2563eb" : materialStyle.color;
  const opacity = useSelectionTint ? Math.max(0.78, materialStyle.opacity) : materialStyle.opacity;
  const transparent = opacity < 1;
  const wardrobeLike = assetType === "wardrobe" || assetType === "walkInCloset" || item.moduleType === "wardrobe";
  const cabinetLike = isCabinetLike(item) || [
    "cabinet",
    "wallCabinet",
    "wardrobe",
    "walkInCloset",
    "kitchenCabinet",
    "snackCabinet",
    "entryCabinet",
    "sideboard",
    "outdoorCabinet",
    "bathroomVanity",
    "bookshelf",
    "nightstand"
  ].includes(assetType);
  const counterLike = ["island", "kitchenCabinet", "sideboard", "outdoorCabinet", "bathroomVanity"].includes(assetType) ||
    item.moduleType === "island" || item.moduleType === "kitchenCabinet" || item.moduleType === "sideboard" || item.moduleType === "vanity";
  const tableLike = isTableLike(item) || assetType === "diningTable" || assetType === "coffeeTable" || assetType === "loungeCoffeeTable" || assetType === "slabTable" || assetType === "outdoorDiningSet" || assetType === "desk";
  const sofaLike = isSofaLike(item) || assetType === "sofa";
  const bedLike = isBedLike(item) || assetType === "bed";
  const chairLike = isChairLike(item) || assetType === "diningChair";
  const outdoorDiningSetLike = assetType === "outdoorDiningSet";
  const plantLike = isPlantLike(item) || assetType === "plant" || (assetType === "yardModule" && item.type === "plant");
  const rugLike = isRugLike(item);
  const fireplaceLike = item.moduleType === "fireplace" || assetType === "fireplace";
  const masterBathFixture = isMasterBathFurniture(item);
  const bathFixture = masterBathFixture || isBathroomFurniture(item) || ["bathroomVanity", "toilet", "bathtub", "shower", "sink"].includes(assetType);
  const slabTableLike = assetType === "slabTable";
  const diningTableLike = assetType === "diningTable" || (!slabTableLike && !outdoorDiningSetLike && assetType !== "coffeeTable" && assetType !== "loungeCoffeeTable" && assetType !== "desk" && isDiningTableLike(item, width, depth));
  const coffeeTableLike = assetType === "coffeeTable" || assetType === "loungeCoffeeTable" || assetType === "desk" || isCoffeeTableLike(item, width, depth, height);
  const loungeCoffeeTableLike = assetType === "loungeCoffeeTable";
  const specialtyOutdoorLike = ["dryingRack", "dogHouse", "yardGate", "yardLight", "outdoorSocket", "drainPoint"].includes(assetType);
  const renderMainBody = !tableLike && !chairLike && !plantLike && !rugLike && !fireplaceLike && !specialtyOutdoorLike;
  const bodyHeight = sofaLike ? height * 0.36 : bedLike ? height * 0.22 : height;
  const bodyY = sofaLike ? -height * 0.22 : bedLike ? -height * 0.3 : 0;
  const panelCount = Math.min(5, Math.max(2, Math.round(width / 0.62)));
  const frontZ = depth / 2 + 0.01;
  const fireplaceVisualWidth = fireplaceLike && materialPreview ? Math.max(width, 1.65) : width;
  const floorLift = rugLike ? 0.012 : 0.035;
  const groupY = height / 2 + floorLift;
  const topLocalY = height / 2 + 0.025;
  const ceilingLocalY = 2.28 - groupY;
  const furnitureColor = useSelectionTint ? "#2563eb" : cabinetLike
    ? renderVariant.wood
    : bedLike || sofaLike || chairLike
      ? renderVariant.fabric
      : counterLike || bathFixture
        ? renderVariant.stone
        : color;
  const woodTexture = useProceduralTexture("wood", renderVariant.wood, renderVariant.woodGrain, 2.6, 1.2);
  const darkWoodTexture = useProceduralTexture("wood", renderVariant.darkWood, "#b59d80", 2.2, 1.15);
  const fabricTexture = useProceduralTexture("fabric", renderVariant.fabric, "#927765", 2.4, 2.4);
  const stoneTexture = useProceduralTexture("stone", renderVariant.stone, palette.floorJoint, 1.8, 1.8);
  const fireplaceStoneTexture = useProceduralTexture("stone", effectMaterialCatalog.warmStone.color, "#b9ad9e", 1.45, 1.15);
  const mainBodyTexture = materialPreview
    ? cabinetLike ? woodTexture
      : bedLike || sofaLike || chairLike ? fabricTexture
        : counterLike || bathFixture ? stoneTexture
          : null
    : null;
  const furnitureEdgeRadius = bedLike || sofaLike || chairLike
    ? 0.075
    : bathFixture
      ? 0.055
      : cabinetLike
        ? 0.032
        : 0.04;
  const wardrobeOpenWidth = width * renderVariant.openShelfRatio;
  const wardrobeClosedPanelWidth = Math.max(0, (width - wardrobeOpenWidth) / 2);
  const wardrobeClothCount = Math.min(7, Math.max(3, Math.round(wardrobeOpenWidth / 0.28)));
  const wardrobeDrawerCount = Math.min(3, Math.max(1, Math.round(width / 0.72)));

  return (
    <group
      name={`${item.id}-render3d-root`}
      userData={{ childrenMode: resolvedAsset.childrenMode, assetType: resolvedAsset.assetType }}
      position={[position.x, groupY, position.z]}
      rotation={[0, rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        if (resolvedAsset.selectableIn3d) onSelect(item);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (resolvedAsset.selectableIn3d) onHover(item.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        if (resolvedAsset.selectableIn3d) onClearHover(item.id);
      }}
    >
      {renderMainBody && (
        <RoundedBoxMesh
          args={[width, bodyHeight, depth]}
          position={[0, bodyY, 0]}
          radius={furnitureEdgeRadius}
          smoothness={4}
          color={furnitureColor}
          map={mainBodyTexture}
          depthWrite={!transparent}
          transparent={transparent}
          opacity={opacity}
          roughness={materialStyle.roughness}
          metalness={materialStyle.metalness}
        />
      )}
      {rugLike && (
        <group>
          <mesh receiveShadow position={[0, -height * 0.12, 0]}>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={useSelectionTint ? "#2563eb" : materialStyle.color} roughness={0.94} transparent opacity={useSelectionTint ? 0.82 : 0.9} />
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
          {outdoorDiningSetLike ? (
            <>
              <RoundedBoxMesh
                args={[width * 0.42, 0.065, depth * 0.36]}
                position={[0, topLocalY, 0]}
                radius={0.03}
                smoothness={4}
                color={useSelectionTint ? "#2563eb" : renderVariant.wood}
                map={woodTexture}
                roughness={0.56}
                metalness={0.02}
              />
              {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
                <mesh key={`${item.id}-outdoor-table-leg-${xSide}-${zSide}`} castShadow position={[xSide * width * 0.16, -height * 0.13, zSide * depth * 0.12]}>
                  <boxGeometry args={[0.04, height * 0.56, 0.04]} />
                  <meshStandardMaterial color={renderVariant.metal} roughness={0.28} metalness={0.5} />
                </mesh>
              )))}
              {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
                <group key={`${item.id}-outdoor-chair-${xSide}-${zSide}`} position={[xSide * width * 0.34, -height * 0.08, zSide * depth * 0.28]} rotation={[0, xSide < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
                  <RoundedBoxMesh args={[0.42, 0.09, 0.42]} radius={0.035} color={renderVariant.fabric} roughness={0.86} />
                  <RoundedBoxMesh args={[0.42, 0.48, 0.07]} position={[0, 0.26, -0.18]} radius={0.025} color={renderVariant.fabric} roughness={0.84} />
                  {[-1, 1].flatMap((legX) => [-1, 1].map((legZ) => (
                    <mesh key={`${legX}-${legZ}`} position={[legX * 0.15, -0.23, legZ * 0.15]}>
                      <boxGeometry args={[0.03, 0.32, 0.03]} />
                      <meshStandardMaterial color={renderVariant.metal} roughness={0.32} metalness={0.46} />
                    </mesh>
                  )))}
                </group>
              )))}
              {materialPreview && (
                <group position={[0, topLocalY + 0.052, 0]}>
                  <mesh>
                    <cylinderGeometry args={[0.12, 0.16, 0.045, 32]} />
                    <meshStandardMaterial color="#e8dbc9" roughness={0.5} />
                  </mesh>
                  <mesh position={[0.18, 0.05, -0.04]}>
                    <cylinderGeometry args={[0.035, 0.035, 0.09, 18]} />
                    <meshStandardMaterial color="#f5efe6" roughness={0.35} />
                  </mesh>
                </group>
              )}
            </>
          ) : diningTableLike ? (
            <>
              <mesh castShadow receiveShadow position={[0, topLocalY, 0]}>
                <cylinderGeometry args={[Math.min(width, depth) * 0.22, Math.min(width, depth) * 0.22, 0.07, 64]} />
                <meshStandardMaterial color={useSelectionTint ? "#2563eb" : renderVariant.wood} roughness={0.48} metalness={0.02} />
              </mesh>
              <mesh castShadow receiveShadow position={[0, -height * 0.07, 0]}>
                <cylinderGeometry args={[0.08, 0.11, height * 0.72, 24]} />
                <meshStandardMaterial color={renderVariant.metal} roughness={0.26} metalness={0.48} />
              </mesh>
              <mesh receiveShadow position={[0, -height * 0.44, 0]}>
                <cylinderGeometry args={[Math.min(width, depth) * 0.12, Math.min(width, depth) * 0.14, 0.035, 36]} />
                <meshStandardMaterial color={renderVariant.metal} roughness={0.34} metalness={0.35} />
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
                      <meshStandardMaterial color={renderVariant.fabric} roughness={0.86} />
                    </mesh>
                    <mesh castShadow receiveShadow position={[0, 0.19, -0.18]}>
                      <boxGeometry args={[0.4, 0.42, 0.075]} />
                      <meshStandardMaterial color={renderVariant.fabric} roughness={0.84} />
                    </mesh>
                    {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
                      <mesh key={`${xSide}-${zSide}`} castShadow position={[xSide * 0.145, -0.22, zSide * 0.145]}>
                        <boxGeometry args={[0.035, 0.34, 0.035]} />
                        <meshStandardMaterial color={renderVariant.wood} roughness={0.56} />
                      </mesh>
                    )))}
                  </group>
                );
              })}
              {materialPreview && (
                <group>
                  {Array.from({ length: 6 }, (_, index) => {
                    const angle = (index / 6) * Math.PI * 2;
                    const settingRadius = Math.min(width, depth) * 0.28;
                    const x = Math.cos(angle) * settingRadius;
                    const z = Math.sin(angle) * settingRadius;
                    return (
                      <group key={`${item.id}-place-setting-${index}`} position={[x, topLocalY + 0.052, z]} rotation={[0, -angle, 0]}>
                        <mesh receiveShadow>
                          <boxGeometry args={[0.32, 0.01, 0.22]} />
                          <meshStandardMaterial color="#d8c5ae" roughness={0.86} />
                        </mesh>
                        <mesh position={[0, 0.012, 0]}>
                          <cylinderGeometry args={[0.095, 0.095, 0.014, 32]} />
                          <meshStandardMaterial color={effectMaterialCatalog.ceramic.color} roughness={effectMaterialCatalog.ceramic.roughness} metalness={effectMaterialCatalog.ceramic.metalness} />
                        </mesh>
                        <mesh position={[0.12, 0.035, -0.045]}>
                          <cylinderGeometry args={[0.026, 0.03, 0.052, 18]} />
                          <meshStandardMaterial color="#f4eee6" roughness={0.42} />
                        </mesh>
                      </group>
                    );
                  })}
                  <group position={[0, topLocalY + 0.072, 0]}>
                    <mesh>
                      <cylinderGeometry args={[0.15, 0.19, 0.055, 36]} />
                      <meshStandardMaterial color={effectMaterialCatalog.ceramic.color} roughness={0.32} metalness={0.01} />
                    </mesh>
                    {[-0.07, 0, 0.07].map((xOffset, fruitIndex) => (
                      <mesh key={`${item.id}-fruit-${fruitIndex}`} position={[xOffset, 0.055 + fruitIndex * 0.006, fruitIndex % 2 ? 0.025 : -0.025]}>
                        <sphereGeometry args={[0.038, 16, 12]} />
                        <meshStandardMaterial color={fruitIndex === 1 ? "#8aa63e" : "#c5a33b"} roughness={0.5} />
                      </mesh>
                    ))}
                  </group>
                  <mesh position={[0, ceilingLocalY, 0]}>
                    <boxGeometry args={[0.018, 0.46, 0.018]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.3} metalness={0.45} />
                  </mesh>
                  <mesh position={[0, ceilingLocalY - 0.26, 0]}>
                    <cylinderGeometry args={[0.23, 0.3, 0.16, 36]} />
                    <meshStandardMaterial color={renderVariant.light} emissive={renderVariant.light} emissiveIntensity={0.55} roughness={0.38} />
                  </mesh>
                </group>
              )}
            </>
          ) : slabTableLike ? (
            <>
              <RoundedBoxMesh
                args={[width * 0.96, 0.08, depth * 0.9]}
                position={[0, topLocalY + 0.01, 0]}
                radius={0.026}
                smoothness={4}
                color={useSelectionTint ? "#2563eb" : renderVariant.wood}
                map={woodTexture}
                roughness={0.46}
                metalness={0.02}
              />
              {[-0.28, 0.28].map((xOffset) => (
                <group key={`${item.id}-slab-base-${xOffset}`} position={[xOffset * width, -height * 0.1, 0]}>
                  <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 12]}>
                    <boxGeometry args={[0.06, height * 0.68, 0.06]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.24} metalness={0.62} />
                  </mesh>
                  <mesh castShadow receiveShadow rotation={[0, 0, -Math.PI / 12]}>
                    <boxGeometry args={[0.06, height * 0.68, 0.06]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.24} metalness={0.62} />
                  </mesh>
                  <mesh castShadow receiveShadow position={[0, -height * 0.28, 0]}>
                    <boxGeometry args={[depth * 0.52, 0.04, 0.08]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.28} metalness={0.54} />
                  </mesh>
                </group>
              ))}
              {materialPreview && (
                <>
                  <mesh position={[0, topLocalY + 0.028, 0]}>
                    <boxGeometry args={[width * 0.82, 0.012, depth * 0.64]} />
                    <meshStandardMaterial color="#ffffff" transparent opacity={0.08} roughness={0.48} />
                  </mesh>
                  <mesh position={[0, ceilingLocalY, 0]}>
                    <boxGeometry args={[0.014, 0.54, 0.014]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.24} metalness={0.48} />
                  </mesh>
                  <mesh position={[0, ceilingLocalY - 0.31, 0]}>
                    <cylinderGeometry args={[0.28, 0.34, 0.18, 32]} />
                    <meshStandardMaterial color={renderVariant.light} emissive={renderVariant.light} emissiveIntensity={0.5} roughness={0.42} />
                  </mesh>
                </>
              )}
            </>
          ) : (
            <>
              {loungeCoffeeTableLike ? (
                <>
                  <mesh castShadow receiveShadow position={[0, topLocalY, 0]}>
                    <cylinderGeometry args={[Math.min(width, depth) * 0.24, Math.min(width, depth) * 0.26, 0.055, 42]} />
                    <meshStandardMaterial color={useSelectionTint ? "#2563eb" : renderVariant.wood} map={woodTexture ?? undefined} roughness={0.5} metalness={0.02} />
                  </mesh>
                  <mesh castShadow receiveShadow position={[0, -height * 0.16, 0]}>
                    <cylinderGeometry args={[Math.min(width, depth) * 0.18, Math.min(width, depth) * 0.2, 0.05, 36]} />
                    <meshStandardMaterial color={renderVariant.stone} roughness={0.34} metalness={0.04} />
                  </mesh>
                  {[-0.18, 0.18].flatMap((xOffset) => [-0.18, 0.18].map((zOffset) => (
                    <group key={`${item.id}-caster-${xOffset}-${zOffset}`} position={[xOffset * width, -height * 0.31, zOffset * depth]}>
                      <mesh castShadow receiveShadow>
                        <cylinderGeometry args={[0.02, 0.02, 0.028, 14]} />
                        <meshStandardMaterial color={renderVariant.metal} roughness={0.26} metalness={0.58} />
                      </mesh>
                      <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
                        <boxGeometry args={[0.016, 0.08, 0.016]} />
                        <meshStandardMaterial color={renderVariant.metal} roughness={0.24} metalness={0.62} />
                      </mesh>
                    </group>
                  )))}
                  {materialPreview && (
                    <group position={[0, topLocalY + 0.05, 0]}>
                      <mesh>
                        <boxGeometry args={[width * 0.24, 0.022, depth * 0.12]} />
                        <meshStandardMaterial color={renderVariant.stone} roughness={0.35} metalness={0.02} />
                      </mesh>
                      <mesh position={[0, 0.03, 0]}>
                        <cylinderGeometry args={[0.04, 0.04, 0.08, 18]} />
                        <meshStandardMaterial color="#f0ece4" roughness={0.3} metalness={0.02} />
                      </mesh>
                    </group>
                  )}
                </>
              ) : (
                <>
                  <mesh castShadow receiveShadow position={[0, topLocalY, 0]}>
                    <boxGeometry args={[width * (coffeeTableLike ? 0.92 : 0.78), 0.06, depth * (coffeeTableLike ? 0.82 : 0.78)]} />
                    <meshStandardMaterial color={useSelectionTint ? "#2563eb" : renderVariant.wood} roughness={0.48} metalness={0.02} />
                  </mesh>
                  {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
                    <mesh key={`${item.id}-leg-${xSide}-${zSide}`} castShadow position={[xSide * width * 0.32, -height * 0.08, zSide * depth * 0.28]}>
                      <boxGeometry args={[0.04, height * 0.62, 0.04]} />
                      <meshStandardMaterial color={renderVariant.metal} roughness={0.28} metalness={0.5} />
                    </mesh>
                  )))}
                  {coffeeTableLike && materialPreview && (
                    <mesh position={[0, topLocalY + 0.05, 0]}>
                      <boxGeometry args={[width * 0.42, 0.024, depth * 0.24]} />
                      <meshStandardMaterial color={renderVariant.stone} roughness={0.35} metalness={0.02} />
                    </mesh>
                  )}
                </>
              )}
            </>
          )}
        </group>
      )}
      {specialtyOutdoorLike && (
        <group>
          {assetType === "dryingRack" && (
            <>
              {[-1, 1].map((xSide) => (
                <group key={`${item.id}-drying-side-${xSide}`} position={[xSide * width * 0.42, 0, 0]}>
                  <mesh position={[0, 0, -depth * 0.3]} rotation={[0, 0, 0.18 * xSide]}>
                    <boxGeometry args={[0.035, height * 0.9, 0.035]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.3} metalness={0.58} />
                  </mesh>
                  <mesh position={[0, 0, depth * 0.3]} rotation={[0, 0, -0.18 * xSide]}>
                    <boxGeometry args={[0.035, height * 0.9, 0.035]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.3} metalness={0.58} />
                  </mesh>
                </group>
              ))}
              {[-0.32, -0.16, 0, 0.16, 0.32].map((zOffset) => (
                <mesh key={`${item.id}-drying-rail-${zOffset}`} position={[0, height * 0.36, zOffset * depth]}>
                  <boxGeometry args={[width * 0.86, 0.026, 0.026]} />
                  <meshStandardMaterial color={renderVariant.metal} roughness={0.28} metalness={0.55} />
                </mesh>
              ))}
            </>
          )}
          {assetType === "dogHouse" && (
            <>
              <RoundedBoxMesh args={[width * 0.82, height * 0.48, depth * 0.82]} position={[0, -height * 0.14, 0]} radius={0.04} color={renderVariant.wood} map={woodTexture} roughness={0.58} />
              <mesh position={[0, height * 0.24, 0]} rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[width * 0.7, height * 0.12, depth * 0.92]} />
                <meshStandardMaterial color={renderVariant.darkWood} roughness={0.54} />
              </mesh>
              <mesh position={[0, -height * 0.22, frontZ + 0.02]}>
                <boxGeometry args={[width * 0.28, height * 0.34, 0.035]} />
                <meshStandardMaterial color="#2d211a" roughness={0.62} />
              </mesh>
            </>
          )}
          {assetType === "yardGate" && (
            <>
              {[-0.48, 0.48].map((xOffset) => (
                <mesh key={`${item.id}-gate-post-${xOffset}`} position={[xOffset * width, 0, 0]}>
                  <boxGeometry args={[0.08, height, 0.08]} />
                  <meshStandardMaterial color={renderVariant.metal} roughness={0.28} metalness={0.58} />
                </mesh>
              ))}
              {Array.from({ length: 6 }, (_, index) => {
                const x = -width * 0.34 + index * width * 0.136;
                return (
                  <mesh key={`${item.id}-gate-slat-${index}`} position={[x, 0, frontZ]}>
                    <boxGeometry args={[0.035, height * 0.86, 0.035]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.28} metalness={0.58} />
                  </mesh>
                );
              })}
              {[-0.22, 0.22].map((yOffset) => (
                <mesh key={`${item.id}-gate-rail-${yOffset}`} position={[0, yOffset * height, frontZ + 0.01]}>
                  <boxGeometry args={[width * 0.84, 0.035, 0.035]} />
                  <meshStandardMaterial color={renderVariant.metal} roughness={0.28} metalness={0.58} />
                </mesh>
              ))}
            </>
          )}
          {assetType === "yardLight" && (
            <>
              <mesh position={[0, -height * 0.16, 0]}>
                <cylinderGeometry args={[0.045, 0.055, height * 0.66, 16]} />
                <meshStandardMaterial color={renderVariant.metal} roughness={0.24} metalness={0.62} />
              </mesh>
              <pointLight color={renderVariant.light} intensity={0.95} distance={1.9} position={[0, height * 0.24, 0]} />
              <mesh position={[0, height * 0.24, 0]}>
                <cylinderGeometry args={[0.16, 0.2, 0.18, 24]} />
                <meshStandardMaterial color={renderVariant.light} emissive={renderVariant.light} emissiveIntensity={1.2} roughness={0.3} />
              </mesh>
            </>
          )}
          {assetType === "outdoorSocket" && (
            <>
              <RoundedBoxMesh args={[width * 0.72, height * 0.58, depth * 0.9]} position={[0, 0, 0]} radius={0.018} color={renderVariant.metal} roughness={0.32} metalness={0.5} />
              <mesh position={[0, height * 0.12, frontZ + 0.02]}>
                <boxGeometry args={[width * 0.46, height * 0.08, 0.018]} />
                <meshStandardMaterial color="#e5e7eb" roughness={0.42} />
              </mesh>
              {[-0.12, 0.12].map((xOffset) => (
                <mesh key={`${item.id}-socket-hole-${xOffset}`} position={[xOffset * width, -height * 0.06, frontZ + 0.025]}>
                  <cylinderGeometry args={[0.018, 0.018, 0.012, 12]} />
                  <meshStandardMaterial color="#111827" roughness={0.5} />
                </mesh>
              ))}
            </>
          )}
          {assetType === "drainPoint" && (
            <>
              <mesh receiveShadow position={[0, -height * 0.1, 0]}>
                <cylinderGeometry args={[Math.min(width, depth) * 0.42, Math.min(width, depth) * 0.42, Math.max(0.025, height * 0.42), 36]} />
                <meshStandardMaterial color={renderVariant.metal} roughness={0.36} metalness={0.52} />
              </mesh>
              {[-0.18, 0, 0.18].map((xOffset) => (
                <mesh key={`${item.id}-drain-slot-${xOffset}`} position={[xOffset * width, -height * 0.07, 0]}>
                  <boxGeometry args={[0.018, 0.012, depth * 0.62]} />
                  <meshStandardMaterial color="#111827" roughness={0.4} />
                </mesh>
              ))}
            </>
          )}
        </group>
      )}
      {chairLike && (
        <group>
          <RoundedBoxMesh
            args={[width * 0.82, height * 0.18, depth * 0.72]}
            position={[0, -height * 0.18, 0]}
            radius={0.055}
            color={useSelectionTint ? "#2563eb" : renderVariant.fabric}
            map={fabricTexture}
            roughness={0.86}
          />
          <RoundedBoxMesh
            args={[width * 0.82, height * 0.72, 0.085]}
            position={[0, height * 0.1, -depth * 0.34]}
            radius={0.045}
            color={useSelectionTint ? "#2563eb" : renderVariant.fabric}
            map={fabricTexture}
            roughness={0.84}
          />
          {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
            <mesh key={`${item.id}-chair-leg-${xSide}-${zSide}`} castShadow position={[xSide * width * 0.28, -height * 0.41, zSide * depth * 0.22]}>
              <cylinderGeometry args={[0.018, 0.026, height * 0.48, 12]} />
              <meshStandardMaterial color={renderVariant.wood} roughness={0.58} />
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
                <meshStandardMaterial color={useSelectionTint ? "#2563eb" : palette.plant} roughness={0.74} />
              </mesh>
            );
          })}
        </group>
      )}
      {materialPreview && opacity >= 0.85 && (
        <>
          {counterLike && (
            <group>
              <RoundedBoxMesh
                args={[width + 0.08, 0.055, depth + 0.08]}
                position={[0, height / 2 + 0.028, 0]}
                radius={0.026}
                color={renderVariant.stone}
                map={stoneTexture}
                roughness={0.31}
                metalness={0.04}
              />
              {Array.from({ length: Math.min(5, Math.max(2, Math.round(width * 1.4))) }, (_, index) => (
                <mesh
                  key={`${item.id}-stone-vein-${index}`}
                  position={[(-width * 0.38) + index * (width * 0.76) / Math.max(1, Math.min(5, Math.max(2, Math.round(width * 1.4))) - 1), height / 2 + 0.062, 0]}
                  rotation={[0, 0.18 + index * 0.12, 0]}
                >
                  <boxGeometry args={[0.018, 0.006, depth * 0.82]} />
                  <meshStandardMaterial color="#f3eadf" transparent opacity={0.42} roughness={0.8} />
                </mesh>
              ))}
            </group>
          )}
          {cabinetLike && (
            <group>
              <mesh castShadow receiveShadow position={[0, -height * 0.5 + 0.055, frontZ + 0.014]}>
                <boxGeometry args={[width * 0.92, 0.11, 0.06]} />
                <meshStandardMaterial color={renderVariant.metal} roughness={0.44} metalness={0.18} />
              </mesh>
              <mesh position={[0, height * 0.38, frontZ + 0.018]}>
                <boxGeometry args={[width * 0.94, 0.024, 0.026]} />
                <meshStandardMaterial color="#f7f0e6" transparent opacity={0.54} roughness={0.32} />
              </mesh>
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
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.28} metalness={0.58} />
                  </mesh>
                );
              })}
              {Array.from({ length: Math.max(1, panelCount) }, (_, index) => {
                const drawerWidth = width / panelCount;
                const x = -width / 2 + drawerWidth * (index + 0.5);
                return (
                  <group key={`${item.id}-drawer-face-${index}`} position={[x, -height * 0.2, frontZ + 0.022]}>
                    <RoundedBoxMesh
                      args={[drawerWidth * 0.82, height * 0.18, 0.022]}
                      radius={0.018}
                      color={renderVariant.wood}
                      map={woodTexture}
                      roughness={0.52}
                      metalness={0.02}
                    />
                    <mesh position={[0, 0, 0.018]}>
                      <boxGeometry args={[Math.min(0.22, drawerWidth * 0.46), 0.014, 0.018]} />
                      <meshStandardMaterial color={renderVariant.metal} roughness={0.24} metalness={0.68} />
                    </mesh>
                  </group>
                );
              })}
              {(["kitchenCabinet", "sideboard", "bathroomVanity"].includes(assetType) || item.moduleType === "kitchenCabinet" || item.moduleType === "sideboard" || item.moduleType === "vanity") && (
                <mesh position={[0, height * 0.24, frontZ + 0.012]}>
                  <boxGeometry args={[width * 0.88, 0.026, 0.018]} />
                  <meshStandardMaterial color={renderVariant.light} emissive={renderVariant.light} emissiveIntensity={0.75} roughness={0.18} />
                </mesh>
              )}
              {wardrobeLike && (
                <group>
                  {wardrobeClosedPanelWidth > 0.08 && [-1, 1].map((xSide) => (
                    <RoundedBoxMesh
                      key={`${item.id}-wardrobe-closed-panel-${xSide}`}
                      args={[wardrobeClosedPanelWidth * 0.92, height * 0.72, 0.062]}
                      position={[xSide * (wardrobeOpenWidth / 2 + wardrobeClosedPanelWidth / 2), height * 0.05, frontZ + 0.056]}
                      radius={0.026}
                      color={xSide < 0 ? renderVariant.wood : renderVariant.wardrobeInterior}
                      map={woodTexture}
                      roughness={0.54}
                      metalness={0.02}
                    />
                  ))}
                  <RoundedBoxMesh
                    args={[wardrobeOpenWidth, height * 0.68, 0.054]}
                    position={[0, height * 0.06, frontZ + 0.018]}
                    radius={0.024}
                    color={renderVariant.wardrobeInterior}
                    map={darkWoodTexture}
                    roughness={0.58}
                    metalness={0.02}
                  />
                  {[-1, 1].map((xSide) => (
                    <mesh key={`${item.id}-wardrobe-open-stile-${xSide}`} position={[xSide * wardrobeOpenWidth * 0.5, height * 0.06, frontZ + 0.078]}>
                      <boxGeometry args={[0.028, height * 0.72, 0.048]} />
                      <meshStandardMaterial color={renderVariant.darkWood} map={darkWoodTexture ?? undefined} roughness={0.52} metalness={0.02} />
                    </mesh>
                  ))}
                  {[-0.18, 0.18].map((yOffset) => (
                    <mesh key={`${item.id}-wardrobe-shelf-${yOffset}`} position={[0, yOffset * height, frontZ + 0.082]}>
                      <boxGeometry args={[wardrobeOpenWidth * 0.92, 0.026, 0.052]} />
                      <meshStandardMaterial color="#c4ad91" map={darkWoodTexture ?? undefined} roughness={0.56} metalness={0.02} />
                    </mesh>
                  ))}
                  <mesh position={[0, height * 0.44, frontZ + 0.076]}>
                    <boxGeometry args={[wardrobeOpenWidth * 0.94, 0.024, 0.028]} />
                    <meshStandardMaterial color={renderVariant.light} emissive={renderVariant.light} emissiveIntensity={0.98} roughness={0.18} />
                  </mesh>
                  <mesh position={[0, height * 0.24, frontZ + 0.072]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.012, 0.012, wardrobeOpenWidth * 0.82, 12]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.26} metalness={0.72} />
                  </mesh>
                  {Array.from({ length: wardrobeClothCount }, (_, index) => {
                    const x = -wardrobeOpenWidth * 0.38 + index * (wardrobeOpenWidth * 0.76) / Math.max(1, wardrobeClothCount - 1);
                    const clothColor = renderVariant.clothColors[index % renderVariant.clothColors.length];
                    return (
                      <group key={`${item.id}-wardrobe-cloth-${index}`} position={[x, height * 0.05, frontZ + 0.096]}>
                        <RoundedBoxMesh
                          args={[Math.max(0.1, wardrobeOpenWidth * 0.085), height * (0.24 + (index % 3) * 0.04), 0.045]}
                          radius={0.018}
                          color={clothColor}
                          map={fabricTexture}
                          roughness={0.86}
                        />
                        <mesh position={[0, height * 0.17, 0.012]} rotation={[0, 0, Math.PI / 2]}>
                          <cylinderGeometry args={[0.009, 0.009, Math.max(0.09, wardrobeOpenWidth * 0.07), 10]} />
                          <meshStandardMaterial color={renderVariant.metal} roughness={0.24} metalness={0.62} />
                        </mesh>
                      </group>
                    );
                  })}
                  {Array.from({ length: Math.max(2, Math.min(4, Math.round(width / 0.62))) }, (_, index) => {
                    const boxWidth = wardrobeOpenWidth / Math.max(2, Math.min(4, Math.round(width / 0.62))) - 0.045;
                    const x = -wardrobeOpenWidth / 2 + boxWidth / 2 + 0.04 + index * (boxWidth + 0.04);
                    return (
                      <RoundedBoxMesh
                        key={`${item.id}-wardrobe-storage-box-${index}`}
                        args={[boxWidth, height * 0.08, 0.13]}
                        position={[x, -height * 0.11, frontZ + 0.12]}
                        radius={0.018}
                        color={index % 2 ? "#c8a989" : "#eadcc9"}
                        map={fabricTexture}
                        roughness={0.82}
                      />
                    );
                  })}
                  {Array.from({ length: wardrobeDrawerCount }, (_, index) => {
                    const drawerWidth = (width * 0.78) / wardrobeDrawerCount;
                    const x = -width * 0.39 + drawerWidth * (index + 0.5);
                    return (
                      <group key={`${item.id}-wardrobe-drawer-${index}`} position={[x, -height * 0.28, frontZ + 0.084]}>
                        <RoundedBoxMesh args={[drawerWidth - 0.035, height * 0.13, 0.05]} radius={0.02} color={renderVariant.wood} map={woodTexture} roughness={0.55} metalness={0.02} />
                        <mesh position={[0, 0, 0.034]}>
                          <boxGeometry args={[Math.min(0.16, drawerWidth * 0.4), 0.018, 0.018]} />
                          <meshStandardMaterial color={renderVariant.metal} roughness={0.28} metalness={0.58} />
                        </mesh>
                      </group>
                    );
                  })}
                </group>
              )}
              {assetType === "wallCabinet" && (
                <group>
                  <RoundedBoxMesh
                    args={[width * 0.94, height * 0.74, depth * 0.82]}
                    position={[0, height * 0.06, 0]}
                    radius={0.025}
                    smoothness={4}
                    color={renderVariant.wood}
                    map={woodTexture}
                    roughness={0.54}
                    metalness={0.02}
                  />
                  {[-0.24, 0.24].map((xOffset) => (
                    <RoundedBoxMesh
                      key={`${item.id}-wall-cabinet-glass-${xOffset}`}
                      args={[width * 0.34, height * 0.5, 0.034]}
                      position={[xOffset * width, height * 0.08, frontZ + 0.03]}
                      radius={0.018}
                      color={renderVariant.glass}
                      roughness={0.08}
                      metalness={0.04}
                      transparent
                      opacity={0.42}
                    />
                  ))}
                  {[-0.24, 0.24].map((xOffset) => (
                    <mesh key={`${item.id}-wall-cabinet-handle-${xOffset}`} position={[xOffset * width, height * 0.08, frontZ + 0.06]}>
                      <boxGeometry args={[0.018, height * 0.32, 0.018]} />
                      <meshStandardMaterial color={renderVariant.metal} roughness={0.24} metalness={0.68} />
                    </mesh>
                  ))}
                  <mesh position={[0, -height * 0.36, frontZ + 0.035]}>
                    <boxGeometry args={[width * 0.82, 0.026, 0.024]} />
                    <meshStandardMaterial color={renderVariant.light} emissive={renderVariant.light} emissiveIntensity={0.72} roughness={0.18} />
                  </mesh>
                </group>
              )}
              {(assetType === "sideboard" || assetType === "outdoorCabinet") && (
                <group>
                  <RoundedBoxMesh
                    args={[width * 0.9, 0.05, depth * 0.88]}
                    position={[0, -height * 0.48, 0]}
                    radius={0.025}
                    color={renderVariant.darkWood}
                    map={darkWoodTexture}
                    roughness={0.5}
                    metalness={0.02}
                  />
                  {Array.from({ length: 5 }, (_, index) => {
                    const y = height * 0.26 - index * height * 0.115;
                    return (
                      <group key={`${item.id}-sideboard-drawer-${index}`} position={[0, y, frontZ + 0.056]}>
                        <RoundedBoxMesh
                          args={[width * 0.82, height * 0.072, 0.044]}
                          radius={0.022}
                        color={index % 2 ? renderVariant.wood : "#d0b28d"}
                          map={woodTexture}
                          roughness={0.56}
                          metalness={0.02}
                        />
                        <mesh position={[0, 0, 0.03]}>
                          <boxGeometry args={[width * 0.34, 0.014, 0.018]} />
                          <meshStandardMaterial color={renderVariant.metal} roughness={0.24} metalness={0.64} />
                        </mesh>
                      </group>
                    );
                  })}
                  {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
                    <mesh key={`${item.id}-sideboard-leg-${xSide}-${zSide}`} castShadow position={[xSide * width * 0.38, -height * 0.43, zSide * depth * 0.32]}>
                      <cylinderGeometry args={[0.025, 0.032, 0.18, 12]} />
                      <meshStandardMaterial color={renderVariant.darkWood} roughness={0.45} metalness={0.04} />
                    </mesh>
                  )))}
                  <RoundedBoxMesh args={[0.22, 0.26, 0.035]} position={[-width * 0.27, height * 0.53, -depth * 0.08]} radius={0.014} color="#f1e9dd" roughness={0.42} />
                  <mesh position={[-width * 0.27, height * 0.54, -depth * 0.105]} rotation={[0, 0, -0.08]}>
                    <boxGeometry args={[0.17, 0.19, 0.012]} />
                    <meshStandardMaterial color="#a08b75" roughness={0.38} />
                  </mesh>
                  <group position={[0, height * 0.56, depth * 0.12]}>
                    <RoundedBoxMesh args={[width * 0.34, 0.024, 0.18]} radius={0.012} color="#c7b39e" roughness={0.64} />
                    {[-0.08, 0.08].map((xOffset) => (
                      <mesh key={`${item.id}-sideboard-tray-bottle-${xOffset}`} position={[xOffset, 0.07, 0]}>
                        <cylinderGeometry args={[0.025, 0.03, 0.12, 16]} />
                        <meshStandardMaterial color={xOffset > 0 ? "#7f614b" : "#e6d6c3"} roughness={0.42} metalness={0.02} />
                      </mesh>
                    ))}
                  </group>
                  {assetType === "outdoorCabinet" ? (
                    <group position={[width * 0.22, height * 0.54, depth * 0.08]}>
                      <mesh>
                        <boxGeometry args={[0.22, 0.035, 0.16]} />
                        <meshStandardMaterial color={renderVariant.stone} roughness={0.38} metalness={0.03} />
                      </mesh>
                      <mesh position={[0.04, 0.12, -0.02]}>
                        <cylinderGeometry args={[0.014, 0.014, 0.18, 12]} />
                        <meshStandardMaterial color={renderVariant.metal} roughness={0.2} metalness={0.72} />
                      </mesh>
                    </group>
                  ) : (
                    <group position={[width * 0.25, height * 0.56, -depth * 0.06]}>
                      <mesh castShadow>
                        <cylinderGeometry args={[0.055, 0.07, 0.11, 18]} />
                        <meshStandardMaterial color="#d7c0a6" roughness={0.62} />
                      </mesh>
                      <mesh position={[0, 0.11, 0]} scale={[1, 0.62, 1]}>
                        <sphereGeometry args={[0.11, 18, 12]} />
                        <meshStandardMaterial color={palette.plant} roughness={0.72} />
                      </mesh>
                    </group>
                  )}
                </group>
              )}
            </group>
          )}
          {assetType === "island" && (
            <group>
              <mesh position={[-width / 2 - 0.035, 0.04, 0]}>
                <boxGeometry args={[0.055, height * 0.84, depth + 0.08]} />
                <meshStandardMaterial color={renderVariant.stone} roughness={0.34} metalness={0.04} />
              </mesh>
              <mesh position={[width / 2 + 0.035, 0.04, 0]}>
                <boxGeometry args={[0.055, height * 0.84, depth + 0.08]} />
                <meshStandardMaterial color={renderVariant.stone} roughness={0.34} metalness={0.04} />
              </mesh>
              <mesh castShadow receiveShadow position={[0, height * 0.1, -depth / 2 - 0.035]}>
                <boxGeometry args={[width * 0.86, height * 0.52, 0.05]} />
                <meshStandardMaterial color={renderVariant.wood} map={woodTexture ?? undefined} roughness={0.55} metalness={0.02} />
              </mesh>
              {[-0.28, 0, 0.28].map((xOffset, index) => (
                <mesh key={`${item.id}-island-front-groove-${index}`} position={[xOffset * width, height * 0.1, -depth / 2 - 0.068]}>
                  <boxGeometry args={[0.018, height * 0.46, 0.018]} />
                  <meshStandardMaterial color="#6f5a46" transparent opacity={0.45} roughness={0.62} />
                </mesh>
              ))}
              <mesh position={[0, -height * 0.42, -depth / 2 - 0.03]}>
                <boxGeometry args={[width * 0.78, 0.08, 0.055]} />
                <meshStandardMaterial color={renderVariant.metal} roughness={0.42} metalness={0.16} />
              </mesh>
              {[-0.34, 0.34].map((xOffset, index) => (
                <group key={`${item.id}-counter-stool-${index}`} position={[xOffset * width, -height * 0.17, -depth * 0.64]}>
                  <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[0.16, 0.18, 0.07, 28]} />
                    <meshStandardMaterial color={renderVariant.fabric} map={fabricTexture ?? undefined} roughness={0.88} />
                  </mesh>
                  <mesh castShadow position={[0, -0.19, 0]}>
                    <cylinderGeometry args={[0.026, 0.026, 0.36, 12]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.24} metalness={0.72} />
                  </mesh>
                  <mesh receiveShadow position={[0, -0.38, 0]}>
                    <cylinderGeometry args={[0.14, 0.16, 0.024, 24]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.32} metalness={0.5} />
                  </mesh>
                </group>
              ))}
              {[-0.52, 0, 0.52].map((xOffset, index) => (
                <group key={`${item.id}-island-pendant-${index}`} position={[xOffset * Math.min(width, 2.2), 0, 0]}>
                  <mesh position={[0, ceilingLocalY, 0]}>
                    <boxGeometry args={[0.018, 0.42, 0.018]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.3} metalness={0.48} />
                  </mesh>
                  <mesh position={[0, ceilingLocalY - 0.24, 0]}>
                    <cylinderGeometry args={[0.12, 0.16, 0.12, 28]} />
                    <meshStandardMaterial color={renderVariant.light} emissive={renderVariant.light} emissiveIntensity={0.52} roughness={0.36} />
                  </mesh>
                </group>
              ))}
            </group>
          )}
          {bedLike && (
            <group>
              <RoundedBoxMesh
                args={[width * 1.18, 0.026, depth * 1.02]}
                position={[0, -height * 0.48, 0.06]}
                radius={0.075}
                color={renderVariant.rug}
                map={fabricTexture}
                transparent
                opacity={0.82}
                roughness={0.96}
                castShadow={false}
              />
              <RoundedBoxMesh
                args={[width * 0.96, 0.18, depth * 0.82]}
                position={[0, -height * 0.15, 0.04]}
                radius={0.085}
                smoothness={5}
                color={renderVariant.fabric}
                map={fabricTexture}
                roughness={0.9}
              />
              <RoundedBoxMesh
                args={[width * 0.88, 0.13, depth * 0.58]}
                position={[0, -height * 0.015, depth * 0.05]}
                radius={0.1}
                smoothness={6}
                color={renderVariant.bedding}
                map={fabricTexture}
                roughness={0.92}
              />
              <RoundedBoxMesh
                args={[width * 0.98, height * 0.82, 0.14]}
                position={[0, height * 0.04, -depth / 2 - 0.058]}
                radius={0.052}
                smoothness={4}
                color={renderVariant.wood}
                map={woodTexture}
                roughness={0.58}
              />
              {Array.from({ length: 4 }, (_, index) => {
                const x = -width * 0.36 + index * width * 0.24;
                return (
                  <mesh key={`${item.id}-headboard-channel-${index}`} position={[x, height * 0.05, -depth / 2 + 0.02]}>
                    <boxGeometry args={[0.018, height * 0.62, 0.02]} />
                    <meshStandardMaterial color="#f6e8d5" transparent opacity={0.24} roughness={0.65} />
                  </mesh>
                );
              })}
              {[-0.24, 0.24].map((xOffset) => (
                <RoundedBoxMesh
                  key={`${item.id}-pillow-${xOffset}`}
                  args={[width * 0.28, 0.1, depth * 0.16]}
                  position={[xOffset * width, height * 0.075, -depth * 0.27]}
                  radius={0.06}
                  smoothness={6}
                  color="#f7f1e8"
                  map={fabricTexture}
                  roughness={0.95}
                />
              ))}
              {[-0.12, 0.14].map((xOffset, index) => (
                <RoundedBoxMesh
                  key={`${item.id}-accent-pillow-${index}`}
                  args={[width * 0.18, 0.082, depth * 0.12]}
                  position={[xOffset * width, height * 0.112, -depth * 0.16]}
                  rotation={[0, 0, index ? -0.08 : 0.08]}
                  radius={0.045}
                  smoothness={5}
                  color={index ? renderVariant.accent : "#d0bda8"}
                  map={fabricTexture}
                  roughness={0.94}
                />
              ))}
              <RoundedBoxMesh
                args={[width * 0.82, 0.05, depth * 0.18]}
                position={[0, height * 0.065, depth * 0.19]}
                radius={0.04}
                smoothness={4}
                color={renderVariant.runner}
                map={fabricTexture}
                roughness={0.9}
              />
              {Array.from({ length: 4 }, (_, index) => (
                <RoundedBoxMesh
                  key={`${item.id}-duvet-fold-${index}`}
                  args={[width * 0.72, 0.018, 0.018]}
                  position={[0, height * 0.098 + index * 0.002, depth * (0.01 + index * 0.075)]}
                  radius={0.012}
                  color="#fff8ef"
                  transparent
                  opacity={0.42}
                  roughness={0.98}
                />
              ))}
              <mesh castShadow receiveShadow position={[0, height * 0.095, depth * 0.31]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.055, 0.055, width * 0.72, 24]} />
                <meshStandardMaterial color="#e8d8c7" map={fabricTexture ?? undefined} roughness={0.94} />
              </mesh>
              {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
                <mesh key={`${item.id}-bed-leg-${xSide}-${zSide}`} castShadow position={[xSide * width * 0.39, -height * 0.39, zSide * depth * 0.32]}>
                  <cylinderGeometry args={[0.028, 0.034, 0.16, 12]} />
                  <meshStandardMaterial color={renderVariant.darkWood} roughness={0.48} metalness={0.02} />
                </mesh>
              )))}
              {[-1, 1].map((xSide) => (
                <group key={`${item.id}-nightstand-${xSide}`} position={[xSide * width * 0.62, -height * 0.21, -depth * 0.34]}>
                  <RoundedBoxMesh args={[0.38, 0.34, 0.32]} radius={0.035} color={renderVariant.wood} map={woodTexture} roughness={0.55} metalness={0.02} />
                  <mesh position={[0, 0.06, 0.174]}>
                    <boxGeometry args={[0.2, 0.018, 0.018]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.26} metalness={0.58} />
                  </mesh>
                  <pointLight color={palette.light} intensity={0.32} distance={1.2} position={[0, 0.44, 0]} />
                  <mesh position={[0, 0.31, 0]}>
                    <cylinderGeometry args={[0.035, 0.035, 0.26, 12]} />
                    <meshStandardMaterial color={renderVariant.metal} roughness={0.28} metalness={0.56} />
                  </mesh>
                  <mesh position={[0, 0.48, 0]}>
                    <cylinderGeometry args={[0.12, 0.17, 0.18, 24]} />
                    <meshStandardMaterial color={palette.light} emissive={palette.light} emissiveIntensity={0.78} roughness={0.42} />
                  </mesh>
                </group>
              ))}
            </group>
          )}
          {sofaLike && (
            <group>
              <mesh castShadow receiveShadow position={[0, -height * 0.04, -depth / 2 + 0.08]}>
                <boxGeometry args={[width, height * 0.72, 0.16]} />
                <meshStandardMaterial color={renderVariant.fabric} roughness={0.88} />
              </mesh>
              <mesh castShadow receiveShadow position={[-width / 2 + 0.08, -height * 0.08, 0]}>
                <boxGeometry args={[0.16, height * 0.55, depth * 0.88]} />
                <meshStandardMaterial color={renderVariant.fabric} roughness={0.88} />
              </mesh>
              <mesh castShadow receiveShadow position={[width / 2 - 0.08, -height * 0.08, 0]}>
                <boxGeometry args={[0.16, height * 0.55, depth * 0.88]} />
                <meshStandardMaterial color={renderVariant.fabric} roughness={0.88} />
              </mesh>
              {Array.from({ length: Math.max(2, Math.min(4, Math.round(width / 0.72))) }, (_, index) => {
                const cushionWidth = width / Math.max(2, Math.min(4, Math.round(width / 0.72))) - 0.06;
                const x = -width / 2 + cushionWidth / 2 + 0.12 + index * (cushionWidth + 0.04);
                return (
                  <mesh key={`${item.id}-seat-cushion-${index}`} castShadow receiveShadow position={[x, -height * 0.01, depth * 0.08]}>
                    <boxGeometry args={[cushionWidth, 0.065, depth * 0.62]} />
                    <meshStandardMaterial color={renderVariant.bedding} roughness={0.92} />
                  </mesh>
                );
              })}
              {[-0.24, 0.2].map((xOffset, index) => (
                <mesh key={`${item.id}-throw-pillow-${index}`} castShadow receiveShadow position={[xOffset * width, height * 0.12, -depth * 0.24]} rotation={[0, 0, index ? -0.12 : 0.12]}>
                  <boxGeometry args={[0.32, 0.25, 0.08]} />
                  <meshStandardMaterial color={index ? renderVariant.accent : renderVariant.rug} roughness={0.9} />
                </mesh>
              ))}
            </group>
          )}
          {assetType === "sink" && (
            <group>
              <mesh position={[0, height / 2 + 0.018, 0]}>
                <boxGeometry args={[width * 0.78, 0.035, depth * 0.68]} />
                <meshStandardMaterial color={renderVariant.stone} roughness={0.2} metalness={0.45} />
              </mesh>
              <mesh position={[0, height / 2 + 0.04, 0]}>
                <boxGeometry args={[width * 0.56, 0.018, depth * 0.46]} />
                <meshStandardMaterial color={renderVariant.glass} roughness={0.18} metalness={0.58} />
              </mesh>
              <mesh position={[width * 0.22, height / 2 + 0.18, -depth * 0.08]}>
                <cylinderGeometry args={[0.022, 0.022, 0.28, 14]} />
                <meshStandardMaterial color={renderVariant.metal} roughness={0.18} metalness={0.7} />
              </mesh>
              <mesh position={[width * 0.13, height / 2 + 0.3, -depth * 0.08]}>
                <boxGeometry args={[0.2, 0.026, 0.026]} />
                <meshStandardMaterial color={renderVariant.metal} roughness={0.18} metalness={0.7} />
              </mesh>
            </group>
          )}
          {assetType === "cooktop" && (
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
          {assetType === "fridge" && (
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
          {fireplaceLike && (
            <group>
              <pointLight color="#ffb45f" intensity={2.1} distance={2.1} position={[0, -height * 0.02, frontZ + 0.22]} />
              {materialPreview && depth < 0.22 && (
                <group position={[0, -height * 0.04, -frontZ - 0.09]}>
                  <RoundedBoxMesh
                    args={[fireplaceVisualWidth * 1.08, height * 0.66, 0.08]}
                    radius={0.024}
                    color={effectMaterialCatalog.warmStone.color}
                    map={fireplaceStoneTexture}
                    roughness={0.36}
                    metalness={0.04}
                  />
                  <RoundedBoxMesh
                    args={[fireplaceVisualWidth * 0.72, height * 0.38, 0.09]}
                    radius={0.018}
                    position={[0, -height * 0.02, -0.01]}
                    color="#3a1d14"
                    roughness={0.32}
                    metalness={0.08}
                    emissive="#f97316"
                    emissiveIntensity={1.15}
                  />
                  <mesh position={[0, -height * 0.02, -0.07]} renderOrder={7}>
                    <boxGeometry args={[fireplaceVisualWidth * 0.48, height * 0.22, 0.018]} />
                    <meshStandardMaterial color="#fb923c" emissive="#f97316" emissiveIntensity={2.6} roughness={0.18} transparent opacity={0.92} depthWrite={false} />
                  </mesh>
                  <mesh position={[0, height * 0.22, -0.065]}>
                    <boxGeometry args={[fireplaceVisualWidth * 0.78, 0.026, 0.028]} />
                    <meshStandardMaterial color={effectMaterialCatalog.blackMetal.color} roughness={0.22} metalness={0.68} />
                  </mesh>
                  <mesh position={[0, -height * 0.27, -0.06]}>
                    <boxGeometry args={[fireplaceVisualWidth * 1.14, 0.055, 0.16]} />
                    <meshStandardMaterial color="#d9cbb9" map={fireplaceStoneTexture ?? undefined} roughness={0.36} metalness={0.04} />
                  </mesh>
                </group>
              )}
              <RoundedBoxMesh
                args={[width * 1.04, height * 0.82, 0.12]}
                radius={0.035}
                position={[0, -height * 0.02, frontZ - 0.012]}
                color={effectMaterialCatalog.warmStone.color}
                map={fireplaceStoneTexture}
                roughness={0.34}
                metalness={0.04}
              />
              <RoundedBoxMesh
                args={[width * 0.78, height * 0.5, 0.14]}
                radius={0.025}
                position={[0, -height * 0.08, frontZ + 0.04]}
                color="#4a2114"
                roughness={0.38}
                metalness={0.1}
                emissive="#f97316"
                emissiveIntensity={0.72}
              />
              <mesh position={[0, -height * 0.08, frontZ + 0.112]} renderOrder={3}>
                <boxGeometry args={[width * 0.66, height * 0.39, 0.016]} />
                <meshStandardMaterial
                  color={effectMaterialCatalog.fireplaceGlass.color}
                  roughness={effectMaterialCatalog.fireplaceGlass.roughness}
                  metalness={effectMaterialCatalog.fireplaceGlass.metalness}
                  transparent
                  opacity={0.16}
                  depthWrite={false}
                />
              </mesh>
              <mesh position={[-width * 0.18, height * 0.04, frontZ + 0.124]} rotation={[0, 0, -0.34]} renderOrder={4}>
                <boxGeometry args={[width * 0.28, 0.012, 0.012]} />
                <meshStandardMaterial color="#ffffff" emissive="#fff4dc" emissiveIntensity={0.46} transparent opacity={0.38} depthWrite={false} />
              </mesh>
              {[-0.39, 0.39].map((xSide) => (
                <RoundedBoxMesh
                  key={`${item.id}-fireplace-stone-jamb-${xSide}`}
                  args={[width * 0.13, height * 0.64, 0.16]}
                  radius={0.018}
                  position={[xSide * width, -height * 0.04, frontZ + 0.052]}
                  color="#d7cab8"
                  map={fireplaceStoneTexture}
                  roughness={0.36}
                  metalness={0.04}
                />
              ))}
              <RoundedBoxMesh
                args={[width * 1.16, 0.095, 0.25]}
                radius={0.028}
                position={[0, height * 0.39, frontZ + 0.055]}
                color="#d9cbb9"
                map={fireplaceStoneTexture}
                roughness={0.36}
                metalness={0.04}
              />
              <RoundedBoxMesh
                args={[width * 1.2, 0.085, 0.34]}
                radius={0.026}
                position={[0, -height * 0.43, frontZ + 0.08]}
                color="#d9cbb9"
                map={fireplaceStoneTexture}
                roughness={0.35}
                metalness={0.04}
              />
              <mesh position={[0, height * 0.37, frontZ + 0.21]}>
                <boxGeometry args={[width * 1.06, 0.018, 0.03]} />
                <meshStandardMaterial color={effectMaterialCatalog.blackMetal.color} roughness={0.2} metalness={0.72} />
              </mesh>
              <mesh position={[0, height * 0.025, frontZ + 0.31]} renderOrder={6}>
                <boxGeometry args={[width * 0.46, height * 0.19, 0.024]} />
                <meshStandardMaterial color="#fb923c" emissive="#f97316" emissiveIntensity={2.9} roughness={0.2} transparent opacity={0.9} depthWrite={false} />
              </mesh>
              {[-0.31, 0.31].map((xSide) => (
                <mesh key={`${item.id}-fireplace-frame-v-${xSide}`} position={[xSide * width, -height * 0.08, frontZ + 0.13]}>
                  <boxGeometry args={[0.032, height * 0.43, 0.045]} />
                  <meshStandardMaterial color={effectMaterialCatalog.blackMetal.color} roughness={0.22} metalness={0.7} />
                </mesh>
              ))}
              {[-0.29, 0.13].map((yOffset) => (
                <mesh key={`${item.id}-fireplace-frame-h-${yOffset}`} position={[0, yOffset * height, frontZ + 0.132]}>
                  <boxGeometry args={[width * 0.68, 0.03, 0.045]} />
                  <meshStandardMaterial color={effectMaterialCatalog.blackMetal.color} roughness={0.22} metalness={0.7} />
                </mesh>
              ))}
              <mesh position={[0, -height * 0.305, frontZ + 0.138]}>
                <boxGeometry args={[width * 0.58, 0.045, 0.06]} />
                <meshStandardMaterial color="#2b211a" emissive="#5f2414" emissiveIntensity={0.34} roughness={0.64} />
              </mesh>
              <mesh position={[0, -height * 0.08, frontZ + 0.238]} renderOrder={5}>
                <boxGeometry args={[width * 0.52, height * 0.34, 0.022]} />
                <meshStandardMaterial color="#f97316" emissive="#fb923c" emissiveIntensity={2.25} roughness={0.24} transparent opacity={0.86} depthWrite={false} />
              </mesh>
              {[-0.21, 0.02, 0.23].map((xOffset, index) => (
                <mesh
                  key={`${item.id}-log-${index}`}
                  position={[xOffset * width, -height * 0.25 + index * 0.012, frontZ + 0.215 + index * 0.004]}
                  rotation={[0, 0, Math.PI / 2 + (index % 2 ? -0.16 : 0.18)]}
                >
                  <cylinderGeometry args={[0.034, 0.04, width * 0.27, 14]} />
                  <meshStandardMaterial color={effectMaterialCatalog.fireplaceEmber.color} roughness={effectMaterialCatalog.fireplaceEmber.roughness} />
                </mesh>
              ))}
              {[-0.21, -0.07, 0.08, 0.22].map((xOffset, index) => (
                <group key={`${item.id}-flame-${index}`} position={[xOffset * width, -height * 0.045 + (index % 2) * 0.034, frontZ + 0.275]} rotation={[0, 0, xOffset * 1.15]}>
                  <mesh>
                    <coneGeometry args={[0.086 + (index % 2) * 0.016, 0.38 + (index % 2) * 0.05, 18]} />
                    <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={3.15} roughness={0.16} />
                  </mesh>
                  <mesh position={[0, 0.025, 0.018]}>
                    <coneGeometry args={[0.048, 0.26, 16]} />
                    <meshStandardMaterial color="#fde68a" emissive="#facc15" emissiveIntensity={3.4} roughness={0.14} />
                  </mesh>
                </group>
              ))}
              {Array.from({ length: 7 }, (_, index) => (
                <mesh key={`${item.id}-ember-${index}`} position={[(-0.31 + index * 0.105) * width, -height * 0.285 + (index % 2) * 0.012, frontZ + 0.2]}>
                  <sphereGeometry args={[0.019, 12, 8]} />
                  <meshStandardMaterial color="#fb923c" emissive="#f97316" emissiveIntensity={1.2} roughness={0.42} />
                </mesh>
              ))}
              <mesh position={[0, height * 0.49, frontZ + 0.12]}>
                <boxGeometry args={[width * 0.56, 0.018, 0.032]} />
                <meshStandardMaterial color={palette.light} emissive={palette.light} emissiveIntensity={0.95} roughness={0.18} />
              </mesh>
            </group>
          )}
          {assetType === "pegboard" && (
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
      {materialPreview && bathFixture && (
        <>
          {assetType === "bathroomVanity" && (
            <group>
              <mesh castShadow receiveShadow position={[0, height / 2 + 0.062, 0]}>
                <boxGeometry args={[width + 0.1, 0.052, depth + 0.08]} />
                <meshStandardMaterial color={masterBathPalette.stoneTop} roughness={0.28} metalness={0.04} />
              </mesh>
              {[-0.24, 0.24].map((xOffset) => (
                <group key={`${item.id}-basin-${xOffset}`} position={[xOffset * width, height / 2 + 0.095, -depth * 0.05]}>
                  <mesh receiveShadow>
                    <cylinderGeometry args={[Math.min(width, depth) * 0.12, Math.min(width, depth) * 0.16, 0.035, 36]} />
                    <meshStandardMaterial color="#f8f4ed" roughness={0.24} metalness={0.02} />
                  </mesh>
                  <mesh position={[0.12, 0.11, -0.04]}>
                    <cylinderGeometry args={[0.016, 0.016, 0.18, 14]} />
                    <meshStandardMaterial color={masterBathPalette.metal} roughness={0.18} metalness={0.68} />
                  </mesh>
                  <mesh position={[0.05, 0.18, -0.04]}>
                    <boxGeometry args={[0.16, 0.018, 0.022]} />
                    <meshStandardMaterial color={masterBathPalette.metal} roughness={0.18} metalness={0.68} />
                  </mesh>
                </group>
              ))}
              <mesh position={[0, Math.min(height * 0.72, 0.56), frontZ + 0.035]}>
                <boxGeometry args={[width * 0.9, Math.min(0.34, height * 0.5), 0.035]} />
                <meshStandardMaterial color="#8c9390" roughness={0.08} metalness={0.18} transparent opacity={0.72} />
              </mesh>
              <mesh position={[0, Math.min(height * 0.96, 0.78), frontZ + 0.058]}>
                <boxGeometry args={[width * 0.92, 0.03, 0.035]} />
                <meshStandardMaterial color={masterBathPalette.light} emissive={masterBathPalette.light} emissiveIntensity={1.05} roughness={0.18} />
              </mesh>
              <mesh position={[0, height * 0.54, frontZ + 0.058]}>
                <boxGeometry args={[width * 0.96, 0.028, 0.03]} />
                <meshStandardMaterial color={masterBathPalette.light} emissive={masterBathPalette.light} emissiveIntensity={0.82} roughness={0.18} />
              </mesh>
            </group>
          )}
          {assetType === "bathtub" && (
            <group>
              <RoundedBoxMesh
                args={[width * 0.88, 0.1, depth * 0.82]}
                position={[0, height / 2 + 0.026, 0]}
                radius={Math.min(width, depth) * 0.18}
                smoothness={8}
                color="#fbf8f1"
                roughness={0.2}
                metalness={0.01}
              />
              <RoundedBoxMesh
                args={[width * 0.66, 0.02, depth * 0.56]}
                position={[0, height / 2 + 0.086, 0]}
                radius={Math.min(width, depth) * 0.14}
                smoothness={8}
                color="#d8f1f7"
                transparent
                opacity={0.62}
                roughness={0.12}
                metalness={0.04}
              />
              {[-1, 1].map((xSide) => (
                <mesh key={`${item.id}-bathtub-rim-${xSide}`} position={[xSide * width * 0.38, height / 2 + 0.096, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.018, 0.018, depth * 0.62, 16]} />
                  <meshStandardMaterial color="#fffaf4" roughness={0.24} metalness={0.01} />
                </mesh>
              ))}
              <mesh position={[width * 0.32, height / 2 + 0.22, -depth * 0.24]}>
                <cylinderGeometry args={[0.018, 0.018, 0.24, 14]} />
                <meshStandardMaterial color={masterBathPalette.metal} roughness={0.2} metalness={0.7} />
              </mesh>
              <mesh position={[width * 0.24, height / 2 + 0.32, -depth * 0.24]}>
                <boxGeometry args={[0.18, 0.02, 0.024]} />
                <meshStandardMaterial color={masterBathPalette.metal} roughness={0.2} metalness={0.7} />
              </mesh>
            </group>
          )}
          {assetType === "shower" && (
            <group>
              <mesh receiveShadow position={[0, -height * 0.47, 0]}>
                <boxGeometry args={[width * 0.92, 0.045, depth * 0.92]} />
                <meshStandardMaterial color={masterBathPalette.floor} roughness={0.72} metalness={0.02} />
              </mesh>
              {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
                <mesh key={`${item.id}-glass-post-${xSide}-${zSide}`} position={[xSide * width * 0.46, 0.05, zSide * depth * 0.46]}>
                  <boxGeometry args={[0.026, height * 0.9, 0.026]} />
                  <meshStandardMaterial color={masterBathPalette.metal} roughness={0.18} metalness={0.72} />
                </mesh>
              )))}
              <mesh position={[0, height * 0.12, frontZ + 0.02]}>
                <boxGeometry args={[width * 0.7, height * 0.78, 0.022]} />
                <meshStandardMaterial color={masterBathPalette.glass} transparent opacity={0.34} roughness={0.04} metalness={0.04} />
              </mesh>
              {[-1, 1].map((xSide) => (
                <mesh key={`${item.id}-side-glass-${xSide}`} position={[xSide * width * 0.47, height * 0.12, 0]} rotation={[0, Math.PI / 2, 0]}>
                  <boxGeometry args={[depth * 0.82, height * 0.74, 0.02]} />
                  <meshStandardMaterial color={masterBathPalette.glass} transparent opacity={0.24} roughness={0.04} metalness={0.04} />
                </mesh>
              ))}
              <mesh position={[-width * 0.26, height * 0.15, -depth * 0.38]}>
                <boxGeometry args={[0.22, 0.16, 0.035]} />
                <meshStandardMaterial color={masterBathPalette.light} emissive={masterBathPalette.light} emissiveIntensity={0.72} roughness={0.2} />
              </mesh>
              <mesh position={[width * 0.24, height * 0.28, -depth * 0.36]}>
                <cylinderGeometry args={[0.11, 0.11, 0.026, 28]} />
                <meshStandardMaterial color={masterBathPalette.metal} roughness={0.18} metalness={0.72} />
              </mesh>
            </group>
          )}
          {assetType === "toilet" && (
            <group>
              <mesh castShadow receiveShadow position={[0, height * 0.12, -depth * 0.1]} scale={[1.12, 0.42, 0.88]}>
                <sphereGeometry args={[Math.min(width, depth) * 0.29, 32, 16]} />
                <meshStandardMaterial color="#fbf8f2" roughness={0.24} metalness={0.01} />
              </mesh>
              <mesh position={[0, height * 0.2, -depth * 0.1]}>
                <cylinderGeometry args={[Math.min(width, depth) * 0.19, Math.min(width, depth) * 0.2, 0.045, 36]} />
                <meshStandardMaterial color="#f4eee6" roughness={0.28} metalness={0.01} />
              </mesh>
              <RoundedBoxMesh args={[width * 0.78, 0.5, 0.1]} position={[0, height * 0.46, -depth * 0.42]} radius={0.04} color="#f7f2ea" roughness={0.32} metalness={0.01} />
            </group>
          )}
        </>
      )}
    </group>
  );
}

type ResolvedFurnitureAssetProps = Omit<FurnitureAssetGroupProps, "resolvedAsset">;

function Bed3DGroup(props: FurnitureAssetGroupProps) {
  if (shouldUseFineAsset(props)) return <Bed3DAsset {...props} />;
  return <FurnitureBlock {...props} />;
}

function Nightstand3DGroup(props: FurnitureAssetGroupProps) {
  if (shouldUseFineAsset(props)) return <Nightstand3DAsset {...props} />;
  return <FurnitureBlock {...props} />;
}

function Wardrobe3DGroup(props: FurnitureAssetGroupProps) {
  if (shouldUseFineAsset(props)) return <Wardrobe3DAsset {...props} />;
  return <FurnitureBlock {...props} />;
}

function WalkInCloset3DGroup(props: FurnitureAssetGroupProps) {
  if (shouldUseFineAsset(props)) return <Wardrobe3DAsset {...props} forceOpen />;
  return <FurnitureBlock {...props} />;
}

function Cabinet3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function Desk3DGroup(props: FurnitureAssetGroupProps) {
  if (shouldUseFineAsset(props)) return <Desk3DAsset {...props} />;
  return <FurnitureBlock {...props} />;
}

function BathroomVanity3DGroup(props: FurnitureAssetGroupProps) {
  if (shouldUseFineAsset(props)) return <BathroomVanity3DAsset {...props} />;
  return <FurnitureBlock {...props} />;
}

function Toilet3DGroup(props: FurnitureAssetGroupProps) {
  if (shouldUseFineAsset(props)) return <Toilet3DAsset {...props} />;
  return <FurnitureBlock {...props} />;
}

function Bathtub3DGroup(props: FurnitureAssetGroupProps) {
  if (shouldUseFineAsset(props)) return <Bathtub3DAsset {...props} />;
  return <FurnitureBlock {...props} />;
}

function Shower3DGroup(props: FurnitureAssetGroupProps) {
  if (shouldUseFineAsset(props)) return <Shower3DAsset {...props} />;
  return <FurnitureBlock {...props} />;
}

function Sofa3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function CoffeeTable3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function DiningTable3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function DiningChair3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function KitchenCabinet3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function Island3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function Sideboard3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function EntryCabinet3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function Fireplace3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function StairAsset3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function Paving3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function YardModule3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function Sink3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function Cooktop3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function Fridge3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function Pegboard3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function Bookshelf3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function SnackCabinet3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function Plant3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

function Generic3DGroup(props: FurnitureAssetGroupProps) {
  return <FurnitureBlock {...props} />;
}

const furnitureAssetComponentMap = {
  bed: Bed3DGroup,
  nightstand: Nightstand3DGroup,
  wardrobe: Wardrobe3DGroup,
  walkInCloset: WalkInCloset3DGroup,
  cabinet: Cabinet3DGroup,
  wallCabinet: Cabinet3DGroup,
  desk: Desk3DGroup,
  bathroomVanity: BathroomVanity3DGroup,
  toilet: Toilet3DGroup,
  bathtub: Bathtub3DGroup,
  shower: Shower3DGroup,
  sofa: Sofa3DGroup,
  coffeeTable: CoffeeTable3DGroup,
  loungeCoffeeTable: CoffeeTable3DGroup,
  diningTable: DiningTable3DGroup,
  slabTable: DiningTable3DGroup,
  diningChair: DiningChair3DGroup,
  kitchenCabinet: KitchenCabinet3DGroup,
  island: Island3DGroup,
  sideboard: Sideboard3DGroup,
  entryCabinet: EntryCabinet3DGroup,
  fireplace: Fireplace3DGroup,
  stair: StairAsset3DGroup,
  paving: Paving3DGroup,
  yardModule: YardModule3DGroup,
  outdoorDiningSet: YardModule3DGroup,
  dryingRack: YardModule3DGroup,
  dogHouse: YardModule3DGroup,
  yardGate: YardModule3DGroup,
  outdoorCabinet: Sideboard3DGroup,
  yardLight: YardModule3DGroup,
  outdoorSocket: YardModule3DGroup,
  drainPoint: YardModule3DGroup,
  sink: Sink3DGroup,
  cooktop: Cooktop3DGroup,
  fridge: Fridge3DGroup,
  pegboard: Pegboard3DGroup,
  bookshelf: Bookshelf3DGroup,
  snackCabinet: SnackCabinet3DGroup,
  plant: Plant3DGroup,
  generic: Generic3DGroup
} satisfies Record<Render3DAssetType, typeof Generic3DGroup>;

function ResolvedFurnitureAsset(props: ResolvedFurnitureAssetProps) {
  const resolvedAsset = resolve3DAsset(props.item);
  if (!resolveVisibility(props.item).visible3d || !resolvedAsset.visibleIn3d) return null;
  const Component = furnitureAssetComponentMap[resolvedAsset.componentKey] ?? Generic3DGroup;
  return <Component {...props} resolvedAsset={resolvedAsset} />;
}

function FurnitureServiceMarkers({
  item,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  item: Furniture;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (item: Furniture) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const markers = getFurnitureServiceMarkers(item);
  if (!markers.length) return null;

  const position = getFurnitureScenePosition(item, structure);
  const width = Math.max(0.12, item.dimensions.width / 100);
  const depth = Math.max(0.08, item.dimensions.depth / 100);
  const baseRotation = -(item.position.rotation || 0) * Math.PI / 180;
  const radius = Math.max(0.34, Math.min(1.22, Math.max(width, depth) * 0.42 + 0.18));

  return (
    <group
      position={[position.x, 0.092, position.z]}
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
      {markers.map((service) => {
        const angle = baseRotation + service.angle;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const ringRadius = selected ? 0.105 : 0.086;
        return (
          <group key={`${item.id}-service-${service.key}`} position={[x, 0, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={30}>
              <torusGeometry args={[ringRadius, 0.01, 10, 32]} />
              <meshStandardMaterial color={selected ? "#2563eb" : service.color} emissive={service.emissive} emissiveIntensity={0.24} roughness={0.34} transparent opacity={0.92} depthTest={false} />
            </mesh>
            <mesh position={[0, 0.014, 0]} renderOrder={31}>
              <cylinderGeometry args={[0.052, 0.052, 0.018, 24]} />
              <meshStandardMaterial color={selected ? "#bfdbfe" : service.color} emissive={service.emissive} emissiveIntensity={0.18} roughness={0.28} metalness={0.12} depthTest={false} />
            </mesh>
            <mesh position={[0, 0.068, 0]} renderOrder={32}>
              <cylinderGeometry args={[0.012, 0.012, 0.09, 10]} />
              <meshStandardMaterial color={selected ? "#2563eb" : service.color} roughness={0.3} metalness={0.22} depthTest={false} />
            </mesh>
            <mesh position={[0, 0.125, 0]} renderOrder={33}>
              <sphereGeometry args={[0.038, 16, 12]} />
              <meshStandardMaterial color={selected ? "#2563eb" : service.color} emissive={service.emissive} emissiveIntensity={0.34} roughness={0.3} depthTest={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function RenderToneMapping({ presentationMode }: { presentationMode: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = presentationMode ? 1.22 : 1.14;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl, presentationMode]);
  return null;
}

function CameraRig({ preset, fixedView, requestVersion, mode }: { preset: CameraPreset; fixedView: FixedCameraView | null; requestVersion: number; mode: CameraMode }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const walkInitializedRef = useRef(false);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const moveVectorRef = useRef(new THREE.Vector3());
  const forwardVectorRef = useRef(new THREE.Vector3());
  const rightVectorRef = useRef(new THREE.Vector3());
  const transitionRef = useRef<{
    elapsed: number;
    duration: number;
    startPosition: THREE.Vector3;
    endPosition: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    startZoom: number;
    endZoom: number;
  } | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.panSpeed = 0.55;
    controls.rotateSpeed = 0.56;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 0.75;
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
    const controls = controlsRef.current;
    const target = fixedView
      ? new THREE.Vector3(fixedView.target.x, fixedView.target.y, fixedView.target.z)
      : cameraTargets[preset].clone();
    const position = fixedView
      ? new THREE.Vector3(fixedView.cameraPosition.x, fixedView.cameraPosition.y, fixedView.cameraPosition.z)
      : new THREE.Vector3(...cameraPositions[preset]);
    transitionRef.current = {
      elapsed: 0,
      duration: 0.9,
      startPosition: camera.position.clone(),
      endPosition: position,
      startTarget: controls?.target.clone() ?? CAMERA_TARGET.clone(),
      endTarget: target,
      startZoom: camera.zoom,
      endZoom: fixedView?.zoom ?? 1
    };
    // The Canvas camera type is chosen by viewport. Orthographic fixed views use a locked-rotation,
    // zoomed axonometric fallback when the active Canvas is perspective.
    if (controls) {
      controls.enableRotate = fixedView?.mode !== "orthographic";
      controls.enablePan = true;
    }
    walkInitializedRef.current = false;
  }, [camera, fixedView, preset, requestVersion]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.enabled = true;
    pressedKeysRef.current.clear();
    if (mode === "walkthrough" && !walkInitializedRef.current) {
      const stop = walkthroughStops[0];
      camera.position.copy(stop.position);
      controls.target.copy(stop.target);
      camera.lookAt(stop.target);
      controls.minDistance = 0.35;
      controls.maxDistance = 7.2;
      controls.maxPolarAngle = Math.PI / 1.86;
      controls.update();
      walkInitializedRef.current = true;
      return;
    }
    if (mode === "orbit") {
      controls.enableRotate = fixedView?.mode !== "orthographic";
      controls.minDistance = 0.75;
      controls.maxDistance = 18;
      controls.maxPolarAngle = Math.PI / 2.08;
      walkInitializedRef.current = false;
      controls.update();
    }
  }, [camera, fixedView?.mode, mode]);

  useEffect(() => {
    if (mode !== "walkthrough") return;
    const handledKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyQ", "KeyE"]);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!handledKeys.has(event.code)) return;
      event.preventDefault();
      pressedKeysRef.current.add(event.code);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!handledKeys.has(event.code)) return;
      event.preventDefault();
      pressedKeysRef.current.delete(event.code);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      pressedKeysRef.current.clear();
    };
  }, [mode]);

  useFrame((_, delta) => {
    const transition = transitionRef.current;
    if (transition && mode === "orbit") {
      transition.elapsed = Math.min(transition.duration, transition.elapsed + delta);
      const rawProgress = transition.elapsed / transition.duration;
      const progress = rawProgress * rawProgress * (3 - 2 * rawProgress);
      camera.position.lerpVectors(transition.startPosition, transition.endPosition, progress);
      const currentTarget = transition.startTarget.clone().lerp(transition.endTarget, progress);
      camera.zoom = THREE.MathUtils.lerp(transition.startZoom, transition.endZoom, progress);
      controlsRef.current?.target.copy(currentTarget);
      camera.lookAt(currentTarget);
      camera.updateProjectionMatrix();
      controlsRef.current?.update();
      if (rawProgress >= 1) transitionRef.current = null;
      return;
    }
    if (mode === "walkthrough") {
      const controls = controlsRef.current;
      const keys = pressedKeysRef.current;
      const move = moveVectorRef.current.set(0, 0, 0);
      camera.getWorldDirection(forwardVectorRef.current);
      forwardVectorRef.current.y = 0;
      if (forwardVectorRef.current.lengthSq() > 0.0001) forwardVectorRef.current.normalize();
      rightVectorRef.current.crossVectors(forwardVectorRef.current, new THREE.Vector3(0, 1, 0)).normalize();
      if (keys.has("KeyW") || keys.has("ArrowUp")) move.add(forwardVectorRef.current);
      if (keys.has("KeyS") || keys.has("ArrowDown")) move.sub(forwardVectorRef.current);
      if (keys.has("KeyD") || keys.has("ArrowRight")) move.add(rightVectorRef.current);
      if (keys.has("KeyA") || keys.has("ArrowLeft")) move.sub(rightVectorRef.current);
      if (keys.has("KeyE")) move.y += 1;
      if (keys.has("KeyQ")) move.y -= 1;
      if (move.lengthSq() > 0.0001) {
        move.normalize().multiplyScalar(delta * 2.4);
        camera.position.add(move);
        controls?.target.add(move);
        camera.position.y = Math.min(2.25, Math.max(0.85, camera.position.y));
        if (controls) controls.target.y = Math.min(1.65, Math.max(0.35, controls.target.y));
      }
      controls?.update();
      return;
    }
    controlsRef.current?.update();
  });

  return null;
}

function Floor3DScene({
  cameraPreset,
  fixedCameraView,
  cameraRequestVersion,
  cameraMode,
  materialPreview,
  designStyle,
  presentationMode,
  mobileQuality,
  showServicePoints,
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
  fixedCameraView: FixedCameraView | null;
  cameraRequestVersion: number;
  cameraMode: CameraMode;
  materialPreview: boolean;
  designStyle: DesignStylePreset;
  presentationMode: boolean;
  mobileQuality: MobileQuality;
  showServicePoints: boolean;
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
  const ambientIntensity = presentationMode ? 0.56 : 0.48;
  const keyLightIntensity = presentationMode ? 1.92 : 1.68;
  const fillLightIntensity = presentationMode ? 0.72 : 0.54;
  const floorShadowOpacity = presentationMode ? 0.18 : 0.12;
  const balancedQuality = mobileQuality === "balanced";
  const shadowMapSize = balancedQuality ? 1024 : presentationMode ? 4096 : 2048;
  return (
    <>
      <RenderToneMapping presentationMode={presentationMode} />
      <CameraRig preset={cameraPreset} fixedView={fixedCameraView} requestVersion={cameraRequestVersion} mode={cameraMode} />
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, 12, 28]} />
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        castShadow
        color="#fff1c7"
        position={[6.8, 9.2, 7.4]}
        intensity={keyLightIntensity}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <spotLight color="#ffd99b" intensity={fillLightIntensity} position={[-5.8, 4.8, 5.6]} angle={0.62} penumbra={0.76} distance={14} castShadow={!balancedQuality} />
      <hemisphereLight args={["#fff4d6", palette.background, presentationMode ? 0.56 : 0.48]} />

      <mesh receiveShadow position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 14]} />
        <shadowMaterial color="#8b8071" transparent opacity={floorShadowOpacity} />
      </mesh>

      <mesh receiveShadow position={[0, -0.012, 0]}>
        <boxGeometry args={[size.width * MM_TO_M + 0.5, 0.02, size.height * MM_TO_M + 0.5]} />
        <meshStandardMaterial color="#d9d1c2" roughness={0.88} />
      </mesh>

      {houseStructure.outdoors.map((outdoor) => (
        <OutdoorGroundMesh
          key={outdoor.id}
          outdoor={outdoor}
          structure={houseStructure}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}
      {houseStructure.outdoorSurfaces.map((surface) => (
        <OutdoorSurfaceMesh
          key={surface.id}
          surface={surface}
          structure={houseStructure}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.rooms.map((room, index) => (
        <RoomFloorMesh key={room.id} room={room} index={index} structure={houseStructure} designStyle={designStyle} />
      ))}
      {houseStructure.rooms.map((room) => (
        <RoomFloorFinishOverlay key={`${room.id}-floor-finish`} room={room} structure={houseStructure} designStyle={designStyle} />
      ))}
      {houseStructure.rooms.map((room) => (
        <RoomAmbientOcclusion key={`${room.id}-ambient-occlusion`} room={room} structure={houseStructure} />
      ))}
      <RoomLightingPlaceholders structure={houseStructure} designStyle={designStyle} />

      {houseStructure.walls.map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          structure={houseStructure}
          wallColor={isBathroomWall(wall, houseStructure) ? masterBathPalette.wall : palette.wall}
          selected={selectedObjectId === wall.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.fences.map((fence) => (
        <FenceMesh
          key={fence.id}
          fence={fence}
          structure={houseStructure}
          selected={selectedObjectId === fence.id}
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

      {(houseStructure.columns ?? []).map((column) => (
        <ColumnMesh
          key={column.id}
          column={column}
          structure={houseStructure}
          selected={selectedObjectId === column.id}
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

      {houseStructure.floorId !== "B2" && getStairLandingConnections(houseStructure.stairs).map((connection) => (
        <StairLandingMesh
          key={connection.id}
          connection={connection}
          structure={houseStructure}
          selected={selectedObjectId === connection.fromId || selectedObjectId === connection.toId}
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
          materialPreview={materialPreview}
          selected={selectedObjectId === stair.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {furniture.filter((item) => resolve3DAsset(item).visibleIn3d).map((item) => (
        <FurnitureContactShadow key={`${item.id}-contact-shadow`} item={item} structure={houseStructure} />
      ))}

      {furniture.map((item) => (
        <ResolvedFurnitureAsset
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

      {showServicePoints && furniture.filter((item) => resolve3DAsset(item).visibleIn3d).map((item) => (
        <FurnitureServiceMarkers
          key={`${item.id}-service-markers`}
          item={item}
          structure={houseStructure}
          selected={selectedFurnitureId === item.id || selectedObjectId === item.id}
          onSelect={onSelectFurniture}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {!materialPreview && <gridHelper args={[14, 14, palette.floorJoint, palette.grid]} position={[0, 0.006, 0]} />}
    </>
  );
}

export function Floor3DView({
  floor,
  houseStructure,
  furniture,
  cameraViews = [],
  cameraViewRequest = null,
  mobilePresentationMode = false,
  mobileQuality = "balanced",
  resetViewRequest = 0,
  selectedObjectId,
  selectedFurnitureId,
  showObjectIds,
  onShowObjectIdsChange,
  onSelectStructure,
  onSelectFurniture,
  onHoverObject,
  onClearHoverObject,
  onSelectCameraView
}: Floor3DViewProps) {
  const [cameraRequest, setCameraRequest] = useState<{ preset: CameraPreset; fixedView: FixedCameraView | null; version: number }>(() => ({
    preset: "overview",
    fixedView: mobilePresentationMode ? getMobileDefaultCameraView(floor, houseStructure) : null,
    version: 0
  }));
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const [materialPreview, setMaterialPreview] = useState(true);
  const [showServicePoints, setShowServicePoints] = useState(false);
  const [designStyle, setDesignStyle] = useState<DesignStylePreset>("warmJapandi");
  const [presentationMode, setPresentationMode] = useState(mobilePresentationMode);
  const selectedFurniture = furniture.find((item) => item.id === selectedFurnitureId || item.id === selectedObjectId);
  const selectedStructure =
    houseStructure.walls.find((item) => item.id === selectedObjectId) ??
    houseStructure.partitions.find((item) => item.id === selectedObjectId) ??
    houseStructure.stairs.find((item) => item.id === selectedObjectId) ??
    (houseStructure.columns ?? []).find((item) => item.id === selectedObjectId) ??
    houseStructure.doors.find((item) => item.id === selectedObjectId) ??
    houseStructure.windows.find((item) => item.id === selectedObjectId) ??
    houseStructure.bayWindows.find((item) => item.id === selectedObjectId) ??
    null;
  const selectedName = selectedFurniture?.name ?? selectedStructure?.name ?? selectedObjectId;
  const servicePointCount = useMemo(() => countServiceMarkers(furniture), [furniture]);
  const currentFloorCameraViews = useMemo(() => cameraViews.filter((view) => view.floor === floor.id), [cameraViews, floor.id]);
  const resetMobileCamera = () => {
    setCameraMode("orbit");
    setMaterialPreview(true);
    setShowServicePoints(false);
    setPresentationMode(true);
    setCameraRequest((current) => ({
      preset: "overview",
      fixedView: getMobileDefaultCameraView(floor, houseStructure),
      version: current.version + 1
    }));
  };
  useEffect(() => {
    if (!mobilePresentationMode) return;
    resetMobileCamera();
  }, [floor.id, mobilePresentationMode, resetViewRequest]);
  useEffect(() => {
    const requestedView = cameraViewRequest?.view;
    if (!requestedView || requestedView.floor !== floor.id) return;
    setCameraMode("orbit");
    setCameraRequest((current) => ({ preset: current.preset, fixedView: requestedView, version: current.version + 1 }));
  }, [cameraViewRequest?.nonce, cameraViewRequest?.view, floor.id]);
  const requestCameraPreset = (preset: CameraPreset) => {
    setCameraMode("orbit");
    setCameraRequest((current) => ({ preset, fixedView: null, version: current.version + 1 }));
  };
  const rotateCameraPreset = (direction: -1 | 1) => {
    setCameraMode("orbit");
    setCameraRequest((current) => {
      const currentIndex = cameraRotationOrder.indexOf(current.preset);
      const fallbackIndex = direction > 0 ? -1 : 0;
      const nextIndex = ((currentIndex >= 0 ? currentIndex : fallbackIndex) + direction + cameraRotationOrder.length) % cameraRotationOrder.length;
      return { preset: cameraRotationOrder[nextIndex], fixedView: null, version: current.version + 1 };
    });
  };
  const togglePresentationMode = () => {
    setPresentationMode((enabled) => {
      const nextEnabled = !enabled;
      if (nextEnabled) {
        setMaterialPreview(true);
        setShowServicePoints(false);
        setCameraMode("orbit");
        setCameraRequest((current) => ({ preset: "overview", fixedView: null, version: current.version + 1 }));
      }
      return nextEnabled;
    });
  };

  return (
    <div
      className={`relative h-full overflow-hidden bg-[#ede7da] transition ${mobilePresentationMode ? "min-h-0 rounded-none border-0 shadow-none" : `min-h-[560px] rounded-[1.75rem] border ${presentationMode ? "border-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.48),0_22px_90px_rgba(84,69,50,0.18)]" : "border-white/70 shadow-inner"}`}`}
      onDoubleClick={() => {
        if (mobilePresentationMode) resetMobileCamera();
      }}
    >
      <Canvas
        key={floor.id}
        shadows
        orthographic={mobilePresentationMode}
        camera={mobilePresentationMode ? { near: 0.1, far: 80, zoom: getMobileDefaultCameraView(floor, houseStructure).zoom } : { fov: 42, near: 0.1, far: 80 }}
        gl={{ antialias: mobileQuality === "high", preserveDrawingBuffer: true, powerPreference: mobileQuality === "balanced" ? "low-power" : "high-performance" }}
      >
        <Floor3DScene
          cameraPreset={cameraRequest.preset}
          fixedCameraView={cameraRequest.fixedView}
          cameraRequestVersion={cameraRequest.version}
          cameraMode={cameraMode}
          materialPreview={materialPreview}
          designStyle={designStyle}
          presentationMode={presentationMode}
          mobileQuality={mobileQuality}
          showServicePoints={showServicePoints}
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

      {presentationMode && !mobilePresentationMode && (
        <div className="pointer-events-none absolute inset-0 z-[50] bg-[radial-gradient(circle_at_50%_48%,rgba(255,255,255,0)_42%,rgba(132,102,64,0.12)_100%)]" />
      )}

      {!presentationMode && !mobilePresentationMode && <div className="pointer-events-none absolute left-4 top-4 z-[80]">
        <div className="pointer-events-auto rounded-lg border border-white/80 bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">{floor.id} Render Model</div>
          <div className="mt-1 text-lg font-black text-stone-900">{floor.label} · {floor.subtitle}</div>
          <div className="mt-1 text-xs font-semibold text-stone-500">效果轴测 / 家具材质 / 水电点位都基于当前楼层模型</div>
        </div>
      </div>}
      <div className={`${mobilePresentationMode ? "hidden" : "pointer-events-none"} absolute right-4 top-4 z-[90] flex max-w-[calc(100%-2rem)] justify-end`}>
        <div className={`pointer-events-auto flex flex-wrap items-center justify-end gap-2 rounded-lg border border-white/80 bg-white/88 p-2 shadow-sm backdrop-blur ${presentationMode ? "bg-white/68" : ""}`}>
          {presentationMode ? (
            <button
              aria-pressed={presentationMode}
              className="rounded-md bg-stone-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-stone-700"
              onClick={togglePresentationMode}
              type="button"
            >
              退出干净轴测
            </button>
          ) : (
            <>
          <button
            aria-label="逆时针旋转视图"
            className="grid size-8 place-items-center rounded-md text-base font-black text-stone-600 transition hover:bg-stone-100"
            onClick={() => rotateCameraPreset(-1)}
            title="逆时针旋转视图"
            type="button"
          >
            ↺
          </button>
          {currentFloorCameraViews.length > 0 && (
            <select
              aria-label="当前楼层固定视角"
              className="h-8 max-w-40 rounded-md border border-stone-200 bg-white px-2 text-xs font-bold text-stone-700 outline-none"
              value={cameraRequest.fixedView?.floor === floor.id ? cameraRequest.fixedView.id : ""}
              onChange={(event) => {
                const view = currentFloorCameraViews.find((item) => item.id === event.target.value);
                if (view) onSelectCameraView?.(view);
              }}
            >
              <option value="">当前楼层视角</option>
              {currentFloorCameraViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
            </select>
          )}
          {cameraViews.length > 0 && (
            <select
              aria-label="全部关键视角"
              className="h-8 max-w-44 rounded-md border border-stone-200 bg-white px-2 text-xs font-bold text-stone-700 outline-none"
              value={cameraRequest.fixedView?.id ?? ""}
              onChange={(event) => {
                const view = cameraViews.find((item) => item.id === event.target.value);
                if (view) onSelectCameraView?.(view);
              }}
            >
              <option value="">全部关键视角</option>
              {cameraViews.map((view) => <option key={view.id} value={view.id}>{view.floor} · {view.name}</option>)}
            </select>
          )}
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
            {materialPreview ? "效果" : "白模"}
          </button>
          <button
            aria-pressed={presentationMode}
            className="rounded-md px-3 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-100"
            onClick={togglePresentationMode}
            type="button"
          >
            干净轴测
          </button>
          <button
            aria-pressed={showServicePoints}
            className={`rounded-md px-3 py-2 text-xs font-bold transition ${showServicePoints ? "bg-sky-700 text-white" : "text-stone-600 hover:bg-stone-100"}`}
            onClick={() => setShowServicePoints((visible) => !visible)}
            type="button"
          >
            水电点
          </button>
          <button
            aria-pressed={cameraMode === "walkthrough"}
            className={`rounded-md px-3 py-2 text-xs font-bold transition ${cameraMode === "walkthrough" ? "bg-emerald-700 text-white" : "text-stone-600 hover:bg-stone-100"}`}
            onClick={() => setCameraMode((mode) => mode === "walkthrough" ? "orbit" : "walkthrough")}
            type="button"
          >
            {cameraMode === "walkthrough" ? "退出漫游" : "自由漫游"}
          </button>
          <div className="flex flex-wrap gap-1">
            {cameraViewOptions.map(([preset, label]) => (
              <button
                key={preset}
                className={`rounded-md px-3 py-2 text-xs font-bold transition ${!cameraRequest.fixedView && cameraRequest.preset === preset ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
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
            </>
          )}
        </div>
      </div>

      {!presentationMode && (cameraRequest.fixedView || cameraRequest.preset !== "stair") && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-[70] max-w-[18rem] rounded-lg border border-white/75 bg-white/78 p-3 text-xs leading-5 text-stone-600 shadow-sm backdrop-blur">
          <div className="font-black text-stone-900">{materialPreview ? `${floor.label} 效果轴测` : `${floor.label} 白模检查`}</div>
          {cameraRequest.fixedView && (
            <div className="mt-1 font-semibold text-stone-700">
              {cameraRequest.fixedView.name} · {cameraRequest.fixedView.mode === "orthographic" ? "正交轴测" : "透视视角"}
              {cameraRequest.fixedView.description ? `：${cameraRequest.fixedView.description}` : ""}
            </div>
          )}
          <div className="mt-1">
            {cameraMode === "walkthrough"
              ? "自由漫游中：W/A/S/D 或方向键前后左右移动，Q/E 升降，鼠标拖拽调整视角；退出后回到鸟瞰旋转模式。"
              : materialPreview
                ? `${designStylePalettes[designStyle].label}方案：墙体、地面、门窗、灯光和家具材质化表达。`
                : "白模只用于确认空间比例、通道和家具体量；切回效果后继续看材质、灯光和水电点。"}
          </div>
          {materialPreview && (
            <div className="mt-2 text-[10px] font-semibold leading-4 text-stone-500">
              材质基准：{materialLegendText}
            </div>
          )}
          {showServicePoints && servicePointCount > 0 && (
            <div className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900">
              <div>当前显示 {servicePointCount} 个水电/排烟提示点，点位会随家具模块移动。</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {serviceMarkerOptions.map((service) => (
                  <span key={service.key} className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: service.color }} />
                    {service.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {showObjectIds && (
            <div className="mt-3 rounded-md bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600">
              {selectedObjectId ? `当前选中：${selectedObjectId}${selectedName ? ` · ${selectedName}` : ""}` : "点选墙体、楼梯、门窗或家具后，这里显示对象信息。"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
