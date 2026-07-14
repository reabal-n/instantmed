import { expect, type Page, test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

async function advanceMedCertToSymptoms(page: Page) {
  await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole("radio", { name: /Work/i }).click()

  const changeDates = page.getByRole("button", { name: /Change length or start date/i })
  if (await changeDates.isVisible().catch(() => false)) await changeDates.click()

  const oneDay = page.getByRole("radio", { name: /1 day/i })
  if (await oneDay.isVisible().catch(() => false)) await oneDay.click()
  const today = page.getByRole("radio", { name: /^Today/i })
  if (await today.isVisible().catch(() => false)) await today.click()

  const stickyBar = page.locator('[data-intake-mobile-action-bar="true"]')
  if (await stickyBar.isVisible().catch(() => false)) {
    const stickyContinue = stickyBar.getByRole("button", { name: /^Continue$/i })
    await expect(stickyContinue).toHaveAttribute("data-intake-mobile-action-ready", "true")
    await stickyContinue.click()
  } else {
    const primaryContinue = page.locator('button[data-intake-primary-action="true"]').last()
    await expect(primaryContinue).toHaveAttribute("data-intake-primary-ready", "true")
    await primaryContinue.click()
  }

  await expect(page.locator("#symptom-details")).toBeVisible({ timeout: 15000 })
}

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

    // Length + start date collapse to a summary by default — expand to reach duration
    const changeDates = page.getByRole("button", { name: /Change length or start date/i })
    if (await changeDates.isVisible().catch(() => false)) await changeDates.click()

    // Select 1 day duration
    await page.getByRole("radio", { name: /1 day/i }).click()
    
    // Continue button should be visible (may be disabled until all fields complete)
    await expect(page.locator("main").getByRole("button", { name: /^Continue$/i }).first()).toBeVisible()
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

    // Older layouts collapsed duration controls behind a summary button; the
    // current mobile-tappable date chips render the controls expanded.
    const changeDates = page.getByRole("button", { name: /Change length or start date/i })
    if (await changeDates.isVisible().catch(() => false)) await changeDates.click()

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

  test("high-stakes certificate wording hard-stops until the patient edits it", async ({ page }) => {
    await advanceMedCertToSymptoms(page)

    const details = page.locator("#symptom-details")
    await details.fill("Migraine and need to defer my exam tomorrow")

    const block = page.getByRole("alert").filter({ hasText: /Exam deferrals/i })
    await expect(block).toBeVisible()
    await expect(page.locator("#high-stakes-ack")).toHaveCount(0)
    await expect(page.locator('button[data-intake-primary-action="true"]')).toHaveCount(0)

    await details.fill("Fever and sore throat since yesterday")

    await expect(block).toHaveCount(0)
    const primaryContinue = page.locator('button[data-intake-primary-action="true"]').last()
    await expect(primaryContinue).toHaveAttribute("data-intake-primary-ready", "true")
    await primaryContinue.click()
    await expect(details).toHaveCount(0)
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

  test("restores certificate selections after a full page reload", async ({ page }) => {
    // Regression guard for the 2026-07-02 draft-loss bug: the storage
    // migration deleted the legacy key mid-hydration, so a reload silently
    // reset every selection (and rewrote the draft with the 1-day default).
    // This asserts actual RESTORATION, not just that the page reloads.
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })

    // Dev-only: `next dev` can fire a Fast-Refresh full reload shortly after
    // first compile of the route + its idle-imported chunks, wiping in-flight
    // clicks. Let the compile storm settle before interacting so the
    // selections land on a stable page. No-op against a warm/production server.
    await page.waitForLoadState("networkidle").catch(() => {})

    // Retry the selection if a dev self-reload reset the page between the
    // click and the debounced draft write reaching storage.
    await expect(async () => {
      await page.getByRole("radio", { name: /Work/i }).click()
      const changeDates = page.getByRole("button", { name: /Change length or start date/i })
      if (await changeDates.isVisible().catch(() => false)) await changeDates.click()
      await page.getByRole("radio", { name: /3 days/i }).click()
      await expect(page.getByRole("radio", { name: /3 days/i })).toBeChecked()
      // Confirm the debounced dual-write actually persisted before reloading.
      const scoped = await page.evaluate(
        () => window.localStorage.getItem("instantmed-draft-med-cert") ?? "",
      )
      expect(scoped).toContain('"duration":"3"')
      expect(scoped).toContain('"certType":"work"')
    }).toPass({ timeout: 20000 })

    await page.reload()
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("radio", { name: /Work/i })).toBeChecked()
    await expect(page.getByRole("radio", { name: /3 days/i })).toBeChecked()
  })

  test("restores from the service-scoped draft when the legacy key is gone", async ({ page }) => {
    // Phase 2.3 read fallback: patients who hit the pre-fix migration bug
    // have their draft ONLY in instantmed-draft-<service> (the migration
    // deleted the legacy key). Hydration must recover it. Seeded via
    // addInitScript so the state survives dev-server self-reloads.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "instantmed-draft-med-cert",
        JSON.stringify({
          serviceType: "med-cert",
          currentStepId: "certificate",
          answers: { certType: "work", duration: "2" },
          lastSavedAt: new Date().toISOString(),
        }),
      )
      window.localStorage.removeItem("instantmed-request-draft")
    })

    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("radio", { name: /Work/i })).toBeChecked({ timeout: 10000 })
    await expect(page.getByRole("radio", { name: /2 days/i })).toBeChecked({ timeout: 10000 })
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
    await expect(page.locator("main").getByRole("button", { name: /^Continue$/i }).first()).toBeVisible()
  })
})

test.describe("Unified Request Flow - Mobile sticky CTA", () => {
  // 2026-06-30 outage guard: the deploy that replaced the sticky-CTA
  // MutationObserver with an announce event left the bar permanently disabled
  // on every lazily-loaded step whose primary action is a plain Button (18 of
  // 19 steps), killing ALL mobile checkouts for 2.5 days while desktop CI
  // stayed green. This test advances the flow at a phone viewport using ONLY
  // the sticky bar, so that regression class cannot ship again.
  test.use({ viewport: { width: 375, height: 812 } })

  test("advances certificate -> symptoms via the sticky bar only", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })

    // Complete step 1 (duration/start date default; select them if rendered
    // unselected so the step is valid regardless of default behaviour).
    await page.getByRole("radio", { name: /Work/i }).click()
    const changeDates = page.getByRole("button", { name: /Change length or start date/i })
    if (await changeDates.isVisible().catch(() => false)) await changeDates.click()
    const oneDay = page.getByRole("radio", { name: /1 day/i })
    if (await oneDay.isVisible().catch(() => false)) await oneDay.click()
    const today = page.getByRole("radio", { name: /^Today/i })
    if (await today.isVisible().catch(() => false)) await today.click()

    // The in-step Continue is max-sm:hidden at this viewport — the sticky bar
    // is the ONLY way forward on mobile. It must become enabled and work.
    const stickyBar = page.locator('[data-intake-mobile-action-bar="true"]')
    await expect(stickyBar).toBeVisible({ timeout: 15000 })
    const stickyContinue = stickyBar.getByRole("button", { name: /Continue|Pay/ })
    await expect(stickyContinue).toBeEnabled({ timeout: 15000 })
    await stickyContinue.click()

    // Step 2 (symptoms) renders its primary action with the shared plain
    // Button — the exact class that went dark in the outage. The sticky bar
    // must be clickable on this step too (validation-on-tap pattern), not
    // permanently disabled.
    await expect(page.getByRole("heading", { name: /Your symptoms/i })).toBeVisible({ timeout: 15000 })
    await expect(stickyContinue).toBeEnabled({ timeout: 15000 })
  })

  test("removes the sticky Continue for high-stakes wording and restores it after correction", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await advanceMedCertToSymptoms(page)

    const details = page.locator("#symptom-details")
    await details.fill("Migraine and need to defer my exam tomorrow")

    await expect(page.getByRole("alert").filter({ hasText: /Exam deferrals/i })).toBeVisible()
    const stickyBar = page.locator('[data-intake-mobile-action-bar="true"]')
    await expect(stickyBar).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await details.fill("Fever and sore throat since yesterday")

    await expect(stickyBar).toBeVisible()
    await expect(stickyBar.getByRole("button", { name: /^Continue$/i })).toHaveAttribute(
      "data-intake-mobile-action-ready",
      "true",
    )
  })
})
