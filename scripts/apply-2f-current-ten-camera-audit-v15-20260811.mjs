import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260811-before-2f-camera-audit-v15.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
if (!fs.existsSync(backupPath)) fs.copyFileSync(dataPath, backupPath);

const updates = [
  {
    order: 1,
    name: "01 上楼到达—开启双开门与主卧端景",
    cameraPosition: { x: -1.5, y: 1.6, z: -0.2 },
    target: { x: 2.0, y: 1.25, z: -0.5 },
    fov: 60,
    description: "从2F楼梯到达后的走廊向东看；开启的主卧双开门位于尽端，门内首先读到五斗橱端景。楼梯不应出现在主卧内。"
  },
  {
    order: 2,
    name: "02 东段走廊回看—楼梯、双卧门与客卫门",
    cameraPosition: { x: 1.0, y: 1.62, z: -0.2 },
    target: { x: -3.0, y: 1.2, z: -0.3 },
    fov: 62,
    description: "从走廊东段向西回看：楼梯洞口在走廊尽端，父母房和儿童房入口位于南侧，客卫门位于北侧；不得生成二层入户门。"
  },
  {
    order: 3,
    name: "03 客卫定稿—门内东南角看完整湿区",
    cameraPosition: { x: -0.85, y: 1.55, z: -1.8 },
    target: { x: -1.7, y: 1.05, z: -3.2 },
    fov: 72,
    description: "相机位于客卫东南角，向西北看：北侧玻璃淋浴、东侧马桶与东南台盆保持定稿，不穿墙、不夸大面积。"
  },
  {
    order: 4,
    name: "04 主卧东北角—床区与南墙唯一飘窗",
    cameraPosition: { x: 3.15, y: 1.55, z: 0.9 },
    target: { x: 1.2, y: 1.0, z: 2.35 },
    fov: 68,
    description: "从主卧东北角向西南看：床头在西墙，南墙只出现一个飘窗；东墙收纳位于镜头后方，不生成第二或第三扇窗。"
  },
  {
    order: 5,
    name: "05 主卧真实入户—左主卫移门、前五斗橱、右床尾柜",
    cameraPosition: { x: 2.05, y: 1.55, z: -0.2 },
    target: { x: 3.2, y: 1.05, z: 0.4 },
    fov: 68,
    description: "从西侧双开门内向东偏南看：左侧北墙为800mm单扇暗藏主卫移门，前方偏左为五斗橱，右侧同一东墙为四扇3000×350mm薄柜，床只从右下进入画面；飘窗不入镜。"
  },
  {
    order: 6,
    name: "06 无门衣帽间—双侧玻璃柜与窗前升降桌",
    cameraPosition: { x: 0.5, y: 1.6, z: -1.2 },
    target: { x: 0.5, y: 1.05, z: -3.55 },
    fov: 68,
    description: "从走廊经1.5m无门开口看入衣帽间：两侧深烟玻璃衣柜，北窗前为1800×700mm木质电动升降桌；禁止门扇、把手和玻璃隔断。"
  },
  {
    order: 7,
    name: "07 主卫门口—浴缸、马桶、淋浴与双台盆",
    cameraPosition: { x: 2.25, y: 1.58, z: -1.55 },
    target: { x: 2.55, y: 1.0, z: -3.25 },
    fov: 74,
    description: "从主卫南墙单扇移门口向北看：北窗下横浴缸，西侧依次为淋浴与马桶，东墙1600mm双台盆；主卫仅此一樘入口。"
  },
  {
    order: 8,
    name: "08 父母房门口—1500床与浅深移门柜",
    cameraPosition: { x: -2.4, y: 1.55, z: 0.9 },
    target: { x: -3.85, y: 1.0, z: 2.2 },
    fov: 72,
    description: "从父母房东北侧入口看向西南：1500mm床与1200×550mm浅深移门柜同时可读；按真实紧凑尺寸表达，不拉大房间。"
  },
  {
    order: 9,
    name: "09 儿童房南侧回看—东床、西侧衣柜书桌",
    cameraPosition: { x: -0.8, y: 1.55, z: 3.0 },
    target: { x: -0.8, y: 1.05, z: 1.65 },
    fov: 78,
    description: "从儿童房南侧向北回看：1200mm成长床在东侧，西侧连续布置1200mm衣柜与1000mm学习桌；三件家具均需可读。"
  },
  {
    order: 10,
    name: "10 儿童房外独立封闭阳台—窄深与端柜",
    cameraPosition: { x: -1.7, y: 1.48, z: 3.9 },
    target: { x: 0.25, y: 1.15, z: 3.9 },
    fov: 72,
    description: "相机位于阳台2西端向东看：净深约1.3m，南侧封窗与东端350mm浅柜可见；当前3D模型在父母房阳台与儿童房阳台之间设置实体分隔。"
  }
];

for (const update of updates) {
  const view = data.cameraViews.find((candidate) => candidate.floor === "2F" && candidate.order === update.order);
  if (!view) throw new Error(`Missing 2F camera order ${update.order}`);
  Object.assign(view, update, { zoom: 1 });
}

data.dataRevision = "2F-current-ten-camera-audit-v15-20260811";
data.updatedAt = new Date().toISOString();
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(JSON.stringify({ revision: data.dataRevision, updated: updates.length }, null, 2));
