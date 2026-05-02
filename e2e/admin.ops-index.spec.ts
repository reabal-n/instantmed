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
    await expect(page.getByText(/System (healthy|degraded)/i)).toBeVisible()

    await expect(page.getByRole("heading", { name: "System Status" })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Webhooks$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Email Delivery$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Intake Processing$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Patient Identity$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Prescribing Identity$/ })).toBeVisible()

    await expect(page.getByText("Failed Webhooks")).toBeVisible()
    await expect(page.getByText("Email Success")).toBeVisible()
    await expect(page.getByText("Stale Intakes")).toBeVisible()
    await expect(page.getByText("Audit Logs (24h)")).toBeVisible()
    await expect(page.locator("p").filter({ hasText: /^Rx Identity Blocks$/ })).toBeVisible()

    await expect(page.getByRole("heading", { name: "Quick Actions" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Webhook DLQ" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Audit Logs" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Doctor Queue" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Rx Identity Blocks" })).toBeVisible()
  })

  test("routes ops recovery links to current destinations", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    await page.getByRole("link", { name: "Webhook DLQ" }).click()
    await expect(page).toHaveURL(/\/admin\/webhook-dlq/)

    await page.goto("/admin/ops")
    await page.getByRole("link", { name: "Audit Logs" }).click()
    await expect(page).toHaveURL(/\/admin\/audit/)

    await page.goto("/admin/ops")
    await page.getByRole("link", { name: "Doctor Queue" }).click()
    await expect(page).toHaveURL(/\/doctor\/dashboard/)

    await page.goto("/admin/ops")
    await page.getByRole("link", { name: "Rx Identity Blocks" }).click()
    await expect(page).toHaveURL(/\/admin\/ops\/prescribing-identity/)
    await expect(page.getByRole("heading", { name: "Prescribing Identity Blocks" })).toBeVisible({ timeout: 10000 })
  })

  test("sidebar ops navigation is visible", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    const sidebar = page.getByRole("complementary", { name: "Admin sidebar" })
    await expect(sidebar).toBeVisible({ timeout: 10000 })
    await expect(sidebar.getByRole("button", { name: /Analytics/i })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Operations" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Operations" })).toHaveAttribute("href", "/admin/ops")
  })
})
