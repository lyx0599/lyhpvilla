import Link from "next/link";
import {
  decisionStatusLabels,
  ownerDecisionPackageR1,
  type DecisionStatus
} from "@/lib/owner-decision-package-r1";

const statusTone: Record<DecisionStatus, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-900",
  OWNER_DECISION_REQUIRED: "bg-amber-100 text-amber-900",
  FIELD_REMEASURE: "bg-blue-100 text-blue-900",
  VENDOR_CONFIRM: "bg-violet-100 text-violet-900",
  PROFESSIONAL_SIGNOFF: "bg-teal-100 text-teal-900",
  BLOCKED: "bg-rose-100 text-rose-900"
};

const floors = ["B2", "B1", "1F", "2F", "YARD"] as const;

export function OwnerDecisionPackageR1() {
  const { items } = ownerDecisionPackageR1;
  const ownerDecisionCount = items.filter((item) => item.status === "OWNER_DECISION_REQUIRED").length;
  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#2d322f]" data-owner-decision-package="r1">
      <header className="bg-[#28312d] px-5 py-8 text-[#f7f2e8] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#d4bf93]">OWNER DECISION PACKAGE · R1</p>
              <h1 className="mt-3 text-3xl font-medium tracking-[-0.04em] sm:text-5xl">业主决策包 R1</h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-white/70">把已确认输入、业主取舍、现场复尺、厂家资料、专业签认和冻结项分开登记。它是沟通/参考层，不是施工图、BOM、IFC、下单或发布放行。</p>
            </div>
            <div className="flex gap-2"><Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80" href="/owner-communication">返回业主沟通模型</Link><Link className="rounded-full bg-[#d4bf93] px-4 py-2 text-sm font-bold text-[#28312d]" href="/preview">统一入口</Link></div>
          </div>
          <div className="mt-7 grid gap-3 text-xs md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4"><div className="text-white/50">REVISION</div><div className="mt-2 break-all font-mono text-[11px]">{ownerDecisionPackageR1.revision}</div></div>
            <div className="rounded-2xl bg-white/10 p-4"><div className="text-white/50">CANONICAL DATA SHA</div><div className="mt-2 break-all font-mono text-[11px]">{ownerDecisionPackageR1.dataSha}</div></div>
            <div className="rounded-2xl bg-amber-300 p-4 text-stone-950"><div className="font-black">REFERENCE / NOT FOR CONSTRUCTION</div><div className="mt-2 leading-5">{ownerDecisionPackageR1.disclaimer}</div></div>
            <div className="rounded-2xl bg-white/10 p-4"><div className="text-white/50">OWNER QUESTIONS</div><div className="mt-2 text-2xl font-semibold">{ownerDecisionCount}</div><div className="text-white/60">其余事项不伪装成用户问题</div></div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="rounded-[1.75rem] border border-[#d8cdbd] bg-[#fbf8f2] p-5 shadow-sm sm:p-7" data-testid="confirmed-inputs">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-black tracking-[0.18em] text-[#806648]">LOCKED INPUTS</p><h2 className="mt-2 text-2xl font-medium">不重复询问的已登记决定</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-900">CONFIRMED</span></div>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">{ownerDecisionPackageR1.confirmedInputs.map((input) => <li className="rounded-xl border border-[#e6ded2] bg-white/70 p-3 text-sm leading-6" key={input}>{input}</li>)}</ul>
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-[#dfc88f] bg-[#fff8df] p-5 sm:p-7" data-testid="minimal-user-questions">
          <p className="text-[11px] font-black tracking-[0.18em] text-[#806648]">MINIMAL USER QUESTION SET</p>
          <h2 className="mt-2 text-2xl font-medium">真正需要业主拍板的 {ownerDecisionCount} 项</h2>
          <p className="mt-2 text-sm leading-6 text-[#676154]">复尺、厂家和专业签认项不在这里重复提问；它们保留在下面的证据门禁中。</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">{ownerDecisionPackageR1.minimalUserQuestions.map((question) => <article className="rounded-2xl border border-[#e3d4aa] bg-white/70 p-5" data-owner-question={question.id} key={question.id}><div className="font-mono text-[10px] text-[#806648]">{question.id}</div><h3 className="mt-2 text-lg font-semibold leading-7">{question.question}</h3><ul className="mt-3 space-y-2">{question.options.map((option) => <li className="rounded-lg bg-[#f7efd7] px-3 py-2 text-sm" key={option}>{option}</li>)}</ul></article>)}</div>
        </div>

        <div className="mt-8 space-y-6" data-testid="decision-register">
          {floors.map((floorId) => {
            const floorItems = items.filter((item) => item.floorId === floorId);
            return <section className="overflow-hidden rounded-[1.75rem] border border-[#ddd4c7] bg-[#fbfaf6]" data-decision-floor={floorId} key={floorId}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ded2] bg-[#f0e9df] px-5 py-5 sm:px-7"><div><p className="text-[11px] font-black tracking-[0.2em] text-[#806648]">{floorId === "YARD" ? "YARD" : `FLOOR ${floorId}`}</p><h2 className="mt-1 text-2xl font-medium">{floorId} 决策登记</h2></div><span className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-bold">{floorItems.length} records</span></div>
              <div className="divide-y divide-[#e6ded2]">{floorItems.map((item) => <article className="p-5 sm:p-7" data-decision-item={item.id} key={item.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-mono text-[10px] text-[#806648]">{item.id}</div><h3 className="mt-1 text-lg font-semibold">{item.title}</h3></div><span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${statusTone[item.status]}`}>{decisionStatusLabels[item.status]}</span></div><div className="mt-4 grid gap-4 text-sm lg:grid-cols-2"><div><div className="text-[10px] font-black tracking-[0.16em] text-[#806648]">OBJECT IDS</div><p className="mt-1 font-mono text-[11px] leading-5 text-[#555950]">{item.objectIds.join(" · ")}</p><div className="mt-3 text-[10px] font-black tracking-[0.16em] text-[#806648]">SOURCE PATHS</div><p className="mt-1 break-words text-xs leading-5 text-[#66675f]">{item.sourcePaths.join(" · ")}</p></div><div><div className="text-[10px] font-black tracking-[0.16em] text-[#806648]">IMPACT / LATEST MILESTONE</div><p className="mt-1 leading-6 text-[#555950]">{item.impact}</p><p className="mt-2 text-xs font-semibold leading-5 text-[#70634e]">{item.latestDecisionMilestone}</p><div className="mt-3 flex flex-wrap gap-2">{item.options.map((option) => <span className="rounded-full border border-[#d9cbb8] bg-[#f8f1e7] px-3 py-1.5 text-xs" key={option}>{option}</span>)}</div></div></div><div className="mt-4 rounded-xl border border-dashed border-[#d7c8b5] bg-[#f8f4ec] p-3 text-xs leading-5 text-[#68665e]"><strong>DEFAULT DEFERRED：</strong>{item.defaultDeferredMeaning}</div></article>)}</div>
            </section>;
          })}
        </div>
      </section>
      <footer className="border-t border-[#d9d0c3] bg-[#ebe3d7] px-5 py-6 text-xs leading-6 text-[#68645c] sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl"><strong>门禁：</strong>本包仅供业主沟通；下一步仍是现场/CAD/厂家/专业补证、参数化 objectId + datum + dimensionRole 导入和 PRE-IFC 同源 DXF/DWG + 可搜索 PDF。任何 UNKNOWN / BLOCKED 不进入施工闭合尺寸、BOM、IFC 或采购。</div></footer>
    </main>
  );
}
