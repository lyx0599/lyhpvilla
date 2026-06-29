"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FloorSidebar } from "@/components/floor-sidebar";
import { FurnitureDetails } from "@/components/furniture-details";
import { FurnitureTopView } from "@/components/furniture-top-view";
import { MobileDetailsDrawer } from "@/components/mobile-details-drawer";
import { PlanCanvas } from "@/components/plan-canvas";
import { SemanticMapPanel } from "@/components/semantic-map-panel";
import { ViewToggle } from "@/components/view-toggle";
import { interiorModuleCatalog, interiorModuleCategoryLabels, serviceRequirementLabels } from "@/data/interior-module-catalog";
import type { InteriorModuleCatalogItem } from "@/data/interior-module-catalog";
import { initialHouseStructures } from "@/data/mock-house-structure";
import { initialSemanticObjects } from "@/data/mock-semantic-map";
import { autoRepairHouse, validateHouse } from "@/src/core/houseValidator";
import { createEmptyStructure } from "@/lib/house-geometry";
import { getDefaultVisualSettings } from "@/lib/floor-plan-cleanup";
import type { WallSyncOverrides } from "@/lib/villa-structure-sync";
import type { CleanPatch, DrawTool, FloorId, FloorPlanVisualSettings, Furniture, HouseRoom, HouseStructure, InteriorModuleCategory, PlannerMode, SpaceData, ViewMode } from "@/types/space";
import type { SemanticObject } from "@/types/semantic-map";

type ModelSnapshot = {
  structure: HouseStructure;
  furniture: Furniture[];
};

type FloorHistory = {
  past: ModelSnapshot[];
  future: ModelSnapshot[];
};

type RightPanelKey = "workflow" | "status" | "modules" | "object" | "details" | "semantic";

const WEB_WORKSPACE_STORAGE_KEY = "villa-space-web-workspace-v3-courtyard-fence";
const moduleCategoryOrder: InteriorModuleCategory[] = ["living", "bedroom", "kitchen", "bath", "storage", "decor"];

type PersistedWebWorkspace = {
  selectedFloorId: FloorId;
  furniture: Furniture[];
  semanticObjects: SemanticObject[];
  visualSettingsByFloor: Record<FloorId, FloorPlanVisualSettings>;
  cleanPatchesByFloor: Record<FloorId, CleanPatch[]>;
  houseStructuresByFloor: Record<FloorId, HouseStructure>;
  wallSyncOverrides: WallSyncOverrides;
};

function getDefaultRoomNumber(floorId: FloorId, index: number) {
  return `R-${floorId}-${String(index + 1).padStart(3, "0")}`;
}

function normalizeRoom(floorId: FloorId, room: HouseRoom, index: number): HouseRoom {
  return {
    ...room,
    floorId,
    roomNumber: room.roomNumber || getDefaultRoomNumber(floorId, index),
    name: room.name || `${floorId} 房间 ${index + 1}`,
    boundary: room.boundary ?? [],
    sourceWallIds: room.sourceWallIds ?? []
  };
}

function normalizeHouseStructure(floorId: FloorId, structure: HouseStructure | undefined): HouseStructure {
  const emptyStructure = createEmptyStructure(floorId);
  if (!structure) return emptyStructure;
  return {
    ...emptyStructure,
    ...structure,
    floorId,
    coordinateSystem: structure.coordinateSystem ?? emptyStructure.coordinateSystem,
    walls: structure.walls ?? [],
    rooms: (structure.rooms ?? []).map((room, index) => normalizeRoom(floorId, room, index)),
    partitions: structure.partitions ?? [],
    stairs: structure.stairs ?? [],
    fences: structure.fences ?? [],
    outdoorSurfaces: structure.outdoorSurfaces ?? [],
    doors: structure.doors ?? [],
    windows: structure.windows ?? [],
    bayWindows: structure.bayWindows ?? [],
    skylights: structure.skylights ?? [],
    outdoors: structure.outdoors ?? []
  };
}

function RightPanelCard({
  id,
  title,
  eyebrow,
  summary,
  open,
  onToggle,
  children
}: {
  id: RightPanelKey;
  title: string;
  eyebrow: string;
  summary: string;
  open: boolean;
  onToggle: (id: RightPanelKey) => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white text-sm shadow-sm">
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-stone-50"
        onClick={() => onToggle(id)}
        type="button"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">{eyebrow}</span>
          <span className="mt-0.5 block font-semibold text-ink">{title}</span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">{summary}</span>
        </span>
        <span className={`grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-stone-500 transition ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && <div className="border-t border-stone-100 p-4">{children}</div>}
    </section>
  );
}

export function SpacePlanner({ data }: { data: SpaceData }) {
  const initialVisualSettings = data.floors.reduce((settingsByFloor, floor) => {
    settingsByFloor[floor.id] = floor.visualSettings ?? getDefaultVisualSettings();
    return settingsByFloor;
  }, {} as Record<FloorId, FloorPlanVisualSettings>);
  const initialCleanPatches = data.floors.reduce((patchesByFloor, floor) => {
    patchesByFloor[floor.id] = [];
    return patchesByFloor;
  }, {} as Record<FloorId, CleanPatch[]>);

  const [selectedFloorId, setSelectedFloorId] = useState<FloorId>("1F");
  const [furniture, setFurniture] = useState<Furniture[]>(data.furniture);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(data.furniture[0]?.id ?? "");
  const [semanticObjects, setSemanticObjects] = useState<SemanticObject[]>(initialSemanticObjects);
  const [selectedSemanticObjectId, setSelectedSemanticObjectId] = useState(initialSemanticObjects.find((object) => object.floorId === "1F")?.id ?? "");
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [plannerMode, setPlannerMode] = useState<PlannerMode>("edit");
  const [drawTool, setDrawTool] = useState<DrawTool>("select");
  const [floorPlanScale, setFloorPlanScale] = useState(1);
  const [visualSettingsByFloor, setVisualSettingsByFloor] = useState<Record<FloorId, FloorPlanVisualSettings>>(initialVisualSettings);
  const [cleanPatchesByFloor, setCleanPatchesByFloor] = useState<Record<FloorId, CleanPatch[]>>(initialCleanPatches);
  const [houseStructuresByFloor, setHouseStructuresByFloor] = useState<Record<FloorId, HouseStructure>>(initialHouseStructures);
  const [wallSyncOverrides, setWallSyncOverrides] = useState<WallSyncOverrides>({});
  const [validatorRepairLog, setValidatorRepairLog] = useState<string[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  const [activeObjectId, setActiveObjectId] = useState("");
  const [locateObjectRequest, setLocateObjectRequest] = useState<{ id: string; nonce: number } | null>(null);
  const [hasLoadedWebWorkspace, setHasLoadedWebWorkspace] = useState(false);
  const [webSaveStatus, setWebSaveStatus] = useState<"loading" | "saved" | "dirty" | "saving" | "error">("loading");
  const [openRightPanels, setOpenRightPanels] = useState<Record<RightPanelKey, boolean>>({
    workflow: true,
    status: true,
    modules: true,
    object: true,
    details: false,
    semantic: false
  });
  const [historyByFloor, setHistoryByFloor] = useState<Partial<Record<FloorId, FloorHistory>>>({});
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHistoryBaseRef = useRef<Partial<Record<FloorId, ModelSnapshot>>>({});
  const suppressHistoryRef = useRef(false);
  const suppressDirtyStatusRef = useRef(true);
  const committedModelRef = useRef<Partial<Record<FloorId, ModelSnapshot>>>(
    Object.fromEntries(data.floors.map((floor) => [
      floor.id,
      {
        structure: initialHouseStructures[floor.id] ?? createEmptyStructure(floor.id),
        furniture: data.furniture.filter((item) => item.floorId === floor.id)
      }
    ])) as Partial<Record<FloorId, ModelSnapshot>>
  );

  const currentFloor = data.floors.find((floor) => floor.id === selectedFloorId) ?? data.floors[0];
  const floorPlanVisualSettings = visualSettingsByFloor[selectedFloorId] ?? getDefaultVisualSettings();
  const floorCleanPatches = cleanPatchesByFloor[selectedFloorId] ?? [];
  const floorHouseStructure = houseStructuresByFloor[selectedFloorId] ?? createEmptyStructure(selectedFloorId);
  const floorFurniture = useMemo(
    () => furniture.filter((item) => item.floorId === selectedFloorId),
    [furniture, selectedFloorId]
  );
  const floorRooms = useMemo(() => data.rooms.filter((room) => room.floorId === selectedFloorId), [data.rooms, selectedFloorId]);
  const floorWalls = useMemo(() => data.walls.filter((wall) => wall.floorId === selectedFloorId), [data.walls, selectedFloorId]);
  const floorSemanticObjects = useMemo(
    () => semanticObjects.filter((object) => object.floorId === selectedFloorId),
    [semanticObjects, selectedFloorId]
  );
  const selectedFurniture = floorFurniture.find((item) => item.id === selectedFurnitureId) ?? floorFurniture[0] ?? null;
  const selectedSemanticObject = semanticObjects.find((object) => object.id === selectedSemanticObjectId) ?? null;
  const houseValidation = useMemo(
    () => validateHouse(selectedFloorId, floorHouseStructure, floorFurniture),
    [selectedFloorId, floorHouseStructure, floorFurniture]
  );
  const floorHistory = historyByFloor[selectedFloorId] ?? { past: [], future: [] };
  const activeStructureObject = useMemo(() => (
    floorHouseStructure.walls.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.partitions.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.stairs.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.fences.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.outdoorSurfaces.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.rooms.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.doors.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.windows.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.bayWindows.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.skylights.find((item) => item.id === activeObjectId) ??
    floorHouseStructure.outdoors.find((item) => item.id === activeObjectId) ??
    null
  ), [activeObjectId, floorHouseStructure]);
  const activeFurniture = floorFurniture.find((item) => item.id === activeObjectId) ?? null;
  const activeRoomObject = activeStructureObject && "spaceType" in activeStructureObject && activeStructureObject.spaceType === "Room"
    ? activeStructureObject
    : null;
  const floorStructureRooms = useMemo(
    () => [...floorHouseStructure.rooms].sort((left, right) => left.roomNumber.localeCompare(right.roomNumber, "zh-CN", { numeric: true })),
    [floorHouseStructure.rooms]
  );
  const moduleCatalogGroups = useMemo(() => moduleCategoryOrder.map((category) => ({
    category,
    items: interiorModuleCatalog.filter((item) => item.category === category)
  })), []);
  const moduleTargetRoom = activeRoomObject ?? (activeFurniture ? floorStructureRooms.find((room) => room.id === activeFurniture.roomId) ?? null : null);
  const moduleTargetLabel = moduleTargetRoom ? `${moduleTargetRoom.roomNumber} · ${moduleTargetRoom.name}` : "画布中心";
  const activeObjectSummary = activeRoomObject
    ? `${activeRoomObject.roomNumber} · ${activeRoomObject.name}`
    : activeFurniture
      ? `${activeFurniture.code} · ${activeFurniture.name}`
      : activeObjectId || "未选择对象";

  useEffect(() => {
    try {
      const savedWorkspace = window.localStorage.getItem(WEB_WORKSPACE_STORAGE_KEY);
      if (!savedWorkspace) {
        setHasLoadedWebWorkspace(true);
        setWebSaveStatus("saved");
        return;
      }

      const parsed = JSON.parse(savedWorkspace) as Partial<PersistedWebWorkspace>;
      const nextStructures = data.floors.reduce((structuresByFloor, floor) => {
        structuresByFloor[floor.id] = normalizeHouseStructure(floor.id, parsed.houseStructuresByFloor?.[floor.id]);
        return structuresByFloor;
      }, {} as Record<FloorId, HouseStructure>);
      const nextSelectedFloorId = parsed.selectedFloorId && data.floors.some((floor) => floor.id === parsed.selectedFloorId)
        ? parsed.selectedFloorId
        : selectedFloorId;

      setSelectedFloorId(nextSelectedFloorId);
      setFurniture(parsed.furniture ?? data.furniture);
      setSemanticObjects(parsed.semanticObjects ?? initialSemanticObjects);
      setVisualSettingsByFloor(parsed.visualSettingsByFloor ?? initialVisualSettings);
      setCleanPatchesByFloor(parsed.cleanPatchesByFloor ?? initialCleanPatches);
      setWallSyncOverrides(parsed.wallSyncOverrides ?? {});
      setHouseStructuresByFloor(nextStructures);
      committedModelRef.current = Object.fromEntries(data.floors.map((floor) => [
        floor.id,
        {
          structure: nextStructures[floor.id],
          furniture: (parsed.furniture ?? data.furniture).filter((item) => item.floorId === floor.id)
        }
      ])) as Partial<Record<FloorId, ModelSnapshot>>;
      setSelectedFurnitureId((parsed.furniture ?? data.furniture).find((item) => item.floorId === nextSelectedFloorId)?.id ?? "");
      setSelectedSemanticObjectId((parsed.semanticObjects ?? initialSemanticObjects).find((object) => object.floorId === nextSelectedFloorId)?.id ?? "");
      setHasLoadedWebWorkspace(true);
      setWebSaveStatus("saved");
    } catch {
      setHasLoadedWebWorkspace(true);
      setWebSaveStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedWebWorkspace) return;
    if (suppressDirtyStatusRef.current) {
      suppressDirtyStatusRef.current = false;
      return;
    }
    setWebSaveStatus((currentStatus) => currentStatus === "loading" || currentStatus === "saving" ? currentStatus : "dirty");
  }, [
    hasLoadedWebWorkspace,
    selectedFloorId,
    furniture,
    semanticObjects,
    visualSettingsByFloor,
    cleanPatchesByFloor,
    houseStructuresByFloor,
    wallSyncOverrides
  ]);

  useEffect(() => {
    const floorId = selectedFloorId;
    const current: ModelSnapshot = { structure: floorHouseStructure, furniture: floorFurniture };
    if (suppressHistoryRef.current) {
      suppressHistoryRef.current = false;
      committedModelRef.current[floorId] = current;
      return;
    }

    const committed = committedModelRef.current[floorId];
    if (!committed || JSON.stringify(committed) === JSON.stringify(current)) return;
    pendingHistoryBaseRef.current[floorId] ??= committed;
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      const base = pendingHistoryBaseRef.current[floorId];
      if (!base) return;
      setHistoryByFloor((currentHistory) => {
        const history = currentHistory[floorId] ?? { past: [], future: [] };
        return {
          ...currentHistory,
          [floorId]: {
            past: [...history.past.slice(-39), base],
            future: []
          }
        };
      });
      committedModelRef.current[floorId] = current;
      delete pendingHistoryBaseRef.current[floorId];
    }, 320);

    return () => {
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    };
  }, [selectedFloorId, floorHouseStructure, floorFurniture]);

  function handleFloorChange(floorId: FloorId) {
    setSelectedFloorId(floorId);
    const firstFurniture = furniture.find((item) => item.floorId === floorId);
    const firstSemanticObject = semanticObjects.find((object) => object.floorId === floorId);
    setSelectedFurnitureId(firstFurniture?.id ?? "");
    setSelectedSemanticObjectId(firstSemanticObject?.id ?? "");
    setDrawTool("select");
    setActiveObjectId("");
    setLocateObjectRequest(null);
  }

  function getCurrentWorkspace(): PersistedWebWorkspace {
    return {
      selectedFloorId,
      furniture,
      semanticObjects,
      visualSettingsByFloor,
      cleanPatchesByFloor,
      houseStructuresByFloor,
      wallSyncOverrides
    };
  }

  function downloadJsonFile(fileName: string, payload: unknown) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadWorkspace() {
    downloadJsonFile(`villa-space-workspace-${new Date().toISOString().slice(0, 10)}.json`, getCurrentWorkspace());
  }

  function saveCurrentWorkspace() {
    if (!hasLoadedWebWorkspace) return;
    setWebSaveStatus("saving");
    try {
      window.localStorage.setItem(WEB_WORKSPACE_STORAGE_KEY, JSON.stringify(getCurrentWorkspace()));
      setWebSaveStatus("saved");
      setValidatorRepairLog(["已保存当前户型。下次用同一个浏览器打开网站，会自动恢复这套模型。"]);
    } catch {
      setWebSaveStatus("error");
      setValidatorRepairLog(["保存失败：当前浏览器不允许写入本地存储，请检查隐私模式或存储权限。"]);
    }
  }

  function handleFurnitureSelect(furniture: Furniture) {
    setSelectedFurnitureId(furniture.id);
    setSelectedSemanticObjectId("");
    setActiveObjectId(furniture.id);
    setOpenRightPanels((currentPanels) => ({
      ...currentPanels,
      object: true,
      details: true
    }));
  }

  function handleFurnitureUpdate(nextFurniture: Furniture) {
    handleFloorFurnitureChange(floorFurniture.map((item) => item.id === nextFurniture.id ? nextFurniture : item));
    setSelectedFurnitureId(nextFurniture.id);
    setActiveObjectId(nextFurniture.id);
  }

  function handleSemanticObjectSelect(object: SemanticObject) {
    setSelectedSemanticObjectId(object.id);
  }

  function handleCreateSemanticObject(object: SemanticObject) {
    setSemanticObjects((currentObjects) => [...currentObjects, object]);
    setSelectedSemanticObjectId(object.id);
  }

  function handleUpdateSemanticObject(object: SemanticObject) {
    setSemanticObjects((currentObjects) => currentObjects.map((item) => item.id === object.id ? object : item));
    setSelectedSemanticObjectId(object.id);
  }

  function handleMoveSemanticObject(objectId: string, position: { x: number; y: number }) {
    setSemanticObjects((currentObjects) => currentObjects.map((item) => {
      if (item.id !== objectId) return item;
      const details = item.details as Record<string, unknown>;
      return {
        ...item,
        position,
        details: {
          ...details,
          position
        }
      };
    }));
  }

  function handleDeleteSemanticObject(objectId: string) {
    setSemanticObjects((currentObjects) => currentObjects.filter((item) => item.id !== objectId));
    if (selectedSemanticObjectId === objectId) {
      const nextObject = semanticObjects.find((item) => item.id !== objectId && item.floorId === selectedFloorId);
      setSelectedSemanticObjectId(nextObject?.id ?? "");
    }
  }

  const handleScaleChange = useCallback((scale: number) => {
    setFloorPlanScale(scale);
  }, []);

  function handleFloorPlanVisualSettingsChange(settings: FloorPlanVisualSettings) {
    setVisualSettingsByFloor((currentSettings) => ({
      ...currentSettings,
      [selectedFloorId]: settings
    }));
  }

  function handleCleanPatchesChange(patches: CleanPatch[]) {
    setCleanPatchesByFloor((currentPatches) => ({
      ...currentPatches,
      [selectedFloorId]: patches
    }));
  }

  function handleHouseStructureChange(structure: HouseStructure) {
    setHouseStructuresByFloor((currentStructures) => ({
      ...currentStructures,
      [selectedFloorId]: structure
    }));
  }

  function handleWallSyncOverridesChange(nextOverrides: WallSyncOverrides) {
    setWallSyncOverrides(nextOverrides);
  }

  function applySnapshot(snapshot: ModelSnapshot) {
    suppressHistoryRef.current = true;
    committedModelRef.current[selectedFloorId] = snapshot;
    setHouseStructuresByFloor((currentStructures) => ({
      ...currentStructures,
      [selectedFloorId]: snapshot.structure
    }));
    setFurniture((currentFurniture) => [
      ...currentFurniture.filter((item) => item.floorId !== selectedFloorId),
      ...snapshot.furniture
    ]);
    setActiveObjectId("");
  }

  function handleUndo() {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    const pendingBase = pendingHistoryBaseRef.current[selectedFloorId];
    const history = historyByFloor[selectedFloorId] ?? { past: [], future: [] };
    const current = { structure: floorHouseStructure, furniture: floorFurniture };
    const target = pendingBase ?? history.past.at(-1);
    if (!target) return;
    delete pendingHistoryBaseRef.current[selectedFloorId];
    setHistoryByFloor((currentHistory) => ({
      ...currentHistory,
      [selectedFloorId]: {
        past: pendingBase ? history.past : history.past.slice(0, -1),
        future: [current, ...history.future].slice(0, 40)
      }
    }));
    applySnapshot(target);
  }

  function handleRedo() {
    const history = historyByFloor[selectedFloorId] ?? { past: [], future: [] };
    const target = history.future[0];
    if (!target) return;
    const current = { structure: floorHouseStructure, furniture: floorFurniture };
    setHistoryByFloor((currentHistory) => ({
      ...currentHistory,
      [selectedFloorId]: {
        past: [...history.past, current].slice(-40),
        future: history.future.slice(1)
      }
    }));
    applySnapshot(target);
  }

  function locateValidationObject(objectId: string) {
    setPlannerMode("edit");
    setDrawTool("select");
    setActiveObjectId(objectId);
    setLocateObjectRequest({ id: objectId, nonce: Date.now() });
  }

  function selectRoomForNaming(roomId: string) {
    if (!roomId) return;
    setPlannerMode("edit");
    setDrawTool("select");
    setActiveObjectId(roomId);
    setLocateObjectRequest({ id: roomId, nonce: Date.now() });
    setOpenRightPanels((currentPanels) => ({
      ...currentPanels,
      object: true
    }));
  }

  function getRoomCenterPercent(room: HouseRoom | null) {
    if (!room?.boundary.length) return { x: 50, y: 50 };
    const center = room.boundary.reduce((sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y
    }), { x: 0, y: 0 });
    const width = Math.max(1, floorHouseStructure.coordinateSystem.width);
    const height = Math.max(1, floorHouseStructure.coordinateSystem.height);
    return {
      x: Math.min(100, Math.max(0, (center.x / room.boundary.length / width) * 100)),
      y: Math.min(100, Math.max(0, (center.y / room.boundary.length / height) * 100))
    };
  }

  function getNextFurnitureSequence(codePrefix: string) {
    return furniture.reduce((maxSequence, item) => {
      if (!item.code.startsWith(`${codePrefix}-`)) return maxSequence;
      const sequence = Number(item.code.split("-").at(-1));
      return Number.isFinite(sequence) ? Math.max(maxSequence, sequence) : maxSequence;
    }, 0) + 1;
  }

  function addModuleFromCatalog(item: InteriorModuleCatalogItem) {
    const sequence = getNextFurnitureSequence(item.codePrefix);
    const sequenceLabel = String(sequence).padStart(3, "0");
    const targetRoom = moduleTargetRoom ?? floorStructureRooms[0] ?? null;
    const position = getRoomCenterPercent(targetRoom);
    const nextModule: Furniture = {
      id: `module-${selectedFloorId.toLowerCase()}-${item.moduleType}-${sequenceLabel}`,
      code: `${item.codePrefix}-${sequenceLabel}`,
      name: item.name,
      type: item.furnitureType,
      catalogId: item.id,
      moduleCategory: item.category,
      moduleType: item.moduleType,
      floorId: selectedFloorId,
      roomId: targetRoom?.id ?? `room-${selectedFloorId.toLowerCase()}-module-zone`,
      dimensions: { ...item.dimensions },
      material: item.material,
      note: item.note,
      constructionNote: item.note,
      serviceRequirements: { ...item.serviceRequirements },
      position: { ...position, rotation: 0 },
      color: item.color
    };

    handleFloorFurnitureChange([...floorFurniture, nextModule]);
    setSelectedFurnitureId(nextModule.id);
    setActiveObjectId(nextModule.id);
    setLocateObjectRequest({ id: nextModule.id, nonce: Date.now() });
    setPlannerMode("edit");
    setDrawTool("select");
    setOpenRightPanels((currentPanels) => ({
      ...currentPanels,
      object: true,
      details: true
    }));
  }

  function toggleRightPanel(panelId: RightPanelKey) {
    setOpenRightPanels((currentPanels) => ({
      ...currentPanels,
      [panelId]: !currentPanels[panelId]
    }));
  }

  function updateActiveObject(patch: Record<string, unknown>) {
    if (activeFurniture) {
      handleFloorFurnitureChange(floorFurniture.map((item) => item.id === activeFurniture.id ? { ...item, ...patch } as Furniture : item));
      return;
    }
    if (!activeStructureObject) return;
    const update = <T extends { id: string }>(items: T[]) => items.map((item) => {
      if (item.id !== activeStructureObject.id) return item;
      const next = { ...item, ...patch } as T;
      if ("kind" in next && next.kind === "arc" && "radius" in next && "startAngle" in next && "endAngle" in next) {
        return {
          ...next,
          length: Math.round((Math.abs(Number(next.endAngle) - Number(next.startAngle)) * Math.PI * Number(next.radius)) / 180)
        } as T;
      }
      return next;
    });
    handleHouseStructureChange({
      ...floorHouseStructure,
      walls: update(floorHouseStructure.walls),
      partitions: update(floorHouseStructure.partitions),
      stairs: update(floorHouseStructure.stairs),
      fences: update(floorHouseStructure.fences),
      outdoorSurfaces: update(floorHouseStructure.outdoorSurfaces),
      rooms: update(floorHouseStructure.rooms),
      doors: update(floorHouseStructure.doors),
      windows: update(floorHouseStructure.windows),
      bayWindows: update(floorHouseStructure.bayWindows),
      skylights: update(floorHouseStructure.skylights),
      outdoors: update(floorHouseStructure.outdoors)
    });
  }

  function handleAutoRepairHouse() {
    let nextFurniture = furniture;
    const repairLog: string[] = [];
    const repairedStructures = data.floors.reduce((structures, floor) => {
      const structure = structures[floor.id] ?? createEmptyStructure(floor.id);
      const result = autoRepairHouse(floor.id, structure, nextFurniture.filter((item) => item.floorId === floor.id));
      structures[floor.id] = result.structure;
      nextFurniture = [
        ...nextFurniture.filter((item) => item.floorId !== floor.id),
        ...result.furniture
      ];
      repairLog.push(...result.repairs.map((item) => `${floor.label}: ${item}`));
      return structures;
    }, { ...houseStructuresByFloor } as Record<FloorId, HouseStructure>);

    setHouseStructuresByFloor(repairedStructures);
    setFurniture(nextFurniture);
    setValidatorRepairLog(repairLog.length > 0 ? repairLog : ["全屋未发现可自动修复的表达问题。"]);
  }

  function handleFloorFurnitureChange(nextFloorFurniture: Furniture[]) {
    setFurniture((currentFurniture) => {
      return [
        ...currentFurniture.filter((item) => item.floorId !== selectedFloorId),
        ...nextFloorFurniture
      ];
    });
  }

  function handleDeleteFurniture(furnitureId: string) {
    const targetFurniture = floorFurniture.find((item) => item.id === furnitureId);
    if (!targetFurniture || targetFurniture.locked) return;
    const nextFloorFurniture = floorFurniture.filter((item) => item.id !== furnitureId);
    handleFloorFurnitureChange(nextFloorFurniture);
    if (selectedFurnitureId === furnitureId) {
      setSelectedFurnitureId(nextFloorFurniture[0]?.id ?? "");
    }
    if (activeObjectId === furnitureId) {
      setActiveObjectId("");
    }
  }

  function handleRotateFurniture(furnitureId: string) {
    const targetFurniture = floorFurniture.find((item) => item.id === furnitureId);
    if (!targetFurniture || targetFurniture.locked) return;
    handleFloorFurnitureChange(floorFurniture.map((item) => item.id === furnitureId
      ? { ...item, position: { ...item.position, rotation: (item.position.rotation + 15 + 360) % 360 } }
      : item));
    setSelectedFurnitureId(furnitureId);
    setActiveObjectId(furnitureId);
  }

  return (
    <main className={`min-h-screen ${focusMode ? "p-0" : "p-3 sm:p-5 lg:p-6"}`}>
      <section className={`mx-auto flex min-h-[calc(100vh-1.5rem)] flex-col overflow-hidden border border-white/70 bg-white/72 shadow-soft backdrop-blur md:min-h-[calc(100vh-2.5rem)] ${
        focusMode ? "min-h-screen max-w-none rounded-none lg:grid lg:grid-cols-1" : "max-w-7xl rounded-[2rem] lg:grid lg:grid-cols-[240px_minmax(0,1fr)_320px]"
      }`}>
        {!focusMode && <FloorSidebar floors={data.floors} selectedFloorId={selectedFloorId} onSelectFloor={handleFloorChange} />}

        <section className="flex min-h-0 flex-1 flex-col">
          {!focusMode && <header className="flex flex-col gap-3 border-b border-stone-200/80 p-4 sm:flex-row sm:items-center sm:justify-between lg:p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-clay">Villa Space Studio</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">户型结构网站工作台</h1>
              <p className="mt-1 text-sm text-stone-500">{currentFloor.label} · {currentFloor.subtitle} · 一套模型，多种表达</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-500 shadow-sm">
                <span className={`size-2 rounded-full ${webSaveStatus === "error" ? "bg-red-500" : webSaveStatus === "saving" || webSaveStatus === "loading" || webSaveStatus === "dirty" ? "bg-amber-500" : "bg-emerald-500"}`} />
                <span>{webSaveStatus === "error" ? "保存失败" : webSaveStatus === "saving" ? "保存中" : webSaveStatus === "loading" ? "加载中" : webSaveStatus === "dirty" ? "有未保存修改" : "已保存"}</span>
                <button className="rounded-lg px-2 py-1 text-stone-400 hover:bg-stone-100 hover:text-ink" onClick={downloadWorkspace} type="button">导出方案</button>
                <button className="rounded-lg bg-ink px-2 py-1 text-white hover:bg-clay disabled:bg-stone-300" disabled={webSaveStatus === "loading" || webSaveStatus === "saving"} onClick={saveCurrentWorkspace} type="button">保存</button>
              </div>
              <label className="flex flex-1 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm lg:hidden">
                <span className="shrink-0 text-stone-500">楼层</span>
                <select
                  className="w-full bg-transparent font-semibold text-ink outline-none"
                  value={selectedFloorId}
                  onChange={(event) => handleFloorChange(event.target.value as FloorId)}
                >
                  {data.floors.map((floor) => (
                    <option key={floor.id} value={floor.id}>{floor.label} · {floor.subtitle}</option>
                  ))}
                </select>
              </label>
              <ViewToggle viewMode={viewMode} onChange={setViewMode} />
              <div className="hidden rounded-2xl bg-stone-100 p-1 text-sm font-semibold text-stone-500 lg:flex">
                {(["view", "edit"] as PlannerMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`rounded-xl px-3 py-2 transition ${plannerMode === mode ? "bg-white text-ink shadow-sm" : "hover:text-ink"}`}
                    onClick={() => {
                      setPlannerMode(mode);
                      if (mode === "view") setDrawTool("select");
                    }}
                    type="button"
                  >
                    {mode === "view" ? "查看" : "绘制"}
                  </button>
                ))}
              </div>
            </div>
          </header>}

          <PlanCanvas
            floor={currentFloor}
            floors={data.floors}
            rooms={floorRooms}
            walls={floorWalls}
            furniture={floorFurniture}
            semanticObjects={floorSemanticObjects}
            selectedFurnitureId={selectedFurniture?.id ?? ""}
            selectedSemanticObjectId={selectedSemanticObjectId}
            viewMode={viewMode}
            plannerMode={plannerMode}
            drawTool={drawTool}
            houseStructure={floorHouseStructure}
            wallSyncOverrides={wallSyncOverrides}
            floorPlanVisualSettings={floorPlanVisualSettings}
            cleanPatches={floorCleanPatches}
            focusMode={focusMode}
            locateObjectRequest={locateObjectRequest}
            canUndo={Boolean(pendingHistoryBaseRef.current[selectedFloorId] || floorHistory.past.length)}
            canRedo={floorHistory.future.length > 0}
            onScaleChange={handleScaleChange}
            onFocusModeChange={setFocusMode}
            onSelectFloor={handleFloorChange}
            onActiveObjectChange={setActiveObjectId}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onPlannerModeChange={setPlannerMode}
            onDrawToolChange={setDrawTool}
            onHouseStructureChange={handleHouseStructureChange}
            onWallSyncOverridesChange={handleWallSyncOverridesChange}
            onFloorPlanVisualSettingsChange={handleFloorPlanVisualSettingsChange}
            onCleanPatchesChange={handleCleanPatchesChange}
            onSelectFurniture={handleFurnitureSelect}
            onFurnitureChange={handleFloorFurnitureChange}
            onSelectSemanticObject={handleSemanticObjectSelect}
            onMoveSemanticObject={handleMoveSemanticObject}
          />
        </section>

        {!focusMode && <aside className="hidden overflow-y-auto border-l border-stone-200/80 bg-slate-50/80 p-4 lg:block">
          <div className="space-y-3">
            <div className="px-1 pb-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Inspector</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">结构检查器</h2>
            </div>

            <RightPanelCard
              id="workflow"
              eyebrow="Workflow"
              title="图纸逻辑"
              summary="先建结构模型，再派生施工和展示"
              open={openRightPanels.workflow}
              onToggle={toggleRightPanel}
            >
              <div className="space-y-2 text-xs leading-5 text-stone-600">
                <div className="rounded-xl bg-blue-50 p-3 text-blue-800">
                  <p className="font-semibold">当前重点：空白结构</p>
                  <p className="mt-1">只画墙、门窗、楼梯、院子边界和室外硬地/绿化，保证对象带 ID、可选择、可校验。</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-ink">施工标注</p>
                  <p className="mt-1">不单独重画一张 CAD 图，后续从结构模型派生尺寸、洞口、拆改和备注。</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-ink">家具与效果</p>
                  <p className="mt-1">家具和硬装模块都作为独立对象；可按采购款式继续调整尺寸、颜色和材质。</p>
                </div>
              </div>
            </RightPanelCard>

            <RightPanelCard
              id="status"
              eyebrow="Validator"
              title="模型状态"
              summary={`${houseValidation.errors.length} 错误 · ${houseValidation.warnings.length} 警告`}
              open={openRightPanels.status}
              onToggle={toggleRightPanel}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${houseValidation.valid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {houseValidation.valid ? "结构通过" : "需检查"}
                </span>
                <button className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink/90" onClick={handleAutoRepairHouse} type="button">
                  自动修复
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-red-50 px-3 py-2 text-red-700">
                  <p className="font-semibold">{houseValidation.errors.length}</p>
                  <p>错误</p>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700">
                  <p className="font-semibold">{houseValidation.warnings.length}</p>
                  <p>警告</p>
                </div>
              </div>
              <div className="mt-3 max-h-96 space-y-2 overflow-auto pr-1">
                {[...houseValidation.errors, ...houseValidation.warnings].map((issue, index) => (
                  <button key={`${issue.type}-${issue.id}-${index}`} className="block w-full rounded-xl bg-slate-50 p-2 text-left text-xs leading-5 text-slate-600 transition hover:bg-blue-50" onClick={() => locateValidationObject(issue.id)} type="button">
                    <p className="font-semibold text-ink">{issue.type} · {issue.id}</p>
                    <p>{issue.message}</p>
                    <p className="mt-1 font-semibold text-blue-600">定位对象</p>
                  </button>
                ))}
                {houseValidation.errors.length + houseValidation.warnings.length === 0 && (
                  <p className="rounded-xl bg-slate-50 p-2 text-xs leading-5 text-slate-500">当前楼层未发现结构表达错误。</p>
                )}
              </div>
              {validatorRepairLog.length > 0 && (
                <div className="mt-3 max-h-56 space-y-1 overflow-auto rounded-xl bg-slate-50 p-2 pr-1 text-xs leading-5 text-slate-600">
                  <p className="font-semibold text-ink">修复记录</p>
                  {validatorRepairLog.map((item, index) => (
                    <p key={`${item}-${index}`}>{item}</p>
                  ))}
                </div>
              )}
            </RightPanelCard>

            <RightPanelCard
              id="modules"
              eyebrow="Library"
              title="物品模块库"
              summary={`${interiorModuleCatalog.length} 个模块 · ${moduleTargetLabel}`}
              open={openRightPanels.modules}
              onToggle={toggleRightPanel}
            >
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                  <span className="font-semibold text-ink">目标</span>
                  <span className="ml-2">{moduleTargetLabel}</span>
                </div>
                {moduleCatalogGroups.map(({ category, items }) => (
                  <div key={category} className="rounded-xl border border-stone-200 bg-white p-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink">{interiorModuleCategoryLabels[category]}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((item) => {
                        const activeServices = serviceRequirementLabels.filter((service) => item.serviceRequirements[service.key]);
                        return (
                          <div key={item.id} className="rounded-lg bg-slate-50 p-2">
                            <div className="flex items-start gap-2">
                              <FurnitureTopView className="mt-0.5 h-16 w-20 shrink-0 border border-white shadow-sm" color={item.color} label={item.codePrefix} type={item.furnitureType} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-ink">{item.name}</p>
                                    <p className="mt-0.5 text-[11px] text-stone-500">{item.dimensions.width} x {item.dimensions.depth} x {item.dimensions.height} cm</p>
                                  </div>
                                  <button className="shrink-0 rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-ink/90" onClick={() => addModuleFromCatalog(item)} type="button">
                                    添加
                                  </button>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {(activeServices.length ? activeServices : [{ key: "power" as const, label: "无机电" }]).map((service) => (
                                    <span key={`${item.id}-${service.label}`} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                                      {service.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </RightPanelCard>

            <RightPanelCard
              id="object"
              eyebrow="Selection"
              title="当前对象"
              summary={activeObjectSummary}
              open={openRightPanels.object}
              onToggle={toggleRightPanel}
            >
              {(activeStructureObject || activeFurniture || floorStructureRooms.length > 0) ? (
                <div>
                  {activeObjectId && <p className="break-all rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">{activeObjectId}</p>}
                  {floorStructureRooms.length > 0 && (
                    <label className="mt-3 block text-xs text-stone-500">
                      房间快速选择
                      <select
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400"
                        value={activeRoomObject?.id ?? ""}
                        onChange={(event) => selectRoomForNaming(event.target.value)}
                      >
                        <option value="">选择当前楼层房间</option>
                        {floorStructureRooms.map((room) => (
                          <option key={room.id} value={room.id}>{room.roomNumber} · {room.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {activeRoomObject ? (
                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-blue-900">房间命名</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700">{(activeRoomObject.area / 1_000_000).toFixed(2)} m2</span>
                      </div>
                      <label className="mt-3 block text-xs text-stone-500">
                        房间编号
                        <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" placeholder="例如：R-1F-002" value={activeRoomObject.roomNumber} onChange={(event) => updateActiveObject({ roomNumber: event.target.value })} />
                      </label>
                      <label className="mt-3 block text-xs text-stone-500">
                        房间名称
                        <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" placeholder="例如：厨房" value={activeRoomObject.name} onChange={(event) => updateActiveObject({ name: event.target.value })} />
                      </label>
                      <p className="mt-2 text-xs leading-5 text-blue-800">输入后会在房间标签和对象台账里同步显示，改完记得点保存。</p>
                    </div>
                  ) : activeFurniture ? (
                    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                      <div className="flex items-center gap-3">
                        <FurnitureTopView className="size-16 shrink-0 border border-white shadow-sm" color={activeFurniture.color} label={activeFurniture.code} type={activeFurniture.type} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-emerald-900">{activeFurniture.moduleCategory ? "物品模块" : "家具对象"}</p>
                          <p className="mt-1 truncate text-sm font-semibold text-ink">{activeFurniture.name}</p>
                        </div>
                      </div>
                      <label className="mt-3 block text-xs text-stone-500">
                        名称
                        <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" value={activeFurniture.name} onChange={(event) => updateActiveObject({ name: event.target.value })} />
                      </label>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {([
                          ["width", "宽 cm"],
                          ["depth", "深 cm"],
                          ["height", "高 cm"]
                        ] as const).map(([field, label]) => (
                          <label key={field} className="block text-xs text-stone-500">
                            {label}
                            <input
                              className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2 font-semibold text-ink outline-none focus:border-blue-400"
                              min="1"
                              type="number"
                              value={activeFurniture.dimensions[field]}
                              onChange={(event) => updateActiveObject({
                                dimensions: {
                                  ...activeFurniture.dimensions,
                                  [field]: Math.max(1, Number(event.target.value) || 1)
                                }
                              })}
                            />
                          </label>
                        ))}
                      </div>
                      <label className="mt-3 block text-xs text-stone-500">
                        颜色
                        <div className="mt-1 flex items-center gap-2">
                          <input className="h-10 w-14 rounded-lg border border-stone-200 bg-white p-1" type="color" value={activeFurniture.color} onChange={(event) => updateActiveObject({ color: event.target.value })} />
                          <input className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" value={activeFurniture.color} onChange={(event) => updateActiveObject({ color: event.target.value })} />
                        </div>
                      </label>
                      <label className="mt-3 block text-xs text-stone-500">
                        材质
                        <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" value={activeFurniture.material} onChange={(event) => updateActiveObject({ material: event.target.value })} />
                      </label>
                      <label className="mt-3 block text-xs text-stone-500">
                        备注
                        <textarea className="mt-1 min-h-20 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" value={activeFurniture.note} onChange={(event) => updateActiveObject({ note: event.target.value, constructionNote: event.target.value })} />
                      </label>
                    </div>
                  ) : activeStructureObject ? (
                    <label className="mt-3 block text-xs text-stone-500">
                      名称
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" value={activeStructureObject.name} onChange={(event) => updateActiveObject({ name: event.target.value })} />
                    </label>
                  ) : (
                    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-stone-500">选择一个房间后，可以在这里输入名称，例如“厨房”。</p>
                  )}
                  {activeStructureObject && "thickness" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      厚度 mm
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" min="20" type="number" value={activeStructureObject.thickness} onChange={(event) => updateActiveObject({ thickness: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "height" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      高度 mm
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" min="100" type="number" value={activeStructureObject.height} onChange={(event) => updateActiveObject({ height: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "length" in activeStructureObject && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">长度：{activeStructureObject.length} mm</p>}
                  {activeStructureObject && "radius" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      弧墙半径 mm
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" min="100" type="number" value={activeStructureObject.radius} onChange={(event) => updateActiveObject({ radius: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "startAngle" in activeStructureObject && "endAngle" in activeStructureObject && "direction" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      弧度角度
                      <input
                        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400"
                        max="180"
                        min="10"
                        step="5"
                        type="number"
                        value={Math.round(Math.abs(activeStructureObject.endAngle - activeStructureObject.startAngle))}
                        onChange={(event) => {
                          const nextAngle = Math.min(180, Math.max(10, Number(event.target.value) || 90));
                          updateActiveObject({
                            endAngle: activeStructureObject.startAngle + (activeStructureObject.direction === "clockwise" ? nextAngle : -nextAngle)
                          });
                        }}
                      />
                    </label>
                  )}
                  {activeStructureObject && "startAngle" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      起始角度
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" type="number" value={activeStructureObject.startAngle} onChange={(event) => updateActiveObject({ startAngle: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "endAngle" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      结束角度
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" type="number" value={activeStructureObject.endAngle} onChange={(event) => updateActiveObject({ endAngle: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "direction" in activeStructureObject && "radius" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      弧线方向
                      <select className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" value={activeStructureObject.direction} onChange={(event) => updateActiveObject({ direction: event.target.value })}>
                        <option value="clockwise">顺时针</option>
                        <option value="counterclockwise">逆时针</option>
                      </select>
                    </label>
                  )}
                  {activeStructureObject && "width" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      宽度 mm
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" min="200" type="number" value={activeStructureObject.width} onChange={(event) => updateActiveObject({ width: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "depth" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      进深 mm
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" min="100" type="number" value={activeStructureObject.depth} onChange={(event) => updateActiveObject({ depth: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "stepCount" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      踏步数
                      <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" min="1" type="number" value={activeStructureObject.stepCount} onChange={(event) => updateActiveObject({ stepCount: Number(event.target.value) })} />
                    </label>
                  )}
                  {activeStructureObject && "stepCount" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      方向
                      <select className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" value={activeStructureObject.direction} onChange={(event) => updateActiveObject({ direction: event.target.value })}>
                        <option value="up">上行</option>
                        <option value="down">下行</option>
                      </select>
                    </label>
                  )}
                  {activeStructureObject && "openDirection" in activeStructureObject && (
                    <label className="mt-3 block text-xs text-stone-500">
                      开启方向
                      <select className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" value={String(activeStructureObject.openDirection)} onChange={(event) => updateActiveObject({ openDirection: event.target.value })}>
                        <option value="leftIn">左内开</option>
                        <option value="rightIn">右内开</option>
                        <option value="leftOut">左外开</option>
                        <option value="rightOut">右外开</option>
                      </select>
                    </label>
                  )}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-stone-500">在画布或对象台账里选择一个结构对象后，这里会显示可编辑属性。</p>
              )}
            </RightPanelCard>

            <RightPanelCard
              id="details"
              eyebrow="Floor"
              title="楼层与家具"
              summary={`${currentFloor.label} · ${selectedFurniture?.name ?? "无家具选择"}`}
              open={openRightPanels.details}
              onToggle={toggleRightPanel}
            >
              <FurnitureDetails floor={currentFloor} floorPlanScale={floorPlanScale} furniture={selectedFurniture} semanticObject={selectedSemanticObject} onFurnitureChange={handleFurnitureUpdate} />
            </RightPanelCard>

            <RightPanelCard
              id="semantic"
              eyebrow="Map"
              title="语义对象"
              summary={`${floorSemanticObjects.length} 个对象`}
              open={openRightPanels.semantic}
              onToggle={toggleRightPanel}
            >
              <SemanticMapPanel
                floorId={selectedFloorId}
                objects={floorSemanticObjects}
                allObjects={semanticObjects}
                floors={data.floors}
                selectedObjectId={selectedSemanticObjectId}
                onSelectObject={setSelectedSemanticObjectId}
                onCreateObject={handleCreateSemanticObject}
                onUpdateObject={handleUpdateSemanticObject}
                onDeleteObject={handleDeleteSemanticObject}
              />
            </RightPanelCard>
          </div>
        </aside>}
      </section>

      <MobileDetailsDrawer
        floor={currentFloor}
        floorPlanScale={floorPlanScale}
        furniture={selectedFurniture}
        semanticObject={activeFurniture ? null : selectedSemanticObject}
        semanticObjects={floorSemanticObjects}
        moduleCatalogGroups={moduleCatalogGroups}
        moduleTargetLabel={moduleTargetLabel}
        onAddModule={addModuleFromCatalog}
        onFurnitureChange={handleFurnitureUpdate}
        onDeleteFurniture={handleDeleteFurniture}
        onRotateFurniture={handleRotateFurniture}
      />
    </main>
  );
}
