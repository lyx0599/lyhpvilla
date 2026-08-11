import type { DrawingItem, FloorId, LightColorTemperature, LightingLayer } from "../types/space";
import type { LightingScene } from "../types/workspace";
import { modernWarmNaturalShowroomCalibration } from "./showroom-material-resources.ts";
import type { PbrMaterialToken } from "./material-system";

export const MODERN_WARM_NATURAL_SYSTEM_ID = "modern-warm-natural-v1" as const;
export const MODERN_WARM_NATURAL_STYLE_PRESET = "modernNatural" as const;

/** One shared material identity list consumed by 1F, B1, 2F and B2. */
export const modernWarmNaturalCanonicalTokens = [
  "warmWhiteMineral",
  "warmOak",
  "oakFloor",
  "darkWalnut",
  "travertine",
  "warmGreyStone",
  "microCement",
  "beigeFabric",
  "oatTaupeLacquer",
  "blackTopGrainLeather",
  "blackTitanium",
  "brushedBronze",
  "clearGlass",
  "smokedGlass",
  "warmWhiteCeramic",
  "wetAreaTile"
] as const satisfies readonly PbrMaterialToken[];

export type ModernWarmNaturalSceneKey = "daylight" | "daily" | "activity" | "night" | "cleaning";

export const modernWarmNaturalSceneKeys = [
  "daylight",
  "daily",
  "activity",
  "night",
  "cleaning"
] as const satisfies readonly ModernWarmNaturalSceneKey[];

export const modernWarmNaturalLightingPolicy = {
  layers: ["ambient", "task", "accent", "decorative", "cabinetStrip", "mirrorLight", "outdoor"],
  colorTemperatureByLayer: {
    ambient: "3000K",
    task: "3000K",
    accent: "2700K",
    decorative: "2700K",
    cabinetStrip: "3000K",
    mirrorLight: "3000K",
    outdoor: "2700K"
  },
  fixtureExceptions: {
    "bed-reading": "2700K",
    "night-light": "2700K",
    "step-light": "2700K",
    "round-table-pendant": "2700K",
    "curtain-strip": "2700K",
    "yard-task": "3000K"
  }
} as const satisfies {
  layers: readonly LightingLayer[];
  colorTemperatureByLayer: Record<LightingLayer, LightColorTemperature>;
  fixtureExceptions: Record<string, LightColorTemperature>;
};

/**
 * Stable compatibility contract for floor migrations. Legacy names remain
 * readable, but all new bindings must write the canonical value on the right.
 */
export const modernWarmNaturalLegacyMaterialMappings = {
  smokedWalnut: "darkWalnut",
  champagneBronze: "brushedBronze",
  smokedOatTaupe: "oatTaupeLacquer",
  darkBronze: "blackTitanium",
  warmTaupeLeather: "brushedBronze"
} as const satisfies Record<string, PbrMaterialToken>;

/** Tokens calibrated directly by their canonical procedural PBR definition. */
export const modernWarmNaturalNativePbrTokens = [
  "oakFloor",
  "darkWalnut",
  "beigeFabric",
  "smokedGlass",
  "brushedBronze"
] as const satisfies readonly PbrMaterialToken[];

type FloorProfile = {
  label: string;
  materialBalance: Partial<Record<PbrMaterialToken, number>>;
  exposureCompensationEv: number;
  ambientFill: number;
  activityLabel: string;
  functionalFixtureFamilies: readonly string[];
  sceneBrightness: Record<ModernWarmNaturalSceneKey, Record<LightingLayer, number>>;
};

const sharedSceneBrightness: Record<ModernWarmNaturalSceneKey, Record<LightingLayer, number>> = {
  daylight: { ambient: 20, task: 25, accent: 15, decorative: 0, cabinetStrip: 20, mirrorLight: 30, outdoor: 0 },
  daily: { ambient: 72, task: 72, accent: 42, decorative: 32, cabinetStrip: 55, mirrorLight: 70, outdoor: 20 },
  activity: { ambient: 64, task: 86, accent: 58, decorative: 48, cabinetStrip: 78, mirrorLight: 65, outdoor: 15 },
  night: { ambient: 0, task: 0, accent: 12, decorative: 15, cabinetStrip: 8, mirrorLight: 0, outdoor: 12 },
  cleaning: { ambient: 100, task: 100, accent: 70, decorative: 40, cabinetStrip: 100, mirrorLight: 100, outdoor: 65 }
};

const sceneBrightness = (overrides: Partial<Record<ModernWarmNaturalSceneKey, Partial<Record<LightingLayer, number>>>> = {}) =>
  Object.fromEntries(modernWarmNaturalSceneKeys.map((key) => [key, { ...sharedSceneBrightness[key], ...overrides[key] }])) as FloorProfile["sceneBrightness"];

/**
 * Floors only alter balance, exposure and functional-light demand. They never
 * introduce a new material identity, lighting layer or scene category.
 */
export const modernWarmNaturalFloorProfiles = {
  "1F": {
    label: "公共空间高配版",
    materialBalance: { warmWhiteMineral: 38, warmOak: 18, darkWalnut: 10, travertine: 12, warmGreyStone: 14, beigeFabric: 8 },
    exposureCompensationEv: 0,
    ambientFill: 1,
    activityLabel: "晚餐 / 社交",
    functionalFixtureFamilies: ["under-cabinet-strip", "cabinet-strip", "mirror-light", "step-light"],
    sceneBrightness: sceneBrightness({ activity: { ambient: 58, task: 92, accent: 68, decorative: 56, cabinetStrip: 82 } })
  },
  B1: {
    label: "明亮地下层版",
    materialBalance: { warmWhiteMineral: 46, warmOak: 24, darkWalnut: 5, microCement: 17, beigeFabric: 8 },
    exposureCompensationEv: 0.2,
    ambientFill: 1.12,
    activityLabel: "阅读 / 活动",
    functionalFixtureFamilies: ["cabinet-strip", "under-cabinet-strip", "mirror-light", "step-light"],
    sceneBrightness: sceneBrightness({ daylight: { ambient: 32, task: 35 }, daily: { ambient: 80 }, activity: { task: 95 } })
  },
  "2F": {
    label: "安静私密版",
    materialBalance: { warmWhiteMineral: 42, warmOak: 7, oakFloor: 24, beigeFabric: 14, darkWalnut: 9, travertine: 2, warmGreyStone: 2 },
    exposureCompensationEv: -0.08,
    ambientFill: 0.96,
    activityLabel: "休息",
    functionalFixtureFamilies: ["cabinet-strip", "bed-reading", "night-light", "mirror-light"],
    sceneBrightness: sceneBrightness({
      daily: { ambient: 64, task: 72, accent: 42, decorative: 38, cabinetStrip: 55, mirrorLight: 70 },
      activity: { ambient: 42, task: 45, accent: 50, decorative: 58, cabinetStrip: 52, mirrorLight: 45 }
    })
  },
  B2: {
    label: "休闲社交版",
    materialBalance: { warmWhiteMineral: 28, warmOak: 15, darkWalnut: 19, warmGreyStone: 18, microCement: 10, beigeFabric: 5, blackTopGrainLeather: 5 },
    exposureCompensationEv: 0.12,
    ambientFill: 1.05,
    activityLabel: "聚会 / 大板桌",
    functionalFixtureFamilies: ["cabinet-strip", "step-light", "narrow-wallwasher", "adjustable-spot"],
    sceneBrightness: sceneBrightness({
      activity: { ambient: 58, task: 88, accent: 60, decorative: 48, cabinetStrip: 82 },
      night: { ambient: 5, task: 0, accent: 18, decorative: 20, cabinetStrip: 14 }
    })
  }
} as const satisfies Record<"1F" | "B1" | "2F" | "B2", FloorProfile>;

export { modernWarmNaturalShowroomCalibration };

export function modernWarmNaturalSceneId(floorId: Exclude<FloorId, "YARD">, key: ModernWarmNaturalSceneKey) {
  return `SCENE-MWN-V1-${floorId}-${key.toUpperCase()}`;
}

const sceneDisplayNames: Record<ModernWarmNaturalSceneKey, string> = {
  daylight: "日光",
  daily: "日常",
  activity: "主要活动",
  night: "夜间",
  cleaning: "清洁"
};

export function createModernWarmNaturalFloorScenes(items: DrawingItem[], floorId: Exclude<FloorId, "YARD">): LightingScene[] {
  const profile = modernWarmNaturalFloorProfiles[floorId];
  const floorLights = items.filter((item) => item.floorId === floorId && item.category === "light" && item.controlGroupId);
  const groups = new Map<string, DrawingItem[]>();
  floorLights.forEach((light) => groups.set(light.controlGroupId!, [...(groups.get(light.controlGroupId!) ?? []), light]));

  return modernWarmNaturalSceneKeys.map((key) => ({
    id: modernWarmNaturalSceneId(floorId, key),
    name: `${floorId} ${key === "activity" ? profile.activityLabel : sceneDisplayNames[key]}`,
    floorId,
    category: "room" as const,
    groupStates: Array.from(groups.entries()).map(([controlGroupId, groupLights]) => {
      const layer = groupLights.find((light) => light.lightingLayer)?.lightingLayer ?? "ambient";
      const brightness = profile.sceneBrightness[key][layer];
      return { controlGroupId, on: brightness > 0, brightness };
    }),
    notes: `${MODERN_WARM_NATURAL_SYSTEM_ID}：只记录本层控制组状态；亮度为楼层 profile 覆盖，灯具身份与层级全屋共享。`,
    status: "draft" as const
  }));
}
