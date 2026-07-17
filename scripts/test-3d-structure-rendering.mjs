import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  getDoor3DDisplayHeight,
  getHostedOpeningCuts,
  getStraightHostPanels,
  getWindow3DDisplayMetrics
} from "../lib/structure-3d-geometry.ts";

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const rendererSource = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");
const renderedOpeningIds = [];

for (const structure of Object.values(workspace.houseStructuresByFloor)) {
  for (const wall of structure.walls.filter((item) => item.kind === "straight")) {
    const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    const cuts = getHostedOpeningCuts(structure, wall.id, "wall", length, wall.height);
    const panels = getStraightHostPanels(wall.start, wall.end, wall.height, cuts);
    renderedOpeningIds.push(...cuts.map((cut) => cut.id));

    for (const cut of cuts) {
      const sampleOffset = (cut.startMm + cut.endMm) / 2;
      const sampleHeight = Math.max(1, (cut.bottomMm + cut.topMm) / 2);
      const panelCoversOpening = panels.some((panel) => {
        const panelStart = Math.hypot(panel.start.x - wall.start.x, panel.start.y - wall.start.y);
        const panelEnd = Math.hypot(panel.end.x - wall.start.x, panel.end.y - wall.start.y);
        return sampleOffset > panelStart && sampleOffset < panelEnd
          && sampleHeight > panel.bottomMm
          && sampleHeight < panel.bottomMm + panel.heightMm;
      });
      assert.equal(panelCoversOpening, false, `${structure.floorId}: ${cut.id} is still covered by a 3D wall panel.`);
    }
  }
}

const expectedOpeningIds = Object.values(workspace.houseStructuresByFloor)
  .flatMap((structure) => [
    ...structure.doors.map((item) => item.id),
    ...structure.windows.map((item) => item.id),
    ...structure.bayWindows.map((item) => item.id)
  ])
  .sort();
assert.deepEqual(renderedOpeningIds.sort(), expectedOpeningIds, "Every hosted door/window/bay window must produce a 3D wall cut.");

assert.match(rendererSource, /function StraightWallWithOpenings\(/, "3D walls must use hosted opening panels.");
assert.match(rendererSource, /houseStructure\.skylights\.filter[\s\S]*?<SkylightMesh/, "Skylights must be rendered from the structure collection.");
assert.match(rendererSource, /houseStructure\.doors\.filter[\s\S]*?<OpeningMesh/, "Doors must be rendered from the structure collection.");
assert.match(rendererSource, /houseStructure\.windows\.filter[\s\S]*?<OpeningMesh/, "Windows must be rendered from the structure collection.");
assert.equal(getDoor3DDisplayHeight(2100), 2100, "3D doors must use their real opening height.");
assert.deepEqual(
  getWindow3DDisplayMetrics(2800, 1400),
  { heightMm: 1400, sillHeightMm: 900 },
  "Ordinary 3D windows must keep their real height and derived sill."
);

const b1 = workspace.houseStructuresByFloor.B1;
const b1Door = b1.doors.find((door) => door.hostId === "W-B1-016");
assert.ok(b1Door, "B1 W-B1-016 door fixture must exist.");
assert.ok(renderedOpeningIds.includes(b1Door.id), "B1 W-B1-016 door must create a visible 3D wall opening.");

console.log(`3D structure rendering coverage passed: ${expectedOpeningIds.length} wall openings and ${Object.values(workspace.houseStructuresByFloor).flatMap((structure) => structure.skylights).length} skylights.`);
