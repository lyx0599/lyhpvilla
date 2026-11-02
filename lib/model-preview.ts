import { createUnifiedCourtyardModel } from "./courtyard-model.ts";
import { PerspectiveCamera, Vector3 } from "three";
import { composeCameraView, compositionToFixedView, getStructureCameraBounds } from "./camera-composition.ts";
import type { CameraViewport } from "./camera-composition.ts";
import type { FixedCameraView, FloorId, Furniture, HouseStructure } from "../types/space";

export const modelPreviewFloors = ["B2", "B1", "1F", "2F", "YARD"] as const;

export const modelPreviewLabels: Record<FloorId, { title: string; subtitle: string }> = {
  B2: { title: "B2 实时预览", subtitle: "观影、聚会与书房" },
  B1: { title: "B1 实时预览", subtitle: "阅读、家政房与洗衣" },
  "1F": { title: "1F 实时预览", subtitle: "客餐厅、厨房与日常生活" },
  "2F": { title: "2F 实时预览", subtitle: "卧室、衣帽间与卫浴" },
  YARD: { title: "院子实时预览", subtitle: "南院生活 · 北院烧烤" }
};

export function resolveModelPreviewFloor(value: string | null): FloorId {
  return modelPreviewFloors.find((id) => id === value) ?? "1F";
}

export function getModelPreviewScene(floorId: FloorId, structures: Record<FloorId, HouseStructure>, furniture: Furniture[]) {
  if (floorId === "YARD") {
    const merged = createUnifiedCourtyardModel({
      oneFloorStructure: structures["1F"],
      yardStructure: structures.YARD,
      furniture: furniture.filter((item) => item.floorId === "YARD" || item.floorId === "1F")
    });
    return { structure: { ...merged.houseStructure, floorId }, furniture: merged.furniture };
  }
  return { structure: structures[floorId], furniture: furniture.filter((item) => item.floorId === floorId) };
}

export function modelPreviewCameraLabel(view: FixedCameraView) {
  if (view.floor === "YARD") {
    const labels: Record<string, string> = {
      "view-yard-all": "南北院与房屋关系",
      "view-yard-north": "北院烧烤与操作区",
      "view-yard-entry": "室内通往北院",
      "view-yard-south": "南院生活与服务区",
      "view-yard-south-living": "南院休闲区"
    };
    return labels[view.id] ?? view.name;
  }
  return view.name.replace(/^(B2|B1|1F|2F)\s*/, "").replace(/^\d{2}\s*/, "");
}

export function getModelPreviewCameras(floorId: FloorId, cameraViews: FixedCameraView[]) {
  const available = cameraViews.filter((view) => view.floor === floorId);
  const authored = available.filter((view) => /^designer-camera-.*-(?:v\d+-)?\d{2}-/.test(view.id));
  return authored.length ? authored : available;
}

export function buildModelPreviewOverview(floorId: FloorId, structure: HouseStructure, viewport: CameraViewport): FixedCameraView {
  const composition = composeCameraView({ kind: "floorOverview", structure, viewport, margin: 0.2 });
  // Test the real perspective projection, including the near diagonal corner.
  // Plan width/depth estimates alone can clip long courtyards in a shallow canvas.
  const bounds = getStructureCameraBounds(structure, true);
  const camera = new PerspectiveCamera(composition.fov, Math.max(1, viewport.width) / Math.max(1, viewport.height), 0.1, 500);
  const target = new Vector3(composition.target.x, composition.target.y, composition.target.z);
  const direction = new Vector3(composition.cameraPosition.x, composition.cameraPosition.y, composition.cameraPosition.z).sub(target).normalize();
  const corners = [bounds.minX, bounds.maxX].flatMap((x) => [bounds.minY, bounds.maxY].flatMap((y) => [bounds.minZ, bounds.maxZ].map((z) => new Vector3(x, y, z))));
  let distance = composition.distance;
  for (let step = 0; step < 60; step += 1) {
    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    if (corners.every((corner) => {
      const projected = corner.clone().project(camera);
      return Math.abs(projected.x) <= 0.83 && Math.abs(projected.y) <= 0.83 && projected.z < 1;
    })) break;
    distance *= 1.04;
  }
  composition.cameraPosition = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  return compositionToFixedView({ id: `model-preview-${floorId}-overview`, name: "全区总览", floor: floorId, composition });
}
