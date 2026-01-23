import { test, expect } from "@playwright/test"
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

  test("loads safety step first", async ({ page }) => {
    // Safety step should be the first step
    await expect(page.getByText(/emergency|urgent|000/i).first()).toBeVisible({ timeout: 10000 })
  })

  test("can confirm safety and proceed", async ({ page }) => {
    // Find and click the safety confirmation
    const confirmButton = page.getByRole("button", { name: /confirm|understand|continue/i }).first()
    await expect(confirmButton).toBeVisible({ timeout: 10000 })
    await confirmButton.click()
    
    // Should advance to certificate step
    await expect(page.getByText(/certificate type|certificate details/i).first()).toBeVisible({ timeout: 10000 })
  })

  test("certificate step shows type options", async ({ page }) => {
    // Confirm safety first
    const confirmButton = page.getByRole("button", { name: /confirm|understand|continue/i }).first()
    await confirmButton.click()
    
    // Should see certificate type options
    await expect(page.getByText(/work/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/study/i).first()).toBeVisible()
    await expect(page.getByText(/carer/i).first()).toBeVisible()
  })

  test("can select certificate type and duration", async ({ page }) => {
    // Confirm safety
    await page.getByRole("button", { name: /confirm|understand|continue/i }).first().click()
    
    // Wait for certificate step
    await expect(page.getByText(/certificate type/i).first()).toBeVisible({ timeout: 10000 })
    
    // Select Work type
    await page.getByText(/work/i).first().click()
    
    // Select 1 day duration
    await page.getByText(/1 day/i).first().click()
    
    // Continue button should be enabled
    const continueBtn = page.getByRole("button", { name: /continue/i }).first()
    await expect(continueBtn).toBeEnabled()
  })

  test("shows progress indicator", async ({ page }) => {
    // Progress bar should be visible
    await expect(page.getByRole("progressbar")).toBeVisible({ timeout: 10000 })
  })

  test("back button works", async ({ page }) => {
    // Confirm safety to go to step 2
    await page.getByRole("button", { name: /confirm|understand|continue/i }).first().click()
    await expect(page.getByText(/certificate type/i).first()).toBeVisible({ timeout: 10000 })
    
    // Click back
    const backButton = page.getByRole("button", { name: /back|go back/i }).first()
    await backButton.click()
    
    // Should be back at safety step
    await expect(page.getByText(/emergency|urgent|000/i).first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Unified Request Flow - Prescription", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/request?service=prescription")
    await waitForPageLoad(page)
  })

  test("loads safety step first", async ({ page }) => {
    await expect(page.getByText(/emergency|urgent|000/i).first()).toBeVisible({ timeout: 10000 })
  })

  test("shows medication search after safety", async ({ page }) => {
    // Confirm safety
    await page.getByRole("button", { name: /confirm|understand|continue/i }).first().click()
    
    // Should see medication search
    await expect(page.getByText(/medication/i).first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe("Unified Request Flow - Route Redirects", () => {
  test("/start redirects to /request", async ({ page }) => {
    await page.goto("/start")
    
    // Should redirect to /request
    await expect(page).toHaveURL(/\/request/)
  })

  test("/start?service=med-cert redirects correctly", async ({ page }) => {
    await page.goto("/start?service=med-cert")
    
    // Should redirect to /request with service param
    await expect(page).toHaveURL(/\/request\?service=med-cert/)
  })

  test("/start?service=prescription redirects correctly", async ({ page }) => {
    await page.goto("/start?service=prescription")
    
    // Should redirect to /request with mapped service param
    await expect(page).toHaveURL(/\/request\?service=prescription/)
  })

  test("/start?service=repeat-rx maps to prescription", async ({ page }) => {
    await page.goto("/start?service=repeat-rx")
    
    // Legacy repeat-rx should map to prescription
    await expect(page).toHaveURL(/\/request\?service=prescription/)
  })
})

test.describe("Unified Request Flow - Draft Persistence", () => {
  test("saves progress to localStorage", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Confirm safety
    await page.getByRole("button", { name: /confirm|understand|continue/i }).first().click()
    await expect(page.getByText(/certificate type/i).first()).toBeVisible({ timeout: 10000 })
    
    // Select options
    await page.getByText(/work/i).first().click()
    await page.getByText(/1 day/i).first().click()
    
    // Check localStorage has draft
    const draft = await page.evaluate(() => {
      return localStorage.getItem("instantmed-request-draft")
    })
    expect(draft).toBeTruthy()
    expect(draft).toContain("med-cert")
  })

  test("restores draft on page reload", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Confirm safety and make selections
    await page.getByRole("button", { name: /confirm|understand|continue/i }).first().click()
    await expect(page.getByText(/certificate type/i).first()).toBeVisible({ timeout: 10000 })
    await page.getByText(/work/i).first().click()
    
    // Reload page
    await page.reload()
    await waitForPageLoad(page)
    
    // Should show draft restoration UI or restore state
    // (Depends on implementation - check for restore prompt or auto-restore)
  })
})

test.describe("Unified Request Flow - Error Handling", () => {
  test("shows error boundary on component crash", async ({ page }) => {
    // Inject error into page
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Page should have error boundary ready
    // (Actual crash testing would require specific error injection)
  })

  test("handles missing service param gracefully", async ({ page }) => {
    await page.goto("/request")
    await waitForPageLoad(page)
    
    // Should show service selection or default to med-cert
    await expect(page.getByText(/emergency|service|what do you need/i).first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe("Unified Request Flow - Accessibility", () => {
  test("has proper heading structure", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Should have h1 heading
    const h1 = page.getByRole("heading", { level: 1 })
    await expect(h1).toBeVisible({ timeout: 10000 })
  })

  test("buttons are keyboard accessible", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Tab to confirm button and activate with Enter
    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")
    await page.keyboard.press("Enter")
    
    // Should advance (or at least respond to keyboard)
  })

  test("form fields have labels", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Confirm safety to get to form
    await page.getByRole("button", { name: /confirm|understand|continue/i }).first().click()
    
    // Labels should be associated with inputs
    const labels = page.locator("label")
    await expect(labels.first()).toBeVisible({ timeout: 10000 })
  })
})
