import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260802-before-b2-showroom-plan-b.json");
if (!fs.existsSync(backupPath)) fs.copyFileSync(workspacePath, backupPath);

const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const structure = workspace.houseStructuresByFloor.B2;
const immutableOutsideB2Snapshot = JSON.stringify({
  houseStructuresByFloor: Object.fromEntries(Object.entries(workspace.houseStructuresByFloor).filter(([floorId]) => floorId !== "B2")),
  stairSystems: workspace.stairSystems,
  stairLandings: workspace.stairLandings,
  stairOpenings: workspace.stairOpenings
});
const now = "2026-08-03T00:45:00.000Z";
const videoSource = "/Users/lyx/Documents/装修/样板房/B2整体.MOV";
const userApprovalNote = "用户于2026-08-02确认采用B2方案B并保留两根承重柱；随后确认删除位置不对的洗手池，并同意墙顶柜材质灯光提升及将装饰包覆收窄至约1350×750mm；2026-08-03依据视频连续镜头确认两柱身份应交换：客厅侧为装饰壁炉柱，楼梯/吧台侧为普通圆角柱；柱心仍为视频估算，不代表现场实测";

function byId(items, id, label) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing ${label}: ${id}`);
  return item;
}

const room = (id) => byId(structure.rooms, id, "room");
const furniture = (id) => byId(workspace.furniture, id, "furniture");

function estimatedMeta(sourceNote, toleranceMm) {
  return {
    status: "estimated",
    source: "visual-estimate",
    sourceNote: `${sourceNote}；素材：${videoSource}；无现场实测或结构图纸`,
    toleranceMm
  };
}

function setFurniturePosition(item, xMm, yMm, rotation) {
  item.position = {
    x: xMm / structure.coordinateSystem.width * 100,
    y: yMm / structure.coordinateSystem.height * 100,
    rotation
  };
}

function stableSeed(id) {
  let hash = 2166136261;
  for (const character of id) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

function ellipsePolygon(center, radiusX, radiusY, count = 32) {
  return Array.from({ length: count }, (_, index) => {
    const angle = index / count * Math.PI * 2;
    return {
      x: Math.round(center.x + Math.cos(angle) * radiusX),
      y: Math.round(center.y + Math.sin(angle) * radiusY)
    };
  });
}

function baseDrawingItem({ id, roomId, category, type, positionMm, label, notes }) {
  return {
    id,
    floorId: "B2",
    roomId,
    category,
    type,
    positionMm,
    hostObjectId: null,
    hostWallId: null,
    relatedFurnitureId: null,
    hostWallId: null,
    heightMm: null,
    circuitId: null,
    materialId: null,
    label,
    notes,
    source: "manual",
    status: "draft",
    quantity: 1,
    relatedRoomId: roomId,
    createdAt: now,
    updatedAt: now,
    verificationMeta: estimatedMeta(notes, 150)
  };
}

// Preserve both estimated centers; the user confirmed that their visual identities were reversed.
const livingSideFireplaceColumn = byId(structure.columns, "COL-B2-001", "B2 living-side fireplace column");
if (livingSideFireplaceColumn.center.x !== 5750 || livingSideFireplaceColumn.center.y !== 6200) {
  throw new Error("COL-B2-001 no longer matches the retained 5750/6200 estimated center");
}
Object.assign(livingSideFireplaceColumn, {
  name: "B2客厅侧承重柱 / 装饰壁炉包覆（视频估算）",
  radius: 300,
  visualStyle: "concealedByFinish",
  finishColor: "#cbbba6",
  accentColor: "#9b7446",
  verificationMeta: estimatedMeta("依据视频0.3–1.8秒，将装饰壁炉身份绑定至客厅侧柱；保留现有5750/6200估算柱心，柱芯直径暂按600mm", 500)
});
livingSideFireplaceColumn.verificationMeta.sourceNote += `；${userApprovalNote}`;

const stairSideRoundColumn = {
  id: "COL-B2-002",
  floorId: "B2",
  name: "B2楼梯/吧台侧圆角承重柱 / 支撑B1（视频估算）",
  geometryType: "point",
  columnType: "cylindrical",
  center: { x: 4300, y: 5050 },
  radius: 360,
  height: 2800,
  material: "reinforcedConcrete",
  supportsFloorId: "B1",
  visualStyle: "showroomLightStone",
  finishColor: "#d8c8b4",
  accentColor: "#a78358",
  editable: true,
  removable: true,
  verificationMeta: estimatedMeta("依据视频2.8秒及23–24秒，将普通圆角柱身份绑定至楼梯/吧台侧；保留现有4300/5050估算柱心，柱芯直径暂按720mm", 500)
};
stairSideRoundColumn.verificationMeta.sourceNote += `；${userApprovalNote}`;
const stairSideColumnIndex = structure.columns.findIndex((item) => item.id === stairSideRoundColumn.id);
if (stairSideColumnIndex >= 0) structure.columns[stairSideColumnIndex] = stairSideRoundColumn;
else structure.columns.push(stairSideRoundColumn);

// A continuous warm herringbone stone finish and low-contrast lime wall unify B2.
const floorFinish = {
  material: "stone",
  name: "样板间浅暖米灰人字拼石材（视频估算）",
  baseColor: "#cfc0ab",
  jointColor: "#9d866b",
  textureAccent: "#e8ddcc",
  roughness: 0.48,
  tileWidthMm: 220,
  tileLengthMm: 900,
  seamWidthMm: 3,
  pattern: "showroomHerringboneStone",
  directionDeg: 45,
  textureScale: 4.2
};
const wallFinish = {
  material: "limewash",
  name: "样板间暖燕麦米灰矿物肌理墙",
  baseColor: "#ded1bf",
  textureAccent: "#c5b297",
  roughness: 0.88,
  textureScale: 1.25
};
for (const item of structure.rooms) {
  item.surfaceFinishes ??= {};
  item.surfaceFinishes.floor = { ...floorFinish };
  item.surfaceFinishes.wall = { ...wallFinish };
}
for (const item of structure.walls) item.surfaceFinish = { ...wallFinish };

const fireplace = upsertFurniture({
  id: "furn-b2-showroom-column-fireplace-001",
  code: "FP-B2-SHOWROOM-01",
  name: "B2客厅侧承重柱装饰壁炉包覆（非燃烧）",
  type: "custom",
  catalogId: "showroom-b2-column-fireplace",
  moduleCategory: "decor",
  moduleType: "fireplace",
  floorId: "B2",
  roomId: "ROOM-B2-001",
  roomAssignmentLocked: true,
  dimensions: { width: 135, depth: 75, height: 280, unit: "cm" },
  material: "浅暖米灰石材弧角包覆 + 窄阴影缝 + 香槟古铜竖向收口 + 装饰性黑色壁炉口",
  note: "本对象不是独立功能壁炉，而是客厅侧承重柱的装饰包覆；已按用户确认交换柱子身份并收窄视觉体量，柱芯位置与尺寸仍为视频估算占位。",
  constructionNote: "禁止按本模型直接施工。取得结构图或现场放线后，以真实柱芯为中心重做包覆厚度、壁炉口比例、检修与防火构造。",
  serviceRequirements: { water: false, drainage: false, power: true, exhaust: false },
  position: { x: 0, y: 0, rotation: 0 },
  color: "#cbbba6",
  render3d: {
    assetType: "fireplace",
    variantId: "b2ShowroomColumnFireplace",
    detailLevel: "presentation",
    stylePreset: "tuscanWabiSabi",
    primaryMaterial: "travertine",
    secondaryMaterial: "darkStone",
    accentMaterial: "brushedBronze",
    visibleIn3d: true,
    selectableIn3d: true,
    childrenMode: "grouped",
    styleSource: "manual",
    styleLocked: true,
    variationSeed: stableSeed("furn-b2-showroom-column-fireplace-001")
  },
  mepMeta: {
    needsSocket: true,
    socketCount: 1,
    socketHeight: 300,
    needsSwitch: true,
    switchControl: ["装饰壁炉氛围光"],
    needsLighting: true,
    lightingType: "decorative",
    lightColorTemperature: "2700K",
    needsWaterSupply: false,
    waterSupplyType: "none",
    needsDrainage: false,
    drainageType: "none",
    needsNetwork: false,
    needsVentilation: false,
    needsSmartControl: true,
    relatedCircuit: "B2氛围照明回路",
    notes: "仅预留装饰光源电源，不按真火、燃气或排烟壁炉设计。"
  },
  verificationMeta: estimatedMeta("包覆中心跟随COL-B2-001；按用户确认将视觉包覆由1600×850mm收窄至约1350×750mm，壁炉口与阴影缝比例仍按视频关系估算", 250)
});
fireplace.verificationMeta.sourceNote += `；${userApprovalNote}`;
setFurniturePosition(fireplace, 5750, 6200, 0);

const tvWall = furniture("furn-b2-living-tv-console-001");
Object.assign(tvWall, {
  name: "B2样板间石材木饰面分区悬浮电视墙",
  material: "中部暖米色石材大板 + 两侧浅橡木饰面 + 窄阴影缝 + 烟灰玻璃展示格 + 悬浮影音低柜",
  note: "保持现有电视墙位置与3600mm总宽，通过石材/木饰面分区、材料阴影缝、悬浮低柜和柜底灯带提升样板间表达，不移动墙体或电视中心线。",
  constructionNote: "本轮只确认造型表达；石材分缝、阴影缝宽度、柜底标高与100寸电视检修空间需深化复尺。",
  cabinetHeight: { kind: "fullHeight", topClosureMm: 30, source: "explicit" }
});
tvWall.render3d = {
  ...tvWall.render3d,
  stylePreset: "modernNatural",
  primaryMaterial: "warmOak",
  secondaryMaterial: "travertine",
  accentMaterial: "smokedGlass",
  styleSource: "manual",
  styleLocked: true
};

const wineCabinet = furniture("furn-b2-study-wine-cabinet-001");
Object.assign(wineCabinet, {
  material: "通墙深胡桃木竖纹柜体 + 烟灰玻璃门 + 暖光层板 + 内收踢脚 + 顶部阴影收口",
  note: "保持当前柜体位置和1850mm宽度，完善门板分缝、烟灰玻璃、灯带受光面、内收踢脚和顶部阴影缝。",
  cabinetHeight: { kind: "fullHeight", topClosureMm: 30, source: "explicit" }
});

// Remove the slab table and the incorrectly positioned sink/bar; dedicated drawing items are removed with them.
const removedFurnitureIds = new Set(["furn-b2-study-slab-table-001", "furn-b2-study-handwash-001"]);
workspace.furniture = workspace.furniture.filter((item) => !removedFurnitureIds.has(item.id));
const removedDrawingIds = new Set([
  "L-B2-SHOWROOM-BAR-COVE-01",
  ...workspace.drawingItems.filter((item) => removedFurnitureIds.has(item.relatedFurnitureId)).map((item) => item.id)
]);
for (const item of workspace.drawingItems) {
  if (item.category === "switch" && (item.controlledLightIds ?? []).some((id) => removedDrawingIds.has(id))) removedDrawingIds.add(item.id);
}
const removedControlGroupIds = new Set([
  "CG-B2-B2-005-DESK",
  ...workspace.drawingItems
    .filter((item) => removedDrawingIds.has(item.id))
    .flatMap((item) => [item.controlGroupId, item.lightGroupId])
    .filter(Boolean)
]);
workspace.drawingItems = workspace.drawingItems.filter((item) => !removedDrawingIds.has(item.id));
workspace.drawingPackage.drawingItemIds = (workspace.drawingPackage.drawingItemIds ?? []).filter((id) => !removedDrawingIds.has(id));
for (const scene of workspace.lightingDesign?.scenes ?? []) {
  scene.groupStates = (scene.groupStates ?? []).filter((state) => !removedControlGroupIds.has(state.controlGroupId));
}

const livingBoundary = room("ROOM-B2-001").boundary.map((point) => ({ ...point }));
upsertDrawingItem({
  ...baseDrawingItem({
    id: "C-B2-SHOWROOM-LIVING-BASE-01",
    roomId: "ROOM-B2-001",
    category: "ceiling",
    type: "showroomBaseCeiling",
    positionMm: livingBoundary[0],
    label: "B2样板间暖灰米色整体顶",
    notes: "保持原层高2800mm，不修改楼板；以矿物肌理面形成低对比整体顶。"
  }),
  polygon: livingBoundary,
  ceilingHeightMm: 2800,
  heightMm: 2800,
  material: "暖燕麦米灰矿物涂料",
  relatedLightIds: ["L-B2-SHOWROOM-OVAL-COVE-01", "L-B2-SHOWROOM-FIREPLACE-WASH-01"]
});

const oval = ellipsePolygon({ x: 5750, y: 2900 }, 1600, 900);
upsertDrawingItem({
  ...baseDrawingItem({
    id: "C-B2-SHOWROOM-OVAL-01",
    roomId: "ROOM-B2-001",
    category: "ceiling",
    type: "showroomOvalFloatingCeiling",
    positionMm: oval[0],
    label: "B2样板间椭圆悬浮顶",
    notes: "椭圆造型按视频画面比例估算，暂下挂120mm；不改变楼板和结构层高。"
  }),
  polygon: oval,
  ceilingHeightMm: 2680,
  heightMm: 2680,
  material: "暖灰米色矿物肌理饰面",
  relatedLightIds: ["L-B2-SHOWROOM-OVAL-COVE-01"]
});

const atmosphereLights = [
  {
    id: "L-B2-SHOWROOM-OVAL-COVE-01",
    roomId: "ROOM-B2-001",
    positionMm: { x: 5750, y: 2900 },
    relatedFurnitureId: null,
    type: "ovalCoveIndirectLight",
    label: "B2椭圆悬浮顶2700K反射灯带",
    notes: "灯带藏于椭圆悬浮顶上口，仅见反射光，不复制样板间活动家具。",
    beamAngle: 120
  },
  {
    id: "L-B2-SHOWROOM-FIREPLACE-WASH-01",
    roomId: "ROOM-B2-001",
    positionMm: { x: 5750, y: 5800 },
    relatedFurnitureId: fireplace.id,
    hostWallId: null,
    type: "wallWashSpotlight",
    label: "B2客厅侧柱壁炉包覆洗墙灯",
    notes: "低眩洗亮石材和古铜竖向收口，壁炉本体仍为非燃烧装饰。",
    beamAngle: 24
  },
  {
    id: "L-B2-SHOWROOM-TV-UNDERSIDE-01",
    roomId: "ROOM-B2-001",
    positionMm: { x: 5640, y: 820 },
    relatedFurnitureId: tvWall.id,
    hostWallId: "W-B2-001",
    relatedFurniturePositionMm: { x: 5640, y: 580 },
    heightMm: 300,
    lightingLayer: "cabinetStrip",
    type: "underCabinetStripLight",
    label: "B2电视墙悬浮柜底2700K灯带",
    notes: "仅照亮悬浮柜底和地面接触区，避免直射电视屏幕。",
    beamAngle: 110
  },
  {
    id: "L-B2-SHOWROOM-WINE-COVE-01",
    roomId: "ROOM-B2-005",
    positionMm: { x: 4823, y: 7535 },
    relatedFurnitureId: wineCabinet.id,
    hostWallId: "W-B2-011",
    relatedFurniturePositionMm: { x: 4823, y: 7575 },
    heightMm: 2180,
    lightingLayer: "cabinetStrip",
    type: "cabinetIntegratedStripLight",
    label: "B2酒柜层板2700K隐藏灯带",
    notes: "光源隐藏于上口和层板前沿，仅保留玻璃后的暖光层次。",
    beamAngle: 100
  }
];
for (const light of atmosphereLights) {
  upsertDrawingItem({
    ...baseDrawingItem({
      id: light.id,
      roomId: light.roomId,
      category: "light",
      type: light.type,
      positionMm: light.positionMm,
      label: light.label,
      notes: light.notes
    }),
    source: light.relatedFurnitureId ? "generated-from-furniture" : "generated-from-room",
    heightMm: light.heightMm ?? 2650,
    lightType: light.type,
    lightingLayer: light.lightingLayer ?? "decorative",
    colorTemperature: "2700K",
    lightColorTemperature: "2700K",
    beamAngle: light.beamAngle,
    mountingType: light.id.includes("FIREPLACE") ? "recessed" : light.id.includes("TV-UNDERSIDE") || light.id.includes("WINE-COVE") ? "cabinetIntegrated" : "concealed",
    relatedSwitchId: "SW-B2-SHOWROOM-ATMOSPHERE-01",
    hostWallId: light.hostWallId,
    relatedFurnitureId: light.relatedFurnitureId,
    ...(light.relatedFurnitureId ? {
      relatedFurniturePositionMm: light.relatedFurniturePositionMm ?? (light.relatedFurnitureId === fireplace.id ? { x: 5750, y: 6200 } : null)
    } : {}),
    hostCeilingAreaId: light.id.includes("OVAL") ? "C-B2-SHOWROOM-OVAL-01" : null,
    controlGroupId: "CG-B2-SHOWROOM-ATMOSPHERE",
    lightGroupId: "CG-B2-SHOWROOM-ATMOSPHERE",
    smartControl: true,
    needsSmartControl: true,
    dimming: true,
    lightSpec: {
      powerW: light.id.includes("FIREPLACE") ? 10 : 12,
      luminousFluxLm: light.id.includes("FIREPLACE") ? 760 : 900,
      cri: 95,
      glareRating: "隐藏光源 / 低眩",
      fixtureFamily: light.type,
      trimColor: "暖白 / 香槟古铜"
    }
  });
}

upsertDrawingItem({
  ...baseDrawingItem({
    id: "SW-B2-SHOWROOM-ATMOSPHERE-01",
    roomId: "ROOM-B2-001",
    category: "switch",
    type: "switchAndSceneControl",
    positionMm: { x: 7540, y: 3900 },
    label: "B2样板间氛围照明总控",
    notes: "控制椭圆顶反射光、二柱洗墙、电视柜底和酒柜层板灯；场景亮度可调。"
  }),
  source: "generated-from-room",
  hostWallId: "W-B2-004",
  heightMm: 1200,
  controlGroupId: "CG-B2-SHOWROOM-ATMOSPHERE",
  lightGroupId: "CG-B2-SHOWROOM-ATMOSPHERE",
  relatedSwitchId: null,
  controlledLightIds: atmosphereLights.map((light) => light.id),
  relatedLightIds: atmosphereLights.map((light) => light.id),
  switchControl: ["物理开关", "智能场景"],
  smartControl: true,
  needsSmartControl: true,
  dimming: true
});

workspace.lightingDesign ??= { version: "v1", generatedAt: now, style: {}, fixtureFamilies: [], scenes: [], pendingConfirmations: [] };
workspace.lightingDesign.scenes ??= [];
const showroomScene = {
  id: "SCENE-B2-SHOWROOM-ATMOSPHERE",
  name: "B2样板间暖光氛围",
  category: "room",
  groupStates: [
    { controlGroupId: "CG-B2-SHOWROOM-ATMOSPHERE", on: true, brightness: 72 },
    { controlGroupId: "CG-B2-B2-001-TV-WALL", on: true, brightness: 28 },
    { controlGroupId: "CG-B2-B2-001-FEATURE", on: true, brightness: 42 }
  ],
  notes: "以椭圆悬浮顶反射光、二柱洗墙、电视柜底和酒柜层板灯形成2700K层次；亮度为方案值，现场调试。",
  status: "draft",
  floorId: "B2",
  roomId: "ROOM-B2-001"
};
const showroomSceneIndex = workspace.lightingDesign.scenes.findIndex((scene) => scene.id === showroomScene.id);
if (showroomSceneIndex >= 0) workspace.lightingDesign.scenes[showroomSceneIndex] = showroomScene;
else workspace.lightingDesign.scenes.push(showroomScene);

workspace.updatedAt = now;
const immutableOutsideB2After = JSON.stringify({
  houseStructuresByFloor: Object.fromEntries(Object.entries(workspace.houseStructuresByFloor).filter(([floorId]) => floorId !== "B2")),
  stairSystems: workspace.stairSystems,
  stairLandings: workspace.stairLandings,
  stairOpenings: workspace.stairOpenings
});
if (immutableOutsideB2After !== immutableOutsideB2Snapshot) throw new Error("B2 plan B must not mutate other floors or stair systems");
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  revision: workspace.revision,
  originalColumn: { center: originalColumn.center, radius: originalColumn.radius },
  secondColumn: { center: secondColumn.center, radius: secondColumn.radius, toleranceMm: secondColumn.verificationMeta.toleranceMm },
  fireplace: { position: fireplace.position, dimensions: fireplace.dimensions },
  tvWall: { position: tvWall.position, dimensions: tvWall.dimensions },
  wineCabinet: { position: wineCabinet.position, dimensions: wineCabinet.dimensions },
  slabTableRemoved: !workspace.furniture.some((item) => item.id === "furn-b2-study-slab-table-001"),
  removedDrawingIds: [...removedDrawingIds],
  removedControlGroupIds: [...removedControlGroupIds]
}, null, 2));
