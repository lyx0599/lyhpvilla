import type { ReactNode } from "react";
import type { FurnitureType } from "@/types/space";

type Props = {
  type: FurnitureType;
  color: string;
  label?: string;
  className?: string;
  showLabel?: boolean;
  frameless?: boolean;
  imageSrc?: string;
  stretchToFill?: boolean;
  footprint?: {
    width?: number;
    depth?: number;
  };
};

function SymbolShell({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className="h-full w-full" preserveAspectRatio="xMidYMid meet" viewBox="0 0 100 100">
      {children}
    </svg>
  );
}

function FootprintSymbolShell({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      {children}
    </svg>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getFurnitureAspectRatio(footprint?: Props["footprint"]) {
  const width = Math.max(1, footprint?.width ?? 1);
  const depth = Math.max(1, footprint?.depth ?? 1);
  return clamp(width / depth, 0.35, 6);
}

function renderFootprintSymbol(type: FurnitureType, color: string, footprint?: Props["footprint"]) {
  const stroke = "#334155";
  const light = "#f8fafc";
  const aspectRatio = getFurnitureAspectRatio(footprint);
  const edgeX = clamp(3, 10 / aspectRatio, 8);
  const sofaArmWidth = clamp(4, 14 / aspectRatio, 9);
  const sofaSeatCount = Math.min(4, Math.max(2, Math.round(aspectRatio * 1.15)));
  const cabinetDoorCount = Math.min(7, Math.max(2, Math.round(aspectRatio * 1.25)));
  const strokeProps = { vectorEffect: "non-scaling-stroke" as const };

  switch (type) {
    case "sofa":
      return (
        <FootprintSymbolShell>
          <rect x="1.5" y="18" width="97" height="64" rx="8" fill={`${color}1f`} stroke={stroke} strokeDasharray="4 4" strokeWidth="1.8" {...strokeProps} />
          <rect x={sofaArmWidth + 1} y="26" width={98 - sofaArmWidth * 2 - 2} height="48" rx="7" fill={color} stroke={stroke} strokeWidth="2.4" {...strokeProps} />
          <rect x={sofaArmWidth + 4} y="16" width={92 - sofaArmWidth * 2} height="18" rx="7" fill={color} stroke={stroke} strokeWidth="2" {...strokeProps} />
          <rect x="3" y="34" width={sofaArmWidth} height="31" rx="5" fill={color} stroke={stroke} strokeWidth="2" {...strokeProps} />
          <rect x={97 - sofaArmWidth} y="34" width={sofaArmWidth} height="31" rx="5" fill={color} stroke={stroke} strokeWidth="2" {...strokeProps} />
          {Array.from({ length: sofaSeatCount - 1 }).map((_, index) => {
            const x = sofaArmWidth + 1 + ((98 - sofaArmWidth * 2 - 2) * (index + 1)) / sofaSeatCount;
            return <line key={`sofa-seat-${index}`} x1={x} y1="30" x2={x} y2="72" stroke={stroke} strokeWidth="1.6" opacity="0.35" {...strokeProps} />;
          })}
          <line x1={sofaArmWidth + 5} y1="43" x2={95 - sofaArmWidth} y2="43" stroke={light} strokeWidth="1.4" opacity="0.55" {...strokeProps} />
        </FootprintSymbolShell>
      );
    case "wardrobe":
    case "entryCabinet":
    case "sideboard":
    case "cabinet":
    case "tallCabinet":
    case "snackCabinet":
    case "kitchenCabinet":
      return (
        <FootprintSymbolShell>
          <rect x="1.5" y="15" width="97" height="70" rx="5" fill={`${color}20`} stroke={stroke} strokeDasharray="4 4" strokeWidth="1.8" {...strokeProps} />
          <rect x={edgeX} y="19" width={100 - edgeX * 2} height="62" rx="4" fill={color} stroke={stroke} strokeWidth="2.2" {...strokeProps} />
          {Array.from({ length: cabinetDoorCount - 1 }).map((_, index) => {
            const x = edgeX + ((100 - edgeX * 2) * (index + 1)) / cabinetDoorCount;
            return <line key={`cabinet-door-${index}`} x1={x} y1="21" x2={x} y2="79" stroke={stroke} strokeWidth="1.4" opacity="0.42" {...strokeProps} />;
          })}
          <line x1={edgeX + 3} y1="40" x2={97 - edgeX} y2="40" stroke={stroke} strokeWidth="1.3" opacity="0.24" {...strokeProps} />
          <line x1={edgeX + 3} y1="62" x2={97 - edgeX} y2="62" stroke={stroke} strokeWidth="1.3" opacity="0.24" {...strokeProps} />
          {Array.from({ length: cabinetDoorCount }).map((_, index) => {
            const x = edgeX + ((100 - edgeX * 2) * (index + 0.5)) / cabinetDoorCount;
            return <circle key={`cabinet-handle-${index}`} cx={x} cy="51" r="1.6" fill={stroke} opacity="0.48" />;
          })}
        </FootprintSymbolShell>
      );
    default:
      return renderSymbol(type, color);
  }
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
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 50 50)`}>
              <rect x="41" y="5" width="18" height="22" rx="8" fill="#d9c4a7" />
              <rect x="43" y="10" width="14" height="14" rx="5" fill="#f6efe6" opacity="0.82" />
            </g>
          ))}
          <circle cx="50" cy="50" r="27" fill={color} />
          <circle cx="50" cy="50" r="18" fill="#f8fafc" opacity="0.48" />
          <circle cx="50" cy="50" r="3" fill="#9ca3af" opacity="0.8" />
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <line key={`leg-${angle}`} x1="50" y1="50" x2="50" y2="35" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" transform={`rotate(${angle} 50 50)`} opacity="0.42" />
          ))}
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
    case "nightstand":
      return (
        <SymbolShell>
          <rect x="22" y="20" width="56" height="60" rx="8" fill={color} stroke={stroke} strokeWidth="5" />
          <line x1="28" y1="42" x2="72" y2="42" stroke={stroke} strokeWidth="3" opacity="0.35" />
          <line x1="28" y1="62" x2="72" y2="62" stroke={stroke} strokeWidth="3" opacity="0.35" />
          <circle cx="50" cy="52" r="3" fill={stroke} opacity="0.55" />
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
    case "fireplace":
      return (
        <SymbolShell>
          <rect x="12" y="20" width="76" height="60" rx="8" fill={color} stroke={stroke} strokeWidth="5" />
          <rect x="25" y="31" width="50" height="38" rx="6" fill="#111827" stroke={stroke} strokeWidth="3" />
          <path d="M50 64 C36 55 43 43 48 36 C50 44 60 47 58 57 C57 62 54 64 50 64Z" fill="#f97316" />
          <path d="M50 63 C44 58 47 51 51 47 C52 52 57 55 54 61 C53 62 52 63 50 63Z" fill="#fde68a" />
          <line x1="20" y1="80" x2="80" y2="80" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
        </SymbolShell>
      );
    case "tallCabinet":
    case "wardrobe":
    case "entryCabinet":
    case "sideboard":
    case "cabinet":
    case "snackCabinet":
    case "kitchenCabinet":
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
    case "pegboard":
      return (
        <SymbolShell>
          <rect x="14" y="12" width="72" height="76" rx="7" fill={color} stroke={stroke} strokeWidth="5" />
          {Array.from({ length: 5 }).map((_, row) => Array.from({ length: 5 }).map((__, column) => (
            <circle key={`${row}-${column}`} cx={26 + column * 12} cy={24 + row * 12} r="2.2" fill={stroke} opacity="0.55" />
          )))}
          <path d="M28 72 H48 M58 62 H74" stroke={stroke} strokeWidth="4" strokeLinecap="round" opacity="0.55" />
        </SymbolShell>
      );
    case "bookshelf":
      return (
        <SymbolShell>
          <rect x="14" y="12" width="72" height="76" rx="7" fill={color} stroke={stroke} strokeWidth="5" />
          {[32, 52, 72].map((y) => (
            <line key={y} x1="18" y1={y} x2="82" y2={y} stroke={stroke} strokeWidth="3" opacity="0.42" />
          ))}
          {[32, 50, 68].map((x) => (
            <line key={x} x1={x} y1="16" x2={x} y2="84" stroke={stroke} strokeWidth="3" opacity="0.28" />
          ))}
          <rect x="22" y="19" width="6" height="12" rx="1.5" fill="#f8fafc" opacity="0.8" />
          <rect x="31" y="19" width="8" height="12" rx="1.5" fill="#94a3b8" opacity="0.8" />
          <rect x="56" y="55" width="18" height="13" rx="3" fill="#f8fafc" opacity="0.65" />
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

export function FurnitureTopView({ type, color, label, className = "", showLabel = true, frameless = false, imageSrc, stretchToFill = false, footprint }: Props) {
  return (
    <div className={`relative grid place-items-center overflow-hidden rounded-lg ${frameless ? "bg-transparent" : "bg-white"} ${className}`}>
      {imageSrc ? (
        <img
          alt={label ?? "家具图片"}
          className={`${frameless ? "absolute inset-0" : "absolute inset-1"} h-auto max-h-full w-auto max-w-full object-contain`}
          src={imageSrc}
        />
      ) : (
        <div className={frameless ? "absolute inset-0" : "absolute inset-1"}>
          {stretchToFill ? renderFootprintSymbol(type, color, footprint) : renderSymbol(type, color)}
        </div>
      )}
      {showLabel && label && (
        <span className="absolute bottom-1 left-1/2 max-w-[88%] -translate-x-1/2 rounded bg-white/88 px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-slate-800 shadow-sm">
          {label}
        </span>
      )}
    </div>
  );
}
