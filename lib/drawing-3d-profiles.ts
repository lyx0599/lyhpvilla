import type { DrawingItemCategory, DrawingSheetType } from "../types/space";

export type Drawing3DViewPreset =
  | "birdseyeEdit"
  | "cutawayEdit"
  | "fullSpace"
  | "interiorTour"
  | "currentRoom"
  | "currentObject"
  | "ceilingUp"
  | "wallElevation";

export type Drawing3DWallMode = "full" | "cutaway" | "exteriorHidden" | "exteriorTransparent" | "allTransparent";
export type Drawing3DFurnitureMode = "major" | "all" | "relatedOnly" | "dim" | "hidden";
export type Drawing3DMaterialMode = "realistic" | "technical" | "flat";

export type Drawing3DPresentationProfile = {
  sheetType: DrawingSheetType;
  label: string;
  defaultPreset: Drawing3DViewPreset;
  wallMode: Drawing3DWallMode;
  furnitureMode: Drawing3DFurnitureMode;
  materialMode: Drawing3DMaterialMode;
  drawingCategories: DrawingItemCategory[];
  showOutdoors: boolean;
  showCeiling: boolean;
  showStructureIds: boolean;
  showRelationshipLines: boolean;
  realTimeLighting: boolean;
  focusCurrentRoom: boolean;
  emptyDataHint?: string;
  summary: string;
};

export const drawing3DViewPresetLabels: Record<Drawing3DViewPreset, string> = {
  birdseyeEdit: "鸟瞰编辑",
  cutawayEdit: "剖切编辑",
  fullSpace: "完整空间",
  interiorTour: "室内漫游",
  currentRoom: "当前房间",
  currentObject: "当前对象",
  ceilingUp: "顶面观察",
  wallElevation: "墙面正视"
};

export const drawing3DViewPresets = Object.keys(drawing3DViewPresetLabels) as Drawing3DViewPreset[];

export const drawing3DPresentationProfiles: Record<DrawingSheetType, Drawing3DPresentationProfile> = {
  sitePlan: {
    sheetType: "sitePlan", label: "总平面 3D", defaultPreset: "birdseyeEdit", wallMode: "allTransparent", furnitureMode: "all", materialMode: "realistic",
    drawingCategories: ["ceiling", "floorFinish", "wallFinish", "cabinet", "light"], showOutdoors: true, showCeiling: true, showStructureIds: false, showRelationshipLines: false, realTimeLighting: false, focusCurrentRoom: false,
    summary: "汇总当前统一项目状态中的建筑、庭院、全部家具设备、最终饰面、吊顶与可见灯具；内外墙均以半透明完整墙高表达，专业点位和施工标记默认隐藏。"
  },
  structurePlan: {
    sheetType: "structurePlan", label: "结构专项 3D", defaultPreset: "cutawayEdit", wallMode: "cutaway", furnitureMode: "hidden", materialMode: "technical",
    drawingCategories: [], showOutdoors: false, showCeiling: false, showStructureIds: true, showRelationshipLines: false, realTimeLighting: false, focusCurrentRoom: false,
    summary: "显示墙、柱、楼板、楼梯、挑空、天窗与结构开口，保持可编辑剖切表达。"
  },
  demolitionAndBuildPlan: {
    sheetType: "demolitionAndBuildPlan", label: "拆改专项 3D", defaultPreset: "cutawayEdit", wallMode: "cutaway", furnitureMode: "hidden", materialMode: "technical",
    drawingCategories: ["annotation"], showOutdoors: false, showCeiling: false, showStructureIds: true, showRelationshipLines: false, realTimeLighting: false, focusCurrentRoom: false,
    emptyDataHint: "当前 workspace 没有明确拆除/新建状态，已回退为原结构技术模型。",
    summary: "原结构、拆除和新建按技术材质区分；无拆改状态时安全回退原结构。"
  },
  furniturePlan: {
    sheetType: "furniturePlan", label: "家具定位专项 3D", defaultPreset: "birdseyeEdit", wallMode: "cutaway", furnitureMode: "all", materialMode: "realistic",
    drawingCategories: ["socket", "switch", "light", "waterSupply", "drainage"], showOutdoors: false, showCeiling: false, showStructureIds: false, showRelationshipLines: false, realTimeLighting: false, focusCurrentRoom: false,
    summary: "突出家具、柜体、设备、通行与机电关联，保留当前空间编辑型剖切模型。"
  },
  socketPlan: {
    sheetType: "socketPlan", label: "插座专项 3D", defaultPreset: "currentRoom", wallMode: "cutaway", furnitureMode: "relatedOnly", materialMode: "technical",
    drawingCategories: ["socket", "network"], showOutdoors: false, showCeiling: false, showStructureIds: false, showRelationshipLines: true, realTimeLighting: false, focusCurrentRoom: true,
    emptyDataHint: "当前楼层没有插座 drawingItems，已保留定位模型。",
    summary: "高亮插座、安装高度、宿主墙与关联家具，用于检查遮挡和定位。"
  },
  switchPlan: {
    sheetType: "switchPlan", label: "开关控制专项 3D", defaultPreset: "currentRoom", wallMode: "cutaway", furnitureMode: "relatedOnly", materialMode: "technical",
    drawingCategories: ["switch", "light"], showOutdoors: false, showCeiling: false, showStructureIds: false, showRelationshipLines: true, realTimeLighting: false, focusCurrentRoom: true,
    emptyDataHint: "当前楼层没有开关 drawingItems，已保留定位模型。",
    summary: "显示开关高度、控制组、受控灯具及单控/多控/调光/智能关系。"
  },
  lightingPlan: {
    sheetType: "lightingPlan", label: "室内灯光体验 3D", defaultPreset: "interiorTour", wallMode: "full", furnitureMode: "all", materialMode: "realistic",
    drawingCategories: ["light", "switch"], showOutdoors: true, showCeiling: true, showStructureIds: false, showRelationshipLines: false, realTimeLighting: true, focusCurrentRoom: true,
    emptyDataHint: "当前楼层没有正式灯具 drawingItems，已回退为普通完整空间。",
    summary: "完整墙高与顶面、正式灯具光源、家具和主要材质共同构成室内灯光体验。"
  },
  waterSupplyPlan: {
    sheetType: "waterSupplyPlan", label: "给水专项 3D", defaultPreset: "currentRoom", wallMode: "cutaway", furnitureMode: "relatedOnly", materialMode: "technical",
    drawingCategories: ["waterSupply"], showOutdoors: true, showCeiling: false, showStructureIds: false, showRelationshipLines: true, realTimeLighting: false, focusCurrentRoom: true,
    emptyDataHint: "当前楼层没有给水 drawingItems，暂不推测专业管线。",
    summary: "高亮给水点、安装高度、冷热水类型与关联设备，不推测专业管线路径。"
  },
  drainagePlan: {
    sheetType: "drainagePlan", label: "排水专项 3D", defaultPreset: "currentRoom", wallMode: "cutaway", furnitureMode: "relatedOnly", materialMode: "technical",
    drawingCategories: ["drainage"], showOutdoors: true, showCeiling: false, showStructureIds: false, showRelationshipLines: true, realTimeLighting: false, focusCurrentRoom: true,
    emptyDataHint: "当前楼层没有排水 drawingItems，暂不模拟完整排水管路。",
    summary: "显示排水点、地漏、墙排、柜内排水与地面设备关系。"
  },
  ceilingPlan: {
    sheetType: "ceilingPlan", label: "吊顶专项 3D", defaultPreset: "ceilingUp", wallMode: "full", furnitureMode: "dim", materialMode: "technical",
    drawingCategories: ["ceiling", "light", "ventilation"], showOutdoors: false, showCeiling: true, showStructureIds: false, showRelationshipLines: false, realTimeLighting: false, focusCurrentRoom: true,
    emptyDataHint: "当前楼层没有吊顶区域 drawingItems，已用房间边界生成可识别的顶面占位。",
    summary: "完整墙高与顶面，显示吊顶标高、跌级、灯槽、风口和检修口，并支持透明/实体顶面。"
  },
  floorFinishPlan: {
    sheetType: "floorFinishPlan", label: "地面铺装专项 3D", defaultPreset: "birdseyeEdit", wallMode: "cutaway", furnitureMode: "dim", materialMode: "realistic",
    drawingCategories: ["floorFinish"], showOutdoors: true, showCeiling: false, showStructureIds: false, showRelationshipLines: false, realTimeLighting: false, focusCurrentRoom: false,
    emptyDataHint: "当前楼层没有地面铺装 drawingItems，已保留房间默认地面材质。",
    summary: "高亮地面材质、铺贴方向、分缝与区域边界，家具以弱化方式提供尺度参照。"
  },
  wallFinishPlan: {
    sheetType: "wallFinishPlan", label: "墙面材料专项 3D", defaultPreset: "wallElevation", wallMode: "full", furnitureMode: "dim", materialMode: "realistic",
    drawingCategories: ["wallFinish"], showOutdoors: false, showCeiling: false, showStructureIds: false, showRelationshipLines: false, realTimeLighting: false, focusCurrentRoom: true,
    emptyDataHint: "当前楼层没有墙面材料 drawingItems，已保留完整墙高并等待绑定墙面。",
    summary: "完整墙高，高亮墙面材料、范围、高度和特殊做法，选中墙面可正视。"
  },
  materialPlan: {
    sheetType: "materialPlan", label: "材料索引专项 3D", defaultPreset: "fullSpace", wallMode: "full", furnitureMode: "all", materialMode: "realistic",
    drawingCategories: ["floorFinish", "wallFinish", "cabinet"], showOutdoors: true, showCeiling: false, showStructureIds: false, showRelationshipLines: false, realTimeLighting: false, focusCurrentRoom: false,
    summary: "使用真实或近似材质预览，并支持按材料类别过滤和同材质对象高亮。"
  },
  annotationPlan: {
    sheetType: "annotationPlan", label: "施工标注专项 3D", defaultPreset: "currentObject", wallMode: "cutaway", furnitureMode: "dim", materialMode: "flat",
    drawingCategories: ["annotation"], showOutdoors: true, showCeiling: false, showStructureIds: true, showRelationshipLines: true, realTimeLighting: false, focusCurrentRoom: false,
    emptyDataHint: "当前楼层没有独立 annotation drawingItems，仍显示对象状态与风险提示。",
    summary: "突出施工备注、待确认项、尺寸复核、风险提示、对象 ID 与状态锚点。"
  }
};

export function getDrawing3DPresentationProfile(sheetType: DrawingSheetType) {
  return drawing3DPresentationProfiles[sheetType];
}
