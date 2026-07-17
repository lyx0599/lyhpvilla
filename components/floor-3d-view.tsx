"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, PointerEvent as ReactPointerEvent, ReactNode, SetStateAction } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { FurnitureFamily3D } from "@/components/furniture-family-3d";
import { ConstructionAnchorLayer } from "@/components/furniture-3d/construction-anchor-layer";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { resolve3DAsset, resolveRender3DMaterials } from "@/lib/render3d-assets";
import { getFurnitureFamily } from "@/lib/furniture-variants";
import { pointInPolygon } from "@/lib/furniture-placement";
import { tourNodeToCameraView } from "@/lib/room-tour";
import { buildFloorCameraViews, splitFloorCameraViews } from "@/lib/floor-camera-views";
import type { FloorCameraView } from "@/lib/floor-camera-views";
import { drawingSheetTypeLabels } from "@/lib/drawing-sheets";
import { getConstructionAnchorsForSheet } from "@/lib/construction-anchors";
import {
  drawing3DViewPresetLabels,
  drawing3DViewPresets,
  getDrawing3DPresentationProfile
} from "@/lib/drawing-3d-profiles";
import { normalizeObjectForSync, resolveVisibility, toSceneObject } from "@/lib/object-sync-adapter";
import { getWallRenderPolicy, resolveStructureStoryHeightMm, WALL_CUT_RATIO } from "@/lib/scene-height-system";
import {
  filterSceneDrawingItems,
  filterSceneFurniture,
  resolveUnifiedSceneDetailLevel,
  resolveUnifiedSceneVisibility,
  type UnifiedSceneLod
} from "@/lib/unified-scene-graph";
import {
  findExplorationStairTransition,
  findNearestExplorationCabinet,
  findNearestExplorationDoor,
  findNearestSafeExplorationPosition,
  getConnectedStairArrival,
  getExplorationGroundHeight,
  isExplorationPositionSafe,
  resolveExplorationMovement,
  type ExplorationCabinetStates,
  type ExplorationCollisionWorld,
  type ExplorationDoorStates,
  type ExplorationLightingMode,
  type ExplorationPoint,
  type ExplorationViewMode
} from "@/lib/exploration-mode";
import {
  buildStairRenderSystemGeometry,
  formatStairRenderDebug,
  getStairRenderContinuity,
  type StairRenderSystemGeometry
} from "@/lib/stair-render-geometry";
import {
  getDoor3DDisplayHeight,
  getHostedOpeningCuts,
  getOpeningSillHeight,
  getStraightHostPanels,
  getWindow3DDisplayMetrics
} from "@/lib/structure-3d-geometry";
import type { Resolved3DAsset, ResolvedRender3DMaterialLayer, ResolvedRender3DMaterials } from "@/lib/render3d-assets";
import type {
  Floor,
  DrawingItem,
  DrawingSheetType,
  FixedCameraView,
  Furniture,
  HouseBayWindow,
  HouseColumn,
  HouseDoor,
  HouseFence,
  HouseOutdoor,
  HouseOutdoorSurface,
  HousePartition,
  HouseSkylight,
  HouseStair,
  HouseStructure,
  HouseWall,
  HouseWindow,
  MobileQuality,
  ModuleServiceRequirements,
  MmPoint,
  Render3DAssetType,
  RoomTourView,
  StairLanding,
  StairOpening,
  StairSystem
} from "@/types/space";
import type { Drawing3DViewPreset, Drawing3DWallMode } from "@/lib/drawing-3d-profiles";
import type { LightingDesign } from "@/types/workspace";

type Floor3DViewProps = {
  floor: Floor;
  houseStructure: HouseStructure;
  houseStructuresByFloor?: Partial<Record<Floor["id"], HouseStructure>>;
  stairSystems?: StairSystem[];
  stairLandings?: StairLanding[];
  stairOpenings?: StairOpening[];
  furniture: Furniture[];
  allFurniture?: Furniture[];
  drawingItems: DrawingItem[];
  allDrawingItems?: DrawingItem[];
  drawingSheetType: DrawingSheetType;
  selectedObjectId: string;
  selectedFurnitureId: string;
  showObjectIds: boolean;
  showDebugTools?: boolean;
  onShowObjectIdsChange: (visible: boolean) => void;
  onSelectStructure: (objectId: string) => void;
  onSelectFurniture: (furniture: Furniture) => void;
  onSelectDrawingItem: (drawingItemId: string) => void;
  onSelectFloor?: (floorId: Floor["id"]) => void;
  onHoverObject: (objectId: string) => void;
  onClearHoverObject: (objectId: string) => void;
  cameraViews?: FixedCameraView[];
  roomTourViews?: RoomTourView[];
  lightingDesign?: LightingDesign;
  cameraViewFloorIds?: Floor["id"][];
  cameraViewRequest?: { view: FixedCameraView; nonce: number } | null;
  mobilePresentationMode?: boolean;
  externalPresentationMode?: boolean;
  mobileQuality?: MobileQuality;
  resetViewRequest?: number;
  onSelectCameraView?: (view: FixedCameraView) => void;
  onSceneSettingsChange?: (settings: Shared3DSceneSettings) => void;
};

type ScenePoint = {
  x: number;
  z: number;
};

type CameraPlanPose = {
  cameraX: number;
  cameraZ: number;
  targetX: number;
  targetZ: number;
};

type CameraPlanNavigationRequest = {
  targetX: number;
  targetZ: number;
  version: number;
};

type RoomMovementBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  blockers: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
};

type HostSegment = {
  start: MmPoint;
  end: MmPoint;
  thickness: number;
  height: number;
};

type CameraPreset = "overview" | "front" | "right" | "back" | "left" | "living" | "kitchen" | "stair" | "fireplace";
type CameraMode = "orbit" | "walkthrough" | "tour";
export type DesignStylePreset = "naturalWood" | "softCream" | "modernStone" | "warmJapandi";
export type FurnitureHeightMode = "actual" | "cutaway";
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
const WALL_PREVIEW_OPACITY = 0.94;
const WALL_SELECTED_OPACITY = 0.78;
const WALL_CAP_HEIGHT_MM = 86;
const WALL_CAP_COLOR = "#2f3538";
const WALL_CAP_SELECTED_COLOR = "#1d4ed8";
const RAILING_SELECTED_COLOR = "#2563eb";
const DEFAULT_CEILING_HEIGHT_MM = 2800;
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
  fireplace: [1.15, 2.05, 0.35]
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

type ProceduralTextureKind = "wood" | "stone" | "fabric" | "wall" | "microcement";
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
  side = THREE.FrontSide,
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
  side?: THREE.Side;
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
        side={side}
      />
    </mesh>
  );
}

function shouldUseFineAsset({ materialPreview, resolvedAsset, cabinetOpenAmount }: FurnitureAssetGroupProps) {
  return cabinetOpenAmount !== undefined || (materialPreview && resolvedAsset.detailLevel !== "draft");
}

function isClosetFurnitureModule(item: Furniture, structure: HouseStructure) {
  const room = structure.rooms.find((candidate) => candidate.id === item.roomId);
  return Boolean(room && isClosetRoom(room)) || item.name.includes("衣帽间");
}

function useFineAssetMetrics({ item, structure, designStyle, resolvedAsset, heightMode }: FurnitureAssetGroupProps) {
  const position = getFurnitureScenePosition(item, structure);
  const width = Math.max(0.12, item.dimensions.width / 100);
  const depth = Math.max(0.08, item.dimensions.depth / 100);
  const height = getFurnitureActualHeight(item);
  const rotation = -(item.position.rotation || 0) * Math.PI / 180;
  const groupY = getFurnitureActualElevation(item) + height / 2 + 0.035;
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

  if (kind === "microcement") {
    // Low-contrast clouds, fine aggregate and long trowel marks keep the finish
    // recognisable as hand-trowelled microcement instead of a flat colour block.
    for (let index = 0; index < 22; index += 1) {
      const x = (index * 47) % canvas.width - 38;
      const y = (index * 71) % canvas.height - 26;
      ctx.fillStyle = index % 2 ? "rgba(255,255,255,0.075)" : "rgba(70,63,56,0.055)";
      ctx.beginPath();
      ctx.ellipse(x, y, 54 + (index % 4) * 13, 20 + (index % 3) * 9, (index % 5) * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let index = 0; index < 14; index += 1) {
      ctx.strokeStyle = index % 3 ? "rgba(255,255,255,0.09)" : "rgba(72,65,58,0.07)";
      ctx.lineWidth = index % 4 === 0 ? 2.2 : 0.8;
      ctx.beginPath();
      const y = 12 + index * 19;
      ctx.moveTo(-12, y);
      for (let x = 0; x <= canvas.width + 12; x += 28) ctx.lineTo(x, y + Math.sin((x + index * 27) * 0.045) * 3);
      ctx.stroke();
    }
    for (let index = 0; index < 190; index += 1) {
      ctx.fillStyle = index % 2 ? "rgba(255,255,255,0.08)" : "rgba(72,65,58,0.055)";
      ctx.fillRect((index * 37) % canvas.width, (index * 83) % canvas.height, 1, 1);
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

function getRoomFloorStyle(room: HouseStructure["rooms"][number], structure: HouseStructure, designStyle: DesignStylePreset) {
  const palette = designStylePalettes[designStyle];
  const isBasement = structure.floorId === "B1" || structure.floorId === "B2";
  if (isBasement) {
    const isWetArea = isBathroomRoom(room);
    return {
      base: isWetArea ? "#9f978d" : structure.floorId === "B2" ? "#b8afa4" : "#c5bcb1",
      joint: isWetArea ? "#756d65" : "#a79e94",
      vein: isWetArea ? "#d2c9bd" : "#e2d9ce",
      roughness: isWetArea ? 0.88 : 0.82,
      kind: "microcement" as const
    };
  }
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

function getArcWallPoints(wall: Extract<HouseWall, { kind: "arc" }>, steps = 20) {
  const startAngle = wall.startAngle * Math.PI / 180;
  const endAngle = wall.endAngle * Math.PI / 180;
  let sweep = endAngle - startAngle;
  // Floor-plan coordinates follow the SVG/screen convention: y grows downward,
  // so clockwise arcs advance in the positive angle direction.
  if (wall.direction === "clockwise" && sweep < 0) sweep += Math.PI * 2;
  if (wall.direction === "counterclockwise" && sweep > 0) sweep -= Math.PI * 2;
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

function getFurnitureActualHeight(item: Furniture) {
  const height = item.dimensions.height / 100;
  if (isRugLike(item)) return 0.024;
  return Math.max(0.024, height);
}

function getFurnitureActualElevation(item: Furniture) {
  return Math.max(0, (item.render3d?.elevationMm ?? 0) * MM_TO_M);
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

function RoomFloorMesh({
  room,
  index,
  structure,
  designStyle,
  openings = []
}: {
  room: HouseStructure["rooms"][number];
  index: number;
  structure: HouseStructure;
  designStyle: DesignStylePreset;
  openings?: StairOpening[];
}) {
  const key = `${room.boundary.map((point) => `${point.x},${point.y}`).join(" ")}|${openings.map((opening) => opening.polygon.map((point) => `${point.x},${point.y}`).join(" ")).join("|")}`;
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    room.boundary.forEach((point, pointIndex) => {
      const nextPoint = toShapePoint(point, structure);
      if (pointIndex === 0) shape.moveTo(nextPoint.x, nextPoint.y);
      else shape.lineTo(nextPoint.x, nextPoint.y);
    });
    shape.closePath();
    openings.forEach((opening) => {
      const hole = new THREE.Path();
      opening.polygon.forEach((point, pointIndex) => {
        const nextPoint = toShapePoint(point, structure);
        if (pointIndex === 0) hole.moveTo(nextPoint.x, nextPoint.y);
        else hole.lineTo(nextPoint.x, nextPoint.y);
      });
      hole.closePath();
      shape.holes.push(hole);
    });
    return new THREE.ShapeGeometry(shape);
  }, [key, openings, structure]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const floorStyle = getRoomFloorStyle(room, structure, designStyle);
  const floorTexture = useProceduralTexture(
    floorStyle.kind === "wood" ? "wood" : floorStyle.kind === "microcement" ? "microcement" : "stone",
    floorStyle.base,
    floorStyle.joint,
    floorStyle.kind === "wood" ? 4.8 : floorStyle.kind === "microcement" ? 2.2 : 3.2,
    floorStyle.kind === "wood" ? 1.5 : floorStyle.kind === "microcement" ? 2.2 : 3.2
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
  const floorStyle = getRoomFloorStyle(room, structure, designStyle);
  const isWood = floorStyle.kind === "wood";
  if (floorStyle.kind === "microcement") return null;
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

function getFurnitureSceneBlocker(item: Furniture, structure: HouseStructure, padding = 0.14) {
  const center = getFurnitureScenePosition(item, structure);
  const rotation = Math.abs((item.position.rotation || 0) * Math.PI / 180);
  const width = Math.max(0.08, item.dimensions.width / 100);
  const depth = Math.max(0.08, item.dimensions.depth / 100);
  const halfX = (Math.abs(Math.cos(rotation)) * width + Math.abs(Math.sin(rotation)) * depth) / 2 + padding;
  const halfZ = (Math.abs(Math.sin(rotation)) * width + Math.abs(Math.cos(rotation)) * depth) / 2 + padding;
  return { minX: center.x - halfX, maxX: center.x + halfX, minZ: center.z - halfZ, maxZ: center.z + halfZ };
}

function furnitureBelongsToRoomExperience(item: Furniture, room: HouseStructure["rooms"][number]) {
  if (item.roomId === room.id) return true;
  if (!/厨房/.test(room.name) || item.floorId !== room.floorId) return false;
  return /厨房|岛台|高柜|冰箱/.test(`${item.name} ${item.moduleType ?? ""} ${item.render3d?.assetType ?? ""}`);
}

function getRoomExperienceSceneBounds(
  room: HouseStructure["rooms"][number],
  structure: HouseStructure,
  furniture: Furniture[]
) {
  const roomBounds = getSceneBounds(room.boundary, structure);
  if (!/厨房/.test(room.name)) return roomBounds;
  const relatedBounds = furniture
    .filter((item) => furnitureBelongsToRoomExperience(item, room))
    .map((item) => getFurnitureSceneBlocker(item, structure, 0.12));
  if (!relatedBounds.length) return roomBounds;
  return relatedBounds.reduce((bounds, itemBounds) => ({
    minX: Math.min(bounds.minX, itemBounds.minX),
    maxX: Math.max(bounds.maxX, itemBounds.maxX),
    minZ: Math.min(bounds.minZ, itemBounds.minZ),
    maxZ: Math.max(bounds.maxZ, itemBounds.maxZ)
  }), roomBounds);
}

function KitchenExperienceFloorExtension({
  room,
  structure,
  furniture,
  designStyle
}: {
  room: HouseStructure["rooms"][number];
  structure: HouseStructure;
  furniture: Furniture[];
  designStyle: DesignStylePreset;
}) {
  const isKitchen = /厨房/.test(room.name);
  const roomBounds = getSceneBounds(room.boundary, structure);
  const experienceBounds = getRoomExperienceSceneBounds(room, structure, furniture);
  const extensionStart = roomBounds.maxZ - 0.03;
  const extensionEnd = experienceBounds.maxZ + 0.34;
  const floorStyle = getRoomFloorStyle(room, designStyle);
  const texture = useProceduralTexture(
    floorStyle.kind === "wood" ? "wood" : "stone",
    floorStyle.base,
    floorStyle.joint,
    floorStyle.kind === "wood" ? 4.8 : 3.2,
    floorStyle.kind === "wood" ? 1.5 : 3.2
  );
  if (!isKitchen || extensionEnd <= extensionStart + 0.08) return null;
  const width = Math.max(roomBounds.maxX, experienceBounds.maxX + 0.18) - Math.min(roomBounds.minX, experienceBounds.minX - 0.18);
  const centerX = (Math.max(roomBounds.maxX, experienceBounds.maxX + 0.18) + Math.min(roomBounds.minX, experienceBounds.minX - 0.18)) / 2;
  return (
    <mesh receiveShadow position={[centerX, 0.016, (extensionStart + extensionEnd) / 2]}>
      <boxGeometry args={[width, 0.028, extensionEnd - extensionStart]} />
      <meshStandardMaterial color={floorStyle.base} map={texture ?? undefined} roughness={floorStyle.roughness} metalness={0.03} />
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
  side = THREE.FrontSide,
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
  side?: THREE.Side;
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
        side={side}
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
  clippingPlanes,
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
  clippingPlanes?: THREE.Plane[];
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
        clippingPlanes={clippingPlanes ?? null}
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
  postStops,
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
  postStops?: number[];
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const metrics = useMemo(() => lineMetrics(start, end, structure), [start, end, structure]);
  const lengthMm = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
  const postCount = Math.max(2, Math.ceil(lengthMm / 900) + 1);
  const resolvedPostStops = postStops ?? Array.from({ length: postCount }, (_, index) => postCount === 1 ? 0 : index / (postCount - 1));
  const railingHeight = Math.max(0.72, heightMm * MM_TO_M);
  const glassBottom = 0.08;
  const handrailHeight = 0.07;
  const glassHeight = Math.max(0.48, railingHeight - glassBottom - handrailHeight - 0.03);
  const handrailY = glassBottom + glassHeight + handrailHeight / 2;
  const glassThickness = 0.018;
  const postWidth = 0.022;
  const woodColor = selected ? RAILING_SELECTED_COLOR : "#78411f";
  const metalColor = selected ? RAILING_SELECTED_COLOR : "#6f675e";
  const glassColor = selected ? "#93c5fd" : "#c4e2e3";

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
      <mesh
        receiveShadow
        position={[metrics.midpoint.x, glassBottom + glassHeight / 2, metrics.midpoint.z]}
        rotation={[0, metrics.rotationY, 0]}
        renderOrder={4}
      >
        <boxGeometry args={[metrics.length, glassHeight, glassThickness]} />
        <meshStandardMaterial
          color={glassColor}
          transparent
          opacity={selected ? 0.38 : 0.28}
          roughness={0.04}
          metalness={0.03}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <LineBox
        id={id}
        start={start}
        end={end}
        widthMm={Math.max(75, widthMm * 0.84)}
        heightMm={handrailHeight / MM_TO_M}
        structure={structure}
        color={woodColor}
        yOffset={handrailY - handrailHeight / 2}
        textureKind="wood"
        textureAccent="#4d2b18"
        selected={selected}
        onSelect={onSelect}
        onHover={onHover}
        onClearHover={onClearHover}
      />
      <LineBox
        id={id}
        start={start}
        end={end}
        widthMm={32}
        heightMm={30}
        structure={structure}
        color={metalColor}
        opacity={selected ? 0.94 : 0.76}
        yOffset={glassBottom - 0.015}
        selected={selected}
        onSelect={onSelect}
        onHover={onHover}
        onClearHover={onClearHover}
      />
      {resolvedPostStops.map((t, index) => {
        const x = metrics.startPoint.x + (metrics.endPoint.x - metrics.startPoint.x) * t;
        const z = metrics.startPoint.z + (metrics.endPoint.z - metrics.startPoint.z) * t;
        const postHeight = glassBottom + glassHeight;
        return (
          <mesh key={`${id}-post-${index}`} castShadow position={[x, postHeight / 2, z]} rotation={[0, metrics.rotationY, 0]} renderOrder={5}>
            <boxGeometry args={[postWidth, postHeight, postWidth]} />
            <meshStandardMaterial color={metalColor} roughness={0.28} metalness={0.56} transparent opacity={selected ? 0.95 : 0.76} />
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
  wallOpacity,
  clippingPlanes,
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
  wallOpacity?: number;
  clippingPlanes?: THREE.Plane[];
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const isBasementWall = structure.floorId === "B1" || structure.floorId === "B2";
  const wallSurfaceColor = !selected && isBasementWall ? "#c6beb3" : color;
  const capHeightMm = Math.min(WALL_CAP_HEIGHT_MM, Math.max(24, heightMm * 0.18));
  const bodyHeightMm = Math.max(42, heightMm - capHeightMm);
  const bodyOpacity = wallOpacity == null
    ? selected ? WALL_SELECTED_OPACITY : WALL_PREVIEW_OPACITY
    : Math.min(0.38, wallOpacity + (selected ? 0.12 : 0));
  const trimOpacity = wallOpacity == null
    ? selected ? 0.72 : 0.88
    : Math.min(0.5, wallOpacity + (selected ? 0.16 : 0.12));
  const capOpacity = wallOpacity == null
    ? selected ? 1 : 1
    : Math.min(0.52, wallOpacity + (selected ? 0.2 : 0.18));
  return (
    <group>
      <LineBox
        id={id}
        start={start}
        end={end}
        widthMm={widthMm}
        heightMm={bodyHeightMm}
        structure={structure}
        color={selected ? "#bfdbfe" : wallSurfaceColor}
        opacity={bodyOpacity}
        textureKind={isBasementWall ? "microcement" : "wall"}
        textureAccent={isBasementWall ? "#e0d8ce" : effectMaterialCatalog.wallPaint.color}
        selected={selected}
        clippingPlanes={clippingPlanes}
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
        opacity={trimOpacity}
        yOffset={0.08}
        textureKind="wood"
        textureAccent="#5d3d26"
        selected={selected}
        clippingPlanes={clippingPlanes}
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
        opacity={capOpacity}
        yOffset={bodyHeightMm * MM_TO_M}
        selected={selected}
        clippingPlanes={clippingPlanes}
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
          opacity={capOpacity}
          yOffset={0.018}
          textureKind="wood"
          textureAccent="#6f4c34"
          selected={false}
          clippingPlanes={clippingPlanes}
          onSelect={onSelect}
          onHover={onHover}
          onClearHover={onClearHover}
        />
      )}
    </group>
  );
}

function CutWallPanel({
  id,
  start,
  end,
  bottomMm,
  heightMm,
  startsAtFloor,
  reachesTop,
  structure,
  widthMm,
  color,
  wallOpacity,
  clippingPlanes,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  id: string;
  start: MmPoint;
  end: MmPoint;
  bottomMm: number;
  heightMm: number;
  startsAtFloor: boolean;
  reachesTop: boolean;
  structure: HouseStructure;
  widthMm: number;
  color: string;
  wallOpacity?: number;
  clippingPlanes?: THREE.Plane[];
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const isBasementWall = structure.floorId === "B1" || structure.floorId === "B2";
  const wallSurfaceColor = !selected && isBasementWall ? "#c6beb3" : color;
  const capHeightMm = reachesTop ? Math.min(WALL_CAP_HEIGHT_MM, Math.max(24, heightMm * 0.18)) : 0;
  const bodyHeightMm = Math.max(1, heightMm - capHeightMm);
  const bodyOpacity = wallOpacity == null
    ? selected ? WALL_SELECTED_OPACITY : WALL_PREVIEW_OPACITY
    : Math.min(0.38, wallOpacity + (selected ? 0.12 : 0));
  const trimOpacity = wallOpacity == null
    ? selected ? 0.72 : 0.88
    : Math.min(0.5, wallOpacity + (selected ? 0.16 : 0.12));
  const capOpacity = wallOpacity == null
    ? selected ? 1 : 1
    : Math.min(0.52, wallOpacity + (selected ? 0.2 : 0.18));
  return (
    <group>
      <LineBox
        id={id}
        start={start}
        end={end}
        widthMm={widthMm}
        heightMm={bodyHeightMm}
        structure={structure}
        color={selected ? "#bfdbfe" : wallSurfaceColor}
        opacity={bodyOpacity}
        yOffset={bottomMm * MM_TO_M}
        textureKind={isBasementWall ? "microcement" : "wall"}
        textureAccent={isBasementWall ? "#e0d8ce" : effectMaterialCatalog.wallPaint.color}
        selected={selected}
        clippingPlanes={clippingPlanes}
        onSelect={onSelect}
        onHover={onHover}
        onClearHover={onClearHover}
      />
      {reachesTop && (
        <LineBox
          id={id}
          start={start}
          end={end}
          widthMm={widthMm + 64}
          heightMm={capHeightMm}
          structure={structure}
          color={selected ? WALL_CAP_SELECTED_COLOR : WALL_CAP_COLOR}
          opacity={capOpacity}
          yOffset={(bottomMm + bodyHeightMm) * MM_TO_M}
          selected={selected}
          clippingPlanes={clippingPlanes}
          onSelect={onSelect}
          onHover={onHover}
          onClearHover={onClearHover}
        />
      )}
      {startsAtFloor && heightMm > 120 && (
        <>
          <LineBox
            id={id}
            start={start}
            end={end}
            widthMm={widthMm + 28}
            heightMm={42}
            structure={structure}
            color={selected ? "#bfdbfe" : "#9b7250"}
            opacity={trimOpacity}
            yOffset={0.08}
            textureKind="wood"
            textureAccent="#5d3d26"
            selected={selected}
            clippingPlanes={clippingPlanes}
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
              opacity={capOpacity}
              yOffset={0.018}
              textureKind="wood"
              textureAccent="#6f4c34"
              clippingPlanes={clippingPlanes}
              onSelect={onSelect}
              onHover={onHover}
              onClearHover={onClearHover}
            />
          )}
        </>
      )}
    </group>
  );
}

function getWallClippingPlanes(structure: HouseStructure, wallMode: Drawing3DWallMode) {
  if (wallMode !== "cutaway") return undefined;
  return [new THREE.Plane(new THREE.Vector3(0, -1, 0), resolveStructureStoryHeightMm(structure) * WALL_CUT_RATIO * MM_TO_M)];
}

function StraightWallWithOpenings({
  wall,
  structure,
  wallColor,
  wallMode,
  wallOpacity,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  wall: Extract<HouseWall, { kind: "straight" }>;
  structure: HouseStructure;
  wallColor: string;
  wallMode: Drawing3DWallMode;
  wallOpacity?: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const clippingPlanes = getWallClippingPlanes(structure, wallMode);
  const lengthMm = Math.max(1, Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y));
  const cuts = getHostedOpeningCuts(structure, wall.id, "wall", lengthMm, wall.height);
  const panels = getStraightHostPanels(wall.start, wall.end, wall.height, cuts);
  return (
    <group>
      {panels.map((panel, index) => (
        <CutWallPanel
          key={`${wall.id}-panel-${index}`}
          id={wall.id}
          start={panel.start}
          end={panel.end}
          bottomMm={panel.bottomMm}
          heightMm={panel.heightMm}
          startsAtFloor={panel.startsAtFloor}
          reachesTop={panel.reachesTop}
          structure={structure}
          widthMm={wall.thickness}
          color={wallColor}
          selected={selected}
          wallOpacity={wallOpacity}
          clippingPlanes={clippingPlanes}
          onSelect={onSelect}
          onHover={onHover}
          onClearHover={onClearHover}
        />
      ))}
    </group>
  );
}

function WallMesh({
  wall,
  structure,
  wallColor,
  wallMode,
  wallOpacity,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  wall: HouseWall;
  structure: HouseStructure;
  wallColor: string;
  wallMode: Drawing3DWallMode;
  wallOpacity?: number;
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
              postStops={index === points.length - 2 ? [0, 1] : index % 4 === 0 ? [0] : []}
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
    const clippingPlanes = getWallClippingPlanes(structure, wallMode);
    return (
      <group>
        {points.slice(0, -1).map((point, index) => (
          <SolidWallSegment
            key={`${wall.id}-${index}`}
            id={wall.id}
            start={point}
            end={points[index + 1]}
            widthMm={wall.thickness}
            heightMm={wall.height}
            structure={structure}
            color={wallColor}
            selected={selected}
            wallOpacity={wallOpacity}
            clippingPlanes={clippingPlanes}
            onSelect={onSelect}
            onHover={onHover}
            onClearHover={onClearHover}
          />
        ))}
      </group>
    );
  }

  const wallLengthMm = Math.max(1, Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y));
  const hasHostedOpenings = getHostedOpeningCuts(structure, wall.id, "wall", wallLengthMm, wall.height).length > 0;
  if (hasHostedOpenings) {
    return (
      <StraightWallWithOpenings
        wall={wall}
        structure={structure}
        wallColor={wallColor}
        wallMode={wallMode}
        wallOpacity={wallOpacity}
        selected={selected}
        onSelect={onSelect}
        onHover={onHover}
        onClearHover={onClearHover}
      />
    );
  }

  return (
    <SolidWallSegment
      id={wall.id}
      start={wall.start}
      end={wall.end}
      widthMm={wall.thickness}
      heightMm={wall.height}
      structure={structure}
      color={wallColor}
      selected={selected}
      wallOpacity={wallOpacity}
      clippingPlanes={getWallClippingPlanes(structure, wallMode)}
      onSelect={onSelect}
      onHover={onHover}
      onClearHover={onClearHover}
    />
  );
}

function PartitionMesh({
  partition,
  structure,
  wallMode,
  wallOpacity,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  partition: HousePartition;
  structure: HouseStructure;
  wallMode: Drawing3DWallMode;
  wallOpacity?: number;
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
      opacity={Math.min(
        partition.transparency ? Math.max(0.28, 1 - partition.transparency) : 0.82,
        wallOpacity ?? 1
      )}
      selected={selected}
      clippingPlanes={getWallClippingPlanes(structure, wallMode)}
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
  explorationDoorState,
  onSelect,
  onHover,
  onClearHover
}: {
  opening: HouseDoor | HouseWindow;
  structure: HouseStructure;
  selected: boolean;
  explorationDoorState?: ExplorationDoorStates[string];
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const host = getHostSegment(structure, opening.hostId);
  if (!host) return null;
  const metrics = lineMetrics(host.start, host.end, structure);
  const t = Math.min(1, Math.max(0, opening.positionOnWall));
  const center = {
    x: metrics.startPoint.x + (metrics.endPoint.x - metrics.startPoint.x) * t,
    z: metrics.startPoint.z + (metrics.endPoint.z - metrics.startPoint.z) * t
  };
  const isDoor = "openDirection" in opening;
  const width = Math.max(0.2, opening.width * MM_TO_M);
  const windowDisplayMetrics = isDoor ? null : getWindow3DDisplayMetrics(host.height, opening.height, opening.sillHeightMm);
  const displayHeightMm = isDoor ? getDoor3DDisplayHeight(opening.height) : windowDisplayMetrics!.heightMm;
  const height = Math.max(0.3, displayHeightMm * MM_TO_M);
  const sillHeight = isDoor ? 0 : windowDisplayMetrics!.sillHeightMm * MM_TO_M;
  const isGlassDoor = isDoor && "material" in opening && opening.material?.toLowerCase().includes("glass");
  const color = selected ? "#2563eb" : isDoor ? (isGlassDoor ? "#8fd3e8" : effectMaterialCatalog.doorWood.color) : "#b6ddeb";
  const opacity = isDoor ? (isGlassDoor ? 0.44 : 1) : 0.42;
  const woodTexture = useProceduralTexture(isDoor && !isGlassDoor ? "wood" : null, effectMaterialCatalog.doorWood.color, "#b59b7f", 1.2, 2.2);
  const frameColor = selected ? "#2563eb" : effectMaterialCatalog.blackMetal.color;
  const frameWidth = Math.min(0.065, Math.max(0.035, width * 0.045));

  return (
    <group
      position={[center.x, 0, center.z]}
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
      {isDoor ? (
        <>
          {[-1, 1].map((xSide) => (
            <mesh key={`${opening.id}-door-jamb-${xSide}`} castShadow position={[xSide * width * 0.5, height / 2, 0]}>
              <boxGeometry args={[frameWidth, height, Math.max(0.06, host.thickness * MM_TO_M)]} />
              <meshStandardMaterial color={frameColor} roughness={0.34} metalness={0.48} />
            </mesh>
          ))}
          <mesh castShadow position={[0, height, 0]}>
            <boxGeometry args={[width + frameWidth, frameWidth, Math.max(0.06, host.thickness * MM_TO_M)]} />
            <meshStandardMaterial color={frameColor} roughness={0.34} metalness={0.48} />
          </mesh>
          {opening.operation === "sliding" ? (
            [-1, 1].map((panelSide) => (
              <mesh
                key={`${opening.id}-sliding-panel-${panelSide}`}
                castShadow
                receiveShadow
                position={[
                  panelSide * width * (0.23 + (explorationDoorState?.currentAngle ?? 0) * 0.25),
                  height / 2,
                  panelSide * 0.038
                ]}
              >
                <boxGeometry args={[width * 0.54, height * 0.98, 0.045]} />
                <meshStandardMaterial color={color} map={woodTexture ?? undefined} transparent={opacity < 1} opacity={opacity} roughness={isGlassDoor ? 0.08 : 0.58} metalness={isGlassDoor ? 0.08 : 0.02} />
              </mesh>
            ))
          ) : (() => {
            const opensFromStart = opening.openDirection === "leftIn" || opening.openDirection === "leftOut";
            const opensInside = opening.openDirection === "leftIn" || opening.openDirection === "rightIn";
            const leafDirection = opensFromStart ? 1 : -1;
            const designSwingAngle = (opensFromStart ? -1 : 1) * (opensInside ? 1 : -1) * Math.PI * 0.4;
            const swingAngle = explorationDoorState
              ? designSwingAngle * explorationDoorState.currentAngle
              : designSwingAngle;
            return (
              <group position={[opensFromStart ? -width / 2 : width / 2, 0, 0]} rotation={[0, swingAngle, 0]}>
                <mesh castShadow receiveShadow position={[leafDirection * width / 2, height / 2, 0]}>
                  <boxGeometry args={[width, height * 0.985, 0.055]} />
                  <meshStandardMaterial color={color} map={woodTexture ?? undefined} transparent={opacity < 1} opacity={opacity} roughness={isGlassDoor ? 0.08 : 0.58} metalness={isGlassDoor ? 0.08 : 0.02} side={THREE.DoubleSide} />
                </mesh>
                {!isGlassDoor && (
                  <mesh position={[leafDirection * width * 0.4, Math.min(1.02, height * 0.48), 0.052]}>
                    <sphereGeometry args={[0.04, 16, 10]} />
                    <meshStandardMaterial color="#c9a46a" roughness={0.26} metalness={0.72} />
                  </mesh>
                )}
              </group>
            );
          })()}
        </>
      ) : (
        <group position={[0, sillHeight + height / 2, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[width, height, 0.04]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.08} metalness={0.08} side={THREE.DoubleSide} />
          </mesh>
          {[-1, 1].map((xSide) => (
            <mesh key={`${opening.id}-window-side-${xSide}`} position={[xSide * width * 0.5, 0, 0]}>
              <boxGeometry args={[frameWidth, height + frameWidth, 0.07]} />
              <meshStandardMaterial color={frameColor} roughness={0.32} metalness={0.48} />
            </mesh>
          ))}
          {[-1, 1].map((ySide) => (
            <mesh key={`${opening.id}-window-horizontal-${ySide}`} position={[0, ySide * height * 0.5, 0]}>
              <boxGeometry args={[width + frameWidth, frameWidth, 0.07]} />
              <meshStandardMaterial color={frameColor} roughness={0.32} metalness={0.48} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.024]}>
            <boxGeometry args={[frameWidth * 0.72, height * 0.96, 0.035]} />
            <meshStandardMaterial color={frameColor} roughness={0.32} metalness={0.48} />
          </mesh>
          <mesh position={[0, height * 0.48 + 0.035, 0]}>
            <boxGeometry args={[width + 0.09, 0.055, Math.max(0.1, host.thickness * MM_TO_M + 0.04)]} />
            <meshStandardMaterial color={selected ? "#bfdbfe" : "#d8d2c7"} roughness={0.72} />
          </mesh>
        </group>
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
  const height = Math.max(0.4, bayWindow.height * MM_TO_M);
  const sillHeight = getOpeningSillHeight(host.height, bayWindow.height) * MM_TO_M;
  return (
    <mesh
      castShadow
      receiveShadow
      position={[center.x, sillHeight + height / 2, center.z]}
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
      <boxGeometry args={[bayWindow.width * MM_TO_M, height, bayWindow.depth * MM_TO_M]} />
      <meshStandardMaterial color={selected ? "#2563eb" : "#bfdbfe"} transparent opacity={0.48} roughness={0.18} metalness={0.04} side={THREE.DoubleSide} />
    </mesh>
  );
}

function SkylightMesh({
  skylight,
  structure,
  wallMode,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  skylight: HouseSkylight;
  structure: HouseStructure;
  wallMode: Drawing3DWallMode;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const center = toScenePoint(skylight.center, structure);
  const width = Math.max(0.2, skylight.width * MM_TO_M);
  const depth = Math.max(0.2, skylight.depth * MM_TO_M);
  const curbHeight = Math.max(0.06, skylight.height * MM_TO_M);
  const frameWidth = Math.min(0.065, Math.max(0.035, Math.min(width, depth) * 0.07));
  const openAngle = skylight.openable || skylight.operation === "electricOperable" || skylight.operation === "manualOperable" ? -0.14 : 0;
  const frameColor = selected ? "#2563eb" : effectMaterialCatalog.blackMetal.color;
  return (
    <group
      position={[center.x, resolveStructureStoryHeightMm(structure) * MM_TO_M + 0.04, center.z]}
      rotation={[0, -skylight.rotation * Math.PI / 180, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(skylight.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(skylight.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover(skylight.id);
      }}
    >
      {[-1, 1].map((xSide) => (
        <mesh key={`${skylight.id}-curb-x-${xSide}`} castShadow position={[xSide * width / 2, -curbHeight / 2, 0]}>
          <boxGeometry args={[frameWidth, curbHeight, depth + frameWidth]} />
          <meshStandardMaterial color={frameColor} roughness={0.42} metalness={0.46} />
        </mesh>
      ))}
      {[-1, 1].map((zSide) => (
        <mesh key={`${skylight.id}-curb-z-${zSide}`} castShadow position={[0, -curbHeight / 2, zSide * depth / 2]}>
          <boxGeometry args={[width + frameWidth, curbHeight, frameWidth]} />
          <meshStandardMaterial color={frameColor} roughness={0.42} metalness={0.46} />
        </mesh>
      ))}
      <group position={[0, 0.025, -depth / 2]} rotation={[openAngle, 0, 0]}>
        <mesh position={[0, 0, depth / 2]} receiveShadow>
          <boxGeometry args={[width, 0.035, depth]} />
          <meshStandardMaterial color={selected ? "#60a5fa" : effectMaterialCatalog.windowGlass.color} transparent opacity={0.5} roughness={0.08} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>
        {[-1, 1].map((xSide) => (
          <mesh key={`${skylight.id}-frame-x-${xSide}`} position={[xSide * width / 2, 0.025, depth / 2]}>
            <boxGeometry args={[frameWidth, 0.055, depth + frameWidth]} />
            <meshStandardMaterial color={frameColor} roughness={0.3} metalness={0.58} />
          </mesh>
        ))}
        {[-1, 1].map((zSide) => (
          <mesh key={`${skylight.id}-frame-z-${zSide}`} position={[0, 0.025, depth / 2 + zSide * depth / 2]}>
            <boxGeometry args={[width + frameWidth, 0.055, frameWidth]} />
            <meshStandardMaterial color={frameColor} roughness={0.3} metalness={0.58} />
          </mesh>
        ))}
        <mesh position={[0, 0.035, depth / 2]}>
          <boxGeometry args={[frameWidth * 0.8, 0.045, depth * 0.94]} />
          <meshStandardMaterial color={frameColor} roughness={0.3} metalness={0.58} />
        </mesh>
      </group>
    </group>
  );
}

function StairLandingMesh({
  landing,
  elevationMm,
  structure,
  materialPreview,
  showLight,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  landing: StairLanding;
  elevationMm: number;
  structure: HouseStructure;
  materialPreview: boolean;
  showLight: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const bounds = useMemo(() => getSceneBounds(landing.polygon, structure), [landing.polygon, structure]);
  const platform = {
    center: { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 },
    width: Math.max(0.5, bounds.maxX - bounds.minX),
    depth: Math.max(0.5, bounds.maxZ - bounds.minZ)
  };
  const elevation = elevationMm * MM_TO_M;
  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onSelect(landing.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(landing.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover(landing.id);
      }}
    >
      <mesh castShadow receiveShadow position={[platform.center.x, elevation - 0.065, platform.center.z]}>
        <boxGeometry args={[platform.width, 0.13, platform.depth]} />
        <meshStandardMaterial
          color={selected ? "#2563eb" : materialPreview ? "#82502b" : "#0f766e"}
          roughness={materialPreview ? 0.46 : 0.62}
          metalness={materialPreview ? 0.02 : 0}
          transparent
          opacity={selected ? 0.92 : materialPreview ? 1 : 0.88}
        />
      </mesh>
      <mesh castShadow position={[platform.center.x, elevation - 0.12, platform.center.z]}>
        <boxGeometry args={[platform.width * 0.92, 0.16, 0.18]} />
        <meshStandardMaterial color={selected ? "#2563eb" : "#5f4a39"} roughness={0.74} />
      </mesh>
      {showLight && (
        <pointLight color="#ffd48a" intensity={0.42} distance={2.4} position={[platform.center.x, elevation + 0.55, platform.center.z]} />
      )}
    </group>
  );
}

function StairOpeningMesh({ opening, elevationMm, structure, selected, showSlabFrame }: { opening: StairOpening; elevationMm: number; structure: HouseStructure; selected: boolean; showSlabFrame: boolean }) {
  const elevation = elevationMm * MM_TO_M;
  const points = opening.polygon.map((point) => toScenePoint(point, structure));
  const openingBounds = getSceneBounds(opening.polygon, structure);
  const stairRoom = structure.rooms.find((room) => /楼梯/.test(room.name));
  const roomBounds = stairRoom ? getSceneBounds(stairRoom.boundary, structure) : null;
  const slabPieces = roomBounds ? [
    { id: "entry", minX: roomBounds.minX, maxX: openingBounds.minX, minZ: roomBounds.minZ, maxZ: roomBounds.maxZ },
    { id: "landing", minX: openingBounds.maxX, maxX: roomBounds.maxX, minZ: roomBounds.minZ, maxZ: roomBounds.maxZ },
    { id: "edge-a", minX: openingBounds.minX, maxX: openingBounds.maxX, minZ: roomBounds.minZ, maxZ: openingBounds.minZ },
    { id: "edge-b", minX: openingBounds.minX, maxX: openingBounds.maxX, minZ: openingBounds.maxZ, maxZ: roomBounds.maxZ }
  ].filter((piece) => piece.maxX - piece.minX > 0.01 && piece.maxZ - piece.minZ > 0.01) : [];
  return (
    <group>
      {showSlabFrame && slabPieces.map((piece) => (
        <mesh
          key={`${opening.id}-slab-${piece.id}`}
          castShadow
          receiveShadow
          position={[(piece.minX + piece.maxX) / 2, elevation - 0.09, (piece.minZ + piece.maxZ) / 2]}
        >
          <boxGeometry args={[piece.maxX - piece.minX, 0.18, piece.maxZ - piece.minZ]} />
          <meshStandardMaterial color={selected ? "#93c5fd" : "#d8d0c4"} roughness={0.82} />
        </mesh>
      ))}
      {points.map((point, index) => {
        const next = points[(index + 1) % points.length];
        const dx = next.x - point.x;
        const dz = next.z - point.z;
        const length = Math.hypot(dx, dz);
        return (
          <mesh key={`${opening.id}-reveal-${index}`} position={[(point.x + next.x) / 2, elevation - 0.08, (point.z + next.z) / 2]} rotation={[0, Math.atan2(-dz, dx), 0]}>
            <boxGeometry args={[length, 0.18, 0.24]} />
            <meshStandardMaterial color={selected ? "#2563eb" : "#766b60"} roughness={0.8} />
          </mesh>
        );
      })}
      {opening.guardEdges.map((edge) => {
        const metrics = lineMetrics(edge.start, edge.end, structure);
        const railingHeight = 0.92;
        return (
          <group key={edge.id} position={[metrics.startPoint.x, elevation, metrics.startPoint.z]} rotation={[0, metrics.rotationY, 0]}>
            <mesh position={[metrics.length / 2, railingHeight / 2, 0]}>
              <boxGeometry args={[metrics.length, railingHeight, 0.018]} />
              <meshStandardMaterial color="#bfe0e3" transparent opacity={0.24} roughness={0.05} metalness={0.04} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            {[0, 0.5, 1].map((t) => (
              <mesh key={`${edge.id}-post-${t}`} castShadow position={[metrics.length * t, railingHeight / 2, 0]}>
                <boxGeometry args={[0.026, railingHeight, 0.026]} />
                <meshStandardMaterial color="#665f57" roughness={0.32} metalness={0.5} />
              </mesh>
            ))}
            <mesh castShadow position={[metrics.length / 2, railingHeight + 0.035, 0]}>
              <boxGeometry args={[metrics.length + 0.08, 0.07, 0.075]} />
              <meshStandardMaterial color={selected ? "#2563eb" : "#78411f"} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function StairDirectionCue({
  metrics,
  stairWidth,
  startHeight,
  endHeight,
  label,
  isDownRun,
  selected
}: {
  metrics: ReturnType<typeof lineMetrics>;
  stairWidth: number;
  startHeight: number;
  endHeight: number;
  label: string;
  isDownRun: boolean;
  selected: boolean;
}) {
  const color = selected ? "#2563eb" : isDownRun ? "#dc2626" : "#0284c7";
  // Stair geometry is rendered from the floor entry toward the half landing.
  const fromT = 0.32;
  const toT = 0.68;
  const pointAt = (t: number) => new THREE.Vector3(
    THREE.MathUtils.lerp(metrics.startPoint.x, metrics.endPoint.x, t),
    THREE.MathUtils.lerp(startHeight, endHeight, t) + 0.24,
    THREE.MathUtils.lerp(metrics.startPoint.z, metrics.endPoint.z, t)
  );
  const from = pointAt(fromT);
  const to = pointAt(toT);
  const direction = to.clone().sub(from);
  const length = direction.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  const labelTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "rgba(255,255,255,0.92)";
      context.roundRect(8, 8, 496, 112, 28);
      context.fill();
      context.fillStyle = color;
      context.font = "700 52px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(label, 256, 67);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [color, label]);
  useEffect(() => () => labelTexture.dispose(), [labelTexture]);
  const labelPoint = pointAt(0.5).add(new THREE.Vector3(metrics.normal.x * stairWidth * 0.68, 0.3, metrics.normal.z * stairWidth * 0.68));
  return (
    <group>
      <mesh position={from.clone().add(to).multiplyScalar(0.5)} quaternion={quaternion}>
        <cylinderGeometry args={[0.025, 0.025, Math.max(0.1, length - 0.16), 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.14} roughness={0.42} />
      </mesh>
      <mesh position={to} quaternion={quaternion}>
        <coneGeometry args={[0.085, 0.2, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.16} roughness={0.38} />
      </mesh>
      <sprite position={labelPoint} scale={[0.95, 0.24, 1]}>
        <spriteMaterial map={labelTexture} transparent depthTest depthWrite={false} />
      </sprite>
    </group>
  );
}

function StairGlassRailings({
  metrics,
  stairId,
  stairWidth,
  startY,
  endY,
  selected,
  muted
}: {
  metrics: ReturnType<typeof lineMetrics>;
  stairId: string;
  stairWidth: number;
  startY: number;
  endY: number;
  selected: boolean;
  muted: boolean;
}) {
  const glassHeight = 0.78;
  const glassBottomOffset = 0.08;
  const handrailHeight = 0.07;
  const glassShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, startY + glassBottomOffset);
    shape.lineTo(metrics.length, endY + glassBottomOffset);
    shape.lineTo(metrics.length, endY + glassBottomOffset + glassHeight);
    shape.lineTo(0, startY + glassBottomOffset + glassHeight);
    shape.closePath();
    return shape;
  }, [endY, metrics.length, startY]);
  const railStartY = startY + glassBottomOffset + glassHeight + handrailHeight / 2;
  const railEndY = endY + glassBottomOffset + glassHeight + handrailHeight / 2;
  const railRise = railEndY - railStartY;
  const railLength = Math.hypot(metrics.length, railRise);
  const railAngle = Math.atan2(railRise, metrics.length);
  const postStops = [0, 1 / 3, 2 / 3, 1];
  const depthTest = true;
  const woodColor = selected ? "#2563eb" : "#78411f";
  const metalColor = selected ? "#2563eb" : "#6f675e";

  return (
    <group position={[metrics.startPoint.x, 0, metrics.startPoint.z]} rotation={[0, metrics.rotationY, 0]}>
      {[-1, 1].map((side) => {
        const sideZ = side * (stairWidth / 2 + 0.018);
        return (
          <group key={`${stairId}-railing-${side}`}>
            <mesh position={[0, 0, sideZ]} renderOrder={muted ? 17 : 4}>
              <shapeGeometry args={[glassShape]} />
              <meshStandardMaterial
                color={selected ? "#93c5fd" : "#c4e2e3"}
                transparent
                opacity={muted ? 0.14 : 0.28}
                roughness={0.04}
                metalness={0.03}
                depthWrite={false}
                depthTest={depthTest}
                side={THREE.DoubleSide}
              />
            </mesh>
            {postStops.map((t, index) => {
              const postBaseY = THREE.MathUtils.lerp(startY, endY, t) + glassBottomOffset;
              const postTopY = THREE.MathUtils.lerp(railStartY, railEndY, t) - handrailHeight / 2;
              const postHeight = Math.max(0.2, postTopY - postBaseY);
              return (
                <mesh
                  key={`${stairId}-post-${side}-${index}`}
                  castShadow={!muted}
                  position={[metrics.length * t, postBaseY + postHeight / 2, sideZ]}
                  renderOrder={muted ? 18 : 5}
                >
                  <boxGeometry args={[0.022, postHeight, 0.022]} />
                  <meshStandardMaterial color={metalColor} roughness={0.28} metalness={0.56} transparent opacity={muted ? 0.38 : 0.76} depthTest={depthTest} />
                </mesh>
              );
            })}
            <mesh
              castShadow={!muted}
              position={[metrics.length / 2, (railStartY + railEndY) / 2, sideZ]}
              rotation={[0, 0, railAngle]}
              renderOrder={muted ? 19 : 6}
            >
              <boxGeometry args={[railLength + 0.12, handrailHeight, 0.075]} />
              <meshStandardMaterial color={woodColor} roughness={0.4} metalness={0.02} transparent={muted} opacity={muted ? 0.62 : 1} depthTest={depthTest} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function StairMesh({
  stair,
  structure,
  startHeightMm,
  endHeightMm,
  materialPreview,
  showDirectionCue,
  showStepLights,
  stepLightHeightAboveTreadMm,
  landingDepthMm,
  directionLabel,
  muted,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  stair: HouseStair;
  structure: HouseStructure;
  startHeightMm: number;
  endHeightMm: number;
  materialPreview: boolean;
  showDirectionCue: boolean;
  showStepLights: boolean;
  stepLightHeightAboveTreadMm: number;
  landingDepthMm: number;
  directionLabel: string;
  muted: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const renderStart = useMemo(() => {
    const fullLength = Math.max(1, Math.hypot(stair.end.x - stair.start.x, stair.end.y - stair.start.y));
    const inset = Math.min(Math.max(0, landingDepthMm), fullLength * 0.42);
    return {
      x: stair.start.x + (stair.end.x - stair.start.x) / fullLength * inset,
      y: stair.start.y + (stair.end.y - stair.start.y) / fullLength * inset
    };
  }, [landingDepthMm, stair.end.x, stair.end.y, stair.start.x, stair.start.y]);
  const metrics = useMemo(() => lineMetrics(renderStart, stair.end, structure), [renderStart, stair.end, structure]);
  const count = Math.max(1, stair.stepCount);
  const stepLength = metrics.length / count;
  const startHeight = startHeightMm * MM_TO_M;
  const endHeight = endHeightMm * MM_TO_M;
  const stairWidth = Math.max(0.5, stair.width * MM_TO_M);
  const isDownRun = stair.direction === "down";
  const stringerRise = endHeight - startHeight;
  const stringerLength = Math.hypot(metrics.length, stringerRise);
  const stringerAngle = Math.atan2(stringerRise, metrics.length);
  const stepMaterialColor = selected ? "#2563eb" : materialPreview ? "#8f542f" : isDownRun ? "#9b846b" : "#d6c6ae";
  const treadTops = Array.from({ length: count }, (_, index) => THREE.MathUtils.lerp(startHeight, endHeight, (index + 1) / count));
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
      {materialPreview && (
        <group position={[metrics.startPoint.x, 0, metrics.startPoint.z]} rotation={[0, metrics.rotationY, 0]}>
          {[-1, 1].map((side) => (
            <mesh
              key={`${stair.id}-stringer-${side}`}
              castShadow={!muted}
              position={[metrics.length / 2, (startHeight + endHeight) / 2 - 0.12, side * (stairWidth / 2 - 0.09)]}
              rotation={[0, 0, stringerAngle]}
            >
              <boxGeometry args={[stringerLength, 0.14, 0.11]} />
              <meshStandardMaterial
                color={selected ? "#2563eb" : "#6f3d22"}
                roughness={0.5}
                metalness={0.01}
                transparent={muted}
                opacity={muted ? 0.62 : 1}
              />
            </mesh>
          ))}
        </group>
      )}
      {Array.from({ length: count }, (_, index) => {
        const t = (index + 0.5) / count;
        const treadTopY = treadTops[index];
        const centerY = treadTopY - 0.05;
        const center = {
          x: metrics.startPoint.x + (metrics.endPoint.x - metrics.startPoint.x) * t,
          z: metrics.startPoint.z + (metrics.endPoint.z - metrics.startPoint.z) * t
        };
        return (
          <mesh key={`${stair.id}-step-${index}`} castShadow={!muted} receiveShadow position={[center.x, centerY, center.z]} rotation={[0, metrics.rotationY, 0]}>
            <boxGeometry args={[stepLength * 1.02, 0.1, stairWidth]} />
            <meshStandardMaterial
              color={stepMaterialColor}
              roughness={materialPreview ? 0.44 : 0.72}
              metalness={materialPreview ? 0.02 : 0}
              transparent={muted}
              opacity={muted ? 0.72 : 1}
            />
          </mesh>
        );
      })}
      {materialPreview && (
        <StairGlassRailings
          metrics={metrics}
          stairId={stair.id}
          stairWidth={stairWidth}
          startY={startHeight}
          endY={endHeight}
          selected={selected}
          muted={muted}
        />
      )}
      {showStepLights && treadTops.map((treadTopY, index) => {
        const t = (index + 0.5) / count;
        return (
          <mesh
            key={`${stair.id}-step-light-${index}`}
            position={[
              THREE.MathUtils.lerp(metrics.startPoint.x, metrics.endPoint.x, t) + metrics.normal.x * stairWidth * 0.42,
              treadTopY + stepLightHeightAboveTreadMm * MM_TO_M,
              THREE.MathUtils.lerp(metrics.startPoint.z, metrics.endPoint.z, t) + metrics.normal.z * stairWidth * 0.42
            ]}
            rotation={[0, metrics.rotationY, 0]}
          >
            <boxGeometry args={[Math.min(0.18, stepLength * 0.56), 0.08, 0.035]} />
            <meshStandardMaterial color="#ffe0a0" emissive="#ffb84d" emissiveIntensity={0.85} roughness={0.3} />
          </mesh>
        );
      })}
      {showDirectionCue && <StairDirectionCue metrics={metrics} stairWidth={stairWidth} startHeight={startHeight} endHeight={endHeight} label={directionLabel} isDownRun={isDownRun} selected={selected} />}
    </group>
  );
}

function StairDebugGeometryLayer({
  systems,
  structure
}: {
  systems: StairRenderSystemGeometry[];
  structure: HouseStructure;
}) {
  return (
    <group>
      {systems.map((system) => {
        const bounds = system.finalBounds;
        const hasFiniteBounds = Number.isFinite(bounds.minX) && Number.isFinite(bounds.minY) && Number.isFinite(bounds.minZ);
        const width = Math.max(0.04, (bounds.maxX - bounds.minX) * MM_TO_M);
        const height = Math.max(0.04, (bounds.maxY - bounds.minY) * MM_TO_M);
        const depth = Math.max(0.04, (bounds.maxZ - bounds.minZ) * MM_TO_M);
        const center: Vec3Tuple = [
          (bounds.minX + bounds.maxX) * 0.5 * MM_TO_M,
          (bounds.minY + bounds.maxY) * 0.5 * MM_TO_M,
          (bounds.minZ + bounds.maxZ) * 0.5 * MM_TO_M
        ];
        const endpoints = [system.lowerFlight, system.upperFlight].flatMap((flight) => {
          if (!flight) return [];
          const platform = toScenePoint(flight.platformPlanPoint, structure);
          const floorPoint = toScenePoint(flight.floorPlanPoint, structure);
          return [
            { id: `${flight.stair.id}-platform`, point: platform, y: flight.finalPlatformYMm, color: flight.role === "lower-flight" ? "#16a34a" : "#0284c7" },
            { id: `${flight.stair.id}-floor`, point: floorPoint, y: flight.finalFloorYMm, color: flight.stair.direction === "down" ? "#dc2626" : "#7c3aed" }
          ];
        });
        return (
          <group key={`${system.system.id}-debug`}>
            {hasFiniteBounds && (
              <mesh position={center}>
                <boxGeometry args={[width, height, depth]} />
                <meshBasicMaterial color="#f59e0b" wireframe transparent opacity={0.72} depthTest />
              </mesh>
            )}
            {endpoints.map((endpoint) => (
              <mesh key={endpoint.id} position={[endpoint.point.x, endpoint.y * MM_TO_M, endpoint.point.z]} renderOrder={30}>
                <sphereGeometry args={[0.075, 16, 10]} />
                <meshBasicMaterial color={endpoint.color} depthTest />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

type FurnitureAssetGroupProps = {
  item: Furniture;
  structure: HouseStructure;
  heightMode: "actual" | "cutaway";
  sceneLod: UnifiedSceneLod;
  cabinetOpenAmount?: number;
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
  heightMode,
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
  const height = getFurnitureActualHeight(item);
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
  const groupY = getFurnitureActualElevation(item) + height / 2 + floorLift;
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
                    rotation={[0, -angle - Math.PI / 2, 0]}
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

function FineVariantFurniture3DGroup(props: FurnitureAssetGroupProps) {
  const metrics = useFineAssetMetrics(props);
  return (
    <SelectableFurnitureGroup props={props} position={metrics.position} groupY={metrics.groupY} rotation={metrics.rotation}>
      <FurnitureFamily3D
        item={props.item}
        asset={props.resolvedAsset}
        width={metrics.width}
        depth={metrics.depth}
        height={metrics.height}
        openAmount={props.cabinetOpenAmount}
      />
    </SelectableFurnitureGroup>
  );
}

function VariantFurniture3DGroup(props: FurnitureAssetGroupProps) {
  if (shouldUseFineAsset(props)) return <FineVariantFurniture3DGroup {...props} />;
  return <FurnitureBlock {...props} />;
}

function Bed3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function Nightstand3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function Wardrobe3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function WalkInCloset3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function Cabinet3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function Desk3DGroup(props: FurnitureAssetGroupProps) {
  if (shouldUseFineAsset(props)) return <Desk3DAsset {...props} />;
  return <FurnitureBlock {...props} />;
}

function BathroomVanity3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function Toilet3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function Bathtub3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function Shower3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function Sofa3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function CoffeeTable3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function DiningTable3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function DiningChair3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function KitchenCabinet3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function Island3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function Sideboard3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function EntryCabinet3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
}

function Fireplace3DGroup(props: FurnitureAssetGroupProps) {
  return <VariantFurniture3DGroup {...props} />;
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
  if (shouldUseFineAsset(props)) return <FineVariantFurniture3DGroup {...props} />;
  return <FurnitureBlock {...props} />;
}

function Cooktop3DGroup(props: FurnitureAssetGroupProps) {
  if (shouldUseFineAsset(props)) return <FineVariantFurniture3DGroup {...props} />;
  return <FurnitureBlock {...props} />;
}

function Fridge3DGroup(props: FurnitureAssetGroupProps) {
  if (shouldUseFineAsset(props)) return <FineVariantFurniture3DGroup {...props} />;
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
  if (shouldUseFineAsset(props) && getFurnitureFamily(props.item, props.resolvedAsset.assetType) === "softDecor") return <FineVariantFurniture3DGroup {...props} />;
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
  const sourceAsset = resolve3DAsset(props.item);
  const resolvedAsset: Resolved3DAsset = {
    ...sourceAsset,
    detailLevel: resolveUnifiedSceneDetailLevel(sourceAsset.detailLevel, props.sceneLod)
  };
  if (!resolveVisibility(props.item).visible3d || !resolvedAsset.visibleIn3d) return null;
  const Component = furnitureAssetComponentMap[resolvedAsset.componentKey] ?? Generic3DGroup;
  return <Component {...props} resolvedAsset={resolvedAsset} />;
}

function FurnitureServiceMarkers({
  item,
  structure,
  drawingSheetType,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  item: Furniture;
  structure: HouseStructure;
  drawingSheetType: DrawingSheetType;
  selected: boolean;
  onSelect: (item: Furniture) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const constructionAnchors = getConstructionAnchorsForSheet(item.constructionAnchors, drawingSheetType);
  const markers = getFurnitureServiceMarkers(item);
  if (!markers.length && !constructionAnchors.length) return null;

  const position = getFurnitureScenePosition(item, structure);
  const width = Math.max(0.12, item.dimensions.width / 100);
  const depth = Math.max(0.08, item.dimensions.depth / 100);
  const baseRotation = -(item.position.rotation || 0) * Math.PI / 180;
  const radius = Math.max(0.34, Math.min(1.22, Math.max(width, depth) * 0.42 + 0.18));

  if (constructionAnchors.length) {
    return (
      <group
        position={[position.x, 0.018, position.z]}
        rotation={[0, baseRotation, 0]}
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
        <ConstructionAnchorLayer anchors={constructionAnchors} selected={selected} />
      </group>
    );
  }

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

function RenderToneMapping({ presentationMode, mobilePresentationMode, mobileQuality }: { presentationMode: boolean; mobilePresentationMode: boolean; mobileQuality: MobileQuality }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = presentationMode ? 1.22 : 1.14;
    gl.shadowMap.enabled = !mobilePresentationMode || mobileQuality === "high";
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl, mobilePresentationMode, mobileQuality, presentationMode]);
  return null;
}

function LightingFreeBrowseMinimap({
  structure,
  drawingItems,
  pose,
  onNavigate
}: {
  structure: HouseStructure;
  drawingItems: DrawingItem[];
  pose: CameraPlanPose;
  onNavigate: (target: { targetX: number; targetZ: number }) => void;
}) {
  const size = getStructureSize(structure);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const target = {
    x: THREE.MathUtils.clamp(pose.targetX / MM_TO_M + size.width / 2, 0, size.width),
    y: THREE.MathUtils.clamp(pose.targetZ / MM_TO_M + size.height / 2, 0, size.height)
  };
  const cameraDistance = Math.hypot(pose.targetX - pose.cameraX, pose.targetZ - pose.cameraZ);
  const viewWidth = THREE.MathUtils.clamp(cameraDistance * 360, 650, 1800);
  const viewHeight = viewWidth * 0.62;
  const viewDirection = Math.atan2(pose.targetZ - pose.cameraZ, pose.targetX - pose.cameraX) * 180 / Math.PI;
  const viewRotation = viewDirection + 90;
  const lights = drawingItems.filter((item) => item.category === "light");

  const getPlanPoint = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / Math.max(1, rect.width) * size.width,
      y: (event.clientY - rect.top) / Math.max(1, rect.height) * size.height
    };
  };
  const finishDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };

  return (
    <div
      className="pointer-events-auto absolute right-4 top-24 z-[88] w-48 select-none overflow-hidden rounded-xl border border-white/85 bg-stone-950/82 text-white shadow-[0_12px_36px_rgba(28,25,23,0.28)] backdrop-blur"
      data-testid="lighting-free-browse-minimap"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold tracking-wide">
        <span>视角导航</span>
        <span className="text-white/60">拖动方框</span>
      </div>
      <svg
        aria-label="灯光点位图自由浏览导航"
        className="block aspect-[4/3] w-full touch-none bg-[#f3eee5]"
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          event.preventDefault();
          const point = getPlanPoint(event);
          const planX = THREE.MathUtils.clamp(point.x + drag.offsetX, 0, size.width);
          const planY = THREE.MathUtils.clamp(point.y + drag.offsetY, 0, size.height);
          onNavigate({
            targetX: (planX - size.width / 2) * MM_TO_M,
            targetZ: (planY - size.height / 2) * MM_TO_M
          });
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${size.width} ${size.height}`}
      >
        <rect width={size.width} height={size.height} fill="#f3eee5" />
        {structure.rooms.map((room, index) => (
          <polygon
            key={room.id}
            points={room.boundary.map((point) => `${point.x},${point.y}`).join(" ")}
            fill={index % 2 ? "#e5ddd0" : "#ebe4d9"}
            stroke="#c9bfb2"
            strokeWidth={30}
          />
        ))}
        {structure.walls.map((wall) => wall.kind === "straight" ? (
          <line
            key={wall.id}
            x1={wall.start.x}
            y1={wall.start.y}
            x2={wall.end.x}
            y2={wall.end.y}
            stroke="#57534e"
            strokeLinecap="round"
            strokeWidth={Math.max(48, wall.thickness * 0.52)}
          />
        ) : (
          <polyline
            key={wall.id}
            points={getArcWallPoints(wall, 18).map((point) => `${point.x},${point.y}`).join(" ")}
            fill="none"
            stroke="#57534e"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={Math.max(48, wall.thickness * 0.52)}
          />
        ))}
        {lights.map((light) => (
          <circle key={light.id} cx={light.positionMm.x} cy={light.positionMm.y} r={75} fill="#f59e0b" stroke="#fff7ed" strokeWidth={32} />
        ))}
        <g
          className="cursor-grab active:cursor-grabbing"
          data-testid="lighting-free-browse-viewport"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const svg = event.currentTarget.ownerSVGElement;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const point = {
              x: (event.clientX - rect.left) / Math.max(1, rect.width) * size.width,
              y: (event.clientY - rect.top) / Math.max(1, rect.height) * size.height
            };
            dragRef.current = { pointerId: event.pointerId, offsetX: target.x - point.x, offsetY: target.y - point.y };
            svg.setPointerCapture(event.pointerId);
          }}
          transform={`rotate(${viewRotation} ${target.x} ${target.y})`}
        >
          <rect
            x={target.x - viewWidth / 2}
            y={target.y - viewHeight / 2}
            width={viewWidth}
            height={viewHeight}
            rx={110}
            fill="#2563eb"
            fillOpacity={0.18}
            stroke="#1d4ed8"
            strokeWidth={90}
          />
          <path
            d={`M ${target.x} ${target.y - viewHeight * 0.33} L ${target.x - 120} ${target.y - viewHeight * 0.08} L ${target.x + 120} ${target.y - viewHeight * 0.08} Z`}
            fill="#1d4ed8"
          />
        </g>
      </svg>
    </div>
  );
}

function CameraRig({
  preset,
  fixedView,
  requestVersion,
  freeBrowseVersion,
  mode,
  tourNode,
  mobilePresentationMode,
  navigationRequest,
  movementBounds,
  onCameraPlanPoseChange
}: {
  preset: CameraPreset;
  fixedView: FixedCameraView | null;
  requestVersion: number;
  freeBrowseVersion: number;
  mode: CameraMode;
  tourNode: RoomTourView | null;
  mobilePresentationMode: boolean;
  navigationRequest: CameraPlanNavigationRequest | null;
  movementBounds?: RoomMovementBounds | null;
  onCameraPlanPoseChange: (pose: CameraPlanPose) => void;
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const walkInitializedRef = useRef(false);
  const freeBrowseInitializedRef = useRef(false);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const moveVectorRef = useRef(new THREE.Vector3());
  const forwardVectorRef = useRef(new THREE.Vector3());
  const rightVectorRef = useRef(new THREE.Vector3());
  const poseReportElapsedRef = useRef(0);
  const transitionRef = useRef<{
    elapsed: number;
    duration: number;
    startPosition: THREE.Vector3;
    endPosition: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    startZoom: number;
    endZoom: number;
    startFov: number;
    endFov: number;
  } | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.panSpeed = 0.55;
    controls.rotateSpeed = 0.56;
    controls.zoomSpeed = 0.8;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    controls.minDistance = 0.75;
    controls.maxDistance = 18;
    controls.minPolarAngle = Math.PI / 8;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.target.copy(CAMERA_TARGET);
    controls.update();
    controlsRef.current = controls;
    gl.domElement.style.touchAction = "none";
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
    const isPerspectiveCamera = camera instanceof THREE.PerspectiveCamera;
    transitionRef.current = {
      elapsed: 0,
      duration: 0.9,
      startPosition: camera.position.clone(),
      endPosition: position,
      startTarget: controls?.target.clone() ?? CAMERA_TARGET.clone(),
      endTarget: target,
      startZoom: camera.zoom,
      endZoom: isPerspectiveCamera && fixedView?.mode === "orthographic" ? 1 : fixedView?.zoom ?? 1,
      startFov: isPerspectiveCamera ? camera.fov : 48,
      endFov: tourNode?.fov ?? (mode === "tour" ? 64 : mobilePresentationMode ? 48 : 42)
    };
    // Mobile uses a perspective camera even for legacy orthographic presets, so those
    // presets keep their position/target but not their large orthographic zoom value.
    if (controls) controls.enabled = false;
    walkInitializedRef.current = false;
    // requestVersion is the one-shot boundary. Keeping a selected view active in
    // the UI must never cause later renders to re-apply its position.
  }, [camera, mobilePresentationMode, requestVersion]);

  useEffect(() => {
    if (!freeBrowseInitializedRef.current) {
      freeBrowseInitializedRef.current = true;
      return;
    }
    const controls = controlsRef.current;
    transitionRef.current = null;
    pressedKeysRef.current.clear();
    if (!controls) return;
    controls.enabled = true;
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.minDistance = 0.75;
    controls.maxDistance = 18;
    controls.minPolarAngle = Math.PI / 8;
    controls.maxPolarAngle = Math.PI / 2.08;
    const targetDistance = controls.target.distanceTo(camera.position);
    if (!Number.isFinite(targetDistance) || targetDistance < 0.2) {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      controls.target.copy(camera.position).add(direction.multiplyScalar(3));
    }
    controls.update();
  }, [camera, freeBrowseVersion]);

  useEffect(() => {
    if (!navigationRequest || mode !== "orbit") return;
    const controls = controlsRef.current;
    if (!controls) return;
    transitionRef.current = null;
    const deltaX = navigationRequest.targetX - controls.target.x;
    const deltaZ = navigationRequest.targetZ - controls.target.z;
    camera.position.x += deltaX;
    camera.position.z += deltaZ;
    controls.target.x = navigationRequest.targetX;
    controls.target.z = navigationRequest.targetZ;
    controls.update();
    onCameraPlanPoseChange({
      cameraX: camera.position.x,
      cameraZ: camera.position.z,
      targetX: controls.target.x,
      targetZ: controls.target.z
    });
  }, [camera, mode, navigationRequest, onCameraPlanPoseChange]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.enabled = true;
    controls.enableZoom = true;
    pressedKeysRef.current.clear();
    if (mode === "tour") {
      controls.enableRotate = true;
      controls.enablePan = false;
      controls.minDistance = 0.38;
      controls.maxDistance = 3.4;
      controls.minPolarAngle = Math.PI * 0.35;
      controls.maxPolarAngle = Math.PI * 0.65;
      controls.rotateSpeed = 0.46;
      controls.zoomSpeed = 0.62;
      controls.update();
      return;
    }
    if (mode === "walkthrough" && !walkInitializedRef.current) {
      const position = fixedView
        ? new THREE.Vector3(fixedView.cameraPosition.x, fixedView.cameraPosition.y, fixedView.cameraPosition.z)
        : walkthroughStops[0].position;
      const target = fixedView
        ? new THREE.Vector3(fixedView.target.x, fixedView.target.y, fixedView.target.z)
        : walkthroughStops[0].target;
      transitionRef.current = null;
      camera.position.copy(position);
      controls.target.copy(target);
      camera.lookAt(target);
      controls.enableRotate = true;
      controls.enablePan = false;
      controls.minDistance = 0.35;
      controls.maxDistance = 3.2;
      controls.minPolarAngle = Math.PI * 0.34;
      controls.maxPolarAngle = Math.PI / 1.86;
      controls.update();
      walkInitializedRef.current = true;
      return;
    }
    if (mode === "orbit") {
      controls.enableRotate = true;
      controls.enablePan = true;
      controls.minDistance = 0.75;
      controls.maxDistance = 18;
      controls.maxPolarAngle = Math.PI / 2.08;
      walkInitializedRef.current = false;
      controls.update();
    }
  }, [camera, fixedView, mode]);

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
    const reportCameraPlanPose = () => {
      poseReportElapsedRef.current += delta;
      if (poseReportElapsedRef.current < 0.08) return;
      poseReportElapsedRef.current = 0;
      const controls = controlsRef.current;
      if (!controls) return;
      onCameraPlanPoseChange({
        cameraX: camera.position.x,
        cameraZ: camera.position.z,
        targetX: controls.target.x,
        targetZ: controls.target.z
      });
    };
    const transition = transitionRef.current;
    if (transition && mode !== "walkthrough") {
      transition.elapsed = Math.min(transition.duration, transition.elapsed + delta);
      const rawProgress = transition.elapsed / transition.duration;
      const progress = rawProgress * rawProgress * (3 - 2 * rawProgress);
      camera.position.lerpVectors(transition.startPosition, transition.endPosition, progress);
      const currentTarget = transition.startTarget.clone().lerp(transition.endTarget, progress);
      camera.zoom = THREE.MathUtils.lerp(transition.startZoom, transition.endZoom, progress);
      if (camera instanceof THREE.PerspectiveCamera) camera.fov = THREE.MathUtils.lerp(transition.startFov, transition.endFov, progress);
      controlsRef.current?.target.copy(currentTarget);
      camera.lookAt(currentTarget);
      camera.updateProjectionMatrix();
      controlsRef.current?.update();
      if (rawProgress >= 1) {
        transitionRef.current = null;
        const controls = controlsRef.current;
        if (controls) {
          controls.enabled = true;
          controls.enableZoom = true;
          controls.enableRotate = true;
          controls.enablePan = mode !== "tour";
          controls.update();
        }
      }
      reportCameraPlanPose();
      return;
    }
    if (mode === "tour" && tourNode) {
      const controls = controlsRef.current;
      controls?.update();
      const origin = tourNode.cameraPosition;
      const dx = camera.position.x - origin.x;
      const dz = camera.position.z - origin.z;
      const distanceFromNode = Math.hypot(dx, dz);
      if (distanceFromNode > 2.8) {
        const scale = 2.8 / distanceFromNode;
        camera.position.x = origin.x + dx * scale;
        camera.position.z = origin.z + dz * scale;
      }
      camera.position.y = Math.min(1.95, Math.max(0.9, camera.position.y));
      reportCameraPlanPose();
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
        const candidateX = movementBounds
          ? THREE.MathUtils.clamp(camera.position.x + move.x, movementBounds.minX, movementBounds.maxX)
          : camera.position.x + move.x;
        const candidateZ = movementBounds
          ? THREE.MathUtils.clamp(camera.position.z + move.z, movementBounds.minZ, movementBounds.maxZ)
          : camera.position.z + move.z;
        const hitsFurniture = movementBounds?.blockers.some((blocker) => (
          candidateX > blocker.minX && candidateX < blocker.maxX && candidateZ > blocker.minZ && candidateZ < blocker.maxZ
        ));
        const appliedMove = move.clone();
        if (!hitsFurniture) {
          appliedMove.x = candidateX - camera.position.x;
          appliedMove.z = candidateZ - camera.position.z;
        } else {
          appliedMove.x = 0;
          appliedMove.z = 0;
        }
        camera.position.add(appliedMove);
        controls?.target.add(appliedMove);
        camera.position.y = Math.min(2.25, Math.max(0.85, camera.position.y));
        if (controls) controls.target.y = Math.min(1.65, Math.max(0.35, controls.target.y));
      }
      controls?.update();
      reportCameraPlanPose();
      return;
    }
    const controls = controlsRef.current;
    controls?.update();
    if (mobilePresentationMode && controls) {
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -9, 9);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -9, 9);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.55, 18);
    }
    reportCameraPlanPose();
  });

  return null;
}

type LightingSceneMode = "dayWithLights" | "dusk" | "night" | "artificialOnly" | "beamAnalysis";
type LightingExperienceScope = "wholeHouse" | "currentFloor" | "currentRoom";
export type LightingWallMode = "smartCutaway" | "transparent" | "hideOccluding" | "full";
type LightingAnalysisMode = "none" | "brightness" | "colorTemperature";
type LightingRoomViewMode = "full" | "human" | "top";
type VillaOverviewMode = "wholeVilla" | "singleFloor" | "angled";
export type RoomCeilingMode = "hidden" | "translucent" | "solid";
export type MaterialCategoryFilter = "all" | "structure" | "furniture" | "outdoor";

export type Shared3DSceneSettings = {
  drawingSheetType: DrawingSheetType;
  drawingViewPreset: Drawing3DViewPreset;
  furnitureHeightMode: FurnitureHeightMode;
  materialPreview: boolean;
  designStyle: DesignStylePreset;
  wallDisplayMode: Drawing3DWallMode;
  lightingWallMode: LightingWallMode;
  materialCategoryFilter: MaterialCategoryFilter;
  roomCeilingMode: RoomCeilingMode;
  ceilingSolid: boolean;
  showFixtureModels: boolean;
  showFixtureIds: boolean;
  showBeamCones: boolean;
  showLightSpots: boolean;
  showControlRelations: boolean;
  showIlluminanceLayer: boolean;
  presentationMode: boolean;
  villaExperienceEnabled: boolean;
};

function getFurnitureGeometrySignature(items: Furniture[]) {
  return items
    .map((item) => `${item.id}:${item.dimensions.width}:${item.dimensions.depth}:${item.dimensions.height}:${item.position.x}:${item.position.y}:${item.position.rotation ?? 0}`)
    .sort()
    .join("|");
}

function getWallGeometrySignature(structure: HouseStructure) {
  return structure.walls
    .map((wall) => wall.kind === "arc"
      ? `${wall.id}:${wall.height}:${wall.thickness}:arc:${wall.center.x}:${wall.center.y}:${wall.radius}:${wall.startAngle}:${wall.endAngle}:${wall.direction}`
      : `${wall.id}:${wall.height}:${wall.thickness}:line:${wall.start.x}:${wall.start.y}:${wall.end.x}:${wall.end.y}`)
    .sort()
    .join("|");
}

type LightingSpaceSummary = {
  id: string;
  floorId: Floor["id"];
  name: string;
  kind: "room" | "outdoor";
  lightIds: string[];
  controlGroupIds: string[];
  enabledLightCount: number;
  totalLightCount: number;
  averageBrightness: number;
  dominantColorTemperature: DrawingItem["colorTemperature"];
  status: "dark" | "comfortable" | "bright" | "overbright" | "control-warning";
};

type VillaSpaceDirectoryEntry = {
  id: string;
  floorId: Floor["id"];
  name: string;
  kind: "room" | "outdoor";
  lightCount: number;
  switchCount: number;
};

const villaFloorOrder: Floor["id"][] = ["B2", "B1", "1F", "2F", "YARD"];
const villaFloorShortLabels: Record<Floor["id"], string> = {
  B2: "B2",
  B1: "B1",
  "1F": "1F",
  "2F": "2F",
  YARD: "庭院"
};

const lightingSceneModeLabels: Record<LightingSceneMode, string> = {
  dayWithLights: "日间 + 灯光",
  dusk: "傍晚",
  night: "夜间",
  artificialOnly: "仅人工灯光",
  beamAnalysis: "光束分析"
};

const lightingWallModeLabels: Record<LightingWallMode, string> = {
  smartCutaway: "智能剖切",
  transparent: "半透明墙",
  hideOccluding: "隐藏遮挡墙",
  full: "完整墙体"
};

const lightingStatusLabels: Record<LightingSpaceSummary["status"], string> = {
  dark: "偏暗",
  comfortable: "舒适",
  bright: "明亮",
  overbright: "过亮风险",
  "control-warning": "控制异常"
};

const lightingStatusColors: Record<LightingSpaceSummary["status"], string> = {
  dark: "#334155",
  comfortable: "#65a30d",
  bright: "#f59e0b",
  overbright: "#ef4444",
  "control-warning": "#a855f7"
};

function getLightingSpaceStatus(averageBrightness: number, totalLightCount: number, uncontrolledCount: number): LightingSpaceSummary["status"] {
  if (uncontrolledCount > 0) return "control-warning";
  if (totalLightCount === 0 || averageBrightness < 24) return "dark";
  if (averageBrightness < 66) return "comfortable";
  if (averageBrightness < 88) return "bright";
  return "overbright";
}

function getDominantColorTemperature(items: DrawingItem[]): DrawingItem["colorTemperature"] {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const value = item.colorTemperature ?? "3000K";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return (Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] as DrawingItem["colorTemperature"]) ?? "3000K";
}

function getControlGroupDisplayLabel(groupId: string, items: DrawingItem[]) {
  const signature = `${groupId} ${items.map((item) => `${item.label} ${item.lightType} ${item.lightingLayer}`).join(" ")}`.toUpperCase();
  if (/SINK|水槽/.test(signature)) return "水槽任务灯";
  if (/ISLAND|岛台|PENDANT/.test(signature)) return "岛台灯";
  if (/COUNTER|操作台|UNDERCABINET/.test(signature)) return "操作台照明";
  if (/COOKTOP|灶台|烟机/.test(signature)) return "灶台照明";
  if (/CABINET.*STRIP|柜内/.test(signature)) return "柜内灯";
  if (/CURTAIN|窗帘/.test(signature)) return "窗帘盒灯带";
  if (/AMBIENT|基础|DOWNLIGHT/.test(signature)) return "基础照明";
  if (/ACCENT|射灯|洗墙/.test(signature)) return "重点照明";
  const rawLabel = items[0]?.label?.split("·").slice(1).join("·").trim() || groupId;
  return rawLabel.replace(/控制$/, "").replace(/照明控制$/, "照明");
}

function getColorTemperatureAnalysisColor(value: DrawingItem["colorTemperature"]) {
  if (value === "2700K") return "#f59e0b";
  if (value === "3500K") return "#fde68a";
  if (value === "4000K") return "#bfdbfe";
  return "#fdba74";
}

const drawingItemColors: Record<DrawingItem["category"], string> = {
  socket: "#f59e0b",
  switch: "#2563eb",
  light: "#ffd166",
  waterSupply: "#0ea5e9",
  drainage: "#16a34a",
  ceiling: "#a78bfa",
  floorFinish: "#d97706",
  wallFinish: "#db2777",
  cabinet: "#92400e",
  annotation: "#ef4444",
  network: "#06b6d4",
  ventilation: "#64748b"
};

function colorTemperatureToHex(value: DrawingItem["colorTemperature"]) {
  if (value === "2700K") return "#ffd3a0";
  if (value === "3500K") return "#ffe7c2";
  if (value === "4000K") return "#fff4e5";
  return "#ffddb0";
}

function drawingItemHeightM(item: DrawingItem) {
  if (typeof item.heightMm === "number") return Math.max(0.06, item.heightMm * MM_TO_M);
  if (item.category === "light" || item.category === "ceiling" || item.category === "ventilation") return DEFAULT_CEILING_HEIGHT_MM * MM_TO_M;
  if (item.category === "switch") return 1.2;
  if (item.category === "socket" || item.category === "network") return 0.3;
  if (item.category === "drainage") return 0.08;
  if (item.category === "waterSupply") return 0.45;
  return 1.35;
}

function drawingItemWallRotation(item: DrawingItem, structure: HouseStructure) {
  if (item.category !== "switch" && item.category !== "socket" && item.category !== "network") return 0;
  const point = item.positionMm;
  const straightWalls = structure.walls.filter((wall): wall is Extract<HouseWall, { kind: "straight" }> => wall.kind === "straight");
  const distanceToSegment = (wall: Extract<HouseWall, { kind: "straight" }>) => {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const lengthSquared = dx * dx + dy * dy || 1;
    const t = THREE.MathUtils.clamp(((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / lengthSquared, 0, 1);
    return Math.hypot(point.x - (wall.start.x + dx * t), point.y - (wall.start.y + dy * t));
  };
  const wall = straightWalls.find((candidate) => candidate.id === item.hostWallId) ?? straightWalls.sort((a, b) => distanceToSegment(a) - distanceToSegment(b))[0];
  if (!wall) return 0;
  return lineMetrics(wall.start, wall.end, structure).rotationY;
}

function DrawingItemIdSprite({ text, position }: { text: string; position: [number, number, number] }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 112;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "rgba(20, 24, 28, 0.88)";
      context.roundRect(6, 6, 500, 100, 22);
      context.fill();
      context.fillStyle = "#ffffff";
      context.font = "700 34px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, 256, 56, 470);
    }
    const nextTexture = new THREE.CanvasTexture(canvas);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[1.55, 0.34, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

function DrawingConnection({ from, to, color = "#60a5fa" }: { from: THREE.Vector3; to: THREE.Vector3; color?: string }) {
  const metrics = useMemo(() => {
    const midpoint = from.clone().add(to).multiplyScalar(0.5);
    const direction = to.clone().sub(from);
    const length = Math.max(0.01, direction.length());
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return { midpoint, length, quaternion };
  }, [from.x, from.y, from.z, to.x, to.y, to.z]);
  return (
    <mesh position={metrics.midpoint} quaternion={metrics.quaternion}>
      <cylinderGeometry args={[0.009, 0.009, metrics.length, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} depthWrite={false} />
    </mesh>
  );
}

function SpecialtyCeilingLayer({
  structure,
  drawingItems,
  solid,
  onSelect
}: {
  structure: HouseStructure;
  drawingItems: DrawingItem[];
  solid: boolean;
  onSelect: (id: string) => void;
}) {
  const ceilingItems = drawingItems.filter((item) => item.category === "ceiling" && item.polygon && item.polygon.length >= 3);
  const surfaces = ceilingItems.length > 0
    ? ceilingItems.map((item) => ({ id: item.id, points: item.polygon!, y: (item.ceilingHeightMm ?? item.heightMm ?? DEFAULT_CEILING_HEIGHT_MM) * MM_TO_M }))
    : structure.rooms.map((room) => ({ id: `ceiling-fallback-${room.id}`, points: room.boundary, y: DEFAULT_CEILING_HEIGHT_MM * MM_TO_M }));
  return (
    <group>
      {surfaces.map((surface) => (
        <PolygonSurfaceMesh
          key={surface.id}
          id={surface.id}
          points={surface.points}
          structure={structure}
          y={surface.y}
          color="#f4f0e8"
          roughness={0.76}
          opacity={solid ? 0.94 : 0.24}
          side={THREE.DoubleSide}
          onSelect={surface.id.startsWith("ceiling-fallback-") ? undefined : onSelect}
        />
      ))}
    </group>
  );
}

function DrawingItems3DLayer({
  drawingItems,
  structure,
  selectedObjectId,
  lightingActive,
  lightingScene,
  lightingControlBrightness,
  showFixtureModels,
  showFixtureIds,
  showBeamCones,
  showLightSpots,
  showControlRelations,
  showIlluminanceLayer,
  lightingSelectedGroupId,
  lightingSoloGroupId,
  showRelationshipLines,
  mobilePresentationMode,
  mobileQuality,
  onSelect,
  onToggleControlGroup
}: {
  drawingItems: DrawingItem[];
  structure: HouseStructure;
  selectedObjectId: string;
  lightingActive: boolean;
  lightingScene: LightingSceneMode;
  lightingControlBrightness: ReadonlyMap<string, number>;
  showFixtureModels: boolean;
  showFixtureIds: boolean;
  showBeamCones: boolean;
  showLightSpots: boolean;
  showControlRelations: boolean;
  showIlluminanceLayer: boolean;
  lightingSelectedGroupId?: string | null;
  lightingSoloGroupId?: string | null;
  showRelationshipLines: boolean;
  mobilePresentationMode: boolean;
  mobileQuality: MobileQuality;
  onSelect: (id: string) => void;
  onToggleControlGroup?: (groupId: string) => void;
}) {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const lights = drawingItems.filter((item) => item.category === "light");
  const showTechnicalBeam = lightingScene === "beamAnalysis" || showBeamCones;
  const lightIntensity = lightingScene === "dayWithLights" ? 0.7 : lightingScene === "dusk" ? 1.05 : lightingScene === "beamAnalysis" ? 0.55 : 1.25;
  const selectedItem = drawingItems.find((item) => item.id === selectedObjectId);
  const selectedControlGroup = selectedItem?.category === "switch" ? selectedItem.controlGroupId : null;
  const relationGroups = new Set<string>();
  if (showControlRelations || showRelationshipLines) {
    if (selectedItem?.controlGroupId) relationGroups.add(selectedItem.controlGroupId);
    else if (showControlRelations) drawingItems.forEach((item) => item.controlGroupId && relationGroups.add(item.controlGroupId));
  }
  const relations = Array.from(relationGroups).flatMap((groupId) => {
    const switches = drawingItems.filter((item) => item.category === "switch" && item.controlGroupId === groupId);
    const groupedLights = lights.filter((item) => item.controlGroupId === groupId);
    return switches.flatMap((switchItem) => groupedLights.map((light) => ({ switchItem, light })));
  }).slice(0, mobilePresentationMode ? 8 : 48);

  return (
    <group>
      {drawingItems.map((item, index) => {
        const scenePoint = toScenePoint(item.positionMm, structure);
        const y = drawingItemHeightM(item);
        const selected = selectedObjectId === item.id;
        const hovered = hoveredItemId === item.id;
        const isLight = item.category === "light";
        const controlledBySelection = Boolean(isLight && selectedControlGroup && item.controlGroupId === selectedControlGroup);
        const focusedGroup = Boolean(isLight && lightingSelectedGroupId && item.controlGroupId === lightingSelectedGroupId);
        const switchIsOn = item.category === "switch" && item.controlGroupId ? (lightingControlBrightness.get(item.controlGroupId) ?? 0) > 0 : false;
        const markerColor = selected ? "#2563eb" : hovered ? "#f59e0b" : focusedGroup ? "#f59e0b" : controlledBySelection ? "#60a5fa" : switchIsOn ? "#16a34a" : drawingItemColors[item.category];
        const lightColor = colorTemperatureToHex(item.colorTemperature);
        const beamHeight = Math.max(0.3, y - 0.06);
        const beamRadius = Math.min(2.6, Math.tan(((item.beamAngle ?? 60) * Math.PI / 180) / 2) * beamHeight);
        const allowRealtimeShadow = lightingActive && index < (mobilePresentationMode ? 1 : mobileQuality === "high" ? 6 : 3);
        const controlBrightness = isLight && item.controlGroupId ? (lightingControlBrightness.get(item.controlGroupId) ?? 100) / 100 : 1;
        return (
          <group key={item.id}>
            {(showFixtureModels || !isLight) && (
              <group
                position={[scenePoint.x, y, scenePoint.z]}
                rotation={[0, drawingItemWallRotation(item, structure), 0]}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(item.id);
                  if (item.category === "switch" && item.controlGroupId) onToggleControlGroup?.(item.controlGroupId);
                }}
                onPointerOver={(event) => {
                  event.stopPropagation();
                  setHoveredItemId(item.id);
                  document.body.style.cursor = "pointer";
                }}
                onPointerOut={(event) => {
                  event.stopPropagation();
                  setHoveredItemId((current) => current === item.id ? null : current);
                  document.body.style.cursor = "default";
                }}
              >
                {isLight ? (
                  <>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[selected ? 0.085 : 0.052, selected ? 0.085 : 0.052, 0.032, 24]} />
                      <meshStandardMaterial color={markerColor} emissive={lightColor} emissiveIntensity={lightingActive ? 0.9 : 0.28} roughness={0.25} />
                    </mesh>
                    {(item.mountingType === "pendant" || item.lightType?.toLowerCase().includes("pendant")) && (
                      <mesh position={[0, -0.28, 0]}>
                        <sphereGeometry args={[0.075, 20, 14]} />
                        <meshStandardMaterial color="#d7c1a0" emissive={lightColor} emissiveIntensity={0.5} />
                      </mesh>
                    )}
                  </>
                ) : item.category === "switch" || item.category === "socket" || item.category === "network" ? (
                  <group>
                    <mesh>
                      <boxGeometry args={[selected || hovered ? 0.22 : 0.17, selected || hovered ? 0.22 : 0.17, 0.055]} />
                      <meshStandardMaterial color={markerColor} emissive={markerColor} emissiveIntensity={hovered ? 0.7 : switchIsOn ? 0.38 : 0.22} />
                    </mesh>
                    <mesh>
                      <boxGeometry args={[0.42, 0.42, 0.2]} />
                      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                  </group>
                ) : (
                  <mesh>
                    <sphereGeometry args={[selected ? 0.13 : 0.09, 18, 12]} />
                    <meshStandardMaterial color={markerColor} emissive={markerColor} emissiveIntensity={0.18} />
                  </mesh>
                )}
              </group>
            )}
            {isLight && lightingActive && controlBrightness > 0 && (
              <pointLight
                position={[scenePoint.x, Math.max(0.15, y - 0.12), scenePoint.z]}
                color={lightColor}
                intensity={lightIntensity * (item.dimming ? 1 : 0.82) * controlBrightness}
                distance={Math.max(2.2, beamRadius * 2.6)}
                decay={2}
                castShadow={allowRealtimeShadow}
                shadow-mapSize-width={mobilePresentationMode ? 256 : 512}
                shadow-mapSize-height={mobilePresentationMode ? 256 : 512}
              />
            )}
            {isLight && showTechnicalBeam && (
              <mesh position={[scenePoint.x, y - beamHeight / 2, scenePoint.z]}>
                <coneGeometry args={[beamRadius, beamHeight, 24, 1, true]} />
                <meshBasicMaterial color={lightColor} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
            )}
            {isLight && (showLightSpots || lightingScene === "beamAnalysis" || focusedGroup) && (
              <mesh position={[scenePoint.x, 0.035, scenePoint.z]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[Math.max(0.18, beamRadius), 32]} />
                <meshBasicMaterial color={focusedGroup ? "#f59e0b" : lightColor} transparent opacity={focusedGroup ? 0.28 : 0.18} depthWrite={false} />
              </mesh>
            )}
            {(showFixtureIds || selected || controlledBySelection) && (
              <DrawingItemIdSprite text={item.id} position={[scenePoint.x, y + 0.3, scenePoint.z]} />
            )}
          </group>
        );
      })}
      {relations.map(({ switchItem, light }) => {
        const switchPoint = toScenePoint(switchItem.positionMm, structure);
        const lightPoint = toScenePoint(light.positionMm, structure);
        return (
          <DrawingConnection
            key={`${switchItem.id}-${light.id}`}
            from={new THREE.Vector3(switchPoint.x, drawingItemHeightM(switchItem), switchPoint.z)}
            to={new THREE.Vector3(lightPoint.x, drawingItemHeightM(light), lightPoint.z)}
          />
        );
      })}
      {showIlluminanceLayer && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[getStructureSize(structure).width * MM_TO_M, getStructureSize(structure).height * MM_TO_M, 12, 12]} />
          <meshBasicMaterial color="#facc15" wireframe transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function LightingAnalysisSurfaces({
  structure,
  summaries,
  mode
}: {
  structure: HouseStructure;
  summaries: LightingSpaceSummary[];
  mode: LightingAnalysisMode;
}) {
  if (mode === "none") return null;
  const summaryById = new Map(summaries.map((summary) => [summary.id, summary]));
  const surfaces = [
    ...structure.rooms.map((room) => ({ id: room.id, points: room.boundary })),
    ...structure.outdoors.map((outdoor) => ({ id: outdoor.id, points: outdoor.polygon }))
  ];
  return (
    <group>
      {surfaces.map((surface) => {
        const summary = summaryById.get(surface.id);
        if (!summary || surface.points.length < 3) return null;
        const color = mode === "brightness"
          ? lightingStatusColors[summary.status]
          : getColorTemperatureAnalysisColor(summary.dominantColorTemperature);
        return (
          <PolygonSurfaceMesh
            key={`lighting-analysis-${surface.id}`}
            id={`lighting-analysis-${surface.id}`}
            points={surface.points}
            structure={structure}
            y={0.082}
            color={color}
            roughness={0.62}
            opacity={0.38}
          />
        );
      })}
    </group>
  );
}

function wallSceneMidpoint(wall: HouseWall, structure: HouseStructure) {
  if (wall.kind === "straight") {
    const start = toScenePoint(wall.start, structure);
    const end = toScenePoint(wall.end, structure);
    return new THREE.Vector3((start.x + end.x) / 2, 0, (start.z + end.z) / 2);
  }
  const points = getArcWallPoints(wall, 18);
  const point = toScenePoint(points[Math.floor(points.length / 2)] ?? wall.center, structure);
  return new THREE.Vector3(point.x, 0, point.z);
}

function SmartRoomWalls({
  room,
  structure,
  wallMode,
  wallOpacity,
  selectedObjectId,
  onSelect,
  onHover,
  onClearHover
}: {
  room: HouseStructure["rooms"][number];
  structure: HouseStructure;
  wallMode: LightingWallMode;
  wallOpacity?: number;
  selectedObjectId: string;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const { camera } = useThree();
  const roomWalls = structure.walls.filter((wall) => room.sourceWallIds.includes(wall.id) && resolveVisibility(wall).visible3d);
  const bounds = getSceneBounds(room.boundary, structure);
  const roomCenter = useMemo(() => new THREE.Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2), [bounds.maxX, bounds.maxZ, bounds.minX, bounds.minZ]);
  const [occludingWallId, setOccludingWallId] = useState<string | null>(null);
  const lastEvaluationRef = useRef(0);

  useFrame(({ clock }) => {
    if (wallMode === "full" || wallMode === "transparent" || clock.elapsedTime - lastEvaluationRef.current < 0.18) return;
    lastEvaluationRef.current = clock.elapsedTime;
    const cameraDirection = new THREE.Vector3(camera.position.x - roomCenter.x, 0, camera.position.z - roomCenter.z);
    if (cameraDirection.lengthSq() < 0.02) camera.getWorldDirection(cameraDirection).multiplyScalar(-1);
    cameraDirection.normalize();
    const next = roomWalls
      .map((wall) => {
        const outward = wallSceneMidpoint(wall, structure).sub(roomCenter).setY(0);
        const distance = Math.max(0.01, outward.length());
        return { id: wall.id, score: outward.normalize().dot(cameraDirection) + 0.08 / distance };
      })
      .sort((a, b) => b.score - a.score)[0];
    const nextId = next && next.score > -0.15 ? next.id : null;
    setOccludingWallId((current) => current === nextId ? current : nextId);
  });

  return (
    <group>
      {roomWalls.map((wall) => {
        const cut = wall.id === occludingWallId && wallMode !== "full" && wallMode !== "transparent";
        if (cut) return null;
        return (
          <WallMesh
            key={wall.id}
            wall={wall}
            structure={structure}
            wallColor={isBathroomWall(wall, structure) ? masterBathPalette.wall : designStylePalettes.warmJapandi.wall}
            wallMode="full"
            wallOpacity={wallMode === "transparent" ? 0.24 : wallOpacity}
            selected={selectedObjectId === wall.id}
            onSelect={onSelect}
            onHover={onHover}
            onClearHover={onClearHover}
          />
        );
      })}
    </group>
  );
}

const VILLA_FLOOR_ELEVATION_M: Partial<Record<Floor["id"], number>> = {
  B2: 0,
  B1: 2.8,
  "1F": 5.6,
  "2F": 8.4,
  YARD: 5.6
};
const VILLA_BUILDING_FLOOR_IDS: Floor["id"][] = ["B2", "B1", "1F", "2F"];

function VillaOverviewLayer({
  structuresByFloor,
  stairSystems,
  stairLandings,
  stairOpenings,
  furniture,
  drawingItems,
  designStyle,
  wallMode,
  wallOpacity,
  selectedObjectId,
  selectedFurnitureId,
  onEnterRoom,
  onSelectStructure,
  onSelectFurniture,
  onHoverObject,
  onClearHoverObject
}: {
  structuresByFloor: Partial<Record<Floor["id"], HouseStructure>>;
  stairSystems: StairSystem[];
  stairLandings: StairLanding[];
  stairOpenings: StairOpening[];
  furniture: Furniture[];
  drawingItems: DrawingItem[];
  designStyle: DesignStylePreset;
  wallMode: Drawing3DWallMode;
  wallOpacity?: number;
  selectedObjectId: string;
  selectedFurnitureId: string;
  onEnterRoom: (floorId: Floor["id"], roomId: string) => void;
  onSelectStructure: (id: string) => void;
  onSelectFurniture: (item: Furniture) => void;
  onHoverObject: (id: string) => void;
  onClearHoverObject: (id: string) => void;
}) {
  const floorIds: Floor["id"][] = ["B2", "B1", "1F", "YARD", "2F"];
  const palette = designStylePalettes[designStyle];
  const stairReferenceStructure = structuresByFloor.B2 ?? structuresByFloor.B1 ?? structuresByFloor["1F"] ?? structuresByFloor["2F"];
  const overviewStairSystems = useMemo(() => {
    if (!stairReferenceStructure) return [];
    return stairSystems.map((system) => buildStairRenderSystemGeometry({
      system,
      structuresByFloor,
      currentStructure: stairReferenceStructure,
      currentFloorId: "B2",
      landing: stairLandings.find((candidate) => candidate.id === system.landingId),
      opening: stairOpenings.find((candidate) => candidate.id === system.openingId),
      mode: "system-analysis",
      presentationOffsetMm: 0
    }));
  }, [stairLandings, stairOpenings, stairReferenceStructure, stairSystems, structuresByFloor]);
  return (
    <group>
      {floorIds.map((floorId) => {
        const structure = structuresByFloor[floorId];
        if (!structure) return null;
        const elevation = VILLA_FLOOR_ELEVATION_M[floorId] ?? 0;
        const floorFurniture = furniture.filter((item) => item.floorId === floorId);
        const floorLights = drawingItems.filter((item) => item.floorId === floorId && item.category === "light");
        const floorStairOpenings = stairOpenings.filter((opening) => opening.floorId === floorId);
        return (
          <group key={floorId} position={[0, elevation, 0]}>
            {structure.outdoors.filter((outdoor) => resolveVisibility(outdoor).visible3d).map((outdoor) => (
              <group key={outdoor.id}>
                <OutdoorGroundMesh outdoor={outdoor} structure={structure} onSelect={onSelectStructure} onHover={onHoverObject} onClearHover={onClearHoverObject} />
                {floorId === "YARD" && <PolygonSurfaceMesh id={outdoor.id} points={outdoor.polygon} structure={structure} y={0.086} color="#65a30d" roughness={0.78} opacity={0.045} onSelect={() => onEnterRoom(floorId, outdoor.id)} onHover={onHoverObject} onClearHover={onClearHoverObject} />}
              </group>
            ))}
            {structure.outdoorSurfaces.filter((surface) => resolveVisibility(surface).visible3d).map((surface) => (
              <OutdoorSurfaceMesh key={surface.id} surface={surface} structure={structure} onSelect={onSelectStructure} onHover={onHoverObject} onClearHover={onClearHoverObject} />
            ))}
            {structure.rooms.filter((room) => resolveVisibility(room).visible3d).map((room, index) => (
              <group key={room.id}>
                <RoomFloorMesh room={room} index={index} structure={structure} designStyle={designStyle} openings={/楼梯/.test(room.name) ? floorStairOpenings : []} />
                <PolygonSurfaceMesh
                  id={room.id}
                  points={room.boundary}
                  structure={structure}
                  y={0.086}
                  color={floorId === "1F" ? "#f59e0b" : "#60a5fa"}
                  roughness={0.72}
                  opacity={0.055}
                  onSelect={() => onEnterRoom(floorId, room.id)}
                  onHover={onHoverObject}
                  onClearHover={onClearHoverObject}
                />
              </group>
            ))}
            {structure.walls.filter((wall) => resolveVisibility(wall).visible3d).map((wall) => (
              <WallMesh key={wall.id} wall={wall} structure={structure} wallColor={palette.wall} wallMode={wallMode} wallOpacity={wallOpacity} selected={selectedObjectId === wall.id} onSelect={onSelectStructure} onHover={onHoverObject} onClearHover={onClearHoverObject} />
            ))}
            {structure.partitions.filter((partition) => resolveVisibility(partition).visible3d).map((partition) => (
              <PartitionMesh key={partition.id} partition={partition} structure={structure} wallMode={wallMode} wallOpacity={wallOpacity} selected={selectedObjectId === partition.id} onSelect={onSelectStructure} onHover={onHoverObject} onClearHover={onClearHoverObject} />
            ))}
            {floorStairOpenings.map((opening) => (
              <StairOpeningMesh key={opening.id} opening={opening} elevationMm={0} structure={structure} selected={selectedObjectId === opening.id} showSlabFrame={false} />
            ))}
            {floorFurniture.filter((item) => resolve3DAsset(item).visibleIn3d).map((item) => (
              <ResolvedFurnitureAsset key={item.id} item={item} structure={structure} heightMode="actual" sceneLod="balanced" materialPreview designStyle={designStyle} selected={selectedFurnitureId === item.id || selectedObjectId === item.id} onSelect={onSelectFurniture} onHover={onHoverObject} onClearHover={onClearHoverObject} />
            ))}
            {floorLights.map((item) => {
              const point = toScenePoint(item.positionMm, structure);
              return (
                <mesh key={item.id} position={[point.x, Math.min(2.72, drawingItemHeightM(item)), point.z]}>
                  <sphereGeometry args={[0.055, 14, 10]} />
                  <meshStandardMaterial color="#fff7dc" emissive={colorTemperatureToHex(item.colorTemperature)} emissiveIntensity={0.92} roughness={0.2} />
                </mesh>
              );
            })}
          </group>
        );
      })}
      {stairReferenceStructure && overviewStairSystems.map((renderSystem) => {
        const landing = renderSystem.landing;
        if (!landing) return null;
        const structure = structuresByFloor[renderSystem.system.lowerFloorId] ?? stairReferenceStructure;
        return (
          <StairLandingMesh
            key={landing.landing.id}
            landing={landing.landing}
            elevationMm={landing.finalYMm}
            structure={structure}
            materialPreview
            showLight={false}
            selected={selectedObjectId === landing.landing.id}
            onSelect={onSelectStructure}
            onHover={onHoverObject}
            onClearHover={onClearHoverObject}
          />
        );
      })}
      {stairReferenceStructure && overviewStairSystems.flatMap((renderSystem) => [renderSystem.lowerFlight, renderSystem.upperFlight]
        .filter((flight): flight is NonNullable<typeof flight> => Boolean(flight))
        .map((flight) => {
          const structure = structuresByFloor[flight.sourceFloorId] ?? stairReferenceStructure;
          return (
            <StairMesh
              key={`villa-${renderSystem.system.id}-${flight.stair.id}`}
              stair={{ ...flight.stair, start: flight.floorPlanPoint, end: flight.platformPlanPoint }}
              structure={structure}
              startHeightMm={flight.finalFloorYMm}
              endHeightMm={flight.finalPlatformYMm}
              materialPreview
              muted={false}
              showDirectionCue={false}
              showStepLights={false}
              stepLightHeightAboveTreadMm={renderSystem.system.lighting.stepLightHeightAboveTreadMm}
              landingDepthMm={0}
              directionLabel=""
              selected={selectedObjectId === flight.stair.id}
              onSelect={onSelectStructure}
              onHover={onHoverObject}
              onClearHover={onClearHoverObject}
            />
          );
        }))}
    </group>
  );
}

function resolveSceneWallDisplayMode({
  drawingSheetType,
  drawingViewPreset,
  drawingItems,
  villaExperienceEnabled,
  lightingWallMode
}: {
  drawingSheetType: DrawingSheetType;
  drawingViewPreset: Drawing3DViewPreset;
  drawingItems: DrawingItem[];
  villaExperienceEnabled: boolean;
  lightingWallMode: LightingWallMode;
}): Drawing3DWallMode {
  const drawingProfile = getDrawing3DPresentationProfile(villaExperienceEnabled ? "lightingPlan" : drawingSheetType);
  const lightingActive = (villaExperienceEnabled || drawingSheetType === "lightingPlan") && drawingItems.some((item) => item.category === "light");
  const presetWallDisplayMode: Drawing3DWallMode = drawingViewPreset === "fullSpace" || drawingViewPreset === "interiorTour"
    ? "full"
    : drawingViewPreset === "cutawayEdit" || drawingViewPreset === "currentRoom" || drawingViewPreset === "currentObject"
      ? "cutaway"
      : drawingProfile.wallMode;
  if (!lightingActive) return presetWallDisplayMode;
  if (lightingWallMode === "full") return "full";
  if (lightingWallMode === "transparent") return "exteriorTransparent";
  if (lightingWallMode === "hideOccluding") return "exteriorHidden";
  return "cutaway";
}

function LocalClippingController() {
  const { gl } = useThree();
  useEffect(() => {
    const previous = gl.localClippingEnabled;
    gl.localClippingEnabled = true;
    return () => {
      gl.localClippingEnabled = previous;
    };
  }, [gl]);
  return null;
}

function Floor3DScene({
  drawingSheetType,
  drawingItems,
  allDrawingItems,
  drawingViewPreset,
  villaExperienceEnabled,
  villaOverviewMode,
  currentRoomId,
  currentOutdoorId,
  roomCeilingMode,
  lightingScene,
  lightingControlBrightness,
  showFixtureModels,
  showFixtureIds,
  showBeamCones,
  showLightSpots,
  showControlRelations,
  showIlluminanceLayer,
  lightingExperienceScope,
  lightingWallMode,
  lightingAnalysisMode,
  lightingSpaceSummaries,
  lightingSelectedGroupId,
  lightingSoloGroupId,
  ceilingSolid,
  materialCategoryFilter,
  cameraPreset,
  fixedCameraView,
  cameraRequestVersion,
  freeBrowseVersion,
  cameraMode,
  activeTourNode,
  mobilePresentationMode,
  cameraPlanNavigationRequest = null,
  onCameraPlanPoseChange = () => undefined,
  sceneController,
  explorationDoorStates,
  explorationCabinetStates,
  explorationLightingMode,
  wallDisplayModeOverride,
  furnitureHeightModeOverride,
  materialPreview,
  designStyle,
  presentationMode,
  mobileQuality,
  showServicePoints,
  showStairDebug,
  houseStructure,
  houseStructuresByFloor = {},
  stairSystems = [],
  stairLandings = [],
  stairOpenings = [],
  furniture,
  allFurniture,
  selectedObjectId,
  selectedFurnitureId,
  onSelectStructure,
  onSelectFurniture,
  onSelectDrawingItem,
  onEnterRoom,
  onToggleControlGroup,
  onHoverObject,
  onClearHoverObject
}: {
  drawingSheetType: DrawingSheetType;
  drawingItems: DrawingItem[];
  allDrawingItems: DrawingItem[];
  drawingViewPreset: Drawing3DViewPreset;
  villaExperienceEnabled: boolean;
  villaOverviewMode: VillaOverviewMode;
  currentRoomId?: string | null;
  currentOutdoorId?: string | null;
  roomCeilingMode: RoomCeilingMode;
  lightingScene: LightingSceneMode;
  lightingControlBrightness: ReadonlyMap<string, number>;
  showFixtureModels: boolean;
  showFixtureIds: boolean;
  showBeamCones: boolean;
  showLightSpots: boolean;
  showControlRelations: boolean;
  showIlluminanceLayer: boolean;
  lightingExperienceScope: LightingExperienceScope;
  lightingWallMode: LightingWallMode;
  lightingAnalysisMode: LightingAnalysisMode;
  lightingSpaceSummaries: LightingSpaceSummary[];
  lightingSelectedGroupId?: string | null;
  lightingSoloGroupId?: string | null;
  ceilingSolid: boolean;
  materialCategoryFilter: MaterialCategoryFilter;
  cameraPreset: CameraPreset;
  fixedCameraView: FixedCameraView | null;
  cameraRequestVersion: number;
  freeBrowseVersion: number;
  cameraMode: CameraMode;
  activeTourNode: RoomTourView | null;
  mobilePresentationMode: boolean;
  cameraPlanNavigationRequest?: CameraPlanNavigationRequest | null;
  onCameraPlanPoseChange?: (pose: CameraPlanPose) => void;
  sceneController?: ReactNode;
  explorationDoorStates?: ExplorationDoorStates;
  explorationCabinetStates?: ExplorationCabinetStates;
  explorationLightingMode?: ExplorationLightingMode;
  wallDisplayModeOverride?: Drawing3DWallMode;
  furnitureHeightModeOverride?: FurnitureHeightMode;
  materialPreview: boolean;
  designStyle: DesignStylePreset;
  presentationMode: boolean;
  mobileQuality: MobileQuality;
  showServicePoints: boolean;
  showStairDebug: boolean;
  houseStructure: HouseStructure;
  houseStructuresByFloor: Partial<Record<Floor["id"], HouseStructure>>;
  stairSystems: StairSystem[];
  stairLandings: StairLanding[];
  stairOpenings: StairOpening[];
  furniture: Furniture[];
  allFurniture: Furniture[];
  selectedObjectId: string;
  selectedFurnitureId: string;
  onSelectStructure: (objectId: string) => void;
  onSelectFurniture: (furniture: Furniture) => void;
  onSelectDrawingItem: (drawingItemId: string) => void;
  onEnterRoom: (floorId: Floor["id"], roomId: string) => void;
  onToggleControlGroup: (groupId: string) => void;
  onHoverObject: (objectId: string) => void;
  onClearHoverObject: (objectId: string) => void;
}) {
  const size = getStructureSize(houseStructure);
  const activeStairSystems = useMemo(
    () => stairSystems.filter((system) => system.lowerFloorId === houseStructure.floorId || system.upperFloorId === houseStructure.floorId),
    [houseStructure.floorId, stairSystems]
  );
  const stairAnalysisMode = showStairDebug || Boolean(fixedCameraView?.targetArea?.startsWith("stair"));
  const visibleStairSystems = useMemo(() => {
    if (fixedCameraView?.targetArea === "stair-down") return activeStairSystems.filter((system) => system.upperFloorId === houseStructure.floorId);
    if (fixedCameraView?.targetArea === "stair-up") return activeStairSystems.filter((system) => system.lowerFloorId === houseStructure.floorId);
    return activeStairSystems;
  }, [activeStairSystems, fixedCameraView?.targetArea, houseStructure.floorId]);
  const currentFloorStairOpenings = useMemo(
    () => stairOpenings.filter((opening) => opening.floorId === houseStructure.floorId),
    [houseStructure.floorId, stairOpenings]
  );
  const stairRenderSystems = useMemo(() => visibleStairSystems.map((system) => buildStairRenderSystemGeometry({
    system,
    structuresByFloor: houseStructuresByFloor,
    currentStructure: houseStructure,
    currentFloorId: houseStructure.floorId,
    landing: stairLandings.find((candidate) => candidate.id === system.landingId),
    opening: stairOpenings.find((candidate) => candidate.id === system.openingId),
    mode: stairAnalysisMode ? "system-analysis" : "current-floor",
    presentationOffsetMm: 0
  })), [houseStructure, houseStructuresByFloor, stairAnalysisMode, stairLandings, stairOpenings, visibleStairSystems]);
  const stairFlightsToRender = useMemo(() => stairRenderSystems.flatMap((renderSystem) => [
    renderSystem.lowerFlight,
    renderSystem.upperFlight
  ].filter((flight): flight is NonNullable<typeof flight> => Boolean(flight))), [stairRenderSystems]);
  const drawingProfile = getDrawing3DPresentationProfile(villaExperienceEnabled ? "lightingPlan" : drawingSheetType);
  const lightingActive = (villaExperienceEnabled || drawingSheetType === "lightingPlan") && drawingItems.some((item) => item.category === "light");
  const currentRoom = currentRoomId ? houseStructure.rooms.find((room) => room.id === currentRoomId) ?? null : null;
  const currentOutdoor = currentOutdoorId ? houseStructure.outdoors.find((outdoor) => outdoor.id === currentOutdoorId) ?? null : null;
  const currentRoomWallIds = new Set(currentRoom?.sourceWallIds ?? []);
  const currentSpaceSummary = currentRoomId || currentOutdoorId ? lightingSpaceSummaries.find((summary) => summary.id === (currentRoomId ?? currentOutdoorId)) : null;
  const currentRoomLightIds = new Set(currentSpaceSummary?.lightIds ?? []);
  const currentRoomControlGroupIds = new Set(currentSpaceSummary?.controlGroupIds ?? []);
  const currentRoomActive = villaExperienceEnabled && lightingExperienceScope === "currentRoom" && Boolean(currentRoom);
  const currentOutdoorActive = villaExperienceEnabled && lightingExperienceScope === "currentRoom" && Boolean(currentOutdoor);
  const currentSpaceActive = currentRoomActive || currentOutdoorActive;
  const stackedVillaOverview = villaOverviewMode !== "singleFloor" && (
    mobilePresentationMode
    || (villaExperienceEnabled && lightingExperienceScope === "wholeHouse")
  );
  const sceneMode = explorationLightingMode
    ? "exploration"
    : stackedVillaOverview
      ? "wholeBuilding3d"
      : drawingSheetType === "sitePlan"
        ? "overview3d"
        : "workspace3d";
  const sceneVisibility = resolveUnifiedSceneVisibility({
    mode: sceneMode,
    sheetType: drawingSheetType,
    workspaceFurnitureMode: drawingProfile.furnitureMode,
    workspaceDrawingCategories: drawingProfile.drawingCategories,
    workspaceShowsRelationshipLines: drawingProfile.showRelationshipLines
  });
  const roomMovementBounds = useMemo<RoomMovementBounds | null>(() => {
    if (!currentRoom) return null;
    const bounds = getRoomExperienceSceneBounds(currentRoom, houseStructure, furniture);
    const inset = Math.min(0.38, Math.max(0.18, Math.min(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) * 0.08));
    const blockers = furniture
      .filter((item) => furnitureBelongsToRoomExperience(item, currentRoom) && !isRugLike(item))
      .map((item) => getFurnitureSceneBlocker(item, houseStructure, 0.18));
    return { minX: bounds.minX + inset, maxX: bounds.maxX - inset, minZ: bounds.minZ + inset, maxZ: bounds.maxZ - inset, blockers };
  }, [currentRoom, furniture, houseStructure]);
  const resolvedWallDisplayMode = resolveSceneWallDisplayMode({
    drawingSheetType,
    drawingViewPreset,
    drawingItems,
    villaExperienceEnabled,
    lightingWallMode
  });
  // Phones use one consistent presentation across every drawing specialty:
  // full real wall height with a translucent material. This keeps full-height
  // cabinets and their host walls aligned instead of mixing cutaway geometry
  // with actual-height cabinetry.
  const lightingWallDisplayMode = mobilePresentationMode
    ? "full"
    : wallDisplayModeOverride ?? resolvedWallDisplayMode;
  // Exploration keeps the complete wall geometry for spatial context, but uses
  // a translucent shell so first- and third-person views can read the room
  // beyond it. Collision still comes from the unchanged exploration world.
  const lightingWallOpacity = mobilePresentationMode
    ? 0.22
    : sceneMode === "exploration"
    ? 0.22
    : lightingActive && lightingWallMode === "transparent"
      ? 0.24
      : undefined;
  const showSpecialtyCeiling = drawingProfile.showCeiling && (!lightingActive || lightingExperienceScope === "currentRoom") && roomCeilingMode !== "hidden";
  const palette = designStylePalettes[designStyle];
  const lightingEnvironment = explorationLightingMode
    ? explorationLightingMode === "night"
      ? { ambient: 0.1, key: 0.2, fill: 0.08, background: "#202936" }
      : { ambient: 0.42, key: 1.18, fill: 0.38, background: "#e8e1d4" }
    : lightingActive
    ? lightingScene === "dayWithLights" ? { ambient: 0.3, key: 0.72, fill: 0.22, background: "#d8d2c7" }
      : lightingScene === "dusk" ? { ambient: 0.13, key: 0.24, fill: 0.08, background: "#464754" }
        : lightingScene === "beamAnalysis" ? { ambient: 0.12, key: 0.14, fill: 0.04, background: "#252a32" }
          : lightingScene === "night" ? { ambient: 0.045, key: 0.06, fill: 0.02, background: "#111827" }
            : { ambient: 0.012, key: 0, fill: 0, background: "#070b12" }
    : null;
  const ambientIntensity = lightingEnvironment?.ambient ?? (presentationMode ? 0.56 : 0.48);
  const keyLightIntensity = lightingEnvironment?.key ?? (presentationMode ? 1.92 : 1.68);
  const fillLightIntensity = lightingEnvironment?.fill ?? (presentationMode ? 0.72 : 0.54);
  const floorShadowOpacity = presentationMode ? 0.18 : 0.12;
  const balancedQuality = mobileQuality === "balanced";
  const shadowMapSize = balancedQuality ? 1024 : presentationMode ? 4096 : 2048;
  const relatedFurnitureIds = new Set(drawingItems.map((item) => item.relatedFurnitureId).filter((id): id is string => Boolean(id)));
  const materialPlanHidesFurniture = drawingSheetType === "materialPlan" && (materialCategoryFilter === "structure" || materialCategoryFilter === "outdoor");
  const profileVisibleFurniture = materialPlanHidesFurniture
    ? []
    : filterSceneFurniture({
      furniture,
      policy: sceneVisibility,
      relatedFurnitureIds,
      selectedObjectIds: new Set([selectedFurnitureId, selectedObjectId].filter(Boolean))
    });
  const visibleFurniture = currentRoomActive
    ? profileVisibleFurniture.filter((item) => Boolean(currentRoom && furnitureBelongsToRoomExperience(item, currentRoom)))
    : currentOutdoorActive
      ? profileVisibleFurniture.filter((item) => (item.outdoorId ?? item.roomId) === currentOutdoor?.id)
      : profileVisibleFurniture;
  const furnitureHeightMode: FurnitureAssetGroupProps["heightMode"] = sceneMode === "overview3d" || sceneMode === "exploration"
    ? "actual"
    : furnitureHeightModeOverride
      ?? (!villaExperienceEnabled && lightingWallDisplayMode !== "full" ? "cutaway" : "actual");
  const visibleDrawingItems = filterSceneDrawingItems(drawingItems, sceneVisibility)
    .filter((item) => !currentSpaceActive || (item.relatedRoomId ?? item.roomId) === (currentRoom?.id ?? currentOutdoor?.id) || currentRoomLightIds.has(item.id) || Boolean(item.controlGroupId && currentRoomControlGroupIds.has(item.controlGroupId)));
  const visibleDrawingItems3D = filterSceneDrawingItems(visibleDrawingItems, sceneVisibility, "physical");
  const materialPlanShowsStructure = drawingSheetType !== "materialPlan" || materialCategoryFilter === "all" || materialCategoryFilter === "structure";
  const materialPlanShowsOutdoors = drawingSheetType !== "materialPlan" || materialCategoryFilter === "all" || materialCategoryFilter === "outdoor";
  const selectedFurnitureMaterial = drawingSheetType === "materialPlan" && selectedObjectId
    ? furniture.find((item) => item.id === selectedObjectId)
    : null;
  const selectedFurnitureMaterialText = selectedFurnitureMaterial ? materialText(selectedFurnitureMaterial) : "";
  const relatedWallIds = new Set(visibleDrawingItems.flatMap((item) => [item.hostWallId, item.wallId]).filter((id): id is string => Boolean(id)));
  return (
    <>
      <LocalClippingController />
      <RenderToneMapping presentationMode={presentationMode} mobilePresentationMode={mobilePresentationMode} mobileQuality={mobileQuality} />
      {sceneController ?? <CameraRig
        preset={cameraPreset}
        fixedView={fixedCameraView}
        requestVersion={cameraRequestVersion}
        freeBrowseVersion={freeBrowseVersion}
        mode={cameraMode}
        tourNode={activeTourNode}
        mobilePresentationMode={mobilePresentationMode}
        navigationRequest={cameraPlanNavigationRequest}
        movementBounds={roomMovementBounds}
        onCameraPlanPoseChange={onCameraPlanPoseChange}
      />}
      <color attach="background" args={[lightingEnvironment?.background ?? palette.background]} />
      <fog attach="fog" args={[lightingEnvironment?.background ?? palette.background, 12, 28]} />
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        castShadow={!mobilePresentationMode || mobileQuality === "high"}
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
      <spotLight color="#ffd99b" intensity={fillLightIntensity} position={[-5.8, 4.8, 5.6]} angle={0.62} penumbra={0.76} distance={14} castShadow={!lightingActive && !balancedQuality} />
      <hemisphereLight args={["#fff4d6", lightingEnvironment?.background ?? palette.background, lightingActive ? ambientIntensity * 0.6 : presentationMode ? 0.56 : 0.48]} />

      {!currentSpaceActive && <mesh receiveShadow position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 14]} />
        <shadowMaterial color="#8b8071" transparent opacity={floorShadowOpacity} depthWrite={false} />
      </mesh>}

      {stackedVillaOverview ? (
        <VillaOverviewLayer
          structuresByFloor={houseStructuresByFloor}
          stairSystems={stairSystems}
          stairLandings={stairLandings}
          stairOpenings={stairOpenings}
          furniture={allFurniture}
          drawingItems={allDrawingItems}
          designStyle={designStyle}
          wallMode={mobilePresentationMode ? "full" : "cutaway"}
          wallOpacity={mobilePresentationMode ? 0.22 : undefined}
          selectedObjectId={selectedObjectId}
          selectedFurnitureId={selectedFurnitureId}
          onEnterRoom={onEnterRoom}
          onSelectStructure={onSelectStructure}
          onSelectFurniture={onSelectFurniture}
          onHoverObject={onHoverObject}
          onClearHoverObject={onClearHoverObject}
        />
      ) : <>
      {drawingProfile.showOutdoors && materialPlanShowsOutdoors && !currentRoomActive && houseStructure.outdoors.filter((outdoor) => resolveVisibility(outdoor).visible3d && (!currentOutdoorActive || outdoor.id === currentOutdoor?.id)).map((outdoor) => (
        <OutdoorGroundMesh
          key={outdoor.id}
          outdoor={outdoor}
          structure={houseStructure}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}
      {drawingProfile.showOutdoors && materialPlanShowsOutdoors && !currentRoomActive && houseStructure.outdoorSurfaces.filter((surface) => {
        if (!resolveVisibility(surface).visible3d) return false;
        if (!currentOutdoorActive || !currentOutdoor) return true;
        const center = surface.polygon.reduce((sum, point) => ({ x: sum.x + point.x / surface.polygon.length, y: sum.y + point.y / surface.polygon.length }), { x: 0, y: 0 });
        return pointInPolygon(center, currentOutdoor.polygon);
      }).map((surface) => (
        <OutdoorSurfaceMesh
          key={surface.id}
          surface={surface}
          structure={houseStructure}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.rooms.filter((room) => resolveVisibility(room).visible3d && (!currentSpaceActive || (currentRoomActive && room.id === currentRoom?.id))).map((room, index) => (
        <RoomFloorMesh key={room.id} room={room} index={index} structure={houseStructure} designStyle={designStyle} openings={/楼梯/.test(room.name) ? currentFloorStairOpenings : []} />
      ))}
      {currentRoomActive && currentRoom && (
        <KitchenExperienceFloorExtension room={currentRoom} structure={houseStructure} furniture={visibleFurniture} designStyle={designStyle} />
      )}
      {villaExperienceEnabled && lightingExperienceScope === "currentFloor" && houseStructure.rooms.filter((room) => resolveVisibility(room).visible3d).map((room) => (
        <PolygonSurfaceMesh key={`${room.id}-villa-entry`} id={room.id} points={room.boundary} structure={houseStructure} y={0.09} color="#f59e0b" roughness={0.72} opacity={0.045} onSelect={() => onEnterRoom(houseStructure.floorId, room.id)} onHover={onHoverObject} onClearHover={onClearHoverObject} />
      ))}
      {villaExperienceEnabled && lightingExperienceScope === "currentFloor" && houseStructure.outdoors.filter((outdoor) => resolveVisibility(outdoor).visible3d).map((outdoor) => (
        <PolygonSurfaceMesh key={`${outdoor.id}-villa-entry`} id={outdoor.id} points={outdoor.polygon} structure={houseStructure} y={0.09} color="#65a30d" roughness={0.78} opacity={0.045} onSelect={() => onEnterRoom(houseStructure.floorId, outdoor.id)} onHover={onHoverObject} onClearHover={onClearHoverObject} />
      ))}
      {houseStructure.rooms.filter((room) => resolveVisibility(room).visible3d && (!currentSpaceActive || (currentRoomActive && room.id === currentRoom?.id)) && !(/楼梯/.test(room.name) && currentFloorStairOpenings.length > 0)).map((room) => (
        <RoomFloorFinishOverlay key={`${room.id}-floor-finish`} room={room} structure={houseStructure} designStyle={designStyle} />
      ))}
      {houseStructure.rooms.filter((room) => resolveVisibility(room).visible3d && (!currentSpaceActive || (currentRoomActive && room.id === currentRoom?.id))).map((room) => (
        <RoomAmbientOcclusion key={`${room.id}-ambient-occlusion`} room={room} structure={houseStructure} />
      ))}
      {!lightingActive && drawingProfile.materialMode === "realistic" && <RoomLightingPlaceholders structure={houseStructure} designStyle={designStyle} />}

      {showSpecialtyCeiling && (
        currentRoom ? (
          <PolygonSurfaceMesh
            id={`room-ceiling-${currentRoom.id}`}
            points={currentRoom.boundary}
            structure={houseStructure}
            y={(currentRoom.finishedCeilingHeightMm ?? resolveStructureStoryHeightMm(houseStructure)) * MM_TO_M}
            color="#eee8dc"
            roughness={0.76}
            opacity={roomCeilingMode === "solid" ? 0.94 : 0.2}
            side={THREE.DoubleSide}
          />
        ) : (
          <SpecialtyCeilingLayer structure={houseStructure} drawingItems={visibleDrawingItems} solid={ceilingSolid} onSelect={onSelectDrawingItem} />
        )
      )}

      {materialPlanShowsStructure && currentRoomActive && currentRoom ? (
        <SmartRoomWalls
          room={currentRoom}
          structure={houseStructure}
          wallMode={lightingWallMode}
          wallOpacity={lightingWallOpacity}
          selectedObjectId={selectedObjectId}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ) : materialPlanShowsStructure && houseStructure.walls.filter((wall) => resolveVisibility(wall).visible3d).map((wall) => {
        const policy = getWallRenderPolicy(wall, houseStructure, lightingWallDisplayMode);
        if (!policy.visible) return null;
        return (
          <WallMesh
            key={wall.id}
            wall={wall}
            structure={houseStructure}
            wallColor={drawingSheetType === "wallFinishPlan" && relatedWallIds.has(wall.id) ? "#f0a5c7" : isBathroomWall(wall, houseStructure) ? masterBathPalette.wall : palette.wall}
            wallMode={lightingWallDisplayMode}
            wallOpacity={policy.opacity ?? lightingWallOpacity}
            selected={selectedObjectId === wall.id}
            onSelect={onSelectStructure}
            onHover={onHoverObject}
            onClearHover={onClearHoverObject}
          />
        );
      })}

      {!currentRoomActive && houseStructure.fences.filter((fence) => resolveVisibility(fence).visible3d).map((fence) => (
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

      {!currentRoomActive && houseStructure.partitions.filter((partition) => resolveVisibility(partition).visible3d).map((partition) => (
        <PartitionMesh
          key={partition.id}
          partition={partition}
          structure={houseStructure}
          wallMode={lightingWallDisplayMode}
          wallOpacity={lightingWallOpacity}
          selected={selectedObjectId === partition.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {(houseStructure.columns ?? []).filter((column) => resolveVisibility(column).visible3d && (!currentRoomActive || Boolean(currentRoom && pointInPolygon(column.center, currentRoom.boundary)))).map((column) => (
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

      {houseStructure.doors.filter((door) => resolveVisibility(door).visible3d && (!currentRoomActive || currentRoomWallIds.has(door.hostId))).map((door) => (
        <OpeningMesh
          key={door.id}
          opening={door}
          structure={houseStructure}
          selected={selectedObjectId === door.id}
          explorationDoorState={explorationDoorStates?.[door.id]}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.windows.filter((windowObject) => resolveVisibility(windowObject).visible3d && (!currentRoomActive || currentRoomWallIds.has(windowObject.hostId))).map((windowObject) => (
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

      {houseStructure.bayWindows.filter((bayWindow) => resolveVisibility(bayWindow).visible3d && (!currentRoomActive || currentRoomWallIds.has(bayWindow.wallId))).map((bayWindow) => (
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

      {houseStructure.skylights.filter((skylight) => resolveVisibility(skylight).visible3d && (!currentRoomActive || Boolean(currentRoom && pointInPolygon(skylight.center, currentRoom.boundary)))).map((skylight) => (
        <SkylightMesh
          key={skylight.id}
          skylight={skylight}
          structure={houseStructure}
          wallMode={lightingWallDisplayMode}
          selected={selectedObjectId === skylight.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {(!currentRoomActive || /楼梯/.test(currentRoom?.name ?? "")) && stairRenderSystems.map((renderSystem) => {
        const opening = renderSystem.opening;
        if (!opening) return null;
        return <StairOpeningMesh key={opening.opening.id} opening={opening.opening} elevationMm={opening.finalYMm} structure={houseStructure} selected={selectedObjectId === opening.opening.id} showSlabFrame={stairAnalysisMode && Math.abs(opening.realYMm) > 1} />;
      })}

      {(!currentRoomActive || /楼梯/.test(currentRoom?.name ?? "")) && stairRenderSystems.map((renderSystem) => {
        const landing = renderSystem.landing;
        if (!landing) return null;
        return (
          <StairLandingMesh
            key={landing.landing.id}
            landing={landing.landing}
            elevationMm={landing.finalYMm}
            structure={houseStructure}
            materialPreview={materialPreview}
            showLight={lightingActive}
            selected={selectedObjectId === landing.landing.id || selectedObjectId === renderSystem.system.lowerFlightId || selectedObjectId === renderSystem.system.upperFlightId}
            onSelect={onSelectStructure}
            onHover={onHoverObject}
            onClearHover={onClearHoverObject}
          />
        );
      })}

      {(!currentRoomActive || /楼梯/.test(currentRoom?.name ?? "")) && stairFlightsToRender.filter(({ stair }) => resolveVisibility(stair).visible3d).map((flight) => {
        const renderStair = {
          ...flight.stair,
          start: flight.floorPlanPoint,
          end: flight.platformPlanPoint
        };
        const system = stairRenderSystems.find((candidate) => candidate.system.id === flight.systemId)?.system;
        if (!system) return null;
        return (
        <StairMesh
          key={`${system.id}-${flight.stair.id}`}
          stair={renderStair}
          structure={houseStructure}
          startHeightMm={flight.finalFloorYMm}
          endHeightMm={flight.finalPlatformYMm}
          materialPreview={materialPreview}
          muted={flight.muted}
          showDirectionCue={!materialPreview && !flight.muted}
          showStepLights={lightingActive}
          stepLightHeightAboveTreadMm={system.lighting.stepLightHeightAboveTreadMm}
          landingDepthMm={0}
          directionLabel={`${flight.stair.direction === "down" ? "下至" : "上至"} ${flight.stair.connectedToFloorId ?? ""}`}
          selected={selectedObjectId === flight.stair.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
        );
      })}

      {visibleFurniture.filter((item) => resolve3DAsset(item).visibleIn3d).map((item) => (
        <FurnitureContactShadow key={`${item.id}-contact-shadow`} item={item} structure={houseStructure} />
      ))}

      {visibleFurniture.map((item) => (
        <ResolvedFurnitureAsset
          key={item.id}
          item={item}
          structure={houseStructure}
          heightMode={furnitureHeightMode}
          sceneLod={sceneVisibility.lod}
          cabinetOpenAmount={explorationCabinetStates?.[item.id]?.currentAmount}
          materialPreview={materialPreview}
          designStyle={designStyle}
          selected={selectedFurnitureId === item.id || selectedObjectId === item.id || Boolean(selectedFurnitureMaterialText && materialText(item) === selectedFurnitureMaterialText)}
          onSelect={onSelectFurniture}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {!villaExperienceEnabled && (showServicePoints || sceneVisibility.showConstructionAnchors) && visibleFurniture.filter((item) => resolve3DAsset(item).visibleIn3d).map((item) => (
        <FurnitureServiceMarkers
          key={`${item.id}-service-markers`}
          item={item}
          structure={houseStructure}
          drawingSheetType={drawingSheetType}
          selected={selectedFurnitureId === item.id || selectedObjectId === item.id}
          onSelect={onSelectFurniture}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

        <DrawingItems3DLayer
        drawingItems={visibleDrawingItems3D}
        structure={houseStructure}
        selectedObjectId={selectedObjectId}
        lightingActive={lightingActive}
        lightingScene={lightingScene}
        showFixtureModels={showFixtureModels}
        showFixtureIds={showFixtureIds}
        showBeamCones={showBeamCones}
        showLightSpots={showLightSpots}
        showControlRelations={showControlRelations}
        showIlluminanceLayer={showIlluminanceLayer}
        showRelationshipLines={sceneVisibility.showRelationshipLines}
        mobilePresentationMode={mobilePresentationMode}
        mobileQuality={mobileQuality}
        lightingControlBrightness={lightingControlBrightness}
        onSelect={onSelectDrawingItem}
        onToggleControlGroup={onToggleControlGroup}
      />

      {lightingActive && (
        <LightingAnalysisSurfaces
          structure={houseStructure}
          summaries={lightingSpaceSummaries}
          mode={lightingAnalysisMode}
        />
      )}

      {drawingSheetType === "floorFinishPlan" && visibleDrawingItems.filter((item) => item.category === "floorFinish" && item.polygon && item.polygon.length >= 3).map((item) => (
        <PolygonSurfaceMesh
          key={`${item.id}-specialty-surface`}
          id={item.id}
          points={item.polygon!}
          structure={houseStructure}
          y={0.055}
          color="#d8b47a"
          roughness={0.62}
          opacity={0.88}
          onSelect={onSelectDrawingItem}
        />
      ))}

      {!materialPreview && <gridHelper args={[14, 14, palette.floorJoint, palette.grid]} position={[0, 0.006, 0]} />}
      {showStairDebug && <StairDebugGeometryLayer systems={stairRenderSystems} structure={houseStructure} />}
      </>}
    </>
  );
}

type Exploration3DViewProps = {
  floor: Floor;
  houseStructure: HouseStructure;
  houseStructuresByFloor: Partial<Record<Floor["id"], HouseStructure>>;
  stairSystems: StairSystem[];
  stairLandings: StairLanding[];
  stairOpenings: StairOpening[];
  furniture: Furniture[];
  allFurniture: Furniture[];
  drawingItems: DrawingItem[];
  allDrawingItems: DrawingItem[];
  sceneSettings: Shared3DSceneSettings;
  collisionWorld: ExplorationCollisionWorld;
  spawnPosition: ExplorationPoint;
  doorStates: ExplorationDoorStates;
  cabinetStates: ExplorationCabinetStates;
  viewMode: ExplorationViewMode;
  lightingMode: ExplorationLightingMode;
  resetRequest: number;
  onToggleDoor: (doorId: string) => void;
  onToggleCabinet: (cabinetId: string) => void;
  onToggleView: () => void;
  onExit: () => void;
  onFloorTransition: (floorId: Floor["id"]) => void;
  onPositionChange: (position: ExplorationPoint, walking: boolean) => void;
  onNearbyDoorChange: (doorId: string | null) => void;
  onNearbyCabinetChange: (cabinetId: string | null) => void;
  onPointerLockChange: (locked: boolean) => void;
};

const EXPLORATION_THIRD_PERSON_FOV = 70;
const EXPLORATION_THIRD_PERSON_DISTANCE = 6.2;
const EXPLORATION_THIRD_PERSON_HEIGHT = 5.3;
const EXPLORATION_THIRD_PERSON_LOOK_AHEAD = 1.2;
const EXPLORATION_THIRD_PERSON_SIDE_ANGLE = 0.38;
const EXPLORATION_FIRST_PERSON_FOV = 74;
const EXPLORATION_FIRST_PERSON_EYE_HEIGHT = 1.62;
const EXPLORATION_FIRST_PERSON_MIN_PITCH = -1.02;
const EXPLORATION_FIRST_PERSON_MAX_PITCH = 0.88;

function ExplorationCharacterController({
  world,
  structure,
  furniture,
  structuresByFloor,
  spawnPosition,
  viewMode,
  resetRequest,
  onToggleDoor,
  onToggleCabinet,
  onToggleView,
  onExit,
  onFloorTransition,
  onPositionChange,
  onNearbyDoorChange,
  onNearbyCabinetChange,
  onPointerLockChange
}: {
  world: ExplorationCollisionWorld;
  structure: HouseStructure;
  furniture: Furniture[];
  structuresByFloor: Partial<Record<Floor["id"], HouseStructure>>;
  spawnPosition: ExplorationPoint;
  viewMode: ExplorationViewMode;
  resetRequest: number;
  onToggleDoor: (doorId: string) => void;
  onToggleCabinet: (cabinetId: string) => void;
  onToggleView: () => void;
  onExit: () => void;
  onFloorTransition: (floorId: Floor["id"]) => void;
  onPositionChange: (position: ExplorationPoint, walking: boolean) => void;
  onNearbyDoorChange: (doorId: string | null) => void;
  onNearbyCabinetChange: (cabinetId: string | null) => void;
  onPointerLockChange: (locked: boolean) => void;
}) {
  const { camera, gl } = useThree();
  const characterRef = useRef<THREE.Group | null>(null);
  const leftArmRef = useRef<THREE.Group | null>(null);
  const rightArmRef = useRef<THREE.Group | null>(null);
  const leftLegRef = useRef<THREE.Group | null>(null);
  const rightLegRef = useRef<THREE.Group | null>(null);
  const keysRef = useRef(new Set<string>());
  const positionRef = useRef<ExplorationPoint>({ ...spawnPosition });
  const yawRef = useRef(Math.PI);
  const pitchRef = useRef(-0.12);
  const walkingRef = useRef(false);
  const nearbyDoorIdRef = useRef<string | null>(null);
  const nearbyCabinetIdRef = useRef<string | null>(null);
  const transitionCooldownRef = useRef(0);
  const reportElapsedRef = useRef(0);
  const gaitElapsedRef = useRef(0);
  const worldRef = useRef(world);
  const structureRef = useRef(structure);
  const furnitureRef = useRef(furniture);
  const forwardRef = useRef(new THREE.Vector3());
  const rightRef = useRef(new THREE.Vector3());
  const moveRef = useRef(new THREE.Vector3());
  const desiredCameraRef = useRef(new THREE.Vector3());
  const lookTargetRef = useRef(new THREE.Vector3());
  const spawnRef = useRef(spawnPosition);
  const callbacksRef = useRef({
    onToggleDoor,
    onToggleCabinet,
    onToggleView,
    onExit,
    onFloorTransition,
    onPositionChange,
    onNearbyDoorChange,
    onNearbyCabinetChange,
    onPointerLockChange
  });
  worldRef.current = world;
  structureRef.current = structure;
  furnitureRef.current = furniture;
  spawnRef.current = spawnPosition;
  callbacksRef.current = {
    onToggleDoor,
    onToggleCabinet,
    onToggleView,
    onExit,
    onFloorTransition,
    onPositionChange,
    onNearbyDoorChange,
    onNearbyCabinetChange,
    onPointerLockChange
  };

  const resetCharacter = () => {
    const safe = findNearestSafeExplorationPosition(worldRef.current, spawnRef.current) ?? spawnRef.current;
    positionRef.current = { ...safe };
    walkingRef.current = false;
    transitionCooldownRef.current = 0.7;
    callbacksRef.current.onPositionChange(positionRef.current, false);
  };

  useEffect(() => {
    resetCharacter();
  }, [resetRequest]);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.fov = viewMode === "firstPerson" ? EXPLORATION_FIRST_PERSON_FOV : EXPLORATION_THIRD_PERSON_FOV;
    camera.updateProjectionMatrix();
  }, [camera, viewMode]);

  useEffect(() => {
    const current = positionRef.current;
    if (isExplorationPositionSafe(world, current)) {
      current.y = getExplorationGroundHeight(world, current, current.y);
      return;
    }
    const safe = findNearestSafeExplorationPosition(world, current) ?? spawnRef.current;
    positionRef.current = { ...safe };
    callbacksRef.current.onPositionChange(positionRef.current, false);
  }, [world]);

  useEffect(() => {
    const canvas = gl.domElement;
    const requestPointerLock = () => {
      if (document.pointerLockElement !== canvas) void canvas.requestPointerLock?.();
    };
    const handlePointerLockChange = () => callbacksRef.current.onPointerLockChange(document.pointerLockElement === canvas);
    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yawRef.current -= event.movementX * 0.0025;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current - event.movementY * 0.00225,
        EXPLORATION_FIRST_PERSON_MIN_PITCH,
        EXPLORATION_FIRST_PERSON_MAX_PITCH
      );
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const blockedEditorShortcut = event.key === "Delete"
        || event.key === "Backspace"
        || ((event.metaKey || event.ctrlKey) && ["z", "y", "x", "c", "v"].includes(event.key.toLowerCase()));
      if (blockedEditorShortcut) event.preventDefault();
      if (event.code === "Escape") {
        event.preventDefault();
        callbacksRef.current.onExit();
        return;
      }
      if (event.code === "KeyR") {
        event.preventDefault();
        resetCharacter();
        return;
      }
      if (event.code === "KeyV" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        callbacksRef.current.onToggleView();
        return;
      }
      if (event.code === "KeyE") {
        event.preventDefault();
        const cabinet = findNearestExplorationCabinet(
          furnitureRef.current,
          structureRef.current,
          positionRef.current,
          yawRef.current,
          pitchRef.current
        );
        if (cabinet) {
          callbacksRef.current.onToggleCabinet(cabinet.item.id);
          return;
        }
        const nearest = findNearestExplorationDoor(worldRef.current, positionRef.current);
        if (nearest) callbacksRef.current.onToggleDoor(nearest.door.id);
        return;
      }
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
        keysRef.current.add(event.code);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.code);
    };
    canvas.addEventListener("click", requestPointerLock);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    return () => {
      canvas.removeEventListener("click", requestPointerLock);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      keysRef.current.clear();
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      callbacksRef.current.onPointerLockChange(false);
    };
  }, [gl.domElement]);

  useFrame((_, delta) => {
    const safeDelta = Math.min(delta, 0.05);
    transitionCooldownRef.current = Math.max(0, transitionCooldownRef.current - safeDelta);
    const keys = keysRef.current;
    const forwardAmount = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
    const rightAmount = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const move = moveRef.current.set(0, 0, 0);
    const forward = forwardRef.current.set(Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));
    const right = rightRef.current.set(Math.cos(yawRef.current), 0, Math.sin(yawRef.current));
    move.addScaledVector(forward, forwardAmount).addScaledVector(right, rightAmount);
    walkingRef.current = move.lengthSq() > 0.0001;
    if (walkingRef.current) {
      move.normalize().multiplyScalar(safeDelta * 1.65);
      const current = positionRef.current;
      const next = resolveExplorationMovement(worldRef.current, current, {
        x: current.x + move.x,
        y: current.y,
        z: current.z + move.z
      });
      next.y = getExplorationGroundHeight(worldRef.current, next, current.y);
      positionRef.current = next;
      if (characterRef.current) characterRef.current.rotation.y = Math.atan2(move.x, move.z);

      if (transitionCooldownRef.current <= 0) {
        const stair = findExplorationStairTransition(worldRef.current, next);
        const targetFloorId = stair?.connectedToFloorId;
        const targetStructure = targetFloorId ? structuresByFloor[targetFloorId] : null;
        const arrival = targetStructure && stair ? getConnectedStairArrival(targetStructure, stair) : null;
        if (targetFloorId && targetStructure && arrival) {
          positionRef.current = { ...arrival.position };
          const targetStair = targetStructure.stairs.find((candidate) => candidate.id === arrival.stairId);
          if (targetStair) {
            const targetStart = toScenePoint(targetStair.start, targetStructure);
            const targetEnd = toScenePoint(targetStair.end, targetStructure);
            yawRef.current = Math.atan2(targetStart.x - targetEnd.x, -(targetStart.z - targetEnd.z));
          }
          transitionCooldownRef.current = 1.1;
          callbacksRef.current.onFloorTransition(targetFloorId);
        }
      }
    }

    const position = positionRef.current;
    if (characterRef.current) {
      characterRef.current.position.set(position.x, position.y + 0.025, position.z);
      characterRef.current.visible = viewMode === "thirdPerson";
    }

    gaitElapsedRef.current += safeDelta * (walkingRef.current ? 9 : 2.2);
    const gait = walkingRef.current ? Math.sin(gaitElapsedRef.current) * 0.58 : Math.sin(gaitElapsedRef.current) * 0.05;
    if (leftArmRef.current) leftArmRef.current.rotation.x = gait;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -gait;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -gait;
    if (rightLegRef.current) rightLegRef.current.rotation.x = gait;
    if (characterRef.current) characterRef.current.position.y += walkingRef.current ? Math.abs(Math.sin(gaitElapsedRef.current * 2)) * 0.018 : Math.sin(gaitElapsedRef.current) * 0.008;

    if (viewMode === "firstPerson") {
      camera.position.set(position.x, position.y + EXPLORATION_FIRST_PERSON_EYE_HEIGHT, position.z);
      lookTargetRef.current.set(
        position.x + Math.sin(yawRef.current) * Math.cos(pitchRef.current),
        position.y + EXPLORATION_FIRST_PERSON_EYE_HEIGHT + Math.sin(pitchRef.current),
        position.z - Math.cos(yawRef.current) * Math.cos(pitchRef.current)
      );
      camera.lookAt(lookTargetRef.current);
    } else {
      // The overview camera deliberately sits above wall height. Keeping its
      // plan position inside room collision would squeeze it against the
      // character in small rooms and remove the spatial overview.
      const cameraYaw = yawRef.current + EXPLORATION_THIRD_PERSON_SIDE_ANGLE;
      desiredCameraRef.current.set(
        position.x - Math.sin(cameraYaw) * EXPLORATION_THIRD_PERSON_DISTANCE,
        position.y + EXPLORATION_THIRD_PERSON_HEIGHT - pitchRef.current * 2,
        position.z + Math.cos(cameraYaw) * EXPLORATION_THIRD_PERSON_DISTANCE
      );
      camera.position.lerp(desiredCameraRef.current, 1 - Math.exp(-safeDelta * 5));
      lookTargetRef.current.set(
        position.x + Math.sin(yawRef.current) * EXPLORATION_THIRD_PERSON_LOOK_AHEAD,
        position.y + 0.78,
        position.z - Math.cos(yawRef.current) * EXPLORATION_THIRD_PERSON_LOOK_AHEAD
      );
      camera.lookAt(lookTargetRef.current);
    }

    const nearestDoor = findNearestExplorationDoor(worldRef.current, position);
    const nextNearbyDoorId = nearestDoor?.door.id ?? null;
    if (nearbyDoorIdRef.current !== nextNearbyDoorId) {
      nearbyDoorIdRef.current = nextNearbyDoorId;
      callbacksRef.current.onNearbyDoorChange(nextNearbyDoorId);
    }
    const nearestCabinet = findNearestExplorationCabinet(
      furnitureRef.current,
      structureRef.current,
      position,
      yawRef.current,
      pitchRef.current
    );
    const nextNearbyCabinetId = nearestCabinet?.item.id ?? null;
    if (nearbyCabinetIdRef.current !== nextNearbyCabinetId) {
      nearbyCabinetIdRef.current = nextNearbyCabinetId;
      callbacksRef.current.onNearbyCabinetChange(nextNearbyCabinetId);
    }
    reportElapsedRef.current += safeDelta;
    if (reportElapsedRef.current >= 0.14) {
      reportElapsedRef.current = 0;
      callbacksRef.current.onPositionChange({ ...position }, walkingRef.current);
    }
  });

  return (
    <group ref={characterRef} name="exploration-mushroom-guide" scale={[0.84, 1, 0.84]}>
      <group position={[0, 1.12, 0]}>
        <mesh castShadow position={[0, 0, 0.025]} scale={[1.08, 0.98, 0.92]}>
          <sphereGeometry args={[0.225, 32, 24]} />
          <meshStandardMaterial color="#efb27d" roughness={0.68} />
        </mesh>
        <mesh castShadow position={[-0.225, -0.02, 0.002]} scale={[0.55, 0.92, 0.7]}>
          <sphereGeometry args={[0.052, 16, 12]} />
          <meshStandardMaterial color="#efb27d" roughness={0.7} />
        </mesh>
        <mesh castShadow position={[0.225, -0.02, 0.002]} scale={[0.55, 0.92, 0.7]}>
          <sphereGeometry args={[0.052, 16, 12]} />
          <meshStandardMaterial color="#efb27d" roughness={0.7} />
        </mesh>

        <mesh castShadow position={[0, 0.125, -0.018]} scale={[1.22, 0.38, 1.12]}>
          <sphereGeometry args={[0.295, 32, 22]} />
          <meshStandardMaterial color="#524f50" roughness={0.76} />
        </mesh>
        <mesh castShadow position={[0, 0.245, -0.025]} scale={[1.22, 0.72, 1.16]}>
          <sphereGeometry args={[0.3, 40, 28]} />
          <meshStandardMaterial color="#fffdf7" roughness={0.7} />
        </mesh>
        <mesh castShadow position={[-0.345, 0.245, -0.02]} rotation={[0, -Math.PI / 2, 0]} scale={[1.12, 0.86, 0.18]}>
          <sphereGeometry args={[0.09, 22, 16]} />
          <meshStandardMaterial color="#ef2824" roughness={0.62} />
        </mesh>
        <mesh castShadow position={[0.345, 0.245, -0.02]} rotation={[0, Math.PI / 2, 0]} scale={[1.12, 0.86, 0.18]}>
          <sphereGeometry args={[0.09, 22, 16]} />
          <meshStandardMaterial color="#ef2824" roughness={0.62} />
        </mesh>
        {[
          { x: 0, y: 0.285, z: 0.314, radius: 0.12, scaleX: 1.2, scaleY: 1.08 },
          { x: 0, y: 0.405, z: 0.12, radius: 0.085, scaleX: 1.08, scaleY: 0.94 },
          { x: 0, y: 0.275, z: -0.368, radius: 0.105, scaleX: 1.18, scaleY: 1 }
        ].map((spot, index) => (
          <mesh key={`exploration-mushroom-spot-${index}`} castShadow position={[spot.x, spot.y, spot.z]} scale={[spot.scaleX, spot.scaleY, 0.16]}>
            <sphereGeometry args={[spot.radius, 22, 16]} />
            <meshStandardMaterial color="#ef2824" roughness={0.62} />
          </mesh>
        ))}
        {[-0.073, 0.073].map((eyeX) => (
          <group key={`exploration-eye-${eyeX}`} position={[eyeX, -0.015, 0.224]}>
            <mesh scale={[0.66, 1.42, 0.22]}>
              <sphereGeometry args={[0.029, 22, 18]} />
              <meshStandardMaterial color="#17110e" roughness={0.3} />
            </mesh>
            <mesh position={[-0.006, 0.018, 0.008]} scale={[0.8, 1.18, 0.5]}>
              <sphereGeometry args={[0.006, 12, 10]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.105, 0.226]} scale={[1.42, 0.9, 0.22]}>
          <sphereGeometry args={[0.048, 22, 16]} />
          <meshStandardMaterial color="#35130f" roughness={0.46} />
        </mesh>
        <mesh position={[0, -0.123, 0.235]} scale={[1.03, 0.42, 0.18]}>
          <sphereGeometry args={[0.043, 20, 14]} />
          <meshStandardMaterial color="#f04436" roughness={0.5} />
        </mesh>
      </group>

      <mesh castShadow position={[0, 0.75, 0]}>
        <capsuleGeometry args={[0.18, 0.24, 8, 18]} />
        <meshStandardMaterial color="#efb27d" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.5, -0.005]} scale={[1.2, 0.82, 1.05]}>
        <sphereGeometry args={[0.25, 26, 20]} />
        <meshStandardMaterial color="#fffdf7" roughness={0.76} />
      </mesh>
      <mesh position={[0, 0.76, -0.16]} scale={[1.45, 1.28, 0.24]}>
        <sphereGeometry args={[0.105, 20, 16]} />
        <meshStandardMaterial color="#f4b923" roughness={0.66} />
      </mesh>
      <mesh position={[0, 0.76, -0.171]} scale={[1.2, 1.08, 0.18]}>
        <sphereGeometry args={[0.105, 20, 16]} />
        <meshStandardMaterial color="#1d46b8" roughness={0.62} />
      </mesh>
      {[-0.115, 0.115].map((vestX) => (
        <group key={`exploration-vest-${vestX}`}>
          <mesh position={[vestX, 0.76, 0.167]} rotation={[0, 0, vestX < 0 ? -0.18 : 0.18]} scale={[0.88, 1.34, 0.3]}>
            <sphereGeometry args={[0.105, 20, 16]} />
            <meshStandardMaterial color="#f4b923" roughness={0.66} />
          </mesh>
          <mesh position={[vestX, 0.765, 0.184]} rotation={[0, 0, vestX < 0 ? -0.18 : 0.18]} scale={[0.62, 1.12, 0.22]}>
            <sphereGeometry args={[0.105, 20, 16]} />
            <meshStandardMaterial color="#1d46b8" roughness={0.62} />
          </mesh>
        </group>
      ))}
      <group ref={leftArmRef} position={[-0.215, 0.82, 0.015]} rotation={[0, 0, -0.74]}>
        <mesh castShadow position={[0, -0.18, 0]}>
          <capsuleGeometry args={[0.055, 0.26, 6, 12]} />
          <meshStandardMaterial color="#efb27d" roughness={0.7} />
        </mesh>
        <mesh castShadow position={[0, -0.345, 0.01]} scale={[1.08, 0.82, 0.9]}>
          <sphereGeometry args={[0.075, 18, 14]} />
          <meshStandardMaterial color="#efb27d" roughness={0.7} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.215, 0.82, 0.015]} rotation={[0, 0, 0.74]}>
        <mesh castShadow position={[0, -0.18, 0]}>
          <capsuleGeometry args={[0.055, 0.26, 6, 12]} />
          <meshStandardMaterial color="#efb27d" roughness={0.7} />
        </mesh>
        <mesh castShadow position={[0, -0.345, 0.01]} scale={[1.08, 0.82, 0.9]}>
          <sphereGeometry args={[0.075, 18, 14]} />
          <meshStandardMaterial color="#efb27d" roughness={0.7} />
        </mesh>
      </group>
      <group ref={leftLegRef} position={[-0.105, 0.38, 0]}>
        <mesh castShadow position={[0, -0.13, 0]}>
          <capsuleGeometry args={[0.07, 0.16, 6, 12]} />
          <meshStandardMaterial color="#fffdf7" roughness={0.78} />
        </mesh>
        <mesh castShadow position={[0, -0.285, 0.055]} scale={[1.3, 0.7, 1.65]}>
          <sphereGeometry args={[0.11, 20, 16]} />
          <meshStandardMaterial color="#7b4224" roughness={0.74} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.105, 0.38, 0]}>
        <mesh castShadow position={[0, -0.13, 0]}>
          <capsuleGeometry args={[0.07, 0.16, 6, 12]} />
          <meshStandardMaterial color="#fffdf7" roughness={0.78} />
        </mesh>
        <mesh castShadow position={[0, -0.285, 0.055]} scale={[1.3, 0.7, 1.65]}>
          <sphereGeometry args={[0.11, 20, 16]} />
          <meshStandardMaterial color="#7b4224" roughness={0.74} />
        </mesh>
      </group>
    </group>
  );
}

export function Exploration3DView({
  floor,
  houseStructure,
  houseStructuresByFloor,
  stairSystems,
  stairLandings,
  stairOpenings,
  furniture,
  allFurniture,
  drawingItems,
  allDrawingItems,
  sceneSettings,
  collisionWorld,
  spawnPosition,
  doorStates,
  cabinetStates,
  viewMode,
  lightingMode,
  resetRequest,
  onToggleDoor,
  onToggleCabinet,
  onToggleView,
  onExit,
  onFloorTransition,
  onPositionChange,
  onNearbyDoorChange,
  onNearbyCabinetChange,
  onPointerLockChange
}: Exploration3DViewProps) {
  const noop = () => undefined;
  // Exploration is a real-scale walkthrough. It must never inherit a drawing
  // workspace's cutaway wall presentation, otherwise full-height openings are
  // rendered against clipped walls and appear detached from their hosts.
  const explorationWallDisplayMode: Drawing3DWallMode = "full";
  return (
    <div
      className="h-full w-full bg-[#e8e1d4]"
      data-testid="exploration-3d-view"
      data-drawing-sheet-type={sceneSettings.drawingSheetType}
      data-drawing-3d-preset={sceneSettings.drawingViewPreset}
      data-furniture-height-mode={sceneSettings.furnitureHeightMode}
      data-wall-display-mode={explorationWallDisplayMode}
      data-material-preview={sceneSettings.materialPreview ? "true" : "false"}
      data-design-style={sceneSettings.designStyle}
      data-scene-furniture-count={furniture.length}
      data-scene-furniture-signature={getFurnitureGeometrySignature(furniture)}
      data-scene-wall-signature={getWallGeometrySignature(houseStructure)}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: viewMode === "firstPerson" ? EXPLORATION_FIRST_PERSON_FOV : EXPLORATION_THIRD_PERSON_FOV, near: 0.055, far: 70, position: [0, 5.3, 6.2] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Floor3DScene
          drawingSheetType={sceneSettings.drawingSheetType}
          drawingItems={drawingItems}
          allDrawingItems={allDrawingItems}
          drawingViewPreset={sceneSettings.drawingViewPreset}
          villaExperienceEnabled={sceneSettings.villaExperienceEnabled}
          villaOverviewMode="singleFloor"
          currentRoomId={null}
          currentOutdoorId={null}
          roomCeilingMode={sceneSettings.roomCeilingMode}
          lightingScene="dayWithLights"
          lightingControlBrightness={new Map<string, number>()}
          showFixtureModels={sceneSettings.showFixtureModels}
          showFixtureIds={sceneSettings.showFixtureIds}
          showBeamCones={sceneSettings.showBeamCones}
          showLightSpots={sceneSettings.showLightSpots}
          showControlRelations={sceneSettings.showControlRelations}
          showIlluminanceLayer={sceneSettings.showIlluminanceLayer}
          lightingExperienceScope="currentFloor"
          lightingWallMode={sceneSettings.lightingWallMode}
          lightingAnalysisMode="none"
          lightingSpaceSummaries={[]}
          lightingSelectedGroupId={null}
          lightingSoloGroupId={null}
          ceilingSolid={sceneSettings.ceilingSolid}
          materialCategoryFilter={sceneSettings.materialCategoryFilter}
          cameraPreset="overview"
          fixedCameraView={null}
          cameraRequestVersion={0}
          freeBrowseVersion={0}
          cameraMode="walkthrough"
          activeTourNode={null}
          mobilePresentationMode={false}
          sceneController={<ExplorationCharacterController
            world={collisionWorld}
            structure={houseStructure}
            furniture={furniture}
            structuresByFloor={houseStructuresByFloor}
            spawnPosition={spawnPosition}
            viewMode={viewMode}
            resetRequest={resetRequest}
            onToggleDoor={onToggleDoor}
            onToggleCabinet={onToggleCabinet}
            onToggleView={onToggleView}
            onExit={onExit}
            onFloorTransition={onFloorTransition}
            onPositionChange={onPositionChange}
            onNearbyDoorChange={onNearbyDoorChange}
            onNearbyCabinetChange={onNearbyCabinetChange}
            onPointerLockChange={onPointerLockChange}
          />}
          explorationDoorStates={doorStates}
          explorationCabinetStates={cabinetStates}
          explorationLightingMode={lightingMode}
          wallDisplayModeOverride={explorationWallDisplayMode}
          furnitureHeightModeOverride={sceneSettings.furnitureHeightMode}
          materialPreview={sceneSettings.materialPreview}
          designStyle={sceneSettings.designStyle}
          presentationMode={sceneSettings.presentationMode}
          mobileQuality="high"
          showServicePoints={false}
          showStairDebug={false}
          houseStructure={houseStructure}
          houseStructuresByFloor={houseStructuresByFloor}
          stairSystems={stairSystems}
          stairLandings={stairLandings}
          stairOpenings={stairOpenings}
          furniture={furniture}
          allFurniture={allFurniture}
          selectedObjectId=""
          selectedFurnitureId=""
          onSelectStructure={noop}
          onSelectFurniture={noop}
          onSelectDrawingItem={noop}
          onEnterRoom={noop}
          onToggleControlGroup={noop}
          onHoverObject={noop}
          onClearHoverObject={noop}
        />
      </Canvas>
    </div>
  );
}

export function Floor3DView({
  floor,
  houseStructure,
  houseStructuresByFloor = {},
  stairSystems = [],
  stairLandings = [],
  stairOpenings = [],
  furniture,
  allFurniture,
  drawingItems,
  allDrawingItems,
  drawingSheetType,
  cameraViews = [],
  roomTourViews = [],
  lightingDesign,
  cameraViewRequest = null,
  mobilePresentationMode = false,
  externalPresentationMode = false,
  mobileQuality = "balanced",
  resetViewRequest = 0,
  selectedObjectId,
  selectedFurnitureId,
  showObjectIds,
  showDebugTools = false,
  onShowObjectIdsChange,
  onSelectStructure,
  onSelectFurniture,
  onSelectDrawingItem,
  onSelectFloor,
  onSelectCameraView,
  onHoverObject,
  onClearHoverObject,
  onSceneSettingsChange
}: Floor3DViewProps) {
  const villaFurniture = allFurniture ?? furniture;
  const villaDrawingItems = allDrawingItems ?? drawingItems;
  const drawingProfile = getDrawing3DPresentationProfile(drawingSheetType);
  const [villaExperienceEnabled, setVillaExperienceEnabled] = useState(() => drawingSheetType === "lightingPlan");
  const [villaOverviewMode, setVillaOverviewMode] = useState<VillaOverviewMode>("wholeVilla");
  const [roomCeilingMode, setRoomCeilingMode] = useState<RoomCeilingMode>(() => drawingSheetType === "sitePlan" ? "translucent" : "hidden");
  const [cameraRequest, setCameraRequest] = useState<{ preset: CameraPreset; fixedView: FixedCameraView | null; version: number }>(() => ({
    preset: "overview",
    fixedView: mobilePresentationMode ? getMobileDefaultCameraView(floor, houseStructure) : null,
    version: 0
  }));
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const [materialPreview, setMaterialPreview] = useState(true);
  const [showServicePoints, setShowServicePoints] = useState(false);
  const [showStairDebug, setShowStairDebug] = useState(false);
  const [designStyle, setDesignStyle] = useState<DesignStylePreset>("warmJapandi");
  const [presentationMode, setPresentationMode] = useState(mobilePresentationMode || externalPresentationMode);
  const [tourPanelOpen, setTourPanelOpen] = useState(false);
  const [activeTourNode, setActiveTourNode] = useState<RoomTourView | null>(null);
  const [activeCameraViewId, setActiveCameraViewId] = useState<string | null>(null);
  const [freeBrowseVersion, setFreeBrowseVersion] = useState(0);
  const [cameraPlanPose, setCameraPlanPose] = useState<CameraPlanPose>(() => ({
    cameraX: cameraPositions.overview[0],
    cameraZ: cameraPositions.overview[2],
    targetX: CAMERA_TARGET.x,
    targetZ: CAMERA_TARGET.z
  }));
  const [cameraPlanNavigationRequest, setCameraPlanNavigationRequest] = useState<CameraPlanNavigationRequest | null>(null);
  const [drawingViewPreset, setDrawingViewPreset] = useState<Drawing3DViewPreset>(drawingProfile.defaultPreset);
  const [lightingScene, setLightingScene] = useState<LightingSceneMode>("dayWithLights");
  const [activeLightingControlSceneId, setActiveLightingControlSceneId] = useState("SCENE-DAILY");
  const [lightingExperienceScope, setLightingExperienceScope] = useState<LightingExperienceScope>("wholeHouse");
  const [selectedLightingSpaceId, setSelectedLightingSpaceId] = useState<string | null>(null);
  const [lightingWallMode, setLightingWallMode] = useState<LightingWallMode>("smartCutaway");
  const [lightingAnalysisMode, setLightingAnalysisMode] = useState<LightingAnalysisMode>("none");
  const [advancedLightingOpen, setAdvancedLightingOpen] = useState(false);
  const [lightingRoomPanelOpen, setLightingRoomPanelOpen] = useState(false);
  const [lightingGroupOverrides, setLightingGroupOverrides] = useState<Record<string, number>>({});
  const [lightingPanelCollapsed, setLightingPanelCollapsed] = useState(true);
  useEffect(() => {
    setPresentationMode(mobilePresentationMode || externalPresentationMode);
  }, [externalPresentationMode, mobilePresentationMode]);
  const [lightingRoomViewMode, setLightingRoomViewMode] = useState<LightingRoomViewMode>("full");
  const [lightingSelectedGroupId, setLightingSelectedGroupId] = useState<string | null>(null);
  const [lightingSoloGroupId, setLightingSoloGroupId] = useState<string | null>(null);
  const lightingSoloBackupRef = useRef<Record<string, number> | null>(null);
  const pendingRoomEntryRef = useRef<{ floorId: Floor["id"]; roomId: string } | null>(null);
  const previousFloorIdRef = useRef<Floor["id"]>(floor.id);
  const [showFixtureModels, setShowFixtureModels] = useState(true);
  const [showFixtureIds, setShowFixtureIds] = useState(false);
  const [showBeamCones, setShowBeamCones] = useState(false);
  const [showLightSpots, setShowLightSpots] = useState(false);
  const [showControlRelations, setShowControlRelations] = useState(false);
  const [showIlluminanceLayer, setShowIlluminanceLayer] = useState(false);
  const [ceilingSolid, setCeilingSolid] = useState(false);
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<MaterialCategoryFilter>("all");
  const gestureRef = useRef({ pointers: new Map<number, { x: number; y: number }>(), moved: false });
  const suppressSelectionUntilRef = useRef(0);
  useEffect(() => {
    setVillaExperienceEnabled(drawingSheetType === "lightingPlan");
    if (drawingSheetType === "sitePlan") {
      setMaterialPreview(true);
      setRoomCeilingMode("translucent");
      setShowServicePoints(false);
      setShowFixtureIds(false);
      setShowBeamCones(false);
      setShowLightSpots(false);
      setShowControlRelations(false);
      setShowIlluminanceLayer(false);
    }
  }, [drawingSheetType]);
  const effectiveWallDisplayMode = resolveSceneWallDisplayMode({
    drawingSheetType,
    drawingViewPreset,
    drawingItems,
    villaExperienceEnabled,
    lightingWallMode
  });
  const effectiveFurnitureHeightMode: FurnitureHeightMode = "actual";
  useEffect(() => {
    onSceneSettingsChange?.({
      drawingSheetType,
      drawingViewPreset,
      furnitureHeightMode: effectiveFurnitureHeightMode,
      materialPreview,
      designStyle,
      wallDisplayMode: effectiveWallDisplayMode,
      lightingWallMode,
      materialCategoryFilter,
      roomCeilingMode,
      ceilingSolid,
      showFixtureModels,
      showFixtureIds,
      showBeamCones,
      showLightSpots,
      showControlRelations,
      showIlluminanceLayer,
      presentationMode,
      villaExperienceEnabled
    });
  }, [ceilingSolid, designStyle, drawingSheetType, drawingViewPreset, effectiveFurnitureHeightMode, effectiveWallDisplayMode, lightingWallMode, materialCategoryFilter, materialPreview, onSceneSettingsChange, presentationMode, roomCeilingMode, showBeamCones, showControlRelations, showFixtureIds, showFixtureModels, showIlluminanceLayer, showLightSpots, villaExperienceEnabled]);
  const selectedFurniture = furniture.find((item) => item.id === selectedFurnitureId || item.id === selectedObjectId);
  const selectedDrawingItem = drawingItems.find((item) => item.id === selectedObjectId);
  const relevantDrawingItems = useMemo(
    () => drawingItems.filter((item) => drawingProfile.drawingCategories.includes(item.category)),
    [drawingItems, drawingProfile.drawingCategories]
  );
  const availableLightingControlScenes = useMemo(() => (lightingDesign?.scenes ?? []).filter((scene) => !scene.floorId || scene.floorId === floor.id), [floor.id, lightingDesign?.scenes]);
  const activeLightingControlScene = availableLightingControlScenes.find((scene) => scene.id === activeLightingControlSceneId) ?? availableLightingControlScenes[0];
  const floorLights = useMemo(() => drawingItems.filter((item) => item.category === "light"), [drawingItems]);
  const villaSpaceDirectory = useMemo<VillaSpaceDirectoryEntry[]>(() => {
    const hasDedicatedYard = Boolean(houseStructuresByFloor.YARD?.outdoors.length);
    return villaFloorOrder.flatMap((floorId) => {
      const structure = houseStructuresByFloor[floorId];
      if (!structure) return [];
      const spaces = [
        ...structure.rooms.map((room) => ({ id: room.id, name: room.name, kind: "room" as const, room })),
        ...(floorId === "YARD" || !hasDedicatedYard
          ? structure.outdoors.map((outdoor) => ({ id: outdoor.id, name: outdoor.name.replace(" · 编辑底盘", ""), kind: "outdoor" as const, room: null }))
          : [])
      ];
      return spaces.map((space) => {
        const relatedFurnitureIds = new Set(space.room
          ? villaFurniture.filter((item) => furnitureBelongsToRoomExperience(item, space.room)).map((item) => item.id)
          : []);
        const relatedItems = villaDrawingItems.filter((item) => (
          (item.relatedRoomId ?? item.roomId) === space.id
          || Boolean(item.relatedFurnitureId && relatedFurnitureIds.has(item.relatedFurnitureId))
        ));
        return {
          id: space.id,
          floorId,
          name: space.name,
          kind: space.kind,
          lightCount: relatedItems.filter((item) => item.category === "light").length,
          switchCount: relatedItems.filter((item) => item.category === "switch").length
        };
      });
    });
  }, [houseStructuresByFloor, villaDrawingItems, villaFurniture]);
  const villaQuickSpaces = useMemo(() => [...villaSpaceDirectory].sort((a, b) => {
    const priority = (entry: VillaSpaceDirectoryEntry) => /厨房/.test(entry.name) ? 0
      : entry.floorId === "1F" && /客厅/.test(entry.name) ? 1
        : /主卧/.test(entry.name) ? 2
          : /庭院/.test(entry.name) ? 3
            : 10 + villaFloorOrder.indexOf(entry.floorId);
    return priority(a) - priority(b) || a.name.localeCompare(b.name, "zh-CN");
  }), [villaSpaceDirectory]);
  const villaConfiguredLightCount = useMemo(() => villaDrawingItems.filter((item) => item.category === "light").length, [villaDrawingItems]);
  const lightingControlBrightness = useMemo(() => {
    const next = new Map<string, number>();
    if (activeLightingControlSceneId === "__all_on__") {
      floorLights.forEach((item) => item.controlGroupId && next.set(item.controlGroupId, 100));
    } else {
      activeLightingControlScene?.groupStates.forEach((state) => next.set(state.controlGroupId, state.on ? state.brightness : 0));
    }
    Object.entries(lightingGroupOverrides).forEach(([groupId, brightness]) => next.set(groupId, brightness));
    return next;
  }, [activeLightingControlScene, activeLightingControlSceneId, floorLights, lightingGroupOverrides]);
  const primaryLightingScenes = useMemo(() => {
    const requested = [
      ["SCENE-DAILY", "日常"],
      ["SCENE-GATHERING", "会客"],
      ["SCENE-DINING", "用餐"],
      ["SCENE-MOVIE", "观影"],
      ["SCENE-ALL-CLEAN", "清洁"],
      ["SCENE-BEDTIME", "睡前"],
      ["SCENE-NIGHT", "起夜"],
      ["SCENE-AWAY", "离家"],
      ["SCENE-YARD-RELAX", "庭院休闲"]
    ] as const;
    const availableIds = new Set(availableLightingControlScenes.map((scene) => scene.id));
    const scenes: Array<{ id: string; label: string }> = requested.filter(([id]) => availableIds.has(id)).map(([id, label]) => ({ id, label }));
    return scenes.concat({ id: "__all_on__", label: "全开" });
  }, [availableLightingControlScenes]);
  const lightingSpaceSummaries = useMemo<LightingSpaceSummary[]>(() => {
    const hasDedicatedYard = Boolean(houseStructuresByFloor.YARD?.outdoors.length);
    const spaces = [
      ...houseStructure.rooms.map((room) => ({ id: room.id, name: room.name, kind: "room" as const })),
      ...(floor.id === "YARD" || !hasDedicatedYard
        ? houseStructure.outdoors.map((outdoor) => ({ id: outdoor.id, name: outdoor.name.replace(" · 编辑底盘", ""), kind: "outdoor" as const }))
        : [])
    ];
    return spaces.map((space) => {
      const room = space.kind === "room" ? houseStructure.rooms.find((candidate) => candidate.id === space.id) : null;
      const sharedFurnitureIds = new Set(room
        ? furniture.filter((item) => furnitureBelongsToRoomExperience(item, room)).map((item) => item.id)
        : []);
      const lights = floorLights.filter((item) => (item.relatedRoomId ?? item.roomId) === space.id || Boolean(item.relatedFurnitureId && sharedFurnitureIds.has(item.relatedFurnitureId)));
      const brightnessValues = lights.map((item) => item.controlGroupId ? lightingControlBrightness.get(item.controlGroupId) ?? 0 : 0);
      const enabledLightCount = brightnessValues.filter((value) => value > 0).length;
      const averageBrightness = lights.length > 0 ? brightnessValues.reduce((sum, value) => sum + value, 0) / lights.length : 0;
      const uncontrolledCount = lights.filter((item) => !item.controlGroupId || !lightingControlBrightness.has(item.controlGroupId)).length;
      return {
        id: space.id,
        floorId: floor.id,
        name: space.name,
        kind: space.kind,
        lightIds: lights.map((item) => item.id),
        controlGroupIds: Array.from(new Set(lights.map((item) => item.controlGroupId).filter((id): id is string => Boolean(id)))),
        enabledLightCount,
        totalLightCount: lights.length,
        averageBrightness,
        dominantColorTemperature: getDominantColorTemperature(lights),
        status: getLightingSpaceStatus(averageBrightness, lights.length, uncontrolledCount)
      };
    }).sort((a, b) => {
      const priority = (name: string) => /厨房/.test(name) ? 0 : /客厅/.test(name) ? 1 : /主卧/.test(name) ? 2 : 10;
      return priority(a.name) - priority(b.name) || a.name.localeCompare(b.name, "zh-CN");
    });
  }, [floor.id, floorLights, furniture, houseStructure.outdoors, houseStructure.rooms, houseStructuresByFloor.YARD, lightingControlBrightness]);
  const selectedLightingSpace = lightingSpaceSummaries.find((summary) => summary.id === selectedLightingSpaceId) ?? null;
  const selectedExperienceRoom = selectedLightingSpace?.kind === "room"
    ? houseStructure.rooms.find((room) => room.id === selectedLightingSpace.id) ?? null
    : null;
  const selectedFurnitureInExperience = Boolean(selectedFurniture && (
    (selectedExperienceRoom && furnitureBelongsToRoomExperience(selectedFurniture, selectedExperienceRoom))
    || (selectedLightingSpace?.kind === "outdoor" && (selectedFurniture.outdoorId ?? selectedFurniture.roomId) === selectedLightingSpace.id)
  ));
  const lightingRoomGroups = useMemo(() => {
    if (!selectedLightingSpace) return [];
    return selectedLightingSpace.controlGroupIds.map((groupId) => {
      const items = floorLights.filter((item) => item.controlGroupId === groupId);
      const first = items[0];
      const label = getControlGroupDisplayLabel(groupId, items);
      return {
        id: groupId,
        label,
        items,
        brightness: lightingControlBrightness.get(groupId) ?? 0,
        enabled: (lightingControlBrightness.get(groupId) ?? 0) > 0,
        colorTemperature: getDominantColorTemperature(items),
        fixtureTypes: Array.from(new Set(items.map((item) => item.lightType ?? item.type).filter(Boolean))).join("、") || "灯具",
        dimming: items.some((item) => Boolean(item.dimming))
      };
    });
  }, [floorLights, lightingControlBrightness, selectedLightingSpace]);
  const lightingSummary = useMemo(() => {
    const scopedSpaces = lightingExperienceScope === "currentRoom" && selectedLightingSpace ? [selectedLightingSpace] : lightingSpaceSummaries;
    const scopedLightIds = new Set(scopedSpaces.flatMap((space) => space.lightIds));
    const scopedLights = floorLights.filter((item) => scopedLightIds.has(item.id));
    const enabledLights = scopedLights.filter((item) => (item.controlGroupId ? lightingControlBrightness.get(item.controlGroupId) ?? 0 : 0) > 0);
    const powerW = enabledLights.reduce((sum, item) => sum + (item.lightSpec?.powerW ?? 8) * ((item.controlGroupId ? lightingControlBrightness.get(item.controlGroupId) ?? 0 : 0) / 100), 0);
    const averageBrightness = scopedLights.length > 0
      ? scopedLights.reduce((sum, item) => sum + (item.controlGroupId ? lightingControlBrightness.get(item.controlGroupId) ?? 0 : 0), 0) / scopedLights.length
      : 0;
    return {
      enabledSpaces: scopedSpaces.filter((space) => space.enabledLightCount > 0).length,
      enabledLights: enabledLights.length,
      powerW: Math.round(powerW),
      dominantColorTemperature: getDominantColorTemperature(enabledLights),
      averageBrightness,
      dimmingLights: scopedLights.filter((item) => item.dimming).length,
      smartLights: scopedLights.filter((item) => item.smartControl).length,
      darkSpaces: scopedSpaces.filter((space) => space.status === "dark").length,
      overbrightSpaces: scopedSpaces.filter((space) => space.status === "overbright").length,
      uncontrolledLights: scopedLights.filter((item) => !item.controlGroupId || !lightingControlBrightness.has(item.controlGroupId)).length
    };
  }, [floorLights, lightingControlBrightness, lightingExperienceScope, lightingSpaceSummaries, selectedLightingSpace]);
  const specialtyFallback = Boolean(drawingProfile.emptyDataHint && relevantDrawingItems.length === 0);
  const stairDebugSystems = useMemo(() => {
    if (!showStairDebug) return [];
    const systems = stairSystems.filter((system) => system.lowerFloorId === houseStructure.floorId || system.upperFloorId === houseStructure.floorId);
    return systems.map((system) => buildStairRenderSystemGeometry({
      system,
      structuresByFloor: houseStructuresByFloor,
      currentStructure: houseStructure,
      currentFloorId: houseStructure.floorId,
      landing: stairLandings.find((candidate) => candidate.id === system.landingId),
      opening: stairOpenings.find((candidate) => candidate.id === system.openingId),
      mode: "system-analysis",
      presentationOffsetMm: 0
    }));
  }, [houseStructure, houseStructuresByFloor, showStairDebug, stairLandings, stairOpenings, stairSystems]);
  const currentFloorTourNodes = useMemo(
    () => roomTourViews.filter((node) => node.floorId === floor.id && node.status === "active"),
    [floor.id, roomTourViews]
  );
  const floorCameraViews = useMemo(() => buildFloorCameraViews({
    floor,
    structure: houseStructure,
    sheetType: drawingSheetType,
    cameraViews,
    roomTourViews
  }), [cameraViews, drawingSheetType, floor, houseStructure, roomTourViews]);
  const { primary: primaryCameraViews, more: moreCameraViews } = useMemo(
    () => splitFloorCameraViews(floorCameraViews, mobilePresentationMode),
    [floorCameraViews, mobilePresentationMode]
  );
  const activeCameraView = floorCameraViews.find((view) => view.id === activeCameraViewId) ?? null;
  const activeViewIndex = activeCameraView ? floorCameraViews.findIndex((view) => view.id === activeCameraView.id) : -1;
  const activeCameraViewName = activeCameraView?.name ?? (cameraRequest.fixedView?.id === activeCameraViewId ? cameraRequest.fixedView.name : null);
  const activeViewIsMore = Boolean(activeCameraViewId && activeCameraView?.name !== "鸟瞰" && !primaryCameraViews.some((view) => view.id === activeCameraViewId));
  const linkedTourNodes = useMemo(() => activeTourNode
    ? activeTourNode.linkedNodeIds
        .map((id) => currentFloorTourNodes.find((node) => node.id === id))
        .filter((node): node is RoomTourView => Boolean(node))
        .slice(0, 4)
    : [], [activeTourNode, currentFloorTourNodes]);
  const activateFloorCameraView = (
    view: FloorCameraView,
    preserveLightingScene = false,
    notifySelection = true,
    preserveVillaOverview = false
  ) => {
    if (mobilePresentationMode && !preserveVillaOverview) setVillaOverviewMode("singleFloor");
    setActiveCameraViewId(view.id);
    setActiveTourNode(view.tourView ?? null);
    setTourPanelOpen(false);
    setCameraMode(view.cameraMode === "walkthrough" ? "walkthrough" : view.cameraMode === "tour" ? "tour" : "orbit");
    setCameraRequest((current) => ({ preset: "overview", fixedView: view.fixedView, version: current.version + 1 }));
    if (notifySelection && view.fixedView) onSelectCameraView?.(view.fixedView);
    if (!preserveLightingScene && (villaExperienceEnabled || drawingSheetType === "lightingPlan") && view.recommendedLightingScene) setLightingScene(view.recommendedLightingScene);
    if (!preserveLightingScene && (villaExperienceEnabled || drawingSheetType === "lightingPlan") && view.recommendedLightingSceneId) {
      setLightingGroupOverrides({});
      setActiveLightingControlSceneId(view.recommendedLightingSceneId);
    }
  };
  const requestFreeBrowse = () => {
    if (mobilePresentationMode) setVillaOverviewMode("singleFloor");
    setCameraMode("orbit");
    setActiveCameraViewId(null);
    setActiveTourNode(null);
    setTourPanelOpen(false);
    setCameraRequest((current) => ({ ...current, fixedView: null }));
    setFreeBrowseVersion((version) => version + 1);
  };
  const returnToBirdseye = () => {
    const overview = floorCameraViews.find((view) => view.name === "鸟瞰");
    if (overview) activateFloorCameraView(overview);
  };
  const buildLightingRoomFullView = (space: LightingSpaceSummary, mode: LightingRoomViewMode = "full"): FloorCameraView | null => {
    const polygon = space.kind === "room"
      ? houseStructure.rooms.find((room) => room.id === space.id)?.boundary
      : houseStructure.outdoors.find((outdoor) => outdoor.id === space.id)?.polygon;
    if (!polygon?.length) return null;
    const roomBounds = getSceneBounds(polygon, houseStructure);
    const experienceRoom = space.kind === "room" ? houseStructure.rooms.find((room) => room.id === space.id) : null;
    const bounds = experienceRoom ? getRoomExperienceSceneBounds(experienceRoom, houseStructure, furniture) : roomBounds;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;
    const roomCenterX = (roomBounds.minX + roomBounds.maxX) / 2;
    const roomCenterZ = (roomBounds.minZ + roomBounds.maxZ) / 2;
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 2.8);
    const roomBlockers = furniture
      .filter((item) => Boolean(experienceRoom && furnitureBelongsToRoomExperience(item, experienceRoom)) && !isRugLike(item))
      .map((item) => getFurnitureSceneBlocker(item, houseStructure, 0.16));
    const viewInset = Math.min(0.4, Math.max(0.22, span * 0.08));
    const roomCandidates = [
      { x: centerX, z: bounds.minZ + viewInset },
      { x: centerX, z: bounds.maxZ - viewInset },
      { x: bounds.minX + viewInset, z: centerZ },
      { x: bounds.maxX - viewInset, z: centerZ },
      { x: centerX, z: centerZ }
    ];
    const distanceToBlocker = (candidate: { x: number; z: number }, blocker: RoomMovementBounds["blockers"][number]) => Math.hypot(
      Math.max(blocker.minX - candidate.x, 0, candidate.x - blocker.maxX),
      Math.max(blocker.minZ - candidate.z, 0, candidate.z - blocker.maxZ)
    );
    const safeCandidates = roomCandidates.filter((candidate) => !roomBlockers.some((blocker) => candidate.x > blocker.minX && candidate.x < blocker.maxX && candidate.z > blocker.minZ && candidate.z < blocker.maxZ));
    const emptyCorner = safeCandidates
      .sort((a, b) => {
        const score = (candidate: { x: number; z: number }) => (roomBlockers.length ? Math.min(...roomBlockers.map((blocker) => distanceToBlocker(candidate, blocker))) : 1) + Math.hypot(candidate.x - centerX, candidate.z - centerZ) * 0.34;
        return score(b) - score(a);
      })[0] ?? { x: centerX, z: centerZ };
    const walkthroughStart = [...safeCandidates].sort((a, b) => Math.hypot(a.x - centerX, a.z - centerZ) - Math.hypot(b.x - centerX, b.z - centerZ))[0] ?? emptyCorner;
    const kitchenPanorama = space.kind === "room" && /厨房/.test(space.name);
    const cameraPosition = mode === "top"
      ? { x: centerX + span * 0.08, y: Math.max(5.2, span * 1.08), z: centerZ + span * 0.08 }
      : mode === "human"
        ? { x: walkthroughStart.x, y: 1.64, z: walkthroughStart.z }
        : kitchenPanorama
          ? { x: roomCenterX + Math.min(0.48, (roomBounds.maxX - roomBounds.minX) * 0.18), y: 2.46, z: bounds.maxZ + 1.34 }
          : { x: emptyCorner.x, y: 1.9, z: emptyCorner.z };
    const target = {
      x: kitchenPanorama && mode === "full" ? roomCenterX : centerX,
      y: mode === "top" ? 0 : mode === "full" ? 0.82 : 1.02,
      z: kitchenPanorama && mode === "full" ? roomCenterZ : centerZ
    };
    const fixedView: FixedCameraView = {
      id: `lighting-room-${space.id}-${mode}`,
      name: `${space.name} ${mode === "full" ? "室内全景" : mode === "human" ? "自由探索" : "俯视房间"}`,
      floor: floor.id,
      cameraPosition,
      target,
      mode: "perspective",
      description: `${space.name}${mode === "full" ? "室内全景" : mode === "human" ? "自由探索" : "俯视房间"}`
    };
    return {
      id: fixedView.id,
      floorId: floor.id,
      name: fixedView.name,
      category: "lighting-scene",
      cameraMode: mode === "human" ? "walkthrough" : mode === "full" ? "tour" : "orbit",
      cameraPosition,
      target,
      roomId: space.kind === "room" ? space.id : undefined,
      outdoorId: space.kind === "outdoor" ? space.id : undefined,
      description: fixedView.description,
      fixedView,
      primary: true,
      priority: -50
    };
  };
  const enterLightingSpace = (space: LightingSpaceSummary) => {
    setSelectedLightingSpaceId(space.id);
    setLightingExperienceScope("currentRoom");
    setLightingWallMode("smartCutaway");
    setLightingRoomViewMode("full");
    setLightingSelectedGroupId(null);
    setLightingSoloGroupId(null);
    setLightingPanelCollapsed(false);
    setRoomCeilingMode("hidden");
    setShowFixtureModels(true);
    setAdvancedLightingOpen(false);
    setLightingRoomPanelOpen(false);
    const roomView = buildLightingRoomFullView(space, "full") ?? floorCameraViews.find((view) => view.roomId === space.id || view.outdoorId === space.id);
    if (roomView) activateFloorCameraView(roomView, true);
    else requestFreeBrowse();
  };
  const enterVillaSpace = (entry: VillaSpaceDirectoryEntry) => {
    if (entry.floorId !== floor.id) {
      pendingRoomEntryRef.current = { floorId: entry.floorId, roomId: entry.id };
      onSelectFloor?.(entry.floorId);
      return;
    }
    const space = lightingSpaceSummaries.find((item) => item.id === entry.id);
    if (space) enterLightingSpace(space);
  };
  const returnToLightingOverview = (scope: Exclude<LightingExperienceScope, "currentRoom"> = "wholeHouse") => {
    setLightingExperienceScope(scope);
    setSelectedLightingSpaceId(null);
    setLightingWallMode("smartCutaway");
    setLightingRoomPanelOpen(false);
    setLightingPanelCollapsed(true);
    setRoomCeilingMode("hidden");
    setVillaOverviewMode(scope === "currentFloor" ? "singleFloor" : "wholeVilla");
    const overview = floorCameraViews.find((view) => view.name === "鸟瞰");
    if (overview) activateFloorCameraView(overview, true);
    else requestCameraPreset("overview");
  };
  const stepLightingSpace = (direction: -1 | 1) => {
    if (!villaSpaceDirectory.length) return;
    const selectedIndex = villaSpaceDirectory.findIndex((space) => space.id === selectedLightingSpaceId && space.floorId === floor.id);
    const floorStartIndex = villaSpaceDirectory.findIndex((space) => space.floorId === floor.id);
    const currentIndex = selectedIndex >= 0 ? selectedIndex : Math.max(0, floorStartIndex);
    enterVillaSpace(villaSpaceDirectory[(currentIndex + direction + villaSpaceDirectory.length) % villaSpaceDirectory.length]);
  };
  const changeLightingRoomViewMode = (mode: LightingRoomViewMode) => {
    setLightingRoomViewMode(mode);
    if (!selectedLightingSpace) return;
    const roomView = buildLightingRoomFullView(selectedLightingSpace, mode);
    if (roomView) activateFloorCameraView(roomView, true);
  };
  const setLightingGroupBrightness = (groupId: string, brightness: number) => {
    setLightingGroupOverrides((current) => ({ ...current, [groupId]: brightness }));
  };
  const toggleLightingGroup = (groupId: string, on: boolean) => setLightingGroupBrightness(groupId, on ? Math.max(65, lightingControlBrightness.get(groupId) ?? 70) : 0);
  const toggleLightingGroupSolo = (groupId: string) => {
    if (lightingSoloGroupId === groupId) {
      setLightingGroupOverrides(lightingSoloBackupRef.current ?? {});
      lightingSoloBackupRef.current = null;
      setLightingSoloGroupId(null);
      return;
    }
    const roomGroupIds = new Set(lightingRoomGroups.map((group) => group.id));
    const backup = Object.fromEntries(Array.from(roomGroupIds).map((id) => [id, lightingControlBrightness.get(id) ?? 0]));
    lightingSoloBackupRef.current = backup;
    const next = Object.fromEntries(Array.from(roomGroupIds).map((id) => [id, id === groupId ? Math.max(65, backup[id] ?? 70) : 0]));
    setLightingGroupOverrides(next);
    setLightingSoloGroupId(groupId);
    setLightingSelectedGroupId(groupId);
  };
  const setRoomLightingAll = (on: boolean) => {
    setLightingGroupOverrides(Object.fromEntries(lightingRoomGroups.map((group) => [group.id, on ? 100 : 0])));
    setLightingSoloGroupId(null);
    lightingSoloBackupRef.current = null;
  };
  const changeVillaOverviewMode = (mode: VillaOverviewMode) => {
    setVillaOverviewMode(mode);
    setSelectedLightingSpaceId(null);
    setLightingExperienceScope(mode === "singleFloor" ? "currentFloor" : "wholeHouse");
    setLightingPanelCollapsed(true);
    setRoomCeilingMode("hidden");
    setCameraMode("orbit");
    if (mode === "singleFloor") {
      const overview = floorCameraViews.find((view) => view.name === "鸟瞰");
      if (overview) activateFloorCameraView(overview, true);
      else requestCameraPreset("overview");
      return;
    }
    const fixedView: FixedCameraView = {
      id: `villa-${mode}-${floor.id}`,
      name: mode === "wholeVilla" ? "全屋俯视" : "斜向别墅总览",
      floor: floor.id,
      cameraPosition: mode === "wholeVilla" ? { x: 8.8, y: 15.8, z: 10.8 } : { x: 12.4, y: 9.6, z: 13.2 },
      target: { x: 0, y: 2.65, z: 0 },
      mode: "perspective",
      description: mode === "wholeVilla" ? "查看整套小别墅的楼层、房间、楼梯与庭院关系" : "以模拟人生式斜向模型查看整套别墅"
    };
    activateFloorCameraView({
      id: fixedView.id,
      floorId: floor.id,
      name: fixedView.name,
      category: "general",
      cameraMode: "orbit",
      cameraPosition: fixedView.cameraPosition,
      target: fixedView.target,
      fixedView,
      primary: true,
      priority: -100
    // This is an internal whole-building camera, not a floor camera selection.
    // Avoid echoing it through the parent camera request, which would replay it
    // as a single-floor view on mobile.
    }, true, false, true);
  };
  const resetMobileCamera = () => {
    setCameraMode("orbit");
    setActiveTourNode(null);
    setActiveCameraViewId(null);
    setTourPanelOpen(false);
    setMaterialPreview(true);
    setShowServicePoints(false);
    setPresentationMode(true);
    if (mobilePresentationMode) {
      changeVillaOverviewMode("wholeVilla");
      return;
    }
    const defaultView = floorCameraViews.find((view) => view.defaultForFloor) ?? floorCameraViews.find((view) => view.name === "鸟瞰");
    if (defaultView) activateFloorCameraView(defaultView);
    else setCameraRequest((current) => ({ preset: "overview", fixedView: getMobileDefaultCameraView(floor, houseStructure), version: current.version + 1 }));
  };
  useEffect(() => {
    if (!mobilePresentationMode) return;
    resetMobileCamera();
  }, [mobilePresentationMode, resetViewRequest]);
  useEffect(() => {
    const requestedView = cameraViewRequest?.view;
    if (!requestedView || requestedView.floor !== floor.id) return;
    const configured = floorCameraViews.find((view) => view.id === requestedView.id);
    if (configured) activateFloorCameraView(configured, false, false);
    else activateFloorCameraView({
      id: requestedView.id, floorId: floor.id, name: requestedView.name, category: "feature", cameraMode: "fixed",
      cameraPosition: requestedView.cameraPosition, target: requestedView.target, description: requestedView.description,
      fixedView: requestedView, primary: false, priority: 500
    }, false, false);
  }, [cameraViewRequest?.nonce]);
  const requestCameraPreset = (preset: CameraPreset) => {
    const generalName = preset === "overview" ? "鸟瞰" : preset === "front" ? "前" : preset === "right" ? "右" : preset === "back" ? "后" : preset === "left" ? "左" : null;
    const configured = generalName ? floorCameraViews.find((view) => view.name === generalName) : null;
    if (configured) {
      activateFloorCameraView(configured);
      return;
    }
    setActiveCameraViewId(null);
    setActiveTourNode(null);
    setCameraMode(preset === "living" ? "walkthrough" : "orbit");
    setCameraRequest((current) => ({ preset, fixedView: null, version: current.version + 1 }));
  };
  const goToTourNode = (node: RoomTourView) => {
    if (mobilePresentationMode) setPresentationMode(true);
    setMaterialPreview(true);
    setShowServicePoints(false);
    const isStairInspection = node.type === "stair" || Boolean(node.targetArea?.startsWith("stair"));
    const configured = floorCameraViews.find((view) => view.id === node.id);
    if (configured) activateFloorCameraView(configured);
    else activateFloorCameraView({
      id: node.id, floorId: node.floorId, name: node.name, category: node.type === "viewpoint" ? "feature" : "room",
      cameraMode: node.isFloorOverview ? "orbit" : isStairInspection ? "fixed" : "tour", cameraPosition: node.cameraPosition, target: node.target,
      roomId: node.roomId, outdoorId: node.outdoorId, description: node.description, fixedView: tourNodeToCameraView(node),
      tourView: node, primary: false, priority: 500
    });
  };
  const applyDrawingViewPreset = (preset: Drawing3DViewPreset) => {
    setDrawingViewPreset(preset);
    if (preset === "interiorTour" || preset === "currentRoom") {
      const requestedRoomId = selectedDrawingItem?.relatedRoomId ?? selectedDrawingItem?.roomId ?? (selectedObjectId ? selectedFurniture?.roomId : undefined);
      const node = currentFloorTourNodes.find((item) => !item.isFloorOverview && item.roomId === requestedRoomId)
        ?? currentFloorTourNodes.find((item) => !item.isFloorOverview && /入口|玄关|公共|客厅|起居|餐|厨房|活动区|主卧|庭院/.test(item.name))
        ?? currentFloorTourNodes.find((item) => !item.isFloorOverview);
      if (node) {
        goToTourNode(node);
        return;
      }
      setCameraMode("walkthrough");
      setActiveTourNode(null);
      setCameraRequest((current) => ({ preset: "living", fixedView: null, version: current.version + 1 }));
      return;
    }
    if (preset === "ceilingUp") {
      const ceilingView = floorCameraViews.find((view) => view.name === "顶面观察");
      if (ceilingView) {
        activateFloorCameraView(ceilingView);
        return;
      }
      setCameraMode("orbit");
      setActiveTourNode(null);
      setActiveCameraViewId(null);
      setCameraRequest((current) => ({
        preset: current.preset,
        fixedView: {
          id: `specialty-ceiling-${floor.id}`,
          name: `${floor.label} 顶面观察`,
          floor: floor.id,
          cameraPosition: { x: 0, y: 0.85, z: 2.6 },
          target: { x: 0, y: DEFAULT_CEILING_HEIGHT_MM * MM_TO_M, z: 0 },
          mode: "perspective",
          description: "从室内向上检查吊顶区域、灯具、风口与检修口。"
        },
        version: current.version + 1
      }));
      return;
    }
    if (preset === "wallElevation") {
      const selectedWall = houseStructure.walls.find((wall) => wall.id === selectedObjectId && wall.kind === "straight");
      if (selectedWall?.kind === "straight") {
        const start = toScenePoint(selectedWall.start, houseStructure);
        const end = toScenePoint(selectedWall.end, houseStructure);
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        const length = Math.max(0.01, Math.hypot(dx, dz));
        const center = { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 };
        setCameraMode("orbit");
        setActiveTourNode(null);
        setActiveCameraViewId(`specialty-wall-${selectedWall.id}`);
        setCameraRequest((current) => ({
          preset: current.preset,
          fixedView: {
            id: `specialty-wall-${selectedWall.id}`,
            name: `${selectedWall.name} 正视`,
            floor: floor.id,
            cameraPosition: { x: center.x - dz / length * 4, y: 1.45, z: center.z + dx / length * 4 },
            target: { x: center.x, y: 1.45, z: center.z },
            mode: "orthographic",
            zoom: 80,
            description: "自动正对当前墙面。"
          },
          version: current.version + 1
        }));
        return;
      }
      requestCameraPreset("front");
      return;
    }
    if (preset === "currentObject") {
      const drawingPoint = selectedDrawingItem ? toScenePoint(selectedDrawingItem.positionMm, houseStructure) : null;
      const furniturePoint = selectedFurniture ? getFurnitureScenePosition(selectedFurniture, houseStructure) : null;
      const targetPoint = drawingPoint ?? furniturePoint;
      if (targetPoint) {
        const targetY = selectedDrawingItem ? drawingItemHeightM(selectedDrawingItem) : 0.65;
        setCameraMode("orbit");
        setActiveTourNode(null);
        setActiveCameraViewId(`specialty-object-${selectedObjectId}`);
        setCameraRequest((current) => ({
          preset: current.preset,
          fixedView: {
            id: `specialty-object-${selectedObjectId}`,
            name: "当前对象",
            floor: floor.id,
            cameraPosition: { x: targetPoint.x + 2.6, y: Math.max(1.4, targetY + 0.8), z: targetPoint.z + 2.6 },
            target: { x: targetPoint.x, y: targetY, z: targetPoint.z },
            mode: "perspective",
            description: "围绕当前选中对象检查定位与关联。"
          },
          version: current.version + 1
        }));
        return;
      }
    }
    requestCameraPreset(preset === "fullSpace" ? "front" : "overview");
  };
  useEffect(() => {
    setMaterialPreview(villaExperienceEnabled || drawingProfile.materialMode === "realistic");
    setShowServicePoints(false);
    setPresentationMode(false);
    setCeilingSolid(false);
    setShowBeamCones(false);
    setShowLightSpots(false);
    setShowControlRelations(false);
    setShowIlluminanceLayer(false);
    setShowFixtureModels(villaExperienceEnabled);
    setShowFixtureIds(false);
    setAdvancedLightingOpen(false);
    setLightingAnalysisMode("none");
    setLightingGroupOverrides({});
    setLightingPanelCollapsed(true);
    setLightingRoomViewMode("full");
    setLightingSelectedGroupId(null);
    setLightingSoloGroupId(null);
    lightingSoloBackupRef.current = null;
    setMaterialCategoryFilter("all");
  }, [drawingSheetType, villaExperienceEnabled]);
  useEffect(() => {
    const floorChanged = previousFloorIdRef.current !== floor.id;
    previousFloorIdRef.current = floor.id;
    setTourPanelOpen(false);
    setActiveTourNode(null);
    setActiveCameraViewId(null);
    setCameraMode("orbit");
    if (villaExperienceEnabled || drawingSheetType === "lightingPlan") {
      setLightingExperienceScope("wholeHouse");
      setSelectedLightingSpaceId(null);
      setLightingWallMode("smartCutaway");
      setLightingRoomPanelOpen(false);
      setLightingPanelCollapsed(true);
      setLightingRoomViewMode("full");
      setLightingSelectedGroupId(null);
      setLightingSoloGroupId(null);
    }
    if (mobilePresentationMode) {
      // The first 3D view restores the four-storey composition. Choosing a
      // floor tab is an explicit request to inspect just that floor.
      changeVillaOverviewMode(floorChanged ? "singleFloor" : "wholeVilla");
      setDrawingViewPreset("birdseyeEdit");
      return;
    }
    if (villaExperienceEnabled) {
      // Selecting a floor is an explicit request to inspect that floor. Keep the
      // complete stair/opening geometry instead of leaving the user in the
      // simplified whole-villa lighting overview.
      changeVillaOverviewMode(floorChanged ? "singleFloor" : villaOverviewMode === "singleFloor" ? "singleFloor" : villaOverviewMode);
      setDrawingViewPreset("birdseyeEdit");
      return;
    }
    const defaultView = drawingSheetType === "lightingPlan"
      ? floorCameraViews.find((view) => view.name === "鸟瞰")
      : floorCameraViews.find((view) => view.defaultForFloor) ?? floorCameraViews.find((view) => view.name === "鸟瞰");
    if (defaultView) activateFloorCameraView(defaultView, drawingSheetType === "lightingPlan");
    else requestCameraPreset("overview");
    setDrawingViewPreset(drawingSheetType === "lightingPlan" ? "birdseyeEdit" : drawingProfile.defaultPreset);
  }, [drawingSheetType, floor.id, mobilePresentationMode, villaExperienceEnabled]);
  useEffect(() => {
    const pending = pendingRoomEntryRef.current;
    if (!pending || pending.floorId !== floor.id) return;
    const space = lightingSpaceSummaries.find((item) => item.id === pending.roomId);
    if (!space) return;
    pendingRoomEntryRef.current = null;
    enterLightingSpace(space);
  }, [floor.id, lightingSpaceSummaries]);
  useEffect(() => {
    if (drawingSheetType !== "wallFinishPlan" || !selectedObjectId) return;
    if (houseStructure.walls.some((wall) => wall.id === selectedObjectId)) applyDrawingViewPreset("wallElevation");
  }, [drawingSheetType, selectedObjectId]);
  const stepCameraView = (direction: -1 | 1) => {
    if (!floorCameraViews.length) return;
    const startIndex = activeViewIndex >= 0 ? activeViewIndex : floorCameraViews.findIndex((view) => view.name === "鸟瞰");
    const nextIndex = (startIndex + direction + floorCameraViews.length) % floorCameraViews.length;
    activateFloorCameraView(floorCameraViews[nextIndex]);
  };
  const selectionAllowed = () => performance.now() > suppressSelectionUntilRef.current;
  const handleGesturePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    gestureRef.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gestureRef.current.pointers.size > 1) gestureRef.current.moved = true;
  };
  const handleGesturePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = gestureRef.current.pointers.get(event.pointerId);
    if (!start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) gestureRef.current.moved = true;
  };
  const handleGesturePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current.moved) suppressSelectionUntilRef.current = performance.now() + 180;
    gestureRef.current.pointers.delete(event.pointerId);
    if (gestureRef.current.pointers.size === 0) gestureRef.current.moved = false;
  };
  const togglePresentationMode = () => {
    setPresentationMode((enabled) => {
      const nextEnabled = !enabled;
      if (nextEnabled) {
        setMaterialPreview(true);
        setShowServicePoints(false);
        setCameraMode("orbit");
        setActiveTourNode(null);
        setActiveCameraViewId(null);
        const overview = floorCameraViews.find((view) => view.name === "鸟瞰");
        if (overview) activateFloorCameraView(overview);
      }
      return nextEnabled;
    });
  };
  const lightingExperienceActive = villaExperienceEnabled || drawingSheetType === "lightingPlan";

  return (
    <div
      className={`relative h-full overflow-hidden bg-[#ede7da] transition ${mobilePresentationMode ? "min-h-0 rounded-none border-0 shadow-none" : `min-h-[560px] rounded-[1.75rem] border ${presentationMode ? "border-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.48),0_22px_90px_rgba(84,69,50,0.18)]" : "border-white/70 shadow-inner"}`}`}
      onDoubleClick={() => {
        if (mobilePresentationMode) resetMobileCamera();
      }}
      onPointerDownCapture={handleGesturePointerDown}
      onPointerMoveCapture={handleGesturePointerMove}
      onPointerUpCapture={handleGesturePointerEnd}
      onPointerCancelCapture={handleGesturePointerEnd}
      data-room-tour-active={activeTourNode ? "true" : "false"}
      data-drawing-sheet-type={drawingSheetType}
      data-drawing-3d-preset={drawingViewPreset}
      data-camera-mode={cameraMode}
      data-active-camera-view-id={activeCameraViewId ?? ""}
      data-villa-experience={villaExperienceEnabled ? "true" : "false"}
      data-villa-overview-mode={villaOverviewMode}
      data-villa-stack-floor-count={VILLA_BUILDING_FLOOR_IDS.filter((floorId) => Boolean(houseStructuresByFloor[floorId])).length}
      data-mobile-wall-treatment={mobilePresentationMode ? "full-height-translucent" : undefined}
      data-villa-space-count={villaSpaceDirectory.length}
      data-villa-light-count={villaConfiguredLightCount}
      data-current-space-floor={selectedLightingSpace?.floorId ?? ""}
      data-lighting-scene={lightingExperienceActive ? lightingScene : undefined}
      data-lighting-experience-scope={lightingExperienceActive ? lightingExperienceScope : undefined}
      data-lighting-wall-mode={lightingExperienceActive ? lightingWallMode : undefined}
      data-lighting-analysis-mode={lightingExperienceActive ? lightingAnalysisMode : undefined}
      data-furniture-height-mode={effectiveFurnitureHeightMode}
      data-wall-display-mode={effectiveWallDisplayMode}
      data-material-preview={materialPreview ? "true" : "false"}
      data-design-style={designStyle}
      data-scene-furniture-count={furniture.length}
      data-scene-furniture-signature={getFurnitureGeometrySignature(furniture)}
      data-scene-wall-signature={getWallGeometrySignature(houseStructure)}
      data-specialty-fallback={specialtyFallback ? "true" : "false"}
    >
      <Canvas
        key={floor.id}
        shadows={!mobilePresentationMode || mobileQuality === "high"}
        dpr={mobilePresentationMode ? [1, mobileQuality === "high" ? 1.75 : 1.25] : [1.25, 2]}
        camera={{ fov: mobilePresentationMode ? 48 : 42, near: 0.1, far: 80 }}
        gl={{ antialias: !mobilePresentationMode || mobileQuality === "high", preserveDrawingBuffer: true, powerPreference: mobilePresentationMode && mobileQuality === "balanced" ? "low-power" : "high-performance" }}
      >
        <Floor3DScene
          drawingSheetType={drawingSheetType}
          drawingItems={drawingItems}
          allDrawingItems={villaDrawingItems}
          drawingViewPreset={drawingViewPreset}
          villaExperienceEnabled={villaExperienceEnabled}
          villaOverviewMode={villaOverviewMode}
          currentRoomId={selectedLightingSpace?.kind === "room" ? selectedLightingSpace.id : null}
          currentOutdoorId={selectedLightingSpace?.kind === "outdoor" ? selectedLightingSpace.id : null}
          roomCeilingMode={roomCeilingMode}
          lightingScene={lightingScene}
          lightingControlBrightness={lightingControlBrightness}
          showFixtureModels={showFixtureModels}
          showFixtureIds={showFixtureIds}
          showBeamCones={showBeamCones}
          showLightSpots={showLightSpots}
          showControlRelations={showControlRelations}
          showIlluminanceLayer={showIlluminanceLayer}
          lightingSelectedGroupId={lightingSelectedGroupId}
          lightingSoloGroupId={lightingSoloGroupId}
          lightingExperienceScope={lightingExperienceScope}
          lightingWallMode={lightingWallMode}
          lightingAnalysisMode={lightingAnalysisMode}
          lightingSpaceSummaries={lightingSpaceSummaries}
          ceilingSolid={ceilingSolid}
          materialCategoryFilter={materialCategoryFilter}
          cameraPreset={cameraRequest.preset}
          fixedCameraView={cameraRequest.fixedView}
          cameraRequestVersion={cameraRequest.version}
          freeBrowseVersion={freeBrowseVersion}
          cameraMode={cameraMode}
          activeTourNode={activeTourNode}
          mobilePresentationMode={mobilePresentationMode}
          cameraPlanNavigationRequest={cameraPlanNavigationRequest}
          onCameraPlanPoseChange={setCameraPlanPose}
          materialPreview={materialPreview}
          designStyle={designStyle}
          presentationMode={presentationMode}
          mobileQuality={mobileQuality}
          showServicePoints={showServicePoints}
          showStairDebug={showStairDebug}
          houseStructure={houseStructure}
          houseStructuresByFloor={houseStructuresByFloor}
          stairSystems={stairSystems}
          stairLandings={stairLandings}
          stairOpenings={stairOpenings}
          furniture={furniture}
          allFurniture={villaFurniture}
          selectedObjectId={selectedObjectId}
          selectedFurnitureId={selectedFurnitureId}
          onSelectStructure={(objectId) => {
            if (selectionAllowed()) onSelectStructure(objectId);
          }}
          onSelectFurniture={(item) => {
            if (selectionAllowed()) onSelectFurniture(item);
          }}
          onSelectDrawingItem={(drawingItemId) => {
            if (selectionAllowed()) onSelectDrawingItem(drawingItemId);
          }}
          onEnterRoom={(floorId, roomId) => {
            if (floorId !== floor.id) {
              pendingRoomEntryRef.current = { floorId, roomId };
              onSelectFloor?.(floorId);
              return;
            }
            const space = lightingSpaceSummaries.find((item) => item.id === roomId);
            if (space) enterLightingSpace(space);
          }}
          onToggleControlGroup={(groupId) => toggleLightingGroup(groupId, (lightingControlBrightness.get(groupId) ?? 0) <= 0)}
          onHoverObject={onHoverObject}
          onClearHoverObject={onClearHoverObject}
        />
      </Canvas>

      {lightingExperienceActive && cameraMode === "orbit" && !activeCameraViewId && !mobilePresentationMode && lightingExperienceScope !== "wholeHouse" && (
        <LightingFreeBrowseMinimap
          structure={houseStructure}
          drawingItems={drawingItems}
          pose={cameraPlanPose}
          onNavigate={(target) => setCameraPlanNavigationRequest((current) => ({
            ...target,
            version: (current?.version ?? 0) + 1
          }))}
        />
      )}

      {lightingExperienceActive && !mobilePresentationMode && lightingExperienceScope !== "currentRoom" && (
        <aside className={`absolute left-4 z-[82] overflow-hidden rounded-2xl border border-white/80 bg-stone-950/78 text-white shadow-2xl backdrop-blur-xl ${lightingPanelCollapsed ? "bottom-20 max-w-[calc(100%-2rem)]" : "bottom-20 top-4 flex w-72 flex-col"}`} data-testid="lighting-room-overview-panel">
          {lightingPanelCollapsed && (
            <div className="flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto p-1.5">
              <span className="shrink-0 rounded-lg bg-white/12 px-3 py-2 text-xs font-black">{selectedLightingSpace?.name ?? "选择房间"}</span>
              {villaQuickSpaces.slice(0, 6).map((space) => <button key={`${space.floorId}-${space.id}`} className={`max-w-28 shrink-0 truncate rounded-lg px-3 py-2 text-xs font-bold ${selectedLightingSpaceId === space.id && floor.id === space.floorId ? "bg-amber-300 text-stone-950" : "bg-white/10 hover:bg-white/20"}`} onClick={() => enterVillaSpace(space)} type="button">{villaFloorShortLabels[space.floorId]} · {space.name}</button>)}
              {villaSpaceDirectory.length > 6 && <button className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold" onClick={() => setLightingPanelCollapsed(false)} type="button">全屋空间</button>}
              <button aria-label="展开房间导航" className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10" onClick={() => setLightingPanelCollapsed(false)} type="button">＋</button>
            </div>
          )}
          {!lightingPanelCollapsed && <>
          <div className="border-b border-white/10 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/80">{floor.id} · Lighting experience</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black">全屋灯光总览</h2>
                <p className="mt-0.5 text-[11px] text-stone-300">{activeLightingControlSceneId === "__all_on__" ? "全开" : activeLightingControlScene?.name ?? "日常"} · {lightingSceneModeLabels[lightingScene]}</p>
              </div>
              <div className="flex items-center gap-1">
                <button aria-label="收起房间导航" className="grid size-8 place-items-center rounded-full bg-white/10 text-lg" onClick={() => setLightingPanelCollapsed(true)} type="button">−</button>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-stone-300">
              <span>全部楼层与庭院</span>
              <span>{villaSpaceDirectory.length} 个空间</span>
            </div>
            <div className="space-y-2">
              {villaSpaceDirectory.map((space) => (
                <button
                  key={`${space.floorId}-${space.id}`}
                  aria-pressed={selectedLightingSpaceId === space.id && floor.id === space.floorId}
                  className={`w-full overflow-hidden rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${selectedLightingSpaceId === space.id && floor.id === space.floorId ? "border-amber-300 bg-white/16" : "border-white/10 bg-white/8 hover:bg-white/12"}`}
                  data-lighting-room-id={space.id}
                  onClick={() => enterVillaSpace(space)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-3"><span className="min-w-0"><span className="block text-[10px] font-black text-amber-200">{villaFloorShortLabels[space.floorId]} · {space.kind === "outdoor" ? "庭院" : "房间"}</span><span className="mt-1 block truncate text-sm font-black">{space.name}</span></span><span className="shrink-0 text-right text-[10px] text-stone-300"><span className="block">{space.lightCount} 盏灯</span><span className="mt-1 block">{space.switchCount} 个开关</span></span></span>
                </button>
              ))}
            </div>
            {selectedLightingSpace && (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3" data-testid="lighting-room-group-controls">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">房间灯组</span>
                  <div className="flex gap-1">
                    <button aria-label="上一个房间" className="grid size-7 place-items-center rounded-full bg-white/10" onClick={() => stepLightingSpace(-1)} type="button">‹</button>
                    <button aria-label="下一个房间" className="grid size-7 place-items-center rounded-full bg-white/10" onClick={() => stepLightingSpace(1)} type="button">›</button>
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  {selectedLightingSpace.controlGroupIds.map((groupId) => (
                    <label key={groupId} className="block text-[10px] text-stone-300">
                      <span className="flex items-center justify-between gap-2"><span className="truncate">{groupId}</span><span>{Math.round(lightingControlBrightness.get(groupId) ?? 0)}%</span></span>
                      <input
                        aria-label={`${groupId} 亮度`}
                        className="mt-1 w-full accent-amber-400"
                        max="100"
                        min="0"
                        onChange={(event) => setLightingGroupOverrides((current) => ({ ...current, [groupId]: Number(event.target.value) }))}
                        type="range"
                        value={lightingControlBrightness.get(groupId) ?? 0}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          </>}
        </aside>
      )}

      {lightingExperienceActive && !mobilePresentationMode && lightingExperienceScope === "currentRoom" && selectedLightingSpace && !lightingPanelCollapsed && (
        <aside className="absolute bottom-20 right-4 top-20 z-[85] flex w-80 flex-col overflow-hidden rounded-2xl border border-white/80 bg-[#faf8f4]/96 text-stone-800 shadow-2xl backdrop-blur-xl" data-testid="lighting-room-group-panel">
          <div className="border-b border-stone-200 px-4 py-3">
            <div className="flex items-center justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">{villaFloorShortLabels[selectedLightingSpace.floorId]} · 当前空间灯组</div><h3 className="mt-1 text-lg font-black">{selectedLightingSpace.name}</h3></div><button aria-label="关闭灯组面板" className="grid size-8 place-items-center rounded-full bg-stone-100 text-lg" onClick={() => setLightingPanelCollapsed(true)} type="button">×</button></div>
            <div className="mt-3 flex gap-2"><button className="flex-1 rounded-lg bg-stone-900 px-2 py-2 text-[11px] font-bold text-white" onClick={() => setRoomLightingAll(true)} type="button">本房间全开</button><button className="flex-1 rounded-lg bg-stone-200 px-2 py-2 text-[11px] font-bold" onClick={() => setRoomLightingAll(false)} type="button">本房间全关</button><button className="rounded-lg bg-amber-100 px-2 py-2 text-[11px] font-bold text-amber-900" onClick={() => { setLightingGroupOverrides({}); setLightingSoloGroupId(null); lightingSoloBackupRef.current = null; }} type="button">推荐</button></div>
            <div className="mt-3 flex items-center gap-1 rounded-lg bg-stone-100 p-1">{([['full','室内全景'],['human','自由探索'],['top','俯视房间']] as Array<[LightingRoomViewMode,string]>).map(([mode,label]) => <button key={mode} className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold ${lightingRoomViewMode === mode ? "bg-white shadow-sm" : "text-stone-500"}`} onClick={() => changeLightingRoomViewMode(mode)} type="button">{label}</button>)}</div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="mb-2 flex items-center justify-between text-[10px] font-bold text-stone-500"><span>{lightingRoomGroups.length} 组灯光 · {selectedLightingSpace.totalLightCount} 盏</span><span>{selectedLightingSpace.dominantColorTemperature ?? "3000K"}</span></div>
            {selectedDrawingItem && (selectedDrawingItem.category === "light" || selectedDrawingItem.category === "switch") && <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3" data-testid="villa-selected-object-card"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">已选择{selectedDrawingItem.category === "switch" ? "墙面开关" : "灯具"}</div><div className="mt-1 text-sm font-black">{selectedDrawingItem.label || selectedDrawingItem.id}</div><div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-stone-600"><span>类型：{selectedDrawingItem.lightType ?? selectedDrawingItem.type}</span><span>色温：{selectedDrawingItem.colorTemperature ?? "—"}</span><span>功率：{selectedDrawingItem.lightSpec?.powerW ? `${selectedDrawingItem.lightSpec.powerW}W` : "—"}</span><span>光束角：{selectedDrawingItem.beamAngle ? `${selectedDrawingItem.beamAngle}°` : "—"}</span><span className="col-span-2 truncate">灯组：{selectedDrawingItem.controlGroupId ?? "未分组"}</span></div>{selectedDrawingItem.category === "switch" && <button className="mt-2 w-full rounded-lg bg-blue-700 px-3 py-2 text-[10px] font-black text-white" onClick={() => selectedDrawingItem.controlGroupId && toggleLightingGroup(selectedDrawingItem.controlGroupId, (lightingControlBrightness.get(selectedDrawingItem.controlGroupId) ?? 0) <= 0)} type="button">立即切换所控灯组</button>}</div>}
            {selectedFurniture && selectedFurnitureInExperience && <div className="mb-3 rounded-xl border border-stone-200 bg-white p-3" data-testid="villa-selected-object-card"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-500">家具 / 柜体</div><div className="mt-1 text-sm font-black">{selectedFurniture.name}</div><div className="mt-2 text-[10px] leading-5 text-stone-600">尺寸：{selectedFurniture.dimensions.width} × {selectedFurniture.dimensions.depth} × {selectedFurniture.dimensions.height} cm<br />材质：{materialText(selectedFurniture) || "默认家装材质"}<br />Variant：{selectedFurniture.render3d?.variantId ?? selectedFurniture.moduleType ?? "默认"}</div><button className="mt-2 w-full rounded-lg bg-stone-900 px-3 py-2 text-[10px] font-black text-white" onClick={() => changeLightingRoomViewMode("full")} type="button">返回空间全景</button></div>}
            <div className="space-y-2">
              {lightingRoomGroups.map((group) => <div key={group.id} className={`rounded-xl border p-3 ${lightingSelectedGroupId === group.id ? "border-amber-400 bg-amber-50" : "border-stone-200 bg-white"}`}>
                <div className="flex items-start gap-2"><button className="min-w-0 flex-1 text-left" onClick={() => setLightingSelectedGroupId(group.id)} type="button"><div className="truncate text-sm font-black">{group.label}</div><div className="mt-1 text-[10px] text-stone-500">{group.items.length} 盏 · {group.fixtureTypes} · {group.colorTemperature ?? "3000K"}</div></button><button aria-label={`${group.label}开关`} aria-pressed={group.enabled} className={`rounded-full px-2 py-1 text-[10px] font-black ${group.enabled ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-500"}`} onClick={() => toggleLightingGroup(group.id, !group.enabled)} type="button">{group.enabled ? "开" : "关"}</button></div>
                <div className="mt-2 flex items-center gap-2"><input aria-label={`${group.label}亮度`} className="min-w-0 flex-1 accent-amber-500" max="100" min="0" onChange={(event) => setLightingGroupBrightness(group.id, Number(event.target.value))} type="range" value={group.brightness} /><span className="w-8 text-right text-[10px] font-black">{Math.round(group.brightness)}%</span></div>
                <div className="mt-2 flex gap-1"><button className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold ${lightingSoloGroupId === group.id ? "bg-amber-500 text-white" : "bg-stone-100"}`} onClick={() => toggleLightingGroupSolo(group.id)} type="button">{lightingSoloGroupId === group.id ? "退出单组预览" : "只看该组"}</button><button className="rounded-md bg-stone-100 px-2 py-1.5 text-[10px] font-bold" onClick={() => setLightingSelectedGroupId(group.id)} type="button">高亮</button></div>
                {lightingSelectedGroupId === group.id && <div className="mt-2 border-t border-stone-200 pt-2"><div className="mb-1 text-[10px] font-black text-stone-500">单灯调试</div>{group.items.map((item) => <div key={item.id} className="mb-1 rounded-lg bg-stone-50 px-2 py-1.5 text-[10px]"><div className="flex items-center justify-between gap-2"><span className="truncate font-bold">{item.label ?? item.id}</span><span>{item.colorTemperature ?? "3000K"}</span></div><div className="mt-1 flex items-center justify-between text-stone-500"><span>{item.id} · {item.lightType ?? item.type}</span><button className="font-bold text-amber-800" onClick={() => onSelectDrawingItem(item.id)} type="button">定位</button></div></div>)}</div>}
              </div>)}
            </div>
          </div>
        </aside>
      )}

      {lightingExperienceActive && !mobilePresentationMode && lightingExperienceScope === "currentRoom" && selectedLightingSpace && lightingPanelCollapsed && (
        <button className="absolute right-4 top-24 z-[86] rounded-xl border border-white/80 bg-white/92 px-3 py-3 text-xs font-black text-stone-800 shadow-lg backdrop-blur" onClick={() => setLightingPanelCollapsed(false)} type="button">灯组 ›</button>
      )}

      {lightingExperienceActive && !mobilePresentationMode && !advancedLightingOpen && (
        <aside className="absolute bottom-4 left-1/2 z-[84] -translate-x-1/2 rounded-xl border border-white/80 bg-stone-950/78 p-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur" data-testid="lighting-scene-summary">
          {lightingExperienceScope === "currentRoom" && selectedLightingSpace ? <div className="flex items-center gap-1"><button className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20" onClick={() => changeLightingRoomViewMode("full")} type="button">推荐站位</button><button aria-label="上一个房间" className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20" onClick={() => stepLightingSpace(-1)} type="button">‹ 上一个空间</button><button aria-label="下一个房间" className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20" onClick={() => stepLightingSpace(1)} type="button">下一个空间 ›</button></div> : <div className="px-3 py-2"><span className="font-black">{villaOverviewMode === "wholeVilla" ? "整套别墅" : villaOverviewMode === "angled" ? "斜向别墅" : floor.label}</span><span className="mx-2 text-white/35">·</span><span>{villaSpaceDirectory.length} 个可进入空间 · {villaConfiguredLightCount} 盏灯已配置</span></div>}
        </aside>
      )}

      {lightingExperienceActive && mobilePresentationMode && (
        <div className="pointer-events-none absolute inset-x-3 top-[4.25rem] z-[88] flex justify-center">
          <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-white/70 bg-stone-950/78 p-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur">
            <button className="max-w-28 truncate rounded-full bg-white/10 px-3 py-2" onClick={() => setLightingRoomPanelOpen(true)} type="button">空间 · {selectedLightingSpace?.name ?? villaSpaceDirectory.length}</button>
            <div className="flex rounded-full bg-white/10 p-0.5"><button className={`rounded-full px-2 py-1 ${lightingScene === "dayWithLights" ? "bg-white text-stone-900" : ""}`} onClick={() => setLightingScene("dayWithLights")} type="button">白天</button><button className={`rounded-full px-2 py-1 ${lightingScene === "night" ? "bg-white text-stone-900" : ""}`} onClick={() => setLightingScene("night")} type="button">夜间</button></div>
            <button className="rounded-full bg-white/10 px-3 py-2" onClick={() => returnToLightingOverview()} type="button">全屋总览</button>
            <button className={`rounded-full px-3 py-2 ${advancedLightingOpen ? "bg-amber-400 text-stone-950" : "bg-white/10"}`} onClick={() => setAdvancedLightingOpen((open) => !open)} type="button">分析</button>
          </div>
        </div>
      )}

      {lightingExperienceActive && advancedLightingOpen && (
        <aside className={`absolute z-[97] overflow-y-auto border border-white/80 bg-[#faf8f4]/98 p-4 text-stone-800 shadow-2xl backdrop-blur ${mobilePresentationMode ? "inset-x-3 bottom-3 max-h-[62%] rounded-3xl pb-[max(1rem,env(safe-area-inset-bottom))]" : "right-4 top-20 max-h-[calc(100%-10rem)] w-80 rounded-2xl"}`} data-testid="lighting-advanced-analysis">
          <div className="flex items-start justify-between gap-3">
            <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Advanced analysis</div><h3 className="mt-1 text-lg font-black">高级分析</h3></div>
            <button aria-label="关闭高级分析" className="grid size-9 place-items-center rounded-full bg-stone-100 text-lg" onClick={() => setAdvancedLightingOpen(false)} type="button">×</button>
          </div>
          <div className="mt-4 grid gap-2 rounded-xl bg-stone-100 p-3">
            <div className="rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-stone-500"><span className="block text-[10px] uppercase tracking-[0.16em] text-stone-400">当前工作区内容</span><span className="mt-1 block text-xs font-black text-stone-800">{drawingProfile.label}</span></div>
            {lightingExperienceScope === "currentRoom" && <><label className="text-[11px] font-black text-stone-500">切墙方式<select className="mt-2 h-9 w-full rounded-lg border-0 bg-white px-2 text-xs font-bold" value={lightingWallMode} onChange={(event) => setLightingWallMode(event.target.value as LightingWallMode)}>{(Object.entries(lightingWallModeLabels) as Array<[LightingWallMode,string]>).map(([mode,label]) => <option key={mode} value={mode}>{label}</option>)}</select></label><label className="text-[11px] font-black text-stone-500">顶面<select className="mt-2 h-9 w-full rounded-lg border-0 bg-white px-2 text-xs font-bold" value={roomCeilingMode} onChange={(event) => setRoomCeilingMode(event.target.value as RoomCeilingMode)}><option value="hidden">隐藏顶面</option><option value="translucent">半透明顶面</option><option value="solid">显示顶面</option></select></label></>}
            <button className="rounded-lg bg-stone-800 px-3 py-2 text-xs font-black text-white" onClick={() => setVillaExperienceEnabled(false)} type="button">进入工程 3D 工具</button>
          </div>
          <div className="mt-4">
            <div className="rounded-xl bg-stone-100 p-3"><div className="text-[11px] font-black text-stone-500">高级场景</div><select aria-label="高级灯光场景" className="mt-2 h-9 w-full rounded-lg border-0 bg-white px-2 text-xs font-bold" value={activeLightingControlSceneId} onChange={(event) => { setLightingGroupOverrides({}); setActiveLightingControlSceneId(event.target.value); }}>{primaryLightingScenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.label}</option>)}</select></div>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-black text-stone-500">分析叠层</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([
                ["none", "关闭分析层"],
                ["brightness", "整体亮度热力图"],
                ["colorTemperature", "色温分布"]
              ] as Array<[LightingAnalysisMode, string]>).map(([mode, label]) => (
                <button key={mode} aria-pressed={lightingAnalysisMode === mode} className={`min-h-10 rounded-xl px-3 py-2 text-xs font-bold ${lightingAnalysisMode === mode ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"}`} onClick={() => setLightingAnalysisMode(mode)} type="button">{label}</button>
              ))}
            </div>
            {lightingAnalysisMode === "brightness" && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-semibold leading-4 text-amber-900">视觉估算，不是专业照度报告。颜色用于识别偏暗、舒适、明亮和过亮风险。</p>}
            {lightingAnalysisMode === "colorTemperature" && <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold">{["2700K", "3000K", "3500K", "4000K"].map((value) => <span key={value} className="rounded-full px-2 py-1" style={{ backgroundColor: `${getColorTemperatureAnalysisColor(value as DrawingItem["colorTemperature"])}66` }}>{value}</span>)}</div>}
          </div>
          <div className="mt-5 border-t border-stone-200 pt-4">
            <div className="text-[11px] font-black text-stone-500">技术图层</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([
                [showFixtureModels, setShowFixtureModels, "灯具模型"],
                [showFixtureIds, setShowFixtureIds, "灯具 ID"],
                [showFixtureModels, setShowFixtureModels, "光源位置"],
                [showBeamCones, setShowBeamCones, "光束锥体"],
                [showLightSpots, setShowLightSpots, "光斑"],
                [showControlRelations, setShowControlRelations, "控制关系"],
                [showControlRelations, setShowControlRelations, "开关关系"],
                [showIlluminanceLayer, setShowIlluminanceLayer, "照度辅助层"]
              ] as Array<[boolean, Dispatch<SetStateAction<boolean>>, string]>).map(([enabled, setter, label]) => (
                <button key={label} aria-pressed={enabled} className={`min-h-10 rounded-xl px-3 py-2 text-xs font-bold ${enabled ? "bg-amber-600 text-white" : "bg-stone-100 text-stone-700"}`} onClick={() => setter((value) => !value)} type="button">{label}</button>
              ))}
              <button aria-pressed={showObjectIds} className={`min-h-10 rounded-xl px-3 py-2 text-xs font-bold ${showObjectIds ? "bg-amber-600 text-white" : "bg-stone-100 text-stone-700"}`} onClick={() => onShowObjectIdsChange(!showObjectIds)} type="button">对象信息</button>
            </div>
          </div>
          <details className="mt-5 rounded-xl bg-stone-100 p-3 text-xs">
            <summary className="cursor-pointer font-black">调试信息</summary>
            <div className="mt-2 space-y-1 text-[10px] text-stone-600"><div>范围：{lightingExperienceScope}</div><div>墙体：{lightingWallMode}</div><div>相机：{cameraMode}</div><div>当前视角：{activeCameraViewName ?? "自由浏览"}</div><div>场景：{activeLightingControlSceneId}</div></div>
          </details>
        </aside>
      )}

      {lightingExperienceActive && mobilePresentationMode && lightingRoomPanelOpen && (
        <div className="absolute inset-0 z-[99] flex items-end bg-stone-950/25" data-testid="mobile-lighting-room-drawer" onClick={() => setLightingRoomPanelOpen(false)}>
          <div className="max-h-[68%] w-full overflow-y-auto rounded-t-3xl border border-white/80 bg-[#faf8f4]/98 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto h-1 w-10 rounded-full bg-stone-300" />
            <div className="mt-3 flex items-center justify-between"><div><div className="text-xs font-bold text-stone-500">全屋 · {villaSpaceDirectory.length} 个空间</div><h3 className="text-lg font-black text-stone-900">选择房间或庭院</h3></div><button aria-label="关闭房间预览" className="grid size-10 place-items-center rounded-full bg-stone-100 text-lg" onClick={() => setLightingRoomPanelOpen(false)} type="button">×</button></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {villaSpaceDirectory.map((space) => (
                <button key={`${space.floorId}-${space.id}`} className={`rounded-2xl border p-3 text-left ${selectedLightingSpaceId === space.id && floor.id === space.floorId ? "border-amber-500 bg-amber-50" : "border-stone-200 bg-white"}`} onClick={() => enterVillaSpace(space)} type="button">
                  <span className="block text-[10px] font-black text-amber-700">{villaFloorShortLabels[space.floorId]}</span>
                  <span className="mt-1 block truncate text-sm font-black">{space.name}</span>
                  <span className="mt-2 block text-[10px] font-bold text-stone-500">{space.lightCount} 盏灯 · {space.switchCount} 个开关</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mobilePresentationMode && !lightingExperienceActive && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[85] flex justify-center px-3">
          <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/80 bg-stone-950/78 p-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur" data-testid="mobile-camera-bar">
            <button aria-pressed={villaOverviewMode !== "singleFloor"} className={`whitespace-nowrap rounded-full px-3 py-2 ${villaOverviewMode !== "singleFloor" ? "bg-amber-300 text-stone-950" : "bg-white/10"}`} onClick={() => changeVillaOverviewMode("wholeVilla")} type="button">整栋四层</button>
            <button aria-pressed={!activeCameraViewId} className={`whitespace-nowrap rounded-full px-3 py-2 ${!activeCameraViewId ? "bg-white text-stone-900" : "bg-white/10"}`} onClick={requestFreeBrowse} type="button">自由浏览</button>
            <button aria-pressed={activeCameraView?.name === "鸟瞰"} className={`whitespace-nowrap rounded-full px-3 py-2 ${activeCameraView?.name === "鸟瞰" ? "bg-white text-stone-900" : "bg-white/10"}`} onClick={returnToBirdseye} type="button">鸟瞰</button>
            {primaryCameraViews.slice(0, 1).map((view) => (
              <button key={view.id} aria-pressed={activeCameraViewId === view.id} className={`max-w-24 truncate rounded-full px-3 py-2 ${activeCameraViewId === view.id ? "bg-white text-stone-900" : "bg-white/10"}`} onClick={() => activateFloorCameraView(view)} type="button">{view.name}</button>
            ))}
            <button aria-label="上一个视角" className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10" onClick={() => stepCameraView(-1)} type="button">‹</button>
            <button aria-label="下一个视角" className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10" onClick={() => stepCameraView(1)} type="button">›</button>
            <button aria-pressed={activeViewIsMore || tourPanelOpen} className={`max-w-28 truncate whitespace-nowrap rounded-full px-3 py-2 ${activeViewIsMore ? "bg-white text-stone-900" : "bg-white/10"}`} onClick={() => setTourPanelOpen(true)} type="button">{activeViewIsMore ? `更多 · ${activeCameraViewName}` : "更多"}</button>
            {activeTourNode && <span className="sr-only" data-testid="mobile-tour-title">{floor.id === "YARD" ? "院子" : floor.id} / {activeTourNode.name}</span>}
          </div>
        </div>
      )}

      {activeTourNode && !activeTourNode.isFloorOverview && linkedTourNodes.length > 0 && (
        <div className="pointer-events-none absolute inset-x-3 bottom-24 z-[82] flex flex-wrap justify-center gap-2" data-testid="tour-hotspots">
          {linkedTourNodes.map((node) => (
            <button
              key={node.id}
              className="pointer-events-auto min-h-11 rounded-full border border-white/80 bg-white/92 px-4 py-2 text-xs font-bold text-stone-800 shadow-[0_8px_24px_rgba(28,25,23,0.22)] backdrop-blur active:scale-95"
              onClick={() => goToTourNode(node)}
              type="button"
            >
              <span aria-hidden="true" className="mr-1 text-emerald-700">➜</span>
              {node.isFloorOverview ? "返回楼层总览" : `去${node.name}`}
            </button>
          ))}
        </div>
      )}

      {tourPanelOpen && (
        <div className={`absolute z-[95] ${mobilePresentationMode ? "inset-0 flex items-end bg-stone-950/20" : "bottom-20 left-1/2 w-[min(42rem,calc(100%-2rem))] -translate-x-1/2"}`} data-testid="tour-room-panel" onClick={() => setTourPanelOpen(false)}>
          <div
            className={`w-full overflow-y-auto border border-white/80 bg-[#faf8f4]/98 px-4 pt-3 backdrop-blur ${mobilePresentationMode ? "max-h-[64%] rounded-t-[1.75rem] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-18px_60px_rgba(28,25,23,0.2)]" : "max-h-[28rem] rounded-2xl pb-4 shadow-[0_18px_60px_rgba(28,25,23,0.2)]"}`}
            onClick={(event) => event.stopPropagation()}
          >
            {mobilePresentationMode && <div className="mx-auto h-1 w-10 rounded-full bg-stone-300" />}
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-stone-500">{floor.id === "YARD" ? "院子" : floor.id} · {drawingProfile.label}</div>
                <h3 className="mt-0.5 text-lg font-bold text-stone-900">更多视角</h3>
              </div>
              <button aria-label="关闭更多视角" className="grid size-10 place-items-center rounded-full bg-stone-100 text-lg text-stone-600" onClick={() => setTourPanelOpen(false)} type="button">×</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {moreCameraViews.map((view) => (
                <button
                  key={view.id}
                  className={`min-h-16 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${view.id === activeCameraViewId ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-800"}`}
                  onClick={() => activateFloorCameraView(view)}
                  type="button"
                >
                  <span className="block text-sm font-bold">{view.name}</span>
                  <span className={`mt-1 block text-[11px] ${view.id === activeCameraViewId ? "text-stone-300" : "text-stone-500"}`}>{view.category === "general" ? "通用视角" : view.category === "feature" ? "结构 / 特征视角" : view.category === "lighting-scene" ? "灯光体验视角" : "房间视角"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {presentationMode && !mobilePresentationMode && (
        <div className="pointer-events-none absolute inset-0 z-[50] bg-[radial-gradient(circle_at_50%_48%,rgba(255,255,255,0)_42%,rgba(132,102,64,0.12)_100%)]" />
      )}

      {!mobilePresentationMode && !lightingExperienceActive && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[92] flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-white/80 bg-white/90 p-1.5 text-xs font-bold text-stone-700 shadow-lg backdrop-blur" data-testid="floor-camera-bar">
            <button aria-pressed={!activeCameraViewId} className={`whitespace-nowrap rounded-lg px-3 py-2 transition ${!activeCameraViewId ? "bg-stone-900 text-white" : "hover:bg-stone-100"}`} onClick={requestFreeBrowse} type="button">自由浏览</button>
            <button aria-pressed={activeCameraView?.name === "鸟瞰"} className={`whitespace-nowrap rounded-lg px-3 py-2 transition ${activeCameraView?.name === "鸟瞰" ? "bg-stone-900 text-white" : "hover:bg-stone-100"}`} onClick={returnToBirdseye} type="button">鸟瞰</button>
            <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-stone-200" />
            {primaryCameraViews.map((view) => (
              <button key={view.id} aria-pressed={activeCameraViewId === view.id} className={`max-w-36 shrink-0 truncate rounded-lg px-3 py-2 transition ${activeCameraViewId === view.id ? "bg-stone-900 text-white" : "hover:bg-stone-100"}`} onClick={() => activateFloorCameraView(view)} title={view.description} type="button">{view.name}</button>
            ))}
            <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-stone-200" />
            <button aria-label="上一个视角" className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-stone-100" onClick={() => stepCameraView(-1)} title="上一个视角" type="button">‹</button>
            <button aria-label="下一个视角" className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-stone-100" onClick={() => stepCameraView(1)} title="下一个视角" type="button">›</button>
            <button aria-pressed={activeViewIsMore || tourPanelOpen} className={`max-w-44 shrink-0 truncate whitespace-nowrap rounded-lg px-3 py-2 transition ${activeViewIsMore || tourPanelOpen ? "bg-stone-900 text-white" : "hover:bg-stone-100"}`} onClick={() => setTourPanelOpen((open) => !open)} type="button">{activeViewIsMore ? `更多 · ${activeCameraViewName}` : "更多"}</button>
          </div>
        </div>
      )}

      {!presentationMode && !mobilePresentationMode && !lightingExperienceActive && <div className="pointer-events-none absolute left-4 top-4 z-[80]">
        <div className="pointer-events-auto rounded-lg border border-white/80 bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">{floor.id} · Shared Drawing 3D</div>
          <div className="mt-1 text-lg font-black text-stone-900">{drawingProfile.label}</div>
          <div className="mt-1 max-w-[26rem] text-xs font-semibold leading-5 text-stone-500">{drawingProfile.summary}</div>
          {specialtyFallback && <div className="mt-2 max-w-[26rem] rounded-md bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-900">{drawingProfile.emptyDataHint}</div>}
        </div>
      </div>}
      {showDebugTools && showStairDebug && !mobilePresentationMode && (
        <aside className="pointer-events-auto absolute bottom-20 left-4 z-[93] max-h-[42vh] w-[min(34rem,calc(100%-2rem))] overflow-y-auto rounded-xl border border-amber-200 bg-stone-950/88 p-3 text-[10px] font-semibold leading-4 text-amber-50 shadow-2xl backdrop-blur" data-testid="stair-system-debug-panel">
          <div className="mb-2 text-xs font-black text-amber-200">楼梯系统调试 · {floor.id}</div>
          <div className="space-y-3 whitespace-pre-wrap font-mono">
            {stairDebugSystems.map((system) => (
              <div key={system.system.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
                {formatStairRenderDebug(system)}
                {(() => {
                  const continuity = getStairRenderContinuity(system);
                  return continuity ? `\ncontinuity: lower=${Math.round(continuity.lowerToLandingMm)}mm upper=${Math.round(continuity.upperToLandingMm)}mm` : "\ncontinuity: current-floor clipped";
                })()}
              </div>
            ))}
          </div>
        </aside>
      )}
      <div className={`${mobilePresentationMode ? "hidden" : "pointer-events-none"} absolute inset-x-4 top-4 z-[90] flex justify-center`}>
        <div className={`pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-white/80 bg-white/88 p-2 shadow-sm backdrop-blur ${presentationMode ? "bg-white/68" : ""}`}>
          {presentationMode ? (
            <button
              aria-pressed={presentationMode}
              className="rounded-md bg-stone-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-stone-700"
              onClick={togglePresentationMode}
              type="button"
            >
              退出干净轴测
            </button>
          ) : lightingExperienceActive ? (
            <>
              <select aria-label="当前房间" className="h-8 max-w-44 rounded-md border border-amber-200 bg-amber-50 px-2 text-xs font-bold text-amber-950 outline-none" value={selectedLightingSpaceId ?? ""} onChange={(event) => { if (!event.target.value) { returnToLightingOverview(); return; } const space = villaSpaceDirectory.find((item) => item.id === event.target.value); if (space) enterVillaSpace(space); }}>
                <option value="">{lightingExperienceScope === "currentRoom" ? "选择全屋空间" : "别墅总览"}</option>
                {villaFloorOrder.map((floorId) => {
                  const spaces = villaSpaceDirectory.filter((space) => space.floorId === floorId);
                  return spaces.length ? <optgroup key={floorId} label={villaFloorShortLabels[floorId]}>{spaces.map((space) => <option key={`${space.floorId}-${space.id}`} value={space.id}>{space.name}</option>)}</optgroup> : null;
                })}
              </select>
              {lightingExperienceScope !== "currentRoom" && <div className="flex items-center gap-1 rounded-md bg-stone-100 p-1" aria-label="别墅总览视角">
                {([['wholeVilla','全屋俯视'],['singleFloor','单层俯视'],['angled','斜向总览']] as Array<[VillaOverviewMode,string]>).map(([mode,label]) => <button key={mode} aria-pressed={villaOverviewMode === mode} className={`rounded px-2 py-1.5 text-xs font-bold ${villaOverviewMode === mode ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-white"}`} onClick={() => changeVillaOverviewMode(mode)} type="button">{label}</button>)}
              </div>}
              {lightingExperienceScope !== "currentRoom" && villaOverviewMode === "singleFloor" && <div className="flex items-center gap-1 rounded-md bg-stone-100 p-1" aria-label="按楼层显示">{(["B2","B1","1F","2F","YARD"] as Floor["id"][]).filter((floorId) => Boolean(houseStructuresByFloor[floorId])).map((floorId) => <button key={floorId} aria-pressed={floor.id === floorId} className={`rounded px-2 py-1.5 text-xs font-bold ${floor.id === floorId ? "bg-amber-500 text-white" : "text-stone-600 hover:bg-white"}`} onClick={() => onSelectFloor?.(floorId)} type="button">{floorId === "YARD" ? "院子" : floorId}</button>)}</div>}
              <div className="flex items-center gap-1 rounded-md bg-stone-100 p-1" aria-label="灯光时间模式">
                {([['dayWithLights','白天'],['night','夜间']] as Array<[LightingSceneMode,string]>).map(([mode,label]) => <button key={mode} aria-pressed={lightingScene === mode} className={`rounded px-2 py-1.5 text-xs font-bold ${lightingScene === mode ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-white"}`} onClick={() => setLightingScene(mode)} type="button">{label}</button>)}
              </div>
              {lightingExperienceScope === "currentRoom" && <div className="flex items-center gap-1 rounded-md bg-stone-100 p-1" aria-label="房间视角">
                {([['full','室内全景'],['human','自由探索'],['top','俯视房间']] as Array<[LightingRoomViewMode,string]>).map(([mode,label]) => <button key={mode} aria-pressed={lightingRoomViewMode === mode} className={`rounded px-2 py-1.5 text-xs font-bold ${lightingRoomViewMode === mode ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-white"}`} onClick={() => changeLightingRoomViewMode(mode)} type="button">{label}</button>)}
              </div>}
              <span className="rounded-md bg-amber-100 px-3 py-2 text-xs font-black text-amber-900">场景灯光预览</span>
              {lightingExperienceScope === "currentRoom" && <button className="rounded-md bg-stone-900 px-3 py-2 text-xs font-bold text-white" onClick={() => returnToLightingOverview()} type="button">返回总览</button>}
              <button aria-pressed={advancedLightingOpen} className={`rounded-md px-3 py-2 text-xs font-bold ${advancedLightingOpen ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`} onClick={() => setAdvancedLightingOpen((open) => !open)} type="button">高级</button>
            </>
          ) : (
            <>
          <span aria-label="当前 3D 工作区内容" className="rounded-md bg-stone-100 px-3 py-2 text-xs font-bold text-stone-700">{drawingProfile.label}</span>
          <select
            aria-label="3D 视图预设"
            className="h-8 max-w-32 rounded-md border border-stone-200 bg-white px-2 text-xs font-bold text-stone-700 outline-none"
            value={drawingViewPreset}
            onChange={(event) => applyDrawingViewPreset(event.target.value as Drawing3DViewPreset)}
          >
            {drawing3DViewPresets.map((preset) => <option key={preset} value={preset}>{drawing3DViewPresetLabels[preset]}</option>)}
          </select>
          {drawingSheetType === "materialPlan" && (
            <select
              aria-label="材料类别过滤"
              className="h-8 rounded-md border border-stone-200 bg-white px-2 text-xs font-bold text-stone-700 outline-none"
              value={materialCategoryFilter}
              onChange={(event) => setMaterialCategoryFilter(event.target.value as MaterialCategoryFilter)}
            >
              <option value="all">全部材料</option>
              <option value="structure">墙地结构</option>
              <option value="furniture">家具柜体</option>
              <option value="outdoor">庭院材料</option>
            </select>
          )}
          {drawingProfile.materialMode === "realistic" && (
            <>
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
            </>
          )}
          <button
            aria-pressed={presentationMode}
            className="rounded-md px-3 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-100"
            onClick={togglePresentationMode}
            type="button"
          >
            干净轴测
          </button>
          {drawingSheetType === "furniturePlan" && (
            <button
              aria-pressed={showServicePoints}
              className={`rounded-md px-3 py-2 text-xs font-bold transition ${showServicePoints ? "bg-sky-700 text-white" : "text-stone-600 hover:bg-stone-100"}`}
              onClick={() => setShowServicePoints((visible) => !visible)}
              type="button"
            >
              家具机电关联 / 净空
            </button>
          )}
          {showDebugTools && <button
            aria-pressed={showStairDebug}
            className={`rounded-md px-3 py-2 text-xs font-bold transition ${showStairDebug ? "bg-amber-600 text-white" : "text-stone-600 hover:bg-stone-100"}`}
            data-testid="stair-system-debug-toggle"
            onClick={() => setShowStairDebug((visible) => !visible)}
            type="button"
          >
            楼梯系统调试
          </button>}
          {drawingSheetType === "switchPlan" && (
            <button
              aria-pressed={showControlRelations}
              className={`rounded-md px-3 py-2 text-xs font-bold transition ${showControlRelations ? "bg-blue-700 text-white" : "text-stone-600 hover:bg-stone-100"}`}
              onClick={() => setShowControlRelations((visible) => !visible)}
              type="button"
            >
              控制组关系
            </button>
          )}
          {drawingSheetType === "ceilingPlan" && (
            <button
              aria-pressed={ceilingSolid}
              className={`rounded-md px-3 py-2 text-xs font-bold transition ${ceilingSolid ? "bg-violet-700 text-white" : "text-stone-600 hover:bg-stone-100"}`}
              onClick={() => setCeilingSolid((solid) => !solid)}
              type="button"
            >
              {ceilingSolid ? "实体顶面" : "透明顶面"}
            </button>
          )}
          <label className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100">
            <input checked={showObjectIds} onChange={(event) => onShowObjectIdsChange(event.target.checked)} type="checkbox" />
            对象信息
          </label>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
