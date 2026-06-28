import type { Dimension } from "@/types/space";

export function formatDimensions(dimensions: Dimension) {
  return `${dimensions.width} × ${dimensions.depth} × ${dimensions.height} ${dimensions.unit}`;
}

export function getFileName(path?: string) {
  if (!path) return "未绑定";
  return decodeURIComponent(path.split("/").filter(Boolean).at(-1) ?? path);
}
