import type { Drawing3DViewPreset, Drawing3DWallMode } from "./drawing-3d-profiles.ts";
import type { FixedCameraView, FloorId, Furniture, HouseStructure } from "../types/space.ts";

export const RENDER_CAMERA_STORAGE_KEY = "lyhpvilla-render-cameras-v2";
export const LEGACY_RENDER_CAMERA_STORAGE_KEY = "lyhpvilla-render-cameras-v1";

export type SavedCameraFocus = {
  kind: "wholeVilla" | "floor" | "room" | "object" | "wall" | "ceiling" | "lighting";
  floorId: FloorId;
  roomId?: string;
  outdoorId?: string;
  objectId?: string;
  wallId?: string;
  label?: string;
};

export type SavedRenderCamera = FixedCameraView & {
  schemaVersion: 2;
  fov: number;
  cameraHeight: number;
  focus: SavedCameraFocus;
  cameraMode: "orbit" | "fixed" | "walkthrough" | "tour";
  lightingScene: "dayWithLights" | "dusk" | "night" | "artificialOnly" | "beamAnalysis";
  lightingSceneId?: string;
  presentationMode: boolean;
  editorMode: "edit" | "presentation";
  materialPreview: boolean;
  designStyle: "naturalWood" | "softCream" | "modernStone" | "warmJapandi";
  wallDisplayMode: Drawing3DWallMode;
  roomCeilingMode: "hidden" | "translucent" | "solid";
  drawingViewPreset: Drawing3DViewPreset;
  source: "user" | "generated";
  createdAt: string;
};

type CameraValidationContext = {
  structuresByFloor: Partial<Record<FloorId, HouseStructure>>;
  furniture: Furniture[];
  drawingObjectIds?: Set<string>;
};

function finiteVector(value: unknown): value is { x: number; y: number; z: number } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return [candidate.x, candidate.y, candidate.z].every((item) => typeof item === "number" && Number.isFinite(item));
}

function isFloorId(value: unknown): value is FloorId {
  return value === "B2" || value === "B1" || value === "1F" || value === "2F" || value === "YARD";
}

function migrateRecord(value: unknown): SavedRenderCamera | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.name !== "string" || !isFloorId(record.floor)) return null;
  if (!finiteVector(record.cameraPosition) || !finiteVector(record.target)) return null;
  const existingFocus = record.focus && typeof record.focus === "object" ? record.focus as Partial<SavedCameraFocus> : null;
  const focus: SavedCameraFocus = {
    kind: existingFocus?.kind ?? "floor",
    floorId: isFloorId(existingFocus?.floorId) ? existingFocus.floorId : record.floor,
    roomId: typeof existingFocus?.roomId === "string" ? existingFocus.roomId : undefined,
    outdoorId: typeof existingFocus?.outdoorId === "string" ? existingFocus.outdoorId : undefined,
    objectId: typeof existingFocus?.objectId === "string" ? existingFocus.objectId : undefined,
    wallId: typeof existingFocus?.wallId === "string" ? existingFocus.wallId : undefined,
    label: typeof existingFocus?.label === "string" ? existingFocus.label : record.name
  };
  const fov = typeof record.fov === "number" && Number.isFinite(record.fov) ? Math.min(75, Math.max(28, record.fov)) : 42;
  return {
    id: record.id,
    name: record.name,
    floor: record.floor,
    cameraPosition: record.cameraPosition,
    target: record.target,
    fov,
    cameraHeight: typeof record.cameraHeight === "number" ? record.cameraHeight : record.cameraPosition.y,
    zoom: typeof record.zoom === "number" ? record.zoom : undefined,
    mode: record.mode === "orthographic" ? "orthographic" : "perspective",
    description: typeof record.description === "string" ? record.description : "保存自共享3D场景",
    scope: "export",
    targetArea: typeof record.targetArea === "string" ? record.targetArea : undefined,
    schemaVersion: 2,
    focus,
    cameraMode: record.cameraMode === "walkthrough" || record.cameraMode === "tour" || record.cameraMode === "fixed" ? record.cameraMode : "orbit",
    lightingScene: record.lightingScene === "dusk" || record.lightingScene === "night" || record.lightingScene === "artificialOnly" || record.lightingScene === "beamAnalysis" ? record.lightingScene : "dayWithLights",
    lightingSceneId: typeof record.lightingSceneId === "string" ? record.lightingSceneId : undefined,
    presentationMode: Boolean(record.presentationMode),
    editorMode: record.editorMode === "presentation" || record.presentationMode ? "presentation" : "edit",
    materialPreview: record.materialPreview !== false,
    designStyle: record.designStyle === "naturalWood" || record.designStyle === "softCream" || record.designStyle === "modernStone" ? record.designStyle : "warmJapandi",
    wallDisplayMode: record.wallDisplayMode === "full" || record.wallDisplayMode === "exteriorHidden" || record.wallDisplayMode === "exteriorTransparent" || record.wallDisplayMode === "allTransparent" ? record.wallDisplayMode : "cutaway",
    roomCeilingMode: record.roomCeilingMode === "translucent" || record.roomCeilingMode === "solid" ? record.roomCeilingMode : "hidden",
    drawingViewPreset: record.drawingViewPreset === "cutawayEdit" || record.drawingViewPreset === "fullSpace" || record.drawingViewPreset === "interiorTour" || record.drawingViewPreset === "currentRoom" || record.drawingViewPreset === "currentObject" || record.drawingViewPreset === "ceilingUp" || record.drawingViewPreset === "wallElevation" ? record.drawingViewPreset : "birdseyeEdit",
    source: record.source === "generated" ? "generated" : "user",
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date(0).toISOString()
  };
}

export function parseSavedRenderCameras(currentJson: string | null, legacyJson: string | null = null): SavedRenderCamera[] {
  for (const raw of [currentJson, legacyJson]) {
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      return dedupeSavedRenderCameras(parsed.map(migrateRecord).filter((record): record is SavedRenderCamera => Boolean(record)));
    } catch {
      continue;
    }
  }
  return [];
}

export function serializeSavedRenderCameras(records: SavedRenderCamera[]) {
  return JSON.stringify(dedupeSavedRenderCameras(records));
}

function vectorDistance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function sameSavedCameraComposition(a: SavedRenderCamera, b: SavedRenderCamera) {
  return a.floor === b.floor
    && a.focus.kind === b.focus.kind
    && a.focus.roomId === b.focus.roomId
    && a.focus.outdoorId === b.focus.outdoorId
    && a.focus.objectId === b.focus.objectId
    && a.focus.wallId === b.focus.wallId
    && vectorDistance(a.cameraPosition, b.cameraPosition) < 0.08
    && vectorDistance(a.target, b.target) < 0.08
    && Math.abs(a.fov - b.fov) < 1.25;
}

export function dedupeSavedRenderCameras(records: SavedRenderCamera[]) {
  return records.reduce<SavedRenderCamera[]>((result, record) => {
    const duplicateIndex = result.findIndex((candidate) => sameSavedCameraComposition(candidate, record));
    if (duplicateIndex >= 0) result[duplicateIndex] = record;
    else result.push(record);
    return result;
  }, []);
}

export function validateSavedRenderCamera(record: SavedRenderCamera, context: CameraValidationContext) {
  const structure = context.structuresByFloor[record.floor];
  if (!structure) return { valid: false, reason: `楼层 ${record.floor} 已不存在` } as const;
  if (record.focus.roomId && !structure.rooms.some((room) => room.id === record.focus.roomId)) return { valid: false, reason: `房间 ${record.focus.roomId} 已不存在` } as const;
  if (record.focus.outdoorId && !structure.outdoors.some((outdoor) => outdoor.id === record.focus.outdoorId)) return { valid: false, reason: `庭院区域 ${record.focus.outdoorId} 已不存在` } as const;
  if (record.focus.wallId && !structure.walls.some((wall) => wall.id === record.focus.wallId)) return { valid: false, reason: `墙体 ${record.focus.wallId} 已不存在` } as const;
  if (record.focus.objectId) {
    const furnitureExists = context.furniture.some((item) => item.id === record.focus.objectId && item.floorId === record.floor);
    const drawingExists = context.drawingObjectIds?.has(record.focus.objectId) ?? false;
    if (!furnitureExists && !drawingExists) return { valid: false, reason: `对象 ${record.focus.objectId} 已不存在` } as const;
  }
  return { valid: true, reason: null } as const;
}
