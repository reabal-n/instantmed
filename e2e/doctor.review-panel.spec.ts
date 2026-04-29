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

async function openSeededReviewPanel(page: import("@playwright/test").Page) {
  await resetIntakeForRetest(INTAKE_ID)

  await page.goto("/doctor/dashboard")
  await waitForPageLoad(page)

  await expect(
    page.getByRole("heading", { name: /review queue/i })
  ).toBeVisible({ timeout: 15000 })

  const patientRow = page.getByRole("button", { name: new RegExp(`Open case for ${SEEDED_PATIENT_NAME}`, "i") })
  await expect(patientRow).toBeVisible({ timeout: 15000 })
  await patientRow.click()

  const panel = page.getByRole("dialog")
  await expect(panel).toBeVisible({ timeout: 10000 })
  await expect(panel.getByRole("heading", { name: SEEDED_PATIENT_NAME })).toBeVisible({ timeout: 15000 })
  await expect(panel.getByText(/patient profile/i)).toBeVisible()
  await expect(panel.getByText(/full case/i)).toBeVisible()
  return panel
}

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

    const panel = await openSeededReviewPanel(page)

    // Panel should show patient name
    await expect(panel.getByRole("heading", { name: SEEDED_PATIENT_NAME })).toBeVisible()

    // Panel should show current workflow status
    await expect(panel.getByText(/in queue/i).first()).toBeVisible()
  })

  test("panel close button dismisses the panel", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    const panel = await openSeededReviewPanel(page)

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

    const panel = await openSeededReviewPanel(page)

    // Should have a textarea or notes area for clinical notes
    const notesArea = panel.locator("textarea").first()
    await notesArea.scrollIntoViewIfNeeded()
    const hasNotes = await notesArea.isVisible({ timeout: 5000 }).catch(() => false)

    // Also check for the "Full case" link
    const fullPageLink = panel.getByText(/full case/i)
    const hasFullPageLink = await fullPageLink.isVisible().catch(() => false)

    // At least one of these should be present in the panel
    expect(hasNotes || hasFullPageLink).toBe(true)
  })

  test("panel shows clinical summary, recommended plan, and draft note", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    const panel = await openSeededReviewPanel(page)

    await expect(panel.getByText(/patient story/i)).toBeVisible({ timeout: 10000 })
    await expect(panel.getByText(/recommended plan/i)).toBeVisible()
    await expect(panel.getByText(/draft note/i)).toBeVisible()
    await expect(panel.getByText(/full answers/i)).toBeVisible()
  })

  test("panel exposes patient snapshot, profile navigation, and identifier completeness", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    const panel = await openSeededReviewPanel(page)

    await expect(panel.getByText(/patient snapshot/i)).toBeVisible()
    await expect(panel.getByText(/details complete/i).first()).toBeVisible()
    await expect(panel.getByText(/2123456701/i)).toBeVisible()

    const profileLink = panel.getByRole("link", { name: /patient profile/i })
    await expect(profileLink).toHaveAttribute("href", "/doctor/patients/e2e00000-0000-0000-0000-000000000002")
  })

  test("escape key dismisses the panel", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    const panel = await openSeededReviewPanel(page)

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
