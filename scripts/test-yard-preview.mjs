import assert from "node:assert/strict";
import { readFile, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";

const expectedCanonicalSha = "8790920b120e37b5fdd7515479caf1c28e478bd78823621434b14acfa18be831";
const resolvedWorkspacePath = await realpath("data/default-workspace.json");
const workspaceBytes = await readFile(resolvedWorkspacePath);
const workspaceSha = createHash("sha256").update(workspaceBytes).digest("hex");
assert.equal(workspaceSha, expectedCanonicalSha, `workspace SHA mismatch: ${resolvedWorkspacePath}`);
const workspace = JSON.parse(workspaceBytes.toString("utf8"));
const preview = await readFile("app/preview/page.tsx", "utf8");
const yardPage = await readFile("app/yard-preview/page.tsx", "utf8");
const yardComponent = await readFile("components/yard-preview.tsx", "utf8");

const yard = workspace.houseStructuresByFloor?.YARD;
const firstFloor = workspace.houseStructuresByFloor?.["1F"];
assert.ok(yard, "YARD structure must remain in the published source data");
assert.ok(firstFloor, "1F structure must remain available for courtyard relation");
assert.deepEqual(yard.outdoors.map((item) => item.id), ["OD-YARD-NORTH-001", "OD-YARD-SOUTH-001"]);
assert.equal(yard.outdoors.find((item) => item.id === "OD-YARD-NORTH-001").polygon[0].y, -1650, "north yard boundary must retain the negative-Y entry edge");
assert.equal(yard.outdoors.find((item) => item.id === "OD-YARD-SOUTH-001").polygon.at(-1).y, 11800, "south yard boundary must retain the south edge");
assert.ok(yard.outdoorSurfaces.some((item) => item.id === "OS-YARD-SOUTH-RELAX-DECK"), "south relaxation deck must remain canonical");
assert.ok(yard.outdoorSurfaces.some((item) => item.id === "OS-YARD-NORTH-KITCHEN-DECK"), "north kitchen deck must remain canonical");
assert.ok(workspace.furniture.filter((item) => item.floorId === "YARD").length >= 12, "yard furniture and service objects must remain available");
for (const cameraId of ["view-yard-all", "view-yard-south", "view-yard-north", "view-yard-entry", "view-yard-south-living"]) {
  assert.ok(workspace.cameraViews.some((view) => view.id === cameraId && view.floor === "YARD"), `${cameraId} must remain available`);
}
assert.match(preview, /floorId: "YARD"/);
assert.match(preview, /route: "\/yard-preview"/);
assert.match(yardPage, /YardPreview/);
assert.match(yardComponent, /createUnifiedCourtyardModel/);
assert.match(yardComponent, /data-testid="yard-2d-overview"/);
assert.match(yardComponent, /data-testid="yard-3d-overview"/);
assert.match(yardComponent, /data-testid="yard-top-five-cameras"/);
assert.match(yardComponent, /data-testid="yard-construction-unknowns"/);
assert.match(yardComponent, /canonical-default-workspace/);
assert.match(yardComponent, /canonicalDataSha/);
assert.match(yardComponent, /view-yard-south/);
assert.match(yardComponent, /view-yard-north/);
assert.match(yardComponent, /view-yard-entry/);
assert.match(yardComponent, /view-yard-south-living/);
assert.match(yardComponent, /import Link from "next\/link"/);
assert.match(yardComponent, /<Link className=\{`rounded-2xl border/);
assert.doesNotMatch(yardComponent, /<a[^>]+href=\{`\/yard-preview\?camera=/, "Top5 cameras must use basePath-aware Next Link");

const basePathRoute = (basePath, cameraId) => `${basePath.replace(/\/$/, "")}/yard-preview?camera=${cameraId}`;
for (const basePath of ["", "/lyhpvilla"]) {
  for (const cameraId of ["view-yard-all", "view-yard-south", "view-yard-north", "view-yard-entry", "view-yard-south-living"]) {
    const href = basePathRoute(basePath, cameraId);
    assert.equal(href.split("/yard-preview").length, 2, `${basePath || "(empty)"} must not double-prefix ${cameraId}`);
    assert.equal(new URL(`http://127.0.0.1${href}`).searchParams.get("camera"), cameraId, `${cameraId} query must be preserved`);
  }
}

console.log(`Yard preview check passed: ${resolvedWorkspacePath} (${workspaceSha}), ${workspace.furniture.filter((item) => item.floorId === "YARD").length} yard furniture objects, ${yard.outdoorSurfaces.length} canonical surfaces, and 5 fixed yard cameras.`);
