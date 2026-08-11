import fs from "node:fs";
import path from "node:path";
import { getDrawingItemGeneratedFingerprint } from "../lib/drawing-items.ts";
import { generateLightingDesignV1 } from "../lib/lighting-design.ts";

const root = process.cwd();
const workspacePath = path.join(root, "data/default-workspace.json");
const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const now = "2026-08-09T12:00:00.000Z";

const clone = (value) => JSON.parse(JSON.stringify(value));
const items = workspace.drawingItems ?? (workspace.drawingItems = []);
const byId = (id) => items.find((item) => item.id === id);
const addOrUpdate = (next) => {
  const index = items.findIndex((item) => item.id === next.id);
  if (index >= 0) items[index] = { ...items[index], ...next, updatedAt: now };
  else items.push({ ...next, createdAt: now, updatedAt: now });
  return byId(next.id);
};

const lightTemplate = (floorId) => clone(
  items.find((item) => item.category === "light" && item.floorId === floorId)
  ?? items.find((item) => item.category === "light")
);

const switchTemplate = (floorId) => clone(
  items.find((item) => item.category === "switch" && item.floorId === floorId)
  ?? items.find((item) => item.category === "switch")
);

function makeLight({
  id,
  floorId,
  roomId,
  positionMm,
  label,
  notes,
  type,
  lightType = type,
  lightingLayer,
  colorTemperature = "2700K",
  beamAngle,
  mountingType,
  heightMm,
  controlGroupId,
  relatedSwitchId,
  fixtureFamily,
  powerW,
  luminousFluxLm,
  cri = 90,
  relatedFurnitureId = null,
  relatedFurniturePositionMm = null,
  hostCeilingAreaId = null,
  smartControl = true,
  dimming = true
}) {
  const existing = byId(id);
  const base = existing ?? lightTemplate(floorId);
  if (!base) throw new Error(`No light template available for ${id}`);
  const next = {
    ...base,
    id,
    floorId,
    roomId,
    category: "light",
    type,
    positionMm,
    hostObjectId: null,
    hostWallId: null,
    relatedFurnitureId,
    heightMm,
    label,
    notes,
    source: "generated-from-room",
    status: "draft",
    quantity: 1,
    relatedRoomId: roomId,
    lightType,
    lightingLayer,
    colorTemperature,
    lightColorTemperature: colorTemperature,
    beamAngle,
    mountingType,
    relatedSwitchId,
    controlGroupId,
    lightGroupId: controlGroupId,
    smartControl,
    needsSmartControl: smartControl,
    dimming,
    hostCeilingAreaId,
    directionDeg: null,
    lightSpec: {
      powerW,
      luminousFluxLm,
      cri,
      glareRating: mountingType === "concealed" ? "不可见光源 / 低眩" : "低眩",
      fixtureFamily,
      trimColor: mountingType === "cabinetIntegrated" ? "隐藏铝槽" : "暖白 / 古铜"
    }
  };
  if (relatedFurniturePositionMm) next.relatedFurniturePositionMm = relatedFurniturePositionMm;
  else delete next.relatedFurniturePositionMm;
  delete next.generatedKey;
  delete next.generatedFingerprint;
  const saved = addOrUpdate(next);
  if (!relatedFurniturePositionMm) delete saved.relatedFurniturePositionMm;
  return saved;
}

function ensureSwitch({ id, floorId, roomId, positionMm, label, notes, controlGroupId, lightIds }) {
  const existing = byId(id);
  const base = existing ?? switchTemplate(floorId);
  if (!base) throw new Error(`No switch template available for ${id}`);
  const next = {
    ...base,
    id,
    floorId,
    roomId,
    category: "switch",
    type: "switchAndSceneControl",
    positionMm,
    label,
    notes,
    source: "generated-from-room",
    status: "draft",
    relatedRoomId: roomId,
    controlGroupId,
    lightGroupId: controlGroupId,
    controlledLightIds: [...lightIds],
    relatedLightIds: [...lightIds],
    switchControl: ["物理开关", "智能场景"],
    smartControl: true,
    needsSmartControl: true,
    dimming: true
  };
  delete next.generatedKey;
  delete next.generatedFingerprint;
  return addOrUpdate(next);
}

function useExistingGroup({ groupId, switchId, lightId }) {
  const control = byId(switchId);
  if (!control) throw new Error(`Missing existing switch ${switchId}`);
  const lightIds = new Set([...(control.controlledLightIds ?? []), lightId]);
  control.controlGroupId = groupId;
  control.lightGroupId = groupId;
  control.controlledLightIds = [...lightIds];
  control.relatedLightIds = [...lightIds];
  control.updatedAt = now;
  return control;
}

function addDistributedAmbientPack({
  floorId,
  roomId,
  groupId,
  switchId,
  ids,
  positions,
  label,
  notes
}) {
  const existingLights = items.filter((item) => item.category === "light" && item.controlGroupId === groupId);
  const switchItem = byId(switchId);
  if (!switchItem) throw new Error(`Missing ambient switch ${switchId}`);
  if (ids.length !== positions.length) throw new Error(`Ambient pack ${groupId} has mismatched ids and positions`);

  // Keep the base layer visually consistent: 3000K is neutral enough for
  // bedrooms and basements, while the 2700K mood circuits remain warmer.
  existingLights.forEach((item) => {
    item.colorTemperature = "3000K";
    item.lightColorTemperature = "3000K";
    item.label = `${item.id} · ${label} 1`;
    item.notes = notes;
  });

  const additions = positions.map((positionMm, index) => makeLight({
    id: ids[index],
    floorId,
    roomId,
    positionMm,
    heightMm: 2800,
    label: `${label} ${index + 2}`,
    notes,
    type: "wideBeamDownlight",
    lightingLayer: "ambient",
    colorTemperature: "3000K",
    beamAngle: 60,
    mountingType: "recessed",
    controlGroupId: groupId,
    relatedSwitchId: switchId,
    fixtureFamily: "wide-downlight",
    powerW: 11,
    luminousFluxLm: 950,
    cri: 95
  }));
  const allLightIds = [...new Set([...existingLights.map((item) => item.id), ...additions.map((item) => item.id)])];
  switchItem.controlGroupId = groupId;
  switchItem.lightGroupId = groupId;
  switchItem.controlledLightIds = allLightIds;
  switchItem.relatedLightIds = allLightIds;
  switchItem.label = `${switchItem.id} · ${label}控制`;
  switchItem.notes = `${notes} ${allLightIds.length}盏分布式基础灯统一调光，避免单点照明造成暗区。`;
  switchItem.updatedAt = now;
  return additions;
}

function addSceneState(sceneId, controlGroupId, brightness) {
  const scene = workspace.lightingDesign?.scenes?.find((candidate) => candidate.id === sceneId);
  if (!scene) return;
  const states = scene.groupStates ?? (scene.groupStates = []);
  const existing = states.find((state) => state.controlGroupId === controlGroupId);
  const state = { controlGroupId, on: brightness > 0, brightness };
  if (existing) Object.assign(existing, state);
  else states.push(state);
}

function ellipsePath(cx, cy, rx, ry, count = 48) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count;
    return { x: Math.round(cx + Math.cos(angle) * rx), y: Math.round(cy + Math.sin(angle) * ry) };
  });
}

function addCoveCeiling({ id, floorId, roomId, positionMm, label, material, pathMm, relatedLightIds, dropMm = 100, bandWidthMm = 100, lipMm = 20, pathMode = "linear" }) {
  const closedPath = [...pathMm, pathMm[0]];
  addOrUpdate({
    id,
    floorId,
    roomId,
    category: "ceiling",
    type: "parameterizedShowroomCove",
    positionMm,
    heightMm: 2680,
    ceilingHeightMm: 2800,
    label,
    material,
    notes: "样板间灯光标准：光源藏于灯槽上口，只保留连续反射光；吊顶、风口、检修口和梁位施工前综合复核。",
    polygon: closedPath,
    relatedLightIds,
    coveProfile: {
      pathMm: closedPath,
      dropMm,
      bandWidthMm,
      lipMm,
      cornerRadiusMm: 100,
      emitterOffsetMm: 32,
      pathMode,
      closed: true,
      curveSegments: pathMode === "catmullRom" ? 64 : undefined
    },
    source: "generated-from-room",
    status: "draft",
    quantity: 1,
    relatedRoomId: roomId
  });
}

const b2MoodGroup = "CG-B2-B2-001-FEATURE";
const b2MoodSwitch = "SW-B2-V1-02";
const b2Cove = makeLight({
  id: "L-B2-SHOWROOM-COVE-01",
  floorId: "B2",
  roomId: "ROOM-B2-001",
  positionMm: { x: 5750, y: 2900 },
  heightMm: 2680,
  label: "B2客厅样板间椭圆顶2700K反射灯带",
  notes: "灯带藏于椭圆悬浮顶上口，只见连续反射光；与壁炉重点光分组调光，不增加中央筒灯密度。",
  type: "indirectCoveStrip",
  lightingLayer: "decorative",
  beamAngle: 120,
  mountingType: "concealed",
  controlGroupId: b2MoodGroup,
  relatedSwitchId: b2MoodSwitch,
  fixtureFamily: "curtain-strip",
  powerW: 14,
  luminousFluxLm: 900,
  cri: 95
});
useExistingGroup({ groupId: b2MoodGroup, switchId: b2MoodSwitch, lightId: b2Cove.id });

const b2WallWash = makeLight({
  id: "L-B2-SHOWROOM-WALL-WASH-01",
  floorId: "B2",
  roomId: "ROOM-B2-001",
  positionMm: { x: 5750, y: 5800 },
  heightMm: 2800,
  label: "B2客厅样板间壁炉柱低眩洗墙灯",
  notes: "以窄光束洗亮壁炉包覆和石材/古铜收口，灯轴避开电视反射；与椭圆顶反射光同组。",
  type: "wallWashSpotlight",
  lightingLayer: "accent",
  beamAngle: 24,
  mountingType: "recessed",
  controlGroupId: b2MoodGroup,
  relatedSwitchId: b2MoodSwitch,
  fixtureFamily: "narrow-wallwasher",
  powerW: 10,
  luminousFluxLm: 760
});
useExistingGroup({ groupId: b2MoodGroup, switchId: b2MoodSwitch, lightId: b2WallWash.id });

const b2CabinetSwitch = ensureSwitch({
  id: "SW-B2-SHOWROOM-CABINET-01",
  floorId: "B2",
  roomId: "ROOM-B2-005",
  positionMm: { x: 4700, y: 7200 },
  label: "B2样板间柜体发光控制",
  notes: "统一控制电视悬浮柜底和酒柜层板灯；两组均采用隐藏光源，场景可单独压低。",
  controlGroupId: "CG-B2-SHOWROOM-CABINET",
  lightIds: []
});
const b2CabinetGroup = b2CabinetSwitch.controlGroupId;
const b2TvBase = makeLight({
  id: "L-B2-SHOWROOM-TV-BASE-01",
  floorId: "B2",
  roomId: "ROOM-B2-001",
  positionMm: { x: 5640, y: 820 },
  heightMm: 300,
  label: "B2电视墙悬浮柜底2700K灯带",
  notes: "只照亮悬浮柜底和地面接触区，避免直射电视屏幕；与酒柜层板灯同组。",
  type: "underCabinetStripLight",
  lightingLayer: "cabinetStrip",
  beamAngle: 110,
  mountingType: "cabinetIntegrated",
  controlGroupId: b2CabinetGroup,
  relatedSwitchId: b2CabinetSwitch.id,
  fixtureFamily: "cabinet-strip",
  powerW: 8,
  luminousFluxLm: 650,
  cri: 95
});
const b2Wine = makeLight({
  id: "L-B2-SHOWROOM-WINE-01",
  floorId: "B2",
  roomId: "ROOM-B2-005",
  positionMm: { x: 4823, y: 7535 },
  heightMm: 2180,
  label: "B2酒柜层板2700K隐藏灯带",
  notes: "灯带藏于上口和层板前沿，只保留玻璃后的暖光层次；驱动和检修电源随柜体深化。",
  type: "cabinetIntegratedStripLight",
  lightingLayer: "cabinetStrip",
  beamAngle: 100,
  mountingType: "cabinetIntegrated",
  controlGroupId: b2CabinetGroup,
  relatedSwitchId: b2CabinetSwitch.id,
  fixtureFamily: "cabinet-strip",
  powerW: 8,
  luminousFluxLm: 650,
  cri: 95
});
ensureSwitch({ ...b2CabinetSwitch, lightIds: [b2TvBase.id, b2Wine.id] });

const waterbar = workspace.furniture.find((item) => item.id === "furn-b2-study-handwash-001");
const waterbarSwitch = ensureSwitch({
  id: "SW-B2-V1-16",
  floorId: "B2",
  roomId: "ROOM-B2-005",
  positionMm: { x: 1130, y: 7945 },
  label: "SW-B2-V1-16 · 书房水吧镜柜灯控制",
  notes: "水吧只设置镜柜/面部柔光，不生成淋浴和马桶夜灯；电源随水吧镜柜深化。",
  controlGroupId: "CG-B2-B2-005-MIRROR",
  lightIds: []
});
const waterbarMirror = makeLight({
  id: "L-B2-V1-16",
  floorId: "B2",
  roomId: "ROOM-B2-005",
  positionMm: { x: 1550, y: 7525 },
  heightMm: 1850,
  label: "L-B2-V1-16 · 书房水吧镜柜灯",
  notes: "以两侧乳白玻璃柔光照亮水吧操作和面部；不按卫生间逻辑生成淋浴/马桶灯。",
  type: "linearMirrorLight",
  lightingLayer: "mirrorLight",
  colorTemperature: "3000K",
  beamAngle: 100,
  mountingType: "mirrorIntegrated",
  controlGroupId: waterbarSwitch.controlGroupId,
  relatedSwitchId: waterbarSwitch.id,
  fixtureFamily: "mirror-light",
  powerW: 14,
  luminousFluxLm: 1100,
  cri: 95,
  relatedFurnitureId: waterbar?.id ?? null,
  relatedFurniturePositionMm: { x: 1550, y: 7525 },
  smartControl: false,
  dimming: true
});
ensureSwitch({ ...waterbarSwitch, lightIds: [waterbarMirror.id] });
waterbarMirror.generatedKey = "lighting-design-v1:B2:CG-B2-B2-005-MIRROR:light:1";
waterbarMirror.generatedFingerprint = getDrawingItemGeneratedFingerprint(waterbarMirror);
const savedWaterbarSwitch = byId(waterbarSwitch.id);
savedWaterbarSwitch.generatedKey = "lighting-design-v1:B2:CG-B2-B2-005-MIRROR:switch";
savedWaterbarSwitch.generatedFingerprint = getDrawingItemGeneratedFingerprint(savedWaterbarSwitch);

addCoveCeiling({
  id: "C-B2-SHOWROOM-OVAL-01",
  floorId: "B2",
  roomId: "ROOM-B2-001",
  positionMm: { x: 5750, y: 2900 },
  label: "B2客厅样板间椭圆悬浮顶灯槽",
  material: "暖灰米色矿物肌理饰面",
  pathMm: ellipsePath(5750, 2900, 1600, 900),
  relatedLightIds: [b2Cove.id],
  dropMm: 120,
  bandWidthMm: 110,
  pathMode: "catmullRom"
});

const livingCoveGroup = "CG-1F-1F-005-CURTAIN";
const livingCove = makeLight({
  id: "L-1F-SHOWROOM-LIVING-COVE-01",
  floorId: "1F",
  roomId: "ROOM-1F-005",
  positionMm: { x: 6585, y: 5425 },
  heightMm: 2740,
  label: "1F客厅样板间连续周边灯槽",
  notes: "2700K不可见光源，以间接光为主；中央保持原顶，不增加密集筒灯。",
  type: "indirectCoveStrip",
  lightingLayer: "decorative",
  beamAngle: 120,
  mountingType: "concealed",
  controlGroupId: livingCoveGroup,
  relatedSwitchId: "SW-1F-V1-24",
  fixtureFamily: "curtain-strip",
  powerW: 14,
  luminousFluxLm: 900,
  cri: 95
});
useExistingGroup({ groupId: livingCoveGroup, switchId: "SW-1F-V1-24", lightId: livingCove.id });
const livingSwitch = byId("SW-1F-V1-24");
livingSwitch.label = "SW-1F-V1-24 · 客厅窗帘盒/周边灯槽氛围控制";
livingSwitch.notes = "控制客厅实际窗帘盒灯带与连续周边灯槽；与观影、夜间场景联动。";
addCoveCeiling({
  id: "C-1F-SHOWROOM-LIVING-COVE-01",
  floorId: "1F",
  roomId: "ROOM-1F-005",
  positionMm: { x: 6585, y: 5425 },
  label: "1F客厅样板间轻薄周边灯槽",
  material: "暖白矿物涂层",
  pathMm: [{ x: 3897, y: 3410 }, { x: 9135, y: 3410 }, { x: 9135, y: 7440 }, { x: 3897, y: 7440 }],
  relatedLightIds: [livingCove.id],
  dropMm: 80,
  bandWidthMm: 100
});

const b1CoveGroup = "CG-B1-B1-004-MOOD";
const b1Cove = makeLight({
  id: "L-B1-SHOWROOM-ACTIVITY-COVE-01",
  floorId: "B1",
  roomId: "ROOM-B1-004",
  positionMm: { x: 4300, y: 6800 },
  heightMm: 2720,
  label: "B1活动区样板间椭圆灯槽",
  notes: "参考样板间环形顶面，采用2700K连续暗藏灯带；与展示架暖光同组。",
  type: "indirectCoveStrip",
  lightingLayer: "decorative",
  beamAngle: 120,
  mountingType: "concealed",
  controlGroupId: b1CoveGroup,
  relatedSwitchId: "SW-B1-V1-13",
  fixtureFamily: "curtain-strip",
  powerW: 12,
  luminousFluxLm: 850,
  cri: 95
});
useExistingGroup({ groupId: b1CoveGroup, switchId: "SW-B1-V1-13", lightId: b1Cove.id });
addCoveCeiling({
  id: "C-B1-SHOWROOM-ACTIVITY-COVE-01",
  floorId: "B1",
  roomId: "ROOM-B1-004",
  positionMm: { x: 4300, y: 6800 },
  label: "B1活动区样板间浅跌级椭圆灯槽",
  material: "暖白矿物涂料",
  pathMm: ellipsePath(4300, 6800, 1700, 760),
  relatedLightIds: [b1Cove.id],
  dropMm: 80,
  bandWidthMm: 100,
  pathMode: "catmullRom"
});

const masterMoodGroup = "CG-2F-SHOWROOM-MASTER-MOOD";
const masterMoodSwitch = ensureSwitch({
  id: "SW-2F-SHOWROOM-MASTER-MOOD-01",
  floorId: "2F",
  roomId: "ROOM-2F-006",
  positionMm: { x: 7850, y: 3300 },
  label: "2F主卧样板间暖光氛围控制",
  notes: "统一控制曲线灯槽和两侧床头阅读灯；睡前场景降低至低亮度。",
  controlGroupId: masterMoodGroup,
  lightIds: []
});
const masterCove = makeLight({
  id: "L-2F-SHOWROOM-MASTER-COVE-01",
  floorId: "2F",
  roomId: "ROOM-2F-006",
  positionMm: { x: 7550, y: 6500 },
  heightMm: 2710,
  label: "2F主卧样板间曲线悬浮顶2700K灯槽",
  notes: "灯带藏于曲线顶后沿，形成连续包裹光；不替代基础照明计算。",
  type: "indirectCoveStrip",
  lightingLayer: "decorative",
  beamAngle: 120,
  mountingType: "concealed",
  controlGroupId: masterMoodGroup,
  relatedSwitchId: masterMoodSwitch.id,
  fixtureFamily: "curtain-strip",
  powerW: 12,
  luminousFluxLm: 900,
  cri: 95
});
const masterBedsideLights = [
  ["L-2F-SHOWROOM-MASTER-BEDSIDE-01", { x: 6170, y: 5650 }, "主卧北侧床头阅读灯"],
  ["L-2F-SHOWROOM-MASTER-BEDSIDE-02", { x: 6170, y: 7350 }, "主卧南侧床头阅读灯"]
].map(([id, positionMm, label]) => makeLight({
  id,
  floorId: "2F",
  roomId: "ROOM-2F-006",
  positionMm,
  heightMm: 1250,
  label,
  notes: "2700K定向暖光，左右独立灯具但归入主卧暖光场景；最终安装高度按床垫完成面复核。",
  type: "bedsideReadingLight",
  lightingLayer: "decorative",
  beamAngle: 36,
  mountingType: "wallMounted",
  controlGroupId: masterMoodGroup,
  relatedSwitchId: masterMoodSwitch.id,
  fixtureFamily: "bed-reading",
  powerW: 6,
  luminousFluxLm: 420
}));
ensureSwitch({ ...masterMoodSwitch, lightIds: [masterCove.id, ...masterBedsideLights.map((light) => light.id)] });
addCoveCeiling({
  id: "C-2F-SHOWROOM-MASTER-COVE-01",
  floorId: "2F",
  roomId: "ROOM-2F-006",
  positionMm: { x: 7550, y: 6500 },
  label: "2F主卧样板间有机曲线悬浮顶灯槽",
  material: "暖白矿物涂层",
  pathMm: [{ x: 6200, y: 6100 }, { x: 6800, y: 5400 }, { x: 7800, y: 5200 }, { x: 8780, y: 5600 }, { x: 9110, y: 6500 }, { x: 8780, y: 7350 }, { x: 7800, y: 7580 }, { x: 6800, y: 7440 }],
  relatedLightIds: [masterCove.id],
  dropMm: 90,
  bandWidthMm: 110,
  lipMm: 24,
  pathMode: "catmullRom"
});

const masterWardrobe = workspace.furniture.find((item) => item.roomId === "ROOM-2F-006" && /衣柜/.test(`${item.name} ${item.type}`));
const wardrobeSwitch = ensureSwitch({
  id: "SW-2F-SHOWROOM-MASTER-WARDROBE-01",
  floorId: "2F",
  roomId: "ROOM-2F-006",
  positionMm: { x: 9300, y: 6500 },
  label: "2F主卧整面衣柜感应灯控制",
  notes: "衣柜门控感应灯独立于主卧氛围光；柜内电源、驱动和检修口随柜体深化。",
  controlGroupId: "CG-2F-SHOWROOM-MASTER-WARDROBE",
  lightIds: []
});
const masterWardrobeLight = makeLight({
  id: "L-2F-SHOWROOM-MASTER-WARDROBE-01",
  floorId: "2F",
  roomId: "ROOM-2F-006",
  positionMm: { x: 9195, y: 6500 },
  heightMm: 2100,
  label: "2F主卧整面衣柜3000K感应灯带",
  notes: "3000K高显色柜内灯，明确服务整面衣柜；与卧室2700K氛围光分组。",
  type: "wardrobeSensorStrip",
  lightingLayer: "cabinetStrip",
  colorTemperature: "3000K",
  beamAngle: 110,
  mountingType: "cabinetIntegrated",
  controlGroupId: wardrobeSwitch.controlGroupId,
  relatedSwitchId: wardrobeSwitch.id,
  fixtureFamily: "cabinet-strip",
  powerW: 8,
  luminousFluxLm: 650,
  cri: 95,
  relatedFurnitureId: masterWardrobe?.id ?? null,
  relatedFurniturePositionMm: { x: 9195, y: 6500 }
});
ensureSwitch({ ...wardrobeSwitch, lightIds: [masterWardrobeLight.id] });

const corridorSwitch = ensureSwitch({
  id: "SW-2F-SHOWROOM-CORRIDOR-NIGHT-01",
  floorId: "2F",
  roomId: "ROOM-2F-007",
  positionMm: { x: 5750, y: 3950 },
  label: "2F走廊低位夜灯控制",
  notes: "起夜场景只保留低位暖光，不联动走廊基础顶灯；支持人体感应延时关闭。",
  controlGroupId: "CG-2F-SHOWROOM-CORRIDOR-NIGHT",
  lightIds: []
});
const corridorNight = makeLight({
  id: "L-2F-SHOWROOM-CORRIDOR-NIGHT-01",
  floorId: "2F",
  roomId: "ROOM-2F-007",
  positionMm: { x: 5900, y: 3950 },
  heightMm: 300,
  label: "2F走廊样板间低位起夜灯",
  notes: "2700K遮光向下，作为主卧到楼梯的夜间安全光；不直射视线。",
  type: "lowLevelNightLight",
  lightingLayer: "decorative",
  beamAngle: 90,
  mountingType: "wallMounted",
  controlGroupId: corridorSwitch.controlGroupId,
  relatedSwitchId: corridorSwitch.id,
  fixtureFamily: "night-light",
  powerW: 2,
  luminousFluxLm: 120,
  cri: 90
});
ensureSwitch({ ...corridorSwitch, lightIds: [corridorNight.id] });

// 2026-08 lighting correction: replace single-point base lighting with a
// distributed, low-glare grid. The existing mood, task and cabinet circuits
// stay independent so every room can still be dimmed by layer.
const distributedAmbientLights = [
  ...addDistributedAmbientPack({
    floorId: "2F",
    roomId: "ROOM-2F-006",
    groupId: "CG-2F-2F-006-AMBIENT",
    switchId: "SW-2F-V1-25",
    ids: ["L-2F-SHOWROOM-MASTER-AMBIENT-02", "L-2F-SHOWROOM-MASTER-AMBIENT-03", "L-2F-SHOWROOM-MASTER-AMBIENT-04", "L-2F-SHOWROOM-MASTER-AMBIENT-05"],
    positions: [{ x: 8050, y: 3850 }, { x: 9000, y: 3850 }, { x: 7100, y: 6900 }, { x: 8500, y: 6900 }],
    label: "2F主卧分布式基础照明",
    notes: "3000K低眩宽光束筒灯沿床区、通行区和衣柜前均匀布置；不把单盏灯压在床头正上方，基础层建议日常调至45%–65%。"
  }),
  ...addDistributedAmbientPack({
    floorId: "2F",
    roomId: "ROOM-2F-004",
    groupId: "CG-2F-2F-004-AMBIENT",
    switchId: "SW-2F-V1-13",
    ids: ["L-2F-BEDROOM1-AMBIENT-02", "L-2F-BEDROOM1-AMBIENT-03"],
    positions: [{ x: 1500, y: 5850 }, { x: 3300, y: 5850 }],
    label: "2F卧室1分布式基础照明",
    notes: "3000K低眩筒灯均匀照亮床侧与衣柜前，避免小卧室只靠一盏中心灯。"
  }),
  ...addDistributedAmbientPack({
    floorId: "2F",
    roomId: "ROOM-2F-005",
    groupId: "CG-2F-2F-005-AMBIENT",
    switchId: "SW-2F-V1-19",
    ids: ["L-2F-BEDROOM2-AMBIENT-02", "L-2F-BEDROOM2-AMBIENT-03"],
    positions: [{ x: 4450, y: 5550 }, { x: 5900, y: 7000 }],
    label: "2F卧室2分布式基础照明",
    notes: "3000K低眩筒灯覆盖床区和衣柜前，基础、床头、书桌三层分开控制。"
  }),
  ...addDistributedAmbientPack({
    floorId: "2F",
    roomId: "ROOM-2F-007",
    groupId: "CG-2F-2F-007-AMBIENT",
    switchId: "SW-2F-V1-26",
    ids: ["L-2F-CORRIDOR-AMBIENT-02", "L-2F-CORRIDOR-AMBIENT-03"],
    positions: [{ x: 2000, y: 3950 }, { x: 6500, y: 3950 }],
    label: "2F走廊连续基础照明",
    notes: "走廊采用三点低眩均匀照明，夜间由独立低位灯替代，不与基础层同时满亮。"
  }),
  ...addDistributedAmbientPack({
    floorId: "2F",
    roomId: "ROOM-2F-001",
    groupId: "CG-2F-2F-001-AMBIENT",
    switchId: "SW-2F-V1-01",
    ids: ["L-2F-GUEST-BATH-AMBIENT-02"],
    positions: [{ x: 4550, y: 1800 }],
    label: "2F客卫均匀基础照明",
    notes: "卫生间基础光补足洗手区和马桶区，镜前光、淋浴光与夜灯保持独立。"
  }),
  ...addDistributedAmbientPack({
    floorId: "2F",
    roomId: "ROOM-2F-002",
    groupId: "CG-2F-2F-002-AMBIENT",
    switchId: "SW-2F-V1-05",
    ids: ["L-2F-CLOSET-AMBIENT-02"],
    positions: [{ x: 7000, y: 1200 }],
    label: "2F衣帽间均匀基础照明",
    notes: "基础光覆盖通道，衣柜内部灯带和梳妆台功能灯单独调光，避免服装颜色判断受暖光干扰。"
  }),
  ...addDistributedAmbientPack({
    floorId: "2F",
    roomId: "ROOM-2F-003",
    groupId: "CG-2F-2F-003-AMBIENT",
    switchId: "SW-2F-V1-08",
    ids: ["L-2F-MASTER-BATH-AMBIENT-02"],
    positions: [{ x: 8600, y: 1800 }],
    label: "2F主卫均匀基础照明",
    notes: "主卫基础光覆盖干区和通道，镜前、淋浴、浴缸氛围光分组，避免湿区出现单点强光。"
  }),
  ...addDistributedAmbientPack({
    floorId: "B1",
    roomId: "ROOM-B1-002",
    groupId: "CG-B1-B1-002-AMBIENT",
    switchId: "SW-B1-V1-05",
    ids: ["L-B1-ROOM-AMBIENT-02", "L-B1-ROOM-AMBIENT-03", "L-B1-ROOM-AMBIENT-04"],
    positions: [{ x: 6800, y: 950 }, { x: 8500, y: 950 }, { x: 8200, y: 2450 }],
    label: "B1房间分布式基础照明",
    notes: "B1房间采用3000K分布式基础光，覆盖床区、衣柜和入口；床头、书桌、窗帘盒与夜灯独立控制。"
  }),
  ...addDistributedAmbientPack({
    floorId: "B1",
    roomId: "ROOM-B1-004",
    groupId: "CG-B1-B1-004-AMBIENT",
    switchId: "SW-B1-V1-12",
    ids: ["L-B1-ACTIVITY-AMBIENT-02", "L-B1-ACTIVITY-AMBIENT-03", "L-B1-ACTIVITY-AMBIENT-04"],
    positions: [{ x: 1800, y: 4000 }, { x: 3150, y: 4000 }, { x: 5700, y: 6800 }],
    label: "B1活动区分布式基础照明",
    notes: "活动区基础光均匀覆盖阅读、游戏和通行区域；吊灯负责中心氛围，书架/背景墙重点光独立调节。"
  }),
  ...addDistributedAmbientPack({
    floorId: "B1",
    roomId: "ROOM-B1-003",
    groupId: "CG-B1-B1-003-AMBIENT",
    switchId: "SW-B1-V1-11",
    ids: ["L-B1-CORRIDOR-AMBIENT-02", "L-B1-CORRIDOR-AMBIENT-03"],
    positions: [{ x: 4500, y: 3800 }, { x: 5000, y: 5200 }],
    label: "B1走廊连续基础照明",
    notes: "地下走廊补成连续低眩光带，基础层不追求高亮，夜间由低位导向光承担安全照明。"
  }),
  ...addDistributedAmbientPack({
    floorId: "B1",
    roomId: "ROOM-B1-001",
    groupId: "CG-B1-B1-001-AMBIENT",
    switchId: "SW-B1-V1-01",
    ids: ["L-B1-LAUNDRY-AMBIENT-02"],
    positions: [{ x: 5400, y: 1000 }],
    label: "B1洗衣盥洗间均匀基础照明",
    notes: "基础光覆盖洗衣、盥洗和入口，洗衣台任务灯与镜前灯单独控制，便于清洁和识色。"
  }),
  ...addDistributedAmbientPack({
    floorId: "B1",
    roomId: "ROOM-B1-005",
    groupId: "CG-B1-B1-005-AMBIENT",
    switchId: "SW-B1-V1-14",
    ids: ["L-B1-STAIR-AMBIENT-02"],
    positions: [{ x: 2000, y: 4200 }],
    label: "B1楼梯间连续基础照明",
    notes: "楼梯间基础光补齐上下平台，踏步灯和平台氛围光继续独立控制。"
  }),
  ...addDistributedAmbientPack({
    floorId: "B2",
    roomId: "ROOM-B2-001",
    groupId: "CG-B2-B2-001-AMBIENT",
    switchId: "SW-B2-V1-01",
    ids: ["L-B2-LIVING-AMBIENT-02", "L-B2-LIVING-AMBIENT-03", "L-B2-LIVING-AMBIENT-04", "L-B2-LIVING-AMBIENT-05"],
    positions: [{ x: 4500, y: 1000 }, { x: 6500, y: 1000 }, { x: 4500, y: 2500 }, { x: 7000, y: 4000 }],
    label: "B2客厅分布式基础照明",
    notes: "B2客厅基础光均匀覆盖沙发、通行和电视墙前区域；电视墙洗墙、壁炉重点、窗帘灯和柜体灯独立控制，避免屏幕反光。"
  }),
  ...addDistributedAmbientPack({
    floorId: "B2",
    roomId: "ROOM-B2-003",
    groupId: "CG-B2-B2-003-AMBIENT",
    switchId: "SW-B2-V1-14",
    ids: ["L-B2-ACTIVITY-AMBIENT-02", "L-B2-ACTIVITY-AMBIENT-03", "L-B2-ACTIVITY-AMBIENT-04"],
    positions: [{ x: 6500, y: 5800 }, { x: 8000, y: 5800 }, { x: 8000, y: 7200 }],
    label: "B2活动区分布式基础照明",
    notes: "活动区基础光覆盖开放活动面，背景灯带和展示重点光单独调节，支持清洁、聚会和夜间三种亮度。"
  }),
  ...addDistributedAmbientPack({
    floorId: "B2",
    roomId: "ROOM-B2-005",
    groupId: "CG-B2-B2-005-AMBIENT",
    switchId: "SW-B2-V1-12",
    ids: ["L-B2-STUDY-AMBIENT-02", "L-B2-STUDY-AMBIENT-03"],
    positions: [{ x: 1800, y: 5600 }, { x: 4500, y: 7000 }],
    label: "B2书房分布式基础照明",
    notes: "书房基础光覆盖入口、桌面周边和酒柜前，桌面任务吊灯承担工作照度，镜柜和酒柜灯独立控制。"
  }),
  ...addDistributedAmbientPack({
    floorId: "B2",
    roomId: "ROOM-B2-002",
    groupId: "CG-B2-B2-002-AMBIENT",
    switchId: "SW-B2-V1-06",
    ids: ["L-B2-STAIR-AMBIENT-02"],
    positions: [{ x: 3200, y: 3900 }],
    label: "B2楼梯间连续基础照明",
    notes: "楼梯间基础光覆盖入口、平台和转折区，踏步灯承担夜间导向。"
  }),
  ...addDistributedAmbientPack({
    floorId: "B2",
    roomId: "ROOM-B2-004",
    groupId: "CG-B2-B2-004-AMBIENT",
    switchId: "SW-B2-V1-09",
    ids: ["L-B2-STORAGE-AMBIENT-02"],
    positions: [{ x: 1800, y: 3500 }],
    label: "B2楼梯下储物间均匀基础照明",
    notes: "储物间增加一盏基础灯，覆盖收纳门前与取物区，避免开门后出现深暗角落。"
  })
];

const masterFeatureGroup = "CG-2F-SHOWROOM-MASTER-FEATURE";
const masterFeatureSwitch = ensureSwitch({
  id: "SW-2F-SHOWROOM-MASTER-FEATURE-01",
  floorId: "2F",
  roomId: "ROOM-2F-006",
  positionMm: { x: 8400, y: 3300 },
  label: "2F主卧背景墙重点照明控制",
  notes: "两盏低眩洗墙灯照亮电视/背景墙材质，不直射屏幕；与基础光、床头光分开调节。",
  controlGroupId: masterFeatureGroup,
  lightIds: []
});
const masterFeatureLights = [
  ["L-2F-SHOWROOM-MASTER-FEATURE-01", { x: 8200, y: 3300 }],
  ["L-2F-SHOWROOM-MASTER-FEATURE-02", { x: 9000, y: 3300 }]
].map(([id, positionMm], index) => makeLight({
  id,
  floorId: "2F",
  roomId: "ROOM-2F-006",
  positionMm,
  heightMm: 2800,
  label: `2F主卧电视/背景墙洗墙灯 ${index + 1}`,
  notes: "2700K窄光束洗亮背景墙或艺术画面，灯轴避开电视屏幕反射；亮度建议20%–35%。",
  type: "wallWashSpotlight",
  lightingLayer: "accent",
  colorTemperature: "2700K",
  beamAngle: 24,
  mountingType: "recessed",
  controlGroupId: masterFeatureGroup,
  relatedSwitchId: masterFeatureSwitch.id,
  fixtureFamily: "narrow-wallwasher",
  powerW: 8,
  luminousFluxLm: 600,
  cri: 95
}));
ensureSwitch({ ...masterFeatureSwitch, lightIds: masterFeatureLights.map((light) => light.id) });

const masterNightGroup = "CG-2F-SHOWROOM-MASTER-NIGHT";
const masterNightSwitch = ensureSwitch({
  id: "SW-2F-SHOWROOM-MASTER-NIGHT-01",
  floorId: "2F",
  roomId: "ROOM-2F-006",
  positionMm: { x: 6800, y: 6100 },
  label: "2F主卧低位起夜灯控制",
  notes: "人体感应低位暖光，睡眠场景只保留床侧和通往卫生间方向的安全光。",
  controlGroupId: masterNightGroup,
  lightIds: []
});
const masterNightLight = makeLight({
  id: "L-2F-SHOWROOM-MASTER-NIGHT-01",
  floorId: "2F",
  roomId: "ROOM-2F-006",
  positionMm: { x: 6800, y: 6100 },
  heightMm: 300,
  label: "2F主卧低位起夜灯",
  notes: "2700K遮光向下，沿床侧通往主卫方向提供安全导向，不照射枕头和视线。",
  type: "lowLevelNightLight",
  lightingLayer: "decorative",
  colorTemperature: "2700K",
  beamAngle: 90,
  mountingType: "wallMounted",
  controlGroupId: masterNightGroup,
  relatedSwitchId: masterNightSwitch.id,
  fixtureFamily: "night-light",
  powerW: 2,
  luminousFluxLm: 120,
  cri: 90
});
ensureSwitch({ ...masterNightSwitch, lightIds: [masterNightLight.id] });

const newGroups = [b2CabinetGroup, masterMoodGroup, wardrobeSwitch.controlGroupId, corridorSwitch.controlGroupId, masterFeatureGroup, masterNightGroup];
for (const groupId of newGroups) {
  addSceneState("SCENE-ALL-CLEAN", groupId, 100);
  addSceneState("SCENE-DAILY", groupId, groupId.includes("WARDROBE") ? 25 : 45);
}
addSceneState("SCENE-MOVIE", livingCoveGroup, 15);
addSceneState("SCENE-BEDTIME", masterMoodGroup, 30);
addSceneState("SCENE-BEDTIME", wardrobeSwitch.controlGroupId, 0);
addSceneState("SCENE-NIGHT", corridorSwitch.controlGroupId, 15);
addSceneState("SCENE-1F-LIVING-MOVIE", livingCoveGroup, 15);
addSceneState("SCENE-1F-LIVING-NIGHT", livingCoveGroup, 20);

const customScenes = [
  {
    id: "SCENE-B2-SHOWROOM-WARM",
    name: "B2样板间暖光氛围",
    category: "room",
    floorId: "B2",
    roomId: "ROOM-B2-001",
    groupStates: [
      { controlGroupId: b2MoodGroup, on: true, brightness: 52 },
      { controlGroupId: b2CabinetGroup, on: true, brightness: 38 },
      { controlGroupId: "CG-B2-B2-001-TV-WALL", on: true, brightness: 18 }
    ],
    notes: "椭圆顶反射光、壁炉洗墙和柜体暖光形成三层样板间氛围；亮度现场调试。",
    status: "draft"
  },
  {
    id: "SCENE-2F-MASTER-SHOWROOM-WARM",
    name: "2F主卧样板间暖光",
    category: "room",
    floorId: "2F",
    roomId: "ROOM-2F-006",
    groupStates: [
      { controlGroupId: "CG-2F-2F-006-AMBIENT", on: true, brightness: 55 },
      { controlGroupId: masterMoodGroup, on: true, brightness: 42 },
      { controlGroupId: masterFeatureGroup, on: true, brightness: 22 },
      { controlGroupId: masterNightGroup, on: false, brightness: 0 },
      { controlGroupId: wardrobeSwitch.controlGroupId, on: false, brightness: 0 }
    ],
    notes: "分布式基础光负责均匀照度，曲线灯槽和床头阅读灯形成2700K包裹感，背景墙重点光拉开层次，衣柜感应灯不作为常亮氛围光。",
    status: "draft"
  },
  {
    id: "SCENE-2F-MASTER-BEDTIME",
    name: "2F主卧睡前低亮",
    category: "room",
    floorId: "2F",
    roomId: "ROOM-2F-006",
    groupStates: [
      { controlGroupId: "CG-2F-2F-006-AMBIENT", on: false, brightness: 0 },
      { controlGroupId: masterMoodGroup, on: true, brightness: 18 },
      { controlGroupId: masterFeatureGroup, on: true, brightness: 10 },
      { controlGroupId: masterNightGroup, on: true, brightness: 15 },
      { controlGroupId: wardrobeSwitch.controlGroupId, on: false, brightness: 0 }
    ],
    notes: "基础层关闭，仅保留床头/顶槽微光、背景墙低亮和低位起夜灯；进入睡眠后由人体感应唤醒夜灯。",
    status: "draft"
  },
  {
    id: "SCENE-B1-LAYERED-DAILY",
    name: "B1地下层日常分层",
    category: "floor",
    floorId: "B1",
    groupStates: [
      { controlGroupId: "CG-B1-B1-002-AMBIENT", on: true, brightness: 52 },
      { controlGroupId: "CG-B1-B1-002-BEDSIDE", on: true, brightness: 28 },
      { controlGroupId: "CG-B1-B1-004-AMBIENT", on: true, brightness: 48 },
      { controlGroupId: "CG-B1-B1-004-ACT", on: true, brightness: 30 },
      { controlGroupId: "CG-B1-B1-004-MOOD", on: true, brightness: 24 },
      { controlGroupId: "CG-B1-B1-003-AMBIENT", on: true, brightness: 35 },
      { controlGroupId: "CG-B1-B1-005-AMBIENT", on: true, brightness: 32 }
    ],
    notes: "B1以均匀基础光为底，活动区用吊灯和背景重点光塑造氛围，房间床头光、走廊和楼梯低亮独立控制。",
    status: "draft"
  },
  {
    id: "SCENE-B2-LIVING-LAYERED-DAILY",
    name: "B2客厅分层日常",
    category: "floor",
    floorId: "B2",
    groupStates: [
      { controlGroupId: "CG-B2-B2-001-AMBIENT", on: true, brightness: 48 },
      { controlGroupId: "CG-B2-B2-001-FEATURE", on: true, brightness: 26 },
      { controlGroupId: "CG-B2-B2-001-TV-WALL", on: true, brightness: 14 },
      { controlGroupId: "CG-B2-B2-001-CURTAIN", on: true, brightness: 22 },
      { controlGroupId: "CG-B2-B2-003-AMBIENT", on: true, brightness: 45 },
      { controlGroupId: "CG-B2-B2-003-MOOD", on: true, brightness: 22 },
      { controlGroupId: "CG-B2-B2-005-AMBIENT", on: true, brightness: 45 },
      { controlGroupId: "CG-B2-B2-005-DESK", on: true, brightness: 65 }
    ],
    notes: "B2客厅用均匀基础光保证可见度，壁炉/电视墙/悬浮顶和柜体光负责层次；活动区与书房可按使用状态独立压低。",
    status: "draft"
  }
];
workspace.lightingDesign ??= { version: "modern-warm-v1", style: "modern-warm", fixtureFamilies: [], scenes: [] };
// Keep the canonical schema version stable; the showroom standard is tracked by
// the workspace revision below so older validators and migrations remain compatible.
workspace.lightingDesign.version = "modern-warm-v1";
for (const scene of customScenes) {
  const index = workspace.lightingDesign.scenes.findIndex((candidate) => candidate.id === scene.id);
  if (index >= 0) workspace.lightingDesign.scenes[index] = scene;
  else workspace.lightingDesign.scenes.push(scene);
}

// Preserve explicit edits made to generated controls. The next generator pass
// should report them as conflicts instead of silently replacing the showroom
// control grouping or notes.
const generatedPreview = generateLightingDesignV1({
  structuresByFloor: workspace.houseStructuresByFloor,
  furniture: workspace.furniture,
  existingItems: items,
  floorIds: workspace.floors.map((floor) => floor.id),
  now
});
const generatedByKey = new Map(generatedPreview.items.filter((item) => item.generatedKey).map((item) => [item.generatedKey, item]));
items.forEach((item) => {
  if (!item.generatedKey) return;
  const desired = generatedByKey.get(item.generatedKey);
  if (desired?.generatedFingerprint && item.generatedFingerprint !== desired.generatedFingerprint) item.generatedFingerprint = desired.generatedFingerprint;
});

const allItemIds = new Set(workspace.drawingPackage?.drawingItemIds ?? []);
for (const item of items) allItemIds.add(item.id);
workspace.drawingPackage = {
  ...(workspace.drawingPackage ?? {}),
  drawingItemIds: [...allItemIds],
  updatedAt: now
};
workspace.defaultWorkspaceRevision = "2026-08-09-lighting-showroom-standard-v1";
workspace.updatedAt = now;

fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`, "utf8");

const addedIds = [
  b2Cove.id, b2WallWash.id, b2TvBase.id, b2Wine.id, waterbarMirror.id, livingCove.id, b1Cove.id,
  masterCove.id, ...masterBedsideLights.map((light) => light.id), masterWardrobeLight.id, corridorNight.id
];
console.log(JSON.stringify({
  revision: workspace.defaultWorkspaceRevision,
  addedLights: addedIds.length,
  addedLightIds: addedIds,
  totalLights: items.filter((item) => item.category === "light").length,
  totalSwitches: items.filter((item) => item.category === "switch").length,
  totalScenes: workspace.lightingDesign.scenes.length,
  addedCeilings: ["C-B2-SHOWROOM-OVAL-01", "C-1F-SHOWROOM-LIVING-COVE-01", "C-B1-SHOWROOM-ACTIVITY-COVE-01", "C-2F-SHOWROOM-MASTER-COVE-01"]
}, null, 2));
