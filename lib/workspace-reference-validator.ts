export type WorkspaceReferenceSeverity = "error" | "warning";

export type WorkspaceReferenceIssue = {
  severity: WorkspaceReferenceSeverity;
  code: string;
  objectId: string;
  path: string;
  value?: string;
  message: string;
  suggestion: string;
};

export type WorkspaceReferenceReport = {
  valid: boolean;
  errors: WorkspaceReferenceIssue[];
  warnings: WorkspaceReferenceIssue[];
  issues: WorkspaceReferenceIssue[];
};

type JsonRecord = Record<string, unknown>;

const LEGACY_ROOM_ID_MIGRATIONS: Record<string, string> = {
  "room-yard": "OD-YARD-NORTH-001",
  "OD-YARD-001": "OD-YARD-NORTH-001"
};

const SEMANTIC_ROOM_BINDINGS: Record<string, string> = {
  "R-B2-001": "ROOM-B2-001",
  "R-2F-001": "ROOM-2F-006",
  "R-B1-LAUNDRY": "ROOM-B1-001",
  "R-B1-ROOM": "ROOM-B1-002",
  "R-B1-CORRIDOR": "ROOM-B1-003",
  "R-B1-ACTIVITY": "ROOM-B1-004"
};

const AGGREGATE_SEMANTIC_ROOM_BINDINGS: Record<string, string[]> = {
  "R-1F-001": ["ROOM-1F-001", "ROOM-1F-002", "ROOM-1F-003", "ROOM-1F-005", "ROOM-1F-006"]
};

const STRUCTURE_COLLECTIONS = [
  "walls", "rooms", "partitions", "stairs", "columns", "fences", "outdoorSurfaces",
  "doors", "windows", "bayWindows", "skylights", "outdoors"
] as const;

const NOTE_FIELDS = new Set(["note", "notes", "constructionNote"]);
const ID_TOKEN_PATTERN = /\b(?:ROOM|OD|W|AW|D|WIN|BW|SK|ST|furn|ph|module)-[A-Za-z0-9][A-Za-z0-9-]*\b/g;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function cloneWorkspace<T>(workspace: T): T {
  return JSON.parse(JSON.stringify(workspace)) as T;
}

function pushIssue(issues: WorkspaceReferenceIssue[], issue: WorkspaceReferenceIssue) {
  issues.push(issue);
}

function collectKnownIds(workspace: JsonRecord) {
  const ids = new Set<string>();
  const add = (items: unknown[]) => items.forEach((item) => {
    const id = stringValue(asRecord(item)?.id);
    if (id) ids.add(id);
  });
  add(asArray(workspace.furniture));
  add(asArray(workspace.drawingItems));
  add(asArray(workspace.semanticObjects));
  add(asArray(workspace.cameraViews));
  add(asArray(workspace.roomTourViews));
  const lightingDesign = asRecord(workspace.lightingDesign);
  add(asArray(lightingDesign?.fixtureFamilies));
  add(asArray(lightingDesign?.scenes));
  const structures = asRecord(workspace.houseStructuresByFloor) ?? {};
  Object.values(structures).forEach((value) => {
    const structure = asRecord(value);
    if (!structure) return;
    STRUCTURE_COLLECTIONS.forEach((key) => add(asArray(structure[key])));
  });
  return ids;
}

function collectNoteReferences(value: unknown, path: string, ownerId: string, knownIds: Set<string>, issues: WorkspaceReferenceIssue[]) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectNoteReferences(child, `${path}[${index}]`, ownerId, knownIds, issues));
    return;
  }
  const record = asRecord(value);
  if (!record) return;
  Object.entries(record).forEach(([key, child]) => {
    const childPath = path ? `${path}.${key}` : key;
    if (NOTE_FIELDS.has(key) && typeof child === "string") {
      const tokens = child.match(ID_TOKEN_PATTERN) ?? [];
      Array.from(new Set(tokens)).filter((id) => !knownIds.has(id)).forEach((id) => pushIssue(issues, {
        severity: "warning",
        code: "NOTE_UNKNOWN_ID",
        objectId: ownerId,
        path: childPath,
        value: id,
        message: `备注文本疑似引用不存在的对象 ${id}。`,
        suggestion: "确认这是对象 ID 后替换为真实 ID；若只是普通文本可忽略。"
      }));
    }
    if (child && typeof child === "object") collectNoteReferences(child, childPath, ownerId, knownIds, issues);
  });
}

export function validateWorkspaceReferences(value: unknown): WorkspaceReferenceReport {
  const workspace = asRecord(value);
  const issues: WorkspaceReferenceIssue[] = [];
  if (!workspace) {
    const issue: WorkspaceReferenceIssue = { severity: "error", code: "INVALID_WORKSPACE", objectId: "workspace", path: "workspace", message: "Workspace 不是对象。", suggestion: "恢复为合法 workspace JSON。" };
    return { valid: false, errors: [issue], warnings: [], issues: [issue] };
  }

  const floorIds = new Set(asArray(workspace.floors).map((floor) => stringValue(asRecord(floor)?.id)).filter((id): id is string => Boolean(id)));
  const structures = asRecord(workspace.houseStructuresByFloor) ?? {};
  Object.keys(structures).forEach((floorId) => floorIds.add(floorId));
  const knownIds = collectKnownIds(workspace);

  const structureIndex = new Map<string, { floorId: string; collection: string; object: JsonRecord }>();
  const roomOutdoorByFloor = new Map<string, Set<string>>();
  const hostsByFloor = new Map<string, Set<string>>();
  Object.entries(structures).forEach(([floorId, value]) => {
    const structure = asRecord(value);
    if (!structure) return;
    const roomOutdoorIds = new Set<string>();
    [...asArray(structure.rooms), ...asArray(structure.outdoors)].forEach((item) => {
      const id = stringValue(asRecord(item)?.id);
      if (id) roomOutdoorIds.add(id);
    });
    roomOutdoorByFloor.set(floorId, roomOutdoorIds);
    const hostIds = new Set<string>();
    [...asArray(structure.walls), ...asArray(structure.partitions)].forEach((item) => {
      const id = stringValue(asRecord(item)?.id);
      if (id) hostIds.add(id);
    });
    hostsByFloor.set(floorId, hostIds);
    STRUCTURE_COLLECTIONS.forEach((collection) => asArray(structure[collection]).forEach((item) => {
      const object = asRecord(item);
      const id = stringValue(object?.id);
      if (id && object) structureIndex.set(id, { floorId, collection, object });
    }));
  });

  asArray(workspace.furniture).forEach((item, index) => {
    const furniture = asRecord(item);
    if (!furniture) return;
    const id = stringValue(furniture.id) ?? `furniture[${index}]`;
    const floorId = stringValue(furniture.floorId) ?? "";
    const roomId = stringValue(furniture.roomId);
    if (!roomId || !roomOutdoorByFloor.get(floorId)?.has(roomId)) pushIssue(issues, {
      severity: "error", code: "ORPHAN_FURNITURE_ROOM", objectId: id, path: `furniture[${index}].roomId`, value: roomId,
      message: `家具 ${id} 的 roomId 未指向同楼层真实房间或室外区。`,
      suggestion: roomId && LEGACY_ROOM_ID_MIGRATIONS[roomId] ? `迁移为 ${LEGACY_ROOM_ID_MIGRATIONS[roomId]}。` : "选择同楼层 ROOM-* 或 OD-* 对象。"
    });
    const outdoorId = stringValue(furniture.outdoorId);
    if (outdoorId && !roomOutdoorByFloor.get(floorId)?.has(outdoorId)) pushIssue(issues, {
      severity: "warning", code: "ORPHAN_FURNITURE_OUTDOOR", objectId: id, path: `furniture[${index}].outdoorId`, value: outdoorId,
      message: `家具 ${id} 的 outdoorId 未指向同楼层室外区。`, suggestion: "重新选择同楼层 OD-* 对象，或清空 outdoorId。"
    });
    const hostWallId = stringValue(furniture.hostWallId);
    if (hostWallId && !hostsByFloor.get(floorId)?.has(hostWallId)) pushIssue(issues, {
      severity: "warning", code: "FURNITURE_WALL_REBIND_REQUIRED", objectId: id, path: `furniture[${index}].hostWallId`, value: hostWallId,
      message: `家具 ${id} 的宿主墙 ${hostWallId} 已不存在，需要重新绑定。`, suggestion: "使用墙体吸附选择新墙；保留该引用用于提示，不阻止保存。"
    });
    if (furniture.cabinetDesign !== undefined && !knownIds.has(id)) pushIssue(issues, {
      severity: "error", code: "ORPHAN_CABINET_DESIGN", objectId: id, path: `furniture[${index}].cabinetDesign`,
      message: "柜体深化数据未挂在真实家具对象上。", suggestion: "将 cabinetDesign 移到有效 furniture 对象，或删除孤立深化数据。"
    });
    collectNoteReferences(furniture, `furniture[${index}]`, id, knownIds, issues);
  });

  const drawingItemRecords = asArray(workspace.drawingItems).map(asRecord).filter((item): item is JsonRecord => Boolean(item));
  const drawingItemIds = new Set(drawingItemRecords.map((item) => stringValue(item.id)).filter((id): id is string => Boolean(id)));
  const lightDrawingItemIds = new Set(drawingItemRecords.filter((item) => item.category === "light").map((item) => stringValue(item.id)).filter((id): id is string => Boolean(id)));
  const switchDrawingItems = drawingItemRecords.filter((item) => item.category === "switch");
  const switchDrawingItemIds = new Set(switchDrawingItems.map((item) => stringValue(item.id)).filter((id): id is string => Boolean(id)));
  const ceilingDrawingItemIds = new Set(drawingItemRecords.filter((item) => item.category === "ceiling").map((item) => stringValue(item.id)).filter((id): id is string => Boolean(id)));
  asArray(workspace.drawingItems).forEach((item, index) => {
    const drawingItem = asRecord(item);
    if (!drawingItem) return;
    const id = stringValue(drawingItem.id) ?? `drawingItems[${index}]`;
    const floorId = stringValue(drawingItem.floorId) ?? "";
    const checkReference = (field: "roomId" | "hostWallId" | "wallId" | "hostObjectId" | "relatedFurnitureId", valid: boolean, value?: string) => {
      if (value && !valid) pushIssue(issues, {
        severity: "error", code: `ORPHAN_DRAWING_ITEM_${field.toUpperCase()}`, objectId: id,
        path: `drawingItems[${index}].${field}`, value,
        message: `图纸点位 ${id} 的 ${field} 未指向同楼层有效对象。`, suggestion: "重新绑定同楼层对象，或清空该可选引用。"
      });
    };
    if (!floorIds.has(floorId)) pushIssue(issues, {
      severity: "error", code: "INVALID_DRAWING_ITEM_FLOOR", objectId: id, path: `drawingItems[${index}].floorId`, value: floorId,
      message: `图纸点位 ${id} 指向不存在的楼层。`, suggestion: "改为 floors 中存在的楼层 ID。"
    });
    const roomId = stringValue(drawingItem.roomId);
    const hostWallId = stringValue(drawingItem.hostWallId);
    const wallId = stringValue(drawingItem.wallId);
    const hostObjectId = stringValue(drawingItem.hostObjectId);
    const relatedFurnitureId = stringValue(drawingItem.relatedFurnitureId);
    const relatedRoomId = stringValue(drawingItem.relatedRoomId);
    const relatedSwitchId = stringValue(drawingItem.relatedSwitchId);
    const hostCeilingAreaId = stringValue(drawingItem.hostCeilingAreaId);
    checkReference("roomId", Boolean(roomOutdoorByFloor.get(floorId)?.has(roomId ?? "")), roomId);
    checkReference("hostWallId", Boolean(hostsByFloor.get(floorId)?.has(hostWallId ?? "")), hostWallId);
    checkReference("wallId", Boolean(hostsByFloor.get(floorId)?.has(wallId ?? "")), wallId);
    checkReference("hostObjectId", knownIds.has(hostObjectId ?? ""), hostObjectId);
    checkReference("relatedFurnitureId", asArray(workspace.furniture).some((furniture) => {
      const record = asRecord(furniture);
      return Boolean(record && record.id === relatedFurnitureId && record.floorId === floorId);
    }), relatedFurnitureId);
    if (relatedRoomId && !roomOutdoorByFloor.get(floorId)?.has(relatedRoomId)) pushIssue(issues, {
      severity: "error", code: "ORPHAN_DRAWING_ITEM_RELATED_ROOM", objectId: id,
      path: `drawingItems[${index}].relatedRoomId`, value: relatedRoomId,
      message: `图纸点位 ${id} 的 relatedRoomId 未指向同楼层真实房间或室外区。`, suggestion: "重新绑定同楼层 ROOM-* 或 OD-* 对象。"
    });
    if (relatedSwitchId && !switchDrawingItemIds.has(relatedSwitchId)) pushIssue(issues, {
      severity: "error", code: "ORPHAN_DRAWING_ITEM_SWITCH", objectId: id,
      path: `drawingItems[${index}].relatedSwitchId`, value: relatedSwitchId,
      message: `灯光点 ${id} 引用了不存在的开关 ${relatedSwitchId}。`, suggestion: "重新选择 E-02 中的 switch drawingItem，或清空该引用。"
    });
    if (hostCeilingAreaId && !ceilingDrawingItemIds.has(hostCeilingAreaId)) pushIssue(issues, {
      severity: "error", code: "ORPHAN_DRAWING_ITEM_CEILING", objectId: id,
      path: `drawingItems[${index}].hostCeilingAreaId`, value: hostCeilingAreaId,
      message: `灯光点 ${id} 引用了不存在的吊顶区域 ${hostCeilingAreaId}。`, suggestion: "重新选择 C-01 中的 ceiling drawingItem，或清空该引用。"
    });
    if (drawingItem.category === "light" && relatedSwitchId) {
      const relatedSwitch = switchDrawingItems.find((candidate) => candidate.id === relatedSwitchId);
      const lightGroup = stringValue(drawingItem.controlGroupId) ?? stringValue(drawingItem.lightGroupId);
      const switchGroup = stringValue(relatedSwitch?.controlGroupId) ?? stringValue(relatedSwitch?.lightGroupId);
      if (relatedSwitch && lightGroup && switchGroup && lightGroup !== switchGroup) pushIssue(issues, {
        severity: "error", code: "LIGHT_SWITCH_CONTROL_GROUP_MISMATCH", objectId: id,
        path: `drawingItems[${index}].controlGroupId`, value: lightGroup,
        message: `灯光点 ${id} 与关联开关 ${relatedSwitchId} 的 controlGroupId 不一致。`, suggestion: "将灯具与开关改为同一 controlGroupId。"
      });
    }
    [...asArray(drawingItem.controlledLightIds), ...asArray(drawingItem.relatedLightIds)].forEach((lightId, lightIndex) => {
      if (typeof lightId === "string" && !lightDrawingItemIds.has(lightId)) pushIssue(issues, {
        severity: "error", code: "ORPHAN_DRAWING_ITEM_LIGHT", objectId: id,
        path: `drawingItems[${index}].relatedLightIds[${lightIndex}]`, value: lightId,
        message: `图纸对象 ${id} 引用了不存在的灯光点 ${lightId}。`, suggestion: "重新选择同一图纸包中的 light drawingItem，或移除失效引用。"
      });
    });
    collectNoteReferences(drawingItem, `drawingItems[${index}]`, id, knownIds, issues);
  });

  const drawingPackage = asRecord(workspace.drawingPackage);
  asArray(drawingPackage?.drawingItemIds).forEach((value, index) => {
    if (typeof value === "string" && !drawingItemIds.has(value)) pushIssue(issues, {
      severity: "error", code: "ORPHAN_DRAWING_PACKAGE_ITEM", objectId: stringValue(drawingPackage?.id) ?? "drawingPackage",
      path: `drawingPackage.drawingItemIds[${index}]`, value,
      message: `图纸包引用了不存在的点位 ${value}。`, suggestion: "恢复点位或从 drawingItemIds 移除该引用。"
    });
  });

  Object.entries(structures).forEach(([floorId, value]) => {
    const structure = asRecord(value);
    if (!structure) return;
    const walls = new Set(asArray(structure.walls).map((wall) => stringValue(asRecord(wall)?.id)).filter((id): id is string => Boolean(id)));
    asArray(structure.rooms).forEach((item, roomIndex) => {
      const room = asRecord(item);
      const roomId = stringValue(room?.id) ?? `rooms[${roomIndex}]`;
      asArray(room?.sourceWallIds).forEach((wallId, sourceIndex) => {
        if (typeof wallId === "string" && !walls.has(wallId)) pushIssue(issues, {
          severity: "error", code: "ORPHAN_SOURCE_WALL", objectId: roomId,
          path: `houseStructuresByFloor.${floorId}.rooms[${roomIndex}].sourceWallIds[${sourceIndex}]`, value: wallId,
          message: `房间 ${roomId} 引用了不存在的墙 ${wallId}。`, suggestion: "恢复该墙，或从 sourceWallIds 删除失效 ID 后重新生成房间边界。"
        });
      });
    });
    const checkHost = (collection: string, field: "hostId" | "wallId", validIds: Set<string>) => asArray(structure[collection]).forEach((item, index) => {
      const object = asRecord(item);
      const id = stringValue(object?.id) ?? `${collection}[${index}]`;
      const hostId = stringValue(object?.[field]);
      if (!hostId || !validIds.has(hostId)) pushIssue(issues, {
        severity: "error", code: "ORPHAN_HOST", objectId: id, path: `houseStructuresByFloor.${floorId}.${collection}[${index}].${field}`, value: hostId,
        message: `${id}.${field} 未指向同楼层有效承载对象。`, suggestion: "重新选择承载墙/隔断；自动修复只报告，不会静默删除结构开口。"
      });
    });
    checkHost("doors", "hostId", hostsByFloor.get(floorId) ?? new Set());
    checkHost("windows", "hostId", hostsByFloor.get(floorId) ?? new Set());
    checkHost("bayWindows", "wallId", walls);
    asArray(structure.skylights).forEach((item, index) => {
      const skylight = asRecord(item);
      const wallId = stringValue(skylight?.wallId);
      if (wallId && !walls.has(wallId)) pushIssue(issues, {
        severity: "error", code: "ORPHAN_HOST", objectId: stringValue(skylight?.id) ?? `skylights[${index}]`,
        path: `houseStructuresByFloor.${floorId}.skylights[${index}].wallId`, value: wallId,
        message: `天窗引用了不存在的墙 ${wallId}。`, suggestion: "重新绑定有效墙体，或移除无效 wallId。"
      });
    });
  });

  asArray(workspace.semanticObjects).forEach((item, index) => {
    const semantic = asRecord(item);
    if (!semantic) return;
    const id = stringValue(semantic.id) ?? `semanticObjects[${index}]`;
    const floorId = stringValue(semantic.floorId) ?? "";
    const details = asRecord(semantic.details) ?? {};
    const refs = [stringValue(details.structureRoomId), stringValue(details.roomId)].filter((ref): ref is string => Boolean(ref));
    const multiRefs = asArray(details.structureRoomIds).filter((ref): ref is string => typeof ref === "string");
    [...refs, ...multiRefs].forEach((ref) => {
      if (!roomOutdoorByFloor.get(floorId)?.has(ref)) pushIssue(issues, {
        severity: "error", code: "ORPHAN_SEMANTIC_ROOM", objectId: id, path: `semanticObjects[${index}].details`, value: ref,
        message: `语义对象 ${id} 引用了不存在或跨楼层的结构空间 ${ref}。`, suggestion: "绑定同楼层真实 ROOM-* 或 OD-* 对象。"
      });
    });
    if (semantic.category === "Room" && refs.length + multiRefs.length === 0) pushIssue(issues, {
      severity: "warning", code: "UNBOUND_SEMANTIC_ROOM", objectId: id, path: `semanticObjects[${index}].details`,
      message: `语义 Room ${id} 未显式绑定真实结构房间。`, suggestion: "单房间添加 details.structureRoomId；聚合区添加 details.structureRoomIds。"
    });
    collectNoteReferences(semantic, `semanticObjects[${index}]`, id, knownIds, issues);
  });

  asArray(workspace.cameraViews).forEach((item, index) => {
    const camera = asRecord(item);
    const id = stringValue(camera?.id) ?? `cameraViews[${index}]`;
    const floor = stringValue(camera?.floor);
    if (!floor || !floorIds.has(floor)) pushIssue(issues, {
      severity: "error", code: "INVALID_CAMERA_FLOOR", objectId: id, path: `cameraViews[${index}].floor`, value: floor,
      message: `相机视角 ${id} 指向不存在的楼层。`, suggestion: "改为 floors 中存在的楼层 ID。"
    });
  });

  const tourNodeIds = new Set(asArray(workspace.roomTourViews).map((item) => stringValue(asRecord(item)?.id)).filter((id): id is string => Boolean(id)));
  asArray(workspace.roomTourViews).forEach((item, index) => {
    const node = asRecord(item);
    const id = stringValue(node?.id) ?? `roomTourViews[${index}]`;
    const floorId = stringValue(node?.floorId) ?? "";
    if (!floorIds.has(floorId)) pushIssue(issues, {
      severity: "error", code: "INVALID_TOUR_FLOOR", objectId: id, path: `roomTourViews[${index}].floorId`, value: floorId,
      message: `漫游节点 ${id} 指向不存在的楼层。`, suggestion: "改为 floors 中存在的楼层 ID。"
    });
    const roomId = stringValue(node?.roomId);
    const outdoorId = stringValue(node?.outdoorId);
    if (roomId && !roomOutdoorByFloor.get(floorId)?.has(roomId)) pushIssue(issues, {
      severity: "error", code: "INVALID_TOUR_ROOM", objectId: id, path: `roomTourViews[${index}].roomId`, value: roomId,
      message: `漫游节点 ${id} 未绑定同楼层真实房间。`, suggestion: "绑定同楼层 ROOM-*，或清空后让派生函数自动计算。"
    });
    if (outdoorId && !roomOutdoorByFloor.get(floorId)?.has(outdoorId)) pushIssue(issues, {
      severity: "error", code: "INVALID_TOUR_OUTDOOR", objectId: id, path: `roomTourViews[${index}].outdoorId`, value: outdoorId,
      message: `漫游节点 ${id} 未绑定同楼层真实室外区。`, suggestion: "绑定同楼层 OD-*，或清空后让派生函数自动计算。"
    });
    asArray(node?.linkedNodeIds).forEach((linkedId, linkIndex) => {
      if (typeof linkedId === "string" && !tourNodeIds.has(linkedId)) pushIssue(issues, {
        severity: "warning", code: "INVALID_TOUR_LINK", objectId: id, path: `roomTourViews[${index}].linkedNodeIds[${linkIndex}]`, value: linkedId,
        message: `漫游节点 ${id} 链接了不存在的持久化节点 ${linkedId}。`, suggestion: "删除链接，或补充目标节点；自动派生链接无需持久化。"
      });
    });
  });

  const lightingDesign = asRecord(workspace.lightingDesign);
  const sceneIds = new Set(asArray(lightingDesign?.scenes).map((item) => stringValue(asRecord(item)?.id)).filter((id): id is string => Boolean(id)));
  const controlGroupIds = new Set(asArray(workspace.drawingItems).map((item) => stringValue(asRecord(item)?.controlGroupId)).filter((id): id is string => Boolean(id)));
  asArray(lightingDesign?.scenes).forEach((item, sceneIndex) => {
    const scene = asRecord(item);
    const id = stringValue(scene?.id) ?? `lightingDesign.scenes[${sceneIndex}]`;
    asArray(scene?.groupStates).forEach((stateValue, stateIndex) => {
      const controlGroupId = stringValue(asRecord(stateValue)?.controlGroupId);
      if (controlGroupId && !controlGroupIds.has(controlGroupId)) pushIssue(issues, {
        severity: "error", code: "INVALID_LIGHTING_SCENE_GROUP", objectId: id, path: `lightingDesign.scenes[${sceneIndex}].groupStates[${stateIndex}].controlGroupId`, value: controlGroupId,
        message: `灯光场景 ${id} 引用了不存在的控制组 ${controlGroupId}。`, suggestion: "改为 drawingItems 中存在的 controlGroupId，或删除该场景状态。"
      });
    });
  });
  asArray(workspace.roomTourViews).forEach((item, index) => {
    const node = asRecord(item);
    const id = stringValue(node?.id) ?? `roomTourViews[${index}]`;
    const recommendedSceneId = stringValue(node?.recommendedLightingSceneId);
    if (recommendedSceneId && !sceneIds.has(recommendedSceneId)) pushIssue(issues, {
      severity: "error", code: "INVALID_TOUR_LIGHTING_SCENE", objectId: id, path: `roomTourViews[${index}].recommendedLightingSceneId`, value: recommendedSceneId,
      message: `灯光体验视角 ${id} 引用了不存在的场景 ${recommendedSceneId}。`, suggestion: "绑定 lightingDesign.scenes 中存在的场景 ID。"
    });
  });

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  return { valid: errors.length === 0, errors, warnings, issues };
}

export function repairWorkspaceReferences<T>(value: T): { workspace: T; repairs: string[]; warnings: WorkspaceReferenceIssue[] } {
  const workspace = cloneWorkspace(value);
  const record = asRecord(workspace);
  const repairs: string[] = [];
  if (!record) return { workspace, repairs, warnings: validateWorkspaceReferences(workspace).warnings };
  const structures = asRecord(record.houseStructuresByFloor) ?? {};

  asArray(record.furniture).forEach((item) => {
    const furniture = asRecord(item);
    const roomId = stringValue(furniture?.roomId);
    if (!furniture || !roomId || !LEGACY_ROOM_ID_MIGRATIONS[roomId]) return;
    const target = LEGACY_ROOM_ID_MIGRATIONS[roomId];
    const floorStructure = asRecord(structures[stringValue(furniture.floorId) ?? ""]);
    const targetExists = [...asArray(floorStructure?.rooms), ...asArray(floorStructure?.outdoors)].some((space) => asRecord(space)?.id === target);
    if (targetExists) {
      furniture.roomId = target;
      repairs.push(`${furniture.id}.roomId: ${roomId} -> ${target}`);
    }
  });

  Object.entries(structures).forEach(([floorId, value]) => {
    const structure = asRecord(value);
    if (!structure) return;
    const wallIds = new Set(asArray(structure.walls).map((wall) => stringValue(asRecord(wall)?.id)).filter((id): id is string => Boolean(id)));
    asArray(structure.rooms).forEach((item) => {
      const room = asRecord(item);
      if (!room || !Array.isArray(room.sourceWallIds)) return;
      const next = room.sourceWallIds.filter((id) => typeof id === "string" && wallIds.has(id));
      if (next.length !== room.sourceWallIds.length) {
        repairs.push(`${floorId}.${room.id}.sourceWallIds: removed ${room.sourceWallIds.length - next.length} orphan reference(s)`);
        room.sourceWallIds = next;
      }
    });
  });

  asArray(record.semanticObjects).forEach((item) => {
    const semantic = asRecord(item);
    const id = stringValue(semantic?.id);
    if (!semantic || !id || semantic.category !== "Room") return;
    const details = asRecord(semantic.details) ?? {};
    semantic.details = details;
    if (!details.structureRoomId && !details.roomId && !details.structureRoomIds) {
      if (SEMANTIC_ROOM_BINDINGS[id]) {
        details.structureRoomId = SEMANTIC_ROOM_BINDINGS[id];
        repairs.push(`${id}.details.structureRoomId -> ${SEMANTIC_ROOM_BINDINGS[id]}`);
      } else if (AGGREGATE_SEMANTIC_ROOM_BINDINGS[id]) {
        details.structureRoomIds = [...AGGREGATE_SEMANTIC_ROOM_BINDINGS[id]];
        details.bindingType = "aggregate";
        repairs.push(`${id}.details.structureRoomIds: aggregate binding added`);
      }
    }
  });

  const report = validateWorkspaceReferences(workspace);
  return { workspace, repairs, warnings: report.warnings };
}

export function getWorkspaceReverseDependencies(value: unknown, targetId: string): WorkspaceReferenceIssue[] {
  return validateWorkspaceReferences(value).issues.filter((issue) => issue.value === targetId);
}

export function renameWorkspaceObjectId<T>(value: T, oldId: string, newId: string): { workspace: T; updatedPaths: string[] } {
  const workspace = cloneWorkspace(value);
  const updatedPaths: string[] = [];
  const referenceKeys = new Set(["roomId", "structureRoomId", "hostId", "wallId", "stairId", "furnitureId", "hostObjectId", "hostWallId", "relatedFurnitureId"]);
  const referenceArrayKeys = new Set(["sourceWallIds", "structureRoomIds", "roomIds", "relatedWallIds", "relatedObjectIds", "controlledObjectIds", "drawingItemIds", "controlledLightIds", "relatedLightIds"]);

  const visit = (current: unknown, path: string) => {
    if (Array.isArray(current)) {
      current.forEach((child, index) => visit(child, `${path}[${index}]`));
      return;
    }
    const record = asRecord(current);
    if (!record) return;
    Object.entries(record).forEach(([key, child]) => {
      const childPath = path ? `${path}.${key}` : key;
      if (key === "id" && child === oldId) {
        record[key] = newId;
        updatedPaths.push(childPath);
      } else if (referenceKeys.has(key) && child === oldId) {
        record[key] = newId;
        updatedPaths.push(childPath);
      } else if (referenceArrayKeys.has(key) && Array.isArray(child)) {
        record[key] = child.map((item, index) => {
          if (item !== oldId) return item;
          updatedPaths.push(`${childPath}[${index}]`);
          return newId;
        });
      } else if (child && typeof child === "object") {
        visit(child, childPath);
      }
    });
  };
  visit(workspace, "workspace");
  return { workspace, updatedPaths };
}
