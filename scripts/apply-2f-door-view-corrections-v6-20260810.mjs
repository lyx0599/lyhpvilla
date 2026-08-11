import fs from 'node:fs';

const dataUrl = new URL('../data/default-workspace.json', import.meta.url);
const backupUrl = new URL('../data/backups/default-workspace-20260810-before-door-view-v6.json', import.meta.url);
const workspace = JSON.parse(fs.readFileSync(dataUrl, 'utf8'));
const structure = workspace.houseStructuresByFloor['2F'];
if (!structure) throw new Error('Missing 2F structure');
if (!fs.existsSync(backupUrl)) fs.copyFileSync(dataUrl, backupUrl);

const door = (id) => {
  const value = structure.doors.find((item) => item.id === id);
  if (!value) throw new Error(`Missing door: ${id}`);
  return value;
};
const camera = (id) => {
  const value = workspace.cameraViews.find((item) => item.id === id);
  if (!value) throw new Error(`Missing camera: ${id}`);
  return value;
};

// Move the master-bath door to the west/left portion of the shared north wall,
// so it is on the user's left immediately after entering the master bedroom.
const masterBathDoor = door('D-2F-007');
masterBathDoor.positionOnWall = 0.64;
masterBathDoor.width = 800;
masterBathDoor.operation = 'sliding';
masterBathDoor.defaultOpenAmount = 0.55;
masterBathDoor.name = '主卫入门左手侧移门';
masterBathDoor.notes = '用户复核：进入主卧后主卫位于左手侧；门洞移至主卫南墙西段，效果图从床区看时位于床尾收纳墙左侧。';

Object.assign(camera('designer-camera-2f-v3-01-stair-arrival'), {
  name: '01 上楼到达—主卧门内见五斗橱',
  description: '真实上楼方向向东；楼梯在身后。远端开启的主卧门洞内应读到床尾五斗橱，不显示整面衣柜正面。'
});

Object.assign(camera('designer-camera-2f-v3-02-stair-night'), {
  name: '02 起居室回看—左双卧门与右侧房门',
  description: '向西回看楼梯；左侧两樘小房门，右侧保留北侧真实房门，尽端为楼梯洞口。'
});

Object.assign(camera('designer-camera-2f-v3-05-master-storage'), {
  name: '05 主卧床尾收纳—左主卫门、五斗橱、衣柜',
  description: '从床头看床尾墙：最左为主卫门，紧邻五斗橱，右侧为2200mm通顶衣柜，均正对床尾。'
});

workspace.updatedAt = new Date().toISOString();
workspace.dataRevision = '2F-door-view-corrections-v6-20260810';
fs.writeFileSync(dataUrl, `${JSON.stringify(workspace, null, 2)}\n`);
console.log('Applied door and camera corrections V6.');
