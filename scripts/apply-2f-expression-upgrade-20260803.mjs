import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateLightingDesignV1 } from "../lib/lighting-design.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const structure = workspace.houseStructuresByFloor["2F"];
const now = "2026-08-03T12:00:00.000Z";

const estimateMeta = {
  status: "estimated",
  source: "visual-estimate",
  sourceNote: "依据用户确认的2F样板间造型与尺寸改造范围实施；尺寸来自视频/照片比例和常见构件尺度，建筑外框、楼梯及主卧侧窗改衣柜为硬约束，施工前须按完成面复核。",
  toleranceMm: 100
};

function byId(items, id, label) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing ${label}: ${id}`);
  return item;
}

const room = (id) => byId(structure.rooms, id, "room");
const furniture = (id) => byId(workspace.furniture, id, "furniture");
const door = (id) => byId(structure.doors, id, "door");

function setPositionMm(item, xMm, yMm, rotation = item.position.rotation) {
  item.position = {
    x: xMm / structure.coordinateSystem.width * 100,
    y: yMm / structure.coordinateSystem.height * 100,
    rotation
  };
}

function updateFurnitureDimensions(id, dimensions, reserveSize, note) {
  const item = furniture(id);
  item.dimensions = { ...item.dimensions, ...dimensions, unit: "cm" };
  item.constructionNote = note;
  item.constructionMeta ??= {};
  item.constructionMeta.reserveSize = reserveSize;
  item.constructionMeta.notes = note;
  item.mepMeta ??= {};
  item.mepMeta.notes = note;
  return item;
}

function upsertDrawingItem(next) {
  const existingIndex = workspace.drawingItems.findIndex((item) => item.id === next.id);
  const existing = existingIndex >= 0 ? workspace.drawingItems[existingIndex] : null;
  const item = {
    id: next.id,
    floorId: "2F",
    roomId: next.roomId ?? null,
    category: next.category,
    type: next.type,
    positionMm: next.positionMm,
    hostObjectId: next.hostObjectId ?? null,
    hostWallId: next.hostWallId ?? null,
    relatedFurnitureId: next.relatedFurnitureId ?? null,
    heightMm: next.heightMm ?? null,
    circuitId: next.circuitId ?? null,
    materialId: next.materialId ?? null,
    label: next.label,
    notes: next.notes,
    source: "manual",
    status: next.status ?? "draft",
    quantity: next.quantity ?? 1,
    relatedRoomId: next.roomId ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    verificationMeta: estimateMeta,
    ...next
  };
  if (existingIndex >= 0) workspace.drawingItems[existingIndex] = { ...existing, ...item };
  else workspace.drawingItems.push(item);
  workspace.drawingPackage.drawingItemIds ??= [];
  if (!workspace.drawingPackage.drawingItemIds.includes(next.id)) workspace.drawingPackage.drawingItemIds.push(next.id);
  return item;
}

function upsertTourView(next) {
  workspace.roomTourViews ??= [];
  const index = workspace.roomTourViews.findIndex((item) => item.id === next.id);
  const item = {
    id: next.id,
    floorId: "2F",
    roomId: next.roomId,
    name: next.name,
    type: "room",
    cameraPosition: next.cameraPosition,
    target: next.target,
    yaw: Math.atan2(next.target.x - next.cameraPosition.x, next.target.z - next.cameraPosition.z),
    pitch: Math.atan2(next.target.y - next.cameraPosition.y, Math.hypot(next.target.x - next.cameraPosition.x, next.target.z - next.cameraPosition.z)),
    fov: next.fov ?? 66,
    linkedNodeIds: [],
    description: next.description,
    status: "active"
  };
  if (index >= 0) workspace.roomTourViews[index] = { ...workspace.roomTourViews[index], ...item };
  else workspace.roomTourViews.push(item);
}

function setRoomWallFinish(roomId, finish) {
  const target = room(roomId);
  target.surfaceFinishes ??= {};
  target.surfaceFinishes.wall = { ...(target.surfaceFinishes.wall ?? {}), ...finish };
}

function setWallFaceFinish(wallId, roomId, finish) {
  const target = byId(structure.walls, wallId, "wall");
  target.surfaceFinishByRoomId ??= {};
  target.surfaceFinishByRoomId[roomId] = { ...(target.surfaceFinishByRoomId[roomId] ?? {}), ...finish };
}

// Room-wide finishes: the wallcovering resources are project-authored procedural
// approximations of the supplied photos, so no third-party pattern file is used.
setRoomWallFinish("ROOM-2F-004", {
  material: "textileWallcovering",
  name: "2F样板间黑灰手绘线条墙布 + 暖灰矿物漆",
  baseColor: "#d4c9ba",
  textureAccent: "#4d4944",
  roughness: 0.9,
  textureScale: 2.4,
  materialResourceId: "showroomGraphicWallcovering2F",
  physicalWidthMm: 1200,
  physicalHeightMm: 2400,
  uvRotationDeg: 0
});
setRoomWallFinish("ROOM-2F-005", {
  material: "textileWallcovering",
  name: "2F样板间低对比植物织物墙布 + 暖灰矿物漆",
  baseColor: "#d8cbbb",
  textureAccent: "#9f8e7a",
  roughness: 0.93,
  textureScale: 2.6,
  materialResourceId: "showroomBotanicalTextile2F",
  physicalWidthMm: 1400,
  physicalHeightMm: 2800,
  uvRotationDeg: 0
});
setRoomWallFinish("ROOM-2F-006", {
  material: "textileWallcovering",
  name: "2F样板间低对比植物织物墙布 + 暖米护墙",
  baseColor: "#d8cbbb",
  textureAccent: "#9f8e7a",
  roughness: 0.93,
  textureScale: 2.6,
  materialResourceId: "showroomBotanicalTextile2F",
  physicalWidthMm: 1400,
  physicalHeightMm: 2800,
  uvRotationDeg: 0
});

setWallFaceFinish("W-2F-012", "ROOM-2F-004", {
  material: "textileWallcovering",
  name: "卧室1黑灰手绘线条墙布床头主面",
  baseColor: "#d4c9ba",
  textureAccent: "#4d4944",
  roughness: 0.9,
  textureScale: 2.4,
  materialResourceId: "showroomGraphicWallcovering2F",
  physicalWidthMm: 1200,
  physicalHeightMm: 2400,
  uvRotationDeg: 0
});
for (const roomId of ["ROOM-2F-005", "ROOM-2F-006"]) {
  setWallFaceFinish("W-2F-016", roomId, {
    material: "textileWallcovering",
    name: `${roomId === "ROOM-2F-005" ? "卧室2" : "主卧"}低对比植物织物墙布床头主面`,
    baseColor: "#d8cbbb",
    textureAccent: "#9f8e7a",
    roughness: 0.93,
    textureScale: 2.6,
    materialResourceId: "showroomBotanicalTextile2F",
    physicalWidthMm: 1400,
    physicalHeightMm: 2800,
    uvRotationDeg: 0
  });
}

const wallFinishZones = [
  {
    id: "WFIN-2F-B1-GRAPHIC-01",
    roomId: "ROOM-2F-004",
    hostWallId: "W-2F-012",
    positionMm: { x: 2149, y: 5150 },
    label: "卧室1床头黑灰手绘线条墙布分区",
    notes: "对应样板间床头主面；保留8mm阴影分缝，造型层不移动结构墙。",
    resourceId: "showroomGraphicWallcovering2F",
    panelWidthMm: 600,
    endOffsetMm: 2397
  },
  {
    id: "WFIN-2F-B2-BOTANICAL-01",
    roomId: "ROOM-2F-005",
    hostWallId: "W-2F-016",
    positionMm: { x: 5992, y: 6475 },
    label: "卧室2床头植物织物墙布分区",
    notes: "沿卧室2与主卧共墙的卧室侧形成连续床头主面；按完成面复核墙布收口。",
    resourceId: "showroomBotanicalTextile2F",
    panelWidthMm: 700,
    endOffsetMm: 2650
  },
  {
    id: "WFIN-2F-MASTER-BOTANICAL-01",
    roomId: "ROOM-2F-006",
    hostWallId: "W-2F-016",
    positionMm: { x: 5992, y: 6475 },
    label: "主卧床头植物织物墙布与窄分缝",
    notes: "对应主卧样板间低对比植物纹床头主面；侧窗位置仍由衣柜替代。",
    resourceId: "showroomBotanicalTextile2F",
    panelWidthMm: 700,
    endOffsetMm: 2650
  },
  {
    id: "WFIN-2F-CORRIDOR-OAK-01",
    roomId: "ROOM-2F-007",
    hostWallId: "W-2F-013",
    positionMm: { x: 4669, y: 5150 },
    label: "二楼走廊浅橡木护墙与布纹门墙",
    notes: "走廊采用浅橡木竖纹分板、黑钛细缝与平墙门；仅增加饰面厚度。",
    resourceId: "showroomWarmOakVertical",
    panelWidthMm: 620,
    endOffsetMm: 2645
  }
];

for (const zone of wallFinishZones) {
  upsertDrawingItem({
    id: zone.id,
    roomId: zone.roomId,
    category: "wallFinish",
    type: "parameterizedWallFinishZone",
    positionMm: zone.positionMm,
    hostWallId: zone.hostWallId,
    materialId: zone.resourceId,
    label: zone.label,
    notes: zone.notes,
    wallFinishZone: {
      startOffsetMm: 0,
      endOffsetMm: zone.endOffsetMm,
      bottomMm: 80,
      topMm: 2680,
      buildUpMm: 18,
      panelWidthMm: zone.panelWidthMm,
      seamWidthMm: 8,
      seamDepthMm: 6,
      materialResourceId: zone.resourceId
    }
  });
}

const masterSplinePath = [
  { x: 6240, y: 5480 },
  { x: 6900, y: 5260 },
  { x: 7900, y: 5320 },
  { x: 8870, y: 5710 },
  { x: 9110, y: 6500 },
  { x: 8780, y: 7350 },
  { x: 7800, y: 7580 },
  { x: 6800, y: 7440 },
  { x: 6200, y: 6840 }
];

upsertDrawingItem({
  id: "C-2F-MASTER-SPLINE-01",
  roomId: "ROOM-2F-006",
  category: "ceiling",
  type: "showroomSplineFloatingCeiling",
  positionMm: { x: 7650, y: 6450 },
  heightMm: 2680,
  ceilingHeightMm: 2680,
  material: "暖白矿物涂层曲线悬浮顶",
  label: "主卧样板间有机曲线悬浮顶",
  notes: "曲线依据视频观感转译，不改楼层高度；完成面标高2680mm，最低灯槽约2660mm，施工前复核空调与检修口。",
  splineCeilingProfile: {
    pathMm: masterSplinePath,
    levelMm: 2680,
    thicknessMm: 90,
    pathMode: "catmullRom",
    closed: true,
    curveSegments: 96,
    edgeRadiusMm: 14,
    materialResourceId: "showroomLimePlaster"
  }
});

upsertDrawingItem({
  id: "CV-2F-MASTER-SPLINE-01",
  roomId: "ROOM-2F-006",
  category: "ceiling",
  type: "parameterizedCurvedCove",
  positionMm: { x: 7650, y: 6450 },
  heightMm: 2750,
  ceilingHeightMm: 2750,
  label: "主卧曲线悬浮顶2700K间接灯槽",
  notes: "灯带藏于曲线顶后沿，控制连续出光与床头洗墙层次；不替代施工照明计算。",
  coveProfile: {
    pathMm: masterSplinePath,
    dropMm: 90,
    bandWidthMm: 110,
    lipMm: 24,
    cornerRadiusMm: 180,
    emitterOffsetMm: 35,
    pathMode: "catmullRom",
    closed: true,
    curveSegments: 96
  }
});

for (const cove of [
  { id: "CV-2F-B1-PERIMETER-01", roomId: "ROOM-2F-004", x1: 1120, x2: 3170, y1: 5330, y2: 7620, label: "卧室1轻薄周边灯槽" },
  { id: "CV-2F-B2-PERIMETER-01", roomId: "ROOM-2F-005", x1: 3520, x2: 5810, y1: 5330, y2: 7620, label: "卧室2轻薄周边灯槽" }
]) {
  upsertDrawingItem({
    id: cove.id,
    roomId: cove.roomId,
    category: "ceiling",
    type: "parameterizedPerimeterCove",
    positionMm: { x: (cove.x1 + cove.x2) / 2, y: (cove.y1 + cove.y2) / 2 },
    heightMm: 2760,
    ceilingHeightMm: 2760,
    label: cove.label,
    notes: "采用100mm薄跌级与20mm藏光唇，保持卧室净高；窗帘盒和风口需在同一深化图协调。",
    coveProfile: {
      pathMm: [
        { x: cove.x1, y: cove.y1 }, { x: cove.x2, y: cove.y1 },
        { x: cove.x2, y: cove.y2 }, { x: cove.x1, y: cove.y2 }, { x: cove.x1, y: cove.y1 }
      ],
      dropMm: 100,
      bandWidthMm: 90,
      lipMm: 20,
      cornerRadiusMm: 80,
      emitterOffsetMm: 30,
      pathMode: "linear",
      closed: true
    }
  });
}

upsertDrawingItem({
  id: "HVAC-2F-CLOSET-LINEAR-01",
  roomId: "ROOM-2F-002",
  category: "ceiling",
  type: "linearSlotDiffuser",
  positionMm: { x: 6500, y: 1700 },
  heightMm: 2650,
  ceilingHeightMm: 2650,
  label: "衣帽间木顶三槽线性风口",
  notes: "风口沿通道方向布置并与木顶分缝对齐；长度、风量和检修方式需暖通深化。",
  linearDiffuser: {
    pathMm: [{ x: 6500, y: 620 }, { x: 6500, y: 2780 }],
    widthMm: 72,
    depthMm: 18,
    slotCount: 3,
    finish: "darkBronze"
  }
});

for (const baseboard of [
  { id: "BB-2F-B1-01", roomId: "ROOM-2F-004", wallIds: ["W-2F-012", "W-2F-015", "W-2F-021", "W-2F-010"] },
  { id: "BB-2F-B2-01", roomId: "ROOM-2F-005", wallIds: ["W-2F-013", "W-2F-016", "W-2F-022", "W-2F-015"] },
  { id: "BB-2F-MASTER-01", roomId: "ROOM-2F-006", wallIds: ["W-2F-009", "W-2F-011", "W-2F-020", "W-2F-016", "W-2F-014", "W-2F-017"] },
  { id: "BB-2F-CORRIDOR-01", roomId: "ROOM-2F-007", wallIds: ["W-2F-007", "W-2F-008", "W-2F-009", "W-2F-017", "W-2F-014", "W-2F-013", "W-2F-012"] }
]) {
  upsertDrawingItem({
    id: baseboard.id,
    roomId: baseboard.roomId,
    category: "wallFinish",
    type: "recessedBaseboardRun",
    positionMm: { x: 6000, y: 5000 },
    label: `${baseboard.roomId} 同墙色内凹窄踢脚`,
    notes: "60mm高、约10mm厚，同墙色并以窄阴影缝收口；门套和柜侧板处连续。",
    baseboardRun: { wallIds: baseboard.wallIds, heightMm: 60, thicknessMm: 10, recessMm: 4, finish: "wallColor" }
  });
}

upsertDrawingItem({
  id: "F-2F-MASTER-BATH-SLAB-01",
  roomId: "ROOM-2F-003",
  category: "floorFinish",
  type: "coordinatedStoneSlabLayout",
  positionMm: { x: 8588, y: 1700 },
  label: "主卫暖白灰纹石材连续排版",
  notes: "地墙使用同系列暖白灰纹石材，600×1200mm地面模数与1600×2800mm墙面大板按主视面连续排版。",
  material: "stone",
  slabLayout: {
    slabWidthMm: 1600,
    slabHeightMm: 2800,
    seamWidthMm: 1.5,
    directionDeg: 0,
    continuityGroup: "2F-MASTER-BATH-WARM-STONE",
    bookmatched: false
  }
});

// Existing showroom ceilings remain design-approved, but their elevations are
// visual estimates rather than survey data.
for (const item of workspace.drawingItems.filter((candidate) => candidate.floorId === "2F" && candidate.category === "ceiling" && candidate.id.startsWith("C-2F-"))) {
  item.status = "draft";
  item.verificationMeta = estimateMeta;
  item.updatedAt = now;
}

// Doors: taller bedroom doors, flush reveals, and deep-lined glazed portals.
for (const id of ["D-2F-002", "D-2F-003", "D-2F-004"]) {
  const item = door(id);
  item.height = 2300;
  item.name = `${id} · 暖米灰平墙通高门`;
  item.visual = {
    ...(item.visual ?? {}),
    style: "flushPanel",
    jambMode: "flush",
    liningDepthMm: 220,
    revealWidthMm: 8,
    thresholdHeightMm: 0,
    woodColor: "#b7a38d",
    frameColor: "#51473e",
    hardwareColor: "#6b5848",
    finishMaterialResourceId: "showroomWarmOakVertical"
  };
  item.verificationMeta = estimateMeta;
}
for (const id of ["D-2F-006", "D-2F-007"]) {
  const item = door(id);
  item.height = 2200;
  item.visual = {
    ...(item.visual ?? {}),
    style: "flushPanel",
    jambMode: "flush",
    liningDepthMm: 220,
    revealWidthMm: 8,
    thresholdHeightMm: 8,
    woodColor: "#a88f75",
    frameColor: "#5a4d43",
    hardwareColor: "#675445",
    finishMaterialResourceId: "showroomWarmOakVertical"
  };
  item.verificationMeta = estimateMeta;
}
for (const id of ["D-2F-009", "D-2F-010"]) {
  const item = door(id);
  item.visual = {
    ...(item.visual ?? {}),
    style: "slimGlass",
    jambMode: "portal",
    liningDepthMm: 220,
    revealWidthMm: 18,
    thresholdHeightMm: 8,
    frameColor: "#51473e",
    hardwareColor: "#75624e",
    glassColor: "#dfe5e2",
    finishMaterialResourceId: "showroomDarkBronze"
  };
  item.verificationMeta = estimateMeta;
}

// Cabinet fronts now use explicit per-bay proportions and real top/side/plinth gaps.
for (const [id, bays] of [
  ["module-2f-cloak-left", [
    { widthRatio: 1.15, frontType: "open", shelfCount: 4, interiorLighting: true },
    { widthRatio: 0.9, frontType: "solid" },
    { widthRatio: 0.95, frontType: "drawer", shelfCount: 4 }
  ]],
  ["module-2f-cloak-right", [
    { widthRatio: 1, frontType: "glass", shelfCount: 4, interiorLighting: true },
    { widthRatio: 1, frontType: "glass", shelfCount: 4, interiorLighting: true },
    { widthRatio: 0.85, frontType: "solid" }
  ]],
  ["furn-2f-master-bedroom-large-wardrobe-001", [
    { widthRatio: 1.1, frontType: "solid" },
    { widthRatio: 0.72, frontType: "glass", shelfCount: 4, interiorLighting: true },
    { widthRatio: 1.18, frontType: "solid" }
  ]],
  ["furn-2f-bedroom1-wardrobe-001", [
    { widthRatio: 1, frontType: "solid" }, { widthRatio: 1, frontType: "solid" }, { widthRatio: 0.8, frontType: "open", shelfCount: 3, interiorLighting: true }
  ]],
  ["module-2f-wardrobe-002", [
    { widthRatio: 1, frontType: "solid" }, { widthRatio: 1, frontType: "solid" }, { widthRatio: 1, frontType: "solid" }
  ]]
]) {
  const item = furniture(id);
  item.render3d ??= {};
  item.render3d.cabinetVisual = {
    ...(item.render3d.cabinetVisual ?? {}),
    ...(["module-2f-cloak-left", "module-2f-cloak-right"].includes(id) ? { allDoorPanels: false } : {}),
    topGapMm: 50,
    sideGapMm: 20,
    plinthSetbackMm: 80,
    sideScribeMm: 25,
    bays
  };
}

const masterWardrobe = updateFurnitureDimensions(
  "furn-2f-master-bedroom-large-wardrobe-001",
  { width: 220, depth: 60, height: 260 },
  "220x60x260cm",
  "样板间侧窗位置改为2200×600×2600mm整面衣柜；距2750mm吊顶约150mm，床侧通道约903mm。尺寸为视觉估算，施工前复核门板开启、插座、灯带电源和南端收口。"
);
masterWardrobe.note = "用户明确指定：样板间主卧多出的侧窗不设置，该位置改为2200×600×2600mm整面衣柜；W-2F-011不得新增窗洞。";
masterWardrobe.render3d.primaryMaterial = "showroomOatTaupe";
masterWardrobe.render3d.primaryMaterialResourceId = "showroomOatTaupeLacquer";
masterWardrobe.render3d.secondaryMaterial = "showroomWarmOak";
masterWardrobe.render3d.secondaryMaterialResourceId = "showroomWarmOakVertical";

const closetBench = furniture("module-2f-window-desk");
closetBench.constructionNote = "窗下低坐榻完成尺寸1000×500×420mm；复核窗扇开启、插座、坐垫厚度和两侧柜体收口。";
closetBench.constructionMeta.reserveSize = "100x50x42cm";
closetBench.constructionMeta.notes = closetBench.constructionNote;
closetBench.mepMeta.notes = "坐榻侧边预留充电位与可拆检修口，不再按800mm高梳妆台预留。";
closetBench.render3d.primaryMaterial = "showroomWarmOak";
closetBench.render3d.primaryMaterialResourceId = "showroomWarmOakVertical";
closetBench.render3d.secondaryMaterial = "showroomBoucleCream2F";
closetBench.render3d.secondaryMaterialResourceId = "showroomBoucleCream2F";

const bedroom1Bed = furniture("furn-2f-bedroom1-bed-001");
bedroom1Bed.render3d.primaryMaterial = "showroomWovenFabric";
bedroom1Bed.render3d.primaryMaterialResourceId = "showroomWovenHeadboard";
bedroom1Bed.render3d.bedVisual = { headboardStyle: "standard", panelCount: 8, panelGapMm: 8, topBandHeightMm: 180, underBedLighting: true };
bedroom1Bed.material = "浅米织物床体 + 暖木细框 + 床底暖光";

const bedroom2Bed = updateFurnitureDimensions(
  "furn-2f-bedroom2-bed-001",
  { width: 140, depth: 200, height: 95 },
  "140x200x95cm",
  "床宽由1300mm调整为1400mm以接近样板间软包比例；两侧通道按完成面复核，床底灯带设低压检修电源。"
);
bedroom2Bed.render3d.primaryMaterial = "showroomRustStripe2F";
bedroom2Bed.render3d.primaryMaterialResourceId = "showroomRustStripeUpholstery2F";
bedroom2Bed.render3d.bedVisual = { headboardStyle: "standard", panelCount: 7, panelGapMm: 7, topBandHeightMm: 170, underBedLighting: true };
bedroom2Bed.material = "锈橙与燕麦条纹织物软包 + 暖木细框";

const masterBed = furniture("furn-2f-master-bedroom-bed-001");
masterBed.render3d.primaryMaterial = "showroomWovenFabric";
masterBed.render3d.primaryMaterialResourceId = "showroomWovenHeadboard";
masterBed.render3d.bedVisual = { headboardStyle: "standard", panelCount: 7, panelGapMm: 9, topBandHeightMm: 190, underBedLighting: true };

for (const id of ["furn-2f-bedroom2-window-bench-001", "furn-2f-master-bay-bench-001"]) {
  const item = furniture(id);
  item.render3d.primaryMaterial = "showroomBoucleCream2F";
  item.render3d.primaryMaterialResourceId = "showroomBoucleCream2F";
}
const masterBench = updateFurnitureDimensions(
  "furn-2f-master-bay-bench-001",
  { width: 140, depth: 48, height: 45 },
  "140x48x45cm",
  "弧角长凳由900mm加宽至1400mm、进深480mm，以接近样板间窗前坐榻比例；不得侵占衣柜开启和主通道。"
);
setPositionMm(masterBench, 6600, 7570, 0);

// Main bathroom equipment is enlarged within the unchanged 1814×2700mm shell.
const masterShower = updateFurnitureDimensions(
  "furn-2f-master-shower-001",
  { width: 90, depth: 90, height: 210 },
  "90x90x210cm",
  "主卫淋浴由800×800mm调整为900×900mm；入口朝南，复核玻璃门开启、冷热水、线性地漏、壁龛和挡水条。"
);
masterShower.name = "主卫东北角 900mm 无框玻璃淋浴间";
setPositionMm(masterShower, 9045, 800, 0);
if (masterShower.constructionAnchors?.openingSizeMm) masterShower.constructionAnchors.openingSizeMm.width = 700;

const masterBathtub = updateFurnitureDimensions(
  "furn-2f-master-bathtub-001",
  { width: 170, depth: 70, height: 58 },
  "170x70x58cm",
  "主卫浴缸由1600×650mm调整为1700×700mm；贴西墙布置，复核检修口、龙头、溢水和相邻马桶净距。"
);
masterBathtub.name = "主卫西墙 1700mm 暖白独立浴缸";
setPositionMm(masterBathtub, 8031, 1250, 270);

const masterVanity = updateFurnitureDimensions(
  "furn-2f-master-vanity-001",
  { width: 160, depth: 50, height: 85 },
  "160x50x85cm",
  "主卫台盆柜由1200mm加长至1600mm双台盆；沿东墙布置，复核双盆下水、镜柜、插座和淋浴入口净距。"
);
masterVanity.name = "主卫东墙 1600mm 悬浮双台盆柜";
setPositionMm(masterVanity, 9245, 2170, 90);
masterVanity.render3d.wetAreaVisual = {
  ...(masterVanity.render3d.wetAreaVisual ?? {}),
  fixtureKind: "vanity",
  basinCount: 2,
  basinShape: "rectangular",
  countertopThicknessMm: 35,
  floating: true,
  mirrorStyle: "cabinet",
  mirrorHeightMm: 900,
  mirrorCabinetDepthMm: 130
};

// Existing light objects gain explicit continuous paths rather than isolated glow points.
const masterCoveLight = byId(workspace.drawingItems, "L-2F-SHOWROOM-MASTER-COVE-01", "drawing item");
masterCoveLight.linearLightPath = {
  pathMm: [{ x: 6150, y: 5400 }, { x: 6150, y: 7550 }],
  widthMm: 18,
  diffuserDepthMm: 14,
  offsetBelowHostMm: 35,
  throwDistanceMm: 1500,
  continuous: true
};
masterCoveLight.verificationMeta = estimateMeta;
masterCoveLight.updatedAt = now;

for (const [id, start, end] of [
  ["L-2F-SHOWROOM-BEDROOM1-COVE-01", { x: 1120, y: 5350 }, { x: 3170, y: 5350 }],
  ["L-2F-V1-26", { x: 3520, y: 8780 }, { x: 5810, y: 8780 }],
  ["L-2F-V1-19", { x: 1120, y: 8780 }, { x: 3170, y: 8780 }]
]) {
  const item = byId(workspace.drawingItems, id, "drawing item");
  item.linearLightPath = { pathMm: [start, end], widthMm: 16, diffuserDepthMm: 12, offsetBelowHostMm: 25, throwDistanceMm: 1200, continuous: true };
  item.verificationMeta = estimateMeta;
  item.updatedAt = now;
}

// Correct room assignments and add viewpoints that expose material, ceiling and clearance checks.
const masterBedtime = workspace.roomTourViews.find((item) => item.id === "lighting-view-2f-master-bedtime");
if (masterBedtime) {
  masterBedtime.roomId = "ROOM-2F-006";
  masterBedtime.name = "主卧睡前";
  masterBedtime.cameraPosition = { x: 0.25, y: 1.52, z: 2.65 };
  masterBedtime.target = { x: 2.65, y: 1.12, z: 1.85 };
  masterBedtime.description = "主卧睡前：查看植物墙布、曲线悬浮顶、床底灯和侧窗位置衣柜。";
}
const masterBathNight = workspace.roomTourViews.find((item) => item.id === "lighting-view-2f-master-bath-night");
if (masterBathNight) {
  masterBathNight.roomId = "ROOM-2F-003";
  masterBathNight.name = "主卫夜间";
  masterBathNight.cameraPosition = { x: 2.55, y: 1.5, z: -1.55 };
  masterBathNight.target = { x: 2.45, y: 1.05, z: -3.35 };
  masterBathNight.description = "主卫夜间：查看1600mm双台盆、1700mm浴缸、900mm淋浴和石材连续排版。";
}

for (const view of [
  { id: "tour-showroom-2F-ROOM-2F-002", roomId: "ROOM-2F-002", name: "2F 衣帽间样板视角", cameraPosition: { x: 0.5, y: 1.5, z: -1.62 }, target: { x: 0.5, y: 1.05, z: -3.42 }, fov: 68, description: "从南侧入口看两侧逐跨通顶柜、窗下低坐榻、木顶和三槽线性风口。" },
  { id: "tour-showroom-2F-ROOM-2F-004", roomId: "ROOM-2F-004", name: "2F 卧室1样板视角", cameraPosition: { x: -3.35, y: 1.5, z: 1.55 }, target: { x: -4.5, y: 1.04, z: 3.12 }, fov: 70, description: "从北侧通道看黑灰线条床头墙、轻薄灯槽、通顶衣柜和封闭阳台艺术书桌。" },
  { id: "tour-showroom-2F-ROOM-2F-005", roomId: "ROOM-2F-005", name: "2F 卧室2样板视角", cameraPosition: { x: -2.3, y: 1.5, z: 1.55 }, target: { x: -1.05, y: 1.04, z: 3.15 }, fov: 70, description: "从北侧通道看植物织物床头墙、锈橙条纹软包床、周边灯槽及南窗弧角长凳。" },
  { id: "tour-showroom-2F-ROOM-2F-006", roomId: "ROOM-2F-006", name: "2F 主卧样板适配视角", cameraPosition: { x: 0.25, y: 1.52, z: 2.65 }, target: { x: 2.65, y: 1.12, z: 1.85 }, fov: 70, description: "从西南通道斜看主卧植物墙布、曲线顶、大床和侧窗位置整面衣柜。" },
  { id: "tour-showroom-2F-ROOM-2F-003", roomId: "ROOM-2F-003", name: "2F 主卫尺寸复核视角", cameraPosition: { x: 2.55, y: 1.5, z: -1.55 }, target: { x: 2.45, y: 1.05, z: -3.35 }, fov: 72, description: "从南侧门口复核900mm淋浴、1700mm浴缸、1600mm双台盆与马桶通道。" },
  { id: "tour-showroom-2F-ROOM-2F-007", roomId: "ROOM-2F-007", name: "2F 走廊材料连续视角", cameraPosition: { x: 0.3, y: 1.48, z: -1.15 }, target: { x: -1.9, y: 1.1, z: -0.35 }, fov: 64, description: "检查浅橡木护墙、平墙门、窄踢脚、木顶分板和连续微水泥地面。" }
]) upsertTourView(view);

workspace.revision = Math.max(Number(workspace.revision) || 0, 13);
workspace.defaultWorkspaceRevision = "2026-08-03-2f-showroom-expression-upgrade-v1";
workspace.updatedAt = now;
workspace.savedAt = now;
workspace.drawingPackage.updatedAt = now;

// Preserve manually reviewed 2F point positions while teaching the generator
// the current furniture and ceiling fingerprint, so a repeated 2F generation
// remains stable after the approved dimension changes.
const lightingPreview = generateLightingDesignV1({
  structuresByFloor: workspace.houseStructuresByFloor,
  furniture: workspace.furniture,
  existingItems: workspace.drawingItems,
  floorIds: ["2F"],
  now
});
if (lightingPreview.created !== 0) throw new Error(`2F expression upgrade would create ${lightingPreview.created} unexpected generated lighting items`);
const previewByKey = new Map(lightingPreview.items.filter((item) => item.generatedKey).map((item) => [item.generatedKey, item]));
for (const item of workspace.drawingItems) {
  if (item.floorId !== "2F" || !item.generatedKey) continue;
  const preview = previewByKey.get(item.generatedKey);
  if (preview?.generatedFingerprint) item.generatedFingerprint = preview.generatedFingerprint;
}

fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);
console.log("Applied 2F showroom expression upgrade: finishes, parametric ceilings, door/portal details, cabinet bays, bathroom dimensions, lighting paths and audit viewpoints.");
