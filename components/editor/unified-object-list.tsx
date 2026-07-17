import { useEffect, useMemo, useRef, useState } from "react";
import type { FloorId, VerificationStatus } from "@/types/space";

export type UnifiedObjectListItem = {
  id: string;
  name: string;
  code?: string;
  floorId: FloorId;
  roomId?: string;
  roomName?: string;
  type: string;
  typeLabel: string;
  dimensions?: string;
  hidden?: boolean;
  locked?: boolean;
  conflict?: boolean;
  verificationStatus?: VerificationStatus;
};

type Props = {
  items: UnifiedObjectListItem[];
  selectedObjectId: string;
  selectedFloorId: FloorId;
  onSelect: (item: UnifiedObjectListItem) => void;
  lightRuntimeState?: Record<string, { on: boolean; brightness: number }>;
  onToggleLight?: (item: UnifiedObjectListItem) => void;
};

type FilterKey = "all" | "unconfirmed" | "conflict" | "unbound" | "hidden";
type GroupKey = "room" | "type" | "floor";

const filterLabels: Record<FilterKey, string> = {
  all: "全部",
  unconfirmed: "待确认",
  conflict: "冲突",
  unbound: "未绑定房间",
  hidden: "已隐藏"
};

export function UnifiedObjectList({ items, selectedObjectId, selectedFloorId, onSelect, lightRuntimeState = {}, onToggleLight }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [groupBy, setGroupBy] = useState<GroupKey>("room");
  const [floorScope, setFloorScope] = useState<"current" | "all">("current");
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedObjectId]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("zh-CN");
    return items.filter((item) => {
      if (floorScope === "current" && item.floorId !== selectedFloorId) return false;
      if (keyword && !`${item.name} ${item.code ?? ""} ${item.id} ${item.roomName ?? ""} ${item.typeLabel}`.toLocaleLowerCase("zh-CN").includes(keyword)) return false;
      if (filter === "unconfirmed" && (!item.verificationStatus || ["confirmed", "site-measured"].includes(item.verificationStatus))) return false;
      if (filter === "conflict" && !item.conflict) return false;
      if (filter === "unbound" && item.roomId) return false;
      if (filter === "hidden" && !item.hidden) return false;
      return true;
    });
  }, [filter, floorScope, items, query, selectedFloorId]);

  const groups = useMemo(() => {
    const map = new Map<string, UnifiedObjectListItem[]>();
    filteredItems.forEach((item) => {
      const key = groupBy === "floor"
        ? item.floorId
        : groupBy === "type"
          ? item.typeLabel
          : `${item.floorId} · ${item.roomName ?? "未绑定房间"}`;
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return Array.from(map.entries());
  }, [filteredItems, groupBy]);

  return (
    <section className="flex h-full min-h-0 flex-col bg-white" data-testid="unified-object-list">
      <div className="border-b border-stone-200 p-3">
        <div className="flex items-center justify-between gap-2">
          <div><p className="text-xs font-semibold text-slate-900">对象列表</p><p className="mt-0.5 text-[10px] text-stone-400">{filteredItems.length} / {items.length} 个对象</p></div>
          <select aria-label="对象分组" className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-stone-600" value={groupBy} onChange={(event) => setGroupBy(event.target.value as GroupKey)}>
            <option value="room">按房间</option><option value="type">按类型</option><option value="floor">按楼层</option>
          </select>
        </div>
        <div className="mt-2 grid grid-cols-2 rounded-lg bg-stone-100 p-1">
          <button className={`rounded-md px-2 py-1 text-[10px] font-semibold ${floorScope === "current" ? "bg-white text-slate-900 shadow-sm" : "text-stone-500"}`} onClick={() => setFloorScope("current")} type="button">当前楼层</button>
          <button className={`rounded-md px-2 py-1 text-[10px] font-semibold ${floorScope === "all" ? "bg-white text-slate-900 shadow-sm" : "text-stone-500"}`} onClick={() => setFloorScope("all")} type="button">全部楼层</button>
        </div>
        <input aria-label="搜索对象" className="mt-2 h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-xs outline-none focus:border-slate-400 focus:bg-white" placeholder="搜索名称或编号" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {(Object.keys(filterLabels) as FilterKey[]).map((key) => <button key={key} className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${filter === key ? "bg-slate-900 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`} onClick={() => setFilter(key)} type="button">{filterLabels[key]}</button>)}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {groups.map(([group, groupItems]) => <section className="mb-3" key={group}>
          <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-2 py-1 text-[10px] font-semibold text-stone-400 backdrop-blur"><span>{group}</span><span>{groupItems.length}</span></div>
          <div className="space-y-1">{groupItems.map((item) => {
            const selected = item.id === selectedObjectId;
            const lightState = item.type === "light" ? lightRuntimeState[item.id] : undefined;
            return <div key={item.id} className={`flex w-full items-center gap-1 rounded-lg px-1 py-1 transition ${selected ? "bg-blue-50 ring-1 ring-blue-200" : item.floorId === selectedFloorId ? "hover:bg-stone-100" : "opacity-65 hover:bg-stone-100"}`}>
              <button ref={selected ? selectedRef : undefined} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left" onClick={() => onSelect(item)} type="button">
                <span className={`grid size-7 shrink-0 place-items-center rounded-md text-[10px] font-bold ${item.hidden ? "bg-stone-200 text-stone-500" : selected ? "bg-blue-600 text-white" : "bg-stone-100 text-stone-500"}`}>{item.typeLabel.slice(0, 1)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-800">{item.name}</span><span className="mt-0.5 block truncate text-[10px] text-stone-400">{item.code ?? item.id}{item.dimensions ? ` · ${item.dimensions}` : ""}</span></span>
                <span className="flex shrink-0 gap-1 text-[9px] text-stone-400">{item.locked ? <span title="已锁定">锁</span> : null}{item.hidden ? <span title="已隐藏">隐</span> : null}{item.conflict ? <span className="text-red-600" title="存在冲突">!</span> : null}</span>
              </button>
              {item.type === "light" && onToggleLight ? <button
                aria-label={`${item.name} 灯光开关`}
                aria-pressed={lightState?.on ?? false}
                className={`mr-1 min-w-10 rounded-full px-2 py-1 text-[10px] font-black ${lightState?.on ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-500"}`}
                onClick={() => onToggleLight(item)}
                title={lightState ? `当前${lightState.on ? "开启" : "关闭"} · ${Math.round(lightState.brightness)}%` : "切换这盏灯"}
                type="button"
              >{lightState?.on ? "开" : "关"}</button> : null}
            </div>;
          })}</div>
        </section>)}
        {filteredItems.length === 0 ? <p className="py-10 text-center text-xs text-stone-400">没有符合条件的对象</p> : null}
      </div>
    </section>
  );
}
