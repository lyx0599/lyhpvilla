"use client";

import type { ConstructionMeta, Furniture, MepMeta } from "@/types/space";

type Props = {
  furniture: Furniture;
  disabled?: boolean;
  onChange: (furniture: Furniture) => void;
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

export function FurnitureMetadataEditor({ furniture, disabled = false, onChange }: Props) {
  const mep = furniture.mepMeta ?? {};
  const construction = furniture.constructionMeta ?? {};

  function updateMep(patch: Partial<MepMeta>) {
    onChange({ ...furniture, mepMeta: { ...mep, ...patch } });
  }

  function updateConstruction(patch: Partial<ConstructionMeta>) {
    onChange({ ...furniture, constructionMeta: { ...construction, ...patch } });
  }

  return (
    <div>
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
