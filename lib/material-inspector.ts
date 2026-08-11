import { getPbrMaterialDefinition, pbrMaterialCatalog } from "@/lib/material-system";
import { resolveCabinetMaterialLayer, resolveRender3DMaterials, type ResolvedRender3DMaterialLayer } from "@/lib/render3d-assets";
import type { Furniture, HouseStructure } from "@/types/space";

export type MaterialInspectorSource = "canonical" | "实例覆盖" | "旧材质" | "内联材质" | "回退材质";

export type MaterialInspectorDetail = {
  token?: string;
  source: MaterialInspectorSource;
  sourceName?: string;
  label: string;
  color: string;
  roughness: number;
  normalStrength?: number;
  metalness: number;
  transmission?: number;
  thicknessMm?: number;
  ior?: number;
  proceduralTexture: "已启用" | "未启用" | "未确认";
  quality: string;
};

export type MaterialInspectorPart = {
  part: string;
  material: string;
  detail: MaterialInspectorDetail;
};

export type MaterialInspectorData = {
  objectLabel: string;
  objectKind: "家具/柜体" | "建筑构件" | "未命名构件";
  currentPart?: string;
  parts: MaterialInspectorPart[];
};

const ROLE_PART_LABELS: Record<string, string> = {
  wood: "木作/框架",
  fabric: "软包/布艺",
  leather: "软包/皮革",
  stone: "石材/台面",
  metal: "金属/五金",
  glass: "玻璃",
  ceramic: "陶瓷/洁具",
  plant: "绿植",
  light: "灯具发光部件",
  generic: "主要部件"
};

function sourceLabel(layer: ResolvedRender3DMaterialLayer): MaterialInspectorSource {
  if (layer.source === "instance") return "实例覆盖";
  if (layer.pbrToken) return "canonical";
  if (layer.source === "material") return "旧材质";
  if (layer.source === "color") return "内联材质";
  return "回退材质";
}

function detailFromLayer(layer: ResolvedRender3DMaterialLayer): MaterialInspectorDetail {
  let quality = "当前质量档位";
  if (layer.preferredResolution || layer.mobileResolution) {
    quality = `桌面 ${layer.preferredResolution ?? "—"} · 手机 ${layer.mobileResolution ?? "—"}`;
  }
  return {
    token: layer.pbrToken,
    source: sourceLabel(layer),
    sourceName: layer.pbrToken ? layer.sourceNote : layer.token,
    label: layer.label,
    color: layer.color,
    roughness: layer.roughness,
    normalStrength: layer.normalStrength,
    metalness: layer.metalness,
    transmission: layer.transmission,
    thicknessMm: layer.thicknessMm,
    ior: layer.ior,
    proceduralTexture: layer.channels ? Object.values(layer.channels).some(Boolean) ? "已启用" : "未启用" : "未确认",
    quality
  };
}

function uniqueLayers(layers: Array<{ part: string; layer: ResolvedRender3DMaterialLayer }>) {
  const seen = new Set<string>();
  return layers.filter(({ layer }) => {
    const key = `${layer.pbrToken ?? layer.token}:${layer.label}:${layer.color}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function partLabelForLayer(item: Furniture, layer: ResolvedRender3DMaterialLayer, index: number) {
  const type = item.render3d?.assetType ?? item.moduleType ?? item.type;
  const role = layer.role;
  if (type === "sofa") {
    return index === 0 && role === "fabric" ? "坐垫和靠背" : role === "wood" ? "沙发框架" : role === "metal" ? "金属脚" : "沙发部件";
  }
  if (type === "bed") {
    if (role === "fabric" || role === "leather") return index === 0 ? "床品" : "软包/靠背";
    if (role === "wood") return "床架";
    if (role === "metal") return "金属件";
  }
  if (["kitchenCabinet", "island", "sideboard", "bathroomVanity", "cabinet", "wallCabinet", "wardrobe", "entryCabinet"].includes(type)) {
    if (role === "stone") return "台面";
    if (role === "metal") return "拉手/五金";
    if (role === "wood" || role === "ceramic" || role === "glass") {
      if (["wardrobe", "walkInCloset"].includes(type)) return index === 0 ? "柜体" : "柜门";
      return index === 0 ? "柜体" : "柜门/玻璃";
    }
  }
  if (["diningTable", "table", "coffeeTable", "loungeCoffeeTable", "desk", "slabTable"].includes(type)) {
    if (index === 0) return "桌面";
    if (role === "metal") return "桌腿/底座";
    return "桌体部件";
  }
  if (["toilet", "bathtub", "sink", "shower"].includes(type)) {
    if (role === "ceramic") return "洁具主体";
    if (role === "glass") return "玻璃隔断";
    if (role === "metal") return "龙头/五金";
  }
  return index === 0 ? ROLE_PART_LABELS[role] ?? "主要部件" : role === "metal" ? "五金" : "次要部件";
}

export function getFurnitureMaterialInspectorData(item: Furniture, currentPart?: string): MaterialInspectorData {
  const resolved = resolveRender3DMaterials(item);
  const type = item.render3d?.assetType ?? item.moduleType ?? item.type;
  const cabinetLike = ["kitchenCabinet", "island", "sideboard", "bathroomVanity", "cabinet", "wallCabinet", "wardrobe", "walkInCloset", "entryCabinet", "snackCabinet", "tallCabinet"].includes(type);
  const layers = cabinetLike
    ? uniqueLayers([
        { part: "柜体", layer: resolveCabinetMaterialLayer(item, resolved, "carcass") },
        { part: "柜门", layer: resolveCabinetMaterialLayer(item, resolved, "door") },
        ...(item.render3d?.cabinetVisual?.frontStyle === "glass" || item.render3d?.cabinetVisual?.bays?.some((bay) => bay.frontType === "glass") ? [{ part: "玻璃", layer: resolveCabinetMaterialLayer(item, resolved, "glass") }] : []),
        ...(["kitchenCabinet", "island", "sideboard", "bathroomVanity"].includes(type) ? [{ part: "台面", layer: resolveCabinetMaterialLayer(item, resolved, "countertop") }] : []),
        { part: "拉手/五金", layer: resolveCabinetMaterialLayer(item, resolved, "hardware") }
      ])
    : uniqueLayers([
        { part: partLabelForLayer(item, resolved.primary, 0), layer: resolved.primary },
        { part: partLabelForLayer(item, resolved.secondary, 1), layer: resolved.secondary },
        { part: partLabelForLayer(item, resolved.accent, 2), layer: resolved.accent }
      ]);
  return {
    objectLabel: item.name || "未命名家具",
    objectKind: "家具/柜体",
    currentPart,
    parts: layers.map(({ part, layer }) => ({ part, material: layer.label, detail: detailFromLayer(layer) }))
  };
}

function structureLayer(token: string, label: string, source: MaterialInspectorSource = "内联材质", color?: string, roughness?: number, metalness?: number): MaterialInspectorDetail {
  const canonical = token && Object.prototype.hasOwnProperty.call(pbrMaterialCatalog, token)
    ? (() => { try { return getPbrMaterialDefinition(token); } catch { return null; } })()
    : null;
  if (canonical) {
    const definition = canonical.definition;
    return {
      token: canonical.token,
      source: "canonical",
      label: definition.label,
      color: definition.baseColor,
      roughness: definition.roughness,
      normalStrength: definition.normalStrength,
      metalness: definition.metalness,
      transmission: definition.transmission,
      thicknessMm: definition.thicknessMm,
      ior: definition.ior,
      proceduralTexture: Object.values(definition.channels).some(Boolean) ? "已启用" : "未启用",
      quality: `桌面 ${definition.quality.standard.desktop} · 手机 ${definition.quality.standard.mobile}`
    };
  }
  return { token: token || undefined, source, sourceName: "结构字段或内联绑定", label, color: color ?? "—", roughness: roughness ?? 0.7, metalness: metalness ?? 0, proceduralTexture: "未确认", quality: "当前质量档位" };
}

export function getStructureMaterialInspectorData(structure: HouseStructure, objectId: string): MaterialInspectorData | null {
  const wall = structure.walls.find((item) => item.id === objectId);
  if (wall) {
    const finish = wall.surfaceFinish;
    const detail = structureLayer(finish?.materialToken ?? "warmWhiteMineral", finish?.name ?? "暖白墙面", finish ? "内联材质" : "canonical", finish?.baseColor, finish?.roughness);
    return { objectLabel: wall.name || "墙面", objectKind: "建筑构件", parts: [{ part: "墙面", material: detail.label, detail }] };
  }
  const partition = structure.partitions.find((item) => item.id === objectId);
  if (partition) {
    const token = partition.material === "glass" ? "clearGlass" : partition.material === "wood" ? "warmOak" : undefined;
    const detail = structureLayer(token ?? "", partition.material === "glass" ? "低铁玻璃" : partition.material === "wood" ? "浅橡木" : "隔断材质");
    return { objectLabel: partition.name || "隔断", objectKind: "建筑构件", parts: [{ part: "隔断主体", material: detail.label, detail }] };
  }
  const room = structure.rooms.find((item) => item.id === objectId);
  if (room) {
    const finish = room.surfaceFinishes?.floor;
    const token = finish?.materialToken ?? "oakFloor";
    const detail = structureLayer(token, finish?.name ?? "木地板", finish ? "内联材质" : "canonical", finish?.baseColor, finish?.roughness);
    return { objectLabel: room.name || "房间地面", objectKind: "建筑构件", parts: [{ part: "地面", material: detail.label, detail }] };
  }
  const door = structure.doors.find((item) => item.id === objectId);
  if (door) {
    const frame = structureLayer(door.material === "glass" ? "blackTitanium" : "warmOak", door.material === "glass" ? "深色金属框" : "浅橡木门框");
    const parts: MaterialInspectorPart[] = [{ part: "门框/门扇", material: frame.label, detail: frame }];
    if (door.material === "glass" || door.material === "translucentGlass") {
      const glass = structureLayer("clearGlass", "低铁玻璃");
      parts.push({ part: "玻璃", material: glass.label, detail: glass });
    }
    parts.push({ part: "五金", material: "黑钛金属", detail: structureLayer("blackTitanium", "黑钛金属") });
    return { objectLabel: door.name || "门", objectKind: "建筑构件", parts };
  }
  const window = structure.windows.find((item) => item.id === objectId);
  if (window) {
    const frame = structureLayer("blackTitanium", "深色金属框");
    const glass = structureLayer("clearGlass", "低铁玻璃");
    return { objectLabel: window.name || "窗", objectKind: "建筑构件", parts: [{ part: "窗框", material: frame.label, detail: frame }, { part: "玻璃", material: glass.label, detail: glass }, { part: "五金", material: "黑钛金属", detail: frame }] };
  }
  const stair = structure.stairs.find((item) => item.id === objectId);
  if (stair) {
    const oak = structureLayer("warmOak", "浅橡木");
    const metal = structureLayer("blackTitanium", "黑钛金属");
    return { objectLabel: stair.name || "楼梯", objectKind: "建筑构件", parts: [{ part: "踏步", material: oak.label, detail: oak }, { part: "扶手/栏杆", material: metal.label, detail: metal }] };
  }
  const outdoor = structure.outdoorSurfaces.find((item) => item.id === objectId);
  if (outdoor) {
    const detail = structureLayer(outdoor.materialToken ?? "courtyardStone", outdoor.material ?? "庭院石材");
    return { objectLabel: "庭院铺装", objectKind: "建筑构件", parts: [{ part: "铺装面", material: detail.label, detail }] };
  }
  return null;
}
