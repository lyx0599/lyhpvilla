import fs from "node:fs";
import path from "node:path";
import { applyModernNaturalStyle } from "../lib/furniture-variants.ts";
import { CURRENT_WORKSPACE_DATA_REVISION, CURRENT_WORKSPACE_SCHEMA_VERSION } from "../lib/workspace-migrations.ts";

const workspacePath = path.resolve("data/default-workspace.json");
const workspace = JSON.parse(fs.readFileSync(workspacePath, "utf8"));
const protectedData = ({ id, floorId, roomId, outdoorId, position, dimensions, hostWallId, wallAnchor, mepMeta, constructionMeta }) => ({ id, floorId, roomId, outdoorId, position, dimensions, hostWallId, wallAnchor, mepMeta, constructionMeta });
const before = JSON.stringify(workspace.furniture.map(protectedData));
const result = applyModernNaturalStyle(workspace.furniture, { type: "house" });
workspace.furniture = result.furniture;
workspace.schemaVersion = CURRENT_WORKSPACE_SCHEMA_VERSION;
workspace.dataRevision = CURRENT_WORKSPACE_DATA_REVISION;
if (before !== JSON.stringify(workspace.furniture.map(protectedData))) throw new Error("Style application changed protected furniture data.");
fs.writeFileSync(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`);
console.log(`Modern natural furniture applied: ${result.adjusted} adjusted, ${result.skipped} preserved.`);
