type Props = {
  toolLabel: string;
  selectionLabel: string;
  scale: number;
  instruction: string;
  developerMode: boolean;
  coordinateLabel?: string;
  onPreviousDrawing: () => void;
  onNextDrawing: () => void;
};

export function BottomStatusBar({ toolLabel, selectionLabel, scale, instruction, developerMode, coordinateLabel, onPreviousDrawing, onNextDrawing }: Props) {
  return <footer className="relative z-50 flex min-w-0 items-center gap-3 border-t border-stone-200/85 bg-white px-2.5 text-[10px] font-medium text-stone-500 sm:px-4"><span className="shrink-0 font-semibold text-slate-700">{toolLabel}</span><span className="hidden h-3 w-px bg-stone-200 sm:block" /><span className="min-w-0 flex-1 truncate">{instruction}</span><span className="hidden max-w-40 truncate md:block">{selectionLabel}</span><span className="hidden tabular-nums sm:block">{Math.round(scale * 100)}%</span>{developerMode && coordinateLabel ? <span className="hidden tabular-nums text-stone-400 lg:block">{coordinateLabel}</span> : null}<div className="flex shrink-0 items-center"><button className="grid size-6 place-items-center rounded hover:bg-stone-100" onClick={onPreviousDrawing} title="上一个工作区" type="button">‹</button><button className="grid size-6 place-items-center rounded hover:bg-stone-100" onClick={onNextDrawing} title="下一个工作区" type="button">›</button></div></footer>;
}
