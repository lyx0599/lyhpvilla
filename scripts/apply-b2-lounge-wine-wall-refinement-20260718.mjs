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

// 2026-08-02 cabinet revision: dedicated large-LEGO display, integrated corner water bar, and full study wine wall.
upsert({
  id: "furn-b2-study-lego-display-001",
  code: "LC-B2-01",
  name: "B2 书房双层乐高展示柜",
  type: "cabinet",
  moduleCategory: "storage",
  moduleType: "bookshelf",
  floorId: "B2",
  roomId: "ROOM-B2-005",
  dimensions: { width: 88, depth: 68, height: 130, unit: "cm" },
  material: "暖橡木柜体 + 超白玻璃门 + 加厚承重层板 + 低压暖光灯带",
  note: "设在透明玻璃纪念柜侧面，独立两层展示：上层放 71043 霍格沃茨城堡，下层放 10276 罗马斗兽场。",
  constructionNote: "外尺寸 880x680x1300mm；上层净空不小于 780x520x680mm，下层净空不小于 650x650x380mm，层板承重按大型乐高模型复核。",
  serviceRequirements: powerOnly,
  position: { x: 23, y: 82.8888888889, rotation: 180 },
  color: "#d6c1a3",
  hostWallId: "W-B2-010",
  render3d: manualRender("bookshelf", "b2LegoDisplayCabinet", ["warmOak", "clearGlass", "brushedBronze"])
});

Object.assign(byId("furn-b2-study-souvenir-cabinet-001"), {
  dimensions: { width: 260, depth: 68, height: 220, unit: "cm" },
  note: "柜内直接设置两层大型乐高展位：上层放 71043 霍格沃茨城堡，下层放 10276 罗马斗兽场；其余格位继续展示旅行纪念品。",
  constructionNote: "柜深加至 680mm；霍格沃茨层净空不小于 780x520x680mm，斗兽场层净空不小于 650x650x380mm，玻璃门、承重层板及灯带统一定制。",
  render3d: {
    ...manualRender("bookshelf", "b2MemorialLegoDisplay", ["warmOak", "clearGlass", "blackTitanium"]),
    cabinetVisual: { frontStyle: "glass", handleStyle: "knob", glassTone: "clear", allDoorPanels: true, layout: "squareGrid", gridColumns: 5, gridRows: 4, displayContents: true, interiorLighting: true }
  }
});

Object.assign(byId("furn-b2-study-wine-cabinet-001"), {
  name: "B2 书房整墙酒收纳柜",
  dimensions: { width: 185, depth: 45, height: 240, unit: "cm" },
  material: "通墙深胡桃木酒格 + 烟灰玻璃展示门 + 暖光层板 + 下部封闭酒具柜",
  note: "向左扩展并占满书房 W-B2-011 墙段，整墙设置横放酒瓶格、立放展示格与下部封闭收纳。",
  constructionNote: "按 W-B2-011 书房侧 1850mm 墙段满墙复尺定制，柜体到顶收口、防倾倒固定，预留低压灯带电源与通风缝。",
  position: { x: 40.1958333333, y: 84.1666666667, rotation: 180 }
});

Object.assign(byId("furn-b2-study-handwash-001"), {
  name: "B2 书房转角迷你水吧",
  dimensions: { width: 120, depth: 55, height: 95, unit: "cm" },
  material: "暖橡木水吧柜 + 洞石台面 + 小水槽 + 独立直饮龙头 + 杯具开放格",
  note: "移到书房左侧 W-B2-008 与 W-B2-010 转角，集洗手、洗杯、常温直饮和热饮取水于一体。",
  constructionNote: "1200mm 转角小水吧，预留冷热水、墙排、净水进水、设备排水及两组防溅插座；台下设置净水主机与即热设备检修位。",
  position: { x: 12.9166666667, y: 83.6111111111, rotation: 180 },
  hostWallId: "W-B2-010",
  render3d: {
    ...manualRender("bathroomVanity", "b2MiniWaterBar", ["warmOak", "travertine", "brushedBronze"]),
    wetAreaVisual: { fixtureKind: "vanity", basinCount: 1, floating: false, mirrorStyle: "none", frameFinish: "bronze", mirrorHeightMm: 0, mirrorCabinetDepthMm: 0 }
  },
  mepMeta: {
    needsSocket: true, socketCount: 2, socketHeight: 1100, needsSwitch: false, switchControl: [], needsLighting: false,
    needsWaterSupply: true, waterSupplyType: "hotCold", needsDrainage: true, drainageType: "cabinetDrain",
    needsNetwork: false, needsVentilation: false, needsSmartControl: false, relatedCircuit: "水吧小家电/防溅回路",
    notes: "集成洗手、洗杯与直饮功能；台下净水主机和即热设备必须保留可拆检修口。"
  }
});

workspace.furniture = workspace.furniture.filter((item) => !["furn-b2-study-water-dispenser-001", "furn-b2-study-lego-display-001"].includes(item.id));

workspace.revision = "2026-08-02-b2-cabinet-wall-v2";
workspace.updatedAt = new Date().toISOString();
for (const id of [
  "furn-b2-living-long-sofa-001",
  "furn-b2-living-coffee-table-001",
  "furn-b2-study-slab-table-001",
  "furn-b2-study-wine-cabinet-001",
  "furn-b2-study-handwash-001"
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
  cabinetWall: ["furn-b2-study-souvenir-cabinet-001", "furn-b2-study-handwash-001", "furn-b2-study-wine-cabinet-001"].map((id) => byId(id)?.name)
}, null, 2));
