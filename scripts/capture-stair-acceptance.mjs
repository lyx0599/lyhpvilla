import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("docs/stair-acceptance");
const baseUrl = process.env.STAIR_ACCEPTANCE_URL ?? "http://localhost:3000/";

function exactButton(name) {
  return { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) };
}

async function settle(page, ms = 1400) {
  await page.waitForTimeout(ms);
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 20_000 });
}

async function clickButton(page, name) {
  await page.getByRole("button", exactButton(name)).click({ timeout: 20_000 });
  await settle(page, 900);
}

async function selectFloor(page, buttonName) {
  await clickButton(page, buttonName);
  await settle(page, 1600);
}

async function openMoreView(page, viewName) {
  const escaped = viewName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const viewNamePattern = new RegExp(`^${escaped}(?:\\s+(?:结构 / 特征视角|房间视角|通用视角|灯光体验视角))?$`);
  const direct = page.getByRole("button", { name: viewNamePattern }).first();
  if (await direct.count()) {
    await direct.click();
    await settle(page, 1900);
    return;
  }
  await page.getByRole("button", { name: /^更多/ }).click();
  await page.getByRole("button", { name: viewNamePattern }).first().click();
  await settle(page, 1900);
}

async function setDrawingSheet(page, label) {
  await page.getByLabel("3D 图纸专项").selectOption({ label });
  await settle(page, 1200);
}

async function captureCanvas(page, fileName) {
  const canvas = page.locator("canvas").first();
  await canvas.screenshot({ path: path.join(outputDir, `${fileName}.png`) });
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(25_000);
await page.goto(baseUrl, { waitUntil: "networkidle" });

const codeVersionButton = page.getByRole("button", { name: "放弃草稿，使用代码版本" });
if (await codeVersionButton.count()) {
  await codeVersionButton.click();
  await settle(page, 1600);
}

await clickButton(page, "效果3D");

await selectFloor(page, "b1 地下室一层");
await clickButton(page, "鸟瞰");
await captureCanvas(page, "01-b1-ordinary-overview");
await openMoreView(page, "正面对楼梯全景");
await captureCanvas(page, "02-b1-stair-front-panorama");
await openMoreView(page, "左侧下行至 B2");
await captureCanvas(page, "03-b1-stair-side-left-down");
await openMoreView(page, "挑空边缘俯视");
await captureCanvas(page, "03b-b1-opening-edge-overlook");
await setDrawingSheet(page, "结构图");
await openMoreView(page, "正面对楼梯全景");
await captureCanvas(page, "04-shared-drawing-3d-structure");

await selectFloor(page, "1f 一层 / 客餐厨");
await setDrawingSheet(page, "总平面图");
await openMoreView(page, "客厅");
await captureCanvas(page, "05-1f-living-facing-stair");

await selectFloor(page, "b2 地下室二层");
await openMoreView(page, "楼梯底部上行");
await captureCanvas(page, "06-b2-stair-bottom-up");

await selectFloor(page, "2f 二层 / 卧室区");
await openMoreView(page, "到达平台");
await captureCanvas(page, "07-2f-stair-arrival");

await browser.close();
console.log(`Captured stair acceptance screenshots in ${outputDir}`);
