import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright config for intake flow tests only.
 * No global setup/teardown needed — these tests run as guest users.
 */

const E2E_PORT = 3001
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["intake-flows.spec.ts"],

  fullyParallel: false, // Run sequentially for reliability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  timeout: 60_000,

  reporter: [["list"]],

  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: `pnpm dev --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: true, // Reuse if already running
    timeout: 180 * 1000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      PLAYWRIGHT: "1",
      NEXT_PUBLIC_PLAYWRIGHT: "1",
      NODE_ENV: "test",
    },
  },
})
