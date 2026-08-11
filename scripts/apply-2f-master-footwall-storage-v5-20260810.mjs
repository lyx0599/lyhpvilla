import fs from 'node:fs';

const dataUrl = new URL('../data/default-workspace.json', import.meta.url);
const backupUrl = new URL('../data/backups/default-workspace-20260810-before-master-footwall-v5.json', import.meta.url);
const workspace = JSON.parse(fs.readFileSync(dataUrl, 'utf8'));
const structure = workspace.houseStructuresByFloor['2F'];
if (!structure) throw new Error('Missing 2F structure');
if (!fs.existsSync(backupUrl)) fs.copyFileSync(dataUrl, backupUrl);

const item = (id) => {
  const value = workspace.furniture.find((candidate) => candidate.id === id);
  if (!value) throw new Error(`Missing furniture: ${id}`);
  return value;
};
const setPositionMm = (value, x, y, rotation) => {
  value.position = {
    x: x / structure.coordinateSystem.width * 100,
    y: y / structure.coordinateSystem.height * 100,
    rotation
  };
};

// User-confirmed relationship: both pieces are on the east/foot wall;
// chest stays closest to the master-bath door, wardrobe continues south of it.
const wardrobe = item('furn-2f-master-bedroom-large-wardrobe-001');
wardrobe.name = '主卧床尾墙南段2200mm通顶大衣柜';
wardrobe.hostWallId = 'W-2F-011';
wardrobe.dimensions = { width: 220, depth: 60, height: 275, unit: 'cm' };
setPositionMm(wardrobe, 9195, 6100, 90);
wardrobe.note = '用户确认：大衣柜位于床尾东墙，布置在五斗橱南侧，正对床尾。';
wardrobe.constructionNote = '2200×600mm通顶衣柜；施工前按床尾通道现场复尺，柜门建议移门或无外摆平开门。';

const chest = item('furn-2f-master-bedroom-chest-001');
chest.name = '主卧床尾墙北段五斗橱（靠主卫门）';
chest.hostWallId = 'W-2F-011';
chest.dimensions = { width: 80, depth: 35, height: 90, unit: 'cm' };
setPositionMm(chest, 9320, 3500, 90);
chest.note = '用户确认：五斗橱同样在床尾墙，紧邻北侧主卫门；衣柜在其南侧。';
chest.constructionNote = '800×350×900mm浅五斗橱，靠主卫门设置，保留门套收口及墙面开关距离。';

const camera = workspace.cameraViews.find((view) => view.id === 'designer-camera-2f-v3-05-master-storage');
if (camera) {
  camera.name = '05 主卧床尾衣柜与五斗橱';
  camera.cameraPosition = { x: 1.12, y: 1.58, z: 2.35 };
  camera.target = { x: 3.12, y: 1.05, z: 1.15 };
  camera.fov = 66;
  camera.description = '从床头/飘窗侧看床尾东墙：北段五斗橱靠主卫门，南段2200mm通顶衣柜正对床尾。';
}

workspace.updatedAt = new Date().toISOString();
workspace.dataRevision = '2F-master-footwall-storage-v5-20260810';
fs.writeFileSync(dataUrl, `${JSON.stringify(workspace, null, 2)}\n`);
console.log('Applied user-confirmed master foot-wall wardrobe and chest V5.');
