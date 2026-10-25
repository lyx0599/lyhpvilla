import assert from "node:assert/strict";
import { cameraPoseChanged } from "../lib/camera-pose-report.ts";
import { idleRenderCacheKeys } from "../lib/render-cache-budget.ts";

const pose = { cameraX: 1, cameraY: 1.64, cameraZ: -1, targetX: 0, targetY: 1, targetZ: 0, fov: 42 };
assert.equal(cameraPoseChanged(null, pose), true, "first UI snapshot always publishes");
for (let i = 0; i < 1000; i++) {
  assert.equal(cameraPoseChanged(pose, { ...pose }), false, "idle frames do not rebuild the scene");
  assert.equal(cameraPoseChanged(pose, { ...pose, targetX: 1e-6 }), false, "ignore damping residuals");
}
for (const key of ["cameraX", "cameraY", "cameraZ", "targetX", "targetY", "targetZ", "fov"]) {
  assert.equal(cameraPoseChanged(pose, { ...pose, [key]: pose[key] + 0.01 }), true, `${key} updates remain visible to preflight/UI`);
}
assert.equal(cameraPoseChanged({ ...pose, cameraY: undefined }, pose), true);
assert.equal(cameraPoseChanged({ ...pose, fov: undefined }, pose), false);
let published = pose;
let publications = 0;
for (let i = 0; i <= 100; i++) {
  const next = { ...pose, cameraX: pose.cameraX + i * 0.00001 };
  if (cameraPoseChanged(published, next)) { published = next; publications++; }
}
assert.ok(publications > 0 && Math.abs(published.cameraX - 1.001) <= 0.00011, "slow cumulative motion must not be lost");

const cache = new Map([
  ["live", { estimatedBytes: 80, refs: 2, lastUsed: 0 }],
  ["old-high", { estimatedBytes: 80, refs: 0, lastUsed: 1 }],
  ["recent", { estimatedBytes: 20, refs: 0, lastUsed: 2 }]
]);
assert.deepEqual(idleRenderCacheKeys(cache, 32, 128), ["old-high"], "byte budget enforced even with <32 maps");
assert.deepEqual(idleRenderCacheKeys(cache, 1, 1000), ["old-high", "recent"], "entry limit and LRU preserved");
assert.deepEqual(idleRenderCacheKeys(cache, 32, 200), []);
assert.deepEqual(idleRenderCacheKeys(cache, 0, 0), ["old-high", "recent"], "active resources are pinned even above budget");
assert.equal(cache.size, 3, "selection does not mutate cache before disposal");
console.log("Preview performance regressions PASS: idle/slow/orbit/zoom pose reporting; byte-aware LRU; active texture protection.");
