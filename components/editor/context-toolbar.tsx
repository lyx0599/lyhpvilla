import type { DrawingWorkspaceConfig, DrawingWorkspaceTool } from "@/lib/drawing-workspaces";

type Props = {
  workspace: DrawingWorkspaceConfig;
  activeToolId: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  onSelectTool: (tool: DrawingWorkspaceTool) => void;
  onOpenObjects?: () => void;
  onOpenResources?: () => void;
};

export function ContextToolBar({ workspace, activeToolId, expanded, onToggleExpanded, onSelectTool, onOpenObjects, onOpenResources }: Props) {
  return (
    <div className={`flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden border border-stone-200 bg-[#fbfaf7] p-1 lg:h-full lg:max-h-none lg:border-0 lg:bg-transparent lg:py-1.5 ${expanded ? "w-44 lg:w-full" : "w-12 lg:w-full"}`}>
      <button aria-label={expanded ? "收起工具栏" : "展开工具栏"} className={`mb-1 flex h-9 items-center rounded-lg text-xs font-semibold text-stone-500 hover:bg-stone-100 ${expanded ? "justify-start gap-2 px-3" : "justify-center"}`} onClick={onToggleExpanded} title={expanded ? "收起工具栏" : "展开工具栏"} type="button">
        <span>{expanded ? "‹" : "›"}</span>{expanded ? <span>画布工具</span> : null}
      </button>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {workspace.tools.map((tool) => {
          const active = tool.id === activeToolId;
          return <button key={tool.id} aria-label={tool.label} className={`group flex min-h-10 w-full items-center rounded-lg text-left transition ${active ? "bg-slate-900 text-white" : "text-stone-600 hover:bg-stone-100 hover:text-slate-900"}`} onClick={() => onSelectTool(tool)} title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`} type="button"><span className="grid size-10 shrink-0 place-items-center text-sm font-bold">{tool.icon}</span>{expanded ? <><span className="min-w-0 flex-1 truncate pr-2 text-xs font-semibold">{tool.label}</span>{tool.shortcut ? <span className={`mr-2 rounded px-1 py-0.5 text-[9px] ${active ? "bg-white/15 text-white/75" : "bg-stone-200/70 text-stone-500"}`}>{tool.shortcut}</span> : null}</> : null}</button>;
        })}
      </div>
      <div className="mt-1 border-t border-stone-200 pt-1">
        {onOpenObjects ? <button aria-label="对象列表" className="flex h-10 w-full items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-slate-900" onClick={onOpenObjects} title="对象列表" type="button"><span className="grid size-10 shrink-0 place-items-center text-sm">◇</span>{expanded ? <span className="text-xs font-semibold">对象列表</span> : null}</button> : null}
        {onOpenResources ? <button aria-label="物品库" className="flex h-10 w-full items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-slate-900" onClick={onOpenResources} title="物品库" type="button"><span className="grid size-10 shrink-0 place-items-center text-sm">▦</span>{expanded ? <span className="text-xs font-semibold">物品库</span> : null}</button> : null}
        <button aria-label="切换工作区" className="flex h-10 w-full items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-slate-900" onClick={() => onSelectTool({ id: "directory", label: "工作区", icon: "▤", action: "more" })} title="工作区" type="button"><span className="grid size-10 shrink-0 place-items-center text-sm">▤</span>{expanded ? <span className="text-xs font-semibold">工作区</span> : null}</button>
      </div>
    </div>
  );
}
