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

  test("page loads with one unresolved-action surface or one honest all-clear", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("Unresolved payment, fulfilment, identity, delivery, and measurement work.")).toBeVisible()

    const allClearCount = await page.locator("[data-ops-all-clear]").count()
    const actionGroupCount = await page.locator("[data-ops-action-group]").count()
    expect(allClearCount + actionGroupCount).toBeGreaterThan(0)
    expect(allClearCount).toBeLessThanOrEqual(1)
    if (actionGroupCount > 0) {
      expect(await page.locator("[data-ops-issue]").count()).toBeGreaterThan(0)
    }

    // Retired metrics-wall headings must not reappear.
    await expect(page.getByRole("heading", { name: "Needs attention" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "System checks" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Recovery paths" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Refunds" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Open exception feed" })).toHaveCount(0)
    await expect(page.getByRole("region", { name: "Recovery counters" })).toHaveCount(0)
  })

  test("each unresolved row owns one contextual next action", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    const issues = page.locator("[data-ops-issue]")
    for (let index = 0; index < await issues.count(); index += 1) {
      const issue = issues.nth(index)
      await expect(issue.getByText(/^Next:/)).toBeVisible()
      expect(
        await issue.getByRole("link").count() + await issue.getByRole("button").count(),
      ).toBeGreaterThan(0)
    }
  })

  test("sidebar ops navigation is visible", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop sidebar contract")
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    const sidebar = page.getByRole("complementary", { name: "Staff sidebar" })
    await expect(sidebar).toBeVisible({ timeout: 10000 })
    await expect(sidebar.getByRole("link", { name: "Business" })).toHaveAttribute(
      "href",
      "/admin/analytics",
    )
    await expect(sidebar.getByRole("link", { name: "Operations" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Operations" })).toHaveAttribute("href", "/admin/ops")
  })
})
