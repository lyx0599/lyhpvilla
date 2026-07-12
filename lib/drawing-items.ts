import type { DrawingItem, DrawingItemCategory, DrawingItemStatus, DrawingSheetType, FloorId, Furniture, HouseStructure } from "../types/space";

export const drawingItemCategories: DrawingItemCategory[] = [
  "socket", "switch", "light", "waterSupply", "drainage", "ceiling", "floorFinish",
  "wallFinish", "cabinet", "annotation", "network", "ventilation"
];

export const drawingItemCategoryLabels: Record<DrawingItemCategory, string> = {
  socket: "插座", switch: "开关", light: "灯具", waterSupply: "给水", drainage: "排水",
  ceiling: "吊顶", floorFinish: "地面", wallFinish: "墙面", cabinet: "柜体",
  annotation: "标注", network: "网络", ventilation: "通风"
};

export const drawingItemStatuses: DrawingItemStatus[] = ["draft", "confirmed", "todo", "deprecated"];
export const drawingItemStatusLabels: Record<DrawingItemStatus, string> = {
  draft: "草稿", confirmed: "已确认", todo: "待确认", deprecated: "已废弃"
};

const categoriesBySheet: Partial<Record<DrawingSheetType, DrawingItemCategory[]>> = {
  socketPlan: ["socket", "network"],
  switchPlan: ["switch"],
  lightingPlan: ["light"],
  waterSupplyPlan: ["waterSupply"],
  drainagePlan: ["drainage"],
  ceilingPlan: ["ceiling"],
  floorFinishPlan: ["floorFinish"],
  wallFinishPlan: ["wallFinish"],
  annotationPlan: ["annotation"]
};

export function getDrawingItemCategoriesForSheet(sheetType: DrawingSheetType | null) {
  return sheetType ? categoriesBySheet[sheetType] ?? [] : [];
}

export function createDrawingItem(input: {
  id: string;
  floorId: FloorId;
  category: DrawingItemCategory;
  positionMm: { x: number; y: number };
  roomId?: string | null;
  now?: string;
}): DrawingItem {
  const now = input.now ?? new Date().toISOString();
  return {
    id: input.id, floorId: input.floorId, roomId: input.roomId ?? null, category: input.category,
    type: input.category, positionMm: input.positionMm, hostObjectId: null, hostWallId: null,
    relatedFurnitureId: null, heightMm: null, circuitId: null, materialId: null,
    label: drawingItemCategoryLabels[input.category], notes: "", source: "manual", status: "draft",
    quantity: 1, createdAt: now, updatedAt: now
  };
}

type GeneratedDemand = {
  category: DrawingItemCategory;
  type: string;
  quantity?: number;
  heightMm?: number | null;
  circuitId?: string | null;
  lightColorTemperature?: DrawingItem["lightColorTemperature"];
  needsSmartControl?: boolean;
  noteParts?: string[];
};

export type DrawingItemGenerationResult = {
  items: DrawingItem[];
  created: number;
  updated: number;
  skipped: number;
  conflicts: DrawingItem[];
};

function getFurnitureDemands(furniture: Furniture): GeneratedDemand[] {
  const mep = furniture.mepMeta ?? {};
  const construction = furniture.constructionMeta ?? {};
  const demands: GeneratedDemand[] = [];
  if (mep.needsSocket) demands.push({ category: "socket", type: mep.relatedCircuit || "power", quantity: Math.max(1, mep.socketCount ?? 1), heightMm: mep.socketHeight ?? 300, circuitId: mep.relatedCircuit ?? null, noteParts: [mep.notes ?? ""] });
  if (mep.needsLighting) demands.push({ category: "light", type: mep.lightingType && mep.lightingType !== "none" ? mep.lightingType : "lighting", lightColorTemperature: mep.lightColorTemperature ?? null, needsSmartControl: Boolean(mep.needsSmartControl), noteParts: [mep.lightColorTemperature ?? "", mep.needsSmartControl ? "智能控制" : "", mep.notes ?? ""] });
  if (mep.needsWaterSupply) demands.push({ category: "waterSupply", type: mep.waterSupplyType && mep.waterSupplyType !== "none" ? mep.waterSupplyType : "waterSupply", noteParts: [mep.notes ?? ""] });
  if (mep.needsDrainage) demands.push({ category: "drainage", type: mep.drainageType && mep.drainageType !== "none" ? mep.drainageType : "drainage", noteParts: [mep.notes ?? ""] });
  if (mep.needsNetwork) demands.push({ category: "network", type: "network", noteParts: [mep.notes ?? ""] });
  if (mep.needsVentilation) demands.push({ category: "ventilation", type: "ventilation", noteParts: [mep.notes ?? ""] });
  if (construction.inspectionAccessRequired) demands.push({ category: "annotation", type: "inspectionAccess", noteParts: ["预留检修口", construction.notes ?? ""] });
  return demands;
}

function generatedFields(item: DrawingItem) {
  return {
    floorId: item.floorId, roomId: item.roomId, category: item.category, type: item.type,
    positionMm: item.positionMm, relatedFurnitureId: item.relatedFurnitureId, heightMm: item.heightMm,
    circuitId: item.circuitId, label: item.label, notes: item.notes, status: item.status,
    quantity: item.quantity, lightColorTemperature: item.lightColorTemperature ?? null,
    needsSmartControl: Boolean(item.needsSmartControl)
  };
}

export function getDrawingItemGeneratedFingerprint(item: DrawingItem) {
  return JSON.stringify(generatedFields(item));
}

function getGeneratedPosition(furniture: Furniture, structure: HouseStructure, index: number) {
  const coordinateSystem = structure.coordinateSystem;
  const centerX = coordinateSystem.origin.x + (furniture.position.x / 100) * coordinateSystem.width;
  const centerY = coordinateSystem.origin.y + (furniture.position.y / 100) * coordinateSystem.height;
  const offset = Math.min(600, Math.max(180, furniture.dimensions.width * 5 + 120));
  const angle = ((index % 8) / 8) * Math.PI * 2;
  return {
    x: Math.round(Math.min(coordinateSystem.origin.x + coordinateSystem.width, Math.max(coordinateSystem.origin.x, centerX + Math.cos(angle) * offset))),
    y: Math.round(Math.min(coordinateSystem.origin.y + coordinateSystem.height, Math.max(coordinateSystem.origin.y, centerY + Math.sin(angle) * offset)))
  };
}

export function generateDrawingItemsFromFurniture(input: {
  furniture: Furniture[];
  structuresByFloor: Partial<Record<FloorId, HouseStructure>>;
  existingItems: DrawingItem[];
  floorIds?: FloorId[];
  overwriteConflicts?: boolean;
  now?: string;
}): DrawingItemGenerationResult {
  const now = input.now ?? new Date().toISOString();
  const targetFloors = input.floorIds ? new Set(input.floorIds) : null;
  const existingByKey = new Map(input.existingItems.filter((item) => item.generatedKey).map((item) => [item.generatedKey as string, item]));
  const untouchedExisting = input.existingItems.filter((item) => !item.generatedKey);
  const generatedByKey = new Map(input.existingItems.filter((item) => item.generatedKey).map((item) => [item.generatedKey as string, item]));
  const conflicts: DrawingItem[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  input.furniture.filter((item) => !targetFloors || targetFloors.has(item.floorId)).forEach((furniture) => {
    const structure = input.structuresByFloor[furniture.floorId];
    if (!structure) return;
    getFurnitureDemands(furniture).forEach((demand, index) => {
      const generatedKey = `${furniture.id}:${demand.category}:${demand.type}`;
      const current = existingByKey.get(generatedKey);
      const base = createDrawingItem({ id: current?.id ?? `DI-${furniture.floorId}-${generatedKey.replace(/[^A-Za-z0-9]+/g, "-")}`, floorId: furniture.floorId, category: demand.category, positionMm: getGeneratedPosition(furniture, structure, index), roomId: furniture.roomId, now });
      const desired: DrawingItem = {
        ...base,
        type: demand.type,
        relatedFurnitureId: furniture.id,
        heightMm: demand.heightMm ?? null,
        circuitId: demand.circuitId ?? null,
        label: `${furniture.name} · ${drawingItemCategoryLabels[demand.category]}`,
        notes: [...(demand.noteParts ?? []).filter(Boolean), "需人工确认"].join("；"),
        source: "generated-from-furniture",
        quantity: demand.quantity ?? 1,
        lightColorTemperature: demand.lightColorTemperature ?? null,
        needsSmartControl: Boolean(demand.needsSmartControl),
        generatedKey,
        createdAt: current?.createdAt ?? now,
        updatedAt: now
      };
      desired.generatedFingerprint = getDrawingItemGeneratedFingerprint(desired);
      if (!current) {
        generatedByKey.set(generatedKey, desired);
        created += 1;
        return;
      }
      const manuallyAdjusted = !current.generatedFingerprint || getDrawingItemGeneratedFingerprint(current) !== current.generatedFingerprint;
      if (manuallyAdjusted) {
        if (input.overwriteConflicts) {
          generatedByKey.set(generatedKey, desired);
          updated += 1;
          return;
        }
        conflicts.push(current);
        skipped += 1;
        return;
      }
      if (current.generatedFingerprint === desired.generatedFingerprint) {
        skipped += 1;
        return;
      }
      generatedByKey.set(generatedKey, desired);
      updated += 1;
    });
  });
  return { items: [...untouchedExisting, ...Array.from(generatedByKey.values())], created, updated, skipped, conflicts };
}
