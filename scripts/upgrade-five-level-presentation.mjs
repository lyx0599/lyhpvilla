import fs from "node:fs/promises";
import ts from "typescript";

const workspacePath = "data/default-workspace.json";
const workspace = JSON.parse(await fs.readFile(workspacePath, "utf8"));

const cameraViews = [
  { id: "view-1f-living-dining-overview", name: "1F 客餐厨总览", floor: "1F", cameraPosition: { x: 7.8, y: 7.2, z: 8.6 }, target: { x: 0.2, y: 0.45, z: 0.2 }, zoom: 1, mode: "perspective", description: "同时交代厨房、岛台、圆桌、起居区和楼梯关系。" },
  { id: "view-1f-island-dining", name: "1F 中岛 + 餐桌", floor: "1F", cameraPosition: { x: 5.8, y: 3.8, z: 4.8 }, target: { x: 1.05, y: 0.55, z: -0.1 }, zoom: 1.08, mode: "perspective", description: "突出微水泥岛台与木石圆桌的材质差异。" },
  { id: "view-1f-entry", name: "1F 玄关柜", floor: "1F", cameraPosition: { x: -5.6, y: 3.1, z: -5.8 }, target: { x: -1.47, y: 0.65, z: -2.8 }, zoom: 1.08, mode: "perspective", description: "查看玄关柜、挂衣区和入户动线。" },
  { id: "view-1f-fireplace", name: "1F 壁炉 / 起居区", floor: "1F", cameraPosition: { x: -5.2, y: 2.7, z: 4.7 }, target: { x: -1.95, y: 0.58, z: 1.7 }, zoom: 1.05, mode: "perspective", description: "强调壁炉墙面、沙发、茶几与通道关系。" },
  { id: "view-2f-master-bedroom", name: "2F 主卧", floor: "2F", cameraPosition: { x: 6.1, y: 3.6, z: 5.8 }, target: { x: 2.58, y: 0.62, z: 0.92 }, zoom: 1.08, mode: "perspective", description: "主床、整墙衣柜和主卫入口总览。" },
  { id: "view-2f-closet", name: "2F 衣帽间", floor: "2F", cameraPosition: { x: 4.8, y: 3.2, z: -6.1 }, target: { x: 0.53, y: 0.7, z: -2.8 }, zoom: 1.1, mode: "perspective", description: "开放柜、玻璃门、灯带与整理桌组合。" },
  { id: "view-2f-master-bath", name: "2F 主卫", floor: "2F", cameraPosition: { x: 6.3, y: 3.2, z: -5.5 }, target: { x: 2.58, y: 0.62, z: -2.8 }, zoom: 1.12, mode: "perspective", description: "双台盆、浴缸、淋浴和马桶的轴测关系。" },
  { id: "view-2f-secondary-bedroom", name: "2F 次卧", floor: "2F", cameraPosition: { x: -6.1, y: 3.5, z: 5.4 }, target: { x: -3.57, y: 0.58, z: 1.97 }, zoom: 1.08, mode: "perspective", description: "次卧床与衣柜的简洁统一方案。" },
  { id: "view-b2-activity", name: "B2 活动区", floor: "B2", cameraPosition: { x: 5.8, y: 3.5, z: 6.3 }, target: { x: 1.62, y: 0.5, z: 1.97 }, zoom: 1.06, mode: "perspective", description: "活动留白、软垫、收纳与挑空边界。" },
  { id: "view-b2-study", name: "B2 书房", floor: "B2", cameraPosition: { x: -6.1, y: 3.5, z: 5.8 }, target: { x: -2.65, y: 0.55, z: 1.97 }, zoom: 1.08, mode: "perspective", description: "大板桌、展示书柜与阅读照明。" },
  { id: "view-b1-guest-room", name: "B1 客房", floor: "B1", cameraPosition: { x: 5.6, y: 3.4, z: -4.8 }, target: { x: 0.13, y: 0.58, z: -2.46 }, zoom: 1.08, mode: "perspective", description: "客房床、床头柜和整墙换季衣柜。" },
  { id: "view-b1-bath", name: "B1 卫生间", floor: "B1", cameraPosition: { x: -4.6, y: 3.0, z: -5.6 }, target: { x: -1.33, y: 0.58, z: -3.27 }, zoom: 1.12, mode: "perspective", description: "紧凑卫浴与洗衣功能的给排水检修关系。" },
  { id: "view-yard-south", name: "南院", floor: "YARD", cameraPosition: { x: 7.0, y: 5.4, z: 10.6 }, target: { x: 0, y: 0.35, z: 4.75 }, zoom: 1.04, mode: "perspective", description: "休闲平台、晾晒、户外柜、宠物角和排水。" },
  { id: "view-yard-north", name: "北院", floor: "YARD", cameraPosition: { x: 5.5, y: 4.6, z: -10.2 }, target: { x: 0, y: 0.35, z: -5.7 }, zoom: 1.04, mode: "perspective", description: "入户院门、围栏、烧烤岛台与户外插座。" }
];

const newFurniture = [
  { id: "furn-1f-entry-cabinet-001", code: "EC-1F-01", name: "1F 入户玄关展示柜", type: "entryCabinet", moduleCategory: "storage", moduleType: "entryCabinet", floorId: "1F", roomId: "ROOM-1F-001", dimensions: { width: 150, depth: 38, height: 230, unit: "cm" }, material: "浅橡木柜体 + 茶色玻璃展示格 + 暖色灯带", note: "入户收纳、换鞋与展示一体，底部悬空并预留感应灯带。", constructionNote: "贴玄关西侧墙复尺定制，避开门套和开关；灯带电源、扫地机器人位和换鞋凳收口同步确认。", position: { x: 33.6, y: 18.8, rotation: 90 }, color: "#c8ad8b" },
  { id: "furn-1f-living-sofa-001", code: "SF-1F-01", name: "1F 起居区奶油直排沙发", type: "sofa", moduleCategory: "living", moduleType: "sofa", floorId: "1F", roomId: "ROOM-1F-005", dimensions: { width: 290, depth: 100, height: 82, unit: "cm" }, material: "奶油布艺 + 浅橡木脚", note: "面向壁炉与茶几，保持楼梯和餐厨通道顺畅。", constructionNote: "成品家具，按插座、落地灯和壁炉观看距离复核最终位置。", position: { x: 52, y: 69, rotation: 0 }, color: "#eee3d6" },
  { id: "furn-1f-living-coffee-table-001", code: "CT-1F-01", name: "1F 起居区洞石茶几", type: "table", moduleCategory: "living", moduleType: "table", floorId: "1F", roomId: "ROOM-1F-005", dimensions: { width: 125, depth: 72, height: 38, unit: "cm" }, material: "米色洞石 + 黑钛底座", note: "与圆餐桌和岛台形成不同材质层次。", constructionNote: "成品茶几，复核沙发前通道和圆角安全。", position: { x: 52, y: 60.5, rotation: 0 }, color: "#ded2bd" },
  { id: "furn-b1-guest-bed-001", code: "BD-B1-01", name: "B1 客房双人床", type: "bed", moduleCategory: "bedroom", moduleType: "bed", floorId: "B1", roomId: "ROOM-B1-002", dimensions: { width: 150, depth: 200, height: 95, unit: "cm" }, material: "米灰布艺软包 + 浅橡木床架", note: "客房标准比 2F 主卧简化，保持同一色系。", constructionNote: "床头两侧预留插座和双控，复核整墙衣柜开门与床侧通道。", position: { x: 61.5, y: 19, rotation: 0 }, color: "#d8cabc" },
  { id: "furn-b1-nightstand-left-001", code: "NS-B1-L", name: "B1 客房左床头柜", type: "nightstand", moduleCategory: "bedroom", moduleType: "nightstand", floorId: "B1", roomId: "ROOM-B1-002", dimensions: { width: 48, depth: 42, height: 52, unit: "cm" }, material: "浅橡木 + 古铜拉手", note: "带小台灯和床头插座。", constructionNote: "按床头完成面复核插座高度。", position: { x: 52.5, y: 19, rotation: 0 }, color: "#c8ad8b" },
  { id: "furn-b1-nightstand-right-001", code: "NS-B1-R", name: "B1 客房右床头柜", type: "nightstand", moduleCategory: "bedroom", moduleType: "nightstand", floorId: "B1", roomId: "ROOM-B1-002", dimensions: { width: 48, depth: 42, height: 52, unit: "cm" }, material: "浅橡木 + 古铜拉手", note: "带小台灯和床头插座。", constructionNote: "按床头完成面复核插座高度。", position: { x: 70.5, y: 19, rotation: 0 }, color: "#c8ad8b" },
  { id: "furn-b1-bath-vanity-001", code: "VA-B1-01", name: "B1 卫生间壁挂浴室柜", type: "vanity", moduleCategory: "bath", moduleType: "vanity", floorId: "B1", roomId: "ROOM-B1-001", dimensions: { width: 75, depth: 48, height: 85, unit: "cm" }, material: "暖灰石材 + 浅橡木", note: "紧凑台盆柜兼顾洗衣房洗手功能。", constructionNote: "复核冷热水、柜内排水、镜前灯、吹风插座和地下室防潮。", position: { x: 35.5, y: 7.2, rotation: 0 }, color: "#d8d1c6" },
  { id: "furn-b1-bath-toilet-001", code: "WC-B1-01", name: "B1 卫生间智能马桶", type: "toilet", moduleCategory: "bath", moduleType: "toilet", floorId: "B1", roomId: "ROOM-B1-001", dimensions: { width: 68, depth: 74, height: 76, unit: "cm" }, material: "暖白陶瓷", note: "按紧凑卫浴布置。", constructionNote: "复核坑距、角阀、防溅插座和检修口。", position: { x: 42.2, y: 14.2, rotation: 90 }, color: "#fbf8f1" },
  { id: "furn-b1-bath-shower-001", code: "SH-B1-01", name: "B1 卫生间玻璃淋浴间", type: "shower", moduleCategory: "bath", moduleType: "shower", floorId: "B1", roomId: "ROOM-B1-001", dimensions: { width: 82, depth: 82, height: 205, unit: "cm" }, material: "低铁玻璃 + 黑钛边框", note: "紧凑玻璃隔断，避免地下空间显暗。", constructionNote: "复核冷热水、地漏坡度、防水高度、排风和玻璃门开启。", position: { x: 35.5, y: 18.2, rotation: 0 }, color: "#c9e7e8" },
  { id: "furn-b1-lounge-chair-001", code: "SF-B1-01", name: "B1 休闲角双人沙发", type: "sofa", moduleCategory: "living", moduleType: "sofa", floorId: "B1", roomId: "ROOM-B1-004", dimensions: { width: 155, depth: 82, height: 78, unit: "cm" }, material: "灰褐布艺 + 浅木脚", note: "作为地下休闲角阅读与等候座位。", constructionNote: "成品家具，结合落地灯和插座位置复核。", position: { x: 27, y: 69, rotation: 0 }, color: "#aa9786" },
  { id: "ph-1f-north-yard-gate", code: "YG-1F-N", name: "北院庭院门", type: "custom", floorId: "1F", roomId: "OD-1F-NORTH-001", dimensions: { width: 130, depth: 14, height: 180, unit: "cm" }, material: "深灰金属格栅", note: "入户庭院门方案示意。", constructionNote: "复核门柱、门禁、电源、排水和开启净宽。", position: { x: 43.5, y: -15.8, rotation: 0 }, color: "#3f4447" },
  { id: "ph-1f-south-outdoor-cabinet", code: "YC-1F-S", name: "南院防水户外柜", type: "custom", floorId: "1F", roomId: "OD-1F-SOUTH-001", dimensions: { width: 150, depth: 58, height: 92, unit: "cm" }, material: "户外木色 + 浅灰石材台面", note: "洗衣、清洁和园艺用品集中收纳。", constructionNote: "户外定制柜，防水封边；预留插座、给水、排水和可拆检修背板。", position: { x: 18, y: 113, rotation: 0 }, color: "#9c8a74" },
  { id: "ph-1f-south-yard-light", code: "YL-1F-S", name: "南院低位庭院灯", type: "custom", floorId: "1F", roomId: "OD-1F-SOUTH-001", dimensions: { width: 24, depth: 24, height: 100, unit: "cm" }, material: "深灰金属 + 3000K 暖光", note: "低亮度路径与休闲区照明。", constructionNote: "使用防水接线盒和独立回路，灯光避免直射邻居。", position: { x: 50, y: 111, rotation: 0 }, color: "#3f4447" },
  { id: "ph-1f-north-outdoor-socket", code: "SO-1F-N", name: "北院防水户外插座", type: "custom", floorId: "1F", roomId: "OD-1F-NORTH-001", dimensions: { width: 18, depth: 10, height: 45, unit: "cm" }, material: "深灰防水盒", note: "烧烤和清洁设备地插/墙插需求提示。", constructionNote: "防水盒、漏保和独立回路，离积水点保持安全距离。", position: { x: 30, y: -9, rotation: 0 }, color: "#3f4447" },
  { id: "ph-1f-south-water-tap", code: "WT-1F-S", name: "南院给水龙头", type: "sink", floorId: "1F", roomId: "OD-1F-SOUTH-001", dimensions: { width: 28, depth: 22, height: 75, unit: "cm" }, material: "古铜户外龙头 + 石材基座", note: "园艺和冲洗给水点。", constructionNote: "预留冷水、冬季防冻泄水和墙面固定。", position: { x: 14, y: 110, rotation: 0 }, color: "#a17f5b" },
  { id: "ph-1f-south-drain-point", code: "DR-1F-S", name: "南院排水点 / 地漏", type: "custom", floorId: "1F", roomId: "OD-1F-SOUTH-001", dimensions: { width: 35, depth: 35, height: 4, unit: "cm" }, material: "深灰金属地漏", note: "户外柜与宠物角附近排水需求提示。", constructionNote: "结合庭院坡度、雨水管和清洗排水复核。", position: { x: 72, y: 115, rotation: 0 }, color: "#62686b" }
];

const materialByAsset = {
  bed: ["creamFabric", "beigeFabric", "camelFabric"], nightstand: ["warmOak", "travertine", "brushedBronze"], wardrobe: ["warmOak", "honeyWood", "brushedBronze"], walkInCloset: ["warmOak", "smokedGlass", "warmLightEmissive"], cabinet: ["warmOak", "smokedGlass", "brushedBronze"], desk: ["warmOak", "creamFabric", "brushedBronze"], bathroomVanity: ["travertine", "warmOak", "brushedBronze"], toilet: ["warmWhiteCeramic", "brushedBronze", "warmGreyStone"], bathtub: ["warmWhiteCeramic", "brushedBronze", "warmGreyStone"], shower: ["clearGlass", "blackTitanium", "brushedBronze"], sofa: ["creamFabric", "warmOak", "taupeFabric"], coffeeTable: ["travertine", "blackTitanium", "brushedBronze"], diningTable: ["warmOak", "travertine", "brushedBronze"], diningChair: ["beigeFabric", "warmOak", "brushedBronze"], kitchenCabinet: ["warmOak", "warmGreyStone", "brushedBronze"], island: ["microCement", "travertine", "brushedBronze"], sideboard: ["walnut", "smokedGlass", "warmLightEmissive"], entryCabinet: ["warmOak", "smokedGlass", "warmLightEmissive"], fireplace: ["travertine", "microCement", "blackTitanium"], paving: ["warmGreyStone", "microCement", "blackTitanium"], yardModule: ["warmOak", "warmGreyStone", "blackTitanium"], sink: ["warmGreyStone", "brushedBronze", "clearGlass"], cooktop: ["blackTitanium", "warmGreyStone", "brushedBronze"], fridge: ["warmGreyStone", "blackTitanium", "warmOak"], pegboard: ["warmOak", "blackTitanium", "brushedBronze"], bookshelf: ["warmOak", "smokedGlass", "warmLightEmissive"], snackCabinet: ["warmOak", "smokedGlass", "brushedBronze"], plant: ["plantSoftGreen", "travertine", "warmOak"], generic: ["warmOak", "warmGreyStone", "blackTitanium"]
};

const source = await fs.readFile("lib/render3d-assets.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const tempModule = "/tmp/render3d-assets-five-level.mjs";
await fs.writeFile(tempModule, compiled);
const rules = await import(`file://${tempModule}?v=${Date.now()}`);

const byId = new Map(workspace.furniture.map((item) => [item.id, item]));
for (const item of newFurniture) if (!byId.has(item.id)) byId.set(item.id, item);

const diningTable = byId.get("furn-table-001");
if (diningTable) Object.assign(diningTable, { roomId: "ROOM-1F-005", position: { x: 65, y: 56, rotation: 0 }, material: "浅橡木圆桌 + 洞石转盘 + 6 把米灰餐椅" });
const b1Wardrobe = byId.get("furn-b1-room-seasonal-wardrobe-001");
if (b1Wardrobe) Object.assign(b1Wardrobe, { position: { x: 76.6, y: 19.3, rotation: 90 }, dimensions: { ...b1Wardrobe.dimensions, width: 270, depth: 60, height: 240 } });
const yardTree = byId.get("furn-plant-001");
if (yardTree) Object.assign(yardTree, { position: { x: 78, y: -7, rotation: 0 } });

workspace.furniture = Array.from(byId.values()).map((item) => {
  const enriched = rules.enrichFurniture3DMeta(item);
  const assetType = rules.infer3DAssetType(enriched);
  const materials = materialByAsset[assetType] ?? materialByAsset.generic;
  const next = {
    ...enriched,
    constructionMeta: {
      ...enriched.constructionMeta,
      reserveSize: `${enriched.dimensions.width}x${enriched.dimensions.depth}x${enriched.dimensions.height}cm`
    },
    render3d: {
      ...enriched.render3d,
      assetType,
      detailLevel: "presentation",
      stylePreset: "elevatedTuscanSun",
      primaryMaterial: materials[0],
      secondaryMaterial: materials[1],
      accentMaterial: materials[2],
      visibleIn3d: true,
      selectableIn3d: true,
      childrenMode: "merged"
    }
  };
  if (item.id === "ph-1f-south-water-tap") next.mepMeta = { ...next.mepMeta, needsWaterSupply: true, waterSupplyType: "cold", needsDrainage: false, drainageType: "none" };
  if (item.id === "ph-1f-south-drain-point") next.mepMeta = { ...next.mepMeta, needsDrainage: true, drainageType: "floorDrain", needsWaterSupply: false, waterSupplyType: "none" };
  if (item.id === "ph-1f-south-outdoor-cabinet") next.mepMeta = { ...next.mepMeta, needsSocket: true, socketCount: 2, needsWaterSupply: true, waterSupplyType: "cold", needsDrainage: true, drainageType: "cabinetDrain" };
  if (item.id === "ph-1f-south-yard-light") next.mepMeta = { ...next.mepMeta, needsSwitch: true, needsLighting: true, lightingType: "decorative", lightColorTemperature: "3000K" };
  if (["ph-1f-south-yard-light", "ph-1f-north-outdoor-socket", "ph-1f-south-outdoor-cabinet", "ph-1f-south-water-tap", "ph-1f-south-drain-point"].includes(item.id)) next.constructionMeta = { ...next.constructionMeta, waterproofRequired: true, purchaseCategory: item.id.includes("outdoor-cabinet") ? "户外柜" : "庭院设备" };
  if (item.id === "ph-1f-south-outdoor-cabinet") next.constructionMeta = { ...next.constructionMeta, customMade: true, installType: "customCabinet", supplierType: "户外定制柜供应商", inspectionAccessRequired: true };
  if (item.id === "ph-1f-south-drain-point") next.mepMeta = { ...next.mepMeta, needsSocket: false, socketCount: 0, socketHeight: 0, relatedCircuit: undefined };
  return next;
});

workspace.cameraViews = cameraViews;
workspace.savedAt = new Date().toISOString();
workspace.defaultWorkspaceRevision = "2026-07-10-five-level-presentation-v1";
await fs.writeFile(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);
console.log(JSON.stringify({ furniture: workspace.furniture.length, cameraViews: workspace.cameraViews.length, revision: workspace.defaultWorkspaceRevision }));
