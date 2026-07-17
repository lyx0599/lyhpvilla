import type { DrawingItem, DrawingItemCategory, Furniture, HouseStructure, StairLanding, StairOpening, StairSystem } from "@/types/space";
import type { DesignWorkspaceId } from "@/lib/drawing-workspaces";

export type DrawingStatus = "draft" | "ready" | "incomplete";

export type DrawingDefinition = {
  id: string;
  number: string;
  name: string;
  workspace: DesignWorkspaceId;
  requiredObjectTypes: string[];
  visibleLayers: string[];
  annotationTypes: string[];
  legendItems: string[];
  exportable: boolean;
  status: DrawingStatus;
};

export type DrawingReadiness = DrawingDefinition & {
  missing: string[];
  objectCount: number;
  updatedAt?: string;
};

export type DrawingReadinessContext = {
  structure: HouseStructure;
  furniture: Furniture[];
  drawingItems: DrawingItem[];
  stairSystems: StairSystem[];
  stairLandings: StairLanding[];
  stairOpenings: StairOpening[];
  errorCount: number;
  warningCount: number;
};

export const outputDrawingDefinitions: DrawingDefinition[] = [
  { id: "layout-plan", number: "A-01", name: "平面布置图", workspace: "space", requiredObjectTypes: ["墙体", "门窗", "房间"], visibleLayers: ["墙体", "门窗", "房间", "家具轮廓"], annotationTypes: ["房间名称", "主要尺寸"], legendItems: ["墙体", "门", "窗", "楼梯"], exportable: true, status: "draft" },
  { id: "renovation-plan", number: "A-02", name: "拆改图", workspace: "renovation", requiredObjectTypes: ["保留对象", "拆除对象", "新建对象"], visibleLayers: ["原始结构", "拆除", "新建"], annotationTypes: ["拆改标注"], legendItems: ["保留", "拆除", "新建"], exportable: true, status: "draft" },
  { id: "furniture-position-plan", number: "F-01", name: "家具定位图", workspace: "furniture", requiredObjectTypes: ["家具", "固定柜体"], visibleLayers: ["墙体", "门窗", "家具", "柜体"], annotationTypes: ["家具定位", "尺寸"], legendItems: ["活动家具", "固定柜体", "设备"], exportable: true, status: "draft" },
  { id: "socket-plan", number: "E-01", name: "插座点位图", workspace: "mep", requiredObjectTypes: ["插座", "设备电源"], visibleLayers: ["墙体", "家具轮廓", "插座"], annotationTypes: ["安装高度", "定位尺寸"], legendItems: ["普通插座", "防水插座", "地插", "网络接口"], exportable: true, status: "draft" },
  { id: "switch-plan", number: "E-02", name: "开关控制图", workspace: "mep", requiredObjectTypes: ["开关", "受控灯具"], visibleLayers: ["墙体", "开关", "灯具", "控制关系"], annotationTypes: ["安装高度", "控制连线"], legendItems: ["单控", "双控", "场景开关"], exportable: true, status: "draft" },
  { id: "lighting-plan", number: "L-01", name: "灯具点位图", workspace: "mep", requiredObjectTypes: ["灯具", "灯组"], visibleLayers: ["墙体", "家具轮廓", "灯具", "灯组"], annotationTypes: ["定位尺寸", "灯具编号"], legendItems: ["筒灯", "射灯", "吊灯", "灯带"], exportable: true, status: "draft" },
  { id: "water-plan", number: "W-01", name: "给水点位图", workspace: "mep", requiredObjectTypes: ["给水点", "用水设备"], visibleLayers: ["墙体", "设备轮廓", "给水点"], annotationTypes: ["安装高度", "水种"], legendItems: ["冷水", "热水", "净水"], exportable: true, status: "draft" },
  { id: "drainage-plan", number: "W-02", name: "排水点位图", workspace: "mep", requiredObjectTypes: ["排水点", "排水设备"], visibleLayers: ["墙体", "设备轮廓", "排水点"], annotationTypes: ["管径", "定位尺寸"], legendItems: ["排水点", "地漏", "冷凝水"], exportable: true, status: "draft" },
  { id: "ceiling-plan", number: "C-01", name: "吊顶图", workspace: "finishes", requiredObjectTypes: ["吊顶区域"], visibleLayers: ["墙体", "吊顶", "灯具", "风口"], annotationTypes: ["完成面标高", "检修口"], legendItems: ["原顶", "吊顶", "灯槽", "检修口"], exportable: true, status: "draft" },
  { id: "floor-finish-plan", number: "M-01", name: "地面铺装图", workspace: "finishes", requiredObjectTypes: ["地面区域", "材料"], visibleLayers: ["墙体", "地面饰面"], annotationTypes: ["铺装方向", "起铺点", "材料编号"], legendItems: ["木地板", "石材", "瓷砖", "收口"], exportable: true, status: "draft" },
  { id: "wall-finish-plan", number: "M-02", name: "墙面索引图", workspace: "finishes", requiredObjectTypes: ["墙面区域", "材料"], visibleLayers: ["墙体", "墙面饰面"], annotationTypes: ["材料编号", "分缝", "收口"], legendItems: ["涂料", "木饰面", "石材", "瓷砖"], exportable: true, status: "draft" },
  { id: "stair-detail", number: "S-01", name: "楼梯详图", workspace: "space", requiredObjectTypes: ["楼梯平面", "楼梯剖面", "楼板洞口", "平台", "栏杆"], visibleLayers: ["楼梯", "平台", "洞口", "上下楼层"], annotationTypes: ["踏步参数", "平台标高", "上下方向", "净高", "栏杆高度"], legendItems: ["上行", "下行", "踏步", "平台", "洞口", "栏杆"], exportable: false, status: "incomplete" }
];

const hasItem = (items: DrawingItem[], categories: DrawingItemCategory[]) => items.filter((item) => categories.includes(item.category));
const hasAnnotation = (items: DrawingItem[], pattern: RegExp) => items.some((item) => item.category === "annotation" && pattern.test(`${item.type} ${item.label}`));

export function evaluateOutputDrawings(context: DrawingReadinessContext): DrawingReadiness[] {
  const { structure, furniture, drawingItems, stairSystems, stairLandings, stairOpenings } = context;
  return outputDrawingDefinitions.map((definition) => {
    const missing: string[] = [];
    let objectCount = 0;
    if (definition.id === "layout-plan") {
      objectCount = structure.walls.length + structure.doors.length + structure.windows.length + structure.rooms.length;
      if (!structure.walls.length) missing.push("墙体");
      if (!structure.rooms.length) missing.push("房间边界");
      if (!hasAnnotation(drawingItems, /dimension|尺寸|room|房间/i)) missing.push("主要尺寸或房间标注");
    } else if (definition.id === "renovation-plan") {
      objectCount = hasItem(drawingItems, ["annotation"]).filter((item) => /renovation|拆|新建/i.test(`${item.type} ${item.label}`)).length;
      missing.push("拆除/新建状态对象");
      if (!objectCount) missing.push("拆改标注");
    } else if (definition.id === "furniture-position-plan") {
      objectCount = furniture.length;
      if (!furniture.length) missing.push("家具或固定柜体");
      if (!hasAnnotation(drawingItems, /furniturePosition|家具定位|dimension|尺寸/i)) missing.push("家具定位尺寸");
    } else if (definition.id === "socket-plan") {
      const items = hasItem(drawingItems, ["socket", "network"]); objectCount = items.length;
      if (!items.length) missing.push("插座点位");
      if (items.some((item) => !item.heightMm)) missing.push("部分安装高度");
      if (!hasAnnotation(drawingItems, /dimension|定位|尺寸/i)) missing.push("定位尺寸");
    } else if (definition.id === "switch-plan") {
      const items = hasItem(drawingItems, ["switch"]); objectCount = items.length;
      if (!items.length) missing.push("开关点位");
      if (items.some((item) => !(item.relatedLightIds?.length || item.controlGroupId))) missing.push("部分控制关系");
    } else if (definition.id === "lighting-plan") {
      const items = hasItem(drawingItems, ["light"]); objectCount = items.length;
      if (!items.length) missing.push("灯具点位");
      if (items.some((item) => !(item.colorTemperature || item.lightColorTemperature))) missing.push("部分色温参数");
      if (items.some((item) => !(item.controlGroupId || item.lightGroupId))) missing.push("部分灯组关系");
    } else if (definition.id === "water-plan") {
      const items = hasItem(drawingItems, ["waterSupply"]); objectCount = items.length;
      if (!items.length) missing.push("给水点位");
      if (items.some((item) => !item.heightMm)) missing.push("部分安装高度");
    } else if (definition.id === "drainage-plan") {
      const items = hasItem(drawingItems, ["drainage"]); objectCount = items.length;
      if (!items.length) missing.push("排水点位");
      if (items.some((item) => !item.type)) missing.push("部分排水类型");
    } else if (definition.id === "ceiling-plan") {
      const items = hasItem(drawingItems, ["ceiling"]); objectCount = items.length;
      if (!items.length) missing.push("吊顶区域");
      if (!hasAnnotation(drawingItems, /ceilingLevel|标高/i)) missing.push("完成面标高");
    } else if (definition.id === "floor-finish-plan") {
      const items = hasItem(drawingItems, ["floorFinish"]); objectCount = items.length;
      if (!items.length) missing.push("地面饰面区域");
      if (items.some((item) => !item.materialId)) missing.push("部分材料编号");
      if (!hasAnnotation(drawingItems, /layDirection|startPoint|铺装|起铺/i)) missing.push("铺装方向或起铺点");
    } else if (definition.id === "wall-finish-plan") {
      const items = hasItem(drawingItems, ["wallFinish"]); objectCount = items.length;
      if (!items.length) missing.push("墙面饰面区域");
      if (items.some((item) => !item.materialId)) missing.push("部分材料编号");
    } else if (definition.id === "stair-detail") {
      objectCount = structure.stairs.length;
      if (!structure.stairs.length) missing.push("楼梯平面");
      if (!stairSystems.length) missing.push("楼梯系统关系");
      if (!stairLandings.length) missing.push("平台与平台标高");
      if (!stairOpenings.length) missing.push("楼板洞口");
      if (!stairOpenings.some((opening) => opening.guardEdges.length)) missing.push("扶手和栏杆");
      if (structure.stairs.some((stair) => !stair.stepCount || !stair.width || !stair.height)) missing.push("踏步参数");
      missing.push("楼梯剖面", "净高", "栏杆高度");
    }
    const status: DrawingStatus = missing.length ? (objectCount ? "incomplete" : "draft") : "ready";
    return { ...definition, status, exportable: definition.id === "stair-detail" ? false : definition.exportable && status === "ready", missing, objectCount, updatedAt: drawingItems.map((item) => item.updatedAt).filter(Boolean).sort().at(-1) };
  });
}
