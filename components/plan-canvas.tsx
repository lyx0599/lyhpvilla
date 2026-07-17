"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, PointerEvent, TouchEvent, WheelEvent } from "react";
import {
  emptyInteractionState,
  handleDrag as runInteractionDrag,
  handleHover,
  handleResize,
  handleSelect,
  isLocked,
  mergeWall,
  rotateDoor,
  rotateFurniture,
  splitWall,
  toggleLock
} from "@/src/core/interactionEngine";
import {
  createBayWindow,
  createArcWallFromEndpoints,
  createColumn,
  createDoor,
  createFence,
  createOutdoor,
  createOutdoorSurface,
  createPartition,
  createSkylight,
  createStair,
  createStraightWall,
  createWindow,
  findNearestHost,
  generateRoomsFromWalls,
  getDistance,
  getLineLength,
  getWallEndpoints,
  projectPointToSegment,
  SITE_PLAN_MAX_Y_MM,
  SITE_PLAN_MIN_Y_MM,
  snapPoint,
  STRUCTURE_HEIGHT_MM,
  STRUCTURE_WIDTH_MM
} from "@/lib/house-geometry";
import {
  applyFloorPlanPreset,
  createHeuristicCleanPatches,
  floorPlanPresetLabels,
  getCleanupFillColor,
  getFloorPlanFilter,
  getRepairOverlayStyles
} from "@/lib/floor-plan-cleanup";
import {
  drawingSheetTypeLabels,
  normalizeDrawingSheetType,
  normalizePlanCanvasMode,
  officialDrawingSheetTypes,
  planCanvasModeDescriptions,
  planCanvasModeFootnotes,
  planCanvasModeLabels
} from "@/lib/drawing-sheets";
import { createDrawingItem, drawingItemCategories, drawingItemCategoryLabels, drawingItemStatuses, drawingItemStatusLabels, floorFinishMaterialLabels, getDrawingItemCategoriesForSheet, wallFinishMaterialOptions } from "@/lib/drawing-items";
import { lightMountingTypeLabels, lightMountingTypes, lightingLayerLabels, lightingLayers } from "@/lib/lighting-design";
import { getStairSyncRule, getWallSyncLegend, getWallSyncRule } from "@/lib/villa-structure-sync";
import {
  applyPlanDelta,
  normalizeObjectForSync,
  resolveLock,
  resolveVisibility,
  toPlanObject
} from "@/lib/object-sync-adapter";
import type { WallSyncOverrides, WallSyncRuleId } from "@/lib/villa-structure-sync";
import { FurnitureTopView } from "@/components/furniture-top-view";
import { Floor3DView, type Shared3DSceneSettings } from "@/components/floor-3d-view";
import type { LightingDesign } from "@/types/workspace";
import type {
  CleanPatch,
  DrawTool,
  DrawingSheetType,
  DrawingItem,
  DrawingItemCategory,
  FixedCameraView,
  Floor,
  FloorPlanPreset,
  FloorPlanVisualSettings,
  Furniture,
  HouseStructure,
  HouseStructureObject,
  HouseWall,
  MobileDisplayLevel,
  MobileQuality,
  MmPoint,
  PlanCanvasMode,
  PlannerMode,
  Room,
  RoomTourView,
  ViewMode,
  Wall
} from "@/types/space";
import { getSemanticObjectPosition, semanticCategoryLabels, semanticIdPrefixes } from "@/lib/semantic-map";
import { resolve3DAsset, resolveRender3DMaterials } from "@/lib/render3d-assets";
import { constructionPackageToCsv, constructionPackageToHtml, constructionPackageToJson, validateConstructionPackage } from "@/lib/construction-package-export";
import { constructionAnchorLabel, constructionAnchorToPlanPoint, getConstructionAnchorsForSheet } from "@/lib/construction-anchors";
import { getVerificationDisplayState, verificationDisplayStateLabels, verificationDisplayStyles } from "@/lib/dimension-verification";
import { getFurnitureCenterMm, getRelatedDrawingItemSyncState, validateFurniturePlacement } from "@/lib/furniture-placement";
import type { Boundary, Point, SemanticObject } from "@/types/semantic-map";
import type { WorkspaceDocument } from "@/types/workspace";

type Props = {
  floor: Floor;
  floors: Floor[];
  /** @deprecated Debug-only fallback for workspaces without structural rooms. */
  legacyRooms?: Room[];
  /** @deprecated Debug-only fallback for workspaces without structural walls. */
  legacyWalls?: Wall[];
  furniture: Furniture[];
  drawingItems: DrawingItem[];
  constructionExportWorkspace: WorkspaceDocument;
  dimensionVerificationConflictIds?: ReadonlySet<string>;
  semanticObjects: SemanticObject[];
  selectedFurnitureId: string;
  selectedSemanticObjectId: string;
  sheetMode: PlanCanvasMode;
  viewMode: ViewMode;
  plannerMode: PlannerMode;
  drawTool: DrawTool;
  houseStructure: HouseStructure;
  wallSyncOverrides: WallSyncOverrides;
  floorPlanVisualSettings: FloorPlanVisualSettings;
  cleanPatches: CleanPatch[];
  focusMode: boolean;
  furnitureImmersiveMode?: boolean;
  yardImmersiveMode?: boolean;
  yardFocus?: YardFocus;
  mobilePresentationMode?: boolean;
  editorPresentationMode?: boolean;
  workspaceMutationAllowed?: boolean;
  mobileDisplayLevel?: MobileDisplayLevel;
  mobileProfessionalSheetMode?: DrawingSheetType | PlanCanvasMode | string;
  mobileQuality?: MobileQuality;
  resetViewRequest?: number;
  drawingDrivenMode?: boolean;
  developerMode?: boolean;
  showAdvancedCanvasControls?: boolean;
  constructionPackageOpenRequest?: number;
  drawingItemCreationRequest?: {
    category: DrawingItemCategory;
    type: string;
    label: string;
    nonce: number;
  } | null;
  showFurnitureLabels?: boolean;
  activeFurnitureId?: string;
  cameraViews?: FixedCameraView[];
  roomTourViews?: RoomTourView[];
  lightingDesign?: LightingDesign;
  cameraViewFloorIds?: Floor["id"][];
  cameraViewRequest?: { view: FixedCameraView; nonce: number } | null;
  locateObjectRequest: { id: string; nonce: number } | null;
  canUndo: boolean;
  canRedo: boolean;
  onScaleChange: (scale: number) => void;
  onSheetModeChange: (mode: PlanCanvasMode) => void;
  onSelectFloor: (floorId: Floor["id"]) => void;
  onActiveObjectChange: (objectId: string) => void;
  onSelectStructureObject?: (objectId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onPlannerModeChange: (mode: PlannerMode) => void;
  onDrawToolChange: (tool: DrawTool) => void;
  onHouseStructureChange: (structure: HouseStructure) => void;
  onWallLengthChange?: (wallId: string, length: number) => void;
  onWallSyncOverridesChange: (overrides: WallSyncOverrides) => void;
  onFloorPlanVisualSettingsChange: (settings: FloorPlanVisualSettings) => void;
  onCleanPatchesChange: (patches: CleanPatch[]) => void;
  onSelectFurniture: (furniture: Furniture) => void;
  onFurnitureChange: (furniture: Furniture[]) => void;
  onFurnitureDragEnd: (furniture: Furniture, deltaMm: MmPoint) => void;
  onDrawingItemsChange: (drawingItems: DrawingItem[]) => void;
  onGenerateDrawingItems: (scope: "floor" | "all") => void;
  onGenerateLightingDesign: (scope: "floor" | "all") => void;
  onShowFurnitureLabelsChange?: (visible: boolean) => void;
  onOpenWardrobeDesigner?: (furnitureId: string) => void;
  onOpenStairDesigner?: (stairId: string) => void;
  onSelectSemanticObject: (object: SemanticObject) => void;
  onMoveSemanticObject: (objectId: string, position: { x: number; y: number }) => void;
  onSelectCameraView?: (view: FixedCameraView) => void;
  onSceneSettingsChange?: (settings: Shared3DSceneSettings) => void;
};

const MIN_SCALE = 0.6;
const MAX_SCALE = 3;
const SCALE_STEP = 0.15;
const STRUCTURE_LINE_SNAP_DISTANCE_MM = 420;

type ObjectLabel = {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
};

type LabelFilter = "all" | "walls" | "openings" | "rooms" | "outdoor" | "furniture";
type PlanBounds = { x: number; y: number; width: number; height: number };
type SyncPaintRuleId = WallSyncRuleId | "default";
type ClickDrawTool = "wall-straight" | "wall-arc" | "partition" | "stair" | "fence";
type OutdoorSurfaceDrawTool = "hardscape" | "path" | "planting";
type OutdoorSurfaceMaterial = HouseStructure["outdoorSurfaces"][number]["material"];
type StructureInteractionKind = "wall" | "partition" | "stair" | "column" | "fence" | "opening" | "skylight" | "room" | "outdoor" | "outdoorSurface";
type YardFocus = "north" | "south";
type StructureObjectRow = {
  id: string;
  kind: "wall" | "partition" | "stair" | "column" | "fence" | "door" | "window" | "bayWindow" | "skylight" | "room" | "outdoor" | "outdoorSurface" | "furniture";
  label: string;
  name: string;
  detail: string;
};
type ConstructionSheet = {
  id: string;
  drawingType: DrawingSheetType | null;
  viewType: DrawingSheetType;
  /** @deprecated Old PlanSheetMode value kept so imported/customized sheets still resolve. */
  mode?: PlanCanvasMode | string;
  sheetNo: string;
  title: string;
  audience: string;
  scale: string;
  status: string;
  note: string;
};
type ConstructionSpecRow = {
  id: string;
  category: string;
  item: string;
  value: string;
  note: string;
};

type FurnitureDemandHint = {
  key: "socketPlan" | "switchPlan" | "lightingPlan" | "waterSupplyPlan" | "drainagePlan" | "ceilingPlan" | "annotationPlan";
  label: string;
  details: string[];
  color: string;
  background: string;
};

const defaultPlanBounds: PlanBounds = { x: 0, y: 0, width: STRUCTURE_WIDTH_MM, height: STRUCTURE_HEIGHT_MM };

const outdoorSurfaceMaterialOptions: Array<{ material: OutdoorSurfaceMaterial; label: string; tool: OutdoorSurfaceDrawTool; swatch: string }> = [
  { material: "pebble", label: "鹅卵石", tool: "path", swatch: "#d7c2a3" },
  { material: "stone", label: "石板", tool: "hardscape", swatch: "#a8a29e" },
  { material: "wood", label: "木板", tool: "hardscape", swatch: "#b98254" },
  { material: "concrete", label: "水泥地", tool: "hardscape", swatch: "#cbd5e1" },
  { material: "grass", label: "草坪", tool: "planting", swatch: "#86c37a" },
  { material: "shrub", label: "花境", tool: "planting", swatch: "#5fb069" }
];
const protectedBaseYardOutdoorIds = new Set(["OD-1F-NORTH-001", "OD-1F-SOUTH-001", "OD-YARD-NORTH-001", "OD-YARD-SOUTH-001"]);
const MASTER_BATH_ROOM_ID = "ROOM-2F-003";
const masterBathFurnitureIds = new Set([
  "furn-2f-master-shower-001",
  "furn-2f-master-bathtub-001",
  "furn-2f-master-vanity-001",
  "furn-2f-master-toilet-001"
]);

const outdoorSurfaceMaterialLabels = outdoorSurfaceMaterialOptions.reduce((labels, option) => {
  labels[option.material] = option.label;
  return labels;
}, {} as Record<OutdoorSurfaceMaterial, string>);

const wallEditableSheetTypes = new Set<DrawingSheetType>(["structurePlan", "demolitionAndBuildPlan"]);
const wallEditableSheetTypeLabel = "结构图、拆改施工图";
const furnitureDemandSheetTypes = new Set<DrawingSheetType>(["socketPlan", "switchPlan", "lightingPlan", "waterSupplyPlan", "drainagePlan", "ceilingPlan", "annotationPlan"]);
const drawingSheetSelectTypes = officialDrawingSheetTypes;
const drawingCheckModes: PlanCanvasMode[] = ["structureSyncCheck"];

const lightingTypeLabels: Record<string, string> = {
  ambient: "环境光",
  task: "任务灯",
  cabinetStrip: "柜内灯带",
  mirrorLight: "镜前灯",
  decorative: "装饰灯",
  none: "无照明"
};
const waterSupplyTypeLabels: Record<string, string> = {
  cold: "冷水",
  hotCold: "冷热水",
  filtered: "净水",
  none: "无给水"
};
const drainageTypeLabels: Record<string, string> = {
  floorDrain: "地漏",
  wallDrain: "墙排",
  cabinetDrain: "柜内排水",
  none: "无排水"
};
const installTypeLabels: Record<string, string> = {
  finishedFurniture: "成品家具",
  customCabinet: "定制柜体",
  builtIn: "内嵌建造",
  wallMounted: "壁挂安装",
  floorStanding: "落地安装",
  embedded: "设备嵌入",
  other: "其他"
};

function compactList(items: Array<string | false | null | undefined>, limit = 3) {
  return items.filter((item): item is string => Boolean(item && item.trim())).slice(0, limit);
}

function getConstructionNote(item: Furniture) {
  return item.constructionMeta?.notes || item.constructionNote || item.note || "";
}

function getFurnitureDemandHint(item: Furniture, mode: DrawingSheetType): FurnitureDemandHint | null {
  const mep = item.mepMeta ?? {};
  const construction = item.constructionMeta ?? {};
  if (mode === "socketPlan" && (mep.needsSocket || mep.needsNetwork)) return {
    key: "socketPlan",
    label: mep.needsNetwork && !mep.needsSocket ? "弱电" : `插${mep.socketCount ? ` ${mep.socketCount}` : ""}`,
    details: compactList([
      mep.needsSocket ? `${mep.socketHeight ?? 300}mm` : null,
      mep.relatedCircuit,
      mep.needsNetwork ? "网络/弱电" : null
    ]),
    color: "#2563eb",
    background: "#dbeafe"
  };
  if (mode === "switchPlan" && (mep.needsSwitch || mep.needsSmartControl)) return {
    key: "switchPlan",
    label: mep.needsSmartControl && !mep.needsSwitch ? "智" : "控",
    details: compactList([
      ...(mep.switchControl ?? []),
      mep.relatedCircuit,
      mep.needsSmartControl ? "智能控制" : null
    ]),
    color: "#7c3aed",
    background: "#ede9fe"
  };
  if (mode === "lightingPlan" && (mep.needsLighting || mep.needsSmartControl)) return {
    key: "lightingPlan",
    label: mep.needsSmartControl && !mep.needsLighting ? "智" : "灯",
    details: compactList([
      mep.lightingType ? lightingTypeLabels[mep.lightingType] ?? mep.lightingType : null,
      mep.lightColorTemperature,
      mep.needsSmartControl ? "智能/感应" : null
    ]),
    color: "#ca8a04",
    background: "#fef9c3"
  };
  if (mode === "waterSupplyPlan" && mep.needsWaterSupply) return {
    key: "waterSupplyPlan",
    label: "水",
    details: compactList([mep.waterSupplyType ? waterSupplyTypeLabels[mep.waterSupplyType] ?? mep.waterSupplyType : null, mep.notes]),
    color: "#0284c7",
    background: "#e0f2fe"
  };
  if (mode === "drainagePlan" && mep.needsDrainage) return {
    key: "drainagePlan",
    label: "排",
    details: compactList([mep.drainageType ? drainageTypeLabels[mep.drainageType] ?? mep.drainageType : null, mep.notes]),
    color: "#15803d",
    background: "#dcfce7"
  };
  if (mode === "ceilingPlan" && (construction.ceilingDependency || construction.inspectionAccessRequired || mep.needsVentilation)) return {
    key: "ceilingPlan",
    label: mep.needsVentilation && !construction.ceilingDependency ? "风" : "顶",
    details: compactList([
      construction.ceilingDependency,
      construction.inspectionAccessRequired ? "检修口" : null,
      mep.needsVentilation ? "通风/排风" : null
    ]),
    color: "#0f766e",
    background: "#ccfbf1"
  };
  if (mode === "annotationPlan" && (getConstructionNote(item).trim() || construction.customMade || construction.waterproofRequired || construction.inspectionAccessRequired || construction.ceilingDependency)) return {
    key: "annotationPlan",
    label: construction.waterproofRequired ? "防" : construction.customMade ? "定" : "施",
    details: compactList([
      construction.customMade ? "定制" : null,
      construction.installType ? installTypeLabels[construction.installType] ?? construction.installType : null,
      construction.waterproofRequired ? "防水" : null,
      construction.inspectionAccessRequired ? "检修" : null,
      construction.ceilingDependency
    ]),
    color: "#c2410c",
    background: "#ffedd5"
  };
  return null;
}

const defaultConstructionSheets: ConstructionSheet[] = [
  { id: "cover", drawingType: null, viewType: "sitePlan", sheetNo: "A-00", title: "图纸目录/总说明", audience: "施工队 / 家人确认", scale: "NTS", status: "概念版", note: "列明版本、楼层、图纸范围、现场复核要求和出图口径。" },
  { id: "site-plan", drawingType: "sitePlan", viewType: "sitePlan", sheetNo: "A-01", title: "总平面图", audience: "施工队 / 家人", scale: "1:100", status: "待复核", note: "表达北院入户、南院生活庭院、建筑主体与室外硬地关系。" },
  { id: "structure-plan", drawingType: "structurePlan", viewType: "structurePlan", sheetNo: "A-02", title: "结构图", audience: "施工队", scale: "1:50", status: "待复核", note: "只看墙、门窗、楼梯、院子边界，所有尺寸现场复尺。" },
  { id: "demolition-build-plan", drawingType: "demolitionAndBuildPlan", viewType: "demolitionAndBuildPlan", sheetNo: "A-03", title: "拆改施工图", audience: "施工队", scale: "1:50", status: "施工沟通", note: "标注净尺寸、洞口、隔断、楼梯和关键通道尺寸。" },
  { id: "furniture-plan", drawingType: "furniturePlan", viewType: "furniturePlan", sheetNo: "F-01", title: "家具定位图", audience: "施工队 / 家人", scale: "1:50", status: "方案中", note: "用于确认沙发、餐桌、中岛、柜体、床和收纳的真实落位。" },
  { id: "socket-plan", drawingType: "socketPlan", viewType: "socketPlan", sheetNo: "E-01", title: "插座点位图", audience: "水电工", scale: "1:50", status: "示意", note: "点位编号、离地高度、专用回路和防水要求后续逐项校正。" },
  { id: "switch-plan", drawingType: "switchPlan", viewType: "switchPlan", sheetNo: "E-02", title: "开关控制图", audience: "水电工", scale: "1:50", status: "示意", note: "表达入户、楼梯、客餐厅、庭院、卧室的双控与灯组控制。" },
  { id: "lighting-plan", drawingType: "lightingPlan", viewType: "lightingPlan", sheetNo: "L-01", title: "灯光点位图", audience: "电工 / 吊顶", scale: "1:50", status: "示意", note: "筒灯、射灯、灯带、吊灯、庭院灯按生活场景分组。" },
  { id: "water-supply-plan", drawingType: "waterSupplyPlan", viewType: "waterSupplyPlan", sheetNo: "W-01", title: "给水点位图", audience: "水电工", scale: "1:50", status: "示意", note: "厨房、岛台、卫浴、庭院龙头的冷水、热水、净水预留点；不表达专业管线路径。" },
  { id: "drainage-plan", drawingType: "drainagePlan", viewType: "drainagePlan", sheetNo: "W-02", title: "排水点位图", audience: "水电工 / 泥工", scale: "1:50", status: "示意", note: "水槽、台盆、地漏、马桶和庭院排水需求点；管位需结合现场复核。" },
  { id: "ceiling-plan", drawingType: "ceilingPlan", viewType: "ceilingPlan", sheetNo: "C-01", title: "吊顶图", audience: "木工 / 空调", scale: "1:50", status: "示意", note: "表达局部吊顶、灯槽、风口、检修口和设备预留。" },
  { id: "floor-finish-plan", drawingType: "floorFinishPlan", viewType: "floorFinishPlan", sheetNo: "M-01", title: "地面铺装图", audience: "泥工 / 家人", scale: "1:50", status: "示意", note: "室内木地板、防滑砖、庭院石材、绿化和收口关系。" },
  { id: "wall-finish-plan", drawingType: "wallFinishPlan", viewType: "wallFinishPlan", sheetNo: "M-02", title: "墙面材料图", audience: "泥工 / 油工 / 家人", scale: "1:50", status: "示意", note: "表达湿区、重点墙、涂料、石材和护墙材料方向。" },
  { id: "material-plan", drawingType: "materialPlan", viewType: "materialPlan", sheetNo: "M-03", title: "材料索引图", audience: "家人 / 采购 / 施工队", scale: "NTS", status: "示意", note: "汇总地面、墙面、柜体、灯具、设备和庭院材料索引。" },
  { id: "annotation-plan", drawingType: "annotationPlan", viewType: "annotationPlan", sheetNo: "N-01", title: "施工标注/待确认项", audience: "施工队 / 家人确认", scale: "1:50", status: "待确认", note: "集中列出现场复核、厂家图纸、检修、防水和待确认事项。" }
];

const defaultConstructionSpecs: ConstructionSpecRow[] = [
  { id: "clearance-main", category: "通道", item: "主要通道净宽", value: "900 mm 以上", note: "中岛、餐椅、沙发边优先复核。" },
  { id: "clearance-island", category: "餐厨", item: "中岛四周通道", value: "950-1100 mm", note: "冰箱、灶台、水槽动线不得互相冲突。" },
  { id: "socket-height", category: "水电", item: "常规插座离地", value: "300 mm", note: "台面、床头、设备插座按用途单独标高。" },
  { id: "switch-height", category: "水电", item: "开关离地", value: "1300 mm", note: "同一区域保持统一高度。" },
  { id: "kitchen-counter", category: "柜体", item: "厨房台面高度", value: "850-900 mm", note: "按主要使用者身高二次确认。" },
  { id: "wardrobe-depth", category: "柜体", item: "衣柜净深", value: "600 mm", note: "移门/平开门和踢脚线另算。" },
  { id: "ceiling-main", category: "吊顶", item: "局部吊顶下挂", value: "180-280 mm", note: "按空调、新风、灯槽、管线综合。" },
  { id: "waterproof-bath", category: "防水", item: "卫浴墙面防水", value: "1800 mm", note: "淋浴区建议到顶或按现场做法确认。" },
  { id: "waterproof-yard", category: "庭院", item: "室外插座", value: "防水盒 + 独立回路", note: "南院照明、龙头、清洁设备预留。" }
];

const syncPaintTools: Array<{ id: SyncPaintRuleId; label: string; color: string }> = [
  { id: "all-level", label: "四层", color: "#2563eb" },
  { id: "above-grade", label: "1F/2F", color: "#16a34a" },
  { id: "basement", label: "B1/B2", color: "#f97316" },
  { id: "local", label: "独立", color: "#94a3b8" },
  { id: "default", label: "默认", color: "#ffffff" }
];

function getPlanBounds(floorId: Floor["id"]): PlanBounds {
  if (floorId !== "1F" && floorId !== "YARD") return defaultPlanBounds;
  return {
    x: 0,
    y: SITE_PLAN_MIN_Y_MM,
    width: STRUCTURE_WIDTH_MM,
    height: SITE_PLAN_MAX_Y_MM - SITE_PLAN_MIN_Y_MM
  };
}

function getPointsBounds(points: MmPoint[], padding = 0): PlanBounds {
  if (points.length === 0) return defaultPlanBounds;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  return {
    x: minX - padding,
    y: minY - padding,
    width: Math.max(1, maxX - minX + padding * 2),
    height: Math.max(1, maxY - minY + padding * 2)
  };
}

function createRectPolygon(start: MmPoint, end: MmPoint): MmPoint[] {
  return [
    { x: start.x, y: start.y },
    { x: end.x, y: start.y },
    { x: end.x, y: end.y },
    { x: start.x, y: end.y }
  ];
}

function createPathRibbon(points: MmPoint[], width: number): MmPoint[] {
  if (points.length < 2) return [];
  if (points.length === 2) {
    const [start, end] = points;
    const length = Math.max(1, getDistance(start, end));
    const normal = { x: -((end.y - start.y) / length), y: (end.x - start.x) / length };
    const half = width / 2;
    return [
      { x: Math.round(start.x + normal.x * half), y: Math.round(start.y + normal.y * half) },
      { x: Math.round(end.x + normal.x * half), y: Math.round(end.y + normal.y * half) },
      { x: Math.round(end.x - normal.x * half), y: Math.round(end.y - normal.y * half) },
      { x: Math.round(start.x - normal.x * half), y: Math.round(start.y - normal.y * half) }
    ];
  }

  const left: MmPoint[] = [];
  const right: MmPoint[] = [];
  points.forEach((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const length = Math.max(1, getDistance(previous, next));
    const normal = { x: -((next.y - previous.y) / length), y: (next.x - previous.x) / length };
    const half = width / 2;
    left.push({ x: Math.round(point.x + normal.x * half), y: Math.round(point.y + normal.y * half) });
    right.unshift({ x: Math.round(point.x - normal.x * half), y: Math.round(point.y - normal.y * half) });
  });
  return [...left, ...right];
}

function pointInBounds(point: MmPoint, bounds: PlanBounds) {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}

function polygonIntersectsBounds(points: MmPoint[], bounds: PlanBounds) {
  return points.some((point) => pointInBounds(point, bounds));
}

function toPlanPercent(point: MmPoint, bounds: PlanBounds) {
  return {
    x: ((point.x - bounds.x) / bounds.width) * 100,
    y: ((point.y - bounds.y) / bounds.height) * 100
  };
}

function isMasterBathFurniture(item: Furniture) {
  return item.floorId === "2F" && item.roomId === MASTER_BATH_ROOM_ID && masterBathFurnitureIds.has(item.id);
}

function getFurnitureMmCenter(item: Furniture, structure: HouseStructure): MmPoint {
  const size = structure.coordinateSystem ?? { width: STRUCTURE_WIDTH_MM, height: STRUCTURE_HEIGHT_MM };
  return {
    x: (item.position.x / 100) * size.width,
    y: (item.position.y / 100) * size.height
  };
}

function getFurnitureAxis(item: Furniture, structure: HouseStructure) {
  const center = getFurnitureMmCenter(item, structure);
  const rotation = (item.position.rotation || 0) * Math.PI / 180;
  const ux = { x: Math.cos(rotation), y: Math.sin(rotation) };
  const uy = { x: -Math.sin(rotation), y: Math.cos(rotation) };
  return {
    center,
    ux,
    uy,
    widthMm: item.dimensions.width * 10,
    depthMm: item.dimensions.depth * 10
  };
}

function getFurnitureAxisLine(item: Furniture, structure: HouseStructure, sideOffset = 0, lengthScale = 1) {
  const axis = getFurnitureAxis(item, structure);
  const halfLength = (axis.widthMm * lengthScale) / 2;
  return [
    {
      x: axis.center.x - axis.ux.x * halfLength + axis.uy.x * sideOffset,
      y: axis.center.y - axis.ux.y * halfLength + axis.uy.y * sideOffset
    },
    {
      x: axis.center.x + axis.ux.x * halfLength + axis.uy.x * sideOffset,
      y: axis.center.y + axis.ux.y * halfLength + axis.uy.y * sideOffset
    }
  ];
}

function getFurnitureFootprintPolygon(item: Furniture, structure: HouseStructure, scale = 1) {
  const axis = getFurnitureAxis(item, structure);
  const halfWidth = (axis.widthMm * scale) / 2;
  const halfDepth = (axis.depthMm * scale) / 2;
  return [
    {
      x: axis.center.x - axis.ux.x * halfWidth - axis.uy.x * halfDepth,
      y: axis.center.y - axis.ux.y * halfWidth - axis.uy.y * halfDepth
    },
    {
      x: axis.center.x + axis.ux.x * halfWidth - axis.uy.x * halfDepth,
      y: axis.center.y + axis.ux.y * halfWidth - axis.uy.y * halfDepth
    },
    {
      x: axis.center.x + axis.ux.x * halfWidth + axis.uy.x * halfDepth,
      y: axis.center.y + axis.ux.y * halfWidth + axis.uy.y * halfDepth
    },
    {
      x: axis.center.x - axis.ux.x * halfWidth + axis.uy.x * halfDepth,
      y: axis.center.y - axis.ux.y * halfWidth + axis.uy.y * halfDepth
    }
  ];
}

function avoidLabelOverlap(labels: ObjectLabel[], bounds = defaultPlanBounds) {
  const placed: ObjectLabel[] = [];
  return labels.map((label) => {
    let y = label.y;
    let attempts = 0;
    while (placed.some((item) => Math.abs(item.x - label.x) < 1450 && Math.abs(item.y - y) < 720) && attempts < 6) {
      y -= 760;
      attempts += 1;
    }
    const nextLabel = {
      ...label,
      x: Math.min(bounds.x + bounds.width - 1500, Math.max(bounds.x + 1500, label.x)),
      y: Math.min(bounds.y + bounds.height - 700, Math.max(bounds.y + 700, y))
    };
    placed.push(nextLabel);
    return nextLabel;
  });
}

function isClickDrawTool(tool: DrawTool): tool is ClickDrawTool {
  return tool === "wall-straight" || tool === "wall-arc" || tool === "partition" || tool === "stair" || tool === "fence";
}

export function PlanCanvas({
  floor,
  floors,
  legacyRooms = [],
  legacyWalls = [],
  furniture,
  drawingItems,
  constructionExportWorkspace,
  dimensionVerificationConflictIds = new Set<string>(),
  semanticObjects = [],
  selectedFurnitureId,
  selectedSemanticObjectId = "",
  sheetMode,
  viewMode,
  plannerMode,
  drawTool,
  houseStructure,
  wallSyncOverrides,
  floorPlanVisualSettings,
  cleanPatches,
  focusMode,
  furnitureImmersiveMode = false,
  yardImmersiveMode = false,
  yardFocus = "south",
  mobilePresentationMode = false,
  editorPresentationMode = false,
  workspaceMutationAllowed = true,
  mobileDisplayLevel = "simple",
  mobileProfessionalSheetMode = "socketPlan",
  mobileQuality = "balanced",
  resetViewRequest = 0,
  drawingDrivenMode = false,
  developerMode = false,
  showAdvancedCanvasControls = false,
  constructionPackageOpenRequest = 0,
  drawingItemCreationRequest = null,
  showFurnitureLabels,
  activeFurnitureId = "",
  cameraViews = [],
  roomTourViews = [],
  lightingDesign,
  cameraViewFloorIds,
  cameraViewRequest = null,
  locateObjectRequest,
  canUndo,
  canRedo,
  onScaleChange,
  onSheetModeChange,
  onSelectFloor,
  onActiveObjectChange,
  onSelectStructureObject,
  onUndo: requestUndo,
  onRedo: requestRedo,
  onPlannerModeChange: requestPlannerModeChange,
  onDrawToolChange: requestDrawToolChange,
  onHouseStructureChange: requestHouseStructureChange,
  onWallLengthChange: requestWallLengthChange,
  onWallSyncOverridesChange: requestWallSyncOverridesChange,
  onFloorPlanVisualSettingsChange: requestFloorPlanVisualSettingsChange,
  onCleanPatchesChange: requestCleanPatchesChange,
  onSelectFurniture,
  onFurnitureChange: requestFurnitureChange,
  onFurnitureDragEnd,
  onDrawingItemsChange: requestDrawingItemsChange,
  onGenerateDrawingItems,
  onGenerateLightingDesign,
  onShowFurnitureLabelsChange,
  onOpenWardrobeDesigner,
  onOpenStairDesigner,
  onSelectSemanticObject,
  onMoveSemanticObject: requestMoveSemanticObject,
  onSelectCameraView,
  onSceneSettingsChange
}: Props) {
  const onUndo = () => {
    if (workspaceMutationAllowed) requestUndo();
  };
  const onRedo = () => {
    if (workspaceMutationAllowed) requestRedo();
  };
  const onPlannerModeChange = (mode: PlannerMode) => {
    if (workspaceMutationAllowed) requestPlannerModeChange(mode);
  };
  const onDrawToolChange = (tool: DrawTool) => {
    if (workspaceMutationAllowed) requestDrawToolChange(tool);
  };
  const onHouseStructureChange = (structure: HouseStructure) => {
    if (workspaceMutationAllowed) requestHouseStructureChange(structure);
  };
  const onWallLengthChange = workspaceMutationAllowed ? requestWallLengthChange : undefined;
  const onWallSyncOverridesChange = (overrides: WallSyncOverrides) => {
    if (workspaceMutationAllowed) requestWallSyncOverridesChange(overrides);
  };
  const onFloorPlanVisualSettingsChange = (settings: FloorPlanVisualSettings) => {
    if (workspaceMutationAllowed) requestFloorPlanVisualSettingsChange(settings);
  };
  const onCleanPatchesChange = (patches: CleanPatch[]) => {
    if (workspaceMutationAllowed) requestCleanPatchesChange(patches);
  };
  const onFurnitureChange = (nextFurniture: Furniture[]) => {
    if (workspaceMutationAllowed) requestFurnitureChange(nextFurniture);
  };
  const onDrawingItemsChange = (nextItems: DrawingItem[]) => {
    if (workspaceMutationAllowed) requestDrawingItemsChange(nextItems);
  };
  const onMoveSemanticObject = (objectId: string, position: { x: number; y: number }) => {
    if (workspaceMutationAllowed) requestMoveSemanticObject(objectId, position);
  };
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isManualCleanupMode, setIsManualCleanupMode] = useState(false);
  const [isCleanupPanelOpen, setIsCleanupPanelOpen] = useState(false);
  const [cleanupSelection, setCleanupSelection] = useState<CleanPatch["rect"] | null>(null);
  const [exportOptions, setExportOptions] = useState({ overlay: false, roomNames: false, furniture: false });
  const setSheetMode = (nextMode: PlanCanvasMode | DrawingSheetType | string | null | undefined) => {
    onSheetModeChange(normalizePlanCanvasMode(nextMode));
  };
  const [isConstructionPackageOpen, setIsConstructionPackageOpen] = useState(false);
  const [pendingConstructionExport, setPendingConstructionExport] = useState<"html" | "json" | "csv" | null>(null);
  const [constructionSheets, setConstructionSheets] = useState<ConstructionSheet[]>(defaultConstructionSheets);
  const [constructionSpecs, setConstructionSpecs] = useState<ConstructionSpecRow[]>(defaultConstructionSpecs);
  const [isPlanZoomSelected, setIsPlanZoomSelected] = useState(false);
  const [drawPreview, setDrawPreview] = useState<{ start: MmPoint; end: MmPoint } | null>(null);
  const [clickDrawStart, setClickDrawStart] = useState<{ tool: ClickDrawTool; start: MmPoint } | null>(null);
  const [arcSweepAngle, setArcSweepAngle] = useState(90);
  const [arcDirection, setArcDirection] = useState<"clockwise" | "counterclockwise">("clockwise");
  const [outdoorDraft, setOutdoorDraft] = useState<MmPoint[]>([]);
  const [outdoorSurfaceDraft, setOutdoorSurfaceDraft] = useState<{ tool: OutdoorSurfaceDrawTool; points: MmPoint[] } | null>(null);
  const [outdoorRectDraft, setOutdoorRectDraft] = useState<{ start: MmPoint; end: MmPoint | null } | null>(null);
  const [outdoorSurfaceMaterial, setOutdoorSurfaceMaterial] = useState<OutdoorSurfaceMaterial>("pebble");
  const [outdoorPathWidth, setOutdoorPathWidth] = useState(800);
  const [selectedStructureId, setSelectedStructureId] = useState("");
  const [selectedDrawingItemId, setSelectedDrawingItemId] = useState("");
  const [structureMessage, setStructureMessage] = useState("");
  const [showObjectIds, setShowObjectIds] = useState(false);
  const [showFurnitureClearances, setShowFurnitureClearances] = useState(true);
  const [internalShowFurnitureLabels, setInternalShowFurnitureLabels] = useState(true);
  const [labelFilter, setLabelFilter] = useState<LabelFilter>("all");
  const [syncPaintRuleId, setSyncPaintRuleId] = useState<SyncPaintRuleId | null>(null);
  const [selectedSyncWallId, setSelectedSyncWallId] = useState("");
  const [interactionState, setInteractionState] = useState(emptyInteractionState);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; panX: number; panY: number } | null>(null);
  const structureDragRef = useRef<{ pointerId: number; objectId: string; pointKey: "start" | "end"; moved: boolean } | null>(null);
  const structureMoveRef = useRef<{ pointerId: number; objectId: string; lastPoint: MmPoint; moved: boolean } | null>(null);
  const drawDragRef = useRef<{ pointerId: number; start: MmPoint } | null>(null);
  const openingDragRef = useRef<{ pointerId: number; objectId: string; objectType: "door" | "window"; moved: boolean } | null>(null);
  const furnitureDragRef = useRef<{ pointerId: number; objectId: string; lastPosition: MmPoint; moved: boolean; totalDelta: MmPoint; latestFurniture: Furniture } | null>(null);
  const skipFurnitureClickRef = useRef("");
  const drawingItemDragRef = useRef<{ pointerId: number; objectId: string } | null>(null);
  const cleanupDragRef = useRef<{ pointerId: number; start: Point } | null>(null);
  const planRef = useRef<HTMLDivElement | null>(null);
  const objectDragRef = useRef<{ pointerId: number; objectId: string; moved: boolean } | null>(null);
  const touchGestureRef = useRef<{
    mode: "pan" | "pinch";
    startX: number;
    startY: number;
    startDistance: number;
    panX: number;
    panY: number;
    scale: number;
  } | null>(null);
  const yardToken = yardFocus === "north" ? "NORTH" : "SOUTH";
  const focusedYardOutdoor = useMemo(() => {
    if (!yardImmersiveMode) return null;
    return houseStructure.outdoors.find((outdoor) => outdoor.id.includes(`-${yardToken}-`) || outdoor.name.includes(yardFocus === "north" ? "北院" : "南院")) ?? null;
  }, [houseStructure.outdoors, yardFocus, yardImmersiveMode, yardToken]);
  const planBounds = useMemo(() => {
    if (yardImmersiveMode && focusedYardOutdoor) return getPointsBounds(focusedYardOutdoor.polygon, 280);
    return getPlanBounds(floor.id);
  }, [floor.id, focusedYardOutdoor, yardImmersiveMode]);
  const debugRooms = useMemo(() => {
    if (!houseStructure.rooms.length) return legacyRooms;
    return houseStructure.rooms.flatMap((room) => {
      if (!room.boundary.length) return [];
      const points = room.boundary.map((point) => toPlanPercent(point, planBounds));
      const xValues = points.map((point) => point.x);
      const yValues = points.map((point) => point.y);
      const x = Math.min(...xValues);
      const y = Math.min(...yValues);
      return [{
        id: room.id,
        floorId: room.floorId,
        name: room.name,
        bounds: {
          x,
          y,
          width: Math.max(0, Math.max(...xValues) - x),
          height: Math.max(0, Math.max(...yValues) - y)
        }
      }];
    });
  }, [houseStructure.rooms, legacyRooms, planBounds]);
  const debugWalls = useMemo(() => {
    const structuralWalls = houseStructure.walls.flatMap((wall) => {
      if (wall.kind !== "straight") return [];
      const start = toPlanPercent(wall.start, planBounds);
      const end = toPlanPercent(wall.end, planBounds);
      return [{
        id: wall.id,
        floorId: wall.floorId,
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        thickness: Math.max(0.5, wall.thickness / 100)
      }];
    });
    return houseStructure.walls.length ? structuralWalls : legacyWalls;
  }, [houseStructure.walls, legacyWalls, planBounds]);
  const furnitureLabelsVisible = showFurnitureLabels ?? internalShowFurnitureLabels;

  function updateFurnitureLabelsVisible(visible: boolean) {
    if (onShowFurnitureLabelsChange) {
      onShowFurnitureLabelsChange(visible);
      return;
    }
    setInternalShowFurnitureLabels(visible);
  }

  useEffect(() => {
    setSelectedSyncWallId("");
    setSyncPaintRuleId(null);
    setClickDrawStart(null);
    setDrawPreview(null);
    setOutdoorDraft([]);
    setOutdoorSurfaceDraft(null);
    setOutdoorRectDraft(null);
    setSelectedStructureId("");
    setInteractionState((currentState) => ({ ...currentState, selectedObjectId: "", hoveredObjectId: "", editingObjectId: "" }));
    onActiveObjectChange("");
  }, [floor.id]);

  useEffect(() => {
    if (!furnitureImmersiveMode) return;
    setSheetMode("furniturePlan");
    onPlannerModeChange("edit");
    onDrawToolChange("select");
  }, [furnitureImmersiveMode, onDrawToolChange, onPlannerModeChange]);

  useEffect(() => {
    if (!yardImmersiveMode) return;
    setSheetMode("structurePlan");
    onPlannerModeChange("edit");
    onDrawToolChange("select");
    setLabelFilter("outdoor");
    setShowObjectIds(true);
  }, [yardImmersiveMode, onDrawToolChange, onPlannerModeChange]);

  useEffect(() => {
    if (!focusMode) return;
    setSheetMode("structurePlan");
    onPlannerModeChange("edit");
    onDrawToolChange("select");
    setLabelFilter("all");
  }, [focusMode, onDrawToolChange, onPlannerModeChange]);

  useEffect(() => {
    if (!constructionPackageOpenRequest) return;
    setIsConstructionPackageOpen(true);
  }, [constructionPackageOpenRequest]);

  useEffect(() => {
    if (developerMode) return;
    setShowObjectIds(false);
  }, [developerMode]);

  useEffect(() => {
    if (!drawingDrivenMode || !showAdvancedCanvasControls) return;
    setIsCleanupPanelOpen(true);
  }, [drawingDrivenMode, showAdvancedCanvasControls]);

  useEffect(() => {
    if (sheetMode !== "structureSyncCheck") return;
    if (houseStructure.walls.some((wall) => wall.id === selectedStructureId)) {
      setSelectedSyncWallId(selectedStructureId);
    }
  }, [houseStructure.walls, selectedStructureId, sheetMode]);
  const basePlanRect = useMemo(() => ({
    left: `${((0 - planBounds.x) / planBounds.width) * 100}%`,
    top: `${((0 - planBounds.y) / planBounds.height) * 100}%`,
    width: `${(STRUCTURE_WIDTH_MM / planBounds.width) * 100}%`,
    height: `${(STRUCTURE_HEIGHT_MM / planBounds.height) * 100}%`
  }), [planBounds]);

  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    onScaleChange(1);
  }, [floor.id, onScaleChange]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (plannerMode === "edit" && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if (plannerMode === "edit" && event.key === "Escape" && clickDrawStart) {
        event.preventDefault();
        cancelClickDraw();
        return;
      }
      if (plannerMode !== "edit" || (event.key !== "Delete" && event.key !== "Backspace")) return;
      event.preventDefault();
      deleteSelectedObject();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [plannerMode, selectedStructureId, houseStructure, furniture, interactionState.selectedObjectId, clickDrawStart, onUndo, onRedo]);

  useEffect(() => {
    if (plannerMode !== "edit") return;
    setIsCleanupPanelOpen(false);
    setIsManualCleanupMode(false);
    setCleanupSelection(null);
  }, [plannerMode]);

  useEffect(() => {
    setClickDrawStart(null);
    setDrawPreview(null);
    setOutdoorSurfaceDraft(null);
    setIsPlanZoomSelected(false);
  }, [drawTool, floor.id]);

  useEffect(() => {
    if (!locateObjectRequest) return;
    const { id } = locateObjectRequest;
    const drawingItem = drawingItems.find((item) => item.id === id);
    if (drawingItem) {
      setSelectedDrawingItemId(id);
      setSelectedStructureId("");
      selectObject(id);
      onActiveObjectChange(id);
      setScale(1.45);
      onScaleChange(1.45);
      const rect = planRef.current?.getBoundingClientRect();
      if (rect) {
        setPan({
          x: (0.5 - (drawingItem.positionMm.x - planBounds.x) / planBounds.width) * rect.width * 1.45,
          y: (0.5 - (drawingItem.positionMm.y - planBounds.y) / planBounds.height) * rect.height * 1.45
        });
      }
      setStructureMessage(`已定位图纸对象 ${id}`);
      return;
    }
    const furnitureObject = furniture.find((item) => item.id === id);
    if (furnitureObject) {
      setSelectedStructureId("");
      selectObject(id);
      onSelectFurniture(furnitureObject);
      onActiveObjectChange(id);
      setScale(1.45);
      onScaleChange(1.45);
      const rect = planRef.current?.getBoundingClientRect();
      if (rect) {
        setPan({
          x: (50 - furnitureObject.position.x) / 100 * rect.width * 1.45,
          y: (50 - furnitureObject.position.y) / 100 * rect.height * 1.45
        });
      }
      return;
    }

    const label = structureLabels.find((item) => item.id === id);
    if (!label) return;
    setSelectedStructureId(id);
    selectObject(id);
    onActiveObjectChange(id);
    setScale(1.45);
    onScaleChange(1.45);
    const rect = planRef.current?.getBoundingClientRect();
    if (rect) {
      setPan({
        x: (0.5 - (label.x - planBounds.x) / planBounds.width) * rect.width * 1.45,
        y: (0.5 - (label.y - planBounds.y) / planBounds.height) * rect.height * 1.45
      });
    }
    setStructureMessage(`已定位校验对象 ${id}`);
  }, [locateObjectRequest]);

  function updateScale(nextScale: number) {
    const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(nextScale.toFixed(2))));
    setScale(clampedScale);
    onScaleChange(clampedScale);
  }

  function zoomBy(delta: number) {
    updateScale(scale + delta);
  }

  function resetViewport() {
    setPan({ x: 0, y: 0 });
    updateScale(1);
  }

  function getTouchDistance(touches: TouchEvent<HTMLDivElement>["touches"]) {
    if (touches.length < 2) return 0;
    const first = touches[0];
    const second = touches[1];
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!mobilePresentationMode || viewMode !== "2d") return;
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      touchGestureRef.current = {
        mode: "pan",
        startX: touch.clientX,
        startY: touch.clientY,
        startDistance: 0,
        panX: pan.x,
        panY: pan.y,
        scale
      };
      return;
    }
    if (event.touches.length >= 2) {
      event.preventDefault();
      touchGestureRef.current = {
        mode: "pinch",
        startX: 0,
        startY: 0,
        startDistance: getTouchDistance(event.touches),
        panX: pan.x,
        panY: pan.y,
        scale
      };
    }
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (!mobilePresentationMode || viewMode !== "2d") return;
    const gesture = touchGestureRef.current;
    if (!gesture) return;
    event.preventDefault();
    if (gesture.mode === "pan" && event.touches.length === 1) {
      const touch = event.touches[0];
      setPan({
        x: gesture.panX + touch.clientX - gesture.startX,
        y: gesture.panY + touch.clientY - gesture.startY
      });
      return;
    }
    if (event.touches.length >= 2 && gesture.startDistance > 0) {
      const ratio = getTouchDistance(event.touches) / gesture.startDistance;
      updateScale(gesture.scale * ratio);
    }
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!mobilePresentationMode) return;
    if (event.touches.length === 0) {
      touchGestureRef.current = null;
    }
  }

  useEffect(() => {
    if (!mobilePresentationMode) return;
    const nextSheetMode = mobileDisplayLevel === "professional" ? mobileProfessionalSheetMode : "furniturePlan";
    setSheetMode(nextSheetMode);
    setShowObjectIds(false);
    setLabelFilter("all");
    setIsConstructionPackageOpen(false);
    setIsCleanupPanelOpen(false);
    setIsManualCleanupMode(false);
  }, [mobilePresentationMode, mobileDisplayLevel, mobileProfessionalSheetMode]);

  useEffect(() => {
    if (!resetViewRequest) return;
    resetViewport();
  }, [resetViewRequest]);

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (viewMode !== "2d") return;
    if (!event.ctrlKey && !event.metaKey) return;
    const target = event.target as Node | null;
    if (!isPlanZoomSelected || !target || !planRef.current?.contains(target)) return;
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? -SCALE_STEP : SCALE_STEP);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (mobilePresentationMode && event.pointerType === "touch") return;
    const target = event.target as Node | null;
    if (target && planRef.current && !planRef.current.contains(target)) {
      setIsPlanZoomSelected(false);
    }
    if (furnitureImmersiveMode && activeFurnitureId) {
      onActiveObjectChange("");
    }
    if (viewMode !== "2d" || event.button !== 0 || isManualCleanupMode || (plannerMode === "edit" && drawTool !== "select")) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMobileObjectCapture(event: MouseEvent<HTMLDivElement> | PointerEvent<HTMLDivElement>) {
    if (!mobilePresentationMode || viewMode !== "2d") return;
    const target = event.target as HTMLElement | null;
    const furnitureNode = target?.closest("[data-furniture-id]") as HTMLElement | null;
    const furnitureId = furnitureNode?.dataset.furnitureId;
    if (!furnitureId) return;
    const targetFurniture = furniture.find((item) => item.id === furnitureId);
    if (!targetFurniture) return;
    event.stopPropagation();
    setSelectedStructureId("");
    selectObject(targetFurniture.id);
    onSelectFurniture(targetFurniture);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan({
      x: drag.panX + event.clientX - drag.startX,
      y: drag.panY + event.clientY - drag.startY
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function getPercentPosition(event: PointerEvent<Element>) {
    const rect = planRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))
    };
  }

  function getMmPosition(event: PointerEvent<Element>) {
    const rect = planRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.round(Math.min(planBounds.x + planBounds.width, Math.max(planBounds.x, planBounds.x + ((event.clientX - rect.left) / rect.width) * planBounds.width))),
      y: Math.round(Math.min(planBounds.y + planBounds.height, Math.max(planBounds.y, planBounds.y + ((event.clientY - rect.top) / rect.height) * planBounds.height)))
    };
  }

  function getFurniturePosition(event: PointerEvent<Element>) {
    const point = getMmPosition(event);
    if (!point) return null;
    const usesSiteBounds = floor.id === "1F" || floor.id === "YARD";
    const minY = usesSiteBounds ? (SITE_PLAN_MIN_Y_MM / STRUCTURE_HEIGHT_MM) * 100 : 0;
    const maxY = usesSiteBounds ? (SITE_PLAN_MAX_Y_MM / STRUCTURE_HEIGHT_MM) * 100 : 100;
    return {
      x: Math.min(100, Math.max(0, (point.x / STRUCTURE_WIDTH_MM) * 100)),
      y: Math.min(maxY, Math.max(minY, (point.y / STRUCTURE_HEIGHT_MM) * 100))
    };
  }

  function getFurnitureDisplayPosition(item: Furniture) {
    const normalized = normalizeObjectForSync(item, houseStructure.coordinateSystem, houseStructure, interactionState);
    return toPlanPercent(normalized.positionMm, planBounds);
  }

  function getFurnitureDisplaySize(item: Furniture) {
    const planObject = toPlanObject(normalizeObjectForSync(item, houseStructure.coordinateSystem, houseStructure, interactionState), houseStructure.coordinateSystem);
    return {
      width: Math.max(5, planObject.dimensionsPercent.width * houseStructure.coordinateSystem.width / planBounds.width),
      height: Math.max(4, planObject.dimensionsPercent.depth * houseStructure.coordinateSystem.height / planBounds.height)
    };
  }

  function getFurnitureFootprintArea(item: Furniture) {
    return (item.dimensions.width * item.dimensions.depth / 10_000).toFixed(2);
  }

  function updateFurnitureObject(furnitureId: string, updater: (item: Furniture) => Furniture) {
    onFurnitureChange(furniture.map((item) => item.id === furnitureId && !resolveLock(item, interactionState).locked2d ? updater(item) : item));
  }

  function nudgeFurnitureObject(furnitureId: string, delta: { x: number; y: number }) {
    const current = furniture.find((item) => item.id === furnitureId);
    if (!current || resolveLock(current, interactionState).locked2d) return;
    const next = {
      ...current,
      position: {
        ...current.position,
        x: Math.min(100, Math.max(0, current.position.x + delta.x)),
        y: Math.min(100, Math.max(0, current.position.y + delta.y))
      }
    };
    onFurnitureChange(furniture.map((item) => item.id === furnitureId ? next : item));
    onFurnitureDragEnd(next, { x: delta.x / 100 * houseStructure.coordinateSystem.width, y: delta.y / 100 * houseStructure.coordinateSystem.height });
  }

  function rotateFurnitureObject(furnitureId: string, delta: number) {
    updateFurnitureObject(furnitureId, (item) => ({
      ...item,
      position: {
        ...item.position,
        rotation: (item.position.rotation + delta + 360) % 360
      }
    }));
  }

  function flipFurnitureObject(furnitureId: string, axis: "x" | "y") {
    updateFurnitureObject(furnitureId, (item) => ({
      ...item,
      position: {
        ...item.position,
        [axis === "x" ? "flipX" : "flipY"]: !item.position[axis === "x" ? "flipX" : "flipY"]
      }
    }));
  }

  function resizeFurnitureObject(furnitureId: string, field: "width" | "depth" | "height", value: number) {
    updateFurnitureObject(furnitureId, (item) => ({
      ...item,
      dimensions: {
        ...item.dimensions,
        [field]: Math.max(1, Math.round(value) || 1)
      }
    }));
  }

  function updateHouseStructure(nextStructure: HouseStructure) {
    onHouseStructureChange({
      ...nextStructure,
      rooms: generateRoomsFromWalls(floor.id, nextStructure.walls, nextStructure.rooms)
    });
  }

  function applyWallSyncOverride(wallId: string, ruleId: SyncPaintRuleId) {
    if (sheetMode !== "structureSyncCheck") return;
    const nextOverrides = { ...wallSyncOverrides };
    if (ruleId === "default") {
      delete nextOverrides[wallId];
      setStructureMessage(`${wallId} 已恢复默认联动规则`);
    } else {
      nextOverrides[wallId] = ruleId as WallSyncRuleId;
      const label = syncPaintTools.find((item) => item.id === ruleId)?.label ?? "自定义";
      setStructureMessage(`${wallId} 已标记为 ${label}`);
    }
    onWallSyncOverridesChange(nextOverrides);
  }

  function handleSyncPaintToolSelect(ruleId: SyncPaintRuleId) {
    setSyncPaintRuleId(ruleId);
    const selectedWallId = selectedSyncWallId || (houseStructure.walls.some((wall) => wall.id === selectedStructureId) ? selectedStructureId : "");
    if (selectedWallId) {
      applyWallSyncOverride(selectedWallId, ruleId);
      return;
    }
    const label = syncPaintTools.find((item) => item.id === ruleId)?.label ?? "规则";
    setStructureMessage(`已选择 ${label}，再点一面墙`);
  }

  function commitInteractionModel(nextModel: { houseStructure: HouseStructure; furniture: Furniture[] }) {
    if (nextModel.houseStructure !== houseStructure) onHouseStructureChange(nextModel.houseStructure);
    if (nextModel.furniture !== furniture) onFurnitureChange(nextModel.furniture);
  }

  function finishFurnitureDrag(pointerId: number) {
    const drag = furnitureDragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    if (drag.moved) onFurnitureDragEnd(drag.latestFurniture, drag.totalDelta);
    window.setTimeout(() => {
      if (furnitureDragRef.current?.pointerId === pointerId) furnitureDragRef.current = null;
      if (drag.moved && skipFurnitureClickRef.current === drag.objectId) skipFurnitureClickRef.current = "";
    }, 0);
  }

  function selectObject(objectId: string) {
    setIsPlanZoomSelected(false);
    setInteractionState((currentState) => handleSelect(currentState, objectId));
    if (mobilePresentationMode) onActiveObjectChange(objectId);
  }

  function hoverObject(objectId: string) {
    setInteractionState((currentState) => handleHover(currentState, objectId));
  }

  function clearHoverObject(objectId: string) {
    setInteractionState((currentState) => currentState.hoveredObjectId === objectId ? { ...currentState, hoveredObjectId: "" } : currentState);
  }

  function isObjectSelected(objectId: string) {
    return interactionState.selectedObjectId === objectId || selectedStructureId === objectId || selectedFurnitureId === objectId;
  }

  function isObjectHovered(objectId: string) {
    return interactionState.hoveredObjectId === objectId;
  }

  function isObjectActive(objectId: string) {
    return interactionState.editingObjectId === objectId;
  }

  function objectIsLocked(objectId: string) {
    const structureObject = getStructureObjectById(objectId);
    if (structureObject) return resolveLock(structureObject, interactionState).locked2d;
    const furnitureObject = furniture.find((item) => item.id === objectId);
    if (furnitureObject) return resolveLock(furnitureObject, interactionState).locked2d;
    return isLocked(interactionState, objectId);
  }

  function getNextStructureId(prefix: string, count: number) {
    const idPattern = new RegExp(`^${prefix}-${floor.id}-(\\d+)$`);
    const existingIds = [
      ...houseStructure.walls.map((object) => object.id),
      ...houseStructure.partitions.map((object) => object.id),
      ...houseStructure.stairs.map((object) => object.id),
      ...(houseStructure.columns ?? []).map((object) => object.id),
      ...houseStructure.fences.map((object) => object.id),
      ...houseStructure.outdoorSurfaces.map((object) => object.id),
      ...houseStructure.doors.map((object) => object.id),
      ...houseStructure.windows.map((object) => object.id),
      ...houseStructure.bayWindows.map((object) => object.id),
      ...houseStructure.skylights.map((object) => object.id),
      ...houseStructure.outdoors.map((object) => object.id)
    ];
    const maxSuffix = existingIds.reduce((max, id) => {
      const match = id.match(idPattern);
      return match ? Math.max(max, Number(match[1])) : max;
    }, count);
    return `${prefix}-${floor.id}-${String(maxSuffix + 1).padStart(3, "0")}`;
  }

  function getStructureObjectById(objectId: string): HouseStructureObject | null {
    return (
      houseStructure.walls.find((object) => object.id === objectId) ??
      houseStructure.partitions.find((object) => object.id === objectId) ??
      houseStructure.stairs.find((object) => object.id === objectId) ??
      (houseStructure.columns ?? []).find((object) => object.id === objectId) ??
      houseStructure.fences.find((object) => object.id === objectId) ??
      houseStructure.outdoorSurfaces.find((object) => object.id === objectId) ??
      houseStructure.rooms.find((object) => object.id === objectId) ??
      houseStructure.doors.find((object) => object.id === objectId) ??
      houseStructure.windows.find((object) => object.id === objectId) ??
      houseStructure.bayWindows.find((object) => object.id === objectId) ??
      houseStructure.skylights.find((object) => object.id === objectId) ??
      houseStructure.outdoors.find((object) => object.id === objectId) ??
      null
    );
  }

  function getSelectedStructureObject(): HouseStructureObject | null {
    return getStructureObjectById(selectedStructureId);
  }

  function getStructureObjectKind(objectId: string): StructureInteractionKind | null {
    if (houseStructure.walls.some((object) => object.id === objectId)) return "wall";
    if (houseStructure.partitions.some((object) => object.id === objectId)) return "partition";
    if (houseStructure.stairs.some((object) => object.id === objectId)) return "stair";
    if ((houseStructure.columns ?? []).some((object) => object.id === objectId)) return "column";
    if (houseStructure.fences.some((object) => object.id === objectId)) return "fence";
    if (houseStructure.doors.some((object) => object.id === objectId)) return "opening";
    if (houseStructure.windows.some((object) => object.id === objectId)) return "opening";
    if (houseStructure.bayWindows.some((object) => object.id === objectId)) return "opening";
    if (houseStructure.skylights.some((object) => object.id === objectId)) return "skylight";
    if (houseStructure.rooms.some((object) => object.id === objectId)) return "room";
    if (houseStructure.outdoors.some((object) => object.id === objectId)) return "outdoor";
    if (houseStructure.outdoorSurfaces.some((object) => object.id === objectId)) return "outdoorSurface";
    return null;
  }

  function getDrawToolStructureKind(tool: DrawTool): StructureInteractionKind | null {
    if (tool === "wall-straight" || tool === "wall-arc") return "wall";
    if (tool === "partition") return "partition";
    if (tool === "stair") return "stair";
    if (tool === "column") return "column";
    if (tool === "fence") return "fence";
    if (tool === "door" || tool === "window" || tool === "bay-window") return "opening";
    if (tool === "skylight") return "skylight";
    if (tool === "outdoor") return "outdoor";
    if (tool === "hardscape" || tool === "hardscape-rect" || tool === "path" || tool === "planting") return "outdoorSurface";
    return null;
  }

  function canSelectFurnitureLayer() {
    if (yardImmersiveMode) return true;
    return sheetMode === "sitePlan" || sheetMode === "furniturePlan" || sheetMode === "presentationView" || sheetMode === "annotationPlan" || ["socketPlan", "switchPlan", "lightingPlan", "waterSupplyPlan", "drainagePlan", "ceilingPlan", "floorFinishPlan", "wallFinishPlan", "materialPlan"].includes(sheetMode);
  }

  function canSelectStructureLayer(kind: StructureInteractionKind) {
    if (yardImmersiveMode) return kind === "outdoor" || kind === "outdoorSurface" || kind === "fence";
    if (mobilePresentationMode) return true;
    if (sheetMode === "sitePlan") return true;
    if (sheetMode === "structureSyncCheck") return kind === "wall";
    if (sheetMode === "structurePlan" || sheetMode === "demolitionAndBuildPlan") return true;
    return false;
  }

  function canMutateStructureLayer(kind: StructureInteractionKind) {
    if (yardImmersiveMode) return kind === "outdoor" || kind === "outdoorSurface" || kind === "fence";
    if (kind === "room" || sheetMode === "structureSyncCheck") return false;
    if (kind === "wall") return wallEditableSheetTypes.has(sheetMode as DrawingSheetType);
    return sheetMode === "structurePlan" || sheetMode === "demolitionAndBuildPlan";
  }

  function canDrawStructureTool(tool: DrawTool) {
    const kind = getDrawToolStructureKind(tool);
    return !kind || canMutateStructureLayer(kind);
  }

  function getLayerInteractionLabel() {
    if (sheetMode === "sitePlan") return "总平面图：可选择全部对象，墙体只读";
    if (sheetMode === "furniturePlan") return "家具定位图：只响应家具/硬装";
    if (sheetMode === "structureSyncCheck") return "结构联动检查：只响应墙体";
    if (sheetMode === "structurePlan" || sheetMode === "demolitionAndBuildPlan") return "结构/拆改图：可选择、绘制和调整结构对象";
    if (sheetMode === "presentationView") return "展示视图：只响应展示对象";
    if (sheetMode === "annotationPlan") return "施工标注/待确认项：墙体保护，响应家具/硬装";
    return "专业图纸：墙体保护，响应家具/硬装";
  }

  function blockProtectedStructureEdit(kind: StructureInteractionKind, action = "结构调整") {
    if (canMutateStructureLayer(kind)) return false;
    if (!canSelectStructureLayer(kind)) {
      setStructureMessage(`${planCanvasModeLabels[sheetMode]}不编辑此对象。`);
      return true;
    }
    if (kind === "wall") {
      setStructureMessage(`${action}已保护。只有${wallEditableSheetTypeLabel}可以动墙。`);
      return true;
    }
    setStructureMessage(`${action}已保护。请切到结构图或拆改施工图再修改结构对象。`);
    return true;
  }

  function getStructureSnapPoints() {
    return [
      ...getWallEndpoints(houseStructure.walls),
      ...houseStructure.partitions.flatMap((partition) => [partition.start, partition.end]),
      ...houseStructure.stairs.flatMap((stair) => [stair.start, stair.end]),
      ...(houseStructure.columns ?? []).map((column) => column.center),
      ...houseStructure.fences.flatMap((fence) => [fence.start, fence.end]),
      ...houseStructure.outdoors.flatMap((outdoor) => outdoor.polygon),
      ...houseStructure.outdoorSurfaces.flatMap((surface) => surface.polygon)
    ];
  }

  function getStructureSnapSegments() {
    const polygonSegments = (points: MmPoint[]) => points.length < 2
      ? []
      : points.map((point, index) => ({ start: point, end: points[(index + 1) % points.length] }));

    return [
      ...houseStructure.walls.flatMap((wall) => wall.kind === "straight" ? [{ start: wall.start, end: wall.end }] : []),
      ...houseStructure.partitions.map((partition) => ({ start: partition.start, end: partition.end })),
      ...houseStructure.stairs.map((stair) => ({ start: stair.start, end: stair.end })),
      ...houseStructure.fences.map((fence) => ({ start: fence.start, end: fence.end })),
      ...houseStructure.outdoors.flatMap((outdoor) => polygonSegments(outdoor.polygon)),
      ...houseStructure.outdoorSurfaces.flatMap((surface) => polygonSegments(surface.polygon))
    ];
  }

  function getStructureDrawPoint(rawPoint: MmPoint, origin?: MmPoint) {
    const nearestEndpoint = getStructureSnapPoints()
      .map((point) => ({ point, distance: getDistance(rawPoint, point) }))
      .filter((candidate) => candidate.distance <= 220)
      .sort((a, b) => a.distance - b.distance)[0]?.point;

    if (nearestEndpoint) return nearestEndpoint;

    const nearestLine = getStructureSnapSegments()
      .map((segment) => projectPointToSegment(rawPoint, segment.start, segment.end))
      .filter((projection) => projection.distance <= STRUCTURE_LINE_SNAP_DISTANCE_MM)
      .sort((a, b) => a.distance - b.distance)[0]?.point;

    if (nearestLine) {
      return {
        x: Math.round(nearestLine.x),
        y: Math.round(nearestLine.y)
      };
    }

    return origin ? snapPoint(rawPoint, [], origin) : rawPoint;
  }

  function cancelClickDraw() {
    setClickDrawStart(null);
    setDrawPreview(null);
    setStructureMessage("已取消当前结构绘制。");
  }

  function finishContinuousDraw(message = "已结束连续绘制。") {
    setClickDrawStart(null);
    setDrawPreview(null);
    setStructureMessage(message);
  }

  function commitDrawPreview() {
    if (!drawPreview || !isClickDrawTool(drawTool)) {
      setStructureMessage("当前没有可完成的预览线段。");
      return;
    }
    if (getDistance(drawPreview.start, drawPreview.end) <= 120) {
      setStructureMessage("终点太近，请移动鼠标后再完成线段。");
      return;
    }

    const tool = drawTool;
    const start = drawPreview.start;
    const end = drawPreview.end;
    const kind = getDrawToolStructureKind(tool);
    if (kind && blockProtectedStructureEdit(kind, "完成当前线段")) return;

    if (tool === "wall-straight") {
      const wall = createStraightWall(getNextStructureId("W", houseStructure.walls.length), floor.id, start, end);
      updateHouseStructure({ ...houseStructure, walls: [...houseStructure.walls, wall] });
      setSelectedStructureId(wall.id);
      selectObject(wall.id);
      onActiveObjectChange(wall.id);
      finishContinuousDraw(`已完成墙体 ${wall.id}，已进入模型，可固化默认户型。`);
      return;
    }

    if (tool === "wall-arc") {
      const wall = createArcWallFromEndpoints(getNextStructureId("AW", houseStructure.walls.length), floor.id, start, end, arcSweepAngle, arcDirection);
      updateHouseStructure({ ...houseStructure, walls: [...houseStructure.walls, wall] });
      setSelectedStructureId(wall.id);
      selectObject(wall.id);
      onActiveObjectChange(wall.id);
      finishContinuousDraw(`已完成弧墙 ${wall.id}，已进入模型，可固化默认户型。`);
      return;
    }

    if (tool === "partition") {
      const partition = createPartition(getNextStructureId("P", houseStructure.partitions.length), floor.id, start, end);
      onHouseStructureChange({ ...houseStructure, partitions: [...houseStructure.partitions, partition] });
      setSelectedStructureId(partition.id);
      selectObject(partition.id);
      onActiveObjectChange(partition.id);
      finishContinuousDraw(`已完成隔断 ${partition.id}，已进入模型。`);
      return;
    }

    if (tool === "stair") {
      const stair = createStair(getNextStructureId("ST", houseStructure.stairs.length), floor.id, start, end);
      onHouseStructureChange({ ...houseStructure, stairs: [...houseStructure.stairs, stair] });
      setSelectedStructureId(stair.id);
      selectObject(stair.id);
      onActiveObjectChange(stair.id);
      finishContinuousDraw(`已完成楼梯 ${stair.id}，已进入模型。`);
      return;
    }

    if (tool === "fence") {
      const fence = createFence(getNextStructureId("FN", houseStructure.fences.length), floor.id, start, end);
      onHouseStructureChange({ ...houseStructure, fences: [...houseStructure.fences, fence] });
      setSelectedStructureId(fence.id);
      selectObject(fence.id);
      onActiveObjectChange(fence.id);
      finishContinuousDraw(`已完成篱笆 ${fence.id}，已进入模型。`);
    }
  }

  function finishClickDraw(tool: ClickDrawTool, start: MmPoint, end: MmPoint) {
    const kind = getDrawToolStructureKind(tool);
    if (kind && blockProtectedStructureEdit(kind, "结构绘制")) return;

    if (getDistance(start, end) <= 120) {
      setDrawPreview({ start, end });
      setStructureMessage("终点太近，请移动鼠标后再点击另一端。");
      return;
    }

    if (tool === "wall-straight") {
      const wall = createStraightWall(getNextStructureId("W", houseStructure.walls.length), floor.id, start, end);
      updateHouseStructure({ ...houseStructure, walls: [...houseStructure.walls, wall] });
      setSelectedStructureId(wall.id);
      selectObject(wall.id);
      onActiveObjectChange(wall.id);
      setClickDrawStart({ tool, start: end });
      setDrawPreview({ start: end, end });
      setStructureMessage(`已连接墙体 ${wall.id}，长度 ${wall.length} mm。继续移动鼠标可接着画下一段，双击或按 Esc 结束。`);
      return;
    }

    if (tool === "wall-arc") {
      const wall = createArcWallFromEndpoints(getNextStructureId("AW", houseStructure.walls.length), floor.id, start, end, arcSweepAngle, arcDirection);
      updateHouseStructure({ ...houseStructure, walls: [...houseStructure.walls, wall] });
      setSelectedStructureId(wall.id);
      selectObject(wall.id);
      onActiveObjectChange(wall.id);
      setClickDrawStart({ tool, start: end });
      setDrawPreview({ start: end, end });
      setStructureMessage(`已连接弧墙 ${wall.id}，弧度 ${arcSweepAngle}°，长度 ${wall.length} mm。继续移动鼠标可接着画下一段，双击或按 Esc 结束。`);
      return;
    }

    if (tool === "stair") {
      const stair = createStair(getNextStructureId("ST", houseStructure.stairs.length), floor.id, start, end);
      onHouseStructureChange({ ...houseStructure, stairs: [...houseStructure.stairs, stair] });
      setSelectedStructureId(stair.id);
      selectObject(stair.id);
      onActiveObjectChange(stair.id);
      setClickDrawStart({ tool, start: end });
      setDrawPreview({ start: end, end });
      setStructureMessage(`已连接楼梯 ${stair.id}，长度 ${getLineLength(stair.start, stair.end)} mm。继续移动鼠标可接着画下一段，双击或按 Esc 结束。`);
      return;
    }

    if (tool === "fence") {
      const fence = createFence(getNextStructureId("FN", houseStructure.fences.length), floor.id, start, end);
      onHouseStructureChange({ ...houseStructure, fences: [...houseStructure.fences, fence] });
      setSelectedStructureId(fence.id);
      selectObject(fence.id);
      onActiveObjectChange(fence.id);
      setClickDrawStart({ tool, start: end });
      setDrawPreview({ start: end, end });
      setStructureMessage(`已连接篱笆 ${fence.id}，长度 ${getLineLength(fence.start, fence.end)} mm。继续移动鼠标可接着画下一段，双击或按 Esc 结束。`);
      return;
    }

    const partition = createPartition(getNextStructureId("P", houseStructure.partitions.length), floor.id, start, end);
    onHouseStructureChange({ ...houseStructure, partitions: [...houseStructure.partitions, partition] });
    setSelectedStructureId(partition.id);
    selectObject(partition.id);
    onActiveObjectChange(partition.id);
    setClickDrawStart({ tool, start: end });
    setDrawPreview({ start: end, end });
    setStructureMessage(`已连接隔断 ${partition.id}，长度 ${getLineLength(partition.start, partition.end)} mm。继续移动鼠标可接着画下一段，双击或按 Esc 结束。`);
  }

  function handleStructureDoubleClick(event: MouseEvent<SVGSVGElement>) {
    if (!clickDrawStart) return;
    event.preventDefault();
    event.stopPropagation();
    finishContinuousDraw("已结束连续绘制。");
  }

  function handleStructurePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (viewMode !== "2d") return;
    if (event.target === event.currentTarget && (plannerMode !== "edit" || drawTool === "select")) {
      setIsPlanZoomSelected(true);
      setSelectedStructureId("");
      setInteractionState((currentState) => ({ ...currentState, selectedObjectId: "", editingObjectId: "" }));
      onActiveObjectChange("");
      setStructureMessage("已选中整张户型图。");
      if (plannerMode !== "edit") return;
    }
    if (plannerMode !== "edit") return;
    const toolKind = getDrawToolStructureKind(drawTool);
    if (toolKind && blockProtectedStructureEdit(toolKind, "结构绘制")) {
      event.stopPropagation();
      return;
    }
    const rawPoint = getMmPosition(event);
    if (!rawPoint) return;
    const snapPoints = getStructureSnapPoints();
    const point = isClickDrawTool(drawTool)
      ? getStructureDrawPoint(rawPoint, clickDrawStart?.start)
      : clickDrawStart
        ? snapPoint(rawPoint, snapPoints, clickDrawStart.start)
        : snapPoint(rawPoint, snapPoints);

    if (isClickDrawTool(drawTool)) {
      event.stopPropagation();
      const tool = drawTool;
      if (!clickDrawStart || clickDrawStart.tool !== tool) {
        setClickDrawStart({ tool, start: point });
        setDrawPreview({ start: point, end: point });
        setStructureMessage(tool === "wall-straight"
          ? "已设置墙体起点。移动鼠标预览，再点击终点完成连接。"
          : tool === "wall-arc"
            ? "已设置弧墙起点。移动鼠标预览，再点击终点完成连接。"
            : tool === "partition"
              ? "已设置隔断起点。移动鼠标预览，再点击终点完成连接。"
              : tool === "stair"
                ? "已设置楼梯起点。移动鼠标预览，再点击终点完成连接。"
                : "已设置篱笆起点。移动鼠标预览，再点击终点完成连接。"
        );
        return;
      }
      finishClickDraw(tool, clickDrawStart.start, point);
      return;
    }

    if (drawTool === "door" || drawTool === "window" || drawTool === "bay-window") {
      event.stopPropagation();
      const host = findNearestHost(point, houseStructure.walls, houseStructure.partitions);
      if (!host) {
        setStructureMessage("门窗必须吸附到墙体或隔断上，请点击靠近墙线的位置。");
        return;
      }
      if (drawTool === "door") {
        const door = createDoor(getNextStructureId("D", houseStructure.doors.length), floor.id, host);
        onHouseStructureChange({ ...houseStructure, doors: [...houseStructure.doors, door] });
        setSelectedStructureId(door.id);
        selectObject(door.id);
        onActiveObjectChange(door.id);
      } else if (drawTool === "window") {
        const windowObject = createWindow(getNextStructureId("WIN", houseStructure.windows.length), floor.id, host);
        onHouseStructureChange({ ...houseStructure, windows: [...houseStructure.windows, windowObject] });
        setSelectedStructureId(windowObject.id);
        selectObject(windowObject.id);
        onActiveObjectChange(windowObject.id);
      } else {
        const bayWindow = createBayWindow(getNextStructureId("BW", houseStructure.bayWindows.length), floor.id, host);
        if (!bayWindow) {
          setStructureMessage("飘窗必须绑定结构墙，不能绑定隔断。");
          return;
        }
        onHouseStructureChange({ ...houseStructure, bayWindows: [...houseStructure.bayWindows, bayWindow] });
        setSelectedStructureId(bayWindow.id);
        selectObject(bayWindow.id);
        onActiveObjectChange(bayWindow.id);
      }
      setStructureMessage("已吸附到最近的墙体/隔断。");
      return;
    }

    if (drawTool === "skylight") {
      event.stopPropagation();
      const skylight = createSkylight(getNextStructureId("SKY", houseStructure.skylights.length), floor.id, point);
      onHouseStructureChange({ ...houseStructure, skylights: [...houseStructure.skylights, skylight] });
      setSelectedStructureId(skylight.id);
      selectObject(skylight.id);
      onActiveObjectChange(skylight.id);
      setStructureMessage("已放置天窗。天窗是独立结构对象，可在右侧调整宽度、进深和高度。");
      return;
    }

    if (drawTool === "column") {
      event.stopPropagation();
      const column = createColumn(getNextStructureId("COL", (houseStructure.columns ?? []).length), floor.id, point);
      onHouseStructureChange({ ...houseStructure, columns: [...(houseStructure.columns ?? []), column] });
      setSelectedStructureId(column.id);
      selectObject(column.id);
      onActiveObjectChange(column.id);
      setStructureMessage(`已放置圆柱立柱 ${column.id}。可在右侧调整半径和高度。`);
      return;
    }

    if (drawTool === "outdoor") {
      event.stopPropagation();
      const nextDraft = [...outdoorDraft, point];
      setOutdoorDraft(nextDraft);
      setStructureMessage("继续点击添加院子边界点，至少 3 个点后可完成区域。");
      return;
    }

    if (drawTool === "hardscape-rect") {
      event.stopPropagation();
      if (!outdoorRectDraft) {
        setOutdoorRectDraft({ start: point, end: null });
        setStructureMessage("已设置平台第一个角点。移动鼠标预览，再点击对角点完成矩形铺装。");
        return;
      }
      const material = getOutdoorMaterialForTool("hardscape");
      const polygon = createRectPolygon(outdoorRectDraft.start, point);
      const yardPrefix = yardImmersiveMode ? `${yardFocus === "north" ? "北院" : "南院"} · ` : "";
      const label = `${yardPrefix}${outdoorSurfaceMaterialLabels[material]}矩形平台`;
      const surface = createOutdoorSurface(
        getNextStructureId("HS", houseStructure.outdoorSurfaces.length),
        floor.id,
        "hardscape",
        polygon,
        {
          label,
          notes: yardImmersiveMode ? "庭院绘制模式创建，可用于地面铺装图、材料清单和 3D 展示。" : "",
          status: "draft",
          source: yardImmersiveMode ? "yard-editor" : "manual",
          category: "hardscape"
        }
      );
      onHouseStructureChange({ ...houseStructure, outdoorSurfaces: [...houseStructure.outdoorSurfaces, { ...surface, material, name: label }] });
      setSelectedStructureId(surface.id);
      selectObject(surface.id);
      onActiveObjectChange(surface.id);
      setOutdoorRectDraft(null);
      onDrawToolChange("select");
      setStructureMessage(`已创建矩形平台，面积 ${(surface.area / 1_000_000).toFixed(2)} m2`);
      return;
    }

    if (drawTool === "hardscape" || drawTool === "path" || drawTool === "planting") {
      event.stopPropagation();
      const tool = drawTool;
      const currentPoints = outdoorSurfaceDraft?.tool === tool ? outdoorSurfaceDraft.points : [];
      const nextDraft = { tool, points: [...currentPoints, point] };
      setOutdoorSurfaceDraft(nextDraft);
      setStructureMessage(tool === "path" ? "继续点击小路中心线，至少 2 个点后可完成自动宽度小路。" : "继续点击添加边界点，至少 3 个点后可完成户外区域。");
    }
  }

  function handleStructurePointerMove(event: PointerEvent<SVGSVGElement>) {
    const previewKind = getDrawToolStructureKind(drawTool);
    if (previewKind && !canMutateStructureLayer(previewKind)) return;

    if (clickDrawStart && isClickDrawTool(drawTool)) {
      const rawPoint = getMmPosition(event);
      if (!rawPoint) return;
      const end = getStructureDrawPoint(rawPoint, clickDrawStart.start);
      setDrawPreview({ start: clickDrawStart.start, end });
      return;
    }

    if (drawTool === "hardscape-rect" && outdoorRectDraft?.start) {
      const rawPoint = getMmPosition(event);
      if (!rawPoint) return;
      setOutdoorRectDraft({ ...outdoorRectDraft, end: snapPoint(rawPoint, getStructureSnapPoints(), outdoorRectDraft.start) });
      return;
    }

    const drag = drawDragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      const rawPoint = getMmPosition(event);
      if (!rawPoint) return;
      const end = getStructureDrawPoint(rawPoint, drag.start);
      setDrawPreview({ start: drag.start, end });
      return;
    }

    const structureDrag = structureDragRef.current;
    if (structureDrag && structureDrag.pointerId === event.pointerId) {
      const kind = getStructureObjectKind(structureDrag.objectId);
      if (!kind || !canMutateStructureLayer(kind)) return;
      const rawPoint = getMmPosition(event);
      if (!rawPoint) return;
      const point = snapPoint(rawPoint, getStructureSnapPoints());
      structureDrag.moved = true;
      if (houseStructure.walls.some((wall) => wall.id === structureDrag.objectId)) {
        commitInteractionModel(handleResize(
          { houseStructure, furniture },
          interactionState,
          structureDrag.objectId,
          { kind: "wall-endpoint", pointKey: structureDrag.pointKey, point }
        ));
      } else if (houseStructure.partitions.some((partition) => partition.id === structureDrag.objectId)) {
        onHouseStructureChange({
          ...houseStructure,
          partitions: houseStructure.partitions.map((partition) => partition.id === structureDrag.objectId
            ? { ...partition, [structureDrag.pointKey]: point }
            : partition)
        });
      } else if (houseStructure.stairs.some((stair) => stair.id === structureDrag.objectId)) {
        onHouseStructureChange({
          ...houseStructure,
          stairs: houseStructure.stairs.map((stair) => stair.id === structureDrag.objectId
            ? { ...stair, [structureDrag.pointKey]: point }
            : stair)
        });
      } else if (houseStructure.fences.some((fence) => fence.id === structureDrag.objectId)) {
        onHouseStructureChange({
          ...houseStructure,
          fences: houseStructure.fences.map((fence) => fence.id === structureDrag.objectId
            ? { ...fence, [structureDrag.pointKey]: point }
            : fence)
        });
      }
    }

    const structureMove = structureMoveRef.current;
    if (structureMove && structureMove.pointerId === event.pointerId) {
      const kind = getStructureObjectKind(structureMove.objectId);
      if (!kind || !canMutateStructureLayer(kind)) return;
      const point = getMmPosition(event);
      if (!point || objectIsLocked(structureMove.objectId)) return;
      const delta = {
        x: point.x - structureMove.lastPoint.x,
        y: point.y - structureMove.lastPoint.y
      };
      commitInteractionModel(runInteractionDrag({ houseStructure, furniture }, interactionState, structureMove.objectId, delta));
      structureMove.lastPoint = point;
      structureMove.moved = true;
    }

    const openingDrag = openingDragRef.current;
    if (openingDrag && openingDrag.pointerId === event.pointerId) {
      if (!canMutateStructureLayer("opening")) return;
      const point = getMmPosition(event);
      if (!point || objectIsLocked(openingDrag.objectId)) return;
      const object = openingDrag.objectType === "door"
        ? houseStructure.doors.find((door) => door.id === openingDrag.objectId)
        : houseStructure.windows.find((windowObject) => windowObject.id === openingDrag.objectId);
      if (!object) return;
      const host = getHostLine(object.hostId, object.hostType);
      if (!host) return;
      const projection = projectPointToSegment(point, host.start, host.end);
      openingDrag.moved = true;
      if (openingDrag.objectType === "door") {
        onHouseStructureChange({
          ...houseStructure,
          doors: houseStructure.doors.map((door) => door.id === openingDrag.objectId ? { ...door, positionOnWall: Number(projection.t.toFixed(3)) } : door)
        });
      } else {
        onHouseStructureChange({
          ...houseStructure,
          windows: houseStructure.windows.map((windowObject) => windowObject.id === openingDrag.objectId ? { ...windowObject, positionOnWall: Number(projection.t.toFixed(3)) } : windowObject)
        });
      }
    }
  }

  function handleStructurePointerUp(event: PointerEvent<SVGSVGElement>) {
    const drag = drawDragRef.current;
    if (drag && drag.pointerId === event.pointerId && drawPreview) {
      if (getDistance(drawPreview.start, drawPreview.end) > 120) {
        if (drawTool === "wall-straight") {
          const wall = createStraightWall(getNextStructureId("W", houseStructure.walls.length), floor.id, drawPreview.start, drawPreview.end);
          updateHouseStructure({ ...houseStructure, walls: [...houseStructure.walls, wall] });
          setSelectedStructureId(wall.id);
          selectObject(wall.id);
          onActiveObjectChange(wall.id);
          setStructureMessage(`墙体长度 ${wall.length} mm`);
        }
        if (drawTool === "partition") {
          const partition = createPartition(getNextStructureId("P", houseStructure.partitions.length), floor.id, drawPreview.start, drawPreview.end);
          onHouseStructureChange({ ...houseStructure, partitions: [...houseStructure.partitions, partition] });
          setSelectedStructureId(partition.id);
          selectObject(partition.id);
          onActiveObjectChange(partition.id);
          setStructureMessage(`隔断长度 ${getLineLength(partition.start, partition.end)} mm，不参与房间闭合。`);
        }
      }
      drawDragRef.current = null;
      setDrawPreview(null);
    }

    if (structureDragRef.current?.pointerId === event.pointerId) {
      structureDragRef.current = null;
    }

    if (structureMoveRef.current?.pointerId === event.pointerId) {
      structureMoveRef.current = null;
    }

    if (openingDragRef.current?.pointerId === event.pointerId) {
      openingDragRef.current = null;
    }
  }

  function finishOutdoorDraft() {
    if (blockProtectedStructureEdit("outdoor", "院子绘制")) return;
    if (outdoorDraft.length < 3) return;
    const outdoor = createOutdoor(getNextStructureId("OD", houseStructure.outdoors.length), floor.id, outdoorDraft);
    onHouseStructureChange({ ...houseStructure, outdoors: [...houseStructure.outdoors, outdoor] });
    setSelectedStructureId(outdoor.id);
    selectObject(outdoor.id);
    onActiveObjectChange(outdoor.id);
    setOutdoorDraft([]);
    setStructureMessage(`已创建院子区域，面积 ${(outdoor.area / 1_000_000).toFixed(2)} m2`);
  }

  function cancelOutdoorDraft() {
    setOutdoorDraft([]);
    setStructureMessage("");
  }

  function finishOutdoorSurfaceDraft() {
    if (blockProtectedStructureEdit("outdoorSurface", "户外区域绘制")) return;
    if (!outdoorSurfaceDraft || outdoorSurfaceDraft.points.length < (outdoorSurfaceDraft.tool === "path" ? 2 : 3)) return;
    const prefixByTool: Record<OutdoorSurfaceDrawTool, string> = {
      hardscape: "HS",
      path: "PA",
      planting: "PL"
    };
    const material = getOutdoorMaterialForTool(outdoorSurfaceDraft.tool);
    const polygon = outdoorSurfaceDraft.tool === "path"
      ? createPathRibbon(outdoorSurfaceDraft.points, outdoorPathWidth)
      : outdoorSurfaceDraft.points;
    const surface = createOutdoorSurface(
      getNextStructureId(prefixByTool[outdoorSurfaceDraft.tool], houseStructure.outdoorSurfaces.length),
      floor.id,
      outdoorSurfaceDraft.tool,
      polygon,
      {
        label: outdoorSurfaceDraft.tool === "path" ? `${yardImmersiveMode ? `${yardFocus === "north" ? "北院" : "南院"} · ` : ""}${outdoorSurfaceMaterialLabels[material]}小路 · ${outdoorPathWidth}mm` : `${yardImmersiveMode ? `${yardFocus === "north" ? "北院" : "南院"} · ` : ""}${outdoorSurfaceMaterialLabels[material]}铺装`,
        notes: yardImmersiveMode ? "庭院绘制模式创建，可复用于 2D、3D、铺装/绿化图和施工包。" : "",
        status: "draft",
        source: yardImmersiveMode ? "yard-editor" : "manual",
        category: outdoorSurfaceDraft.tool === "hardscape" ? "hardscape" : outdoorSurfaceDraft.tool,
        pathPoints: outdoorSurfaceDraft.tool === "path" ? outdoorSurfaceDraft.points : undefined,
        pathWidthMm: outdoorSurfaceDraft.tool === "path" ? outdoorPathWidth : null
      }
    );
    const yardPrefix = yardImmersiveMode ? `${yardFocus === "north" ? "北院" : "南院"} · ` : "";
    const surfaceName = outdoorSurfaceDraft.tool === "path" ? `${yardPrefix}${outdoorSurfaceMaterialLabels[material]}小路 · ${outdoorPathWidth}mm` : `${yardPrefix}${outdoorSurfaceMaterialLabels[material]}铺装`;
    onHouseStructureChange({ ...houseStructure, outdoorSurfaces: [...houseStructure.outdoorSurfaces, { ...surface, material, name: surfaceName, label: surfaceName }] });
    setSelectedStructureId(surface.id);
    selectObject(surface.id);
    onActiveObjectChange(surface.id);
    setOutdoorSurfaceDraft(null);
    onDrawToolChange("select");
    setStructureMessage(`已创建${surface.surfaceType === "hardscape" ? "硬地" : surface.surfaceType === "path" ? "小路" : "绿化"}区域，面积 ${(surface.area / 1_000_000).toFixed(2)} m2`);
  }

  function cancelOutdoorSurfaceDraft() {
    setOutdoorSurfaceDraft(null);
    setOutdoorRectDraft(null);
    setStructureMessage("");
  }

  function deleteSelectedObject() {
    const selectedFurnitureObject = furniture.find((item) => item.id === interactionState.selectedObjectId);
    if (!selectedStructureId && selectedFurnitureObject) {
      if (!canSelectFurnitureLayer()) {
        setStructureMessage(`${planCanvasModeLabels[sheetMode]}不编辑家具对象。`);
        return;
      }
      if (objectIsLocked(selectedFurnitureObject.id) || selectedFurnitureObject.locked) {
        setStructureMessage("家具已锁定，先解锁后才能删除。");
        return;
      }
      onFurnitureChange(furniture.filter((item) => item.id !== selectedFurnitureObject.id));
      setInteractionState((currentState) => ({ ...currentState, selectedObjectId: "", editingObjectId: "" }));
      onActiveObjectChange("");
      setStructureMessage(`已删除家具对象 ${selectedFurnitureObject.id}。`);
      return;
    }

    deleteSelectedStructureObject();
  }

  function deleteSelectedStructureObject() {
    if (!selectedStructureId) return;
    if (protectedBaseYardOutdoorIds.has(selectedStructureId)) {
      setStructureMessage("南院/北院默认绿地是庭院底盘，不能删除；可以删除上面叠加的小路、硬地和花境。");
      return;
    }
    const kind = getStructureObjectKind(selectedStructureId);
    if (!kind || blockProtectedStructureEdit(kind, "删除结构")) return;
    if (objectIsLocked(selectedStructureId)) {
      setStructureMessage("对象已锁定，先解锁后才能删除。");
      return;
    }

    if (houseStructure.rooms.some((room) => room.id === selectedStructureId)) {
      setStructureMessage("房间由闭合墙体自动生成。要删除房间，请删除或调整对应墙体。");
      return;
    }

    if (houseStructure.walls.some((wall) => wall.id === selectedStructureId)) {
      const affectedRoomIds = houseStructure.rooms
        .filter((room) => room.sourceWallIds.includes(selectedStructureId))
        .map((room) => room.id);
      updateHouseStructure({
        ...houseStructure,
        walls: houseStructure.walls.filter((wall) => wall.id !== selectedStructureId),
        rooms: houseStructure.rooms.map((room) => room.sourceWallIds.includes(selectedStructureId)
          ? { ...room, sourceWallIds: room.sourceWallIds.filter((wallId) => wallId !== selectedStructureId) }
          : room),
        doors: houseStructure.doors.filter((door) => door.hostType !== "wall" || door.hostId !== selectedStructureId),
        windows: houseStructure.windows.filter((windowObject) => windowObject.hostType !== "wall" || windowObject.hostId !== selectedStructureId),
        bayWindows: houseStructure.bayWindows.filter((bayWindow) => bayWindow.wallId !== selectedStructureId)
      });
      setStructureMessage(`已删除墙体，并同步处理门窗与 ${affectedRoomIds.length} 个房间的 sourceWallIds。`);
      setSelectedStructureId("");
      onActiveObjectChange("");
      return;
    }

    if (houseStructure.partitions.some((partition) => partition.id === selectedStructureId)) {
      onHouseStructureChange({
        ...houseStructure,
        partitions: houseStructure.partitions.filter((partition) => partition.id !== selectedStructureId),
        doors: houseStructure.doors.filter((door) => door.hostType !== "partition" || door.hostId !== selectedStructureId),
        windows: houseStructure.windows.filter((windowObject) => windowObject.hostType !== "partition" || windowObject.hostId !== selectedStructureId)
      });
      setStructureMessage("已删除隔断，并同步移除依附在隔断上的门窗。");
      setSelectedStructureId("");
      onActiveObjectChange("");
      return;
    }

    if (houseStructure.stairs.some((stair) => stair.id === selectedStructureId)) {
      onHouseStructureChange({
        ...houseStructure,
        stairs: houseStructure.stairs.filter((stair) => stair.id !== selectedStructureId)
      });
      setStructureMessage("已删除楼梯。");
      setSelectedStructureId("");
      onActiveObjectChange("");
      return;
    }

    if ((houseStructure.columns ?? []).some((column) => column.id === selectedStructureId)) {
      onHouseStructureChange({
        ...houseStructure,
        columns: (houseStructure.columns ?? []).filter((column) => column.id !== selectedStructureId)
      });
      setStructureMessage("已删除立柱。");
      setSelectedStructureId("");
      onActiveObjectChange("");
      return;
    }

    if (houseStructure.fences.some((fence) => fence.id === selectedStructureId)) {
      onHouseStructureChange({
        ...houseStructure,
        fences: houseStructure.fences.filter((fence) => fence.id !== selectedStructureId)
      });
      setStructureMessage("已删除篱笆。");
      setSelectedStructureId("");
      onActiveObjectChange("");
      return;
    }

    if (houseStructure.outdoorSurfaces.some((surface) => surface.id === selectedStructureId)) {
      onHouseStructureChange({
        ...houseStructure,
        outdoorSurfaces: houseStructure.outdoorSurfaces.filter((surface) => surface.id !== selectedStructureId)
      });
      setStructureMessage("已删除户外区域。");
      setSelectedStructureId("");
      onActiveObjectChange("");
      return;
    }

    const deletingSpace = [...houseStructure.rooms, ...houseStructure.outdoors].find((space) => space.id === selectedStructureId);
    if (deletingSpace) {
      const furnitureDependencies = furniture.filter((item) => item.roomId === selectedStructureId).map((item) => item.id);
      const semanticDependencies = semanticObjects.filter((item) => JSON.stringify(item.details).includes(`"${selectedStructureId}"`)).map((item) => item.id);
      const noteDependencies = furniture.filter((item) => JSON.stringify({ note: item.note, constructionNote: item.constructionNote, constructionMeta: item.constructionMeta, mepMeta: item.mepMeta }).includes(selectedStructureId)).map((item) => item.id);
      if (furnitureDependencies.length || semanticDependencies.length || noteDependencies.length) {
        setStructureMessage(`不能删除 ${selectedStructureId}：家具 ${furnitureDependencies.join("、") || "无"}；语义对象 ${semanticDependencies.join("、") || "无"}；施工/机电备注 ${noteDependencies.join("、") || "无"} 仍在引用。`);
        return;
      }
    }

    onHouseStructureChange({
      ...houseStructure,
      doors: houseStructure.doors.filter((door) => door.id !== selectedStructureId),
      windows: houseStructure.windows.filter((windowObject) => windowObject.id !== selectedStructureId),
      bayWindows: houseStructure.bayWindows.filter((bayWindow) => bayWindow.id !== selectedStructureId),
      skylights: houseStructure.skylights.filter((skylight) => skylight.id !== selectedStructureId),
      outdoors: houseStructure.outdoors.filter((outdoor) => outdoor.id !== selectedStructureId)
    });
    setStructureMessage("已删除选中的结构对象。");
    setSelectedStructureId("");
    onActiveObjectChange("");
  }

  function getHostLine(hostId: string, hostType: "wall" | "partition") {
    if (hostType === "partition") {
      const partition = houseStructure.partitions.find((item) => item.id === hostId);
      return partition ? { start: partition.start, end: partition.end, thickness: partition.thickness } : null;
    }
    const wall = houseStructure.walls.find((item) => item.id === hostId);
    if (!wall || wall.kind !== "straight") return null;
    return { start: wall.start, end: wall.end, thickness: wall.thickness };
  }

  function getSegmentOnLine(start: MmPoint, end: MmPoint, centerRatio: number, width: number) {
    const length = Math.max(1, getLineLength(start, end));
    const ux = (end.x - start.x) / length;
    const uy = (end.y - start.y) / length;
    const center = { x: start.x + (end.x - start.x) * centerRatio, y: start.y + (end.y - start.y) * centerRatio };
    return {
      start: { x: center.x - ux * width * 0.5, y: center.y - uy * width * 0.5 },
      end: { x: center.x + ux * width * 0.5, y: center.y + uy * width * 0.5 },
      center,
      normal: { x: -uy, y: ux }
    };
  }

  function getStairGeometry(stair: HouseStructure["stairs"][number]) {
    const fullLength = Math.max(1, getLineLength(stair.start, stair.end));
    const fullUx = (stair.end.x - stair.start.x) / fullLength;
    const fullUy = (stair.end.y - stair.start.y) / fullLength;
    const landingDepth = constructionExportWorkspace.stairLandings.find((landing) => landing.id === stair.landingId)?.depth ?? 0;
    const runInset = Math.min(Math.max(0, landingDepth), fullLength * 0.42);
    const renderEnd = { x: stair.end.x - fullUx * runInset, y: stair.end.y - fullUy * runInset };
    const length = Math.max(1, getLineLength(stair.start, renderEnd));
    const ux = (renderEnd.x - stair.start.x) / length;
    const uy = (renderEnd.y - stair.start.y) / length;
    const normal = { x: -uy, y: ux };
    const steps = Array.from({ length: Math.max(2, stair.stepCount) }, (_, index) => {
      const ratio = (index + 1) / (Math.max(2, stair.stepCount) + 1);
      const center = {
        x: stair.start.x + (renderEnd.x - stair.start.x) * ratio,
        y: stair.start.y + (renderEnd.y - stair.start.y) * ratio
      };
      return {
        start: { x: center.x - normal.x * stair.width * 0.42, y: center.y - normal.y * stair.width * 0.42 },
        end: { x: center.x + normal.x * stair.width * 0.42, y: center.y + normal.y * stair.width * 0.42 }
      };
    });
    return { length, ux, uy, normal, steps, renderStart: stair.start, renderEnd };
  }

  function getStairLandingConnections(stairs: HouseStructure["stairs"]) {
    const stairIds = new Set(stairs.map((stair) => stair.id));
    return constructionExportWorkspace.stairSystems.flatMap((system) => {
      if (!stairIds.has(system.lowerFlightId) && !stairIds.has(system.upperFlightId)) return [];
      const landing = constructionExportWorkspace.stairLandings.find((candidate) => candidate.id === system.landingId);
      if (!landing) return [];
      const xs = landing.polygon.map((point) => point.x);
      const ys = landing.polygon.map((point) => point.y);
      const currentIsLower = floor.id === system.lowerFloorId;
      return [{
        id: landing.id,
        fromId: system.lowerFlightId,
        toId: system.upperFlightId,
        start: landing.centerLine.start,
        end: landing.centerLine.end,
        width: landing.width,
        length: getLineLength(landing.centerLine.start, landing.centerLine.end),
        elevationLabel: currentIsLower ? "+1.40m" : "-1.40m",
        bounds: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
      }];
    });
  }

  function getDownStairLabel() {
    if (floor.id === "1F") return "下 B1";
    if (floor.id === "B1") return "下 B2";
    return "";
  }

  function isTwoFloorArrivalStair(stair: HouseStructure["stairs"][number]) {
    return false;
  }

  function getStairMovementLabel(stair: HouseStructure["stairs"][number]) {
    if (stair.connectedToFloorId) return `${stair.direction === "down" ? "下至" : "上至"} ${stair.connectedToFloorId}`;
    if (stair.direction === "down") return getDownStairLabel();
    return "上行";
  }

  function getStairDirectionDetail(stair: HouseStructure["stairs"][number]) {
    return stair.connectedToFloorId ? `${stair.direction === "up" ? "上行" : "下行"}至 ${stair.connectedToFloorId}` : stair.direction === "up" ? "上行" : "下行";
  }

  function getArcPath(wall: Extract<HouseWall, { kind: "arc" }>) {
    const startAngle = (wall.startAngle * Math.PI) / 180;
    const endAngle = (wall.endAngle * Math.PI) / 180;
    const start = { x: wall.center.x + Math.cos(startAngle) * wall.radius, y: wall.center.y + Math.sin(startAngle) * wall.radius };
    const end = { x: wall.center.x + Math.cos(endAngle) * wall.radius, y: wall.center.y + Math.sin(endAngle) * wall.radius };
    const angleDelta = Math.abs(wall.endAngle - wall.startAngle);
    const largeArc = angleDelta > 180 ? 1 : 0;
    const sweep = wall.direction === "clockwise" ? 1 : 0;
    return `M ${start.x} ${start.y} A ${wall.radius} ${wall.radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
  }

  function getWallLabelPoint(wall: HouseWall) {
    if (wall.kind === "straight") {
      return {
        x: (wall.start.x + wall.end.x) / 2,
        y: (wall.start.y + wall.end.y) / 2
      };
    }
    const middleAngle = ((wall.startAngle + wall.endAngle) / 2 * Math.PI) / 180;
    return {
      x: wall.center.x + Math.cos(middleAngle) * wall.radius,
      y: wall.center.y + Math.sin(middleAngle) * wall.radius
    };
  }

  function selectStructureObject(objectId: string, message?: string) {
    const kind = getStructureObjectKind(objectId);
    if (!kind || !canSelectStructureLayer(kind)) {
      setStructureMessage(`${planCanvasModeLabels[sheetMode]}不选择此对象。`);
      return;
    }
    setSelectedStructureId(objectId);
    selectObject(objectId);
    onActiveObjectChange(objectId);
    if (sheetMode === "structureSyncCheck" && houseStructure.walls.some((wall) => wall.id === objectId)) {
      setSelectedSyncWallId(objectId);
      if (syncPaintRuleId) {
        applyWallSyncOverride(objectId, syncPaintRuleId);
        return;
      }
    }
    if (message) setStructureMessage(message);
  }

  function shouldIgnoreStructureSelection(kind: StructureInteractionKind) {
    if (!canSelectStructureLayer(kind)) return true;
    return plannerMode === "edit" && drawTool !== "select";
  }

  function toggleSelectedLock() {
    const objectId = interactionState.selectedObjectId || selectedStructureId || selectedFurnitureId;
    if (!objectId) return;
    setInteractionState((currentState) => toggleLock(currentState, objectId));
    setStructureMessage(objectIsLocked(objectId) ? "对象已解锁。" : "对象已锁定，不能拖拽、删除或调整。");
  }

  function splitSelectedWall() {
    if (!selectedStructureId) return;
    if (blockProtectedStructureEdit("wall", "分割墙体")) return;
    const nextStructure = splitWall(houseStructure, interactionState, selectedStructureId);
    onHouseStructureChange(nextStructure);
    setSelectedStructureId("");
    setInteractionState((currentState) => ({ ...currentState, selectedObjectId: "", editingObjectId: "" }));
    setStructureMessage("已尝试在中点分割墙体。");
  }

  function resizeSelectedWallLength(nextLengthValue: number) {
    const targetWall = houseStructure.walls.find((wall) => wall.id === selectedStructureId);
    if (!targetWall) return;
    if (blockProtectedStructureEdit("wall", "修改墙长")) return;
    if (objectIsLocked(targetWall.id)) {
      setStructureMessage("墙体已锁定，先解锁再修改长度。");
      return;
    }
    const nextLength = Math.max(100, Math.round(nextLengthValue) || targetWall.length);
    onWallLengthChange?.(targetWall.id, nextLength);
    setStructureMessage(`已提交 ${targetWall.name} 长度 ${nextLength} mm，并交给结构检查器校准。`);
  }

  function mergeSelectedWall() {
    if (!selectedStructureId) return;
    if (blockProtectedStructureEdit("wall", "合并墙体")) return;
    const nextStructure = mergeWall(houseStructure, interactionState, selectedStructureId);
    onHouseStructureChange(nextStructure);
    setSelectedStructureId("");
    setInteractionState((currentState) => ({ ...currentState, selectedObjectId: "", editingObjectId: "" }));
    setStructureMessage("已尝试与相邻同向墙体合并。");
  }

  function rotateSelectedDoor() {
    if (!selectedStructureId) return;
    if (blockProtectedStructureEdit("opening", "门窗调整")) return;
    onHouseStructureChange(rotateDoor(houseStructure, interactionState, selectedStructureId));
    setStructureMessage("已切换门的开启方向。");
  }

  function resizeSelectedWindow(deltaWidth: number) {
    if (!selectedStructureId) return;
    if (blockProtectedStructureEdit("opening", "门窗调整")) return;
    const windowObject = houseStructure.windows.find((item) => item.id === selectedStructureId);
    const bayWindow = houseStructure.bayWindows.find((item) => item.id === selectedStructureId);
    if (bayWindow) {
      onHouseStructureChange({
        ...houseStructure,
        bayWindows: houseStructure.bayWindows.map((item) => item.id === selectedStructureId ? { ...item, width: Math.max(400, item.width + deltaWidth) } : item)
      });
      setStructureMessage("已调整飘窗宽度。");
      return;
    }
    if (!windowObject) return;
    commitInteractionModel(handleResize(
      { houseStructure, furniture },
      interactionState,
      selectedStructureId,
      { kind: "window-width", width: Math.max(400, windowObject.width + deltaWidth) }
    ));
    setStructureMessage("已调整窗宽。");
  }

  function resizeSelectedStair(deltaLength: number) {
    if (blockProtectedStructureEdit("stair", "楼梯调整")) return;
    if (!selectedStair || objectIsLocked(selectedStair.id)) return;

    const currentLength = Math.max(1, getLineLength(selectedStair.start, selectedStair.end));
    const nextLength = Math.max(600, currentLength + deltaLength);
    const ux = (selectedStair.end.x - selectedStair.start.x) / currentLength;
    const uy = (selectedStair.end.y - selectedStair.start.y) / currentLength;
    const nextEnd = {
      x: Math.round(selectedStair.start.x + ux * nextLength),
      y: Math.round(selectedStair.start.y + uy * nextLength)
    };

    onHouseStructureChange({
      ...houseStructure,
      stairs: houseStructure.stairs.map((stair) => stair.id === selectedStair.id
        ? { ...stair, end: nextEnd }
        : stair)
    });
    setStructureMessage(`已调整楼梯长度为 ${nextLength} mm。`);
  }

  function rotateSelectedFurniture() {
    const objectId = interactionState.selectedObjectId || selectedFurnitureId;
    if (!canSelectFurnitureLayer()) {
      setStructureMessage(`${planCanvasModeLabels[sheetMode]}不编辑家具对象。`);
      return;
    }
    if (!furniture.some((item) => item.id === objectId)) return;
    onFurnitureChange(rotateFurniture(furniture, interactionState, objectId, 15));
  }

  function selectRegistryObject(row: StructureObjectRow) {
    if (row.kind === "furniture") {
      if (!canSelectFurnitureLayer()) {
        setStructureMessage(`${planCanvasModeLabels[sheetMode]}不选择家具对象。`);
        return;
      }
      const item = furniture.find((furnitureObject) => furnitureObject.id === row.id);
      if (!item) return;
      setSelectedStructureId("");
      selectObject(item.id);
      onSelectFurniture(item);
      onActiveObjectChange(item.id);
      setStructureMessage(`${item.name} · ${item.id}`);
      return;
    }
    selectStructureObject(row.id, `${row.name} · ${row.detail}`);
  }

  function renderDragHandle(objectId: string, pointKey: "start" | "end", point: MmPoint) {
    const kind = getStructureObjectKind(objectId);
    if (!kind || plannerMode !== "edit" || drawTool !== "select" || objectIsLocked(objectId) || !canMutateStructureLayer(kind)) return null;
    return (
      <circle
        key={`${objectId}-${pointKey}`}
        cx={point.x}
        cy={point.y}
        r={95}
        className="cursor-grab fill-white stroke-blue-500"
        strokeWidth={28}
        onPointerDown={(event) => {
          event.stopPropagation();
          if (blockProtectedStructureEdit(kind, "端点调整")) return;
          structureDragRef.current = { pointerId: event.pointerId, objectId, pointKey, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
          setSelectedStructureId(objectId);
          selectObject(objectId);
          onActiveObjectChange(objectId);
        }}
      />
    );
  }

  const selectedStructureObject = getSelectedStructureObject();
  const selectedStructureKind = selectedStructureId ? getStructureObjectKind(selectedStructureId) : null;
  const selectedInteractionFurniture = furniture.find((item) => item.id === interactionState.selectedObjectId) ?? null;
  const activeFurnitureObject = furniture.find((item) => item.id === activeFurnitureId) ?? null;
  const activeFurnitureLocked = activeFurnitureObject ? objectIsLocked(activeFurnitureObject.id) || activeFurnitureObject.locked : false;
  const selectedInteractionObjectId = interactionState.selectedObjectId || selectedStructureId;
  const canDeleteSelectedStructure = Boolean(selectedStructureObject && selectedStructureKind && canMutateStructureLayer(selectedStructureKind) && !protectedBaseYardOutdoorIds.has(selectedStructureObject.id) && !houseStructure.rooms.some((room) => room.id === selectedStructureObject.id) && !objectIsLocked(selectedStructureObject.id));
  const canDeleteSelectedFurniture = Boolean(selectedInteractionFurniture && canSelectFurnitureLayer() && !selectedInteractionFurniture.locked && !objectIsLocked(selectedInteractionFurniture.id));
  const canDeleteSelectedObject = canDeleteSelectedStructure || canDeleteSelectedFurniture;
  const selectedWall = houseStructure.walls.find((wall) => wall.id === selectedStructureId);
  const selectedStair = houseStructure.stairs.find((stair) => stair.id === selectedStructureId);
  const selectedDoor = houseStructure.doors.find((door) => door.id === selectedStructureId);
  const selectedWindow = houseStructure.windows.find((windowObject) => windowObject.id === selectedStructureId);
  const selectedBayWindow = houseStructure.bayWindows.find((bayWindow) => bayWindow.id === selectedStructureId);
  const structureObjectRows = useMemo<StructureObjectRow[]>(() => {
    const rows: StructureObjectRow[] = [];
    houseStructure.walls.forEach((wall) => {
      rows.push({
        id: wall.id,
        kind: "wall",
        label: wall.kind === "arc" ? "弧墙" : "墙",
        name: wall.name,
        detail: wall.kind === "arc" ? `${wall.length} mm · 半径 ${wall.radius} mm` : `${wall.length} mm · 厚 ${wall.thickness} mm`
      });
    });
    houseStructure.partitions.forEach((partition) => {
      rows.push({
        id: partition.id,
        kind: "partition",
        label: "隔断",
        name: partition.name,
        detail: `${getLineLength(partition.start, partition.end)} mm · ${partition.material}`
      });
    });
    houseStructure.stairs.forEach((stair) => {
      rows.push({
        id: stair.id,
        kind: "stair",
        label: "楼梯",
        name: stair.name,
        detail: `${getLineLength(stair.start, stair.end)} x ${stair.width} mm · ${stair.stepCount} 踏 · ${getStairDirectionDetail(stair)}`
      });
    });
    (houseStructure.columns ?? []).forEach((column) => {
      rows.push({
        id: column.id,
        kind: "column",
        label: "立柱",
        name: column.name,
        detail: `Φ${column.radius * 2} x ${column.height} mm${column.supportsFloorId ? ` · 支撑${column.supportsFloorId}` : ""}`
      });
    });
    houseStructure.fences.forEach((fence) => {
      rows.push({
        id: fence.id,
        kind: "fence",
        label: "篱笆",
        name: fence.name,
        detail: `${getLineLength(fence.start, fence.end)} mm · 高 ${fence.height} mm · ${fence.material}`
      });
    });
    houseStructure.outdoorSurfaces.forEach((surface) => {
      rows.push({
        id: surface.id,
        kind: "outdoorSurface",
        label: surface.surfaceType === "hardscape" ? "硬地" : surface.surfaceType === "path" ? "小路" : "绿化",
        name: surface.name,
        detail: `${(surface.area / 1_000_000).toFixed(2)} m2 · ${surface.material}`
      });
    });
    houseStructure.doors.forEach((door) => {
      rows.push({
        id: door.id,
        kind: "door",
        label: "门",
        name: door.name,
        detail: `${door.width} x ${door.height} mm · 挂 ${door.hostId}`
      });
    });
    houseStructure.windows.forEach((windowObject) => {
      rows.push({
        id: windowObject.id,
        kind: "window",
        label: "窗",
        name: windowObject.name,
        detail: `${windowObject.width} x ${windowObject.height} mm · 挂 ${windowObject.hostId}`
      });
    });
    houseStructure.bayWindows.forEach((bayWindow) => {
      rows.push({
        id: bayWindow.id,
        kind: "bayWindow",
        label: "飘窗",
        name: bayWindow.name,
        detail: `${bayWindow.width} x ${bayWindow.depth} x ${bayWindow.height} mm · 挂 ${bayWindow.wallId}`
      });
    });
    houseStructure.skylights.forEach((skylight) => {
      const operationLabel = skylight.operation === "electricOperable" ? "电动可活动" : skylight.openable ? "可开启" : "固定";
      rows.push({
        id: skylight.id,
        kind: "skylight",
        label: "天窗",
        name: skylight.name,
        detail: `${operationLabel} · ${skylight.width} x ${skylight.depth} mm · 高 ${skylight.height} mm`
      });
    });
    houseStructure.rooms.forEach((room) => {
      rows.push({
        id: room.id,
        kind: "room",
        label: "房间",
        name: `${room.roomNumber} · ${room.name}`,
        detail: `${(room.area / 1_000_000).toFixed(2)} m2 · ${room.boundary.length} 个边界点`
      });
    });
    houseStructure.outdoors.forEach((outdoor) => {
      rows.push({
        id: outdoor.id,
        kind: "outdoor",
        label: "院子",
        name: outdoor.name,
        detail: `${(outdoor.area / 1_000_000).toFixed(2)} m2 · ${outdoor.polygon.length} 个边界点`
      });
    });
    furniture.forEach((item) => {
      rows.push({
        id: item.id,
        kind: "furniture",
        label: item.moduleCategory ? "硬装" : "家具",
        name: item.name,
        detail: `${item.dimensions.width} x ${item.dimensions.depth} x ${item.dimensions.height} cm · ${item.moduleCategory ?? item.roomId}`
      });
    });
    if (!yardImmersiveMode) return rows;
    const focusedLabel = yardFocus === "north" ? "北院" : "南院";
    return rows.filter((row) => (
      (row.kind === "outdoor" || row.kind === "outdoorSurface" || row.kind === "fence") &&
      (row.id.includes(`-${yardToken}-`) || row.name.includes(focusedLabel))
    ));
  }, [floor.id, houseStructure, furniture, yardFocus, yardImmersiveMode, yardToken]);
  const structureLabels = useMemo(() => {
    const labels: ObjectLabel[] = [];

    houseStructure.walls.forEach((wall) => {
      labels.push({ id: wall.id, name: wall.name, type: wall.kind === "arc" ? "Arc Wall" : "Wall", ...getWallLabelPoint(wall) });
    });
    houseStructure.partitions.forEach((partition) => {
      labels.push({
        id: partition.id,
        name: partition.name,
        type: "Partition",
        x: (partition.start.x + partition.end.x) / 2,
        y: (partition.start.y + partition.end.y) / 2
      });
    });
    houseStructure.stairs.forEach((stair) => {
      labels.push({
        id: stair.id,
        name: stair.name,
        type: "Stair",
        x: (stair.start.x + stair.end.x) / 2,
        y: (stair.start.y + stair.end.y) / 2
      });
    });
    (houseStructure.columns ?? []).forEach((column) => {
      labels.push({
        id: column.id,
        name: column.name,
        type: "Column",
        x: column.center.x,
        y: column.center.y
      });
    });
    houseStructure.fences.forEach((fence) => {
      labels.push({
        id: fence.id,
        name: fence.name,
        type: "Fence",
        x: (fence.start.x + fence.end.x) / 2,
        y: (fence.start.y + fence.end.y) / 2
      });
    });
    houseStructure.outdoorSurfaces.forEach((surface) => {
      const x = surface.polygon.reduce((sum, point) => sum + point.x, 0) / Math.max(1, surface.polygon.length);
      const y = surface.polygon.reduce((sum, point) => sum + point.y, 0) / Math.max(1, surface.polygon.length);
      labels.push({
        id: surface.id,
        name: surface.name,
        type: surface.surfaceType === "hardscape" ? "Hardscape" : surface.surfaceType === "path" ? "Path" : "Planting",
        x,
        y
      });
    });
    houseStructure.rooms.forEach((room) => {
      const x = room.boundary.reduce((sum, point) => sum + point.x, 0) / Math.max(1, room.boundary.length);
      const y = room.boundary.reduce((sum, point) => sum + point.y, 0) / Math.max(1, room.boundary.length);
      labels.push({ id: room.id, name: `${room.roomNumber} · ${room.name}`, type: "Room", x, y });
    });
    houseStructure.outdoors.forEach((outdoor) => {
      const x = outdoor.polygon.reduce((sum, point) => sum + point.x, 0) / Math.max(1, outdoor.polygon.length);
      const y = outdoor.polygon.reduce((sum, point) => sum + point.y, 0) / Math.max(1, outdoor.polygon.length);
      labels.push({ id: outdoor.id, name: outdoor.name, type: "Outdoor", x, y });
    });
    houseStructure.doors.forEach((door) => {
      const host = getHostLine(door.hostId, door.hostType);
      if (!host) return;
      const segment = getSegmentOnLine(host.start, host.end, door.positionOnWall, door.width);
      labels.push({ id: door.id, name: door.name, type: "Door", x: segment.center.x, y: segment.center.y });
    });
    houseStructure.windows.forEach((windowObject) => {
      const host = getHostLine(windowObject.hostId, windowObject.hostType);
      if (!host) return;
      const segment = getSegmentOnLine(host.start, host.end, windowObject.positionOnWall, windowObject.width);
      labels.push({ id: windowObject.id, name: windowObject.name, type: "Window", x: segment.center.x, y: segment.center.y });
    });
    houseStructure.bayWindows.forEach((bayWindow) => {
      const host = getHostLine(bayWindow.wallId, "wall");
      if (!host) return;
      const segment = getSegmentOnLine(host.start, host.end, bayWindow.positionOnWall, bayWindow.width);
      labels.push({
        id: bayWindow.id,
        name: bayWindow.name,
        type: "Bay Window",
        x: segment.center.x + segment.normal.x * bayWindow.depth,
        y: segment.center.y + segment.normal.y * bayWindow.depth
      });
    });
    houseStructure.skylights.forEach((skylight) => {
      labels.push({
        id: skylight.id,
        name: skylight.name,
        type: "Skylight",
        x: skylight.center.x,
        y: skylight.center.y
      });
    });

    return avoidLabelOverlap(labels, planBounds);
  }, [houseStructure, planBounds]);
  const filteredStructureLabels = useMemo(() => structureLabels.filter((label) => {
    if (labelFilter === "all") return true;
    if (labelFilter === "walls") return label.type === "Wall" || label.type === "Arc Wall" || label.type === "Partition" || label.type === "Stair" || label.type === "Column" || label.type === "Fence";
    if (labelFilter === "openings") return label.type === "Door" || label.type === "Window" || label.type === "Bay Window" || label.type === "Skylight";
    if (labelFilter === "rooms") return label.type === "Room" || label.type === "Outdoor";
    if (labelFilter === "outdoor") return label.type === "Outdoor" || label.type === "Fence" || label.type === "Hardscape" || label.type === "Path" || label.type === "Planting";
    return false;
  }), [labelFilter, structureLabels]);
  const arcDrawPreview = useMemo(() => {
    if (!drawPreview || drawTool !== "wall-arc" || getDistance(drawPreview.start, drawPreview.end) <= 120) return null;
    const wall = createArcWallFromEndpoints("AW-PREVIEW", floor.id, drawPreview.start, drawPreview.end, arcSweepAngle, arcDirection);
    return wall.kind === "arc" ? wall : null;
  }, [arcDirection, arcSweepAngle, drawPreview, drawTool, floor.id]);
  const furnitureLabelOffsets = useMemo(() => {
    const placed: Array<{ x: number; y: number }> = [];
    return new Map(furniture.map((item) => {
      let offset = 0;
      while (placed.some((point) => Math.abs(point.x - item.position.x) < 13 && Math.abs(point.y - (item.position.y + offset)) < 7) && offset > -28) {
        offset -= 7;
      }
      placed.push({ x: item.position.x, y: item.position.y + offset });
      return [item.id, offset] as const;
    }));
  }, [furniture]);
  const drawToolLabels: Record<DrawTool, string> = {
    select: "选择",
    "wall-straight": "直墙",
    "wall-arc": "弧墙",
    partition: "隔断",
    stair: "楼梯",
    column: "立柱",
    fence: "篱笆",
    hardscape: "铺硬地",
    "hardscape-rect": "矩形平台",
    path: "小路路径",
    planting: "铺绿化",
    door: "门",
    window: "窗",
    "bay-window": "飘窗",
    skylight: "天窗",
    outdoor: "院子"
  };
  const drawToolHints: Record<DrawTool, string> = {
    select: "选择、拖动、编辑对象",
    "wall-straight": "点起点，再点终点",
    "wall-arc": "点起点，再点终点",
    partition: "点起点，再点终点",
    stair: "点起点，再点终点",
    column: "点击放置圆柱",
    fence: "点起点，再点终点",
    hardscape: "点边界铺任意形状",
    "hardscape-rect": "两点生成平台",
    path: "点中心线自动成路",
    planting: "草坪或花境",
    door: "点击墙或隔断",
    window: "点击结构墙",
    "bay-window": "点击结构墙",
    skylight: "点击放置天窗",
    outdoor: "连续点边界"
  };
  const drawToolSections: Array<{ title: string; tools: DrawTool[] }> = [
    { title: "结构主体", tools: ["select", "wall-straight", "wall-arc", "partition", "stair", "column"] },
    { title: "洞口", tools: ["door", "window", "bay-window", "skylight"] },
    { title: "院子", tools: ["outdoor", "fence", "path", "hardscape-rect", "hardscape", "planting"] }
  ];
  const visibleDrawToolSections = yardImmersiveMode
    ? [
      { title: "庭院边界", tools: ["select", "outdoor", "fence"] as DrawTool[] },
      { title: "庭院铺装", tools: ["path", "hardscape-rect", "hardscape", "planting"] as DrawTool[] }
    ]
    : drawToolSections;

  function getOutdoorSurfaceTone(surface: HouseStructure["outdoorSurfaces"][number]) {
    if (surface.material === "wood") return { fill: "#c98f63", stroke: "#8b5e34", pattern: "url(#woodDeckPattern)" };
    if (surface.material === "concrete") return { fill: "#d1d5db", stroke: "#64748b", pattern: "url(#concretePattern)" };
    if (surface.material === "slate" || surface.material === "stone" || surface.material === "tile") return { fill: "#b8b2aa", stroke: "#6b7280", pattern: "url(#stonePaverPattern)" };
    if (surface.material === "pebble" || surface.material === "gravel") return { fill: "#d9c5a6", stroke: "#a16207", pattern: "url(#pebblePattern)" };
    if (surface.material === "shrub") return { fill: "#79b86d", stroke: "#15803d", pattern: "url(#plantingPattern)" };
    return { fill: "#8fcf7a", stroke: "#16a34a", pattern: "url(#grassPattern)" };
  }

  function getOutdoorMaterialForTool(tool: OutdoorSurfaceDrawTool): OutdoorSurfaceMaterial {
    if (outdoorSurfaceMaterialOptions.some((option) => option.tool === tool && option.material === outdoorSurfaceMaterial)) return outdoorSurfaceMaterial;
    if (tool === "path") return "pebble";
    if (tool === "hardscape") return "stone";
    return "grass";
  }

  function getDrawToolMessage(tool: DrawTool) {
    if (tool === "wall-straight") return "点击墙体端点或空白点作为起点，移动鼠标预览，再点击终点完成连接。";
    if (tool === "wall-arc") return "点击弧墙起点，移动鼠标预览，再点击终点完成连接。可先设置弧度角度。";
    if (tool === "partition") return "点击隔断起点，移动鼠标预览，再点击终点完成连接。";
    if (tool === "stair") return "点击楼梯起点，移动鼠标预览，再点击终点完成楼梯方向。";
    if (tool === "column") return "点击画布放置圆柱形结构立柱，选中后可调整半径和高度。";
    if (tool === "fence") return "点击篱笆起点，移动鼠标预览，再点击终点完成连接。";
    if (tool === "outdoor") return "点击画布添加院子边界点。";
    if (tool === "path") return "点击小路中心线，系统会按宽度自动生成鹅卵石/石板小路。";
    if (tool === "hardscape-rect") return "点击平台第一个角点，再点击对角点，自动生成矩形平台。";
    if (tool === "hardscape" || tool === "planting") return "点击画布添加区域边界点，至少 3 个点后完成。";
    if (tool === "door" || tool === "window" || tool === "bay-window") return "点击靠近墙体的位置，系统会自动吸附。";
    if (tool === "skylight") return "点击楼板/屋面位置放置天窗，放好后可选中调整尺寸。";
    return "";
  }

  function selectDrawTool(tool: DrawTool) {
    onDrawToolChange(tool);
    setOutdoorSurfaceDraft(null);
    setOutdoorRectDraft(null);
    if (tool === "path") setOutdoorSurfaceMaterial("pebble");
    if ((tool === "hardscape" || tool === "hardscape-rect") && !outdoorSurfaceMaterialOptions.some((option) => option.tool === "hardscape" && option.material === outdoorSurfaceMaterial)) setOutdoorSurfaceMaterial("stone");
    if (tool === "planting" && !outdoorSurfaceMaterialOptions.some((option) => option.tool === "planting" && option.material === outdoorSurfaceMaterial)) setOutdoorSurfaceMaterial("grass");
    const kind = getDrawToolStructureKind(tool);
    if (kind && !canMutateStructureLayer(kind)) {
      if (kind === "wall") {
        setStructureMessage(`${drawToolLabels[tool]}已保护。只有${wallEditableSheetTypeLabel}可以动墙。`);
        return;
      }
      setStructureMessage(`${drawToolLabels[tool]}已保护。请切到结构图或拆改施工图再使用。`);
      return;
    }
    setStructureMessage(getDrawToolMessage(tool));
  }

  function updateVisualSettings(nextSettings: Partial<FloorPlanVisualSettings>) {
    onFloorPlanVisualSettingsChange({ ...floorPlanVisualSettings, ...nextSettings });
  }

  function updateLayerVisibility(layer: keyof FloorPlanVisualSettings["layerVisibility"], visible: boolean) {
    updateVisualSettings({
      layerVisibility: {
        ...floorPlanVisualSettings.layerVisibility,
        [layer]: visible
      }
    });
  }

  function applyPreset(preset: FloorPlanPreset) {
    onFloorPlanVisualSettingsChange(applyFloorPlanPreset(preset, floorPlanVisualSettings));
  }

  function addHeuristicCleanPatches() {
    const nextPatches = createHeuristicCleanPatches(
      floor.id,
      cleanPatches.length,
      getCleanupFillColor(floorPlanVisualSettings)
    );
    onCleanPatchesChange([...cleanPatches, ...nextPatches]);
    updateVisualSettings({ removeTextMarks: true, cleanWhiteBackground: true });
  }

  function clearWhiteBorderVisually() {
    updateVisualSettings({ removeWhiteBorder: true, cleanWhiteBackground: true });
  }

  function repairToHighDefinitionPlan() {
    onCleanPatchesChange([]);
    onFloorPlanVisualSettingsChange({
      ...floorPlanVisualSettings,
      preset: "clean_gray",
      grayscale: true,
      opacity: 1,
      contrast: 1.36,
      brightness: 1.04,
      saturation: 0,
      sharpen: true,
      removeTextMarks: true,
      removeWhiteBorder: true,
      cleanWhiteBackground: true,
      lineEnhance: true,
      repairMode: false,
      layerVisibility: {
        ...floorPlanVisualSettings.layerVisibility,
        cleanupPatch: false,
        debug: false
      }
    });
    setCleanupSelection(null);
  }

  function addSelectionPatch() {
    if (!cleanupSelection || cleanupSelection.width < 0.5 || cleanupSelection.height < 0.5) return;
    const nextPatch: CleanPatch = {
      id: `CP-${floor.id}-${String(cleanPatches.length + 1).padStart(3, "0")}`,
      floorId: floor.id,
      rect: cleanupSelection,
      fillColor: getCleanupFillColor(floorPlanVisualSettings),
      notes: "手动清理选区"
    };
    onCleanPatchesChange([...cleanPatches, nextPatch]);
    setCleanupSelection(null);
  }

  function removeCleanPatch(patchId: string) {
    onCleanPatchesChange(cleanPatches.filter((patch) => patch.id !== patchId));
  }

  function undoCleanPatch() {
    onCleanPatchesChange(cleanPatches.slice(0, -1));
  }

  function clearCleanPatches() {
    onCleanPatchesChange([]);
    setCleanupSelection(null);
  }

  function handleCleanupPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!isManualCleanupMode) return;
    event.stopPropagation();
    const start = getPercentPosition(event);
    if (!start) return;
    cleanupDragRef.current = { pointerId: event.pointerId, start };
    setCleanupSelection({ x: start.x, y: start.y, width: 0, height: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCleanupPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = cleanupDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const current = getPercentPosition(event);
    if (!current) return;
    setCleanupSelection({
      x: Math.min(drag.start.x, current.x),
      y: Math.min(drag.start.y, current.y),
      width: Math.abs(current.x - drag.start.x),
      height: Math.abs(current.y - drag.start.y)
    });
  }

  function handleCleanupPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (cleanupDragRef.current?.pointerId === event.pointerId) {
      cleanupDragRef.current = null;
    }
  }

  function getBoundary(object: SemanticObject): Boundary {
    const details = object.details as { boundary?: Boundary };
    return Array.isArray(details.boundary) ? details.boundary : [];
  }

  function getWallLine(object: SemanticObject) {
    const details = object.details as { start?: Point; end?: Point; thickness?: number };
    if (!details.start || !details.end) return null;
    return { start: details.start, end: details.end, thickness: details.thickness ?? 2 };
  }

  function drawPoint(ctx: CanvasRenderingContext2D, position: Point, color: string) {
    const x = (position.x / 100) * 1024;
    const y = (position.y / 100) * 768;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  }

  async function exportCleanFloorPlan() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = getCleanupFillColor(floorPlanVisualSettings);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (floor.floorPlanImage) {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = floor.floorPlanImage;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("底图加载失败"));
      });
      const imageRatio = image.width / image.height;
      const canvasRatio = canvas.width / canvas.height;
      const drawWidth = imageRatio > canvasRatio ? canvas.width : canvas.height * imageRatio;
      const drawHeight = imageRatio > canvasRatio ? canvas.width / imageRatio : canvas.height;
      const drawX = (canvas.width - drawWidth) / 2;
      const drawY = (canvas.height - drawHeight) / 2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.globalAlpha = floorPlanVisualSettings.opacity;
      ctx.filter = getFloorPlanFilter(floorPlanVisualSettings);
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      ctx.globalAlpha = 1;
      ctx.filter = "none";
    }

    if (floorPlanVisualSettings.layerVisibility.cleanupPatch) {
      cleanPatches.forEach((patch) => {
        ctx.fillStyle = patch.fillColor;
        ctx.fillRect(
          (patch.rect.x / 100) * canvas.width,
          (patch.rect.y / 100) * canvas.height,
          (patch.rect.width / 100) * canvas.width,
          (patch.rect.height / 100) * canvas.height
        );
      });
    }

    if (exportOptions.overlay) {
      semanticObjects.forEach((object) => {
        const position = getSemanticObjectPosition(object);
        if (!position) return;
        drawPoint(ctx, position, object.category === "Furniture" ? "#2f7d67" : "#2563eb");
        if (exportOptions.roomNames && object.category === "Room") {
          ctx.fillStyle = "#334155";
          ctx.font = "14px sans-serif";
          ctx.fillText(object.name, (position.x / 100) * canvas.width + 10, (position.y / 100) * canvas.height - 10);
        }
      });
    }

    if (exportOptions.furniture) {
      furniture.forEach((item) => drawPoint(ctx, item.position, "#2f7d67"));
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${floor.id}-clean-floor-plan.png`;
    link.click();
  }

  function updateConstructionSheet(sheetId: string, patch: Partial<ConstructionSheet>) {
    setConstructionSheets((currentSheets) => currentSheets.map((sheet) => sheet.id === sheetId ? { ...sheet, ...patch } : sheet));
  }

  function getConstructionSheetViewType(sheet: ConstructionSheet): DrawingSheetType {
    return normalizeDrawingSheetType(sheet.viewType ?? sheet.mode ?? sheet.drawingType) ?? "sitePlan";
  }

  function getConstructionSheetTypeLabel(sheet: ConstructionSheet) {
    const drawingType = sheet.drawingType ?? normalizeDrawingSheetType(sheet.mode);
    return drawingType ? drawingSheetTypeLabels[drawingType] : "图纸目录/总说明";
  }

  function updateConstructionSpec(specId: string, patch: Partial<ConstructionSpecRow>) {
    setConstructionSpecs((currentSpecs) => currentSpecs.map((spec) => spec.id === specId ? { ...spec, ...patch } : spec));
  }

  function escapeHtml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function yesNo(value: boolean | undefined) {
    return value ? "是" : "否";
  }

  function getFurnitureDimensionsText(item: Furniture) {
    return `${item.dimensions.width} x ${item.dimensions.depth} x ${item.dimensions.height} cm`;
  }

  function joinList(items: string[] | undefined) {
    return items?.filter(Boolean).join(" / ") || "";
  }

  function getFurnitureExportRecord(item: Furniture) {
    const renderAsset = resolve3DAsset(item);
    const renderMaterials = resolveRender3DMaterials(item, renderAsset.assetType);
    const mep = item.mepMeta ?? {};
    const construction = item.constructionMeta ?? {};
    const relatedDrawingItems = drawingItems.filter((drawingItem) => drawingItem.relatedFurnitureId === item.id);
    return {
      floorId: item.floorId,
      roomId: item.roomId,
      objectId: item.id,
      code: item.code,
      name: item.name,
      type: item.moduleType ?? item.type,
      dimensions: getFurnitureDimensionsText(item),
      material: item.material || "待定",
      renderAssetType: renderAsset.assetType,
      renderStyle: renderMaterials.styleLabel,
      renderMaterials: renderMaterials.summary,
      visibleIn3d: renderAsset.visibleIn3d,
      selectableIn3d: renderAsset.selectableIn3d,
      childrenMode: renderAsset.childrenMode,
      needsSocket: Boolean(mep.needsSocket),
      socketCount: mep.socketCount ?? 0,
      socketHeight: mep.socketHeight ?? "",
      needsSwitch: Boolean(mep.needsSwitch),
      switchControl: joinList(mep.switchControl),
      needsLighting: Boolean(mep.needsLighting),
      lightingType: mep.lightingType ? lightingTypeLabels[mep.lightingType] ?? mep.lightingType : "",
      lightColorTemperature: mep.lightColorTemperature ?? "",
      needsWaterSupply: Boolean(mep.needsWaterSupply),
      waterSupplyType: mep.waterSupplyType ? waterSupplyTypeLabels[mep.waterSupplyType] ?? mep.waterSupplyType : "",
      needsDrainage: Boolean(mep.needsDrainage),
      drainageType: mep.drainageType ? drainageTypeLabels[mep.drainageType] ?? mep.drainageType : "",
      needsNetwork: Boolean(mep.needsNetwork),
      needsVentilation: Boolean(mep.needsVentilation),
      needsSmartControl: Boolean(mep.needsSmartControl),
      relatedCircuit: mep.relatedCircuit ?? "",
      mepNotes: mep.notes ?? "",
      customMade: Boolean(construction.customMade),
      installType: construction.installType ? installTypeLabels[construction.installType] ?? construction.installType : "",
      reserveSize: construction.reserveSize ?? "",
      wallDependency: construction.wallDependency ?? "",
      floorDependency: construction.floorDependency ?? "",
      ceilingDependency: construction.ceilingDependency ?? "",
      waterproofRequired: Boolean(construction.waterproofRequired),
      inspectionAccessRequired: Boolean(construction.inspectionAccessRequired),
      purchaseCategory: construction.purchaseCategory ?? "",
      supplierType: construction.supplierType ?? "",
      constructionNotes: getConstructionNote(item),
      relatedDrawingItems: relatedDrawingItems.map((drawingItem) => ({
        id: drawingItem.id, category: drawingItem.category, type: drawingItem.type, label: drawingItem.label,
        quantity: drawingItem.quantity, heightMm: drawingItem.heightMm, status: drawingItem.status, notes: drawingItem.notes
      }))
    };
  }

  function getConstructionExportData() {
    const furnitureRecords = furniture.map(getFurnitureExportRecord);
    return {
      floorId: floor.id,
      floorLabel: floor.label,
      canvasMode: sheetMode,
      drawingSheetType: normalizeDrawingSheetType(sheetMode),
      sheetMode,
      exportedAt: new Date().toISOString(),
      drawingItems: visibleDrawingItems,
      furniture: furnitureRecords,
      mep: furnitureRecords.filter((record) => record.needsSocket || record.needsSwitch || record.needsLighting || record.needsWaterSupply || record.needsDrainage || record.needsNetwork || record.needsVentilation || record.needsSmartControl),
      construction: furnitureRecords.filter((record) => record.customMade || record.installType || record.waterproofRequired || record.inspectionAccessRequired || record.wallDependency || record.floorDependency || record.ceilingDependency || record.constructionNotes),
      cameraViews: cameraViews.map((view) => ({
        id: view.id,
        floor: view.floor,
        name: view.name,
        mode: view.mode ?? "perspective",
        zoom: view.zoom ?? "",
        description: view.description ?? "",
        cameraPosition: view.cameraPosition,
        target: view.target
      }))
    };
  }

  function getConstructionPackageHtml() {
    const currentDrawingMarkup = planRef.current?.querySelector("svg")?.outerHTML ?? "";
    const exportData = getConstructionExportData();
    const activeCameraView = cameraViewRequest?.view;
    const drawingItemRows = exportData.drawingItems.map((item) => `<tr>
      <td>${escapeHtml(item.id)}</td><td>${escapeHtml(drawingItemCategoryLabels[item.category])}</td><td>${escapeHtml(item.label)}</td>
      <td>${escapeHtml(item.roomId ?? "")}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(String(item.quantity))}</td>
      <td>${escapeHtml(String(item.heightMm ?? ""))}</td><td>${escapeHtml(item.material ?? item.materialId ?? "")}</td>
      <td>${escapeHtml([item.lightingLayer ? lightingLayerLabels[item.lightingLayer] : "", item.colorTemperature ?? item.lightColorTemperature, item.beamAngle ? `${item.beamAngle}°` : "", item.mountingType ? lightMountingTypeLabels[item.mountingType] : "", item.controlGroupId ?? item.lightGroupId, item.smartControl ? "智能" : "", item.dimming ? "调光" : "", item.relatedSwitchId, item.switchControl?.join("/"), item.controlledLightIds?.join("/"), item.relatedCircuit ?? item.circuitId].filter(Boolean).join("；"))}</td>
      <td>${escapeHtml(item.relatedFurnitureId ?? item.wallId ?? "")}</td><td>${escapeHtml(drawingItemStatusLabels[item.status])}</td><td>${escapeHtml(item.notes)}</td>
    </tr>`).join("");
    const furnitureRows = exportData.furniture.map((item) => `
      <tr>
        <td>${escapeHtml(item.code)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.roomId)}</td>
        <td>${escapeHtml(item.dimensions)}</td>
        <td>${escapeHtml(item.material || "待定")}</td>
        <td>${escapeHtml(item.renderAssetType)} · ${escapeHtml(item.renderMaterials)}</td>
        <td>${escapeHtml(item.purchaseCategory || "待定")}</td>
        <td>${escapeHtml(yesNo(item.customMade))}</td>
        <td>${escapeHtml(item.installType || "待定")}</td>
        <td>${escapeHtml(item.supplierType || "待定")}</td>
        <td>${escapeHtml(item.relatedDrawingItems.map((drawingItem) => `${drawingItem.label} x${drawingItem.quantity}${drawingItem.heightMm ? ` H${drawingItem.heightMm}` : ""}`).join("；") || "无")}</td>
        <td>${escapeHtml(item.constructionNotes || "现场复核")}</td>
      </tr>
    `).join("");
    const mepRows = exportData.mep.map((item) => `
      <tr>
        <td>${escapeHtml(item.floorId)}</td>
        <td>${escapeHtml(item.roomId)}</td>
        <td>${escapeHtml(item.objectId)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.needsSocket ? `${item.socketCount || 1} 个 / ${item.socketHeight || 300} mm` : "否")}</td>
        <td>${escapeHtml(item.needsSwitch ? item.switchControl || "需开关" : "否")}</td>
        <td>${escapeHtml(item.needsLighting ? `${item.lightingType || "照明"} ${item.lightColorTemperature}`.trim() : "否")}</td>
        <td>${escapeHtml(item.needsWaterSupply ? item.waterSupplyType || "需要" : "否")}</td>
        <td>${escapeHtml(item.needsDrainage ? item.drainageType || "需要" : "否")}</td>
        <td>${escapeHtml([item.needsNetwork ? "网络" : "", item.needsSmartControl ? "智能" : "", item.needsVentilation ? "通风/排风" : ""].filter(Boolean).join(" / ") || "无")}</td>
        <td>${escapeHtml(item.relatedCircuit || "待定")}</td>
        <td>${escapeHtml(item.mepNotes || "")}</td>
      </tr>
    `).join("");
    const constructionRows = exportData.construction.map((item) => `
      <tr>
        <td>${escapeHtml(item.floorId)}</td>
        <td>${escapeHtml(item.roomId)}</td>
        <td>${escapeHtml(item.objectId)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(yesNo(item.customMade))}</td>
        <td>${escapeHtml(item.installType || "待定")}</td>
        <td>${escapeHtml(item.reserveSize || item.dimensions)}</td>
        <td>${escapeHtml(item.wallDependency || "")}</td>
        <td>${escapeHtml(item.floorDependency || "")}</td>
        <td>${escapeHtml(item.ceilingDependency || "")}</td>
        <td>${escapeHtml([item.waterproofRequired ? "防水" : "", item.inspectionAccessRequired ? "检修" : ""].filter(Boolean).join(" / ") || "无")}</td>
        <td>${escapeHtml(item.purchaseCategory || "待定")}</td>
        <td>${escapeHtml(item.supplierType || "待定")}</td>
        <td>${escapeHtml(item.constructionNotes || "")}</td>
      </tr>
    `).join("");
    const cameraRows = exportData.cameraViews.map((view) => `
      <tr>
        <td>${escapeHtml(view.floor)}</td>
        <td>${escapeHtml(view.name)}</td>
        <td>${escapeHtml(view.mode)}</td>
        <td>${escapeHtml(String(view.zoom || ""))}</td>
        <td>${escapeHtml(view.description || "")}</td>
        <td>${escapeHtml(`${view.cameraPosition.x}, ${view.cameraPosition.y}, ${view.cameraPosition.z}`)}</td>
        <td>${escapeHtml(`${view.target.x}, ${view.target.y}, ${view.target.z}`)}</td>
      </tr>
    `).join("");
    const sheetRows = constructionSheets.map((sheet) => `
      <tr>
        <td>${escapeHtml(sheet.sheetNo)}</td>
        <td>${escapeHtml(sheet.title)}</td>
        <td>${escapeHtml(getConstructionSheetTypeLabel(sheet))}</td>
        <td>${escapeHtml(sheet.scale)}</td>
        <td>${escapeHtml(sheet.status)}</td>
        <td>${escapeHtml(sheet.note)}</td>
      </tr>
    `).join("");
    const specRows = constructionSpecs.map((spec) => `
      <tr>
        <td>${escapeHtml(spec.category)}</td>
        <td>${escapeHtml(spec.item)}</td>
        <td>${escapeHtml(spec.value)}</td>
        <td>${escapeHtml(spec.note)}</td>
      </tr>
    `).join("");
    const structureSummary = [
      ["墙体", houseStructure.walls.length],
      ["隔断", houseStructure.partitions.length],
      ["门", houseStructure.doors.length],
      ["窗", houseStructure.windows.length + houseStructure.bayWindows.length],
      ["楼梯", houseStructure.stairs.length],
      ["立柱", (houseStructure.columns ?? []).length],
      ["房间", houseStructure.rooms.length],
      ["家具/硬装", furniture.length]
    ];
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(floor.label)}-${escapeHtml(floor.subtitle)}-施工图纸包</title>
  <style>
    body { margin: 0; background: #f4f1eb; color: #1f2933; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px; }
    section { break-inside: avoid; margin-bottom: 24px; border: 1px solid #d9d2c6; background: #fff; padding: 24px; }
    h1 { margin: 0; font-size: 30px; }
    h2 { margin: 0 0 14px; font-size: 20px; }
    p { line-height: 1.7; }
    .meta { color: #64748b; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .stat { border: 1px solid #e5e7eb; padding: 14px; }
    .stat strong { display: block; font-size: 24px; color: #0f172a; }
    .drawing { border: 1px solid #d7dce2; background: #fff; overflow: hidden; }
    .drawing svg { display: block; width: 100%; height: auto; max-height: 780px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #d7dce2; padding: 9px 10px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; }
    .note { background: #fff7ed; border-color: #fed7aa; }
    @media print { body { background: #fff; } main { padding: 0; } section { page-break-inside: avoid; border-color: #999; } }
  </style>
</head>
<body>
  <main>
    <section>
      <p class="meta">林屿湖畔 · ${new Date().toLocaleDateString("zh-CN")} · 当前楼层 ${escapeHtml(floor.label)} / ${escapeHtml(floor.subtitle)}</p>
      <h1>装修施工图纸包 · 概念样张</h1>
      <p>这份文件用于说明施工队通常需要看的图纸结构。当前尺寸与点位为模型推导和别墅经验值，正式施工前必须以现场复尺、设备样本和最终材料为准。</p>
    </section>
    <section>
      <h2>模型对象概览</h2>
      <div class="grid">
        ${structureSummary.map(([label, count]) => `<div class="stat"><strong>${count}</strong>${escapeHtml(String(label))}</div>`).join("")}
      </div>
    </section>
    <section>
      <h2>当前图纸画面 · ${escapeHtml(planCanvasModeLabels[sheetMode])}</h2>
      ${currentDrawingMarkup ? `<div class="drawing">${currentDrawingMarkup}</div>` : "<p>当前没有可导出的绘制图纸，请先回到画布查看图纸后再导出。</p>"}
      ${activeCameraView ? `<p class="meta">当前固定视角：${escapeHtml(activeCameraView.name)} · ${escapeHtml(activeCameraView.mode === "orthographic" ? "正交轴测" : "透视视角")} · ${escapeHtml(activeCameraView.description || "无说明")}</p>` : ""}
      <p class="meta">这张图来自当前画布的绘制结构，不包含原始底图。要导出其他专业图，请先在网页顶部“当前图纸”切换到对应图纸后再导出。</p>
    </section>
    <section>
      <h2>图纸目录</h2>
      <table>
        <thead><tr><th>图号</th><th>图名</th><th>对应图层</th><th>比例</th><th>状态</th><th>说明</th></tr></thead>
        <tbody>${sheetRows}</tbody>
      </table>
    </section>
    <section class="note">
      <h2>施工总说明</h2>
      <p>1. 所有墙体、洞口、楼梯、院子边界以现场复核为准；模型用于沟通图纸逻辑和施工范围。</p>
      <p>2. 给水、排水、灯光、吊顶、柜体、设备需和实物规格、厂家图纸、现场管井位置共同校核；当前给排水图表达预留点和需求点，不表达专业管线路径。</p>
      <p>3. 每次开工前以最新版本图纸为准，施工变更应记录图号、日期、责任人和确认结果。</p>
    </section>
    <section>
      <h2>关键尺寸与做法表</h2>
      <table>
        <thead><tr><th>类别</th><th>项目</th><th>建议值</th><th>备注</th></tr></thead>
        <tbody>${specRows}</tbody>
      </table>
    </section>
    <section>
      <h2>家具 / 硬装定位清单</h2>
      <table>
        <thead><tr><th>编号</th><th>名称</th><th>区域</th><th>尺寸</th><th>材质</th><th>3D 表现</th><th>采购品类</th><th>定制</th><th>安装</th><th>供应商</th><th>关联点位</th><th>施工备注</th></tr></thead>
        <tbody>${furnitureRows || "<tr><td colspan='12'>当前楼层暂无家具对象。</td></tr>"}</tbody>
      </table>
    </section>
    <section>
      <h2>图纸对象清单</h2>
      <table>
        <thead><tr><th>ID</th><th>类别</th><th>标签</th><th>房间</th><th>类型</th><th>数量</th><th>高度</th><th>材料</th><th>控制/回路</th><th>关联对象</th><th>状态</th><th>备注</th></tr></thead>
        <tbody>${drawingItemRows || "<tr><td colspan='12'>当前图纸暂无 drawingItems。</td></tr>"}</tbody>
      </table>
    </section>
    <section>
      <h2>MEP 需求清单</h2>
      <table>
        <thead><tr><th>楼层</th><th>区域</th><th>对象 ID</th><th>名称</th><th>插座</th><th>开关控制</th><th>灯光</th><th>给水</th><th>排水</th><th>弱电/智能/通风</th><th>关联回路</th><th>说明</th></tr></thead>
        <tbody>${mepRows || "<tr><td colspan='12'>当前楼层暂无 MEP 需求对象。</td></tr>"}</tbody>
      </table>
    </section>
    <section>
      <h2>施工备注清单</h2>
      <table>
        <thead><tr><th>楼层</th><th>区域</th><th>对象 ID</th><th>名称</th><th>定制</th><th>安装方式</th><th>预留尺寸</th><th>墙面依赖</th><th>地面依赖</th><th>吊顶依赖</th><th>防水/检修</th><th>采购品类</th><th>供应商</th><th>备注</th></tr></thead>
        <tbody>${constructionRows || "<tr><td colspan='14'>当前楼层暂无施工备注对象。</td></tr>"}</tbody>
      </table>
    </section>
    <section>
      <h2>固定视角清单</h2>
      <table>
        <thead><tr><th>楼层</th><th>视角</th><th>模式</th><th>Zoom</th><th>说明</th><th>相机位置</th><th>目标点</th></tr></thead>
        <tbody>${cameraRows || "<tr><td colspan='7'>暂无固定视角。</td></tr>"}</tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
  }

  async function exportConstructionPackage() {
    const blob = new Blob([constructionPackageToHtml(constructionExportWorkspace)], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `construction-communication-package.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function downloadTextFile(fileName: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function requestConstructionExport(format: "html" | "json" | "csv") {
    setPendingConstructionExport(format);
    setIsConstructionPackageOpen(true);
  }

  function continueConstructionExport() {
    const format = pendingConstructionExport;
    setPendingConstructionExport(null);
    if (format === "html") void exportConstructionPackage();
    if (format === "json" || format === "csv") exportConstructionData(format);
  }

  function escapeCsv(value: unknown) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function getConstructionExportCsv() {
    const exportData = getConstructionExportData();
    const rows = [
      ["recordType", "floorId", "roomId", "objectId", "name", "type", "dimensions", "material", "render3d", "mep", "construction", "cameraMode", "description"],
      ...exportData.drawingItems.map((item) => [
        "drawingItem", item.floorId, item.roomId ?? "", item.id, item.label, item.type, `x${item.quantity}${item.heightMm ? ` / H${item.heightMm}mm` : ""}`,
        item.material ?? item.materialId ?? "", "", [drawingItemCategoryLabels[item.category], item.lightType ?? "", item.lightingLayer ?? "", item.colorTemperature ?? item.lightColorTemperature ?? "", item.beamAngle ? `${item.beamAngle}°` : "", item.mountingType ?? "", item.controlGroupId ?? item.lightGroupId ?? "", item.smartControl ?? item.needsSmartControl ? "智能控制" : "", ["light", "switch"].includes(item.category) ? item.dimming ? "调光" : "不调光" : "", item.relatedSwitchId ?? "", item.relatedCircuit ?? item.circuitId ?? "", item.switchControl?.join("/"), item.controlledLightIds?.join("/"), drawingItemStatusLabels[item.status]].filter(Boolean).join("；"),
        [item.relatedFurnitureId ?? "", item.wallId ?? "", item.ceilingHeightMm ? `吊顶H${item.ceilingHeightMm}` : "", item.pattern ?? "", item.directionDeg !== null && item.directionDeg !== undefined ? `方向${item.directionDeg}°` : "", item.waterproofHeightMm ? `防水H${item.waterproofHeightMm}` : "", item.specialTreatment ?? ""].filter(Boolean).join("；"), "", item.notes
      ]),
      ...exportData.furniture.map((item) => [
        "furniture",
        item.floorId,
        item.roomId,
        item.objectId,
        item.name,
        item.type,
        item.dimensions,
        item.material,
        `${item.renderAssetType} / ${item.renderStyle} / ${item.renderMaterials}`,
        "",
        item.relatedDrawingItems.map((drawingItem) => `${drawingItem.category}:${drawingItem.label}`).join("；"),
        "",
        ""
      ]),
      ...exportData.mep.map((item) => [
        "mep",
        item.floorId,
        item.roomId,
        item.objectId,
        item.name,
        item.type,
        item.dimensions,
        item.material,
        "",
        [
          item.needsSocket ? `插座 ${item.socketCount || 1} 个 ${item.socketHeight || 300}mm` : "",
          item.needsSwitch ? `开关 ${item.switchControl || "需确认"}` : "",
          item.needsLighting ? `灯光 ${item.lightingType || ""} ${item.lightColorTemperature}` : "",
          item.needsWaterSupply ? `给水 ${item.waterSupplyType}` : "",
          item.needsDrainage ? `排水 ${item.drainageType}` : "",
          item.needsNetwork ? "网络/弱电" : "",
          item.needsSmartControl ? "智能控制" : "",
          item.needsVentilation ? "通风/排风" : "",
          item.relatedCircuit
        ].filter(Boolean).join("；"),
        "",
        "",
        item.mepNotes
      ]),
      ...exportData.construction.map((item) => [
        "construction",
        item.floorId,
        item.roomId,
        item.objectId,
        item.name,
        item.type,
        item.dimensions,
        item.material,
        "",
        "",
        [
          item.customMade ? "定制" : "非定制",
          item.installType,
          item.reserveSize,
          item.wallDependency,
          item.floorDependency,
          item.ceilingDependency,
          item.waterproofRequired ? "防水" : "",
          item.inspectionAccessRequired ? "检修" : "",
          item.purchaseCategory,
          item.supplierType
        ].filter(Boolean).join("；"),
        "",
        item.constructionNotes
      ]),
      ...exportData.cameraViews.map((view) => [
        "cameraView",
        view.floor,
        "",
        view.id,
        view.name,
        "",
        "",
        "",
        "",
        "",
        "",
        view.mode,
        view.description
      ])
    ];
    return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  }

  function exportConstructionData(format: "json" | "csv") {
    if (format === "json") {
      downloadTextFile(`construction-communication-package.json`, constructionPackageToJson(constructionExportWorkspace), "application/json;charset=utf-8");
      return;
    }
    downloadTextFile(`construction-communication-package.csv`, constructionPackageToCsv(constructionExportWorkspace), "text/csv;charset=utf-8");
  }

  const floorPlanFilter = getFloorPlanFilter(floorPlanVisualSettings);
  const constructionPackageValidation = validateConstructionPackage(constructionExportWorkspace);
  const verificationConflictIds = new Set([
    ...constructionPackageValidation.errors.map((issue) => issue.objectId),
    ...Array.from(dimensionVerificationConflictIds)
  ]);
  const layerVisibility = floorPlanVisualSettings.layerVisibility;
  const isSiteSheetMode = sheetMode === "sitePlan";
  const isStructureSheetMode = sheetMode === "structurePlan";
  const isSyncSheetMode = sheetMode === "structureSyncCheck";
  const isDemolitionBuildSheetMode = sheetMode === "demolitionAndBuildPlan";
  const visibleVerificationStatusLayer = isStructureSheetMode || isDemolitionBuildSheetMode;
  const isAnnotationSheetMode = sheetMode === "annotationPlan";
  const isFurnitureSheetMode = sheetMode === "furniturePlan";
  const isProfessionalDrawingSheetMode = ["socketPlan", "switchPlan", "lightingPlan", "waterSupplyPlan", "drainagePlan", "ceilingPlan", "floorFinishPlan", "wallFinishPlan", "materialPlan", "annotationPlan"].includes(sheetMode);
  const activeDrawingItemCategories = getDrawingItemCategoriesForSheet(normalizeDrawingSheetType(sheetMode));
  const selectedFurnitureRelatedDrawingItems = selectedFurnitureId
    ? drawingItems.filter((item) => item.relatedFurnitureId === selectedFurnitureId && ["socket", "switch", "light", "waterSupply", "drainage", "network", "ventilation", "annotation"].includes(item.category))
    : [];
  const visibleDrawingItems = isFurnitureSheetMode && selectedFurnitureRelatedDrawingItems.length > 0
    ? selectedFurnitureRelatedDrawingItems
    : drawingItems.filter((item) => activeDrawingItemCategories.includes(item.category));
  const selectedDrawingItem = drawingItems.find((item) => item.id === selectedDrawingItemId) ?? null;
  const drawingItemLayerActive = activeDrawingItemCategories.length > 0 || (isFurnitureSheetMode && selectedFurnitureRelatedDrawingItems.length > 0);
  const furniturePlacementWarnings = validateFurniturePlacement(houseStructure, furniture, drawingItems, {
    workspaceId: isFurnitureSheetMode ? "furniture" : ["socketPlan", "switchPlan", "lightingPlan", "waterSupplyPlan", "drainagePlan"].includes(sheetMode) ? "mep" : "space"
  });
  const isMobileAnnotatedPlan = mobilePresentationMode && mobileDisplayLevel !== "simple";
  const visibleBaseFloorPlan = false;
  const visibleCleanupPatch = false;
  const visibleStructureProjection = isProfessionalDrawingSheetMode;
  const visibleFurnitureOverlay = (yardImmersiveMode || isSiteSheetMode || isDemolitionBuildSheetMode || isAnnotationSheetMode || isFurnitureSheetMode || sheetMode === "presentationView" || isProfessionalDrawingSheetMode) && layerVisibility.furnitureOverlay;
  const visibleSemanticOverlay = developerMode && (sheetMode === "presentationView" || isMobileAnnotatedPlan) && layerVisibility.semanticOverlay;
  const visibleDebugLayer = developerMode && !mobilePresentationMode && isSyncSheetMode && layerVisibility.debug;
  const visibleStructureLabels = !furnitureImmersiveMode && (!mobilePresentationMode || mobileDisplayLevel === "professional");
  const showDimensionLayer = !yardImmersiveMode && (mobilePresentationMode ? mobileDisplayLevel !== "simple" : (isStructureSheetMode || isDemolitionBuildSheetMode || isSiteSheetMode));
  const structurePointerEventsEnabled = drawingItemLayerActive || isSiteSheetMode || isStructureSheetMode || isSyncSheetMode || isDemolitionBuildSheetMode || (plannerMode === "edit" && Boolean(getDrawToolStructureKind(drawTool)) && canDrawStructureTool(drawTool));
  const furniturePointerEventsEnabled = canSelectFurnitureLayer();
  const cleanFillColor = getCleanupFillColor(floorPlanVisualSettings);

  function updateDrawingItem(itemId: string, changes: Partial<DrawingItem>) {
    const updatedAt = new Date().toISOString();
    onDrawingItemsChange(drawingItems.map((item) => item.id === itemId ? { ...item, ...changes, updatedAt } : item));
  }

  function updateLightSwitchRelation(lightId: string, switchId: string | null) {
    const updatedAt = new Date().toISOString();
    const targetSwitch = switchId ? drawingItems.find((item) => item.id === switchId && item.category === "switch") : null;
    const controlGroupId = targetSwitch?.controlGroupId ?? targetSwitch?.lightGroupId ?? null;
    onDrawingItemsChange(drawingItems.map((item) => {
      if (item.id === lightId) return { ...item, relatedSwitchId: switchId, controlGroupId, lightGroupId: controlGroupId, updatedAt };
      if (item.category !== "switch") return item;
      const withoutLight = (item.controlledLightIds ?? []).filter((id) => id !== lightId);
      return item.id === switchId
        ? { ...item, controlledLightIds: [...withoutLight, lightId], relatedLightIds: [...withoutLight, lightId], updatedAt }
        : withoutLight.length !== (item.controlledLightIds ?? []).length ? { ...item, controlledLightIds: withoutLight, relatedLightIds: withoutLight, updatedAt } : item;
    }));
  }

  function updateSwitchControlGroup(switchItem: DrawingItem, controlGroupId: string | null) {
    const controlled = new Set(switchItem.controlledLightIds ?? []);
    const updatedAt = new Date().toISOString();
    onDrawingItemsChange(drawingItems.map((item) => item.id === switchItem.id || controlled.has(item.id)
      ? { ...item, controlGroupId, lightGroupId: controlGroupId, updatedAt }
      : item));
  }

  function toggleSwitchControlledLight(switchItem: DrawingItem, lightId: string, checked: boolean) {
    const nextIds = checked
      ? Array.from(new Set([...(switchItem.controlledLightIds ?? []), lightId]))
      : (switchItem.controlledLightIds ?? []).filter((id) => id !== lightId);
    const group = switchItem.controlGroupId ?? switchItem.lightGroupId ?? null;
    const updatedAt = new Date().toISOString();
    onDrawingItemsChange(drawingItems.map((item) => {
      if (item.id === switchItem.id) return { ...item, controlledLightIds: nextIds, relatedLightIds: nextIds, updatedAt };
      if (item.id !== lightId) return item;
      return checked
        ? { ...item, relatedSwitchId: switchItem.id, controlGroupId: group, lightGroupId: group, updatedAt }
        : { ...item, relatedSwitchId: item.relatedSwitchId === switchItem.id ? null : item.relatedSwitchId, updatedAt };
    }));
  }

  function addDrawingItem(preset?: { category: DrawingItemCategory; type: string; label: string }) {
    const category = preset?.category ?? activeDrawingItemCategories[0];
    if (!category) return;
    const id = `DI-${floor.id}-${Date.now().toString(36).toUpperCase()}`;
    const baseItem = createDrawingItem({
      id,
      floorId: floor.id,
      category,
      positionMm: { x: Math.round(planBounds.x + planBounds.width / 2), y: Math.round(planBounds.y + planBounds.height / 2) },
      roomId: houseStructure.rooms[0]?.id ?? houseStructure.outdoors[0]?.id ?? null
    });
    const defaultItem: DrawingItem = category === "ceiling" ? { ...baseItem, type: "flatCeiling", ceilingHeightMm: 2800, relatedLightIds: [], inspectionAccess: false, airVent: false, returnAir: false, maintenanceOpening: false }
      : category === "floorFinish" ? { ...baseItem, type: "roomFinish", material: null, pattern: null, directionDeg: 0, startPoint: null, seamWidthMm: null, threshold: null, transition: null }
      : category === "wallFinish" ? { ...baseItem, type: "wallFinish", wallId: null, material: null, heightRange: { minMm: 0, maxMm: 2800 }, area: null, waterproofHeightMm: null, specialTreatment: null }
      : category === "switch" ? { ...baseItem, type: "switchControl", switchControl: [], relatedCircuit: null, controlledLightIds: [], lightGroupId: null, controlGroupId: null, smartControl: false, dimming: false }
      : category === "light" ? { ...baseItem, type: "recessedDownlight", lightType: "recessedDownlight", lightingLayer: "ambient", colorTemperature: "3000K", lightColorTemperature: "3000K", beamAngle: 60, mountingType: "recessed", relatedSwitchId: null, controlGroupId: null, lightGroupId: null, smartControl: false, needsSmartControl: false, dimming: false, relatedRoomId: baseItem.roomId, hostCeilingAreaId: null }
      : baseItem;
    const item: DrawingItem = preset ? {
      ...defaultItem,
      type: preset.type,
      label: preset.label,
      lightType: category === "light" ? preset.type : defaultItem.lightType,
      updatedAt: new Date().toISOString()
    } : defaultItem;
    onDrawingItemsChange([...drawingItems, item]);
    setSelectedDrawingItemId(id);
    onActiveObjectChange(id);
  }

  useEffect(() => {
    if (!drawingItemCreationRequest || !workspaceMutationAllowed) return;
    addDrawingItem(drawingItemCreationRequest);
    // A nonce represents one explicit toolbar action; the current model is read at execution time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawingItemCreationRequest?.nonce]);

  function deleteDrawingItem(itemId: string) {
    onDrawingItemsChange(drawingItems.filter((item) => item.id !== itemId));
    setSelectedDrawingItemId("");
    onActiveObjectChange("");
  }

  function applyRoomPolygonToDrawingItem(item: DrawingItem) {
    const room = [...houseStructure.rooms, ...houseStructure.outdoors].find((candidate) => candidate.id === item.roomId);
    if (!room || !("boundary" in room || "polygon" in room)) return;
    const polygon = "boundary" in room ? room.boundary : room.polygon;
    if (!polygon || polygon.length < 3) return;
    const area = Math.abs(polygon.reduce((sum, point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0)) / 2 / 1_000_000;
    updateDrawingItem(item.id, { polygon, area: Number(area.toFixed(2)), startPoint: polygon[0] });
  }
  const repairOverlayStyles = getRepairOverlayStyles(floorPlanVisualSettings);
  const showStructureDrawingPanel = !mobilePresentationMode && plannerMode === "edit" && !isFurnitureSheetMode && (!drawingDrivenMode || showAdvancedCanvasControls);
  const yardObjectMatchesFocus = (id: string, name = "") => !yardImmersiveMode || id.includes(`-${yardToken}-`) || name.includes(yardFocus === "north" ? "北院" : "南院");
  const visibleOutdoors = houseStructure.outdoors
    .filter((outdoor) => resolveVisibility(outdoor).visible2d)
    .filter((outdoor) => !yardImmersiveMode || yardObjectMatchesFocus(outdoor.id, outdoor.name));
  const visibleOutdoorSurfaces = houseStructure.outdoorSurfaces
    .filter((surface) => resolveVisibility(surface).visible2d)
    .filter((surface) => !yardImmersiveMode || yardObjectMatchesFocus(surface.id, surface.name) || polygonIntersectsBounds(surface.polygon, planBounds));
  const visibleFences = houseStructure.fences
    .filter((fence) => resolveVisibility(fence).visible2d)
    .filter((fence) => !yardImmersiveMode || yardObjectMatchesFocus(fence.id, fence.name) || pointInBounds(fence.start, planBounds) || pointInBounds(fence.end, planBounds));
  const masterBathRoom = floor.id === "2F" ? houseStructure.rooms.find((room) => room.id === MASTER_BATH_ROOM_ID) ?? null : null;
  const showMasterBathStyleLayer = Boolean(masterBathRoom && !yardImmersiveMode && ["furniturePlan", "presentationView", "lightingPlan", "waterSupplyPlan", "drainagePlan", "ceilingPlan", "floorFinishPlan", "wallFinishPlan", "materialPlan"].includes(sheetMode));

  function renderSheetPoint(id: string, x: number, y: number, label: string, color: string, shape: "circle" | "square" = "circle") {
    return (
      <g key={id}>
        {shape === "circle" ? (
          <circle cx={x} cy={y} r={130} fill="#fff" stroke={color} strokeWidth={38} />
        ) : (
          <rect x={x - 125} y={y - 125} width={250} height={250} rx={38} fill="#fff" stroke={color} strokeWidth={38} />
        )}
        <text x={x + 180} y={y + 52} fill={color} fontSize={160} fontWeight={800}>{label}</text>
      </g>
    );
  }

  function renderBoundConstructionAnchors(mode: DrawingSheetType) {
    const colors = {
      coldWater: "#0284c7",
      hotWater: "#ef4444",
      filteredWater: "#0891b2",
      drain: "#15803d",
      power: "#dc2626",
      gas: "#7c3aed",
      exhaust: "#b91c1c"
    } as const;
    return furniture.flatMap((item) => {
      const center = getFurnitureMmCenter(item, houseStructure);
      return getConstructionAnchorsForSheet(item.constructionAnchors, mode).map((anchor) => {
        const point = constructionAnchorToPlanPoint(item, center, anchor);
        return renderSheetPoint(
          `bound-${item.id}-${anchor.id}`,
          point.x,
          point.y,
          constructionAnchorLabel(anchor),
          colors[anchor.type],
          anchor.type === "power" ? "square" : "circle"
        );
      });
    });
  }

  function renderSheetPolyline(id: string, points: MmPoint[], color: string, dashed = false) {
    return (
      <polyline
        key={id}
        points={points.map((point) => `${point.x},${point.y}`).join(" ")}
        fill="none"
        stroke={color}
        strokeDasharray={dashed ? "140 110" : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={58}
      />
    );
  }

  function renderMasterBathStyleLayer() {
    if (!showMasterBathStyleLayer || !masterBathRoom) return null;
    const masterBathFurniture = furniture.filter(isMasterBathFurniture);
    const vanity = masterBathFurniture.find((item) => item.moduleType === "vanity");
    const vanityLight = vanity ? getFurnitureAxisLine(vanity, houseStructure, vanity.dimensions.depth * 10 * 0.45, 0.98) : null;

    return (
      <g data-layer="MasterBathStyleLayer" pointerEvents="none">
        <polygon
          points={masterBathRoom.boundary.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="url(#masterBathStonePattern)"
          opacity={sheetMode === "floorFinishPlan" ? 0.92 : 0.78}
          stroke="#9b8f80"
          strokeDasharray={sheetMode === "floorFinishPlan" ? undefined : "120 90"}
          strokeWidth={sheetMode === "floorFinishPlan" ? 44 : 28}
        />
        {vanityLight && (
          <line
            x1={vanityLight[0].x}
            y1={vanityLight[0].y}
            x2={vanityLight[1].x}
            y2={vanityLight[1].y}
            stroke="#fbbf24"
            strokeLinecap="round"
            strokeOpacity={0.78}
            strokeWidth={38}
          />
        )}
        <text x={8040} y={720} fill="#7c5f42" fontSize={132} fontWeight={900} paintOrder="stroke" stroke="#fffaf2" strokeWidth={62}>
          暖灰石材 / 浅木镜柜 / 无框玻璃
        </text>
      </g>
    );
  }

  function renderStructureProjectionLayer() {
    if (!visibleStructureProjection) return null;

    return (
      <g data-layer="StructureProjectionLayer" pointerEvents="none">
        {houseStructure.rooms.map((room) => (
          <polygon
            key={`projection-room-${room.id}`}
            points={room.boundary.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="rgba(148,163,184,0.12)"
            stroke="rgba(71,85,105,0.18)"
            strokeWidth={18}
          />
        ))}
        {houseStructure.outdoorSurfaces.map((surface) => (
          <polygon
            key={`projection-surface-${surface.id}`}
            points={surface.polygon.map((point) => `${point.x},${point.y}`).join(" ")}
            fill={surface.surfaceType === "planting" ? "rgba(22,101,52,0.10)" : "rgba(148,163,184,0.10)"}
            stroke="rgba(71,85,105,0.16)"
            strokeDasharray="120 90"
            strokeWidth={24}
          />
        ))}
        {houseStructure.walls.map((wall) => {
          if (wall.kind === "arc") {
            return (
              <path
                key={`projection-wall-${wall.id}`}
                d={getArcPath(wall)}
                fill="none"
                stroke={isRailingWall(wall) ? "#0891b2" : "#475569"}
                strokeDasharray={isRailingWall(wall) ? "120 86" : undefined}
                strokeLinecap={isRailingWall(wall) ? "round" : "round"}
                strokeOpacity={isRailingWall(wall) ? 0.34 : 0.2}
                strokeWidth={isRailingWall(wall) ? wall.thickness + 34 : wall.thickness + 90}
              />
            );
          }
          return (
            <line
              key={`projection-wall-${wall.id}`}
              x1={wall.start.x}
              y1={wall.start.y}
              x2={wall.end.x}
              y2={wall.end.y}
              stroke={isRailingWall(wall) ? "#0891b2" : "#475569"}
              strokeDasharray={isRailingWall(wall) ? "120 86" : undefined}
              strokeLinecap={isRailingWall(wall) ? "round" : "square"}
              strokeOpacity={isRailingWall(wall) ? 0.34 : 0.22}
              strokeWidth={isRailingWall(wall) ? wall.thickness + 34 : wall.thickness + 90}
            />
          );
        })}
        {houseStructure.partitions.map((partition) => (
          <line
            key={`projection-partition-${partition.id}`}
            x1={partition.start.x}
            y1={partition.start.y}
            x2={partition.end.x}
            y2={partition.end.y}
            stroke="#0f766e"
            strokeDasharray="150 110"
            strokeLinecap="round"
            strokeOpacity={0.16}
            strokeWidth={partition.thickness + 60}
          />
        ))}
        {houseStructure.stairs.map((stair) => (
          <line
            key={`projection-stair-${stair.id}`}
            x1={stair.start.x}
            y1={stair.start.y}
            x2={stair.end.x}
            y2={stair.end.y}
            stroke="#7c3aed"
            strokeLinecap="round"
            strokeOpacity={0.16}
            strokeWidth={stair.width}
          />
        ))}
        {(houseStructure.columns ?? []).map((column) => (
          <circle
            key={`projection-column-${column.id}`}
            cx={column.center.x}
            cy={column.center.y}
            r={column.radius}
            fill="rgba(51,65,85,0.16)"
            stroke="rgba(15,23,42,0.28)"
            strokeWidth={34}
          />
        ))}
      </g>
    );
  }

  function getSyncWallPresentation(wall: HouseWall) {
    const override = wallSyncOverrides[wall.id];
    const overrideTool = syncPaintTools.find((item) => item.id === override);
    const rule = getWallSyncRule(floor.id, wall.id, wallSyncOverrides);
    return {
      color: overrideTool?.color ?? rule?.color ?? "#94a3b8",
      label: overrideTool?.label ?? rule?.label ?? "独立"
    };
  }

  function isRailingWall(wall: HouseWall) {
    return wall.barrierType === "railing";
  }

  function getWallObjectLabel(wall: HouseWall) {
    if (isRailingWall(wall)) return "镂空栏杆";
    return wall.kind === "arc" ? "弧形墙" : "墙";
  }

  function getVisibleWallStroke(wall: HouseWall, isSelected: boolean, isHovered: boolean, locked: boolean) {
    if (isSyncSheetMode) {
      return {
        color: getSyncWallPresentation(wall).color,
        width: isSelected || isHovered ? wall.thickness + 76 : wall.thickness + 30,
        opacity: locked ? 0.55 : 1,
        dasharray: undefined as string | undefined,
        linecap: "square" as "square" | "round"
      };
    }

    if (isRailingWall(wall)) {
      return {
        color: locked ? "#9ca3af" : isSelected ? "#0f766e" : isHovered ? "#0d9488" : "#0891b2",
        width: isSelected || isHovered ? wall.thickness + 42 : wall.thickness + 18,
        opacity: locked ? 0.55 : 0.95,
        dasharray: "120 86",
        linecap: "round" as const
      };
    }

    return {
      color: locked ? "#9ca3af" : isSelected ? "#2563eb" : isHovered ? "#334155" : "#5e6468",
      width: isSelected || isHovered ? wall.thickness + 34 : wall.thickness,
      opacity: locked ? 0.55 : 1,
      dasharray: undefined as string | undefined,
      linecap: "square" as "square" | "round"
    };
  }

  function renderSyncRuleOverlay() {
    if (!isSyncSheetMode) return null;

    const wallRules = getWallSyncLegend();
    const stairRule = getStairSyncRule();
    const legendItems = [
      ...wallRules.map((rule) => ({
        id: rule.id,
        color: rule.color,
        title: rule.label,
        detail: rule.suffixes.join(" / ")
      })),
      { id: "independent", color: "#94a3b8", title: "独立墙", detail: "未列入联动规则" },
      { id: stairRule.id, color: stairRule.color, title: stairRule.label, detail: "所有楼梯同步位置与尺寸" }
    ];
    const legendX = planBounds.x + 520;
    const legendY = planBounds.y + 520;

    return (
      <g data-layer="SyncRuleOverlay" pointerEvents="none">
        <rect
          x={legendX - 180}
          y={legendY - 300}
          width={4700}
          height={legendItems.length * 360 + 430}
          rx={180}
          fill="rgba(255,255,255,0.9)"
          stroke="rgba(148,163,184,0.45)"
          strokeWidth={24}
        />
        <text x={legendX} y={legendY - 60} fill="#0f172a" fontSize={210} fontWeight={900}>墙体联动规则</text>
        {legendItems.map((item, index) => {
          const y = legendY + 290 + index * 360;
          return (
            <g key={item.id}>
              <line x1={legendX} y1={y - 62} x2={legendX + 430} y2={y - 62} stroke={item.color} strokeLinecap="round" strokeWidth={86} />
              <text x={legendX + 560} y={y - 112} fill="#0f172a" fontSize={165} fontWeight={900}>{item.title}</text>
              <text x={legendX + 560} y={y + 90} fill="#64748b" fontSize={128} fontWeight={700}>{item.detail}</text>
            </g>
          );
        })}
        {houseStructure.walls.map((wall) => {
          const { color, label } = getSyncWallPresentation(wall);
          const point = getWallLabelPoint(wall);
          return (
            <g key={`sync-wall-${wall.id}`}>
              <text x={point.x} y={point.y - 170} fill={color} fontSize={150} fontWeight={900} pointerEvents="none" textAnchor="middle">{wall.id}</text>
              <text x={point.x} y={point.y + 20} fill={color} fontSize={118} fontWeight={800} pointerEvents="none" textAnchor="middle">{label}</text>
            </g>
          );
        })}
        {houseStructure.stairs.map((stair) => {
          const point = {
            x: (stair.start.x + stair.end.x) / 2,
            y: (stair.start.y + stair.end.y) / 2
          };
          return (
            <g key={`sync-stair-${stair.id}`}>
              <text x={point.x} y={point.y - 260} fill={stairRule.color} fontSize={150} fontWeight={900} textAnchor="middle">{stair.id}</text>
              <text x={point.x} y={point.y - 70} fill={stairRule.color} fontSize={118} fontWeight={800} textAnchor="middle">楼梯四层</text>
            </g>
          );
        })}
      </g>
    );
  }

  function renderPlanSheetOverlay() {
    if (!["sitePlan", "socketPlan", "switchPlan", "lightingPlan", "waterSupplyPlan", "drainagePlan", "ceilingPlan", "floorFinishPlan", "wallFinishPlan", "materialPlan", "annotationPlan"].includes(sheetMode)) return null;

    if (sheetMode === "sitePlan") {
      if (floor.id !== "1F") {
        return (
          <g data-layer="SitePlanOverlay" pointerEvents="none">
            <text x={1120} y={980} fill="#475569" fontSize={230} fontWeight={900}>{floor.label} / 当前楼层结构底盘</text>
            <text x={1120} y={1280} fill="#64748b" fontSize={150} fontWeight={700}>庭院总平面仅并入 1F，其他楼层保持本层结构表达。</text>
          </g>
        );
      }
      return (
        <g data-layer="SitePlanOverlay" pointerEvents="none">
          <text x={1120} y={-1180} fill="#166534" fontSize={230} fontWeight={900}>北院 / 入户庭院 2m</text>
          <text x={1120} y={11280} fill="#166534" fontSize={230} fontWeight={900}>南院 / 生活庭院 4m</text>
          <line x1={0} y1={0} x2={STRUCTURE_WIDTH_MM} y2={0} stroke="#94a3b8" strokeDasharray="140 100" strokeWidth={28} />
          <line x1={0} y1={STRUCTURE_HEIGHT_MM} x2={STRUCTURE_WIDTH_MM} y2={STRUCTURE_HEIGHT_MM} stroke="#94a3b8" strokeDasharray="140 100" strokeWidth={28} />
        </g>
      );
    }

    if (sheetMode === "socketPlan") {
      if (floor.id === "2F") {
        return (
          <g data-layer="SocketPlanOverlay" pointerEvents="none">
            {renderSheetPoint("socket-2f-bed-left", 2350, 6200, "床头五孔", "#dc2626", "square")}
            {renderSheetPoint("socket-2f-bed-right", 3450, 6200, "床头五孔", "#dc2626", "square")}
            {renderSheetPoint("socket-2f-desk", 6100, 6500, "书桌/网络", "#dc2626", "square")}
            {renderSheetPoint("socket-2f-guest-vanity", 8050, 4400, "客卫防水", "#dc2626", "square")}
            {renderSheetPoint("socket-2f-master-mirror", 9280, 1160, "镜柜/吹风", "#dc2626", "square")}
            {renderSheetPoint("socket-2f-master-toilet", 9100, 2550, "智能马桶", "#dc2626", "square")}
            {renderSheetPoint("socket-2f-master-ceiling", 8280, 850, "风暖/排风", "#dc2626", "square")}
            {renderSheetPolyline("socket-2f-run", [{ x: 950, y: 7800 }, { x: 2800, y: 7800 }, { x: 2800, y: 6200 }, { x: 6100, y: 6500 }, { x: 8050, y: 4400 }, { x: 9280, y: 1160 }, { x: 9100, y: 2550 }], "#dc2626", true)}
          </g>
        );
      }
      if (floor.id !== "1F") {
        return (
          <g data-layer="SocketPlanOverlay" pointerEvents="none">
            {renderSheetPoint(`socket-${floor.id}-equipment`, 2500, 6400, "设备插座", "#dc2626", "square")}
            {renderSheetPoint(`socket-${floor.id}-network`, 5200, 6100, "弱电/网络", "#dc2626", "square")}
            {renderSheetPoint(`socket-${floor.id}-service`, 8200, 4550, "预留回路", "#dc2626", "square")}
            {renderSheetPolyline(`socket-${floor.id}-run`, [{ x: 950, y: 7800 }, { x: 2500, y: 7800 }, { x: 2500, y: 6400 }, { x: 5200, y: 6100 }, { x: 8200, y: 4550 }], "#dc2626", true)}
          </g>
        );
      }
      return (
        <g data-layer="SocketPlanOverlay" pointerEvents="none">
          {renderSheetPoint("socket-tv", 3000, 6100, "电视/网络", "#dc2626", "square")}
          {renderSheetPoint("socket-sofa", 2350, 5350, "沙发五孔", "#dc2626", "square")}
          {renderBoundConstructionAnchors("socketPlan")}
          {renderSheetPoint("socket-yard", 8300, 8750, "南院防水", "#dc2626", "square")}
          {renderSheetPolyline("socket-run", [{ x: 950, y: 7800 }, { x: 3000, y: 7800 }, { x: 3000, y: 6100 }, { x: 7200, y: 3820 }, { x: 9000, y: 1700 }], "#dc2626", true)}
        </g>
      );
    }

    if (sheetMode === "switchPlan") {
      if (floor.id === "2F") {
        return (
          <g data-layer="SwitchPlanOverlay" pointerEvents="none">
            {renderSheetPoint("switch-2f-stair", 3850, 3140, "楼梯双控", "#7c3aed", "square")}
            {renderSheetPoint("switch-2f-master", 1350, 5350, "主卧入口", "#7c3aed", "square")}
            {renderSheetPoint("switch-2f-bath", 7750, 4300, "卫浴控制", "#7c3aed", "square")}
            {renderSheetPolyline("switch-2f-control", [{ x: 3850, y: 3140 }, { x: 5200, y: 4300 }, { x: 7750, y: 4300 }], "#7c3aed", true)}
          </g>
        );
      }
      if (floor.id !== "1F") {
        return (
          <g data-layer="SwitchPlanOverlay" pointerEvents="none">
            {renderSheetPoint(`switch-${floor.id}-stair`, 3850, 3140, "楼梯双控", "#7c3aed", "square")}
            {renderSheetPoint(`switch-${floor.id}-main`, 1350, 5350, "主控", "#7c3aed", "square")}
            {renderSheetPoint(`switch-${floor.id}-equipment`, 8200, 4550, "设备控制", "#7c3aed", "square")}
            {renderSheetPolyline(`switch-${floor.id}-control`, [{ x: 3850, y: 3140 }, { x: 5200, y: 4300 }, { x: 8200, y: 4550 }], "#7c3aed", true)}
          </g>
        );
      }
      return (
        <g data-layer="SwitchPlanOverlay" pointerEvents="none">
          {renderSheetPoint("switch-entry", 3850, 3140, "入户双控", "#7c3aed", "square")}
          {renderSheetPoint("switch-living", 1050, 5350, "客厅主控", "#7c3aed", "square")}
          {renderSheetPoint("switch-kitchen", 9120, 3180, "餐厨控制", "#7c3aed", "square")}
          {renderSheetPoint("switch-yard", 3920, 7860, "庭院灯", "#7c3aed", "square")}
          {renderSheetPolyline("switch-control-1", [{ x: 3850, y: 3140 }, { x: 5300, y: 4300 }, { x: 6500, y: 4300 }], "#7c3aed", true)}
          {renderSheetPolyline("switch-control-2", [{ x: 9120, y: 3180 }, { x: 7600, y: 2100 }, { x: 6500, y: 2100 }], "#7c3aed", true)}
        </g>
      );
    }

    if (sheetMode === "lightingPlan") {
      if (floor.id === "2F") {
        const bedroomLightPoints = [
          { id: "lt-2f-master-1", x: 2400, y: 6100, label: "筒" },
          { id: "lt-2f-master-2", x: 3350, y: 6100, label: "筒" },
          { id: "lt-2f-hall", x: 5200, y: 4300, label: "廊" },
          { id: "lt-2f-guest-bath", x: 8150, y: 4300, label: "防" },
          { id: "lt-2f-master-vanity", x: 9220, y: 1450, label: "镜灯" },
          { id: "lt-2f-master-shower", x: 8180, y: 850, label: "淋浴" },
          { id: "lt-2f-master-tub", x: 8050, y: 2200, label: "浴缸" }
        ];
        return (
          <g data-layer="LightingPlanOverlay" pointerEvents="none">
            <rect x={1150} y={5320} width={2600} height={1700} rx={180} fill="none" stroke="#f59e0b" strokeDasharray="120 90" strokeWidth={46} />
            <rect x={7050} y={3500} width={2100} height={1500} rx={180} fill="none" stroke="#f59e0b" strokeDasharray="120 90" strokeWidth={46} />
            <rect x={7681} y={350} width={1814} height={2700} rx={160} fill="rgba(251,191,36,0.07)" stroke="#f59e0b" strokeDasharray="120 90" strokeWidth={42} />
            <line x1={9250} y1={720} x2={9250} y2={2280} stroke="#fbbf24" strokeLinecap="round" strokeOpacity={0.78} strokeWidth={44} />
            {bedroomLightPoints.map((point) => renderSheetPoint(point.id, point.x, point.y, point.label, "#f59e0b"))}
          </g>
        );
      }
      if (floor.id !== "1F") {
        const basementLightPoints = [
          { id: `lt-${floor.id}-1`, x: 2350, y: 6100, label: "筒" },
          { id: `lt-${floor.id}-2`, x: 5200, y: 6100, label: "筒" },
          { id: `lt-${floor.id}-3`, x: 8200, y: 4550, label: "检" }
        ];
        return (
          <g data-layer="LightingPlanOverlay" pointerEvents="none">
            <rect x={1150} y={5320} width={7500} height={1700} rx={180} fill="none" stroke="#f59e0b" strokeDasharray="120 90" strokeWidth={46} />
            {basementLightPoints.map((point) => renderSheetPoint(point.id, point.x, point.y, point.label, "#f59e0b"))}
          </g>
        );
      }
      const lightPoints = [
        { id: "lt-living-1", x: 2350, y: 6100, label: "筒" },
        { id: "lt-living-2", x: 3300, y: 6100, label: "筒" },
        { id: "lt-dining", x: 7700, y: 3820, label: "餐吊" },
        { id: "lt-kitchen-1", x: 6500, y: 1900, label: "筒" },
        { id: "lt-kitchen-2", x: 8400, y: 1900, label: "筒" },
        { id: "lt-yard-n", x: 5500, y: -1050, label: "庭" },
        { id: "lt-yard-s", x: 6000, y: 9250, label: "庭" }
      ];
      return (
        <g data-layer="LightingPlanOverlay" pointerEvents="none">
          <rect x={1150} y={5320} width={2600} height={1700} rx={180} fill="none" stroke="#f59e0b" strokeDasharray="120 90" strokeWidth={46} />
          <rect x={5750} y={850} width={3200} height={1850} rx={180} fill="none" stroke="#f59e0b" strokeDasharray="120 90" strokeWidth={46} />
          {lightPoints.map((point) => renderSheetPoint(point.id, point.x, point.y, point.label, "#f59e0b"))}
        </g>
      );
    }

    if (sheetMode === "waterSupplyPlan") {
      if (floor.id === "2F") {
        return (
          <g data-layer="WaterPlanOverlay" pointerEvents="none">
            {renderSheetPolyline("water-2f-cold", [{ x: 9100, y: 7800 }, { x: 9100, y: 4300 }, { x: 8150, y: 4300 }, { x: 7750, y: 4700 }], "#0284c7")}
            {renderSheetPolyline("water-2f-hot", [{ x: 8800, y: 7800 }, { x: 8800, y: 4450 }, { x: 8150, y: 4450 }, { x: 7750, y: 4850 }], "#ef4444", true)}
            {renderSheetPolyline("water-2f-master-cold", [{ x: 9100, y: 3050 }, { x: 9100, y: 1450 }, { x: 8360, y: 850 }, { x: 8050, y: 2200 }], "#0284c7")}
            {renderSheetPolyline("water-2f-master-hot", [{ x: 8820, y: 3050 }, { x: 8820, y: 1450 }, { x: 8240, y: 900 }, { x: 7950, y: 2200 }], "#ef4444", true)}
            {renderSheetPoint("water-2f-guest-vanity", 7750, 4700, "客卫台盆", "#0284c7")}
            {renderSheetPoint("water-2f-guest-shower", 8350, 4200, "客卫淋浴", "#0284c7")}
            {renderSheetPoint("water-2f-master-vanity", 9220, 1450, "双盆冷热水", "#0284c7")}
            {renderSheetPoint("water-2f-master-shower", 8360, 850, "淋浴冷热水", "#0284c7")}
            {renderSheetPoint("water-2f-master-tub", 8050, 2200, "浴缸冷热水", "#0284c7")}
            {renderSheetPoint("water-2f-master-toilet", 9100, 2550, "马桶给水", "#0284c7")}
          </g>
        );
      }
      if (floor.id !== "1F") {
        return (
          <g data-layer="WaterPlanOverlay" pointerEvents="none">
            {renderSheetPolyline(`water-${floor.id}-cold`, [{ x: 9100, y: 7800 }, { x: 9100, y: 4550 }, { x: 8200, y: 4550 }], "#0284c7")}
            {renderSheetPoint(`water-${floor.id}-equipment`, 8200, 4550, "设备给水", "#0284c7")}
          </g>
        );
      }
      return (
        <g data-layer="WaterPlanOverlay" pointerEvents="none">
          {renderBoundConstructionAnchors("waterSupplyPlan")}
          {renderSheetPoint("water-yard", 8400, 8800, "庭院龙头", "#0284c7")}
        </g>
      );
    }

    if (sheetMode === "drainagePlan") {
      if (floor.id === "2F") {
        return (
          <g data-layer="DrainagePlanOverlay" pointerEvents="none">
            {renderSheetPolyline("drain-2f-main", [{ x: 9400, y: 7800 }, { x: 9400, y: 4550 }, { x: 8050, y: 4550 }], "#92400e")}
            {renderSheetPolyline("drain-2f-master-main", [{ x: 9400, y: 3050 }, { x: 9220, y: 1450 }, { x: 9100, y: 2550 }, { x: 8360, y: 980 }, { x: 8050, y: 2250 }], "#92400e")}
            {renderSheetPoint("drain-2f-guest-vanity", 8050, 4550, "客卫台盆", "#92400e")}
            {renderSheetPoint("drain-2f-guest-floor", 8500, 5100, "客卫地漏", "#92400e")}
            {renderSheetPoint("drain-2f-master-vanity", 9220, 1450, "双盆排水", "#92400e")}
            {renderSheetPoint("drain-2f-master-toilet", 9100, 2550, "马桶排污", "#92400e")}
            {renderSheetPoint("drain-2f-master-shower", 8360, 980, "淋浴地漏", "#92400e")}
            {renderSheetPoint("drain-2f-master-tub", 8050, 2250, "浴缸排水", "#92400e")}
            {renderSheetPoint("drain-2f-master-dry", 8650, 2100, "干区地漏", "#92400e")}
          </g>
        );
      }
      if (floor.id !== "1F") {
        return (
          <g data-layer="DrainagePlanOverlay" pointerEvents="none">
            {renderSheetPolyline(`drain-${floor.id}-main`, [{ x: 9400, y: 7800 }, { x: 9400, y: 4550 }, { x: 8200, y: 4550 }], "#92400e")}
            {renderSheetPoint(`drain-${floor.id}-sump`, 8200, 4550, "集水/排水", "#92400e")}
          </g>
        );
      }
      return (
        <g data-layer="DrainagePlanOverlay" pointerEvents="none">
          {renderSheetPolyline("drain-yard", [{ x: 6050, y: 9600 }, { x: 8500, y: 9600 }, { x: 9400, y: 7800 }], "#92400e", true)}
          {renderBoundConstructionAnchors("drainagePlan")}
          {renderSheetPoint("drain-yard-point", 6050, 9600, "庭院地漏", "#92400e")}
        </g>
      );
    }

    if (sheetMode === "ceilingPlan") {
      if (floor.id === "2F") {
        return (
          <g data-layer="CeilingPlanOverlay" pointerEvents="none">
            <rect x={1150} y={5320} width={2600} height={1700} rx={220} fill="rgba(14,165,233,0.08)" stroke="#0ea5e9" strokeDasharray="120 90" strokeWidth={46} />
            <rect x={7050} y={3500} width={2100} height={1500} rx={220} fill="rgba(14,165,233,0.08)" stroke="#0ea5e9" strokeDasharray="120 90" strokeWidth={46} />
            <rect x={7681} y={350} width={1814} height={2700} rx={220} fill="rgba(14,165,233,0.08)" stroke="#0ea5e9" strokeDasharray="120 90" strokeWidth={46} />
            <rect x={7950} y={3720} width={680} height={260} rx={90} fill="#e0f2fe" stroke="#0284c7" strokeWidth={34} />
            <text x={7900} y={3600} fill="#0284c7" fontSize={150} fontWeight={800}>卫浴风口</text>
            <rect x={8080} y={720} width={740} height={300} rx={90} fill="#e0f2fe" stroke="#0284c7" strokeWidth={34} />
            <text x={7980} y={620} fill="#0284c7" fontSize={150} fontWeight={800}>主卫风暖</text>
            <rect x={8840} y={1180} width={520} height={360} rx={80} fill="#fff" stroke="#0284c7" strokeWidth={32} />
            <text x={8740} y={1080} fill="#0284c7" fontSize={150} fontWeight={800}>镜柜检修</text>
            <rect x={5020} y={3920} width={620} height={420} rx={80} fill="#fff" stroke="#0284c7" strokeWidth={32} />
            <text x={4960} y={3840} fill="#0284c7" fontSize={150} fontWeight={800}>检修</text>
          </g>
        );
      }
      if (floor.id !== "1F") {
        return (
          <g data-layer="CeilingPlanOverlay" pointerEvents="none">
            <rect x={1150} y={5320} width={7500} height={1700} rx={220} fill="rgba(14,165,233,0.08)" stroke="#0ea5e9" strokeDasharray="120 90" strokeWidth={46} />
            <rect x={7850} y={4300} width={850} height={280} rx={90} fill="#e0f2fe" stroke="#0284c7" strokeWidth={34} />
            <text x={7800} y={4170} fill="#0284c7" fontSize={150} fontWeight={800}>设备风口</text>
            <rect x={5000} y={5850} width={620} height={420} rx={80} fill="#fff" stroke="#0284c7" strokeWidth={32} />
            <text x={4940} y={5770} fill="#0284c7" fontSize={150} fontWeight={800}>检修</text>
          </g>
        );
      }
      return (
        <g data-layer="CeilingPlanOverlay" pointerEvents="none">
          <rect x={1150} y={5320} width={2600} height={1700} rx={220} fill="rgba(14,165,233,0.08)" stroke="#0ea5e9" strokeDasharray="120 90" strokeWidth={46} />
          <rect x={5750} y={850} width={3200} height={1850} rx={220} fill="rgba(14,165,233,0.08)" stroke="#0ea5e9" strokeDasharray="120 90" strokeWidth={46} />
          <rect x={7850} y={1240} width={850} height={280} rx={90} fill="#e0f2fe" stroke="#0284c7" strokeWidth={34} />
          <text x={7900} y={1130} fill="#0284c7" fontSize={150} fontWeight={800}>风口</text>
          <rect x={5950} y={2480} width={620} height={420} rx={80} fill="#fff" stroke="#0284c7" strokeWidth={32} />
          <text x={5890} y={2400} fill="#0284c7" fontSize={150} fontWeight={800}>检修</text>
        </g>
      );
    }

    if (sheetMode === "wallFinishPlan") {
      if (floor.id === "2F") {
        return (
          <g data-layer="WallFinishPlanOverlay" pointerEvents="none">
            <rect x={7681} y={350} width={1814} height={2700} rx={120} fill="none" stroke="#7c5f42" strokeDasharray="120 90" strokeWidth={40} />
            <text x={7860} y={780} fill="#7c5f42" fontSize={158} fontWeight={900}>主卫墙面暖灰大砖</text>
            <line x1={1150} y1={5320} x2={3897} y2={5320} stroke="#a16207" strokeLinecap="round" strokeDasharray="120 90" strokeWidth={36} />
            <text x={1280} y={5200} fill="#a16207" fontSize={150} fontWeight={900}>卧室乳胶漆 / 局部木饰面</text>
            <line x1={6542} y1={3500} x2={9495} y2={3500} stroke="#64748b" strokeLinecap="round" strokeDasharray="120 90" strokeWidth={36} />
            <text x={6800} y={3380} fill="#475569" fontSize={150} fontWeight={900}>卫浴墙砖 / 防水基层</text>
          </g>
        );
      }
      return (
        <g data-layer="WallFinishPlanOverlay" pointerEvents="none">
          <line x1={950} y1={5150} x2={3897} y2={5150} stroke="#a16207" strokeLinecap="round" strokeDasharray="120 90" strokeWidth={36} />
          <text x={1280} y={5020} fill="#a16207" fontSize={150} fontWeight={900}>{floor.id === "1F" ? "客厅重点墙 / 乳胶漆" : "地下层耐擦墙面"}</text>
          <line x1={5383} y1={350} x2={9495} y2={350} stroke="#64748b" strokeLinecap="round" strokeDasharray="120 90" strokeWidth={36} />
          <text x={5800} y={720} fill="#475569" fontSize={150} fontWeight={900}>{floor.id === "1F" ? "餐厨墙砖 / 防油污" : "设备区防潮墙面"}</text>
        </g>
      );
    }

    if (sheetMode === "materialPlan") {
      const legendX = planBounds.x + 720;
      const legendY = planBounds.y + 720;
      const materialRows = [
        ["M-01", "地面", "木地板 / 防滑砖 / 户外石材"],
        ["M-02", "墙面", "乳胶漆 / 墙砖 / 石材 / 木饰面"],
        ["C-01", "吊顶", "局部吊顶 / 灯槽 / 风口 / 检修口"],
        ["E/L/W", "机电", "插座 / 开关 / 灯光 / 给排水点位"]
      ];
      return (
        <g data-layer="MaterialPlanOverlay" pointerEvents="none">
          <rect x={legendX - 180} y={legendY - 300} width={5200} height={materialRows.length * 390 + 520} rx={180} fill="rgba(255,255,255,0.92)" stroke="rgba(148,163,184,0.45)" strokeWidth={24} />
          <text x={legendX} y={legendY - 60} fill="#0f172a" fontSize={210} fontWeight={900}>材料索引</text>
          {materialRows.map(([code, title, detail], index) => {
            const y = legendY + 310 + index * 390;
            return (
              <g key={code}>
                <text x={legendX} y={y} fill="#334155" fontSize={155} fontWeight={900}>{code}</text>
                <text x={legendX + 760} y={y} fill="#0f172a" fontSize={155} fontWeight={900}>{title}</text>
                <text x={legendX + 1500} y={y} fill="#64748b" fontSize={130} fontWeight={700}>{detail}</text>
              </g>
            );
          })}
        </g>
      );
    }

    if (sheetMode === "annotationPlan") {
      return (
        <g data-layer="AnnotationPlanOverlay" pointerEvents="none">
          {renderSheetPoint("annotation-site-measure", 1120, floor.id === "1F" ? 8200 : 7200, "现场复尺", "#c2410c", "square")}
          {renderSheetPoint("annotation-vendor", 5200, 4300, "厂家图纸", "#c2410c", "square")}
          {renderSheetPoint("annotation-waterproof", floor.id === "2F" ? 8360 : 8400, floor.id === "2F" ? 850 : 2400, "防水/检修", "#c2410c", "square")}
          <text x={1120} y={floor.id === "1F" ? -720 : 980} fill="#c2410c" fontSize={190} fontWeight={900}>待确认项集中标注，正式施工前逐项关闭。</text>
        </g>
      );
    }

    if (floor.id === "2F") {
      return (
        <g data-layer="FlooringPlanOverlay" pointerEvents="none">
          <rect x={950} y={5150} width={2947} height={2650} fill="rgba(202,138,4,0.08)" stroke="#ca8a04" strokeDasharray="110 90" strokeWidth={34} />
          <rect x={6542} y={3050} width={2953} height={4750} fill="rgba(148,163,184,0.10)" stroke="#64748b" strokeDasharray="110 90" strokeWidth={34} />
          <rect x={7681} y={350} width={1814} height={2700} fill="url(#masterBathStonePattern)" opacity={0.86} stroke="#9b8f80" strokeDasharray="110 90" strokeWidth={34} />
          <text x={1280} y={5550} fill="#a16207" fontSize={170} fontWeight={900}>木地板/卧室</text>
          <text x={6800} y={3500} fill="#475569" fontSize={170} fontWeight={900}>防滑砖/卫浴</text>
          <text x={7860} y={780} fill="#7c5f42" fontSize={158} fontWeight={900}>主卫暖灰大砖</text>
        </g>
      );
    }
    if (floor.id !== "1F") {
      return (
        <g data-layer="FlooringPlanOverlay" pointerEvents="none">
          <rect x={950} y={5150} width={8545} height={2650} fill="rgba(100,116,139,0.10)" stroke="#64748b" strokeDasharray="110 90" strokeWidth={34} />
          <text x={1280} y={5550} fill="#475569" fontSize={170} fontWeight={900}>防潮地坪/设备区</text>
        </g>
      );
    }

    return (
      <g data-layer="FlooringPlanOverlay" pointerEvents="none">
        <rect x={950} y={5150} width={2947} height={2650} fill="rgba(202,138,4,0.08)" stroke="#ca8a04" strokeDasharray="110 90" strokeWidth={34} />
        <rect x={5383} y={350} width={4112} height={2700} fill="rgba(148,163,184,0.10)" stroke="#64748b" strokeDasharray="110 90" strokeWidth={34} />
        <text x={1280} y={5550} fill="#a16207" fontSize={170} fontWeight={900}>木地板/客厅</text>
        <text x={5800} y={750} fill="#475569" fontSize={170} fontWeight={900}>防滑砖/餐厨</text>
        <text x={4050} y={8650} fill="#166534" fontSize={170} fontWeight={900}>户外石材平台</text>
      </g>
    );
  }

  function getStructureLabelPlacement(label: ObjectLabel) {
    return label.y - planBounds.y < 1200 ? "below" : "above";
  }

  function renderStructureLabelLayer(context: "2d" | "3d") {
    return (
      <g data-layer={`ObjectLabelLayer-${context}`} pointerEvents="none">
        {filteredStructureLabels.map((label) => {
          const selected = label.type !== "Room" && selectedInteractionObjectId === label.id;
          const hovered = isObjectHovered(label.id);
          if (!selected && !hovered && !showObjectIds) return null;
          const mode = selected ? "selected" : hovered ? "hover" : "debug";
          const responsiveClass = mode === "selected"
            ? "block"
            : mode === "hover"
              ? "hidden [@media(hover:hover)]:block"
              : "hidden sm:block";
          const toneClass = mode === "selected"
            ? "border-blue-950 bg-blue-700 text-white ring-[3px] ring-white/95"
            : mode === "hover"
              ? "border-slate-950 bg-slate-950 text-white ring-[3px] ring-white/95"
              : "border-slate-700 bg-white/95 text-slate-950 ring-2 ring-white/90";
          const placement = getStructureLabelPlacement(label);

          return (
            <foreignObject
              key={`${context}-${label.id}`}
              x={label.x - 1450}
              y={placement === "below" ? label.y + 180 : label.y - 980}
              width={2900}
              height={900}
              overflow="visible"
            >
              <div className={`${responsiveClass} mx-auto w-max max-w-[2800px] rounded-md border-2 px-4 py-3 text-center shadow-[0_12px_28px_rgba(15,23,42,0.38)] ${toneClass}`}>
                <div className="whitespace-nowrap text-[240px] font-extrabold leading-none">{developerMode ? label.id : label.name}</div>
                {(mode !== "debug" || selected) && <div className="mt-2 max-w-[2700px] truncate text-[175px] font-semibold leading-none opacity-95">{label.name}</div>}
                {mode === "hover" && <div className="mt-2 text-[145px] font-semibold uppercase leading-none opacity-75">{label.type}</div>}
              </div>
            </foreignObject>
          );
        })}
      </g>
    );
  }

  function renderStructureHtmlLabelLayer() {
    return (
      <div className="pointer-events-none absolute inset-0 z-[47]" data-layer="ObjectLabelLayer-2d" data-coordinate-system="millimeter-floor-plan">
        {filteredStructureLabels.map((label) => {
          const selected = label.type !== "Room" && selectedInteractionObjectId === label.id;
          const hovered = isObjectHovered(label.id);
          if (!selected && !hovered && !showObjectIds) return null;
          const labelPosition = toPlanPercent({ x: label.x, y: label.y }, planBounds);
          const mode = selected ? "selected" : hovered ? "hover" : "debug";
          const responsiveClass = mode === "selected"
            ? "block"
            : mode === "hover"
              ? "hidden [@media(hover:hover)]:block"
              : "hidden sm:block";
          const toneClass = mode === "selected"
            ? "border-blue-950 bg-blue-700 text-white ring-2 ring-white"
            : mode === "hover"
              ? "border-slate-950 bg-slate-950 text-white ring-2 ring-white"
              : "border-slate-700 bg-white/95 text-slate-950 ring-1 ring-white";
          const placement = getStructureLabelPlacement(label);

          return (
            <div
              key={`2d-html-${label.id}`}
              className={`${responsiveClass} absolute w-max max-w-60 -translate-x-1/2 ${placement === "below" ? "translate-y-0" : "-translate-y-full"} rounded-md border-2 px-3 py-2 text-center shadow-[0_8px_20px_rgba(15,23,42,0.34)] ${toneClass}`}
              style={{
                left: `${labelPosition.x}%`,
                top: `${labelPosition.y}%`,
                marginTop: placement === "below" ? "8px" : "-8px"
              }}
            >
              <div className={`${mode === "selected" ? "text-base" : "text-sm"} whitespace-nowrap font-extrabold leading-none`}>{developerMode ? label.id : label.name}</div>
              {(mode !== "debug" || selected) && <div className="mt-1 max-w-56 truncate text-xs font-semibold leading-tight opacity-95">{label.name}</div>}
              {mode === "hover" && <div className="mt-1 text-[10px] font-semibold uppercase leading-none opacity-70">{label.type}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  function getPolygonCenter(points: MmPoint[]) {
    if (points.length === 0) return { x: planBounds.x + planBounds.width / 2, y: planBounds.y + planBounds.height / 2 };
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length
    };
  }

  function renderMobilePresentationLabelLayer() {
    if (!mobilePresentationMode) return null;
    const showDetails = mobileDisplayLevel !== "simple";
    const importantFurniture = showDetails ? furniture.filter((item) => item.dimensions.width * item.dimensions.depth >= 4200 || item.moduleCategory).slice(0, 18) : [];
    return (
      <div className="pointer-events-none absolute inset-0 z-[48]" data-layer="MobilePresentationLabelLayer">
        {houseStructure.rooms.map((room) => {
          const center = toPlanPercent(getPolygonCenter(room.boundary), planBounds);
          return (
            <div
              key={`mobile-room-${room.id}`}
              className="absolute max-w-[9rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/82 px-2.5 py-1 text-center text-[11px] font-semibold leading-tight text-stone-800 shadow-sm ring-1 ring-white/80"
              style={{ left: `${center.x}%`, top: `${center.y}%` }}
            >
              <span className="block truncate">{room.name}</span>
              {showDetails && <span className="block text-[9px] text-stone-500">{(room.area / 1_000_000).toFixed(1)} m2</span>}
            </div>
          );
        })}
        {importantFurniture.map((item) => {
          const position = getFurnitureDisplayPosition(item);
          return (
            <div
              key={`mobile-furniture-${item.id}`}
              className="absolute max-w-[8.5rem] -translate-x-1/2 translate-y-3 rounded-full bg-stone-950/78 px-2 py-0.5 text-center text-[10px] font-semibold leading-tight text-white shadow-sm"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
            >
              <span className="block truncate">{item.name}</span>
              {showDetails && <span className="block text-[8px] text-white/72">{item.dimensions.width} x {item.dimensions.depth} cm</span>}
            </div>
          );
        })}
      </div>
    );
  }

  function renderDimensionLayer() {
    if (!showDimensionLayer) return null;

    return (
      <g data-layer="DimensionLayer" pointerEvents="none">
        {houseStructure.walls.map((wall) => {
          const point = getWallLabelPoint(wall);
          const text = wall.kind === "arc" ? `${wall.length} mm` : `${wall.length} mm`;
          return (
            <text
              key={`dimension-${wall.id}`}
              x={point.x}
              y={point.y + 230}
              fill="#111827"
              fontSize={150}
              fontWeight={800}
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth={38}
              textAnchor="middle"
            >
              {text}
            </text>
          );
        })}
        {houseStructure.partitions.map((partition) => (
          <text
            key={`dimension-${partition.id}`}
            x={(partition.start.x + partition.end.x) / 2}
            y={(partition.start.y + partition.end.y) / 2 + 220}
            fill="#0f766e"
            fontSize={135}
            fontWeight={800}
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth={34}
            textAnchor="middle"
          >
            {getLineLength(partition.start, partition.end)} mm
          </text>
        ))}
        {houseStructure.stairs.map((stair) => (
          <text
            key={`dimension-${stair.id}`}
            x={(stair.start.x + stair.end.x) / 2}
            y={(stair.start.y + stair.end.y) / 2 + 240}
            fill="#6d28d9"
            fontSize={135}
            fontWeight={800}
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth={34}
            textAnchor="middle"
          >
            {getLineLength(stair.start, stair.end)} mm
          </text>
        ))}
        {(houseStructure.columns ?? []).map((column) => (
          <text
            key={`dimension-${column.id}`}
            x={column.center.x}
            y={column.center.y + column.radius + 250}
            fill="#1f2937"
            fontSize={132}
            fontWeight={900}
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth={34}
            textAnchor="middle"
          >
            Φ{column.radius * 2} mm
          </text>
        ))}
        {houseStructure.doors.map((door) => {
          const host = getHostLine(door.hostId, door.hostType);
          if (!host) return null;
          const segment = getSegmentOnLine(host.start, host.end, door.positionOnWall, door.width);
          return (
            <text
              key={`dimension-${door.id}`}
              x={segment.center.x + segment.normal.x * 360}
              y={segment.center.y + segment.normal.y * 360}
              fill="#334155"
              fontSize={130}
              fontWeight={800}
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth={32}
              textAnchor="middle"
            >
              {door.width} mm
            </text>
          );
        })}
        {houseStructure.windows.map((windowObject) => {
          const host = getHostLine(windowObject.hostId, windowObject.hostType);
          if (!host) return null;
          const segment = getSegmentOnLine(host.start, host.end, windowObject.positionOnWall, windowObject.width);
          return (
            <text
              key={`dimension-${windowObject.id}`}
              x={segment.center.x + segment.normal.x * 310}
              y={segment.center.y + segment.normal.y * 310}
              fill="#0369a1"
              fontSize={130}
              fontWeight={800}
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth={32}
              textAnchor="middle"
            >
              {windowObject.width} mm
            </text>
          );
        })}
      </g>
    );
  }

  function renderVerificationStatusLayer() {
    if (!visibleVerificationStatusLayer) return null;
    const paint = (object: { id: string; verificationMeta?: HouseWall["verificationMeta"] }) => {
      const state = getVerificationDisplayState(object.verificationMeta, verificationConflictIds.has(object.id));
      return { state, ...verificationDisplayStyles[state] };
    };
    const statusLine = (id: string, start: MmPoint, end: MmPoint, object: { id: string; verificationMeta?: HouseWall["verificationMeta"] }, width = 58) => {
      const style = paint(object);
      return <line key={`verification-${id}`} data-verification-state={style.state} x1={start.x} y1={start.y} x2={end.x} y2={end.y} fill="none" stroke={style.color} strokeDasharray={style.dasharray} strokeLinecap="round" strokeWidth={width} opacity={0.88} />;
    };

    return (
      <g data-layer="DimensionVerificationLayer" pointerEvents="none">
        {houseStructure.rooms.map((room) => {
          const style = paint(room);
          return <polygon key={`verification-${room.id}`} data-verification-state={style.state} points={room.boundary.map((point) => `${point.x},${point.y}`).join(" ")} fill={style.background} fillOpacity={0.08} stroke={style.color} strokeDasharray={style.dasharray} strokeWidth={46} opacity={0.9} />;
        })}
        {houseStructure.outdoors.map((outdoor) => {
          const style = paint(outdoor);
          return <polygon key={`verification-${outdoor.id}`} data-verification-state={style.state} points={outdoor.polygon.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={style.color} strokeDasharray={style.dasharray} strokeWidth={54} opacity={0.88} />;
        })}
        {houseStructure.walls.map((wall) => {
          const style = paint(wall);
          return wall.kind === "arc"
            ? <path key={`verification-${wall.id}`} data-verification-state={style.state} d={getArcPath(wall)} fill="none" stroke={style.color} strokeDasharray={style.dasharray} strokeLinecap="round" strokeWidth={Math.max(54, wall.thickness * 0.32)} opacity={0.9} />
            : statusLine(wall.id, wall.start, wall.end, wall, Math.max(54, wall.thickness * 0.32));
        })}
        {houseStructure.partitions.map((partition) => statusLine(partition.id, partition.start, partition.end, partition, Math.max(48, partition.thickness * 0.55)))}
        {houseStructure.stairs.map((stair) => statusLine(stair.id, stair.start, stair.end, stair, 74))}
        {houseStructure.columns.map((column) => {
          const style = paint(column);
          return <circle key={`verification-${column.id}`} data-verification-state={style.state} cx={column.center.x} cy={column.center.y} fill="none" r={column.radius + 64} stroke={style.color} strokeDasharray={style.dasharray} strokeWidth={54} opacity={0.9} />;
        })}
        {houseStructure.doors.map((door) => {
          const host = getHostLine(door.hostId, door.hostType);
          if (!host) return null;
          const segment = getSegmentOnLine(host.start, host.end, door.positionOnWall, door.width);
          return statusLine(door.id, segment.start, segment.end, door, 62);
        })}
        {houseStructure.windows.map((windowObject) => {
          const host = getHostLine(windowObject.hostId, windowObject.hostType);
          if (!host) return null;
          const segment = getSegmentOnLine(host.start, host.end, windowObject.positionOnWall, windowObject.width);
          return statusLine(windowObject.id, segment.start, segment.end, windowObject, 62);
        })}
        {houseStructure.bayWindows.map((bayWindow) => {
          const host = getHostLine(bayWindow.wallId, "wall");
          if (!host) return null;
          const segment = getSegmentOnLine(host.start, host.end, bayWindow.positionOnWall, bayWindow.width);
          const style = paint(bayWindow);
          const points = [segment.start, segment.end, { x: segment.end.x + segment.normal.x * bayWindow.depth, y: segment.end.y + segment.normal.y * bayWindow.depth }, { x: segment.start.x + segment.normal.x * bayWindow.depth, y: segment.start.y + segment.normal.y * bayWindow.depth }];
          return <polygon key={`verification-${bayWindow.id}`} data-verification-state={style.state} points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={style.color} strokeDasharray={style.dasharray} strokeWidth={54} opacity={0.9} />;
        })}
        {houseStructure.skylights.map((skylight) => {
          const style = paint(skylight);
          return <rect key={`verification-${skylight.id}`} data-verification-state={style.state} x={skylight.center.x - skylight.width / 2} y={skylight.center.y - skylight.depth / 2} width={skylight.width} height={skylight.depth} fill="none" stroke={style.color} strokeDasharray={style.dasharray} strokeWidth={54} opacity={0.9} transform={`rotate(${skylight.rotation} ${skylight.center.x} ${skylight.center.y})`} />;
        })}
      </g>
    );
  }

  return (
    <div
      className={`relative min-h-0 flex-1 overscroll-contain ${mobilePresentationMode ? "h-full overflow-hidden bg-[#f7f3ec] p-0" : drawingDrivenMode ? "overflow-hidden bg-[#f2f1ed] p-2" : `overflow-auto bg-[#ece5da] ${focusMode ? "p-3" : "p-3 pb-36 sm:p-5 lg:pb-5"}`}`}
      data-mobile-presentation={mobilePresentationMode ? "true" : "false"}
    >
      <div className={`${furnitureImmersiveMode || yardImmersiveMode || mobilePresentationMode || drawingDrivenMode ? "hidden" : "block"} absolute left-5 top-5 z-10 rounded-2xl border border-white/80 bg-white/80 px-4 py-2 text-sm text-stone-500 shadow-sm backdrop-blur`}>
        {viewMode === "2d" ? `当前图纸 · ${planCanvasModeLabels[sheetMode]}` : `${floor.label} · 楼层 3D`}
      </div>

      {viewMode === "2d" ? (
        <div
          className={`relative grid h-full items-start ${
            mobilePresentationMode
              ? "min-h-0 touch-none overflow-hidden bg-[#f8f4ec] p-0"
              : `min-h-[calc(100vh-5.25rem)] overflow-auto border border-white/70 bg-white/60 shadow-inner sm:min-h-[560px] ${drawingDrivenMode ? "p-2" : "rounded-[1.75rem] p-3 pt-20 sm:pt-16"} ${
            showStructureDrawingPanel ? `gap-4 lg:justify-items-stretch ${focusMode ? "lg:grid-cols-[minmax(0,1fr)_280px]" : "lg:grid-cols-[260px_minmax(0,1fr)]"}` : "justify-items-center"
          }`
          }`}
          onMouseDownCapture={handleMobileObjectCapture}
          onPointerDownCapture={handleMobileObjectCapture}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onWheel={handleWheel}
        >
          {!drawingDrivenMode && !furnitureImmersiveMode && !mobilePresentationMode && <div
            className="absolute right-5 top-5 z-[60] flex max-w-[calc(100%-2.5rem)] items-center gap-1 overflow-x-auto rounded-2xl border border-white/80 bg-white/95 p-1 text-sm font-semibold text-stone-600 shadow-sm backdrop-blur"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {plannerMode === "edit" && (
              <>
                <button className="rounded-xl px-2 py-2 text-xs hover:bg-stone-100 disabled:text-stone-300" disabled={!canUndo} onClick={onUndo} title="撤销 (Ctrl/Cmd+Z)" type="button">撤销</button>
                <button className="rounded-xl px-2 py-2 text-xs hover:bg-stone-100 disabled:text-stone-300" disabled={!canRedo} onClick={onRedo} title="重做 (Ctrl/Cmd+Shift+Z)" type="button">重做</button>
                <span className="h-5 w-px bg-stone-200" />
              </>
            )}
            <select
              className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none"
              aria-label="当前图纸"
              value={sheetMode}
              onChange={(event) => setSheetMode(event.target.value)}
              title={planCanvasModeDescriptions[sheetMode]}
            >
              <optgroup label="正式图纸">
                {drawingSheetSelectTypes.map((mode) => (
                  <option key={mode} value={mode}>{drawingSheetTypeLabels[mode]}</option>
                ))}
              </optgroup>
              <optgroup label="检查/调试">
                {drawingCheckModes.map((mode) => (
                  <option key={mode} value={mode}>{planCanvasModeLabels[mode]}</option>
                ))}
              </optgroup>
            </select>
            <button className="rounded-xl bg-stone-900 px-3 py-2 text-xs text-white hover:bg-clay" onClick={() => setIsConstructionPackageOpen(true)} type="button">图纸包</button>
            <label className="hidden cursor-pointer items-center gap-2 rounded-xl px-2 py-2 hover:bg-stone-100 sm:flex">
              <input checked={showObjectIds} onChange={(event) => setShowObjectIds(event.target.checked)} type="checkbox" />
              <span className="whitespace-nowrap text-xs">显示对象 ID</span>
            </label>
            {isFurnitureSheetMode && (
              <label className="hidden cursor-pointer items-center gap-2 rounded-xl px-2 py-2 hover:bg-stone-100 sm:flex">
                <input checked={showFurnitureClearances} onChange={(event) => setShowFurnitureClearances(event.target.checked)} type="checkbox" />
                <span className="whitespace-nowrap text-xs">预留范围</span>
              </label>
            )}
            {showObjectIds && (
              <select className="hidden rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none sm:block" value={labelFilter} onChange={(event) => setLabelFilter(event.target.value as LabelFilter)}>
                <option value="all">全部标签</option>
                <option value="walls">墙体/隔断</option>
                <option value="openings">门窗</option>
                <option value="rooms">房间/院子</option>
                <option value="outdoor">院子构件</option>
                <option value="furniture">家具</option>
              </select>
            )}
            <button className="rounded-xl px-3 py-2 hover:bg-stone-100" onClick={() => zoomBy(-SCALE_STEP)} type="button">-</button>
            <span className="min-w-14 text-center">{Math.round(scale * 100)}%</span>
            <button className="rounded-xl px-3 py-2 hover:bg-stone-100" onClick={() => zoomBy(SCALE_STEP)} type="button">+</button>
            <button className="rounded-xl px-3 py-2 text-xs hover:bg-stone-100" onClick={resetViewport} type="button">复位</button>
          </div>}

          {furnitureImmersiveMode && (
            <div
              className="absolute right-5 top-5 z-[60] flex max-w-[calc(100%-2.5rem)] items-center gap-1 overflow-x-auto rounded-2xl border border-white/80 bg-white/95 p-1 text-xs font-semibold text-stone-600 shadow-sm backdrop-blur"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                className={`whitespace-nowrap rounded-xl px-3 py-2 ${furnitureLabelsVisible ? "bg-slate-900 text-white hover:bg-clay" : "hover:bg-stone-100"}`}
                onClick={() => updateFurnitureLabelsVisible(!furnitureLabelsVisible)}
                type="button"
              >
                标签：{furnitureLabelsVisible ? "显示" : "隐藏"}
              </button>
              <button className="rounded-xl px-3 py-2 hover:bg-stone-100" onClick={() => zoomBy(-SCALE_STEP)} type="button">-</button>
              <span className="min-w-12 text-center">{Math.round(scale * 100)}%</span>
              <button className="rounded-xl px-3 py-2 hover:bg-stone-100" onClick={() => zoomBy(SCALE_STEP)} type="button">+</button>
              <button className="rounded-xl bg-slate-900 px-3 py-2 text-white hover:bg-clay" onClick={resetViewport} type="button">100% 复位</button>
            </div>
          )}

          {!mobilePresentationMode && isConstructionPackageOpen && <div
            className="absolute left-5 top-5 z-[70] max-h-[calc(100%-2.5rem)] w-[min(760px,calc(100%-2.5rem))] overflow-auto rounded-2xl border border-white/80 bg-white/96 p-4 text-xs text-stone-600 shadow-soft backdrop-blur"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex flex-col gap-3 border-b border-stone-200 pb-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-clay">Construction Package</p>
                <h3 className="mt-1 text-base font-semibold text-ink">施工图纸包</h3>
                <p className="mt-1 leading-5 text-stone-500">顶部“当前图纸”下拉用来查看正式图纸和结构联动检查；切到结构图/拆改施工图时可编辑墙体门窗，切到家具定位图时编辑家具，给排水、灯光、吊顶和材料图先作为施工表达层查看。</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button className="rounded-xl bg-ink px-3 py-2 font-semibold text-white hover:bg-clay" onClick={() => requestConstructionExport("html")} type="button">导出 HTML</button>
                <button className="rounded-xl bg-blue-50 px-3 py-2 font-semibold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100" onClick={() => requestConstructionExport("json")} type="button">导出 JSON 清单</button>
                <button className="rounded-xl bg-blue-50 px-3 py-2 font-semibold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100" onClick={() => requestConstructionExport("csv")} type="button">导出 CSV 清单</button>
                <button className="rounded-xl bg-slate-100 px-3 py-2 font-semibold text-stone-600 hover:bg-stone-200" onClick={() => setIsConstructionPackageOpen(false)} type="button">收起</button>
              </div>
            </div>

            {pendingConstructionExport && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">施工包检查</p><p className="mt-1 text-[11px] leading-5">以下项目不会阻止导出，并会同步写入 HTML 总说明。建议在交付施工前逐项关闭。</p></div><span className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold uppercase">{pendingConstructionExport}</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {([['草稿项',constructionPackageValidation.warningCounts.draft],['待确认项',constructionPackageValidation.warningCounts.todo],['孤立引用',constructionPackageValidation.warningCounts.orphan],['插座缺少高度',constructionPackageValidation.warningCounts.socketMissingHeight],['开关缺少灯具',constructionPackageValidation.warningCounts.switchMissingLights],['灯具缺少色温',constructionPackageValidation.warningCounts.lightMissingColorTemperature],['排水缺少类型',constructionPackageValidation.warningCounts.drainageMissingType],['铺装/墙面缺材质',constructionPackageValidation.warningCounts.finishMissingMaterial],['庭院待复核',constructionPackageValidation.warningCounts.yardNeedsReview]] as const).map(([label,count]) => <div key={label} className="rounded-lg bg-white p-2 ring-1 ring-amber-100"><p className="text-[10px] text-amber-700">{label}</p><p className="mt-1 text-lg font-bold">{count}</p></div>)}
              </div>
              <div className="mt-3 flex justify-end gap-2"><button className="rounded-lg bg-white px-3 py-2 font-semibold ring-1 ring-amber-200" onClick={() => setPendingConstructionExport(null)} type="button">返回检查</button><button className="rounded-lg bg-amber-800 px-3 py-2 font-semibold text-white" onClick={continueConstructionExport} type="button">继续导出</button></div>
            </div>}

            <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink">图纸目录</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">{constructionSheets.length} 张</span>
                </div>
                <div className="max-h-96 space-y-2 overflow-auto pr-1">
                  {constructionSheets.map((sheet) => (
                    <div key={sheet.id} className="rounded-xl border border-stone-200 bg-slate-50 p-2">
                      <div className="grid grid-cols-[72px_1fr_78px] gap-2">
                        <input className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 font-semibold text-ink outline-none" value={sheet.sheetNo} onChange={(event) => updateConstructionSheet(sheet.id, { sheetNo: event.target.value })} />
                        <input className="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 font-semibold text-ink outline-none" value={sheet.title} onChange={(event) => updateConstructionSheet(sheet.id, { title: event.target.value })} />
                        <button className="rounded-lg bg-white px-2 py-1.5 font-semibold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50" onClick={() => setSheetMode(getConstructionSheetViewType(sheet))} type="button">查看</button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <input className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 outline-none" value={sheet.scale} onChange={(event) => updateConstructionSheet(sheet.id, { scale: event.target.value })} />
                        <input className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 outline-none" value={sheet.status} onChange={(event) => updateConstructionSheet(sheet.id, { status: event.target.value })} />
                        <input className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 outline-none" value={sheet.audience} onChange={(event) => updateConstructionSheet(sheet.id, { audience: event.target.value })} />
                      </div>
                      <textarea className="mt-2 min-h-14 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 leading-5 outline-none" value={sheet.note} onChange={(event) => updateConstructionSheet(sheet.id, { note: event.target.value })} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 leading-5 text-amber-900">
                  <p className="font-semibold">怎么查看和编辑</p>
                  <p className="mt-1">点目录里的“查看”会切换到对应图纸；真正编辑仍在画布上完成：结构对象用左侧绘制工具，家具对象用家具定位图拖动和右侧当前对象改尺寸材质。</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 leading-5 text-amber-900">
                  <p className="font-semibold">施工队看图顺序</p>
                  <p className="mt-1">先看 A-00/A-01 确认范围，再看 A-02/A-03 定结构，最后按 F/E/L/W/C/M/N 分专业施工和确认。</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink">关键数值表</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">可改</span>
                  </div>
                  <div className="max-h-80 space-y-2 overflow-auto pr-1">
                    {constructionSpecs.map((spec) => (
                      <div key={spec.id} className="rounded-xl border border-stone-200 bg-white p-2">
                        <div className="grid grid-cols-[70px_1fr] gap-2">
                          <input className="rounded-lg border border-stone-200 px-2 py-1.5 font-semibold text-stone-500 outline-none" value={spec.category} onChange={(event) => updateConstructionSpec(spec.id, { category: event.target.value })} />
                          <input className="rounded-lg border border-stone-200 px-2 py-1.5 font-semibold text-ink outline-none" value={spec.item} onChange={(event) => updateConstructionSpec(spec.id, { item: event.target.value })} />
                        </div>
                        <input className="mt-2 w-full rounded-lg border border-stone-200 px-2 py-1.5 font-semibold text-blue-700 outline-none" value={spec.value} onChange={(event) => updateConstructionSpec(spec.id, { value: event.target.value })} />
                        <textarea className="mt-2 min-h-12 w-full rounded-lg border border-stone-200 px-2 py-1.5 leading-5 outline-none" value={spec.note} onChange={(event) => updateConstructionSpec(spec.id, { note: event.target.value })} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>}

          {!mobilePresentationMode && isCleanupPanelOpen && <div
            className="absolute left-5 top-5 z-30 max-h-[calc(100%-2.5rem)] w-72 overflow-auto rounded-2xl border border-white/80 bg-white/95 p-3 text-xs text-stone-600 shadow-sm backdrop-blur"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-ink">底图清理与美化</span>
              <button className="rounded-lg px-2 py-1 font-semibold text-stone-500 hover:bg-stone-100" onClick={() => setIsCleanupPanelOpen(false)} type="button">收起</button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-stone-500">风格预设</span>
                <select
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 font-semibold text-ink outline-none"
                  value={floorPlanVisualSettings.preset}
                  onChange={(event) => applyPreset(event.target.value as FloorPlanPreset)}
                >
                  {Object.entries(floorPlanPresetLabels).map(([preset, label]) => (
                    <option key={preset} value={preset}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="grid grid-cols-[56px_1fr_40px] items-center gap-2">
                <span>透明度</span>
                <input min="0.3" max="1" step="0.05" type="range" value={floorPlanVisualSettings.opacity} onChange={(event) => updateVisualSettings({ opacity: Number(event.target.value) })} />
                <span>{Math.round(floorPlanVisualSettings.opacity * 100)}%</span>
              </label>
              <label className="grid grid-cols-[56px_1fr_40px] items-center gap-2">
                <span>对比度</span>
                <input min="0.7" max="1.4" step="0.05" type="range" value={floorPlanVisualSettings.contrast} onChange={(event) => updateVisualSettings({ contrast: Number(event.target.value) })} />
                <span>{Math.round(floorPlanVisualSettings.contrast * 100)}%</span>
              </label>
              <label className="grid grid-cols-[56px_1fr_40px] items-center gap-2">
                <span>亮度</span>
                <input min="0.7" max="1.35" step="0.05" type="range" value={floorPlanVisualSettings.brightness} onChange={(event) => updateVisualSettings({ brightness: Number(event.target.value) })} />
                <span>{Math.round(floorPlanVisualSettings.brightness * 100)}%</span>
              </label>
              <label className="grid grid-cols-[56px_1fr_40px] items-center gap-2">
                <span>饱和度</span>
                <input min="0" max="1" step="0.05" type="range" value={floorPlanVisualSettings.saturation} onChange={(event) => updateVisualSettings({ saturation: Number(event.target.value), grayscale: false })} />
                <span>{Math.round(floorPlanVisualSettings.saturation * 100)}%</span>
              </label>
              <label className="flex items-center gap-2 rounded-lg bg-white px-2 py-1">
                <input checked={floorPlanVisualSettings.grayscale} onChange={(event) => updateVisualSettings({ grayscale: event.target.checked })} type="checkbox" />
                灰度模式
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["removeTextMarks", "文字/面积"],
                  ["removeWhiteBorder", "白色边框"],
                  ["hideDebugFrames", "旧白模框"],
                  ["lineEnhance", "线条增强"],
                  ["cleanWhiteBackground", "干净白底"],
                  ["sharpen", "锐化"]
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1 rounded-lg bg-white px-2 py-1">
                    <input
                      checked={Boolean(floorPlanVisualSettings[key as keyof FloorPlanVisualSettings])}
                      onChange={(event) => updateVisualSettings({ [key]: event.target.checked } as Partial<FloorPlanVisualSettings>)}
                      type="checkbox"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className="col-span-2 rounded-xl bg-ink px-3 py-2 font-semibold text-white hover:bg-ink/90" onClick={repairToHighDefinitionPlan} type="button">高清修复底图</button>
                <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={addHeuristicCleanPatches} type="button">局部清理痕迹</button>
                <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={clearWhiteBorderVisually} type="button">去除白边</button>
                <button className={`rounded-xl px-3 py-2 font-semibold ${isManualCleanupMode ? "bg-blue-600 text-white" : "bg-white text-ink ring-1 ring-stone-200"}`} onClick={() => setIsManualCleanupMode(!isManualCleanupMode)} type="button">手动清理</button>
                <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50 disabled:text-stone-300" disabled={!cleanupSelection} onClick={addSelectionPatch} type="button">清理选区</button>
                <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50 disabled:text-stone-300" disabled={!cleanPatches.length} onClick={undoCleanPatch} type="button">撤销清理</button>
                <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50 disabled:text-stone-300" disabled={!cleanPatches.length} onClick={clearCleanPatches} type="button">清空清理</button>
                <button className="col-span-2 rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={exportCleanFloorPlan} type="button">导出当前 PNG</button>
              </div>

              <div className="rounded-xl bg-slate-50 p-2 leading-5 text-slate-500">
                当前核心是一套可校验结构模型。底图只作参考，正式图纸、家具定位和 2D/3D 展示视图都从这套模型派生，避免多张图互相不同步。
              </div>

              <div className="space-y-2 border-t border-stone-200 pt-2">
                <p className="font-semibold text-ink">图层</p>
                {[
                  ["semanticOverlay", "SemanticOverlayLayer"],
                  ["furnitureOverlay", "FurnitureOverlayLayer"],
                  ["debug", "DebugLayer"]
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-2">
                    <span>{label}</span>
                    <input
                      checked={layerVisibility[key as keyof typeof layerVisibility]}
                      onChange={(event) => updateLayerVisibility(key as keyof typeof layerVisibility, event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-2 border-t border-stone-200 pt-2">
                <p className="font-semibold text-ink">导出内容</p>
                <label className="flex items-center gap-2"><input checked={exportOptions.overlay} onChange={(event) => setExportOptions({ ...exportOptions, overlay: event.target.checked })} type="checkbox" />包含语义对象</label>
                <label className="flex items-center gap-2"><input checked={exportOptions.roomNames} onChange={(event) => setExportOptions({ ...exportOptions, roomNames: event.target.checked })} type="checkbox" />包含房间名称</label>
                <label className="flex items-center gap-2"><input checked={exportOptions.furniture} onChange={(event) => setExportOptions({ ...exportOptions, furniture: event.target.checked })} type="checkbox" />包含家具对象</label>
              </div>

              {cleanPatches.length > 0 && (
                <div className="space-y-1 border-t border-stone-200 pt-2">
                  <p className="font-semibold text-ink">清理记录 {cleanPatches.length}</p>
                  {cleanPatches.slice(-4).map((patch) => (
                    <div key={patch.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1">
                      <span className="truncate">{patch.id}</span>
                      <button className="font-semibold text-red-500" onClick={() => removeCleanPatch(patch.id)} type="button">删除</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>}

          {showStructureDrawingPanel && (
            <aside
              className={`relative z-50 max-h-[calc(100vh-8rem)] w-full overflow-y-auto overscroll-contain rounded-2xl border border-white/80 bg-white/94 p-3 text-xs text-stone-600 shadow-sm backdrop-blur ${focusMode ? "lg:order-2" : ""}`}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-stone-200 pb-3">
                <div>
                  <p className="font-semibold text-ink">{yardImmersiveMode ? "庭院绘制" : "户型绘制"}</p>
                  <p className="mt-0.5 text-stone-400">{yardImmersiveMode ? "边界 / 铺装 / 绿化" : "mm 结构对象"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="rounded-lg px-2 py-1 font-semibold text-stone-500 hover:bg-stone-100" onClick={() => onPlannerModeChange("view")} type="button">退出</button>
                </div>
              </div>

              {focusMode && (
                <label className="mb-3 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs shadow-sm">
                  <span className="shrink-0 font-semibold text-blue-700">楼层</span>
                  <select
                    className="min-w-0 flex-1 bg-transparent font-semibold text-ink outline-none"
                    value={floor.id}
                    onChange={(event) => onSelectFloor(event.target.value as Floor["id"])}
                  >
                    {floors.map((item) => (
                      <option key={item.id} value={item.id}>{item.label} · {item.subtitle}</option>
                    ))}
                  </select>
                </label>
              )}

              <div className="space-y-3">
                {sheetMode === "structureSyncCheck" && (
                  <div className="rounded-xl border border-stone-200 bg-white p-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-semibold text-ink">联动颜色</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">{Object.keys(wallSyncOverrides).length}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {syncPaintTools.map((tool) => (
                        <button
                          key={tool.id}
                          className={`flex min-h-10 items-center gap-2 rounded-lg border px-2 py-1.5 text-left font-semibold transition ${
                            syncPaintRuleId === tool.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-stone-200 bg-slate-50 text-stone-600 hover:bg-stone-100"
                          }`}
                          onClick={() => handleSyncPaintToolSelect(tool.id)}
                          type="button"
                        >
                          <span className="size-4 shrink-0 rounded-full border border-stone-300" style={{ backgroundColor: tool.color }} />
                          <span className="min-w-0 truncate">{tool.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-stone-200 bg-white p-2 leading-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">图层隔离</span>
                    <span className={`rounded-lg px-2 py-1 font-semibold ${wallEditableSheetTypes.has(sheetMode as DrawingSheetType) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-stone-500"}`}>
                      {wallEditableSheetTypes.has(sheetMode as DrawingSheetType) ? "墙体可编辑" : "墙体只读"}
                    </span>
                  </div>
                  <p className="mt-1 text-stone-500">{yardImmersiveMode ? "庭院模式：默认绿地，按区域叠加小路、硬地和花境。" : getLayerInteractionLabel()}</p>
                  <p className="mt-1 text-[11px] font-semibold text-stone-400">{yardImmersiveMode ? "普通滚轮滚动面板，按 Ctrl/⌘ 滚轮缩放画布。" : `可动墙图纸：${wallEditableSheetTypeLabel}`}</p>
                </div>

                <div className="rounded-xl bg-slate-50 p-2 leading-5">
                  <p className="font-semibold text-ink">统一坐标</p>
                  <p>原点 ({houseStructure.coordinateSystem.origin.x}, {houseStructure.coordinateSystem.origin.y}) · {houseStructure.coordinateSystem.width} x {houseStructure.coordinateSystem.height} mm</p>
                  <p className="text-stone-400">单位 {houseStructure.coordinateSystem.unit} · 比例 {houseStructure.coordinateSystem.scale}:1</p>
                </div>

                {yardImmersiveMode && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-2 leading-5 text-emerald-950">
                    <p className="font-semibold">庭院画法</p>
                    <p className="mt-1 text-[11px]">先选“院子”画南院/北院边界；默认就是绿地。再用“铺小路 / 铺硬地 / 铺绿化”叠加材料区域。</p>
                  </div>
                )}

                <div className="space-y-2">
                  {visibleDrawToolSections.map((section) => (
                    <div key={section.title} className="rounded-xl border border-stone-200 bg-white p-2">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-semibold text-ink">{section.title}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">{section.tools.length}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {section.tools.map((tool) => (
                          <button
                            key={tool}
                            className={`min-h-[54px] rounded-xl px-2 py-2 text-left transition ${
                              drawTool === tool ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-200" : "bg-slate-50 text-ink ring-1 ring-stone-200 hover:bg-stone-100"
                            }`}
                            onClick={() => selectDrawTool(tool)}
                            type="button"
                          >
                            <span className="block text-sm font-semibold leading-tight">{drawToolLabels[tool]}</span>
                            <span className={`mt-1 block truncate text-[10px] leading-tight ${drawTool === tool ? "text-blue-50" : "text-stone-400"}`}>{drawToolHints[tool]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {drawTool === "wall-arc" && (
                  <div className="rounded-xl border border-stone-200 bg-white p-2">
                    <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                      <label className="block text-xs text-stone-500">
                        弧度角度
                        <input
                          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400"
                          max="180"
                          min="10"
                          step="5"
                          type="number"
                          value={arcSweepAngle}
                          onChange={(event) => setArcSweepAngle(Math.min(180, Math.max(10, Number(event.target.value) || 90)))}
                        />
                      </label>
                      <span className="pb-2 font-semibold text-stone-500">°</span>
                    </div>
                    <label className="mt-2 block text-xs text-stone-500">
                      弯曲方向
                      <select
                        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400"
                        value={arcDirection}
                        onChange={(event) => setArcDirection(event.target.value as "clockwise" | "counterclockwise")}
                      >
                        <option value="clockwise">顺时针</option>
                        <option value="counterclockwise">逆时针</option>
                      </select>
                    </label>
                  </div>
                )}

                {drawPreview && isClickDrawTool(drawTool) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-amber-900">
                    <p className="font-semibold">当前只是预览线段</p>
                    <p className="mt-1 text-[11px] leading-4">需要完成后才会进入结构对象台账，之后才能固化默认户型。</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-700" onClick={commitDrawPreview} type="button">完成当前线段</button>
                      <button className="rounded-xl bg-white px-3 py-2 font-semibold text-amber-900 ring-1 ring-amber-200" onClick={cancelClickDraw} type="button">取消预览</button>
                    </div>
                  </div>
                )}

                {drawTool === "outdoor" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white disabled:bg-stone-300" disabled={outdoorDraft.length < 3} onClick={finishOutdoorDraft} type="button">完成院子</button>
                    <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200" onClick={cancelOutdoorDraft} type="button">取消</button>
                  </div>
                )}

                {(drawTool === "hardscape" || drawTool === "hardscape-rect" || drawTool === "path" || drawTool === "planting") && (
                  <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-2">
                    <p className="font-semibold text-emerald-950">{drawTool === "path" ? "小路设置" : drawTool === "hardscape-rect" ? "平台设置" : "铺装材料"}</p>
                    {drawTool === "path" && (
                      <label className="grid grid-cols-[64px_1fr_58px] items-center gap-2 rounded-xl bg-white/70 px-2 py-2 text-xs font-semibold text-emerald-900">
                        <span>宽度</span>
                        <input min="400" max="1600" step="100" type="range" value={outdoorPathWidth} onChange={(event) => setOutdoorPathWidth(Number(event.target.value))} />
                        <span>{outdoorPathWidth}mm</span>
                      </label>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {outdoorSurfaceMaterialOptions.filter((option) => option.tool === (drawTool === "hardscape-rect" ? "hardscape" : drawTool)).map((option) => (
                        <button
                          key={option.material}
                          className={`flex items-center gap-2 rounded-xl border px-2 py-2 text-left font-semibold transition ${
                            outdoorSurfaceMaterial === option.material
                              ? "border-emerald-500 bg-white text-emerald-900 shadow-sm"
                              : "border-white/70 bg-white/55 text-stone-600 hover:bg-white"
                          }`}
                          onClick={() => setOutdoorSurfaceMaterial(option.material)}
                          type="button"
                        >
                          <span className="size-4 shrink-0 rounded-full border border-white shadow-sm" style={{ backgroundColor: option.swatch }} />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white disabled:bg-stone-300" disabled={drawTool === "hardscape-rect" || (outdoorSurfaceDraft?.points.length ?? 0) < (drawTool === "path" ? 2 : 3)} onClick={finishOutdoorSurfaceDraft} type="button">{drawTool === "path" ? "完成小路" : drawTool === "hardscape-rect" ? (outdoorRectDraft ? "点击对角点完成" : "先点第一个角") : "完成铺装"}</button>
                      <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200" onClick={cancelOutdoorSurfaceDraft} type="button">取消</button>
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 p-2 leading-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink">当前工具</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-500">{drawToolLabels[drawTool]}</span>
                  </div>
                  <p className="mt-1 text-stone-500">{drawToolHints[drawTool]}</p>
                  {clickDrawStart && <p className="mt-1 font-semibold text-blue-600">线性对象已设置起点，双击结束连续绘制</p>}
                  {drawTool === "outdoor" && outdoorDraft.length > 0 && <p className="mt-1 font-semibold text-emerald-700">院子边界点：{outdoorDraft.length}</p>}
                  {(drawTool === "hardscape" || drawTool === "path" || drawTool === "planting") && outdoorSurfaceDraft && <p className="mt-1 font-semibold text-emerald-700">{drawTool === "path" ? `小路中心点：${outdoorSurfaceDraft.points.length} · 宽 ${outdoorPathWidth}mm` : `区域边界点：${outdoorSurfaceDraft.points.length}`}</p>}
                  {drawTool === "hardscape-rect" && outdoorRectDraft && <p className="mt-1 font-semibold text-emerald-700">矩形平台：已设置第一个角点</p>}
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-2 leading-5">
                  <p className="font-semibold text-ink">当前选择</p>
                  <p className="truncate text-stone-500">{selectedInteractionObjectId || "未选择对象"}</p>
                  {selectedInteractionObjectId && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={toggleSelectedLock} type="button">
                        {objectIsLocked(selectedInteractionObjectId) ? "解锁" : "锁定"}
                      </button>
                      <button
                        className="rounded-xl bg-red-600 px-3 py-2 font-semibold text-white transition hover:bg-red-700 disabled:bg-stone-200 disabled:text-stone-400"
                        disabled={!canDeleteSelectedObject}
                        onClick={deleteSelectedObject}
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  )}
                  {selectedWall && (
                    <div className="mt-2 space-y-2">
                      <form
                        className="rounded-xl border border-blue-100 bg-blue-50/70 p-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const formData = new FormData(event.currentTarget);
                          resizeSelectedWallLength(Number(formData.get("wallLength")));
                        }}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-blue-900">墙体长度</span>
                          <span className="font-semibold text-blue-700">{selectedWall.length} mm</span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <input
                            key={`${selectedWall.id}-${selectedWall.length}`}
                            className="min-w-0 rounded-lg border border-blue-200 bg-white px-2 py-2 font-semibold text-ink outline-none focus:border-blue-500 disabled:bg-stone-100"
                            disabled={!onWallLengthChange || objectIsLocked(selectedWall.id)}
                            min="100"
                            name="wallLength"
                            type="number"
                            defaultValue={selectedWall.length}
                          />
                          <button className="rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800 disabled:bg-stone-300" disabled={!onWallLengthChange || objectIsLocked(selectedWall.id)} type="submit">校准</button>
                        </div>
                      </form>
                      <div className="grid grid-cols-2 gap-2">
                        <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={splitSelectedWall} type="button">分割墙体</button>
                        <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={mergeSelectedWall} type="button">合并墙体</button>
                      </div>
                    </div>
                  )}
                  {selectedStair && (
                    <div className="mt-2 rounded-xl border border-stone-200 bg-slate-50 p-2">
                      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-ink">楼梯长度</span>
                        <span className="font-semibold text-stone-500">{getLineLength(selectedStair.start, selectedStair.end)} mm</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <button className="rounded-xl bg-white px-2 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={() => resizeSelectedStair(-500)} type="button">-500</button>
                        <button className="rounded-xl bg-white px-2 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={() => resizeSelectedStair(-100)} type="button">-100</button>
                        <button className="rounded-xl bg-white px-2 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={() => resizeSelectedStair(100)} type="button">+100</button>
                        <button className="rounded-xl bg-white px-2 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={() => resizeSelectedStair(500)} type="button">+500</button>
                      </div>
                      <button className="mt-2 w-full rounded-xl bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800 disabled:bg-stone-300" disabled={!onOpenStairDesigner} onClick={() => onOpenStairDesigner?.(selectedStair.id)} type="button">进入楼梯设计</button>
                    </div>
                  )}
                  {selectedDoor && (
                    <button className="mt-2 w-full rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={rotateSelectedDoor} type="button">切换开门方向</button>
                  )}
                  {(selectedWindow || selectedBayWindow) && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={() => resizeSelectedWindow(-100)} type="button">{selectedBayWindow ? "飘窗变窄" : "窗变窄"}</button>
                      <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={() => resizeSelectedWindow(100)} type="button">{selectedBayWindow ? "飘窗变宽" : "窗变宽"}</button>
                    </div>
                  )}
                  {selectedInteractionFurniture && (
                    <button className="mt-2 w-full rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={rotateSelectedFurniture} type="button">家具旋转 15°</button>
                  )}
                  {selectedStructureObject && protectedBaseYardOutdoorIds.has(selectedStructureObject.id) && <p className="mt-2 text-emerald-700">默认绿地是庭院底盘，不能删除；可删除叠加的小路、硬地和花境。</p>}
                  {selectedStructureObject && !protectedBaseYardOutdoorIds.has(selectedStructureObject.id) && !canDeleteSelectedStructure && !objectIsLocked(selectedStructureObject.id) && <p className="mt-2 text-red-500">房间由墙体自动生成，不能直接删除。</p>}
                  {selectedInteractionObjectId && objectIsLocked(selectedInteractionObjectId) && <p className="mt-2 text-amber-600">已锁定：不能拖拽、删除或调整。</p>}
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink">结构对象台账</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-stone-500">{structureObjectRows.length}</span>
                  </div>
                  <div className="max-h-72 space-y-1 overflow-auto pr-1">
                    {structureObjectRows.map((row) => {
                      const selected = selectedInteractionObjectId === row.id || selectedStructureId === row.id;
                      const locked = objectIsLocked(row.id);
                      return (
                        <button
                          key={row.id}
                          className={`block w-full rounded-lg px-2 py-2 text-left transition ${
                            selected ? "bg-blue-50 text-blue-950 ring-1 ring-blue-200" : "bg-slate-50 text-slate-600 hover:bg-stone-100"
                          }`}
                          onClick={() => selectRegistryObject(row)}
                          type="button"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold text-ink">{row.id}</span>
                            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-500">{locked ? "锁定" : row.label}</span>
                          </span>
                          <span className="mt-0.5 block truncate">{row.name}</span>
                          <span className="mt-0.5 block truncate text-stone-400">{row.detail}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {structureMessage && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-2 leading-5 text-blue-900">
                    {structureMessage}
                  </div>
                )}
              </div>
            </aside>
          )}

          <div
            ref={planRef}
            className={`relative ${floor.id === "1F" ? "aspect-[12/13.8]" : "aspect-[4/3]"} shrink-0 justify-self-center overflow-hidden transition ${
              mobilePresentationMode
                ? "w-full max-w-none border-0 shadow-none"
                : `w-full max-w-5xl rounded-[1.5rem] border shadow-soft ${isPlanZoomSelected ? "border-blue-500 ring-4 ring-blue-500/20" : "border-slate-200"}`
            }`}
            style={{
              aspectRatio: `${planBounds.width} / ${planBounds.height}`,
              backgroundColor: floorPlanVisualSettings.cleanWhiteBackground ? cleanFillColor : "#f8f4ec",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: "center center",
              width: mobilePresentationMode
                ? floor.id === "1F"
                  ? "min(118vw, calc((100dvh - 7rem) * 0.87))"
                  : "min(118vw, calc((100dvh - 7rem) * 1.333))"
                : yardImmersiveMode ? "min(100%, 1180px)" : floor.id === "1F" ? "min(100%, 900px, calc((100vh - 12rem) * 0.87))" : "min(100%, 1024px, calc((100vh - 15rem) * 1.333))"
            }}
          >
            {visibleBaseFloorPlan && (
              <div className="absolute inset-0" data-layer="BaseFloorPlanLayer">
                {floor.floorPlanImage ? (
                  <div className="absolute" style={basePlanRect}>
                    <img
                      alt={`${floor.label} 酷家乐平面底图`}
                      className="absolute inset-0 h-full w-full select-none object-contain"
                      draggable={false}
                      src={floor.floorPlanImage}
                      style={{
                        filter: floorPlanFilter,
                        opacity: plannerMode === "edit" ? Math.min(0.22, floorPlanVisualSettings.opacity * 0.24) : floorPlanVisualSettings.opacity,
                        mixBlendMode: floorPlanVisualSettings.repairMode ? "multiply" : "normal"
                      }}
                    />
                  </div>
                ) : (
                  <div className="absolute bg-[linear-gradient(rgba(74,85,104,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(74,85,104,0.08)_1px,transparent_1px)] bg-[size:32px_32px]" style={basePlanRect} />
                )}
                {floorPlanVisualSettings.removeWhiteBorder && <div className="absolute inset-0 ring-8 ring-inset ring-white/70" />}
                {repairOverlayStyles.map((style, index) => (
                  <div key={index} className="absolute inset-0 pointer-events-none" style={style} />
                ))}
              </div>
            )}

            {visibleCleanupPatch && (
              <div className="absolute inset-0 pointer-events-none" data-layer="CleanupPatchLayer" data-coordinate-system="percent-of-floor-plan">
                {cleanPatches.map((patch) => (
                  <div
                    key={patch.id}
                    className="absolute"
                    style={{
                      left: `${patch.rect.x}%`,
                      top: `${patch.rect.y}%`,
                      width: `${patch.rect.width}%`,
                      height: `${patch.rect.height}%`,
                      backgroundColor: patch.fillColor
                    }}
                    title={patch.notes}
                  />
                ))}
              </div>
            )}

            <svg
              className={`absolute inset-0 ${plannerMode === "edit" ? "z-[45] cursor-crosshair" : "z-20"}`}
              data-coordinate-system="millimeter-floor-plan"
              onDoubleClick={handleStructureDoubleClick}
              onPointerDown={handleStructurePointerDown}
              onPointerMove={handleStructurePointerMove}
              onPointerUp={handleStructurePointerUp}
              onPointerCancel={handleStructurePointerUp}
              style={{ pointerEvents: structurePointerEventsEnabled ? "auto" : "none" }}
              viewBox={`${planBounds.x} ${planBounds.y} ${planBounds.width} ${planBounds.height}`}
            >
              <defs>
                <pattern id="grassPattern" width="180" height="180" patternUnits="userSpaceOnUse">
                  <rect width="180" height="180" fill="#a8d98f" />
                  <path d="M28 150 C42 118 54 102 72 70 M112 160 C105 124 118 92 142 58 M158 136 C146 112 150 88 168 62" fill="none" stroke="#6aae58" strokeWidth="12" strokeLinecap="round" opacity="0.35" />
                  <circle cx="44" cy="42" r="10" fill="#7fbe63" opacity="0.5" />
                  <circle cx="132" cy="118" r="8" fill="#6fb454" opacity="0.45" />
                </pattern>
                <pattern id="pebblePattern" width="260" height="180" patternUnits="userSpaceOnUse">
                  <rect width="260" height="180" fill="#dcc8a9" />
                  {[
                    [32, 38, 28, 18],
                    [92, 72, 34, 22],
                    [158, 36, 30, 20],
                    [218, 86, 36, 24],
                    [50, 132, 38, 24],
                    [130, 136, 32, 20],
                    [200, 142, 30, 18]
                  ].map(([cx, cy, rx, ry], index) => (
                    <ellipse key={`pebble-${index}`} cx={cx} cy={cy} rx={rx} ry={ry} fill={index % 2 ? "#f0e1c8" : "#c9b08d"} stroke="#a98d66" strokeWidth="7" opacity="0.9" />
                  ))}
                </pattern>
                <pattern id="stonePaverPattern" width="320" height="220" patternUnits="userSpaceOnUse">
                  <rect width="320" height="220" fill="#b9b3ab" />
                  <path d="M0 70 H320 M0 145 H320 M105 0 V70 M220 70 V145 M150 145 V220" stroke="#f8fafc" strokeWidth="14" opacity="0.65" />
                </pattern>
                <pattern id="woodDeckPattern" width="240" height="180" patternUnits="userSpaceOnUse">
                  <rect width="240" height="180" fill="#c58a5a" />
                  <path d="M0 45 H240 M0 90 H240 M0 135 H240" stroke="#8b5e34" strokeWidth="10" opacity="0.55" />
                  <path d="M36 18 H98 M132 70 H208 M24 116 H92 M128 154 H220" stroke="#e5b789" strokeWidth="8" strokeLinecap="round" opacity="0.55" />
                </pattern>
                <pattern id="concretePattern" width="260" height="220" patternUnits="userSpaceOnUse">
                  <rect width="260" height="220" fill="#d1d5db" />
                  <path d="M0 110 H260 M130 0 V220" stroke="#f8fafc" strokeWidth="10" opacity="0.55" />
                  <circle cx="58" cy="54" r="7" fill="#94a3b8" opacity="0.35" />
                  <circle cx="204" cy="158" r="9" fill="#94a3b8" opacity="0.3" />
                </pattern>
                <pattern id="masterBathStonePattern" width="900" height="900" patternUnits="userSpaceOnUse">
                  <rect width="900" height="900" fill="#d6cec2" />
                  <path d="M0 0 H900 V900 H0 Z M0 450 H900 M450 0 V900" fill="none" stroke="#b8aa9d" strokeWidth="15" opacity="0.58" />
                  <path d="M88 168 C244 80 382 204 548 120 M210 704 C390 610 520 746 760 620 M622 320 C700 250 778 296 844 228" fill="none" stroke="#eee7dd" strokeWidth="16" strokeLinecap="round" opacity="0.42" />
                </pattern>
                <pattern id="plantingPattern" width="220" height="180" patternUnits="userSpaceOnUse">
                  <rect width="220" height="180" fill="#88c878" />
                  <circle cx="42" cy="44" r="28" fill="#4f9b46" opacity="0.55" />
                  <circle cx="120" cy="82" r="34" fill="#5daa50" opacity="0.55" />
                  <circle cx="182" cy="126" r="30" fill="#3f8c3f" opacity="0.45" />
                </pattern>
              </defs>
              {plannerMode === "edit" && drawTool !== "select" && <rect x={planBounds.x} y={planBounds.y} width={planBounds.width} height={planBounds.height} fill="transparent" />}

              <g data-layer="OutdoorLayer">
                {visibleOutdoors.map((outdoor) => (
                  <polygon
                    key={outdoor.id}
                    points={outdoor.polygon.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill="url(#grassPattern)"
                    stroke={isObjectSelected(outdoor.id) ? "#16a34a" : isObjectHovered(outdoor.id) ? "#22c55e" : "#65a30d"}
                    strokeWidth={isObjectHovered(outdoor.id) || isObjectSelected(outdoor.id) ? 52 : 30}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (shouldIgnoreStructureSelection("outdoor")) return;
                      selectStructureObject(outdoor.id, `${outdoor.name} · 默认绿地 · ${(outdoor.area / 1_000_000).toFixed(2)} m2`);
                    }}
                    onPointerDown={(event) => {
                      if (plannerMode !== "edit" || drawTool !== "select" || objectIsLocked(outdoor.id)) return;
                      if (blockProtectedStructureEdit("outdoor", "移动院子边界")) return;
                      const point = getMmPosition(event);
                      if (!point) return;
                      event.stopPropagation();
                      structureMoveRef.current = { pointerId: event.pointerId, objectId: outdoor.id, lastPoint: point, moved: false };
                      event.currentTarget.setPointerCapture(event.pointerId);
                      selectStructureObject(outdoor.id, `${outdoor.name} · 拖动整体院子边界`);
                    }}
                    onMouseEnter={() => hoverObject(outdoor.id)}
                    onMouseLeave={() => clearHoverObject(outdoor.id)}
                  />
                ))}
                {visibleOutdoorSurfaces.map((surface) => {
                  const selected = isObjectSelected(surface.id);
                  const hovered = isObjectHovered(surface.id);
                  const tone = getOutdoorSurfaceTone(surface);
                  return (
                    <g key={surface.id}>
                      <polygon
                        points={surface.polygon.map((point) => `${point.x},${point.y}`).join(" ")}
                        fill={tone.pattern}
                        opacity={surface.surfaceType === "planting" ? 0.9 : 0.96}
                        stroke={hovered || selected ? tone.stroke : "transparent"}
                        strokeWidth={hovered || selected ? 54 : 0}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (shouldIgnoreStructureSelection("outdoorSurface")) return;
                          selectStructureObject(surface.id, `${surface.name} · ${outdoorSurfaceMaterialLabels[surface.material] ?? "铺装"} · ${(surface.area / 1_000_000).toFixed(2)} m2`);
                        }}
                        onPointerDown={(event) => {
                          if (plannerMode !== "edit" || drawTool !== "select" || objectIsLocked(surface.id)) return;
                          if (blockProtectedStructureEdit("outdoorSurface", "移动庭院铺装")) return;
                          const point = getMmPosition(event);
                          if (!point) return;
                          event.stopPropagation();
                          structureMoveRef.current = { pointerId: event.pointerId, objectId: surface.id, lastPoint: point, moved: false };
                          event.currentTarget.setPointerCapture(event.pointerId);
                          selectStructureObject(surface.id, `${surface.name} · 拖动整体铺装`);
                        }}
                        onMouseEnter={() => hoverObject(surface.id)}
                        onMouseLeave={() => clearHoverObject(surface.id)}
                      />
                      {(hovered || selected) && (
                        <text
                          x={surface.polygon.reduce((sum, point) => sum + point.x, 0) / surface.polygon.length}
                          y={surface.polygon.reduce((sum, point) => sum + point.y, 0) / surface.polygon.length}
                          fill="#1f2937"
                          fontSize={130}
                          fontWeight={900}
                          paintOrder="stroke"
                          stroke="#ffffff"
                          strokeWidth={36}
                          textAnchor="middle"
                        >
                          {outdoorSurfaceMaterialLabels[surface.material] ?? "铺装"}
                        </text>
                      )}
                    </g>
                  );
                })}
                {outdoorDraft.length > 0 && (
                  <polyline
                    points={outdoorDraft.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill="none"
                    stroke="#16a34a"
                    strokeDasharray="120 90"
                    strokeWidth={42}
                  />
                )}
                {outdoorSurfaceDraft && outdoorSurfaceDraft.points.length > 0 && (
                  outdoorSurfaceDraft.tool === "path" && outdoorSurfaceDraft.points.length >= 2 ? (
                    <polygon
                      points={createPathRibbon(outdoorSurfaceDraft.points, outdoorPathWidth).map((point) => `${point.x},${point.y}`).join(" ")}
                      fill={getOutdoorSurfaceTone({ material: getOutdoorMaterialForTool(outdoorSurfaceDraft.tool) } as HouseStructure["outdoorSurfaces"][number]).pattern}
                      stroke={getOutdoorSurfaceTone({ material: getOutdoorMaterialForTool(outdoorSurfaceDraft.tool) } as HouseStructure["outdoorSurfaces"][number]).stroke}
                      strokeDasharray="120 90"
                      strokeWidth={42}
                    />
                  ) : (
                    <polyline
                      points={outdoorSurfaceDraft.points.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill={outdoorSurfaceDraft.points.length >= 3 ? getOutdoorSurfaceTone({ material: getOutdoorMaterialForTool(outdoorSurfaceDraft.tool) } as HouseStructure["outdoorSurfaces"][number]).pattern : "none"}
                      stroke={getOutdoorSurfaceTone({ material: getOutdoorMaterialForTool(outdoorSurfaceDraft.tool) } as HouseStructure["outdoorSurfaces"][number]).stroke}
                      strokeDasharray="120 90"
                      strokeWidth={42}
                    />
                  )
                )}
                {outdoorRectDraft?.start && outdoorRectDraft.end && (
                  <polygon
                    points={createRectPolygon(outdoorRectDraft.start, outdoorRectDraft.end).map((point) => `${point.x},${point.y}`).join(" ")}
                    fill={getOutdoorSurfaceTone({ material: getOutdoorMaterialForTool("hardscape") } as HouseStructure["outdoorSurfaces"][number]).pattern}
                    stroke={getOutdoorSurfaceTone({ material: getOutdoorMaterialForTool("hardscape") } as HouseStructure["outdoorSurfaces"][number]).stroke}
                    strokeDasharray="120 90"
                    strokeWidth={42}
                  />
                )}
              </g>

              <g data-layer="FenceLayer">
                {visibleFences.map((fence) => {
                  const isSelected = isObjectSelected(fence.id);
                  const isHovered = isObjectHovered(fence.id);
                  const locked = objectIsLocked(fence.id);
                  return (
                    <g key={fence.id}>
                      <line
                        x1={fence.start.x}
                        y1={fence.start.y}
                        x2={fence.end.x}
                        y2={fence.end.y}
                        stroke="transparent"
                        pointerEvents="stroke"
                        strokeLinecap="round"
                        strokeWidth={Math.max(360, fence.thickness + 230)}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (shouldIgnoreStructureSelection("fence")) return;
                          selectStructureObject(fence.id, `${fence.name} · ${getLineLength(fence.start, fence.end)} mm`);
                        }}
                        onPointerDown={(event) => {
                          if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                          if (blockProtectedStructureEdit("fence", "移动篱笆")) return;
                          const point = getMmPosition(event);
                          if (!point) return;
                          event.stopPropagation();
                          structureMoveRef.current = { pointerId: event.pointerId, objectId: fence.id, lastPoint: point, moved: false };
                          event.currentTarget.setPointerCapture(event.pointerId);
                          selectStructureObject(fence.id, `${fence.name} · 拖动整段篱笆`);
                        }}
                        onMouseEnter={() => hoverObject(fence.id)}
                        onMouseLeave={() => clearHoverObject(fence.id)}
                      />
                      <line
                        x1={fence.start.x}
                        y1={fence.start.y}
                        x2={fence.end.x}
                        y2={fence.end.y}
                        pointerEvents="none"
                        stroke={locked ? "#9ca3af" : isSelected ? "#14532d" : isHovered ? "#166534" : "#365314"}
                        strokeDasharray="90 70"
                        strokeLinecap="round"
                        strokeWidth={isSelected || isHovered ? fence.thickness + 34 : fence.thickness}
                        opacity={locked ? 0.55 : 1}
                      />
                      {renderDragHandle(fence.id, "start", fence.start)}
                      {renderDragHandle(fence.id, "end", fence.end)}
                    </g>
                  );
                })}
              </g>

              {!yardImmersiveMode && renderStructureProjectionLayer()}
              {renderMasterBathStyleLayer()}

              <g className={yardImmersiveMode ? "hidden" : undefined} data-layer="RoomLayer">
                {houseStructure.rooms.map((room) => (
                  <polygon
                    key={room.id}
                    points={room.boundary.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill={room.id === MASTER_BATH_ROOM_ID && showMasterBathStyleLayer
                      ? isObjectSelected(room.id) ? "rgba(59,130,246,0.08)" : isObjectHovered(room.id) ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.02)"
                      : isObjectSelected(room.id) ? "rgba(59,130,246,0.13)" : isObjectHovered(room.id) ? "rgba(59,130,246,0.09)" : "rgba(59,130,246,0.055)"}
                    stroke={room.id === MASTER_BATH_ROOM_ID && showMasterBathStyleLayer && !isObjectSelected(room.id) ? "#9b8f80" : isObjectSelected(room.id) ? "#2563eb" : "rgba(37,99,235,0.28)"}
                    strokeWidth={isObjectSelected(room.id) || isObjectHovered(room.id) ? 36 : 18}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (shouldIgnoreStructureSelection("room")) return;
                      selectStructureObject(room.id, `${room.roomNumber} · ${room.name} · ${(room.area / 1_000_000).toFixed(2)} m2`);
                    }}
                    onMouseEnter={() => hoverObject(room.id)}
                    onMouseLeave={() => clearHoverObject(room.id)}
                  />
                ))}
              </g>

              <g className={yardImmersiveMode ? "hidden" : undefined} data-layer="WallLayer">
                {houseStructure.walls.map((wall) => {
                  const isSelected = isObjectSelected(wall.id);
                  const isHovered = isObjectHovered(wall.id);
                  const locked = objectIsLocked(wall.id);
                  const visibleStroke = getVisibleWallStroke(wall, isSelected, isHovered, locked);
                  if (wall.kind === "arc") {
                    return (
                      <g key={wall.id}>
                        <path
                          d={getArcPath(wall)}
                          fill="none"
                          pointerEvents="stroke"
                          stroke="transparent"
                          strokeLinecap="round"
                          strokeWidth={Math.max(420, wall.thickness + 220)}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (shouldIgnoreStructureSelection("wall")) return;
                            selectStructureObject(wall.id, `${wall.name} · ${getWallObjectLabel(wall)} · ${wall.length} mm`);
                          }}
                          onPointerDown={(event) => {
                            if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                            if (blockProtectedStructureEdit("wall", "移动墙体")) return;
                            const point = getMmPosition(event);
                            if (!point) return;
                            event.stopPropagation();
                            structureMoveRef.current = { pointerId: event.pointerId, objectId: wall.id, lastPoint: point, moved: false };
                            event.currentTarget.setPointerCapture(event.pointerId);
                            selectStructureObject(wall.id, `${wall.name} · 拖动整段${getWallObjectLabel(wall)}`);
                          }}
                          onMouseEnter={() => hoverObject(wall.id)}
                          onMouseLeave={() => clearHoverObject(wall.id)}
                        />
                        <path
                          d={getArcPath(wall)}
                          fill="none"
                          pointerEvents="none"
                          stroke={visibleStroke.color}
                          strokeDasharray={visibleStroke.dasharray}
                          strokeLinecap={isRailingWall(wall) ? visibleStroke.linecap : "round"}
                          strokeWidth={visibleStroke.width}
                          opacity={visibleStroke.opacity}
                        />
                      </g>
                    );
                  }
                  const hitPadding = Math.max(260, wall.thickness + 110);
                  return (
                    <g key={wall.id}>
                      <rect
                        x={Math.min(wall.start.x, wall.end.x) - hitPadding}
                        y={Math.min(wall.start.y, wall.end.y) - hitPadding}
                        width={Math.abs(wall.end.x - wall.start.x) + hitPadding * 2}
                        height={Math.abs(wall.end.y - wall.start.y) + hitPadding * 2}
                        data-wall-hit={wall.id}
                        fill="transparent"
                        stroke="transparent"
                        pointerEvents="all"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (shouldIgnoreStructureSelection("wall")) return;
                          selectStructureObject(wall.id, `${wall.name} · ${getWallObjectLabel(wall)} · ${wall.length} mm`);
                        }}
                        onPointerDown={(event) => {
                          if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                          if (blockProtectedStructureEdit("wall", "移动墙体")) return;
                          const point = getMmPosition(event);
                          if (!point) return;
                          event.stopPropagation();
                          structureMoveRef.current = { pointerId: event.pointerId, objectId: wall.id, lastPoint: point, moved: false };
                          event.currentTarget.setPointerCapture(event.pointerId);
                          selectStructureObject(wall.id, `${wall.name} · 拖动整段${getWallObjectLabel(wall)}`);
                        }}
                        onMouseEnter={() => hoverObject(wall.id)}
                        onMouseLeave={() => clearHoverObject(wall.id)}
                      />
                      <line
                        x1={wall.start.x}
                        y1={wall.start.y}
                        x2={wall.end.x}
                        y2={wall.end.y}
                        pointerEvents="none"
                        stroke={visibleStroke.color}
                        strokeDasharray={visibleStroke.dasharray}
                        strokeLinecap={visibleStroke.linecap}
                        strokeWidth={visibleStroke.width}
                        opacity={visibleStroke.opacity}
                      />
                      {locked && <text x={(wall.start.x + wall.end.x) / 2} y={(wall.start.y + wall.end.y) / 2 - 140} fill="#92400e" fontSize={160} fontWeight={700}>LOCK</text>}
                      {renderDragHandle(wall.id, "start", wall.start)}
                      {renderDragHandle(wall.id, "end", wall.end)}
                    </g>
                  );
                })}
              </g>

              <g className={yardImmersiveMode ? "hidden" : undefined} data-layer="PartitionLayer">
                {houseStructure.partitions.map((partition) => {
                  const isSelected = isObjectSelected(partition.id);
                  const isHovered = isObjectHovered(partition.id);
                  const locked = objectIsLocked(partition.id);
                  return (
                    <g key={partition.id}>
                      <line
                        x1={partition.start.x}
                        y1={partition.start.y}
                        x2={partition.end.x}
                        y2={partition.end.y}
                        stroke="transparent"
                        pointerEvents="stroke"
                        strokeLinecap="round"
                        strokeWidth={Math.max(320, partition.thickness + 200)}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (shouldIgnoreStructureSelection("partition")) return;
                          selectStructureObject(partition.id, `${partition.name} · 可拆改隔断`);
                        }}
                        onPointerDown={(event) => {
                          if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                          if (blockProtectedStructureEdit("partition", "移动隔断")) return;
                          const point = getMmPosition(event);
                          if (!point) return;
                          event.stopPropagation();
                          structureMoveRef.current = { pointerId: event.pointerId, objectId: partition.id, lastPoint: point, moved: false };
                          event.currentTarget.setPointerCapture(event.pointerId);
                          selectStructureObject(partition.id, `${partition.name} · 拖动整段隔断`);
                        }}
                        onMouseEnter={() => hoverObject(partition.id)}
                        onMouseLeave={() => clearHoverObject(partition.id)}
                      />
                      <line
                        x1={partition.start.x}
                        y1={partition.start.y}
                        x2={partition.end.x}
                        y2={partition.end.y}
                        pointerEvents="none"
                        stroke={locked ? "#9ca3af" : isSelected ? "#2563eb" : isHovered ? "#14b8a6" : "#0f766e"}
                        strokeDasharray="160 90"
                        strokeLinecap="round"
                        strokeOpacity={Math.max(0.35, 1 - partition.transparency * 0.5)}
                        strokeWidth={isSelected || isHovered ? partition.thickness + 32 : partition.thickness}
                        opacity={locked ? 0.55 : 1}
                      />
                      {renderDragHandle(partition.id, "start", partition.start)}
                      {renderDragHandle(partition.id, "end", partition.end)}
                    </g>
                  );
                })}
              </g>

              <g className={yardImmersiveMode ? "hidden" : undefined} data-layer="StairLayer">
                {constructionExportWorkspace.stairOpenings.filter((opening) => opening.floorId === floor.id).map((opening) => {
                  const center = opening.polygon.reduce((sum, point) => ({ x: sum.x + point.x / opening.polygon.length, y: sum.y + point.y / opening.polygon.length }), { x: 0, y: 0 });
                  return (
                    <g key={opening.id} data-stair-opening={opening.id} pointerEvents="none">
                      <polygon
                        points={opening.polygon.map((point) => `${point.x},${point.y}`).join(" ")}
                        fill="#ffffff"
                        fillOpacity={0.82}
                        stroke="#7c3aed"
                        strokeDasharray="180 105"
                        strokeWidth={30}
                      />
                      {opening.guardEdges.map((edge) => (
                        <line
                          key={edge.id}
                          x1={edge.start.x}
                          y1={edge.start.y}
                          x2={edge.end.x}
                          y2={edge.end.y}
                          stroke="#92400e"
                          strokeLinecap="round"
                          strokeWidth={54}
                        />
                      ))}
                      <text
                        x={center.x}
                        y={center.y - 235}
                        fill="#5b21b6"
                        fontSize={126}
                        fontWeight={900}
                        paintOrder="stroke"
                        stroke="#ffffff"
                        strokeWidth={66}
                        textAnchor="middle"
                      >
                        楼板洞口
                      </text>
                    </g>
                  );
                })}
                {getStairLandingConnections(houseStructure.stairs).map((connection, connectionIndex) => {
                  const isSelected = isObjectSelected(connection.fromId) || isObjectSelected(connection.toId);
                  const isHovered = isObjectHovered(connection.fromId) || isObjectHovered(connection.toId);
                  const locked = objectIsLocked(connection.fromId) || objectIsLocked(connection.toId);
                  const center = {
                    x: connection.bounds.x + connection.bounds.width / 2,
                    y: connection.bounds.y + connection.bounds.height / 2
                  };
                  return (
                    <g key={connection.id} pointerEvents="none">
                      <rect
                        x={connection.bounds.x}
                        y={connection.bounds.y}
                        width={connection.bounds.width}
                        height={connection.bounds.height}
                        rx={Math.min(260, connection.width * 0.32)}
                        fill={locked ? "#9ca3af" : "#8b5cf6"}
                        fillOpacity={locked ? 0.12 : isSelected || isHovered ? 0.22 : 0.16}
                        stroke={locked ? "#9ca3af" : isSelected || isHovered ? "#5b21b6" : "#6d28d9"}
                        strokeDasharray="140 110"
                        strokeOpacity={locked ? 0.34 : 0.5}
                        strokeWidth={26}
                      />
                      <line
                        x1={connection.start.x}
                        y1={connection.start.y}
                        x2={connection.end.x}
                        y2={connection.end.y}
                        stroke={locked ? "#9ca3af" : "#4c1d95"}
                        strokeLinecap="round"
                        strokeOpacity={locked ? 0.38 : 0.58}
                        strokeWidth={28}
                        strokeDasharray="120 120"
                      />
                      <text
                        x={center.x}
                        y={center.y + (connectionIndex - (getStairLandingConnections(houseStructure.stairs).length - 1) / 2) * 150}
                        fill={locked ? "#6b7280" : "#4c1d95"}
                        fontSize={130}
                        fontWeight={900}
                        paintOrder="stroke"
                        pointerEvents="none"
                        stroke="#ffffff"
                        strokeWidth={70}
                        textAnchor="middle"
                      >
                        平台 {connection.elevationLabel}
                      </text>
                    </g>
                  );
                })}
                {houseStructure.stairs.map((stair) => {
                  const isSelected = isObjectSelected(stair.id);
                  const isHovered = isObjectHovered(stair.id);
                  const locked = objectIsLocked(stair.id);
                  const stairGeometry = getStairGeometry(stair);
                  const isDownRun = stair.direction === "down";
                  const isArrivalRun = isTwoFloorArrivalStair(stair);
                  const arrivalVisualOffset = isArrivalRun ? stair.width * 0.42 : 0;
                  const shiftArrivalPoint = (point: MmPoint) => ({
                    x: point.x + stairGeometry.normal.x * arrivalVisualOffset,
                    y: point.y + stairGeometry.normal.y * arrivalVisualOffset
                  });
                  const visualStart = shiftArrivalPoint(stairGeometry.renderStart);
                  const visualEnd = shiftArrivalPoint(stairGeometry.renderEnd);
                  const arrowStart = {
                    x: visualStart.x + stairGeometry.ux * Math.min(360, stairGeometry.length * 0.2),
                    y: visualStart.y + stairGeometry.uy * Math.min(360, stairGeometry.length * 0.2)
                  };
                  const arrowEnd = {
                    x: visualEnd.x - stairGeometry.ux * Math.min(360, stairGeometry.length * 0.2),
                    y: visualEnd.y - stairGeometry.uy * Math.min(360, stairGeometry.length * 0.2)
                  };
                  const arrowUx = stairGeometry.ux;
                  const arrowUy = stairGeometry.uy;
                  const headLeft = {
                    x: arrowEnd.x - arrowUx * 210 + stairGeometry.normal.x * 150,
                    y: arrowEnd.y - arrowUy * 210 + stairGeometry.normal.y * 150
                  };
                  const headRight = {
                    x: arrowEnd.x - arrowUx * 210 - stairGeometry.normal.x * 150,
                    y: arrowEnd.y - arrowUy * 210 - stairGeometry.normal.y * 150
                  };
                  const labelPoint = {
                    x: (arrowStart.x + arrowEnd.x) / 2 + stairGeometry.normal.x * Math.min(310, stair.width * 0.34),
                    y: (arrowStart.y + arrowEnd.y) / 2 + stairGeometry.normal.y * Math.min(310, stair.width * 0.34)
                  };
                  const stairMovementLabel = getStairMovementLabel(stair);
                  const arrivalLanding = {
                    x: visualEnd.x,
                    y: visualEnd.y
                  };
                  return (
                    <g key={stair.id}>
                      <line
                        x1={visualStart.x}
                        y1={visualStart.y}
                        x2={visualEnd.x}
                        y2={visualEnd.y}
                        stroke="transparent"
                        pointerEvents="stroke"
                        strokeLinecap="round"
                        strokeWidth={Math.max(520, stair.width + 220)}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (shouldIgnoreStructureSelection("stair")) return;
                          selectStructureObject(stair.id, `${stair.name} · ${getLineLength(stair.start, stair.end)} mm · ${stair.stepCount} 踏`);
                        }}
                        onPointerDown={(event) => {
                          if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                          if (blockProtectedStructureEdit("stair", "移动楼梯")) return;
                          const point = getMmPosition(event);
                          if (!point) return;
                          event.stopPropagation();
                          structureMoveRef.current = { pointerId: event.pointerId, objectId: stair.id, lastPoint: point, moved: false };
                          event.currentTarget.setPointerCapture(event.pointerId);
                          selectStructureObject(stair.id, `${stair.name} · 拖动整段楼梯`);
                        }}
                        onMouseEnter={() => hoverObject(stair.id)}
                        onMouseLeave={() => clearHoverObject(stair.id)}
                      />
                      <line
                        x1={stair.start.x}
                        y1={stair.start.y}
                        x2={stair.end.x}
                        y2={stair.end.y}
                        pointerEvents="none"
                        stroke={locked ? "#9ca3af" : isSelected ? "#7c3aed" : isHovered ? "#6d28d9" : isArrivalRun ? "#f59e0b" : isDownRun ? "#312e81" : "#8b5cf6"}
                        strokeLinecap="round"
                        strokeOpacity={locked ? 0.38 : isArrivalRun ? 0.34 : isDownRun ? 0.25 : 0.18}
                        strokeWidth={stair.width}
                      />
                      {(isDownRun || isArrivalRun) && [-1, 1].map((side) => (
                        <line
                          key={`${stair.id}-edge-${side}`}
                          x1={visualStart.x + stairGeometry.normal.x * stair.width * 0.48 * side}
                          y1={visualStart.y + stairGeometry.normal.y * stair.width * 0.48 * side}
                          x2={visualEnd.x + stairGeometry.normal.x * stair.width * 0.48 * side}
                          y2={visualEnd.y + stairGeometry.normal.y * stair.width * 0.48 * side}
                          pointerEvents="none"
                          stroke={locked ? "#9ca3af" : isArrivalRun ? "#b45309" : "#111827"}
                          strokeLinecap="round"
                          strokeOpacity={locked ? 0.38 : 0.62}
                          strokeWidth={18}
                        />
                      ))}
                      {stairGeometry.steps.map((step, index) => (
                        <line
                          key={`${stair.id}-step-${index}`}
                          x1={shiftArrivalPoint(step.start).x}
                          y1={shiftArrivalPoint(step.start).y}
                          x2={shiftArrivalPoint(step.end).x}
                          y2={shiftArrivalPoint(step.end).y}
                          pointerEvents="none"
                          stroke={locked ? "#9ca3af" : isArrivalRun ? "#92400e" : isDownRun ? "#111827" : "#4c1d95"}
                          strokeLinecap="round"
                          strokeOpacity={locked ? 0.45 : isArrivalRun ? 0.88 : isDownRun ? 0.84 : 0.72}
                          strokeWidth={isSelected || isHovered ? 34 : 24}
                        />
                      ))}
                      <line
                        x1={arrowStart.x}
                        y1={arrowStart.y}
                        x2={arrowEnd.x}
                        y2={arrowEnd.y}
                        pointerEvents="none"
                        stroke={locked ? "#9ca3af" : isSelected ? "#4c1d95" : isArrivalRun ? "#b45309" : isDownRun ? "#111827" : "#6d28d9"}
                        strokeLinecap="round"
                        strokeWidth={isSelected || isHovered ? 46 : 32}
                      />
                      <path
                        d={`M ${arrowEnd.x} ${arrowEnd.y} L ${headLeft.x} ${headLeft.y} L ${headRight.x} ${headRight.y} Z`}
                        fill={locked ? "#9ca3af" : isSelected ? "#4c1d95" : isArrivalRun ? "#b45309" : isDownRun ? "#111827" : "#6d28d9"}
                        pointerEvents="none"
                      />
                      {isArrivalRun && (
                        <g pointerEvents="none">
                          <circle
                            cx={arrivalLanding.x}
                            cy={arrivalLanding.y}
                            fill={locked ? "#e5e7eb" : "#fffbeb"}
                            r={Math.min(340, stair.width * 0.36)}
                            stroke={locked ? "#9ca3af" : "#b45309"}
                            strokeWidth={26}
                          />
                          <text
                            x={arrivalLanding.x}
                            y={arrivalLanding.y + 46}
                            fill={locked ? "#6b7280" : "#92400e"}
                            fontSize={126}
                            fontWeight={900}
                            paintOrder="stroke"
                            stroke="#ffffff"
                            strokeWidth={72}
                            textAnchor="middle"
                          >
                            2F 到达
                          </text>
                        </g>
                      )}
                      {stairMovementLabel && (
                        <text
                          x={labelPoint.x}
                          y={labelPoint.y}
                          fill={locked ? "#6b7280" : isArrivalRun ? "#92400e" : "#111827"}
                          fontSize={142}
                          fontWeight={900}
                          paintOrder="stroke"
                          pointerEvents="none"
                          stroke="#ffffff"
                          strokeWidth={78}
                          textAnchor="middle"
                        >
                          {stairMovementLabel}
                        </text>
                      )}
                      {renderDragHandle(stair.id, "start", stair.start)}
                      {renderDragHandle(stair.id, "end", stair.end)}
                    </g>
                  );
                })}
              </g>

              <g className={yardImmersiveMode ? "hidden" : undefined} data-layer="ColumnLayer">
                {(houseStructure.columns ?? []).map((column) => {
                  const isSelected = isObjectSelected(column.id);
                  const isHovered = isObjectHovered(column.id);
                  const locked = objectIsLocked(column.id);
                  const stroke = locked ? "#9ca3af" : isSelected ? "#2563eb" : isHovered ? "#334155" : "#1f2937";
                  const fill = locked ? "#9ca3af" : isSelected ? "#dbeafe" : isHovered ? "#e2e8f0" : "#3f3f46";
                  const message = `${column.name} · Φ${column.radius * 2} mm${column.supportsFloorId ? ` · 支撑${column.supportsFloorId}` : ""}`;
                  return (
                    <g key={column.id}>
                      <circle
                        cx={column.center.x}
                        cy={column.center.y}
                        fill="transparent"
                        r={Math.max(520, column.radius + 220)}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (shouldIgnoreStructureSelection("column")) return;
                          selectStructureObject(column.id, message);
                        }}
                        onMouseEnter={() => hoverObject(column.id)}
                        onMouseLeave={() => clearHoverObject(column.id)}
                        onPointerDown={(event) => {
                          if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                          if (blockProtectedStructureEdit("column", "移动立柱")) return;
                          const point = getMmPosition(event);
                          if (!point) return;
                          event.stopPropagation();
                          structureMoveRef.current = { pointerId: event.pointerId, objectId: column.id, lastPoint: point, moved: false };
                          event.currentTarget.setPointerCapture(event.pointerId);
                          selectStructureObject(column.id, `${column.name} · 拖动立柱`);
                        }}
                      />
                      <circle
                        cx={column.center.x}
                        cy={column.center.y}
                        fill={fill}
                        opacity={locked ? 0.55 : isSelected || isHovered ? 0.95 : 0.88}
                        pointerEvents="none"
                        r={column.radius}
                        stroke={stroke}
                        strokeWidth={isSelected || isHovered ? 42 : 28}
                      />
                      <circle
                        cx={column.center.x}
                        cy={column.center.y}
                        fill={isSelected ? "#2563eb" : "#ffffff"}
                        opacity={locked ? 0.68 : 0.94}
                        pointerEvents="none"
                        r={Math.max(58, column.radius * 0.2)}
                      />
                      <line
                        pointerEvents="none"
                        stroke={isSelected ? "#ffffff" : "#cbd5e1"}
                        strokeWidth={24}
                        x1={column.center.x - column.radius * 0.56}
                        x2={column.center.x + column.radius * 0.56}
                        y1={column.center.y}
                        y2={column.center.y}
                      />
                      <line
                        pointerEvents="none"
                        stroke={isSelected ? "#ffffff" : "#cbd5e1"}
                        strokeWidth={24}
                        x1={column.center.x}
                        x2={column.center.x}
                        y1={column.center.y - column.radius * 0.56}
                        y2={column.center.y + column.radius * 0.56}
                      />
                    </g>
                  );
                })}
              </g>

              <g className={yardImmersiveMode ? "hidden" : undefined} data-layer="DoorWindowLayer">
                {houseStructure.doors.map((door) => {
                  const host = getHostLine(door.hostId, door.hostType);
                  if (!host) return null;
                  const segment = getSegmentOnLine(host.start, host.end, door.positionOnWall, door.width);
                  const opensFromStart = door.openDirection === "leftIn" || door.openDirection === "leftOut";
                  const opensInside = door.openDirection === "leftIn" || door.openDirection === "rightIn";
                  const normal = opensInside ? segment.normal : { x: -segment.normal.x, y: -segment.normal.y };
                  const hinge = opensFromStart ? segment.start : segment.end;
                  const leafEnd = opensFromStart ? segment.end : segment.start;
                  const qx = segment.center.x + normal.x * door.width * 0.58;
                  const qy = segment.center.y + normal.y * door.width * 0.58;
                  const leafOpenEnd = {
                    x: hinge.x + normal.x * door.width * 0.78,
                    y: hinge.y + normal.y * door.width * 0.78
                  };
                  const isSelected = isObjectSelected(door.id);
                  const isHovered = isObjectHovered(door.id);
                  const locked = objectIsLocked(door.id);
                  const isSlidingDoor = door.operation === "sliding";
                  const doorStroke = locked ? "#9ca3af" : isSelected ? "#2563eb" : isHovered ? "#0f172a" : isSlidingDoor ? "#38bdf8" : "#64748b";
                  const glassOpacity = door.transparency ?? 0.45;
                  const trackOffset = Math.max(26, host.thickness * 0.24);
                  return (
                    <g
                      key={door.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (shouldIgnoreStructureSelection("opening")) return;
                        selectStructureObject(door.id, `${door.name} · ${door.width} mm${isSlidingDoor ? " · 推拉门" : ""}`);
                      }}
                      onMouseEnter={() => hoverObject(door.id)}
                      onMouseLeave={() => clearHoverObject(door.id)}
                      onPointerDown={(event) => {
                        if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                        if (blockProtectedStructureEdit("opening", "移动门")) return;
                        event.stopPropagation();
                        openingDragRef.current = { pointerId: event.pointerId, objectId: door.id, objectType: "door", moved: false };
                        event.currentTarget.setPointerCapture(event.pointerId);
                        selectStructureObject(door.id, `${door.name} · 沿墙滑动`);
                      }}
                    >
                      <line x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} stroke="#ffffff" strokeLinecap="round" strokeWidth={host.thickness + 44} />
                      {isSlidingDoor ? (
                        <>
                          <line x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} stroke="#dbeafe" strokeLinecap="round" strokeOpacity={glassOpacity} strokeWidth={Math.max(54, host.thickness * 0.62)} />
                          <line x1={segment.start.x + segment.normal.x * trackOffset} y1={segment.start.y + segment.normal.y * trackOffset} x2={segment.end.x + segment.normal.x * trackOffset} y2={segment.end.y + segment.normal.y * trackOffset} stroke={doorStroke} strokeLinecap="round" strokeWidth={isSelected || isHovered ? 18 : 12} />
                          <line x1={segment.start.x - segment.normal.x * trackOffset} y1={segment.start.y - segment.normal.y * trackOffset} x2={segment.end.x - segment.normal.x * trackOffset} y2={segment.end.y - segment.normal.y * trackOffset} stroke={doorStroke} strokeLinecap="round" strokeOpacity="0.72" strokeWidth={isSelected || isHovered ? 18 : 12} />
                          <line x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} stroke={doorStroke} strokeLinecap="round" strokeOpacity="0.88" strokeWidth={isSelected || isHovered ? 28 : 18} />
                        </>
                      ) : (
                        <>
                          <line x1={hinge.x} y1={hinge.y} x2={leafOpenEnd.x} y2={leafOpenEnd.y} stroke={doorStroke} strokeLinecap="round" strokeWidth={isSelected || isHovered ? 34 : 20} />
                          <path d={`M ${hinge.x} ${hinge.y} Q ${qx} ${qy} ${leafEnd.x} ${leafEnd.y}`} fill="none" stroke={doorStroke} strokeWidth={isSelected || isHovered ? 34 : 20} />
                        </>
                      )}
                    </g>
                  );
                })}

                {houseStructure.windows.map((windowObject) => {
                  const host = getHostLine(windowObject.hostId, windowObject.hostType);
                  if (!host) return null;
                  const segment = getSegmentOnLine(host.start, host.end, windowObject.positionOnWall, windowObject.width);
                  const isSelected = isObjectSelected(windowObject.id);
                  const isHovered = isObjectHovered(windowObject.id);
                  const locked = objectIsLocked(windowObject.id);
                  return (
                    <g
                      key={windowObject.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (shouldIgnoreStructureSelection("opening")) return;
                        selectStructureObject(windowObject.id, `${windowObject.name} · ${windowObject.width} mm`);
                      }}
                      onMouseEnter={() => hoverObject(windowObject.id)}
                      onMouseLeave={() => clearHoverObject(windowObject.id)}
                      onPointerDown={(event) => {
                        if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                        if (blockProtectedStructureEdit("opening", "移动窗")) return;
                        event.stopPropagation();
                        openingDragRef.current = { pointerId: event.pointerId, objectId: windowObject.id, objectType: "window", moved: false };
                        event.currentTarget.setPointerCapture(event.pointerId);
                        selectStructureObject(windowObject.id, `${windowObject.name} · 沿墙滑动`);
                      }}
                    >
                      <line x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} stroke="#ffffff" strokeLinecap="round" strokeWidth={Math.max(70, host.thickness * 0.72)} />
                      <line x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} stroke={locked ? "#9ca3af" : isSelected ? "#2563eb" : isHovered ? "#0284c7" : "#38bdf8"} strokeLinecap="round" strokeWidth={isSelected || isHovered ? 42 : 28} />
                    </g>
                  );
                })}

                {houseStructure.bayWindows.map((bayWindow) => {
                  const host = getHostLine(bayWindow.wallId, "wall");
                  if (!host) return null;
                  const segment = getSegmentOnLine(host.start, host.end, bayWindow.positionOnWall, bayWindow.width);
                  const isSelected = isObjectSelected(bayWindow.id);
                  const isHovered = isObjectHovered(bayWindow.id);
                  const points = [
                    segment.start,
                    segment.end,
                    { x: segment.end.x + segment.normal.x * bayWindow.depth, y: segment.end.y + segment.normal.y * bayWindow.depth },
                    { x: segment.start.x + segment.normal.x * bayWindow.depth, y: segment.start.y + segment.normal.y * bayWindow.depth }
                  ];
                  return (
                    <polygon
                      key={bayWindow.id}
                      points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill={isSelected ? "rgba(37,99,235,0.2)" : "rgba(186,230,253,0.36)"}
                      stroke={isSelected ? "#2563eb" : isHovered ? "#0f172a" : "#0284c7"}
                      strokeWidth={isSelected || isHovered ? 44 : 24}
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (shouldIgnoreStructureSelection("opening")) return;
                        selectStructureObject(bayWindow.id, `${bayWindow.name} · 宽 ${bayWindow.width} mm · 外扩 ${bayWindow.depth} mm`);
                      }}
                      onPointerDown={(event) => {
                        if (plannerMode !== "edit" || drawTool !== "select") return;
                        event.stopPropagation();
                        selectStructureObject(bayWindow.id, `${bayWindow.name} · 宽 ${bayWindow.width} mm`);
                      }}
                      onMouseEnter={() => hoverObject(bayWindow.id)}
                      onMouseLeave={() => clearHoverObject(bayWindow.id)}
                    />
                  );
                })}

                {houseStructure.skylights.map((skylight) => {
                  const isSelected = isObjectSelected(skylight.id);
                  const isHovered = isObjectHovered(skylight.id);
                  const operationLabel = skylight.operation === "electricOperable" ? "电动可活动" : skylight.openable ? "可开启" : "固定";
                  const halfWidth = skylight.width / 2;
                  const halfDepth = skylight.depth / 2;
                  const points = [
                    { x: skylight.center.x - halfWidth, y: skylight.center.y - halfDepth },
                    { x: skylight.center.x + halfWidth, y: skylight.center.y - halfDepth },
                    { x: skylight.center.x + halfWidth, y: skylight.center.y + halfDepth },
                    { x: skylight.center.x - halfWidth, y: skylight.center.y + halfDepth }
                  ];
                  return (
                    <g
                      key={skylight.id}
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (shouldIgnoreStructureSelection("skylight")) return;
                        selectStructureObject(skylight.id, `${skylight.name} · ${operationLabel} · ${skylight.width} x ${skylight.depth} mm`);
                      }}
                      onPointerDown={(event) => {
                        if (plannerMode !== "edit" || drawTool !== "select") return;
                        event.stopPropagation();
                        selectStructureObject(skylight.id, `${skylight.name} · ${operationLabel} · ${skylight.width} x ${skylight.depth} mm`);
                      }}
                      onMouseEnter={() => hoverObject(skylight.id)}
                      onMouseLeave={() => clearHoverObject(skylight.id)}
                    >
                      <polygon
                        points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                        fill={isSelected ? "rgba(14,165,233,0.22)" : "rgba(125,211,252,0.24)"}
                        stroke={isSelected ? "#2563eb" : isHovered ? "#0f172a" : "#0ea5e9"}
                        strokeWidth={isSelected || isHovered ? 38 : 22}
                      />
                      <line x1={points[0].x} y1={points[0].y} x2={points[2].x} y2={points[2].y} stroke="#0ea5e9" strokeWidth={14} />
                      <line x1={points[1].x} y1={points[1].y} x2={points[3].x} y2={points[3].y} stroke="#0ea5e9" strokeWidth={14} />
                    </g>
                  );
                })}
              </g>

              {renderSyncRuleOverlay()}

              {renderPlanSheetOverlay()}

              {drawingItemLayerActive && (
                <g data-layer="DrawingItemsLayer" data-sheet-type={sheetMode}>
                  {visibleDrawingItems.map((item, index) => {
                    const selected = item.id === selectedDrawingItemId;
                    const relatedFurniture = furniture.find((candidate) => candidate.id === item.relatedFurnitureId);
                    const relatedToSelectedFurniture = Boolean(selectedFurnitureId && item.relatedFurnitureId === selectedFurnitureId);
                    const relatedSyncState = relatedFurniture ? getRelatedDrawingItemSyncState(item, relatedFurniture, houseStructure) : null;
                    const statusColor = relatedSyncState?.needsSync ? "#d97706" : relatedToSelectedFurniture ? "#7c3aed" : item.status === "confirmed" ? "#047857" : item.status === "todo" ? "#b45309" : item.status === "deprecated" ? "#78716c" : "#2563eb";
                    const wall = item.category === "wallFinish" ? [...houseStructure.walls, ...houseStructure.partitions].find((candidate) => candidate.id === (item.wallId ?? item.hostWallId)) : null;
                    const wallStart = wall && "start" in wall ? wall.start : null;
                    const wallEnd = wall && "end" in wall ? wall.end : null;
                    const polygon = item.polygon?.length && item.polygon.length >= 3 ? item.polygon : null;
                    const anchor = polygon
                      ? { x: polygon.reduce((sum, point) => sum + point.x, 0) / polygon.length, y: polygon.reduce((sum, point) => sum + point.y, 0) / polygon.length }
                      : wallStart && wallEnd ? { x: (wallStart.x + wallEnd.x) / 2, y: (wallStart.y + wallEnd.y) / 2 } : item.positionMm;
                    const detailSummary = item.category === "switch"
                      ? `控制 ${(item.controlledLightIds?.length ?? 0)} 灯${item.controlGroupId ?? item.lightGroupId ? ` / ${item.controlGroupId ?? item.lightGroupId}` : ""}`
                      : item.category === "light" ? `${item.lightType ?? item.type} · ${item.colorTemperature ?? item.lightColorTemperature ?? "色温待定"} · ${item.controlGroupId ?? item.lightGroupId ?? "未分组"}`
                      : item.category === "ceiling" ? `${item.ceilingHeightMm ?? "待定"}mm · ${[item.inspectionAccess ? "检修" : "", item.airVent ? "送风" : "", item.returnAir ? "回风" : ""].filter(Boolean).join("/") || "普通区域"}`
                      : item.category === "floorFinish" ? `${floorFinishMaterialLabels[item.material ?? ""] ?? item.material ?? "材料待定"} · ${item.pattern ?? "排版待定"}`
                      : item.category === "wallFinish" ? `${item.material ?? "材料待定"}${item.waterproofHeightMm ? ` · 防水H${item.waterproofHeightMm}` : ""}`
                      : relatedFurniture?.name ?? (item.relatedFurnitureId ? "关联家具缺失" : "未关联家具");
                    return (
                      <g
                        key={item.id}
                        className={workspaceMutationAllowed && plannerMode === "edit" && !polygon && !wall ? "cursor-move" : "cursor-pointer"}
                        transform={`translate(${anchor.x} ${anchor.y})`}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          setSelectedDrawingItemId(item.id);
                          onActiveObjectChange(item.id);
                          if (workspaceMutationAllowed && plannerMode === "edit" && !polygon && !wall) {
                            drawingItemDragRef.current = { pointerId: event.pointerId, objectId: item.id };
                            event.currentTarget.setPointerCapture(event.pointerId);
                          }
                        }}
                        onPointerMove={(event) => {
                          if (drawingItemDragRef.current?.pointerId !== event.pointerId || drawingItemDragRef.current.objectId !== item.id) return;
                          const positionMm = getMmPosition(event);
                          if (positionMm) updateDrawingItem(item.id, { positionMm });
                        }}
                        onPointerUp={(event) => {
                          if (drawingItemDragRef.current?.pointerId === event.pointerId) drawingItemDragRef.current = null;
                        }}
                      >
                        {relatedFurniture && relatedToSelectedFurniture && (() => {
                          const furnitureCenter = getFurnitureCenterMm(relatedFurniture, houseStructure);
                          return <line x1={0} y1={0} x2={furnitureCenter.x - anchor.x} y2={furnitureCenter.y - anchor.y} stroke={statusColor} strokeDasharray="70 55" strokeWidth={32} opacity={0.75} />;
                        })()}
                        {item.category === "switch" && (item.controlledLightIds ?? []).map((lightId) => {
                          const light = drawingItems.find((candidate) => candidate.id === lightId && candidate.category === "light");
                          return light ? <line key={lightId} x1={0} y1={0} x2={light.positionMm.x - anchor.x} y2={light.positionMm.y - anchor.y} stroke="#2563eb" strokeDasharray="90 65" strokeWidth={28} opacity={0.7} /> : null;
                        })}
                        {polygon && <polygon points={polygon.map((point) => `${point.x - anchor.x},${point.y - anchor.y}`).join(" ")} fill={item.category === "ceiling" ? "rgba(14,165,233,0.12)" : "rgba(180,83,9,0.12)"} stroke={statusColor} strokeDasharray={item.category === "ceiling" ? "100 70" : undefined} strokeWidth={selected ? 58 : 34} />}
                        {wallStart && wallEnd && <line x1={wallStart.x - anchor.x} y1={wallStart.y - anchor.y} x2={wallEnd.x - anchor.x} y2={wallEnd.y - anchor.y} stroke={statusColor} strokeWidth={selected ? 150 : 105} opacity={0.65} />}
                        <circle r={selected || relatedToSelectedFurniture ? 190 : 160} fill="#ffffff" stroke={statusColor} strokeWidth={selected || relatedToSelectedFurniture ? 55 : 38} />
                        <text y={58} fill={statusColor} fontSize={170} fontWeight={900} textAnchor="middle">{drawingItemCategoryLabels[item.category].slice(0, 1)}</text>
                        <text y={-235} fill="#0f172a" fontSize={150} fontWeight={800} paintOrder="stroke" stroke="#ffffff" strokeWidth={42} textAnchor="middle">
                          {`${index + 1}. ${item.label || drawingItemCategoryLabels[item.category]}`}
                        </text>
                        <text y={330} fill={statusColor} fontSize={120} fontWeight={700} paintOrder="stroke" stroke="#ffffff" strokeWidth={34} textAnchor="middle">
                          {[`x${item.quantity}`, item.heightMm ? `H${item.heightMm}` : "", drawingItemStatusLabels[item.status]].filter(Boolean).join(" · ")}
                        </text>
                        <text y={475} fill="#475569" fontSize={105} fontWeight={650} paintOrder="stroke" stroke="#ffffff" strokeWidth={30} textAnchor="middle">
                          {detailSummary}
                        </text>
                        <text y={610} fill="#64748b" fontSize={92} fontWeight={600} paintOrder="stroke" stroke="#ffffff" strokeWidth={28} textAnchor="middle">
                          {(item.category === "light" ? `${item.smartControl ? "智能" : "常规"} · ${item.dimming ? "调光" : "不调光"} · ${item.relatedSwitchId ?? "未关联开关"}` : item.notes || "无备注").slice(0, 44)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {renderVerificationStatusLayer()}
              {renderDimensionLayer()}

              {drawPreview && (
                <g data-layer="DrawPreviewLayer">
                  <circle
                    cx={drawPreview.start.x}
                    cy={drawPreview.start.y}
                    r={105}
                    fill="#ffffff"
                    stroke={drawTool === "partition" ? "#0f766e" : drawTool === "stair" ? "#7c3aed" : drawTool === "fence" ? "#365314" : "#2563eb"}
                    strokeWidth={34}
                  />
                  {arcDrawPreview ? (
                    <path
                      d={getArcPath(arcDrawPreview)}
                      fill="none"
                      stroke="#2563eb"
                      strokeDasharray="120 80"
                      strokeLinecap="round"
                      strokeWidth={220}
                    />
                  ) : (
                    <line
                      x1={drawPreview.start.x}
                      y1={drawPreview.start.y}
                      x2={drawPreview.end.x}
                      y2={drawPreview.end.y}
                      stroke={drawTool === "partition" ? "#0f766e" : drawTool === "stair" ? "#7c3aed" : drawTool === "fence" ? "#365314" : "#2563eb"}
                      strokeDasharray="120 80"
                      strokeLinecap="round"
                      strokeWidth={drawTool === "partition" ? 90 : drawTool === "fence" ? 120 : 220}
                    />
                  )}
                  <circle
                    cx={drawPreview.end.x}
                    cy={drawPreview.end.y}
                    r={74}
                    fill={drawTool === "partition" ? "#0f766e" : drawTool === "stair" ? "#7c3aed" : drawTool === "fence" ? "#365314" : "#2563eb"}
                    opacity={getLineLength(drawPreview.start, drawPreview.end) > 120 ? 1 : 0.45}
                  />
                  <text x={(drawPreview.start.x + drawPreview.end.x) / 2 + 80} y={(drawPreview.start.y + drawPreview.end.y) / 2 - 80} fill="#0f172a" fontSize={180} fontWeight={700}>
                    {arcDrawPreview ? `${arcDrawPreview.length} mm · ${arcSweepAngle}°` : `${getLineLength(drawPreview.start, drawPreview.end)} mm`}
                  </text>
                </g>
              )}
            </svg>

            {!drawingDrivenMode && drawingItemLayerActive && !isFurnitureSheetMode && !mobilePresentationMode && (
              <div className="absolute right-5 top-16 z-[58] max-h-[calc(100%-5rem)] w-[min(360px,calc(100%-2.5rem))] overflow-y-auto rounded-xl border border-stone-200 bg-white/95 p-3 text-xs text-stone-600 shadow-lg backdrop-blur" onPointerDown={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">图纸点位</p>
                    <p className="mt-0.5 text-stone-400">当前图纸 {visibleDrawingItems.length} 项</p>
                  </div>
                  <button className="rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white disabled:bg-stone-300" disabled={!workspaceMutationAllowed || plannerMode !== "edit" || activeDrawingItemCategories.length === 0} onClick={() => addDrawingItem()} type="button">新增点位</button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button className="rounded-lg bg-emerald-50 px-2 py-2 font-semibold text-emerald-800 disabled:text-stone-300" disabled={!workspaceMutationAllowed || plannerMode !== "edit"} onClick={() => onGenerateDrawingItems("floor")} type="button">从家具生成 · 本层</button>
                  <button className="rounded-lg bg-emerald-700 px-2 py-2 font-semibold text-white disabled:bg-stone-300" disabled={!workspaceMutationAllowed || plannerMode !== "edit"} onClick={() => onGenerateDrawingItems("all")} type="button">从家具生成 · 全屋</button>
                  {(sheetMode === "lightingPlan" || sheetMode === "switchPlan") && <>
                    <button className="rounded-lg bg-amber-50 px-2 py-2 font-semibold text-amber-900 disabled:text-stone-300" disabled={!workspaceMutationAllowed || plannerMode !== "edit"} onClick={() => onGenerateLightingDesign("floor")} type="button">现代温暖灯光 · 本层</button>
                    <button className="rounded-lg bg-amber-700 px-2 py-2 font-semibold text-white disabled:bg-stone-300" disabled={!workspaceMutationAllowed || plannerMode !== "edit"} onClick={() => onGenerateLightingDesign("all")} type="button">现代温暖灯光 · 全屋</button>
                  </>}
                </div>
                {selectedDrawingItem && (
                  <div className="mt-3 border-t border-stone-200 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <label>类别<select className="mt-1 w-full rounded-lg border border-stone-200 p-2" value={selectedDrawingItem.category} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { category: event.target.value as DrawingItemCategory })}>{drawingItemCategories.map((category) => <option key={category} value={category}>{drawingItemCategoryLabels[category]}</option>)}</select></label>
                      <label>类型<input className="mt-1 w-full rounded-lg border border-stone-200 p-2" value={selectedDrawingItem.type} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { type: event.target.value, lightType: selectedDrawingItem.category === "light" ? event.target.value : selectedDrawingItem.lightType })} /></label>
                      <label>高度 mm<input className="mt-1 w-full rounded-lg border border-stone-200 p-2" type="number" value={selectedDrawingItem.heightMm ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { heightMm: event.target.value ? Number(event.target.value) : null })} /></label>
                      <label>数量<input className="mt-1 w-full rounded-lg border border-stone-200 p-2" min="1" type="number" value={selectedDrawingItem.quantity} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} /></label>
                      <label>状态<select className="mt-1 w-full rounded-lg border border-stone-200 p-2" value={selectedDrawingItem.status} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { status: event.target.value as DrawingItem["status"] })}>{drawingItemStatuses.map((status) => <option key={status} value={status}>{drawingItemStatusLabels[status]}</option>)}</select></label>
                      <label>标签<input className="mt-1 w-full rounded-lg border border-stone-200 p-2" value={selectedDrawingItem.label} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { label: event.target.value })} /></label>
                      <label>回路<input className="mt-1 w-full rounded-lg border border-stone-200 p-2" value={selectedDrawingItem.relatedCircuit ?? selectedDrawingItem.circuitId ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { circuitId: event.target.value || null, relatedCircuit: event.target.value || null })} /></label>
                      <label>色温<input className="mt-1 w-full rounded-lg border border-stone-200 p-2" value={selectedDrawingItem.colorTemperature ?? selectedDrawingItem.lightColorTemperature ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { colorTemperature: (event.target.value || null) as DrawingItem["colorTemperature"], lightColorTemperature: (event.target.value || null) as DrawingItem["lightColorTemperature"] })} /></label>
                    </div>
                    <label className="mt-2 flex items-center gap-2"><input checked={Boolean(selectedDrawingItem.smartControl ?? selectedDrawingItem.needsSmartControl)} type="checkbox" onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { smartControl: event.target.checked, needsSmartControl: event.target.checked })} />需要智能控制</label>
                    {selectedDrawingItem.category === "light" && <div className="mt-3 rounded-lg bg-amber-50 p-2">
                      <p className="font-semibold text-amber-950">现代温暖型灯光</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label>灯光分层<select className="mt-1 w-full rounded-lg border border-amber-100 p-2" value={selectedDrawingItem.lightingLayer ?? "ambient"} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { lightingLayer: event.target.value as DrawingItem["lightingLayer"] })}>{lightingLayers.map((layer) => <option key={layer} value={layer}>{lightingLayerLabels[layer]}</option>)}</select></label>
                        <label>安装方式<select className="mt-1 w-full rounded-lg border border-amber-100 p-2" value={selectedDrawingItem.mountingType ?? "recessed"} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { mountingType: event.target.value as DrawingItem["mountingType"] })}>{lightMountingTypes.map((type) => <option key={type} value={type}>{lightMountingTypeLabels[type]}</option>)}</select></label>
                        <label>光束角 °<input className="mt-1 w-full rounded-lg border border-amber-100 p-2" min="1" max="180" type="number" value={selectedDrawingItem.beamAngle ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { beamAngle: event.target.value ? Number(event.target.value) : null })} /></label>
                        <label>控制组 ID<input className="mt-1 w-full rounded-lg border border-amber-100 p-2" value={selectedDrawingItem.controlGroupId ?? selectedDrawingItem.lightGroupId ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { controlGroupId: event.target.value || null, lightGroupId: event.target.value || null })} /></label>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label>灯具家族<input className="mt-1 w-full rounded-lg border border-amber-100 p-2" value={selectedDrawingItem.lightSpec?.fixtureFamily ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { lightSpec: { ...(selectedDrawingItem.lightSpec ?? {}), fixtureFamily: event.target.value } })} /></label>
                        <label>方向 °<input className="mt-1 w-full rounded-lg border border-amber-100 p-2" type="number" value={selectedDrawingItem.directionDeg ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { directionDeg: event.target.value ? Number(event.target.value) : null })} /></label>
                        <label>功率 W<input className="mt-1 w-full rounded-lg border border-amber-100 p-2" min="0" type="number" value={selectedDrawingItem.lightSpec?.powerW ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { lightSpec: { ...(selectedDrawingItem.lightSpec ?? {}), powerW: event.target.value ? Number(event.target.value) : undefined } })} /></label>
                        <label>光通量 lm<input className="mt-1 w-full rounded-lg border border-amber-100 p-2" min="0" type="number" value={selectedDrawingItem.lightSpec?.luminousFluxLm ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { lightSpec: { ...(selectedDrawingItem.lightSpec ?? {}), luminousFluxLm: event.target.value ? Number(event.target.value) : undefined } })} /></label>
                        <label>CRI<input className="mt-1 w-full rounded-lg border border-amber-100 p-2" min="80" max="100" type="number" value={selectedDrawingItem.lightSpec?.cri ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { lightSpec: { ...(selectedDrawingItem.lightSpec ?? {}), cri: event.target.value ? Number(event.target.value) : undefined } })} /></label>
                        <label>防水等级<input className="mt-1 w-full rounded-lg border border-amber-100 p-2" placeholder="如 IP65" value={selectedDrawingItem.lightSpec?.waterproofRating ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { lightSpec: { ...(selectedDrawingItem.lightSpec ?? {}), waterproofRating: event.target.value || undefined } })} /></label>
                      </div>
                      <label className="mt-2 block">关联开关<select className="mt-1 w-full rounded-lg border border-amber-100 p-2" value={selectedDrawingItem.relatedSwitchId ?? ""} onChange={(event) => updateLightSwitchRelation(selectedDrawingItem.id, event.target.value || null)}><option value="">未关联</option>{drawingItems.filter((item) => item.category === "switch").map((item) => <option key={item.id} value={item.id}>{item.label} · {item.controlGroupId ?? item.lightGroupId ?? "未分组"}</option>)}</select></label>
                      <label className="mt-2 block">承载吊顶区域<select className="mt-1 w-full rounded-lg border border-amber-100 p-2" value={selectedDrawingItem.hostCeilingAreaId ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { hostCeilingAreaId: event.target.value || null })}><option value="">吊顶深化后绑定</option>{drawingItems.filter((item) => item.category === "ceiling").map((item) => <option key={item.id} value={item.id}>{item.label} · {item.id}</option>)}</select></label>
                      <div className="mt-2 grid grid-cols-2 gap-2"><label className="flex items-center gap-2"><input checked={Boolean(selectedDrawingItem.smartControl)} type="checkbox" onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { smartControl: event.target.checked, needsSmartControl: event.target.checked })} />智能控制</label><label className="flex items-center gap-2"><input checked={Boolean(selectedDrawingItem.dimming)} type="checkbox" onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { dimming: event.target.checked })} />可调光</label></div>
                    </div>}
                    {selectedDrawingItem.category === "switch" && <div className="mt-3 rounded-lg bg-blue-50 p-2">
                      <label className="block">控制方式<input className="mt-1 w-full rounded-lg border border-blue-100 p-2" placeholder="单控、双控、场景" value={(selectedDrawingItem.switchControl ?? []).join("、")} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { switchControl: event.target.value.split(/[、,，/]/).map((value) => value.trim()).filter(Boolean) })} /></label>
                      <label className="mt-2 block">控制组 ID<input className="mt-1 w-full rounded-lg border border-blue-100 p-2" value={selectedDrawingItem.controlGroupId ?? selectedDrawingItem.lightGroupId ?? ""} onChange={(event) => updateSwitchControlGroup(selectedDrawingItem, event.target.value || null)} /></label>
                      <p className="mt-2 font-semibold text-blue-900">控制灯点</p>
                      <div className="mt-1 grid gap-1">{drawingItems.filter((item) => item.category === "light").map((light) => <label key={light.id} className="flex items-center gap-2"><input checked={(selectedDrawingItem.controlledLightIds ?? []).includes(light.id)} type="checkbox" onChange={(event) => toggleSwitchControlledLight(selectedDrawingItem, light.id, event.target.checked)} />{light.label} · {light.id}</label>)}</div>
                    </div>}
                    {selectedDrawingItem.category === "ceiling" && <div className="mt-3 rounded-lg bg-sky-50 p-2">
                      <div className="grid grid-cols-2 gap-2"><label>吊顶高度<input className="mt-1 w-full rounded-lg border border-sky-100 p-2" type="number" value={selectedDrawingItem.ceilingHeightMm ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { ceilingHeightMm: event.target.value ? Number(event.target.value) : null })} /></label><label>类型<input className="mt-1 w-full rounded-lg border border-sky-100 p-2" value={selectedDrawingItem.type} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { type: event.target.value })} /></label></div>
                      <div className="mt-2 grid grid-cols-2 gap-1">{([['inspectionAccess','检修口'],['airVent','送风口'],['returnAir','回风口'],['maintenanceOpening','维护开口']] as const).map(([field,label]) => <label key={field} className="flex items-center gap-2"><input checked={Boolean(selectedDrawingItem[field])} type="checkbox" onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { [field]: event.target.checked })} />{label}</label>)}</div>
                      <p className="mt-2 font-semibold text-sky-900">关联灯点</p><div className="mt-1 grid gap-1">{drawingItems.filter((item) => item.category === "light").map((light) => <label key={light.id} className="flex items-center gap-2"><input checked={(selectedDrawingItem.relatedLightIds ?? []).includes(light.id)} type="checkbox" onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { relatedLightIds: event.target.checked ? [...(selectedDrawingItem.relatedLightIds ?? []), light.id] : (selectedDrawingItem.relatedLightIds ?? []).filter((id) => id !== light.id) })} />{light.label}</label>)}</div>
                      <button className="mt-2 w-full rounded-lg bg-sky-700 px-2 py-2 font-semibold text-white disabled:bg-stone-300" disabled={!selectedDrawingItem.roomId} onClick={() => applyRoomPolygonToDrawingItem(selectedDrawingItem)} type="button">采用关联房间区域</button>
                    </div>}
                    {selectedDrawingItem.category === "floorFinish" && <div className="mt-3 rounded-lg bg-amber-50 p-2">
                      <div className="grid grid-cols-2 gap-2"><label>材料<select className="mt-1 w-full rounded-lg border border-amber-100 p-2" value={selectedDrawingItem.material ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { material: event.target.value || null })}><option value="">待定</option>{Object.entries(floorFinishMaterialLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>排版<input className="mt-1 w-full rounded-lg border border-amber-100 p-2" value={selectedDrawingItem.pattern ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { pattern: event.target.value || null })} /></label><label>方向 °<input className="mt-1 w-full rounded-lg border border-amber-100 p-2" type="number" value={selectedDrawingItem.directionDeg ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { directionDeg: event.target.value ? Number(event.target.value) : null })} /></label><label>缝宽 mm<input className="mt-1 w-full rounded-lg border border-amber-100 p-2" type="number" value={selectedDrawingItem.seamWidthMm ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { seamWidthMm: event.target.value ? Number(event.target.value) : null })} /></label><label>门槛<input className="mt-1 w-full rounded-lg border border-amber-100 p-2" value={selectedDrawingItem.threshold ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { threshold: event.target.value || null })} /></label><label>过渡<input className="mt-1 w-full rounded-lg border border-amber-100 p-2" value={selectedDrawingItem.transition ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { transition: event.target.value || null })} /></label></div>
                      <button className="mt-2 w-full rounded-lg bg-amber-700 px-2 py-2 font-semibold text-white disabled:bg-stone-300" disabled={!selectedDrawingItem.roomId} onClick={() => applyRoomPolygonToDrawingItem(selectedDrawingItem)} type="button">采用关联房间铺装区域</button>
                    </div>}
                    {selectedDrawingItem.category === "wallFinish" && <div className="mt-3 rounded-lg bg-emerald-50 p-2">
                      <label>墙面材料<input className="mt-1 w-full rounded-lg border border-emerald-100 p-2" list="wall-finish-materials" value={selectedDrawingItem.material ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { material: event.target.value || null })} /><datalist id="wall-finish-materials">{wallFinishMaterialOptions.map((material) => <option key={material} value={material} />)}</datalist></label>
                      <div className="mt-2 grid grid-cols-2 gap-2"><label>起始高度<input className="mt-1 w-full rounded-lg border border-emerald-100 p-2" type="number" value={selectedDrawingItem.heightRange?.minMm ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { heightRange: { minMm: Number(event.target.value) || 0, maxMm: selectedDrawingItem.heightRange?.maxMm ?? 2800 } })} /></label><label>结束高度<input className="mt-1 w-full rounded-lg border border-emerald-100 p-2" type="number" value={selectedDrawingItem.heightRange?.maxMm ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { heightRange: { minMm: selectedDrawingItem.heightRange?.minMm ?? 0, maxMm: Number(event.target.value) || 2800 } })} /></label><label>面积 ㎡<input className="mt-1 w-full rounded-lg border border-emerald-100 p-2" type="number" value={selectedDrawingItem.area ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { area: event.target.value ? Number(event.target.value) : null })} /></label><label>防水高度<input className="mt-1 w-full rounded-lg border border-emerald-100 p-2" type="number" value={selectedDrawingItem.waterproofHeightMm ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { waterproofHeightMm: event.target.value ? Number(event.target.value) : null })} /></label></div>
                      <label className="mt-2 block">特殊处理<input className="mt-1 w-full rounded-lg border border-emerald-100 p-2" value={selectedDrawingItem.specialTreatment ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { specialTreatment: event.target.value || null })} /></label>
                    </div>}
                    <label className="mt-2 block">关联房间<select className="mt-1 w-full rounded-lg border border-stone-200 p-2" value={selectedDrawingItem.relatedRoomId ?? selectedDrawingItem.roomId ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { roomId: event.target.value || null, relatedRoomId: event.target.value || null })}><option value="">未关联</option>{[...houseStructure.rooms, ...houseStructure.outdoors].map((room) => <option key={room.id} value={room.id}>{room.name} · {room.id}</option>)}</select></label>
                    <label className="mt-2 block">关联墙体<select className="mt-1 w-full rounded-lg border border-stone-200 p-2" value={selectedDrawingItem.wallId ?? selectedDrawingItem.hostWallId ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { hostWallId: event.target.value || null, wallId: selectedDrawingItem.category === "wallFinish" ? event.target.value || null : selectedDrawingItem.wallId })}><option value="">未关联</option>{[...houseStructure.walls, ...houseStructure.partitions].map((wall) => <option key={wall.id} value={wall.id}>{wall.name} · {wall.id}</option>)}</select></label>
                    <label className="mt-2 block">承载对象<select className="mt-1 w-full rounded-lg border border-stone-200 p-2" value={selectedDrawingItem.hostObjectId ?? ""} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { hostObjectId: event.target.value || null })}><option value="">未关联</option>{[...houseStructure.walls, ...houseStructure.partitions, ...houseStructure.columns].map((object) => <option key={object.id} value={object.id}>{object.name} · {object.id}</option>)}</select></label>
                    <label className="mt-2 block">关联家具<select className="mt-1 w-full rounded-lg border border-stone-200 p-2" value={selectedDrawingItem.relatedFurnitureId ?? ""} onChange={(event) => {
                      const relatedFurnitureId = event.target.value || null;
                      const related = relatedFurnitureId ? furniture.find((item) => item.id === relatedFurnitureId) : null;
                      updateDrawingItem(selectedDrawingItem.id, {
                        relatedFurnitureId,
                        relatedFurniturePositionMm: related ? getFurnitureCenterMm(related, houseStructure) : undefined
                      });
                    }}><option value="">未关联</option>{furniture.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
                    {selectedDrawingItem.relatedFurnitureId && furniture.some((item) => item.id === selectedDrawingItem.relatedFurnitureId) && (
                      <button className="mt-2 w-full rounded-lg bg-violet-50 px-3 py-2 font-semibold text-violet-800" onClick={() => {
                        const related = furniture.find((item) => item.id === selectedDrawingItem.relatedFurnitureId);
                        if (related) onSelectFurniture(related);
                      }} type="button">定位关联家具</button>
                    )}
                    <label className="mt-2 block">备注<textarea className="mt-1 min-h-16 w-full rounded-lg border border-stone-200 p-2" value={selectedDrawingItem.notes} onChange={(event) => updateDrawingItem(selectedDrawingItem.id, { notes: event.target.value })} /></label>
                    <div className="mt-2 flex items-center justify-between gap-2"><span className="truncate text-stone-400">{selectedDrawingItem.id} · {selectedDrawingItem.source}</span><button className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-700" onClick={() => deleteDrawingItem(selectedDrawingItem.id)} type="button">删除</button></div>
                  </div>
                )}
              </div>
            )}

            {!drawingDrivenMode && !mobilePresentationMode && <div className="pointer-events-none absolute left-5 top-5 z-40 max-w-[min(72%,720px)] truncate rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-stone-500 shadow-sm">
              {planCanvasModeLabels[sheetMode]}：{planCanvasModeDescriptions[sheetMode]}
            </div>}
            {visibleVerificationStatusLayer && !drawingDrivenMode && !mobilePresentationMode && (
              <div className="pointer-events-none absolute left-5 top-16 z-40 flex max-w-[calc(100%-2.5rem)] flex-wrap gap-x-3 gap-y-1 rounded-lg border border-stone-200 bg-white/94 px-3 py-2 text-[11px] font-semibold text-stone-600 shadow-sm">
                {(Object.keys(verificationDisplayStateLabels) as Array<keyof typeof verificationDisplayStateLabels>).map((state) => (
                  <span key={state} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm" style={{ backgroundColor: verificationDisplayStyles[state].color }} />
                    {verificationDisplayStateLabels[state]}
                  </span>
                ))}
              </div>
            )}
            {!drawingDrivenMode && !mobilePresentationMode && <div className="pointer-events-none absolute right-5 bottom-5 z-40 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              {planCanvasModeFootnotes[sheetMode]}
            </div>}
            {isFurnitureSheetMode && plannerMode === "edit" && (
              <div className="pointer-events-none absolute left-5 bottom-5 z-40 max-w-sm rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-xs leading-5 text-stone-600 shadow-sm backdrop-blur">
                <p className="font-semibold text-ink">沉浸家具布置</p>
                <p className="mt-1">拖动家具调整位置，单击家具显示/隐藏画布控制台，右侧模块库继续添加物品。</p>
              </div>
            )}

            {furnitureImmersiveMode && isFurnitureSheetMode && plannerMode === "edit" && activeFurnitureObject && (
              <div
                className="absolute left-5 top-5 z-[58] w-[min(430px,calc(100%-2.5rem))] rounded-2xl border border-white/80 bg-white/96 p-3 text-xs text-stone-600 shadow-soft backdrop-blur"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">家具控制台</p>
                    <h3 className="mt-1 truncate text-sm font-semibold text-ink">{activeFurnitureObject.name}</h3>
                    <p className="mt-1 text-stone-500">
                      {activeFurnitureObject.dimensions.width} x {activeFurnitureObject.dimensions.depth} cm · 占地 {getFurnitureFootprintArea(activeFurnitureObject)} 平米
                    </p>
                  </div>
                  <FurnitureTopView
                    className="size-16 shrink-0 border border-stone-100 shadow-sm"
                    color={activeFurnitureObject.color}
                    imageSrc={activeFurnitureObject.referenceImageDataUrl}
                    label={activeFurnitureObject.code.split("-")[0]}
                    type={activeFurnitureObject.type}
                  />
                </div>

                <div className="mt-3 grid grid-cols-[92px_1fr] gap-3">
                  <div>
                    <p className="mb-2 font-semibold text-ink">移动</p>
                    <div className="grid grid-cols-3 gap-1">
                      <span />
                      <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurnitureLocked} onClick={() => nudgeFurnitureObject(activeFurnitureObject.id, { x: 0, y: -1 })} type="button">上</button>
                      <span />
                      <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurnitureLocked} onClick={() => nudgeFurnitureObject(activeFurnitureObject.id, { x: -1, y: 0 })} type="button">左</button>
                      <span className="rounded-lg bg-slate-900 px-2 py-2 text-center font-semibold text-white">选</span>
                      <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurnitureLocked} onClick={() => nudgeFurnitureObject(activeFurnitureObject.id, { x: 1, y: 0 })} type="button">右</button>
                      <span />
                      <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurnitureLocked} onClick={() => nudgeFurnitureObject(activeFurnitureObject.id, { x: 0, y: 1 })} type="button">下</button>
                      <span />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 font-semibold text-ink">旋转 / 翻转</p>
                    <div className="grid grid-cols-4 gap-1">
                      <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurnitureLocked} onClick={() => rotateFurnitureObject(activeFurnitureObject.id, -15)} type="button">-15</button>
                      <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurnitureLocked} onClick={() => rotateFurnitureObject(activeFurnitureObject.id, 15)} type="button">+15</button>
                      <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurnitureLocked} onClick={() => rotateFurnitureObject(activeFurnitureObject.id, -90)} type="button">-90</button>
                      <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurnitureLocked} onClick={() => rotateFurnitureObject(activeFurnitureObject.id, 90)} type="button">+90</button>
                      <button className={`col-span-2 rounded-lg px-2 py-2 font-semibold disabled:opacity-40 ${activeFurnitureObject.position.flipX ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`} disabled={activeFurnitureLocked} onClick={() => flipFurnitureObject(activeFurnitureObject.id, "x")} type="button">左右翻转</button>
                      <button className={`col-span-2 rounded-lg px-2 py-2 font-semibold disabled:opacity-40 ${activeFurnitureObject.position.flipY ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`} disabled={activeFurnitureLocked} onClick={() => flipFurnitureObject(activeFurnitureObject.id, "y")} type="button">前后翻转</button>
                    </div>
                    <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500">角度 {Math.round(activeFurnitureObject.position.rotation)}°</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {([
                    ["width", "宽 cm"],
                    ["depth", "深 cm"],
                    ["height", "高 cm"]
                  ] as const).map(([field, label]) => (
                    <label key={field} className="block text-[11px] font-semibold text-stone-500">
                      {label}
                      <input
                        className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2 text-sm font-semibold text-ink outline-none focus:border-emerald-400 disabled:bg-stone-100"
                        min="1"
                        disabled={activeFurnitureLocked}
                        type="number"
                        value={activeFurnitureObject.dimensions[field]}
                        onChange={(event) => resizeFurnitureObject(activeFurnitureObject.id, field, Number(event.target.value))}
                      />
                    </label>
                  ))}
                </div>
                {(activeFurnitureObject.type === "wardrobe" || activeFurnitureObject.moduleType === "wardrobe") && (
                  <button
                    className="mt-3 w-full rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                    onClick={() => onOpenWardrobeDesigner?.(activeFurnitureObject.id)}
                    type="button"
                  >
                    进入衣柜设计
                  </button>
                )}
              </div>
            )}

            {visibleDebugLayer && (
              <div className="absolute inset-0" data-layer="DebugLayer" data-coordinate-system="percent-of-floor-plan">
                {debugRooms.map((room) => (
                  <div
                    key={room.id}
                    className="absolute rounded-xl border border-dashed border-amber-500/70 bg-amber-100/15 px-3 py-2 text-xs font-semibold text-amber-700"
                    style={{ left: `${room.bounds.x}%`, top: `${room.bounds.y}%`, width: `${room.bounds.width}%`, height: `${room.bounds.height}%` }}
                  >
                    {room.name}
                  </div>
                ))}

                {debugWalls.map((wall) => {
                  const width = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
                  const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) * (180 / Math.PI);
                  return (
                    <div
                      key={wall.id}
                      className="absolute origin-left rounded-full bg-amber-500/80"
                      style={{
                        left: `${wall.x1}%`,
                        top: `${wall.y1}%`,
                        width: `${width}%`,
                        height: `${wall.thickness * 3}px`,
                        transform: `rotate(${angle}deg)`
                      }}
                    />
                  );
                })}
              </div>
            )}

            {visibleFurnitureOverlay && (
              <div
                className={`absolute inset-0 ${isFurnitureSheetMode ? "z-50" : "z-30"}`}
                data-layer="FurnitureOverlayLayer"
                data-coordinate-system="percent-of-floor-plan"
                style={{ pointerEvents: furniturePointerEventsEnabled ? "auto" : "none" }}
              >
	              {furniture.filter((item) => resolveVisibility(item).visible2d).map((item) => {
	                const isSelected = isObjectSelected(item.id);
	                const isHovered = isObjectHovered(item.id);
	                const locked = resolveLock(item, interactionState).locked2d;
	                const activeDrawingType = normalizeDrawingSheetType(sheetMode);
	                const demandModeActive = Boolean(activeDrawingType && furnitureDemandSheetTypes.has(activeDrawingType));
	                const demandHint = activeDrawingType && demandModeActive ? getFurnitureDemandHint(item, activeDrawingType) : null;
	                const demandMuted = demandModeActive && !demandHint;
	                const displayPosition = getFurnitureDisplayPosition(item);
                const displaySize = getFurnitureDisplaySize(item);
                const renderAsset = resolve3DAsset(item);
                const placementWarnings = furniturePlacementWarnings.filter((warning) => warning.furnitureId === item.id);
                const clearance = item.clearanceMeta;
                const clearanceFront = Math.max(clearance?.frontMm ?? 0, clearance?.serviceMm ?? 0, clearance?.doorSwingMm ?? 0);
                const widthMm = Math.max(1, item.dimensions.width * 10);
                const depthMm = Math.max(1, item.dimensions.depth * 10);
                return (
                  <button
                    key={item.id}
                    className={`absolute grid cursor-grab place-items-center rounded-lg bg-transparent p-0 transition hover:scale-105 ${
                      isSelected ? "z-20 outline outline-2 outline-offset-4 outline-blue-500" : isHovered ? "outline outline-2 outline-offset-3 outline-emerald-600/70" : ""
                    }`}
                    style={{
                      left: `${displayPosition.x}%`,
                      top: `${displayPosition.y}%`,
                      width: `${displaySize.width}%`,
                      height: `${displaySize.height}%`,
	                      minWidth: isFurnitureSheetMode ? "0" : "48px",
	                      minHeight: isFurnitureSheetMode ? "0" : "40px",
	                      opacity: demandMuted ? 0.18 : locked ? 0.6 : 1,
	                      boxShadow: demandHint ? `0 0 0 4px ${demandHint.background}, 0 0 0 7px ${demandHint.color}` : undefined,
	                      transform: `translate(-50%, -50%) rotate(${item.position.rotation}deg)`
	                    }}
                    data-demand-highlight={demandHint?.key ?? (demandModeActive ? "none" : undefined)}
                    data-furniture-id={item.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (skipFurnitureClickRef.current === item.id) {
                        skipFurnitureClickRef.current = "";
                        return;
                      }
                      if (furnitureDragRef.current?.moved) return;
                      setSelectedStructureId("");
                      onSelectFurniture(item);
                    }}
                    onMouseDown={(event) => {
                      if (!mobilePresentationMode) return;
                      event.stopPropagation();
                      setSelectedStructureId("");
                      selectObject(item.id);
                      onSelectFurniture(item);
                    }}
                    onMouseEnter={() => hoverObject(item.id)}
                    onMouseLeave={() => clearHoverObject(item.id)}
                    onTouchStart={(event) => {
                      if (!mobilePresentationMode) return;
                      event.stopPropagation();
                      setSelectedStructureId("");
                      selectObject(item.id);
                      onSelectFurniture(item);
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setSelectedStructureId("");
                      selectObject(item.id);
                      if (selectedFurnitureId !== item.id) {
                        skipFurnitureClickRef.current = item.id;
                        onSelectFurniture(item);
                      }
                      if (mobilePresentationMode) {
                        if (selectedFurnitureId === item.id) onSelectFurniture(item);
                        return;
                      }
                      if (!workspaceMutationAllowed || plannerMode !== "edit" || drawTool !== "select" || locked) {
                        onSelectFurniture(item);
                        return;
                      }
                      const position = getMmPosition(event);
                      if (!position) return;
                      furnitureDragRef.current = { pointerId: event.pointerId, objectId: item.id, lastPosition: position, moved: false, totalDelta: { x: 0, y: 0 }, latestFurniture: item };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      const drag = furnitureDragRef.current;
                      if (!drag || drag.pointerId !== event.pointerId || drag.objectId !== item.id) return;
                      const position = getMmPosition(event);
                      if (!position) return;
                      const delta = { x: position.x - drag.lastPosition.x, y: position.y - drag.lastPosition.y };
                      const usesSiteBounds = floor.id === "1F" || floor.id === "YARD";
                      const minY = usesSiteBounds ? SITE_PLAN_MIN_Y_MM / houseStructure.coordinateSystem.height * 100 : 0;
                      const maxY = usesSiteBounds ? SITE_PLAN_MAX_Y_MM / houseStructure.coordinateSystem.height * 100 : 100;
                      const latestFurniture = applyPlanDelta(drag.latestFurniture, delta, houseStructure.coordinateSystem, { minX: 0, maxX: 100, minY, maxY });
                      drag.latestFurniture = latestFurniture;
                      drag.totalDelta = { x: drag.totalDelta.x + delta.x, y: drag.totalDelta.y + delta.y };
                      onFurnitureChange(furniture.map((candidate) => candidate.id === item.id ? latestFurniture : candidate));
                      drag.lastPosition = position;
                      drag.moved = true;
                    }}
                    onPointerUp={(event) => finishFurnitureDrag(event.pointerId)}
                    onPointerCancel={(event) => finishFurnitureDrag(event.pointerId)}
                    type="button"
                    title={`${locked ? "已锁定 · " : ""}${item.name}${demandHint?.details.length ? ` · ${demandHint.details.join(" · ")}` : ""}`}
                  >
                    {showFurnitureClearances && isFurnitureSheetMode && clearance && (
                      <span
                        className="pointer-events-none absolute z-0 border-2 border-dashed border-cyan-600/75 bg-cyan-300/10"
                        data-clearance-for={item.id}
                        style={{
                          left: `${-((clearance.leftMm ?? 0) / widthMm) * 100}%`,
                          top: `${-((clearance.rearMm ?? 0) / depthMm) * 100}%`,
                          width: `${100 + (((clearance.leftMm ?? 0) + (clearance.rightMm ?? 0)) / widthMm) * 100}%`,
                          height: `${100 + (((clearance.rearMm ?? 0) + clearanceFront) / depthMm) * 100}%`
                        }}
                      />
                    )}
                    <div
                      className="relative z-10 h-full w-full"
                      style={{ transform: `scale(${item.position.flipX ? -1 : 1}, ${item.position.flipY ? -1 : 1})` }}
                    >
	                      <FurnitureTopView assetType={renderAsset.assetType} variantId={renderAsset.variantId} className="h-full w-full drop-shadow-[0_4px_10px_rgba(15,23,42,0.18)]" color={item.color} footprint={item.dimensions} frameless imageSrc={item.referenceImageDataUrl} label={locked ? "LOCK" : developerMode ? item.code : undefined} showLabel={locked || (developerMode && (!furnitureImmersiveMode || furnitureLabelsVisible) && sheetMode !== "furniturePlan")} stretchToFill type={item.type} />
	                    </div>
	                    {placementWarnings.length > 0 && (
	                      <span className="pointer-events-none absolute -left-2 -top-2 z-20 grid min-h-6 min-w-6 place-items-center rounded-full border-2 border-white bg-amber-600 px-1 text-[10px] font-black text-white shadow-md" title={placementWarnings.map((warning) => warning.message).join("\n")}>{placementWarnings.length}</span>
	                    )}
	                    {demandHint && (
	                      <>
	                        <span
	                          className="pointer-events-none absolute -right-3 -top-3 grid min-h-7 min-w-7 place-items-center rounded-full border-2 border-white px-1.5 text-[10px] font-black leading-none shadow-md"
	                          style={{ background: demandHint.background, color: demandHint.color }}
	                        >
	                          {demandHint.label}
	                        </span>
	                        {demandHint.details.length > 0 && (
	                          <span
	                            className="pointer-events-none absolute left-1/2 top-full mt-1 max-w-40 -translate-x-1/2 rounded-md border border-white/90 px-2 py-1 text-[10px] font-bold leading-4 shadow-md"
	                            style={{ background: demandHint.background, color: demandHint.color }}
	                          >
	                            {demandHint.details.join(" · ")}
	                          </span>
	                        )}
	                      </>
	                    )}
                    {isFurnitureSheetMode && !mobilePresentationMode && (!furnitureImmersiveMode || furnitureLabelsVisible) && (
                      <span className="pointer-events-none absolute -bottom-5 left-1/2 min-w-max -translate-x-1/2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {item.dimensions.width} x {item.dimensions.depth} cm · {getFurnitureFootprintArea(item)} 平米
                      </span>
                    )}
                  </button>
                );
              })}
              </div>
            )}

            {visibleFurnitureOverlay && (
              <div className="pointer-events-none absolute inset-0 z-[46]" data-layer="ObjectLabelLayer-Furniture" data-coordinate-system="percent-of-floor-plan">
                {furniture.filter((item) => resolveVisibility(item).visible2d).map((item) => {
                  const selected = selectedInteractionObjectId === item.id;
                  const hovered = isObjectHovered(item.id);
                  const displayPosition = getFurnitureDisplayPosition(item);
                  const debugVisible = showObjectIds && (labelFilter === "all" || labelFilter === "furniture");
                  if (furnitureImmersiveMode && !furnitureLabelsVisible) return null;
                  if (!selected && !hovered && !debugVisible) return null;
                  const mode = selected ? "selected" : hovered ? "hover" : "debug";
                  const responsiveClass = mode === "selected"
                    ? "block"
                    : mode === "hover"
                      ? "hidden [@media(hover:hover)]:block"
                      : "hidden sm:block";
                  const toneClass = mode === "selected"
                    ? "border-blue-950 bg-blue-700 text-white ring-2 ring-white"
                    : mode === "hover"
                      ? "border-slate-950 bg-slate-950 text-white ring-2 ring-white"
                      : "border-slate-700 bg-white/95 text-slate-950 ring-1 ring-white";
                  return (
                    <div
                      key={`furniture-label-${item.id}`}
                      className={`${responsiveClass} absolute w-max max-w-60 -translate-x-1/2 -translate-y-full rounded-md border-2 px-3 py-2 text-center text-sm leading-tight shadow-[0_8px_20px_rgba(15,23,42,0.34)] ${toneClass}`}
                      style={{
                        left: `${displayPosition.x}%`,
                        top: `${displayPosition.y + (furnitureLabelOffsets.get(item.id) ?? 0)}%`,
                        marginTop: "-8px"
                      }}
                    >
                      <div className="font-extrabold">{developerMode ? item.id : item.name}</div>
                      {developerMode && (mode !== "debug" || selected) && <div className="mt-1 max-w-56 whitespace-normal break-words text-xs font-semibold opacity-95">{item.name}</div>}
                      {mode === "hover" && <div className="mt-1 text-[10px] font-semibold uppercase opacity-70">Furniture</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {visibleSemanticOverlay && (
              <div className="absolute inset-0 z-40" data-layer="SemanticOverlayLayer" data-coordinate-system="percent-of-floor-plan">
              {semanticObjects.map((object) => {
                const position = getSemanticObjectPosition(object);
                if (!position) return null;
                const isSelected = object.id === selectedSemanticObjectId;
                const isDraggableFurniture = object.category === "Furniture";
                const boundary = getBoundary(object);
                const wallLine = object.category === "Wall" ? getWallLine(object) : null;

                if ((object.category === "Room" || object.category === "Zone") && boundary.length >= 3) {
                  const points = boundary.map((point) => `${point.x}% ${point.y}%`).join(", ");
                  return (
                    <button
                      key={object.id}
                      className={`absolute inset-0 transition ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                      style={{
                        clipPath: `polygon(${points})`,
                        backgroundColor: object.category === "Room" ? "rgba(59, 130, 246, 0.08)" : "rgba(47, 125, 103, 0.1)",
                        border: "1px solid rgba(37, 99, 235, 0.28)"
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectSemanticObject(object);
                      }}
                      title={`${semanticCategoryLabels[object.category]} · ${object.name}`}
                      type="button"
                    />
                  );
                }

                if (wallLine) {
                  const width = Math.hypot(wallLine.end.x - wallLine.start.x, wallLine.end.y - wallLine.start.y);
                  const angle = Math.atan2(wallLine.end.y - wallLine.start.y, wallLine.end.x - wallLine.start.x) * (180 / Math.PI);
                  return (
                    <button
                      key={object.id}
                      className={`absolute origin-left rounded-full ${isSelected ? "bg-blue-500 ring-4 ring-blue-500/20" : "bg-slate-700/75"}`}
                      style={{
                        left: `${wallLine.start.x}%`,
                        top: `${wallLine.start.y}%`,
                        width: `${width}%`,
                        height: `${Math.max(2, wallLine.thickness * 2)}px`,
                        transform: `rotate(${angle}deg)`
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectSemanticObject(object);
                      }}
                      title={`${semanticCategoryLabels[object.category]} · ${object.name}`}
                      type="button"
                    />
                  );
                }

                if (object.category === "Furniture") {
                  const details = object.details as { size?: { width?: number; depth?: number }; rotation?: number };
                  const width = Math.max(5, (details.size?.width ?? 120) / 26);
                  const height = Math.max(4, (details.size?.depth ?? 80) / 26);
                  return (
                    <button
                      key={object.id}
                      className={`absolute z-30 grid place-items-center rounded-md border text-[10px] font-bold transition hover:scale-105 ${
                        isSelected ? "border-blue-500 bg-blue-100/70 text-blue-950 ring-4 ring-blue-500/20" : "border-blue-500/60 bg-blue-100/55 text-blue-950"
                      }`}
                      style={{
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                        minWidth: "40px",
                        minHeight: "30px",
                        transform: `translate(-50%, -50%) rotate(${details.rotation ?? 0}deg)`
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (objectDragRef.current?.moved) return;
                        onSelectSemanticObject(object);
                      }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (mobilePresentationMode || !workspaceMutationAllowed) return;
                        objectDragRef.current = { pointerId: event.pointerId, objectId: object.id, moved: false };
                        event.currentTarget.setPointerCapture(event.pointerId);
                        onSelectSemanticObject(object);
                      }}
                      onPointerMove={(event) => {
                        const drag = objectDragRef.current;
                        if (!drag || drag.pointerId !== event.pointerId || drag.objectId !== object.id) return;
                        const nextPosition = getPercentPosition(event);
                        if (!nextPosition) return;
                        drag.moved = true;
                        onMoveSemanticObject(object.id, nextPosition);
                      }}
                      onPointerUp={(event) => {
                        if (objectDragRef.current?.pointerId === event.pointerId) {
                          window.setTimeout(() => {
                            objectDragRef.current = null;
                          }, 0);
                        }
                      }}
                      title={`${semanticCategoryLabels[object.category]} · ${object.name}`}
                      type="button"
                    >
                      {semanticIdPrefixes[object.category]}
                    </button>
                  );
                }

                return (
                  <button
                    key={object.id}
                    className={`absolute z-30 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-bold shadow-sm transition hover:scale-110 ${
                      isSelected ? "border-blue-500 bg-blue-600 text-white ring-4 ring-blue-500/20" : "border-white bg-slate-800/82 text-white"
                    }`}
                    style={{ left: `${position.x}%`, top: `${position.y}%` }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (objectDragRef.current?.moved) return;
                      onSelectSemanticObject(object);
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      if (mobilePresentationMode || !workspaceMutationAllowed) return;
                      if (!workspaceMutationAllowed || !isDraggableFurniture) return;
                      objectDragRef.current = { pointerId: event.pointerId, objectId: object.id, moved: false };
                      event.currentTarget.setPointerCapture(event.pointerId);
                      onSelectSemanticObject(object);
                    }}
                    onPointerMove={(event) => {
                      const drag = objectDragRef.current;
                      if (!drag || drag.pointerId !== event.pointerId || drag.objectId !== object.id) return;
                      const nextPosition = getPercentPosition(event);
                      if (!nextPosition) return;
                      drag.moved = true;
                      onMoveSemanticObject(object.id, nextPosition);
                    }}
                    onPointerUp={(event) => {
                      if (objectDragRef.current?.pointerId === event.pointerId) {
                        window.setTimeout(() => {
                          objectDragRef.current = null;
                        }, 0);
                      }
                    }}
                    title={`${semanticCategoryLabels[object.category]} · ${object.name}`}
                    type="button"
                  >
                    <span>{semanticIdPrefixes[object.category]}</span>
                  </button>
                );
              })}
              </div>
            )}

            {visibleStructureLabels && renderStructureHtmlLabelLayer()}
            {renderMobilePresentationLabelLayer()}

            {isManualCleanupMode && (
              <div
                className="absolute inset-0 z-50 cursor-crosshair bg-blue-500/[0.03]"
                data-layer="ManualCleanupSelectionLayer"
                data-coordinate-system="percent-of-floor-plan"
                onPointerDown={handleCleanupPointerDown}
                onPointerMove={handleCleanupPointerMove}
                onPointerUp={handleCleanupPointerUp}
                onPointerCancel={handleCleanupPointerUp}
              >
                {cleanupSelection && (
                  <div
                    className="absolute border border-blue-600 bg-blue-300/20"
                    style={{
                      left: `${cleanupSelection.x}%`,
                      top: `${cleanupSelection.y}%`,
                      width: `${cleanupSelection.width}%`,
                      height: `${cleanupSelection.height}%`
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Floor3DView
          floor={floor}
          houseStructure={houseStructure}
          houseStructuresByFloor={constructionExportWorkspace.houseStructuresByFloor}
          stairSystems={constructionExportWorkspace.stairSystems}
          stairLandings={constructionExportWorkspace.stairLandings}
          stairOpenings={constructionExportWorkspace.stairOpenings}
          furniture={furniture}
          allFurniture={constructionExportWorkspace.furniture}
          drawingItems={drawingItems}
          allDrawingItems={constructionExportWorkspace.drawingItems}
          drawingSheetType={normalizeDrawingSheetType(sheetMode) ?? "sitePlan"}
          mobilePresentationMode={mobilePresentationMode}
          externalPresentationMode={editorPresentationMode}
          mobileQuality={mobileQuality}
          resetViewRequest={resetViewRequest}
          cameraViews={cameraViews}
          roomTourViews={roomTourViews}
          lightingDesign={lightingDesign}
          cameraViewFloorIds={cameraViewFloorIds}
          cameraViewRequest={cameraViewRequest}
          selectedObjectId={selectedDrawingItemId || selectedInteractionObjectId}
          selectedFurnitureId={selectedFurnitureId}
          showObjectIds={developerMode && showObjectIds}
          showDebugTools={developerMode}
          onShowObjectIdsChange={(visible) => { if (developerMode) setShowObjectIds(visible); }}
          onSelectStructure={(objectId) => {
            setSelectedDrawingItemId("");
            setSelectedStructureId(objectId);
            selectObject(objectId);
            onSelectStructureObject?.(objectId);
            onActiveObjectChange(objectId);
            setStructureMessage(`已在 3D 效果中选择 ${objectId}。`);
          }}
          onSelectFurniture={(item) => {
            setSelectedDrawingItemId("");
            setSelectedStructureId("");
            setInteractionState((currentState) => ({ ...currentState, selectedObjectId: item.id, editingObjectId: item.id }));
            selectObject(item.id);
            onSelectFurniture(item);
          }}
          onSelectDrawingItem={(drawingItemId) => {
            setSelectedDrawingItemId(drawingItemId);
            setSelectedStructureId("");
            selectObject(drawingItemId);
            onActiveObjectChange(drawingItemId);
            setStructureMessage(`已在 3D 专项中选择 ${drawingItemId}。`);
          }}
          onSelectFloor={onSelectFloor}
          onHoverObject={hoverObject}
          onClearHoverObject={clearHoverObject}
          onSelectCameraView={onSelectCameraView}
          onSceneSettingsChange={onSceneSettingsChange}
        />
      )}
    </div>
  );
}
