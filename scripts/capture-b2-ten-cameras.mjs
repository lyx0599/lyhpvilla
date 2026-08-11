import { chromium } from "@playwright/test";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const targetUrl = process.env.B2_CAMERA_URL ?? "http://127.0.0.1:3214/";
const outputDir = path.resolve(process.env.B2_CAMERA_OUTPUT_DIR ?? "artifacts/b2-ten-camera-explained-v4-20260810/base-3d");
const views = [
  ["01-entry-door-foyer", "designer-camera-b2-01-stair-arrival", "室内斜看入户门与开放玄关"],
  ["02-foyer-to-cinema", "designer-camera-b2-02-stair-living", "入户门内侧看玄关与观影区"],
  ["03-cinema-overview", "designer-camera-b2-03-living-entry", "观影区含玄关全景"],
  ["04-leather-sofa-reverse", "designer-camera-b2-04-living-main", "电视墙反看真皮沙发"],
  ["05-l-wall-front", "designer-camera-b2-05-living-daylight", "L型纪念品墙正面"],
  ["06-slab-table-long", "designer-camera-b2-06-study-entry", "大板桌南端看L型柜"],
  ["07-slab-table-diagonal", "designer-camera-b2-07-study-reading", "大板桌与L型柜斜角"],
  ["08-activity-overview", "designer-camera-b2-08-activity-overview", "活动区看大板桌"],
  ["09-stair-storage-door", "designer-camera-b2-10-under-stair-storage", "楼梯间与储藏室隐形矮门"],
  ["10-stair-storage-open", "designer-camera-b2-11-under-stair-open", "储藏室开门看内部货架"]
];
const onlyId = process.argv.find((argument) => argument.startsWith("--only="))?.slice("--only=".length);
const selectedViews = onlyId ? views.filter(([id]) => id === onlyId) : views;
if (onlyId && selectedViews.length === 0) throw new Error(`Unknown B2 camera id: ${onlyId}`);

async function settle(page, ms = 1600) {
  await page.waitForTimeout(ms);
  await page.locator("canvas").last().waitFor({ state: "visible", timeout: 60_000 });
}

async function captureCanvas(page, outputPath) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const canvas = page.locator("canvas").last();
    await canvas.waitFor({ state: "visible", timeout: 60_000 });
    const box = await canvas.boundingBox().catch(() => null);
    if (box && box.width > 300 && box.height > 300) {
      const captured = await page.screenshot({ path: outputPath, clip: box }).then(() => true).catch(() => false);
      if (captured) return;
    }
    await page.waitForTimeout(1200);
  }
  throw new Error(`Unable to capture stable B2 canvas: ${outputPath}`);
}

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
  const storageDoorQuery = id === "10-stair-storage-open" ? "&storageDoor=open" : "";
  const entryDoorQuery = ["01-entry-door-foyer", "02-foyer-to-cinema"].includes(id) ? "&entryDoor=open" : "";
  await page.goto(`${targetUrl}?camera=${cameraId}&capture=${Date.now()}${storageDoorQuery}${entryDoorQuery}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.locator("main").first().waitFor({ state: "attached" });
  await page.waitForTimeout(2400);

  await page.locator("button:visible").filter({ hasText: "3D" }).first().click({ force: true });
  await settle(page, 2200);
  const floorSelect = page.locator('select:has(option[value="B2"])').first();
  if (await floorSelect.count()) await floorSelect.selectOption("B2", { force: true });
  else await page.getByRole("button", { name: /b2 地下室二层/i }).first().click({ force: true });
  await settle(page, 2100);
  await page.getByRole("button", { name: "空间视角", exact: true }).first().click({ force: true });
  await page.waitForTimeout(900);
  const panel = page.getByTestId("tour-room-panel");
  const viewButton = panel.getByRole("button", { name: new RegExp(`^${viewName}`) }).first();
  if (!(await viewButton.count())) {
    const available = await panel.locator("button").allTextContents();
    throw new Error(`Missing B2 camera view: ${viewName}\n${available.join("\n")}`);
  }
  await viewButton.click({ force: true });
  await settle(page, 2200);
  const outputPath = path.join(outputDir, `${id}.png`);
  await captureCanvas(page, outputPath);
  const details = await stat(outputPath);
  if (details.size < 30_000) throw new Error(`B2 camera capture looks incomplete: ${outputPath}`);
  console.log(`${id}\t${viewName}\t${details.size}`);
}

await page.close();
await browser.close();
console.log(`Captured ${selectedViews.length} B2 camera view(s) in ${outputDir}`);
