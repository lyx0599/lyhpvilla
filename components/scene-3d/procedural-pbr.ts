"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Render3DMaterialRole } from "@/lib/render3d-assets";

export type ProceduralPbrKind = Exclude<Render3DMaterialRole, "light" | "plant" | "generic"> | "wall" | "microcement";

export type ProceduralPbrMaps = {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
};

type Options = {
  kind: ProceduralPbrKind | null;
  baseColor: string;
  accentColor?: string;
  repeat?: [number, number];
  quality?: "balanced" | "high";
};

// Material parts repeat the same handful of finishes many times. Sharing the
// generated maps avoids allocating four GPU textures for every cushion, door
// panel or stair trim while keeping the fallback entirely local and offline.
const pbrMapCache = new Map<string, ProceduralPbrMaps>();

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

function configure(texture: THREE.CanvasTexture, repeat: [number, number], color = false) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(Math.max(0.1, repeat[0]), Math.max(0.1, repeat[1]));
  texture.anisotropy = 8;
  texture.channel = 0;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function buildPbrMaps(kind: ProceduralPbrKind, baseColor: string, accentColor: string, repeat: [number, number], quality: "balanced" | "high") {
  if (typeof document === "undefined") return null;
  const size = quality === "high" ? 256 : 128;
  const colorCanvas = makeCanvas(size);
  const normalCanvas = makeCanvas(size);
  const roughnessCanvas = makeCanvas(size);
  const aoCanvas = makeCanvas(size);
  const color = colorCanvas.getContext("2d");
  const normal = normalCanvas.getContext("2d");
  const roughness = roughnessCanvas.getContext("2d");
  const ao = aoCanvas.getContext("2d");
  if (!color || !normal || !roughness || !ao) return null;

  color.fillStyle = baseColor;
  color.fillRect(0, 0, size, size);
  normal.fillStyle = "rgb(128,128,255)";
  normal.fillRect(0, 0, size, size);
  roughness.fillStyle = "rgb(190,190,190)";
  roughness.fillRect(0, 0, size, size);
  ao.fillStyle = "white";
  ao.fillRect(0, 0, size, size);

  const wood = kind === "wood";
  const fabric = kind === "fabric" || kind === "leather";
  const stone = kind === "stone" || kind === "ceramic";
  const wall = kind === "wall" || kind === "microcement";
  const metal = kind === "metal";
  const glass = kind === "glass";
  const lineStep = wood ? Math.max(7, size / 22) : fabric ? Math.max(4, size / 42) : Math.max(12, size / 14);

  for (let index = 0; index < size * 2; index += 1) {
    const x = seededNoise(index, 2, kind.length) * size;
    const y = seededNoise(index, 7, kind.length) * size;
    const alpha = 0.025 + seededNoise(index, 11, 3) * (wall ? 0.045 : 0.085);
    color.fillStyle = index % 2 ? `rgba(255,255,255,${alpha})` : `rgba(45,35,26,${alpha})`;
    color.fillRect(x, y, wall ? 1.2 : 1.7, wall ? 1.2 : 1.7);
  }

  if (wood) {
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
  } else if (fabric) {
    for (let offset = 0; offset < size; offset += lineStep) {
      normal.strokeStyle = offset % (lineStep * 2) ? "rgb(123,132,254)" : "rgb(133,123,254)";
      normal.lineWidth = 1;
      normal.beginPath(); normal.moveTo(offset, 0); normal.lineTo(offset, size); normal.stroke();
      normal.beginPath(); normal.moveTo(0, offset); normal.lineTo(size, offset); normal.stroke();
      roughness.fillStyle = kind === "leather" ? "rgb(150,150,150)" : "rgb(232,232,232)";
      roughness.fillRect(offset, 0, 1, size); roughness.fillRect(0, offset, size, 1);
      color.strokeStyle = kind === "leather" ? "rgba(65,39,25,.09)" : "rgba(76,62,50,.11)";
      color.strokeRect(offset, 0, 1, size); color.strokeRect(0, offset, size, 1);
    }
  } else if (stone || wall) {
    for (let index = 0; index < (wall ? 9 : 14); index += 1) {
      const y = (index + 0.5) * size / (wall ? 9 : 14);
      color.strokeStyle = index % 2 ? "rgba(255,255,255,.11)" : "rgba(74,66,57,.09)";
      normal.strokeStyle = index % 2 ? "rgb(128,132,255)" : "rgb(128,124,253)";
      roughness.strokeStyle = kind === "ceramic" ? "rgb(86,86,86)" : wall ? "rgb(220,220,220)" : "rgb(148,148,148)";
      [color, normal, roughness].forEach((ctx) => { ctx.lineWidth = wall ? 1 : 1.6; ctx.beginPath(); });
      for (let x = 0; x <= size; x += size / 14) {
        const waveY = y + Math.sin((x + index * 19) * 0.045) * (wall ? 1.4 : 5.5);
        [color, normal, roughness].forEach((ctx) => x === 0 ? ctx.moveTo(x, waveY) : ctx.lineTo(x, waveY));
      }
      [color, normal, roughness].forEach((ctx) => ctx.stroke());
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

  color.strokeStyle = accentColor;
  color.globalAlpha = wall ? 0.025 : 0.045;
  color.strokeRect(0.5, 0.5, size - 1, size - 1);
  color.globalAlpha = 1;

  return {
    map: configure(new THREE.CanvasTexture(colorCanvas), repeat, true),
    normalMap: configure(new THREE.CanvasTexture(normalCanvas), repeat),
    roughnessMap: configure(new THREE.CanvasTexture(roughnessCanvas), repeat),
    aoMap: configure(new THREE.CanvasTexture(aoCanvas), repeat)
  } satisfies ProceduralPbrMaps;
}

export function useProceduralPbrMaps({ kind, baseColor, accentColor = "#8a8075", repeat = [1, 1], quality = "high" }: Options) {
  const repeatX = Math.round(repeat[0] * 100) / 100;
  const repeatY = Math.round(repeat[1] * 100) / 100;
  const cacheKey = kind ? `${kind}|${baseColor}|${accentColor}|${repeatX}|${repeatY}|${quality}` : "none";
  const maps = useMemo(
    () => {
      if (!kind) return null;
      const cached = pbrMapCache.get(cacheKey);
      if (cached) return cached;
      const generated = buildPbrMaps(kind, baseColor, accentColor, [repeatX, repeatY], quality);
      if (generated) pbrMapCache.set(cacheKey, generated);
      return generated;
    },
    [cacheKey, kind, quality, repeatX, repeatY, accentColor, baseColor]
  );
  return maps;
}
