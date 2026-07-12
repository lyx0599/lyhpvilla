import { defineConfig, devices } from "@playwright/test";

const port = 3210;
const useSystemChrome = process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === "1" || (process.platform === "darwin" && !process.env.CI);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(useSystemChrome ? { channel: "chrome" as const } : {})
  },
  webServer: {
    command: `NEXT_DIST_DIR=.next-playwright node_modules/.bin/next dev --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    { name: "iphone-portrait", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    {
      name: "iphone-landscape",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 844, height: 390 }
      }
    },
    { name: "android-chrome", use: { ...devices["Pixel 7"], browserName: "chromium" } }
  ]
});
