export type ShowroomMaterialResource = {
  id: string;
  label: string;
  family: "wood" | "burlWood" | "stone" | "lacquer" | "fabric" | "wallcovering" | "plaster" | "metal" | "glass" | "floor";
  baseColor: string;
  accentColor: string;
  roughness: number;
  metalness: number;
  physicalSizeMm: readonly [number, number];
  preferredResolution: 2048 | 4096;
  mobileResolution: 512 | 1024 | 2048;
  channels: readonly ("baseColor" | "normal" | "roughness" | "ao" | "metalness" | "height")[];
  license: "project-authored" | "CC0";
  sourceNote: string;
  sourceUrl?: string;
  author?: string;
  originalFormat?: string;
  externalMaps?: Partial<Record<"baseColor" | "normal" | "roughness" | "ao" | "height" | "metalness", string>>;
};

/**
 * Project-authored procedural PBR definitions. No third-party texture files
 * are downloaded, while each material still owns a physical size, channel set
 * and mobile downgrade target so UVs remain stable across reusable components.
 */
export const showroomMaterialResources = {
  showroomWarmOakVertical: {
    id: "showroomWarmOakVertical",
    label: "样板间浅暖橡木竖纹",
    family: "wood",
    baseColor: "#b99570",
    accentColor: "#d7c0a3",
    roughness: 0.62,
    metalness: 0.01,
    physicalSizeMm: [1200, 2400],
    preferredResolution: 4096,
    mobileResolution: 1024,
    channels: ["baseColor", "normal", "roughness", "ao"],
    license: "project-authored",
    sourceNote: "依据1F客餐厅木饰面照片提取色相、竖纹方向和板幅；不含第三方纹理。"
  },
  showroomBurlAmber: {
    id: "showroomBurlAmber",
    label: "样板间暖琥珀木瘤饰面",
    family: "burlWood",
    baseColor: "#a9602f",
    accentColor: "#e2a263",
    roughness: 0.42,
    metalness: 0.01,
    physicalSizeMm: [1200, 2400],
    preferredResolution: 4096,
    mobileResolution: 1024,
    channels: ["baseColor", "normal", "roughness", "ao"],
    license: "project-authored",
    sourceNote: "依据1F零食柜照片提取大尺度旋涡木纹与暖琥珀色；程序生成、项目自有。"
  },
  showroomOatTaupeLacquer: {
    id: "showroomOatTaupeLacquer",
    label: "样板间燕麦灰褐哑光柜门",
    family: "lacquer",
    baseColor: "#aa9984",
    accentColor: "#c4b6a4",
    roughness: 0.78,
    metalness: 0.01,
    physicalSizeMm: [1000, 1000],
    preferredResolution: 2048,
    mobileResolution: 512,
    channels: ["baseColor", "normal", "roughness", "ao"],
    license: "project-authored",
    sourceNote: "依据1F厨房柜门照片提取低反射暖灰褐表面。"
  },
  showroomWarmVeinedStone: {
    id: "showroomWarmVeinedStone",
    label: "样板间暖白灰纹石材",
    family: "stone",
    baseColor: "#e5dccd",
    accentColor: "#bcae9d",
    roughness: 0.3,
    metalness: 0.02,
    physicalSizeMm: [1600, 3200],
    preferredResolution: 4096,
    mobileResolution: 2048,
    channels: ["baseColor", "normal", "roughness", "ao", "height"],
    license: "project-authored",
    sourceNote: "依据厨房台面、挡水墙和卫生间台盆石材照片生成；纹理按整板尺度使用。"
  },
  showroomPaleHerringbone: {
    id: "showroomPaleHerringbone",
    label: "样板间浅色人字铺地材",
    family: "floor",
    baseColor: "#ddd0b7",
    accentColor: "#b9a98e",
    roughness: 0.72,
    metalness: 0.01,
    physicalSizeMm: [1200, 1200],
    preferredResolution: 4096,
    mobileResolution: 1024,
    channels: ["baseColor", "normal", "roughness", "ao", "height"],
    license: "project-authored",
    sourceNote: "依据1F整体、厨房与楼梯口照片生成；单片真实规格仍需地材选型确认。"
  },
  showroomWovenHeadboard: {
    id: "showroomWovenHeadboard",
    label: "样板间浅米织物床头面板",
    family: "fabric",
    baseColor: "#ddd5c8",
    accentColor: "#bdb2a2",
    roughness: 0.94,
    metalness: 0,
    physicalSizeMm: [600, 600],
    preferredResolution: 2048,
    mobileResolution: 1024,
    channels: ["baseColor", "normal", "roughness", "ao"],
    license: "project-authored",
    sourceNote: "依据1F卧室床头墙照片生成细织纹与低对比图案。"
  },
  showroomBotanicalTextile2F: {
    id: "showroomBotanicalTextile2F",
    label: "2F样板间低对比植物织物墙布",
    family: "wallcovering",
    baseColor: "#d8cbbb",
    accentColor: "#9f8e7a",
    roughness: 0.93,
    metalness: 0,
    physicalSizeMm: [1400, 2800],
    preferredResolution: 4096,
    mobileResolution: 1024,
    channels: ["baseColor", "normal", "roughness", "ao"],
    license: "project-authored",
    sourceNote: "依据2F主卧与卧室2床头墙照片抽象生成；仅复现植物轮廓、低对比织纹与尺度关系，不复制第三方成品图案。"
  },
  showroomGraphicWallcovering2F: {
    id: "showroomGraphicWallcovering2F",
    label: "2F样板间黑灰手绘线条墙布",
    family: "wallcovering",
    baseColor: "#d4c9ba",
    accentColor: "#4d4944",
    roughness: 0.9,
    metalness: 0,
    physicalSizeMm: [1200, 2400],
    preferredResolution: 4096,
    mobileResolution: 1024,
    channels: ["baseColor", "normal", "roughness", "ao"],
    license: "project-authored",
    sourceNote: "依据2F卧室1床头墙照片抽象生成连续回转线条；项目自有程序纹理，不复制品牌图案。"
  },
  showroomRustStripeUpholstery2F: {
    id: "showroomRustStripeUpholstery2F",
    label: "2F样板间锈橙条纹软包",
    family: "fabric",
    baseColor: "#9c664f",
    accentColor: "#d0a180",
    roughness: 0.95,
    metalness: 0,
    physicalSizeMm: [600, 600],
    preferredResolution: 2048,
    mobileResolution: 1024,
    channels: ["baseColor", "normal", "roughness", "ao"],
    license: "project-authored",
    sourceNote: "依据2F卧室2床架与靠背照片提取条纹节奏和暖锈色范围，程序生成。"
  },
  showroomBoucleCream2F: {
    id: "showroomBoucleCream2F",
    label: "2F样板间奶油色圈绒布",
    family: "fabric",
    baseColor: "#e7dfd3",
    accentColor: "#bfb4a5",
    roughness: 0.98,
    metalness: 0,
    physicalSizeMm: [500, 500],
    preferredResolution: 2048,
    mobileResolution: 512,
    channels: ["baseColor", "normal", "roughness", "ao"],
    license: "project-authored",
    sourceNote: "依据2F主卧窗前弧形坐榻照片生成低频圈绒表面；项目自有。"
  },
  showroomLimePlaster: {
    id: "showroomLimePlaster",
    label: "样板间暖燕麦石灰基墙面",
    family: "plaster",
    baseColor: "#ddd1bf",
    accentColor: "#c1b09a",
    roughness: 0.91,
    metalness: 0,
    physicalSizeMm: [1600, 1600],
    preferredResolution: 2048,
    mobileResolution: 1024,
    channels: ["baseColor", "normal", "roughness", "ao"],
    license: "project-authored",
    sourceNote: "依据1F公共区墙面生成低对比矿物肌理。"
  },
  showroomWarmGreyLimestoneFloor: {
    id: "showroomWarmGreyLimestoneFloor",
    label: "样板间暖灰石灰岩大面地坪",
    family: "floor",
    baseColor: "#b9ad99",
    accentColor: "#968977",
    roughness: 0.68,
    metalness: 0.01,
    physicalSizeMm: [1600, 3200],
    preferredResolution: 2048,
    mobileResolution: 512,
    channels: ["baseColor", "normal", "roughness", "ao"],
    license: "project-authored",
    sourceNote: "用于1F客餐厨大面暖灰石材；保留现有600×1200mm排砖几何，采用低对比云纹，不生成或接入Height。"
  },
  showroomDarkBronze: {
    id: "showroomDarkBronze",
    label: "样板间深古铜窄框",
    family: "metal",
    baseColor: "#5f5145",
    accentColor: "#9a7a56",
    roughness: 0.3,
    metalness: 0.72,
    physicalSizeMm: [1000, 1000],
    preferredResolution: 2048,
    mobileResolution: 512,
    channels: ["baseColor", "normal", "roughness", "metalness"],
    license: "project-authored",
    sourceNote: "用于移门、扶手、阴影缝和柜体细框。"
  },
  polyhavenWarmBeigeTile08: {
    id: "polyhavenWarmBeigeTile08",
    label: "Poly Haven 暖米色防滑瓷砖 08",
    family: "floor",
    baseColor: "#c9bda9",
    accentColor: "#8e7d6b",
    roughness: 0.82,
    metalness: 0,
    physicalSizeMm: [1500, 1500],
    preferredResolution: 2048,
    mobileResolution: 512,
    channels: ["baseColor", "normal", "roughness", "ao"],
    license: "CC0",
    sourceNote: "仅保留 Base Color、Normal、Roughness、AO；Height 有原始通道但按项目规则关闭，避免把凹凸伪造成结构。",
    sourceUrl: "https://polyhaven.com/a/floor_tiles_08",
    author: "Rob Tuytel",
    originalFormat: "JPG PBR maps",
    externalMaps: {
      baseColor: "/assets/external/polyhaven/materials/floor_tiles_08/2k/floor_tiles_08_diff_2k.jpg",
      normal: "/assets/external/polyhaven/materials/floor_tiles_08/2k/floor_tiles_08_nor_gl_2k.jpg",
      roughness: "/assets/external/polyhaven/materials/floor_tiles_08/2k/floor_tiles_08_rough_2k.jpg",
      ao: "/assets/external/polyhaven/materials/floor_tiles_08/2k/floor_tiles_08_ao_2k.jpg"
    }
  },
  polyhavenWarmBeigeWall001: {
    id: "polyhavenWarmBeigeWall001",
    label: "Poly Haven 低对比暖米灰矿物墙面",
    family: "plaster",
    baseColor: "#d8cbbb",
    accentColor: "#b9ab98",
    roughness: 0.9,
    metalness: 0,
    physicalSizeMm: [3000, 3000],
    preferredResolution: 2048,
    mobileResolution: 512,
    channels: ["baseColor", "normal", "roughness", "ao"],
    license: "CC0",
    sourceNote: "低对比无缝矿物墙面；仅接入可靠的 Base Color、Normal、Roughness、AO，原始 Height 保持关闭。",
    sourceUrl: "https://polyhaven.com/a/beige_wall_001",
    author: "Dimitrios Savva / Rico Cilliers",
    originalFormat: "JPG PBR maps",
    externalMaps: {
      baseColor: "/assets/external/polyhaven/materials/beige_wall_001/2k/beige_wall_001_diff_2k.jpg",
      normal: "/assets/external/polyhaven/materials/beige_wall_001/2k/beige_wall_001_nor_gl_2k.jpg",
      roughness: "/assets/external/polyhaven/materials/beige_wall_001/2k/beige_wall_001_rough_2k.jpg",
      ao: "/assets/external/polyhaven/materials/beige_wall_001/2k/beige_wall_001_ao_2k.jpg"
    }
  }
} as const satisfies Record<string, ShowroomMaterialResource>;

/**
 * Shared calibration resources for the whole-house modern warm natural
 * material identities. These are visual/PBR calibrations, not replacement
 * material tokens: every floor keeps consuming the canonical identity from
 * `material-system.ts` and may only select a compatible calibration resource.
 */
export const modernWarmNaturalShowroomCalibration = {
  warmWhiteMineral: "showroomLimePlaster",
  warmOak: "showroomWarmOakVertical",
  oatTaupeLacquer: "showroomOatTaupeLacquer",
  travertine: "showroomWarmVeinedStone",
  warmGreyStone: "showroomWarmGreyLimestoneFloor",
  blackTitanium: "showroomDarkBronze",
  wetAreaTile: "polyhavenWarmBeigeTile08"
} as const satisfies Partial<Record<
  import("./material-system").PbrMaterialToken,
  keyof typeof showroomMaterialResources
>>;

export type ShowroomMaterialResourceId = keyof typeof showroomMaterialResources;

export function getShowroomMaterialResource(id: string | null | undefined): ShowroomMaterialResource | null {
  if (!id || !(id in showroomMaterialResources)) return null;
  return showroomMaterialResources[id as ShowroomMaterialResourceId];
}
