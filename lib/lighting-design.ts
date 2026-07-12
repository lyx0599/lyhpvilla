import { createDrawingItem, getDrawingItemGeneratedFingerprint } from "./drawing-items.ts";
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
  MmPoint
} from "../types/space";

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
  smartControl: boolean;
  dimming: boolean;
  optional?: boolean;
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
};

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
  return {
    x: Math.round(Math.min(origin.x + width - 180, Math.max(origin.x + 180, point.x))),
    y: Math.round(Math.min(origin.y + height - 180, Math.max(origin.y + 180, point.y)))
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
    const isBathroom = /卫生间|客卫|主卫|洗衣房/.test(room.name) || Boolean(pickFurniture(roomItems, /马桶|淋浴|台盆|浴室柜/));
    const isBedroom = /卧室|房间/.test(room.name) && !isBathroom;
    const isLiving = /客厅/.test(room.name);
    const isKitchen = /厨房/.test(room.name);
    const isStudy = /书房/.test(room.name);
    const isActivity = /活动区/.test(room.name);
    const isStair = /楼梯/.test(room.name);
    const isCorridor = /走廊/.test(room.name);
    const isCloak = /衣帽间/.test(room.name);
    const ambientTemperature: LightColorTemperature = isKitchen || isBathroom || isStudy ? "3500K" : "3000K";

    add({
      key: "AMBIENT", name: `${room.name}基础照明`, lightType: isStair || isCorridor ? "linearDownlight" : "recessedDownlight",
      layer: "ambient", colorTemperature: ambientTemperature, beamAngle: 60, mountingType: "recessed", heightMm: 2800,
      position: center, roomId: room.id, smartControl: isLiving || isBedroom || isActivity, dimming: isLiving || isBedroom || isActivity,
      notes: "点位按吊顶完成面居中示意；避开风口、检修口、梁位及柜门开启范围，施工前现场复核。"
    });

    if (isBathroom) {
      const vanity = pickFurniture(roomItems, /台盆|浴室柜|洗手池/);
      const shower = pickFurniture(roomItems, /淋浴/);
      const toilet = pickFurniture(roomItems, /马桶/);
      add({ key: "MIRROR", name: `${room.name}镜前灯`, lightType: "linearMirrorLight", layer: "mirrorLight", colorTemperature: "3500K", beamAngle: 100, mountingType: "mirrorIntegrated", heightMm: 1850, position: vanity ? furniturePoint(vanity, structure) : offset(center, 520, 380, structure), roomId: room.id, furnitureId: vanity?.id, hostWallId: inferHostWallId(vanity, structure), smartControl: false, dimming: false, notes: "显色指数建议 Ra≥90；电源与镜柜厂家深化同步，潮湿区接线盒做防潮处理。" });
      add({ key: "SHOWER", name: `${room.name}淋浴区防潮灯`, lightType: "wetAreaDownlight", layer: "task", colorTemperature: "3500K", beamAngle: 60, mountingType: "recessed", heightMm: 2800, position: shower ? furniturePoint(shower, structure) : offset(center, -520, -380, structure), roomId: room.id, furnitureId: shower?.id, smartControl: false, dimming: false, notes: "淋浴区灯具建议不低于 IP44，具体等级按安装分区与现场规范确认。" });
      add({ key: "NIGHT", name: `${room.name}马桶夜灯（可选）`, lightType: "lowLevelNightLight", layer: "decorative", colorTemperature: "2700K", beamAngle: 90, mountingType: "wallMounted", heightMm: 300, position: toilet ? furniturePoint(toilet, structure) : offset(center, 600, -420, structure), roomId: room.id, furnitureId: toilet?.id, hostWallId: inferHostWallId(toilet, structure), smartControl: true, dimming: true, optional: true, notes: "可选人体感应低位夜灯；与基础照明分组，避免夜间眩光。" });
    }

    if (isBedroom) {
      const bed = pickFurniture(roomItems, /床/);
      const wardrobe = pickFurniture(roomItems, /衣柜/);
      const desk = pickFurniture(roomItems, /书桌|梳妆|五斗橱/);
      const bedPoint = bed ? furniturePoint(bed, structure) : center;
      [-1, 1].forEach((side, index) => add({ key: `BEDSIDE-${index + 1}`, name: `${room.name}${side < 0 ? "左" : "右"}床头氛围灯`, lightType: "bedsideWallLight", layer: "decorative", colorTemperature: "2700K", beamAngle: 40, mountingType: "wallMounted", heightMm: 1150, position: offset(bedPoint, side * 620, 320, structure), roomId: room.id, furnitureId: bed?.id, smartControl: true, dimming: true, notes: "床头双控/场景控制；最终位置随床宽、床头柜及软包完成面复核。" }));
      if (wardrobe) add({ key: "WARDROBE", name: `${room.name}衣柜灯带`, lightType: "wardrobeSensorStrip", layer: "cabinetStrip", colorTemperature: "3000K", beamAngle: 110, mountingType: "cabinetIntegrated", heightMm: 2100, position: furniturePoint(wardrobe, structure), roomId: room.id, furnitureId: wardrobe.id, hostWallId: inferHostWallId(wardrobe, structure), smartControl: true, dimming: false, notes: "门控或人体感应；驱动电源留可检修位置，灯槽与柜体厂家同步深化。" });
      add({ key: "DESK", name: `${room.name}化妆/书桌功能灯`, lightType: "deskTaskLight", layer: "task", colorTemperature: "3500K", beamAngle: 40, mountingType: "surfaceMounted", heightMm: 1400, position: desk ? furniturePoint(desk, structure) : offset(center, 720, 0, structure), roomId: room.id, furnitureId: desk?.id, smartControl: false, dimming: true, optional: !desk, notes: "书桌/化妆区预留独立功能灯与电源；无固定家具时为建议点位。" });
    }

    if (isKitchen) {
      const counter = pickFurniture(roomItems, /橱柜|备餐|水槽|灶台/);
      add({ key: "COUNTER", name: "厨房台面功能灯", lightType: "underCabinetTaskStrip", layer: "task", colorTemperature: "3500K", beamAngle: 100, mountingType: "cabinetIntegrated", heightMm: 1550, position: counter ? furniturePoint(counter, structure) : offset(center, -700, 0, structure), roomId: room.id, furnitureId: counter?.id, hostWallId: inferHostWallId(counter, structure), smartControl: false, dimming: false, notes: "吊柜下沿连续灯带；驱动、铝槽、出线与橱柜深化同步，避开水槽与灶具高温区。" });
    }

    if (isLiving) {
      const fireplace = pickFurniture(roomItems, /壁炉|背景墙|电视/);
      if (fireplace) add({ key: "FEATURE", name: "壁炉/背景墙重点照明", lightType: "adjustableSpotlight", layer: "accent", colorTemperature: "3000K", beamAngle: 24, mountingType: "recessed", heightMm: 2800, position: offset(furniturePoint(fireplace, structure), 0, -520, structure), roomId: room.id, furnitureId: fireplace.id, hostWallId: inferHostWallId(fireplace, structure), smartControl: true, dimming: true, notes: "灯轴对准壁炉/背景墙立面，避免反射眩光；与基础照明分组。" });
    }

    if (isStudy) {
      const table = pickFurniture(roomItems, /桌|书桌|大板/);
      add({ key: "DESK", name: `${room.name}书桌功能灯`, lightType: "wideBeamTaskPendant", layer: "task", colorTemperature: "3500K", beamAngle: 60, mountingType: "pendant", heightMm: 1900, position: table ? furniturePoint(table, structure) : offset(center, 550, 0, structure), roomId: room.id, furnitureId: table?.id, smartControl: false, dimming: true, notes: "桌面上方功能照明，吊装高度与桌面位置最终复核，避免屏幕反光。" });
    }

    if (isActivity) add({ key: "MOOD", name: `${room.name}氛围灯`, lightType: "indirectLinearLight", layer: "decorative", colorTemperature: "2700K", beamAngle: 120, mountingType: "concealed", heightMm: 2500, position: offset(center, 620, 420, structure), roomId: room.id, smartControl: true, dimming: true, notes: "与基础照明独立分组，预留观影/活动场景；灯槽尺寸随吊顶深化。" });

    if (isStair) add({ key: "STEP", name: `${room.name}楼梯灯带`, lightType: "stairStepStrip", layer: "decorative", colorTemperature: "3000K", beamAngle: 120, mountingType: "stepMounted", heightMm: 300, position: offset(center, 420, 0, structure), roomId: room.id, smartControl: true, dimming: true, notes: "楼梯上下口双控并预留人体感应；驱动可检修，灯带连续性随踏步深化。" });

    if (isCloak) {
      const wardrobe = pickFurniture(roomItems, /柜/);
      const desk = pickFurniture(roomItems, /桌|梳妆/);
      if (wardrobe) add({ key: "WARDROBE", name: `${room.name}柜内灯带`, lightType: "wardrobeSensorStrip", layer: "cabinetStrip", colorTemperature: "3000K", beamAngle: 110, mountingType: "cabinetIntegrated", heightMm: 2100, position: furniturePoint(wardrobe, structure), roomId: room.id, furnitureId: wardrobe.id, hostWallId: inferHostWallId(wardrobe, structure), smartControl: true, dimming: false, notes: "门控/人体感应；驱动留可检修位置并与柜体厂家同步深化。" });
      if (desk) add({ key: "VANITY", name: `${room.name}梳妆功能灯`, lightType: "vanityTaskLight", layer: "task", colorTemperature: "3500K", beamAngle: 60, mountingType: "wallMounted", heightMm: 1650, position: furniturePoint(desk, structure), roomId: room.id, furnitureId: desk.id, hostWallId: inferHostWallId(desk, structure), smartControl: false, dimming: true, notes: "面部两侧或均匀线性出光，显色指数建议 Ra≥90。" });
    }
  });

  if (floorId === "1F") {
    const addSpecial = (pattern: RegExp, intent: Omit<LightIntent, "position" | "roomId" | "furnitureId">) => {
      const item = pickFurniture(furniture, pattern);
      if (!item) return;
      intents.push({ ...intent, position: furniturePoint(item, structure), roomId: item.roomId, furnitureId: item.id, hostWallId: intent.hostWallId ?? inferHostWallId(item, structure) });
    };
    addSpecial(/module-1f-table|六人圆餐桌/, { key: "DINING", name: "餐桌吊灯/重点灯", lightType: "diningPendant", layer: "accent", colorTemperature: "3000K", beamAngle: 36, mountingType: "pendant", heightMm: 1700, smartControl: true, dimming: true, notes: "灯具中心对齐餐桌中心；灯下沿距桌面建议约 700–800mm，最终随桌径和灯具实物复核。" });
    addSpecial(/岛台/, { key: "ISLAND", name: "中岛功能照明", lightType: "islandLinearPendant", layer: "task", colorTemperature: "3500K", beamAngle: 50, mountingType: "pendant", heightMm: 1850, smartControl: true, dimming: true, notes: "对齐岛台长轴，兼顾操作面与通行净高；与餐桌灯分组。" });
    addSpecial(/水吧台吊柜|餐边柜|零食柜/, { key: "SIDEBOARD", name: "餐边柜灯带", lightType: "sideboardStrip", layer: "cabinetStrip", colorTemperature: "3000K", beamAngle: 110, mountingType: "cabinetIntegrated", heightMm: 1650, smartControl: true, dimming: false, notes: "柜体感应/场景联动；驱动电源、灯槽与出线位置由柜体厂家深化。" });
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
    add(outdoor, { key: "PATH", name: `${outdoor.name}路径灯`, lightType: "bollardPathLight", layer: "outdoor", colorTemperature: "3000K", beamAngle: 90, mountingType: "bollard", heightMm: 650, position: offset(center, -900, 420, structure), smartControl: true, dimming: true, notes: "IP65 建议；沿路径低位布置，避免直射室内与邻居，回路设漏电保护并使用防水接线盒。" });
    add(outdoor, { key: "FENCE", name: `${outdoor.name}围栏灯`, lightType: "shieldedFenceLight", layer: "outdoor", colorTemperature: "2700K", beamAngle: 45, mountingType: "wallMounted", heightMm: 900, position: offset(center, 900, 420, structure), smartControl: true, dimming: true, notes: "IP65 建议；遮光向下，灯具固定与围栏节点同步深化。" });
    add(outdoor, { key: "WALL", name: `${outdoor.name}庭院壁灯`, lightType: "outdoorWallLight", layer: "outdoor", colorTemperature: "3000K", beamAngle: 60, mountingType: "wallMounted", heightMm: 1900, position: offset(center, 0, -520, structure), smartControl: true, dimming: true, notes: "IP65 建议；墙体出线做防水封堵，安装高度与门窗立面复核。" });
    if (plant || outdoorIndex === 0) add(outdoor, { key: "PLANT", name: `${outdoor.name}植物上照灯`, lightType: "plantUplight", layer: "outdoor", colorTemperature: "2700K", beamAngle: 24, mountingType: "groundSpike", heightMm: 150, position: plant ? furniturePoint(plant, structure) : offset(center, -520, -620, structure), furnitureId: plant?.id, smartControl: true, dimming: true, notes: "IP66 建议；插地灯预留可调整余量，避开根系与灌溉喷头，灯轴不得直射人眼。" });
    if (cabinet) add(outdoor, { key: "CABINET", name: `${outdoor.name}户外柜照明`, lightType: "outdoorCabinetStrip", layer: "outdoor", colorTemperature: "3000K", beamAngle: 110, mountingType: "cabinetIntegrated", heightMm: 1450, position: furniturePoint(cabinet, structure), furnitureId: cabinet.id, smartControl: true, dimming: false, notes: "灯带及接头建议 IP65；驱动置于柜内干区并可检修，柜体厂家同步深化。" });
  });
  return intents;
}

function generatedItem(base: DrawingItem, current: DrawingItem | undefined, now: string) {
  const next = { ...base, createdAt: current?.createdAt ?? now, updatedAt: now };
  next.generatedFingerprint = getDrawingItemGeneratedFingerprint(next);
  return next;
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
    let floorLightIndex = 0;
    intents.forEach((intent) => {
      const group = groupId(floorId, intent.roomId, intent.key.replace(/-\d+$/, ""));
      intentsByGroup.set(group, [...(intentsByGroup.get(group) ?? []), intent]);
    });

    const desired: DrawingItem[] = [];
    Array.from(intentsByGroup.entries()).forEach(([controlGroupId, groupIntents], groupIndex) => {
      const roomId = groupIntents[0].roomId;
      const switchId = `SW-${floorId}-V1-${String(groupIndex + 1).padStart(2, "0")}`;
      const lightIds = groupIntents.map((_, lightIndex) => `L-${floorId}-V1-${String(floorLightIndex + lightIndex + 1).padStart(2, "0")}`);
      groupIntents.forEach((intent, lightIndex) => {
        const id = lightIds[lightIndex];
        const key = `${generatedPrefix}${floorId}:${controlGroupId}:light:${lightIndex + 1}`;
        const base = createDrawingItem({ id, floorId, category: "light", positionMm: intent.position, roomId, now });
        desired.push({
          ...base, id, type: intent.lightType, lightType: intent.lightType, lightingLayer: intent.layer,
          colorTemperature: intent.colorTemperature, lightColorTemperature: intent.colorTemperature,
          beamAngle: intent.beamAngle, mountingType: intent.mountingType, heightMm: intent.heightMm,
          relatedSwitchId: switchId, controlGroupId, lightGroupId: controlGroupId,
          smartControl: intent.smartControl, needsSmartControl: intent.smartControl, dimming: intent.dimming,
          relatedFurnitureId: intent.furnitureId ?? null, relatedRoomId: roomId, roomId,
          hostCeilingAreaId: null, hostWallId: intent.hostWallId ?? null,
          label: `${id} · ${intent.name}`, notes: `${intent.notes}${intent.optional ? "；可选项，确认后再施工。" : ""}`,
          source: "generated-from-room", status: intent.optional ? "todo" : "draft", generatedKey: key
        });
      });
      floorLightIndex += groupIntents.length;
      lightCount += groupIntents.length;
      const switchPosition = offset(groupIntents[0].position, -420, 420, structure);
      const switchKey = `${generatedPrefix}${floorId}:${controlGroupId}:switch`;
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
  return { items: [...untouched, ...retainedGenerated], created, updated, skipped, conflicts, lightCount, switchCount };
}
