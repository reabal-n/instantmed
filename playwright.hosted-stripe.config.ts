import { defineConfig, devices } from "@playwright/test"

const BASE_URL = "http://127.0.0.1:3060"

if (
  process.env.PLAYWRIGHT_BASE_URL !== BASE_URL ||
  process.env.NODE_ENV !== "production" ||
  process.env.PLAYWRIGHT !== "1" ||
  process.env.ALLOW_STRIPE_TEST_WEBHOOKS !== "true" ||
  Object.prototype.hasOwnProperty.call(process.env, "VERCEL") ||
  Object.prototype.hasOwnProperty.call(process.env, "VERCEL_ENV") ||
  Object.prototype.hasOwnProperty.call(process.env, "E2E_ISOLATED_SUPABASE")
) {
  throw new Error("Hosted Stripe Playwright config requires the runner-owned local production lane")
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "hosted-stripe-guest-journey.spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 180_000,
  reporter: [["list"]],
  outputDir: "test-results/hosted-stripe",
  use: {
    baseURL: BASE_URL,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    // This flow follows one-time auth and Checkout URLs. Keep them out of
    // screenshots, videos, and trace archives even though every patient is
    // fabricated and the local Auth stack is destroyed during teardown.
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [{
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  }],
})
