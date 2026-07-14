"use client";

import { resolveFurnitureVariant, stableVariationValue } from "@/lib/furniture-variants";
import type { ResolvedRender3DMaterialLayer } from "@/lib/render3d-assets";
import type { Render3DMeta } from "@/types/space";
import { CylinderPart, RoundedPart } from "./primitives";
import type { FurnitureFamily3DProps, Vec3 } from "./types";

export type DiningChair3DProps = {
  variantId: string;
  seed: number;
  primary: ResolvedRender3DMaterialLayer;
  secondary: ResolvedRender3DMaterialLayer;
  accent: ResolvedRender3DMaterialLayer;
  detailLevel: NonNullable<Render3DMeta["detailLevel"]>;
};

export function DiningChair3D({ variantId, seed, primary, secondary, accent, detailLevel }: DiningChair3DProps) {
  const upholstered = variantId === "upholsteredDining" || variantId === "armHost" || variantId === "curvedLounge";
  const woven = variantId === "wovenDining";
  const metal = variantId === "lightSide";
  const lounge = variantId === "curvedLounge";
  const host = variantId === "armHost";
  const seatWidth = lounge ? 0.5 : host ? 0.47 : 0.42;
  const seatDepth = lounge ? 0.48 : 0.41;
  const seatY = -0.02;
  const backY = lounge ? 0.27 : 0.25;
  const backLean = -0.11 - stableVariationValue(seed, 4) * 0.035;
  const frameMaterial = metal ? accent : primary;
  return (
    <group>
      <RoundedPart size={[seatWidth, 0.09, seatDepth]} position={[0, seatY, 0]} radius={upholstered ? 0.055 : 0.035} detailLevel={detailLevel} material={upholstered ? secondary : primary} role={upholstered ? "fabric" : "wood"} repeat={[2, 2]} />
      {woven ? (
        <group position={[0, backY, -seatDepth * 0.46]} rotation={[backLean, 0, 0]}>
          <RoundedPart size={[seatWidth * 0.98, 0.43, 0.045]} radius={0.05} detailLevel={detailLevel} material={primary} role="wood" />
          {[-0.14, -0.07, 0, 0.07, 0.14].map((x) => <RoundedPart key={x} size={[0.018, 0.33, 0.052]} position={[x, 0, 0.026]} radius={0.008} detailLevel={detailLevel} material={secondary} role="fabric" />)}
        </group>
      ) : (
        <RoundedPart
          size={[lounge ? 0.54 : host ? 0.5 : 0.43, lounge ? 0.46 : 0.42, lounge ? 0.12 : 0.075]}
          position={[0, backY, -seatDepth * 0.46]}
          rotation={[backLean, 0, 0]}
          radius={lounge ? 0.2 : host ? 0.13 : upholstered ? 0.075 : 0.045}
          detailLevel={detailLevel}
          material={upholstered ? secondary : primary}
          role={upholstered ? "fabric" : "wood"}
          repeat={[2, 2]}
        />
      )}
      {host && [-1, 1].map((side) => (
        <group key={side}>
          <CylinderPart radiusTop={0.018} height={0.42} position={[side * 0.24, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]} material={primary} role="wood" sides={12} />
          <RoundedPart size={[0.055, 0.07, 0.38]} position={[side * 0.24, 0.2, -0.01]} radius={0.02} detailLevel={detailLevel} material={primary} role="wood" />
        </group>
      ))}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => {
        const position: Vec3 = [sx * seatWidth * 0.34, -0.24, sz * seatDepth * 0.32];
        return <CylinderPart key={`${sx}-${sz}`} radiusTop={metal ? 0.014 : 0.019} height={0.38} position={position} rotation={[0, 0, sx * 0.045]} material={frameMaterial} role={metal ? "metal" : "wood"} sides={metal ? 10 : 12} />;
      }))}
    </group>
  );
}
export function ChairFamily3D(props: FurnitureFamily3DProps) {
  const resolved = resolveFurnitureVariant(props.item, props.asset.assetType);
  return (
    <DiningChair3D
      variantId={resolved.variant.id}
      seed={resolved.seed}
      primary={props.asset.materials.primary}
      secondary={props.asset.materials.secondary}
      accent={props.asset.materials.accent}
      detailLevel={props.asset.detailLevel}
    />
  );
}
