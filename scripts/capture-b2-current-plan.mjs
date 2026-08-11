import { chromium } from "@playwright/test";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const targetUrl = process.env.B2_PLAN_URL ?? "http://127.0.0.1:3214/";
const outputPath = path.resolve(
  process.env.B2_PLAN_OUTPUT ?? "artifacts/b2-ten-camera-current-20260811/current-b2-2d.png"
);

await mkdir(path.dirname(outputPath), { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 1536, height: 1024 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce"
});
const page = await context.newPage();
page.setDefaultTimeout(60_000);
await page.goto(`${targetUrl}?capture=${Date.now()}`, {
  waitUntil: "domcontentloaded",
  timeout: 240_000
});
await page.locator("main").first().waitFor({ state: "attached" });
await page.waitForTimeout(2400);

await page.locator("button:visible").filter({ hasText: "2D" }).first().click({ force: true });
await page.waitForTimeout(1800);
const floorSelect = page.locator('select:has(option[value="B2"])').first();
if (await floorSelect.count()) await floorSelect.selectOption("B2", { force: true });
else await page.getByRole("button", { name: /b2 地下室二层/i }).first().click({ force: true });
await page.waitForTimeout(2200);

const main = page.locator("main").first();
await main.waitFor({ state: "visible", timeout: 60_000 });
await main.screenshot({ path: outputPath });
const details = await stat(outputPath);
if (details.size < 30_000) throw new Error(`B2 plan capture looks incomplete: ${outputPath}`);

await page.close();
await browser.close();
console.log(`${outputPath}\t${details.size}`);
