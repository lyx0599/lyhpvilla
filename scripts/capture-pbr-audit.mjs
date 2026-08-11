import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.PBR_AUDIT_URL ?? "http://127.0.0.1:3100/pbr-audit";
const outputDir = process.env.PBR_AUDIT_OUTPUT ?? "artifacts/pbr-audit";
const tokens = [
  ["oakFloor", "木地板"], ["warmGreyStone", "暖灰石材"], ["wetAreaTile", "湿区瓷砖"],
  ["warmWhiteMineral", "暖白矿物墙漆"], ["microCement", "暖白微水泥"], ["warmWhiteCeramic", "暖白陶瓷"],
  ["beigeFabric", "米灰布艺"], ["blackTitanium", "深色拉丝金属"], ["courtyardStone", "庭院石材"]
];
const candidateVariants = {
  oakFloor: ["oakfloor-1", "oakfloor-2"],
  warmGreyStone: ["greystone-1", "greystone-2"],
  wetAreaTile: ["wet-tile-1", "wet-tile-2"],
  warmWhiteMineral: ["wall-1"],
  microCement: ["microcement-1", "microcement-2"],
  warmWhiteCeramic: ["ceramic-1"],
  beigeFabric: ["fabric-1", "fabric-2"],
  blackTitanium: ["metal-1", "metal-2"],
  courtyardStone: ["courtyard-1", "courtyard-2"]
};
const realScaleShape = {
  oakFloor: "plane", warmGreyStone: "slabs", wetAreaTile: "counter", warmWhiteMineral: "corner",
  microCement: "corner", warmWhiteCeramic: "counter", beigeFabric: "scene", blackTitanium: "corner", courtyardStone: "plane"
};

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PBR_AUDIT_BROWSER ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
});
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 120000 });
await page.locator("select").nth(0).waitFor({ state: "visible", timeout: 120000 });

const selects = page.locator("select");
if (await selects.count() !== 10) throw new Error("Expected ten audit selectors");
const select = async (index, value) => {
  await selects.nth(index).selectOption(value);
};
const slug = (value) => value.replaceAll(/[^a-zA-Z0-9_-]+/g, "-").replaceAll(/^-+|-+$/g, "").toLowerCase();

for (const [token, label] of tokens) {
  await select(0, token);
  for (const [shape, shapeLabel] of [["sphere", "材质球"], ["plane", "斜射近景"], ["corner", "转角近景"], ["scene", "场景代理"]]) {
    await select(1, shape);
    await select(4, "base");
    await page.screenshot({ path: `${outputDir}/${slug(token)}-${shape}-standard.png`, fullPage: true });
  }
}

// Nine-material audit pass. All images use the same ACES/1.0 exposure,
// neutral room environment, fixed camera and standard desktop quality.
for (const [token] of tokens) {
  await select(0, token);
  await select(2, "new");
  await select(3, "standard");
  await select(4, "base");
  await select(7, "normal");
  await select(1, "sphere");
  await page.screenshot({ path: `${outputDir}/nine-${token}-baseline-sphere-normal.png`, fullPage: true });
  await select(1, realScaleShape[token]);
  await page.screenshot({ path: `${outputDir}/nine-${token}-baseline-realscale-normal.png`, fullPage: true });
  await select(1, "scene");
  await select(7, "firstPerson");
  await page.screenshot({ path: `${outputDir}/nine-${token}-baseline-scene-firstperson.png`, fullPage: true });
  for (const variant of candidateVariants[token]) {
    await select(4, variant);
    await select(7, "normal");
    await select(1, "sphere");
    await page.screenshot({ path: `${outputDir}/nine-${token}-${variant}-sphere-normal.png`, fullPage: true });
    await select(1, realScaleShape[token]);
    await page.screenshot({ path: `${outputDir}/nine-${token}-${variant}-realscale-normal.png`, fullPage: true });
    await select(1, "scene");
    await select(7, "firstPerson");
    await page.screenshot({ path: `${outputDir}/nine-${token}-${variant}-scene-firstperson.png`, fullPage: true });
  }
}

await browser.close();
console.log(`PBR audit screenshots written to ${outputDir}`);
