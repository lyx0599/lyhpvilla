"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { ProceduralPbrQualityProvider, useProceduralPbrMaps, useProceduralPbrQuality, type ProceduralPbrKind } from "./procedural-pbr";
import {
  getPbrMaterialDefinition,
  resolveMaterialUvTransform,
  type MaterialDeviceClass,
  type MaterialQualityTier,
  type MaterialRole,
  type PbrMaterialToken
} from "@/lib/material-system";

export type PbrMaterialProps = {
  token?: string;
  fallbackRole?: MaterialRole;
  resourceId?: string;
  color?: string;
  accentColor?: string;
  surfaceSizeM?: readonly [number, number];
  uvScale?: readonly [number, number];
  uvRotationDeg?: number;
  quality?: MaterialQualityTier;
  device?: MaterialDeviceClass;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  normalStrength?: number;
  transmission?: number;
  thicknessMm?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  side?: THREE.Side;
  depthWrite?: boolean;
  clippingPlanes?: THREE.Plane[] | null;
  envMapIntensity?: number;
};

type CachedPbrMaterial = {
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  refs: number;
  lastUsed: number;
};

const MAX_PBR_MATERIAL_CACHE_ENTRIES = 192;
const materialCache = new Map<string, CachedPbrMaterial>();
let materialPruneTimer: number | null = null;

function pruneMaterialCache() {
  materialPruneTimer = null;
  if (materialCache.size <= MAX_PBR_MATERIAL_CACHE_ENTRIES) return;
  const idleEntries = Array.from(materialCache.entries())
    .filter(([, entry]) => entry.refs === 0)
    .sort(([, left], [, right]) => left.lastUsed - right.lastUsed);
  while (materialCache.size > MAX_PBR_MATERIAL_CACHE_ENTRIES && idleEntries.length) {
    const [key, entry] = idleEntries.shift()!;
    materialCache.delete(key);
    if (typeof entry.material?.dispose === "function") entry.material.dispose();
  }
}

function makeRoomForMaterial() {
  if (materialCache.size < MAX_PBR_MATERIAL_CACHE_ENTRIES) return;
  const now = Date.now();
  const idleEntries = Array.from(materialCache.entries())
    // Do not evict materials created during the current React commit before
    // their ownership effect has had a chance to register a reference.
    .filter(([, entry]) => entry.refs === 0 && now - entry.lastUsed > 100)
    .sort(([, left], [, right]) => left.lastUsed - right.lastUsed);
  while (materialCache.size >= MAX_PBR_MATERIAL_CACHE_ENTRIES && idleEntries.length) {
    const [key, entry] = idleEntries.shift()!;
    materialCache.delete(key);
    if (typeof entry.material?.dispose === "function") entry.material.dispose();
  }
}

function scheduleMaterialPrune() {
  if (typeof window === "undefined" || materialPruneTimer !== null) return;
  materialPruneTimer = window.setTimeout(pruneMaterialCache, 0);
}

function applyMaterialUvTransform(material: THREE.Material, repeat: readonly [number, number], rotation: number) {
  const transform = new THREE.Matrix3().setUvTransform(0, 0, repeat[0], repeat[1], rotation, 0.5, 0.5);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.villaUvTransform = { value: transform };
    shader.vertexShader = shader.vertexShader
      .replace("#include <uv_pars_vertex>", "#include <uv_pars_vertex>\nuniform mat3 villaUvTransform;")
      .replace("#include <uv_vertex>", `#include <uv_vertex>
#ifdef USE_MAP
  vMapUv = ( villaUvTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
  vAoMapUv = ( villaUvTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
  vBumpMapUv = ( villaUvTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
  vNormalMapUv = ( villaUvTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
  vRoughnessMapUv = ( villaUvTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif`);
  };
  material.customProgramCacheKey = () => "villa-pbr-material-uv-v1";
}

export function PbrQualityProvider({ quality, device, children }: { quality: MaterialQualityTier; device: MaterialDeviceClass; children: ReactNode }) {
  return <ProceduralPbrQualityProvider quality={quality} device={device}>{children}</ProceduralPbrQualityProvider>;
}

function kindForToken(token: PbrMaterialToken): ProceduralPbrKind {
  const family = getPbrMaterialDefinition(token).definition.family;
  if (family === "wood" || family === "woodFloor") return "wood";
  if (family === "fabric") return "fabric";
  if (family === "stone" || family === "tile") return "stone";
  if (family === "microcement") return "microcement";
  if (family === "metal") return "metal";
  if (family === "glass") return "glass";
  if (family === "ceramic") return "ceramic";
  return "wall";
}

function planeKey(planes: THREE.Plane[] | null | undefined) {
  if (!planes?.length) return "none";
  return planes.map((plane) => [plane.normal.x, plane.normal.y, plane.normal.z, plane.constant].map((value) => value.toFixed(3)).join(",")).join(";");
}

/**
 * One material component for furniture and architectural surfaces.
 * Texture maps and material instances are both cached. When canvas creation
 * is unavailable, the same token remains visible through its authored fallback.
 */
export function PbrMaterial({
  token,
  fallbackRole,
  resourceId,
  color,
  accentColor,
  surfaceSizeM,
  uvScale = [1, 1],
  uvRotationDeg = 0,
  quality,
  device,
  roughness,
  metalness,
  opacity,
  normalStrength,
  transmission,
  thicknessMm,
  clearcoat,
  clearcoatRoughness,
  emissive,
  emissiveIntensity,
  side,
  depthWrite,
  clippingPlanes,
  envMapIntensity
}: PbrMaterialProps) {
  const inheritedQuality = useProceduralPbrQuality();
  const resolvedQuality = quality ?? inheritedQuality.quality;
  const resolvedDevice = device ?? inheritedQuality.device;
  const resolved = getPbrMaterialDefinition(token ?? resourceId, fallbackRole);
  const definition = resolved.definition;
  const transform = resolveMaterialUvTransform(resolved.token, surfaceSizeM, uvRotationDeg, uvScale);
  const resolvedColor = color ?? definition.baseColor;
  const resolvedOpacity = opacity ?? definition.opacity ?? 1;
  const resolvedTransmission = transmission ?? definition.transmission ?? 0;
  const resolvedNormalStrength = normalStrength ?? definition.normalStrength;
  const maps = useProceduralPbrMaps({
    kind: kindForToken(resolved.token),
    token: resolved.token,
    resourceId,
    baseColor: resolvedColor,
    accentColor: accentColor ?? definition.accentColor,
    repeat: transform.repeat,
    rotation: transform.rotation,
    quality: resolvedQuality,
    device: resolvedDevice,
    canonicalTransform: true,
    neutralColor: true
  });

  const cacheKey = [
    resolved.token,
    resourceId ?? "canonical",
    resolvedColor,
    roughness ?? definition.roughness,
    metalness ?? definition.metalness,
    resolvedOpacity,
    resolvedTransmission,
    thicknessMm ?? definition.thicknessMm ?? 0,
    clearcoat ?? definition.clearcoat ?? 0,
    clearcoatRoughness ?? definition.clearcoatRoughness ?? 0,
    resolvedNormalStrength,
    resolvedQuality,
    resolvedDevice,
    transform.repeat[0].toFixed(2),
    transform.repeat[1].toFixed(2),
    transform.rotation.toFixed(3),
    side ?? THREE.FrontSide,
    depthWrite ?? resolvedOpacity >= 0.88,
    emissive ?? definition.emissive ?? "none",
    emissiveIntensity ?? definition.emissiveIntensity ?? 0,
    envMapIntensity ?? 0.72,
    planeKey(clippingPlanes),
    maps?.map.uuid ?? "fallback"
  ].join("|");

  const material = useMemo(() => {
    const cached = materialCache.get(cacheKey);
    if (cached) {
      cached.lastUsed = Date.now();
      return cached.material;
    }
    const common: THREE.MeshPhysicalMaterialParameters = {
      color: maps ? resolvedColor : definition.fallback.color,
      map: maps?.map ?? null,
      normalMap: maps?.normalMap ?? null,
      normalScale: new THREE.Vector2(resolvedNormalStrength, resolvedNormalStrength),
      roughnessMap: maps?.roughnessMap ?? null,
      aoMap: maps?.aoMap ?? null,
      aoMapIntensity: definition.family === "fabric" ? 0.34 : 0.24,
      // Height is intentionally not applied in the formal renderer yet.
      // The current generated height is derived from roughness/AO and is kept
      // available to the isolated audit page, but it has no physical meaning
      // suitable for production surfaces.
      roughness: roughness ?? definition.roughness,
      metalness: metalness ?? definition.metalness,
      transparent: resolvedOpacity < 1 || resolvedTransmission > 0,
      opacity: resolvedOpacity,
      depthWrite: depthWrite ?? (resolvedOpacity >= 0.88 && resolvedTransmission <= 0),
      side: side ?? (definition.family === "glass" ? THREE.DoubleSide : THREE.FrontSide),
      emissive: emissive ?? definition.emissive ?? "#000000",
      emissiveIntensity: emissiveIntensity ?? definition.emissiveIntensity ?? 0,
      envMapIntensity: envMapIntensity ?? (definition.family === "glass" || definition.family === "metal" ? 1 : 0.72),
      ...(clippingPlanes?.length ? { clippingPlanes } : {})
    };
    const usePhysical = resolvedQuality === "presentation" && (resolvedTransmission > 0 || (clearcoat ?? definition.clearcoat ?? 0) > 0);
    const created = usePhysical
      ? new THREE.MeshPhysicalMaterial({
        ...common,
        transmission: resolvedTransmission,
        thickness: (thicknessMm ?? definition.thicknessMm ?? 0) / 1000,
        ior: definition.ior ?? 1.5,
        clearcoat: clearcoat ?? definition.clearcoat ?? 0,
        clearcoatRoughness: clearcoatRoughness ?? definition.clearcoatRoughness ?? 0.5
      })
      : new THREE.MeshStandardMaterial(common);
    created.name = `pbr:${resolved.token}:${resolvedQuality}:${resolvedDevice}`;
    created.userData = {
      materialToken: resolved.token,
      materialRoles: definition.roles,
      physicalSizeMm: definition.physicalSizeMm,
      source: definition.source,
      fallback: !maps,
      qualityChannels: resolvedQuality === "draft" ? ["baseColor"] : resolvedQuality === "standard" ? ["baseColor", "normal", "roughness", "ao"] : ["baseColor", "normal", "roughness", "ao", "height"]
    };
    applyMaterialUvTransform(created, transform.repeat, transform.rotation);
    makeRoomForMaterial();
    if (materialCache.size < MAX_PBR_MATERIAL_CACHE_ENTRIES) {
      materialCache.set(cacheKey, { material: created, refs: 0, lastUsed: Date.now() });
    }
    return created;
  }, [cacheKey, clearcoat, clearcoatRoughness, clippingPlanes, definition, depthWrite, emissive, emissiveIntensity, envMapIntensity, maps, metalness, resolved.token, resolvedDevice, resolvedNormalStrength, resolvedOpacity, resolvedQuality, resolvedTransmission, roughness, side, thicknessMm, transform.repeat, transform.rotation]);

  useEffect(() => {
    const entry = materialCache.get(cacheKey);
    if (!entry || entry.material !== material) {
      return () => {
        if (typeof material?.dispose === "function") material.dispose();
      };
    }
    entry.refs += 1;
    entry.lastUsed = Date.now();
    scheduleMaterialPrune();
    return () => {
      const current = materialCache.get(cacheKey);
      if (current?.material === material) {
        current.refs = Math.max(0, current.refs - 1);
        current.lastUsed = Date.now();
      }
      scheduleMaterialPrune();
    };
  }, [cacheKey, material]);

  return <primitive attach="material" dispose={null} object={material} />;
}

export function getPbrMaterialCacheStats() {
  return {
    materialInstances: materialCache.size,
    activeMaterialInstances: Array.from(materialCache.values()).filter((entry) => entry.refs > 0).length,
    maxMaterialInstances: MAX_PBR_MATERIAL_CACHE_ENTRIES
  };
}
