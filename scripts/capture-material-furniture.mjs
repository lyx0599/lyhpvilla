import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const out = path.resolve("artifacts/material-inspector-qa");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "/Users/lyx/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell" });
const context = await browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
const page = await context.newPage();
await page.goto("http://127.0.0.1:3210/?materialInspectorQa=sofa", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.locator("main").first().waitFor({ state: "attached", timeout: 90000 });
await page.waitForTimeout(3200);
await page.locator("button:visible").filter({ hasText: "3D" }).first().click({ force: true });
await page.waitForTimeout(2600);
await page.locator("button:visible").filter({ hasText: "空间视角" }).first().click({ force: true });
await page.waitForTimeout(500);
const panel = page.locator('[data-testid="tour-room-panel"]');
const sofaView = panel.getByRole("button", { name: "客厅", exact: true });
if (await sofaView.count()) await sofaView.click({ force: true });
await page.waitForTimeout(1800);
const canvas = page.locator("canvas").last();
const rect = await canvas.evaluate((element) => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
await page.screenshot({ path: path.join(out, "desktop-sofa-scene.png"), fullPage: false });
let selected = false;
for (const [fx, fy] of [[0.50, 0.48], [0.45, 0.54], [0.56, 0.54], [0.50, 0.60], [0.40, 0.48], [0.62, 0.48]]) {
  await page.mouse.click(rect.x + rect.width * fx, rect.y + rect.height * fy);
  await page.waitForTimeout(250);
  const inspector = page.getByTestId("material-inspector");
  if (await inspector.count()) {
    const text = await inspector.innerText();
    if (/沙发|布艺|框架|金属脚/.test(text)) {
      await page.screenshot({ path: path.join(out, "desktop-sofa-material-panel.png"), fullPage: false });
      await writeFile(path.join(out, "desktop-sofa-material-panel.txt"), text, "utf8");
      selected = true;
      break;
    }
    const close = inspector.getByRole("button", { name: "关闭材质信息", exact: true });
    if (await close.count()) await close.click({ force: true });
  }
}
console.log(JSON.stringify({ selected, out }));
await browser.close();
