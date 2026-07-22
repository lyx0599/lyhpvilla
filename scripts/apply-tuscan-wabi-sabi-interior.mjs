import fs from "node:fs";

const workspacePath = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));

function materialSet(assetType, item) {
  if (["sofa"].includes(assetType)) return ["beigeFabric", "creamFabric", "taupeFabric"];
  if (["bed"].includes(assetType)) return item.id === "furn-2f-bedroom1-bed-001" || item.id === "furn-b1-guest-bed-001"
    ? ["warmOak", "creamFabric", "taupeFabric"]
    : ["beigeFabric", "creamFabric", "taupeFabric"];
  if (["diningChair"].includes(assetType)) return ["warmOak", "beigeFabric", "brushedBronze"];
  if (["diningTable", "slabTable", "desk"].includes(assetType)) return ["warmOak", "warmOak", "brushedBronze"];
  if (["coffeeTable", "loungeCoffeeTable"].includes(assetType)) return ["travertine", "warmOak", "brushedBronze"];
  if (["wardrobe", "walkInCloset"].includes(assetType)) return ["warmOak", item.roomId === "ROOM-2F-006" ? "smokedOatTaupe" : "oatTaupeLacquer", "agedBrass"];
  if (["entryCabinet", "cabinet", "wallCabinet", "bookshelf", "nightstand"].includes(assetType)) return ["warmOak", "warmWhiteCeramic", "brushedBronze"];
  if (["kitchenCabinet", "sideboard"].includes(assetType)) return ["warmWhiteCeramic", "warmOak", "brushedBronze"];
  if (assetType === "island") return ["warmOak", "travertine", "brushedBronze"];
  if (assetType === "bathroomVanity") return ["travertine", "warmOak", "brushedBronze"];
  if (assetType === "shower") return ["clearGlass", "brushedBronze", "travertine"];
  if (["toilet", "bathtub"].includes(assetType)) return ["warmWhiteCeramic", "brushedBronze", "travertine"];
  if (assetType === "sink") return ["travertine", "brushedBronze", "warmWhiteCeramic"];
  if (["cooktop", "fridge"].includes(assetType)) return ["warmGreyStone", "brushedBronze", "warmWhiteCeramic"];
  if (assetType === "fireplace") return ["microCement", "travertine", "warmLightEmissive"];
  if (assetType === "outdoorDiningSet") return ["warmOak", "terracotta", "brushedBronze"];
  if (assetType === "plant") return ["plantSoftGreen", "terracotta", "warmOak"];
  return [item.render3d?.primaryMaterial, item.render3d?.secondaryMaterial, item.render3d?.accentMaterial];
}

const floorFinishes = {
  limestone: {
    material: "tile",
    name: "暖米灰石灰岩纹哑光瓷砖",
    baseColor: "#d8cfbd",
    jointColor: "#c5b9a5",
    textureAccent: "#eee7d9",
    roughness: 0.86,
    tileWidthMm: 600,
    tileLengthMm: 1200,
    seamWidthMm: 2,
    directionDeg: 0,
    textureScale: 4.4
  },
  oak: {
    material: "woodFloor",
    name: "自然浅烟熏橡木宽板",
    baseColor: "#b7926b",
    jointColor: "#806044",
    textureAccent: "#d2b38e",
    roughness: 0.76,
    tileWidthMm: 200,
    tileLengthMm: 1800,
    seamWidthMm: 2,
    directionDeg: 0,
    textureScale: 4.6
  },
  travertine: {
    material: "tile",
    name: "浅米洞石纹防滑瓷砖",
    baseColor: "#cdbd9f",
    jointColor: "#b39f82",
    textureAccent: "#eadcc4",
    roughness: 0.82,
    tileWidthMm: 300,
    tileLengthMm: 600,
    seamWidthMm: 2,
    directionDeg: 0,
    textureScale: 3.8
  },
  microcement: {
    material: "microcement",
    name: "暖燕麦灰微水泥",
    baseColor: "#c8baa4",
    jointColor: "#ad9a7e",
    textureAccent: "#e2d4bd",
    roughness: 0.86,
    directionDeg: 0,
    textureScale: 2.3
  }
};

const wallFinishes = {
  limewash: {
    material: "limewash",
    name: "暖石灰白手工石灰漆",
    baseColor: "#e9e1d3",
    textureAccent: "#d8cab8",
    roughness: 0.93,
    textureScale: 2.4
  },
  oatmeal: {
    material: "limePlaster",
    name: "浅燕麦灰石灰基肌理墙",
    baseColor: "#ded1bd",
    textureAccent: "#c5b39c",
    roughness: 0.94,
    textureScale: 2.7
  },
  washable: {
    material: "mineralSilicatePaint",
    name: "暖米白可擦洗矿物墙面",
    baseColor: "#e7dece",
    textureAccent: "#d3c5b2",
    roughness: 0.89,
    textureScale: 2.1
  },
  wetArea: {
    material: "waterproofMineralPlaster",
    name: "浅洞石色防水矿物涂层",
    baseColor: "#d9ccb7",
    textureAccent: "#bdab91",
    roughness: 0.91,
    textureScale: 2.5
  }
};

const clone = (value) => JSON.parse(JSON.stringify(value));

for (const [floorId, structure] of Object.entries(workspace.houseStructuresByFloor)) {
  for (const room of structure.rooms ?? []) {
    const bathroom = /卫|盥洗|洗衣/.test(room.name);
    const bedroom = /卧|房间/.test(room.name);
    const kitchen = /厨房/.test(room.name);
    const basement = floorId === "B1" || floorId === "B2";
    const upperWoodZone = floorId === "2F" && !bathroom && !/楼梯/.test(room.name);
    const floor = bathroom
      ? floorFinishes.travertine
      : basement
        ? floorFinishes.microcement
        : bedroom || upperWoodZone || (floorId === "2F" && /走廊|楼梯/.test(room.name))
          ? floorFinishes.oak
          : floorFinishes.limestone;
    const wall = bathroom
      ? wallFinishes.wetArea
      : kitchen
        ? wallFinishes.washable
        : bedroom || /主卧/.test(room.name)
          ? wallFinishes.oatmeal
          : wallFinishes.limewash;
    room.surfaceFinishes = { floor: clone(floor), wall: clone(wall) };
  }
}

for (const item of workspace.furniture) {
  if (!item.render3d || item.render3d.styleLocked) continue;
  const assetType = item.render3d.assetType ?? item.moduleType ?? item.type;
  const [primaryMaterial, secondaryMaterial, accentMaterial] = materialSet(assetType, item);
  item.render3d.stylePreset = "tuscanWabiSabi";
  item.render3d.styleSource = "manual";
  if (primaryMaterial) item.render3d.primaryMaterial = primaryMaterial;
  if (secondaryMaterial) item.render3d.secondaryMaterial = secondaryMaterial;
  if (accentMaterial) item.render3d.accentMaterial = accentMaterial;
  if (assetType === "fireplace") item.render3d.variantId = "stoneHearthWall";
  if (item.id === "furn-2f-master-bedroom-bed-001" || item.id === "module-1f-bed-002") item.render3d.variantId = "lowUpholstered";
  if (item.id === "furn-2f-bedroom1-bed-001") item.render3d.variantId = "timberFrame";
  if (item.id === "furn-2f-bedroom2-bed-001") item.render3d.variantId = "lowUpholstered";
  if (item.id === "furn-b1-guest-bed-001") item.render3d.variantId = "guestBed";
  if (["furn-2f-bedroom1-bed-001", "furn-2f-bedroom2-bed-001"].includes(item.id)) {
    item.render3d.bedVisual = { ...item.render3d.bedVisual, headboardStyle: "standard" };
  }
  if (item.id === "furn-2f-master-bedroom-large-wardrobe-001") item.render3d.variantId = "fullHeightFlat";
  if (["module-2f-cloak-left", "module-2f-cloak-right"].includes(item.id)) {
    item.render3d.cabinetVisual = { ...item.render3d.cabinetVisual, allDoorPanels: false, handleStyle: "edgePull" };
  }
  if (assetType === "bathroomVanity") item.render3d.variantId = "floating";
  if (item.render3d.cabinetVisual) {
    item.render3d.cabinetVisual.handleStyle = item.render3d.cabinetVisual.handleStyle === "bar" ? "edgePull" : item.render3d.cabinetVisual.handleStyle;
  }
}

const doorPalette = {
  woodColor: "#9a7654",
  frameColor: "#8f704f",
  hardwareColor: "#8a6844",
  glassColor: "#ddd1bd"
};
for (const structure of Object.values(workspace.houseStructuresByFloor)) {
  for (const door of structure.doors ?? []) {
    if (door.id === "D-B2-STORAGE-001") continue;
    door.operation ??= "swing";
    door.material ??= "solid";
    door.visual = { style: "standard", ...doorPalette, leafCount: door.width >= 1400 ? 2 : 1 };
    if (door.id === "D-1F-005") {
      door.name = "1F 卫生间保留拱形长虹玻璃门";
      door.visual = { style: "archedReededGlass", ...doorPalette, leafCount: 1 };
    } else if (door.id === "D-1F-003") {
      door.name = "1F 卧室浅橡木轻编织细节门";
      door.visual = { style: "wovenReliefWood", ...doorPalette, leafCount: 1 };
    } else if (door.id === "D-1F-004") {
      door.name = "厨房乳白半透明玻璃双移门 · 深棕古铜窄框";
      door.operation = "sliding";
      door.material = "translucentGlass";
      door.visual = { style: "standard", ...doorPalette, frameColor: "#5f5145", leafCount: 2 };
    } else if (door.id === "D-2F-008") {
      door.name = "2F 主卧简洁浅橡木双开门";
      door.visual = { style: "doubleLeafWood", ...doorPalette, leafCount: 2 };
    } else if (["D-B1-001", "D-2F-006", "D-2F-007"].includes(door.id)) {
      door.name = door.id === "D-B1-001" ? "B1 盥洗间方正暖木平板门" : door.id === "D-2F-006" ? "2F 客卫方正暖木平板门" : "2F 主卫方正暖木平板门";
      door.visual = { style: "standard", ...doorPalette, leafCount: 1 };
    } else if (["D-2F-003", "D-2F-004"].includes(door.id)) {
      door.name = door.id === "D-2F-003" ? "2F 卧室1简洁浅橡木平板门" : "2F 卧室2简洁浅橡木平板门";
    }
  }
}

for (const fixture of workspace.lightingDesign.fixtureFamilies) {
  fixture.defaultColorTemperature = fixture.id === "under-cabinet-strip" || fixture.id === "mirror-light" ? "3000K" : "2700K";
  if (fixture.defaultLightSpec) {
    fixture.defaultLightSpec.cri = fixture.id === "under-cabinet-strip" || fixture.id === "mirror-light" ? 95 : Math.max(90, fixture.defaultLightSpec.cri ?? 90);
    fixture.defaultLightSpec.trimColor = fixture.defaultLightSpec.trimColor
      ?.replaceAll("哑黑", "暖白")
      .replaceAll("黑色", "深棕古铜")
      .replaceAll("香槟金属", "做旧黄铜") ?? fixture.defaultLightSpec.trimColor;
  }
  fixture.finishOptions = fixture.finishOptions?.map((finish) => finish.replaceAll("哑黑", "暖白").replaceAll("黑色", "深棕古铜").replaceAll("香槟金属", "做旧黄铜"));
  fixture.notes = "自然托斯卡纳×现代简约侘寂统一灯具家族；暖光、低眩、低反光，品牌与IES配光待深化。";
}

for (const scene of workspace.lightingDesign.scenes) {
  scene.notes = `${scene.notes ?? ""} 统一采用2700K氛围光；厨房、书房任务面和卫浴镜前局部3000K。`.trim();
}

workspace.dataRevision = "2026-07-23-tuscan-wabi-sabi-v1";
workspace.defaultWorkspaceRevision = workspace.dataRevision;
workspace.revision = Math.max(Number(workspace.revision ?? 0), 1);
workspace.updatedAt = "2026-07-23T00:00:00.000Z";

fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);

console.log(`Applied Tuscan × Wabi-sabi finishes to ${workspace.furniture.length} furniture objects and ${workspace.drawingItems.filter((item) => item.category === "light").length} lights without changing geometry.`);
