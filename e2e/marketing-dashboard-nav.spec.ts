import { expect, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"

test.describe("marketing dashboard navigation", () => {
  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("sends signed-in staff to the dashboard with one desktop nav click", async ({ page }) => {
    const login = await loginAsOperator(page)
    expect(login.success, login.error).toBe(true)

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/", { waitUntil: "domcontentloaded" })

    const dashboardLink = page
      .locator("header")
      .getByRole("link", { name: /^Dashboard$/ })

    await expect(dashboardLink).toBeVisible()
    await dashboardLink.click()

    await expect(page).toHaveURL(/\/dashboard(?:[?#].*)?$/, { timeout: 20_000 })
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 20_000 })
  })
})
