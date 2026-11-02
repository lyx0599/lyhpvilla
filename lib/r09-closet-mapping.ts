import type { Furniture } from '@/types/space';

// Reviewed explicit module coordinates, not an automatic scale of old modules.
export function isR09ThreeDoorCloset(item: Furniture) {
  return ['module-2f-cloak-left', 'module-2f-cloak-right'].includes(item.id)
    && item.render3d?.cabinetVisual?.doorCount === 3
    && item.cabinetInterior?.interiorHeightMm === 2434;
}
export function r09ClosetMapping(item: Furniture, w: number, h: number, d: number) {
  const layout = item.cabinetInterior!;
  const panel = layout.panelThicknessMm / 1000;
  const count = layout.doorCount, gap = .016;
  const doorWidth = (w - gap * (count + 1)) / count;
  const modules = layout.modules.map(m => ({ ...m,
    physicalPartRef: (m as typeof m & {physicalPartRef?: string}).physicalPartRef,
    widthM: m.width / 1000, heightM: m.height / 1000, depthM: m.depth / 1000,
    xM: -w / 2 + panel + (m.x + m.width / 2) / 1000,
    yM: -h / 2 + panel + (m.y + m.height / 2) / 1000,
    zM: -d / 2 + panel + (m.z + m.depth / 2) / 1000,
  }));
  return {count, panel, gap, doorWidth, doorHeight: h - 2 * panel,
    frontZ: d / 2 - .039, hingeSides: [-1, -1, -1], modules,
    innerWidthMm: layout.interiorWidthMm, innerHeightMm: layout.interiorHeightMm,
    innerDepthMm: layout.interiorDepthMm, sourceModuleIds: modules.map(m => m.id),
    scaleX: 1, scaleY: 1, noHiddenModuleScaling: true};
}
