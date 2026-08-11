import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260810-before-master-wardrobe-v9.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
if (!fs.existsSync(backupPath)) fs.copyFileSync(dataPath, backupPath);

const wardrobe = data.furniture.find((item) => item.id === "furn-2f-master-bedroom-large-wardrobe-001");
if (!wardrobe) throw new Error("Missing master-bedroom wardrobe");

wardrobe.name = "主卧床尾3000mm建筑化通顶大衣柜";
wardrobe.material = "深烟熏胡桃木圆角框 + 浅燕麦织物感门板 + 两侧竖向木格栅 + 深古铜收口";
wardrobe.note = "取消两侧玻璃包柜，改为克制的建筑化整墙柜。深木色圆角门洞式外框呼应弧形吊顶，中部浅燕麦织物感封闭门板承担主收纳，两端窄格栅门增加层次。";
wardrobe.constructionNote = "3000×600mm通顶柜；中部四扇约600mm织物感封闭门，两端各约300mm竖向格栅窄门。外框内侧做柔和圆角，底部暗踢脚；仅顶部及侧边上段留低亮度隐藏灯槽。";
wardrobe.notes = "设计感来自圆角深木框、织物门板和比例，不设置开放展示格或明露灯线。";
wardrobe.render3d = {
  ...wardrobe.render3d,
  variantId: "architecturalPortalTextile",
  primaryMaterial: "smokedWalnut",
  secondaryMaterial: "smokedOatTaupe",
  accentMaterial: "darkBronze",
  cabinetVisual: {
    frontStyle: "slab",
    handleStyle: "groove",
    openingMode: "doubleSwing",
    allDoorPanels: true,
    layout: "panels",
    displayContents: false,
    interiorLighting: false,
    doorCount: 6,
    cornerRadiusMm: 90,
    topGapMm: 15,
    sideGapMm: 12,
    plinthSetbackMm: 90,
    sideScribeMm: 30,
    bays: [
      { widthRatio: 0.10, frontType: "solid" },
      { widthRatio: 0.20, frontType: "solid" },
      { widthRatio: 0.20, frontType: "solid" },
      { widthRatio: 0.20, frontType: "solid" },
      { widthRatio: 0.20, frontType: "solid" },
      { widthRatio: 0.10, frontType: "solid" }
    ]
  }
};

wardrobe.mepMeta = {
  ...wardrobe.mepMeta,
  lightingType: "concealedEdgeWash",
  lightColorTemperature: "2700K",
  notes: "低亮度隐藏光仅设在上框内侧与两侧上段，不出现连续可见灯珠或发光轮廓；驱动留可检修位置。"
};
wardrobe.constructionMeta = {
  ...wardrobe.constructionMeta,
  notes: "3000×600×2750mm建筑化整墙柜；外框圆角、格栅门、织物感门板和暗踢脚均由同一木作厂家深化打样。"
};

const camera = data.cameraViews.find((item) => item.floor === "2F" && item.order === 5);
if (camera) {
  camera.name = "05 主卧床尾轴线—建筑化圆角整墙衣柜";
  camera.description = "床尾正对3000mm整墙柜：深烟熏胡桃木圆角框、两侧窄格栅门、中部浅燕麦织物感封闭门板及低亮度顶部藏光。"
}

data.dataRevision = "2F-master-wardrobe-v9-20260810";
data.updatedAt = new Date().toISOString();
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(JSON.stringify({
  revision: data.dataRevision,
  wardrobe: wardrobe.name,
  dimensions: wardrobe.dimensions,
  design: wardrobe.material,
  camera: camera?.name
}, null, 2));
