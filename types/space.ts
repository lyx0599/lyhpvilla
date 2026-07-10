export type FloorId = "B2" | "B1" | "1F" | "2F" | "YARD";

export type ViewMode = "2d" | "3d";
export type AppViewMode = "desktop-edit" | "mobile-presentation" | "mobile-edit";
export type MobileDisplayLevel = "simple" | "annotated" | "professional";
export type MobileQuality = "balanced" | "high";
export type PlannerMode = "view" | "edit";
export type DrawTool =
  | "select"
  | "wall-straight"
  | "wall-arc"
  | "partition"
  | "stair"
  | "column"
  | "fence"
  | "hardscape"
  | "hardscape-rect"
  | "path"
  | "planting"
  | "door"
  | "window"
  | "bay-window"
  | "skylight"
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

export type InteriorModuleCategory = "living" | "bedroom" | "kitchen" | "bath" | "storage" | "decor";
export type InteriorModuleType =
  | "sofa"
  | "table"
  | "bed"
  | "nightstand"
  | "plant"
  | "cabinet"
  | "fireplace"
  | "kitchenCabinet"
  | "snackCabinet"
  | "pegboard"
  | "bookshelf"
  | "island"
  | "cooktop"
  | "sink"
  | "fridge"
  | "tallCabinet"
  | "toilet"
  | "bathtub"
  | "shower"
  | "vanity"
  | "wardrobe"
  | "entryCabinet"
  | "sideboard";
export type ModuleServiceRequirements = {
  water: boolean;
  drainage: boolean;
  power: boolean;
  exhaust: boolean;
};
export type FurnitureType =
  | "sofa"
  | "table"
  | "bed"
  | "cabinet"
  | "chair"
  | "plant"
  | "custom"
  | InteriorModuleType;

export type Render3DAssetType =
  | "bed"
  | "nightstand"
  | "wardrobe"
  | "walkInCloset"
  | "cabinet"
  | "desk"
  | "bathroomVanity"
  | "toilet"
  | "bathtub"
  | "shower"
  | "sofa"
  | "coffeeTable"
  | "diningTable"
  | "diningChair"
  | "kitchenCabinet"
  | "island"
  | "sideboard"
  | "entryCabinet"
  | "fireplace"
  | "stair"
  | "paving"
  | "yardModule"
  | "sink"
  | "cooktop"
  | "fridge"
  | "pegboard"
  | "bookshelf"
  | "snackCabinet"
  | "plant"
  | "generic";

export type Render3DMeta = {
  assetType: string;
  detailLevel?: "draft" | "standard" | "presentation";
  stylePreset?: string;
  primaryMaterial?: string;
  secondaryMaterial?: string;
  accentMaterial?: string;
  visibleIn3d?: boolean;
  selectableIn3d?: boolean;
  childrenMode?: "merged" | "grouped";
};

export type MepMeta = {
  needsSocket?: boolean;
  socketCount?: number;
  socketHeight?: number;
  needsSwitch?: boolean;
  switchControl?: string[];
  needsLighting?: boolean;
  lightingType?: "ambient" | "task" | "cabinetStrip" | "mirrorLight" | "decorative" | "none";
  lightColorTemperature?: "2700K" | "3000K" | "3500K" | "4000K";
  needsWaterSupply?: boolean;
  waterSupplyType?: "cold" | "hotCold" | "filtered" | "none";
  needsDrainage?: boolean;
  drainageType?: "floorDrain" | "wallDrain" | "cabinetDrain" | "none";
  needsNetwork?: boolean;
  needsVentilation?: boolean;
  needsSmartControl?: boolean;
  relatedCircuit?: string;
  notes?: string;
};

export type ConstructionMeta = {
  customMade?: boolean;
  installType?: "finishedFurniture" | "customCabinet" | "builtIn" | "wallMounted" | "floorStanding" | "embedded" | "other";
  reserveSize?: string;
  wallDependency?: string;
  floorDependency?: string;
  ceilingDependency?: string;
  waterproofRequired?: boolean;
  inspectionAccessRequired?: boolean;
  purchaseCategory?: string;
  supplierType?: string;
  notes?: string;
};

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
  flipX?: boolean;
  flipY?: boolean;
};

export type FixedCameraView = {
  id: string;
  name: string;
  floor: FloorId;
  cameraPosition: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom?: number;
  mode?: "orthographic" | "perspective";
  description?: string;
};

export type WardrobeCellKind = "hanging-long" | "hanging-short" | "folded" | "drawer" | "open" | "shoe" | "blank";

export type WardrobeCell = {
  id: string;
  column: number;
  row: number;
  kind: WardrobeCellKind;
};

export type WardrobeModule = {
  id: string;
  kind: WardrobeCellKind;
  label?: string;
  column?: number;
  columnSpan?: number;
  drawerRows?: number;
  drawerColumns?: number;
  drawerRowHeights?: number[];
  shelfCount?: number;
  shelfLayerHeights?: number[];
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WardrobeDesign = {
  columns: number;
  rows: number;
  cells: WardrobeCell[];
  modules?: WardrobeModule[];
  columnWidths?: number[];
  notes: string;
  shelfRows?: number;
  drawerCount?: number;
  hangingZones?: number;
  foldedZones?: number;
  shoeRack?: boolean;
};

export type CabinetDesignZone = {
  id: string;
  label: string;
  role: string;
  widthPercent: number;
  heightPercent: number;
  detail: string;
  serviceNote?: string;
};

export type CabinetDesign = {
  template: "kitchenCabinet" | "snackCabinet" | "entryCabinet" | "pegboard" | "bookshelf" | "sideboard" | "tallCabinet" | "cabinet" | "island" | "fireplace";
  title: string;
  designThinking: string;
  recommendedPlacement: string;
  layoutNotes: string[];
  zones: CabinetDesignZone[];
  cautionNotes: string[];
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
export type HouseWallBarrierType = "wall" | "railing";
export type HouseWallMaterial = "masonry" | "metal" | "glass" | "wood";

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
  barrierType?: HouseWallBarrierType;
  material?: HouseWallMaterial;
  openness?: number;
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
  barrierType?: HouseWallBarrierType;
  material?: HouseWallMaterial;
  openness?: number;
};

export type HouseWall = StraightHouseWall | ArcHouseWall;

export type HouseRoom = {
  id: string;
  floorId: FloorId;
  roomNumber: string;
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
  operation?: "swing" | "sliding";
  material?: "solid" | "glass" | "translucentGlass";
  transparency?: number;
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

export type HouseSkylight = {
  id: string;
  floorId: FloorId;
  name: string;
  geometryType: "polygon";
  center: MmPoint;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  operation?: "fixed" | "manualOperable" | "electricOperable";
  openable?: boolean;
  motorized?: boolean;
  note?: string;
  editable: true;
  removable: true;
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
  material: "stone" | "slate" | "pebble" | "wood" | "concrete" | "tile" | "gravel" | "grass" | "shrub" | "soil";
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
  baseHeight?: number;
  height: number;
  stepCount: number;
  direction: "up" | "down";
  editable: true;
  removable: true;
};

export type HouseColumn = {
  id: string;
  floorId: FloorId;
  name: string;
  geometryType: "point";
  columnType: "cylindrical";
  center: MmPoint;
  radius: number;
  height: number;
  material: "reinforcedConcrete" | "steel" | "masonry";
  supportsFloorId?: FloorId;
  editable: true;
  removable: true;
};

export type HouseStructureObject =
  | HouseWall
  | HousePartition
  | HouseStair
  | HouseColumn
  | HouseFence
  | HouseOutdoorSurface
  | HouseRoom
  | HouseDoor
  | HouseWindow
  | HouseBayWindow
  | HouseSkylight
  | HouseOutdoor;

export type HouseStructure = {
  floorId: FloorId;
  coordinateSystem: FloorCoordinateSystem;
  walls: HouseWall[];
  rooms: HouseRoom[];
  partitions: HousePartition[];
  stairs: HouseStair[];
  columns: HouseColumn[];
  fences: HouseFence[];
  outdoorSurfaces: HouseOutdoorSurface[];
  doors: HouseDoor[];
  windows: HouseWindow[];
  bayWindows: HouseBayWindow[];
  skylights: HouseSkylight[];
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
  moduleCategory?: InteriorModuleCategory;
  moduleType?: InteriorModuleType;
  catalogId?: string;
  floorId: FloorId;
  roomId: string;
  dimensions: Dimension;
  material: string;
  note: string;
  serviceRequirements?: ModuleServiceRequirements;
  constructionNote?: string;
  position: Position2D;
  color: string;
  referenceImageDataUrl?: string;
  referenceImageName?: string;
  recognitionStatus?: "none" | "image-attached" | "ai-pending" | "ai-ready";
  recognitionNote?: string;
  wardrobeDesign?: WardrobeDesign;
  cabinetDesign?: CabinetDesign;
  render3d?: Render3DMeta;
  mepMeta?: MepMeta;
  constructionMeta?: ConstructionMeta;
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
  selectedFloorId?: FloorId;
  floors: Floor[];
  rooms: Room[];
  walls: Wall[];
  furniture: Furniture[];
  cameraViews?: FixedCameraView[];
};
