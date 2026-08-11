import { readFile, writeFile } from "node:fs/promises";
import { stableFurnitureSeed } from "../lib/furniture-variants.ts";
import { CURRENT_WORKSPACE_DATA_REVISION } from "../lib/workspace-migrations.ts";

const workspaceUrl = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspaceUrl, "utf8"));

function mep({ socket = false, lighting = false, notes = "" } = {}) {
  return {
    needsSocket: socket,
    socketCount: socket ? 1 : 0,
    socketHeight: socket ? 300 : 0,
    needsSwitch: lighting,
    switchControl: lighting ? ["local"] : [],
    needsLighting: lighting,
    lightingType: lighting ? "decorative" : "none",
    needsWaterSupply: false,
    waterSupplyType: "none",
    needsDrainage: false,
    drainageType: "none",
    needsNetwork: false,
    needsVentilation: false,
    needsSmartControl: false,
    notes
  };
}

function construction(dimensions, notes, customMade = false) {
  return {
    customMade,
    installType: customMade ? "customCabinet" : "finishedFurniture",
    reserveSize: `${dimensions.width}x${dimensions.depth}x${dimensions.height}cm`,
    wallDependency: customMade ? "安装前复核完成面、墙体垂直度和固定基层" : "",
    floorDependency: "按完成面标高校核落地尺寸",
    ceilingDependency: "",
    waterproofRequired: false,
    inspectionAccessRequired: false,
    purchaseCategory: customMade ? "定制柜体" : "成品家具",
    supplierType: customMade ? "定制柜体供应商" : "成品家具供应商",
    notes
  };
}

function visualFurniture({ id, code, name, type, moduleType, floorId, roomId, dimensions, position, material, color, assetType, variantId, primaryMaterial, secondaryMaterial, accentMaterial, note, socket = false, lighting = false, customMade = false }) {
  return {
    id,
    code,
    name,
    type,
    catalogId: `visual-showcase-${assetType}`,
    moduleCategory: "living",
    ...(moduleType ? { moduleType } : {}),
    floorId,
    roomId,
    dimensions: { ...dimensions, unit: "cm" },
    material,
    note,
    constructionNote: note,
    serviceRequirements: { water: false, drainage: false, power: socket || lighting, exhaust: false },
    position,
    color,
    render3d: {
      assetType,
      variantId,
      variationSeed: stableFurnitureSeed(id),
      stylePreset: "modernNatural",
      styleSource: "generated",
      detailLevel: "presentation",
      primaryMaterial,
      secondaryMaterial,
      accentMaterial,
      visibleIn3d: true,
      selectableIn3d: true,
      childrenMode: "grouped"
    },
    mepMeta: mep({ socket, lighting, notes: note }),
    constructionMeta: construction(dimensions, note, customMade)
  };
}

const additions = [
  visualFurniture({
    id: "furn-1f-living-main-sofa-001", code: "SF-1F-01", name: "1F 客厅低矮模块主沙发", type: "sofa", moduleType: "sofa", floorId: "1F", roomId: "ROOM-1F-005",
    dimensions: { width: 282, depth: 112, height: 76 }, position: { x: 47, y: 69, rotation: 90 }, material: "奶油色羊羔绒 + 内收软包底座", color: "#e8dece", assetType: "sofa", variantId: "boucleCurve",
    primaryMaterial: "creamBoucle", secondaryMaterial: "creamBoucle", accentMaterial: "beigeFabric", socket: true,
    note: "低矮深坐模块沙发，面向西侧电视壁炉墙；右侧端位保留去餐厅通道。"
  }),
  visualFurniture({
    id: "furn-1f-living-rug-001", code: "RG-1F-01", name: "1F 客厅米灰织物地毯", type: "custom", floorId: "1F", roomId: "ROOM-1F-005",
    dimensions: { width: 360, depth: 220, height: 3 }, position: { x: 39.5, y: 69, rotation: 90 }, material: "米灰低绒织物", color: "#d8cabc", assetType: "generic", variantId: "areaRug",
    primaryMaterial: "beigeFabric", secondaryMaterial: "creamFabric", accentMaterial: "taupeFabric",
    note: "覆盖沙发前区和茶几区，边缘不压主要通道。"
  }),
  visualFurniture({
    id: "furn-1f-living-coffee-table-001", code: "CT-1F-01", name: "1F 客厅洞石木质组合茶几", type: "table", moduleType: "table", floorId: "1F", roomId: "ROOM-1F-005",
    dimensions: { width: 108, depth: 72, height: 36 }, position: { x: 37.3, y: 69, rotation: 90 }, material: "米色洞石 + 浅橡木", color: "#ded2bd", assetType: "coffeeTable", variantId: "nestedDouble",
    primaryMaterial: "warmOak", secondaryMaterial: "travertine", accentMaterial: "blackTitanium",
    note: "两只错位茶几形成不对称中心，保留沙发前操作距离。"
  }),
  visualFurniture({
    id: "furn-1f-living-side-table-001", code: "STB-1F-01", name: "1F 客厅沙发单侧圆边几", type: "table", moduleType: "table", floorId: "1F", roomId: "ROOM-1F-005",
    dimensions: { width: 48, depth: 48, height: 48 }, position: { x: 50.2, y: 82, rotation: 0 }, material: "暖灰石材 + 黑钛底座", color: "#d8d1c6", assetType: "coffeeTable", variantId: "lowRound",
    primaryMaterial: "warmGreyStone", secondaryMaterial: "blackTitanium", accentMaterial: "brushedBronze",
    note: "仅设在沙发一端，避免完全对称陈列。"
  }),
  visualFurniture({
    id: "furn-1f-living-floor-lamp-001", code: "FL-1F-01", name: "1F 客厅单侧阅读落地灯", type: "custom", floorId: "1F", roomId: "ROOM-1F-005",
    dimensions: { width: 46, depth: 46, height: 158 }, position: { x: 50.4, y: 54.5, rotation: 0 }, material: "织物灯罩 + 黑钛灯杆", color: "#eee3d6", assetType: "generic", variantId: "floorLamp",
    primaryMaterial: "creamFabric", secondaryMaterial: "warmLightEmissive", accentMaterial: "blackTitanium", socket: true, lighting: true,
    note: "沙发北端阅读灯，插座随沙发端位复核。"
  }),
  visualFurniture({
    id: "furn-2f-master-rug-001", code: "RG-2F-01", name: "2F 主卧床下米灰地毯", type: "custom", floorId: "2F", roomId: "ROOM-2F-006",
    dimensions: { width: 225, depth: 280, height: 3 }, position: { x: 71.6, y: 69, rotation: 0 }, material: "米灰短绒织物", color: "#d8cabc", assetType: "generic", variantId: "areaRug",
    primaryMaterial: "beigeFabric", secondaryMaterial: "creamFabric", accentMaterial: "taupeFabric",
    note: "从床侧和床尾露出柔和边界，减少大面积硬地感。"
  })
];

const existingIds = new Set(additions.map((item) => item.id));
workspace.furniture = workspace.furniture.filter((item) => !existingIds.has(item.id));
workspace.furniture.push(...additions);

const diningSet = workspace.furniture.find((item) => item.id === "module-1f-table-001");
if (diningSet) {
  diningSet.position = { x: 66.5, y: 69, rotation: 0 };
  diningSet.render3d = { ...diningSet.render3d, variantId: "roundPedestal", detailLevel: "presentation", primaryMaterial: "walnut", secondaryMaterial: "creamFabric", accentMaterial: "blackTitanium" };
}

const mediaWall = workspace.furniture.find((item) => item.id === "furn-living-fireplace-south-001");
if (mediaWall) {
  mediaWall.name = "1F 客厅电视壁炉收纳一体墙";
  mediaWall.dimensions = { width: 260, depth: 35, height: 185, unit: "cm" };
  mediaWall.position = { x: 33, y: 69, rotation: 270 };
  mediaWall.material = "浅橡木 + 暖灰洞石 + 暖白哑光漆 + 黑钛";
  mediaWall.note = "电视、壁炉、悬浮抽屉、开放格和背景墙统一收口；保留设备散热与检修。";
  mediaWall.render3d = { ...mediaWall.render3d, assetType: "fireplace", variantId: "integratedMediaWall", detailLevel: "presentation", primaryMaterial: "warmOak", secondaryMaterial: "travertine", accentMaterial: "blackTitanium", stylePreset: "modernNatural", styleSource: "generated", variationSeed: mediaWall.render3d?.variationSeed ?? stableFurnitureSeed(mediaWall.id) };
  mediaWall.mepMeta = { ...mediaWall.mepMeta, needsSocket: true, socketCount: 4, needsNetwork: true, needsVentilation: true, notes: mediaWall.note };
  mediaWall.constructionMeta = construction(mediaWall.dimensions, mediaWall.note, true);
}

const masterBed = workspace.furniture.find((item) => item.id === "furn-2f-master-bedroom-bed-001");
if (masterBed) {
  masterBed.position = { x: 71.6, y: 69, rotation: 0 };
  masterBed.render3d = { ...masterBed.render3d, variantId: "tallPanelHeadboard", detailLevel: "presentation", primaryMaterial: "beigeFabric", secondaryMaterial: "creamFabric", accentMaterial: "taupeFabric" };
}

const masterWardrobe = workspace.furniture.find((item) => item.id === "furn-2f-master-bedroom-large-wardrobe-001");
if (masterWardrobe) masterWardrobe.render3d = { ...masterWardrobe.render3d, variantId: "openClosedMix", detailLevel: "presentation", primaryMaterial: "warmOak", secondaryMaterial: "warmWhiteCeramic", accentMaterial: "brushedBronze" };

const cameraUpdates = {
  "view-1f-fireplace": {
    cameraPosition: { x: -0.88, y: 1.35, z: 1.05 },
    target: { x: -2.04, y: 0.64, z: 1.71 },
    description: "从客厅内部正看电视、壁炉、悬浮抽屉和开放格的一体化关系。"
  },
  "view-1f-island-dining": {
    cameraPosition: { x: 2.5, y: 1.75, z: 3.15 },
    target: { x: 1.98, y: 0.52, z: 1.7 },
    description: "以六人圆桌为中心，同时观察餐椅与餐边柜的材质关系。"
  },
  "view-2f-master-bedroom": {
    cameraPosition: { x: 2.5, y: 1.8, z: 3.08 },
    target: { x: 2.55, y: 0.5, z: 1.65 },
    description: "从主卧西南侧观察软包床、非对称床头组合与东侧通顶衣柜。"
  }
};
workspace.cameraViews = workspace.cameraViews.map((view) => cameraUpdates[view.id] ? { ...view, ...cameraUpdates[view.id] } : view);
const sofaCameraId = "view-1f-living-sofa-detail";
const sofaCamera = {
  id: sofaCameraId,
  name: "1F 沙发模块细节",
  floor: "1F",
  cameraPosition: { x: -1.45, y: 1.25, z: 2.65 },
  target: { x: -0.36, y: 0.42, z: 1.71 },
  zoom: 1.04,
  mode: "perspective",
  description: "近距离观察模块坐垫、独立靠背、底座和不对称靠包。"
};
workspace.cameraViews = [...workspace.cameraViews.filter((view) => view.id !== sofaCameraId), sofaCamera];

workspace.dataRevision = CURRENT_WORKSPACE_DATA_REVISION;
workspace.defaultWorkspaceRevision = "2026-07-15-furniture-visual-showcases-v3";
workspace.updatedAt = new Date().toISOString();

await writeFile(workspaceUrl, `${JSON.stringify(workspace, null, 2)}\n`);
console.log(JSON.stringify({ added: additions.length, totalFurniture: workspace.furniture.length, revision: workspace.dataRevision }, null, 2));
