"use client";

import {
  getVerificationDisplayState,
  verificationDisplayStateLabels,
  verificationSourceLabels,
  verificationSources,
  verificationStatusLabels,
  verificationStatuses
} from "@/lib/dimension-verification";
import type { VerificationMeta, VerificationSource, VerificationStatus } from "@/types/space";

type Props = {
  value: VerificationMeta;
  hasConflict?: boolean;
  disabled?: boolean;
  onChange: (value: VerificationMeta) => void;
};

function toLocalDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function DimensionVerificationEditor({ value, hasConflict = false, disabled = false, onChange }: Props) {
  const displayState = getVerificationDisplayState(value, hasConflict);
  const update = (patch: Partial<VerificationMeta>) => onChange({ ...value, ...patch });

  return (
    <section className="rounded-lg border border-stone-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-ink">尺寸复核</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          displayState === "confirmed" ? "bg-green-100 text-green-800" :
          displayState === "conflict" ? "bg-red-100 text-red-800" :
          displayState === "drawing-estimated" ? "bg-amber-100 text-amber-800" :
          "bg-stone-200 text-stone-700"
        }`}>{verificationDisplayStateLabels[displayState]}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block text-xs text-stone-500">
          尺寸状态
          <select
            className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100"
            disabled={disabled}
            value={value.status}
            onChange={(event) => {
              const status = event.target.value as VerificationStatus;
              update({
                status,
                verifiedAt: (status === "site-measured" || status === "confirmed") && !value.verifiedAt
                  ? new Date().toISOString()
                  : value.verifiedAt
              });
            }}
          >
            {verificationStatuses.map((status) => <option key={status} value={status}>{verificationStatusLabels[status]}</option>)}
          </select>
        </label>
        <label className="block text-xs text-stone-500">
          数据来源
          <select
            className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100"
            disabled={disabled}
            value={value.source}
            onChange={(event) => update({ source: event.target.value as VerificationSource })}
          >
            {verificationSources.map((source) => <option key={source} value={source}>{verificationSourceLabels[source]}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block text-xs text-stone-500">
          允许误差 mm
          <input
            className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100"
            disabled={disabled}
            min="0"
            type="number"
            value={value.toleranceMm ?? ""}
            onChange={(event) => update({ toleranceMm: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value) || 0) })}
          />
        </label>
        <label className="block text-xs text-stone-500">
          复核人
          <input
            className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100"
            disabled={disabled}
            value={value.verifiedBy ?? ""}
            onChange={(event) => update({ verifiedBy: event.target.value || undefined })}
          />
        </label>
      </div>

      <label className="mt-2 block text-xs text-stone-500">
        复核时间
        <input
          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100"
          disabled={disabled}
          type="datetime-local"
          value={toLocalDateTime(value.verifiedAt)}
          onChange={(event) => update({ verifiedAt: event.target.value ? new Date(event.target.value).toISOString() : undefined })}
        />
      </label>

      <label className="mt-2 block text-xs text-stone-500">
        来源说明
        <input
          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100"
          disabled={disabled}
          value={value.sourceNote ?? ""}
          onChange={(event) => update({ sourceNote: event.target.value || undefined })}
        />
      </label>

      <label className="mt-2 block text-xs text-stone-500">
        复核备注
        <textarea
          className="mt-1 min-h-16 w-full resize-y rounded-lg border border-stone-200 bg-white px-2 py-2 font-semibold text-ink outline-none focus:border-blue-400 disabled:bg-stone-100"
          disabled={disabled}
          value={value.notes ?? ""}
          onChange={(event) => update({ notes: event.target.value || undefined })}
        />
      </label>
    </section>
  );
}
