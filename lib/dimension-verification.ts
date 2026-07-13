import type {
  FloorId,
  HouseStructure,
  VerificationMeta,
  VerificationSource,
  VerificationStatus
} from "@/types/space";

export const verificationStatuses = [
  "unverified",
  "estimated",
  "drawing-derived",
  "site-measured",
  "confirmed"
] as const satisfies readonly VerificationStatus[];

export const verificationSources = [
  "developer-plan",
  "visual-estimate",
  "manual-input",
  "site-measurement",
  "other"
] as const satisfies readonly VerificationSource[];

export const verificationStatusLabels: Record<VerificationStatus, string> = {
  unverified: "待现场测量",
  estimated: "视觉估算",
  "drawing-derived": "按图推导",
  "site-measured": "已现场测量",
  confirmed: "已确认"
};

export const verificationSourceLabels: Record<VerificationSource, string> = {
  "developer-plan": "开发商户型图",
  "visual-estimate": "视觉估算",
  "manual-input": "人工录入",
  "site-measurement": "现场测量",
  other: "其他"
};

export const verificationTargetCollections = [
  "walls",
  "doors",
  "windows",
  "bayWindows",
  "stairs",
  "columns",
  "rooms",
  "outdoors",
  "skylights",
  "partitions"
] as const;

export type VerificationTargetCollection = (typeof verificationTargetCollections)[number];
export type VerificationTargetObject = HouseStructure[VerificationTargetCollection][number];
export type VerificationDisplayState = "confirmed" | "drawing-estimated" | "pending-site" | "conflict";

export const verificationDisplayStateLabels: Record<VerificationDisplayState, string> = {
  confirmed: "已确认",
  "drawing-estimated": "按图估算",
  "pending-site": "待现场测量",
  conflict: "存在冲突"
};

export const verificationDisplayStyles: Record<VerificationDisplayState, { color: string; background: string; dasharray?: string }> = {
  confirmed: { color: "#15803d", background: "#dcfce7" },
  "drawing-estimated": { color: "#b45309", background: "#fef3c7", dasharray: "140 80" },
  "pending-site": { color: "#475569", background: "#f1f5f9", dasharray: "70 70" },
  conflict: { color: "#b91c1c", background: "#fee2e2", dasharray: "35 55" }
};

export const verificationCollectionLabels: Record<VerificationTargetCollection, string> = {
  walls: "墙体",
  doors: "门",
  windows: "窗",
  bayWindows: "飘窗",
  stairs: "楼梯",
  columns: "柱",
  rooms: "房间",
  outdoors: "庭院边界",
  skylights: "天窗",
  partitions: "隔墙"
};

const visuallyEstimatedCollections = new Set<VerificationTargetCollection>([
  "partitions",
  "columns",
  "skylights",
  "outdoors"
]);

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function createLegacyVerificationMeta(collection: VerificationTargetCollection): VerificationMeta {
  if (visuallyEstimatedCollections.has(collection)) {
    return {
      status: "estimated",
      source: "visual-estimate",
      toleranceMm: 150
    };
  }
  return {
    status: "drawing-derived",
    source: "developer-plan",
    toleranceMm: 80
  };
}

export function createManualVerificationMeta(): VerificationMeta {
  return {
    status: "unverified",
    source: "manual-input"
  };
}

export function normalizeVerificationMeta(value: unknown, collection: VerificationTargetCollection): VerificationMeta {
  const fallback = createLegacyVerificationMeta(collection);
  const current = asRecord(value);
  if (!current) return fallback;
  return {
    ...current,
    status: typeof current.status === "string" ? current.status as VerificationStatus : fallback.status,
    source: typeof current.source === "string" ? current.source as VerificationSource : fallback.source
  } as VerificationMeta;
}

export function getVerificationMetaIssues(value: unknown) {
  const issues: string[] = [];
  const meta = asRecord(value);
  if (!meta) return ["必须是对象"];
  if (!verificationStatuses.includes(meta.status as VerificationStatus)) issues.push("status 不受支持");
  if (!verificationSources.includes(meta.source as VerificationSource)) issues.push("source 不受支持");
  if (meta.toleranceMm !== undefined && (typeof meta.toleranceMm !== "number" || !Number.isFinite(meta.toleranceMm) || meta.toleranceMm < 0)) {
    issues.push("toleranceMm 必须是非负有限数值");
  }
  for (const field of ["sourceNote", "verifiedAt", "verifiedBy", "notes"] as const) {
    if (meta[field] !== undefined && typeof meta[field] !== "string") issues.push(`${field} 必须是字符串`);
  }
  if (typeof meta.verifiedAt === "string" && meta.verifiedAt && !Number.isFinite(Date.parse(meta.verifiedAt))) {
    issues.push("verifiedAt 必须是有效日期时间");
  }
  return issues;
}

export function getVerificationDisplayState(meta: VerificationMeta | undefined, hasConflict = false): VerificationDisplayState {
  if (hasConflict || getVerificationMetaIssues(meta).length > 0) return "conflict";
  if (meta?.status === "confirmed") return "confirmed";
  if (meta?.status === "estimated" || meta?.status === "drawing-derived") return "drawing-estimated";
  return "pending-site";
}

export type VerificationTargetEntry = {
  floorId: FloorId;
  collection: VerificationTargetCollection;
  object: VerificationTargetObject;
};

export function getVerificationTargetEntries(structuresByFloor: Partial<Record<FloorId, HouseStructure>>) {
  return Object.entries(structuresByFloor).flatMap(([floorId, structure]) => {
    if (!structure) return [];
    return verificationTargetCollections.flatMap((collection) => structure[collection].map((object) => ({
      floorId: floorId as FloorId,
      collection,
      object: object as VerificationTargetObject
    })));
  }) as VerificationTargetEntry[];
}

export function findVerificationTarget(structure: HouseStructure, objectId: string) {
  for (const collection of verificationTargetCollections) {
    const object = structure[collection].find((item) => item.id === objectId);
    if (object) return { collection, object: object as VerificationTargetObject };
  }
  return null;
}
