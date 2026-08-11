"use client";

import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useEffect, useMemo, useState } from "react";
import { PbrMaterial, PbrQualityProvider } from "@/components/scene-3d/pbr-material";
import { useProceduralPbrMaps } from "@/components/scene-3d/procedural-pbr";
import { getPbrMaterialDefinition, type MaterialDeviceClass, type MaterialQualityTier, type PbrMaterialToken } from "@/lib/material-system";

type AuditShape = "sphere" | "plane" | "corner" | "scene" | "glass" | "cabinet" | "slabs" | "counter" | "formal";
type AuditMode = "new" | "legacy" | "height-a" | "height-b" | "height-c";
type AuditVariant =
  | "base"
  | "wood-1" | "wood-2" | "wood-3" | "wood-4"
  | "stone-1" | "stone-2" | "stone-3" | "stone-4"
  | "oakfloor-1" | "oakfloor-2"
  | "greystone-1" | "greystone-2"
  | "wet-tile-1" | "wet-tile-2"
  | "wall-1"
  | "microcement-1" | "microcement-2"
  | "ceramic-1"
  | "fabric-1" | "fabric-2"
  | "metal-1" | "metal-2"
  | "courtyard-1" | "courtyard-2";
type GlassAngle = "front" | "45" | "grazing";
type GlassThickness = "thin" | "thick";
type AuditViewDistance = "normal" | "firstPerson";

const TOKENS: PbrMaterialToken[] = [
  "oakFloor", "warmGreyStone", "wetAreaTile", "warmWhiteMineral", "microCement",
  "warmWhiteCeramic", "beigeFabric", "blackTitanium", "courtyardStone", "warmOak",
  "lightOak", "darkWalnut", "travertine", "creamBoucle", "greigeLinen", "cognacLeather",
  "darkBrownLeather", "blackTopGrainLeather", "brushedBronze", "agedBrass", "oatTaupeLacquer", "clearGlass", "smokedGlass"
];

const TOKEN_LABELS: Record<PbrMaterialToken, string> = {
  warmWhiteMineral: "暖白矿物墙漆", microCement: "暖灰微水泥", warmOak: "自然浅橡木",
  lightOak: "浅橡木家具饰面", darkWalnut: "低饱和深胡桃木",
  oakFloor: "木地板", travertine: "米色洞石", warmGreyStone: "暖灰石材", beigeFabric: "米灰布艺",
  creamBoucle: "奶油圈绒布艺", greigeLinen: "米灰亚麻布艺", cognacLeather: "低饱和棕色头层皮革",
  darkBrownLeather: "深棕真皮", blackTopGrainLeather: "黑色头层牛皮", blackTitanium: "深色拉丝金属", brushedBronze: "拉丝古铜",
  agedBrass: "低饱和做旧黄铜", oatTaupeLacquer: "浅燕麦灰褐哑光漆",
  clearGlass: "低铁玻璃", smokedGlass: "浅茶玻璃", warmWhiteCeramic: "暖白陶瓷",
  wetAreaTile: "湿区瓷砖", courtyardStone: "庭院暖灰石材"
};

const WOOD_NORMAL_OPTIONS = [0.08, 0.10, 0.12] as const;
const WOOD_ROUGHNESS_OPTIONS = [0.66, 0.70, 0.74] as const;

const TOKEN_VARIANTS: Record<PbrMaterialToken, readonly AuditVariant[]> = {
  oakFloor: ["base", "oakfloor-1", "oakfloor-2"],
  warmGreyStone: ["base", "greystone-1", "greystone-2"],
  wetAreaTile: ["base", "wet-tile-1", "wet-tile-2"],
  warmWhiteMineral: ["base", "wall-1"],
  microCement: ["base", "microcement-1", "microcement-2"],
  warmWhiteCeramic: ["base", "ceramic-1"],
  beigeFabric: ["base", "fabric-1", "fabric-2"],
  blackTitanium: ["base", "metal-1", "metal-2"],
  courtyardStone: ["base", "courtyard-1", "courtyard-2"],
  warmOak: ["base", "wood-1", "wood-2", "wood-3", "wood-4"],
  lightOak: ["base"],
  darkWalnut: ["base"],
  travertine: ["base", "stone-1", "stone-2", "stone-3", "stone-4"],
  creamBoucle: ["base"],
  greigeLinen: ["base"],
  cognacLeather: ["base"],
  darkBrownLeather: ["base"],
  blackTopGrainLeather: ["base"],
  brushedBronze: ["base"],
  agedBrass: ["base"],
  oatTaupeLacquer: ["base"],
  clearGlass: ["base"],
  smokedGlass: ["base"]
};

const AUDIT_VARIANT_STATS: Record<AuditVariant, { label: string; colorVariation: string; note: string }> = {
  base: { label: "基础", colorVariation: "0%", note: "未改变程序颜色纹理" },
  "wood-1": { label: "木材1", colorVariation: "约±3.5%", note: "仅降低法线强度" },
  "wood-2": { label: "木材2", colorVariation: "约±6.0%", note: "自然扰动色差" },
  "wood-3": { label: "木材3", colorVariation: "约±6.0%", note: "自然扰动 + 粗糙度提高" },
  "wood-4": { label: "木材4", colorVariation: "约±4.0%", note: "低对比、分段木纹；只改变程序颜色纹理" },
  "stone-1": { label: "洞石1", colorVariation: "约±4.5%", note: "降低连续波纹" },
  "stone-2": { label: "洞石2", colorVariation: "约±5.0%", note: "不连续色带" },
  "stone-3": { label: "洞石3", colorVariation: "约±7.0%", note: "色带 + 孔洞分级" },
  "stone-4": { label: "洞石4", colorVariation: "约±3.0%", note: "弱色带 + 稀疏成组孔洞；不改变粗糙度/法线" }
  ,"oakfloor-1": { label: "木地板1", colorVariation: "约±4.0%", note: "降低拼缝对比与法线起伏" }
  ,"oakfloor-2": { label: "木地板2", colorVariation: "约±6.0%", note: "板间稳定色差 + 非连续木纹" }
  ,"greystone-1": { label: "暖灰石材1", colorVariation: "约±4.0%", note: "降低高光风险，保留整板云纹" }
  ,"greystone-2": { label: "暖灰石材2", colorVariation: "约±6.0%", note: "更高粗糙度 + 稀疏矿物脉络" }
  ,"wet-tile-1": { label: "湿区瓷砖1", colorVariation: "约±3.0%", note: "弱化填缝对比，保留300×600模块" }
  ,"wet-tile-2": { label: "湿区瓷砖2", colorVariation: "约±5.0%", note: "釉面高光更柔和，湿干差异更清楚" }
  ,"wall-1": { label: "墙漆1", colorVariation: "约±2.0%", note: "降低近景颗粒密度，保持暖白身份" }
  ,"microcement-1": { label: "微水泥1", colorVariation: "约±4.0%", note: "低幅批刀云纹，降低浮雕感" }
  ,"microcement-2": { label: "微水泥2", colorVariation: "约±6.0%", note: "增加大尺度不连续抹纹" }
  ,"ceramic-1": { label: "陶瓷1", colorVariation: "约±2.0%", note: "降低清漆高光，改为柔和釉面" }
  ,"fabric-1": { label: "布艺1", colorVariation: "约±3.0%", note: "降低规则网格可见度" }
  ,"fabric-2": { label: "布艺2", colorVariation: "约±4.0%", note: "低频纱线色差 + 更柔和粗糙度" }
  ,"metal-1": { label: "金属1", colorVariation: "约±2.0%", note: "较均匀拉丝，减少黑塑料感" }
  ,"metal-2": { label: "金属2", colorVariation: "约±4.0%", note: "略提高粗糙度，保留连续反射" }
  ,"courtyard-1": { label: "庭院石材1", colorVariation: "约±4.0%", note: "降低铺装重复与拼缝压迫" }
  ,"courtyard-2": { label: "庭院石材2", colorVariation: "约±6.0%", note: "加入稳定湿干色差与局部矿物斑驳" }
};

const AUDIT_CANDIDATE_NOTES: Record<PbrMaterialToken, string> = {
  oakFloor: "候选只存在于验收页；正式木地板不变。重点检查板宽、板长、2mm拼缝、木纹方向和俯视重复。",
  warmGreyStone: "候选只存在于验收页；正式暖灰石材不变。重点检查反射是否像塑料或人造板。",
  wetAreaTile: "候选只存在于验收页；正式湿区砖不变。重点检查300×600模块、填缝和湿区高光。",
  warmWhiteMineral: "候选只存在于验收页；正式暖白墙漆不变。重点检查过白、过平和近景颗粒。",
  microCement: "候选只存在于验收页；正式微水泥不变。重点检查批刀抹纹与浮雕感。",
  warmWhiteCeramic: "候选只存在于验收页；正式陶瓷不变。重点检查柔和釉面而非塑料高光。",
  beigeFabric: "候选只存在于验收页；正式布艺不变。重点检查织纹网格、摩尔纹和远景平整度。",
  blackTitanium: "候选只存在于验收页；正式黑钛金属不变。继续使用标量 metalness，不新增 metalnessMap。",
  courtyardStone: "候选只存在于验收页；正式庭院石材不变。重点检查600×1200铺装、6mm拼缝和湿干变化。",
  warmOak: "既有浅橡木候选保留在验收页，本阶段不再调整。",
  lightOak: "新增 canonical 家具木材；重点检查餐桌、床架和轻家具的木纹方向与低对比度。",
  darkWalnut: "新增 canonical 深木身份；重点检查B2/B1局部木作的饱和度与高光。",
  travertine: "既有洞石候选保留在验收页，本阶段不再调整。",
  creamBoucle: "新增 canonical 圈绒布艺；重点检查近景颗粒、远景平整度和法线强度。",
  greigeLinen: "新增 canonical 亚麻布艺；重点检查与暖白墙面、餐椅和床品的明度差异。",
  cognacLeather: "新增 canonical 棕色皮革；重点检查反射、包边和红色饱和度。",
  darkBrownLeather: "新增 canonical 深棕皮革；重点检查滚边与黑钛金属的分离度。",
  blackTopGrainLeather: "全屋共享 canonical 黑色头层牛皮；重点检查粒面、包边高光及与黑钛金属的分离度。",
  brushedBronze: "新增 canonical 拉丝古铜；重点检查金属高光和与黑钛的区别。",
  agedBrass: "新增 canonical 做旧黄铜；重点检查黄色饱和度和家具五金尺度。",
  oatTaupeLacquer: "新增 canonical 燕麦灰褐哑光漆；重点检查柜门与木饰面的明度层次。",
  clearGlass: "玻璃策略保持不变，仅保留实现核验。",
  smokedGlass: "玻璃策略保持不变，仅保留实现核验。"
};

function auditEffectiveValues(token: PbrMaterialToken, variant: AuditVariant, woodNormalStrength: number, woodRoughness: number) {
  const canonical = getPbrMaterialDefinition(token).definition;
  const normalStrength = token === "warmOak" && variant === "wood-4" ? woodNormalStrength
    : variant === "wood-1" ? canonical.normalStrength * 0.55
      : variant === "oakfloor-1" ? 0.13
        : variant === "oakfloor-2" ? 0.12
          : variant === "greystone-1" || variant === "greystone-2" ? 0.10
            : variant === "wet-tile-1" || variant === "wet-tile-2" ? 0.14
              : variant === "wall-1" ? 0.05
                : variant === "microcement-1" ? 0.09
                  : variant === "microcement-2" ? 0.11
                    : variant === "ceramic-1" ? 0.03
                      : variant === "fabric-1" ? 0.10
                        : variant === "fabric-2" ? 0.08
                          : variant === "metal-1" || variant === "metal-2" ? 0.06
                            : variant === "courtyard-1" ? 0.16
                              : variant === "courtyard-2" ? 0.14
                                : canonical.normalStrength;
  const roughness = token === "warmOak" && variant === "wood-4" ? woodRoughness
    : variant === "wood-3" ? Math.min(0.9, canonical.roughness + 0.08)
      : variant === "oakfloor-1" ? 0.74
        : variant === "oakfloor-2" ? 0.76
          : variant === "greystone-1" ? 0.45
            : variant === "greystone-2" ? 0.52
              : variant === "wet-tile-1" ? 0.86
                : variant === "wet-tile-2" ? 0.78
                  : variant === "microcement-1" ? 0.82
                    : variant === "microcement-2" ? 0.80
                      : variant === "ceramic-1" ? 0.32
                        : variant === "fabric-1" ? 0.92
                          : variant === "fabric-2" ? 0.95
                            : variant === "metal-1" ? 0.36
                              : variant === "metal-2" ? 0.42
                                : variant === "courtyard-1" ? 0.84
                                  : variant === "courtyard-2" ? 0.90
                                    : canonical.roughness;
  const clearcoat = variant === "ceramic-1" ? 0.12 : canonical.clearcoat ?? 0;
  const clearcoatRoughness = variant === "ceramic-1" ? 0.32 : canonical.clearcoatRoughness ?? 0;
  return {
    canonical,
    baseColor: canonical.baseColor,
    normalStrength,
    roughness,
    metalness: canonical.metalness,
    transmission: canonical.transmission ?? 0,
    thicknessMm: canonical.thicknessMm ?? null,
    ior: canonical.ior ?? null,
    clearcoat,
    clearcoatRoughness,
    textureScale: canonical.physicalSizeMm,
    colorVariation: AUDIT_VARIANT_STATS[variant].colorVariation
  };
}

function isVariantForToken(token: PbrMaterialToken, variant: AuditVariant) {
  return TOKEN_VARIANTS[token].includes(variant);
}

const AUDIT_VARIANT_LABELS: Record<AuditVariant, string> = {
  base: "基础 / canonical",
  "wood-1": "木材1 · 降低法线",
  "wood-2": "木材2 · 自然扰动",
  "wood-3": "木材3 · 扰动+提高粗糙度",
  "wood-4": "木材4 · 低对比分段",
  "stone-1": "洞石1 · 降低波纹",
  "stone-2": "洞石2 · 不连续色带",
  "stone-3": "洞石3 · 色带+孔洞分级",
  "stone-4": "洞石4 · 弱色带稀疏孔洞",
  "oakfloor-1": "候选1 · 弱化拼缝",
  "oakfloor-2": "候选2 · 稳定板间色差",
  "greystone-1": "候选1 · 降低高光",
  "greystone-2": "候选2 · 提高粗糙度",
  "wet-tile-1": "候选1 · 弱化填缝",
  "wet-tile-2": "候选2 · 柔和釉面",
  "wall-1": "候选1 · 低颗粒",
  "microcement-1": "候选1 · 低幅批刀纹",
  "microcement-2": "候选2 · 大尺度抹纹",
  "ceramic-1": "候选1 · 柔和釉面",
  "fabric-1": "候选1 · 弱化网格",
  "fabric-2": "候选2 · 纱线色差",
  "metal-1": "候选1 · 均匀拉丝",
  "metal-2": "候选2 · 提高粗糙度",
  "courtyard-1": "候选1 · 降低重复",
  "courtyard-2": "候选2 · 湿干斑驳"
};

function AuditEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    const generator = new THREE.PMREMGenerator(gl);
    const environment = new RoomEnvironment();
    const target = generator.fromScene(environment, 0.035);
    scene.environment = target.texture;
    scene.environmentIntensity = 0.35;
    scene.background = new THREE.Color("#7f817d");
    return () => {
      scene.environment = null;
      target.dispose();
      generator.dispose();
      environment.dispose();
    };
  }, [gl, scene]);
  return (
    <>
      <ambientLight intensity={0.18} color="#ffffff" />
      <directionalLight castShadow color="#ffffff" intensity={1} position={[2.4, 3.2, 1.6]} shadow-mapSize={[2048, 2048]} />
      <directionalLight color="#dbe6ff" intensity={0.15} position={[-2, 1.2, -1.6]} />
    </>
  );
}

function AuditRuntimeMetrics() {
  const { gl } = useThree();
  useEffect(() => {
    const publish = () => {
      (window as Window & { __PBR_AUDIT_METRICS__?: Record<string, number> }).__PBR_AUDIT_METRICS__ = {
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures
      };
    };
    publish();
    const timer = window.setInterval(publish, 250);
    return () => window.clearInterval(timer);
  }, [gl]);
  return null;
}

function FixedCamera({ angle, distance }: { angle: GlassAngle; distance: AuditViewDistance }) {
  const { camera } = useThree();
  useEffect(() => {
    const scale = distance === "firstPerson" ? 0.62 : 1;
    const pose = angle === "front" ? { position: [0.2 * scale, 1.05, 3.2 * scale] as [number, number, number], target: [0, 0.78, 0] as [number, number, number] }
      : angle === "grazing" ? { position: [3.7 * scale, 1.05, 0.42 * scale] as [number, number, number], target: [0, 0.78, 0] as [number, number, number] }
        : { position: [2.1 * scale, 1.4, 2.4 * scale] as [number, number, number], target: [0, 0.45, 0] as [number, number, number] };
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.near = 0.01;
    camera.far = 100;
    camera.updateProjectionMatrix();
  }, [angle, camera, distance]);
  return null;
}

function useLowAmplitudeHeight({ token, size = 256 }: { token: PbrMaterialToken; size?: number }) {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "rgb(128,128,128)";
    context.fillRect(0, 0, size, size);
    const lines = token === "oakFloor" || token === "warmOak" ? 18 : token === "wetAreaTile" ? 6 : 12;
    context.strokeStyle = "rgb(136,136,136)";
    context.lineWidth = 1;
    for (let index = 0; index < lines; index += 1) {
      const offset = (index + 0.5) * size / lines;
      context.beginPath();
      context.moveTo(0, offset);
      context.bezierCurveTo(size * 0.3, offset - 2, size * 0.7, offset + 2, size, offset);
      context.stroke();
    }
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.NoColorSpace;
    result.wrapS = THREE.RepeatWrapping;
    result.wrapT = THREE.RepeatWrapping;
    result.needsUpdate = true;
    return result;
  }, [size, token]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function auditNoise(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function useAuditColorVariant(token: PbrMaterialToken, variant: AuditVariant, size = 512) {
  return useMemo(() => {
    if (variant === "base" || !isVariantForToken(token, variant)) return null;
    if (typeof document === "undefined") return null;
    const definition = getPbrMaterialDefinition(token).definition;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = definition.baseColor;
    context.fillRect(0, 0, size, size);
    if (variant.startsWith("wood-")) {
      const quiet = variant === "wood-1";
      const candidate4 = variant === "wood-4";
      const lineCount = candidate4 ? 22 : quiet ? 24 : 34;
      for (let index = 0; index < lineCount; index += 1) {
        const x = (index + 0.5) * size / lineCount + (auditNoise(index, 3) - 0.5) * size / 18;
        const width = size * (candidate4 ? 0.0025 + auditNoise(index, 7) * 0.006 : 0.003 + auditNoise(index, 7) * 0.012);
        context.strokeStyle = index % 5 === 0 ? (candidate4 ? "rgba(85,51,29,.09)" : "rgba(85,51,29,.18)") : (candidate4 ? "rgba(250,234,205,.07)" : "rgba(250,234,205,.11)");
        context.lineWidth = width;
        const segments = candidate4 ? 3 : 1;
        for (let segment = 0; segment < segments; segment += 1) {
          const start = candidate4 ? (segment * 4 + 0.6 + auditNoise(index, segment + 81) * 1.1) / segments : 0;
          const end = candidate4 ? (segment * 4 + 3.2 + auditNoise(index, segment + 91) * 0.6) / segments : 12;
          context.beginPath();
          for (let step = Math.floor(start); step <= Math.ceil(end); step += 1) {
            const y = Math.min(size, Math.max(0, (step / 12) * size));
            const wander = (auditNoise(index * 13 + step, 11) - 0.5) * size * (candidate4 ? 0.024 : quiet ? 0.018 : 0.04);
            if (step === Math.floor(start)) context.moveTo(x + wander, y); else context.lineTo(x + wander, y);
          }
          context.stroke();
        }
      }
      if (variant !== "wood-1") {
        context.fillStyle = candidate4 ? "rgba(94,57,31,.025)" : "rgba(94,57,31,.055)";
        const bandCount = candidate4 ? 7 : 12;
        for (let band = 0; band < bandCount; band += 1) context.fillRect(0, (band + auditNoise(band, 4)) * size / bandCount, size, size * (candidate4 ? 0.008 : 0.015));
      }
    } else if (variant.startsWith("stone-")) {
      const discontinuous = variant === "stone-2" || variant === "stone-3" || variant === "stone-4";
      const candidate4 = variant === "stone-4";
      const bandCount = candidate4 ? 8 : 11;
      for (let band = 0; band < bandCount; band += 1) {
        const y = (band + 0.5) * size / bandCount;
        context.strokeStyle = candidate4 ? (band % 3 === 0 ? "rgba(102,78,50,.055)" : "rgba(255,248,232,.04)") : band % 3 === 0 ? "rgba(102,78,50,.10)" : "rgba(255,248,232,.08)";
        context.lineWidth = size * (candidate4 ? 0.0017 : variant === "stone-1" ? 0.004 : 0.0025);
        context.beginPath();
        for (let step = 0; step <= 16; step += 1) {
          const x = step * size / 16;
          const drift = (auditNoise(band * 17 + step, 19) - 0.5) * size * (candidate4 ? 0.038 : variant === "stone-1" ? 0.02 : 0.06);
          if (step === 0 || (discontinuous && step % (candidate4 ? 5 : 4) === 0)) context.moveTo(x, y + drift); else context.lineTo(x, y + drift);
        }
        context.stroke();
      }
      const pores = candidate4 ? 28 : variant === "stone-3" ? 80 : variant === "stone-2" ? 52 : 32;
      const clusterCount = candidate4 ? 6 : pores;
      for (let pore = 0; pore < pores; pore += 1) {
        const cluster = candidate4 ? pore % clusterCount : pore;
        const cx = candidate4 ? auditNoise(cluster, 131) * size : 0;
        const cy = candidate4 ? auditNoise(cluster, 143) * size : 0;
        const x = candidate4 ? cx + (auditNoise(pore, 31) - 0.5) * size * 0.12 : auditNoise(pore, 31) * size;
        const y = candidate4 ? cy + (auditNoise(pore, 43) - 0.5) * size * 0.12 : auditNoise(pore, 43) * size;
        const radius = size * (candidate4 ? 0.0015 + auditNoise(pore, 53) * 0.0045 : 0.002 + auditNoise(pore, 53) * (variant === "stone-3" ? 0.016 : 0.008));
        context.fillStyle = candidate4 ? "rgba(86,67,47,.055)" : pore % 3 === 0 ? "rgba(86,67,47,.12)" : "rgba(255,248,230,.12)";
        context.beginPath();
        context.ellipse(x, y, radius * 1.8, radius, auditNoise(pore, 61) * Math.PI, 0, Math.PI * 2);
        context.fill();
      }
    } else {
      // The nine-material pass deliberately keeps all candidates local to this
      // page. These deterministic overlays change only the audit color map;
      // canonical maps and material definitions remain untouched.
      const candidate = variant;
      const drawLowFrequency = (count: number, alpha: number, light = false) => {
        for (let index = 0; index < count; index += 1) {
          const x = auditNoise(index, 101) * size;
          const y = auditNoise(index, 113) * size;
          const width = size * (0.06 + auditNoise(index, 127) * 0.20);
          const height = size * (0.012 + auditNoise(index, 139) * 0.04);
          context.fillStyle = light ? `rgba(255,248,232,${alpha})` : `rgba(74,62,48,${alpha})`;
          context.save();
          context.translate(x, y);
          context.rotate((auditNoise(index, 149) - 0.5) * 0.25);
          context.fillRect(-width / 2, -height / 2, width, height);
          context.restore();
        }
      };
      if (token === "oakFloor") {
        // Keep the canonical 190×1800 mm module visible, but soften the
        // overly even grid and add stable board-to-board color variation.
        const columns = 6;
        const rows = 2;
        context.strokeStyle = candidate === "oakfloor-1" ? "rgba(65,43,27,.20)" : "rgba(65,43,27,.28)";
        context.lineWidth = Math.max(1, size / 680);
        for (let column = 0; column <= columns; column += 1) {
          const x = column * size / columns;
          context.beginPath(); context.moveTo(x, 0); context.lineTo(x, size); context.stroke();
        }
        for (let row = 0; row <= rows; row += 1) {
          const y = row * size / rows;
          context.beginPath(); context.moveTo(0, y); context.lineTo(size, y); context.stroke();
        }
        const boards = candidate === "oakfloor-1" ? 12 : 18;
        for (let board = 0; board < boards; board += 1) {
          const x = auditNoise(board, 161) * size;
          const start = auditNoise(board, 173) * size;
          const length = size * (0.12 + auditNoise(board, 181) * 0.24);
          context.strokeStyle = board % 4 === 0 ? "rgba(92,58,32,.08)" : "rgba(255,239,211,.06)";
          context.lineWidth = size * (0.0018 + auditNoise(board, 191) * 0.003);
          context.beginPath(); context.moveTo(x, start); context.lineTo(x + (auditNoise(board, 197) - 0.5) * size * 0.025, Math.min(size, start + length)); context.stroke();
        }
      } else if (token === "warmGreyStone") {
        drawLowFrequency(candidate === "greystone-1" ? 18 : 28, candidate === "greystone-1" ? 0.035 : 0.05);
        drawLowFrequency(candidate === "greystone-1" ? 10 : 16, 0.028, true);
      } else if (token === "wetAreaTile") {
        // Candidate keeps the canonical 300×600 module, changing only grout
        // contrast and glaze variation in this map.
        context.strokeStyle = candidate === "wet-tile-1" ? "rgba(74,65,55,.20)" : "rgba(74,65,55,.28)";
        context.lineWidth = Math.max(1, size / 620);
        for (let column = 0; column <= 4; column += 1) { const x = column * size / 4; context.beginPath(); context.moveTo(x, 0); context.lineTo(x, size); context.stroke(); }
        for (let row = 0; row <= 2; row += 1) { const y = row * size / 2; context.beginPath(); context.moveTo(0, y); context.lineTo(size, y); context.stroke(); }
        drawLowFrequency(candidate === "wet-tile-1" ? 12 : 20, candidate === "wet-tile-1" ? 0.025 : 0.04, true);
      } else if (token === "warmWhiteMineral") {
        drawLowFrequency(12, 0.014, true);
        drawLowFrequency(10, 0.012);
      } else if (token === "microCement") {
        drawLowFrequency(candidate === "microcement-1" ? 16 : 26, candidate === "microcement-1" ? 0.028 : 0.038);
        drawLowFrequency(candidate === "microcement-1" ? 10 : 16, 0.022, true);
      } else if (token === "warmWhiteCeramic") {
        drawLowFrequency(14, 0.012, true);
        drawLowFrequency(8, 0.008);
      } else if (token === "beigeFabric") {
        const density = candidate === "fabric-1" ? 20 : 30;
        for (let index = 0; index < density; index += 1) {
          const y = (index + 0.5) * size / density + (auditNoise(index, 211) - 0.5) * size * 0.02;
          context.strokeStyle = index % 3 ? "rgba(255,255,255,.045)" : "rgba(76,62,50,.04)";
          context.lineWidth = Math.max(1, size / 460);
          context.beginPath(); context.moveTo(0, y); context.bezierCurveTo(size * 0.35, y + size * 0.012, size * 0.68, y - size * 0.012, size, y); context.stroke();
        }
      } else if (token === "blackTitanium") {
        const density = candidate === "metal-1" ? 96 : 140;
        for (let index = 0; index < density; index += 1) {
          const x = index * size / density;
          context.fillStyle = index % 7 === 0 ? "rgba(255,255,255,.07)" : "rgba(18,18,18,.035)";
          context.fillRect(x, 0, Math.max(1, size / 560), size);
        }
      } else if (token === "courtyardStone") {
        context.strokeStyle = candidate === "courtyard-1" ? "rgba(58,52,45,.24)" : "rgba(58,52,45,.32)";
        context.lineWidth = Math.max(1, size / 400);
        for (let column = 0; column <= 2; column += 1) { const x = column * size / 2; context.beginPath(); context.moveTo(x, 0); context.lineTo(x, size); context.stroke(); }
        for (let row = 0; row <= 2; row += 1) { const y = row * size / 2; context.beginPath(); context.moveTo(0, y); context.lineTo(size, y); context.stroke(); }
        drawLowFrequency(candidate === "courtyard-1" ? 22 : 34, candidate === "courtyard-1" ? 0.04 : 0.06);
        drawLowFrequency(12, 0.035, true);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }, [size, token, variant]);
}

function MaterialSurface({ token, mode, shape, quality, device, variant, glassThickness, woodNormalStrength, woodRoughness }: { token: PbrMaterialToken; mode: AuditMode; shape: AuditShape; quality: MaterialQualityTier; device: MaterialDeviceClass; variant: AuditVariant; glassThickness: GlassThickness; woodNormalStrength: number; woodRoughness: number }) {
  const definition = getPbrMaterialDefinition(token).definition;
  const maps = useProceduralPbrMaps({
    kind: token === "blackTitanium" ? "metal" : token === "beigeFabric" ? "fabric" : token === "clearGlass" ? "glass" : token === "warmOak" || token === "oakFloor" ? "wood" : token === "warmWhiteMineral" ? "wall" : token === "microCement" ? "microcement" : token === "warmWhiteCeramic" || token === "wetAreaTile" ? "ceramic" : "stone",
    token,
    baseColor: definition.baseColor,
    accentColor: definition.accentColor,
    repeat: [1, 1],
    rotation: 0,
    quality,
    device,
    canonicalTransform: true,
    neutralColor: true
  });
  const variantMap = useAuditColorVariant(token, variant);
  useEffect(() => () => variantMap?.dispose(), [variantMap]);
  const slabVariantMap = useMemo(() => {
    if (!variantMap) return null;
    const clone = variantMap.clone();
    clone.offset.set(0.37, 0.19);
    clone.needsUpdate = true;
    return clone;
  }, [variantMap]);
  useEffect(() => () => slabVariantMap?.dispose(), [slabVariantMap]);
  const candidateHeight = useLowAmplitudeHeight({ token });
  const useLegacy = mode === "legacy";
  const useNoHeight = mode === "height-b";
  const useCandidateHeight = mode === "height-c";
  const map = useLegacy ? null : variantMap ?? maps?.map;
  const roughnessMap = useLegacy ? null : maps?.roughnessMap;
  const normalMap = useLegacy ? null : maps?.normalMap;
  const aoMap = useLegacy ? null : maps?.aoMap;
  // The normal candidate path never reconnects the synthesized Roughness/AO
  // height. Height A/B/C remain explicit audit-only comparisons.
  const bumpMap = useCandidateHeight ? candidateHeight : mode === "height-a" ? maps?.bumpMap : null;
  const { normalStrength: variantNormalStrength, roughness: variantRoughness } = auditEffectiveValues(token, variant, woodNormalStrength, woodRoughness);
  const common = {
    // The candidate canvas already contains the canonical sRGB base color;
    // keep material color white so it is not multiplied a second time.
    color: variantMap ? "#ffffff" : definition.baseColor,
    map,
    normalMap,
    roughnessMap,
    aoMap,
    bumpMap,
    bumpScale: useCandidateHeight ? 0.00022 : mode === "height-a" ? (definition.heightScaleMm ?? 0) / 1000 : 0,
    normalScale: new THREE.Vector2(variantNormalStrength, variantNormalStrength),
    roughness: variantRoughness,
    metalness: definition.metalness,
    clearcoat: variant === "ceramic-1" ? 0.12 : definition.clearcoat ?? 0,
    clearcoatRoughness: variant === "ceramic-1" ? 0.32 : definition.clearcoatRoughness ?? 0,
    transparent: definition.family === "glass",
    opacity: definition.family === "glass" ? 0.72 : 1,
    transmission: definition.family === "glass" ? 0.95 : 0,
    thickness: (definition.thicknessMm ?? 12) / 1000,
    ior: definition.ior ?? 1.5,
    envMapIntensity: definition.family === "glass" || definition.family === "metal" ? 1 : 0.72
  };
  const usePhysical = quality === "presentation" && (definition.family === "glass" || (definition.clearcoat ?? 0) > 0);
  const material = (mode === "new" || mode.startsWith("height-")) && usePhysical ? (
    <meshPhysicalMaterial {...common} />
  ) : (
    <meshStandardMaterial color={common.color} map={common.map ?? undefined} normalMap={common.normalMap ?? undefined} roughnessMap={common.roughnessMap ?? undefined} aoMap={common.aoMap ?? undefined} bumpMap={common.bumpMap ?? undefined} bumpScale={common.bumpScale} normalScale={common.normalScale} roughness={common.roughness} metalness={common.metalness} transparent={common.transparent} opacity={common.opacity} envMapIntensity={common.envMapIntensity} />
  );
  const slabMaterial = slabVariantMap ? (usePhysical ? <meshPhysicalMaterial {...common} map={slabVariantMap} /> : <meshStandardMaterial color={common.color} map={slabVariantMap} normalMap={common.normalMap ?? undefined} roughnessMap={common.roughnessMap ?? undefined} aoMap={common.aoMap ?? undefined} bumpMap={common.bumpMap ?? undefined} bumpScale={common.bumpScale} normalScale={common.normalScale} roughness={common.roughness} metalness={common.metalness} transparent={common.transparent} opacity={common.opacity} envMapIntensity={common.envMapIntensity} />) : material;
  if (shape === "sphere") return <mesh castShadow receiveShadow>{<sphereGeometry args={[0.5, 96, 64]} />}{material}</mesh>;
  if (shape === "plane") return <mesh castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>{<planeGeometry args={[1.2, 1.2, 1, 1]} />}{material}</mesh>;
  if (shape === "corner") return <group><mesh castShadow receiveShadow position={[0, 0.6, -0.6]}>{<boxGeometry args={[1.2, 1.2, 0.04]} />}{material}</mesh><mesh castShadow receiveShadow position={[-0.6, 0.6, 0]} rotation={[0, Math.PI / 2, 0]}>{<boxGeometry args={[1.2, 1.2, 0.04]} />}{material}</mesh><mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>{<planeGeometry args={[1.2, 1.2]} />}{material}</mesh></group>;
  if (shape === "cabinet") return <group>{[-0.62, 0, 0.62].map((x, index) => <mesh key={index} castShadow receiveShadow position={[x, 0.72, 0]}><boxGeometry args={[0.56, 1.44, 0.08]} />{material}</mesh>)}</group>;
  if (shape === "slabs") return <group>{[-0.82, 0.82].map((x, index) => <mesh key={index} castShadow receiveShadow position={[x, 0.7, 0]}><boxGeometry args={[1.55, 1.4, 0.045]} />{index === 1 ? slabMaterial : material}</mesh>)}<mesh position={[0, 0.7, 0.03]}><boxGeometry args={[0.025, 1.42, 0.02]} /><meshStandardMaterial color="#514b42" roughness={0.85} /></mesh></group>;
  if (shape === "counter") return <group><mesh castShadow receiveShadow position={[0, 0.82, 0]}><boxGeometry args={[2.8, 0.12, 1.1]} />{material}</mesh><mesh castShadow receiveShadow position={[0, 0.36, -0.42]}><boxGeometry args={[2.6, 0.8, 0.08]} />{material}</mesh><mesh castShadow receiveShadow position={[0, 0.36, 0.42]}><boxGeometry args={[2.6, 0.8, 0.08]} />{material}</mesh></group>;
  if (shape === "glass") return <group><mesh position={[0, 0.78, -0.4]}><boxGeometry args={[2.2, 1.7, 0.02]} /><meshStandardMaterial color="#d8d8d8" roughness={0.92} /></mesh><mesh position={[-0.78, 0.78, -0.25]}><boxGeometry args={[0.18, 0.42, 0.18]} /><meshStandardMaterial color="#d34d4d" roughness={0.42} /></mesh><mesh position={[0.62, 0.58, -0.18]}><boxGeometry args={[0.28, 0.74, 0.28]} /><meshStandardMaterial color="#3973c7" roughness={0.5} /></mesh><mesh position={[0, 0.78, 0]}><boxGeometry args={[1.9, 1.5, glassThickness === "thick" ? 0.06 : 0.016]} />{material}</mesh><mesh position={[-0.98, 0.78, 0.02]}><boxGeometry args={[0.06, 1.62, 0.08]} /><meshStandardMaterial color="#242525" metalness={0.72} roughness={0.3} /></mesh><mesh position={[0.98, 0.78, 0.02]}><boxGeometry args={[0.06, 1.62, 0.08]} /><meshStandardMaterial color="#242525" metalness={0.72} roughness={0.3} /></mesh><mesh position={[0, 1.58, 0.02]}><boxGeometry args={[2.02, 0.06, 0.08]} /><meshStandardMaterial color="#242525" metalness={0.72} roughness={0.3} /></mesh><mesh position={[0, -0.02, 0.02]}><boxGeometry args={[2.02, 0.06, 0.08]} /><meshStandardMaterial color="#242525" metalness={0.72} roughness={0.3} /></mesh></group>;
  if (shape === "formal") return <group><mesh castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><boxGeometry args={[3.6, 2.8, 0.05]} /><PbrMaterial token="oakFloor" fallbackRole="floorMain" surfaceSizeM={[3.6, 2.8]} /></mesh><mesh castShadow receiveShadow position={[0, 1.4, -1.35]}><boxGeometry args={[3.6, 2.8, 0.05]} /><PbrMaterial token="warmWhiteMineral" fallbackRole="wallBase" surfaceSizeM={[3.6, 2.8]} /></mesh><mesh castShadow receiveShadow position={[-1.15, 1.2, -1.31]}><boxGeometry args={[1.0, 2.3, 0.055]} />{token === "warmOak" || token === "travertine" ? material : <PbrMaterial token="travertine" fallbackRole="wallFeature" surfaceSizeM={[1, 2.3]} />}</mesh><mesh castShadow receiveShadow position={[0.85, 0.92, -1.22]}><boxGeometry args={[1.55, 0.12, 0.72]} />{token === "warmOak" || token === "travertine" ? material : <PbrMaterial token="travertine" fallbackRole="countertop" surfaceSizeM={[1.55, 0.72]} />}</mesh><mesh castShadow receiveShadow position={[0.85, 0.43, -1.18]}><boxGeometry args={[1.38, 0.82, 0.06]} />{token === "warmOak" ? material : <PbrMaterial token="warmOak" fallbackRole="joineryMain" surfaceSizeM={[1.38, 0.82]} />}</mesh><mesh position={[1.38, 1.16, -1.12]}><boxGeometry args={[0.04, 1.55, 0.75]} />{token === "clearGlass" ? material : <PbrMaterial token="clearGlass" fallbackRole="glassMain" surfaceSizeM={[0.75, 1.55]} />}</mesh><mesh position={[1.38, 1.16, -1.08]}><boxGeometry args={[0.06, 1.62, 0.08]} /><PbrMaterial token="blackTitanium" fallbackRole="trimMetal" surfaceSizeM={[0.08, 1.62]} /></mesh></group>;
  return <group><mesh castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><boxGeometry args={[2.8, 2.2, 0.04]} /><PbrMaterial token="oakFloor" fallbackRole="floorMain" surfaceSizeM={[2.8, 2.2]} /></mesh><mesh castShadow receiveShadow position={[0, 1.25, -1.08]}><boxGeometry args={[2.8, 2.5, 0.04]} /><PbrMaterial token="warmWhiteMineral" fallbackRole="wallBase" surfaceSizeM={[2.8, 2.5]} /></mesh><mesh castShadow receiveShadow position={[0.68, 0.45, 0.12]}><boxGeometry args={[0.9, 0.9, 0.6]} /><PbrMaterial token={token} fallbackRole="joineryMain" surfaceSizeM={[0.9, 0.9]} /></mesh><mesh castShadow receiveShadow position={[-0.35, 0.35, 0.2]}><sphereGeometry args={[0.42, 48, 32]} /><PbrMaterial token={token} fallbackRole="fabricMain" surfaceSizeM={[0.8, 0.8]} /></mesh></group>;
}

export default function PbrAuditPage() {
  const [token, setToken] = useState<PbrMaterialToken>("oakFloor");
  const [shape, setShape] = useState<AuditShape>("sphere");
  const [mode, setMode] = useState<AuditMode>("new");
  const [quality, setQuality] = useState<MaterialQualityTier>("standard");
  const [variant, setVariant] = useState<AuditVariant>("base");
  const [glassAngle, setGlassAngle] = useState<GlassAngle>("45");
  const [glassThickness, setGlassThickness] = useState<GlassThickness>("thin");
  const [woodNormalStrength, setWoodNormalStrength] = useState<number>(0.10);
  const [woodRoughness, setWoodRoughness] = useState<number>(0.70);
  const [viewDistance, setViewDistance] = useState<AuditViewDistance>("normal");
  const [compare, setCompare] = useState(true);
  const device: MaterialDeviceClass = typeof window !== "undefined" && window.innerWidth < 700 ? "mobile" : "desktop";
  useEffect(() => {
    if (!isVariantForToken(token, variant)) setVariant("base");
  }, [token, variant]);
  const definition = getPbrMaterialDefinition(token).definition;
  const effective = auditEffectiveValues(token, variant, woodNormalStrength, woodRoughness);
  const renderViewport = (viewportMode: AuditMode, title: string, viewportVariant: AuditVariant = variant) => (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-[#7f817d] shadow-sm">
      <PbrQualityProvider quality={quality} device={device}>
        <Canvas shadows dpr={[1, 1]} camera={{ position: [2.1, 1.4, 2.4], fov: 38 }} gl={{ antialias: true, alpha: false }}>
          <FixedCamera angle={shape === "glass" ? glassAngle : "45"} distance={viewDistance} /><AuditEnvironment /><AuditRuntimeMetrics /><MaterialSurface token={token} mode={viewportMode} shape={shape} quality={quality} device={device} variant={viewportVariant} glassThickness={glassThickness} woodNormalStrength={woodNormalStrength} woodRoughness={woodRoughness} />
        </Canvas>
      </PbrQualityProvider>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/65 px-3 py-2 text-[11px] text-white">{title} · {TOKEN_LABELS[token]} · {shape} · {quality} · {AUDIT_VARIANT_STATS[viewportVariant].label}</div>
    </div>
  );
  return (
    <main className="min-h-screen bg-stone-200 p-4 text-stone-900">
      <header className="mx-auto mb-3 max-w-7xl rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">PBR Visual Validation</p><h1 className="text-xl font-semibold">隔离材质验收页</h1><p className="mt-1 text-xs text-stone-500">不修改正式场景；固定 ACES / 曝光 1.0 / 中性 RoomEnvironment / 5500K 斜射光。</p></div>
          <div className="rounded-lg bg-stone-100 px-3 py-2 text-[10px] text-stone-600">1024×1024 · standard/{device} · 无 Bloom / DOF</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="text-xs">材质<select className="ml-1 rounded border p-1" value={token} onChange={(event) => setToken(event.target.value as PbrMaterialToken)}>{TOKENS.map((item) => <option key={item} value={item}>{TOKEN_LABELS[item]}</option>)}</select></label>
          <label className="text-xs">形态<select className="ml-1 rounded border p-1" value={shape} onChange={(event) => setShape(event.target.value as AuditShape)}><option value="sphere">材质球</option><option value="plane">平面近景</option><option value="cabinet">600×2400柜门</option><option value="corner">转角近景</option><option value="slabs">相邻大板</option><option value="counter">台面</option><option value="glass">玻璃窗框测试</option><option value="scene">场景代理</option><option value="formal">正式户型机位代理</option></select></label>
          <label className="text-xs">实现<select className="ml-1 rounded border p-1" value={mode} onChange={(event) => setMode(event.target.value as AuditMode)}><option value="new">候选 PBR</option><option value="legacy">旧标量实现</option><option value="height-a">Height A · 旧合成</option><option value="height-b">Height B · 关闭</option><option value="height-c">Height C · 独立低幅</option></select></label>
          <label className="text-xs">质量<select className="ml-1 rounded border p-1" value={quality} onChange={(event) => setQuality(event.target.value as MaterialQualityTier)}><option value="draft">draft</option><option value="standard">standard</option><option value="presentation">presentation</option></select></label>
          <label className="text-xs">候选<select className="ml-1 rounded border p-1" value={variant} onChange={(event) => setVariant(event.target.value as AuditVariant)}>{TOKEN_VARIANTS[token].map((item) => <option key={item} value={item}>{AUDIT_VARIANT_LABELS[item]}</option>)}</select></label>
          <label className="text-xs">木材4法线<select className="ml-1 rounded border p-1" value={woodNormalStrength} onChange={(event) => setWoodNormalStrength(Number(event.target.value))}><option value="0.08">0.08</option><option value="0.10">0.10</option><option value="0.12">0.12</option></select></label>
          <label className="text-xs">木材4粗糙度<select className="ml-1 rounded border p-1" value={woodRoughness} onChange={(event) => setWoodRoughness(Number(event.target.value))}><option value="0.66">0.66</option><option value="0.70">0.70</option><option value="0.74">0.74</option></select></label>
          <label className="text-xs">观看距离<select className="ml-1 rounded border p-1" value={viewDistance} onChange={(event) => setViewDistance(event.target.value as AuditViewDistance)}><option value="normal">正常观看距离</option><option value="firstPerson">第一人称近景</option></select></label>
          <label className="text-xs">玻璃角度<select className="ml-1 rounded border p-1" value={glassAngle} onChange={(event) => setGlassAngle(event.target.value as GlassAngle)}><option value="front">正面</option><option value="45">45°</option><option value="grazing">掠射</option></select></label>
          <label className="text-xs">玻璃厚度<select className="ml-1 rounded border p-1" value={glassThickness} onChange={(event) => setGlassThickness(event.target.value as GlassThickness)}><option value="thin">薄片</option><option value="thick">有厚度</option></select></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={compare} onChange={(event) => setCompare(event.target.checked)} />并排对照</label>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className={compare ? "grid gap-3 md:grid-cols-2" : ""}>
          {compare ? <>{renderViewport(mode === "height-b" || mode === "height-c" ? "height-a" : "new", mode === "height-b" || mode === "height-c" ? "A · 当前合成 Height" : "Canonical 原始", "base")} {renderViewport(mode, mode === "new" ? "候选有效值" : mode === "height-b" ? "B · 关闭 Height" : mode === "height-c" ? "C · 独立低幅 Height" : "候选/选择实现")}</> : renderViewport(mode, "当前选择")}
        </div>
        <aside className="rounded-xl bg-white p-4 text-xs shadow-sm">
          <h2 className="font-semibold">PBR 参数：原始 / 候选有效值 / 差值</h2>
          <dl className="mt-3 space-y-2">
            <div><dt className="text-stone-400">Base Color</dt><dd>{definition.baseColor} → {effective.baseColor} · Δ 0（候选仅改程序纹理）</dd></div>
            <div><dt className="text-stone-400">程序纹理颜色变化幅度</dt><dd>{effective.colorVariation} · {AUDIT_VARIANT_STATS[variant].note}</dd></div>
            <div><dt className="text-stone-400">Normal Strength</dt><dd>{definition.normalStrength.toFixed(2)} → {effective.normalStrength.toFixed(2)} · Δ {(effective.normalStrength - definition.normalStrength).toFixed(2)}</dd></div>
            <div><dt className="text-stone-400">Roughness / Metallic</dt><dd>{definition.roughness.toFixed(2)} / {definition.metalness.toFixed(2)} → {effective.roughness.toFixed(2)} / {effective.metalness.toFixed(2)} · Δ {(effective.roughness - definition.roughness).toFixed(2)} / 0</dd></div>
            <div><dt className="text-stone-400">Clearcoat</dt><dd>{(definition.clearcoat ?? 0).toFixed(2)} / {(definition.clearcoatRoughness ?? 0).toFixed(2)} → {effective.clearcoat.toFixed(2)} / {effective.clearcoatRoughness.toFixed(2)} · Δ {(effective.clearcoat - (definition.clearcoat ?? 0)).toFixed(2)}</dd></div>
            <div><dt className="text-stone-400">纹理真实尺度 / UV</dt><dd>{definition.physicalSizeMm[0]}×{definition.physicalSizeMm[1]} mm · scale {definition.uv.scale.join("×")} · {definition.direction}</dd></div>
            <div><dt className="text-stone-400">Height</dt><dd>{definition.heightScaleMm ?? "—"} mm · 正式场景：未连接合成 Bump</dd></div>
            <div><dt className="text-stone-400">玻璃 IOR / Thickness</dt><dd>{definition.ior ?? "—"} / {definition.thicknessMm ?? "—"} mm · 实际 Physical 仅 presentation</dd></div>
            <div><dt className="text-stone-400">Attenuation</dt><dd>attenuationColor：未配置；attenuationDistance：未配置（未伪造为已生效）</dd></div>
            <div><dt className="text-stone-400">玻璃几何核验</dt><dd>有厚度 = 封闭 boxGeometry（{glassThickness === "thick" ? "60" : "16"} mm）；非重叠双平面</dd></div>
            <div><dt className="text-stone-400">Channels</dt><dd className="break-words">{Object.entries(definition.channels).filter(([, value]) => value).map(([key]) => key).join(", ")}</dd></div>
          </dl>
          <p className="mt-3 rounded bg-stone-100 p-2 text-[10px] leading-4 text-stone-600">{AUDIT_CANDIDATE_NOTES[token]}</p>
          <p className="mt-4 rounded bg-amber-50 p-2 text-[10px] leading-4 text-amber-800">Height A/B/C、木材4、洞石4和玻璃角度/厚度均只在本页渲染，不会替换正式场景。正式户型机位为验收代理组合，不改变户型数据。</p>
        </aside>
      </section>
    </main>
  );
}
