import { expect, test } from "@playwright/test";

type MobileAuditWindow = Window & {
  __workspaceStorageWrites?: string[];
  __workspaceIndexedDbOpens?: string[];
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const auditWindow = window as MobileAuditWindow;
    auditWindow.__workspaceStorageWrites = [];
    auditWindow.__workspaceIndexedDbOpens = [];
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
      auditWindow.__workspaceStorageWrites?.push(key);
      return originalSetItem.call(this, key, value);
    };
    const originalOpen = indexedDB.open.bind(indexedDB);
    indexedDB.open = ((name: string, version?: number) => {
      auditWindow.__workspaceIndexedDbOpens?.push(name);
      return version === undefined ? originalOpen(name) : originalOpen(name, version);
    }) as IDBFactory["open"];
  });
});

test("mobile presentation remains strictly view-only", async ({ page }) => {
  test.setTimeout(120_000);
  const externalWriteRequests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/default-workspace") || url.includes("api.github.com/repos/") || url.includes("127.0.0.1:3011")) {
      externalWriteRequests.push(`${request.method()} ${url}`);
    }
  });

  await page.goto("/");
  await expect(page.locator('main[data-access-mode="view-only"]')).toBeVisible();
  await expect(page.locator('[data-mobile-presentation="true"]')).toBeVisible();

  for (const name of ["进入编辑模式", "保存到代码文件", "绑定代码文件", "自动写代码", "GitHub", "保存自检", "开发工具", "图纸包", "导出 HTML", "导出 JSON 清单", "导出 CSV 清单"]) {
    await expect(page.getByText(name, { exact: false })).toHaveCount(0);
  }

  const floorButton = page.getByRole("button", { name: "B1", exact: true });
  await expect(floorButton).toBeVisible();
  await floorButton.click({ force: true });
  await expect(page.getByText("B1 · 简洁", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "3D 模型", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "重置视角", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "房间漫游", exact: true })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCSS("touch-action", "none");

  await page.getByRole("button", { name: "房间漫游", exact: true }).click();
  const tourPanel = page.getByTestId("tour-room-panel");
  await expect(tourPanel).toBeVisible();
  await expect(tourPanel.getByRole("button").filter({ hasText: "B1 楼层总览" })).toBeVisible();
  const roomButton = tourPanel.getByRole("button").filter({ hasText: "房间" }).last();
  await roomButton.click();
  await expect(page.getByTestId("mobile-tour-title")).toContainText("B1 /");
  await expect(page.locator('[data-room-tour-active="true"]')).toBeVisible();
  await expect(page.getByTestId("tour-hotspots")).toBeVisible();
  const nextRoomHotspot = page.getByTestId("tour-hotspots").getByRole("button", { name: /^去/ }).first();
  await expect(nextRoomHotspot).toBeVisible();
  await nextRoomHotspot.click();
  await expect(page.getByTestId("mobile-tour-title")).toContainText("B1 /");
  await page.getByRole("button", { name: "退出漫游", exact: true }).click();
  await expect(page.locator('[data-room-tour-active="false"]')).toBeVisible();
  await page.getByRole("button", { name: "2D 图纸", exact: true }).click();

  const furniture = page.locator("[data-furniture-id]").first();
  await expect(furniture).toBeVisible();
  const styleBefore = await furniture.getAttribute("style");
  await furniture.click({ force: true });
  await expect(page.getByRole("button", { name: "关闭信息卡" })).toBeVisible();
  const box = await furniture.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 45, box.y + box.height / 2 + 30, { steps: 4 });
    await page.mouse.up();
  }
  await expect(furniture).toHaveAttribute("style", styleBefore ?? "");

  const audit = await page.evaluate(() => {
    const auditWindow = window as MobileAuditWindow;
    return {
      storageWrites: auditWindow.__workspaceStorageWrites ?? [],
      indexedDbOpens: auditWindow.__workspaceIndexedDbOpens ?? [],
      storedKeys: Object.keys(localStorage)
    };
  });
  expect(audit.storageWrites.filter((key) => key.includes("villa-space-web-workspace") || key.includes("local-code"))).toEqual([]);
  expect(audit.indexedDbOpens.filter((name) => name.includes("villa-space-local-code-file"))).toEqual([]);
  expect(audit.storedKeys.filter((key) => key.includes("villa-space-web-workspace"))).toEqual([]);
  expect(externalWriteRequests).toEqual([]);
});
