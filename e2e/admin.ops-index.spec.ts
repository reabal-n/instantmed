import { expect, test } from "@playwright/test"

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

    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/System (clear|needs review)/i)).toBeVisible()

    await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "System checks" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Recovery paths" })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Payment webhooks$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Email delivery$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Intake processing$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Patient identity$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Prescribing identity$/ })).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Telegram alerts$/ })).toBeVisible()

    await expect(page.getByRole("button", { name: "Recovery palette" })).toBeVisible()
  })

  test("routes ops recovery links to current destinations", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("button", { name: "Recovery palette" })).toBeVisible()
    await expect(page.getByRole("link", { name: /Payment webhooks/i }).first()).toHaveAttribute(
      "href",
      "/admin/webhook-dlq",
    )
    await expect(page.getByRole("link", { name: /Email delivery/i }).first()).toHaveAttribute(
      "href",
      "/admin/emails/hub",
    )
    await expect(page.getByRole("link", { name: /Prescription delivery/i }).first()).toHaveAttribute(
      "href",
      "/admin/ops/parchment",
    )
    await expect(page.getByRole("link", { name: /Review duplicate profiles/i }).first()).toHaveAttribute(
      "href",
      "/admin/ops/patient-merge-audit",
    )
  })

  test("sidebar ops navigation is visible", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    const sidebar = page.getByRole("complementary", { name: "Operator sidebar" })
    await expect(sidebar).toBeVisible({ timeout: 10000 })
    await expect(sidebar.getByRole("link", { name: /Analytics/i })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Operations" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Operations" })).toHaveAttribute("href", "/admin/ops")
  })
})
