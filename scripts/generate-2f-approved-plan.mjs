import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const workspace = JSON.parse(await readFile("data/default-workspace.json", "utf8"));
const structure = workspace.houseStructuresByFloor["2F"];
if (!structure) throw new Error("2F structure missing");

const outputDir = path.resolve("artifacts/2f-ten-cameras-v15-20260811/2d");
const outputPath = path.join(outputDir, "2f-current-furniture-and-cameras.svg");
await mkdir(outputDir, { recursive: true });

const scale = 0.1;
const ox = 70;
const oy = 125;
const planWidth = structure.coordinateSystem.width * scale;
const planHeight = structure.coordinateSystem.height * scale;
const sx = (x) => ox + x * scale;
const sy = (y) => oy + y * scale;
const esc = (value) => String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
const points = (polygon) => polygon.map((point) => `${sx(point.x)},${sy(point.y)}`).join(" ");
const centroid = (polygon) => polygon.reduce((sum, point) => ({ x: sum.x + point.x / polygon.length, y: sum.y + point.y / polygon.length }), { x: 0, y: 0 });

const roomColors = {
  "ROOM-2F-001": "#dce8e4",
  "ROOM-2F-002": "#d8cec3",
  "ROOM-2F-003": "#d9e4e7",
  "ROOM-2F-004": "#eee3d5",
  "ROOM-2F-005": "#e6dfcf",
  "ROOM-2F-006": "#e8d9ca",
  "ROOM-2F-007": "#eeeae2",
  "ROOM-2F-008": "#ddd7ce"
};

const roomLayer = structure.rooms.map((room) => {
  const center = centroid(room.boundary);
  return `<polygon points="${points(room.boundary)}" fill="${roomColors[room.id] ?? "#ece8e1"}" stroke="#b8afa4" stroke-width="1.5"/>
    <text x="${sx(center.x)}" y="${sy(center.y)}" class="room-label">${esc(room.name)}</text>`;
}).join("\n");

const outdoorLayer = structure.outdoors.map((outdoor) => `<polygon points="${points(outdoor.polygon)}" fill="#d7ddd4" stroke="#77867a" stroke-width="2" stroke-dasharray="8 5"/>`).join("\n");
const outdoorLabels = structure.outdoors.map((outdoor) => {
  const center = centroid(outdoor.polygon);
  return `<text x="${sx(center.x)}" y="${sy(center.y)}" class="outdoor-label">${esc(outdoor.name)}</text>`;
}).join("\n");

const wallLayer = structure.walls.filter((wall) => wall.kind === "straight").map((wall) =>
  `<line x1="${sx(wall.start.x)}" y1="${sy(wall.start.y)}" x2="${sx(wall.end.x)}" y2="${sy(wall.end.y)}" stroke="#3f3a35" stroke-width="${Math.max(4, wall.thickness * scale)}" stroke-linecap="square"/>`
).join("\n");

const opening = workspace.stairOpenings.find((item) => item.floorId === "2F");
const stairLayer = opening ? `<polygon points="${points(opening.polygon)}" fill="url(#stairHatch)" stroke="#806c58" stroke-width="2"/>
  <text x="${sx(2100)}" y="${sy(4100)}" class="small-label">楼梯洞口 / 下行1F</text>` : "";

const furnitureOn2F = workspace.furniture.filter((item) => item.floorId === "2F");
const importantFurnitureIds = new Set([
  "module-2f-cloak-left", "module-2f-cloak-right", "module-2f-window-desk",
  "furn-2f-master-bedroom-bed-001", "furn-2f-master-bedroom-large-wardrobe-001", "furn-2f-master-bedroom-chest-001",
  "furn-2f-master-bathtub-001", "furn-2f-master-shower-001", "furn-2f-master-vanity-001", "furn-2f-master-toilet-001",
  "furn-2f-bedroom1-bed-001", "furn-2f-bedroom1-wardrobe-001", "furn-2f-bedroom2-bed-001", "module-2f-wardrobe-002", "furn-2f-bedroom2-desk-001"
]);
const furnitureLayer = furnitureOn2F.map((item) => {
  const xMm = item.position.x / 100 * structure.coordinateSystem.width;
  const yMm = item.position.y / 100 * structure.coordinateSystem.height;
  const width = item.dimensions.width * 10 * scale;
  const depth = item.dimensions.depth * 10 * scale;
  const rotation = item.position.rotation ?? 0;
  const isGlass = item.id.startsWith("module-2f-cloak-");
  const isWet = ["shower", "bathtub", "vanity", "toilet"].includes(item.moduleType);
  const fill = isGlass ? "rgba(70,58,52,0.62)" : isWet ? "#c8dde0" : item.moduleType === "bed" ? "#f7f2e9" : "#bb8f5e";
  const stroke = isGlass ? "#2e2724" : isWet ? "#5e7c81" : "#6f4c2f";
  const label = importantFurnitureIds.has(item.id)
    ? `<text x="0" y="4" class="furniture-label">${esc(item.name.replace(/^2F\s*/, "").replace(/^卧室[12]\s*/, ""))}</text>`
    : "";
  return `<g transform="translate(${sx(xMm)} ${sy(yMm)}) rotate(${rotation})">
    <rect x="${-width / 2}" y="${-depth / 2}" width="${width}" height="${depth}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    ${label}
  </g>`;
}).join("\n");

const cameraViews = workspace.cameraViews.filter((view) => view.floor === "2F" && view.id.startsWith("designer-camera-2f-v3-")).sort((a, b) => a.order - b.order);
const cameraLayer = cameraViews.map((view, index) => {
  const cameraPlan = {
    x: (view.cameraPosition.x * 1000) + structure.coordinateSystem.width / 2,
    y: (view.cameraPosition.z * 1000) + structure.coordinateSystem.height / 2
  };
  const targetPlan = {
    x: (view.target.x * 1000) + structure.coordinateSystem.width / 2,
    y: (view.target.z * 1000) + structure.coordinateSystem.height / 2
  };
  const dx = targetPlan.x - cameraPlan.x;
  const dy = targetPlan.y - cameraPlan.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const arrowEnd = { x: cameraPlan.x + dx / length * 520, y: cameraPlan.y + dy / length * 520 };
  return `<g class="camera-marker">
    <line x1="${sx(cameraPlan.x)}" y1="${sy(cameraPlan.y)}" x2="${sx(arrowEnd.x)}" y2="${sy(arrowEnd.y)}" marker-end="url(#arrow)"/>
    <circle cx="${sx(cameraPlan.x)}" cy="${sy(cameraPlan.y)}" r="14"/>
    <text x="${sx(cameraPlan.x)}" y="${sy(cameraPlan.y) + 5}">${String(index + 1).padStart(2, "0")}</text>
  </g>`;
}).join("\n");

const balconyDoorLabels = `<line x1="${sx(950)}" y1="${sy(7800)}" x2="${sx(3897)}" y2="${sy(7800)}" stroke="#2f6f75" stroke-width="8" stroke-linecap="round"/>
  <line x1="${sx(3897)}" y1="${sy(7800)}" x2="${sx(6542)}" y2="${sy(7800)}" stroke="#2f6f75" stroke-width="8" stroke-linecap="round"/>
  <line x1="${sx(3897)}" y1="${sy(7800)}" x2="${sx(3897)}" y2="${sy(9100)}" stroke="#3f3a35" stroke-width="16"/>
  <text x="${sx(3740)}" y="${sy(8950)}" class="door-label">当前3D：两阳台之间有实体分隔</text>`;

const cameraLegend = cameraViews.map((view, index) => `<text x="1315" y="${170 + index * 38}" class="legend-line"><tspan class="legend-no">${String(index + 1).padStart(2, "0")}</tspan><tspan dx="10">${esc(view.name.replace(/^2F\s*/, ""))}</tspan></text>`).join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1780" height="1120" viewBox="0 0 1780 1120">
  <defs>
    <pattern id="stairHatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="12" stroke="#b39b82" stroke-width="4"/></pattern>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#b8432e"/></marker>
    <style>
      text { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: #2f2a25; }
      .title { font-size: 30px; font-weight: 800; letter-spacing: 1px; }
      .subtitle { font-size: 15px; fill: #6f655b; }
      .room-label { font-size: 18px; font-weight: 800; text-anchor: middle; paint-order: stroke; stroke: rgba(255,255,255,.85); stroke-width: 5px; }
      .outdoor-label { font-size: 18px; font-weight: 800; text-anchor: middle; fill: #42584a; }
      .small-label { font-size: 14px; font-weight: 700; text-anchor: middle; }
      .furniture-label { font-size: 10px; font-weight: 700; text-anchor: middle; paint-order: stroke; stroke: rgba(255,255,255,.9); stroke-width: 3px; }
      .door-label { font-size: 13px; font-weight: 800; text-anchor: middle; fill: #2f6f75; }
      .camera-marker line { stroke: #b8432e; stroke-width: 3; }
      .camera-marker circle { fill: #b8432e; stroke: white; stroke-width: 2; }
      .camera-marker text { fill: white; font-size: 11px; font-weight: 900; text-anchor: middle; }
      .legend-title { font-size: 20px; font-weight: 800; }
      .legend-line { font-size: 14px; }
      .legend-no { font-weight: 900; fill: #b8432e; }
      .note { font-size: 14px; fill: #5f554b; }
    </style>
  </defs>
  <rect width="1780" height="1120" fill="#f6f2eb"/>
  <text x="70" y="55" class="title">2F 当前家具布置与10个固定机位｜一致性审查版</text>
  <text x="70" y="84" class="subtitle">依据当前2D/3D模型数据直接生成 · 家庭厅取消 · 主卧西墙床 / 东侧收纳 · 当前3D为两个独立封闭阳台</text>
  <g>${outdoorLayer}${roomLayer}${stairLayer}${furnitureLayer}${wallLayer}${balconyDoorLabels}${outdoorLabels}${cameraLayer}</g>
  <g>
    <rect x="1280" y="125" width="440" height="500" rx="18" fill="#fffdf9" stroke="#d5ccc1"/>
    <text x="1315" y="155" class="legend-title">机位索引</text>
    ${cameraLegend}
  </g>
  <g>
    <rect x="1280" y="655" width="440" height="300" rx="18" fill="#fffdf9" stroke="#d5ccc1"/>
    <text x="1315" y="695" class="legend-title">本轮已落实</text>
    <text x="1315" y="735" class="note">• 主卧床头移至西墙；南墙仅保留一个飘窗</text>
    <text x="1315" y="770" class="note">• 东侧：3000×350四扇薄柜 + 800×350五斗橱</text>
    <text x="1315" y="805" class="note">• 衣帽间：双侧深色玻璃柜 + 1800×700升降桌</text>
    <text x="1315" y="840" class="note">• 主卫保留1700浴缸；仅保留一个真实入口</text>
    <text x="1315" y="875" class="note">• 当前3D：父母房、儿童房各有独立封闭阳台</text>
    <text x="1315" y="910" class="note">• 儿童房保留1400通顶衣柜与1000儿童书桌</text>
  </g>
  <text x="70" y="1080" class="subtitle">红色圆点为相机位置，箭头为观察方向；尺寸单位均为毫米。</text>
</svg>`;

await writeFile(outputPath, svg, "utf8");
console.log(outputPath);
