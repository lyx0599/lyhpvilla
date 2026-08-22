"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Floor3DView } from "@/components/floor-3d-view";
import { defaultSpaceData } from "@/data/mock-space";
import type { FixedCameraView, FloorId } from "@/types/space";

const b1FloorId: FloorId = "B1";

export function B1Preview() {
  const searchParams = useSearchParams();
  const workspace = defaultSpaceData.workspace;
  const floor = defaultSpaceData.floors.find((item) => item.id === b1FloorId);
  const structure = workspace.houseStructuresByFloor[b1FloorId];
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const cameraId = searchParams.get("camera");
  const structuralPreview = searchParams.get("structure") === "1";
  const cutawayPreview = searchParams.get("cutaway") === "1";
  const manualCameraView = useMemo<FixedCameraView | null>(() => {
    if (cameraId !== "manual") return null;
    const readNumber = (key: string) => Number.parseFloat(searchParams.get(key) ?? "");
    const [cx, cy, cz, tx, ty, tz, fov] = ["cx", "cy", "cz", "tx", "ty", "tz", "fov"].map(readNumber);
    if ([cx, cy, cz, tx, ty, tz, fov].some((value) => !Number.isFinite(value))) return null;
    return {
      id: "designer-camera-b1-manual-preview",
      floor: b1FloorId,
      name: "B1 手动校准机位",
      description: "用于按户型坐标校准固定机位。",
      cameraPosition: { x: cx, y: cy, z: cz },
      target: { x: tx, y: ty, z: tz },
      fov
    };
  }, [cameraId, searchParams]);
  const [activeCameraId, setActiveCameraId] = useState(cameraId);
  useEffect(() => {
    setActiveCameraId(cameraId);
  }, [cameraId]);
  useEffect(() => {
    const cameraIds = workspace.cameraViews
      .filter((item) => item.floor === b1FloorId && item.id.startsWith("designer-camera-b1-"))
      .map((item) => item.id);
    const handleKeyDown = (event: KeyboardEvent) => {
      const index = event.key === "0" ? 9 : Number.parseInt(event.key, 10) - 1;
      if (Number.isNaN(index) || !cameraIds[index]) return;
      setActiveCameraId(cameraIds[index]);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [workspace.cameraViews]);
  const authoredCameraView = useMemo(() => {
    if (manualCameraView) return manualCameraView;
    const view = activeCameraId ? workspace.cameraViews.find((item) => item.id === activeCameraId && item.floor === b1FloorId) : null;
    return view ?? null;
  }, [activeCameraId, manualCameraView, workspace.cameraViews]);
  const [requestedCameraView, setRequestedCameraView] = useState<{ view: FixedCameraView; nonce: number } | null>(null);
  useEffect(() => {
    setRequestedCameraView(null);
    if (!authoredCameraView) return;
    const timer = window.setTimeout(() => {
      setRequestedCameraView({ view: authoredCameraView, nonce: Date.now() });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [authoredCameraView]);
  const furniture = useMemo(() => workspace.furniture.filter((item) => item.floorId === b1FloorId), [workspace.furniture]);

  if (!floor || !structure) {
    return <main className="grid min-h-screen place-items-center bg-[#e9e2d7] text-stone-700">B1 数据暂不可用</main>;
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
          furniture={structuralPreview ? [] : furniture}
          allFurniture={structuralPreview ? [] : workspace.furniture}
          drawingItems={structuralPreview ? [] : workspace.drawingItems.filter((item) => item.floorId === b1FloorId)}
          allDrawingItems={structuralPreview ? [] : workspace.drawingItems}
          drawingSheetType="sitePlan"
          cameraViews={workspace.cameraViews}
          cameraViewRequest={requestedCameraView}
          roomTourViews={workspace.roomTourViews}
          lightingDesign={workspace.lightingDesign}
          selectedObjectId={selectedObjectId}
          selectedFurnitureId=""
          showObjectIds={false}
          externalPresentationMode
          presentationWallDisplayMode={structuralPreview || cutawayPreview ? "cutaway" : "full"}
          cameraCollisionEnabledOverride={false}
          mobileQuality="high"
          onShowObjectIdsChange={() => undefined}
          onSelectStructure={setSelectedObjectId}
          onSelectFurniture={(item) => setSelectedObjectId(item.id)}
          onSelectDrawingItem={setSelectedObjectId}
          onClearSelection={() => setSelectedObjectId("")}
          onSelectFloor={(floorId) => { if (floorId !== b1FloorId) setSelectedObjectId(floorId); }}
          onHoverObject={() => undefined}
          onClearHoverObject={() => undefined}
          onSelectCameraView={() => undefined}
          onLightingRuntimeStateChange={() => undefined}
        />
      </section>
    </main>
  );
}
