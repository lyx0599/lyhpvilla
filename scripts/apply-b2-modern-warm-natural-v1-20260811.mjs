import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createModernWarmNaturalFloorScenes,
  modernWarmNaturalCanonicalTokens,
  modernWarmNaturalLightingPolicy,
  modernWarmNaturalShowroomCalibration
} from "../lib/modern-warm-natural-system.ts";

const fail = (message) => { throw new Error(`[B2 modern warm natural v1] ${message}`); };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceArgIndex = process.argv.indexOf("--workspace");
const workspacePath = workspaceArgIndex >= 0
  ? path.resolve(process.argv[workspaceArgIndex + 1] ?? fail("--workspace requires a file path"))
  : path.join(root, "data/default-workspace.json");
const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));

const canonicalTokens = new Set(modernWarmNaturalCanonicalTokens);

const stableSnapshot = (value) => JSON.stringify(value);
const nonB2Snapshot = () => stableSnapshot({
  furniture: workspace.furniture.filter((item) => item.floorId !== "B2"),
  drawingItems: workspace.drawingItems.filter((item) => item.floorId !== "B2"),
  houseStructuresByFloor: Object.fromEntries(Object.entries(workspace.houseStructuresByFloor ?? {}).filter(([floorId]) => floorId !== "B2")),
  scenes: (workspace.lightingDesign?.scenes ?? []).filter((scene) => scene.floorId !== "B2"),
  roomTourViews: (workspace.roomTourViews ?? []).filter((view) => view.floorId !== "B2"),
  cameraViews: (workspace.cameraViews ?? []).filter((view) => view.floorId !== "B2" && view.floor !== "B2")
});
const b2GeometrySnapshot = () => stableSnapshot({
  furniture: workspace.furniture.filter((item) => item.floorId === "B2").map((item) => ({
    id: item.id,
    roomId: item.roomId,
    type: item.type,
    moduleType: item.moduleType,
    dimensions: item.dimensions,
    position: item.position,
    elevationMm: item.render3d?.elevationMm,
    variantId: item.render3d?.variantId,
    seatCount: item.render3d?.seatCount,
    cabinetVisual: item.render3d?.cabinetVisual,
    wetAreaVisual: item.render3d?.wetAreaVisual
  })),
  nonLightDrawingItems: workspace.drawingItems.filter((item) => item.floorId === "B2" && item.category !== "light"),
  cameras: (workspace.cameraViews ?? []).filter((view) => view.floorId === "B2" || view.floor === "B2")
});

const beforeNonB2 = nonB2Snapshot();
const beforeB2Geometry = b2GeometrySnapshot();

const materialResources = modernWarmNaturalShowroomCalibration;

const furnitureMaterials = {
  "furn-b2-living-tv-console-001": ["microCement", "darkWalnut", "brushedBronze"],
  "furn-b2-living-large-tv-001": ["blackTitanium", "smokedGlass", "blackTitanium"],
  "furn-b2-living-long-sofa-001": ["blackTopGrainLeather", "blackTopGrainLeather", "darkWalnut"],
  "furn-b2-entry-slim-foyer-cabinet-001": ["warmOak", "beigeFabric", "brushedBronze"],
  "furn-b2-entry-left-wall-foyer-001": ["warmOak", "warmWhiteMineral", "brushedBronze"],
  "furn-b2-activity-outdoor-pegboard-001": ["warmOak", "warmOak", "blackTitanium"],
  "furn-b2-study-souvenir-cabinet-001": ["darkWalnut", "clearGlass", "brushedBronze"],
  "furn-b2-study-slab-table-001": ["darkWalnut", "darkWalnut", "blackTitanium"],
  "furn-b2-under-stair-room-shell-001": ["warmWhiteMineral", "warmOak", "brushedBronze"],
  "furn-b2-under-stair-shelf-001": ["warmOak", "warmWhiteMineral", "blackTitanium"],
  "furn-b2-under-stair-shelf-002": ["warmOak", "warmWhiteMineral", "blackTitanium"],
  "furn-b2-under-stair-shelf-003": ["warmOak", "warmWhiteMineral", "blackTitanium"],
  "furn-b2-living-coffee-table-001": ["smokedGlass", "travertine", "brushedBronze"],
  "furn-b2-study-wine-cabinet-001": ["darkWalnut", "smokedGlass", "brushedBronze"],
  "furn-b2-study-handwash-001": ["darkWalnut", "travertine", "brushedBronze"]
};

const cabinetOverrides = {
  "furn-b2-living-tv-console-001": { door: "darkWalnut", carcass: "microCement", countertop: "microCement", glass: "smokedGlass", hardware: "brushedBronze" },
  "furn-b2-entry-slim-foyer-cabinet-001": { door: "warmWhiteMineral", carcass: "warmOak", countertop: "warmOak", glass: "clearGlass", hardware: "brushedBronze" },
  "furn-b2-entry-left-wall-foyer-001": { door: "warmWhiteMineral", carcass: "warmOak", countertop: "warmOak", glass: "clearGlass", hardware: "brushedBronze" },
  "furn-b2-study-souvenir-cabinet-001": { door: "darkWalnut", carcass: "darkWalnut", countertop: "warmOak", glass: "clearGlass", hardware: "brushedBronze" },
  "furn-b2-study-wine-cabinet-001": { door: "smokedGlass", carcass: "darkWalnut", countertop: "darkWalnut", glass: "smokedGlass", hardware: "brushedBronze" },
  "furn-b2-study-handwash-001": { door: "darkWalnut", carcass: "darkWalnut", countertop: "travertine", glass: "smokedGlass", hardware: "brushedBronze" }
};

for (const [itemId, materials] of Object.entries(furnitureMaterials)) {
  const item = workspace.furniture.find((candidate) => candidate.id === itemId);
  if (!item || item.floorId !== "B2" || !item.render3d) fail(`missing B2 render item ${itemId}`);
  for (const token of materials) if (!canonicalTokens.has(token)) fail(`${itemId} uses non-canonical material ${token}`);
  const [primaryMaterial, secondaryMaterial, accentMaterial] = materials;
  item.render3d = {
    ...item.render3d,
    detailLevel: "presentation",
    stylePreset: "modernNatural",
    styleSource: "manual",
    styleLocked: true,
    primaryMaterial,
    secondaryMaterial,
    accentMaterial
  };
  for (const [key, token] of [["primaryMaterialResourceId", primaryMaterial], ["secondaryMaterialResourceId", secondaryMaterial], ["accentMaterialResourceId", accentMaterial]]) {
    if (materialResources[token]) item.render3d[key] = materialResources[token];
    else delete item.render3d[key];
  }
  if (cabinetOverrides[itemId]) item.render3d.cabinetMaterialOverrides = cabinetOverrides[itemId];
}

const memorialCabinet = workspace.furniture.find((item) => item.id === "furn-b2-study-souvenir-cabinet-001");
if (!memorialCabinet) fail("missing B2 memorial cabinet");
memorialCabinet.hostWallId = "W-B2-008";
memorialCabinet.note = "沿西侧现状墙 W-B2-008 布置，南端做到墙角圆弧切点，形成2050mm五联圆角纪念品展示墙；大型乐高、旅行纪念品和纸质收藏分层陈列。";
if (memorialCabinet.constructionMeta) memorialCabinet.constructionMeta.wallDependency = "绑定西侧现状墙 W-B2-008，安装前按墙面完成面复尺并复核与圆弧柜的切线收口。";

const b2Structure = workspace.houseStructuresByFloor?.B2;
if (!b2Structure) fail("missing B2 structure");
const floorFinish = {
  material: "limestone",
  name: "暖灰石灰岩大面地坪",
  baseColor: "#b9ad99",
  jointColor: "#968977",
  textureAccent: "#c8bdab",
  roughness: 0.68,
  tileWidthMm: 600,
  tileLengthMm: 1200,
  seamWidthMm: 2,
  directionDeg: 0,
  textureScale: 4.2,
  materialRole: "floorMain",
  materialToken: "warmGreyStone",
  materialResourceId: "showroomWarmGreyLimestoneFloor"
};
const wallFinish = {
  material: "mineralSilicatePaint",
  name: "暖象牙矿物墙面",
  baseColor: "#e8e0d2",
  textureAccent: "#cfc4b4",
  roughness: 0.9,
  textureScale: 2.2,
  materialRole: "wallBase",
  materialToken: "warmWhiteMineral",
  materialResourceId: "showroomLimePlaster"
};
for (const room of b2Structure.rooms ?? []) {
  room.surfaceFinishes ??= {};
  room.surfaceFinishes.floor = { ...floorFinish };
  room.surfaceFinishes.wall = { ...wallFinish };
}

const fixtureTemperature = (light) => {
  const fixture = light.lightSpec?.fixtureFamily;
  return modernWarmNaturalLightingPolicy.fixtureExceptions[fixture]
    ?? modernWarmNaturalLightingPolicy.colorTemperatureByLayer[light.lightingLayer]
    ?? light.colorTemperature;
};
const b2Lights = workspace.drawingItems.filter((item) => item.floorId === "B2" && item.category === "light");
for (const light of b2Lights) {
  const temperature = fixtureTemperature(light);
  light.colorTemperature = temperature;
  light.lightColorTemperature = temperature;
  if (typeof light.generatedFingerprint === "string") {
    try {
      const fingerprint = JSON.parse(light.generatedFingerprint);
      fingerprint.colorTemperature = temperature;
      fingerprint.lightColorTemperature = temperature;
      light.generatedFingerprint = JSON.stringify(fingerprint);
    } catch {
      fail(`invalid generatedFingerprint on ${light.id}`);
    }
  }
}

workspace.lightingDesign ??= { fixtureFamilies: [], scenes: [] };
workspace.lightingDesign.scenes = [
  ...(workspace.lightingDesign.scenes ?? []).filter((scene) => scene.floorId !== "B2"),
  ...createModernWarmNaturalFloorScenes(workspace.drawingItems, "B2")
];

const b2RelaxView = (workspace.roomTourViews ?? []).find((view) => view.id === "lighting-view-b2-relax");
if (b2RelaxView) {
  b2RelaxView.recommendedLightingSceneId = "SCENE-MWN-V1-B2-NIGHT";
  b2RelaxView.description = `${b2RelaxView.name} · 推荐场景：SCENE-MWN-V1-B2-NIGHT（低照度观影）`;
}

assert.equal(nonB2Snapshot(), beforeNonB2, "migration must not alter 1F/B1/2F/YARD data");
assert.equal(b2GeometrySnapshot(), beforeB2Geometry, "migration must not alter B2 layout, furniture geometry or cameras");

workspace.updatedAt = "2026-08-11T18:00:00.000+08:00";
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  workspacePath,
  styledFurniture: Object.keys(furnitureMaterials).length,
  styledRooms: (b2Structure.rooms ?? []).map((room) => room.id),
  normalizedLights: b2Lights.length,
  scenes: workspace.lightingDesign.scenes.filter((scene) => scene.floorId === "B2").map((scene) => scene.id),
  reboundWallReferences: { "furn-b2-study-souvenir-cabinet-001": memorialCabinet.hostWallId },
  geometryPreserved: true,
  otherFloorsPreserved: true
}, null, 2));
