import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.MATERIAL_INSPECTOR_URL ?? "http://127.0.0.1:3210/";
const outputDir = path.resolve(process.env.MATERIAL_INSPECTOR_OUTPUT ?? "artifacts/material-inspector-qa");
const browser = await chromium.launch({ headless: true, executablePath: "/Users/lyx/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell" });

async function openScene(viewport, suffix) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error(`page error: ${error.message}`));
  await page.goto(`${baseUrl}?materialInspectorQa=${suffix}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.locator("main").first().waitFor({ state: "attached", timeout: 90000 });
  await page.waitForTimeout(2500);
  const dialog = page.locator('[role="dialog"]');
  if (await dialog.count() && await dialog.first().isVisible()) {
    const buttons = dialog.first().locator("button");
    const labels = await buttons.allTextContents();
    if (labels.length) await buttons.nth(labels.length - 1).click({ force: true });
    await page.waitForTimeout(800);
  }
  const view3d = page.locator("button").filter({ hasText: "3D" });
  if (await view3d.count()) await view3d.first().click({ force: true });
  const canvas = page.locator("canvas").last();
  await canvas.waitFor({ state: "visible", timeout: 90000 });
  await page.waitForTimeout(2200);
  const canvasBox = await canvas.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  if (!canvasBox) throw new Error("3D canvas unavailable");
  await page.screenshot({ path: path.join(outputDir, `${suffix}-scene.png`), fullPage: false });

  // Try a small deterministic grid; the first successful hit is retained as the representative object.
  let selectedPoint = null;
  const candidatePoints = [
    [0.58, 0.58], [0.55, 0.62], [0.63, 0.58], [0.48, 0.58],
    [0.42, 0.62], [0.68, 0.62], [0.58, 0.48], [0.45, 0.48]
  ];
  for (const [fx, fy] of candidatePoints) {
      await page.mouse.click(canvasBox.x + canvasBox.width * fx, canvasBox.y + canvasBox.height * fy);
      await page.waitForTimeout(180);
      const inspector = page.getByTestId("material-inspector");
      if (await inspector.count()) {
        const text = await inspector.innerText();
        if (/沙发|柜|床|桌|椅|台面/.test(text)) {
          selectedPoint = { x: fx, y: fy };
          break;
        }
        const closeButton = inspector.getByRole("button", { name: "关闭材质信息", exact: true });
        if (await closeButton.count()) await closeButton.click();
      }

  }
  if (selectedPoint) {
    await page.screenshot({ path: path.join(outputDir, `${suffix}-material-panel.png`), fullPage: false });
    const panelText = await page.getByTestId("material-inspector").innerText();
    await writeFile(path.join(outputDir, `${suffix}-material-panel.txt`), panelText, "utf8");
    // A drag should rotate the camera without opening a second selection.
    await page.mouse.move(canvasBox.x + canvasBox.width * selectedPoint.x, canvasBox.y + canvasBox.height * selectedPoint.y);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * (selectedPoint.x + 0.16), canvasBox.y + canvasBox.height * (selectedPoint.y - 0.06), { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outputDir, `${suffix}-after-drag.png`), fullPage: false });
  }
  await context.close();
  return selectedPoint;
}

await mkdir(outputDir, { recursive: true });
const desktopPoint = await openScene({ width: 1280, height: 820 }, "desktop");
const mobilePoint = await openScene({ width: 390, height: 844 }, "mobile");
console.log(JSON.stringify({ desktopPoint, mobilePoint, outputDir }));
await browser.close();
