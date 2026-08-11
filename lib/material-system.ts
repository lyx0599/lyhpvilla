/**
 * Canonical material identities for the whole project.
 *
 * The catalog is intentionally data-only: 2D previews, 3D materials,
 * workspace migrations and construction exports can all consume it without
 * importing Three.js or a browser-only module.
 */

export type MaterialRole =
  | "wallBase"
  | "wallFeature"
  | "floorMain"
  | "floorWet"
  | "ceilingBase"
  | "joineryMain"
  | "countertop"
  | "trimMetal"
  | "glassMain"
  | "fabricMain";

export type MaterialTextureChannel =
  | "baseColor"
  | "normal"
  | "roughness"
  | "ao"
  | "height"
  | "metalness"
  | "transmission"
  | "emissive";

// `height` and `metalness` remain resource capabilities, not instructions to
// force a map in every renderer. Uniform metals use the scalar metalness
// value; a metalness map is only justified by spatial coating, wear or mixed
// material evidence. Height remains catalogued for future authored resources;
// the formal renderer currently keeps the synthesized height disconnected.

export type MaterialTextureDirection = "isotropic" | "alongU" | "alongV" | "longAxis" | "plankLayout";
export type MaterialQualityTier = "draft" | "standard" | "presentation";
export type MaterialDeviceClass = "desktop" | "mobile";

export type PbrMaterialDefinition = {
  label: string;
  family: "paint" | "microcement" | "wood" | "woodFloor" | "stone" | "fabric" | "leather" | "metal" | "glass" | "ceramic" | "tile";
  roles: readonly MaterialRole[];
  baseColor: string;
  accentColor: string;
  channels: Readonly<Record<MaterialTextureChannel, string | null>>;
  physicalSizeMm: readonly [number, number];
  direction: MaterialTextureDirection;
  uv: {
    scale: readonly [number, number];
    rotationDeg: number;
    allowQuarterTurns: boolean;
    alignToComponentLongAxis: boolean;
  };
  normalStrength: number;
  roughness: number;
  metalness: number;
  heightScaleMm?: number;
  transmission?: number;
  thicknessMm?: number;
  ior?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  pattern?: {
    kind: "plank" | "tile" | "slab";
    moduleWidthMm: number;
    moduleLengthMm: number;
    seamWidthMm: number;
    stagger?: number;
  };
  quality: Record<MaterialQualityTier, Record<MaterialDeviceClass, 256 | 512 | 1024 | 2048>>;
  source: {
    kind: "project-authored-procedural";
    name: string;
    license: "project-authored";
    note: string;
  };
  fallback: {
    color: string;
    roughness: number;
    metalness: number;
    opacity?: number;
  };
};

const standardQuality = {
  draft: { desktop: 256, mobile: 256 },
  standard: { desktop: 512, mobile: 256 },
  presentation: { desktop: 1024, mobile: 512 }
} as const;

const largeSurfaceQuality = {
  draft: { desktop: 512, mobile: 256 },
  standard: { desktop: 1024, mobile: 512 },
  presentation: { desktop: 1024, mobile: 512 }
} as const;

function channels(entries: Partial<Record<MaterialTextureChannel, string>>) {
  return {
    baseColor: entries.baseColor ?? null,
    normal: entries.normal ?? null,
    roughness: entries.roughness ?? null,
    ao: entries.ao ?? null,
    height: entries.height ?? null,
    metalness: entries.metalness ?? null,
    transmission: entries.transmission ?? null,
    emissive: entries.emissive ?? null
  } satisfies Readonly<Record<MaterialTextureChannel, string | null>>;
}

const projectSource = (name: string, note: string) => ({
  kind: "project-authored-procedural" as const,
  name,
  license: "project-authored" as const,
  note
});

export const pbrMaterialCatalog = {
  warmWhiteMineral: {
    label: "暖白矿物墙漆",
    family: "paint",
    roles: ["wallBase", "ceilingBase"],
    baseColor: "#e8e0d2",
    accentColor: "#cfc4b4",
    channels: channels({ baseColor: "mineral-paint-color", normal: "mineral-paint-normal", roughness: "mineral-paint-roughness", ao: "mineral-paint-ao" }),
    physicalSizeMm: [1600, 1600],
    direction: "isotropic",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.08,
    roughness: 0.9,
    metalness: 0,
    heightScaleMm: 0.18,
    quality: largeSurfaceQuality,
    source: projectSource("暖白矿物墙漆程序纹理", "低对比滚涂颗粒与矿物云纹；项目内生成，不含第三方位图。"),
    fallback: { color: "#e8e0d2", roughness: 0.9, metalness: 0 }
  },
  microCement: {
    label: "暖灰微水泥",
    family: "microcement",
    roles: ["wallBase", "wallFeature", "floorMain"],
    baseColor: "#cbc3b8",
    accentColor: "#aaa092",
    channels: channels({ baseColor: "microcement-color", normal: "microcement-normal", roughness: "microcement-roughness", ao: "microcement-ao", height: "microcement-height" }),
    physicalSizeMm: [1800, 1800],
    direction: "isotropic",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.13,
    roughness: 0.78,
    metalness: 0.01,
    heightScaleMm: 0.35,
    quality: largeSurfaceQuality,
    source: projectSource("暖灰微水泥程序纹理", "长尺度批刀云纹、细骨料和非周期散点；项目内生成。"),
    fallback: { color: "#cbc3b8", roughness: 0.78, metalness: 0.01 }
  },
  warmOak: {
    label: "自然浅橡木",
    family: "wood",
    roles: ["joineryMain", "wallFeature"],
    baseColor: "#b99570",
    accentColor: "#d7c0a3",
    channels: channels({ baseColor: "light-oak-color", normal: "light-oak-normal", roughness: "light-oak-roughness", ao: "light-oak-ao", height: "light-oak-height" }),
    physicalSizeMm: [600, 2400],
    direction: "longAxis",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: true },
    normalStrength: 0.10,
    roughness: 0.70,
    metalness: 0.01,
    heightScaleMm: 0.28,
    clearcoat: 0.04,
    clearcoatRoughness: 0.72,
    quality: standardQuality,
    source: projectSource("自然浅橡木程序纹理", "按600×2400mm饰面板建立竖纹、导管和跨板色差；项目内生成。"),
    fallback: { color: "#b99570", roughness: 0.70, metalness: 0.01 }
  },
  lightOak: {
    label: "浅橡木家具饰面",
    family: "wood",
    roles: ["joineryMain", "wallFeature"],
    baseColor: "#c9ad88",
    accentColor: "#a88761",
    channels: channels({ baseColor: "light-furniture-oak-color", normal: "light-furniture-oak-normal", roughness: "light-furniture-oak-roughness", ao: "light-furniture-oak-ao" }),
    physicalSizeMm: [600, 2400],
    direction: "longAxis",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: true },
    normalStrength: 0.10,
    roughness: 0.62,
    metalness: 0.01,
    clearcoat: 0.04,
    clearcoatRoughness: 0.72,
    quality: standardQuality,
    source: projectSource("浅橡木家具饰面程序纹理", "用于餐桌、床架和轻量家具；比地板更细腻、低对比，避免家具木纹抢过大面硬装。"),
    fallback: { color: "#c9ad88", roughness: 0.62, metalness: 0.01 }
  },
  darkWalnut: {
    label: "低饱和深胡桃木",
    family: "wood",
    roles: ["joineryMain", "wallFeature"],
    baseColor: "#6d5140",
    accentColor: "#94705a",
    channels: channels({ baseColor: "dark-walnut-color", normal: "dark-walnut-normal", roughness: "dark-walnut-roughness", ao: "dark-walnut-ao" }),
    physicalSizeMm: [500, 2400],
    direction: "longAxis",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: true },
    normalStrength: 0.11,
    roughness: 0.48,
    metalness: 0.01,
    clearcoat: 0.06,
    clearcoatRoughness: 0.58,
    quality: standardQuality,
    source: projectSource("低饱和深胡桃木程序纹理", "用于B2深色木作和局部家具；控制红色与高光，避免偏红偏亮。"),
    fallback: { color: "#6d5140", roughness: 0.48, metalness: 0.01 }
  },
  oakFloor: {
    label: "自然浅橡木宽板地板",
    family: "woodFloor",
    roles: ["floorMain"],
    baseColor: "#b7926b",
    accentColor: "#806044",
    channels: channels({ baseColor: "oak-floor-color", normal: "oak-floor-normal", roughness: "oak-floor-roughness", ao: "oak-floor-ao", height: "oak-floor-height" }),
    physicalSizeMm: [1200, 2400],
    direction: "plankLayout",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: true },
    normalStrength: 0.16,
    roughness: 0.72,
    metalness: 0.01,
    heightScaleMm: 0.45,
    clearcoat: 0.08,
    clearcoatRoughness: 0.68,
    pattern: { kind: "plank", moduleWidthMm: 190, moduleLengthMm: 1800, seamWidthMm: 2, stagger: 0.34 },
    quality: largeSurfaceQuality,
    source: projectSource("浅橡木宽板地板程序纹理", "按190×1800mm板材、2mm拼缝和34%错缝生成，保留板间色差。"),
    fallback: { color: "#b7926b", roughness: 0.72, metalness: 0.01 }
  },
  travertine: {
    label: "米色洞石",
    family: "stone",
    roles: ["wallFeature", "countertop"],
    baseColor: "#ded2bd",
    accentColor: "#bcae98",
    channels: channels({ baseColor: "travertine-color", normal: "travertine-normal", roughness: "travertine-roughness", ao: "travertine-ao", height: "travertine-height" }),
    physicalSizeMm: [1600, 3200],
    direction: "alongU",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.14,
    roughness: 0.46,
    metalness: 0.02,
    heightScaleMm: 0.55,
    clearcoat: 0.05,
    clearcoatRoughness: 0.62,
    pattern: { kind: "slab", moduleWidthMm: 1600, moduleLengthMm: 3200, seamWidthMm: 2 },
    quality: largeSurfaceQuality,
    source: projectSource("米色洞石程序纹理", "按整板尺度生成水平孔洞带与弱色层；不模拟或复制具体商品纹理。"),
    fallback: { color: "#ded2bd", roughness: 0.46, metalness: 0.02 }
  },
  warmGreyStone: {
    label: "暖灰石材",
    family: "stone",
    roles: ["wallFeature", "countertop", "floorMain", "floorWet"],
    baseColor: "#d8d1c6",
    accentColor: "#aaa196",
    channels: channels({ baseColor: "warm-grey-stone-color", normal: "warm-grey-stone-normal", roughness: "warm-grey-stone-roughness", ao: "warm-grey-stone-ao", height: "warm-grey-stone-height" }),
    physicalSizeMm: [1600, 3200],
    direction: "alongU",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.12,
    roughness: 0.38,
    metalness: 0.03,
    heightScaleMm: 0.3,
    clearcoat: 0.08,
    clearcoatRoughness: 0.52,
    pattern: { kind: "slab", moduleWidthMm: 1600, moduleLengthMm: 3200, seamWidthMm: 2 },
    quality: largeSurfaceQuality,
    source: projectSource("暖灰石材程序纹理", "整板尺度低对比云纹和稀疏矿物脉络；项目内生成。"),
    fallback: { color: "#d8d1c6", roughness: 0.38, metalness: 0.03 }
  },
  beigeFabric: {
    label: "米灰布艺",
    family: "fabric",
    roles: ["fabricMain"],
    baseColor: "#d8cabc",
    accentColor: "#b7a89a",
    channels: channels({ baseColor: "greige-fabric-color", normal: "greige-fabric-normal", roughness: "greige-fabric-roughness", ao: "greige-fabric-ao", height: "greige-fabric-height" }),
    physicalSizeMm: [500, 500],
    direction: "alongV",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.14,
    roughness: 0.94,
    metalness: 0,
    heightScaleMm: 0.32,
    quality: standardQuality,
    source: projectSource("米灰布艺程序纹理", "经纬交织、纱线明暗和低频色差；项目内生成。"),
    fallback: { color: "#d8cabc", roughness: 0.94, metalness: 0 }
  },
  creamBoucle: {
    label: "奶油圈绒布艺",
    family: "fabric",
    roles: ["fabricMain"],
    baseColor: "#e7dfd3",
    accentColor: "#bfb4a5",
    channels: channels({ baseColor: "cream-boucle-color", normal: "cream-boucle-normal", roughness: "cream-boucle-roughness", ao: "cream-boucle-ao" }),
    physicalSizeMm: [500, 500],
    direction: "isotropic",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.11,
    roughness: 0.98,
    metalness: 0,
    quality: standardQuality,
    source: projectSource("奶油圈绒布艺程序纹理", "用于主沙发、软包床和主要休闲座椅；保持细微颗粒，不生成虚假的高起伏。"),
    fallback: { color: "#e7dfd3", roughness: 0.98, metalness: 0 }
  },
  greigeLinen: {
    label: "米灰亚麻布艺",
    family: "fabric",
    roles: ["fabricMain"],
    baseColor: "#cfc4b7",
    accentColor: "#a99b8c",
    channels: channels({ baseColor: "greige-linen-color", normal: "greige-linen-normal", roughness: "greige-linen-roughness", ao: "greige-linen-ao" }),
    physicalSizeMm: [600, 600],
    direction: "alongV",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.08,
    roughness: 0.93,
    metalness: 0,
    quality: standardQuality,
    source: projectSource("米灰亚麻布艺程序纹理", "用于餐椅、床品和休闲座椅；以低对比经纬纹理拉开与墙面的差异。"),
    fallback: { color: "#cfc4b7", roughness: 0.93, metalness: 0 }
  },
  cognacLeather: {
    label: "低饱和棕色头层皮革",
    family: "leather",
    roles: ["fabricMain"],
    baseColor: "#7b4428",
    accentColor: "#a96d45",
    channels: channels({ baseColor: "cognac-leather-color", normal: "cognac-leather-normal", roughness: "cognac-leather-roughness", ao: "cognac-leather-ao" }),
    physicalSizeMm: [1000, 1000],
    direction: "isotropic",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.07,
    roughness: 0.46,
    metalness: 0.01,
    clearcoat: 0.08,
    clearcoatRoughness: 0.42,
    quality: standardQuality,
    source: projectSource("低饱和棕色头层皮革程序纹理", "用于B2皮革沙发；控制高光和红色，保留皮面细微颗粒与包边差异。"),
    fallback: { color: "#7b4428", roughness: 0.46, metalness: 0.01 }
  },
  darkBrownLeather: {
    label: "深棕真皮",
    family: "leather",
    roles: ["fabricMain"],
    baseColor: "#4f2d20",
    accentColor: "#744a38",
    channels: channels({ baseColor: "dark-brown-leather-color", normal: "dark-brown-leather-normal", roughness: "dark-brown-leather-roughness", ao: "dark-brown-leather-ao" }),
    physicalSizeMm: [1000, 1000],
    direction: "isotropic",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.06,
    roughness: 0.50,
    metalness: 0.01,
    clearcoat: 0.06,
    clearcoatRoughness: 0.48,
    quality: standardQuality,
    source: projectSource("深棕真皮程序纹理", "用于皮革滚边和深色软包；降低反光，避免与黑钛金属混成一体。"),
    fallback: { color: "#4f2d20", roughness: 0.50, metalness: 0.01 }
  },
  blackTopGrainLeather: {
    label: "黑色头层牛皮",
    family: "leather",
    roles: ["fabricMain"],
    baseColor: "#242321",
    accentColor: "#494541",
    channels: channels({ baseColor: "black-top-grain-leather-color", normal: "black-top-grain-leather-normal", roughness: "black-top-grain-leather-roughness", ao: "black-top-grain-leather-ao" }),
    physicalSizeMm: [1000, 1000],
    direction: "isotropic",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.055,
    roughness: 0.48,
    metalness: 0.01,
    clearcoat: 0.05,
    clearcoatRoughness: 0.46,
    quality: standardQuality,
    source: projectSource("黑色头层牛皮程序纹理", "全屋共享的深色头层皮革身份；保留细微粒面与包边高光，不使用纯黑以免和黑钛金属混为一体。"),
    fallback: { color: "#242321", roughness: 0.48, metalness: 0.01 }
  },
  blackTitanium: {
    label: "深色拉丝金属",
    family: "metal",
    roles: ["trimMetal"],
    baseColor: "#343331",
    accentColor: "#716b63",
    channels: channels({ baseColor: "dark-brushed-metal-color", normal: "dark-brushed-metal-normal", roughness: "dark-brushed-metal-roughness", metalness: "dark-brushed-metal-metalness" }),
    physicalSizeMm: [1000, 1000],
    direction: "longAxis",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: true },
    normalStrength: 0.08,
    roughness: 0.3,
    metalness: 0.72,
    clearcoat: 0.12,
    clearcoatRoughness: 0.32,
    quality: standardQuality,
    source: projectSource("深色拉丝金属程序纹理", "细密单向拉丝与轻微粗糙度变化；项目内生成。"),
    fallback: { color: "#343331", roughness: 0.3, metalness: 0.72 }
  },
  brushedBronze: {
    label: "拉丝古铜",
    family: "metal",
    roles: ["trimMetal"],
    baseColor: "#7d6046",
    accentColor: "#ad8965",
    channels: channels({ baseColor: "brushed-bronze-color", normal: "brushed-bronze-normal", roughness: "brushed-bronze-roughness", metalness: "brushed-bronze-metalness" }),
    physicalSizeMm: [1000, 1000],
    direction: "longAxis",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: true },
    normalStrength: 0.06,
    roughness: 0.27,
    metalness: 0.70,
    clearcoat: 0.08,
    clearcoatRoughness: 0.35,
    quality: standardQuality,
    source: projectSource("拉丝古铜程序纹理", "用于餐桌五金、柜体细框和局部灯具；保持低饱和金属高光。"),
    fallback: { color: "#7d6046", roughness: 0.27, metalness: 0.70 }
  },
  agedBrass: {
    label: "低饱和做旧黄铜",
    family: "metal",
    roles: ["trimMetal"],
    baseColor: "#8a6844",
    accentColor: "#b39265",
    channels: channels({ baseColor: "aged-brass-color", normal: "aged-brass-normal", roughness: "aged-brass-roughness", metalness: "aged-brass-metalness" }),
    physicalSizeMm: [1000, 1000],
    direction: "longAxis",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: true },
    normalStrength: 0.05,
    roughness: 0.42,
    metalness: 0.58,
    clearcoat: 0.04,
    clearcoatRoughness: 0.48,
    quality: standardQuality,
    source: projectSource("低饱和做旧黄铜程序纹理", "用于床头柜和少量灯具五金；控制黄色饱和度，避免全屋偏金。"),
    fallback: { color: "#8a6844", roughness: 0.42, metalness: 0.58 }
  },
  oatTaupeLacquer: {
    label: "浅燕麦灰褐哑光漆",
    family: "paint",
    roles: ["joineryMain", "wallFeature"],
    baseColor: "#b6a68f",
    accentColor: "#d0c2ae",
    channels: channels({ baseColor: "oat-taupe-lacquer-color", normal: "oat-taupe-lacquer-normal", roughness: "oat-taupe-lacquer-roughness", ao: "oat-taupe-lacquer-ao" }),
    physicalSizeMm: [1200, 2400],
    direction: "isotropic",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.03,
    roughness: 0.74,
    metalness: 0.01,
    clearcoat: 0.08,
    clearcoatRoughness: 0.64,
    quality: standardQuality,
    source: projectSource("浅燕麦灰褐哑光漆程序纹理", "用于柜门和局部木作；以低反射哑光区分暖白柜门与木饰面。"),
    fallback: { color: "#b6a68f", roughness: 0.74, metalness: 0.01 }
  },
  clearGlass: {
    label: "低铁玻璃",
    family: "glass",
    roles: ["glassMain"],
    baseColor: "#eef3f0",
    accentColor: "#ffffff",
    channels: channels({ baseColor: "low-iron-glass-tint", roughness: "low-iron-glass-roughness", transmission: "low-iron-glass-transmission" }),
    physicalSizeMm: [1000, 1000],
    direction: "isotropic",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0,
    roughness: 0.075,
    metalness: 0.01,
    transmission: 0.95,
    thicknessMm: 8,
    ior: 1.5,
    opacity: 0.92,
    quality: standardQuality,
    source: projectSource("低铁玻璃程序材质", "无外部贴图；使用项目定义的透射、IOR、厚度和轻微表面粗糙度。"),
    fallback: { color: "#eef3f0", roughness: 0.075, metalness: 0.01, opacity: 0.22 }
  },
  smokedGlass: {
    label: "浅茶玻璃",
    family: "glass",
    roles: ["glassMain"],
    baseColor: "#756f68",
    accentColor: "#aaa29a",
    channels: channels({ baseColor: "light-tea-glass-tint", roughness: "light-tea-glass-roughness", transmission: "light-tea-glass-transmission" }),
    physicalSizeMm: [1000, 1000],
    direction: "isotropic",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0,
    roughness: 0.08,
    metalness: 0.02,
    transmission: 0.72,
    thicknessMm: 8,
    ior: 1.5,
    opacity: 0.88,
    quality: standardQuality,
    source: projectSource("浅茶玻璃程序材质", "无外部贴图；通过透射与暖灰茶色吸收建立透明构件身份。"),
    fallback: { color: "#756f68", roughness: 0.1, metalness: 0.02, opacity: 0.34 }
  },
  warmWhiteCeramic: {
    label: "暖白陶瓷",
    family: "ceramic",
    roles: ["countertop"],
    baseColor: "#fbf8f1",
    accentColor: "#ddd7ce",
    channels: channels({ baseColor: "warm-white-ceramic-color", normal: "warm-white-ceramic-normal", roughness: "warm-white-ceramic-roughness", ao: "warm-white-ceramic-ao" }),
    physicalSizeMm: [1000, 1000],
    direction: "isotropic",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.04,
    roughness: 0.24,
    metalness: 0,
    clearcoat: 0.22,
    clearcoatRoughness: 0.22,
    quality: standardQuality,
    source: projectSource("暖白陶瓷程序材质", "低对比釉面微扰；项目内生成。"),
    fallback: { color: "#fbf8f1", roughness: 0.24, metalness: 0 }
  },
  wetAreaTile: {
    label: "米灰防滑湿区砖",
    family: "tile",
    roles: ["floorWet", "wallFeature"],
    baseColor: "#cdbd9f",
    accentColor: "#b39f82",
    channels: channels({ baseColor: "wet-tile-color", normal: "wet-tile-normal", roughness: "wet-tile-roughness", ao: "wet-tile-ao", height: "wet-tile-height" }),
    physicalSizeMm: [1200, 1200],
    direction: "alongU",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.16,
    roughness: 0.82,
    metalness: 0.01,
    heightScaleMm: 0.38,
    pattern: { kind: "tile", moduleWidthMm: 300, moduleLengthMm: 600, seamWidthMm: 2 },
    quality: largeSurfaceQuality,
    source: projectSource("米灰防滑湿区砖程序纹理", "按300×600mm模块和2mm填缝生成，粗糙度满足湿区视觉表达。"),
    fallback: { color: "#cdbd9f", roughness: 0.82, metalness: 0.01 }
  },
  courtyardStone: {
    label: "庭院暖灰石材",
    family: "stone",
    roles: ["floorMain", "floorWet"],
    baseColor: "#a49b8e",
    accentColor: "#71685d",
    channels: channels({ baseColor: "courtyard-stone-color", normal: "courtyard-stone-normal", roughness: "courtyard-stone-roughness", ao: "courtyard-stone-ao", height: "courtyard-stone-height" }),
    physicalSizeMm: [1200, 1200],
    direction: "alongU",
    uv: { scale: [1, 1], rotationDeg: 0, allowQuarterTurns: true, alignToComponentLongAxis: false },
    normalStrength: 0.2,
    roughness: 0.88,
    metalness: 0.01,
    heightScaleMm: 0.75,
    pattern: { kind: "tile", moduleWidthMm: 600, moduleLengthMm: 1200, seamWidthMm: 6 },
    quality: largeSurfaceQuality,
    source: projectSource("庭院暖灰石材程序纹理", "按600×1200mm耐候板和6mm室外缝生成，增加非周期矿物斑驳。"),
    fallback: { color: "#a49b8e", roughness: 0.88, metalness: 0.01 }
  }
} as const satisfies Record<string, PbrMaterialDefinition>;

export type PbrMaterialToken = keyof typeof pbrMaterialCatalog;

export const modernNaturalRoleTokens = {
  wallBase: "warmWhiteMineral",
  wallFeature: "travertine",
  floorMain: "oakFloor",
  floorWet: "wetAreaTile",
  ceilingBase: "warmWhiteMineral",
  joineryMain: "warmOak",
  countertop: "warmGreyStone",
  trimMetal: "blackTitanium",
  glassMain: "clearGlass",
  fabricMain: "beigeFabric"
} as const satisfies Record<MaterialRole, PbrMaterialToken>;

export const materialRoleLabels: Record<MaterialRole, string> = {
  wallBase: "基础墙面",
  wallFeature: "重点墙面",
  floorMain: "主要地面",
  floorWet: "湿区地面",
  ceilingBase: "基础顶面",
  joineryMain: "主要木作",
  countertop: "台面",
  trimMetal: "金属收边",
  glassMain: "透明构件",
  fabricMain: "主要布艺"
};

export const modernNaturalRoomRules = {
  livingDining: { base: ["wallBase", "floorMain", "ceilingBase"], accents: ["wallFeature", "joineryMain", "fabricMain", "trimMetal", "glassMain"] },
  kitchen: { base: ["wallBase", "ceilingBase", "joineryMain"], accents: ["countertop", "trimMetal", "glassMain", "floorWet"] },
  bedroom: { base: ["wallBase", "floorMain", "ceilingBase"], accents: ["joineryMain", "fabricMain", "trimMetal"] },
  bathroom: { base: ["floorWet", "wallBase", "ceilingBase"], accents: ["wallFeature", "countertop", "trimMetal", "glassMain"] },
  basement: { base: ["wallBase", "ceilingBase", "floorMain"], accents: ["joineryMain", "fabricMain", "trimMetal"] },
  courtyard: { base: ["floorMain"], accents: ["trimMetal", "glassMain", "joineryMain"] }
} as const;

export const materialJunctionLanguage = {
  panelJoint: { label: "拼缝", widthMm: 2, depthMm: 1.5, token: "blackTitanium" },
  shadowGap: { label: "阴影缝", widthMm: 8, depthMm: 10, token: "blackTitanium" },
  scribePanel: { label: "收口板", widthMm: 30, depthMm: 20, token: "warmOak" },
  baseboard: { label: "同墙色极窄踢脚线", widthMm: 12, heightMm: 60, token: "warmWhiteMineral" },
  floorThreshold: { label: "地面压条", widthMm: 18, heightMm: 3, token: "blackTitanium" },
  countertopOverhang: { label: "台面出挑", depthMm: 25, thicknessMm: 20, token: "warmGreyStone" },
  glassMetalFrame: { label: "玻璃金属框", widthMm: 25, depthMm: 40, token: "blackTitanium", glassToken: "clearGlass" },
  materialZoning: { label: "材质分区", seamWidthMm: 6, token: "blackTitanium" }
} as const;

export const legacyMaterialTokenAliases: Readonly<Record<string, PbrMaterialToken>> = {
  warmWhiteMineral: "warmWhiteMineral",
  wallPaint: "warmWhiteMineral",
  limewash: "warmWhiteMineral",
  limePlaster: "warmWhiteMineral",
  waterproofMineralPlaster: "warmWhiteMineral",
  microCement: "microCement",
  microcement: "microCement",
  warmOak: "warmOak",
  lightOak: "lightOak",
  darkWalnut: "darkWalnut",
  smokedWalnut: "darkWalnut",
  showroomWarmOak: "warmOak",
  showroomWarmOakVertical: "warmOak",
  showroomBurlAmber: "warmOak",
  woodVeneer: "warmOak",
  woodVeneerPanel: "warmOak",
  warmOakVertical: "warmOak",
  oakFloor: "oakFloor",
  showroomPaleHerringbone: "warmGreyStone",
  woodFloor: "oakFloor",
  travertine: "travertine",
  showroomVeinedStone: "warmGreyStone",
  showroomWarmVeinedStone: "warmGreyStone",
  showroomOatTaupe: "beigeFabric",
  showroomOatTaupeLacquer: "warmWhiteMineral",
  showroomWovenHeadboard: "beigeFabric",
  showroomBotanicalTextile2F: "beigeFabric",
  showroomGraphicWallcovering2F: "beigeFabric",
  showroomRustStripeUpholstery2F: "beigeFabric",
  showroomBoucleCream2F: "beigeFabric",
  showroomLimePlaster: "warmWhiteMineral",
  warmGreyStone: "warmGreyStone",
  stone: "warmGreyStone",
  beigeFabric: "beigeFabric",
  creamBoucle: "creamBoucle",
  greigeLinen: "greigeLinen",
  creamFabric: "beigeFabric",
  taupeFabric: "beigeFabric",
  cognacLeather: "cognacLeather",
  darkBrownLeather: "darkBrownLeather",
  blackTopGrainLeather: "blackTopGrainLeather",
  blackLeather: "blackTopGrainLeather",
  wovenWallcovering: "beigeFabric",
  textileWallcovering: "beigeFabric",
  upholsteredPanel: "beigeFabric",
  blackTitanium: "blackTitanium",
  darkBronze: "blackTitanium",
  showroomDarkBronze: "blackTitanium",
  brushedBronze: "blackTitanium",
  champagneBronze: "brushedBronze",
  warmTaupeLeather: "brushedBronze",
  agedBrass: "blackTitanium",
  oatTaupeLacquer: "oatTaupeLacquer",
  smokedOatTaupe: "oatTaupeLacquer",
  clearGlass: "clearGlass",
  graySmokedGlass: "smokedGlass",
  smokedGlass: "smokedGlass",
  warmWhiteCeramic: "warmWhiteCeramic",
  wetAreaTile: "wetAreaTile",
  tile: "wetAreaTile",
  courtyardStone: "courtyardStone",
  hardscape: "courtyardStone",
  slate: "courtyardStone"
};

export function isPbrMaterialToken(value: string | null | undefined): value is PbrMaterialToken {
  return Boolean(value && value in pbrMaterialCatalog);
}

export function resolvePbrMaterialToken(value: string | null | undefined, fallbackRole?: MaterialRole): PbrMaterialToken {
  if (value && isPbrMaterialToken(value)) return value;
  if (value && legacyMaterialTokenAliases[value]) return legacyMaterialTokenAliases[value];
  const normalized = (value ?? "").toLowerCase();
  if (/wet|bath|shower|tile|湿|卫浴|防滑|瓷砖/.test(normalized)) return "wetAreaTile";
  if (/courtyard|outdoor|paving|hardscape|庭院|户外|室外/.test(normalized)) return "courtyardStone";
  if (/floor.*wood|wood.*floor|木地板/.test(normalized)) return "oakFloor";
  if (/oak|veneer|wood|橡木|木饰面|木作/.test(normalized)) return "warmOak";
  if (/travertine|洞石/.test(normalized)) return "travertine";
  if (/stone|slab|石材|岩板/.test(normalized)) return "warmGreyStone";
  if (/fabric|textile|upholster|布|织物|软包|绒/.test(normalized)) return "beigeFabric";
  if (/black.*leather|leather.*black|黑.*皮革|黑.*牛皮/.test(normalized)) return "blackTopGrainLeather";
  if (/metal|bronze|titanium|金属|古铜|黑钛/.test(normalized)) return "blackTitanium";
  if (/smoked|tea.*glass|茶.*玻璃|烟.*玻璃/.test(normalized)) return "smokedGlass";
  if (/glass|玻璃/.test(normalized)) return "clearGlass";
  if (/ceramic|陶瓷/.test(normalized)) return "warmWhiteCeramic";
  if (/microcement|微水泥/.test(normalized)) return "microCement";
  return modernNaturalRoleTokens[fallbackRole ?? "wallBase"];
}

export function getPbrMaterialDefinition(token: string | null | undefined, fallbackRole?: MaterialRole): { token: PbrMaterialToken; definition: PbrMaterialDefinition } {
  const resolvedToken = resolvePbrMaterialToken(token, fallbackRole);
  return { token: resolvedToken, definition: pbrMaterialCatalog[resolvedToken] as PbrMaterialDefinition };
}

export function getMaterialResolution(token: PbrMaterialToken, tier: MaterialQualityTier, device: MaterialDeviceClass) {
  return pbrMaterialCatalog[token].quality[tier][device];
}

export function resolveMaterialUvTransform(
  token: PbrMaterialToken,
  surfaceSizeM: readonly [number, number] | undefined,
  rotationDeg = 0,
  uvScale: readonly [number, number] = [1, 1]
) {
  const material = pbrMaterialCatalog[token];
  const widthM = Math.max(0.01, (surfaceSizeM?.[0] ?? material.physicalSizeMm[0] / 1000));
  const heightM = Math.max(0.01, (surfaceSizeM?.[1] ?? material.physicalSizeMm[1] / 1000));
  const alignQuarterTurn = material.uv.alignToComponentLongAxis && widthM > heightM;
  const physicalWidthM = material.physicalSizeMm[alignQuarterTurn ? 1 : 0] / 1000;
  const physicalHeightM = material.physicalSizeMm[alignQuarterTurn ? 0 : 1] / 1000;
  const repeatX = widthM / physicalWidthM * material.uv.scale[0] * Math.max(0.01, uvScale[0]);
  const repeatY = heightM / physicalHeightM * material.uv.scale[1] * Math.max(0.01, uvScale[1]);
  return {
    repeat: [Math.max(0.05, repeatX), Math.max(0.05, repeatY)] as [number, number],
    rotation: (material.uv.rotationDeg + rotationDeg + (alignQuarterTurn ? 90 : 0)) * Math.PI / 180
  };
}

const materialIndexByToken = new Map<PbrMaterialToken, MaterialRole[]>();
(Object.entries(modernNaturalRoleTokens) as Array<[MaterialRole, PbrMaterialToken]>).forEach(([role, token]) => {
  materialIndexByToken.set(token, [...(materialIndexByToken.get(token) ?? []), role]);
});

export const materialIndexRows = Array.from(materialIndexByToken.entries()).map(([token, roles], index) => ({
  code: `MAT-${String(index + 1).padStart(2, "0")}`,
  roles,
  token,
  label: pbrMaterialCatalog[token].label,
  physicalSize: `${pbrMaterialCatalog[token].physicalSizeMm[0]}×${pbrMaterialCatalog[token].physicalSizeMm[1]}mm`,
  swatch: pbrMaterialCatalog[token].baseColor
}));
