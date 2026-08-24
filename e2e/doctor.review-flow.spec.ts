/**
 * Doctor Review Flow E2E Tests
 *
 * Tests the decline lifecycle with a real seeded intake and persisted DB state.
 * Queue, review-panel, and approval behavior lives in doctor.queue.spec.ts.
 */

import { expect,test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import {
  cleanupTestIntake,
  getIntakeStatus,
  isDbAvailable,
  seedTestIntake,
} from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

test.describe("Doctor Review - Decline Flow", () => {
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
    expect(seed.success, seed.error || "Seed failed").toBe(true)
    expect(seed.intakeId, "Seed should return an intake ID").toBeDefined()
    testIntakeId = seed.intakeId!

    await page.goto(`/doctor/intakes/${testIntakeId}`)
    await waitForPageLoad(page)

    const declineBtn = page.getByRole("button", { name: /decline|reject/i }).first()
    await expect(declineBtn).toBeVisible({ timeout: 10000 })
    await declineBtn.click()

    const dialog = page.getByRole("alertdialog", { name: /decline request/i })
    await expect(dialog).toBeVisible()
    const patientDetails = dialog.getByLabel(/details for the patient/i)
    const quickDrafts = dialog.locator("button[aria-pressed]")

    await expect(patientDetails).toBeVisible()
    await expect(quickDrafts).toHaveCount(3)
    await expect(
      dialog.getByRole("button", { name: "Not suitable online" }),
    ).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: "Frequent requests" }),
    ).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: "Urgent care" }),
    ).toBeVisible()

    await dialog.getByRole("button", { name: "Frequent requests" }).click()
    await expect(patientDetails).toHaveValue(/number and frequency/)
    await expect(patientDetails).toHaveValue(/full refund/)

    const desktopBoxes = await quickDrafts.evaluateAll((buttons) =>
      buttons.map((button) => {
        const bounds = button.getBoundingClientRect()
        return { left: bounds.left, top: bounds.top, width: bounds.width }
      }),
    )
    expect(desktopBoxes[0]?.top).toBe(desktopBoxes[1]?.top)
    expect(desktopBoxes[2]?.top).toBeGreaterThan(desktopBoxes[0]?.top ?? 0)
    expect(desktopBoxes[2]?.width).toBeGreaterThan(desktopBoxes[0]?.width ?? 0)

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(dialog).toBeVisible()
    const mobileLayout = await quickDrafts.evaluateAll((buttons) =>
      buttons.map((button) => {
        const bounds = button.getBoundingClientRect()
        const label = button.querySelector("span")
        return {
          height: bounds.height,
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
          labelFits: label ? label.scrollWidth <= label.clientWidth : false,
        }
      }),
    )
    expect(mobileLayout.every((button) => button.left >= 0 && button.right <= 390)).toBe(true)
    expect(mobileLayout[1]?.top).toBeGreaterThan(mobileLayout[0]?.top ?? 0)
    expect(mobileLayout[2]?.top).toBeGreaterThan(mobileLayout[1]?.top ?? 0)
    expect(mobileLayout.every((button) => button.labelFits)).toBe(true)
    expect(mobileLayout.every((button) => button.height >= 44)).toBe(true)
  })

  test("declining updates intake status to declined", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")

    const seed = await seedTestIntake({ status: "in_review" })
    expect(seed.success, seed.error || "Seed failed").toBe(true)
    expect(seed.intakeId, "Seed should return an intake ID").toBeDefined()
    testIntakeId = seed.intakeId!

    await page.goto(`/doctor/intakes/${testIntakeId}`)
    await waitForPageLoad(page)

    const declineBtn = page.getByRole("button", { name: /decline|reject/i }).first()
    await expect(declineBtn).toBeVisible({ timeout: 10000 })
    await declineBtn.click()

    const dialog = page.getByRole("alertdialog", { name: /decline request/i })
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: /not suitable for telehealth/i }).click()
    await dialog
      .getByLabel(/details for the patient/i)
      .fill("Not appropriate for telehealth consultation")

    const confirmBtn = dialog.getByRole("button", { name: "Decline request", exact: true })
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()

    await expect
      .poll(() => getIntakeStatus(testIntakeId!), {
        message: "Intake status should become declined after the decline action completes",
        timeout: 30000,
      })
      .toBe("declined")
  })
})
