"use client";

import type { Floor } from "@/types/space";

type ThreeDCoverProps = {
  floor: Floor;
  onEnter: () => void;
};

const floorBadges = ["B2", "B1", "1F", "2F"];

export function ThreeDCover({ floor, onEnter }: ThreeDCoverProps) {
  return (
    <button
      aria-label={`进入 ${floor.label} ${floor.subtitle} 的3D效果`}
      className="relative block h-full min-h-[560px] w-full overflow-hidden rounded-[1.75rem] border border-white/70 bg-slate-900 text-left shadow-inner outline-none transition focus-visible:ring-4 focus-visible:ring-clay/30"
      onClick={onEnter}
      type="button"
    >
      <img
        alt="林屿湖畔四层小楼3D封面渲染"
        className="absolute inset-0 h-full w-full object-cover"
        src="/renders/four-level-villa-3d-cover.png"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950/50" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/28 to-transparent" />

      <div className="pointer-events-none absolute left-4 top-4 z-10 w-[min(360px,calc(100%-2rem))] rounded-lg border border-white/70 bg-white/84 p-3 shadow-[0_18px_54px_rgba(15,23,42,0.18)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">LINYU LAKESIDE</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">林屿湖畔</h2>
        <p className="mt-1 text-sm font-semibold text-stone-500">{floor.label} · {floor.subtitle}</p>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 grid grid-cols-4 gap-2 text-xs font-semibold text-stone-700">
        {floorBadges.map((badge) => (
          <span key={badge} className="rounded-lg border border-white/70 bg-white/84 px-3 py-2 text-center shadow-sm backdrop-blur">
            {badge}
          </span>
        ))}
      </div>
      <span className="pointer-events-none absolute bottom-16 right-4 z-10 rounded-full border border-white/70 bg-white/88 px-4 py-2 text-xs font-semibold text-ink shadow-sm backdrop-blur">
        进入3D
      </span>
    </button>
  );
}
