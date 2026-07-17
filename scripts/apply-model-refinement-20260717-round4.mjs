import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncRelatedDrawingItemsToFurniture } from "../lib/furniture-placement.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260717-before-model-refinement-round4.json");
const round3BackupPath = path.join(root, "data/backups/default-workspace-20260717-before-model-refinement-round3.json");
if (!fs.existsSync(backupPath)) fs.copyFileSync(workspacePath, backupPath);

const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const round3Backup = JSON.parse(fs.readFileSync(round3BackupPath, "utf8"));
const structures = workspace.houseStructuresByFloor;
const now = new Date().toISOString();

function furniture(id) {
  const item = workspace.furniture.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing furniture: ${id}`);
  return item;
}

function setPositionMm(item, xMm, yMm, rotation = item.position.rotation) {
  item.position = { x: xMm / 120, y: yMm / 90, rotation };
}

function upsertFurniture(next) {
  const index = workspace.furniture.findIndex((item) => item.id === next.id);
  if (index >= 0) workspace.furniture[index] = next;
  else workspace.furniture.push(next);
  return next;
}

// 1. Restore a real prep counter beside the fridge, matching the 900 mm cooktop counter height.
const prepSource = round3Backup.furniture.find((item) => item.id === "furn-kitchen-u-right-run");
if (!prepSource) throw new Error("Round 3 backup does not contain the kitchen prep counter.");
const prepCounter = upsertFurniture(structuredClone(prepSource));
prepCounter.name = "冰箱旁同高备餐台";
prepCounter.dimensions = { width: 90, depth: 55, height: 90, unit: "cm" };
setPositionMm(prepCounter, 7296, 1250, 90);
prepCounter.note = "冰箱旁恢复 900mm 高备餐台，与灶台台面同高，用于冰箱取物后的临时放置和小电器操作。";
prepCounter.constructionNote = "台面完成高度 900mm，与灶台段齐平；南端避让冰箱开门，北端与水槽段顺接。";
prepCounter.constructionMeta.reserveSize = "90x55x90cm";
prepCounter.constructionMeta.notes = prepCounter.constructionNote;
prepCounter.mepMeta.notes = prepCounter.constructionNote;
prepCounter.render3d = {
  ...prepCounter.render3d,
  assetType: "kitchenCabinet",
  detailLevel: "presentation",
  variantId: "baseCabinet",
  kitchenVisual: {
    cabinetKind: "base",
    doorCount: 2,
    drawerCount: 1,
    countertopThicknessMm: 38,
    toeKickHeightMm: 90,
    frontStyle: "shaker",
    handleStyle: "edgePull",
    countertopEdge: "eased",
    panelGapMm: 3,
    endPanelThicknessMm: 22,
    showCountertopSeams: true,
    showInternalShadowGap: true
  }
};

// 2. Replace the entry pegboard with a 120 mm deep fluted-wood hanging rail.
const entryHanging = furniture("furn-entry-slim-hanging-001");
entryHanging.name = "W-1F-004 超薄木饰面挂衣区";
entryHanging.type = "entryCabinet";
entryHanging.catalogId = "storage-entry-cabinet";
entryHanging.moduleType = "entryCabinet";
entryHanging.hostWallId = "W-1F-004";
entryHanging.dimensions = { width: 120, depth: 12, height: 200, unit: "cm" };
entryHanging.material = "浅木竖向饰面 + 拉丝黄铜挂杆 + 折叠挂钩 + 弧角窄搁板";
entryHanging.note = "取消洞洞板，改为超薄竖向木饰面挂衣区；挂杆、折叠挂钩和上下窄搁板形成轻盈完整的入户立面。";
entryHanging.constructionNote = "总深度控制 120mm，贴 W-1F-004 固定；挂重外套的连接件必须落在结构基层。";
entryHanging.cabinetDesign = {
  ...(entryHanging.cabinetDesign ?? {}),
  template: "entryCabinet",
  title: "超薄木饰面挂衣区",
  designThinking: "用连续木饰面、细金属挂杆和少量折叠挂钩替代洞洞板，在不压缩玄关通道的前提下形成更完整的入户端景。",
  recommendedPlacement: "贴 W-1F-004 玄关侧墙，避开门扇和厨房入口。",
  layoutNotes: ["深度 120mm", "挂杆离墙足够挂轻薄外套", "上层放帽子香氛", "下层悬空搁板放随手包"],
  zones: [],
  cautionNotes: ["重衣挂点固定到基层", "不作为全季衣柜使用"]
};
entryHanging.render3d = { ...entryHanging.render3d, assetType: "entryCabinet", variantId: "slimHangingRail", primaryMaterial: "warmOak", secondaryMaterial: "creamFabric", accentMaterial: "brushedBronze", childrenMode: "grouped", detailLevel: "presentation" };
entryHanging.constructionMeta.reserveSize = "120x12x200cm";
entryHanging.constructionMeta.notes = entryHanging.constructionNote;

// 3–4. Give the 1F bedroom a visible headboard, two nightstands, and an inward-opening bay window.
const oneFloorBed = furniture("module-1f-bed-002");
oneFloorBed.name = "1F 卧室软包床头双人床";
setPositionMm(oneFloorBed, 2168, 6600, 270);
oneFloorBed.render3d = { ...oneFloorBed.render3d, variantId: "tallPanelHeadboard", detailLevel: "presentation", bedVisual: { headboardStyle: "upholsteredPanel", chargingNiche: false } };
oneFloorBed.note = "床头贴西墙布置，增加完整软包床头，并在两侧设置独立床头柜。";
oneFloorBed.constructionNote = "床头两侧预留双控、五孔和 USB-C；复核床头柜、衣柜门及飘窗通道。";

const nightstandTemplate = structuredClone(furniture("furn-2f-master-nightstand-north-001"));
function makeBedroomNightstand(id, code, name, yMm) {
  const item = structuredClone(nightstandTemplate);
  Object.assign(item, { id, code, name, floorId: "1F", roomId: "ROOM-1F-004", hostWallId: "W-1F-010" });
  item.dimensions = { width: 45, depth: 40, height: 50, unit: "cm" };
  item.note = "与 1F 卧室软包床头配套的悬浮床头柜，保留充电和阅读灯控制位。";
  item.constructionNote = "柜面高约 500mm，现场按床垫完成面微调；墙内预埋固定基层。";
  setPositionMm(item, 1220, yMm, 270);
  item.render3d = { ...item.render3d, variantId: "floating", styleSource: "manual" };
  item.constructionMeta.reserveSize = "45x40x50cm";
  item.constructionMeta.wallDependency = "贴 W-1F-010 固定，安装前复核床头中心线。";
  return upsertFurniture(item);
}
const bedroomNightstandNorth = makeBedroomNightstand("furn-1f-bedroom-nightstand-north-001", "NS-1F-N", "1F 卧室北侧床头柜", 5550);
const bedroomNightstandSouth = makeBedroomNightstand("furn-1f-bedroom-nightstand-south-001", "NS-1F-S", "1F 卧室南侧床头柜", 7575);

const oneFloorStructure = structures["1F"];
oneFloorStructure.windows = oneFloorStructure.windows.filter((windowObject) => windowObject.id !== "WIN-1F-003");
oneFloorStructure.bayWindows = oneFloorStructure.bayWindows.filter((bayWindow) => bayWindow.id !== "BW-1F-003");
oneFloorStructure.bayWindows.push({
  id: "BW-1F-003",
  floorId: "1F",
  name: "1F 卧室内开飘窗",
  geometryType: "line",
  wallId: "W-1F-014",
  positionOnWall: 0.539,
  width: 1200,
  depth: 550,
  height: 1400,
  operation: "casement",
  openDirection: "inward",
  verificationMeta: { status: "estimated", source: "manual-input", sourceNote: "用户明确要求内开飘窗", toleranceMm: 50 }
});

// 5. Put the water bar toward the south courtyard and the snack cabinet toward the north courtyard.
const waterBar = furniture("furn-living-waterbar-001");
const waterBarUpper = furniture("furn-living-waterbar-upper-001");
const snackCabinet = furniture("furn-living-snack-pullout-001");
setPositionMm(waterBar, 9210, 6850, 90);
setPositionMm(waterBarUpper, 9325, 6850, 90);
setPositionMm(snackCabinet, 9330, 4750, 90);
waterBar.name = "W-1F-011 南段水吧台";
waterBar.note = "水吧明确放在 W-1F-011 南段，更靠近南院和餐桌。";
waterBar.constructionNote = "水吧、吊柜、净饮、小水槽和咖啡设备整体位于南段；给排水与电源随位置复核。";
waterBarUpper.name = "W-1F-011 南段水吧吊柜";
waterBarUpper.note = "吊柜与南段水吧同轴。";
snackCabinet.name = "W-1F-011 北段零食柜";
snackCabinet.note = "零食柜明确放在 W-1F-011 北段，更靠近北院和入户方向。";
snackCabinet.constructionNote = "保持 320mm 浅柜并朝客厅抽拉，避开北侧厨房与卫生间入口。";

// 6. Correct both guest-bath mirror cabinets so the large mirrored doors face inward.
const oneFloorVanity = furniture("furn-bath-vanity-001");
setPositionMm(oneFloorVanity, 9192, 2475, 90);
oneFloorVanity.hostWallId = "W-1F-006";
const twoFloorGuestVanity = furniture("furn-2f-guest-vanity-001");
setPositionMm(twoFloorGuestVanity, 5094, 2475, 90);
twoFloorGuestVanity.hostWallId = "W-2F-004";
for (const vanity of [oneFloorVanity, twoFloorGuestVanity, furniture("furn-2f-master-vanity-001")]) {
  vanity.note = "柜门正面是一整面可开启镜面，拉开后露出 110mm 深的小件收纳柜。";
  vanity.constructionNote = "镜面柜门使用缓冲铰链；复核龙头、插座、镜柜灯和完整开启范围。";
  vanity.render3d.wetAreaVisual = { ...vanity.render3d.wetAreaVisual, mirrorStyle: "cabinet", mirrorHeightMm: 950, mirrorCabinetDepthMm: 110 };
}

// 7. Swap the B1 toilet and tiny vanity, keeping the washer door unobstructed.
const b1Toilet = furniture("furn-b1-bath-toilet-001");
const b1Vanity = furniture("furn-b1-bath-vanity-001");
setPositionMm(b1Toilet, 4350, 720, 0);
b1Toilet.hostWallId = "W-B1-001";
b1Toilet.note = "马桶移到原洗手台一侧，和洗烘机组并排但不遮挡洗衣机门。";
setPositionMm(b1Vanity, 5805, 1320, 90);
b1Vanity.hostWallId = "W-B1-015";
b1Vanity.note = "450mm 迷你洗手台移到东侧隔墙，释放洗烘机组正面操作空间。";

// 8. Turn every confirmed wall-mounted front back toward its room.
const orientationFixes = [
  ["furn-b2-activity-outdoor-pegboard-001", 180],
  ["furn-b2-study-souvenir-cabinet-001", 270],
  ["furn-b1-activity-small-shelf-001", 270],
  ["furn-b2-under-stair-shelf-001", 270],
  ["furn-2f-master-bathtub-001", 270],
  ["furn-2f-master-toilet-001", 270]
];
for (const [id, rotation] of orientationFixes) furniture(id).position.rotation = rotation;
const pegboard = furniture("furn-b2-activity-outdoor-pegboard-001");
pegboard.note = "洞孔、挂钩和层板全部朝向 B2 室内，背板贴 W-B2-011。";

// 9. Move the B2 sofa 500 mm toward the television wall.
const b2Sofa = furniture("furn-b2-living-long-sofa-001");
setPositionMm(b2Sofa, 5750, 3800, 180);
b2Sofa.note = "长沙发向 W-B2-001 电视柜前移 500mm，保持正对电视并释放后方活动通道。";
b2Sofa.constructionNote = "沙发中心 y=3800mm；复核茶几间距、观影视距和两侧通道。";

// 10. Make the 2F dressing table read as a normal, substantial dressing table.
const dressingTable = furniture("module-2f-window-desk");
dressingTable.name = "2F 窗边标准梳妆台";
dressingTable.dimensions = { width: 120, depth: 50, height: 80, unit: "cm" };
dressingTable.note = "采用正常梳妆台尺度并增加醒目的大镜面；台面可高于窗下沿，以使用舒适度优先。";
dressingTable.constructionNote = "台面高 800mm、宽 1200mm；复核窗扇开启、插座、镜前灯与座椅后退。";
dressingTable.render3d = { ...dressingTable.render3d, assetType: "desk", variantId: "dressingTableWithMirror", detailLevel: "presentation", childrenMode: "grouped" };
dressingTable.constructionMeta.reserveSize = "120x50x80cm";

const changedFurniture = [prepCounter, entryHanging, oneFloorBed, bedroomNightstandNorth, bedroomNightstandSouth, waterBar, waterBarUpper, snackCabinet, oneFloorVanity, twoFloorGuestVanity, b1Toilet, b1Vanity, pegboard, furniture("furn-b2-study-souvenir-cabinet-001"), furniture("furn-b1-activity-small-shelf-001"), furniture("furn-b2-under-stair-shelf-001"), furniture("furn-2f-master-bathtub-001"), furniture("furn-2f-master-toilet-001"), b2Sofa, dressingTable];
for (const item of changedFurniture) {
  workspace.drawingItems = syncRelatedDrawingItemsToFurniture(workspace.drawingItems, item, structures[item.floorId], { moveUntouchedGenerated: true, markReviewed: true });
}

workspace.defaultWorkspaceRevision = "2026-07-17-model-refinement-v6";
workspace.savedAt = now;
workspace.updatedAt = now;
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  revision: workspace.defaultWorkspaceRevision,
  prepCounter: { position: prepCounter.position, dimensions: prepCounter.dimensions },
  entryVariant: entryHanging.render3d.variantId,
  bedroomNightstands: [bedroomNightstandNorth.id, bedroomNightstandSouth.id],
  bayWindow: oneFloorStructure.bayWindows.find((item) => item.id === "BW-1F-003"),
  waterBarYmm: waterBar.position.y * 90,
  snackCabinetYmm: snackCabinet.position.y * 90,
  b1Fixtures: { toilet: b1Toilet.position, vanity: b1Vanity.position },
  orientationFixes: orientationFixes.map(([id]) => ({ id, rotation: furniture(id).position.rotation })),
  b2SofaYmm: b2Sofa.position.y * 90,
  dressingTable: dressingTable.dimensions
}, null, 2));
