import type { DesignWorkspaceId } from "./drawing-workspaces";
import type { FloorId } from "../types/space";

export type ValidationSeverity = "blocking" | "error" | "warning" | "info";
export type ValidationCategory = "blocking" | "geometry" | "relation" | "metadata" | "drawing";
export type ValidationProductGroup = "confirmed-conflict" | "high-risk" | "pending-data" | "suggestion" | "system-error";

export type ValidationRuleDefinition = {
  id: string;
  name: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  applicableWorkspaces: Array<DesignWorkspaceId | "all" | "yard" | "drawing-package">;
  applicableObjectTypes: string[];
  excludedObjectTypes?: string[];
  requires3D?: boolean;
  canAutoFix?: boolean;
};

export type ValidationFinding = {
  ruleId: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  title: string;
  message: string;
  floorId?: FloorId;
  roomId?: string;
  objectId: string;
  objectName?: string;
  relatedObjectIds?: string[];
  actualValue?: string;
  requiredValue?: string;
  checkPosition?: string;
  suggestion?: string;
  canAutoFix?: boolean;
  rootCauseKey?: string;
  derivedMessages?: string[];
};

export const validationRules: ValidationRuleDefinition[] = [
  { id: "DATA_REFERENCE_BROKEN", name: "必要引用完整性", category: "blocking", severity: "blocking", applicableWorkspaces: ["all"], applicableObjectTypes: ["workspace"], canAutoFix: false },
  { id: "STRUCTURE_GEOMETRY", name: "结构几何合法性", category: "geometry", severity: "error", applicableWorkspaces: ["space", "renovation"], applicableObjectTypes: ["wall", "room", "door", "window", "stair", "column"] },
  { id: "SITE_BOUNDARY", name: "场地真实边界", category: "geometry", severity: "warning", applicableWorkspaces: ["yard", "space"], applicableObjectTypes: ["outdoor", "fence", "surface", "yardFurniture"] },
  { id: "FURNITURE_OUTSIDE_SPACE", name: "家具有效边界", category: "geometry", severity: "error", applicableWorkspaces: ["furniture"], applicableObjectTypes: ["solidFurniture"], excludedObjectTypes: ["rug"] },
  { id: "FURNITURE_CROSSES_STRUCTURE", name: "家具穿越实体结构", category: "geometry", severity: "error", applicableWorkspaces: ["furniture"], applicableObjectTypes: ["solidFurniture"], excludedObjectTypes: ["rug", "wallMounted"] },
  { id: "FURNITURE_OVERLAP_3D", name: "实体家具三维重叠", category: "geometry", severity: "error", applicableWorkspaces: ["furniture"], applicableObjectTypes: ["solidFurniture"], excludedObjectTypes: ["rug", "integrated"], requires3D: true },
  { id: "WALL_STORY_HEIGHT", name: "真实墙高与层高一致", category: "geometry", severity: "warning", applicableWorkspaces: ["space"], applicableObjectTypes: ["wall"], requires3D: true },
  { id: "FULL_HEIGHT_CABINET_CEILING", name: "通顶柜绑定完成天花", category: "geometry", severity: "error", applicableWorkspaces: ["furniture"], applicableObjectTypes: ["cabinet"], requires3D: true },
  { id: "CABINET_CEILING_PENETRATION", name: "柜体不得穿出天花", category: "geometry", severity: "error", applicableWorkspaces: ["furniture"], applicableObjectTypes: ["cabinet"], requires3D: true },
  { id: "FURNITURE_SCENE_BOUNDS", name: "跨视图家具包围盒一致", category: "geometry", severity: "error", applicableWorkspaces: ["furniture", "space"], applicableObjectTypes: ["furniture"], requires3D: true },
  { id: "WALL_MODE_FURNITURE_INVARIANCE", name: "墙体模式不改变家具尺寸", category: "geometry", severity: "error", applicableWorkspaces: ["furniture", "space"], applicableObjectTypes: ["furniture"], requires3D: true },
  { id: "OPERATION_CLEARANCE", name: "操作面净空", category: "geometry", severity: "warning", applicableWorkspaces: ["furniture"], applicableObjectTypes: ["cabinet", "appliance", "sanitary", "bed", "dining"] },
  { id: "DOOR_CLEARANCE", name: "门洞及门扇开启", category: "geometry", severity: "error", applicableWorkspaces: ["furniture", "space"], applicableObjectTypes: ["door", "solidFurniture"], requires3D: true },
  { id: "WINDOW_OPERATION", name: "窗户操作空间", category: "geometry", severity: "warning", applicableWorkspaces: ["furniture", "space"], applicableObjectTypes: ["window", "solidFurniture"], requires3D: true },
  { id: "ROOM_RELATION", name: "房间归属关系", category: "relation", severity: "warning", applicableWorkspaces: ["furniture", "space"], applicableObjectTypes: ["furniture", "door"] },
  { id: "MISSING_OBJECT_METADATA", name: "对象资料完整性", category: "metadata", severity: "info", applicableWorkspaces: ["furniture", "mep", "finishes"], applicableObjectTypes: ["furniture", "module", "equipment"], canAutoFix: true },
  { id: "DRAWING_READINESS", name: "图纸成熟度", category: "drawing", severity: "info", applicableWorkspaces: ["drawing-package"], applicableObjectTypes: ["drawing"], canAutoFix: false }
];

export const validationRuleById = new Map(validationRules.map((rule) => [rule.id, rule]));

export function isRuleApplicable(ruleId: string, workspaceId?: DesignWorkspaceId | "drawing-package", floorId?: FloorId) {
  if (!workspaceId) return true;
  const rule = validationRuleById.get(ruleId);
  if (!rule) return true;
  if (floorId === "YARD" && rule.applicableWorkspaces.includes("yard")) return true;
  return rule.applicableWorkspaces.includes("all") || rule.applicableWorkspaces.includes(workspaceId);
}

export function groupValidationFindings(findings: ValidationFinding[]) {
  const grouped = new Map<string, ValidationFinding>();
  findings.forEach((finding) => {
    const key = finding.rootCauseKey ?? `${finding.ruleId}:${finding.objectId}:${finding.relatedObjectIds?.join(",") ?? ""}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...finding, derivedMessages: finding.derivedMessages ? [...finding.derivedMessages] : [] });
      return;
    }
    const messages = new Set([...(existing.derivedMessages ?? []), existing.message, finding.message]);
    existing.derivedMessages = Array.from(messages);
    existing.relatedObjectIds = Array.from(new Set([...(existing.relatedObjectIds ?? []), ...(finding.relatedObjectIds ?? [])]));
    if (severityRank(finding.severity) > severityRank(existing.severity)) existing.severity = finding.severity;
  });
  return Array.from(grouped.values());
}

function severityRank(severity: ValidationSeverity) {
  return { info: 0, warning: 1, error: 2, blocking: 3 }[severity];
}

export function getValidationGroup(severity: ValidationSeverity, category: ValidationCategory) {
  if (category === "drawing") return "drawing" as const;
  if (category === "metadata") return "metadata" as const;
  if (severity === "warning") return "confirm" as const;
  return "repair" as const;
}

/** Product-facing grouping: separates design conflicts from missing evidence and system integrity errors. */
export function getValidationProductGroup(finding: Pick<ValidationFinding, "severity" | "category">): ValidationProductGroup {
  if (finding.severity === "blocking" || finding.category === "blocking") return "system-error";
  if (finding.category === "metadata" || finding.category === "drawing") return "pending-data";
  if (finding.severity === "error") return "confirmed-conflict";
  if (finding.severity === "warning") return "high-risk";
  return "suggestion";
}
