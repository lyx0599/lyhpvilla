"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Floor3DView } from "@/components/floor-3d-view";
import { defaultSpaceData } from "@/data/mock-space";
import type { FloorId, Furniture, HouseColumn } from "@/types/space";

const b2FloorId: FloorId = "B2";

function pointToRectDistance(
  point: { x: number; y: number },
  rect: { x: number; y: number },
  width: number,
  depth: number,
  rotationDeg: number
) {
  const angle = rotationDeg * Math.PI / 180;
  const dx = point.x - rect.x;
  const dy = point.y - rect.y;
  const localX = Math.abs(dx * Math.cos(angle) + dy * Math.sin(angle));
  const localY = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
  return Math.hypot(Math.max(localX - width / 2, 0), Math.max(localY - depth / 2, 0));
}

function furnitureClearance(column: HouseColumn, furniture: Furniture[], width: number, height: number) {
  return furniture
    .map((item) => {
      const center = {
        x: item.position.x / 100 * width,
        y: item.position.y / 100 * height
      };
      const edgeDistance = pointToRectDistance(
        column.center,
        center,
        item.dimensions.width * 10,
        item.dimensions.depth * 10,
        item.position.rotation ?? 0
      ) - column.radius;
      return { item, clearanceMm: Math.round(edgeDistance) };
    })
    .sort((a, b) => a.clearanceMm - b.clearanceMm);
}

export function B2Preview() {
  const searchParams = useSearchParams();
  const workspace = defaultSpaceData.workspace;
  const floor = defaultSpaceData.floors.find((item) => item.id === b2FloorId);
  const structure = workspace.houseStructuresByFloor[b2FloorId];
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [hoveredObjectId, setHoveredObjectId] = useState("");
  const [showObjectIds, setShowObjectIds] = useState(false);
  const requestedCameraView = useMemo(() => {
    const cameraId = searchParams.get("camera");
    const view = cameraId ? workspace.cameraViews.find((item) => item.id === cameraId && item.floor === b2FloorId) : null;
    return view ? { view, nonce: cameraId?.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0) ?? 1 } : null;
  }, [searchParams, workspace.cameraViews]);

  const b2Furniture = useMemo(
    () => workspace.furniture.filter((item) => item.floorId === b2FloorId),
    [workspace.furniture]
  );
  const columns = structure?.columns ?? [];
  const nearestFurniture = useMemo(() => {
    if (!structure) return [];
    return columns.map((column) => ({
      column,
      nearest: furnitureClearance(
        column,
        b2Furniture,
        structure.coordinateSystem.width,
        structure.coordinateSystem.height
      )[0]
    }));
  }, [b2Furniture, columns, structure]);

  if (!floor || !structure) {
    return <main className="grid min-h-screen place-items-center bg-[#f4f0e9] text-stone-700">B2 数据暂不可用</main>;
  }

  return (
    <main className="min-h-screen bg-[#efeae2] text-[#2d2925]">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d8d0c4] bg-[#f7f4ef] px-6 py-5 lg:px-10">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9b7653]">LYHP / B2 preview</p>
          <h1 className="text-2xl font-semibold tracking-tight">B2 柱体与家具关系预览</h1>
          <p className="mt-1 text-sm text-[#756c63]">样板间两根柱子 · 石材圆角材质 · 可旋转缩放 3D 场景</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[#d8d0c4] bg-white/70 px-3 py-2 text-xs text-[#756c63]">
          <span className="size-2 rounded-full bg-[#a78358]" />
          B2 当前共 {columns.length} 根柱子
        </div>
      </header>

      <div className="mx-auto grid max-w-[1680px] gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_330px] lg:p-7">
        <section className="relative min-h-[650px] overflow-hidden rounded-[26px] border border-[#d8d0c4] bg-[#e8e1d6] shadow-[0_20px_60px_rgba(86,67,48,0.12)] lg:min-h-[760px]">
          <div className="pointer-events-none absolute left-5 top-5 z-10 rounded-2xl border border-white/60 bg-[#f7f4ef]/85 px-3 py-2 text-xs text-[#665d55] shadow-sm backdrop-blur">
            <p className="font-semibold text-[#302b27]">B2 · 3D 预览</p>
            <p className="mt-1">拖动旋转 · 滚轮缩放 · 点击柱子查看对象</p>
          </div>
          <Floor3DView
            floor={floor}
            houseStructure={structure}
            houseStructuresByFloor={workspace.houseStructuresByFloor}
            stairSystems={workspace.stairSystems}
            stairLandings={workspace.stairLandings}
            stairOpenings={workspace.stairOpenings}
            furniture={b2Furniture}
            allFurniture={workspace.furniture}
            drawingItems={workspace.drawingItems.filter((item) => item.floorId === b2FloorId)}
            allDrawingItems={workspace.drawingItems}
            drawingSheetType="sitePlan"
            cameraViews={workspace.cameraViews}
            cameraViewRequest={requestedCameraView}
            roomTourViews={workspace.roomTourViews}
            lightingDesign={workspace.lightingDesign}
            selectedObjectId={selectedObjectId}
            selectedFurnitureId=""
            showObjectIds={showObjectIds}
            externalPresentationMode
            mobileQuality="high"
            onShowObjectIdsChange={setShowObjectIds}
            onSelectStructure={setSelectedObjectId}
            onSelectFurniture={(item) => setSelectedObjectId(item.id)}
            onSelectDrawingItem={setSelectedObjectId}
            onClearSelection={() => setSelectedObjectId("")}
            onSelectFloor={(floorId) => { if (floorId !== b2FloorId) setSelectedObjectId(floorId); }}
            onHoverObject={setHoveredObjectId}
            onClearHoverObject={(id) => setHoveredObjectId((current) => current === id ? "" : current)}
            onSelectCameraView={() => undefined}
            onLightingRuntimeStateChange={() => undefined}
          />
          {hoveredObjectId && (
            <div className="pointer-events-none absolute bottom-5 left-5 z-10 rounded-full border border-white/70 bg-[#2d2925]/85 px-3 py-2 text-xs text-white shadow-lg">
              当前指向：{hoveredObjectId}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-[22px] border border-[#d8d0c4] bg-[#f7f4ef] p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b7653]">Column check</p>
            <h2 className="mt-2 text-lg font-semibold">两根柱子都已进入 3D</h2>
            <p className="mt-2 text-sm leading-6 text-[#756c63]">新增柱体使用浅暖石材圆角效果，和样板间的成对柱体关系一致。</p>
            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-[#e2dbd1] bg-white/70 px-3 py-3 text-sm text-[#5f574f]">
              <input checked={showObjectIds} onChange={(event) => setShowObjectIds(event.target.checked)} type="checkbox" />
              显示对象编号
            </label>
          </section>

          <section className="rounded-[22px] border border-[#d8d0c4] bg-[#f7f4ef] p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">柱体清单</h2>
              <span className="text-xs text-[#9b7653]">B2</span>
            </div>
            <div className="space-y-3">
              {nearestFurniture.map(({ column, nearest }) => (
                <button
                  className={`w-full rounded-2xl border p-3 text-left transition ${selectedObjectId === column.id ? "border-[#9b7653] bg-[#f1e8dc]" : "border-[#e2dbd1] bg-white/65 hover:border-[#bfa98f]"}`}
                  key={column.id}
                  onClick={() => setSelectedObjectId(column.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold">{column.id}</span>
                    <span className="rounded-full bg-[#eadfD1] px-2 py-1 text-[10px] text-[#7f654a]">石材圆角</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#756c63]">{column.name.replace("（视频估算）", "")}</p>
                  <p className="mt-2 text-[11px] text-[#9a9086]">柱心 {column.center.x} / {column.center.y} · 半径 {column.radius}mm</p>
                  {nearest && <p className="mt-2 text-xs text-[#5f574f]">最近家具：{nearest.item.name.replace(/^B2 /, "")} · 净距约 {nearest.clearanceMm}mm</p>}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-[#cfc9bf] bg-[#e9eee5] p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#71806a]">Furniture status</p>
            <h2 className="mt-2 font-semibold text-[#3d4b3a]">入户与观影区已定稿</h2>
            <p className="mt-2 text-sm leading-6 text-[#61705e]">新增450mm薄型玄关衣帽柜；电视墙、100寸电视与3米沙发同步右移，圆茶几避开入户绕行动线。</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
