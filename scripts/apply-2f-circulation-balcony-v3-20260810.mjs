import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dataPath = path.join(root, 'data', 'default-workspace.json');
const backupPath = path.join(root, 'data', 'backups', 'default-workspace-20260810-before-2f-circulation-balcony-v3.json');
const workspace = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const structure = workspace.houseStructuresByFloor?.['2F'];
if (!structure) throw new Error('Missing 2F structure');

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
if (!fs.existsSync(backupPath)) fs.copyFileSync(dataPath, backupPath);

const upsert = (items, value) => {
  const index = items.findIndex((item) => item.id === value.id);
  if (index >= 0) items[index] = value;
  else items.push(value);
};
const camera = (id) => workspace.cameraViews.find((item) => item.id === id);
const furniture = (id) => workspace.furniture.find((item) => item.id === id);
const toPercent = (x, y, rotation = 0) => ({
  x: x / structure.coordinateSystem.width * 100,
  y: y / structure.coordinateSystem.height * 100,
  rotation
});

// Developer plan: two separate balconies, about 3.76m² and 3.88m², each around 1.3m deep.
const parentBalcony = {
  id: 'OD-2F-BALCONY-01', floorId: '2F', name: '父母房独立封闭阳台（阳台1）',
  spaceType: 'Outdoor', geometryType: 'polygon', outdoorType: 'balcony',
  polygon: [{ x: 950, y: 7800 }, { x: 3897, y: 7800 }, { x: 3897, y: 9100 }, { x: 950, y: 9100 }],
  area: 3_831_100,
  enclosure: { type: 'thermal-break-aluminum-glazing', heightMm: 2600, glass: 'low-e-double-glazing', frameColor: '#796d61' },
  notes: '依据开发商2F图的阳台1复原；约3.8㎡、约1.3m进深，与阳台2之间为实体分隔。'
};
const childBalcony = {
  id: 'OD-2F-BALCONY-02', floorId: '2F', name: '儿童房独立封闭阳台（阳台2）',
  spaceType: 'Outdoor', geometryType: 'polygon', outdoorType: 'balcony',
  polygon: [{ x: 3897, y: 7800 }, { x: 6542, y: 7800 }, { x: 6542, y: 9100 }, { x: 3897, y: 9100 }],
  area: 3_438_500,
  enclosure: { type: 'thermal-break-aluminum-glazing', heightMm: 2600, glass: 'low-e-double-glazing', frameColor: '#796d61' },
  notes: '依据开发商2F图的阳台2复原；模型受儿童房现有开间限制，保持约1.3m进深，不再做跨两房的长阳台。'
};
structure.outdoors = structure.outdoors.filter((item) => item.id !== 'OD-2F-SHARED-BALCONY-001');
upsert(structure.outdoors, parentBalcony);
upsert(structure.outdoors, childBalcony);

structure.outdoorSurfaces = structure.outdoorSurfaces.filter((item) => item.id !== 'OS-2F-SHARED-BALCONY-TILE-001');
for (const balcony of [parentBalcony, childBalcony]) {
  upsert(structure.outdoorSurfaces, {
    id: `OS-${balcony.id}-TILE`, floorId: '2F', name: `${balcony.name}防滑砖`, label: balcony.name,
    category: 'hardscape', geometryType: 'polygon', surfaceType: 'hardscape', polygon: balcony.polygon,
    area: balcony.area, material: 'tile', materialToken: 'wetAreaTile', materialRole: 'floorWet',
    notes: '浅暖灰防滑砖；向地漏找坡，封窗后仍保留可开启扇与冷凝水排水。', status: 'design-intent', source: 'developer-plan', editable: true, removable: true
  });
}

structure.fences = structure.fences.filter((item) => !item.id.includes('2F-BALCONY'));
const glazing = [
  ['FN-2F-BALCONY-01-SOUTH', '阳台1南侧通高封窗', { x: 950, y: 9100 }, { x: 3897, y: 9100 }, 'OD-2F-BALCONY-01'],
  ['FN-2F-BALCONY-01-WEST', '阳台1西侧通高封窗', { x: 950, y: 7800 }, { x: 950, y: 9100 }, 'OD-2F-BALCONY-01'],
  ['FN-2F-BALCONY-02-SOUTH', '阳台2南侧通高封窗', { x: 3897, y: 9100 }, { x: 6542, y: 9100 }, 'OD-2F-BALCONY-02'],
  ['FN-2F-BALCONY-02-EAST', '阳台2东侧通高封窗', { x: 6542, y: 7800 }, { x: 6542, y: 9100 }, 'OD-2F-BALCONY-02'],
  ['FN-2F-BALCONY-DIVIDER', '阳台1与阳台2实体分隔墙', { x: 3897, y: 7800 }, { x: 3897, y: 9100 }, null]
];
for (const [id, name, start, end, outdoorZoneId] of glazing) {
  const isDivider = id.endsWith('DIVIDER');
  structure.fences.push({
    id, floorId: '2F', name, geometryType: 'line', start, end, outdoorZoneId,
    height: 2600, thickness: isDivider ? 180 : 70, material: isDivider ? 'wall' : 'glass', editable: true, removable: true,
    visual: isDivider ? { finish: 'warm-greige-limewash' } : { system: 'thermal-break-aluminum', frameColor: '#796d61', mullionDensity: 'low', glass: 'low-e-clear' }
  });
}

// Reassign each bedroom door to its own balcony.
for (const [id, zoneId, note] of [
  ['D-2F-009', 'OD-2F-BALCONY-01', '父母房只通阳台1'],
  ['D-2F-010', 'OD-2F-BALCONY-02', '儿童房只通阳台2']
]) {
  const door = structure.doors.find((item) => item.id === id);
  if (door) {
    door.outdoorZoneId = zoneId;
    door.notes = `${note}；两阳台之间有实体分隔。`;
  }
}

// One compact 600×350mm cabinet per balcony; remove the former shared-balcony pair.
workspace.furniture = workspace.furniture.filter((item) => !item.id.startsWith('furn-2f-shared-balcony-'));
const cabinetTemplate = structuredClone(furniture('furn-2f-bedroom1-wardrobe-001'));
for (const item of [
  { id: 'furn-2f-balcony-01-cabinet', name: '阳台1端墙浅柜', zone: 'OD-2F-BALCONY-01', x: 1125, y: 8450 },
  { id: 'furn-2f-balcony-02-cabinet', name: '阳台2端墙浅柜', zone: 'OD-2F-BALCONY-02', x: 6367, y: 8450 }
]) {
  workspace.furniture.push({
    ...structuredClone(cabinetTemplate), id: item.id, floorId: '2F', roomId: null, outdoorZoneId: item.zone,
    name: item.name, category: 'storage', dimensions: { width: 60, depth: 35, height: 220, unit: 'cm' },
    position: toPercent(item.x, item.y, 90), doorType: 'sliding',
    notes: '600×350mm防潮通顶浅柜，只收纳清洁工具和小件，不挤占约1.3m阳台进深。'
  });
}

// Correct arrival logic: upper flight reaches the east end; the stair opening stays behind the arriving person.
const camera01 = camera('designer-camera-2f-v3-01-stair-arrival');
Object.assign(camera01, {
  name: '01 真实上楼到达视角—楼梯在身后',
  cameraPosition: { x: -1.72, y: 1.62, z: -0.02 }, target: { x: 0.35, y: 1.42, z: 0.12 }, fov: 58,
  description: '从右侧上行梯段东端到达2F，顺势向东看起居室；楼梯洞口在身后，不出现在左前方。'
});

// Reverse view from the hall: two small-bedroom doors sit on the left/south wall.
const camera02 = camera('designer-camera-2f-v3-02-stair-night');
Object.assign(camera02, {
  name: '02 起居室回看楼梯—左侧双卧门',
  cameraPosition: { x: 0.65, y: 1.65, z: -0.05 }, target: { x: -2.75, y: 1.25, z: 0.0 }, fov: 62,
  description: '从起居室东侧向西回看楼梯；南墙在画面左侧，依次出现父母房门和儿童房门，楼梯洞口位于尽端。'
});

const camera10 = camera('designer-camera-2f-v3-10-balcony');
Object.assign(camera10, {
  name: '10 儿童房独立封闭阳台（约3.4–3.9㎡）',
  cameraPosition: { x: -0.78, y: 1.48, z: 3.42 }, target: { x: -0.78, y: 1.15, z: 4.42 }, fov: 68,
  targetArea: 'OD-2F-BALCONY-02',
  description: '从儿童房推拉门看向阳台2；进深约1.3m，端部浅柜和外沿封窗可见，与阳台1之间有实体分隔。'
});

workspace.updatedAt = new Date().toISOString();
workspace.dataRevision = '2F-circulation-balcony-v3-20260810';
workspace.defaultWorkspaceRevision = `${workspace.defaultWorkspaceRevision ?? 'workspace'}+2f-circulation-balcony-v3`;
fs.writeFileSync(dataPath, `${JSON.stringify(workspace, null, 2)}\n`);
console.log('Applied 2F stair-arrival and two-balcony correction V3.');
