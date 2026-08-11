import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const inputPath = path.resolve(process.argv[2]);
const outputPath = path.resolve(process.argv[3]);
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1780, height: 1120 }, deviceScaleFactor: 1 });
const source = await readFile(inputPath, "utf8");
const content = path.extname(inputPath).toLowerCase() === ".html"
  ? source
  : `<style>html,body{margin:0;background:#f6f2eb}svg{display:block}</style>${source}`;
await page.setContent(content, { waitUntil: "domcontentloaded" });
await page.screenshot({ path: outputPath, fullPage: true });
await browser.close();
console.log(outputPath);
