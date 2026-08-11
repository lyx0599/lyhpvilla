import type {
  CabinetInteriorCheck,
  CabinetInteriorLayout,
  CabinetInteriorModule,
  CabinetInteriorModuleKind,
  CabinetInteriorTemplate,
  Furniture
} from "@/types/space";

const EDITABLE_CABINET_ASSETS = new Set([
  "wardrobe", "walkInCloset", "cabinet", "wallCabinet", "kitchenCabinet", "island", "sideboard",
  "entryCabinet", "snackCabinet", "tallCabinet", "bathroomVanity", "bookshelf", "outdoorCabinet"
]);

const DECORATIVE_ASSETS = new Set(["fireplace", "pegboard", "mediaWall", "upholsteredWallPanel"]);

export const cabinetInteriorModuleLabels: Record<CabinetInteriorModuleKind, string> = {
  shelf: "固定层板",
  divider: "竖板",
  drawer: "抽屉",
  hanging: "挂衣区",
  open: "开放格",
  closed: "封闭格",
  shoe: "鞋层板",
  pullout: "抽拉储物",
  appliance: "设备预留",
  plumbing: "管线避让",
  clearance: "检修/开合净空",
  waste: "垃圾分类位",
  void: "空区"
};

const PHYSICAL_MODULE_KINDS = new Set<CabinetInteriorModuleKind>([
  "shelf", "divider", "closed", "pullout", "appliance", "plumbing", "waste"
]);

function assetType(item: Furniture) {
  return item.render3d?.assetType ?? item.moduleType ?? item.type;
}

export function isEditableCabinetFurniture(item: Furniture): boolean {
  const type = String(assetType(item));
  if (DECORATIVE_ASSETS.has(type) && !/柜|收纳|储物|书架|展示/.test(item.name)) return false;
  return EDITABLE_CABINET_ASSETS.has(type) || Boolean(item.cabinetDesign) || Boolean(item.wardrobeDesign) || /衣柜|橱柜|吊柜|高柜|中岛|卫浴柜|玄关柜|鞋柜|储物柜|书柜|展示柜|餐边柜|边柜|转角柜/.test(item.name);
}

export function getCabinetInteriorTemplate(item: Furniture): CabinetInteriorTemplate {
  const type = String(assetType(item));
  const name = item.name;
  if (type === "wardrobe" || type === "walkInCloset" || /衣柜/.test(name)) return "wardrobe";
  if (type === "island" || /中岛/.test(name)) return "island";
  if (type === "bathroomVanity" || type === "vanity" || /卫浴柜|浴室柜|洗手池柜|镜柜/.test(name)) return "bathroomVanity";
  if (type === "wallCabinet" || /吊柜/.test(name)) return "kitchenWall";
  if (type === "tallCabinet" || /高柜|电器柜/.test(name)) return "kitchenTall";
  if (type === "kitchenCabinet" || /地柜|橱柜|灶台|水槽柜/.test(name)) return "kitchenBase";
  if (type === "bookshelf" || /书柜|书架/.test(name)) return "bookshelf";
  if (/展示柜|玻璃柜/.test(name) || item.render3d?.cabinetVisual?.frontStyle === "glass") return "display";
  if (/鞋柜/.test(name)) return "shoe";
  if (/玄关/.test(name)) return "entry";
  if (/转角/.test(name)) return "corner";
  return "storage";
}

function roundMm(value: number, fallback = 1) {
  return Math.max(1, Math.round(Number.isFinite(value) ? value : fallback));
}

function nonNegativeMm(value: number, fallback = 0) {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : fallback));
}

function cabinetDimensions(item: Furniture) {
  return {
    width: roundMm(item.dimensions.width * 10, 1200),
    height: roundMm(item.dimensions.height * 10, 2200),
    depth: roundMm(item.dimensions.depth * 10, 600)
  };
}

function makeInteriorModule(id: string, kind: CabinetInteriorModuleKind, label: string, values: Partial<CabinetInteriorModule>): CabinetInteriorModule {
  return {
    id,
    kind,
    label,
    x: 0,
    y: 0,
    z: 0,
    width: 300,
    height: 300,
    depth: 300,
    adjustable: true,
    ...values
  };
}

function templateDefaults(template: CabinetInteriorTemplate, width: number, height: number, depth: number, item: Furniture) {
  const mid = Math.round(width / 2);
  const third = Math.round(width / 3);
  const halfDepth = Math.round(depth * 0.92);
  const shelf = Math.max(18, Math.min(25, Math.round((item.render3d?.kitchenVisual?.panelGapMm ?? 18) * 0.8)));
  const top = Math.max(180, Math.round(height * 0.14));
  const lower = Math.max(260, height - top);
  const drawerH = Math.min(190, Math.max(120, Math.round(height * 0.1)));
  const base = (id: string, kind: CabinetInteriorModuleKind, label: string, values: Partial<CabinetInteriorModule>) => makeInteriorModule(id, kind, label, { depth: halfDepth, ...values });

  switch (template) {
    case "wardrobe":
      return [
        base("top-storage", "shelf", "顶部储物区", { x: 0, y: height - top, width, height: shelf }),
        base("long-hanging", "hanging", "长衣区", { x: 0, y: 0, width: third, height: lower }),
        base("short-hanging", "hanging", "短衣区", { x: third, y: drawerH * 3, width: third, height: lower - drawerH * 3 }),
        base("wardrobe-drawers", "drawer", "抽屉区", { x: third, y: 0, width: third, height: drawerH * 3 }),
        base("folded-shelves", "shelf", "叠放区", { x: third * 2, y: Math.round(height * 0.18), width: width - third * 2, height: shelf }),
        base("shoe-zone", "shoe", "鞋包区", { x: third * 2, y: 0, width: width - third * 2, height: Math.round(height * 0.18) })
      ];
    case "kitchenBase":
      return [
        base("base-drawers", "drawer", "操作抽屉", { x: 0, y: height - drawerH * 2, width: mid, height: drawerH * 2 }),
        base("base-shelf", "shelf", "下部层板", { x: mid, y: Math.round(height * 0.46), width: width - mid, height: shelf }),
        ...(item.serviceRequirements?.water || /水槽|水吧/.test(item.name) ? [base("plumbing-clearance", "plumbing", "水槽/下水避让", { x: mid, y: 0, width: width - mid, height: Math.round(height * 0.44), depth: depth * 0.72 })] : []),
        ...(item.serviceRequirements?.power || /灶|洗碗机|电器/.test(item.name) ? [base("appliance-reserve", "appliance", "设备预留位", { x: 0, y: 0, width: mid, height: Math.round(height * 0.42), depth: depth * 0.82 })] : [])
      ];
    case "kitchenWall":
      return [
        base("wall-shelf-1", "shelf", "上层隔板", { x: 0, y: Math.round(height * 0.62), width, height: shelf }),
        base("wall-shelf-2", "shelf", "下层隔板", { x: 0, y: Math.round(height * 0.28), width, height: shelf }),
        base("wall-open", "open", "开放格", { x: width * 0.64, y: 0, width: width * 0.36, height: Math.round(height * 0.28) })
      ];
    case "kitchenTall":
      return [
        base("tall-appliance-1", "appliance", "蒸箱/烤箱预留", { x: 0, y: Math.round(height * 0.38), width: mid, height: Math.round(height * 0.28), depth: depth * 0.9 }),
        base("tall-pullout", "pullout", "抽拉储物", { x: mid, y: Math.round(height * 0.18), width: width - mid, height: Math.round(height * 0.62) }),
        base("tall-top-shelf", "shelf", "顶部储物格", { x: 0, y: Math.round(height * 0.87), width, height: shelf })
      ];
    case "island":
      return [
        base("island-drawers", "drawer", "岛台抽屉", { x: 0, y: Math.round(height * 0.48), width: width * 0.58, height: Math.round(height * 0.42) }),
        base("island-open", "open", "开放格", { x: width * 0.62, y: Math.round(height * 0.1), width: width * 0.38, height: Math.round(height * 0.7) }),
        ...(item.serviceRequirements?.water ? [base("island-plumbing", "plumbing", "水槽管线预留", { x: 0, y: 0, width: width * 0.42, height: Math.round(height * 0.44), depth: depth * 0.7 })] : [])
      ];
    case "bathroomVanity":
      return [
        base("vanity-basin", "plumbing", "台盆/下水预留", { x: width * 0.22, y: Math.round(height * 0.28), width: width * 0.56, height: Math.round(height * 0.42), depth: depth * 0.72 }),
        base("vanity-drawer", "drawer", "浴室抽屉", { x: 0, y: 0, width: width * 0.42, height: Math.round(height * 0.24) }),
        base("vanity-open", "open", "开放格", { x: width * 0.82, y: 0, width: width * 0.18, height: Math.round(height * 0.72) })
      ];
    case "shoe":
      return [
        ...Array.from({ length: 5 }, (_, index) => base(`shoe-shelf-${index + 1}`, "shoe", `鞋层板 ${index + 1}`, { x: 0, y: index * Math.round(height / 5), width, height: shelf })),
        base("shoe-open", "open", "底部常用鞋开放区", { x: 0, y: 0, width, height: Math.round(height * 0.12) })
      ];
    case "entry":
      return [
        base("entry-hanging", "hanging", "挂衣区", { x: 0, y: Math.round(height * 0.35), width: width * 0.42, height: Math.round(height * 0.55) }),
        base("entry-drawer", "drawer", "抽屉", { x: width * 0.42, y: Math.round(height * 0.45), width: width * 0.58, height: Math.round(height * 0.22) }),
        base("entry-bench", "open", "换鞋凳/开放格", { x: 0, y: 0, width: width * 0.62, height: Math.round(height * 0.28) }),
        base("entry-shoe", "shoe", "底部鞋位", { x: width * 0.62, y: 0, width: width * 0.38, height: Math.round(height * 0.28) })
      ];
    case "bookshelf":
    case "display":
      return Array.from({ length: 5 }, (_, index) => base(`${template}-shelf-${index + 1}`, "shelf", `${template === "display" ? "展示层" : "层板"} ${index + 1}`, { x: 0, y: index * Math.round(height / 5), width, height: shelf }));
    case "corner":
      return [
        base("corner-shelves", "shelf", "转角层板", { x: 0, y: Math.round(height * 0.32), width, height: shelf, depth: depth * 0.7 }),
        base("corner-clearance", "clearance", "转角可达净空", { x: width * 0.44, y: 0, width: width * 0.56, height: Math.round(height * 0.28), depth: depth * 0.5 })
      ];
    default:
      return [
        base("storage-shelf-1", "shelf", "固定层板 1", { x: 0, y: Math.round(height * 0.34), width, height: shelf }),
        base("storage-shelf-2", "shelf", "固定层板 2", { x: 0, y: Math.round(height * 0.68), width, height: shelf }),
        base("storage-open", "open", "开放格", { x: 0, y: 0, width, height: Math.round(height * 0.28) })
      ];
  }
}

function legacyWardrobeModules(item: Furniture, width: number, height: number, depth: number): CabinetInteriorModule[] {
  const legacy = item.wardrobeDesign;
  if (!legacy?.modules?.length) return [];
  return legacy.modules.map((module) => ({
    id: module.id,
    kind: module.kind === "hanging-long" || module.kind === "hanging-short" ? "hanging" : module.kind === "folded" ? "shelf" : module.kind === "drawer" ? "drawer" : module.kind === "shoe" ? "shoe" : module.kind === "open" ? "open" : "void",
    label: module.label ?? module.kind,
    x: Math.round((module.x / 100) * width),
    y: Math.round(((100 - module.y - module.height) / 100) * height),
    z: 0,
    width: Math.round((module.width / 100) * width),
    height: Math.max(18, Math.round((module.height / 100) * height)),
    depth: Math.max(120, depth * 0.92),
    adjustable: true
  }));
}

export function createDefaultCabinetInteriorLayout(item: Furniture): CabinetInteriorLayout {
  const dimensions = cabinetDimensions(item);
  const panelThicknessMm = Math.max(16, Math.min(25, Math.round(item.render3d?.kitchenVisual?.endPanelThicknessMm ?? 18)));
  const interiorWidthMm = Math.max(120, dimensions.width - panelThicknessMm * 2);
  const interiorHeightMm = Math.max(120, dimensions.height - panelThicknessMm * 2);
  const interiorDepthMm = Math.max(120, dimensions.depth - panelThicknessMm);
  const template = getCabinetInteriorTemplate(item);
  const modules = template === "wardrobe"
    ? legacyWardrobeModules(item, interiorWidthMm, interiorHeightMm, interiorDepthMm)
    : [];
  return {
    schemaVersion: 1,
    template,
    panelThicknessMm,
    interiorWidthMm,
    interiorHeightMm,
    interiorDepthMm,
    openingMode: item.render3d?.cabinetVisual?.openingMode ?? (template === "kitchenWall" || template === "kitchenBase" ? "swing" : "doubleSwing"),
    doorCount: Math.max(0, Math.min(12, Math.round(item.render3d?.cabinetVisual?.doorCount ?? item.render3d?.kitchenVisual?.doorCount ?? 2))),
    doorStates: {},
    modules: modules.length ? modules : templateDefaults(template, interiorWidthMm, interiorHeightMm, interiorDepthMm, item),
    notes: ["首次进入时按柜体类型生成默认布局；保存后仅影响当前柜体实例。"],
    createdFrom: modules.length ? "legacyWardrobe" : "default"
  };
}

function normalizedModule(module: CabinetInteriorModule, layout: CabinetInteriorLayout): CabinetInteriorModule {
  const minSize = module.kind === "shelf" || module.kind === "divider" ? 16 : module.kind === "drawer" ? 80 : 40;
  const width = Math.min(layout.interiorWidthMm, Math.max(minSize, roundMm(module.width, minSize)));
  const height = Math.min(layout.interiorHeightMm, Math.max(minSize, roundMm(module.height, minSize)));
  const depth = Math.min(layout.interiorDepthMm, Math.max(40, roundMm(module.depth, 40)));
  return {
    ...module,
    x: Math.min(layout.interiorWidthMm - width, nonNegativeMm(module.x)),
    y: Math.min(layout.interiorHeightMm - height, nonNegativeMm(module.y)),
    z: Math.min(layout.interiorDepthMm - depth, nonNegativeMm(module.z)),
    width,
    height,
    depth,
    adjustable: module.adjustable !== false
  };
}

export function normalizeCabinetInteriorLayout(layout: CabinetInteriorLayout | undefined, item: Furniture): CabinetInteriorLayout {
  const base = layout ?? createDefaultCabinetInteriorLayout(item);
  const fallback = createDefaultCabinetInteriorLayout(item);
  const next: CabinetInteriorLayout = {
    ...fallback,
    ...base,
    schemaVersion: 1,
    template: base.template ?? fallback.template,
    panelThicknessMm: Math.max(16, Math.min(40, roundMm(base.panelThicknessMm, fallback.panelThicknessMm))),
    interiorWidthMm: Math.max(120, roundMm(base.interiorWidthMm, fallback.interiorWidthMm)),
    interiorHeightMm: Math.max(120, roundMm(base.interiorHeightMm, fallback.interiorHeightMm)),
    interiorDepthMm: Math.max(120, roundMm(base.interiorDepthMm, fallback.interiorDepthMm)),
    openingMode: base.openingMode ?? fallback.openingMode,
    doorCount: Math.max(0, Math.min(12, roundMm(base.doorCount, fallback.doorCount))),
    doorStates: { ...(base.doorStates ?? {}) },
    modules: (base.modules?.length ? base.modules : fallback.modules).map((module) => normalizedModule(module, base))
  };
  return next;
}

function overlaps(left: CabinetInteriorModule, right: CabinetInteriorModule) {
  return left.x < right.x + right.width && left.x + left.width > right.x &&
    left.y < right.y + right.height && left.y + left.height > right.y &&
    left.z < right.z + right.depth && left.z + left.depth > right.z;
}

export function validateCabinetInteriorLayout(item: Furniture, layout: CabinetInteriorLayout): CabinetInteriorCheck[] {
  const checks: CabinetInteriorCheck[] = [];
  const dimensions = cabinetDimensions(item);
  if (layout.panelThicknessMm < 16) checks.push({ code: "PANEL_THIN", severity: "warning", message: "板材厚度低于 16mm。", suggestion: "建议使用 18–20mm 板材，抽屉和层板更稳定。", actualMm: layout.panelThicknessMm, requiredMm: 16 });
  if (layout.interiorDepthMm < 280 && ["wardrobe", "kitchenBase", "kitchenTall", "entry", "shoe"].includes(layout.template)) checks.push({ code: "DEPTH_SHALLOW", severity: "warning", message: "内部净深偏小，可能影响挂衣、鞋具或抽拉件。", suggestion: "建议复核 300–600mm 的有效深度。", actualMm: layout.interiorDepthMm, requiredMm: 280 });
  if (layout.openingMode !== "open" && layout.doorCount === 0) checks.push({ code: "DOOR_COUNT_ZERO", severity: "warning", message: "设置了柜门开启方式但柜门数量为 0。", suggestion: "改为开放柜，或补充柜门数量。" });
  if (dimensions.width < 300 && layout.template !== "corner") checks.push({ code: "CABINET_NARROW", severity: "warning", message: "柜体外部宽度偏小，内部模块可能过度拥挤。", suggestion: "建议减少分区或保持单列布局。", actualMm: dimensions.width, requiredMm: 300 });
  layout.modules.forEach((module) => {
    if (module.x < 0 || module.y < 0 || module.z < 0 || module.x + module.width > layout.interiorWidthMm || module.y + module.height > layout.interiorHeightMm || module.z + module.depth > layout.interiorDepthMm) {
      checks.push({ code: "MODULE_OUT_OF_BOUNDS", severity: "error", message: `${module.label} 超出柜体内部净尺寸。`, suggestion: "拖回柜体内部或缩小模块后再保存。", moduleId: module.id });
    }
    if (module.kind === "hanging" && module.width < 450) checks.push({ code: "HANGING_NARROW", severity: "warning", message: `${module.label} 净宽不足 450mm。`, suggestion: "建议扩大挂衣区或改为叠放/抽屉区。", moduleId: module.id, actualMm: module.width, requiredMm: 450 });
    if (module.kind === "drawer" && module.height < 80) checks.push({ code: "DRAWER_SHORT", severity: "warning", message: `${module.label} 高度不足 80mm。`, suggestion: "建议保留 100–180mm 抽屉面高度。", moduleId: module.id, actualMm: module.height, requiredMm: 80 });
    if (module.kind === "appliance" && module.width < 450) checks.push({ code: "APPLIANCE_NARROW", severity: "warning", message: `${module.label} 宽度可能不足设备安装要求。`, suggestion: "请按设备型号复核 450–600mm 安装空间。", moduleId: module.id, actualMm: module.width, requiredMm: 450 });
  });
  const physical = layout.modules.filter((module) => PHYSICAL_MODULE_KINDS.has(module.kind));
  for (let leftIndex = 0; leftIndex < physical.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < physical.length; rightIndex += 1) {
      const left = physical[leftIndex];
      const right = physical[rightIndex];
      if (overlaps(left, right)) checks.push({ code: "MODULE_OVERLAP", severity: "error", message: `${left.label} 与 ${right.label} 发生空间穿插。`, suggestion: "移动或缩小其中一个模块，避免板件和设备重叠。", moduleId: right.id });
    }
  }
  if (["kitchenBase", "island", "bathroomVanity"].includes(layout.template) && !layout.modules.some((module) => module.kind === "plumbing")) {
    checks.push({ code: "SERVICE_RESERVE_MISSING", severity: "warning", message: "当前柜体类型没有管线避让模块。", suggestion: "如果包含水槽、台盆或给排水，请添加管线避让空间。" });
  }
  if (layout.template === "corner" && layout.modules.some((module) => module.kind === "clearance" && module.width < 300)) {
    checks.push({ code: "CORNER_ACCESS", severity: "warning", message: "转角可达净空偏小。", suggestion: "建议保留至少 300mm 的可达检修和取物空间。" });
  }
  return checks;
}

export function getCabinetInteriorDisplayName(template: CabinetInteriorTemplate) {
  return {
    wardrobe: "衣柜",
    kitchenBase: "厨房地柜",
    kitchenWall: "厨房吊柜",
    kitchenTall: "厨房高柜",
    island: "中岛柜体",
    bathroomVanity: "卫浴柜",
    entry: "玄关柜",
    shoe: "鞋柜",
    storage: "储物柜",
    bookshelf: "书柜",
    display: "玻璃展示柜",
    corner: "转角柜",
    generic: "柜体"
  }[template];
}
