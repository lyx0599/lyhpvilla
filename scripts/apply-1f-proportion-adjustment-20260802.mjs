import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260802-before-1f-proportion-adjustment.json");
if (!fs.existsSync(backupPath)) fs.copyFileSync(workspacePath, backupPath);

const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const structure = workspace.houseStructuresByFloor["1F"];
const now = "2026-08-02T12:00:00.000Z";
const previousServiceBoundaryY = 3050;
const serviceBoundaryY = 2850;

function byId(items, id, label) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing ${label}: ${id}`);
  return item;
}

const wall = (id) => byId(structure.walls, id, "wall");
const room = (id) => byId(structure.rooms, id, "room");
const door = (id) => byId(structure.doors, id, "door");
const furniture = (id) => byId(workspace.furniture, id, "furniture");
const drawing = (id) => byId(workspace.drawingItems, id, "drawing item");

function expect(value, expected, label) {
  if (value !== expected) throw new Error(`${label}: expected ${expected}, received ${value}`);
}

function estimatedMeta(sourceNote, toleranceMm = 100) {
  return {
    status: "estimated",
    source: "visual-estimate",
    sourceNote,
    toleranceMm
  };
}

function polygonArea(points) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

function setFurniturePositionMm(item, xMm, yMm, rotation = item.position.rotation) {
  item.position = { x: xMm / 120, y: yMm / 90, rotation };
}

function setDrawingY(id, y) {
  const item = drawing(id);
  item.positionMm = { ...item.positionMm, y };
  item.updatedAt = now;
  item.verificationMeta = estimatedMeta("随 1F 北侧功能带进深调整同步校正，施工前需现场复尺", 100);
}

function updateRoomBoundary(id, nextBoundary) {
  const item = room(id);
  item.boundary = nextBoundary;
  item.area = polygonArea(nextBoundary);
  item.verificationMeta = estimatedMeta("依据用户提供的样板间/交付平面比例估算；建筑外框保持不变", 150);
}

// Preserve the hard constraints explicitly called out by the user.
const immutableStairSnapshot = JSON.stringify(structure.stairs);
const immutableBedroomWallSnapshot = JSON.stringify(wall("W-1F-012"));
const immutableTableSnapshot = JSON.stringify(furniture("module-1f-table-001"));
const immutableIslandSnapshot = JSON.stringify(furniture("furn-kitchen-entry-island-001"));

for (const id of ["W-1F-004", "W-1F-005", "W-1F-006"]) {
  const item = wall(id);
  if (item.end.y !== serviceBoundaryY) expect(item.end.y, previousServiceBoundaryY, `${id} original south endpoint`);
  item.end.y = serviceBoundaryY;
  item.length = serviceBoundaryY - item.start.y;
  item.verificationMeta = estimatedMeta("北侧玄关/厨房/公卫功能带按参考平面比例减深 200mm", 100);
}

const serviceSouthWall = wall("W-1F-009");
if (serviceSouthWall.start.y !== serviceBoundaryY) expect(serviceSouthWall.start.y, previousServiceBoundaryY, "W-1F-009 original start");
serviceSouthWall.start.y = serviceBoundaryY;
serviceSouthWall.end.y = serviceBoundaryY;
serviceSouthWall.verificationMeta = estimatedMeta("厨房及公卫南侧分界向北移动 200mm；门洞随宿主墙移动", 100);

const livingEastWall = wall("W-1F-011");
if (livingEastWall.start.y !== serviceBoundaryY) expect(livingEastWall.start.y, previousServiceBoundaryY, "W-1F-011 original start");
livingEastWall.start.y = serviceBoundaryY;
livingEastWall.length = livingEastWall.end.y - livingEastWall.start.y;
livingEastWall.verificationMeta = estimatedMeta("仅调整 W-1F-006/W-1F-011 在同一直线外墙上的分段点；建筑外轮廓不变", 100);

for (const id of ["D-1F-004", "D-1F-005"]) {
  door(id).verificationMeta = estimatedMeta("门洞宽度与横向位置不变，随 W-1F-009 向北移动 200mm", 100);
}

updateRoomBoundary("ROOM-1F-001", [
  { x: 3676, y: 350 },
  { x: 5383, y: 350 },
  { x: 5383, y: serviceBoundaryY },
  { x: 3676, y: serviceBoundaryY }
]);
updateRoomBoundary("ROOM-1F-002", [
  { x: 5383, y: 350 },
  { x: 7681, y: 350 },
  { x: 7681, y: serviceBoundaryY },
  { x: 5383, y: serviceBoundaryY }
]);
updateRoomBoundary("ROOM-1F-003", [
  { x: 7681, y: 350 },
  { x: 9495, y: 350 },
  { x: 9495, y: serviceBoundaryY },
  { x: 7681, y: serviceBoundaryY }
]);
updateRoomBoundary("ROOM-1F-005", [
  { x: 3676, y: serviceBoundaryY },
  { x: 9495, y: serviceBoundaryY },
  { x: 9495, y: 7800 },
  { x: 3897, y: 7800 },
  { x: 3897, y: 5150 },
  { x: 3676, y: 5150 }
]);

// The shallower kitchen keeps its 2298mm width and 1198mm clear aisle.
// Shorten the left run at the door end so the window-side U-junction stays in place.
const leftRun = furniture("furn-kitchen-u-left-run");
leftRun.dimensions.width = 180;
setFurniturePositionMm(leftRun, 5820, 1916, 90);
leftRun.note = "样板间比例适配：左侧灶台段北端及U形转角保持，靠门端缩短200mm；柜体进深、通道净宽和灶台功能不变。";
leftRun.constructionNote = "厨房南墙向北200mm后，侧柜靠门端收短200mm；深化时校核门套收口和灶具安全距离。";
leftRun.constructionMeta.reserveSize = "180x55x90cm";
leftRun.verificationMeta = estimatedMeta("随厨房进深由2700mm调整为2500mm，施工前按完成面复尺", 50);

const cooktop = furniture("furn-cooktop-001");
setFurniturePositionMm(cooktop, 5820, 2060, 90);
cooktop.note = "随左侧灶台柜靠门端缩短而向北校正100mm；灶具尺寸、朝向及排烟需求不变。";
cooktop.verificationMeta = estimatedMeta("随厨房侧柜调整，最终以烟道与安全距离复核", 50);

const vanity = furniture("furn-bath-vanity-001");
setFurniturePositionMm(vanity, 9192, 2275, 90);
vanity.note = "公卫进深减少200mm后，洗手台沿东墙同步向北移动200mm；尺寸及朝向不变。";
vanity.verificationMeta = estimatedMeta("随公卫南墙调整，给排水点位施工前复尺", 50);

// Recenter service-room annotations and keep task lights aligned with moved furniture.
for (const id of ["L-1F-V1-01", "L-1F-V1-02", "L-1F-V1-03", "L-1F-V1-04", "L-1F-V1-13"]) setDrawingY(id, 1600);
for (const id of ["SW-1F-V1-01", "SW-1F-V1-02", "SW-1F-V1-03", "SW-1F-V1-04", "SW-1F-V1-10"]) setDrawingY(id, 2020);
for (const id of ["L-1F-V1-08", "L-1F-V1-12"]) setDrawingY(id, 1916);
setDrawingY("SW-1F-V1-09", 2336);
setDrawingY("L-1F-V1-14", 2275);
setDrawingY("SW-1F-V1-11", 2695);
setDrawingY("F-1F-KITCHEN-SHOWROOM-01", 1600);

// Extend the living-room ceiling and floor intent into the recovered 200mm strip.
const livingCeilingIds = [
  "C-1F-LIVING-PERIMETER-N",
  "C-1F-LIVING-PERIMETER-E",
  "C-1F-LIVING-PERIMETER-W1",
  "C-1F-LIVING-CENTER"
];
for (const id of livingCeilingIds) {
  const item = drawing(id);
  item.polygon = item.polygon.map((point) => ({
    ...point,
    y: point.y === 3050 ? 2850 : point.y === 3410 ? 3210 : point.y
  }));
  item.positionMm = item.polygon[0];
  item.updatedAt = now;
  item.verificationMeta = estimatedMeta("客餐厅向北增加200mm后同步延展吊顶分区", 100);
}
setDrawingY("L-1F-V1-24", 3688);
setDrawingY("SW-1F-V1-20", 4108);
for (const id of ["F-1F-LIVING-SHOWROOM-01", "WFIN-1F-LIVING-EAST-01", "L-1F-SHOWROOM-LIVING-COVE-01"]) setDrawingY(id, 5325);

expect(JSON.stringify(structure.stairs), immutableStairSnapshot, "Stairs must not move");
expect(JSON.stringify(wall("W-1F-012")), immutableBedroomWallSnapshot, "Bedroom/stair wall must not move");
expect(JSON.stringify(furniture("module-1f-table-001")), immutableTableSnapshot, "Dining table must not move");
expect(JSON.stringify(furniture("furn-kitchen-entry-island-001")), immutableIslandSnapshot, "Entry island must not move");

workspace.updatedAt = now;
workspace.revision = Math.max(Number(workspace.revision) || 0, 10);
workspace.drawingPackage.updatedAt = now;

fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);
console.log("Applied 1F proportion adjustment: service band -200mm, living +200mm; stairs, bedroom wall, dining table and island unchanged.");
