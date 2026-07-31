import { expect, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { isDbAvailable } from "./helpers/db"
import { STAFF_TEST_ROUTES } from "./helpers/staff-routes"
import { waitForPageLoad } from "./helpers/test-utils"

const SEEDED_PATIENT_NAME = "E2E Test Patient"

test.describe("Admin Patients Directory", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("shows the compact operator-owned patient directory", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials and seeded patient profile required")

    await page.goto(`${STAFF_TEST_ROUTES.adminPatients}?q=E2E+Test&sort=newest`)
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /^patients$/i })).toBeVisible({ timeout: 15_000 })

    const sortControl = page.getByRole("combobox", { name: /sort patients/i })
    await expect(sortControl).toBeVisible()
    await expect(sortControl).toContainText("Newest first")
    const searchInput = page.getByRole("textbox", { name: "Search patients" })
    await expect(page).toHaveURL((url) => !url.searchParams.has("q"))
    await expect(searchInput).toHaveValue("")
    await searchInput.fill("E2E Test")
    await expect(page).toHaveURL((url) => !url.searchParams.has("q"))

    const patientLink = page.getByRole("link", { name: new RegExp(SEEDED_PATIENT_NAME, "i") }).first()
    await expect(patientLink).toBeVisible()
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

  test("sorts, searches, and opens a patient profile", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials and seeded patient profile required")

    await page.goto(STAFF_TEST_ROUTES.adminPatients)
    await waitForPageLoad(page)

    const sortControl = page.getByRole("combobox", { name: "Sort patients" })
    await sortControl.click()
    await page.getByRole("option", { name: "Name A–Z", exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/patients\?sort=name/)
    await expect(sortControl).toContainText("Name A–Z")

    const searchInput = page.getByRole("textbox", { name: "Search patients" })
    await searchInput.fill("E2E Test")
    await expect(page).toHaveURL((url) => !url.searchParams.has("q"))

    const patientLink = page.getByRole("link", { name: new RegExp(SEEDED_PATIENT_NAME, "i") }).first()
    await expect(patientLink).toBeVisible()
    await patientLink.click()
    await expect(page).toHaveURL(
      /\/doctor\/patients\/e2e00000-0000-0000-0000-000000000002$/,
      { timeout: 15_000 },
    )
  })
})
