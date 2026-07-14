import type { HouseStructure, MmPoint } from "@/types/space";

export type HostedOpeningCut = {
  id: string;
  kind: "door" | "window" | "bayWindow";
  startMm: number;
  endMm: number;
  bottomMm: number;
  topMm: number;
};

export type StraightHostPanel = {
  start: MmPoint;
  end: MmPoint;
  bottomMm: number;
  heightMm: number;
  startsAtFloor: boolean;
  reachesTop: boolean;
};

export const DOOR_3D_DISPLAY_HEIGHT_MM = 1320;
export const WINDOW_3D_DISPLAY_HEIGHT_MM = 680;
export const WINDOW_3D_SILL_HEIGHT_MM = 340;

export function getDoor3DDisplayHeight(openingHeightMm: number) {
  return Math.min(openingHeightMm, DOOR_3D_DISPLAY_HEIGHT_MM);
}

export function getWindow3DDisplayMetrics(hostHeightMm: number, openingHeightMm: number) {
  const heightMm = Math.min(openingHeightMm, WINDOW_3D_DISPLAY_HEIGHT_MM);
  return {
    heightMm,
    sillHeightMm: Math.min(WINDOW_3D_SILL_HEIGHT_MM, Math.max(0, hostHeightMm - heightMm))
  };
}

export function getOpeningSillHeight(hostHeightMm: number, openingHeightMm: number) {
  return Math.min(900, Math.max(450, hostHeightMm - openingHeightMm - 450));
}

export function getHostedOpeningCuts(
  structure: HouseStructure,
  hostId: string,
  hostType: "wall" | "partition",
  hostLengthMm: number,
  hostHeightMm: number
): HostedOpeningCut[] {
  const clampOffset = (value: number) => Math.min(hostLengthMm, Math.max(0, value));
  const toCut = (
    id: string,
    kind: HostedOpeningCut["kind"],
    positionOnWall: number,
    width: number,
    bottomMm: number,
    topMm: number
  ): HostedOpeningCut | null => {
    const centerMm = Math.min(1, Math.max(0, positionOnWall)) * hostLengthMm;
    const startMm = clampOffset(centerMm - width / 2);
    const endMm = clampOffset(centerMm + width / 2);
    if (endMm - startMm < 1) return null;
    return { id, kind, startMm, endMm, bottomMm, topMm };
  };

  const doors = structure.doors
    .filter((door) => door.hostId === hostId && door.hostType === hostType)
    .map((door) => toCut(door.id, "door", door.positionOnWall, door.width, 0, getDoor3DDisplayHeight(door.height)));
  const windows = structure.windows
    .filter((windowObject) => windowObject.hostId === hostId && windowObject.hostType === hostType)
    .map((windowObject) => {
      const { heightMm, sillHeightMm } = getWindow3DDisplayMetrics(hostHeightMm, windowObject.height);
      return toCut(
        windowObject.id,
        "window",
        windowObject.positionOnWall,
        windowObject.width,
        sillHeightMm,
        sillHeightMm + heightMm
      );
    });
  const bayWindows = hostType === "wall"
    ? structure.bayWindows
        .filter((bayWindow) => bayWindow.wallId === hostId)
        .map((bayWindow) => {
          const sillHeight = getOpeningSillHeight(hostHeightMm, bayWindow.height);
          return toCut(
            bayWindow.id,
            "bayWindow",
            bayWindow.positionOnWall,
            bayWindow.width,
            sillHeight,
            sillHeight + bayWindow.height
          );
        })
    : [];

  return [...doors, ...windows, ...bayWindows]
    .filter((cut): cut is HostedOpeningCut => Boolean(cut))
    .sort((a, b) => a.startMm - b.startMm || a.bottomMm - b.bottomMm);
}

function mergeRanges(ranges: Array<{ start: number; end: number }>) {
  return ranges
    .filter((range) => range.end - range.start >= 1)
    .sort((a, b) => a.start - b.start)
    .reduce<Array<{ start: number; end: number }>>((merged, range) => {
      const previous = merged[merged.length - 1];
      if (!previous || range.start > previous.end + 1) {
        merged.push({ ...range });
      } else {
        previous.end = Math.max(previous.end, range.end);
      }
      return merged;
    }, []);
}

export function getStraightHostPanels(
  start: MmPoint,
  end: MmPoint,
  displayHeightMm: number,
  cuts: HostedOpeningCut[]
): StraightHostPanel[] {
  const lengthMm = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
  const boundaries = Array.from(new Set([
    0,
    lengthMm,
    ...cuts.flatMap((cut) => [cut.startMm, cut.endMm])
  ].map((value) => Number(Math.min(lengthMm, Math.max(0, value)).toFixed(3))))).sort((a, b) => a - b);

  const pointAt = (offsetMm: number): MmPoint => {
    const t = offsetMm / lengthMm;
    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t
    };
  };

  return boundaries.slice(0, -1).flatMap((segmentStart, index) => {
    const segmentEnd = boundaries[index + 1];
    if (segmentEnd - segmentStart < 1) return [];
    const midpoint = (segmentStart + segmentEnd) / 2;
    const holes = mergeRanges(cuts
      .filter((cut) => midpoint > cut.startMm - 0.5 && midpoint < cut.endMm + 0.5)
      .map((cut) => ({
        start: Math.min(displayHeightMm, Math.max(0, cut.bottomMm)),
        end: Math.min(displayHeightMm, Math.max(0, cut.topMm))
      })));
    const solidRanges: Array<{ start: number; end: number }> = [];
    let cursor = 0;
    holes.forEach((hole) => {
      if (hole.start - cursor >= 1) solidRanges.push({ start: cursor, end: hole.start });
      cursor = Math.max(cursor, hole.end);
    });
    if (displayHeightMm - cursor >= 1) solidRanges.push({ start: cursor, end: displayHeightMm });

    return solidRanges.map((range) => ({
      start: pointAt(segmentStart),
      end: pointAt(segmentEnd),
      bottomMm: range.start,
      heightMm: range.end - range.start,
      startsAtFloor: range.start < 1,
      reachesTop: range.end > displayHeightMm - 1
    }));
  });
}
