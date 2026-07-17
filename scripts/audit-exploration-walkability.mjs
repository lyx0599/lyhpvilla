import { readFile } from "node:fs/promises";
import {
  buildExplorationCollisionWorld,
  createExplorationDoorStates,
  EXPLORATION_CHARACTER_RADIUS,
  explorationScenePoint,
  getConnectedStairArrival,
  isExplorationPositionSafe,
  resolveExplorationSpawn
} from "../lib/exploration-mode.ts";

const GRID_STEP = 0.1;
const CHARACTER_RADIUS = EXPLORATION_CHARACTER_RADIUS;
const STAIR_HANDOFF_T = 0.84;

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const openDoorStates = Object.fromEntries(Object.keys(createExplorationDoorStates(workspace.houseStructuresByFloor))
  .map((doorId) => [doorId, { open: true, currentAngle: 1 }]));

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index];
    const b = polygon[previous];
    if ((a.z > point.z) !== (b.z > point.z)
      && point.x < ((b.x - a.x) * (point.z - a.z)) / ((b.z - a.z) || 0.0001) + a.x) inside = !inside;
  }
  return inside;
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared <= 0.000001
    ? 0
    : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
  const closest = { x: start.x + dx * t, z: start.z + dz * t };
  return { distance: Math.hypot(point.x - closest.x, point.z - closest.z), closest };
}

function segmentIntersection(a, b, c, d) {
  const denominator = (b.x - a.x) * (d.z - c.z) - (b.z - a.z) * (d.x - c.x);
  if (Math.abs(denominator) < 0.000001) return null;
  const t = ((c.x - a.x) * (d.z - c.z) - (c.z - a.z) * (d.x - c.x)) / denominator;
  const u = ((c.x - a.x) * (b.z - a.z) - (c.z - a.z) * (b.x - a.x)) / denominator;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + t * (b.x - a.x), z: a.z + t * (b.z - a.z) };
}

function boxCorners(box) {
  const cosine = Math.cos(box.rotation);
  const sine = Math.sin(box.rotation);
  return [
    [-box.halfWidth, -box.halfDepth],
    [box.halfWidth, -box.halfDepth],
    [box.halfWidth, box.halfDepth],
    [-box.halfWidth, box.halfDepth]
  ].map(([x, z]) => ({
    x: box.center.x + x * cosine - z * sine,
    z: box.center.z + x * sine + z * cosine
  }));
}

function polygonEdges(polygon) {
  return polygon.map((start, index) => ({ start, end: polygon[(index + 1) % polygon.length] }));
}

function closestBetweenEdges(leftEdges, rightEdges) {
  let best = { distance: Number.POSITIVE_INFINITY, left: leftEdges[0].start, right: rightEdges[0].start };
  for (const left of leftEdges) {
    for (const right of rightEdges) {
      const intersection = segmentIntersection(left.start, left.end, right.start, right.end);
      if (intersection) return { distance: 0, left: intersection, right: intersection };
      for (const point of [left.start, left.end]) {
        const candidate = distanceToSegment(point, right.start, right.end);
        if (candidate.distance < best.distance) best = { distance: candidate.distance, left: point, right: candidate.closest };
      }
      for (const point of [right.start, right.end]) {
        const candidate = distanceToSegment(point, left.start, left.end);
        if (candidate.distance < best.distance) best = { distance: candidate.distance, left: candidate.closest, right: point };
      }
    }
  }
  return best;
}

function closestBoxToSegment(box, segment) {
  const boxEdges = polygonEdges(boxCorners(box));
  return closestBetweenEdges(boxEdges, [{ start: segment.start, end: segment.end }]);
}

function closestBoxes(left, right) {
  return closestBetweenEdges(polygonEdges(boxCorners(left)), polygonEdges(boxCorners(right)));
}

function buildGrid(structure, world) {
  const width = structure.coordinateSystem?.width ?? 12000;
  const height = structure.coordinateSystem?.height ?? 9000;
  const minX = -width / 2000;
  const minZ = -height / 2000;
  const columns = Math.ceil((width / 1000) / GRID_STEP);
  const rows = Math.ceil((height / 1000) / GRID_STEP);
  const safe = new Uint8Array(columns * rows);
  const labels = new Int32Array(columns * rows);
  labels.fill(-1);
  const pointAt = (column, row) => ({
    x: minX + (column + 0.5) * GRID_STEP,
    z: minZ + (row + 0.5) * GRID_STEP
  });
  const indexAt = (column, row) => row * columns + column;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      safe[indexAt(column, row)] = isExplorationPositionSafe(world, pointAt(column, row), CHARACTER_RADIUS) ? 1 : 0;
    }
  }

  const components = [];
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const seedIndex = indexAt(column, row);
      if (!safe[seedIndex] || labels[seedIndex] !== -1) continue;
      const label = components.length;
      const queue = [seedIndex];
      labels[seedIndex] = label;
      let cursor = 0;
      let cellCount = 0;
      while (cursor < queue.length) {
        const currentIndex = queue[cursor++];
        const currentColumn = currentIndex % columns;
        const currentRow = Math.floor(currentIndex / columns);
        cellCount += 1;
        for (const [dx, dz] of directions) {
          const nextColumn = currentColumn + dx;
          const nextRow = currentRow + dz;
          if (nextColumn < 0 || nextColumn >= columns || nextRow < 0 || nextRow >= rows) continue;
          const nextIndex = indexAt(nextColumn, nextRow);
          if (!safe[nextIndex] || labels[nextIndex] !== -1) continue;
          if (dx !== 0 && dz !== 0) {
            if (!safe[indexAt(currentColumn + dx, currentRow)] || !safe[indexAt(currentColumn, currentRow + dz)]) continue;
          }
          labels[nextIndex] = label;
          queue.push(nextIndex);
        }
      }
      components.push({ label, cellCount });
    }
  }

  function nearestCell(point, maxDistance = 0.48) {
    const centerColumn = Math.floor((point.x - minX) / GRID_STEP);
    const centerRow = Math.floor((point.z - minZ) / GRID_STEP);
    const radius = Math.ceil(maxDistance / GRID_STEP);
    let best = null;
    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const column = centerColumn + dx;
        const row = centerRow + dz;
        if (column < 0 || column >= columns || row < 0 || row >= rows) continue;
        const index = indexAt(column, row);
        if (!safe[index]) continue;
        const candidate = pointAt(column, row);
        const distance = Math.hypot(candidate.x - point.x, candidate.z - point.z);
        if (distance <= maxDistance && (!best || distance < best.distance)) {
          best = { ...candidate, distance, label: labels[index], index };
        }
      }
    }
    return best;
  }

  return { minX, minZ, columns, rows, safe, labels, components, pointAt, indexAt, nearestCell };
}

const floorAnalyses = new Map();
for (const floor of workspace.floors) {
  const structure = workspace.houseStructuresByFloor[floor.id];
  if (!structure) continue;
  const furniture = workspace.furniture.filter((item) => item.floorId === floor.id);
  const world = buildExplorationCollisionWorld({ structure, furniture, doorStates: openDoorStates });
  const grid = buildGrid(structure, world);
  const spawn = resolveExplorationSpawn(structure, world);
  floorAnalyses.set(floor.id, { floor, structure, furniture, world, grid, spawn });
}

const componentGraph = new Map();
function addEdge(left, right) {
  if (!left || !right) return;
  if (!componentGraph.has(left)) componentGraph.set(left, new Set());
  if (!componentGraph.has(right)) componentGraph.set(right, new Set());
  componentGraph.get(left).add(right);
  componentGraph.get(right).add(left);
}

const stairAudit = [];
for (const [floorId, analysis] of floorAnalyses) {
  for (const stair of analysis.world.stairs) {
    if (!stair.connectedToFloorId) continue;
    const handoff = {
      x: stair.start.x + (stair.end.x - stair.start.x) * STAIR_HANDOFF_T,
      z: stair.start.z + (stair.end.z - stair.start.z) * STAIR_HANDOFF_T
    };
    const sourceCell = analysis.grid.nearestCell(handoff, 0.32);
    const target = floorAnalyses.get(stair.connectedToFloorId);
    const arrival = target ? getConnectedStairArrival(target.structure, stair) : null;
    const targetCell = target && arrival ? target.grid.nearestCell(arrival.position, 0.32) : null;
    const sourceNode = sourceCell ? `${floorId}:${sourceCell.label}` : null;
    const targetNode = targetCell ? `${stair.connectedToFloorId}:${targetCell.label}` : null;
    addEdge(sourceNode, targetNode);
    stairAudit.push({
      floorId,
      id: stair.id,
      name: analysis.structure.stairs.find((item) => item.id === stair.id)?.name ?? stair.id,
      connectedToFloorId: stair.connectedToFloorId,
      sourceNode,
      targetNode,
      handoffSafe: isExplorationPositionSafe(analysis.world, handoff, CHARACTER_RADIUS),
      arrivalSafe: Boolean(target && arrival && isExplorationPositionSafe(target.world, arrival.position, CHARACTER_RADIUS))
    });
  }
}

const startAnalysis = floorAnalyses.get("1F") ?? floorAnalyses.values().next().value;
const startCell = startAnalysis?.grid.nearestCell(startAnalysis.spawn, 0.4);
const startNode = startAnalysis && startCell ? `${startAnalysis.structure.floorId}:${startCell.label}` : null;
const reachableNodes = new Set(startNode ? [startNode] : []);
const nodeQueue = startNode ? [startNode] : [];
for (let cursor = 0; cursor < nodeQueue.length; cursor += 1) {
  const node = nodeQueue[cursor];
  for (const next of componentGraph.get(node) ?? []) {
    if (reachableNodes.has(next)) continue;
    reachableNodes.add(next);
    nodeQueue.push(next);
  }
}

function describeRooms(analysis) {
  const { structure, grid } = analysis;
  return structure.rooms.map((room) => {
    const polygon = room.boundary.map((point) => explorationScenePoint(point, structure));
    const componentCounts = new Map();
    let interiorCells = 0;
    for (let row = 0; row < grid.rows; row += 1) {
      for (let column = 0; column < grid.columns; column += 1) {
        const point = grid.pointAt(column, row);
        if (!pointInPolygon(point, polygon)) continue;
        interiorCells += 1;
        const index = grid.indexAt(column, row);
        if (!grid.safe[index]) continue;
        const label = grid.labels[index];
        componentCounts.set(label, (componentCounts.get(label) ?? 0) + 1);
      }
    }
    const safeCells = [...componentCounts.values()].reduce((sum, count) => sum + count, 0);
    const reachableCells = [...componentCounts.entries()].reduce((sum, [label, count]) => (
      reachableNodes.has(`${structure.floorId}:${label}`) ? sum + count : sum
    ), 0);
    const locallyLargestComponent = Math.max(0, ...componentCounts.values());
    const reachableRatio = safeCells ? reachableCells / safeCells : 0;
    const usableRatio = interiorCells ? safeCells / interiorCells : 0;
    const status = reachableRatio >= 0.95
      ? "reachable"
      : reachableRatio > 0
        ? "partial"
        : "unreachable";
    return {
      id: room.id,
      name: room.name,
      status,
      reachableRatio: Number(reachableRatio.toFixed(3)),
      usableRatio: Number(usableRatio.toFixed(3)),
      safeAreaM2: Number((safeCells * GRID_STEP * GRID_STEP).toFixed(2)),
      largestConnectedAreaM2: Number((locallyLargestComponent * GRID_STEP * GRID_STEP).toFixed(2)),
      components: [...componentCounts.keys()]
    };
  });
}

function describeDoors(analysis) {
  const { structure, world, grid, furniture } = analysis;
  return world.doors.map((runtime) => {
    const door = runtime.door;
    const host = structure.walls.find((wall) => wall.id === door.hostId && wall.kind === "straight")
      ?? structure.partitions.find((partition) => partition.id === door.hostId);
    if (!host || !("start" in host)) return { id: door.id, name: door.name, passable: false, reason: "missing-host" };
    const start = explorationScenePoint(host.start, structure);
    const end = explorationScenePoint(host.end, structure);
    const length = Math.hypot(end.x - start.x, end.z - start.z) || 1;
    const normal = { x: -(end.z - start.z) / length, z: (end.x - start.x) / length };
    let sideA = null;
    let sideB = null;
    for (const distance of [0.5, 0.65, 0.8, 1]) {
      sideA ??= grid.nearestCell({ x: runtime.center.x + normal.x * distance, z: runtime.center.z + normal.z * distance }, 0.3);
      sideB ??= grid.nearestCell({ x: runtime.center.x - normal.x * distance, z: runtime.center.z - normal.z * distance }, 0.3);
    }
    const passable = Boolean(sideA && sideB && sideA.label === sideB.label);
    const nearbyFurniture = furniture.filter((item) => {
      const box = world.boxes.find((candidate) => candidate.id === item.id);
      return box && Math.hypot(box.center.x - runtime.center.x, box.center.z - runtime.center.z) < 1.45;
    }).map((item) => item.name);
    return {
      id: door.id,
      name: door.name,
      widthMm: door.width,
      passable,
      reason: passable ? "clear" : !sideA || !sideB ? "blocked-approach" : "disconnected-sides",
      sideComponents: [sideA?.label ?? null, sideB?.label ?? null],
      nearbyFurniture
    };
  });
}

function gapMidpoint(closest, shrink = 0) {
  const dx = closest.right.x - closest.left.x;
  const dz = closest.right.z - closest.left.z;
  const distance = Math.hypot(dx, dz) || 1;
  const right = { x: closest.right.x - dx / distance * shrink, z: closest.right.z - dz / distance * shrink };
  return { x: (closest.left.x + right.x) / 2, z: (closest.left.z + right.z) / 2 };
}

function roomAtPoint(analysis, point) {
  return analysis.structure.rooms.find((room) => pointInPolygon(
    point,
    room.boundary.map((candidate) => explorationScenePoint(candidate, analysis.structure))
  ));
}

function describeTightGaps(analysis) {
  const furnitureById = new Map(analysis.furniture.map((item) => [item.id, item]));
  const structureObjects = new Map([
    ...analysis.structure.walls.map((item) => [item.id, item]),
    ...analysis.structure.partitions.map((item) => [item.id, item]),
    ...analysis.structure.fences.map((item) => [item.id, item])
  ]);
  const gapCandidates = [];

  for (const box of analysis.world.boxes.filter((candidate) => candidate.kind === "furniture")) {
    const furniture = furnitureById.get(box.id);
    if (!furniture) continue;
    const bestByStructure = new Map();
    for (const segment of analysis.world.segments.filter((candidate) => candidate.kind !== "door")) {
      const structureId = segment.id.split(":")[0];
      const closest = closestBoxToSegment(box, segment);
      const gap = Math.max(0, closest.distance - segment.halfThickness);
      if (gap < 0.08 || gap > 0.95) continue;
      const current = bestByStructure.get(structureId);
      if (!current || gap < current.gap) bestByStructure.set(structureId, { gap, closest, segment });
    }
    for (const [structureId, candidate] of bestByStructure) {
      const midpoint = gapMidpoint(candidate.closest, candidate.segment.halfThickness);
      const room = roomAtPoint(analysis, midpoint);
      if (!room) continue;
      const structureItem = structureObjects.get(structureId);
      gapCandidates.push({
        kind: "furniture-structure",
        roomId: room.id,
        roomName: room.name,
        leftId: furniture.id,
        leftName: furniture.name,
        rightId: structureId,
        rightName: structureItem?.name ?? structureId,
        barrierType: structureItem?.barrierType ?? candidate.segment.kind,
        clearanceMm: Math.round(candidate.gap * 1000),
        passableForCharacter: candidate.gap >= CHARACTER_RADIUS * 2,
        midpoint
      });
    }
  }

  const boxes = analysis.world.boxes.filter((candidate) => candidate.kind === "furniture");
  for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
      const left = boxes[leftIndex];
      const right = boxes[rightIndex];
      const closest = closestBoxes(left, right);
      if (closest.distance < 0.08 || closest.distance > 0.95) continue;
      const midpoint = gapMidpoint(closest);
      const room = roomAtPoint(analysis, midpoint);
      if (!room) continue;
      gapCandidates.push({
        kind: "furniture-furniture",
        roomId: room.id,
        roomName: room.name,
        leftId: left.id,
        leftName: furnitureById.get(left.id)?.name ?? left.id,
        rightId: right.id,
        rightName: furnitureById.get(right.id)?.name ?? right.id,
        clearanceMm: Math.round(closest.distance * 1000),
        passableForCharacter: closest.distance >= CHARACTER_RADIUS * 2,
        midpoint
      });
    }
  }

  return gapCandidates.sort((left, right) => left.clearanceMm - right.clearanceMm);
}

const floors = [...floorAnalyses.values()].map((analysis) => {
  const rooms = describeRooms(analysis);
  const doors = describeDoors(analysis);
  const tightGaps = describeTightGaps(analysis);
  return {
    floorId: analysis.structure.floorId,
    componentCount: analysis.grid.components.length,
    spawn: analysis.spawn,
    rooms,
    doors,
    blockedGaps: tightGaps.filter((gap) => !gap.passableForCharacter),
    tightPassableGaps: tightGaps.filter((gap) => gap.passableForCharacter)
  };
});

const report = {
  assumptions: {
    source: "data/default-workspace.json",
    characterDiameterMm: CHARACTER_RADIUS * 2000,
    gridStepMm: GRID_STEP * 1000,
    doors: "all-open"
  },
  startNode,
  reachableNodes: [...reachableNodes],
  stairs: stairAudit,
  floors
};

const summary = {
  assumptions: report.assumptions,
  reachableNodes: report.reachableNodes,
  stairs: report.stairs,
  floors: report.floors.map((floor) => ({
    floorId: floor.floorId,
    componentCount: floor.componentCount,
    rooms: floor.rooms,
    blockedDoors: floor.doors.filter((door) => !door.passable),
    blockedGaps: floor.blockedGaps.map((gap) => ({
      roomName: gap.roomName,
      leftName: gap.leftName,
      rightName: gap.rightName,
      barrierType: gap.barrierType,
      clearanceMm: gap.clearanceMm,
      midpoint: gap.midpoint
    }))
  }))
};

const output = process.argv.includes("--issues")
  ? summary.floors.map((floor) => ({ floorId: floor.floorId, blockedDoors: floor.blockedDoors, blockedGaps: floor.blockedGaps }))
  : process.argv.includes("--summary") ? summary : report;

console.log(JSON.stringify(output, null, 2));
