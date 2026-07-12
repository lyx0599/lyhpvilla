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
  "room-yard": "OD-YARD-001"
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
  add(asArray(workspace.semanticObjects));
  add(asArray(workspace.cameraViews));
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
    if (furniture.cabinetDesign !== undefined && !knownIds.has(id)) pushIssue(issues, {
      severity: "error", code: "ORPHAN_CABINET_DESIGN", objectId: id, path: `furniture[${index}].cabinetDesign`,
      message: "柜体深化数据未挂在真实家具对象上。", suggestion: "将 cabinetDesign 移到有效 furniture 对象，或删除孤立深化数据。"
    });
    collectNoteReferences(furniture, `furniture[${index}]`, id, knownIds, issues);
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
  const referenceKeys = new Set(["roomId", "structureRoomId", "hostId", "wallId", "stairId", "furnitureId"]);
  const referenceArrayKeys = new Set(["sourceWallIds", "structureRoomIds", "roomIds", "relatedWallIds", "relatedObjectIds", "controlledObjectIds"]);

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
