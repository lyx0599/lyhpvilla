import type { Dimension, FurnitureType, InteriorModuleCategory, InteriorModuleType, ModuleServiceRequirements } from "@/types/space";

export type InteriorModuleCatalogItem = {
  id: string;
  category: InteriorModuleCategory;
  moduleType: InteriorModuleType;
  furnitureType: FurnitureType;
  codePrefix: string;
  name: string;
  dimensions: Dimension;
  color: string;
  material: string;
  note: string;
  serviceRequirements: ModuleServiceRequirements;
};

export const interiorModuleCategoryLabels: Record<InteriorModuleCategory, string> = {
  living: "客餐厅",
  bedroom: "卧室",
  kitchen: "厨房",
  bath: "卫浴",
  storage: "收纳",
  decor: "绿植装饰"
};

export const interiorModuleTypeLabels: Record<InteriorModuleType, string> = {
  sofa: "沙发",
  table: "餐桌",
  bed: "床",
  nightstand: "床头柜",
  plant: "绿植",
  cabinet: "矮柜",
  island: "中岛台",
  cooktop: "灶台",
  sink: "水槽",
  fridge: "冰箱",
  tallCabinet: "高柜",
  toilet: "马桶",
  bathtub: "浴缸",
  shower: "淋浴间",
  vanity: "台盆柜",
  wardrobe: "衣柜",
  entryCabinet: "玄关柜",
  sideboard: "餐边柜"
};

export const serviceRequirementLabels: Array<{ key: keyof ModuleServiceRequirements; label: string }> = [
  { key: "water", label: "给水" },
  { key: "drainage", label: "排水" },
  { key: "power", label: "电源" },
  { key: "exhaust", label: "排烟" }
];

export const interiorModuleCatalog: InteriorModuleCatalogItem[] = [
  {
    id: "living-sofa",
    category: "living",
    moduleType: "sofa",
    furnitureType: "sofa",
    codePrefix: "SF",
    name: "直排沙发",
    dimensions: { width: 240, depth: 90, height: 78, unit: "cm" },
    color: "#e8ded0",
    material: "布艺 / 皮革沙发",
    note: "用于客厅主座位，后续可按实际采购款式调整长度和材质。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false }
  },
  {
    id: "living-dining-table",
    category: "living",
    moduleType: "table",
    furnitureType: "table",
    codePrefix: "TB",
    name: "六人圆餐桌套组",
    dimensions: { width: 240, depth: 240, height: 75, unit: "cm" },
    color: "#d6d9d7",
    material: "圆餐桌 + 6 把餐椅",
    note: "按整套餐桌椅占地估算，放置后再校核餐椅后退和通道宽度。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false }
  },
  {
    id: "living-tv-cabinet",
    category: "living",
    moduleType: "cabinet",
    furnitureType: "cabinet",
    codePrefix: "TV",
    name: "电视矮柜",
    dimensions: { width: 280, depth: 42, height: 45, unit: "cm" },
    color: "#eadfcd",
    material: "悬浮柜 / 成品矮柜",
    note: "结合电视墙、插座和弱电点位深化。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false }
  },
  {
    id: "bedroom-bed",
    category: "bedroom",
    moduleType: "bed",
    furnitureType: "bed",
    codePrefix: "BD",
    name: "双人床",
    dimensions: { width: 180, depth: 200, height: 95, unit: "cm" },
    color: "#c8a887",
    material: "木质床架 + 软包床头",
    note: "放置后校核床侧通道、床头插座和衣柜开门空间。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false }
  },
  {
    id: "bedroom-nightstand",
    category: "bedroom",
    moduleType: "nightstand",
    furnitureType: "nightstand",
    codePrefix: "NS",
    name: "床头柜",
    dimensions: { width: 48, depth: 42, height: 52, unit: "cm" },
    color: "#d7c3a2",
    material: "成品床头柜 / 木饰面",
    note: "放在床侧，后续可上传实际采购图片并校核床头插座、开关和通道。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false }
  },
  {
    id: "kitchen-island",
    category: "kitchen",
    moduleType: "island",
    furnitureType: "island",
    codePrefix: "IS",
    name: "中岛台",
    dimensions: { width: 240, depth: 95, height: 90, unit: "cm" },
    color: "#d8ddd9",
    material: "岩板台面 + 储物柜体",
    note: "预留岛台地插、净水和排水可选方案。",
    serviceRequirements: { water: true, drainage: true, power: true, exhaust: false }
  },
  {
    id: "kitchen-cooktop",
    category: "kitchen",
    moduleType: "cooktop",
    furnitureType: "cooktop",
    codePrefix: "CK",
    name: "灶台",
    dimensions: { width: 90, depth: 52, height: 12, unit: "cm" },
    color: "#1f2937",
    material: "燃气灶 / 电磁灶预留",
    note: "后续和烟道、排烟路径一起校核。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: true }
  },
  {
    id: "kitchen-sink",
    category: "kitchen",
    moduleType: "sink",
    furnitureType: "sink",
    codePrefix: "SK",
    name: "水槽",
    dimensions: { width: 72, depth: 48, height: 20, unit: "cm" },
    color: "#9cc7d9",
    material: "不锈钢台下盆",
    note: "对应给水、排水和净水点位。",
    serviceRequirements: { water: true, drainage: true, power: false, exhaust: false }
  },
  {
    id: "kitchen-fridge",
    category: "kitchen",
    moduleType: "fridge",
    furnitureType: "fridge",
    codePrefix: "RF",
    name: "嵌入式冰箱位",
    dimensions: { width: 92, depth: 70, height: 190, unit: "cm" },
    color: "#d9dee4",
    material: "高柜嵌入",
    note: "建议独立回路，侧边预留散热。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false }
  },
  {
    id: "kitchen-tall-cabinet",
    category: "kitchen",
    moduleType: "tallCabinet",
    furnitureType: "tallCabinet",
    codePrefix: "TC",
    name: "厨房高柜",
    dimensions: { width: 120, depth: 60, height: 240, unit: "cm" },
    color: "#eadfcd",
    material: "暖白柜门 + 内嵌电器预留",
    note: "可承接蒸烤箱、微波炉或食品储藏。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false }
  },
  {
    id: "bath-toilet",
    category: "bath",
    moduleType: "toilet",
    furnitureType: "toilet",
    codePrefix: "WC",
    name: "马桶",
    dimensions: { width: 70, depth: 75, height: 78, unit: "cm" },
    color: "#f4f0ea",
    material: "智能马桶预留",
    note: "确认坑距、给水角阀和智能马桶电源。",
    serviceRequirements: { water: true, drainage: true, power: true, exhaust: false }
  },
  {
    id: "bath-bathtub",
    category: "bath",
    moduleType: "bathtub",
    furnitureType: "bathtub",
    codePrefix: "BT",
    name: "浴缸",
    dimensions: { width: 170, depth: 75, height: 58, unit: "cm" },
    color: "#d7ecf3",
    material: "亚克力独立/嵌入浴缸",
    note: "校核上下水、检修和防水翻边。",
    serviceRequirements: { water: true, drainage: true, power: false, exhaust: false }
  },
  {
    id: "bath-shower",
    category: "bath",
    moduleType: "shower",
    furnitureType: "shower",
    codePrefix: "SH",
    name: "淋浴间",
    dimensions: { width: 90, depth: 90, height: 210, unit: "cm" },
    color: "#c7d2fe",
    material: "玻璃隔断 + 防滑地面",
    note: "确认地漏、挡水条和花洒冷热水点。",
    serviceRequirements: { water: true, drainage: true, power: false, exhaust: false }
  },
  {
    id: "bath-vanity",
    category: "bath",
    moduleType: "vanity",
    furnitureType: "vanity",
    codePrefix: "VA",
    name: "台盆柜",
    dimensions: { width: 100, depth: 55, height: 85, unit: "cm" },
    color: "#d6d9d7",
    material: "台盆柜 + 镜柜",
    note: "镜柜灯、吹风机插座和台盆排水一起预留。",
    serviceRequirements: { water: true, drainage: true, power: true, exhaust: false }
  },
  {
    id: "storage-wardrobe",
    category: "storage",
    moduleType: "wardrobe",
    furnitureType: "wardrobe",
    codePrefix: "WD",
    name: "衣柜",
    dimensions: { width: 300, depth: 60, height: 240, unit: "cm" },
    color: "#c8a887",
    material: "定制柜体 + 平开/移门",
    note: "确认开门方向、床侧通道和内部功能分区。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false }
  },
  {
    id: "storage-entry-cabinet",
    category: "storage",
    moduleType: "entryCabinet",
    furnitureType: "entryCabinet",
    codePrefix: "EC",
    name: "玄关柜",
    dimensions: { width: 220, depth: 40, height: 240, unit: "cm" },
    color: "#f0e7d8",
    material: "暖白柜门 + 原木开放格",
    note: "预留扫地机器人位、换鞋凳和感应灯电源。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false }
  },
  {
    id: "storage-sideboard",
    category: "storage",
    moduleType: "sideboard",
    furnitureType: "sideboard",
    codePrefix: "SB",
    name: "餐边柜",
    dimensions: { width: 240, depth: 42, height: 210, unit: "cm" },
    color: "#d7c6a8",
    material: "餐边柜 + 小家电台面",
    note: "预留咖啡机、净饮机或小家电插座。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false }
  },
  {
    id: "decor-large-plant",
    category: "decor",
    moduleType: "plant",
    furnitureType: "plant",
    codePrefix: "PL",
    name: "大型绿植",
    dimensions: { width: 120, depth: 120, height: 260, unit: "cm" },
    color: "#7c9468",
    material: "绿植 / 乔木 / 盆栽",
    note: "用于庭院、玄关或客厅视线焦点，可按实际植物冠幅调整。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false }
  }
];

export function getInteriorModuleCatalogItem(catalogId: string) {
  return interiorModuleCatalog.find((item) => item.id === catalogId) ?? null;
}
