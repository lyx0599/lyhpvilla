import { createDrawingItem, getDrawingItemGeneratedFingerprint } from "./drawing-items.ts";
import { pointInPolygon } from "./furniture-placement.ts";
import { SITE_PLAN_MAX_Y_MM, SITE_PLAN_MIN_Y_MM } from "./house-geometry.ts";
import type {
  DrawingItem,
  FloorId,
  Furniture,
  HouseOutdoor,
  HouseRoom,
  HouseStructure,
  LightColorTemperature,
  LightingLayer,
  LightMountingType,
  MmPoint,
  RoomTourView
} from "../types/space";
import type { LightingDesign, LightingFixtureFamily, LightingScene } from "../types/workspace";

export const lightingLayerLabels: Record<LightingLayer, string> = {
  ambient: "基础照明",
  task: "功能照明",
  accent: "重点照明",
  decorative: "氛围照明",
  cabinetStrip: "柜内灯带",
  mirrorLight: "镜前灯",
  outdoor: "户外灯"
};

export const lightingLayers = Object.keys(lightingLayerLabels) as LightingLayer[];

export const lightMountingTypeLabels: Record<LightMountingType, string> = {
  recessed: "嵌入式",
  surfaceMounted: "明装",
  pendant: "吊装",
  wallMounted: "壁装",
  concealed: "暗藏",
  cabinetIntegrated: "柜体集成",
  mirrorIntegrated: "镜体集成",
  stepMounted: "踏步/踢脚安装",
  floorMounted: "地面安装",
  bollard: "草坪/路径灯",
  groundSpike: "插地安装"
};

export const lightMountingTypes = Object.keys(lightMountingTypeLabels) as LightMountingType[];

type LightingSpace = Pick<HouseRoom, "id" | "name" | "boundary"> | Pick<HouseOutdoor, "id" | "name" | "polygon">;

type LightIntent = {
  key: string;
  name: string;
  lightType: string;
  layer: LightingLayer;
  colorTemperature: LightColorTemperature;
  beamAngle: number | null;
  mountingType: LightMountingType;
  heightMm: number | null;
  position: MmPoint;
  roomId: string;
  furnitureId?: string | null;
  hostWallId?: string | null;
  hostCeilingAreaId?: string | null;
  directionDeg?: number | null;
  smartControl: boolean;
  dimming: boolean;
  optional?: boolean;
  source?: "generated-from-room" | "generated-from-furniture";
  lightSpec?: NonNullable<DrawingItem["lightSpec"]>;
  notes: string;
};

export type LightingDesignGenerationResult = {
  items: DrawingItem[];
  created: number;
  updated: number;
  skipped: number;
  conflicts: DrawingItem[];
  lightCount: number;
  switchCount: number;
  floorSummary: Array<{ floorId: FloorId; lights: number; switches: number; rooms: number }>;
  lightingDesign: LightingDesign;
  recommendedViews: RoomTourView[];
};

export const modernWarmFixtureFamilies: LightingFixtureFamily[] = [
  ["deep-cup-downlight", "防眩深杯筒灯", "antiGlareDownlight", "recessed", "3000K", 50, 9, 720, 90, "UGR<19", undefined, "哑白 / 哑黑"],
  ["adjustable-spot", "可调角射灯", "adjustableSpotlight", "recessed", "3000K", 24, 10, 780, 90, "深藏光源", undefined, "哑黑 / 哑白"],
  ["narrow-wallwasher", "窄光束洗墙射灯", "wallWashSpotlight", "recessed", "3000K", 18, 10, 760, 90, "蜂窝防眩", undefined, "哑黑"],
  ["wide-downlight", "宽光束基础筒灯", "wideBeamDownlight", "recessed", "3000K", 60, 9, 760, 90, "UGR<19", undefined, "哑白"],
  ["linear-pendant", "线性吊灯", "linearPendant", "pendant", "3000K", 50, 28, 2200, 90, "下照防眩", undefined, "深灰 / 黑色"],
  ["round-table-pendant", "圆桌装饰吊灯", "roundTablePendant", "pendant", "2700K", 40, 24, 1800, 90, "柔光罩", undefined, "黑色 / 香槟金属"],
  ["under-cabinet-strip", "柜下灯带", "underCabinetStrip", "cabinetIntegrated", "3500K", 110, 12, 1000, 95, "连续无暗区", undefined, "铝色型材"],
  ["curtain-strip", "窗帘盒灯带", "curtainCoveStrip", "concealed", "2700K", 120, 10, 850, 90, "不可见光源", undefined, "隐藏安装"],
  ["cabinet-strip", "柜内灯带", "cabinetSensorStrip", "cabinetIntegrated", "3000K", 110, 8, 650, 95, "门控感应", undefined, "铝色型材"],
  ["mirror-light", "镜前灯", "linearMirrorLight", "mirrorIntegrated", "3500K", 100, 14, 1100, 95, "正面柔光", "IP44", "镜体一体"],
  ["bed-reading", "床头阅读灯", "bedsideReadingLight", "wallMounted", "2700K", 36, 6, 420, 90, "独立调光", undefined, "黑色 / 拉丝金属"],
  ["night-light", "低位起夜灯", "lowLevelNightLight", "wallMounted", "2700K", 90, 2, 120, 90, "遮光向下", undefined, "哑白"],
  ["step-light", "踏步灯", "stairStepLight", "stepMounted", "2700K", 90, 2, 120, 90, "遮光向下", undefined, "深灰"],
  ["outdoor-wall", "户外壁灯", "outdoorWallLight", "wallMounted", "3000K", 60, 8, 520, 90, "向下遮光", "IP65", "深灰"],
  ["bollard", "草坪灯", "bollardPathLight", "bollard", "3000K", 90, 8, 480, 90, "低眩路径光", "IP65", "深灰"],
  ["in-ground", "地埋灯", "inGroundLight", "floorMounted", "2700K", 24, 8, 520, 90, "防眩格栅", "IP67", "不锈钢"],
  ["tree-uplight", "照树灯", "plantUplight", "groundSpike", "2700K", 24, 10, 720, 90, "可调方向", "IP66", "深灰"],
  ["yard-task", "庭院操作灯", "outdoorTaskLight", "cabinetIntegrated", "3500K", 100, 14, 1100, 95, "连续工作面照明", "IP65", "深灰 / 铝色"]
].map(([id, name, lightType, mountingType, defaultColorTemperature, defaultBeamAngle, powerW, luminousFluxLm, cri, glareRating, waterproofRating, finish]) => ({
  id: id as string,
  name: name as string,
  lightType: lightType as string,
  mountingType: mountingType as LightMountingType,
  defaultColorTemperature: defaultColorTemperature as LightColorTemperature,
  defaultBeamAngle: defaultBeamAngle as number,
  defaultLightSpec: { powerW: powerW as number, luminousFluxLm: luminousFluxLm as number, cri: cri as number, glareRating: glareRating as string, ...(waterproofRating ? { waterproofRating: waterproofRating as string } : {}), fixtureFamily: id as string, trimColor: finish as string },
  finishOptions: String(finish).split(" / "),
  notes: "现代温暖型默认家族；第一版为设计参数，品牌、功率与 IES 配光待选型。"
}));

const fixtureFamilyById = new Map(modernWarmFixtureFamilies.map((family) => [family.id, family]));

function spec(familyId: string, overrides: NonNullable<DrawingItem["lightSpec"]> = {}) {
  return { ...(fixtureFamilyById.get(familyId)?.defaultLightSpec ?? {}), ...overrides, fixtureFamily: familyId };
}

function pointsOf(space: LightingSpace) {
  return "boundary" in space ? space.boundary : space.polygon;
}

function centerOf(space: LightingSpace): MmPoint {
  const points = pointsOf(space);
  if (!points.length) return { x: 0, y: 0 };
  return {
    x: Math.round(points.reduce((sum, point) => sum + point.x, 0) / points.length),
    y: Math.round(points.reduce((sum, point) => sum + point.y, 0) / points.length)
  };
}

function clampToStructure(point: MmPoint, structure: HouseStructure): MmPoint {
  const { origin, width, height } = structure.coordinateSystem;
  const minY = structure.floorId === "YARD" ? SITE_PLAN_MIN_Y_MM : origin.y;
  const maxY = structure.floorId === "YARD" ? SITE_PLAN_MAX_Y_MM : origin.y + height;
  return {
    x: Math.round(Math.min(origin.x + width - 180, Math.max(origin.x + 180, point.x))),
    y: Math.round(Math.min(maxY - 180, Math.max(minY + 180, point.y)))
  };
}

function offset(point: MmPoint, x: number, y: number, structure: HouseStructure) {
  return clampToStructure({ x: point.x + x, y: point.y + y }, structure);
}

function furniturePoint(item: Furniture, structure: HouseStructure) {
  const cs = structure.coordinateSystem;
  return clampToStructure({
    x: cs.origin.x + item.position.x / 100 * cs.width,
    y: cs.origin.y + item.position.y / 100 * cs.height
  }, structure);
}

function spaceFurniture(spaceId: string, furniture: Furniture[]) {
  return furniture.filter((item) => item.roomId === spaceId);
}

function pickFurniture(items: Furniture[], pattern: RegExp) {
  return items.find((item) => pattern.test(`${item.id} ${item.name} ${item.moduleType ?? ""} ${item.type}`));
}

function polygonArea(points: MmPoint[]) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

function distance(a: MmPoint, b: MmPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function ambientPoints(room: HouseRoom, roomItems: Furniture[], structure: HouseStructure) {
  const center = centerOf(room);
  const desiredCount = Math.max(1, Math.min(4, Math.round(polygonArea(room.boundary) / 15_000_000)));
  const activityPoints = roomItems.map((item) => furniturePoint(item, structure));
  const candidates = room.boundary.map((point, index) => {
    const next = room.boundary[(index + 1) % room.boundary.length];
    const midpoint = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
    const segmentLength = Math.max(1, distance(point, next));
    const inset = Math.min(900, Math.max(450, segmentLength * 0.16));
    const vectorLength = Math.max(1, distance(midpoint, center));
    const candidate = clampToStructure({
      x: midpoint.x + (center.x - midpoint.x) / vectorLength * inset,
      y: midpoint.y + (center.y - midpoint.y) / vectorLength * inset
    }, structure);
    const activityClearance = activityPoints.length ? Math.min(...activityPoints.map((activity) => distance(candidate, activity))) : 9999;
    return { candidate, score: segmentLength + Math.min(activityClearance, 2200) };
  }).filter(({ candidate }) => pointInPolygon(candidate, room.boundary));
  const selected: MmPoint[] = [];
  candidates.sort((a, b) => b.score - a.score).forEach(({ candidate }) => {
    if (selected.length >= desiredCount || selected.some((point) => distance(point, candidate) < 1400)) return;
    selected.push(candidate);
  });
  return selected.length ? selected : [center];
}

function defaultFamilyForIntent(intent: LightIntent) {
  if (intent.lightType.includes("roundTable") || intent.lightType === "diningPendant") return "round-table-pendant";
  if (intent.mountingType === "pendant") return "linear-pendant";
  if (intent.layer === "mirrorLight") return "mirror-light";
  if (intent.layer === "cabinetStrip") return intent.lightType.includes("under") ? "under-cabinet-strip" : "cabinet-strip";
  if (intent.lightType.includes("curtain") || intent.lightType.includes("Cove")) return "curtain-strip";
  if (intent.lightType.includes("bedside") || intent.lightType.includes("Reading")) return "bed-reading";
  if (intent.lightType.includes("Night") || intent.lightType.includes("night")) return "night-light";
  if (intent.lightType.includes("stair") || intent.mountingType === "stepMounted") return "step-light";
  if (intent.layer === "outdoor") {
    if (intent.lightType.includes("plant")) return "tree-uplight";
    if (intent.lightType.includes("Cabinet") || intent.lightType.includes("Task")) return "yard-task";
    if (intent.mountingType === "bollard") return "bollard";
    if (intent.mountingType === "floorMounted") return "in-ground";
    return "outdoor-wall";
  }
  if (intent.layer === "accent") return intent.beamAngle && intent.beamAngle <= 18 ? "narrow-wallwasher" : "adjustable-spot";
  if (intent.layer === "ambient") return intent.beamAngle && intent.beamAngle >= 60 ? "wide-downlight" : "deep-cup-downlight";
  return "deep-cup-downlight";
}

function groupId(floorId: FloorId, roomId: string, key: string) {
  return `CG-${floorId}-${roomId.replace(/^(ROOM|OD)-/, "")}-${key}`.replace(/[^A-Za-z0-9-]+/g, "-").toUpperCase();
}

function inferHostWallId(item: Furniture | undefined, structure: HouseStructure) {
  const dependency = item?.constructionMeta?.wallDependency;
  if (dependency && structure.walls.some((wall) => wall.id === dependency)) return dependency;
  const idInText = `${item?.id ?? ""} ${item?.name ?? ""}`.match(/W-[A-Za-z0-9-]+/)?.[0];
  return idInText && structure.walls.some((wall) => wall.id === idInText) ? idInText : null;
}

function collectIndoorIntents(floorId: FloorId, structure: HouseStructure, furniture: Furniture[]) {
  const intents: LightIntent[] = [];
  const add = (intent: LightIntent) => intents.push(intent);

  structure.rooms.forEach((room) => {
    const center = centerOf(room);
    const roomItems = spaceFurniture(room.id, furniture);
    const isKitchen = /厨房/.test(room.name);
    const isBathroom = !isKitchen && (/卫生间|客卫|主卫|洗衣房/.test(room.name) || Boolean(pickFurniture(roomItems, /马桶|淋浴|浴室柜|洗手池/)));
    const isBedroom = /卧室|房间/.test(room.name) && !isBathroom;
    const isLiving = /客厅/.test(room.name);
    const isStudy = /书房/.test(room.name);
    const isActivity = /活动区/.test(room.name);
    const isStair = /楼梯/.test(room.name);
    const isCorridor = /走廊/.test(room.name);
    const isCloak = /衣帽间/.test(room.name);
    const isEntry = /玄关/.test(room.name);
    const isLaundry = /洗衣/.test(room.name);
    const ambientTemperature: LightColorTemperature = isKitchen || isBathroom || isStudy ? "3500K" : "3000K";

    ambientPoints(room, roomItems, structure).forEach((position, index) => add({
      key: `AMBIENT-${index + 1}`, name: `${room.name}边缘基础照明 ${index + 1}`, lightType: isStair || isCorridor ? "antiGlareLinearDownlight" : "wideBeamDownlight",
      layer: "ambient", colorTemperature: ambientTemperature, beamAngle: 60, mountingType: "recessed", heightMm: 2800,
      position, roomId: room.id, smartControl: isLiving || isBedroom || isActivity, dimming: isLiving || isBedroom || isActivity,
      lightSpec: spec("wide-downlight", { powerW: 11, luminousFluxLm: 950, cri: isKitchen || isLaundry ? 95 : 90 }),
      notes: "沿空间边缘与通道布置，不压在主要坐席或床头正上方；避开风口、检修口、梁位及柜门开启范围，施工前现场复核。"
    }));

    if (isBathroom) {
      const vanity = pickFurniture(roomItems, /台盆|浴室柜|洗手池/);
      const shower = pickFurniture(roomItems, /淋浴/);
      const toilet = pickFurniture(roomItems, /马桶/);
      add({ key: "MIRROR", name: `${room.name}镜前灯`, lightType: "linearMirrorLight", layer: "mirrorLight", colorTemperature: "3500K", beamAngle: 100, mountingType: "mirrorIntegrated", heightMm: 1850, position: vanity ? furniturePoint(vanity, structure) : offset(center, 520, 380, structure), roomId: room.id, furnitureId: vanity?.id, hostWallId: inferHostWallId(vanity, structure), smartControl: false, dimming: true, source: vanity ? "generated-from-furniture" : "generated-from-room", lightSpec: spec("mirror-light", { cri: 95, waterproofRating: "IP44" }), notes: "从正面或两侧均匀照亮面部；电源与镜柜厂家深化同步，潮湿区接线盒做防潮处理。" });
      if (shower) {
        add({ key: "SHOWER", name: `${room.name}淋浴区防潮灯`, lightType: "wetAreaDownlight", layer: "task", colorTemperature: "3000K", beamAngle: 60, mountingType: "recessed", heightMm: 2800, position: furniturePoint(shower, structure), roomId: room.id, furnitureId: shower.id, smartControl: false, dimming: false, source: "generated-from-furniture", lightSpec: spec("wide-downlight", { waterproofRating: "IP44", cri: 90 }), notes: "淋浴区建议不低于 IP44，具体等级按安装分区与现场规范确认；不默认使用过冷色温。" });
      } else if (isLaundry) {
        const washer = pickFurniture(roomItems, /洗衣机/);
        add({ key: "LAUNDRY", name: `${room.name}洗衣操作任务灯`, lightType: "wetAreaDownlight", layer: "task", colorTemperature: "3500K", beamAngle: 60, mountingType: "recessed", heightMm: 2800, position: washer ? furniturePoint(washer, structure) : offset(center, -520, -380, structure), roomId: room.id, furnitureId: washer?.id, smartControl: false, dimming: false, source: washer ? "generated-from-furniture" : "generated-from-room", lightSpec: spec("wide-downlight", { waterproofRating: "IP44", cri: 95 }), notes: "照亮洗衣机投放、取衣和台盆操作区；按潮湿环境配置防潮灯具，不生成淋浴专用照明。" });
      }
      add({ key: "NIGHT", name: `${room.name}马桶夜灯（可选）`, lightType: "lowLevelNightLight", layer: "decorative", colorTemperature: "2700K", beamAngle: 90, mountingType: "wallMounted", heightMm: 300, position: toilet ? furniturePoint(toilet, structure) : offset(center, 600, -420, structure), roomId: room.id, furnitureId: toilet?.id, hostWallId: inferHostWallId(toilet, structure), smartControl: true, dimming: true, optional: true, source: toilet ? "generated-from-furniture" : "generated-from-room", lightSpec: spec("night-light", { waterproofRating: "IP44" }), notes: "人体感应低位夜灯；与基础照明分组，避免夜间眩光。" });
      const bathtub = pickFurniture(roomItems, /浴缸/);
      if (bathtub) add({ key: "BATH-MOOD", name: `${room.name}浴缸氛围灯`, lightType: "concealedBathCove", layer: "decorative", colorTemperature: "2700K", beamAngle: 120, mountingType: "concealed", heightMm: 450, position: furniturePoint(bathtub, structure), roomId: room.id, furnitureId: bathtub.id, smartControl: true, dimming: true, source: "generated-from-furniture", lightSpec: spec("curtain-strip", { waterproofRating: "IP44" }), notes: "浴缸氛围灯独立控制，灯带不可直接见光，防水分区与检修方式待深化。" });
    }

    if (isBedroom) {
      const bed = pickFurniture(roomItems, /床/);
      const wardrobe = pickFurniture(roomItems, /衣柜/);
      const desk = pickFurniture(roomItems, /书桌|梳妆|五斗橱/);
      const bedPoint = bed ? furniturePoint(bed, structure) : center;
      [-1, 1].forEach((side, index) => add({ key: `BEDSIDE-${index + 1}`, name: `${room.name}${side < 0 ? "左" : "右"}床头氛围灯 / 阅读灯`, lightType: "bedsideReadingLight", layer: "decorative", colorTemperature: "2700K", beamAngle: 36, mountingType: "wallMounted", heightMm: 1150, position: offset(bedPoint, side * 620, 320, structure), roomId: room.id, furnitureId: bed?.id, smartControl: true, dimming: true, source: bed ? "generated-from-furniture" : "generated-from-room", lightSpec: spec("bed-reading"), notes: "左右独立控制并纳入睡前场景；最终位置随床宽、床头柜及软包完成面复核。" }));
      if (wardrobe) add({ key: "WARDROBE", name: `${room.name}衣柜灯带`, lightType: "wardrobeSensorStrip", layer: "cabinetStrip", colorTemperature: "3000K", beamAngle: 110, mountingType: "cabinetIntegrated", heightMm: 2100, position: furniturePoint(wardrobe, structure), roomId: room.id, furnitureId: wardrobe.id, hostWallId: inferHostWallId(wardrobe, structure), smartControl: true, dimming: false, source: "generated-from-furniture", lightSpec: spec("cabinet-strip", { cri: 95 }), notes: "门控或人体感应；驱动电源留可检修位置，灯槽与柜体厂家同步深化。" });
      add({ key: "DESK", name: `${room.name}化妆/书桌功能灯`, lightType: "deskTaskLight", layer: "task", colorTemperature: "3500K", beamAngle: 40, mountingType: "surfaceMounted", heightMm: 1400, position: desk ? furniturePoint(desk, structure) : offset(center, 720, 0, structure), roomId: room.id, furnitureId: desk?.id, smartControl: false, dimming: true, optional: !desk, source: desk ? "generated-from-furniture" : "generated-from-room", lightSpec: spec("deep-cup-downlight", { cri: 95 }), notes: "书桌/化妆区预留独立功能灯与电源；无固定家具时仅表达设计意图。" });
      add({ key: "NIGHT", name: `${room.name}低位起夜灯`, lightType: "lowLevelNightLight", layer: "decorative", colorTemperature: "2700K", beamAngle: 90, mountingType: "wallMounted", heightMm: 300, position: offset(bedPoint, 0, 760, structure), roomId: room.id, furnitureId: bed?.id, smartControl: true, dimming: true, source: bed ? "generated-from-furniture" : "generated-from-room", lightSpec: spec("night-light"), notes: "起夜模式只开低位暖光，不联动卧室基础灯。" });
      add({ key: "CURTAIN", name: `${room.name}窗帘盒氛围灯`, lightType: "curtainCoveStrip", layer: "decorative", colorTemperature: "2700K", beamAngle: 120, mountingType: "concealed", heightMm: 2650, position: offset(center, 0, -650, structure), roomId: room.id, smartControl: true, dimming: true, optional: true, lightSpec: spec("curtain-strip"), notes: "仅在存在窗帘盒和吊顶条件时实施；灯槽尺寸与窗帘电机、检修空间同步深化。" });
    }

    if (isKitchen) {
      const counters = roomItems.filter((item) => /橱柜|备餐/.test(`${item.name} ${item.type}`));
      const sinks = roomItems.filter((item) => /水槽|sink/.test(`${item.name} ${item.type}`));
      const cooktop = pickFurniture(roomItems, /灶台|cooktop/);
      counters.forEach((counter, index) => add({ key: `COUNTER-${index + 1}`, name: `厨房台面功能灯 ${index + 1}`, lightType: "underCabinetTaskStrip", layer: "task", colorTemperature: "3500K", beamAngle: 100, mountingType: "cabinetIntegrated", heightMm: 1550, position: furniturePoint(counter, structure), roomId: room.id, furnitureId: counter.id, hostWallId: inferHostWallId(counter, structure), smartControl: false, dimming: false, source: "generated-from-furniture", lightSpec: spec("under-cabinet-strip", { cri: 95 }), notes: "吊柜下沿连续无暗区灯带；出光在操作人员前方，驱动、铝槽与出线随橱柜深化。" }));
      sinks.forEach((sink, index) => add({ key: `SINK-${index + 1}`, name: `厨房水槽任务灯 ${index + 1}`, lightType: "sinkTaskDownlight", layer: "task", colorTemperature: "3500K", beamAngle: 50, mountingType: "recessed", heightMm: 2800, position: offset(furniturePoint(sink, structure), 0, -420, structure), roomId: room.id, furnitureId: sink.id, smartControl: false, dimming: false, source: "generated-from-furniture", lightSpec: spec("deep-cup-downlight", { cri: 95 }), notes: "灯位落在操作者前上方，避免身体遮挡水槽工作面；与吊柜、窗扇和风口复核。" }));
      if (cooktop) add({ key: "COOKTOP", name: "厨房灶台任务灯", lightType: "cooktopTaskLight", layer: "task", colorTemperature: "3500K", beamAngle: 50, mountingType: "surfaceMounted", heightMm: 2200, position: furniturePoint(cooktop, structure), roomId: room.id, furnitureId: cooktop.id, smartControl: false, dimming: false, source: "generated-from-furniture", lightSpec: spec("deep-cup-downlight", { cri: 95 }), notes: "优先复用烟机自带工作灯；独立点位仅作补充，避开高温和油烟检修区。" });
    }

    if (isLiving) {
      const fireplace = pickFurniture(roomItems, /壁炉|背景墙|电视/);
      const sofa = pickFurniture(roomItems, /沙发/);
      if (fireplace) add({ key: "FEATURE", name: "壁炉/背景墙重点照明", lightType: "adjustableSpotlight", layer: "accent", colorTemperature: "3000K", beamAngle: 24, mountingType: "recessed", heightMm: 2800, position: offset(furniturePoint(fireplace, structure), 0, -700, structure), roomId: room.id, furnitureId: fireplace.id, hostWallId: inferHostWallId(fireplace, structure), smartControl: true, dimming: true, source: "generated-from-furniture", lightSpec: spec("adjustable-spot"), notes: "灯轴对准壁炉或材质墙，不直射电视屏幕；保留设备自身发光并控制辅助光亮度。" });
      if (fireplace) add({ key: "TV-WALL", name: "电视背景低亮度洗墙", lightType: "wallWashSpotlight", layer: "accent", colorTemperature: "2700K", beamAngle: 18, mountingType: "recessed", heightMm: 2800, position: offset(furniturePoint(fireplace, structure), 760, -650, structure), roomId: room.id, furnitureId: fireplace.id, smartControl: true, dimming: true, source: "generated-from-furniture", lightSpec: spec("narrow-wallwasher"), notes: "低亮度擦墙，灯轴避开屏幕反射角；观影场景仅保留约 10%–20%。" });
      add({ key: "READING", name: "客厅沙发阅读灯预留", lightType: "floorReadingLight", layer: "task", colorTemperature: "2700K", beamAngle: 36, mountingType: "floorMounted", heightMm: 1450, position: sofa ? offset(furniturePoint(sofa, structure), 850, 0, structure) : offset(center, 850, 450, structure), roomId: room.id, furnitureId: sofa?.id, smartControl: true, dimming: true, optional: !sofa, source: sofa ? "generated-from-furniture" : "generated-from-room", lightSpec: spec("bed-reading"), notes: "落地阅读灯或家具插座预留；避免顶灯正压沙发中心。" });
      add({ key: "CURTAIN", name: "客厅窗帘盒灯带", lightType: "curtainCoveStrip", layer: "decorative", colorTemperature: "2700K", beamAngle: 120, mountingType: "concealed", heightMm: 2650, position: offset(center, 0, -760, structure), roomId: room.id, smartControl: true, dimming: true, optional: true, lightSpec: spec("curtain-strip"), notes: "存在吊顶条件时设置低亮度窗帘盒灯带；与主照明分组，观影时可低亮保留。" });
    }

    if (isStudy) {
      const table = pickFurniture(roomItems, /桌|书桌|大板/);
      add({ key: "DESK", name: `${room.name}书桌功能灯`, lightType: "wideBeamTaskPendant", layer: "task", colorTemperature: "3500K", beamAngle: 60, mountingType: "pendant", heightMm: 1900, position: table ? furniturePoint(table, structure) : offset(center, 550, 0, structure), roomId: room.id, furnitureId: table?.id, smartControl: false, dimming: true, source: table ? "generated-from-furniture" : "generated-from-room", lightSpec: spec("linear-pendant", { cri: 95 }), notes: "桌面上方功能照明，吊装高度与桌面位置最终复核，避免屏幕反光。" });
    }

    if (isActivity) add({ key: "MOOD", name: `${room.name}氛围灯`, lightType: "indirectLinearLight", layer: "decorative", colorTemperature: "2700K", beamAngle: 120, mountingType: "concealed", heightMm: 2500, position: offset(center, 620, 420, structure), roomId: room.id, smartControl: true, dimming: true, lightSpec: spec("curtain-strip"), notes: "洗墙和灯带提高地下空间层次；与基础照明独立分组，避免低角度直射。" });

    if (isStair) {
      const stair = structure.stairs.find((item) => /楼梯/.test(item.name)) ?? structure.stairs[0];
      const stairPoint = stair ? { x: Math.round((stair.start.x + stair.end.x) / 2), y: Math.round((stair.start.y + stair.end.y) / 2) } : center;
      add({ key: "STEP", name: `${room.name}楼梯灯带 / 踏步低位灯`, lightType: "stairStepLight", layer: "decorative", colorTemperature: "2700K", beamAngle: 90, mountingType: "stepMounted", heightMm: 300, position: stairPoint, roomId: room.id, smartControl: true, dimming: true, lightSpec: spec("step-light"), notes: "楼梯上下口双控并预留人体感应；夜间只开低位灯，玻璃栏杆处避免眩光和反射。" });
      add({ key: "LANDING", name: `${room.name}平台安全灯`, lightType: "antiGlareDownlight", layer: "task", colorTemperature: "3000K", beamAngle: 50, mountingType: "recessed", heightMm: 2800, position: offset(stairPoint, 450, 0, structure), roomId: room.id, smartControl: true, dimming: true, lightSpec: spec("deep-cup-downlight"), notes: "平台和转折处保证安全照度，与踏步灯共享上下层双控或感应逻辑。" });
    }

    if (isEntry) {
      const cabinet = pickFurniture(roomItems, /柜|挂区|鞋/);
      if (cabinet) add({ key: "CABINET", name: "玄关柜内灯", lightType: "cabinetSensorStrip", layer: "cabinetStrip", colorTemperature: "3000K", beamAngle: 110, mountingType: "cabinetIntegrated", heightMm: 2000, position: furniturePoint(cabinet, structure), roomId: room.id, furnitureId: cabinet.id, hostWallId: inferHostWallId(cabinet, structure), smartControl: true, dimming: false, source: "generated-from-furniture", lightSpec: spec("cabinet-strip", { cri: 95 }), notes: "随柜门或人体感应开启，驱动可检修。" });
      add({ key: "LOW", name: "玄关柜底感应灯", lightType: "lowLevelNightLight", layer: "decorative", colorTemperature: "2700K", beamAngle: 90, mountingType: "cabinetIntegrated", heightMm: 120, position: cabinet ? furniturePoint(cabinet, structure) : offset(center, -450, 0, structure), roomId: room.id, furnitureId: cabinet?.id, smartControl: true, dimming: true, optional: !cabinet, source: cabinet ? "generated-from-furniture" : "generated-from-room", lightSpec: spec("night-light"), notes: "与入户门状态或人体感应联动，用于夜间回家；不联动全屋主灯。" });
      add({ key: "FEATURE", name: "玄关端景重点灯", lightType: "adjustableSpotlight", layer: "accent", colorTemperature: "3000K", beamAngle: 24, mountingType: "recessed", heightMm: 2800, position: offset(center, 620, 0, structure), roomId: room.id, smartControl: true, dimming: true, optional: true, lightSpec: spec("adjustable-spot"), notes: "仅在端景墙或艺术品最终确认后校准灯轴；当前为设计意图点。" });
    }

    if (isCloak) {
      const wardrobe = pickFurniture(roomItems, /柜/);
      const desk = pickFurniture(roomItems, /桌|梳妆/);
      if (wardrobe) add({ key: "WARDROBE", name: `${room.name}柜内灯带`, lightType: "wardrobeSensorStrip", layer: "cabinetStrip", colorTemperature: "3000K", beamAngle: 110, mountingType: "cabinetIntegrated", heightMm: 2100, position: furniturePoint(wardrobe, structure), roomId: room.id, furnitureId: wardrobe.id, hostWallId: inferHostWallId(wardrobe, structure), smartControl: true, dimming: false, source: "generated-from-furniture", lightSpec: spec("cabinet-strip", { cri: 95 }), notes: "门控/人体感应；高显色避免衣物颜色失真，驱动留可检修位置。" });
      if (desk) add({ key: "VANITY", name: `${room.name}梳妆功能灯`, lightType: "vanityTaskLight", layer: "task", colorTemperature: "3500K", beamAngle: 60, mountingType: "wallMounted", heightMm: 1650, position: furniturePoint(desk, structure), roomId: room.id, furnitureId: desk.id, hostWallId: inferHostWallId(desk, structure), smartControl: false, dimming: true, source: "generated-from-furniture", lightSpec: spec("mirror-light", { cri: 95 }), notes: "面部两侧或均匀线性出光，避免只有头顶光。" });
    }
  });

  if (floorId === "1F") {
    const addSpecial = (pattern: RegExp, intent: Omit<LightIntent, "position" | "roomId" | "furnitureId">) => {
      const item = pickFurniture(furniture, pattern);
      if (!item || item.lightingDesignExcluded) return;
      intents.push({ ...intent, position: furniturePoint(item, structure), roomId: item.roomId, furnitureId: item.id, hostWallId: intent.hostWallId ?? inferHostWallId(item, structure) });
    };
    addSpecial(/module-1f-table|六人圆餐桌/, { key: "DINING", name: "餐桌吊灯 / 六人圆桌装饰灯", lightType: "roundTablePendant", layer: "accent", colorTemperature: "2700K", beamAngle: 40, mountingType: "pendant", heightMm: 1700, smartControl: true, dimming: true, source: "generated-from-furniture", lightSpec: spec("round-table-pendant", { cri: 95 }), notes: "灯具中心对齐餐桌中心；灯下沿距桌面约 700–800mm。餐桌移动后按 relatedFurnitureId 同步复核灯位。" });
    addSpecial(/岛台/, { key: "ISLAND", name: "中岛功能照明 / 线性吊灯", lightType: "islandLinearPendant", layer: "task", colorTemperature: "3500K", beamAngle: 50, mountingType: "pendant", heightMm: 1850, smartControl: true, dimming: true, source: "generated-from-furniture", lightSpec: spec("linear-pendant", { cri: 95 }), notes: "对齐岛台长轴，兼顾操作面与通行净高；与餐桌灯分组，避开柜门、烟机和风口。" });
    addSpecial(/水吧台吊柜|餐边柜|零食柜/, { key: "SIDEBOARD", name: "餐边柜灯带", lightType: "sideboardStrip", layer: "cabinetStrip", colorTemperature: "3000K", beamAngle: 110, mountingType: "cabinetIntegrated", heightMm: 1650, smartControl: true, dimming: false, source: "generated-from-furniture", lightSpec: spec("cabinet-strip", { cri: 95 }), notes: "柜体感应并纳入用餐场景；驱动电源、灯槽与出线位置由柜体厂家深化。" });
  }
  return intents;
}

function collectYardIntents(structure: HouseStructure, furniture: Furniture[]) {
  const intents: LightIntent[] = [];
  const add = (space: LightingSpace, intent: Omit<LightIntent, "position" | "roomId"> & { position?: MmPoint }) => intents.push({ ...intent, position: intent.position ?? centerOf(space), roomId: space.id });
  structure.outdoors.forEach((outdoor, outdoorIndex) => {
    const center = centerOf(outdoor);
    const roomItems = spaceFurniture(outdoor.id, furniture);
    const cabinet = pickFurniture(roomItems, /户外柜|岛台/);
    const plant = pickFurniture(roomItems, /树|植物|桂花/);
    const table = pickFurniture(roomItems, /餐桌|桌椅|休闲/);
    const gate = pickFurniture(roomItems, /院门|门牌/);
    add(outdoor, { key: "PATH", name: `${outdoor.name}路径灯`, lightType: "bollardPathLight", layer: "outdoor", colorTemperature: "3000K", beamAngle: 90, mountingType: "bollard", heightMm: 650, position: offset(center, -900, 420, structure), smartControl: true, dimming: true, lightSpec: spec("bollard"), notes: "沿真实动线低位引导，不追求整体过亮；避免直射室内与邻居，回路设漏电保护并使用防水接线盒。" });
    add(outdoor, { key: "FENCE", name: `${outdoor.name}围栏灯 / 安全照明`, lightType: "shieldedFenceLight", layer: "outdoor", colorTemperature: "2700K", beamAngle: 45, mountingType: "wallMounted", heightMm: 900, position: offset(center, 900, 420, structure), smartControl: true, dimming: true, lightSpec: spec("outdoor-wall"), notes: "遮光向下并设夜间低亮安全状态；灯具固定与围栏节点同步深化。" });
    add(outdoor, { key: "WALL", name: `${outdoor.name}庭院壁灯`, lightType: "outdoorWallLight", layer: "outdoor", colorTemperature: "3000K", beamAngle: 60, mountingType: "wallMounted", heightMm: 1900, position: offset(center, 0, -520, structure), smartControl: true, dimming: true, lightSpec: spec("outdoor-wall"), notes: "墙体出线做防水封堵，安装高度与门窗立面复核，避免光线直接照入室内。" });
    add(outdoor, { key: "STEP", name: `${outdoor.name}台阶灯`, lightType: "outdoorStepLight", layer: "outdoor", colorTemperature: "2700K", beamAngle: 90, mountingType: "stepMounted", heightMm: 180, position: offset(center, -420, -420, structure), smartControl: true, dimming: true, optional: true, lightSpec: spec("step-light", { waterproofRating: "IP65" }), notes: "仅在现场存在高差或台阶时实施；遮光向下，位置待现场尺寸复核。" });
    if (plant || outdoorIndex === 0) add(outdoor, { key: "PLANT", name: `${outdoor.name}植物上照灯 / 照树灯`, lightType: "plantUplight", layer: "outdoor", colorTemperature: "2700K", beamAngle: 24, mountingType: "groundSpike", heightMm: 150, position: plant ? furniturePoint(plant, structure) : offset(center, -520, -620, structure), furnitureId: plant?.id, smartControl: true, dimming: true, source: plant ? "generated-from-furniture" : "generated-from-room", lightSpec: spec("tree-uplight"), notes: "灯轴明确朝向树冠，避开根系与灌溉喷头，不得直射人眼；无植物数据时为待确认意图。" });
    if (cabinet) add(outdoor, { key: "CABINET", name: `${outdoor.name}户外柜照明 / 操作灯`, lightType: "outdoorTaskLight", layer: "outdoor", colorTemperature: "3500K", beamAngle: 100, mountingType: "cabinetIntegrated", heightMm: 1450, position: furniturePoint(cabinet, structure), furnitureId: cabinet.id, smartControl: true, dimming: false, source: "generated-from-furniture", lightSpec: spec("yard-task", { cri: 95 }), notes: "驱动置于柜内干区并可检修，柜体厂家同步深化。" });
    if (table) add(outdoor, { key: "DINING", name: `${outdoor.name}户外餐桌照明`, lightType: "outdoorDiningPendant", layer: "outdoor", colorTemperature: "2700K", beamAngle: 60, mountingType: "pendant", heightMm: 2100, position: furniturePoint(table, structure), furnitureId: table.id, smartControl: true, dimming: true, source: "generated-from-furniture", lightSpec: spec("outdoor-wall", { waterproofRating: "IP65", cri: 90 }), notes: "以户外桌面为中心，控制眩光和溢出光；若无固定顶棚则改用便携低压灯具。" });
    if (gate) add(outdoor, { key: "WELCOME", name: `${outdoor.name}院门迎宾灯`, lightType: "outdoorWallLight", layer: "outdoor", colorTemperature: "3000K", beamAngle: 60, mountingType: "wallMounted", heightMm: 1800, position: furniturePoint(gate, structure), furnitureId: gate.id, smartControl: true, dimming: true, source: "generated-from-furniture", lightSpec: spec("outdoor-wall"), notes: "与门磁、人体感应或归家场景联动；不常亮高亮。" });
  });
  (structure.outdoorZones ?? []).forEach((zone) => {
    const items = furniture.filter((item) => item.outdoorZoneId === zone.id);
    const at = (item?: Furniture) => item ? furniturePoint(item, structure) : centerOf(zone);
    const push = (key: string, name: string, lightType: string, mountingType: LightMountingType, heightMm: number, furnitureId?: string, options: Partial<LightIntent> = {}) => intents.push({
      key: `ZONE-${zone.id}-${key}`, name: `${zone.name}${name}`, lightType, layer: "outdoor", colorTemperature: options.colorTemperature ?? "3000K", beamAngle: options.beamAngle ?? 60, mountingType, heightMm, position: at(furnitureId ? items.find((item) => item.id === furnitureId) : undefined), roomId: zone.outdoorId, furnitureId, smartControl: true, dimming: options.dimming ?? true, source: furnitureId ? "generated-from-furniture" : "generated-from-room", lightSpec: options.lightSpec ?? spec(mountingType === "groundSpike" ? "tree-uplight" : mountingType === "bollard" ? "bollard" : "outdoor-wall"), notes: options.notes ?? "归入既有庭院灯光控制系统；实际出线、回路和防水节点施工前复核。"
    });
    if (zone.zoneType === "outdoorKitchen") {
      const island = items.find((item) => item.outdoorObjectType === "outdoorIsland");
      push("TASK", " · 岛台顶部与操作面功能灯", "outdoorTaskLight", "cabinetIntegrated", 1850, island?.id, { colorTemperature: "3500K", dimming: false, lightSpec: spec("yard-task", { cri: 95 }), notes: "覆盖 BBQ、操作台与水槽；柜下灯和台面灯同组，晚间可真实操作。" });
      push("UNDER", " · 柜下工作灯", "outdoorTaskLight", "cabinetIntegrated", 980, island?.id, { colorTemperature: "3500K", dimming: false, lightSpec: spec("yard-task", { cri: 95 }) });
    }
    if (zone.zoneType === "plant" || zone.zoneType === "garden") push("PLANT", " · 植物层次上照", "plantUplight", "groundSpike", 150, items.find((item) => item.outdoorObjectType === "planter" || item.outdoorObjectType === "raisedGardenBed")?.id, { colorTemperature: "2700K", beamAngle: 24, lightSpec: spec("tree-uplight"), notes: "地插射灯洗亮乔木、灌木与背景墙，控制眩光并避开根系。" });
    if (zone.zoneType === "relax") {
      const seating = items.find((item) => /桌椅|休闲/.test(item.name));
      push("TABLE", " · 桌面氛围灯", "outdoorDiningPendant", "pendant", 2100, seating?.id, { colorTemperature: "2700K", notes: "休闲区第一层桌面照明；无固定遮棚时改为低压便携灯具。" });
      push("BACKGROUND", " · 环境背景灯", "outdoorWallLight", "wallMounted", 1800, undefined, { colorTemperature: "2700K", beamAngle: 80, notes: "休闲区第三层背景光，不以高亮环境灯取代分层照明。" });
    }
    if (zone.zoneType === "laundry") {
      const laundry = items.find((item) => item.outdoorObjectType === "outdoorLaundry");
      push("TASK", " · 洗衣顶部功能灯", "outdoorTaskLight", "surfaceMounted", 2200, laundry?.id, { colorTemperature: "3500K", dimming: false, lightSpec: spec("yard-task", { cri: 95 }), notes: "遮棚内顶部与柜下工作灯，独立于休闲氛围灯。" });
    }
    if (zone.zoneType === "pet") push("SAFETY", " · 宠物低位安全灯", "bollardPathLight", "bollard", 450, undefined, { colorTemperature: "2700K", beamAngle: 90, lightSpec: spec("bollard"), notes: "宠物区低位安全照明，便于夜间查看且避免直射犬只。" });
  });
  return intents;
}

function generatedItem(base: DrawingItem, current: DrawingItem | undefined, now: string) {
  const next = { ...base, createdAt: current?.createdAt ?? now, updatedAt: now };
  next.generatedFingerprint = getDrawingItemGeneratedFingerprint(next);
  return next;
}

function sceneId(value: string) {
  return `SCENE-${value.replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-|-$/g, "").toUpperCase()}`;
}

function createLightingScenes(items: DrawingItem[]): LightingScene[] {
  const lights = items.filter((item) => item.category === "light" && item.controlGroupId);
  const groupMap = new Map<string, DrawingItem[]>();
  lights.forEach((light) => groupMap.set(light.controlGroupId!, [...(groupMap.get(light.controlGroupId!) ?? []), light]));
  const groups = Array.from(groupMap.entries()).map(([controlGroupId, groupLights]) => ({
    controlGroupId,
    lights: groupLights,
    text: groupLights.map((light) => `${light.label} ${light.notes}`).join(" ")
  }));
  const make = (id: string, name: string, category: LightingScene["category"], match: (group: typeof groups[number]) => boolean, brightness: (group: typeof groups[number]) => number, options: Partial<LightingScene> = {}): LightingScene => ({
    id: sceneId(id), name, category,
    groupStates: groups.filter(match).map((group) => ({ controlGroupId: group.controlGroupId, on: brightness(group) > 0, brightness: brightness(group) })),
    automation: options.automation,
    notes: options.notes ?? "场景只记录控制组状态，不复制灯具；相对亮度待现场调试。",
    status: "draft",
    ...(options.floorId ? { floorId: options.floorId } : {}),
    ...(options.roomId ? { roomId: options.roomId } : {})
  });
  const all = () => true;
  const has = (pattern: RegExp) => (group: typeof groups[number]) => pattern.test(group.text);
  const layer = (target: LightingLayer) => (group: typeof groups[number]) => group.lights.some((light) => light.lightingLayer === target);
  const common: LightingScene[] = [
    make("all-clean", "全开清洁", "whole-house", all, () => 100, { notes: "全屋人工灯光 100%；卫生间可选 4000K 清洁模式不作为默认状态。" }),
    make("daily", "日常", "whole-house", all, (group) => layer("ambient")(group) ? 85 : layer("task")(group) ? 80 : layer("accent")(group) ? 45 : 25),
    make("gathering", "会客", "whole-house", has(/客厅|餐桌|玄关|壁炉|背景/), (group) => layer("ambient")(group) ? 75 : layer("accent")(group) ? 65 : 35),
    make("dining", "用餐", "room", has(/餐桌|餐边|圆桌|水吧/), (group) => /圆桌|吊灯/.test(group.text) ? 85 : 40, { floorId: "1F" }),
    make("cooking", "烹饪", "room", has(/厨房|中岛|水槽|灶台|台面/), (group) => layer("task")(group) ? 100 : 85, { floorId: "1F" }),
    make("movie", "观影", "room", has(/客厅|壁炉|背景|窗帘|阅读/), (group) => layer("ambient")(group) ? 0 : layer("accent")(group) ? 15 : 20, { floorId: "1F" }),
    make("reading", "阅读", "room", (group) => /阅读|书桌|书房|床头/.test(group.text), () => 80),
    make("bedtime", "睡前", "room", (group) => /卧室|主卧|床头|窗帘盒/.test(group.text), (group) => layer("ambient")(group) ? 15 : 35, { floorId: "2F" }),
    make("night", "起夜", "whole-house", (group) => /起夜|夜灯|踏步|楼梯/.test(group.text), () => 15, { automation: ["23:00–06:00 人体感应", "感应后延时关闭", "不联动基础顶灯"] }),
    make("welcome", "迎宾", "whole-house", (group) => /玄关|院门|北院|路径|庭院壁灯/.test(group.text), () => 60, { automation: ["门磁或人体感应", "日落后生效", "回家后延时切换日常场景"] }),
    make("yard-relax", "庭院休闲", "outdoor", (group) => /南院|照树|户外餐桌|庭院壁灯/.test(group.text), (group) => /路径|围栏/.test(group.text) ? 25 : 50, { floorId: "YARD" }),
    make("yard-bbq", "北院烧烤", "outdoor", (group) => /北院.*(厨房|岛台|BBQ|操作|植物|路径)/.test(group.text), (group) => /操作|柜下/.test(group.text) ? 100 : /植物|路径/.test(group.text) ? 35 : 55, { floorId: "YARD", notes: "北院 BBQ 工作场景：操作面明亮，路径与植物保持低亮层次。" }),
    make("yard-laundry", "庭院洗衣", "outdoor", (group) => /洗衣/.test(group.text), (group) => /功能|工作/.test(group.text) ? 100 : 45, { floorId: "YARD", notes: "南院洗衣场景：功能灯全开，其他庭院灯保持低亮。" }),
    make("away", "离家", "whole-house", all, () => 0, { automation: ["关闭室内非安全灯组", "保留院门、围栏及必要安防低亮组", "可联动安防系统"] })
  ];
  const roomScenes: LightingScene[] = [
    make("1f-living-daily", "1F 客厅日常会客", "room", has(/客厅|壁炉|背景|窗帘|阅读/), (group) => layer("ambient")(group) ? 80 : layer("accent")(group) ? 55 : 30, { floorId: "1F", roomId: "ROOM-1F-005" }),
    make("1f-living-movie", "1F 客厅观影", "room", has(/客厅|壁炉|背景|窗帘|阅读/), (group) => layer("ambient")(group) ? 0 : 15, { floorId: "1F", roomId: "ROOM-1F-005" }),
    make("1f-living-clean", "1F 客厅清洁全开", "room", has(/客厅|壁炉|背景|窗帘|阅读/), () => 100, { floorId: "1F", roomId: "ROOM-1F-005" }),
    make("1f-living-night", "1F 客厅夜间氛围", "room", has(/客厅|壁炉|背景|窗帘/), (group) => layer("ambient")(group) ? 0 : 20, { floorId: "1F", roomId: "ROOM-1F-005" }),
    make("1f-dining-guest", "1F 餐桌会客", "room", has(/餐桌|餐边|圆桌|水吧/), () => 60, { floorId: "1F" }),
    make("1f-dining-clean", "1F 餐区清洁", "room", has(/餐桌|餐边|圆桌|水吧|玄关边缘/), () => 100, { floorId: "1F" }),
    make("1f-dining-night", "1F 餐区夜间留灯", "room", has(/餐边|圆桌/), () => 15, { floorId: "1F" }),
    make("1f-kitchen-clean", "1F 厨房清洁全开", "room", has(/厨房|中岛|水槽|灶台|台面/), () => 100, { floorId: "1F", roomId: "ROOM-1F-002" }),
    make("yard-welcome", "庭院迎宾", "outdoor", has(/北院|院门|路径|庭院壁灯/), () => 65, { floorId: "YARD" }),
    make("yard-dining", "庭院用餐", "outdoor", has(/南院|户外餐桌|户外柜/), (group) => /操作/.test(group.text) ? 85 : 50, { floorId: "YARD" }),
    make("yard-safety", "庭院夜间安全", "outdoor", has(/路径|围栏|院门|台阶/), () => 20, { floorId: "YARD", automation: ["日落后开启", "深夜降至 10%–20%", "人体触发短时提升"] })
  ];
  return [...common, ...roomScenes].filter((scene) => scene.groupStates.length > 0 || scene.name === "离家");
}

function cameraScenePoint(point: MmPoint, structure: HouseStructure) {
  return {
    x: (point.x - structure.coordinateSystem.width / 2) / 1000,
    z: (point.y - structure.coordinateSystem.height / 2) / 1000
  };
}

function createRecommendedLightingViews(structuresByFloor: Partial<Record<FloorId, HouseStructure>>, furniture: Furniture[]): RoomTourView[] {
  const definitions: Array<{ id: string; name: string; floorId: FloorId; roomPattern?: RegExp; outdoorPattern?: RegExp; furniturePattern?: RegExp; scene: string }> = [
    { id: "1f-living-gathering", name: "1F 客厅会客", floorId: "1F", roomPattern: /客厅/, furniturePattern: /沙发|壁炉/, scene: "1f-living-daily" },
    { id: "1f-living-movie", name: "1F 客厅观影", floorId: "1F", roomPattern: /客厅/, furniturePattern: /壁炉|电视/, scene: "1f-living-movie" },
    { id: "1f-dining", name: "1F 餐厅用餐", floorId: "1F", furniturePattern: /六人圆餐桌/, scene: "dining" },
    { id: "1f-kitchen", name: "1F 厨房烹饪", floorId: "1F", roomPattern: /厨房/, furniturePattern: /灶台|水槽/, scene: "cooking" },
    { id: "2f-master-bedtime", name: "主卧睡前", floorId: "2F", roomPattern: /主卧/, furniturePattern: /主卧.*床|双人床/, scene: "bedtime" },
    { id: "2f-master-bath-night", name: "主卫夜间", floorId: "2F", roomPattern: /主卫/, furniturePattern: /浴缸|马桶/, scene: "night" },
    { id: "b2-relax", name: "地下室休闲", floorId: "B2", roomPattern: /客厅|活动区/, furniturePattern: /沙发|软垫/, scene: "daily" },
    { id: "1f-stair-night", name: "楼梯起夜", floorId: "1F", roomPattern: /楼梯/, scene: "night" },
    { id: "yard-south-relax", name: "南院休闲", floorId: "YARD", outdoorPattern: /南院/, furniturePattern: /桌椅|休闲/, scene: "yard-relax" },
    { id: "yard-north-welcome", name: "北院迎宾", floorId: "YARD", outdoorPattern: /北院/, furniturePattern: /院门/, scene: "yard-welcome" },
    { id: "yard-north-bbq", name: "北院烧烤", floorId: "YARD", outdoorPattern: /北院/, furniturePattern: /BBQ|厨房岛台/, scene: "yard-bbq" },
    { id: "yard-south-laundry", name: "南院洗衣", floorId: "YARD", outdoorPattern: /南院/, furniturePattern: /洗衣柜/, scene: "yard-laundry" }
  ];
  return definitions.flatMap((definition): RoomTourView[] => {
    const structure = structuresByFloor[definition.floorId];
    if (!structure) return [];
    const anchorFurniture = furniture.find((item) => item.floorId === definition.floorId && definition.furniturePattern?.test(`${item.id} ${item.name} ${item.type}`));
    const room = anchorFurniture ? structure.rooms.find((item) => item.id === anchorFurniture.roomId) : structure.rooms.find((item) => definition.roomPattern?.test(item.name));
    const outdoor = anchorFurniture ? structure.outdoors.find((item) => item.id === anchorFurniture.roomId) : structure.outdoors.find((item) => definition.outdoorPattern?.test(item.name));
    if (!room && !outdoor) return [];
    const points = room?.boundary ?? outdoor?.polygon ?? [];
    if (!points.length) return [];
    const center = centerOf(room ?? outdoor!);
    const targetMm = anchorFurniture ? furniturePoint(anchorFurniture, structure) : center;
    const cameraMm = { x: center.x - 500, y: center.y + 350 };
    if (!pointInPolygon(cameraMm, points)) Object.assign(cameraMm, center);
    const camera2d = cameraScenePoint(cameraMm, structure);
    const target2d = cameraScenePoint(targetMm, structure);
    const cameraPosition = { x: camera2d.x, y: definition.id.includes("dining") ? 1.25 : 1.45, z: camera2d.z };
    const target = { x: target2d.x, y: definition.id.includes("stair") ? 0.75 : 1.15, z: target2d.z };
    const dx = target.x - cameraPosition.x;
    const dz = target.z - cameraPosition.z;
    return [{
      id: `lighting-view-${definition.id}`, floorId: definition.floorId, ...(room ? { roomId: room.id } : { outdoorId: outdoor!.id }),
      name: definition.name, type: outdoor ? "yard" : /楼梯/.test(definition.name) ? "stair" : "viewpoint",
      cameraPosition, target, yaw: Math.atan2(dx, dz), pitch: Math.atan2(target.y - cameraPosition.y, Math.max(0.001, Math.hypot(dx, dz))),
      fov: 58, linkedNodeIds: [], description: `${definition.name} · 推荐场景：${definition.scene}`, status: "active",
      supportedSheetTypes: ["lightingPlan"], recommendedLightingSceneId: sceneId(definition.scene)
    }];
  });
}

export function generateLightingDesignV1(input: {
  structuresByFloor: Partial<Record<FloorId, HouseStructure>>;
  furniture: Furniture[];
  existingItems: DrawingItem[];
  floorIds?: FloorId[];
  overwriteConflicts?: boolean;
  now?: string;
}): LightingDesignGenerationResult {
  const now = input.now ?? new Date().toISOString();
  const targetFloors = input.floorIds ?? (Object.keys(input.structuresByFloor) as FloorId[]);
  const generatedPrefix = "lighting-design-v1:";
  const existingGenerated = new Map(input.existingItems.filter((item) => item.generatedKey?.startsWith(generatedPrefix)).map((item) => [item.generatedKey as string, item]));
  const outputByKey = new Map(existingGenerated);
  const untouched = input.existingItems.filter((item) => !item.generatedKey?.startsWith(generatedPrefix));
  const conflicts: DrawingItem[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let lightCount = 0;
  let switchCount = 0;

  targetFloors.forEach((floorId) => {
    const structure = input.structuresByFloor[floorId];
    if (!structure) return;
    const floorFurniture = input.furniture.filter((item) => item.floorId === floorId);
    const intents = floorId === "YARD" ? collectYardIntents(structure, floorFurniture) : collectIndoorIntents(floorId, structure, floorFurniture);
    const intentsByGroup = new Map<string, LightIntent[]>();
    const usedLightIds = new Set(input.existingItems.filter((item) => item.floorId === floorId && item.category === "light").map((item) => item.id));
    const usedSwitchIds = new Set(input.existingItems.filter((item) => item.floorId === floorId && item.category === "switch").map((item) => item.id));
    let nextLightIndex = 1;
    let nextSwitchIndex = 1;
    const allocateId = (category: "light" | "switch") => {
      const usedIds = category === "light" ? usedLightIds : usedSwitchIds;
      const prefix = category === "light" ? "L" : "SW";
      let index = category === "light" ? nextLightIndex : nextSwitchIndex;
      let id = `${prefix}-${floorId}-V1-${String(index).padStart(2, "0")}`;
      while (usedIds.has(id)) {
        index += 1;
        id = `${prefix}-${floorId}-V1-${String(index).padStart(2, "0")}`;
      }
      usedIds.add(id);
      if (category === "light") nextLightIndex = index + 1;
      else nextSwitchIndex = index + 1;
      return id;
    };
    intents.forEach((intent) => {
      const group = groupId(floorId, intent.roomId, intent.key.replace(/-\d+$/, ""));
      intentsByGroup.set(group, [...(intentsByGroup.get(group) ?? []), intent]);
    });

    const desired: DrawingItem[] = [];
    Array.from(intentsByGroup.entries()).forEach(([controlGroupId, groupIntents]) => {
      const roomId = groupIntents[0].roomId;
      const switchKey = `${generatedPrefix}${floorId}:${controlGroupId}:switch`;
      const switchId = existingGenerated.get(switchKey)?.id ?? allocateId("switch");
      const lightKeys = groupIntents.map((_, lightIndex) => `${generatedPrefix}${floorId}:${controlGroupId}:light:${lightIndex + 1}`);
      const lightIds = lightKeys.map((key) => existingGenerated.get(key)?.id ?? allocateId("light"));
      groupIntents.forEach((intent, lightIndex) => {
        const id = lightIds[lightIndex];
        const key = lightKeys[lightIndex];
        const base = createDrawingItem({ id, floorId, category: "light", positionMm: intent.position, roomId, now });
        const relatedFurniture = intent.furnitureId ? floorFurniture.find((item) => item.id === intent.furnitureId) : null;
        const ceilingHost = intent.hostCeilingAreaId ?? input.existingItems.find((item) => item.floorId === floorId && item.category === "ceiling" && (item.roomId === roomId || item.relatedRoomId === roomId))?.id ?? null;
        const familyId = intent.lightSpec?.fixtureFamily ?? defaultFamilyForIntent(intent);
        desired.push({
          ...base, id, type: intent.lightType, lightType: intent.lightType, lightingLayer: intent.layer,
          colorTemperature: intent.colorTemperature, lightColorTemperature: intent.colorTemperature,
          beamAngle: intent.beamAngle, mountingType: intent.mountingType, heightMm: intent.heightMm,
          relatedSwitchId: switchId, controlGroupId, lightGroupId: controlGroupId,
          smartControl: intent.smartControl, needsSmartControl: intent.smartControl, dimming: intent.dimming,
          relatedFurnitureId: intent.furnitureId ?? null,
          relatedFurniturePositionMm: relatedFurniture ? furniturePoint(relatedFurniture, structure) : undefined,
          relatedRoomId: roomId, roomId,
          hostCeilingAreaId: ceilingHost, hostWallId: intent.hostWallId ?? null, directionDeg: intent.directionDeg ?? null,
          lightSpec: spec(familyId, intent.lightSpec ?? {}),
          label: `${id} · ${intent.name}`, notes: `${intent.notes}${intent.optional ? "；可选项，确认后再施工。" : ""}`,
          source: intent.source ?? (intent.furnitureId ? "generated-from-furniture" : "generated-from-room"), status: intent.optional ? "todo" : "draft", generatedKey: key
        });
      });
      lightCount += groupIntents.length;
      const switchPosition = offset(groupIntents[0].position, -420, 420, structure);
      const switchBase = createDrawingItem({ id: switchId, floorId, category: "switch", positionMm: switchPosition, roomId, now });
      desired.push({
        ...switchBase, id: switchId, type: groupIntents[0].smartControl ? "switchAndSceneControl" : "switchControl",
        controlGroupId, lightGroupId: controlGroupId, controlledLightIds: lightIds, relatedLightIds: lightIds,
        switchControl: [groupIntents[0].smartControl ? "物理开关" : "单控", ...(groupIntents[0].smartControl ? ["智能场景"] : [])],
        smartControl: groupIntents[0].smartControl, needsSmartControl: groupIntents[0].smartControl,
        dimming: groupIntents.some((intent) => intent.dimming), relatedRoomId: roomId, roomId,
        label: `${switchId} · ${lightingLayerLabels[groupIntents[0].layer]}控制`,
        notes: `控制组 ${controlGroupId}；控制 ${lightIds.join("、")}。同组灯具可由本开关或智能场景联动。`,
        source: "generated-from-room", status: "draft", generatedKey: switchKey
      });
      switchCount += 1;
    });

    const desiredKeys = new Set(desired.map((item) => item.generatedKey as string));
    Array.from(outputByKey.keys()).filter((key) => key.startsWith(`${generatedPrefix}${floorId}:`) && !desiredKeys.has(key)).forEach((key) => outputByKey.delete(key));
    desired.forEach((base) => {
      const key = base.generatedKey as string;
      const current = existingGenerated.get(key);
      const next = generatedItem(base, current, now);
      if (!current) {
        outputByKey.set(key, next);
        created += 1;
        return;
      }
      const manuallyAdjusted = !current.generatedFingerprint || getDrawingItemGeneratedFingerprint(current) !== current.generatedFingerprint;
      if (manuallyAdjusted && !input.overwriteConflicts) {
        conflicts.push(current);
        outputByKey.set(key, current);
        skipped += 1;
        return;
      }
      if (current.generatedFingerprint === next.generatedFingerprint) {
        outputByKey.set(key, current);
        skipped += 1;
        return;
      }
      outputByKey.set(key, next);
      updated += 1;
    });
  });

  const retainedGenerated = Array.from(outputByKey.values());
  const items = [...untouched, ...retainedGenerated];
  const floorSummary = targetFloors.map((floorId) => ({
    floorId,
    lights: items.filter((item) => item.floorId === floorId && item.category === "light").length,
    switches: items.filter((item) => item.floorId === floorId && item.category === "switch").length,
    rooms: input.structuresByFloor[floorId]?.rooms.length ?? 0
  }));
  return {
    items,
    created,
    updated,
    skipped,
    conflicts,
    lightCount,
    switchCount,
    floorSummary,
    lightingDesign: {
      version: "modern-warm-v1",
      style: "modern-warm",
      generatedAt: now,
      fixtureFamilies: modernWarmFixtureFamilies,
      scenes: createLightingScenes(items),
      pendingConfirmations: ["吊顶完成面高度", "灯具品牌与精确型号", "精确功率与驱动位置", "IES 配光文件", "现场净尺寸与梁位", "柜体最终尺寸与开门范围", "灯槽、风口和检修口综合定位"]
    },
    recommendedViews: createRecommendedLightingViews(input.structuresByFloor, input.furniture)
  };
}
