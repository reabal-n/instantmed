/**
 * Admin certificate details E2E.
 *
 * The certificate editor is intentionally lean: clinic details plus a generated
 * PDF preview. Static PDF layout/version editing is not an operator workflow.
 */

import { expect, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { getActiveTemplate, isDbAvailable } from "./helpers/db"
import { STAFF_TEST_ROUTES } from "./helpers/staff-routes"
import { waitForPageLoad } from "./helpers/test-utils"

test.describe("Admin certificate details", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("opens the certificate details surface", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminCertificateDetails)
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /certificate details/i })).toBeVisible()
    await expect(page.getByText(/clinic details/i).first()).toBeVisible()
    await expect(page.getByText(/pdf preview/i).first()).toBeVisible()
    await expect(page.getByRole("button", { name: /save changes/i })).toBeDisabled()
  })

  test("keeps the static PDF layout out of the operator workflow", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminCertificateDetails)
    await waitForPageLoad(page)

    await expect(page.getByRole("tab", { name: /version history/i })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /save version/i })).toHaveCount(0)
    await expect(page.getByText(/template layout/i)).toHaveCount(0)
    await expect(page.getByText(/layout options/i)).toHaveCount(0)
  })

  test("loads the active certificate config for preview", async ({ page }) => {
    test.skip(!isDbAvailable(), "SUPABASE_SERVICE_ROLE_KEY required")

    const template = await getActiveTemplate("med_cert")
    expect(template).toBeTruthy()
    expect(template?.version).toBeGreaterThanOrEqual(1)

    await page.goto(STAFF_TEST_ROUTES.adminCertificateDetails)
    await waitForPageLoad(page)

    await expect(page.getByText(new RegExp(`active version:\\s*v${template?.version}`, "i"))).toBeVisible()
    await expect(page).toHaveURL(new RegExp(STAFF_TEST_ROUTES.adminCertificateDetails))
  })
})
