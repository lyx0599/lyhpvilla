import fs from "node:fs";
import path from "node:path";

import {
  createModernWarmNaturalFloorScenes,
  MODERN_WARM_NATURAL_STYLE_PRESET,
  modernWarmNaturalCanonicalTokens,
  modernWarmNaturalLegacyMaterialMappings,
  modernWarmNaturalLightingPolicy,
  modernWarmNaturalShowroomCalibration
} from "../lib/modern-warm-natural-system.ts";

const root = process.cwd();
const workspacePath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260811-before-2f-shared-visual-contract-v16.json");
const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
if (!fs.existsSync(backupPath)) fs.copyFileSync(workspacePath, backupPath);

const clone = (value) => JSON.parse(JSON.stringify(value));
const stripFinishes = (structure) => JSON.parse(JSON.stringify(structure, (key, value) => ["surfaceFinishes", "verificationMeta"].includes(key) ? undefined : value));
const frozenStructure = JSON.stringify(stripFinishes(workspace.houseStructuresByFloor["2F"]));
const frozenFurniturePlacement = JSON.stringify(workspace.furniture
  .filter((item) => item.floorId === "2F")
  .map(({ id, hostWallId, position, dimensions }) => ({ id, hostWallId, position, dimensions })));
const frozenCameras = JSON.stringify(workspace.cameraViews.filter((camera) => camera.floor === "2F"));

const canonical = new Set(modernWarmNaturalCanonicalTokens);
const localCanonicalMappings = {
  ...modernWarmNaturalLegacyMaterialMappings,
  lightOak: "warmOak",
  creamBoucle: "beigeFabric",
  creamFabric: "beigeFabric",
  greigeLinen: "beigeFabric",
  taupeFabric: "beigeFabric",
  agedBrass: "brushedBronze"
};
const materialKeys = ["primaryMaterial", "secondaryMaterial", "accentMaterial"];

function canonicalToken(value) {
  const mapped = localCanonicalMappings[value] ?? value;
  if (!canonical.has(mapped)) throw new Error(`2F material ${value} cannot resolve to the shared canonical catalog.`);
  return mapped;
}

function applyResource(render, materialKey) {
  const token = render[materialKey];
  const resourceKey = `${materialKey}ResourceId`;
  const resourceId = modernWarmNaturalShowroomCalibration[token];
  if (resourceId) render[resourceKey] = resourceId;
  else delete render[resourceKey];
}

for (const item of workspace.furniture.filter((candidate) => candidate.floorId === "2F" && candidate.render3d)) {
  const render = item.render3d;
  render.stylePreset = MODERN_WARM_NATURAL_STYLE_PRESET;
  for (const materialKey of materialKeys) {
    render[materialKey] = canonicalToken(render[materialKey]);
    applyResource(render, materialKey);
  }
  if (render.cabinetMaterialOverrides) {
    for (const part of Object.keys(render.cabinetMaterialOverrides)) {
      render.cabinetMaterialOverrides[part] = canonicalToken(render.cabinetMaterialOverrides[part]);
    }
  }
}

const structure = workspace.houseStructuresByFloor["2F"];
const dryRoomIds = new Set(["ROOM-2F-002", "ROOM-2F-004", "ROOM-2F-005", "ROOM-2F-006", "ROOM-2F-007", "ROOM-2F-008"]);
const wetRoomIds = new Set(["ROOM-2F-001", "ROOM-2F-003"]);
const dryFloor = {
  material: "woodFloor",
  name: "自然浅烟熏橡木宽板",
  baseColor: "#b7926b",
  jointColor: "#806044",
  textureAccent: "#d2b38e",
  roughness: 0.76,
  tileWidthMm: 200,
  tileLengthMm: 1800,
  seamWidthMm: 2,
  directionDeg: 0,
  textureScale: 4.6,
  materialRole: "floorMain",
  materialToken: "oakFloor"
};
const dryWall = {
  material: "mineralSilicatePaint",
  name: "暖象牙矿物墙面",
  baseColor: "#e8e0d2",
  textureAccent: "#cfc4b4",
  roughness: 0.9,
  textureScale: 2.2,
  materialRole: "wallBase",
  materialToken: "warmWhiteMineral",
  materialResourceId: modernWarmNaturalShowroomCalibration.warmWhiteMineral
};
const wetFloor = {
  material: "tile",
  name: "浅米洞石纹防滑瓷砖",
  baseColor: "#cdbd9f",
  jointColor: "#b39f82",
  textureAccent: "#eadcc4",
  roughness: 0.82,
  tileWidthMm: 300,
  tileLengthMm: 600,
  seamWidthMm: 2,
  directionDeg: 0,
  textureScale: 3.8,
  materialRole: "floorWet",
  materialToken: "wetAreaTile",
  materialResourceId: modernWarmNaturalShowroomCalibration.wetAreaTile
};
const wetWall = {
  material: "stone",
  name: "浅暖灰洞石大板墙面",
  baseColor: "#ded2bd",
  textureAccent: "#bcae98",
  roughness: 0.46,
  textureScale: 3.1,
  materialRole: "wallFeature",
  materialToken: "travertine",
  materialResourceId: modernWarmNaturalShowroomCalibration.travertine
};

for (const room of structure.rooms) {
  room.surfaceFinishes ??= {};
  if (dryRoomIds.has(room.id)) {
    room.surfaceFinishes.floor = clone(dryFloor);
    room.surfaceFinishes.wall = clone(dryWall);
  } else if (wetRoomIds.has(room.id)) {
    room.surfaceFinishes.floor = clone(wetFloor);
    room.surfaceFinishes.wall = clone(wetWall);
  }
}

for (const outdoor of structure.outdoors) {
  if (!["OD-2F-BALCONY-01", "OD-2F-BALCONY-02"].includes(outdoor.id)) continue;
  outdoor.verificationMeta = {
    status: "estimated",
    source: "manual-input",
    sourceNote: "2026-08-10用户确认的2F独立封闭阳台方案；施工前按开发商图纸及现场完成面复尺。",
    toleranceMm: 100
  };
}
for (const [furnitureId, outdoorId] of [
  ["furn-2f-balcony-01-cabinet", "OD-2F-BALCONY-01"],
  ["furn-2f-balcony-02-cabinet", "OD-2F-BALCONY-02"]
]) {
  const item = workspace.furniture.find((candidate) => candidate.id === furnitureId);
  if (!item) throw new Error(`Missing ${furnitureId}.`);
  item.roomId = outdoorId;
  item.outdoorId = outdoorId;
}

for (const light of workspace.drawingItems.filter((item) => item.floorId === "2F" && item.category === "light")) {
  const fixtureFamily = light.lightSpec?.fixtureFamily;
  const temperature = modernWarmNaturalLightingPolicy.fixtureExceptions[fixtureFamily]
    ?? modernWarmNaturalLightingPolicy.colorTemperatureByLayer[light.lightingLayer]
    ?? light.colorTemperature
    ?? light.lightColorTemperature;
  light.colorTemperature = temperature;
  light.lightColorTemperature = temperature;
  if (light.lightSpec) {
    const preciseTask = ["task", "cabinetStrip", "mirrorLight"].includes(light.lightingLayer);
    light.lightSpec.cri = Math.max(light.lightSpec.cri ?? 0, preciseTask ? 95 : 90);
  }
  if (typeof light.generatedFingerprint === "string") {
    const fingerprint = JSON.parse(light.generatedFingerprint);
    fingerprint.colorTemperature = temperature;
    fingerprint.lightColorTemperature = temperature;
    if (fingerprint.lightSpec) fingerprint.lightSpec.cri = light.lightSpec?.cri;
    light.generatedFingerprint = JSON.stringify(fingerprint);
  }
}

const twoFScenes = createModernWarmNaturalFloorScenes(workspace.drawingItems, "2F");
workspace.lightingDesign.scenes = [
  ...(workspace.lightingDesign.scenes ?? []).filter((scene) => scene.floorId !== "2F"),
  ...twoFScenes
];
for (const view of workspace.roomTourViews.filter((candidate) => candidate.floorId === "2F")) {
  view.recommendedLightingSceneId = "SCENE-MWN-V1-2F-NIGHT";
}

workspace.dataRevision = "2026-08-03-unified-pbr-material-language-v1";
workspace.updatedAt = new Date().toISOString();

if (JSON.stringify(stripFinishes(workspace.houseStructuresByFloor["2F"])) !== frozenStructure) throw new Error("2F structure changed outside room finishes.");
if (JSON.stringify(workspace.furniture
  .filter((item) => item.floorId === "2F")
  .map(({ id, hostWallId, position, dimensions }) => ({ id, hostWallId, position, dimensions }))) !== frozenFurniturePlacement) throw new Error("2F furniture geometry changed.");
if (JSON.stringify(workspace.cameraViews.filter((camera) => camera.floor === "2F")) !== frozenCameras) throw new Error("2F cameras changed.");

fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);
console.log(JSON.stringify({
  application: "2F-shared-visual-contract-v16-20260811",
  dataRevision: workspace.dataRevision,
  furniture: workspace.furniture.filter((item) => item.floorId === "2F").length,
  rooms: structure.rooms.length,
  lights: workspace.drawingItems.filter((item) => item.floorId === "2F" && item.category === "light").length,
  scenes: twoFScenes.map((scene) => scene.id),
  preserved: ["layout", "furniture placement", "doors/windows", "ten cameras"]
}, null, 2));
