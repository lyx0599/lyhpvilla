import type {
  ConstructionAnchor,
  ConstructionAnchorLayer,
  ConstructionAnchorType,
  DrawingSheetType,
  Furniture,
  MmPoint
} from "@/types/space";

const anchorTypesBySheet: Partial<Record<DrawingSheetType, ConstructionAnchorType[]>> = {
  waterSupplyPlan: ["coldWater", "hotWater", "filteredWater"],
  drainagePlan: ["drain"],
  socketPlan: ["power"],
  ceilingPlan: ["exhaust"]
};

export function getConstructionAnchorsForSheet(
  layer: ConstructionAnchorLayer | undefined,
  sheetType: DrawingSheetType,
  includeAll = false
) {
  const points = layer?.points ?? [];
  if (includeAll || sheetType === "furniturePlan" || sheetType === "annotationPlan") return points;
  const allowed = anchorTypesBySheet[sheetType];
  return allowed ? points.filter((point) => allowed.includes(point.type)) : [];
}

export function constructionAnchorToPlanPoint(
  item: Furniture,
  center: MmPoint,
  anchor: ConstructionAnchor
): MmPoint {
  const rotation = (item.position.rotation || 0) * Math.PI / 180;
  const ux = { x: Math.cos(rotation), y: Math.sin(rotation) };
  const uz = { x: -Math.sin(rotation), y: Math.cos(rotation) };
  return {
    x: center.x + ux.x * anchor.positionMm.x + uz.x * anchor.positionMm.z,
    y: center.y + ux.y * anchor.positionMm.x + uz.y * anchor.positionMm.z
  };
}

export function constructionAnchorLabel(anchor: ConstructionAnchor) {
  const height = anchor.installationHeightMm ?? anchor.positionMm.y;
  return height > 0 ? `${anchor.label} H${height}` : anchor.label;
}
