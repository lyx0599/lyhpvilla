import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data/default-workspace.json");
const backupPath = path.join(root, "data/backups/default-workspace-20260810-before-master-wardrobe-v8.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
if (!fs.existsSync(backupPath)) fs.copyFileSync(dataPath, backupPath);

const wardrobe = data.furniture.find((item) => item.id === "furn-2f-master-bedroom-large-wardrobe-001");
if (!wardrobe) throw new Error("Missing master-bedroom wardrobe");

wardrobe.name = "主卧床尾3000mm对称展示型通顶大衣柜";
wardrobe.dimensions = { width: 300, depth: 60, height: 275, unit: "cm" };
wardrobe.material = "浅暖灰木饰面柜门 + 两侧烟熏玻璃展示格 + 细黄铜收边 + 3000K感应灯带";
wardrobe.note = "东墙南段扩为3000mm整墙柜，中心对应1800mm床轴线；两侧窄幅烟熏玻璃展示格，中部封闭主衣柜承担日常挂衣与叠放。北侧仍与入口五斗橱分开。";
wardrobe.constructionNote = "3000×600mm通顶定制柜；中部约2040mm封闭衣柜，两侧各约480mm烟熏玻璃展示格。现场复核床尾净距、南端收口、柜内灯带电源及北侧五斗橱间距。";
wardrobe.notes = "床尾轴线严格居中；柜体不做单调大平板，采用对称的玻璃—木饰面—玻璃构图。";

wardrobe.render3d = {
  ...wardrobe.render3d,
  variantId: "fullHeightDisplayEnds",
  primaryMaterial: "smokedOatTaupe",
  secondaryMaterial: "warmOak",
  accentMaterial: "brushedBrass",
  cabinetVisual: {
    frontStyle: "slab",
    handleStyle: "groove",
    openingMode: "doubleSwing",
    glassTone: "smoked",
    allDoorPanels: false,
    layout: "panels",
    displayContents: true,
    interiorLighting: true,
    doorCount: 6,
    topGapMm: 20,
    sideGapMm: 15,
    plinthSetbackMm: 60,
    sideScribeMm: 25,
    bays: [
      { widthRatio: 0.16, frontType: "glass", shelfCount: 4, interiorLighting: true },
      { widthRatio: 0.22, frontType: "solid" },
      { widthRatio: 0.24, frontType: "solid" },
      { widthRatio: 0.22, frontType: "solid" },
      { widthRatio: 0.16, frontType: "glass", shelfCount: 4, interiorLighting: true }
    ]
  }
};

wardrobe.mepMeta = {
  ...wardrobe.mepMeta,
  notes: "3000×600mm展示型通顶柜；两侧玻璃格及中部柜内灯带统一采用3000K门控/人体感应，驱动留检修位。"
};
wardrobe.constructionMeta = {
  ...wardrobe.constructionMeta,
  reserveSize: "300x60x275cm",
  notes: "按3000×600×2750mm深化；两侧玻璃格各约480mm，中部封闭衣柜约2040mm，复核床尾净距和端部收口。"
};

const camera = data.cameraViews.find((item) => item.floor === "2F" && item.order === 5);
if (camera) {
  camera.name = "05 主卧床尾轴线—3000mm展示型通顶大衣柜";
  camera.description = "从床头沿床轴线向东看：3000mm通顶衣柜居中正对床尾；两侧窄幅烟熏玻璃展示格，中部浅暖灰封闭衣柜，细黄铜线和3000K灯带提升别墅主卧质感。";
}

data.dataRevision = "2F-master-wardrobe-v8-20260810";
data.updatedAt = new Date().toISOString();
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(JSON.stringify({
  revision: data.dataRevision,
  wardrobe: {
    name: wardrobe.name,
    dimensions: wardrobe.dimensions,
    bays: wardrobe.render3d.cabinetVisual.bays,
    camera: camera?.name
  }
}, null, 2));
