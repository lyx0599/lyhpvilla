import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateLightingDesignV1 } from "../lib/lighting-design.ts";
import { getStairSystemGeometryFingerprint } from "../lib/stair-systems.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260802-before-1f-hard-finish-refinement.json");
if (!fs.existsSync(backupPath)) fs.copyFileSync(workspacePath, backupPath);

const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const structure = workspace.houseStructuresByFloor["1F"];
const now = "2026-08-02T14:00:00.000Z";
const bedroomNorthY = 4950;

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

function estimatedMeta(sourceNote, toleranceMm = 100) {
  return { status: "estimated", source: "visual-estimate", sourceNote, toleranceMm };
}

function polygonArea(points) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

function updateRoomBoundary(id, nextBoundary, sourceNote) {
  const item = room(id);
  item.boundary = nextBoundary;
  item.area = polygonArea(nextBoundary);
  item.verificationMeta = estimatedMeta(sourceNote, 100);
}

function setDrawingY(id, y) {
  const item = drawing(id);
  item.positionMm = { ...item.positionMm, y };
  item.updatedAt = now;
  item.verificationMeta = estimatedMeta("随楼梯缩窄与1F卧室北墙调整同步校正", 100);
}

const immutableTable = JSON.stringify(furniture("module-1f-table-001"));
const immutableIsland = JSON.stringify(furniture("furn-kitchen-entry-island-001"));

// Apply one consistent 950mm flight width through all three connected stair systems.
for (const floorStructure of Object.values(workspace.houseStructuresByFloor)) {
  for (const stair of floorStructure.stairs ?? []) {
    stair.width = 950;
    const centerY = stair.flightRole === "lower-flight" ? 3525 : 4475;
    stair.start.y = centerY;
    stair.end.y = centerY;
    stair.verificationMeta = estimatedMeta("用户确认楼梯可适度缩窄；梯段净宽由1050mm调整为950mm", 50);
  }
}

for (const landing of workspace.stairLandings) {
  landing.polygon = landing.polygon.map((point) => ({ ...point, y: point.y === 5150 ? 4950 : point.y }));
  landing.centerLine = { start: { x: 950, y: 3525 }, end: { x: 950, y: 4475 } };
  landing.width = 1900;
  landing.status = "confirmed";
}

for (const opening of workspace.stairOpenings) {
  opening.polygon = opening.polygon.map((point) => ({ ...point, y: point.y === 5120 ? 4920 : point.y }));
  opening.guardEdges = opening.guardEdges.map((edge) => ({
    ...edge,
    start: { ...edge.start, y: edge.start.y === 5120 ? 4920 : edge.start.y },
    end: { ...edge.end, y: edge.end.y === 5120 ? 4920 : edge.end.y }
  }));
  opening.status = "confirmed";
}

for (const system of workspace.stairSystems) {
  system.lighting.geometryFingerprint = getStairSystemGeometryFingerprint(system, workspace.houseStructuresByFloor);
  system.lighting.syncStatus = "synchronized";
}

// The 200mm released on 1F is assigned to the bedroom, matching the reference-plan proportion.
const bedroomNorthWall = wall("W-1F-012");
bedroomNorthWall.start.y = bedroomNorthY;
bedroomNorthWall.end.y = bedroomNorthY;
bedroomNorthWall.verificationMeta = estimatedMeta("楼梯带由2100mm缩至1900mm后，卧室北墙向北移动200mm", 100);

const bedroomEastWall = wall("W-1F-013");
bedroomEastWall.start.y = bedroomNorthY;
bedroomEastWall.length = bedroomEastWall.end.y - bedroomEastWall.start.y;
bedroomEastWall.verificationMeta = estimatedMeta("随1F卧室北墙向北延长200mm；客厅电视壁炉位置保持不变", 100);

door("D-1F-003").verificationMeta = estimatedMeta("卧室门宽与横向位置不变，随W-1F-012向北移动200mm", 100);

updateRoomBoundary("ROOM-1F-004", [
  { x: 950, y: bedroomNorthY },
  { x: 3897, y: bedroomNorthY },
  { x: 3897, y: 7800 },
  { x: 950, y: 7800 }
], "楼梯缩窄后卧室进深由2650mm增加至2850mm；外墙不变");
updateRoomBoundary("ROOM-1F-005", [
  { x: 3676, y: 2850 },
  { x: 9495, y: 2850 },
  { x: 9495, y: 7800 },
  { x: 3897, y: 7800 },
  { x: 3897, y: bedroomNorthY },
  { x: 3676, y: bedroomNorthY }
], "卧室北墙移动后校正客厅西侧凹口；客餐厅主体、餐桌和岛台保持不变");
updateRoomBoundary("ROOM-1F-006", [
  { x: 950, y: 3050 },
  { x: 3676, y: 3050 },
  { x: 3676, y: bedroomNorthY },
  { x: 950, y: bedroomNorthY }
], "两跑楼梯各950mm，总纵向楼梯带由2100mm缩至1900mm");

// Ceiling borders follow the two adjusted room boundaries.
for (const id of ["C-1F-BEDROOM-PERIMETER-N", "C-1F-BEDROOM-PERIMETER-E", "C-1F-BEDROOM-PERIMETER-W", "C-1F-BEDROOM-CENTER"]) {
  const item = drawing(id);
  item.polygon = item.polygon.map((point) => ({
    ...point,
    y: point.y === 5150 ? 4950 : point.y === 5450 ? 5250 : point.y
  }));
  item.positionMm = item.polygon[0];
  item.updatedAt = now;
  item.verificationMeta = estimatedMeta("卧室向北增加200mm后同步延展吊顶分区", 100);
}
for (const id of ["C-1F-LIVING-PERIMETER-W1", "C-1F-LIVING-PERIMETER-W2"]) {
  const item = drawing(id);
  item.polygon = item.polygon.map((point) => ({ ...point, y: point.y === 5150 ? 4950 : point.y }));
  item.positionMm = item.polygon[0];
  item.updatedAt = now;
  item.verificationMeta = estimatedMeta("卧室北墙调整后校正客厅西侧吊顶收口", 100);
}
setDrawingY("L-1F-V1-17", 5422);
setDrawingY("SW-1F-V1-14", 5842);
setDrawingY("L-1F-SHOWROOM-BEDROOM-COVE-01", 6375);
for (const [id, y] of [
  ["L-1F-V1-30", 3450],
  ["SW-1F-V1-25", 3870],
  ["L-1F-V1-31", 3525],
  ["SW-1F-V1-26", 3945],
  ["L-1F-V1-32", 3525],
  ["SW-1F-V1-27", 3945]
]) setDrawingY(id, y);

// Remove all 1F rugs, including the bed asset's generated underlay and any legacy standalone item.
workspace.furniture = workspace.furniture.filter((item) => !(item.floorId === "1F" && /地毯|地垫|rug|carpet/i.test(`${item.name} ${item.material} ${item.catalogId ?? ""}`)));
furniture("module-1f-bed-002").render3d = { ...furniture("module-1f-bed-002").render3d, showRug: false };

// Match the photographed kitchen: matte oat-taupe slabs, 2mm reveals, 20mm veined stone,
// dark recessed plinth, handle-free shadow grooves and warm under-cabinet light.
for (const id of ["furn-kitchen-run-001", "furn-kitchen-u-left-run", "furn-kitchen-u-right-run"]) {
  const item = furniture(id);
  item.material = "浅燕麦灰褐哑光门板 + 20mm暖白细纹石材台面/挡水墙 + 深棕内凹踢脚";
  item.color = "#b3a38f";
  item.note = "厨房功能、位置及1198mm中间通道保持；柜门按样板间改为低反射浅燕麦灰褐整板，2mm深色分缝、上沿暗拉槽、无明装拉手。";
  item.constructionNote = "按现有柜体定位深化；台面采用20mm薄边，踢脚内退并使用深棕色，吊柜底设置2700K连续灯带。";
  item.render3d = {
    ...item.render3d,
    primaryMaterial: "oatTaupeLacquer",
    secondaryMaterial: "travertine",
    accentMaterial: "agedBrass",
    styleLocked: true,
    kitchenVisual: {
      ...item.render3d?.kitchenVisual,
      countertopThicknessMm: 20,
      toeKickHeightMm: 90,
      backsplashHeightMm: 600,
      frontStyle: "slab",
      handleStyle: "groove",
      countertopEdge: "thin",
      panelGapMm: 2,
      endPanelThicknessMm: 20,
      showCountertopSeams: false,
      showInternalShadowGap: true
    }
  };
  item.verificationMeta = estimatedMeta("依据用户提供的五张厨房细节照片提取造型与材质；色样施工前需实物确认", 50);
}

const warmOakWallFinish = {
  material: "woodVeneer",
  name: "浅暖橡木竖纹木饰面 + 细分缝 + 圆角收口",
  baseColor: "#b99773",
  textureAccent: "#d7c1a5",
  roughness: 0.66,
  textureScale: 2.1
};
for (const id of ["W-1F-003", "W-1F-009", "W-1F-011"]) wall(id).surfaceFinish = { ...warmOakWallFinish };

room("ROOM-1F-005").surfaceFinishes.wall = {
  material: "limewash",
  name: "暖燕麦米灰丝绒石灰基肌理墙",
  baseColor: "#dfd2c0",
  textureAccent: "#c5b197",
  roughness: 0.92,
  textureScale: 2.45
};
room("ROOM-1F-001").surfaceFinishes.wall = { ...room("ROOM-1F-005").surfaceFinishes.wall };
room("ROOM-1F-006").surfaceFinishes.wall = { ...room("ROOM-1F-005").surfaceFinishes.wall };
room("ROOM-1F-002").surfaceFinishes.wall = {
  material: "mineralSilicatePaint",
  name: "暖米灰细砂可擦洗矿物墙面",
  baseColor: "#ddd2c2",
  textureAccent: "#c8b9a5",
  roughness: 0.88,
  textureScale: 2.2
};

const kitchenTourView = byId(workspace.roomTourViews, "tour-1F-ROOM-1F-002", "room tour view");
kitchenTourView.cameraPosition = { x: 0.5, y: 1.52, z: -2.04 };
kitchenTourView.target = { x: 0.5, y: 0.96, z: -3.62 };
kitchenTourView.fov = 72;
kitchenTourView.description = "相机位于厨房双移门内侧，正对窗下大单槽；避开玻璃染色并尽量减轻右侧冰箱和两侧柜体遮挡。";

if (JSON.stringify(furniture("module-1f-table-001")) !== immutableTable) throw new Error("Dining table changed unexpectedly");
if (JSON.stringify(furniture("furn-kitchen-entry-island-001")) !== immutableIsland) throw new Error("Entry island changed unexpectedly");

// Move only unmodified generated stair/room lights with the revised geometry.
// Hand-adjusted 1F feature lighting remains a conflict and is retained verbatim.
const lightingResult = generateLightingDesignV1({
  structuresByFloor: workspace.houseStructuresByFloor,
  furniture: workspace.furniture,
  existingItems: workspace.drawingItems,
  floorIds: workspace.floors.map((floor) => floor.id),
  now
});
if (lightingResult.created !== 0) throw new Error(`Hard-finish refinement would create ${lightingResult.created} unexpected lighting item(s)`);
workspace.drawingItems = lightingResult.items;
workspace.lightingDesign = lightingResult.lightingDesign;

workspace.updatedAt = now;
workspace.revision = Math.max(Number(workspace.revision) || 0, 11);
workspace.drawingPackage.updatedAt = now;

fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);
console.log("Applied 1F stair-width and hard-finish refinement: 950mm flights, bedroom +200mm, no 1F rugs, showroom kitchen slab detailing.");
