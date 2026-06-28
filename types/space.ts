export type FloorId = "B2" | "B1" | "1F" | "2F" | "YARD";

export type ViewMode = "2d" | "3d";
export type PlannerMode = "view" | "edit";
export type DrawTool =
  | "select"
  | "wall-straight"
  | "wall-arc"
  | "partition"
  | "stair"
  | "fence"
  | "hardscape"
  | "path"
  | "planting"
  | "door"
  | "window"
  | "bay-window"
  | "outdoor";
export type GeometryType = "line" | "arc" | "polygon" | "point";
export type SpaceType = "Room" | "Zone" | "Outdoor" | "Partition";

export type ObjectInteractionFlags = {
  selected?: boolean;
  hover?: boolean;
  active?: boolean;
  locked?: boolean;
};

export type ObjectInteractionState = {
  selectedObjectId: string;
  hoveredObjectId: string;
  editingObjectId: string;
  lockedObjectIds: string[];
};

export type FloorPlanPreset = "clean_gray" | "light_blueprint" | "dark_line" | "warm_paper" | "high_contrast";

export type LayerVisibility = {
  baseFloorPlan: boolean;
  cleanupPatch: boolean;
  semanticOverlay: boolean;
  furnitureOverlay: boolean;
  debug: boolean;
};

export type FloorPlanVisualSettings = {
  preset: FloorPlanPreset;
  grayscale: boolean;
  opacity: number;
  contrast: number;
  brightness: number;
  saturation: number;
  sharpen: boolean;
  removeTextMarks: boolean;
  removeWhiteBorder: boolean;
  hideDebugFrames: boolean;
  cleanWhiteBackground: boolean;
  lineEnhance: boolean;
  repairMode: boolean;
  layerVisibility: LayerVisibility;
};

export type CleanPatch = {
  id: string;
  floorId: FloorId;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fillColor: string;
  notes: string;
};

export type FurnitureType = "sofa" | "table" | "bed" | "cabinet" | "chair" | "plant" | "custom";

export type Dimension = {
  width: number;
  depth: number;
  height: number;
  unit: "cm";
};

export type Position2D = {
  x: number;
  y: number;
  rotation: number;
};

export type MmPoint = {
  x: number;
  y: number;
};

export type FloorCoordinateSystem = {
  floorId: FloorId;
  origin: MmPoint;
  unit: "mm";
  width: number;
  height: number;
  scale: number;
  note: string;
};

export type WallKind = "straight" | "arc";

export type StraightHouseWall = {
  id: string;
  floorId: FloorId;
  name: string;
  kind: "straight";
  geometryType: "line";
  start: MmPoint;
  end: MmPoint;
  thickness: number;
  height: number;
  length: number;
};

export type ArcHouseWall = {
  id: string;
  floorId: FloorId;
  name: string;
  kind: "arc";
  geometryType: "arc";
  center: MmPoint;
  radius: number;
  startAngle: number;
  endAngle: number;
  thickness: number;
  height: number;
  direction: "clockwise" | "counterclockwise";
  length: number;
};

export type HouseWall = StraightHouseWall | ArcHouseWall;

export type HouseRoom = {
  id: string;
  floorId: FloorId;
  name: string;
  spaceType: "Room";
  geometryType: "polygon";
  boundary: MmPoint[];
  area: number;
  sourceWallIds: string[];
};

export type HousePartition = {
  id: string;
  name: string;
  floorId: FloorId;
  roomIds: string[];
  type: "partition";
  spaceType: "Partition";
  geometryType: "line";
  material: "glass" | "wood" | "gypsum" | "halfWall" | "movable";
  transparency: number;
  start: MmPoint;
  end: MmPoint;
  thickness: number;
  height: number;
  editable: true;
  removable: true;
};

export type HouseDoor = {
  id: string;
  floorId: FloorId;
  name: string;
  geometryType: "line";
  hostId: string;
  hostType: "wall" | "partition";
  positionOnWall: number;
  width: number;
  height: number;
  openDirection: "leftIn" | "rightIn" | "leftOut" | "rightOut";
};

export type HouseWindow = {
  id: string;
  floorId: FloorId;
  name: string;
  geometryType: "line";
  hostId: string;
  hostType: "wall" | "partition";
  positionOnWall: number;
  width: number;
  height: number;
};

export type HouseBayWindow = {
  id: string;
  floorId: FloorId;
  name: string;
  geometryType: "line";
  wallId: string;
  positionOnWall: number;
  width: number;
  depth: number;
  height: number;
};

export type HouseOutdoor = {
  id: string;
  floorId: FloorId;
  name: string;
  spaceType: "Outdoor";
  geometryType: "polygon";
  outdoorType: "frontYard" | "backYard" | "sideYard" | "bbq" | "lawn" | "patio";
  polygon: MmPoint[];
  area: number;
};

export type HouseFence = {
  id: string;
  floorId: FloorId;
  name: string;
  geometryType: "line";
  start: MmPoint;
  end: MmPoint;
  height: number;
  thickness: number;
  material: "wood" | "metal" | "masonry" | "hedge";
  editable: true;
  removable: true;
};

export type HouseOutdoorSurface = {
  id: string;
  floorId: FloorId;
  name: string;
  geometryType: "polygon";
  surfaceType: "hardscape" | "path" | "planting";
  polygon: MmPoint[];
  area: number;
  material: "stone" | "tile" | "gravel" | "grass" | "shrub" | "soil";
  editable: true;
  removable: true;
};

export type HouseStair = {
  id: string;
  floorId: FloorId;
  name: string;
  geometryType: "line";
  start: MmPoint;
  end: MmPoint;
  width: number;
  height: number;
  stepCount: number;
  direction: "up" | "down";
  editable: true;
  removable: true;
};

export type HouseStructureObject =
  | HouseWall
  | HousePartition
  | HouseStair
  | HouseFence
  | HouseOutdoorSurface
  | HouseRoom
  | HouseDoor
  | HouseWindow
  | HouseBayWindow
  | HouseOutdoor;

export type HouseStructure = {
  floorId: FloorId;
  coordinateSystem: FloorCoordinateSystem;
  walls: HouseWall[];
  rooms: HouseRoom[];
  partitions: HousePartition[];
  stairs: HouseStair[];
  fences: HouseFence[];
  outdoorSurfaces: HouseOutdoorSurface[];
  doors: HouseDoor[];
  windows: HouseWindow[];
  bayWindows: HouseBayWindow[];
  outdoors: HouseOutdoor[];
};

export type Room = {
  id: string;
  name: string;
  floorId: FloorId;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type Wall = {
  id: string;
  floorId: FloorId;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
};

export type Furniture = {
  id: string;
  code: string;
  name: string;
  type: FurnitureType;
  floorId: FloorId;
  roomId: string;
  dimensions: Dimension;
  material: string;
  note: string;
  position: Position2D;
  color: string;
  locked?: boolean;
  interaction?: ObjectInteractionFlags;
};

export type Floor = {
  id: FloorId;
  label: string;
  subtitle: string;
  floorPlanImage?: string;
  visualSettings?: FloorPlanVisualSettings;
  cleanPatches?: CleanPatch[];
};

export type SpaceData = {
  floors: Floor[];
  rooms: Room[];
  walls: Wall[];
  furniture: Furniture[];
};
