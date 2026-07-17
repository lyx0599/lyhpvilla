import { registerHooks } from "node:module";
import { readFile } from "node:fs/promises";

const rootUrl = new URL("../", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) return nextResolve(`${rootUrl}${specifier.slice(2)}${specifier.endsWith(".ts") ? "" : ".ts"}`, context);
    return nextResolve(specifier, context);
  }
});

const [{ validateHouse }, { validateFurniturePlacement }, { validateWorkspaceReferences }, { validateStairSystems }] = await Promise.all([
  import("../src/core/houseValidator.ts"),
  import("../lib/furniture-placement.ts"),
  import("../lib/workspace-reference-validator.ts"),
  import("../lib/stair-systems.ts")
]);

const workspace = JSON.parse(await readFile(new URL("../data/default-workspace.json", import.meta.url), "utf8"));
const floorIds = ["B2", "B1", "1F", "2F", "YARD"];
const floors = floorIds.map((floorId) => {
  const structure = workspace.houseStructuresByFloor[floorId];
  const furniture = workspace.furniture.filter((item) => item.floorId === floorId);
  const drawingItems = workspace.drawingItems.filter((item) => item.floorId === floorId);
  const house = validateHouse(floorId, structure, furniture);
  const placement = validateFurniturePlacement(structure, furniture, drawingItems);
  return {
    floorId,
    errors: house.errors.length + placement.filter((issue) => issue.severity === "error").length,
    warnings: house.warnings.length + placement.filter((issue) => issue.severity === "warning").length,
    infos: house.infos.length + placement.filter((issue) => issue.severity === "info").length,
    errorDetails: placement.filter((issue) => issue.severity === "error").map((issue) => `${issue.code}: ${issue.furnitureId}${issue.relatedObjectId ? ` / ${issue.relatedObjectId}` : ""}`),
    placementByCode: Object.fromEntries([...new Set(placement.map((issue) => issue.code))].sort().map((code) => [code, placement.filter((issue) => issue.code === code).length]))
  };
});

const references = validateWorkspaceReferences(workspace);
const stairs = validateStairSystems({
  structuresByFloor: workspace.houseStructuresByFloor,
  stairSystems: workspace.stairSystems,
  stairLandings: workspace.stairLandings,
  stairOpenings: workspace.stairOpenings,
  furniture: workspace.furniture
});

console.log(JSON.stringify({ floors, references: { errors: references.errors.length, warnings: references.warnings.length }, stairs }, null, 2));
