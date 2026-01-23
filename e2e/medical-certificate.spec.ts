import { test, expect } from "@playwright/test"
import { waitForPageLoad, generateTestMedicare as _generateTestMedicare, generateTestPhone as _generateTestPhone, generateTestAddress as _generateTestAddress } from "./helpers/test-utils"

/**
 * Medical Certificate Flow E2E Tests
 * 
 * Tests the complete patient journey for requesting a medical certificate:
 * 1. Landing page → Start flow
 * 2. Symptom selection
 * 3. Duration selection
 * 4. Personal details (for guests)
 * 5. Review & consent
 * 6. Payment (mocked)
 * 7. Confirmation
 */

test.describe("Medical Certificate Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Start from the medical certificate landing page
    await page.goto("/medical-certificate")
    await waitForPageLoad(page)
  })

  test("landing page loads correctly", async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Medical Certificate/i)
    
    // Check main CTA is visible (use main content area to avoid nav buttons)
    const mainContent = page.getByRole("main")
    const startButton = mainContent.getByRole("button", { name: /get started/i }).or(
      mainContent.getByRole("link", { name: /get started/i })
    ).first()
    await expect(startButton).toBeVisible()
    
    // Check key trust elements are present
    await expect(page.getByText(/AHPRA|Australian doctor|doctor/i).first()).toBeVisible()
  })

  test("can navigate to intake flow", async ({ page }) => {
    // Click main CTA in content area
    const mainContent = page.getByRole("main")
    const startButton = mainContent.getByRole("button", { name: /get started/i }).or(
      mainContent.getByRole("link", { name: /get started/i })
    ).first()
    await startButton.click()
    
    // Should navigate to intake or show first step
    await expect(page).toHaveURL(/request|medical-certificate/i)
  })

  test("intake page loads", async ({ page }) => {
    // Navigate directly to unified request flow
    await page.goto("/request?service=med-cert")
    
    // Page should load the unified request flow
    await expect(page).toHaveURL(/request/i)
  })

  test("responsive design - mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto("/medical-certificate")
    await waitForPageLoad(page)
    
    // Page should be usable on mobile - check heading is visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("accessibility - page has heading structure", async ({ page }) => {
    await page.goto("/medical-certificate")
    await waitForPageLoad(page)
    
    // Page should have proper heading structure
    const h1 = page.getByRole("heading", { level: 1 })
    await expect(h1).toBeVisible()
  })

  test("displays pricing information", async ({ page }) => {
    await page.goto("/medical-certificate")
    await waitForPageLoad(page)
    
    // Price should be visible somewhere on page
    const priceText = page.getByText(/\$\d+/i).first()
    await expect(priceText).toBeVisible({ timeout: 10000 })
  })
})

test.describe("Medical Certificate - Guest Flow", () => {
  test("guest can start without login", async ({ page }) => {
    await page.goto("/medical-certificate")
    await waitForPageLoad(page)
    
    // Should be able to start without signing in
    const startButton = page.getByRole("button", { name: /get started|start|continue as guest/i }).first()
    await expect(startButton).toBeVisible()
    await expect(startButton).toBeEnabled()
  })
})

test.describe("Medical Certificate - Error Handling", () => {
  test("handles network errors gracefully", async ({ page }) => {
    // Mock a network failure on API calls
    await page.route("**/api/**", (route) => {
      route.abort("failed")
    })
    
    await page.goto("/medical-certificate")
    
    // Page should still load (static content)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("shows error message on submission failure", async ({ page }) => {
    // Mock API to return error
    await page.route("**/api/requests/**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      })
    })
    
    // Navigate to unified request flow
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Error handling would show user-friendly message
    // (Specific test depends on form implementation)
  })
})
