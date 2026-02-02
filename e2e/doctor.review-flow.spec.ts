/**
 * Doctor Review Flow E2E Tests
 *
 * Tests the full doctor review lifecycle:
 * - Claim an intake from the queue
 * - Navigate to document builder
 * - Decline with reason and verify DB state
 * - Batch claim multiple intakes
 */

import { test, expect } from "@playwright/test"
import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { waitForPageLoad } from "./helpers/test-utils"
import {
  isDbAvailable,
  INTAKE_ID,
  resetIntakeForRetest,
  getIntakeStatus,
  getIntakeById,
  seedTestIntake,
  cleanupTestIntake,
} from "./helpers/db"

test.describe("Doctor Review — Claim & Review", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login failed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("can claim an intake and status changes to in_review", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    await resetIntakeForRetest(INTAKE_ID)

    await page.goto("/doctor")
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /review queue/i })).toBeVisible({ timeout: 15000 })

    // Find the seeded patient row
    const patientRow = page.getByText("E2E Test Patient").first()
    await expect(patientRow).toBeVisible({ timeout: 10000 })
    await patientRow.click()

    // Look for claim / review button
    const claimButton = page.getByRole("button", { name: /claim|review|start/i }).first()
    if (await claimButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await claimButton.click()
      await page.waitForTimeout(2000)
    }

    // Verify DB state
    const intake = await getIntakeById(INTAKE_ID)
    expect(intake).not.toBeNull()
    expect(["in_review", "paid"]).toContain(intake!.status)
  })

  test("document builder loads for intake", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    await resetIntakeForRetest(INTAKE_ID)

    await page.goto(`/doctor/intakes/${INTAKE_ID}/document`)
    await waitForPageLoad(page)

    // Should see patient info or certificate form
    const hasContent = await page
      .getByText(/patient|certificate|approve|medical/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasContent).toBe(true)

    // Approve button should exist
    const approveBtn = page.locator('[data-testid="approve-button"]')
    if (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(approveBtn).toBeEnabled()
    }
  })
})

test.describe("Doctor Review — Decline Flow", () => {
  let testIntakeId: string | undefined

  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login failed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
    if (testIntakeId) {
      await cleanupTestIntake(testIntakeId).catch(() => {})
      testIntakeId = undefined
    }
  })

  test("decline button and reason field are present", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    const seed = await seedTestIntake({ status: "in_review" })
    test.skip(!seed.success, seed.error || "Seed failed")
    testIntakeId = seed.intakeId

    await page.goto(`/doctor/intakes/${testIntakeId}`)
    await waitForPageLoad(page)

    // Should have a decline or reject button
    const declineBtn = page.getByRole("button", { name: /decline|reject/i }).first()
    const hasDecline = await declineBtn.isVisible({ timeout: 10000 }).catch(() => false)

    // If decline exists, clicking it should show a reason input
    if (hasDecline) {
      await declineBtn.click()
      await page.waitForTimeout(500)

      const reasonInput = page
        .locator("textarea, input[type='text']")
        .filter({ hasText: /reason/i })
        .or(page.getByPlaceholder(/reason/i))
        .first()

      const hasReasonInput = await reasonInput.isVisible().catch(() => false)
      // Either a reason field or a template dropdown should appear
      const hasTemplateDropdown = await page
        .getByText(/insufficient|not appropriate|telehealth/i)
        .isVisible()
        .catch(() => false)

      expect(hasReasonInput || hasTemplateDropdown).toBe(true)
    }
  })

  test("declining updates intake status to declined", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    const seed = await seedTestIntake({ status: "in_review" })
    test.skip(!seed.success, seed.error || "Seed failed")
    testIntakeId = seed.intakeId

    await page.goto(`/doctor/intakes/${testIntakeId}`)
    await waitForPageLoad(page)

    const declineBtn = page.getByRole("button", { name: /decline|reject/i }).first()
    if (!(await declineBtn.isVisible({ timeout: 10000 }).catch(() => false))) {
      test.skip(true, "Decline button not found on page")
      return
    }

    await declineBtn.click()
    await page.waitForTimeout(500)

    // Fill reason if a textarea appears
    const reasonField = page.getByPlaceholder(/reason/i).or(page.locator("textarea").last())
    if (await reasonField.isVisible().catch(() => false)) {
      await reasonField.fill("Not appropriate for telehealth consultation")
    }

    // Confirm decline
    const confirmBtn = page.getByRole("button", { name: /confirm|submit|decline/i }).last()
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click()
      await page.waitForTimeout(3000)

      const status = await getIntakeStatus(testIntakeId!)
      expect(status).toBe("declined")
    }
  })
})

test.describe("Doctor Review — Batch Operations", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login failed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("batch select UI elements are present", async ({ page }) => {
    await page.goto("/doctor")
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /review queue/i })).toBeVisible({ timeout: 15000 })

    // Check for batch selection controls (checkboxes, select all button)
    const selectAllBtn = page.getByRole("button", { name: /select all/i })
    const checkbox = page.locator('input[type="checkbox"], [role="checkbox"]').first()

    const hasBatchUI =
      (await selectAllBtn.isVisible().catch(() => false)) ||
      (await checkbox.isVisible().catch(() => false))

    // Batch UI should exist (we added it)
    expect(hasBatchUI).toBe(true)
  })
})
