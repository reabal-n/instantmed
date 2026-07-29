/**
 * Admin Business & Analytics E2E Tests
 *
 * Tests the admin Business, email, and audit surfaces:
 * - Business page loads with the bounded decision-support sections
 * - Email hub and template editor pages load
 * - Email template management works
 */

import { expect, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { STAFF_TEST_ROUTES } from "./helpers/staff-routes"
import { waitForPageLoad } from "./helpers/test-utils"

test.describe("Admin - Business", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login failed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("business page loads without errors", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminAnalytics)
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: "Business", exact: true })).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByText("Revenue, fee-aware contribution, conversion, and acquisition truth.", {
        exact: true,
      }),
    ).toBeVisible()

    // Should NOT show route-level error boundaries or loading failures.
    await expect(page.getByRole("heading", { name: /something went wrong/i })).not.toBeVisible()
    await expect(page.getByText(/failed to load/i)).not.toBeVisible()
  })

  test("business page shows the scale gate and contribution metrics", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminAnalytics)
    await waitForPageLoad(page)

    await expect(page.getByText("Scale gate", { exact: true })).toBeVisible()
    await expect(page.getByText(/Active milestone|Revenue milestone unavailable/).first()).toBeVisible()
    await expect(page.getByText("30d net retained", { exact: true })).toBeVisible()
    await expect(page.getByText("Paid orders", { exact: true })).toBeVisible()
    await expect(page.getByText("First-order contribution", { exact: true })).toBeVisible()
    await expect(page.getByText("Gate issues", { exact: true })).toBeVisible()
  })

  test("business page keeps conversion and acquisition evidence separate", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminAnalytics)
    await waitForPageLoad(page)

    await expect(
      page.getByRole("heading", { name: "Canonical 30-day start cohort", exact: true }),
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: "Recorded acquisition", exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Self-reported discovery", exact: true })).toBeVisible()

    await page.locator("summary").filter({ hasText: "Measurement checkpoints" }).click()
    await expect(page.getByRole("heading", { name: "Review requests", exact: true })).toBeVisible()
  })

  test("business page keeps operator approval explicit without restoring the retired metrics wall", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminAnalytics)
    await waitForPageLoad(page)

    const approvalBoundary = page.getByText(
      "Business is decision support only. Every Google Ads mutation still requires exact operator approval.",
      { exact: true },
    )
    await approvalBoundary.scrollIntoViewIfNeeded()
    await expect(approvalBoundary).toBeVisible()
    await expect(
      page.getByTestId("operator-page").getByRole("link", { name: "Operations", exact: true }),
    ).toHaveAttribute("href", "/admin/ops")

    await expect(page.getByText("Operator brief", { exact: true })).toHaveCount(0)
    await expect(page.getByText("Detailed metrics", { exact: true })).toHaveCount(0)
    await expect(page.getByText("Queue health", { exact: true })).toHaveCount(0)
  })
})

test.describe("Admin - Email Management", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login failed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("email hub page loads", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminEmailHub)
    await waitForPageLoad(page)

    await expect(
      page.getByRole("heading", { name: /email delivery/i })
    ).toBeVisible({ timeout: 15000 })
  })

  test("legacy email preview redirects to the template editor", async ({ page }) => {
    await page.goto("/admin/emails/preview")
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/admin\/emails\/templates$/)
    await expect(page.getByRole("heading", { name: /edit template/i })).toBeVisible({ timeout: 15000 })
  })

  test("email section root redirects to the delivery hub", async ({ page }) => {
    await page.goto("/admin/emails")
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/admin\/emails\/hub$/)
    await expect(page.getByRole("heading", { name: /email delivery/i })).toBeVisible({ timeout: 15000 })
  })

  test("email editor page loads", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminEmailTemplates)
    await waitForPageLoad(page)

    // Should show editor UI
    const hasEditor = await page
      .getByText(/editor|edit|template|subject/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    expect(hasEditor).toBe(true)
  })

  test("legacy email analytics redirects to the delivery hub", async ({ page }) => {
    await page.goto("/admin/emails/analytics")
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/admin\/emails\/hub$/)
    await expect(page.getByRole("heading", { name: /email delivery/i })).toBeVisible({ timeout: 15000 })
  })

  test("email outbox page loads", async ({ page }) => {
    await page.goto("/admin/emails/outbox")
    await waitForPageLoad(page)

    await expect(page).toHaveURL(/\/admin\/emails\/hub\?tab=queue$/)
    await expect(
      page.getByText(/outgoing email ledger/i)
    ).toBeVisible({ timeout: 15000 })
  })
})

test.describe("Admin - Audit Logs", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login failed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("audit logs page loads", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminAudit)
    await waitForPageLoad(page)

    await expect(
      page.getByRole("heading", { name: /audit|log/i })
    ).toBeVisible({ timeout: 15000 })
  })

  test("audit logs shows search functionality", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminAudit)
    await waitForPageLoad(page)

    // Should have a search input
    const searchInput = page.getByPlaceholder(/search|filter|intake/i)
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false)

    // Or filter controls
    const hasFilters = await page
      .getByRole("combobox")
      .or(page.getByRole("button", { name: /filter/i }))
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasSearch || hasFilters).toBe(true)
  })
})
