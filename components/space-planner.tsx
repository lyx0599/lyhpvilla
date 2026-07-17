"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FurnitureTopView } from "@/components/furniture-top-view";
import { FurnitureMetadataEditor } from "@/components/furniture-metadata-editor";
import { DimensionVerificationEditor } from "@/components/dimension-verification-editor";
import { MobileDetailsDrawer } from "@/components/mobile-details-drawer";
import { PlanCanvas } from "@/components/plan-canvas";
import { SemanticMapPanel } from "@/components/semantic-map-panel";
import { BottomStatusBar } from "@/components/editor/bottom-status-bar";
import { ContextToolBar } from "@/components/editor/context-toolbar";
import { DrawingDirectory } from "@/components/editor/drawing-directory";
import { EditorUtilityDialog } from "@/components/editor/editor-utility-dialog";
import { MoreMenu, type EditorDialogKey } from "@/components/editor/more-menu";
import { RightPanelFrame, RightPanelRail, type EditorRightPanelKey } from "@/components/editor/right-panel-frame";
import { TopNavigation } from "@/components/editor/top-navigation";
import { WorkspaceTabs } from "@/components/editor/workspace-tabs";
import { UnifiedObjectList, type UnifiedObjectListItem } from "@/components/editor/unified-object-list";
import { DrawingPackageManager } from "@/components/editor/drawing-package-manager";
import { ExplorationMode } from "@/components/exploration-mode";
import type { Shared3DSceneSettings } from "@/components/floor-3d-view";
import { interiorModuleCatalog, interiorModuleCategoryLabels, serviceRequirementLabels } from "@/data/interior-module-catalog";
import type { InteriorModuleCatalogItem } from "@/data/interior-module-catalog";
import { autoRepairHouse, validateHouse } from "@/src/core/houseValidator";
import { SITE_PLAN_MAX_Y_MM, SITE_PLAN_MIN_Y_MM, STRUCTURE_HEIGHT_MM, createEmptyStructure, createOutdoor, getLineLength, getPolygonArea } from "@/lib/house-geometry";
import { applyFloorPlanPreset, floorPlanPresetLabels, getDefaultVisualSettings } from "@/lib/floor-plan-cleanup";
import type { WallSyncOverrides } from "@/lib/villa-structure-sync";
import { enrichFurniture3DMeta } from "@/lib/render3d-assets";
import { drawingItemCategoryLabels, generateDrawingItemsFromFurniture } from "@/lib/drawing-items";
import { generateLightingDesignV1, modernWarmFixtureFamilies } from "@/lib/lighting-design";
import { createUnifiedCourtyardModel, courtyardViewFloorIds } from "@/lib/courtyard-model";
import { buildUnifiedSceneGraph, resolveUnifiedSceneScope } from "@/lib/unified-scene-graph";
import { createSyncSelfCheckReport, resolveSelection } from "@/lib/object-sync-adapter";
import { DEFAULT_MOBILE_ACCESS_MODE, getDefaultAccessModeForDevice, getWorkspaceAccessCapabilities } from "@/lib/workspace-access";
import { applyWorkspaceMigrations, CURRENT_WORKSPACE_DATA_REVISION, CURRENT_WORKSPACE_SCHEMA_VERSION, reportWorkspaceDataSources } from "@/lib/workspace-migrations";
import { compareWorkspace, getDetailedWorkspaceDifference, getWorkspaceDifferenceSummary, getWorkspaceHash, getWorkspaceStats, getWorkspaceValidationErrors, validateWorkspacePayload } from "@/lib/workspace-persistence";
import { validateWorkspaceReferences } from "@/lib/workspace-reference-validator";
import { validateStairSystems } from "@/lib/stair-systems";
import { deriveRoomTourViews } from "@/lib/room-tour";
import { canExecuteEditorCommand, type ExplorationEditorMode } from "@/lib/exploration-mode";
import { normalizeDrawingSheetType } from "@/lib/drawing-sheets";
import { getDrawing3DPresentationProfile } from "@/lib/drawing-3d-profiles";
import {
  getAdjacentDrawingWorkspace,
  getDefaultDrawingWorkspace,
  getDefaultWorkspaceTab,
  getDrawingWorkspace,
  resolveDrawingWorkspace,
  type DrawingWorkspaceConfig,
  type DrawingWorkspaceTool,
  type WorkspaceTabId,
  type WorkspaceViewDefinition
} from "@/lib/drawing-workspaces";
import { evaluateOutputDrawings } from "@/lib/output-drawings";
import { getValidationProductGroup, groupValidationFindings, type ValidationFinding } from "@/lib/validation-rules";
import { synchronizeFurnitureHeights, validateSceneHeightSystem } from "@/lib/scene-height-system";
import {
  commitFurnitureSpaceAssignment,
  getRelatedDrawingItemSyncState,
  reconcileFurnitureWallAnchors,
  refreshFurnitureWallAnchorFromPosition,
  resolveFurnitureSpaceAssignment,
  syncRelatedDrawingItemsToFurniture,
  validateFurniturePlacement
} from "@/lib/furniture-placement";
import {
  applyModernNaturalStyle,
  previewModernNaturalApplication,
  withFurnitureVariantDefaults
} from "@/lib/furniture-variants";
import type { ModernNaturalScope } from "@/lib/furniture-variants";
import {
  findVerificationTarget,
  getVerificationDisplayState,
  getVerificationTargetEntries,
  normalizeVerificationMeta,
  verificationCollectionLabels,
  verificationDisplayStateLabels
} from "@/lib/dimension-verification";
import type { VerificationDisplayState, VerificationTargetEntry } from "@/lib/dimension-verification";
import type { AccessMode, CabinetDesign, CabinetDesignZone, CleanPatch, DrawingItem, DrawingPackage, DrawingSheetType, DrawTool, FixedCameraView, FloorId, FloorPlanPreset, FloorPlanVisualSettings, Furniture, HouseDoor, HouseOutdoor, HouseOutdoorSurface, HouseRoom, HouseSkylight, HouseStair, HouseStructure, HouseWall, HouseWindow, InteriorModuleCategory, MobileDisplayLevel, MobileQuality, PlanCanvasMode, PlannerMode, Render3DAssetType, RoomTourView, SpaceData, StairLanding, StairOpening, StairSystem, ViewMode, WardrobeCellKind, WardrobeDesign } from "@/types/space";
import type { SemanticObject } from "@/types/semantic-map";
import type { LightingDesign, WorkspaceDocument } from "@/types/workspace";

type ModelSnapshot = {
  structure: HouseStructure;
  furniture: Furniture[];
  drawingItems: DrawingItem[];
  lightingDesign?: LightingDesign;
};

const fallbackLightingDesign: LightingDesign = {
  version: "modern-warm-v1",
  style: "modern-warm",
  generatedAt: "2026-07-13T00:00:00.000Z",
  fixtureFamilies: modernWarmFixtureFamilies,
  scenes: [],
  pendingConfirmations: ["灯具品牌、IES 配光、功率与安装节点需在采购和施工前确认。"]
};

type DesignPageRequest = {
  kind: "furniture" | "stair";
  id: string;
};

type DesignPageData = {
  id: string;
  eyebrow: string;
  title: string;
  subject: string;
  designThinking: string;
  recommendedPlacement: string;
  layoutNotes: string[];
  zones: CabinetDesignZone[];
  cautionNotes: string[];
  metrics: Array<{ label: string; value: string; note?: string }>;
};

type FloorHistory = {
  past: ModelSnapshot[];
  future: ModelSnapshot[];
};

type RightPanelKey = "floors" | "status" | "modules" | "object" | "semantic";
type MobileProfessionalSheetMode = Extract<DrawingSheetType, "socketPlan" | "switchPlan" | "lightingPlan" | "waterSupplyPlan" | "drainagePlan" | "ceilingPlan" | "floorFinishPlan" | "wallFinishPlan" | "materialPlan" | "annotationPlan">;
type MobileSheetTarget =
  | { kind: "project" }
  | { kind: "furniture" | "semantic" | "structure"; id: string };
type LocalCodeFileStatus = "checking" | "unsupported" | "unbound" | "bound" | "syncing" | "synced" | "error";
type DraftSaveState = {
  status: "idle" | "saving" | "saved" | "error";
  lastSavedAt?: string;
  error?: string;
  hash?: string;
};
type CodeSaveTarget = "local-service" | "file-handle" | "github" | "download" | "none";
type CodeSaveState = {
  status: "idle" | "dirty" | "saving" | "saved_unverified" | "verified" | "error" | "exported_only";
  target: CodeSaveTarget;
  lastAttemptAt?: string;
  lastVerifiedAt?: string;
  filePath?: string;
  backupPath?: string;
  hash?: string;
  error?: string;
};
type PublishState = {
  status: "idle" | "pending" | "published" | "error";
  lastPublishedAt?: string;
  error?: string;
};
type LocalCodeWritableFile = {
  write: (content: string) => Promise<void> | void;
  close: () => Promise<void> | void;
};
type LocalCodeReadableFile = {
  text: () => Promise<string>;
};
type LocalCodeFileHandle = {
  name: string;
  kind?: string;
  getFile?: () => Promise<LocalCodeReadableFile>;
  createWritable: () => Promise<LocalCodeWritableFile>;
  queryPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
};
type LocalFilePickerWindow = Window & {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<LocalCodeFileHandle[]>;
};

const WEB_WORKSPACE_SCHEMA_VERSION = CURRENT_WORKSPACE_SCHEMA_VERSION;
const DEFAULT_WORKSPACE_REVISION = CURRENT_WORKSPACE_DATA_REVISION;
const WEB_WORKSPACE_STORAGE_KEY = "villa-space-web-workspace-v3-courtyard-fence";
const WEB_WORKSPACE_STABLE_KEY = "villa-space-web-workspace-stable";
const WEB_WORKSPACE_DRAFT_KEY = "villa-space-web-workspace-draft";
const WEB_WORKSPACE_DISCARDED_BACKUP_KEY = "villa-space-web-workspace-discarded-backup";
const WEB_WORKSPACE_STORAGE_KEYS = [
  WEB_WORKSPACE_STORAGE_KEY,
  WEB_WORKSPACE_STABLE_KEY,
  "villa-space-web-workspace-v2",
  "villa-space-web-workspace"
];
const GITHUB_SOLIDIFY_OWNER = "lyx0599";
const GITHUB_SOLIDIFY_REPO = "lyhpvilla";
const GITHUB_SOLIDIFY_BRANCH = "main";
const GITHUB_SOLIDIFY_PATH = "data/default-workspace.json";
const GITHUB_SOLIDIFY_TOKEN_KEY = "villa-space-github-solidify-token";
const LOCAL_CODE_FILE_DB_NAME = "villa-space-local-code-file";
const LOCAL_CODE_FILE_STORE_NAME = "handles";
const LOCAL_CODE_FILE_HANDLE_KEY = "default-workspace";
const LOCAL_CODE_AUTO_SYNC_KEY = "villa-space-local-code-auto-sync";
const LOCAL_CODE_SYNC_ENDPOINT = "http://127.0.0.1:3011/default-workspace";
const LOCAL_CODE_SYNC_HEALTH_ENDPOINT = "http://127.0.0.1:3011/health";
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
const WORKSPACE_ASSET_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const moduleCategoryOrder: InteriorModuleCategory[] = ["living", "bedroom", "kitchen", "bath", "storage", "decor"];
const retiredDefaultFurnitureIds = new Set([
  "furn-bed-001",
  "furn-island-001",
  "furn-sofa-001",
  "furn-tv-001",
  "furn-living-sofa-natural-001",
  "furn-living-plant-001",
  "furn-2f-master-bedroom-bedside-wardrobe-001"
]);
const persistentDefaultFurnitureIds = new Set([
  "module-2f-cloak-left",
  "module-2f-cloak-right",
  "module-2f-window-desk",
  "ph-1f-north-bbq-island",
  "ph-1f-south-drying-rack",
  "ph-1f-south-lounge-set",
  "ph-1f-south-dog-house",
  "ph-1f-south-pet-water"
]);
const retiredSemanticObjectIds = new Set(["F-1F-001", "R-B1-001"]);
const retiredDefaultBayWindowIds = new Set(["BW-1F-001", "BW-1F-002"]);
const b1VoidRailingWallIds = new Set(["W-B1-014", "AW-B1-014", "W-B1-012", "W-B1-013"]);
const b1VoidRailingWallOverrides: Pick<HouseWall, "barrierType" | "material" | "openness" | "thickness" | "height"> = {
  barrierType: "railing",
  material: "glass",
  openness: 0.88,
  thickness: 90,
  height: 1100
};
const oneFloorKitchenSlidingDoorOverride: Partial<HouseDoor> = {
  name: "厨房半透明玻璃推拉门",
  width: 900,
  height: 2100,
  operation: "sliding",
  material: "translucentGlass",
  transparency: 0.45
};
const twoFloorDoorOverrides: Record<string, Partial<HouseDoor>> = {
  "D-2F-008": {
    name: "主卧门",
    openDirection: "rightIn"
  }
};
const oneFloorWindowOverrides: Record<string, Partial<HouseWindow>> = {
  "WIN-1F-006": {
    name: "客厅南院普通窗",
    hostId: "W-1F-015",
    hostType: "wall",
    positionOnWall: 0.78,
    width: 1200,
    height: 1400
  }
};
const furnitureDimensionFields: Array<["width" | "depth" | "height", string]> = [
  ["width", "宽 cm"],
  ["depth", "深 cm"],
  ["height", "高 cm"]
];
const outdoorSurfaceMaterials: Array<{ value: HouseOutdoorSurface["material"]; label: string }> = [
  { value: "pebble", label: "鹅卵石" },
  { value: "stone", label: "石板" },
  { value: "wood", label: "木板" },
  { value: "concrete", label: "水泥地" },
  { value: "grass", label: "草坪" },
  { value: "shrub", label: "花境" }
];
const protectedYardOutdoors: HouseOutdoor[] = [
  {
    ...createOutdoor("OD-1F-NORTH-001", "1F", [{ x: 950, y: -1650 }, { x: 9495, y: -1650 }, { x: 9495, y: 350 }, { x: 950, y: 350 }]),
    name: "北院 / 入户庭院 · 2m"
  },
  {
    ...createOutdoor("OD-1F-SOUTH-001", "1F", [{ x: 950, y: 7800 }, { x: 9495, y: 7800 }, { x: 9495, y: 11800 }, { x: 950, y: 11800 }]),
    name: "南院 / 生活庭院 · 4m"
  }
];
const wardrobeCellLabels: Record<WardrobeCellKind, string> = {
  "hanging-long": "长衣",
  "hanging-short": "短衣",
  folded: "叠放",
  drawer: "抽屉",
  open: "开放",
  shoe: "鞋包",
  blank: "留空"
};
const wardrobeModuleDefaults: Record<WardrobeCellKind, { width: number; height: number; minWidth: number; minHeight: number }> = {
  "hanging-long": { width: 34, height: 72, minWidth: 22, minHeight: 56 },
  "hanging-short": { width: 34, height: 48, minWidth: 22, minHeight: 34 },
  folded: { width: 28, height: 24, minWidth: 18, minHeight: 14 },
  drawer: { width: 28, height: 16, minWidth: 18, minHeight: 10 },
  open: { width: 28, height: 24, minWidth: 16, minHeight: 12 },
  shoe: { width: 32, height: 18, minWidth: 20, minHeight: 12 },
  blank: { width: 22, height: 18, minWidth: 12, minHeight: 10 }
};

function clampPercent(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeWardrobeColumnWidths(widths: number[] | undefined, columns: number) {
  const minWidth = 10;
  const rawWidths = widths?.length === columns ? widths : Array.from({ length: columns }).map(() => 100 / columns);
  const clampedWidths = rawWidths.map((width) => Math.max(minWidth, Number.isFinite(width) ? width : 100 / columns));
  const total = clampedWidths.reduce((sum, width) => sum + width, 0) || 100;
  return clampedWidths.map((width) => Number(((width / total) * 100).toFixed(2)));
}

function normalizeWardrobePartHeights(heights: number[] | undefined, count: number) {
  const safeCount = Math.max(1, count);
  const minHeight = 6;
  const rawHeights = heights?.length === safeCount ? heights : Array.from({ length: safeCount }).map(() => 100 / safeCount);
  const clampedHeights = rawHeights.map((height) => Math.max(minHeight, Number.isFinite(height) ? height : 100 / safeCount));
  const total = clampedHeights.reduce((sum, height) => sum + height, 0) || 100;
  return clampedHeights.map((height) => Number(((height / total) * 100).toFixed(2)));
}

function setWardrobePartHeight(heights: number[] | undefined, index: number, value: number, count: number) {
  const minHeight = 6;
  const current = normalizeWardrobePartHeights(heights, count);
  const next = [...current];
  const targetIndex = Math.min(next.length - 1, Math.max(0, index));
  const desired = Math.min(100 - minHeight * (next.length - 1), Math.max(minHeight, Number(value) || minHeight));
  const diff = desired - next[targetIndex];
  next[targetIndex] = desired;
  const otherIndexes = next.map((_, partIndex) => partIndex).filter((partIndex) => partIndex !== targetIndex);

  if (diff > 0) {
    let remaining = diff;
    const surplusTotal = otherIndexes.reduce((sum, partIndex) => sum + Math.max(0, next[partIndex] - minHeight), 0);
    otherIndexes.forEach((partIndex, order) => {
      const isLast = order === otherIndexes.length - 1;
      const available = Math.max(0, next[partIndex] - minHeight);
      const share = isLast ? remaining : surplusTotal ? diff * (available / surplusTotal) : remaining / (otherIndexes.length - order);
      const reduction = Math.min(available, share);
      next[partIndex] -= reduction;
      remaining -= reduction;
    });
  } else if (diff < 0) {
    const increase = Math.abs(diff);
    otherIndexes.forEach((partIndex) => {
      next[partIndex] += increase / otherIndexes.length;
    });
  }

  return normalizeWardrobePartHeights(next, count);
}

function getCumulativePercents(parts: number[]) {
  let cursor = 0;
  return parts.slice(0, -1).map((part) => {
    cursor += part;
    return cursor;
  });
}

function getWardrobeColumnMetrics(widths: number[]) {
  let cursor = 0;
  return widths.map((width, index) => {
    const metric = { index, x: cursor, width };
    cursor += width;
    return metric;
  });
}

function getWardrobeModuleLayout(module: NonNullable<WardrobeDesign["modules"]>[number], columnWidths: number[]) {
  if (typeof module.column !== "number") {
    return { x: module.x, y: module.y, width: module.width, height: module.height };
  }
  const columns = getWardrobeColumnMetrics(columnWidths);
  const column = Math.min(columns.length - 1, Math.max(0, Math.round(module.column)));
  const span = Math.min(columns.length - column, Math.max(1, Math.round(module.columnSpan ?? 1)));
  const x = columns[column]?.x ?? module.x;
  const width = columns.slice(column, column + span).reduce((sum, item) => sum + item.width, 0);
  return { x, y: module.y, width, height: module.height };
}

function createRecommendedWardrobeDesign(dimensions: Furniture["dimensions"]): WardrobeDesign {
  const height = Math.max(180, dimensions.height || 240);
  const width = Math.max(160, dimensions.width || 300);
  const topHeight = clampPercent((42 / height) * 100, 15, 22);
  const drawerHeight = clampPercent((54 / height) * 100, 16, 24);
  const shoeHeight = clampPercent((34 / height) * 100, 12, 18);
  const leftWidth = width >= 320 ? 32 : width >= 260 ? 34 : 38;
  const middleWidth = width >= 260 ? 34 : 32;
  const rightWidth = Math.max(22, 100 - leftWidth - middleWidth);
  const lowerY = topHeight;
  const lowerHeight = 100 - topHeight;
  const columnWidths = normalizeWardrobeColumnWidths([leftWidth, middleWidth, rightWidth], 3);
  const modules: NonNullable<WardrobeDesign["modules"]> = [
    { id: "recommended-seasonal", kind: "open", label: "顶部换季区", column: 0, columnSpan: 3, x: 0, y: 0, width: 100, height: topHeight },
    { id: "recommended-long", kind: "hanging-long", label: "长衣区", column: 0, columnSpan: 1, x: 0, y: lowerY, width: columnWidths[0], height: lowerHeight },
    { id: "recommended-short", kind: "hanging-short", label: "短衣区", column: 1, columnSpan: 1, x: columnWidths[0], y: lowerY, width: columnWidths[1], height: lowerHeight - drawerHeight },
    { id: "recommended-drawer", kind: "drawer", label: "抽屉区", column: 1, columnSpan: 1, drawerRows: 3, drawerColumns: 1, drawerRowHeights: normalizeWardrobePartHeights(undefined, 3), x: columnWidths[0], y: 100 - drawerHeight, width: columnWidths[1], height: drawerHeight },
    { id: "recommended-folded", kind: "folded", label: "叠放区", column: 2, columnSpan: 1, shelfCount: 4, shelfLayerHeights: normalizeWardrobePartHeights(undefined, 5), x: columnWidths[0] + columnWidths[1], y: lowerY, width: columnWidths[2], height: lowerHeight - shoeHeight },
    { id: "recommended-shoe", kind: "shoe", label: "鞋包区", column: 2, columnSpan: 1, x: columnWidths[0] + columnWidths[1], y: 100 - shoeHeight, width: columnWidths[2], height: shoeHeight }
  ];
  return {
    columns: 3,
    rows: 4,
    cells: createWardrobeCells(3, 4),
    modules,
    columnWidths,
    notes: "已按当前柜体尺寸生成推荐方案：顶部换季区、长衣区、短衣区、抽屉区、叠放区和鞋包区。可继续微调各模块位置和尺寸。"
  };
}

function createWardrobeCells(columns: number, rows: number, existing: WardrobeDesign["cells"] = []): WardrobeDesign["cells"] {
  return Array.from({ length: columns * rows }).map((_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const existingCell = existing.find((cell) => cell.column === column && cell.row === row);
    const kind: WardrobeCellKind = column === 0 ? (row <= 1 ? "hanging-long" : "hanging-short") : column === columns - 1 ? "folded" : row === rows - 1 ? "drawer" : "open";
    return existingCell ?? {
      id: `cell-${column}-${row}`,
      column,
      row,
      kind
    };
  });
}

function normalizeWardrobeModuleDetails(module: NonNullable<WardrobeDesign["modules"]>[number], columns = 3): NonNullable<WardrobeDesign["modules"]>[number] {
  const inferredColumn = Math.min(columns - 1, Math.max(0, Math.floor(((module.x ?? 0) / 100) * columns)));
  const inferredSpan = module.width >= 90 ? columns - inferredColumn : Math.max(1, Math.round(((module.width ?? (100 / columns)) / 100) * columns));
  const column = typeof module.column === "number" ? Math.min(columns - 1, Math.max(0, Math.round(module.column))) : inferredColumn;
  const columnSpan = Math.min(columns - column, Math.max(1, Math.round(module.columnSpan ?? inferredSpan)));
  return {
    ...module,
    column,
    columnSpan,
    drawerRows: module.kind === "drawer" ? Math.min(8, Math.max(1, Math.round(module.drawerRows ?? 3))) : undefined,
    drawerColumns: module.kind === "drawer" ? Math.min(4, Math.max(1, Math.round(module.drawerColumns ?? 1))) : undefined,
    drawerRowHeights: module.kind === "drawer" ? normalizeWardrobePartHeights(module.drawerRowHeights, Math.min(8, Math.max(1, Math.round(module.drawerRows ?? 3)))) : undefined,
    shelfCount: module.kind === "folded" ? Math.min(8, Math.max(1, Math.round(module.shelfCount ?? 4))) : undefined,
    shelfLayerHeights: module.kind === "folded" ? normalizeWardrobePartHeights(module.shelfLayerHeights, Math.min(8, Math.max(1, Math.round(module.shelfCount ?? 4))) + 1) : undefined
  };
}

function normalizeWardrobeDesign(design?: WardrobeDesign): WardrobeDesign {
  const columns = Math.min(6, Math.max(1, Math.round(design?.columns ?? 3)));
  const rows = Math.min(8, Math.max(1, Math.round(design?.rows ?? design?.shelfRows ?? 4)));
  const baseCells: WardrobeDesign["cells"] = design?.cells?.length
    ? design.cells
    : createWardrobeCells(columns, rows).map((cell) => {
      if ((design?.hangingZones ?? 1) > cell.column) return { ...cell, kind: (cell.row <= 1 ? "hanging-long" : "hanging-short") as WardrobeCellKind };
      if (cell.column >= columns - (design?.foldedZones ?? 1)) return { ...cell, kind: "folded" as WardrobeCellKind };
      if ((design?.drawerCount ?? 0) > 0 && cell.row === rows - 1) return { ...cell, kind: "drawer" as WardrobeCellKind };
      if (design?.shoeRack && cell.column === 0 && cell.row === rows - 1) return { ...cell, kind: "shoe" as WardrobeCellKind };
      return cell;
    });
  const legacyModules = baseCells.map((cell) => ({
    id: `module-${cell.column}-${cell.row}`,
    kind: cell.kind,
    column: cell.column,
    columnSpan: 1,
    drawerRows: cell.kind === "drawer" ? 3 : undefined,
    drawerColumns: cell.kind === "drawer" ? 1 : undefined,
    drawerRowHeights: cell.kind === "drawer" ? normalizeWardrobePartHeights(undefined, 3) : undefined,
    shelfCount: cell.kind === "folded" ? 4 : undefined,
    shelfLayerHeights: cell.kind === "folded" ? normalizeWardrobePartHeights(undefined, 5) : undefined,
    x: Math.round((cell.column / columns) * 100),
    y: Math.round((cell.row / rows) * 100),
    width: Math.round(100 / columns),
    height: Math.round(100 / rows)
  }));
  return {
    columns,
    rows,
    cells: createWardrobeCells(columns, rows, baseCells),
    modules: (design?.modules?.length ? design.modules : legacyModules).map((module) => normalizeWardrobeModuleDetails(module, columns)),
    columnWidths: normalizeWardrobeColumnWidths(design?.columnWidths, columns),
    notes: design?.notes ?? "预留长衣区、短衣区和可调层板，深化时按实际衣物数量调整。"
  };
}

const defaultWardrobeDesign: WardrobeDesign = {
  columns: 3,
  rows: 4,
  cells: createWardrobeCells(3, 4),
  modules: createRecommendedWardrobeDesign({ width: 300, depth: 60, height: 240, unit: "cm" }).modules,
  columnWidths: createRecommendedWardrobeDesign({ width: 300, depth: 60, height: 240, unit: "cm" }).columnWidths,
  notes: "预留长衣区、短衣区和可调层板，深化时按实际衣物数量调整。"
};

function cloneCabinetDesign(design: CabinetDesign | undefined): CabinetDesign | undefined {
  if (!design) return undefined;
  return {
    ...design,
    layoutNotes: [...design.layoutNotes],
    cautionNotes: [...design.cautionNotes],
    zones: design.zones.map((zone) => ({ ...zone }))
  };
}

function isHouseWallObject(object: unknown): object is HouseWall {
  if (!object || typeof object !== "object") return false;
  const candidate = object as Partial<HouseWall>;
  return candidate.kind === "straight" || candidate.kind === "arc";
}

function resizeHouseWallToLength(wall: HouseWall, nextLengthValue: number): HouseWall {
  const nextLength = Math.max(100, Math.round(nextLengthValue) || 100);
  if (wall.kind === "arc") {
    const angle = Math.max(1, Math.abs(wall.endAngle - wall.startAngle));
    const radius = Math.max(100, Math.round((nextLength * 180) / (Math.PI * angle)));
    return {
      ...wall,
      radius,
      length: Math.round((angle * Math.PI * radius) / 180)
    };
  }

  const currentLength = Math.max(1, getLineLength(wall.start, wall.end));
  const ux = (wall.end.x - wall.start.x) / currentLength;
  const uy = (wall.end.y - wall.start.y) / currentLength;
  const end = {
    x: Math.round(wall.start.x + ux * nextLength),
    y: Math.round(wall.start.y + uy * nextLength)
  };
  return {
    ...wall,
    end,
    length: getLineLength(wall.start, end)
  };
}

function getFurnitureDesignPageData(furniture: Furniture): DesignPageData | null {
  if (!furniture.cabinetDesign) return null;
  const design = furniture.cabinetDesign;
  const activeServices = serviceRequirementLabels.filter((service) => furniture.serviceRequirements?.[service.key]).map((service) => service.label);
  return {
    id: furniture.id,
    eyebrow: furniture.moduleType === "island" ? "Island Design" : furniture.moduleType === "entryCabinet" ? "Entry Cabinet" : "Module Design",
    title: design.title,
    subject: `${furniture.code} · ${furniture.name}`,
    designThinking: design.designThinking,
    recommendedPlacement: design.recommendedPlacement,
    layoutNotes: design.layoutNotes,
    zones: design.zones,
    cautionNotes: design.cautionNotes,
    metrics: [
      { label: "宽", value: `${furniture.dimensions.width} cm`, note: "平面尺度" },
      { label: "深", value: `${furniture.dimensions.depth} cm`, note: "通道校核" },
      { label: "高", value: `${furniture.dimensions.height} cm`, note: "立面体量" },
      { label: "机电", value: activeServices.length ? activeServices.join(" / ") : "无", note: furniture.material }
    ]
  };
}

function getStairDesignPageData(stair: HouseStair): DesignPageData {
  const stairLength = getLineLength(stair.start, stair.end);
  const treadDepth = Math.max(180, Math.round(stairLength / Math.max(1, stair.stepCount)));
  const riserHeight = Math.max(120, Math.round(stair.height / Math.max(1, stair.stepCount)));
  const isTwoFloorArrivalStair = stair.floorId === "2F" && stair.id === "ST-2F-001";
  const movementLabel = isTwoFloorArrivalStair ? "1F→2F 到达" : stair.direction === "up" ? "上行" : "下行";
  const riserNote = riserHeight > 180 ? "目前踢面偏高，后续拿到真实层高和洞口后优先复核能否增加踏步数。" : "当前踢面节奏接近常规舒适区，仍需按真实层高复核。";
  const baseHeightNote = isTwoFloorArrivalStair ? "本段从 1F 上来，并在 2F 形成到达平台。" : stair.baseHeight ? `本段起始标高约 ${stair.baseHeight} mm。` : "本段从下口起步。";
  return {
    id: stair.id,
    eyebrow: "Stair Design",
    title: "楼梯间设计",
    subject: `${stair.name} · ${movementLabel}`,
    designThinking: "这一版先把楼梯间当成安全、收纳和光线的组合来设计：楼梯按转角梯段表达，墙面做轻量扶手和踏步灯，楼梯下方利用为清洁工具、囤货或换季物品收纳。",
    recommendedPlacement: "保持楼梯间结构位置不变，先按 900mm 净宽和分段踏步做楼梯间方案；后续 3D 白模重点检查转角平台、上下口压迫感、扶手高度和楼梯下方可用空间。",
    layoutNotes: ["楼梯下口留出转身缓冲，不让玄关、厨房和客厅动线互相顶住", "楼梯下方优先做封闭收纳，放清洁工具、行李箱和低频囤货", "墙面用浅色耐擦材质，搭配连续扶手、踏步灯和双控开关"],
    zones: [
      { id: "lower-buffer", label: "下口缓冲", role: "转身 / 入梯", widthPercent: 22, heightPercent: 58, detail: "楼梯起步处保持空出来，作为进入楼梯间的缓冲，避免柜体或餐椅贴到第一步。", serviceNote: "下口预留双控开关和感应夜灯。" },
      { id: "stair-run", label: "本段踏步", role: `${stair.stepCount} 级${movementLabel}`, widthPercent: 46, heightPercent: 76, detail: `当前估算踏面约 ${treadDepth} mm，踢面约 ${riserHeight} mm。${baseHeightNote}${riserNote}` },
      { id: "under-stair-storage", label: "楼梯下收纳", role: "清洁 / 囤货", widthPercent: 20, heightPercent: 64, detail: "利用斜向高度变化做分段柜：高处放吸尘器和行李箱，低处放工具箱、囤货和换季物品。" },
      { id: "handrail-light", label: "扶手灯带", role: "安全 / 引导", widthPercent: 12, heightPercent: 70, detail: "靠墙做连续扶手，踏步侧补低位灯带，让夜间上楼不刺眼。", serviceNote: "灯带、感应器和检修口一起预留。" }
    ],
    cautionNotes: ["最终踏步尺寸必须按现场层高、梁位和洞口复核。", "当前 900mm 宽度偏向紧凑舒适，扶手和墙面收口不要再吃掉太多净宽。", "如果后续做开放楼梯，需要额外检查儿童安全、扶手高度和防坠细节。"],
    metrics: [
      { label: "长度", value: `${stairLength} mm`, note: "当前平面投影" },
      { label: "宽度", value: `${stair.width} mm`, note: "净通行宽" },
      { label: "踏步", value: `${stair.stepCount} 级`, note: `${treadDepth} mm / 级` },
      { label: "高度", value: `${stair.height} mm`, note: `${riserHeight} mm / 级` }
    ]
  };
}

function getFurnitureDesignButtonLabel(furniture: Furniture) {
  if (furniture.moduleType === "entryCabinet") return "进入玄关柜设计";
  if (furniture.moduleType === "island") return "进入岛台设计";
  if (furniture.moduleType === "fireplace") return "进入壁炉设计";
  return "进入模块设计";
}

function enrichMissingFurnitureMetadata(furnitureItems: Furniture[]) {
  return furnitureItems.map((item) => {
    const itemWithVariants = withFurnitureVariantDefaults(item);
    const enriched = enrichFurniture3DMeta(itemWithVariants);
    return {
      ...itemWithVariants,
      render3d: itemWithVariants.render3d ?? enriched.render3d,
      mepMeta: item.mepMeta ?? enriched.mepMeta,
      constructionMeta: item.constructionMeta ?? enriched.constructionMeta
    };
  });
}

type PersistedWebWorkspace = WorkspaceDocument;

type WorkspaceConflict = {
  draft: PersistedWebWorkspace;
  code: PersistedWebWorkspace;
  reason: "draft-newer" | "unknown-order";
  draftSavedAt?: string;
  codeSavedAt?: string;
};

type WorkspaceImportPreview = {
  fileName: string;
  workspace: PersistedWebWorkspace;
  stats: ReturnType<typeof getWorkspaceStats>;
  difference: ReturnType<typeof getDetailedWorkspaceDifference>;
};

type SaveSelfCheckResult = {
  status: "idle" | "checking" | "equal" | "different" | "error";
  message?: string;
  difference?: ReturnType<typeof getDetailedWorkspaceDifference>;
  codeWorkspace?: PersistedWebWorkspace;
  codeHash?: string;
};

function formatSaveTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

function getDraftSaveLabel(state: DraftSaveState, currentWorkspaceHash: string) {
  if (state.status === "saving") return "浏览器草稿保存中…";
  if (state.status === "saved" && currentWorkspaceHash && state.hash === currentWorkspaceHash) return `浏览器草稿已保存${formatSaveTime(state.lastSavedAt) ? ` ${formatSaveTime(state.lastSavedAt)}` : ""}`;
  if (state.status === "saved") return "浏览器草稿待保存";
  if (state.status === "error") return `浏览器草稿保存失败：${state.error ?? "未知错误"}`;
  return "浏览器草稿待保存";
}

function getCodeSaveLabel(state: CodeSaveState, currentWorkspaceHash: string, workspaceSource: "code" | "draft") {
  if (state.status === "dirty" && workspaceSource === "draft") return "当前使用浏览器草稿，尚未写入代码文件";
  if (state.status === "dirty") return "有未写入代码文件的修改";
  if (state.status === "saving" && state.target === "local-service") return "正在写入 data/default-workspace.json…";
  if (state.status === "saving") return "正在写入代码文件…";
  if (state.status === "saved_unverified" && !state.error) return "已写入，正在回读验证…";
  if (state.status === "saved_unverified") return "写入成功但未验证，请谨慎";
  if (state.status === "verified" && currentWorkspaceHash && state.hash === currentWorkspaceHash) return `代码已验证${formatSaveTime(state.lastVerifiedAt) ? ` ${formatSaveTime(state.lastVerifiedAt)}` : ""}`;
  if (state.status === "verified") return "有未写入代码文件的修改";
  if (state.status === "exported_only") return "已导出 JSON，但尚未写入代码文件";
  if (state.status === "error") return `写入失败：${state.error ?? "未知错误"}`;
  return "代码文件尚未验证";
}

function getCodeWriteTargetLabel(state: CodeSaveState, localServiceOnline: boolean, fileHandle: LocalCodeFileHandle | null) {
  if (localServiceOnline) return "当前写入目标：本机服务 data/default-workspace.json";
  if (fileHandle) return "当前写入目标：绑定的本地文件";
  if (state.target === "github") return "当前写入目标：GitHub";
  return "当前没有代码写入目标，只能导出 JSON";
}

function getDefaultRoomNumber(floorId: FloorId, index: number) {
  return `R-${floorId}-${String(index + 1).padStart(3, "0")}`;
}

const defaultRoomNameOverrides: Partial<Record<FloorId, Record<string, string>>> = {
  "1F": {
    "ROOM-1F-001": "玄关",
    "ROOM-1F-002": "厨房",
    "ROOM-1F-003": "卫生间",
    "ROOM-1F-004": "卧室",
    "ROOM-1F-005": "客厅",
    "ROOM-1F-006": "楼梯间"
  },
  "B1": {
    "ROOM-B1-001": "洗衣房",
    "ROOM-B1-002": "房间",
    "ROOM-B1-003": "走廊",
    "ROOM-B1-004": "活动区"
  },
  "2F": {
    "ROOM-2F-001": "客卫",
    "ROOM-2F-002": "衣帽间",
    "ROOM-2F-003": "主卫",
    "ROOM-2F-004": "卧室1",
    "ROOM-2F-005": "卧室2",
    "ROOM-2F-006": "主卧",
    "ROOM-2F-007": "走廊"
  },
  "B2": {
    "ROOM-B2-001": "客厅",
    "ROOM-B2-002": "楼梯间",
    "ROOM-B2-003": "活动区",
    "ROOM-B2-004": "储物间",
    "ROOM-B2-005": "书房"
  }
};

const oneFloorEntryRoomBoundary = [
  { x: 3676, y: 350 },
  { x: 5383, y: 350 },
  { x: 5383, y: 3050 },
  { x: 3676, y: 3050 }
];

const oneFloorLivingRoomBoundary = [
  { x: 4146, y: 3050 },
  { x: 9495, y: 3050 },
  { x: 9495, y: 7800 },
  { x: 3897, y: 7800 },
  { x: 3897, y: 5150 },
  { x: 4146, y: 5150 }
];

const oneFloorStairRoomBoundary = [
  { x: 950, y: 3050 },
  { x: 4146, y: 3050 },
  { x: 4146, y: 5150 },
  { x: 950, y: 5150 }
];

const oneFloorDefinedRooms: HouseRoom[] = [
  {
    id: "ROOM-1F-001",
    floorId: "1F",
    roomNumber: "R-1F-001",
    name: "玄关",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: oneFloorEntryRoomBoundary,
    area: 4608900,
    sourceWallIds: ["W-1F-001", "W-1F-004", "W-1F-003"]
  },
  {
    id: "ROOM-1F-005",
    floorId: "1F",
    roomNumber: "R-1F-005",
    name: "客厅",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: oneFloorLivingRoomBoundary,
    area: 26067600,
    sourceWallIds: ["W-1F-009", "W-1F-011", "W-1F-015", "W-1F-013"]
  },
  {
    id: "ROOM-1F-006",
    floorId: "1F",
    roomNumber: "R-1F-006",
    name: "楼梯间",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: oneFloorStairRoomBoundary,
    area: 6711600,
    sourceWallIds: ["W-1F-010", "W-1F-012", "W-1F-016"]
  }
];

const b1LaundryRoomBoundary = [
  { x: 3947, y: 350 },
  { x: 5385, y: 350 },
  { x: 5385, y: 2099 },
  { x: 3947, y: 2091 }
];

const b1RoomBoundary = [
  { x: 5385, y: 350 },
  { x: 9495, y: 350 },
  { x: 9495, y: 3117 },
  { x: 5281, y: 3117 },
  { x: 3947, y: 3117 },
  { x: 3947, y: 2091 },
  { x: 5385, y: 2099 }
];

const b1CorridorBoundary = [
  { x: 3947, y: 3117 },
  { x: 5281, y: 3117 },
  { x: 5670, y: 3600 },
  { x: 5901, y: 4537 },
  { x: 5680, y: 5450 },
  { x: 5385, y: 5853 },
  { x: 4300, y: 5853 },
  { x: 3947, y: 5000 }
];

const b1ActivityBoundary = [
  { x: 950, y: 3117 },
  { x: 3947, y: 3117 },
  { x: 3947, y: 5000 },
  { x: 4300, y: 5853 },
  { x: 5385, y: 5853 },
  { x: 6650, y: 5853 },
  { x: 6650, y: 7800 },
  { x: 950, y: 7800 }
];

const b1DefinedRooms: HouseRoom[] = [
  {
    id: "ROOM-B1-001",
    floorId: "B1",
    roomNumber: "R-B1-001",
    name: "洗衣房",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: b1LaundryRoomBoundary,
    area: 2509310,
    sourceWallIds: ["W-B1-001", "W-B1-015", "W-B1-016", "W-B1-003"]
  },
  {
    id: "ROOM-B1-002",
    floorId: "B1",
    roomNumber: "R-B1-002",
    name: "房间",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: b1RoomBoundary,
    area: 12842006,
    sourceWallIds: ["W-B1-002", "W-B1-004", "W-B1-014", "W-B1-003", "W-B1-016", "W-B1-015"]
  },
  {
    id: "ROOM-B1-003",
    floorId: "B1",
    roomNumber: "R-B1-003",
    name: "走廊",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: b1CorridorBoundary,
    area: 4632458,
    sourceWallIds: ["W-B1-014", "AW-B1-014", "W-B1-012"]
  },
  {
    id: "ROOM-B1-004",
    floorId: "B1",
    roomNumber: "R-B1-004",
    name: "活动区",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: b1ActivityBoundary,
    area: 19448246,
    sourceWallIds: ["W-B1-005", "W-B1-007", "W-B1-009", "W-B1-010", "W-B1-012", "W-B1-013"]
  }
];

const b1SkylightNote = "电动可活动天窗，预留防水收边、排水坡度、电源和控制线路。";
const b1OperableSkylights: HouseSkylight[] = [
  {
    id: "SKY-B1-W002-001",
    floorId: "B1",
    name: "W-B1-002 电动可活动天窗 1",
    geometryType: "polygon",
    center: { x: 6100, y: 760 },
    width: 800,
    depth: 560,
    height: 120,
    rotation: 0,
    operation: "electricOperable",
    openable: true,
    motorized: true,
    note: b1SkylightNote,
    editable: true,
    removable: true
  },
  {
    id: "SKY-B1-W002-002",
    floorId: "B1",
    name: "W-B1-002 电动可活动天窗 2",
    geometryType: "polygon",
    center: { x: 7350, y: 760 },
    width: 800,
    depth: 560,
    height: 120,
    rotation: 0,
    operation: "electricOperable",
    openable: true,
    motorized: true,
    note: b1SkylightNote,
    editable: true,
    removable: true
  },
  {
    id: "SKY-B1-W002-003",
    floorId: "B1",
    name: "W-B1-002 电动可活动天窗 3",
    geometryType: "polygon",
    center: { x: 8600, y: 760 },
    width: 800,
    depth: 560,
    height: 120,
    rotation: 0,
    operation: "electricOperable",
    openable: true,
    motorized: true,
    note: b1SkylightNote,
    editable: true,
    removable: true
  },
  {
    id: "SKY-B1-W009-001",
    floorId: "B1",
    name: "W-B1-009 电动可活动天窗 1",
    geometryType: "polygon",
    center: { x: 1850, y: 7350 },
    width: 800,
    depth: 560,
    height: 120,
    rotation: 0,
    operation: "electricOperable",
    openable: true,
    motorized: true,
    note: b1SkylightNote,
    editable: true,
    removable: true
  },
  {
    id: "SKY-B1-W009-002",
    floorId: "B1",
    name: "W-B1-009 电动可活动天窗 2",
    geometryType: "polygon",
    center: { x: 3000, y: 7350 },
    width: 800,
    depth: 560,
    height: 120,
    rotation: 0,
    operation: "electricOperable",
    openable: true,
    motorized: true,
    note: b1SkylightNote,
    editable: true,
    removable: true
  }
];

const b2SkylightNote = "沿 W-B2-012 设置地下室采光井天窗，预留防水收边、排水坡度、电源、检修和防坠落措施。";
const b2W012Skylights: HouseSkylight[] = [
  {
    id: "SKY-B2-W012-001",
    floorId: "B2",
    name: "W-B2-012 电动采光天窗 1",
    geometryType: "polygon",
    center: { x: 9140, y: 5200 },
    width: 620,
    depth: 950,
    height: 120,
    rotation: 90,
    operation: "electricOperable",
    openable: true,
    motorized: true,
    note: b2SkylightNote,
    editable: true,
    removable: true
  },
  {
    id: "SKY-B2-W012-002",
    floorId: "B2",
    name: "W-B2-012 电动采光天窗 2",
    geometryType: "polygon",
    center: { x: 9140, y: 6820 },
    width: 620,
    depth: 950,
    height: 120,
    rotation: 90,
    operation: "electricOperable",
    openable: true,
    motorized: true,
    note: b2SkylightNote,
    editable: true,
    removable: true
  }
];

const b1PowerOnly = { water: false, drainage: false, power: true, exhaust: false };
const b1SeasonalWardrobeDesign: WardrobeDesign = {
  columns: 3,
  rows: 4,
  cells: createWardrobeCells(3, 4),
  modules: [
    { id: "b1-top-seasonal", kind: "open", label: "顶部换季被褥区", column: 0, columnSpan: 3, x: 0, y: 0, width: 100, height: 22 },
    { id: "b1-quilt-stack", kind: "folded", label: "被子叠放高格", column: 0, columnSpan: 1, shelfCount: 3, shelfLayerHeights: [28, 24, 24, 24], x: 0, y: 22, width: 34, height: 78 },
    { id: "b1-seasonal-hanging", kind: "hanging-short", label: "换季衣物挂区", column: 1, columnSpan: 1, x: 34, y: 22, width: 33, height: 54 },
    { id: "b1-storage-drawers", kind: "drawer", label: "压缩袋和小件抽屉", column: 1, columnSpan: 1, drawerRows: 3, drawerColumns: 1, drawerRowHeights: [34, 33, 33], x: 34, y: 76, width: 33, height: 24 },
    { id: "b1-box-shelves", kind: "folded", label: "收纳箱层板区", column: 2, columnSpan: 1, shelfCount: 4, shelfLayerHeights: [20, 20, 20, 20, 20], x: 67, y: 22, width: 33, height: 78 }
  ],
  columnWidths: [34, 33, 33],
  notes: "沿 W-B1-004 做整墙收纳：顶部放换季被褥，中部挂换季衣物，右侧用可调层板放收纳箱和压缩袋；柜体需做防潮封边并预留除湿/通风。"
};
const b1DefaultFurniture: Furniture[] = [
  {
    id: "furn-b1-room-seasonal-wardrobe-001",
    code: "WD-B1-01",
    name: "B1 房间 W-B1-004 整墙换季衣柜",
    type: "wardrobe",
    catalogId: "storage-wardrobe",
    moduleCategory: "storage",
    moduleType: "wardrobe",
    floorId: "B1",
    roomId: "ROOM-B1-002",
    dimensions: { width: 270, depth: 60, height: 240, unit: "cm" },
    material: "暖白防潮柜体 + 顶柜 + 可调层板",
    note: "沿 W-B1-004 做一面墙衣柜，用于收纳换季衣物、被子、收纳箱和压缩袋。",
    constructionNote: "贴 W-B1-004 布置，复核柜体深度、挑空栏杆边界和房间通道；地下室需做防潮封边，柜内预留除湿机或通风电源。",
    serviceRequirements: b1PowerOnly,
    position: { x: 76.625, y: 19.261111111111113, rotation: 90 },
    color: "#d8c2a4",
    wardrobeDesign: b1SeasonalWardrobeDesign
  }
];

const twoFloorMasterRoomBoundary = [
  { x: 7681, y: 3050 },
  { x: 9495, y: 3050 },
  { x: 9495, y: 7800 },
  { x: 7681, y: 7800 }
];

const twoFloorCorridorBoundary = [
  { x: 950, y: 3050 },
  { x: 7681, y: 3050 },
  { x: 7681, y: 5150 },
  { x: 950, y: 5150 }
];

const twoFloorDefinedRooms: HouseRoom[] = [
  {
    id: "ROOM-2F-006",
    floorId: "2F",
    roomNumber: "R-2F-006",
    name: "主卧",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: twoFloorMasterRoomBoundary,
    area: 8616500,
    sourceWallIds: ["W-2F-009", "W-2F-011", "W-2F-020", "W-2F-016", "W-2F-014", "W-2F-017"]
  },
  {
    id: "ROOM-2F-007",
    floorId: "2F",
    roomNumber: "R-2F-007",
    name: "走廊",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: twoFloorCorridorBoundary,
    area: 14135100,
    sourceWallIds: ["W-2F-007", "W-2F-008", "W-2F-009", "W-2F-017", "W-2F-014", "W-2F-013", "W-2F-012", "W-2F-010"]
  }
];

const b2LivingRoomBoundary = [
  { x: 3676, y: 350 },
  { x: 7610, y: 350 },
  { x: 7610, y: 4222 },
  { x: 9495, y: 4222 },
  { x: 9495, y: 5150 },
  { x: 3897, y: 5150 },
  { x: 3897, y: 3050 },
  { x: 3676, y: 3050 }
];

const b2StairRoomBoundary = [
  { x: 950, y: 3050 },
  { x: 4146, y: 3050 },
  { x: 4146, y: 5150 },
  { x: 950, y: 5150 }
];

const b2StorageRoomBoundary = [
  { x: 950, y: 4300 },
  { x: 2050, y: 4300 },
  { x: 950, y: 5150 }
];

const b2StudyRoomBoundary = [
  { x: 950, y: 5150 },
  { x: 5750, y: 5150 },
  { x: 5750, y: 7800 },
  { x: 950, y: 7800 }
];

const b2ActivityRoomBoundary = [
  { x: 5750, y: 5150 },
  { x: 9495, y: 5150 },
  { x: 9495, y: 7800 },
  { x: 5750, y: 7800 }
];

const b2DefinedRooms: HouseRoom[] = [
  {
    id: "ROOM-B2-001",
    floorId: "B2",
    roomNumber: "R-B2-001",
    name: "客厅",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: b2LivingRoomBoundary,
    area: getPolygonArea(b2LivingRoomBoundary),
    sourceWallIds: ["W-B2-001", "W-B2-003", "W-B2-004", "W-B2-006", "W-B2-012"]
  },
  {
    id: "ROOM-B2-002",
    floorId: "B2",
    roomNumber: "R-B2-002",
    name: "楼梯间",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: b2StairRoomBoundary,
    area: getPolygonArea(b2StairRoomBoundary),
    sourceWallIds: ["W-B2-007", "W-B2-008", "W-B2-009"]
  },
  {
    id: "ROOM-B2-004",
    floorId: "B2",
    roomNumber: "R-B2-003",
    name: "储物间",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: b2StorageRoomBoundary,
    area: getPolygonArea(b2StorageRoomBoundary),
    sourceWallIds: ["W-B2-008", "W-B2-009"]
  },
  {
    id: "ROOM-B2-005",
    floorId: "B2",
    roomNumber: "R-B2-004",
    name: "书房",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: b2StudyRoomBoundary,
    area: getPolygonArea(b2StudyRoomBoundary),
    sourceWallIds: ["W-B2-010", "W-B2-011"]
  },
  {
    id: "ROOM-B2-003",
    floorId: "B2",
    roomNumber: "R-B2-005",
    name: "活动区",
    spaceType: "Room",
    geometryType: "polygon",
    boundary: b2ActivityRoomBoundary,
    area: getPolygonArea(b2ActivityRoomBoundary),
    sourceWallIds: ["W-B2-011", "W-B2-012"]
  }
];

const twoFloorTopStairs: HouseStair[] = [
  {
    id: "ST-2F-001",
    floorId: "2F",
    name: "2F 下行至 1F 梯段",
    geometryType: "line",
    start: { x: 4146, y: 4625 },
    end: { x: 950, y: 4625 },
    width: 1050,
    baseHeight: 0,
    height: 1400,
    stepCount: 10,
    direction: "down",
    editable: true,
    removable: true
  }
];

const oneFloorUKitchenDesign: CabinetDesign = {
  template: "kitchenCabinet",
  title: "1F U 型橱柜设计",
  designThinking: "把厨房压缩成清晰的 U 型工作三角：左侧负责烹饪，靠窗顶端负责洗涤，右侧和右下角承担备餐、冰箱和高频取物。",
  recommendedPlacement: "布置在 1F 厨房内，U 型顶端贴近北侧窗，灶台在左侧柜段，冰箱落在右下角。",
  layoutNotes: ["靠窗顶端放两个水槽，适合洗菜、沥水和分区清洗", "左侧灶台两边留落锅和调味空间", "右下角冰箱靠近入口和备餐台，拿取后能直接进入台面操作"],
  zones: [
    { id: "cook-left", label: "左侧灶台", role: "烹饪 / 排烟", widthPercent: 30, heightPercent: 100, detail: "左侧柜段嵌入灶台，下方收锅具，旁边留调味和落锅台面。", serviceNote: "确认燃气/电源、排烟方向和止逆阀位置。" },
    { id: "window-sinks", label: "靠窗双水槽", role: "洗菜 / 沥水 / 净水", widthPercent: 40, heightPercent: 100, detail: "顶端靠窗设置两个水槽，一个主洗，一个辅助/沥水，采光好也便于通风。", serviceNote: "集中预留冷热水、净水、排水和洗碗机可能的电源。" },
    { id: "fridge-right", label: "右下角冰箱", role: "冷藏 / 高柜", widthPercent: 30, heightPercent: 100, detail: "冰箱放在 U 型右下角，避免打断靠窗操作面，也方便从客厅/餐桌拿取。", serviceNote: "冰箱建议独立回路，背部和侧边按设备要求留散热。" }
  ],
  cautionNotes: ["U 型内部通道后续要用精确户型尺寸复核，尽量保证 900 mm 以上。", "双水槽必须结合现场上下水位置确认，排水坡度不够时要调整水槽或洗碗机位置。"]
};

const oneFloorKitchenFurnitureOverrides: Record<string, Partial<Furniture>> = {
  "furn-kitchen-run-001": {
    code: "KC-1F-U-T",
    name: "U型橱柜靠窗双水槽段",
    type: "kitchenCabinet",
    catalogId: "kitchen-base-cabinet",
    moduleCategory: "kitchen",
    moduleType: "kitchenCabinet",
    roomId: "ROOM-1F-002",
    dimensions: { width: 210, depth: 55, height: 90, unit: "cm" },
    material: "浅灰防潮柜体 + 石英石台面",
    note: "U 型顶端靠窗，作为双水槽和主要洗涤台面。",
    constructionNote: "靠窗顶端布置双水槽，集中复核冷热水、净水、排水和窗台高度。",
    serviceRequirements: { water: true, drainage: true, power: true, exhaust: false },
    position: { x: 54.5, y: 7.5, rotation: 0 },
    color: "#d9ddd5",
    cabinetDesign: oneFloorUKitchenDesign
  },
  "furn-kitchen-u-left-run": {
    code: "KC-1F-U-L",
    name: "U型橱柜左侧灶台段",
    type: "kitchenCabinet",
    catalogId: "kitchen-base-cabinet",
    moduleCategory: "kitchen",
    moduleType: "kitchenCabinet",
    roomId: "ROOM-1F-002",
    dimensions: { width: 200, depth: 55, height: 90, unit: "cm" },
    material: "浅灰柜体 + 耐污台面",
    note: "左侧柜段承接灶台、调味和锅具收纳。",
    constructionNote: "左侧灶台段优先校核烟道、燃气/电源和锅具抽屉高度。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: true },
    position: { x: 48.5, y: 22.4, rotation: 90 },
    color: "#d4d8cf",
    cabinetDesign: oneFloorUKitchenDesign
  },
  "furn-kitchen-u-right-run": {
    code: "KC-1F-U-R",
    name: "U型橱柜右侧备餐段",
    type: "kitchenCabinet",
    catalogId: "kitchen-base-cabinet",
    moduleCategory: "kitchen",
    moduleType: "kitchenCabinet",
    roomId: "ROOM-1F-002",
    dimensions: { width: 90, depth: 55, height: 90, unit: "cm" },
    material: "浅灰柜体 + 小电器抽拉层",
    note: "右侧柜段连接冰箱和靠窗水槽，作为备餐、小电器和临时放置区。",
    constructionNote: "右侧预留台面插座，避免冰箱开门和 U 型内部通道冲突。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    position: { x: 60.8, y: 15.72, rotation: 90 },
    color: "#d7dbd2",
    cabinetDesign: oneFloorUKitchenDesign
  },
  "furn-cooktop-001": {
    code: "CK-1F-L",
    name: "左侧嵌入式灶台",
    type: "cooktop",
    catalogId: "kitchen-cooktop",
    moduleCategory: "kitchen",
    moduleType: "cooktop",
    roomId: "ROOM-1F-002",
    dimensions: { width: 90, depth: 52, height: 12, unit: "cm" },
    material: "燃气灶 / 电磁灶预留",
    note: "灶台放在 U 型左侧，和靠窗双水槽形成洗切炒动线。",
    constructionNote: "左侧灶台需和烟道、燃气阀、电源及排烟路径一起复核。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: true },
    position: { x: 48.5, y: 24, rotation: 90 },
    color: "#1f2937"
  },
  "furn-sink-001": {
    code: "SK-1F-01",
    name: "靠窗左水槽",
    type: "sink",
    catalogId: "kitchen-sink",
    moduleCategory: "kitchen",
    moduleType: "sink",
    roomId: "ROOM-1F-002",
    dimensions: { width: 72, depth: 48, height: 20, unit: "cm" },
    material: "不锈钢台下盆",
    note: "靠窗顶端左侧水槽，作为主洗菜盆。",
    constructionNote: "与右水槽共用给排水集中校核。",
    serviceRequirements: { water: true, drainage: true, power: false, exhaust: false },
    position: { x: 51.5, y: 7.5, rotation: 0 },
    color: "#9cc7d9"
  },
  "furn-sink-002": {
    code: "SK-1F-02",
    name: "靠窗右水槽",
    type: "sink",
    catalogId: "kitchen-sink",
    moduleCategory: "kitchen",
    moduleType: "sink",
    roomId: "ROOM-1F-002",
    dimensions: { width: 72, depth: 48, height: 20, unit: "cm" },
    material: "不锈钢台下盆",
    note: "靠窗顶端右侧水槽，作为辅助清洗/沥水盆。",
    constructionNote: "双水槽下方预留排水汇合、净水和检修空间。",
    serviceRequirements: { water: true, drainage: true, power: false, exhaust: false },
    position: { x: 57.2, y: 7.5, rotation: 0 },
    color: "#8fbdd0"
  },
  "furn-fridge-001": {
    code: "RF-1F-R",
    name: "东墙内收嵌入式冰箱位",
    type: "fridge",
    catalogId: "kitchen-fridge",
    moduleCategory: "kitchen",
    moduleType: "fridge",
    roomId: "ROOM-1F-002",
    dimensions: { width: 92, depth: 70, height: 190, unit: "cm" },
    material: "高柜嵌入 + 侧边散热",
    note: "冰箱沿东墙向北收进 U 型右侧柜段，释放厨房入口转角。",
    constructionNote: "冰箱建议独立回路，按设备样本预留散热和开门空间。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    position: { x: 60, y: 24.61, rotation: 0 },
    color: "#d9dee4"
  }
};

const oneFloorKitchenDefaultFurniture = Object.entries(oneFloorKitchenFurnitureOverrides).map(([id, item]) => ({
  id,
  floorId: "1F",
  ...item
})) as Furniture[];

const oneFloorBathroomFurnitureOverrides: Record<string, Partial<Furniture>> = {
  "furn-bath-shower-001": {
    code: "SH-1F-01",
    name: "上方通长玻璃淋浴间",
    type: "shower",
    catalogId: "bath-shower",
    moduleCategory: "bath",
    moduleType: "shower",
    roomId: "ROOM-1F-003",
    dimensions: { width: 178, depth: 90, height: 210, unit: "cm" },
    material: "透明玻璃隔断 + 防滑地面 + 挡水条",
    note: "横向占满卫生间上方，形成完整玻璃淋浴区，和下方马桶、台盆柜分开。",
    constructionNote: "优先复核花洒冷热水、地漏坡度、挡水条和玻璃门开启方向。",
    serviceRequirements: { water: true, drainage: true, power: false, exhaust: false },
    position: { x: 71.6, y: 9, rotation: 0 },
    color: "#c7d2fe"
  },
  "furn-bath-toilet-001": {
    code: "WC-1F-01",
    name: "右侧马桶",
    type: "toilet",
    catalogId: "bath-toilet",
    moduleCategory: "bath",
    moduleType: "toilet",
    roomId: "ROOM-1F-003",
    dimensions: { width: 70, depth: 75, height: 78, unit: "cm" },
    material: "智能马桶预留",
    note: "放在卫生间右侧中下部，和台盆柜同侧排列，左下方留给进门转身。",
    constructionNote: "复核坑距、给水角阀、智能马桶电源和门扇开启范围。",
    serviceRequirements: { water: true, drainage: true, power: true, exhaust: false },
    position: { x: 76, y: 18.5, rotation: 90 },
    color: "#f4f0ea"
  },
  "furn-bath-vanity-001": {
    code: "VA-1F-01",
    name: "右下洗手池",
    type: "vanity",
    catalogId: "bath-vanity",
    moduleCategory: "bath",
    moduleType: "vanity",
    roomId: "ROOM-1F-003",
    dimensions: { width: 90, depth: 50, height: 85, unit: "cm" },
    material: "台盆柜 + 镜柜 + 镜前灯预留",
    note: "放在卫生间右下方，靠近进门但不挡门，洗手和泡茶区补水动线都更短。",
    constructionNote: "预留台盆给排水、镜柜灯、吹风机插座和防溅安全距离。",
    serviceRequirements: { water: true, drainage: true, power: true, exhaust: false },
    position: { x: 76.6, y: 27.5, rotation: 270 },
    color: "#d6d9d7"
  }
};

const oneFloorBathroomDefaultFurniture = Object.entries(oneFloorBathroomFurnitureOverrides).map(([id, item]) => ({
  id,
  floorId: "1F",
  ...item
})) as Furniture[];

const oneFloorLivingFurnitureOverrides: Record<string, Partial<Furniture>> = {
  "furn-living-rug-natural-001": {
    code: "RG-1F-01",
    name: "客厅低饱和羊毛地毯",
    type: "custom",
    moduleCategory: "living",
    roomId: "ROOM-1F-005",
    dimensions: { width: 310, depth: 210, height: 2, unit: "cm" },
    material: "低饱和羊毛地毯",
    note: "作为客厅活动区的视觉底盘，先用低饱和浅米灰压住大理石地砖反光。",
    constructionNote: "后期按真实坐具和茶几尺寸调整地毯边界，避免跨到房间或主要通道。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    position: { x: 35, y: 60.5, rotation: 0 },
    color: "#d8d1c3"
  },
  "furn-living-coffee-table-001": {
    code: "CT-1F-01",
    name: "客厅浅木椭圆茶几",
    type: "table",
    moduleCategory: "living",
    moduleType: "table",
    roomId: "ROOM-1F-005",
    dimensions: { width: 120, depth: 68, height: 38, unit: "cm" },
    material: "浅木茶几 + 浅灰岩板托盘",
    note: "先用低矮茶几控制客厅中心体量，方便后期换成圆形、异形或双拼茶几。",
    constructionNote: "茶几到主要坐具前沿建议保留约 350-450 mm，真实尺寸拿到后再校准。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    position: { x: 35, y: 59.8, rotation: 0 },
    color: "#c49a6f"
  },
  "furn-living-side-table-001": {
    code: "ST-1F-01",
    name: "客厅浅木圆几",
    type: "table",
    moduleCategory: "living",
    moduleType: "table",
    roomId: "ROOM-1F-005",
    dimensions: { width: 48, depth: 48, height: 50, unit: "cm" },
    material: "浅木边几",
    note: "放在客厅活动区侧边，服务台灯、香氛、杯子和手机临时放置。",
    constructionNote: "边几旁可预留地插/墙插，后期结合最终坐具位置确定。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    position: { x: 22.5, y: 62.2, rotation: 0 },
    color: "#c49a6f"
  },
  "furn-living-lounge-chair-001": {
    code: "LC-1F-01",
    name: "客厅藤编休闲单椅",
    type: "chair",
    moduleCategory: "living",
    roomId: "ROOM-1F-005",
    dimensions: { width: 72, depth: 82, height: 82, unit: "cm" },
    material: "浅木藤编 + 米白坐垫",
    note: "作为客厅活动区的轻量补座，先做自然风单椅示意。",
    constructionNote: "后期根据客厅动线调整角度，不压餐桌椅后退区和去楼梯的通道。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    position: { x: 47, y: 60.5, rotation: 320 },
    color: "#d8c2a4"
  },
  "furn-living-waterbar-001": {
    code: "WB-1F-01",
    name: "餐桌右侧水吧台",
    type: "sideboard",
    catalogId: "storage-sideboard",
    moduleCategory: "storage",
    moduleType: "sideboard",
    roomId: "ROOM-1F-005",
    dimensions: { width: 160, depth: 55, height: 90, unit: "cm" },
    material: "石英石台面 + 防潮柜体 + 小水槽/净饮预留",
    note: "放在餐桌右侧、原右侧飘窗拆除后的墙面，服务咖啡、泡茶和杯具收纳。",
    constructionNote: "预留净水/给水、排水、咖啡机和烧水设备插座；台面前方避开餐椅后退区。",
    serviceRequirements: { water: true, drainage: true, power: true, exhaust: false },
    position: { x: 76.4, y: 71.3, rotation: 90 },
    color: "#d8ddd9",
    cabinetDesign: {
      template: "sideboard",
      title: "客厅水吧台设计",
      designThinking: "把咖啡、泡茶、杯具和净饮集中在餐桌右侧，客厅能完成轻量饮品动作，不必每次进厨房。",
      recommendedPlacement: "原客厅右侧飘窗拆除后的墙面，靠近餐桌但不压餐椅后退区。",
      layoutNotes: ["下柜放净饮设备、茶具和咖啡器具", "台面保留连续操作面", "侧边预留多联插座和小水槽/净饮点位"],
      zones: [
        { id: "counter", label: "饮品台面", role: "咖啡 / 泡茶", widthPercent: 48, heightPercent: 100, detail: "台面放咖啡机、烧水壶和茶盘，旁边留备杯位置。", serviceNote: "预留净水、排水和防溅插座。" },
        { id: "cups", label: "杯具区", role: "杯子 / 茶具", widthPercent: 28, heightPercent: 100, detail: "常用杯具放在最顺手的位置，下方抽屉收滤纸、茶包和勺具。" },
        { id: "stock", label: "囤货区", role: "咖啡豆 / 茶叶", widthPercent: 24, heightPercent: 100, detail: "封闭收纳减少包装外露，让客厅保持清爽。" }
      ],
      cautionNotes: ["水吧台排水需要结合现场管位复核，距离过远时可改为无水净饮方案。", "台面电器和吊柜下沿要预留足够操作高度。"]
    }
  },
  "furn-living-waterbar-upper-001": {
    code: "WBC-1F-01",
    name: "水吧台吊柜",
    type: "cabinet",
    catalogId: "storage-sideboard",
    moduleCategory: "storage",
    moduleType: "cabinet",
    roomId: "ROOM-1F-005",
    dimensions: { width: 160, depth: 32, height: 80, unit: "cm" },
    material: "浅色吊柜 + 局部玻璃门 / 开放格",
    note: "吊柜对应水吧台上方，收杯子、茶叶、咖啡豆和轻量展示品。",
    constructionNote: "确认墙体基层承重、吊柜下沿高度、灯带和插座避让。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    position: { x: 77.65, y: 71.3, rotation: 90 },
    color: "#f0e7d8"
  },
  "furn-kitchen-entry-island-001": {
    code: "IS-1F-210",
    name: "厨房门口加长储物岛台",
    type: "island",
    catalogId: "kitchen-island",
    moduleCategory: "kitchen",
    moduleType: "island",
    roomId: "ROOM-1F-005",
    dimensions: { width: 190, depth: 55, height: 80, unit: "cm" },
    material: "岩板台面 + 下柜收纳",
    note: "岛台柜体减深并向东侧移动，释放厨房入口的左转空间，兼顾备餐、端菜和储物。",
    constructionNote: "先按可移动岛台校核通道，后续根据现场尺寸决定是否固定、是否预留电源。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    position: { x: 57.5, y: 45.22, rotation: 0 },
    color: "#cfd8d3",
    cabinetDesign: {
      template: "island",
      title: "厨房门口加长储物岛台设计",
      designThinking: "岛台加长后承担两件事：厨房出菜/备餐的连续台面，以及客厅侧可拿取的储物。内部用抽屉、开放格和拉篮分开，避免一个大空腔不好用。",
      recommendedPlacement: "厨房推拉门外侧、客厅入口上方，长度与靠窗水槽段接近，四周仍要保留可绕行动线。",
      layoutNotes: ["台面长度 1900mm，柜体深度 550mm，入口侧留出连续转身空间", "厨房侧放托盘、锅垫、备餐工具", "客厅侧放茶点、纸巾、杯垫和低频餐具"],
      zones: [
        { id: "drawer-stack", label: "三层抽屉", role: "餐具 / 小工具", widthPercent: 30, heightPercent: 100, detail: "靠厨房一侧做三层抽屉，上层餐具，中层保鲜袋/杯垫，下层锅垫和餐垫。" },
        { id: "open-shelf", label: "开放隔层", role: "托盘 / 常用盘", widthPercent: 28, heightPercent: 100, detail: "中段做开放隔层，放托盘和常用盘，端菜时不用开门。" },
        { id: "pull-basket", label: "抽拉篮", role: "零食 / 茶点", widthPercent: 22, heightPercent: 100, detail: "客厅侧设置窄拉篮，放茶点、纸巾、备用杯子，拉出后正面可见。" },
        { id: "closed-cabinet", label: "封闭柜", role: "低频收纳", widthPercent: 20, heightPercent: 100, detail: "端头封闭柜收低频器具，外观保持整洁。", serviceNote: "端头预留插座，给电火锅或临时小电器使用。" }
      ],
      cautionNotes: ["加长后需要复核厨房门外侧通道和餐桌椅后退空间。", "如果后续做固定岛台，再决定是否预留地插或侧插。"]
    }
  },
  "furn-living-snack-pullout-001": {
    code: "SC-1F-01",
    name: "卫生间门左侧贴墙零食柜",
    type: "snackCabinet",
    catalogId: "storage-snack-cabinet",
    moduleCategory: "storage",
    moduleType: "snackCabinet",
    roomId: "ROOM-1F-005",
    dimensions: { width: 120, depth: 32, height: 120, unit: "cm" },
    material: "横向浅柜 + 分段拉篮 + 封闭门板",
    note: "移到卫生间门洞左侧的 W-1F-009 客厅侧墙面，贴墙浅柜布置；右端避开卫生间门洞，不再挡在厕所门口。",
    constructionNote: "柜体沿 W-1F-009 客厅侧固定，中心约在 x=7515mm、y=3210mm；先按 120cm 控制，确保避开厨房推拉门和卫生间门套，复尺后再判断能否加宽。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    position: { x: 62.6, y: 35.7, rotation: 0 },
    color: "#f3d9b1",
    cabinetDesign: {
      template: "snackCabinet",
      title: "卫生间门左侧贴墙零食柜设计",
      designThinking: "零食柜从卫生间门口移到门洞左侧可用墙面，保持贴墙浅柜，不侵占门口回转。它仍服务餐桌、水吧台和客厅，但优先让卫生间出入动线干净。",
      recommendedPlacement: "1F 客厅侧，贴 W-1F-009 墙面，位于卫生间门洞左侧的可用墙段，靠近餐桌但避开门洞。",
      layoutNotes: ["柜体贴墙横向布置，宽度先按 1200mm 控制", "深度控制在 320mm 左右，右端和卫生间门套之间留出缓冲", "左端和厨房推拉门套保持避让，复尺后再判断能否加宽", "拉篮向客厅方向抽出，前方保持完整抽拉空间"],
      zones: [
        { id: "snack-drawer", label: "零食抽屉", role: "零食 / 茶包", widthPercent: 40, heightPercent: 100, detail: "小包装按口味横向分格，和水吧台形成补给区。" },
        { id: "veg-basket", label: "蔬果拉篮", role: "蔬果 / 常用菜", widthPercent: 30, heightPercent: 100, detail: "中段做可抽拉透气篮，放土豆、洋葱、水果等需要顺手拿的食材。" },
        { id: "stock-cabinet", label: "囤货柜", role: "饮料 / 纸巾", widthPercent: 30, heightPercent: 100, detail: "重物和整箱物品靠下放，门板封闭，客厅看起来更干净。" }
      ],
      cautionNotes: ["门洞左侧墙段略短于 150cm，复尺后优先确认门套、踢脚线和开门净距。", "如果现场门套厚度更大，柜体宽度宁可缩短，也不要压到卫生间门口。"]
    }
  },
  "furn-entry-slim-hanging-001": {
    code: "EH-1F-01",
    name: "W-1F-004 超薄外衣挂区",
    type: "pegboard",
    catalogId: "storage-pegboard",
    moduleCategory: "storage",
    moduleType: "pegboard",
    roomId: "ROOM-1F-001",
    dimensions: { width: 120, depth: 10, height: 180, unit: "cm" },
    material: "超薄长条挂板 + 折叠挂钩 + 上方窄搁板",
    note: "固定在 W-1F-004 玄关侧墙面，做成扁平狭长的外穿衣服临时挂放区，平时尽量不挡路。",
    constructionNote: "贴 W-1F-004 墙固定到基层，挂钩避开入户门扇、厨房推拉门和转身动线；下方悬空，方便清洁。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    position: { x: 44.35, y: 18.8, rotation: 90 },
    color: "#bfd7c9",
    cabinetDesign: {
      template: "pegboard",
      title: "W-1F-004 超薄外衣挂区设计",
      designThinking: "玄关墙面小，就不要做厚衣柜。沿 W-1F-004 做一条很浅的长挂板，用折叠挂钩和高处窄搁板把外套临时挂放需求压在墙面上，保持地面和通道空出来。",
      recommendedPlacement: "贴 W-1F-004 的玄关侧墙面，避开入户门和厨房推拉门通行线。",
      layoutNotes: ["1200mm 横向展开，深度控制在 100mm 左右", "挂钩折叠，没人挂衣服时几乎不凸出", "上方窄搁板放帽子、口罩和香氛", "下方悬空，不放厚鞋柜，减少堵路感"],
      zones: [
        { id: "fold-hooks", label: "折叠挂钩", role: "外套 / 包", widthPercent: 100, heightPercent: 48, detail: "只负责临时外衣，不承担全季衣柜功能。" },
        { id: "top-shelf", label: "上方窄搁板", role: "帽子 / 小物", widthPercent: 100, heightPercent: 22, detail: "高处放轻物，不占通道视线。" },
        { id: "lower-clear", label: "底部留空", role: "通行 / 清洁", widthPercent: 100, heightPercent: 30, detail: "底部不落地，让玄关更轻，减少挡路。" }
      ],
      cautionNotes: ["挂区深度控制在 100-120mm 内，超过就容易挡路。", "如果外衣很多，建议只做临时挂放，长期收纳放到衣帽间或卧室。"]
    }
  },
  "furn-living-fireplace-south-001": {
    code: "FP-1F-01",
    name: "W-1F-013 嵌入式小壁炉",
    type: "fireplace",
    catalogId: "living-fireplace",
    moduleCategory: "living",
    moduleType: "fireplace",
    roomId: "ROOM-1F-005",
    dimensions: { width: 120, depth: 12, height: 70, unit: "cm" },
    material: "浅嵌入电子雾化壁炉 + 防火饰面",
    note: "嵌在 W-1F-013 墙面上，2D 平面只保留很浅的厚度，作为客厅墙面的氛围点而不是外凸柜体。",
    constructionNote: "贴 W-1F-013 做浅嵌入，预留电源、检修口和防火收边；真实燃烧壁炉需另行复核排烟和物业要求。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    position: { x: 33, y: 72, rotation: 270 },
    color: "#b86f52",
    cabinetDesign: {
      template: "fireplace",
      title: "W-1F-013 浅嵌入小壁炉设计",
      designThinking: "壁炉嵌到 W-1F-013 墙面里，不额外做厚壁炉墙。2D 只看到一条很浅的设备厚度，真实效果靠立面和后续 3D 表达，让客厅多一个温暖焦点但不占通道。",
      recommendedPlacement: "客厅靠 W-1F-013 的墙面中下段，避开门洞、窗帘和主要家具动线。",
      layoutNotes: ["平面深度控制在 120mm 左右", "壁炉上方可留画或小壁灯", "两侧保持留白，不做厚柜体", "下方用防火/耐热饰面收口"],
      zones: [
        { id: "flame", label: "壁炉核心", role: "氛围 / 视觉焦点", widthPercent: 62, heightPercent: 70, detail: "控制在小体量，嵌进墙面，不在平面里形成大块外凸。" },
        { id: "flush-frame", label: "齐平收口", role: "墙面一体", widthPercent: 100, heightPercent: 18, detail: "用窄边框或同色饰面收口，让壁炉像墙面里的一个细节。" },
        { id: "service", label: "检修预留", role: "电源 / 维护", widthPercent: 38, heightPercent: 30, detail: "电源和检修不要被固定家具挡住。", serviceNote: "电子雾化壁炉需确认电源和补水方式。" }
      ],
      cautionNotes: ["真实燃烧方案必须另做排烟和防火评估。", "嵌入式做法要确认 W-1F-013 墙体厚度、基层和检修方式。"]
    }
  }
};

const oneFloorLivingDefaultFurniture = Object.entries(oneFloorLivingFurnitureOverrides).map(([id, item]) => ({
  id,
  floorId: "1F",
  ...item
})) as Furniture[];

const oneFloorDefaultFurnitureOverrides: Record<string, Partial<Furniture>> = {
  ...oneFloorKitchenFurnitureOverrides,
  ...oneFloorBathroomFurnitureOverrides,
  ...oneFloorLivingFurnitureOverrides
};

const oneFloorDefaultFurniture = [
  ...oneFloorKitchenDefaultFurniture,
  ...oneFloorBathroomDefaultFurniture,
  ...oneFloorLivingDefaultFurniture
];

const twoFloorBathService = { water: true, drainage: true, power: true, exhaust: false };
const twoFloorWetNoPower = { water: true, drainage: true, power: false, exhaust: false };
const twoFloorNoService = { water: false, drainage: false, power: false, exhaust: false };

const twoFloorDefaultFurnitureOverrides: Record<string, Partial<Furniture>> = {
  "module-2f-cloak-left": {
    name: "2F 衣帽间西墙挂衣柜",
    roomId: "ROOM-2F-002",
    dimensions: { width: 258, depth: 60, height: 240, unit: "cm" },
    note: "已挪入衣帽间西墙：长衣、短衣双层挂、顶部被子和包包开放格，叠放区极少。",
    constructionNote: "沿衣帽间西侧墙布置，按 600mm 深度复核中间通道；顶部预留换季被子和行李。",
    position: { x: 47.36, y: 18.89, rotation: 90 }
  },
  "module-2f-cloak-right": {
    name: "2F 衣帽间东墙包被收纳柜",
    roomId: "ROOM-2F-002",
    dimensions: { width: 258, depth: 60, height: 240, unit: "cm" },
    note: "已挪入衣帽间东墙：以挂衣、包包展示和被褥收纳为主，不单独设置大面积叠放区。",
    constructionNote: "沿衣帽间东侧墙布置，局部玻璃门展示包包，顶柜和窄高柜收被子、行李箱、换季物。",
    position: { x: 61.51, y: 18.89, rotation: 90 }
  },
  "module-2f-window-desk": {
    roomId: "ROOM-2F-002",
    dimensions: { width: 100, depth: 45, height: 76, unit: "cm" },
    note: "保留在衣帽间靠窗位置，作为窄整理台 / 梳妆台，避开两侧衣柜通道。",
    constructionNote: "靠窗预留双插、网络/充电位和化妆镜灯电源，桌下留腿部空间。",
    position: { x: 54.95, y: 7.15, rotation: 0 }
  }
};

const twoFloorMasterBedroomLegacyFurniturePositions: Record<string, Furniture["position"][]> = {
  "furn-2f-master-bedroom-bed-001": [
    { x: 67.6, y: 75.4, rotation: 0 },
    { x: 67, y: 72.4, rotation: 0 }
  ],
  "furn-2f-master-bedroom-large-wardrobe-001": [
    { x: 76.2, y: 49.5, rotation: 90 },
    { x: 76.6, y: 49.2, rotation: 90 }
  ],
  "furn-2f-master-bedroom-chest-001": [
    { x: 68.9, y: 36.4, rotation: 0 },
    { x: 71.2, y: 36.8, rotation: 0 }
  ]
};

const twoFloorMasterBedroomVisibleFurniturePositions: Record<string, Furniture["position"]> = {
  "furn-2f-master-bedroom-bed-001": { x: 71.55, y: 75.2, rotation: 0 },
  "furn-2f-master-bedroom-large-wardrobe-001": { x: 76.55, y: 48.8, rotation: 90 },
  "furn-2f-master-bedroom-chest-001": { x: 71.25, y: 36.8, rotation: 0 }
};

function furniturePositionAlmostEquals(position: Furniture["position"], target: Furniture["position"]) {
  return Math.abs(position.x - target.x) < 0.2
    && Math.abs(position.y - target.y) < 0.2
    && Math.abs((position.rotation ?? 0) - (target.rotation ?? 0)) < 0.2;
}

function getTwoFloorMasterBedroomVisibilityRepair(item: Furniture) {
  const legacyPositions = twoFloorMasterBedroomLegacyFurniturePositions[item.id];
  const visiblePosition = twoFloorMasterBedroomVisibleFurniturePositions[item.id];
  if (!legacyPositions || !visiblePosition || item.floorId !== "2F" || item.roomId !== "ROOM-2F-006") return null;
  return legacyPositions.some((position) => furniturePositionAlmostEquals(item.position, position)) ? visiblePosition : null;
}

const twoFloorDefaultFurniture: Furniture[] = [
  {
    id: "furn-2f-guest-shower-001",
    code: "SH-2F-G01",
    name: "2F 客卫上方玻璃淋浴间",
    type: "shower",
    catalogId: "bath-shower",
    moduleCategory: "bath",
    moduleType: "shower",
    floorId: "2F",
    roomId: "ROOM-2F-001",
    dimensions: { width: 168, depth: 90, height: 210, unit: "cm" },
    material: "透明玻璃隔断 + 防滑地面 + 挡水条",
    note: "参考 1F 卫生间，上方做玻璃淋浴区，下方留给马桶、台盆和进门转身。",
    constructionNote: "复核花洒冷热水、地漏坡度、挡水条和玻璃门开启方向。",
    serviceRequirements: twoFloorWetNoPower,
    position: { x: 37.75, y: 9, rotation: 0 },
    color: "#c7d2fe"
  },
  {
    id: "furn-2f-guest-toilet-001",
    code: "WC-2F-G01",
    name: "2F 客卫右侧马桶",
    type: "toilet",
    catalogId: "bath-toilet",
    moduleCategory: "bath",
    moduleType: "toilet",
    floorId: "2F",
    roomId: "ROOM-2F-001",
    dimensions: { width: 70, depth: 75, height: 78, unit: "cm" },
    material: "智能马桶预留",
    note: "参考 1F 卫生间，马桶放在右侧中下部，和台盆同侧排列。",
    constructionNote: "复核坑距、给水角阀、智能马桶电源和门扇开启范围。",
    serviceRequirements: twoFloorBathService,
    position: { x: 42.05, y: 18.5, rotation: 90 },
    color: "#f4f0ea"
  },
  {
    id: "furn-2f-guest-vanity-001",
    code: "VA-2F-G01",
    name: "2F 客卫右下台盆柜",
    type: "vanity",
    catalogId: "bath-vanity",
    moduleCategory: "bath",
    moduleType: "vanity",
    floorId: "2F",
    roomId: "ROOM-2F-001",
    dimensions: { width: 90, depth: 50, height: 85, unit: "cm" },
    material: "台盆柜 + 镜柜 + 镜前灯预留",
    note: "参考 1F 卫生间，台盆靠近进门但不挡门，和马桶、淋浴形成三件套。",
    constructionNote: "预留台盆给排水、镜柜灯、吹风机插座和防溅安全距离。",
    serviceRequirements: twoFloorBathService,
    position: { x: 42.45, y: 27.5, rotation: 270 },
    color: "#d6d9d7"
  },
  {
    id: "furn-2f-master-shower-001",
    code: "SH-2F-M01",
    name: "主卫左上玻璃淋浴间",
    type: "shower",
    catalogId: "bath-shower",
    moduleCategory: "bath",
    moduleType: "shower",
    floorId: "2F",
    roomId: "ROOM-2F-003",
    dimensions: { width: 90, depth: 90, height: 210, unit: "cm" },
    material: "无框超白玻璃 + 暖灰防滑砖 + 壁龛灯",
    note: "主卫左上角做无框玻璃淋浴间，墙地面延续暖灰石材感，壁龛用暖光提氛围。",
    constructionNote: "复核淋浴冷热水、地漏坡度、挡水条、玻璃隔断开启方向和壁龛灯低压电源。",
    serviceRequirements: twoFloorWetNoPower,
    position: { x: 68.2, y: 9, rotation: 0 },
    color: "#9fcdda"
  },
  {
    id: "furn-2f-master-bathtub-001",
    code: "BT-2F-M01",
    name: "主卫左侧浴缸",
    type: "bathtub",
    catalogId: "bath-bathtub",
    moduleCategory: "bath",
    moduleType: "bathtub",
    floorId: "2F",
    roomId: "ROOM-2F-003",
    dimensions: { width: 170, depth: 75, height: 58, unit: "cm" },
    material: "暖白亚克力浴缸 + 暖灰石材背景",
    note: "浴缸沿主卫左侧竖向布置，用暖灰墙面和低位线性光弱化体量。",
    constructionNote: "校核上下水、检修口、防水翻边、浴缸侧边通道和低位灯带检修。",
    serviceRequirements: twoFloorWetNoPower,
    position: { x: 67.15, y: 24.2, rotation: 90 },
    color: "#f7f4ee"
  },
  {
    id: "furn-2f-master-vanity-001",
    code: "VA-2F-M01",
    name: "主卫 W-2F-006 双人台盆",
    type: "vanity",
    catalogId: "bath-vanity",
    moduleCategory: "bath",
    moduleType: "vanity",
    floorId: "2F",
    roomId: "ROOM-2F-003",
    dimensions: { width: 160, depth: 55, height: 85, unit: "cm" },
    material: "浅木悬浮双盆柜 + 白色岩板台面 + 大面镜柜 + 上下线性灯",
    note: "按要求沿 W-2F-006 东侧墙布置双人台盆，视觉重点放在浅木柜体、长镜柜和暖光灯带。",
    constructionNote: "沿 W-2F-006 复核双盆冷热水、双下水、镜柜灯、吹风插座、防溅距离和悬浮柜承重。",
    serviceRequirements: twoFloorBathService,
    position: { x: 76.83, y: 14.8, rotation: 90 },
    color: "#a9764c"
  },
  {
    id: "furn-2f-master-toilet-001",
    code: "WC-2F-M01",
    name: "主卫右下马桶",
    type: "toilet",
    catalogId: "bath-toilet",
    moduleCategory: "bath",
    moduleType: "toilet",
    floorId: "2F",
    roomId: "ROOM-2F-003",
    dimensions: { width: 70, depth: 75, height: 78, unit: "cm" },
    material: "暖白智能马桶 + 暖灰石材背景墙",
    note: "马桶放在主卫右下侧，尽量收进较安静的位置，避开双盆主操作区。",
    constructionNote: "复核坑距、给水角阀、智能马桶电源、门扇开启范围和墙面检修口。",
    serviceRequirements: twoFloorBathService,
    position: { x: 76.55, y: 28.3, rotation: 90 },
    color: "#f4f0ea"
  },
  {
    id: "furn-2f-bedroom1-bed-001",
    code: "BD-2F-01",
    name: "卧室1 靠墙双人床",
    type: "bed",
    catalogId: "bedroom-bed",
    moduleCategory: "bedroom",
    moduleType: "bed",
    floorId: "2F",
    roomId: "ROOM-2F-004",
    dimensions: { width: 150, depth: 200, height: 95, unit: "cm" },
    material: "木质床架 + 软包床头",
    note: "床头贴墙布置，后续复核床侧通道、床头插座和衣柜开门空间。",
    constructionNote: "床头两侧预留插座、双控和夜灯；床尾通道后续按现场尺寸复核。",
    serviceRequirements: twoFloorNoService,
    position: { x: 16.25, y: 70.4, rotation: 270 },
    color: "#c8a887"
  },
  {
    id: "furn-2f-bedroom1-wardrobe-001",
    code: "WD-2F-01",
    name: "卧室1 衣柜",
    type: "wardrobe",
    catalogId: "storage-wardrobe",
    moduleCategory: "storage",
    moduleType: "wardrobe",
    floorId: "2F",
    roomId: "ROOM-2F-004",
    dimensions: { width: 240, depth: 60, height: 240, unit: "cm" },
    material: "定制柜体 + 平开/移门",
    note: "衣柜贴墙布置，避开床侧通道和门洞开启范围。",
    constructionNote: "确认开门方向、床侧通道、柜内挂衣区和顶部换季收纳。",
    serviceRequirements: twoFloorNoService,
    position: { x: 30, y: 72, rotation: 90 },
    color: "#c8a887"
  },
  {
    id: "furn-2f-bedroom2-bed-001",
    code: "BD-2F-02",
    name: "卧室2 靠墙双人床",
    type: "bed",
    catalogId: "bedroom-bed",
    moduleCategory: "bedroom",
    moduleType: "bed",
    floorId: "2F",
    roomId: "ROOM-2F-005",
    dimensions: { width: 150, depth: 200, height: 95, unit: "cm" },
    material: "木质床架 + 软包床头",
    note: "床头贴墙布置，后续复核床侧通道、床头插座和衣柜开门空间。",
    constructionNote: "床头两侧预留插座、双控和夜灯；床尾通道后续按现场尺寸复核。",
    serviceRequirements: twoFloorNoService,
    position: { x: 45.6, y: 70.4, rotation: 270 },
    color: "#c8a887"
  },
  {
    id: "furn-2f-bedroom2-wardrobe-001",
    code: "WD-2F-02",
    name: "卧室2 衣柜",
    type: "wardrobe",
    catalogId: "storage-wardrobe",
    moduleCategory: "storage",
    moduleType: "wardrobe",
    floorId: "2F",
    roomId: "ROOM-2F-005",
    dimensions: { width: 240, depth: 60, height: 240, unit: "cm" },
    material: "定制柜体 + 平开/移门",
    note: "衣柜贴墙布置，避开床侧通道和门洞开启范围。",
    constructionNote: "确认开门方向、床侧通道、柜内挂衣区和顶部换季收纳。",
    serviceRequirements: twoFloorNoService,
    position: { x: 52.016666666666666, y: 72, rotation: 90 },
    color: "#c8a887"
  },
  {
    id: "furn-2f-master-bedroom-bed-001",
    code: "BD-2F-MB01",
    name: "主卧 最里面双人床",
    type: "bed",
    catalogId: "bedroom-bed",
    moduleCategory: "bedroom",
    moduleType: "bed",
    floorId: "2F",
    roomId: "ROOM-2F-006",
    dimensions: { width: 180, depth: 200, height: 95, unit: "cm" },
    material: "木质床架 + 软包床头",
    note: "床放在主卧最里面的南侧深处，床尾朝向主卧入口动线，避开主卫门口。",
    constructionNote: "床头两侧预留插座、双控和夜灯；复核床边衣柜与床侧通道的净宽。",
    serviceRequirements: twoFloorNoService,
    position: { x: 71.55, y: 75.2, rotation: 0 },
    color: "#c8a887"
  },
  {
    id: "furn-2f-master-bedroom-large-wardrobe-001",
    code: "WD-2F-MB01",
    name: "主卧 东侧整墙大衣柜",
    type: "wardrobe",
    catalogId: "storage-wardrobe",
    moduleCategory: "storage",
    moduleType: "wardrobe",
    floorId: "2F",
    roomId: "ROOM-2F-006",
    dimensions: { width: 260, depth: 60, height: 240, unit: "cm" },
    material: "定制大衣柜 + 顶柜 + 感应灯带",
    note: "大衣柜沿主卧东侧长墙布置，靠近主卫但不压主卫门洞，承担主要挂衣和换季收纳。",
    constructionNote: "复核东墙柜体深度、开门/移门方式、主卫门套收口和床侧通道。",
    serviceRequirements: twoFloorNoService,
    position: { x: 76.55, y: 48.8, rotation: 90 },
    color: "#d8c2a4"
  },
  {
    id: "furn-2f-master-bedroom-chest-001",
    code: "DR-2F-MB01",
    name: "主卧 主卫门旁五斗橱",
    type: "sideboard",
    catalogId: "storage-sideboard",
    moduleCategory: "storage",
    moduleType: "sideboard",
    floorId: "2F",
    roomId: "ROOM-2F-006",
    dimensions: { width: 100, depth: 45, height: 90, unit: "cm" },
    material: "木色五斗橱 + 金属拉手",
    note: "五斗橱位于接近主卫的北侧靠墙处，用来收小件衣物、睡衣和护理用品。",
    constructionNote: "靠主卫墙边但避开门洞开启，顶部可预留镜子或小夜灯电源。",
    serviceRequirements: twoFloorNoService,
    position: { x: 71.25, y: 36.8, rotation: 0 },
    color: "#d7c6a8"
  }
];

const b2NoService = { water: false, drainage: false, power: false, exhaust: false };
const b2PowerOnly = { water: false, drainage: false, power: true, exhaust: false };

const b2DefaultFurniture: Furniture[] = [
  {
    id: "furn-b2-living-tv-console-001",
    code: "TV-B2-01",
    name: "B2 客厅 W-B2-001 电视柜",
    type: "cabinet",
    catalogId: "living-tv-console",
    moduleCategory: "living",
    moduleType: "cabinet",
    floorId: "B2",
    roomId: "ROOM-B2-001",
    dimensions: { width: 360, depth: 42, height: 45, unit: "cm" },
    material: "悬浮木色电视柜 + 游戏主机抽屉 + 隐藏弱电",
    note: "沿 B2 客厅上方 W-B2-001 做一整条低电视柜，电视、游戏主机、音响和手柄收纳都集中在这面墙。",
    constructionNote: "贴 W-B2-001 预留电视电源、网络、影音线管、主机散热和音响线；柜体下方可悬空便于清洁。",
    serviceRequirements: b2PowerOnly,
    position: { x: 47, y: 7.4, rotation: 0 },
    color: "#d8c2a4"
  },
  {
    id: "furn-b2-living-large-tv-001",
    code: "TV-B2-02",
    name: "B2 客厅 W-B2-001 大电视",
    type: "custom",
    moduleCategory: "living",
    floorId: "B2",
    roomId: "ROOM-B2-001",
    dimensions: { width: 320, depth: 8, height: 185, unit: "cm" },
    material: "超大屏电视 / 激光电视预留",
    note: "放在电视柜上方，面向长沙发和可移动游戏区，作为 B2 看电视、游戏和观赛的核心屏幕。",
    constructionNote: "电视中心线、插座、网口和音响线预埋需与 W-B2-001 立面一起定位。",
    serviceRequirements: b2PowerOnly,
    position: { x: 47, y: 5.6, rotation: 0 },
    color: "#111827"
  },
  {
    id: "furn-b2-living-long-sofa-001",
    code: "SF-B2-01",
    name: "B2 客厅长沙发",
    type: "sofa",
    catalogId: "living-sofa",
    moduleCategory: "living",
    moduleType: "sofa",
    floorId: "B2",
    roomId: "ROOM-B2-001",
    dimensions: { width: 360, depth: 105, height: 78, unit: "cm" },
    material: "深灰/米灰布艺长沙发",
    note: "沙发对齐 W-B2-001 电视墙中心线，后方仍保留去书房、楼梯间和活动区的通行。",
    constructionNote: "沙发侧边预留五孔插座和落地灯电源；正前方保留体感游戏和多人观影的净距。",
    serviceRequirements: b2PowerOnly,
    position: { x: 48.5, y: 39.5, rotation: 0 },
    color: "#b8b2aa"
  },
  {
    id: "furn-b2-living-coffee-table-001",
    code: "CT-B2-01",
    name: "B2 客厅可移动茶几",
    type: "table",
    moduleCategory: "living",
    moduleType: "table",
    floorId: "B2",
    roomId: "ROOM-B2-001",
    dimensions: { width: 120, depth: 70, height: 38, unit: "cm" },
    material: "深木色轻量茶几 + 可移动托盘",
    note: "茶几缩小为可移动款，平时放饮品和遥控器，玩体感游戏时可以推到侧边。",
    constructionNote: "茶几到沙发前沿预留约 400mm，避免挡住客厅去楼梯间和活动区的动线。",
    serviceRequirements: b2NoService,
    position: { x: 48.5, y: 25.3, rotation: 0 },
    color: "#9b7653"
  },
  {
    id: "furn-b2-activity-outdoor-pegboard-001",
    code: "PG-B2-01",
    name: "B2 W-B2-011 户外用品洞洞板",
    type: "pegboard",
    catalogId: "storage-pegboard",
    moduleCategory: "storage",
    moduleType: "pegboard",
    floorId: "B2",
    roomId: "ROOM-B2-003",
    dimensions: { width: 360, depth: 12, height: 220, unit: "cm" },
    material: "黑色金属洞洞板 + 可调挂钩 + 自行车挂架",
    note: "沿 W-B2-011 做一整面户外用品挂墙，未来收纳自行车、头盔、球拍和运动小件。",
    constructionNote: "固定在 W-B2-011 实墙基层；自行车挂架位置必须加固，地面预留防污垫，旁边可预留充电插座。",
    serviceRequirements: b2PowerOnly,
    position: { x: 63.6, y: 85.8, rotation: 0 },
    color: "#334155",
    cabinetDesign: {
      template: "pegboard",
      title: "B2 户外用品洞洞板设计",
      designThinking: "把容易散落的户外物品全部上墙：大件自行车有独立承重点，小件头盔、球拍和护具用可移动挂件，后续运动品类变化也能重排。",
      recommendedPlacement: "贴 B2 底部 W-B2-011 墙面右半段，靠活动区一侧，从柱子右边开始布置，避开书房主桌椅动线。",
      layoutNotes: ["自行车挂位需要实墙加固", "头盔和护具放在拿取高度", "球拍、球袋和小工具用可移动挂钩分区", "底部留防污垫和鞋/打气筒位置"],
      zones: [
        { id: "bike-zone", label: "自行车挂位", role: "自行车 / 轮胎", widthPercent: 42, heightPercent: 100, detail: "用承重挂架固定自行车，轮胎下方留防污区域。", serviceNote: "固定点打到实墙或加固基层。" },
        { id: "helmet-zone", label: "头盔护具", role: "头盔 / 护膝", widthPercent: 24, heightPercent: 72, detail: "头盔和护具放在腰胸高度，回家顺手挂上。" },
        { id: "racket-zone", label: "球拍小件", role: "球拍 / 打气筒 / 工具", widthPercent: 34, heightPercent: 78, detail: "竖向挂球拍、球袋和维修工具，小件用盒篮集中。", serviceNote: "可在侧边预留充电插座。" }
      ],
      cautionNotes: ["自行车挂架不能只固定在薄板上，必须确认墙体基层。", "洞洞板下方要留清洁和防泥水空间。"]
    }
  },
  {
    id: "furn-b2-activity-flex-mat-001",
    code: "AM-B2-01",
    name: "B2 活动区可移动游戏软垫",
    type: "custom",
    moduleCategory: "decor",
    floorId: "B2",
    roomId: "ROOM-B2-003",
    dimensions: { width: 260, depth: 170, height: 4, unit: "cm" },
    material: "低矮可卷收软垫 / 体感游戏区",
    note: "柱子右侧保留为主要活动净空，只用可移动软垫定义游戏、拉伸、儿童活动和临时运动区域。",
    constructionNote: "软垫不做固定家具；地面建议耐磨防滑，靠 W-B2-012 天窗区域避免布置高柜。",
    serviceRequirements: b2NoService,
    position: { x: 67.5, y: 68.5, rotation: 0 },
    color: "#a7d8de"
  },
  {
    id: "furn-b2-study-souvenir-cabinet-001",
    code: "SC-B2-01",
    name: "B2 书房透明纪念品收纳柜",
    type: "cabinet",
    catalogId: "storage-bookshelf",
    moduleCategory: "storage",
    moduleType: "bookshelf",
    floorId: "B2",
    roomId: "ROOM-B2-005",
    dimensions: { width: 260, depth: 38, height: 220, unit: "cm" },
    material: "透明玻璃门 + 浅木层板 + 可调灯带",
    note: "靠书房左侧墙布置，用来展示从全世界买回来的纪念品。",
    constructionNote: "玻璃柜靠墙固定防倾倒，层板做可调孔位；柜内预留低压灯带和检修电源。",
    serviceRequirements: b2PowerOnly,
    position: { x: 10.6, y: 72.2, rotation: 90 },
    color: "#dbeafe",
    cabinetDesign: {
      template: "bookshelf",
      title: "透明纪念品收纳柜设计",
      designThinking: "纪念品不是杂物，应该被看见。透明门防尘，层板可调适配不同尺寸，灯带让小物件有展示感。",
      recommendedPlacement: "B2 书房靠左侧墙面，避开大板桌椅后退区，柜门朝向书房中心打开。",
      layoutNotes: ["上层展示轻小纪念品", "中层留高格放雕塑、模型和旅行器物", "下层半透明抽屉收票根、明信片和包装盒", "柜内加低压灯带"],
      zones: [
        { id: "display-small", label: "小件展示", role: "冰箱贴 / 小摆件", widthPercent: 38, heightPercent: 42, detail: "密集小件用浅层层板和亚克力台阶展示。" },
        { id: "display-tall", label: "高件展示", role: "雕塑 / 模型", widthPercent: 34, heightPercent: 58, detail: "留几格高层板，避免所有纪念品都被压扁。" },
        { id: "memory-drawers", label: "记忆抽屉", role: "票根 / 明信片", widthPercent: 28, heightPercent: 36, detail: "纸质纪念品进浅抽屉，按国家或年份分隔。", serviceNote: "灯带电源走柜后隐藏。" }
      ],
      cautionNotes: ["玻璃柜必须防倾倒固定。", "纪念品多且重时，层板要控制跨度并选用更厚玻璃或木层板。"]
    }
  },
  {
    id: "furn-b2-study-slab-table-001",
    code: "DT-B2-01",
    name: "B2 书房大板桌",
    type: "table",
    moduleCategory: "decor",
    moduleType: "table",
    floorId: "B2",
    roomId: "ROOM-B2-005",
    dimensions: { width: 300, depth: 95, height: 75, unit: "cm" },
    material: "长方形原木大板桌 + 黑色金属桌脚",
    note: "这是一张横向长方形的大木桌，不是方桌；放在书房中央偏右，用于阅读、整理旅行纪念品和多人讨论。",
    constructionNote: "桌边预留地插或墙插，椅后保持通行；桌面按整块木板 3000mm 左右控制，右侧避开圆柱。",
    serviceRequirements: b2PowerOnly,
    position: { x: 31, y: 71.7, rotation: 0 },
    color: "#b9824d"
  }
];

const revisionControlledFurnitureIds = new Set([
  ...oneFloorDefaultFurniture.map((item) => item.id),
  ...b1DefaultFurniture.map((item) => item.id),
  ...twoFloorDefaultFurniture.map((item) => item.id),
  ...b2DefaultFurniture.map((item) => item.id),
  ...Array.from(persistentDefaultFurnitureIds)
]);
const twoFloorMasterBedroomFurnitureIds = new Set([
  "furn-2f-master-bedroom-bed-001",
  "furn-2f-master-bedroom-large-wardrobe-001",
  "furn-2f-master-bedroom-chest-001"
]);

function normalizeHouseStructure(floorId: FloorId, structure: HouseStructure | undefined, fallback?: HouseStructure): HouseStructure {
  const emptyStructure = fallback ?? createEmptyStructure(floorId);
  if (!structure) return emptyStructure;
  return {
    ...emptyStructure,
    ...structure,
    floorId,
    coordinateSystem: structure.coordinateSystem ?? emptyStructure.coordinateSystem,
    walls: structure.walls ?? [],
    rooms: structure.rooms ?? [],
    partitions: structure.partitions ?? [],
    stairs: structure.stairs ?? [],
    columns: structure.columns ?? [],
    fences: structure.fences ?? [],
    outdoorSurfaces: structure.outdoorSurfaces ?? [],
    doors: structure.doors ?? [],
    windows: structure.windows ?? [],
    bayWindows: structure.bayWindows ?? [],
    skylights: structure.skylights ?? [],
    outdoors: structure.outdoors ?? []
  };
}

function getWorkspaceStructureScore(workspace: Partial<PersistedWebWorkspace>) {
  const structures = (workspace.houseStructuresByFloor ?? {}) as Partial<Record<FloorId, Partial<HouseStructure>>>;
  return Object.values(structures).reduce<number>((score, structure) => {
    if (!structure) return score;
    return score +
      (structure.walls?.length ?? 0) * 4 +
      (structure.doors?.length ?? 0) * 3 +
      (structure.windows?.length ?? 0) * 2 +
      (structure.partitions?.length ?? 0) * 2 +
      (structure.stairs?.length ?? 0) * 2 +
      (structure.columns?.length ?? 0) * 2 +
      (structure.fences?.length ?? 0) +
      (structure.outdoorSurfaces?.length ?? 0) +
      (structure.outdoors?.length ?? 0);
  }, workspace.furniture?.length ?? 0);
}

function getKnownWorkspaceTimestamp(workspace: Partial<PersistedWebWorkspace>) {
  const timestampValue = workspace.updatedAt ?? workspace.savedAt;
  if (!timestampValue) return null;
  const timestamp = Date.parse(timestampValue);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getWorkspaceTimestamp(workspace: Partial<PersistedWebWorkspace>) {
  return getKnownWorkspaceTimestamp(workspace) ?? 0;
}

function hasPersistedWorkspaceContent(workspace: Partial<PersistedWebWorkspace>) {
  return Boolean(
    workspace.houseStructuresByFloor ||
    workspace.furniture?.length ||
    workspace.semanticObjects?.length ||
    workspace.visualSettingsByFloor ||
    workspace.cleanPatchesByFloor
  );
}

function pickBestWorkspace(candidates: Partial<PersistedWebWorkspace>[]) {
  return candidates
    .filter(hasPersistedWorkspaceContent)
    .sort((left, right) => {
      const timeDelta = getWorkspaceTimestamp(right) - getWorkspaceTimestamp(left);
      if (timeDelta !== 0) return timeDelta;
      return getWorkspaceStructureScore(right) - getWorkspaceStructureScore(left);
    })[0] ?? null;
}

function encodeUtf8Base64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.slice(index, index + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

function decodeUtf8Base64(value: string) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function supportsLocalCodeFileAccess() {
  if (typeof window === "undefined") return false;
  return Boolean((window as LocalFilePickerWindow).showOpenFilePicker && window.indexedDB);
}

function openLocalCodeFileDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(LOCAL_CODE_FILE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(LOCAL_CODE_FILE_STORE_NAME)) {
        request.result.createObjectStore(LOCAL_CODE_FILE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readLocalCodeFileHandle() {
  return new Promise<LocalCodeFileHandle | null>(async (resolve, reject) => {
    try {
      if (!supportsLocalCodeFileAccess()) {
        resolve(null);
        return;
      }
      const db = await openLocalCodeFileDb();
      const transaction = db.transaction(LOCAL_CODE_FILE_STORE_NAME, "readonly");
      const request = transaction.objectStore(LOCAL_CODE_FILE_STORE_NAME).get(LOCAL_CODE_FILE_HANDLE_KEY);
      request.onsuccess = () => resolve((request.result as LocalCodeFileHandle | undefined) ?? null);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

function storeLocalCodeFileHandle(handle: LocalCodeFileHandle) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const db = await openLocalCodeFileDb();
      const transaction = db.transaction(LOCAL_CODE_FILE_STORE_NAME, "readwrite");
      const request = transaction.objectStore(LOCAL_CODE_FILE_STORE_NAME).put(handle, LOCAL_CODE_FILE_HANDLE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

function storeLocalCodeBackup(name: string, workspace: PersistedWebWorkspace) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const db = await openLocalCodeFileDb();
      const transaction = db.transaction(LOCAL_CODE_FILE_STORE_NAME, "readwrite");
      const request = transaction.objectStore(LOCAL_CODE_FILE_STORE_NAME).put(
        { name, savedAt: new Date().toISOString(), workspace },
        `backup:${name}`
      );
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

async function ensureLocalCodeFilePermission(handle: LocalCodeFileHandle) {
  const descriptor = { mode: "readwrite" as const };
  const currentPermission = await handle.queryPermission?.(descriptor);
  if (!currentPermission || currentPermission === "granted") return true;
  const nextPermission = await handle.requestPermission?.(descriptor);
  return nextPermission === "granted";
}

async function writeLocalCodeFile(handle: LocalCodeFileHandle, payload: string) {
  const hasPermission = await ensureLocalCodeFilePermission(handle);
  if (!hasPermission) throw new Error("没有获得代码文件写入权限。");
  const writable = await handle.createWritable();
  await writable.write(`${payload.trim()}\n`);
  await writable.close();
}

async function readLocalCodeFile(handle: LocalCodeFileHandle) {
  if (!handle.getFile) throw new Error("当前浏览器无法回读绑定文件。");
  const file = await handle.getFile();
  const workspace = JSON.parse(await file.text()) as unknown;
  if (!validateWorkspacePayload(workspace)) throw new Error("代码文件内容不是有效的 workspace。");
  return workspace as unknown as PersistedWebWorkspace;
}

function RightPanelCard({
  id,
  title,
  eyebrow,
  summary,
  open,
  onToggle,
  children
}: {
  id: RightPanelKey;
  title: string;
  eyebrow: string;
  summary: string;
  open: boolean;
  onToggle: (id: RightPanelKey) => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white text-sm shadow-sm">
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-stone-50"
        onClick={() => onToggle(id)}
        type="button"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">{eyebrow}</span>
          <span className="mt-0.5 block font-semibold text-ink">{title}</span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">{summary}</span>
        </span>
        <span className={`grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-stone-500 transition ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && <div className="border-t border-stone-100 p-4">{children}</div>}
    </section>
  );
}

function createDefaultShared3DSceneSettings(drawingSheetType: DrawingSheetType): Shared3DSceneSettings {
  const profile = getDrawing3DPresentationProfile(drawingSheetType);
  const wallDisplayMode = profile.wallMode;
  return {
    drawingSheetType,
    drawingViewPreset: profile.defaultPreset,
    furnitureHeightMode: "actual",
    materialPreview: true,
    designStyle: "warmJapandi",
    wallDisplayMode,
    lightingWallMode: wallDisplayMode === "full" ? "full" : "smartCutaway",
    materialCategoryFilter: "all",
    roomCeilingMode: drawingSheetType === "sitePlan" ? "translucent" : "hidden",
    ceilingSolid: false,
    showFixtureModels: true,
    showFixtureIds: false,
    showBeamCones: false,
    showLightSpots: false,
    showControlRelations: false,
    showIlluminanceLayer: false,
    presentationMode: false,
    villaExperienceEnabled: drawingSheetType === "lightingPlan"
  };
}

export function SpacePlanner({ data }: { data: SpaceData }) {
  const defaultSelectedFloorId: FloorId = data.selectedFloorId ?? "1F";
  const initialSelectedFloorId: FloorId = data.floors.some((floor) => floor.id === defaultSelectedFloorId) ? defaultSelectedFloorId : "1F";
  const initialVisualSettings = data.floors.reduce((settingsByFloor, floor) => {
    settingsByFloor[floor.id] = data.workspace.visualSettingsByFloor[floor.id] ?? floor.visualSettings ?? getDefaultVisualSettings();
    return settingsByFloor;
  }, {} as Record<FloorId, FloorPlanVisualSettings>);
  const initialCleanPatches = data.floors.reduce((patchesByFloor, floor) => {
    patchesByFloor[floor.id] = data.workspace.cleanPatchesByFloor[floor.id] ?? floor.cleanPatches ?? [];
    return patchesByFloor;
  }, {} as Record<FloorId, CleanPatch[]>);
  const [floors, setFloors] = useState(data.floors);
  const [selectedFloorId, setSelectedFloorId] = useState<FloorId>(initialSelectedFloorId);
  const [furniture, setFurniture] = useState<Furniture[]>(() => synchronizeFurnitureHeights(enrichMissingFurnitureMetadata(data.workspace.furniture), data.workspace.houseStructuresByFloor));
  const [drawingItems, setDrawingItems] = useState<DrawingItem[]>(() => data.workspace.drawingItems);
  const [drawingPackage, setDrawingPackage] = useState<DrawingPackage>(() => data.workspace.drawingPackage);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(data.workspace.furniture.find((item) => item.floorId === initialSelectedFloorId)?.id ?? data.workspace.furniture[0]?.id ?? "");
  const [semanticObjects, setSemanticObjects] = useState<SemanticObject[]>(() => data.workspace.semanticObjects);
  const [selectedSemanticObjectId, setSelectedSemanticObjectId] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [editorMode, setEditorMode] = useState<ExplorationEditorMode>("design");
  const explorationReturnStateRef = useRef<{ viewMode: ViewMode; plannerMode: PlannerMode } | null>(null);
  const legacyInitialDrawingSheetType = data.workspace.selectedDrawingSheetType ?? "sitePlan";
  const initialDrawingWorkspace = getDefaultDrawingWorkspace(legacyInitialDrawingSheetType);
  const initialWorkspaceTabId = getDefaultWorkspaceTab(legacyInitialDrawingSheetType);
  const initialResolvedDrawingWorkspace = resolveDrawingWorkspace(initialDrawingWorkspace.id, initialWorkspaceTabId);
  const initialDrawingSheetType = initialResolvedDrawingWorkspace.persistedSheet;
  const [selectedDrawingSheetType, setSelectedDrawingSheetType] = useState<DrawingSheetType>(initialDrawingSheetType);
  const [sharedPlanCanvasMode, setSharedPlanCanvasMode] = useState<PlanCanvasMode>(initialResolvedDrawingWorkspace.mode);
  const [activeDrawingWorkspaceId, setActiveDrawingWorkspaceId] = useState(initialDrawingWorkspace.id);
  const [activeWorkspaceTabId, setActiveWorkspaceTabId] = useState<WorkspaceTabId | null>(initialWorkspaceTabId);
  const [shared3DSceneSettings, setShared3DSceneSettings] = useState<Shared3DSceneSettings>(() => createDefaultShared3DSceneSettings(initialDrawingSheetType));
  const [activeEditorPanel, setActiveEditorPanel] = useState<EditorRightPanelKey | null>(null);
  const [drawingDirectoryOpen, setDrawingDirectoryOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [editorDialog, setEditorDialog] = useState<EditorDialogKey>(null);
  const [developerMode, setDeveloperMode] = useState(false);
  const [contextToolbarExpanded, setContextToolbarExpanded] = useState(true);
  const [leftSidebarMode, setLeftSidebarMode] = useState<"objects" | "tools">("objects");
  const [editorDisplayMode, setEditorDisplayMode] = useState<"edit" | "presentation">("edit");
  const [activeWorkspaceToolId, setActiveWorkspaceToolId] = useState("select");
  const [showAdvancedCanvasControls, setShowAdvancedCanvasControls] = useState(false);
  const [constructionPackageOpenRequest, setConstructionPackageOpenRequest] = useState(0);
  const [drawingItemCreationRequest, setDrawingItemCreationRequest] = useState<{
    category: DrawingItem["category"];
    type: string;
    label: string;
    nonce: number;
  } | null>(null);
  const [accessMode, setAccessMode] = useState<AccessMode>(DEFAULT_MOBILE_ACCESS_MODE);
  const [isPhoneDevice, setIsPhoneDevice] = useState(false);
  const [mobileDisplayLevel, setMobileDisplayLevel] = useState<MobileDisplayLevel>("simple");
  const [mobileQuality, setMobileQuality] = useState<MobileQuality>("balanced");
  const [mobileProfessionalSheetMode, setMobileProfessionalSheetMode] = useState<MobileProfessionalSheetMode>("socketPlan");
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [mobileSheetTarget, setMobileSheetTarget] = useState<MobileSheetTarget | null>(null);
  const [mobileResetViewRequest, setMobileResetViewRequest] = useState(0);
  const [plannerMode, setPlannerMode] = useState<PlannerMode>("edit");
  const [drawTool, setDrawTool] = useState<DrawTool>("select");
  const [floorPlanScale, setFloorPlanScale] = useState(1);
  const [visualSettingsByFloor, setVisualSettingsByFloor] = useState<Record<FloorId, FloorPlanVisualSettings>>(initialVisualSettings);
  const [cleanPatchesByFloor, setCleanPatchesByFloor] = useState<Record<FloorId, CleanPatch[]>>(initialCleanPatches);
  const [houseStructuresByFloor, setHouseStructuresByFloor] = useState<Record<FloorId, HouseStructure>>(() => data.workspace.houseStructuresByFloor);
  const [stairSystems, setStairSystems] = useState<StairSystem[]>(() => data.workspace.stairSystems);
  const [stairLandings, setStairLandings] = useState<StairLanding[]>(() => data.workspace.stairLandings);
  const [stairOpenings, setStairOpenings] = useState<StairOpening[]>(() => data.workspace.stairOpenings);
  const [wallSyncOverrides, setWallSyncOverrides] = useState<WallSyncOverrides>({});
  const [validatorRepairLog, setValidatorRepairLog] = useState<string[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  const [furnitureImmersiveMode, setFurnitureImmersiveMode] = useState(false);
  const [cameraViews, setCameraViews] = useState<FixedCameraView[]>(data.workspace.cameraViews);
  const [roomTourViews, setRoomTourViews] = useState<RoomTourView[]>(data.workspace.roomTourViews);
  const [lightingDesign, setLightingDesign] = useState<LightingDesign>(data.workspace.lightingDesign ?? fallbackLightingDesign);
  const [fixedCameraViewRequest, setFixedCameraViewRequest] = useState<{ view: FixedCameraView; nonce: number } | null>(null);
  const [showFurnitureLabels, setShowFurnitureLabels] = useState(true);
  const [modernNaturalScopeType, setModernNaturalScopeType] = useState<ModernNaturalScope["type"]>("floor");
  const [modernNaturalAction, setModernNaturalAction] = useState<{ before: Furniture[]; after: Furniture[]; status: "applied" | "undone" } | null>(null);
  const [command, setCommand] = useState("");
  const [activeObjectId, setActiveObjectId] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<VerificationDisplayState | "all" | "unconfirmed">("unconfirmed");
  const [wardrobeDesignFurnitureId, setWardrobeDesignFurnitureId] = useState("");
  const [designPageRequest, setDesignPageRequest] = useState<DesignPageRequest | null>(null);
  const [locateObjectRequest, setLocateObjectRequest] = useState<{ id: string; nonce: number } | null>(null);
  const [hasLoadedWebWorkspace, setHasLoadedWebWorkspace] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>({ status: "idle" });
  const [codeSaveState, setCodeSaveState] = useState<CodeSaveState>({ status: "idle", target: "none" });
  const [workspaceSource, setWorkspaceSource] = useState<"code" | "draft">("code");
  const [currentWorkspaceHash, setCurrentWorkspaceHash] = useState("");
  const [publishState, setPublishState] = useState<PublishState>({ status: "idle" });
  const [localCodeFileStatus, setLocalCodeFileStatus] = useState<LocalCodeFileStatus>("checking");
  const [localCodeFileHandle, setLocalCodeFileHandle] = useState<LocalCodeFileHandle | null>(null);
  const [localCodeFileName, setLocalCodeFileName] = useState("");
  const [localCodeAutoSync, setLocalCodeAutoSync] = useState(false);
  const [localCodeServerOnline, setLocalCodeServerOnline] = useState(false);
  const [defaultWorkspacePayload, setDefaultWorkspacePayload] = useState("");
  const [workspaceConflict, setWorkspaceConflict] = useState<WorkspaceConflict | null>(null);
  const [workspaceImportPreview, setWorkspaceImportPreview] = useState<WorkspaceImportPreview | null>(null);
  const [workspaceImportError, setWorkspaceImportError] = useState("");
  const [saveSelfCheckResult, setSaveSelfCheckResult] = useState<SaveSelfCheckResult>({ status: "idle" });
  const [confirmSelfCheckOverwrite, setConfirmSelfCheckOverwrite] = useState(false);
  const [openRightPanels, setOpenRightPanels] = useState<Record<RightPanelKey, boolean>>({
    floors: true,
    status: true,
    modules: true,
    object: true,
    semantic: false
  });
  const [openModuleCategories, setOpenModuleCategories] = useState<Record<InteriorModuleCategory, boolean>>({
    living: true,
    bedroom: false,
    kitchen: false,
    bath: false,
    storage: false,
    decor: false
  });
  const [historyByFloor, setHistoryByFloor] = useState<Partial<Record<FloorId, FloorHistory>>>({});
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHistoryBaseRef = useRef<Partial<Record<FloorId, ModelSnapshot>>>({});
  const suppressHistoryRef = useRef(false);
  const workspaceChangeVersionRef = useRef(0);
  const workspaceHashRequestRef = useRef(0);
  const latestWorkspaceRef = useRef<PersistedWebWorkspace | null>(null);
  const workspaceImportInputRef = useRef<HTMLInputElement | null>(null);
  const wardrobeCanvasRef = useRef<HTMLDivElement | null>(null);
  const activeDrawingWorkspace = resolveDrawingWorkspace(activeDrawingWorkspaceId, activeWorkspaceTabId);
  const initialFurnitureWith3DMeta = useMemo(() => enrichMissingFurnitureMetadata(data.workspace.furniture), [data.workspace.furniture]);
  const committedModelRef = useRef<Partial<Record<FloorId, ModelSnapshot>>>(
    Object.fromEntries(floors.map((floor) => [
      floor.id,
      {
        structure: data.workspace.houseStructuresByFloor[floor.id] ?? createEmptyStructure(floor.id),
        furniture: initialFurnitureWith3DMeta.filter((item) => item.floorId === floor.id),
        drawingItems: data.workspace.drawingItems.filter((item) => item.floorId === floor.id)
      }
    ])) as Partial<Record<FloorId, ModelSnapshot>>
  );
  const accessCapabilities = getWorkspaceAccessCapabilities(accessMode);
  const {
    canMutateWorkspace: accessCanMutateWorkspace,
    canPersistDraft,
    canWriteCode: accessCanWriteCode,
    canUseExternalSync
  } = accessCapabilities;
  const isExplorationMode = editorMode === "exploration";
  const canMutateWorkspace = accessCanMutateWorkspace && canExecuteEditorCommand(editorMode, "edit-property");
  const canWriteCode = accessCanWriteCode && !isExplorationMode;
  const canUseBrowserDrafts = IS_DEVELOPMENT && canPersistDraft;

  useEffect(() => {
    try {
      setDeveloperMode(window.localStorage.getItem("lyhp-editor-developer-mode") === "true");
      const rememberedPanel = window.localStorage.getItem("lyhp-editor-last-panel") as EditorRightPanelKey | null;
      if (rememberedPanel && ["properties", "resources", "validation", "ai"].includes(rememberedPanel)) {
        // Remember the last destination without reopening it on startup.
        setActiveEditorPanel(null);
      }
    } catch {
      // Storage can be unavailable in privacy mode; editor defaults remain safe.
    }
  }, []);

  useEffect(() => {
    if (!activeEditorPanel) return;
    try {
      window.localStorage.setItem("lyhp-editor-last-panel", activeEditorPanel);
    } catch {
      // Non-essential UI preference.
    }
  }, [activeEditorPanel]);

  useEffect(() => {
    if (activeObjectId) {
      setActiveEditorPanel("properties");
      return;
    }
    setActiveEditorPanel((currentPanel) => currentPanel === "properties" ? null : currentPanel);
  }, [activeObjectId]);

  useEffect(() => {
    const { sources } = applyWorkspaceMigrations(data.workspace);
    reportWorkspaceDataSources(sources, "data/default-workspace.json");
  }, [data.workspace]);

  useEffect(() => {
    const syncAccessMode = () => {
      const nextAccessMode = getDefaultAccessModeForDevice({
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
        coarsePointer: window.matchMedia("(pointer: coarse)").matches,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height
      });
      const mobileDevice = nextAccessMode !== "full-edit";
      setIsPhoneDevice(mobileDevice);
      if (mobileDevice) {
        setAccessMode(DEFAULT_MOBILE_ACCESS_MODE);
        // The phone experience is a lightweight read-only presentation. Keep
        // it out of the pointer-lock exploration shell even when the viewport
        // changes while exploration is active on desktop.
        setEditorMode("design");
        explorationReturnStateRef.current = null;
        setPlannerMode("view");
        setDrawTool("select");
      } else {
        setAccessMode(nextAccessMode);
        setMobileMoreOpen(false);
        setMobileSheetTarget(null);
      }
    };
    syncAccessMode();
    const firstTimer = window.setTimeout(syncAccessMode, 0);
    const secondTimer = window.setTimeout(syncAccessMode, 250);
    window.addEventListener("orientationchange", syncAccessMode);
    return () => {
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
      window.removeEventListener("orientationchange", syncAccessMode);
    };
  }, []);

  const currentFloor = floors.find((floor) => floor.id === selectedFloorId) ?? floors[0];
  const floorPlanVisualSettings = visualSettingsByFloor[selectedFloorId] ?? getDefaultVisualSettings();
  const floorCleanPatches = cleanPatchesByFloor[selectedFloorId] ?? [];
  const unifiedProjectScene = useMemo(() => buildUnifiedSceneGraph({
    structuresByFloor: houseStructuresByFloor,
    furniture,
    drawingItems
  }), [drawingItems, furniture, houseStructuresByFloor]);
  const currentFloorScene = useMemo(
    () => resolveUnifiedSceneScope(unifiedProjectScene, [selectedFloorId]),
    [selectedFloorId, unifiedProjectScene]
  );
  const floorHouseStructure = currentFloorScene.structuresByFloor[selectedFloorId] ?? createEmptyStructure(selectedFloorId);
  const floorFurniture = currentFloorScene.furniture;
  const floorDrawingItems = currentFloorScene.drawingItems;
  const oneFloorHouseStructure = houseStructuresByFloor["1F"] ?? createEmptyStructure("1F");
  const yardHouseStructure = houseStructuresByFloor.YARD ?? createEmptyStructure("YARD");
  const courtyardScene = useMemo(
    () => resolveUnifiedSceneScope(unifiedProjectScene, courtyardViewFloorIds),
    [unifiedProjectScene]
  );
  const unifiedCourtyardModel = useMemo(() => createUnifiedCourtyardModel({
    oneFloorStructure: oneFloorHouseStructure,
    yardStructure: yardHouseStructure,
    furniture: courtyardScene.furniture
  }), [courtyardScene.furniture, oneFloorHouseStructure, yardHouseStructure]);
  const derivedRoomTourViews = useMemo(() => deriveRoomTourViews({
    floors,
    houseStructuresByFloor,
    semanticObjects,
    cameraViews,
    roomTourViews
  }), [cameraViews, floors, houseStructuresByFloor, roomTourViews, semanticObjects]);
  const floorLegacyRooms = useMemo(() => (data.legacyRooms ?? data.rooms ?? []).filter((room) => room.floorId === selectedFloorId), [data.legacyRooms, data.rooms, selectedFloorId]);
  const floorLegacyWalls = useMemo(() => (data.legacyWalls ?? data.walls ?? []).filter((wall) => wall.floorId === selectedFloorId), [data.legacyWalls, data.walls, selectedFloorId]);
  const floorSemanticObjects = useMemo(
    () => semanticObjects.filter((object) => object.floorId === selectedFloorId),
    [semanticObjects, selectedFloorId]
  );
  const selectedFurniture = floorFurniture.find((item) => item.id === selectedFurnitureId) ?? null;
  const selectedSemanticObject = semanticObjects.find((object) => object.id === selectedSemanticObjectId) ?? null;
  const houseValidation = useMemo(
    () => validateHouse(selectedFloorId, floorHouseStructure, floorFurniture),
    [selectedFloorId, floorHouseStructure, floorFurniture]
  );
  const referenceReport = useMemo(() => validateWorkspaceReferences({
    floors,
    furniture,
    drawingItems,
    drawingPackage,
    semanticObjects,
    houseStructuresByFloor,
    stairSystems,
    stairLandings,
    stairOpenings,
    cameraViews,
    roomTourViews
  }), [floors, furniture, drawingItems, drawingPackage, semanticObjects, houseStructuresByFloor, stairSystems, stairLandings, stairOpenings, cameraViews, roomTourViews]);
  const stairValidationIssues = useMemo(() => validateStairSystems({
    structuresByFloor: houseStructuresByFloor,
    stairSystems,
    stairLandings,
    stairOpenings,
    furniture
  }), [furniture, houseStructuresByFloor, stairLandings, stairOpenings, stairSystems]);
  const verificationConflictIds = useMemo(() => {
    const ids = new Set(referenceReport.errors.map((issue) => issue.objectId));
    floors.forEach((floor) => {
      const structure = houseStructuresByFloor[floor.id] ?? createEmptyStructure(floor.id);
      validateHouse(floor.id, structure, furniture.filter((item) => item.floorId === floor.id)).errors.forEach((issue) => ids.add(issue.id));
    });
    return ids;
  }, [floors, furniture, houseStructuresByFloor, referenceReport.errors]);
  const unifiedObjectItems = useMemo<UnifiedObjectListItem[]>(() => {
    const items: UnifiedObjectListItem[] = [];
    floors.forEach((floor) => {
      const structure = houseStructuresByFloor[floor.id] ?? createEmptyStructure(floor.id);
      const roomNames = new Map(structure.rooms.map((room) => [room.id, room.name]));
      structure.walls.forEach((wall) => items.push({ id: wall.id, name: wall.name, floorId: floor.id, type: "wall", typeLabel: "墙体", dimensions: `${Math.round(wall.length)}×${wall.thickness}×${wall.height} mm`, locked: wall.locked, hidden: wall.hidden, conflict: verificationConflictIds.has(wall.id), verificationStatus: wall.verificationMeta?.status ?? "unverified" }));
      structure.partitions.forEach((item) => items.push({ id: item.id, name: item.name, floorId: floor.id, type: "partition", typeLabel: "隔断", dimensions: `${Math.round(getLineLength(item.start, item.end))}×${item.thickness}×${item.height} mm`, locked: item.locked, hidden: item.hidden, conflict: verificationConflictIds.has(item.id), verificationStatus: item.verificationMeta?.status ?? "unverified" }));
      structure.rooms.forEach((room) => items.push({ id: room.id, name: room.name, code: room.roomNumber, floorId: floor.id, roomId: room.id, roomName: room.name, type: "room", typeLabel: "房间", dimensions: `${(room.area / 1_000_000).toFixed(1)} ㎡`, locked: room.locked, hidden: room.hidden, conflict: verificationConflictIds.has(room.id), verificationStatus: room.verificationMeta?.status ?? "unverified" }));
      const addSimple = (list: Array<{ id: string; name: string; floorId: FloorId; locked?: boolean; hidden?: boolean; verificationMeta?: { status: UnifiedObjectListItem["verificationStatus"] } }>, type: string, typeLabel: string) => list.forEach((item) => items.push({ id: item.id, name: item.name, floorId: item.floorId, type, typeLabel, locked: item.locked, hidden: item.hidden, conflict: verificationConflictIds.has(item.id), verificationStatus: item.verificationMeta?.status ?? "unverified" }));
      addSimple(structure.doors, "door", "门");
      addSimple(structure.windows, "window", "窗");
      addSimple(structure.bayWindows, "bayWindow", "飘窗");
      addSimple(structure.skylights, "skylight", "天窗");
      addSimple(structure.stairs, "stair", "楼梯");
      addSimple(structure.columns ?? [], "column", "梁柱");
      addSimple(structure.fences, "fence", "围栏");
      addSimple(structure.outdoors, "outdoor", "庭院");
      addSimple(structure.outdoorSurfaces, "outdoorSurface", "室外铺装");
      furniture.filter((item) => item.floorId === floor.id).forEach((item) => items.push({ id: item.id, name: item.name, code: item.code, floorId: floor.id, roomId: item.roomId || undefined, roomName: roomNames.get(item.roomId), type: item.moduleType ?? item.type, typeLabel: item.moduleType?.includes("Cabinet") || /柜/.test(item.name) ? "柜体" : "家具", dimensions: `${item.dimensions.width}×${item.dimensions.depth}×${item.dimensions.height} cm`, locked: item.locked, hidden: item.hidden || item.visible === false, conflict: verificationConflictIds.has(item.id), verificationStatus: item.verificationMeta?.status ?? "unverified" }));
      drawingItems.filter((item) => item.floorId === floor.id).forEach((item) => items.push({ id: item.id, name: item.label, floorId: floor.id, roomId: item.roomId ?? undefined, roomName: item.roomId ? roomNames.get(item.roomId) : undefined, type: item.category, typeLabel: drawingItemCategoryLabels[item.category], dimensions: item.heightMm ? `安装高 ${item.heightMm} mm` : undefined, conflict: verificationConflictIds.has(item.id), verificationStatus: item.verificationMeta?.status ?? (item.status === "confirmed" ? "confirmed" : "unverified") }));
    });
    return items;
  }, [drawingItems, floors, furniture, houseStructuresByFloor, verificationConflictIds]);
  const workspaceObjectItems = useMemo(() => {
    const structureTypes = new Set(["wall", "partition", "room", "door", "window", "bayWindow", "skylight", "stair", "column", "fence", "outdoor", "outdoorSurface"]);
    const drawingTypes = new Set(Object.keys(drawingItemCategoryLabels));
    if (activeDrawingWorkspace.id === "overview") return unifiedObjectItems;
    if (activeDrawingWorkspace.id === "space" || activeDrawingWorkspace.id === "renovation") return unifiedObjectItems.filter((item) => structureTypes.has(item.type));
    if (activeDrawingWorkspace.id === "furniture") return unifiedObjectItems.filter((item) => item.type === "room" || (!structureTypes.has(item.type) && !drawingTypes.has(item.type)));
    const tabCategories: Partial<Record<WorkspaceTabId, DrawingItem["category"][]>> = {
      socket: ["socket", "network"], switch: ["switch"], lighting: ["light"], water: ["waterSupply"], drainage: ["drainage"],
      ceiling: ["ceiling", "ventilation"], floor: ["floorFinish"], wall: ["wallFinish"], material: ["cabinet", "annotation"]
    };
    const categories = new Set(tabCategories[activeDrawingWorkspace.activeTabId as WorkspaceTabId] ?? []);
    return unifiedObjectItems.filter((item) => item.type === "room" || item.type === "wall" || item.type === "door" || categories.has(item.type as DrawingItem["category"]));
  }, [activeDrawingWorkspace.activeTabId, activeDrawingWorkspace.id, unifiedObjectItems]);
  const verificationEntries = useMemo(() => getVerificationTargetEntries(houseStructuresByFloor), [houseStructuresByFloor]);
  const filteredVerificationEntries = useMemo(() => verificationEntries.filter((entry) => {
    const displayState = getVerificationDisplayState(entry.object.verificationMeta, verificationConflictIds.has(entry.object.id));
    if (verificationFilter === "all") return true;
    if (verificationFilter === "unconfirmed") return displayState !== "confirmed";
    return displayState === verificationFilter;
  }), [verificationConflictIds, verificationEntries, verificationFilter]);
  const floorHistory = historyByFloor[selectedFloorId] ?? { past: [], future: [] };
  const activeStructureObject = useMemo(() => (
    floorHouseStructure.walls.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.partitions.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.stairs.find((item) => item.id === activeObjectId) ??
    (floorHouseStructure.columns ?? []).find((item) => item.id === activeObjectId) ??
    floorHouseStructure.fences.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.outdoorSurfaces.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.rooms.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.doors.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.windows.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.bayWindows.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.skylights.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.outdoors.find((item) => item.id === activeObjectId) ??
    null
  ), [activeObjectId, floorHouseStructure]);
  const activeVerificationTarget = useMemo(() => (
    activeStructureObject ? findVerificationTarget(floorHouseStructure, activeStructureObject.id) : null
  ), [activeStructureObject, floorHouseStructure]);
  const activeFurniture = floorFurniture.find((item) => item.id === activeObjectId) ?? null;
  const activeDrawingItem = floorDrawingItems.find((item) => item.id === activeObjectId) ?? null;
  const activeCredibility = useMemo(() => {
    const verificationMeta = activeVerificationTarget?.object.verificationMeta ?? activeFurniture?.verificationMeta ?? activeDrawingItem?.verificationMeta;
    const status = verificationMeta?.status ?? (activeDrawingItem?.status === "confirmed" ? "confirmed" : "unverified");
    const labels = {
      confirmed: "已核实",
      "site-measured": "现场实测",
      "drawing-derived": "来自开发商图纸",
      estimated: "现场估算",
      unverified: "待确认"
    } as const;
    const sourceLabels = { "developer-plan": "开发商图纸", "visual-estimate": "视觉估算", "manual-input": "人工录入", "site-measurement": "现场测量", other: "其他来源" } as const;
    return { label: labels[status], source: verificationMeta ? `${sourceLabels[verificationMeta.source]}${verificationMeta.sourceNote ? ` · ${verificationMeta.sourceNote}` : ""}` : "尚未登记数据来源", status };
  }, [activeDrawingItem, activeFurniture, activeVerificationTarget]);
  const modernNaturalScope: ModernNaturalScope = modernNaturalScopeType === "house"
    ? { type: "house" }
    : modernNaturalScopeType === "room" && activeFurniture
      ? { type: "room", roomId: activeFurniture.roomId }
      : { type: "floor", floorId: selectedFloorId };
  const modernNaturalPreview = previewModernNaturalApplication(furniture, modernNaturalScope);
  const activeFurnitureDrawingItems = activeFurniture ? floorDrawingItems.filter((item) => item.relatedFurnitureId === activeFurniture.id) : [];
  const floorFurniturePlacementWarnings = useMemo(
    () => validateFurniturePlacement(floorHouseStructure, floorFurniture, floorDrawingItems, { workspaceId: activeDrawingWorkspace.id }),
    [activeDrawingWorkspace.id, floorDrawingItems, floorFurniture, floorHouseStructure]
  );
  const sceneHeightValidationFindings = useMemo(
    () => validateSceneHeightSystem(floorHouseStructure, furniture),
    [floorHouseStructure, furniture]
  );
  useEffect(() => {
    setFurniture((current) => {
      const synchronized = synchronizeFurnitureHeights(current, houseStructuresByFloor);
      return synchronized.some((item, index) => item !== current[index]) ? synchronized : current;
    });
  }, [houseStructuresByFloor]);
  const baseValidationFindings = useMemo(() => {
    const findings: ValidationFinding[] = [];
    const showStructureRules = activeDrawingWorkspace.id === "space" || activeDrawingWorkspace.id === "renovation";
    if (showStructureRules) {
      houseValidation.errors.forEach((issue) => findings.push({ ruleId: issue.ruleId ?? "STRUCTURE_GEOMETRY", severity: issue.severity ?? "error", category: issue.category ?? "geometry", title: `${issue.type} 检查`, message: issue.message, floorId: selectedFloorId, objectId: issue.id, suggestion: issue.suggestion, canAutoFix: issue.canAutoFix, rootCauseKey: issue.rootCauseKey }));
      houseValidation.warnings.forEach((issue) => findings.push({ ruleId: issue.ruleId ?? "STRUCTURE_GEOMETRY", severity: issue.severity ?? "warning", category: issue.category ?? "geometry", title: `${issue.type} 检查`, message: issue.message, floorId: selectedFloorId, objectId: issue.id, suggestion: issue.suggestion, canAutoFix: issue.canAutoFix, rootCauseKey: issue.rootCauseKey }));
    }
    houseValidation.infos.forEach((issue) => {
      const relevant = issue.type === "door"
        ? activeDrawingWorkspace.id === "space" || activeDrawingWorkspace.id === "renovation"
        : activeDrawingWorkspace.id === "furniture" || activeDrawingWorkspace.id === "mep";
      if (!relevant) return;
      findings.push({ ruleId: issue.ruleId ?? "MISSING_OBJECT_METADATA", severity: "info", category: "metadata", title: "对象资料不完整", message: issue.message, floorId: selectedFloorId, objectId: issue.id, suggestion: issue.suggestion, canAutoFix: issue.canAutoFix, rootCauseKey: issue.rootCauseKey });
    });
    referenceReport.errors.forEach((issue) => {
      const optionalExperienceRelation = issue.code === "INVALID_TOUR_LIGHTING_SCENE";
      findings.push({ ruleId: optionalExperienceRelation ? "ROOM_RELATION" : "DATA_REFERENCE_BROKEN", severity: optionalExperienceRelation ? "warning" : "blocking", category: optionalExperienceRelation ? "relation" : "blocking", title: optionalExperienceRelation ? "体验场景关系需要确认" : "必要引用失效", message: `${issue.path}：${issue.message}`, objectId: issue.objectId, suggestion: issue.suggestion, rootCauseKey: optionalExperienceRelation ? `REFERENCE:${issue.code}` : `REFERENCE:${issue.objectId}` });
    });
    referenceReport.warnings.forEach((issue) => findings.push({ ruleId: "ROOM_RELATION", severity: "warning", category: "relation", title: "引用关系需要确认", message: `${issue.path}：${issue.message}`, objectId: issue.objectId, suggestion: issue.suggestion, rootCauseKey: `REFERENCE:${issue.objectId}` }));
    if (activeDrawingWorkspace.id === "space") stairValidationIssues.filter((issue) => issue.floorId === selectedFloorId).forEach((issue) => findings.push({ ruleId: issue.code, severity: issue.severity, category: "geometry", title: "楼梯系统检查", message: issue.message, floorId: issue.floorId, objectId: issue.objectId, rootCauseKey: `STAIR:${issue.objectId}:${issue.code}` }));
    floorFurniturePlacementWarnings.forEach((issue) => findings.push({ ruleId: issue.ruleId ?? issue.code, severity: issue.severity ?? "warning", category: issue.category ?? "geometry", title: issue.code === "PASSAGE_TOO_NARROW" ? "操作净空不足" : issue.category === "metadata" ? "对象资料不完整" : "家具布置检查", message: issue.message, floorId: selectedFloorId, roomId: floorFurniture.find((item) => item.id === issue.furnitureId)?.roomId, objectId: issue.furnitureId, objectName: floorFurniture.find((item) => item.id === issue.furnitureId)?.name, relatedObjectIds: issue.relatedObjectId ? [issue.relatedObjectId] : [], actualValue: issue.actualValue, requiredValue: issue.requiredValue, checkPosition: issue.checkPosition, suggestion: issue.suggestion, canAutoFix: issue.canAutoFix, rootCauseKey: issue.rootCauseKey }));
    findings.push(...sceneHeightValidationFindings);
    return groupValidationFindings(findings);
  }, [activeDrawingWorkspace.id, floorFurniture, floorFurniturePlacementWarnings, houseValidation, referenceReport, sceneHeightValidationFindings, selectedFloorId, stairValidationIssues]);
  const activeFurniturePlacementWarnings = activeFurniture
    ? floorFurniturePlacementWarnings.filter((warning) => warning.furnitureId === activeFurniture.id)
    : [];
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const yardObjectIds = selectedFloorId === "1F"
      ? [
          ...oneFloorHouseStructure.outdoors.map((item) => item.id),
          ...oneFloorHouseStructure.outdoorSurfaces.map((item) => item.id),
          ...oneFloorHouseStructure.fences.map((item) => item.id),
          ...furniture.filter((item) => item.floorId === "YARD").map((item) => item.id)
        ]
      : [];
    const report = createSyncSelfCheckReport({
      structure: floorHouseStructure,
      furniture: [...floorFurniture, ...(selectedFloorId === "1F" ? furniture.filter((item) => item.floorId === "YARD") : [])],
      selectedFurnitureId: activeFurniture?.id ?? "",
      selectedStructureId: activeStructureObject?.id ?? "",
      selectedSemanticObjectId,
      yardObjectIds
    });
    console.info(`[2D/3D sync self-check] ${selectedFloorId}`, report);
    report.orphanHosts.forEach((warning) => console.warn(`[2D/3D sync] ${warning.openingId}: ${warning.message}`));
  }, [activeFurniture?.id, activeStructureObject?.id, floorFurniture, floorHouseStructure, furniture, oneFloorHouseStructure, selectedFloorId, selectedSemanticObjectId]);
  const wardrobeDesignFurniture = floorFurniture.find((item) => item.id === wardrobeDesignFurnitureId) ?? null;
  const wardrobeDesign = normalizeWardrobeDesign(wardrobeDesignFurniture?.wardrobeDesign);
  const wardrobeColumnWidths = wardrobeDesign.columnWidths ?? normalizeWardrobeColumnWidths(undefined, wardrobeDesign.columns);
  const wardrobeColumnMetrics = getWardrobeColumnMetrics(wardrobeColumnWidths);
  const activeRoomObject = activeStructureObject && "spaceType" in activeStructureObject && activeStructureObject.spaceType === "Room"
    ? activeStructureObject
    : null;
  const activeWallObject = isHouseWallObject(activeStructureObject) ? activeStructureObject : null;
  const floorStructureRooms = useMemo(
    () => [...floorHouseStructure.rooms].sort((left, right) => left.roomNumber.localeCompare(right.roomNumber, "zh-CN", { numeric: true })),
    [floorHouseStructure.rooms]
  );
  const moduleCatalogGroups = useMemo(() => moduleCategoryOrder.map((category) => ({
    category,
    items: interiorModuleCatalog.filter((item) => item.category === category)
  })), []);
  const visibleModuleCatalogGroups = moduleCatalogGroups;
  const floorFurnitureByCategory = useMemo(() => (
    moduleCategoryOrder.reduce((countsByCategory, category) => {
      countsByCategory[category] = floorFurniture.filter((item) => item.moduleCategory === category).length;
      return countsByCategory;
    }, {} as Record<InteriorModuleCategory, number>)
  ), [floorFurniture]);
  const moduleTargetRoom = activeRoomObject ?? (activeFurniture ? floorStructureRooms.find((room) => room.id === activeFurniture.roomId) ?? null : null);
  const moduleTargetLabel = moduleTargetRoom ? `${moduleTargetRoom.roomNumber} · ${moduleTargetRoom.name}` : "画布中心";
  const activeFurnitureArea = activeFurniture ? (activeFurniture.dimensions.width * activeFurniture.dimensions.depth / 10_000).toFixed(2) : "0.00";
  const activeObjectSummary = activeRoomObject
    ? `${activeRoomObject.roomNumber} · ${activeRoomObject.name}`
    : activeDrawingItem
      ? `${drawingItemCategoryLabels[activeDrawingItem.category]} · ${activeDrawingItem.label}`
    : activeFurniture
      ? developerMode ? `${activeFurniture.code} · ${activeFurniture.name}` : activeFurniture.name
      : activeStructureObject
        ? activeStructureObject.name
        : activeObjectId || "未选择对象";
  const designPageData = useMemo(() => {
    if (!designPageRequest) return null;
    if (designPageRequest.kind === "furniture") {
      const targetFurniture = furniture.find((item) => item.id === designPageRequest.id);
      return targetFurniture ? getFurnitureDesignPageData(targetFurniture) : null;
    }
    const targetStair = Object.values(houseStructuresByFloor)
      .flatMap((structure) => structure.stairs)
      .find((stair) => stair.id === designPageRequest.id);
    return targetStair ? getStairDesignPageData(targetStair) : null;
  }, [designPageRequest, furniture, houseStructuresByFloor]);

  function applyWorkspaceToEditor(parsed: PersistedWebWorkspace) {
    const migration = applyWorkspaceMigrations(parsed, { canonicalWorkspace: data.workspace });
    const migratedWorkspace = migration.workspace;
    reportWorkspaceDataSources(migration.sources, "workspace loaded into editor");
    const nextFloors = migratedWorkspace.floors.map((floor) => ({
      ...floor,
      floorPlanImage: floor.floorPlanImage && WORKSPACE_ASSET_BASE_PATH && !floor.floorPlanImage.startsWith(WORKSPACE_ASSET_BASE_PATH)
        ? `${WORKSPACE_ASSET_BASE_PATH}${floor.floorPlanImage}`
        : floor.floorPlanImage
    }));
    const loadedStructures = nextFloors.reduce((structuresByFloor, floor) => {
      structuresByFloor[floor.id] = normalizeHouseStructure(floor.id, migratedWorkspace.houseStructuresByFloor[floor.id]);
      return structuresByFloor;
    }, {} as Record<FloorId, HouseStructure>);
    const nextStructures = loadedStructures;
    const nextSelectedFloorId = migratedWorkspace.selectedFloorId && nextFloors.some((floor) => floor.id === migratedWorkspace.selectedFloorId)
      ? migratedWorkspace.selectedFloorId
      : initialSelectedFloorId;
    const nextFurniture = enrichMissingFurnitureMetadata(migratedWorkspace.furniture);
    const nextDrawingItems = migratedWorkspace.drawingItems;
    const nextSemanticObjects = migratedWorkspace.semanticObjects;

    const loadedWorkspace = getDefaultDrawingWorkspace(migratedWorkspace.selectedDrawingSheetType);
    const loadedWorkspaceTabId = getDefaultWorkspaceTab(migratedWorkspace.selectedDrawingSheetType);
    const resolvedLoadedWorkspace = resolveDrawingWorkspace(loadedWorkspace.id, loadedWorkspaceTabId);
    setSelectedFloorId(nextSelectedFloorId);
    setSelectedDrawingSheetType(resolvedLoadedWorkspace.persistedSheet);
    setSharedPlanCanvasMode(resolvedLoadedWorkspace.mode);
    setActiveDrawingWorkspaceId(loadedWorkspace.id);
    setActiveWorkspaceTabId(loadedWorkspaceTabId);
    setShared3DSceneSettings(createDefaultShared3DSceneSettings(resolvedLoadedWorkspace.persistedSheet));
    setActiveWorkspaceToolId("select");
    setFloors(nextFloors);
    setFurniture(nextFurniture);
    setDrawingItems(nextDrawingItems);
    setDrawingPackage(migratedWorkspace.drawingPackage);
    setSemanticObjects(nextSemanticObjects);
    setVisualSettingsByFloor(migratedWorkspace.visualSettingsByFloor);
    setCleanPatchesByFloor(migratedWorkspace.cleanPatchesByFloor);
    setWallSyncOverrides(migratedWorkspace.wallSyncOverrides);
    setCameraViews(migratedWorkspace.cameraViews);
    setRoomTourViews(migratedWorkspace.roomTourViews);
    setLightingDesign(migratedWorkspace.lightingDesign ?? fallbackLightingDesign);
    setStairSystems(migratedWorkspace.stairSystems);
    setStairLandings(migratedWorkspace.stairLandings);
    setStairOpenings(migratedWorkspace.stairOpenings);
    setHouseStructuresByFloor(nextStructures);
    committedModelRef.current = Object.fromEntries(nextFloors.map((floor) => [
      floor.id,
      {
        structure: nextStructures[floor.id],
        furniture: nextFurniture.filter((item) => item.floorId === floor.id),
        drawingItems: nextDrawingItems.filter((item) => item.floorId === floor.id)
      }
    ])) as Partial<Record<FloorId, ModelSnapshot>>;
    setSelectedFurnitureId(nextFurniture.find((item) => item.floorId === nextSelectedFloorId)?.id ?? "");
    setSelectedSemanticObjectId(nextSemanticObjects.find((object) => object.floorId === nextSelectedFloorId)?.id ?? "");
  }

  useEffect(() => {
    if (!IS_DEVELOPMENT || !canUseExternalSync) {
      setLocalCodeAutoSync(false);
      setLocalCodeServerOnline(false);
      setLocalCodeFileHandle(null);
      setLocalCodeFileName("");
      setLocalCodeFileStatus("unsupported");
      return;
    }
    let cancelled = false;
    async function restoreLocalCodeFile() {
      const savedAutoSyncSetting = window.localStorage.getItem(LOCAL_CODE_AUTO_SYNC_KEY);
      const savedAutoSync = savedAutoSyncSetting === null ? true : savedAutoSyncSetting === "true";
      if (!supportsLocalCodeFileAccess()) {
        const serverReady = await checkLocalCodeSyncServer(savedAutoSync);
        if (!serverReady && !cancelled) setLocalCodeFileStatus("unsupported");
        return;
      }
      try {
        const handle = await readLocalCodeFileHandle();
        if (cancelled) return;
        if (!handle) {
          const serverReady = await checkLocalCodeSyncServer(savedAutoSync);
          if (!serverReady && !cancelled) setLocalCodeFileStatus("unbound");
          return;
        }
        setLocalCodeFileHandle(handle);
        setLocalCodeFileName(handle.name);
        setLocalCodeFileStatus("bound");
        setLocalCodeAutoSync(savedAutoSync);
      } catch {
        const serverReady = await checkLocalCodeSyncServer(savedAutoSync);
        if (!serverReady && !cancelled) setLocalCodeFileStatus("unbound");
      }
    }
    restoreLocalCodeFile();
    return () => {
      cancelled = true;
    };
  }, [canUseExternalSync]);

  useEffect(() => {
    if (!IS_DEVELOPMENT || !canUseExternalSync) return;
    if (localCodeFileHandle || localCodeServerOnline) return;
    let cancelled = false;
    let retryTimer: number | undefined;
    async function reconnectLocalCodeSyncServer() {
      const serverReady = await checkLocalCodeSyncServer(true);
      if (cancelled || serverReady) return;
      retryTimer = window.setTimeout(reconnectLocalCodeSyncServer, 2500);
    }
    retryTimer = window.setTimeout(reconnectLocalCodeSyncServer, 1200);
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [canUseExternalSync, localCodeFileHandle, localCodeServerOnline]);

  useEffect(() => {
    let cancelled = false;
    async function restoreWorkspace() {
      try {
      if (!canUseBrowserDrafts || !canUseExternalSync) {
        const codeHash = await getWorkspaceHash(data.workspace);
        if (cancelled) return;
        applyWorkspaceToEditor(data.workspace);
        setWorkspaceSource("code");
        setCurrentWorkspaceHash(codeHash);
        setDraftSaveState({ status: "idle" });
        setCodeSaveState({
          status: "verified",
          target: "none",
          lastVerifiedAt: data.workspace.updatedAt ?? data.workspace.savedAt,
          filePath: GITHUB_SOLIDIFY_PATH,
          hash: codeHash
        });
        setWorkspaceConflict(null);
        setHasLoadedWebWorkspace(true);
        return;
      }
      const workspaceCandidates = [...WEB_WORKSPACE_STORAGE_KEYS, WEB_WORKSPACE_DRAFT_KEY]
        .map((storageKey) => {
          const savedWorkspace = window.localStorage.getItem(storageKey);
          if (!savedWorkspace) return null;
          try {
            return JSON.parse(savedWorkspace) as Partial<PersistedWebWorkspace>;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Partial<PersistedWebWorkspace>[];
      const parsed = pickBestWorkspace(workspaceCandidates);
      let codeWorkspace = data.workspace;
      try {
        const liveCodeWorkspace = await readWorkspaceFromLocalService();
        codeWorkspace = {
          ...liveCodeWorkspace.workspace,
          updatedAt: liveCodeWorkspace.updatedAt ?? liveCodeWorkspace.workspace.updatedAt
        };
      } catch {
        // Static deployments cannot read a local file service; the imported code workspace remains authoritative.
      }
      const codeHash = await getWorkspaceHash(codeWorkspace);
      if (cancelled) return;
      applyWorkspaceToEditor(codeWorkspace);
      setWorkspaceSource("code");
      setCodeSaveState({
        status: "verified",
        target: "none",
        lastVerifiedAt: codeWorkspace.savedAt,
        filePath: GITHUB_SOLIDIFY_PATH,
        hash: codeHash
      });
      setCurrentWorkspaceHash(codeHash);

      if (parsed) {
        const draft = parsed as PersistedWebWorkspace;
        const draftHash = await getWorkspaceHash(draft);
        if (cancelled) return;
        setDraftSaveState({ status: "saved", lastSavedAt: draft.savedAt, hash: draftHash });
        const draftTimestamp = getKnownWorkspaceTimestamp(draft);
        const codeTimestamp = getKnownWorkspaceTimestamp(codeWorkspace);
        if (draftHash !== codeHash && (draftTimestamp === null || codeTimestamp === null || draftTimestamp > codeTimestamp)) {
          setWorkspaceConflict({
            draft,
            code: codeWorkspace,
            reason: draftTimestamp === null || codeTimestamp === null ? "unknown-order" : "draft-newer",
            draftSavedAt: draft.savedAt,
            codeSavedAt: codeWorkspace.updatedAt ?? codeWorkspace.savedAt
          });
        }
      }
      setHasLoadedWebWorkspace(true);
      } catch (error) {
        if (cancelled) return;
        setHasLoadedWebWorkspace(true);
        setDraftSaveState({ status: "error", error: error instanceof Error ? error.message : "浏览器草稿读取失败。" });
      }
    }
    void restoreWorkspace();
    return () => {
      cancelled = true;
    };
  }, [canUseBrowserDrafts, canUseExternalSync, data.workspace]);

  useEffect(() => {
    if (!canUseBrowserDrafts || !hasLoadedWebWorkspace || workspaceConflict) return;
    latestWorkspaceRef.current = getCurrentWorkspace("draft");
    setDefaultWorkspacePayload(JSON.stringify(getCurrentWorkspace("manual"), null, 2));
    setDraftSaveState((current) => ({ ...current, status: "saving", error: undefined }));
    const draftTimer = window.setTimeout(() => {
      if (latestWorkspaceRef.current) {
        void persistWorkspace(latestWorkspaceRef.current, "draft").catch(() => undefined);
      }
    }, 700);
    return () => window.clearTimeout(draftTimer);
  }, [
    hasLoadedWebWorkspace,
    floors,
    selectedFloorId,
    selectedDrawingSheetType,
    furniture,
    drawingItems,
    drawingPackage,
    semanticObjects,
    visualSettingsByFloor,
    cleanPatchesByFloor,
    houseStructuresByFloor,
    stairSystems,
    stairLandings,
    stairOpenings,
    wallSyncOverrides,
    cameraViews,
    roomTourViews,
    lightingDesign,
    workspaceConflict,
    canUseBrowserDrafts
  ]);

  useEffect(() => {
    if (!canWriteCode || !canUseExternalSync || !hasLoadedWebWorkspace || workspaceConflict || !localCodeAutoSync || (!localCodeFileHandle && !localCodeServerOnline)) return;
    if (focusMode || furnitureImmersiveMode) return;
    const codeSyncTimer = window.setTimeout(() => {
      const payload = getDefaultWorkspacePayload("manual");
      setDefaultWorkspacePayload(payload);
      void writeDefaultWorkspaceToLocalCodeFile(payload, true);
    }, 1200);
    return () => window.clearTimeout(codeSyncTimer);
  }, [
    hasLoadedWebWorkspace,
    localCodeAutoSync,
    localCodeFileHandle,
    localCodeServerOnline,
    focusMode,
    furnitureImmersiveMode,
    floors,
    selectedFloorId,
    selectedDrawingSheetType,
    furniture,
    drawingItems,
    drawingPackage,
    semanticObjects,
    visualSettingsByFloor,
    cleanPatchesByFloor,
    houseStructuresByFloor,
    stairSystems,
    stairLandings,
    stairOpenings,
    wallSyncOverrides,
    cameraViews,
    roomTourViews,
    lightingDesign,
    workspaceConflict,
    canWriteCode,
    canUseExternalSync
  ]);

  useEffect(() => {
    function saveDraftBeforeUnload() {
      if (!canUseBrowserDrafts || !latestWorkspaceRef.current) return;
      void persistWorkspace(latestWorkspaceRef.current, "draft").catch(() => undefined);
    }
    window.addEventListener("beforeunload", saveDraftBeforeUnload);
    return () => window.removeEventListener("beforeunload", saveDraftBeforeUnload);
  }, [canUseBrowserDrafts]);

  useEffect(() => {
    if (!hasLoadedWebWorkspace || workspaceConflict) return;
    workspaceChangeVersionRef.current += 1;
    const requestId = workspaceHashRequestRef.current + 1;
    workspaceHashRequestRef.current = requestId;
    const workspace = getCurrentWorkspace("manual");
    void getWorkspaceHash(workspace).then((hash) => {
      if (workspaceHashRequestRef.current === requestId) setCurrentWorkspaceHash(hash);
    }).catch((error) => {
      if (workspaceHashRequestRef.current !== requestId) return;
      setCodeSaveState((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "当前方案 hash 计算失败。" }));
    });
  }, [
    hasLoadedWebWorkspace,
    floors,
    selectedFloorId,
    selectedDrawingSheetType,
    furniture,
    drawingItems,
    drawingPackage,
    semanticObjects,
    visualSettingsByFloor,
    cleanPatchesByFloor,
    houseStructuresByFloor,
    stairSystems,
    stairLandings,
    stairOpenings,
    wallSyncOverrides,
    cameraViews,
    roomTourViews,
    lightingDesign,
    workspaceConflict
  ]);

  useEffect(() => {
    if (!currentWorkspaceHash) return;
    setCodeSaveState((current) => {
      const matchesVerifiedHash = Boolean(current.hash) && current.hash === currentWorkspaceHash;
      if (!matchesVerifiedHash) {
        if (["saving", "saved_unverified", "error", "exported_only"].includes(current.status)) return current;
        return current.status === "dirty" ? current : { ...current, status: "dirty", error: undefined };
      }
      if (current.status === "dirty" && current.lastVerifiedAt) return { ...current, status: "verified", error: undefined };
      return current;
    });
  }, [currentWorkspaceHash, codeSaveState.hash]);

  useEffect(() => {
    const floorId = selectedFloorId;
    const current: ModelSnapshot = { structure: floorHouseStructure, furniture: floorFurniture, drawingItems: floorDrawingItems };
    if (suppressHistoryRef.current) {
      suppressHistoryRef.current = false;
      committedModelRef.current[floorId] = current;
      return;
    }

    const committed = committedModelRef.current[floorId];
    if (!committed || JSON.stringify(committed) === JSON.stringify(current)) return;
    pendingHistoryBaseRef.current[floorId] ??= committed;
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      const base = pendingHistoryBaseRef.current[floorId];
      if (!base) return;
      setHistoryByFloor((currentHistory) => {
        const history = currentHistory[floorId] ?? { past: [], future: [] };
        return {
          ...currentHistory,
          [floorId]: {
            past: [...history.past.slice(-39), base],
            future: []
          }
        };
      });
      committedModelRef.current[floorId] = current;
      delete pendingHistoryBaseRef.current[floorId];
    }, 320);

    return () => {
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    };
  }, [selectedFloorId, floorHouseStructure, floorFurniture, floorDrawingItems]);

  function handleFloorChange(floorId: FloorId) {
    setSelectedFloorId(floorId);
    const firstFurniture = furniture.find((item) => item.floorId === floorId);
    const firstSemanticObject = semanticObjects.find((object) => object.floorId === floorId);
    setSelectedFurnitureId(firstFurniture?.id ?? "");
    setSelectedSemanticObjectId(firstFurniture ? "" : firstSemanticObject?.id ?? "");
    setDrawTool("select");
    setActiveObjectId("");
    setLocateObjectRequest(null);
    setMobileSheetTarget(null);
    setMobileMoreOpen(false);
  }

  function enterExplorationMode() {
    explorationReturnStateRef.current = { viewMode, plannerMode };
    setDrawTool("select");
    setPlannerMode("view");
    setActiveObjectId("");
    setSelectedFurnitureId("");
    setSelectedSemanticObjectId("");
    setLocateObjectRequest(null);
    setFocusMode(false);
    setFurnitureImmersiveMode(false);
    setActiveEditorPanel(null);
    setDrawingDirectoryOpen(false);
    setMoreMenuOpen(false);
    setEditorDialog(null);
    setMobileMoreOpen(false);
    setMobileSheetTarget(null);
    setEditorMode("exploration");
  }

  function exitExplorationMode() {
    const returnState = explorationReturnStateRef.current;
    setEditorMode("design");
    setViewMode(returnState?.viewMode ?? "3d");
    setPlannerMode(returnState?.plannerMode ?? "view");
    setDrawTool("select");
    explorationReturnStateRef.current = null;
  }

  function handleSelectFixedCameraView(view: FixedCameraView) {
    const opensUnifiedSiteOverview = view.scope === "courtyard"
      || view.floor === "YARD"
      || view.id === "view-1f-yard-overview"
      || view.name.includes("南北院总览");
    setFixedCameraViewRequest({ view, nonce: Date.now() });
    setFocusMode(false);
    setFurnitureImmersiveMode(false);
    setSelectedFurnitureId("");
    setSelectedSemanticObjectId("");
    setPlannerMode("view");
    setDrawTool("select");
    setActiveObjectId("");
    setLocateObjectRequest(null);
    setMobileSheetTarget(null);
    if (opensUnifiedSiteOverview) {
      setActiveDrawingWorkspaceId("overview");
      setActiveWorkspaceTabId(null);
      setActiveWorkspaceToolId("select");
      setSharedPlanCanvasMode("sitePlan");
      setSelectedDrawingSheetType("sitePlan");
    }
    setSelectedFloorId(view.floor);
    setViewMode("3d");
  }

  function findCatalogItemByNaturalText(command: string) {
    const normalized = command.toLowerCase();
    return interiorModuleCatalog.find((item) => (
      normalized.includes(item.name.toLowerCase()) ||
      normalized.includes(item.moduleType.toLowerCase()) ||
      normalized.includes(item.furnitureType.toLowerCase()) ||
      normalized.includes(item.codePrefix.toLowerCase())
    )) ?? interiorModuleCatalog.find((item) => {
      const aliases: Record<string, string[]> = {
        sofa: ["沙发"],
        fireplace: ["壁炉", "火炉", "电子壁炉"],
        table: ["餐桌", "桌"],
        bed: ["床"],
        nightstand: ["床头柜", "床边柜"],
        island: ["中岛", "岛台"],
        cooktop: ["灶", "灶台"],
        sink: ["水槽", "洗菜盆"],
        fridge: ["冰箱"],
        kitchenCabinet: ["橱柜", "厨房柜", "一字型橱柜"],
        snackCabinet: ["零食柜", "零食", "囤货柜"],
        pegboard: ["洞洞板", "挂板", "工具墙"],
        bookshelf: ["书架", "书柜"],
        wardrobe: ["衣柜"],
        entryCabinet: ["玄关柜", "鞋柜"],
        sideboard: ["餐边柜"],
        plant: ["绿植", "植物"],
        toilet: ["马桶"],
        bathtub: ["浴缸"],
        shower: ["淋浴"],
        vanity: ["台盆", "浴室柜"]
      };
      return aliases[item.moduleType]?.some((alias) => command.includes(alias));
    }) ?? null;
  }

  function handleNaturalCommand(command: string) {
    const catalogItem = findCatalogItemByNaturalText(command);
    if (!catalogItem) {
      setValidatorRepairLog([`没有识别到家具类型：${command}。可以试试“添加一个沙发”或“删除餐桌”。`]);
      return;
    }

    const isDelete = /删除|删掉|移除|去掉|不要/.test(command);
    if (isDelete) {
      const target = [...floorFurniture].reverse().find((item) => item.catalogId === catalogItem.id || item.type === catalogItem.furnitureType || item.name.includes(catalogItem.name));
      if (!target) {
        setValidatorRepairLog([`当前楼层没有找到可删除的${catalogItem.name}。`]);
        return;
      }
      handleFloorFurnitureChange(floorFurniture.filter((item) => item.id !== target.id));
      setSelectedFurnitureId("");
      setActiveObjectId("");
      setValidatorRepairLog([`已删除 ${target.code} · ${target.name}。`]);
      return;
    }

    addModuleFromCatalog(catalogItem);
    setValidatorRepairLog([`已添加 ${catalogItem.name}。可以在“家具定位图”里拖动位置，右侧“当前对象”里改尺寸材质。`]);
  }

  function getCurrentWorkspace(saveMode: PersistedWebWorkspace["saveMode"] = "manual"): PersistedWebWorkspace {
    return {
      schemaVersion: WEB_WORKSPACE_SCHEMA_VERSION,
      dataRevision: CURRENT_WORKSPACE_DATA_REVISION,
      defaultWorkspaceRevision: DEFAULT_WORKSPACE_REVISION,
      savedAt: new Date().toISOString(),
      saveMode,
      selectedFloorId,
      selectedDrawingSheetType,
      floors: floors.map((floor) => ({
        ...floor,
        floorPlanImage: floor.floorPlanImage && WORKSPACE_ASSET_BASE_PATH && floor.floorPlanImage.startsWith(WORKSPACE_ASSET_BASE_PATH)
          ? floor.floorPlanImage.slice(WORKSPACE_ASSET_BASE_PATH.length)
          : floor.floorPlanImage,
        visualSettings: visualSettingsByFloor[floor.id],
        cleanPatches: cleanPatchesByFloor[floor.id] ?? []
      })),
      furniture: enrichMissingFurnitureMetadata(furniture),
      drawingItems,
      drawingPackage: { ...drawingPackage, drawingItemIds: drawingItems.map((item) => item.id) },
      semanticObjects,
      visualSettingsByFloor,
      cleanPatchesByFloor,
      houseStructuresByFloor,
      stairSystems,
      stairLandings,
      stairOpenings,
      wallSyncOverrides,
      cameraViews,
      roomTourViews,
      lightingDesign
    };
  }

  function handleSharedPlanCanvasModeChange(nextMode: PlanCanvasMode) {
    setSharedPlanCanvasMode(nextMode);
    setActiveDrawingWorkspaceId(getDefaultDrawingWorkspace(nextMode).id);
    setActiveWorkspaceTabId(getDefaultWorkspaceTab(nextMode));
    setActiveWorkspaceToolId("select");
    const officialType = normalizeDrawingSheetType(nextMode);
    if (!officialType) return;
    setSelectedDrawingSheetType(officialType);
    if (["socketPlan", "switchPlan", "lightingPlan", "waterSupplyPlan", "drainagePlan", "ceilingPlan", "floorFinishPlan", "wallFinishPlan", "materialPlan", "annotationPlan"].includes(officialType)) {
      setMobileProfessionalSheetMode(officialType as MobileProfessionalSheetMode);
    }
  }

  function applyDrawingWorkspaceLayers(workspace: DrawingWorkspaceConfig) {
    const currentSettings = visualSettingsByFloor[selectedFloorId] ?? getDefaultVisualSettings();
    setVisualSettingsByFloor((currentSettingsByFloor) => ({
      ...currentSettingsByFloor,
      [selectedFloorId]: {
        ...currentSettings,
        layerVisibility: {
          ...currentSettings.layerVisibility,
          ...workspace.visibleLayers,
          semanticOverlay: developerMode ? Boolean(workspace.visibleLayers.semanticOverlay) : false,
          debug: developerMode ? Boolean(workspace.visibleLayers.debug) : false
        }
      }
    }));
  }

  function selectDrawingWorkspace(workspace: DrawingWorkspaceConfig) {
    const nextTabId = workspace.tabs?.[0]?.id ?? null;
    const resolvedWorkspace = resolveDrawingWorkspace(workspace.id, nextTabId);
    setActiveDrawingWorkspaceId(workspace.id);
    setActiveWorkspaceTabId(nextTabId);
    setSharedPlanCanvasMode(resolvedWorkspace.mode);
    setSelectedDrawingSheetType(resolvedWorkspace.persistedSheet);
    setActiveWorkspaceToolId(resolvedWorkspace.tools[0]?.id ?? "select");
    setDrawTool(resolvedWorkspace.tools[0]?.drawTool ?? "select");
    setPlannerMode("edit");
    setDrawingDirectoryOpen(false);
    setMoreMenuOpen(false);
    if (workspace.id === "overview") setShowFurnitureLabels(false);
    applyDrawingWorkspaceLayers(resolvedWorkspace);
    if (["socketPlan", "switchPlan", "lightingPlan", "waterSupplyPlan", "drainagePlan", "ceilingPlan", "floorFinishPlan", "wallFinishPlan", "materialPlan", "annotationPlan"].includes(resolvedWorkspace.persistedSheet)) {
      setMobileProfessionalSheetMode(resolvedWorkspace.persistedSheet as MobileProfessionalSheetMode);
    }
  }

  function selectWorkspaceTab(tabId: WorkspaceTabId, workspaceId = activeDrawingWorkspaceId) {
    const resolvedWorkspace = resolveDrawingWorkspace(workspaceId, tabId);
    setActiveDrawingWorkspaceId(workspaceId);
    setActiveWorkspaceTabId(tabId);
    setSharedPlanCanvasMode(resolvedWorkspace.mode);
    setSelectedDrawingSheetType(resolvedWorkspace.persistedSheet);
    setActiveWorkspaceToolId(resolvedWorkspace.tools[0]?.id ?? "select");
    setDrawTool(resolvedWorkspace.tools[0]?.drawTool ?? "select");
    setPlannerMode("edit");
    applyDrawingWorkspaceLayers(resolvedWorkspace);
    if (["socketPlan", "switchPlan", "lightingPlan", "waterSupplyPlan", "drainagePlan", "ceilingPlan", "floorFinishPlan", "wallFinishPlan", "materialPlan"].includes(resolvedWorkspace.persistedSheet)) {
      setMobileProfessionalSheetMode(resolvedWorkspace.persistedSheet as MobileProfessionalSheetMode);
    }
  }

  function activateWorkspaceView(view: WorkspaceViewDefinition) {
    if (view.id === "stairs") {
      const stair = floorHouseStructure.stairs[0];
      if (stair) openStairView(stair.id, view.name);
      else {
        setValidatorRepairLog(["当前楼层没有楼梯对象，无法打开楼梯视图。"]);
        setActiveEditorPanel("validation");
      }
    } else {
      if (view.id === "lighting-preview") selectWorkspaceTab("lighting");
      if (["section", "walkthrough", "lighting-preview"].includes(view.id)) setViewMode("3d");
      if (view.id === "walls") handleFloorPlanVisualSettingsChange({ ...floorPlanVisualSettings, layerVisibility: { ...floorPlanVisualSettings.layerVisibility, furnitureOverlay: false } });
      if (view.id === "furniture-only" || view.id === "cabinet-only") handleFloorPlanVisualSettingsChange({ ...floorPlanVisualSettings, layerVisibility: { ...floorPlanVisualSettings.layerVisibility, furnitureOverlay: true, semanticOverlay: false, debug: false } });
      setValidatorRepairLog([`${view.name}：${view.description} 这是模型显示视图，不会作为正式图纸进入图纸包。`]);
    }
    setEditorDialog(null);
  }

  function handleWorkspaceToolSelect(toolConfig: DrawingWorkspaceTool) {
    if (toolConfig.id === "directory") {
      setDrawingDirectoryOpen(true);
      return;
    }
    setActiveWorkspaceToolId(toolConfig.id);
    if (toolConfig.action === "stair-view") {
      const stair = activeStructureObject && "stepCount" in activeStructureObject ? activeStructureObject : floorHouseStructure.stairs[0];
      if (!stair) {
        setValidatorRepairLog(["当前楼层没有可进入的楼梯对象。请先创建楼梯或切换到包含楼梯的楼层。"]);
        setActiveEditorPanel("validation");
        return;
      }
      setActiveObjectId(stair.id);
      setViewMode("3d");
      setLocateObjectRequest({ id: stair.id, nonce: Date.now() });
      setValidatorRepairLog([`已进入 ${stair.name} 的楼梯视图；当前显示踏步、梯段、平台、洞口及上下楼层连接。`]);
      return;
    }
    if (toolConfig.drawTool) {
      setPlannerMode("edit");
      setDrawTool(toolConfig.drawTool);
      return;
    }
    if (toolConfig.drawingPreset) {
      setPlannerMode("edit");
      setDrawTool("select");
      setDrawingItemCreationRequest({ ...toolConfig.drawingPreset, nonce: Date.now() });
      setActiveEditorPanel("properties");
      return;
    }
    if (toolConfig.action === "resources") {
      setActiveEditorPanel("resources");
      return;
    }
    if (toolConfig.action === "validation") {
      setActiveEditorPanel("validation");
      return;
    }
    if (toolConfig.action === "ai") {
      setActiveEditorPanel("ai");
      return;
    }
    if (toolConfig.action === "rotate") {
      if (activeFurniture) handleRotateFurniture(activeFurniture.id);
      return;
    }
    if (toolConfig.action === "more") {
      setMoreMenuOpen(true);
    }
  }

  function toggleDeveloperMode() {
    const nextDeveloperMode = !developerMode;
    setDeveloperMode(nextDeveloperMode);
    try {
      window.localStorage.setItem("lyhp-editor-developer-mode", String(nextDeveloperMode));
    } catch {
      // Non-essential preference.
    }
    const currentSettings = visualSettingsByFloor[selectedFloorId] ?? getDefaultVisualSettings();
    setVisualSettingsByFloor((currentSettingsByFloor) => ({
      ...currentSettingsByFloor,
      [selectedFloorId]: {
        ...currentSettings,
        layerVisibility: {
          ...currentSettings.layerVisibility,
          semanticOverlay: nextDeveloperMode ? Boolean(activeDrawingWorkspace.visibleLayers.semanticOverlay) : false,
          debug: nextDeveloperMode ? Boolean(activeDrawingWorkspace.visibleLayers.debug) : false
        }
      }
    }));
  }

  function finalizeWorkspace(workspace: PersistedWebWorkspace, saveMode: "manual" | "draft") {
    return {
      ...workspace,
      schemaVersion: WEB_WORKSPACE_SCHEMA_VERSION,
      dataRevision: CURRENT_WORKSPACE_DATA_REVISION,
      defaultWorkspaceRevision: DEFAULT_WORKSPACE_REVISION,
      savedAt: new Date().toISOString(),
      saveMode
    };
  }

  async function persistWorkspace(workspace: PersistedWebWorkspace, saveMode: "manual" | "draft") {
    if (!canPersistDraft) throw new Error(`accessMode=${accessMode} 不允许保存浏览器草稿。`);
    const finalizedWorkspace = finalizeWorkspace(workspace, saveMode);
    const referenceReport = validateWorkspaceReferences(finalizedWorkspace);
    if (!referenceReport.valid) {
      throw new Error(`引用完整性校验失败：${referenceReport.errors[0].path} ${referenceReport.errors[0].message}`);
    }
    if (referenceReport.warnings.length > 0) {
      setValidatorRepairLog(referenceReport.warnings.map((issue) => `引用警告 · ${issue.objectId} · ${issue.path}: ${issue.message}`));
    }
    const payload = JSON.stringify(finalizedWorkspace);
    const storageKeys = saveMode === "manual"
      ? [...WEB_WORKSPACE_STORAGE_KEYS, WEB_WORKSPACE_DRAFT_KEY]
      : [WEB_WORKSPACE_DRAFT_KEY];
    setDraftSaveState((current) => ({ ...current, status: "saving", error: undefined }));
    try {
      storageKeys.forEach((storageKey) => window.localStorage.setItem(storageKey, payload));
      const hash = await getWorkspaceHash(finalizedWorkspace);
      setDraftSaveState({ status: "saved", lastSavedAt: finalizedWorkspace.savedAt, hash });
    } catch (error) {
      const message = error instanceof Error ? error.message : "本机浏览器草稿保存失败。";
      setDraftSaveState({ status: "error", error: message });
      setValidatorRepairLog([`${message} 请检查隐私模式或站点存储限制，并及时导出方案。`]);
      throw error;
    }
    return finalizedWorkspace;
  }

  function getDefaultWorkspacePayload(saveMode: "manual" | "draft" = "manual") {
    return JSON.stringify(finalizeWorkspace(getCurrentWorkspace(saveMode), saveMode), null, 2);
  }

  async function readWorkspaceFromLocalService() {
    if (!canUseExternalSync) throw new Error(`accessMode=${accessMode} 不允许访问本机写入服务。`);
    const response = await fetch(`${LOCAL_CODE_SYNC_ENDPOINT}?t=${Date.now()}`, { cache: "no-store" });
    const result = await response.json() as { ok?: boolean; error?: string; hash?: string; filePath?: string; path?: string; updatedAt?: string; workspace?: unknown };
    if (!response.ok || !result.ok || !validateWorkspacePayload(result.workspace)) {
      throw new Error(result.error || `本地代码文件回读失败：${response.status}`);
    }
    return {
      workspace: result.workspace as unknown as PersistedWebWorkspace,
      hash: result.hash,
      path: result.filePath ?? result.path,
      updatedAt: result.updatedAt
    };
  }

  async function writeDefaultWorkspaceToLocalCodeFile(
    payload: string,
    silent = false,
    handleOverride?: LocalCodeFileHandle,
    preferredTarget?: "local-service" | "file-handle"
  ) {
    if (!canWriteCode || !canUseExternalSync) throw new Error(`accessMode=${accessMode} 不允许写入代码文件。`);
    const useLocalService = preferredTarget === "local-service" || (preferredTarget !== "file-handle" && !handleOverride && localCodeServerOnline);
    const targetHandle = useLocalService ? null : handleOverride ?? localCodeFileHandle;
    const target: CodeSaveTarget = useLocalService ? "local-service" : targetHandle ? "file-handle" : "local-service";
    const attemptStartedAt = new Date().toISOString();
    const writeVersion = workspaceChangeVersionRef.current;
    let fileWasWritten = false;
    let filePath = targetHandle?.name ?? GITHUB_SOLIDIFY_PATH;
    let backupPath: string | undefined;
    let expectedHash = "";
    try {
      const expectedWorkspace = JSON.parse(payload) as unknown;
      if (!validateWorkspacePayload(expectedWorkspace)) throw new Error("待写入内容不是有效的 workspace。");
      expectedHash = await getWorkspaceHash(expectedWorkspace);
      setCodeSaveState((current) => ({ ...current, status: "saving", target, lastAttemptAt: attemptStartedAt, filePath: targetHandle?.name ?? GITHUB_SOLIDIFY_PATH, error: undefined }));
      setLocalCodeFileStatus("syncing");

      if (target === "file-handle" && targetHandle) {
        try {
          const oldWorkspace = await readLocalCodeFile(targetHandle);
          const backupName = `default-workspace.backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
          await storeLocalCodeBackup(backupName, oldWorkspace);
          backupPath = `浏览器备份库/${backupName}`;
        } catch {
          // Some browsers allow writing a bound file but do not expose a readable handle.
        }
        await writeLocalCodeFile(targetHandle, payload);
        fileWasWritten = true;
        setCodeSaveState((current) => ({ ...current, status: "saved_unverified", target, lastAttemptAt: attemptStartedAt, filePath, backupPath, error: undefined }));
        try {
          const verifiedWorkspace = await readLocalCodeFile(targetHandle);
          const verifiedHash = await getWorkspaceHash(verifiedWorkspace);
          if (!compareWorkspace(expectedWorkspace, verifiedWorkspace)) {
            const differences = getWorkspaceDifferenceSummary(expectedWorkspace, verifiedWorkspace);
            throw new Error(`绑定文件回读不一致${differences.length ? `：${differences.join("、")}` : ""}`);
          }
          setLocalCodeFileStatus("synced");
          const matchesCurrentVersion = workspaceChangeVersionRef.current === writeVersion;
          if (matchesCurrentVersion) {
            setCurrentWorkspaceHash(verifiedHash);
            setWorkspaceSource("code");
          }
          setCodeSaveState({
            status: matchesCurrentVersion ? "verified" : "dirty",
            target,
            lastAttemptAt: attemptStartedAt,
            lastVerifiedAt: new Date().toISOString(),
            filePath,
            backupPath,
            hash: verifiedHash
          });
          return "verified" as const;
        } catch (error) {
          const message = error instanceof Error ? error.message : "绑定文件无法回读验证。";
          setLocalCodeFileStatus("bound");
          setCodeSaveState((current) => ({ ...current, status: "saved_unverified", target, lastAttemptAt: attemptStartedAt, filePath, backupPath, error: message }));
          setValidatorRepairLog([`文件已经写入，但未完成回读验证：${message}`]);
          return "saved_unverified" as const;
        }
      }

      if (target === "local-service") {
        const response = await fetch(LOCAL_CODE_SYNC_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload
        });
        const result = await response.json() as { ok?: boolean; verified?: boolean; error?: string; hash?: string; filePath?: string; path?: string; backupPath?: string };
        if (!response.ok || !result.ok || result.verified !== true) throw new Error(result.error || `本地写入服务未完成验证：${response.status}`);
        filePath = result.filePath ?? result.path ?? GITHUB_SOLIDIFY_PATH;
        backupPath = result.backupPath;
        if (!result.hash || result.hash !== expectedHash) {
          setLocalCodeFileStatus("bound");
          setCodeSaveState((current) => ({ ...current, status: "saved_unverified", target, lastAttemptAt: attemptStartedAt, filePath, backupPath, error: "本机服务返回的验证哈希与当前方案不一致。" }));
          setValidatorRepairLog(["本机服务已写入文件，但返回的验证哈希与当前方案不一致。"]);
          return "saved_unverified" as const;
        }
        setLocalCodeFileStatus("synced");
        const matchesCurrentVersion = workspaceChangeVersionRef.current === writeVersion;
        if (matchesCurrentVersion) {
          setCurrentWorkspaceHash(result.hash);
          setWorkspaceSource("code");
        }
        setCodeSaveState({
          status: matchesCurrentVersion ? "verified" : "dirty",
          target,
          lastAttemptAt: attemptStartedAt,
          lastVerifiedAt: new Date().toISOString(),
          filePath,
          backupPath,
          hash: result.hash
        });
        return "verified" as const;
      }
      throw new Error("没有可用的本地代码写入目标。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "代码文件写入或回读验证失败。";
      if (fileWasWritten && target === "file-handle") {
        setLocalCodeFileStatus("bound");
        setCodeSaveState((current) => ({ ...current, status: "saved_unverified", target, lastAttemptAt: attemptStartedAt, filePath, backupPath, error: message }));
        setValidatorRepairLog([`文件已经写入，但未完成回读验证：${message}`]);
        return "saved_unverified" as const;
      }
      setLocalCodeFileStatus("error");
      setCodeSaveState((current) => ({ ...current, status: "error", target, lastAttemptAt: attemptStartedAt, error: message }));
      setValidatorRepairLog([silent ? `自动写代码失败：${message}` : message]);
      return false;
    }
  }

  async function checkLocalCodeSyncServer(enableAutoSync = false) {
    if (!canUseExternalSync) return false;
    try {
      const response = await fetch(LOCAL_CODE_SYNC_HEALTH_ENDPOINT, { cache: "no-store" });
      if (!response.ok) throw new Error(`本地写入服务不可用：${response.status}`);
      setLocalCodeServerOnline(true);
      if (!localCodeFileHandle) {
        setLocalCodeFileName("本地写入服务");
        setLocalCodeFileStatus("bound");
      }
      if (enableAutoSync) {
        window.localStorage.setItem(LOCAL_CODE_AUTO_SYNC_KEY, "true");
        setLocalCodeAutoSync(true);
      }
      return true;
    } catch {
      setLocalCodeServerOnline(false);
      return false;
    }
  }

  async function bindLocalCodeFile() {
    if (!canWriteCode || !canUseExternalSync) return;
    const serverReady = await checkLocalCodeSyncServer(true);
    if (serverReady && !localCodeFileHandle) {
      window.localStorage.setItem(LOCAL_CODE_AUTO_SYNC_KEY, "true");
      const payload = getDefaultWorkspacePayload("manual");
      setDefaultWorkspacePayload(payload);
      const savedToServer = await writeDefaultWorkspaceToLocalCodeFile(payload, false, undefined, "local-service");
      if (savedToServer === "verified") {
        setValidatorRepairLog(["已连接本地写入服务，data/default-workspace.json 写入后回读验证一致。"]);
        return;
      }
      return;
    }
    if (!supportsLocalCodeFileAccess()) {
      setLocalCodeFileStatus("unsupported");
      setValidatorRepairLog(["当前浏览器不支持直接绑定本地代码文件，本地写入服务也没有连上。"]);
      return;
    }
    try {
      const picker = window as LocalFilePickerWindow;
      const handles = await picker.showOpenFilePicker?.({
        multiple: false,
        types: [{ description: "默认户型 JSON", accept: { "application/json": [".json"] } }]
      });
      const handle = handles?.[0];
      if (!handle) return;
      await storeLocalCodeFileHandle(handle);
      setLocalCodeFileHandle(handle);
      setLocalCodeFileName(handle.name);
      setLocalCodeAutoSync(true);
      window.localStorage.setItem(LOCAL_CODE_AUTO_SYNC_KEY, "true");
      const payload = getDefaultWorkspacePayload("manual");
      setDefaultWorkspacePayload(payload);
      const verified = await writeDefaultWorkspaceToLocalCodeFile(payload, false, handle, "file-handle");
      if (verified === "verified") setValidatorRepairLog([`已绑定 ${handle.name}，写入后回读验证一致。`]);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLocalCodeFileStatus("error");
      setValidatorRepairLog([error instanceof Error ? error.message : "绑定本地代码文件失败。"]);
    }
  }

  function toggleLocalCodeAutoSync() {
    if (!canWriteCode || !canUseExternalSync) return;
    if (!localCodeFileHandle && !localCodeServerOnline) {
      bindLocalCodeFile();
      return;
    }
    setLocalCodeAutoSync((current) => {
      const nextValue = !current;
      window.localStorage.setItem(LOCAL_CODE_AUTO_SYNC_KEY, String(nextValue));
      return nextValue;
    });
  }

  function downloadJsonFile(fileName: string, payload: unknown) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadWorkspace() {
    if (!canMutateWorkspace) return;
    downloadJsonFile(`villa-space-workspace-${new Date().toISOString().slice(0, 10)}.json`, getCurrentWorkspace());
    setCodeSaveState((current) => ({
      ...current,
      status: "exported_only",
      target: "download",
      lastAttemptAt: new Date().toISOString(),
      error: undefined
    }));
  }

  function getGitHubSolidifyToken() {
    const existingToken = window.sessionStorage.getItem(GITHUB_SOLIDIFY_TOKEN_KEY);
    if (existingToken) return existingToken;
    const token = window.prompt("输入 GitHub 写入令牌，用于把当前户型固化到仓库。需要 Contents 读写权限。");
    if (!token?.trim()) return null;
    window.sessionStorage.setItem(GITHUB_SOLIDIFY_TOKEN_KEY, token.trim());
    return token.trim();
  }

  async function readWorkspaceFromGitHub(token: string) {
    const apiUrl = `https://api.github.com/repos/${GITHUB_SOLIDIFY_OWNER}/${GITHUB_SOLIDIFY_REPO}/contents/${GITHUB_SOLIDIFY_PATH}`;
    const response = await fetch(`${apiUrl}?ref=${encodeURIComponent(GITHUB_SOLIDIFY_BRANCH)}`, {
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    if (!response.ok) throw new Error(`GitHub 代码文件回读失败：${response.status}`);
    const file = await response.json() as { content?: string; path?: string };
    if (!file.content) throw new Error("GitHub 没有返回代码文件内容。");
    const workspace = JSON.parse(decodeUtf8Base64(file.content)) as unknown;
    if (!validateWorkspacePayload(workspace)) throw new Error("GitHub 代码文件不是有效的 workspace。");
    return { workspace: workspace as unknown as PersistedWebWorkspace, path: file.path };
  }

  async function commitDefaultWorkspaceToGitHub(defaultWorkspacePayload: string) {
    if (!canWriteCode || !canUseExternalSync) throw new Error(`accessMode=${accessMode} 不允许同步 GitHub。`);
    const token = getGitHubSolidifyToken();
    if (!token) {
      downloadJsonFile("default-workspace.json", JSON.parse(defaultWorkspacePayload));
      return { mode: "download" as const };
    }

    const apiUrl = `https://api.github.com/repos/${GITHUB_SOLIDIFY_OWNER}/${GITHUB_SOLIDIFY_REPO}/contents/${GITHUB_SOLIDIFY_PATH}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    const currentFileResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(GITHUB_SOLIDIFY_BRANCH)}`, { headers });
    if (!currentFileResponse.ok) {
      window.sessionStorage.removeItem(GITHUB_SOLIDIFY_TOKEN_KEY);
      throw new Error(`GitHub 读取默认户型失败：${currentFileResponse.status}`);
    }
    const currentFile = await currentFileResponse.json() as { sha?: string; html_url?: string };
    if (!currentFile.sha) throw new Error("GitHub 没有返回默认户型文件版本。");

    const updateResponse = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        branch: GITHUB_SOLIDIFY_BRANCH,
        message: `Solidify villa workspace ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
        content: encodeUtf8Base64(defaultWorkspacePayload),
        sha: currentFile.sha
      })
    });
    if (!updateResponse.ok) {
      if (updateResponse.status === 401 || updateResponse.status === 403) {
        window.sessionStorage.removeItem(GITHUB_SOLIDIFY_TOKEN_KEY);
      }
      throw new Error(`GitHub 写入默认户型失败：${updateResponse.status}`);
    }
    const result = await updateResponse.json() as { commit?: { html_url?: string; sha?: string } };
    try {
      const verifyResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(GITHUB_SOLIDIFY_BRANCH)}`, { headers, cache: "no-store" });
      if (!verifyResponse.ok) throw new Error(`GitHub 写后回读失败：${verifyResponse.status}`);
      const verifiedFile = await verifyResponse.json() as { content?: string; path?: string };
      if (!verifiedFile.content) throw new Error("GitHub 写后回读没有返回文件内容。");
      const verifiedWorkspace = JSON.parse(decodeUtf8Base64(verifiedFile.content)) as unknown;
      if (!validateWorkspacePayload(verifiedWorkspace)) throw new Error("GitHub 回读内容不是有效的 workspace。");
      const expectedWorkspace = JSON.parse(defaultWorkspacePayload) as unknown;
      const verifiedHash = await getWorkspaceHash(verifiedWorkspace);
      if (!compareWorkspace(expectedWorkspace, verifiedWorkspace)) {
        const differences = getWorkspaceDifferenceSummary(expectedWorkspace, verifiedWorkspace);
        throw new Error(`GitHub 写后回读不一致${differences.length ? `：${differences.join("、")}` : ""}`);
      }
      return {
        mode: "github" as const,
        verified: true as const,
        url: result.commit?.html_url ?? "",
        sha: result.commit?.sha ?? "",
        hash: verifiedHash,
        filePath: verifiedFile.path ?? GITHUB_SOLIDIFY_PATH,
        backupPath: currentFile.html_url ?? `GitHub ${currentFile.sha}`
      };
    } catch (error) {
      return {
        mode: "github" as const,
        verified: false as const,
        url: result.commit?.html_url ?? "",
        sha: result.commit?.sha ?? "",
        filePath: GITHUB_SOLIDIFY_PATH,
        backupPath: currentFile.html_url ?? `GitHub ${currentFile.sha}`,
        verificationError: error instanceof Error ? error.message : "GitHub 写后回读验证失败。"
      };
    }
  }

  async function solidifyDefaultWorkspace() {
    if (!canWriteCode || !canUseExternalSync || !hasLoadedWebWorkspace || workspaceConflict) return;
    const attemptStartedAt = new Date().toISOString();
    const writeVersion = workspaceChangeVersionRef.current;
    try {
      const workspace = getCurrentWorkspace("manual");
      let savedWorkspace = workspace;
      try {
        savedWorkspace = await persistWorkspace(workspace, "manual");
      } catch {
        // Draft failure is reported separately and does not hide a successful verified code write.
      }
      latestWorkspaceRef.current = savedWorkspace;
      const defaultWorkspacePayload = JSON.stringify(savedWorkspace, null, 2);
      setDefaultWorkspacePayload(defaultWorkspacePayload);
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(defaultWorkspacePayload);
        } catch {
          // Clipboard access depends on browser permissions; the hidden payload still keeps the default workspace available.
        }
      }
      if (localCodeServerOnline) {
        const localCodeSaved = await writeDefaultWorkspaceToLocalCodeFile(defaultWorkspacePayload, false, undefined, "local-service");
        if (localCodeSaved === "verified") setValidatorRepairLog(["data/default-workspace.json 已通过本机服务写入并完成回读验证。"]);
        return;
      }
      if (localCodeFileHandle) {
        const localCodeSaved = await writeDefaultWorkspaceToLocalCodeFile(defaultWorkspacePayload, false, localCodeFileHandle, "file-handle");
        if (localCodeSaved === "verified") setValidatorRepairLog(["绑定文件已写入并完成回读验证。"]);
        return;
      }

      setPublishState({ status: "pending" });
      setCodeSaveState((current) => ({ ...current, status: "saving", target: "github", lastAttemptAt: attemptStartedAt, filePath: GITHUB_SOLIDIFY_PATH, error: undefined }));
      const solidifyResult = await commitDefaultWorkspaceToGitHub(defaultWorkspacePayload);
      if (solidifyResult.mode === "download") {
        setPublishState({ status: "idle" });
        setCodeSaveState((current) => ({ ...current, status: "exported_only", target: "download", lastAttemptAt: attemptStartedAt, error: undefined }));
        setValidatorRepairLog(["已导出当前方案 JSON，但尚未写入 data/default-workspace.json。"]);
        return;
      }
      setPublishState({ status: "published", lastPublishedAt: new Date().toISOString() });
      if (!solidifyResult.verified) {
        setCodeSaveState((current) => ({
          ...current,
          status: "saved_unverified",
          target: "github",
          lastAttemptAt: attemptStartedAt,
          filePath: solidifyResult.filePath,
          backupPath: solidifyResult.backupPath,
          error: solidifyResult.verificationError
        }));
        setValidatorRepairLog([`GitHub 已写入，但尚未完成回读验证：${solidifyResult.verificationError}`]);
        return;
      }
      const matchesCurrentVersion = workspaceChangeVersionRef.current === writeVersion;
      if (matchesCurrentVersion) {
        setCurrentWorkspaceHash(solidifyResult.hash);
        setWorkspaceSource("code");
      }
      setCodeSaveState({
        status: matchesCurrentVersion ? "verified" : "dirty",
        target: "github",
        lastAttemptAt: attemptStartedAt,
        lastVerifiedAt: new Date().toISOString(),
        filePath: solidifyResult.filePath,
        backupPath: solidifyResult.backupPath,
        hash: solidifyResult.hash
      });
      setValidatorRepairLog([
        `GitHub 默认户型已提交并回读验证。${solidifyResult.sha ? `Commit ${solidifyResult.sha.slice(0, 7)}` : ""}`
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败：请检查写入目标或网络连接。";
      setCodeSaveState((current) => ({ ...current, status: "error", target: localCodeServerOnline ? "local-service" : localCodeFileHandle ? "file-handle" : "github", lastAttemptAt: attemptStartedAt, error: message }));
      setPublishState((current) => current.status === "pending" ? { status: "error", error: message } : current);
      setValidatorRepairLog([message]);
    }
  }

  function archiveAndClearStoredWorkspaceDrafts(draft: PersistedWebWorkspace) {
    try {
      window.localStorage.setItem(WEB_WORKSPACE_DISCARDED_BACKUP_KEY, JSON.stringify({
        archivedAt: new Date().toISOString(),
        workspace: draft
      }));
      [...WEB_WORKSPACE_STORAGE_KEYS, WEB_WORKSPACE_DRAFT_KEY].forEach((key) => window.localStorage.removeItem(key));
      return true;
    } catch {
      return false;
    }
  }

  async function continueWithDraft() {
    if (!canMutateWorkspace || !canPersistDraft || !workspaceConflict) return;
    const draft = workspaceConflict.draft;
    const draftHash = await getWorkspaceHash(draft);
    applyWorkspaceToEditor(draft);
    setWorkspaceConflict(null);
    setWorkspaceSource("draft");
    setCodeSaveState((current) => ({ ...current, status: "dirty", target: "none", error: undefined }));
    setDraftSaveState({ status: "saved", lastSavedAt: draft.savedAt, hash: draftHash });
    setCurrentWorkspaceHash(draftHash);
    setValidatorRepairLog(["已继续使用较新的浏览器草稿；当前修改尚未写入代码文件。"]);
  }

  async function discardDraftAndUseCode() {
    if (!canMutateWorkspace || !canPersistDraft || !workspaceConflict) return;
    const codeWorkspace = workspaceConflict.code;
    const archived = archiveAndClearStoredWorkspaceDrafts(workspaceConflict.draft);
    if (!archived) {
      downloadJsonFile(`villa-space-discarded-draft-${new Date().toISOString().slice(0, 10)}.json`, workspaceConflict.draft);
    }
    applyWorkspaceToEditor(codeWorkspace);
    setWorkspaceConflict(null);
    setWorkspaceSource("code");
    const hash = await getWorkspaceHash(codeWorkspace);
    setCurrentWorkspaceHash(hash);
    setDraftSaveState({ status: "idle" });
    setCodeSaveState({
      status: "verified",
      target: "none",
      lastVerifiedAt: codeWorkspace.savedAt,
      filePath: GITHUB_SOLIDIFY_PATH,
      hash
    });
    setValidatorRepairLog([
      archived
        ? "已使用 data/default-workspace.json；原浏览器草稿已归档保留。"
        : "已使用 data/default-workspace.json；浏览器草稿归档失败，已自动导出草稿 JSON 作为备份。"
    ]);
  }

  function exportConflictingDraft() {
    if (!canMutateWorkspace || !workspaceConflict) return;
    downloadJsonFile(`villa-space-recovery-${new Date().toISOString().slice(0, 10)}.json`, workspaceConflict.draft);
    setValidatorRepairLog(["较新的浏览器草稿已导出；请选择继续草稿或放弃草稿。"]);
  }

  async function handleWorkspaceImport(file: File | undefined) {
    if (!canMutateWorkspace || !canPersistDraft || !file) return;
    setWorkspaceImportError("");
    try {
      const imported = JSON.parse(await file.text()) as unknown;
      const validationErrors = getWorkspaceValidationErrors(imported);
      if (validationErrors.length) throw new Error(validationErrors.slice(0, 6).join("；"));
      const workspace = imported as unknown as PersistedWebWorkspace;
      setWorkspaceImportPreview({
        fileName: file.name,
        workspace,
        stats: getWorkspaceStats(workspace),
        difference: getDetailedWorkspaceDifference(workspace, getCurrentWorkspace("manual"))
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "方案 JSON 导入失败。";
      setWorkspaceImportError(`导入校验失败：${message}`);
      setValidatorRepairLog([`导入校验失败：${message}`]);
    } finally {
      if (workspaceImportInputRef.current) workspaceImportInputRef.current.value = "";
    }
  }

  async function confirmWorkspaceImport() {
    if (!canMutateWorkspace || !canPersistDraft || !workspaceImportPreview) return;
    const { workspace, fileName } = workspaceImportPreview;
    try {
      applyWorkspaceToEditor(workspace);
      setWorkspaceConflict(null);
      setWorkspaceSource("draft");
      const savedWorkspace = await persistWorkspace(workspace, "draft");
      const importedHash = await getWorkspaceHash(savedWorkspace);
      latestWorkspaceRef.current = savedWorkspace;
      setCurrentWorkspaceHash(importedHash);
      setCodeSaveState((current) => ({ ...current, status: "dirty", target: "none", error: undefined }));
      setWorkspaceImportPreview(null);
      setWorkspaceImportError("");
      setValidatorRepairLog([`已导入 ${fileName} 到当前页面，尚未写入 data/default-workspace.json。请点击保存到代码文件。`]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "导入方案后保存浏览器草稿失败。";
      setWorkspaceImportError(message);
      setValidatorRepairLog([message]);
    }
  }

  async function runSaveSelfCheck() {
    if (!IS_DEVELOPMENT || !canUseExternalSync) return;
    setConfirmSelfCheckOverwrite(false);
    setSaveSelfCheckResult({ status: "checking", message: "正在通过本机服务读取 data/default-workspace.json…" });
    try {
      const currentWorkspace = getCurrentWorkspace("manual");
      const readback = await readWorkspaceFromLocalService();
      const codeWorkspace = readback.workspace;
      const codeHash = await getWorkspaceHash(codeWorkspace);
      const difference = getDetailedWorkspaceDifference(currentWorkspace, codeWorkspace);
      if (compareWorkspace(currentWorkspace, codeWorkspace)) {
        setCurrentWorkspaceHash(codeHash);
        setWorkspaceSource("code");
        setCodeSaveState({
          status: "verified",
          target: "local-service",
          lastVerifiedAt: new Date().toISOString(),
          filePath: readback.path ?? GITHUB_SOLIDIFY_PATH,
          hash: codeHash,
          error: undefined
        });
        setSaveSelfCheckResult({
          status: "equal",
          message: "当前页面状态与 data/default-workspace.json 一致，代码已验证。",
          difference,
          codeWorkspace,
          codeHash
        });
      } else {
        setCodeSaveState((current) => ({
          ...current,
          status: "dirty",
          target: "local-service",
          lastVerifiedAt: new Date().toISOString(),
          filePath: readback.path ?? GITHUB_SOLIDIFY_PATH,
          hash: codeHash,
          error: undefined
        }));
        setSaveSelfCheckResult({
          status: "different",
          message: "当前页面状态与 data/default-workspace.json 不一致。",
          difference,
          codeWorkspace,
          codeHash
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存自检失败。";
      setCodeSaveState((current) => ({ ...current, status: "error", error: message }));
      setSaveSelfCheckResult({ status: "error", message: `保存自检失败：${message}` });
    }
  }

  async function confirmOverwriteFromSelfCheck() {
    if (!IS_DEVELOPMENT || !canWriteCode || !canUseExternalSync) return;
    const serverReady = localCodeServerOnline || await checkLocalCodeSyncServer(false);
    if (!serverReady) {
      setSaveSelfCheckResult({ status: "error", message: "本机写入服务不可用，不能覆盖 data/default-workspace.json。" });
      return;
    }
    const payload = getDefaultWorkspacePayload("manual");
    const result = await writeDefaultWorkspaceToLocalCodeFile(payload, false, undefined, "local-service");
    setConfirmSelfCheckOverwrite(false);
    if (result === "verified") await runSaveSelfCheck();
  }

  async function reloadCodeWorkspaceFromSelfCheck() {
    if (!canMutateWorkspace || !canUseExternalSync) return;
    const codeWorkspace = saveSelfCheckResult.codeWorkspace;
    if (!codeWorkspace) return;
    const codeHash = saveSelfCheckResult.codeHash ?? await getWorkspaceHash(codeWorkspace);
    applyWorkspaceToEditor(codeWorkspace);
    setWorkspaceSource("code");
    setCurrentWorkspaceHash(codeHash);
    setCodeSaveState({
      status: "verified",
      target: "local-service",
      lastVerifiedAt: new Date().toISOString(),
      filePath: GITHUB_SOLIDIFY_PATH,
      hash: codeHash
    });
    setSaveSelfCheckResult({
      status: "equal",
      message: "已重新加载 data/default-workspace.json，当前页面与代码文件一致。",
      difference: getDetailedWorkspaceDifference(codeWorkspace, codeWorkspace),
      codeWorkspace,
      codeHash
    });
    setConfirmSelfCheckOverwrite(false);
  }

  function handleFurnitureSelect(furniture: Furniture) {
    if (activeObjectId === furniture.id) {
      setActiveObjectId("");
      setOpenRightPanels((currentPanels) => ({
        ...currentPanels,
        object: false
      }));
      return;
    }
    if (furniture.floorId !== selectedFloorId) {
      setSelectedFloorId(furniture.floorId);
    }
    setSelectedFurnitureId(furniture.id);
    setSelectedSemanticObjectId("");
    setActiveObjectId(furniture.id);
    setOpenRightPanels((currentPanels) => ({
      ...currentPanels,
      object: true
    }));
  }

  function handleLocateDrawingItem(item: DrawingItem) {
    const sheetByCategory: Partial<Record<DrawingItem["category"], DrawingSheetType>> = {
      socket: "socketPlan",
      network: "socketPlan",
      switch: "switchPlan",
      light: "lightingPlan",
      waterSupply: "waterSupplyPlan",
      drainage: "drainagePlan",
      ventilation: "ceilingPlan",
      ceiling: "ceilingPlan",
      floorFinish: "floorFinishPlan",
      wallFinish: "wallFinishPlan",
      cabinet: "materialPlan",
      annotation: "annotationPlan"
    };
    const sheet = sheetByCategory[item.category] ?? "annotationPlan";
    handleSharedPlanCanvasModeChange(sheet);
    setFurnitureImmersiveMode(false);
    setViewMode("2d");
    setActiveObjectId(item.id);
    setLocateObjectRequest({ id: item.id, nonce: Date.now() });
  }

  function handleStructureObjectSelect(objectId: string) {
    const selection = resolveSelection(objectId, furniture, Object.values(houseStructuresByFloor));
    if (selection?.floorId && selection.floorId !== selectedFloorId && houseStructuresByFloor[selection.floorId as FloorId]) {
      setSelectedFloorId(selection.floorId as FloorId);
    }
    setSelectedFurnitureId("");
    setSelectedSemanticObjectId("");
    setActiveObjectId(objectId);
    setOpenRightPanels((currentPanels) => ({
      ...currentPanels,
      object: true
    }));
  }

  function handleUnifiedObjectListSelect(item: UnifiedObjectListItem) {
    const drawingItem = drawingItems.find((candidate) => candidate.id === item.id);
    if (drawingItem) {
      if (drawingItem.floorId !== selectedFloorId) setSelectedFloorId(drawingItem.floorId);
      handleLocateDrawingItem(drawingItem);
      setActiveEditorPanel("properties");
      return;
    }
    const furnitureItem = furniture.find((candidate) => candidate.id === item.id);
    if (furnitureItem) {
      handleFurnitureSelect(furnitureItem);
    } else {
      handleStructureObjectSelect(item.id);
    }
    setLocateObjectRequest({ id: item.id, nonce: Date.now() });
    setActiveEditorPanel("properties");
  }

  function setDisplayMode(mode: "edit" | "presentation") {
    setEditorDisplayMode(mode);
    if (mode === "presentation") {
      setPlannerMode("view");
      setDrawTool("select");
      setShowFurnitureLabels(false);
      setShowAdvancedCanvasControls(false);
      setActiveEditorPanel(null);
    }
  }

  function handleFurnitureUpdate(nextFurniture: Furniture) {
    handleFloorFurnitureChange(floorFurniture.map((item) => item.id === nextFurniture.id ? nextFurniture : item));
    setSelectedFurnitureId(nextFurniture.id);
    setActiveObjectId(nextFurniture.id);
  }

  function readFurnitureReferenceImage(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.onload = () => {
        const rawDataUrl = String(reader.result ?? "");
        const image = new Image();
        image.onload = () => {
          const maxSize = 900;
          const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * ratio));
          canvas.height = Math.max(1, Math.round(image.height * ratio));
          const context = canvas.getContext("2d");
          if (!context) {
            resolve(rawDataUrl);
            return;
          }
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        image.onerror = () => reject(new Error("图片解析失败"));
        image.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleActiveFurnitureImageUpload(file: File | undefined) {
    if (!file || !activeFurniture || activeFurniture.locked) return;
    try {
      const dataUrl = await readFurnitureReferenceImage(file);
      updateActiveFurniture((item) => ({
        ...item,
        referenceImageDataUrl: dataUrl,
        referenceImageName: file.name,
        recognitionStatus: "image-attached",
        recognitionNote: "已保存真实家具图片；当前先按图片作为平面参考显示，后续接入 AI 后可自动识别轮廓、抠图和生成 3D 参考。"
      }));
      setValidatorRepairLog([`已上传 ${activeFurniture.name} 的参考图片：${file.name}。`]);
    } catch (error) {
      setValidatorRepairLog([error instanceof Error ? error.message : "图片上传失败，请换一张图片试试。"]);
    }
  }

  function handleSemanticObjectSelect(object: SemanticObject) {
    setSelectedSemanticObjectId(object.id);
  }

  function handleMobileFurnitureSelect(item: Furniture) {
    setSelectedFurnitureId(item.id);
    setSelectedSemanticObjectId("");
    setActiveObjectId(item.id);
    setMobileSheetTarget({ kind: "furniture", id: item.id });
  }

  function handleMobileSemanticObjectSelect(object: SemanticObject) {
    setSelectedSemanticObjectId(object.id);
    setSelectedFurnitureId("");
    setActiveObjectId(object.id);
    setMobileSheetTarget({ kind: "semantic", id: object.id });
  }

  function handleMobileActiveObjectChange(objectId: string) {
    setActiveObjectId(objectId);
    if (!objectId) {
      setSelectedFurnitureId("");
      setSelectedSemanticObjectId("");
      setMobileSheetTarget((currentTarget) => currentTarget);
      return;
    }
    const furnitureObject = floorFurniture.find((item) => item.id === objectId);
    const semanticObject = floorSemanticObjects.find((item) => item.id === objectId);
    if (furnitureObject) {
      setSelectedFurnitureId(furnitureObject.id);
      setSelectedSemanticObjectId("");
    } else if (semanticObject) {
      setSelectedSemanticObjectId(semanticObject.id);
      setSelectedFurnitureId("");
    } else {
      setSelectedFurnitureId("");
      setSelectedSemanticObjectId("");
    }
    setMobileSheetTarget(
      furnitureObject
        ? { kind: "furniture", id: furnitureObject.id }
        : semanticObject
          ? { kind: "semantic", id: semanticObject.id }
          : objectId
            ? { kind: "structure", id: objectId }
            : null
    );
  }

  function resetMobileCurrentView() {
    setMobileResetViewRequest(Date.now());
    setMobileMoreOpen(false);
  }

  function openMobileProjectInfo() {
    setSelectedFurnitureId("");
    setSelectedSemanticObjectId("");
    setActiveObjectId("");
    setMobileSheetTarget({ kind: "project" });
    setMobileMoreOpen(false);
  }

  function exportMobileCurrentView() {
    const viewRoot = document.querySelector("[data-mobile-main-view]");
    const canvas = viewRoot?.querySelector("canvas") as HTMLCanvasElement | null;
    if (canvas) {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${selectedFloorId}-${viewMode}-view.png`;
      link.click();
      setMobileMoreOpen(false);
      return;
    }
    const svg = viewRoot?.querySelector("svg") as SVGSVGElement | null;
    if (svg) {
      const serialized = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${selectedFloorId}-2d-view.svg`;
      link.click();
      URL.revokeObjectURL(link.href);
    }
    setMobileMoreOpen(false);
  }

  function handleCreateSemanticObject(object: SemanticObject) {
    if (!canMutateWorkspace) return;
    setSemanticObjects((currentObjects) => [...currentObjects, object]);
    setSelectedSemanticObjectId(object.id);
  }

  function handleUpdateSemanticObject(object: SemanticObject) {
    if (!canMutateWorkspace) return;
    setSemanticObjects((currentObjects) => currentObjects.map((item) => item.id === object.id ? object : item));
    setSelectedSemanticObjectId(object.id);
  }

  function handleMoveSemanticObject(objectId: string, position: { x: number; y: number }) {
    if (!canMutateWorkspace) return;
    setSemanticObjects((currentObjects) => currentObjects.map((item) => {
      if (item.id !== objectId) return item;
      const details = item.details as Record<string, unknown>;
      return {
        ...item,
        position,
        details: {
          ...details,
          position
        }
      };
    }));
  }

  function handleDeleteSemanticObject(objectId: string) {
    if (!canMutateWorkspace) return;
    const dependentObject = semanticObjects.find((item) => item.id !== objectId && JSON.stringify(item.details).includes(`"${objectId}"`));
    if (dependentObject) {
      setValidatorRepairLog([`不能删除语义对象 ${objectId}：${dependentObject.id} 仍在引用它。请先解除绑定。`]);
      return;
    }
    setSemanticObjects((currentObjects) => currentObjects.filter((item) => item.id !== objectId));
    if (selectedSemanticObjectId === objectId) {
      const nextObject = semanticObjects.find((item) => item.id !== objectId && item.floorId === selectedFloorId);
      setSelectedSemanticObjectId(nextObject?.id ?? "");
    }
  }

  const handleScaleChange = useCallback((scale: number) => {
    setFloorPlanScale(scale);
  }, []);

  function handleFloorPlanVisualSettingsChange(settings: FloorPlanVisualSettings) {
    if (!canMutateWorkspace) return;
    setVisualSettingsByFloor((currentSettings) => ({
      ...currentSettings,
      [selectedFloorId]: settings
    }));
  }

  function handleCleanPatchesChange(patches: CleanPatch[]) {
    if (!canMutateWorkspace) return;
    setCleanPatchesByFloor((currentPatches) => ({
      ...currentPatches,
      [selectedFloorId]: patches
    }));
  }

  function handleHouseStructureChange(structure: HouseStructure) {
    if (!canMutateWorkspace) return;
    const reconciliation = reconcileFurnitureWallAnchors(floorHouseStructure, structure, floorFurniture);
    setHouseStructuresByFloor((currentStructures) => ({
      ...currentStructures,
      [selectedFloorId]: structure
    }));
    if (reconciliation.furniture.some((item, index) => item !== floorFurniture[index])) {
      setFurniture((currentFurniture) => [
        ...currentFurniture.filter((item) => item.floorId !== selectedFloorId),
        ...reconciliation.furniture.map(enrichFurniture3DMeta)
      ]);
    }
    if (reconciliation.warnings.length > 0) setValidatorRepairLog(reconciliation.warnings.map((warning) => warning.message));
  }

  function handleFurnitureDragEnd(movedFurniture: Furniture, _deltaMm: { x: number; y: number }) {
    if (!canMutateWorkspace || movedFurniture.locked) return;
    const anchored = refreshFurnitureWallAnchorFromPosition(movedFurniture, floorHouseStructure);
    const result = commitFurnitureSpaceAssignment(anchored, floorHouseStructure);
    setFurniture((currentFurniture) => currentFurniture.map((item) => item.id === movedFurniture.id ? enrichFurniture3DMeta(result.furniture) : item));
    const relatedUnsynced = floorDrawingItems.filter((item) => item.relatedFurnitureId === movedFurniture.id && getRelatedDrawingItemSyncState(item, result.furniture, floorHouseStructure).needsSync);
    const messages = [
      result.assignment.spanning ? `${movedFurniture.name} 跨越 ${result.assignment.candidateSpaceIds.join("、")}，已按中心点/主要占地归属，仍可人工修改并锁定。` : "",
      result.assignment.outside ? `${movedFurniture.name} 未落入任何房间或庭院区域，请人工指定归属。` : "",
      relatedUnsynced.length ? `${movedFurniture.name} 已移动；${relatedUnsynced.length} 个关联机电点位可能需要同步。` : ""
    ].filter(Boolean);
    if (messages.length > 0) setValidatorRepairLog(messages);
  }

  function handleWallSyncOverridesChange(nextOverrides: WallSyncOverrides) {
    if (!canMutateWorkspace) return;
    setWallSyncOverrides(nextOverrides);
  }

  function applySnapshot(snapshot: ModelSnapshot) {
    if (!canMutateWorkspace) return;
    const snapshotFurniture = snapshot.furniture.map(enrichFurniture3DMeta);
    suppressHistoryRef.current = true;
    committedModelRef.current[selectedFloorId] = { ...snapshot, furniture: snapshotFurniture };
    setHouseStructuresByFloor((currentStructures) => ({
      ...currentStructures,
      [selectedFloorId]: snapshot.structure
    }));
    setFurniture((currentFurniture) => [
      ...currentFurniture.filter((item) => item.floorId !== selectedFloorId),
      ...snapshotFurniture
    ]);
    setDrawingItems((currentItems) => [
      ...currentItems.filter((item) => item.floorId !== selectedFloorId),
      ...snapshot.drawingItems
    ]);
    setDrawingPackage((currentPackage) => {
      const otherIds = drawingItems.filter((item) => item.floorId !== selectedFloorId).map((item) => item.id);
      return { ...currentPackage, drawingItemIds: [...otherIds, ...snapshot.drawingItems.map((item) => item.id)], updatedAt: new Date().toISOString() };
    });
    if (snapshot.lightingDesign) setLightingDesign(snapshot.lightingDesign);
    setActiveObjectId("");
  }

  function handleUndo() {
    if (!canMutateWorkspace) return;
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    const pendingBase = pendingHistoryBaseRef.current[selectedFloorId];
    const history = historyByFloor[selectedFloorId] ?? { past: [], future: [] };
    const current = { structure: floorHouseStructure, furniture: floorFurniture, drawingItems: floorDrawingItems, lightingDesign };
    const target = pendingBase ?? history.past.at(-1);
    if (!target) return;
    delete pendingHistoryBaseRef.current[selectedFloorId];
    setHistoryByFloor((currentHistory) => ({
      ...currentHistory,
      [selectedFloorId]: {
        past: pendingBase ? history.past : history.past.slice(0, -1),
        future: [current, ...history.future].slice(0, 40)
      }
    }));
    applySnapshot(target);
  }

  function handleRedo() {
    if (!canMutateWorkspace) return;
    const history = historyByFloor[selectedFloorId] ?? { past: [], future: [] };
    const target = history.future[0];
    if (!target) return;
    const current = { structure: floorHouseStructure, furniture: floorFurniture, drawingItems: floorDrawingItems, lightingDesign };
    setHistoryByFloor((currentHistory) => ({
      ...currentHistory,
      [selectedFloorId]: {
        past: [...history.past, current].slice(-40),
        future: history.future.slice(1)
      }
    }));
    applySnapshot(target);
  }

  function locateValidationObject(objectId: string) {
    setPlannerMode("edit");
    setDrawTool("select");
    setActiveObjectId(objectId);
    setLocateObjectRequest({ id: objectId, nonce: Date.now() });
  }

  function selectRoomForNaming(roomId: string) {
    if (!roomId) return;
    setPlannerMode("edit");
    setDrawTool("select");
    setActiveObjectId(roomId);
    setLocateObjectRequest({ id: roomId, nonce: Date.now() });
    setOpenRightPanels((currentPanels) => ({
      ...currentPanels,
      object: true
    }));
  }

  function getRoomCenterPercent(room: HouseRoom | null) {
    if (!room?.boundary.length) return { x: 50, y: 50 };
    const center = room.boundary.reduce((sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y
    }), { x: 0, y: 0 });
    const width = Math.max(1, floorHouseStructure.coordinateSystem.width);
    const height = Math.max(1, floorHouseStructure.coordinateSystem.height);
    return {
      x: Math.min(100, Math.max(0, (center.x / room.boundary.length / width) * 100)),
      y: Math.min(100, Math.max(0, (center.y / room.boundary.length / height) * 100))
    };
  }

  function getNextFurnitureSequence(codePrefix: string) {
    return furniture.reduce((maxSequence, item) => {
      if (!item.code.startsWith(`${codePrefix}-`)) return maxSequence;
      const sequence = Number(item.code.split("-").at(-1));
      return Number.isFinite(sequence) ? Math.max(maxSequence, sequence) : maxSequence;
    }, 0) + 1;
  }

  function addModuleFromCatalog(item: InteriorModuleCatalogItem) {
    if (!canMutateWorkspace) return;
    const sequence = getNextFurnitureSequence(item.codePrefix);
    const sequenceLabel = String(sequence).padStart(3, "0");
    const targetRoom = moduleTargetRoom ?? floorStructureRooms[0] ?? null;
    const position = getRoomCenterPercent(targetRoom);
    const nextModule: Furniture = enrichFurniture3DMeta({
      id: `module-${selectedFloorId.toLowerCase()}-${item.moduleType}-${sequenceLabel}`,
      code: `${item.codePrefix}-${sequenceLabel}`,
      name: item.name,
      type: item.furnitureType,
      catalogId: item.id,
      moduleCategory: item.category,
      moduleType: item.moduleType,
      floorId: selectedFloorId,
      roomId: targetRoom?.id ?? `room-${selectedFloorId.toLowerCase()}-module-zone`,
      dimensions: { ...item.dimensions },
      material: item.material,
      note: item.note,
      constructionNote: item.note,
      serviceRequirements: { ...item.serviceRequirements },
      position: { ...position, rotation: 0 },
      color: item.color,
      render3d: item.render3d ? { ...item.render3d, assetType: item.render3d.assetType ?? item.moduleType } : undefined,
      wardrobeDesign: item.moduleType === "wardrobe" ? createRecommendedWardrobeDesign(item.dimensions) : undefined,
      cabinetDesign: cloneCabinetDesign(item.cabinetDesign)
    });

    handleFloorFurnitureChange([...floorFurniture, nextModule]);
    setSelectedFurnitureId(nextModule.id);
    setActiveObjectId(nextModule.id);
    setLocateObjectRequest({ id: nextModule.id, nonce: Date.now() });
    setPlannerMode("edit");
    setDrawTool("select");
    setFurnitureImmersiveMode(true);
    setOpenRightPanels((currentPanels) => ({
      ...currentPanels,
      object: true
    }));
  }

  function toggleRightPanel(panelId: RightPanelKey) {
    setOpenRightPanels((currentPanels) => ({
      ...currentPanels,
      [panelId]: !currentPanels[panelId]
    }));
  }

  function toggleModuleCategory(category: InteriorModuleCategory) {
    setOpenModuleCategories((currentCategories) => ({
      ...currentCategories,
      [category]: !currentCategories[category]
    }));
  }

  function updateActiveObject(patch: Record<string, unknown>) {
    if (!canMutateWorkspace) return;
    if (activeDrawingItem) {
      handleFloorDrawingItemsChange(floorDrawingItems.map((item) => item.id === activeDrawingItem.id
        ? { ...item, ...patch, updatedAt: new Date().toISOString() } as DrawingItem
        : item));
      return;
    }
    if (activeFurniture) {
      if (activeFurniture.locked) return;
      handleFloorFurnitureChange(floorFurniture.map((item) => item.id === activeFurniture.id ? { ...item, ...patch } as Furniture : item));
      return;
    }
    if (!activeStructureObject) return;
    const update = <T extends { id: string }>(items: T[]) => items.map((item) => {
      if (item.id !== activeStructureObject.id) return item;
      const next = { ...item, ...patch } as T;
      if ("kind" in next && next.kind === "arc" && "radius" in next && "startAngle" in next && "endAngle" in next) {
        return {
          ...next,
          length: Math.round((Math.abs(Number(next.endAngle) - Number(next.startAngle)) * Math.PI * Number(next.radius)) / 180)
        } as T;
      }
      return next;
    });
    handleHouseStructureChange({
      ...floorHouseStructure,
      walls: update(floorHouseStructure.walls),
      partitions: update(floorHouseStructure.partitions),
      stairs: update(floorHouseStructure.stairs),
      columns: update(floorHouseStructure.columns ?? []),
      fences: update(floorHouseStructure.fences),
      outdoorSurfaces: update(floorHouseStructure.outdoorSurfaces),
      rooms: update(floorHouseStructure.rooms),
      doors: update(floorHouseStructure.doors),
      windows: update(floorHouseStructure.windows),
      bayWindows: update(floorHouseStructure.bayWindows),
      skylights: update(floorHouseStructure.skylights),
      outdoors: update(floorHouseStructure.outdoors)
    });
  }

  function locateVerificationEntry(entry: VerificationTargetEntry) {
    setSelectedFloorId(entry.floorId);
    setActiveObjectId(entry.object.id);
    setLocateObjectRequest({ id: entry.object.id, nonce: Date.now() });
    setPlannerMode("edit");
    setDrawTool("select");
    setOpenRightPanels((currentPanels) => ({ ...currentPanels, object: true }));
  }

  function updateActiveFurniture(updater: (item: Furniture) => Furniture) {
    if (!canMutateWorkspace) return;
    if (!activeFurniture || activeFurniture.locked) return;
    const updated = updater(activeFurniture);
    const moved = updated.position.x !== activeFurniture.position.x || updated.position.y !== activeFurniture.position.y;
    const finalized = moved
      ? commitFurnitureSpaceAssignment(refreshFurnitureWallAnchorFromPosition(updated, floorHouseStructure), floorHouseStructure).furniture
      : updated;
    handleFloorFurnitureChange(floorFurniture.map((item) => item.id === activeFurniture.id ? finalized : item));
    setSelectedFurnitureId(activeFurniture.id);
    setActiveObjectId(activeFurniture.id);
  }

  function handleApplyModernNaturalStyle() {
    if (!canMutateWorkspace || modernNaturalPreview.adjustable === 0) return;
    const scopeLabel = modernNaturalScope.type === "house" ? "全屋" : modernNaturalScope.type === "floor" ? `${modernNaturalScope.floorId} 当前楼层` : "当前房间";
    const confirmed = window.confirm(`${scopeLabel}将调整 ${modernNaturalPreview.adjustable} 件家具，保留 ${modernNaturalPreview.skipped} 件锁定、人工确认或院子专用对象。继续应用现代自然风？`);
    if (!confirmed) return;
    const result = applyModernNaturalStyle(furniture, modernNaturalScope);
    const after = result.furniture.map(enrichFurniture3DMeta);
    setModernNaturalAction({ before: furniture, after, status: "applied" });
    setFurniture(after);
    setValidatorRepairLog([`现代自然风已应用：调整 ${result.adjusted} 件，保留 ${result.skipped} 件。`]);
  }

  function handleUndoModernNaturalStyle() {
    if (!modernNaturalAction || modernNaturalAction.status !== "applied") return;
    setFurniture(modernNaturalAction.before);
    setModernNaturalAction({ ...modernNaturalAction, status: "undone" });
    setValidatorRepairLog(["已撤销最近一次现代自然风应用。"]);
  }

  function handleRedoModernNaturalStyle() {
    if (!modernNaturalAction || modernNaturalAction.status !== "undone") return;
    setFurniture(modernNaturalAction.after);
    setModernNaturalAction({ ...modernNaturalAction, status: "applied" });
    setValidatorRepairLog(["已重做最近一次现代自然风应用。"]);
  }

  function nudgeActiveFurniture(delta: { x: number; y: number }) {
    updateActiveFurniture((item) => ({
      ...item,
      position: {
        ...item.position,
        x: Math.min(100, Math.max(0, item.position.x + delta.x)),
        y: Math.min(
          item.floorId === "1F" ? (SITE_PLAN_MAX_Y_MM / STRUCTURE_HEIGHT_MM) * 100 : 100,
          Math.max(item.floorId === "1F" ? (SITE_PLAN_MIN_Y_MM / STRUCTURE_HEIGHT_MM) * 100 : 0, item.position.y + delta.y)
        )
      }
    }));
  }

  function rotateActiveFurniture(delta: number) {
    updateActiveFurniture((item) => ({
      ...item,
      position: {
        ...item.position,
        rotation: (item.position.rotation + delta + 360) % 360
      }
    }));
  }

  function flipActiveFurniture(axis: "x" | "y") {
    updateActiveFurniture((item) => ({
      ...item,
      position: {
        ...item.position,
        [axis === "x" ? "flipX" : "flipY"]: !item.position[axis === "x" ? "flipX" : "flipY"]
      }
    }));
  }

  function openWardrobeDesigner(furnitureId: string) {
    if (!canMutateWorkspace) return;
    const target = furniture.find((item) => item.id === furnitureId);
    if (!target) return;
    setSelectedFloorId(target.floorId);
    setSelectedFurnitureId(target.id);
    setActiveObjectId(target.id);
    setWardrobeDesignFurnitureId(target.id);
    setFurnitureImmersiveMode(true);
    const normalizedDesign = normalizeWardrobeDesign(target.wardrobeDesign);
    if (JSON.stringify(target.wardrobeDesign) !== JSON.stringify(normalizedDesign)) {
      setFurniture((currentFurniture) => currentFurniture.map((item) => item.id === target.id ? { ...item, wardrobeDesign: normalizedDesign } : item));
    }
  }

  function openFurnitureDesignPage(furnitureId: string) {
    const target = furniture.find((item) => item.id === furnitureId);
    if (!target || !target.cabinetDesign) return;
    setSelectedFloorId(target.floorId);
    setSelectedFurnitureId(target.id);
    setActiveObjectId(target.id);
    setFurnitureImmersiveMode(true);
    setDesignPageRequest({ kind: "furniture", id: target.id });
  }

  function openStairDesignPage(stairId: string) {
    const stairFloor = Object.entries(houseStructuresByFloor).find(([, structure]) => structure.stairs.some((stair) => stair.id === stairId))?.[0] as FloorId | undefined;
    if (stairFloor) setSelectedFloorId(stairFloor);
    setActiveObjectId(stairId);
    setPlannerMode("edit");
    setDrawTool("select");
    setDesignPageRequest({ kind: "stair", id: stairId });
  }

  function openStairView(stairId: string, viewLabel: string) {
    const stairFloor = Object.entries(houseStructuresByFloor).find(([, structure]) => structure.stairs.some((stair) => stair.id === stairId))?.[0] as FloorId | undefined;
    if (stairFloor) setSelectedFloorId(stairFloor);
    setActiveDrawingWorkspaceId("space");
    setActiveWorkspaceTabId(null);
    setSharedPlanCanvasMode("structurePlan");
    setSelectedDrawingSheetType("structurePlan");
    setActiveObjectId(stairId);
    setViewMode("3d");
    setLocateObjectRequest({ id: stairId, nonce: Date.now() });
    setValidatorRepairLog([`楼梯视图 · ${viewLabel}：突出楼梯、踏步、平台、楼板洞口及上下层连接；这属于视图，不作为正式施工图。`]);
  }

  function updateWardrobeDesign(patch: Partial<WardrobeDesign>) {
    if (!canMutateWorkspace) return;
    if (!wardrobeDesignFurniture || wardrobeDesignFurniture.locked) return;
    const nextDesign = normalizeWardrobeDesign({ ...wardrobeDesign, ...patch });
    handleFloorFurnitureChange(floorFurniture.map((item) => item.id === wardrobeDesignFurniture.id ? { ...item, wardrobeDesign: nextDesign } : item));
  }

  function updateWardrobeDimensions(field: "width" | "depth" | "height", value: number) {
    if (!canMutateWorkspace) return;
    if (!wardrobeDesignFurniture || wardrobeDesignFurniture.locked) return;
    const nextDimensions = {
      ...wardrobeDesignFurniture.dimensions,
      [field]: Math.max(1, Math.round(value) || 1)
    };
    handleFloorFurnitureChange(floorFurniture.map((item) => item.id === wardrobeDesignFurniture.id ? { ...item, dimensions: nextDimensions } : item));
  }

  function generateRecommendedWardrobe() {
    if (!canMutateWorkspace) return;
    if (!wardrobeDesignFurniture || wardrobeDesignFurniture.locked) return;
    const recommendedDesign = createRecommendedWardrobeDesign(wardrobeDesignFurniture.dimensions);
    handleFloorFurnitureChange(floorFurniture.map((item) => item.id === wardrobeDesignFurniture.id ? { ...item, wardrobeDesign: recommendedDesign } : item));
    setValidatorRepairLog(["已按当前柜体尺寸生成推荐衣柜，可继续微调模块。"]);
  }

  function resizeWardrobeGrid(field: "columns" | "rows", value: number) {
    const max = field === "columns" ? 6 : 8;
    const nextValue = Math.min(max, Math.max(1, Math.round(value) || 1));
    const nextPatch: Partial<WardrobeDesign> = { [field]: nextValue } as Partial<WardrobeDesign>;
    if (field === "columns") {
      nextPatch.columnWidths = normalizeWardrobeColumnWidths(undefined, nextValue);
      nextPatch.modules = (wardrobeDesign.modules ?? []).map((module) => ({
        ...module,
        column: typeof module.column === "number" ? Math.min(nextValue - 1, module.column) : module.column,
        columnSpan: typeof module.column === "number" ? Math.min(nextValue - Math.min(nextValue - 1, module.column), module.columnSpan ?? 1) : module.columnSpan
      }));
    }
    updateWardrobeDesign(nextPatch);
  }

  function updateWardrobeCell(column: number, row: number, kind: WardrobeCellKind) {
    updateWardrobeDesign({
      cells: wardrobeDesign.cells.map((cell) => cell.column === column && cell.row === row ? { ...cell, kind } : cell)
    });
  }

  function wardrobeModulesOverlap(left: NonNullable<WardrobeDesign["modules"]>[number], right: NonNullable<WardrobeDesign["modules"]>[number]) {
    if (left.kind === "blank" || right.kind === "blank") return false;
    const leftLayout = getWardrobeModuleLayout(left, wardrobeColumnWidths);
    const rightLayout = getWardrobeModuleLayout(right, wardrobeColumnWidths);
    return leftLayout.x < rightLayout.x + rightLayout.width &&
      leftLayout.x + leftLayout.width > rightLayout.x &&
      leftLayout.y < rightLayout.y + rightLayout.height &&
      leftLayout.y + leftLayout.height > rightLayout.y;
  }

  function hasWardrobeModuleConflict(candidate: NonNullable<WardrobeDesign["modules"]>[number], modules: NonNullable<WardrobeDesign["modules"]>) {
    return modules.some((module) => module.id !== candidate.id && wardrobeModulesOverlap(candidate, module));
  }

  function getClampedWardrobeModule(module: NonNullable<WardrobeDesign["modules"]>[number], patch: Partial<NonNullable<WardrobeDesign["modules"]>[number]>) {
    const nextKind = patch.kind ?? module.kind;
    const limits = wardrobeModuleDefaults[nextKind];
    const nextColumn = typeof patch.column === "number" ? Math.min(wardrobeDesign.columns - 1, Math.max(0, Math.round(patch.column))) : module.column;
    const nextColumnSpan = typeof nextColumn === "number"
      ? Math.min(wardrobeDesign.columns - nextColumn, Math.max(1, Math.round(patch.columnSpan ?? module.columnSpan ?? 1)))
      : undefined;
    const nextWidth = Math.min(100, Math.max(limits.minWidth, Math.round(patch.width ?? module.width)));
    const nextHeight = Math.min(100, Math.max(limits.minHeight, Math.round(patch.height ?? module.height)));
    const drawerRows = nextKind === "drawer" ? Math.min(8, Math.max(1, Math.round(patch.drawerRows ?? module.drawerRows ?? 3))) : undefined;
    const drawerColumns = nextKind === "drawer" ? Math.min(4, Math.max(1, Math.round(patch.drawerColumns ?? module.drawerColumns ?? 1))) : undefined;
    const shelfCount = nextKind === "folded" ? Math.min(8, Math.max(1, Math.round(patch.shelfCount ?? module.shelfCount ?? 4))) : undefined;
    const drawerRowHeights = nextKind === "drawer" ? normalizeWardrobePartHeights(patch.drawerRowHeights ?? module.drawerRowHeights, drawerRows ?? 3) : undefined;
    const shelfLayerHeights = nextKind === "folded" ? normalizeWardrobePartHeights(patch.shelfLayerHeights ?? module.shelfLayerHeights, (shelfCount ?? 4) + 1) : undefined;
    return {
      ...module,
      ...patch,
      kind: nextKind,
      column: nextColumn,
      columnSpan: nextColumnSpan,
      drawerRows,
      drawerColumns,
      shelfCount,
      drawerRowHeights,
      shelfLayerHeights,
      width: nextWidth,
      height: nextHeight,
      x: Math.min(100 - nextWidth, Math.max(0, Math.round(patch.x ?? module.x))),
      y: Math.min(100 - nextHeight, Math.max(0, Math.round(patch.y ?? module.y)))
    };
  }

  function updateWardrobeColumnWidth(dividerIndex: number, clientX: number) {
    const rect = wardrobeCanvasRef.current?.getBoundingClientRect();
    if (!rect || wardrobeDesignFurniture?.locked) return;
    const before = wardrobeColumnWidths.slice(0, dividerIndex).reduce((sum, width) => sum + width, 0);
    const after = wardrobeColumnWidths.slice(0, dividerIndex + 2).reduce((sum, width) => sum + width, 0);
    const pointerPercent = Math.min(after - 10, Math.max(before + 10, ((clientX - rect.left) / rect.width) * 100));
    const nextWidths = [...wardrobeColumnWidths];
    nextWidths[dividerIndex] = Number((pointerPercent - before).toFixed(2));
    nextWidths[dividerIndex + 1] = Number((after - pointerPercent).toFixed(2));
    updateWardrobeDesign({ columnWidths: nextWidths });
  }

  function addWardrobeColumn() {
    if (wardrobeDesignFurniture?.locked || wardrobeDesign.columns >= 6) return;
    const nextColumns = wardrobeDesign.columns + 1;
    updateWardrobeDesign({
      columns: nextColumns,
      columnWidths: normalizeWardrobeColumnWidths(undefined, nextColumns),
      modules: (wardrobeDesign.modules ?? []).map((module) => ({
        ...module,
        columnSpan: typeof module.column === "number" ? Math.min(nextColumns - module.column, module.columnSpan ?? 1) : module.columnSpan
      }))
    });
  }

  function removeWardrobeColumn() {
    if (wardrobeDesignFurniture?.locked || wardrobeDesign.columns <= 1) return;
    const nextColumns = wardrobeDesign.columns - 1;
    updateWardrobeDesign({
      columns: nextColumns,
      columnWidths: normalizeWardrobeColumnWidths(undefined, nextColumns),
      modules: (wardrobeDesign.modules ?? []).map((module) => ({
        ...module,
        column: typeof module.column === "number" ? Math.min(nextColumns - 1, module.column) : module.column,
        columnSpan: typeof module.column === "number" ? Math.min(nextColumns - Math.min(nextColumns - 1, module.column), module.columnSpan ?? 1) : module.columnSpan
      }))
    });
  }

  function resizeWardrobeModuleBottom(moduleId: string, clientY: number) {
    const rect = wardrobeCanvasRef.current?.getBoundingClientRect();
    if (!rect || wardrobeDesignFurniture?.locked) return;
    const modules = wardrobeDesign.modules ?? [];
    const target = modules.find((module) => module.id === moduleId);
    if (!target) return;
    const targetLayout = getWardrobeModuleLayout(target, wardrobeColumnWidths);
    const limits = wardrobeModuleDefaults[target.kind];
    const horizontallyTouchesTarget = (module: NonNullable<WardrobeDesign["modules"]>[number]) => {
      const layout = getWardrobeModuleLayout(module, wardrobeColumnWidths);
      return layout.x < targetLayout.x + targetLayout.width - 0.5 && layout.x + layout.width > targetLayout.x + 0.5;
    };
    const oldBottom = target.y + target.height;
    const neighbors = modules.filter((module) => module.id !== target.id && horizontallyTouchesTarget(module) && Math.abs(module.y - oldBottom) <= 2);
    const lowerLimit = neighbors.length
      ? Math.min(...neighbors.map((module) => module.y + module.height - wardrobeModuleDefaults[module.kind].minHeight))
      : 100;
    const pointerPercent = ((clientY - rect.top) / rect.height) * 100;
    const nextBottom = Math.min(lowerLimit, Math.max(target.y + limits.minHeight, pointerPercent));
    const nextModules = modules.map((module) => {
      if (module.id === target.id) {
        return getClampedWardrobeModule(module, { height: Number((nextBottom - target.y).toFixed(2)) });
      }
      const neighbor = neighbors.find((item) => item.id === module.id);
      if (neighbor) {
        const neighborBottom = neighbor.y + neighbor.height;
        return getClampedWardrobeModule(module, {
          y: Number(nextBottom.toFixed(2)),
          height: Number((neighborBottom - nextBottom).toFixed(2))
        });
      }
      return module;
    });
    updateWardrobeDesign({ modules: nextModules });
  }

  function updateWardrobeModulePartHeight(moduleId: string, field: "drawerRowHeights" | "shelfLayerHeights", index: number, value: number) {
    const module = (wardrobeDesign.modules ?? []).find((item) => item.id === moduleId);
    if (!module) return;
    const count = field === "drawerRowHeights"
      ? Math.min(8, Math.max(1, module.drawerRows ?? 3))
      : Math.min(8, Math.max(1, module.shelfCount ?? 4)) + 1;
    updateWardrobeModule(moduleId, {
      [field]: setWardrobePartHeight(module[field], index, value, count)
    } as Partial<typeof module>);
  }

  function updateWardrobeShelfCount(moduleId: string, value: number) {
    const module = (wardrobeDesign.modules ?? []).find((item) => item.id === moduleId);
    if (!module || module.kind !== "folded") return;
    const nextShelfCount = Math.min(8, Math.max(1, Math.round(value) || 1));
    updateWardrobeModule(moduleId, {
      shelfCount: nextShelfCount,
      shelfLayerHeights: normalizeWardrobePartHeights(undefined, nextShelfCount + 1)
    });
  }

  function updateWardrobeModule(moduleId: string, patch: Partial<NonNullable<WardrobeDesign["modules"]>[number]>) {
    const modules = wardrobeDesign.modules ?? [];
    const changesLayout = ["kind", "column", "columnSpan", "x", "y", "width", "height"].some((field) => field in patch);
    let blockedByOverlap = false;
    updateWardrobeDesign({
      modules: modules.map((module) => {
        if (module.id !== moduleId) return module;
        const candidate = getClampedWardrobeModule(module, patch);
        if (changesLayout && hasWardrobeModuleConflict(candidate, modules)) {
          blockedByOverlap = true;
          return module;
        }
        return candidate;
      })
    });
    if (blockedByOverlap) {
      setValidatorRepairLog(["模块不能与已有功能模块重叠；留空模块可以被覆盖。"]);
    }
  }

  function addWardrobeModule(kind: WardrobeCellKind) {
    const defaults = wardrobeModuleDefaults[kind];
    const modules = wardrobeDesign.modules ?? [];
    const nextId = `module-${Date.now()}`;
    let nextModule = {
      id: nextId,
      kind,
      column: 0,
      columnSpan: 1,
      drawerRows: kind === "drawer" ? 3 : undefined,
      drawerColumns: kind === "drawer" ? 1 : undefined,
      drawerRowHeights: kind === "drawer" ? normalizeWardrobePartHeights(undefined, 3) : undefined,
      shelfCount: kind === "folded" ? 4 : undefined,
      shelfLayerHeights: kind === "folded" ? normalizeWardrobePartHeights(undefined, 5) : undefined,
      x: 0,
      y: 0,
      width: wardrobeColumnWidths[0] ?? defaults.width,
      height: defaults.height
    };
    for (let y = 0; y <= 100 - defaults.height; y += 1) {
      for (let column = 0; column < wardrobeDesign.columns; column += 1) {
        const candidate = {
          ...nextModule,
          column,
          columnSpan: 1,
          x: wardrobeColumnMetrics[column]?.x ?? 0,
          y,
          width: wardrobeColumnMetrics[column]?.width ?? defaults.width
        };
        if (!hasWardrobeModuleConflict(candidate, modules)) {
          nextModule = candidate;
          updateWardrobeDesign({ modules: [...modules, nextModule] });
          return;
        }
      }
    }
    setValidatorRepairLog(["当前衣柜没有足够空位，先缩小、改成留空或删除模块后再添加。"]);
  }

  function removeWardrobeModule(moduleId: string) {
    updateWardrobeDesign({
      modules: (wardrobeDesign.modules ?? []).filter((module) => module.id !== moduleId)
    });
  }

  function calibrateWholeHouse(
    sourceStructuresByFloor: Record<FloorId, HouseStructure>,
    sourceFurniture: Furniture[],
    leadingRepairLog: string[] = []
  ) {
    if (!canMutateWorkspace) return;
    let nextFurniture = sourceFurniture;
    const sourceFurnitureById = new Map(sourceFurniture.map((item) => [item.id, item]));
    const repairLog: string[] = [];
    const repairedStructures = floors.reduce((structures, floor) => {
      const structure = structures[floor.id] ?? createEmptyStructure(floor.id);
      const result = autoRepairHouse(floor.id, structure, nextFurniture.filter((item) => item.floorId === floor.id));
      structures[floor.id] = normalizeHouseStructure(floor.id, result.structure);
      const nextFloorFurniture = result.furniture.map((item) => {
        const sourceItem = sourceFurnitureById.get(item.id);
        return sourceItem && revisionControlledFurnitureIds.has(item.id) ? sourceItem : item;
      });
      nextFurniture = [
        ...nextFurniture.filter((item) => item.floorId !== floor.id),
        ...nextFloorFurniture
      ];
      repairLog.push(...result.repairs.map((item) => `${floor.label}: ${item}`));
      return structures;
    }, { ...sourceStructuresByFloor } as Record<FloorId, HouseStructure>);

    const anchorWarnings: string[] = [];
    floors.forEach((floor) => {
      const previousStructure = sourceStructuresByFloor[floor.id] ?? createEmptyStructure(floor.id);
      const nextStructure = repairedStructures[floor.id] ?? previousStructure;
      const reconciliation = reconcileFurnitureWallAnchors(previousStructure, nextStructure, nextFurniture.filter((item) => item.floorId === floor.id));
      nextFurniture = [
        ...nextFurniture.filter((item) => item.floorId !== floor.id),
        ...reconciliation.furniture
      ];
      anchorWarnings.push(...reconciliation.warnings.map((warning) => `${floor.label}: ${warning.message}`));
    });

    setHouseStructuresByFloor(repairedStructures);
    setFurniture(nextFurniture.map(enrichFurniture3DMeta));
    const logs = [...leadingRepairLog, ...repairLog, ...anchorWarnings];
    const visibleLogs = logs.length > 120 ? [...logs.slice(0, 120), `还有 ${logs.length - 120} 条自动修复记录已折叠。`] : logs;
    setValidatorRepairLog(visibleLogs.length > 0 ? visibleLogs : ["全屋未发现可自动修复的表达问题。"]);
  }

  function handleAutoRepairHouse() {
    if (!canMutateWorkspace) return;
    let roomAssignments = 0;
    let syncedPoints = 0;
    let nextDrawingItems = drawingItems;
    const nextFurniture = furniture.map((item) => {
      const structure = houseStructuresByFloor[item.floorId];
      if (!structure || item.roomAssignmentLocked) return item;
      const assignment = resolveFurnitureSpaceAssignment(item, structure);
      if (assignment.outside || assignment.spanning || assignment.candidateSpaceIds.length !== 1 || !assignment.primarySpaceId || assignment.primarySpaceId === item.roomId) return item;
      const committed = commitFurnitureSpaceAssignment(item, structure).furniture;
      roomAssignments += 1;
      const before = nextDrawingItems;
      nextDrawingItems = syncRelatedDrawingItemsToFurniture(nextDrawingItems, committed, structure, { moveUntouchedGenerated: true });
      syncedPoints += nextDrawingItems.filter((drawingItem, index) => drawingItem !== before[index]).length;
      return committed;
    });
    if (roomAssignments > 0) setFurniture(nextFurniture);
    if (syncedPoints > 0) setDrawingItems(nextDrawingItems);
    setValidatorRepairLog(roomAssignments || syncedPoints
      ? [`已安全补齐 ${roomAssignments} 个唯一房间归属，同步 ${syncedPoints} 个未手工调整的派生点位。未移动家具、墙体、门窗、楼梯或庭院边界。`]
      : ["没有可确定自动修复的资料问题；存在歧义的项目已保留为需要确认。"]);
  }

  function handleWallLengthChange(wallId: string, nextLengthValue: number) {
    if (!canMutateWorkspace) return;
    const targetWall = floorHouseStructure.walls.find((wall) => wall.id === wallId);
    if (!targetWall) return;
    const nextLength = Math.max(100, Math.round(nextLengthValue) || targetWall.length);
    const nextStructure: HouseStructure = {
      ...floorHouseStructure,
      walls: floorHouseStructure.walls.map((wall) => wall.id === wallId ? resizeHouseWallToLength(wall, nextLength) : wall)
    };
    const reconciliation = reconcileFurnitureWallAnchors(floorHouseStructure, nextStructure, floorFurniture);
    setHouseStructuresByFloor((current) => ({ ...current, [selectedFloorId]: nextStructure }));
    setFurniture((current) => [
      ...current.filter((item) => item.floorId !== selectedFloorId),
      ...reconciliation.furniture
    ]);
    setValidatorRepairLog([
      `${currentFloor.label}: 已把 ${targetWall.name} 长度改为 ${nextLength}mm。`,
      ...reconciliation.warnings.map((warning) => warning.message)
    ]);
    setActiveObjectId(wallId);
    setLocateObjectRequest({ id: wallId, nonce: Date.now() });
    setOpenRightPanels((currentPanels) => ({
      ...currentPanels,
      status: true,
      object: true
    }));
  }

  function handleFloorFurnitureChange(nextFloorFurniture: Furniture[]) {
    if (!canMutateWorkspace) return;
    const removedIds = floorFurniture.filter((item) => !nextFloorFurniture.some((next) => next.id === item.id)).map((item) => item.id);
    const blockedId = removedIds.find((id) =>
      semanticObjects.some((object) => JSON.stringify(object).includes(id)) ||
      nextFloorFurniture.some((item) => JSON.stringify({ note: item.note, constructionNote: item.constructionNote, constructionMeta: item.constructionMeta, mepMeta: item.mepMeta }).includes(id))
    );
    if (blockedId) {
      setValidatorRepairLog([`不能删除家具 ${blockedId}：语义对象、施工备注或机电备注仍引用它。请先解除引用。`]);
      return;
    }
    setFurniture((currentFurniture) => {
      return [
        ...currentFurniture.filter((item) => item.floorId !== selectedFloorId),
        ...nextFloorFurniture.map(enrichFurniture3DMeta)
      ];
    });
  }

  function handleFloorDrawingItemsChange(nextFloorItems: DrawingItem[]) {
    if (!canMutateWorkspace) return;
    const nextAllItems = [
      ...drawingItems.filter((item) => item.floorId !== selectedFloorId),
      ...nextFloorItems
    ];
    setDrawingItems(nextAllItems);
    setDrawingPackage((currentPackage) => ({
      ...currentPackage,
      drawingItemIds: nextAllItems.map((item) => item.id),
      updatedAt: new Date().toISOString()
    }));
  }

  function handleGenerateDrawingItems(scope: "floor" | "all") {
    if (!canMutateWorkspace) return;
    const floorIds = scope === "floor" ? [selectedFloorId] : floors.map((floor) => floor.id);
    let result = generateDrawingItemsFromFurniture({ furniture, structuresByFloor: houseStructuresByFloor, existingItems: drawingItems, floorIds });
    if (result.conflicts.length > 0) {
      const confirmed = window.confirm(`已有 ${result.conflicts.length} 个点位经过人工调整，是否重新生成并覆盖这些调整？`);
      if (confirmed) result = generateDrawingItemsFromFurniture({ furniture, structuresByFloor: houseStructuresByFloor, existingItems: drawingItems, floorIds, overwriteConflicts: true });
    }
    const changedFloorIds = floorIds.filter((floorId) => {
      const before = drawingItems.filter((item) => item.floorId === floorId);
      const after = result.items.filter((item) => item.floorId === floorId);
      return JSON.stringify(before) !== JSON.stringify(after);
    });
    if (changedFloorIds.length > 0) {
      setHistoryByFloor((currentHistory) => {
        const nextHistory = { ...currentHistory };
        changedFloorIds.forEach((floorId) => {
          const history = nextHistory[floorId] ?? { past: [], future: [] };
          const structure = houseStructuresByFloor[floorId] ?? createEmptyStructure(floorId);
          const snapshot = { structure, furniture: furniture.filter((item) => item.floorId === floorId), drawingItems: drawingItems.filter((item) => item.floorId === floorId) };
          nextHistory[floorId] = { past: [...history.past.slice(-39), snapshot], future: [] };
          committedModelRef.current[floorId] = { structure, furniture: snapshot.furniture, drawingItems: result.items.filter((item) => item.floorId === floorId) };
        });
        return nextHistory;
      });
      suppressHistoryRef.current = changedFloorIds.includes(selectedFloorId);
      setDrawingItems(result.items);
      setDrawingPackage((currentPackage) => ({ ...currentPackage, drawingItemIds: result.items.map((item) => item.id), updatedAt: new Date().toISOString() }));
    }
    const conflictMessage = result.conflicts.length ? `；${result.conflicts.length} 项已有人工调整，未覆盖` : "";
    setValidatorRepairLog([`从家具生成需求点：新增 ${result.created}，更新 ${result.updated}，跳过 ${result.skipped}${conflictMessage}。`]);
  }

  function handleGenerateLightingDesign(scope: "floor" | "all") {
    if (!canMutateWorkspace) return;
    const floorIds = scope === "floor" ? [selectedFloorId] : floors.map((floor) => floor.id);
    const result = generateLightingDesignV1({ furniture, structuresByFloor: houseStructuresByFloor, existingItems: drawingItems, floorIds });
    const summary = result.floorSummary.map((row) => `${row.floorId}：${row.lights} 灯 / ${row.switches} 控制组 / ${row.rooms} 空间`).join("\n");
    const confirmed = window.confirm(`现代温暖型灯光方案预览\n\n${summary}\n\n灯具合计 ${result.lightCount}，控制开关 ${result.switchCount}，场景 ${result.lightingDesign.scenes.length}，灯具家族 ${result.lightingDesign.fixtureFamilies.length}。\n预计新增 ${result.created}，更新 ${result.updated}，保留人工调整 ${result.conflicts.length}。\n\n所有生成项均为 draft/todo；不会覆盖已经人工调整的灯具。是否写入当前 workspace？`);
    if (!confirmed) {
      setValidatorRepairLog([`已取消写入。预览：灯具 ${result.lightCount}，开关 ${result.switchCount}，场景 ${result.lightingDesign.scenes.length}。`]);
      return;
    }
    const changedFloorIds = floorIds.filter((floorId) => {
      const before = drawingItems.filter((item) => item.floorId === floorId);
      const after = result.items.filter((item) => item.floorId === floorId);
      return JSON.stringify(before) !== JSON.stringify(after);
    });
    if (changedFloorIds.length > 0) {
      setHistoryByFloor((currentHistory) => {
        const nextHistory = { ...currentHistory };
        changedFloorIds.forEach((floorId) => {
          const history = nextHistory[floorId] ?? { past: [], future: [] };
          const structure = houseStructuresByFloor[floorId] ?? createEmptyStructure(floorId);
          const snapshot = { structure, furniture: furniture.filter((item) => item.floorId === floorId), drawingItems: drawingItems.filter((item) => item.floorId === floorId), lightingDesign };
          nextHistory[floorId] = { past: [...history.past.slice(-39), snapshot], future: [] };
          committedModelRef.current[floorId] = { structure, furniture: snapshot.furniture, drawingItems: result.items.filter((item) => item.floorId === floorId) };
        });
        return nextHistory;
      });
      suppressHistoryRef.current = changedFloorIds.includes(selectedFloorId);
      setDrawingItems(result.items);
      setDrawingPackage((currentPackage) => ({ ...currentPackage, drawingItemIds: result.items.map((item) => item.id), updatedAt: new Date().toISOString() }));
    }
    setLightingDesign(result.lightingDesign);
    setRoomTourViews((currentViews) => [
      ...currentViews.filter((view) => !view.id.startsWith("lighting-view-") || !floorIds.includes(view.floorId)),
      ...result.recommendedViews.filter((view) => floorIds.includes(view.floorId))
    ]);
    const conflictMessage = result.conflicts.length ? `；${result.conflicts.length} 项已有人工调整，未覆盖` : "";
    setValidatorRepairLog([`现代温暖型灯光方案：灯具 ${result.lightCount}，控制开关 ${result.switchCount}，场景 ${result.lightingDesign.scenes.length}；新增 ${result.created}，更新 ${result.updated}，跳过 ${result.skipped}${conflictMessage}。`]);
  }

  function handleDeleteFurniture(furnitureId: string) {
    if (!canMutateWorkspace) return;
    const targetFurniture = floorFurniture.find((item) => item.id === furnitureId);
    if (!targetFurniture || targetFurniture.locked) return;
    const nextFloorFurniture = floorFurniture.filter((item) => item.id !== furnitureId);
    handleFloorFurnitureChange(nextFloorFurniture);
    const orphanCount = drawingItems.filter((item) => item.relatedFurnitureId === furnitureId || item.hostObjectId === furnitureId).length;
    if (orphanCount > 0) setValidatorRepairLog([`已删除家具；${orphanCount} 个图纸点位成为孤立引用，请删除点位或重新绑定家具。`]);
    if (selectedFurnitureId === furnitureId) {
      setSelectedFurnitureId(nextFloorFurniture[0]?.id ?? "");
    }
    if (activeObjectId === furnitureId) {
      setActiveObjectId("");
    }
  }

  function handleRotateFurniture(furnitureId: string) {
    if (!canMutateWorkspace) return;
    const targetFurniture = floorFurniture.find((item) => item.id === furnitureId);
    if (!targetFurniture || targetFurniture.locked) return;
    handleFloorFurnitureChange(floorFurniture.map((item) => item.id === furnitureId
      ? { ...item, position: { ...item.position, rotation: (item.position.rotation + 15 + 360) % 360 } }
      : item));
    setSelectedFurnitureId(furnitureId);
    setActiveObjectId(furnitureId);
  }

  const isFurnitureWorkspace = furnitureImmersiveMode && !focusMode;
  const usesUnifiedCourtyard3D = viewMode === "3d" && !focusMode && !furnitureImmersiveMode
    && (selectedFloorId === "YARD" || (selectedFloorId === "1F" && selectedDrawingSheetType === "sitePlan"));
  const isImmersiveWorkspace = focusMode || isFurnitureWorkspace;
  const localCodeFileReady = Boolean(localCodeFileHandle) || localCodeServerOnline;
  const isPublishedCodeWorkspace = !canUseBrowserDrafts;
  const isCurrentDraftSaved = canUseBrowserDrafts && Boolean(currentWorkspaceHash) && draftSaveState.status === "saved" && draftSaveState.hash === currentWorkspaceHash;
  const hasUnwrittenCodeChanges = Boolean(currentWorkspaceHash) && currentWorkspaceHash !== codeSaveState.hash;
  const isCurrentCodeVerified = Boolean(currentWorkspaceHash) && codeSaveState.status === "verified" && codeSaveState.hash === currentWorkspaceHash;
  const showSeparateCodeDirty = hasUnwrittenCodeChanges && !["dirty", "verified"].includes(codeSaveState.status);
  const unwrittenCodeLabel = workspaceSource === "draft" ? "当前使用浏览器草稿，尚未写入代码文件" : "有未写入代码文件的修改";
  const draftSaveLabel = canUseBrowserDrafts ? getDraftSaveLabel(draftSaveState, currentWorkspaceHash) : "发布代码版本";
  const codeSaveLabel = getCodeSaveLabel(codeSaveState, currentWorkspaceHash, workspaceSource);
  const codeWriteTargetLabel = getCodeWriteTargetLabel(codeSaveState, localCodeServerOnline, localCodeFileHandle);
  const localCodeFileLabel = localCodeServerOnline && !localCodeFileHandle
    ? "写入服务已连"
    : localCodeFileStatus === "unsupported"
    ? "浏览器不支持"
    : localCodeFileStatus === "syncing"
      ? "代码写入中"
      : localCodeFileStatus === "synced"
        ? "写入目标已绑定"
        : localCodeFileReady
          ? "写入目标已绑定"
          : "绑定代码文件";
  const mobileShellActive = isPhoneDevice;
  const editorErrorCount = baseValidationFindings.filter((finding) => finding.severity === "blocking" || finding.severity === "error").length;
  const editorWarningCount = baseValidationFindings.filter((finding) => finding.severity === "warning").length;
  const outputDrawingReadiness = evaluateOutputDrawings({
    structure: floorHouseStructure,
    furniture: floorFurniture,
    drawingItems: floorDrawingItems,
    stairSystems: stairSystems.filter((system) => system.lowerFloorId === selectedFloorId || system.upperFloorId === selectedFloorId),
    stairLandings: stairLandings.filter((landing) => landing.lowerFloorId === selectedFloorId || landing.upperFloorId === selectedFloorId),
    stairOpenings: stairOpenings.filter((opening) => opening.floorId === selectedFloorId),
    errorCount: editorErrorCount,
    warningCount: editorWarningCount
  });
  const validationFindings = groupValidationFindings([
    ...baseValidationFindings,
    ...outputDrawingReadiness.filter((drawing) => drawing.status !== "ready" && drawing.workspace === activeDrawingWorkspace.id).map((drawing): ValidationFinding => ({
      ruleId: "DRAWING_READINESS",
      severity: "info",
      category: "drawing",
      title: `${drawing.name}尚未完成`,
      message: `缺少：${drawing.missing.join("、") || "导出条件"}`,
      floorId: selectedFloorId,
      objectId: drawing.id,
      actualValue: `${drawing.objectCount} 个相关对象`,
      requiredValue: "对象、标注、图例与导出条件完整",
      suggestion: "在图纸包中补齐缺失内容后重新检查。",
      rootCauseKey: `DRAWING:${selectedFloorId}:${drawing.id}`
    }))
  ]);
  const validationGroups = {
    conflict: validationFindings.filter((finding) => getValidationProductGroup(finding) === "confirmed-conflict"),
    highRisk: validationFindings.filter((finding) => getValidationProductGroup(finding) === "high-risk"),
    pendingData: validationFindings.filter((finding) => getValidationProductGroup(finding) === "pending-data"),
    suggestion: validationFindings.filter((finding) => getValidationProductGroup(finding) === "suggestion"),
    systemError: validationFindings.filter((finding) => getValidationProductGroup(finding) === "system-error")
  };
  const editorSaveTone: "saved" | "saving" | "dirty" | "error" = draftSaveState.status === "error" || codeSaveState.status === "error"
    ? "error"
    : draftSaveState.status === "saving" || codeSaveState.status === "saving"
      ? "saving"
      : isPublishedCodeWorkspace || isCurrentDraftSaved
        ? "saved"
        : "dirty";
  const editorSaveLabel = editorSaveTone === "error" ? "保存失败" : editorSaveTone === "saving" ? "保存中" : editorSaveTone === "saved" ? "已保存" : "有未保存修改";
  const mobilePresentationActive = mobileShellActive && !canMutateWorkspace;
  const mobilePlannerMode: PlannerMode = canMutateWorkspace ? plannerMode : "view";
  const mobileFloorTabs = floors.filter((floor) => ["B2", "B1", "1F", "2F", "YARD"].includes(floor.id));
  const mobileSheetKind = mobileSheetTarget?.kind ?? null;
  const mobileSheetTargetId = mobileSheetTarget && "id" in mobileSheetTarget ? mobileSheetTarget.id : "";
  const mobileProjectInfoOpen = mobileSheetKind === "project";
  const mobileActiveFurniture = mobileSheetKind === "furniture"
    ? floorFurniture.find((item) => item.id === mobileSheetTargetId) ?? activeFurniture
    : null;
  const mobileActiveStructure = mobileSheetKind === "structure" ? activeStructureObject : null;
  const mobileActiveSemantic = mobileSheetKind === "semantic"
    ? floorSemanticObjects.find((item) => item.id === mobileSheetTargetId) ?? selectedSemanticObject
    : null;
  const mobileDisplayLabel = mobileDisplayLevel === "simple" ? "简洁" : mobileDisplayLevel === "annotated" ? "标注" : "专业";
  const professionalModeLabels: Record<MobileProfessionalSheetMode, string> = {
    socketPlan: "插座",
    switchPlan: "开关",
    lightingPlan: "灯光",
    waterSupplyPlan: "给水",
    drainagePlan: "排水",
    ceilingPlan: "吊顶",
    floorFinishPlan: "地面",
    wallFinishPlan: "墙面",
    materialPlan: "材料",
    annotationPlan: "标注"
  };

  if (isExplorationMode) {
    return (
      <ExplorationMode
        floors={floors}
        initialFloorId={selectedFloorId}
        houseStructuresByFloor={houseStructuresByFloor}
        stairSystems={stairSystems}
        stairLandings={stairLandings}
        stairOpenings={stairOpenings}
        furniture={furniture}
        drawingItems={drawingItems}
        sceneSettings={{
          ...(shared3DSceneSettings.drawingSheetType === selectedDrawingSheetType
            ? shared3DSceneSettings
            : createDefaultShared3DSceneSettings(selectedDrawingSheetType))
        }}
        onExit={exitExplorationMode}
      />
    );
  }

  if (mobileShellActive) {
    return (
      <main className="box-border h-[100dvh] overflow-hidden bg-[#f7f3ed] text-ink" data-access-mode={accessMode}>
        {defaultWorkspacePayload ? (
          <pre className="hidden" data-testid="villa-default-workspace-payload">
            {defaultWorkspacePayload}
          </pre>
        ) : null}
        <input
          ref={workspaceImportInputRef}
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleWorkspaceImport(event.target.files?.[0])}
          type="file"
        />
        <section className="flex h-full min-h-0 flex-col overflow-hidden">
          <header className="relative z-[90] flex h-14 shrink-0 items-center gap-2 border-b border-stone-200/75 bg-white/92 px-3 shadow-sm backdrop-blur">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold leading-tight text-ink">林屿湖畔装修方案</h1>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-stone-500">
                {currentFloor.id === "YARD" ? "院子" : currentFloor.id} · {mobileDisplayLabel}
              </p>
            </div>
            <div className="grid h-9 shrink-0 grid-cols-2 rounded-full bg-stone-100 p-1 text-[12px] font-semibold text-stone-500">
              {(["2d", "3d"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  className={`rounded-full px-3 transition ${viewMode === mode ? "bg-white text-ink shadow-sm" : "text-stone-500"}`}
                  onClick={() => setViewMode(mode)}
                  type="button"
                >
                  {mode === "2d" ? "2D 图纸" : "3D 模型"}
                </button>
              ))}
            </div>
            {viewMode === "3d" && (
              <button
                aria-label="重置视角"
                className="h-9 shrink-0 rounded-full bg-stone-100 px-3 text-[12px] font-semibold text-stone-600"
                onClick={resetMobileCurrentView}
                type="button"
              >
                重置
              </button>
            )}
            <button
              aria-label="更多"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-stone-100 text-lg font-semibold text-stone-600"
              onClick={() => setMobileMoreOpen((open) => !open)}
              type="button"
            >
              ...
            </button>
            {mobileMoreOpen && (
              <div className="absolute right-3 top-12 z-[100] w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-white/80 bg-white/98 p-2 text-sm font-semibold text-stone-700 shadow-[0_18px_46px_rgba(39,34,28,0.22)] backdrop-blur">
                <button className="block w-full rounded-xl px-3 py-2.5 text-left hover:bg-stone-50" onClick={resetMobileCurrentView} type="button">重置视角</button>
                <div className="mt-1 rounded-xl bg-stone-50 p-1">
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {([
                      ["simple", "简洁"],
                      ["annotated", "标注"],
                      ["professional", "专业"]
                    ] as Array<[MobileDisplayLevel, string]>).map(([level, label]) => (
                      <button
                        key={level}
                        className={`rounded-lg px-2 py-2 ${mobileDisplayLevel === level ? "bg-white text-ink shadow-sm" : "text-stone-500"}`}
                        onClick={() => setMobileDisplayLevel(level)}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {mobileDisplayLevel === "professional" && (
                    <select
                      className="mt-2 h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-ink outline-none"
                      value={mobileProfessionalSheetMode}
                      onChange={(event) => {
                        const nextMode = event.target.value as MobileProfessionalSheetMode;
                        setMobileProfessionalSheetMode(nextMode);
                        handleSharedPlanCanvasModeChange(nextMode);
                      }}
                    >
                      {(Object.entries(professionalModeLabels) as Array<[MobileProfessionalSheetMode, string]>).map(([mode, label]) => (
                        <option key={mode} value={mode}>{label}</option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  className="mt-1 block w-full rounded-xl px-3 py-2.5 text-left hover:bg-stone-50"
                  onClick={openMobileProjectInfo}
                  type="button"
                >
                  查看项目信息
                </button>
                <button className="block w-full rounded-xl px-3 py-2.5 text-left hover:bg-stone-50" onClick={exportMobileCurrentView} type="button">导出当前视图截图</button>
              </div>
            )}
          </header>

          <section
            className="relative min-h-0 flex-1 overflow-hidden"
            data-mobile-main-view
            data-mobile-sheet-target={mobileSheetKind ?? "none"}
          >
            <PlanCanvas
              floor={currentFloor}
              floors={floors}
              legacyRooms={floorLegacyRooms}
              legacyWalls={floorLegacyWalls}
              furniture={usesUnifiedCourtyard3D ? unifiedCourtyardModel.furniture : floorFurniture}
              drawingItems={usesUnifiedCourtyard3D ? courtyardScene.drawingItems : floorDrawingItems}
              constructionExportWorkspace={getCurrentWorkspace("manual")}
              dimensionVerificationConflictIds={verificationConflictIds}
              semanticObjects={floorSemanticObjects}
              selectedFurnitureId={activeFurniture?.id ?? selectedFurniture?.id ?? ""}
              selectedSemanticObjectId={selectedSemanticObjectId}
              sheetMode={sharedPlanCanvasMode}
              viewMode={viewMode}
              plannerMode={mobilePlannerMode}
              drawTool={drawTool}
              houseStructure={usesUnifiedCourtyard3D ? unifiedCourtyardModel.houseStructure : floorHouseStructure}
              wallSyncOverrides={wallSyncOverrides}
              floorPlanVisualSettings={floorPlanVisualSettings}
              cleanPatches={floorCleanPatches}
              focusMode={false}
              furnitureImmersiveMode={false}
              mobilePresentationMode={mobilePresentationActive}
              workspaceMutationAllowed={canMutateWorkspace}
              mobileDisplayLevel={mobileDisplayLevel}
              mobileProfessionalSheetMode={mobileProfessionalSheetMode}
              mobileQuality={mobileQuality}
              resetViewRequest={mobileResetViewRequest}
              showFurnitureLabels={mobileDisplayLevel !== "simple"}
              activeFurnitureId={activeFurniture?.id ?? ""}
              cameraViews={cameraViews}
              roomTourViews={derivedRoomTourViews}
              lightingDesign={lightingDesign}
              cameraViewFloorIds={usesUnifiedCourtyard3D ? courtyardViewFloorIds : undefined}
              cameraViewRequest={fixedCameraViewRequest}
              locateObjectRequest={locateObjectRequest}
              canUndo={Boolean(pendingHistoryBaseRef.current[selectedFloorId] || floorHistory.past.length)}
              canRedo={floorHistory.future.length > 0}
              onScaleChange={handleScaleChange}
              onSheetModeChange={handleSharedPlanCanvasModeChange}
              onSelectFloor={handleFloorChange}
              onActiveObjectChange={handleMobileActiveObjectChange}
              onSelectStructureObject={handleStructureObjectSelect}
              onUndo={canMutateWorkspace ? handleUndo : () => undefined}
              onRedo={canMutateWorkspace ? handleRedo : () => undefined}
              onPlannerModeChange={(mode) => {
                if (canMutateWorkspace) setPlannerMode(mode);
              }}
              onDrawToolChange={(tool) => {
                if (canMutateWorkspace) setDrawTool(tool);
              }}
              onHouseStructureChange={handleHouseStructureChange}
              onWallLengthChange={handleWallLengthChange}
              onWallSyncOverridesChange={handleWallSyncOverridesChange}
              onFloorPlanVisualSettingsChange={handleFloorPlanVisualSettingsChange}
              onCleanPatchesChange={handleCleanPatchesChange}
              onSelectFurniture={handleMobileFurnitureSelect}
              onFurnitureChange={handleFloorFurnitureChange}
              onFurnitureDragEnd={handleFurnitureDragEnd}
              onDrawingItemsChange={handleFloorDrawingItemsChange}
              onGenerateDrawingItems={handleGenerateDrawingItems}
              onGenerateLightingDesign={handleGenerateLightingDesign}
              onShowFurnitureLabelsChange={setShowFurnitureLabels}
              onOpenWardrobeDesigner={openWardrobeDesigner}
              onOpenStairDesigner={openStairDesignPage}
              onSelectSemanticObject={handleMobileSemanticObjectSelect}
              onMoveSemanticObject={handleMoveSemanticObject}
              onSelectCameraView={handleSelectFixedCameraView}
              onSceneSettingsChange={setShared3DSceneSettings}
            />
            {mobileSheetTarget && (
              <MobileDetailsDrawer
                floor={currentFloor}
                floorPlanScale={floorPlanScale}
                furniture={mobileActiveFurniture}
                semanticObject={mobileActiveSemantic}
                semanticObjects={floorSemanticObjects}
                structureObject={mobileActiveStructure}
                rooms={floorStructureRooms}
                open
                onClose={() => {
                  setMobileSheetTarget(null);
                }}
                displayLevel={mobileDisplayLevel}
                viewMode={viewMode}
                projectInfo={mobileProjectInfoOpen}
              />
            )}
          </section>

          <nav className="grid h-16 shrink-0 grid-cols-5 border-t border-stone-200/80 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0px)] pt-1 shadow-[0_-8px_26px_rgba(39,34,28,0.08)] backdrop-blur">
            {mobileFloorTabs.map((floor) => {
              const active = floor.id === selectedFloorId;
              return (
                <button
                  key={floor.id}
                  className={`mx-1 flex flex-col items-center justify-center rounded-2xl text-[11px] font-semibold transition ${
                    active ? "bg-stone-900 text-white shadow-sm" : "text-stone-500"
                  }`}
                  onClick={() => handleFloorChange(floor.id)}
                  type="button"
                >
                  <span className="text-[13px] leading-none">{floor.id === "YARD" ? "院子" : floor.id}</span>
                  <span className={`mt-1 h-1 w-5 rounded-full ${active ? "bg-white" : "bg-transparent"}`} />
                </button>
              );
            })}
          </nav>
        </section>
      </main>
    );
  }

  return (
    <main className="box-border h-[100dvh] overflow-hidden bg-[#f4f3ef]">
      {defaultWorkspacePayload ? (
        <pre className="hidden" data-testid="villa-default-workspace-payload">
          {defaultWorkspacePayload}
        </pre>
      ) : null}
      <input
        ref={workspaceImportInputRef}
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void handleWorkspaceImport(event.target.files?.[0])}
        type="file"
      />
      {workspaceConflict && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4" role="presentation">
          <section aria-labelledby="workspace-conflict-title" aria-modal="true" className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl" role="dialog">
            <h2 className="text-lg font-semibold text-ink" id="workspace-conflict-title">检测到浏览器中有未写入代码文件的草稿</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {workspaceConflict.reason === "draft-newer"
                ? "浏览器草稿比 data/default-workspace.json 更新，且内容不同。选择前不会加载或覆盖草稿。"
                : "浏览器草稿与代码版本内容不同，但无法可靠判断新旧。请选择要继续使用的版本。"}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-stone-500">
              <div className="bg-stone-50 p-3">
                <p className="font-semibold text-ink">浏览器草稿</p>
                <p className="mt-1">{workspaceConflict.draftSavedAt ? new Date(workspaceConflict.draftSavedAt).toLocaleString("zh-CN") : "时间未知"}</p>
              </div>
              <div className="bg-stone-50 p-3">
                <p className="font-semibold text-ink">代码文件</p>
                <p className="mt-1">{workspaceConflict.codeSavedAt ? new Date(workspaceConflict.codeSavedAt).toLocaleString("zh-CN") : "时间未知"}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-clay" onClick={() => void continueWithDraft()} type="button">继续使用浏览器草稿</button>
              <button className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-200" onClick={exportConflictingDraft} type="button">导出草稿 JSON</button>
              <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => void discardDraftAndUseCode()} type="button">放弃草稿，使用代码版本</button>
            </div>
          </section>
        </div>
      )}
      {workspaceImportPreview && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 p-4" role="presentation">
          <section aria-labelledby="workspace-import-title" aria-modal="true" className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5 shadow-2xl" role="dialog">
            <h2 className="text-lg font-semibold text-ink" id="workspace-import-title">导入方案预览</h2>
            <p className="mt-1 text-sm text-stone-500">{workspaceImportPreview.fileName}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[
                ["楼层", workspaceImportPreview.stats.floorCount],
                ["模块", workspaceImportPreview.stats.moduleCount],
                ["语义对象", workspaceImportPreview.stats.semanticObjectCount],
                ["固定视角", workspaceImportPreview.stats.cameraViewCount]
              ].map(([label, value]) => (
                <div className="bg-stone-50 px-3 py-2" key={String(label)}>
                  <p className="text-xs text-stone-500">{label}</p>
                  <p className="mt-1 font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-stone-500">更新时间：{workspaceImportPreview.stats.updatedAt ? new Date(workspaceImportPreview.stats.updatedAt).toLocaleString("zh-CN") : "文件未提供"}</p>
            <div className="mt-4 border-t border-stone-100 pt-4 text-xs leading-5 text-stone-600">
              <p className="font-semibold text-ink">与当前页面差异</p>
              {workspaceImportPreview.difference.equal ? (
                <p className="mt-2 text-emerald-700">导入文件与当前页面内容一致。</p>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <p>楼层：{workspaceImportPreview.difference.floorsMatch ? "一致" : `${workspaceImportPreview.stats.floorIds.join("、")} / 当前 ${workspaceImportPreview.difference.codeStats.floorIds.join("、")}`}</p>
                  <p>模块：{workspaceImportPreview.stats.moduleCount} / 当前 {workspaceImportPreview.difference.codeStats.moduleCount}</p>
                  <p>语义对象：{workspaceImportPreview.stats.semanticObjectCount} / 当前 {workspaceImportPreview.difference.codeStats.semanticObjectCount}</p>
                  <p>视角：{workspaceImportPreview.stats.cameraViewCount} / 当前 {workspaceImportPreview.difference.codeStats.cameraViewCount}</p>
                  <p>导入新增对象：{workspaceImportPreview.difference.addedObjectIds.length}</p>
                  <p>导入删除对象：{workspaceImportPreview.difference.removedObjectIds.length}</p>
                  <p>位置变化：{workspaceImportPreview.difference.positionChangedObjectIds.length}</p>
                  <p>尺寸变化：{workspaceImportPreview.difference.sizeChangedObjectIds.length}</p>
                  <p>材质变化：{workspaceImportPreview.difference.materialChangedObjectIds.length}</p>
                  <p>MEP / 施工变化：{workspaceImportPreview.difference.mepMetaChangedObjectIds.length + workspaceImportPreview.difference.constructionMetaChangedObjectIds.length}</p>
                </div>
              )}
            </div>
            <p className="mt-4 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">确认后只会替换当前页面并保存为浏览器草稿，不会写入 data/default-workspace.json。</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-200" onClick={() => setWorkspaceImportPreview(null)} type="button">取消</button>
              <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-clay" onClick={() => void confirmWorkspaceImport()} type="button">确认导入到当前页面</button>
            </div>
          </section>
        </div>
      )}
      {workspaceImportError && (
        <div className="fixed left-1/2 top-4 z-[120] flex w-[min(92vw,640px)] -translate-x-1/2 items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
          <p>{workspaceImportError}</p>
          <button aria-label="关闭导入错误" className="font-semibold" onClick={() => setWorkspaceImportError("")} type="button">关闭</button>
        </div>
      )}
      <section className="grid h-full min-h-0 grid-rows-[56px_minmax(0,1fr)_28px] overflow-hidden bg-white">
        <span className="sr-only">发布代码版本</span>
        <TopNavigation
          projectName="林屿湖畔"
          floors={floors}
          selectedFloorId={selectedFloorId}
          workspaceName={`${activeDrawingWorkspace.name}${activeDrawingWorkspace.activeTabName ? ` · ${activeDrawingWorkspace.activeTabName}` : ""}`}
          saveLabel={editorSaveLabel}
          saveTone={editorSaveTone}
          canUndo={Boolean(pendingHistoryBaseRef.current[selectedFloorId] || floorHistory.past.length)}
          canRedo={floorHistory.future.length > 0}
          onSelectFloor={handleFloorChange}
          onOpenDirectory={() => setDrawingDirectoryOpen(true)}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
        <section className={`relative grid min-h-0 ${leftSidebarMode === "objects"
          ? activeEditorPanel ? "lg:grid-cols-[288px_minmax(0,1fr)_336px_88px]" : "lg:grid-cols-[288px_minmax(0,1fr)_88px]"
          : contextToolbarExpanded
            ? activeEditorPanel ? "lg:grid-cols-[176px_minmax(0,1fr)_336px_88px]" : "lg:grid-cols-[176px_minmax(0,1fr)_88px]"
            : activeEditorPanel ? "lg:grid-cols-[56px_minmax(0,1fr)_336px_88px]" : "lg:grid-cols-[56px_minmax(0,1fr)_88px]"}`}>
          <div className="relative z-30 hidden min-h-0 border-r border-stone-200/80 bg-white lg:block">
            <div className="grid h-10 grid-cols-2 border-b border-stone-200 p-1">
              <button className={`rounded-md text-[11px] font-semibold ${leftSidebarMode === "objects" ? "bg-slate-900 text-white" : "text-stone-500 hover:bg-stone-100"}`} onClick={() => setLeftSidebarMode("objects")} type="button">对象列表</button>
              <button className={`rounded-md text-[11px] font-semibold ${leftSidebarMode === "tools" ? "bg-slate-900 text-white" : "text-stone-500 hover:bg-stone-100"}`} onClick={() => setLeftSidebarMode("tools")} type="button">创建工具</button>
            </div>
            <div className="h-[calc(100%-40px)] min-h-0">
              {leftSidebarMode === "objects" ? <UnifiedObjectList items={workspaceObjectItems} selectedObjectId={activeObjectId} selectedFloorId={selectedFloorId} onSelect={handleUnifiedObjectListSelect} /> : <ContextToolBar
                workspace={activeDrawingWorkspace}
                activeToolId={activeWorkspaceToolId}
                expanded={contextToolbarExpanded}
                onToggleExpanded={() => setContextToolbarExpanded((expanded) => !expanded)}
                onSelectTool={handleWorkspaceToolSelect}
              />}
            </div>
          </div>
          <div className="absolute bottom-3 left-3 z-[65] lg:hidden">
            <ContextToolBar
              workspace={activeDrawingWorkspace}
              activeToolId={activeWorkspaceToolId}
              expanded={contextToolbarExpanded}
              onToggleExpanded={() => setContextToolbarExpanded((expanded) => !expanded)}
              onSelectTool={handleWorkspaceToolSelect}
            />
          </div>
        <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <WorkspaceTabs tabs={getDrawingWorkspace(activeDrawingWorkspaceId).tabs} activeTabId={activeDrawingWorkspace.activeTabId} onSelect={selectWorkspaceTab} />
          <div className="absolute right-3 top-12 z-[64] flex max-w-[calc(100%-24px)] items-center gap-1 rounded-xl border border-stone-200 bg-white/95 p-1 shadow-sm backdrop-blur" aria-label="画布视图控制">
            <button className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${viewMode === "2d" ? "bg-slate-900 text-white" : "text-stone-600 hover:bg-stone-100"}`} onClick={() => setViewMode("2d")} type="button">2D</button>
            <button className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${viewMode === "3d" ? "bg-slate-900 text-white" : "text-stone-600 hover:bg-stone-100"}`} onClick={() => setViewMode("3d")} type="button">3D</button>
            <span className="mx-0.5 h-5 w-px bg-stone-200" />
            <button className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${editorDisplayMode === "edit" ? "bg-blue-50 text-blue-700" : "text-stone-600 hover:bg-stone-100"}`} onClick={() => setDisplayMode("edit")} type="button">编辑</button>
            <button className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${editorDisplayMode === "presentation" ? "bg-amber-50 text-amber-800" : "text-stone-600 hover:bg-stone-100"}`} onClick={() => setDisplayMode("presentation")} type="button">展示</button>
            {viewMode === "3d" && <button className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-100" onClick={enterExplorationMode} type="button">探索模式</button>}
            <button className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-100" onClick={() => setEditorDialog("layers")} type="button">图层</button>
            <button className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-100" onClick={() => setActiveEditorPanel("validation")} type="button">检查</button>
            <button className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-100" onClick={() => setEditorDialog("package")} type="button">图纸包</button>
            <button className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-100" onClick={() => setMoreMenuOpen((open) => !open)} type="button">更多</button>
          </div>
          <PlanCanvas
              floor={currentFloor}
              floors={floors}
              legacyRooms={floorLegacyRooms}
              legacyWalls={floorLegacyWalls}
              furniture={usesUnifiedCourtyard3D ? unifiedCourtyardModel.furniture : floorFurniture}
              drawingItems={usesUnifiedCourtyard3D ? courtyardScene.drawingItems : floorDrawingItems}
              constructionExportWorkspace={getCurrentWorkspace("manual")}
              dimensionVerificationConflictIds={verificationConflictIds}
              semanticObjects={floorSemanticObjects}
              selectedFurnitureId={selectedFurniture?.id ?? ""}
              selectedSemanticObjectId={selectedSemanticObjectId}
              sheetMode={sharedPlanCanvasMode}
              viewMode={viewMode}
              plannerMode={plannerMode}
              drawTool={drawTool}
              houseStructure={usesUnifiedCourtyard3D ? unifiedCourtyardModel.houseStructure : floorHouseStructure}
              wallSyncOverrides={wallSyncOverrides}
              floorPlanVisualSettings={floorPlanVisualSettings}
              cleanPatches={floorCleanPatches}
              focusMode={focusMode}
              furnitureImmersiveMode={isFurnitureWorkspace}
              drawingDrivenMode
              editorPresentationMode={editorDisplayMode === "presentation"}
              developerMode={editorDisplayMode === "edit" && developerMode}
              showAdvancedCanvasControls={editorDisplayMode === "edit" && showAdvancedCanvasControls}
              constructionPackageOpenRequest={constructionPackageOpenRequest}
              drawingItemCreationRequest={drawingItemCreationRequest}
              workspaceMutationAllowed={canMutateWorkspace && editorDisplayMode === "edit"}
              showFurnitureLabels={activeDrawingWorkspaceId !== "overview" && editorDisplayMode === "edit" && showFurnitureLabels}
              activeFurnitureId={activeFurniture?.id ?? ""}
              cameraViews={cameraViews}
              roomTourViews={derivedRoomTourViews}
              lightingDesign={lightingDesign}
              cameraViewFloorIds={usesUnifiedCourtyard3D ? courtyardViewFloorIds : undefined}
              cameraViewRequest={fixedCameraViewRequest}
              locateObjectRequest={locateObjectRequest}
              canUndo={Boolean(pendingHistoryBaseRef.current[selectedFloorId] || floorHistory.past.length)}
              canRedo={floorHistory.future.length > 0}
              onScaleChange={handleScaleChange}
              onSheetModeChange={handleSharedPlanCanvasModeChange}
              onSelectFloor={handleFloorChange}
              onActiveObjectChange={setActiveObjectId}
              onSelectStructureObject={handleStructureObjectSelect}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onPlannerModeChange={setPlannerMode}
              onDrawToolChange={setDrawTool}
              onHouseStructureChange={handleHouseStructureChange}
              onWallLengthChange={handleWallLengthChange}
              onWallSyncOverridesChange={handleWallSyncOverridesChange}
              onFloorPlanVisualSettingsChange={handleFloorPlanVisualSettingsChange}
              onCleanPatchesChange={handleCleanPatchesChange}
              onSelectFurniture={handleFurnitureSelect}
              onFurnitureChange={handleFloorFurnitureChange}
              onFurnitureDragEnd={handleFurnitureDragEnd}
              onDrawingItemsChange={handleFloorDrawingItemsChange}
              onGenerateDrawingItems={handleGenerateDrawingItems}
              onGenerateLightingDesign={handleGenerateLightingDesign}
              onShowFurnitureLabelsChange={setShowFurnitureLabels}
              onOpenWardrobeDesigner={openWardrobeDesigner}
              onOpenStairDesigner={openStairDesignPage}
              onSelectSemanticObject={handleSemanticObjectSelect}
              onMoveSemanticObject={handleMoveSemanticObject}
              onSelectCameraView={handleSelectFixedCameraView}
              onSceneSettingsChange={setShared3DSceneSettings}
            />
        </section>

        {activeEditorPanel && <aside className="fixed inset-y-0 right-0 z-[80] h-full min-h-0 w-[min(92vw,336px)] border-l border-stone-200 bg-white shadow-[-18px_0_48px_rgba(15,23,42,0.12)] lg:static lg:z-20 lg:w-auto lg:shadow-none">
          <RightPanelFrame
            activePanel={activeEditorPanel}
            title={activeDrawingWorkspace.name}
            onClose={() => setActiveEditorPanel(null)}
            onSelect={setActiveEditorPanel}
          >
          <div className="space-y-3">
            {focusMode && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-5 text-blue-900">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">户型沉浸</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700">{currentFloor.label}</span>
                </div>
                <p className="mt-2">画布保留最大操作面积，绘制工具在画布右侧，楼层、对象和状态仍在右侧菜单栏。</p>
                <button className="mt-3 w-full rounded-xl bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800" onClick={() => setFocusMode(false)} type="button">退出户型沉浸</button>
              </div>
            )}
            {activeEditorPanel === "ai" && <RightPanelCard
              id="floors"
              eyebrow="AI"
              title="AI 助手"
              summary={`${currentFloor.label} · ${activeDrawingWorkspace.name}`}
              open={openRightPanels.floors}
              onToggle={toggleRightPanel}
            >
              <div className="space-y-3">
                {!isFurnitureWorkspace && (
                  <div className="border-t border-stone-100 pt-3">
                      <p className="text-xs font-semibold text-ink">自然语言操作</p>
                      <textarea
                        className="mt-2 min-h-20 w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-clay"
                        placeholder="试试：添加一个沙发&#10;删除餐桌"
                        value={command}
                        onChange={(event) => setCommand(event.target.value)}
                        onKeyDown={(event) => {
                          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                            const text = command.trim();
                            if (text) {
                              handleNaturalCommand(text);
                              setCommand("");
                            }
                          }
                        }}
                      />
                      <button
                        className="mt-2 w-full rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-clay"
                        onClick={() => {
                          const text = command.trim();
                          if (!text) return;
                          handleNaturalCommand(text);
                          setCommand("");
                        }}
                        type="button"
                      >
                        执行
                      </button>
                  </div>
                )}
              </div>
            </RightPanelCard>}

            {isFurnitureWorkspace && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs leading-5 text-emerald-900">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">方案保存</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${draftSaveState.status === "error" ? "bg-red-100 text-red-700" : isPublishedCodeWorkspace || isCurrentDraftSaved ? "bg-white text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{draftSaveLabel}</span>
                </div>
                <p className={`mt-2 rounded-lg px-2 py-1 font-semibold ${isCurrentCodeVerified ? "bg-white text-emerald-800" : codeSaveState.status === "error" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{codeSaveLabel}</p>
                {showSeparateCodeDirty && <p className="mt-2 font-semibold text-amber-800">{unwrittenCodeLabel}</p>}
                <p className="mt-2 text-[11px] text-emerald-800/70">{codeWriteTargetLabel}</p>
                <p className="mt-2">页面修改先保存为浏览器草稿；只有代码文件写入并回读一致后，才会显示“代码已验证”。</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="rounded-xl bg-white px-3 py-2 font-semibold text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100 disabled:text-stone-300" disabled={localCodeFileStatus === "checking" || localCodeFileStatus === "syncing"} onClick={bindLocalCodeFile} type="button">{localCodeFileLabel}</button>
                  <button className={`rounded-xl px-3 py-2 font-semibold ring-1 ring-emerald-100 ${localCodeAutoSync ? "bg-emerald-700 text-white hover:bg-emerald-800" : "bg-white text-emerald-800 hover:bg-emerald-100"} disabled:bg-stone-100 disabled:text-stone-300`} disabled={!localCodeFileReady} onClick={toggleLocalCodeAutoSync} type="button">
                    自动写代码：{localCodeAutoSync ? "开" : "关"}
                  </button>
                </div>
                <button
                  className={`mt-3 w-full rounded-xl px-3 py-2 font-semibold ring-1 ring-emerald-100 ${
                    showFurnitureLabels ? "bg-emerald-700 text-white hover:bg-emerald-800" : "bg-white text-emerald-800 hover:bg-emerald-100"
                  }`}
                  onClick={() => setShowFurnitureLabels((visible) => !visible)}
                  type="button"
                >
                  家具标签：{showFurnitureLabels ? "显示中" : "已隐藏"}
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button className="rounded-xl bg-white px-3 py-2 font-semibold text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100" onClick={() => setFurnitureImmersiveMode(false)} type="button">退出家具沉浸</button>
                  <button className="rounded-xl bg-emerald-700 px-3 py-2 font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300" disabled={!hasLoadedWebWorkspace || codeSaveState.status === "saving" || Boolean(workspaceConflict)} onClick={solidifyDefaultWorkspace} type="button">保存到代码文件</button>
                </div>
              </div>
            )}

            {activeEditorPanel === "validation" && !isFurnitureWorkspace && <RightPanelCard
              id="status"
              eyebrow="Validator"
              title="检查"
              summary={`确定冲突 ${validationGroups.conflict.length} · 高风险 ${validationGroups.highRisk.length} · 待确认资料 ${validationGroups.pendingData.length}`}
              open={openRightPanels.status}
              onToggle={toggleRightPanel}
            >
              {developerMode && <div className="mb-3 border-b border-stone-100 pb-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className={draftSaveState.status === "error" ? "font-semibold text-red-700" : "font-semibold text-stone-600"}>{draftSaveLabel}</span>
                  <span className={isCurrentCodeVerified ? "font-semibold text-emerald-700" : codeSaveState.status === "error" ? "font-semibold text-red-700" : "font-semibold text-amber-700"}>{codeSaveLabel}</span>
                </div>
                {showSeparateCodeDirty && <p className="mt-2 font-semibold text-amber-700">{unwrittenCodeLabel}</p>}
                <p className="mt-2 text-[11px] text-stone-500">{codeWriteTargetLabel}</p>
                {(codeSaveState.filePath || codeSaveState.backupPath) && (
                  <div className="mt-2 space-y-1 text-[11px] leading-4 text-stone-500">
                    {codeSaveState.filePath && <p>目标：{codeSaveState.filePath}</p>}
                    {codeSaveState.backupPath && <p>备份：{codeSaveState.backupPath}</p>}
                  </div>
                )}
                {publishState.status !== "idle" && <p className="mt-2 text-[11px] text-stone-500">发布：{publishState.status === "pending" ? "进行中" : publishState.status === "published" ? "已发布" : "发布失败"}</p>}
                <div className={`mt-3 grid gap-2 ${IS_DEVELOPMENT ? "grid-cols-2" : "grid-cols-2"}`}>
                  <button className="rounded-lg bg-stone-100 px-2 py-1.5 font-semibold text-stone-600 hover:bg-stone-200" onClick={() => workspaceImportInputRef.current?.click()} type="button">导入</button>
                  <button className="rounded-lg bg-stone-100 px-2 py-1.5 font-semibold text-stone-600 hover:bg-stone-200" onClick={downloadWorkspace} type="button">导出</button>
                  {IS_DEVELOPMENT && <button className="rounded-lg bg-ink px-2 py-1.5 font-semibold text-white hover:bg-ink/90" onClick={() => void runSaveSelfCheck()} type="button">保存自检</button>}
                  {IS_DEVELOPMENT && <button className="rounded-lg bg-stone-800 px-2 py-1.5 font-semibold text-white hover:bg-stone-700" onClick={() => setValidatorRepairLog(referenceReport.issues.length ? referenceReport.issues.map((issue) => `${issue.severity === "error" ? "错误" : "警告"} · ${issue.objectId} · ${issue.path} = ${issue.value ?? "未绑定"} · ${issue.message} 建议：${issue.suggestion}`) : ["引用完整性自检通过：当前没有断链或引用警告。"]) } type="button">引用自检</button>}
                </div>
                {IS_DEVELOPMENT && saveSelfCheckResult.status !== "idle" && (
                  <div className="mt-3 border-t border-stone-100 pt-3">
                    <p className={`font-semibold ${saveSelfCheckResult.status === "equal" ? "text-emerald-700" : saveSelfCheckResult.status === "error" ? "text-red-700" : "text-amber-700"}`}>{saveSelfCheckResult.message}</p>
                    {saveSelfCheckResult.status === "different" && saveSelfCheckResult.difference && (
                      <div className="mt-2 space-y-1 rounded-lg bg-slate-50 p-2 text-[11px] leading-4 text-slate-600">
                        <p>楼层：{saveSelfCheckResult.difference.floorsMatch ? "一致" : `${saveSelfCheckResult.difference.pageStats.floorIds.join("、")} / 代码 ${saveSelfCheckResult.difference.codeStats.floorIds.join("、")}`}</p>
                        <p>模块数量：页面 {saveSelfCheckResult.difference.pageStats.moduleCount} / 代码 {saveSelfCheckResult.difference.codeStats.moduleCount}</p>
                        <p>语义对象：页面 {saveSelfCheckResult.difference.pageStats.semanticObjectCount} / 代码 {saveSelfCheckResult.difference.codeStats.semanticObjectCount}</p>
                        <p>视角数量：页面 {saveSelfCheckResult.difference.pageStats.cameraViewCount} / 代码 {saveSelfCheckResult.difference.codeStats.cameraViewCount}</p>
                        <p>新增对象 ID：{saveSelfCheckResult.difference.addedObjectIds.join("、") || "无"}</p>
                        <p>删除对象 ID：{saveSelfCheckResult.difference.removedObjectIds.join("、") || "无"}</p>
                        <p>位置不同：{saveSelfCheckResult.difference.positionChangedObjectIds.join("、") || "无"}</p>
                        <p>尺寸不同：{saveSelfCheckResult.difference.sizeChangedObjectIds.join("、") || "无"}</p>
                        <p>材质不同：{saveSelfCheckResult.difference.materialChangedObjectIds.join("、") || "无"}</p>
                        <p>mepMeta 不同：{saveSelfCheckResult.difference.mepMetaChangedObjectIds.join("、") || "无"}</p>
                        <p>constructionMeta 不同：{saveSelfCheckResult.difference.constructionMetaChangedObjectIds.join("、") || "无"}</p>
                        <p>仅页面字段：{saveSelfCheckResult.difference.pageOnlyFields.join("、") || "无"}</p>
                        <p>仅代码字段：{saveSelfCheckResult.difference.codeOnlyFields.join("、") || "无"}</p>
                      </div>
                    )}
                    {(saveSelfCheckResult.status === "equal" || saveSelfCheckResult.status === "different") && (
                      <div className="mt-3 grid gap-2">
                        <button className="rounded-lg bg-red-50 px-2 py-1.5 font-semibold text-red-700 hover:bg-red-100" onClick={() => setConfirmSelfCheckOverwrite(true)} type="button">用当前页面状态覆盖 data/default-workspace.json</button>
                        <button className="rounded-lg bg-stone-100 px-2 py-1.5 font-semibold text-stone-600 hover:bg-stone-200" onClick={downloadWorkspace} type="button">导出当前页面 JSON</button>
                        <button className="rounded-lg bg-stone-100 px-2 py-1.5 font-semibold text-stone-600 hover:bg-stone-200" onClick={() => void reloadCodeWorkspaceFromSelfCheck()} type="button">重新加载代码文件版本</button>
                      </div>
                    )}
                    {confirmSelfCheckOverwrite && (
                      <div className="mt-3 border border-red-200 bg-red-50 p-2 text-red-800">
                        <p className="font-semibold">确认覆盖？本机服务会先生成备份，再写入并回读验证。</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button className="rounded-lg bg-white px-2 py-1.5 font-semibold" onClick={() => setConfirmSelfCheckOverwrite(false)} type="button">取消</button>
                          <button className="rounded-lg bg-red-700 px-2 py-1.5 font-semibold text-white" onClick={() => void confirmOverwriteFromSelfCheck()} type="button">确认覆盖并验证</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>}
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${validationGroups.conflict.length + validationGroups.systemError.length === 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {validationGroups.conflict.length + validationGroups.systemError.length === 0 ? "没有确定冲突" : "存在确定冲突或系统异常"}
                </span>
                <button className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink/90" onClick={handleAutoRepairHouse} type="button">
                  安全补齐资料
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {([
                  ["确定冲突", validationGroups.conflict.length, "bg-red-50 text-red-700"],
                  ["高风险", validationGroups.highRisk.length, "bg-amber-50 text-amber-700"],
                  ["待确认资料", validationGroups.pendingData.length, "bg-blue-50 text-blue-700"],
                  ["建议优化", validationGroups.suggestion.length, "bg-stone-100 text-stone-700"],
                  ["系统数据异常", validationGroups.systemError.length, "bg-fuchsia-50 text-fuchsia-700"]
                ] as Array<[string, number, string]>).map(([label, count, tone]) => <div key={label} className={`rounded-xl px-3 py-2 ${tone}`}><p className="font-semibold">{count}</p><p>{label}</p></div>)}
              </div>
              <div className="mt-3 max-h-[30rem] space-y-4 overflow-auto pr-1">
                {([
                  ["确定冲突", validationGroups.conflict, "border-red-100 bg-red-50/60"],
                  ["高风险", validationGroups.highRisk, "border-amber-100 bg-amber-50/60"],
                  ["待确认资料", validationGroups.pendingData, "border-blue-100 bg-blue-50/60"],
                  ["建议优化", validationGroups.suggestion, "border-stone-200 bg-stone-50"],
                  ["系统数据异常", validationGroups.systemError, "border-fuchsia-100 bg-fuchsia-50/60"]
                ] as const).map(([label, findings, tone]) => findings.length > 0 && <section key={label}>
                  <p className="mb-2 text-[11px] font-semibold text-stone-500">{label} · {findings.length}</p>
                  <div className="space-y-2">{findings.map((finding) => (
                    <button key={`${finding.ruleId}-${finding.objectId}-${finding.relatedObjectIds?.join("-") ?? ""}`} className={`block w-full rounded-xl border p-2.5 text-left text-xs leading-5 text-slate-600 transition hover:border-blue-200 ${tone}`} onClick={() => locateValidationObject(finding.objectId)} type="button">
                      <p className="font-semibold text-ink">{finding.title}</p>
                      <p className="text-[10px] font-semibold text-stone-400">{finding.floorId ?? selectedFloorId}{finding.roomId ? ` · ${finding.roomId}` : ""} · {finding.category} · {finding.ruleId}</p>
                      <p>{finding.message}</p>
                      {(finding.actualValue || finding.requiredValue) && <p className="mt-1 text-stone-600">{finding.actualValue && `实际：${finding.actualValue}`}{finding.actualValue && finding.requiredValue ? " · " : ""}{finding.requiredValue && `要求：${finding.requiredValue}`}</p>}
                      {finding.checkPosition && <p className="text-stone-500">检查位置：{finding.checkPosition}</p>}
                      {finding.suggestion && <p className="text-stone-500">建议：{finding.suggestion}</p>}
                      {(finding.derivedMessages?.length ?? 0) > 1 && <p className="text-stone-400">同一根因已合并 {finding.derivedMessages?.length} 条相关消息</p>}
                      <p className="mt-1 font-semibold text-blue-600">定位对象 <span className="font-normal text-stone-400">{finding.objectId}</span></p>
                    </button>
                  ))}</div>
                </section>)}
                {validationFindings.length === 0 && <p className="rounded-xl bg-slate-50 p-2 text-xs leading-5 text-slate-500">当前工作区未发现需要处理的问题。</p>}
              </div>
              {validatorRepairLog.length > 0 && (
                <div className="mt-3 max-h-56 space-y-1 overflow-auto rounded-xl bg-slate-50 p-2 pr-1 text-xs leading-5 text-slate-600">
                  <p className="font-semibold text-ink">修复记录</p>
                  {validatorRepairLog.map((item, index) => (
                    <p key={`${item}-${index}`}>{item}</p>
                  ))}
                </div>
              )}
            </RightPanelCard>
            }

            {isFurnitureWorkspace && (
              <section className="border-b border-stone-200 bg-white px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-emerald-700">Style</p>
                    <h3 className="mt-1 text-sm font-semibold text-ink">现代自然风方案</h3>
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">{modernNaturalPreview.adjustable} 可调整</span>
                </div>
                <div className="mt-3 grid grid-cols-3 rounded-lg bg-stone-100 p-1">
                  {(["room", "floor", "house"] as const).map((scopeType) => (
                    <button key={scopeType} className={`rounded-md px-2 py-1.5 text-[11px] font-semibold ${modernNaturalScopeType === scopeType ? "bg-white text-ink shadow-sm" : "text-stone-500"}`} disabled={scopeType === "room" && !activeFurniture} onClick={() => setModernNaturalScopeType(scopeType)} type="button">
                      {scopeType === "room" ? "当前房间" : scopeType === "floor" ? "当前楼层" : "全屋"}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                  <span>调整 {modernNaturalPreview.adjustable}</span><span>保留 {modernNaturalPreview.skipped}</span>
                </div>
                <button className="mt-3 w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:bg-stone-300" disabled={!canMutateWorkspace || modernNaturalPreview.adjustable === 0} onClick={handleApplyModernNaturalStyle} type="button">应用现代自然风</button>
                {modernNaturalAction && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button className="rounded-lg bg-stone-100 px-2 py-2 text-[11px] font-semibold text-stone-700 disabled:text-stone-300" disabled={modernNaturalAction.status !== "applied"} onClick={handleUndoModernNaturalStyle} type="button">撤销本次应用</button>
                    <button className="rounded-lg bg-stone-100 px-2 py-2 text-[11px] font-semibold text-stone-700 disabled:text-stone-300" disabled={modernNaturalAction.status !== "undone"} onClick={handleRedoModernNaturalStyle} type="button">重做本次应用</button>
                  </div>
                )}
              </section>
            )}

            {activeEditorPanel === "resources" && <RightPanelCard
              id="modules"
              eyebrow="Library"
              title={`${activeDrawingWorkspace.shortName}资源`}
              summary={activeDrawingWorkspace.category === "furniture" ? `${interiorModuleCatalog.length} 个模块 · ${moduleTargetLabel}` : `${activeDrawingWorkspace.resourceGroups.length} 个资源组`}
              open={openRightPanels.modules}
              onToggle={toggleRightPanel}
            >
              {activeDrawingWorkspace.category === "furniture" ? <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                  <span className="font-semibold text-ink">目标</span>
                  <span className="ml-2">{moduleTargetLabel}</span>
                </div>
                {visibleModuleCatalogGroups.map(({ category, items }) => {
                  const isOpen = openModuleCategories[category];
                  const placedCount = floorFurnitureByCategory[category] ?? 0;
                  return (
                    <div key={category} className="rounded-xl border border-stone-200 bg-white">
                      <button
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-stone-50"
                        onClick={() => toggleModuleCategory(category)}
                        type="button"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-ink">{interiorModuleCategoryLabels[category]}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-stone-500">{items.length} 个模块 · 当前楼层已放 {placedCount}</span>
                        </span>
                        <span className={`grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-stone-500 transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
                      </button>
                      {isOpen && (
                        <div className="space-y-2 border-t border-stone-100 p-2">
                          {items.map((item) => {
                            const activeServices = serviceRequirementLabels.filter((service) => item.serviceRequirements[service.key]);
                            return (
                              <div key={item.id} className="rounded-lg bg-slate-50 p-2">
                                <div className="flex items-start gap-2">
                                  <FurnitureTopView
                                    assetType={item.render3d?.assetType as Render3DAssetType | undefined}
                                    variantId={item.render3d?.variantId}
                                    className="mt-0.5 h-16 w-20 shrink-0 border border-white shadow-sm"
                                    color={item.color}
                                    footprint={item.dimensions}
                                    label={item.codePrefix}
                                    stretchToFill
                                    type={item.furnitureType}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold text-ink">{item.name}</p>
                                        <p className="mt-0.5 text-[11px] text-stone-500">{item.dimensions.width} x {item.dimensions.depth} x {item.dimensions.height} cm</p>
                                      </div>
                                      <button className="shrink-0 rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-ink/90" onClick={() => addModuleFromCatalog(item)} type="button">
                                        添加
                                      </button>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {(activeServices.length ? activeServices : [{ key: "power" as const, label: "无机电" }]).map((service) => (
                                        <span key={`${item.id}-${service.label}`} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                                          {service.label}
                                        </span>
                                      ))}
                                    </div>
                                    {item.cabinetDesign && (
                                      <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-stone-500">{item.cabinetDesign.designThinking}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div> : <div className="space-y-3">
                <p className="rounded-xl bg-stone-100 p-3 text-xs leading-5 text-stone-600">资源已按“{activeDrawingWorkspace.name}”过滤，只显示当前工作区需要的类型。</p>
                <div className="grid grid-cols-2 gap-2">
                  {activeDrawingWorkspace.resourceGroups.map((group) => <button key={group} className="rounded-xl border border-stone-200 bg-white px-3 py-4 text-left text-xs font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-stone-50" type="button"><span className="mb-3 grid size-8 place-items-center rounded-lg bg-stone-100 text-stone-500">▤</span>{group}</button>)}
                </div>
                {activeDrawingWorkspace.resourceGroups.length === 0 ? <p className="py-10 text-center text-xs text-stone-400">当前工作区没有独立资源库，可直接使用左侧工具。</p> : null}
                <div className="border-t border-stone-200 pt-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">当前工作区工具</p>
                  <div className="space-y-1">{activeDrawingWorkspace.tools.filter((toolConfig) => toolConfig.drawingPreset).map((toolConfig) => <button key={toolConfig.id} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-stone-700 hover:bg-stone-100" onClick={() => handleWorkspaceToolSelect(toolConfig)} type="button"><span className="grid size-7 place-items-center rounded-md bg-stone-100">{toolConfig.icon}</span><span>{toolConfig.label}</span></button>)}</div>
                </div>
              </div>}
            </RightPanelCard>}

            {activeEditorPanel === "properties" && <RightPanelCard
              id="object"
              eyebrow="Selection"
              title="当前对象"
              summary={activeObjectSummary}
              open={openRightPanels.object}
              onToggle={toggleRightPanel}
            >
              {developerMode && !isFurnitureWorkspace && (
                <div className="mb-4 border-b border-stone-200 pb-4">
                  <div className="flex items-end justify-between gap-3">
                    <label className="min-w-0 flex-1 text-xs text-stone-500">
                      尺寸复核筛选
                      <select
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400"
                        value={verificationFilter}
                        onChange={(event) => setVerificationFilter(event.target.value as VerificationDisplayState | "all" | "unconfirmed")}
                      >
                        <option value="unconfirmed">全部待复核</option>
                        <option value="pending-site">待现场测量</option>
                        <option value="drawing-estimated">按图估算</option>
                        <option value="confirmed">已确认</option>
                        <option value="conflict">存在冲突</option>
                        <option value="all">全部对象</option>
                      </select>
                    </label>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-stone-600">{filteredVerificationEntries.length}</span>
                  </div>
                  <div className="mt-2 max-h-56 space-y-1 overflow-auto pr-1">
                    {filteredVerificationEntries.map((entry) => {
                      const displayState = getVerificationDisplayState(entry.object.verificationMeta, verificationConflictIds.has(entry.object.id));
                      return (
                        <button
                          key={`${entry.floorId}-${entry.object.id}`}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${activeObjectId === entry.object.id ? "bg-blue-50 ring-1 ring-blue-200" : "bg-slate-50 hover:bg-stone-100"}`}
                          onClick={() => locateVerificationEntry(entry)}
                          type="button"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink">{entry.floorId} · {entry.object.name}</span>
                            <span className="mt-0.5 block truncate text-stone-500">{verificationCollectionLabels[entry.collection]} · {entry.object.id}</span>
                          </span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            displayState === "confirmed" ? "bg-green-100 text-green-800" :
                            displayState === "conflict" ? "bg-red-100 text-red-800" :
                            displayState === "drawing-estimated" ? "bg-amber-100 text-amber-800" :
                            "bg-stone-200 text-stone-700"
                          }`}>{verificationDisplayStateLabels[displayState]}</span>
                        </button>
                      );
                    })}
                    {filteredVerificationEntries.length === 0 && <p className="py-3 text-center text-xs text-stone-500">当前筛选没有对象</p>}
                  </div>
                </div>
              )}
              {(activeDrawingItem || activeStructureObject || activeFurniture || (!isFurnitureWorkspace && floorStructureRooms.length > 0)) ? (
                <div>
                  {developerMode && activeObjectId && <p className="break-all rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">{activeObjectId}</p>}
                  {(activeDrawingItem || activeStructureObject || activeFurniture) && <div className="mb-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">数据可信度</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${activeCredibility.status === "confirmed" || activeCredibility.status === "site-measured" ? "bg-emerald-100 text-emerald-800" : activeCredibility.status === "unverified" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>{activeCredibility.label}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-stone-600">{activeCredibility.source}</p>
                    <p className="mt-1 text-[10px] text-stone-400">该状态只描述数据来源，不改变对象的尺寸、几何或可见性。</p>
                  </div>}
                  {!activeDrawingItem && !isFurnitureWorkspace && floorStructureRooms.length > 0 && (
                    <label className="mt-3 block text-xs text-stone-500">
                      房间快速选择
                      <select
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400"
                        value={activeRoomObject?.id ?? ""}
                        onChange={(event) => selectRoomForNaming(event.target.value)}
                      >
                        <option value="">选择当前楼层房间</option>
                        {floorStructureRooms.map((room) => (
                          <option key={room.id} value={room.id}>{room.roomNumber} · {room.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {activeDrawingItem ? (
                    <div className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">{drawingItemCategoryLabels[activeDrawingItem.category]}</p>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-900">{activeDrawingItem.label}</p>
                        </div>
                        <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-semibold text-stone-500">{activeDrawingItem.status === "confirmed" ? "已确认" : activeDrawingItem.status === "todo" ? "待确认" : activeDrawingItem.status === "deprecated" ? "已废弃" : "草稿"}</span>
                      </div>
                      <label className="block text-xs font-semibold text-stone-500">名称<input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-500" value={activeDrawingItem.label} onChange={(event) => updateActiveObject({ label: event.target.value })} /></label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block text-xs font-semibold text-stone-500">类型<input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-500" value={activeDrawingItem.type} onChange={(event) => updateActiveObject({ type: event.target.value, lightType: activeDrawingItem.category === "light" ? event.target.value : activeDrawingItem.lightType })} /></label>
                        <label className="block text-xs font-semibold text-stone-500">数量<input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-500" min="1" type="number" value={activeDrawingItem.quantity} onChange={(event) => updateActiveObject({ quantity: Math.max(1, Number(event.target.value) || 1) })} /></label>
                        <label className="block text-xs font-semibold text-stone-500">安装高度<input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-500" placeholder="mm" type="number" value={activeDrawingItem.heightMm ?? ""} onChange={(event) => updateActiveObject({ heightMm: event.target.value ? Number(event.target.value) : null })} /></label>
                        <label className="block text-xs font-semibold text-stone-500">状态<select className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-500" value={activeDrawingItem.status} onChange={(event) => updateActiveObject({ status: event.target.value })}><option value="draft">草稿</option><option value="confirmed">已确认</option><option value="todo">待确认</option><option value="deprecated">已废弃</option></select></label>
                      </div>
                      <label className="block text-xs font-semibold text-stone-500">所属房间<select className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-500" value={activeDrawingItem.roomId ?? ""} onChange={(event) => updateActiveObject({ roomId: event.target.value || null, relatedRoomId: event.target.value || null })}><option value="">未关联</option>{[...floorHouseStructure.rooms, ...floorHouseStructure.outdoors].map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
                      {activeDrawingItem.category === "light" && <div className="grid grid-cols-2 gap-2 rounded-lg bg-amber-50 p-2"><label className="block text-xs font-semibold text-amber-800">色温<input className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-2 py-2 text-sm text-slate-900" value={activeDrawingItem.colorTemperature ?? activeDrawingItem.lightColorTemperature ?? ""} onChange={(event) => updateActiveObject({ colorTemperature: event.target.value || null, lightColorTemperature: event.target.value || null })} /></label><label className="block text-xs font-semibold text-amber-800">光束角<input className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-2 py-2 text-sm text-slate-900" type="number" value={activeDrawingItem.beamAngle ?? ""} onChange={(event) => updateActiveObject({ beamAngle: event.target.value ? Number(event.target.value) : null })} /></label></div>}
                      <label className="block text-xs font-semibold text-stone-500">施工备注<textarea className="mt-1 min-h-20 w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500" value={activeDrawingItem.notes} onChange={(event) => updateActiveObject({ notes: event.target.value })} /></label>
                    </div>
                  ) : activeRoomObject ? (
                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-blue-900">房间命名</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700">{(activeRoomObject.area / 1_000_000).toFixed(2)} m2</span>
                      </div>
                      <label className="mt-3 block text-xs text-stone-500">
                        房间编号
                        <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" placeholder="例如：R-1F-002" value={activeRoomObject.roomNumber} onChange={(event) => updateActiveObject({ roomNumber: event.target.value })} />
                      </label>
                      <label className="mt-3 block text-xs text-stone-500">
                        房间名称
                        <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" placeholder="例如：厨房" value={activeRoomObject.name} onChange={(event) => updateActiveObject({ name: event.target.value })} />
                      </label>
                      <p className="mt-2 text-xs leading-5 text-blue-800">输入后会在房间标签和对象台账里同步显示，改完记得固化默认户型。</p>
                    </div>
	                  ) : activeFurniture ? (
	                    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
	                      {activeFurniturePlacementWarnings.length > 0 && (
	                        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2">
	                          <div className="flex items-center justify-between gap-2">
	                            <p className="text-xs font-semibold text-amber-900">定位检查</p>
	                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-800">{activeFurniturePlacementWarnings.length} 项提醒</span>
	                          </div>
	                          <div className="mt-2 grid gap-1">{activeFurniturePlacementWarnings.slice(0, 8).map((warning) => <p key={`${warning.code}-${warning.relatedObjectId ?? "self"}`} className="text-[11px] leading-4 text-amber-900">{warning.message}</p>)}</div>
	                        </div>
	                      )}
	                      <details className="overflow-hidden rounded-xl border border-emerald-100 bg-white/75" open>
	                        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-ink [&::-webkit-details-marker]:hidden">基础信息</summary>
	                        <div className="border-t border-emerald-100 p-3">
	                      <div className="flex items-center gap-3">
		                        <FurnitureTopView className="size-16 shrink-0 border border-white shadow-sm" color={activeFurniture.color} imageSrc={activeFurniture.referenceImageDataUrl} label={developerMode ? activeFurniture.code : activeFurniture.name.slice(0, 2)} type={activeFurniture.type} />
	                        <div className="min-w-0">
	                          <p className="text-xs font-semibold text-emerald-900">{activeFurniture.moduleCategory ? "物品模块" : "家具对象"}</p>
	                          <p className="mt-1 truncate text-sm font-semibold text-ink">{activeFurniture.name}</p>
	                          <p className="mt-1 text-xs font-semibold text-emerald-800">占地 {activeFurnitureArea} 平米 · 角度 {Math.round(activeFurniture.position.rotation)}°</p>
	                        </div>
	                      </div>
	                      <label className="mt-3 block text-xs text-stone-500">
	                        名称
	                        <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100 disabled:text-stone-400" disabled={activeFurniture.locked} value={activeFurniture.name} onChange={(event) => updateActiveObject({ name: event.target.value })} />
	                      </label>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            className={`rounded-lg px-3 py-2 text-xs font-semibold ${activeFurniture.locked ? "bg-amber-600 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"}`}
                            onClick={() => handleFloorFurnitureChange(floorFurniture.map((item) => item.id === activeFurniture.id ? { ...item, locked: !item.locked } : item))}
                            type="button"
                          >
                            {activeFurniture.locked ? "已锁定" : "锁定"}
                          </button>
                          <button
                            className={`rounded-lg px-3 py-2 text-xs font-semibold ${activeFurniture.hidden ? "bg-stone-700 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"}`}
                            onClick={() => handleFloorFurnitureChange(floorFurniture.map((item) => item.id === activeFurniture.id ? { ...item, hidden: !item.hidden, visible: item.hidden ? true : item.visible } : item))}
                            type="button"
                          >
                            {activeFurniture.hidden ? "已隐藏" : "隐藏"}
                          </button>
                        </div>
	                      <div className="mt-3 rounded-xl bg-white/70 p-2">
	                        <div className="flex items-center justify-between gap-2">
	                          <p className="text-xs font-semibold text-ink">真实家具图片</p>
	                          {activeFurniture.referenceImageDataUrl && (
	                            <button
	                              className="rounded-lg bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-200"
	                              onClick={() => updateActiveFurniture((item) => ({
	                                ...item,
	                                referenceImageDataUrl: undefined,
	                                referenceImageName: undefined,
	                                recognitionStatus: "none",
	                                recognitionNote: undefined
	                              }))}
	                              type="button"
	                            >
	                              移除
	                            </button>
	                          )}
	                        </div>
	                        {activeFurniture.referenceImageDataUrl ? (
	                          <div className="mt-2 overflow-hidden rounded-lg border border-stone-200 bg-white">
	                            <img alt={activeFurniture.referenceImageName ?? activeFurniture.name} className="max-h-32 w-full object-contain" src={activeFurniture.referenceImageDataUrl} />
	                          </div>
	                        ) : (
	                          <p className="mt-2 text-[11px] leading-4 text-stone-500">上传你想买的实物图后，平面图会优先显示这张图片。</p>
	                        )}
	                        <label className="mt-2 block cursor-pointer rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
	                          上传图片 / AI 识别入口
	                          <input
	                            accept="image/*"
	                            className="hidden"
	                            disabled={activeFurniture.locked}
	                            onChange={(event) => {
	                              void handleActiveFurnitureImageUpload(event.target.files?.[0]);
	                              event.currentTarget.value = "";
	                            }}
	                            type="file"
	                          />
	                        </label>
	                        <p className="mt-2 text-[11px] leading-4 text-stone-500">
	                          {activeFurniture.recognitionNote ?? "当前先保存图片并作为模型中的平面参考；接入 AI 后可自动抠出家具轮廓并给 3D 预览使用。"}
	                        </p>
	                      </div>
	                        </div>
	                      </details>
	                      <details className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white/75" open>
	                        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-ink [&::-webkit-details-marker]:hidden">尺寸位置</summary>
	                        <div className="border-t border-stone-100 p-3">
		                      <div className="grid grid-cols-3 gap-2">
	                        {furnitureDimensionFields.map(([field, label]) => (
	                          <label key={field} className="block text-xs text-stone-500">
	                            {label}
	                            <input
	                              className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100 disabled:text-stone-400"
	                              disabled={activeFurniture.locked}
	                              min="1"
	                              type="number"
	                              value={activeFurniture.dimensions[field]}
	                              onChange={(event) => updateActiveObject({
	                                dimensions: {
	                                  ...activeFurniture.dimensions,
	                                  [field]: Math.max(1, Math.round(Number(event.target.value)) || 1)
	                                }
	                              })}
	                            />
	                          </label>
	                        ))}
	                      </div>
	                      <div className="mt-3 rounded-xl bg-white/70 p-2">
	                        <p className="text-xs font-semibold text-ink">移动</p>
	                        <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
	                          <span />
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => nudgeActiveFurniture({ x: 0, y: -1 })} type="button">上</button>
	                          <span />
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => nudgeActiveFurniture({ x: -1, y: 0 })} type="button">左</button>
	                          <span className="rounded-lg bg-slate-900 px-2 py-2 text-center font-semibold text-white">选</span>
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => nudgeActiveFurniture({ x: 1, y: 0 })} type="button">右</button>
	                          <span />
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => nudgeActiveFurniture({ x: 0, y: 1 })} type="button">下</button>
	                          <span />
	                        </div>
	                      </div>
		                      <div className="mt-3 rounded-xl bg-white/70 p-2">
		                        <p className="text-xs font-semibold text-ink">旋转 / 翻转</p>
		                        <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => rotateActiveFurniture(-15)} type="button">-15</button>
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => rotateActiveFurniture(15)} type="button">+15</button>
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => rotateActiveFurniture(-90)} type="button">-90</button>
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => rotateActiveFurniture(90)} type="button">+90</button>
	                          <button className={`col-span-2 rounded-lg px-2 py-2 font-semibold disabled:opacity-40 ${activeFurniture.position.flipX ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`} disabled={activeFurniture.locked} onClick={() => flipActiveFurniture("x")} type="button">左右翻转</button>
		                          <button className={`col-span-2 rounded-lg px-2 py-2 font-semibold disabled:opacity-40 ${activeFurniture.position.flipY ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`} disabled={activeFurniture.locked} onClick={() => flipActiveFurniture("y")} type="button">前后翻转</button>
		                        </div>
		                      </div>
	                        </div>
	                      </details>
                      {activeFurniture.cabinetDesign && (
                        <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/80 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-amber-900">{activeFurniture.cabinetDesign.title}</p>
                              <p className="mt-1 text-xs leading-5 text-amber-950">{activeFurniture.cabinetDesign.designThinking}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700">柜体方案</span>
                          </div>
                          <p className="mt-3 text-[11px] leading-4 text-amber-800">建议位置：{activeFurniture.cabinetDesign.recommendedPlacement}</p>
                          <div className="mt-3 rounded-lg border border-amber-200 bg-white/80 p-2">
                            <p className="text-[11px] font-semibold text-amber-900">关联施工需求点 · {activeFurnitureDrawingItems.length}</p>
                            <div className="mt-2 grid gap-1">{activeFurnitureDrawingItems.length ? activeFurnitureDrawingItems.map((item) => <p key={item.id} className="text-[11px] leading-4 text-stone-600"><span className="font-semibold text-ink">{drawingItemCategoryLabels[item.category]}</span> · {item.label} · x{item.quantity}{item.heightMm ? ` · H${item.heightMm}` : ""} · {item.status}</p>) : <p className="text-[11px] text-stone-500">暂无关联插座、灯带电源、给排水或检修口。</p>}</div>
                          </div>
                          <div className="mt-2 grid gap-1 rounded-lg bg-amber-100/70 p-2 text-[11px] leading-4 text-amber-950">
                            <p><span className="font-semibold">MEP：</span>{[
                              activeFurniture.mepMeta?.needsSocket ? `插座 x${activeFurniture.mepMeta.socketCount ?? 1}` : "",
                              activeFurniture.mepMeta?.needsLighting ? "灯带/照明电源" : "",
                              activeFurniture.mepMeta?.needsWaterSupply ? "给水" : "",
                              activeFurniture.mepMeta?.needsDrainage ? "排水" : ""
                            ].filter(Boolean).join("；") || "暂无"}</p>
                            <p><span className="font-semibold">施工：</span>{activeFurniture.constructionMeta?.notes || activeFurniture.constructionNote || activeFurniture.note || "现场复核"}</p>
                            {activeFurniture.constructionMeta?.inspectionAccessRequired && <p className="font-semibold">需预留检修口</p>}
                          </div>
                          <div className="mt-3 space-y-2">
                            {activeFurniture.cabinetDesign.zones.map((zone) => (
                              <div key={zone.id} className="rounded-lg bg-white/80 p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-ink">{zone.label}</p>
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{zone.role}</span>
                                </div>
                                <p className="mt-1 text-[11px] leading-4 text-stone-600">{zone.detail}</p>
                                {zone.serviceNote && <p className="mt-1 text-[11px] font-semibold leading-4 text-blue-700">{zone.serviceNote}</p>}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 grid gap-2 text-[11px] leading-4 text-amber-900">
                            {activeFurniture.cabinetDesign.layoutNotes.map((note) => (
                              <p key={`layout-${note}`} className="rounded-lg bg-white/65 px-2 py-1.5">{note}</p>
                            ))}
                            {activeFurniture.cabinetDesign.cautionNotes.map((note) => (
                              <p key={`caution-${note}`} className="rounded-lg bg-white/65 px-2 py-1.5 font-semibold">{note}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {activeFurniture.cabinetDesign && (
                        <button
                          className="mt-3 w-full rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                          onClick={() => openFurnitureDesignPage(activeFurniture.id)}
                          type="button"
                        >
                          {getFurnitureDesignButtonLabel(activeFurniture)}
                        </button>
                      )}
	                      {(activeFurniture.type === "wardrobe" || activeFurniture.moduleType === "wardrobe") && (
	                        <button
	                          className="mt-3 w-full rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
	                          onClick={() => openWardrobeDesigner(activeFurniture.id)}
	                          type="button"
	                        >
	                          进入衣柜设计
	                        </button>
	                      )}
	                      <details className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white/75">
	                        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-ink [&::-webkit-details-marker]:hidden">材质风格</summary>
	                        <div className="border-t border-stone-100 p-3">
		                      <label className="block text-xs text-stone-500">
                            颜色
                            <div className="mt-1 flex items-center gap-2">
                              <input className="h-10 w-14 rounded-lg border border-stone-200 bg-white p-1 disabled:bg-stone-100" disabled={activeFurniture.locked} type="color" value={activeFurniture.color} onChange={(event) => updateActiveObject({ color: event.target.value })} />
                              <input className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100 disabled:text-stone-400" disabled={activeFurniture.locked} value={activeFurniture.color} onChange={(event) => updateActiveObject({ color: event.target.value })} />
                            </div>
                          </label>
                          <label className="mt-3 block text-xs text-stone-500">
                            材质
                            <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100 disabled:text-stone-400" disabled={activeFurniture.locked} value={activeFurniture.material} onChange={(event) => updateActiveObject({ material: event.target.value })} />
                          </label>
	                        </div>
	                      </details>
	                      <FurnitureMetadataEditor
	                        disabled={activeFurniture.locked}
	                        drawingItems={floorDrawingItems}
	                        furniture={activeFurniture}
	                        structure={floorHouseStructure}
	                        onChange={(nextFurniture) => updateActiveFurniture(() => nextFurniture)}
	                        onDrawingItemsChange={handleFloorDrawingItemsChange}
	                        onLocateDrawingItem={handleLocateDrawingItem}
	                      />
                    </div>
                  ) : activeStructureObject ? (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`rounded-lg px-3 py-2 text-xs font-semibold ${activeStructureObject.locked ? "bg-amber-600 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"}`}
                          onClick={() => updateActiveObject({ locked: !activeStructureObject.locked })}
                          type="button"
                        >
                          {activeStructureObject.locked ? "已锁定" : "锁定"}
                        </button>
                        <button
                          className={`rounded-lg px-3 py-2 text-xs font-semibold ${activeStructureObject.hidden ? "bg-stone-700 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"}`}
                          onClick={() => updateActiveObject({ hidden: !activeStructureObject.hidden, visible: activeStructureObject.hidden ? true : activeStructureObject.visible })}
                          type="button"
                        >
                          {activeStructureObject.hidden ? "已隐藏" : "隐藏"}
                        </button>
                      </div>
                      <label className="block text-xs text-stone-500">
                        名称
                        <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" value={activeStructureObject.name} onChange={(event) => updateActiveObject({ name: event.target.value })} />
                      </label>
                      {activeVerificationTarget && (
                        <DimensionVerificationEditor
                          disabled={!canMutateWorkspace || Boolean(activeVerificationTarget.object.locked)}
                          hasConflict={verificationConflictIds.has(activeVerificationTarget.object.id)}
                          value={normalizeVerificationMeta(activeVerificationTarget.object.verificationMeta, activeVerificationTarget.collection)}
                          onChange={(verificationMeta) => updateActiveObject({ verificationMeta })}
                        />
                      )}
                      {"surfaceType" in activeStructureObject && (
                        <>
                          <label className="block text-xs text-stone-500">
                            标签
                            <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-emerald-400" value={activeStructureObject.label ?? activeStructureObject.name} onChange={(event) => updateActiveObject({ label: event.target.value })} />
                          </label>
                          <label className="block text-xs text-stone-500">
                            铺装材料
                            <select
                              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-semibold text-ink outline-none focus:border-emerald-400"
                              value={activeStructureObject.material}
                              onChange={(event) => updateActiveObject({ material: event.target.value })}
                            >
                              {outdoorSurfaceMaterials.map((material) => (
                                <option key={material.value} value={material.value}>{material.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-xs text-stone-500">
                            状态
                            <select
                              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-semibold text-ink outline-none focus:border-emerald-400"
                              value={activeStructureObject.status ?? "draft"}
                              onChange={(event) => updateActiveObject({ status: event.target.value })}
                            >
                              <option value="draft">草稿</option>
                              <option value="design-intent">方案示意</option>
                              <option value="todo">待深化</option>
                              <option value="needs-site-check">待复尺</option>
                              <option value="confirmed">已确认</option>
                            </select>
                          </label>
                          <label className="block text-xs text-stone-500">
                            备注
                            <textarea className="mt-1 min-h-20 w-full resize-none rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-emerald-400" value={activeStructureObject.notes ?? ""} onChange={(event) => updateActiveObject({ notes: event.target.value })} />
                          </label>
                        </>
                      )}
                    </div>
	                  ) : (
	                    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-stone-500">{isFurnitureWorkspace ? "从模块库添加家具，或在画布上选择已有家具后，这里会显示尺寸、旋转、翻转和备注。" : "选择一个房间后，可以在这里输入名称，例如“厨房”。"}</p>
	                  )}
                  {activeStructureObject && "thickness" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      厚度 mm
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" min="20" type="number" value={activeStructureObject.thickness} onChange={(event) => updateActiveObject({ thickness: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "height" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      高度 mm
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" min="100" type="number" value={activeStructureObject.height} onChange={(event) => updateActiveObject({ height: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeWallObject && (
                    <form
                      className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        handleWallLengthChange(activeWallObject.id, Number(formData.get("wallLength")));
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-blue-900">墙体长度</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700">{activeWallObject.kind === "arc" ? "弧墙" : "直墙"}</span>
                      </div>
                      <label className="mt-2 block text-xs text-stone-500">
                        长度 mm
                        <input
                          key={`${activeWallObject.id}-${activeWallObject.length}`}
                          className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 font-semibold text-ink outline-none focus:border-blue-500"
                          min="100"
                          name="wallLength"
                          type="number"
                          defaultValue={activeWallObject.length}
                        />
                      </label>
                      <button className="mt-2 w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800" type="submit">
                        应用并校准全屋比例
                      </button>
                      <p className="mt-2 text-[11px] leading-4 text-blue-800">直墙会沿原方向改变终点；弧墙保持弧度角度并调整半径。提交后结构检查器会重新整理全屋。</p>
                    </form>
                  )}
                  {activeStructureObject && "radius" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      {"columnType" in activeStructureObject ? "圆柱半径 mm" : "弧墙半径 mm"}
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" min="100" type="number" value={activeStructureObject.radius} onChange={(event) => updateActiveObject({ radius: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "startAngle" in activeStructureObject && "endAngle" in activeStructureObject && "direction" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      弧度角度
                      <input
                        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400"
                        max="180"
                        min="10"
                        step="5"
                        type="number"
                        value={Math.round(Math.abs(activeStructureObject.endAngle - activeStructureObject.startAngle))}
                        onChange={(event) => {
                          const nextAngle = Math.min(180, Math.max(10, Number(event.target.value) || 90));
                          updateActiveObject({
                            endAngle: activeStructureObject.startAngle + (activeStructureObject.direction === "clockwise" ? nextAngle : -nextAngle)
                          });
                        }}
                      />
                    </label>
                  )}
                  {activeStructureObject && "startAngle" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      起始角度
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" type="number" value={activeStructureObject.startAngle} onChange={(event) => updateActiveObject({ startAngle: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "endAngle" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      结束角度
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" type="number" value={activeStructureObject.endAngle} onChange={(event) => updateActiveObject({ endAngle: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "direction" in activeStructureObject && "radius" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      弧线方向
                      <select className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" value={activeStructureObject.direction} onChange={(event) => updateActiveObject({ direction: event.target.value })}>
                        <option value="clockwise">顺时针</option>
                        <option value="counterclockwise">逆时针</option>
                      </select>
                    </label>
                  )}
                  {activeStructureObject && "width" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      宽度 mm
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" min="200" type="number" value={activeStructureObject.width} onChange={(event) => updateActiveObject({ width: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "depth" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      进深 mm
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" min="100" type="number" value={activeStructureObject.depth} onChange={(event) => updateActiveObject({ depth: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "stepCount" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      踏步数
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" min="1" type="number" value={activeStructureObject.stepCount} onChange={(event) => updateActiveObject({ stepCount: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "stepCount" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      方向
                      <select className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" value={activeStructureObject.direction} onChange={(event) => updateActiveObject({ direction: event.target.value })}>
                        <option value="up">上行</option>
                        <option value="down">下行</option>
                      </select>
                    </label>
                  )}
                  {activeStructureObject && "stepCount" in activeStructureObject && (
                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                      <p className="text-xs font-semibold text-blue-950">楼梯编辑与视图</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold">
                        <button className="rounded-lg bg-blue-700 px-2 py-2 text-white hover:bg-blue-800" onClick={() => openStairDesignPage(activeStructureObject.id)} type="button">编辑楼梯</button>
                        <button className="rounded-lg bg-white px-2 py-2 text-blue-800 hover:bg-blue-100" onClick={() => openStairView(activeStructureObject.id, "隔离楼梯")} type="button">隔离楼梯</button>
                        {[
                          "查看上行", "查看下行", "查看剖面", "显示楼板洞口", "显示踏步与平台", "显示扶手栏杆"
                        ].map((label) => <button key={label} className="rounded-lg bg-white px-2 py-2 text-stone-700 hover:bg-blue-100" onClick={() => openStairView(activeStructureObject.id, label)} type="button">{label}</button>)}
                      </div>
                      <p className="mt-2 text-[10px] leading-4 text-blue-800">楼梯视图用于编辑和检查；只有平面、剖面、净高、标高及栏杆参数齐全后，图纸包才会生成“楼梯详图”。</p>
                    </div>
                  )}
                  {activeStructureObject && "openDirection" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      开启方向
                      <select className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" value={String(activeStructureObject.openDirection)} onChange={(event) => updateActiveObject({ openDirection: event.target.value })}>
                        <option value="leftIn">左内开</option>
                        <option value="rightIn">右内开</option>
                        <option value="leftOut">左外开</option>
                        <option value="rightOut">右外开</option>
                      </select>
                    </label>
                  )}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-stone-500">{isFurnitureWorkspace ? "从模块库添加家具，或在画布上选择已有家具后，这里会显示可编辑属性。" : "在画布或对象台账里选择一个结构对象后，这里会显示可编辑属性。"}</p>
              )}
            </RightPanelCard>}

            {developerMode && activeEditorPanel === "properties" && !isFurnitureWorkspace && <RightPanelCard
              id="semantic"
              eyebrow="Map"
              title="语义对象"
              summary={`${floorSemanticObjects.length} 个对象`}
              open={openRightPanels.semantic}
              onToggle={toggleRightPanel}
            >
              <SemanticMapPanel
                floorId={selectedFloorId}
                objects={floorSemanticObjects}
                allObjects={semanticObjects}
                floors={floors}
                selectedObjectId={selectedSemanticObjectId}
                onSelectObject={setSelectedSemanticObjectId}
                onCreateObject={handleCreateSemanticObject}
                onUpdateObject={handleUpdateSemanticObject}
                onDeleteObject={handleDeleteSemanticObject}
              />
            </RightPanelCard>
            }
          </div>
          </RightPanelFrame>
        </aside>}
        <div className="relative z-40 hidden border-l border-stone-200/80 bg-white lg:block">
          <RightPanelRail activePanel={activeEditorPanel} errorCount={editorErrorCount} onSelect={(panel) => setActiveEditorPanel((currentPanel) => currentPanel === panel ? null : panel)} />
        </div>
        <div className="absolute right-3 top-3 z-[65] lg:hidden">
          <RightPanelRail activePanel={activeEditorPanel} errorCount={editorErrorCount} onSelect={(panel) => setActiveEditorPanel((currentPanel) => currentPanel === panel ? null : panel)} />
        </div>
      </section>

      <BottomStatusBar
        toolLabel={activeDrawingWorkspace.tools.find((toolConfig) => toolConfig.id === activeWorkspaceToolId)?.label ?? "选择"}
        selectionLabel={activeObjectId ? activeObjectSummary : "未选择对象"}
        scale={floorPlanScale}
        instruction={activeDrawingWorkspace.instruction}
        developerMode={developerMode}
        coordinateLabel={`原点 ${floorHouseStructure.coordinateSystem.origin.x},${floorHouseStructure.coordinateSystem.origin.y}`}
        onPreviousDrawing={() => selectDrawingWorkspace(getAdjacentDrawingWorkspace(activeDrawingWorkspace.id, -1))}
        onNextDrawing={() => selectDrawingWorkspace(getAdjacentDrawingWorkspace(activeDrawingWorkspace.id, 1))}
      />
      </section>

      <MoreMenu
        open={moreMenuOpen}
        developerMode={developerMode}
        onClose={() => setMoreMenuOpen(false)}
        onImport={() => workspaceImportInputRef.current?.click()}
        onExport={downloadWorkspace}
        onOpen={(dialog) => {
          if (dialog === "package") {
            setEditorDialog("package");
            return;
          }
          setEditorDialog(dialog);
        }}
      />
      <DrawingDirectory
        open={drawingDirectoryOpen}
        activeWorkspaceId={activeDrawingWorkspace.id}
        floors={floors}
        selectedFloorId={selectedFloorId}
        onClose={() => setDrawingDirectoryOpen(false)}
        onSelect={selectDrawingWorkspace}
      />

      {editorDialog === "views" && <EditorUtilityDialog title="视图设置" eyebrow="Model views" description={`${activeDrawingWorkspace.name} · 视图只改变模型表达，不属于正式输出图纸。`} onClose={() => setEditorDialog(null)}>
        <div className="space-y-4">
          <section><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">全局视图</p><div className="space-y-2"><button className="flex w-full items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left transition hover:border-stone-400 hover:bg-stone-50" onClick={enterExplorationMode} type="button"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-500">◎</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">探索模式</span><span className="mt-1 block text-xs leading-5 text-stone-500">进入全屋探索模式；这是查看方式，不改变当前专业对象。</span></span><span className="rounded-full bg-stone-100 px-2 py-1 text-[9px] font-semibold text-stone-500">全局</span></button><button className="flex w-full items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left transition hover:border-amber-300 hover:bg-amber-50" onClick={() => { selectWorkspaceTab("lighting", "mep"); setViewMode("3d"); setEditorDialog(null); }} type="button"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">☀</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">场景灯光预览</span><span className="mt-1 block text-xs leading-5 text-stone-500">进入“水电与照明 · 灯光”的 3D 日夜与灯组效果预览。</span></span><span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-semibold text-amber-700">视觉预览</span></button></div></section>
          <section><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">当前工作区视图</p><div className="space-y-2">{activeDrawingWorkspace.views.filter((view) => view.id !== "lighting-preview").map((view) => <button key={view.id} className="flex w-full items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left transition hover:border-stone-400 hover:bg-stone-50" onClick={() => activateWorkspaceView(view)} type="button"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-500">◫</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{view.name}</span><span className="mt-1 block text-xs leading-5 text-stone-500">{view.description}</span><span className="mt-1 block text-[10px] text-stone-400">对象范围：{view.objectScope.join(" / ")}</span></span><span className="rounded-full bg-stone-100 px-2 py-1 text-[9px] font-semibold text-stone-500">非图纸</span></button>)}</div></section>
        </div>
      </EditorUtilityDialog>}

      {editorDialog === "package" && <EditorUtilityDialog title="图纸包" eyebrow="Output drawings" description={`${currentFloor.label} · 正式输出图纸按对象、标注、图例和导出条件判断成熟度。`} onClose={() => setEditorDialog(null)}>
        <DrawingPackageManager drawings={outputDrawingReadiness} errorCount={editorErrorCount} warningCount={editorWarningCount} onOpenLegacyPackage={() => { setEditorDialog(null); setConstructionPackageOpenRequest(Date.now()); }} />
      </EditorUtilityDialog>}

      {editorDialog === "layers" && <EditorUtilityDialog title="图层" eyebrow="Workspace layers" description={`当前工作区：${activeDrawingWorkspace.name}。手动调整后可以随时恢复工作区默认图层。`} onClose={() => setEditorDialog(null)}>
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
          <p className="text-xs font-semibold text-blue-900">工作区负责编辑，图层只负责显示</p>
          <p className="mt-1 text-xs leading-5 text-blue-800">墙体、门窗、柜体、家具、灯具和机电对象仍保留在统一项目数据中；关闭图层不会删除对象，也不会修改其位置、尺寸或高度。</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(activeDrawingWorkspace.visibleLayers).filter(([, visible]) => visible).map(([layer]) => <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-blue-700" key={layer}>{layer}</span>)}</div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold ${showFurnitureLabels ? "border-blue-200 bg-blue-50 text-blue-800" : "border-stone-200 bg-white text-stone-600"}`} onClick={() => setShowFurnitureLabels((visible) => !visible)} type="button">对象标签<br/><span className="text-[10px] font-normal">{showFurnitureLabels ? "显示" : "隐藏"}</span></button>
          <button className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold ${showAdvancedCanvasControls ? "border-blue-200 bg-blue-50 text-blue-800" : "border-stone-200 bg-white text-stone-600"}`} onClick={() => setShowAdvancedCanvasControls((visible) => !visible)} type="button">编辑辅助<br/><span className="text-[10px] font-normal">{showAdvancedCanvasControls ? "显示" : "隐藏"}</span></button>
        </div>
        <div className="space-y-2">
          {([
            ["baseFloorPlan", "原始底图", "作为定位参考的导入图纸"],
            ["cleanupPatch", "底图清理", "显示底图清理与修补结果"],
            ["furnitureOverlay", "家具与柜体", "根据当前工作区显示或弱化家具"],
            ["semanticOverlay", "语义辅助", "仅在开发者模式可显示"],
            ["debug", "调试信息", "仅在开发者模式可显示"]
          ] as const).map(([key, label, detail]) => {
            const developerLayer = key === "semanticOverlay" || key === "debug";
            const checked = Boolean(floorPlanVisualSettings.layerVisibility[key]);
            return <label key={key} className={`flex items-center gap-3 rounded-xl border border-stone-200 px-3 py-3 ${developerLayer && !developerMode ? "bg-stone-50 opacity-55" : "bg-white"}`}><input checked={checked} disabled={developerLayer && !developerMode} onChange={(event) => handleFloorPlanVisualSettingsChange({ ...floorPlanVisualSettings, layerVisibility: { ...floorPlanVisualSettings.layerVisibility, [key]: event.target.checked } })} type="checkbox" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{label}</span><span className="mt-0.5 block text-xs text-stone-500">{detail}</span></span><span className="text-[10px] font-semibold text-stone-400">{checked ? "显示" : "隐藏"}</span></label>;
          })}
        </div>
        <button className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800" onClick={() => applyDrawingWorkspaceLayers(activeDrawingWorkspace)} type="button">恢复当前工作区默认图层</button>
      </EditorUtilityDialog>}

      {editorDialog === "background" && <EditorUtilityDialog title="调整底图" eyebrow="Background image" description="底图设置只在面板打开时出现，不占用主画布。" onClose={() => setEditorDialog(null)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-stone-600">预设<select className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-slate-900" value={floorPlanVisualSettings.preset} onChange={(event) => handleFloorPlanVisualSettingsChange(applyFloorPlanPreset(event.target.value as FloorPlanPreset, floorPlanVisualSettings))}>{(Object.entries(floorPlanPresetLabels) as Array<[FloorPlanPreset, string]>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600"><span>显示底图</span><input checked={floorPlanVisualSettings.layerVisibility.baseFloorPlan} onChange={(event) => handleFloorPlanVisualSettingsChange({ ...floorPlanVisualSettings, layerVisibility: { ...floorPlanVisualSettings.layerVisibility, baseFloorPlan: event.target.checked } })} type="checkbox" /></label>
          {([
            ["opacity", "透明度", 0, 1, 0.05],
            ["contrast", "对比度", 0.5, 2, 0.05],
            ["brightness", "亮度", 0.5, 1.8, 0.05],
            ["saturation", "饱和度", 0, 2, 0.05]
          ] as const).map(([key, label, min, max, step]) => <label key={key} className="rounded-lg border border-stone-200 p-3 text-xs font-semibold text-stone-600"><span className="flex items-center justify-between"><span>{label}</span><span className="tabular-nums text-stone-400">{floorPlanVisualSettings[key].toFixed(2)}</span></span><input className="mt-2 w-full accent-slate-900" min={min} max={max} step={step} type="range" value={floorPlanVisualSettings[key]} onChange={(event) => handleFloorPlanVisualSettingsChange({ ...floorPlanVisualSettings, [key]: Number(event.target.value) })} /></label>)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {([
            ["grayscale", "灰度"],
            ["lineEnhance", "线条增强"],
            ["cleanWhiteBackground", "干净白底"],
            ["removeWhiteBorder", "去除白边"]
          ] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600"><span>{label}</span><input checked={Boolean(floorPlanVisualSettings[key])} onChange={(event) => handleFloorPlanVisualSettingsChange({ ...floorPlanVisualSettings, [key]: event.target.checked })} type="checkbox" /></label>)}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-200" onClick={() => handleFloorPlanVisualSettingsChange(getDefaultVisualSettings())} type="button">重置</button>
          <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800" onClick={() => { setShowAdvancedCanvasControls(true); setEditorDialog(null); }} type="button">高级编辑</button>
        </div>
      </EditorUtilityDialog>}

      {editorDialog === "ledger" && <EditorUtilityDialog title="对象台账" eyebrow="Object ledger" description={`${currentFloor.label} 的结构、家具与图纸对象。技术 ID 仅在开发者模式显示。`} onClose={() => setEditorDialog(null)}>
        <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-stone-100 p-3"><p className="text-lg font-semibold text-slate-900">{verificationEntries.filter((entry) => entry.floorId === selectedFloorId).length}</p><p className="text-stone-500">结构对象</p></div><div className="rounded-xl bg-stone-100 p-3"><p className="text-lg font-semibold text-slate-900">{floorFurniture.length}</p><p className="text-stone-500">家具柜体</p></div><div className="rounded-xl bg-stone-100 p-3"><p className="text-lg font-semibold text-slate-900">{floorDrawingItems.length}</p><p className="text-stone-500">图纸对象</p></div></div>
        <div className="max-h-[28rem] space-y-1 overflow-y-auto pr-1">{[
          ...verificationEntries.filter((entry) => entry.floorId === selectedFloorId).map((entry) => ({ id: entry.object.id, name: entry.object.name, kind: verificationCollectionLabels[entry.collection] })),
          ...floorFurniture.map((item) => ({ id: item.id, name: item.name, kind: item.moduleCategory ? "柜体 / 模块" : "家具" })),
          ...floorDrawingItems.map((item) => ({ id: item.id, name: item.label, kind: drawingItemCategoryLabels[item.category] }))
        ].map((item) => <button key={item.id} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-stone-100" onClick={() => { locateValidationObject(item.id); setEditorDialog(null); }} type="button"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-[10px] font-bold text-stone-500">{item.kind.slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-900">{item.name}</span><span className="mt-0.5 block truncate text-[10px] text-stone-500">{item.kind}{developerMode ? ` · ${item.id}` : ""}</span></span><span className="text-stone-300">→</span></button>)}</div>
      </EditorUtilityDialog>}

      {editorDialog === "settings" && <EditorUtilityDialog title="项目设置" eyebrow="Project settings" description="数据与代码同步等低频项目能力集中在这里。" onClose={() => setEditorDialog(null)}>
        <section className="rounded-xl border border-stone-200 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">数据与代码同步</h3><p className="mt-1 text-xs text-stone-500">保留原有草稿、代码文件和验证逻辑。</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isCurrentCodeVerified ? "bg-emerald-50 text-emerald-700" : codeSaveState.status === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{codeSaveLabel}</span></div><div className="mt-3 rounded-lg bg-stone-100 p-3 text-xs leading-5 text-stone-600"><p>{draftSaveLabel}</p><p>{codeWriteTargetLabel}</p>{showSeparateCodeDirty ? <p className="font-semibold text-amber-700">{unwrittenCodeLabel}</p> : null}</div><div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200" disabled={localCodeFileStatus === "checking" || localCodeFileStatus === "syncing"} onClick={bindLocalCodeFile} type="button">{localCodeFileLabel}</button><button className={`rounded-lg px-3 py-2 text-xs font-semibold ${localCodeAutoSync ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-700"}`} disabled={!localCodeFileReady} onClick={toggleLocalCodeAutoSync} type="button">自动写代码：{localCodeAutoSync ? "开" : "关"}</button><button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:bg-stone-300 sm:col-span-2" disabled={!hasLoadedWebWorkspace || codeSaveState.status === "saving" || Boolean(workspaceConflict)} onClick={solidifyDefaultWorkspace} type="button">保存到代码文件并验证</button></div></section>
        <section className="mt-3 rounded-xl border border-stone-200 p-4"><h3 className="text-sm font-semibold text-slate-900">编辑器偏好</h3><label className="mt-3 flex items-center justify-between rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600"><span>显示家具标签</span><input checked={showFurnitureLabels} onChange={(event) => setShowFurnitureLabels(event.target.checked)} type="checkbox" /></label></section>
      </EditorUtilityDialog>}

      {editorDialog === "developer" && <EditorUtilityDialog title="开发者模式" eyebrow="Developer settings" description="默认关闭。开启后才显示技术 ID、语义叠层、调试边界和底层坐标。" onClose={() => setEditorDialog(null)}>
        <label className="flex items-center justify-between rounded-xl border border-stone-200 p-4"><span><span className="block text-sm font-semibold text-slate-900">开发者模式</span><span className="mt-1 block text-xs text-stone-500">面向数据检查与代码调试，不影响模型内容。</span></span><input checked={developerMode} onChange={toggleDeveloperMode} type="checkbox" /></label>
        <label className={`mt-3 flex items-center justify-between rounded-xl border border-stone-200 p-4 ${developerMode ? "" : "opacity-50"}`}><span><span className="block text-sm font-semibold text-slate-900">画布高级控制台</span><span className="mt-1 block text-xs text-stone-500">显示结构工具参数、统一坐标和对象台账兼容入口。</span></span><input checked={showAdvancedCanvasControls} disabled={!developerMode} onChange={(event) => setShowAdvancedCanvasControls(event.target.checked)} type="checkbox" /></label>
      </EditorUtilityDialog>}

      {editorDialog === "shortcuts" && <EditorUtilityDialog title="快捷键" eyebrow="Keyboard" onClose={() => setEditorDialog(null)}><div className="divide-y divide-stone-100 rounded-xl border border-stone-200">{[["V", "选择工具"], ["Esc", "取消当前操作"], ["Delete", "删除选中对象"], ["⌘ Z", "撤销"], ["⌘ ⇧ Z", "重做"], ["滚轮", "平移或缩放画布"]].map(([key, label]) => <div key={key} className="flex items-center justify-between px-4 py-3 text-sm"><span className="text-stone-600">{label}</span><kbd className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-slate-700">{key}</kbd></div>)}</div></EditorUtilityDialog>}

      {editorDialog === "help" && <EditorUtilityDialog title="主要操作路径" eyebrow="Help" onClose={() => setEditorDialog(null)}><ol className="space-y-3">{["在顶部选择楼层。", "从六个工作区中选择当前设计任务；总平面提供独立 2D/3D 综合视图。", "水电与照明、顶面与饰面通过二级 Tab 切换专业。", "使用左侧工具编辑对象；选中对象后在属性面板修改。", "使用检查处理问题，再到图纸包查看哪些正式图纸已经可导出。"].map((item, index) => <li key={item} className="flex gap-3 rounded-xl bg-stone-100 p-3 text-sm leading-6 text-stone-700"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-white">{index + 1}</span><span>{item}</span></li>)}</ol></EditorUtilityDialog>}

      {designPageData && (
        <section className="fixed inset-3 z-[75] overflow-hidden rounded-2xl border border-white/80 bg-white shadow-soft lg:inset-6">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">{designPageData.eyebrow}</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-ink">{designPageData.subject} · {designPageData.title}</h2>
              </div>
              <button className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-clay" onClick={() => setDesignPageRequest(null)} type="button">
                完成
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 overflow-auto bg-[#eef3f2] p-4 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="flex min-h-[520px] flex-col rounded-2xl border border-white/80 bg-white/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Layout</p>
                    <h3 className="mt-1 text-base font-semibold text-ink">功能分区示意</h3>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{designPageData.zones.length} 个重点区</span>
                </div>

                <div className="mt-4 flex min-h-[360px] flex-1 items-stretch overflow-hidden rounded-xl border-[10px] border-[#718678] bg-[#f8faf8] p-3 shadow-inner">
                  <div className="flex w-full flex-wrap content-stretch gap-3">
                    {designPageData.zones.map((zone, index) => (
                      <div
                        key={zone.id}
                        className="relative min-w-[170px] flex-1 overflow-hidden rounded-lg border border-[#718678]/35 bg-white p-3 shadow-sm"
                        style={{ flexBasis: `${Math.max(22, Math.min(100, zone.widthPercent))}%`, minHeight: `${Math.max(128, Math.min(260, zone.heightPercent * 2.2))}px` }}
                      >
                        <div className="absolute right-3 top-3 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black text-white">{String(index + 1).padStart(2, "0")}</div>
                        <p className="pr-10 text-sm font-semibold text-ink">{zone.label}</p>
                        <p className="mt-1 text-xs font-semibold text-blue-700">{zone.role}</p>
                        <p className="mt-4 text-xs leading-5 text-stone-600">{zone.detail}</p>
                        {zone.serviceNote && <p className="mt-3 rounded-lg bg-blue-50 px-2 py-1.5 text-[11px] font-semibold leading-4 text-blue-800">{zone.serviceNote}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="rounded-2xl border border-white/80 bg-white p-4 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Design Logic</p>
                <h3 className="mt-1 text-base font-semibold text-ink">设计思路</h3>
                <p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-950">{designPageData.designThinking}</p>
                <p className="mt-3 text-xs leading-5 text-stone-600">
                  <span className="font-semibold text-ink">建议位置：</span>{designPageData.recommendedPlacement}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {designPageData.metrics.map((metric) => (
                    <div key={`${metric.label}-${metric.value}`} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold text-stone-500">{metric.label}</p>
                      <p className="mt-1 text-sm font-semibold text-ink">{metric.value}</p>
                      {metric.note && <p className="mt-1 text-[10px] leading-4 text-stone-400">{metric.note}</p>}
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-ink">深化要点</p>
                  <div className="mt-2 space-y-2">
                    {designPageData.layoutNotes.map((note) => (
                      <p key={`design-layout-${note}`} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-950">{note}</p>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-ink">注意事项</p>
                  <div className="mt-2 space-y-2">
                    {designPageData.cautionNotes.map((note) => (
                      <p key={`design-caution-${note}`} className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">{note}</p>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}

      {wardrobeDesignFurniture && (
        <section className="fixed inset-3 z-[80] overflow-hidden rounded-2xl border border-white/80 bg-white shadow-soft lg:inset-6">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Wardrobe Design</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-ink">{wardrobeDesignFurniture.name} · 衣柜内部设计</h2>
              </div>
              <button className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-clay" onClick={() => setWardrobeDesignFurnitureId("")} type="button">
                完成
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 overflow-auto bg-[#f3efe7] p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-white/80 bg-white/80 p-4">
                <div ref={wardrobeCanvasRef} className="relative aspect-[4/3] w-full max-w-4xl rounded-xl border-[10px] border-[#8b6f47] bg-[#f8f4ed] shadow-inner">
	                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(139,111,71,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,111,71,0.18)_1px,transparent_1px)] bg-[size:10%_10%]" />
                    {wardrobeColumnMetrics.slice(0, -1).map((column, dividerIndex) => {
                      const left = wardrobeColumnMetrics.slice(0, dividerIndex + 1).reduce((sum, item) => sum + item.width, 0);
                      return (
                        <span
                          key={`wardrobe-divider-${dividerIndex}`}
                          className="absolute bottom-0 top-0 z-20 w-4 -translate-x-1/2 cursor-col-resize touch-none"
                          style={{ left: `${left}%` }}
                          onPointerDown={(event) => {
                            event.currentTarget.setPointerCapture(event.pointerId);
                            updateWardrobeColumnWidth(dividerIndex, event.clientX);
                          }}
                          onPointerMove={(event) => {
                            if (event.buttons !== 1) return;
                            updateWardrobeColumnWidth(dividerIndex, event.clientX);
                          }}
                        >
                          <span className="absolute bottom-0 left-1/2 top-0 w-1 -translate-x-1/2 rounded-full bg-emerald-700/70 shadow-[0_0_0_2px_rgba(255,255,255,0.7)]" />
                          <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
                            拖
                          </span>
                        </span>
                      );
                    })}
		                  {(() => {
		                    const moduleNumberById = new Map((wardrobeDesign.modules ?? []).map((module, index) => [module.id, String(index + 1).padStart(2, "0")]));
		                    return [...(wardrobeDesign.modules ?? [])].sort((left, right) => (left.kind === "blank" ? 0 : 1) - (right.kind === "blank" ? 0 : 1)).map((module) => {
                          const moduleLayout = getWardrobeModuleLayout(module, wardrobeColumnWidths);
		                      const kindClass: Record<WardrobeCellKind, string> = {
		                        "hanging-long": "bg-sky-50 text-sky-800",
		                        "hanging-short": "bg-indigo-50 text-indigo-800",
	                        folded: "bg-amber-50 text-amber-800",
	                        drawer: "bg-[#e3d2b7] text-[#5f4528]",
	                        open: "bg-white/70 text-stone-600",
	                        shoe: "bg-emerald-50 text-emerald-800",
	                        blank: "border-dashed bg-transparent text-stone-300 shadow-none"
		                      };
	                      const drawerRows = Math.min(8, Math.max(1, module.drawerRows ?? 3));
	                      const drawerColumns = Math.min(4, Math.max(1, module.drawerColumns ?? 1));
	                      const shelfCount = Math.min(8, Math.max(1, module.shelfCount ?? 4));
	                      const drawerRowHeights = normalizeWardrobePartHeights(module.drawerRowHeights, drawerRows);
	                      const shelfLayerHeights = normalizeWardrobePartHeights(module.shelfLayerHeights, shelfCount + 1);
	                      const moduleNumber = moduleNumberById.get(module.id) ?? "??";
	                      return (
	                        <button
	                          key={module.id}
		                          className={`absolute grid place-items-center rounded-lg border-2 border-[#8b6f47]/45 p-1 text-xs font-semibold shadow-sm transition hover:ring-2 hover:ring-emerald-500 ${kindClass[module.kind]}`}
		                          style={{ left: `${moduleLayout.x}%`, top: `${moduleLayout.y}%`, width: `${moduleLayout.width}%`, height: `${moduleLayout.height}%`, zIndex: module.kind === "blank" ? 1 : 2 }}
	                          onClick={() => {
	                            const kinds = Object.keys(wardrobeCellLabels) as WardrobeCellKind[];
	                            const nextKind = kinds[(kinds.indexOf(module.kind) + 1) % kinds.length];
	                            updateWardrobeModule(module.id, { kind: nextKind });
	                          }}
	                          type="button"
	                        >
	                          <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-black leading-none text-white shadow-sm ring-1 ring-white/70">
	                            {moduleNumber}
	                          </span>
	                          {(module.kind === "hanging-long" || module.kind === "hanging-short") && <span className="absolute left-3 right-3 top-4 h-1 rounded-full bg-slate-700" />}
	                          {module.kind === "drawer" && (
	                            <span className="absolute inset-2 grid overflow-hidden rounded border border-[#8b6f47]/35 bg-[#f1e3cc]/70" style={{ gridTemplateColumns: `repeat(${drawerColumns}, minmax(0, 1fr))`, gridTemplateRows: drawerRowHeights.map((height) => `${height}fr`).join(" ") }}>
	                              {Array.from({ length: drawerRows * drawerColumns }).map((_, drawerIndex) => (
	                                <span key={`${module.id}-drawer-${drawerIndex}`} className="relative border border-[#8b6f47]/35 bg-[#ead8ba]/75">
	                                  <span className="absolute left-1/2 top-1/2 h-1.5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b6f47]/55" />
	                                </span>
	                              ))}
	                            </span>
	                          )}
	                          {module.kind === "folded" && (
	                            <span className="absolute inset-x-3 inset-y-4">
	                              {getCumulativePercents(shelfLayerHeights).map((top, shelfIndex) => (
	                                <span
	                                  key={`${module.id}-shelf-${shelfIndex}`}
	                                  className="absolute left-0 right-0 border-t-2 border-amber-700/35"
	                                  style={{ top: `${top}%` }}
	                                />
	                              ))}
	                            </span>
	                          )}
	                          <span className="relative rounded-full bg-white/85 px-2 py-1 text-center leading-tight shadow-sm">{module.label ?? wardrobeCellLabels[module.kind]}</span>
	                          <span className="absolute bottom-1 right-1 rounded bg-white/75 px-1 text-[9px] font-bold text-stone-500">
	                            {Math.round((wardrobeDesignFurniture.dimensions.width * moduleLayout.width) / 100)}x{Math.round((wardrobeDesignFurniture.dimensions.height * moduleLayout.height) / 100)}cm
	                          </span>
                            <span
                              className="absolute -bottom-2 left-3 right-3 h-4 cursor-row-resize touch-none rounded-full bg-emerald-700/80 shadow-[0_0_0_2px_rgba(255,255,255,0.8)]"
                              title="拖动调整上下区域高度"
                              onClick={(event) => event.stopPropagation()}
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                event.currentTarget.setPointerCapture(event.pointerId);
                                resizeWardrobeModuleBottom(module.id, event.clientY);
                              }}
                              onPointerMove={(event) => {
                                if (event.buttons !== 1) return;
                                event.stopPropagation();
                                resizeWardrobeModuleBottom(module.id, event.clientY);
                              }}
                            />
	                        </button>
	                      );
		                    });
		                  })()}
                </div>
              </div>

              <aside className="rounded-2xl border border-white/80 bg-white p-4 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Controls</p>
                <h3 className="mt-1 text-base font-semibold text-ink">内部结构参数</h3>
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {furnitureDimensionFields.map(([field, label]) => (
                      <label key={field} className="block text-xs font-semibold text-stone-500">
                        {label}
                        <input
                          className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2 text-sm font-semibold text-ink outline-none focus:border-emerald-400"
                          min="1"
                          type="number"
                          value={wardrobeDesignFurniture.dimensions[field]}
                          onChange={(event) => updateWardrobeDimensions(field, Number(event.target.value))}
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    className="w-full rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300"
                    disabled={wardrobeDesignFurniture.locked}
                    onClick={generateRecommendedWardrobe}
                    type="button"
                  >
                    生成推荐衣柜
                  </button>
                  <div className="rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
                    默认生成顶部换季区、长衣区、短衣区、抽屉区、叠放区和鞋包区；改完柜体长宽高后可重新生成，再微调每个模块。
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-ink">列式柜体</p>
                        <p className="mt-1 text-[11px] font-semibold text-stone-500">竖向列宽上下统一，拖画布绿线可调整。</p>
                      </div>
                      <div className="flex gap-1">
                        <button className="rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-ink shadow-sm disabled:text-stone-300" disabled={wardrobeDesign.columns <= 1} onClick={removeWardrobeColumn} type="button">减列</button>
                        <button className="rounded-lg bg-ink px-2 py-1.5 text-xs font-semibold text-white disabled:bg-stone-300" disabled={wardrobeDesign.columns >= 6} onClick={addWardrobeColumn} type="button">加列</button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-semibold text-stone-500">
                      {wardrobeColumnWidths.map((width, index) => (
                        <span key={`wardrobe-column-width-${index}`} className="rounded-lg bg-white px-2 py-1.5 text-center text-ink shadow-sm">
                          第{index + 1}列 · {Math.round(width)}%
                        </span>
                      ))}
                    </div>
                    <label className="mt-3 block text-xs font-semibold text-stone-500">
                      参考层数
                      <input
                        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-emerald-400"
                        max="8"
                        min="1"
                        type="number"
                        value={wardrobeDesign.rows}
                        onChange={(event) => resizeWardrobeGrid("rows", Number(event.target.value))}
                      />
                    </label>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink">模块积木</p>
                      <select className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-ink" onChange={(event) => addWardrobeModule(event.target.value as WardrobeCellKind)} value="">
                        <option value="" disabled>添加</option>
                        {(Object.entries(wardrobeCellLabels) as Array<[WardrobeCellKind, string]>).filter(([kind]) => kind !== "blank").map(([kind, label]) => (
                          <option key={kind} value={kind}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-2 max-h-72 space-y-2 overflow-auto pr-1">
                      {(wardrobeDesign.modules ?? []).map((module, index) => (
                        <div key={`module-control-${module.id}`} className="rounded-lg border border-stone-200 bg-white p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <select
                              className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs font-semibold text-ink outline-none focus:border-emerald-400"
                              value={module.kind}
                              onChange={(event) => updateWardrobeModule(module.id, { kind: event.target.value as WardrobeCellKind })}
                            >
                              {(Object.entries(wardrobeCellLabels) as Array<[WardrobeCellKind, string]>).map(([kind, label]) => (
                                <option key={kind} value={kind}>{index + 1}. {label}</option>
                              ))}
                            </select>
                            <button className="rounded-lg bg-red-50 px-2 py-2 text-xs font-semibold text-red-700 hover:bg-red-100" onClick={() => removeWardrobeModule(module.id)} type="button">删</button>
                          </div>
                          <input
                            className="mt-2 w-full rounded-lg border border-stone-200 px-2 py-1.5 text-xs font-semibold text-ink outline-none focus:border-emerald-400"
                            placeholder={wardrobeCellLabels[module.kind]}
                            value={module.label ?? ""}
                            onChange={(event) => updateWardrobeModule(module.id, { label: event.target.value })}
                          />
                          <div className="mt-2 grid grid-cols-4 gap-1">
                            <label className="block text-[10px] font-semibold text-stone-500">
                              列
                              <input
                                className="mt-1 w-full rounded-lg border border-stone-200 px-1.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-emerald-400"
                                min="1"
                                max={wardrobeDesign.columns}
                                type="number"
                                value={(module.column ?? 0) + 1}
                                onChange={(event) => updateWardrobeModule(module.id, { column: Number(event.target.value) - 1 })}
                              />
                            </label>
                            <label className="block text-[10px] font-semibold text-stone-500">
                              跨列
                              <input
                                className="mt-1 w-full rounded-lg border border-stone-200 px-1.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-emerald-400"
                                min="1"
                                max={wardrobeDesign.columns - (module.column ?? 0)}
                                type="number"
                                value={module.columnSpan ?? 1}
                                onChange={(event) => updateWardrobeModule(module.id, { columnSpan: Number(event.target.value) })}
                              />
                            </label>
                            {([
                              ["y", "上"],
                              ["height", "高"]
                            ] as const).map(([field, label]) => (
                              <label key={`${module.id}-${field}`} className="block text-[10px] font-semibold text-stone-500">
                                {label}%
                                <input
                                  className="mt-1 w-full rounded-lg border border-stone-200 px-1.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-emerald-400"
                                  min="0"
                                  max="100"
                                  type="number"
                                  value={module[field]}
                                  onChange={(event) => updateWardrobeModule(module.id, { [field]: Number(event.target.value) } as Partial<typeof module>)}
                                />
                              </label>
                            ))}
                          </div>
                          {module.kind === "drawer" && (
                            <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-[#f8f1e6] p-2">
                              {([
                                ["drawerRows", "抽屉层数", 1, 8],
                                ["drawerColumns", "抽屉列数", 1, 4]
                              ] as const).map(([field, label, min, max]) => (
                                <label key={`${module.id}-${field}`} className="block text-[10px] font-semibold text-[#6b4f2f]">
                                  {label}
                                  <input
                                    className="mt-1 w-full rounded-lg border border-[#dcc8aa] bg-white px-2 py-1.5 text-xs font-semibold text-ink outline-none focus:border-emerald-400"
                                    min={min}
                                    max={max}
                                    type="number"
                                    value={module[field] ?? (field === "drawerRows" ? 3 : 1)}
                                    onChange={(event) => updateWardrobeModule(module.id, { [field]: Number(event.target.value) } as Partial<typeof module>)}
                                  />
                                </label>
                              ))}
                              <div className="col-span-2 rounded-lg bg-white/70 p-2">
                                <p className="text-[10px] font-semibold text-[#6b4f2f]">单抽高度</p>
                                <div className="mt-2 grid grid-cols-3 gap-1">
                                  {normalizeWardrobePartHeights(module.drawerRowHeights, Math.min(8, Math.max(1, module.drawerRows ?? 3))).map((height, drawerIndex) => (
                                    <label key={`${module.id}-drawer-height-${drawerIndex}`} className="block text-[10px] font-semibold text-[#6b4f2f]">
                                      第{drawerIndex + 1}抽%
                                      <input
                                        className="mt-1 w-full rounded-lg border border-[#dcc8aa] bg-white px-1.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-emerald-400"
                                        min="6"
                                        max="94"
                                        type="number"
                                        value={Math.round(height)}
                                        onChange={(event) => updateWardrobeModulePartHeight(module.id, "drawerRowHeights", drawerIndex, Number(event.target.value))}
                                      />
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          {module.kind === "folded" && (
                            <div className="mt-2 rounded-lg bg-amber-50 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-semibold text-amber-800">隔板数量</p>
                                <div className="flex items-center gap-1">
                                  <button
                                    className="grid size-7 place-items-center rounded-lg bg-white text-sm font-black text-amber-900 shadow-sm disabled:text-stone-300"
                                    disabled={(module.shelfCount ?? 4) <= 1}
                                    onClick={() => updateWardrobeShelfCount(module.id, (module.shelfCount ?? 4) - 1)}
                                    type="button"
                                  >
                                    -
                                  </button>
                                  <input
                                    className="h-7 w-12 rounded-lg border border-amber-200 bg-white px-1 text-center text-xs font-semibold text-ink outline-none focus:border-emerald-400"
                                    min="1"
                                    max="8"
                                    type="number"
                                    value={module.shelfCount ?? 4}
                                    onChange={(event) => updateWardrobeShelfCount(module.id, Number(event.target.value))}
                                  />
                                  <button
                                    className="grid size-7 place-items-center rounded-lg bg-white text-sm font-black text-amber-900 shadow-sm disabled:text-stone-300"
                                    disabled={(module.shelfCount ?? 4) >= 8}
                                    onClick={() => updateWardrobeShelfCount(module.id, (module.shelfCount ?? 4) + 1)}
                                    type="button"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              <p className="mt-2 text-[10px] font-semibold text-amber-800">叠放层高度</p>
                              <div className="mt-2 grid grid-cols-3 gap-1">
                                {normalizeWardrobePartHeights(module.shelfLayerHeights, Math.min(8, Math.max(1, module.shelfCount ?? 4)) + 1).map((height, shelfIndex) => (
                                  <label key={`${module.id}-shelf-height-${shelfIndex}`} className="block text-[10px] font-semibold text-amber-800">
                                    第{shelfIndex + 1}层%
                                    <input
                                      className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-1.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-emerald-400"
                                      min="6"
                                      max="94"
                                      type="number"
                                      value={Math.round(height)}
                                      onChange={(event) => updateWardrobeModulePartHeight(module.id, "shelfLayerHeights", shelfIndex, Number(event.target.value))}
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <label className="block text-xs font-semibold text-stone-500">
                    施工/收纳备注
                    <textarea
                      className="mt-1 min-h-28 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-emerald-400"
                      value={wardrobeDesign.notes}
                      onChange={(event) => updateWardrobeDesign({ notes: event.target.value })}
                    />
                  </label>
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}

    </main>
  );
}
