import { getStructureCameraBounds } from "./camera-composition.ts";
import type {
  DrawingItem,
  FixedCameraView,
  FloorId,
  Furniture,
  HouseStructure,
  StairLanding,
  StairOpening,
  StairSystem
} from "../types/space.ts";
import type { LightingDesign } from "../types/workspace.ts";

export type RenderPreflightSeverity = "error" | "warning";
export type RenderPreflightCategory = "camera" | "geometry" | "materials" | "lighting" | "visibility" | "render-settings";

export type RenderPreflightIssue = {
  code: string;
  severity: RenderPreflightSeverity;
  category: RenderPreflightCategory;
  title: string;
  message: string;
  suggestion: string;
  objectId?: string;
};

export type RenderSceneEvidence = {
  inspected: boolean;
  visibleObjectIds: string[];
  cameraInsideObjectIds: string[];
  occludedFocusObjectId?: string;
};

export type RenderPreflightCamera = Pick<FixedCameraView, "id" | "name" | "floor" | "cameraPosition" | "target" | "fov" | "targetArea" | "description"> & {
  focus?: {
    kind: "wholeVilla" | "floor" | "room" | "object" | "wall" | "ceiling" | "lighting";
    floorId: FloorId;
    roomId?: string;
    outdoorId?: string;
    objectId?: string;
    wallId?: string;
    label?: string;
  };
};

export type RenderPreflightInput = {
  floorId: FloorId;
  structure: HouseStructure;
  structuresByFloor?: Partial<Record<FloorId, HouseStructure>>;
  furniture: Furniture[];
  drawingItems: DrawingItem[];
  stairSystems?: StairSystem[];
  stairLandings?: StairLanding[];
  stairOpenings?: StairOpening[];
  lightingDesign?: LightingDesign;
  camera: RenderPreflightCamera;
  presentationMode: boolean;
  materialPreview: boolean;
  wallDisplayMode: "cutaway" | "full" | "exteriorHidden" | "exteriorTransparent" | "allTransparent";
  roomCeilingMode: "hidden" | "translucent" | "solid";
  cameraCollisionEnabled: boolean;
  lightingScene: "dayWithLights" | "dusk" | "night" | "artificialOnly" | "beamAnalysis";
  lightingSceneId?: string;
  enabledLightCount?: number;
  knownRenderMaterialTokens?: ReadonlySet<string>;
  knownPbrMaterialTokens?: ReadonlySet<string>;
  sceneEvidence?: RenderSceneEvidence;
};

export type RenderPreflightResult = {
  status: "blocked" | "warning" | "ready";
  issues: RenderPreflightIssue[];
  errorCount: number;
  warningCount: number;
  checkCount: number;
  passedCheckCount: number;
  summary: string;
};

const MM_PER_M = 1000;
const VALID_COLOR_TEMPERATURES = new Set(["2700K", "3000K", "3500K", "4000K"]);

function finiteVector(value: { x: number; y: number; z: number }) {
  return [value.x, value.y, value.z].every(Number.isFinite);
}

function pointToSegmentDistance(point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 0.0001) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function angleWithinArc(angle: number, start: number, end: number, direction: "clockwise" | "counterclockwise") {
  const a = normalizeDegrees(angle);
  const s = normalizeDegrees(start);
  const e = normalizeDegrees(end);
  if (direction === "clockwise") return normalizeDegrees(s - a) <= normalizeDegrees(s - e) + 0.001;
  return normalizeDegrees(a - s) <= normalizeDegrees(e - s) + 0.001;
}

function cameraPlanPoint(camera: RenderPreflightCamera, structure: HouseStructure) {
  const width = structure.coordinateSystem?.width ?? 12000;
  const height = structure.coordinateSystem?.height ?? 9000;
  return {
    x: camera.cameraPosition.x * MM_PER_M + width / 2,
    y: camera.cameraPosition.z * MM_PER_M + height / 2
  };
}

function cameraIntersectingWall(camera: RenderPreflightCamera, structure: HouseStructure) {
  const point = cameraPlanPoint(camera, structure);
  const cameraHeightMm = camera.cameraPosition.y * MM_PER_M;
  for (const wall of structure.walls) {
    if (wall.hidden || wall.visible === false || wall.barrierType === "railing" || cameraHeightMm > wall.height + 120) continue;
    const clearance = wall.thickness / 2 + 45;
    if (wall.kind === "straight" && pointToSegmentDistance(point, wall.start, wall.end) < clearance) return wall.id;
    if (wall.kind === "arc") {
      const dx = point.x - wall.center.x;
      const dy = point.y - wall.center.y;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      if (Math.abs(Math.hypot(dx, dy) - wall.radius) < clearance && angleWithinArc(angle, wall.startAngle, wall.endAngle, wall.direction)) return wall.id;
    }
  }
  for (const partition of structure.partitions) {
    if (partition.hidden || partition.visible === false || cameraHeightMm > partition.height + 120) continue;
    if (pointToSegmentDistance(point, partition.start, partition.end) < partition.thickness / 2 + 45) return partition.id;
  }
  return null;
}

function expectedSurfaceToken(material: string, name: string) {
  const source = `${material} ${name}`.toLowerCase();
  if (/limestone|石灰岩/.test(source)) return "warmGreyStone";
  if (/oak.*floor|wood.*floor|timber.*floor|木地板|橡木宽板|实木宽板/.test(source)) return "oakFloor";
  if (/lime(?!stone)|plaster|paint|mineral|石灰(?!岩)|矿物|涂料|乳胶漆/.test(source)) return "warmWhiteMineral";
  if (/microcement|微水泥/.test(source)) return "microCement";
  if (/dark.*wood|walnut|胡桃|深棕木/.test(source)) return "darkWalnut";
  if (/oak|veneer|wood|橡木|木饰面/.test(source)) return "warmOak";
  if (/wet|anti.?slip|tile|瓷砖|防滑砖/.test(source)) return "wetAreaTile";
  if (/travertine|洞石/.test(source)) return "travertine";
  if (/stone|石材|岩板/.test(source)) return "warmGreyStone";
  return null;
}

function furnitureVisibleIn3D(item: Furniture) {
  return item.floorId && !item.hidden && item.visible !== false && item.render3d?.visibleIn3d !== false;
}

function findExactFurnitureDuplicates(items: Furniture[]) {
  const signatures = new Map<string, string>();
  const duplicates: Array<{ firstId: string; duplicateId: string }> = [];
  items.forEach((item) => {
    const signature = [
      item.floorId,
      item.roomId ?? "",
      item.render3d?.assetType ?? item.type,
      item.render3d?.variantId ?? item.moduleType ?? "",
      item.position.x.toFixed(3),
      item.position.y.toFixed(3),
      item.position.rotation.toFixed(2),
      item.dimensions.width,
      item.dimensions.depth,
      item.dimensions.height
    ].join("|");
    const firstId = signatures.get(signature);
    if (firstId) duplicates.push({ firstId, duplicateId: item.id });
    else signatures.set(signature, item.id);
  });
  return duplicates;
}

export function runRenderPreflight(input: RenderPreflightInput): RenderPreflightResult {
  const issues: RenderPreflightIssue[] = [];
  const checks = new Set<string>();
  const failedChecks = new Set<string>();
  const add = (check: string, issue: RenderPreflightIssue) => {
    checks.add(check);
    failedChecks.add(check);
    issues.push(issue);
  };
  const pass = (check: string) => checks.add(check);
  const camera = input.camera;

  pass("camera-pose");
  if (!finiteVector(camera.cameraPosition) || !finiteVector(camera.target)) add("camera-pose", {
    code: "CAMERA_POSE_INVALID", severity: "error", category: "camera", title: "相机坐标无效",
    message: "摄影机位置或观察目标包含无效数值。", suggestion: "恢复已保存机位或重新选择空间视角。"
  });
  if (camera.floor !== input.floorId || camera.focus?.floorId && camera.focus.floorId !== input.floorId) add("camera-pose", {
    code: "CAMERA_FLOOR_MISMATCH", severity: "error", category: "camera", title: "相机楼层不一致",
    message: `当前楼层是 ${input.floorId}，但摄影机绑定到 ${camera.floor}。`, suggestion: "先切换到摄影机所属楼层，再进行渲染。"
  });
  const cameraDistance = Math.hypot(camera.cameraPosition.x - camera.target.x, camera.cameraPosition.y - camera.target.y, camera.cameraPosition.z - camera.target.z);
  if (cameraDistance < 0.3) add("camera-pose", {
    code: "CAMERA_TARGET_TOO_CLOSE", severity: "error", category: "camera", title: "相机没有有效观察方向",
    message: `相机与观察目标仅相距 ${cameraDistance.toFixed(2)}m。`, suggestion: "把观察目标放到主要空间或家具上。"
  });

  pass("camera-fov");
  const fov = camera.fov ?? 42;
  if (fov > 68) add("camera-fov", {
    code: "CAMERA_FOV_BLOCKING", severity: "error", category: "camera", title: "广角变形过大",
    message: `当前视野为 ${Math.round(fov)}°，墙体和柜体容易明显变形。`, suggestion: "将 FOV 调整到 42–58°，必要时向后移动机位。"
  });
  else if (fov > 60) add("camera-fov", {
    code: "CAMERA_FOV_WIDE", severity: "warning", category: "camera", title: "视野偏广",
    message: `当前视野为 ${Math.round(fov)}°，边缘物体可能拉伸。`, suggestion: "优先使用 42–58° 的自然室内镜头。"
  });
  if (fov < 28) add("camera-fov", {
    code: "CAMERA_FOV_NARROW", severity: "warning", category: "camera", title: "视野过窄",
    message: `当前视野为 ${Math.round(fov)}°，可能无法说明整体关系。`, suggestion: "整体机位建议使用 38–58°。"
  });

  pass("camera-height");
  const interiorFocus = camera.focus && ["room", "object", "lighting"].includes(camera.focus.kind);
  if (interiorFocus && (camera.cameraPosition.y < 0.75 || camera.cameraPosition.y > 2.1)) add("camera-height", {
    code: "CAMERA_HEIGHT_UNNATURAL", severity: "warning", category: "camera", title: "室内机位高度不自然",
    message: `当前相机高度为 ${camera.cameraPosition.y.toFixed(2)}m。`, suggestion: "普通室内机位建议控制在 1.35–1.70m。"
  });

  pass("camera-boundary");
  const bounds = getStructureCameraBounds(input.structure, false);
  const targetOutside = camera.target.x < bounds.minX - 0.8 || camera.target.x > bounds.maxX + 0.8 || camera.target.z < bounds.minZ - 0.8 || camera.target.z > bounds.maxZ + 0.8;
  if (targetOutside) add("camera-boundary", {
    code: "CAMERA_TARGET_OUTSIDE_MODEL", severity: "error", category: "camera", title: "观察目标脱离当前户型",
    message: "相机正在看向当前楼层建筑范围之外。", suggestion: "重新锁定目标房间、楼梯或家具。"
  });
  const wallHit = finiteVector(camera.cameraPosition) ? cameraIntersectingWall(camera, input.structure) : null;
  if (wallHit) add("camera-boundary", {
    code: "CAMERA_INSIDE_WALL", severity: "error", category: "geometry", title: "相机进入墙体",
    message: `相机位置与墙体或隔墙 ${wallHit} 重叠。`, suggestion: "向房间内移动机位，并保持相机碰撞开启。", objectId: wallHit
  });

  pass("focus-reference");
  if (camera.focus?.roomId && !input.structure.rooms.some((room) => room.id === camera.focus?.roomId)) add("focus-reference", {
    code: "FOCUS_ROOM_MISSING", severity: "error", category: "visibility", title: "目标房间不存在",
    message: `机位引用的房间 ${camera.focus.roomId} 不在当前楼层。`, suggestion: "重新绑定当前房间。", objectId: camera.focus.roomId
  });
  if (camera.focus?.wallId && !input.structure.walls.some((wall) => wall.id === camera.focus?.wallId)) add("focus-reference", {
    code: "FOCUS_WALL_MISSING", severity: "error", category: "visibility", title: "目标墙体不存在",
    message: `机位引用的墙体 ${camera.focus.wallId} 已失效。`, suggestion: "重新绑定当前墙面。", objectId: camera.focus.wallId
  });
  const focusFurniture = camera.focus?.objectId ? input.furniture.find((item) => item.id === camera.focus?.objectId && item.floorId === input.floorId) : null;
  if (camera.focus?.objectId && !focusFurniture && !input.drawingItems.some((item) => item.id === camera.focus?.objectId)) add("focus-reference", {
    code: "FOCUS_OBJECT_MISSING", severity: "error", category: "visibility", title: "目标对象不存在",
    message: `机位引用的对象 ${camera.focus.objectId} 已删除或不在当前楼层。`, suggestion: "重新选择拍摄对象。", objectId: camera.focus.objectId
  });
  if (focusFurniture && !furnitureVisibleIn3D(focusFurniture)) add("focus-reference", {
    code: "FOCUS_OBJECT_HIDDEN", severity: "error", category: "visibility", title: "目标家具被隐藏",
    message: `${focusFurniture.name} 在3D中不可见。`, suggestion: "恢复对象可见性或更换拍摄目标。", objectId: focusFurniture.id
  });

  pass("model-geometry");
  if (!input.structure.rooms.length || !input.structure.walls.length) add("model-geometry", {
    code: "STRUCTURE_INCOMPLETE", severity: "error", category: "geometry", title: "建筑模型不完整",
    message: "当前楼层缺少房间或墙体数据。", suggestion: "先修复2D/3D结构数据，再进行渲染。"
  });
  const floorFurniture = input.furniture.filter((item) => item.floorId === input.floorId && furnitureVisibleIn3D(item));
  const duplicateIds = floorFurniture.filter((item, index) => floorFurniture.findIndex((candidate) => candidate.id === item.id) !== index);
  duplicateIds.forEach((item) => add("model-geometry", {
    code: "DUPLICATE_FURNITURE_ID", severity: "error", category: "geometry", title: "家具ID重复",
    message: `${item.name} 的对象ID ${item.id} 重复。`, suggestion: "删除重复数据或为对象分配唯一ID。", objectId: item.id
  }));
  findExactFurnitureDuplicates(floorFurniture).forEach(({ firstId, duplicateId }) => add("model-geometry", {
    code: "DUPLICATE_FURNITURE_GEOMETRY", severity: "error", category: "geometry", title: "发现完全重叠的重复家具",
    message: `${firstId} 与 ${duplicateId} 的类型、尺寸和位置完全相同。`, suggestion: "确认是否误复制；渲染前只保留一个对象。", objectId: duplicateId
  }));
  floorFurniture.forEach((item) => {
    if (item.roomId && !input.structure.rooms.some((room) => room.id === item.roomId) && !input.structure.outdoors.some((outdoor) => outdoor.id === item.roomId)) add("model-geometry", {
      code: "FURNITURE_ROOM_MISSING", severity: "error", category: "geometry", title: "家具房间引用失效",
      message: `${item.name} 引用了不存在的空间 ${item.roomId}。`, suggestion: "重新绑定家具所属房间。", objectId: item.id
    });
    if (!item.render3d) add("model-geometry", {
      code: "FURNITURE_RENDER_META_MISSING", severity: "error", category: "geometry", title: "家具缺少3D定义",
      message: `${item.name} 没有可验证的3D资产定义。`, suggestion: "为该对象选择3D资产和变体。", objectId: item.id
    });
  });

  pass("material-inheritance");
  if (!input.materialPreview) add("material-inheritance", {
    code: "MATERIAL_PREVIEW_DISABLED", severity: "error", category: "materials", title: "材质预览未开启",
    message: "当前输出不会使用已确认的PBR材质。", suggestion: "开启材质预览后重新检查。"
  });
  floorFurniture.forEach((item) => {
    const materialTokens = [item.render3d?.primaryMaterial, item.render3d?.secondaryMaterial, item.render3d?.accentMaterial].filter((value): value is string => Boolean(value));
    materialTokens.forEach((token) => {
      if (input.knownRenderMaterialTokens && !input.knownRenderMaterialTokens.has(token)) add("material-inheritance", {
        code: "UNKNOWN_FURNITURE_MATERIAL", severity: "error", category: "materials", title: "家具材质未进入统一材质库",
        message: `${item.name} 使用了未知材质 ${token}。`, suggestion: "改用全屋canonical材质，或先把该材质登记进母材质库。", objectId: item.id
      });
    });
  });
  input.structure.rooms.forEach((room) => {
    const finishes = [room.surfaceFinishes?.floor, room.surfaceFinishes?.wall].filter(Boolean);
    finishes.forEach((finish) => {
      if (!finish) return;
      if (!finish.materialToken) add("material-inheritance", {
        code: "SURFACE_MATERIAL_TOKEN_MISSING", severity: "warning", category: "materials", title: "房间饰面未绑定统一材质",
        message: `${room.name}的${finish.name}只有文字说明，没有canonical token。`, suggestion: "绑定全屋母材质token。", objectId: room.id
      });
      else if (input.knownPbrMaterialTokens && !input.knownPbrMaterialTokens.has(finish.materialToken)) add("material-inheritance", {
        code: "UNKNOWN_SURFACE_MATERIAL", severity: "error", category: "materials", title: "建筑饰面材质不存在",
        message: `${room.name}使用了未登记的材质 ${finish.materialToken}。`, suggestion: "改用全屋canonical材质或补充正式材质定义。", objectId: room.id
      });
      const expected = expectedSurfaceToken(finish.material, finish.name);
      if (expected && finish.materialToken && finish.materialToken !== expected) add("material-inheritance", {
        code: "SURFACE_MATERIAL_SEMANTIC_MISMATCH", severity: "error", category: "materials", title: "饰面名称与材质身份不一致",
        message: `${room.name}的“${finish.name}”被绑定为 ${finish.materialToken}，按其物理类型应为 ${expected}。`, suggestion: "修正材质继承，不要用石材token模拟涂料或用涂料token模拟木作。", objectId: room.id
      });
    });
  });

  pass("lighting");
  const floorLights = input.drawingItems.filter((item) => item.floorId === input.floorId && item.category === "light");
  const fixtureFamilyIds = new Set(input.lightingDesign?.fixtureFamilies.map((family) => family.id) ?? []);
  if (!floorLights.length) add("lighting", {
    code: "NO_FLOOR_LIGHTS", severity: "warning", category: "lighting", title: "当前楼层没有灯光对象",
    message: "渲染只能依赖环境光，无法复现已确认的分层照明。", suggestion: "先绑定该楼层的基础光、重点光和功能灯。"
  });
  floorLights.forEach((light) => {
    const temperature = light.colorTemperature ?? light.lightColorTemperature;
    if (!temperature || !VALID_COLOR_TEMPERATURES.has(temperature)) add("lighting", {
      code: "LIGHT_TEMPERATURE_INVALID", severity: "error", category: "lighting", title: "灯具色温缺失或无效",
      message: `${light.label ?? light.id} 没有有效色温。`, suggestion: "按全屋逻辑设置为2700K或3000K。", objectId: light.id
    });
    const fixtureFamily = light.lightSpec?.fixtureFamily;
    if (!fixtureFamily || fixtureFamilyIds.size && !fixtureFamilyIds.has(fixtureFamily)) add("lighting", {
      code: "LIGHT_FIXTURE_FAMILY_INVALID", severity: "error", category: "lighting", title: "灯具家族未统一",
      message: `${light.label ?? light.id} 使用的灯具家族 ${fixtureFamily ?? "未设置"} 不在全屋灯具库中。`, suggestion: "改用统一灯具家族，避免各楼层另起灯具逻辑。", objectId: light.id
    });
    if ((light.lightSpec?.cri ?? 0) < 90) add("lighting", {
      code: "LIGHT_CRI_LOW", severity: "warning", category: "lighting", title: "灯具显色指数偏低",
      message: `${light.label ?? light.id} 的CRI低于90或尚未填写。`, suggestion: "普通空间CRI≥90，柜内、厨房、洗衣和镜前建议CRI≥95。", objectId: light.id
    });
  });
  if (input.lightingSceneId && input.lightingDesign?.scenes.length && !input.lightingDesign.scenes.some((scene) => scene.id === input.lightingSceneId)) add("lighting", {
    code: "LIGHTING_SCENE_MISSING", severity: "error", category: "lighting", title: "灯光场景已失效",
    message: `当前机位引用的场景 ${input.lightingSceneId} 不存在。`, suggestion: "重新选择全屋统一场景。"
  });
  if (["night", "artificialOnly", "beamAnalysis"].includes(input.lightingScene) && input.enabledLightCount === 0) add("lighting", {
    code: "LIGHTING_BLACKOUT", severity: "error", category: "lighting", title: "人工光场景没有启用灯具",
    message: "当前夜景或人工光模式中没有任何灯具开启。", suggestion: "启用对应控制组或切换有效场景。"
  });

  pass("render-settings");
  const strictInterior = camera.focus && ["room", "object", "lighting"].includes(camera.focus.kind);
  if (["exteriorHidden", "exteriorTransparent", "allTransparent"].includes(input.wallDisplayMode)) add("render-settings", {
    code: "WALLS_NOT_PHYSICAL", severity: "error", category: "render-settings", title: "墙体不是实体显示",
    message: `当前墙体模式为 ${input.wallDisplayMode}，可能错误露出墙后的洁具或房间。`, suggestion: "写实渲染使用完整实体墙体。"
  });
  else if (input.wallDisplayMode === "cutaway") add("render-settings", {
    code: "WALL_CUTAWAY_ACTIVE", severity: strictInterior ? "error" : "warning", category: "render-settings", title: "仍在使用剖切墙体",
    message: "剖切模式可能使渲染看到本应被墙遮挡的空间。", suggestion: "正式写实渲染切换为完整墙体。"
  });
  if (strictInterior && input.roomCeilingMode !== "solid") add("render-settings", {
    code: "CEILING_NOT_SOLID", severity: "warning", category: "render-settings", title: "室内顶面未完整显示",
    message: `当前顶面模式为 ${input.roomCeilingMode}。`, suggestion: "需要看到顶面的机位应使用实体顶面。"
  });
  if (!input.presentationMode) add("render-settings", {
    code: "PRESENTATION_MODE_OFF", severity: "warning", category: "render-settings", title: "当前不是展示质量",
    message: "阴影、反射和材质精度处于编辑级别。", suggestion: "正式输出前开启展示模式。"
  });
  if (!input.cameraCollisionEnabled) add("render-settings", {
    code: "CAMERA_COLLISION_OFF", severity: "warning", category: "render-settings", title: "相机碰撞已关闭",
    message: "自由调整机位时可能进入墙体或柜体。", suggestion: "保持相机碰撞开启。"
  });

  pass("stair-continuity");
  const stairView = /stair|楼梯|上行|下行/i.test(`${camera.name} ${camera.description ?? ""} ${camera.targetArea ?? ""}`);
  if (stairView) {
    const systems = (input.stairSystems ?? []).filter((system) => system.lowerFloorId === input.floorId || system.upperFloorId === input.floorId);
    if (!systems.length) add("stair-continuity", {
      code: "STAIR_SYSTEM_MISSING", severity: "error", category: "geometry", title: "楼梯机位没有连续楼梯系统",
      message: "当前画面被标记为楼梯视角，但模型没有关联的上下层楼梯系统。", suggestion: "先恢复楼梯系统、平台和楼板洞口。"
    });
    systems.forEach((system) => {
      const lowerFlightExists = input.structuresByFloor?.[system.lowerFloorId]?.stairs.some((stair) => stair.id === system.lowerFlightId) ?? false;
      const upperFlightExists = input.structuresByFloor?.[system.upperFloorId]?.stairs.some((stair) => stair.id === system.upperFlightId) ?? false;
      const landingExists = (input.stairLandings ?? []).some((landing) => landing.id === system.landingId && landing.stairSystemId === system.id);
      const openingExists = (input.stairOpenings ?? []).some((opening) => opening.id === system.openingId && opening.stairSystemId === system.id);
      if (!lowerFlightExists || !upperFlightExists || !landingExists || !openingExists) add("stair-continuity", {
        code: "STAIR_SYSTEM_INCOMPLETE", severity: "error", category: "geometry", title: "楼梯上下行关系不完整",
        message: `${system.id} 缺少${[!lowerFlightExists && "下段楼梯", !upperFlightExists && "上段楼梯", !landingExists && "平台", !openingExists && "楼板洞口"].filter(Boolean).join("、")}。`,
        suggestion: "补齐同一楼梯系统的两段梯、平台和洞口后再渲染。", objectId: system.id
      });
    });
  }

  pass("runtime-visibility");
  const evidence = input.sceneEvidence;
  if (evidence?.inspected) {
    evidence.cameraInsideObjectIds.forEach((objectId) => add("runtime-visibility", {
      code: "CAMERA_INSIDE_FURNITURE", severity: "error", category: "visibility", title: "相机进入家具模型",
      message: `相机位于家具 ${objectId} 的包围盒内部。`, suggestion: "将相机移出柜体或家具后重新检查。", objectId
    }));
    if (focusFurniture && !evidence.visibleObjectIds.includes(focusFurniture.id)) add("runtime-visibility", {
      code: "FOCUS_OBJECT_OUT_OF_FRAME", severity: "error", category: "visibility", title: "拍摄目标不在画面内",
      message: `${focusFurniture.name} 没有进入当前相机视锥。`, suggestion: "重新构图，让主要对象完整入镜。", objectId: focusFurniture.id
    });
    if (evidence.occludedFocusObjectId) add("runtime-visibility", {
      code: "FOCUS_OBJECT_OCCLUDED", severity: "warning", category: "visibility", title: "主要对象可能被遮挡",
      message: `从相机到 ${evidence.occludedFocusObjectId} 的中心视线被其他模型遮挡。`, suggestion: "检查门扇、隔墙和前景家具是否挡住主要对象。", objectId: evidence.occludedFocusObjectId
    });
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.length - errorCount;
  const status: RenderPreflightResult["status"] = errorCount ? "blocked" : warningCount ? "warning" : "ready";
  const checkCount = checks.size;
  const passedCheckCount = Math.max(0, checkCount - failedChecks.size);
  return {
    status,
    issues,
    errorCount,
    warningCount,
    checkCount,
    passedCheckCount,
    summary: errorCount ? `${errorCount}项错误阻止渲染，另有${warningCount}项提醒` : warningCount ? `检查通过，但有${warningCount}项提醒` : `${checkCount}项检查全部通过`
  };
}
