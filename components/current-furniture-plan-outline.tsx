import outlines from "@/data/current-furniture-plan-outlines.json";
import type { Furniture } from "@/types/space";

type Outline = {
  floorId: string;
  originalPosition: Record<string, unknown>;
  originalDimensions: Record<string, unknown>;
  normalizedPath: string;
};
const items = outlines.items as Record<string, Outline>;

export function getCurrentFurniturePlanOutline(item: Furniture): Outline | null {
  const outline = items[item.id];
  if (!outline || outline.floorId !== item.floorId) return null;
  for (const [key, value] of Object.entries(outline.originalPosition)) {
    if ((item.position as unknown as Record<string, unknown>)[key] !== value) return null;
  }
  for (const key of ["flipX", "flipY"]) {
    if (Boolean((item.position as unknown as Record<string, unknown>)[key]) !== Boolean(outline.originalPosition[key])) return null;
  }
  // Runtime height synchronization does not change the horizontal footprint.
  for (const key of ["width", "depth", "unit"]) {
    const value = outline.originalDimensions[key];
    if ((item.dimensions as unknown as Record<string, unknown>)[key] !== value) return null;
  }
  return outline;
}

export function CurrentFurniturePlanOutline({ item, outline }: { item: Furniture; outline: Outline }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 block h-full w-full min-h-0 min-w-0 overflow-visible"
      data-current-native-outline={item.id}
      data-model-sha256={outlines.modelSha256}
      aria-label={`${item.name} · 当前模型实际投影`}
      role="img"
    >
      <path d={outline.normalizedPath} fill={item.color || "#ead8bc"} fillOpacity={0.8} stroke="#75654e" strokeWidth={1} vectorEffect="non-scaling-stroke" fillRule="evenodd" strokeLinejoin="round" />
    </svg>
  );
}
