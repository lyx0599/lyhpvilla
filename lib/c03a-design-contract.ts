import type { Furniture } from "../types/space.ts";

/** PMO-adopted cold-layout reference only. Interfaces are not SKU/MEP approval.
 * Localize the approved world-coordinate drawing to its frozen item frame so
 * subsequent native move/rotate/resize does not pin the asset to world space. */
export const c03aDesignReferences = {
  "OUT-N-KITCHEN-ISLAND": { xMm: 9130, yMm: -1200, rotation: 90, widthMm: 700, depthMm: 550, heightMm: 900, elevationMm: 0 },
  "OUT-N-STORAGE": { xMm: 6876, yMm: -1375, rotation: 0, widthMm: 1000, depthMm: 350, heightMm: 900, elevationMm: 0 },
  "OUT-N-BBQ": { xMm: 5601, yMm: -1325, rotation: 0, widthMm: 650, depthMm: 450, heightMm: 900, elevationMm: 0 },
  "PLAN-YARD-R31-N-THIN-CABINET-001": { xMm: 6876, yMm: -1425, rotation: 0, widthMm: 1000, depthMm: 250, heightMm: 400, elevationMm: 1600 }
} as const;

export function hasC03ADesignContract(id: string): id is keyof typeof c03aDesignReferences {
  return Object.hasOwn(c03aDesignReferences, id);
}

export function getC03ADesignTransform(item: Furniture, actualHeightM: number) {
  if (!hasC03ADesignContract(item.id)) return null;
  const reference = c03aDesignReferences[item.id];
  const quarterTurn = reference.rotation % 180 === 90;
  return {
    reference,
    rotationY: reference.rotation * Math.PI / 180,
    scale: [
      quarterTurn ? item.dimensions.depth * 10 / reference.depthMm : item.dimensions.width * 10 / reference.widthMm,
      actualHeightM / (reference.heightMm / 1000),
      quarterTurn ? item.dimensions.width * 10 / reference.widthMm : item.dimensions.depth * 10 / reference.depthMm
    ] as [number, number, number]
  };
}
