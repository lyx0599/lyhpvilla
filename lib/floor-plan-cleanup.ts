import type { CleanPatch, FloorId, FloorPlanPreset, FloorPlanVisualSettings } from "@/types/space";

export const defaultLayerVisibility = {
  baseFloorPlan: true,
  cleanupPatch: true,
  semanticOverlay: true,
  furnitureOverlay: true,
  debug: false
};

export const floorPlanPresetLabels: Record<FloorPlanPreset, string> = {
  clean_gray: "清爽灰白",
  light_blueprint: "浅色蓝图",
  dark_line: "深色线稿",
  warm_paper: "暖白纸感",
  high_contrast: "高清对比"
};

export const floorPlanPresetSettings: Record<FloorPlanPreset, FloorPlanVisualSettings> = {
  clean_gray: {
    preset: "clean_gray",
    grayscale: true,
    opacity: 0.96,
    contrast: 1.28,
    brightness: 1.02,
    saturation: 0,
    sharpen: true,
    removeTextMarks: true,
    removeWhiteBorder: true,
    hideDebugFrames: true,
    cleanWhiteBackground: true,
    lineEnhance: true,
    repairMode: false,
    layerVisibility: defaultLayerVisibility
  },
  light_blueprint: {
    preset: "light_blueprint",
    grayscale: false,
    opacity: 0.94,
    contrast: 1.18,
    brightness: 1.04,
    saturation: 0.22,
    sharpen: true,
    removeTextMarks: true,
    removeWhiteBorder: true,
    hideDebugFrames: true,
    cleanWhiteBackground: true,
    lineEnhance: true,
    repairMode: false,
    layerVisibility: defaultLayerVisibility
  },
  dark_line: {
    preset: "dark_line",
    grayscale: true,
    opacity: 0.82,
    contrast: 1.28,
    brightness: 0.98,
    saturation: 0,
    sharpen: true,
    removeTextMarks: true,
    removeWhiteBorder: true,
    hideDebugFrames: true,
    cleanWhiteBackground: true,
    lineEnhance: true,
    repairMode: false,
    layerVisibility: defaultLayerVisibility
  },
  warm_paper: {
    preset: "warm_paper",
    grayscale: true,
    opacity: 0.94,
    contrast: 1.16,
    brightness: 1.04,
    saturation: 0.08,
    sharpen: false,
    removeTextMarks: true,
    removeWhiteBorder: true,
    hideDebugFrames: true,
    cleanWhiteBackground: true,
    lineEnhance: false,
    repairMode: false,
    layerVisibility: defaultLayerVisibility
  },
  high_contrast: {
    preset: "high_contrast",
    grayscale: true,
    opacity: 0.9,
    contrast: 1.38,
    brightness: 1.02,
    saturation: 0,
    sharpen: true,
    removeTextMarks: true,
    removeWhiteBorder: true,
    hideDebugFrames: true,
    cleanWhiteBackground: true,
    lineEnhance: true,
    repairMode: false,
    layerVisibility: defaultLayerVisibility
  }
};

export function getDefaultVisualSettings(): FloorPlanVisualSettings {
  return {
    ...floorPlanPresetSettings.clean_gray,
    layerVisibility: { ...defaultLayerVisibility }
  };
}

export function applyFloorPlanPreset(preset: FloorPlanPreset, current: FloorPlanVisualSettings): FloorPlanVisualSettings {
  return {
    ...current,
    ...floorPlanPresetSettings[preset],
    preset,
    layerVisibility: { ...current.layerVisibility }
  };
}

export function getCleanupFillColor(settings: FloorPlanVisualSettings) {
  if (settings.preset === "warm_paper") return "#FFFDF8";
  if (settings.preset === "light_blueprint") return "#F8FCFF";
  return "#FFFFFF";
}

export function getFloorPlanFilter(settings: FloorPlanVisualSettings) {
  const grayscale = settings.grayscale ? "grayscale(1)" : "grayscale(0)";
  const saturation = settings.grayscale ? "saturate(0)" : `saturate(${settings.saturation})`;
  return `${grayscale} ${saturation} contrast(${settings.contrast}) brightness(${settings.brightness})`.trim();
}

export function getRepairOverlayStyles(settings: FloorPlanVisualSettings) {
  return [];
}

export function createHeuristicCleanPatches(floorId: FloorId, existingCount: number, fillColor: string): CleanPatch[] {
  const likelyTextAreas = [
    { x: 33, y: 23, width: 7, height: 2.2, notes: "自动清理房间名/面积文字" },
    { x: 52, y: 35, width: 8, height: 2.2, notes: "自动清理尺寸/面积标注" },
    { x: 66, y: 53, width: 7, height: 2.2, notes: "自动清理房间文字痕迹" },
    { x: 44, y: 69, width: 8, height: 2, notes: "自动清理尺寸标注" }
  ];

  return likelyTextAreas.map((rect, index) => ({
    id: `CP-${floorId}-${String(existingCount + index + 1).padStart(3, "0")}`,
    floorId,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    fillColor,
    notes: rect.notes
  }));
}
