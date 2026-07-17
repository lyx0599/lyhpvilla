import { readFile, writeFile } from "node:fs/promises";
import { getPolygonArea } from "../lib/house-geometry.ts";
import { generateLightingDesignV1 } from "../lib/lighting-design.ts";
import { CURRENT_WORKSPACE_DATA_REVISION, CURRENT_WORKSPACE_SCHEMA_VERSION } from "../lib/workspace-migrations.ts";

const url = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(url, "utf8"));
const now = "2026-07-17T15:00:00.000Z";
const yard = workspace.houseStructuresByFloor.YARD;
const point = (x, y) => ({ x, y });
const polygon = (points) => points.map(([x, y]) => point(x, y));
const northYard = yard.outdoors.find((outdoor) => outdoor.id === "OD-YARD-NORTH-001");
if (northYard) {
  northYard.polygon = polygon([[3676, -1650], [9495, -1650], [9495, 350], [3676, 350]]);
  northYard.area = getPolygonArea(northYard.polygon);
}
const zone = (id, outdoorId, name, zoneType, points, weatherProtection = "open") => ({ id, floorId: "YARD", outdoorId, name, zoneType, geometryType: "polygon", polygon: polygon(points), area: getPolygonArea(polygon(points)), weatherProtection, activityClearanceMm: 900, notes: "庭院功能区域：与铺装、对象、水电、灯光、图纸和检查器共用同一空间数据。", verificationMeta: { status: "estimated", source: "visual-estimate", toleranceMm: 120 } });
yard.outdoorZones = [
  zone("OZ-NORTH-KITCHEN-001", "OD-YARD-NORTH-001", "北院 · 户外厨房与聚会", "outdoorKitchen", [[5400, -1550], [7900, -1550], [7900, 120], [5400, 120]], "covered"),
  zone("OZ-NORTH-PLANT-001", "OD-YARD-NORTH-001", "北院 · 喜阴植物景观", "plant", [[8050, -1550], [9400, -1550], [9400, 220], [8050, 220]]),
  zone("OZ-NORTH-STORAGE-001", "OD-YARD-NORTH-001", "北院 · 工具与园艺收纳", "storage", [[3800, -1500], [5050, -1500], [5050, 120], [3800, 120]], "covered"),
  zone("OZ-SOUTH-RELAX-001", "OD-YARD-SOUTH-001", "南院 · 休闲会客", "relax", [[5200, 8300], [9200, 8300], [9200, 10150], [5200, 10150]], "shade"),
  zone("OZ-SOUTH-LAUNDRY-001", "OD-YARD-SOUTH-001", "南院 · 户外洗衣家务", "laundry", [[1150, 8100], [3700, 8100], [3700, 9650], [1150, 9650]], "rainproof"),
  zone("OZ-SOUTH-DRYING-001", "OD-YARD-SOUTH-001", "南院 · 隐蔽晾晒", "drying", [[1150, 9700], [3700, 9700], [3700, 11450], [1150, 11450]], "open"),
  zone("OZ-SOUTH-PET-001", "OD-YARD-SOUTH-001", "南院 · 宠物生活", "pet", [[7500, 10350], [9300, 10350], [9300, 11650], [7500, 11650]], "shade"),
  zone("OZ-SOUTH-GARDEN-001", "OD-YARD-SOUTH-001", "南院 · 菜园与香草种植", "garden", [[5000, 10450], [7400, 10450], [7400, 11800], [5000, 11800]])
];

// B1 is the basement level directly below the site. Its light-well skylights
// are shown on the yard plan at their shared X coordinate and exterior-facing
// edge, so the courtyard remains a coordinated vertical model rather than a
// separate decoration scene.
const yardSkylight = (id, sourceId, name, x, y) => ({
  id, floorId: "YARD", name, geometryType: "polygon", center: point(x, y), width: 800, depth: 560, height: 120,
  rotation: 0, operation: "electricOperable", openable: true, motorized: true,
  note: `地下室天窗地面投影，对应 ${sourceId}；四周预留 600mm 检修、开启与排水净空，禁止布置家具或种植箱。`,
  editable: true, removable: true, verificationMeta: { status: "drawing-derived", source: "developer-plan", toleranceMm: 80 }
});
yard.skylights = [
  yardSkylight("SKY-YARD-B1-N-001", "SKY-B1-W002-001", "北院 · 地下室采光天窗 1", 6100, 70),
  yardSkylight("SKY-YARD-B1-N-002", "SKY-B1-W002-002", "北院 · 地下室采光天窗 2", 7350, 70),
  yardSkylight("SKY-YARD-B1-N-003", "SKY-B1-W002-003", "北院 · 地下室采光天窗 3", 8600, 70),
  yardSkylight("SKY-YARD-B1-S-001", "SKY-B1-W009-001", "南院 · 地下室采光天窗 1", 1850, 8080),
  yardSkylight("SKY-YARD-B1-S-002", "SKY-B1-W009-002", "南院 · 地下室采光天窗 2", 3000, 8080)
];

const surface = (id, name, surfaceType, material, points, notes) => ({ id, floorId: "YARD", name, label: name, category: surfaceType === "hardscape" ? "hardscape" : surfaceType, geometryType: "polygon", surfaceType, polygon: polygon(points), pathWidthMm: null, area: getPolygonArea(polygon(points)), material, notes, status: "design-intent", source: "default-workspace", editable: true, removable: true });
yard.outdoorSurfaces = [
  surface("OS-YARD-NORTH-KITCHEN-DECK", "北院户外厨房木塑活动平台", "hardscape", "wood", [[5400, -1550], [7900, -1550], [7900, 120], [5400, 120]], "木塑/防腐木纹活动平台，预留 1% 找坡、线性排水和柜脚防潮节点。"),
  surface("OS-YARD-NORTH-PLANT", "北院喜阴植物花境与鹅卵石", "planting", "shrub", [[8050, -1550], [9400, -1550], [9400, 220], [8050, 220]], "高层植物、灌木、地被、景观石与鹅卵石构成背景，不占主要动线。"),
  surface("OS-YARD-NORTH-STORAGE", "北院工具区防滑石板", "hardscape", "slate", [[3800, -1500], [5050, -1500], [5050, 120], [3800, 120]], "檐下工具工作面，靠水点、防雨且与景观分离。"),
  surface("OS-YARD-SOUTH-RELAX-DECK", "南院休闲木纹活动平台", "hardscape", "wood", [[5200, 8300], [9200, 8300], [9200, 10150], [5200, 10150]], "户外铝材家具、防水织物与岩板茶几的连续客厅外延。"),
  surface("OS-YARD-SOUTH-LAUNDRY-DECK", "南院洗衣防滑木塑平台", "hardscape", "wood", [[1150, 8100], [3700, 8100], [3700, 9650], [1150, 9650]], "洗衣柜岛台下设排水坡和地漏，遮棚雨水独立导排。"),
  surface("OS-YARD-SOUTH-DRYING", "南院晾晒防滑石板区", "hardscape", "slate", [[1150, 9700], [3700, 9700], [3700, 11450], [1150, 11450]], "以植物和屏风弱化晾晒视觉，保持通风。"),
  surface("OS-YARD-SOUTH-PATH", "南院大尺寸自然石板留缝步道", "path", "slate", [[3450, 8950], [4200, 8700], [5850, 9400], [5600, 10150], [4050, 9550]], "自然石板留缝铺设，900mm 净宽，低位灯引导。"),
  surface("OS-YARD-SOUTH-PET", "南院宠物洗脚防滑砾石铺装", "hardscape", "gravel", [[7500, 10350], [9300, 10350], [9300, 11650], [7500, 11650]], "可冲洗、防滑、设地漏的宠物生活面。"),
  surface("OS-YARD-SOUTH-GARDEN", "南院可维护菜园绿化区", "planting", "soil", [[5000, 10450], [7400, 10450], [7400, 11800], [5000, 11800]], "Raised Garden Bed、香草和季节蔬菜种植，沿庭院边界布置，预留维护步道。")
];

const zoneById = new Map(yard.outdoorZones.map((item) => [item.id, item]));
const outdoor = (zoneId) => zoneById.get(zoneId).outdoorId;
const object = (id, name, zoneId, outdoorObjectType, x, y, width, depth, height, material, mep = {}, renderAsset = "yardModule", note = "") => ({
  id, code: id, name, type: "custom", moduleCategory: "decor", floorId: "YARD", roomId: outdoor(zoneId), outdoorId: outdoor(zoneId), outdoorZoneId: zoneId, outdoorObjectType,
  position: { x, y, rotation: 0 }, dimensions: { width, depth, height, unit: "cm" }, material, color: "#766654", note,
  serviceRequirements: { water: Boolean(mep.water), drainage: Boolean(mep.drainage), power: Boolean(mep.power), exhaust: Boolean(mep.exhaust) },
  mepMeta: { needsSocket: Boolean(mep.power), socketCount: mep.power ? 1 : 0, socketHeight: mep.power ? 300 : 0, needsSwitch: Boolean(mep.lighting), switchControl: mep.lighting ? ["庭院场景控制"] : [], needsLighting: Boolean(mep.lighting), lightingType: mep.lighting ? "task" : "none", needsWaterSupply: Boolean(mep.water), waterSupplyType: mep.water ? "coldWater" : "none", needsDrainage: Boolean(mep.drainage), drainageType: mep.drainage ? "floorDrain" : "none", needsNetwork: false, needsVentilation: Boolean(mep.exhaust), needsSmartControl: Boolean(mep.lighting), relatedCircuit: mep.circuit ?? "庭院独立漏保回路", notes: mep.notes ?? note },
  constructionMeta: { customMade: ["outdoorIsland", "outdoorCabinet", "outdoorLaundry"].includes(outdoorObjectType), installType: "floorStanding", reserveSize: `${width}x${depth}x${height}cm`, wallDependency: "按现场完成面与防水节点复核", floorDependency: "完成面找坡至排水点", ceilingDependency: "按遮棚/檐口条件复核", waterproofRequired: ["outdoorIsland", "outdoorCabinet", "outdoorLaundry"].includes(outdoorObjectType), inspectionAccessRequired: Boolean(mep.power || mep.water || mep.drainage), purchaseCategory: "庭院设备与景观", supplierType: "庭院/定制供应商", notes: note },
  render3d: { assetType: renderAsset, detailLevel: "presentation", stylePreset: "modernNatural", primaryMaterial: material, secondaryMaterial: "warmGreyStone", accentMaterial: "blackTitanium", visibleIn3d: true, selectableIn3d: true, childrenMode: "grouped", variantId: "proceduralDefault", variationSeed: Math.abs([...id].reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)), styleSource: "manual" }
});
const supersededYardPlaceholders = new Set([
  "ph-1f-north-bbq-island", "ph-1f-south-drying-rack", "ph-1f-south-lounge-set", "ph-1f-south-dog-house", "ph-1f-south-pet-water", "ph-1f-south-outdoor-cabinet", "ph-1f-south-yard-light", "ph-1f-south-water-tap", "ph-1f-south-drain-point"
]);
// These were early display-only placeholders. The semantic OutdoorObjects below
// replace them, so duplicate, generic geometry never leaks back into the view.
workspace.furniture = workspace.furniture.filter((item) => !(item.floorId === "YARD" && (item.outdoorZoneId || item.id.startsWith("OUT-") || supersededYardPlaceholders.has(item.id))));
// The retained mature osmanthus is also part of the landscape edge, not a
// freestanding object in the middle of the courtyard.
workspace.furniture = workspace.furniture.map((item) => item.id === "furn-plant-001"
  ? { ...item, position: { ...item.position, x: 37.5, y: -11.5 } }
  : item.id === "ph-1f-north-outdoor-socket"
    ? { ...item, position: { ...item.position, x: 32, y: -9 } }
  : item);
workspace.furniture.push(
  object("OUT-N-KITCHEN-ISLAND", "北院户外厨房岛台", "OZ-NORTH-KITCHEN-001", "outdoorIsland", 54, -13.6, 260, 80, 90, "耐候铝板柜体 + 岩板台面", { power: true, water: true, drainage: true, exhaust: true, lighting: true, circuit: "北院厨房专用回路", notes: "含柜体、岩板台面、水槽与柜下灯；燃气/设备接口由现场深化。" }, "outdoorCabinet", "厨房岛台：柜体、台面、水槽、给排水、电源与燃气设备备注一体化；避开地下室天窗检修净空。"),
  object("OUT-N-BBQ", "北院嵌入式 BBQ 烧烤炉", "OZ-NORTH-KITCHEN-001", "bbq", 60, -13, 90, 70, 115, "耐候不锈钢 + 黑钛炉面", { power: true, exhaust: true, circuit: "北院厨房专用回路", notes: "与可燃材料和窗洞保持现场复核距离；燃气或电器型号待确认。" }, "outdoorCabinet"),
  object("OUT-N-TAP", "北院户外净洗龙头", "OZ-NORTH-KITCHEN-001", "waterTap", 48, -12.2, 35, 25, 95, "304 不锈钢防冻龙头", { water: true, drainage: true, notes: "靠近岛台与工具区，设防冻阀和排水。" }, "outdoorSocket"),
  object("OUT-N-PLANTER", "北院层次植物与景观石", "OZ-NORTH-PLANT-001", "planter", 72, -14, 170, 50, 220, "乔木、耐阴灌木、地被、景观石与鹅卵石", { lighting: true }, "yardModule", "沿北院边界形成视觉背景，避开地下室天窗检修净空并留出 900mm 以上步行动线。"),
  object("OUT-N-STORAGE", "北院防雨园艺储物柜", "OZ-NORTH-STORAGE-001", "outdoorCabinet", 37, -9.1, 150, 55, 185, "耐候铝板柜 + 防水台面", { power: true, water: true, lighting: true, notes: "内置清洁用品、园艺工具与水管收纳，靠近水点。" }, "outdoorCabinet"),
  object("OUT-N-HOSE", "北院水管收纳与工具架", "OZ-NORTH-STORAGE-001", "hoseReel", 38, -9.2, 70, 35, 120, "防锈金属 + 卷管器", { water: true }, "yardModule"),
  object("OUT-S-RELAX", "南院铝材休闲桌椅与岩板茶几", "OZ-SOUTH-RELAX-001", "outdoorCabinet", 64, 100, 300, 200, 78, "户外铝材 + 防水织物 + 岩板", { power: true, lighting: true, circuit: "南院休闲回路" }, "outdoorDiningSet", "从室内客厅连续延伸至庭院会客区。"),
  object("OUT-S-UMBRELLA", "南院可调遮阳伞", "OZ-SOUTH-RELAX-001", "shadeUmbrella", 58, 106, 300, 300, 260, "户外铝材 + 防水遮阳布", { lighting: true }, "yardModule"),
  object("OUT-S-LAUNDRY", "南院防雨洗衣柜岛台", "OZ-SOUTH-LAUNDRY-001", "outdoorLaundry", 23, 103.2, 240, 65, 90, "防水柜体 + 石英石台面", { power: true, water: true, drainage: true, lighting: true, circuit: "南院洗衣专用回路", notes: "含洗衣机、水槽、龙头、操作台与储物；顶部遮棚接入雨水排水，并避开地下室天窗检修净空。" }, "outdoorCabinet"),
  object("OUT-S-DRYING", "南院隐藏式晾被架", "OZ-SOUTH-DRYING-001", "dryingRack", 24, 105, 220, 85, 165, "深灰铝合金", {}, "dryingRack", "以绿篱与格栅屏风弱化视觉。"),
  object("OUT-S-PET-HOUSE", "南院遮阳狗窝", "OZ-SOUTH-PET-001", "dogHouse", 65, 112, 120, 95, 105, "耐候木 + 防滑基座", { drainage: true, lighting: true }, "dogHouse"),
  object("OUT-S-PET-WASH", "南院宠物洗脚与饮水点", "OZ-SOUTH-PET-001", "petWash", 73, 110, 75, 60, 45, "防滑石材 + 不锈钢饮水碗", { water: true, drainage: true, lighting: true }, "drainPoint"),
  object("OUT-S-GARDEN-BED", "南院 Raised Garden Bed 菜园", "OZ-SOUTH-GARDEN-001", "raisedGardenBed", 52, 125, 220, 90, 65, "耐候木花箱 + 香草/蔬菜", { water: true }, "yardModule", "沿南院边界布置的可维护香草、菜园与季节种植，不作为随机绿植。"),
  object("OUT-S-PATH-LIGHT", "南院低位路径灯", "OZ-SOUTH-RELAX-001", "pathwayLight", 43, 96, 22, 22, 65, "深灰铝材 IP65", { power: true, lighting: true, circuit: "南院景观照明回路" }, "yardLight")
);

const drawing = (id, roomId, category, type, x, y, label, notes, relatedFurnitureId = null) => {
  const related = workspace.furniture.find((item) => item.id === relatedFurnitureId);
  return { id, floorId: "YARD", roomId, category, type, positionMm: point(x, y), hostObjectId: null, hostWallId: null, relatedFurnitureId, relatedFurniturePositionMm: related ? point(yard.coordinateSystem.origin.x + yard.coordinateSystem.width * related.position.x / 100, yard.coordinateSystem.origin.y + yard.coordinateSystem.height * related.position.y / 100) : undefined, heightMm: null, circuitId: category === "socket" ? "庭院独立漏保回路" : null, materialId: null, label, notes, source: "generated-from-furniture", status: "draft", quantity: 1, createdAt: now, updatedAt: now, relatedRoomId: roomId };
};
workspace.drawingItems = workspace.drawingItems.filter((item) => !item.id.startsWith("MEP-OUT-"));
workspace.drawingItems.push(
  drawing("MEP-OUT-N-KITCHEN-SOCKET", "OD-YARD-NORTH-001", "socket", "weatherproofSocket", 6500, -850, "北院厨房岛台 · 防水电源", "IP65 防水盒 + 独立漏保回路，服务 BBQ、台面小电器和柜下灯。", "OUT-N-KITCHEN-ISLAND"),
  drawing("MEP-OUT-N-KITCHEN-WATER", "OD-YARD-NORTH-001", "waterSupply", "coldWater", 4250, -850, "北院厨房岛台 · 给水", "服务水槽与户外龙头，设防冻阀。", "OUT-N-KITCHEN-ISLAND"),
  drawing("MEP-OUT-N-KITCHEN-DRAIN", "OD-YARD-NORTH-001", "drainage", "floorDrain", 4550, -600, "北院厨房岛台 · 排水", "岛台水槽及平台找坡排水，现场复核接入。", "OUT-N-KITCHEN-ISLAND"),
  drawing("MEP-OUT-S-LAUNDRY-SOCKET", "OD-YARD-SOUTH-001", "socket", "weatherproofSocket", 2300, 8900, "南院洗衣柜 · 防水电源", "洗衣机专用回路，IP65 防水盒。", "OUT-S-LAUNDRY"),
  drawing("MEP-OUT-S-LAUNDRY-WATER", "OD-YARD-SOUTH-001", "waterSupply", "coldWater", 2050, 8900, "南院洗衣柜 · 给水", "洗衣机、水槽和龙头给水点。", "OUT-S-LAUNDRY"),
  drawing("MEP-OUT-S-LAUNDRY-DRAIN", "OD-YARD-SOUTH-001", "drainage", "floorDrain", 2600, 9200, "南院洗衣柜 · 排水", "洗衣机、水槽与遮棚雨水分流，平台 1% 找坡。", "OUT-S-LAUNDRY"),
  drawing("MEP-OUT-S-PET-DRAIN", "OD-YARD-SOUTH-001", "drainage", "floorDrain", 7900, 11000, "南院宠物区 · 洗脚排水", "宠物洗脚区防滑地面与地漏。", "OUT-S-PET-WASH")
);
const lighting = generateLightingDesignV1({ structuresByFloor: workspace.houseStructuresByFloor, furniture: workspace.furniture, existingItems: workspace.drawingItems, floorIds: workspace.floors.map((floor) => floor.id), overwriteConflicts: true, now });
workspace.drawingItems = lighting.items;
workspace.lightingDesign = lighting.lightingDesign;
workspace.roomTourViews = [
  ...(workspace.roomTourViews ?? []).filter((view) => !view.id.startsWith("lighting-view-")),
  ...lighting.recommendedViews
];
workspace.schemaVersion = CURRENT_WORKSPACE_SCHEMA_VERSION;
workspace.dataRevision = CURRENT_WORKSPACE_DATA_REVISION;
workspace.defaultWorkspaceRevision = CURRENT_WORKSPACE_DATA_REVISION;
workspace.drawingPackage = { ...workspace.drawingPackage, name: "施工图纸包 · 现代别墅庭院生活系统 v1", drawingItemIds: workspace.drawingItems.map((item) => item.id), updatedAt: now };
workspace.updatedAt = now;
await writeFile(url, `${JSON.stringify(workspace, null, 2)}\n`, "utf8");
console.log(`Outdoor living system applied: ${yard.outdoorZones.length} zones, ${workspace.furniture.filter((item) => item.floorId === "YARD" && item.outdoorZoneId).length} outdoor objects.`);
