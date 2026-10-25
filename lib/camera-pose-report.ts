export type ReportedCameraPose = {
  cameraX: number;
  cameraY?: number;
  cameraZ: number;
  targetX: number;
  targetY?: number;
  targetZ: number;
  fov?: number;
};

/** Only the UI snapshot is throttled; OrbitControls still updates every frame. */
export function cameraPoseChanged(previous: ReportedCameraPose | null, next: ReportedCameraPose) {
  if (!previous) return true;
  const coordinates = ["cameraX", "cameraY", "cameraZ", "targetX", "targetY", "targetZ"] as const;
  return coordinates.some((key) => {
    const a = previous[key], b = next[key];
    return a === undefined || b === undefined ? a !== b : Math.abs(a - b) > 0.0001;
  }) || Math.abs((previous.fov ?? 42) - (next.fov ?? 42)) > 0.001;
}
