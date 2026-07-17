import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { generateLightingDesignV1, lightingLayers } from "../lib/lighting-design.ts";
import { buildConstructionPackageData } from "../lib/construction-package-export.ts";
import { validateWorkspaceReferences } from "../lib/workspace-reference-validator.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const lights = workspace.drawingItems.filter((item) => item.category === "light");
const switches = workspace.drawingItems.filter((item) => item.category === "switch");
const requiredFields = ["lightType", "lightingLayer", "colorTemperature", "beamAngle", "mountingType", "heightMm", "relatedSwitchId", "controlGroupId", "smartControl", "dimming", "relatedFurnitureId", "relatedRoomId", "hostCeilingAreaId", "hostWallId", "status", "notes"];

assert.ok(lights.length >= 60, "Lighting v1 must provide a useful whole-house point draft.");
assert.ok(switches.length >= 40, "Lighting v1 must provide E-02 switch/control items.");
lightingLayers.forEach((layer) => assert.ok(lights.some((item) => item.lightingLayer === layer), `Lighting layer ${layer} must be represented.`));
lights.forEach((light) => {
  requiredFields.forEach((field) => assert.ok(Object.hasOwn(light, field), `${light.id} must carry ${field}.`));
  const relatedSwitch = switches.find((item) => item.id === light.relatedSwitchId);
  assert.ok(relatedSwitch, `${light.id} must reference a real switch.`);
  assert.equal(relatedSwitch.controlGroupId, light.controlGroupId, `${light.id} and ${relatedSwitch.id} must share controlGroupId.`);
  assert.ok(relatedSwitch.controlledLightIds.includes(light.id), `${relatedSwitch.id} must control ${light.id}.`);
  assert.ok(light.lightSpec?.fixtureFamily, `${light.id} must use a fixture family.`);
  assert.ok(light.lightSpec?.cri >= 90, `${light.id} must target CRI 90 or better.`);
  assert.ok(["draft", "todo"].includes(light.status), `${light.id} must remain editable as draft/todo.`);
  assert.ok(["generated-from-room", "generated-from-furniture"].includes(light.source), `${light.id} must record its generation source.`);
});

for (const phrase of ["餐桌吊灯", "厨房台面功能灯", "餐边柜灯带", "壁炉/背景墙", "床头氛围灯", "衣柜灯带", "镜柜灯", "淋浴区防潮灯", "马桶夜灯", "洗衣操作任务灯", "书桌功能灯", "活动区氛围灯", "楼梯灯带", "路径灯", "围栏灯", "植物上照灯", "户外柜照明", "庭院壁灯"]) {
  assert.ok(lights.some((item) => item.label.includes(phrase)), `Lighting draft must include ${phrase}.`);
}
assert.equal(workspace.drawingItems.some((item) => item.controlGroupId === "CG-1F-1F-005-ISLAND"), false, "The removed horizontal kitchen pendant and its dedicated switch must stay absent.");
assert.equal(workspace.furniture.find((item) => item.id === "furn-kitchen-entry-island-001")?.lightingDesignExcluded, true, "The kitchen island must not regenerate the removed pendant.");
assert.ok(workspace.lightingDesign.scenes.every((scene) => scene.groupStates.every((state) => state.controlGroupId !== "CG-1F-1F-005-ISLAND")), "Lighting scenes must not retain the removed island group.");
const kitchenLights = lights.filter((item) => item.relatedRoomId === "ROOM-1F-002");
assert.ok(kitchenLights.every((item) => item.lightingLayer !== "mirrorLight" && !/镜前灯|镜柜灯|马桶夜灯/.test(item.label)), "Kitchen sinks must not make the kitchen inherit bathroom mirror or toilet lighting.");
assert.ok(lights.filter((item) => item.lightingLayer === "ambient").every((item) => (item.lightSpec?.luminousFluxLm ?? 0) >= 950), "Ambient fixtures must provide a visible 950 lm baseline.");
const dailyScene = workspace.lightingDesign.scenes.find((scene) => scene.name === "日常");
const ambientGroupIds = new Set(lights.filter((item) => item.lightingLayer === "ambient").map((item) => item.controlGroupId));
assert.ok(dailyScene?.groupStates.filter((state) => state.on && ambientGroupIds.has(state.controlGroupId)).every((state) => state.brightness >= 85), "The daily scene must keep ambient lighting at 85% or brighter.");

const references = validateWorkspaceReferences(workspace);
assert.equal(references.errors.length, 0, `Lighting references must close: ${references.errors.map((issue) => issue.message).join("；")}`);
const packageData = buildConstructionPackageData(workspace);
assert.equal(packageData.tables.lighting.length, lights.length);
assert.ok(packageData.tables.luminaireSchedule.length > 0, "Luminaire schedule must be exported.");
assert.ok(packageData.tables.switchControl.length > 0, "Switch control table must be exported.");
assert.ok(packageData.tables.smartControlNotes.length > 0, "Smart control notes must be exported.");
assert.ok(packageData.tables.lightingScenes.length > 0, "Lighting scene control table must be exported.");

assert.equal(workspace.lightingDesign.fixtureFamilies.length, 18, "Modern warm v1 must provide the restrained fixture family library.");
for (const name of ["全开清洁", "日常", "会客", "用餐", "烹饪", "观影", "阅读", "睡前", "起夜", "迎宾", "庭院休闲", "离家"]) {
  assert.ok(workspace.lightingDesign.scenes.some((scene) => scene.name === name), `Lighting scenes must include ${name}.`);
}
for (const name of ["1F 客厅会客", "1F 客厅观影", "1F 餐厅用餐", "1F 厨房烹饪", "主卧睡前", "主卫夜间", "地下室休闲", "楼梯起夜", "南院休闲", "北院迎宾"]) {
  const view = workspace.roomTourViews.find((candidate) => candidate.name === name);
  assert.ok(view, `Lighting experience views must include ${name}.`);
  assert.ok(view.recommendedLightingSceneId, `${name} must bind a recommended lighting scene.`);
}

const repeated = generateLightingDesignV1({ structuresByFloor: workspace.houseStructuresByFloor, furniture: workspace.furniture, existingItems: workspace.drawingItems, floorIds: workspace.floors.map((floor) => floor.id), now: "2026-07-12T09:00:00.000Z" });
assert.equal(repeated.created, 0, "Repeated generation must not create duplicates.");
assert.equal(repeated.updated, 0, "Repeated generation must be stable.");
assert.equal(repeated.items.length, workspace.drawingItems.length, "Repeated generation must preserve item count.");

console.log(`Lighting design v1 checks passed: ${lights.length} lights, ${switches.length} switches.`);
