import Link from "next/link";
import { defaultSpaceData } from "@/data/mock-space";
import type { FloorId } from "@/types/space";

const revision = "whole-house-lighting-cabinet-yard-integration-v1-20260812";
const dataSha = "8790920b120e37b5fdd7515479caf1c28e478bd78823621434b14acfa18be831";

type Gate = "OWNER_DECISION" | "FIELD_REMEASURE" | "VENDOR" | "PROFESSIONAL";

type FloorBrief = {
  floorId: FloorId;
  title: string;
  overview: string;
  focus: string;
  gates: Array<{ gate: Gate; text: string }>;
  p0: string[];
  visual: string;
};

const floorBriefs: FloorBrief[] = [
  {
    floorId: "B2",
    title: "聚会 / 影音 / 湿吧",
    overview: "保留桌、柱、门弧与湿吧的真实关系，视觉参考采用暖木、石材、深色金属和低眩光分层。",
    focus: "聚会大板桌—湿吧—通道宽景",
    visual: "Top 机位优先看桌、湿吧、柱与门弧的同框关系。",
    gates: [
      { gate: "OWNER_DECISION", text: "桌—湿吧方案与聚会座位取舍仍需业主确认。" },
      { gate: "FIELD_REMEASURE", text: "桌湿吧 250/900、活动椅柱约 -10、门弧与 1100 通道需复尺。" },
      { gate: "PROFESSIONAL", text: "湿吧给排水、设备与防水节点需专业签认。" }
    ],
    p0: ["桌—湿吧差异值", "椅—柱净距", "门弧 / 1100 通道", "湿吧 MEP" ]
  },
  {
    floorId: "B1",
    title: "活动 / 客房 / 洗衣",
    overview: "保持明亮暖白矿物、浅橡木和深色五金的统一视觉，不用装饰方向掩盖客房、栏杆与洗衣机电问题。",
    focus: "客房、楼梯栏杆、洗衣房宽景",
    visual: "Top 机位优先看客房入口、楼梯栏杆和洗衣设备关系。",
    gates: [
      { gate: "FIELD_REMEASURE", text: "客房、栏杆、开放洞口和 9 个 orphan 3D 对象需复尺。" },
      { gate: "PROFESSIONAL", text: "消防、栏杆、洗衣给排水与 HVAC 需专业签认。" }
    ],
    p0: ["客房与楼梯关系", "栏杆 / 门弧", "洗衣 MEP", "orphan 3D 证据" ]
  },
  {
    floorId: "1F",
    title: "客餐厨 / 干吧 / 冰箱",
    overview: "用户已选择 A/A/A 候选约束：连续整墙干吧、墙边隐藏插座+预留空管、冰箱 placeholder；它们仍是参考层，不是施工尺寸。",
    focus: "餐桌座位—沙发—干吧—冰箱宽景",
    visual: "Top 机位优先看餐桌、人位、电视侧、干吧和冰箱开合的同框关系。",
    gates: [
      { gate: "OWNER_DECISION", text: "A/A/A 已登记，不重复询问；餐桌保留 4–6 / 8–10 双态，1800mm 仍是研究目标。" },
      { gate: "FIELD_REMEASURE", text: "桌椅、人位、门弧、900 通道、电视完成面和干吧深度需复尺。" },
      { gate: "VENDOR", text: "冰箱 SKU、铰链、开合、散热与柜体接口需厂家资料；placeholder 不得进 BOM。" },
      { gate: "PROFESSIONAL", text: "D-05 供电及隐藏插座/预留空管方案需精装封闭前签认。" }
    ],
    p0: ["341 / 900 餐桌—沙发", "座位与门弧", "连续整墙干吧", "冰箱 SKU / 铰链 / 散热", "D-05 供电" ]
  },
  {
    floorId: "2F",
    title: "主卧 / 儿童房 / 衣帽间 / 卫浴",
    overview: "采用安静酒店感、暖洞石、茶玻柜与暖木皮；逐灯可操作，但真实受光、曝光、溢光和性能仍单列 Stage B。",
    focus: "衣帽间、主卫、阳台、儿童房宽景",
    visual: "Top 机位优先看衣帽桥柜、主卫防水边界、阳台门槛和儿童房灯光体验。",
    gates: [
      { gate: "OWNER_DECISION", text: "升降桌—桥柜的方案取舍仍需业主拍板；不以视觉稿代替动态包络。" },
      { gate: "FIELD_REMEASURE", text: "桥柜全行程、阳台门槛、通道与房间归属需复尺。" },
      { gate: "PROFESSIONAL", text: "主卫防水、给排水、阳台排水与门窗节点需专业签认。" }
    ],
    p0: ["升降桌—桥柜", "主卫 MEP / 防水", "阳台门槛与排水", "roomId / camera 归属" ]
  },
  {
    floorId: "YARD",
    title: "南院生活 / 北院入户",
    overview: "YARD 已切换到 canonical 南北院统一模型：真实边界、铺装、绿化、围栏、户外家具与 1F 建筑关系均从同一工作区读取。",
    focus: "北院入口 / 户外厨房、南院生活、总院宽景",
    visual: "Top 机位为全院、北院、南院；南北院保持差异，不做镜像。",
    gates: [
      { gate: "FIELD_REMEASURE", text: "排水坡向、地漏、完成面、户外柜检修与开合需现场复核。" },
      { gate: "VENDOR", text: "BBQ 燃料、排烟、窗洞、防风与户外柜耐候资料需厂家确认。" },
      { gate: "PROFESSIONAL", text: "防水、电气/RCD、消防间距及老人儿童宠物安全需专业签认。" }
    ],
    p0: ["排水 / 找坡 / 地漏", "户外柜检修", "BBQ 燃料 / 排烟", "防水电气 / RCD", "门净宽与家庭安全" ]
  }
];

const gateLabels: Record<Gate, { label: string; tone: string }> = {
  OWNER_DECISION: { label: "OWNER DECISION", tone: "bg-amber-100 text-amber-900" },
  FIELD_REMEASURE: { label: "FIELD REMEASURE", tone: "bg-blue-100 text-blue-900" },
  VENDOR: { label: "VENDOR", tone: "bg-violet-100 text-violet-900" },
  PROFESSIONAL: { label: "PROFESSIONAL", tone: "bg-emerald-100 text-emerald-900" }
};

function cameraNames(floorId: FloorId) {
  return defaultSpaceData.workspace.cameraViews
    .filter((view) => view.floor === floorId)
    .slice(0, 5)
    .map((view) => view.name)
    .join(" · ") || "待补机位";
}

function previewRoute(floorId: FloorId) {
  if (floorId === "YARD") return "/yard-preview";
  if (floorId === "2F") return "/2f-preview";
  if (floorId === "B1") return "/b1-preview";
  if (floorId === "B2") return "/b2-preview";
  return "/";
}

export function OwnerCommunicationModel() {
  return (
    <main className="min-h-screen bg-[#f2eee7] text-[#2c312d]" data-owner-communication-model="r1">
      <header className="border-b border-[#d9d0c3] bg-[#28312d] px-5 py-7 text-[#f7f2e8] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#d4bf93]">OWNER COMMUNICATION MODEL · R1</p>
              <h1 className="mt-3 text-3xl font-medium tracking-[-0.04em] sm:text-5xl">全屋业主沟通模型</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70">用于审美、空间关系和下一步取舍沟通。它不是施工图、BOM、下单单或 IFC 真值；任何 UNKNOWN / BLOCKED 都必须保持可见。</p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto"><Link className="min-h-11 flex-1 whitespace-normal rounded-full border border-white/20 px-4 py-2 text-center text-sm leading-5 text-white/80 hover:border-white/50 hover:text-white sm:flex-none" href="/preview">返回统一预览入口</Link><Link className="min-h-11 flex-1 whitespace-normal rounded-full bg-[#d4bf93] px-4 py-2 text-center text-sm font-bold leading-5 text-[#28312d] sm:flex-none" href="/owner-communication/decisions">打开决策包 R1</Link></div>
          </div>
          <div className="mt-7 grid gap-3 text-xs sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4"><div className="text-white/50">REVISION</div><div className="mt-2 break-all font-mono text-[11px]">{revision}</div></div>
            <div className="rounded-2xl bg-white/10 p-4"><div className="text-white/50">CANONICAL DATA SHA</div><div className="mt-2 break-all font-mono text-[11px]">{dataSha}</div></div>
            <div className="rounded-2xl bg-amber-300 p-4 text-stone-950"><div className="font-black">REFERENCE / NOT FOR CONSTRUCTION</div><div className="mt-2 leading-5">估算、比例和视觉方向不能升级为施工尺寸或采购事实。</div></div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["REFERENCE", "视觉候选、材质方向和宽景构图"],
            ["ESTIMATED", "仅记录比例 / range / confidence / uncertainty"],
            ["UNKNOWN", "没有现场、厂家或专业证据不补猜"],
            ["BLOCKED", "P0 未闭合时冻结对应深化，不被 fancy 遮蔽"]
          ].map(([title, text]) => <div className="rounded-2xl border border-[#ddd4c7] bg-[#faf8f3] p-4" key={title}><div className="text-[11px] font-black tracking-[0.18em] text-[#806648]">{title}</div><p className="mt-2 text-xs leading-5 text-[#68665e]">{text}</p></div>)}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {floorBriefs.map((brief) => {
            const floor = defaultSpaceData.workspace.floors.find((item) => item.id === brief.floorId);
            const furnitureCount = defaultSpaceData.workspace.furniture.filter((item) => item.floorId === brief.floorId).length;
            return <article className="overflow-hidden rounded-[1.75rem] border border-[#ddd4c7] bg-[#fbfaf6] shadow-[0_15px_42px_rgba(80,65,48,0.07)]" data-floor-brief={brief.floorId} key={brief.floorId}>
              <div className="border-b border-[#e6ded2] bg-[#f0e9df] px-5 py-5 sm:px-7">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#806648]">{brief.floorId === "YARD" ? "YARD" : `FLOOR ${brief.floorId}`}</div><h2 className="mt-1 text-2xl font-medium">{brief.title}</h2></div><span className="rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-bold">{floor?.label ?? brief.floorId} · {furnitureCount} objects</span></div>
                <p className="mt-3 text-sm leading-6 text-[#5f625d]">{brief.overview}</p>
              </div>
              <div className="grid gap-5 p-5 sm:p-7">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><div className="text-[11px] font-black tracking-[0.16em] text-[#806648]">重点房间宽景</div><p className="mt-2 text-sm font-semibold leading-6">{brief.focus}</p><p className="mt-2 text-xs leading-5 text-[#77736c]">{brief.visual}</p></div>
                  <div><div className="text-[11px] font-black tracking-[0.16em] text-[#806648]">当前 Top 机位</div><p className="mt-2 text-xs leading-5 text-[#77736c]">{cameraNames(brief.floorId)}</p><Link className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl border border-[#d8c7b2] bg-[#fffaf2] px-3 py-2 text-center text-xs font-bold leading-5 text-[#705b43] transition hover:border-[#a98d69] sm:inline-flex sm:w-auto" href={previewRoute(brief.floorId)}>打开同源实时入口 →</Link></div>
                </div>
                <div><div className="text-[11px] font-black tracking-[0.16em] text-[#806648]">P0 可见性 / 待决事项</div><div className="mt-3 flex flex-wrap gap-2">{brief.p0.map((item) => <span className="rounded-full border border-[#d9cbb8] bg-[#f8f1e7] px-3 py-1.5 text-xs font-semibold" key={item}>{item}</span>)}</div></div>
                <div className="space-y-2">{brief.gates.map((item) => { const gate = gateLabels[item.gate]; return <div className="flex items-start gap-3 rounded-xl border border-[#e6ded2] bg-white/70 p-3" key={item.text}><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${gate.tone}`}>{gate.label}</span><p className="text-xs leading-5 text-[#62645f]">{item.text}</p></div>; })}</div>
              </div>
            </article>;
          })}
        </div>
      </section>
      <footer className="border-t border-[#d9d0c3] bg-[#ebe3d7] px-5 py-6 text-xs leading-6 text-[#68645c] sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl"><strong>下一阶段：</strong>决策登记 → 现场/CAD/厂家/专业补证 → 参数化 objectId + datum + dimensionRole 导入 → PRE-IFC DXF/DWG + 可搜索 PDF 同源审计。任何 unknown 不进入施工闭合尺寸、BOM、IFC 或采购。</div></footer>
    </main>
  );
}
