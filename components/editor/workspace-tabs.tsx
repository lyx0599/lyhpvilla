import type { WorkspaceTabConfig, WorkspaceTabId } from "@/lib/drawing-workspaces";

type Props = {
  tabs?: WorkspaceTabConfig[];
  activeTabId?: WorkspaceTabId;
  onSelect: (tabId: WorkspaceTabId) => void;
};

export function WorkspaceTabs({ tabs, activeTabId, onSelect }: Props) {
  if (!tabs?.length) return null;
  return <div className="relative z-40 flex h-9 shrink-0 items-center gap-1 border-b border-stone-200/80 bg-[#fbfaf7] px-3 sm:px-4" aria-label="工作区专业分类">{tabs.map((tab) => <button key={tab.id} aria-pressed={activeTabId === tab.id} className={`rounded-md px-3 py-1 text-xs font-semibold transition ${activeTabId === tab.id ? "bg-slate-900 text-white" : "text-stone-500 hover:bg-stone-100 hover:text-slate-900"}`} onClick={() => onSelect(tab.id)} type="button">{tab.name}</button>)}</div>;
}
