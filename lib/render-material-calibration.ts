import type { PbrMaterialDefinition } from "./material-system";

/** Renderer families, deliberately separate from the authored material catalog. */
export function proceduralKindForFamily(family: PbrMaterialDefinition["family"]) {
  if (family === "woodFloor") return "wood";
  if (family === "tile") return "stone";
  if (family === "paint") return "wall";
  return family;
}

/**
 * Three multiplies roughnessMap.g by the material's roughness. Generated maps
 * are painted with absolute catalog values; convert those to relative detail
 * so an unmarked surface retains its authored roughness instead of squaring it.
 * A byte texture cannot encode >1: rougher marks saturate, rather than changing
 * the catalog scalar or exceeding the renderer's supported roughness range.
 */
export function relativeRoughnessByte(value: number, baselineRoughness: number) {
  const baselineByte = Math.round(Math.max(0, Math.min(1, baselineRoughness)) * 255);
  if (baselineByte === 0) return 255;
  return Math.round(Math.max(0, Math.min(1, value / baselineByte)) * 255);
}

/** Standard/draft materials have no transmission; use the authored alpha fallback. */
export function resolveGlassPreviewOpacity(opacity: number, transmission: number, physical: boolean, fallbackOpacity?: number) {
  if (physical || transmission <= 0) return opacity;
  return Math.min(opacity, fallbackOpacity ?? Math.max(0.12, 1 - transmission));
}
