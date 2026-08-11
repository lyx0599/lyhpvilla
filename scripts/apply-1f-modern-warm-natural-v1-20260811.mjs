import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspacePath = path.join(root, "data/default-workspace.json");
const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));

const fail = (message) => { throw new Error(`[1F modern warm natural v1] ${message}`); };
const one = (items, predicate, label) => {
  const matches = items.filter(predicate);
  if (matches.length !== 1) fail(`${label}: expected exactly one target, found ${matches.length}`);
  return matches[0];
};

const oneFloor = one(workspace.houseStructuresByFloor?.["1F"] ? [workspace.houseStructuresByFloor["1F"]] : [], () => true, "1F structure");
const rooms = oneFloor.rooms ?? [];

const warmGreyPublicFloor = {
  material: "stone",
  name: "暖灰石灰岩大板地面",
  baseColor: "#d8d1c6",
  jointColor: "#b8afa3",
  textureAccent: "#aaa196",
  roughness: 0.52,
  tileWidthMm: 600,
  tileLengthMm: 1200,
  seamWidthMm: 2,
  directionDeg: 0,
  textureScale: 4.2,
  materialRole: "floorMain",
  materialToken: "warmGreyStone",
  materialResourceId: "showroomWarmGreyLimestoneFloor"
};

const warmWhiteWall = {
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

for (const roomId of ["ROOM-1F-001", "ROOM-1F-002", "ROOM-1F-005", "ROOM-1F-006"]) {
  const room = one(rooms, (candidate) => candidate.id === roomId, roomId);
  room.surfaceFinishes ??= {};
  room.surfaceFinishes.floor = { ...warmGreyPublicFloor };
  room.surfaceFinishes.wall = { ...warmWhiteWall };
}

const bedroom = one(rooms, (room) => room.id === "ROOM-1F-004", "ROOM-1F-004");
bedroom.surfaceFinishes ??= {};
bedroom.surfaceFinishes.wall = { ...warmWhiteWall };

const canonicalAlias = new Map([
  ["creamFabric", "beigeFabric"],
  ["creamBoucle", "beigeFabric"],
  ["greigeLinen", "beigeFabric"],
  ["taupeFabric", "beigeFabric"],
  ["brushedBronze", "blackTitanium"],
  ["agedBrass", "blackTitanium"],
  ["oatTaupeLacquer", "warmWhiteMineral"]
]);

const calibrationFor = {
  warmWhiteMineral: "showroomLimePlaster",
  warmOak: "showroomWarmOakVertical",
  travertine: "showroomWarmVeinedStone",
  warmGreyStone: "showroomWarmGreyLimestoneFloor",
  beigeFabric: "showroomWovenHeadboard",
  blackTitanium: "showroomDarkBronze",
  wetAreaTile: "polyhavenWarmBeigeTile08"
};

for (const item of workspace.furniture.filter((candidate) => candidate.floorId === "1F" && candidate.render3d)) {
  const render = item.render3d;
  render.stylePreset = "modernNatural";
  for (const key of ["primaryMaterial", "secondaryMaterial", "accentMaterial"]) {
    render[key] = canonicalAlias.get(render[key]) ?? render[key];
    const resourceKey = `${key}ResourceId`;
    if (calibrationFor[render[key]]) render[resourceKey] = calibrationFor[render[key]];
    else delete render[resourceKey];
  }
  if (render.cabinetMaterialOverrides) {
    for (const key of Object.keys(render.cabinetMaterialOverrides)) {
      render.cabinetMaterialOverrides[key] = canonicalAlias.get(render.cabinetMaterialOverrides[key]) ?? render.cabinetMaterialOverrides[key];
    }
  }
}

const table = one(workspace.furniture, (item) => item.id === "module-1f-table-001", "1F powered dining table");
table.render3d.primaryMaterial = "warmOak";
table.render3d.primaryMaterialResourceId = "showroomWarmOakVertical";
table.render3d.secondaryMaterial = "beigeFabric";
table.render3d.secondaryMaterialResourceId = "showroomWovenHeadboard";
table.render3d.accentMaterial = "blackTitanium";
table.render3d.accentMaterialResourceId = "showroomDarkBronze";

const sofa = one(workspace.furniture, (item) => item.id === "furn-1f-living-main-sofa-001", "1F curved sofa");
sofa.render3d.primaryMaterial = "beigeFabric";
sofa.render3d.secondaryMaterial = "beigeFabric";
sofa.render3d.primaryMaterialResourceId = "showroomWovenHeadboard";
sofa.render3d.secondaryMaterialResourceId = "showroomWovenHeadboard";

const bedroomCamera = one(workspace.cameraViews ?? [], (camera) => camera.id === "designer-camera-1f-09-bedroom", "1F bedroom camera");
bedroomCamera.cameraPosition = { x: -3.02, y: 1.43, z: 0.92 };
bedroomCamera.target = { x: -3.72, y: 1.0, z: 2.92 };
bedroomCamera.fov = 42;
bedroomCamera.zoom = 1.02;
bedroomCamera.description = "从北墙东端卧室门内侧朝西南看：南墙中央1200mm飘窗必须位于画面远端；1500×2000mm床靠西、床头朝北，东墙700×450×1750mm半开放衣帽架与床平行。北墙东端900mm门洞，门扇内开贴东墙。禁止在西墙新增窗户、禁止镜像、斜放、广角拉伸和床上方吊柜。";

const kitchenEntryCamera = one(workspace.cameraViews ?? [], (camera) => camera.id === "designer-camera-1f-06-kitchen-entry", "1F kitchen entry camera");
kitchenEntryCamera.cameraPosition = { x: 0.5, y: 1.55, z: -1.1 };
kitchenEntryCamera.target = { x: 0.5, y: 1.02, z: -3.25 };
kitchenEntryCamera.fov = 48;
kitchenEntryCamera.zoom = 1.02;

const bathroomCamera = one(workspace.cameraViews ?? [], (camera) => camera.id === "designer-camera-1f-07-kitchen-worktop", "1F bathroom camera");
bathroomCamera.cameraPosition = { x: 2.62, y: 1.52, z: -1.55 };
bathroomCamera.target = { x: 2.62, y: 1.08, z: -3.42 };
bathroomCamera.fov = 48;
bathroomCamera.zoom = 1.02;
bathroomCamera.targetArea = "ROOM-1F-003";

const stairCamera = one(workspace.cameraViews ?? [], (camera) => camera.id === "designer-camera-1f-10-stair-public-route", "1F stair camera");
stairCamera.cameraPosition = { x: -1.55, y: 1.56, z: 0.15 };
stairCamera.target = { x: -3.55, y: 0.86, z: -0.45 };
stairCamera.fov = 44;
stairCamera.zoom = 1.04;

const fixtureTemperature = (light) => {
  const fixture = light.lightSpec?.fixtureFamily;
  if (["bed-reading", "night-light", "step-light", "round-table-pendant", "curtain-strip"].includes(fixture)) return "2700K";
  if (["yard-task"].includes(fixture)) return "3000K";
  return ({ ambient: "3000K", task: "3000K", accent: "2700K", decorative: "2700K", cabinetStrip: "3000K", mirrorLight: "3000K", outdoor: "2700K" })[light.lightingLayer] ?? light.colorTemperature;
};

const oneFLights = workspace.drawingItems.filter((item) => item.floorId === "1F" && item.category === "light");
for (const light of oneFLights) {
  if (light.lightSpec?.fixtureFamily === "desk-task") light.lightSpec.fixtureFamily = "deep-cup-downlight";
  const temperature = fixtureTemperature(light);
  light.colorTemperature = temperature;
  light.lightColorTemperature = temperature;
  if (typeof light.generatedFingerprint === "string") {
    try {
      const fingerprint = JSON.parse(light.generatedFingerprint);
      fingerprint.colorTemperature = temperature;
      fingerprint.lightColorTemperature = temperature;
      if (fingerprint.lightSpec?.fixtureFamily === "desk-task") fingerprint.lightSpec.fixtureFamily = "deep-cup-downlight";
      light.generatedFingerprint = JSON.stringify(fingerprint);
    } catch {
      fail(`invalid generatedFingerprint on ${light.id}`);
    }
  }
}

for (const family of workspace.lightingDesign?.fixtureFamilies ?? []) {
  if (["deep-cup-downlight", "wide-downlight"].includes(family.id)) family.defaultColorTemperature = "3000K";
  family.notes = "全屋现代暖自然母体系 v1 统一灯具家族；基础/任务光3000K，重点/氛围/低位光2700K，低眩、低反光，品牌与IES配光待选型。";
}

const layers = ["ambient", "task", "accent", "decorative", "cabinetStrip", "mirrorLight", "outdoor"];
const sceneBrightness = {
  daylight: { ambient: 20, task: 25, accent: 15, decorative: 0, cabinetStrip: 20, mirrorLight: 30, outdoor: 0 },
  daily: { ambient: 72, task: 72, accent: 42, decorative: 32, cabinetStrip: 55, mirrorLight: 70, outdoor: 20 },
  activity: { ambient: 58, task: 92, accent: 68, decorative: 56, cabinetStrip: 82, mirrorLight: 65, outdoor: 15 },
  night: { ambient: 0, task: 0, accent: 12, decorative: 15, cabinetStrip: 8, mirrorLight: 0, outdoor: 12 },
  cleaning: { ambient: 100, task: 100, accent: 70, decorative: 40, cabinetStrip: 100, mirrorLight: 100, outdoor: 65 }
};
const displayName = { daylight: "日光", daily: "日常", activity: "晚餐 / 社交", night: "夜间", cleaning: "清洁" };
const groups = new Map();
for (const light of oneFLights.filter((item) => item.controlGroupId)) {
  const group = groups.get(light.controlGroupId) ?? [];
  group.push(light);
  groups.set(light.controlGroupId, group);
}
const canonicalScenes = Object.entries(sceneBrightness).map(([key, brightnessByLayer]) => ({
  id: `SCENE-MWN-V1-1F-${key.toUpperCase()}`,
  name: `1F ${displayName[key]}`,
  floorId: "1F",
  category: "room",
  groupStates: Array.from(groups.entries()).map(([controlGroupId, groupLights]) => {
    const layer = groupLights.find((light) => layers.includes(light.lightingLayer))?.lightingLayer ?? "ambient";
    const brightness = brightnessByLayer[layer];
    return { controlGroupId, on: brightness > 0, brightness };
  }),
  notes: "modern-warm-natural-v1：只记录1F控制组状态；亮度为楼层profile覆盖，灯具身份与层级全屋共享。",
  status: "draft"
}));

workspace.lightingDesign.scenes = [
  ...(workspace.lightingDesign.scenes ?? []).filter((scene) => scene.floorId !== "1F"),
  ...canonicalScenes
];

const oneFViewSceneBindings = {
  "lighting-view-1f-living-gathering": "SCENE-MWN-V1-1F-DAILY",
  "lighting-view-1f-living-movie": "SCENE-MWN-V1-1F-NIGHT",
  "lighting-view-1f-dining": "SCENE-MWN-V1-1F-ACTIVITY",
  "lighting-view-1f-kitchen": "SCENE-MWN-V1-1F-ACTIVITY",
  "lighting-view-1f-stair-night": "SCENE-MWN-V1-1F-NIGHT"
};
for (const [viewId, sceneId] of Object.entries(oneFViewSceneBindings)) {
  const view = one(workspace.roomTourViews ?? [], (candidate) => candidate.id === viewId, viewId);
  view.recommendedLightingSceneId = sceneId;
  view.description = `${view.name} · 推荐场景：${sceneId}`;
}

workspace.dataRevision = "2026-08-03-unified-pbr-material-language-v1";
workspace.updatedAt = "2026-08-11T12:00:00.000+08:00";
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(JSON.stringify({
  workspacePath,
  changedRooms: ["ROOM-1F-001", "ROOM-1F-002", "ROOM-1F-004", "ROOM-1F-005", "ROOM-1F-006"],
  styledFurniture: workspace.furniture.filter((item) => item.floorId === "1F" && item.render3d).length,
  oneFLights: oneFLights.length,
  oneFScenes: canonicalScenes.map((scene) => scene.id),
  b1ScenesPreserved: workspace.lightingDesign.scenes.filter((scene) => scene.floorId === "B1").length
}, null, 2));
