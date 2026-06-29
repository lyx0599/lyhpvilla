import { formatDimensions, getFileName } from "@/lib/format";
import { interiorModuleCategoryLabels } from "@/data/interior-module-catalog";
import type { InteriorModuleCatalogItem } from "@/data/interior-module-catalog";
import { FurnitureTopView } from "@/components/furniture-top-view";
import type { Dimension, Floor, Furniture, InteriorModuleCategory } from "@/types/space";
import { semanticCategoryLabels } from "@/lib/semantic-map";
import type { SemanticObject } from "@/types/semantic-map";

type Props = {
  floor: Floor;
  floorPlanScale: number;
  furniture: Furniture | null;
  semanticObject: SemanticObject | null;
  semanticObjects: SemanticObject[];
  moduleCatalogGroups: Array<{ category: InteriorModuleCategory; items: InteriorModuleCatalogItem[] }>;
  moduleTargetLabel: string;
  onAddModule: (item: InteriorModuleCatalogItem) => void;
  onFurnitureChange?: (furniture: Furniture) => void;
  onDeleteFurniture: (furnitureId: string) => void;
  onRotateFurniture: (furnitureId: string) => void;
};

const dimensionFields: Array<["width" | "depth" | "height", string]> = [
  ["width", "宽 cm"],
  ["depth", "深 cm"],
  ["height", "高 cm"]
];

function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function MobileDetailsDrawer({
  floor,
  floorPlanScale,
  furniture,
  semanticObject,
  semanticObjects,
  moduleCatalogGroups = [],
  moduleTargetLabel = "",
  onAddModule = () => {},
  onFurnitureChange,
  onDeleteFurniture = () => {},
  onRotateFurniture = () => {}
}: Props) {
  const canEditFurniture = Boolean(furniture && onFurnitureChange && !furniture.locked);
  const colorPickerValue = furniture && isHexColor(furniture.color) ? furniture.color : "#d6d9d7";

  function updateFurniture(patch: Partial<Furniture>) {
    if (!furniture || !onFurnitureChange || furniture.locked) return;
    onFurnitureChange({ ...furniture, ...patch });
  }

  function updateFurnitureDimension(field: (typeof dimensionFields)[number][0], value: string) {
    if (!furniture) return;
    updateFurniture({
      dimensions: {
        ...furniture.dimensions,
        [field]: Math.max(1, Number(value) || 1)
      } as Dimension
    });
  }

  return (
    <section className="fixed inset-x-3 bottom-3 z-20 max-h-[78vh] overflow-y-auto rounded-[1.5rem] border border-white/80 bg-white/94 p-4 shadow-soft backdrop-blur lg:hidden">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-300" />
      <div className="mb-3 grid grid-cols-3 gap-2 rounded-2xl bg-stone-50 p-2 text-xs text-stone-500">
        <div>
          <p>楼层</p>
          <p className="mt-1 font-semibold text-ink">{floor.label}</p>
        </div>
        <div>
          <p>底图</p>
          <p className="mt-1 truncate font-semibold text-ink">{getFileName(floor.floorPlanImage)}</p>
        </div>
        <div>
          <p>缩放</p>
          <p className="mt-1 font-semibold text-ink">{Math.round(floorPlanScale * 100)}%</p>
        </div>
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {semanticObjects.slice(0, 8).map((object) => (
          <span key={object.id} className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${object.id === semanticObject?.id ? "bg-clay text-white" : "bg-stone-100 text-stone-500"}`}>
            {object.name}
          </span>
        ))}
        {!semanticObjects.length && <span className="text-xs text-stone-400">当前楼层暂无语义对象</span>}
      </div>
      <div className="mb-3 rounded-2xl bg-stone-50 p-2">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-xs font-semibold text-ink">物品模块库</p>
          <p className="truncate text-[11px] font-semibold text-stone-400">{moduleTargetLabel}</p>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {moduleCatalogGroups.flatMap(({ category, items }) => items.map((item) => (
            <button
              key={item.id}
              className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-left text-xs shadow-sm"
              onClick={() => onAddModule(item)}
              type="button"
            >
              <FurnitureTopView className="mb-2 h-14 w-20 border border-stone-100" color={item.color} label={item.codePrefix} type={item.furnitureType} />
              <span className="block font-semibold text-ink">+ {item.name}</span>
              <span className="mt-0.5 block text-[10px] text-stone-400">{interiorModuleCategoryLabels[category]} · {item.dimensions.width} x {item.dimensions.depth}</span>
            </button>
          )))}
        </div>
      </div>
      {semanticObject ? (
        <div>
          <p className="text-xs font-semibold text-clay">{semanticObject.id} · {semanticCategoryLabels[semanticObject.category]}</p>
          <h2 className="mt-1 text-base font-semibold text-ink">{semanticObject.name}</h2>
          <p className="mt-1 text-sm text-stone-500">{semanticObject.notes || semanticObject.type}</p>
        </div>
      ) : furniture ? (
        <div>
          <div className="flex items-start gap-3">
            <FurnitureTopView className="size-16 shrink-0 border border-stone-100 shadow-sm" color={furniture.color} label={furniture.code.split("-")[0]} type={furniture.type} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-clay">{furniture.code} · {furniture.floorId}</p>
              <h2 className="mt-1 truncate text-base font-semibold text-ink">{furniture.name}</h2>
              <p className="mt-1 text-sm text-stone-500">{formatDimensions(furniture.dimensions)}</p>
              <span className="mt-2 inline-flex max-w-full rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-500">{furniture.material}</span>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="text-xs font-semibold text-emerald-900">可编辑参数</p>
            <label className="mt-3 block text-xs text-stone-500">
              名称
              <input
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100 disabled:text-stone-400"
                disabled={!canEditFurniture}
                value={furniture.name}
                onChange={(event) => updateFurniture({ name: event.target.value })}
              />
            </label>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {dimensionFields.map(([field, label]) => (
                <label key={field} className="block text-xs text-stone-500">
                  {label}
                  <input
                    className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100 disabled:text-stone-400"
                    disabled={!canEditFurniture}
                    min="1"
                    type="number"
                    value={furniture.dimensions[field]}
                    onChange={(event) => updateFurnitureDimension(field, event.target.value)}
                  />
                </label>
              ))}
            </div>
            <label className="mt-3 block text-xs text-stone-500">
              颜色
              <div className="mt-1 flex items-center gap-2">
                <input
                  className="h-10 w-14 shrink-0 rounded-lg border border-stone-200 bg-white p-1 disabled:bg-stone-100"
                  disabled={!canEditFurniture}
                  type="color"
                  value={colorPickerValue}
                  onChange={(event) => updateFurniture({ color: event.target.value })}
                />
                <input
                  className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100 disabled:text-stone-400"
                  disabled={!canEditFurniture}
                  value={furniture.color}
                  onChange={(event) => updateFurniture({ color: event.target.value })}
                />
              </div>
            </label>
            <label className="mt-3 block text-xs text-stone-500">
              材质
              <input
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100 disabled:text-stone-400"
                disabled={!canEditFurniture}
                value={furniture.material}
                onChange={(event) => updateFurniture({ material: event.target.value })}
              />
            </label>
            <label className="mt-3 block text-xs text-stone-500">
              备注 / 采购想法
              <textarea
                className="mt-1 min-h-20 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100 disabled:text-stone-400"
                disabled={!canEditFurniture}
                value={furniture.note}
                onChange={(event) => updateFurniture({ note: event.target.value, constructionNote: event.target.value })}
              />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600"
              onClick={() => onRotateFurniture(furniture.id)}
              type="button"
            >
              旋转 15°
            </button>
            <button
              className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:bg-stone-200 disabled:text-stone-400"
              disabled={furniture.locked}
              onClick={() => onDeleteFurniture(furniture.id)}
              type="button"
            >
              删除
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-stone-500">当前楼层 {semanticObjects.length} 个语义对象。点击标记后显示详情。</p>
      )}
    </section>
  );
}
