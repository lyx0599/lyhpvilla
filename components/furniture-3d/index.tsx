"use client";

import { resolveFurnitureVariant } from "@/lib/furniture-variants";
import { BedFamily3D } from "./bed-family-3d";
import { CabinetFamily3D } from "./cabinet-family-3d";
import { ChairFamily3D } from "./chair-family-3d";
import { MediaWall3D } from "./media-wall-3d";
import { SofaFamily3D } from "./sofa-family-3d";
import { SoftDecor3D } from "./soft-decor-3d";
import { CoffeeTableFamily3D, DiningTableFamily3D } from "./table-family-3d";
import type { FurnitureFamily3DProps } from "./types";

export function FurnitureFamily3D(props: FurnitureFamily3DProps) {
  if (props.asset.assetType === "fireplace") return <MediaWall3D {...props} />;
  const family = resolveFurnitureVariant(props.item, props.asset.assetType).family;
  if (family === "bed") return <BedFamily3D {...props} />;
  if (family === "sofa") return <SofaFamily3D {...props} />;
  if (family === "diningTable") return <DiningTableFamily3D {...props} />;
  if (family === "coffeeTable") return <CoffeeTableFamily3D {...props} />;
  if (family === "chair") return <ChairFamily3D {...props} />;
  if (family === "cabinet") return <CabinetFamily3D {...props} />;
  if (family === "softDecor") return <SoftDecor3D {...props} />;
  return null;
}

export type { FurnitureFamily3DProps } from "./types";
