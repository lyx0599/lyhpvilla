import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataPath = path.join(root, 'data/default-workspace.json');
const backupPath = path.join(root, 'data/backups/default-workspace-20260810-before-master-entry-camera-v13.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
if (!fs.existsSync(backupPath)) fs.copyFileSync(dataPath, backupPath);

const view = data.cameraViews.find((item) => item.floor === '2F' && item.order === 5);
if (!view) throw new Error('Missing 2F camera 05');

// True entrance is D-2F-008 on the west wall of the L-shaped north stem.
// Scene coordinates use the 12m x 9m floor center as the origin.
view.name = '05 主卧真实入户—正见五斗橱与平行浅柜';
view.cameraPosition = { x: 1.9, y: 1.55, z: -0.45 };
view.target = { x: 3.32, y: 1.02, z: -1.0 };
view.fov = 50;
view.zoom = 1;
view.description = '相机位于主卧L形上段真实双扇入户门内，向东偏北看：正前方为800×350×900mm五斗橱，右侧同一东墙为3000×350mm四扇上吊移门薄柜；床仅在右下边缘出现，南墙飘窗不入镜。';

data.dataRevision = '2F-master-true-entry-camera-v13-20260810';
data.updatedAt = new Date().toISOString();
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(JSON.stringify({ revision: data.dataRevision, camera: view }, null, 2));
