import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const renderDirectory = path.resolve("out", "renders");
const allowedHistoricalCovers = new Set([
  "four-level-villa-3d-cover.png",
  "four-level-villa-3d-cover.previous.png"
]);

try {
  if (!(await stat(renderDirectory)).isDirectory()) process.exit(0);
} catch {
  process.exit(0);
}

const entries = await readdir(renderDirectory);
const generatedEntries = entries.filter((entry) => !allowedHistoricalCovers.has(entry));
for (const entry of generatedEntries) {
  await rm(path.join(renderDirectory, entry), { recursive: true, force: true });
}

console.log(`Pages render pruning completed: removed ${generatedEntries.length} generated entries, kept ${allowedHistoricalCovers.size} historical covers.`);
