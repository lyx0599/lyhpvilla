import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const knownAssetTypes = new Set([
  "bed",
  "nightstand",
  "wardrobe",
  "walkInCloset",
  "cabinet",
  "desk",
  "bathroomVanity",
  "toilet",
  "bathtub",
  "shower",
  "sofa",
  "coffeeTable",
  "diningTable",
  "diningChair",
  "kitchenCabinet",
  "island",
  "sideboard",
  "entryCabinet",
  "fireplace",
  "stair",
  "paving",
  "yardModule",
  "sink",
  "cooktop",
  "fridge",
  "pegboard",
  "bookshelf",
  "snackCabinet",
  "plant",
  "generic"
]);

function normalizeAssetType(value) {
  return value && knownAssetTypes.has(value) ? value : null;
}

function searchableText(item) {
  return [
    item.name,
    item.code,
    item.type,
    item.moduleType,
    item.moduleCategory,
    item.catalogId,
    item.material,
    item.note,
    item.constructionNote
  ].filter(Boolean).join(" ").toLowerCase();
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word.toLowerCase()));
}

function inferAssetType(item, options = {}) {
  const explicitAssetType = options.ignoreExplicit ? null : normalizeAssetType(item.render3d?.assetType);

  const moduleType = item.moduleType ?? item.type;
  const nameText = item.name.toLowerCase();
  const text = searchableText(item);

  if (moduleType === "bed") return "bed";
  if (moduleType === "nightstand") return "nightstand";
  if (moduleType === "wardrobe") return "wardrobe";
  if (moduleType === "vanity") return "bathroomVanity";
  if (moduleType === "toilet") return "toilet";
  if (moduleType === "bathtub") return "bathtub";
  if (moduleType === "shower") return "shower";
  if (moduleType === "sofa") return "sofa";
  if (moduleType === "table") {
    if (includesAny(nameText, ["茶几", "边几", "coffee"])) return "coffeeTable";
    if (includesAny(nameText, ["庭院", "院子", "休闲活动", "yard"])) return "yardModule";
    return Math.max(item.dimensions.width, item.dimensions.depth) >= 165 ? "diningTable" : "coffeeTable";
  }
  if (moduleType === "kitchenCabinet") return "kitchenCabinet";
  if (moduleType === "island") return "island";
  if (moduleType === "sideboard") return "sideboard";
  if (moduleType === "entryCabinet") return "entryCabinet";
  if (moduleType === "fireplace") return "fireplace";
  if (moduleType === "sink") return "sink";
  if (moduleType === "cooktop") return "cooktop";
  if (moduleType === "fridge") return "fridge";
  if (moduleType === "pegboard") return "pegboard";
  if (moduleType === "bookshelf") return "bookshelf";
  if (moduleType === "snackCabinet") return "snackCabinet";
  if (moduleType === "plant") return item.floorId === "YARD" ? "yardModule" : "plant";
  if (moduleType === "cabinet" || item.type === "cabinet") return "cabinet";
  if (item.type === "chair") return "diningChair";

  if (includesAny(nameText, ["梳妆台", "整理桌", "书桌", "desk", "化妆台"])) return "desk";
  if (includesAny(nameText, ["衣帽间", "walk-in", "walk in", "walkin"])) return "walkInCloset";
  if (includesAny(nameText, ["浴室柜", "台盆柜", "洗手台", "vanity"])) return "bathroomVanity";
  if (includesAny(nameText, ["餐边柜"])) return "sideboard";
  if (includesAny(nameText, ["玄关柜", "鞋柜", "入户柜"])) return "entryCabinet";
  if (includesAny(nameText, ["零食柜", "囤货柜"])) return "snackCabinet";
  if (includesAny(nameText, ["橱柜", "厨房柜", "水吧台"])) return "kitchenCabinet";
  if (includesAny(nameText, ["中岛", "岛台"])) return "island";
  if (includesAny(nameText, ["壁炉", "fireplace"])) return "fireplace";
  if (includesAny(nameText, ["衣柜", "wardrobe"])) return "wardrobe";
  if (includesAny(nameText, ["床头柜", "床边柜", "nightstand"])) return "nightstand";
  if (includesAny(nameText, ["床"])) return "bed";
  if (includesAny(nameText, ["马桶", "toilet"])) return "toilet";
  if (includesAny(nameText, ["浴缸", "bathtub"])) return "bathtub";
  if (includesAny(nameText, ["淋浴", "shower"])) return "shower";
  if (includesAny(nameText, ["沙发", "sofa"])) return "sofa";
  if (includesAny(nameText, ["电视"])) return "cabinet";
  if (includesAny(nameText, ["软垫", "地垫", "mat"])) return "paving";
  if (includesAny(nameText, ["茶几", "边几", "coffee"])) return "coffeeTable";
  if (includesAny(nameText, ["餐桌", "大板桌", "dining"])) return "diningTable";
  if (includesAny(nameText, ["餐椅", "chair"])) return "diningChair";
  if (includesAny(nameText, ["灶台", "灶", "cooktop"])) return "cooktop";
  if (includesAny(nameText, ["水槽", "洗菜盆", "sink"])) return "sink";
  if (includesAny(nameText, ["冰箱", "fridge", "refrigerator"])) return "fridge";
  if (includesAny(nameText, ["洞洞板", "pegboard"])) return "pegboard";
  if (includesAny(nameText, ["书架", "书柜", "bookshelf"])) return "bookshelf";
  if (includesAny(nameText, ["铺装", "硬化", "平台", "小路", "paving"])) return "paving";
  if (includesAny(nameText, ["庭院", "院子", "晾晒", "宠物", "狗屋", "烧烤", "yard", "bbq"])) return "yardModule";
  if (includesAny(nameText, ["绿植", "植物", "树", "plant"])) return item.floorId === "YARD" ? "yardModule" : "plant";

  if (explicitAssetType) return explicitAssetType;

  if (includesAny(text, ["梳妆台", "整理桌", "书桌", "desk", "化妆台"])) return "desk";
  if (includesAny(text, ["软垫", "地垫", "mat", "铺装", "硬化", "平台", "小路", "paving"])) return "paving";
  if (includesAny(text, ["庭院", "院子", "晾晒", "宠物", "狗屋", "烧烤", "yard", "bbq"])) return "yardModule";
  if (includesAny(text, ["绿植", "植物", "树", "plant"])) return item.floorId === "YARD" ? "yardModule" : "plant";

  return item.floorId === "YARD" ? "yardModule" : "generic";
}

function inferPrimaryMaterial(item, assetType) {
  const text = searchableText(item);
  if (item.render3d?.primaryMaterial) return item.render3d.primaryMaterial;
  if (assetType === "shower") return "glass";
  if (assetType === "toilet" || assetType === "bathtub" || assetType === "bathroomVanity") return "ceramic";
  if (assetType === "sofa" || assetType === "bed" || assetType === "diningChair") return "fabric";
  if (assetType === "sink" || assetType === "cooktop") return "metal";
  if (includesAny(text, ["玻璃", "glass", "透明"])) return "glass";
  if (includesAny(text, ["岩板", "石英", "大理石", "石材", "stone"])) return "stone";
  if (includesAny(text, ["金属", "不锈钢", "metal", "铝"])) return "metal";
  if (includesAny(text, ["布", "绒", "软包", "fabric", "皮革"])) return "fabric";
  if (includesAny(text, ["陶瓷", "ceramic"])) return "ceramic";
  if (includesAny(text, ["植物", "绿植", "plant"])) return "plant";
  return includesAny(text, ["木", "原木", "wood"]) ? "wood" : item.material;
}

function inferSecondaryMaterial(assetType, primaryMaterial) {
  if (assetType === "bed") return "bedding-fabric";
  if (assetType === "wardrobe" || assetType === "walkInCloset") return "interior-wood";
  if (assetType === "kitchenCabinet" || assetType === "island" || assetType === "sideboard") return "stone-countertop";
  if (assetType === "shower") return "metal-frame";
  if (assetType === "fireplace") return "stone-surround";
  if (assetType === "yardModule") return "outdoor-finish";
  return primaryMaterial;
}

function inferAccentMaterial(assetType) {
  if (assetType === "bed" || assetType === "sofa") return "soft-accent-fabric";
  if (assetType === "wardrobe" || assetType === "cabinet" || assetType === "kitchenCabinet") return "handle-metal";
  if (assetType === "bathroomVanity" || assetType === "sink" || assetType === "shower") return "brushed-metal";
  if (assetType === "fireplace") return "warm-emissive-light";
  if (assetType === "yardModule" || assetType === "paving") return "outdoor-detail";
  return "detail";
}

function defaultMepMeta(item, assetType) {
  const serviceRequirements = item.serviceRequirements ?? {};
  const text = searchableText(item);
  const needsWaterSupply = Boolean(serviceRequirements.water) || ["sink", "bathroomVanity", "shower", "bathtub", "toilet"].includes(assetType);
  const needsDrainage = Boolean(serviceRequirements.drainage) || needsWaterSupply || assetType === "toilet";
  const needsSocket =
    Boolean(serviceRequirements.power) ||
    ["kitchenCabinet", "island", "sideboard", "entryCabinet", "fireplace", "fridge", "cooktop", "bathroomVanity", "desk", "nightstand"].includes(assetType) ||
    includesAny(text, ["电源", "插座", "灯", "净饮", "咖啡", "电动"]);
  const needsVentilation = Boolean(serviceRequirements.exhaust) || assetType === "cooktop" || includesAny(text, ["排烟", "通风", "除湿"]);
  const needsLighting = ["walkInCloset", "wardrobe", "bathroomVanity", "fireplace", "island", "desk", "nightstand"].includes(assetType) || includesAny(text, ["灯带", "镜前灯", "灯"]);
  const socketCount = needsSocket
    ? assetType === "island" || assetType === "kitchenCabinet" || assetType === "desk" ? 2
      : assetType === "sideboard" || assetType === "bathroomVanity" ? 2
        : 1
    : 0;
  return {
    needsSocket,
    socketCount,
    needsSwitch: needsLighting || includesAny(text, ["开关", "双控"]),
    needsLighting,
    needsWaterSupply,
    needsDrainage,
    needsNetwork: includesAny(text, ["网络", "弱电", "电视", "投影", "路由"]),
    needsVentilation,
    notes: item.constructionNote || item.note
  };
}

function defaultConstructionMeta(item, assetType) {
  const customMade = [
    "wardrobe",
    "walkInCloset",
    "cabinet",
    "desk",
    "bathroomVanity",
    "kitchenCabinet",
    "island",
    "sideboard",
    "entryCabinet",
    "snackCabinet",
    "bookshelf",
    "pegboard",
    "fireplace"
  ].includes(assetType);
  const installType = assetType === "paving" || assetType === "yardModule"
    ? "outdoor-fixed"
    : customMade
      ? "custom-built-in"
      : ["toilet", "bathtub", "shower", "sink", "cooktop", "fridge"].includes(assetType)
        ? "equipment-install"
        : "loose-furniture";
  return {
    customMade,
    installType,
    reserveSize: `${item.dimensions.width}x${item.dimensions.depth}x${item.dimensions.height}cm`,
    notes: item.constructionNote || item.note
  };
}

const refreshAssetType = process.argv.includes("--refresh-asset-type");

function enrichItem(item) {
  const assetType = inferAssetType(item, { ignoreExplicit: refreshAssetType });
  const primaryMaterial = inferPrimaryMaterial(item, assetType);
  const defaultRender3d = {
    assetType,
    detailLevel: "standard",
    stylePreset: "warmJapandi",
    primaryMaterial,
    secondaryMaterial: inferSecondaryMaterial(assetType, primaryMaterial),
    accentMaterial: inferAccentMaterial(assetType),
    visibleIn3d: true,
    selectableIn3d: true,
    childrenMode: "merged"
  };
  return {
    ...item,
    render3d: {
      ...defaultRender3d,
      ...item.render3d,
      assetType
    },
    mepMeta: {
      ...defaultMepMeta(item, assetType),
      ...item.mepMeta
    },
    constructionMeta: {
      ...defaultConstructionMeta(item, assetType),
      ...item.constructionMeta
    }
  };
}

const workspacePathArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const workspacePath = resolve(workspacePathArg ?? "data/default-workspace.json");
const workspace = JSON.parse(await readFile(workspacePath, "utf8"));

if (!Array.isArray(workspace.furniture)) {
  throw new Error("Workspace JSON must include a furniture array.");
}

workspace.furniture = workspace.furniture.map(enrichItem);
workspace.savedAt = new Date().toISOString();

await writeFile(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`, "utf8");
console.log(`Updated ${workspace.furniture.length} furniture modules in ${workspacePath}`);
