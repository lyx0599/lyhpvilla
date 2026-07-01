import type { Floor, FloorId } from "@/types/space";
import { useState } from "react";

type Props = {
  floors: Floor[];
  selectedFloorId: FloorId;
  onSelectFloor: (floorId: FloorId) => void;
  onFocusYard: (yard: "north" | "south") => void;
  onNaturalCommand: (command: string) => void;
};

export function FloorSidebar({ floors, selectedFloorId, onSelectFloor, onFocusYard, onNaturalCommand }: Props) {
  const [command, setCommand] = useState("");
  const visibleFloors = floors.filter((floor) => floor.id !== "YARD");

  function submitCommand() {
    const text = command.trim();
    if (!text) return;
    onNaturalCommand(text);
    setCommand("");
  }

  return (
    <aside className="border-b border-stone-200/80 bg-linen/80 p-5 lg:border-b-0 lg:border-r">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Floors</p>
        <h2 className="mt-2 text-lg font-semibold text-ink">楼层</h2>
      </div>
      <div className="space-y-2">
        {visibleFloors.map((floor) => {
          const isActive = floor.id === selectedFloorId;
          return (
            <button
              key={floor.id}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                isActive
                  ? "border-clay bg-white text-ink shadow-sm"
                  : "border-transparent bg-white/40 text-stone-500 hover:border-stone-200 hover:bg-white/70"
              }`}
              onClick={() => onSelectFloor(floor.id)}
              type="button"
            >
              <span className="block text-base font-semibold">{floor.label}</span>
              <span className="mt-1 block text-xs">{floor.subtitle}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-5 border-t border-stone-200/80 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Yard</p>
        <h3 className="mt-1 text-sm font-semibold text-ink">庭院</h3>
        <div className="mt-3 space-y-2">
          <button className="w-full rounded-2xl border border-transparent bg-white/40 px-4 py-3 text-left text-stone-500 transition hover:border-stone-200 hover:bg-white/70" onClick={() => onFocusYard("north")} type="button">
            <span className="block text-base font-semibold">北院</span>
            <span className="mt-1 block text-xs">入户庭院 · 2m</span>
          </button>
          <button className="w-full rounded-2xl border border-transparent bg-white/40 px-4 py-3 text-left text-stone-500 transition hover:border-stone-200 hover:bg-white/70" onClick={() => onFocusYard("south")} type="button">
            <span className="block text-base font-semibold">南院</span>
            <span className="mt-1 block text-xs">生活庭院 · 4m</span>
          </button>
        </div>
      </div>
      <div className="mt-5 border-t border-stone-200/80 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Command</p>
        <h3 className="mt-1 text-sm font-semibold text-ink">自然语言操作</h3>
        <textarea
          className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-stone-200 bg-white/80 px-3 py-2 text-sm text-ink outline-none focus:border-clay"
          placeholder="试试：添加一个沙发&#10;删除餐桌"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submitCommand();
          }}
        />
        <button className="mt-2 w-full rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-clay" onClick={submitCommand} type="button">
          执行
        </button>
        <p className="mt-2 text-xs leading-5 text-stone-400">先支持增减常用家具，后续再扩展移动、旋转和改尺寸。</p>
      </div>
    </aside>
  );
}
