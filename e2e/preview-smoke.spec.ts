/**
 * Preview Smoke Tests
 * 
 * Fast-fail tests that run FIRST in preview E2E to detect:
 * 1. Vercel protection blocking requests
 * 2. E2E auth endpoint accidentally exposed or misconfigured
 * 3. Basic public request-route failures
 * 
 * If these fail, skip the rest - environment is broken.
 */

import { expect,test } from "@playwright/test"

test.describe("Preview Smoke Tests", () => {
  test.describe.configure({ mode: "serial" })

  test("landing page loads (not blocked by Vercel protection)", async ({ page }) => {
    const response = await page.goto("/")
    
    // Check we got a successful response
    expect(response?.status(), "Landing page should return 200").toBe(200)
    
    // Check we're not on a Vercel protection page
    const content = await page.content()
    expect(
      content.includes("Password protection is enabled"),
      "Should not be blocked by Vercel password protection"
    ).toBe(false)
    expect(
      content.includes("Authentication Required"),
      "Should not be blocked by Vercel authentication"
    ).toBe(false)
    
    // Check for actual page content (not a blank/error page)
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("E2E test login endpoint is blocked", async ({ request }) => {
    const response = await request.post("/api/test/login")

    expect(
      response.status(),
      "Vercel preview deployments must always block /api/test/login"
    ).toBe(410)
  })

  test("health check endpoint responds", async ({ request }) => {
    // Simple health check - adjust path if you have one
    const response = await request.get("/api/health")
    
    // Accept 200 or 404 (if no health endpoint exists)
    // Fail on 500 (server error) or protection responses
    expect(
      response.status() < 500,
      `Health endpoint should not return 5xx. Got ${response.status()}`
    ).toBe(true)
  })

  test("active request flow route loads", async ({ page }) => {
    const response = await page.goto("/request?service=consult&subtype=ed")

    expect(response?.status(), "Active request route should return 200").toBe(200)
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15000 })
    await expect(page.locator("body")).not.toBeEmpty()
  })
})
