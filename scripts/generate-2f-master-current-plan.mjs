import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const workspace = JSON.parse(await readFile('data/default-workspace.json', 'utf8'));
const structure = workspace.houseStructuresByFloor['2F'];
const room = structure.rooms.find((item) => item.id === 'ROOM-2F-006');
const items = workspace.furniture.filter((item) => item.floorId === '2F' && item.roomId === room.id);
const outputDir = path.resolve('artifacts/2f-layout-review-v4-20260810');
const outputPath = path.join(outputDir, 'master-bedroom-current-plan.svg');
await mkdir(outputDir, { recursive: true });

const crop = { minX: 6250, minY: 2700, maxX: 9800, maxY: 8200 };
const scale = 0.14;
const ox = 320;
const oy = 100;
const sx = (x) => ox + (x - crop.minX) * scale;
const sy = (y) => oy + (y - crop.minY) * scale;
const pointString = (polygon) => polygon.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ');
const absolutePosition = (item) => ({
  x: item.position.x / 100 * structure.coordinateSystem.width,
  y: item.position.y / 100 * structure.coordinateSystem.height
});
const keyIds = new Set([
  'furn-2f-master-bedroom-bed-001', 'furn-2f-master-bedroom-large-wardrobe-001',
  'furn-2f-master-bedroom-chest-001', 'furn-2f-master-bay-bench-001',
  'furn-2f-master-nightstand-north-001', 'furn-2f-master-nightstand-south-001'
]);
const colors = {
  'furn-2f-master-bedroom-bed-001': '#d9c5ae',
  'furn-2f-master-bedroom-large-wardrobe-001': '#796552',
  'furn-2f-master-bedroom-chest-001': '#b98255',
  'furn-2f-master-bay-bench-001': '#c7b9a8',
  'furn-2f-master-nightstand-north-001': '#9f8268',
  'furn-2f-master-nightstand-south-001': '#9f8268'
};
const labels = {
  'furn-2f-master-bedroom-bed-001': '1800×2000 双人床',
  'furn-2f-master-bedroom-large-wardrobe-001': '3000×350 上吊移门薄柜\n（东墙南段，正对床尾）',
  'furn-2f-master-bedroom-chest-001': '800×350 五斗橱\n（东墙北段，靠主卫门）',
  'furn-2f-master-bay-bench-001': '唯一飘窗坐榻',
  'furn-2f-master-nightstand-north-001': '床头柜',
  'furn-2f-master-nightstand-south-001': '床头柜'
};

const furnitureSvg = items.filter((item) => keyIds.has(item.id)).map((item) => {
  const p = absolutePosition(item);
  const width = item.dimensions.width * 10 * scale;
  const depth = item.dimensions.depth * 10 * scale;
  const rotation = item.position.rotation ?? 0;
  const lines = labels[item.id].split('\n');
  return `<g transform="translate(${sx(p.x)} ${sy(p.y)}) rotate(${rotation})">
    <rect x="${-width / 2}" y="${-depth / 2}" width="${width}" height="${depth}" rx="8" fill="${colors[item.id]}" stroke="#55483d" stroke-width="2"/>
    ${lines.map((line, index) => `<text x="0" y="${(index - (lines.length - 1) / 2) * 18 + 5}" text-anchor="middle" class="item-label" transform="rotate(${-rotation})">${line}</text>`).join('')}
  </g>`;
}).join('\n');

const masterDoor = structure.doors.find((item) => item.id === 'D-2F-008');
const bathDoor = structure.doors.find((item) => item.id === 'D-2F-007');
const doorSegment = (door) => {
  const wall = structure.walls.find((item) => item.id === door.hostId);
  if (!wall) throw new Error(`Missing host wall for ${door.id}`);
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const center = {
    x: wall.start.x + dx * door.positionOnWall,
    y: wall.start.y + dy * door.positionOnWall
  };
  return {
    start: { x: center.x - ux * door.width / 2, y: center.y - uy * door.width / 2 },
    end: { x: center.x + ux * door.width / 2, y: center.y + uy * door.width / 2 },
    center,
    vertical: Math.abs(dy) > Math.abs(dx)
  };
};
const masterDoorSegment = doorSegment(masterDoor);
const bathDoorSegment = doorSegment(bathDoor);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1220" height="930" viewBox="0 0 1220 930">
<style>
  .title{font:700 30px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;fill:#302821}.subtitle{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;fill:#6d6055}.room-label{font:700 24px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;fill:#493d33}.item-label{font:600 13px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;fill:#fff}.note{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;fill:#51463e}.warning{font:700 16px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;fill:#a44730}.dim{font:600 14px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;fill:#685c52}
</style>
<rect width="1220" height="930" fill="#f4efe8"/>
<text x="55" y="52" class="title">2F 主卧｜门洞净距校正后家具平面</text>
<text x="55" y="82" class="subtitle">按现有确认模型直接提取，不是意向示意图；北向在上，单位：mm</text>

<rect x="${sx(7681)}" y="${sy(2700)}" width="${(9495-7681)*scale}" height="${(3050-2700)*scale}" fill="#dbe7e6" stroke="#8a8178" stroke-width="2"/>
<text x="${sx(8588)}" y="${sy(2925)}" text-anchor="middle" class="room-label">主卫</text>
<polygon points="${pointString(room.boundary)}" fill="#eadfce" stroke="#403832" stroke-width="8" stroke-linejoin="round"/>
<text x="${sx(7900)}" y="${sy(4700)}" text-anchor="middle" class="room-label">主卧</text>
${furnitureSvg}

<line x1="${sx(7570)}" y1="${sy(6500)}" x2="${sx(8750)}" y2="${sy(6500)}" stroke="#9b3f2e" stroke-width="5" marker-end="url(#arrow)"/>
<text x="${sx(8100)}" y="${sy(6400)}" text-anchor="middle" class="warning">床尾方向</text>

<line x1="${sx(7900)}" y1="${sy(4050)}" x2="${sx(9100)}" y2="${sy(3550)}" stroke="#3d6d68" stroke-width="4" marker-end="url(#entry-arrow)"/>
<text x="${sx(8440)}" y="${sy(3900)}" text-anchor="middle" class="dim">真实入户视角：正见五斗橱</text>

<line x1="${sx(6542)}" y1="${sy(7900)}" x2="${sx(9495)}" y2="${sy(7900)}" stroke="#75685d" stroke-width="2"/>
<text x="${sx(8018)}" y="${sy(8050)}" text-anchor="middle" class="dim">主卧南段净宽约 2953</text>
<line x1="${sx(8542)}" y1="${sy(7480)}" x2="${sx(9495)}" y2="${sy(7480)}" stroke="#9b3f2e" stroke-width="2"/>
<text x="${sx(9020)}" y="${sy(7410)}" text-anchor="middle" class="warning">床尾至东墙约953</text>

<rect x="850" y="160" width="315" height="620" rx="18" fill="#fffaf3" stroke="#d6c7b7" stroke-width="2"/>
<text x="882" y="205" class="room-label">本轮确认关系</text>
<text x="882" y="248" class="note"><tspan x="882" dy="0">床头在西墙，床尾向东。</tspan><tspan x="882" dy="30">五斗橱在东墙北段，</tspan><tspan x="882" dy="25">紧邻主卫门并对应入口轴线。</tspan></text>
<text x="882" y="370" class="note"><tspan x="882" dy="0">3000×350mm上吊移门薄柜</tspan><tspan x="882" dy="25">移至东墙南段，正对床尾；</tspan><tspan x="882" dy="25">南墙仅保留一个飘窗坐榻。</tspan></text>
<text x="882" y="480" class="warning"><tspan x="882" dy="0">床尾净通道约：</tspan><tspan x="882" dy="36" font-size="26">953 − 350 = 603mm</tspan><tspan x="882" dy="30">按当前模型可通行，施工前</tspan><tspan x="882" dy="25">仍需按床架完成面现场复尺。</tspan></text>
<text x="882" y="650" class="note"><tspan x="882" dy="0">位置顺序（由北向南）：</tspan><tspan x="882" dy="28">主卫门 → 五斗橱 → 大柜 → 飘窗。</tspan><tspan x="882" dy="38">门洞转角净距：</tspan><tspan x="882" dy="26">移门西侧约150；双开门北侧约250。</tspan></text>

<path d="M ${sx(bathDoorSegment.start.x)} ${sy(bathDoorSegment.start.y)} L ${sx(bathDoorSegment.end.x)} ${sy(bathDoorSegment.end.y)}" stroke="#3d6d68" stroke-width="8"/>
<text x="${sx(bathDoorSegment.center.x)}" y="${sy(bathDoorSegment.center.y - 80)}" text-anchor="middle" class="dim">主卫移门</text>
<path d="M ${sx(masterDoorSegment.start.x)} ${sy(masterDoorSegment.start.y)} L ${sx(masterDoorSegment.end.x)} ${sy(masterDoorSegment.end.y)}" stroke="#3d6d68" stroke-width="8"/>
<text x="${sx(masterDoorSegment.center.x - 110)}" y="${sy(masterDoorSegment.center.y)}" text-anchor="middle" class="dim" transform="rotate(-90 ${sx(masterDoorSegment.center.x - 110)} ${sy(masterDoorSegment.center.y)})">主卧入口双门</text>

<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#9b3f2e"/></marker><marker id="entry-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#3d6d68"/></marker></defs>
</svg>`;

await writeFile(outputPath, svg, 'utf8');
console.log(outputPath);
