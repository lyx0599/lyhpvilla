import type { Floor, FloorId, ViewMode } from "@/types/space";

type Props = {
  projectName: string;
  floors: Floor[];
  selectedFloorId: FloorId;
  drawingName: string;
  viewMode: ViewMode;
  saveLabel: string;
  saveTone: "saved" | "saving" | "dirty" | "error";
  canUndo: boolean;
  canRedo: boolean;
  moreOpen: boolean;
  onSelectFloor: (floorId: FloorId) => void;
  onOpenDirectory: () => void;
  onChangeView: (mode: ViewMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleMore: () => void;
};

export function TopNavigation({
  projectName,
  floors,
  selectedFloorId,
  drawingName,
  viewMode,
  saveLabel,
  saveTone,
  canUndo,
  canRedo,
  moreOpen,
  onSelectFloor,
  onOpenDirectory,
  onChangeView,
  onUndo,
  onRedo,
  onToggleMore
}: Props) {
  const toneClass = saveTone === "error" ? "text-red-700" : saveTone === "dirty" ? "text-amber-700" : saveTone === "saving" ? "text-blue-700" : "text-emerald-700";
  return (
    <header className="relative z-[70] flex min-w-0 items-center gap-2 border-b border-stone-200/85 bg-white/96 px-2.5 backdrop-blur sm:px-4">
      <div className="hidden min-w-0 shrink-0 items-center gap-2 lg:flex">
        <span className="grid size-8 place-items-center rounded-lg bg-slate-900 text-xs font-black tracking-tight text-white">LY</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{projectName}</p>
          <p className="text-[10px] font-medium text-stone-400">室内设计项目</p>
        </div>
      </div>
      <span className="mx-1 hidden h-5 w-px bg-stone-200 lg:block" />
      <label className="min-w-0 shrink-0">
        <span className="sr-only">楼层</span>
        <select className="h-9 max-w-28 rounded-lg border-0 bg-stone-100 px-2.5 text-xs font-semibold text-stone-700 outline-none hover:bg-stone-200 sm:max-w-36" value={selectedFloorId} onChange={(event) => onSelectFloor(event.target.value as FloorId)}>
          {floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.label}</option>)}
        </select>
      </label>
      <button className="flex h-9 min-w-0 max-w-[16rem] items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold text-slate-800 transition hover:bg-stone-100" onClick={onOpenDirectory} title="打开图纸目录" type="button">
        <span className="hidden text-stone-400 sm:inline">当前图纸</span>
        <span className="truncate">{drawingName}</span>
        <span className="text-stone-400">⌄</span>
      </button>
      <div className="ml-auto flex min-w-0 items-center gap-1">
        <div className="grid grid-cols-2 rounded-lg bg-stone-100 p-0.5 text-[11px] font-semibold">
          {(["2d", "3d"] as ViewMode[]).map((mode) => <button key={mode} className={`rounded-md px-2.5 py-1.5 transition ${viewMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-stone-500 hover:text-slate-900"}`} onClick={() => onChangeView(mode)} type="button">{mode.toUpperCase()}</button>)}
        </div>
        <span className="mx-1 hidden h-5 w-px bg-stone-200 sm:block" />
        <button aria-label="撤销" className="grid size-9 place-items-center rounded-lg text-base text-stone-600 hover:bg-stone-100 disabled:text-stone-300" disabled={!canUndo} onClick={onUndo} title="撤销 (⌘Z)" type="button">↶</button>
        <button aria-label="重做" className="grid size-9 place-items-center rounded-lg text-base text-stone-600 hover:bg-stone-100 disabled:text-stone-300" disabled={!canRedo} onClick={onRedo} title="重做 (⌘⇧Z)" type="button">↷</button>
        <span className={`hidden min-w-16 items-center gap-1.5 px-1.5 text-[11px] font-semibold sm:flex ${toneClass}`} title={saveLabel}>
          <span className={`size-1.5 rounded-full ${saveTone === "error" ? "bg-red-500" : saveTone === "dirty" ? "bg-amber-500" : saveTone === "saving" ? "bg-blue-500 animate-pulse" : "bg-emerald-500"}`} />
          <span className="truncate">{saveLabel}</span>
        </span>
        <button aria-expanded={moreOpen} aria-label="更多" className={`grid size-9 place-items-center rounded-lg text-lg font-semibold transition ${moreOpen ? "bg-slate-900 text-white" : "text-stone-600 hover:bg-stone-100"}`} onClick={onToggleMore} title="更多" type="button">•••</button>
      </div>
    </header>
  );
}
