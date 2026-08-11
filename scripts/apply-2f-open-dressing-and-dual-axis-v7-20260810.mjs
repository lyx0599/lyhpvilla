import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260810-before-open-dressing-v7.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
if (!fs.existsSync(backupPath)) fs.copyFileSync(dataPath, backupPath);

const structure = data.houseStructuresByFloor?.["2F"];
if (!structure) throw new Error("Missing 2F house structure");

const dressingOpening = structure.doors.find((door) => door.id === "D-2F-002");
if (!dressingOpening) throw new Error("Missing dressing-room opening D-2F-002");
Object.assign(dressingOpening, {
  name: "衣帽间1.5m无门开放洞口",
  positionOnWall: 0.279,
  width: 1500,
  height: 2300,
  operation: "sliding",
  material: "none",
  defaultOpenAmount: 1,
  notes: "用户确认衣帽间为开间：保留墙洞切口，不安装门扇、门套或轨道；洞口从2F走廊直接进入衣帽间。",
  visual: {
    ...(dressingOpening.visual ?? {}),
    style: "openPassage",
    leafCount: 0,
    woodColor: "#e9e1d3",
    frameColor: "#e9e1d3",
    hardwareColor: "#e9e1d3",
    glassColor: "#e9e1d3"
  }
});

const wardrobe = data.furniture.find((item) => item.id === "furn-2f-master-bedroom-large-wardrobe-001");
const chest = data.furniture.find((item) => item.id === "furn-2f-master-bedroom-chest-001");
if (!wardrobe || !chest) throw new Error("Missing master-bedroom storage furniture");
wardrobe.name = "主卧床轴线正对2200mm通顶大衣柜";
wardrobe.note = "位于主卧东墙南段，床从西向东展开，床尾轴线正对大衣柜；不与主卧入口视线混用。";
wardrobe.notes = "床尾正对通顶衣柜，保证床尾通道与柜门开启净距。";
chest.name = "主卧入口轴线正对五斗橱";
chest.note = "位于主卧东墙北段；从西侧主卧双开门进入时正对五斗橱，床位于南侧，床尾不正对五斗橱。";
chest.notes = "入口端景与随手收纳；和南段床尾衣柜分属两条平行视线。";

const cameraByOrder = new Map(data.cameraViews.filter((camera) => camera.floor === "2F").map((camera) => [camera.order, camera]));
Object.assign(cameraByOrder.get(1), {
  name: "01 上楼到达—主卧入口正见五斗橱",
  description: "从真实楼梯到达方向看向开启的主卧双开门；入口轴线正对东墙北段五斗橱，不应看到衣柜占据门洞中心。"
});
Object.assign(cameraByOrder.get(2), {
  name: "02 走廊回看—左双卧门、右客卫门与衣帽间开口",
  description: "向西回看楼梯；左侧保留父母房和儿童房两樘门，右侧近处为1.5m无门衣帽间开放洞口，右侧远处保留客卫木门，尽端为楼梯洞口。"
});
Object.assign(cameraByOrder.get(5), {
  name: "05 主卧床尾轴线—正对通顶大衣柜",
  description: "从床头沿床轴线向东看：2200mm通顶大衣柜居中正对床尾；五斗橱位于入口轴线的北段，只在画面最左边缘少量出现或不出现；主卫门不得误放到床尾正中。"
});
Object.assign(cameraByOrder.get(6), {
  name: "06 衣帽间无门开间—通透进入与升降桌",
  description: "从2F走廊穿过1.5m无门开放洞口看入衣帽间；不得出现任何门扇、门把、轨道或玻璃隔断。两侧浅烟玻璃衣柜，窗前为1800×700mm高级电动升降电脑桌。"
});

data.dataRevision = "2F-open-dressing-dual-axis-v7-20260810";
data.updatedAt = new Date().toISOString();
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(JSON.stringify({
  revision: data.dataRevision,
  dressingOpening: {
    id: dressingOpening.id,
    name: dressingOpening.name,
    positionOnWall: dressingOpening.positionOnWall,
    width: dressingOpening.width,
    defaultOpenAmount: dressingOpening.defaultOpenAmount,
    leafCount: dressingOpening.visual.leafCount
  },
  masterAxes: {
    entrance: chest.name,
    bedFoot: wardrobe.name
  },
  cameras: [1, 2, 5, 6].map((order) => cameraByOrder.get(order)?.name)
}, null, 2));
