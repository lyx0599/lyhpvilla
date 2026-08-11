import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const workspacePath = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspacePath, "utf8"));
const structure = workspace.houseStructuresByFloor["1F"];

const furniture = (id) => workspace.furniture.find((item) => item.id === id);
const door = (id) => structure.doors.find((item) => item.id === id);
const camera = (id) => workspace.cameraViews.find((item) => item.id === id);

assert.ok(structure, "Missing 1F structure");

// Living room: a compact shallow-curve sofa facing the existing TV/fireplace wall.
// The coffee table is intentionally removed; the clear floor area is part of the design.
workspace.furniture = workspace.furniture.filter((item) => item.id !== "furn-1f-living-coffee-table-flex-001");
const sofa = furniture("furn-1f-living-main-sofa-001");
assert.ok(sofa, "Missing 1F living sofa");
sofa.name = "1F 客厅低靠背浅弧主沙发";
sofa.dimensions = { width: 235, depth: 90, height: 70, unit: "cm" };
sofa.position = { x: 51.7, y: 72.4, rotation: 90 };
sofa.render3d = {
  ...sofa.render3d,
  assetType: "sofa",
  variantId: "lowCurvedSofa",
  detailLevel: "presentation",
  primaryMaterial: "creamBoucle",
  secondaryMaterial: "greigeLinen",
  accentMaterial: "blackTitanium",
  stylePreset: "tuscanWabiSabi",
  styleSource: "manual"
};
sofa.note = "235cm浅弧形低靠背主沙发，正对西侧电视/壁炉墙；取消茶几、休闲椅和边几，中央地面保持完全净空。";
sofa.constructionNote = "成品沙发深度控制在90cm左右，低靠背但保留人体支撑；现场以电视完成面复核观看距离及沙发东侧通道。";

// Dining: retain the daily six-seat envelope while making the electric mechanism explicit in 2D and 3D.
const diningTable = furniture("module-1f-table-001");
assert.ok(diningTable, "Missing 1F dining table");
diningTable.name = "1F 高级嵌入式电动转盘圆变椭圆餐桌套组";
diningTable.position = { x: 68.2, y: 65, rotation: 0 };
diningTable.render3d = {
  ...diningTable.render3d,
  assetType: "diningTable",
  variantId: "poweredRoundExtension",
  seatCount: 6,
  closedDiameterCm: 155,
  expandedSizeCm: "240x120",
  poweredTurntableDiameterCm: 75,
  expansionMode: "electricSynchronized",
  expandedSeatCount: 10,
  turntableMount: "flushIntegrated",
  hiddenDriveHousing: true,
  edgeControlButton: true,
  styleSource: "manual"
};
diningTable.note = "日常为直径155cm圆桌、4–6人使用；中央75cm电动转盘与桌面齐平，设置窄金属分界环、隐藏驱动和桌边控制键；聚餐时电动同步展开为约240x120cm椭圆桌，可坐8–10人。";
diningTable.constructionNote = "采购需确认圆变椭圆联动结构、电动转盘独立驱动、防夹手、断电手动回收及桌边隐藏按键；厨房门前维持连续通行，不以展开状态作为日常摆位。";

// Entry: this is a wall panel with rail/hooks, not a drawer cabinet.
const entryRail = furniture("furn-entry-slim-hanging-001");
assert.ok(entryRail, "Missing 1F entry hanging rail");
entryRail.name = "1F 玄关超薄木饰面挂衣板（无抽屉）";
entryRail.position = { x: 44.35, y: 26.44, rotation: 90 };
entryRail.render3d = {
  ...entryRail.render3d,
  assetType: "entryCabinet",
  variantId: "slimHangingRail",
  cabinetVisual: {
    ...(entryRail.render3d?.cabinetVisual ?? {}),
    allDoorPanels: false,
    drawerCount: 0,
    floating: true
  },
  styleSource: "manual"
};
entryRail.note = "12cm深的木饰面挂衣板，位于西侧入户门正对的 W-1F-004 墙面并与门中心同轴；仅包含挂杆、折叠挂钩及上下窄搁板；没有抽屉、落地柜体或黑色结构柱。";
entryRail.constructionNote = "挂衣板贴 W-1F-004 安装，中心与900mm入户门中心同轴，深度不超过120mm；挂钩折叠后不侵占玄关净通道。";

// South courtyard: keep the 3600mm fixed viewing window and convert only the 900mm swing door to glass.
const southDoor = door("D-1F-002");
assert.ok(southDoor, "Missing 1F south courtyard door");
southDoor.name = "客厅通往南院900mm窄框玻璃单开门";
southDoor.operation = "swing";
southDoor.material = "glass";
southDoor.transparency = 0.22;
southDoor.visual = {
  style: "standard",
  frameColor: "#514a43",
  hardwareColor: "#7b6b59",
  glassColor: "#dce8e7",
  woodColor: "#8f704f",
  leafCount: 1
};

// Bedroom: keep the authored bay window and correct the inward swing direction.
const bedroomDoor = door("D-1F-003");
assert.ok(bedroomDoor, "Missing 1F bedroom door");
bedroomDoor.openDirection = "rightIn";
bedroomDoor.name = "1F 卧室右内开浅橡木门";

const bedroomWardrobe = furniture("module-1f-wardrobe-001");
assert.ok(bedroomWardrobe, "Missing 1F bedroom wardrobe");
bedroomWardrobe.name = "1F 卧室墙面一体浅暖灰无明装把手衣柜";
bedroomWardrobe.render3d = {
  ...bedroomWardrobe.render3d,
  assetType: "wardrobe",
  variantId: "integratedTaupeWardrobe",
  primaryMaterial: "oatTaupeLacquer",
  secondaryMaterial: "warmOak",
  accentMaterial: "agedBrass",
  cabinetVisual: {
    ...(bedroomWardrobe.render3d?.cabinetVisual ?? {}),
    frontStyle: "slab",
    handleStyle: "groove",
    allDoorPanels: true,
    doorCount: 4,
    sideScribeMm: 38,
    plinthSetbackMm: 110
  },
  styleSource: "manual"
};
bedroomWardrobe.note = "通顶墙面一体浅暖灰平板衣柜，以细竖向分缝和暗藏拉手替代黑色明装长拉手；木色仅用于侧收口，体量轻、与墙面融合。";
bedroomWardrobe.constructionNote = "维持现有平面占地；柜门采用浅暖灰哑光，四等分通顶门板，暗藏竖向拉手槽，内收踢脚110mm并弱化侧板厚度。";

const mediaWall = furniture("furn-living-fireplace-south-001");
assert.ok(mediaWall, "Missing 1F living media wall");
mediaWall.name = "1F 客厅暖白悬浮电视壁炉墙与单侧木质壁龛";
mediaWall.render3d = {
  ...mediaWall.render3d,
  assetType: "fireplace",
  variantId: "floatingNicheMediaWall",
  primaryMaterial: "warmOak",
  secondaryMaterial: "warmWhiteCeramic",
  accentMaterial: "blackTitanium",
  styleSource: "manual"
};
mediaWall.note = "以第3张效果图为风格母版：暖白墙面、悬浮浅木矮柜、线性壁炉、壁挂电视及单侧木质开放壁龛；不采用整面厚重石材包围。";
mediaWall.constructionNote = "电视、线性壁炉与悬浮柜中心轴统一；木质壁龛仅设一侧，底部预留柔和灯带，所有机位保持同一左右关系。";

// Kitchen: preserve the freestanding refrigerator and add a matching wall cabinet above the adjacent base worktop.
const rightRun = furniture("furn-kitchen-u-right-run");
assert.ok(rightRun, "Missing kitchen right-side worktop");
rightRun.name = "厨房冰箱侧操作台与同宽吊柜（无高柜）";
rightRun.render3d = {
  ...rightRun.render3d,
  assetType: "kitchenCabinet",
  variantId: "baseCabinet",
  kitchenVisual: {
    ...rightRun.render3d.kitchenVisual,
    cabinetKind: "base",
    showUpperCabinets: true,
    upperCabinetHeightMm: 680,
    upperCabinetDepthMm: 350,
    drawerCount: 1,
    doorCount: 2
  },
  styleSource: "manual"
};
rightRun.note = "冰箱这一侧保留连续操作台和下柜，上方增加与操作台同宽的浅暖白吊柜；冰箱独立摆放，旁边不增加设备高柜、储物高柜或包围柜。";
rightRun.constructionNote = "制作900mm高地柜与操作台，并在上方配置约680mm高、350mm深的同宽吊柜；严禁在冰箱旁追加通顶柜，现场复核冰箱门开启与台面收口。";

const fridge = furniture("furn-fridge-001");
assert.ok(fridge, "Missing kitchen refrigerator");
fridge.render3d = {
  ...fridge.render3d,
  kitchenVisual: {
    ...fridge.render3d.kitchenVisual,
    fridgeSurround: "none"
  },
  styleSource: "manual"
};
fridge.note = "独立成品冰箱，不做木作包围；冰箱旁只有低位操作台，不设置任何高柜。";

// The stair geometry is already authoritative: left side down to B1, right side up to 2F.
const stairDown = structure.stairs.find((item) => item.id === "ST-1F-002");
const stairUp = structure.stairs.find((item) => item.id === "ST-1F-001");
assert.equal(stairDown?.direction, "down");
assert.equal(stairUp?.direction, "up");
assert.match(stairDown?.name ?? "", /左侧下行/);
assert.match(stairUp?.name ?? "", /右侧上行/);

const cameraUpdates = {
  "designer-camera-1f-01-foyer-entry": {
    name: "1F 玄关入户与超薄挂衣板",
    cameraPosition: { x: -5.6, y: 3.1, z: -5.8 },
    target: { x: -1.47, y: 0.65, z: -2.8 },
    fov: 48,
    description: "锁定原始模型坐标，从北侧入户门内侧朝南看超薄木饰面挂衣板；西侧楼梯与东侧厨房不得互换，无抽屉柜、无黑色结构柱。严禁水平镜像。"
  },
  "designer-camera-1f-02-foyer-living": {
    name: "1F 玄关看向弧形沙发",
    cameraPosition: { x: -1.55, y: 1.58, z: -1.98 },
    target: { x: 0.55, y: 1.05, z: 0.65 },
    fov: 51,
    description: "从北侧玄关朝南看客厅：画面左侧必须是东侧餐区/水吧，右侧必须是西侧电视壁炉墙；展示低靠背浅弧沙发及无茶几净空。严禁水平镜像。"
  },
  "designer-camera-1f-03-living-overview": {
    name: "1F 客餐厅整体与电动圆桌",
    cameraPosition: { x: 0.15, y: 1.64, z: -0.62 },
    target: { x: 1.75, y: 1.08, z: 1.42 },
    fov: 52,
    description: "朝南院的客餐厅整体：画面左侧为东侧餐桌、水吧和固定窗，画面右侧为西侧电视壁炉墙与900玻璃门；中央无茶几。严禁水平镜像。"
  },
  "designer-camera-1f-04-living-sofa": {
    name: "1F 弧形沙发与电视壁炉视距",
    cameraPosition: { x: 2.72, y: 1.58, z: 2.72 },
    target: { x: 0.05, y: 1.02, z: 1.72 },
    fov: 49,
    description: "保持模型左右关系，从餐区斜看低靠背浅弧沙发与暖白悬浮电视壁炉墙；学习客餐厅整体机位的材质，中央无茶几。严禁重排门窗。"
  },
  "designer-camera-1f-05-living-daylight": {
    name: "1F 客厅南向窗与玻璃院门",
    cameraPosition: { x: 2.85, y: 1.58, z: 0.45 },
    target: { x: 1.25, y: 1.12, z: 2.55 },
    fov: 50,
    description: "朝南院看：画面左侧必须是3600mm固定半落地窗，画面右侧必须是900mm窄框玻璃单开门及西侧电视壁炉墙；电动餐桌必须显示金属分界环和桌边控制键。严禁镜像。"
  },
  "designer-camera-1f-06-kitchen-entry": {
    name: "1F 厨房入口与净通道",
    cameraPosition: { x: 0.78, y: 2.18, z: -1.82 },
    target: { x: 0.92, y: 1.02, z: -3.05 },
    fov: 48,
    description: "从厨房推拉门外看U形厨房；冰箱侧操作台上方必须有同宽吊柜，门前保持通道；门外左侧为空墙，不得添加植物或矮柜。"
  },
  "designer-camera-1f-07-kitchen-worktop": {
    name: "1F 冰箱侧操作台",
    cameraPosition: { x: 0.55, y: 1.62, z: -3.62 },
    target: { x: 1.55, y: 1.02, z: -2.62 },
    fov: 49,
    description: "展示独立冰箱、相邻低位操作台及其上方同宽吊柜；冰箱无包围柜，旁边无任何通顶高柜；不得添加植物或门外柜体。"
  },
  "designer-camera-1f-08-kitchen-living-link": {
    name: "1F 客厅回看厨房连接",
    cameraPosition: { x: 2.72, y: 1.58, z: -0.18 },
    target: { x: 0.95, y: 1.08, z: -2.1 },
    fov: 50,
    description: "从厨房朝南看客厅：画面左侧为东侧餐桌/水吧，右侧为西侧电视壁炉墙；餐桌与门口保持清晰分离，严禁水平镜像。"
  },
  "designer-camera-1f-09-bedroom": {
    name: "1F 卧室与内开飘窗",
    cameraPosition: { x: -2.92, y: 1.48, z: 0.95 },
    target: { x: -2.08, y: 1.05, z: 2.82 },
    fov: 50,
    description: "展示床、550mm深实体飘窗和墙面一体浅暖灰衣柜；衣柜四等分通顶、暗藏拉手、无黑色长把手，不得增加床头平窗。"
  },
  "designer-camera-1f-10-stair-public-route": {
    name: "1F 左下B1右上2F与卧室门",
    cameraPosition: { x: 1.72, y: 1.7, z: 2.48 },
    target: { x: -2.48, y: 0.9, z: -0.38 },
    fov: 46,
    description: "采用低畸变透视从客厅读取楼梯：画面左侧完整下行B1，右侧完整上行2F；卧室门保持矩形门洞和向右内开，不得重建、扭曲或合并楼梯开口。"
  }
};

for (const [id, update] of Object.entries(cameraUpdates)) {
  const view = camera(id);
  assert.ok(view, `Missing camera: ${id}`);
  Object.assign(view, update, { zoom: 1.02, mode: "perspective", scope: "floor" });
}

for (const [id, update] of Object.entries({
  "view-1f-living-dining-overview": {
    name: "1F 客餐厨总览 · 弧形沙发无茶几",
    description: "检查低靠背浅弧沙发、无茶几净空、电动转盘餐桌、厨房与南院玻璃门的同步关系。"
  },
  "view-1f-island-dining": {
    name: "1F 高级电动转盘圆桌",
    description: "展示齐平嵌入式电动转盘、隐藏驱动、六把日常餐椅和圆变椭圆展开逻辑。"
  },
  "view-1f-living-sofa-detail": {
    name: "1F 低靠背浅弧沙发细节",
    description: "展示浅弧沙发正对电视/壁炉墙，取消茶几、休闲椅和边几，中央地面完全净空。"
  }
})) {
  const view = camera(id);
  if (view) Object.assign(view, update);
}

workspace.defaultWorkspaceRevision = "2026-08-10-1f-handedness-and-style-lock-v6";
workspace.updatedAt = new Date().toISOString();

await writeFile(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  revision: workspace.defaultWorkspaceRevision,
  sofa: { dimensions: sofa.dimensions, position: sofa.position, variant: sofa.render3d.variantId },
  coffeeTableRemoved: !workspace.furniture.some((item) => item.id === "furn-1f-living-coffee-table-flex-001"),
  diningTable: { position: diningTable.position, variant: diningTable.render3d.variantId },
  southDoor: { material: southDoor.material, width: southDoor.width, operation: southDoor.operation },
  retainedWindow: structure.windows.find((item) => item.id === "WIN-1F-006"),
  stairDirections: [stairDown.name, stairUp.name],
  camerasUpdated: Object.keys(cameraUpdates).length
}, null, 2));
