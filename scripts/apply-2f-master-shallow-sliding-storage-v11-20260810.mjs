import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260810-before-shallow-sliding-storage-v11.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
if (!fs.existsSync(backupPath)) fs.copyFileSync(dataPath, backupPath);

const wardrobe = data.furniture.find((item) => item.id === "furn-2f-master-bedroom-large-wardrobe-001");
if (!wardrobe) throw new Error("Missing master-bedroom wardrobe");

wardrobe.name = "主卧床尾3000×350mm上吊移门薄柜";
wardrobe.type = "wardrobe";
wardrobe.dimensions = { width: 300, depth: 35, height: 275, unit: "cm" };
wardrobe.position = { ...wardrobe.position, x: 77.66666666666666, rotation: 90 };
wardrobe.material = "深烟熏胡桃木圆角框 + 四扇浅燕麦织物感上吊移门 + 深古铜细缝";
wardrobe.note = "床尾改为350mm浅柜，不设置标准横挂衣杆。四扇上吊移门无落地轨道，内部用于叠衣、内衣浅抽、包袋、床品和零碎收纳；日常挂衣进入衣帽间。";
wardrobe.constructionNote = "3000×350×2750mm通顶薄柜；四扇上吊双轨移门，预留检修与防摆器，不设凸出地轨。按当前模型床尾净距约603mm，现场需按床架完成尺寸复核。";
wardrobe.notes = "薄柜承担补充收纳，不标注为标准挂衣柜；床尾净距由约353mm增加至约603mm。";

wardrobe.wardrobeDesign = {
  columns: 4,
  rows: 4,
  cells: [
    { id: "cell-0-0", column: 0, row: 0, kind: "open" },
    { id: "cell-1-0", column: 1, row: 0, kind: "open" },
    { id: "cell-2-0", column: 2, row: 0, kind: "open" },
    { id: "cell-3-0", column: 3, row: 0, kind: "open" },
    { id: "cell-0-1", column: 0, row: 1, kind: "folded" },
    { id: "cell-1-1", column: 1, row: 1, kind: "folded" },
    { id: "cell-2-1", column: 2, row: 1, kind: "folded" },
    { id: "cell-3-1", column: 3, row: 1, kind: "folded" },
    { id: "cell-0-2", column: 0, row: 2, kind: "drawer" },
    { id: "cell-1-2", column: 1, row: 2, kind: "drawer" },
    { id: "cell-2-2", column: 2, row: 2, kind: "drawer" },
    { id: "cell-3-2", column: 3, row: 2, kind: "drawer" },
    { id: "cell-0-3", column: 0, row: 3, kind: "folded" },
    { id: "cell-1-3", column: 1, row: 3, kind: "folded" },
    { id: "cell-2-3", column: 2, row: 3, kind: "folded" },
    { id: "cell-3-3", column: 3, row: 3, kind: "folded" }
  ],
  modules: [
    { id: "shallow-seasonal", kind: "open", label: "顶部床品与换季区", column: 0, columnSpan: 4, x: 0, y: 0, width: 100, height: 20 },
    { id: "shallow-folded-left", kind: "folded", label: "双人叠衣区A", column: 0, columnSpan: 2, shelfCount: 5, x: 0, y: 20, width: 50, height: 52 },
    { id: "shallow-folded-right", kind: "folded", label: "双人叠衣区B", column: 2, columnSpan: 2, shelfCount: 5, x: 50, y: 20, width: 50, height: 52 },
    { id: "shallow-drawers", kind: "drawer", label: "内衣与零碎浅抽", column: 0, columnSpan: 2, drawerRows: 3, drawerColumns: 2, x: 0, y: 72, width: 50, height: 28 },
    { id: "shallow-bags", kind: "folded", label: "包袋与床品区", column: 2, columnSpan: 2, shelfCount: 3, x: 50, y: 72, width: 50, height: 28 }
  ],
  columnWidths: [25, 25, 25, 25],
  notes: "350mm浅柜方案：不设标准横挂衣杆；上吊移门后净深按约270–290mm深化，用于叠衣、浅抽、包袋和床品。"
};

wardrobe.render3d = {
  ...wardrobe.render3d,
  variantId: "shallowTopHungSlidingTextile",
  primaryMaterial: "smokedWalnut",
  secondaryMaterial: "smokedOatTaupe",
  accentMaterial: "darkBronze",
  cabinetVisual: {
    frontStyle: "slab",
    handleStyle: "groove",
    openingMode: "sliding",
    allDoorPanels: true,
    layout: "panels",
    displayContents: false,
    interiorLighting: false,
    doorCount: 4,
    cornerRadiusMm: 80,
    topGapMm: 15,
    sideGapMm: 12,
    plinthSetbackMm: 70,
    sideScribeMm: 25,
    bays: [
      { widthRatio: 0.25, frontType: "solid" },
      { widthRatio: 0.25, frontType: "solid" },
      { widthRatio: 0.25, frontType: "solid" },
      { widthRatio: 0.25, frontType: "solid" }
    ]
  }
};

wardrobe.mepMeta = {
  ...wardrobe.mepMeta,
  lightingType: "none",
  needsLighting: false,
  needsSmartControl: false,
  notes: "薄柜不设柜内灯带；移门上吊轨需与吊顶基层和检修条件协同。"
};
wardrobe.constructionMeta = {
  ...wardrobe.constructionMeta,
  reserveSize: "300x35x275cm",
  notes: "3000×350×2750mm上吊移门薄柜；柜内净深按轨道系统深化，不作为标准横挂衣柜。"
};

const camera = data.cameraViews.find((item) => item.floor === "2F" && item.order === 5);
if (camera) {
  camera.name = "05 主卧床尾350mm移门薄柜与右侧飘窗";
  camera.description = "床尾正对3000×350mm上吊移门薄柜，床尾净距约603mm；右侧为南墙唯一飘窗。机位需显出薄柜侧板深度和无地轨移门。";
}

data.dataRevision = "2F-master-shallow-sliding-storage-v11-20260810";
data.updatedAt = new Date().toISOString();
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(JSON.stringify({
  revision: data.dataRevision,
  wardrobe: {
    name: wardrobe.name,
    dimensions: wardrobe.dimensions,
    position: wardrobe.position,
    openingMode: wardrobe.render3d.cabinetVisual.openingMode,
    modeledBedFootClearanceMm: 2953 - 2000 - 350
  },
  camera: camera?.name
}, null, 2));
