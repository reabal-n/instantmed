import { expect, type Locator, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import {
  cleanupTestIntake,
  getSupabaseClient,
  isDbAvailable,
  seedTestIntake,
} from "./helpers/db"

let checkoutFailureIntakeId: string | null = null

async function readOpenCount(group: Locator): Promise<number> {
  if (await group.count() === 0) return 0

  await expect(group).toHaveCount(1)
  const label = await group.getByText(/^\d+ open$/).textContent()
  const match = label?.match(/^(\d+) open$/)
  expect(match, `Expected an open-count badge, received "${label ?? ""}"`).not.toBeNull()
  return Number(match![1])
}

test.describe("Ops Index Page", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `E2E login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    try {
      if (checkoutFailureIntakeId) {
        await cleanupTestIntake(checkoutFailureIntakeId)
        checkoutFailureIntakeId = null
      }
    } finally {
      await logoutTestUser(page)
    }
  })

  test("page keeps unresolved groups and the all-clear state mutually exclusive", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("Unresolved payment, fulfilment, identity, delivery, and measurement work.")).toBeVisible()

    const allClearCount = await page.locator("[data-ops-all-clear]").count()
    const actionGroupCount = await page.locator("[data-ops-action-group]").count()
    if (allClearCount === 1) {
      expect(actionGroupCount).toBe(0)
      await expect(page.locator("[data-ops-issue]")).toHaveCount(0)
    } else {
      expect(allClearCount).toBe(0)
      expect(actionGroupCount).toBeGreaterThan(0)
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

  test.describe("failed payment routing", () => {
    test.skip(!isDbAvailable(), "Requires Supabase E2E database credentials")

    test("adds one failed checkout to Payments with the exact Ledger recovery route", async ({ page }) => {
      await page.goto("/admin/ops")
      await page.waitForLoadState("networkidle")

      const paymentsGroup = page.locator('[data-ops-action-group="payments"]')
      const baselineOpenCount = await readOpenCount(paymentsGroup)

      const seeded = await seedTestIntake({
        category: "medical_certificate",
        payment_status: "unpaid",
        status: "pending_payment",
      })
      expect(seeded.success, `Failed to seed Ops checkout fixture: ${seeded.error}`).toBe(true)
      expect(seeded.intakeId).toBeTruthy()
      checkoutFailureIntakeId = seeded.intakeId!

      const { data: failedCheckout, error: transitionError } = await getSupabaseClient()
        .from("intakes")
        .update({
          checkout_error: "e2e_ops_checkout_failed_fixture",
          payment_status: "unpaid",
          status: "checkout_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkoutFailureIntakeId)
        .select("id, checkout_error, payment_status, status")
        .single()

      expect(
        transitionError,
        `Failed to transition Ops checkout fixture: ${transitionError?.message}`,
      ).toBeNull()
      expect(failedCheckout).toEqual({
        checkout_error: "e2e_ops_checkout_failed_fixture",
        id: checkoutFailureIntakeId,
        payment_status: "unpaid",
        status: "checkout_failed",
      })

      await page.reload({ waitUntil: "networkidle" })

      await expect(paymentsGroup).toBeVisible()
      await expect(
        paymentsGroup.getByText(`${baselineOpenCount + 1} open`, { exact: true }),
      ).toBeVisible()

      const recoveryLink = paymentsGroup.locator(
        'a[href="/admin/intakes?chips=failed_payment"]',
      )
      await expect(recoveryLink).toBeVisible()
      await expect(recoveryLink).toHaveAttribute(
        "href",
        "/admin/intakes?chips=failed_payment",
      )
    })
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
