import assert from 'node:assert/strict';
import fs from 'node:fs';

const workspace = JSON.parse(fs.readFileSync(new URL('../data/default-workspace.json', import.meta.url), 'utf8'));
const structure = workspace.houseStructuresByFloor['2F'];
const furniture = (id) => workspace.furniture.find((item) => item.id === id);
const door = (id) => structure.doors.find((item) => item.id === id);

assert.equal(workspace.dataRevision, '2F-approved-v2-20260810');
assert.equal(workspace.cameraViews.filter((item) => item.id.startsWith('designer-camera-2f-v3-')).length, 10);

assert.equal(door('D-2F-007').operation, 'sliding');
assert.ok(door('D-2F-007').positionOnWall > 0.89);
assert.equal(furniture('furn-2f-master-bathtub-001').dimensions.width, 170);
assert.equal(furniture('furn-2f-master-vanity-001').basinCount, 2);

assert.deepEqual(furniture('module-2f-window-desk').heightRangeMm, [650, 1250]);
assert.equal(furniture('module-2f-window-desk').currentHeightMm, 1050);
assert.equal(furniture('module-2f-cloak-left').dimensions.depth, 60);
assert.equal(furniture('module-2f-cloak-right').dimensions.depth, 60);

assert.equal(furniture('furn-2f-bedroom1-wardrobe-001').dimensions.depth, 55);
assert.equal(furniture('furn-2f-bedroom1-wardrobe-001').doorType, 'sliding');
assert.equal(door('D-2F-004').operation, 'sliding');
assert.equal(furniture('module-2f-wardrobe-002').dimensions.width, 120);
assert.equal(furniture('furn-2f-bedroom2-desk-001').dimensions.width, 100);

assert.equal(structure.outdoors.find((item) => item.id === 'OD-2F-SHARED-BALCONY-001').enclosure.type, 'thermal-break-aluminum-glazing');
assert.equal(structure.fences.filter((item) => item.id.includes('2F-BALCONY') && item.height === 2600 && item.material === 'glass').length, 3);
assert.ok(furniture('furn-2f-shared-balcony-west-cabinet-001'));
assert.ok(furniture('furn-2f-shared-balcony-east-cabinet-001'));

const ids = workspace.furniture.map((item) => item.id);
assert.equal(new Set(ids).size, ids.length, 'Furniture ids must remain unique');

console.log('2F approved V2 model validation passed.');
