import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.argv[2];

if (!sourcePath) {
  console.error("Usage: node scripts/apply-workspace-to-default.mjs <workspace-json>");
  process.exit(1);
}

const source = JSON.parse(await readFile(resolve(sourcePath), "utf8"));

if (!source.houseStructuresByFloor || !source.furniture) {
  console.error("Workspace JSON must include houseStructuresByFloor and furniture.");
  process.exit(1);
}

await writeFile(
  resolve("data/default-workspace.json"),
  `${JSON.stringify(source, null, 2)}\n`,
  "utf8"
);

console.log("Updated data/default-workspace.json");
