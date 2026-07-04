import type { SemanticObject } from "@/types/semantic-map";

export const initialSemanticObjects: SemanticObject[] = [
  {
    id: "R-1F-001",
    name: "1F 公共区",
    floorId: "1F",
    category: "Room",
    type: "living_dining",
    notes: "一层主要公共空间，具体功能区以玄关、客厅、厨房、卫生间等标签为准。",
    position: { x: 55, y: 55 },
    details: { area: 52.99, boundary: [{ x: 35, y: 20 }, { x: 86, y: 20 }, { x: 86, y: 86 }, { x: 35, y: 86 }] }
  },
  {
    id: "Z-1F-001",
    name: "1F 客厅",
    floorId: "1F",
    category: "Zone",
    type: "living",
    notes: "六人圆餐桌所在的客厅活动区。",
    position: { x: 72, y: 54 },
    details: { roomId: "R-1F-001", boundary: [{ x: 62, y: 24 }, { x: 88, y: 24 }, { x: 88, y: 72 }, { x: 62, y: 72 }] }
  },
  {
    id: "Z-1F-ENTRY",
    name: "1F 玄关",
    floorId: "1F",
    category: "Zone",
    type: "entry",
    notes: "厨房左侧的入户/玄关过渡空间。",
    position: { x: 45, y: 28 },
    details: { roomId: "ROOM-1F-001", boundary: [{ x: 36, y: 18 }, { x: 54, y: 18 }, { x: 54, y: 42 }, { x: 36, y: 42 }] }
  },
  {
    id: "F-1F-001",
    name: "1F 沙发占位",
    floorId: "1F",
    category: "Furniture",
    type: "sofa",
    notes: "从当前 mock 家具同步来的语义对象示例。",
    position: { x: 28, y: 48 },
    details: { roomId: "R-1F-001", zoneId: "", size: { width: 240, depth: 90, height: 78, unit: "cm" }, position: { x: 28, y: 48 }, rotation: 0, materialId: "", relatedWallIds: [] }
  },
  {
    id: "R-B1-001",
    name: "B1 多功能厅",
    floorId: "B1",
    category: "Room",
    type: "multi_function",
    notes: "地下室一层主要活动空间。",
    position: { x: 44, y: 60 },
    details: { area: 53.16, boundary: [] }
  },
  {
    id: "R-B2-001",
    name: "B2 会客影音区",
    floorId: "B2",
    category: "Room",
    type: "media_lounge",
    notes: "地下室二层大空间，后续标注影音和会客设备。",
    position: { x: 52, y: 58 },
    details: { area: 90.74, boundary: [] }
  },
  {
    id: "R-2F-001",
    name: "2F 主卧",
    floorId: "2F",
    category: "Room",
    type: "bedroom",
    notes: "二层主卧语义示例。",
    position: { x: 70, y: 48 },
    details: { area: 12.86, boundary: [] }
  }
];
