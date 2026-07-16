import type { ReactNode } from "react";

type Props = {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
};

export function EditorUtilityDialog({ title, eyebrow = "Project", description, children, onClose }: Props) {
  return <div className="fixed inset-0 z-[115] grid place-items-center bg-slate-950/25 p-3 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section aria-modal="true" className="flex max-h-[min(88dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/80 bg-white shadow-2xl" role="dialog"><header className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-200 px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">{eyebrow}</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{title}</h2>{description ? <p className="mt-1 text-xs leading-5 text-stone-500">{description}</p> : null}</div><button aria-label="关闭" className="grid size-9 shrink-0 place-items-center rounded-lg text-xl text-stone-400 hover:bg-stone-100" onClick={onClose} type="button">×</button></header><div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div></section></div>;
}
