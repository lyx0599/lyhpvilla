import { drawingWorkspaces, type DrawingWorkspaceConfig } from "@/lib/drawing-workspaces";
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
  if (!open) return null;
  const floor = floors.find((item) => item.id === selectedFloorId);
  return <div className="fixed inset-0 z-[120] bg-slate-950/25 p-0 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section aria-label="工作区选择" aria-modal="true" className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden bg-[#fbfbf9] shadow-2xl sm:h-auto sm:max-h-[88vh] sm:rounded-2xl" role="dialog">
      <header className="flex items-start justify-between gap-4 border-b border-stone-200 bg-white px-5 py-4 sm:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-400">Design workspaces</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">选择工作区</h2><p className="mt-1 text-xs text-stone-500">{floor?.label} · 只有五个设计入口；视图和输出图纸不再混在这里。</p></div><button aria-label="关闭工作区选择" className="grid size-9 place-items-center rounded-lg text-xl text-stone-500 hover:bg-stone-100" onClick={onClose} type="button">×</button></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><div className="grid gap-3 sm:grid-cols-2">{drawingWorkspaces.map((workspace, index) => { const active = workspace.id === activeWorkspaceId; return <button key={workspace.id} className={`rounded-2xl border p-4 text-left transition ${active ? "border-slate-900 bg-slate-900 text-white shadow-md" : "border-stone-200 bg-white hover:border-stone-400 hover:shadow-sm"}`} onClick={() => onSelect(workspace)} type="button"><span className="flex items-start gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${active ? "bg-white/15 text-white" : "bg-stone-100 text-stone-500"}`}>0{index + 1}</span><span className="min-w-0 flex-1"><span className={`block text-base font-semibold ${active ? "text-white" : "text-slate-900"}`}>{workspace.name}</span><span className={`mt-1 block text-xs leading-5 ${active ? "text-white/70" : "text-stone-500"}`}>{workspace.description}</span>{workspace.tabs?.length ? <span className={`mt-3 flex flex-wrap gap-1 text-[10px] ${active ? "text-white/75" : "text-stone-500"}`}>{workspace.tabs.map((tab) => <span key={tab.id} className={`rounded-full px-2 py-1 ${active ? "bg-white/10" : "bg-stone-100"}`}>{tab.name}</span>)}</span> : null}</span>{active ? <span className="text-[10px] font-semibold text-white/70">当前</span> : <span className="text-stone-300">→</span>}</span></button>; })}</div><div className="mt-5 rounded-xl border border-dashed border-stone-300 bg-white/60 p-4 text-xs leading-5 text-stone-500"><strong className="text-slate-800">概念说明：</strong>“只看楼梯、只看墙体、3D 漫游”属于视图；“检查、图纸包、导出”是独立管理功能；只有满足对象、标注、图例与导出条件的内容才进入正式图纸包。</div></div>
    </section>
  </div>;
}
