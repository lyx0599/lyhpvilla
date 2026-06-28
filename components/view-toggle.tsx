import type { ViewMode } from "@/types/space";

type Props = {
  viewMode: ViewMode;
  onChange: (viewMode: ViewMode) => void;
};

export function ViewToggle({ viewMode, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 rounded-2xl bg-stone-100 p-1 text-sm font-semibold text-stone-500">
      {(["2d", "3d"] as const).map((mode) => (
        <button
          key={mode}
          className={`rounded-xl px-4 py-2 transition ${viewMode === mode ? "bg-white text-ink shadow-sm" : "hover:text-ink"}`}
          onClick={() => onChange(mode)}
          type="button"
        >
          {mode.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
