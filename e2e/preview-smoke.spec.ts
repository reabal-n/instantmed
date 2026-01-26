/**
 * Preview Smoke Tests
 * 
 * Fast-fail tests that run FIRST in preview E2E to detect:
 * 1. Vercel protection blocking requests
 * 2. E2E auth endpoint not working
 * 3. Basic page load failures
 * 
 * If these fail, skip the rest - environment is broken.
 */

import { test, expect } from "@playwright/test"

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

  test("E2E test login endpoint responds", async ({ request }) => {
    // Skip if E2E_SECRET not configured
    const e2eSecret = process.env.E2E_SECRET
    if (!e2eSecret) {
      test.skip(true, "E2E_SECRET not configured")
      return
    }

    const response = await request.post("/api/test/login", {
      data: {
        email: "test-patient@example.com",
        role: "patient",
        secret: e2eSecret,
      },
    })

    // Should get 200 (success) or 401 (wrong secret) - NOT 404 (route missing)
    expect(
      [200, 401].includes(response.status()),
      `E2E login endpoint should exist. Got ${response.status()}: ${await response.text()}`
    ).toBe(true)

    if (response.status() === 401) {
      test.fail(true, "E2E_SECRET mismatch - check preview deployment has matching secret")
    }
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
})
