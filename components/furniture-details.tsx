import { formatDimensions, getFileName } from "@/lib/format";
import { FurnitureTopView } from "@/components/furniture-top-view";
import type { Dimension, Floor, Furniture } from "@/types/space";
import { interiorModuleCategoryLabels, interiorModuleTypeLabels, serviceRequirementLabels } from "@/data/interior-module-catalog";
import { semanticCategoryLabels } from "@/lib/semantic-map";
import type { SemanticObject } from "@/types/semantic-map";

type Props = {
  floor: Floor;
  floorPlanScale: number;
  furniture: Furniture | null;
  semanticObject: SemanticObject | null;
  onFurnitureChange?: (furniture: Furniture) => void;
};

const dimensionFields: Array<[keyof Dimension, string]> = [
  ["width", "宽 cm"],
  ["depth", "深 cm"],
  ["height", "高 cm"]
];

function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function getFurnitureTypeLabel(furniture: Furniture) {
  if (furniture.moduleCategory) {
    return `${interiorModuleCategoryLabels[furniture.moduleCategory]} · ${furniture.moduleType ? interiorModuleTypeLabels[furniture.moduleType] : furniture.type}`;
  }
  return furniture.type;
}

export function FurnitureDetails({ floor, floorPlanScale, furniture, semanticObject, onFurnitureChange }: Props) {
  const serviceRequirements = furniture?.serviceRequirements;
  const serviceRows = serviceRequirements
    ? serviceRequirementLabels.map((service) => [service.label, serviceRequirements[service.key] ? "需要" : "不需要"])
    : [];
  const canEditFurniture = Boolean(furniture && onFurnitureChange && !furniture.locked);
  const colorPickerValue = furniture && isHexColor(furniture.color) ? furniture.color : "#d6d9d7";
  const floorRows = [
    ["楼层名称", floor.label],
    ["楼层编号", floor.id],
    ["底图文件名", getFileName(floor.floorPlanImage)],
    ["当前缩放比例", `${Math.round(floorPlanScale * 100)}%`]
  ];

  const furnitureRows = furniture ? [
    ["唯一编号", furniture.code],
    ["名称", furniture.name],
    ["楼层", furniture.floorId],
    ["类型", getFurnitureTypeLabel(furniture)],
    ["尺寸", formatDimensions(furniture.dimensions)],
    ["材质", furniture.material],
    ...serviceRows,
    ["施工备注", furniture.constructionNote || furniture.note],
    ["备注", furniture.note]
  ] : [];

  function updateFurniture(patch: Partial<Furniture>) {
    if (!furniture || !onFurnitureChange || furniture.locked) return;
    onFurnitureChange({ ...furniture, ...patch });
  }

  function updateFurnitureDimension(field: keyof Dimension, value: string) {
    if (!furniture) return;
    updateFurniture({
      dimensions: {
        ...furniture.dimensions,
        [field]: Math.max(1, Number(value) || 1)
      }
    });
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Properties</p>
      <h2 className="mt-2 text-xl font-semibold text-ink">楼层底图</h2>
      <div className="mt-5 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
        <dl className="space-y-3">
          {floorRows.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-stone-50 px-3 py-2">
              <dt className="text-xs text-stone-400">{label}</dt>
              <dd className="mt-1 break-all text-sm font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="mt-4 rounded-3xl border border-moss/20 bg-moss/10 p-4 text-sm leading-6 text-stone-600">
        <p className="font-semibold text-ink">底图优化建议</p>
        <p className="mt-1">上传酷家乐图前，建议删除默认家具、杂乱颜色、无关装饰和文字标注；底图只保留墙、门、窗、楼梯和结构边界。</p>
        <p className="mt-1">家具、灯光、水电、设备都应作为 Overlay Objects 录入，避免被画死在图片里。</p>
      </div>

      <h2 className="mt-6 text-xl font-semibold text-ink">家具 / 硬装详情</h2>
      {semanticObject && (
        <div className="mb-6 mt-5 rounded-3xl border border-clay/30 bg-clay/10 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Selected Semantic Object</p>
          <h3 className="mt-2 text-lg font-semibold text-ink">{semanticObject.name}</h3>
          <dl className="mt-4 space-y-3">
            {[
              ["id", semanticObject.id],
              ["大类", semanticCategoryLabels[semanticObject.category]],
              ["类型", semanticObject.type],
              ["楼层", semanticObject.floorId],
              ["备注", semanticObject.notes || "无"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/70 px-3 py-2">
                <dt className="text-xs text-stone-400">{label}</dt>
                <dd className="mt-1 break-all text-sm font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <pre className="mt-3 max-h-44 overflow-auto rounded-2xl bg-white/80 p-3 text-xs text-stone-600">
            {JSON.stringify(semanticObject.details, null, 2)}
          </pre>
        </div>
      )}
      {furniture ? (
        <div className="mt-5 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <FurnitureTopView className="size-16 shrink-0 border border-stone-100 shadow-sm" color={furniture.color} label={furniture.code.split("-")[0]} type={furniture.type} />
          <div>
            <h3 className="font-semibold text-ink">{furniture.name}</h3>
            <p className="text-sm text-stone-500">
              {getFurnitureTypeLabel(furniture)}
            </p>
          </div>
        </div>
        <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-emerald-900">可编辑参数</p>
            {furniture.locked && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-500">已锁定</span>}
          </div>
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
        {serviceRequirements && (
          <div className="mb-4 flex flex-wrap gap-2">
            {serviceRequirementLabels.map((service) => (
              <span
                key={service.key}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${serviceRequirements[service.key] ? "bg-blue-50 text-blue-700" : "bg-stone-100 text-stone-400"}`}
              >
                {service.label}{serviceRequirements[service.key] ? "需要" : "不需要"}
              </span>
            ))}
          </div>
        )}
        <dl className="space-y-3">
          {furnitureRows.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-stone-50 px-3 py-2">
              <dt className="text-xs text-stone-400">{label}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        </div>
      ) : (
        <div className="mt-5 rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-500">
          当前楼层还没有家具对象。后续可在 overlay 图层添加标注。
        </div>
      )}
      <div className="mt-4 rounded-3xl border border-clay/20 bg-clay/10 p-4 text-sm leading-6 text-stone-600">
        底图和 overlay 使用同一个 4:3 坐标容器；家具位置暂按百分比坐标存储，缩放和拖动时会一起移动。
      </div>
    </div>
  );
}
