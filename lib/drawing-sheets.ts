import type { DrawingSheetType, PlanCanvasMode } from "../types/space";

export type LegacyPlanSheetMode =
  | "site"
  | "structure"
  | "sync"
  | "construction"
  | "furnishing"
  | "socket"
  | "switch"
  | "lighting"
  | "water"
  | "drainage"
  | "ceiling"
  | "flooring"
  | "preview";

export const officialDrawingSheetTypes = [
  "sitePlan",
  "structurePlan",
  "demolitionAndBuildPlan",
  "furniturePlan",
  "socketPlan",
  "switchPlan",
  "lightingPlan",
  "waterSupplyPlan",
  "drainagePlan",
  "ceilingPlan",
  "floorFinishPlan",
  "wallFinishPlan",
  "materialPlan",
  "annotationPlan"
] as const;

export const legacyPlanSheetModeAliases: Record<LegacyPlanSheetMode, PlanCanvasMode> = {
  site: "sitePlan",
  structure: "structurePlan",
  sync: "structureSyncCheck",
  construction: "demolitionAndBuildPlan",
  furnishing: "furniturePlan",
  socket: "socketPlan",
  switch: "switchPlan",
  lighting: "lightingPlan",
  water: "waterSupplyPlan",
  drainage: "drainagePlan",
  ceiling: "ceilingPlan",
  flooring: "floorFinishPlan",
  preview: "presentationView"
};

export const drawingSheetTypeLabels: Record<DrawingSheetType, string> = {
  sitePlan: "总平面图",
  structurePlan: "结构图",
  demolitionAndBuildPlan: "拆改施工图",
  furniturePlan: "家具定位图",
  socketPlan: "插座需求方案（待图纸核对）",
  switchPlan: "开关控制建议图（待图纸核对）",
  lightingPlan: "灯光点位图",
  waterSupplyPlan: "给水需求方案（待现场复核）",
  drainagePlan: "排水需求方案（待现场复核）",
  ceilingPlan: "吊顶图",
  floorFinishPlan: "地面铺装图",
  wallFinishPlan: "墙面材料图",
  materialPlan: "材料索引图",
  annotationPlan: "施工标注/待确认项"
};

export const drawingSheetTypeDescriptions: Record<DrawingSheetType, string> = {
  sitePlan: "1F 建筑与南北庭院合并展示，作为所有专业图纸的总底盘。",
  structurePlan: "只看墙、门窗、楼梯、院子等固定结构骨架。",
  demolitionAndBuildPlan: "表达拆改、洞口、隔断、楼梯和关键施工尺寸，墙体可在此图调整。",
  furniturePlan: "从同一模型显示家具、柜体和硬装对象，用于定位与采购沟通。",
  socketPlan: "基于结构与家具模型布置强弱电插座、专用回路和防水点位。",
  switchPlan: "表达开关位置、双控/场景关系，并以 controlGroupId 联动灯具控制组。",
  lightingPlan: "表达七层灯光系统的灯具编号、类型、色温、控制组、智能/调光和关联开关。",
  waterSupplyPlan: "表达厨房、岛台、卫生间和庭院等给水预留点与需求点。",
  drainagePlan: "表达水槽、地漏、马桶、台盆和庭院等排水预留点与需求点。",
  ceilingPlan: "表达吊顶边界、灯槽、风口和检修口。",
  floorFinishPlan: "表达地面材质、铺装区域和庭院硬地/草坪关系。",
  wallFinishPlan: "表达墙面材料、重点墙和湿区墙面做法。",
  materialPlan: "汇总地面、墙面、柜体、灯具和设备材料索引。",
  annotationPlan: "汇总施工备注、待确认项、检修、防水和厂家协同事项。"
};

export const drawingSheetTypeFootnotes: Record<DrawingSheetType, string> = {
  sitePlan: "同一 1F 模型：建筑 / 北院 / 南院",
  structurePlan: "结构对象：墙 / 门窗 / 楼梯 / 院子",
  demolitionAndBuildPlan: "拆改表达：尺寸 / 洞口 / 隔断 / 楼梯",
  furniturePlan: "家具对象：尺寸 / 位置 / 朝向",
  socketPlan: "强弱电：插座 / 专用回路 / 防水点位",
  switchPlan: "控制关系：开关 / 双控 / 智能场景 / controlGroupId",
  lightingPlan: "灯光：编号 / 分层 / 色温 / 光束角 / 安装 / 控制组",
  waterSupplyPlan: "给水：冷水 / 热水 / 净水 / 预留点",
  drainagePlan: "排水：地漏 / 台盆 / 水槽 / 预留点",
  ceilingPlan: "吊顶：边界 / 灯槽 / 风口 / 检修口",
  floorFinishPlan: "地面：室内铺装 / 庭院硬地 / 绿化",
  wallFinishPlan: "墙面：湿区 / 重点墙 / 涂料 / 石材",
  materialPlan: "材料：地面 / 墙面 / 柜体 / 灯具 / 设备",
  annotationPlan: "标注：待确认 / 检修 / 防水 / 厂家协同"
};

export const planCanvasModeLabels: Record<PlanCanvasMode, string> = {
  ...drawingSheetTypeLabels,
  structureSyncCheck: "结构联动检查",
  presentationView: "展示视图"
};

export const planCanvasModeDescriptions: Record<PlanCanvasMode, string> = {
  ...drawingSheetTypeDescriptions,
  structureSyncCheck: "用颜色标出四层、双层、地下室和独立墙体的联动范围，属于检查/调试层。",
  presentationView: "用于 2D/3D 展示、语义对象和效果沟通，不进入正式施工图纸目录。"
};

export const planCanvasModeFootnotes: Record<PlanCanvasMode, string> = {
  ...drawingSheetTypeFootnotes,
  structureSyncCheck: "检查：蓝=四层，绿=1F/2F，橙=B1/B2，灰=独立，紫=楼梯四层",
  presentationView: "展示：家具 / 语义 / 白模"
};

const officialDrawingSheetTypeSet = new Set<string>(officialDrawingSheetTypes);

export function isDrawingSheetType(value: unknown): value is DrawingSheetType {
  return typeof value === "string" && officialDrawingSheetTypeSet.has(value);
}

export function normalizeDrawingSheetType(value: unknown): DrawingSheetType | null {
  const normalized = typeof value === "string"
    ? legacyPlanSheetModeAliases[value as LegacyPlanSheetMode] ?? value
    : value;
  return isDrawingSheetType(normalized) ? normalized : null;
}

export function normalizePlanCanvasMode(value: unknown): PlanCanvasMode {
  if (value === "structureSyncCheck" || value === "sync") return "structureSyncCheck";
  if (value === "presentationView" || value === "preview") return "presentationView";
  return normalizeDrawingSheetType(value) ?? "sitePlan";
}
