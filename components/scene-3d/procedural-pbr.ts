"use client";

import { createContext, createElement, useContext, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import type { Render3DMaterialRole } from "@/lib/render3d-assets";
import { getShowroomMaterialResource } from "@/lib/showroom-material-resources";
import {
  getMaterialResolution,
  getPbrMaterialDefinition,
  resolvePbrMaterialToken,
  type MaterialDeviceClass,
  type MaterialQualityTier,
  type PbrMaterialToken
} from "@/lib/material-system";

export type ProceduralPbrKind = Exclude<Render3DMaterialRole, "light" | "plant" | "generic"> | "wall" | "microcement";

export type ProceduralPbrMaps = {
  map: THREE.CanvasTexture;
  normalMap?: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
  aoMap?: THREE.CanvasTexture;
  bumpMap?: THREE.CanvasTexture;
};

type Options = {
  kind: ProceduralPbrKind | null;
  baseColor: string;
  accentColor?: string;
  repeat?: [number, number];
  rotation?: number;
  quality?: "balanced" | "high" | MaterialQualityTier;
  device?: MaterialDeviceClass;
  token?: PbrMaterialToken;
  resourceId?: string;
  canonicalTransform?: boolean;
  neutralColor?: boolean;
};

type ProceduralPbrQualitySettings = { quality: MaterialQualityTier; device: MaterialDeviceClass };
const ProceduralPbrQualityContext = createContext<ProceduralPbrQualitySettings>({ quality: "standard", device: "desktop" });

export function ProceduralPbrQualityProvider({ quality, device, children }: ProceduralPbrQualitySettings & { children: ReactNode }) {
  const value = useMemo(() => ({ quality, device }), [device, quality]);
  return createElement(ProceduralPbrQualityContext.Provider, { value }, children);
}

export function useProceduralPbrQuality() {
  return useContext(ProceduralPbrQualityContext);
}

// Material parts repeat the same handful of finishes many times. Sharing the
// generated maps avoids allocating four GPU textures for every cushion, door
// panel or stair trim while keeping the fallback entirely local and offline.
type PbrMapCacheEntry = {
  maps: ProceduralPbrMaps;
  estimatedBytes: number;
  refs: number;
  lastUsed: number;
};

const MAX_PBR_MAP_CACHE_ENTRIES = 32;
const pbrMapCache = new Map<string, PbrMapCacheEntry>();
let pruneTimer: number | null = null;
let pbrMapGenerationCount = 0;
let pbrMapEvictionCount = 0;

function disposePbrMaps(maps: ProceduralPbrMaps) {
  [maps.map, maps.normalMap, maps.roughnessMap, maps.aoMap, maps.bumpMap].forEach((texture) => texture?.dispose());
}

function prunePbrMapCache() {
  pruneTimer = null;
  if (pbrMapCache.size <= MAX_PBR_MAP_CACHE_ENTRIES) return;
  const idleEntries = Array.from(pbrMapCache.entries())
    .filter(([, entry]) => entry.refs === 0)
    .sort(([, left], [, right]) => left.lastUsed - right.lastUsed);
  while (pbrMapCache.size > MAX_PBR_MAP_CACHE_ENTRIES && idleEntries.length) {
    const [key, entry] = idleEntries.shift()!;
    pbrMapCache.delete(key);
    disposePbrMaps(entry.maps);
    pbrMapEvictionCount += 1;
  }
}

function schedulePbrMapPrune() {
  if (typeof window === "undefined" || pruneTimer !== null) return;
  pruneTimer = window.setTimeout(prunePbrMapCache, 0);
}

function seededNoise(x: number, y: number, seed: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function makeCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function configure(texture: THREE.CanvasTexture, repeat: [number, number], rotation: number, color = false) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(Math.max(0.1, repeat[0]), Math.max(0.1, repeat[1]));
  texture.center.set(0.5, 0.5);
  texture.rotation = rotation;
  texture.anisotropy = 8;
  texture.channel = 0;
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function resolveQualityTier(quality: Options["quality"]): MaterialQualityTier {
  if (quality === "balanced") return "standard";
  if (quality === "high") return "presentation";
  return quality ?? "standard";
}

function buildPbrMaps(
  kind: ProceduralPbrKind,
  baseColor: string,
  accentColor: string,
  repeat: [number, number],
  rotation: number,
  quality: MaterialQualityTier,
  device: MaterialDeviceClass,
  token: PbrMaterialToken,
  resourceId?: string,
  neutralColor = false
) {
  if (typeof document === "undefined") return null;
  pbrMapGenerationCount += 1;
  const resource = getShowroomMaterialResource(resourceId);
  const unified = getPbrMaterialDefinition(token).definition;
  const resolvedBase = neutralColor ? "#ffffff" : resource?.baseColor ?? baseColor ?? unified.baseColor;
  const resolvedAccent = neutralColor ? "#d2d2d2" : resource?.accentColor ?? accentColor ?? unified.accentColor;
  const size = getMaterialResolution(token, quality, device);
  if (quality === "draft") {
    const canvas = makeCanvas(size);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = resolvedBase;
    context.fillRect(0, 0, size, size);
    const strokeCount = kind === "wood" ? 28 : kind === "fabric" || kind === "leather" ? 36 : 18;
    context.strokeStyle = resolvedAccent;
    context.globalAlpha = kind === "glass" ? 0.025 : 0.1;
    context.lineWidth = Math.max(1, size / 420);
    for (let index = 0; index < strokeCount; index += 1) {
      const t = index / Math.max(1, strokeCount - 1);
      context.beginPath();
      if (kind === "wood") {
        const x = t * size;
        context.moveTo(x, 0);
        context.bezierCurveTo(x + size * 0.018, size * 0.3, x - size * 0.014, size * 0.72, x, size);
      } else {
        const y = t * size;
        context.moveTo(0, y);
        context.bezierCurveTo(size * 0.3, y + size * 0.008, size * 0.72, y - size * 0.008, size, y);
      }
      context.stroke();
    }
    context.globalAlpha = 1;
    return { map: configure(new THREE.CanvasTexture(canvas), repeat, rotation, true) } satisfies ProceduralPbrMaps;
  }
  const colorCanvas = makeCanvas(size);
  const normalCanvas = makeCanvas(size);
  const roughnessCanvas = makeCanvas(size);
  const aoCanvas = makeCanvas(size);
  const heightCanvas = unified.channels.height ? makeCanvas(size) : null;
  const color = colorCanvas.getContext("2d");
  const normal = normalCanvas.getContext("2d");
  const roughness = roughnessCanvas.getContext("2d");
  const ao = aoCanvas.getContext("2d");
  const height = heightCanvas?.getContext("2d") ?? null;
  if (!color || !normal || !roughness || !ao) return null;

  color.fillStyle = resolvedBase;
  color.fillRect(0, 0, size, size);
  normal.fillStyle = "rgb(128,128,255)";
  normal.fillRect(0, 0, size, size);
  roughness.fillStyle = "rgb(190,190,190)";
  roughness.fillRect(0, 0, size, size);
  ao.fillStyle = "white";
  ao.fillRect(0, 0, size, size);
  if (height) {
    height.fillStyle = "rgb(128,128,128)";
    height.fillRect(0, 0, size, size);
  }

  const wood = kind === "wood";
  const fabric = kind === "fabric" || kind === "leather";
  const stone = kind === "stone" || kind === "ceramic";
  const wall = kind === "wall" || kind === "microcement";
  const metal = kind === "metal";
  const glass = kind === "glass";
  const materialFamily = unified.family;
  const oakFloor = token === "oakFloor";
  const travertine = token === "travertine";
  const tiled = token === "wetAreaTile" || token === "courtyardStone";
  const herringbone = resourceId === "showroomPaleHerringbone";
  const burl = resource?.family === "burlWood";
  const verticalOak = resourceId === "showroomWarmOakVertical";
  const woven = resourceId === "showroomWovenHeadboard";
  const botanicalWallcovering = resourceId === "showroomBotanicalTextile2F";
  const graphicWallcovering = resourceId === "showroomGraphicWallcovering2F";
  const rustStripe = resourceId === "showroomRustStripeUpholstery2F";
  const boucle = resourceId === "showroomBoucleCream2F";
  const lacquer = resource?.family === "lacquer";
  const veinedStone = resourceId === "showroomWarmVeinedStone";
  const lineStep = wood ? Math.max(7, size / 22) : fabric ? Math.max(4, size / 42) : Math.max(12, size / 14);

  roughness.fillStyle = `rgb(${Math.round((resource?.roughness ?? unified.roughness) * 255)},${Math.round((resource?.roughness ?? unified.roughness) * 255)},${Math.round((resource?.roughness ?? unified.roughness) * 255)})`;
  roughness.fillRect(0, 0, size, size);

  for (let index = 0; index < size * 2; index += 1) {
    const x = seededNoise(index, 2, kind.length) * size;
    const y = seededNoise(index, 7, kind.length) * size;
    const alpha = 0.025 + seededNoise(index, 11, 3) * (wall ? 0.045 : 0.085);
    color.fillStyle = index % 2 ? `rgba(255,255,255,${alpha})` : `rgba(45,35,26,${alpha})`;
    color.fillRect(x, y, wall ? 1.2 : 1.7, wall ? 1.2 : 1.7);
  }

  if (burl) {
    for (let ring = 0; ring < 34; ring += 1) {
      const cx = seededNoise(ring, 3, 19) * size;
      const cy = seededNoise(ring, 8, 29) * size;
      const radiusX = size * (0.035 + seededNoise(ring, 12, 31) * 0.16);
      const radiusY = radiusX * (0.45 + seededNoise(ring, 15, 13) * 0.8);
      color.strokeStyle = ring % 3 === 0 ? "rgba(74,35,17,.22)" : "rgba(255,220,172,.16)";
      normal.strokeStyle = ring % 2 ? "rgb(132,123,252)" : "rgb(124,134,254)";
      roughness.strokeStyle = ring % 3 === 0 ? "rgb(102,102,102)" : "rgb(132,132,132)";
      ao.strokeStyle = "rgba(55,42,31,.22)";
      [color, normal, roughness, ao].forEach((ctx) => {
        ctx.lineWidth = ring % 4 === 0 ? 3 : 1.2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, radiusX, radiusY, seededNoise(ring, 21, 41) * Math.PI, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  } else if (wood && (verticalOak || materialFamily === "wood")) {
    for (let x = 3; x < size; x += lineStep) {
      color.strokeStyle = x % (lineStep * 3) < 1 ? "rgba(70,43,25,.2)" : "rgba(255,245,226,.16)";
      normal.strokeStyle = x % (lineStep * 3) < 1 ? "rgb(116,128,252)" : "rgb(133,128,255)";
      roughness.strokeStyle = x % (lineStep * 3) < 1 ? "rgb(150,150,150)" : "rgb(178,178,178)";
      ao.strokeStyle = "rgba(70,70,70,.22)";
      [color, normal, roughness, ao].forEach((ctx) => { ctx.lineWidth = x % (lineStep * 3) < 1 ? 2 : 1; ctx.beginPath(); });
      for (let y = 0; y <= size; y += size / 18) {
        const waveX = x + Math.sin((y + x) * 0.06) * 2.2;
        [color, normal, roughness, ao].forEach((ctx) => y === 0 ? ctx.moveTo(waveX, y) : ctx.lineTo(waveX, y));
      }
      [color, normal, roughness, ao].forEach((ctx) => ctx.stroke());
    }
  } else if (wood && oakFloor) {
    const plank = unified.pattern;
    const columns = Math.max(2, Math.round(unified.physicalSizeMm[0] / Math.max(1, plank?.moduleWidthMm ?? 190)));
    const rows = Math.max(1, Math.round(unified.physicalSizeMm[1] / Math.max(1, plank?.moduleLengthMm ?? 1800)));
    color.strokeStyle = "rgba(65,43,27,.42)";
    normal.strokeStyle = "rgb(128,116,252)";
    roughness.strokeStyle = "rgb(178,178,178)";
    ao.strokeStyle = "rgba(35,28,22,.52)";
    [color, normal, roughness, ao].forEach((ctx) => { ctx.lineWidth = Math.max(1, size / 520); });
    for (let column = 0; column <= columns; column += 1) {
      const x = column * size / columns;
      [color, normal, roughness, ao].forEach((ctx) => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke(); });
    }
    for (let row = 0; row <= rows; row += 1) {
      const y = row * size / rows;
      const offset = row % 2 ? size / columns * (plank?.stagger ?? 0.34) : 0;
      for (let column = -1; column <= columns; column += 1) {
        const x = column * size / columns + offset;
        [color, normal, roughness, ao].forEach((ctx) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + size / columns, y); ctx.stroke(); });
      }
    }
  } else if (wood) {
    for (let y = 4; y < size; y += lineStep) {
      color.strokeStyle = y % (lineStep * 3) < 1 ? "rgba(70,43,25,.2)" : "rgba(255,245,226,.16)";
      normal.strokeStyle = y % (lineStep * 3) < 1 ? "rgb(128,116,252)" : "rgb(128,133,255)";
      roughness.strokeStyle = y % (lineStep * 3) < 1 ? "rgb(150,150,150)" : "rgb(178,178,178)";
      ao.strokeStyle = "rgba(70,70,70,.22)";
      [color, normal, roughness, ao].forEach((ctx) => { ctx.lineWidth = y % (lineStep * 3) < 1 ? 2 : 1; ctx.beginPath(); });
      for (let x = 0; x <= size; x += size / 16) {
        const waveY = y + Math.sin((x + y) * 0.07) * 2.6;
        [color, normal, roughness, ao].forEach((ctx) => x === 0 ? ctx.moveTo(x, waveY) : ctx.lineTo(x, waveY));
      }
      [color, normal, roughness, ao].forEach((ctx) => ctx.stroke());
    }
  } else if (botanicalWallcovering) {
    for (let motif = 0; motif < 9; motif += 1) {
      const cx = ((motif % 3) + 0.5) * size / 3 + (motif % 2 ? size * 0.08 : -size * 0.05);
      const cy = (Math.floor(motif / 3) + 0.5) * size / 3;
      const scale = size * (0.08 + (motif % 3) * 0.014);
      color.strokeStyle = motif % 2 ? "rgba(97,79,62,.22)" : "rgba(255,246,230,.18)";
      normal.strokeStyle = motif % 2 ? "rgb(124,132,253)" : "rgb(132,124,253)";
      ao.strokeStyle = "rgba(70,61,52,.12)";
      [color, normal, ao].forEach((ctx) => { ctx.lineWidth = Math.max(1.1, size / 260); ctx.beginPath(); ctx.moveTo(cx, cy + scale * 1.4); });
      for (let segment = 0; segment <= 10; segment += 1) {
        const t = segment / 10;
        const x = cx + Math.sin(t * Math.PI * 1.3 + motif) * scale * 0.25;
        const y = cy + scale * 1.4 - t * scale * 2.8;
        [color, normal, ao].forEach((ctx) => ctx.lineTo(x, y));
      }
      [color, normal, ao].forEach((ctx) => ctx.stroke());
      for (let leaf = 0; leaf < 5; leaf += 1) {
        const side = leaf % 2 ? -1 : 1;
        const y = cy + scale * 0.9 - leaf * scale * 0.48;
        [color, normal, ao].forEach((ctx) => {
          ctx.beginPath();
          ctx.ellipse(cx + side * scale * 0.34, y, scale * 0.34, scale * 0.13, side * -0.52, 0, Math.PI * 2);
          ctx.stroke();
        });
      }
    }
  } else if (graphicWallcovering) {
    const cell = size / 6;
    color.strokeStyle = "rgba(49,46,43,.72)";
    normal.strokeStyle = "rgb(119,132,252)";
    ao.strokeStyle = "rgba(50,47,43,.34)";
    [color, normal, ao].forEach((ctx) => { ctx.lineWidth = Math.max(2, size / 125); ctx.lineCap = "round"; ctx.lineJoin = "round"; });
    for (let row = 0; row < 6; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        const x = column * cell;
        const y = row * cell;
        [color, normal, ao].forEach((ctx) => {
          ctx.beginPath();
          if ((row + column) % 2) {
            ctx.moveTo(x + cell * 0.12, y + cell * 0.18);
            ctx.lineTo(x + cell * 0.82, y + cell * 0.18);
            ctx.quadraticCurveTo(x + cell * 0.9, y + cell * 0.18, x + cell * 0.9, y + cell * 0.31);
            ctx.lineTo(x + cell * 0.9, y + cell * 0.82);
            ctx.lineTo(x + cell * 0.28, y + cell * 0.82);
          } else {
            ctx.moveTo(x + cell * 0.18, y + cell * 0.9);
            ctx.lineTo(x + cell * 0.18, y + cell * 0.28);
            ctx.quadraticCurveTo(x + cell * 0.18, y + cell * 0.12, x + cell * 0.36, y + cell * 0.12);
            ctx.lineTo(x + cell * 0.86, y + cell * 0.12);
          }
          ctx.stroke();
        });
      }
    }
  } else if (rustStripe) {
    const stripeWidth = size / 12;
    for (let x = 0; x < size; x += stripeWidth) {
      const band = Math.round(x / stripeWidth) % 4;
      color.fillStyle = band === 0 ? "rgba(92,46,36,.38)" : band === 1 ? "rgba(225,177,135,.25)" : band === 2 ? "rgba(114,73,58,.2)" : "rgba(245,221,187,.16)";
      color.fillRect(x, 0, stripeWidth * 0.78, size);
      roughness.fillStyle = band % 2 ? "rgb(236,236,236)" : "rgb(224,224,224)";
      roughness.fillRect(x, 0, stripeWidth * 0.78, size);
    }
  } else if (boucle) {
    for (let loop = 0; loop < size * 1.35; loop += 1) {
      const x = seededNoise(loop, 17, 73) * size;
      const y = seededNoise(loop, 29, 37) * size;
      const radius = Math.max(1.2, size * (0.004 + seededNoise(loop, 33, 19) * 0.006));
      color.strokeStyle = loop % 3 ? "rgba(255,255,255,.2)" : "rgba(91,76,60,.12)";
      normal.strokeStyle = loop % 2 ? "rgb(124,133,252)" : "rgb(133,124,252)";
      [color, normal].forEach((ctx) => { ctx.lineWidth = Math.max(1, radius * 0.38); ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 1.75); ctx.stroke(); });
    }
  } else if (fabric) {
    const weaveStep = woven ? Math.max(3, size / 80) : lineStep;
    for (let offset = 0; offset < size; offset += weaveStep) {
      normal.strokeStyle = offset % (lineStep * 2) ? "rgb(126,130,255)" : "rgb(130,126,255)";
      normal.lineWidth = 1;
      normal.beginPath(); normal.moveTo(offset, 0); normal.lineTo(offset, size); normal.stroke();
      normal.beginPath(); normal.moveTo(0, offset); normal.lineTo(size, offset); normal.stroke();
      roughness.fillStyle = kind === "leather" ? "rgb(150,150,150)" : "rgb(232,232,232)";
      roughness.fillRect(offset, 0, woven ? 2 : 1, size); roughness.fillRect(0, offset, size, woven ? 2 : 1);
      color.strokeStyle = kind === "leather" ? "rgba(65,39,25,.09)" : "rgba(76,62,50,.11)";
      color.strokeRect(offset, 0, 1, size); color.strokeRect(0, offset, size, 1);
    }
  } else if (lacquer) {
    for (let y = 0; y < size; y += 8) {
      color.fillStyle = y % 24 ? "rgba(255,255,255,.018)" : "rgba(58,48,39,.018)";
      color.fillRect(0, y, size, 1);
    }
  } else if (stone || wall) {
    for (let index = 0; index < (wall ? 9 : 14); index += 1) {
      const y = (index + 0.5) * size / (wall ? 9 : 14);
      color.strokeStyle = index % 2 ? "rgba(255,255,255,.11)" : "rgba(74,66,57,.09)";
      normal.strokeStyle = index % 2 ? "rgb(128,132,255)" : "rgb(128,124,253)";
      roughness.strokeStyle = kind === "ceramic" ? "rgb(86,86,86)" : wall ? "rgb(220,220,220)" : "rgb(148,148,148)";
      [color, normal, roughness].forEach((ctx) => { ctx.lineWidth = wall ? 1 : 1.6; ctx.beginPath(); });
      for (let x = 0; x <= size; x += size / 14) {
        const waveY = y + Math.sin((x + index * 19) * (veinedStone ? 0.025 : 0.045)) * (wall ? 1.4 : veinedStone ? 10.5 : 5.5);
        [color, normal, roughness].forEach((ctx) => x === 0 ? ctx.moveTo(x, waveY) : ctx.lineTo(x, waveY));
      }
      [color, normal, roughness].forEach((ctx) => ctx.stroke());
    }
    if (travertine) {
      for (let pore = 0; pore < Math.max(36, size / 12); pore += 1) {
        const x = seededNoise(pore, 41, 13) * size;
        const y = seededNoise(pore, 53, 17) * size;
        const width = size * (0.003 + seededNoise(pore, 61, 23) * 0.018);
        color.fillStyle = pore % 3 ? "rgba(91,74,54,.13)" : "rgba(255,250,235,.18)";
        ao.fillStyle = "rgba(76,60,43,.2)";
        color.fillRect(x, y, width, Math.max(1, width * 0.2));
        ao.fillRect(x, y, width, Math.max(1, width * 0.2));
      }
    }
    if (tiled && unified.pattern) {
      const columns = Math.max(1, Math.round(unified.physicalSizeMm[0] / unified.pattern.moduleWidthMm));
      const rows = Math.max(1, Math.round(unified.physicalSizeMm[1] / unified.pattern.moduleLengthMm));
      color.strokeStyle = "rgba(74,65,55,.36)";
      normal.strokeStyle = "rgb(128,116,250)";
      ao.strokeStyle = "rgba(45,39,33,.48)";
      [color, normal, ao].forEach((ctx) => { ctx.lineWidth = Math.max(1, size * unified.pattern!.seamWidthMm / unified.physicalSizeMm[0]); });
      for (let column = 0; column <= columns; column += 1) {
        const x = column * size / columns;
        [color, normal, ao].forEach((ctx) => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke(); });
      }
      for (let row = 0; row <= rows; row += 1) {
        const y = row * size / rows;
        [color, normal, ao].forEach((ctx) => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); });
      }
    }
    if (herringbone) {
      const unit = size / 8;
      color.strokeStyle = "rgba(92,78,61,.46)";
      normal.strokeStyle = "rgb(128,116,250)";
      ao.strokeStyle = "rgba(54,45,37,.5)";
      [color, normal, ao].forEach((ctx) => { ctx.lineWidth = Math.max(1, size / 420); });
      for (let row = -1; row < 10; row += 1) {
        for (let column = -2; column < 10; column += 1) {
          const x = column * unit + (row % 2 ? unit / 2 : 0);
          const y = row * unit;
          [color, normal, ao].forEach((ctx) => {
            ctx.beginPath();
            ctx.moveTo(x, y + unit / 2);
            ctx.lineTo(x + unit / 2, y);
            ctx.lineTo(x + unit, y + unit / 2);
            ctx.stroke();
          });
        }
      }
    }
  } else if (metal) {
    for (let x = 0; x < size; x += 3) {
      color.fillStyle = x % 9 ? "rgba(255,255,255,.035)" : "rgba(25,25,25,.045)";
      color.fillRect(x, 0, 1, size);
      roughness.fillStyle = x % 9 ? "rgb(92,92,92)" : "rgb(126,126,126)";
      roughness.fillRect(x, 0, 1, size);
    }
  } else if (glass) {
    roughness.fillStyle = "rgb(24,24,24)";
    roughness.fillRect(0, 0, size, size);
  }

  color.strokeStyle = resolvedAccent;
  color.globalAlpha = wall ? 0.025 : 0.045;
  color.strokeRect(0.5, 0.5, size - 1, size - 1);
  color.globalAlpha = 1;

  if (height) {
    height.globalAlpha = 0.42;
    height.drawImage(roughnessCanvas, 0, 0);
    height.globalAlpha = 0.34;
    height.drawImage(aoCanvas, 0, 0);
    height.globalAlpha = 1;
  }

  return {
    map: configure(new THREE.CanvasTexture(colorCanvas), repeat, rotation, true),
    normalMap: configure(new THREE.CanvasTexture(normalCanvas), repeat, rotation),
    roughnessMap: configure(new THREE.CanvasTexture(roughnessCanvas), repeat, rotation),
    aoMap: configure(new THREE.CanvasTexture(aoCanvas), repeat, rotation),
    bumpMap: heightCanvas ? configure(new THREE.CanvasTexture(heightCanvas), repeat, rotation) : undefined
  } satisfies ProceduralPbrMaps;
}

export function useProceduralPbrMaps({
  kind,
  baseColor,
  accentColor = "#8a8075",
  repeat = [1, 1],
  rotation = 0,
  quality = "standard",
  device = "desktop",
  token,
  resourceId,
  canonicalTransform = false,
  neutralColor = false
}: Options) {
  const inheritedQuality = useProceduralPbrQuality();
  const repeatX = Math.round(repeat[0] * 100) / 100;
  const repeatY = Math.round(repeat[1] * 100) / 100;
  const resolvedToken = token ?? resolvePbrMaterialToken(resourceId ?? kind ?? undefined);
  const tier = resolveQualityTier(quality ?? inheritedQuality.quality);
  const resolvedDevice = device ?? inheritedQuality.device;
  const roundedRotation = Math.round(rotation * 1000) / 1000;
  const transformKey = canonicalTransform ? "material-transform" : `${repeatX}|${repeatY}|${roundedRotation}`;
  const colorKey = neutralColor ? "neutral" : `${baseColor}|${accentColor}`;
  const cacheKey = kind ? `${kind}|${resolvedToken}|${colorKey}|${transformKey}|${tier}|${resolvedDevice}|${resourceId ?? "local"}` : "none";
  const maps = useMemo(
    () => {
      if (!kind) return null;
      const cached = pbrMapCache.get(cacheKey);
      if (cached) {
        cached.lastUsed = Date.now();
        return cached.maps;
      }
      const generated = buildPbrMaps(kind, baseColor, accentColor, canonicalTransform ? [1, 1] : [repeatX, repeatY], canonicalTransform ? 0 : roundedRotation, tier, resolvedDevice, resolvedToken, resourceId, neutralColor);
      if (generated) {
        const textureCount = [generated.map, generated.normalMap, generated.roughnessMap, generated.aoMap, generated.bumpMap].filter(Boolean).length;
        pbrMapCache.set(cacheKey, {
          maps: generated,
          estimatedBytes: generated.map.image.width * generated.map.image.height * 4 * textureCount,
          refs: 0,
          lastUsed: Date.now()
        });
        schedulePbrMapPrune();
      }
      return generated;
    },
    [accentColor, baseColor, cacheKey, canonicalTransform, kind, neutralColor, repeatX, repeatY, resolvedDevice, resolvedToken, resourceId, roundedRotation, tier]
  );
  useEffect(() => {
    const entry = pbrMapCache.get(cacheKey);
    if (!entry || !maps) return;
    entry.refs += 1;
    entry.lastUsed = Date.now();
    schedulePbrMapPrune();
    return () => {
      const current = pbrMapCache.get(cacheKey);
      if (current) {
        current.refs = Math.max(0, current.refs - 1);
        current.lastUsed = Date.now();
      }
      schedulePbrMapPrune();
    };
  }, [cacheKey, maps]);
  return maps;
}

export function getProceduralPbrCacheStats() {
  return {
    entries: pbrMapCache.size,
    activeEntries: Array.from(pbrMapCache.values()).filter((entry) => entry.refs > 0).length,
    maxEntries: MAX_PBR_MAP_CACHE_ENTRIES,
    evictions: pbrMapEvictionCount,
    estimatedBytes: Array.from(pbrMapCache.values()).reduce((sum, entry) => sum + entry.estimatedBytes, 0),
    generatedMaps: pbrMapGenerationCount
  };
}
