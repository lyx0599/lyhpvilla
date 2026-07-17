export type EditorDialogKey = "views" | "layers" | "background" | "package" | "ledger" | "settings" | "shortcuts" | "help" | "developer" | null;

type Props = {
  open: boolean;
  developerMode: boolean;
  onClose: () => void;
  onImport: () => void;
  onExport: () => void;
  onOpen: (dialog: Exclude<EditorDialogKey, null>) => void;
};

export function MoreMenu({ open, developerMode, onClose, onImport, onExport, onOpen }: Props) {
  if (!open) return null;
  const itemClass = "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold text-stone-650 hover:bg-stone-100";
  return <div className="fixed inset-0 z-[90]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="absolute right-2 top-[52px] w-56 rounded-xl border border-stone-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.18)] sm:right-4"><button className={itemClass} onClick={() => { onImport(); onClose(); }} type="button"><span>导入方案</span><span className="text-stone-400">⇩</span></button><button className={itemClass} onClick={() => { onExport(); onClose(); }} type="button"><span>导出方案</span><span className="text-stone-400">⇧</span></button><div className="my-1 h-px bg-stone-200" />{([['views','视图设置'],['layers','图层'],['background','底图'],['package','图纸包'],['ledger','对象台账'],['settings','项目设置'],['shortcuts','快捷键'],['help','帮助']] as const).map(([key,label]) => <button key={key} className={itemClass} onClick={() => { onOpen(key); onClose(); }} type="button"><span>{label}</span><span className="text-stone-400">›</span></button>)}<div className="my-1 h-px bg-stone-200" /><button className={itemClass} onClick={() => { onOpen('developer'); onClose(); }} type="button"><span>开发者模式</span><span className={`rounded-full px-1.5 py-0.5 text-[9px] ${developerMode ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`}>{developerMode ? "开启" : "关闭"}</span></button></section></div>;
}
