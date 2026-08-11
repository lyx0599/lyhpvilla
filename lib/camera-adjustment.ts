import type { CameraOrbitConstraints } from "./camera-composition.ts";

export type AdjustableCameraPose = {
  cameraPosition: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
};

export type CameraAdjustment =
  | { action: "orbit"; yawDelta?: number; pitchDelta?: number }
  | { action: "zoom"; zoomFactor: number }
  | { action: "pan"; panX?: number; panY?: number }
  | { action: "setFov"; fov: number }
  | { action: "setHeight"; height: number };

type Vec3 = { x: number; y: number; z: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function length(vector: Vec3) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(vector: Vec3, amount: number): Vec3 {
  return { x: vector.x * amount, y: vector.y * amount, z: vector.z * amount };
}

function normalize(vector: Vec3): Vec3 {
  const magnitude = Math.max(0.000001, length(vector));
  return scale(vector, 1 / magnitude);
}

/**
 * Pure camera fine-tuning. It deliberately keeps the focus stable unless the
 * user asks for a bounded pan; scene collision is applied by the caller.
 */
export function adjustCameraPose(
  pose: AdjustableCameraPose,
  adjustment: CameraAdjustment,
  constraints?: CameraOrbitConstraints | null
): AdjustableCameraPose {
  const next: AdjustableCameraPose = {
    cameraPosition: { ...pose.cameraPosition },
    target: { ...pose.target },
    fov: pose.fov
  };
  if (adjustment.action === "setFov") {
    next.fov = clamp(adjustment.fov, 28, 72);
    return next;
  }
  if (adjustment.action === "setHeight") {
    const nextHeight = clamp(adjustment.height, 0.65, 16);
    const delta = nextHeight - next.cameraPosition.y;
    next.cameraPosition.y = nextHeight;
    next.target.y += delta;
    return next;
  }
  const offset = subtract(next.cameraPosition, next.target);
  if (adjustment.action === "zoom") {
    const distance = clamp(
      length(offset) * adjustment.zoomFactor,
      constraints?.minDistance ?? 0.5,
      constraints?.maxDistance ?? 18
    );
    next.cameraPosition = add(next.target, scale(normalize(offset), distance));
    return next;
  }
  if (adjustment.action === "pan") {
    const horizontal = normalize({ x: offset.z, y: 0, z: -offset.x });
    let delta = add(scale(horizontal, adjustment.panX ?? 0), { x: 0, y: adjustment.panY ?? 0, z: 0 });
    const maxPan = constraints?.maxTargetOffset ?? 1;
    if (length(delta) > maxPan) delta = scale(normalize(delta), maxPan);
    next.cameraPosition = add(next.cameraPosition, delta);
    next.target = add(next.target, delta);
    return next;
  }
  const distance = Math.max(0.000001, length(offset));
  const theta = Math.atan2(offset.x, offset.z) + (adjustment.yawDelta ?? 0);
  const currentPhi = Math.acos(clamp(offset.y / distance, -1, 1));
  const phi = clamp(
    currentPhi + (adjustment.pitchDelta ?? 0),
    constraints?.minPolarAngle ?? Math.PI * 0.16,
    constraints?.maxPolarAngle ?? Math.PI * 0.72
  );
  next.cameraPosition = add(next.target, {
    x: Math.sin(phi) * Math.sin(theta) * distance,
    y: Math.cos(phi) * distance,
    z: Math.sin(phi) * Math.cos(theta) * distance
  });
  return next;
}

export function cameraPoseDistance(pose: AdjustableCameraPose) {
  return length(subtract(pose.cameraPosition, pose.target));
}
