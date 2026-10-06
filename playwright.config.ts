import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    serviceWorkers: "block",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --port 3000",
    url: "http://localhost:3000/login",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
