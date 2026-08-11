import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260810-before-camera05-baywindow-v10.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
if (!fs.existsSync(backupPath)) fs.copyFileSync(dataPath, backupPath);

const camera = data.cameraViews.find((item) => item.floor === "2F" && item.order === 5);
if (!camera) throw new Error("Missing 2F camera 05");

camera.name = "05 主卧床尾衣柜与右侧唯一飘窗";
camera.fov = 72;
camera.zoom = 1;
camera.description = "从床头偏北侧向东南看：床尾正对3000mm建筑化整墙衣柜；画面右侧为南墙唯一1600mm飘窗及550mm深窗下坐榻。衣柜和飘窗在东南角保留真实墙垛与收口距离。";

const bayWindows = data.houseStructuresByFloor?.["2F"]?.bayWindows ?? [];
if (bayWindows.length !== 1 || bayWindows[0].id !== "BW-2F-002") {
  throw new Error(`Expected exactly one 2F bay window BW-2F-002, got ${bayWindows.map((item) => item.id).join(", ")}`);
}
bayWindows[0].name = "主卧南墙唯一1600mm飘窗";

data.dataRevision = "2F-camera05-right-baywindow-v10-20260810";
data.updatedAt = new Date().toISOString();
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(JSON.stringify({
  revision: data.dataRevision,
  camera: { name: camera.name, fov: camera.fov, description: camera.description },
  bayWindow: bayWindows[0]
}, null, 2));
