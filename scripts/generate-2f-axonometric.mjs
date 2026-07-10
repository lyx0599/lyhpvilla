import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const workspacePath = path.join(rootDir, "data/default-workspace.json");
const renderDir = path.join(rootDir, "renders/2f");
const outRenderDir = path.join(rootDir, "out/renders/2f");
const svgPath = path.join(renderDir, "2f-render-01-overall-axonometric.svg");
const htmlPath = path.join(renderDir, "2f-render-01-overall-axonometric.html");
const pngPath = path.join(renderDir, "2f-render-01-overall-axonometric.png");

const CANVAS_WIDTH = 1800;
const CANVAS_HEIGHT = 1240;
const FLOOR_ID = "2F";
const WALL_DISPLAY_HEIGHT_MM = 1180;
const EXTERIOR_WALL_DISPLAY_HEIGHT_MM = 1380;
const WALL_TOP_CAP_MM = 80;

const workspace = JSON.parse(await readFile(workspacePath, "utf8"));
const structure = workspace.houseStructuresByFloor?.[FLOOR_ID];

if (!structure) {
  throw new Error(`Missing ${FLOOR_ID} structure in ${workspacePath}`);
}

const floorFurniture = (workspace.furniture ?? []).filter((item) => item.floorId === FLOOR_ID);
const coordinateSystem = structure.coordinateSystem;
const center = {
  x: coordinateSystem.width / 2,
  y: coordinateSystem.height / 2
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "").trim();
  const full = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function shade(hex, amount) {
  const rgb = hexToRgb(hex);
  return rgbToHex({
    r: rgb.r + (amount >= 0 ? (255 - rgb.r) * amount : rgb.r * amount),
    g: rgb.g + (amount >= 0 ? (255 - rgb.g) * amount : rgb.g * amount),
    b: rgb.b + (amount >= 0 ? (255 - rgb.b) * amount : rgb.b * amount)
  });
}

function rawProject(point) {
  const x = point.x - center.x;
  const y = point.y - center.y;
  const z = point.z ?? 0;
  return {
    x: (x - y) * 0.82,
    y: (x + y) * 0.40 - z * 0.70
  };
}

function wallFootprint(wall, extraThickness = 0) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const halfThickness = ((wall.thickness ?? 180) + extraThickness) / 2;
  return [
    { x: wall.start.x + nx * halfThickness, y: wall.start.y + ny * halfThickness },
    { x: wall.end.x + nx * halfThickness, y: wall.end.y + ny * halfThickness },
    { x: wall.end.x - nx * halfThickness, y: wall.end.y - ny * halfThickness },
    { x: wall.start.x - nx * halfThickness, y: wall.start.y - ny * halfThickness }
  ];
}

function furnitureFootprint(item) {
  const width = item.dimensions.width * 10;
  const depth = item.dimensions.depth * 10;
  const cx = (item.position.x / 100) * coordinateSystem.width;
  const cy = (item.position.y / 100) * coordinateSystem.height;
  const rotation = ((item.position.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return [
    { x: -width / 2, y: -depth / 2 },
    { x: width / 2, y: -depth / 2 },
    { x: width / 2, y: depth / 2 },
    { x: -width / 2, y: depth / 2 }
  ].map((point) => ({
    x: cx + point.x * cos - point.y * sin,
    y: cy + point.x * sin + point.y * cos
  }));
}

function lineSegmentPoint(wall, positionOnWall) {
  const t = clamp(positionOnWall ?? 0.5, 0, 1);
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    y: wall.start.y + (wall.end.y - wall.start.y) * t
  };
}

function segmentSpan(wall, centerPoint, width) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  return {
    start: { x: centerPoint.x - ux * width / 2, y: centerPoint.y - uy * width / 2 },
    end: { x: centerPoint.x + ux * width / 2, y: centerPoint.y + uy * width / 2 },
    ux,
    uy
  };
}

function outwardNormal(wall) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy) || 1;
  const n1 = { x: -dy / length, y: dx / length };
  const mid = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 };
  const fromCenter = { x: mid.x - center.x, y: mid.y - center.y };
  return fromCenter.x * n1.x + fromCenter.y * n1.y >= 0 ? n1 : { x: -n1.x, y: -n1.y };
}

function bayWindowFootprint(bayWindow) {
  const wall = structure.walls.find((item) => item.id === bayWindow.wallId);
  if (!wall || wall.kind !== "straight") return [];
  const wallPoint = lineSegmentPoint(wall, bayWindow.positionOnWall);
  const span = segmentSpan(wall, wallPoint, bayWindow.width);
  const normal = outwardNormal(wall);
  return [
    span.start,
    span.end,
    { x: span.end.x + normal.x * bayWindow.depth, y: span.end.y + normal.y * bayWindow.depth },
    { x: span.start.x + normal.x * bayWindow.depth, y: span.start.y + normal.y * bayWindow.depth }
  ];
}

function rectAlongLine(start, end, width) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  return [
    { x: start.x + nx * width / 2, y: start.y + ny * width / 2 },
    { x: end.x + nx * width / 2, y: end.y + ny * width / 2 },
    { x: end.x - nx * width / 2, y: end.y - ny * width / 2 },
    { x: start.x - nx * width / 2, y: start.y - ny * width / 2 }
  ];
}

function roomCentroid(room) {
  const total = room.boundary.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return {
    x: total.x / room.boundary.length,
    y: total.y / room.boundary.length
  };
}

function furnitureLabel(item) {
  if (item.id.includes("master-bedroom-bed-001")) return "主卧床";
  if (item.id.includes("master-bedroom-large-wardrobe")) return "大衣柜";
  if (item.id.includes("master-bedroom-bedside")) return "床边衣柜";
  if (item.id.includes("master-bedroom-chest")) return "五斗橱";
  if (item.id.includes("master-vanity")) return "双人台盆";
  if (item.id.includes("master-bathtub")) return "浴缸";
  if (item.id.includes("master-shower")) return "淋浴";
  if (item.id.includes("master-toilet")) return "马桶";
  if (item.id.includes("guest-shower")) return "客卫淋浴";
  if (item.id.includes("guest-toilet")) return "客卫马桶";
  if (item.id.includes("guest-vanity")) return "客卫台盆";
  if (item.id.includes("bedroom1-bed")) return "卧室1床";
  if (item.id.includes("bedroom1-wardrobe")) return "卧室1衣柜";
  if (item.id.includes("bedroom2-bed")) return "卧室2床";
  if (item.id.includes("bedroom2-wardrobe")) return "卧室2衣柜";
  if (item.roomId === "ROOM-2F-002" && item.type === "wardrobe") return "衣帽柜";
  if (item.id.includes("window-desk")) return "整理台";
  return item.code ?? item.name;
}

function furnitureHeight(item) {
  if (item.type === "shower" || item.moduleType === "shower") return Math.max(1900, item.dimensions.height * 10);
  if (item.type === "wardrobe" || item.moduleType === "wardrobe" || item.moduleType === "tallCabinet") return Math.max(2100, item.dimensions.height * 10);
  if (item.type === "bed" || item.moduleType === "bed") return Math.max(520, item.dimensions.height * 10 * 0.58);
  if (item.type === "toilet" || item.moduleType === "toilet") return Math.max(520, item.dimensions.height * 10 * 0.75);
  if (item.type === "bathtub" || item.moduleType === "bathtub") return Math.max(520, item.dimensions.height * 10);
  if (item.type === "vanity" || item.moduleType === "vanity") return Math.max(760, item.dimensions.height * 10);
  return Math.max(300, item.dimensions.height * 10);
}

function furnitureColor(item) {
  if (item.type === "shower" || item.moduleType === "shower") return "#a9d7e7";
  if (item.type === "toilet" || item.moduleType === "toilet") return "#f7f3eb";
  if (item.type === "bathtub" || item.moduleType === "bathtub") return "#f8f4ed";
  if (item.type === "bed" || item.moduleType === "bed") return "#c6a482";
  if (item.type === "vanity" || item.moduleType === "vanity") return item.roomId === "ROOM-2F-003" ? "#b78358" : "#d7d2c8";
  if (item.type === "wardrobe" || item.moduleType === "wardrobe") return item.color || "#d6bd9d";
  if (item.moduleType === "sideboard" || item.type === "cabinet") return item.color || "#d6c2a5";
  return item.color || "#d9c7aa";
}

function roomColor(room) {
  if (room.name.includes("卫")) return "#e8eef0";
  if (room.name.includes("衣帽")) return "#f3eadb";
  if (room.name.includes("卧")) return "#eaf1f8";
  if (room.name.includes("走廊")) return "#f6eddf";
  return "#edf2f7";
}

const fitPoints = [];
for (const room of structure.rooms) {
  for (const point of room.boundary) {
    fitPoints.push({ ...point, z: 0 }, { ...point, z: 260 });
  }
}
for (const wall of structure.walls) {
  if (wall.kind !== "straight") continue;
  for (const point of wallFootprint(wall, 80)) {
    fitPoints.push({ ...point, z: 0 }, { ...point, z: EXTERIOR_WALL_DISPLAY_HEIGHT_MM + WALL_TOP_CAP_MM });
  }
}
for (const item of floorFurniture) {
  for (const point of furnitureFootprint(item)) {
    fitPoints.push({ ...point, z: 0 }, { ...point, z: furnitureHeight(item) });
  }
}
for (const bayWindow of structure.bayWindows) {
  for (const point of bayWindowFootprint(bayWindow)) {
    fitPoints.push({ ...point, z: bayWindow.height });
  }
}

const rawPoints = fitPoints.map(rawProject);
const rawBounds = rawPoints.reduce((bounds, point) => ({
  minX: Math.min(bounds.minX, point.x),
  maxX: Math.max(bounds.maxX, point.x),
  minY: Math.min(bounds.minY, point.y),
  maxY: Math.max(bounds.maxY, point.y)
}), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
const scale = Math.min(
  (CANVAS_WIDTH - 280) / (rawBounds.maxX - rawBounds.minX),
  (CANVAS_HEIGHT - 260) / (rawBounds.maxY - rawBounds.minY)
);
const offset = {
  x: (CANVAS_WIDTH - (rawBounds.maxX - rawBounds.minX) * scale) / 2 - rawBounds.minX * scale,
  y: 205 - rawBounds.minY * scale
};

function project(point) {
  const raw = rawProject(point);
  return {
    x: raw.x * scale + offset.x,
    y: raw.y * scale + offset.y
  };
}

function pointsAttr(points) {
  return points.map((point) => {
    const screen = project(point);
    return `${screen.x.toFixed(1)},${screen.y.toFixed(1)}`;
  }).join(" ");
}

function pointDepth(points) {
  const total = points.reduce((sum, point) => sum + point.x + point.y + (point.z ?? 0) * 0.18, 0);
  return total / points.length;
}

function polygonSvg(points, options = {}) {
  const attrs = [
    `points="${pointsAttr(points)}"`,
    `fill="${options.fill ?? "none"}"`,
    `stroke="${options.stroke ?? "none"}"`,
    `stroke-width="${options.strokeWidth ?? 1}"`,
    `opacity="${options.opacity ?? 1}"`,
    options.strokeLinecap ? `stroke-linecap="${options.strokeLinecap}"` : "",
    options.strokeLinejoin ? `stroke-linejoin="${options.strokeLinejoin}"` : "",
    options.filter ? `filter="${options.filter}"` : ""
  ].filter(Boolean).join(" ");
  return `<polygon ${attrs} />`;
}

function lineSvg(start, end, options = {}) {
  const a = project(start);
  const b = project(end);
  const attrs = [
    `x1="${a.x.toFixed(1)}"`,
    `y1="${a.y.toFixed(1)}"`,
    `x2="${b.x.toFixed(1)}"`,
    `y2="${b.y.toFixed(1)}"`,
    `stroke="${options.stroke ?? "#111827"}"`,
    `stroke-width="${options.strokeWidth ?? 2}"`,
    `opacity="${options.opacity ?? 1}"`,
    options.strokeLinecap ? `stroke-linecap="${options.strokeLinecap}"` : "",
    options.strokeDasharray ? `stroke-dasharray="${options.strokeDasharray}"` : ""
  ].filter(Boolean).join(" ");
  return `<line ${attrs} />`;
}

function textSvg(point, label, options = {}) {
  const screen = project(point);
  const size = options.size ?? 24;
  const fill = options.fill ?? "#17202a";
  const stroke = options.stroke ?? "rgba(255,255,255,0.9)";
  return `<text x="${screen.x.toFixed(1)}" y="${screen.y.toFixed(1)}" text-anchor="${options.anchor ?? "middle"}" dominant-baseline="middle" font-size="${size}" font-weight="${options.weight ?? 700}" fill="${fill}" stroke="${stroke}" stroke-width="${options.strokeWidth ?? 5}" paint-order="stroke" opacity="${options.opacity ?? 1}">${escapeXml(label)}</text>`;
}

function cuboidSvg({ footprint, base = 0, height, fill, stroke = "#2d3748", opacity = 1, filter = "url(#softShadow)" }) {
  const bottom = footprint.map((point) => ({ ...point, z: base }));
  const top = footprint.map((point) => ({ ...point, z: base + height }));
  const faces = [];
  for (let index = 0; index < footprint.length; index += 1) {
    const next = (index + 1) % footprint.length;
    const face = [bottom[index], bottom[next], top[next], top[index]];
    faces.push({
      points: face,
      depth: pointDepth(face),
      fill: index % 2 === 0 ? shade(fill, -0.24) : shade(fill, -0.14)
    });
  }
  faces.sort((a, b) => a.depth - b.depth);
  return [
    ...faces.map((face) => polygonSvg(face.points, {
      fill: face.fill,
      stroke,
      strokeWidth: 1.6,
      opacity: opacity * 0.92,
      strokeLinejoin: "round"
    })),
    polygonSvg(top, {
      fill: shade(fill, 0.08),
      stroke,
      strokeWidth: 1.8,
      opacity,
      filter,
      strokeLinejoin: "round"
    })
  ].join("\n");
}

function buildBedDetails(item, footprint, height) {
  if (item.type !== "bed" && item.moduleType !== "bed") return "";
  const topZ = height + 8;
  const centerPoint = footprint.reduce((acc, point) => ({ x: acc.x + point.x / footprint.length, y: acc.y + point.y / footprint.length }), { x: 0, y: 0 });
  const rotation = ((item.position.rotation ?? 0) * Math.PI) / 180;
  const ux = { x: Math.cos(rotation), y: Math.sin(rotation) };
  const uy = { x: -Math.sin(rotation), y: Math.cos(rotation) };
  const pillowCenter = {
    x: centerPoint.x - uy.x * item.dimensions.depth * 10 * 0.31,
    y: centerPoint.y - uy.y * item.dimensions.depth * 10 * 0.31
  };
  const pillowFootprint = [
    { x: pillowCenter.x - ux.x * item.dimensions.width * 10 * 0.32 - uy.x * 170, y: pillowCenter.y - ux.y * item.dimensions.width * 10 * 0.32 - uy.y * 170 },
    { x: pillowCenter.x + ux.x * item.dimensions.width * 10 * 0.32 - uy.x * 170, y: pillowCenter.y + ux.y * item.dimensions.width * 10 * 0.32 - uy.y * 170 },
    { x: pillowCenter.x + ux.x * item.dimensions.width * 10 * 0.32 + uy.x * 170, y: pillowCenter.y + ux.y * item.dimensions.width * 10 * 0.32 + uy.y * 170 },
    { x: pillowCenter.x - ux.x * item.dimensions.width * 10 * 0.32 + uy.x * 170, y: pillowCenter.y - ux.y * item.dimensions.width * 10 * 0.32 + uy.y * 170 }
  ].map((point) => ({ ...point, z: topZ }));
  return polygonSvg(pillowFootprint, {
    fill: "#f7efe6",
    stroke: "#4b5563",
    strokeWidth: 1.4,
    opacity: 0.94,
    strokeLinejoin: "round"
  });
}

function buildWardrobeDetails(item, footprint, height) {
  if (item.type !== "wardrobe" && item.moduleType !== "wardrobe") return "";
  const topZ = height + 10;
  const centerPoint = footprint.reduce((acc, point) => ({ x: acc.x + point.x / footprint.length, y: acc.y + point.y / footprint.length }), { x: 0, y: 0 });
  const rotation = ((item.position.rotation ?? 0) * Math.PI) / 180;
  const ux = { x: Math.cos(rotation), y: Math.sin(rotation) };
  const uy = { x: -Math.sin(rotation), y: Math.cos(rotation) };
  const marks = [];
  for (let index = -1; index <= 1; index += 1) {
    const localX = (item.dimensions.width * 10 * index) / 6;
    marks.push(lineSvg(
      {
        x: centerPoint.x + ux.x * localX - uy.x * item.dimensions.depth * 10 * 0.42,
        y: centerPoint.y + ux.y * localX - uy.y * item.dimensions.depth * 10 * 0.42,
        z: topZ
      },
      {
        x: centerPoint.x + ux.x * localX + uy.x * item.dimensions.depth * 10 * 0.42,
        y: centerPoint.y + ux.y * localX + uy.y * item.dimensions.depth * 10 * 0.42,
        z: topZ
      },
      { stroke: "#7a5f44", strokeWidth: 1.4, opacity: 0.55 }
    ));
  }
  return marks.join("\n");
}

function buildToiletDetail(item, footprint, height) {
  if (item.type !== "toilet" && item.moduleType !== "toilet") return "";
  const centerPoint = footprint.reduce((acc, point) => ({ x: acc.x + point.x / footprint.length, y: acc.y + point.y / footprint.length }), { x: 0, y: 0 });
  const screen = project({ ...centerPoint, z: height + 24 });
  return `<ellipse cx="${screen.x.toFixed(1)}" cy="${screen.y.toFixed(1)}" rx="18" ry="10" fill="#ffffff" stroke="#6b7280" stroke-width="2" opacity="0.96" />`;
}

const layers = {
  slab: [],
  floor: [],
  roomLabels: [],
  stairs: [],
  walls: [],
  openings: [],
  objects: [],
  labels: [],
  annotations: []
};

const allRoomPoints = structure.rooms.flatMap((room) => room.boundary);
const footprintMinX = Math.min(...allRoomPoints.map((point) => point.x));
const footprintMaxX = Math.max(...allRoomPoints.map((point) => point.x));
const footprintMinY = Math.min(...allRoomPoints.map((point) => point.y));
const footprintMaxY = Math.max(...allRoomPoints.map((point) => point.y));
const slabFootprint = [
  { x: footprintMinX - 180, y: footprintMinY - 180 },
  { x: footprintMaxX + 180, y: footprintMinY - 180 },
  { x: footprintMaxX + 180, y: footprintMaxY + 180 },
  { x: footprintMinX - 180, y: footprintMaxY + 180 }
];
layers.slab.push(cuboidSvg({
  footprint: slabFootprint,
  base: -180,
  height: 180,
  fill: "#d8d5cb",
  stroke: "#7c7b73",
  opacity: 0.88,
  filter: "url(#largeShadow)"
}));

const sortedRooms = [...structure.rooms].sort((a, b) => pointDepth(a.boundary) - pointDepth(b.boundary));
for (const room of sortedRooms) {
  layers.floor.push(polygonSvg(room.boundary.map((point) => ({ ...point, z: 8 })), {
    fill: roomColor(room),
    stroke: "#ffffff",
    strokeWidth: 4.6,
    opacity: 0.98,
    strokeLinejoin: "round"
  }));
  const labelPoint = roomCentroid(room);
  const labelOffsetY = room.id === "ROOM-2F-006" ? 430 : 0;
  layers.roomLabels.push(textSvg({ x: labelPoint.x, y: labelPoint.y + labelOffsetY, z: 58 }, room.name, {
    size: room.id === "ROOM-2F-006" ? 32 : 24,
    fill: "#293241",
    stroke: "rgba(255,255,255,0.82)",
    strokeWidth: 6,
    opacity: 0.78
  }));
}

for (const stair of structure.stairs) {
  const dx = stair.end.x - stair.start.x;
  const dy = stair.end.y - stair.start.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const count = stair.stepCount || 12;
  const stepLength = length / count;
  for (let index = 0; index < count; index += 1) {
    const a = {
      x: stair.start.x + ux * stepLength * index,
      y: stair.start.y + uy * stepLength * index
    };
    const b = {
      x: stair.start.x + ux * stepLength * (index + 0.86),
      y: stair.start.y + uy * stepLength * (index + 0.86)
    };
    const height = 34 + index * 12;
    layers.stairs.push(cuboidSvg({
      footprint: rectAlongLine(a, b, stair.width * 0.92),
      base: 0,
      height,
      fill: index % 2 === 0 ? "#c79252" : "#d4a86e",
      stroke: "#9a5b24",
      opacity: 0.9,
      filter: "url(#softShadow)"
    }));
  }
  const mid = { x: (stair.start.x + stair.end.x) / 2, y: (stair.start.y + stair.end.y) / 2 };
  layers.annotations.push(textSvg({ ...mid, y: mid.y - 650, z: 260 }, "1F→2F 到达", {
    size: 28,
    fill: "#a24612",
    stroke: "rgba(255,247,237,0.95)",
    strokeWidth: 7
  }));
  layers.annotations.push(lineSvg(
    { x: stair.start.x - ux * 210, y: stair.start.y - uy * 210, z: 230 },
    { x: stair.end.x + ux * 210, y: stair.end.y + uy * 210, z: 230 },
    { stroke: "#bc5a13", strokeWidth: 7, opacity: 0.72, strokeLinecap: "round" }
  ));
}

const exteriorWallIds = new Set(["W-2F-001", "W-2F-002", "W-2F-003", "W-2F-006", "W-2F-010", "W-2F-011", "W-2F-018", "W-2F-019", "W-2F-020"]);
const sortedWalls = [...structure.walls].filter((wall) => wall.kind === "straight").sort((a, b) => pointDepth([a.start, a.end]) - pointDepth([b.start, b.end]));
for (const wall of sortedWalls) {
  const isExterior = exteriorWallIds.has(wall.id);
  layers.walls.push(cuboidSvg({
    footprint: wallFootprint(wall),
    base: 0,
    height: isExterior ? EXTERIOR_WALL_DISPLAY_HEIGHT_MM : WALL_DISPLAY_HEIGHT_MM,
    fill: isExterior ? "#565d60" : "#687075",
    stroke: "#343a3f",
    opacity: isExterior ? 0.92 : 0.82,
    filter: "url(#wallShadow)"
  }));
}

const wallById = new Map(structure.walls.map((wall) => [wall.id, wall]));

for (const door of structure.doors) {
  const wall = wallById.get(door.hostId);
  if (!wall || wall.kind !== "straight") continue;
  const centerPoint = lineSegmentPoint(wall, door.positionOnWall);
  const span = segmentSpan(wall, centerPoint, door.width);
  const z = exteriorWallIds.has(wall.id) ? EXTERIOR_WALL_DISPLAY_HEIGHT_MM + 30 : WALL_DISPLAY_HEIGHT_MM + 30;
  layers.openings.push(lineSvg(
    { ...span.start, z },
    { ...span.end, z },
    { stroke: "#fffaf0", strokeWidth: 12, opacity: 0.96, strokeLinecap: "round" }
  ));
}

for (const windowObject of structure.windows) {
  const wall = wallById.get(windowObject.hostId);
  if (!wall || wall.kind !== "straight") continue;
  const centerPoint = lineSegmentPoint(wall, windowObject.positionOnWall);
  const span = segmentSpan(wall, centerPoint, windowObject.width);
  const z = exteriorWallIds.has(wall.id) ? EXTERIOR_WALL_DISPLAY_HEIGHT_MM + 58 : WALL_DISPLAY_HEIGHT_MM + 58;
  layers.openings.push(lineSvg(
    { ...span.start, z },
    { ...span.end, z },
    { stroke: "#83d3f4", strokeWidth: 13, opacity: 0.86, strokeLinecap: "round" }
  ));
}

for (const bayWindow of structure.bayWindows) {
  const footprint = bayWindowFootprint(bayWindow);
  if (!footprint.length) continue;
  layers.objects.push({
    depth: pointDepth(footprint.map((point) => ({ ...point, z: bayWindow.height }))),
    svg: cuboidSvg({
      footprint,
      base: 120,
      height: bayWindow.height,
      fill: "#bde8f6",
      stroke: "#1686b9",
      opacity: 0.54,
      filter: "url(#softShadow)"
    })
  });
}

for (const item of floorFurniture) {
  const footprint = furnitureFootprint(item);
  const height = furnitureHeight(item);
  const fill = furnitureColor(item);
  const centerPoint = footprint.reduce((acc, point) => ({ x: acc.x + point.x / footprint.length, y: acc.y + point.y / footprint.length }), { x: 0, y: 0 });
  const objectSvg = [
    cuboidSvg({
      footprint,
      base: 18,
      height,
      fill,
      stroke: item.type === "shower" ? "#26799b" : "#334155",
      opacity: item.type === "shower" ? 0.58 : 0.94,
      filter: "url(#softShadow)"
    }),
    buildBedDetails(item, footprint, height),
    buildWardrobeDetails(item, footprint, height),
    buildToiletDetail(item, footprint, height)
  ].filter(Boolean).join("\n");
  layers.objects.push({
    depth: pointDepth(footprint.map((point) => ({ ...point, z: height }))),
    svg: objectSvg
  });
  const isImportantLabel = item.roomId === "ROOM-2F-006" ||
    item.roomId === "ROOM-2F-003" ||
    item.id.includes("bedroom1-bed") ||
    item.id.includes("bedroom2-bed") ||
    item.id.includes("wardrobe") ||
    item.id.includes("guest-shower") ||
    item.id.includes("guest-vanity") ||
    item.id.includes("guest-toilet");
  if (isImportantLabel) {
    layers.labels.push({
      depth: pointDepth([{ ...centerPoint, z: height + 260 }]),
      svg: textSvg({ ...centerPoint, z: height + 260 }, furnitureLabel(item), {
        size: item.roomId === "ROOM-2F-006" ? 19 : 17,
        fill: "#101827",
        stroke: "rgba(255,255,255,0.88)",
        strokeWidth: 5,
        opacity: 0.86
      })
    });
  }
}

const sortedObjects = layers.objects.sort((a, b) => a.depth - b.depth).map((item) => item.svg).join("\n");
const sortedFurnitureLabels = layers.labels.sort((a, b) => a.depth - b.depth).map((item) => item.svg).join("\n");

const roomLegend = [
  ["客卫", "#e8eef0"],
  ["衣帽间", "#f3eadb"],
  ["主卫", "#e8eef0"],
  ["卧室", "#eaf1f8"],
  ["走廊", "#f6eddf"],
  ["柜体/床", "#c6a482"],
  ["玻璃/窗", "#9fdaf1"]
];

const legendSvg = roomLegend.map((item, index) => {
  const x = 1260 + (index % 2) * 210;
  const y = 86 + Math.floor(index / 2) * 38;
  return `<g opacity="0.88"><rect x="${x}" y="${y}" width="28" height="18" rx="4" fill="${item[1]}" stroke="#475569" stroke-width="1.2" /><text x="${x + 40}" y="${y + 14}" font-size="18" fill="#334155" font-weight="650">${escapeXml(item[0])}</text></g>`;
}).join("\n");

const timestamp = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Shanghai"
}).format(new Date());

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" role="img" aria-label="2F整体鸟瞰轴侧图">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbf7f1" />
      <stop offset="48%" stop-color="#f3eee5" />
      <stop offset="100%" stop-color="#eef3f7" />
    </linearGradient>
    <filter id="largeShadow" x="-18%" y="-18%" width="136%" height="136%">
      <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#4b5563" flood-opacity="0.22" />
    </filter>
    <filter id="softShadow" x="-18%" y="-18%" width="136%" height="136%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#2f3a45" flood-opacity="0.20" />
    </filter>
    <filter id="wallShadow" x="-18%" y="-18%" width="136%" height="136%">
      <feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#111827" flood-opacity="0.18" />
    </filter>
    <style>
      svg { background: #f6efe6; }
      text { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif; letter-spacing: 0; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="url(#paper)" />
  <g opacity="0.34">
    <path d="M130 1060 C410 972 592 1118 854 1032 C1092 954 1288 1002 1594 924" fill="none" stroke="#d6c4aa" stroke-width="3" />
    <path d="M165 1120 C448 1032 708 1172 970 1087 C1224 1004 1398 1084 1660 1008" fill="none" stroke="#c8d8e4" stroke-width="2" />
  </g>
  <g transform="translate(88 76)">
    <text x="0" y="0" font-size="18" fill="#c67855" font-weight="800" letter-spacing="7">LINYU LAKESIDE</text>
    <text x="0" y="48" font-size="40" fill="#17202a" font-weight="850">2F 整体鸟瞰轴侧图</text>
    <text x="0" y="84" font-size="21" fill="#64748b" font-weight="650">二层 / 卧室区 · 当前模型家具与结构</text>
    <text x="0" y="116" font-size="16" fill="#94a3b8" font-weight="600">生成时间：${escapeXml(timestamp)} · 来源：data/default-workspace.json</text>
  </g>
  <g>
    ${legendSvg}
  </g>
  <g id="render">
    ${layers.slab.join("\n")}
    ${layers.floor.join("\n")}
    ${layers.stairs.join("\n")}
    ${layers.roomLabels.join("\n")}
    ${layers.walls.join("\n")}
    ${layers.openings.join("\n")}
    ${sortedObjects}
    ${sortedFurnitureLabels}
    ${layers.annotations.join("\n")}
  </g>
  <g transform="translate(106 1110)">
    <rect x="0" y="0" width="678" height="64" rx="18" fill="#ffffff" opacity="0.72" stroke="#d8d5cb" />
    <text x="30" y="28" font-size="18" fill="#475569" font-weight="720">读图提示</text>
    <text x="30" y="50" font-size="15" fill="#64748b" font-weight="580">低墙剖切显示室内家具；楼梯仅保留 1F→2F 到达梯段；主卧为右侧大房间，主卫在其上方。</text>
  </g>
</svg>
`;

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>2F 整体鸟瞰轴侧图</title>
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        background: #f4eee6;
        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
      }
      body {
        display: grid;
        place-items: center;
        padding: 32px;
      }
      img {
        width: min(100%, 1800px);
        height: auto;
        border-radius: 24px;
        box-shadow: 0 28px 90px rgba(38, 43, 50, 0.22);
        background: white;
      }
    </style>
  </head>
  <body>
    <img alt="2F整体鸟瞰轴侧图" src="./2f-render-01-overall-axonometric.svg" />
  </body>
</html>
`;

await mkdir(renderDir, { recursive: true });
await writeFile(svgPath, svg, "utf8");
await writeFile(htmlPath, html, "utf8");

let pngCreated = false;
try {
  execFileSync("/usr/bin/sips", ["-s", "format", "png", svgPath, "--out", pngPath], { stdio: "ignore" });
  pngCreated = true;
} catch {
  pngCreated = false;
}

if (existsSync(path.join(rootDir, "out"))) {
  await mkdir(outRenderDir, { recursive: true });
  await writeFile(path.join(outRenderDir, path.basename(svgPath)), svg, "utf8");
  await writeFile(path.join(outRenderDir, path.basename(htmlPath)), html, "utf8");
  if (pngCreated) {
    const pngBuffer = await readFile(pngPath);
    await writeFile(path.join(outRenderDir, path.basename(pngPath)), pngBuffer);
  }
}

console.log(`Generated ${path.relative(rootDir, svgPath)}`);
console.log(`Generated ${path.relative(rootDir, htmlPath)}`);
console.log(pngCreated ? `Generated ${path.relative(rootDir, pngPath)}` : "PNG conversion skipped; SVG is available.");
