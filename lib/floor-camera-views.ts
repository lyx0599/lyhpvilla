import { tourNodeToCameraView } from "./room-tour.ts";
import { composeCameraView, compositionToFixedView } from "./camera-composition.ts";
import type { CameraCompositionResult, CameraViewport } from "./camera-composition.ts";
import type { DrawingSheetType, FixedCameraView, Floor, FloorId, Furniture, HouseStructure, RoomTourView } from "@/types/space";

export type FloorCameraViewCategory = "general" | "room" | "feature" | "lighting-scene";
export type FloorCameraViewMode = "orbit" | "fixed" | "walkthrough" | "tour";

export type FloorCameraView = {
  id: string;
  floorId: FloorId;
  name: string;
  category: FloorCameraViewCategory;
  cameraMode: FloorCameraViewMode;
  cameraPosition: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  supportedSheetTypes?: DrawingSheetType[];
  roomId?: string;
  outdoorId?: string;
  defaultForFloor?: boolean;
  description?: string;
  fixedView: FixedCameraView;
  tourView?: RoomTourView;
  primary: boolean;
  priority: number;
  recommendedLightingScene?: "dayWithLights" | "dusk" | "night" | "artificialOnly";
  recommendedLightingSceneId?: string;
  composition?: CameraCompositionResult;
};

type BuildFloorCameraViewsInput = {
  floor: Floor;
  structure: HouseStructure;
  sheetType: DrawingSheetType;
  cameraViews: FixedCameraView[];
  roomTourViews: RoomTourView[];
  furniture?: Furniture[];
  viewport?: CameraViewport;
  compositionMargin?: number;
};

const everySheetType: DrawingSheetType[] = [
  "sitePlan", "structurePlan", "demolitionAndBuildPlan", "furniturePlan", "socketPlan", "switchPlan", "lightingPlan",
  "waterSupplyPlan", "drainagePlan", "ceilingPlan", "floorFinishPlan", "wallFinishPlan", "materialPlan", "annotationPlan"
];

function cleanViewName(name: string, floorId: FloorId) {
  return name.replace(new RegExp(`^${floorId}\\s*`), "").replace(/^1F\s*/, "").replace(/^\+\s*/, "").trim();
}

function semanticScore(name: string, floorId: FloorId, sheetType: DrawingSheetType) {
  const compactName = name.replace(/[\s/·（）()_-]/g, "");
  const floorPatterns: Record<FloorId, RegExp[]> = {
    "1F": [/客餐厨|客厅|起居/, /餐桌|中岛/, /厨房/, /壁炉/, /玄关|入口/, /楼梯/, /南院|北院/],
    "2F": [/主卧/, /衣帽/, /主卫|浴缸/, /卧室2|次卧/, /卧室1/, /走廊/, /楼梯/],
    B1: [/总览|夹层/, /客房|房间/, /活动|休闲/, /卫生间|洗衣/, /挑空/, /楼梯/, /走廊/],
    B2: [/客厅|地下客厅/, /书房/, /活动/, /采光井/, /挑空/, /楼梯/, /储物/],
    YARD: [/全院|总览/, /北院|入户/, /南院生活|南院休闲/, /户外餐|活动/, /院门/, /看建筑/, /动线|小路/]
  };
  let score = 100;
  floorPatterns[floorId].some((pattern, index) => {
    if (!pattern.test(compactName)) return false;
    score = index * 10;
    return true;
  });
  if (sheetType === "lightingPlan") {
    if (/客厅|起居|餐|厨房|卧室|书房|活动|南院|北院/.test(compactName)) score -= 18;
    if (/总览|前|后|左|右/.test(compactName)) score += 45;
  } else if (sheetType === "structurePlan") {
    if (/总览|楼梯|挑空|采光井|剖切/.test(compactName)) score -= 28;
    else score += 65;
  } else if (sheetType === "sitePlan" || floorId === "YARD") {
    if (/院|总览|入户|动线|建筑/.test(compactName)) score -= 32;
    else score += 80;
  } else if (sheetType === "furniturePlan") {
    if (/总览|客厅|卧室|厨房|书房|活动|衣帽/.test(compactName)) score -= 12;
  }
  return score;
}

function generalView(
  floor: Floor,
  structure: HouseStructure,
  id: "overview" | "front" | "right" | "back" | "left",
  preferredOverview?: RoomTourView,
  viewport?: CameraViewport,
  compositionMargin?: number
): FloorCameraView {
  const labels = { overview: "鸟瞰", front: "前", right: "右", back: "后", left: "左" };
  const composition = composeCameraView({
    kind: id === "overview" ? "floorOverview" : "floorDirection",
    structure,
    direction: id === "overview" ? undefined : id,
    viewport,
    margin: compositionMargin,
    preferredView: preferredOverview
  });
  const fixedView = compositionToFixedView({
    id: `camera-${floor.id}-${id}`,
    name: `${floor.label} ${labels[id]}`,
    floor: floor.id,
    composition,
    description: id === "overview" ? `${floor.label}按当前可见结构动态适配的整体鸟瞰` : `${floor.label}${labels[id]}向动态通用视角`
  });
  return {
    id: fixedView.id,
    floorId: floor.id,
    name: labels[id],
    category: "general",
    cameraMode: "orbit",
    cameraPosition: fixedView.cameraPosition,
    target: fixedView.target,
    supportedSheetTypes: everySheetType,
    defaultForFloor: id === "overview",
    description: fixedView.description,
    fixedView,
    composition,
    primary: id === "overview",
    priority: id === "overview" ? -100 : 1000
  };
}

function categoryForTour(node: RoomTourView, sheetType: DrawingSheetType): FloorCameraViewCategory {
  if (sheetType === "lightingPlan" && !node.isFloorOverview) return "lighting-scene";
  if (node.type === "viewpoint" || node.type === "stair") return "feature";
  return "room";
}

function tourViewToConfig(
  node: RoomTourView,
  floorId: FloorId,
  sheetType: DrawingSheetType,
  structure: HouseStructure,
  furniture: Furniture[],
  viewport?: CameraViewport,
  compositionMargin?: number
): FloorCameraView {
  const usesAutomaticRoomComposition = node.compositionMode !== "authored" && !node.isFloorOverview && (Boolean(node.roomId || node.outdoorId)) && node.type !== "stair" && node.type !== "viewpoint";
  const composition = usesAutomaticRoomComposition ? composeCameraView({
    kind: "room",
    structure,
    furniture,
    roomId: node.roomId,
    outdoorId: node.outdoorId,
    viewport,
    margin: compositionMargin,
    preferredView: { cameraPosition: node.cameraPosition, target: node.target, fov: node.fov }
  }) : undefined;
  const fixedView = composition
    ? compositionToFixedView({ id: node.id, name: node.name, floor: floorId, composition, description: node.description, targetArea: node.targetArea })
    : tourNodeToCameraView(node);
  const priority = semanticScore(node.name, floorId, sheetType);
  const isStairInspection = node.type === "stair" || Boolean(node.targetArea?.startsWith("stair"));
  return {
    id: node.id,
    floorId,
    name: cleanViewName(node.name, floorId),
    category: categoryForTour(node, sheetType),
    cameraMode: node.isFloorOverview ? "orbit" : isStairInspection || node.compositionMode === "authored" ? "fixed" : "tour",
    cameraPosition: fixedView.cameraPosition,
    target: fixedView.target,
    roomId: node.roomId,
    outdoorId: node.outdoorId,
    description: node.description,
    fixedView,
    composition,
    tourView: node,
    primary: !node.isFloorOverview && priority < 70,
    priority,
    recommendedLightingScene: /庭院|南院|北院/.test(node.name) ? "night" : /卧室|床|壁炉/.test(node.name) ? "dusk" : "dayWithLights",
    recommendedLightingSceneId: node.recommendedLightingSceneId
  };
}

function fixedViewToConfig(view: FixedCameraView, sheetType: DrawingSheetType): FloorCameraView {
  const priority = semanticScore(view.name, view.floor, sheetType);
  return {
    id: view.id,
    floorId: view.floor,
    name: cleanViewName(view.name, view.floor),
    category: /院|庭院/.test(view.name) ? "feature" : sheetType === "lightingPlan" ? "lighting-scene" : "room",
    cameraMode: "fixed",
    cameraPosition: view.cameraPosition,
    target: view.target,
    description: view.description,
    fixedView: view,
    primary: priority < 70,
    priority,
    recommendedLightingScene: /院|庭院/.test(view.name) ? "night" : "dayWithLights"
  };
}

function specialtyViews(floor: Floor, structure: HouseStructure, sheetType: DrawingSheetType, furniture: Furniture[], viewport?: CameraViewport, compositionMargin?: number): FloorCameraView[] {
  if (sheetType !== "ceilingPlan" && sheetType !== "structurePlan") return [];
  if (sheetType === "ceilingPlan") {
    const composition = composeCameraView({ kind: "ceiling", structure, furniture, viewport, margin: compositionMargin });
    const fixedView = compositionToFixedView({
      id: `camera-${floor.id}-ceiling-up`, name: `${floor.label} 顶面观察`, floor: floor.id, composition,
      description: "按当前房间边界从合理室内高度向上检查吊顶区域、灯槽、风口和检修口。"
    });
    return [{
      id: fixedView.id, floorId: floor.id, name: "顶面观察", category: "feature", cameraMode: "fixed",
      cameraPosition: fixedView.cameraPosition, target: fixedView.target, supportedSheetTypes: ["ceilingPlan"],
      defaultForFloor: true, description: fixedView.description, fixedView, composition, primary: true, priority: -80
    }];
  }
  const overview = generalView(floor, structure, "overview", undefined, viewport, compositionMargin);
  const fixedView = { ...overview.fixedView, id: `camera-${floor.id}-structure-cutaway`, name: `${floor.label} 剖切结构`, description: "突出墙、柱、楼板、楼梯与结构开口。" };
  return [{
    id: fixedView.id, floorId: floor.id, name: "剖切结构", category: "feature", cameraMode: "fixed",
    cameraPosition: fixedView.cameraPosition, target: fixedView.target, supportedSheetTypes: ["structurePlan"],
    defaultForFloor: true, description: fixedView.description, fixedView, primary: true, priority: -80
  }];
}

/** Builds the current floor's presentation list without copying workspace camera data. */
export function buildFloorCameraViews(input: BuildFloorCameraViewsInput): FloorCameraView[] {
  const floorFurniture = (input.furniture ?? []).filter((item) => item.floorId === input.floor.id);
  const validRoomIds = new Set(input.structure.rooms.map((room) => room.id));
  const validOutdoorIds = new Set(input.structure.outdoors.map((outdoor) => outdoor.id));
  const sameFloorTourViews = input.roomTourViews.filter((node) => node.floorId === input.floor.id && node.status === "active");
  const currentTourViews = sameFloorTourViews.filter((node) =>
    (!node.roomId || validRoomIds.has(node.roomId)) && (!node.outdoorId || validOutdoorIds.has(node.outdoorId)) && (!node.supportedSheetTypes || node.supportedSheetTypes.includes(input.sheetType))
  );
  const overviewNode = currentTourViews.find((node) => node.isFloorOverview);
  const general = (["overview", "front", "right", "back", "left"] as const).map((id) => generalView(input.floor, input.structure, id, overviewNode, input.viewport, input.compositionMargin));
  // Even when a referenced room was removed, remember that its legacy fixed view
  // belonged to that room so it cannot reappear as an unbound fallback button.
  const sourceViewIds = new Set(sameFloorTourViews.map((node) => node.sourceCameraViewId).filter((id): id is string => Boolean(id)));
  const derived = currentTourViews.filter((node) => !node.isFloorOverview).map((node) => {
    const sourceName = node.roomId
      ? input.structure.rooms.find((room) => room.id === node.roomId)?.name
      : node.outdoorId ? input.structure.outdoors.find((outdoor) => outdoor.id === node.outdoorId)?.name : undefined;
    const isGeneratedSpaceNode = node.id.startsWith(`tour-${input.floor.id}-`) && !node.id.includes("floor-overview");
    return tourViewToConfig(isGeneratedSpaceNode && sourceName ? { ...node, name: sourceName } : node, input.floor.id, input.sheetType, input.structure, floorFurniture, input.viewport, input.compositionMargin);
  });
  const fixedOnly = input.cameraViews
    .filter((view) => view.floor === input.floor.id && !sourceViewIds.has(view.id))
    .map((view) => fixedViewToConfig(view, input.sheetType));
  const specialty = specialtyViews(input.floor, input.structure, input.sheetType, floorFurniture, input.viewport, input.compositionMargin);
  const views = [...general, ...specialty, ...derived, ...fixedOnly].filter((view) => !view.supportedSheetTypes || view.supportedSheetTypes.includes(input.sheetType));
  const seen = new Set<string>();
  const unique = views.filter((view) => !seen.has(view.id) && Boolean(seen.add(view.id))).sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, "zh-CN"));
  const defaultView = (input.sheetType === "lightingPlan" ? unique.find((view) => view.primary && view.category === "lighting-scene") : undefined)
    ?? unique.find((view) => view.defaultForFloor && view.category === "feature")
    ?? unique.find((view) => view.name === "鸟瞰");
  return unique.map((view) => ({ ...view, defaultForFloor: view.id === defaultView?.id }));
}

export function splitFloorCameraViews(views: FloorCameraView[], mobile = false) {
  const limit = mobile ? 1 : 6;
  const primary = views.filter((view) => view.category !== "general" && view.primary).slice(0, limit);
  const primaryIds = new Set(primary.map((view) => view.id));
  const more = views.filter((view) => view.name !== "鸟瞰" && !primaryIds.has(view.id));
  return { primary, more };
}
