import { readFile, writeFile } from "node:fs/promises";

const workspaceUrl = new URL("../data/default-workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(workspaceUrl, "utf8"));

const kitchenPresentation = {
  "furn-kitchen-run-001": { frontStyle: "shaker", handleStyle: "edgePull", countertopEdge: "eased" },
  "furn-kitchen-u-left-run": { frontStyle: "slab", handleStyle: "edgePull", countertopEdge: "thin" },
  "furn-kitchen-u-right-run": { frontStyle: "fluted", handleStyle: "groove", countertopEdge: "thin" },
  "furn-kitchen-entry-island-001": { frontStyle: "fluted", handleStyle: "edgePull", countertopEdge: "waterfall" },
  "furn-living-waterbar-001": { frontStyle: "shaker", handleStyle: "knob", countertopEdge: "eased" },
  "furn-living-waterbar-upper-001": { frontStyle: "glass", handleStyle: "edgePull" }
};

const anchor = (id, type, label, x, y, z, installationHeightMm = y) => ({
  id,
  type,
  label,
  positionMm: { x: Math.round(x), y: Math.round(y), z: Math.round(z) },
  installationHeightMm: Math.round(installationHeightMm)
});

for (const item of workspace.furniture) {
  const moduleType = item.moduleType ?? item.type;
  const widthMm = item.dimensions.width * 10;
  const depthMm = item.dimensions.depth * 10;
  const heightMm = item.dimensions.height * 10;

  if (kitchenPresentation[item.id]) {
    item.render3d = {
      ...item.render3d,
      detailLevel: "presentation",
      childrenMode: "grouped",
      kitchenVisual: {
        ...item.render3d?.kitchenVisual,
        ...kitchenPresentation[item.id],
        panelGapMm: 3,
        endPanelThicknessMm: 22,
        showCountertopSeams: true,
        showInternalShadowGap: true
      }
    };
  }

  if (["vanity", "toilet", "shower", "bathtub"].includes(moduleType)) {
    const fixtureKind = moduleType;
    const wetAreaVisual = fixtureKind === "vanity"
      ? {
          fixtureKind,
          basinCount: widthMm >= 1250 ? 2 : 1,
          floating: true,
          mirrorStyle: widthMm < 1000 ? "round" : "roundedRect",
          frameFinish: "bronze"
        }
      : fixtureKind === "toilet"
        ? { fixtureKind, toiletType: item.mepMeta?.needsSmartControl ? "smart" : "closeCoupled" }
        : fixtureKind === "shower"
          ? {
              fixtureKind,
              showerDoor: widthMm > 1200 ? "sliding" : "swing",
              frameFinish: item.floorId === "B1" ? "minimal" : "black",
              showNiche: true,
              showLinearDrain: true
            }
          : { fixtureKind, bathtubType: "freestanding" };

    item.render3d = {
      ...item.render3d,
      detailLevel: "presentation",
      childrenMode: "grouped",
      wetAreaVisual
    };

    if (fixtureKind === "vanity") {
      const basinCount = widthMm >= 1250 ? 2 : 1;
      item.constructionAnchors = {
        points: [
          anchor(`${item.id}-cold`, "coldWater", "台盆冷水", -60, 550, -depthMm * 0.42),
          anchor(`${item.id}-hot`, "hotWater", "台盆热水", 60, 550, -depthMm * 0.42),
          anchor(`${item.id}-drain`, "drain", "台盆排水", 0, 500, -depthMm * 0.38),
          anchor(`${item.id}-power`, "power", "镜柜及吹风插座", widthMm * 0.36, 1100, -depthMm * 0.46)
        ],
        openingSizeMm: { width: 220 * basinCount, depth: 180 },
        installationHeightMm: 850,
        notes: "给排水、电源和镜柜中心线随浴室柜旋转与移动同步。"
      };
    } else if (fixtureKind === "toilet") {
      item.constructionAnchors = {
        points: [
          anchor(`${item.id}-cold`, "coldWater", "马桶角阀", -widthMm * 0.34, 200, -depthMm * 0.28),
          anchor(`${item.id}-drain`, "drain", "马桶排污中心", 0, 0, -depthMm * 0.2, 0),
          anchor(`${item.id}-power`, "power", "智能马桶防溅插座", widthMm * 0.34, 300, -depthMm * 0.32)
        ],
        openingSizeMm: { width: 300, depth: 300 },
        notes: "排污坑距、角阀和防溅插座绑定马桶本体。"
      };
    } else if (fixtureKind === "shower") {
      item.constructionAnchors = {
        points: [
          anchor(`${item.id}-cold`, "coldWater", "淋浴冷水", widthMm * 0.18, 1100, -depthMm * 0.42),
          anchor(`${item.id}-hot`, "hotWater", "淋浴热水", widthMm * 0.28, 1100, -depthMm * 0.42),
          anchor(`${item.id}-drain`, "drain", "淋浴线性地漏", widthMm * 0.22, 0, depthMm * 0.22, 0),
          anchor(`${item.id}-exhaust`, "exhaust", "淋浴区排风", 0, Math.max(2200, heightMm), 0)
        ],
        openingSizeMm: { width: 600, depth: 80 },
        notes: "冷热水、地漏和排风点随淋浴房定位同步。"
      };
    } else {
      item.constructionAnchors = {
        points: [
          anchor(`${item.id}-cold`, "coldWater", "浴缸冷水", widthMm * 0.28, 600, -depthMm * 0.34),
          anchor(`${item.id}-hot`, "hotWater", "浴缸热水", widthMm * 0.36, 600, -depthMm * 0.34),
          anchor(`${item.id}-drain`, "drain", "浴缸排水", 0, 0, depthMm * 0.2, 0),
          anchor(`${item.id}-power`, "power", "浴缸检修电源", -widthMm * 0.36, 300, -depthMm * 0.3)
        ],
        openingSizeMm: { width: 180, depth: 180 },
        notes: "浴缸给排水和检修电源绑定设备中心。"
      };
    }
  }

  if (["wardrobe", "cabinet", "bookshelf", "snackCabinet"].includes(moduleType) && !item.render3d?.kitchenVisual) {
    item.render3d = {
      ...item.render3d,
      detailLevel: "presentation",
      childrenMode: "grouped"
    };
    const points = [];
    if (item.mepMeta?.needsSocket) {
      points.push(anchor(`${item.id}-service-power`, "power", "柜体检修插座", -widthMm * 0.34, item.mepMeta.socketHeight || 300, -depthMm * 0.44));
    }
    if (item.mepMeta?.needsLighting) {
      points.push(anchor(`${item.id}-lighting-power`, "power", "柜内灯带电源", widthMm * 0.34, Math.max(1800, heightMm - 120), -depthMm * 0.42));
    }
    if (points.length) {
      item.constructionAnchors = {
        points,
        installationHeightMm: 0,
        notes: "柜体电源点随定制柜移动和旋转同步。"
      };
    }
  }
}

await writeFile(workspaceUrl, `${JSON.stringify(workspace, null, 2)}\n`);
console.log("Reusable kitchen, wet-area and storage visuals applied.");
