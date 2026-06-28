import type { FloorId } from "@/types/space";
import type { Point, SemanticCategory, SemanticObject } from "@/types/semantic-map";

export const semanticCategoryLabels: Record<SemanticCategory, string> = {
  Room: "房间",
  Zone: "区域",
  Wall: "墙体",
  Door: "门",
  Window: "窗",
  Furniture: "家具",
  Material: "材质",
  Light: "灯光",
  Switch: "开关",
  Socket: "插座",
  WaterPoint: "给水点",
  DrainPoint: "排水点",
  Appliance: "电器",
  HVAC: "空调/新风/地暖",
  Dehumidifier: "除湿设备",
  SmartDevice: "智能设备",
  OutdoorElement: "院子设施"
};

export const semanticCategories = Object.keys(semanticCategoryLabels) as SemanticCategory[];

export const semanticIdPrefixes: Record<SemanticCategory, string> = {
  Room: "R",
  Zone: "Z",
  Wall: "W",
  Door: "D",
  Window: "WIN",
  Furniture: "F",
  Material: "M",
  Light: "L",
  Switch: "S",
  Socket: "SK",
  WaterPoint: "WP",
  DrainPoint: "DP",
  Appliance: "AP",
  HVAC: "HVAC",
  Dehumidifier: "DH",
  SmartDevice: "SD",
  OutdoorElement: "OE"
};

export function generateSemanticId(category: SemanticCategory, floorId: FloorId, objects: SemanticObject[]) {
  const prefix = `${semanticIdPrefixes[category]}-${floorId}-`;
  const max = objects.reduce((currentMax, object) => {
    if (!object.id.startsWith(prefix)) return currentMax;
    const serial = Number(object.id.slice(prefix.length));
    return Number.isFinite(serial) ? Math.max(currentMax, serial) : currentMax;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function getDefaultPosition(category: SemanticCategory): Point | undefined {
  if (category === "Material") return undefined;
  return { x: 50, y: 50 };
}

export function getDefaultDetails(category: SemanticCategory) {
  const position = { x: 50, y: 50 };
  switch (category) {
    case "Room":
      return { area: 0, boundary: [] };
    case "Zone":
      return { roomId: "", boundary: [] };
    case "Wall":
      return { wallType: "unknown", roomIds: [], zoneIds: [], start: { x: 40, y: 40 }, end: { x: 60, y: 40 }, thickness: 20, height: 280, editable: true, removable: false, riskLevel: "medium" };
    case "Door":
    case "Window":
      return { wallId: "", size: { width: 90, height: 210, unit: "cm" }, position, openDirection: "unknown" };
    case "Furniture":
      return {
        roomId: "",
        zoneId: "",
        size: { width: 100, depth: 60, height: 80, unit: "cm" },
        position,
        rotation: 0,
        materialId: "",
        relatedWallIds: [],
        referenceImage: "",
        source: "manual",
        brand: "",
        purchaseLink: ""
      };
    case "Light":
      return { roomId: "", zoneId: "", lightType: "ceiling", position, brightness: 800, colorTemperature: 3500, controlSwitchIds: [] };
    case "Switch":
      return { roomId: "", position, controlledObjectIds: [] };
    case "Socket":
      return { roomId: "", zoneId: "", position, socketType: "五孔", heightFromFloor: 30 };
    case "WaterPoint":
    case "DrainPoint":
      return { roomId: "", zoneId: "", position, usage: "" };
    case "Appliance":
      return { roomId: "", zoneId: "", size: { width: 60, depth: 60, height: 90, unit: "cm" }, position, powerRequirement: "", waterRequired: false, drainageRequired: false };
    case "SmartDevice":
      return { roomId: "", zoneId: "", deviceType: "sensor", position, ecosystem: "Mijia", relatedObjectIds: [] };
    case "OutdoorElement":
      return { zoneId: "", position, size: { width: 100, depth: 100, height: 100, unit: "cm" }, materialId: "", waterRequired: false, drainageRequired: false, powerRequired: false };
    case "HVAC":
      return { roomId: "", zoneId: "", deviceType: "空调", position, powerRequirement: "", relatedObjectIds: [] };
    case "Dehumidifier":
      return { roomId: "", zoneId: "", deviceType: "除湿机", position, powerRequirement: "", drainageRequired: true, relatedObjectIds: [] };
    case "Material":
    default:
      return { materialType: "", usage: "" };
  }
}

export function getSemanticObjectPosition(object: SemanticObject): Point | undefined {
  if (object.position) return object.position;
  const details = object.details as { position?: Point; start?: Point; boundary?: Point[] };
  if (details.position) return details.position;
  if (details.start) return details.start;
  if (details.boundary?.length) {
    const total = details.boundary.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
    return { x: total.x / details.boundary.length, y: total.y / details.boundary.length };
  }
  return undefined;
}

export function validateSemanticObject(object: SemanticObject, objects: SemanticObject[]) {
  const errors: string[] = [];
  const trimmedName = object.name.trim();
  if (!trimmedName) errors.push("名称不能为空");
  if (objects.some((item) => item.id !== object.id && item.id === object.id)) errors.push("id 不能重复");
  if (objects.some((item) => item.id !== object.id && item.name.trim() === trimmedName)) errors.push("name 不能重复");
  return errors;
}
