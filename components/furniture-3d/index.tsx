"use client";

import { resolveFurnitureVariant } from "@/lib/furniture-variants";
import { Research1FContract, hasResearch1FContract } from "./research-1f-contract";
import { approvedR14Role, R14ApprovedSubset } from './r14-approved-subset';
import { isR09ThreeDoorCloset } from "@/lib/r09-closet-mapping";
import { R09ThreeDoorCloset } from "./r09-three-door-closet";
import {hasR11BathFixture,R11BathFixture} from './r11-bath-fixtures';
import {isR12GuestShower,R12GuestShower} from './r12-guest-shower';
import { BedFamily3D } from "./bed-family-3d";
import { CabinetFamily3D } from "./cabinet-family-3d";
import { ChairFamily3D } from "./chair-family-3d";
import { KitchenFamily3D } from "./kitchen-family-3d";
import { MediaWall3D } from "./media-wall-3d";
import { SofaFamily3D } from "./sofa-family-3d";
import { SoftDecor3D } from "./soft-decor-3d";
import { CoffeeTableFamily3D, DiningTableFamily3D, SitStandDesk3D } from "./table-family-3d";
import type { FurnitureFamily3DProps } from "./types";
import { WetAreaFamily3D } from "./wet-area-family-3d";

export function FurnitureFamily3D(props: FurnitureFamily3DProps) {
  if (approvedR14Role(props.item)) return <R14ApprovedSubset {...props} />;
  if (hasR11BathFixture(props)) return <R11BathFixture {...props}/>;
  if (isR12GuestShower(props)) return <R12GuestShower {...props}/>;
  if (isR09ThreeDoorCloset(props.item)) return <R09ThreeDoorCloset {...props} />;
  if (hasResearch1FContract(props.item.id)) return <Research1FContract {...props} />;
  if (props.asset.assetType === "fireplace") return <MediaWall3D {...props} />;
  if (props.asset.assetType === "desk") return <SitStandDesk3D {...props} />;
  if (["archedBuffetUpper", "mirroredReferenceBuffetUpper", "mirroredReferenceBuffetTower"].includes(props.item.render3d?.variantId ?? "")) return <CabinetFamily3D {...props} />;
  if (["kitchenCabinet", "wallCabinet", "island", "sink", "cooktop", "fridge"].includes(props.asset.assetType)) return <KitchenFamily3D {...props} />;
  if (["bathroomVanity", "toilet", "bathtub", "shower"].includes(props.asset.assetType)) return <WetAreaFamily3D {...props} />;
  if (props.asset.assetType === "sideboard" && (props.item.serviceRequirements?.water || props.item.mepMeta?.needsWaterSupply || /水吧/.test(props.item.name))) return <KitchenFamily3D {...props} />;
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
