import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./test/browser",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4321", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:4321/api/lesson",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { ANTHROPIC_API_KEY: "", PORT: "4321" },
  },
});
