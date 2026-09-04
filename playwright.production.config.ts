import { defineConfig, devices } from "@playwright/test"

const PORT = 3060
const BASE_URL = `http://127.0.0.1:${PORT}`
const requestedBaseUrl = process.env.PLAYWRIGHT_BASE_URL

if (requestedBaseUrl !== BASE_URL) {
  throw new Error(
    `Production E2E is pinned to ${BASE_URL}; received ${requestedBaseUrl || "no explicit URL"}`,
  )
}

if (process.env.E2E_ISOLATED_SUPABASE !== "1") {
  throw new Error("Production E2E requires the isolated Supabase runner")
}

const node = JSON.stringify(process.execPath)
const next = JSON.stringify("node_modules/next/dist/bin/next")

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20_000,
  },
  projects: [{
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  }],
  webServer: {
    command: `${node} ${next} start --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "production",
      PLAYWRIGHT: "1",
      NEXT_PUBLIC_PLAYWRIGHT: "1",
    },
  },
})
