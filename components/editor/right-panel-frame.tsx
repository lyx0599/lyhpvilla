export type EditorRightPanelKey = "properties" | "resources" | "validation" | "ai";

const panelMeta: Record<EditorRightPanelKey, { label: string; icon: string }> = {
  properties: { label: "属性", icon: "◇" },
  resources: { label: "资源", icon: "▤" },
  validation: { label: "检查", icon: "✓" },
  ai: { label: "AI", icon: "✦" }
};

type RailProps = {
  activePanel: EditorRightPanelKey | null;
  errorCount: number;
  onSelect: (panel: EditorRightPanelKey) => void;
};

export function RightPanelRail({ activePanel, errorCount, onSelect }: RailProps) {
  return <div className="flex border border-stone-200 bg-[#fbfaf7] p-1 lg:h-full lg:w-[72px] lg:flex-col lg:border-0 lg:px-1 lg:py-1.5">{(Object.keys(panelMeta) as EditorRightPanelKey[]).map((key) => {
    const meta = panelMeta[key];
    const active = key === activePanel;
    return <button key={key} aria-label={meta.label} className={`relative flex h-11 min-w-[60px] items-center justify-center gap-1 rounded-md px-1.5 text-[11px] font-semibold transition lg:w-full lg:flex-col ${active ? "bg-slate-900 text-white" : "text-stone-500 hover:bg-stone-100 hover:text-slate-900"}`} onClick={() => onSelect(key)} title={meta.label} type="button"><span className="grid size-4 shrink-0 place-items-center text-sm">{meta.icon}</span><span>{meta.label}</span>{key === "validation" && errorCount > 0 ? <span className="absolute right-0.5 top-0.5 grid size-3.5 place-items-center rounded-full bg-red-600 text-[8px] font-black text-white">{Math.min(9, errorCount)}</span> : null}</button>;
  })}</div>;
}

type FrameProps = {
  activePanel: EditorRightPanelKey;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  onSelect: (panel: EditorRightPanelKey) => void;
};

export function RightPanelFrame({ activePanel, title, children, onClose, onSelect }: FrameProps) {
  return <section className="flex h-full min-h-0 flex-col bg-[#fbfaf7]"><header className="flex h-12 shrink-0 items-center border-b border-stone-200 px-3"><nav className="grid min-w-0 flex-1 grid-cols-4 gap-1">{(Object.keys(panelMeta) as EditorRightPanelKey[]).map((key) => <button key={key} className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${activePanel === key ? "bg-slate-900 text-white" : "text-stone-500 hover:bg-stone-100"}`} onClick={() => onSelect(key)} type="button">{panelMeta[key].label}</button>)}</nav><button aria-label="关闭面板" className="ml-2 grid size-8 place-items-center rounded-md text-lg text-stone-400 hover:bg-stone-100" onClick={onClose} type="button">×</button></header>{title ? <div className="border-b border-stone-100 px-4 py-2.5"><p className="text-sm font-semibold text-slate-900">{title}</p></div> : null}<div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div></section>;
}
