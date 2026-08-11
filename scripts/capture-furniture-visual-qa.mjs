import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const args = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...value] = argument.replace(/^--/, "").split("=");
  return [key, value.join("=")];
}));

const targetUrl = args.url ?? "http://127.0.0.1:3210/";
const outputDir = path.resolve(args.output ?? "docs/furniture-visual-qa/after");
const probeMode = args.probe === "true";
const waitTimeout = Number(args.waitTimeout ?? 90_000);
const channel = process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === "0" ? undefined : "chrome";
console.log(`visual QA: ${probeMode ? "probe" : "capture"} -> ${outputDir}`);

const scenes = [
  { id: "1f-living", floorId: "1F", viewName: "1F 沙发模块细节", buttonName: "沙发模块细节", buttonCategory: "结构 / 特征视角" },
  { id: "1f-dining", floorId: "1F", viewName: "1F 餐桌", buttonName: "餐桌", buttonCategory: "结构 / 特征视角" },
  { id: "2f-master-bedroom", floorId: "2F", viewName: "卧室", buttonName: "卧室", buttonCategory: "房间视角" }
];

function cacheBustedUrl(url) {
  const parsed = new URL(url);
  parsed.searchParams.set("visualQa", String(Date.now()));
  return parsed.toString();
}

async function selectFloor(page, floorId) {
  const desktopFloorSelect = page.locator('select:has(option[value="YARD"])');
  if (await desktopFloorSelect.count()) {
    await desktopFloorSelect.selectOption(floorId, { force: true });
    return;
  }
  const mobileFloorButton = page.getByRole("button", { name: floorId, exact: true });
  if (await mobileFloorButton.count()) await mobileFloorButton.first().click();
}

async function selectCameraView(page, viewName, buttonName, buttonCategory) {
  const picker = page.getByTestId("tour-room-panel");
  if (!(await picker.isVisible().catch(() => false))) await page.getByRole("button", { name: "空间视角", exact: true }).first().click();
  const viewButton = picker.getByRole("button", { name: new RegExp(`^${buttonName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }).filter({ hasText: buttonCategory });
  if (!(await viewButton.count())) {
    const labels = (await page.locator("button").allTextContents()).filter((label) => /视角|1F|2F|客厅|餐桌|主卧/.test(label));
    throw new Error(`Camera view not found: ${viewName}\n${labels.join("\n")}`);
  }
  await viewButton.first().click();
  await page.waitForTimeout(1300);
}

async function orbitCanvas(page, canvas, deltaX, deltaY, wheelY = 0) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("3D canvas has no visible bounding box.");
  const x = box.x + box.width * 0.5;
  const y = box.y + box.height * 0.48;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaX, y + deltaY, { steps: 18 });
  await page.mouse.up();
  if (wheelY) await page.mouse.wheel(0, wheelY);
  await page.waitForTimeout(550);
}

const browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
const context = await browser.newContext({
  viewport: { width: 1000, height: 820 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce"
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
page.on("pageerror", (error) => console.error(`page error: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") console.error(`browser console: ${message.text()}`);
});
page.on("requestfailed", (request) => console.error(`request failed: ${request.url()} (${request.failure()?.errorText ?? "unknown"})`));
page.on("response", (response) => {
  if (response.status() >= 400) console.error(`response ${response.status()}: ${response.url()}`);
});

await page.goto(cacheBustedUrl(targetUrl), { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.locator("main").first().waitFor({ state: "attached", timeout: waitTimeout });
await page.waitForTimeout(2500);
const dialog = page.locator('[role="dialog"]');
if (await dialog.count() && await dialog.first().isVisible()) {
  const buttons = dialog.first().locator("button");
  const labels = await buttons.allTextContents();
  const preferredIndex = labels.findIndex((label) => /最新|默认|载入|加载|更新/.test(label));
  await buttons.nth(preferredIndex >= 0 ? preferredIndex : labels.length - 1).click({ force: true });
  await page.waitForTimeout(1200);
  console.log(`dialog accepted: ${labels[preferredIndex >= 0 ? preferredIndex : labels.length - 1] ?? "unknown"}`);
}
const view3dButton = page.locator("button").filter({ hasText: "3D" }).first();
await view3dButton.click({ force: true });
await page.locator("canvas").last().waitFor({ state: "visible", timeout: 90_000 });
const cleanAxon = page.getByRole("button", { name: "干净轴测", exact: true });
if (await cleanAxon.count()) await cleanAxon.click();
await mkdir(outputDir, { recursive: true });

for (const scene of scenes) {
  await selectFloor(page, scene.floorId);
  await page.waitForTimeout(500);
  await selectCameraView(page, scene.viewName, scene.buttonName, scene.buttonCategory);
  const canvas = page.locator("canvas").last();
  if (probeMode) {
    const candidates = [
      { id: "left-wide", x: -320, y: -45, wheel: 420 },
      { id: "left", x: -220, y: -20, wheel: 180 },
      { id: "left-low", x: -150, y: 80, wheel: 120 },
      { id: "right-wide", x: 320, y: -45, wheel: 420 },
      { id: "right", x: 220, y: -20, wheel: 180 },
      { id: "right-low", x: 150, y: 80, wheel: 120 }
    ];
    for (const candidate of candidates) {
      await selectCameraView(page, scene.viewName, scene.buttonName, scene.buttonCategory);
      await orbitCanvas(page, canvas, candidate.x, candidate.y, candidate.wheel);
      const probeBox = await canvas.boundingBox();
      if (!probeBox) throw new Error("3D canvas has no visible bounding box.");
      const screenshot = await cdp.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 84,
        captureBeyondViewport: false,
        clip: { x: probeBox.x, y: probeBox.y, width: probeBox.width, height: probeBox.height, scale: 1 }
      });
      await writeFile(path.join(outputDir, `${scene.id}-${candidate.id}.jpg`), Buffer.from(screenshot.data, "base64"));
      console.log(`${scene.id}-${candidate.id}`);
    }
    continue;
  }
  const outputPath = path.join(outputDir, `${scene.id}.jpg`);
  const box = await canvas.boundingBox();
  if (!box) throw new Error("3D canvas has no visible bounding box.");
  const topCrop = Math.min(96, box.height * 0.15);
  const bottomCrop = Math.min(112, box.height * 0.18);
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 90,
    captureBeyondViewport: false,
    clip: { x: box.x, y: box.y + topCrop, width: box.width, height: box.height - topCrop - bottomCrop, scale: 1 }
  });
  await writeFile(outputPath, Buffer.from(screenshot.data, "base64"));
  const details = await stat(outputPath);
  if (details.size < 20_000) throw new Error(`Screenshot looks blank or incomplete: ${outputPath}`);
  console.log(`${scene.id}: ${details.size} bytes`);
}

await browser.close();
