import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const structure = workspace.houseStructuresByFloor.B1;
const now = "2026-08-02T19:30:00.000Z";

function byId(items, id, label) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing ${label}: ${id}`);
  return item;
}

const room = (id) => byId(structure.rooms, id, "room");
const wall = (id) => byId(structure.walls, id, "wall");
const furniture = (id) => byId(workspace.furniture, id, "furniture");

function verification(sourceNote, toleranceMm = 100) {
  return {
    status: "estimated",
    source: "visual-estimate",
    sourceNote,
    toleranceMm
  };
}

function upsertDrawingItem(next) {
  const index = workspace.drawingItems.findIndex((item) => item.id === next.id);
  if (index >= 0) workspace.drawingItems[index] = next;
  else workspace.drawingItems.push(next);
  workspace.drawingPackage.drawingItemIds ??= [];
  if (!workspace.drawingPackage.drawingItemIds.includes(next.id)) workspace.drawingPackage.drawingItemIds.push(next.id);
  return next;
}

function baseDrawingItem({ id, roomId, category, type, positionMm, label, notes }) {
  return {
    id,
    floorId: "B1",
    roomId,
    category,
    type,
    positionMm,
    hostObjectId: null,
    hostWallId: null,
    relatedFurnitureId: null,
    heightMm: null,
    circuitId: null,
    materialId: null,
    label,
    notes,
    source: "manual",
    status: "confirmed",
    quantity: 1,
    relatedRoomId: roomId,
    createdAt: now,
    updatedAt: now,
    verificationMeta: verification("依据用户确认的B1方案A及B1整体视频校正关键帧；材料型号、分缝、吊顶基层与柜体加工尺寸施工前复核")
  };
}

function setWallFaceFinish(wallId, roomId, finish) {
  const target = wall(wallId);
  target.surfaceFinishByRoomId = {
    ...(target.surfaceFinishByRoomId ?? {}),
    [roomId]: finish
  };
}

function ellipsePoints(centerX, centerY, radiusX, radiusY, count = 48) {
  return Array.from({ length: count }, (_, index) => {
    const angle = index / count * Math.PI * 2;
    return {
      x: Math.round(centerX + Math.cos(angle) * radiusX),
      y: Math.round(centerY + Math.sin(angle) * radiusY)
    };
  });
}

const structuralSnapshot = JSON.stringify({
  walls: structure.walls.map(({ id, kind, start, end, center, radius, startAngle, endAngle, thickness, height, length }) => ({ id, kind, start, end, center, radius, startAngle, endAngle, thickness, height, length })),
  rooms: structure.rooms.map(({ id, boundary, area, sourceWallIds }) => ({ id, boundary, area, sourceWallIds })),
  stairs: structure.stairs.map(({ id, start, end, width, height, stepCount, landingDepthMm }) => ({ id, start, end, width, height, stepCount, landingDepthMm })),
  doors: structure.doors.map(({ id, hostId, positionOnWall, width, height, openDirection }) => ({ id, hostId, positionOnWall, width, height, openDirection }))
});

const looseFurnitureIds = [
  "furn-b1-guest-bed-001",
  "furn-b1-activity-beanbag-001",
  "furn-b1-activity-floor-lamp-001",
  "furn-b1-activity-instrument-rack-001"
];
const looseFurnitureSnapshot = JSON.stringify(looseFurnitureIds.map((id) => furniture(id)));

const continuousStoneFloor = {
  material: "stone",
  name: "暖灰米色哑光大板石材地面",
  baseColor: "#c9c0b2",
  jointColor: "#aaa092",
  textureAccent: "#ded7cc",
  roughness: 0.72,
  tileWidthMm: 1200,
  tileLengthMm: 2400,
  seamWidthMm: 1.5,
  pattern: "大板顺主要动线连续排版",
  directionDeg: 0,
  textureScale: 2.1
};

const lightOakWall = {
  material: "woodVeneerPanel",
  name: "暖灰浅橡木竖纹整面护墙",
  baseColor: "#cbbda8",
  textureAccent: "#a99780",
  roughness: 0.76,
  textureScale: 0.7
};

const wovenWall = {
  material: "wovenWallcovering",
  name: "暖灰编织肌理墙布",
  baseColor: "#b9ad9d",
  textureAccent: "#8f8273",
  roughness: 0.94,
  textureScale: 2.9
};

const darkLibraryWall = {
  material: "darkWoodVeneerPanel",
  name: "深棕木饰面与竖向凹槽背景",
  baseColor: "#6e5b49",
  textureAccent: "#3f342c",
  roughness: 0.68,
  textureScale: 0.58
};

const geometricWall = {
  material: "geometricWallcovering",
  name: "暖米灰低对比几何暗纹墙布",
  baseColor: "#c8bca6",
  textureAccent: "#a9987e",
  roughness: 0.93,
  textureScale: 2.6
};

for (const roomId of ["ROOM-B1-002", "ROOM-B1-003", "ROOM-B1-004", "ROOM-B1-005"]) {
  room(roomId).surfaceFinishes ??= {};
  room(roomId).surfaceFinishes.floor = { ...continuousStoneFloor };
}

room("ROOM-B1-002").surfaceFinishes.wall = { ...lightOakWall };
room("ROOM-B1-003").surfaceFinishes.wall = { ...lightOakWall };
room("ROOM-B1-004").surfaceFinishes.wall = { ...wovenWall };
room("ROOM-B1-005").surfaceFinishes.wall = { ...lightOakWall };

setWallFaceFinish("W-B1-002", "ROOM-B1-002", geometricWall);
setWallFaceFinish("W-B1-004", "ROOM-B1-002", lightOakWall);
setWallFaceFinish("W-B1-005", "ROOM-B1-004", lightOakWall);
setWallFaceFinish("W-B1-007", "ROOM-B1-004", darkLibraryWall);
setWallFaceFinish("W-B1-009", "ROOM-B1-004", wovenWall);
setWallFaceFinish("W-B1-010", "ROOM-B1-004", darkLibraryWall);
setWallFaceFinish("W-B1-005", "ROOM-B1-005", lightOakWall);
setWallFaceFinish("W-B1-007", "ROOM-B1-005", lightOakWall);

const laundryDoor = byId(structure.doors, "D-B1-001", "door");
laundryDoor.name = "B1 洗衣房浅橡木隐框平板门";
laundryDoor.visual = {
  ...(laundryDoor.visual ?? {}),
  style: "standard",
  woodColor: "#c4b59f",
  frameColor: "#725b47",
  hardwareColor: "#8a6948",
  glassColor: "#ddd1bd",
  leafCount: 1
};

const wardrobe = furniture("furn-b1-room-seasonal-wardrobe-001");
wardrobe.name = "B1 房间浅橡木整面换季衣柜";
wardrobe.material = "暖灰浅橡木竖纹平板门 + 深古铜窄阴影缝 + 防潮柜体";
wardrobe.color = "#c6b69f";
wardrobe.note = "保留现有2700x600x2400mm尺寸和W-B1-004位置，门板改为样板间浅木竖纹、无明装拉手和窄阴影缝。";
wardrobe.constructionNote = "柜体位置和尺寸不变；仅更新门板、侧封板、踢脚和收口。安装前按完成面复尺并保留除湿、通风和柜内灯带检修。";
wardrobe.render3d = {
  ...wardrobe.render3d,
  variantId: "fullHeightFlat",
  stylePreset: "modernNatural",
  primaryMaterial: "warmOak",
  secondaryMaterial: "oatTaupeLacquer",
  accentMaterial: "brushedBronze",
  styleSource: "manual",
  styleLocked: true,
  cabinetVisual: { frontStyle: "slab", handleStyle: "groove", allDoorPanels: true, layout: "panels" }
};
wardrobe.constructionMeta = {
  ...wardrobe.constructionMeta,
  wallDependency: "绑定 W-B1-004，保持现有定位；按浅木护墙完成面复尺并统一古铜阴影缝。",
  floorDependency: "落地柜底部采用深古铜内凹踢脚并做防潮封边",
  ceilingDependency: "维持现有2400mm柜高，上部与2800mm顶面采用同色封板收口，不改变结构层高",
  notes: wardrobe.constructionNote
};
wardrobe.verificationMeta = verification("B1整体视频00:05–00:11与00:37–00:40显示浅木整面护墙/柜门、窄深色分缝；现有柜体尺寸和位置沿用")

function restyleDisplayShelf(item, variantId, name, material, note) {
  item.name = name;
  item.material = material;
  item.color = "#75614f";
  item.note = note;
  item.constructionNote = `${note} 保留现有尺寸和位置，按墙面完成面复尺。`;
  item.render3d = {
    ...item.render3d,
    assetType: "bookshelf",
    variantId,
    detailLevel: "presentation",
    stylePreset: "modernNatural",
    primaryMaterial: "darkWalnut",
    secondaryMaterial: "travertine",
    accentMaterial: "brushedBronze",
    visibleIn3d: true,
    selectableIn3d: true,
    childrenMode: "grouped",
    styleSource: "manual",
    styleLocked: true
  };
  item.mepMeta = {
    ...item.mepMeta,
    needsSocket: true,
    socketCount: 1,
    socketHeight: 300,
    needsSwitch: true,
    switchControl: ["层板灯带门口场景控制"],
    needsLighting: true,
    lightingType: "cabinetStrip",
    lightColorTemperature: "2700K",
    needsSmartControl: true,
    notes: "层板下口设置隐藏灯带；变压器、检修口和出线位置需与现有回路复核。"
  };
  item.constructionMeta = {
    ...item.constructionMeta,
    wallDependency: `绑定 ${item.hostWallId}，保持现有定位；背板与相邻墙面统一收口。`,
    floorDependency: "落地深色内凹踢脚，完成面施工后复尺",
    ceilingDependency: "不改变现有柜高；上口以深色窄边收口",
    notes: item.constructionNote
  };
  item.verificationMeta = verification("B1整体视频00:17–00:24及00:34–00:37显示深棕框架、浅色层板、编织暗纹背板、上下竖槽饰面与2700K层板灯；柜体尺寸和位置沿用")
}

const lowShelf = furniture("furn-b1-activity-small-shelf-001");
restyleDisplayShelf(
  lowShelf,
  "b1ShowroomDisplayShelf",
  "B1 活动区样板间矮展示架",
  "深棕木框 + 暖灰编织背板 + 暖米色层板 + 2700K隐藏灯带",
  "保留1200x320x950mm与W-B1-007位置，把原玩具矮架改为样板间同语言的固定展示矮架；不增加展示摆件。"
);

const libraryShelf = furniture("furn-b1-activity-bookshelf-001");
restyleDisplayShelf(
  libraryShelf,
  "b1ShowroomLibraryWall",
  "B1 活动区样板间固定书柜",
  "深棕木框与竖槽上下口 + 暖灰编织背板 + 暖米色层板 + 2700K隐藏灯带",
  "保留1200x320x1800mm与W-B1-010位置，用空置层板表现样板间固定书柜造型；不复制书籍、摆件或钢琴。"
);

const floorRooms = [
  ["F-B1-ROOM-SHOWROOM-01", "ROOM-B1-002", { x: 7623, y: 1900 }, room("ROOM-B1-002").area / 1_000_000, "B1房间"],
  ["F-B1-CORRIDOR-SHOWROOM-01", "ROOM-B1-003", { x: 4800, y: 4450 }, 4.632458, "B1走廊"],
  ["F-B1-ACTIVITY-SHOWROOM-01", "ROOM-B1-004", { x: 4200, y: 6650 }, 19.448246, "B1活动区"],
  ["F-B1-STAIR-SHOWROOM-01", "ROOM-B1-005", { x: 2550, y: 4100 }, 6.7116, "B1楼梯间"]
];

for (const [id, roomId, positionMm, area, label] of floorRooms) {
  upsertDrawingItem({
    ...baseDrawingItem({
      id,
      roomId,
      category: "floorFinish",
      type: "largeFormatWarmGrayStone",
      positionMm,
      label: `${label}暖灰米色哑光大板地面`,
      notes: "仅统一硬装完成面和排版，不改变楼板标高；视频画面存在广角变形，板材模数按方案阶段估算。"
    }),
    material: "暖灰米色哑光大板石材/石纹砖",
    pattern: "1200x2400mm估算模块，顺主要动线连续排版",
    directionDeg: 0,
    seamWidthMm: 1.5,
    area,
    transition: "与洗衣房门下采用同色窄缝；墙地以8–10mm深古铜阴影缝收口"
  });
}

const wallFinishItems = [
  ["WFIN-B1-ROOM-002", "ROOM-B1-002", "W-B1-002", { x: 7623, y: 350 }, "暖米灰低对比几何暗纹墙布", geometricWall, "geometricWallcovering"],
  ["WFIN-B1-ROOM-004", "ROOM-B1-002", "W-B1-004", { x: 9495, y: 1735 }, "浅橡木竖纹整面护墙", lightOakWall, "verticalLightOakPanel"],
  ["WFIN-B1-ACT-005", "ROOM-B1-004", "W-B1-005", { x: 2450, y: 3117 }, "浅橡木竖纹过渡护墙", lightOakWall, "verticalLightOakPanel"],
  ["WFIN-B1-ACT-007", "ROOM-B1-004", "W-B1-007", { x: 950, y: 6900 }, "深棕竖槽木饰面", darkLibraryWall, "darkFlutedWoodPanel"],
  ["WFIN-B1-ACT-009", "ROOM-B1-004", "W-B1-009", { x: 2400, y: 7800 }, "暖灰编织肌理墙布", wovenWall, "wovenWallcovering"],
  ["WFIN-B1-ACT-010", "ROOM-B1-004", "W-B1-010", { x: 5275, y: 7800 }, "深棕书柜背景与竖槽木饰面", darkLibraryWall, "darkLibraryWall"],
  ["WFIN-B1-STAIR-005", "ROOM-B1-005", "W-B1-005", { x: 2450, y: 3117 }, "楼梯浅橡木竖纹护墙", lightOakWall, "verticalLightOakPanel"],
  ["WFIN-B1-STAIR-007", "ROOM-B1-005", "W-B1-007", { x: 950, y: 4100 }, "楼梯浅橡木竖纹护墙", lightOakWall, "verticalLightOakPanel"]
];

for (const [id, roomId, wallId, positionMm, label, finish, type] of wallFinishItems) {
  upsertDrawingItem({
    ...baseDrawingItem({ id, roomId, category: "wallFinish", type, positionMm, label: `${wallId} ${label}`, notes: "保持结构墙位置和厚度，只更新饰面、分缝、踢脚和相邻构件收口。" }),
    hostWallId: wallId,
    wallId,
    material: finish.material,
    heightRange: { minMm: 0, maxMm: 2800 },
    specialTreatment: "竖向纹理通顺；墙地8–10mm深古铜阴影缝；转角和柜墙交界采用2–3mm深色细缝"
  });
}

for (const [id, item, label] of [
  ["CAB-B1-ROOM-WARDROBE-01", wardrobe, "B1房间浅木整面换季衣柜"],
  ["CAB-B1-ACT-LOW-SHELF-01", lowShelf, "B1活动区样板间矮展示架"],
  ["CAB-B1-ACT-LIBRARY-01", libraryShelf, "B1活动区样板间固定书柜"]
]) {
  upsertDrawingItem({
    ...baseDrawingItem({ id, roomId: item.roomId, category: "cabinet", type: "showroomBuiltInCabinetRefinish", positionMm: null, label, notes: "保留现有柜体尺寸与位置，只调整门板/框架、背板、层板、踢脚、灯带和硬装收口；不添加书籍或摆件。" }),
    positionMm: {
      x: Math.round(structure.coordinateSystem.origin.x + item.position.x / 100 * structure.coordinateSystem.width),
      y: Math.round(structure.coordinateSystem.origin.y + item.position.y / 100 * structure.coordinateSystem.height)
    },
    hostWallId: item.hostWallId ?? null,
    relatedFurnitureId: item.id,
    relatedFurniturePositionMm: {
      x: Math.round(structure.coordinateSystem.origin.x + item.position.x / 100 * structure.coordinateSystem.width),
      y: Math.round(structure.coordinateSystem.origin.y + item.position.y / 100 * structure.coordinateSystem.height)
    },
    material: item.material,
    specialTreatment: "深古铜窄边/阴影缝；隐藏灯带2700K；所有柜体加工尺寸施工前复尺"
  });
}

upsertDrawingItem({
  ...baseDrawingItem({
    id: "CEIL-B1-ACT-ELLIPSE-01",
    roomId: "ROOM-B1-004",
    category: "ceiling",
    type: "b1ShowroomEllipticalCove",
    positionMm: { x: 4300, y: 6800 },
    label: "B1活动区浅跌级椭圆灯槽",
    notes: "参考样板间环形顶面，只增加约80mm浅跌级与2700K暗藏灯带；不改变结构楼板、层高关系、楼梯洞口或风口条件。"
  }),
  polygon: ellipsePoints(4300, 6800, 1700, 760),
  ceilingHeightMm: 2720,
  material: "暖白矿物涂料 + 2700K暗藏灯带",
  pattern: "椭圆浅跌级，外缘连续灯槽",
  specialTreatment: "灯槽内藏光、无明装灯珠；与喷淋、风口、检修口和楼板梁位综合复核"
});

if (JSON.stringify({
  walls: structure.walls.map(({ id, kind, start, end, center, radius, startAngle, endAngle, thickness, height, length }) => ({ id, kind, start, end, center, radius, startAngle, endAngle, thickness, height, length })),
  rooms: structure.rooms.map(({ id, boundary, area, sourceWallIds }) => ({ id, boundary, area, sourceWallIds })),
  stairs: structure.stairs.map(({ id, start, end, width, height, stepCount, landingDepthMm }) => ({ id, start, end, width, height, stepCount, landingDepthMm })),
  doors: structure.doors.map(({ id, hostId, positionOnWall, width, height, openDirection }) => ({ id, hostId, positionOnWall, width, height, openDirection }))
}) !== structuralSnapshot) {
  throw new Error("B1 structural constraint changed during hard-finish application");
}

if (JSON.stringify(looseFurnitureIds.map((id) => furniture(id))) !== looseFurnitureSnapshot) {
  throw new Error("B1 loose furniture changed during hard-finish application");
}

workspace.defaultWorkspaceRevision = "2026-08-03-b1-showroom-all-hard-finish-revised-laundry-v2";
workspace.savedAt = now;
workspace.updatedAt = now;
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  revision: workspace.defaultWorkspaceRevision,
  unchangedStructuralGeometry: true,
  unchangedLooseFurniture: looseFurnitureIds,
  retainedLaundryPlanA: ["furn-b1-laundry-washer-niche-001", "furn-b1-laundry-toilet-cabinet-wall-001"].every((id) => workspace.furniture.some((item) => item.id === id)),
  updatedRooms: ["ROOM-B1-002", "ROOM-B1-003", "ROOM-B1-004", "ROOM-B1-005"],
  updatedBuiltIns: [wardrobe.id, lowShelf.id, libraryShelf.id],
  ceilingFeature: "CEIL-B1-ACT-ELLIPSE-01"
}, null, 2));
