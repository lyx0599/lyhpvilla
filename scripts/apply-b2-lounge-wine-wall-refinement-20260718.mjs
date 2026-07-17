import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspacePath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-before-b2-lounge-wine-wall-20260718.json");
const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));

if (!fs.existsSync(backupPath)) {
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(workspacePath, backupPath);
}

const byId = (id) => workspace.furniture.find((item) => item.id === id);
const upsert = (item) => {
  const index = workspace.furniture.findIndex((candidate) => candidate.id === item.id);
  if (index >= 0) workspace.furniture[index] = { ...workspace.furniture[index], ...item };
  else workspace.furniture.push(item);
};
const noService = { water: false, drainage: false, power: false, exhaust: false };
const powerOnly = { water: false, drainage: false, power: true, exhaust: false };
const wetService = { water: true, drainage: true, power: true, exhaust: false };
const manualRender = (assetType, variantId, materials) => ({
  assetType,
  variantId,
  detailLevel: "presentation",
  stylePreset: "modernNatural",
  primaryMaterial: materials[0],
  secondaryMaterial: materials[1],
  accentMaterial: materials[2],
  visibleIn3d: true,
  selectableIn3d: true,
  childrenMode: "grouped",
  styleSource: "manual",
  styleLocked: true
});
const stableSeed = (id) => {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const sofa = byId("furn-b2-living-long-sofa-001");
if (!sofa) throw new Error("Missing B2 sofa");
Object.assign(sofa, {
  name: "B2 客厅棕色真皮贵妃沙发",
  dimensions: { width: 360, depth: 105, height: 80, unit: "cm" },
  material: "棕色头层真皮 + 单侧贵妃榻 + 深棕皮革滚边",
  note: "棕色真皮 L 型组合沙发，单侧贵妃榻朝向电视墙；后方保留去书房和活动区的通道。",
  color: "#7b4428",
  render3d: manualRender("sofa", "sectionalLShape", ["cognacLeather", "cognacLeather", "darkBrownLeather"])
});

upsert({
  id: "furn-b2-living-coffee-table-001",
  code: "CT-B2-01",
  name: "B2 客厅透明玻璃茶几",
  type: "table",
  moduleCategory: "living",
  moduleType: "table",
  floorId: "B2",
  roomId: "ROOM-B2-001",
  dimensions: { width: 120, depth: 70, height: 38, unit: "cm" },
  material: "双层低铁透明玻璃 + 黑钛金属细框",
  note: "位于真皮沙发与 100 寸电视之间，通透材质减轻大尺度客厅的体量感。",
  constructionNote: "茶几到沙发前沿保留约 500mm，四角倒圆并使用钢化玻璃。",
  serviceRequirements: noService,
  position: { x: 47.9166666667, y: 28.3333333333, rotation: 0 },
  color: "#c9e7e8",
  render3d: manualRender("coffeeTable", "clearGlassTop", ["clearGlass", "smokedGlass", "blackTitanium"])
});

const slabTable = byId("furn-b2-study-slab-table-001");
if (!slabTable) throw new Error("Missing B2 slab table");
Object.assign(slabTable, {
  name: "B2 书房 2.3m 实木大板桌",
  dimensions: { width: 230, depth: 80, height: 80, unit: "cm" },
  material: "整块实木大板桌面 + 黑钛金属桌脚",
  note: "按真实 2300×800×800mm 落位，桌面长边南北向，保留纪念柜和酒水墙之间的通行。",
  constructionNote: "桌边预留地插或墙插，南端避开新增酒水墙操作区。",
  position: { x: 25, y: 68.6111111111, rotation: 90 },
  render3d: manualRender("slabTable", "rectTimber", ["warmOak", "blackTitanium", "brushedBronze"])
});

upsert({
  id: "furn-b2-study-wine-cabinet-001",
  code: "WC-B2-01",
  name: "B2 书房酒收纳柜",
  type: "cabinet",
  moduleCategory: "storage",
  moduleType: "cabinet",
  floorId: "B2",
  roomId: "ROOM-B2-005",
  dimensions: { width: 80, depth: 40, height: 210, unit: "cm" },
  material: "深胡桃木酒格 + 玻璃展示面 + 暖光层板",
  note: "布置在书房南侧空墙最左端，方格横放酒瓶，下部封闭柜收纳酒具与备品。",
  constructionNote: "柜体固定防倾倒，内部预留低压灯带电源并保持通风。",
  serviceRequirements: powerOnly,
  position: { x: 35.8333333333, y: 84.2222222222, rotation: 180 },
  color: "#6b4935",
  hostWallId: "W-B2-011",
  render3d: manualRender("cabinet", "b2WineStorageCabinet", ["walnut", "smokedGlass", "brushedBronze"])
});

upsert({
  id: "furn-b2-study-handwash-001",
  code: "HW-B2-01",
  name: "B2 书房迷你洗手台",
  type: "vanity",
  moduleCategory: "bath",
  moduleType: "vanity",
  floorId: "B2",
  roomId: "ROOM-B2-005",
  dimensions: { width: 55, depth: 40, height: 85, unit: "cm" },
  material: "暖木悬浮柜 + 一体式小台盆 + 古铜龙头",
  note: "紧邻酒柜设置，供洗手、洗杯和简单清洁使用，不设置镜柜。",
  constructionNote: "预留冷热水与墙排，台面和墙面交接处做防水收口。",
  serviceRequirements: wetService,
  position: { x: 41.5, y: 84.2222222222, rotation: 180 },
  color: "#d8d1c6",
  hostWallId: "W-B2-011",
  render3d: {
    ...manualRender("bathroomVanity", "floating", ["warmOak", "travertine", "brushedBronze"]),
    wetAreaVisual: { fixtureKind: "vanity", basinCount: 1, floating: true, mirrorStyle: "none", frameFinish: "bronze", mirrorHeightMm: 0, mirrorCabinetDepthMm: 0 }
  },
  mepMeta: {
    needsSocket: false, socketCount: 0, needsSwitch: false, switchControl: [], needsLighting: false,
    needsWaterSupply: true, waterSupplyType: "hotCold", needsDrainage: true, drainageType: "cabinetDrain",
    needsNetwork: false, needsVentilation: false, needsSmartControl: false, relatedCircuit: "防溅/防水回路",
    notes: "供洗手和洗杯使用，墙排优先，不设置镜柜。"
  }
});

upsert({
  id: "furn-b2-study-water-dispenser-001",
  code: "WD-B2-01",
  name: "B2 书房直饮水机",
  type: "custom",
  moduleCategory: "appliance",
  floorId: "B2",
  roomId: "ROOM-B2-005",
  dimensions: { width: 40, depth: 36, height: 125, unit: "cm" },
  material: "暖白机身 + 黑色触控面板 + 冷热直饮龙头",
  note: "位于洗手台右侧，提供常温、冷水与热水，形成完整的书房酒水角。",
  constructionNote: "预留净水进水、排水和独立五孔插座，设备两侧保留散热检修缝。",
  serviceRequirements: wetService,
  position: { x: 45.9166666667, y: 84.2222222222, rotation: 180 },
  color: "#f2efe8",
  hostWallId: "W-B2-011",
  render3d: manualRender("generic", "b2DrinkingWaterStation", ["warmWhiteCeramic", "smokedGlass", "brushedBronze"]),
  mepMeta: {
    needsSocket: true, socketCount: 1, socketHeight: 500, needsSwitch: false, switchControl: [], needsLighting: false,
    needsWaterSupply: true, waterSupplyType: "cold", needsDrainage: true, drainageType: "equipmentDrain",
    needsNetwork: false, needsVentilation: false, needsSmartControl: false, relatedCircuit: "厨房/水吧小家电回路",
    notes: "净水进水、设备排水和插座集中在设备背后可检修区。"
  }
});

workspace.revision = "2026-07-18-b2-leather-lounge-wine-wall-v1";
workspace.updatedAt = new Date().toISOString();
for (const id of [
  "furn-b2-living-long-sofa-001",
  "furn-b2-living-coffee-table-001",
  "furn-b2-study-slab-table-001",
  "furn-b2-study-wine-cabinet-001",
  "furn-b2-study-handwash-001",
  "furn-b2-study-water-dispenser-001"
]) {
  const item = byId(id);
  if (item?.render3d) item.render3d.variationSeed = stableSeed(id);
}
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  revision: workspace.revision,
  sofa: sofa.dimensions,
  coffeeTable: byId("furn-b2-living-coffee-table-001")?.dimensions,
  slabTable: slabTable.dimensions,
  wineWall: ["furn-b2-study-wine-cabinet-001", "furn-b2-study-handwash-001", "furn-b2-study-water-dispenser-001"].map((id) => byId(id)?.name)
}, null, 2));
