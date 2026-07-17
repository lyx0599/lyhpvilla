import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncRelatedDrawingItemsToFurniture } from "../lib/furniture-placement.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260718-before-b2-tv-wall.json");
if (!fs.existsSync(backupPath)) fs.copyFileSync(workspacePath, backupPath);

const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const structure = workspace.houseStructuresByFloor.B2;
const now = new Date().toISOString();
const byId = (id) => {
  const item = workspace.furniture.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing furniture: ${id}`);
  return item;
};
const setPositionMm = (item, xMm, yMm, rotation) => {
  item.position = { x: xMm / 120, y: yMm / 90, rotation };
};

const storageWall = byId("furn-b2-living-tv-console-001");
storageWall.name = "B2 W-B2-001 带收纳电视墙";
storageWall.type = "cabinet";
storageWall.catalogId = "living-storage-tv-wall";
storageWall.dimensions = { width: 360, depth: 42, height: 240, unit: "cm" };
setPositionMm(storageWall, 5640, 580, 0);
storageWall.material = "暖橡木高柜 + 暖白电视背板 + 悬浮影音低柜 + 玻璃展示格";
storageWall.note = "W-B2-001 做 3.6m 宽收纳电视墙：中央留出完整 100 寸电视位，左侧封闭高柜、右侧玻璃展示柜、下方悬浮影音低柜。";
storageWall.constructionNote = "中央净空按 100 寸 16:9 屏幕约 2214x1245mm 控制；低柜承担主机、音响、手柄和弱电设备散热，高柜固定防倾倒。";
storageWall.render3d = {
  ...storageWall.render3d,
  assetType: "cabinet",
  variantId: "b2StorageTvWall",
  detailLevel: "presentation",
  childrenMode: "grouped",
  primaryMaterial: "warmOak",
  secondaryMaterial: "warmWhiteCeramic",
  accentMaterial: "blackTitanium",
  elevationMm: 0,
  cabinetVisual: {
    frontStyle: "slab",
    handleStyle: "edgePull",
    glassTone: "clear",
    allDoorPanels: false,
    layout: "panels",
    displayContents: true,
    interiorLighting: true
  }
};
storageWall.cabinetDesign = {
  template: "cabinet",
  title: "B2 带收纳的 100 寸电视墙",
  designThinking: "让电视是绝对视觉中心，收纳分散到左右高柜和下方悬浮低柜，避免整面墙看起来像一排大柜门。",
  recommendedPlacement: "贴 W-B2-001 居中，100 寸屏幕中心对准长沙发。",
  layoutNotes: ["左侧 600mm 左右封闭高柜", "中央 100 寸屏幕净空", "右侧玻璃展示格", "下方悬浮影音低柜和开放散热位"],
  zones: [
    { id: "closed-storage", label: "封闭高柜", role: "游戏配件 / 囤货", widthPercent: 18, heightPercent: 100, detail: "分层封闭收纳，减少杂物外露。" },
    { id: "tv-center", label: "100寸电视位", role: "观影 / 游戏", widthPercent: 64, heightPercent: 70, detail: "完整黑色屏幕，不用柜门或玻璃柜替代。" },
    { id: "display-storage", label: "展示高柜", role: "模型 / 收藏", widthPercent: 18, heightPercent: 100, detail: "玻璃门与暖光层板减轻高柜体量。" },
    { id: "av-console", label: "悬浮影音低柜", role: "主机 / 音响 / 弱电", widthPercent: 80, heightPercent: 20, detail: "中央开放散热，两侧抽屉收手柄和线材。" }
  ],
  cautionNotes: ["电视散热和检修口不可被背板封死", "100 寸电视安装基层、线管和插座必须提前定位"]
};
storageWall.constructionMeta.reserveSize = "360x42x240cm";
storageWall.constructionMeta.notes = storageWall.constructionNote;
storageWall.mepMeta.notes = storageWall.constructionNote;

const television = byId("furn-b2-living-large-tv-001");
television.name = "B2 客厅 100寸大屏幕电视";
television.type = "custom";
television.dimensions = { width: 221.4, depth: 6, height: 124.5, unit: "cm" };
setPositionMm(television, 5640, 815, 0);
television.material = "100 寸 16:9 超薄黑色电视 + 窄边金属框";
television.note = "真实独立电视屏幕，约 2214x1245mm，居中安装在收纳电视墙中央，正对长沙发。";
television.constructionNote = "屏幕底边标高约 800mm；预留 100 寸电视专用安装基层、隐藏插座、网口、HDMI/光纤管和检修余量。";
television.render3d = {
  ...television.render3d,
  assetType: "generic",
  variantId: "tv100InchDisplay",
  detailLevel: "presentation",
  childrenMode: "grouped",
  primaryMaterial: "blackTitanium",
  secondaryMaterial: "smokedGlass",
  accentMaterial: "warmLightEmissive",
  elevationMm: 800,
  visibleIn3d: true,
  selectableIn3d: true
};
television.constructionMeta.reserveSize = "221.4x6x124.5cm";
television.constructionMeta.notes = television.constructionNote;
television.mepMeta.notes = television.constructionNote;

for (const item of [storageWall, television]) {
  workspace.drawingItems = syncRelatedDrawingItemsToFurniture(workspace.drawingItems, item, structure, { moveUntouchedGenerated: true, markReviewed: true });
}
if (workspace.drawingPackage?.drawingItemIds) workspace.drawingPackage.drawingItemIds = workspace.drawingItems.map((item) => item.id);

workspace.defaultWorkspaceRevision = "2026-07-18-b2-storage-tv-wall-v1";
workspace.savedAt = now;
workspace.updatedAt = now;
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  revision: workspace.defaultWorkspaceRevision,
  storageWall: { dimensions: storageWall.dimensions, variant: storageWall.render3d.variantId },
  television: { dimensions: television.dimensions, variant: television.render3d.variantId, elevationMm: television.render3d.elevationMm }
}, null, 2));
