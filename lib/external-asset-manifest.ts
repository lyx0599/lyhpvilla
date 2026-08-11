export type ExternalAssetManifestEntry = {
  id: string;
  kind: "model" | "pbr";
  name: string;
  author: string;
  sourceUrl: string;
  downloadDate: string;
  license: "CC0";
  attribution: string;
  originalFormat: string;
  projectUsage: string;
  assetPath: string;
  previewPath?: string;
  dimensionsMm?: readonly [number, number, number];
  physicalSizeMm?: readonly [number, number];
  triangles?: number;
  textureResolution?: string;
  channels?: readonly string[];
  fileSizeBytes?: number;
  ordinaryVariant?: string;
  presentationVariant?: string;
  fallbackFurnitureId?: string;
  notes?: string;
};

export const externalAssetManifest = {
  polyhavenSideTable01: {
    id: "polyhavenSideTable01",
    kind: "model",
    name: "Side Table 01 / 浅木三层边几",
    author: "James Ray Cock",
    sourceUrl: "https://polyhaven.com/a/side_table_01",
    downloadDate: "2026-08-06",
    license: "CC0",
    attribution: "无需署名；项目资产清单保留来源记录。",
    originalFormat: "glTF 2.0 + BIN + JPG PBR maps",
    projectUsage: "1F 卧室与 2F 主卧 / 四个床头柜",
    assetPath: "/assets/external/polyhaven/models/side_table_01/2k/side_table_01.gltf",
    previewPath: "/assets/external/polyhaven/models/side_table_01/2k/textures/side_table_01_diff_2k.jpg",
    dimensionsMm: [550, 450, 551],
    triangles: 2756,
    textureResolution: "2K",
    channels: ["Base Color", "Normal GL", "Metalness/Roughness/AO packed"],
    fileSizeBytes: 1554684,
    ordinaryVariant: "2K glTF，轻量三角面数，适合普通模式和移动端审查。",
    presentationVariant: "同一 2K glTF；展示模式保留完整 PBR，未额外提高贴图以控制内存。",
    fallbackFurnitureId: "furn-1f-bedroom-nightstand-north-001, furn-1f-bedroom-nightstand-south-001, furn-2f-master-nightstand-north-001, furn-2f-master-nightstand-south-001",
    notes: "模型轴向、中心点和包围盒缩放在运行时校正到各床头柜原占地与高度；任一加载失败只回退对应的程序化 floating 床头柜。"
  },
  polyhavenWarmBeigeTile08: {
    id: "polyhavenWarmBeigeTile08",
    kind: "pbr",
    name: "Floor Tiles 08 / 暖米色防滑瓷砖",
    author: "Rob Tuytel",
    sourceUrl: "https://polyhaven.com/a/floor_tiles_08",
    downloadDate: "2026-08-06",
    license: "CC0",
    attribution: "无需署名；项目资产清单保留来源记录。",
    originalFormat: "JPG PBR maps",
    projectUsage: "B1、1F、2F / 卫生间与洗衣湿区；保留原地面几何、砖缝和排版方向",
    assetPath: "/assets/external/polyhaven/materials/floor_tiles_08/2k/",
    physicalSizeMm: [1500, 1500],
    textureResolution: "2K desktop / 512 mobile target",
    channels: ["Base Color", "Normal GL", "Roughness", "AO"],
    notes: "原始 Height 未接入；真实尺度 1500×1500mm，保持现有房间几何和排版方向。"
  },
  polyhavenModernCoffeeTable01: {
    id: "polyhavenModernCoffeeTable01",
    kind: "model",
    name: "Modern Coffee Table 01 / 暖木石材现代茶几",
    author: "Amin",
    sourceUrl: "https://polyhaven.com/a/modern_coffee_table_01",
    downloadDate: "2026-08-06",
    license: "CC0",
    attribution: "无需署名；项目资产清单保留来源记录。",
    originalFormat: "glTF 2.0 + BIN + JPG PBR maps",
    projectUsage: "B2 / 客厅 / furn-b2-living-coffee-table-001",
    assetPath: "/assets/external/polyhaven/models/modern_coffee_table_01/2k/modern_coffee_table_01.gltf",
    previewPath: "/assets/external/polyhaven/models/modern_coffee_table_01/2k/textures/modern_coffee_table_01_diff_2k.jpg",
    dimensionsMm: [1200, 700, 380],
    triangles: 4504,
    textureResolution: "2K",
    channels: ["Base Color", "Normal GL", "Roughness"],
    fileSizeBytes: 4701241,
    ordinaryVariant: "2K glTF，4504 三角面，按项目茶几包络缩放，适合普通模式和移动端。",
    presentationVariant: "同一 2K glTF；展示模式保留完整法线与粗糙度，不增加额外贴图。",
    fallbackFurnitureId: "furn-b2-living-coffee-table-001",
    notes: "官方页面公布模型宽度约 1.2m；项目运行时按现有对象 1200×700×380mm 包络校正，保留原位置、朝向和占地。加载失败回退原透明玻璃茶几。"
  },
  polyhavenOutdoorTableChairSet01: {
    id: "polyhavenOutdoorTableChairSet01",
    kind: "model",
    name: "Outdoor Table Chair Set 01 / 木条户外桌椅组",
    author: "James Ray Cock",
    sourceUrl: "https://polyhaven.com/a/outdoor_table_chair_set_01",
    downloadDate: "2026-08-06",
    license: "CC0",
    attribution: "无需署名；项目资产清单保留来源记录。",
    originalFormat: "glTF 2.0 + BIN + JPG PBR maps",
    projectUsage: "YARD / 南院生活庭院 / OUT-S-RELAX",
    assetPath: "/assets/external/polyhaven/models/outdoor_table_chair_set_01/2k/outdoor_table_chair_set_01.gltf",
    previewPath: "/assets/external/polyhaven/models/outdoor_table_chair_set_01/2k/textures/outdoor_table_chair_set_01_table_diff_2k.jpg",
    dimensionsMm: [2400, 1500, 780],
    triangles: 9828,
    textureResolution: "2K",
    channels: ["Base Color", "Normal GL", "Metalness/Roughness packed"],
    fileSizeBytes: 3201451,
    ordinaryVariant: "2K glTF，9828 三角面，单桌双椅组合，适合普通模式。",
    presentationVariant: "同一 2K glTF；展示模式保留桌面和椅面独立 PBR，移动端仍复用普通版。",
    fallbackFurnitureId: "OUT-S-RELAX",
    notes: "官方页面公布模型宽度约 1.8m；项目运行时按南院现有 2400×1500×780mm 家具包络校正，不改变庭院对象位置与朝向。加载失败回退原户外桌椅程序化组。"
  },
  polyhavenCoffeeTableRound01: {
    id: "polyhavenCoffeeTableRound01",
    kind: "model",
    name: "Coffee Table Round 01 / 暖白石材圆边几",
    author: "Ulan Cabanilla",
    sourceUrl: "https://polyhaven.com/a/coffee_table_round_01",
    downloadDate: "2026-08-06",
    license: "CC0",
    attribution: "无需署名；项目资产清单保留来源记录。",
    originalFormat: "glTF 2.0 + BIN + JPG PBR maps",
    projectUsage: "1F / 客厅 / furn-1f-living-side-table-001",
    assetPath: "/assets/external/polyhaven/models/coffee_table_round_01/2k/coffee_table_round_01.gltf",
    previewPath: "/assets/external/polyhaven/models/coffee_table_round_01/2k/textures/coffee_table_round_01_diff_2k.jpg",
    dimensionsMm: [1301, 1301, 491],
    triangles: 4044,
    textureResolution: "2K",
    channels: ["Base Color", "Normal GL", "Metalness/Roughness/AO packed"],
    fileSizeBytes: 5664153,
    ordinaryVariant: "2K glTF，4044 三角面；普通模式保留完整轮廓并复用紧凑贴图集。",
    presentationVariant: "同一 2K glTF；展示模式保留石材法线和深色金属支架反射。",
    fallbackFurnitureId: "furn-1f-living-side-table-001",
    notes: "按原 480×480×480mm 边几包络校正，不改变位置和通道；加载失败回退原 lowRound 程序化边几。"
  },
  polyhavenModernArmChair01: {
    id: "polyhavenModernArmChair01",
    kind: "model",
    name: "Modern Arm Chair 01 / 暖木深色皮革休闲椅",
    author: "Vibrant Nordic",
    sourceUrl: "https://polyhaven.com/a/modern_arm_chair_01",
    downloadDate: "2026-08-06",
    license: "CC0",
    attribution: "无需署名；项目资产清单保留来源记录。",
    originalFormat: "glTF 2.0 + BIN + JPG PBR maps",
    projectUsage: "B1 / 活动区 / furn-b1-activity-beanbag-001",
    assetPath: "/assets/external/polyhaven/models/modern_arm_chair_01/2k/modern_arm_chair_01.gltf",
    previewPath: "/assets/external/polyhaven/models/modern_arm_chair_01/2k/textures/modern_arm_chair_01_pillow_diff_2k.jpg",
    dimensionsMm: [820, 987, 1023],
    triangles: 8916,
    textureResolution: "2K",
    channels: ["Base Color", "Normal GL", "Metalness/Roughness/AO packed"],
    fileSizeBytes: 9221649,
    ordinaryVariant: "2K glTF，8916 三角面；普通模式和移动端复用同一优化网格。",
    presentationVariant: "同一 2K glTF；展示模式保留皮革与暖木框架的独立 PBR。",
    fallbackFurnitureId: "furn-b1-activity-beanbag-001",
    notes: "仅用于较深色的 B1 活动区，按原 1100×1050×750mm 占地校正；加载失败回退原 beanBag。"
  },
  polyhavenWarmBeigeWall001: {
    id: "polyhavenWarmBeigeWall001",
    kind: "pbr",
    name: "Beige Wall 001 / 低对比暖米灰矿物墙面",
    author: "Dimitrios Savva / Rico Cilliers",
    sourceUrl: "https://polyhaven.com/a/beige_wall_001",
    downloadDate: "2026-08-06",
    license: "CC0",
    attribution: "无需署名；项目资产清单保留来源记录。",
    originalFormat: "JPG PBR maps",
    projectUsage: "B1、1F、2F / limewash 与 limePlaster 主墙面；暖白可擦洗墙漆保持现状",
    assetPath: "/assets/external/polyhaven/materials/beige_wall_001/2k/",
    physicalSizeMm: [3000, 3000],
    textureResolution: "2K desktop / 512 mobile target",
    channels: ["Base Color", "Normal GL", "Roughness", "AO"],
    fileSizeBytes: 2222389,
    notes: "无缝平铺、真实尺度 3×3m；原始 Height 明确不接入，避免不可靠的墙面位移。"
  }
} as const satisfies Record<string, ExternalAssetManifestEntry>;

export type ExternalAssetId = keyof typeof externalAssetManifest;

export function resolvePublicAssetUrl(path: string) {
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}
