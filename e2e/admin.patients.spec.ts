import { expect, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { isDbAvailable } from "./helpers/db"
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

  test("opens patient profiles from the operator-owned patient directory", async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials and seeded patient profile required")

    await page.goto("/admin/patients")
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /^patients$/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("link", { name: /patients/i }).first()).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /last request/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /last script/i })).toBeVisible()

    const sortControl = page.getByRole("combobox", { name: /sort patients/i })
    await expect(sortControl).toBeVisible()
    await expect(sortControl).toContainText(/most recent request/i)

    await page.goto("/admin/patients?sort=request_type")
    await waitForPageLoad(page)
    await expect(page).toHaveURL(/\/admin\/patients\?sort=request_type/)
    await expect(page.getByRole("combobox", { name: /sort patients/i })).toContainText(/request type/i)

    await page.getByPlaceholder(/search by name/i).fill("E2E Test")
    await expect(page.getByText(SEEDED_PATIENT_NAME).first()).toBeVisible()
  })
})
