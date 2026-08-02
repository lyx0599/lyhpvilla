import type { Floor, FloorId, ViewMode } from "@/types/space";

type Props = {
  projectName: string;
  floors: Floor[];
  selectedFloorId: FloorId;
  workspaceName: string;
  saveLabel: string;
  saveTone: "saved" | "saving" | "dirty" | "error";
  canUndo: boolean;
  canRedo: boolean;
  viewMode: ViewMode;
  displayMode: "edit" | "presentation";
  onSelectFloor: (floorId: FloorId) => void;
  onOpenDirectory: () => void;
  onSelectViewMode: (mode: ViewMode) => void;
  onSelectDisplayMode: (mode: "edit" | "presentation") => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onToggleMore: () => void;
};

export function TopNavigation({
  projectName,
  floors,
  selectedFloorId,
  workspaceName,
  saveLabel,
  saveTone,
  canUndo,
  canRedo,
  viewMode,
  displayMode,
  onSelectFloor,
  onOpenDirectory,
  onSelectViewMode,
  onSelectDisplayMode,
  onUndo,
  onRedo,
  onExport,
  onToggleMore,
}: Props) {
  const toneClass = saveTone === "error" ? "text-red-700" : saveTone === "dirty" ? "text-amber-700" : saveTone === "saving" ? "text-blue-700" : "text-emerald-700";
  return (
    <header className="relative z-[70] flex min-w-0 items-center gap-2 border-b border-stone-300/75 bg-[#fbfaf7] px-3 sm:px-4">
      <div className="hidden min-w-0 shrink-0 items-center gap-2 lg:flex">
        <span className="grid size-8 place-items-center rounded-md bg-slate-900 text-xs font-black tracking-tight text-white">LY</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{projectName}</p>
          <p className="text-[10px] font-medium text-stone-400">室内设计项目</p>
        </div>
      </div>
      <span className="mx-1 hidden h-5 w-px bg-stone-200 lg:block" />
      <label className="min-w-0 shrink-0">
        <span className="sr-only">楼层</span>
        <select className="h-8 max-w-28 rounded-md border border-stone-200 bg-white px-2 text-xs font-semibold text-stone-700 outline-none hover:border-stone-300 sm:max-w-36" value={selectedFloorId} onChange={(event) => onSelectFloor(event.target.value as FloorId)}>
          {floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.label}</option>)}
        </select>
      </label>
      <button className="flex h-8 min-w-0 max-w-[16rem] items-center gap-2 rounded-md border border-transparent px-2 text-left text-xs font-semibold text-slate-800 transition hover:border-stone-200 hover:bg-white" onClick={onOpenDirectory} title="切换工作区" type="button">
        <span className="hidden text-stone-400 sm:inline">当前工作区</span>
        <span className="truncate">{workspaceName}</span>
        <span className="text-stone-400">⌄</span>
      </button>
      <div className="hidden shrink-0 items-center border-l border-stone-200 pl-2 md:flex">
        <div className="flex h-8 items-center rounded-md bg-stone-200/65 p-0.5" aria-label="2D 与 3D 视图">
          {(["2d", "3d"] as ViewMode[]).map((mode) => <button key={mode} aria-pressed={viewMode === mode} className={`h-7 rounded px-2.5 text-[11px] font-semibold ${viewMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-stone-500 hover:text-slate-800"}`} onClick={() => onSelectViewMode(mode)} type="button">{mode.toUpperCase()}</button>)}
        </div>
        <div className="ml-1 flex h-8 items-center rounded-md bg-stone-200/65 p-0.5" aria-label="编辑与展示模式">
          {(["edit", "presentation"] as const).map((mode) => <button key={mode} aria-pressed={displayMode === mode} className={`h-7 rounded px-2.5 text-[11px] font-semibold ${displayMode === mode ? "bg-slate-900 text-white" : "text-stone-500 hover:text-slate-800"}`} onClick={() => onSelectDisplayMode(mode)} type="button">{mode === "edit" ? "编辑" : "展示"}</button>)}
        </div>
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-1">
        <div className="hidden items-center lg:flex">
          <button aria-label="撤销" className="grid size-8 place-items-center rounded-md text-base text-stone-600 hover:bg-stone-100 disabled:text-stone-300" disabled={!canUndo} onClick={onUndo} title="撤销 (⌘Z)" type="button">↶</button>
          <button aria-label="重做" className="grid size-8 place-items-center rounded-md text-base text-stone-600 hover:bg-stone-100 disabled:text-stone-300" disabled={!canRedo} onClick={onRedo} title="重做 (⌘⇧Z)" type="button">↷</button>
        </div>
        <span className={`hidden min-w-16 items-center gap-1.5 px-1.5 text-[11px] font-semibold sm:flex ${toneClass}`} title={saveLabel}>
          <span className={`size-1.5 rounded-full ${saveTone === "error" ? "bg-red-500" : saveTone === "dirty" ? "bg-amber-500" : saveTone === "saving" ? "bg-blue-500 animate-pulse" : "bg-emerald-500"}`} />
          <span className="truncate">{saveLabel}</span>
        </span>
        <button className="hidden h-8 rounded-md border border-stone-200 bg-white px-2.5 text-[11px] font-semibold text-stone-700 hover:border-stone-300 md:block" onClick={onExport} type="button">导出</button>
        <button aria-label="更多" className="grid size-8 place-items-center rounded-md text-lg font-semibold text-stone-600 hover:bg-stone-100" onClick={onToggleMore} type="button">···</button>
      </div>
    </header>
  );
}
