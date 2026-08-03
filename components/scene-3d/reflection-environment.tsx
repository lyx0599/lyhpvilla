"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type SharedReflectionEntry = {
  target: THREE.WebGLRenderTarget;
  refs: number;
  releaseTimer: ReturnType<typeof setTimeout> | null;
};

const reflectionCache = new WeakMap<THREE.WebGLRenderer, SharedReflectionEntry>();
let pmremGenerationCount = 0;

function disposeRoomEnvironment(environment: RoomEnvironment) {
  environment.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material?.dispose();
  });
}

function acquireReflectionEnvironment(gl: THREE.WebGLRenderer) {
  const cached = reflectionCache.get(gl);
  if (cached) {
    if (cached.releaseTimer) clearTimeout(cached.releaseTimer);
    cached.releaseTimer = null;
    cached.refs += 1;
    return cached;
  }

  const generator = new THREE.PMREMGenerator(gl);
  generator.compileEquirectangularShader();
  const environment = new RoomEnvironment();
  const target = generator.fromScene(environment, 0.035);
  disposeRoomEnvironment(environment);
  generator.dispose();
  const entry: SharedReflectionEntry = { target, refs: 1, releaseTimer: null };
  reflectionCache.set(gl, entry);
  pmremGenerationCount += 1;
  return entry;
}

function releaseReflectionEnvironment(gl: THREE.WebGLRenderer, entry: SharedReflectionEntry) {
  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs > 0 || entry.releaseTimer) return;
  entry.releaseTimer = setTimeout(() => {
    entry.releaseTimer = null;
    if (entry.refs > 0) return;
    entry.target.dispose();
    reflectionCache.delete(gl);
  }, 1500);
}

export function SceneReflectionEnvironment({ presentationMode, intensity }: { presentationMode: boolean; intensity?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const entry = acquireReflectionEnvironment(gl);
    const previousEnvironment = scene.environment;
    scene.environment = entry.target.texture;
    return () => {
      scene.environment = previousEnvironment;
      releaseReflectionEnvironment(gl, entry);
    };
  }, [gl, scene]);

  useEffect(() => {
    scene.environmentIntensity = intensity ?? (presentationMode ? 0.72 : 0.46);
  }, [intensity, presentationMode, scene]);

  return null;
}

export function getReflectionEnvironmentStats() {
  return {
    pmremGenerations: pmremGenerationCount
  };
}
