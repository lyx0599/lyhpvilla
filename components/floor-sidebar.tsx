import type { Floor, FloorId } from "@/types/space";

type Props = {
  floors: Floor[];
  selectedFloorId: FloorId;
  onSelectFloor: (floorId: FloorId) => void;
};

export function FloorSidebar({ floors, selectedFloorId, onSelectFloor }: Props) {
  return (
    <aside className="hidden border-r border-stone-200/80 bg-linen/80 p-5 lg:block">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Floors</p>
        <h2 className="mt-2 text-lg font-semibold text-ink">楼层</h2>
      </div>
      <div className="space-y-2">
        {floors.map((floor) => {
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
    </aside>
  );
}
