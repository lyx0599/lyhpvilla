import type { SemanticObject } from "@/types/semantic-map";
import type {
  CleanPatch,
  DrawingItem,
  DrawingPackage,
  FixedCameraView,
  Floor,
  FloorId,
  FloorPlanVisualSettings,
  Furniture,
  HouseStructure
} from "@/types/space";
import type { RoomTourView } from "@/types/space";
import type { WallSyncOverrides } from "@/lib/villa-structure-sync";

export type WorkspaceDocument = {
  schemaVersion?: number;
  dataRevision?: string;
  defaultWorkspaceRevision?: string;
  savedAt?: string;
  updatedAt?: string;
  saveMode?: "manual" | "draft" | "legacy";
  selectedFloorId: FloorId;
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
  | "visualSettingsByFloor"
  | "cleanPatchesByFloor";

export type WorkspaceDataSource = "default-workspace" | "migration" | "fallback" | "mock";

export type WorkspaceDataSourceReport = Record<WorkspaceDataCategory, WorkspaceDataSource>;
