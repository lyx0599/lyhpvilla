import { formatDimensions, getFileName } from "@/lib/format";
import type { Floor, Furniture } from "@/types/space";
import { semanticCategoryLabels } from "@/lib/semantic-map";
import type { SemanticObject } from "@/types/semantic-map";

type Props = {
  floor: Floor;
  floorPlanScale: number;
  furniture: Furniture | null;
  semanticObject: SemanticObject | null;
  semanticObjects: SemanticObject[];
};

export function MobileDetailsDrawer({ floor, floorPlanScale, furniture, semanticObject, semanticObjects }: Props) {
  return (
    <section className="fixed inset-x-3 bottom-3 z-20 rounded-[1.5rem] border border-white/80 bg-white/94 p-4 shadow-soft backdrop-blur lg:hidden">
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
      {semanticObject ? (
        <div>
          <p className="text-xs font-semibold text-clay">{semanticObject.id} · {semanticCategoryLabels[semanticObject.category]}</p>
          <h2 className="mt-1 text-base font-semibold text-ink">{semanticObject.name}</h2>
          <p className="mt-1 text-sm text-stone-500">{semanticObject.notes || semanticObject.type}</p>
        </div>
      ) : furniture ? (
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-clay">{furniture.code} · {furniture.floorId}</p>
              <h2 className="mt-1 text-base font-semibold text-ink">{furniture.name}</h2>
              <p className="mt-1 text-sm text-stone-500">{formatDimensions(furniture.dimensions)}</p>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-500">{furniture.material}</span>
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-stone-500">{furniture.note}</p>
        </div>
      ) : (
        <p className="text-center text-sm text-stone-500">当前楼层 {semanticObjects.length} 个语义对象。点击标记后显示详情。</p>
      )}
    </section>
  );
}
