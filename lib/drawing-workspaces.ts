import type {
  DrawTool,
  DrawingItemCategory,
  DrawingSheetType,
  FloorPlanVisualSettings,
  PlanCanvasMode
} from "@/types/space";

export type DrawingWorkspaceCategoryId =
  | "structure"
  | "renovation"
  | "furniture"
  | "dimension"
  | "electrical"
  | "plumbing"
  | "hvac"
  | "finishes"
  | "outdoor"
  | "delivery";

export type DrawingWorkspaceTool = {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  drawTool?: DrawTool;
  drawingPreset?: {
    category: DrawingItemCategory;
    type: string;
    label: string;
  };
  action?: "resources" | "validation" | "ai" | "measure" | "rotate" | "more";
};

export type DrawingWorkspaceConfig = {
  id: string;
  name: string;
  shortName: string;
  category: DrawingWorkspaceCategoryId;
  mode: PlanCanvasMode;
  persistedSheet: DrawingSheetType;
  tools: DrawingWorkspaceTool[];
  visibleLayers: Partial<FloorPlanVisualSettings["layerVisibility"]>;
  resourceGroups: string[];
  propertySections: string[];
  validators: string[];
  instruction: string;
  keywords?: string[];
  developerOnly?: boolean;
};

export const drawingWorkspaceCategories: Array<{
  id: DrawingWorkspaceCategoryId;
  name: string;
  index: string;
}> = [
  { id: "structure", name: "户型与结构", index: "01" },
  { id: "renovation", name: "拆改", index: "02" },
  { id: "furniture", name: "家具与空间", index: "03" },
  { id: "dimension", name: "尺寸与定位", index: "04" },
  { id: "electrical", name: "电气", index: "05" },
  { id: "plumbing", name: "给排水", index: "06" },
  { id: "hvac", name: "暖通与设备", index: "07" },
  { id: "finishes", name: "饰面", index: "08" },
  { id: "outdoor", name: "院子与室外", index: "09" },
  { id: "delivery", name: "检查与交付", index: "10" }
];

const selectTool: DrawingWorkspaceTool = { id: "select", label: "选择", icon: "↖", shortcut: "V", drawTool: "select" };
const measureTool: DrawingWorkspaceTool = { id: "measure", label: "测量", icon: "⌁", shortcut: "M", action: "measure" };
const moreTool: DrawingWorkspaceTool = { id: "more", label: "更多", icon: "•••", action: "more" };

const structureLayers: DrawingWorkspaceConfig["visibleLayers"] = {
  baseFloorPlan: true,
  cleanupPatch: true,
  semanticOverlay: false,
  furnitureOverlay: false,
  debug: false
};

const furnitureLayers: DrawingWorkspaceConfig["visibleLayers"] = {
  baseFloorPlan: true,
  cleanupPatch: true,
  semanticOverlay: false,
  furnitureOverlay: true,
  debug: false
};

const professionalLayers: DrawingWorkspaceConfig["visibleLayers"] = {
  baseFloorPlan: true,
  cleanupPatch: true,
  semanticOverlay: false,
  furnitureOverlay: true,
  debug: false
};

const tool = (
  id: string,
  label: string,
  icon: string,
  category: DrawingItemCategory,
  type: string,
  shortcut?: string
): DrawingWorkspaceTool => ({
  id,
  label,
  icon,
  shortcut,
  drawingPreset: { category, type, label }
});

const workspace = (
  config: Omit<DrawingWorkspaceConfig, "visibleLayers" | "resourceGroups" | "propertySections" | "validators"> &
    Partial<Pick<DrawingWorkspaceConfig, "visibleLayers" | "resourceGroups" | "propertySections" | "validators">>
): DrawingWorkspaceConfig => ({
  visibleLayers: professionalLayers,
  resourceGroups: [],
  propertySections: ["基础信息", "位置与尺寸", "关联关系", "施工备注"],
  validators: ["对象完整性", "图层冲突", "关联关系"],
  ...config
});

export const drawingWorkspaces: DrawingWorkspaceConfig[] = [
  workspace({
    id: "site-plan", name: "总平面图", shortName: "总平面", category: "structure", mode: "sitePlan", persistedSheet: "sitePlan",
    visibleLayers: furnitureLayers,
    tools: [selectTool, { id: "boundary", label: "边界", icon: "◇", drawTool: "outdoor" }, { id: "building", label: "建筑", icon: "▣", drawTool: "wall-straight" }, measureTool, moreTool],
    propertySections: ["对象信息", "定位", "面积与边界", "施工备注"],
    validators: ["建筑边界", "场地范围", "楼层联动"],
    instruction: "选择或检查建筑、庭院与道路关系；按 V 返回选择。",
    keywords: ["总图", "场地", "建筑"]
  }),
  workspace({
    id: "original-structure", name: "原始结构图", shortName: "原始结构", category: "structure", mode: "structurePlan", persistedSheet: "structurePlan",
    visibleLayers: structureLayers,
    tools: [selectTool, { id: "wall", label: "墙体", icon: "▰", shortcut: "W", drawTool: "wall-straight" }, { id: "column", label: "立柱", icon: "■", drawTool: "column" }, { id: "stair", label: "楼梯", icon: "≋", drawTool: "stair" }, measureTool, moreTool],
    resourceGroups: ["结构构件"],
    propertySections: ["结构信息", "尺寸", "材料", "承重属性", "施工备注"],
    validators: ["墙体闭合", "结构尺寸", "承重信息", "楼梯连续性"],
    instruction: "原始结构：选择构件查看尺寸；墙体编辑会写入统一结构模型。"
  }),
  workspace({
    id: "layout-structure", name: "户型结构图", shortName: "户型结构", category: "structure", mode: "structurePlan", persistedSheet: "structurePlan",
    visibleLayers: structureLayers,
    tools: [selectTool, { id: "wall", label: "直墙", icon: "╱", shortcut: "W", drawTool: "wall-straight" }, { id: "arc-wall", label: "弧墙", icon: "◜", drawTool: "wall-arc" }, { id: "partition", label: "隔断", icon: "┊", drawTool: "partition" }, { id: "door", label: "门", icon: "◔", shortcut: "D", drawTool: "door" }, { id: "window", label: "窗", icon: "▭", shortcut: "N", drawTool: "window" }, { id: "stair", label: "楼梯", icon: "≋", drawTool: "stair" }, measureTool, moreTool],
    resourceGroups: ["门窗", "结构构件"],
    propertySections: ["基础信息", "几何尺寸", "墙体类型", "材料", "所属房间", "施工备注"],
    validators: ["墙体闭合", "门窗承载", "房间生成", "楼梯连续性"],
    instruction: "直墙工具：点击起点，再点击终点；双击结束连续绘制，Esc 取消。"
  }),
  workspace({
    id: "wall-plan", name: "墙体图", shortName: "墙体", category: "structure", mode: "structurePlan", persistedSheet: "structurePlan",
    visibleLayers: structureLayers,
    tools: [selectTool, { id: "wall", label: "直墙", icon: "╱", shortcut: "W", drawTool: "wall-straight" }, { id: "arc-wall", label: "弧墙", icon: "◜", drawTool: "wall-arc" }, { id: "partition", label: "隔断", icon: "┊", drawTool: "partition" }, { id: "column", label: "立柱", icon: "■", drawTool: "column" }, measureTool, moreTool],
    instruction: "墙体图只突出墙体、隔断和结构柱；选择对象后在属性中编辑。"
  }),
  workspace({
    id: "opening-plan", name: "门窗图", shortName: "门窗", category: "structure", mode: "structurePlan", persistedSheet: "structurePlan",
    visibleLayers: structureLayers,
    tools: [selectTool, { id: "door", label: "门", icon: "◔", shortcut: "D", drawTool: "door" }, { id: "window", label: "窗", icon: "▭", drawTool: "window" }, { id: "bay-window", label: "飘窗", icon: "▱", drawTool: "bay-window" }, { id: "skylight", label: "天窗", icon: "▢", drawTool: "skylight" }, measureTool, moreTool],
    resourceGroups: ["门", "窗", "五金"],
    validators: ["承载墙体", "洞口尺寸", "开启冲突"],
    instruction: "门窗图：选择类型后在承载墙体上放置；点击对象检查开启方向。"
  }),
  workspace({
    id: "stair-plan", name: "楼梯图", shortName: "楼梯", category: "structure", mode: "structurePlan", persistedSheet: "structurePlan",
    visibleLayers: structureLayers,
    tools: [selectTool, { id: "stair", label: "楼梯", icon: "≋", shortcut: "S", drawTool: "stair" }, measureTool, moreTool],
    resourceGroups: ["直跑楼梯", "转角楼梯", "平台"],
    validators: ["楼层连续性", "洞口关系", "踏步尺寸"],
    instruction: "楼梯图：绘制梯段并在属性中进入楼梯深化设计。"
  }),
  workspace({
    id: "structural-components", name: "结构构件图", shortName: "结构构件", category: "structure", mode: "structurePlan", persistedSheet: "structurePlan",
    visibleLayers: structureLayers,
    tools: [selectTool, { id: "column", label: "立柱", icon: "■", drawTool: "column" }, { id: "wall", label: "墙体", icon: "▰", drawTool: "wall-straight" }, measureTool, moreTool],
    resourceGroups: ["结构柱", "梁", "洞口"],
    instruction: "结构构件图：检查柱、墙和洞口关系，选中后显示结构属性。"
  }),

  workspace({
    id: "demolition", name: "拆除图", shortName: "拆除", category: "renovation", mode: "demolitionAndBuildPlan", persistedSheet: "demolitionAndBuildPlan",
    visibleLayers: structureLayers,
    tools: [selectTool, { id: "remove", label: "标拆除", icon: "−", drawTool: "select" }, { id: "remove-door", label: "拆门窗", icon: "⊘", drawTool: "select" }, { id: "annotation", label: "拆改标注", icon: "A", action: "more" }, measureTool],
    validators: ["承重保护", "拆除范围", "关联门窗"],
    instruction: "拆除图：选择现有对象并标记拆除；承重构件会保持保护。"
  }),
  workspace({
    id: "new-build", name: "新建图", shortName: "新建", category: "renovation", mode: "demolitionAndBuildPlan", persistedSheet: "demolitionAndBuildPlan",
    visibleLayers: structureLayers,
    tools: [selectTool, { id: "new-wall", label: "新建墙", icon: "+", drawTool: "wall-straight" }, { id: "close-opening", label: "封门洞", icon: "▰", drawTool: "wall-straight" }, { id: "new-opening", label: "新门洞", icon: "◔", drawTool: "door" }, { id: "new-window", label: "新门窗", icon: "▭", drawTool: "window" }, measureTool, moreTool],
    validators: ["新旧墙交接", "门窗承载", "结构保护"],
    instruction: "新建图：新对象写入同一结构模型，并在拆改表达中区分显示。"
  }),
  workspace({
    id: "wall-renovation", name: "墙体拆改图", shortName: "墙体拆改", category: "renovation", mode: "demolitionAndBuildPlan", persistedSheet: "demolitionAndBuildPlan",
    visibleLayers: structureLayers,
    tools: [selectTool, { id: "remove", label: "标拆除", icon: "−", drawTool: "select" }, { id: "new-wall", label: "新建墙", icon: "+", drawTool: "wall-straight" }, { id: "partition", label: "隔断", icon: "┊", drawTool: "partition" }, measureTool, moreTool],
    instruction: "墙体拆改图：拆除与新建采用克制的状态区分，结构数据保持统一。"
  }),
  workspace({
    id: "opening-renovation", name: "门窗拆改图", shortName: "门窗拆改", category: "renovation", mode: "demolitionAndBuildPlan", persistedSheet: "demolitionAndBuildPlan",
    visibleLayers: structureLayers,
    tools: [selectTool, { id: "remove-opening", label: "拆门窗", icon: "⊘", drawTool: "select" }, { id: "new-door", label: "新建门", icon: "◔", drawTool: "door" }, { id: "new-window", label: "新建窗", icon: "▭", drawTool: "window" }, measureTool, moreTool],
    instruction: "门窗拆改图：先选择现有洞口或在墙体上创建新门窗。"
  }),
  workspace({
    id: "structural-renovation", name: "结构改造图", shortName: "结构改造", category: "renovation", mode: "demolitionAndBuildPlan", persistedSheet: "demolitionAndBuildPlan",
    visibleLayers: structureLayers,
    tools: [selectTool, { id: "wall", label: "墙体", icon: "▰", drawTool: "wall-straight" }, { id: "column", label: "立柱", icon: "■", drawTool: "column" }, measureTool, moreTool],
    validators: ["承重保护", "结构引用", "改造说明"],
    instruction: "结构改造图：所有结构调整需完成承重与关联检查。"
  }),

  workspace({
    id: "furniture-layout", name: "家具布置图", shortName: "家具布置", category: "furniture", mode: "furniturePlan", persistedSheet: "furniturePlan",
    visibleLayers: furnitureLayers,
    tools: [selectTool, { id: "furniture-library", label: "家具库", icon: "▤", action: "resources" }, { id: "cabinet-library", label: "柜体", icon: "▥", action: "resources" }, { id: "appliance-library", label: "家电", icon: "▧", action: "resources" }, { id: "rotate", label: "旋转", icon: "↻", shortcut: "R", action: "rotate" }, measureTool, moreTool],
    resourceGroups: ["家具", "柜体", "家电", "卫浴设备"],
    propertySections: ["基础信息", "尺寸位置", "材质与款式", "机电需求", "施工备注"],
    validators: ["通行动线", "家具碰撞", "机电需求", "尺寸复核"],
    instruction: "家具布置：从资源面板添加物品；拖动定位，R 旋转，Delete 删除。"
  }),
  workspace({
    id: "cabinet-layout", name: "柜体布置图", shortName: "柜体布置", category: "furniture", mode: "materialPlan", persistedSheet: "materialPlan",
    visibleLayers: furnitureLayers,
    tools: [selectTool, { id: "cabinet-library", label: "柜体库", icon: "▥", action: "resources" }, tool("cabinet", "柜体点位", "▥", "cabinet", "cabinet"), { id: "rotate", label: "旋转", icon: "↻", action: "rotate" }, measureTool, moreTool],
    resourceGroups: ["橱柜", "衣柜", "浴室柜", "收纳柜"],
    instruction: "柜体布置：从资源库添加柜体，或创建柜体施工点位。"
  }),
  workspace({
    id: "equipment-layout", name: "设备布置图", shortName: "设备布置", category: "furniture", mode: "furniturePlan", persistedSheet: "furniturePlan",
    visibleLayers: furnitureLayers,
    tools: [selectTool, { id: "appliance-library", label: "设备库", icon: "▧", action: "resources" }, { id: "rotate", label: "旋转", icon: "↻", action: "rotate" }, measureTool, moreTool],
    resourceGroups: ["厨房设备", "卫浴设备", "机电设备"],
    instruction: "设备布置：按房间筛选资源，选中设备查看机电需求。"
  }),
  workspace({
    id: "room-function", name: "房间功能图", shortName: "房间功能", category: "furniture", mode: "furniturePlan", persistedSheet: "furniturePlan",
    visibleLayers: furnitureLayers,
    tools: [selectTool, { id: "room", label: "房间", icon: "▣", drawTool: "select" }, tool("annotation", "功能标注", "A", "annotation", "roomFunction"), measureTool],
    instruction: "房间功能图：选择房间编辑名称和用途，添加必要的功能标注。"
  }),
  workspace({
    id: "circulation", name: "动线图", shortName: "动线", category: "furniture", mode: "annotationPlan", persistedSheet: "annotationPlan",
    visibleLayers: furnitureLayers,
    tools: [selectTool, tool("circulation", "动线", "→", "annotation", "circulation"), tool("annotation", "标注", "A", "annotation", "annotation"), measureTool],
    validators: ["通道宽度", "门扇冲突", "家具碰撞"],
    instruction: "动线图：添加动线标注并检查主要通道与开启冲突。"
  }),

  workspace({
    id: "plan-dimensions", name: "平面尺寸图", shortName: "平面尺寸", category: "dimension", mode: "annotationPlan", persistedSheet: "annotationPlan",
    tools: [selectTool, tool("dimension", "尺寸", "↔", "annotation", "dimension"), tool("elevation", "标高", "⌃", "annotation", "elevation"), measureTool, moreTool],
    instruction: "平面尺寸图：添加尺寸与标高，检查待现场复核项。"
  }),
  workspace({ id: "wall-position", name: "墙体定位图", shortName: "墙体定位", category: "dimension", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [selectTool, tool("wall-dimension", "墙定位", "↔", "annotation", "wallPosition"), measureTool, moreTool], instruction: "墙体定位：以统一坐标和完成面为基准添加定位尺寸。" }),
  workspace({ id: "furniture-position", name: "家具定位图", shortName: "家具定位", category: "dimension", mode: "furniturePlan", persistedSheet: "furniturePlan", visibleLayers: furnitureLayers, tools: [selectTool, tool("furniture-dimension", "家具定位", "↔", "annotation", "furniturePosition"), { id: "rotate", label: "旋转", icon: "↻", action: "rotate" }, measureTool, moreTool], instruction: "家具定位：选择家具并补充距墙、中心线和安装尺寸。" }),
  workspace({ id: "opening-position", name: "门窗定位图", shortName: "门窗定位", category: "dimension", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [selectTool, tool("opening-dimension", "门窗定位", "↔", "annotation", "openingPosition"), measureTool, moreTool], instruction: "门窗定位：标注洞口宽度、边距、窗台与完成面高度。" }),
  workspace({ id: "equipment-position", name: "设备定位图", shortName: "设备定位", category: "dimension", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [selectTool, tool("equipment-dimension", "设备定位", "↔", "annotation", "equipmentPosition"), measureTool, moreTool], instruction: "设备定位：结合厂家尺寸和机电条件补充安装定位。" }),

  workspace({
    id: "socket-points", name: "插座点位图", shortName: "插座点位", category: "electrical", mode: "socketPlan", persistedSheet: "socketPlan",
    tools: [selectTool, tool("socket", "普通插座", "◉", "socket", "socket", "S"), tool("five-hole", "五孔插座", "◍", "socket", "fiveHole"), tool("waterproof", "防水插座", "◒", "socket", "waterproof"), tool("floor-socket", "地插", "⊙", "socket", "floorSocket"), tool("ac-socket", "空调插座", "A", "socket", "airConditioner"), tool("network", "网络接口", "N", "network", "network"), moreTool],
    resourceGroups: ["强电插座", "弱电接口", "专用设备电源"],
    propertySections: ["点位类型", "安装高度", "所属墙体", "所属房间", "回路", "设备关联", "施工备注"],
    validators: ["安装高度", "回路信息", "设备需求", "防水要求"],
    instruction: "插座点位：点击工具在当前图中心创建点位，再拖到准确位置。"
  }),
  workspace({ id: "strong-current", name: "强电图", shortName: "强电", category: "electrical", mode: "socketPlan", persistedSheet: "socketPlan", tools: [selectTool, tool("power", "电源", "◉", "socket", "power"), tool("circuit", "回路标注", "C", "annotation", "circuit"), moreTool], instruction: "强电图：检查电源点位、专用回路和安装高度。" }),
  workspace({ id: "low-current", name: "弱电图", shortName: "弱电", category: "electrical", mode: "socketPlan", persistedSheet: "socketPlan", tools: [selectTool, tool("network", "网络", "N", "network", "network"), tool("tv", "电视", "TV", "network", "television"), tool("usb", "USB", "U", "socket", "usb"), moreTool], instruction: "弱电图：布置网络、电视和智能设备接口。" }),
  workspace({ id: "network-points", name: "网络点位图", shortName: "网络点位", category: "electrical", mode: "socketPlan", persistedSheet: "socketPlan", tools: [selectTool, tool("network", "网络接口", "N", "network", "network"), tool("ap", "无线 AP", "AP", "network", "accessPoint"), moreTool], instruction: "网络点位：布置网络接口与无线覆盖设备。" }),
  workspace({ id: "tv-points", name: "电视点位图", shortName: "电视点位", category: "electrical", mode: "socketPlan", persistedSheet: "socketPlan", tools: [selectTool, tool("tv", "电视接口", "TV", "network", "television"), tool("power", "设备电源", "◉", "socket", "devicePower"), moreTool], instruction: "电视点位：组合电视信号、网络和设备电源。" }),
  workspace({
    id: "switch-control", name: "开关控制图", shortName: "开关控制", category: "electrical", mode: "switchPlan", persistedSheet: "switchPlan",
    tools: [selectTool, tool("single", "单开", "1", "switch", "single"), tool("double", "双开", "2", "switch", "double"), tool("triple", "三开", "3", "switch", "triple"), tool("two-way", "双控", "⇄", "switch", "twoWay"), tool("scene", "场景开关", "◇", "switch", "scene"), tool("smart", "智能开关", "✦", "switch", "smart"), moreTool],
    resourceGroups: ["机械开关", "智能开关", "控制关系"],
    validators: ["未控灯具", "控制组", "双控同步", "安装高度"],
    instruction: "开关控制：创建开关后，在属性中关联灯具和控制组。"
  }),
  workspace({
    id: "lighting-points", name: "灯光点位图", shortName: "灯光点位", category: "electrical", mode: "lightingPlan", persistedSheet: "lightingPlan",
    tools: [selectTool, tool("downlight", "筒灯", "●", "light", "recessedDownlight", "L"), tool("spotlight", "射灯", "◐", "light", "spotlight"), tool("pendant", "吊灯", "◉", "light", "pendant"), tool("ceiling", "吸顶灯", "⊙", "light", "ceiling"), tool("strip", "灯带", "━", "light", "strip"), tool("wall-light", "壁灯", "◒", "light", "wall"), tool("sensor", "感应灯", "✦", "light", "sensor"), moreTool],
    resourceGroups: ["基础照明", "重点照明", "装饰照明", "灯带"],
    propertySections: ["灯具类型", "位置与安装", "色温与功率", "光束角", "控制组", "所属房间", "施工备注"],
    validators: ["色温", "控制关系", "吊顶承载", "照度分层"],
    instruction: "灯光点位：创建灯具后拖动定位；选择灯具设置色温、功率和控制组。"
  }),
  workspace({ id: "lighting-circuits", name: "照明回路图", shortName: "照明回路", category: "electrical", mode: "lightingPlan", persistedSheet: "lightingPlan", tools: [selectTool, tool("light", "灯具", "●", "light", "recessedDownlight"), tool("circuit", "回路标注", "C", "annotation", "lightingCircuit"), moreTool], instruction: "照明回路：检查灯具分组、开关关系和调光需求。" }),

  workspace({
    id: "water-supply-points", name: "给水点位图", shortName: "给水点位", category: "plumbing", mode: "waterSupplyPlan", persistedSheet: "waterSupplyPlan",
    tools: [selectTool, tool("cold", "冷水", "C", "waterSupply", "coldWater"), tool("hot", "热水", "H", "waterSupply", "hotWater"), tool("pure", "净水", "P", "waterSupply", "purifiedWater"), tool("soft", "软水", "S", "waterSupply", "softWater"), tool("tap", "龙头", "◉", "waterSupply", "tap"), tool("equipment-water", "设备给水", "E", "waterSupply", "equipment"), moreTool],
    resourceGroups: ["给水点", "龙头", "设备接口"],
    validators: ["冷热水需求", "设备关联", "安装高度"],
    instruction: "给水点位：选择水路类型创建点位，再关联房间、墙体或设备。"
  }),
  workspace({ id: "cold-water", name: "冷水图", shortName: "冷水", category: "plumbing", mode: "waterSupplyPlan", persistedSheet: "waterSupplyPlan", tools: [selectTool, tool("cold", "冷水", "C", "waterSupply", "coldWater"), moreTool], instruction: "冷水图：集中检查冷水点位与设备需求。" }),
  workspace({ id: "hot-water", name: "热水图", shortName: "热水", category: "plumbing", mode: "waterSupplyPlan", persistedSheet: "waterSupplyPlan", tools: [selectTool, tool("hot", "热水", "H", "waterSupply", "hotWater"), moreTool], instruction: "热水图：检查热水点位、设备和等待时间相关位置。" }),
  workspace({ id: "purified-water", name: "净水图", shortName: "净水", category: "plumbing", mode: "waterSupplyPlan", persistedSheet: "waterSupplyPlan", tools: [selectTool, tool("pure", "净水", "P", "waterSupply", "purifiedWater"), moreTool], instruction: "净水图：布置净水设备、龙头和相关给水点。" }),
  workspace({ id: "soft-water", name: "软水图", shortName: "软水", category: "plumbing", mode: "waterSupplyPlan", persistedSheet: "waterSupplyPlan", tools: [selectTool, tool("soft", "软水", "S", "waterSupply", "softWater"), moreTool], instruction: "软水图：标记软水设备与覆盖范围。" }),
  workspace({
    id: "drainage-points", name: "排水点位图", shortName: "排水点位", category: "plumbing", mode: "drainagePlan", persistedSheet: "drainagePlan",
    tools: [selectTool, tool("drain", "排水点", "▼", "drainage", "drain"), tool("floor-drain", "地漏", "⊗", "drainage", "floorDrain"), tool("toilet", "马桶排水", "T", "drainage", "toilet"), tool("basin", "台盆排水", "B", "drainage", "basin"), tool("washer", "洗衣机", "W", "drainage", "washingMachine"), tool("condensate", "冷凝排水", "C", "drainage", "condensate"), moreTool],
    resourceGroups: ["排水点", "地漏", "设备排水"],
    validators: ["排水类型", "设备关联", "防水区域"],
    instruction: "排水点位：创建点位后设置类型、关联设备和施工备注。"
  }),
  workspace({ id: "floor-drain", name: "地漏图", shortName: "地漏", category: "plumbing", mode: "drainagePlan", persistedSheet: "drainagePlan", tools: [selectTool, tool("floor-drain", "地漏", "⊗", "drainage", "floorDrain"), moreTool], instruction: "地漏图：检查湿区地漏位置、类型与坡向说明。" }),
  workspace({ id: "condensate-drainage", name: "冷凝水排水图", shortName: "冷凝排水", category: "plumbing", mode: "drainagePlan", persistedSheet: "drainagePlan", tools: [selectTool, tool("condensate", "冷凝排水", "C", "drainage", "condensate"), moreTool], instruction: "冷凝水排水：关联空调设备并检查排水去向。" }),

  workspace({ id: "air-conditioning", name: "空调图", shortName: "空调", category: "hvac", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [selectTool, tool("indoor-unit", "空调内机", "I", "annotation", "acIndoor"), tool("outdoor-unit", "空调外机", "O", "annotation", "acOutdoor"), tool("vent", "风口", "▤", "annotation", "airVent"), moreTool], resourceGroups: ["室内机", "室外机", "风口"], instruction: "空调图：布置室内外机和风口，补充设备与检修信息。" }),
  workspace({ id: "fresh-air", name: "新风图", shortName: "新风", category: "hvac", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [selectTool, tool("fresh-air", "新风口", "F", "annotation", "freshAir"), tool("return-air", "回风口", "R", "annotation", "returnAir"), moreTool], instruction: "新风图：布置新风与回风点位并检查房间覆盖。" }),
  workspace({ id: "floor-heating", name: "地暖图", shortName: "地暖", category: "hvac", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [selectTool, tool("manifold", "分集水器", "M", "annotation", "manifold"), tool("heating-zone", "地暖区域", "▧", "annotation", "floorHeating"), moreTool], instruction: "地暖图：标记采暖区域与分集水器位置。" }),
  workspace({ id: "dehumidification", name: "除湿图", shortName: "除湿", category: "hvac", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [selectTool, tool("dehumidifier", "除湿机", "D", "annotation", "dehumidifier"), tool("vent", "风口", "▤", "annotation", "airVent"), moreTool], instruction: "除湿图：布置除湿设备、风口与排水需求。" }),
  workspace({ id: "hot-water-equipment", name: "热水设备图", shortName: "热水设备", category: "hvac", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [selectTool, tool("heater", "热水器", "H", "annotation", "waterHeater"), tool("pump", "水泵", "P", "annotation", "pump"), moreTool], instruction: "热水设备图：检查设备位置、给排水与电源需求。" }),
  workspace({ id: "smart-home-equipment", name: "智能家居设备图", shortName: "智能家居", category: "hvac", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [selectTool, tool("smart", "智能设备", "✦", "annotation", "smartHome"), tool("network", "网络", "N", "network", "network"), moreTool], instruction: "智能家居：集中布置控制器、传感器与网络需求。" }),
  workspace({ id: "other-mep-equipment", name: "其他机电设备图", shortName: "其他设备", category: "hvac", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [selectTool, tool("equipment", "设备", "E", "annotation", "equipment"), tool("ventilation", "通风", "V", "annotation", "ventilation"), moreTool], instruction: "其他设备图：补充未归类机电设备及其安装条件。" }),

  workspace({ id: "floor-finish", name: "地面铺装图", shortName: "地面铺装", category: "finishes", mode: "floorFinishPlan", persistedSheet: "floorFinishPlan", tools: [selectTool, tool("floor-area", "地面区域", "▧", "floorFinish", "roomFinish"), tool("direction", "铺装方向", "↗", "floorFinish", "direction"), tool("start", "起铺点", "●", "floorFinish", "startPoint"), tool("joint", "收口", "┊", "floorFinish", "joint"), moreTool], resourceGroups: ["木地板", "瓷砖", "石材", "微水泥"], validators: ["材料缺失", "起铺点", "收口关系"], instruction: "地面铺装：创建区域并在属性中设置材料、方向、分缝和收口。" }),
  workspace({ id: "wall-finish", name: "墙面饰面图", shortName: "墙面饰面", category: "finishes", mode: "wallFinishPlan", persistedSheet: "wallFinishPlan", tools: [selectTool, tool("wall-area", "墙面区域", "▥", "wallFinish", "wallFinish"), tool("material", "材料", "M", "wallFinish", "material"), tool("joint", "收口", "┊", "wallFinish", "joint"), moreTool], resourceGroups: ["乳胶漆", "木饰面", "石材", "瓷砖"], validators: ["材料缺失", "高度范围", "防水高度"], instruction: "墙面饰面：关联墙体后设置材料、高度范围与特殊处理。" }),
  workspace({ id: "ceiling", name: "天花图", shortName: "天花", category: "finishes", mode: "ceilingPlan", persistedSheet: "ceilingPlan", tools: [selectTool, tool("ceiling-area", "天花区域", "▱", "ceiling", "flatCeiling"), tool("elevation", "标高", "⌃", "annotation", "ceilingElevation"), moreTool], resourceGroups: ["平顶", "跌级", "灯槽"], validators: ["吊顶高度", "灯具承载", "检修口"], instruction: "天花图：创建天花区域，设置高度并关联灯具与检修口。" }),
  workspace({ id: "suspended-ceiling", name: "吊顶图", shortName: "吊顶", category: "finishes", mode: "ceilingPlan", persistedSheet: "ceilingPlan", tools: [selectTool, tool("ceiling-area", "吊顶区域", "▱", "ceiling", "flatCeiling"), tool("inspection", "检修口", "▢", "ceiling", "inspectionAccess"), tool("vent", "风口", "▤", "ceiling", "airVent"), moreTool], instruction: "吊顶图：设置区域高度、检修口、风口与关联灯具。" }),
  workspace({ id: "material-index", name: "材料索引图", shortName: "材料索引", category: "finishes", mode: "materialPlan", persistedSheet: "materialPlan", tools: [selectTool, tool("material", "材料编号", "M", "cabinet", "materialIndex"), tool("annotation", "索引标注", "A", "annotation", "materialIndex"), moreTool], resourceGroups: ["木材", "石材", "布艺", "玻璃", "金属"], instruction: "材料索引：把材料编号关联到家具、柜体和饰面对象。" }),
  workspace({ id: "detail-joints", name: "收口节点图", shortName: "收口节点", category: "finishes", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [selectTool, tool("joint", "收口", "┊", "annotation", "joint"), tool("detail", "节点", "D", "annotation", "detail"), moreTool], instruction: "收口节点：添加节点索引并关联材料与对象。" }),

  workspace({ id: "yard-overview", name: "院子总图", shortName: "院子总图", category: "outdoor", mode: "sitePlan", persistedSheet: "sitePlan", visibleLayers: furnitureLayers, tools: [selectTool, { id: "boundary", label: "边界", icon: "◇", drawTool: "outdoor" }, { id: "fence", label: "围栏", icon: "╫", drawTool: "fence" }, { id: "path", label: "道路", icon: "〰", drawTool: "path" }, { id: "platform", label: "平台", icon: "▱", drawTool: "hardscape-rect" }, { id: "hardscape", label: "硬地", icon: "▧", drawTool: "hardscape" }, { id: "planting", label: "绿化", icon: "♧", drawTool: "planting" }, moreTool], resourceGroups: ["围栏", "绿植", "铺装", "户外家具"], instruction: "院子总图：先确认边界，再叠加道路、硬地、平台与绿化。" }),
  workspace({ id: "fence-plan", name: "围栏图", shortName: "围栏", category: "outdoor", mode: "sitePlan", persistedSheet: "sitePlan", visibleLayers: furnitureLayers, tools: [selectTool, { id: "fence", label: "围栏", icon: "╫", drawTool: "fence" }, measureTool, moreTool], instruction: "围栏图：绘制围栏并检查边界、材料和高度。" }),
  workspace({ id: "yard-gate", name: "院门图", shortName: "院门", category: "outdoor", mode: "sitePlan", persistedSheet: "sitePlan", visibleLayers: furnitureLayers, tools: [selectTool, { id: "gate", label: "院门", icon: "◔", drawTool: "door" }, measureTool, moreTool], instruction: "院门图：在围栏或边界上布置院门并检查开启。" }),
  workspace({ id: "outdoor-road", name: "道路图", shortName: "道路", category: "outdoor", mode: "sitePlan", persistedSheet: "sitePlan", visibleLayers: furnitureLayers, tools: [selectTool, { id: "path", label: "道路", icon: "〰", drawTool: "path" }, measureTool, moreTool], instruction: "道路图：绘制中心线并设置宽度与材料。" }),
  workspace({ id: "outdoor-platform", name: "平台图", shortName: "平台", category: "outdoor", mode: "sitePlan", persistedSheet: "sitePlan", visibleLayers: furnitureLayers, tools: [selectTool, { id: "platform", label: "平台", icon: "▱", drawTool: "hardscape-rect" }, measureTool, moreTool], instruction: "平台图：点击两个对角点快速创建矩形平台。" }),
  workspace({ id: "outdoor-hardscape", name: "硬地铺装图", shortName: "硬地铺装", category: "outdoor", mode: "sitePlan", persistedSheet: "sitePlan", visibleLayers: furnitureLayers, tools: [selectTool, { id: "hardscape", label: "硬地", icon: "▧", drawTool: "hardscape" }, measureTool, moreTool], instruction: "硬地铺装：逐点绘制区域并设置铺装材料。" }),
  workspace({ id: "landscape", name: "绿化图", shortName: "绿化", category: "outdoor", mode: "sitePlan", persistedSheet: "sitePlan", visibleLayers: furnitureLayers, tools: [selectTool, { id: "planting", label: "绿化", icon: "♧", drawTool: "planting" }, { id: "tree", label: "树木", icon: "♠", action: "resources" }, moreTool], resourceGroups: ["乔木", "灌木", "地被"], instruction: "绿化图：绘制种植区域，从资源中添加树木。" }),
  workspace({ id: "outdoor-plumbing", name: "户外给排水图", shortName: "户外给排水", category: "outdoor", mode: "waterSupplyPlan", persistedSheet: "waterSupplyPlan", tools: [selectTool, tool("outdoor-water", "户外水点", "W", "waterSupply", "outdoor"), tool("outdoor-drain", "户外排水", "D", "drainage", "outdoor"), moreTool], instruction: "户外给排水：布置水点、排水和设备接口。" }),
  workspace({ id: "outdoor-lighting", name: "户外照明图", shortName: "户外照明", category: "outdoor", mode: "lightingPlan", persistedSheet: "lightingPlan", tools: [selectTool, tool("outdoor-light", "户外灯", "✦", "light", "outdoor"), tool("sensor", "感应灯", "◐", "light", "sensor"), moreTool], instruction: "户外照明：选择防护等级合适的灯具并设置控制关系。" }),
  workspace({ id: "outdoor-equipment", name: "户外设备图", shortName: "户外设备", category: "outdoor", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [selectTool, tool("equipment", "户外设备", "E", "annotation", "outdoorEquipment"), { id: "resources", label: "资源", icon: "▤", action: "resources" }, moreTool], instruction: "户外设备：布置设备并补充电源、给排水和基础条件。" }),

  workspace({ id: "comprehensive-check", name: "综合检查", shortName: "综合检查", category: "delivery", mode: "structureSyncCheck", persistedSheet: "sitePlan", visibleLayers: furnitureLayers, tools: [{ id: "validation", label: "检查", icon: "✓", action: "validation" }, { id: "ai", label: "AI 检查", icon: "✦", action: "ai" }], validators: ["结构", "引用", "机电", "图层", "完成度"], instruction: "综合检查：按问题列表逐项定位对象并修复。" }),
  workspace({ id: "pending-items", name: "待确认项", shortName: "待确认", category: "delivery", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [selectTool, tool("todo", "待确认", "?", "annotation", "todo"), { id: "validation", label: "检查", icon: "✓", action: "validation" }], instruction: "待确认项：集中查看尺寸、材料和设备待确认信息。" }),
  workspace({ id: "errors-warnings", name: "错误与警告", shortName: "错误警告", category: "delivery", mode: "structureSyncCheck", persistedSheet: "sitePlan", tools: [{ id: "validation", label: "检查面板", icon: "!", action: "validation" }], instruction: "错误与警告：点击问题定位画布对象。" }),
  workspace({ id: "structure-link-check", name: "结构联动检查", shortName: "结构联动", category: "delivery", mode: "structureSyncCheck", persistedSheet: "structurePlan", visibleLayers: { ...structureLayers, debug: false }, tools: [selectTool, { id: "validation", label: "检查", icon: "✓", action: "validation" }, moreTool], instruction: "结构联动：核对墙体、楼层和引用关系；调试叠层仅在开发者模式显示。" }),
  workspace({ id: "drawing-completion", name: "图纸完成度", shortName: "完成度", category: "delivery", mode: "annotationPlan", persistedSheet: "annotationPlan", tools: [{ id: "validation", label: "完成度", icon: "%", action: "validation" }], instruction: "图纸完成度：查看各专业图纸状态与缺失信息。" }),
  workspace({ id: "construction-package", name: "施工图纸包", shortName: "图纸包", category: "delivery", mode: "sitePlan", persistedSheet: "sitePlan", tools: [{ id: "more", label: "图纸包", icon: "▤", action: "more" }], instruction: "施工图纸包：管理图纸目录、状态和批量导出。" }),
  workspace({ id: "export-management", name: "导出管理", shortName: "导出", category: "delivery", mode: "sitePlan", persistedSheet: "sitePlan", tools: [{ id: "more", label: "导出", icon: "⇧", action: "more" }], instruction: "导出管理：按楼层、专业或图纸类型组织交付文件。" })
];

export const defaultDrawingWorkspaceIdByMode = drawingWorkspaces.reduce<Partial<Record<PlanCanvasMode, string>>>((result, item) => {
  if (!result[item.mode]) result[item.mode] = item.id;
  return result;
}, {});

export function getDrawingWorkspace(id: string | null | undefined) {
  return drawingWorkspaces.find((item) => item.id === id) ?? drawingWorkspaces[0];
}

export function getDefaultDrawingWorkspace(mode: PlanCanvasMode) {
  return getDrawingWorkspace(defaultDrawingWorkspaceIdByMode[mode]);
}

export function getDrawingWorkspaceIndex(id: string) {
  return Math.max(0, drawingWorkspaces.findIndex((item) => item.id === id));
}

export function getAdjacentDrawingWorkspace(id: string, direction: -1 | 1) {
  const index = getDrawingWorkspaceIndex(id);
  const nextIndex = (index + direction + drawingWorkspaces.length) % drawingWorkspaces.length;
  return drawingWorkspaces[nextIndex];
}
