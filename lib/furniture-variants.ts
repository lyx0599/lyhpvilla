import type { Furniture, Render3DAssetType, Render3DMeta } from "@/types/space";

export type FurnitureFamily = "bed" | "sofa" | "diningTable" | "coffeeTable" | "chair" | "cabinet" | "softDecor" | "mediaWall" | "other";

export type FurnitureVariantDefinition = {
  id: string;
  label: string;
  description: string;
  planShape: "rect" | "round" | "oval" | "curve" | "lShape" | "open" | "glass" | "floating";
};

export type FurnitureVariantResolution = {
  family: FurnitureFamily;
  variant: FurnitureVariantDefinition;
  seed: number;
  variation: {
    asymmetry: number;
    cushionBias: number;
    openSide: -1 | 1;
    panelBias: number;
  };
};

export const MODERN_NATURAL_STYLE_PRESET = "modernNatural";

export const furnitureFamilyLabels: Record<FurnitureFamily, string> = {
  bed: "床",
  sofa: "沙发",
  diningTable: "餐桌",
  coffeeTable: "茶几",
  chair: "餐椅与单椅",
  cabinet: "柜体",
  softDecor: "地毯与灯具",
  mediaWall: "电视与壁炉墙",
  other: "通用家具"
};

export const furnitureVariantCatalog: Record<FurnitureFamily, FurnitureVariantDefinition[]> = {
  bed: [
    { id: "lowUpholstered", label: "低矮软包床", description: "低床头、厚软包床框与松弛床品", planShape: "rect" },
    { id: "tallPanelHeadboard", label: "高分块床头床", description: "高床头和竖向软包分块", planShape: "rect" },
    { id: "timberFrame", label: "浅木框架床", description: "清晰木框、轻薄床垫与木脚", planShape: "open" },
    { id: "floatingPlatform", label: "悬浮平台床", description: "内收底座和外挑平台形成悬浮感", planShape: "floating" },
    { id: "minimalNoHeadboard", label: "无床头极简床", description: "取消床头，保留轻薄床框和床品层次", planShape: "open" },
    { id: "guestBed", label: "轻量客房床", description: "窄床框、低床头和精简靠枕", planShape: "rect" },
    { id: "childBed", label: "低位儿童床", description: "低矮床身和圆角安全侧沿", planShape: "open" }
  ],
  sofa: [
    { id: "lowModular", label: "低矮模块沙发", description: "低靠背、宽模块和细缝坐垫", planShape: "rect" },
    { id: "curvedSofa", label: "柔和弧形沙发", description: "弧形模块和包裹式靠背", planShape: "curve" },
    { id: "boucleCurve", label: "羊羔绒雕塑弧形沙发", description: "连续包裹靠背、不对称圆润坐垫和球形靠包", planShape: "curve" },
    { id: "slimLegSofa", label: "细腿轻盈沙发", description: "薄扶手、高离地和细金属脚", planShape: "open" },
    { id: "deepLounge", label: "深坐休闲沙发", description: "深坐面、厚靠包和松弛比例", planShape: "rect" },
    { id: "sectionalLShape", label: "L 型组合沙发", description: "带单侧贵妃位的组合结构", planShape: "lShape" },
    { id: "compactLoveseat", label: "紧凑双人沙发", description: "两座尺度和轻量扶手", planShape: "rect" },
    { id: "beanBag", label: "舒适懒人沙发", description: "低重心软体座包、包裹靠背与可移动落位", planShape: "curve" }
  ],
  diningTable: [
    { id: "roundPedestal", label: "圆形中柱桌", description: "圆桌面和收分中柱底座", planShape: "round" },
    { id: "roundFourLeg", label: "圆形四腿桌", description: "圆桌面和四只浅木桌腿", planShape: "round" },
    { id: "ovalSlab", label: "椭圆大板桌", description: "椭圆薄边台面和双片支座", planShape: "oval" },
    { id: "rectTimber", label: "长方木桌", description: "实木长桌面和内收木腿", planShape: "rect" },
    { id: "stoneTop", label: "暖灰石材桌", description: "石材台面和克制金属底座", planShape: "oval" },
    { id: "lightMetalFrame", label: "轻型金属框架桌", description: "薄台面和纤细框架桌腿", planShape: "rect" }
  ],
  coffeeTable: [
    { id: "clearGlassTop", label: "透明玻璃茶几", description: "通透低铁玻璃台面和纤细金属框架", planShape: "glass" },
    { id: "lowRound", label: "低矮圆茶几", description: "低圆台面和内收底座", planShape: "round" },
    { id: "nestedDouble", label: "双层组合茶几", description: "两只错位圆几形成层次", planShape: "curve" },
    { id: "travertineBlock", label: "洞石方几", description: "圆角洞石体块和轻薄底座", planShape: "rect" },
    { id: "longTimber", label: "木质长茶几", description: "浅木长台面和内收木脚", planShape: "rect" },
    { id: "softOrganic", label: "柔和不规则茶几", description: "偏心柔和曲面和短柱底座", planShape: "curve" }
  ],
  chair: [
    { id: "timberDining", label: "木质餐椅", description: "木框、弧背和轻薄坐面", planShape: "open" },
    { id: "upholsteredDining", label: "软包餐椅", description: "软包坐背和浅木细腿", planShape: "rect" },
    { id: "wovenDining", label: "编织感餐椅", description: "轻木框和通透编织靠背", planShape: "open" },
    { id: "wrapDining", label: "环抱软包餐椅", description: "米白软包环抱背、独立坐垫和深木细腿", planShape: "curve" },
    { id: "armHost", label: "带扶手主椅", description: "端位使用的弧形扶手椅", planShape: "curve" },
    { id: "lightSide", label: "轻型侧椅", description: "细金属框和薄坐垫", planShape: "open" },
    { id: "curvedLounge", label: "弧背休闲单椅", description: "包裹弧背和旋转底座", planShape: "curve" }
  ],
  cabinet: [
    { id: "fullHeightFlat", label: "通顶平板柜", description: "整面平板门、细分缝和无明装拉手", planShape: "rect" },
    { id: "slidingPanels", label: "通顶移门柜", description: "前后错轨移门、无外摆门扇，适合紧凑卧室", planShape: "rect" },
    { id: "floating", label: "悬浮柜", description: "内收挂装结构和底部灯带", planShape: "floating" },
    { id: "glassDisplay", label: "玻璃展示柜", description: "细框玻璃门和内部层板", planShape: "glass" },
    { id: "openClosedMix", label: "开放封闭组合柜", description: "开放格与平板柜门组合", planShape: "open" },
    { id: "woodWarmWhite", label: "浅木暖白组合柜", description: "暖白柜门和浅木开放区", planShape: "open" },
    { id: "archedBuffet", label: "拱形玻璃餐边柜", description: "双侧木饰面高柜、拱形玻璃吊柜、开放操作台和下柜", planShape: "rect" },
    { id: "archedBuffetUpper", label: "拱形玻璃吊柜", description: "中部拱形竖纹玻璃门与两侧木饰面门", planShape: "glass" },
    { id: "handleless", label: "无把手柜体", description: "反弹门和连续水平凹槽", planShape: "rect" },
    { id: "slimGlassFrame", label: "细框玻璃柜", description: "深色细框和浅茶玻璃", planShape: "glass" },
    { id: "wallMounted", label: "壁挂吊柜", description: "壁挂箱体和底部任务照明", planShape: "floating" }
  ],
  softDecor: [
    { id: "areaRug", label: "自然织物地毯", description: "低绒织物、柔和边缘和克制纹理", planShape: "rect" },
    { id: "floorLamp", label: "阅读落地灯", description: "细金属灯杆和织物灯罩", planShape: "round" },
    { id: "pendantLight", label: "柔光吊灯", description: "轻薄吊线和柔和下照灯罩", planShape: "round" },
    { id: "throwTextile", label: "自然织物披毯", description: "用于床尾或沙发的松弛织物层", planShape: "rect" },
    { id: "sculpturalVase", label: "克制陶艺摆件", description: "低饱和陶艺轮廓和小尺度点缀", planShape: "curve" }
  ],
  mediaWall: [
    { id: "integratedMediaWall", label: "壁炉电视一体墙", description: "木饰面、石材壁炉、电视和悬浮柜一体组合", planShape: "open" },
    { id: "floatingMediaWall", label: "悬浮电视柜墙", description: "暖白背景、悬浮柜和不对称开放层板", planShape: "floating" },
    { id: "stoneHearthWall", label: "石材壁炉墙", description: "暖灰石材壁炉和低矮木质收纳", planShape: "rect" }
  ],
  other: [
    { id: "proceduralDefault", label: "程序化默认", description: "保留现有资产类型的默认表达", planShape: "rect" }
  ]
};

const cabinetAssetTypes = new Set([
  "wardrobe", "walkInCloset", "cabinet", "wallCabinet", "kitchenCabinet", "sideboard", "entryCabinet",
  "snackCabinet", "bookshelf", "bathroomVanity", "island", "outdoorCabinet", "nightstand"
]);

function searchableText(item: Furniture) {
  return [item.floorId, item.roomId, item.name, item.code, item.type, item.moduleType, item.catalogId, item.note].filter(Boolean).join(" ").toLowerCase();
}

export function getFurnitureFamily(item: Furniture, assetType: string = item.render3d?.assetType ?? item.moduleType ?? item.type): FurnitureFamily {
  const text = searchableText(item);
  if (assetType === "fireplace") return "mediaWall";
  if (assetType === "bed" || item.type === "bed") return "bed";
  if (assetType === "sofa" || item.type === "sofa") return "sofa";
  if (assetType === "diningChair" || item.type === "chair") return "chair";
  if (["diningTable", "slabTable", "outdoorDiningSet"].includes(assetType)) return "diningTable";
  if (["coffeeTable", "loungeCoffeeTable"].includes(assetType)) return "coffeeTable";
  if (cabinetAssetTypes.has(assetType) || item.type === "cabinet") return "cabinet";
  if (item.type === "table") return Math.max(item.dimensions.width, item.dimensions.depth) >= 165 ? "diningTable" : "coffeeTable";
  if (/电视墙|壁炉|media wall|fireplace/.test(text)) return "mediaWall";
  if (/地毯|rug|落地灯|floor lamp|吊灯|pendant|披毯|throw|陶艺|花瓶|vase/.test(text)) return "softDecor";
  return "other";
}

export function stableFurnitureSeed(id: string) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function stableVariationValue(seed: number, salt = 0) {
  let value = (seed + Math.imul(salt + 1, 0x6d2b79f5)) >>> 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function chooseBySeed<T>(items: T[], seed: number, salt = 0) {
  return items[Math.floor(stableVariationValue(seed, salt) * items.length) % items.length];
}

function findVariant(family: FurnitureFamily, variantId: string | undefined) {
  return furnitureVariantCatalog[family].find((candidate) => candidate.id === variantId);
}

export function getRecommendedFurnitureVariantId(item: Furniture, family = getFurnitureFamily(item)): string {
  const text = searchableText(item);
  const seed = item.render3d?.variationSeed ?? stableFurnitureSeed(item.id);
  if (family === "bed") {
    if (/儿童|child|kid/.test(text)) return "childBed";
    if (/客房|客卧|guest|b1|b2/.test(text)) return stableVariationValue(seed, 2) > 0.52 ? "guestBed" : "timberFrame";
    if (/主卧|master|room-2f-006/.test(text)) return stableVariationValue(seed, 1) > 0.48 ? "tallPanelHeadboard" : "floatingPlatform";
    return chooseBySeed(["lowUpholstered", "timberFrame", "minimalNoHeadboard"], seed, 3);
  }
  if (family === "sofa") {
    if (item.floorId === "1F") return stableVariationValue(seed, 4) > 0.62 ? "deepLounge" : "lowModular";
    if (item.floorId === "B1") return "deepLounge";
    if (item.floorId === "B2") return "sectionalLShape";
    return chooseBySeed(["slimLegSofa", "compactLoveseat", "curvedSofa"], seed, 6);
  }
  if (family === "diningTable") {
    if (item.floorId === "YARD" || /户外|庭院|yard/.test(text)) return "lightMetalFrame";
    if (/大板|slab/.test(text)) return "ovalSlab";
    if (Math.abs(item.dimensions.width - item.dimensions.depth) < 35) return stableVariationValue(seed, 7) > 0.46 ? "roundPedestal" : "roundFourLeg";
    return chooseBySeed(["ovalSlab", "rectTimber", "stoneTop"], seed, 8);
  }
  if (family === "coffeeTable") return chooseBySeed(["lowRound", "nestedDouble", "travertineBlock", "longTimber", "softOrganic"], seed, 9);
  if (family === "chair") return chooseBySeed(["timberDining", "upholsteredDining", "wovenDining", "lightSide", "curvedLounge"], seed, 10);
  if (family === "cabinet") {
    const assetType = item.render3d?.assetType ?? item.moduleType ?? item.type;
    if (assetType === "bathroomVanity") return "floating";
    if (assetType === "wallCabinet") return "wallMounted";
    if (assetType === "walkInCloset" || assetType === "wardrobe") return stableVariationValue(seed, 11) > 0.58 ? "openClosedMix" : "fullHeightFlat";
    if (assetType === "sideboard" || assetType === "entryCabinet") return stableVariationValue(seed, 12) > 0.52 ? "glassDisplay" : "woodWarmWhite";
    if (assetType === "outdoorCabinet") return "handleless";
    if (assetType === "island" || assetType === "kitchenCabinet") return "woodWarmWhite";
    return chooseBySeed(["handleless", "openClosedMix", "woodWarmWhite", "slimGlassFrame"], seed, 13);
  }
  if (family === "softDecor") {
    if (/地毯|rug/.test(text)) return "areaRug";
    if (/落地灯|floor lamp/.test(text)) return "floorLamp";
    if (/吊灯|pendant/.test(text)) return "pendantLight";
    if (/披毯|throw/.test(text)) return "throwTextile";
    return "sculpturalVase";
  }
  if (family === "mediaWall") return /悬浮/.test(text) ? "floatingMediaWall" : /石材/.test(text) ? "stoneHearthWall" : "integratedMediaWall";
  return "proceduralDefault";
}

export function resolveFurnitureVariant(item: Furniture, assetType?: Render3DAssetType | string): FurnitureVariantResolution {
  const family = getFurnitureFamily(item, assetType);
  const seed = item.render3d?.variationSeed ?? stableFurnitureSeed(item.id);
  const variant = findVariant(family, item.render3d?.variantId) ?? findVariant(family, getRecommendedFurnitureVariantId(item, family)) ?? furnitureVariantCatalog[family][0];
  return {
    family,
    variant,
    seed,
    variation: {
      asymmetry: stableVariationValue(seed, 21) * 2 - 1,
      cushionBias: stableVariationValue(seed, 22),
      openSide: stableVariationValue(seed, 23) >= 0.5 ? 1 : -1,
      panelBias: stableVariationValue(seed, 24)
    }
  };
}

export function getFurniturePlanShapeKey(item: Furniture, assetType?: Render3DAssetType | string) {
  const resolved = resolveFurnitureVariant(item, assetType);
  return `${resolved.family}:${resolved.variant.id}:${resolved.variant.planShape}`;
}

export function getModernNaturalMaterials(item: Furniture, family = getFurnitureFamily(item), variantId = getRecommendedFurnitureVariantId(item, family)) {
  if (family === "bed") return { primaryMaterial: /timber|guest|child|minimal/i.test(variantId) ? "warmOak" : "beigeFabric", secondaryMaterial: "creamFabric", accentMaterial: item.floorId === "B1" || item.floorId === "B2" ? "camelFabric" : "taupeFabric" };
  if (family === "sofa") return { primaryMaterial: item.floorId === "B1" || item.floorId === "B2" ? "taupeFabric" : "beigeFabric", secondaryMaterial: "creamFabric", accentMaterial: "camelFabric" };
  if (family === "diningTable") return { primaryMaterial: variantId === "stoneTop" ? "warmGreyStone" : variantId === "lightMetalFrame" ? "microCement" : "warmOak", secondaryMaterial: variantId === "stoneTop" ? "warmOak" : "blackTitanium", accentMaterial: "brushedBronze" };
  if (family === "coffeeTable") return { primaryMaterial: variantId.includes("travertine") || variantId === "softOrganic" ? "travertine" : "warmOak", secondaryMaterial: "warmGreyStone", accentMaterial: "blackTitanium" };
  if (family === "chair") return { primaryMaterial: variantId === "upholsteredDining" || variantId === "curvedLounge" ? "beigeFabric" : "warmOak", secondaryMaterial: variantId === "wovenDining" ? "camelFabric" : "creamFabric", accentMaterial: "blackTitanium" };
  if (family === "cabinet") return { primaryMaterial: variantId.includes("Glass") || variantId === "glassDisplay" ? "warmOak" : "warmOak", secondaryMaterial: variantId === "glassDisplay" || variantId === "slimGlassFrame" ? "smokedGlass" : item.render3d?.assetType === "bathroomVanity" ? "travertine" : "warmWhiteCeramic", accentMaterial: "brushedBronze" };
  if (family === "softDecor") return { primaryMaterial: variantId === "areaRug" ? "beigeFabric" : variantId.includes("Light") ? "creamFabric" : "warmWhiteCeramic", secondaryMaterial: "taupeFabric", accentMaterial: "blackTitanium" };
  if (family === "mediaWall") return { primaryMaterial: "warmOak", secondaryMaterial: "travertine", accentMaterial: "blackTitanium" };
  return { primaryMaterial: item.render3d?.primaryMaterial, secondaryMaterial: item.render3d?.secondaryMaterial, accentMaterial: item.render3d?.accentMaterial };
}

export function getRecommendedFurnitureDetailLevel(item: Furniture): NonNullable<Render3DMeta["detailLevel"]> {
  const text = searchableText(item);
  const family = getFurnitureFamily(item);
  if (item.floorId !== "YARD" && ["bed", "sofa", "diningTable", "coffeeTable", "chair", "cabinet"].includes(family)) return "presentation";
  if (/主沙发|主卧|六人|餐边柜|玄关柜|岛台|壁炉|衣帽间|主卫|水吧|庭院/.test(text)) return "presentation";
  return item.floorId === "YARD" ? "standard" : "standard";
}

export function withFurnitureVariantDefaults(item: Furniture): Furniture {
  const family = getFurnitureFamily(item);
  const seed = item.render3d?.variationSeed ?? stableFurnitureSeed(item.id);
  const variantId = item.render3d?.variantId ?? getRecommendedFurnitureVariantId({ ...item, render3d: { ...(item.render3d ?? { assetType: item.moduleType ?? item.type }), variationSeed: seed } }, family);
  return {
    ...item,
    render3d: {
      ...(item.render3d ?? { assetType: item.moduleType ?? item.type }),
      variantId,
      variationSeed: seed,
      stylePreset: item.render3d?.stylePreset ?? MODERN_NATURAL_STYLE_PRESET,
      styleSource: item.render3d?.styleSource ?? "generated"
    }
  };
}

export function isFurnitureStyleProtected(item: Furniture) {
  const possibleVerification = item as Furniture & { verificationMeta?: { status?: string } };
  return Boolean(item.locked || item.render3d?.styleLocked || item.render3d?.styleSource === "manual" || possibleVerification.verificationMeta?.status === "confirmed");
}

export function isModernNaturalStyleEligible(item: Furniture) {
  return getFurnitureFamily(item) !== "other";
}

export type ModernNaturalScope = { type: "room"; roomId: string } | { type: "floor"; floorId: string } | { type: "house" };

export function isFurnitureInModernNaturalScope(item: Furniture, scope: ModernNaturalScope) {
  if (scope.type === "house") return true;
  if (scope.type === "floor") return item.floorId === scope.floorId;
  return item.roomId === scope.roomId || item.outdoorId === scope.roomId;
}

export function previewModernNaturalApplication(items: Furniture[], scope: ModernNaturalScope) {
  const scoped = items.filter((item) => isFurnitureInModernNaturalScope(item, scope));
  const skipped = scoped.filter((item) => isFurnitureStyleProtected(item) || !isModernNaturalStyleEligible(item));
  return { total: scoped.length, adjustable: scoped.length - skipped.length, skipped: skipped.length, skippedIds: skipped.map((item) => item.id) };
}

export function applyModernNaturalStyle(items: Furniture[], scope: ModernNaturalScope) {
  let adjusted = 0;
  let skipped = 0;
  const furniture = items.map((item) => {
    if (!isFurnitureInModernNaturalScope(item, scope)) return item;
    if (isFurnitureStyleProtected(item) || !isModernNaturalStyleEligible(item)) {
      skipped += 1;
      return item;
    }
    const seeded = withFurnitureVariantDefaults(item);
    const family = getFurnitureFamily(seeded);
    const variantId = getRecommendedFurnitureVariantId(seeded, family);
    const materials = getModernNaturalMaterials(seeded, family, variantId);
    adjusted += 1;
    const styled = {
      ...seeded,
      render3d: {
        ...seeded.render3d!,
        variantId,
        stylePreset: MODERN_NATURAL_STYLE_PRESET,
        styleSource: "generated" as const,
        detailLevel: getRecommendedFurnitureDetailLevel(seeded),
        ...materials
      }
    };
    return {
      ...styled,
      floorId: item.floorId,
      roomId: item.roomId,
      outdoorId: item.outdoorId,
      position: item.position
    };
  });
  return { furniture, adjusted, skipped };
}

export function cycleFurnitureVariant(item: Furniture, direction = 1): Furniture {
  const seeded = withFurnitureVariantDefaults(item);
  const family = getFurnitureFamily(seeded);
  const variants = furnitureVariantCatalog[family];
  const currentIndex = Math.max(0, variants.findIndex((variant) => variant.id === seeded.render3d?.variantId));
  const variantId = variants[(currentIndex + direction + variants.length) % variants.length].id;
  return { ...seeded, render3d: { ...seeded.render3d!, variantId, styleSource: "manual" } };
}

export function restoreModernNaturalRecommendation(item: Furniture): Furniture {
  const seeded = withFurnitureVariantDefaults(item);
  const family = getFurnitureFamily(seeded);
  const variantId = getRecommendedFurnitureVariantId(seeded, family);
  return {
    ...seeded,
    render3d: {
      ...seeded.render3d!,
      variantId,
      stylePreset: MODERN_NATURAL_STYLE_PRESET,
      styleSource: "manual",
      detailLevel: getRecommendedFurnitureDetailLevel(seeded),
      ...getModernNaturalMaterials(seeded, family, variantId)
    }
  };
}
