import { readFile, writeFile } from "node:fs/promises";

const workspacePath = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspacePath, "utf8"));
const now = new Date().toISOString();

const furnitureById = (id) => workspace.furniture.find((item) => item.id === id);
const stableSeed = (id) => Math.abs([...id].reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0));

function visualFurniture({ id, code, name, type, moduleType, dimensions, position, variantId, primaryMaterial, secondaryMaterial, accentMaterial, note }) {
  return {
    id,
    code,
    name,
    type,
    moduleType,
    catalogId: `visual-showcase-${type}`,
    moduleCategory: "living",
    floorId: "1F",
    roomId: "ROOM-1F-005",
    dimensions: { ...dimensions, unit: "cm" },
    material: "暖灰织物 + 浅橡木",
    note,
    constructionNote: note,
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    position,
    color: "#ded4c8",
    render3d: {
      assetType: type,
      variantId,
      variationSeed: stableSeed(id),
      stylePreset: "modernNatural",
      styleSource: "manual",
      detailLevel: "presentation",
      primaryMaterial,
      secondaryMaterial,
      accentMaterial,
      visibleIn3d: true,
      selectableIn3d: true,
      childrenMode: "grouped"
    },
    mepMeta: {
      needsSocket: false,
      socketCount: 0,
      socketHeight: 0,
      needsSwitch: false,
      switchControl: [],
      needsLighting: false,
      lightingType: "none",
      needsWaterSupply: false,
      waterSupplyType: "none",
      needsDrainage: false,
      drainageType: "none",
      needsNetwork: false,
      needsVentilation: false,
      needsSmartControl: false,
      notes: "活动家具，无固定机电。"
    },
    constructionMeta: {
      customMade: false,
      installType: "finishedFurniture",
      reserveSize: `${dimensions.width}x${dimensions.depth}x${dimensions.height}cm`,
      wallDependency: "",
      floorDependency: "按完成面标高校核落地尺寸",
      ceilingDependency: "",
      waterproofRequired: false,
      inspectionAccessRequired: false,
      purchaseCategory: "成品家具",
      supplierType: "成品家具供应商",
      notes: "活动家具，保持周末扩容时可移动。"
    }
  };
}

const table = furnitureById("module-1f-table-001");
if (!table) throw new Error("Missing 1F dining table");
table.name = "1F 电动转盘圆变椭圆餐桌套组";
table.dimensions = { width: 270, depth: 270, height: 75, unit: "cm" };
table.position = { x: 65.8, y: 70.5, rotation: 0 };
table.material = "浅橡木圆变椭圆桌面 + 暖灰软包餐椅 + 黑钛金电动转盘";
table.note = "闭合时为直径 150–160cm 的圆桌，日常 4–6 人；需要时电动同步展开为约 220–240x110–120cm 的椭圆桌，容纳 8–10 人。中央设置约 700–800mm 电动转盘，方便长辈和儿童夹菜。";
table.constructionNote = "平面家具包络按闭合圆桌加 6 把餐椅约 270x270cm 校核；展开桌面约 240x120cm，采购时确认自动伸缩、中央电动转盘、断电手动回收和防夹手保护，并现场复核餐椅后退与东侧水吧操作通道。";
table.render3d = {
  ...table.render3d,
  assetType: "diningTable",
  variantId: "roundPedestal",
  detailLevel: "presentation",
  primaryMaterial: "warmOak",
  secondaryMaterial: "creamFabric",
  accentMaterial: "blackTitanium",
  seatCount: 6,
  closedDiameterCm: 155,
  expandedSizeCm: "240x120",
  poweredTurntableDiameterCm: 75,
  expandedSeatCount: 10,
  expansionMode: "electricSynchronized",
  styleSource: "manual"
};

const compactPrep = furnitureById("furn-kitchen-u-right-run");
if (compactPrep) {
  compactPrep.name = "厨房外侧窄备餐台（不设固定中岛）";
  compactPrep.note = "保留厨房外侧 90–120cm 窄备餐面，承担装盘和临时咖啡功能，不形成独立中岛。";
  compactPrep.constructionNote = "深度控制在 55cm 内；厨房操作侧及餐桌通行净距现场复核，若不足 900mm 则改为可移动窄推车。";
}

const coffeeTableId = "furn-1f-living-coffee-table-flex-001";
workspace.furniture = workspace.furniture.filter((item) => item.id !== coffeeTableId);
workspace.furniture.push(visualFurniture({
  id: coffeeTableId,
  code: "CT-1F-02",
  name: "1F 客厅双层圆角茶几",
  type: "coffeeTable",
  moduleType: "coffeeTable",
  dimensions: { width: 132, depth: 82, height: 38 },
  position: { x: 40.8, y: 70.8, rotation: 0 },
  variantId: "nestedDouble",
  primaryMaterial: "warmOak",
  secondaryMaterial: "travertine",
  accentMaterial: "blackTitanium",
  note: "两只可错位、可分开的低矮茶几；设置在西侧电视壁炉墙与主沙发之间，属于沙发正前方，周末可移开给临时加座留出弹性。"
}));

const removedLivingLooseFurnitureIds = [
  "furn-1f-living-lounge-chair-north-001",
  "furn-1f-living-lounge-chair-south-001",
  "furn-1f-living-side-table-001"
];
workspace.furniture = workspace.furniture.filter((item) => !removedLivingLooseFurnitureIds.includes(item.id));

const sofa = furnitureById("furn-1f-living-main-sofa-001");
if (sofa) {
  sofa.name = "1F 客厅直排模块主沙发";
  sofa.dimensions = { width: 260, depth: 102, height: 78, unit: "cm" };
  sofa.position = { x: 47.4, y: 71.2, rotation: 90 };
  sofa.render3d = {
    ...sofa.render3d,
    assetType: "sofa",
    variantId: "lowModular",
    primaryMaterial: "creamBoucle",
    secondaryMaterial: "greigeLinen",
    accentMaterial: "blackTitanium",
    detailLevel: "presentation",
    stylePreset: "modernNatural",
    styleSource: "manual",
    visibleIn3d: true,
    selectableIn3d: true,
    childrenMode: "grouped"
  };
  sofa.note = "直排主沙发承担当常 3–4 人座位；不配置休闲椅和沙发边几，仅保留正前方可分开的低矮茶几，让客厅与餐区之间保持开敞。";
  sofa.constructionNote = "坐深控制在约 100cm，坐高和靠背不宜过低；沙发右侧端部保留去餐区连续通道。";
}

const cameraUpdates = {
  "view-1f-island-dining": {
    name: "1F 餐桌 · 可伸缩椭圆桌",
    cameraPosition: { x: 2.7, y: 1.85, z: 3.45 },
    target: { x: 1.95, y: 0.58, z: 1.72 },
    description: "从客厅侧看可伸缩椭圆餐桌、8把餐椅、厨房外侧窄备餐面与南段水吧的关系。"
  },
  "view-1f-living-sofa-detail": {
    cameraPosition: { x: -1.9, y: 1.55, z: 3.35 },
    target: { x: -0.25, y: 0.55, z: 1.72 },
    description: "展示直排模块沙发、正前方双层茶几和通往餐区的连续动线；不设置休闲椅与沙发边几。"
  },
  "view-1f-living-dining-overview": {
    name: "1F 客餐厨总览 · 无固定中岛",
    description: "检查无固定中岛条件下，厨房、可伸缩餐桌、直排沙发和楼梯之间的通行动线。"
  }
};
workspace.cameraViews = workspace.cameraViews.map((view) => cameraUpdates[view.id] ? { ...view, ...cameraUpdates[view.id] } : view);
workspace.defaultWorkspaceRevision = "2026-08-09-1f-tv-facing-sofa-waterbar-layout-v4";
workspace.updatedAt = now;

await writeFile(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);
console.log(JSON.stringify({ revision: workspace.defaultWorkspaceRevision, diningTable: table.dimensions, retained: [coffeeTableId], removed: removedLivingLooseFurnitureIds }, null, 2));
