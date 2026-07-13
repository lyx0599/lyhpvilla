import type { SemanticObject } from "@/types/semantic-map";
import type {
  CleanPatch,
  DrawingItem,
  DrawingPackage,
  DrawingSheetType,
  FixedCameraView,
  Floor,
  FloorId,
  FloorPlanVisualSettings,
  Furniture,
  HouseStructure
} from "@/types/space";
import type { RoomTourView } from "@/types/space";
import type { WallSyncOverrides } from "@/lib/villa-structure-sync";

export type LightingFixtureFamily = {
  id: string;
  name: string;
  lightType: string;
  mountingType: import("@/types/space").LightMountingType;
  defaultColorTemperature: import("@/types/space").LightColorTemperature;
  defaultBeamAngle: number | null;
  defaultLightSpec: import("@/types/space").LightSpec;
  finishOptions: string[];
  notes: string;
};

export type LightingSceneGroupState = {
  controlGroupId: string;
  on: boolean;
  brightness: number;
  colorTemperature?: import("@/types/space").LightColorTemperature;
};

export type LightingScene = {
  id: string;
  name: string;
  floorId?: FloorId;
  roomId?: string;
  category: "whole-house" | "room" | "outdoor";
  groupStates: LightingSceneGroupState[];
  automation?: string[];
  notes: string;
  status: "draft" | "confirmed";
};

export type LightingDesign = {
  version: "modern-warm-v1";
  style: "modern-warm";
  generatedAt: string;
  fixtureFamilies: LightingFixtureFamily[];
  scenes: LightingScene[];
  pendingConfirmations: string[];
};

export type WorkspaceDocument = {
  schemaVersion?: number;
  dataRevision?: string;
  defaultWorkspaceRevision?: string;
  savedAt?: string;
  updatedAt?: string;
  saveMode?: "manual" | "draft" | "legacy";
  selectedFloorId: FloorId;
  selectedDrawingSheetType: DrawingSheetType;
  floors: Floor[];
  furniture: Furniture[];
  drawingItems: DrawingItem[];
  drawingPackage: DrawingPackage;
  semanticObjects: SemanticObject[];
  visualSettingsByFloor: Record<FloorId, FloorPlanVisualSettings>;
  cleanPatchesByFloor: Record<FloorId, CleanPatch[]>;
  houseStructuresByFloor: Record<FloorId, HouseStructure>;
  wallSyncOverrides: WallSyncOverrides;
  cameraViews: FixedCameraView[];
  roomTourViews: RoomTourView[];
  lightingDesign: LightingDesign;
};

export type WorkspaceDataCategory =
  | "floors"
  | "houseStructuresByFloor"
  | "furniture"
  | "drawingItems"
  | "drawingPackage"
  | "semanticObjects"
  | "cameraViews"
  | "roomTourViews"
  | "lightingDesign"
  | "visualSettingsByFloor"
  | "cleanPatchesByFloor";

export type WorkspaceDataSource = "default-workspace" | "migration" | "fallback" | "mock";

export type WorkspaceDataSourceReport = Record<WorkspaceDataCategory, WorkspaceDataSource>;
