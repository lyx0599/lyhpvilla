"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getPbrMaterialCacheStats } from "./pbr-material";
import { getProceduralPbrCacheStats } from "./procedural-pbr";
import { getReflectionEnvironmentStats } from "./reflection-environment";

export type ScenePerformanceSnapshot = {
  mode: "edit" | "presentation";
  interactionActive: boolean;
  averageFps: number;
  minFps: number;
  p5Fps: number;
  sampleFrames: number;
  textures: number;
  materials: number;
  geometries: number;
  lights: number;
  shadowLights: number;
  visibleMeshes: number;
  drawCalls: number;
  triangles: number;
  dpr: number;
  textureCacheEntries: number;
  activeTextureCacheEntries: number;
  materialCacheEntries: number;
  activeMaterialCacheEntries: number;
  textureCacheEvictions: number;
  materialCacheEvictions: number;
  pbrMapGenerations: number;
  pbrMaterialCreations: number;
  pbrMaterialCacheHits: number;
  pmremGenerations: number;
  shaderPrograms: number;
  estimatedTextureCacheBytes: number;
  usedJsHeapBytes: number | null;
  measuredAt: string;
};

declare global {
  interface Window {
    __villa3dPerformance?: ScenePerformanceSnapshot;
  }
}

function percentile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function materialTextures(material: THREE.Material) {
  const textures: THREE.Texture[] = [];
  Object.values(material).forEach((value) => {
    if (value instanceof THREE.Texture) textures.push(value);
  });
  return textures;
}

export function ScenePerformanceMonitor({ mode, interactionActive = false }: { mode: "edit" | "presentation"; interactionActive?: boolean }) {
  const { gl, scene } = useThree();
  const fpsSamples = useRef<number[]>([]);
  const warmupFrames = useRef(0);
  const lastPublishAt = useRef(0);

  useEffect(() => {
    fpsSamples.current = [];
    warmupFrames.current = 0;
    lastPublishAt.current = 0;
  }, [interactionActive, mode]);

  useFrame((state, delta) => {
    // Keep scene construction, shader compilation and the first shadow upload out
    // of the steady-state interaction number. Those costs are tracked separately
    // by the 3D-switch latency regression.
    const warmupTarget = interactionActive ? 6 : 60;
    if (warmupFrames.current < warmupTarget) {
      warmupFrames.current += 1;
      return;
    }
    if (delta > 0 && delta < 1) {
      // The product target is a 60 Hz desktop display. Off-screen/headless
      // browsers may run requestAnimationFrame faster than the display, so cap
      // the reported value at the user-visible refresh target.
      fpsSamples.current.push(Math.min(60, 1 / delta));
      if (fpsSamples.current.length > 300) fpsSamples.current.shift();
    }
    const now = state.clock.elapsedTime;
    if (now - lastPublishAt.current < 0.5 || fpsSamples.current.length < 1) return;
    lastPublishAt.current = now;

    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    let lights = 0;
    let shadowLights = 0;
    let visibleMeshes = 0;
    scene.traverseVisible((object) => {
      if (object instanceof THREE.Light && object.intensity > 0) {
        lights += 1;
        if (object.castShadow) shadowLights += 1;
      }
      if (!(object instanceof THREE.Mesh)) return;
      visibleMeshes += 1;
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.forEach((material) => {
        if (!material) return;
        materials.add(material);
        materialTextures(material).forEach((texture) => textures.add(texture));
      });
    });

    const samples = fpsSamples.current;
    const proceduralCache = getProceduralPbrCacheStats();
    const materialCache = getPbrMaterialCacheStats();
    const memory = (window.performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
    const snapshot: ScenePerformanceSnapshot = {
      mode,
      interactionActive,
      averageFps: samples.reduce((sum, value) => sum + value, 0) / samples.length,
      minFps: Math.min(...samples),
      p5Fps: percentile(samples, 0.05),
      sampleFrames: samples.length,
      textures: Math.max(textures.size, gl.info.memory.textures),
      materials: materials.size,
      geometries: gl.info.memory.geometries,
      lights,
      shadowLights,
      visibleMeshes,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      dpr: gl.getPixelRatio(),
      textureCacheEntries: proceduralCache.entries,
      activeTextureCacheEntries: proceduralCache.activeEntries,
      materialCacheEntries: materialCache.materialInstances,
      activeMaterialCacheEntries: materialCache.activeMaterialInstances,
      textureCacheEvictions: proceduralCache.evictions,
      materialCacheEvictions: materialCache.evictions,
      pbrMapGenerations: proceduralCache.generatedMaps,
      pbrMaterialCreations: materialCache.createdMaterials,
      pbrMaterialCacheHits: materialCache.cacheHits,
      pmremGenerations: getReflectionEnvironmentStats().pmremGenerations,
      shaderPrograms: gl.info.programs?.length ?? 0,
      estimatedTextureCacheBytes: proceduralCache.estimatedBytes,
      usedJsHeapBytes: memory?.usedJSHeapSize ?? null,
      measuredAt: new Date().toISOString()
    };
    window.__villa3dPerformance = snapshot;
    gl.domElement.dataset.performanceSnapshot = JSON.stringify(snapshot);
    if (interactionActive) {
      gl.domElement.dataset.interactionPerformanceSnapshot = JSON.stringify(snapshot);
    }
  });

  return null;
}
