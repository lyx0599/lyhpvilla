import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataPath = path.join(root, 'data/default-workspace.json');
const backupPath = path.join(root, 'data/backups/default-workspace-20260810-before-master-door-clearance-v14.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const structure = data.houseStructuresByFloor['2F'];

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
if (!fs.existsSync(backupPath)) fs.copyFileSync(dataPath, backupPath);

const byId = (items, id) => {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing ${id}`);
  return item;
};

// Keep the user-confirmed 1600 mm double-leaf master entrance. Center it on
// the 2100 mm west stem so both corner returns are 250 mm.
const masterEntry = byId(structure.doors, 'D-2F-008');
masterEntry.positionOnWall = 0.5;
masterEntry.width = 1600;
masterEntry.height = 2300;
masterEntry.operation = 'swing';
masterEntry.name = '主卧通高常开双扇门（转角净距校正）';
masterEntry.defaultOpenAmount = 0.88;
masterEntry.visual = {
  ...(masterEntry.visual ?? {}),
  style: 'doubleLeafWood',
  leafCount: 2,
  jambMode: 'flush',
  liningDepthMm: 220,
  revealWidthMm: 8,
  thresholdHeightMm: 0,
  woodColor: '#9a7654',
  frameColor: '#6d5b4d',
  hardwareColor: '#765b43'
};
masterEntry.notes = '保留用户确认的1600mm通高双开门；门洞在西侧2100mm短墙居中，北、南门垛各约250mm，避免与主卫移门转角收口冲突。';

// The bedroom portion of the north wall starts at x=7681. Put the 800 mm
// slider 150 mm east of that corner: center x=8231 on W-2F-009.
const bathSlider = byId(structure.doors, 'D-2F-007');
const bathWall = byId(structure.walls, bathSlider.hostId);
const targetBathCenterX = 8231;
bathSlider.positionOnWall = (targetBathCenterX - bathWall.start.x) / (bathWall.end.x - bathWall.start.x);
bathSlider.width = 800;
bathSlider.height = 2300;
bathSlider.operation = 'sliding';
bathSlider.name = '主卫800mm单扇暗藏移门（样板间窄边）';
bathSlider.defaultOpenAmount = 0.55;
bathSlider.visual = {
  ...(bathSlider.visual ?? {}),
  style: 'flushPanel',
  leafCount: 1,
  jambMode: 'flush',
  liningDepthMm: 220,
  revealWidthMm: 6,
  thresholdHeightMm: 0,
  woodColor: '#8c745f',
  frameColor: '#51443b',
  hardwareColor: '#6b5748'
};
bathSlider.notes = '参考样板间做单扇暗藏移门和深咖窄边收口；门洞西边距主卧西北转角约150mm，与双开门北门垛形成独立转角基层。';

const trueEntryCamera = data.cameraViews.find((item) => item.floor === '2F' && item.order === 5);
if (trueEntryCamera) {
  trueEntryCamera.name = '05 主卧双开门入户—五斗橱与床尾薄柜';
  trueEntryCamera.description = '相机位于主卧西侧通高双开门内，镜头向东偏南：正前方为东墙北段五斗橱，右侧同墙为四扇上吊移门薄柜；床从右下进入画面，床尾朝东；南墙唯一飘窗只允许出现在远右背景；主卫移门位于北墙并在本机位左后方，不强行入镜。';
}

data.dataRevision = '2F-master-door-clearance-v14-20260810';
data.updatedAt = new Date().toISOString();
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(JSON.stringify({
  revision: data.dataRevision,
  masterEntry: { positionOnWall: masterEntry.positionOnWall, width: masterEntry.width },
  bathSlider: { positionOnWall: bathSlider.positionOnWall, width: bathSlider.width }
}, null, 2));
