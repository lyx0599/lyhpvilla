"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
import type { CleanPatch, DrawTool, FloorId, FloorPlanVisualSettings, Furniture, HouseRoom, HouseStructure, InteriorModuleCategory, PlannerMode, SpaceData, ViewMode, WardrobeCellKind, WardrobeDesign } from "@/types/space";
import type { SemanticObject } from "@/types/semantic-map";

type ModelSnapshot = {
  structure: HouseStructure;
  furniture: Furniture[];
};

type FloorHistory = {
  past: ModelSnapshot[];
  future: ModelSnapshot[];
};

type RightPanelKey = "floors" | "status" | "modules" | "object" | "semantic";

const WEB_WORKSPACE_SCHEMA_VERSION = 2;
const WEB_WORKSPACE_STORAGE_KEY = "villa-space-web-workspace-v3-courtyard-fence";
const WEB_WORKSPACE_STABLE_KEY = "villa-space-web-workspace-stable";
const WEB_WORKSPACE_DRAFT_KEY = "villa-space-web-workspace-draft";
const WEB_WORKSPACE_STORAGE_KEYS = [
  WEB_WORKSPACE_STORAGE_KEY,
  WEB_WORKSPACE_STABLE_KEY,
  "villa-space-web-workspace-v2",
  "villa-space-web-workspace"
];
const GITHUB_SOLIDIFY_OWNER = "lyx0599";
const GITHUB_SOLIDIFY_REPO = "lyhpvilla";
const GITHUB_SOLIDIFY_BRANCH = "main";
const GITHUB_SOLIDIFY_PATH = "data/default-workspace.json";
const GITHUB_SOLIDIFY_TOKEN_KEY = "villa-space-github-solidify-token";
const moduleCategoryOrder: InteriorModuleCategory[] = ["living", "bedroom", "kitchen", "bath", "storage", "decor"];
const furnitureDimensionFields: Array<["width" | "depth" | "height", string]> = [
  ["width", "宽 cm"],
  ["depth", "深 cm"],
  ["height", "高 cm"]
];
const wardrobeCellLabels: Record<WardrobeCellKind, string> = {
  "hanging-long": "长衣",
  "hanging-short": "短衣",
  folded: "叠放",
  drawer: "抽屉",
  open: "开放",
  shoe: "鞋包",
  blank: "留空"
};
const wardrobeModuleDefaults: Record<WardrobeCellKind, { width: number; height: number; minWidth: number; minHeight: number }> = {
  "hanging-long": { width: 34, height: 72, minWidth: 22, minHeight: 56 },
  "hanging-short": { width: 34, height: 48, minWidth: 22, minHeight: 34 },
  folded: { width: 28, height: 24, minWidth: 18, minHeight: 14 },
  drawer: { width: 28, height: 16, minWidth: 18, minHeight: 10 },
  open: { width: 28, height: 24, minWidth: 16, minHeight: 12 },
  shoe: { width: 32, height: 18, minWidth: 20, minHeight: 12 },
  blank: { width: 22, height: 18, minWidth: 12, minHeight: 10 }
};

function createWardrobeCells(columns: number, rows: number, existing: WardrobeDesign["cells"] = []): WardrobeDesign["cells"] {
  return Array.from({ length: columns * rows }).map((_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const existingCell = existing.find((cell) => cell.column === column && cell.row === row);
    const kind: WardrobeCellKind = column === 0 ? (row <= 1 ? "hanging-long" : "hanging-short") : column === columns - 1 ? "folded" : row === rows - 1 ? "drawer" : "open";
    return existingCell ?? {
      id: `cell-${column}-${row}`,
      column,
      row,
      kind
    };
  });
}

function normalizeWardrobeDesign(design?: WardrobeDesign): WardrobeDesign {
  const columns = Math.min(6, Math.max(1, Math.round(design?.columns ?? 3)));
  const rows = Math.min(8, Math.max(1, Math.round(design?.rows ?? design?.shelfRows ?? 4)));
  const baseCells: WardrobeDesign["cells"] = design?.cells?.length
    ? design.cells
    : createWardrobeCells(columns, rows).map((cell) => {
      if ((design?.hangingZones ?? 1) > cell.column) return { ...cell, kind: (cell.row <= 1 ? "hanging-long" : "hanging-short") as WardrobeCellKind };
      if (cell.column >= columns - (design?.foldedZones ?? 1)) return { ...cell, kind: "folded" as WardrobeCellKind };
      if ((design?.drawerCount ?? 0) > 0 && cell.row === rows - 1) return { ...cell, kind: "drawer" as WardrobeCellKind };
      if (design?.shoeRack && cell.column === 0 && cell.row === rows - 1) return { ...cell, kind: "shoe" as WardrobeCellKind };
      return cell;
    });
  const legacyModules = baseCells.map((cell) => ({
    id: `module-${cell.column}-${cell.row}`,
    kind: cell.kind,
    x: Math.round((cell.column / columns) * 100),
    y: Math.round((cell.row / rows) * 100),
    width: Math.round(100 / columns),
    height: Math.round(100 / rows)
  }));
  return {
    columns,
    rows,
    cells: createWardrobeCells(columns, rows, baseCells),
    modules: design?.modules?.length ? design.modules : legacyModules,
    notes: design?.notes ?? "预留长衣区、短衣区和可调层板，深化时按实际衣物数量调整。"
  };
}

const defaultWardrobeDesign: WardrobeDesign = {
  columns: 3,
  rows: 4,
  cells: createWardrobeCells(3, 4),
  notes: "预留长衣区、短衣区和可调层板，深化时按实际衣物数量调整。"
};

type PersistedWebWorkspace = {
  schemaVersion?: number;
  savedAt?: string;
  saveMode?: "manual" | "draft" | "legacy";
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

function normalizeHouseStructure(floorId: FloorId, structure: HouseStructure | undefined, fallback?: HouseStructure): HouseStructure {
  const emptyStructure = fallback ?? createEmptyStructure(floorId);
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

function getWorkspaceStructureScore(workspace: Partial<PersistedWebWorkspace>) {
  const structures = (workspace.houseStructuresByFloor ?? {}) as Partial<Record<FloorId, Partial<HouseStructure>>>;
  return Object.values(structures).reduce<number>((score, structure) => {
    if (!structure) return score;
    return score +
      (structure.walls?.length ?? 0) * 4 +
      (structure.doors?.length ?? 0) * 3 +
      (structure.windows?.length ?? 0) * 2 +
      (structure.partitions?.length ?? 0) * 2 +
      (structure.stairs?.length ?? 0) * 2 +
      (structure.fences?.length ?? 0) +
      (structure.outdoorSurfaces?.length ?? 0) +
      (structure.outdoors?.length ?? 0);
  }, workspace.furniture?.length ?? 0);
}

function getWorkspaceTimestamp(workspace: Partial<PersistedWebWorkspace>) {
  const timestamp = workspace.savedAt ? Date.parse(workspace.savedAt) : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function pickBestWorkspace(candidates: Partial<PersistedWebWorkspace>[]) {
  return candidates
    .filter((workspace): workspace is Partial<PersistedWebWorkspace> & Pick<PersistedWebWorkspace, "houseStructuresByFloor"> => Boolean(workspace.houseStructuresByFloor))
    .sort((left, right) => {
      const timeDelta = getWorkspaceTimestamp(right) - getWorkspaceTimestamp(left);
      if (timeDelta !== 0) return timeDelta;
      return getWorkspaceStructureScore(right) - getWorkspaceStructureScore(left);
    })[0] ?? null;
}

function encodeUtf8Base64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.slice(index, index + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
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
  const [furnitureImmersiveMode, setFurnitureImmersiveMode] = useState(false);
  const [showFurnitureLabels, setShowFurnitureLabels] = useState(true);
  const [command, setCommand] = useState("");
  const [activeObjectId, setActiveObjectId] = useState("");
  const [wardrobeDesignFurnitureId, setWardrobeDesignFurnitureId] = useState("");
  const [locateObjectRequest, setLocateObjectRequest] = useState<{ id: string; nonce: number } | null>(null);
  const [hasLoadedWebWorkspace, setHasLoadedWebWorkspace] = useState(false);
  const [webSaveStatus, setWebSaveStatus] = useState<"loading" | "saved" | "dirty" | "saving" | "error">("loading");
  const [defaultWorkspacePayload, setDefaultWorkspacePayload] = useState("");
  const [openRightPanels, setOpenRightPanels] = useState<Record<RightPanelKey, boolean>>({
    floors: true,
    status: true,
    modules: true,
    object: true,
    semantic: false
  });
  const [openModuleCategories, setOpenModuleCategories] = useState<Record<InteriorModuleCategory, boolean>>({
    living: true,
    bedroom: false,
    kitchen: false,
    bath: false,
    storage: false,
    decor: false
  });
  const [historyByFloor, setHistoryByFloor] = useState<Partial<Record<FloorId, FloorHistory>>>({});
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHistoryBaseRef = useRef<Partial<Record<FloorId, ModelSnapshot>>>({});
  const suppressHistoryRef = useRef(false);
  const suppressDirtyStatusRef = useRef(true);
  const latestWorkspaceRef = useRef<PersistedWebWorkspace | null>(null);
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
  const wardrobeDesignFurniture = floorFurniture.find((item) => item.id === wardrobeDesignFurnitureId) ?? null;
  const wardrobeDesign = normalizeWardrobeDesign(wardrobeDesignFurniture?.wardrobeDesign);
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
  const floorFurnitureByCategory = useMemo(() => (
    moduleCategoryOrder.reduce((countsByCategory, category) => {
      countsByCategory[category] = floorFurniture.filter((item) => item.moduleCategory === category).length;
      return countsByCategory;
    }, {} as Record<InteriorModuleCategory, number>)
  ), [floorFurniture]);
  const moduleTargetRoom = activeRoomObject ?? (activeFurniture ? floorStructureRooms.find((room) => room.id === activeFurniture.roomId) ?? null : null);
  const moduleTargetLabel = moduleTargetRoom ? `${moduleTargetRoom.roomNumber} · ${moduleTargetRoom.name}` : "画布中心";
  const activeFurnitureArea = activeFurniture ? (activeFurniture.dimensions.width * activeFurniture.dimensions.depth / 10_000).toFixed(2) : "0.00";
  const activeObjectSummary = activeRoomObject
    ? `${activeRoomObject.roomNumber} · ${activeRoomObject.name}`
    : activeFurniture
      ? `${activeFurniture.code} · ${activeFurniture.name}`
      : activeObjectId || "未选择对象";

  useEffect(() => {
    try {
      const workspaceCandidates = [...WEB_WORKSPACE_STORAGE_KEYS, WEB_WORKSPACE_DRAFT_KEY]
        .map((storageKey) => {
          const savedWorkspace = window.localStorage.getItem(storageKey);
          if (!savedWorkspace) return null;
          try {
            return JSON.parse(savedWorkspace) as Partial<PersistedWebWorkspace>;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Partial<PersistedWebWorkspace>[];
      const parsed = pickBestWorkspace(workspaceCandidates);
      if (!parsed) {
        setHasLoadedWebWorkspace(true);
        setWebSaveStatus("saved");
        return;
      }

      const nextStructures = data.floors.reduce((structuresByFloor, floor) => {
        structuresByFloor[floor.id] = normalizeHouseStructure(floor.id, parsed.houseStructuresByFloor?.[floor.id], initialHouseStructures[floor.id]);
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
    latestWorkspaceRef.current = getCurrentWorkspace("draft");
    setDefaultWorkspacePayload(JSON.stringify(getCurrentWorkspace("manual"), null, 2));
    const draftTimer = window.setTimeout(() => {
      if (latestWorkspaceRef.current) {
        persistWorkspace(latestWorkspaceRef.current, "draft");
      }
    }, 700);
    return () => window.clearTimeout(draftTimer);
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
    function saveDraftBeforeUnload() {
      if (!latestWorkspaceRef.current) return;
      persistWorkspace(latestWorkspaceRef.current, "draft");
    }
    window.addEventListener("beforeunload", saveDraftBeforeUnload);
    return () => window.removeEventListener("beforeunload", saveDraftBeforeUnload);
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

  function handleFocusYard(yard: "north" | "south") {
    setSelectedFloorId("1F");
    setSelectedFurnitureId("");
    setSelectedSemanticObjectId("");
    setDrawTool("select");
    setPlannerMode("edit");
    const objectId = yard === "north" ? "OD-1F-NORTH-001" : "OD-1F-SOUTH-001";
    setActiveObjectId(objectId);
    setLocateObjectRequest({ id: objectId, nonce: Date.now() });
    setValidatorRepairLog([yard === "north" ? "已定位北院，当前显示 1F 总平面中的入户庭院。" : "已定位南院，当前显示 1F 总平面中的生活庭院。"]);
  }

  function findCatalogItemByNaturalText(command: string) {
    const normalized = command.toLowerCase();
    return interiorModuleCatalog.find((item) => (
      normalized.includes(item.name.toLowerCase()) ||
      normalized.includes(item.moduleType.toLowerCase()) ||
      normalized.includes(item.furnitureType.toLowerCase()) ||
      normalized.includes(item.codePrefix.toLowerCase())
    )) ?? interiorModuleCatalog.find((item) => {
      const aliases: Record<string, string[]> = {
        sofa: ["沙发"],
        table: ["餐桌", "桌"],
        bed: ["床"],
        nightstand: ["床头柜", "床边柜"],
        island: ["中岛", "岛台"],
        cooktop: ["灶", "灶台"],
        sink: ["水槽", "洗菜盆"],
        fridge: ["冰箱"],
        wardrobe: ["衣柜"],
        entryCabinet: ["玄关柜", "鞋柜"],
        sideboard: ["餐边柜"],
        plant: ["绿植", "植物"],
        toilet: ["马桶"],
        bathtub: ["浴缸"],
        shower: ["淋浴"],
        vanity: ["台盆", "浴室柜"]
      };
      return aliases[item.moduleType]?.some((alias) => command.includes(alias));
    }) ?? null;
  }

  function handleNaturalCommand(command: string) {
    const catalogItem = findCatalogItemByNaturalText(command);
    if (!catalogItem) {
      setValidatorRepairLog([`没有识别到家具类型：${command}。可以试试“添加一个沙发”或“删除餐桌”。`]);
      return;
    }

    const isDelete = /删除|删掉|移除|去掉|不要/.test(command);
    if (isDelete) {
      const target = [...floorFurniture].reverse().find((item) => item.catalogId === catalogItem.id || item.type === catalogItem.furnitureType || item.name.includes(catalogItem.name));
      if (!target) {
        setValidatorRepairLog([`当前楼层没有找到可删除的${catalogItem.name}。`]);
        return;
      }
      handleFloorFurnitureChange(floorFurniture.filter((item) => item.id !== target.id));
      setSelectedFurnitureId("");
      setActiveObjectId("");
      setValidatorRepairLog([`已删除 ${target.code} · ${target.name}。`]);
      return;
    }

    addModuleFromCatalog(catalogItem);
    setValidatorRepairLog([`已添加 ${catalogItem.name}。可以在“家具布置”图里拖动位置，右侧“当前对象”里改尺寸材质。`]);
  }

  function getCurrentWorkspace(saveMode: PersistedWebWorkspace["saveMode"] = "manual"): PersistedWebWorkspace {
    return {
      schemaVersion: WEB_WORKSPACE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      saveMode,
      selectedFloorId,
      furniture,
      semanticObjects,
      visualSettingsByFloor,
      cleanPatchesByFloor,
      houseStructuresByFloor,
      wallSyncOverrides
    };
  }

  function finalizeWorkspace(workspace: PersistedWebWorkspace, saveMode: "manual" | "draft") {
    return {
      ...workspace,
      schemaVersion: WEB_WORKSPACE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      saveMode
    };
  }

  function persistWorkspace(workspace: PersistedWebWorkspace, saveMode: "manual" | "draft") {
    const finalizedWorkspace = finalizeWorkspace(workspace, saveMode);
    const payload = JSON.stringify(finalizedWorkspace);
    const storageKeys = saveMode === "manual"
      ? [...WEB_WORKSPACE_STORAGE_KEYS, WEB_WORKSPACE_DRAFT_KEY]
      : [WEB_WORKSPACE_DRAFT_KEY];
    storageKeys.forEach((storageKey) => window.localStorage.setItem(storageKey, payload));
    return finalizedWorkspace;
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

  function getGitHubSolidifyToken() {
    const existingToken = window.sessionStorage.getItem(GITHUB_SOLIDIFY_TOKEN_KEY);
    if (existingToken) return existingToken;
    const token = window.prompt("输入 GitHub 写入令牌，用于把当前户型固化到仓库。需要 Contents 读写权限。");
    if (!token?.trim()) return null;
    window.sessionStorage.setItem(GITHUB_SOLIDIFY_TOKEN_KEY, token.trim());
    return token.trim();
  }

  async function commitDefaultWorkspaceToGitHub(defaultWorkspacePayload: string) {
    const token = getGitHubSolidifyToken();
    if (!token) {
      downloadJsonFile("default-workspace.json", JSON.parse(defaultWorkspacePayload));
      return { mode: "download" as const };
    }

    const apiUrl = `https://api.github.com/repos/${GITHUB_SOLIDIFY_OWNER}/${GITHUB_SOLIDIFY_REPO}/contents/${GITHUB_SOLIDIFY_PATH}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    const currentFileResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(GITHUB_SOLIDIFY_BRANCH)}`, { headers });
    if (!currentFileResponse.ok) {
      window.sessionStorage.removeItem(GITHUB_SOLIDIFY_TOKEN_KEY);
      throw new Error(`GitHub 读取默认户型失败：${currentFileResponse.status}`);
    }
    const currentFile = await currentFileResponse.json() as { sha?: string };
    if (!currentFile.sha) throw new Error("GitHub 没有返回默认户型文件版本。");

    const updateResponse = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        branch: GITHUB_SOLIDIFY_BRANCH,
        message: `Solidify villa workspace ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
        content: encodeUtf8Base64(defaultWorkspacePayload),
        sha: currentFile.sha
      })
    });
    if (!updateResponse.ok) {
      if (updateResponse.status === 401 || updateResponse.status === 403) {
        window.sessionStorage.removeItem(GITHUB_SOLIDIFY_TOKEN_KEY);
      }
      throw new Error(`GitHub 写入默认户型失败：${updateResponse.status}`);
    }
    const result = await updateResponse.json() as { commit?: { html_url?: string; sha?: string } };
    return { mode: "github" as const, url: result.commit?.html_url ?? "", sha: result.commit?.sha ?? "" };
  }

  async function solidifyDefaultWorkspace() {
    if (!hasLoadedWebWorkspace) return;
    setWebSaveStatus("saving");
    try {
      const workspace = getCurrentWorkspace("manual");
      const savedWorkspace = persistWorkspace(workspace, "manual");
      latestWorkspaceRef.current = savedWorkspace;
      const defaultWorkspacePayload = JSON.stringify(savedWorkspace, null, 2);
      setDefaultWorkspacePayload(defaultWorkspacePayload);
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(defaultWorkspacePayload);
        } catch {
          // Clipboard access depends on browser permissions; the hidden payload still keeps the default workspace available.
        }
      }
      const solidifyResult = await commitDefaultWorkspaceToGitHub(defaultWorkspacePayload);
      setWebSaveStatus("saved");
      setValidatorRepairLog([
        solidifyResult.mode === "github"
          ? `已提交到 GitHub 默认户型。${solidifyResult.sha ? `Commit ${solidifyResult.sha.slice(0, 7)}` : ""}`
          : "已生成默认户型文件。GitHub 写入令牌为空，所以改为下载文件。"
      ]);
    } catch (error) {
      setWebSaveStatus("error");
      setValidatorRepairLog([error instanceof Error ? error.message : "固化失败：请检查 GitHub 写入令牌或网络连接。"]);
    }
  }

  function handleFurnitureSelect(furniture: Furniture) {
    if (activeObjectId === furniture.id) {
      setActiveObjectId("");
      setOpenRightPanels((currentPanels) => ({
        ...currentPanels,
        object: false
      }));
      return;
    }
    setSelectedFurnitureId(furniture.id);
    setSelectedSemanticObjectId("");
    setActiveObjectId(furniture.id);
    setOpenRightPanels((currentPanels) => ({
      ...currentPanels,
      object: true
    }));
  }

  function handleFurnitureUpdate(nextFurniture: Furniture) {
    handleFloorFurnitureChange(floorFurniture.map((item) => item.id === nextFurniture.id ? nextFurniture : item));
    setSelectedFurnitureId(nextFurniture.id);
    setActiveObjectId(nextFurniture.id);
  }

  function readFurnitureReferenceImage(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.onload = () => {
        const rawDataUrl = String(reader.result ?? "");
        const image = new Image();
        image.onload = () => {
          const maxSize = 900;
          const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * ratio));
          canvas.height = Math.max(1, Math.round(image.height * ratio));
          const context = canvas.getContext("2d");
          if (!context) {
            resolve(rawDataUrl);
            return;
          }
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        image.onerror = () => reject(new Error("图片解析失败"));
        image.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleActiveFurnitureImageUpload(file: File | undefined) {
    if (!file || !activeFurniture || activeFurniture.locked) return;
    try {
      const dataUrl = await readFurnitureReferenceImage(file);
      updateActiveFurniture((item) => ({
        ...item,
        referenceImageDataUrl: dataUrl,
        referenceImageName: file.name,
        recognitionStatus: "image-attached",
        recognitionNote: "已保存真实家具图片；当前先按图片作为平面参考显示，后续接入 AI 后可自动识别轮廓、抠图和生成 3D 参考。"
      }));
      setValidatorRepairLog([`已上传 ${activeFurniture.name} 的参考图片：${file.name}。`]);
    } catch (error) {
      setValidatorRepairLog([error instanceof Error ? error.message : "图片上传失败，请换一张图片试试。"]);
    }
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
    setFurnitureImmersiveMode(true);
    setOpenRightPanels((currentPanels) => ({
      ...currentPanels,
      object: true
    }));
  }

  function toggleRightPanel(panelId: RightPanelKey) {
    setOpenRightPanels((currentPanels) => ({
      ...currentPanels,
      [panelId]: !currentPanels[panelId]
    }));
  }

  function toggleModuleCategory(category: InteriorModuleCategory) {
    setOpenModuleCategories((currentCategories) => ({
      ...currentCategories,
      [category]: !currentCategories[category]
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

  function updateActiveFurniture(updater: (item: Furniture) => Furniture) {
    if (!activeFurniture || activeFurniture.locked) return;
    handleFloorFurnitureChange(floorFurniture.map((item) => item.id === activeFurniture.id ? updater(item) : item));
    setSelectedFurnitureId(activeFurniture.id);
    setActiveObjectId(activeFurniture.id);
  }

  function nudgeActiveFurniture(delta: { x: number; y: number }) {
    updateActiveFurniture((item) => ({
      ...item,
      position: {
        ...item.position,
        x: Math.min(100, Math.max(0, item.position.x + delta.x)),
        y: Math.min(100, Math.max(0, item.position.y + delta.y))
      }
    }));
  }

  function rotateActiveFurniture(delta: number) {
    updateActiveFurniture((item) => ({
      ...item,
      position: {
        ...item.position,
        rotation: (item.position.rotation + delta + 360) % 360
      }
    }));
  }

  function flipActiveFurniture(axis: "x" | "y") {
    updateActiveFurniture((item) => ({
      ...item,
      position: {
        ...item.position,
        [axis === "x" ? "flipX" : "flipY"]: !item.position[axis === "x" ? "flipX" : "flipY"]
      }
    }));
  }

  function openWardrobeDesigner(furnitureId: string) {
    const target = furniture.find((item) => item.id === furnitureId);
    if (!target) return;
    setSelectedFloorId(target.floorId);
    setSelectedFurnitureId(target.id);
    setActiveObjectId(target.id);
    setWardrobeDesignFurnitureId(target.id);
    setFurnitureImmersiveMode(true);
    const normalizedDesign = normalizeWardrobeDesign(target.wardrobeDesign);
    if (JSON.stringify(target.wardrobeDesign) !== JSON.stringify(normalizedDesign)) {
      setFurniture((currentFurniture) => currentFurniture.map((item) => item.id === target.id ? { ...item, wardrobeDesign: normalizedDesign } : item));
    }
  }

  function updateWardrobeDesign(patch: Partial<WardrobeDesign>) {
    if (!wardrobeDesignFurniture || wardrobeDesignFurniture.locked) return;
    const nextDesign = normalizeWardrobeDesign({ ...wardrobeDesign, ...patch });
    handleFloorFurnitureChange(floorFurniture.map((item) => item.id === wardrobeDesignFurniture.id ? { ...item, wardrobeDesign: nextDesign } : item));
  }

  function updateWardrobeDimensions(field: "width" | "depth" | "height", value: number) {
    if (!wardrobeDesignFurniture || wardrobeDesignFurniture.locked) return;
    const nextDimensions = {
      ...wardrobeDesignFurniture.dimensions,
      [field]: Math.max(1, Math.round(value) || 1)
    };
    handleFloorFurnitureChange(floorFurniture.map((item) => item.id === wardrobeDesignFurniture.id ? { ...item, dimensions: nextDimensions } : item));
  }

  function resizeWardrobeGrid(field: "columns" | "rows", value: number) {
    const max = field === "columns" ? 6 : 8;
    const nextValue = Math.min(max, Math.max(1, Math.round(value) || 1));
    updateWardrobeDesign({ [field]: nextValue } as Partial<WardrobeDesign>);
  }

  function updateWardrobeCell(column: number, row: number, kind: WardrobeCellKind) {
    updateWardrobeDesign({
      cells: wardrobeDesign.cells.map((cell) => cell.column === column && cell.row === row ? { ...cell, kind } : cell)
    });
  }

  function wardrobeModulesOverlap(left: NonNullable<WardrobeDesign["modules"]>[number], right: NonNullable<WardrobeDesign["modules"]>[number]) {
    if (left.kind === "blank" || right.kind === "blank") return false;
    return left.x < right.x + right.width &&
      left.x + left.width > right.x &&
      left.y < right.y + right.height &&
      left.y + left.height > right.y;
  }

  function hasWardrobeModuleConflict(candidate: NonNullable<WardrobeDesign["modules"]>[number], modules: NonNullable<WardrobeDesign["modules"]>) {
    return modules.some((module) => module.id !== candidate.id && wardrobeModulesOverlap(candidate, module));
  }

  function getClampedWardrobeModule(module: NonNullable<WardrobeDesign["modules"]>[number], patch: Partial<NonNullable<WardrobeDesign["modules"]>[number]>) {
    const nextKind = patch.kind ?? module.kind;
    const limits = wardrobeModuleDefaults[nextKind];
    const nextWidth = Math.min(100, Math.max(limits.minWidth, Math.round(patch.width ?? module.width)));
    const nextHeight = Math.min(100, Math.max(limits.minHeight, Math.round(patch.height ?? module.height)));
    return {
      ...module,
      ...patch,
      kind: nextKind,
      width: nextWidth,
      height: nextHeight,
      x: Math.min(100 - nextWidth, Math.max(0, Math.round(patch.x ?? module.x))),
      y: Math.min(100 - nextHeight, Math.max(0, Math.round(patch.y ?? module.y)))
    };
  }

  function updateWardrobeModule(moduleId: string, patch: Partial<NonNullable<WardrobeDesign["modules"]>[number]>) {
    const modules = wardrobeDesign.modules ?? [];
    let blockedByOverlap = false;
    updateWardrobeDesign({
      modules: modules.map((module) => {
        if (module.id !== moduleId) return module;
        const candidate = getClampedWardrobeModule(module, patch);
        if (hasWardrobeModuleConflict(candidate, modules)) {
          blockedByOverlap = true;
          return module;
        }
        return candidate;
      })
    });
    if (blockedByOverlap) {
      setValidatorRepairLog(["模块不能与已有功能模块重叠；留空模块可以被覆盖。"]);
    }
  }

  function addWardrobeModule(kind: WardrobeCellKind) {
    const defaults = wardrobeModuleDefaults[kind];
    const modules = wardrobeDesign.modules ?? [];
    const nextId = `module-${Date.now()}`;
    let nextModule = {
      id: nextId,
      kind,
      x: 0,
      y: 0,
      width: defaults.width,
      height: defaults.height
    };
    for (let y = 0; y <= 100 - defaults.height; y += 1) {
      for (let x = 0; x <= 100 - defaults.width; x += 1) {
        const candidate = { ...nextModule, x, y };
        if (!hasWardrobeModuleConflict(candidate, modules)) {
          nextModule = candidate;
          updateWardrobeDesign({ modules: [...modules, nextModule] });
          return;
        }
      }
    }
    setValidatorRepairLog(["当前衣柜没有足够空位，先缩小、改成留空或删除模块后再添加。"]);
  }

  function removeWardrobeModule(moduleId: string) {
    updateWardrobeDesign({
      modules: (wardrobeDesign.modules ?? []).filter((module) => module.id !== moduleId)
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

  const isFurnitureWorkspace = furnitureImmersiveMode && !focusMode;

  return (
    <main className={`box-border h-screen overflow-hidden ${focusMode || isFurnitureWorkspace ? "p-0" : "p-3 sm:p-5 lg:p-6"}`}>
      {defaultWorkspacePayload ? (
        <pre className="hidden" data-testid="villa-default-workspace-payload">
          {defaultWorkspacePayload}
        </pre>
      ) : null}
      <section className={`mx-auto flex h-full min-h-0 flex-col overflow-hidden border border-white/70 bg-white/72 shadow-soft backdrop-blur ${
        focusMode
          ? "min-h-screen max-w-none rounded-none lg:grid lg:grid-cols-1"
          : isFurnitureWorkspace
            ? "min-h-screen max-w-none rounded-none lg:grid lg:grid-cols-[minmax(0,1fr)_340px]"
            : "max-w-7xl rounded-[2rem] lg:grid lg:grid-cols-[minmax(0,1fr)_320px]"
      }`}>
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!focusMode && !isFurnitureWorkspace && <header className="flex flex-col gap-3 border-b border-stone-200/80 p-4 sm:flex-row sm:items-center sm:justify-between lg:p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-clay">Villa Space Studio</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">户型结构网站工作台</h1>
              <p className="mt-1 text-sm text-stone-500">{currentFloor.label} · {currentFloor.subtitle} · 一套模型，多种表达</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-500 shadow-sm">
                <span className={`size-2 rounded-full ${webSaveStatus === "error" ? "bg-red-500" : webSaveStatus === "saving" || webSaveStatus === "loading" || webSaveStatus === "dirty" ? "bg-amber-500" : "bg-emerald-500"}`} />
                <span>{webSaveStatus === "error" ? "固化失败" : webSaveStatus === "saving" ? "固化中" : webSaveStatus === "loading" ? "加载中" : webSaveStatus === "dirty" ? "有未固化修改" : "已固化"}</span>
                <button className="rounded-lg px-2 py-1 text-stone-400 hover:bg-stone-100 hover:text-ink" onClick={downloadWorkspace} type="button">导出方案</button>
                <button className="rounded-lg bg-ink px-2 py-1 text-white hover:bg-clay disabled:bg-stone-300" disabled={webSaveStatus === "loading" || webSaveStatus === "saving"} onClick={solidifyDefaultWorkspace} type="button">固化默认户型</button>
              </div>
              <button className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100" onClick={() => setFurnitureImmersiveMode(true)} type="button">
                家具沉浸
              </button>
              <label className="flex flex-1 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm lg:hidden">
                <span className="shrink-0 text-stone-500">楼层</span>
                <select
                  className="w-full bg-transparent font-semibold text-ink outline-none"
                  value={selectedFloorId}
                  onChange={(event) => handleFloorChange(event.target.value as FloorId)}
                >
                  {data.floors.filter((floor) => floor.id !== "YARD").map((floor) => (
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
            furnitureImmersiveMode={isFurnitureWorkspace}
            showFurnitureLabels={showFurnitureLabels}
            activeFurnitureId={activeFurniture?.id ?? ""}
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
            onShowFurnitureLabelsChange={setShowFurnitureLabels}
            onOpenWardrobeDesigner={openWardrobeDesigner}
            onSelectSemanticObject={handleSemanticObjectSelect}
            onMoveSemanticObject={handleMoveSemanticObject}
          />
        </section>

        {!focusMode && <aside className="hidden h-full min-h-0 overflow-y-auto overscroll-contain border-l border-stone-200/80 bg-slate-50/80 p-4 lg:block">
          <div className="space-y-3">
            <div className="px-1 pb-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">{isFurnitureWorkspace ? "Furniture" : "Inspector"}</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{isFurnitureWorkspace ? "家具布置台" : "结构检查器"}</h2>
            </div>

            <RightPanelCard
              id="floors"
              eyebrow="Floors"
              title="楼层 / 庭院"
              summary={`${currentFloor.label} · ${currentFloor.subtitle}`}
              open={openRightPanels.floors}
              onToggle={toggleRightPanel}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {data.floors.filter((floor) => floor.id !== "YARD").map((floor) => {
                    const isActive = floor.id === selectedFloorId;
                    return (
                      <button
                        key={floor.id}
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          isActive
                            ? "border-clay bg-clay/10 text-ink"
                            : "border-stone-200 bg-white text-stone-500 hover:border-clay/40 hover:bg-stone-50"
                        }`}
                        onClick={() => handleFloorChange(floor.id)}
                        type="button"
                      >
                        <span className="block text-sm font-semibold">{floor.label}</span>
                        <span className="mt-0.5 block truncate text-[11px]">{floor.subtitle}</span>
                      </button>
                    );
                  })}
                </div>
                {!isFurnitureWorkspace && (
                  <>
                    <div className="grid grid-cols-2 gap-2 border-t border-stone-100 pt-3">
                      <button className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-left text-xs font-semibold text-stone-600 hover:bg-stone-50" onClick={() => handleFocusYard("north")} type="button">
                        北院
                        <span className="mt-0.5 block text-[11px] font-normal text-stone-400">入户庭院 · 2m</span>
                      </button>
                      <button className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-left text-xs font-semibold text-stone-600 hover:bg-stone-50" onClick={() => handleFocusYard("south")} type="button">
                        南院
                        <span className="mt-0.5 block text-[11px] font-normal text-stone-400">生活庭院 · 4m</span>
                      </button>
                    </div>
                    <div className="border-t border-stone-100 pt-3">
                      <p className="text-xs font-semibold text-ink">自然语言操作</p>
                      <textarea
                        className="mt-2 min-h-20 w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-clay"
                        placeholder="试试：添加一个沙发&#10;删除餐桌"
                        value={command}
                        onChange={(event) => setCommand(event.target.value)}
                        onKeyDown={(event) => {
                          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                            const text = command.trim();
                            if (text) {
                              handleNaturalCommand(text);
                              setCommand("");
                            }
                          }
                        }}
                      />
                      <button
                        className="mt-2 w-full rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-clay"
                        onClick={() => {
                          const text = command.trim();
                          if (!text) return;
                          handleNaturalCommand(text);
                          setCommand("");
                        }}
                        type="button"
                      >
                        执行
                      </button>
                    </div>
                  </>
                )}
              </div>
            </RightPanelCard>

            {isFurnitureWorkspace && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs leading-5 text-emerald-900">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">在线方案保存</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${webSaveStatus === "error" ? "bg-red-100 text-red-700" : webSaveStatus === "dirty" ? "bg-amber-100 text-amber-700" : "bg-white text-emerald-700"}`}>
                    {webSaveStatus === "error" ? "固化失败" : webSaveStatus === "dirty" ? "本机已草稿保存" : webSaveStatus === "saving" ? "固化中" : "已保存"}
                  </span>
                </div>
                <p className="mt-2">家具会自动存到这台电脑的浏览器里；要让 GitHub Pages 线上也长期保留，点“固化并发布默认方案”。</p>
                <button
                  className={`mt-3 w-full rounded-xl px-3 py-2 font-semibold ring-1 ring-emerald-100 ${
                    showFurnitureLabels ? "bg-emerald-700 text-white hover:bg-emerald-800" : "bg-white text-emerald-800 hover:bg-emerald-100"
                  }`}
                  onClick={() => setShowFurnitureLabels((visible) => !visible)}
                  type="button"
                >
                  家具标签：{showFurnitureLabels ? "显示中" : "已隐藏"}
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button className="rounded-xl bg-white px-3 py-2 font-semibold text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100" onClick={() => setFurnitureImmersiveMode(false)} type="button">退出沉浸</button>
                  <button className="rounded-xl bg-emerald-700 px-3 py-2 font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300" disabled={webSaveStatus === "loading" || webSaveStatus === "saving"} onClick={solidifyDefaultWorkspace} type="button">固化并发布</button>
                </div>
              </div>
            )}

            {!isFurnitureWorkspace && <RightPanelCard
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
            }

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
                {moduleCatalogGroups.map(({ category, items }) => {
                  const isOpen = openModuleCategories[category];
                  const placedCount = floorFurnitureByCategory[category] ?? 0;
                  return (
                    <div key={category} className="rounded-xl border border-stone-200 bg-white">
                      <button
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-stone-50"
                        onClick={() => toggleModuleCategory(category)}
                        type="button"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-ink">{interiorModuleCategoryLabels[category]}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-stone-500">{items.length} 个模块 · 当前楼层已放 {placedCount}</span>
                        </span>
                        <span className={`grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-stone-500 transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
                      </button>
                      {isOpen && (
                        <div className="space-y-2 border-t border-stone-100 p-2">
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
                      )}
                    </div>
                  );
                })}
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
              {(activeStructureObject || activeFurniture || (!isFurnitureWorkspace && floorStructureRooms.length > 0)) ? (
                <div>
                  {activeObjectId && <p className="break-all rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">{activeObjectId}</p>}
                  {!isFurnitureWorkspace && floorStructureRooms.length > 0 && (
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
                      <p className="mt-2 text-xs leading-5 text-blue-800">输入后会在房间标签和对象台账里同步显示，改完记得固化默认户型。</p>
                    </div>
	                  ) : activeFurniture ? (
	                    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
	                      <div className="flex items-center gap-3">
		                        <FurnitureTopView className="size-16 shrink-0 border border-white shadow-sm" color={activeFurniture.color} imageSrc={activeFurniture.referenceImageDataUrl} label={activeFurniture.code} type={activeFurniture.type} />
	                        <div className="min-w-0">
	                          <p className="text-xs font-semibold text-emerald-900">{activeFurniture.moduleCategory ? "物品模块" : "家具对象"}</p>
	                          <p className="mt-1 truncate text-sm font-semibold text-ink">{activeFurniture.name}</p>
	                          <p className="mt-1 text-xs font-semibold text-emerald-800">占地 {activeFurnitureArea} 平米 · 角度 {Math.round(activeFurniture.position.rotation)}°</p>
	                        </div>
	                      </div>
		                      <label className="mt-3 block text-xs text-stone-500">
	                        名称
	                        <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400" value={activeFurniture.name} onChange={(event) => updateActiveObject({ name: event.target.value })} />
	                      </label>
	                      <div className="mt-3 rounded-xl bg-white/70 p-2">
	                        <div className="flex items-center justify-between gap-2">
	                          <p className="text-xs font-semibold text-ink">真实家具图片</p>
	                          {activeFurniture.referenceImageDataUrl && (
	                            <button
	                              className="rounded-lg bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-200"
	                              onClick={() => updateActiveFurniture((item) => ({
	                                ...item,
	                                referenceImageDataUrl: undefined,
	                                referenceImageName: undefined,
	                                recognitionStatus: "none",
	                                recognitionNote: undefined
	                              }))}
	                              type="button"
	                            >
	                              移除
	                            </button>
	                          )}
	                        </div>
	                        {activeFurniture.referenceImageDataUrl ? (
	                          <div className="mt-2 overflow-hidden rounded-lg border border-stone-200 bg-white">
	                            <img alt={activeFurniture.referenceImageName ?? activeFurniture.name} className="max-h-32 w-full object-contain" src={activeFurniture.referenceImageDataUrl} />
	                          </div>
	                        ) : (
	                          <p className="mt-2 text-[11px] leading-4 text-stone-500">上传你想买的实物图后，平面图会优先显示这张图片。</p>
	                        )}
	                        <label className="mt-2 block cursor-pointer rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
	                          上传图片 / AI 识别入口
	                          <input
	                            accept="image/*"
	                            className="hidden"
	                            disabled={activeFurniture.locked}
	                            onChange={(event) => {
	                              void handleActiveFurnitureImageUpload(event.target.files?.[0]);
	                              event.currentTarget.value = "";
	                            }}
	                            type="file"
	                          />
	                        </label>
	                        <p className="mt-2 text-[11px] leading-4 text-stone-500">
	                          {activeFurniture.recognitionNote ?? "当前先保存图片并作为模型中的平面参考；接入 AI 后可自动抠出家具轮廓并给 3D 预览使用。"}
	                        </p>
	                      </div>
		                      <div className="mt-3 grid grid-cols-3 gap-2">
	                        {furnitureDimensionFields.map(([field, label]) => (
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
	                                  [field]: Math.max(1, Math.round(Number(event.target.value)) || 1)
	                                }
	                              })}
	                            />
	                          </label>
	                        ))}
	                      </div>
	                      <div className="mt-3 rounded-xl bg-white/70 p-2">
	                        <p className="text-xs font-semibold text-ink">移动</p>
	                        <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
	                          <span />
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => nudgeActiveFurniture({ x: 0, y: -1 })} type="button">上</button>
	                          <span />
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => nudgeActiveFurniture({ x: -1, y: 0 })} type="button">左</button>
	                          <span className="rounded-lg bg-slate-900 px-2 py-2 text-center font-semibold text-white">选</span>
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => nudgeActiveFurniture({ x: 1, y: 0 })} type="button">右</button>
	                          <span />
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => nudgeActiveFurniture({ x: 0, y: 1 })} type="button">下</button>
	                          <span />
	                        </div>
	                      </div>
		                      <div className="mt-3 rounded-xl bg-white/70 p-2">
		                        <p className="text-xs font-semibold text-ink">旋转 / 翻转</p>
		                        <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => rotateActiveFurniture(-15)} type="button">-15</button>
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => rotateActiveFurniture(15)} type="button">+15</button>
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => rotateActiveFurniture(-90)} type="button">-90</button>
	                          <button className="rounded-lg bg-slate-100 px-2 py-2 font-semibold text-ink hover:bg-slate-200 disabled:opacity-40" disabled={activeFurniture.locked} onClick={() => rotateActiveFurniture(90)} type="button">+90</button>
	                          <button className={`col-span-2 rounded-lg px-2 py-2 font-semibold disabled:opacity-40 ${activeFurniture.position.flipX ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`} disabled={activeFurniture.locked} onClick={() => flipActiveFurniture("x")} type="button">左右翻转</button>
		                          <button className={`col-span-2 rounded-lg px-2 py-2 font-semibold disabled:opacity-40 ${activeFurniture.position.flipY ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`} disabled={activeFurniture.locked} onClick={() => flipActiveFurniture("y")} type="button">前后翻转</button>
		                        </div>
		                      </div>
	                      {(activeFurniture.type === "wardrobe" || activeFurniture.moduleType === "wardrobe") && (
	                        <button
	                          className="mt-3 w-full rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
	                          onClick={() => openWardrobeDesigner(activeFurniture.id)}
	                          type="button"
	                        >
	                          进入衣柜设计
	                        </button>
	                      )}
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
	                    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-stone-500">{isFurnitureWorkspace ? "从模块库添加家具，或在画布上选择已有家具后，这里会显示尺寸、旋转、翻转和备注。" : "选择一个房间后，可以在这里输入名称，例如“厨房”。"}</p>
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
                <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-stone-500">{isFurnitureWorkspace ? "从模块库添加家具，或在画布上选择已有家具后，这里会显示可编辑属性。" : "在画布或对象台账里选择一个结构对象后，这里会显示可编辑属性。"}</p>
              )}
            </RightPanelCard>

            {!isFurnitureWorkspace && <RightPanelCard
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
            }
          </div>
        </aside>}
      </section>

      {wardrobeDesignFurniture && (
        <section className="fixed inset-3 z-[80] overflow-hidden rounded-2xl border border-white/80 bg-white shadow-soft lg:inset-6">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Wardrobe Design</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-ink">{wardrobeDesignFurniture.name} · 衣柜内部设计</h2>
              </div>
              <button className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-clay" onClick={() => setWardrobeDesignFurnitureId("")} type="button">
                完成
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 overflow-auto bg-[#f3efe7] p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-white/80 bg-white/80 p-4">
                <div className="relative aspect-[4/3] w-full max-w-4xl rounded-xl border-[10px] border-[#8b6f47] bg-[#f8f4ed] shadow-inner">
	                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(139,111,71,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,111,71,0.18)_1px,transparent_1px)] bg-[size:10%_10%]" />
		                  {[...(wardrobeDesign.modules ?? [])].sort((left, right) => (left.kind === "blank" ? 0 : 1) - (right.kind === "blank" ? 0 : 1)).map((module) => {
		                      const kindClass: Record<WardrobeCellKind, string> = {
		                        "hanging-long": "bg-sky-50 text-sky-800",
		                        "hanging-short": "bg-indigo-50 text-indigo-800",
	                        folded: "bg-amber-50 text-amber-800",
	                        drawer: "bg-[#e3d2b7] text-[#5f4528]",
	                        open: "bg-white/70 text-stone-600",
	                        shoe: "bg-emerald-50 text-emerald-800",
	                        blank: "border-dashed bg-transparent text-stone-300 shadow-none"
		                      };
	                      return (
	                        <button
	                          key={module.id}
		                          className={`absolute grid place-items-center rounded-lg border-2 border-[#8b6f47]/45 p-1 text-xs font-semibold shadow-sm transition hover:ring-2 hover:ring-emerald-500 ${kindClass[module.kind]}`}
		                          style={{ left: `${module.x}%`, top: `${module.y}%`, width: `${module.width}%`, height: `${module.height}%`, zIndex: module.kind === "blank" ? 1 : 2 }}
	                          onClick={() => {
	                            const kinds = Object.keys(wardrobeCellLabels) as WardrobeCellKind[];
	                            const nextKind = kinds[(kinds.indexOf(module.kind) + 1) % kinds.length];
	                            updateWardrobeModule(module.id, { kind: nextKind });
	                          }}
	                          type="button"
	                        >
	                          {(module.kind === "hanging-long" || module.kind === "hanging-short") && <span className="absolute left-3 right-3 top-4 h-1 rounded-full bg-slate-700" />}
	                          {module.kind === "drawer" && <span className="absolute inset-x-3 bottom-3 border-t-2 border-[#8b6f47]/70" />}
	                          <span className="rounded-full bg-white/80 px-2 py-1">{wardrobeCellLabels[module.kind]}</span>
	                        </button>
	                      );
	                    })}
                </div>
              </div>

              <aside className="rounded-2xl border border-white/80 bg-white p-4 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Controls</p>
                <h3 className="mt-1 text-base font-semibold text-ink">内部结构参数</h3>
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {furnitureDimensionFields.map(([field, label]) => (
                      <label key={field} className="block text-xs font-semibold text-stone-500">
                        {label}
                        <input
                          className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2 text-sm font-semibold text-ink outline-none focus:border-emerald-400"
                          min="1"
                          type="number"
                          value={wardrobeDesignFurniture.dimensions[field]}
                          onChange={(event) => updateWardrobeDimensions(field, Number(event.target.value))}
                        />
                      </label>
                    ))}
                  </div>
                  {([
                    ["columns", "竖向列数", 1, 6],
                    ["rows", "横向层数", 1, 8]
                  ] as const).map(([field, label, min, max]) => (
                    <label key={field} className="block text-xs font-semibold text-stone-500">
                      {label}
                      <input
                        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-emerald-400"
                        max={max}
                        min={min}
                        type="number"
                        value={wardrobeDesign[field]}
                        onChange={(event) => resizeWardrobeGrid(field, Number(event.target.value))}
                      />
                    </label>
                  ))}
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink">模块积木</p>
                      <select className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-ink" onChange={(event) => addWardrobeModule(event.target.value as WardrobeCellKind)} value="">
                        <option value="" disabled>添加</option>
                        {(Object.entries(wardrobeCellLabels) as Array<[WardrobeCellKind, string]>).filter(([kind]) => kind !== "blank").map(([kind, label]) => (
                          <option key={kind} value={kind}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-2 max-h-72 space-y-2 overflow-auto pr-1">
                      {(wardrobeDesign.modules ?? []).map((module, index) => (
                        <div key={`module-control-${module.id}`} className="rounded-lg border border-stone-200 bg-white p-2">
                          <div className="flex items-center justify-between gap-2">
                            <select
                              className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs font-semibold text-ink outline-none focus:border-emerald-400"
                              value={module.kind}
                              onChange={(event) => updateWardrobeModule(module.id, { kind: event.target.value as WardrobeCellKind })}
                            >
                              {(Object.entries(wardrobeCellLabels) as Array<[WardrobeCellKind, string]>).map(([kind, label]) => (
                                <option key={kind} value={kind}>{index + 1}. {label}</option>
                              ))}
                            </select>
                            <button className="rounded-lg bg-red-50 px-2 py-2 text-xs font-semibold text-red-700 hover:bg-red-100" onClick={() => removeWardrobeModule(module.id)} type="button">删</button>
                          </div>
                          <div className="mt-2 grid grid-cols-4 gap-1">
                            {([
                              ["x", "左"],
                              ["y", "上"],
                              ["width", "宽"],
                              ["height", "高"]
                            ] as const).map(([field, label]) => (
                              <label key={`${module.id}-${field}`} className="block text-[10px] font-semibold text-stone-500">
                                {label}%
                                <input
                                  className="mt-1 w-full rounded-lg border border-stone-200 px-1.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-emerald-400"
                                  min="0"
                                  max="100"
                                  type="number"
                                  value={module[field]}
                                  onChange={(event) => updateWardrobeModule(module.id, { [field]: Number(event.target.value) } as Partial<typeof module>)}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <label className="block text-xs font-semibold text-stone-500">
                    施工/收纳备注
                    <textarea
                      className="mt-1 min-h-28 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-emerald-400"
                      value={wardrobeDesign.notes}
                      onChange={(event) => updateWardrobeDesign({ notes: event.target.value })}
                    />
                  </label>
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}

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
