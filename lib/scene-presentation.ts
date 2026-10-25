import type { FixedCameraView } from "../types/space";

/** Floor-local camera heights are metres; authored story heights are millimetres. */
export function isFloorOverviewPresentation({ presentationMode, stackedVillaOverview, currentSpaceActive, exploration, fixedView, storyHeightMm }: {
  presentationMode: boolean;
  stackedVillaOverview: boolean;
  currentSpaceActive: boolean;
  exploration: boolean;
  fixedView: FixedCameraView | null;
  storyHeightMm: number;
}) {
  if (!presentationMode || stackedVillaOverview || currentSpaceActive || exploration) return false;
  // A free presentation opens on the overview. Authored eye-level shots must
  // not inherit its dim lighting, cutaway walls and suppressed ceiling.
  if (!fixedView) return true;
  return fixedView.cameraPosition.y > storyHeightMm / 1000 + 0.35;
}
