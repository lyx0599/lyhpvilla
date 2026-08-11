import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.PBR_AUDIT_URL ?? "http://127.0.0.1:3210/pbr-audit";
const outputDir = process.env.PBR_AUDIT_OUTPUT ?? "artifacts/pbr-audit-nine";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PBR_AUDIT_BROWSER ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
});
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 120000 });
const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await mobilePage.goto(baseUrl, { waitUntil: "networkidle", timeout: 120000 });
const selects = page.locator("select");
const mobileSelects = mobilePage.locator("select");
await selects.nth(0).waitFor({ state: "visible", timeout: 120000 });
await mobileSelects.nth(0).waitFor({ state: "visible", timeout: 120000 });
const tokens = [
  ["oakFloor", ["base", "oakfloor-1", "oakfloor-2"]],
  ["warmGreyStone", ["base", "greystone-1", "greystone-2"]],
  ["wetAreaTile", ["base", "wet-tile-1", "wet-tile-2"]],
  ["warmWhiteMineral", ["base", "wall-1"]],
  ["microCement", ["base", "microcement-1", "microcement-2"]],
  ["warmWhiteCeramic", ["base", "ceramic-1"]],
  ["beigeFabric", ["base", "fabric-1", "fabric-2"]],
  ["blackTitanium", ["base", "metal-1", "metal-2"]],
  ["courtyardStone", ["base", "courtyard-1", "courtyard-2"]]
];
const select = async (index, value) => { await selects.nth(index).selectOption(value); await page.waitForTimeout(80); };
const selectMobile = async (index, value) => { await mobileSelects.nth(index).selectOption(value); await mobilePage.waitForTimeout(80); };
const selectToken = async (value) => {
  await selects.nth(0).selectOption(value);
  await page.waitForFunction((token) => document.querySelectorAll("select")[0]?.value === token, value, { timeout: 10000 });
};
const selectMobileToken = async (value) => {
  await mobileSelects.nth(0).selectOption(value);
  await mobilePage.waitForFunction((token) => document.querySelectorAll("select")[0]?.value === token, value, { timeout: 10000 });
};
const settle = async () => {
  await page.waitForTimeout(500);
  return page.evaluate(() => (window).__PBR_AUDIT_METRICS__ ?? null);
};
const rows = [];
for (const [token, variants] of tokens) {
  for (const variant of variants) {
    await selectToken(token); await select(1, "scene"); await page.waitForTimeout(500); await selects.nth(4).locator(`option[value="${variant}"]`).waitFor({ state: "attached", timeout: 60000 });
    await select(2, "new"); await select(3, "standard"); await select(4, variant); await select(7, "normal");
    const desktop = await settle();
    await selectMobileToken(token); await selectMobile(1, "scene"); await mobilePage.waitForTimeout(500); await mobileSelects.nth(4).locator(`option[value="${variant}"]`).waitFor({ state: "attached", timeout: 60000 });
    await selectMobile(2, "new"); await selectMobile(3, "standard"); await selectMobile(4, variant); await selectMobile(7, "normal");
    const mobile = await mobilePage.evaluate(async () => { await new Promise((resolve) => setTimeout(resolve, 500)); return (window).__PBR_AUDIT_METRICS__ ?? null; });
    rows.push({ token, variant, desktop, mobile });
  }
}
await mkdir(outputDir, { recursive: true });
await writeFile(`${outputDir}/performance.json`, JSON.stringify({ generatedAt: new Date().toISOString(), note: "GPU time is not exposed consistently by WebGL; draw/triangle/texture counters are direct, texture bytes are estimated from material resolution × active map count.", rows }, null, 2));
await browser.close();
console.log(`PBR audit performance written to ${outputDir}/performance.json`);
