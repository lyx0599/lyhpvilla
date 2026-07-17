import type { DrawingReadiness } from "@/lib/output-drawings";

type Props = {
  drawings: DrawingReadiness[];
  errorCount: number;
  warningCount: number;
  onOpenLegacyPackage: () => void;
};

export function DrawingPackageManager({ drawings, errorCount, warningCount, onOpenLegacyPackage }: Props) {
  const readyCount = drawings.filter((drawing) => drawing.status === "ready").length;
  return <div>
    <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-lg font-semibold text-emerald-800">{readyCount}</p><p className="text-emerald-700">可导出</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-lg font-semibold text-amber-800">{drawings.length - readyCount}</p><p className="text-amber-700">未完成</p></div><div className="rounded-xl bg-stone-100 p-3"><p className="text-lg font-semibold text-slate-900">{errorCount} / {warningCount}</p><p className="text-stone-500">错误 / 警告</p></div></div>
    <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">{drawings.map((drawing) => <article key={drawing.id} className="rounded-xl border border-stone-200 bg-white p-3"><div className="flex items-start gap-3"><span className="rounded-md bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-500">{drawing.number}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">{drawing.name}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${drawing.status === "ready" ? "bg-emerald-50 text-emerald-700" : drawing.status === "incomplete" ? "bg-amber-50 text-amber-700" : "bg-stone-100 text-stone-500"}`}>{drawing.status === "ready" ? "可导出" : drawing.status === "incomplete" ? "未完成" : "草稿"}</span></div><p className="mt-1 text-[11px] text-stone-500">{drawing.objectCount} 个相关对象 · 错误 {errorCount} · 警告 {warningCount}</p><p className="mt-1 text-[10px] text-stone-400">最近更新：{drawing.updatedAt ? new Date(drawing.updatedAt).toLocaleString("zh-CN") : "暂无专业对象更新时间"} · 图例：{drawing.legendItems.join(" / ")}</p>{drawing.missing.length ? <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-4 text-amber-800">缺少：{drawing.missing.join("、")}</p> : <p className="mt-2 text-[11px] font-semibold text-emerald-700">对象、标注、图例和显示规则已满足。</p>}</div></div></article>)}</div>
    <button className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800" onClick={onOpenLegacyPackage} type="button">打开完整施工包与导出工具</button>
  </div>;
}
