/**
 * Flow Wizard E2E Tests
 *
 * Tests the new `/flow` route powered by the FlowOrchestrator.
 *
 * Step sequence (non-prescription):
 *   service → auth → safety-screening → questionnaire → safety-check → details
 *
 * Prescription path adds:
 *   service → auth → safety-screening → prescription-details → questionnaire → safety-check → details
 *
 * These tests run as a guest (no auth) and verify:
 *   - Route renders correctly
 *   - Service selection works (grid + URL param)
 *   - Step navigation (forward/back) functions
 *   - Progress indicator updates
 *   - Safety screening step renders and can be completed
 *   - Auth step renders with skip option
 */

import { test, expect, type Page } from "@playwright/test"
import { waitForPageLoad } from "./helpers/test-utils"

// ---------------------------------------------------------------------------
// Helpers (mirror intake-flows.spec.ts patterns)
// ---------------------------------------------------------------------------

/**
 * Dismiss overlays that can block clicks on page elements:
 * - Cookie consent banner
 * - Clerk keyless mode banner (dev only)
 * - Next.js dev tools issues badge
 */
async function dismissOverlays(page: Page) {
  const essentialOnly = page.getByRole("button", { name: /Essential only/i })
  if (await essentialOnly.isVisible({ timeout: 2000 }).catch(() => false)) {
    await essentialOnly.click()
    await page.waitForTimeout(300)
  }

  // Clerk keyless mode banner
  const clerkBanner = page.getByRole("button", {
    name: /Clerk is in keyless mode/i,
  })
  if (await clerkBanner.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.evaluate(() => {
      const el = document.querySelector(
        '[id*="clerk-keyless"]'
      ) as HTMLElement
      if (el) el.style.display = "none"
      document.querySelectorAll("button").forEach((btn) => {
        if (btn.textContent?.includes("Clerk is in keyless mode")) {
          const parent =
            btn.closest('[style*="position"]') ||
            btn.parentElement?.parentElement
          if (parent instanceof HTMLElement) parent.style.display = "none"
        }
      })
    })
  }

  // Next.js Dev Tools
  await page.evaluate(() => {
    const style = document.createElement("style")
    style.textContent = `
      [data-nextjs-dialog-overlay], [data-nextjs-toast],
      [class*="nextjs-portal"], [id*="clerk-keyless"],
      button[aria-label="Open chat assistant"],
      [data-nextjs-dev-toolbar] { display: none !important; }
    `
    document.head.appendChild(style)
  })
}

/** Wait for a step heading or key element to appear */
async function waitForStep(
  page: Page,
  text: string | RegExp,
  timeout = 15000
) {
  await expect(page.getByText(text).first()).toBeVisible({ timeout })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Flow Wizard — /flow route", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure fresh flow state
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("instantmed-flow")
      } catch {
        // noop if localStorage isn't available
      }
    })
  })

  // -------------------------------------------------------------------------
  // Route & Service Selection
  // -------------------------------------------------------------------------

  test("renders service selection on /flow", async ({ page }) => {
    await page.goto("/flow")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Service selection step should be visible
    await waitForStep(page, /What do you need today/i)

    // All 5 services should render
    await expect(page.getByText("Medical Certificate")).toBeVisible()
    await expect(page.getByText("Repeat Prescription")).toBeVisible()
    await expect(page.getByText("General Consultation")).toBeVisible()
    await expect(page.getByText("Weight Management")).toBeVisible()
    await expect(page.getByText("Men's Health")).toBeVisible()

    // Progress indicator shows Step 1
    await expect(page.getByText(/Step 1 of/i)).toBeVisible()
  })

  test("pre-selects service from URL param", async ({ page }) => {
    await page.goto("/flow?service=medical-certificate")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Should advance past service selection to auth step
    // (initialService triggers setServiceSlug, then auto-advance)
    await waitForStep(page, /Account|Sign in|Continue as guest/i, 10000)
  })

  test("selects medical certificate and advances", async ({ page }) => {
    await page.goto("/flow")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await waitForStep(page, /What do you need today/i)

    // Click the Medical Certificate option
    await page
      .getByRole("button", { name: /Medical Certificate/i })
      .first()
      .click()

    // Should auto-advance to auth step after 150ms delay
    await waitForStep(page, /Account|Sign in|Continue as guest/i, 10000)

    // Progress should advance
    await expect(page.getByText(/Step 2 of/i)).toBeVisible({ timeout: 5000 })
  })

  test("selects repeat prescription and advances", async ({ page }) => {
    await page.goto("/flow")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await waitForStep(page, /What do you need today/i)

    // Click Repeat Prescription
    await page
      .getByRole("button", { name: /Repeat Prescription/i })
      .first()
      .click()

    // Should auto-advance
    await waitForStep(page, /Account|Sign in|Continue as guest/i, 10000)
  })

  // -------------------------------------------------------------------------
  // Navigation & Progress
  // -------------------------------------------------------------------------

  test("back button returns to previous step", async ({ page }) => {
    await page.goto("/flow")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await waitForStep(page, /What do you need today/i)

    // Select a service to advance
    await page
      .getByRole("button", { name: /Medical Certificate/i })
      .first()
      .click()

    // Wait for auth step
    await waitForStep(page, /Account|Sign in|Continue as guest/i, 10000)

    // Click back
    const backButton = page.getByRole("button", { name: /Back/i })
    await expect(backButton).toBeVisible({ timeout: 5000 })
    await backButton.click()

    // Should return to service selection
    await waitForStep(page, /What do you need today/i)
  })

  test("progress bar updates across steps", async ({ page }) => {
    await page.goto("/flow")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Step 1 of N
    await expect(page.getByText(/Step 1 of/i)).toBeVisible()

    // Select service
    await page
      .getByRole("button", { name: /General Consultation/i })
      .first()
      .click()

    // Should show Step 2 of N
    await expect(page.getByText(/Step 2 of/i)).toBeVisible({ timeout: 10000 })
  })

  // -------------------------------------------------------------------------
  // Service scope disclosure
  // -------------------------------------------------------------------------

  test("shows scope disclosure panel", async ({ page }) => {
    await page.goto("/flow")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await waitForStep(page, /What do you need today/i)

    // Click disclosure toggle
    const scopeButton = page.getByRole("button", {
      name: /What we can and can't help with/i,
    })
    await expect(scopeButton).toBeVisible()
    await scopeButton.click()

    // Should reveal the "can help with" content
    await expect(
      page.getByText(/Medical certificates for work/i)
    ).toBeVisible({ timeout: 3000 })

    // Should reveal the "cannot help with" content
    await expect(
      page.getByText(/Emergency or life-threatening symptoms/i)
    ).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Med-cert path: service → auth → safety → questionnaire → safety-check → details
  // -------------------------------------------------------------------------

  test("med-cert flow: service → auth (skip) → safety screening", async ({
    page,
  }) => {
    await page.goto("/flow")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Step 1: Service selection
    await waitForStep(page, /What do you need today/i)
    await page
      .getByRole("button", { name: /Medical Certificate/i })
      .first()
      .click()

    // Step 2: Auth — skip it
    await waitForStep(page, /Account|Sign in|Continue as guest/i, 10000)

    // Look for a "Skip" or "Continue as guest" button
    const skipButton = page.getByRole("button", {
      name: /Skip|Continue as guest|Guest/i,
    })
    if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Step 3: Safety screening
    await waitForStep(
      page,
      /Before we begin|Safety|emergency|I confirm/i,
      15000
    )
  })

  // -------------------------------------------------------------------------
  // Prescription path: includes prescription-details step
  // -------------------------------------------------------------------------

  test("prescription flow includes medication step", async ({ page }) => {
    await page.goto("/flow?service=repeat-prescription")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Should skip service selection and go to auth
    await waitForStep(page, /Account|Sign in|Continue as guest/i, 10000)

    // Check step count — prescription has 7 steps (includes prescription-details)
    // Non-prescription has 6 steps
    const stepText = page.getByText(/Step \d+ of (\d+)/i)
    await expect(stepText).toBeVisible({ timeout: 5000 })

    const text = await stepText.textContent()
    const match = text?.match(/of (\d+)/i)
    const totalSteps = match ? parseInt(match[1], 10) : 0

    // Prescription path should have 7 steps (includes prescription-details)
    expect(totalSteps).toBe(7)
  })

  test("non-prescription flow has 6 steps", async ({ page }) => {
    await page.goto("/flow?service=medical-certificate")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await waitForStep(page, /Account|Sign in|Continue as guest/i, 10000)

    const stepText = page.getByText(/Step \d+ of (\d+)/i)
    await expect(stepText).toBeVisible({ timeout: 5000 })

    const text = await stepText.textContent()
    const match = text?.match(/of (\d+)/i)
    const totalSteps = match ? parseInt(match[1], 10) : 0

    // Non-prescription has 6 steps
    expect(totalSteps).toBe(6)
  })

  // -------------------------------------------------------------------------
  // Weight management path
  // -------------------------------------------------------------------------

  test("weight management flow starts correctly", async ({ page }) => {
    await page.goto("/flow?service=weight-loss")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Should advance past service selection to auth
    await waitForStep(page, /Account|Sign in|Continue as guest/i, 10000)

    // Step count should be 6 (no prescription-details)
    const stepText = page.getByText(/Step \d+ of (\d+)/i)
    await expect(stepText).toBeVisible({ timeout: 5000 })

    const text = await stepText.textContent()
    const match = text?.match(/of (\d+)/i)
    const totalSteps = match ? parseInt(match[1], 10) : 0
    expect(totalSteps).toBe(6)
  })

  // -------------------------------------------------------------------------
  // Men's health path
  // -------------------------------------------------------------------------

  test("mens health flow starts correctly", async ({ page }) => {
    await page.goto("/flow?service=mens-health")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Should advance past service selection to auth
    await waitForStep(page, /Account|Sign in|Continue as guest/i, 10000)

    // Step count should be 6
    const stepText = page.getByText(/Step \d+ of (\d+)/i)
    await expect(stepText).toBeVisible({ timeout: 5000 })

    const text = await stepText.textContent()
    const match = text?.match(/of (\d+)/i)
    const totalSteps = match ? parseInt(match[1], 10) : 0
    expect(totalSteps).toBe(6)
  })

  // -------------------------------------------------------------------------
  // Error boundary
  // -------------------------------------------------------------------------

  test("handles invalid service slug gracefully", async ({ page }) => {
    await page.goto("/flow?service=nonexistent-service")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // With an invalid slug, the orchestrator should still render
    // It may show service selection (slug doesn't match) or auth
    // The key is no crash
    const hasContent = await page
      .locator("main")
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hasContent).toBeTruthy()
  })
})
