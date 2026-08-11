import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runRenderPreflight } from "../lib/render-preflight.ts";

const structure = {
  floorId: "1F",
  storyHeightMm: 2800,
  coordinateSystem: { width: 10000, height: 8000 },
  rooms: [{
    id: "ROOM-1F-TEST",
    name: "测试客厅",
    boundary: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 8000 }, { x: 0, y: 8000 }],
    surfaceFinishes: {
      floor: { name: "暖灰微水泥", material: "microcement", materialToken: "microCement" },
      wall: { name: "暖白矿物墙漆", material: "lime plaster", materialToken: "warmWhiteMineral" }
    }
  }],
  outdoors: [],
  walls: [
    { id: "W-N", name: "北墙", kind: "straight", start: { x: 0, y: 0 }, end: { x: 10000, y: 0 }, height: 2800, thickness: 200 },
    { id: "W-E", name: "东墙", kind: "straight", start: { x: 10000, y: 0 }, end: { x: 10000, y: 8000 }, height: 2800, thickness: 200 },
    { id: "W-S", name: "南墙", kind: "straight", start: { x: 10000, y: 8000 }, end: { x: 0, y: 8000 }, height: 2800, thickness: 200 },
    { id: "W-W", name: "西墙", kind: "straight", start: { x: 0, y: 8000 }, end: { x: 0, y: 0 }, height: 2800, thickness: 200 }
  ],
  partitions: [],
  columns: [],
  bayWindows: [],
  doors: [],
  windows: [],
  stairs: [],
  fences: [],
  outdoorSurfaces: [],
  skylights: []
};

const furniture = [{
  id: "SOFA-TEST",
  name: "测试沙发",
  floorId: "1F",
  roomId: "ROOM-1F-TEST",
  type: "sofa",
  position: { x: 5600, y: 4200, rotation: 0 },
  dimensions: { width: 220, depth: 90, height: 80 },
  render3d: { assetType: "sofa", variantId: "test", primaryMaterial: "warmOak", visibleIn3d: true }
}];

const drawingItems = [{
  id: "LIGHT-TEST",
  floorId: "1F",
  roomId: "ROOM-1F-TEST",
  relatedRoomId: "ROOM-1F-TEST",
  category: "light",
  type: "downlight",
  label: "测试筒灯",
  colorTemperature: "3000K",
  controlGroupId: "LIGHT-GROUP-TEST",
  lightSpec: { fixtureFamily: "FIXTURE-DOWNLIGHT", cri: 95, powerW: 8 }
}];

const lightingDesign = {
  fixtureFamilies: [{ id: "FIXTURE-DOWNLIGHT", name: "统一筒灯" }],
  scenes: [{ id: "SCENE-DAILY", name: "日常", groupStates: [{ controlGroupId: "LIGHT-GROUP-TEST", on: true, brightness: 80 }] }]
};

const camera = {
  id: "CAMERA-TEST",
  name: "客厅整体",
  floor: "1F",
  cameraPosition: { x: 0, y: 1.55, z: 2.6 },
  target: { x: 0, y: 0.9, z: -1.8 },
  fov: 48,
  focus: { kind: "room", floorId: "1F", roomId: "ROOM-1F-TEST", label: "测试客厅" }
};

const baseInput = {
  floorId: "1F",
  structure,
  structuresByFloor: { "1F": structure },
  furniture,
  drawingItems,
  lightingDesign,
  camera,
  presentationMode: true,
  materialPreview: true,
  wallDisplayMode: "full",
  roomCeilingMode: "solid",
  cameraCollisionEnabled: true,
  lightingScene: "dayWithLights",
  lightingSceneId: "SCENE-DAILY",
  enabledLightCount: 1,
  knownRenderMaterialTokens: new Set(["warmOak"]),
  knownPbrMaterialTokens: new Set(["microCement", "warmWhiteMineral", "warmGreyStone", "oakFloor"]),
  sceneEvidence: { inspected: true, visibleObjectIds: ["SOFA-TEST"], cameraInsideObjectIds: [] }
};

const ready = runRenderPreflight(baseInput);
assert.equal(ready.status, "ready", ready.summary);
assert.equal(ready.errorCount, 0);
assert.equal(ready.warningCount, 0);

for (const floorFinish of [
  { name: "暖灰石灰岩大板地面", material: "warm limestone slab", materialToken: "warmGreyStone" },
  { name: "自然浅烟熏橡木宽板", material: "oak timber floor", materialToken: "oakFloor" }
]) {
  const compatibleFinish = runRenderPreflight({
    ...baseInput,
    structure: { ...structure, rooms: [{ ...structure.rooms[0], surfaceFinishes: { ...structure.rooms[0].surfaceFinishes, floor: floorFinish } }] }
  });
  assert.ok(!compatibleFinish.issues.some((issue) => issue.code === "SURFACE_MATERIAL_SEMANTIC_MISMATCH"), `${floorFinish.name} must retain its physical material identity`);
}

const unsafeSettings = runRenderPreflight({
  ...baseInput,
  camera: { ...camera, fov: 72 },
  presentationMode: false,
  materialPreview: false,
  wallDisplayMode: "cutaway"
});
assert.equal(unsafeSettings.status, "blocked");
assert.ok(unsafeSettings.issues.some((issue) => issue.code === "CAMERA_FOV_BLOCKING"));
assert.ok(unsafeSettings.issues.some((issue) => issue.code === "MATERIAL_PREVIEW_DISABLED"));
assert.ok(unsafeSettings.issues.some((issue) => issue.code === "WALL_CUTAWAY_ACTIVE"));

const cameraInWall = runRenderPreflight({
  ...baseInput,
  camera: { ...camera, cameraPosition: { x: -5, y: 1.55, z: 0 }, target: { x: -2, y: 0.9, z: 0 } }
});
assert.ok(cameraInWall.issues.some((issue) => issue.code === "CAMERA_INSIDE_WALL"));

const duplicateFurniture = runRenderPreflight({
  ...baseInput,
  furniture: [...furniture, { ...furniture[0], id: "SOFA-TEST-COPY" }]
});
assert.ok(duplicateFurniture.issues.some((issue) => issue.code === "DUPLICATE_FURNITURE_GEOMETRY"));

const materialMismatch = runRenderPreflight({
  ...baseInput,
  furniture: [{ ...furniture[0], render3d: { ...furniture[0].render3d, primaryMaterial: "inventedMaterial" } }]
});
assert.ok(materialMismatch.issues.some((issue) => issue.code === "UNKNOWN_FURNITURE_MATERIAL"));

const visibilityMismatch = runRenderPreflight({
  ...baseInput,
  camera: { ...camera, focus: { kind: "object", floorId: "1F", roomId: "ROOM-1F-TEST", objectId: "SOFA-TEST", label: "测试沙发" } },
  sceneEvidence: { inspected: true, visibleObjectIds: [], cameraInsideObjectIds: [] }
});
assert.ok(visibilityMismatch.issues.some((issue) => issue.code === "FOCUS_OBJECT_OUT_OF_FRAME"));

const source = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
assert.match(source, /data-render-preflight-status/);
assert.match(source, /渲染已阻止/);
assert.match(source, /collectRenderSceneEvidence/);

console.log("Render preflight geometry, camera, material, lighting, visibility, and export-gate checks passed.");
