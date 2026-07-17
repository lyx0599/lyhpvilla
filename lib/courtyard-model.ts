import type { Floor, Furniture, HouseOutdoor, HouseStructure } from "@/types/space";

export const COURTYARD_CAMERA_VIEW_IDS = {
  oneFloorOverview: "view-1f-yard-overview",
  all: "view-yard-all",
  south: "view-yard-south",
  north: "view-yard-north",
  entry: "view-yard-entry",
  southLiving: "view-yard-south-living"
} as const;

export const courtyardViewFloorIds: Floor["id"][] = ["1F", "YARD"];

export function isCourtyardCameraViewId(viewId: string) {
  return Object.values(COURTYARD_CAMERA_VIEW_IDS).includes(viewId as typeof COURTYARD_CAMERA_VIEW_IDS[keyof typeof COURTYARD_CAMERA_VIEW_IDS]);
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function isCourtyardOutdoor(outdoor: HouseOutdoor) {
  return outdoor.id === "OD-YARD-NORTH-001" ||
    outdoor.id === "OD-YARD-SOUTH-001" ||
    outdoor.id === "OD-1F-NORTH-001" ||
    outdoor.id === "OD-1F-SOUTH-001" ||
    outdoor.name.includes("北院") ||
    outdoor.name.includes("南院") ||
    outdoor.name.includes("庭院");
}

export function createUnifiedCourtyardModel({
  oneFloorStructure,
  yardStructure,
  furniture
}: {
  oneFloorStructure: HouseStructure;
  yardStructure: HouseStructure;
  furniture: Furniture[];
}) {
  const yardSurfaces = yardStructure.outdoorSurfaces.length > 0
    ? yardStructure.outdoorSurfaces
    : oneFloorStructure.outdoorSurfaces;
  const yardFences = yardStructure.fences.length > 0
    ? yardStructure.fences
    : oneFloorStructure.fences;
  const yardOutdoors = yardStructure.outdoors.length > 0
    ? [
        ...oneFloorStructure.outdoors.filter((outdoor) => !isCourtyardOutdoor(outdoor)),
        ...yardStructure.outdoors
      ]
    : oneFloorStructure.outdoors;

  const houseStructure: HouseStructure = {
    ...oneFloorStructure,
    outdoors: uniqueById(yardOutdoors),
    fences: uniqueById(yardFences),
    outdoorSurfaces: uniqueById(yardSurfaces)
  };

  return {
    houseStructure,
    // Furniture has already been scoped by UnifiedSceneGraph. Keep the exact
    // source objects so courtyard overview cannot drift into a second model.
    furniture
  };
}
