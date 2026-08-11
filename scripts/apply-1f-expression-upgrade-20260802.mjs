import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260802-before-1f-expression-upgrade.json");
if (!fs.existsSync(backupPath)) fs.copyFileSync(workspacePath, backupPath);

const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const structure = workspace.houseStructuresByFloor["1F"];
const now = "2026-08-02T18:30:00.000Z";

function byId(items, id, label) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing ${label}: ${id}`);
  return item;
}
const room = (id) => byId(structure.rooms, id, "room");
const wall = (id) => byId(structure.walls, id, "wall");
const furniture = (id) => byId(workspace.furniture, id, "furniture");
const drawing = (id) => byId(workspace.drawingItems, id, "drawing item");
const tour = (id) => byId(workspace.roomTourViews, id, "room tour");
const immutableTable = JSON.stringify(furniture("module-1f-table-001"));
const immutableIsland = JSON.stringify(furniture("furn-kitchen-entry-island-001"));
const structuralSnapshot = JSON.stringify({
  rooms: structure.rooms.map(({ surfaceFinishes, verificationMeta, ...item }) => item),
  walls: structure.walls.map(({ surfaceFinish, surfaceFinishByRoomId, verificationMeta, ...item }) => item),
  doors: structure.doors,
  windows: structure.windows,
  bayWindows: structure.bayWindows,
  stairs: structure.stairs.map(({ visual, verificationMeta, ...item }) => item)
});

const estimated = (sourceNote, toleranceMm = 50) => ({ status: "estimated", source: "visual-estimate", sourceNote, toleranceMm });
const publicFloor = {
  material: "stone",
  name: "样板间浅暖石材人字铺地（模块尺寸待选材确认）",
  baseColor: "#ddd0b7",
  jointColor: "#b9a98e",
  textureAccent: "#eee4d1",
  roughness: 0.72,
  tileWidthMm: 150,
  tileLengthMm: 600,
  seamWidthMm: 2,
  directionDeg: 45,
  textureScale: 3.6,
  pattern: "showroomHerringboneStone",
  materialResourceId: "showroomPaleHerringbone",
  physicalWidthMm: 1200,
  physicalHeightMm: 1200,
  uvRotationDeg: 45
};
for (const id of ["ROOM-1F-001", "ROOM-1F-002", "ROOM-1F-005", "ROOM-1F-006"]) {
  room(id).surfaceFinishes.floor = { ...publicFloor };
}

const limeWall = {
  material: "limePlaster",
  name: "样板间暖燕麦石灰基墙面",
  baseColor: "#ddd1bf",
  textureAccent: "#c1b09a",
  roughness: 0.91,
  textureScale: 2.4,
  materialResourceId: "showroomLimePlaster",
  physicalWidthMm: 1600,
  physicalHeightMm: 1600,
  uvRotationDeg: 0
};
for (const id of ["ROOM-1F-001", "ROOM-1F-002", "ROOM-1F-004", "ROOM-1F-005", "ROOM-1F-006"]) {
  room(id).surfaceFinishes.wall = { ...limeWall };
}
const oakWall = {
  material: "woodVeneer",
  name: "样板间浅暖橡木竖纹面板 + 8mm阴影缝",
  baseColor: "#b99570",
  textureAccent: "#d7c0a3",
  roughness: 0.62,
  textureScale: 1.45,
  materialResourceId: "showroomWarmOakVertical",
  physicalWidthMm: 1200,
  physicalHeightMm: 2400,
  uvRotationDeg: 0
};
for (const id of ["W-1F-003", "W-1F-009", "W-1F-011"]) wall(id).surfaceFinish = { ...oakWall };

const kitchenIds = ["furn-kitchen-run-001", "furn-kitchen-u-left-run", "furn-kitchen-u-right-run"];
for (const id of kitchenIds) {
  const item = furniture(id);
  item.material = "样板间燕麦灰褐哑光门板 + 暖白灰纹石材薄台面 + 深古铜阴影缝";
  item.color = "#aa9984";
  item.render3d = {
    ...item.render3d,
    detailLevel: "presentation",
    primaryMaterial: "showroomOatTaupe",
    secondaryMaterial: "showroomVeinedStone",
    accentMaterial: "showroomDarkBronze",
    primaryMaterialResourceId: "showroomOatTaupeLacquer",
    secondaryMaterialResourceId: "showroomWarmVeinedStone",
    accentMaterialResourceId: "showroomDarkBronze",
    kitchenVisual: {
      ...item.render3d?.kitchenVisual,
      countertopThicknessMm: 20,
      backsplashHeightMm: 600,
      toeKickHeightMm: 90,
      overhangMm: 15,
      frontStyle: "slab",
      handleStyle: "groove",
      countertopEdge: "thin",
      panelGapMm: 2,
      endPanelThicknessMm: 20,
      showCountertopSeams: false,
      showInternalShadowGap: true,
      cornerRadiusMm: 12,
      upperCabinetHeightMm: 720,
      upperCabinetDepthMm: 360
    }
  };
  item.verificationMeta = estimated("依据1F厨房细节照片实施表达升级；不改变U型柜体所在墙线", 30);
}
furniture("furn-kitchen-run-001").render3d.kitchenVisual.countertopCutouts = [{ kind: "sink", offsetMm: -10, widthMm: 820, depthMm: 500, cornerRadiusMm: 18 }];
furniture("furn-kitchen-u-left-run").render3d.kitchenVisual.countertopCutouts = [{ kind: "cooktop", offsetMm: 144, widthMm: 920, depthMm: 510, cornerRadiusMm: 12 }];
furniture("furn-kitchen-corner-spice-rack-001").render3d = {
  ...furniture("furn-kitchen-corner-spice-rack-001").render3d,
  detailLevel: "presentation",
  variantId: "1fIntegratedSpiceRack",
  primaryMaterial: "showroomWarmOak",
  secondaryMaterial: "clearGlass",
  accentMaterial: "showroomDarkBronze",
  primaryMaterialResourceId: "showroomWarmOakVertical",
  accentMaterialResourceId: "showroomDarkBronze"
};

const fridge = furniture("furn-fridge-001");
fridge.position.x = 7330 / 120;
fridge.note = "独立冰箱移至右侧留白区最东端，维持无柜壳包覆；与灶侧操作段形成约900mm估算净距。";
fridge.verificationMeta = estimated("按厨房净宽与冰箱700mm旋转后进深推算，未采用洗手池视频", 50);

const vanity = furniture("furn-bath-vanity-001");
vanity.dimensions.width = 70;
vanity.position.y = 2475 / 90;
vanity.note = "不参考已排除的洗手池视频；仅为解除当前马桶与台盆柜重叠，将台盆柜收窄至700mm并向南归位。";
vanity.render3d.wetAreaVisual = { ...vanity.render3d.wetAreaVisual, basinShape: "rectangular", countertopThicknessMm: 20 };
vanity.verificationMeta = estimated("基于现有房间边界和设备常见尺度的净距校核，不作为现场实测", 80);
const toilet = furniture("furn-bath-toilet-001");
toilet.dimensions.width = 65;
toilet.verificationMeta = estimated("基于现有设备冲突做保守净距修正，不使用已排除视频", 60);

const bed = furniture("module-1f-bed-002");
bed.position.x = 1950 / 120;
bed.render3d = {
  ...bed.render3d,
  showRug: false,
  primaryMaterial: "showroomWovenFabric",
  secondaryMaterial: "creamFabric",
  accentMaterial: "showroomWarmOak",
  primaryMaterialResourceId: "showroomWovenHeadboard",
  accentMaterialResourceId: "showroomWarmOakVertical",
  bedVisual: { ...bed.render3d.bedVisual, panelCount: 6, panelGapMm: 12, topBandHeightMm: 180, underBedLighting: true }
};
bed.note = "床体向西移动约218mm，扩大与东侧通顶衣柜的通道；床和衣柜实际选型尺寸仍需复核。";
bed.verificationMeta = estimated("依据当前净尺寸和家具包络校核，未改墙体", 50);
const headboard = furniture("furn-1f-bedroom-headboard-panel-001");
headboard.render3d = {
  ...headboard.render3d,
  primaryMaterial: "showroomWovenFabric",
  secondaryMaterial: "showroomWarmOak",
  accentMaterial: "warmLightEmissive",
  primaryMaterialResourceId: "showroomWovenHeadboard",
  secondaryMaterialResourceId: "showroomWarmOakVertical",
  bedVisual: { panelCount: 6, panelGapMm: 12, topBandHeightMm: 180, underBedLighting: true }
};
const wardrobe = furniture("module-1f-wardrobe-001");
wardrobe.render3d = {
  ...wardrobe.render3d,
  primaryMaterial: "showroomOatTaupe",
  secondaryMaterial: "showroomWarmOak",
  accentMaterial: "showroomDarkBronze",
  primaryMaterialResourceId: "showroomOatTaupeLacquer",
  secondaryMaterialResourceId: "showroomWarmOakVertical",
  accentMaterialResourceId: "showroomDarkBronze",
  cabinetVisual: { ...wardrobe.render3d.cabinetVisual, openNicheWidthMm: 420, openNicheHeightMm: 420, openNicheSide: "right", topGapMm: 20, sideGapMm: 8, cornerRadiusMm: 18 }
};

const waterbar = furniture("furn-living-waterbar-001");
waterbar.dimensions.depth = 45;
waterbar.material = "样板间暖琥珀木瘤饰面零食柜 + 暖白灰纹石材 + 柜底灯带";
waterbar.render3d = {
  ...waterbar.render3d,
  primaryMaterial: "showroomBurl",
  secondaryMaterial: "showroomVeinedStone",
  accentMaterial: "showroomDarkBronze",
  primaryMaterialResourceId: "showroomBurlAmber",
  secondaryMaterialResourceId: "showroomWarmVeinedStone",
  accentMaterialResourceId: "showroomDarkBronze"
};
waterbar.note = "保留餐桌位置，柜体由550mm减至450mm，吸收样板间零食柜的暖琥珀木瘤、圆角和照明语言。";
waterbar.verificationMeta = estimated("柜深调整用于改善固定餐桌后的局部包络，现场仍需复核", 50);
for (const id of ["furn-living-waterbar-upper-001", "furn-living-snack-pullout-001"]) {
  const item = furniture(id);
  item.render3d = {
    ...item.render3d,
    primaryMaterial: "showroomBurl",
    secondaryMaterial: "showroomOatTaupe",
    accentMaterial: "showroomDarkBronze",
    primaryMaterialResourceId: "showroomBurlAmber",
    secondaryMaterialResourceId: "showroomOatTaupeLacquer",
    accentMaterialResourceId: "showroomDarkBronze",
    cabinetVisual: { ...item.render3d.cabinetVisual, cornerRadiusMm: 24, openNicheWidthMm: 420, openNicheHeightMm: 520, openNicheSide: "center", topGapMm: 20, sideGapMm: 8, interiorLighting: true }
  };
}

for (const stair of structure.stairs) {
  stair.visual = {
    style: "showroomLightStone",
    treadMaterialResourceId: "showroomWarmVeinedStone",
    riserMaterialResourceId: "showroomWarmVeinedStone",
    nosingMm: 18,
    glassGuard: true,
    handrailMaterialResourceId: "showroomDarkBronze",
    finishBuildUpMm: 20
  };
}

function upsertDrawing(item) {
  const index = workspace.drawingItems.findIndex((candidate) => candidate.id === item.id);
  if (index >= 0) workspace.drawingItems[index] = { ...workspace.drawingItems[index], ...item, updatedAt: now };
  else workspace.drawingItems.push(item);
  if (!workspace.drawingPackage.drawingItemIds.includes(item.id)) workspace.drawingPackage.drawingItemIds.push(item.id);
}
const wallFinishItems = [
  ["WFIN-1F-ENTRY-WEST-02", "ROOM-1F-001", "W-1F-003", 0, 2700, "玄关浅暖橡木竖纹分区"],
  ["WFIN-1F-SERVICE-SOUTH-02", "ROOM-1F-005", "W-1F-009", 0, 4112, "厨房卫生间外侧连续木饰面"],
  ["WFIN-1F-LIVING-EAST-02", "ROOM-1F-005", "W-1F-011", 0, 4950, "中间套东侧实墙连续木饰面" ]
];
for (const [id, roomId, hostWallId, startOffsetMm, endOffsetMm, label] of wallFinishItems) {
  const host = wall(hostWallId);
  upsertDrawing({
    id, floorId: "1F", roomId, category: "wallFinish", type: "parameterizedWoodPanelZone",
    positionMm: host.start, hostObjectId: hostWallId, hostWallId, relatedFurnitureId: null,
    heightMm: 2600, circuitId: null, materialId: "showroomWarmOakVertical", label,
    notes: "16mm饰面完成层、600mm建议板幅、8mm阴影缝；板幅为表达参数，施工前排版复核。",
    source: "manual", status: "confirmed", quantity: 1,
    material: "woodVeneer", wallId: hostWallId, heightRange: { minMm: 120, maxMm: 2600 },
    wallFinishZone: { startOffsetMm, endOffsetMm, bottomMm: 120, topMm: 2600, buildUpMm: 16, panelWidthMm: 600, seamWidthMm: 8, seamDepthMm: 6, cornerRadiusMm: 22, materialResourceId: "showroomWarmOakVertical" },
    verificationMeta: estimated("依据1F客厅和厨房相邻墙面照片提取造型；不改变结构墙线", 30),
    createdAt: now, updatedAt: now
  });
}

drawing("C-1F-LIVING-PERIMETER-N").coveProfile = {
  pathMm: [{ x: 3976, y: 3150 }, { x: 9195, y: 3150 }, { x: 9195, y: 7500 }, { x: 4197, y: 7500 }, { x: 4197, y: 5250 }],
  dropMm: 80, bandWidthMm: 300, lipMm: 35, cornerRadiusMm: 180, emitterOffsetMm: 35
};
drawing("C-1F-BEDROOM-PERIMETER-N").coveProfile = {
  pathMm: [{ x: 1250, y: 5250 }, { x: 3597, y: 5250 }, { x: 3597, y: 7500 }, { x: 1250, y: 7500 }, { x: 1250, y: 5250 }],
  dropMm: 80, bandWidthMm: 300, lipMm: 35, cornerRadiusMm: 120, emitterOffsetMm: 35
};
const linearPaths = {
  "L-1F-SHOWROOM-LIVING-COVE-01": [{ x: 3976, y: 3150 }, { x: 9195, y: 3150 }, { x: 9195, y: 7500 }, { x: 4197, y: 7500 }, { x: 4197, y: 5250 }],
  "L-1F-SHOWROOM-BEDROOM-COVE-01": [{ x: 1250, y: 5250 }, { x: 3597, y: 5250 }, { x: 3597, y: 7500 }, { x: 1250, y: 7500 }, { x: 1250, y: 5250 }],
  "L-1F-V1-07": [{ x: 5480, y: 675 }, { x: 7480, y: 675 }],
  "L-1F-V1-08": [{ x: 5820, y: 550 }, { x: 5820, y: 2580 }],
  "L-1F-V1-09": [{ x: 7296, y: 550 }, { x: 7296, y: 1880 }],
  "L-1F-V1-20": [{ x: 3565, y: 5260 }, { x: 3565, y: 7650 }],
  "L-1F-V1-23": [{ x: 1250, y: 7650 }, { x: 3597, y: 7650 }],
  "L-1F-V1-29": [{ x: 4200, y: 7650 }, { x: 9150, y: 7650 }],
  "L-1F-V1-34": [{ x: 9325, y: 5350 }, { x: 9325, y: 6900 }]
};
for (const [id, pathMm] of Object.entries(linearPaths)) {
  const item = drawing(id);
  item.linearLightPath = { pathMm, widthMm: /COVE/.test(id) ? 22 : 16, diffuserDepthMm: 12, offsetBelowHostMm: 0, throwDistanceMm: /COVE/.test(id) ? 2200 : 1300, continuous: true };
  item.updatedAt = now;
}

const kitchenTour = tour("tour-1F-ROOM-1F-002");
kitchenTour.cameraPosition = { x: 0.78, y: 2.3, z: -1.92 };
kitchenTour.target = { x: 0.05, y: 0.92, z: -3.02 };
kitchenTour.yaw = Math.PI;
kitchenTour.pitch = -0.68;
kitchenTour.fov = 64;
kitchenTour.compositionMode = "authored";
kitchenTour.clearSelectionOnActivate = true;
kitchenTour.linkedNodeIds = ["tour-1F-KITCHEN-WORKTOP-001"];
kitchenTour.description = "从厨房入口上方斜看完整操作区，同时交代左侧灶台、窗下大单槽和右侧冰箱位；进入视角时取消编辑高亮。";
const worktopTour = workspace.roomTourViews.find((item) => item.id === "tour-1F-KITCHEN-WORKTOP-001") ?? {
  id: "tour-1F-KITCHEN-WORKTOP-001", floorId: "1F", roomId: "ROOM-1F-002", name: "厨房台面检查", type: "viewpoint", status: "active"
};
Object.assign(worktopTour, {
  cameraPosition: { x: 0.62, y: 1.65, z: -2.05 }, target: { x: 0.02, y: 0.93, z: -3.08 },
  yaw: -2.614, pitch: -0.544, fov: 72, compositionMode: "authored", clearSelectionOnActivate: true,
  linkedNodeIds: ["tour-1F-ROOM-1F-002"],
  description: "厨房台面专项检查视角：以正常站立视线略向下观察，确认左侧灶台与窗下单槽同时可见，不改变柜体或设备尺寸。"
});
if (!workspace.roomTourViews.some((item) => item.id === worktopTour.id)) workspace.roomTourViews.push(worktopTour);
tour("tour-1F-ROOM-1F-005").fov = 55;
tour("tour-1F-ROOM-1F-005").compositionMode = "authored";
tour("tour-1F-ROOM-1F-004").fov = 54;
tour("tour-1F-ROOM-1F-004").compositionMode = "authored";

workspace.furniture = workspace.furniture.filter((item) => !(item.floorId === "1F" && /地毯|地垫|rug|carpet/i.test(`${item.name} ${item.material} ${item.catalogId ?? ""}`)));
if (JSON.stringify(furniture("module-1f-table-001")) !== immutableTable) throw new Error("Dining table changed unexpectedly");
if (JSON.stringify(furniture("furn-kitchen-entry-island-001")) !== immutableIsland) throw new Error("Entry island changed unexpectedly");
const nextStructuralSnapshot = JSON.stringify({
  rooms: structure.rooms.map(({ surfaceFinishes, verificationMeta, ...item }) => item),
  walls: structure.walls.map(({ surfaceFinish, surfaceFinishByRoomId, verificationMeta, ...item }) => item),
  doors: structure.doors,
  windows: structure.windows,
  bayWindows: structure.bayWindows,
  stairs: structure.stairs.map(({ visual, verificationMeta, ...item }) => item)
});
if (nextStructuralSnapshot !== structuralSnapshot) throw new Error("Structural geometry changed unexpectedly");
if (structure.windows.some((item) => item.hostId === "W-1F-011")) throw new Error("Middle-unit east living wall must remain solid");

workspace.updatedAt = now;
workspace.savedAt = now;
workspace.revision = Math.max(Number(workspace.revision) || 0, 12);
workspace.dataRevision = "2026-08-03-unified-pbr-material-language-v1";
workspace.drawingPackage.updatedAt = now;
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);
console.log("Applied 1F expression upgrade: reusable finish zones, coves, linear lights, PBR resources, kitchen cutouts, clearance fixes and camera refinement.");
