import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../components/floor-3d-view.tsx", import.meta.url), "utf8");

assert.match(source, /data-testid="lighting-workflow-nav"/, "the lighting workflow navigator must be rendered in the main tree");
assert.match(source, /data-current-floor=\{floor\.id\}/, "the navigator must expose the active floor for runtime verification");
assert.match(source, /const currentFloorSpaceDirectory = useMemo\([\s\S]{0,240}villaSpaceDirectory\.filter\(\(space\) => space\.floorId === floor\.id\)/, "the navigator must use floor-scoped rooms, not the whole-villa directory");
assert.match(source, /currentFloorSpaceDirectory\.map\(\(space\) =>/, "the navigator must render only current-floor spaces");
assert.doesNotMatch(source.match(/data-testid="lighting-workflow-nav"[\s\S]{0,2400}/)?.[0] ?? "", /villaSpaceDirectory\.map/, "the top navigator must not render cross-floor spaces");
assert.match(source, /floorChanged[\s\S]{0,800}setSelectedLightingSpaceId\(null\)/, "changing floors must clear the prior room selection before the new directory is shown");
assert.match(source, /mobilePresentationMode \? "inset-x-3 top-\[4\.25rem\] flex justify-center"/, "mobile navigation must sit below the header safe area");
assert.match(source, /const legacyLightingUiEnabled:\s*boolean\s*=\s*false;/, "the old bottom lighting bars must stay disabled while the top workflow navigator owns the safe area");

console.log("main lighting top-bar hotfix checks passed");
