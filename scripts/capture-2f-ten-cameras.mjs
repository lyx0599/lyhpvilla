import { chromium } from "@playwright/test";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const targetUrl = process.env.SECOND_FLOOR_CAMERA_URL ?? "http://127.0.0.1:3212/2f-preview";
const outputDir = path.resolve("artifacts/2f-approved-layout-20260810/base-3d");
const views = [
  ["01-stair-arrival", "designer-camera-2f-01-stair-arrival", "2F 楼梯到达与走廊"],
  ["02-stair-opening-night", "designer-camera-2f-02-stair-opening-night", "2F 楼梯洞口关系 / 夜景"],
  ["03-corridor-master-open", "designer-camera-2f-03-corridor-master-open", "2F 走廊看向开启的主卧门"],
  ["04-guest-bath", "designer-camera-2f-04-guest-bath", "2F 客卫整体"],
  ["05-master-overview", "designer-camera-2f-05-master-overview", "2F 主卧整体 / 西墙床与唯一飘窗"],
  ["06-master-reverse-storage", "designer-camera-2f-06-master-reverse-storage", "2F 主卧反向 / 大衣柜与五斗橱"],
  ["07-dark-glass-dressing", "designer-camera-2f-07-dark-glass-dressing", "2F 深色玻璃衣帽间与升降桌"],
  ["08-master-bath", "designer-camera-2f-08-master-bath", "2F 主卫 / 保留浴缸"],
  ["09-parent-balcony", "designer-camera-2f-09-parent-balcony", "2F 父母房与共享阳台"],
  ["10-child-balcony", "designer-camera-2f-10-child-balcony", "2F 儿童房收纳与共享阳台"]
];
const onlyId = process.argv.find((argument) => argument.startsWith("--only="))?.slice("--only=".length);
const selectedViews = onlyId ? views.filter(([id]) => id === onlyId) : views;
if (onlyId && selectedViews.length === 0) throw new Error(`Unknown 2F camera id: ${onlyId}`);

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 1536, height: 1024 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce"
});
const page = await context.newPage();
page.setDefaultTimeout(60_000);

for (const [id, cameraId, viewName] of selectedViews) {
  let canvas;
  let box;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(`${targetUrl}?camera=${cameraId}&capture=${Date.now()}-${attempt}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.locator("canvas").first().waitFor({ state: "visible", timeout: 120_000 });
    await page.waitForTimeout(5000 + attempt * 1500);
    const canvases = page.locator("canvas");
    canvas = canvases.first();
    box = await canvas.boundingBox();
    for (let index = 1; index < await canvases.count(); index += 1) {
      const candidate = canvases.nth(index);
      const candidateBox = await candidate.boundingBox();
      if (candidateBox && (!box || candidateBox.width * candidateBox.height > box.width * box.height)) {
        canvas = candidate;
        box = candidateBox;
      }
    }
    if (box && box.width >= 300 && box.height >= 300) break;
  }
  if (!box || box.width < 300 || box.height < 300) throw new Error(`2F canvas unavailable: ${viewName}`);
  const outputPath = path.join(outputDir, `${id}.png`);
  const diagnostics = await page.locator("[data-floor-3d-scene-root]").evaluate((element) => ({
    activeCamera: element.getAttribute("data-active-camera-view-id"),
    cameraLock: element.getAttribute("data-camera-lock-enabled"),
    sceneCameraLock: element.getAttribute("data-scene-camera-lock"),
    sceneFixedCameraId: element.getAttribute("data-scene-fixed-camera-id"),
    lockFrame: element.getAttribute("data-camera-lock-frame"),
    renderCameraPosition: element.getAttribute("data-render-camera-position"),
    requestVersion: element.getAttribute("data-camera-request-version"),
    requestId: element.getAttribute("data-camera-request-id"),
    requestPosition: element.getAttribute("data-camera-request-position"),
    cameraPosition: element.getAttribute("data-camera-position"),
    cameraTarget: element.getAttribute("data-camera-target"),
    requestedWallMode: element.getAttribute("data-wall-display-mode"),
    sceneWallMode: element.getAttribute("data-scene-wall-display-mode")
  }));
  diagnostics.sceneRootCount = await page.locator("[data-floor-3d-scene-root]").count();
  await page.screenshot({ path: outputPath, clip: box });
  const details = await stat(outputPath);
  if (details.size < 30_000) throw new Error(`2F camera capture looks incomplete: ${outputPath}`);
  console.log(`${id}\t${viewName}\t${details.size}\t${JSON.stringify(diagnostics)}`);
}

await page.close();
await browser.close();
console.log(`Captured ${selectedViews.length} 2F camera view(s) in ${outputDir}`);
