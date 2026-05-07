import { expect,test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"

test.describe("Ops Index Page", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `E2E login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("page loads and displays current ops health signals", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Operations Dashboard" })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/System (healthy|needs review)/i)).toBeVisible()

    await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Health checks" })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Payment webhooks$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Email delivery$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Intake processing$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Patient identity$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Prescribing identity$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Recovery inbox$/ })).toBeVisible()

    await expect(page.getByRole("heading", { name: "Signals" })).toBeVisible()
    await expect(page.locator("p").filter({ hasText: /^Payment DLQ$/ })).toBeVisible()
    await expect(page.locator("p").filter({ hasText: /^Email success$/ })).toBeVisible()
    await expect(page.locator("p").filter({ hasText: /^Stale intakes$/ })).toBeVisible()
    await expect(page.locator("p").filter({ hasText: /^Audit logs \(24h\)$/ })).toBeVisible()
    await expect(page.locator("p").filter({ hasText: /^Rx Identity Blocks$/ })).toBeVisible()

    await expect(page.getByRole("button", { name: "Recovery palette" })).toBeVisible()
  })

  test("routes ops recovery links to current destinations", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: "Recovery palette" }).click()
    await expect(page.getByRole("dialog", { name: "Recovery palette" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Retry failed webhook/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Resend failed email/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Open stale intake queue/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Sync prescription script/i })).toBeVisible()

    await page.getByRole("button", { name: /Sync prescription script/i }).click()
    await expect(page).toHaveURL(/\/admin\/ops\/parchment/)
  })

  test("sidebar ops navigation is visible", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    const sidebar = page.getByRole("complementary", { name: "Admin sidebar" })
    await expect(sidebar).toBeVisible({ timeout: 10000 })
    await expect(sidebar.getByRole("link", { name: /Analytics/i })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Operations" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Operations" })).toHaveAttribute("href", "/admin/ops")
  })
})
