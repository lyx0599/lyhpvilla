import Link from "next/link";
import { defaultSpaceData } from "@/data/mock-space";
import type { FloorId } from "@/types/space";

export const metadata = {
  title: "全屋设计预览 · 林屿湖畔",
  description: "林屿湖畔四层空间、南北院、固定机位、材质与灯光体系统一预览入口"
};

const floorCards: Array<{
  floorId: FloorId;
  eyebrow: string;
  title: string;
  summary: string;
  route: string;
  action: string;
  tone: string;
  usesDedicatedPreview: boolean;
}> = [
  {
    floorId: "B2",
    eyebrow: "地下二层",
    title: "聚会 · 影音 · 书房",
    summary: "现代悬浮双拼茶几、聚会大板桌与独立书房茶饮区，保留两根结构柱和完整动线。",
    route: "/b2-preview",
    action: "进入 B2 实时预览",
    tone: "from-[#4d514c] to-[#272b28]",
    usesDedicatedPreview: true
  },
  {
    floorId: "B1",
    eyebrow: "地下一层",
    title: "洗衣 · 临客 · 阅读",
    summary: "洗衣房、临时客房、开放收纳与休闲阅读区共存，开放洞口和楼梯结构按确认户型显示。",
    route: "/b1-preview",
    action: "进入 B1 实时预览",
    tone: "from-[#8b7255] to-[#4d4033]",
    usesDedicatedPreview: true
  },
  {
    floorId: "1F",
    eyebrow: "首层",
    title: "客厅 · 餐厨 · 日常",
    summary: "客餐厨与首层卧室的完整编辑模型，使用全屋统一材质、灯具家族与五类场景。",
    route: "/",
    action: "进入 1F 实时预览",
    tone: "from-[#bca884] to-[#7d6d52]",
    usesDedicatedPreview: false
  },
  {
    floorId: "2F",
    eyebrow: "二层",
    title: "主卧 · 家庭卧室 · 衣帽间",
    summary: "主卧、父母房、儿童房、双侧衣帽柜与两座独立封闭阳台，全部消费共享母体系。",
    route: "/2f-preview",
    action: "进入 2F 实时预览",
    tone: "from-[#d0c1a7] to-[#8d7c63]",
    usesDedicatedPreview: true
  },
  {
    floorId: "YARD",
    eyebrow: "首层外部空间",
    title: "南院生活 · 北院入户",
    summary: "锁定南北院边界、铺装、花境、围栏/屏风与 1F 建筑关系，直接查看统一庭院 2D 总览和 3D 机位。",
    route: "/yard-preview",
    action: "进入院子实时预览",
    tone: "from-[#78846e] to-[#3e5145]",
    usesDedicatedPreview: true
  }
];

const systemHighlights = [
  {
    index: "01",
    title: "统一材质",
    text: "暖象牙矿物墙、浅橡木、燕麦织物、深胡桃木、暖石材与深古铜统一使用 canonical PBR。"
  },
  {
    index: "02",
    title: "统一灯光",
    text: "日光、日常、活动、夜间、清洁五类场景覆盖四层与院子；默认复跑保留人工深化点位。"
  },
  {
    index: "03",
    title: "空间一致",
    text: "2D 与 3D 共用门洞和结构语义；开放洞口只切墙，不再误生成门框、门扇或轨道。"
  },
  {
    index: "04",
    title: "渲染预检",
    text: "相机、遮挡、材质、灯光和对象可见性在输出前统一检查，发现不一致会阻止错误渲染。"
  }
];

function FloorGlyph({ floorId }: { floorId: FloorId }) {
  const level = floorId === "B2" ? 0 : floorId === "B1" ? 1 : floorId === "1F" ? 2 : floorId === "2F" ? 3 : 4;
  return (
    <div aria-hidden className="flex h-20 w-20 flex-col-reverse gap-1.5 rounded-2xl border border-white/20 bg-black/10 p-4 shadow-inner backdrop-blur">
      {[0, 1, 2, 3, 4].map((item) => (
        <span
          className={`h-1.5 rounded-full transition ${item === level ? "bg-[#f4ead8] shadow-[0_0_14px_rgba(244,234,216,0.7)]" : "bg-white/20"}`}
          key={item}
        />
      ))}
    </div>
  );
}

export default function WholeHousePreviewPage() {
  const workspace = defaultSpaceData.workspace;
  const totalCameras = workspace.cameraViews.filter((item) => ["B2", "B1", "1F", "2F", "YARD"].includes(item.floor)).length;
  const sceneCount = new Set(
    workspace.lightingDesign.scenes
      .map((scene) => scene.id)
      .filter((id) => id.startsWith("SCENE-MWN-V1-") || id.startsWith("SCENE-WLC-V1-YARD-"))
  ).size;

  return (
    <main className="min-h-screen overflow-hidden bg-[#eeebe4] text-[#262b28]">
      <section className="relative isolate overflow-hidden border-b border-black/10 bg-[#1f2522] px-5 py-8 text-[#f7f2e8] sm:px-8 lg:px-12 lg:py-12">
        <div className="absolute -right-24 -top-36 -z-10 h-96 w-96 rounded-full bg-[#c9a96e]/20 blur-3xl" />
        <div className="absolute -bottom-44 left-1/4 -z-10 h-80 w-80 rounded-full bg-[#718274]/20 blur-3xl" />
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center justify-between gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c9b995]">Lin Yu Lakeside</p>
              <p className="mt-1 text-sm text-white/60">四层住宅与南北院设计模型</p>
            </div>
            <Link className="rounded-full border border-white/20 bg-white/5 px-4 py-2 font-medium text-white/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white" href="/">
              打开完整工作台
            </Link>
          </nav>

          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <Link className="rounded-full border border-[#d7c49d]/50 bg-[#d7c49d]/10 px-3 py-2 font-semibold text-[#e8d9ba] hover:bg-[#d7c49d]/20" href="/owner-communication">打开业主沟通模型 R1</Link>
            <span className="rounded-full border border-white/10 px-3 py-2 text-white/55">REFERENCE · 非施工 / 非下单</span>
          </div>

          <div className="mt-16 grid gap-10 lg:grid-cols-[1.45fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm font-medium tracking-[0.18em] text-[#c9b995]">发布代码版本 · 统一预览入口</p>
              <h1 className="mt-5 max-w-4xl text-4xl font-medium leading-[1.08] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                全屋空间、材质与灯光，<span className="text-[#d7c49d]">保持同一套逻辑。</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
                直接检查当前2D与3D模型，不使用脱离户型的高清渲染图。选择楼层后可进入实时模型与固定设计机位。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <div className="rounded-2xl bg-black/10 p-4">
                <p className="text-2xl font-medium">4+1</p>
                <p className="mt-1 text-xs text-white/50">室内 + 院子</p>
              </div>
              <div className="rounded-2xl bg-black/10 p-4">
                <p className="text-2xl font-medium">{totalCameras}</p>
                <p className="mt-1 text-xs text-white/50">固定机位</p>
              </div>
              <div className="rounded-2xl bg-black/10 p-4">
                <p className="text-2xl font-medium">{sceneCount}</p>
                <p className="mt-1 text-xs text-white/50">共享场景实例</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#887357]">Floor preview</p>
            <h2 className="mt-2 text-3xl font-medium tracking-[-0.03em]">选择楼层</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-black/50">预览页只加载模型所需资源；院子无需进入编辑器手动寻找，南院与北院沿用当前统一庭院数据。</p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {floorCards.map((card) => {
            const cameraCount = workspace.cameraViews.filter((item) => item.floor === card.floorId).length;
            const furnitureCount = workspace.furniture.filter((item) => item.floorId === card.floorId).length;
            return (
              <Link
                className="group relative min-h-72 overflow-hidden rounded-[2rem] border border-black/10 bg-[#f8f5ee] p-6 shadow-[0_18px_50px_rgba(63,54,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(63,54,42,0.14)] sm:p-8"
                href={card.route}
                key={card.floorId}
              >
                <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${card.tone} opacity-95`} />
                <div className="relative flex items-start justify-between gap-5 text-white">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">{card.eyebrow}</p>
                    <p className="mt-2 text-3xl font-medium">{card.floorId}</p>
                  </div>
                  <FloorGlyph floorId={card.floorId} />
                </div>
                <div className="relative mt-12">
                  <div className="flex flex-wrap gap-2 text-[11px] font-medium text-black/50">
                    <span className="rounded-full bg-black/[0.05] px-3 py-1.5">{cameraCount} 个机位</span>
                    <span className="rounded-full bg-black/[0.05] px-3 py-1.5">{furnitureCount} 件模型对象</span>
                    <span className="rounded-full bg-black/[0.05] px-3 py-1.5">实时预览</span>
                  </div>
                  <h3 className="mt-5 text-2xl font-medium tracking-[-0.025em]">{card.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-black/55">{card.summary}</p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#705c42]">
                    <span>{card.action}</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-y border-black/10 bg-[#ded8cc] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#79664c]">Shared system</p>
          <h2 className="mt-2 text-3xl font-medium tracking-[-0.03em]">本次统一改动</h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-3xl border border-black/10 bg-black/10 md:grid-cols-2 lg:grid-cols-4">
            {systemHighlights.map((item) => (
              <article className="bg-[#f0ece4] p-6 sm:p-7" key={item.index}>
                <p className="text-xs font-semibold tracking-[0.2em] text-[#9b845f]">{item.index}</p>
                <h3 className="mt-6 text-xl font-medium">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-black/55">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#1f2522] px-5 py-8 text-white/55 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>林屿湖畔 · 现代暖自然全屋设计体系</p>
          <div className="flex flex-wrap gap-4">
            <Link className="transition hover:text-white" href="/pbr-audit">材质审计</Link>
            <Link className="transition hover:text-white" href="/">完整工作台</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
