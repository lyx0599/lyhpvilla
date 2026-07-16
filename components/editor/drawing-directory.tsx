import { useMemo, useState } from "react";
import {
  drawingWorkspaceCategories,
  drawingWorkspaces,
  type DrawingWorkspaceCategoryId,
  type DrawingWorkspaceConfig
} from "@/lib/drawing-workspaces";
import type { Floor, FloorId } from "@/types/space";

type Props = {
  open: boolean;
  activeWorkspaceId: string;
  floors: Floor[];
  selectedFloorId: FloorId;
  onClose: () => void;
  onSelect: (workspace: DrawingWorkspaceConfig) => void;
};

export function DrawingDirectory({ open, activeWorkspaceId, floors, selectedFloorId, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DrawingWorkspaceCategoryId | "all">("all");
  const [floorFilter, setFloorFilter] = useState<FloorId | "all">("all");
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return drawingWorkspaces.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (normalizedQuery && ![item.name, item.shortName, ...(item.keywords ?? [])].some((value) => value.toLowerCase().includes(normalizedQuery))) return false;
      return true;
    });
  }, [category, query]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/25 p-0 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-label="图纸目录" aria-modal="true" className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden bg-[#fbfbf9] shadow-2xl sm:h-[min(88vh,820px)] sm:rounded-2xl" role="dialog">
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-400">Drawing directory</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">图纸目录</h2>
            <p className="mt-1 text-xs text-stone-500">选择楼层与专业图纸，工作空间会自动切换工具、图层和检查规则。</p>
          </div>
          <button aria-label="关闭图纸目录" className="grid size-9 place-items-center rounded-lg text-xl text-stone-500 hover:bg-stone-100" onClick={onClose} type="button">×</button>
        </header>
        <div className="grid min-h-0 flex-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 overflow-y-auto border-r border-stone-200 bg-white p-3 md:block">
            <button className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold ${category === "all" ? "bg-slate-900 text-white" : "text-stone-600 hover:bg-stone-100"}`} onClick={() => setCategory("all")} type="button"><span>全部图纸</span><span>{drawingWorkspaces.length}</span></button>
            {drawingWorkspaceCategories.map((item) => {
              const count = drawingWorkspaces.filter((workspace) => workspace.category === item.id).length;
              return <button key={item.id} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold ${category === item.id ? "bg-slate-100 text-slate-950" : "text-stone-600 hover:bg-stone-50"}`} onClick={() => setCategory(item.id)} type="button"><span className="text-[10px] text-stone-400">{item.index}</span><span className="min-w-0 flex-1 truncate">{item.name}</span><span className="text-stone-400">{count}</span></button>;
            })}
          </aside>
          <div className="flex min-h-0 flex-col">
            <div className="grid gap-2 border-b border-stone-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_150px_170px] sm:px-5">
              <label className="flex h-10 items-center gap-2 rounded-lg bg-stone-100 px-3">
                <span className="text-stone-400">⌕</span>
                <input autoFocus className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400" placeholder="搜索图纸名称" value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <select className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 outline-none md:hidden" value={category} onChange={(event) => setCategory(event.target.value as DrawingWorkspaceCategoryId | "all")}><option value="all">全部专业</option>{drawingWorkspaceCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <select className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 outline-none" value={floorFilter} onChange={(event) => setFloorFilter(event.target.value as FloorId | "all")}><option value="all">全部楼层</option>{floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.label}</option>)}</select>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
              {drawingWorkspaceCategories.filter((group) => category === "all" || category === group.id).map((group) => {
                const items = filtered.filter((item) => item.category === group.id);
                if (!items.length) return null;
                return <section key={group.id} className="mb-6 last:mb-0"><div className="mb-2 flex items-center gap-3"><span className="text-[10px] font-semibold text-stone-400">{group.index}</span><h3 className="text-xs font-semibold text-slate-900">{group.name}</h3><span className="h-px flex-1 bg-stone-200" /></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => {
                  const active = item.id === activeWorkspaceId;
                  const floorLabel = floorFilter === "all" ? floors.find((floor) => floor.id === selectedFloorId)?.label : floors.find((floor) => floor.id === floorFilter)?.label;
                  return <button key={item.id} className={`group rounded-xl border px-3.5 py-3 text-left transition ${active ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-stone-200 bg-white hover:border-stone-400 hover:shadow-sm"}`} onClick={() => onSelect(item)} type="button"><span className="flex items-center justify-between gap-2"><span className={`text-sm font-semibold ${active ? "text-white" : "text-slate-900"}`}>{item.name}</span>{active ? <span className="text-[10px] font-semibold text-white/70">当前</span> : <span className="text-stone-300 transition group-hover:text-stone-500">→</span>}</span><span className={`mt-2 block line-clamp-2 text-[11px] leading-4 ${active ? "text-white/65" : "text-stone-500"}`}>{floorLabel} · {item.instruction}</span></button>;
                })}</div></section>;
              })}
              {!filtered.length ? <div className="grid min-h-64 place-items-center text-sm text-stone-400">没有匹配的图纸</div> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
