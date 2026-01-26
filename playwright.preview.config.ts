import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright Configuration for Preview/Staging Deployments
 * 
 * Used for running E2E tests against Vercel preview deployments.
 * Does NOT start a local dev server - expects E2E_BASE_URL to be set.
 * 
 * Usage:
 *   E2E_BASE_URL=https://your-preview.vercel.app pnpm exec playwright test --config=playwright.preview.config.ts
 * 
 * Required env vars:
 * - E2E_BASE_URL: The preview deployment URL
 * - PLAYWRIGHT=1: Enables E2E auth bypass
 * - E2E_SECRET: Test login secret (must match preview deployment)
 * 
 * Key differences from local config:
 * - No webServer (tests against remote deployment)
 * - Stricter assertions (fail loudly on wrong content)
 * - Single browser for faster CI runs
 */

const baseURL = process.env.E2E_BASE_URL

if (!baseURL) {
  throw new Error(
    "E2E_BASE_URL environment variable is required for preview testing.\n" +
    "Example: E2E_BASE_URL=https://your-preview.vercel.app pnpm exec playwright test --config=playwright.preview.config.ts"
  )
}

export default defineConfig({
  testDir: "./e2e",
  
  // No global setup/teardown for preview - we don't seed the preview DB
  // Tests should be self-contained or use test accounts
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail on test.only in CI
  forbidOnly: !!process.env.CI,
  
  // Retry: 1 locally, 2 on CI
  retries: process.env.CI ? 2 : 1,
  
  // Single worker on CI for stability
  workers: process.env.CI ? 1 : undefined,
  
  // Shorter timeout for preview - should be warmed up
  timeout: 45_000,
  
  // Reporter
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    // GitHub Actions reporter for PR annotations
    ...(process.env.CI ? [["github"] as const] : []),
  ],
  
  // Shared settings
  use: {
    baseURL,
    
    // Always capture traces for preview debugging
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    
    // Slightly longer action timeout for remote
    actionTimeout: 20_000,
    
    // Extra HTTP headers for preview auth if needed
    extraHTTPHeaders: {
      // Vercel preview protection bypass (if configured)
      ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET && {
        "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
      }),
    },
  },

  // Single browser for preview CI - fast and consistent
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // No webServer - we test against the remote preview deployment
  // webServer: undefined,
  
  // Expect settings - strict assertions for preview
  expect: {
    // Shorter timeout for assertions - preview should be fast
    timeout: 10_000,
  },
})
