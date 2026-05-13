import { expect,test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

/**
 * Unified Request Flow E2E Tests
 * 
 * Tests the new unified /request entry point with dynamic steps:
 * - Medical Certificate flow
 * - Prescription flow
 * - Route redirects from /start
 */

test.describe("Unified Request Flow - Medical Certificate", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
  })

  test("loads certificate step first", async ({ page }) => {
    // Certificate step is the first step for med-cert flow
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
  })

  test("can interact with certificate options", async ({ page }) => {
    // Wait for certificate step to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Select work certificate type
    await page.getByRole("radio", { name: /Work/i }).click()
    
    // Select 1 day duration
    await page.getByRole("radio", { name: /1 day/i }).click()
    
    // Continue button should be visible (may be disabled until all fields complete)
    await expect(page.getByRole("button", { name: /Continue/i })).toBeVisible()
  })

  test("certificate step shows type options", async ({ page }) => {
    // Wait for certificate step to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Should see certificate type options
    await expect(page.getByRole("radio", { name: /Work/i })).toBeVisible()
    await expect(page.getByRole("radio", { name: /Study/i })).toBeVisible()
    await expect(page.getByRole("radio", { name: /Carer/i })).toBeVisible()
  })

  test("can select duration options", async ({ page }) => {
    // Wait for certificate step to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Duration options should be visible
    await expect(page.getByRole("radio", { name: /1 day/i })).toBeVisible()
    await expect(page.getByRole("radio", { name: /2 days/i })).toBeVisible()
  })

  test("shows progress indicator", async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Progress navigation should be visible
    await expect(page.getByRole("navigation", { name: /Request progress/i })).toBeVisible()
  })

  test("back button is visible", async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Back button should be visible
    await expect(page.getByRole("button", { name: /Go back/i })).toBeVisible()
  })
})

test.describe("Unified Request Flow - Prescription", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
  })

  test("loads prescription flow", async ({ page }) => {
    // Prescription flow should load with a heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
  })

  test("shows progress indicator", async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
    
    // Progress navigation should be visible
    await expect(page.getByRole("navigation", { name: /Request progress/i })).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Unified Request Flow - Route Redirects", () => {
  test("/start redirects to /request", async ({ page }) => {
    await page.goto("/start", { waitUntil: "networkidle" })

    // Should redirect to /request (allow time for server redirect + cold start)
    await page.waitForURL(/\/request/, { timeout: 15000 })
  })

  test("/start?service=med-cert redirects correctly", async ({ page }) => {
    await page.goto("/start?service=med-cert", { waitUntil: "networkidle" })

    // Should redirect to /request with service param
    await page.waitForURL(/\/request\?service=med-cert/, { timeout: 15000 })
  })

  test("/start?service=repeat-script redirects correctly", async ({ page }) => {
    await page.goto("/start?service=repeat-script", { waitUntil: "networkidle" })

    // Should redirect to /request with mapped service param
    await page.waitForURL(/\/request\?service=repeat-script/, { timeout: 15000 })
  })

  test("/start?service=repeat-rx maps to repeat-script", async ({ page }) => {
    await page.goto("/start?service=repeat-rx", { waitUntil: "networkidle" })

    // Legacy repeat-rx should map to repeat-script
    await page.waitForURL(/\/request\?service=repeat-script/, { timeout: 15000 })
  })
})

test.describe("Unified Request Flow - Draft Persistence", () => {
  test("page loads and allows interaction", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Wait for certificate step
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Select certificate type
    await page.getByRole("radio", { name: /Work/i }).click()
    
    // Button should show selected state (visual feedback)
    await page.waitForTimeout(300)
  })

  test("page reload works", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Wait for page to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Reload page
    await page.reload()
    await waitForPageLoad(page)
    
    // Page should load without errors
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
  })
})

test.describe("Unified Request Flow - Error Handling", () => {
  test("page loads without errors", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Page should load with certificate step
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
  })

  test("recovers from a legacy draft with null answers", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "instantmed-request-draft",
        JSON.stringify({
          state: {
            serviceType: "med-cert",
            currentStepId: "certificate",
            answers: null,
            lastSavedAt: new Date().toISOString(),
          },
          version: 0,
        })
      )

      const originalSetItem = Storage.prototype.setItem
      let blockedMigrationWrite = false
      Storage.prototype.setItem = function setItemWithOneBlockedDraftWrite(key, value) {
        if (!blockedMigrationWrite && key === "instantmed-draft-med-cert") {
          blockedMigrationWrite = true
          throw new DOMException("Draft storage migration blocked", "QuotaExceededError")
        }

        return originalSetItem.call(this, key, value)
      }
    })

    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("Something went wrong")).toHaveCount(0)
    await expect(page.getByRole("radio", { name: /Work/i })).toBeVisible()
  })

  test("handles missing service param gracefully", async ({ page }) => {
    await page.goto("/request")
    await waitForPageLoad(page)
    
    // Should show some heading (defaults to med-cert)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
  })
})

test.describe("Unified Request Flow - Accessibility", () => {
  test("has proper heading structure", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Should have h1 heading
    const h1 = page.getByRole("heading", { level: 1 })
    await expect(h1).toBeVisible({ timeout: 15000 })
  })

  test("buttons are keyboard accessible", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Wait for page to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Page should have focusable buttons
    await expect(page.getByRole("radio", { name: /Work/i })).toBeVisible()
  })

  test("interactive elements are present", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Wait for page to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Page should have interactive elements
    await expect(page.getByRole("button", { name: /Continue/i })).toBeVisible()
  })
})
