import type { SemanticObject } from "@/types/semantic-map";
import type { FixedCameraView, Floor, FloorId, HouseOutdoor, HouseRoom, HouseStructure, MmPoint, RoomTourView, TourNodeType } from "@/types/space";

type TourWorkspaceInput = {
  floors: Floor[];
  houseStructuresByFloor: Record<FloorId, HouseStructure>;
  semanticObjects: SemanticObject[];
  cameraViews: FixedCameraView[];
  roomTourViews?: RoomTourView[];
};

type SpaceSource = {
  id: string;
  floorId: FloorId;
  name: string;
  points: MmPoint[];
  kind: "room" | "outdoor";
};

const MM_TO_M = 1 / 1000;
const OVERVIEW_SUFFIX = "floor-overview";

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[\s/·（）()_-]|b\d|\d+f|yard|楼层|编辑底盘|入户庭院|生活庭院/g, "");
}

function getSpaceCenter(points: MmPoint[], structure: HouseStructure) {
  const width = structure.coordinateSystem?.width || 12000;
  const height = structure.coordinateSystem?.height || 9000;
  if (!points.length) return { x: 0, z: 0, spanX: width * MM_TO_M, spanZ: height * MM_TO_M };
  const bounds = points.reduce((result, point) => ({
    minX: Math.min(result.minX, point.x),
    maxX: Math.max(result.maxX, point.x),
    minY: Math.min(result.minY, point.y),
    maxY: Math.max(result.maxY, point.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  return {
    x: ((bounds.minX + bounds.maxX) / 2 - width / 2) * MM_TO_M,
    z: ((bounds.minY + bounds.maxY) / 2 - height / 2) * MM_TO_M,
    spanX: Math.max(0.8, (bounds.maxX - bounds.minX) * MM_TO_M),
    spanZ: Math.max(0.8, (bounds.maxY - bounds.minY) * MM_TO_M)
  };
}

function typeForSpace(source: SpaceSource): TourNodeType {
  if (source.kind === "outdoor") return "yard";
  if (/走廊|过道/.test(source.name)) return "corridor";
  if (/楼梯/.test(source.name)) return "stair";
  return "room";
}

function semanticNameForSpace(source: SpaceSource, semanticObjects: SemanticObject[]) {
  const semantic = semanticObjects.find((item) => {
    if (item.floorId !== source.floorId || item.category !== "Room") return false;
    const details = item.details as Record<string, unknown>;
    return details.structureRoomId === source.id || details.roomId === source.id || (Array.isArray(details.structureRoomIds) && details.structureRoomIds.includes(source.id));
  });
  if (semantic?.name) return semantic.name;
  if (source.kind === "outdoor" && source.name.includes("南院")) return "南院";
  if (source.kind === "outdoor" && source.name.includes("北院")) return "北院";
  return source.name;
}

function cameraForSpace(source: SpaceSource, cameraViews: FixedCameraView[]) {
  const sourceName = normalizeName(source.name);
  return cameraViews.find((view) => {
    if (view.floor !== source.floorId) return false;
    const viewName = normalizeName(view.name);
    return Boolean(sourceName && viewName && (sourceName.includes(viewName) || viewName.includes(sourceName)));
  });
}

function angles(cameraPosition: RoomTourView["cameraPosition"], target: RoomTourView["target"]) {
  const dx = target.x - cameraPosition.x;
  const dy = target.y - cameraPosition.y;
  const dz = target.z - cameraPosition.z;
  const horizontal = Math.max(0.0001, Math.hypot(dx, dz));
  return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, horizontal) };
}

function createSpaceNode(source: SpaceSource, structure: HouseStructure, semanticObjects: SemanticObject[], cameraViews: FixedCameraView[]): RoomTourView {
  const center = getSpaceCenter(source.points, structure);
  const cameraView = cameraForSpace(source, cameraViews);
  const preferredDirection = cameraView
    ? { x: cameraView.target.x - cameraView.cameraPosition.x, z: cameraView.target.z - cameraView.cameraPosition.z }
    : center.spanX >= center.spanZ ? { x: 1, z: 0.22 } : { x: 0.22, z: 1 };
  const directionLength = Math.max(0.001, Math.hypot(preferredDirection.x, preferredDirection.z));
  const direction = { x: preferredDirection.x / directionLength, z: preferredDirection.z / directionLength };
  const eyeHeight = source.kind === "outdoor" ? 1.55 : 1.42;
  const lookDistance = Math.min(2.8, Math.max(1.5, Math.min(center.spanX, center.spanZ) * 0.6));
  // Saved camera views are authored compositions. Re-centering them inside the
  // room loses the subject and raises furniture to the bottom edge of the frame.
  const cameraPosition = cameraView?.cameraPosition ?? { x: center.x - direction.x * 0.32, y: eyeHeight, z: center.z - direction.z * 0.32 };
  const target = cameraView?.target ?? { x: cameraPosition.x + direction.x * lookDistance, y: eyeHeight - 0.08, z: cameraPosition.z + direction.z * lookDistance };
  const rotation = angles(cameraPosition, target);
  return {
    id: `tour-${source.floorId}-${source.id}`,
    floorId: source.floorId,
    ...(source.kind === "room" ? { roomId: source.id } : { outdoorId: source.id }),
    name: semanticNameForSpace(source, semanticObjects),
    type: typeForSpace(source),
    cameraPosition,
    target,
    yaw: rotation.yaw,
    pitch: rotation.pitch,
    fov: 58,
    zoom: cameraView?.zoom,
    linkedNodeIds: [],
    description: cameraView?.description || `${source.name}室内展示视角`,
    status: "active",
    sourceCameraViewId: cameraView?.id
  };
}

function createOverviewNode(floor: Floor, structure: HouseStructure, cameraViews: FixedCameraView[]): RoomTourView {
  const width = (structure.coordinateSystem?.width || 12000) * MM_TO_M;
  const depth = (structure.coordinateSystem?.height || 9000) * MM_TO_M;
  const preferred = cameraViews.find((view) => view.floor === floor.id && (view.targetArea === "all" || /总览|全院/.test(view.name)));
  const target = preferred?.target ?? { x: 0, y: 0.4, z: 0 };
  const cameraPosition = preferred?.cameraPosition ?? { x: -width * 0.58, y: Math.max(5.8, Math.max(width, depth) * 0.7), z: depth * 0.62 };
  const rotation = angles(cameraPosition, target);
  return {
    id: `tour-${floor.id}-${OVERVIEW_SUFFIX}`,
    floorId: floor.id,
    name: floor.id === "YARD" ? "全院" : `${floor.id} 楼层总览`,
    type: "viewpoint",
    cameraPosition,
    target,
    yaw: rotation.yaw,
    pitch: rotation.pitch,
    fov: 48,
    zoom: preferred?.zoom,
    linkedNodeIds: [],
    description: preferred?.description || `${floor.label}可漫游空间总览`,
    status: "active",
    sourceCameraViewId: preferred?.id,
    isFloorOverview: true
  };
}

function createCameraViewpoint(view: FixedCameraView, structure: HouseStructure, sources: SpaceSource[]): RoomTourView {
  const isStairInspection = view.id.startsWith("stair-view-");
  const cameraPosition = view.cameraPosition;
  const target = view.target;
  const rotation = angles(cameraPosition, target);
  const nearestSource = sources
    .map((source) => ({ source, center: getSpaceCenter(source.points, structure) }))
    .sort((a, b) => Math.hypot(a.center.x - view.target.x, a.center.z - view.target.z) - Math.hypot(b.center.x - view.target.x, b.center.z - view.target.z))[0]?.source;
  const name = view.name.replace(new RegExp(`^${view.floor}\\s*`), "").replace(/^1F\s*/, "");
  return {
    id: `tour-camera-${view.id}`,
    floorId: view.floor,
    ...(nearestSource?.kind === "room" ? { roomId: nearestSource.id } : nearestSource ? { outdoorId: nearestSource.id } : {}),
    name: view.targetArea === "entryYard" ? "北院入户区" : view.targetArea === "southLiving" ? "南院生活区" : name,
    type: view.floor === "YARD" ? "yard" : /走廊/.test(view.name) ? "corridor" : /楼梯/.test(view.name) ? "stair" : "viewpoint",
    cameraPosition,
    target,
    yaw: rotation.yaw,
    pitch: rotation.pitch,
    fov: isStairInspection ? 46 : 58,
    zoom: view.zoom,
    linkedNodeIds: [],
    description: view.description || view.name,
    status: "active",
    sourceCameraViewId: view.id,
    targetArea: view.targetArea
  };
}

function distance(a: RoomTourView, b: RoomTourView) {
  return Math.hypot(a.cameraPosition.x - b.cameraPosition.x, a.cameraPosition.z - b.cameraPosition.z);
}

function withLinks(nodes: RoomTourView[]) {
  return nodes.map((node) => {
    const floorNodes = nodes.filter((candidate) => candidate.floorId === node.floorId && candidate.id !== node.id && candidate.status === "active");
    const overview = floorNodes.find((candidate) => candidate.isFloorOverview);
    const nearest = floorNodes.filter((candidate) => !candidate.isFloorOverview).sort((a, b) => distance(node, a) - distance(node, b)).slice(0, node.isFloorOverview ? 5 : 3);
    return { ...node, linkedNodeIds: Array.from(new Set([...(overview ? [overview.id] : []), ...nearest.map((item) => item.id), ...node.linkedNodeIds])) };
  });
}

/** Derives stable tour nodes without mutating workspace data. Persisted nodes are optional overrides. */
export function deriveRoomTourViews(input: TourWorkspaceInput): RoomTourView[] {
  const sourcesByFloor = new Map<FloorId, SpaceSource[]>();
  const generated = input.floors.flatMap((floor) => {
    const structure = input.houseStructuresByFloor[floor.id];
    if (!structure) return [];
    const sources: SpaceSource[] = [
      ...structure.rooms.map((room: HouseRoom) => ({ id: room.id, floorId: floor.id, name: room.name, points: room.boundary, kind: "room" as const })),
      ...structure.outdoors.map((outdoor: HouseOutdoor) => ({ id: outdoor.id, floorId: floor.id, name: outdoor.name, points: outdoor.polygon, kind: "outdoor" as const }))
    ];
    sourcesByFloor.set(floor.id, sources);
    return [createOverviewNode(floor, structure, input.cameraViews), ...sources.map((source) => createSpaceNode(source, structure, input.semanticObjects, input.cameraViews))];
  });
  const usedCameraViewIds = new Set(generated.map((node) => node.sourceCameraViewId).filter((id): id is string => Boolean(id)));
  const cameraViewpoints = input.cameraViews
    .filter((view) => !usedCameraViewIds.has(view.id))
    .map((view) => createCameraViewpoint(view, input.houseStructuresByFloor[view.floor], sourcesByFloor.get(view.floor) ?? []));
  const overrides = new Map((input.roomTourViews ?? []).map((node) => [node.id, node]));
  const merged = [...generated, ...cameraViewpoints].map((node) => ({ ...node, ...overrides.get(node.id) }));
  const extraOverrides = (input.roomTourViews ?? []).filter((node) => !merged.some((candidate) => candidate.id === node.id));
  return withLinks([...merged, ...extraOverrides]).filter((node) => node.status !== "disabled");
}

export function tourNodeToCameraView(node: RoomTourView): FixedCameraView {
  return {
    id: node.id,
    name: node.name,
    floor: node.floorId,
    cameraPosition: node.cameraPosition,
    target: node.target,
    zoom: node.zoom,
    mode: "perspective",
    description: node.description,
    scope: node.type === "yard" ? "courtyard" : "floor",
    targetArea: node.targetArea
  };
}
