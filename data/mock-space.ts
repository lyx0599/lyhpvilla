import type { SpaceData } from "@/types/space";
import { getDefaultVisualSettings } from "@/lib/floor-plan-cleanup";

const cleanGrayVisualSettings = getDefaultVisualSettings();

export const mockSpaceData: SpaceData = {
  floors: [
    { id: "B2", label: "b2", subtitle: "地下室二层", floorPlanImage: "/floor-plans/hd-clean/b2-hd-clean.png", visualSettings: cleanGrayVisualSettings, cleanPatches: [] },
    { id: "B1", label: "b1", subtitle: "地下室一层", floorPlanImage: "/floor-plans/hd-clean/b1-hd-clean.png", visualSettings: cleanGrayVisualSettings, cleanPatches: [] },
    { id: "1F", label: "1f", subtitle: "一层 / 客餐厨", floorPlanImage: "/floor-plans/hd-clean/1f-hd-clean.png", visualSettings: cleanGrayVisualSettings, cleanPatches: [] },
    { id: "2F", label: "2f", subtitle: "二层 / 卧室区", floorPlanImage: "/floor-plans/hd-clean/2f-hd-clean.png", visualSettings: cleanGrayVisualSettings, cleanPatches: [] },
    { id: "YARD", label: "院子", subtitle: "庭院 / 入户", visualSettings: cleanGrayVisualSettings, cleanPatches: [] }
  ],
  rooms: [
    { id: "room-living", name: "客厅", floorId: "1F", bounds: { x: 12, y: 14, width: 52, height: 48 } },
    { id: "room-dining", name: "餐厨区", floorId: "1F", bounds: { x: 65, y: 14, width: 25, height: 48 } },
    { id: "room-hollow", name: "挑空区", floorId: "B2", bounds: { x: 16, y: 16, width: 58, height: 54 } },
    { id: "room-entry", name: "入户区", floorId: "B1", bounds: { x: 18, y: 20, width: 62, height: 42 } },
    { id: "room-bedroom", name: "主卧", floorId: "2F", bounds: { x: 14, y: 16, width: 46, height: 45 } },
    { id: "room-yard", name: "前院", floorId: "YARD", bounds: { x: 10, y: 12, width: 80, height: 58 } }
  ],
  walls: [
    { id: "wall-1f-1", floorId: "1F", x1: 10, y1: 12, x2: 92, y2: 12, thickness: 2 },
    { id: "wall-1f-2", floorId: "1F", x1: 92, y1: 12, x2: 92, y2: 64, thickness: 2 },
    { id: "wall-1f-3", floorId: "1F", x1: 10, y1: 64, x2: 92, y2: 64, thickness: 2 },
    { id: "wall-1f-4", floorId: "1F", x1: 10, y1: 12, x2: 10, y2: 64, thickness: 2 },
    { id: "wall-1f-5", floorId: "1F", x1: 64, y1: 12, x2: 64, y2: 64, thickness: 1 }
  ],
  furniture: [
    {
      id: "furn-sofa-001",
      code: "SF-001",
      name: "客厅米白直排沙发",
      type: "sofa",
      floorId: "1F",
      roomId: "room-living",
      dimensions: { width: 240, depth: 90, height: 78, unit: "cm" },
      material: "米白色绒布",
      note: "自然语言示例目标：往南移动 30cm。",
      position: { x: 28, y: 48, rotation: 0 },
      color: "#e8ded0"
    },
    {
      id: "furn-table-001",
      code: "TB-001",
      name: "岩板圆餐桌",
      type: "table",
      floorId: "1F",
      roomId: "room-dining",
      dimensions: { width: 135, depth: 135, height: 75, unit: "cm" },
      material: "浅灰岩板 + 黑色金属脚",
      note: "靠近餐厨动线，预留通道。",
      position: { x: 77, y: 38, rotation: 0 },
      color: "#d6d9d7"
    },
    {
      id: "furn-bed-001",
      code: "BD-001",
      name: "主卧双人床",
      type: "bed",
      floorId: "2F",
      roomId: "room-bedroom",
      dimensions: { width: 180, depth: 200, height: 95, unit: "cm" },
      material: "浅木色床架 + 奶咖软包",
      note: "床头朝西，后续确认插座。",
      position: { x: 38, y: 42, rotation: 90 },
      color: "#c8a887"
    },
    {
      id: "furn-cabinet-001",
      code: "CB-001",
      name: "B1 入户收纳柜",
      type: "cabinet",
      floorId: "B1",
      roomId: "room-entry",
      dimensions: { width: 220, depth: 40, height: 240, unit: "cm" },
      material: "暖白柜门 + 原木开放格",
      note: "考虑扫地机器人和临时挂衣。",
      position: { x: 26, y: 29, rotation: 0 },
      color: "#f0e7d8"
    },
    {
      id: "furn-plant-001",
      code: "PL-001",
      name: "院子桂花树",
      type: "plant",
      floorId: "YARD",
      roomId: "room-yard",
      dimensions: { width: 120, depth: 120, height: 260, unit: "cm" },
      material: "植物",
      note: "作为入户视线焦点。",
      position: { x: 72, y: 34, rotation: 0 },
      color: "#7c9468"
    }
  ]
};
