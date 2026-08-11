import fs from "node:fs";

const workspaceUrl = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(fs.readFileSync(workspaceUrl, "utf8"));
const structure = workspace.houseStructuresByFloor["2F"];

if (!structure) throw new Error("Missing 2F structure");

const estimateMeta = {
  status: "estimated",
  source: "manual-input",
  sourceNote: "2026-08-10 用户确认的2F设计调整；阳台及定制柜施工前仍需按开发商图纸和现场完成面复尺",
  toleranceMm: 100
};

function byId(items, id, label) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing ${label}: ${id}`);
  return item;
}

function upsert(items, value) {
  const index = items.findIndex((candidate) => candidate.id === value.id);
  if (index >= 0) items[index] = value;
  else items.push(value);
}

function furniture(id) {
  return byId(workspace.furniture, id, "furniture");
}

function setPositionMm(item, x, y, rotation) {
  item.position = {
    x: x / structure.coordinateSystem.width * 100,
    y: y / structure.coordinateSystem.height * 100,
    rotation
  };
}

function setDimensions(item, width, depth, height) {
  item.dimensions = { width, depth, height, unit: "cm" };
  if (item.constructionMeta) item.constructionMeta.reserveSize = `${width}x${depth}x${height}cm`;
}

// One open, connected balcony shared by the parent and child bedrooms.
const balconyPolygon = [
  { x: 950, y: 7800 },
  { x: 6542, y: 7800 },
  { x: 6542, y: 9300 },
  { x: 950, y: 9300 }
];
upsert(structure.outdoors, {
  id: "OD-2F-SHARED-BALCONY-001",
  floorId: "2F",
  name: "父母房 / 儿童房共享连通阳台",
  spaceType: "Outdoor",
  geometryType: "polygon",
  outdoorType: "patio",
  polygon: balconyPolygon,
  area: 8_388_000,
  verificationMeta: estimateMeta
});
upsert(structure.outdoorSurfaces, {
  id: "OS-2F-SHARED-BALCONY-TILE-001",
  floorId: "2F",
  name: "共享阳台暖灰防滑砖铺装",
  label: "共享连通阳台",
  category: "hardscape",
  geometryType: "polygon",
  surfaceType: "hardscape",
  polygon: balconyPolygon,
  pathWidthMm: null,
  area: 8_388_000,
  material: "tile",
  materialToken: "wetAreaTile",
  materialRole: "floorWet",
  notes: "父母房与儿童房可分别进入，阳台中间不设隔断；外沿统一金属玻璃感护栏，复核排水坡度和门槛防水。",
  status: "design-intent",
  source: "manual",
  editable: true,
  removable: true
});
for (const fence of [
  ["FN-2F-BALCONY-SOUTH-001", "共享阳台南侧通透金属护栏", { x: 950, y: 9300 }, { x: 6542, y: 9300 }],
  ["FN-2F-BALCONY-WEST-001", "共享阳台西侧通透金属护栏", { x: 950, y: 7800 }, { x: 950, y: 9300 }],
  ["FN-2F-BALCONY-EAST-001", "共享阳台东侧通透金属护栏", { x: 6542, y: 7800 }, { x: 6542, y: 9300 }]
]) {
  upsert(structure.fences, {
    id: fence[0],
    floorId: "2F",
    name: fence[1],
    geometryType: "line",
    start: fence[2],
    end: fence[3],
    height: 1100,
    thickness: 70,
    material: "metal",
    editable: true,
    removable: true
  });
}

// Replace the two incorrect bedroom windows with real balcony access doors.
structure.windows = structure.windows.filter((item) => !["WIN-2F-004", "WIN-2F-005"].includes(item.id));
for (const door of [
  { id: "D-2F-009", name: "父母房通共享阳台窄框双扇移门", hostId: "W-2F-018", positionOnWall: 0.72 },
  { id: "D-2F-010", name: "儿童房通共享阳台窄框双扇移门", hostId: "W-2F-019", positionOnWall: 0.29 }
]) {
  upsert(structure.doors, {
    ...door,
    floorId: "2F",
    geometryType: "line",
    hostType: "wall",
    width: 1500,
    height: 2300,
    openDirection: "leftIn",
    operation: "sliding",
    material: "glass",
    transparency: 0.76,
    visual: {
      style: "slimGlass",
      frameColor: "#74675b",
      hardwareColor: "#6a5b4d",
      glassColor: "#d7ddd9",
      leafCount: 2,
      jambMode: "minimal",
      thresholdHeightMm: 18
    },
    verificationMeta: estimateMeta
  });
}

const parentRoom = byId(structure.rooms, "ROOM-2F-004", "room");
const childRoom = byId(structure.rooms, "ROOM-2F-005", "room");
parentRoom.name = "父母房";
childRoom.name = "儿童房";

// Keep the authored corridor view honest: the master double door is actually open in 3D.
const masterDoor = byId(structure.doors, "D-2F-008", "door");
masterDoor.defaultOpenAmount = 0.88;
masterDoor.name = "主卧常开双扇门（走廊机位）";

// Master bedroom: west-wall bed, east-side wardrobe plus shallow five-drawer chest.
const masterBed = furniture("furn-2f-master-bedroom-bed-001");
masterBed.name = "主卧 西墙床头 1800mm 双人床";
masterBed.hostWallId = "W-2F-016";
masterBed.note = "床头移至西侧 W-2F-016，床身向东展开；东墙北段布置大衣柜，床尾南段保留约950mm主通道。";
masterBed.constructionNote = "床头靠西墙定位，左右各预留插座、USB-C、双控和阅读灯；不得新增侧窗，复核床头墙完成面。";
setPositionMm(masterBed, 7542, 6475, 270);

const masterWardrobe = furniture("furn-2f-master-bedroom-large-wardrobe-001");
masterWardrobe.name = "主卧 东墙北段 2200mm 通顶大衣柜";
masterWardrobe.hostWallId = "W-2F-011";
masterWardrobe.hidden = false;
masterWardrobe.visible = true;
masterWardrobe.note = "参考样板房，将2200mm大衣柜放在东墙北段，不与西墙床体正对重叠；承担主卧常穿衣物和换季收纳。";
masterWardrobe.constructionNote = "2200×600mm柜体自北端留50mm收口起布置；南侧衔接浅五斗橱，复核主卫门套、顶封板和感应灯电源。";
setDimensions(masterWardrobe, 220, 60, 275);
setPositionMm(masterWardrobe, 9195, 4200, 90);
masterWardrobe.render3d = {
  ...masterWardrobe.render3d,
  primaryMaterial: "warmOak",
  secondaryMaterial: "smokedOatTaupe",
  accentMaterial: "blackTitanium",
  visibleIn3d: true,
  cabinetVisual: {
    ...(masterWardrobe.render3d?.cabinetVisual ?? {}),
    frontStyle: "slab",
    handleStyle: "edgePull",
    allDoorPanels: true,
    interiorLighting: true,
    topGapMm: 50,
    sideGapMm: 20,
    plinthSetbackMm: 80,
    sideScribeMm: 25
  }
};

const masterChest = furniture("furn-2f-master-bedroom-chest-001");
masterChest.name = "主卧 东墙主卫连接处浅五斗橱";
masterChest.hostWallId = "W-2F-011";
masterChest.note = "五斗橱接在东墙大衣柜南侧，350mm浅体减少对床尾通道的挤压，用于睡衣、贴身衣物和护理用品。";
masterChest.constructionNote = "五斗橱按800×350×900mm控制；与衣柜留10–20mm收口缝，墙上预留挂画或小夜灯电源。";
setDimensions(masterChest, 80, 35, 90);
setPositionMm(masterChest, 9320, 5700, 90);

for (const [id, y, label] of [
  ["furn-2f-master-nightstand-north-001", 5360, "北侧"],
  ["furn-2f-master-nightstand-south-001", 7590, "南侧"]
]) {
  const item = furniture(id);
  item.name = `主卧西墙床头${label}窄床头柜`;
  item.hostWallId = "W-2F-016";
  item.note = "400mm窄床头柜嵌入床头与墙端之间，满足双人各自置物和充电。";
  setDimensions(item, 40, 35, 50);
  setPositionMm(item, 6742, y, 270);
}

// Dressing room: both sides become full smoked-glass wardrobes with warm internal light.
for (const id of ["module-2f-cloak-left", "module-2f-cloak-right"]) {
  const item = furniture(id);
  item.name = id.endsWith("left") ? "衣帽间西侧全深色玻璃衣柜" : "衣帽间东侧全深色玻璃衣柜";
  item.note = "整面采用深茶灰透明玻璃门、细黑钛框和暖色柜内感应灯；能看见衣物层次，但不做不透光黑柜。";
  item.material = "深茶灰玻璃 + 黑钛细框 + 暖橡木柜内层板 + 3000K感应灯";
  item.render3d = {
    ...item.render3d,
    variantId: "glassDisplay",
    primaryMaterial: "warmOak",
    secondaryMaterial: "smokedGlass",
    accentMaterial: "blackTitanium",
    cabinetMaterialOverrides: {
      ...(item.render3d?.cabinetMaterialOverrides ?? {}),
      glass: "smokedGlass",
      hardware: "blackTitanium",
      carcass: "warmOak"
    },
    cabinetVisual: {
      ...(item.render3d?.cabinetVisual ?? {}),
      frontStyle: "glass",
      handleStyle: "edgePull",
      glassTone: "smoked",
      allDoorPanels: true,
      displayContents: true,
      interiorLighting: true,
      bays: (item.render3d?.cabinetVisual?.bays?.length
        ? item.render3d.cabinetVisual.bays
        : Array.from({ length: 4 }, () => ({ widthRatio: 1, frontType: "glass" })))
        .map((bay) => ({ ...bay, frontType: "glass", interiorLighting: true }))
    }
  };
}

// Main bath retains the sample-room bathtub and one entrance only.
const shower = furniture("furn-2f-master-shower-001");
shower.name = "主卫东北角 900mm 无框玻璃淋浴间";
shower.hostWallId = "W-2F-002";
shower.note = "参考样板房，900mm无框玻璃淋浴位于东北角，入口朝南并与浴缸错开。";
setDimensions(shower, 90, 90, 210);
setPositionMm(shower, 9045, 800, 0);

const bathtub = furniture("furn-2f-master-bathtub-001");
bathtub.name = "主卫西墙 1700mm 独立浴缸";
bathtub.hostWallId = "W-2F-005";
bathtub.note = "按用户确认保留浴缸，并参考样板房沿西墙纵向放置1700×700mm独立浴缸。";
bathtub.constructionNote = "复核浴缸龙头、上下水、溢水、检修口、防水翻边及与马桶之间的清洁缝。";
setDimensions(bathtub, 170, 70, 58);
setPositionMm(bathtub, 8031, 1200, 270);

const vanity = furniture("furn-2f-master-vanity-001");
vanity.name = "主卫东墙 1600mm 悬浮双台盆";
vanity.hostWallId = "W-2F-006";
vanity.note = "参考样板房，东墙设置1600mm悬浮双台盆和通长镜柜；与西侧洁具形成约614mm中央通道。";
vanity.constructionNote = "按1600×500mm双盆柜预留双路给排水、镜柜电源和防溅插座；完成面后复核中央净宽。";
setDimensions(vanity, 160, 50, 85);
setPositionMm(vanity, 9245, 2170, 90);
vanity.render3d.wetAreaVisual = {
  ...(vanity.render3d.wetAreaVisual ?? {}),
  fixtureKind: "vanity",
  basinCount: 2,
  floating: true,
  mirrorStyle: "cabinet",
  frameFinish: "bronze",
  mirrorHeightMm: 950,
  mirrorCabinetDepthMm: 110
};

const toilet = furniture("furn-2f-master-toilet-001");
toilet.name = "主卫西南侧紧凑壁排马桶";
toilet.hostWallId = "W-2F-005";
toilet.note = "马桶移到浴缸南侧并向北收，避开主卫唯一门洞；入口处保持连续通行。";
setDimensions(toilet, 60, 70, 78);
setPositionMm(toilet, 8031, 2400, 270);

// Approved ten-view set. Keep the three technical stair-inspection cameras.
const requiredStairViews = [
  { id: "stair-view-2f-down-entry", name: "2F 下行入口", floor: "2F", cameraPosition: { x: -4.8, y: 7.2, z: 4.6 }, target: { x: -3.25, y: -1.2, z: 0.28 }, mode: "perspective", scope: "floor", targetArea: "stair-down", description: "2F 仅检查真实下行至 1F 的入口与踏步。" },
  { id: "stair-view-2f-arrival-landing", name: "2F 到达平台", floor: "2F", cameraPosition: { x: -0.9, y: 3.55, z: 3.8 }, target: { x: -2.72, y: -0.8, z: -0.25 }, mode: "perspective", scope: "floor", targetArea: "stair-landing", description: "从 2F 检查 1F↔2F 中间平台与下行回转。" },
  { id: "stair-view-2f-opening-overlook", name: "2F 挑空俯视", floor: "2F", cameraPosition: { x: -2.15, y: 5.75, z: 3.55 }, target: { x: -3.1, y: -1.05, z: 0.05 }, mode: "perspective", scope: "floor", targetArea: "stair-opening", description: "俯视 2F 洞口、危险边栏杆与下行路径。" }
];
for (const view of requiredStairViews) upsert(workspace.cameraViews, view);
workspace.cameraViews = workspace.cameraViews.filter((view) => !(view.floor === "2F" && view.id.startsWith("designer-camera-2f-")));
workspace.cameraViews.push(
  { id: "designer-camera-2f-01-stair-arrival", name: "2F 楼梯到达与走廊", floor: "2F", cameraPosition: { x: -2.5, y: 1.62, z: -0.1 }, target: { x: -1.0, y: 1.46, z: -0.3 }, fov: 50, zoom: 1.02, mode: "perspective", scope: "floor", targetArea: "ROOM-2F-008", description: "站在2F实体到达平台平视走廊与房门，机位不再悬在楼梯洞口上方。" },
  { id: "designer-camera-2f-02-stair-opening-night", name: "2F 楼梯洞口关系 / 夜景", floor: "2F", cameraPosition: { x: -1.2, y: 1.72, z: 0.18 }, target: { x: -3.2, y: 1.25, z: -0.16 }, fov: 54, zoom: 1.02, mode: "perspective", scope: "floor", targetArea: "stair-down", description: "从走廊安全站位平缓斜看下行楼梯洞口和栏杆，减少地面占比并保留夜间引导照明机位。" },
  { id: "designer-camera-2f-03-corridor-master-open", name: "2F 走廊看向开启的主卧门", floor: "2F", cameraPosition: { x: -1.35, y: 1.6, z: -0.05 }, target: { x: 1.75, y: 1.46, z: -0.42 }, fov: 46, zoom: 1.02, mode: "perspective", scope: "floor", targetArea: "ROOM-2F-007", description: "主卧双扇门在模型中实际打开；仅通过真实门洞读取主卧，不穿透关闭门扇或墙体。" },
  { id: "designer-camera-2f-04-guest-bath", name: "2F 客卫整体", floor: "2F", cameraPosition: { x: -2.02, y: 1.56, z: -1.72 }, target: { x: -1.15, y: 1.08, z: -2.92 }, fov: 58, zoom: 1.02, mode: "perspective", scope: "floor", targetArea: "ROOM-2F-001", description: "从客卫门内西侧安全站位斜看台盆、马桶、淋浴和门扇关系。" },
  { id: "designer-camera-2f-05-master-overview", name: "2F 主卧整体 / 西墙床与唯一飘窗", floor: "2F", cameraPosition: { x: 2.3, y: 1.58, z: 0.28 }, target: { x: 1.35, y: 1.12, z: 2.02 }, fov: 54, zoom: 1.02, mode: "perspective", scope: "floor", targetArea: "ROOM-2F-006", description: "从东墙柜体以西的真实站位，同时确认西墙床头、双床头柜和南墙唯一飘窗。" },
  { id: "designer-camera-2f-06-master-reverse-storage", name: "2F 主卧反向 / 大衣柜与五斗橱", floor: "2F", cameraPosition: { x: 0.2, y: 1.62, z: -0.5 }, target: { x: 3.1, y: 1.15, z: 0.05 }, fov: 65, zoom: 1.02, mode: "perspective", scope: "floor", targetArea: "ROOM-2F-006", description: "从走廊退后通过常开主卧双扇门斜看东墙2200mm大衣柜与主卫连接处五斗橱，避开门扇回转范围。" },
  { id: "designer-camera-2f-07-dark-glass-dressing", name: "2F 深色玻璃衣帽间与升降桌", floor: "2F", cameraPosition: { x: 0.52, y: 1.58, z: -1.72 }, target: { x: 0.52, y: 1.12, z: -3.62 }, fov: 55, zoom: 1.02, mode: "perspective", scope: "floor", targetArea: "ROOM-2F-002", description: "展示两侧全深茶灰透明玻璃柜、暖光内衬和窗边1800×700mm实木升降电脑桌。" },
  { id: "designer-camera-2f-08-master-bath", name: "2F 主卫 / 保留浴缸", floor: "2F", cameraPosition: { x: 2.62, y: 1.58, z: -1.7 }, target: { x: 2.56, y: 1.1, z: -3.15 }, fov: 55, zoom: 1.02, mode: "perspective", scope: "floor", targetArea: "ROOM-2F-003", description: "从唯一入口检查1700mm浴缸、900mm淋浴、1600mm双台盆和马桶。" },
  { id: "designer-camera-2f-09-parent-balcony", name: "2F 父母房与共享阳台", floor: "2F", cameraPosition: { x: -2.75, y: 1.58, z: 1.02 }, target: { x: -4.05, y: 1.12, z: 2.55 }, fov: 54, zoom: 1.02, mode: "perspective", scope: "floor", targetArea: "ROOM-2F-004", description: "检查父母房床、衣柜、右侧连续通道和通往共享阳台的玻璃移门。" },
  { id: "designer-camera-2f-10-child-balcony", name: "2F 儿童房收纳与共享阳台", floor: "2F", cameraPosition: { x: -1.7, y: 1.58, z: 1.1 }, target: { x: -0.4, y: 1.15, z: 1.7 }, fov: 72, zoom: 1.02, mode: "perspective", scope: "floor", targetArea: "ROOM-2F-005", description: "从儿童房西北侧净空用广角同时读取北侧1400mm独立衣柜、儿童床和南侧共享阳台玻璃移门。" }
);

workspace.dataRevision = "2026-08-03-unified-pbr-material-language-v1";
workspace.defaultWorkspaceRevision = "2f-approved-layout-20260810";
workspace.updatedAt = "2026-08-10T12:00:00.000+08:00";
workspace.savedAt = workspace.updatedAt;

fs.writeFileSync(workspaceUrl, `${JSON.stringify(workspace, null, 2)}\n`);
console.log("Applied approved 2F shared-balcony, master-bedroom, dressing-room, main-bath and ten-camera layout.");
