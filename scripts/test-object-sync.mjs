import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createSyncSelfCheckReport,
  getStructureCollections,
  resolveVisibility,
  validateHostedOpenings
} from "../lib/object-sync-adapter.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const failures = [];

for (const floor of workspace.floors) {
  const structure = workspace.houseStructuresByFloor[floor.id];
  const furniture = workspace.furniture.filter((item) => item.floorId === floor.id);
  const sourceObjects = [...getStructureCollections(structure).flat(), ...furniture];
  const report = createSyncSelfCheckReport({
    structure,
    furniture,
    yardObjectIds: floor.id === "YARD" ? sourceObjects.map((item) => item.id) : []
  });

  if (report.duplicateIds.length) failures.push(`${floor.id}: duplicate ids ${report.duplicateIds.join(", ")}`);
  if (report.orphanHosts.length) failures.push(`${floor.id}: ${report.orphanHosts.map((item) => `${item.openingId} ${item.message}`).join("; ")}`);
  if (report.furnitureCoordinateDifferences.length) failures.push(`${floor.id}: coordinate round-trip ${JSON.stringify(report.furnitureCoordinateDifferences)}`);
  if (report.selectionConflicts.length) failures.push(`${floor.id}: ${report.selectionConflicts.join("; ")}`);
  if (report.yardObjectsWithoutBacklink.length) failures.push(`${floor.id}: yard backlink ${report.yardObjectsWithoutBacklink.join(", ")}`);

  const expected2dIds = sourceObjects.filter((item) => resolveVisibility(item).visible2d).map((item) => item.id).sort();
  const expected3dIds = sourceObjects.filter((item) => resolveVisibility(item).visible3d).map((item) => item.id).sort();
  assert.deepEqual(report.visible2dIds, expected2dIds, `${floor.id}: 2D ids differ from source objects.`);
  assert.deepEqual(report.visible3dIds, expected3dIds, `${floor.id}: 3D ids differ from source objects after explicit visibility exclusions.`);
  report.visible3dIds.forEach((id) => assert.ok(report.visible2dIds.includes(id), `${floor.id}: ${id} is visible in 3D but missing in 2D.`));
  assert.deepEqual(validateHostedOpenings(structure), [], `${floor.id}: hosted openings must resolve.`);
}

assert.deepEqual(failures, [], failures.join("\n"));

const sampleStructure = workspace.houseStructuresByFloor["1F"];
const sampleFurniture = workspace.furniture.filter((item) => item.floorId === "1F");
const conflict = createSyncSelfCheckReport({
  structure: sampleStructure,
  furniture: sampleFurniture,
  selectedFurnitureId: sampleFurniture[0]?.id,
  selectedStructureId: sampleStructure.walls[0]?.id
});
assert.equal(conflict.selectionConflicts.length, 1, "Selection conflict regression detector must remain active.");

console.log("2D/3D object synchronization tests passed");
