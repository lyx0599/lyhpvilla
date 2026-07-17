import { getDistance, getPolygonArea } from "./house-geometry.ts";
import { pointInPolygon } from "./furniture-placement.ts";
import type { DrawingItem, Furniture, HouseStructure, OutdoorObjectType, OutdoorZone, OutdoorZoneType } from "@/types/space";
import type { ValidationFinding } from "./validation-rules.ts";

export const outdoorZoneLabels: Record<OutdoorZoneType, string> = {
  outdoorKitchen: "户外厨房", relax: "休闲会客", laundry: "户外洗衣家务", drying: "晾晒", pet: "宠物生活", garden: "可维护种植", storage: "工具收纳", plant: "植物景观"
};

export const outdoorObjectLabels: Record<OutdoorObjectType, string> = {
  bbq: "BBQ 烧烤炉", outdoorIsland: "户外岛台", outdoorCabinet: "户外柜", waterTap: "户外龙头", dryingRack: "晾晒架", dogHouse: "狗窝", planter: "种植箱", pathwayLight: "路径灯", raisedGardenBed: "高架种植床", shadeUmbrella: "遮阳伞", petWash: "宠物洗脚区", hoseReel: "水管收纳", toolRack: "园艺工具架", outdoorLaundry: "户外洗衣柜岛台", landscapeRock: "景观石"
};

function center(points: Array<{ x: number; y: number }>) {
  return points.reduce((sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }), { x: 0, y: 0 });
}

function furniturePoint(item: Furniture, structure: HouseStructure) {
  return {
    x: structure.coordinateSystem.origin.x + structure.coordinateSystem.width * item.position.x / 100,
    y: structure.coordinateSystem.origin.y + structure.coordinateSystem.height * item.position.y / 100
  };
}

function furnitureFootprint(item: Furniture, structure: HouseStructure) {
  const center = furniturePoint(item, structure);
  const halfWidth = item.dimensions.width * 5;
  const halfDepth = item.dimensions.depth * 5;
  const radians = (item.position.rotation || 0) * Math.PI / 180;
  return [[-halfWidth, -halfDepth], [halfWidth, -halfDepth], [halfWidth, halfDepth], [-halfWidth, halfDepth]].map(([x, y]) => ({
    x: center.x + x * Math.cos(radians) - y * Math.sin(radians),
    y: center.y + x * Math.sin(radians) + y * Math.cos(radians)
  }));
}

function zoneItems(zone: OutdoorZone, furniture: Furniture[]) {
  return furniture.filter((item) => item.outdoorZoneId === zone.id);
}

function hasService(items: Furniture[], service: "power" | "water" | "drainage") {
  const mep = service === "power" ? "needsSocket" : service === "water" ? "needsWaterSupply" : "needsDrainage";
  const requirement = service === "power" ? "power" : service === "water" ? "water" : "drainage";
  return items.some((item) => Boolean(item.mepMeta?.[mep]) || Boolean(item.serviceRequirements?.[requirement]));
}

function nearbyDrawingItem(item: Furniture, structure: HouseStructure, drawingItems: DrawingItem[], category: DrawingItem["category"], radius = 1800) {
  const point = furniturePoint(item, structure);
  return drawingItems.some((drawing) => drawing.category === category && getDistance(point, drawing.positionMm) <= radius);
}

/** Cross-discipline outdoor checks. They use the same persisted structure,
 * furniture and drawing collections as indoor checks. */
export function validateOutdoorLivingSystem({ structure, furniture, drawingItems }: { structure: HouseStructure; furniture: Furniture[]; drawingItems: DrawingItem[] }): ValidationFinding[] {
  if (structure.floorId !== "YARD") return [];
  const findings: ValidationFinding[] = [];
  const zones = structure.outdoorZones ?? [];
  const furnitureById = new Map(furniture.map((item) => [item.id, item]));
  const add = (ruleId: string, severity: ValidationFinding["severity"], category: ValidationFinding["category"], objectId: string, title: string, message: string, suggestion: string, relatedObjectIds?: string[]) => findings.push({ ruleId, severity, category, objectId, floorId: "YARD", title, message, suggestion, relatedObjectIds, rootCauseKey: `${ruleId}:${objectId}` });

  zones.forEach((zone) => {
    const items = zoneItems(zone, furniture);
    if (!zone.outdoorId || !structure.outdoors.some((yard) => yard.id === zone.outdoorId)) add("OUTDOOR_ZONE_BOUNDARY", "error", "relation", zone.id, "庭院分区未绑定院界", `${zone.name} 没有有效的北院/南院边界归属。`, "将区域绑定到北院或南院庭院边界。");
    if (zone.polygon.length < 3 || getPolygonArea(zone.polygon) < 1_000_000) add("OUTDOOR_ZONE_AREA", "warning", "geometry", zone.id, "庭院分区面积不足", `${zone.name} 的可用面积不足 1㎡，不适合承载明确功能。`, "调整区域边界或将其并入相邻分区。");
    if (!items.length && !["plant", "garden"].includes(zone.zoneType)) add("OUTDOOR_ZONE_PROGRAM", "warning", "metadata", zone.id, "庭院分区缺少功能对象", `${zone.name} 已定义功能但没有关联 OutdoorObject。`, "在区域内加入对应设备，或调整分区用途。");
    if (zone.zoneType === "outdoorKitchen") {
      const bbq = items.find((item) => item.outdoorObjectType === "bbq");
      const island = items.find((item) => item.outdoorObjectType === "outdoorIsland");
      if (!bbq || !island) add("OUTDOOR_KITCHEN_PROGRAM", "error", "relation", zone.id, "户外厨房配置不完整", `${zone.name} 需同时具有 BBQ 与可操作的户外岛台。`, "补充 BBQ、岛台、储物与操作面。", [bbq?.id, island?.id].filter(Boolean) as string[]);
      if (!hasService(items, "power") || !hasService(items, "water") || !hasService(items, "drainage")) add("OUTDOOR_KITCHEN_MEP", "error", "relation", zone.id, "户外厨房水电不完整", `${zone.name} 需要独立电源、给水与排水需求。`, "为岛台/水槽建立防水电源、给水、排水及燃气设备备注。");
      if (bbq && !nearbyDrawingItem(bbq, structure, drawingItems, "socket")) add("BBQ_POWER_POINT", "error", "drawing", bbq.id, "BBQ 缺少附近电源点", `${bbq.name} 1.8m 内未找到防水插座。`, "在图纸中配置带漏保的户外电源回路。");
    }
    if (zone.zoneType === "laundry") {
      const laundry = items.find((item) => item.outdoorObjectType === "outdoorLaundry");
      if (!laundry || !hasService(items, "power") || !hasService(items, "water") || !hasService(items, "drainage")) add("OUTDOOR_LAUNDRY_MEP", "error", "relation", zone.id, "户外洗衣模块水电不完整", `${zone.name} 必须有洗衣柜岛台与给水、排水、电源。`, "补齐防水柜、洗衣机、操作台、水槽与防雨节点。");
      if (zone.weatherProtection !== "covered" && zone.weatherProtection !== "rainproof") add("OUTDOOR_LAUNDRY_WEATHER", "warning", "metadata", zone.id, "洗衣区缺少遮雨说明", `${zone.name} 未标记遮棚或防雨条件。`, "明确遮棚、天沟和雨水排水做法。");
    }
    if (zone.zoneType === "pet") {
      const house = items.find((item) => item.outdoorObjectType === "dogHouse");
      if (!house) add("PET_SHELTER", "warning", "relation", zone.id, "宠物区缺少狗窝", `${zone.name} 未配置狗窝或遮阳休息点。`, "配置狗窝、遮阳和低位安全照明。");
      if (!hasService(items, "drainage")) add("PET_DRAINAGE", "warning", "relation", zone.id, "宠物区缺少清洁排水", `${zone.name} 未关联排水需求。`, "增加洗脚区、地漏和防滑铺装排水坡度。");
    }
    if (zone.zoneType === "drying" && !items.some((item) => item.outdoorObjectType === "dryingRack")) add("DRYING_PROGRAM", "warning", "relation", zone.id, "晾晒区缺少晾晒架", `${zone.name} 未配置晾晒架。`, "加入晾被架，并通过屏风或植物弱化视线。");
    if (zone.zoneType === "garden" && !items.some((item) => ["raisedGardenBed", "planter"].includes(item.outdoorObjectType ?? ""))) add("GARDEN_PROGRAM", "warning", "relation", zone.id, "种植区缺少可维护花箱", `${zone.name} 仅有绿化边界，没有可维护种植单元。`, "加入 Raised Garden Bed、菜园或香草花箱。");
  });

  furniture.filter((item) => item.floorId === "YARD" && !item.hidden && item.visible !== false).forEach((item) => {
    const outdoorObjectType = item.outdoorObjectType;
    const outdoor = structure.outdoors.find((candidate) => candidate.id === (item.outdoorId ?? item.roomId));
    if (outdoorObjectType && (!item.outdoorZoneId || !zones.some((zone) => zone.id === item.outdoorZoneId))) add("OUTDOOR_OBJECT_ZONE", "error", "relation", item.id, "庭院设备未归属分区", `${item.name} 未绑定有效 Outdoor Zone。`, "在检查器或对象属性中指定所属区域。");
    if (!outdoor || furnitureFootprint(item, structure).some((corner) => !pointInPolygon(corner, outdoor.polygon))) add("OUTDOOR_OBJECT_OUTSIDE_BOUNDARY", "error", "geometry", item.id, "庭院设备越出院界", `${item.name} 的占地轮廓越出所属庭院边界。`, "移动、缩小或旋转对象，使完整占地范围落入院界内。", outdoor ? [outdoor.id] : undefined);
    if (outdoorObjectType && ["outdoorCabinet", "outdoorIsland", "outdoorLaundry"].includes(outdoorObjectType) && !item.constructionMeta?.waterproofRequired) add("OUTDOOR_CABINET_WATERPROOF", "warning", "metadata", item.id, "户外柜未声明防水要求", `${item.name} 作为户外柜体必须有防水、防晒和检修要求。`, "标记防水要求，并补充柜体材质、地面排水和检修说明。");
  });
  // Yard-level skylights are the shared vertical projection of basement light
  // wells. Keep a real service/operating clearance rather than merely avoiding
  // a visual overlap in the 3D scene.
  structure.skylights.forEach((skylight) => {
    const halfWidth = skylight.width / 2;
    const halfDepth = skylight.depth / 2;
    furniture.filter((item) => item.floorId === "YARD" && !item.hidden && item.visible !== false).forEach((item) => {
      const footprint = furnitureFootprint(item, structure);
      const minX = Math.min(...footprint.map((point) => point.x));
      const maxX = Math.max(...footprint.map((point) => point.x));
      const minY = Math.min(...footprint.map((point) => point.y));
      const maxY = Math.max(...footprint.map((point) => point.y));
      const clearanceX = Math.max(skylight.center.x - halfWidth - maxX, minX - (skylight.center.x + halfWidth), 0);
      const clearanceY = Math.max(skylight.center.y - halfDepth - maxY, minY - (skylight.center.y + halfDepth), 0);
      if (Math.hypot(clearanceX, clearanceY) >= 600) return;
      add("YARD_SKYLIGHT_CLEARANCE", "warning", "geometry", item.id, "庭院家具接近地下室天窗", `${item.name} 距 ${skylight.name} 的开启与检修净空不足 600mm。`, "将家具、花箱或设备移出天窗四周 600mm 范围，并保持排水沟和开启方向通畅。", [skylight.id]);
    });
  });
  structure.outdoorSurfaces.filter((surface) => surface.material === "wood").forEach((surface) => {
    const minX = Math.min(...surface.polygon.map((point) => point.x));
    const maxX = Math.max(...surface.polygon.map((point) => point.x));
    const hasDrainage = drawingItems.some((item) =>
      item.category === "drainage" && Boolean(item.roomId) && zones.some((zone) =>
        zone.outdoorId === item.roomId && zone.polygon.some((point) => point.x >= minX && point.x <= maxX)
      )
    );
    if (!hasDrainage) add("OUTDOOR_DECK_DRAINAGE", "warning", "metadata", surface.id, "木平台缺少排水关联", `${surface.name} 使用木纹户外铺装，但未找到排水表达。`, "在排水图中表达找坡、排水口和收口节点。");
  });
  return findings;
}

export function getOutdoorZoneSummary(structure: HouseStructure, furniture: Furniture[]) {
  return (structure.outdoorZones ?? []).map((zone) => ({ ...zone, label: outdoorZoneLabels[zone.zoneType], objectCount: zoneItems(zone, furniture).length, center: center(zone.polygon) }));
}
