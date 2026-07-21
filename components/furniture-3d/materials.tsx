"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ResolvedRender3DMaterialLayer, Render3DMaterialRole } from "@/lib/render3d-assets";

type Props = {
  layer: ResolvedRender3DMaterialLayer;
  role?: Render3DMaterialRole;
  color?: string;
  repeat?: [number, number];
  roughness?: number;
  metalness?: number;
  opacity?: number;
  emissiveIntensity?: number;
  side?: THREE.Side;
};

function tone(color: string, amount: number) {
  const value = new THREE.Color(color);
  return `#${value.offsetHSL(0, 0, amount).getHexString()}`;
}
function drawFurnitureTexture(layer: ResolvedRender3DMaterialLayer, role: Render3DMaterialRole) {
  if (typeof document === "undefined" || ["glass", "metal", "light", "ceramic"].includes(role)) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = layer.color;
  context.fillRect(0, 0, 256, 256);

  if (role === "wood") {
    context.globalAlpha = 0.18;
    for (let x = -20; x < 280; x += 13) {
      context.strokeStyle = x % 26 ? tone(layer.color, -0.12) : tone(layer.color, 0.1);
      context.lineWidth = x % 39 === 0 ? 2.4 : 1;
      context.beginPath();
      for (let y = 0; y <= 256; y += 12) {
        const px = x + Math.sin((y + x * 0.7) * 0.065) * (3 + (x % 5));
        if (y === 0) context.moveTo(px, y);
        else context.lineTo(px, y);
      }
      context.stroke();
    }
  } else if (role === "fabric" && /boucle/i.test(layer.token)) {
    context.globalAlpha = 0.24;
    for (let y = 4; y < 256; y += 8) {
      for (let x = 4 + (Math.floor(y / 8) % 2) * 4; x < 256; x += 8) {
        const wobble = Math.sin((x * 1.7 + y) * 0.11) * 1.2;
        context.strokeStyle = tone(layer.color, (x + y) % 24 ? -0.12 : 0.14);
        context.lineWidth = 1.35;
        context.beginPath();
        context.arc(x + wobble, y, 2.2 + ((x + y) % 3) * 0.35, 0, Math.PI * 2);
        context.stroke();
      }
    }
    context.globalAlpha = 0.12;
    context.fillStyle = tone(layer.color, 0.2);
    for (let y = 6; y < 256; y += 16) for (let x = 6; x < 256; x += 16) context.fillRect(x, y, 2, 2);
  } else if (role === "fabric") {
    // Keep the weave intentionally legible at normal room-view distance. Thin
    // single-pixel lines disappear after tone mapping and read as a colour block.
    context.globalAlpha = 0.2;
    context.strokeStyle = tone(layer.color, -0.2);
    context.lineWidth = 1.15;
    for (let offset = 0; offset < 256; offset += 6) {
      context.beginPath();
      context.moveTo(offset, 0);
      context.lineTo(offset, 256);
      context.stroke();
      context.beginPath();
      context.moveTo(0, offset);
      context.lineTo(256, offset);
      context.stroke();
    }
    context.globalAlpha = 0.12;
    context.fillStyle = tone(layer.color, 0.18);
    for (let y = 2; y < 256; y += 12) {
      for (let x = (Math.floor(y / 12) % 2) * 6; x < 256; x += 12) context.fillRect(x, y, 5, 2);
    }
  } else if (role === "leather") {
    context.globalAlpha = 0.14;
    context.strokeStyle = tone(layer.color, -0.18);
    context.lineWidth = 0.9;
    for (let y = 5; y < 256; y += 11) {
      context.beginPath();
      for (let x = 0; x <= 256; x += 8) {
        const py = y + Math.sin((x + y * 1.7) * 0.07) * 1.8;
        if (x === 0) context.moveTo(x, py);
        else context.lineTo(x, py);
      }
      context.stroke();
    }
    context.globalAlpha = 0.09;
    context.fillStyle = tone(layer.color, 0.2);
    for (let y = 7; y < 256; y += 17) {
      for (let x = (y % 3) * 5; x < 256; x += 19) context.fillRect(x, y, 3, 1.5);
    }
  } else if (role === "stone") {
    context.globalAlpha = 0.24;
    for (let index = 0; index < 9; index += 1) {
      context.strokeStyle = index % 2 ? tone(layer.color, -0.15) : tone(layer.color, 0.12);
      context.lineWidth = index % 3 === 0 ? 2.4 : 1.15;
      context.beginPath();
      for (let x = -10; x <= 266; x += 10) {
        const y = 18 + index * 28 + Math.sin((x + index * 43) * 0.045) * (8 + index);
        if (x === -10) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
  } else {
    context.globalAlpha = 0.08;
    context.fillStyle = tone(layer.color, -0.16);
    for (let y = 6; y < 256; y += 14) {
      for (let x = 6 + (y % 28); x < 256; x += 20) context.fillRect(x, y, 1.5, 1.5);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

export function FurnitureMaterial({ layer, role = layer.role, color, repeat = [1, 1], roughness, metalness, opacity, emissiveIntensity, side }: Props) {
  const texture = useMemo(() => drawFurnitureTexture(layer, role), [layer.color, layer.token, role]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (texture) texture.repeat.set(repeat[0], repeat[1]);
  const resolvedOpacity = opacity ?? layer.opacity ?? 1;
  return (
    <meshStandardMaterial
      color={color ?? layer.color}
      map={texture ?? undefined}
      roughness={roughness ?? layer.roughness}
      metalness={metalness ?? layer.metalness}
      transparent={resolvedOpacity < 1}
      opacity={resolvedOpacity}
      depthWrite={resolvedOpacity >= 0.88}
      emissive={layer.emissive}
      emissiveIntensity={emissiveIntensity ?? layer.emissiveIntensity ?? 0}
      side={side}
    />
  );
}
