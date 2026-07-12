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
});

for (const phrase of ["餐桌吊灯", "中岛功能照明", "厨房台面功能灯", "餐边柜灯带", "壁炉/背景墙", "床头氛围灯", "衣柜灯带", "镜前灯", "淋浴区防潮灯", "马桶夜灯", "书桌功能灯", "活动区氛围灯", "楼梯灯带", "路径灯", "围栏灯", "植物上照灯", "户外柜照明", "庭院壁灯"]) {
  assert.ok(lights.some((item) => item.label.includes(phrase)), `Lighting draft must include ${phrase}.`);
}

const references = validateWorkspaceReferences(workspace);
assert.equal(references.errors.length, 0, `Lighting references must close: ${references.errors.map((issue) => issue.message).join("；")}`);
const packageData = buildConstructionPackageData(workspace);
assert.equal(packageData.tables.lighting.length, lights.length);
assert.ok(packageData.tables.luminaireSchedule.length > 0, "Luminaire schedule must be exported.");
assert.ok(packageData.tables.switchControl.length > 0, "Switch control table must be exported.");
assert.ok(packageData.tables.smartControlNotes.length > 0, "Smart control notes must be exported.");

const repeated = generateLightingDesignV1({ structuresByFloor: workspace.houseStructuresByFloor, furniture: workspace.furniture, existingItems: workspace.drawingItems, floorIds: workspace.floors.map((floor) => floor.id), now: "2026-07-12T09:00:00.000Z" });
assert.equal(repeated.created, 0, "Repeated generation must not create duplicates.");
assert.equal(repeated.updated, 0, "Repeated generation must be stable.");
assert.equal(repeated.items.length, workspace.drawingItems.length, "Repeated generation must preserve item count.");

console.log(`Lighting design v1 checks passed: ${lights.length} lights, ${switches.length} switches.`);
