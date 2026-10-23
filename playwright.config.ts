import { defineConfig, devices } from "@playwright/test";

const PROD_SPEC = /analytics-prod\.spec\.ts/;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    acceptDownloads: true,
  },
  webServer: [
    {
      command: "npm run build -- --mode e2e && npm run preview",
      url: "http://localhost:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    // Build production com o gtag.js, só para o projeto analytics-prod (005, research A8).
    {
      command: "npx vite build --outDir dist-prod && npx vite preview --outDir dist-prod --port 4174 --strictPort",
      url: "http://localhost:4174",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: "chromium", testIgnore: PROD_SPEC, use: { ...devices["Desktop Chrome"], permissions: ["clipboard-read", "clipboard-write"] } },
    { name: "firefox", testIgnore: PROD_SPEC, use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", testIgnore: PROD_SPEC, use: { ...devices["Desktop Safari"] } },
    { name: "analytics-prod", testMatch: PROD_SPEC, use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:4174" } },
  ],
});
