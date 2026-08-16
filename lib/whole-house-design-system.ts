import type { DrawingItem, FloorId, Furniture, LightingLayer } from "../types/space";
import type { LightingScene } from "../types/workspace";
import {
  getCabinetInteriorTemplate,
  isEditableCabinetFurniture,
  normalizeCabinetInteriorLayout,
  validateCabinetInteriorLayout
} from "./cabinet-interior.ts";
import {
  createModernWarmNaturalFloorScenes,
  modernWarmNaturalFloorProfiles,
  modernWarmNaturalSceneId,
  modernWarmNaturalSceneKeys,
  type ModernWarmNaturalSceneKey
} from "./modern-warm-natural-system.ts";

export const WHOLE_HOUSE_DESIGN_SYSTEM_ID = "whole-house-lighting-cabinet-v1" as const;

export type WholeHouseLightingSceneKey = ModernWarmNaturalSceneKey;

export const wholeHouseLightingScenes = [
  { key: "daylight", label: "日光", environment: "dayWithLights" },
  { key: "daily", label: "日常", environment: "dusk" },
  { key: "activity", label: "主要活动", environment: "dusk" },
  { key: "night", label: "夜间", environment: "night" },
  { key: "cleaning", label: "清洁", environment: "artificialOnly" }
] as const satisfies ReadonlyArray<{
  key: WholeHouseLightingSceneKey;
  label: string;
  environment: "dayWithLights" | "dusk" | "night" | "artificialOnly";
}>;

export const wholeHouseLightingFloorPolicies = {
  "1F": { activityLabel: modernWarmNaturalFloorProfiles["1F"].activityLabel, scopeLabel: "公共与日常起居", exposureCompensationEv: modernWarmNaturalFloorProfiles["1F"].exposureCompensationEv, ambientFill: modernWarmNaturalFloorProfiles["1F"].ambientFill },
  B1: { activityLabel: modernWarmNaturalFloorProfiles.B1.activityLabel, scopeLabel: "办公、阅读与活动", exposureCompensationEv: modernWarmNaturalFloorProfiles.B1.exposureCompensationEv, ambientFill: modernWarmNaturalFloorProfiles.B1.ambientFill },
  "2F": { activityLabel: modernWarmNaturalFloorProfiles["2F"].activityLabel, scopeLabel: "睡眠、卫浴与休息", exposureCompensationEv: modernWarmNaturalFloorProfiles["2F"].exposureCompensationEv, ambientFill: modernWarmNaturalFloorProfiles["2F"].ambientFill },
  B2: { activityLabel: modernWarmNaturalFloorProfiles.B2.activityLabel, scopeLabel: "休闲、聚会与储藏", exposureCompensationEv: modernWarmNaturalFloorProfiles.B2.exposureCompensationEv, ambientFill: modernWarmNaturalFloorProfiles.B2.ambientFill },
  YARD: { activityLabel: "户外使用", scopeLabel: "迎宾、休闲、操作与安全", exposureCompensationEv: 0, ambientFill: 1 }
} as const satisfies Record<FloorId, { activityLabel: string; scopeLabel: string; exposureCompensationEv: number; ambientFill: number }>;

export type LightingExperienceGroupKey = "general" | "task" | "atmosphere" | "integrated" | "safety";

export const lightingExperienceGroupLabels: Record<LightingExperienceGroupKey, string> = {
  general: "主照明",
  task: "任务照明",
  atmosphere: "氛围照明",
  integrated: "柜体 / 镜前",
  safety: "夜灯 / 安全"
};

export const lightingExperienceGroupOrder = ["general", "task", "atmosphere", "integrated", "safety"] as const satisfies readonly LightingExperienceGroupKey[];

export function getLightingExperienceGroup(item: DrawingItem): LightingExperienceGroupKey {
  const signature = `${item.id} ${item.label ?? ""} ${item.type ?? ""} ${item.lightType ?? ""} ${item.lightSpec?.fixtureFamily ?? ""}`.toLowerCase();
  if (/night|step|stair|bollard|in-ground|path|起夜|踏步|楼梯|路径|安全/.test(signature)) return "safety";
  if (item.lightingLayer === "cabinetStrip" || item.lightingLayer === "mirrorLight" || /cabinet|mirror|柜内|柜下|镜前/.test(signature)) return "integrated";
  if (item.lightingLayer === "task" || /task|reading|desk|cooktop|sink|操作|阅读|工作/.test(signature)) return "task";
  if (item.lightingLayer === "accent" || item.lightingLayer === "decorative" || /wash|cove|curtain|plant|pendant|重点|氛围|洗墙|吊灯|照树/.test(signature)) return "atmosphere";
  if (item.lightingLayer === "outdoor") return /task|操作|烧烤|洗衣/.test(signature) ? "task" : "atmosphere";
  return "general";
}

export type LightingCameraRole = "floorOverview" | "roomOverview" | "humanView" | "taskCloseup";

export const wholeHouseLightingCameraRoles = [
  { key: "floorOverview", label: "楼层鸟瞰", purpose: "查看房间之间的亮暗关系与夜间路径。" },
  { key: "roomOverview", label: "房间斜俯", purpose: "同时查看灯具分布、受光面和家具关系。" },
  { key: "humanView", label: "人眼视角", purpose: "按约 1.55m 视高检查眩光、明暗和空间感。" },
  { key: "taskCloseup", label: "使用位近景", purpose: "检查台面、床头、沙发、镜前或户外操作面的实际效果。" }
] as const satisfies ReadonlyArray<{ key: LightingCameraRole; label: string; purpose: string }>;

export function wholeHouseLightingSceneId(floorId: FloorId, key: WholeHouseLightingSceneKey) {
  return floorId === "YARD" ? `SCENE-WLC-V1-YARD-${key.toUpperCase()}` : modernWarmNaturalSceneId(floorId, key);
}

const yardBrightness: Record<WholeHouseLightingSceneKey, Record<LightingExperienceGroupKey, number>> = {
  daylight: { general: 0, task: 20, atmosphere: 0, integrated: 20, safety: 0 },
  daily: { general: 50, task: 55, atmosphere: 45, integrated: 55, safety: 40 },
  activity: { general: 65, task: 90, atmosphere: 68, integrated: 90, safety: 55 },
  night: { general: 0, task: 0, atmosphere: 20, integrated: 10, safety: 28 },
  cleaning: { general: 100, task: 100, atmosphere: 80, integrated: 100, safety: 100 }
};

export function createWholeHouseLightingScenes(items: DrawingItem[], floorId: FloorId): LightingScene[] {
  if (floorId !== "YARD") return createModernWarmNaturalFloorScenes(items, floorId);
  const groups = new Map<string, DrawingItem[]>();
  items.filter((item) => item.floorId === floorId && item.category === "light" && item.controlGroupId).forEach((item) => {
    groups.set(item.controlGroupId!, [...(groups.get(item.controlGroupId!) ?? []), item]);
  });
  return modernWarmNaturalSceneKeys.map((key) => ({
    id: wholeHouseLightingSceneId(floorId, key),
    name: `院子 ${key === "activity" ? wholeHouseLightingFloorPolicies.YARD.activityLabel : wholeHouseLightingScenes.find((scene) => scene.key === key)!.label}`,
    floorId,
    category: "room" as const,
    groupStates: Array.from(groups.entries()).map(([controlGroupId, lights]) => {
      const group = getLightingExperienceGroup(lights[0]);
      const brightness = yardBrightness[key][group];
      return { controlGroupId, on: brightness > 0, brightness };
    }),
    notes: `${WHOLE_HOUSE_DESIGN_SYSTEM_ID}：院子沿用全屋五场景入口，烧烤、洗衣等具体用途由空间灯组承担，不增加第六个主场景。`,
    status: "draft" as const
  }));
}

export type WholeHouseCabinetFamily =
  | "wardrobe"
  | "kitchen"
  | "bathroom"
  | "entry"
  | "storage"
  | "display"
  | "bookshelf"
  | "island"
  | "outdoorStorage";

export const wholeHouseCabinetFamilyLabels: Record<WholeHouseCabinetFamily, string> = {
  wardrobe: "衣物收纳",
  kitchen: "厨房柜体",
  bathroom: "卫浴柜体",
  entry: "玄关收纳",
  storage: "综合储物",
  display: "展示柜",
  bookshelf: "书柜 / 书架",
  island: "岛台 / 水吧",
  outdoorStorage: "户外柜体"
};

export const wholeHouseCabinetSections = [
  { key: "function", label: "用途与容量" },
  { key: "exterior", label: "柜门与外观" },
  { key: "interior", label: "内部布局" },
  { key: "materials", label: "材质与五金" },
  { key: "services", label: "灯光 / 水电 / 检修" },
  { key: "construction", label: "收口与施工" }
] as const;

export function getWholeHouseCabinetFamily(item: Furniture): WholeHouseCabinetFamily {
  const signature = `${item.floorId} ${item.outdoorId ?? ""} ${item.outdoorObjectType ?? ""} ${item.type} ${item.moduleType ?? ""} ${item.render3d?.assetType ?? ""} ${item.name}`;
  if (item.floorId === "YARD" || /outdoorCabinet|户外柜/.test(signature)) return "outdoorStorage";
  const template = getCabinetInteriorTemplate(item);
  if (template === "wardrobe") return "wardrobe";
  if (["kitchenBase", "kitchenWall", "kitchenTall"].includes(template)) return "kitchen";
  if (template === "bathroomVanity") return "bathroom";
  if (template === "entry" || template === "shoe") return "entry";
  if (template === "display") return "display";
  if (template === "bookshelf") return "bookshelf";
  if (template === "island") return "island";
  return "storage";
}

export type WholeHouseCabinetReadiness = "ready" | "needsReview" | "blocked";

export function getWholeHouseCabinetSummary(item: Furniture) {
  if (!isEditableCabinetFurniture(item)) return null;
  const layout = normalizeCabinetInteriorLayout(item.cabinetInterior, item);
  const checks = validateCabinetInteriorLayout(item, layout);
  const family = getWholeHouseCabinetFamily(item);
  const additionalWarnings: string[] = [];
  if (!item.cabinetInterior) additionalWarnings.push("内部布局尚未保存，当前显示为统一模板建议。");
  if (!item.render3d?.cabinetMaterialOverrides) additionalWarnings.push("柜门、柜体、台面、玻璃和五金尚未建立实例级材质分层。");
  if (family === "outdoorStorage") {
    if (!/防水|防潮|耐候|IP/i.test(`${item.constructionNote ?? ""} ${item.note ?? ""}`)) additionalWarnings.push("户外柜尚未记录防水、防潮或耐候要求。");
    if ((item.render3d?.elevationMm ?? 0) < 80) additionalWarnings.push("户外柜离地与基座排水需要现场深化。");
  }
  const readiness: WholeHouseCabinetReadiness = checks.some((check) => check.severity === "error")
    ? "blocked"
    : checks.some((check) => check.severity === "warning") || additionalWarnings.length
      ? "needsReview"
      : "ready";
  return {
    id: item.id,
    floorId: item.floorId,
    roomId: item.roomId,
    family,
    familyLabel: wholeHouseCabinetFamilyLabels[family],
    readiness,
    dimensionsMm: {
      width: Math.round(item.dimensions.width * 10),
      depth: Math.round(item.dimensions.depth * 10),
      height: Math.round(item.dimensions.height * 10)
    },
    template: layout.template,
    openingMode: layout.openingMode,
    moduleCount: layout.modules.length,
    hasSavedInterior: Boolean(item.cabinetInterior),
    hasIntegratedLighting: Boolean(item.render3d?.cabinetVisual?.interiorLighting || item.render3d?.cabinetVisual?.bays?.some((bay) => bay.interiorLighting)),
    serviceRequirements: item.serviceRequirements ?? {},
    checks,
    additionalWarnings
  };
}

export function getWholeHouseCabinetSummaries(items: Furniture[]) {
  return items.map(getWholeHouseCabinetSummary).filter((summary): summary is NonNullable<typeof summary> => Boolean(summary));
}

export const wholeHouseLightingLayerContract = [
  "ambient",
  "task",
  "accent",
  "decorative",
  "cabinetStrip",
  "mirrorLight",
  "outdoor"
] as const satisfies readonly LightingLayer[];
