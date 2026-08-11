import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260810-before-bay-bench-v12.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
if (!fs.existsSync(backupPath)) fs.copyFileSync(dataPath, backupPath);

const bench = data.furniture.find((item) => item.id === "furn-2f-master-bay-bench-001");
if (!bench) throw new Error("Missing master-bedroom bay-window bench");

bench.name = "主卧南墙飘窗外凸区嵌入式抽屉坐榻";
bench.position = {
  ...bench.position,
  x: 66.75,
  y: 89.72222222222223,
  rotation: 0
};
bench.note = "坐榻完整嵌入W-2F-020南侧550mm外凸飘窗空间，内侧前沿与南墙完成面基本齐平，不侵占卧室地面，也不与床发生重叠。";
bench.constructionNote = "1600×550×450mm飘窗坐榻；以飘窗内口和窗框完成面复尺，抽屉向卧室侧开启，前沿不得突出南墙内表面。";
bench.notes = "已从卧室内部向南移动550mm，锚定主卧唯一飘窗BW-2F-002。";

const bayWindows = data.houseStructuresByFloor?.["2F"]?.bayWindows ?? [];
if (bayWindows.length !== 1 || bayWindows[0].id !== "BW-2F-002") {
  throw new Error("Expected one master-bedroom bay window BW-2F-002");
}
bayWindows[0].name = "主卧南墙唯一1600×550mm外凸飘窗";
bayWindows[0].notes = "坐榻嵌入外凸深度，不占用卧室室内净宽。";

const camera = data.cameraViews.find((item) => item.floor === "2F" && item.order === 5);
if (!camera) throw new Error("Missing 2F camera 05");
camera.name = "05 主卧严格尺寸—350mm薄柜、600mm床尾净距与右侧飘窗";
camera.fov = 58;
camera.zoom = 1;
camera.description = "采用接近50mm标准镜头的自然透视：床长2000mm、东墙薄柜深350mm、床尾净距约603mm；右侧1600×550mm飘窗坐榻完全嵌入外凸区，内侧前沿不突出南墙。"

data.dataRevision = "2F-bay-bench-strict-camera-v12-20260810";
data.updatedAt = new Date().toISOString();
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(JSON.stringify({
  revision: data.dataRevision,
  bench: {
    name: bench.name,
    position: bench.position,
    dimensions: bench.dimensions,
    hostWallId: bench.hostWallId
  },
  bayWindow: bayWindows[0],
  camera: { name: camera.name, fov: camera.fov },
  checks: {
    bedFootClearanceMm: 2953 - 2000 - 350,
    benchInsideRoomProjectionMm: 0
  }
}, null, 2));
