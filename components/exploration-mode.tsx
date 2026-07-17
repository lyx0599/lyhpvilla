"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Exploration3DView, type Shared3DSceneSettings } from "@/components/floor-3d-view";
import {
  buildExplorationCollisionWorld,
  createExplorationCabinetStates,
  createExplorationDoorStates,
  getExplorationSpaceName,
  reconcileExplorationCabinetStates,
  reconcileExplorationDoorStates,
  resolveExplorationSpawn,
  type ExplorationCabinetStates,
  type ExplorationDoorStates,
  type ExplorationLightingMode,
  type ExplorationPoint,
  type ExplorationViewMode
} from "@/lib/exploration-mode";
import type { DrawingItem, Floor, FloorId, Furniture, HouseStructure, StairLanding, StairOpening, StairSystem } from "@/types/space";

type ExplorationModeProps = {
  floors: Floor[];
  initialFloorId: FloorId;
  houseStructuresByFloor: Partial<Record<FloorId, HouseStructure>>;
  stairSystems: StairSystem[];
  stairLandings: StairLanding[];
  stairOpenings: StairOpening[];
  furniture: Furniture[];
  drawingItems: DrawingItem[];
  sceneSettings: Shared3DSceneSettings;
  onExit: () => void;
};

function sameDoorStateIds(left: ExplorationDoorStates, right: ExplorationDoorStates) {
  const leftIds = Object.keys(left);
  const rightIds = Object.keys(right);
  return leftIds.length === rightIds.length && leftIds.every((id) => Boolean(right[id]));
}

export function ExplorationMode({
  floors,
  initialFloorId,
  houseStructuresByFloor,
  stairSystems,
  stairLandings,
  stairOpenings,
  furniture,
  drawingItems,
  sceneSettings,
  onExit
}: ExplorationModeProps) {
  const initialAvailableFloorId = houseStructuresByFloor[initialFloorId]
    ? initialFloorId
    : floors.find((floor) => Boolean(houseStructuresByFloor[floor.id]))?.id ?? initialFloorId;
  const [activeFloorId, setActiveFloorId] = useState<FloorId>(initialAvailableFloorId);
  const [doorStates, setDoorStates] = useState<ExplorationDoorStates>(() => createExplorationDoorStates(houseStructuresByFloor));
  const [cabinetStates, setCabinetStates] = useState<ExplorationCabinetStates>(() => createExplorationCabinetStates(furniture));
  const [viewMode, setViewMode] = useState<ExplorationViewMode>("thirdPerson");
  const [lightingMode, setLightingMode] = useState<ExplorationLightingMode>("day");
  const [resetRequest, setResetRequest] = useState(0);
  const [position, setPosition] = useState<ExplorationPoint>({ x: 0, y: 0, z: 0 });
  const [walking, setWalking] = useState(false);
  const [nearbyDoorId, setNearbyDoorId] = useState<string | null>(null);
  const [nearbyCabinetId, setNearbyCabinetId] = useState<string | null>(null);
  const [pointerLocked, setPointerLocked] = useState(false);

  const activeFloor = floors.find((floor) => floor.id === activeFloorId) ?? floors[0];
  const activeStructure = houseStructuresByFloor[activeFloorId]
    ?? houseStructuresByFloor[activeFloor?.id]
    ?? Object.values(houseStructuresByFloor).find(Boolean);
  const activeFurniture = useMemo(
    () => furniture.filter((item) => item.floorId === activeFloorId),
    [activeFloorId, furniture]
  );
  const activeDrawingItems = useMemo(
    () => drawingItems.filter((item) => item.floorId === activeFloorId),
    [activeFloorId, drawingItems]
  );
  const doorOpenSignature = Object.entries(doorStates)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([doorId, state]) => `${doorId}:${state.open ? 1 : 0}`)
    .join("|");
  const collisionDoorStates = useMemo<ExplorationDoorStates>(() => Object.fromEntries(
    doorOpenSignature.split("|").filter(Boolean).map((entry) => {
      const separator = entry.lastIndexOf(":");
      const doorId = entry.slice(0, separator);
      const open = entry.slice(separator + 1) === "1";
      return [doorId, { open, currentAngle: open ? 1 : 0 }];
    })
  ), [doorOpenSignature]);
  const collisionWorld = useMemo(() => activeStructure ? buildExplorationCollisionWorld({
    structure: activeStructure,
    furniture: activeFurniture,
    doorStates: collisionDoorStates
  }) : null, [activeFurniture, activeStructure, collisionDoorStates]);
  const spawnPosition = useMemo(() => activeStructure && collisionWorld
    ? resolveExplorationSpawn(activeStructure, collisionWorld)
    : { x: 0, y: 0, z: 0 }, [activeStructure, collisionWorld]);
  const roomName = activeStructure ? getExplorationSpaceName(activeStructure, position) : "场景加载中";
  const nearbyDoor = activeStructure?.doors.find((door) => door.id === nearbyDoorId) ?? null;
  const nearbyDoorOpen = nearbyDoorId ? Boolean(doorStates[nearbyDoorId]?.open) : false;
  const nearbyCabinet = activeFurniture.find((item) => item.id === nearbyCabinetId) ?? null;
  const nearbyCabinetOpen = nearbyCabinetId ? Boolean(cabinetStates[nearbyCabinetId]?.open) : false;

  useEffect(() => {
    setDoorStates((current) => {
      const next = reconcileExplorationDoorStates(current, houseStructuresByFloor);
      if (sameDoorStateIds(current, next) && Object.keys(next).every((id) => next[id] === current[id])) return current;
      return next;
    });
  }, [houseStructuresByFloor]);

  useEffect(() => {
    setCabinetStates((current) => {
      const next = reconcileExplorationCabinetStates(current, furniture);
      const currentIds = Object.keys(current);
      const nextIds = Object.keys(next);
      if (currentIds.length === nextIds.length && nextIds.every((id) => next[id] === current[id])) return current;
      return next;
    });
  }, [furniture]);

  useEffect(() => {
    if (activeStructure) return;
    const fallbackFloorId = floors.find((floor) => Boolean(houseStructuresByFloor[floor.id]))?.id;
    if (fallbackFloorId) setActiveFloorId(fallbackFloorId);
  }, [activeStructure, floors, houseStructuresByFloor]);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const animateDoors = (now: number) => {
      const delta = Math.min(0.05, Math.max(0, (now - previous) / 1000));
      previous = now;
      setDoorStates((current) => {
        let changed = false;
        const next = { ...current };
        Object.entries(current).forEach(([doorId, state]) => {
          const target = state.open ? 1 : 0;
          const currentAngle = Math.abs(target - state.currentAngle) < 0.005
            ? target
            : state.currentAngle + Math.sign(target - state.currentAngle) * Math.min(Math.abs(target - state.currentAngle), delta * 2.8);
          if (currentAngle !== state.currentAngle) {
            changed = true;
            next[doorId] = { ...state, currentAngle };
          }
        });
        return changed ? next : current;
      });
      setCabinetStates((current) => {
        let changed = false;
        const next = { ...current };
        Object.entries(current).forEach(([cabinetId, state]) => {
          const target = state.open ? 1 : 0;
          const currentAmount = Math.abs(target - state.currentAmount) < 0.005
            ? target
            : state.currentAmount + Math.sign(target - state.currentAmount) * Math.min(Math.abs(target - state.currentAmount), delta * 2.15);
          if (currentAmount !== state.currentAmount) {
            changed = true;
            next[cabinetId] = { ...state, currentAmount };
          }
        });
        return changed ? next : current;
      });
      frame = window.requestAnimationFrame(animateDoors);
    };
    frame = window.requestAnimationFrame(animateDoors);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleDoor = useCallback((doorId: string) => {
    setDoorStates((current) => {
      const state = current[doorId] ?? { open: false, currentAngle: 0 };
      return { ...current, [doorId]: { ...state, open: !state.open } };
    });
  }, []);
  const toggleCabinet = useCallback((cabinetId: string) => {
    setCabinetStates((current) => {
      const state = current[cabinetId] ?? { open: false, currentAmount: 0 };
      return { ...current, [cabinetId]: { ...state, open: !state.open } };
    });
  }, []);
  const toggleView = useCallback(() => {
    setViewMode((current) => current === "thirdPerson" ? "firstPerson" : "thirdPerson");
  }, []);
  const handlePositionChange = useCallback((nextPosition: ExplorationPoint, nextWalking: boolean) => {
    setPosition(nextPosition);
    setWalking(nextWalking);
  }, []);

  if (!activeFloor || !activeStructure || !collisionWorld) {
    return (
      <main className="grid h-[100dvh] place-items-center bg-stone-950 text-sm font-semibold text-white">
        当前项目没有可探索的 3D 楼层。
        <button className="mt-4 rounded-full bg-white px-4 py-2 text-stone-900" onClick={onExit} type="button">返回编辑器</button>
      </main>
    );
  }

  return (
    <main
      className="relative h-[100dvh] overflow-hidden bg-stone-950 text-white"
      data-editor-mode="exploration"
      data-read-only="true"
      data-testid="exploration-mode"
    >
      <Exploration3DView
        floor={activeFloor}
        houseStructure={activeStructure}
        houseStructuresByFloor={houseStructuresByFloor}
        stairSystems={stairSystems}
        stairLandings={stairLandings}
        stairOpenings={stairOpenings}
        furniture={activeFurniture}
        allFurniture={furniture}
        drawingItems={activeDrawingItems}
        allDrawingItems={drawingItems}
        sceneSettings={sceneSettings}
        collisionWorld={collisionWorld}
        spawnPosition={spawnPosition}
        doorStates={doorStates}
        cabinetStates={cabinetStates}
        viewMode={viewMode}
        lightingMode={lightingMode}
        resetRequest={resetRequest}
        onToggleDoor={toggleDoor}
        onToggleCabinet={toggleCabinet}
        onToggleView={toggleView}
        onExit={onExit}
        onFloorTransition={setActiveFloorId}
        onPositionChange={handlePositionChange}
        onNearbyDoorChange={setNearbyDoorId}
        onNearbyCabinetChange={setNearbyCabinetId}
        onPointerLockChange={setPointerLocked}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-4 sm:p-5">
        <div className="rounded-2xl border border-white/20 bg-stone-950/72 px-4 py-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-400" />探索模式 · 严格只读
          </div>
          <div className="mt-1.5 text-sm font-black">{activeFloor.id === "YARD" ? "院子" : activeFloor.id} · {roomName}</div>
          <div className="mt-1 text-[11px] text-white/55">{walking ? "正在行走" : "陪你一起看看这个家"}</div>
        </div>
        <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
          <button className="rounded-full border border-white/20 bg-stone-950/72 px-3 py-2 text-xs font-bold shadow-xl backdrop-blur-xl hover:bg-stone-900" onClick={() => setLightingMode((current) => current === "day" ? "night" : "day")} type="button">
            {lightingMode === "day" ? "切到夜间" : "切到白天"}
          </button>
          <button className="rounded-full border border-white/20 bg-stone-950/72 px-3 py-2 text-xs font-bold shadow-xl backdrop-blur-xl hover:bg-stone-900" onClick={toggleView} type="button">
            {viewMode === "thirdPerson" ? "第一人称" : "第三人称"}
          </button>
          <button className="rounded-full border border-white/20 bg-stone-950/72 px-3 py-2 text-xs font-bold shadow-xl backdrop-blur-xl hover:bg-stone-900" onClick={() => setResetRequest((request) => request + 1)} type="button">重置位置</button>
          <button className="rounded-full bg-white px-4 py-2 text-xs font-black text-stone-900 shadow-xl hover:bg-stone-100" onClick={onExit} type="button">退出探索</button>
        </div>
      </header>

      {(nearbyCabinet || nearbyDoor) && (
        <button
          className="absolute left-1/2 top-[58%] z-20 -translate-x-1/2 rounded-full border border-white/25 bg-stone-950/78 px-4 py-2 text-sm font-black shadow-2xl backdrop-blur-xl hover:bg-stone-900"
          onClick={() => nearbyCabinet ? toggleCabinet(nearbyCabinet.id) : nearbyDoor && toggleDoor(nearbyDoor.id)}
          type="button"
        >
          {nearbyCabinet
            ? `E · ${nearbyCabinetOpen ? "关柜门" : "开柜门"} · ${nearbyCabinet.name}`
            : `E · ${nearbyDoorOpen ? "关门" : "开门"} · ${nearbyDoor?.name ?? "门"}`}
        </button>
      )}

      {viewMode === "firstPerson" && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center" aria-hidden="true">
          <span className="size-1.5 rounded-full border border-stone-950/55 bg-white/90 shadow-[0_0_0_2px_rgba(255,255,255,0.22)]" />
        </div>
      )}

      {!pointerLocked && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-950/58 px-4 py-2 text-xs font-bold text-white/80 backdrop-blur">
          {viewMode === "firstPerson" ? "点击画面后自由环视，可抬头和低头" : "点击画面后用鼠标转向"}
        </div>
      )}

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-4 sm:p-5">
        <div className="flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border border-white/15 bg-stone-950/70 px-4 py-3 text-[11px] font-bold text-white/75 shadow-2xl backdrop-blur-xl">
          <span>WASD / 方向键移动</span>
          <span>{viewMode === "firstPerson" ? "鼠标自由环视" : "鼠标转向"}</span>
          <span>E 开关房门 / 柜门</span>
          <span>V 切换视角</span>
          <span>R 重置</span>
          <span>Esc 退出</span>
        </div>
      </footer>
    </main>
  );
}
