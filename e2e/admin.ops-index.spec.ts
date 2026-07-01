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

  test("page loads with two-block cockpit layout", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({ timeout: 10_000 })

    // 5 recovery counter cards. Operational invariants below reuse CounterCard
    // but are a separate block with different behavior.
    const recoveryCounters = page.getByRole("region", { name: "Recovery counters" })
    const counterCards = recoveryCounters.getByTestId("counter-card")
    await expect(counterCards).toHaveCount(5)

    const invariantCounters = page.getByRole("region", { name: "Operational invariants" })
    const invariantCards = invariantCounters.getByTestId("counter-card")
    await expect(invariantCards).toHaveCount(7)

    // Visible labels in the 5 tiles
    await expect(page.getByText("Payment failures")).toBeVisible()
    await expect(page.getByText("Stripe webhook DLQ")).toBeVisible()
    await expect(page.getByText("Parchment recovery")).toBeVisible()
    await expect(page.getByText("Prescribing identity")).toBeVisible()
    await expect(page.getByText("Google Ads conversions")).toBeVisible()
    await expect(page.getByText("Paid + cancelled")).toBeVisible()

    // Recent (7 days) block heading visible regardless of content
    await expect(page.getByRole("heading", { name: /Recent \(7 days\)/ })).toBeVisible()

    // Retired headings must not appear
    await expect(page.getByRole("heading", { name: "Needs attention" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "System checks" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Recovery paths" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Refunds" })).toHaveCount(0)
  })

  test("counter cards deep-link to the appropriate workshop", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    const cards = page.getByRole("region", { name: "Recovery counters" }).getByTestId("counter-card")
    // Order matches the page: Payment failures, Stripe webhook DLQ, Parchment recovery,
    // Prescribing identity, Google Ads conversions
    await expect(cards.nth(0)).toHaveAttribute(
      "href",
      /\/admin\/intakes\?chips=failed_payment%2Crefund_failed/,
    )
    await expect(cards.nth(1)).toHaveAttribute("href", "/admin/webhook-dlq")
    await expect(cards.nth(2)).toHaveAttribute("href", "/admin/ops/parchment")
    await expect(cards.nth(3)).toHaveAttribute("href", "/admin/ops/prescribing-identity")
    await expect(cards.nth(4)).toHaveAttribute("href", "/admin/analytics")
  })

  test("sidebar ops navigation is visible", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop sidebar contract")
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    const sidebar = page.getByRole("complementary", { name: "Staff sidebar" })
    await expect(sidebar).toBeVisible({ timeout: 10000 })
    await expect(sidebar.getByRole("link", { name: /Analytics/i })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Ops" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Ops" })).toHaveAttribute("href", "/admin/ops")
  })
})
