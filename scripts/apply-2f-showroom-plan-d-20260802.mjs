import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateLightingDesignV1 } from "../lib/lighting-design.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260802-before-2f-showroom-plan-d.json");
if (!fs.existsSync(backupPath)) fs.copyFileSync(workspacePath, backupPath);

const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const structure = workspace.houseStructuresByFloor["2F"];
const now = "2026-08-02T16:30:00.000Z";

const estimateMeta = {
  status: "estimated",
  source: "visual-estimate",
  sourceNote: "依据用户确认的2F样板间方案D及照片/视频空间比例推算；建筑外轮廓、楼梯和层高不变，墙位与封闭阳台施工前复核",
  toleranceMm: 100
};

function byId(items, id, label) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing ${label}: ${id}`);
  return item;
}

const room = (id) => byId(structure.rooms, id, "room");
const wall = (id) => byId(structure.walls, id, "wall");
const furniture = (id) => byId(workspace.furniture, id, "furniture");
const drawing = (id) => byId(workspace.drawingItems, id, "drawing item");

function setPositionMm(item, xMm, yMm, rotation = item.position.rotation) {
  item.position = { x: xMm / structure.coordinateSystem.width * 100, y: yMm / structure.coordinateSystem.height * 100, rotation };
}

function setStraightWall(id, start, end, name) {
  const item = wall(id);
  Object.assign(item, {
    name,
    start,
    end,
    length: Math.round(Math.hypot(end.x - start.x, end.y - start.y)),
    verificationMeta: estimateMeta
  });
  return item;
}

function upsertStructureItem(collection, next) {
  const items = structure[collection];
  const index = items.findIndex((item) => item.id === next.id);
  if (index >= 0) items[index] = next;
  else items.push(next);
  return next;
}

function upsertFurniture(next) {
  const index = workspace.furniture.findIndex((item) => item.id === next.id);
  if (index >= 0) workspace.furniture[index] = next;
  else workspace.furniture.push(next);
  return next;
}

function upsertDrawingItem(next) {
  const index = workspace.drawingItems.findIndex((item) => item.id === next.id);
  if (index >= 0) workspace.drawingItems[index] = next;
  else workspace.drawingItems.push(next);
  workspace.drawingPackage.drawingItemIds ??= [];
  if (!workspace.drawingPackage.drawingItemIds.includes(next.id)) workspace.drawingPackage.drawingItemIds.push(next.id);
  return next;
}

function upsertRoomTourView(next) {
  const index = workspace.roomTourViews.findIndex((item) => item.id === next.id);
  if (index >= 0) workspace.roomTourViews[index] = next;
  else workspace.roomTourViews.push(next);
}

function baseDrawingItem({ id, roomId, category, type, positionMm, label, notes }) {
  return {
    id,
    floorId: "2F",
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
    verificationMeta: estimateMeta
  };
}

function ceilingItem({ id, roomId, polygon, height, label, material, notes }) {
  return {
    ...baseDrawingItem({ id, roomId, category: "ceiling", type: "showroomCeiling", positionMm: polygon[0], label, notes }),
    polygon,
    ceilingHeightMm: height,
    heightMm: height,
    material,
    relatedLightIds: [],
    inspectionAccess: false,
    airVent: false,
    returnAir: false,
    maintenanceOpening: false
  };
}

function makeFurniture({ id, code, name, type, assetType, variantId, roomId, hostWallId, dimensions, positionMm, rotation, material, note, primaryMaterial, secondaryMaterial, accentMaterial, cabinetVisual, lightingDesignExcluded = false }) {
  return {
    id,
    code,
    name,
    type,
    catalogId: `showroom-2f-${assetType}`,
    moduleCategory: type === "sofa" || type === "chair" ? "living" : "decor",
    floorId: "2F",
    roomId,
    roomAssignmentLocked: true,
    lightingDesignExcluded,
    ...(hostWallId ? { hostWallId } : {}),
    dimensions: { ...dimensions, unit: "cm" },
    material,
    note,
    constructionNote: note,
    serviceRequirements: { water: false, drainage: false, power: false, exhaust: false },
    position: {
      x: positionMm.x / structure.coordinateSystem.width * 100,
      y: positionMm.y / structure.coordinateSystem.height * 100,
      rotation
    },
    color: "#b89d83",
    render3d: {
      assetType,
      detailLevel: "presentation",
      stylePreset: "tuscanWabiSabi",
      primaryMaterial,
      secondaryMaterial,
      accentMaterial,
      visibleIn3d: true,
      selectableIn3d: true,
      childrenMode: "grouped",
      variantId,
      variationSeed: Array.from(id).reduce((seed, character) => ((seed * 33) ^ character.charCodeAt(0)) >>> 0, 5381),
      styleSource: "manual",
      ...(cabinetVisual ? { cabinetVisual } : {})
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
      customMade: Boolean(hostWallId) || assetType === "desk",
      installType: hostWallId ? "wallSecured" : "finishedFurniture",
      reserveSize: `${dimensions.width}x${dimensions.depth}x${dimensions.height}cm`,
      wallDependency: hostWallId ? `绑定 ${hostWallId}，按完成面复尺。` : "",
      floorDependency: "按完成面标高校核",
      ceilingDependency: "",
      waterproofRequired: false,
      inspectionAccessRequired: false,
      purchaseCategory: "定制柜体/成品家具",
      supplierType: "全屋定制/家具供应商",
      notes: note
    },
    verificationMeta: estimateMeta
  };
}

function addManualLightGroup({ groupId, switchId, roomId, switchPosition, lights }) {
  const lightIds = lights.map((item) => item.id);
  for (const light of lights) {
    const relatedFurniture = light.relatedFurnitureId ? furniture(light.relatedFurnitureId) : null;
    upsertDrawingItem({
      ...baseDrawingItem({
        id: light.id,
        roomId,
        category: "light",
        type: light.type,
        positionMm: light.positionMm,
        label: light.label,
        notes: light.notes
      }),
      source: "generated-from-room",
      status: "draft",
      heightMm: light.heightMm,
      lightType: light.type,
      lightingLayer: light.layer,
      colorTemperature: light.colorTemperature ?? "2700K",
      lightColorTemperature: light.colorTemperature ?? "2700K",
      beamAngle: light.beamAngle ?? 100,
      mountingType: light.mountingType,
      hostCeilingAreaId: light.hostCeilingAreaId ?? null,
      hostWallId: light.hostWallId ?? null,
      relatedFurnitureId: light.relatedFurnitureId ?? null,
      ...(relatedFurniture ? { relatedFurniturePositionMm: {
        x: relatedFurniture.position.x / 100 * structure.coordinateSystem.width,
        y: relatedFurniture.position.y / 100 * structure.coordinateSystem.height
      } } : {}),
      relatedSwitchId: switchId,
      controlGroupId: groupId,
      lightGroupId: groupId,
      smartControl: true,
      needsSmartControl: true,
      dimming: true,
      lightSpec: {
        powerW: light.powerW,
        luminousFluxLm: light.luminousFluxLm,
        cri: 95,
        glareRating: light.glareRating,
        fixtureFamily: light.fixtureFamily,
        trimColor: light.trimColor
      }
    });
  }
  upsertDrawingItem({
    ...baseDrawingItem({
      id: switchId,
      roomId,
      category: "switch",
      type: "switchAndSceneControl",
      positionMm: switchPosition,
      label: `${switchId} · 样板间氛围照明控制`,
      notes: `控制组 ${groupId}；控制 ${lightIds.join("、")}。床头、衣柜和灯槽分键并可调光。`
    }),
    source: "generated-from-room",
    status: "draft",
    controlGroupId: groupId,
    lightGroupId: groupId,
    controlledLightIds: lightIds,
    relatedLightIds: lightIds,
    switchControl: ["物理开关", "智能场景"],
    smartControl: true,
    needsSmartControl: true,
    dimming: true
  });
}

function roomTourOverride({ id, roomId, name, cameraPosition, target, fov, description }) {
  const dx = target.x - cameraPosition.x;
  const dy = target.y - cameraPosition.y;
  const dz = target.z - cameraPosition.z;
  return {
    id,
    floorId: "2F",
    roomId,
    name,
    type: "room",
    cameraPosition,
    target,
    yaw: Math.atan2(dx, dz),
    pitch: Math.atan2(dy, Math.max(0.0001, Math.hypot(dx, dz))),
    fov,
    linkedNodeIds: [],
    description,
    status: "active"
  };
}

// Plan D geometry: redistribute 550mm from Bedroom 1 to the main bedroom and
// absorb both existing south balconies into Bedrooms 1 and 2. The 12m x 9m
// coordinate envelope, stair, storey height and all north-side wet rooms stay fixed.
setStraightWall("W-2F-010", { x: 950, y: 3050 }, { x: 950, y: 9000 }, "2F 西侧外墙 · 卧室1封闭阳台延伸");
setStraightWall("W-2F-012", { x: 950, y: 5150 }, { x: 3347, y: 5150 }, "2F 卧室1北墙");
setStraightWall("W-2F-013", { x: 3347, y: 5150 }, { x: 5992, y: 5150 }, "2F 卧室2北墙");
setStraightWall("W-2F-014", { x: 5992, y: 5150 }, { x: 7681, y: 5150 }, "2F 主卧入口南墙");
setStraightWall("W-2F-015", { x: 3347, y: 5150 }, { x: 3347, y: 9000 }, "2F 卧室1/卧室2分隔墙 · 向西550mm");
setStraightWall("W-2F-016", { x: 5992, y: 5150 }, { x: 5992, y: 9000 }, "2F 卧室2/主卧床头分隔墙 · 向西550mm");
setStraightWall("W-2F-018", { x: 950, y: 7800 }, { x: 3347, y: 7800 }, "2F 卧室1原阳台界面 · 大开口保留梁位");
setStraightWall("W-2F-019", { x: 3347, y: 7800 }, { x: 5992, y: 7800 }, "2F 卧室2原阳台界面 · 大开口保留梁位");
setStraightWall("W-2F-020", { x: 5992, y: 7800 }, { x: 9495, y: 7800 }, "2F 主卧南外墙 · 原飘窗保留");

const wallTemplate = wall("W-2F-018");
upsertStructureItem("walls", {
  ...wallTemplate,
  id: "W-2F-021",
  name: "2F 卧室1封闭阳台南侧窗墙",
  start: { x: 950, y: 9000 },
  end: { x: 3347, y: 9000 },
  length: 2397,
  verificationMeta: estimateMeta
});
upsertStructureItem("walls", {
  ...wallTemplate,
  id: "W-2F-022",
  name: "2F 卧室2封闭阳台南侧窗墙",
  start: { x: 3347, y: 9000 },
  end: { x: 5992, y: 9000 },
  length: 2645,
  verificationMeta: estimateMeta
});

Object.assign(room("ROOM-2F-004"), {
  name: "卧室1 · 样板间艺术休憩套间",
  boundary: [{ x: 950, y: 5150 }, { x: 3347, y: 5150 }, { x: 3347, y: 9000 }, { x: 950, y: 9000 }],
  area: 9_228_450,
  sourceWallIds: ["W-2F-012", "W-2F-015", "W-2F-021", "W-2F-010"],
  finishedCeilingHeightMm: 2760,
  verificationMeta: estimateMeta
});
Object.assign(room("ROOM-2F-005"), {
  name: "卧室2 · 样板间休憩阳台卧室",
  boundary: [{ x: 3347, y: 5150 }, { x: 5992, y: 5150 }, { x: 5992, y: 9000 }, { x: 3347, y: 9000 }],
  area: 10_183_250,
  sourceWallIds: ["W-2F-013", "W-2F-016", "W-2F-022", "W-2F-015"],
  finishedCeilingHeightMm: 2760,
  verificationMeta: estimateMeta
});
Object.assign(room("ROOM-2F-006"), {
  name: "主卧 · 样板间衣柜适配版",
  boundary: [{ x: 7681, y: 3050 }, { x: 9495, y: 3050 }, { x: 9495, y: 7800 }, { x: 5992, y: 7800 }, { x: 5992, y: 5150 }, { x: 7681, y: 5150 }],
  area: 13_092_350,
  sourceWallIds: ["W-2F-009", "W-2F-011", "W-2F-020", "W-2F-016", "W-2F-014", "W-2F-017"],
  finishedCeilingHeightMm: 2750,
  verificationMeta: estimateMeta
});

for (const roomId of ["ROOM-2F-004", "ROOM-2F-005", "ROOM-2F-006"]) {
  room(roomId).surfaceFinishes.floor = {
    material: "microcement",
    name: "暖灰米色细骨料微水泥",
    baseColor: "#a99f90",
    jointColor: "#9a9082",
    textureAccent: "#c1b7a8",
    roughness: 0.9,
    seamWidthMm: 0,
    pattern: "无缝连续通铺",
    directionDeg: 0,
    textureScale: 3.2
  };
}
for (const roomId of ["ROOM-2F-002", "ROOM-2F-007", "ROOM-2F-008"]) {
  room(roomId).surfaceFinishes.floor = {
    material: "microcement",
    name: "暖灰米色细骨料连续地面",
    baseColor: "#aaa092",
    jointColor: "#9b9184",
    textureAccent: "#c0b6a7",
    roughness: 0.9,
    seamWidthMm: 0,
    pattern: "通层连续铺设",
    directionDeg: 0,
    textureScale: 3.2
  };
}
room("ROOM-2F-004").surfaceFinishes.wall = { material: "textileWallcovering", name: "浅燕麦织物肌理墙布", baseColor: "#d8cbbb", textureAccent: "#b8a690", roughness: 0.94, textureScale: 2.6 };
room("ROOM-2F-005").surfaceFinishes.wall = { material: "limePlaster", name: "暖灰米石灰基肌理墙", baseColor: "#d6c9b8", textureAccent: "#bba994", roughness: 0.94, textureScale: 2.7 };
room("ROOM-2F-006").surfaceFinishes.wall = { material: "textileWallcovering", name: "暖米褐织物肌理墙布", baseColor: "#cfbda9", textureAccent: "#aa8e73", roughness: 0.91, textureScale: 2.5 };
room("ROOM-2F-002").surfaceFinishes.wall = { material: "woodVeneer", name: "浅橡木与暖米布纹柜墙", baseColor: "#b99b7b", textureAccent: "#dbc5aa", roughness: 0.7, textureScale: 2.2 };
room("ROOM-2F-007").surfaceFinishes.wall = { material: "textileWallcovering", name: "暖米灰布纹护墙", baseColor: "#d1c4b3", textureAccent: "#ad9a84", roughness: 0.91, textureScale: 2.6 };
room("ROOM-2F-008").surfaceFinishes.wall = { material: "woodVeneer", name: "浅橡木墙板与暖灰留缝", baseColor: "#b79776", textureAccent: "#d7c0a3", roughness: 0.7, textureScale: 2.2 };
for (const roomId of ["ROOM-2F-001", "ROOM-2F-003"]) {
  room(roomId).surfaceFinishes.floor = { material: "stone", name: "浅暖灰洞石纹防滑石材", baseColor: "#c8bba7", jointColor: "#a99a85", textureAccent: "#e4d8c5", roughness: 0.84, tileWidthMm: 600, tileLengthMm: 1200, seamWidthMm: 1.5, pattern: "大板对缝", directionDeg: 0, textureScale: 3.4 };
  room(roomId).surfaceFinishes.wall = { material: "stone", name: "浅暖灰洞石大板 + 深色壁龛", baseColor: "#d1c4b0", textureAccent: "#aa9980", roughness: 0.8, textureScale: 3.1 };
  room(roomId).finishedCeilingHeightMm = 2650;
}
room("ROOM-2F-002").finishedCeilingHeightMm = 2650;
room("ROOM-2F-007").finishedCeilingHeightMm = 2700;
room("ROOM-2F-008").finishedCeilingHeightMm = 2700;

wall("W-2F-012").surfaceFinishByRoomId = {
  "ROOM-2F-004": { material: "upholsteredPanel", name: "卧室1浅米软包床头墙 + 竖向细分缝", baseColor: "#cdbca8", textureAccent: "#9d8065", roughness: 0.9, textureScale: 2.3 },
  "ROOM-2F-007": room("ROOM-2F-007").surfaceFinishes.wall
};
wall("W-2F-013").surfaceFinishByRoomId = {
  "ROOM-2F-005": { material: "textilePanel", name: "卧室2暖灰织物柜墙", baseColor: "#c8b9a5", textureAccent: "#9d866d", roughness: 0.9, textureScale: 2.3 },
  "ROOM-2F-007": room("ROOM-2F-007").surfaceFinishes.wall
};
wall("W-2F-015").surfaceFinishByRoomId = {
  "ROOM-2F-004": { material: "woodVeneer", name: "卧室1衣柜侧浅橡木收口", baseColor: "#b49370", textureAccent: "#d7bfa0", roughness: 0.7, textureScale: 2.1 },
  "ROOM-2F-005": room("ROOM-2F-005").surfaceFinishes.wall
};
wall("W-2F-016").surfaceFinishByRoomId = {
  "ROOM-2F-005": { material: "graphicWallcovering", name: "卧室2黑灰手绘几何墙纸 + 暖木格栅床头", baseColor: "#c5b9aa", textureAccent: "#554b43", roughness: 0.9, textureScale: 1.8 },
  "ROOM-2F-006": { material: "botanicalWallcovering", name: "主卧暖米褐植物纹墙布 + 两侧隐藏洗墙", baseColor: "#c9b49d", textureAccent: "#886f57", roughness: 0.91, textureScale: 2.0 }
};
wall("W-2F-011").surfaceFinishByRoomId = {
  "ROOM-2F-006": { material: "woodVeneer", name: "主卧衣柜墙浅橡木与暖灰布纹一体收口（样板窗改衣柜）", baseColor: "#b69a7e", textureAccent: "#d8c5ae", roughness: 0.71, textureScale: 2.1 }
};

structure.windows = structure.windows.filter((item) => !["WIN-2F-004", "WIN-2F-005"].includes(item.id) && item.hostId !== "W-2F-011");
upsertStructureItem("doors", {
  id: "D-2F-009",
  floorId: "2F",
  name: "卧室1与封闭阳台通高双扇玻璃移门/大开口",
  geometryType: "line",
  hostId: "W-2F-018",
  hostType: "wall",
  positionOnWall: 0.5,
  width: 2200,
  height: 2300,
  openDirection: "leftIn",
  operation: "sliding",
  material: "glass",
  visual: { style: "slimGlass", woodColor: "#9a7654", frameColor: "#5c5147", hardwareColor: "#66574a", glassColor: "#e5ddd1", leafCount: 2 },
  verificationMeta: estimateMeta
});
upsertStructureItem("doors", {
  id: "D-2F-010",
  floorId: "2F",
  name: "卧室2与封闭阳台通高双扇玻璃移门/大开口",
  geometryType: "line",
  hostId: "W-2F-019",
  hostType: "wall",
  positionOnWall: 0.5,
  width: 2200,
  height: 2300,
  openDirection: "leftIn",
  operation: "sliding",
  material: "glass",
  visual: { style: "slimGlass", woodColor: "#9a7654", frameColor: "#5c5147", hardwareColor: "#66574a", glassColor: "#e5ddd1", leafCount: 2 },
  verificationMeta: estimateMeta
});
for (const [id, hostId, name] of [
  ["WIN-2F-006", "W-2F-021", "卧室1封闭阳台南向通高窗"],
  ["WIN-2F-007", "W-2F-022", "卧室2封闭阳台南向通高窗"]
]) {
  upsertStructureItem("windows", {
    id,
    floorId: "2F",
    name,
    geometryType: "line",
    hostId,
    hostType: "wall",
    positionOnWall: 0.5,
    width: 2200,
    height: 2300,
    sillHeightMm: 0,
    operation: "fixed",
    verificationMeta: estimateMeta
  });
}

const masterBay = byId(structure.bayWindows, "BW-2F-002", "bay window");
masterBay.wallId = "W-2F-020";
masterBay.positionOnWall = (8010 - 5992) / 3503;
masterBay.verificationMeta = { status: "drawing-derived", source: "developer-plan", sourceNote: "保留交付条件中的主卧南向飘窗；仅因宿主墙起点变化重算相对定位", toleranceMm: 80 };

for (const doorItem of structure.doors) {
  if (["D-2F-003", "D-2F-004", "D-2F-008"].includes(doorItem.id)) {
    doorItem.name = `${doorItem.id} · 暖米灰暗框通高门`;
    doorItem.visual = { ...(doorItem.visual ?? {}), style: doorItem.id === "D-2F-008" ? "doubleLeafWood" : "standard", woodColor: "#ad9276", frameColor: "#6d5b4d", hardwareColor: "#665445", leafCount: doorItem.id === "D-2F-008" ? 2 : 1 };
  }
}

const b1Bed = furniture("furn-2f-bedroom1-bed-001");
b1Bed.name = "卧室1 浅米软包艺术床";
b1Bed.material = "浅米织物软包 + 浅橡木细边 + 床头隐藏灯";
b1Bed.note = "床头转向北墙，以样板间的轻软包和艺术书房气质组织；保留1200×2000mm紧凑床尺度。";
b1Bed.render3d = { ...b1Bed.render3d, primaryMaterial: "beigeFabric", secondaryMaterial: "warmOak", accentMaterial: "agedBrass", variantId: "lowUpholstered", showRug: false, bedVisual: { headboardStyle: "standard", shelfDepthMm: 120, shelfHeightMm: 620, chargingNiche: true } };
setPositionMm(b1Bed, 1560, 6300, 0);

const b1Wardrobe = furniture("furn-2f-bedroom1-wardrobe-001");
b1Wardrobe.name = "卧室1 东墙暖米布纹通顶移门衣柜";
b1Wardrobe.material = "暖米布纹哑光移门 + 浅橡木圆角端板 + 深色细缝 + 柜内灯";
b1Wardrobe.dimensions = { width: 140, depth: 55, height: 240, unit: "cm" };
b1Wardrobe.note = "随分隔墙向西550mm，柜体调整为1400×550mm紧凑尺度；柜前净距约627mm，因此采用移门，柜顶与吊顶齐平，靠原阳台界面一端做圆角收口。";
b1Wardrobe.render3d = { ...b1Wardrobe.render3d, primaryMaterial: "oatTaupeLacquer", secondaryMaterial: "warmOak", accentMaterial: "agedBrass", variantId: "slidingPanels", cabinetVisual: { frontStyle: "slab", handleStyle: "groove", doorCount: 3, panelGapMm: 2, endPanelThicknessMm: 20, interiorLighting: true, showInternalShadowGap: true } };
setPositionMm(b1Wardrobe, 3062, 6800, 90);

const b2Bed = furniture("furn-2f-bedroom2-bed-001");
b2Bed.name = "卧室2 暖棕织物软包床";
b2Bed.material = "暖棕/铁锈红织物软包 + 浅木格栅床头 + 几何墙纸背景";
b2Bed.dimensions = { width: 130, depth: 200, height: 95, unit: "cm" };
b2Bed.note = "床头贴新的W-2F-016西侧完成面；受北侧600mm衣柜和南侧原阳台梁位共同约束，采用1300×2000mm紧凑双人床，衣柜前保留约500mm。";
b2Bed.render3d = { ...b2Bed.render3d, primaryMaterial: "taupeFabric", secondaryMaterial: "warmOak", accentMaterial: "agedBrass", variantId: "lowUpholstered", showRug: false, bedVisual: { headboardStyle: "storageShelf", shelfDepthMm: 160, shelfHeightMm: 620, chargingNiche: true } };
setPositionMm(b2Bed, 4892, 6900, 90);

const b2Wardrobe = furniture("module-2f-wardrobe-002");
b2Wardrobe.name = "卧室2 北墙暖米布纹通顶衣柜";
b2Wardrobe.material = "暖米布纹移门 + 浅橡木边框 + 内嵌感应灯";
b2Wardrobe.note = "移至北墙东段，避开900mm门洞，门框完成面与柜侧保留约50mm收口。";
b2Wardrobe.render3d = { ...b2Wardrobe.render3d, primaryMaterial: "oatTaupeLacquer", secondaryMaterial: "warmOak", accentMaterial: "agedBrass", variantId: "slidingPanels", cabinetVisual: { frontStyle: "slab", handleStyle: "groove", doorCount: 3, panelGapMm: 2, interiorLighting: true, showInternalShadowGap: true } };
setPositionMm(b2Wardrobe, 5120, 5450, 0);

const masterBed = furniture("furn-2f-master-bedroom-bed-001");
masterBed.name = "主卧 暖米褐织物大床";
masterBed.material = "暖米褐织物软包 + 浅橡木细边 + 植物纹床头背景";
masterBed.note = "随床头分隔墙向西550mm，1600×2000mm不变；床身向东，正对保留的南向飘窗区域。";
masterBed.render3d = { ...masterBed.render3d, primaryMaterial: "beigeFabric", secondaryMaterial: "warmOak", accentMaterial: "agedBrass", variantId: "lowUpholstered", showRug: false, bedVisual: { headboardStyle: "standard", shelfDepthMm: 120, shelfHeightMm: 640, chargingNiche: true } };
setPositionMm(masterBed, 6992, 6500, 270);

for (const [id, y] of [["furn-2f-master-nightstand-north-001", 5400], ["furn-2f-master-nightstand-south-001", 7550]]) {
  const item = furniture(id);
  item.hostWallId = "W-2F-016";
  item.name = `${y < 6500 ? "主卧北侧" : "主卧南侧"}悬浮浅橡木床头柜`;
  item.material = "浅橡木圆角悬浮柜 + 暖灰抽屉 + 做旧黄铜细节";
  item.note = "随主卧床和W-2F-016整体向西550mm，床头开关与USB-C点位同步复核。";
  item.render3d = { ...item.render3d, primaryMaterial: "warmOak", secondaryMaterial: "oatTaupeLacquer", accentMaterial: "agedBrass", variantId: "floating" };
  setPositionMm(item, 6192, y, 270);
}

const masterRug = furniture("furn-2f-master-rug-001");
masterRug.name = "2F 主卧床下暖灰米地毯（隐藏）";
masterRug.note = "按用户希望减少模型软装堆叠，本轮3D隐藏地毯；数据保留便于后续软装阶段选择。";
masterRug.render3d = { ...masterRug.render3d, visibleIn3d: false };
setPositionMm(masterRug, 7050, 6500, 270);

const masterWardrobe = furniture("furn-2f-master-bedroom-large-wardrobe-001");
masterWardrobe.name = "主卧 样板间侧窗位置整面衣柜";
masterWardrobe.material = "暖米布纹通顶门板 + 浅橡木圆角侧板 + 烟灰玻璃展示格 + 柜内感应灯";
masterWardrobe.note = "用户明确指定：样板间主卧多出的侧窗不设置，该位置改为2200×600×2400mm整面衣柜；W-2F-011不得新增窗洞。";
masterWardrobe.dimensions = { width: 220, depth: 59, height: 240, unit: "cm" };
masterWardrobe.constructionNote = "采用590mm完成面深度；与床侧净通道约908mm，施工前按完成面复核门板开启、窗帘及插座。";
masterWardrobe.render3d = { ...masterWardrobe.render3d, primaryMaterial: "oatTaupeLacquer", secondaryMaterial: "warmOak", accentMaterial: "agedBrass", variantId: "fullHeightFlat", cabinetVisual: { frontStyle: "slab", handleStyle: "groove", glassTone: "smoked", displayContents: true, interiorLighting: true, doorCount: 4, panelGapMm: 2, endPanelThicknessMm: 20, showInternalShadowGap: true } };
setPositionMm(masterWardrobe, 9195, 6500, 90);

const masterChest = furniture("furn-2f-master-bedroom-chest-001");
masterChest.name = "主卧入口暖光展示矮柜";
masterChest.dimensions = { width: 100, depth: 40, height: 90, unit: "cm" };
masterChest.material = "浅色石材台面 + 暖米门板 + 浅橡木开放格 + 暗藏灯";
masterChest.note = "参考样板间入口端景，把原五斗柜调整为较宽的低矮展示柜；不影响主卧双开门。";
masterChest.render3d = { ...masterChest.render3d, assetType: "sideboard", primaryMaterial: "travertine", secondaryMaterial: "oatTaupeLacquer", accentMaterial: "agedBrass", cabinetVisual: { frontStyle: "slab", handleStyle: "groove", displayContents: true, interiorLighting: true, doorCount: 2 } };
setPositionMm(masterChest, 9260, 4550, 90);

for (const id of ["module-2f-cloak-left", "module-2f-cloak-right"]) {
  const item = furniture(id);
  item.name = id.endsWith("left") ? "2F 衣帽间西侧开放挂衣柜" : "2F 衣帽间东侧玻璃与布纹组合柜";
  item.material = "浅橡木开放柜体 + 暖米布纹柜门 + 烟灰玻璃 + 内嵌3000K灯带";
  item.note = "柜体尺寸和中央约1098mm通道保留；以样板间的浅木、布纹、玻璃和暖光层次替换普通平板柜。";
  item.render3d = { ...item.render3d, primaryMaterial: "warmOak", secondaryMaterial: "oatTaupeLacquer", accentMaterial: "agedBrass", variantId: id.endsWith("left") ? "openClosedMix" : "glassDisplay", cabinetVisual: { frontStyle: id.endsWith("left") ? "slab" : "glass", handleStyle: "groove", glassTone: "smoked", displayContents: true, interiorLighting: true, doorCount: 4, panelGapMm: 2 } };
}
const closetBench = furniture("module-2f-window-desk");
closetBench.name = "2F 衣帽间窗下低坐榻/收纳台";
closetBench.dimensions = { width: 100, depth: 50, height: 42, unit: "cm" };
closetBench.material = "浅橡木矮柜 + 暖米可拆坐垫 + 圆角端头";
closetBench.note = "参考样板间把标准高梳妆台改为窗下低坐榻，不遮挡北窗；保留可移动小件梳妆功能。";
closetBench.render3d = { ...closetBench.render3d, assetType: "generic", primaryMaterial: "warmOak", secondaryMaterial: "beigeFabric", accentMaterial: "agedBrass", variantId: "windowBench" };
setPositionMm(closetBench, 6526, 650, 0);
furniture("module-2f-cloak-left").hostWallId = "W-2F-004";

for (const id of ["furn-2f-guest-shower-001", "furn-2f-master-shower-001"]) {
  const item = furniture(id);
  item.material = "无框超白玻璃 + 暖灰洞石大板 + 深色壁龛 + 线性地漏";
  item.render3d = { ...item.render3d, primaryMaterial: "clearGlass", secondaryMaterial: "travertine", accentMaterial: "brushedBronze", wetAreaVisual: { ...(item.render3d?.wetAreaVisual ?? {}), frameFinish: "bronze", showNiche: true, showLinearDrain: true } };
}
for (const id of ["furn-2f-guest-vanity-001", "furn-2f-master-vanity-001"]) {
  const item = furniture(id);
  item.material = "浅洞石薄台面 + 暖米悬浮柜 + 通高镜柜 + 两侧乳白玻璃壁灯";
  item.render3d = { ...item.render3d, primaryMaterial: "travertine", secondaryMaterial: "oatTaupeLacquer", accentMaterial: "brushedBronze", wetAreaVisual: { ...(item.render3d?.wetAreaVisual ?? {}), floating: true, mirrorStyle: "cabinet", frameFinish: "bronze", mirrorHeightMm: 1050 } };
}
setPositionMm(furniture("furn-2f-master-shower-001"), 9085, 760, 0);
setPositionMm(furniture("furn-2f-master-vanity-001"), 9235, 2150, 90);

upsertFurniture(makeFurniture({ id: "furn-2f-bedroom1-balcony-desk-001", code: "DESK-2F-B1-01", name: "卧室1 封闭阳台东墙艺术书桌", type: "custom", assetType: "desk", variantId: "slimWritingDesk", roomId: "ROOM-2F-004", hostWallId: "W-2F-015", dimensions: { width: 80, depth: 45, height: 76 }, positionMm: { x: 3062, y: 8500 }, rotation: 90, material: "深烟熏木台面 + 浅橡木抽屉 + 做旧黄铜细节", note: "利用样板间封闭阳台作为绘画/阅读角；书桌深度控制450mm，南窗帘与柜门开启施工前复核。", primaryMaterial: "darkWalnut", secondaryMaterial: "warmOak", accentMaterial: "agedBrass", lightingDesignExcluded: true }));
workspace.furniture = workspace.furniture.filter((item) => item.id !== "furn-2f-bedroom1-study-chair-001");
upsertFurniture(makeFurniture({ id: "furn-2f-bedroom2-window-bench-001", code: "BENCH-2F-B2-01", name: "卧室2 南窗弧角休憩长凳", type: "sofa", assetType: "sofa", variantId: "roundedWindowBench", roomId: "ROOM-2F-005", dimensions: { width: 180, depth: 45, height: 45 }, positionMm: { x: 4669, y: 8700 }, rotation: 0, material: "暖白圈绒软包 + 深色悬浮脚", note: "参考样板间南窗前弧角长凳；保持通高固定窗和窗帘可用，不堆叠摆件。", primaryMaterial: "creamFabric", secondaryMaterial: "taupeFabric", accentMaterial: "darkWalnut" }));
upsertFurniture(makeFurniture({ id: "furn-2f-master-bay-bench-001", code: "BENCH-2F-MASTER-01", name: "主卧 飘窗前弧角长凳", type: "sofa", assetType: "sofa", variantId: "roundedWindowBench", roomId: "ROOM-2F-006", dimensions: { width: 90, depth: 40, height: 44 }, positionMm: { x: 7500, y: 7570 }, rotation: 0, material: "暖白圈绒软包 + 深色悬浮脚", note: "对应样板间窗前坐凳，但保留交付条件中的南向飘窗；缩短至900mm以让开衣柜操作面。", primaryMaterial: "creamFabric", secondaryMaterial: "taupeFabric", accentMaterial: "darkWalnut" }));

const ceilingSpecs = [
  ["C-2F-GUEST-BATH-SHOWROOM", "ROOM-2F-001", room("ROOM-2F-001").boundary, 2650, "客卫浅米矿物防潮平顶", "浅米防水矿物涂层"],
  ["C-2F-CLOSET-WOOD", "ROOM-2F-002", room("ROOM-2F-002").boundary, 2650, "衣帽间浅橡木拼板顶", "浅橡木饰面板 + 深色细缝"],
  ["C-2F-MASTER-BATH-SHOWROOM", "ROOM-2F-003", room("ROOM-2F-003").boundary, 2650, "主卫浅米矿物防潮平顶", "浅米防水矿物涂层"],
  ["C-2F-BEDROOM1-SHOWROOM", "ROOM-2F-004", room("ROOM-2F-004").boundary, 2760, "卧室1轻薄暖白平顶与南窗帘盒", "暖白石灰基涂层"],
  ["C-2F-BEDROOM2-SHOWROOM", "ROOM-2F-005", room("ROOM-2F-005").boundary, 2760, "卧室2轻薄暖白平顶与南窗帘盒", "暖白石灰基涂层"],
  ["C-2F-MASTER-SHOWROOM", "ROOM-2F-006", room("ROOM-2F-006").boundary, 2750, "主卧轻薄暖白平顶与床头洗墙槽", "暖白石灰基涂层"],
  ["C-2F-CORRIDOR-WOOD", "ROOM-2F-007", [{ x: 4146, y: 3050 }, { x: 7681, y: 3050 }, { x: 7681, y: 5150 }, { x: 4146, y: 5150 }], 2700, "走廊浅橡木拼板顶与黑钛细缝", "浅橡木饰面板 + 黑钛细缝"],
  ["C-2F-STAIR-WOOD", "ROOM-2F-008", room("ROOM-2F-008").boundary, 2700, "楼梯间浅橡木拼板顶", "浅橡木饰面板 + 暖灰收口"]
];
for (const [id, roomId, polygon, height, label, material] of ceilingSpecs) {
  upsertDrawingItem(ceilingItem({ id, roomId, polygon, height, label, material, notes: "参考2F样板间的轻薄平顶、木饰面拼板、暗缝和隐藏灯槽；风口、检修口与窗帘盒需深化。" }));
}

upsertDrawingItem({
  ...baseDrawingItem({ id: "F-2F-SHOWROOM-CONTINUOUS-01", roomId: "ROOM-2F-007", category: "floorFinish", type: "continuousFloorFinish", positionMm: { x: 6100, y: 4100 }, label: "2F 样板间暖灰米连续地面", notes: "走廊、衣帽间和三间卧室采用同色系细骨料微水泥/无缝地面意向；卫生间转浅洞石大板并以极窄金属条收口。" }),
  material: "暖灰米细骨料微水泥 + 浅洞石卫生间地面",
  pattern: "连续通铺，湿区窄条收口",
  seamWidthMm: 0,
  transition: "卫生间门下1–2mm深色金属条"
});
upsertDrawingItem({
  ...baseDrawingItem({ id: "WFIN-2F-MASTER-WARDROBE-01", roomId: "ROOM-2F-006", category: "wallFinish", type: "wardrobeInsteadOfWindow", positionMm: { x: 9495, y: 6500 }, label: "主卧样板侧窗改整面衣柜", notes: "用户明确确认的唯一样板间差异：W-2F-011不设侧窗，使用2200×600×2400mm整面衣柜；柜门开启和床侧净距按完成面复核。" }),
  hostWallId: "W-2F-011",
  relatedFurnitureId: masterWardrobe.id,
  relatedFurniturePositionMm: { x: 9195, y: 6500 },
  material: masterWardrobe.material,
  specialTreatment: "侧窗取消；通顶柜、圆角侧板、烟灰展示格、柜内灯"
});

Object.assign(drawing("L-2F-V1-13"), { positionMm: { x: 2100, y: 7000 }, heightMm: 2760, hostCeilingAreaId: "C-2F-BEDROOM1-SHOWROOM", label: "L-2F-V1-13 · 卧室1低眩光基础照明", notes: "2700K低眩光基础光，避开床头正上方并服务封闭阳台艺术角。", updatedAt: now });
Object.assign(drawing("L-2F-V1-14"), { positionMm: { x: 1100, y: 5380 }, heightMm: 1250, hostWallId: "W-2F-012", mountingType: "wallMounted", relatedFurniturePositionMm: { x: 1560, y: 6300 }, label: "L-2F-V1-14 · 卧室1左床头暖光壁灯", notes: "2700K低亮度定向壁灯，与床头软包竖缝对齐。", updatedAt: now });
Object.assign(drawing("L-2F-V1-15"), { positionMm: { x: 2020, y: 5380 }, heightMm: 1250, hostWallId: "W-2F-012", mountingType: "wallMounted", relatedFurniturePositionMm: { x: 1560, y: 6300 }, label: "L-2F-V1-15 · 卧室1右床头暖光壁灯", notes: "2700K低亮度定向壁灯，与床头软包竖缝对齐。", updatedAt: now });
Object.assign(drawing("L-2F-V1-16"), { positionMm: { x: 3062, y: 6800 }, hostWallId: "W-2F-015", relatedFurniturePositionMm: { x: 3062, y: 6800 }, updatedAt: now });
Object.assign(drawing("L-2F-V1-17"), { positionMm: { x: 3062, y: 8500 }, hostWallId: "W-2F-015", relatedFurnitureId: "furn-2f-bedroom1-balcony-desk-001", relatedFurniturePositionMm: { x: 3062, y: 8500 }, status: "draft", label: "L-2F-V1-17 · 卧室1封闭阳台艺术书桌功能灯", notes: "3000K高显色书桌功能灯，与南向自然光分时使用。", updatedAt: now });
Object.assign(drawing("L-2F-V1-18"), { positionMm: { x: 1560, y: 7400 }, relatedFurniturePositionMm: { x: 1560, y: 6300 }, updatedAt: now });
Object.assign(drawing("L-2F-V1-19"), { positionMm: { x: 2149, y: 8780 }, heightMm: 2680, hostWallId: "W-2F-021", hostCeilingAreaId: "C-2F-BEDROOM1-SHOWROOM", status: "draft", label: "L-2F-V1-19 · 卧室1南向通高窗帘盒灯带", notes: "2700K隐藏灯带，洗亮点状纱帘；窗帘轨道与固定窗收口复核。", updatedAt: now });

Object.assign(drawing("L-2F-V1-20"), { positionMm: { x: 4669, y: 7100 }, heightMm: 2760, hostCeilingAreaId: "C-2F-BEDROOM2-SHOWROOM", label: "L-2F-V1-20 · 卧室2低眩光基础照明", notes: "2700K低眩光基础光，避开床头正上方并覆盖南窗休憩区。", updatedAt: now });
Object.assign(drawing("L-2F-V1-21"), { positionMm: { x: 5850, y: 6300 }, heightMm: 1250, hostWallId: "W-2F-016", mountingType: "wallMounted", relatedFurniturePositionMm: { x: 4892, y: 6900 }, label: "L-2F-V1-21 · 卧室2北侧床头阅读灯", notes: "2700K定向阅读灯，与几何墙纸和暖木格栅床头整合。", updatedAt: now });
Object.assign(drawing("L-2F-V1-22"), { positionMm: { x: 5850, y: 7500 }, heightMm: 1250, hostWallId: "W-2F-016", mountingType: "wallMounted", relatedFurniturePositionMm: { x: 4892, y: 6900 }, label: "L-2F-V1-22 · 卧室2南侧床头阅读灯", notes: "2700K定向阅读灯，与几何墙纸和暖木格栅床头整合。", updatedAt: now });
Object.assign(drawing("L-2F-V1-23"), { positionMm: { x: 5120, y: 5450 }, hostWallId: "W-2F-013", relatedFurniturePositionMm: { x: 5120, y: 5450 }, updatedAt: now });
Object.assign(drawing("L-2F-V1-24"), { positionMm: { x: 4669, y: 8500 }, relatedFurnitureId: "furn-2f-bedroom2-window-bench-001", relatedFurniturePositionMm: { x: 4669, y: 8700 }, status: "draft", label: "L-2F-V1-24 · 卧室2南窗休憩区重点光", notes: "3000K小角度重点光，弱化为展示氛围，不做密集筒灯。", updatedAt: now });
Object.assign(drawing("L-2F-V1-25"), { positionMm: { x: 4892, y: 7650 }, relatedFurniturePositionMm: { x: 4892, y: 6900 }, updatedAt: now });
Object.assign(drawing("L-2F-V1-26"), { positionMm: { x: 4669, y: 8780 }, heightMm: 2680, hostWallId: "W-2F-022", hostCeilingAreaId: "C-2F-BEDROOM2-SHOWROOM", status: "draft", label: "L-2F-V1-26 · 卧室2南向通高窗帘盒灯带", notes: "2700K隐藏灯带，洗亮点状纱帘；窗帘轨道与固定窗收口复核。", updatedAt: now });
Object.assign(drawing("L-2F-V1-27"), { positionMm: { x: 8400, y: 4700 }, heightMm: 2750, hostCeilingAreaId: "C-2F-MASTER-SHOWROOM", label: "L-2F-V1-27 · 主卧入口与衣柜前低眩光基础照明", notes: "2700K基础光布置在入口和衣柜前，不压床头正上方。", updatedAt: now });
Object.assign(drawing("L-2F-V1-28"), { positionMm: { x: 5900, y: 3950 }, heightMm: 2700, hostCeilingAreaId: "C-2F-CORRIDOR-WOOD", label: "L-2F-V1-28 · 走廊木顶嵌入式微型筒灯", notes: "2700K小直径深杯灯，按木饰面拼缝居中，数量克制。", updatedAt: now });
Object.assign(drawing("L-2F-V1-29"), { heightMm: 2700, hostCeilingAreaId: "C-2F-STAIR-WOOD", label: "L-2F-V1-29 · 楼梯木顶低眩光灯", updatedAt: now });
Object.assign(drawing("L-2F-V1-09"), { positionMm: { x: 9235, y: 2150 }, relatedFurniturePositionMm: { x: 9235, y: 2150 }, updatedAt: now });
Object.assign(drawing("L-2F-V1-10"), { positionMm: { x: 9085, y: 760 }, relatedFurniturePositionMm: { x: 9085, y: 760 }, updatedAt: now });

// The closet's former vanity is now a low window bench. Keep its useful point
// as a manually authored accent pair instead of leaving an obsolete generated
// vanity-light key that the idempotent generator would remove.
const closetAccent = drawing("L-2F-V1-07");
delete closetAccent.generatedKey;
delete closetAccent.generatedFingerprint;
Object.assign(closetAccent, {
  type: "accentSpotlight",
  lightType: "accentSpotlight",
  lightingLayer: "accent",
  positionMm: { x: 6526, y: 650 },
  heightMm: 2650,
  mountingType: "recessed",
  hostCeilingAreaId: "C-2F-CLOSET-WOOD",
  relatedFurnitureId: closetBench.id,
  relatedFurniturePositionMm: { x: 6526, y: 650 },
  controlGroupId: "CG-2F-2F-002-VANITY",
  lightGroupId: "CG-2F-2F-002-VANITY",
  label: "L-2F-V1-07 · 衣帽间窗下坐榻重点光",
  notes: "3000K高显色小角度重点光，照亮窗下坐榻和小件梳妆区，不做传统镜前顶光。",
  source: "generated-from-room",
  status: "draft",
  updatedAt: now
});
const closetAccentSwitch = drawing("SW-2F-V1-07");
delete closetAccentSwitch.generatedKey;
delete closetAccentSwitch.generatedFingerprint;
Object.assign(closetAccentSwitch, {
  controlGroupId: "CG-2F-2F-002-VANITY",
  lightGroupId: "CG-2F-2F-002-VANITY",
  controlledLightIds: [closetAccent.id],
  relatedLightIds: [closetAccent.id],
  label: "SW-2F-V1-07 · 衣帽间窗下重点光控制",
  notes: "控制衣帽间窗下坐榻重点光，与柜内灯分组。",
  source: "generated-from-room",
  status: "draft",
  updatedAt: now
});
closetAccent.relatedSwitchId = closetAccentSwitch.id;

addManualLightGroup({
  groupId: "CG-2F-SHOWROOM-MASTER-MOOD",
  switchId: "SW-2F-SHOWROOM-MASTER-MOOD-01",
  roomId: "ROOM-2F-006",
  switchPosition: { x: 7850, y: 3300 },
  lights: [
    { id: "L-2F-SHOWROOM-MASTER-BEDSIDE-01", type: "bedsideReadingLight", positionMm: { x: 6170, y: 5650 }, heightMm: 1250, layer: "decorative", mountingType: "wallMounted", hostWallId: "W-2F-016", powerW: 6, luminousFluxLm: 420, glareRating: "独立调光", fixtureFamily: "bed-reading", trimColor: "做旧黄铜 / 暖棕", label: "主卧北侧床头阅读灯", notes: "2700K定向暖光，与植物纹墙布两侧洗墙层次结合。" },
    { id: "L-2F-SHOWROOM-MASTER-BEDSIDE-02", type: "bedsideReadingLight", positionMm: { x: 6170, y: 7350 }, heightMm: 1250, layer: "decorative", mountingType: "wallMounted", hostWallId: "W-2F-016", powerW: 6, luminousFluxLm: 420, glareRating: "独立调光", fixtureFamily: "bed-reading", trimColor: "做旧黄铜 / 暖棕", label: "主卧南侧床头阅读灯", notes: "2700K定向暖光，与植物纹墙布两侧洗墙层次结合。" },
    { id: "L-2F-SHOWROOM-MASTER-COVE-01", type: "indirectLinearLight", positionMm: { x: 7550, y: 6500 }, heightMm: 2710, layer: "decorative", mountingType: "concealed", hostCeilingAreaId: "C-2F-MASTER-SHOWROOM", powerW: 12, luminousFluxLm: 900, glareRating: "不可见光源", fixtureFamily: "continuous-cove-strip", trimColor: "隐藏安装", label: "主卧床头与窗帘盒间接灯槽", notes: "2700K连续柔光，形成样板间暖色包裹感。" },
    { id: "L-2F-SHOWROOM-MASTER-WARDROBE-01", type: "wardrobeSensorStrip", positionMm: { x: 9195, y: 6500 }, heightMm: 2100, layer: "cabinetStrip", mountingType: "cabinetIntegrated", hostWallId: "W-2F-011", relatedFurnitureId: masterWardrobe.id, powerW: 8, luminousFluxLm: 650, glareRating: "门控感应", fixtureFamily: "cabinet-strip", trimColor: "隐藏铝型材", label: "主卧侧窗位置衣柜感应灯", notes: "3000K高显色柜内灯，明确服务用户指定的整面衣柜。", colorTemperature: "3000K" }
  ]
});

addManualLightGroup({
  groupId: "CG-2F-SHOWROOM-BEDROOM-COVE",
  switchId: "SW-2F-SHOWROOM-BEDROOM-COVE-01",
  roomId: "ROOM-2F-004",
  switchPosition: { x: 3150, y: 5300 },
  lights: [
    { id: "L-2F-SHOWROOM-BEDROOM1-COVE-01", type: "indirectLinearLight", positionMm: { x: 2274, y: 7000 }, heightMm: 2720, layer: "decorative", mountingType: "concealed", hostCeilingAreaId: "C-2F-BEDROOM1-SHOWROOM", powerW: 10, luminousFluxLm: 800, glareRating: "不可见光源", fixtureFamily: "continuous-cove-strip", trimColor: "隐藏安装", label: "卧室1周边柔光灯槽", notes: "2700K柔光，串联床头软包和封闭阳台艺术角。" }
  ]
});

workspace.roomTourViews = workspace.roomTourViews.filter((item) => ![
  "tour-2F-ROOM-2F-002",
  "tour-2F-ROOM-2F-004",
  "tour-2F-ROOM-2F-005",
  "tour-2F-ROOM-2F-006",
  "tour-showroom-2F-ROOM-2F-006"
].includes(item.id));
upsertRoomTourView(roomTourOverride({ id: "tour-showroom-2F-ROOM-2F-002", roomId: "ROOM-2F-002", name: "2F 衣帽间样板视角", cameraPosition: { x: 1.2, y: 1.45, z: -3.15 }, target: { x: 1.2, y: 1.05, z: -1.0 }, fov: 64, description: "从衣帽间入口看向窗下坐榻及两侧通顶柜，检查中央通道、玻璃柜和木顶。" }));
upsertRoomTourView(roomTourOverride({ id: "tour-showroom-2F-ROOM-2F-004", roomId: "ROOM-2F-004", name: "2F 卧室1样板视角", cameraPosition: { x: -3.1, y: 1.45, z: 1.0 }, target: { x: -4.25, y: 1.0, z: 2.65 }, fov: 68, description: "从北侧入口看床头、通顶衣柜和封闭阳台艺术书桌。" }));
upsertRoomTourView(roomTourOverride({ id: "tour-showroom-2F-ROOM-2F-005", roomId: "ROOM-2F-005", name: "2F 卧室2样板视角", cameraPosition: { x: -2.4, y: 1.45, z: 1.0 }, target: { x: -1.0, y: 1.0, z: 2.65 }, fov: 68, description: "从北侧入口看几何床头墙、暖棕软包床及南窗弧角长凳。" }));

if (!workspace.updatedAt || workspace.updatedAt < now) workspace.updatedAt = now;
if (!workspace.drawingPackage.updatedAt || workspace.drawingPackage.updatedAt < now) workspace.drawingPackage.updatedAt = now;

// Adding explicit ceiling hosts and moving furniture intentionally changes the
// generated proposal. Preserve the approved points as manual overrides while
// teaching the generator their new expected fingerprint, so reruns stay stable.
const lightingPreview = generateLightingDesignV1({
  structuresByFloor: workspace.houseStructuresByFloor,
  furniture: workspace.furniture,
  existingItems: workspace.drawingItems,
  floorIds: ["2F"],
  now
});
if (lightingPreview.created !== 0) {
  const existingGeneratedKeys = new Set(workspace.drawingItems.map((item) => item.generatedKey).filter(Boolean));
  const createdItems = lightingPreview.items.filter((item) => item.generatedKey && !existingGeneratedKeys.has(item.generatedKey));
  throw new Error(`2F showroom refinement would create ${lightingPreview.created} unexpected generated item(s): ${createdItems.map((item) => `${item.id}/${item.generatedKey}/${item.label}`).join("; ")}`);
}
const previewByGeneratedKey = new Map(lightingPreview.items.filter((item) => item.generatedKey).map((item) => [item.generatedKey, item]));
for (const item of workspace.drawingItems) {
  if (!item.generatedKey) continue;
  const preview = previewByGeneratedKey.get(item.generatedKey);
  if (preview?.generatedFingerprint) item.generatedFingerprint = preview.generatedFingerprint;
}

fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);
console.log("Applied confirmed 2F showroom Plan D: sample-room finishes and furniture, enclosed bedroom balconies, adjusted bedroom walls, and main-bedroom side window replaced by wardrobe.");
