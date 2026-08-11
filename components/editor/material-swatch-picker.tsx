"use client";

import { render3DMaterialTokenCatalog, type Render3DMaterialDefinition, type Render3DMaterialToken } from "@/lib/render3d-assets";
import { getPbrMaterialDefinition } from "@/lib/material-system";

const visibleTokens: Render3DMaterialToken[] = [
  "warmWhiteMineral", "microCement", "warmOak", "showroomWarmOak", "oakFloor", "travertine",
  "warmGreyStone", "beigeFabric", "blackTitanium", "clearGlass", "smokedGlass",
  "warmWhiteCeramic", "oatTaupeLacquer", "showroomOatTaupe", "wetAreaTile", "courtyardStone"
];

type Props = {
  value?: string;
  disabled?: boolean;
  tokens?: Render3DMaterialToken[];
  label?: string;
  description?: string;
  onChange: (token: Render3DMaterialToken) => void;
};

export function MaterialSwatchPicker({ value, disabled, tokens = visibleTokens, label = "3D 主材预览", description = "预览同时驱动 2D 材质身份与 3D PBR 主材；纹理缺失时使用内置程序化回退。", onChange }: Props) {
  return (
    <div className="mt-3">
      <p className="text-xs text-stone-500">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {tokens.map((token) => {
          const material: Render3DMaterialDefinition = render3DMaterialTokenCatalog[token];
          const materialToken = material.pbrToken ?? token;
          const unified = getPbrMaterialDefinition(materialToken).definition;
          const selected = value === token;
          const glass = material.role === "glass";
          return (
            <button
              key={token}
              aria-pressed={selected}
              className={`flex min-w-0 items-center gap-2 rounded-lg border px-2 py-2 text-left transition ${selected ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200" : "border-stone-200 bg-white hover:border-stone-300"}`}
              disabled={disabled}
              onClick={() => onChange(token)}
              title={`${material.label} · ${unified.roles.join(" / ")} · ${unified.physicalSizeMm[0]}×${unified.physicalSizeMm[1]}mm · ${unified.source.license}`}
              type="button"
            >
              <span
                aria-hidden="true"
                className={`size-7 shrink-0 rounded-md border border-black/10 shadow-inner ${glass ? "backdrop-blur-sm" : ""}`}
                style={{
                  backgroundColor: material.color,
                  backgroundImage: material.role === "wood"
                    ? "repeating-linear-gradient(12deg, transparent 0 4px, rgba(70,45,28,.16) 5px 6px)"
                    : material.role === "fabric"
                      ? "repeating-linear-gradient(90deg, transparent 0 3px, rgba(70,60,50,.1) 4px), repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,.18) 4px)"
                      : material.role === "stone"
                        ? "linear-gradient(135deg, transparent 38%, rgba(95,82,68,.16) 40%, transparent 43%)"
                        : undefined,
                  opacity: glass ? 0.72 : 1
                }}
              />
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-semibold text-stone-700">{material.label}</span>
                <span className="block truncate text-[9px] text-stone-400">{unified.physicalSizeMm[0]}×{unified.physicalSizeMm[1]}mm</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] leading-4 text-stone-400">{description}</p>
    </div>
  );
}
