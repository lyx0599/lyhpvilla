"use client";

import { useEffect, useMemo, useState } from "react";
import {
  generateSemanticId,
  getDefaultDetails,
  getDefaultPosition,
  semanticCategories,
  semanticCategoryLabels,
  validateSemanticObject
} from "@/lib/semantic-map";
import type { FloorId } from "@/types/space";
import type { Floor } from "@/types/space";
import type { Point, RoomDetails, SemanticCategory, SemanticObject } from "@/types/semantic-map";

type Props = {
  floorId: FloorId;
  objects: SemanticObject[];
  allObjects: SemanticObject[];
  floors: Floor[];
  selectedObjectId: string;
  editable?: boolean;
  onSelectObject: (objectId: string) => void;
  onCreateObject: (object: SemanticObject) => void;
  onUpdateObject: (object: SemanticObject) => void;
  onDeleteObject: (objectId: string) => void;
};

type Draft = {
  id: string;
  name: string;
  category: SemanticCategory;
  type: string;
  notes: string;
  positionX: string;
  positionY: string;
  detailsText: string;
};

type FurnitureDraft = {
  referenceImage: string;
  name: string;
  type: string;
  width: string;
  depth: string;
  height: string;
  material: string;
  floorId: FloorId;
  roomId: string;
  brand: string;
  purchaseLink: string;
  naturalText: string;
};

function createDraft(floorId: FloorId, category: SemanticCategory, allObjects: SemanticObject[]): Draft {
  const position = getDefaultPosition(category);
  return {
    id: generateSemanticId(category, floorId, allObjects),
    name: "",
    category,
    type: "",
    notes: "",
    positionX: position ? String(position.x) : "",
    positionY: position ? String(position.y) : "",
    detailsText: JSON.stringify(getDefaultDetails(category), null, 2)
  };
}

function draftFromObject(object: SemanticObject): Draft {
  return {
    id: object.id,
    name: object.name,
    category: object.category,
    type: object.type,
    notes: object.notes,
    positionX: object.position ? String(object.position.x) : "",
    positionY: object.position ? String(object.position.y) : "",
    detailsText: JSON.stringify(object.details, null, 2)
  };
}

export function SemanticMapPanel({
  floorId,
  objects,
  allObjects,
  floors,
  selectedObjectId,
  editable = true,
  onSelectObject,
  onCreateObject,
  onUpdateObject,
  onDeleteObject
}: Props) {
  const [draft, setDraft] = useState<Draft>(() => createDraft(floorId, "Room", allObjects));
  const [furnitureDraft, setFurnitureDraft] = useState<FurnitureDraft>({
    referenceImage: "",
    name: "",
    type: "sofa",
    width: "100",
    depth: "60",
    height: "80",
    material: "",
    floorId,
    roomId: "",
    brand: "",
    purchaseLink: "",
    naturalText: ""
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [furnitureError, setFurnitureError] = useState("");

  const groupedObjects = useMemo(
    () => semanticCategories.map((category) => ({ category, items: objects.filter((object) => object.category === category) })),
    [objects]
  );
  const roomObjects = allObjects.filter((object) => object.floorId === furnitureDraft.floorId && object.category === "Room");

  useEffect(() => {
    setFurnitureDraft((currentDraft) => ({ ...currentDraft, floorId, roomId: "" }));
  }, [floorId]);

  function getRoomCenter(room: SemanticObject): Point {
    const details = room.details as RoomDetails;
    if (details.boundary?.length) {
      const total = details.boundary.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
      return { x: total.x / details.boundary.length, y: total.y / details.boundary.length };
    }
    return room.position ?? { x: 50, y: 50 };
  }

  function parseNaturalText() {
    const text = furnitureDraft.naturalText.trim();
    if (!text) return;
    const matchedFloor = floors.find((floor) => text.toLowerCase().includes(floor.id.toLowerCase()) || text.toLowerCase().includes(floor.label.toLowerCase()));
    const nextFloorId = matchedFloor?.id ?? furnitureDraft.floorId;
    const matchedRoom = allObjects.find((object) => {
      if (object.floorId !== nextFloorId || object.category !== "Room") return false;
      const shortName = object.name.replace(`${object.floorId} `, "");
      return text.includes(object.name) || text.includes(shortName) || shortName.includes(text.replace(/^.*放到\s*/, "").replace(nextFloorId, "").trim());
    });
    setFurnitureDraft((currentDraft) => ({ ...currentDraft, floorId: nextFloorId, roomId: matchedRoom?.id ?? currentDraft.roomId }));
    if (!matchedRoom) {
      setFurnitureError("没有找到对应房间，请先在语义地图中标注该房间。");
    } else {
      setFurnitureError("");
    }
  }

  function handleReferenceImageChange(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFurnitureDraft((currentDraft) => ({ ...currentDraft, referenceImage: String(reader.result ?? "") }));
    };
    reader.readAsDataURL(file);
  }

  function createFurnitureFromImage() {
    const room = allObjects.find((object) => object.id === furnitureDraft.roomId && object.category === "Room");
    if (!room) {
      setFurnitureError("找不到房间，请先在语义地图中标注该房间。");
      return;
    }
    const position = getRoomCenter(room);
    const nextObject: SemanticObject = {
      id: generateSemanticId("Furniture", furnitureDraft.floorId, allObjects),
      name: furnitureDraft.name.trim(),
      floorId: furnitureDraft.floorId,
      category: "Furniture",
      type: furnitureDraft.type.trim() || "furniture",
      notes: "从家具参考图创建，可在 2D 底图上拖动调整位置。",
      position,
      details: {
        roomId: furnitureDraft.roomId,
        zoneId: "",
        size: {
          width: Number(furnitureDraft.width) || 100,
          depth: Number(furnitureDraft.depth) || 60,
          height: Number(furnitureDraft.height) || 80,
          unit: "cm"
        },
        position,
        rotation: 0,
        materialId: furnitureDraft.material,
        relatedWallIds: [],
        referenceImage: furnitureDraft.referenceImage,
        source: "image-reference",
        brand: furnitureDraft.brand,
        purchaseLink: furnitureDraft.purchaseLink
      }
    };
    const errors = validateSemanticObject(nextObject, allObjects);
    if (errors.length) {
      setFurnitureError(errors.join("；"));
      return;
    }
    onCreateObject(nextObject);
    setFurnitureDraft({
      referenceImage: "",
      name: "",
      type: "sofa",
      width: "100",
      depth: "60",
      height: "80",
      material: "",
      floorId: furnitureDraft.floorId,
      roomId: furnitureDraft.roomId,
      brand: "",
      purchaseLink: "",
      naturalText: ""
    });
    setFurnitureError("");
  }

  function resetDraft(category: SemanticCategory = draft.category) {
    setDraft(createDraft(floorId, category, allObjects));
    setEditingId(null);
    setError("");
  }

  function startEdit(object: SemanticObject) {
    setDraft(draftFromObject(object));
    setEditingId(object.id);
    setError("");
    onSelectObject(object.id);
  }

  function handleCategoryChange(category: SemanticCategory) {
    if (editingId) {
      setDraft({ ...draft, category, detailsText: JSON.stringify(getDefaultDetails(category), null, 2) });
      return;
    }
    resetDraft(category);
  }

  function submitObject() {
    let details: Record<string, unknown>;
    try {
      details = JSON.parse(draft.detailsText || "{}");
    } catch {
      setError("扩展字段 JSON 格式不正确");
      return;
    }

    const positionX = Number(draft.positionX);
    const positionY = Number(draft.positionY);
    const hasPosition = draft.positionX.trim() !== "" && draft.positionY.trim() !== "" && Number.isFinite(positionX) && Number.isFinite(positionY);
    const nextObject: SemanticObject = {
      id: draft.id,
      name: draft.name.trim(),
      floorId,
      category: draft.category,
      type: draft.type.trim() || draft.category,
      notes: draft.notes.trim(),
      position: hasPosition ? { x: positionX, y: positionY } : undefined,
      details
    };

    const errors = validateSemanticObject(nextObject, allObjects);
    if (errors.length) {
      setError(errors.join("；"));
      return;
    }

    if (editingId) {
      onUpdateObject(nextObject);
      resetDraft(draft.category);
    } else {
      onCreateObject(nextObject);
      setDraft(createDraft(floorId, draft.category, [...allObjects, nextObject]));
      setEditingId(null);
      setError("");
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">House Semantic Map</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">语义地图</h2>
          <p className="mt-1 text-sm text-stone-500">当前楼层 {objects.length} 个对象</p>
        </div>
        {editable && (
          <button className="rounded-2xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200" onClick={() => resetDraft()} type="button">
            新增
          </button>
        )}
      </div>

      <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-1">
        {groupedObjects.map(({ category, items }) => (
          <div key={category} className="rounded-2xl bg-stone-50 p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-ink">{semanticCategoryLabels[category]}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-stone-500">{items.length}</span>
            </div>
            {items.length ? (
              <div className="space-y-1">
                {items.map((object) => (
                  <div key={object.id} className={`rounded-xl border px-3 py-2 text-sm ${object.id === selectedObjectId ? "border-clay bg-clay/10" : "border-transparent bg-white"}`}>
                    <button className="block w-full text-left" onClick={() => onSelectObject(object.id)} type="button">
                      <span className="block font-semibold text-ink">{object.name}</span>
                      <span className="mt-0.5 block text-xs text-stone-500">{object.id} · {object.type}</span>
                    </button>
                    {editable && (
                      <div className="mt-2 flex gap-2 text-xs">
                        <button className="text-clay hover:underline" onClick={() => startEdit(object)} type="button">编辑</button>
                        <button className="text-stone-400 hover:text-red-500" onClick={() => onDeleteObject(object.id)} type="button">删除</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400">暂无对象</p>
            )}
          </div>
        ))}
      </div>

      {editable && (
        <div className="mt-4 rounded-2xl border border-clay/30 bg-clay/5 p-3">
          <h3 className="text-sm font-semibold text-ink">从图片创建家具</h3>
          <p className="mt-1 text-xs leading-5 text-stone-500">家具图片只保存为 referenceImage，真正的家具会创建为独立 Overlay Object。</p>
          <div className="mt-3 space-y-3">
            <label className="block text-xs text-stone-500">
              家具参考图
              <input accept="image/*" className="mt-1 w-full text-xs" onChange={(event) => handleReferenceImageChange(event.target.files?.[0])} type="file" />
            </label>
            {furnitureDraft.referenceImage && <img alt="家具参考图预览" className="h-24 w-full rounded-xl object-contain bg-white" src={furnitureDraft.referenceImage} />}
            <label className="block text-xs text-stone-500">
              自然语言占位输入
              <div className="mt-1 flex gap-2">
                <input className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm text-ink" placeholder="把这个沙发放到 1F 客厅" value={furnitureDraft.naturalText} onChange={(event) => setFurnitureDraft({ ...furnitureDraft, naturalText: event.target.value })} />
                <button className="rounded-xl bg-stone-100 px-3 text-xs font-semibold text-stone-600" onClick={parseNaturalText} type="button">解析</button>
              </div>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-stone-500">
                名称
                <input className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-ink" value={furnitureDraft.name} onChange={(event) => setFurnitureDraft({ ...furnitureDraft, name: event.target.value })} />
              </label>
              <label className="block text-xs text-stone-500">
                类型
                <input className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-ink" value={furnitureDraft.type} onChange={(event) => setFurnitureDraft({ ...furnitureDraft, type: event.target.value })} />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["width", "depth", "height"] as const).map((field) => (
                <label key={field} className="block text-xs text-stone-500">
                  {field === "width" ? "宽 cm" : field === "depth" ? "深 cm" : "高 cm"}
                  <input className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-ink" value={furnitureDraft[field]} onChange={(event) => setFurnitureDraft({ ...furnitureDraft, [field]: event.target.value })} />
                </label>
              ))}
            </div>
            <label className="block text-xs text-stone-500">
              所属楼层
              <select className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-ink" value={furnitureDraft.floorId} onChange={(event) => setFurnitureDraft({ ...furnitureDraft, floorId: event.target.value as FloorId, roomId: "" })}>
                {floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.label} · {floor.subtitle}</option>)}
              </select>
            </label>
            <label className="block text-xs text-stone-500">
              所属房间
              <select className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-ink" value={furnitureDraft.roomId} onChange={(event) => setFurnitureDraft({ ...furnitureDraft, roomId: event.target.value })}>
                <option value="">请选择房间</option>
                {roomObjects.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-stone-500">
                材质
                <input className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-ink" value={furnitureDraft.material} onChange={(event) => setFurnitureDraft({ ...furnitureDraft, material: event.target.value })} />
              </label>
              <label className="block text-xs text-stone-500">
                品牌
                <input className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-ink" value={furnitureDraft.brand} onChange={(event) => setFurnitureDraft({ ...furnitureDraft, brand: event.target.value })} />
              </label>
            </div>
            <label className="block text-xs text-stone-500">
              购买链接
              <input className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-ink" value={furnitureDraft.purchaseLink} onChange={(event) => setFurnitureDraft({ ...furnitureDraft, purchaseLink: event.target.value })} />
            </label>
            {furnitureError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{furnitureError}</p>}
            <button className="w-full rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-ink/90" onClick={createFurnitureFromImage} type="button">创建 Furniture HouseObject</button>
          </div>
        </div>
      )}

      {editable && (
        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">{editingId ? "编辑语义对象" : "新增语义对象"}</h3>
            <span className="text-xs text-stone-400">{draft.id}</span>
          </div>
          <div className="space-y-3">
            <label className="block text-xs text-stone-500">
              大类
              <select
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-ink disabled:bg-stone-100 disabled:text-stone-400"
                value={draft.category}
                disabled={Boolean(editingId)}
                onChange={(event) => handleCategoryChange(event.target.value as SemanticCategory)}
              >
                {semanticCategories.map((category) => <option key={category} value={category}>{semanticCategoryLabels[category]}</option>)}
              </select>
            </label>
            <label className="block text-xs text-stone-500">
              名称（全项目唯一）
              <input className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-ink" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如：1F 客厅" />
            </label>
            <label className="block text-xs text-stone-500">
              类型
              <input className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-ink" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} placeholder="例如：living_room / sofa" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-stone-500">
                标记 X%
                <input className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-ink" value={draft.positionX} onChange={(event) => setDraft({ ...draft, positionX: event.target.value })} />
              </label>
              <label className="block text-xs text-stone-500">
                标记 Y%
                <input className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-ink" value={draft.positionY} onChange={(event) => setDraft({ ...draft, positionY: event.target.value })} />
              </label>
            </div>
            <label className="block text-xs text-stone-500">
              备注
              <textarea className="mt-1 min-h-16 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-ink" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
            </label>
            <label className="block text-xs text-stone-500">
              扩展字段 JSON
              <textarea className="mt-1 min-h-40 w-full rounded-xl border border-stone-200 px-3 py-2 font-mono text-xs text-ink" value={draft.detailsText} onChange={(event) => setDraft({ ...draft, detailsText: event.target.value })} />
            </label>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button className="flex-1 rounded-xl bg-clay px-3 py-2 text-sm font-semibold text-white hover:bg-clay/90" onClick={submitObject} type="button">保存</button>
              {editingId && <button className="rounded-xl bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-600" onClick={() => resetDraft(draft.category)} type="button">取消</button>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
