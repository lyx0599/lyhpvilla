import type { HouseDoor } from "@/types/space";

export type DoorOpeningRenderPolicy = {
  mode: "door" | "openPassage";
  drawFrame: boolean;
  drawLeaf: boolean;
  drawTrack: boolean;
  drawHardware: boolean;
  drawGlass: boolean;
  drawSwingArc: boolean;
};

/**
 * Shared 2D/3D policy for hosted door openings. `openPassage` is a wall cut,
 * not a zero-width sliding door: it owns no visible door components.
 */
export function getDoorOpeningRenderPolicy(door: HouseDoor): DoorOpeningRenderPolicy {
  const openPassage = door.visual?.style === "openPassage" || door.visual?.leafCount === 0;
  if (openPassage) {
    return {
      mode: "openPassage",
      drawFrame: false,
      drawLeaf: false,
      drawTrack: false,
      drawHardware: false,
      drawGlass: false,
      drawSwingArc: false
    };
  }
  const sliding = door.operation === "sliding";
  return {
    mode: "door",
    drawFrame: true,
    drawLeaf: true,
    drawTrack: sliding,
    drawHardware: true,
    drawGlass: door.material === "glass" || door.material === "translucentGlass" || door.visual?.style === "slimGlass" || door.visual?.style === "archedReededGlass",
    drawSwingArc: !sliding
  };
}

export function isOpenPassageDoor(door: HouseDoor) {
  return getDoorOpeningRenderPolicy(door).mode === "openPassage";
}
