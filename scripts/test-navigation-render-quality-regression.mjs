import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [planner, toolbar, scene, pbr, procedural, primitives] = await Promise.all([
  readFile(new URL("../components/space-planner.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/editor/context-toolbar.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/scene-3d/pbr-material.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/scene-3d/procedural-pbr.ts", import.meta.url), "utf8"),
  readFile(new URL("../components/furniture-3d/primitives.tsx", import.meta.url), "utf8")
]);

assert.match(planner, /useState\(true\).*contextToolbarExpanded|contextToolbarExpanded[^\n]*useState\(true\)/s, "desktop toolbar should default to expanded");
assert.match(planner, /CONTEXT_TOOLBAR_EXPANDED_KEY/, "toolbar preference should be persisted");
assert.match(planner, /grid-cols-\[192px_minmax\(0,1fr\)/, "expanded parent grid should reserve 192px");
assert.match(planner, /grid-cols-\[56px_minmax\(0,1fr\)/, "collapsed parent grid should retain compact width");
assert.match(toolbar, /当前状态/, "expanded toolbar should expose current tool state");
assert.match(toolbar, /tool\.shortcut/, "expanded toolbar should expose shortcuts");

assert.match(scene, /presentationMode \? \(balancedQuality \? "standard" : "presentation"\) : "draft"/, "edit mode should enforce draft PBR channels");
assert.match(scene, /presentationMode && !balancedQuality \? 4096 : 1024/, "edit shadows should use 1024 while presentation can use 4096");
assert.match(scene, /castShadow=\{presentationMode && \(!mobilePresentationMode \|\| mobileQuality === "high"\)\}/, "edit mode should not render the full-scene shadow pass");
assert.match(scene, /presentationMode \? \[1\.25, 2\] : \[1, 1\.5\]/, "desktop DPR should be split by quality mode");
assert.match(scene, /realtimeLightLimit = qualityMode === "presentation" \? 24 : 6/, "realtime fixture lights should be bounded per mode");
assert.match(scene, /sceneLod=\{presentationMode \? sceneVisibility\.lod : "balanced"\}/, "edit LOD should preserve authored furniture families and shapes");
assert.doesNotMatch(scene, /InteractionSceneProxy|InteractionFurnitureProxy|InteractionWallSegments|camera-interaction-proxy/, "camera interaction must not swap in a simplified proxy scene");
assert.match(scene, /<ResolvedFurnitureAsset/, "camera interaction must keep authored furniture assets mounted");
assert.match(procedural, /MAX_PBR_MAP_CACHE_ENTRIES = 32/, "texture cache should have a capacity");
assert.match(procedural, /disposePbrMaps/, "evicted textures should be disposed");
assert.match(procedural, /canonicalTransform \? "material-transform"/, "canonical material maps should not be keyed by object UV repeat");
assert.match(pbr, /MAX_PBR_MATERIAL_CACHE_ENTRIES = 192/, "material cache should have a capacity");
assert.match(pbr, /makeRoomForMaterial\(\)/, "material insertion should enforce the hard cache capacity");
assert.match(pbr, /entry\.material\.dispose\(\)/, "evicted materials should be disposed");
assert.doesNotMatch(primitives, /quality=\{surface\.quality \?\? detailLevel\}/, "geometry detail must not force presentation texture quality");

console.log("navigation and render quality regression checks passed");
