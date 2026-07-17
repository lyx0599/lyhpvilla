import { readFile, writeFile } from "node:fs/promises";
import { getDrawingItemGeneratedFingerprint } from "../lib/drawing-items.ts";
import { CURRENT_WORKSPACE_DATA_REVISION, CURRENT_WORKSPACE_SCHEMA_VERSION } from "../lib/workspace-migrations.ts";

const workspaceUrl = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspaceUrl, "utf8"));
const kitchenRoomIds = new Set(Object.values(workspace.houseStructuresByFloor)
  .flatMap((structure) => structure.rooms ?? [])
  .filter((room) => /厨房/.test(room.name))
  .map((room) => room.id));
const invalidLights = workspace.drawingItems.filter((item) => (
  item.category === "light"
  && kitchenRoomIds.has(item.relatedRoomId ?? item.roomId)
  && (item.lightingLayer === "mirrorLight" || /镜前灯|镜柜灯|马桶夜灯/.test(item.label))
));
const removedLightIds = new Set(invalidLights.map((item) => item.id));
const removedControlGroupIds = new Set(invalidLights.map((item) => item.controlGroupId).filter(Boolean));

workspace.drawingItems = workspace.drawingItems.filter((item) => (
  !removedLightIds.has(item.id)
  && !(item.category === "switch" && removedControlGroupIds.has(item.controlGroupId))
));
workspace.drawingItems.forEach((item) => {
  let changed = false;
  if (item.controlledLightIds?.some((id) => removedLightIds.has(id))) {
    item.controlledLightIds = item.controlledLightIds.filter((id) => !removedLightIds.has(id));
    changed = true;
  }
  if (item.relatedLightIds?.some((id) => removedLightIds.has(id))) {
    item.relatedLightIds = item.relatedLightIds.filter((id) => !removedLightIds.has(id));
    changed = true;
  }
  if (item.category === "light" && item.lightingLayer === "ambient") {
    item.lightSpec = {
      ...(item.lightSpec ?? {}),
      powerW: Math.max(item.lightSpec?.powerW ?? 0, 11),
      luminousFluxLm: Math.max(item.lightSpec?.luminousFluxLm ?? 0, 950)
    };
    changed = true;
  }
  if (changed && item.generatedKey) item.generatedFingerprint = getDrawingItemGeneratedFingerprint(item);
});

const ambientGroupIds = new Set(workspace.drawingItems
  .filter((item) => item.category === "light" && item.lightingLayer === "ambient")
  .map((item) => item.controlGroupId)
  .filter(Boolean));
const ambientMinimumByScene = new Map([
  ["日常", 85],
  ["会客", 75],
  ["烹饪", 85],
  ["1F 客厅日常会客", 80]
]);
workspace.lightingDesign.scenes.forEach((scene) => {
  const minimum = ambientMinimumByScene.get(scene.name);
  scene.groupStates = scene.groupStates
    .filter((state) => !removedControlGroupIds.has(state.controlGroupId))
    .map((state) => minimum && state.on && ambientGroupIds.has(state.controlGroupId) && state.brightness < minimum
      ? { ...state, brightness: minimum }
      : state);
});
const wideDownlight = workspace.lightingDesign.fixtureFamilies.find((family) => family.id === "wide-downlight");
if (wideDownlight) wideDownlight.defaultLightSpec = { ...wideDownlight.defaultLightSpec, powerW: 9, luminousFluxLm: 760 };
const validDrawingItemIds = new Set(workspace.drawingItems.map((item) => item.id));
workspace.drawingPackage.drawingItemIds = workspace.drawingPackage.drawingItemIds.filter((id) => validDrawingItemIds.has(id));
workspace.schemaVersion = CURRENT_WORKSPACE_SCHEMA_VERSION;
workspace.dataRevision = CURRENT_WORKSPACE_DATA_REVISION;
workspace.defaultWorkspaceRevision = CURRENT_WORKSPACE_DATA_REVISION;
workspace.updatedAt = "2026-07-18T00:30:00.000Z";

await writeFile(workspaceUrl, `${JSON.stringify(workspace, null, 2)}\n`, "utf8");
console.log(`Lighting semantics applied: removed ${removedLightIds.size} invalid kitchen lights and ${removedControlGroupIds.size} control groups.`);
