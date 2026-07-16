import type {
  FloorId,
  Furniture,
  HouseStair,
  HouseStructure,
  MmPoint,
  StairFlightRole,
  StairLanding,
  StairOpening,
  StairSystem
} from "@/types/space";

export const STAIR_FLOOR_TO_FLOOR_HEIGHT_MM = 2800;
export const STAIR_TOTAL_STEP_COUNT = 20;
export const STAIR_FLIGHT_STEP_COUNT = 10;
export const STAIR_FLIGHT_RISE_MM = STAIR_FLOOR_TO_FLOOR_HEIGHT_MM / 2;
export const STAIR_RISER_HEIGHT_MM = STAIR_FLOOR_TO_FLOOR_HEIGHT_MM / STAIR_TOTAL_STEP_COUNT;

type StairPairDefinition = {
  id: string;
  lowerFloorId: FloorId;
  upperFloorId: FloorId;
  lowerFlightId: string;
  upperFlightId: string;
};

const managedPairs: StairPairDefinition[] = [
  { id: "STAIR-SYS-B2-B1", lowerFloorId: "B2", upperFloorId: "B1", lowerFlightId: "ST-B2-001", upperFlightId: "ST-B1-002" },
  { id: "STAIR-SYS-B1-1F", lowerFloorId: "B1", upperFloorId: "1F", lowerFlightId: "ST-B1-001", upperFlightId: "ST-1F-002" },
  { id: "STAIR-SYS-1F-2F", lowerFloorId: "1F", upperFloorId: "2F", lowerFlightId: "ST-1F-001", upperFlightId: "ST-2F-001" }
];

export type StairInfrastructure = {
  stairSystems: StairSystem[];
  stairLandings: StairLanding[];
  stairOpenings: StairOpening[];
};

export type StairFlightRecord = {
  stair: HouseStair;
  structure: HouseStructure;
};

export type StairSystemValidationIssue = {
  severity: "warning";
  code: string;
  stairSystemId?: string;
  floorId: FloorId;
  objectId: string;
  message: string;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function roundPoint(point: MmPoint): MmPoint {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

function lineLength(start: MmPoint, end: MmPoint) {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function getFlight(structuresByFloor: Partial<Record<FloorId, HouseStructure>>, id: string): StairFlightRecord | null {
  for (const structure of Object.values(structuresByFloor)) {
    if (!structure) continue;
    const stair = structure.stairs.find((candidate) => candidate.id === id);
    if (stair) return { stair, structure };
  }
  return null;
}

export function getStairFlightIndex(structuresByFloor: Partial<Record<FloorId, HouseStructure>>) {
  const index = new Map<string, StairFlightRecord>();
  Object.values(structuresByFloor).forEach((structure) => structure?.stairs.forEach((stair) => index.set(stair.id, { stair, structure })));
  return index;
}

export function getStairSystemGeometryFingerprint(system: Pick<StairSystem, "id" | "lowerFlightId" | "upperFlightId" | "floorToFloorHeightMm" | "totalStepCount">, structuresByFloor: Partial<Record<FloorId, HouseStructure>>) {
  const index = getStairFlightIndex(structuresByFloor);
  const values = [system.lowerFlightId, system.upperFlightId].map((id) => {
    const stair = index.get(id)?.stair;
    return stair ? [stair.id, stair.floorId, stair.start.x, stair.start.y, stair.end.x, stair.end.y, stair.width, stair.height, stair.stepCount] : [id, "missing"];
  });
  return JSON.stringify([system.id, system.floorToFloorHeightMm, system.totalStepCount, values]);
}

function landingFromPair(pair: StairPairDefinition, lower: HouseStair, upper: HouseStair): StairLanding {
  const runLength = Math.max(1, lineLength(lower.start, lower.end));
  const runUnit = { x: (lower.end.x - lower.start.x) / runLength, y: (lower.end.y - lower.start.y) / runLength };
  const laneLength = Math.max(1, lineLength(lower.end, upper.end));
  const laneUnit = { x: (upper.end.x - lower.end.x) / laneLength, y: (upper.end.y - lower.end.y) / laneLength };
  const halfWidth = Math.min(lower.width, upper.width) / 2;
  const depth = Math.max(Math.min(lower.width, upper.width), 900);
  const firstOuter = roundPoint({ x: lower.end.x - laneUnit.x * halfWidth, y: lower.end.y - laneUnit.y * halfWidth });
  const secondOuter = roundPoint({ x: upper.end.x + laneUnit.x * halfWidth, y: upper.end.y + laneUnit.y * halfWidth });
  return {
    id: `LANDING-${pair.lowerFloorId}-${pair.upperFloorId}`,
    stairSystemId: pair.id,
    lowerFloorId: pair.lowerFloorId,
    upperFloorId: pair.upperFloorId,
    polygon: [
      firstOuter,
      secondOuter,
      roundPoint({ x: secondOuter.x - runUnit.x * depth, y: secondOuter.y - runUnit.y * depth }),
      roundPoint({ x: firstOuter.x - runUnit.x * depth, y: firstOuter.y - runUnit.y * depth })
    ],
    centerLine: { start: clone(lower.end), end: clone(upper.end) },
    elevationFromLowerFloorMm: STAIR_FLIGHT_RISE_MM,
    width: Math.round(laneLength + halfWidth * 2),
    depth: Math.round(depth),
    supportKind: "wall-bearing",
    status: "confirmed"
  };
}

function openingFromPair(pair: StairPairDefinition, lower: HouseStair, upper: HouseStair): StairOpening {
  const width = Math.min(lower.width, upper.width);
  const all = [lower.start, lower.end, upper.start, upper.end];
  const minX = Math.min(...all.map((point) => point.x));
  const maxX = Math.max(...all.map((point) => point.x));
  const minY = Math.min(...all.map((point) => point.y)) - width / 2;
  const maxY = Math.max(...all.map((point) => point.y)) + width / 2;
  const runAlongX = Math.abs(lower.end.x - lower.start.x) >= Math.abs(lower.end.y - lower.start.y);
  const inset = 30;
  const accessSetback = Math.min(480, lineLength(lower.start, lower.end) * 0.15);
  const bounds = runAlongX
    ? {
        minX: Math.round(minX + inset),
        maxX: Math.round(maxX - accessSetback),
        minY: Math.round(minY + inset),
        maxY: Math.round(maxY - inset)
      }
    : {
        minX: Math.round(minX - width / 2 + inset),
        maxX: Math.round(maxX + width / 2 - inset),
        minY: Math.round(minY + width / 2 + accessSetback),
        maxY: Math.round(maxY - width / 2 - inset)
      };
  const polygon = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY }
  ];
  return {
    id: `OPENING-${pair.lowerFloorId}-${pair.upperFloorId}`,
    stairSystemId: pair.id,
    floorId: pair.upperFloorId,
    polygon,
    guardEdges: runAlongX ? [
      { id: `GUARD-${pair.lowerFloorId}-${pair.upperFloorId}-A`, start: polygon[0], end: polygon[1], kind: "glass-railing" },
      { id: `GUARD-${pair.lowerFloorId}-${pair.upperFloorId}-B`, start: polygon[3], end: polygon[2], kind: "glass-railing" }
    ] : [
      { id: `GUARD-${pair.lowerFloorId}-${pair.upperFloorId}-A`, start: polygon[0], end: polygon[3], kind: "glass-railing" },
      { id: `GUARD-${pair.lowerFloorId}-${pair.upperFloorId}-B`, start: polygon[1], end: polygon[2], kind: "glass-railing" }
    ],
    clearAccessFlightIds: [pair.lowerFlightId, pair.upperFlightId],
    status: "confirmed"
  };
}

export function buildManagedStairInfrastructure(structuresByFloor: Partial<Record<FloorId, HouseStructure>>): StairInfrastructure {
  const stairLandings: StairLanding[] = [];
  const stairOpenings: StairOpening[] = [];
  const stairSystems: StairSystem[] = [];
  managedPairs.forEach((pair) => {
    const lower = getFlight(structuresByFloor, pair.lowerFlightId)?.stair;
    const upper = getFlight(structuresByFloor, pair.upperFlightId)?.stair;
    if (!lower || !upper) return;
    const landing = landingFromPair(pair, lower, upper);
    const opening = openingFromPair(pair, lower, upper);
    const core = {
      id: pair.id,
      lowerFloorId: pair.lowerFloorId,
      upperFloorId: pair.upperFloorId,
      orientationRule: "left-down-right-up" as const,
      lowerFlightId: pair.lowerFlightId,
      upperFlightId: pair.upperFlightId,
      landingId: landing.id,
      openingId: opening.id,
      floorToFloorHeightMm: STAIR_FLOOR_TO_FLOOR_HEIGHT_MM,
      totalStepCount: STAIR_TOTAL_STEP_COUNT
    };
    const geometryFingerprint = getStairSystemGeometryFingerprint(core, structuresByFloor);
    stairSystems.push({
      ...core,
      lighting: {
        controlGroupId: `CG-${pair.id}`,
        lowerSwitchFloorId: pair.lowerFloorId,
        upperSwitchFloorId: pair.upperFloorId,
        stepLightMode: "every-step",
        stepLightHeightAboveTreadMm: 250,
        landingLightId: `LIGHT-${landing.id}`,
        geometryFingerprint,
        syncStatus: "synchronized"
      },
      status: "confirmed"
    });
    stairLandings.push(landing);
    stairOpenings.push(opening);
  });
  return { stairSystems, stairLandings, stairOpenings };
}

export function normalizeManagedStairFlights(structuresByFloor: Record<FloorId, HouseStructure>) {
  const next = clone(structuresByFloor);
  const topArrival = next["2F"]?.stairs.find((stair) => stair.id === "ST-2F-001");
  if (topArrival) {
    const laneOffset = topArrival.width;
    topArrival.start = { ...topArrival.start, y: 3575 + laneOffset };
    topArrival.end = { ...topArrival.end, y: 3575 + laneOffset };
    topArrival.name = "2F 下行至 1F 梯段";
    topArrival.direction = "down";
  }
  const infrastructure = buildManagedStairInfrastructure(next);
  const systemByFlightId = new Map<string, { system: StairSystem; role: StairFlightRole }>();
  infrastructure.stairSystems.forEach((system) => {
    systemByFlightId.set(system.lowerFlightId, { system, role: "lower-flight" });
    systemByFlightId.set(system.upperFlightId, { system, role: "upper-flight" });
  });
  Object.values(next).forEach((structure) => {
    structure.stairs = structure.stairs.map((stair) => {
      const binding = systemByFlightId.get(stair.id);
      if (!binding) return stair;
      const isLower = binding.role === "lower-flight";
      return {
        ...stair,
        baseHeight: 0,
        height: STAIR_FLIGHT_RISE_MM,
        stepCount: STAIR_FLIGHT_STEP_COUNT,
        stairSystemId: binding.system.id,
        flightRole: binding.role,
        connectedFromFloorId: isLower ? binding.system.lowerFloorId : binding.system.upperFloorId,
        connectedToFloorId: isLower ? binding.system.upperFloorId : binding.system.lowerFloorId,
        landingId: binding.system.landingId
      };
    });
  });
  return { structuresByFloor: next, infrastructure: buildManagedStairInfrastructure(next) };
}

export function getFlightLocalEndpointHeights(stair: HouseStair) {
  const floorHeight = (stair.baseHeight ?? 0);
  const rise = stair.height;
  if (stair.flightRole === "lower-flight") return { startHeightMm: floorHeight, endHeightMm: floorHeight + rise };
  if (stair.flightRole === "upper-flight") return { startHeightMm: floorHeight, endHeightMm: floorHeight - rise };
  return stair.direction === "down"
    ? { startHeightMm: floorHeight, endHeightMm: floorHeight - rise }
    : { startHeightMm: floorHeight, endHeightMm: floorHeight + rise };
}

export function getSystemElevationOffsetMm(system: StairSystem, currentFloorId: FloorId, sourceFloorId: FloorId) {
  if (sourceFloorId === currentFloorId) return 0;
  if (currentFloorId === system.lowerFloorId && sourceFloorId === system.upperFloorId) return system.floorToFloorHeightMm;
  if (currentFloorId === system.upperFloorId && sourceFloorId === system.lowerFloorId) return -system.floorToFloorHeightMm;
  return 0;
}

function pointInPolygon(point: MmPoint, polygon: MmPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1) + a.x) inside = !inside;
  }
  return inside;
}

function midpoint(start: MmPoint, end: MmPoint): MmPoint {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

function pointToSegmentDistance(point: MmPoint, start: MmPoint, end: MmPoint) {
  const lengthSquared = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
  if (lengthSquared <= 0) return lineLength(point, start);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / lengthSquared));
  return lineLength(point, { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t });
}

function furnitureCenterMm(item: Furniture, structure: HouseStructure): MmPoint {
  return {
    x: structure.coordinateSystem.origin.x + item.position.x / 100 * structure.coordinateSystem.width,
    y: structure.coordinateSystem.origin.y + item.position.y / 100 * structure.coordinateSystem.height
  };
}

export function validateStairSystems(input: {
  structuresByFloor: Partial<Record<FloorId, HouseStructure>>;
  stairSystems: StairSystem[];
  stairLandings: StairLanding[];
  stairOpenings: StairOpening[];
  furniture?: Furniture[];
}): StairSystemValidationIssue[] {
  const issues: StairSystemValidationIssue[] = [];
  const index = getStairFlightIndex(input.structuresByFloor);
  const systemById = new Map(input.stairSystems.map((system) => [system.id, system]));
  const landingById = new Map(input.stairLandings.map((landing) => [landing.id, landing]));
  const openingById = new Map(input.stairOpenings.map((opening) => [opening.id, opening]));
  const warn = (floorId: FloorId, objectId: string, code: string, message: string, stairSystemId?: string) => issues.push({ severity: "warning", floorId, objectId, code, message, stairSystemId });

  (["B1", "1F"] as FloorId[]).forEach((floorId) => {
    const stairs = input.structuresByFloor[floorId]?.stairs ?? [];
    if (!stairs.some((stair) => stair.direction === "up") || !stairs.some((stair) => stair.direction === "down")) {
      warn(floorId, floorId, "MISSING_INTERMEDIATE_DIRECTION", `${floorId} 必须同时保留真实上行和下行梯段。`);
    }
  });
  Object.values(input.structuresByFloor).forEach((structure) => structure?.stairs.forEach((stair) => {
    if (!stair.stairSystemId || !systemById.has(stair.stairSystemId)) warn(stair.floorId, stair.id, "ORPHAN_FLIGHT", `梯段 ${stair.id} 未属于有效 stairSystem。`);
  }));

  input.stairSystems.forEach((system) => {
    const lower = index.get(system.lowerFlightId)?.stair;
    const upper = index.get(system.upperFlightId)?.stair;
    if (!lower || !upper) {
      warn(system.lowerFloorId, system.id, "MISSING_FLIGHT", `楼梯系统 ${system.id} 缺少 lower-flight 或 upper-flight。`, system.id);
      return;
    }
    if (lower.stepCount !== STAIR_FLIGHT_STEP_COUNT || upper.stepCount !== STAIR_FLIGHT_STEP_COUNT || system.totalStepCount !== STAIR_TOTAL_STEP_COUNT) {
      warn(system.lowerFloorId, system.id, "INVALID_STEP_COUNT", `${system.id} 必须正好为 10 + 10 级。`, system.id);
    }
    if (system.floorToFloorHeightMm !== STAIR_FLOOR_TO_FLOOR_HEIGHT_MM || lower.height !== STAIR_FLIGHT_RISE_MM || upper.height !== STAIR_FLIGHT_RISE_MM) {
      warn(system.lowerFloorId, system.id, "INVALID_FLIGHT_RISE", `${system.id} 每跑高差必须为 ${STAIR_FLIGHT_RISE_MM} mm，踏步高 ${STAIR_RISER_HEIGHT_MM} mm。`, system.id);
    }
    if (lower.flightRole !== "lower-flight" || upper.flightRole !== "upper-flight" || lower.floorId !== system.lowerFloorId || upper.floorId !== system.upperFloorId || lower.connectedToFloorId !== system.upperFloorId || upper.connectedToFloorId !== system.lowerFloorId) {
      warn(system.lowerFloorId, system.id, "INVALID_FLIGHT_BINDING", `${system.id} 的梯段角色或跨层起终点不一致。`, system.id);
    }
    const lowerLength = lineLength(lower.start, lower.end);
    const upperLength = lineLength(upper.start, upper.end);
    const lowerTravel = { x: (lower.end.x - lower.start.x) / Math.max(1, lowerLength), y: (lower.end.y - lower.start.y) / Math.max(1, lowerLength) };
    const upperTravel = { x: (upper.start.x - upper.end.x) / Math.max(1, upperLength), y: (upper.start.y - upper.end.y) / Math.max(1, upperLength) };
    const travelDot = lowerTravel.x * upperTravel.x + lowerTravel.y * upperTravel.y;
    const laneDistance = pointToSegmentDistance(upper.end, lower.start, lower.end);
    if (travelDot > -0.98 || laneDistance < Math.max(lower.width, upper.width) * 0.95) {
      warn(system.lowerFloorId, system.id, "FLIGHT_GEOMETRY_CONFLICT", `${system.id} 两跑必须平行反向并保留不重叠的梯段间距。`, system.id);
    }
    if (lower.landingId !== system.landingId || upper.landingId !== system.landingId || !landingById.has(system.landingId)) {
      warn(system.lowerFloorId, system.id, "LANDING_MISMATCH", `${system.id} 两跑没有通过同一个明确平台连接。`, system.id);
    }
    const landing = landingById.get(system.landingId);
    if (landing && (landing.polygon.length < 4 || landing.width < Math.max(lower.width, upper.width) || landing.supportKind === undefined)) {
      warn(system.lowerFloorId, landing.id, "UNSUPPORTED_LANDING", `平台 ${landing.id} 尺寸不足或缺少支承关系。`, system.id);
    }
    if (landing && (lineLength(landing.centerLine.start, lower.end) > 5 || lineLength(landing.centerLine.end, upper.end) > 5 || landing.elevationFromLowerFloorMm !== STAIR_FLIGHT_RISE_MM || lowerLength <= landing.depth || upperLength <= landing.depth)) {
      warn(system.lowerFloorId, landing.id, "LANDING_CONNECTION_MISMATCH", `平台 ${landing.id} 未与两跑在同一半层标高连续收口。`, system.id);
    }
    const opening = openingById.get(system.openingId);
    if (!opening) {
      warn(system.upperFloorId, system.openingId, "MISSING_OPENING", `${system.id} 缺少明确楼板洞口。`, system.id);
    } else {
      const nearLanding = (stair: HouseStair) => ({
        x: stair.end.x + (stair.start.x - stair.end.x) * 0.05,
        y: stair.end.y + (stair.start.y - stair.end.y) * 0.05
      });
      const samplePoints = [midpoint(lower.start, lower.end), midpoint(upper.start, upper.end), nearLanding(lower), nearLanding(upper)];
      if (!samplePoints.every((point) => pointInPolygon(point, opening.polygon))) {
        warn(system.upperFloorId, opening.id, "OPENING_TOO_SMALL", `洞口 ${opening.id} 未覆盖两跑的主要穿楼板范围。`, system.id);
      }
      if (opening.floorId !== system.upperFloorId) warn(system.upperFloorId, opening.id, "OPENING_FLOOR_MISMATCH", `洞口 ${opening.id} 未落在系统上层楼板。`, system.id);
      if (![system.lowerFlightId, system.upperFlightId].every((id) => opening.clearAccessFlightIds.includes(id))) {
        warn(system.upperFloorId, opening.id, "OPENING_ACCESS_MISMATCH", `洞口 ${opening.id} 未声明两跑的完整通行口。`, system.id);
      }
      const accessPoints = [lower.start, upper.start];
      if (opening.guardEdges.some((edge) => accessPoints.some((point) => pointToSegmentDistance(point, edge.start, edge.end) < Math.max(lower.width, upper.width) * 0.45))) {
        warn(system.upperFloorId, opening.id, "GUARD_BLOCKS_ACCESS", `洞口 ${opening.id} 的栏杆封堵了梯段入口或出口。`, system.id);
      }
    }
    if (system.lighting.geometryFingerprint !== getStairSystemGeometryFingerprint(system, input.structuresByFloor) || system.lighting.syncStatus !== "synchronized") {
      warn(system.lowerFloorId, system.id, "LIGHTING_RESYNC_REQUIRED", `${system.id} 几何已变化，踏步灯与平台灯需要重新同步。`, system.id);
    }
  });

  const b2 = input.structuresByFloor.B2?.stairs ?? [];
  if (b2.some((stair) => stair.direction === "down" || stair.connectedToFloorId === undefined)) warn("B2", b2.find((stair) => stair.direction === "down")?.id ?? "B2", "FALSE_B2_DOWN", "B2 不得存在继续下行的虚假梯段。");
  const twoFloor = input.structuresByFloor["2F"]?.stairs ?? [];
  if (twoFloor.some((stair) => stair.direction === "up")) warn("2F", twoFloor.find((stair) => stair.direction === "up")?.id ?? "2F", "FALSE_2F_UP", "2F 不得存在通向不存在楼层的虚假上行梯段。");

  (input.furniture ?? []).forEach((item) => {
    const structure = input.structuresByFloor[item.floorId];
    if (!structure) return;
    const center = furnitureCenterMm(item, structure);
    const stair = structure.stairs.find((candidate) => {
      const length = lineLength(candidate.start, candidate.end);
      if (length <= 0) return false;
      const t = Math.max(0, Math.min(1, ((center.x - candidate.start.x) * (candidate.end.x - candidate.start.x) + (center.y - candidate.start.y) * (candidate.end.y - candidate.start.y)) / (length * length)));
      const closest = { x: candidate.start.x + (candidate.end.x - candidate.start.x) * t, y: candidate.start.y + (candidate.end.y - candidate.start.y) * t };
      return lineLength(center, closest) < candidate.width / 2 + Math.max(item.dimensions.width, item.dimensions.depth) * 5;
    });
    if (stair) warn(item.floorId, item.id, "FURNITURE_IN_STAIR_CLEARANCE", `家具 ${item.id} 侵入梯段 ${stair.id} 的踏步或净空范围。`, stair.stairSystemId);
  });
  return issues;
}
