import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncRelatedDrawingItemsToFurniture } from "../lib/furniture-placement.ts";
import { buildManagedStairInfrastructure } from "../lib/stair-systems.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260717-before-model-refinement-round3.json");
if (!fs.existsSync(backupPath)) fs.copyFileSync(workspacePath, backupPath);

const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const structures = workspace.houseStructuresByFloor;
const now = new Date().toISOString();
for (const structure of Object.values(structures)) structure.outdoorZones ??= [];

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

function roomArea(boundary) {
  return Math.round(Math.abs(boundary.reduce((sum, point, index) => {
    const next = boundary[(index + 1) % boundary.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2);
}

function setLine(wall, start, end) {
  wall.start = start;
  wall.end = end;
  wall.length = Math.round(Math.hypot(end.x - start.x, end.y - start.y));
  wall.verificationMeta = { status: "estimated", source: "manual-input", sourceNote: "用户精修第 3 轮空间调整", toleranceMm: 50 };
}

function removeFurniture(...ids) {
  const removed = new Set(ids);
  const removedDrawingIds = new Set(workspace.drawingItems.filter((item) => item.relatedFurnitureId && removed.has(item.relatedFurnitureId)).map((item) => item.id));
  workspace.furniture = workspace.furniture.filter((item) => !removed.has(item.id));
  workspace.drawingItems = workspace.drawingItems.filter((item) => !removedDrawingIds.has(item.id));
  if (workspace.drawingPackage?.drawingItemIds) workspace.drawingPackage.drawingItemIds = workspace.drawingPackage.drawingItemIds.filter((id) => !removedDrawingIds.has(id));
}

function upsertFurniture(next) {
  const index = workspace.furniture.findIndex((item) => item.id === next.id);
  if (index >= 0) workspace.furniture[index] = next;
  else workspace.furniture.push(next);
  return next;
}

function makeFurniture({ id, code, name, type, moduleCategory, moduleType, floorId, roomId, width, depth, height, xMm, yMm, rotation, material, note, assetType, variantId, hostWallId, primaryMaterial = "warmOak", secondaryMaterial = "warmWhiteCeramic", accentMaterial = "blackTitanium" }) {
  return {
    id,
    code,
    name,
    type,
    catalogId: `${moduleCategory}-${moduleType ?? type}`,
    moduleCategory,
    ...(moduleType ? { moduleType } : {}),
    floorId,
    roomId,
    ...(hostWallId ? { hostWallId } : {}),
    dimensions: { width, depth, height, unit: "cm" },
    material,
    note,
    constructionNote: note,
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    position: { x: xMm / 120, y: yMm / 90, rotation },
    color: "#cfc4b5",
    render3d: {
      assetType,
      detailLevel: "presentation",
      stylePreset: "modernNatural",
      primaryMaterial,
      secondaryMaterial,
      accentMaterial,
      visibleIn3d: true,
      selectableIn3d: true,
      childrenMode: "grouped",
      variantId,
      variationSeed: Array.from(id).reduce((seed, character) => ((seed * 33) ^ character.charCodeAt(0)) >>> 0, 5381),
      styleSource: "manual",
      elevationMm: 0
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
      relatedCircuit: "常规插座回路",
      notes: note
    },
    constructionMeta: {
      customMade: Boolean(hostWallId),
      installType: hostWallId ? "wallSecured" : "finishedFurniture",
      reserveSize: `${width}x${depth}x${height}cm`,
      wallDependency: hostWallId ? `贴 ${hostWallId} 定位，安装前按墙面完成面复尺。` : "",
      floorDependency: "按完成面标高校核落地尺寸",
      ceilingDependency: "",
      waterproofRequired: false,
      inspectionAccessRequired: false,
      purchaseCategory: hostWallId ? "定制柜体/硬装" : "成品家具",
      supplierType: hostWallId ? "全屋定制/木作供应商" : "成品家具供应商",
      notes: note
    },
    verificationMeta: { status: "estimated", source: "manual-input", sourceNote: "用户自然语言设计意图", toleranceMm: 50 }
  };
}

// 1–3. Kitchen: free-standing fridge faces the cooktop, one merged double-bowl sink has one centered faucet, and the unexplained prep run is removed.
const fridge = furniture("furn-fridge-001");
setPositionMm(fridge, 7200, 2215, 90);
delete fridge.hostWallId;
fridge.name = "厨房独立摆放冰箱";
fridge.note = "冰箱取消木作柜壳，作为独立成品直接放在厨房；门面旋转 180° 朝向灶台。";
fridge.constructionNote = "保留冰箱背部和两侧散热间隙，正面朝灶台；现场复核开门、抽屉完全拉出及厨房通道。";
fridge.render3d.kitchenVisual = { ...(fridge.render3d.kitchenVisual ?? {}), fridgeSurround: "none" };
fridge.constructionMeta.wallDependency = "不做柜体包边，按设备说明预留散热和电源。";
fridge.constructionMeta.notes = fridge.constructionNote;
fridge.mepMeta.notes = fridge.constructionNote;

const sink = furniture("furn-sink-001");
sink.name = "靠窗双台盆单龙头水槽";
sink.dimensions.width = 146;
sink.dimensions.depth = 48;
setPositionMm(sink, 6528, 675, 0);
sink.note = "两个水槽台盆合并为一组双槽，中央只设一个可覆盖两槽的高抛水龙头。";
sink.constructionNote = "按 1460x480mm 双槽复尺，单龙头居中；冷热水、下水和净水附件集中布置并保留检修。";
sink.render3d.kitchenVisual = { ...(sink.render3d.kitchenVisual ?? {}), sinkBowls: 2, faucetPlacement: "center" };
sink.constructionMeta.reserveSize = "146x48x20cm";
sink.constructionMeta.notes = sink.constructionNote;
sink.mepMeta.notes = sink.constructionNote;
removeFurniture("furn-sink-002", "furn-kitchen-u-right-run");

// 4. B1 activity / leisure corner: keep the beanbag and layer in light, toys, books and instruments.
const toyShelf = furniture("furn-b1-activity-small-shelf-001");
toyShelf.name = "B1 活动区玩具收纳矮架";
toyShelf.dimensions = { width: 120, depth: 32, height: 95, unit: "cm" };
setPositionMm(toyShelf, 1120, 6900, 90);
toyShelf.note = "贴 W-B1-007 的低矮开放格，使用圆角收纳筐分类玩具、积木和手柄，儿童也能自行取放。";
toyShelf.constructionNote = "1200x320x950mm 圆角开放格固定防倾倒，底层放重物，收纳筐留标签位。";
toyShelf.constructionMeta.reserveSize = "120x32x95cm";
toyShelf.constructionMeta.notes = toyShelf.constructionNote;

const activityLamp = makeFurniture({
  id: "furn-b1-activity-floor-lamp-001", code: "FL-B1-ACT-01", name: "B1 天窗下阅读落地灯", type: "custom", moduleCategory: "decor", floorId: "B1", roomId: "ROOM-B1-004",
  width: 45, depth: 45, height: 160, xMm: 3520, yMm: 6820, rotation: 0, material: "黑钛细杆 + 米白织物灯罩", note: "放在懒人沙发侧后方、靠近天窗下的阅读落地灯，补足夜间休闲光。", assetType: "generic", variantId: "floorLamp", primaryMaterial: "creamFabric", secondaryMaterial: "taupeFabric", accentMaterial: "blackTitanium"
});
activityLamp.serviceRequirements.power = true;
activityLamp.mepMeta = { ...activityLamp.mepMeta, needsSocket: true, socketCount: 1, socketHeight: 300, needsLighting: true, lightingType: "floorLamp", relatedCircuit: "B1 活动区插座回路", notes: activityLamp.note };
activityLamp.constructionAnchors = { points: [{ id: `${activityLamp.id}-power`, type: "power", label: "落地灯插座", positionMm: { x: 0, y: 300, z: -180 }, installationHeightMm: 300 }], notes: "插座靠墙侧布置，电线不跨越活动通道。" };
upsertFurniture(activityLamp);

const activityBookshelf = makeFurniture({
  id: "furn-b1-activity-bookshelf-001", code: "BK-B1-ACT-01", name: "B1 活动区休闲书架", type: "bookshelf", moduleCategory: "storage", moduleType: "bookshelf", floorId: "B1", roomId: "ROOM-B1-004",
  width: 120, depth: 32, height: 180, xMm: 4920, yMm: 7580, rotation: 180, material: "暖橡木开放格 + 局部暖白柜门", note: "贴 W-B1-010 设置阅读书架，开放层放常读书和画册，下部封闭格收纳杂物。", assetType: "bookshelf", variantId: "openClosedMix", hostWallId: "W-B1-010"
});
upsertFurniture(activityBookshelf);

const instrumentRack = makeFurniture({
  id: "furn-b1-activity-instrument-rack-001", code: "IR-B1-ACT-01", name: "B1 活动区双位乐器架", type: "custom", moduleCategory: "storage", moduleType: "instrumentRack", floorId: "B1", roomId: "ROOM-B1-004",
  width: 110, depth: 42, height: 150, xMm: 3300, yMm: 7520, rotation: 180, material: "黑色金属防滑支架 + 暖木接触垫", note: "靠墙放置双位吉他/尤克里里乐器架，与书架共同形成小型休闲音乐角。", assetType: "generic", variantId: "instrumentRack", hostWallId: "W-B1-010", primaryMaterial: "honeyWood", secondaryMaterial: "camelFabric", accentMaterial: "blackTitanium"
});
upsertFurniture(instrumentRack);

// 5. B1 washroom/laundry: remove the mirror cabinet, use a tiny basin, stack the dryer above the washer, and reclaim floor area.
const b1Vanity = furniture("furn-b1-bath-vanity-001");
b1Vanity.name = "B1 迷你洗手台";
b1Vanity.dimensions = { width: 45, depth: 35, height: 82, unit: "cm" };
setPositionMm(b1Vanity, 4250, 550, 0);
b1Vanity.note = "只保留 450mm 宽迷你洗手台，不设镜柜，满足如厕后简单洗手。";
b1Vanity.constructionNote = "450x350mm 小台盆，墙排优先；取消镜柜及镜柜灯电源。";
b1Vanity.render3d.wetAreaVisual = { ...(b1Vanity.render3d.wetAreaVisual ?? {}), basinCount: 1, mirrorStyle: "none" };
b1Vanity.lightingDesignExcluded = true;
b1Vanity.constructionMeta.reserveSize = "45x35x82cm";
b1Vanity.constructionMeta.notes = b1Vanity.constructionNote;
b1Vanity.mepMeta.notes = b1Vanity.constructionNote;

const washer = furniture("furn-b1-laundry-washer-001");
washer.name = "B1 洗烘叠放机组";
washer.dimensions = { width: 60, depth: 62, height: 170, unit: "cm" };
setPositionMm(washer, 5150, 690, 0);
washer.note = "烘干机叠放在洗衣机上方，合并为 600x620mm 紧凑洗烘机组。";
washer.constructionNote = "下洗衣、上烘干，使用原厂叠放连接件并设置防倾倒；分别预留电源、排水和散热检修。";
washer.render3d = { ...washer.render3d, variantId: "washerDryerStack", detailLevel: "presentation", childrenMode: "grouped" };
washer.constructionMeta.reserveSize = "60x62x170cm";
washer.constructionMeta.notes = washer.constructionNote;
washer.mepMeta.notes = washer.constructionNote;

const toilet = furniture("furn-b1-bath-toilet-001");
setPositionMm(toilet, 5580, 1320, 90);
toilet.hostWallId = "W-B1-015";
toilet.note = "马桶随缩小后的东侧隔墙内收，保留正面净空和门扇开启。";

setLine(byId(structures.B1.walls, "W-B1-001", "wall"), { x: 3947, y: 350 }, { x: 6000, y: 350 });
setLine(byId(structures.B1.walls, "W-B1-002", "wall"), { x: 6000, y: 350 }, { x: 9495, y: 350 });
setLine(byId(structures.B1.walls, "W-B1-015", "wall"), { x: 6000, y: 350 }, { x: 6000, y: 1800 });
setLine(byId(structures.B1.walls, "W-B1-016", "wall"), { x: 6000, y: 1800 }, { x: 3947, y: 1800 });
const b1LaundryBoundary = [{ x: 3947, y: 350 }, { x: 6000, y: 350 }, { x: 6000, y: 1800 }, { x: 3947, y: 1800 }];
const b1RoomBoundary = [{ x: 6000, y: 350 }, { x: 9495, y: 350 }, { x: 9495, y: 3117 }, { x: 5281, y: 3117 }, { x: 3947, y: 3117 }, { x: 3947, y: 1800 }, { x: 6000, y: 1800 }];
Object.assign(byId(structures.B1.rooms, "ROOM-B1-001", "room"), { name: "迷你盥洗洗衣间", boundary: b1LaundryBoundary, area: roomArea(b1LaundryBoundary) });
Object.assign(byId(structures.B1.rooms, "ROOM-B1-002", "room"), { boundary: b1RoomBoundary, area: roomArea(b1RoomBoundary) });

const mirrorControlGroup = "CG-B1-B1-001-MIRROR";
const removedMirrorDrawingIds = new Set(workspace.drawingItems.filter((item) => item.controlGroupId === mirrorControlGroup || item.relatedFurnitureId === b1Vanity.id && /镜|mirror/i.test(`${item.label} ${item.type} ${item.lightType}`)).map((item) => item.id));
workspace.drawingItems = workspace.drawingItems.filter((item) => !removedMirrorDrawingIds.has(item.id));
if (workspace.drawingPackage?.drawingItemIds) workspace.drawingPackage.drawingItemIds = workspace.drawingPackage.drawingItemIds.filter((id) => !removedMirrorDrawingIds.has(id));
for (const scene of workspace.lightingDesign?.scenes ?? []) scene.groupStates = scene.groupStates.filter((state) => state.controlGroupId !== mirrorControlGroup);

// 6. Use a 600 mm half-landing and pull the managed stair stack 470 mm toward the stair core.
for (const structure of Object.values(structures)) {
  for (const stair of structure.stairs ?? []) {
    if (!stair.stairSystemId) continue;
    stair.start = { ...stair.start, x: 3676 };
    stair.landingDepthMm = 600;
    stair.verificationMeta = { status: "estimated", source: "manual-input", sourceNote: "平台深度 600mm，梯段向楼梯核心内收", toleranceMm: 50 };
  }
}
const stairInfrastructure = buildManagedStairInfrastructure(structures);
workspace.stairSystems = stairInfrastructure.stairSystems;
workspace.stairLandings = stairInfrastructure.stairLandings;
workspace.stairOpenings = stairInfrastructure.stairOpenings;
const stairRoom1F = byId(structures["1F"].rooms, "ROOM-1F-006", "room");
stairRoom1F.boundary = [{ x: 950, y: 3050 }, { x: 3676, y: 3050 }, { x: 3676, y: 5150 }, { x: 950, y: 5150 }];
stairRoom1F.area = roomArea(stairRoom1F.boundary);
const living1F = byId(structures["1F"].rooms, "ROOM-1F-005", "room");
living1F.boundary = living1F.boundary.map((point) => point.x === 4146 ? { ...point, x: 3676 } : point);
living1F.area = roomArea(living1F.boundary);

// 7–9. B2: readable perforated pegboard, 5x4 clear-glass memorial cabinet, and exact 1600x600x800 solid slab table.
const pegboard = furniture("furn-b2-activity-outdoor-pegboard-001");
pegboard.hostWallId = "W-B2-011";
pegboard.dimensions = { width: 360, depth: 10, height: 220, unit: "cm" };
setPositionMm(pegboard, 7632, 7720, 0);
pegboard.material = "暖橡木整面洞洞板 + 黑色金属挂钩 + 活动层板";
pegboard.note = "贴 W-B2-011 的 3600x2200mm 整面洞洞板，孔阵、挂钩、层板和顶端灯带在 3D 中明确可见。";
pegboard.constructionNote = "背板分片上墙并校核基层承重，孔阵按 100mm 模数；重物挂件固定到结构基层。";
pegboard.render3d = { ...pegboard.render3d, detailLevel: "presentation", childrenMode: "grouped", primaryMaterial: "warmOak", secondaryMaterial: "honeyWood", accentMaterial: "blackTitanium" };
pegboard.constructionMeta.notes = pegboard.constructionNote;

const memorial = furniture("furn-b2-study-souvenir-cabinet-001");
memorial.name = "B2 书房 5×4 透明玻璃纪念柜";
memorial.material = "暖橡木方格柜体 + 超白透明玻璃门 + 黑钛细框 + 暖光层板灯";
memorial.note = "按 5 列 × 4 行设计 20 个接近正方形的纪念展示格；每格设透明玻璃门，大小纪念品分散陈列。";
memorial.constructionNote = "2600x380x2200mm，5x4 方格；玻璃门采用安全玻璃与缓冲铰链，逐排设置可检修暖光灯带。";
memorial.render3d = {
  ...memorial.render3d,
  assetType: "bookshelf",
  variantId: "glassDisplay",
  detailLevel: "presentation",
  childrenMode: "grouped",
  primaryMaterial: "warmOak",
  secondaryMaterial: "clearGlass",
  accentMaterial: "blackTitanium",
  cabinetVisual: { frontStyle: "glass", handleStyle: "knob", glassTone: "clear", allDoorPanels: true, layout: "squareGrid", gridColumns: 5, gridRows: 4, displayContents: true, interiorLighting: true }
};
memorial.constructionMeta.reserveSize = "260x38x220cm";
memorial.constructionMeta.notes = memorial.constructionNote;

const slabTable = furniture("furn-b2-study-slab-table-001");
slabTable.name = "B2 书房 1.6m 实木大板桌";
slabTable.dimensions = { width: 160, depth: 60, height: 80, unit: "cm" };
slabTable.material = "1600x600x800mm 整块实木大板 + 黑色金属桌脚";
slabTable.note = "实木大板桌严格按长 1.6m、宽 0.6m、高 0.8m 表达，保留当前长轴方向。";
slabTable.constructionNote = "成品尺寸 1600x600x800mm；复核桌边通道、座椅后退、地插和上方线性灯中心。";
slabTable.render3d = { ...slabTable.render3d, assetType: "slabTable", variantId: "rectTimber", detailLevel: "presentation" };
slabTable.constructionMeta.reserveSize = "160x60x80cm";
slabTable.constructionMeta.notes = slabTable.constructionNote;
slabTable.mepMeta.notes = slabTable.constructionNote;
const tableLight = workspace.drawingItems.find((item) => item.controlGroupId === "CG-B2-B2-005-DESK" && item.category === "light");
if (tableLight) tableLight.notes = "线性灯与 1600x600mm 实木大板桌长轴平行并居中，现场复核桌面照度和眩光。";

for (const item of [fridge, sink, toyShelf, b1Vanity, washer, toilet, pegboard, memorial, slabTable]) {
  workspace.drawingItems = syncRelatedDrawingItemsToFurniture(workspace.drawingItems, item, structures[item.floorId], { moveUntouchedGenerated: true, markReviewed: true });
}
const validDrawingItemIds = new Set(workspace.drawingItems.map((item) => item.id));
for (const drawingItem of workspace.drawingItems) {
  if (drawingItem.relatedLightIds) drawingItem.relatedLightIds = [...new Set(drawingItem.relatedLightIds.filter((id) => validDrawingItemIds.has(id)))];
  if (drawingItem.controlledLightIds) drawingItem.controlledLightIds = [...new Set(drawingItem.controlledLightIds.filter((id) => validDrawingItemIds.has(id)))];
}
if (workspace.drawingPackage?.drawingItemIds) workspace.drawingPackage.drawingItemIds = workspace.drawingItems.map((item) => item.id);

const b1ActivityView = workspace.cameraViews.find((view) => view.id === "view-b1-activity");
if (b1ActivityView) b1ActivityView.description = "查看天窗下懒人沙发、落地灯、玩具架、书架和双位乐器架组成的 B1 休闲活动角。";
const b2ActivityView = workspace.cameraViews.find((view) => view.id === "view-b2-activity");
if (b2ActivityView) b2ActivityView.description = "查看 W-B2-011 整面洞洞板的孔阵、活动层板与挂件细节。";

workspace.defaultWorkspaceRevision = "2026-07-17-model-refinement-v5";
workspace.savedAt = now;
workspace.updatedAt = now;
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  revision: workspace.defaultWorkspaceRevision,
  fridgeRotationDeg: fridge.position.rotation,
  fridgeSurround: fridge.render3d.kitchenVisual.fridgeSurround,
  kitchenSink: { widthMm: sink.dimensions.width * 10, bowls: sink.render3d.kitchenVisual.sinkBowls, faucet: sink.render3d.kitchenVisual.faucetPlacement },
  removedKitchenPrepRun: !workspace.furniture.some((item) => item.id === "furn-kitchen-u-right-run"),
  b1ActivityFurniture: workspace.furniture.filter((item) => item.roomId === "ROOM-B1-004").map((item) => item.name),
  b1LaundryAreaM2: byId(structures.B1.rooms, "ROOM-B1-001", "room").area / 1_000_000,
  b1MirrorStyle: b1Vanity.render3d.wetAreaVisual.mirrorStyle,
  washerDryerVariant: washer.render3d.variantId,
  landingDepthsMm: workspace.stairLandings.map((landing) => landing.depth),
  stairStartX: structures.B1.stairs.map((stair) => stair.start.x),
  b2PegboardHost: pegboard.hostWallId,
  memorialGrid: memorial.render3d.cabinetVisual,
  slabTableMm: { width: slabTable.dimensions.width * 10, depth: slabTable.dimensions.depth * 10, height: slabTable.dimensions.height * 10 }
}, null, 2));
