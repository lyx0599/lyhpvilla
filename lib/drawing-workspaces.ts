import type {
  DrawTool,
  DrawingItemCategory,
  DrawingSheetType,
  FloorPlanVisualSettings,
  PlanCanvasMode
} from "@/types/space";

export type DesignWorkspaceId = "overview" | "space" | "renovation" | "furniture" | "mep" | "finishes";
export type WorkspaceTabId = "socket" | "switch" | "lighting" | "water" | "drainage" | "ceiling" | "floor" | "wall" | "material";

export type DrawingWorkspaceTool = {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  drawTool?: DrawTool;
  drawingPreset?: { category: DrawingItemCategory; type: string; label: string };
  action?: "resources" | "validation" | "ai" | "measure" | "rotate" | "more" | "stair-view";
};

export type WorkspaceViewDefinition = {
  id: string;
  name: string;
  description: string;
  objectScope: string[];
  formalDrawing: false;
};

export type WorkspaceTabConfig = {
  id: WorkspaceTabId;
  name: string;
  mode: PlanCanvasMode;
  persistedSheet: DrawingSheetType;
  tools: DrawingWorkspaceTool[];
  visibleLayers: Partial<FloorPlanVisualSettings["layerVisibility"]>;
  resourceGroups: string[];
  propertySections: string[];
  validators: string[];
  instruction: string;
};

export type DrawingWorkspaceConfig = {
  id: DesignWorkspaceId;
  name: string;
  shortName: string;
  description: string;
  category: DesignWorkspaceId;
  mode: PlanCanvasMode;
  persistedSheet: DrawingSheetType;
  tools: DrawingWorkspaceTool[];
  visibleLayers: Partial<FloorPlanVisualSettings["layerVisibility"]>;
  resourceGroups: string[];
  propertySections: string[];
  validators: string[];
  instruction: string;
  tabs?: WorkspaceTabConfig[];
  activeTabId?: WorkspaceTabId;
  activeTabName?: string;
  views: WorkspaceViewDefinition[];
  legacyEntries: string[];
};

export type LegacyDrawingEntryAudit = {
  group: string;
  entries: string[];
  actualContent: string;
  disposition: string;
};

const selectTool: DrawingWorkspaceTool = { id: "select", label: "选择", icon: "↖", shortcut: "V", drawTool: "select" };
const measureTool: DrawingWorkspaceTool = { id: "measure", label: "测量", icon: "⌁", shortcut: "M", action: "measure" };
const moreTool: DrawingWorkspaceTool = { id: "more", label: "更多", icon: "•••", action: "more" };
const resourceTool: DrawingWorkspaceTool = { id: "resources", label: "资源", icon: "▤", action: "resources" };
const tool = (id: string, label: string, icon: string, category: DrawingItemCategory, type: string, shortcut?: string): DrawingWorkspaceTool => ({ id, label, icon, shortcut, drawingPreset: { category, type, label } });

const structureLayers = { baseFloorPlan: true, cleanupPatch: true, semanticOverlay: false, furnitureOverlay: false, debug: false };
const furnitureLayers = { baseFloorPlan: true, cleanupPatch: true, semanticOverlay: false, furnitureOverlay: true, debug: false };
const professionalLayers = { baseFloorPlan: true, cleanupPatch: true, semanticOverlay: false, furnitureOverlay: true, debug: false };
const overviewLayers = { baseFloorPlan: true, cleanupPatch: true, semanticOverlay: false, furnitureOverlay: true, debug: false };

const mepTabs: WorkspaceTabConfig[] = [
  { id: "socket", name: "插座", mode: "socketPlan", persistedSheet: "socketPlan", visibleLayers: professionalLayers, tools: [selectTool, tool("socket", "普通插座", "◉", "socket", "socket", "S"), tool("five-hole", "五孔插座", "◍", "socket", "fiveHole"), tool("waterproof", "防水插座", "◒", "socket", "waterproof"), tool("network", "网络接口", "N", "network", "network"), moreTool], resourceGroups: ["强电插座", "弱电接口", "设备电源"], propertySections: ["点位类型", "安装高度", "所属墙体", "回路", "设备关联"], validators: ["安装高度", "回路信息", "设备需求", "防水要求"], instruction: "插座：创建并定位电源与弱电点位，家具仅作为弱化参照。" },
  { id: "switch", name: "开关", mode: "switchPlan", persistedSheet: "switchPlan", visibleLayers: professionalLayers, tools: [selectTool, tool("single", "单开", "1", "switch", "single"), tool("double", "双开", "2", "switch", "double"), tool("two-way", "双控", "⇄", "switch", "twoWay"), tool("scene", "场景开关", "✦", "switch", "scene"), tool("control", "控制连线", "⌁", "annotation", "switchControl"), moreTool], resourceGroups: ["机械开关", "智能开关", "场景面板"], propertySections: ["开关类型", "安装高度", "控制灯组", "双控关系"], validators: ["控制对象", "双控同步", "安装位置"], instruction: "开关：放置开关并建立真实控制关系。" },
  { id: "lighting", name: "灯光", mode: "lightingPlan", persistedSheet: "lightingPlan", visibleLayers: professionalLayers, tools: [selectTool, tool("downlight", "筒灯", "●", "light", "downlight"), tool("spotlight", "射灯", "◉", "light", "spotlight"), tool("pendant", "吊灯", "◆", "light", "pendant"), tool("strip", "灯带", "━", "light", "strip"), tool("control", "控制关系", "⌁", "annotation", "lightControl"), moreTool], resourceGroups: ["基础照明", "重点照明", "灯带", "装饰灯"], propertySections: ["灯具类型", "色温", "功率", "光束角", "所属灯组"], validators: ["灯具参数", "控制关系", "空间覆盖"], instruction: "灯光：布置灯具、灯组和控制关系，可切换日夜检查效果。" },
  { id: "water", name: "给水", mode: "waterSupplyPlan", persistedSheet: "waterSupplyPlan", visibleLayers: professionalLayers, tools: [selectTool, tool("cold", "冷水", "C", "waterSupply", "cold"), tool("hot", "热水", "H", "waterSupply", "hot"), tool("purified", "净水", "P", "waterSupply", "purified"), tool("fixture", "设备给水", "●", "waterSupply", "fixture"), moreTool], resourceGroups: ["冷水", "热水", "净水", "设备给水"], propertySections: ["给水类型", "安装高度", "设备关联", "管径"], validators: ["设备需求", "冷热水完整性", "安装高度"], instruction: "给水：创建冷、热、净水和设备给水点。" },
  { id: "drainage", name: "排水", mode: "drainagePlan", persistedSheet: "drainagePlan", visibleLayers: professionalLayers, tools: [selectTool, tool("drain", "排水点", "◉", "drainage", "drain"), tool("floor-drain", "地漏", "⊙", "drainage", "floorDrain"), tool("toilet", "马桶排水", "○", "drainage", "toilet"), tool("condensate", "冷凝水", "C", "drainage", "condensate"), moreTool], resourceGroups: ["排水点", "地漏", "设备排水", "冷凝水"], propertySections: ["排水类型", "管径", "坡度", "设备关联"], validators: ["排水类型", "设备需求", "地漏覆盖"], instruction: "排水：布置排水、地漏与冷凝水点位。" }
];

const finishTabs: WorkspaceTabConfig[] = [
  { id: "ceiling", name: "吊顶", mode: "ceilingPlan", persistedSheet: "ceilingPlan", visibleLayers: professionalLayers, tools: [selectTool, tool("ceiling", "吊顶区域", "▱", "ceiling", "ceiling"), tool("level", "标高", "⌃", "annotation", "ceilingLevel"), tool("joint", "收口", "┄", "annotation", "ceilingJoint"), moreTool], resourceGroups: ["吊顶类型", "灯槽", "检修口"], propertySections: ["吊顶类型", "完成面标高", "材料", "检修条件"], validators: ["标高", "检修口", "灯具与风口冲突"], instruction: "吊顶：绘制顶面区域、标高、灯槽与检修口。" },
  { id: "floor", name: "地面", mode: "floorFinishPlan", persistedSheet: "floorFinishPlan", visibleLayers: professionalLayers, tools: [selectTool, tool("floor", "地面区域", "▦", "floorFinish", "floor"), tool("direction", "铺装方向", "→", "annotation", "layDirection"), tool("start", "起铺点", "×", "annotation", "startPoint"), moreTool], resourceGroups: ["木地板", "石材", "瓷砖", "室外铺装"], propertySections: ["材料", "铺装方向", "起铺点", "标高", "收口"], validators: ["材料编号", "区域覆盖", "收口关系"], instruction: "地面：定义铺装区域、方向、起铺点和收口。" },
  { id: "wall", name: "墙面", mode: "wallFinishPlan", persistedSheet: "wallFinishPlan", visibleLayers: professionalLayers, tools: [selectTool, tool("wall-finish", "墙面区域", "▤", "wallFinish", "wall"), tool("material", "材料编号", "M", "annotation", "materialCode"), tool("joint", "收口", "┄", "annotation", "wallJoint"), moreTool], resourceGroups: ["乳胶漆", "木饰面", "石材", "瓷砖"], propertySections: ["材料", "墙面范围", "分缝", "收口"], validators: ["材料编号", "墙体关联", "分缝与收口"], instruction: "墙面：为墙面分配材料、编号和收口。" },
  { id: "material", name: "材料", mode: "materialPlan", persistedSheet: "materialPlan", visibleLayers: professionalLayers, tools: [selectTool, resourceTool, tool("material-code", "材料编号", "M", "annotation", "materialCode"), moreTool], resourceGroups: ["材料库", "样板", "供应商信息"], propertySections: ["材料编号", "名称", "规格", "品牌", "使用位置"], validators: ["材料编号", "使用位置", "规格信息"], instruction: "材料：维护材料与对象的关联；材料索引作为清单输出，不作为独立施工平面。" }
];

export const drawingWorkspaces: DrawingWorkspaceConfig[] = [
  { id: "overview", category: "overview", name: "总平面", shortName: "总平面", description: "独立汇总项目最新结构、家具设备、饰面、吊顶和可见灯具，支持干净的 2D 与 3D 总览。", mode: "sitePlan", persistedSheet: "sitePlan", visibleLayers: overviewLayers, tools: [selectTool, measureTool, moreTool], resourceGroups: ["项目总览", "结构", "家具设备", "饰面与灯具"], propertySections: ["项目状态", "对象属性", "显示设置"], validators: ["统一模型", "跨视图一致性", "层高与天花"], instruction: "总平面：查看统一项目状态中的最新完整方案；默认隐藏专业标签、编号、控制线和施工辅助信息。", views: [{ id: "overview-current-floor", name: "当前楼层", description: "使用当前楼层的完整最新模型。", objectScope: ["structure", "furniture", "finishes", "visibleEquipment"], formalDrawing: false }, { id: "overview-whole-building", name: "整栋总览", description: "汇总所有楼层的统一场景对象。", objectScope: ["allFloors", "courtyard"], formalDrawing: false }], legacyEntries: ["总平面图", "院子总图"] },
  { id: "space", category: "space", name: "空间布局", shortName: "空间布局", description: "编辑墙体、门窗、房间、楼梯、楼板洞口、梁柱和院子边界。", mode: "structurePlan", persistedSheet: "structurePlan", visibleLayers: structureLayers, tools: [selectTool, { id: "wall", label: "墙体", icon: "╱", shortcut: "W", drawTool: "wall-straight" }, { id: "door", label: "门", icon: "◔", shortcut: "D", drawTool: "door" }, { id: "window", label: "窗", icon: "▭", drawTool: "window" }, { id: "stair", label: "楼梯", icon: "≋", shortcut: "S", drawTool: "stair" }, { id: "stair-view", label: "楼梯视图", icon: "↗", action: "stair-view" }, { id: "column", label: "梁柱", icon: "■", drawTool: "column" }, measureTool, moreTool], resourceGroups: ["门窗", "楼梯", "结构构件", "院子边界"], propertySections: ["基础信息", "几何尺寸", "连接关系", "材料", "施工备注"], validators: ["墙体闭合", "门窗承载", "房间生成", "楼梯连续性", "洞口关系"], instruction: "空间布局：编辑空间骨架；选中楼梯后可进入楼梯编辑或隔离视图。", views: [{ id: "walls", name: "只看墙体", description: "隔离墙体、门窗和结构构件。", objectScope: ["walls", "doors", "windows", "columns"], formalDrawing: false }, { id: "stairs", name: "楼梯视图", description: "隔离楼梯、平台、楼板洞口和栏杆。", objectScope: ["stairs", "stairLandings", "stairOpenings"], formalDrawing: false }, { id: "section", name: "剖切视图", description: "检查上下楼层和净高关系。", objectScope: ["structure", "stairs"], formalDrawing: false }], legacyEntries: ["原始结构图", "户型结构图", "墙体图", "门窗图", "楼梯图", "结构构件图", "平面尺寸图", "墙体定位图", "门窗定位图", "围栏图", "院门图", "道路图", "平台图"] },
  { id: "renovation", category: "renovation", name: "拆改", shortName: "拆改", description: "统一处理保留、拆除、新建与洞口调整。", mode: "demolitionAndBuildPlan", persistedSheet: "demolitionAndBuildPlan", visibleLayers: structureLayers, tools: [selectTool, { id: "remove", label: "标记拆除", icon: "−", drawTool: "select" }, { id: "new-wall", label: "新建墙", icon: "+", drawTool: "wall-straight" }, { id: "close-opening", label: "封堵门洞", icon: "▰", drawTool: "wall-straight" }, { id: "new-door", label: "新建门洞", icon: "◔", drawTool: "door" }, { id: "new-window", label: "调整门窗", icon: "▭", drawTool: "window" }, tool("annotation", "拆改标注", "A", "annotation", "renovation"), measureTool, moreTool], resourceGroups: ["拆除状态", "新建状态", "拆改图例"], propertySections: ["改造状态", "结构属性", "尺寸", "施工说明"], validators: ["承重保护", "新旧墙交接", "门窗承载", "拆改图例"], instruction: "拆改：在同一工作区表达原始、拆除和新建状态。", views: [{ id: "original", name: "原始结构", description: "只显示改造前结构。", objectScope: ["existingStructure"], formalDrawing: false }, { id: "demolition", name: "拆除隔离", description: "突出拟拆对象。", objectScope: ["demolishedObjects"], formalDrawing: false }, { id: "new-build", name: "新建隔离", description: "突出新建对象。", objectScope: ["newObjects"], formalDrawing: false }], legacyEntries: ["拆除图", "新建图", "墙体拆改图", "门窗拆改图", "结构改造图"] },
  { id: "furniture", category: "furniture", name: "家具与设备", shortName: "家具与设备", description: "布置家具、固定柜体、厨房卫浴设备、家电与收纳。", mode: "furniturePlan", persistedSheet: "furniturePlan", visibleLayers: furnitureLayers, tools: [selectTool, resourceTool, { id: "cabinet", label: "柜体", icon: "▥", action: "resources" }, { id: "appliance", label: "家电", icon: "▧", action: "resources" }, { id: "rotate", label: "旋转", icon: "↻", shortcut: "R", action: "rotate" }, tool("position", "定位标注", "↔", "annotation", "furniturePosition"), measureTool, moreTool], resourceGroups: ["家具", "柜体", "厨房", "卫浴", "家电"], propertySections: ["基础信息", "尺寸位置", "材质与款式", "机电需求", "施工备注"], validators: ["通行动线", "家具碰撞", "机电需求", "尺寸复核"], instruction: "家具与设备：从资源面板布置对象，拖动定位，R 旋转。", views: [{ id: "furniture-only", name: "只看家具", description: "隐藏机电和调试信息。", objectScope: ["furniture"], formalDrawing: false }, { id: "cabinet-only", name: "柜体隔离", description: "只看固定柜体和收纳。", objectScope: ["cabinet"], formalDrawing: false }, { id: "walkthrough", name: "3D 漫游", description: "以真实材质检查空间体验。", objectScope: ["furniture", "structure"], formalDrawing: false }], legacyEntries: ["家具布置图", "柜体布置图", "设备布置图", "房间功能图", "动线图", "家具定位图", "设备定位图"] },
  { id: "mep", category: "mep", name: "水电与照明", shortName: "水电与照明", description: "通过二级 Tab 编辑插座、开关、灯光、给水和排水。", mode: mepTabs[0].mode, persistedSheet: mepTabs[0].persistedSheet, visibleLayers: mepTabs[0].visibleLayers, tools: mepTabs[0].tools, resourceGroups: mepTabs[0].resourceGroups, propertySections: mepTabs[0].propertySections, validators: mepTabs[0].validators, instruction: mepTabs[0].instruction, tabs: mepTabs, views: [{ id: "mep-isolate", name: "机电隔离", description: "只显示当前专业点位和必要参照。", objectScope: ["drawingItems"], formalDrawing: false }, { id: "lighting-preview", name: "场景灯光预览", description: "进入灯光子工作区，在 3D 中切换日夜和灯组效果；不属于施工图编辑工具。", objectScope: ["lights", "switches"], formalDrawing: false }], legacyEntries: ["插座点位图", "强电图", "弱电图", "网络点位图", "电视点位图", "开关控制图", "灯光点位图", "照明回路图", "给水点位图", "冷水图", "热水图", "净水图", "软水图", "排水点位图", "地漏图", "冷凝水排水图", "空调图", "新风图", "地暖图", "除湿图", "热水设备图", "智能家居设备图", "其他机电设备图", "户外给排水图", "户外照明图", "户外设备图"] },
  { id: "finishes", category: "finishes", name: "顶面与饰面", shortName: "顶面与饰面", description: "通过二级 Tab 编辑吊顶、地面、墙面并维护材料关联。", mode: finishTabs[0].mode, persistedSheet: finishTabs[0].persistedSheet, visibleLayers: finishTabs[0].visibleLayers, tools: finishTabs[0].tools, resourceGroups: finishTabs[0].resourceGroups, propertySections: finishTabs[0].propertySections, validators: finishTabs[0].validators, instruction: finishTabs[0].instruction, tabs: finishTabs, views: [{ id: "ceiling-only", name: "顶面视图", description: "只看吊顶、灯槽与顶面设备。", objectScope: ["ceiling"], formalDrawing: false }, { id: "finish-isolate", name: "饰面隔离", description: "按材料或区域隔离饰面。", objectScope: ["floorFinish", "wallFinish"], formalDrawing: false }], legacyEntries: ["地面铺装图", "墙面饰面图", "天花图", "吊顶图", "材料索引图", "收口节点图", "硬地铺装图", "绿化图"] }
];

export const legacyDrawingEntryAudit: LegacyDrawingEntryAudit[] = drawingWorkspaces.map((workspace) => ({
  group: workspace.name,
  entries: workspace.legacyEntries,
  actualContent: workspace.id === "mep" || workspace.id === "finishes" ? "同一模型的专业点位、图层与工具变体" : "同一对象模型的编辑与隔离视图",
  disposition: workspace.id === "space" ? "合并；楼梯改称楼梯编辑/楼梯视图" : workspace.id === "mep" || workspace.id === "finishes" ? "合并为工作区内二级 Tab" : "合并为单一工作区"
}));

const modeWorkspaceMap: Partial<Record<PlanCanvasMode, DesignWorkspaceId>> = {
  sitePlan: "overview", structurePlan: "space", demolitionAndBuildPlan: "renovation", furniturePlan: "furniture",
  socketPlan: "mep", switchPlan: "mep", lightingPlan: "mep", waterSupplyPlan: "mep", drainagePlan: "mep",
  ceilingPlan: "finishes", floorFinishPlan: "finishes", wallFinishPlan: "finishes", materialPlan: "finishes", annotationPlan: "space"
};

const modeTabMap: Partial<Record<PlanCanvasMode, WorkspaceTabId>> = {
  socketPlan: "socket", switchPlan: "switch", lightingPlan: "lighting", waterSupplyPlan: "water", drainagePlan: "drainage",
  ceilingPlan: "ceiling", floorFinishPlan: "floor", wallFinishPlan: "wall", materialPlan: "material"
};

export function getDrawingWorkspace(id: string | null | undefined) {
  return drawingWorkspaces.find((item) => item.id === id) ?? drawingWorkspaces[0];
}

export function resolveDrawingWorkspace(id: string | null | undefined, tabId?: string | null): DrawingWorkspaceConfig {
  const workspace = getDrawingWorkspace(id);
  const tab = workspace.tabs?.find((item) => item.id === tabId) ?? workspace.tabs?.[0];
  return tab ? { ...workspace, ...tab, id: workspace.id, name: workspace.name, shortName: workspace.shortName, description: workspace.description, category: workspace.category, tabs: workspace.tabs, views: workspace.views, legacyEntries: workspace.legacyEntries, activeTabId: tab.id, activeTabName: tab.name } : workspace;
}

export function getDefaultDrawingWorkspace(mode: PlanCanvasMode) {
  return getDrawingWorkspace(modeWorkspaceMap[mode]);
}

export function getDefaultWorkspaceTab(mode: PlanCanvasMode) {
  return modeTabMap[mode] ?? null;
}

export function getAdjacentDrawingWorkspace(id: string, direction: -1 | 1) {
  const index = Math.max(0, drawingWorkspaces.findIndex((item) => item.id === id));
  return drawingWorkspaces[(index + direction + drawingWorkspaces.length) % drawingWorkspaces.length];
}
