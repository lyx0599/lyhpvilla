import { CylinderGeometry } from "three";

/** One UV unit = one metre, on both the curved side and the flat end caps. */
export function createMetricCylinderGeometry(radiusTop: number, radiusBottom: number, height: number, sides: number) {
  const geometry = new CylinderGeometry(radiusTop, radiusBottom, height, sides);
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  const circumference = Math.PI * (radiusTop + radiusBottom);
  for (let index = 0; index < uv.count; index += 1) {
    // Cap vertices have a vertical normal and separate UVs from the side.
    if (Math.abs(normal.getY(index)) > 0.9999) {
      uv.setXY(index, position.getX(index), position.getZ(index));
    } else {
      uv.setXY(index, uv.getX(index) * circumference, uv.getY(index) * height);
    }
  }
  uv.needsUpdate = true;
  return geometry;
}
