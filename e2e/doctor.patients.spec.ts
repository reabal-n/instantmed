/**
 * Doctor Patients Directory E2E Tests
 *
 * Verifies the current compact directory contract:
 * - Search and one truthful sort control
 * - Recent work and contextual Parchment readiness
 * - Responsive table-to-card presentation
 * - No retired summary cards or broad demographic filters
 */

import { expect, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { isDbAvailable } from "./helpers/db"
import { STAFF_TEST_ROUTES } from "./helpers/staff-routes"
import { waitForPageLoad } from "./helpers/test-utils"

const SEEDED_PATIENT_NAME = "E2E Test Patient"

test.describe("Doctor Patients Directory", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("loads the compact directory without retired summary UI", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.doctorPatients)
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: "Patients", exact: true })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText("Find a patient and continue their care.", { exact: true })).toBeVisible()
    await expect(page.getByRole("textbox", { name: "Search patients" })).toBeVisible()
    await expect(page.getByRole("combobox", { name: "Sort patients" })).toContainText("Newest first")

    await expect(page.getByText("Total Patients", { exact: true })).toHaveCount(0)
    await expect(page.getByText("Onboarded", { exact: true })).toHaveCount(0)
    await expect(page.getByText("All states", { exact: true })).toHaveCount(0)
    await expect(page.getByText("All statuses", { exact: true })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: /something went wrong/i })).not.toBeVisible()
    await expect(page.getByText(/failed to load/i)).not.toBeVisible()
  })

  test("shows the seeded patient in the responsive current-work directory", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials and seeded patient profile required")

    await page.goto(`${STAFF_TEST_ROUTES.doctorPatients}?q=E2E+Test&sort=newest`)
    await waitForPageLoad(page)

    const patientLink = page.getByRole("link", { name: new RegExp(SEEDED_PATIENT_NAME, "i") }).first()
    await expect(patientLink).toBeVisible({ timeout: 10_000 })

    if ((page.viewportSize()?.width ?? 1280) >= 768) {
      await expect(page.getByRole("columnheader", { name: "Patient", exact: true })).toBeVisible()
      await expect(page.getByRole("columnheader", { name: "Contact", exact: true })).toBeVisible()
      await expect(page.getByRole("columnheader", { name: "Recent work", exact: true })).toBeVisible()
      await expect(page.getByRole("columnheader", { name: "Parchment sync", exact: true })).toBeVisible()
      await expect(page.getByRole("columnheader", { name: /last request/i })).toHaveCount(0)
      await expect(page.getByRole("columnheader", { name: /last script/i })).toHaveCount(0)
    } else {
      const patientLinkBox = await patientLink.boundingBox()
      expect(patientLinkBox?.height ?? 0).toBeGreaterThanOrEqual(44)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
    }
  })

  test("searches server-side and shows an explicit empty view", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials and seeded patient profile required")

    await page.goto(STAFF_TEST_ROUTES.doctorPatients)
    await waitForPageLoad(page)

    const searchInput = page.getByRole("textbox", { name: "Search patients" })
    await searchInput.fill("E2E Test")
    await expect(page).toHaveURL(/q=E2E(?:\+|%20)Test/)
    await expect(page.getByText(SEEDED_PATIENT_NAME).first()).toBeVisible()

    await searchInput.fill("ZZZZNONEXISTENT12345")
    await expect(page).toHaveURL(/q=ZZZZNONEXISTENT12345/)
    await expect(
      page.getByText("No patients match this view.", { exact: true }).filter({ visible: true }),
    ).toHaveCount(1)
  })

  test("offers only the approved newest and name sorting", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.doctorPatients)
    await waitForPageLoad(page)

    await expect(page.getByRole("combobox")).toHaveCount(1)
    const sortControl = page.getByRole("combobox", { name: "Sort patients" })
    await sortControl.click()
    await expect(page.getByRole("option", { name: "Newest first", exact: true })).toBeVisible()
    await page.getByRole("option", { name: "Name A–Z", exact: true }).click()

    await expect(page).toHaveURL(/\/doctor\/patients\?sort=name/)
    await expect(sortControl).toContainText("Name A–Z")
  })
})
