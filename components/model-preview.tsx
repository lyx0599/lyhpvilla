"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Floor3DView } from "@/components/floor-3d-view";
import { defaultSpaceData } from "@/data/mock-space";
import { buildModelPreviewOverview, getModelPreviewCameras, getModelPreviewScene, modelPreviewCameraLabel, modelPreviewFloors, modelPreviewLabels, resolveModelPreviewFloor } from "@/lib/model-preview";
import type { Drawing3DWallMode } from "@/lib/drawing-3d-profiles";
import type { MobileQuality } from "@/types/space";

const noop = () => undefined;
const controlClass = "min-h-11 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#586349]";

export function ModelPreview() {
  const searchParams = useSearchParams();
  const floorId = resolveModelPreviewFloor(searchParams.get("floor"));
  const workspace = defaultSpaceData.workspace;
  const floor = defaultSpaceData.floors.find((item) => item.id === floorId)!;
  const [selection, setSelection] = useState({ floorId, id: searchParams.get("camera") ?? "overview", nonce: 0 });
  const [wallOverride, setWallOverride] = useState<Drawing3DWallMode | null>(null);
  const [quality, setQuality] = useState<MobileQuality>("balanced");
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 1000, height: 700 });
  const scene = useMemo(() => getModelPreviewScene(floorId, workspace.houseStructuresByFloor, workspace.furniture), [floorId, workspace]);
  const cameras = useMemo(() => getModelPreviewCameras(floorId, workspace.cameraViews), [floorId, workspace.cameraViews]);
  const selectedCameraId = selection.floorId === floorId ? selection.id : "overview";
  const authored = cameras.find((view) => view.id === selectedCameraId);
  const overview = useMemo(() => buildModelPreviewOverview(floorId, scene.structure, { ...viewport, topInset: 20, bottomInset: 20 }), [floorId, scene.structure, viewport]);
  const selectedView = authored ?? overview;
  const requestedCamera = useMemo(() => ({ view: selectedView, nonce: `${floorId}:${selectedView.id}:${selection.nonce}:${authored ? "fixed" : `${viewport.width}x${viewport.height}`}`.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0) }), [authored, floorId, selectedView, selection.nonce, viewport]);
  const drawingItems = useMemo(() => workspace.drawingItems.filter((item) => item.floorId === floorId || (floorId === "YARD" && item.floorId === "1F")), [floorId, workspace.drawingItems]);
  const wallMode = wallOverride ?? (authored ? "full" : "cutaway");

  useEffect(() => {
    const element = canvasAreaRef.current;
    if (!element) return;
    const update = () => {
      const bounds = element.getBoundingClientRect();
      const next = { width: Math.max(240, Math.round(bounds.width)), height: Math.max(240, Math.round(bounds.height)) };
      setViewport((current) => current.width === next.width && current.height === next.height ? current : next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSelection((current) => ({ floorId, id: searchParams.get("camera") ?? "overview", nonce: current.nonce + 1 }));
    setWallOverride(null);
  }, [floorId, searchParams]);

  const selectView = (id: string) => {
    setSelection((current) => ({ floorId, id, nonce: current.nonce + 1 }));
    setWallOverride(null);
  };

  return (
    <main className="flex min-h-dvh flex-col bg-[#f3efe7] text-[#32382f] lg:h-dvh lg:overflow-hidden" data-testid="model-preview" data-preview-floor={floorId}>
      <header className="shrink-0 border-b border-[#d9d5ca] bg-[#faf8f2] px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7c816e]">LIN YU LAKESIDE / LIVE MODEL</p>
            <h1 className="mt-1 text-xl font-medium tracking-tight">{modelPreviewLabels[floorId].title}</h1>
          </div>
          <Link href="/preview" className="shrink-0 rounded-full border border-[#d5d6ca] px-4 py-2.5 text-xs hover:bg-[#eeeee5]">全屋入口 ↗</Link>
        </div>
        <nav aria-label="切换预览区域" className="mt-3 flex gap-1.5 overflow-x-auto">
          {modelPreviewFloors.map((id) => <Link key={id} href={`/model-preview?floor=${id}`} aria-current={id === floorId ? "page" : undefined} className={`min-h-11 min-w-14 rounded-xl px-4 py-3 text-center text-sm font-semibold transition sm:min-w-20 ${id === floorId ? "bg-[#46563e] text-white" : "bg-[#eae9df] text-[#69705e] hover:bg-[#dedfd2]"}`}>{id === "YARD" ? "院子" : id}</Link>)}
        </nav>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_272px]">
        <section className="flex min-w-0 flex-col gap-2.5">
          <div className="flex shrink-0 flex-wrap items-center gap-2" aria-label="模型显示设置">
            <button type="button" onClick={() => selectView("overview")} className={`${controlClass} border-[#c5ccbc] bg-white`} data-testid="model-overview">↖ 全区总览</button>
            <div className="flex items-center rounded-xl border border-[#d1d3c6] bg-white p-0.5" role="group" aria-label="墙体显示">
              {([["cutaway", "剖切看布局"], ["full", "完整看空间"]] as const).map(([mode, label]) => <button key={mode} type="button" aria-pressed={wallMode === mode} onClick={() => setWallOverride(mode)} className={`min-h-10 rounded-lg px-3 text-xs ${wallMode === mode ? "bg-[#e2e7d8] font-semibold text-[#394630]" : "text-[#757a6d] hover:bg-stone-50"}`}>{label}</button>)}
            </div>
            <label className="ml-auto flex min-h-11 items-center gap-1.5 rounded-xl border border-[#d1d3c6] bg-white px-2.5 text-xs">
              <span className="text-[#757a6d]">画质</span>
              <select aria-label="模型画质" value={quality} onChange={(event) => setQuality(event.target.value as MobileQuality)} className="min-h-10 bg-transparent text-[#394630] outline-none">
                <option value="balanced">流畅</option><option value="high">精细</option>
              </select>
            </label>
          </div>
          <div ref={canvasAreaRef} className="relative h-[62svh] min-h-[420px] overflow-hidden rounded-[24px] border border-[#d6d3c7] bg-[#e7e0d5] lg:h-auto lg:min-h-0 lg:flex-1" data-testid="model-canvas-area">
            <Floor3DView
              floor={floor}
              houseStructure={scene.structure}
              houseStructuresByFloor={workspace.houseStructuresByFloor}
              stairSystems={workspace.stairSystems}
              stairLandings={workspace.stairLandings}
              stairOpenings={workspace.stairOpenings}
              furniture={scene.furniture}
              allFurniture={scene.furniture}
              drawingItems={drawingItems}
              allDrawingItems={drawingItems}
              drawingSheetType="sitePlan"
              cameraViews={workspace.cameraViews}
              cameraViewRequest={requestedCamera}
              roomTourViews={workspace.roomTourViews}
              lightingDesign={workspace.lightingDesign}
              selectedObjectId=""
              selectedFurnitureId=""
              showObjectIds={false}
              externalPresentationMode
              hidePresentationUi
              presentationWallDisplayMode={wallMode}
              cameraCollisionEnabledOverride={false}
              mobileQuality={quality}
              onShowObjectIdsChange={noop}
              onSelectStructure={noop}
              onSelectFurniture={noop}
              onSelectDrawingItem={noop}
              onHoverObject={noop}
              onClearHoverObject={noop}
            />
            <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-xl border border-white/60 bg-[#faf8f2]/90 px-3 py-2 text-xs text-[#4c5544] shadow-sm backdrop-blur" data-testid="model-active-view">{authored ? modelPreviewCameraLabel(authored) : "全区总览 · 可自由旋转"}</div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-[#777c70]">
            <p>拖动旋转 · 滚轮缩放 · 右键拖动平移 · 触屏双指缩放和平移</p>
            <button type="button" className="min-h-9 rounded-lg px-2 font-semibold text-[#46563e] hover:bg-[#e4e7dc]" onClick={() => setSelection((current) => ({ floorId, id: authored?.id ?? "overview", nonce: current.nonce + 1 }))}>恢复当前机位</button>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#d8d8cd] bg-[#faf8f2]">
          <div className="border-b border-[#e3e1d7] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#858c77]">SPACE & FURNITURE</p>
            <h2 className="mt-1 text-base font-semibold">{modelPreviewLabels[floorId].subtitle}</h2>
            <p className="mt-2 text-xs leading-5 text-[#818575]">选择机位看细节，随时回到总览。机位切换后仍可拖动观察。</p>
          </div>
          <nav aria-label="设计机位" className="grid gap-1.5 p-3 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-1 lg:overflow-y-auto lg:content-start">
            {cameras.map((view, index) => <button key={view.id} type="button" aria-pressed={authored?.id === view.id} onClick={() => selectView(view.id)} className={`flex min-h-14 items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${authored?.id === view.id ? "border-[#a8b39b] bg-[#e7ecdf] text-[#364c30]" : "border-transparent text-[#66705d] hover:border-[#d9ddcf] hover:bg-[#f0f1e8]"}`} data-model-camera={view.id}>
              <span className="pt-0.5 text-xs tabular-nums text-[#969f86]">{String(index + 1).padStart(2, "0")}</span><span className="text-xs leading-5">{modelPreviewCameraLabel(view)}</span>
            </button>)}
          </nav>
          <div className="shrink-0 border-t border-[#e3e1d7] px-4 py-3 text-[11px] leading-5 text-[#858575]">
            <p>当前模型 · 家具与空间方案讨论</p>
            <p>默认流畅预览；精细档拖动时降低采样，松手恢复。家具和材质不切换。</p>
            {floorId === "YARD" && <p className="mt-1">北院由 1F 室内进入。北院约 3m、南院约 6m 是讨论中的暂定进深，现有模型边界仍待同步；本轮先改善浏览与材质表现。</p>}
            <p>建筑尺寸待正式图纸校核。</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
