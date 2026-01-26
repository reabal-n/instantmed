import { test, expect } from "@playwright/test"
import { waitForPageLoad } from "./helpers/test-utils"

/**
 * Service Hub E2E Tests
 * 
 * Tests the /request service hub:
 * - Hub displays when no service param
 * - Service cards with pricing
 * - Navigation to each service flow
 * - Consult subtype expansion
 * - Draft resume banner
 * - Request again quick action
 */

test.describe("Service Hub - Display", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing draft
    await page.goto("/")
    await page.evaluate(() => localStorage.removeItem('instantmed-request-draft'))
    await page.evaluate(() => localStorage.removeItem('instantmed-preferences'))
    await page.goto("/request")
    await waitForPageLoad(page)
  })

  test("shows hub when no service param", async ({ page }) => {
    // Hub heading should be visible
    await expect(page.getByRole("heading", { name: /What do you need help with/i })).toBeVisible({ timeout: 15000 })
  })

  test("displays all three service cards", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /What do you need help with/i })).toBeVisible({ timeout: 15000 })
    
    // All service cards should be visible
    await expect(page.getByText("Medical certificate")).toBeVisible()
    await expect(page.getByText("Repeat prescription")).toBeVisible()
    await expect(page.getByText("Doctor consultation")).toBeVisible()
  })

  test("displays pricing on service cards", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /What do you need help with/i })).toBeVisible({ timeout: 15000 })
    
    // Pricing should be visible
    await expect(page.getByText("$19")).toBeVisible()
    await expect(page.getByText("$29.95")).toBeVisible()
    await expect(page.getByText("$49.95")).toBeVisible()
  })

  test("shows 'Most popular' badge on medical certificate", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /What do you need help with/i })).toBeVisible({ timeout: 15000 })
    
    await expect(page.getByText("Most popular")).toBeVisible()
  })

  test("shows 'No call needed' badges", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /What do you need help with/i })).toBeVisible({ timeout: 15000 })
    
    // Two services should have "No call needed" badge
    const noCallBadges = page.getByText("No call needed")
    await expect(noCallBadges).toHaveCount(2)
  })

  test("shows 'Usually requires a call' for consultation", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /What do you need help with/i })).toBeVisible({ timeout: 15000 })
    
    await expect(page.getByText("Usually requires a call")).toBeVisible()
  })
})

test.describe("Service Hub - Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.evaluate(() => localStorage.removeItem('instantmed-request-draft'))
    await page.evaluate(() => localStorage.removeItem('instantmed-preferences'))
    await page.goto("/request")
    await waitForPageLoad(page)
  })

  test("clicking medical certificate navigates to flow", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /What do you need help with/i })).toBeVisible({ timeout: 15000 })
    
    // Click medical certificate card
    await page.getByText("Medical certificate").click()
    
    // Should navigate to med-cert flow and show certificate step
    await expect(page).toHaveURL(/service=med-cert/)
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
  })

  test("clicking repeat prescription navigates to flow", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /What do you need help with/i })).toBeVisible({ timeout: 15000 })
    
    // Click repeat prescription card
    await page.getByText("Repeat prescription").click()
    
    // Should navigate to prescription flow
    await expect(page).toHaveURL(/service=prescription/)
  })

  test("clicking consultation expands subtypes", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /What do you need help with/i })).toBeVisible({ timeout: 15000 })
    
    // Click doctor consultation card
    await page.getByText("Doctor consultation").click()
    
    // Subtypes should be visible
    await expect(page.getByText("General consult")).toBeVisible()
    await expect(page.getByText("New medication")).toBeVisible()
    await expect(page.getByText("ED treatment")).toBeVisible()
  })

  test("clicking consult subtype navigates to flow", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /What do you need help with/i })).toBeVisible({ timeout: 15000 })
    
    // Expand consultation
    await page.getByText("Doctor consultation").click()
    
    // Wait for subtypes
    await expect(page.getByText("General consult")).toBeVisible()
    
    // Click a subtype
    await page.getByText("General consult").click()
    
    // Should navigate to consult flow
    await expect(page).toHaveURL(/service=consult/)
  })
})

test.describe("Service Hub - Direct URLs bypass hub", () => {
  test("?service=med-cert goes directly to flow", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Should show certificate step, not hub
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("heading", { name: /What do you need help with/i })).not.toBeVisible()
  })

  test("?service=prescription goes directly to flow", async ({ page }) => {
    await page.goto("/request?service=prescription")
    await waitForPageLoad(page)
    
    // Should not show hub
    await expect(page.getByRole("heading", { name: /What do you need help with/i })).not.toBeVisible()
  })

  test("?service=invalid shows error screen", async ({ page }) => {
    await page.goto("/request?service=invalid-service")
    await waitForPageLoad(page)
    
    // Should show error screen
    await expect(page.getByText("Unknown service")).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("button", { name: /Choose a service/i })).toBeVisible()
  })
})

test.describe("Service Hub - Draft Handling", () => {
  test("shows draft banner when draft exists", async ({ page }) => {
    // Create a mock draft
    await page.goto("/")
    await page.evaluate(() => {
      const draft = {
        state: {
          serviceType: "med-cert",
          currentStepId: "symptoms",
          lastSavedAt: new Date().toISOString(),
          answers: { certType: "work" }
        }
      }
      localStorage.setItem('instantmed-request-draft', JSON.stringify(draft))
    })
    
    await page.goto("/request")
    await waitForPageLoad(page)
    
    // Draft banner should be visible
    await expect(page.getByText(/unfinished.*medical certificate/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("button", { name: /Resume/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Start fresh/i })).toBeVisible()
  })

  test("clicking 'Start fresh' clears draft", async ({ page }) => {
    // Create a mock draft
    await page.goto("/")
    await page.evaluate(() => {
      const draft = {
        state: {
          serviceType: "med-cert",
          currentStepId: "symptoms",
          lastSavedAt: new Date().toISOString(),
          answers: { certType: "work" }
        }
      }
      localStorage.setItem('instantmed-request-draft', JSON.stringify(draft))
    })
    
    await page.goto("/request")
    await waitForPageLoad(page)
    
    // Click start fresh
    await page.getByRole("button", { name: /Start fresh/i }).click()
    
    // Draft banner should disappear
    await expect(page.getByText(/unfinished.*medical certificate/i)).not.toBeVisible()
    
    // Draft should be cleared from localStorage
    const draft = await page.evaluate(() => localStorage.getItem('instantmed-request-draft'))
    expect(draft).toBeNull()
  })
})
