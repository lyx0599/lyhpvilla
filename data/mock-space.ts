import defaultWorkspace from "@/data/default-workspace.json";
import { applyWorkspaceMigrations } from "@/lib/workspace-migrations";
import type { SpaceData } from "@/types/space";
import type { WorkspaceDocument } from "@/types/workspace";

const assetBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const migratedDefaultWorkspace = applyWorkspaceMigrations(defaultWorkspace as unknown as WorkspaceDocument);

function assetPath(path: string | undefined) {
  if (!path || /^(?:data:|blob:|https?:\/\/)/.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!assetBasePath || normalizedPath === assetBasePath || normalizedPath.startsWith(`${assetBasePath}/`)) {
    return normalizedPath;
  }
  return `${assetBasePath}${normalizedPath}`;
}

const resolvedFloors = migratedDefaultWorkspace.workspace.floors.map((floor) => ({
  ...floor,
  floorPlanImage: assetPath(floor.floorPlanImage)
}));

/**
 * Compatibility adapter for SpacePlanner. Real project data lives only in
 * data/default-workspace.json; this module only resolves deploy-time asset paths.
 */
export const defaultSpaceData: SpaceData = {
  workspace: {
    ...migratedDefaultWorkspace.workspace,
    floors: resolvedFloors
  },
  selectedFloorId: migratedDefaultWorkspace.workspace.selectedFloorId,
  floors: resolvedFloors,
  furniture: migratedDefaultWorkspace.workspace.furniture,
  cameraViews: migratedDefaultWorkspace.workspace.cameraViews,
  legacyRooms: [],
  legacyWalls: []
};

export const defaultWorkspaceSourceReport = migratedDefaultWorkspace.sources;

/** @deprecated Use defaultSpaceData; retained for older imports only. */
export const mockSpaceData = defaultSpaceData;
