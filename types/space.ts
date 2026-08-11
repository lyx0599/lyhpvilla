import type { WorkspaceDocument } from "@/types/workspace";

export type FloorId = "B2" | "B1" | "1F" | "2F" | "YARD";

export type ViewMode = "2d" | "3d";
export type DrawingSheetType =
  | "sitePlan"
  | "structurePlan"
  | "demolitionAndBuildPlan"
  | "furniturePlan"
  | "socketPlan"
  | "switchPlan"
  | "lightingPlan"
  | "waterSupplyPlan"
  | "drainagePlan"
  | "ceilingPlan"
  | "floorFinishPlan"
  | "wallFinishPlan"
  | "materialPlan"
  | "annotationPlan";
export type DrawingCheckMode = "structureSyncCheck";
export type DrawingPresentationMode = "presentationView";
export type PlanCanvasMode = DrawingSheetType | DrawingCheckMode | DrawingPresentationMode;

export type DrawingItemCategory =
  | "socket" | "switch" | "light" | "waterSupply" | "drainage" | "ceiling"
  | "floorFinish" | "wallFinish" | "cabinet" | "annotation" | "network" | "ventilation";

export type DrawingItemSource = "manual" | "generated-from-furniture" | "generated-from-room";
export type DrawingItemStatus = "draft" | "confirmed" | "todo" | "deprecated";
/** Confidence records the delivery-stage maturity of MEP recommendations, not drawing-item approval. */
export type PointConfidence = "requirementConfirmed" | "schemePositioned" | "drawingVerified" | "siteMeasured" | "constructionConfirmed";
export type PointPositionRule = {
  type: "relativeToObject" | "relativeToWall" | "wallCenter" | "cabinetSegment" | "equipmentBay";
  anchor: "rearOrAdjacentCabinet" | "objectEdge" | "wallCorner" | "wallCenter" | "countertopZone" | "equipmentInstallBay";
  offsetMm?: number;
  side?: "left" | "right" | "front" | "rear" | "center";
};
export type LightingLayer = "ambient" | "task" | "accent" | "decorative" | "cabinetStrip" | "mirrorLight" | "outdoor";
export type LightMountingType =
  | "recessed" | "surfaceMounted" | "pendant" | "wallMounted" | "concealed"
  | "cabinetIntegrated" | "mirrorIntegrated" | "stepMounted" | "floorMounted"
  | "bollard" | "groundSpike";
export type LightColorTemperature = "2700K" | "3000K" | "3500K" | "4000K";
export type LightSpec = {
  powerW?: number;
  luminousFluxLm?: number;
  cri?: number;
  glareRating?: string;
  waterproofRating?: string;
  fixtureFamily?: string;
  trimColor?: string;
  iesProfileUrl?: string;
  photometricProfileId?: string;
};

export type LinearLightPathConfig = {
  pathMm: MmPoint[];
  widthMm?: number;
  diffuserDepthMm?: number;
  offsetBelowHostMm?: number;
  throwDistanceMm?: number;
  continuous?: boolean;
};

export type CoveProfileConfig = {
  pathMm: MmPoint[];
  dropMm: number;
  bandWidthMm: number;
  lipMm: number;
  cornerRadiusMm?: number;
  emitterOffsetMm?: number;
  pathMode?: "linear" | "catmullRom";
  closed?: boolean;
  curveSegments?: number;
};

export type SplineCeilingProfileConfig = {
  pathMm: MmPoint[];
  levelMm: number;
  thicknessMm?: number;
  pathMode?: "linear" | "catmullRom";
  closed?: boolean;
  curveSegments?: number;
  edgeRadiusMm?: number;
  materialResourceId?: string;
};

export type LinearDiffuserConfig = {
  pathMm: MmPoint[];
  widthMm: number;
  depthMm?: number;
  slotCount?: number;
  finish?: "darkBronze" | "black" | "warmWhite";
};

export type BaseboardRunConfig = {
  wallIds: string[];
  heightMm: number;
  thicknessMm?: number;
  recessMm?: number;
  finish?: "shadowGap" | "wallColor" | "wood" | "metal";
};

export type SlabLayoutConfig = {
  slabWidthMm: number;
  slabHeightMm: number;
  seamWidthMm?: number;
  directionDeg?: number;
  continuityGroup?: string;
  bookmatched?: boolean;
};

export type WallFinishZoneConfig = {
  startOffsetMm?: number;
  endOffsetMm?: number;
  bottomMm: number;
  topMm: number;
  buildUpMm?: number;
  panelWidthMm?: number;
  seamWidthMm?: number;
  seamDepthMm?: number;
  cornerRadiusMm?: number;
  wrapStartMm?: number;
  wrapEndMm?: number;
  uvRotationDeg?: number;
  materialResourceId?: string;
};
export type FloorFinishMaterial = "woodFloor" | "tile" | "stone" | "microcement" | "courtyardStone" | "grass" | "hardscape";
export type MaterialRoleId = "wallBase" | "wallFeature" | "floorMain" | "floorWet" | "ceilingBase" | "joineryMain" | "countertop" | "trimMetal" | "glassMain" | "fabricMain";
export type OutdoorSurfaceSource = DrawingItemSource | "default-workspace" | "yard-editor" | "imported";
export type OutdoorSurfaceStatus = DrawingItemStatus | "needs-site-check" | "design-intent";

export type DrawingItem = {
  id: string;
  floorId: FloorId;
  roomId: string | null;
  category: DrawingItemCategory;
  type: string;
  positionMm: { x: number; y: number };
  hostObjectId: string | null;
  hostWallId: string | null;
  relatedFurnitureId: string | null;
  heightMm: number | null;
  circuitId: string | null;
  materialId: string | null;
  materialToken?: string | null;
  materialRole?: MaterialRoleId | null;
  label: string;
  notes: string;
  source: DrawingItemSource;
  status: DrawingItemStatus;
  quantity: number;
  verificationMeta?: VerificationMeta;
  generatedKey?: string;
  generatedFingerprint?: string;
  /** Furniture center when this point was last positioned or reviewed. */
  relatedFurniturePositionMm?: MmPoint;
  /** Scheme-stage MEP metadata. Coordinates remain recommendations until constructionConfirmed. */
  confidence?: PointConfidence;
  positioningBasis?: "currentFurnitureLayout" | "currentCabinetLayout" | "developerDrawing" | "siteMeasurement" | "constructionCoordination";
  positionRule?: PointPositionRule | null;
  pendingConfirmations?: Array<"developerOriginalPoint" | "finishedWallDimension" | "circuitCapacity" | "existingCircuit" | "doorWindowPosition" | "wallPipeline" | "drainRiser" | "drainOutlet" | "cabinetShopDrawing">;
  serviceScenario?: string | null;
  /** 灯光专项 v1 标准字段；旧字段保留用于已保存工作区兼容。 */
  lightType?: string | null;
  lightingLayer?: LightingLayer | null;
  colorTemperature?: LightColorTemperature | null;
  beamAngle?: number | null;
  mountingType?: LightMountingType | null;
  relatedSwitchId?: string | null;
  controlGroupId?: string | null;
  smartControl?: boolean;
  dimming?: boolean;
  relatedRoomId?: string | null;
  hostCeilingAreaId?: string | null;
  lightSpec?: LightSpec | null;
  lightColorTemperature?: MepMeta["lightColorTemperature"] | null;
  needsSmartControl?: boolean;
  switchControl?: string[];
  relatedCircuit?: string | null;
  controlledLightIds?: string[];
  lightGroupId?: string | null;
  polygon?: MmPoint[];
  ceilingHeightMm?: number | null;
  relatedLightIds?: string[];
  inspectionAccess?: boolean;
  airVent?: boolean;
  returnAir?: boolean;
  maintenanceOpening?: boolean;
  material?: FloorFinishMaterial | string | null;
  pattern?: string | null;
  directionDeg?: number | null;
  startPoint?: MmPoint | null;
  seamWidthMm?: number | null;
  threshold?: string | null;
  transition?: string | null;
  wallId?: string | null;
  heightRange?: { minMm: number; maxMm: number } | null;
  area?: number | null;
  waterproofHeightMm?: number | null;
  specialTreatment?: string | null;
  /** Reusable construction profiles shared between the drawing and 3D layers. */
  linearLightPath?: LinearLightPathConfig | null;
  coveProfile?: CoveProfileConfig | null;
  wallFinishZone?: WallFinishZoneConfig | null;
  splineCeilingProfile?: SplineCeilingProfileConfig | null;
  linearDiffuser?: LinearDiffuserConfig | null;
  baseboardRun?: BaseboardRunConfig | null;
  slabLayout?: SlabLayoutConfig | null;
  createdAt: string;
  updatedAt: string;
};

export type DrawingPackage = {
  id: string;
  name: string;
  drawingItemIds: string[];
  createdAt: string;
  updatedAt: string;
};
export type AccessMode = "view-only" | "comment-only" | "controlled-edit" | "full-edit";
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

export type SyncObjectState = {
  visible?: boolean;
  hidden?: boolean;
  locked?: boolean;
};

export type VerificationStatus = "unverified" | "estimated" | "drawing-derived" | "site-measured" | "confirmed";
export type VerificationSource = "developer-plan" | "visual-estimate" | "manual-input" | "site-measurement" | "other";

export type VerificationMeta = {
  status: VerificationStatus;
  source: VerificationSource;
  sourceNote?: string;
  toleranceMm?: number;
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
};

export type VerificationState = {
  verificationMeta?: VerificationMeta;
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
  | "loungeCoffeeTable"
  | "slabTable"
  | "bed"
  | "nightstand"
  | "plant"
  | "cabinet"
  | "wallCabinet"
  | "fireplace"
  | "kitchenCabinet"
  | "snackCabinet"
  | "pegboard"
  | "bookshelf"
  | "island"
  | "cooktop"
  | "sink"
  | "fridge"
  | "washingMachine"
  | "instrumentRack"
  | "piano"
  | "tallCabinet"
  | "toilet"
  | "bathtub"
  | "shower"
  | "vanity"
  | "wardrobe"
  | "entryCabinet"
  | "sideboard"
  | "outdoorDiningSet"
  | "dryingRack"
  | "dogHouse"
  | "yardGate"
  | "outdoorCabinet"
  | "yardLight"
  | "outdoorSocket"
  | "drainPoint";
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
  | "wallCabinet"
  | "desk"
  | "bathroomVanity"
  | "toilet"
  | "bathtub"
  | "shower"
  | "sofa"
  | "coffeeTable"
  | "loungeCoffeeTable"
  | "diningTable"
  | "slabTable"
  | "diningChair"
  | "kitchenCabinet"
  | "island"
  | "sideboard"
  | "entryCabinet"
  | "fireplace"
  | "stair"
  | "paving"
  | "yardModule"
  | "outdoorDiningSet"
  | "dryingRack"
  | "dogHouse"
  | "yardGate"
  | "outdoorCabinet"
  | "yardLight"
  | "outdoorSocket"
  | "drainPoint"
  | "sink"
  | "cooktop"
  | "fridge"
  | "pegboard"
  | "bookshelf"
  | "snackCabinet"
  | "plant"
  | "piano"
  | "generic";

export type Render3DMeta = {
  assetType: string;
  variantId?: string;
  variationSeed?: number;
  detailLevel?: "draft" | "standard" | "presentation";
  stylePreset?: string;
  styleSource?: "generated" | "manual";
  styleLocked?: boolean;
  primaryMaterial?: string;
  secondaryMaterial?: string;
  accentMaterial?: string;
  primaryMaterialResourceId?: string;
  secondaryMaterialResourceId?: string;
  accentMaterialResourceId?: string;
  /** Per-instance cabinet finish overrides. These never mutate shared/canonical materials. */
  cabinetMaterialOverrides?: CabinetMaterialOverrides;
  modelAssetId?: string;
  assetUrl?: string;
  visibleIn3d?: boolean;
  selectableIn3d?: boolean;
  childrenMode?: "merged" | "grouped";
  /** Bottom elevation of the visual asset above finished floor. */
  elevationMm?: number;
  /** Optional soft furnishing underlay generated as part of a bed asset. */
  showRug?: boolean;
  /** Number of chairs generated around a procedural dining/slab table. */
  seatCount?: 2 | 4 | 6 | 8;
  kitchenVisual?: KitchenVisualConfig;
  cabinetVisual?: CabinetVisualConfig;
  bedVisual?: BedVisualConfig;
  wetAreaVisual?: WetAreaVisualConfig;
};

export type CabinetMaterialPart = "door" | "carcass" | "countertop" | "glass" | "hardware";

export type CabinetMaterialOverrides = Partial<Record<CabinetMaterialPart, string>>;

export type CabinetVisualConfig = {
  frontStyle?: "slab" | "shaker" | "fluted" | "glass";
  handleStyle?: "bar" | "edgePull" | "groove" | "knob";
  openingMode?: CabinetOpeningMode;
  floating?: boolean;
  toeKickHeightMm?: number;
  drawerCount?: number;
  glassTone?: "clear" | "gray" | "smoked";
  allDoorPanels?: boolean;
  layout?: "panels" | "squareGrid";
  gridColumns?: number;
  gridRows?: number;
  displayContents?: boolean;
  interiorLighting?: boolean;
  doorCount?: number;
  interiorSystem?: "shelves" | "pulloutBaskets";
  basketCount?: number;
  cornerRadiusMm?: number;
  openNicheWidthMm?: number;
  openNicheHeightMm?: number;
  openNicheSide?: "left" | "center" | "right";
  topGapMm?: number;
  sideGapMm?: number;
  plinthSetbackMm?: number;
  sideScribeMm?: number;
  bays?: Array<{
    widthRatio: number;
    frontType: "solid" | "glass" | "open" | "drawer";
    shelfCount?: number;
    interiorLighting?: boolean;
  }>;
};

export type BedVisualConfig = {
  headboardStyle?: "standard" | "storageShelf";
  shelfDepthMm?: number;
  shelfHeightMm?: number;
  chargingNiche?: boolean;
  panelCount?: number;
  panelGapMm?: number;
  topBandHeightMm?: number;
  underBedLighting?: boolean;
};

export type CountertopCutoutConfig = {
  kind: "sink" | "cooktop" | "custom";
  offsetMm?: number;
  widthMm: number;
  depthMm: number;
  cornerRadiusMm?: number;
};

export type KitchenVisualConfig = {
  cabinetKind?: "base" | "wall" | "tall" | "island" | "waterBar";
  doorCount?: number;
  drawerCount?: number;
  countertopThicknessMm?: number;
  backsplashHeightMm?: number;
  toeKickHeightMm?: number;
  overhangMm?: number;
  showUpperCabinets?: boolean;
  showRangeHood?: boolean;
  sinkBowls?: 1 | 2;
  faucetPlacement?: "offset" | "center";
  fridgeSurround?: "cabinet" | "none";
  appliancePanel?: "none" | "dishwasher" | "oven" | "steamOven";
  frontStyle?: "slab" | "shaker" | "fluted" | "glass";
  handleStyle?: "bar" | "edgePull" | "groove" | "knob";
  countertopEdge?: "eased" | "thin" | "waterfall";
  panelGapMm?: number;
  endPanelThicknessMm?: number;
  showCountertopSeams?: boolean;
  showInternalShadowGap?: boolean;
  countertopCutouts?: CountertopCutoutConfig[];
  cornerRadiusMm?: number;
  upperCabinetHeightMm?: number;
  upperCabinetDepthMm?: number;
};

export type WetAreaVisualConfig = {
  fixtureKind?: "vanity" | "toilet" | "shower" | "bathtub";
  basinCount?: 1 | 2;
  basinShape?: "round" | "rectangular";
  countertopThicknessMm?: number;
  floating?: boolean;
  mirrorStyle?: "none" | "round" | "roundedRect" | "cabinet";
  mirrorHeightMm?: number;
  mirrorCabinetDepthMm?: number;
  showerDoor?: "fixed" | "sliding" | "swing";
  frameFinish?: "black" | "bronze" | "minimal";
  toiletType?: "smart" | "closeCoupled" | "wallHung";
  bathtubType?: "freestanding" | "builtIn";
  showNiche?: boolean;
  showLinearDrain?: boolean;
};

export type ConstructionAnchorType =
  | "coldWater"
  | "hotWater"
  | "filteredWater"
  | "drain"
  | "power"
  | "gas"
  | "exhaust";

export type ConstructionAnchor = {
  id: string;
  type: ConstructionAnchorType;
  label: string;
  /** Local object coordinates: x=left/right, y=height, z=front/back. */
  positionMm: { x: number; y: number; z: number };
  installationHeightMm?: number;
  notes?: string;
};

export type ConstructionAnchorLayer = {
  points: ConstructionAnchor[];
  openingSizeMm?: { width: number; depth: number };
  installationHeightMm?: number;
  ventilationClearanceMm?: { top?: number; left?: number; right?: number; rear?: number };
  notes?: string;
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

export type FurnitureWallAnchor = {
  positionOnWall: number;
  offsetMm: number;
  side: "left" | "right" | "center";
  followWall: boolean;
  needsRebind?: boolean;
  suggestedWallId?: string;
};

export type FurnitureClearanceMeta = {
  frontMm?: number;
  leftMm?: number;
  rightMm?: number;
  rearMm?: number;
  serviceMm?: number;
  doorSwingMm?: number;
  notes?: string;
};

export type FixedCameraView = {
  id: string;
  name: string;
  floor: FloorId;
  cameraPosition: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  /** Perspective field of view. Legacy views omit it and keep the renderer default. */
  fov?: number;
  zoom?: number;
  mode?: "orthographic" | "perspective";
  description?: string;
  scope?: "floor" | "courtyard" | "export";
  targetArea?: "all" | "southYard" | "northYard" | "entryYard" | "southLiving" | string;
};

export type TourNodeType = "room" | "yard" | "corridor" | "stair" | "viewpoint";
export type TourNodeStatus = "active" | "draft" | "disabled";

/**
 * Read-only presentation camera node. Coordinates use the same Three.js scene
 * space as FixedCameraView so a node can later be reused for captures/exports.
 */
export type RoomTourView = {
  id: string;
  floorId: FloorId;
  roomId?: string;
  outdoorId?: string;
  name: string;
  type: TourNodeType;
  cameraPosition: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  fov?: number;
  zoom?: number;
  /** Automatic composition fits the whole room; authored preserves an approved interior viewpoint. */
  compositionMode?: "automatic" | "authored";
  /** Clear editing highlights before presenting this authored view. */
  clearSelectionOnActivate?: boolean;
  linkedNodeIds: string[];
  description: string;
  status: TourNodeStatus;
  sourceCameraViewId?: string;
  targetArea?: FixedCameraView["targetArea"];
  isFloorOverview?: boolean;
  supportedSheetTypes?: DrawingSheetType[];
  recommendedLightingSceneId?: string;
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

/** Cabinet families that have a real, usable storage volume. */
export type CabinetInteriorTemplate =
  | "wardrobe"
  | "kitchenBase"
  | "kitchenWall"
  | "kitchenTall"
  | "island"
  | "bathroomVanity"
  | "entry"
  | "shoe"
  | "storage"
  | "bookshelf"
  | "display"
  | "corner"
  | "generic";

export type CabinetOpeningMode = "swing" | "doubleSwing" | "sliding" | "drawer" | "liftUp" | "dropDown" | "open";

export type CabinetInteriorModuleKind =
  | "shelf"
  | "divider"
  | "drawer"
  | "hanging"
  | "open"
  | "closed"
  | "shoe"
  | "pullout"
  | "appliance"
  | "plumbing"
  | "clearance"
  | "waste"
  | "void";

export type CabinetInteriorModule = {
  id: string;
  kind: CabinetInteriorModuleKind;
  label: string;
  /** Millimetres from the inside-left / inside-bottom / inside-back corner. */
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  parentId?: string;
  fixed?: boolean;
  adjustable?: boolean;
  materialPart?: "carcass" | "door" | "countertop" | "glass" | "hardware";
  notes?: string;
};

export type CabinetInteriorLayout = {
  schemaVersion: 1;
  template: CabinetInteriorTemplate;
  panelThicknessMm: number;
  interiorWidthMm: number;
  interiorHeightMm: number;
  interiorDepthMm: number;
  openingMode: CabinetOpeningMode;
  doorCount: number;
  doorStates?: Record<string, boolean>;
  modules: CabinetInteriorModule[];
  notes?: string[];
  createdFrom?: "default" | "legacyWardrobe" | "saved";
};

export type CabinetInteriorCheckSeverity = "info" | "warning" | "error";

export type CabinetInteriorCheck = {
  code: string;
  severity: CabinetInteriorCheckSeverity;
  message: string;
  suggestion: string;
  moduleId?: string;
  actualMm?: number;
  requiredMm?: number;
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

export type WallSurfaceFinish = {
  material: string;
  materialToken?: string;
  materialRole?: MaterialRoleId;
  name: string;
  baseColor: string;
  textureAccent: string;
  roughness: number;
  textureScale?: number;
  materialResourceId?: string;
  physicalWidthMm?: number;
  physicalHeightMm?: number;
  uvRotationDeg?: number;
};

export type StraightHouseWall = SyncObjectState & VerificationState & {
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
  /** Optional finish for one wall face without changing the structural wall material. */
  surfaceFinish?: WallSurfaceFinish;
  /** Optional room-face finishes for shared walls whose two sides use different treatments. */
  surfaceFinishByRoomId?: Record<string, WallSurfaceFinish>;
  openness?: number;
};

export type ArcHouseWall = SyncObjectState & VerificationState & {
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
  /** Optional finish for one wall face without changing the structural wall material. */
  surfaceFinish?: WallSurfaceFinish;
  /** Optional room-face finishes for shared walls whose two sides use different treatments. */
  surfaceFinishByRoomId?: Record<string, WallSurfaceFinish>;
  openness?: number;
};

export type HouseWall = StraightHouseWall | ArcHouseWall;

export type HouseRoom = SyncObjectState & VerificationState & {
  id: string;
  floorId: FloorId;
  roomNumber: string;
  name: string;
  spaceType: "Room";
  geometryType: "polygon";
  boundary: MmPoint[];
  area: number;
  sourceWallIds: string[];
  /** Finished ceiling elevation above finished floor, used by ceiling-bound furniture. */
  finishedCeilingHeightMm?: number;
  /** Room-specific finishes override the global style while remaining editable workspace data. */
  surfaceFinishes?: {
    floor?: {
      material: FloorFinishMaterial | string;
      materialToken?: string;
      materialRole?: MaterialRoleId;
      name: string;
      baseColor: string;
      jointColor: string;
      textureAccent: string;
      roughness: number;
      tileWidthMm?: number;
      tileLengthMm?: number;
      seamWidthMm?: number;
      pattern?: string;
      directionDeg?: number;
      textureScale?: number;
      materialResourceId?: string;
      physicalWidthMm?: number;
      physicalHeightMm?: number;
      uvRotationDeg?: number;
    };
    wall?: WallSurfaceFinish;
  };
};

export type HousePartition = SyncObjectState & VerificationState & {
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

export type HouseDoor = SyncObjectState & VerificationState & {
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
  /** Authored presentation pose used when exploration mode is not controlling the door. */
  defaultOpenAmount?: number;
  material?: "solid" | "glass" | "translucentGlass" | "none";
  transparency?: number;
  visual?: {
    style: "standard" | "archedReededGlass" | "wovenReliefWood" | "doubleLeafWood" | "slimGlass" | "flushPanel" | "openPassage";
    woodColor?: string;
    frameColor?: string;
    hardwareColor?: string;
    glassColor?: string;
    leafCount?: 0 | 1 | 2;
    jambMode?: "standard" | "minimal" | "flush" | "portal";
    liningDepthMm?: number;
    revealWidthMm?: number;
    thresholdHeightMm?: number;
    finishMaterialResourceId?: string;
  };
};

export type HouseWindow = SyncObjectState & VerificationState & {
  id: string;
  floorId: FloorId;
  name: string;
  geometryType: "line";
  hostId: string;
  hostType: "wall" | "partition";
  positionOnWall: number;
  width: number;
  height: number;
  /** Finished-floor height of the lower edge. Missing on legacy windows. */
  sillHeightMm?: number;
  operation?: "fixed" | "sliding" | "casement" | "tiltTurn";
  openDirection?: "inward" | "outward" | "left" | "right";
};

export type HouseBayWindow = SyncObjectState & VerificationState & {
  id: string;
  floorId: FloorId;
  name: string;
  geometryType: "line";
  wallId: string;
  positionOnWall: number;
  width: number;
  depth: number;
  height: number;
  operation?: "fixed" | "casement";
  openDirection?: "inward" | "outward";
};

export type HouseSkylight = SyncObjectState & VerificationState & {
  id: string;
  floorId: FloorId;
  name: string;
  geometryType: "polygon";
  center: MmPoint;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  hostId?: string;
  wallId?: string;
  positionOnWall?: number;
  operation?: "fixed" | "manualOperable" | "electricOperable";
  openable?: boolean;
  motorized?: boolean;
  note?: string;
  editable: true;
  removable: true;
};

export type HouseOutdoor = SyncObjectState & VerificationState & {
  id: string;
  floorId: FloorId;
  name: string;
  spaceType: "Outdoor";
  geometryType: "polygon";
  outdoorType: "frontYard" | "backYard" | "sideYard" | "bbq" | "lawn" | "patio";
  polygon: MmPoint[];
  area: number;
};

/** A functional exterior room. Kept with the building structure so 2D, 3D,
 * drawings, checks and exploration all reference the same boundary. */
export type OutdoorZoneType = "outdoorKitchen" | "relax" | "laundry" | "drying" | "pet" | "garden" | "storage" | "plant";
export type OutdoorZone = SyncObjectState & VerificationState & {
  id: string;
  floorId: FloorId;
  outdoorId: string;
  name: string;
  zoneType: OutdoorZoneType;
  geometryType: "polygon";
  polygon: MmPoint[];
  area: number;
  activityClearanceMm?: number;
  weatherProtection?: "open" | "shade" | "covered" | "rainproof";
  notes?: string;
};

export type OutdoorObjectType = "bbq" | "outdoorIsland" | "outdoorCabinet" | "waterTap" | "dryingRack" | "dogHouse" | "planter" | "pathwayLight" | "raisedGardenBed" | "shadeUmbrella" | "petWash" | "hoseReel" | "toolRack" | "outdoorLaundry" | "landscapeRock";

export type HouseFence = SyncObjectState & {
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

export type HouseOutdoorSurface = SyncObjectState & {
  id: string;
  floorId: FloorId;
  name: string;
  label?: string;
  category?: "outdoorSurface" | "path" | "planting" | "hardscape";
  geometryType: "polygon";
  surfaceType: "hardscape" | "path" | "planting";
  polygon: MmPoint[];
  pathPoints?: MmPoint[];
  pathWidthMm?: number | null;
  area: number;
  material: "stone" | "slate" | "pebble" | "wood" | "concrete" | "tile" | "gravel" | "grass" | "shrub" | "soil";
  materialToken?: string;
  materialRole?: MaterialRoleId;
  notes?: string;
  status?: OutdoorSurfaceStatus;
  source?: OutdoorSurfaceSource;
  editable: true;
  removable: true;
};

export type HouseStair = SyncObjectState & VerificationState & {
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
  stairSystemId?: string;
  flightRole?: StairFlightRole;
  connectedFromFloorId?: FloorId;
  connectedToFloorId?: FloorId;
  landingId?: string;
  /** Requested clear landing depth; defaults to the stair width when omitted. */
  landingDepthMm?: number;
  visual?: {
    style?: "standard" | "showroomLightStone";
    treadMaterialResourceId?: string;
    riserMaterialResourceId?: string;
    nosingColor?: string;
    nosingWidthMm?: number;
    glassGuard?: boolean;
    handrailColor?: string;
    handrailWidthMm?: number;
    finishBuildUpPerSideMm?: number;
  };
  editable: true;
  removable: true;
};

export type StairFlightRole = "lower-flight" | "upper-flight";

export type StairLanding = {
  id: string;
  stairSystemId: string;
  lowerFloorId: FloorId;
  upperFloorId: FloorId;
  polygon: MmPoint[];
  centerLine: { start: MmPoint; end: MmPoint };
  elevationFromLowerFloorMm: number;
  width: number;
  depth: number;
  supportKind: "wall-bearing" | "beam-bearing" | "self-supporting";
  status: "draft" | "confirmed";
};

export type StairOpeningGuardEdge = {
  id: string;
  start: MmPoint;
  end: MmPoint;
  kind: "glass-railing" | "wall";
};

export type StairOpening = {
  id: string;
  stairSystemId: string;
  floorId: FloorId;
  polygon: MmPoint[];
  guardEdges: StairOpeningGuardEdge[];
  clearAccessFlightIds: string[];
  status: "draft" | "confirmed";
};

export type StairSystemLighting = {
  controlGroupId: string;
  lowerSwitchFloorId: FloorId;
  upperSwitchFloorId: FloorId;
  stepLightMode: "every-step";
  stepLightHeightAboveTreadMm: number;
  landingLightId: string;
  geometryFingerprint: string;
  syncStatus: "synchronized" | "needs-resync";
};

export type StairSystem = {
  id: string;
  lowerFloorId: FloorId;
  upperFloorId: FloorId;
  orientationRule: "left-down-right-up";
  lowerFlightId: string;
  upperFlightId: string;
  landingId: string;
  openingId: string;
  floorToFloorHeightMm: number;
  totalStepCount: number;
  lighting: StairSystemLighting;
  status: "draft" | "confirmed";
};

export type HouseColumn = SyncObjectState & VerificationState & {
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
  /** Optional presentation finish; structural geometry remains center/radius/height. */
  visualStyle?: "structuralConcrete" | "showroomLightStone" | "concealedByFinish";
  finishColor?: string;
  accentColor?: string;
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
  | HouseOutdoor
  | OutdoorZone;

export type HouseStructure = {
  floorId: FloorId;
  /** Canonical storey height. Falls back to the dominant real wall height for legacy data. */
  storyHeightMm?: number;
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
  outdoorZones: OutdoorZone[];
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
  outdoorId?: string;
  /** Outdoor equipment remains a normal unified furniture object, with an
   * explicit zone binding instead of a detached courtyard display model. */
  outdoorZoneId?: string;
  outdoorObjectType?: OutdoorObjectType;
  roomAssignmentLocked?: boolean;
  hostWallId?: string;
  wallAnchor?: FurnitureWallAnchor;
  clearanceMeta?: FurnitureClearanceMeta;
  dimensions: Dimension;
  cabinetHeight?: {
    kind: "base" | "wall" | "tall" | "fullHeight" | "halfHeight";
    /** Required shadow-gap/closure between a full-height cabinet and finished ceiling. */
    topClosureMm?: number;
    source?: "explicit" | "roomCeiling" | "storyHeight" | "inferred";
  };
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
  /** Optional per-instance storage layout. Created on first entry to cabinet design. */
  cabinetInterior?: CabinetInteriorLayout;
  render3d?: Render3DMeta;
  mepMeta?: MepMeta;
  constructionMeta?: ConstructionMeta;
  /** Lightweight hidden construction points bound to this editable object. */
  constructionAnchors?: ConstructionAnchorLayer;
  /** Persisted user decision that prevents automatic lighting regeneration for this object. */
  lightingDesignExcluded?: boolean;
  locked?: boolean;
  visible?: boolean;
  hidden?: boolean;
  interaction?: ObjectInteractionFlags;
  verificationMeta?: VerificationMeta;
};

export type OutdoorObject = Furniture & {
  outdoorId: string;
  outdoorZoneId: string;
  outdoorObjectType: OutdoorObjectType;
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
  workspace: WorkspaceDocument;
  selectedFloorId?: FloorId;
  floors: Floor[];
  legacyRooms?: Room[];
  legacyWalls?: Wall[];
  /** @deprecated Use houseStructuresByFloor.*.rooms through workspace. */
  rooms?: Room[];
  /** @deprecated Use houseStructuresByFloor.*.walls through workspace. */
  walls?: Wall[];
  furniture: Furniture[];
  drawingItems: DrawingItem[];
  cameraViews?: FixedCameraView[];
};
