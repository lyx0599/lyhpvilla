import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve("out");
const BASE_PATH = "/lyhpvilla";
const errors = [];

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function directoryExists(directoryPath) {
  try {
    return (await stat(directoryPath)).isDirectory();
  } catch {
    return false;
  }
}

async function checkHtml(fileName) {
  const filePath = path.join(OUT_DIR, fileName);
  if (!(await fileExists(filePath))) {
    errors.push(`${fileName} is missing`);
    return;
  }

  const html = await readFile(filePath, "utf8");
  if (!html.includes(`${BASE_PATH}/_next/`)) {
    errors.push(`${fileName} does not contain ${BASE_PATH}/_next/`);
  }
  if (/\b(?:src|href)=["']\/_next\//.test(html)) {
    errors.push(`${fileName} contains a root-relative /_next/ resource`);
  }
  const assetPaths = Array.from(html.matchAll(/(?:src|href)=["'](\/lyhpvilla\/_next\/static\/[^"']+)["']/g), (match) => match[1]);
  if (assetPaths.length === 0) errors.push(`${fileName} does not reference any built Next.js static assets`);
  for (const assetPath of assetPaths) {
    const relativePath = decodeURIComponent(assetPath.slice(BASE_PATH.length + 1));
    if (!(await fileExists(path.join(OUT_DIR, relativePath)))) errors.push(`${fileName} references missing asset ${assetPath}`);
  }
}

await checkHtml("index.html");
await checkHtml("404.html");

const indexPath = path.join(OUT_DIR, "index.html");
if (await fileExists(indexPath)) {
  const indexHtml = await readFile(indexPath, "utf8");
  if (!indexHtml.includes(`${BASE_PATH}/floor-plans/`)) {
    errors.push(`index.html does not contain ${BASE_PATH}/floor-plans/`);
  }
  const floorPlanPaths = Array.from(indexHtml.matchAll(/\/lyhpvilla\/(floor-plans\/[^"'\\<\s]+)/g), (match) => match[1]);
  if (floorPlanPaths.length === 0) errors.push("index.html does not reference a concrete floor plan asset");
  for (const floorPlanPath of new Set(floorPlanPaths)) {
    if (!(await fileExists(path.join(OUT_DIR, decodeURIComponent(floorPlanPath))))) errors.push(`index.html references missing /lyhpvilla/${floorPlanPath}`);
  }
  if (indexHtml.includes('"/floor-plans/') || indexHtml.includes('\\"/floor-plans/')) {
    errors.push("index.html contains a root-relative /floor-plans/ resource");
  }
}

if (!(await fileExists(path.join(OUT_DIR, ".nojekyll")))) {
  errors.push("out/.nojekyll is missing");
}

for (const directory of ["development", "webpack"]) {
  const directoryPath = path.join(OUT_DIR, "_next", "static", directory);
  if (await directoryExists(directoryPath)) {
    errors.push(`out/_next/static/${directory}/ must not be published`);
  }
}

if (errors.length > 0) {
  console.error("GitHub Pages build check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`GitHub Pages build is valid for ${BASE_PATH}.`);
