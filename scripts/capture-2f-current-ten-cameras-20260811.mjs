import { chromium } from "@playwright/test";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const targetUrl = process.env.SECOND_FLOOR_CAMERA_URL ?? "http://127.0.0.1:3212/2f-preview";
const outputDir = path.resolve("artifacts/2f-ten-cameras-v15-20260811/base-3d");
const views = [
  ["01-stair-arrival", "designer-camera-2f-v3-01-stair-arrival", "上楼到达—主卧入口"],
  ["02-corridor-lookback", "designer-camera-2f-v3-02-stair-night", "走廊回看楼梯与房门"],
  ["03-guest-bath", "designer-camera-2f-v3-03-guest-bath", "客卫"],
  ["04-master-bed-bay", "designer-camera-2f-v3-04-master-bed", "主卧床与唯一飘窗"],
  ["05-master-true-entry", "designer-camera-2f-v3-05-master-storage", "主卧真实入户"],
  ["06-open-dressing", "designer-camera-2f-v3-06-dressing", "开放衣帽间与升降桌"],
  ["07-master-bath", "designer-camera-2f-v3-07-master-bath", "主卫"],
  ["08-parent-bedroom", "designer-camera-2f-v3-08-parent", "父母房"],
  ["09-child-bedroom", "designer-camera-2f-v3-09-child", "儿童房"],
  ["10-balcony", "designer-camera-2f-v3-10-balcony", "儿童房外封闭阳台"]
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(60_000);

for (const [fileId, cameraId, viewName] of views) {
  await page.goto(`${targetUrl}?camera=${cameraId}&capture=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 120_000 });
  await page.waitForTimeout(5000);
  const canvases = page.locator("canvas");
  let canvas = canvases.first();
  let box = await canvas.boundingBox();
  for (let index = 1; index < await canvases.count(); index += 1) {
    const candidate = canvases.nth(index);
    const candidateBox = await candidate.boundingBox();
    if (candidateBox && (!box || candidateBox.width * candidateBox.height > box.width * box.height)) {
      canvas = candidate;
      box = candidateBox;
    }
  }
  if (!box || box.width < 300 || box.height < 300) throw new Error(`Canvas unavailable: ${viewName}`);
  const outputPath = path.join(outputDir, `${fileId}.png`);
  await page.screenshot({ path: outputPath, clip: box });
  const details = await stat(outputPath);
  const activeCamera = await page.locator("[data-floor-3d-scene-root]").getAttribute("data-active-camera-view-id");
  if (details.size < 30_000) throw new Error(`Incomplete capture: ${outputPath}`);
  console.log(`${fileId}\t${cameraId}\t${activeCamera}\t${details.size}`);
}

await page.close();
await browser.close();
console.log(`Captured ${views.length} current 2F camera views in ${outputDir}`);
