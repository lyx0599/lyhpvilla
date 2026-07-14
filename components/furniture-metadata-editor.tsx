"use client";

import {
  anchorFurnitureToWall,
  getRecommendedClearance,
  getRelatedDrawingItemSyncState,
  resolveFurnitureSpaceAssignment,
  syncRelatedDrawingItemsToFurniture
} from "@/lib/furniture-placement";
import { FurnitureTopView } from "@/components/furniture-top-view";
import {
  cycleFurnitureVariant,
  furnitureFamilyLabels,
  furnitureVariantCatalog,
  getFurnitureFamily,
  restoreModernNaturalRecommendation,
  stableFurnitureSeed
} from "@/lib/furniture-variants";
import { drawingItemCategoryLabels } from "@/lib/drawing-items";
import type { ConstructionMeta, DrawingItem, Furniture, FurnitureClearanceMeta, HouseStructure, MepMeta, Render3DAssetType, Render3DMeta } from "@/types/space";

type Props = {
  furniture: Furniture;
  structure?: HouseStructure;
  drawingItems?: DrawingItem[];
  disabled?: boolean;
  onChange: (furniture: Furniture) => void;
  onDrawingItemsChange?: (items: DrawingItem[]) => void;
  onLocateDrawingItem?: (item: DrawingItem) => void;
};

const fieldClass = "mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100 disabled:text-stone-400";
const checkboxClass = "size-4 rounded border-stone-300 text-blue-600";

function ToggleField({ checked, disabled, label, onChange }: { checked: boolean; disabled: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-xs font-semibold text-stone-600">
      <input className={checkboxClass} checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

function MetadataSection({ children, summary }: { children: React.ReactNode; summary: string }) {
  return (
    <details className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white/80">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <span className="text-stone-400">展开</span>
      </summary>
      <div className="border-t border-stone-100 bg-stone-50/70 p-3">{children}</div>
    </details>
  );
}

export function FurnitureMetadataEditor({ furniture, structure, drawingItems = [], disabled = false, onChange, onDrawingItemsChange, onLocateDrawingItem }: Props) {
  const render3d = furniture.render3d ?? { assetType: furniture.moduleType ?? furniture.type };
  const mep = furniture.mepMeta ?? {};
  const construction = furniture.constructionMeta ?? {};
  const assignment = structure ? resolveFurnitureSpaceAssignment(furniture, structure) : null;
  const relatedItems = drawingItems.filter((item) => item.relatedFurnitureId === furniture.id);
  const furnitureFamily = getFurnitureFamily(furniture, render3d.assetType);
  const familyVariants = furnitureVariantCatalog[furnitureFamily];
  const syncStates = structure ? relatedItems.map((item) => ({ item, state: getRelatedDrawingItemSyncState(item, furniture, structure) })) : [];
  const unsyncedItems = syncStates.filter(({ state }) => state.needsSync);
  const movableUnsyncedItems = unsyncedItems.filter(({ state }) => state.canMoveWithFurniture);

  function updateRender3D(patch: Partial<Render3DMeta>, markStyleManual = false) {
    onChange({ ...furniture, render3d: { ...render3d, ...patch, ...(markStyleManual ? { styleSource: "manual" as const } : {}) } });
  }

  function restoreProceduralDefault() {
    const {
      variantId: _variantId,
      variationSeed: _variationSeed,
      stylePreset: _stylePreset,
      styleSource: _styleSource,
      primaryMaterial: _primaryMaterial,
      secondaryMaterial: _secondaryMaterial,
      accentMaterial: _accentMaterial,
      detailLevel: _detailLevel,
      ...rest
    } = render3d;
    onChange({ ...furniture, render3d: { ...rest, assetType: rest.assetType || furniture.moduleType || furniture.type } });
  }

  function updateMep(patch: Partial<MepMeta>) {
    onChange({ ...furniture, mepMeta: { ...mep, ...patch } });
  }

  function updateConstruction(patch: Partial<ConstructionMeta>) {
    onChange({ ...furniture, constructionMeta: { ...construction, ...patch } });
  }

  function updateClearance(patch: Partial<FurnitureClearanceMeta>) {
    onChange({ ...furniture, clearanceMeta: { ...(furniture.clearanceMeta ?? {}), ...patch } });
  }

  return (
    <div>
      {structure && (
        <MetadataSection summary="定位与宿主">
          <label className="block text-xs text-stone-500">
            所属房间 / 庭院
            <select
              className={fieldClass}
              disabled={disabled}
              value={furniture.roomId}
              onChange={(event) => {
                const spaceId = event.target.value;
                const outdoor = structure.outdoors.some((item) => item.id === spaceId);
                onChange({ ...furniture, roomId: spaceId, outdoorId: outdoor ? spaceId : undefined });
              }}
            >
              {structure.rooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.id}</option>)}
              {structure.outdoors.map((outdoor) => <option key={outdoor.id} value={outdoor.id}>{outdoor.name} · {outdoor.id}</option>)}
            </select>
          </label>
          <ToggleField checked={Boolean(furniture.roomAssignmentLocked)} disabled={disabled} label="锁定人工房间归属" onChange={(checked) => onChange({ ...furniture, roomAssignmentLocked: checked })} />
          {assignment?.spanning && <p className="mt-2 rounded-lg bg-amber-50 px-2 py-2 text-[11px] font-semibold leading-4 text-amber-800">家具跨越多个空间：{assignment.candidateSpaceIds.join("、")}。当前按中心点/主要占地归入 {assignment.primarySpaceId ?? "未识别"}。</p>}
          {assignment?.primarySpaceId && assignment.primarySpaceId !== furniture.roomId && <p className="mt-2 rounded-lg bg-red-50 px-2 py-2 text-[11px] font-semibold leading-4 text-red-700">当前位置属于 {assignment.primarySpaceId}，与当前 roomId 不一致。</p>}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:bg-stone-300" disabled={disabled || structure.walls.length === 0} onClick={() => onChange(anchorFurnitureToWall(furniture, structure))} type="button">吸附最近墙体</button>
            <button className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 disabled:text-stone-300" disabled={disabled || !furniture.hostWallId} onClick={() => onChange({ ...furniture, hostWallId: undefined, wallAnchor: undefined })} type="button">解除墙体关联</button>
          </div>
          <label className="mt-2 block text-xs text-stone-500">
            关联墙体
            <select className={fieldClass} disabled={disabled} value={furniture.hostWallId ?? ""} onChange={(event) => onChange(event.target.value ? anchorFurnitureToWall(furniture, structure, event.target.value) : { ...furniture, hostWallId: undefined, wallAnchor: undefined })}>
              <option value="">未绑定</option>
              {structure.walls.map((wall) => <option key={wall.id} value={wall.id}>{wall.name} · {wall.id}</option>)}
            </select>
          </label>
          {furniture.wallAnchor && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-xs text-stone-500">离墙距离 mm<input className={fieldClass} disabled={disabled} min="0" type="number" value={furniture.wallAnchor.offsetMm} onChange={(event) => onChange(anchorFurnitureToWall(furniture, structure, furniture.hostWallId, { offsetMm: Math.max(0, Number(event.target.value) || 0) }))} /></label>
              <label className="text-xs text-stone-500">墙体侧<select className={fieldClass} disabled={disabled} value={furniture.wallAnchor.side} onChange={(event) => onChange(anchorFurnitureToWall(furniture, structure, furniture.hostWallId, { side: event.target.value as NonNullable<Furniture["wallAnchor"]>["side"] }))}><option value="left">左侧</option><option value="right">右侧</option><option value="center">中心线</option></select></label>
              <ToggleField checked={furniture.wallAnchor.followWall} disabled={disabled} label="跟随墙体变化" onChange={(checked) => onChange({ ...furniture, wallAnchor: { ...furniture.wallAnchor!, followWall: checked } })} />
              {furniture.wallAnchor.needsRebind && <button className="rounded-lg bg-red-100 px-2 py-2 text-xs font-semibold text-red-700" disabled={disabled || !furniture.wallAnchor.suggestedWallId} onClick={() => onChange(anchorFurnitureToWall(furniture, structure, furniture.wallAnchor?.suggestedWallId))} type="button">采用建议墙体</button>}
            </div>
          )}
        </MetadataSection>
      )}

      <MetadataSection summary="操作与检修空间">
        <div className="grid grid-cols-2 gap-2">
          {([[
            "frontMm", "前方"
          ], ["rearMm", "后方"], ["leftMm", "左侧"], ["rightMm", "右侧"], ["serviceMm", "检修"], ["doorSwingMm", "开门"]] as Array<[keyof FurnitureClearanceMeta, string]>).map(([field, label]) => (
            <label key={field} className="text-xs text-stone-500">{label} mm<input className={fieldClass} disabled={disabled} min="0" type="number" value={typeof furniture.clearanceMeta?.[field] === "number" ? furniture.clearanceMeta[field] as number : ""} onChange={(event) => updateClearance({ [field]: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value) || 0) })} /></label>
          ))}
        </div>
        <button className="mt-2 w-full rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 disabled:text-stone-300" disabled={disabled} onClick={() => onChange({ ...furniture, clearanceMeta: { ...getRecommendedClearance(furniture), notes: furniture.clearanceMeta?.notes } })} type="button">采用建议预留范围</button>
        <label className="mt-2 block text-xs text-stone-500">预留说明<textarea className={`${fieldClass} min-h-16`} disabled={disabled} value={furniture.clearanceMeta?.notes ?? ""} onChange={(event) => updateClearance({ notes: event.target.value || undefined })} /></label>
      </MetadataSection>

      {structure && relatedItems.length > 0 && (
        <MetadataSection summary={`关联机电点位 · ${relatedItems.length}`}>
          {unsyncedItems.length > 0 && <p className="rounded-lg bg-amber-50 px-2 py-2 text-[11px] font-semibold leading-4 text-amber-800">家具已移动，{unsyncedItems.length} 个关联点位可能需要同步；人工调整过的点位不会被自动覆盖。</p>}
          <div className="mt-2 grid gap-1">
            {syncStates.map(({ item, state }) => (
              <div key={item.id} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-[11px] ${state.needsSync ? "bg-amber-50" : "bg-white"}`}>
                <button className="min-w-0 flex-1 truncate text-left font-semibold text-stone-700" onClick={() => onLocateDrawingItem?.(item)} type="button">{drawingItemCategoryLabels[item.category]} · {item.label}</button>
                <span className={state.needsSync ? "text-amber-700" : "text-emerald-700"}>{state.needsSync ? `${Math.round(state.distanceMm)}mm` : "已同步"}</span>
                <button className="shrink-0 text-red-600" disabled={disabled} onClick={() => onDrawingItemsChange?.(drawingItems.map((candidate) => candidate.id === item.id ? { ...candidate, relatedFurnitureId: null, relatedFurniturePositionMm: undefined } : candidate))} type="button">解除</button>
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button className="rounded-lg bg-blue-700 px-2 py-2 text-xs font-semibold text-white disabled:bg-stone-300" disabled={disabled || movableUnsyncedItems.length === 0} onClick={() => onDrawingItemsChange?.(syncRelatedDrawingItemsToFurniture(drawingItems, furniture, structure, { moveUntouchedGenerated: true }))} type="button">一并移动自动点位</button>
            <button className="rounded-lg bg-stone-100 px-2 py-2 text-xs font-semibold text-stone-700 disabled:text-stone-300" disabled={disabled || unsyncedItems.length === 0} onClick={() => onDrawingItemsChange?.(syncRelatedDrawingItemsToFurniture(drawingItems, furniture, structure, { markReviewed: true }))} type="button">保留位置并确认</button>
          </div>
        </MetadataSection>
      )}

      <MetadataSection summary="3D 表现">
        <div className="grid grid-cols-[88px_1fr] gap-3 rounded-lg bg-stone-50 p-2">
          <FurnitureTopView
            assetType={render3d.assetType as Render3DAssetType}
            variantId={render3d.variantId}
            className="h-20 w-[88px] border border-white shadow-sm"
            color={furniture.color}
            footprint={furniture.dimensions}
            showLabel={false}
            stretchToFill
            type={furniture.type}
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-800">{furnitureFamilyLabels[furnitureFamily]}</p>
            <p className="mt-1 text-[11px] leading-4 text-stone-500">{familyVariants.find((variant) => variant.id === render3d.variantId)?.description ?? "使用当前程序化默认结构"}</p>
            <p className="mt-2 text-[10px] font-semibold text-emerald-700">{render3d.styleSource === "manual" ? "人工选择，自动方案将保留" : "程序推荐，可继续调整"}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-stone-500">
            家具家族
            <select className={fieldClass} disabled={disabled} value={furnitureFamily} onChange={(event) => {
              const nextFamily = event.target.value as keyof typeof furnitureVariantCatalog;
              const assetTypeByFamily: Record<keyof typeof furnitureVariantCatalog, string> = {
                bed: "bed",
                sofa: "sofa",
                diningTable: "diningTable",
                coffeeTable: "coffeeTable",
                chair: "diningChair",
                cabinet: "cabinet",
                softDecor: "generic",
                mediaWall: "fireplace",
                other: render3d.assetType
              };
              updateRender3D({ assetType: assetTypeByFamily[nextFamily], variantId: furnitureVariantCatalog[nextFamily][0].id }, true);
            }}>
              {Object.entries(furnitureFamilyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs text-stone-500">
            细节等级
            <select className={fieldClass} disabled={disabled} value={render3d.detailLevel ?? "standard"} onChange={(event) => updateRender3D({ detailLevel: event.target.value as NonNullable<Render3DMeta["detailLevel"]> }, true)}>
              <option value="draft">草图</option><option value="standard">标准</option><option value="presentation">展示</option>
            </select>
          </label>
        </div>
        <label className="mt-3 block text-xs text-stone-500">
          外形变体
          <select className={fieldClass} disabled={disabled} value={render3d.variantId ?? ""} onChange={(event) => updateRender3D({ variantId: event.target.value }, true)}>
            {familyVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
          </select>
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {familyVariants.map((variant) => (
            <button key={variant.id} className={`grid grid-cols-[44px_1fr] items-center gap-2 rounded-lg border p-1.5 text-left ${render3d.variantId === variant.id ? "border-emerald-500 bg-emerald-50" : "border-stone-200 bg-white"}`} disabled={disabled} onClick={() => updateRender3D({ variantId: variant.id }, true)} type="button">
              <FurnitureTopView assetType={render3d.assetType as Render3DAssetType} variantId={variant.id} className="size-11" color={furniture.color} footprint={furniture.dimensions} showLabel={false} stretchToFill type={furniture.type} />
              <span className="text-[11px] font-semibold leading-4 text-stone-700">{variant.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-stone-500">稳定差异种子<input className={fieldClass} disabled={disabled} min="0" step="1" type="number" value={render3d.variationSeed ?? stableFurnitureSeed(furniture.id)} onChange={(event) => updateRender3D({ variationSeed: Math.max(0, Math.round(Number(event.target.value) || 0)) }, true)} /></label>
          <ToggleField checked={Boolean(render3d.styleLocked)} disabled={disabled} label="锁定外形与风格" onChange={(checked) => updateRender3D({ styleLocked: checked }, true)} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button className="rounded-lg bg-stone-100 px-2 py-2 text-[11px] font-semibold text-stone-700 disabled:text-stone-300" disabled={disabled || familyVariants.length < 2} onClick={() => onChange(cycleFurnitureVariant(furniture))} type="button">换一个相似变体</button>
          <button className="rounded-lg bg-emerald-700 px-2 py-2 text-[11px] font-semibold text-white disabled:bg-stone-300" disabled={disabled} onClick={() => onChange(restoreModernNaturalRecommendation(furniture))} type="button">恢复现代自然推荐</button>
          <button className="rounded-lg bg-stone-100 px-2 py-2 text-[11px] font-semibold text-stone-700 disabled:text-stone-300" disabled={disabled} onClick={restoreProceduralDefault} type="button">恢复程序化默认</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-stone-500">
            资产类型
            <input className={fieldClass} disabled={disabled} value={render3d.assetType ?? ""} onChange={(event) => updateRender3D({ assetType: event.target.value }, true)} />
          </label>
          <label className="text-xs text-stone-500">
            风格预设
            <select className={fieldClass} disabled={disabled} value={render3d.stylePreset ?? "modernNatural"} onChange={(event) => updateRender3D({ stylePreset: event.target.value }, true)}>
              <option value="modernNatural">现代自然</option>
              <option value="tuscan-sunlight">托斯卡纳阳光</option>
              <option value="elevatedTuscanSun">高级托斯卡纳</option>
              <option value="warmJapandi">暖白浅木</option>
              <option value="naturalWood">浅木自然</option>
              <option value="softCream">奶油白</option>
              <option value="modernStone">现代灰</option>
            </select>
          </label>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <label className="text-xs text-stone-500">主材质<input className={fieldClass} disabled={disabled} value={render3d.primaryMaterial ?? ""} onChange={(event) => updateRender3D({ primaryMaterial: event.target.value }, true)} /></label>
          <label className="text-xs text-stone-500">辅材质<input className={fieldClass} disabled={disabled} value={render3d.secondaryMaterial ?? ""} onChange={(event) => updateRender3D({ secondaryMaterial: event.target.value }, true)} /></label>
          <label className="text-xs text-stone-500">点缀材质<input className={fieldClass} disabled={disabled} value={render3d.accentMaterial ?? ""} onChange={(event) => updateRender3D({ accentMaterial: event.target.value }, true)} /></label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ToggleField checked={render3d.visibleIn3d ?? true} disabled={disabled} label="3D 可见" onChange={(checked) => updateRender3D({ visibleIn3d: checked })} />
          <ToggleField checked={render3d.selectableIn3d ?? true} disabled={disabled} label="3D 可选" onChange={(checked) => updateRender3D({ selectableIn3d: checked })} />
        </div>
        <label className="mt-3 block text-xs text-stone-500">
          子部件组织
          <select className={fieldClass} disabled={disabled} value={render3d.childrenMode ?? "merged"} onChange={(event) => updateRender3D({ childrenMode: event.target.value as NonNullable<Render3DMeta["childrenMode"]> })}>
            <option value="merged">跟随主对象</option>
            <option value="grouped">分组预留</option>
          </select>
        </label>
      </MetadataSection>

      <MetadataSection summary="水电需求">
        <div className="grid grid-cols-2 gap-2">
          <ToggleField checked={Boolean(mep.needsSocket)} disabled={disabled} label="需要插座" onChange={(checked) => updateMep({ needsSocket: checked })} />
          <ToggleField checked={Boolean(mep.needsSwitch)} disabled={disabled} label="需要开关" onChange={(checked) => updateMep({ needsSwitch: checked })} />
          <ToggleField checked={Boolean(mep.needsWaterSupply)} disabled={disabled} label="需要给水" onChange={(checked) => updateMep({ needsWaterSupply: checked })} />
          <ToggleField checked={Boolean(mep.needsDrainage)} disabled={disabled} label="需要排水" onChange={(checked) => updateMep({ needsDrainage: checked })} />
          <ToggleField checked={Boolean(mep.needsNetwork)} disabled={disabled} label="预留网络" onChange={(checked) => updateMep({ needsNetwork: checked })} />
          <ToggleField checked={Boolean(mep.needsVentilation)} disabled={disabled} label="需要通风" onChange={(checked) => updateMep({ needsVentilation: checked })} />
          <ToggleField checked={Boolean(mep.needsSmartControl)} disabled={disabled} label="智能控制" onChange={(checked) => updateMep({ needsSmartControl: checked })} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-stone-500">
            插座数量
            <input className={fieldClass} disabled={disabled} min="0" type="number" value={mep.socketCount ?? 0} onChange={(event) => updateMep({ socketCount: Math.max(0, Number(event.target.value) || 0) })} />
          </label>
          <label className="text-xs text-stone-500">
            插座高度 mm
            <input className={fieldClass} disabled={disabled} min="0" type="number" value={mep.socketHeight ?? 0} onChange={(event) => updateMep({ socketHeight: Math.max(0, Number(event.target.value) || 0) })} />
          </label>
          <label className="text-xs text-stone-500">
            给水类型
            <select className={fieldClass} disabled={disabled} value={mep.waterSupplyType ?? "none"} onChange={(event) => updateMep({ waterSupplyType: event.target.value as NonNullable<MepMeta["waterSupplyType"]> })}>
              <option value="none">无</option><option value="cold">冷水</option><option value="hotCold">冷热水</option><option value="filtered">净水</option>
            </select>
          </label>
          <label className="text-xs text-stone-500">
            排水类型
            <select className={fieldClass} disabled={disabled} value={mep.drainageType ?? "none"} onChange={(event) => updateMep({ drainageType: event.target.value as NonNullable<MepMeta["drainageType"]> })}>
              <option value="none">无</option><option value="floorDrain">地漏</option><option value="wallDrain">墙排</option><option value="cabinetDrain">柜内排水</option>
            </select>
          </label>
        </div>
        <label className="mt-3 block text-xs text-stone-500">
          关联回路
          <input className={fieldClass} disabled={disabled} value={mep.relatedCircuit ?? ""} onChange={(event) => updateMep({ relatedCircuit: event.target.value })} />
        </label>
        <label className="mt-3 block text-xs text-stone-500">
          开关控制
          <input className={fieldClass} disabled={disabled} placeholder="多个控制项用逗号分隔" value={(mep.switchControl ?? []).join("，")} onChange={(event) => updateMep({ switchControl: event.target.value.split(/[，,]/).map((item) => item.trim()).filter(Boolean) })} />
        </label>
        <label className="mt-3 block text-xs text-stone-500">
          水电说明
          <textarea className={`${fieldClass} min-h-20`} disabled={disabled} value={mep.notes ?? ""} onChange={(event) => updateMep({ notes: event.target.value })} />
        </label>
      </MetadataSection>

      <MetadataSection summary="灯光需求">
        <div className="grid grid-cols-2 gap-2">
          <ToggleField checked={Boolean(mep.needsLighting)} disabled={disabled} label="需要照明" onChange={(checked) => updateMep({ needsLighting: checked })} />
          <ToggleField checked={Boolean(mep.needsSmartControl)} disabled={disabled} label="智能/感应控制" onChange={(checked) => updateMep({ needsSmartControl: checked })} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-stone-500">
            灯光类型
            <select className={fieldClass} disabled={disabled} value={mep.lightingType ?? "none"} onChange={(event) => updateMep({ lightingType: event.target.value as NonNullable<MepMeta["lightingType"]> })}>
              <option value="none">无</option><option value="ambient">环境光</option><option value="task">任务灯</option><option value="cabinetStrip">柜内灯带</option><option value="mirrorLight">镜前灯</option><option value="decorative">装饰灯</option>
            </select>
          </label>
          <label className="text-xs text-stone-500">
            色温
            <select className={fieldClass} disabled={disabled} value={mep.lightColorTemperature ?? "3000K"} onChange={(event) => updateMep({ lightColorTemperature: event.target.value as NonNullable<MepMeta["lightColorTemperature"]> })}>
              <option value="2700K">2700K</option><option value="3000K">3000K</option><option value="3500K">3500K</option><option value="4000K">4000K</option>
            </select>
          </label>
        </div>
      </MetadataSection>

      <MetadataSection summary="施工备注">
        <div className="grid grid-cols-2 gap-2">
          <ToggleField checked={Boolean(construction.customMade)} disabled={disabled} label="定制制作" onChange={(checked) => updateConstruction({ customMade: checked })} />
          <ToggleField checked={Boolean(construction.waterproofRequired)} disabled={disabled} label="需要防水" onChange={(checked) => updateConstruction({ waterproofRequired: checked })} />
          <ToggleField checked={Boolean(construction.inspectionAccessRequired)} disabled={disabled} label="预留检修" onChange={(checked) => updateConstruction({ inspectionAccessRequired: checked })} />
        </div>
        <label className="mt-3 block text-xs text-stone-500">
          安装方式
          <select className={fieldClass} disabled={disabled} value={construction.installType ?? "other"} onChange={(event) => updateConstruction({ installType: event.target.value as NonNullable<ConstructionMeta["installType"]> })}>
            <option value="finishedFurniture">成品家具</option><option value="customCabinet">定制柜体</option><option value="builtIn">内嵌建造</option><option value="wallMounted">壁挂安装</option><option value="floorStanding">落地安装</option><option value="embedded">设备嵌入</option><option value="other">其他</option>
          </select>
        </label>
        <label className="mt-3 block text-xs text-stone-500">预留尺寸<input className={fieldClass} disabled={disabled} value={construction.reserveSize ?? ""} onChange={(event) => updateConstruction({ reserveSize: event.target.value })} /></label>
        <label className="mt-3 block text-xs text-stone-500">墙面依赖<input className={fieldClass} disabled={disabled} value={construction.wallDependency ?? ""} onChange={(event) => updateConstruction({ wallDependency: event.target.value })} /></label>
        <label className="mt-3 block text-xs text-stone-500">地面依赖<input className={fieldClass} disabled={disabled} value={construction.floorDependency ?? ""} onChange={(event) => updateConstruction({ floorDependency: event.target.value })} /></label>
        <label className="mt-3 block text-xs text-stone-500">吊顶依赖<input className={fieldClass} disabled={disabled} value={construction.ceilingDependency ?? ""} onChange={(event) => updateConstruction({ ceilingDependency: event.target.value })} /></label>
        <label className="mt-3 block text-xs text-stone-500">
          施工说明
          <textarea className={`${fieldClass} min-h-24`} disabled={disabled} value={construction.notes ?? ""} onChange={(event) => updateConstruction({ notes: event.target.value })} />
        </label>
      </MetadataSection>

      <MetadataSection summary="采购备注">
        <label className="block text-xs text-stone-500">采购分类<input className={fieldClass} disabled={disabled} value={construction.purchaseCategory ?? ""} onChange={(event) => updateConstruction({ purchaseCategory: event.target.value })} /></label>
        <label className="mt-3 block text-xs text-stone-500">供应商类型<input className={fieldClass} disabled={disabled} value={construction.supplierType ?? ""} onChange={(event) => updateConstruction({ supplierType: event.target.value })} /></label>
        <label className="mt-3 block text-xs text-stone-500">
          采购说明
          <textarea className={`${fieldClass} min-h-24`} disabled={disabled} value={furniture.note} onChange={(event) => onChange({ ...furniture, note: event.target.value })} />
        </label>
      </MetadataSection>
    </div>
  );
}
