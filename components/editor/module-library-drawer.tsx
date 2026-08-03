import { FurnitureTopView } from "@/components/furniture-top-view";
import { interiorModuleCategoryLabels } from "@/data/interior-module-catalog";
import type { InteriorModuleCatalogItem } from "@/data/interior-module-catalog";
import type { InteriorModuleCategory, Render3DAssetType } from "@/types/space";

type ModuleGroup = {
  category: InteriorModuleCategory;
  items: InteriorModuleCatalogItem[];
};

type Props = {
  groups: ModuleGroup[];
  recentIds: string[];
  targetLabel: string;
  floorCounts: Record<InteriorModuleCategory, number>;
  expanded: boolean;
  toolbarExpanded?: boolean;
  openCategories: Record<InteriorModuleCategory, boolean>;
  onToggleExpanded: () => void;
  onToggleCategory: (category: InteriorModuleCategory) => void;
  onAdd: (item: InteriorModuleCatalogItem) => void;
  onClose: () => void;
};

function ModuleRow({ item, onAdd }: { item: InteriorModuleCatalogItem; onAdd: (item: InteriorModuleCatalogItem) => void }) {
  return <div className="flex items-center gap-2 border-b border-stone-100 py-2 last:border-b-0">
    <FurnitureTopView
      assetType={item.render3d?.assetType as Render3DAssetType | undefined}
      variantId={item.render3d?.variantId}
      className="h-12 w-14 shrink-0 border border-stone-200 bg-white"
      color={item.color}
      footprint={item.dimensions}
      label={item.codePrefix}
      stretchToFill
      type={item.furnitureType}
    />
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-semibold text-slate-900">{item.name}</p>
      <p className="mt-0.5 truncate text-[10px] text-stone-500">{item.dimensions.width} × {item.dimensions.depth} cm</p>
    </div>
    <button className="shrink-0 rounded-md bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-700" onClick={() => onAdd(item)} type="button">添加</button>
  </div>;
}

export function ModuleLibraryDrawer({ groups, recentIds, targetLabel, floorCounts, expanded, toolbarExpanded = false, openCategories, onToggleExpanded, onToggleCategory, onAdd, onClose }: Props) {
  const allItems = groups.flatMap((group) => group.items);
  const recentItems = recentIds.map((id) => allItems.find((item) => item.id === id)).filter((item): item is InteriorModuleCatalogItem => Boolean(item));
  const commonItems = (recentItems.length ? recentItems : allItems.slice(0, 6)).slice(0, 6);

  return <aside className={`absolute inset-y-0 z-[58] flex w-[288px] min-h-0 flex-col border-r border-stone-200 bg-[#fbfaf7] shadow-[12px_0_28px_rgba(28,25,23,0.08)] ${toolbarExpanded ? "left-[192px]" : "left-14"}`} aria-label="物品模块库">
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-stone-200 px-3">
      <div className="min-w-0"><p className="text-sm font-semibold text-slate-900">物品库</p><p className="truncate text-[10px] text-stone-500">添加到 {targetLabel}</p></div>
      <button aria-label="关闭物品库" className="grid size-8 place-items-center rounded-md text-lg text-stone-400 hover:bg-stone-100" onClick={onClose} type="button">×</button>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
      {!expanded ? <>
        <div className="flex items-center justify-between py-1"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">{recentItems.length ? "最近使用" : "常用物品"}</p><span className="text-[10px] text-stone-400">{commonItems.length} 项</span></div>
        <div>{commonItems.map((item) => <ModuleRow item={item} key={item.id} onAdd={onAdd} />)}</div>
        <button className="mt-3 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:border-stone-400" onClick={onToggleExpanded} type="button">展开完整模块库</button>
      </> : <>
        <button className="mb-2 flex w-full items-center justify-between rounded-md bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600" onClick={onToggleExpanded} type="button"><span>完整模块库</span><span>收起</span></button>
        {groups.map(({ category, items }) => <section className="border-b border-stone-200 py-1" key={category}>
          <button className="flex w-full items-center justify-between py-2 text-left" onClick={() => onToggleCategory(category)} type="button"><span><span className="block text-xs font-semibold text-slate-900">{interiorModuleCategoryLabels[category]}</span><span className="mt-0.5 block text-[10px] text-stone-500">{items.length} 项 · 已放置 {floorCounts[category] ?? 0}</span></span><span className="text-stone-400">{openCategories[category] ? "−" : "+"}</span></button>
          {openCategories[category] ? <div>{items.map((item) => <ModuleRow item={item} key={item.id} onAdd={onAdd} />)}</div> : null}
        </section>)}
      </>}
    </div>
  </aside>;
}
