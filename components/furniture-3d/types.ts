import type { Resolved3DAsset } from "@/lib/render3d-assets";
import type { Furniture } from "@/types/space";

export type Vec3 = [number, number, number];

export type FurnitureFamily3DProps = {
  item: Furniture;
  asset: Resolved3DAsset;
  width: number;
  depth: number;
  height: number;
};
