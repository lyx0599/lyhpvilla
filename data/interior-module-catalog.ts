import type { CabinetDesign, Dimension, FurnitureType, InteriorModuleCategory, InteriorModuleType, ModuleServiceRequirements, Render3DMeta } from "@/types/space";

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
  render3d?: Partial<Render3DMeta>;
  cabinetDesign?: CabinetDesign;
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
  loungeCoffeeTable: "茶几",
  slabTable: "大板桌",
  bed: "床",
  nightstand: "床头柜",
  plant: "绿植",
  cabinet: "矮柜",
  wallCabinet: "吊柜",
  fireplace: "壁炉",
  kitchenCabinet: "橱柜",
  snackCabinet: "零食柜",
  pegboard: "洞洞板",
  bookshelf: "书架",
  island: "中岛台",
  cooktop: "灶台",
  sink: "水槽",
  fridge: "冰箱",
  washingMachine: "洗烘机组",
  instrumentRack: "乐器架",
  tallCabinet: "高柜",
  toilet: "马桶",
  bathtub: "浴缸",
  shower: "淋浴间",
  vanity: "台盆柜",
  wardrobe: "衣柜",
  entryCabinet: "玄关柜",
  sideboard: "餐边柜",
  outdoorDiningSet: "庭院桌椅",
  dryingRack: "晾晒架",
  dogHouse: "狗屋",
  yardGate: "院门",
  outdoorCabinet: "户外柜",
  yardLight: "庭院灯",
  outdoorSocket: "户外插座",
  drainPoint: "地漏/排水点"
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
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    render3d: { assetType: "sofa", variantId: "boucleCurve", stylePreset: "modernNatural", primaryMaterial: "creamBoucle", secondaryMaterial: "creamBoucle", accentMaterial: "beigeFabric", detailLevel: "presentation", childrenMode: "grouped" }
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
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    render3d: { assetType: "diningTable", variantId: "roundPedestal", stylePreset: "modernNatural", primaryMaterial: "walnut", secondaryMaterial: "creamFabric", accentMaterial: "blackTitanium", detailLevel: "presentation", childrenMode: "grouped" }
  },
  {
    id: "living-slab-table",
    category: "living",
    moduleType: "slabTable",
    furnitureType: "table",
    codePrefix: "DT",
    name: "大板桌",
    dimensions: { width: 260, depth: 95, height: 75, unit: "cm" },
    color: "#8b6b4f",
    material: "实木大板桌面 + 黑色金属支脚",
    note: "适合书房、地下休闲区或多人手作台，外形按长条厚板表达，不再套用圆餐桌图形。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    render3d: { assetType: "slabTable", variantId: "ovalSlab", stylePreset: "modernNatural", primaryMaterial: "warmOak", secondaryMaterial: "blackTitanium", accentMaterial: "brushedBronze", detailLevel: "standard", childrenMode: "grouped" }
  },
  {
    id: "living-lounge-coffee-table",
    category: "living",
    moduleType: "loungeCoffeeTable",
    furnitureType: "table",
    codePrefix: "CT",
    name: "休闲茶几",
    dimensions: { width: 140, depth: 70, height: 38, unit: "cm" },
    color: "#c7ad8d",
    material: "圆角木质茶几 / 石材托盘面",
    note: "用于沙发前或地下休闲区，外形按低矮茶几表达，避免误看成餐桌。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    render3d: { assetType: "loungeCoffeeTable", variantId: "nestedDouble", stylePreset: "modernNatural", primaryMaterial: "warmOak", secondaryMaterial: "travertine", accentMaterial: "blackTitanium", detailLevel: "standard", childrenMode: "grouped" }
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
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    render3d: { assetType: "cabinet", variantId: "floating", stylePreset: "modernNatural", primaryMaterial: "warmOak", secondaryMaterial: "warmWhiteCeramic", accentMaterial: "brushedBronze", detailLevel: "presentation", childrenMode: "grouped" }
  },
  {
    id: "storage-wall-cabinet",
    category: "storage",
    moduleType: "wallCabinet",
    furnitureType: "cabinet",
    codePrefix: "UC",
    name: "墙面吊柜",
    dimensions: { width: 180, depth: 35, height: 70, unit: "cm" },
    color: "#efe6d6",
    material: "定制吊柜 + 隐形拉手",
    note: "适合水吧、洗衣区或餐边上方，按贴墙悬挂柜表达，并提示基层和插座避让。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    render3d: { assetType: "wallCabinet", variantId: "wallMounted", stylePreset: "modernNatural", primaryMaterial: "warmOak", secondaryMaterial: "smokedGlass", accentMaterial: "brushedBronze", detailLevel: "standard", childrenMode: "grouped" }
  },
  {
    id: "living-fireplace",
    category: "living",
    moduleType: "fireplace",
    furnitureType: "fireplace",
    codePrefix: "FP",
    name: "壁炉",
    dimensions: { width: 160, depth: 32, height: 90, unit: "cm" },
    color: "#b86f52",
    material: "电子雾化壁炉 / 酒精壁炉预留",
    note: "适合作为客厅或地下休闲区视觉焦点，优先按电子雾化壁炉占位，真实燃烧方案需复核排烟和防火。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    cabinetDesign: {
      template: "fireplace",
      title: "壁炉设计",
      designThinking: "壁炉先承担视觉焦点和氛围功能，再和电视、收纳、座位距离一起校核，避免只好看不好用。",
      recommendedPlacement: "客厅主视觉墙、地下休闲区或南院室内侧墙，避开门洞和主要通道。",
      layoutNotes: ["壁炉上方可留画面或电视位", "两侧可结合开放格或矮柜", "地面前方保持可停留的舒适距离"],
      zones: [
        { id: "flame", label: "火焰核心", role: "氛围焦点", widthPercent: 54, heightPercent: 58, detail: "控制在视线中心，不让设备尺寸压过墙面比例。", serviceNote: "电子雾化壁炉预留电源和补水维护空间。" },
        { id: "mantel", label: "壁炉台面", role: "展示 / 置物", widthPercent: 100, heightPercent: 18, detail: "台面只放少量装饰，避免靠近发热或雾化出风位置。" },
        { id: "side-storage", label: "两侧收纳", role: "书 / 香氛 / 音响", widthPercent: 46, heightPercent: 42, detail: "两侧用浅柜或开放格平衡墙面，弱化设备感。" }
      ],
      cautionNotes: ["真实燃烧壁炉必须单独复核排烟、防火和物业限制。", "壁炉与电视同墙时要确认设备发热和观看高度。"]
    }
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
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    render3d: { assetType: "bed", variantId: "lowUpholstered", stylePreset: "modernNatural", primaryMaterial: "beigeFabric", secondaryMaterial: "creamFabric", accentMaterial: "taupeFabric", detailLevel: "standard", childrenMode: "grouped" }
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
    serviceRequirements: { water: true, drainage: true, power: true, exhaust: false },
    cabinetDesign: {
      template: "island",
      title: "岛台设计",
      designThinking: "岛台不是单独的桌子，而是厨房和餐厅之间的第二操作台：备餐、简餐、收纳和社交要同时成立。",
      recommendedPlacement: "放在厨房外侧或餐厨中轴，四周通道优先保证 950-1100 mm。",
      layoutNotes: ["靠厨房一侧做备餐和水槽", "靠餐厅一侧可做吧台坐席", "端头预留插座和小家电临时位"],
      zones: [
        { id: "prep", label: "备餐台面", role: "切配 / 装盘", widthPercent: 44, heightPercent: 100, detail: "保留最大连续台面，成为厨房外的第二操作区。", serviceNote: "台面下方预留地插或侧插。" },
        { id: "sink", label: "水槽/净水", role: "洗杯 / 洗果", widthPercent: 26, heightPercent: 100, detail: "可选小水槽，适合饮水、咖啡和水果清洗。", serviceNote: "若做水槽，需确认给水、排水和防水收口。" },
        { id: "seating", label: "吧台坐席", role: "早餐 / 陪伴", widthPercent: 30, heightPercent: 100, detail: "外侧留膝部空间，坐人时不影响厨房主通道。" }
      ],
      cautionNotes: ["户型尺寸未最终确认前，岛台先按可移动体块校核通道。", "岛台排水如果跨距离太远，建议改为无水岛台或仅预留电源。"]
    }
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
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    cabinetDesign: {
      template: "tallCabinet",
      title: "厨房高柜设计",
      designThinking: "把不常移动的大电器和高频干货收进一列，减少台面外露设备，让厨房立面更整洁。",
      recommendedPlacement: "靠近冰箱或厨房端头，避开燃气表、检修口和主通道转角。",
      layoutNotes: ["中段留蒸烤箱/微波炉电源位", "上下柜门统一分缝", "底部留可抽拉高篮或囤货区"],
      zones: [
        { id: "appliance", label: "电器塔", role: "蒸烤 / 微波", widthPercent: 45, heightPercent: 48, detail: "中部按视线高度布置内嵌电器，减少弯腰。", serviceNote: "预留独立电源和散热缝。" },
        { id: "pantry", label: "干货区", role: "米面 / 调味", widthPercent: 35, heightPercent: 70, detail: "窄高拉篮收纳瓶罐和干货，拿取路径短。" },
        { id: "seasonal", label: "高处收纳", role: "低频器具", widthPercent: 20, heightPercent: 30, detail: "上柜放低频锅具、烘焙模具和囤货。" }
      ],
      cautionNotes: ["电器柜深度按设备散热要求复核。", "高柜门开启后不能挡住冰箱门或厨房通道。"]
    }
  },
  {
    id: "kitchen-base-cabinet",
    category: "kitchen",
    moduleType: "kitchenCabinet",
    furnitureType: "kitchenCabinet",
    codePrefix: "KC",
    name: "一字型橱柜",
    dimensions: { width: 300, depth: 60, height: 90, unit: "cm" },
    color: "#e5e1d6",
    material: "石英石台面 + 防潮柜体",
    note: "适合先占位厨房操作面，后续按烟道、上下水和窗位拆成洗切炒分区。",
    serviceRequirements: { water: true, drainage: true, power: true, exhaust: true },
    cabinetDesign: {
      template: "kitchenCabinet",
      title: "橱柜设计",
      designThinking: "先保证洗、切、炒连续，再把常用餐具、调味和小电器放在伸手可及的位置。",
      recommendedPlacement: "沿厨房最长直墙布置，水槽靠近原排水点，灶台靠近烟道。",
      layoutNotes: ["水槽、备餐、灶台依次展开", "台面连续段尽量不少于 900 mm", "吊柜和地柜按常用/低频分层"],
      zones: [
        { id: "sink", label: "洗涤区", role: "水槽 / 洗碗机", widthPercent: 30, heightPercent: 100, detail: "靠近排水点，旁边留沥水和备菜过渡。", serviceNote: "给水、排水、净水和洗碗机电源集中预留。" },
        { id: "prep", label: "备餐区", role: "切配 / 小电器", widthPercent: 38, heightPercent: 100, detail: "保持最大连续台面，抽屉放刀具、保鲜袋和常用碗盘。", serviceNote: "台面上方预留多联插座。" },
        { id: "cook", label: "烹饪区", role: "灶具 / 调味", widthPercent: 32, heightPercent: 100, detail: "灶台两侧留落锅和调味空间，下方收锅具。", serviceNote: "排烟和燃气/电源按现场条件确认。" }
      ],
      cautionNotes: ["中岛或餐桌旁至少留 900 mm 通道。", "水槽、灶台不建议紧贴墙角。"]
    }
  },
  {
    id: "storage-snack-cabinet",
    category: "storage",
    moduleType: "snackCabinet",
    furnitureType: "snackCabinet",
    codePrefix: "SC",
    name: "零食柜",
    dimensions: { width: 120, depth: 40, height: 210, unit: "cm" },
    color: "#f3d9b1",
    material: "透明抽屉 + 开放格 + 封闭柜门",
    note: "适合放在餐厨或客厅交界，把零食、咖啡、茶包和常用杯具集中管理。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    cabinetDesign: {
      template: "snackCabinet",
      title: "零食柜设计",
      designThinking: "把看得见的高频零食和需要遮起来的囤货分开，避免台面堆满小包装。",
      recommendedPlacement: "靠近餐桌、沙发或厨房入口，旁边最好有一组插座给咖啡机/饮水设备。",
      layoutNotes: ["中段开放格拿取最快", "下方抽屉按家庭成员或品类分区", "高处封闭柜收囤货"],
      zones: [
        { id: "display", label: "开放拿取", role: "咖啡 / 茶 / 杯具", widthPercent: 100, heightPercent: 32, detail: "中腰位置做开放格，放每天都会拿的东西。", serviceNote: "台面或开放格内预留电源。" },
        { id: "drawers", label: "分类抽屉", role: "零食 / 冲饮", widthPercent: 100, heightPercent: 38, detail: "浅抽屉按甜口、咸口、儿童零食分层，减少翻找。" },
        { id: "stock", label: "囤货柜", role: "整箱 / 低频", widthPercent: 100, heightPercent: 30, detail: "封闭门板遮住包装杂乱，保持客餐厅清爽。" }
      ],
      cautionNotes: ["柜深 350-450 mm 更适合零食，太深容易被遮住。", "靠近餐厅时外观要和餐边柜统一。"]
    }
  },
  {
    id: "storage-pegboard",
    category: "storage",
    moduleType: "pegboard",
    furnitureType: "pegboard",
    codePrefix: "PB",
    name: "洞洞板",
    dimensions: { width: 120, depth: 8, height: 180, unit: "cm" },
    color: "#bfd7c9",
    material: "金属/木质洞洞板 + 可调挂件",
    note: "适合玄关、家政、书房或工具角，先占墙面位置，再按物品数量增减挂件。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    cabinetDesign: {
      template: "pegboard",
      title: "洞洞板设计",
      designThinking: "用可移动挂件处理经常变化的小物件，让墙面承担临时收纳和展示，而不是再增加厚柜。",
      recommendedPlacement: "玄关换鞋区、洗衣家政区、书桌侧墙或车库工具墙。",
      layoutNotes: ["上方放轻物和展示", "中段放高频工具", "下方留给包、伞或清洁用品"],
      zones: [
        { id: "display", label: "展示挂件", role: "钥匙 / 香氛 / 小物", widthPercent: 100, heightPercent: 28, detail: "轻量物品放视线高度以上，保持整洁感。" },
        { id: "daily", label: "高频挂取", role: "包 / 帽 / 工具", widthPercent: 100, heightPercent: 46, detail: "最顺手的位置给每天会拿的东西。" },
        { id: "utility", label: "重物低挂", role: "伞 / 清洁用品", widthPercent: 100, heightPercent: 26, detail: "重物下置，减少墙面受力风险。" }
      ],
      cautionNotes: ["安装墙体需确认承重和基层。", "不要把强电插座藏在不可拆挂件后面。"]
    }
  },
  {
    id: "storage-bookshelf",
    category: "storage",
    moduleType: "bookshelf",
    furnitureType: "bookshelf",
    codePrefix: "BS",
    name: "书架",
    dimensions: { width: 240, depth: 32, height: 240, unit: "cm" },
    color: "#d9c7a7",
    material: "开放层板 + 局部柜门",
    note: "适合书房、客厅背景墙或楼梯旁，把书、展示品和杂物分开。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    cabinetDesign: {
      template: "bookshelf",
      title: "书架设计",
      designThinking: "开放书格负责展示和取书，封闭柜负责遮杂物，避免整墙书架变成凌乱背景。",
      recommendedPlacement: "书房主墙、客厅侧墙或楼梯转角，避开强日晒和潮湿墙面。",
      layoutNotes: ["常读书放 900-1600 mm 高度", "展示格穿插留白", "底部封闭柜收文件和杂物"],
      zones: [
        { id: "books", label: "常读书区", role: "书籍", widthPercent: 58, heightPercent: 62, detail: "按 300-350 mm 层高做可调层板，适配不同书高。" },
        { id: "display", label: "展示留白", role: "摆件 / 画册", widthPercent: 42, heightPercent: 46, detail: "穿插大格和空格，墙面不会显得满。" },
        { id: "closed", label: "底部柜门", role: "文件 / 杂物", widthPercent: 100, heightPercent: 24, detail: "封闭收纳承担杂物，开放区只保留好看的内容。", serviceNote: "可预留灯带或阅读角插座。" }
      ],
      cautionNotes: ["书架跨度过大时要加竖板，避免层板下垂。", "落地高柜建议固定到墙。"]
    }
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
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    cabinetDesign: {
      template: "entryCabinet",
      title: "玄关柜设计",
      designThinking: "把进出门的动作拆成换鞋、挂衣、放包、收快递和清洁设备五件事，柜体按动作顺序分区。",
      recommendedPlacement: "靠近入户门但不压迫门洞，优先贴长墙或转角墙布置。",
      layoutNotes: ["中段留开放台面放钥匙和包", "底部悬空放常穿鞋", "侧边预留挂衣或全身镜"],
      zones: [
        { id: "shoes", label: "鞋区", role: "常穿鞋 / 换鞋凳", widthPercent: 42, heightPercent: 58, detail: "低区做鞋格和换鞋位，常穿鞋不进封闭柜也不显乱。" },
        { id: "drop", label: "随手台", role: "钥匙 / 包 / 快递", widthPercent: 35, heightPercent: 34, detail: "中腰开放格负责进门第一落点，可配感应灯。", serviceNote: "预留感应灯和扫地机器人电源。" },
        { id: "cleaning", label: "家政窄柜", role: "伞 / 吸尘器", widthPercent: 23, heightPercent: 100, detail: "窄高柜收长柄工具，避免清洁物品外露。" }
      ],
      cautionNotes: ["入户过道净宽尽量不低于 900 mm。", "鞋柜深度按最大鞋码和门板形式复核。"]
    }
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
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    render3d: { assetType: "sideboard", variantId: "archedBuffet", stylePreset: "modernNatural", primaryMaterial: "warmOak", secondaryMaterial: "warmWhiteCeramic", accentMaterial: "brushedBronze", detailLevel: "presentation", childrenMode: "grouped", cabinetVisual: { frontStyle: "glass", handleStyle: "knob", glassTone: "clear", gridColumns: 4, interiorLighting: true } },
    cabinetDesign: {
      template: "sideboard",
      title: "餐边柜设计",
      designThinking: "让餐桌附近的小电器、杯具、酒水和备餐杂物离厨房一步远，但不占用厨房主操作台。",
      recommendedPlacement: "餐桌侧边或餐厨过渡墙，台面高度与厨房台面接近更顺手。",
      layoutNotes: ["中段台面放咖啡机和净饮机", "上方玻璃/开放格展示杯具", "下方封闭柜收囤货"],
      zones: [
        { id: "counter", label: "小电器台", role: "咖啡 / 净饮 / 烤箱", widthPercent: 100, heightPercent: 34, detail: "把会冒热气或常用的小电器集中在台面。", serviceNote: "台面上方预留多联插座，可加净水点。" },
        { id: "cups", label: "杯具展示", role: "杯子 / 酒具", widthPercent: 42, heightPercent: 42, detail: "透明或开放格展示好看的杯具，拿取也快。" },
        { id: "closed", label: "封闭收纳", role: "酒水 / 囤货", widthPercent: 58, heightPercent: 52, detail: "下柜隐藏包装和库存，让餐厅保持干净。" }
      ],
      cautionNotes: ["餐椅后退区和餐边柜开门不能冲突。", "有净饮设备时提前确认上下水或桶装水方案。"]
    }
  },
  {
    id: "storage-outdoor-cabinet",
    category: "storage",
    moduleType: "outdoorCabinet",
    furnitureType: "cabinet",
    codePrefix: "OC",
    name: "户外收纳柜",
    dimensions: { width: 160, depth: 55, height: 95, unit: "cm" },
    color: "#8d927f",
    material: "防水户外柜体 + 石材台面",
    note: "用于南北院清洁工具、园艺用品和户外小电器收纳，需复核防水、排水坡度和电源安全。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    render3d: { assetType: "outdoorCabinet", primaryMaterial: "microCement", secondaryMaterial: "warmGreyStone", accentMaterial: "blackTitanium", childrenMode: "grouped" }
  },
  {
    id: "decor-outdoor-dining-set",
    category: "decor",
    moduleType: "outdoorDiningSet",
    furnitureType: "table",
    codePrefix: "OD",
    name: "庭院桌椅套组",
    dimensions: { width: 260, depth: 220, height: 75, unit: "cm" },
    color: "#b9aa91",
    material: "户外餐桌 + 休闲椅",
    note: "用于院子休闲用餐或下午茶，按桌椅组合表达，放置后校核遮阳、动线和排水坡度。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    render3d: { assetType: "outdoorDiningSet", primaryMaterial: "warmOak", secondaryMaterial: "creamFabric", accentMaterial: "blackTitanium", childrenMode: "grouped" }
  },
  {
    id: "decor-drying-rack",
    category: "decor",
    moduleType: "dryingRack",
    furnitureType: "custom",
    codePrefix: "DR",
    name: "折叠晾晒架",
    dimensions: { width: 220, depth: 70, height: 155, unit: "cm" },
    color: "#8aa0b4",
    material: "金属折叠晾晒架",
    note: "用于院子或家政区临时晾晒，按细杆结构表达，避免和桌椅混淆。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    render3d: { assetType: "dryingRack", primaryMaterial: "metal-frame", secondaryMaterial: "fabric", accentMaterial: "blackTitanium", childrenMode: "grouped" }
  },
  {
    id: "decor-dog-house",
    category: "decor",
    moduleType: "dogHouse",
    furnitureType: "custom",
    codePrefix: "DH",
    name: "宠物屋",
    dimensions: { width: 110, depth: 85, height: 95, unit: "cm" },
    color: "#b98d64",
    material: "户外木质宠物屋",
    note: "用于院子宠物休息点，按小屋外形表达，需避开暴晒和主要通道。",
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    render3d: { assetType: "dogHouse", primaryMaterial: "honeyWood", secondaryMaterial: "warmGreyStone", accentMaterial: "blackTitanium", childrenMode: "grouped" }
  },
  {
    id: "decor-yard-gate",
    category: "decor",
    moduleType: "yardGate",
    furnitureType: "custom",
    codePrefix: "YG",
    name: "院门",
    dimensions: { width: 180, depth: 18, height: 180, unit: "cm" },
    color: "#5f6670",
    material: "金属院门 / 栅格门",
    note: "用于南北院入口表达，按门扇和门柱显示，后续和围栏、门禁、电源点联动。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    render3d: { assetType: "yardGate", primaryMaterial: "blackTitanium", secondaryMaterial: "brushedBronze", accentMaterial: "warmLightEmissive", childrenMode: "grouped" }
  },
  {
    id: "decor-yard-light",
    category: "decor",
    moduleType: "yardLight",
    furnitureType: "custom",
    codePrefix: "YL",
    name: "庭院灯",
    dimensions: { width: 35, depth: 35, height: 85, unit: "cm" },
    color: "#f1c86a",
    material: "低位庭院灯 / 暖光光源",
    note: "用于花池、入口和台阶旁的低位照明，占位时同步提示回路和开关控制。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    render3d: { assetType: "yardLight", primaryMaterial: "warmLightEmissive", secondaryMaterial: "blackTitanium", accentMaterial: "brushedBronze", childrenMode: "grouped" }
  },
  {
    id: "decor-outdoor-socket",
    category: "decor",
    moduleType: "outdoorSocket",
    furnitureType: "custom",
    codePrefix: "OS",
    name: "户外防水插座",
    dimensions: { width: 22, depth: 12, height: 28, unit: "cm" },
    color: "#4b5563",
    material: "防水盒 + 户外插座",
    note: "用于院子小电器、灯具和清洁设备取电，需确认防水等级和回路保护。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    render3d: { assetType: "outdoorSocket", primaryMaterial: "blackTitanium", secondaryMaterial: "warmGreyStone", accentMaterial: "warmLightEmissive", childrenMode: "grouped" }
  },
  {
    id: "decor-drain-point",
    category: "decor",
    moduleType: "drainPoint",
    furnitureType: "custom",
    codePrefix: "DP",
    name: "地漏 / 排水点",
    dimensions: { width: 35, depth: 35, height: 6, unit: "cm" },
    color: "#6b7280",
    material: "不锈钢地漏 / 线性排水",
    note: "用于院子、阳台或湿区排水占位，放置后校核坡向和检修。",
    serviceRequirements: { water: false, drainage: true, power: false, exhaust: false },
    render3d: { assetType: "drainPoint", primaryMaterial: "metal", secondaryMaterial: "warmGreyStone", accentMaterial: "clearGlass", childrenMode: "grouped" }
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
