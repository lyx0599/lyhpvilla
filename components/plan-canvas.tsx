"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, PointerEvent, WheelEvent } from "react";
import {
  emptyInteractionState,
  handleDrag as runInteractionDrag,
  handleHover,
  handleResize,
  handleSelect,
  isLocked,
  mergeWall,
  rotateDoor,
  rotateFurniture,
  splitWall,
  toggleLock
} from "@/src/core/interactionEngine";
import {
  createBayWindow,
  createArcWallFromEndpoints,
  createDoor,
  createFence,
  createOutdoor,
  createOutdoorSurface,
  createPartition,
  createSkylight,
  createStair,
  createStraightWall,
  createWindow,
  findNearestHost,
  generateRoomsFromWalls,
  getDistance,
  getLineLength,
  getWallEndpoints,
  projectPointToSegment,
  snapPoint,
  STRUCTURE_HEIGHT_MM,
  STRUCTURE_WIDTH_MM
} from "@/lib/house-geometry";
import {
  applyFloorPlanPreset,
  createHeuristicCleanPatches,
  floorPlanPresetLabels,
  getCleanupFillColor,
  getFloorPlanFilter,
  getRepairOverlayStyles
} from "@/lib/floor-plan-cleanup";
import type {
  CleanPatch,
  DrawTool,
  Floor,
  FloorPlanPreset,
  FloorPlanVisualSettings,
  Furniture,
  HouseStructure,
  HouseStructureObject,
  HouseWall,
  MmPoint,
  PlannerMode,
  Room,
  ViewMode,
  Wall
} from "@/types/space";
import { getSemanticObjectPosition, semanticCategoryLabels, semanticIdPrefixes } from "@/lib/semantic-map";
import type { Boundary, Point, SemanticObject } from "@/types/semantic-map";

type Props = {
  floor: Floor;
  rooms: Room[];
  walls: Wall[];
  furniture: Furniture[];
  semanticObjects: SemanticObject[];
  selectedFurnitureId: string;
  selectedSemanticObjectId: string;
  viewMode: ViewMode;
  plannerMode: PlannerMode;
  drawTool: DrawTool;
  houseStructure: HouseStructure;
  floorPlanVisualSettings: FloorPlanVisualSettings;
  cleanPatches: CleanPatch[];
  focusMode: boolean;
  locateObjectRequest: { id: string; nonce: number } | null;
  canUndo: boolean;
  canRedo: boolean;
  onScaleChange: (scale: number) => void;
  onFocusModeChange: (focused: boolean) => void;
  onActiveObjectChange: (objectId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onPlannerModeChange: (mode: PlannerMode) => void;
  onDrawToolChange: (tool: DrawTool) => void;
  onHouseStructureChange: (structure: HouseStructure) => void;
  onFloorPlanVisualSettingsChange: (settings: FloorPlanVisualSettings) => void;
  onCleanPatchesChange: (patches: CleanPatch[]) => void;
  onSelectFurniture: (furniture: Furniture) => void;
  onFurnitureChange: (furniture: Furniture[]) => void;
  onSelectSemanticObject: (object: SemanticObject) => void;
  onMoveSemanticObject: (objectId: string, position: { x: number; y: number }) => void;
};

const MIN_SCALE = 0.6;
const MAX_SCALE = 3;
const SCALE_STEP = 0.15;

type ObjectLabel = {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
};

type LabelFilter = "all" | "walls" | "openings" | "rooms" | "outdoor" | "furniture";
type PlanSheetMode = "structure" | "construction" | "furnishing" | "preview";
type ClickDrawTool = "wall-straight" | "wall-arc" | "partition" | "stair" | "fence";
type OutdoorSurfaceDrawTool = "hardscape" | "path" | "planting";
type StructureObjectRow = {
  id: string;
  kind: "wall" | "partition" | "stair" | "fence" | "door" | "window" | "bayWindow" | "skylight" | "room" | "outdoor" | "outdoorSurface" | "furniture";
  label: string;
  name: string;
  detail: string;
};

const planSheetModeLabels: Record<PlanSheetMode, string> = {
  structure: "空白结构",
  construction: "施工标注",
  furnishing: "家具布置",
  preview: "效果预览"
};

const planSheetModeDescriptions: Record<PlanSheetMode, string> = {
  structure: "只看墙、门窗、楼梯、院子等固定骨架。",
  construction: "在结构模型上叠加尺寸，后续承载拆改和施工备注。",
  furnishing: "从同一模型显示家具对象，未来可导出采购清单。",
  preview: "未来承接 3D 白模、材质灯光和家人沟通效果。"
};

function avoidLabelOverlap(labels: ObjectLabel[]) {
  const placed: ObjectLabel[] = [];
  return labels.map((label) => {
    let y = label.y;
    let attempts = 0;
    while (placed.some((item) => Math.abs(item.x - label.x) < 1450 && Math.abs(item.y - y) < 720) && attempts < 6) {
      y -= 760;
      attempts += 1;
    }
    const nextLabel = {
      ...label,
      x: Math.min(STRUCTURE_WIDTH_MM - 1500, Math.max(1500, label.x)),
      y: Math.min(STRUCTURE_HEIGHT_MM, Math.max(1000, y))
    };
    placed.push(nextLabel);
    return nextLabel;
  });
}

export function PlanCanvas({
  floor,
  rooms,
  walls,
  furniture,
  semanticObjects = [],
  selectedFurnitureId,
  selectedSemanticObjectId = "",
  viewMode,
  plannerMode,
  drawTool,
  houseStructure,
  floorPlanVisualSettings,
  cleanPatches,
  focusMode,
  locateObjectRequest,
  canUndo,
  canRedo,
  onScaleChange,
  onFocusModeChange,
  onActiveObjectChange,
  onUndo,
  onRedo,
  onPlannerModeChange,
  onDrawToolChange,
  onHouseStructureChange,
  onFloorPlanVisualSettingsChange,
  onCleanPatchesChange,
  onSelectFurniture,
  onFurnitureChange,
  onSelectSemanticObject,
  onMoveSemanticObject
}: Props) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isManualCleanupMode, setIsManualCleanupMode] = useState(false);
  const [isCleanupPanelOpen, setIsCleanupPanelOpen] = useState(false);
  const [cleanupSelection, setCleanupSelection] = useState<CleanPatch["rect"] | null>(null);
  const [exportOptions, setExportOptions] = useState({ overlay: false, roomNames: false, furniture: false });
  const [sheetMode, setSheetMode] = useState<PlanSheetMode>("structure");
  const [isPlanZoomSelected, setIsPlanZoomSelected] = useState(false);
  const [drawPreview, setDrawPreview] = useState<{ start: MmPoint; end: MmPoint } | null>(null);
  const [clickDrawStart, setClickDrawStart] = useState<{ tool: ClickDrawTool; start: MmPoint } | null>(null);
  const [arcSweepAngle, setArcSweepAngle] = useState(90);
  const [arcDirection, setArcDirection] = useState<"clockwise" | "counterclockwise">("clockwise");
  const [outdoorDraft, setOutdoorDraft] = useState<MmPoint[]>([]);
  const [outdoorSurfaceDraft, setOutdoorSurfaceDraft] = useState<{ tool: OutdoorSurfaceDrawTool; points: MmPoint[] } | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState("");
  const [structureMessage, setStructureMessage] = useState("");
  const [showObjectIds, setShowObjectIds] = useState(true);
  const [labelFilter, setLabelFilter] = useState<LabelFilter>("all");
  const [interactionState, setInteractionState] = useState(emptyInteractionState);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; panX: number; panY: number } | null>(null);
  const structureDragRef = useRef<{ pointerId: number; objectId: string; pointKey: "start" | "end"; moved: boolean } | null>(null);
  const structureMoveRef = useRef<{ pointerId: number; objectId: string; lastPoint: MmPoint; moved: boolean } | null>(null);
  const drawDragRef = useRef<{ pointerId: number; start: MmPoint } | null>(null);
  const openingDragRef = useRef<{ pointerId: number; objectId: string; objectType: "door" | "window"; moved: boolean } | null>(null);
  const furnitureDragRef = useRef<{ pointerId: number; objectId: string; lastPosition: Point; moved: boolean } | null>(null);
  const cleanupDragRef = useRef<{ pointerId: number; start: Point } | null>(null);
  const planRef = useRef<HTMLDivElement | null>(null);
  const objectDragRef = useRef<{ pointerId: number; objectId: string; moved: boolean } | null>(null);

  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    onScaleChange(1);
  }, [floor.id, onScaleChange]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (plannerMode === "edit" && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if (plannerMode === "edit" && event.key === "Escape" && clickDrawStart) {
        event.preventDefault();
        cancelClickDraw();
        return;
      }
      if (plannerMode !== "edit" || (event.key !== "Delete" && event.key !== "Backspace")) return;
      event.preventDefault();
      deleteSelectedObject();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [plannerMode, selectedStructureId, houseStructure, furniture, interactionState.selectedObjectId, clickDrawStart, onUndo, onRedo]);

  useEffect(() => {
    if (plannerMode !== "edit") return;
    setIsCleanupPanelOpen(false);
    setIsManualCleanupMode(false);
    setCleanupSelection(null);
  }, [plannerMode]);

  useEffect(() => {
    setClickDrawStart(null);
    setDrawPreview(null);
    setOutdoorSurfaceDraft(null);
    setIsPlanZoomSelected(false);
  }, [drawTool, floor.id]);

  useEffect(() => {
    if (!locateObjectRequest) return;
    const { id } = locateObjectRequest;
    const furnitureObject = furniture.find((item) => item.id === id);
    if (furnitureObject) {
      setSelectedStructureId("");
      selectObject(id);
      onSelectFurniture(furnitureObject);
      onActiveObjectChange(id);
      setScale(1.45);
      onScaleChange(1.45);
      const rect = planRef.current?.getBoundingClientRect();
      if (rect) {
        setPan({
          x: (50 - furnitureObject.position.x) / 100 * rect.width * 1.45,
          y: (50 - furnitureObject.position.y) / 100 * rect.height * 1.45
        });
      }
      return;
    }

    const label = structureLabels.find((item) => item.id === id);
    if (!label) return;
    setSelectedStructureId(id);
    selectObject(id);
    onActiveObjectChange(id);
    setScale(1.45);
    onScaleChange(1.45);
    const rect = planRef.current?.getBoundingClientRect();
    if (rect) {
      setPan({
        x: (0.5 - label.x / STRUCTURE_WIDTH_MM) * rect.width * 1.45,
        y: (0.5 - label.y / STRUCTURE_HEIGHT_MM) * rect.height * 1.45
      });
    }
    setStructureMessage(`已定位校验对象 ${id}`);
  }, [locateObjectRequest]);

  function updateScale(nextScale: number) {
    const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(nextScale.toFixed(2))));
    setScale(clampedScale);
    onScaleChange(clampedScale);
  }

  function zoomBy(delta: number) {
    updateScale(scale + delta);
  }

  function resetViewport() {
    setPan({ x: 0, y: 0 });
    updateScale(1);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (viewMode !== "2d") return;
    const target = event.target as Node | null;
    if (!isPlanZoomSelected || !target || !planRef.current?.contains(target)) return;
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? -SCALE_STEP : SCALE_STEP);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target as Node | null;
    if (target && planRef.current && !planRef.current.contains(target)) {
      setIsPlanZoomSelected(false);
    }
    if (viewMode !== "2d" || event.button !== 0 || isManualCleanupMode || (plannerMode === "edit" && drawTool !== "select")) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan({
      x: drag.panX + event.clientX - drag.startX,
      y: drag.panY + event.clientY - drag.startY
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function getPercentPosition(event: PointerEvent<Element>) {
    const rect = planRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))
    };
  }

  function getMmPosition(event: PointerEvent<Element>) {
    const rect = planRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.round(Math.min(STRUCTURE_WIDTH_MM, Math.max(0, ((event.clientX - rect.left) / rect.width) * STRUCTURE_WIDTH_MM))),
      y: Math.round(Math.min(STRUCTURE_HEIGHT_MM, Math.max(0, ((event.clientY - rect.top) / rect.height) * STRUCTURE_HEIGHT_MM)))
    };
  }

  function updateHouseStructure(nextStructure: HouseStructure) {
    onHouseStructureChange({
      ...nextStructure,
      rooms: generateRoomsFromWalls(floor.id, nextStructure.walls, nextStructure.rooms)
    });
  }

  function commitInteractionModel(nextModel: { houseStructure: HouseStructure; furniture: Furniture[] }) {
    onHouseStructureChange(nextModel.houseStructure);
    onFurnitureChange(nextModel.furniture);
  }

  function selectObject(objectId: string) {
    setIsPlanZoomSelected(false);
    setInteractionState((currentState) => handleSelect(currentState, objectId));
  }

  function hoverObject(objectId: string) {
    setInteractionState((currentState) => handleHover(currentState, objectId));
  }

  function clearHoverObject(objectId: string) {
    setInteractionState((currentState) => currentState.hoveredObjectId === objectId ? { ...currentState, hoveredObjectId: "" } : currentState);
  }

  function isObjectSelected(objectId: string) {
    return interactionState.selectedObjectId === objectId || selectedStructureId === objectId || selectedFurnitureId === objectId;
  }

  function isObjectHovered(objectId: string) {
    return interactionState.hoveredObjectId === objectId;
  }

  function isObjectActive(objectId: string) {
    return interactionState.editingObjectId === objectId;
  }

  function objectIsLocked(objectId: string) {
    return isLocked(interactionState, objectId);
  }

  function getNextStructureId(prefix: string, count: number) {
    const idPattern = new RegExp(`^${prefix}-${floor.id}-(\\d+)$`);
    const existingIds = [
      ...houseStructure.walls.map((object) => object.id),
      ...houseStructure.partitions.map((object) => object.id),
      ...houseStructure.stairs.map((object) => object.id),
      ...houseStructure.fences.map((object) => object.id),
      ...houseStructure.outdoorSurfaces.map((object) => object.id),
      ...houseStructure.doors.map((object) => object.id),
      ...houseStructure.windows.map((object) => object.id),
      ...houseStructure.bayWindows.map((object) => object.id),
      ...houseStructure.skylights.map((object) => object.id),
      ...houseStructure.outdoors.map((object) => object.id)
    ];
    const maxSuffix = existingIds.reduce((max, id) => {
      const match = id.match(idPattern);
      return match ? Math.max(max, Number(match[1])) : max;
    }, count);
    return `${prefix}-${floor.id}-${String(maxSuffix + 1).padStart(3, "0")}`;
  }

  function getSelectedStructureObject(): HouseStructureObject | null {
    return (
      houseStructure.walls.find((object) => object.id === selectedStructureId) ??
      houseStructure.partitions.find((object) => object.id === selectedStructureId) ??
      houseStructure.stairs.find((object) => object.id === selectedStructureId) ??
      houseStructure.fences.find((object) => object.id === selectedStructureId) ??
      houseStructure.outdoorSurfaces.find((object) => object.id === selectedStructureId) ??
      houseStructure.rooms.find((object) => object.id === selectedStructureId) ??
      houseStructure.doors.find((object) => object.id === selectedStructureId) ??
      houseStructure.windows.find((object) => object.id === selectedStructureId) ??
      houseStructure.bayWindows.find((object) => object.id === selectedStructureId) ??
      houseStructure.skylights.find((object) => object.id === selectedStructureId) ??
      houseStructure.outdoors.find((object) => object.id === selectedStructureId) ??
      null
    );
  }

  function getStructureSnapPoints() {
    return [
      ...getWallEndpoints(houseStructure.walls),
      ...houseStructure.partitions.flatMap((partition) => [partition.start, partition.end]),
      ...houseStructure.stairs.flatMap((stair) => [stair.start, stair.end]),
      ...houseStructure.fences.flatMap((fence) => [fence.start, fence.end]),
      ...houseStructure.outdoors.flatMap((outdoor) => outdoor.polygon),
      ...houseStructure.outdoorSurfaces.flatMap((surface) => surface.polygon)
    ];
  }

  function cancelClickDraw() {
    setClickDrawStart(null);
    setDrawPreview(null);
    setStructureMessage("已取消当前结构绘制。");
  }

  function finishContinuousDraw(message = "已结束连续绘制。") {
    setClickDrawStart(null);
    setDrawPreview(null);
    setStructureMessage(message);
  }

  function finishClickDraw(tool: ClickDrawTool, start: MmPoint, end: MmPoint) {
    if (getDistance(start, end) <= 120) {
      setDrawPreview({ start, end });
      setStructureMessage("终点太近，请移动鼠标后再点击另一端。");
      return;
    }

    if (tool === "wall-straight") {
      const wall = createStraightWall(getNextStructureId("W", houseStructure.walls.length), floor.id, start, end);
      updateHouseStructure({ ...houseStructure, walls: [...houseStructure.walls, wall] });
      setSelectedStructureId(wall.id);
      selectObject(wall.id);
      onActiveObjectChange(wall.id);
      setClickDrawStart({ tool, start: end });
      setDrawPreview({ start: end, end });
      setStructureMessage(`已连接墙体 ${wall.id}，长度 ${wall.length} mm。继续移动鼠标可接着画下一段，双击或按 Esc 结束。`);
      return;
    }

    if (tool === "wall-arc") {
      const wall = createArcWallFromEndpoints(getNextStructureId("AW", houseStructure.walls.length), floor.id, start, end, arcSweepAngle, arcDirection);
      updateHouseStructure({ ...houseStructure, walls: [...houseStructure.walls, wall] });
      setSelectedStructureId(wall.id);
      selectObject(wall.id);
      onActiveObjectChange(wall.id);
      setClickDrawStart({ tool, start: end });
      setDrawPreview({ start: end, end });
      setStructureMessage(`已连接弧墙 ${wall.id}，弧度 ${arcSweepAngle}°，长度 ${wall.length} mm。继续移动鼠标可接着画下一段，双击或按 Esc 结束。`);
      return;
    }

    if (tool === "stair") {
      const stair = createStair(getNextStructureId("ST", houseStructure.stairs.length), floor.id, start, end);
      onHouseStructureChange({ ...houseStructure, stairs: [...houseStructure.stairs, stair] });
      setSelectedStructureId(stair.id);
      selectObject(stair.id);
      onActiveObjectChange(stair.id);
      setClickDrawStart({ tool, start: end });
      setDrawPreview({ start: end, end });
      setStructureMessage(`已连接楼梯 ${stair.id}，长度 ${getLineLength(stair.start, stair.end)} mm。继续移动鼠标可接着画下一段，双击或按 Esc 结束。`);
      return;
    }

    if (tool === "fence") {
      const fence = createFence(getNextStructureId("FN", houseStructure.fences.length), floor.id, start, end);
      onHouseStructureChange({ ...houseStructure, fences: [...houseStructure.fences, fence] });
      setSelectedStructureId(fence.id);
      selectObject(fence.id);
      onActiveObjectChange(fence.id);
      setClickDrawStart({ tool, start: end });
      setDrawPreview({ start: end, end });
      setStructureMessage(`已连接篱笆 ${fence.id}，长度 ${getLineLength(fence.start, fence.end)} mm。继续移动鼠标可接着画下一段，双击或按 Esc 结束。`);
      return;
    }

    const partition = createPartition(getNextStructureId("P", houseStructure.partitions.length), floor.id, start, end);
    onHouseStructureChange({ ...houseStructure, partitions: [...houseStructure.partitions, partition] });
    setSelectedStructureId(partition.id);
    selectObject(partition.id);
    onActiveObjectChange(partition.id);
    setClickDrawStart({ tool, start: end });
    setDrawPreview({ start: end, end });
    setStructureMessage(`已连接隔断 ${partition.id}，长度 ${getLineLength(partition.start, partition.end)} mm。继续移动鼠标可接着画下一段，双击或按 Esc 结束。`);
  }

  function handleStructureDoubleClick(event: MouseEvent<SVGSVGElement>) {
    if (!clickDrawStart) return;
    event.preventDefault();
    event.stopPropagation();
    finishContinuousDraw("已结束连续绘制。");
  }

  function handleStructurePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (viewMode !== "2d") return;
    if (event.target === event.currentTarget && (plannerMode !== "edit" || drawTool === "select")) {
      setIsPlanZoomSelected(true);
      setSelectedStructureId("");
      setInteractionState((currentState) => ({ ...currentState, selectedObjectId: "", editingObjectId: "" }));
      onActiveObjectChange("");
      setStructureMessage("已选中整张户型图。");
      if (plannerMode !== "edit") return;
    }
    if (plannerMode !== "edit") return;
    const rawPoint = getMmPosition(event);
    if (!rawPoint) return;
    const snapPoints = getStructureSnapPoints();
    const point = clickDrawStart
      ? snapPoint(rawPoint, snapPoints, clickDrawStart.start)
      : snapPoint(rawPoint, snapPoints);

    if (drawTool === "wall-straight" || drawTool === "wall-arc" || drawTool === "partition" || drawTool === "stair" || drawTool === "fence") {
      event.stopPropagation();
      const tool = drawTool;
      if (!clickDrawStart || clickDrawStart.tool !== tool) {
        setClickDrawStart({ tool, start: point });
        setDrawPreview({ start: point, end: point });
        setStructureMessage(tool === "wall-straight"
          ? "已设置墙体起点。移动鼠标预览，再点击终点完成连接。"
          : tool === "wall-arc"
            ? "已设置弧墙起点。移动鼠标预览，再点击终点完成连接。"
            : tool === "partition"
              ? "已设置隔断起点。移动鼠标预览，再点击终点完成连接。"
              : tool === "stair"
                ? "已设置楼梯起点。移动鼠标预览，再点击终点完成连接。"
                : "已设置篱笆起点。移动鼠标预览，再点击终点完成连接。"
        );
        return;
      }
      finishClickDraw(tool, clickDrawStart.start, point);
      return;
    }

    if (drawTool === "door" || drawTool === "window" || drawTool === "bay-window") {
      event.stopPropagation();
      const host = findNearestHost(point, houseStructure.walls, houseStructure.partitions);
      if (!host) {
        setStructureMessage("门窗必须吸附到墙体或隔断上，请点击靠近墙线的位置。");
        return;
      }
      if (drawTool === "door") {
        const door = createDoor(getNextStructureId("D", houseStructure.doors.length), floor.id, host);
        onHouseStructureChange({ ...houseStructure, doors: [...houseStructure.doors, door] });
        setSelectedStructureId(door.id);
        selectObject(door.id);
        onActiveObjectChange(door.id);
      } else if (drawTool === "window") {
        const windowObject = createWindow(getNextStructureId("WIN", houseStructure.windows.length), floor.id, host);
        onHouseStructureChange({ ...houseStructure, windows: [...houseStructure.windows, windowObject] });
        setSelectedStructureId(windowObject.id);
        selectObject(windowObject.id);
        onActiveObjectChange(windowObject.id);
      } else {
        const bayWindow = createBayWindow(getNextStructureId("BW", houseStructure.bayWindows.length), floor.id, host);
        if (!bayWindow) {
          setStructureMessage("飘窗必须绑定结构墙，不能绑定隔断。");
          return;
        }
        onHouseStructureChange({ ...houseStructure, bayWindows: [...houseStructure.bayWindows, bayWindow] });
        setSelectedStructureId(bayWindow.id);
        selectObject(bayWindow.id);
        onActiveObjectChange(bayWindow.id);
      }
      setStructureMessage("已吸附到最近的墙体/隔断。");
      return;
    }

    if (drawTool === "skylight") {
      event.stopPropagation();
      const skylight = createSkylight(getNextStructureId("SKY", houseStructure.skylights.length), floor.id, point);
      onHouseStructureChange({ ...houseStructure, skylights: [...houseStructure.skylights, skylight] });
      setSelectedStructureId(skylight.id);
      selectObject(skylight.id);
      onActiveObjectChange(skylight.id);
      setStructureMessage("已放置天窗。天窗是独立结构对象，可在右侧调整宽度、进深和高度。");
      return;
    }

    if (drawTool === "outdoor") {
      event.stopPropagation();
      const nextDraft = [...outdoorDraft, point];
      setOutdoorDraft(nextDraft);
      setStructureMessage("继续点击添加院子边界点，至少 3 个点后可完成区域。");
      return;
    }

    if (drawTool === "hardscape" || drawTool === "path" || drawTool === "planting") {
      event.stopPropagation();
      const tool = drawTool;
      const currentPoints = outdoorSurfaceDraft?.tool === tool ? outdoorSurfaceDraft.points : [];
      const nextDraft = { tool, points: [...currentPoints, point] };
      setOutdoorSurfaceDraft(nextDraft);
      setStructureMessage("继续点击添加边界点，至少 3 个点后可完成户外区域。");
    }
  }

  function handleStructurePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (clickDrawStart && (drawTool === "wall-straight" || drawTool === "wall-arc" || drawTool === "partition" || drawTool === "stair" || drawTool === "fence")) {
      const rawPoint = getMmPosition(event);
      if (!rawPoint) return;
      const end = snapPoint(rawPoint, getStructureSnapPoints(), clickDrawStart.start);
      setDrawPreview({ start: clickDrawStart.start, end });
      return;
    }

    const drag = drawDragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      const rawPoint = getMmPosition(event);
      if (!rawPoint) return;
      const end = snapPoint(rawPoint, getWallEndpoints(houseStructure.walls), drag.start);
      setDrawPreview({ start: drag.start, end });
      return;
    }

    const structureDrag = structureDragRef.current;
    if (structureDrag && structureDrag.pointerId === event.pointerId) {
      const rawPoint = getMmPosition(event);
      if (!rawPoint) return;
      const point = snapPoint(rawPoint, getStructureSnapPoints());
      structureDrag.moved = true;
      if (houseStructure.walls.some((wall) => wall.id === structureDrag.objectId)) {
        commitInteractionModel(handleResize(
          { houseStructure, furniture },
          interactionState,
          structureDrag.objectId,
          { kind: "wall-endpoint", pointKey: structureDrag.pointKey, point }
        ));
      } else if (houseStructure.partitions.some((partition) => partition.id === structureDrag.objectId)) {
        onHouseStructureChange({
          ...houseStructure,
          partitions: houseStructure.partitions.map((partition) => partition.id === structureDrag.objectId
            ? { ...partition, [structureDrag.pointKey]: point }
            : partition)
        });
      } else if (houseStructure.stairs.some((stair) => stair.id === structureDrag.objectId)) {
        onHouseStructureChange({
          ...houseStructure,
          stairs: houseStructure.stairs.map((stair) => stair.id === structureDrag.objectId
            ? { ...stair, [structureDrag.pointKey]: point }
            : stair)
        });
      } else if (houseStructure.fences.some((fence) => fence.id === structureDrag.objectId)) {
        onHouseStructureChange({
          ...houseStructure,
          fences: houseStructure.fences.map((fence) => fence.id === structureDrag.objectId
            ? { ...fence, [structureDrag.pointKey]: point }
            : fence)
        });
      }
    }

    const structureMove = structureMoveRef.current;
    if (structureMove && structureMove.pointerId === event.pointerId) {
      const point = getMmPosition(event);
      if (!point || objectIsLocked(structureMove.objectId)) return;
      const delta = {
        x: point.x - structureMove.lastPoint.x,
        y: point.y - structureMove.lastPoint.y
      };
      commitInteractionModel(runInteractionDrag({ houseStructure, furniture }, interactionState, structureMove.objectId, delta));
      structureMove.lastPoint = point;
      structureMove.moved = true;
    }

    const openingDrag = openingDragRef.current;
    if (openingDrag && openingDrag.pointerId === event.pointerId) {
      const point = getMmPosition(event);
      if (!point || objectIsLocked(openingDrag.objectId)) return;
      const object = openingDrag.objectType === "door"
        ? houseStructure.doors.find((door) => door.id === openingDrag.objectId)
        : houseStructure.windows.find((windowObject) => windowObject.id === openingDrag.objectId);
      if (!object) return;
      const host = getHostLine(object.hostId, object.hostType);
      if (!host) return;
      const projection = projectPointToSegment(point, host.start, host.end);
      openingDrag.moved = true;
      if (openingDrag.objectType === "door") {
        onHouseStructureChange({
          ...houseStructure,
          doors: houseStructure.doors.map((door) => door.id === openingDrag.objectId ? { ...door, positionOnWall: Number(projection.t.toFixed(3)) } : door)
        });
      } else {
        onHouseStructureChange({
          ...houseStructure,
          windows: houseStructure.windows.map((windowObject) => windowObject.id === openingDrag.objectId ? { ...windowObject, positionOnWall: Number(projection.t.toFixed(3)) } : windowObject)
        });
      }
    }
  }

  function handleStructurePointerUp(event: PointerEvent<SVGSVGElement>) {
    const drag = drawDragRef.current;
    if (drag && drag.pointerId === event.pointerId && drawPreview) {
      if (getDistance(drawPreview.start, drawPreview.end) > 120) {
        if (drawTool === "wall-straight") {
          const wall = createStraightWall(getNextStructureId("W", houseStructure.walls.length), floor.id, drawPreview.start, drawPreview.end);
          updateHouseStructure({ ...houseStructure, walls: [...houseStructure.walls, wall] });
          setSelectedStructureId(wall.id);
          selectObject(wall.id);
          onActiveObjectChange(wall.id);
          setStructureMessage(`墙体长度 ${wall.length} mm`);
        }
        if (drawTool === "partition") {
          const partition = createPartition(getNextStructureId("P", houseStructure.partitions.length), floor.id, drawPreview.start, drawPreview.end);
          onHouseStructureChange({ ...houseStructure, partitions: [...houseStructure.partitions, partition] });
          setSelectedStructureId(partition.id);
          selectObject(partition.id);
          onActiveObjectChange(partition.id);
          setStructureMessage(`隔断长度 ${getLineLength(partition.start, partition.end)} mm，不参与房间闭合。`);
        }
      }
      drawDragRef.current = null;
      setDrawPreview(null);
    }

    if (structureDragRef.current?.pointerId === event.pointerId) {
      structureDragRef.current = null;
    }

    if (structureMoveRef.current?.pointerId === event.pointerId) {
      structureMoveRef.current = null;
    }

    if (openingDragRef.current?.pointerId === event.pointerId) {
      openingDragRef.current = null;
    }
  }

  function finishOutdoorDraft() {
    if (outdoorDraft.length < 3) return;
    const outdoor = createOutdoor(getNextStructureId("OD", houseStructure.outdoors.length), floor.id, outdoorDraft);
    onHouseStructureChange({ ...houseStructure, outdoors: [...houseStructure.outdoors, outdoor] });
    setSelectedStructureId(outdoor.id);
    selectObject(outdoor.id);
    onActiveObjectChange(outdoor.id);
    setOutdoorDraft([]);
    setStructureMessage(`已创建院子区域，面积 ${(outdoor.area / 1_000_000).toFixed(2)} m2`);
  }

  function cancelOutdoorDraft() {
    setOutdoorDraft([]);
    setStructureMessage("");
  }

  function finishOutdoorSurfaceDraft() {
    if (!outdoorSurfaceDraft || outdoorSurfaceDraft.points.length < 3) return;
    const prefixByTool: Record<OutdoorSurfaceDrawTool, string> = {
      hardscape: "HS",
      path: "PA",
      planting: "PL"
    };
    const surface = createOutdoorSurface(
      getNextStructureId(prefixByTool[outdoorSurfaceDraft.tool], houseStructure.outdoorSurfaces.length),
      floor.id,
      outdoorSurfaceDraft.tool,
      outdoorSurfaceDraft.points
    );
    onHouseStructureChange({ ...houseStructure, outdoorSurfaces: [...houseStructure.outdoorSurfaces, surface] });
    setSelectedStructureId(surface.id);
    selectObject(surface.id);
    onActiveObjectChange(surface.id);
    setOutdoorSurfaceDraft(null);
    setStructureMessage(`已创建${surface.surfaceType === "hardscape" ? "硬地" : surface.surfaceType === "path" ? "小路" : "绿化"}区域，面积 ${(surface.area / 1_000_000).toFixed(2)} m2`);
  }

  function cancelOutdoorSurfaceDraft() {
    setOutdoorSurfaceDraft(null);
    setStructureMessage("");
  }

  function deleteSelectedObject() {
    const selectedFurnitureObject = furniture.find((item) => item.id === interactionState.selectedObjectId);
    if (!selectedStructureId && selectedFurnitureObject) {
      if (objectIsLocked(selectedFurnitureObject.id) || selectedFurnitureObject.locked) {
        setStructureMessage("家具已锁定，先解锁后才能删除。");
        return;
      }
      onFurnitureChange(furniture.filter((item) => item.id !== selectedFurnitureObject.id));
      setInteractionState((currentState) => ({ ...currentState, selectedObjectId: "", editingObjectId: "" }));
      onActiveObjectChange("");
      setStructureMessage(`已删除家具对象 ${selectedFurnitureObject.id}。`);
      return;
    }

    deleteSelectedStructureObject();
  }

  function deleteSelectedStructureObject() {
    if (!selectedStructureId) return;
    if (objectIsLocked(selectedStructureId)) {
      setStructureMessage("对象已锁定，先解锁后才能删除。");
      return;
    }

    if (houseStructure.rooms.some((room) => room.id === selectedStructureId)) {
      setStructureMessage("房间由闭合墙体自动生成。要删除房间，请删除或调整对应墙体。");
      return;
    }

    if (houseStructure.walls.some((wall) => wall.id === selectedStructureId)) {
      updateHouseStructure({
        ...houseStructure,
        walls: houseStructure.walls.filter((wall) => wall.id !== selectedStructureId),
        doors: houseStructure.doors.filter((door) => door.hostType !== "wall" || door.hostId !== selectedStructureId),
        windows: houseStructure.windows.filter((windowObject) => windowObject.hostType !== "wall" || windowObject.hostId !== selectedStructureId),
        bayWindows: houseStructure.bayWindows.filter((bayWindow) => bayWindow.wallId !== selectedStructureId)
      });
      setStructureMessage("已删除墙体，并同步移除依附在这面墙上的门窗。");
      setSelectedStructureId("");
      onActiveObjectChange("");
      return;
    }

    if (houseStructure.partitions.some((partition) => partition.id === selectedStructureId)) {
      onHouseStructureChange({
        ...houseStructure,
        partitions: houseStructure.partitions.filter((partition) => partition.id !== selectedStructureId),
        doors: houseStructure.doors.filter((door) => door.hostType !== "partition" || door.hostId !== selectedStructureId),
        windows: houseStructure.windows.filter((windowObject) => windowObject.hostType !== "partition" || windowObject.hostId !== selectedStructureId)
      });
      setStructureMessage("已删除隔断，并同步移除依附在隔断上的门窗。");
      setSelectedStructureId("");
      onActiveObjectChange("");
      return;
    }

    if (houseStructure.stairs.some((stair) => stair.id === selectedStructureId)) {
      onHouseStructureChange({
        ...houseStructure,
        stairs: houseStructure.stairs.filter((stair) => stair.id !== selectedStructureId)
      });
      setStructureMessage("已删除楼梯。");
      setSelectedStructureId("");
      onActiveObjectChange("");
      return;
    }

    if (houseStructure.fences.some((fence) => fence.id === selectedStructureId)) {
      onHouseStructureChange({
        ...houseStructure,
        fences: houseStructure.fences.filter((fence) => fence.id !== selectedStructureId)
      });
      setStructureMessage("已删除篱笆。");
      setSelectedStructureId("");
      onActiveObjectChange("");
      return;
    }

    if (houseStructure.outdoorSurfaces.some((surface) => surface.id === selectedStructureId)) {
      onHouseStructureChange({
        ...houseStructure,
        outdoorSurfaces: houseStructure.outdoorSurfaces.filter((surface) => surface.id !== selectedStructureId)
      });
      setStructureMessage("已删除户外区域。");
      setSelectedStructureId("");
      onActiveObjectChange("");
      return;
    }

    onHouseStructureChange({
      ...houseStructure,
      doors: houseStructure.doors.filter((door) => door.id !== selectedStructureId),
      windows: houseStructure.windows.filter((windowObject) => windowObject.id !== selectedStructureId),
      bayWindows: houseStructure.bayWindows.filter((bayWindow) => bayWindow.id !== selectedStructureId),
      skylights: houseStructure.skylights.filter((skylight) => skylight.id !== selectedStructureId),
      outdoors: houseStructure.outdoors.filter((outdoor) => outdoor.id !== selectedStructureId)
    });
    setStructureMessage("已删除选中的结构对象。");
    setSelectedStructureId("");
    onActiveObjectChange("");
  }

  function getHostLine(hostId: string, hostType: "wall" | "partition") {
    if (hostType === "partition") {
      const partition = houseStructure.partitions.find((item) => item.id === hostId);
      return partition ? { start: partition.start, end: partition.end, thickness: partition.thickness } : null;
    }
    const wall = houseStructure.walls.find((item) => item.id === hostId);
    if (!wall || wall.kind !== "straight") return null;
    return { start: wall.start, end: wall.end, thickness: wall.thickness };
  }

  function getSegmentOnLine(start: MmPoint, end: MmPoint, centerRatio: number, width: number) {
    const length = Math.max(1, getLineLength(start, end));
    const ux = (end.x - start.x) / length;
    const uy = (end.y - start.y) / length;
    const center = { x: start.x + (end.x - start.x) * centerRatio, y: start.y + (end.y - start.y) * centerRatio };
    return {
      start: { x: center.x - ux * width * 0.5, y: center.y - uy * width * 0.5 },
      end: { x: center.x + ux * width * 0.5, y: center.y + uy * width * 0.5 },
      center,
      normal: { x: -uy, y: ux }
    };
  }

  function getStairGeometry(stair: HouseStructure["stairs"][number]) {
    const length = Math.max(1, getLineLength(stair.start, stair.end));
    const ux = (stair.end.x - stair.start.x) / length;
    const uy = (stair.end.y - stair.start.y) / length;
    const normal = { x: -uy, y: ux };
    const steps = Array.from({ length: Math.max(2, stair.stepCount) }, (_, index) => {
      const ratio = (index + 1) / (Math.max(2, stair.stepCount) + 1);
      const center = {
        x: stair.start.x + (stair.end.x - stair.start.x) * ratio,
        y: stair.start.y + (stair.end.y - stair.start.y) * ratio
      };
      return {
        start: { x: center.x - normal.x * stair.width * 0.42, y: center.y - normal.y * stair.width * 0.42 },
        end: { x: center.x + normal.x * stair.width * 0.42, y: center.y + normal.y * stair.width * 0.42 }
      };
    });
    return { length, ux, uy, normal, steps };
  }

  function getArcPath(wall: Extract<HouseWall, { kind: "arc" }>) {
    const startAngle = (wall.startAngle * Math.PI) / 180;
    const endAngle = (wall.endAngle * Math.PI) / 180;
    const start = { x: wall.center.x + Math.cos(startAngle) * wall.radius, y: wall.center.y + Math.sin(startAngle) * wall.radius };
    const end = { x: wall.center.x + Math.cos(endAngle) * wall.radius, y: wall.center.y + Math.sin(endAngle) * wall.radius };
    const angleDelta = Math.abs(wall.endAngle - wall.startAngle);
    const largeArc = angleDelta > 180 ? 1 : 0;
    const sweep = wall.direction === "clockwise" ? 1 : 0;
    return `M ${start.x} ${start.y} A ${wall.radius} ${wall.radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
  }

  function getWallLabelPoint(wall: HouseWall) {
    if (wall.kind === "straight") {
      return {
        x: (wall.start.x + wall.end.x) / 2,
        y: (wall.start.y + wall.end.y) / 2
      };
    }
    const middleAngle = ((wall.startAngle + wall.endAngle) / 2 * Math.PI) / 180;
    return {
      x: wall.center.x + Math.cos(middleAngle) * wall.radius,
      y: wall.center.y + Math.sin(middleAngle) * wall.radius
    };
  }

  function selectStructureObject(objectId: string, message?: string) {
    setSelectedStructureId(objectId);
    selectObject(objectId);
    onActiveObjectChange(objectId);
    if (message) setStructureMessage(message);
  }

  function shouldIgnoreStructureSelection() {
    return plannerMode === "edit" && drawTool !== "select";
  }

  function toggleSelectedLock() {
    const objectId = interactionState.selectedObjectId || selectedStructureId || selectedFurnitureId;
    if (!objectId) return;
    setInteractionState((currentState) => toggleLock(currentState, objectId));
    setStructureMessage(objectIsLocked(objectId) ? "对象已解锁。" : "对象已锁定，不能拖拽、删除或调整。");
  }

  function splitSelectedWall() {
    if (!selectedStructureId) return;
    const nextStructure = splitWall(houseStructure, interactionState, selectedStructureId);
    onHouseStructureChange(nextStructure);
    setSelectedStructureId("");
    setInteractionState((currentState) => ({ ...currentState, selectedObjectId: "", editingObjectId: "" }));
    setStructureMessage("已尝试在中点分割墙体。");
  }

  function mergeSelectedWall() {
    if (!selectedStructureId) return;
    const nextStructure = mergeWall(houseStructure, interactionState, selectedStructureId);
    onHouseStructureChange(nextStructure);
    setSelectedStructureId("");
    setInteractionState((currentState) => ({ ...currentState, selectedObjectId: "", editingObjectId: "" }));
    setStructureMessage("已尝试与相邻同向墙体合并。");
  }

  function rotateSelectedDoor() {
    if (!selectedStructureId) return;
    onHouseStructureChange(rotateDoor(houseStructure, interactionState, selectedStructureId));
    setStructureMessage("已切换门的开启方向。");
  }

  function resizeSelectedWindow(deltaWidth: number) {
    if (!selectedStructureId) return;
    const windowObject = houseStructure.windows.find((item) => item.id === selectedStructureId);
    const bayWindow = houseStructure.bayWindows.find((item) => item.id === selectedStructureId);
    if (bayWindow) {
      onHouseStructureChange({
        ...houseStructure,
        bayWindows: houseStructure.bayWindows.map((item) => item.id === selectedStructureId ? { ...item, width: Math.max(400, item.width + deltaWidth) } : item)
      });
      setStructureMessage("已调整飘窗宽度。");
      return;
    }
    if (!windowObject) return;
    commitInteractionModel(handleResize(
      { houseStructure, furniture },
      interactionState,
      selectedStructureId,
      { kind: "window-width", width: Math.max(400, windowObject.width + deltaWidth) }
    ));
    setStructureMessage("已调整窗宽。");
  }

  function rotateSelectedFurniture() {
    const objectId = interactionState.selectedObjectId || selectedFurnitureId;
    if (!furniture.some((item) => item.id === objectId)) return;
    onFurnitureChange(rotateFurniture(furniture, interactionState, objectId, 15));
  }

  function selectRegistryObject(row: StructureObjectRow) {
    if (row.kind === "furniture") {
      const item = furniture.find((furnitureObject) => furnitureObject.id === row.id);
      if (!item) return;
      setSelectedStructureId("");
      selectObject(item.id);
      onSelectFurniture(item);
      onActiveObjectChange(item.id);
      setStructureMessage(`${item.name} · ${item.id}`);
      return;
    }
    selectStructureObject(row.id, `${row.name} · ${row.detail}`);
  }

  function renderDragHandle(objectId: string, pointKey: "start" | "end", point: MmPoint) {
    if (plannerMode !== "edit" || drawTool !== "select" || objectIsLocked(objectId)) return null;
    return (
      <circle
        key={`${objectId}-${pointKey}`}
        cx={point.x}
        cy={point.y}
        r={95}
        className="cursor-grab fill-white stroke-blue-500"
        strokeWidth={28}
        onPointerDown={(event) => {
          event.stopPropagation();
          structureDragRef.current = { pointerId: event.pointerId, objectId, pointKey, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
          setSelectedStructureId(objectId);
          selectObject(objectId);
          onActiveObjectChange(objectId);
        }}
      />
    );
  }

  const selectedStructureObject = getSelectedStructureObject();
  const selectedInteractionFurniture = furniture.find((item) => item.id === interactionState.selectedObjectId) ?? null;
  const selectedInteractionObjectId = interactionState.selectedObjectId || selectedStructureId;
  const canDeleteSelectedStructure = Boolean(selectedStructureObject && !houseStructure.rooms.some((room) => room.id === selectedStructureObject.id) && !objectIsLocked(selectedStructureObject.id));
  const canDeleteSelectedFurniture = Boolean(selectedInteractionFurniture && !selectedInteractionFurniture.locked && !objectIsLocked(selectedInteractionFurniture.id));
  const canDeleteSelectedObject = canDeleteSelectedStructure || canDeleteSelectedFurniture;
  const selectedWall = houseStructure.walls.find((wall) => wall.id === selectedStructureId);
  const selectedDoor = houseStructure.doors.find((door) => door.id === selectedStructureId);
  const selectedWindow = houseStructure.windows.find((windowObject) => windowObject.id === selectedStructureId);
  const selectedBayWindow = houseStructure.bayWindows.find((bayWindow) => bayWindow.id === selectedStructureId);
  const structureObjectRows = useMemo<StructureObjectRow[]>(() => {
    const rows: StructureObjectRow[] = [];
    houseStructure.walls.forEach((wall) => {
      rows.push({
        id: wall.id,
        kind: "wall",
        label: wall.kind === "arc" ? "弧墙" : "墙",
        name: wall.name,
        detail: wall.kind === "arc" ? `${wall.length} mm · 半径 ${wall.radius} mm` : `${wall.length} mm · 厚 ${wall.thickness} mm`
      });
    });
    houseStructure.partitions.forEach((partition) => {
      rows.push({
        id: partition.id,
        kind: "partition",
        label: "隔断",
        name: partition.name,
        detail: `${getLineLength(partition.start, partition.end)} mm · ${partition.material}`
      });
    });
    houseStructure.stairs.forEach((stair) => {
      rows.push({
        id: stair.id,
        kind: "stair",
        label: "楼梯",
        name: stair.name,
        detail: `${getLineLength(stair.start, stair.end)} x ${stair.width} mm · ${stair.stepCount} 踏 · ${stair.direction === "up" ? "上行" : "下行"}`
      });
    });
    houseStructure.fences.forEach((fence) => {
      rows.push({
        id: fence.id,
        kind: "fence",
        label: "篱笆",
        name: fence.name,
        detail: `${getLineLength(fence.start, fence.end)} mm · 高 ${fence.height} mm · ${fence.material}`
      });
    });
    houseStructure.outdoorSurfaces.forEach((surface) => {
      rows.push({
        id: surface.id,
        kind: "outdoorSurface",
        label: surface.surfaceType === "hardscape" ? "硬地" : surface.surfaceType === "path" ? "小路" : "绿化",
        name: surface.name,
        detail: `${(surface.area / 1_000_000).toFixed(2)} m2 · ${surface.material}`
      });
    });
    houseStructure.doors.forEach((door) => {
      rows.push({
        id: door.id,
        kind: "door",
        label: "门",
        name: door.name,
        detail: `${door.width} x ${door.height} mm · 挂 ${door.hostId}`
      });
    });
    houseStructure.windows.forEach((windowObject) => {
      rows.push({
        id: windowObject.id,
        kind: "window",
        label: "窗",
        name: windowObject.name,
        detail: `${windowObject.width} x ${windowObject.height} mm · 挂 ${windowObject.hostId}`
      });
    });
    houseStructure.bayWindows.forEach((bayWindow) => {
      rows.push({
        id: bayWindow.id,
        kind: "bayWindow",
        label: "飘窗",
        name: bayWindow.name,
        detail: `${bayWindow.width} x ${bayWindow.depth} x ${bayWindow.height} mm · 挂 ${bayWindow.wallId}`
      });
    });
    houseStructure.skylights.forEach((skylight) => {
      rows.push({
        id: skylight.id,
        kind: "skylight",
        label: "天窗",
        name: skylight.name,
        detail: `${skylight.width} x ${skylight.depth} mm · 高 ${skylight.height} mm`
      });
    });
    houseStructure.rooms.forEach((room) => {
      rows.push({
        id: room.id,
        kind: "room",
        label: "房间",
        name: `${room.roomNumber} · ${room.name}`,
        detail: `${(room.area / 1_000_000).toFixed(2)} m2 · ${room.boundary.length} 个边界点`
      });
    });
    houseStructure.outdoors.forEach((outdoor) => {
      rows.push({
        id: outdoor.id,
        kind: "outdoor",
        label: "院子",
        name: outdoor.name,
        detail: `${(outdoor.area / 1_000_000).toFixed(2)} m2 · ${outdoor.polygon.length} 个边界点`
      });
    });
    furniture.forEach((item) => {
      rows.push({
        id: item.id,
        kind: "furniture",
        label: "家具",
        name: item.name,
        detail: `${item.dimensions.width} x ${item.dimensions.depth} x ${item.dimensions.height} cm · ${item.roomId}`
      });
    });
    return rows;
  }, [houseStructure, furniture]);
  const structureLabels = useMemo(() => {
    const labels: ObjectLabel[] = [];

    houseStructure.walls.forEach((wall) => {
      labels.push({ id: wall.id, name: wall.name, type: wall.kind === "arc" ? "Arc Wall" : "Wall", ...getWallLabelPoint(wall) });
    });
    houseStructure.partitions.forEach((partition) => {
      labels.push({
        id: partition.id,
        name: partition.name,
        type: "Partition",
        x: (partition.start.x + partition.end.x) / 2,
        y: (partition.start.y + partition.end.y) / 2
      });
    });
    houseStructure.stairs.forEach((stair) => {
      labels.push({
        id: stair.id,
        name: stair.name,
        type: "Stair",
        x: (stair.start.x + stair.end.x) / 2,
        y: (stair.start.y + stair.end.y) / 2
      });
    });
    houseStructure.fences.forEach((fence) => {
      labels.push({
        id: fence.id,
        name: fence.name,
        type: "Fence",
        x: (fence.start.x + fence.end.x) / 2,
        y: (fence.start.y + fence.end.y) / 2
      });
    });
    houseStructure.outdoorSurfaces.forEach((surface) => {
      const x = surface.polygon.reduce((sum, point) => sum + point.x, 0) / Math.max(1, surface.polygon.length);
      const y = surface.polygon.reduce((sum, point) => sum + point.y, 0) / Math.max(1, surface.polygon.length);
      labels.push({
        id: surface.id,
        name: surface.name,
        type: surface.surfaceType === "hardscape" ? "Hardscape" : surface.surfaceType === "path" ? "Path" : "Planting",
        x,
        y
      });
    });
    houseStructure.rooms.forEach((room) => {
      const x = room.boundary.reduce((sum, point) => sum + point.x, 0) / Math.max(1, room.boundary.length);
      const y = room.boundary.reduce((sum, point) => sum + point.y, 0) / Math.max(1, room.boundary.length);
      labels.push({ id: room.id, name: `${room.roomNumber} · ${room.name}`, type: "Room", x, y });
    });
    houseStructure.outdoors.forEach((outdoor) => {
      const x = outdoor.polygon.reduce((sum, point) => sum + point.x, 0) / Math.max(1, outdoor.polygon.length);
      const y = outdoor.polygon.reduce((sum, point) => sum + point.y, 0) / Math.max(1, outdoor.polygon.length);
      labels.push({ id: outdoor.id, name: outdoor.name, type: "Outdoor", x, y });
    });
    houseStructure.doors.forEach((door) => {
      const host = getHostLine(door.hostId, door.hostType);
      if (!host) return;
      const segment = getSegmentOnLine(host.start, host.end, door.positionOnWall, door.width);
      labels.push({ id: door.id, name: door.name, type: "Door", x: segment.center.x, y: segment.center.y });
    });
    houseStructure.windows.forEach((windowObject) => {
      const host = getHostLine(windowObject.hostId, windowObject.hostType);
      if (!host) return;
      const segment = getSegmentOnLine(host.start, host.end, windowObject.positionOnWall, windowObject.width);
      labels.push({ id: windowObject.id, name: windowObject.name, type: "Window", x: segment.center.x, y: segment.center.y });
    });
    houseStructure.bayWindows.forEach((bayWindow) => {
      const host = getHostLine(bayWindow.wallId, "wall");
      if (!host) return;
      const segment = getSegmentOnLine(host.start, host.end, bayWindow.positionOnWall, bayWindow.width);
      labels.push({
        id: bayWindow.id,
        name: bayWindow.name,
        type: "Bay Window",
        x: segment.center.x + segment.normal.x * bayWindow.depth,
        y: segment.center.y + segment.normal.y * bayWindow.depth
      });
    });
    houseStructure.skylights.forEach((skylight) => {
      labels.push({
        id: skylight.id,
        name: skylight.name,
        type: "Skylight",
        x: skylight.center.x,
        y: skylight.center.y
      });
    });

    return avoidLabelOverlap(labels);
  }, [houseStructure]);
  const filteredStructureLabels = useMemo(() => structureLabels.filter((label) => {
    if (labelFilter === "all") return true;
    if (labelFilter === "walls") return label.type === "Wall" || label.type === "Arc Wall" || label.type === "Partition" || label.type === "Stair" || label.type === "Fence";
    if (labelFilter === "openings") return label.type === "Door" || label.type === "Window" || label.type === "Bay Window" || label.type === "Skylight";
    if (labelFilter === "rooms") return label.type === "Room" || label.type === "Outdoor";
    if (labelFilter === "outdoor") return label.type === "Outdoor" || label.type === "Fence" || label.type === "Hardscape" || label.type === "Path" || label.type === "Planting";
    return false;
  }), [labelFilter, structureLabels]);
  const arcDrawPreview = useMemo(() => {
    if (!drawPreview || drawTool !== "wall-arc" || getDistance(drawPreview.start, drawPreview.end) <= 120) return null;
    const wall = createArcWallFromEndpoints("AW-PREVIEW", floor.id, drawPreview.start, drawPreview.end, arcSweepAngle, arcDirection);
    return wall.kind === "arc" ? wall : null;
  }, [arcDirection, arcSweepAngle, drawPreview, drawTool, floor.id]);
  const furnitureLabelOffsets = useMemo(() => {
    const placed: Array<{ x: number; y: number }> = [];
    return new Map(furniture.map((item) => {
      let offset = 0;
      while (placed.some((point) => Math.abs(point.x - item.position.x) < 13 && Math.abs(point.y - (item.position.y + offset)) < 7) && offset > -28) {
        offset -= 7;
      }
      placed.push({ x: item.position.x, y: item.position.y + offset });
      return [item.id, offset] as const;
    }));
  }, [furniture]);
  const drawToolLabels: Record<DrawTool, string> = {
    select: "选择",
    "wall-straight": "直墙",
    "wall-arc": "弧墙",
    partition: "隔断",
    stair: "楼梯",
    fence: "篱笆",
    hardscape: "硬地",
    path: "小路",
    planting: "绿化",
    door: "门",
    window: "窗",
    "bay-window": "飘窗",
    skylight: "天窗",
    outdoor: "院子"
  };
  const drawToolHints: Record<DrawTool, string> = {
    select: "选择、拖动、编辑对象",
    "wall-straight": "点起点，再点终点",
    "wall-arc": "点起点，再点终点",
    partition: "点起点，再点终点",
    stair: "点起点，再点终点",
    fence: "点起点，再点终点",
    hardscape: "连续点边界",
    path: "连续点边界",
    planting: "连续点边界",
    door: "点击墙或隔断",
    window: "点击结构墙",
    "bay-window": "点击结构墙",
    skylight: "点击放置天窗",
    outdoor: "连续点边界"
  };
  const drawToolSections: Array<{ title: string; tools: DrawTool[] }> = [
    { title: "结构主体", tools: ["select", "wall-straight", "wall-arc", "partition", "stair"] },
    { title: "洞口", tools: ["door", "window", "bay-window", "skylight"] },
    { title: "院子", tools: ["outdoor", "fence", "hardscape", "path", "planting"] }
  ];

  function getDrawToolMessage(tool: DrawTool) {
    if (tool === "wall-straight") return "点击墙体端点或空白点作为起点，移动鼠标预览，再点击终点完成连接。";
    if (tool === "wall-arc") return "点击弧墙起点，移动鼠标预览，再点击终点完成连接。可先设置弧度角度。";
    if (tool === "partition") return "点击隔断起点，移动鼠标预览，再点击终点完成连接。";
    if (tool === "stair") return "点击楼梯起点，移动鼠标预览，再点击终点完成楼梯方向。";
    if (tool === "fence") return "点击篱笆起点，移动鼠标预览，再点击终点完成连接。";
    if (tool === "outdoor") return "点击画布添加院子边界点。";
    if (tool === "hardscape" || tool === "path" || tool === "planting") return "点击画布添加区域边界点，至少 3 个点后完成。";
    if (tool === "door" || tool === "window" || tool === "bay-window") return "点击靠近墙体的位置，系统会自动吸附。";
    if (tool === "skylight") return "点击楼板/屋面位置放置天窗，放好后可选中调整尺寸。";
    return "";
  }

  function selectDrawTool(tool: DrawTool) {
    onDrawToolChange(tool);
    setStructureMessage(getDrawToolMessage(tool));
  }

  function updateVisualSettings(nextSettings: Partial<FloorPlanVisualSettings>) {
    onFloorPlanVisualSettingsChange({ ...floorPlanVisualSettings, ...nextSettings });
  }

  function updateLayerVisibility(layer: keyof FloorPlanVisualSettings["layerVisibility"], visible: boolean) {
    updateVisualSettings({
      layerVisibility: {
        ...floorPlanVisualSettings.layerVisibility,
        [layer]: visible
      }
    });
  }

  function applyPreset(preset: FloorPlanPreset) {
    onFloorPlanVisualSettingsChange(applyFloorPlanPreset(preset, floorPlanVisualSettings));
  }

  function addHeuristicCleanPatches() {
    const nextPatches = createHeuristicCleanPatches(
      floor.id,
      cleanPatches.length,
      getCleanupFillColor(floorPlanVisualSettings)
    );
    onCleanPatchesChange([...cleanPatches, ...nextPatches]);
    updateVisualSettings({ removeTextMarks: true, cleanWhiteBackground: true });
  }

  function clearWhiteBorderVisually() {
    updateVisualSettings({ removeWhiteBorder: true, cleanWhiteBackground: true });
  }

  function repairToHighDefinitionPlan() {
    onCleanPatchesChange([]);
    onFloorPlanVisualSettingsChange({
      ...floorPlanVisualSettings,
      preset: "clean_gray",
      grayscale: true,
      opacity: 1,
      contrast: 1.36,
      brightness: 1.04,
      saturation: 0,
      sharpen: true,
      removeTextMarks: true,
      removeWhiteBorder: true,
      cleanWhiteBackground: true,
      lineEnhance: true,
      repairMode: false,
      layerVisibility: {
        ...floorPlanVisualSettings.layerVisibility,
        cleanupPatch: false,
        debug: false
      }
    });
    setCleanupSelection(null);
  }

  function addSelectionPatch() {
    if (!cleanupSelection || cleanupSelection.width < 0.5 || cleanupSelection.height < 0.5) return;
    const nextPatch: CleanPatch = {
      id: `CP-${floor.id}-${String(cleanPatches.length + 1).padStart(3, "0")}`,
      floorId: floor.id,
      rect: cleanupSelection,
      fillColor: getCleanupFillColor(floorPlanVisualSettings),
      notes: "手动清理选区"
    };
    onCleanPatchesChange([...cleanPatches, nextPatch]);
    setCleanupSelection(null);
  }

  function removeCleanPatch(patchId: string) {
    onCleanPatchesChange(cleanPatches.filter((patch) => patch.id !== patchId));
  }

  function undoCleanPatch() {
    onCleanPatchesChange(cleanPatches.slice(0, -1));
  }

  function clearCleanPatches() {
    onCleanPatchesChange([]);
    setCleanupSelection(null);
  }

  function handleCleanupPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!isManualCleanupMode) return;
    event.stopPropagation();
    const start = getPercentPosition(event);
    if (!start) return;
    cleanupDragRef.current = { pointerId: event.pointerId, start };
    setCleanupSelection({ x: start.x, y: start.y, width: 0, height: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCleanupPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = cleanupDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const current = getPercentPosition(event);
    if (!current) return;
    setCleanupSelection({
      x: Math.min(drag.start.x, current.x),
      y: Math.min(drag.start.y, current.y),
      width: Math.abs(current.x - drag.start.x),
      height: Math.abs(current.y - drag.start.y)
    });
  }

  function handleCleanupPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (cleanupDragRef.current?.pointerId === event.pointerId) {
      cleanupDragRef.current = null;
    }
  }

  function getBoundary(object: SemanticObject): Boundary {
    const details = object.details as { boundary?: Boundary };
    return Array.isArray(details.boundary) ? details.boundary : [];
  }

  function getWallLine(object: SemanticObject) {
    const details = object.details as { start?: Point; end?: Point; thickness?: number };
    if (!details.start || !details.end) return null;
    return { start: details.start, end: details.end, thickness: details.thickness ?? 2 };
  }

  function drawPoint(ctx: CanvasRenderingContext2D, position: Point, color: string) {
    const x = (position.x / 100) * 1024;
    const y = (position.y / 100) * 768;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  }

  async function exportCleanFloorPlan() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = getCleanupFillColor(floorPlanVisualSettings);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (floor.floorPlanImage) {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = floor.floorPlanImage;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("底图加载失败"));
      });
      const imageRatio = image.width / image.height;
      const canvasRatio = canvas.width / canvas.height;
      const drawWidth = imageRatio > canvasRatio ? canvas.width : canvas.height * imageRatio;
      const drawHeight = imageRatio > canvasRatio ? canvas.width / imageRatio : canvas.height;
      const drawX = (canvas.width - drawWidth) / 2;
      const drawY = (canvas.height - drawHeight) / 2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.globalAlpha = floorPlanVisualSettings.opacity;
      ctx.filter = getFloorPlanFilter(floorPlanVisualSettings);
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      ctx.globalAlpha = 1;
      ctx.filter = "none";
    }

    if (floorPlanVisualSettings.layerVisibility.cleanupPatch) {
      cleanPatches.forEach((patch) => {
        ctx.fillStyle = patch.fillColor;
        ctx.fillRect(
          (patch.rect.x / 100) * canvas.width,
          (patch.rect.y / 100) * canvas.height,
          (patch.rect.width / 100) * canvas.width,
          (patch.rect.height / 100) * canvas.height
        );
      });
    }

    if (exportOptions.overlay) {
      semanticObjects.forEach((object) => {
        const position = getSemanticObjectPosition(object);
        if (!position) return;
        drawPoint(ctx, position, object.category === "Furniture" ? "#2f7d67" : "#2563eb");
        if (exportOptions.roomNames && object.category === "Room") {
          ctx.fillStyle = "#334155";
          ctx.font = "14px sans-serif";
          ctx.fillText(object.name, (position.x / 100) * canvas.width + 10, (position.y / 100) * canvas.height - 10);
        }
      });
    }

    if (exportOptions.furniture) {
      furniture.forEach((item) => drawPoint(ctx, item.position, "#2f7d67"));
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${floor.id}-clean-floor-plan.png`;
    link.click();
  }

  const floorPlanFilter = getFloorPlanFilter(floorPlanVisualSettings);
  const layerVisibility = floorPlanVisualSettings.layerVisibility;
  const isStructureSheetMode = sheetMode === "structure";
  const isConstructionSheetMode = sheetMode === "construction";
  const visibleBaseFloorPlan = !isStructureSheetMode && layerVisibility.baseFloorPlan;
  const visibleCleanupPatch = !isStructureSheetMode && layerVisibility.cleanupPatch;
  const visibleFurnitureOverlay = (sheetMode === "furnishing" || sheetMode === "preview") && layerVisibility.furnitureOverlay;
  const visibleSemanticOverlay = sheetMode === "preview" && layerVisibility.semanticOverlay;
  const visibleDebugLayer = sheetMode === "preview" && layerVisibility.debug;
  const showDimensionLayer = isStructureSheetMode || isConstructionSheetMode;
  const cleanFillColor = getCleanupFillColor(floorPlanVisualSettings);
  const repairOverlayStyles = getRepairOverlayStyles(floorPlanVisualSettings);

  function renderStructureLabelLayer(context: "2d" | "3d") {
    return (
      <g data-layer={`ObjectLabelLayer-${context}`} pointerEvents="none">
        {filteredStructureLabels.map((label) => {
          const selected = selectedInteractionObjectId === label.id;
          const hovered = isObjectHovered(label.id);
          if (!selected && !hovered && !showObjectIds) return null;
          const mode = selected ? "selected" : hovered ? "hover" : "debug";
          const responsiveClass = mode === "selected"
            ? "block"
            : mode === "hover"
              ? "hidden [@media(hover:hover)]:block"
              : "hidden sm:block";
          const toneClass = mode === "selected"
            ? "border-blue-950 bg-blue-700 text-white ring-[3px] ring-white/95"
            : mode === "hover"
              ? "border-slate-950 bg-slate-950 text-white ring-[3px] ring-white/95"
              : "border-slate-700 bg-white/95 text-slate-950 ring-2 ring-white/90";

          return (
            <foreignObject
              key={`${context}-${label.id}`}
              x={label.x - 1450}
              y={label.y - 980}
              width={2900}
              height={900}
              overflow="visible"
            >
              <div className={`${responsiveClass} mx-auto w-max max-w-[2800px] rounded-md border-2 px-4 py-3 text-center shadow-[0_12px_28px_rgba(15,23,42,0.38)] ${toneClass}`}>
                <div className="whitespace-nowrap text-[240px] font-extrabold leading-none">{label.id}</div>
                {(mode !== "debug" || selected) && <div className="mt-2 max-w-[2700px] truncate text-[175px] font-semibold leading-none opacity-95">{label.name}</div>}
                {mode === "hover" && <div className="mt-2 text-[145px] font-semibold uppercase leading-none opacity-75">{label.type}</div>}
              </div>
            </foreignObject>
          );
        })}
      </g>
    );
  }

  function renderStructureHtmlLabelLayer() {
    return (
      <div className="pointer-events-none absolute inset-0 z-[47]" data-layer="ObjectLabelLayer-2d" data-coordinate-system="millimeter-floor-plan">
        {filteredStructureLabels.map((label) => {
          const selected = selectedInteractionObjectId === label.id;
          const hovered = isObjectHovered(label.id);
          if (!selected && !hovered && !showObjectIds) return null;
          const mode = selected ? "selected" : hovered ? "hover" : "debug";
          const responsiveClass = mode === "selected"
            ? "block"
            : mode === "hover"
              ? "hidden [@media(hover:hover)]:block"
              : "hidden sm:block";
          const toneClass = mode === "selected"
            ? "border-blue-950 bg-blue-700 text-white ring-2 ring-white"
            : mode === "hover"
              ? "border-slate-950 bg-slate-950 text-white ring-2 ring-white"
              : "border-slate-700 bg-white/95 text-slate-950 ring-1 ring-white";

          return (
            <div
              key={`2d-html-${label.id}`}
              className={`${responsiveClass} absolute w-max max-w-60 -translate-x-1/2 -translate-y-full rounded-md border-2 px-3 py-2 text-center shadow-[0_8px_20px_rgba(15,23,42,0.34)] ${toneClass}`}
              style={{
                left: `${(label.x / STRUCTURE_WIDTH_MM) * 100}%`,
                top: `${(label.y / STRUCTURE_HEIGHT_MM) * 100}%`,
                marginTop: "-8px"
              }}
            >
              <div className={`${mode === "selected" ? "text-base" : "text-sm"} whitespace-nowrap font-extrabold leading-none`}>{label.id}</div>
              {(mode !== "debug" || selected) && <div className="mt-1 max-w-56 truncate text-xs font-semibold leading-tight opacity-95">{label.name}</div>}
              {mode === "hover" && <div className="mt-1 text-[10px] font-semibold uppercase leading-none opacity-70">{label.type}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  function renderDimensionLayer() {
    if (!showDimensionLayer) return null;

    return (
      <g data-layer="DimensionLayer" pointerEvents="none">
        {houseStructure.walls.map((wall) => {
          const point = getWallLabelPoint(wall);
          const text = wall.kind === "arc" ? `${wall.length} mm` : `${wall.length} mm`;
          return (
            <text
              key={`dimension-${wall.id}`}
              x={point.x}
              y={point.y + 230}
              fill="#111827"
              fontSize={150}
              fontWeight={800}
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth={38}
              textAnchor="middle"
            >
              {text}
            </text>
          );
        })}
        {houseStructure.partitions.map((partition) => (
          <text
            key={`dimension-${partition.id}`}
            x={(partition.start.x + partition.end.x) / 2}
            y={(partition.start.y + partition.end.y) / 2 + 220}
            fill="#0f766e"
            fontSize={135}
            fontWeight={800}
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth={34}
            textAnchor="middle"
          >
            {getLineLength(partition.start, partition.end)} mm
          </text>
        ))}
        {houseStructure.stairs.map((stair) => (
          <text
            key={`dimension-${stair.id}`}
            x={(stair.start.x + stair.end.x) / 2}
            y={(stair.start.y + stair.end.y) / 2 + 240}
            fill="#6d28d9"
            fontSize={135}
            fontWeight={800}
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth={34}
            textAnchor="middle"
          >
            {getLineLength(stair.start, stair.end)} mm
          </text>
        ))}
        {houseStructure.doors.map((door) => {
          const host = getHostLine(door.hostId, door.hostType);
          if (!host) return null;
          const segment = getSegmentOnLine(host.start, host.end, door.positionOnWall, door.width);
          return (
            <text
              key={`dimension-${door.id}`}
              x={segment.center.x + segment.normal.x * 360}
              y={segment.center.y + segment.normal.y * 360}
              fill="#334155"
              fontSize={130}
              fontWeight={800}
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth={32}
              textAnchor="middle"
            >
              {door.width} mm
            </text>
          );
        })}
        {houseStructure.windows.map((windowObject) => {
          const host = getHostLine(windowObject.hostId, windowObject.hostType);
          if (!host) return null;
          const segment = getSegmentOnLine(host.start, host.end, windowObject.positionOnWall, windowObject.width);
          return (
            <text
              key={`dimension-${windowObject.id}`}
              x={segment.center.x + segment.normal.x * 310}
              y={segment.center.y + segment.normal.y * 310}
              fill="#0369a1"
              fontSize={130}
              fontWeight={800}
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth={32}
              textAnchor="middle"
            >
              {windowObject.width} mm
            </text>
          );
        })}
      </g>
    );
  }

  return (
    <div className={`relative min-h-0 flex-1 overflow-hidden bg-[#ece5da] ${focusMode ? "p-3" : "p-3 pb-36 sm:p-5 lg:pb-5"}`}>
      <div className="absolute left-5 top-5 z-10 rounded-2xl border border-white/80 bg-white/80 px-4 py-2 text-sm text-stone-500 shadow-sm backdrop-blur">
        {viewMode === "2d" ? `显示模式 · ${planSheetModeLabels[sheetMode]}` : "效果预览 · 3D 白模"}
      </div>

      {viewMode === "2d" ? (
        <div
          className={`relative grid h-full min-h-[calc(100vh-15rem)] touch-none items-start overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/60 p-3 pt-20 shadow-inner sm:min-h-[560px] sm:pt-16 ${
            plannerMode === "edit" ? "gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:justify-items-stretch" : "justify-items-center"
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          <div
            className="absolute right-5 top-5 z-[60] flex max-w-[calc(100%-2.5rem)] items-center gap-1 overflow-x-auto rounded-2xl border border-white/80 bg-white/95 p-1 text-sm font-semibold text-stone-600 shadow-sm backdrop-blur"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {plannerMode === "edit" && (
              <>
                <button className="rounded-xl px-2 py-2 text-xs hover:bg-stone-100 disabled:text-stone-300" disabled={!canUndo} onClick={onUndo} title="撤销 (Ctrl/Cmd+Z)" type="button">撤销</button>
                <button className="rounded-xl px-2 py-2 text-xs hover:bg-stone-100 disabled:text-stone-300" disabled={!canRedo} onClick={onRedo} title="重做 (Ctrl/Cmd+Shift+Z)" type="button">重做</button>
                <span className="h-5 w-px bg-stone-200" />
              </>
            )}
            <select
              className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none"
              aria-label="显示模式"
              value={sheetMode}
              onChange={(event) => setSheetMode(event.target.value as PlanSheetMode)}
              title={planSheetModeDescriptions[sheetMode]}
            >
              {Object.entries(planSheetModeLabels).map(([mode, label]) => (
                <option key={mode} value={mode}>{label}</option>
              ))}
            </select>
            <label className="hidden cursor-pointer items-center gap-2 rounded-xl px-2 py-2 hover:bg-stone-100 sm:flex">
              <input checked={showObjectIds} onChange={(event) => setShowObjectIds(event.target.checked)} type="checkbox" />
              <span className="whitespace-nowrap text-xs">显示对象 ID</span>
            </label>
            {showObjectIds && (
              <select className="hidden rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none sm:block" value={labelFilter} onChange={(event) => setLabelFilter(event.target.value as LabelFilter)}>
                <option value="all">全部标签</option>
                <option value="walls">墙体/隔断</option>
                <option value="openings">门窗</option>
                <option value="rooms">房间/院子</option>
                <option value="outdoor">院子构件</option>
                <option value="furniture">家具</option>
              </select>
            )}
            <button className="rounded-xl px-3 py-2 hover:bg-stone-100" onClick={() => zoomBy(-SCALE_STEP)} type="button">-</button>
            <span className="min-w-14 text-center">{Math.round(scale * 100)}%</span>
            <button className="rounded-xl px-3 py-2 hover:bg-stone-100" onClick={() => zoomBy(SCALE_STEP)} type="button">+</button>
            <button className="rounded-xl px-3 py-2 text-xs hover:bg-stone-100" onClick={resetViewport} type="button">复位</button>
          </div>

          {plannerMode !== "edit" && (
            <button
              className="absolute left-5 top-16 z-20 rounded-2xl border border-white/80 bg-white/92 px-4 py-3 text-xs font-semibold text-ink shadow-sm backdrop-blur hover:bg-white"
              onClick={() => setIsCleanupPanelOpen(true)}
              onPointerDown={(event) => event.stopPropagation()}
              type="button"
            >
              底图清理
            </button>
          )}

          <div
            className={`absolute left-5 top-16 z-30 max-h-[calc(100%-5.5rem)] w-72 overflow-auto rounded-2xl border border-white/80 bg-white/95 p-3 text-xs text-stone-600 shadow-sm backdrop-blur transition ${
              isCleanupPanelOpen ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-4 opacity-0"
            }`}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-ink">底图清理与美化</span>
              <button className="rounded-lg px-2 py-1 font-semibold text-stone-500 hover:bg-stone-100" onClick={() => setIsCleanupPanelOpen(false)} type="button">收起</button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-stone-500">风格预设</span>
                <select
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 font-semibold text-ink outline-none"
                  value={floorPlanVisualSettings.preset}
                  onChange={(event) => applyPreset(event.target.value as FloorPlanPreset)}
                >
                  {Object.entries(floorPlanPresetLabels).map(([preset, label]) => (
                    <option key={preset} value={preset}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="grid grid-cols-[56px_1fr_40px] items-center gap-2">
                <span>透明度</span>
                <input min="0.3" max="1" step="0.05" type="range" value={floorPlanVisualSettings.opacity} onChange={(event) => updateVisualSettings({ opacity: Number(event.target.value) })} />
                <span>{Math.round(floorPlanVisualSettings.opacity * 100)}%</span>
              </label>
              <label className="grid grid-cols-[56px_1fr_40px] items-center gap-2">
                <span>对比度</span>
                <input min="0.7" max="1.4" step="0.05" type="range" value={floorPlanVisualSettings.contrast} onChange={(event) => updateVisualSettings({ contrast: Number(event.target.value) })} />
                <span>{Math.round(floorPlanVisualSettings.contrast * 100)}%</span>
              </label>
              <label className="grid grid-cols-[56px_1fr_40px] items-center gap-2">
                <span>亮度</span>
                <input min="0.7" max="1.35" step="0.05" type="range" value={floorPlanVisualSettings.brightness} onChange={(event) => updateVisualSettings({ brightness: Number(event.target.value) })} />
                <span>{Math.round(floorPlanVisualSettings.brightness * 100)}%</span>
              </label>
              <label className="grid grid-cols-[56px_1fr_40px] items-center gap-2">
                <span>饱和度</span>
                <input min="0" max="1" step="0.05" type="range" value={floorPlanVisualSettings.saturation} onChange={(event) => updateVisualSettings({ saturation: Number(event.target.value), grayscale: false })} />
                <span>{Math.round(floorPlanVisualSettings.saturation * 100)}%</span>
              </label>
              <label className="flex items-center gap-2 rounded-lg bg-white px-2 py-1">
                <input checked={floorPlanVisualSettings.grayscale} onChange={(event) => updateVisualSettings({ grayscale: event.target.checked })} type="checkbox" />
                灰度模式
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["removeTextMarks", "文字/面积"],
                  ["removeWhiteBorder", "白色边框"],
                  ["hideDebugFrames", "旧白模框"],
                  ["lineEnhance", "线条增强"],
                  ["cleanWhiteBackground", "干净白底"],
                  ["sharpen", "锐化"]
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1 rounded-lg bg-white px-2 py-1">
                    <input
                      checked={Boolean(floorPlanVisualSettings[key as keyof FloorPlanVisualSettings])}
                      onChange={(event) => updateVisualSettings({ [key]: event.target.checked } as Partial<FloorPlanVisualSettings>)}
                      type="checkbox"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className="col-span-2 rounded-xl bg-ink px-3 py-2 font-semibold text-white hover:bg-ink/90" onClick={repairToHighDefinitionPlan} type="button">高清修复底图</button>
                <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={addHeuristicCleanPatches} type="button">局部清理痕迹</button>
                <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={clearWhiteBorderVisually} type="button">去除白边</button>
                <button className={`rounded-xl px-3 py-2 font-semibold ${isManualCleanupMode ? "bg-blue-600 text-white" : "bg-white text-ink ring-1 ring-stone-200"}`} onClick={() => setIsManualCleanupMode(!isManualCleanupMode)} type="button">手动清理</button>
                <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50 disabled:text-stone-300" disabled={!cleanupSelection} onClick={addSelectionPatch} type="button">清理选区</button>
                <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50 disabled:text-stone-300" disabled={!cleanPatches.length} onClick={undoCleanPatch} type="button">撤销清理</button>
                <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50 disabled:text-stone-300" disabled={!cleanPatches.length} onClick={clearCleanPatches} type="button">清空清理</button>
                <button className="col-span-2 rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={exportCleanFloorPlan} type="button">导出当前 PNG</button>
              </div>

              <div className="rounded-xl bg-slate-50 p-2 leading-5 text-slate-500">
                当前核心是一套可校验结构模型。底图只作参考，施工标注、家具布置和未来效果预览都从这套模型派生，避免多张图互相不同步。
              </div>

              <div className="space-y-2 border-t border-stone-200 pt-2">
                <p className="font-semibold text-ink">图层</p>
                {[
                  ["baseFloorPlan", "BaseFloorPlanLayer"],
                  ["cleanupPatch", "CleanupPatchLayer"],
                  ["semanticOverlay", "SemanticOverlayLayer"],
                  ["furnitureOverlay", "FurnitureOverlayLayer"],
                  ["debug", "DebugLayer"]
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-2">
                    <span>{label}</span>
                    <input
                      checked={layerVisibility[key as keyof typeof layerVisibility]}
                      onChange={(event) => updateLayerVisibility(key as keyof typeof layerVisibility, event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-2 border-t border-stone-200 pt-2">
                <p className="font-semibold text-ink">导出内容</p>
                <label className="flex items-center gap-2"><input checked={exportOptions.overlay} onChange={(event) => setExportOptions({ ...exportOptions, overlay: event.target.checked })} type="checkbox" />包含语义对象</label>
                <label className="flex items-center gap-2"><input checked={exportOptions.roomNames} onChange={(event) => setExportOptions({ ...exportOptions, roomNames: event.target.checked })} type="checkbox" />包含房间名称</label>
                <label className="flex items-center gap-2"><input checked={exportOptions.furniture} onChange={(event) => setExportOptions({ ...exportOptions, furniture: event.target.checked })} type="checkbox" />包含家具对象</label>
              </div>

              {cleanPatches.length > 0 && (
                <div className="space-y-1 border-t border-stone-200 pt-2">
                  <p className="font-semibold text-ink">清理记录 {cleanPatches.length}</p>
                  {cleanPatches.slice(-4).map((patch) => (
                    <div key={patch.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1">
                      <span className="truncate">{patch.id}</span>
                      <button className="font-semibold text-red-500" onClick={() => removeCleanPatch(patch.id)} type="button">删除</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {plannerMode === "edit" && (
            <aside
              className="relative z-50 w-full rounded-2xl border border-white/80 bg-white/94 p-3 text-xs text-stone-600 shadow-sm backdrop-blur"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-stone-200 pb-3">
                <div>
                  <p className="font-semibold text-ink">户型绘制</p>
                  <p className="mt-0.5 text-stone-400">mm 结构对象</p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="rounded-lg px-2 py-1 font-semibold text-blue-600 hover:bg-blue-50" onClick={() => onFocusModeChange(!focusMode)} type="button">{focusMode ? "退出专注" : "专注"}</button>
                  <button className="rounded-lg px-2 py-1 font-semibold text-stone-500 hover:bg-stone-100" onClick={() => onPlannerModeChange("view")} type="button">退出</button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-2 leading-5">
                  <p className="font-semibold text-ink">统一坐标</p>
                  <p>原点 ({houseStructure.coordinateSystem.origin.x}, {houseStructure.coordinateSystem.origin.y}) · {houseStructure.coordinateSystem.width} x {houseStructure.coordinateSystem.height} mm</p>
                  <p className="text-stone-400">单位 {houseStructure.coordinateSystem.unit} · 比例 {houseStructure.coordinateSystem.scale}:1</p>
                </div>

                <div className="space-y-2">
                  {drawToolSections.map((section) => (
                    <div key={section.title} className="rounded-xl border border-stone-200 bg-white p-2">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-semibold text-ink">{section.title}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">{section.tools.length}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {section.tools.map((tool) => (
                          <button
                            key={tool}
                            className={`min-h-[54px] rounded-xl px-2 py-2 text-left transition ${
                              drawTool === tool ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-200" : "bg-slate-50 text-ink ring-1 ring-stone-200 hover:bg-stone-100"
                            }`}
                            onClick={() => selectDrawTool(tool)}
                            type="button"
                          >
                            <span className="block text-sm font-semibold leading-tight">{drawToolLabels[tool]}</span>
                            <span className={`mt-1 block truncate text-[10px] leading-tight ${drawTool === tool ? "text-blue-50" : "text-stone-400"}`}>{drawToolHints[tool]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {drawTool === "wall-arc" && (
                  <div className="rounded-xl border border-stone-200 bg-white p-2">
                    <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                      <label className="block text-xs text-stone-500">
                        弧度角度
                        <input
                          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400"
                          max="180"
                          min="10"
                          step="5"
                          type="number"
                          value={arcSweepAngle}
                          onChange={(event) => setArcSweepAngle(Math.min(180, Math.max(10, Number(event.target.value) || 90)))}
                        />
                      </label>
                      <span className="pb-2 font-semibold text-stone-500">°</span>
                    </div>
                    <label className="mt-2 block text-xs text-stone-500">
                      弯曲方向
                      <select
                        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-semibold text-ink outline-none focus:border-blue-400"
                        value={arcDirection}
                        onChange={(event) => setArcDirection(event.target.value as "clockwise" | "counterclockwise")}
                      >
                        <option value="clockwise">顺时针</option>
                        <option value="counterclockwise">逆时针</option>
                      </select>
                    </label>
                  </div>
                )}

                {drawTool === "outdoor" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white disabled:bg-stone-300" disabled={outdoorDraft.length < 3} onClick={finishOutdoorDraft} type="button">完成院子</button>
                    <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200" onClick={cancelOutdoorDraft} type="button">取消</button>
                  </div>
                )}

                {(drawTool === "hardscape" || drawTool === "path" || drawTool === "planting") && (
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white disabled:bg-stone-300" disabled={(outdoorSurfaceDraft?.points.length ?? 0) < 3} onClick={finishOutdoorSurfaceDraft} type="button">完成区域</button>
                    <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200" onClick={cancelOutdoorSurfaceDraft} type="button">取消</button>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 p-2 leading-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink">当前工具</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-500">{drawToolLabels[drawTool]}</span>
                  </div>
                  <p className="mt-1 text-stone-500">{drawToolHints[drawTool]}</p>
                  {clickDrawStart && <p className="mt-1 font-semibold text-blue-600">线性对象已设置起点，双击结束连续绘制</p>}
                  {drawTool === "outdoor" && outdoorDraft.length > 0 && <p className="mt-1 font-semibold text-emerald-700">院子边界点：{outdoorDraft.length}</p>}
                  {(drawTool === "hardscape" || drawTool === "path" || drawTool === "planting") && outdoorSurfaceDraft && <p className="mt-1 font-semibold text-emerald-700">区域边界点：{outdoorSurfaceDraft.points.length}</p>}
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-2 leading-5">
                  <p className="font-semibold text-ink">当前选择</p>
                  <p className="truncate text-stone-500">{selectedInteractionObjectId || "未选择对象"}</p>
                  {selectedInteractionObjectId && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={toggleSelectedLock} type="button">
                        {objectIsLocked(selectedInteractionObjectId) ? "解锁" : "锁定"}
                      </button>
                      <button
                        className="rounded-xl bg-red-600 px-3 py-2 font-semibold text-white transition hover:bg-red-700 disabled:bg-stone-200 disabled:text-stone-400"
                        disabled={!canDeleteSelectedObject}
                        onClick={deleteSelectedObject}
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  )}
                  {selectedWall && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={splitSelectedWall} type="button">分割墙体</button>
                      <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={mergeSelectedWall} type="button">合并墙体</button>
                    </div>
                  )}
                  {selectedDoor && (
                    <button className="mt-2 w-full rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={rotateSelectedDoor} type="button">切换开门方向</button>
                  )}
                  {(selectedWindow || selectedBayWindow) && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={() => resizeSelectedWindow(-100)} type="button">{selectedBayWindow ? "飘窗变窄" : "窗变窄"}</button>
                      <button className="rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={() => resizeSelectedWindow(100)} type="button">{selectedBayWindow ? "飘窗变宽" : "窗变宽"}</button>
                    </div>
                  )}
                  {selectedInteractionFurniture && (
                    <button className="mt-2 w-full rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50" onClick={rotateSelectedFurniture} type="button">家具旋转 15°</button>
                  )}
                  {selectedStructureObject && !canDeleteSelectedStructure && !objectIsLocked(selectedStructureObject.id) && <p className="mt-2 text-red-500">房间由墙体自动生成，不能直接删除。</p>}
                  {selectedInteractionObjectId && objectIsLocked(selectedInteractionObjectId) && <p className="mt-2 text-amber-600">已锁定：不能拖拽、删除或调整。</p>}
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink">结构对象台账</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-stone-500">{structureObjectRows.length}</span>
                  </div>
                  <div className="max-h-72 space-y-1 overflow-auto pr-1">
                    {structureObjectRows.map((row) => {
                      const selected = selectedInteractionObjectId === row.id || selectedStructureId === row.id;
                      const locked = objectIsLocked(row.id);
                      return (
                        <button
                          key={row.id}
                          className={`block w-full rounded-lg px-2 py-2 text-left transition ${
                            selected ? "bg-blue-50 text-blue-950 ring-1 ring-blue-200" : "bg-slate-50 text-slate-600 hover:bg-stone-100"
                          }`}
                          onClick={() => selectRegistryObject(row)}
                          type="button"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold text-ink">{row.id}</span>
                            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-500">{locked ? "锁定" : row.label}</span>
                          </span>
                          <span className="mt-0.5 block truncate">{row.name}</span>
                          <span className="mt-0.5 block truncate text-stone-400">{row.detail}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {structureMessage && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-2 leading-5 text-blue-900">
                    {structureMessage}
                  </div>
                )}
              </div>
            </aside>
          )}

          <div
            ref={planRef}
            className={`relative aspect-[4/3] w-full max-w-5xl shrink-0 justify-self-center overflow-hidden rounded-[1.5rem] border shadow-soft transition ${
              isPlanZoomSelected ? "border-blue-500 ring-4 ring-blue-500/20" : "border-slate-200"
            }`}
            style={{
              backgroundColor: floorPlanVisualSettings.cleanWhiteBackground ? cleanFillColor : "#f8f4ec",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: "center center",
              width: "min(100%, 1024px, calc((100vh - 15rem) * 1.333))"
            }}
          >
            {visibleBaseFloorPlan && (
              <div className="absolute inset-0" data-layer="BaseFloorPlanLayer">
                {floor.floorPlanImage ? (
                  <img
                    alt={`${floor.label} 酷家乐平面底图`}
                    className="absolute inset-0 h-full w-full select-none object-contain"
                    draggable={false}
                    src={floor.floorPlanImage}
                    style={{
                      filter: floorPlanFilter,
                      opacity: plannerMode === "edit" ? Math.min(0.22, floorPlanVisualSettings.opacity * 0.24) : floorPlanVisualSettings.opacity,
                      mixBlendMode: floorPlanVisualSettings.repairMode ? "multiply" : "normal"
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(74,85,104,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(74,85,104,0.08)_1px,transparent_1px)] bg-[size:32px_32px]" />
                )}
                {floorPlanVisualSettings.removeWhiteBorder && <div className="absolute inset-0 ring-8 ring-inset ring-white/70" />}
                {repairOverlayStyles.map((style, index) => (
                  <div key={index} className="absolute inset-0 pointer-events-none" style={style} />
                ))}
              </div>
            )}

            {visibleCleanupPatch && (
              <div className="absolute inset-0 pointer-events-none" data-layer="CleanupPatchLayer" data-coordinate-system="percent-of-floor-plan">
                {cleanPatches.map((patch) => (
                  <div
                    key={patch.id}
                    className="absolute"
                    style={{
                      left: `${patch.rect.x}%`,
                      top: `${patch.rect.y}%`,
                      width: `${patch.rect.width}%`,
                      height: `${patch.rect.height}%`,
                      backgroundColor: patch.fillColor
                    }}
                    title={patch.notes}
                  />
                ))}
              </div>
            )}

            <svg
              className={`absolute inset-0 ${plannerMode === "edit" ? "z-[45] cursor-crosshair" : "z-20"}`}
              data-coordinate-system="millimeter-floor-plan"
              onDoubleClick={handleStructureDoubleClick}
              onPointerDown={handleStructurePointerDown}
              onPointerMove={handleStructurePointerMove}
              onPointerUp={handleStructurePointerUp}
              onPointerCancel={handleStructurePointerUp}
              viewBox={`0 0 ${STRUCTURE_WIDTH_MM} ${STRUCTURE_HEIGHT_MM}`}
            >
              {plannerMode === "edit" && drawTool !== "select" && <rect width={STRUCTURE_WIDTH_MM} height={STRUCTURE_HEIGHT_MM} fill="transparent" />}

              <g data-layer="OutdoorLayer">
                {houseStructure.outdoorSurfaces.map((surface) => {
                  const selected = isObjectSelected(surface.id);
                  const hovered = isObjectHovered(surface.id);
                  const fillColor = surface.surfaceType === "hardscape"
                    ? selected ? "rgba(148,163,184,0.36)" : "rgba(148,163,184,0.22)"
                    : surface.surfaceType === "path"
                      ? selected ? "rgba(202,138,4,0.3)" : "rgba(202,138,4,0.18)"
                      : selected ? "rgba(34,197,94,0.34)" : "rgba(34,197,94,0.2)";
                  const strokeColor = surface.surfaceType === "hardscape" ? "#64748b" : surface.surfaceType === "path" ? "#a16207" : "#16a34a";
                  return (
                    <polygon
                      key={surface.id}
                      points={surface.polygon.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill={fillColor}
                      stroke={hovered || selected ? strokeColor : `${strokeColor}99`}
                      strokeDasharray={surface.surfaceType === "planting" ? "100 70" : undefined}
                      strokeWidth={hovered || selected ? 48 : 30}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (shouldIgnoreStructureSelection()) return;
                        selectStructureObject(surface.id, `${surface.name} · ${(surface.area / 1_000_000).toFixed(2)} m2`);
                      }}
                      onMouseEnter={() => hoverObject(surface.id)}
                      onMouseLeave={() => clearHoverObject(surface.id)}
                    />
                  );
                })}
                {houseStructure.outdoors.map((outdoor) => (
                  <polygon
                    key={outdoor.id}
                    points={outdoor.polygon.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill={isObjectSelected(outdoor.id) ? "rgba(34,197,94,0.24)" : "rgba(34,197,94,0.15)"}
                    stroke={isObjectSelected(outdoor.id) ? "#16a34a" : isObjectHovered(outdoor.id) ? "#22c55e" : "#65a30d"}
                    strokeWidth={isObjectHovered(outdoor.id) ? 52 : 36}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (shouldIgnoreStructureSelection()) return;
                      selectStructureObject(outdoor.id, `${outdoor.name} · ${(outdoor.area / 1_000_000).toFixed(2)} m2`);
                    }}
                    onMouseEnter={() => hoverObject(outdoor.id)}
                    onMouseLeave={() => clearHoverObject(outdoor.id)}
                  />
                ))}
                {outdoorDraft.length > 0 && (
                  <polyline
                    points={outdoorDraft.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill="none"
                    stroke="#16a34a"
                    strokeDasharray="120 90"
                    strokeWidth={42}
                  />
                )}
                {outdoorSurfaceDraft && outdoorSurfaceDraft.points.length > 0 && (
                  <polyline
                    points={outdoorSurfaceDraft.points.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill={outdoorSurfaceDraft.points.length >= 3 ? "rgba(34,197,94,0.08)" : "none"}
                    stroke={outdoorSurfaceDraft.tool === "hardscape" ? "#64748b" : outdoorSurfaceDraft.tool === "path" ? "#a16207" : "#16a34a"}
                    strokeDasharray="120 90"
                    strokeWidth={42}
                  />
                )}
              </g>

              <g data-layer="FenceLayer">
                {houseStructure.fences.map((fence) => {
                  const isSelected = isObjectSelected(fence.id);
                  const isHovered = isObjectHovered(fence.id);
                  const locked = objectIsLocked(fence.id);
                  return (
                    <g key={fence.id}>
                      <line
                        x1={fence.start.x}
                        y1={fence.start.y}
                        x2={fence.end.x}
                        y2={fence.end.y}
                        stroke="transparent"
                        pointerEvents="stroke"
                        strokeLinecap="round"
                        strokeWidth={Math.max(360, fence.thickness + 230)}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (shouldIgnoreStructureSelection()) return;
                          selectStructureObject(fence.id, `${fence.name} · ${getLineLength(fence.start, fence.end)} mm`);
                        }}
                        onPointerDown={(event) => {
                          if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                          const point = getMmPosition(event);
                          if (!point) return;
                          event.stopPropagation();
                          structureMoveRef.current = { pointerId: event.pointerId, objectId: fence.id, lastPoint: point, moved: false };
                          event.currentTarget.setPointerCapture(event.pointerId);
                          selectStructureObject(fence.id, `${fence.name} · 拖动整段篱笆`);
                        }}
                        onMouseEnter={() => hoverObject(fence.id)}
                        onMouseLeave={() => clearHoverObject(fence.id)}
                      />
                      <line
                        x1={fence.start.x}
                        y1={fence.start.y}
                        x2={fence.end.x}
                        y2={fence.end.y}
                        pointerEvents="none"
                        stroke={locked ? "#9ca3af" : isSelected ? "#14532d" : isHovered ? "#166534" : "#365314"}
                        strokeDasharray="90 70"
                        strokeLinecap="round"
                        strokeWidth={isSelected || isHovered ? fence.thickness + 34 : fence.thickness}
                        opacity={locked ? 0.55 : 1}
                      />
                      {renderDragHandle(fence.id, "start", fence.start)}
                      {renderDragHandle(fence.id, "end", fence.end)}
                    </g>
                  );
                })}
              </g>

              <g data-layer="RoomLayer">
                {houseStructure.rooms.map((room) => (
                  <polygon
                    key={room.id}
                    points={room.boundary.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill={isObjectSelected(room.id) ? "rgba(59,130,246,0.13)" : isObjectHovered(room.id) ? "rgba(59,130,246,0.09)" : "rgba(59,130,246,0.055)"}
                    stroke={isObjectSelected(room.id) ? "#2563eb" : "rgba(37,99,235,0.28)"}
                    strokeWidth={isObjectSelected(room.id) || isObjectHovered(room.id) ? 36 : 18}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (shouldIgnoreStructureSelection()) return;
                      selectStructureObject(room.id, `${room.roomNumber} · ${room.name} · ${(room.area / 1_000_000).toFixed(2)} m2`);
                    }}
                    onMouseEnter={() => hoverObject(room.id)}
                    onMouseLeave={() => clearHoverObject(room.id)}
                  />
                ))}
              </g>

              <g data-layer="WallLayer">
                {houseStructure.walls.map((wall) => {
                  const isSelected = isObjectSelected(wall.id);
                  const isHovered = isObjectHovered(wall.id);
                  const locked = objectIsLocked(wall.id);
                  if (wall.kind === "arc") {
                    return (
                      <g key={wall.id}>
                        <path
                          d={getArcPath(wall)}
                          fill="none"
                          pointerEvents="stroke"
                          stroke="transparent"
                          strokeLinecap="round"
                          strokeWidth={Math.max(420, wall.thickness + 220)}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (shouldIgnoreStructureSelection()) return;
                            selectStructureObject(wall.id, `${wall.name} · 弧形墙 · ${wall.length} mm`);
                          }}
                          onPointerDown={(event) => {
                            if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                            const point = getMmPosition(event);
                            if (!point) return;
                            event.stopPropagation();
                            structureMoveRef.current = { pointerId: event.pointerId, objectId: wall.id, lastPoint: point, moved: false };
                            event.currentTarget.setPointerCapture(event.pointerId);
                            selectStructureObject(wall.id, `${wall.name} · 拖动整面弧墙`);
                          }}
                          onMouseEnter={() => hoverObject(wall.id)}
                          onMouseLeave={() => clearHoverObject(wall.id)}
                        />
                        <path
                          d={getArcPath(wall)}
                          fill="none"
                          pointerEvents="none"
                          stroke={locked ? "#9ca3af" : isSelected ? "#2563eb" : isHovered ? "#334155" : "#5e6468"}
                          strokeLinecap="round"
                          strokeWidth={isSelected || isHovered ? wall.thickness + 34 : wall.thickness}
                          opacity={locked ? 0.55 : 1}
                        />
                      </g>
                    );
                  }
                  return (
                    <g key={wall.id}>
                      <line
                        x1={wall.start.x}
                        y1={wall.start.y}
                        x2={wall.end.x}
                        y2={wall.end.y}
                        stroke="transparent"
                        pointerEvents="stroke"
                        strokeLinecap="square"
                        strokeWidth={Math.max(420, wall.thickness + 220)}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (shouldIgnoreStructureSelection()) return;
                          selectStructureObject(wall.id, `${wall.name} · ${wall.length} mm`);
                        }}
                        onPointerDown={(event) => {
                          if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                          const point = getMmPosition(event);
                          if (!point) return;
                          event.stopPropagation();
                          structureMoveRef.current = { pointerId: event.pointerId, objectId: wall.id, lastPoint: point, moved: false };
                          event.currentTarget.setPointerCapture(event.pointerId);
                          selectStructureObject(wall.id, `${wall.name} · 拖动整面墙`);
                        }}
                        onMouseEnter={() => hoverObject(wall.id)}
                        onMouseLeave={() => clearHoverObject(wall.id)}
                      />
                      <line
                        x1={wall.start.x}
                        y1={wall.start.y}
                        x2={wall.end.x}
                        y2={wall.end.y}
                        pointerEvents="none"
                        stroke={locked ? "#9ca3af" : isSelected ? "#2563eb" : isHovered ? "#334155" : "#5e6468"}
                        strokeLinecap="square"
                        strokeWidth={isSelected || isHovered ? wall.thickness + 34 : wall.thickness}
                        opacity={locked ? 0.55 : 1}
                      />
                      {locked && <text x={(wall.start.x + wall.end.x) / 2} y={(wall.start.y + wall.end.y) / 2 - 140} fill="#92400e" fontSize={160} fontWeight={700}>LOCK</text>}
                      {renderDragHandle(wall.id, "start", wall.start)}
                      {renderDragHandle(wall.id, "end", wall.end)}
                    </g>
                  );
                })}
              </g>

              <g data-layer="PartitionLayer">
                {houseStructure.partitions.map((partition) => {
                  const isSelected = isObjectSelected(partition.id);
                  const isHovered = isObjectHovered(partition.id);
                  const locked = objectIsLocked(partition.id);
                  return (
                    <g key={partition.id}>
                      <line
                        x1={partition.start.x}
                        y1={partition.start.y}
                        x2={partition.end.x}
                        y2={partition.end.y}
                        stroke="transparent"
                        pointerEvents="stroke"
                        strokeLinecap="round"
                        strokeWidth={Math.max(320, partition.thickness + 200)}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (shouldIgnoreStructureSelection()) return;
                          selectStructureObject(partition.id, `${partition.name} · 可拆改隔断`);
                        }}
                        onPointerDown={(event) => {
                          if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                          const point = getMmPosition(event);
                          if (!point) return;
                          event.stopPropagation();
                          structureMoveRef.current = { pointerId: event.pointerId, objectId: partition.id, lastPoint: point, moved: false };
                          event.currentTarget.setPointerCapture(event.pointerId);
                          selectStructureObject(partition.id, `${partition.name} · 拖动整段隔断`);
                        }}
                        onMouseEnter={() => hoverObject(partition.id)}
                        onMouseLeave={() => clearHoverObject(partition.id)}
                      />
                      <line
                        x1={partition.start.x}
                        y1={partition.start.y}
                        x2={partition.end.x}
                        y2={partition.end.y}
                        pointerEvents="none"
                        stroke={locked ? "#9ca3af" : isSelected ? "#2563eb" : isHovered ? "#14b8a6" : "#0f766e"}
                        strokeDasharray="160 90"
                        strokeLinecap="round"
                        strokeOpacity={Math.max(0.35, 1 - partition.transparency * 0.5)}
                        strokeWidth={isSelected || isHovered ? partition.thickness + 32 : partition.thickness}
                        opacity={locked ? 0.55 : 1}
                      />
                      {renderDragHandle(partition.id, "start", partition.start)}
                      {renderDragHandle(partition.id, "end", partition.end)}
                    </g>
                  );
                })}
              </g>

              <g data-layer="StairLayer">
                {houseStructure.stairs.map((stair) => {
                  const isSelected = isObjectSelected(stair.id);
                  const isHovered = isObjectHovered(stair.id);
                  const locked = objectIsLocked(stair.id);
                  const stairGeometry = getStairGeometry(stair);
                  const arrowStart = {
                    x: stair.start.x + stairGeometry.ux * Math.min(360, stairGeometry.length * 0.2),
                    y: stair.start.y + stairGeometry.uy * Math.min(360, stairGeometry.length * 0.2)
                  };
                  const arrowEnd = {
                    x: stair.end.x - stairGeometry.ux * Math.min(360, stairGeometry.length * 0.2),
                    y: stair.end.y - stairGeometry.uy * Math.min(360, stairGeometry.length * 0.2)
                  };
                  const headLeft = {
                    x: arrowEnd.x - stairGeometry.ux * 210 + stairGeometry.normal.x * 150,
                    y: arrowEnd.y - stairGeometry.uy * 210 + stairGeometry.normal.y * 150
                  };
                  const headRight = {
                    x: arrowEnd.x - stairGeometry.ux * 210 - stairGeometry.normal.x * 150,
                    y: arrowEnd.y - stairGeometry.uy * 210 - stairGeometry.normal.y * 150
                  };
                  return (
                    <g key={stair.id}>
                      <line
                        x1={stair.start.x}
                        y1={stair.start.y}
                        x2={stair.end.x}
                        y2={stair.end.y}
                        stroke="transparent"
                        pointerEvents="stroke"
                        strokeLinecap="round"
                        strokeWidth={Math.max(520, stair.width + 220)}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (shouldIgnoreStructureSelection()) return;
                          selectStructureObject(stair.id, `${stair.name} · ${getLineLength(stair.start, stair.end)} mm · ${stair.stepCount} 踏`);
                        }}
                        onPointerDown={(event) => {
                          if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                          const point = getMmPosition(event);
                          if (!point) return;
                          event.stopPropagation();
                          structureMoveRef.current = { pointerId: event.pointerId, objectId: stair.id, lastPoint: point, moved: false };
                          event.currentTarget.setPointerCapture(event.pointerId);
                          selectStructureObject(stair.id, `${stair.name} · 拖动整段楼梯`);
                        }}
                        onMouseEnter={() => hoverObject(stair.id)}
                        onMouseLeave={() => clearHoverObject(stair.id)}
                      />
                      <line
                        x1={stair.start.x}
                        y1={stair.start.y}
                        x2={stair.end.x}
                        y2={stair.end.y}
                        pointerEvents="none"
                        stroke={locked ? "#9ca3af" : isSelected ? "#7c3aed" : isHovered ? "#6d28d9" : "#8b5cf6"}
                        strokeLinecap="round"
                        strokeOpacity={locked ? 0.38 : 0.18}
                        strokeWidth={stair.width}
                      />
                      {stairGeometry.steps.map((step, index) => (
                        <line
                          key={`${stair.id}-step-${index}`}
                          x1={step.start.x}
                          y1={step.start.y}
                          x2={step.end.x}
                          y2={step.end.y}
                          pointerEvents="none"
                          stroke={locked ? "#9ca3af" : "#4c1d95"}
                          strokeLinecap="round"
                          strokeOpacity={locked ? 0.45 : 0.72}
                          strokeWidth={isSelected || isHovered ? 34 : 24}
                        />
                      ))}
                      <line
                        x1={arrowStart.x}
                        y1={arrowStart.y}
                        x2={arrowEnd.x}
                        y2={arrowEnd.y}
                        pointerEvents="none"
                        stroke={locked ? "#9ca3af" : isSelected ? "#4c1d95" : "#6d28d9"}
                        strokeLinecap="round"
                        strokeWidth={isSelected || isHovered ? 46 : 32}
                      />
                      <path
                        d={`M ${arrowEnd.x} ${arrowEnd.y} L ${headLeft.x} ${headLeft.y} L ${headRight.x} ${headRight.y} Z`}
                        fill={locked ? "#9ca3af" : isSelected ? "#4c1d95" : "#6d28d9"}
                        pointerEvents="none"
                      />
                      {renderDragHandle(stair.id, "start", stair.start)}
                      {renderDragHandle(stair.id, "end", stair.end)}
                    </g>
                  );
                })}
              </g>

              <g data-layer="DoorWindowLayer">
                {houseStructure.doors.map((door) => {
                  const host = getHostLine(door.hostId, door.hostType);
                  if (!host) return null;
                  const segment = getSegmentOnLine(host.start, host.end, door.positionOnWall, door.width);
                  const opensFromStart = door.openDirection === "leftIn" || door.openDirection === "leftOut";
                  const opensInside = door.openDirection === "leftIn" || door.openDirection === "rightIn";
                  const normal = opensInside ? segment.normal : { x: -segment.normal.x, y: -segment.normal.y };
                  const hinge = opensFromStart ? segment.start : segment.end;
                  const leafEnd = opensFromStart ? segment.end : segment.start;
                  const qx = segment.center.x + normal.x * door.width * 0.58;
                  const qy = segment.center.y + normal.y * door.width * 0.58;
                  const leafOpenEnd = {
                    x: hinge.x + normal.x * door.width * 0.78,
                    y: hinge.y + normal.y * door.width * 0.78
                  };
                  const isSelected = isObjectSelected(door.id);
                  const isHovered = isObjectHovered(door.id);
                  const locked = objectIsLocked(door.id);
                  return (
                    <g
                      key={door.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (shouldIgnoreStructureSelection()) return;
                        selectStructureObject(door.id, `${door.name} · ${door.width} mm`);
                      }}
                      onMouseEnter={() => hoverObject(door.id)}
                      onMouseLeave={() => clearHoverObject(door.id)}
                      onPointerDown={(event) => {
                        if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                        event.stopPropagation();
                        openingDragRef.current = { pointerId: event.pointerId, objectId: door.id, objectType: "door", moved: false };
                        event.currentTarget.setPointerCapture(event.pointerId);
                        selectStructureObject(door.id, `${door.name} · 沿墙滑动`);
                      }}
                    >
                      <line x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} stroke="#ffffff" strokeLinecap="round" strokeWidth={host.thickness + 44} />
                      <line x1={hinge.x} y1={hinge.y} x2={leafOpenEnd.x} y2={leafOpenEnd.y} stroke={locked ? "#9ca3af" : isSelected ? "#2563eb" : isHovered ? "#0f172a" : "#64748b"} strokeLinecap="round" strokeWidth={isSelected || isHovered ? 34 : 20} />
                      <path d={`M ${hinge.x} ${hinge.y} Q ${qx} ${qy} ${leafEnd.x} ${leafEnd.y}`} fill="none" stroke={locked ? "#9ca3af" : isSelected ? "#2563eb" : isHovered ? "#0f172a" : "#64748b"} strokeWidth={isSelected || isHovered ? 34 : 20} />
                    </g>
                  );
                })}

                {houseStructure.windows.map((windowObject) => {
                  const host = getHostLine(windowObject.hostId, windowObject.hostType);
                  if (!host) return null;
                  const segment = getSegmentOnLine(host.start, host.end, windowObject.positionOnWall, windowObject.width);
                  const isSelected = isObjectSelected(windowObject.id);
                  const isHovered = isObjectHovered(windowObject.id);
                  const locked = objectIsLocked(windowObject.id);
                  return (
                    <g
                      key={windowObject.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (shouldIgnoreStructureSelection()) return;
                        selectStructureObject(windowObject.id, `${windowObject.name} · ${windowObject.width} mm`);
                      }}
                      onMouseEnter={() => hoverObject(windowObject.id)}
                      onMouseLeave={() => clearHoverObject(windowObject.id)}
                      onPointerDown={(event) => {
                        if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                        event.stopPropagation();
                        openingDragRef.current = { pointerId: event.pointerId, objectId: windowObject.id, objectType: "window", moved: false };
                        event.currentTarget.setPointerCapture(event.pointerId);
                        selectStructureObject(windowObject.id, `${windowObject.name} · 沿墙滑动`);
                      }}
                    >
                      <line x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} stroke="#ffffff" strokeLinecap="round" strokeWidth={Math.max(70, host.thickness * 0.72)} />
                      <line x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} stroke={locked ? "#9ca3af" : isSelected ? "#2563eb" : isHovered ? "#0284c7" : "#38bdf8"} strokeLinecap="round" strokeWidth={isSelected || isHovered ? 42 : 28} />
                    </g>
                  );
                })}

                {houseStructure.bayWindows.map((bayWindow) => {
                  const host = getHostLine(bayWindow.wallId, "wall");
                  if (!host) return null;
                  const segment = getSegmentOnLine(host.start, host.end, bayWindow.positionOnWall, bayWindow.width);
                  const isSelected = isObjectSelected(bayWindow.id);
                  const isHovered = isObjectHovered(bayWindow.id);
                  const points = [
                    segment.start,
                    segment.end,
                    { x: segment.end.x + segment.normal.x * bayWindow.depth, y: segment.end.y + segment.normal.y * bayWindow.depth },
                    { x: segment.start.x + segment.normal.x * bayWindow.depth, y: segment.start.y + segment.normal.y * bayWindow.depth }
                  ];
                  return (
                    <polygon
                      key={bayWindow.id}
                      points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill={isSelected ? "rgba(37,99,235,0.2)" : "rgba(186,230,253,0.36)"}
                      stroke={isSelected ? "#2563eb" : isHovered ? "#0f172a" : "#0284c7"}
                      strokeWidth={isSelected || isHovered ? 44 : 24}
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (shouldIgnoreStructureSelection()) return;
                        selectStructureObject(bayWindow.id, `${bayWindow.name} · 宽 ${bayWindow.width} mm · 外扩 ${bayWindow.depth} mm`);
                      }}
                      onPointerDown={(event) => {
                        if (plannerMode !== "edit" || drawTool !== "select") return;
                        event.stopPropagation();
                        selectStructureObject(bayWindow.id, `${bayWindow.name} · 宽 ${bayWindow.width} mm`);
                      }}
                      onMouseEnter={() => hoverObject(bayWindow.id)}
                      onMouseLeave={() => clearHoverObject(bayWindow.id)}
                    />
                  );
                })}

                {houseStructure.skylights.map((skylight) => {
                  const isSelected = isObjectSelected(skylight.id);
                  const isHovered = isObjectHovered(skylight.id);
                  const halfWidth = skylight.width / 2;
                  const halfDepth = skylight.depth / 2;
                  const points = [
                    { x: skylight.center.x - halfWidth, y: skylight.center.y - halfDepth },
                    { x: skylight.center.x + halfWidth, y: skylight.center.y - halfDepth },
                    { x: skylight.center.x + halfWidth, y: skylight.center.y + halfDepth },
                    { x: skylight.center.x - halfWidth, y: skylight.center.y + halfDepth }
                  ];
                  return (
                    <g
                      key={skylight.id}
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (shouldIgnoreStructureSelection()) return;
                        selectStructureObject(skylight.id, `${skylight.name} · ${skylight.width} x ${skylight.depth} mm`);
                      }}
                      onPointerDown={(event) => {
                        if (plannerMode !== "edit" || drawTool !== "select") return;
                        event.stopPropagation();
                        selectStructureObject(skylight.id, `${skylight.name} · ${skylight.width} x ${skylight.depth} mm`);
                      }}
                      onMouseEnter={() => hoverObject(skylight.id)}
                      onMouseLeave={() => clearHoverObject(skylight.id)}
                    >
                      <polygon
                        points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                        fill={isSelected ? "rgba(14,165,233,0.22)" : "rgba(125,211,252,0.24)"}
                        stroke={isSelected ? "#2563eb" : isHovered ? "#0f172a" : "#0ea5e9"}
                        strokeWidth={isSelected || isHovered ? 38 : 22}
                      />
                      <line x1={points[0].x} y1={points[0].y} x2={points[2].x} y2={points[2].y} stroke="#0ea5e9" strokeWidth={14} />
                      <line x1={points[1].x} y1={points[1].y} x2={points[3].x} y2={points[3].y} stroke="#0ea5e9" strokeWidth={14} />
                    </g>
                  );
                })}
              </g>

              {renderDimensionLayer()}

              {drawPreview && (
                <g data-layer="DrawPreviewLayer">
                  <circle
                    cx={drawPreview.start.x}
                    cy={drawPreview.start.y}
                    r={105}
                    fill="#ffffff"
                    stroke={drawTool === "partition" ? "#0f766e" : drawTool === "stair" ? "#7c3aed" : drawTool === "fence" ? "#365314" : "#2563eb"}
                    strokeWidth={34}
                  />
                  {arcDrawPreview ? (
                    <path
                      d={getArcPath(arcDrawPreview)}
                      fill="none"
                      stroke="#2563eb"
                      strokeDasharray="120 80"
                      strokeLinecap="round"
                      strokeWidth={220}
                    />
                  ) : (
                    <line
                      x1={drawPreview.start.x}
                      y1={drawPreview.start.y}
                      x2={drawPreview.end.x}
                      y2={drawPreview.end.y}
                      stroke={drawTool === "partition" ? "#0f766e" : drawTool === "stair" ? "#7c3aed" : drawTool === "fence" ? "#365314" : "#2563eb"}
                      strokeDasharray="120 80"
                      strokeLinecap="round"
                      strokeWidth={drawTool === "partition" ? 90 : drawTool === "fence" ? 120 : 220}
                    />
                  )}
                  <circle
                    cx={drawPreview.end.x}
                    cy={drawPreview.end.y}
                    r={74}
                    fill={drawTool === "partition" ? "#0f766e" : drawTool === "stair" ? "#7c3aed" : drawTool === "fence" ? "#365314" : "#2563eb"}
                    opacity={getLineLength(drawPreview.start, drawPreview.end) > 120 ? 1 : 0.45}
                  />
                  <text x={(drawPreview.start.x + drawPreview.end.x) / 2 + 80} y={(drawPreview.start.y + drawPreview.end.y) / 2 - 80} fill="#0f172a" fontSize={180} fontWeight={700}>
                    {arcDrawPreview ? `${arcDrawPreview.length} mm · ${arcSweepAngle}°` : `${getLineLength(drawPreview.start, drawPreview.end)} mm`}
                  </text>
                </g>
              )}
            </svg>

            <div className="absolute left-5 top-5 z-40 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-stone-500 shadow-sm">
              {isStructureSheetMode
                ? "空白结构：底图隐藏，单位 mm"
                : isConstructionSheetMode
                  ? "施工标注：结构尺寸来自模型"
                  : sheetMode === "furnishing"
                    ? "家具布置：家具为独立对象"
                    : "效果预览：未来承接 3D 渲染"}
            </div>
            <div className="absolute right-5 bottom-5 z-40 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              {isStructureSheetMode
                ? "结构对象：墙 / 门窗 / 楼梯 / 院子"
                : isConstructionSheetMode
                  ? "施工表达：尺寸 / 洞口 / 后续备注"
                  : sheetMode === "furnishing"
                    ? "家具对象：尺寸 / 位置 / 朝向"
                    : "展示表达：家具 / 语义 / 白模"}
            </div>

            {visibleDebugLayer && (
              <div className="absolute inset-0" data-layer="DebugLayer" data-coordinate-system="percent-of-floor-plan">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="absolute rounded-xl border border-dashed border-amber-500/70 bg-amber-100/15 px-3 py-2 text-xs font-semibold text-amber-700"
                    style={{ left: `${room.bounds.x}%`, top: `${room.bounds.y}%`, width: `${room.bounds.width}%`, height: `${room.bounds.height}%` }}
                  >
                    {room.name}
                  </div>
                ))}

                {walls.map((wall) => {
                  const width = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
                  const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) * (180 / Math.PI);
                  return (
                    <div
                      key={wall.id}
                      className="absolute origin-left rounded-full bg-amber-500/80"
                      style={{
                        left: `${wall.x1}%`,
                        top: `${wall.y1}%`,
                        width: `${width}%`,
                        height: `${wall.thickness * 3}px`,
                        transform: `rotate(${angle}deg)`
                      }}
                    />
                  );
                })}
              </div>
            )}

            {visibleFurnitureOverlay && (
              <div className="absolute inset-0 z-30" data-layer="FurnitureOverlayLayer" data-coordinate-system="percent-of-floor-plan">
              {furniture.map((item) => {
                const isSelected = isObjectSelected(item.id);
                const isHovered = isObjectHovered(item.id);
                const locked = objectIsLocked(item.id) || item.locked;
                const width = Math.max(6, item.dimensions.width / 24);
                const height = Math.max(5, item.dimensions.depth / 24);
                return (
                  <button
                    key={item.id}
                    className={`absolute grid cursor-grab place-items-center rounded-md border text-[10px] font-bold text-emerald-950/90 transition hover:scale-105 ${
                      isSelected ? "z-20 border-blue-500 bg-emerald-100/70 ring-4 ring-blue-500/20" : isHovered ? "border-emerald-700 bg-emerald-100/75 ring-2 ring-emerald-500/20" : "border-emerald-600/55 bg-emerald-100/55"
                    }`}
                    style={{
                      left: `${item.position.x}%`,
                      top: `${item.position.y}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      minWidth: "48px",
                      minHeight: "40px",
                      opacity: locked ? 0.6 : 1,
                      transform: `translate(-50%, -50%) rotate(${item.position.rotation}deg)`
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (furnitureDragRef.current?.moved) return;
                      setSelectedStructureId("");
                      selectObject(item.id);
                      onSelectFurniture(item);
                      onActiveObjectChange(item.id);
                    }}
                    onMouseEnter={() => hoverObject(item.id)}
                    onMouseLeave={() => clearHoverObject(item.id)}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setSelectedStructureId("");
                      selectObject(item.id);
                      onSelectFurniture(item);
                      onActiveObjectChange(item.id);
                      if (plannerMode !== "edit" || drawTool !== "select" || locked) return;
                      const position = getPercentPosition(event);
                      if (!position) return;
                      furnitureDragRef.current = { pointerId: event.pointerId, objectId: item.id, lastPosition: position, moved: false };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      const drag = furnitureDragRef.current;
                      if (!drag || drag.pointerId !== event.pointerId || drag.objectId !== item.id) return;
                      const position = getPercentPosition(event);
                      if (!position) return;
                      const delta = { x: position.x - drag.lastPosition.x, y: position.y - drag.lastPosition.y };
                      const nextModel = runInteractionDrag({ houseStructure, furniture }, interactionState, item.id, delta);
                      onFurnitureChange(nextModel.furniture);
                      drag.lastPosition = position;
                      drag.moved = true;
                    }}
                    onPointerUp={(event) => {
                      if (furnitureDragRef.current?.pointerId === event.pointerId) {
                        window.setTimeout(() => {
                          furnitureDragRef.current = null;
                        }, 0);
                      }
                    }}
                    type="button"
                    title={`${locked ? "已锁定 · " : ""}${item.name}`}
                  >
                    <span className="max-w-full truncate px-1">{locked ? "LOCK" : item.code}</span>
                  </button>
                );
              })}
              </div>
            )}

            {visibleFurnitureOverlay && (
              <div className="pointer-events-none absolute inset-0 z-[46]" data-layer="ObjectLabelLayer-Furniture" data-coordinate-system="percent-of-floor-plan">
                {furniture.map((item) => {
                  const selected = selectedInteractionObjectId === item.id;
                  const hovered = isObjectHovered(item.id);
                  const debugVisible = showObjectIds && (labelFilter === "all" || labelFilter === "furniture");
                  if (!selected && !hovered && !debugVisible) return null;
                  const mode = selected ? "selected" : hovered ? "hover" : "debug";
                  const responsiveClass = mode === "selected"
                    ? "block"
                    : mode === "hover"
                      ? "hidden [@media(hover:hover)]:block"
                      : "hidden sm:block";
                  const toneClass = mode === "selected"
                    ? "border-blue-950 bg-blue-700 text-white ring-2 ring-white"
                    : mode === "hover"
                      ? "border-slate-950 bg-slate-950 text-white ring-2 ring-white"
                      : "border-slate-700 bg-white/95 text-slate-950 ring-1 ring-white";
                  return (
                    <div
                      key={`furniture-label-${item.id}`}
                      className={`${responsiveClass} absolute w-max max-w-60 -translate-x-1/2 -translate-y-full rounded-md border-2 px-3 py-2 text-center text-sm leading-tight shadow-[0_8px_20px_rgba(15,23,42,0.34)] ${toneClass}`}
                      style={{
                        left: `${item.position.x}%`,
                        top: `${item.position.y + (furnitureLabelOffsets.get(item.id) ?? 0)}%`,
                        marginTop: "-8px"
                      }}
                    >
                      <div className="font-extrabold">{item.id}</div>
                      {(mode !== "debug" || selected) && <div className="mt-1 max-w-56 truncate text-xs font-semibold opacity-95">{item.name}</div>}
                      {mode === "hover" && <div className="mt-1 text-[10px] font-semibold uppercase opacity-70">Furniture</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {visibleSemanticOverlay && (
              <div className="absolute inset-0 z-40" data-layer="SemanticOverlayLayer" data-coordinate-system="percent-of-floor-plan">
              {semanticObjects.map((object) => {
                const position = getSemanticObjectPosition(object);
                if (!position) return null;
                const isSelected = object.id === selectedSemanticObjectId;
                const isDraggableFurniture = object.category === "Furniture";
                const boundary = getBoundary(object);
                const wallLine = object.category === "Wall" ? getWallLine(object) : null;

                if ((object.category === "Room" || object.category === "Zone") && boundary.length >= 3) {
                  const points = boundary.map((point) => `${point.x}% ${point.y}%`).join(", ");
                  return (
                    <button
                      key={object.id}
                      className={`absolute inset-0 transition ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                      style={{
                        clipPath: `polygon(${points})`,
                        backgroundColor: object.category === "Room" ? "rgba(59, 130, 246, 0.08)" : "rgba(47, 125, 103, 0.1)",
                        border: "1px solid rgba(37, 99, 235, 0.28)"
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectSemanticObject(object);
                      }}
                      title={`${semanticCategoryLabels[object.category]} · ${object.name}`}
                      type="button"
                    />
                  );
                }

                if (wallLine) {
                  const width = Math.hypot(wallLine.end.x - wallLine.start.x, wallLine.end.y - wallLine.start.y);
                  const angle = Math.atan2(wallLine.end.y - wallLine.start.y, wallLine.end.x - wallLine.start.x) * (180 / Math.PI);
                  return (
                    <button
                      key={object.id}
                      className={`absolute origin-left rounded-full ${isSelected ? "bg-blue-500 ring-4 ring-blue-500/20" : "bg-slate-700/75"}`}
                      style={{
                        left: `${wallLine.start.x}%`,
                        top: `${wallLine.start.y}%`,
                        width: `${width}%`,
                        height: `${Math.max(2, wallLine.thickness * 2)}px`,
                        transform: `rotate(${angle}deg)`
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectSemanticObject(object);
                      }}
                      title={`${semanticCategoryLabels[object.category]} · ${object.name}`}
                      type="button"
                    />
                  );
                }

                if (object.category === "Furniture") {
                  const details = object.details as { size?: { width?: number; depth?: number }; rotation?: number };
                  const width = Math.max(5, (details.size?.width ?? 120) / 26);
                  const height = Math.max(4, (details.size?.depth ?? 80) / 26);
                  return (
                    <button
                      key={object.id}
                      className={`absolute z-30 grid place-items-center rounded-md border text-[10px] font-bold transition hover:scale-105 ${
                        isSelected ? "border-blue-500 bg-blue-100/70 text-blue-950 ring-4 ring-blue-500/20" : "border-blue-500/60 bg-blue-100/55 text-blue-950"
                      }`}
                      style={{
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                        minWidth: "40px",
                        minHeight: "30px",
                        transform: `translate(-50%, -50%) rotate(${details.rotation ?? 0}deg)`
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (objectDragRef.current?.moved) return;
                        onSelectSemanticObject(object);
                      }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        objectDragRef.current = { pointerId: event.pointerId, objectId: object.id, moved: false };
                        event.currentTarget.setPointerCapture(event.pointerId);
                        onSelectSemanticObject(object);
                      }}
                      onPointerMove={(event) => {
                        const drag = objectDragRef.current;
                        if (!drag || drag.pointerId !== event.pointerId || drag.objectId !== object.id) return;
                        const nextPosition = getPercentPosition(event);
                        if (!nextPosition) return;
                        drag.moved = true;
                        onMoveSemanticObject(object.id, nextPosition);
                      }}
                      onPointerUp={(event) => {
                        if (objectDragRef.current?.pointerId === event.pointerId) {
                          window.setTimeout(() => {
                            objectDragRef.current = null;
                          }, 0);
                        }
                      }}
                      title={`${semanticCategoryLabels[object.category]} · ${object.name}`}
                      type="button"
                    >
                      {semanticIdPrefixes[object.category]}
                    </button>
                  );
                }

                return (
                  <button
                    key={object.id}
                    className={`absolute z-30 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-bold shadow-sm transition hover:scale-110 ${
                      isSelected ? "border-blue-500 bg-blue-600 text-white ring-4 ring-blue-500/20" : "border-white bg-slate-800/82 text-white"
                    }`}
                    style={{ left: `${position.x}%`, top: `${position.y}%` }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (objectDragRef.current?.moved) return;
                      onSelectSemanticObject(object);
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      if (!isDraggableFurniture) return;
                      objectDragRef.current = { pointerId: event.pointerId, objectId: object.id, moved: false };
                      event.currentTarget.setPointerCapture(event.pointerId);
                      onSelectSemanticObject(object);
                    }}
                    onPointerMove={(event) => {
                      const drag = objectDragRef.current;
                      if (!drag || drag.pointerId !== event.pointerId || drag.objectId !== object.id) return;
                      const nextPosition = getPercentPosition(event);
                      if (!nextPosition) return;
                      drag.moved = true;
                      onMoveSemanticObject(object.id, nextPosition);
                    }}
                    onPointerUp={(event) => {
                      if (objectDragRef.current?.pointerId === event.pointerId) {
                        window.setTimeout(() => {
                          objectDragRef.current = null;
                        }, 0);
                      }
                    }}
                    title={`${semanticCategoryLabels[object.category]} · ${object.name}`}
                    type="button"
                  >
                    <span>{semanticIdPrefixes[object.category]}</span>
                  </button>
                );
              })}
              </div>
            )}

            {renderStructureHtmlLabelLayer()}

            {isManualCleanupMode && (
              <div
                className="absolute inset-0 z-50 cursor-crosshair bg-blue-500/[0.03]"
                data-layer="ManualCleanupSelectionLayer"
                data-coordinate-system="percent-of-floor-plan"
                onPointerDown={handleCleanupPointerDown}
                onPointerMove={handleCleanupPointerMove}
                onPointerUp={handleCleanupPointerUp}
                onPointerCancel={handleCleanupPointerUp}
              >
                {cleanupSelection && (
                  <div
                    className="absolute border border-blue-600 bg-blue-300/20"
                    style={{
                      left: `${cleanupSelection.x}%`,
                      top: `${cleanupSelection.y}%`,
                      width: `${cleanupSelection.width}%`,
                      height: `${cleanupSelection.height}%`
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid h-full min-h-[560px] place-items-center rounded-[1.75rem] border border-white/70 bg-gradient-to-br from-stone-100 to-white p-6 shadow-inner">
          <label className="absolute right-5 top-16 z-20 hidden cursor-pointer items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-xs font-semibold text-stone-600 shadow-sm backdrop-blur hover:bg-white sm:flex">
            <input checked={showObjectIds} onChange={(event) => setShowObjectIds(event.target.checked)} type="checkbox" />
            显示对象 ID
          </label>
          <div className="relative h-[420px] w-full max-w-4xl rounded-[2rem] border border-stone-200 bg-white shadow-soft [perspective:1200px]">
            <div className="absolute left-1/2 top-1/2 h-64 w-[34rem] max-w-[80%] rounded-3xl border-4 border-stone-300 bg-stone-50 shadow-2xl"
              style={{ transform: "translate(-50%, -50%) rotateX(58deg) rotateZ(-18deg)" }}>
              <svg className="absolute inset-0" viewBox={`0 0 ${STRUCTURE_WIDTH_MM} ${STRUCTURE_HEIGHT_MM}`}>
                {houseStructure.rooms.map((room) => (
                  <polygon
                    key={room.id}
                    points={room.boundary.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill="rgba(255,255,255,0.72)"
                    stroke="rgba(148,163,184,0.75)"
                    strokeWidth={40}
                  />
                ))}
                {houseStructure.walls.map((wall) => {
                  if (wall.kind === "arc") {
                    return (
                      <path
                        key={wall.id}
                        d={getArcPath(wall)}
                        fill="none"
                        stroke={isObjectSelected(wall.id) ? "#2563eb" : "#9ca3af"}
                        strokeWidth={wall.thickness}
                        onClick={() => selectStructureObject(wall.id)}
                        onMouseEnter={() => hoverObject(wall.id)}
                        onMouseLeave={() => clearHoverObject(wall.id)}
                      />
                    );
                  }
                  return (
                    <line
                      key={wall.id}
                      x1={wall.start.x}
                      y1={wall.start.y}
                      x2={wall.end.x}
                      y2={wall.end.y}
                      stroke={isObjectSelected(wall.id) ? "#2563eb" : "#9ca3af"}
                      strokeWidth={wall.thickness}
                      strokeLinecap="square"
                      onClick={() => selectStructureObject(wall.id)}
                      onMouseEnter={() => hoverObject(wall.id)}
                      onMouseLeave={() => clearHoverObject(wall.id)}
                    />
                  );
                })}
                {renderStructureLabelLayer("3d")}
              </svg>
              {furniture.map((item) => {
                const isSelected = item.id === selectedFurnitureId;
                return (
                  <button
                    key={item.id}
                    className={`absolute rounded-lg border bg-white shadow-lg transition hover:-translate-y-1 ${isSelected ? "border-clay ring-4 ring-clay/20" : "border-stone-200"}`}
                    style={{
                      left: `${item.position.x}%`,
                      top: `${item.position.y}%`,
                      width: `${Math.max(28, item.dimensions.width / 5)}px`,
                      height: `${Math.max(22, item.dimensions.depth / 5)}px`,
                      transform: `translate(-50%, -50%) rotate(${item.position.rotation}deg)`,
                      backgroundColor: item.color
                    }}
                    onClick={() => {
                      selectObject(item.id);
                      onSelectFurniture(item);
                    }}
                    onMouseEnter={() => hoverObject(item.id)}
                    onMouseLeave={() => clearHoverObject(item.id)}
                    type="button"
                    title={item.name}
                  />
                );
              })}
              {furniture.map((item) => {
                const selected = selectedInteractionObjectId === item.id;
                const hovered = isObjectHovered(item.id);
                if (!selected && !hovered && !showObjectIds) return null;
                const mode = selected ? "selected" : hovered ? "hover" : "debug";
                return (
                  <div
                    key={`3d-furniture-label-${item.id}`}
                    className={`${mode === "selected" ? "block" : mode === "hover" ? "hidden [@media(hover:hover)]:block" : "hidden sm:block"} pointer-events-none absolute z-30 w-max max-w-56 -translate-x-1/2 -translate-y-full rounded-md border-2 px-3 py-2 text-center text-sm font-extrabold shadow-[0_8px_20px_rgba(15,23,42,0.34)] ${
                      mode === "selected" ? "border-blue-950 bg-blue-700 text-white ring-2 ring-white" : mode === "hover" ? "border-slate-950 bg-slate-950 text-white ring-2 ring-white" : "border-slate-700 bg-white/95 text-slate-950 ring-1 ring-white"
                    }`}
                    style={{ left: `${item.position.x}%`, top: `${item.position.y}%`, marginTop: "-8px" }}
                  >
                    <div>{item.id}</div>
                    {mode !== "debug" && <div className="mt-1 text-xs font-semibold opacity-95">{item.name}</div>}
                    {mode === "hover" && <div className="mt-1 text-[10px] uppercase opacity-70">Furniture</div>}
                  </div>
                );
              })}
            </div>
            <div className="absolute bottom-6 left-6 max-w-sm rounded-3xl border border-stone-200 bg-white/85 p-4 text-sm leading-6 text-stone-500 backdrop-blur">
              第一版 3D 用轻量白模表达楼层、房间和家具位置；后续可替换为 React Three Fiber 场景，并复用同一份 JSON 数据。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
