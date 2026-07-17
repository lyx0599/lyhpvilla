import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncRelatedDrawingItemsToFurniture } from "../lib/furniture-placement.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260717-before-model-refinement.json");

if (!fs.existsSync(backupPath)) fs.copyFileSync(workspacePath, backupPath);

const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const now = new Date().toISOString();
const structures = workspace.houseStructuresByFloor;

function byId(items, id, label) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing ${label}: ${id}`);
  return item;
}

function furniture(id) {
  return byId(workspace.furniture, id, "furniture");
}

function setPositionMm(item, xMm, yMm, rotation = item.position.rotation) {
  item.position = { x: xMm / 120, y: yMm / 90, rotation };
}

function bindWall(item, wallId) {
  item.hostWallId = wallId;
  item.constructionMeta = {
    ...item.constructionMeta,
    wallDependency: `绑定 ${wallId}，安装前按墙面完成面复尺并复核收口。`
  };
}

function removeFurniture(...ids) {
  const removed = new Set(ids);
  workspace.furniture = workspace.furniture.filter((item) => !removed.has(item.id));
  workspace.drawingItems = workspace.drawingItems.filter((item) => !item.relatedFurnitureId || !removed.has(item.relatedFurnitureId));
}

// 1F: remove Window 005, open the full kitchen sliding-door bay and restore the wall-mounted water bar set.
structures["1F"].windows = structures["1F"].windows.filter((item) => item.id !== "WIN-1F-005");
const kitchenSlidingDoor = byId(structures["1F"].doors, "D-1F-004", "door");
Object.assign(kitchenSlidingDoor, {
  name: "厨房 Wall 004–005 通长半透明玻璃移门",
  positionOnWall: 1149 / 4112,
  width: 2298,
  operation: "sliding",
  material: "translucentGlass",
  transparency: 0.45
});

const waterBar = furniture("furn-living-waterbar-001");
waterBar.dimensions.width = 140;
setPositionMm(waterBar, 9210, 4750, 90);
bindWall(waterBar, "W-1F-011");
waterBar.clearanceMeta = { ...waterBar.clearanceMeta, frontMm: 600, serviceMm: 600 };
waterBar.constructionMeta.reserveSize = "140x55x90cm";
waterBar.note = "贴 W-1F-011 布置；Window 005 取消后，该段墙面恢复为完整的咖啡、泡茶和杯具收纳区。";
waterBar.constructionNote = "预留净水/给水、排水、咖啡机和烧水设备插座；台面前方避开餐椅后退区，与上方吊柜同轴定位。";

let waterBarUpper = workspace.furniture.find((item) => item.id === "furn-living-waterbar-upper-001");
if (!waterBarUpper) {
  waterBarUpper = {
    id: "furn-living-waterbar-upper-001",
    code: "WBC-1F-01",
    name: "1F W-1F-011 水吧台吊柜",
    type: "cabinet",
    catalogId: "storage-sideboard",
    moduleCategory: "storage",
    moduleType: "cabinet",
    floorId: "1F",
    roomId: "ROOM-1F-005",
    dimensions: { width: 140, depth: 32, height: 80, unit: "cm" },
    cabinetHeight: { kind: "wall", source: "explicit" },
    material: "暖白吊柜 + 局部玻璃门 / 开放格 + 柜下灯带",
    note: "吊柜与水吧台同宽、同轴，收纳杯具、茶叶、咖啡豆和轻量展示品。",
    constructionNote: "绑定 W-1F-011，柜体下沿 1450mm；确认墙体基层承重、灯带电源和台面插座避让。",
    serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
    position: { x: 9325 / 120, y: 4750 / 90, rotation: 90 },
    color: "#f0e7d8",
    cabinetDesign: {
      template: "cabinet",
      title: "W-1F-011 水吧台吊柜",
      designThinking: "将常用杯具与咖啡、茶饮小物收纳在台面正上方，保持水吧台操作面整洁。",
      recommendedPlacement: "贴 W-1F-011，与下柜中心线对齐，下沿标高 1450mm。",
      layoutNotes: ["下沿到台面净高 550mm", "局部玻璃门展示杯具", "柜下设 3000K 灯带"],
      zones: [
        { id: "daily-cups", label: "常用杯具", role: "杯子 / 茶具", widthPercent: 42, heightPercent: 100, detail: "放在最顺手的中低段。" },
        { id: "coffee-tea", label: "咖啡茶饮", role: "咖啡豆 / 茶叶", widthPercent: 34, heightPercent: 100, detail: "封闭收纳，避光防潮。" },
        { id: "display", label: "展示格", role: "轻量展示", widthPercent: 24, heightPercent: 100, detail: "玻璃门或开放格，不放重物。", serviceNote: "柜下灯带电源藏于柜内可检修位。" }
      ],
      cautionNotes: ["墙体基层必须满足吊柜承重。", "柜下灯带、台面插座与净饮设备线路需统一深化。"]
    },
    render3d: {
      assetType: "wallCabinet",
      detailLevel: "presentation",
      stylePreset: "modernNatural",
      primaryMaterial: "warmOak",
      secondaryMaterial: "smokedGlass",
      accentMaterial: "brushedBronze",
      visibleIn3d: true,
      selectableIn3d: true,
      childrenMode: "grouped",
      variantId: "glassDisplay",
      variationSeed: 3401117001,
      styleSource: "generated",
      elevationMm: 1450,
      kitchenVisual: {
        cabinetKind: "wall",
        doorCount: 3,
        drawerCount: 0,
        frontStyle: "glass",
        handleStyle: "edgePull",
        panelGapMm: 3,
        endPanelThicknessMm: 20,
        showInternalShadowGap: true
      }
    },
    mepMeta: {
      needsSocket: true,
      socketCount: 1,
      socketHeight: 2200,
      needsSwitch: true,
      switchControl: ["柜下灯带"],
      needsLighting: true,
      lightingType: "cabinetStrip",
      lightColorTemperature: "3000K",
      needsWaterSupply: false,
      waterSupplyType: "none",
      needsDrainage: false,
      drainageType: "none",
      needsNetwork: false,
      needsVentilation: false,
      needsSmartControl: false,
      relatedCircuit: "常规插座回路",
      notes: "柜下灯带和柜内电源需保留可检修路径。"
    },
    constructionMeta: {
      customMade: true,
      installType: "wallMounted",
      reserveSize: "160x32x80cm",
      wallDependency: "绑定 W-1F-011，安装前按墙面完成面复尺并复核收口。",
      floorDependency: "",
      ceilingDependency: "柜顶与吊顶、灯带电源及检修空间协同",
      waterproofRequired: false,
      inspectionAccessRequired: true,
      purchaseCategory: "定制柜体/硬装",
      supplierType: "全屋定制/木作供应商",
      notes: "柜体下沿 1450mm，柜下净高 550mm。"
    },
    constructionAnchors: {
      points: [
        { id: "waterbar-upper-power", type: "power", label: "吊柜灯带电源", positionMm: { x: 620, y: 2200, z: -145 }, installationHeightMm: 2200 }
      ],
      installationHeightMm: 1450,
      notes: "吊柜电源点与柜体位置同步。"
    },
    hostWallId: "W-1F-011",
    clearanceMeta: { frontMm: 600, serviceMm: 300 }
  };
  const waterBarIndex = workspace.furniture.findIndex((item) => item.id === waterBar.id);
  workspace.furniture.splice(waterBarIndex + 1, 0, waterBarUpper);
}
waterBarUpper.dimensions.width = 140;
setPositionMm(waterBarUpper, 9325, 4750, 90);
bindWall(waterBarUpper, "W-1F-011");
waterBarUpper.render3d = { ...waterBarUpper.render3d, assetType: "wallCabinet", elevationMm: 1450 };
waterBarUpper.clearanceMeta = { ...waterBarUpper.clearanceMeta, frontMm: 600, serviceMm: 300 };
waterBarUpper.constructionMeta.reserveSize = "140x32x80cm";

const snackCabinet = furniture("furn-living-snack-pullout-001");
setPositionMm(snackCabinet, 9330, 7000, 90);
bindWall(snackCabinet, "W-1F-011");
snackCabinet.note = "厨房移门扩展为 Wall 004–005 通长开口后，零食柜改放到 W-1F-011 南段，避开移门、卫生间门及水吧台。";
snackCabinet.constructionNote = "贴 W-1F-011 南段浅柜布置，与水吧台保留约 950mm 分隔；抽拉面朝客厅，复核餐椅后退与南侧窗帘边界。";
snackCabinet.clearanceMeta = { ...snackCabinet.clearanceMeta, frontMm: 400 };

const fireplace = furniture("furn-living-fireplace-south-001");
fireplace.material = "暖灰洞石 + 浅橡木 + 黑钛耐热玻璃 + 电子雾化火焰芯";
fireplace.note = "贴 W-1F-013 的电视壁炉组合墙；壁炉火箱、仿真木柴、余烬和暖色火苗作为主视觉，避免只读成电视柜。";

// Remove the 1F central coffee table while retaining the small sofa-side table.
removeFurniture("furn-1f-living-coffee-table-001");

// 2F: turn the master bed toward its host wall, swap the east-wall cabinets, and restore the full Wall 005 closet run.
const masterBed = furniture("furn-2f-master-bedroom-bed-001");
setPositionMm(masterBed, 7542, 6440, 270);
bindWall(masterBed, "W-2F-016");
masterBed.note = "床头转向并贴 W-2F-016 布置，在原中心位置上整体旋转 180°，床身向东伸入主卧。";

const masterWardrobe = furniture("furn-2f-master-bedroom-large-wardrobe-001");
setPositionMm(masterWardrobe, 9190, 6500, 90);
bindWall(masterWardrobe, "W-2F-011");
masterWardrobe.note = "与原五斗柜区位对调，整墙大衣柜改放在 W-2F-011 南段，与床尾保持可见间距。";

const masterChest = furniture("furn-2f-master-bedroom-chest-001");
setPositionMm(masterChest, 9260, 4510, 90);
bindWall(masterChest, "W-2F-011");
masterChest.name = "主卧 W-2F-011 北段五斗柜";
masterChest.note = "与原整墙大衣柜区位对调，五斗柜改放在 W-2F-011 北段，保留入口视线和上方墙面。";

const masterRug = furniture("furn-2f-master-rug-001");
setPositionMm(masterRug, 7600, 6440, 270);

const cloakRight = furniture("module-2f-cloak-right");
cloakRight.dimensions.width = 258;
setPositionMm(cloakRight, 7370, 1700, 90);
bindWall(cloakRight, "W-2F-005");
cloakRight.note = "沿 W-2F-005 恢复为 2580mm 满墙柜体，以挂衣、包包展示和被褥收纳为主。";
cloakRight.constructionNote = "沿 W-2F-005 从南北端各退约 60mm 通长布置；按 600mm 深度复核中间通道、柜内灯带和墙体基层。";
cloakRight.constructionMeta.reserveSize = "258x60x240cm";
cloakRight.mepMeta.notes = cloakRight.constructionNote;

const closetDesk = furniture("module-2f-window-desk");
setPositionMm(closetDesk, 6500, 650, 0);
bindWall(closetDesk, "W-2F-002");
closetDesk.note = "保留在衣帽间靠窗位置，向西微调 94mm，避开 W-2F-005 满墙柜端头。";

// B1: remove the activity-area sofa.
removeFurniture("furn-b1-lounge-chair-001");

// B2: face the long sofa toward W-B2-001, park the movable table behind it, and remove divider/mat objects.
const b2Sofa = furniture("furn-b2-living-long-sofa-001");
setPositionMm(b2Sofa, 7200, 4675, 180);
b2Sofa.note = "长沙发正面朝向 W-B2-001 电视柜和大屏；删除玄关隔断后，从车库小门到客厅的进入视线更直接。";
b2Sofa.constructionNote = "沙发左侧保持不少于 1200mm 主通道；侧边五孔插座和落地灯电源位置不变。";

const b2CoffeeTable = furniture("furn-b2-living-coffee-table-001");
setPositionMm(b2CoffeeTable, 8500, 6000, 0);
b2CoffeeTable.roomId = "ROOM-B2-003";
b2CoffeeTable.name = "B2 活动区侧后方停放茶几";
b2CoffeeTable.note = "从长沙发与电视柜的正面观影区移开，暂放在沙发后侧的活动区边缘。";
b2CoffeeTable.constructionNote = "作为可移动成品茶几，不设固定机电点位；保持电视柜与长沙发之间的完整净空。";
b2CoffeeTable.mepMeta.notes = b2CoffeeTable.constructionNote;
b2CoffeeTable.constructionMeta.notes = b2CoffeeTable.constructionNote;
removeFurniture("furn-b2-entry-divider-001", "furn-b2-activity-flex-mat-001");

const b2ActivityView = workspace.cameraViews.find((view) => view.id === "view-b2-activity");
if (b2ActivityView) b2ActivityView.description = "展示无软垫的活动留白、户外用品收纳与挑空边界。";
const fireplaceView = workspace.cameraViews.find((view) => view.id === "view-1f-fireplace");
if (fireplaceView) fireplaceView.description = "从客厅内部正看电视、独立火箱、仿真木柴与明显暖色火苗的一体化关系。";

for (const item of [waterBar, waterBarUpper, snackCabinet, masterBed, masterWardrobe, masterChest, masterRug, cloakRight, closetDesk, b2Sofa, b2CoffeeTable]) {
  const structure = structures[item.floorId];
  if (!structure) continue;
  workspace.drawingItems = syncRelatedDrawingItemsToFurniture(workspace.drawingItems, item, structure, {
    moveUntouchedGenerated: true,
    markReviewed: true
  });
}

workspace.defaultWorkspaceRevision = "2026-07-17-model-refinement-v2";
workspace.savedAt = now;
workspace.updatedAt = now;
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  revision: workspace.defaultWorkspaceRevision,
  furnitureCount: workspace.furniture.length,
  removedWindow: !structures["1F"].windows.some((item) => item.id === "WIN-1F-005"),
  kitchenSlidingDoorWidthMm: kitchenSlidingDoor.width,
  restoredWaterBarUpper: workspace.furniture.some((item) => item.id === "furn-living-waterbar-upper-001"),
  masterBedRotationDeg: masterBed.position.rotation,
  wall005ClosetWidthMm: cloakRight.dimensions.width * 10,
  b2SofaRotationDeg: b2Sofa.position.rotation
}, null, 2));
