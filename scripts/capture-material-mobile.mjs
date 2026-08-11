import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const outputDir = path.resolve("artifacts/material-inspector-qa");
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "/Users/lyx/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell" });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
const page = await context.newPage();
await page.goto("http://127.0.0.1:3210/?materialInspectorQa=mobile-only", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.locator("main").first().waitFor({ state: "attached", timeout: 90000 });
await page.waitForTimeout(2600);
const dialog = page.locator('[role="dialog"]');
if (await dialog.count() && await dialog.first().isVisible()) {
  const buttons = dialog.first().locator("button");
  const count = await buttons.count();
  if (count) await buttons.nth(count - 1).click({ force: true });
}
const view3d = page.locator("button:visible").filter({ hasText: "3D" });
const canvas = page.locator("canvas").last();
if (!(await canvas.count()) && await view3d.count()) await view3d.first().click({ force: true });
await canvas.waitFor({ state: "visible", timeout: 90000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: path.join(outputDir, "mobile-scene.png"), fullPage: false });
const rect = await canvas.evaluate((element) => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
await page.mouse.click(rect.x + rect.width * 0.58, rect.y + rect.height * 0.58);
await page.waitForTimeout(500);
if (await page.getByTestId("material-inspector").count()) await page.screenshot({ path: path.join(outputDir, "mobile-material-panel.png"), fullPage: false });
console.log("mobile material screenshot complete");
await browser.close();
