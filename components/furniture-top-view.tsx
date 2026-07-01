import type { ReactNode } from "react";
import type { FurnitureType } from "@/types/space";

type Props = {
  type: FurnitureType;
  color: string;
  label?: string;
  className?: string;
  showLabel?: boolean;
  frameless?: boolean;
};

function SymbolShell({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 100 100">
      {children}
    </svg>
  );
}

function renderSymbol(type: FurnitureType, color: string) {
  const stroke = "#334155";
  const light = "#f8fafc";
  const glass = "#dbeafe";
  const metal = "#94a3b8";
  const dark = "#111827";

  switch (type) {
    case "sofa":
      return (
        <SymbolShell>
          <rect x="14" y="26" width="72" height="48" rx="14" fill={color} stroke={stroke} strokeWidth="5" />
          <rect x="20" y="16" width="60" height="20" rx="10" fill={color} stroke={stroke} strokeWidth="4" />
          <line x1="50" y1="24" x2="50" y2="72" stroke={stroke} strokeWidth="3" opacity="0.35" />
          <rect x="8" y="36" width="12" height="30" rx="6" fill={color} stroke={stroke} strokeWidth="4" />
          <rect x="80" y="36" width="12" height="30" rx="6" fill={color} stroke={stroke} strokeWidth="4" />
        </SymbolShell>
      );
    case "table":
      return (
        <SymbolShell>
          <ellipse cx="50" cy="50" rx="34" ry="27" fill={color} stroke={stroke} strokeWidth="5" />
          <circle cx="33" cy="34" r="4" fill={stroke} />
          <circle cx="67" cy="34" r="4" fill={stroke} />
          <circle cx="33" cy="66" r="4" fill={stroke} />
          <circle cx="67" cy="66" r="4" fill={stroke} />
        </SymbolShell>
      );
    case "bed":
      return (
        <SymbolShell>
          <rect x="18" y="12" width="64" height="78" rx="8" fill={color} stroke={stroke} strokeWidth="5" />
          <rect x="26" y="20" width="48" height="18" rx="5" fill={light} stroke={stroke} strokeWidth="3" />
          <line x1="18" y1="44" x2="82" y2="44" stroke={stroke} strokeWidth="3" opacity="0.45" />
        </SymbolShell>
      );
    case "island":
      return (
        <SymbolShell>
          <rect x="12" y="22" width="76" height="56" rx="10" fill={color} stroke={stroke} strokeWidth="5" />
          <rect x="24" y="32" width="24" height="20" rx="6" fill={glass} stroke={stroke} strokeWidth="3" />
          <circle cx="36" cy="42" r="3" fill={stroke} opacity="0.55" />
          <line x1="58" y1="30" x2="58" y2="70" stroke={stroke} strokeWidth="3" opacity="0.35" />
          <line x1="70" y1="30" x2="70" y2="70" stroke={stroke} strokeWidth="3" opacity="0.35" />
        </SymbolShell>
      );
    case "cooktop":
      return (
        <SymbolShell>
          <rect x="18" y="20" width="64" height="60" rx="8" fill={dark} stroke={stroke} strokeWidth="5" />
          {[34, 66].map((x) => [38, 62].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="10" fill="none" stroke={light} strokeWidth="4" />
          )))}
        </SymbolShell>
      );
    case "sink":
      return (
        <SymbolShell>
          <rect x="18" y="24" width="64" height="52" rx="8" fill={color} stroke={stroke} strokeWidth="5" />
          <rect x="28" y="34" width="44" height="32" rx="9" fill={glass} stroke={stroke} strokeWidth="4" />
          <circle cx="50" cy="50" r="4" fill={stroke} opacity="0.65" />
        </SymbolShell>
      );
    case "fridge":
      return (
        <SymbolShell>
          <rect x="25" y="10" width="50" height="80" rx="6" fill={color} stroke={stroke} strokeWidth="5" />
          <line x1="25" y1="42" x2="75" y2="42" stroke={stroke} strokeWidth="4" />
          <line x1="63" y1="20" x2="63" y2="34" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <line x1="63" y1="52" x2="63" y2="78" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
        </SymbolShell>
      );
    case "tallCabinet":
    case "wardrobe":
    case "entryCabinet":
    case "sideboard":
    case "cabinet":
      return (
        <SymbolShell>
          <rect x="14" y="16" width="72" height="68" rx="7" fill={color} stroke={stroke} strokeWidth="5" />
          <line x1="50" y1="18" x2="50" y2="82" stroke={stroke} strokeWidth="3" opacity="0.45" />
          <line x1="22" y1="40" x2="78" y2="40" stroke={stroke} strokeWidth="3" opacity="0.28" />
          <line x1="22" y1="62" x2="78" y2="62" stroke={stroke} strokeWidth="3" opacity="0.28" />
          <circle cx="44" cy="50" r="3" fill={stroke} opacity="0.55" />
          <circle cx="56" cy="50" r="3" fill={stroke} opacity="0.55" />
        </SymbolShell>
      );
    case "toilet":
      return (
        <SymbolShell>
          <rect x="30" y="12" width="40" height="22" rx="6" fill={light} stroke={stroke} strokeWidth="5" />
          <ellipse cx="50" cy="58" rx="25" ry="31" fill={color} stroke={stroke} strokeWidth="5" />
          <ellipse cx="50" cy="60" rx="12" ry="17" fill={light} stroke={stroke} strokeWidth="3" />
        </SymbolShell>
      );
    case "bathtub":
      return (
        <SymbolShell>
          <rect x="12" y="24" width="76" height="52" rx="24" fill={color} stroke={stroke} strokeWidth="5" />
          <rect x="24" y="34" width="52" height="32" rx="16" fill={light} stroke={stroke} strokeWidth="3" opacity="0.88" />
          <circle cx="29" cy="49" r="4" fill={metal} />
        </SymbolShell>
      );
    case "shower":
      return (
        <SymbolShell>
          <rect x="18" y="18" width="64" height="64" rx="8" fill={glass} stroke={stroke} strokeWidth="5" />
          <path d="M28 72 L72 28" stroke={stroke} strokeWidth="4" opacity="0.5" />
          <circle cx="64" cy="64" r="5" fill={stroke} opacity="0.55" />
          <path d="M30 34 C40 24 54 24 64 34" fill="none" stroke={stroke} strokeWidth="4" />
        </SymbolShell>
      );
    case "vanity":
      return (
        <SymbolShell>
          <rect x="16" y="34" width="68" height="46" rx="7" fill={color} stroke={stroke} strokeWidth="5" />
          <ellipse cx="50" cy="48" rx="20" ry="10" fill={light} stroke={stroke} strokeWidth="3" />
          <circle cx="50" cy="48" r="3" fill={stroke} opacity="0.5" />
          <rect x="28" y="14" width="44" height="16" rx="8" fill={glass} stroke={stroke} strokeWidth="3" />
        </SymbolShell>
      );
    case "plant":
      return (
        <SymbolShell>
          <circle cx="50" cy="50" r="18" fill="#8b6f47" stroke={stroke} strokeWidth="4" />
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <ellipse
              key={angle}
              cx="50"
              cy="29"
              rx="11"
              ry="20"
              fill={color}
              stroke={stroke}
              strokeWidth="3"
              transform={`rotate(${angle} 50 50)`}
            />
          ))}
        </SymbolShell>
      );
    default:
      return (
        <SymbolShell>
          <rect x="16" y="20" width="68" height="60" rx="10" fill={color} stroke={stroke} strokeWidth="5" />
          <path d="M28 38 H72 M28 52 H72 M28 66 H56" stroke={stroke} strokeWidth="4" strokeLinecap="round" opacity="0.45" />
        </SymbolShell>
      );
  }
}

export function FurnitureTopView({ type, color, label, className = "", showLabel = true, frameless = false }: Props) {
  return (
    <div className={`relative grid place-items-center overflow-hidden rounded-lg ${frameless ? "bg-transparent" : "bg-white"} ${className}`}>
      <div className={frameless ? "absolute inset-0" : "absolute inset-1"}>
        {renderSymbol(type, color)}
      </div>
      {showLabel && label && (
        <span className="absolute bottom-1 left-1/2 max-w-[88%] -translate-x-1/2 rounded bg-white/88 px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-slate-800 shadow-sm">
          {label}
        </span>
      )}
    </div>
  );
}
