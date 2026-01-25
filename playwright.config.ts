import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright E2E Test Configuration
 * 
 * Features:
 * - Global setup/teardown for deterministic seeding
 * - Unique E2E_RUN_ID per run for parallel safety
 * - Retain traces/videos on failure for debugging
 * - Fixed port 3001 with reuseExistingServer=false for deterministic runs
 * 
 * Required env vars:
 * - PLAYWRIGHT=1 (enables E2E auth bypass)
 * - E2E_SECRET (test login secret)
 * - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (for DB assertions)
 * 
 * @see https://playwright.dev/docs/test-configuration
 */

// Fixed port for E2E - ensures no conflict with dev server
const E2E_PORT = 3001
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`

export default defineConfig({
  testDir: "./e2e",
  
  // Global setup seeds test data, teardown cleans up
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests: 1 locally, 2 on CI
  retries: process.env.CI ? 2 : 1,
  
  // Workers: 1 on CI for stability, default locally
  workers: process.env.CI ? 1 : undefined,
  
  // Test timeout
  timeout: 60_000,
  
  // Reporter to use
  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for tests - use fixed port for deterministic runs
    baseURL: E2E_BASE_URL,
    
    // Retain trace on failure for debugging
    trace: "retain-on-failure",
    
    // Screenshot on failure
    screenshot: "only-on-failure",
    
    // Retain video on failure
    video: "retain-on-failure",
    
    // Action timeout
    actionTimeout: 15_000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Mobile viewports
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  // Run local dev server before starting the tests
  // Fixed port 3001 ensures no conflict with existing dev server on 3000
  webServer: {
    command: `pnpm dev --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: false, // CRITICAL: Always start fresh for deterministic runs
    timeout: 180 * 1000, // 3 minutes for Next.js cold start
    stdout: "pipe", // Capture server output for debugging
    stderr: "pipe",
    // Pass through all required env vars to the dev server
    env: {
      ...process.env, // Inherit all env vars from parent process
      PLAYWRIGHT: "1",
      NEXT_PUBLIC_PLAYWRIGHT: "1",
      NODE_ENV: "test",
      // These are typically loaded from .env.local but we ensure they're passed
      // E2E_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY should come from parent
    },
  },
})
