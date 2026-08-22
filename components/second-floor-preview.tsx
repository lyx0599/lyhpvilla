"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Floor3DView } from "@/components/floor-3d-view";
import { defaultSpaceData } from "@/data/mock-space";
import type { FixedCameraView, FloorId } from "@/types/space";

const secondFloorId: FloorId = "2F";

export function SecondFloorPreview() {
  const searchParams = useSearchParams();
  const workspace = defaultSpaceData.workspace;
  const floor = defaultSpaceData.floors.find((item) => item.id === secondFloorId);
  const structure = workspace.houseStructuresByFloor[secondFloorId];
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const cameraId = searchParams.get("camera");
  const authoredCameraView = useMemo(() => {
    const view = cameraId
      ? workspace.cameraViews.find((item) => item.id === cameraId && item.floor === secondFloorId)
      : null;
    return view ?? null;
  }, [cameraId, workspace.cameraViews]);
  const requestedCameraView = useMemo<{ view: FixedCameraView; nonce: number } | null>(
    () => authoredCameraView ? { view: authoredCameraView, nonce: 1 } : null,
    [authoredCameraView]
  );

  const furniture = useMemo(
    () => workspace.furniture.filter((item) => item.floorId === secondFloorId),
    [workspace.furniture]
  );
  const drawingItems = useMemo(
    () => workspace.drawingItems.filter((item) => item.floorId === secondFloorId),
    [workspace.drawingItems]
  );

  if (!floor || !structure) {
    return <main className="grid min-h-screen place-items-center bg-[#e9e2d7] text-stone-700">2F 数据暂不可用</main>;
  }

  return (
    <main className="h-screen overflow-hidden bg-[#d8d0c4]">
      <section className="relative h-full w-full overflow-hidden bg-[#e8e1d6]">
        <Floor3DView
          floor={floor}
          houseStructure={structure}
          houseStructuresByFloor={workspace.houseStructuresByFloor}
          stairSystems={workspace.stairSystems}
          stairLandings={workspace.stairLandings}
          stairOpenings={workspace.stairOpenings}
          furniture={furniture}
          allFurniture={workspace.furniture}
          drawingItems={drawingItems}
          allDrawingItems={workspace.drawingItems}
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
          onSelectFloor={(floorId) => { if (floorId !== secondFloorId) setSelectedObjectId(floorId); }}
          onHoverObject={() => undefined}
          onClearHoverObject={() => undefined}
          onSelectCameraView={() => undefined}
          onLightingRuntimeStateChange={() => undefined}
        />
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/55 bg-[#2e2925]/76 px-4 py-2 text-xs text-white/90 backdrop-blur">
          {requestedCameraView?.view.name ?? "2F 实时预览"}
        </div>
      </section>
    </main>
  );
}
