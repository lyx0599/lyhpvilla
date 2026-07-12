import { formatDimensions } from "@/lib/format";
import { semanticCategoryLabels } from "@/lib/semantic-map";
import type { InteriorModuleCatalogItem } from "@/data/interior-module-catalog";
import type {
  Floor,
  Furniture,
  HouseBayWindow,
  HouseDoor,
  HouseOutdoor,
  HouseOutdoorSurface,
  HouseRoom,
  HouseSkylight,
  HouseStair,
  HouseStructureObject,
  HouseWall,
  HouseWindow,
  InteriorModuleCategory,
  MobileDisplayLevel,
  ViewMode
} from "@/types/space";
import type { SemanticObject } from "@/types/semantic-map";

type Props = {
  floor: Floor;
  floorPlanScale: number;
  furniture: Furniture | null;
  semanticObject: SemanticObject | null;
  semanticObjects: SemanticObject[];
  structureObject?: HouseStructureObject | null;
  rooms?: HouseRoom[];
  open?: boolean;
  onClose?: () => void;
  displayLevel?: MobileDisplayLevel;
  viewMode?: ViewMode;
  projectInfo?: boolean;
  moduleCatalogGroups?: Array<{ category: InteriorModuleCategory; items: InteriorModuleCatalogItem[] }>;
  moduleTargetLabel?: string;
  onAddModule?: (item: InteriorModuleCatalogItem) => void;
  onFurnitureChange?: (furniture: Furniture) => void;
  onDeleteFurniture?: (furnitureId: string) => void;
  onRotateFurniture?: (furnitureId: string) => void;
};

type InfoRow = {
  label: string;
  value: string;
};

function formatMm(value: number | undefined) {
  if (!Number.isFinite(value)) return "未标注";
  return `${Math.round(value ?? 0)} mm`;
}

function formatArea(value: number | undefined) {
  if (!Number.isFinite(value)) return "未标注";
  return `${((value ?? 0) / 1_000_000).toFixed(2)} m2`;
}

function isHouseRoom(object: HouseStructureObject | null | undefined): object is HouseRoom {
  return Boolean(object && "spaceType" in object && object.spaceType === "Room");
}

function isOutdoor(object: HouseStructureObject | null | undefined): object is HouseOutdoor {
  return Boolean(object && "spaceType" in object && object.spaceType === "Outdoor");
}

function isOutdoorSurface(object: HouseStructureObject | null | undefined): object is HouseOutdoorSurface {
  return Boolean(object && "surfaceType" in object);
}

function isDoor(object: HouseStructureObject | null | undefined): object is HouseDoor {
  return Boolean(object && "openDirection" in object && "hostId" in object);
}

function isWindow(object: HouseStructureObject | null | undefined): object is HouseWindow {
  return Boolean(object && "hostId" in object && "positionOnWall" in object && !("openDirection" in object));
}

function isBayWindow(object: HouseStructureObject | null | undefined): object is HouseBayWindow {
  return Boolean(object && "wallId" in object && "depth" in object && "positionOnWall" in object);
}

function isSkylight(object: HouseStructureObject | null | undefined): object is HouseSkylight {
  return Boolean(object && "center" in object && "rotation" in object && "openable" in object);
}

function isStair(object: HouseStructureObject | null | undefined): object is HouseStair {
  return Boolean(object && "stepCount" in object && "direction" in object);
}

function isWall(object: HouseStructureObject | null | undefined): object is HouseWall {
  return Boolean(object && "thickness" in object && "length" in object && ("start" in object || "center" in object));
}

function getFurnitureRoomName(furniture: Furniture, rooms: HouseRoom[]) {
  return rooms.find((room) => room.id === furniture.roomId)?.name ?? furniture.roomId;
}

function getSemanticSize(object: SemanticObject) {
  const details = object.details as { size?: { width?: number; depth?: number; height?: number; unit?: string }; area?: number; roomId?: string };
  const size = details.size;
  if (size) {
    const unit = size.unit ?? "cm";
    return [size.width, size.depth, size.height].filter((value) => Number.isFinite(value)).join(" x ") + ` ${unit}`;
  }
  if (Number.isFinite(details.area)) return `${Number(details.area).toFixed(2)} m2`;
  return "未标注";
}

function getSemanticRoomName(object: SemanticObject, rooms: HouseRoom[]) {
  const roomId = (object.details as { roomId?: string }).roomId;
  return roomId ? rooms.find((room) => room.id === roomId)?.name ?? roomId : "未关联房间";
}

function getStructureSummary(object: HouseStructureObject | null | undefined): { name: string; type: string; dimensions: string; material: string; rows: InfoRow[] } | null {
  if (!object) return null;
  if (isHouseRoom(object)) {
    return {
      name: object.name,
      type: "房间",
      dimensions: formatArea(object.area),
      material: "结构空间",
      rows: [
        { label: "房间编号", value: object.roomNumber },
        { label: "面积", value: formatArea(object.area) },
        { label: "边界点", value: `${object.boundary.length} 个` }
      ]
    };
  }
  if (isOutdoor(object)) {
    return {
      name: object.name,
      type: "庭院",
      dimensions: formatArea(object.area),
      material: object.outdoorType,
      rows: [
        { label: "面积", value: formatArea(object.area) },
        { label: "类型", value: object.outdoorType },
        { label: "边界点", value: `${object.polygon.length} 个` }
      ]
    };
  }
  if (isOutdoorSurface(object)) {
    return {
      name: object.name,
      type: "庭院铺装",
      dimensions: formatArea(object.area),
      material: object.material,
      rows: [
        { label: "面积", value: formatArea(object.area) },
        { label: "铺装", value: object.material },
        { label: "类型", value: object.surfaceType }
      ]
    };
  }
  if (isDoor(object)) {
    return {
      name: object.name,
      type: "门",
      dimensions: `${formatMm(object.width)} x ${formatMm(object.height)}`,
      material: object.material ?? "未标注",
      rows: [
        { label: "宽度", value: formatMm(object.width) },
        { label: "高度", value: formatMm(object.height) },
        { label: "开启", value: object.operation ?? object.openDirection }
      ]
    };
  }
  if (isBayWindow(object)) {
    return {
      name: object.name,
      type: "飘窗",
      dimensions: `${formatMm(object.width)} x ${formatMm(object.depth)} x ${formatMm(object.height)}`,
      material: "窗体",
      rows: [
        { label: "宽度", value: formatMm(object.width) },
        { label: "深度", value: formatMm(object.depth) },
        { label: "高度", value: formatMm(object.height) }
      ]
    };
  }
  if (isWindow(object)) {
    return {
      name: object.name,
      type: "窗",
      dimensions: `${formatMm(object.width)} x ${formatMm(object.height)}`,
      material: "窗体",
      rows: [
        { label: "宽度", value: formatMm(object.width) },
        { label: "高度", value: formatMm(object.height) },
        { label: "所在墙体", value: object.hostId }
      ]
    };
  }
  if (isSkylight(object)) {
    return {
      name: object.name,
      type: "天窗",
      dimensions: `${formatMm(object.width)} x ${formatMm(object.depth)} x ${formatMm(object.height)}`,
      material: object.openable ? "可开启" : "固定",
      rows: [
        { label: "宽度", value: formatMm(object.width) },
        { label: "深度", value: formatMm(object.depth) },
        { label: "开启", value: object.openable ? "需要确认电源/开启方式" : "固定" }
      ]
    };
  }
  if (isStair(object)) {
    return {
      name: object.name,
      type: "楼梯",
      dimensions: `${formatMm(object.width)} x ${formatMm(object.height)}`,
      material: "结构楼梯",
      rows: [
        { label: "宽度", value: formatMm(object.width) },
        { label: "高度", value: formatMm(object.height) },
        { label: "踏步", value: `${object.stepCount} 级` }
      ]
    };
  }
  if (isWall(object)) {
    return {
      name: object.name,
      type: object.barrierType === "railing" ? "栏杆/围护" : "墙体",
      dimensions: `${formatMm(object.length)} x ${formatMm(object.height)}`,
      material: object.material ?? "masonry",
      rows: [
        { label: "长度", value: formatMm(object.length) },
        { label: "厚度", value: formatMm(object.thickness) },
        { label: "高度", value: formatMm(object.height) }
      ]
    };
  }
  return {
    name: object.name,
    type: "结构对象",
    dimensions: "未标注",
    material: "未标注",
    rows: [{ label: "对象 ID", value: object.id }]
  };
}

function serviceRows(furniture: Furniture | null): InfoRow[] {
  if (!furniture) return [];
  const mep = furniture.mepMeta ?? {};
  const service = furniture.serviceRequirements;
  return [
    { label: "插座", value: mep.needsSocket || service?.power ? `需要${mep.socketCount ? ` · ${mep.socketCount} 个` : ""}` : "未标注" },
    { label: "给水", value: mep.needsWaterSupply || service?.water ? "需要" : "未标注" },
    { label: "排水", value: mep.needsDrainage || service?.drainage ? "需要" : "未标注" },
    { label: "灯带/照明", value: mep.needsLighting ? mep.lightingType ?? "需要" : "未标注" }
  ];
}

export function MobileDetailsDrawer({
  floor,
  floorPlanScale,
  furniture,
  semanticObject,
  semanticObjects,
  structureObject = null,
  rooms = [],
  open = true,
  onClose,
  displayLevel = "simple",
  viewMode = "2d",
  projectInfo = false
}: Props) {
  if (!open) return null;

  const structureSummary = getStructureSummary(structureObject);
  const title = projectInfo
    ? "林屿湖畔装修方案"
    : furniture
      ? furniture.name
      : structureSummary
        ? structureSummary.name
        : semanticObject
          ? semanticObject.name
          : "当前楼层";
  const type = projectInfo
    ? "项目"
    : furniture
      ? furniture.moduleCategory ? "硬装/柜体模块" : "家具"
      : structureSummary?.type ?? (semanticObject ? semanticCategoryLabels[semanticObject.category] : "楼层概览");
  const roomName = furniture
    ? getFurnitureRoomName(furniture, rooms)
    : semanticObject
      ? getSemanticRoomName(semanticObject, rooms)
      : isHouseRoom(structureObject)
        ? structureObject.name
        : "未关联房间";
  const dimensions = projectInfo
    ? `${floor.label} · ${viewMode === "2d" ? "2D 图纸" : "3D 模型"}`
    : furniture
      ? formatDimensions(furniture.dimensions)
      : structureSummary?.dimensions ?? (semanticObject ? getSemanticSize(semanticObject) : `${semanticObjects.length} 个标注对象`);
  const material = projectInfo
    ? "四层/五层装修方案底盘"
    : furniture
      ? furniture.material || "未标注"
      : structureSummary?.material ?? (semanticObject?.type || "未标注");
  const rows: InfoRow[] = projectInfo
    ? [
      { label: "当前楼层", value: `${floor.label} · ${floor.subtitle}` },
      { label: "当前视图", value: viewMode === "2d" ? "2D 图纸" : "3D 模型" },
      { label: "显示层级", value: displayLevel === "simple" ? "简洁" : displayLevel === "annotated" ? "标注" : "专业" },
      { label: "2D 缩放", value: `${Math.round(floorPlanScale * 100)}%` }
    ]
    : furniture
      ? [
        { label: "宽", value: `${furniture.dimensions.width} cm` },
        { label: "深", value: `${furniture.dimensions.depth} cm` },
        { label: "高", value: `${furniture.dimensions.height} cm` },
        { label: "施工备注", value: furniture.constructionMeta?.notes || furniture.constructionNote || furniture.note || "暂无备注" },
        ...serviceRows(furniture)
      ]
      : structureSummary
        ? structureSummary.rows
        : semanticObject
          ? [
            { label: "类型", value: semanticObject.type },
            { label: "所在房间", value: roomName },
            { label: "尺寸/面积", value: dimensions },
            { label: "备注", value: semanticObject.notes || "暂无备注" }
          ]
          : [{ label: "对象", value: "点击房间、家具、门窗、柜体或点位后查看详情" }];

  return (
    <details className="fixed inset-x-3 bottom-[4.75rem] z-[80] max-h-[54vh] overflow-hidden rounded-[1.25rem] border border-white/80 bg-white/96 shadow-[0_18px_46px_rgba(39,34,28,0.24)] backdrop-blur open:overflow-y-auto">
      <summary className="list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-stone-300" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-stone-500">{floor.label} · {roomName} · {type}</p>
            <h2 className="mt-0.5 truncate text-base font-semibold text-ink">{title}</h2>
            <p className="mt-1 truncate text-xs font-semibold text-stone-500">{dimensions} · {material}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-500">展开</span>
            {onClose && (
              <button
                aria-label="关闭信息卡"
                className="grid size-8 place-items-center rounded-full bg-stone-100 text-sm font-semibold text-stone-500"
                onClick={(event) => {
                  event.preventDefault();
                  onClose();
                }}
                type="button"
              >
                x
              </button>
            )}
          </div>
        </div>
      </summary>
      <div className="border-t border-stone-100 px-4 pb-4 pt-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-stone-50 px-3 py-2">
            <p className="text-stone-400">楼层</p>
            <p className="mt-1 font-semibold text-ink">{floor.label}</p>
          </div>
          <div className="rounded-xl bg-stone-50 px-3 py-2">
            <p className="text-stone-400">显示</p>
            <p className="mt-1 font-semibold text-ink">{displayLevel === "simple" ? "简洁" : displayLevel === "annotated" ? "标注" : "专业"}</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {rows.map((row) => (
            <div key={`${row.label}-${row.value}`} className="rounded-xl bg-stone-50 px-3 py-2 text-xs">
              <p className="font-semibold text-stone-400">{row.label}</p>
              <p className="mt-1 whitespace-pre-wrap break-words font-semibold leading-5 text-ink">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
