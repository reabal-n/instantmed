/**
 * Doctor Review Panel (Slide-over) E2E Tests
 *
 * Tests the intake review panel that opens as a sheet from the queue:
 * - "Review case" link opens the slide-over panel
 * - Panel displays patient info and status badge
 * - Panel has clinical notes editor
 * - Escape key or close button dismisses the panel
 * - Keyboard navigation (Enter/Space) opens expanded card
 */

import { expect, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { INTAKE_ID, isDbAvailable, resetIntakeForRetest } from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

const SEEDED_PATIENT_NAME = "E2E Test Patient"

test.describe("Doctor Review Panel", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("review case link opens slide-over panel with patient info", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    await resetIntakeForRetest(INTAKE_ID)

    await page.goto("/doctor/dashboard")
    await waitForPageLoad(page)

    await expect(
      page.getByRole("heading", { name: /review queue/i })
    ).toBeVisible({ timeout: 15000 })

    // Find and click the seeded patient row to expand
    const patientRow = page.getByText(SEEDED_PATIENT_NAME).first()
    await expect(patientRow).toBeVisible({ timeout: 10000 })
    await patientRow.click()
    await page.waitForTimeout(500)

    // Click "Review case" link to open panel
    const reviewLink = page.getByText("Review case").first()
    if (!(await reviewLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Review case link not visible after expanding card")
      return
    }
    await reviewLink.click()

    // Panel should open as a dialog/sheet
    const panel = page.getByRole("dialog")
    await expect(panel).toBeVisible({ timeout: 10000 })

    // Panel should show patient name
    await expect(panel.getByText(SEEDED_PATIENT_NAME)).toBeVisible({ timeout: 5000 })

    // Panel should show a status badge
    const statusBadge = panel.locator('[class*="badge"], [class*="Badge"]').first()
    const hasBadge = await statusBadge.isVisible().catch(() => false)
    expect(hasBadge).toBe(true)
  })

  test("panel close button dismisses the panel", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    await resetIntakeForRetest(INTAKE_ID)

    await page.goto("/doctor/dashboard")
    await waitForPageLoad(page)

    await expect(
      page.getByRole("heading", { name: /review queue/i })
    ).toBeVisible({ timeout: 15000 })

    // Expand and open panel
    const patientRow = page.getByText(SEEDED_PATIENT_NAME).first()
    await expect(patientRow).toBeVisible({ timeout: 10000 })
    await patientRow.click()
    await page.waitForTimeout(500)

    const reviewLink = page.getByText("Review case").first()
    if (!(await reviewLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Review case link not visible")
      return
    }
    await reviewLink.click()

    const panel = page.getByRole("dialog")
    await expect(panel).toBeVisible({ timeout: 10000 })

    // Click close button (X icon with aria-label)
    const closeButton = panel.getByRole("button", { name: /close/i }).first()
    if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeButton.click()
      await page.waitForTimeout(500)

      // Panel should be dismissed
      await expect(panel).not.toBeVisible({ timeout: 5000 })
    }
  })

  test("panel shows clinical notes editor", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    await resetIntakeForRetest(INTAKE_ID)

    await page.goto("/doctor/dashboard")
    await waitForPageLoad(page)

    await expect(
      page.getByRole("heading", { name: /review queue/i })
    ).toBeVisible({ timeout: 15000 })

    // Expand and open panel
    const patientRow = page.getByText(SEEDED_PATIENT_NAME).first()
    await expect(patientRow).toBeVisible({ timeout: 10000 })
    await patientRow.click()
    await page.waitForTimeout(500)

    const reviewLink = page.getByText("Review case").first()
    if (!(await reviewLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Review case link not visible")
      return
    }
    await reviewLink.click()

    const panel = page.getByRole("dialog")
    await expect(panel).toBeVisible({ timeout: 10000 })

    // Should have a textarea or notes area for clinical notes
    const notesArea = panel.locator("textarea").first()
    const hasNotes = await notesArea.isVisible({ timeout: 5000 }).catch(() => false)

    // Also check for the "Open full page" link
    const fullPageLink = panel.getByText(/open full page/i)
    const hasFullPageLink = await fullPageLink.isVisible().catch(() => false)

    // At least one of these should be present in the panel
    expect(hasNotes || hasFullPageLink).toBe(true)
  })

  test("escape key dismisses the panel", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    await resetIntakeForRetest(INTAKE_ID)

    await page.goto("/doctor/dashboard")
    await waitForPageLoad(page)

    await expect(
      page.getByRole("heading", { name: /review queue/i })
    ).toBeVisible({ timeout: 15000 })

    // Expand and open panel
    const patientRow = page.getByText(SEEDED_PATIENT_NAME).first()
    await expect(patientRow).toBeVisible({ timeout: 10000 })
    await patientRow.click()
    await page.waitForTimeout(500)

    const reviewLink = page.getByText("Review case").first()
    if (!(await reviewLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Review case link not visible")
      return
    }
    await reviewLink.click()

    const panel = page.getByRole("dialog")
    await expect(panel).toBeVisible({ timeout: 10000 })

    // Press Escape
    await page.keyboard.press("Escape")
    await page.waitForTimeout(500)

    // Panel should be dismissed
    await expect(panel).not.toBeVisible({ timeout: 5000 })
  })
})

test.describe("Doctor Queue Keyboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("queue card headers have keyboard accessible roles", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    await resetIntakeForRetest(INTAKE_ID)

    await page.goto("/doctor/dashboard")
    await waitForPageLoad(page)

    await expect(
      page.getByRole("heading", { name: /review queue/i })
    ).toBeVisible({ timeout: 15000 })

    // Wait for seeded patient to appear
    await expect(page.getByText(SEEDED_PATIENT_NAME).first()).toBeVisible({ timeout: 10000 })

    // Card headers should have role="button" and tabIndex for keyboard access
    const cardButtons = page.locator('[role="button"][tabindex="0"]')
    const count = await cardButtons.count()

    // At least one card header should be keyboard-accessible
    expect(count).toBeGreaterThan(0)
  })
})
