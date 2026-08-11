import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const workspaceUrl = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspaceUrl, "utf8"));
const oneF = workspace.houseStructuresByFloor["1F"];

const byId = (items, id, label) => {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing ${label}: ${id}`);
  return item;
};

const northCourtyardDoor = byId(oneF.doors, "D-1F-006", "north courtyard door");
Object.assign(northCourtyardDoor, {
  name: "入户左侧通往北院900mm窄框玻璃门",
  operation: "swing",
  material: "glass",
  transparency: 0.78,
  openDirection: "leftIn",
  defaultOpenAmount: 0,
  visual: {
    style: "slimGlass",
    frameColor: "#554c43",
    hardwareColor: "#7b6b59",
    glassColor: "#dce8e7",
    woodColor: "#8f704f",
    leafCount: 1,
    jambMode: "minimal",
    thresholdHeightMm: 18
  },
  verificationMeta: {
    status: "drawing-derived",
    source: "developer-plan",
    sourceNote: "用户确认：西侧入户后，左侧为通往北院的900mm玻璃单开门。",
    toleranceMm: 30
  }
});

const bathroomNorthWindow = byId(oneF.windows, "WIN-1F-002", "1F bathroom north window");
Object.assign(bathroomNorthWindow, {
  name: "1F卫生间北墙1200mm推拉窗",
  width: 1200,
  height: 1400,
  sillHeightMm: 1200,
  operation: "sliding",
  verificationMeta: {
    status: "drawing-derived",
    source: "developer-plan",
    sourceNote: "开发商图纸确认：1F卫生间北墙保留1200mm窗，写实渲染不得省略。",
    toleranceMm: 80
  }
});

const entryDoor = byId(oneF.doors, "D-1F-007", "main entry door");
entryDoor.name = "西侧900mm主入户门";
entryDoor.material = "solid";
entryDoor.visual = { ...entryDoor.visual, style: "flushPanel", jambMode: "minimal" };
entryDoor.verificationMeta = {
  status: "drawing-derived",
  source: "developer-plan",
  sourceNote: "用户确认：从西侧主门进入，正面为玄关墙、右侧进入客厅。",
  toleranceMm: 30
};

// Keep the real openings, but park these leaves open for the fixed
// documentation cameras so door panels do not obscure the spaces behind them.
byId(oneF.doors, "D-1F-004", "kitchen sliding door").defaultOpenAmount = 0.78;
const guestBathDoor = byId(oneF.doors, "D-1F-005", "guest bath door");
Object.assign(guestBathDoor, {
  name: "1F卫生间900mm拱形长虹玻璃门（与厨房移门同墙平行）",
  hostId: "W-1F-009",
  width: 900,
  height: 2100,
  operation: "swing",
  material: "translucentGlass",
  transparency: 0.35,
  defaultOpenAmount: 0.32,
  visual: {
    ...guestBathDoor.visual,
    style: "archedReededGlass",
    frameColor: "#554c43",
    hardwareColor: "#7b6b59",
    glassColor: "#dce8e7",
    jambMode: "minimal"
  },
  verificationMeta: {
    status: "drawing-derived",
    source: "developer-plan",
    sourceNote: "卫生间门与厨房推拉门同设于W-1F-009墙体并保持平行；门洞净宽900mm、高2100mm，渲染不得缩窄或转到侧墙。",
    toleranceMm: 30
  }
});

byId(oneF.walls, "W-1F-001", "north foyer wall").name = "玄关北侧墙 / 北院玻璃门承载墙";
byId(oneF.walls, "W-1F-003", "west entry wall").name = "西侧主入户门承载墙";
byId(oneF.walls, "W-1F-004", "foyer front wall").name = "入户正对玄关挂衣墙";

const cameraUpdates = {
  "designer-camera-1f-01-foyer-entry": {
    name: "1F 入户三向关系",
    cameraPosition: { x: -1.95, y: 1.58, z: -2.12 },
    target: { x: -0.62, y: 1.12, z: -2.12 },
    zoom: 1,
    fov: 60,
    description: "从西侧主入户门内侧净区朝东看：画面左侧明确出现通往北院的900mm窄框玻璃门，正面是玄关超薄挂衣墙，右侧是进入客厅的开放方向。三者必须同时成立，主入户门扇不得遮挡镜头，禁止镜像、禁止出现楼梯。"
  },
  "designer-camera-1f-02-foyer-living": {
    name: "1F 玄关朝东南看客厅",
    cameraPosition: { x: -1.95, y: 1.58, z: -2.05 },
    target: { x: 0.25, y: 1.02, z: 0.75 },
    zoom: 1.02,
    fov: 48,
    description: "镜头位于西侧主入户门内的玄关净区，朝东南穿过玄关开口看客厅。入户正对的挂衣墙只作为画面左侧近景墙边，不再正面特写；北院玻璃门位于镜头左后方。客厅中央为面向西侧电视壁炉墙的低靠背浅弧沙发，电视墙在画面右侧，餐桌在更远的东侧。禁止出现楼梯、镜像玄关或水吧特写。"
  },
  "designer-camera-1f-03-living-overview": {
    fov: 48,
    description: "客餐厅整体正确关系：西侧电视壁炉墙、中央低靠背浅弧沙发、东侧电动圆桌与水吧、南侧固定窗和900mm玻璃门均按模型位置；中央无茶几，禁止镜像。"
  },
  "designer-camera-1f-04-living-sofa": {
    name: "1F 沙发正对电视壁炉",
    cameraPosition: { x: 1.15, y: 1.56, z: 2.05 },
    target: { x: -1.75, y: 1.04, z: 2.05 },
    zoom: 1.04,
    fov: 43,
    description: "从沙发后方略偏东朝西拍电视壁炉墙，低靠背浅弧沙发位于前景并正对电视；水吧在镜头背后，不得在画面右侧露出；无茶几、无休闲椅、无边几。"
  },
  "designer-camera-1f-05-living-daylight": {
    cameraPosition: { x: 1.45, y: 1.55, z: 1.3 },
    target: { x: 3.25, y: 1.18, z: 1.3 },
    zoom: 1.04,
    fov: 42
  },
  "designer-camera-1f-06-kitchen-entry": {
    cameraPosition: { x: 0.5, y: 1.56, z: 0.2 },
    target: { x: 0.3, y: 1.05, z: -2.85 },
    zoom: 1.02,
    fov: 55,
    description: "从厨房推拉门外朝北看U形厨房；画面右侧空间关系对应客卫而不是沙发。冰箱侧保留操作台与同宽吊柜且无额外高柜；门外左侧保持空墙。"
  },
  "designer-camera-1f-07-kitchen-worktop": {
    cameraPosition: { x: 2.62, y: 1.52, z: -1.72 },
    target: { x: 2.75, y: 1.12, z: -3.12 },
    zoom: 1.04,
    fov: 40
  },
  "designer-camera-1f-08-kitchen-living-link": {
    name: "1F 厨房朝南看客餐厅",
    cameraPosition: { x: 0.2, y: 1.56, z: -2.15 },
    target: { x: 0.9, y: 1.05, z: 0.9 },
    zoom: 1,
    fov: 50,
    description: "从厨房内部朝南看客餐厅：面对南方时，东侧电动圆桌和水吧在画面左侧，西侧电视壁炉墙在右侧；餐桌不得堵住厨房入口，禁止镜像。"
  },
  "designer-camera-1f-09-bedroom": {
    cameraPosition: { x: -3.45, y: 1.5, z: 0.92 },
    target: { x: -3.62, y: 1.02, z: 2.72 },
    zoom: 1.03,
    fov: 42
  },
  "designer-camera-1f-10-stair-public-route": {
    name: "1F 左下B1右上2F与唯一卧室门",
    cameraPosition: { x: -0.72, y: 1.62, z: 0.72 },
    target: { x: -3.55, y: 0.28, z: -0.48 },
    zoom: 1.08,
    fov: 36,
    description: "低畸变读取楼梯：左侧完整下行B1，右侧完整上行2F。楼梯右侧仅有D-1F-003这一樘1F卧室内开门；门右侧必须继续为实体墙，禁止虚构第二个房间、走廊、门洞或开放空间。"
  }
};

for (const camera of workspace.cameraViews) {
  const update = cameraUpdates[camera.id];
  if (update) Object.assign(camera, update);
}

const b1Cabinet = workspace.furniture.find((item) => item.id === "furn-b1-activity-bookshelf-001");
if (b1Cabinet) {
  b1Cabinet.position.y = 70.6;
  b1Cabinet.dimensions.width = 280;
  const baseNote = (b1Cabinet.note ?? "")
    .replace(/\s*楼梯重构后向南微调约\d+mm，避免柜体端部进入900mm梯段净区。/g, "")
    .replace(/\s*楼梯重构后改为约2800mm长并贴南段布置，柜体北端退出900mm梯段净区。/g, "");
  b1Cabinet.note = `${baseNote} 楼梯重构后改为约2800mm长并贴南段布置，柜体北端退出900mm梯段净区。`.trim();
}

workspace.defaultWorkspaceRevision = "1f-final-ten-view-sync-20260810";
workspace.savedAt = "2026-08-10T18:30:00.000+08:00";

await writeFile(workspaceUrl, `${JSON.stringify(workspace, null, 2)}\n`);
console.log(JSON.stringify({
  northCourtyardDoor: { id: northCourtyardDoor.id, material: northCourtyardDoor.material, style: northCourtyardDoor.visual.style },
  entryDoor: entryDoor.id,
  updatedCameras: Object.keys(cameraUpdates),
  b1CabinetPosition: b1Cabinet?.position
}, null, 2));
