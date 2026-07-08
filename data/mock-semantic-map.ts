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
    details: { roomId: "ROOM-1F-005", boundary: [{ x: 62, y: 24 }, { x: 88, y: 24 }, { x: 88, y: 72 }, { x: 62, y: 72 }] }
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
    id: "Z-1F-STAIR",
    name: "1F 楼梯间",
    floorId: "1F",
    category: "Zone",
    type: "stair",
    notes: "楼梯所在区域，作为上下层动线和施工校核重点。",
    position: { x: 30, y: 45 },
    details: { roomId: "ROOM-1F-006", stairId: "ST-1F-001", boundary: [{ x: 10, y: 36 }, { x: 38, y: 36 }, { x: 38, y: 58 }, { x: 10, y: 58 }] }
  },
  {
    id: "R-B1-LAUNDRY",
    name: "洗衣房",
    floorId: "B1",
    category: "Room",
    type: "laundry",
    notes: "楼梯上来左上的小房间。",
    position: { x: 39, y: 14 },
    details: { area: 2.51, boundary: [{ x: 32.9, y: 3.9 }, { x: 44.9, y: 3.9 }, { x: 44.9, y: 23.3 }, { x: 32.9, y: 23.2 }] }
  },
  {
    id: "R-B1-ROOM",
    name: "房间",
    floorId: "B1",
    category: "Room",
    type: "room",
    notes: "洗衣房外围的大房间。",
    position: { x: 57, y: 21 },
    details: { area: 12.84, boundary: [{ x: 44.9, y: 3.9 }, { x: 79.1, y: 3.9 }, { x: 79.1, y: 34.6 }, { x: 44, y: 34.6 }, { x: 32.9, y: 34.6 }, { x: 32.9, y: 23.2 }, { x: 44.9, y: 23.3 }] }
  },
  {
    id: "R-B1-CORRIDOR",
    name: "走廊",
    floorId: "B1",
    category: "Room",
    type: "corridor",
    notes: "弧形空间对应的走廊。",
    position: { x: 42, y: 49 },
    details: { area: 4.63, boundary: [{ x: 32.9, y: 34.6 }, { x: 44, y: 34.6 }, { x: 47.3, y: 40 }, { x: 49.2, y: 50.4 }, { x: 47.3, y: 60.6 }, { x: 44.9, y: 65 }, { x: 35.8, y: 65 }, { x: 32.9, y: 55.6 }] }
  },
  {
    id: "R-B1-ACTIVITY",
    name: "活动区",
    floorId: "B1",
    category: "Room",
    type: "activity",
    notes: "最下方稍微延伸出去的活动区域。",
    position: { x: 34, y: 72 },
    details: { area: 19.45, boundary: [{ x: 7.9, y: 34.6 }, { x: 32.9, y: 34.6 }, { x: 32.9, y: 55.6 }, { x: 35.8, y: 65 }, { x: 44.9, y: 65 }, { x: 55.4, y: 65 }, { x: 55.4, y: 86.7 }, { x: 7.9, y: 86.7 }] }
  },
  {
    id: "R-B2-LIVING",
    name: "B2 客厅",
    floorId: "B2",
    category: "Room",
    type: "living",
    notes: "B2 入户门所在区域，作为地下二层电视游戏客厅；W-B2-001 做电视墙，沙发正对大屏。",
    position: { x: 59, y: 38 },
    details: { area: 20.17, boundary: [{ x: 30.6, y: 3.9 }, { x: 63.4, y: 3.9 }, { x: 63.4, y: 46.9 }, { x: 79.1, y: 46.9 }, { x: 79.1, y: 57.2 }, { x: 32.5, y: 57.2 }, { x: 32.5, y: 33.9 }, { x: 30.6, y: 33.9 }] }
  },
  {
    id: "R-B2-STAIR",
    name: "B2 楼梯间",
    floorId: "B2",
    category: "Room",
    type: "stair",
    notes: "B2 作为底层，只保留上行楼梯，楼梯下方切出三角形储物间。",
    position: { x: 24, y: 44 },
    details: { area: 5.72, boundary: [{ x: 7.9, y: 33.9 }, { x: 32.5, y: 33.9 }, { x: 32.5, y: 57.2 }, { x: 7.9, y: 57.2 }, { x: 17.1, y: 47.8 }, { x: 7.9, y: 47.8 }] }
  },
  {
    id: "R-B2-STORAGE",
    name: "B2 储物间",
    floorId: "B2",
    category: "Room",
    type: "storage",
    notes: "楼梯下方的三角形储物，可放清洁工具、换季物品和杂物架。",
    position: { x: 13, y: 52 },
    details: { area: 0.47, boundary: [{ x: 7.9, y: 47.8 }, { x: 17.1, y: 47.8 }, { x: 7.9, y: 57.2 }] }
  },
  {
    id: "R-B2-STUDY",
    name: "B2 书房",
    floorId: "B2",
    category: "Room",
    type: "study",
    notes: "活动区圆柱左侧作为书房和旅行纪念品展示区，靠墙放透明展示柜，中间放长方形原木大板桌。",
    position: { x: 28, y: 72 },
    details: { area: 12.72, boundary: [{ x: 7.9, y: 57.2 }, { x: 47.9, y: 57.2 }, { x: 47.9, y: 86.7 }, { x: 7.9, y: 86.7 }] }
  },
  {
    id: "R-B2-ACTIVITY",
    name: "B2 活动区",
    floorId: "B2",
    category: "Room",
    type: "activity",
    notes: "活动区圆柱右侧保持为主要活动净空，W-B2-011 做户外用品洞洞板，W-B2-012 设置两个采光天窗。",
    position: { x: 64, y: 72 },
    details: { area: 9.92, boundary: [{ x: 47.9, y: 57.2 }, { x: 79.1, y: 57.2 }, { x: 79.1, y: 86.7 }, { x: 47.9, y: 86.7 }] }
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
