"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Floor3DView } from "@/components/floor-3d-view";
import { defaultSpaceData } from "@/data/mock-space";
import { createUnifiedCourtyardModel } from "@/lib/courtyard-model";
import type { FixedCameraView, Floor, Furniture, HouseStructure, MmPoint } from "@/types/space";

const yardFloorId: Floor["id"] = "YARD";
const canonicalRevision = "whole-house-lighting-cabinet-yard-integration-v1-20260812";
const canonicalDataSha = "8790920b120e37b5fdd7515479caf1c28e478bd78823621434b14acfa18be831";

const yardTopFive = [
  { id: "view-yard-all", label: "全院总览", detail: "南北院与 1F 建筑接口" },
  { id: "view-yard-north", label: "北院厨房 / 储物", detail: "户外厨房、储物与花境" },
  { id: "view-yard-entry", label: "北院入户", detail: "院门、围栏与通行动线" },
  { id: "view-yard-south-living", label: "南院休闲", detail: "休闲平台、遮阳与植被层次" },
  { id: "view-yard-south", label: "南院洗衣 / 宠物", detail: "洗衣、晾晒、宠物与维护带" }
] as const;

function pointsToString(points: MmPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function outdoorColor(name: string) {
  if (/南院/.test(name)) return { fill: "#d9e3cf", stroke: "#70846a" };
  return { fill: "#dfe4d8", stroke: "#63735e" };
}

function surfaceColor(surface: HouseStructure["outdoorSurfaces"][number]) {
  if (surface.surfaceType === "planting") return "#b8c99f";
  if (surface.surfaceType === "path") return "#c7c0b3";
  return surface.material === "wood" ? "#c7a77f" : "#b8b3a8";
}

function YardPlanOverview({ structure, furniture }: { structure: HouseStructure; furniture: Furniture[] }) {
  const points = [
    ...structure.outdoors.flatMap((outdoor) => outdoor.polygon),
    ...structure.outdoorSurfaces.flatMap((surface) => surface.polygon),
    ...structure.walls.flatMap((wall) => wall.kind === "straight" ? [wall.start, wall.end] : []),
    ...structure.fences.flatMap((fence) => [fence.start, fence.end])
  ];
  const minX = Math.min(0, ...points.map((point) => point.x)) - 250;
  const maxX = Math.max(structure.coordinateSystem.width, ...points.map((point) => point.x)) + 250;
  const minY = Math.min(0, ...points.map((point) => point.y)) - 300;
  const maxY = Math.max(structure.coordinateSystem.height, ...points.map((point) => point.y)) + 300;
  const width = maxX - minX;
  const height = maxY - minY;
  const furniturePosition = (item: Furniture) => ({
    x: item.position.x / 100 * structure.coordinateSystem.width,
    y: item.position.y / 100 * structure.coordinateSystem.height
  });

  return (
    <div className="order-[3] overflow-hidden rounded-[2rem] border border-[#d7d0c4] bg-[#faf8f2] shadow-[0_18px_55px_rgba(75,64,48,0.08)] lg:order-3" data-yard-plan="overview">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e4ddd2] px-5 py-4 sm:px-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7c8a6b]">2D / unified courtyard truth</p>
          <h2 className="mt-1 text-xl font-semibold text-[#2f3730]">南北院总览 · 与 1F 建筑关系</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-[#6e756b]">
          <span className="rounded-full bg-[#dfe4d8] px-3 py-1.5">北院 · 入户</span>
          <span className="rounded-full bg-[#d9e3cf] px-3 py-1.5">南院 · 生活</span>
          <span className="rounded-full bg-[#ece7dd] px-3 py-1.5">深线 · 1F 建筑</span>
        </div>
      </div>
      <div className="p-3 sm:p-5">
        <svg aria-label="南北院与一层建筑二维总览" className="h-auto w-full rounded-2xl bg-[#edf0e8]" data-testid="yard-2d-overview" role="img" viewBox={`${minX} ${minY} ${width} ${height}`}>
          <rect fill="#eef1ea" height={height} width={width} x={minX} y={minY} />
          {structure.outdoors.map((outdoor) => {
            const color = outdoorColor(outdoor.name);
            return <polygon fill={color.fill} key={outdoor.id} points={pointsToString(outdoor.polygon)} stroke={color.stroke} strokeWidth="34" />;
          })}
          {structure.outdoorSurfaces.map((surface) => (
            <polygon fill={surfaceColor(surface)} fillOpacity="0.86" key={surface.id} points={pointsToString(surface.polygon)} stroke="#8b877c" strokeDasharray="70 45" strokeWidth="18" />
          ))}
          {structure.rooms.map((room) => (
            <polygon fill="#ebe5da" fillOpacity="0.2" key={room.id} points={pointsToString(room.boundary)} stroke="#69716d" strokeOpacity="0.28" strokeWidth="20" />
          ))}
          {structure.walls.filter((wall) => wall.kind === "straight").map((wall) => (
            <line key={wall.id} stroke="#4a514d" strokeWidth="70" x1={wall.start.x} x2={wall.end.x} y1={wall.start.y} y2={wall.end.y} />
          ))}
          {structure.fences.map((fence) => (
            <line key={fence.id} stroke="#607057" strokeDasharray="110 55" strokeWidth="42" x1={fence.start.x} x2={fence.end.x} y1={fence.start.y} y2={fence.end.y} />
          ))}
          {furniture.map((item) => {
            const position = furniturePosition(item);
            const isPlant = item.type === "plant" || item.moduleType === "plant";
            return <circle cx={position.x} cy={position.y} fill={isPlant ? "#6f8962" : "#8e6d4c"} key={item.id} r={isPlant ? 105 : 72} stroke="#fff" strokeWidth="18" />;
          })}
          {structure.outdoors.map((outdoor) => {
            const center = outdoor.polygon.reduce((result, point) => ({ x: result.x + point.x / outdoor.polygon.length, y: result.y + point.y / outdoor.polygon.length }), { x: 0, y: 0 });
            return <text fill="#42513f" fontSize="210" fontWeight="700" key={`${outdoor.id}-label`} textAnchor="middle" x={center.x} y={center.y}>{outdoor.name.replace(" · 编辑底盘", "")}</text>;
          })}
          <text fill="#46504b" fontSize="190" fontWeight="600" textAnchor="middle" x={6000} y={6100}>1F 建筑 / 客餐厨与入户关系</text>
        </svg>
      </div>
    </div>
  );
}

export function YardPreview() {
  const searchParams = useSearchParams();
  const workspace = defaultSpaceData.workspace;
  const oneFloorStructure = workspace.houseStructuresByFloor["1F"];
  const yardStructure = workspace.houseStructuresByFloor.YARD;
  const floor = defaultSpaceData.floors.find((item) => item.id === yardFloorId);
  const cameraId = searchParams.get("camera");
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const unifiedCourtyardModel = useMemo(() => createUnifiedCourtyardModel({
    oneFloorStructure,
    yardStructure,
    furniture: workspace.furniture.filter((item) => ["1F", "YARD"].includes(item.floorId))
  }), [oneFloorStructure, workspace.furniture, yardStructure]);
  const presentationStructure = useMemo<HouseStructure>(() => ({
    ...unifiedCourtyardModel.houseStructure,
    // The merged geometry deliberately keeps 1F walls/rooms, while YARD owns
    // the camera and outdoor lighting behavior for this standalone route.
    floorId: yardFloorId
  }), [unifiedCourtyardModel.houseStructure]);
  const yardFurniture = useMemo(() => workspace.furniture.filter((item) => item.floorId === yardFloorId), [workspace.furniture]);
  const yardDrawingItems = useMemo(() => workspace.drawingItems.filter((item) => item.floorId === yardFloorId), [workspace.drawingItems]);
  const authoredCameraView = useMemo<FixedCameraView | null>(() => {
    const view = cameraId ? workspace.cameraViews.find((item) => item.id === cameraId && item.floor === yardFloorId) : null;
    return view ?? null;
  }, [cameraId, workspace.cameraViews]);
  const requestedCameraView = useMemo<{ view: FixedCameraView; nonce: number } | null>(
    () => authoredCameraView ? { view: authoredCameraView, nonce: cameraId?.length ?? 1 } : null,
    [authoredCameraView, cameraId]
  );

  if (!floor || !oneFloorStructure || !yardStructure) {
    return <main className="grid min-h-screen place-items-center bg-[#e9e2d7] text-stone-700">院子数据暂不可用</main>;
  }

  return (
    <main className="min-h-screen bg-[#eef0eb] text-[#28322b]" data-yard-preview="true" data-yard-source="canonical-default-workspace" data-yard-revision={canonicalRevision} data-yard-data-sha={canonicalDataSha}>
      <header className="border-b border-[#d6ddd2] bg-[#26332b] px-5 py-5 text-[#f3f1e8] sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c7d2bd]">LYHP / YARD PREVIEW</p>
            <h1 className="mt-2 text-3xl font-medium tracking-[-0.03em]">院子实时预览</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">当前统一庭院真值：真实南北院边界、铺装、绿化、户外家具、围栏与 1F 建筑关系。此页只读，不改写工作区。</p>
          <div className="mt-3 inline-flex flex-wrap gap-2 text-[10px] font-bold"><span className="rounded-full bg-emerald-300 px-3 py-1.5 text-emerald-950">CANONICAL · 非旧快照</span><span className="rounded-full border border-white/20 px-3 py-1.5 text-white/60">{canonicalRevision}</span></div>
          <div className="mt-3 flex max-w-3xl flex-wrap gap-1.5 text-[10px] font-black tracking-[0.08em]" data-testid="yard-runtime-status-strip" aria-label="YARD 沟通与施工边界状态"><span className="rounded-full bg-rose-300 px-2.5 py-1 text-rose-950">P0</span><span className="rounded-full bg-white/15 px-2.5 py-1 text-white/85">REFERENCE</span><span className="rounded-full bg-amber-200 px-2.5 py-1 text-amber-950">ESTIMATED</span><span className="rounded-full bg-white/15 px-2.5 py-1 text-white/85">UNKNOWN</span><span className="rounded-full bg-rose-200 px-2.5 py-1 text-rose-950">BLOCKED</span><span className="rounded-full border border-white/30 px-2.5 py-1 text-white/90">NOT FOR CONSTRUCTION</span></div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link className="rounded-full border border-white/20 px-4 py-2 text-white/75 transition hover:border-white/50 hover:text-white" href="/preview">返回全屋入口</Link>
            <Link className="rounded-full bg-[#dce7d2] px-4 py-2 font-semibold text-[#314132] transition hover:bg-white" href="/yard-preview?camera=view-yard-all">3D 全院</Link>
            <Link className="rounded-full border border-white/20 px-4 py-2 text-white/75 transition hover:border-white/50 hover:text-white" href="/yard-preview?camera=view-yard-south">南院</Link>
            <Link className="rounded-full border border-white/20 px-4 py-2 text-white/75 transition hover:border-white/50 hover:text-white" href="/yard-preview?camera=view-yard-north">北院</Link>
          </div>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        <details className="order-[3] rounded-3xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 shadow-sm sm:p-5 lg:order-0" data-testid="yard-runtime-evidence-boundaries">
          <summary className="min-h-11 cursor-pointer list-none rounded-xl px-2 py-2 font-semibold leading-6">展开 YARD 现场深化边界（FIELD_REMEASURE / VENDOR / PROFESSIONAL）</summary>
          <div className="mt-3 grid gap-3 border-t border-amber-200 pt-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/60 p-3"><p className="text-[10px] font-black tracking-[0.16em] text-blue-900">FIELD_REMEASURE</p><p className="mt-1 leading-6">完成面标高、排水坡向、地漏、户外柜检修/开合、门净宽与维护带，须现场/CAD 补证。</p></div>
            <div className="rounded-2xl bg-white/60 p-3"><p className="text-[10px] font-black tracking-[0.16em] text-violet-900">VENDOR</p><p className="mt-1 leading-6">BBQ 燃料、排烟、窗洞、防风与户外柜耐候资料须厂家确认；placeholder 不等于采购。</p></div>
            <div className="rounded-2xl bg-white/60 p-3"><p className="text-[10px] font-black tracking-[0.16em] text-emerald-900">PROFESSIONAL</p><p className="mt-1 leading-6">防水、电气/RCD、IP、消防间距及老人儿童宠物安全须专业签认，未闭合保持 BLOCKED。</p></div>
          </div>
        </details>
        <YardPlanOverview structure={unifiedCourtyardModel.houseStructure} furniture={yardFurniture} />
        <section className="relative order-[1] h-[520px] overflow-hidden rounded-[2rem] border border-[#ccd5c8] bg-[#dde5dc] shadow-[0_18px_55px_rgba(61,78,61,0.12)] sm:h-[720px] lg:order-1" data-testid="yard-3d-overview">
          <Floor3DView
            floor={floor}
            houseStructure={presentationStructure}
            houseStructuresByFloor={workspace.houseStructuresByFloor}
            stairSystems={workspace.stairSystems}
            stairLandings={workspace.stairLandings}
            stairOpenings={workspace.stairOpenings}
            furniture={yardFurniture}
            allFurniture={yardFurniture}
            drawingItems={yardDrawingItems}
            allDrawingItems={yardDrawingItems}
            drawingSheetType="sitePlan"
            cameraViews={workspace.cameraViews}
            cameraViewRequest={requestedCameraView}
            roomTourViews={workspace.roomTourViews}
            lightingDesign={workspace.lightingDesign}
            selectedObjectId={selectedObjectId}
            selectedFurnitureId=""
            showObjectIds={false}
            externalPresentationMode
            presentationWallDisplayMode="full"
            cameraCollisionEnabledOverride={false}
            mobileQuality="high"
            onShowObjectIdsChange={() => undefined}
            onSelectStructure={setSelectedObjectId}
            onSelectFurniture={(item) => setSelectedObjectId(item.id)}
            onSelectDrawingItem={setSelectedObjectId}
            onClearSelection={() => setSelectedObjectId("")}
            onSelectFloor={() => undefined}
            onHoverObject={() => undefined}
            onClearHoverObject={() => undefined}
            onSelectCameraView={() => undefined}
            onLightingRuntimeStateChange={() => undefined}
          />
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/55 bg-[#2d3a31]/80 px-4 py-2 text-xs text-white/90 backdrop-blur" data-testid="yard-camera-label">
            {authoredCameraView?.name ?? "全院 3D 总览"}
          </div>
        </section>
        <section aria-label="院子 Top5 实时机位" className="order-[2] grid grid-cols-2 gap-3 sm:grid-cols-2 lg:order-2 lg:grid-cols-5" data-testid="yard-top-five-cameras">
          {yardTopFive.map((view) => {
            const active = (authoredCameraView?.id ?? "view-yard-all") === view.id;
            return <Link className={`rounded-2xl border p-4 transition ${active ? "border-[#52674f] bg-[#dce7d2] shadow-[0_10px_30px_rgba(61,78,61,0.13)]" : "border-[#d4ddd0] bg-[#f7f8f3] hover:-translate-y-0.5 hover:border-[#819479]"}`} href={`/yard-preview?camera=${view.id}`} key={view.id}>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#71826b]">实时机位</span>
              <span className="mt-2 block text-sm font-semibold text-[#2f3d31]">{view.label}</span>
              <span className="mt-1 block text-xs leading-5 text-[#657461]">{view.detail}</span>
            </Link>;
          })}
        </section>
        <div className="order-[4] grid gap-4 md:grid-cols-2 lg:order-4">
          <article className="rounded-3xl border border-[#d4ddd0] bg-[#f7f8f3] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#71826b]">North yard / 入户</p>
            <h2 className="mt-2 text-xl font-semibold">北院保持迎宾与户外厨房</h2>
            <p className="mt-2 text-sm leading-6 text-[#647063]">当前边界、户外厨房平台、工具区防滑石板、喜阴花境、院门和 1F 入户关系均来自统一数据；后续只做复尺、标高与设备深化。</p>
          </article>
          <article className="rounded-3xl border border-[#d4ddd0] bg-[#f7f8f3] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#71826b]">South yard / 生活</p>
            <h2 className="mt-2 text-xl font-semibold">南院保持休闲、洗衣与宠物分区</h2>
            <p className="mt-2 text-sm leading-6 text-[#647063]">当前休闲平台、洗衣平台、晾晒区、直线步道、菜园和宠物洗脚区不合并为单一花园；后续按排水、遮阳和维护顺序深化。</p>
          </article>
        </div>
        <aside className="order-[6] rounded-3xl border border-amber-200 bg-amber-50/80 p-5 text-sm leading-6 text-amber-950 lg:order-5" data-testid="yard-construction-unknowns">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">现场深化保留 unknown / estimated</p>
          <p className="mt-2">完成面标高、排水坡向与地漏位置；防水收口；RCD 回路、IP 等级、接头与驱动检修；BBQ 防火排烟；遮阳抗风；院门净宽及儿童、老人和宠物安全，均须以现场复尺和专业深化为准。本预览不虚构施工尺寸或设备参数。</p>
        </aside>
      </section>
    </main>
  );
}
