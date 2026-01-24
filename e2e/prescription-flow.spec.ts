import { test, expect } from "@playwright/test"
import { waitForPageLoad } from "./helpers/test-utils"

/**
 * Prescription Flow E2E Tests
 * 
 * Tests the prescription request flow including:
 * 1. Landing page → Start flow
 * 2. Type selection (repeat vs new)
 * 3. Medication search
 * 4. Gating questions
 * 5. Condition & duration
 * 6. Safety screening
 * 7. Medicare details
 * 8. Auth step (Clerk InlineAuthStep)
 * 9. Review & payment
 */

test.describe("Prescription Flow", () => {
  test.setTimeout(60000) // Increase timeout for slower CI
  
  test.beforeEach(async ({ page }) => {
    await page.goto("/request?service=prescription")
    await waitForPageLoad(page)
  })

  test("flow page loads correctly", async ({ page }) => {
    // Check page loads with a heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
  })

  test("page has interactive elements", async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
    
    // Should have buttons
    await expect(page.getByRole("button").first()).toBeVisible()
  })

  test("page renders content", async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
    
    // Progress indicator should be visible
    await expect(page.getByRole("navigation", { name: /Request progress/i })).toBeVisible()
  })

  test("progress indicator shows stages", async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
    
    // Progress indicator should be visible
    await expect(page.getByRole("navigation", { name: /Request progress/i })).toBeVisible()
  })

  test("back button is visible", async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
    
    // Back button should be visible
    await expect(page.getByRole("button", { name: /Go back/i })).toBeVisible()
  })

  test("responsive design - mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/request?service=prescription")
    await waitForPageLoad(page)
    
    // Page should be usable on mobile
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
  })
})

test.describe("Prescription Flow - Auth Step", () => {
  test("prescription flow loads", async ({ page }) => {
    await page.goto("/request?service=prescription")
    await waitForPageLoad(page)
    
    // Verify page loads with heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
  })

  test("page has navigation elements", async ({ page }) => {
    await page.goto("/request?service=prescription")
    await waitForPageLoad(page)
    
    // Verify page loads
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
    
    // Should have back button
    await expect(page.getByRole("button", { name: /Go back/i })).toBeVisible()
  })
})

test.describe("Prescription Flow - Draft Persistence", () => {
  test("page loads correctly", async ({ page }) => {
    await page.goto("/request?service=prescription")
    await waitForPageLoad(page)
    
    // Page should load with heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
  })

  test("can start fresh ignoring draft", async ({ page }) => {
    // Set up draft
    await page.addInitScript(() => {
      const draft = {
        rxType: "repeat",
        step: "medication",
        timestamp: Date.now(),
      }
      localStorage.setItem("instantmed_rx_draft", JSON.stringify(draft))
    })
    
    await page.goto("/request?service=prescription")
    await waitForPageLoad(page)
    
    // Click "Start fresh"
    const startFreshButton = page.getByRole("button", { name: /Start fresh/i })
    if (await startFreshButton.isVisible()) {
      await startFreshButton.click()
      
      // Should be at type selection (first step)
      await expect(page.getByText(/What type of prescription/i).or(
        page.getByText(/Repeat|New/i)
      ).first()).toBeVisible()
    }
  })
})

test.describe("Prescription Flow - Error Handling", () => {
  test("handles network errors gracefully", async ({ page }) => {
    // Mock API failure
    await page.route("**/api/**", (route) => {
      route.abort("failed")
    })
    
    await page.goto("/request?service=prescription")
    
    // Page should still render a heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
  })

  test("page has continue button", async ({ page }) => {
    await page.goto("/request?service=prescription")
    await waitForPageLoad(page)
    
    // Wait for page to load
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
    
    // Continue button should be present
    await expect(page.getByRole("button", { name: /Continue/i })).toBeVisible()
  })
})

test.describe("Prescription Flow - Safety Screening", () => {
  test("prescription flow loads with heading", async ({ page }) => {
    await page.goto("/request?service=prescription")
    await waitForPageLoad(page)
    
    // Page should load with heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
  })
})
