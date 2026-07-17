import type { Drawing3DWallMode } from "./drawing-3d-profiles";
import type { Furniture, HouseRoom, HouseStructure, HouseWall } from "../types/space";
import type { ValidationFinding } from "./validation-rules";

export const DEFAULT_STORY_HEIGHT_MM = 2800;
export const DEFAULT_CABINET_TOP_CLOSURE_MM = 50;
export const WALL_CUT_RATIO = 0.42;

export type SceneFurnitureContext = "workspace3d" | "overview3d" | "exploration";

export type FurnitureBoundsMm = {
  width: number;
  depth: number;
  height: number;
  bottom: number;
  top: number;
};

export function resolveStructureStoryHeightMm(structure: HouseStructure) {
  if (structure.storyHeightMm && structure.storyHeightMm > 0) return structure.storyHeightMm;
  const heights = structure.walls
    .filter((wall) => wall.barrierType !== "railing" && wall.height > 0)
    .map((wall) => Math.round(wall.height));
  if (!heights.length) return DEFAULT_STORY_HEIGHT_MM;
  const counts = new Map<number, number>();
  heights.forEach((height) => counts.set(height, (counts.get(height) ?? 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}

export function resolveRoomFinishedCeilingHeightMm(room: HouseRoom | undefined, structure: HouseStructure) {
  return room?.finishedCeilingHeightMm && room.finishedCeilingHeightMm > 0
    ? room.finishedCeilingHeightMm
    : resolveStructureStoryHeightMm(structure);
}

export function inferCabinetHeightKind(item: Furniture): NonNullable<Furniture["cabinetHeight"]>["kind"] | null {
  if (item.cabinetHeight?.kind) return item.cabinetHeight.kind;
  const kitchenKind = item.render3d?.kitchenVisual?.cabinetKind;
  if (kitchenKind === "base" || kitchenKind === "wall" || kitchenKind === "tall") return kitchenKind;
  if (item.moduleType === "wardrobe" || /通顶|到顶/.test(`${item.name} ${item.constructionMeta?.ceilingDependency ?? ""}`)) return "fullHeight";
  if (item.moduleType === "tallCabinet") return "tall";
  if (item.moduleType === "sideboard" || item.moduleType === "snackCabinet") return "halfHeight";
  if (item.moduleType === "kitchenCabinet" || item.moduleType === "cabinet") return "base";
  return null;
}

export function synchronizeFurnitureHeight(item: Furniture, structure: HouseStructure): Furniture {
  const kind = inferCabinetHeightKind(item);
  if (!kind) return item;
  const room = structure.rooms.find((candidate) => candidate.id === item.roomId);
  if (kind !== "fullHeight") {
    return item.cabinetHeight?.kind === kind ? item : { ...item, cabinetHeight: { ...item.cabinetHeight, kind, source: item.cabinetHeight?.source ?? "inferred" } };
  }
  const topClosureMm = Math.max(0, item.cabinetHeight?.topClosureMm ?? DEFAULT_CABINET_TOP_CLOSURE_MM);
  const elevationMm = Math.max(0, item.render3d?.elevationMm ?? 0);
  const heightMm = Math.max(1, resolveRoomFinishedCeilingHeightMm(room, structure) - topClosureMm - elevationMm);
  const heightCm = heightMm / 10;
  if (item.dimensions.height === heightCm && item.cabinetHeight?.kind === kind && item.cabinetHeight.topClosureMm === topClosureMm) return item;
  return {
    ...item,
    dimensions: { ...item.dimensions, height: heightCm },
    cabinetHeight: { kind, topClosureMm, source: room?.finishedCeilingHeightMm ? "roomCeiling" : "storyHeight" }
  };
}

export function synchronizeFurnitureHeights(items: Furniture[], structures: Record<string, HouseStructure>) {
  return items.map((item) => {
    const structure = structures[item.floorId] ?? structures["1F"];
    return structure ? synchronizeFurnitureHeight(item, structure) : item;
  });
}

export function getFurnitureBoundsMm(item: Furniture, _context: SceneFurnitureContext, _wallMode: Drawing3DWallMode): FurnitureBoundsMm {
  const elevation = Math.max(0, item.render3d?.elevationMm ?? 0);
  return {
    width: item.dimensions.width * 10,
    depth: item.dimensions.depth * 10,
    height: item.dimensions.height * 10,
    bottom: elevation,
    top: elevation + item.dimensions.height * 10
  };
}

export function isExteriorWall(wall: HouseWall, structure: HouseStructure) {
  return structure.rooms.filter((room) => room.sourceWallIds.includes(wall.id)).length <= 1;
}

export function getWallRenderPolicy(wall: HouseWall, structure: HouseStructure, mode: Drawing3DWallMode) {
  const exterior = isExteriorWall(wall, structure);
  return {
    visible: !(mode === "exteriorHidden" && exterior),
    opacity: mode === "exteriorTransparent" && exterior ? 0.18 : undefined,
    clipHeightMm: mode === "cutaway" ? resolveStructureStoryHeightMm(structure) * WALL_CUT_RATIO : null,
    sourceHeightMm: wall.height
  };
}

function boundsEqual(left: FurnitureBoundsMm, right: FurnitureBoundsMm) {
  return Object.keys(left).every((key) => Math.abs(left[key as keyof FurnitureBoundsMm] - right[key as keyof FurnitureBoundsMm]) < 0.01);
}

export function validateSceneHeightSystem(structure: HouseStructure, furniture: Furniture[]): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const storyHeight = resolveStructureStoryHeightMm(structure);
  structure.walls.filter((wall) => wall.barrierType !== "railing").forEach((wall) => {
    if (Math.abs(wall.height - storyHeight) > 5) findings.push({ ruleId: "WALL_STORY_HEIGHT", severity: "warning", category: "geometry", title: "墙高与层高不一致", message: `${wall.name} 真实墙高 ${wall.height}mm，与楼层层高 ${storyHeight}mm 不一致。`, floorId: structure.floorId, objectId: wall.id, actualValue: `${wall.height}mm`, requiredValue: `${storyHeight}mm` });
  });
  furniture.filter((item) => item.floorId === structure.floorId).forEach((item) => {
    const room = structure.rooms.find((candidate) => candidate.id === item.roomId);
    const ceiling = resolveRoomFinishedCeilingHeightMm(room, structure);
    const bounds = getFurnitureBoundsMm(item, "workspace3d", "full");
    const kind = inferCabinetHeightKind(item);
    if (kind === "fullHeight") {
      const closure = item.cabinetHeight?.topClosureMm ?? DEFAULT_CABINET_TOP_CLOSURE_MM;
      if (Math.abs(bounds.top - (ceiling - closure)) > 5) findings.push({ ruleId: "FULL_HEIGHT_CABINET_CEILING", severity: "error", category: "geometry", title: "通顶柜未绑定完成天花", message: `${item.name} 顶部应为完成天花 ${ceiling}mm 减收口 ${closure}mm。`, floorId: item.floorId, roomId: item.roomId, objectId: item.id, actualValue: `${bounds.top}mm`, requiredValue: `${ceiling - closure}mm` });
    }
    if (bounds.top > ceiling + 1) findings.push({ ruleId: "CABINET_CEILING_PENETRATION", severity: "error", category: "geometry", title: "柜体穿出完成天花", message: `${item.name} 顶部 ${bounds.top}mm，高于完成天花 ${ceiling}mm。`, floorId: item.floorId, roomId: item.roomId, objectId: item.id, actualValue: `${bounds.top}mm`, requiredValue: `≤ ${ceiling}mm` });
    const overview = getFurnitureBoundsMm(item, "overview3d", "exteriorTransparent");
    if (!boundsEqual(bounds, overview)) findings.push({ ruleId: "FURNITURE_SCENE_BOUNDS", severity: "error", category: "geometry", title: "家具跨视图尺寸不一致", message: `${item.name} 在工作区与总平面 3D 的包围盒不同。`, floorId: item.floorId, objectId: item.id });
    (["full", "cutaway", "exteriorHidden", "exteriorTransparent"] as Drawing3DWallMode[]).forEach((mode) => {
      if (!boundsEqual(bounds, getFurnitureBoundsMm(item, "overview3d", mode))) findings.push({ ruleId: "WALL_MODE_FURNITURE_INVARIANCE", severity: "error", category: "geometry", title: "墙体模式改变了家具尺寸", message: `${item.name} 在 ${mode} 模式下包围盒发生变化。`, floorId: item.floorId, objectId: item.id });
    });
  });
  return findings;
}
