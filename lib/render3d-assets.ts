import type {
  ConstructionMeta,
  Furniture,
  MepMeta,
  ModuleServiceRequirements,
  Render3DAssetType,
  Render3DMeta
} from "@/types/space";
import {
  getFurnitureFamily,
  getRecommendedFurnitureVariantId,
  MODERN_NATURAL_STYLE_PRESET,
  stableFurnitureSeed
} from "./furniture-variants.ts";
import type { FurnitureFamily } from "./furniture-variants.ts";

export type Resolved3DAsset = {
  assetType: Render3DAssetType;
  componentKey: Render3DAssetType;
  family: FurnitureFamily;
  variantId: string;
  variationSeed: number;
  detailLevel: NonNullable<Render3DMeta["detailLevel"]>;
  stylePreset: string;
  primaryMaterial: string;
  secondaryMaterial: string;
  accentMaterial: string;
  materials: ResolvedRender3DMaterials;
  visibleIn3d: boolean;
  selectableIn3d: boolean;
  childrenMode: NonNullable<Render3DMeta["childrenMode"]>;
  complexGroup: boolean;
};

export type Render3DMaterialRole = "wood" | "fabric" | "leather" | "stone" | "metal" | "glass" | "ceramic" | "light" | "plant" | "generic";

export type Render3DMaterialDefinition = {
  label: string;
  role: Render3DMaterialRole;
  color: string;
  roughness: number;
  metalness: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
};

export type ResolvedRender3DMaterialLayer = Render3DMaterialDefinition & {
  token: string;
  source: "render3d" | "material" | "color" | "fallback";
};

export type ResolvedRender3DMaterials = {
  stylePreset: string;
  styleLabel: string;
  primary: ResolvedRender3DMaterialLayer;
  secondary: ResolvedRender3DMaterialLayer;
  accent: ResolvedRender3DMaterialLayer;
  childrenMode: NonNullable<Render3DMeta["childrenMode"]>;
  summary: string;
};

export const render3DMaterialTokenCatalog = {
  warmOak: { label: "浅橡木", role: "wood", color: "#c8ad8b", roughness: 0.52, metalness: 0.02 },
  walnut: { label: "低饱和胡桃木", role: "wood", color: "#927965", roughness: 0.5, metalness: 0.02 },
  honeyWood: { label: "蜂蜜木", role: "wood", color: "#c5a47d", roughness: 0.54, metalness: 0.02 },
  creamFabric: { label: "奶油布艺", role: "fabric", color: "#eee3d6", roughness: 0.92, metalness: 0 },
  creamBoucle: { label: "奶油羊羔绒", role: "fabric", color: "#e8dece", roughness: 0.98, metalness: 0 },
  beigeFabric: { label: "米灰布艺", role: "fabric", color: "#d8cabc", roughness: 0.94, metalness: 0 },
  taupeFabric: { label: "灰褐布艺", role: "fabric", color: "#aa9786", roughness: 0.93, metalness: 0 },
  camelFabric: { label: "浅驼软装", role: "fabric", color: "#b99876", roughness: 0.9, metalness: 0 },
  cognacLeather: { label: "棕色头层真皮", role: "leather", color: "#7b4428", roughness: 0.46, metalness: 0.01 },
  darkBrownLeather: { label: "深棕真皮", role: "leather", color: "#4f2d20", roughness: 0.5, metalness: 0.01 },
  warmGreyStone: { label: "暖灰石材", role: "stone", color: "#d8d1c6", roughness: 0.34, metalness: 0.04 },
  travertine: { label: "米色洞石", role: "stone", color: "#ded2bd", roughness: 0.38, metalness: 0.03 },
  microCement: { label: "暖灰微水泥", role: "stone", color: "#cbc3b8", roughness: 0.72, metalness: 0.02 },
  warmWhiteCeramic: { label: "暖白陶瓷", role: "ceramic", color: "#fbf8f1", roughness: 0.26, metalness: 0.01 },
  blackTitanium: { label: "黑钛金属", role: "metal", color: "#343331", roughness: 0.28, metalness: 0.68 },
  brushedBronze: { label: "拉丝古铜", role: "metal", color: "#a17f5b", roughness: 0.26, metalness: 0.72 },
  clearGlass: { label: "低铁玻璃", role: "glass", color: "#c9e7e8", roughness: 0.04, metalness: 0.02, opacity: 0.34 },
  smokedGlass: { label: "茶色玻璃", role: "glass", color: "#8f8379", roughness: 0.08, metalness: 0.04, opacity: 0.38 },
  graySmokedGlass: { label: "灰色透明玻璃", role: "glass", color: "#9ca5a8", roughness: 0.07, metalness: 0.05, opacity: 0.3 },
  mirror: { label: "镜面", role: "glass", color: "#b9c4c4", roughness: 0.06, metalness: 0.82, opacity: 0.68 },
  warmLightEmissive: { label: "2700K-3000K 暖光", role: "light", color: "#ffe7b0", roughness: 0.18, metalness: 0, emissive: "#ffe7b0", emissiveIntensity: 0.74 },
  plantSoftGreen: { label: "低饱和绿植", role: "plant", color: "#7f936c", roughness: 0.72, metalness: 0 }
} satisfies Record<string, Render3DMaterialDefinition>;

export type Render3DMaterialToken = keyof typeof render3DMaterialTokenCatalog;

const knownAssetTypes = new Set<Render3DAssetType>([
  "bed",
  "nightstand",
  "wardrobe",
  "walkInCloset",
  "cabinet",
  "wallCabinet",
  "desk",
  "bathroomVanity",
  "toilet",
  "bathtub",
  "shower",
  "sofa",
  "coffeeTable",
  "loungeCoffeeTable",
  "diningTable",
  "slabTable",
  "diningChair",
  "kitchenCabinet",
  "island",
  "sideboard",
  "entryCabinet",
  "fireplace",
  "stair",
  "paving",
  "yardModule",
  "outdoorDiningSet",
  "dryingRack",
  "dogHouse",
  "yardGate",
  "outdoorCabinet",
  "yardLight",
  "outdoorSocket",
  "drainPoint",
  "sink",
  "cooktop",
  "fridge",
  "pegboard",
  "bookshelf",
  "snackCabinet",
  "plant",
  "generic"
]);

const groupedAssetTypes = new Set<Render3DAssetType>([
  "bed",
  "wardrobe",
  "walkInCloset",
  "cabinet",
  "wallCabinet",
  "desk",
  "bathroomVanity",
  "shower",
  "sofa",
  "coffeeTable",
  "loungeCoffeeTable",
  "diningTable",
  "slabTable",
  "kitchenCabinet",
  "island",
  "sideboard",
  "entryCabinet",
  "fireplace",
  "stair",
  "yardModule",
  "outdoorDiningSet",
  "dryingRack",
  "dogHouse",
  "yardGate",
  "outdoorCabinet",
  "yardLight",
  "outdoorSocket",
  "drainPoint",
  "pegboard",
  "bookshelf",
  "snackCabinet"
]);

const materialAliases: Record<string, Render3DMaterialToken> = {
  wood: "warmOak",
  "wood-finish": "warmOak",
  "interior-wood": "honeyWood",
  "handle-metal": "brushedBronze",
  metal: "blackTitanium",
  "metal-frame": "blackTitanium",
  fabric: "creamFabric",
  "bedding-fabric": "beigeFabric",
  "soft-accent-fabric": "taupeFabric",
  stone: "warmGreyStone",
  "stone-countertop": "travertine",
  "stone-surround": "travertine",
  "outdoor-finish": "microCement",
  "outdoor-detail": "blackTitanium",
  ceramic: "warmWhiteCeramic",
  glass: "clearGlass",
  detail: "brushedBronze",
  "warm-emissive-light": "warmLightEmissive",
  light: "warmLightEmissive",
  plant: "plantSoftGreen"
};

const render3DStyleLabels: Record<string, string> = {
  modernNatural: "现代自然",
  "tuscan-sunlight": "托斯卡纳阳光",
  elevatedTuscanSun: "托斯卡纳阳光",
  warmJapandi: "托斯卡纳阳光",
  naturalWood: "浅木自然",
  softCream: "奶油白",
  modernStone: "现代灰"
};

function normalizeAssetType(value: string | undefined): Render3DAssetType | null {
  if (!value) return null;
  return knownAssetTypes.has(value as Render3DAssetType) ? value as Render3DAssetType : null;
}

function normalizeStylePreset(value: string | undefined) {
  if (!value) return MODERN_NATURAL_STYLE_PRESET;
  if (value === "elevatedTuscanSun" || value === "warmJapandi") return "tuscan-sunlight";
  return value;
}

function normalizeMaterialToken(value: string | undefined): Render3DMaterialToken | null {
  if (!value) return null;
  if (value in render3DMaterialTokenCatalog) return value as Render3DMaterialToken;
  const normalized = value.trim().replace(/\s+/g, "").replace(/[-_](.)/g, (_, char: string) => char.toUpperCase());
  if (normalized in render3DMaterialTokenCatalog) return normalized as Render3DMaterialToken;
  const alias = materialAliases[value] ?? materialAliases[value.toLowerCase()];
  return alias ?? null;
}

function materialFallbackTokens(assetType: Render3DAssetType): [Render3DMaterialToken, Render3DMaterialToken, Render3DMaterialToken] {
  if (assetType === "bed") return ["creamFabric", "warmOak", "taupeFabric"];
  if (assetType === "sofa" || assetType === "diningChair") return ["creamFabric", "warmOak", "taupeFabric"];
  if (assetType === "wardrobe" || assetType === "walkInCloset" || assetType === "cabinet" || assetType === "wallCabinet" || assetType === "entryCabinet" || assetType === "snackCabinet" || assetType === "bookshelf" || assetType === "pegboard") return ["warmOak", "smokedGlass", "brushedBronze"];
  if (assetType === "kitchenCabinet" || assetType === "sideboard") return ["warmOak", "warmGreyStone", "brushedBronze"];
  if (assetType === "island") return ["microCement", "travertine", "brushedBronze"];
  if (assetType === "slabTable") return ["walnut", "blackTitanium", "brushedBronze"];
  if (assetType === "loungeCoffeeTable") return ["warmOak", "travertine", "blackTitanium"];
  if (assetType === "diningTable" || assetType === "coffeeTable" || assetType === "desk" || assetType === "nightstand") return ["warmOak", "travertine", "brushedBronze"];
  if (assetType === "bathroomVanity") return ["travertine", "warmOak", "brushedBronze"];
  if (assetType === "shower") return ["clearGlass", "blackTitanium", "brushedBronze"];
  if (assetType === "toilet" || assetType === "bathtub") return ["warmWhiteCeramic", "brushedBronze", "warmGreyStone"];
  if (assetType === "sink") return ["warmGreyStone", "brushedBronze", "clearGlass"];
  if (assetType === "cooktop" || assetType === "fridge") return ["blackTitanium", "warmGreyStone", "brushedBronze"];
  if (assetType === "fireplace") return ["travertine", "microCement", "warmLightEmissive"];
  if (assetType === "outdoorDiningSet") return ["warmOak", "microCement", "blackTitanium"];
  if (assetType === "dryingRack" || assetType === "yardGate" || assetType === "yardLight" || assetType === "outdoorSocket" || assetType === "drainPoint") return ["blackTitanium", "microCement", "warmLightEmissive"];
  if (assetType === "dogHouse" || assetType === "outdoorCabinet") return ["warmOak", "warmGreyStone", "blackTitanium"];
  if (assetType === "paving" || assetType === "yardModule") return ["warmGreyStone", "microCement", "blackTitanium"];
  if (assetType === "plant") return ["plantSoftGreen", "warmOak", "warmGreyStone"];
  return ["warmOak", "beigeFabric", "brushedBronze"];
}

function materialFromToken(token: Render3DMaterialToken, source: ResolvedRender3DMaterialLayer["source"]): ResolvedRender3DMaterialLayer {
  return {
    token,
    source,
    ...render3DMaterialTokenCatalog[token]
  };
}

function materialFromCustom(value: string, item: Furniture, source: ResolvedRender3DMaterialLayer["source"]): ResolvedRender3DMaterialLayer {
  return {
    token: value,
    label: value,
    role: "generic",
    color: item.color || "#d6d9d7",
    roughness: 0.62,
    metalness: 0.03,
    source
  };
}

function resolveMaterialLayer(value: string | undefined, fallbackToken: Render3DMaterialToken, item: Furniture, source: ResolvedRender3DMaterialLayer["source"]) {
  const token = normalizeMaterialToken(value);
  if (token) return materialFromToken(token, source);
  if (value?.trim()) return materialFromCustom(value.trim(), item, source);
  return materialFromToken(fallbackToken, "fallback");
}

function searchableText(item: Furniture) {
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

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word.toLowerCase()));
}

export function infer3DAssetType(item: Furniture): Render3DAssetType {
  const explicitAssetType = normalizeAssetType(item.render3d?.assetType);

  const moduleType = item.moduleType ?? item.type;
  const nameText = item.name.toLowerCase();
  const text = searchableText(item);

  if (includesAny(nameText, ["衣帽间", "walk-in", "walk in", "walkin"])) return "walkInCloset";

  if (moduleType === "bed") return "bed";
  if (moduleType === "nightstand") return "nightstand";
  if (moduleType === "wardrobe") return "wardrobe";
  if (moduleType === "vanity") return "bathroomVanity";
  if (moduleType === "toilet") return "toilet";
  if (moduleType === "bathtub") return "bathtub";
  if (moduleType === "shower") return "shower";
  if (moduleType === "sofa") return "sofa";
  if (moduleType === "table") {
    if (includesAny(nameText, ["大板桌", "slab"])) return "slabTable";
    if (includesAny(nameText, ["可移动茶几", "托盘茶几", "移动茶几"])) return "loungeCoffeeTable";
    if (includesAny(nameText, ["茶几", "边几", "coffee"])) return "coffeeTable";
    if (includesAny(nameText, ["庭院", "院子", "休闲活动", "yard"])) return "yardModule";
    return Math.max(item.dimensions.width, item.dimensions.depth) >= 165 ? "diningTable" : "coffeeTable";
  }
  if (moduleType === "kitchenCabinet") return "kitchenCabinet";
  if (moduleType === "island") return "island";
  if (moduleType === "sideboard") return "sideboard";
  if (moduleType === "cabinet" && includesAny(nameText, ["吊柜", "wall cabinet", "upper cabinet"])) return "wallCabinet";
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
  if (includesAny(nameText, ["浴室柜", "台盆柜", "洗手台", "vanity"])) return "bathroomVanity";
  if (includesAny(nameText, ["吊柜", "wall cabinet", "upper cabinet"])) return "wallCabinet";
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
  if (includesAny(nameText, ["可移动茶几", "托盘茶几", "移动茶几"])) return "loungeCoffeeTable";
  if (includesAny(nameText, ["茶几", "边几", "coffee"])) return "coffeeTable";
  if (includesAny(nameText, ["大板桌", "slab"])) return "slabTable";
  if (includesAny(nameText, ["餐桌", "dining"])) return "diningTable";
  if (includesAny(nameText, ["餐椅", "chair"])) return "diningChair";
  if (includesAny(nameText, ["灶台", "灶", "cooktop"])) return "cooktop";
  if (includesAny(nameText, ["水槽", "洗菜盆", "sink"])) return "sink";
  if (includesAny(nameText, ["冰箱", "fridge", "refrigerator"])) return "fridge";
  if (includesAny(nameText, ["洞洞板", "pegboard"])) return "pegboard";
  if (includesAny(nameText, ["书架", "书柜", "bookshelf"])) return "bookshelf";
  if (includesAny(nameText, ["铺装", "硬化", "平台", "小路", "paving"])) return "paving";
  if (includesAny(nameText, ["休闲活动桌椅", "户外桌椅", "outdoor dining", "lounge set"])) return "outdoorDiningSet";
  if (includesAny(nameText, ["晾晒架", "晾衣架", "drying rack"])) return "dryingRack";
  if (includesAny(nameText, ["狗窝", "宠物屋", "dog house"])) return "dogHouse";
  if (includesAny(nameText, ["庭院门", "院门", "yard gate"])) return "yardGate";
  if (includesAny(nameText, ["户外柜", "庭院柜", "outdoor cabinet"])) return "outdoorCabinet";
  if (includesAny(nameText, ["庭院灯", "yard light", "path light"])) return "yardLight";
  if (includesAny(nameText, ["户外插座", "防水户外插座", "outdoor socket"])) return "outdoorSocket";
  if (includesAny(nameText, ["排水点", "地漏", "drain point"])) return "drainPoint";
  if (includesAny(nameText, ["庭院", "院子", "南院", "北院", "户外柜", "院门", "晾晒", "宠物", "狗屋", "烧烤", "yard", "bbq"])) return "yardModule";
  if (includesAny(nameText, ["绿植", "植物", "树", "plant"])) return item.floorId === "YARD" ? "yardModule" : "plant";

  if (explicitAssetType) return explicitAssetType;

  if (includesAny(text, ["梳妆台", "整理桌", "书桌", "desk", "化妆台"])) return "desk";
  if (includesAny(text, ["软垫", "地垫", "mat", "铺装", "硬化", "平台", "小路", "paving"])) return "paving";
  if (includesAny(text, ["庭院", "院子", "晾晒", "宠物", "狗屋", "烧烤", "yard", "bbq"])) return "yardModule";
  if (includesAny(text, ["绿植", "植物", "树", "plant"])) return item.floorId === "YARD" ? "yardModule" : "plant";

  return item.floorId === "YARD" ? "yardModule" : "generic";
}

function inferPrimaryMaterial(item: Furniture, assetType: Render3DAssetType) {
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

function inferSecondaryMaterial(assetType: Render3DAssetType, primaryMaterial: string) {
  if (assetType === "bed") return "bedding-fabric";
  if (assetType === "wardrobe" || assetType === "walkInCloset") return "interior-wood";
  if (assetType === "wallCabinet") return "glass";
  if (assetType === "kitchenCabinet" || assetType === "island" || assetType === "sideboard") return "stone-countertop";
  if (assetType === "shower") return "metal-frame";
  if (assetType === "fireplace") return "stone-surround";
  if (assetType === "yardModule" || assetType === "outdoorDiningSet" || assetType === "dryingRack" || assetType === "dogHouse" || assetType === "yardGate" || assetType === "outdoorCabinet" || assetType === "yardLight" || assetType === "outdoorSocket" || assetType === "drainPoint") return "outdoor-finish";
  return primaryMaterial;
}

function inferAccentMaterial(assetType: Render3DAssetType) {
  if (assetType === "bed" || assetType === "sofa") return "soft-accent-fabric";
  if (assetType === "wardrobe" || assetType === "cabinet" || assetType === "wallCabinet" || assetType === "kitchenCabinet") return "handle-metal";
  if (assetType === "bathroomVanity" || assetType === "sink" || assetType === "shower") return "brushed-metal";
  if (assetType === "fireplace" || assetType === "yardLight") return "warm-emissive-light";
  if (assetType === "yardModule" || assetType === "paving" || assetType === "outdoorDiningSet" || assetType === "dryingRack" || assetType === "dogHouse" || assetType === "yardGate" || assetType === "outdoorCabinet" || assetType === "outdoorSocket" || assetType === "drainPoint") return "outdoor-detail";
  return "detail";
}

function serviceRequirementsToMep(serviceRequirements: ModuleServiceRequirements | undefined, item: Furniture, assetType: Render3DAssetType): MepMeta {
  const text = searchableText(item);
  const isBed = assetType === "bed";
  const isNightstand = assetType === "nightstand";
  const isWardrobe = assetType === "wardrobe" || assetType === "walkInCloset";
  const isVanity = assetType === "bathroomVanity";
  const isToilet = assetType === "toilet";
  const isBathtub = assetType === "bathtub";
  const isShower = assetType === "shower";
  const isDesk = assetType === "desk";
  const isTvCabinet = assetType === "cabinet" && includesAny(text, ["电视", "影音", "media", "tv"]);
  const isWashingCabinet = includesAny(text, ["洗衣机柜", "洗衣柜", "洗烘", "washing machine"]);
  const isYardCabinet = (item.floorId === "YARD" || item.floorId === "1F") && includesAny(text, ["庭院柜", "户外柜", "院子柜", "洗衣柜", "洗手池柜", "yard cabinet"]);
  const hasSink = assetType === "sink" || includesAny(text, ["水槽", "洗手池", "台盆", "洗菜盆", "带水槽"]);
  const isWetIsland = assetType === "island" && hasSink;
  const isWetKitchenCabinet = assetType === "kitchenCabinet" && (hasSink || Boolean(serviceRequirements?.water));
  const needsWaterSupply =
    Boolean(serviceRequirements?.water) ||
    ["sink", "bathroomVanity", "shower", "bathtub", "toilet"].includes(assetType) ||
    isWashingCabinet ||
    isWetIsland ||
    isWetKitchenCabinet ||
    (isYardCabinet && hasSink);
  const needsDrainage =
    Boolean(serviceRequirements?.drainage) ||
    ["sink", "bathroomVanity", "shower", "bathtub", "toilet"].includes(assetType) ||
    isWashingCabinet ||
    isWetIsland ||
    isWetKitchenCabinet ||
    (isYardCabinet && hasSink);
  const needsSocket =
    Boolean(serviceRequirements?.power) ||
    ["bed", "nightstand", "kitchenCabinet", "island", "sideboard", "entryCabinet", "fireplace", "fridge", "cooktop", "bathroomVanity", "desk"].includes(assetType) ||
    isTvCabinet ||
    isWashingCabinet ||
    isYardCabinet ||
    includesAny(text, ["电源", "插座", "灯", "净饮", "咖啡", "电动"]);
  const needsVentilation = Boolean(serviceRequirements?.exhaust) || assetType === "cooktop" || isShower || includesAny(text, ["排烟", "通风", "除湿", "排风"]);
  const needsLighting = isBed || isNightstand || isWardrobe || isVanity || isDesk || ["fireplace", "island"].includes(assetType) || includesAny(text, ["灯带", "镜前灯", "床头灯", "台灯", "庭院灯", "草坪灯", "户外灯"]);
  const socketCount = needsSocket
    ? isBed || isTvCabinet ? 4
      : isDesk || assetType === "sideboard" || assetType === "kitchenCabinet" || assetType === "island" ? 3
        : isNightstand || isVanity ? 2
          : 1
    : 0;
  const lightingType: NonNullable<MepMeta["lightingType"]> = isWardrobe
    ? "cabinetStrip"
    : isVanity
      ? "mirrorLight"
      : isBed || isNightstand || isDesk
        ? "task"
        : needsLighting
          ? "decorative"
          : "none";
  const waterSupplyType: NonNullable<MepMeta["waterSupplyType"]> = needsWaterSupply
    ? assetType === "sink" && includesAny(text, ["净水", "饮水", "filtered"])
      ? "filtered"
      : isToilet
        ? "cold"
        : isVanity || isBathtub || isShower || hasSink
        ? "hotCold"
        : "cold"
    : "none";
  const drainageType: NonNullable<MepMeta["drainageType"]> = needsDrainage
    ? isShower
      ? "floorDrain"
      : isVanity || assetType === "sink" || isWetIsland || isWetKitchenCabinet || isWashingCabinet
        ? "cabinetDrain"
        : "wallDrain"
    : "none";
  const switchControl = needsLighting
    ? isBed
      ? ["床头阅读灯", "卧室主灯双控"]
      : isWardrobe
        ? ["柜内灯带门控/感应"]
        : isVanity
          ? ["镜前灯"]
          : isDesk || isNightstand
            ? ["台灯/任务灯"]
            : ["模块照明"]
    : [];

  return {
    needsSocket,
    socketCount,
    socketHeight: needsSocket ? isBed || isNightstand ? 650 : isDesk || isTvCabinet ? 300 : isVanity ? 1100 : 300 : 0,
    needsSwitch: needsLighting || includesAny(text, ["开关", "双控"]),
    switchControl,
    needsLighting,
    lightingType,
    lightColorTemperature: needsLighting ? "3000K" : undefined,
    needsWaterSupply,
    waterSupplyType,
    needsDrainage,
    drainageType,
    needsNetwork: isDesk || isTvCabinet || includesAny(text, ["网络", "弱电", "电视", "投影", "路由"]),
    needsVentilation,
    needsSmartControl: isWardrobe || isTvCabinet || includesAny(text, ["智能", "感应", "电动"]),
    relatedCircuit: needsSocket
      ? isVanity || isToilet || isWashingCabinet || isYardCabinet
        ? "防溅/防水回路"
        : isTvCabinet
          ? "客厅影音回路"
          : isBed || isNightstand
            ? "卧室床头回路"
            : assetType === "kitchenCabinet" || assetType === "island"
              ? "厨房台面回路"
              : "常规插座回路"
      : undefined,
    notes: item.constructionNote || item.note
  };
}

function normalizeInstallType(value: string | undefined): ConstructionMeta["installType"] | undefined {
  if (!value) return undefined;
  const aliases: Record<string, NonNullable<ConstructionMeta["installType"]>> = {
    "loose-furniture": "finishedFurniture",
    "custom-built-in": "customCabinet",
    "equipment-install": "floorStanding",
    "outdoor-fixed": "floorStanding"
  };
  if (value in aliases) return aliases[value];
  if (["finishedFurniture", "customCabinet", "builtIn", "wallMounted", "floorStanding", "embedded", "other"].includes(value)) {
    return value as NonNullable<ConstructionMeta["installType"]>;
  }
  return "other";
}

function inferConstructionMeta(item: Furniture, assetType: Render3DAssetType): ConstructionMeta {
  const text = searchableText(item);
  const isWashingCabinet = includesAny(text, ["洗衣机柜", "洗衣柜", "洗烘", "washing machine"]);
  const isYardCabinet = (item.floorId === "YARD" || item.floorId === "1F") && includesAny(text, ["庭院柜", "户外柜", "院子柜", "洗衣柜", "洗手池柜", "yard cabinet"]);
  const isWetArea = ["bathroomVanity", "toilet", "bathtub", "shower", "sink"].includes(assetType) || isWashingCabinet;
  const customMade = isYardCabinet || [
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
  const installType: NonNullable<ConstructionMeta["installType"]> = assetType === "fireplace"
    ? "builtIn"
    : assetType === "cooktop"
      ? "embedded"
      : customMade || isWashingCabinet
        ? "customCabinet"
        : ["bathroomVanity"].includes(assetType)
          ? "wallMounted"
          : ["toilet", "bathtub", "shower", "sink", "fridge", "paving", "yardModule"].includes(assetType)
            ? "floorStanding"
            : "finishedFurniture";
  const wallDependency = customMade || assetType === "fireplace"
    ? includesAny(text, ["贴墙", "沿 w-", "墙固定", "整墙"])
      ? "依现场墙面完成面复尺，校核基层与收口"
      : "安装前复核邻墙垂直度与完成面尺寸"
    : "";
  const floorDependency = isWetArea || assetType === "paving" || isYardCabinet
    ? "复核完成面标高、排水坡度与固定基层"
    : "按完成面标高校核落地尺寸";
  const ceilingDependency = assetType === "walkInCloset" || assetType === "wardrobe"
    ? "柜体到顶时与吊顶、灯带电源和检修空间协同"
    : assetType === "shower"
      ? "与排风、暖风和吊顶检修口协同"
      : "";
  const inspectionAccessRequired = ["bathroomVanity", "toilet", "bathtub", "shower", "fireplace"].includes(assetType) || isWashingCabinet || includesAny(text, ["水槽", "洗碗机", "净水", "检修"]);

  return {
    customMade,
    installType,
    reserveSize: `${item.dimensions.width}x${item.dimensions.depth}x${item.dimensions.height}cm`,
    wallDependency,
    floorDependency,
    ceilingDependency,
    waterproofRequired: isWetArea || isYardCabinet,
    inspectionAccessRequired,
    purchaseCategory: isYardCabinet
      ? "户外柜"
      : customMade
        ? "定制柜体/硬装"
        : isWetArea
          ? "卫浴设备"
          : "成品家具",
    supplierType: customMade || isWashingCabinet ? "全屋定制/木作供应商" : isWetArea ? "卫浴设备供应商" : "成品家具供应商",
    notes: item.constructionNote || item.note
  };
}

export function getDefaultRender3DMeta(item: Furniture): Render3DMeta {
  const assetType = infer3DAssetType(item);
  const primaryMaterial = inferPrimaryMaterial(item, assetType);
  const variationSeed = item.render3d?.variationSeed ?? stableFurnitureSeed(item.id);
  const family = getFurnitureFamily(item, assetType);
  return {
    assetType,
    variantId: item.render3d?.variantId ?? getRecommendedFurnitureVariantId({
      ...item,
      render3d: { ...(item.render3d ?? { assetType }), variationSeed }
    }, family),
    variationSeed,
    detailLevel: item.render3d?.detailLevel ?? "standard",
    stylePreset: item.render3d?.stylePreset ?? MODERN_NATURAL_STYLE_PRESET,
    styleSource: item.render3d?.styleSource ?? "generated",
    primaryMaterial,
    secondaryMaterial: item.render3d?.secondaryMaterial ?? inferSecondaryMaterial(assetType, primaryMaterial),
    accentMaterial: item.render3d?.accentMaterial ?? inferAccentMaterial(assetType),
    visibleIn3d: item.render3d?.visibleIn3d ?? true,
    selectableIn3d: item.render3d?.selectableIn3d ?? true,
    childrenMode: item.render3d?.childrenMode ?? "merged"
  };
}

export function getDefaultMepMeta(item: Furniture): MepMeta {
  const assetType = infer3DAssetType(item);
  return serviceRequirementsToMep(item.serviceRequirements, item, assetType);
}

export function getDefaultConstructionMeta(item: Furniture): ConstructionMeta {
  return inferConstructionMeta(item, infer3DAssetType(item));
}

export function resolveRender3DMaterials(item: Furniture, assetType: Render3DAssetType = infer3DAssetType(item)): ResolvedRender3DMaterials {
  const [primaryFallback, secondaryFallback, accentFallback] = materialFallbackTokens(assetType);
  const primary = resolveMaterialLayer(item.render3d?.primaryMaterial ?? item.material, primaryFallback, item, item.render3d?.primaryMaterial ? "render3d" : item.material ? "material" : "fallback");
  const secondary = resolveMaterialLayer(item.render3d?.secondaryMaterial, secondaryFallback, item, item.render3d?.secondaryMaterial ? "render3d" : "fallback");
  const accent = resolveMaterialLayer(item.render3d?.accentMaterial, accentFallback, item, item.render3d?.accentMaterial ? "render3d" : "fallback");
  const stylePreset = normalizeStylePreset(item.render3d?.stylePreset);
  const styleLabel = render3DStyleLabels[item.render3d?.stylePreset ?? ""] ?? render3DStyleLabels[stylePreset] ?? stylePreset;
  const childrenMode = item.render3d?.childrenMode ?? "merged";
  return {
    stylePreset,
    styleLabel,
    primary,
    secondary,
    accent,
    childrenMode,
    summary: `${primary.label} / ${secondary.label} / ${accent.label}`
  };
}

export function enrichFurniture3DMeta(item: Furniture): Furniture {
  const defaultRender3d = getDefaultRender3DMeta(item);
  const defaultMepMeta = getDefaultMepMeta(item);
  const defaultConstructionMeta = getDefaultConstructionMeta(item);
  const hasDetailedMepMeta = Boolean(item.mepMeta && [
    "socketHeight",
    "switchControl",
    "lightingType",
    "waterSupplyType",
    "drainageType",
    "needsSmartControl",
    "relatedCircuit"
  ].some((key) => key in item.mepMeta!));
  const hasDetailedConstructionMeta = Boolean(item.constructionMeta && [
    "wallDependency",
    "floorDependency",
    "ceilingDependency",
    "waterproofRequired",
    "inspectionAccessRequired",
    "purchaseCategory",
    "supplierType"
  ].some((key) => key in item.constructionMeta!));
  return {
    ...item,
    render3d: {
      ...defaultRender3d,
      ...item.render3d,
      assetType: normalizeAssetType(item.render3d?.assetType) ?? defaultRender3d.assetType
    },
    mepMeta: {
      ...defaultMepMeta,
      ...(hasDetailedMepMeta ? item.mepMeta : item.mepMeta?.notes ? { notes: item.mepMeta.notes } : {})
    },
    constructionMeta: {
      ...defaultConstructionMeta,
      ...(hasDetailedConstructionMeta ? item.constructionMeta : item.constructionMeta?.notes ? { notes: item.constructionMeta.notes } : {}),
      installType: hasDetailedConstructionMeta
        ? normalizeInstallType(item.constructionMeta?.installType) ?? defaultConstructionMeta.installType
        : defaultConstructionMeta.installType
    }
  };
}

export function resolve3DAsset(item: Furniture): Resolved3DAsset {
  const render3d = getDefaultRender3DMeta(item);
  const assetType = normalizeAssetType(item.render3d?.assetType) ?? render3d.assetType as Render3DAssetType;
  const materials = resolveRender3DMaterials(item, assetType);
  return {
    assetType,
    componentKey: assetType,
    family: getFurnitureFamily(item, assetType),
    variantId: item.render3d?.variantId ?? render3d.variantId ?? "proceduralDefault",
    variationSeed: item.render3d?.variationSeed ?? render3d.variationSeed ?? stableFurnitureSeed(item.id),
    detailLevel: item.render3d?.detailLevel ?? render3d.detailLevel ?? "standard",
    stylePreset: materials.stylePreset,
    primaryMaterial: materials.primary.token,
    secondaryMaterial: materials.secondary.token,
    accentMaterial: materials.accent.token,
    materials,
    visibleIn3d: item.render3d?.visibleIn3d ?? true,
    selectableIn3d: item.render3d?.selectableIn3d ?? true,
    childrenMode: materials.childrenMode,
    complexGroup: groupedAssetTypes.has(assetType)
  };
}
