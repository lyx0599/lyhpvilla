"use client";

import { useEffect, useMemo, useState } from "react";
import { COURTYARD_CAMERA_VIEW_IDS, courtyardViewFloorIds, createUnifiedCourtyardModel } from "@/lib/courtyard-model";
import { Floor3DView } from "@/components/floor-3d-view";
import type { FixedCameraView, Floor, Furniture, HouseStructure } from "@/types/space";

type Yard3DPreviewProps = {
  houseStructure: HouseStructure;
  yardStructure: HouseStructure;
  furniture: Furniture[];
  initialFocus?: YardPreviewFocus;
  cameraViews?: FixedCameraView[];
  cameraViewRequest?: { view: FixedCameraView; nonce: number } | null;
  onSelectCameraView?: (view: FixedCameraView) => void;
  onExit?: () => void;
  onEditYard?: (yard: "north" | "south") => void;
  selectedObjectId?: string;
  onSelectObject?: (objectId: string) => void;
};

type YardPreviewFocus = "all" | "north" | "south" | "entry" | "southLiving";

const yardFloor: Floor = {
  id: "YARD",
  label: "庭院专项视图",
  subtitle: "一层庭院关系"
};

const focusOptions: Array<{ id: YardPreviewFocus; label: string; viewId: string }> = [
  { id: "all", label: "全院", viewId: COURTYARD_CAMERA_VIEW_IDS.all },
  { id: "south", label: "南院", viewId: COURTYARD_CAMERA_VIEW_IDS.south },
  { id: "north", label: "北院", viewId: COURTYARD_CAMERA_VIEW_IDS.north },
  { id: "entry", label: "入户北院", viewId: COURTYARD_CAMERA_VIEW_IDS.entry },
  { id: "southLiving", label: "南院生活区", viewId: COURTYARD_CAMERA_VIEW_IDS.southLiving }
];

export function Yard3DPreview({
  houseStructure,
  yardStructure,
  furniture,
  initialFocus = "all",
  cameraViews = [],
  cameraViewRequest = null,
  onSelectCameraView,
  onExit,
  onEditYard,
  selectedObjectId = "",
  onSelectObject = () => {}
}: Yard3DPreviewProps) {
  const [showObjectIds, setShowObjectIds] = useState(true);
  const courtyardModel = useMemo(() => createUnifiedCourtyardModel({
    oneFloorStructure: houseStructure,
    yardStructure,
    furniture
  }), [furniture, houseStructure, yardStructure]);
  const availableFocusOptions = useMemo(
    () => focusOptions.filter((option) => cameraViews.some((view) => view.id === option.viewId)),
    [cameraViews]
  );

  useEffect(() => {
    const preferredViewId = focusOptions.find((option) => option.id === initialFocus)?.viewId ?? COURTYARD_CAMERA_VIEW_IDS.all;
    const initialView = cameraViews.find((view) => view.id === preferredViewId) ?? cameraViews.find((view) => view.id === COURTYARD_CAMERA_VIEW_IDS.all);
    if (initialView) onSelectCameraView?.(initialView);
  }, []);

  return (
    <section className="relative min-h-0 flex-1 overflow-hidden bg-[#ede7da]">
      <Floor3DView
        floor={yardFloor}
        houseStructure={courtyardModel.houseStructure}
        furniture={courtyardModel.furniture}
        cameraViews={cameraViews}
        cameraViewFloorIds={courtyardViewFloorIds}
        cameraViewRequest={cameraViewRequest}
        selectedObjectId={selectedObjectId}
        selectedFurnitureId={selectedObjectId}
        showObjectIds={showObjectIds}
        onShowObjectIdsChange={setShowObjectIds}
        onSelectStructure={onSelectObject}
        onSelectFurniture={(item) => onSelectObject(item.id)}
        onHoverObject={() => undefined}
        onClearHoverObject={() => undefined}
        onSelectCameraView={onSelectCameraView}
      />
      <div className="pointer-events-none absolute left-4 top-4 z-[95] w-[min(420px,calc(100%-2rem))] rounded-lg border border-white/75 bg-white/86 p-3 shadow-[0_18px_54px_rgba(15,23,42,0.14)] backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Courtyard Focus</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">庭院专项视图</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-stone-500">同一套一层正式模型，聚焦南北院、铺装、围栏和庭院水电点位。</p>
          </div>
          {onExit && (
            <button className="pointer-events-auto shrink-0 rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-clay" onClick={onExit} type="button">退出</button>
          )}
        </div>
        <div className="pointer-events-auto mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {availableFocusOptions.map((option) => (
            <button
              key={option.id}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                cameraViewRequest?.view.id === option.viewId ? "bg-blue-600 text-white shadow-sm" : "bg-white text-ink ring-1 ring-stone-200 hover:bg-stone-50"
              }`}
              onClick={() => {
                const view = cameraViews.find((item) => item.id === option.viewId);
                if (view) onSelectCameraView?.(view);
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        {cameraViewRequest?.view.description && (
          <p className="pointer-events-auto mt-2 rounded-lg bg-white/75 px-3 py-2 text-xs font-semibold leading-5 text-stone-600">
            {cameraViewRequest.view.name}：{cameraViewRequest.view.description}
          </p>
        )}
        {onEditYard && (
          <div className="pointer-events-auto mt-2 grid grid-cols-2 gap-2">
            <button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100" onClick={() => onEditYard("south")} type="button">编辑南院</button>
            <button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100" onClick={() => onEditYard("north")} type="button">编辑北院</button>
          </div>
        )}
      </div>
    </section>
  );
}

