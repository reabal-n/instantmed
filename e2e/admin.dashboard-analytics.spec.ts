/**
 * Admin Dashboard & Analytics E2E Tests
 *
 * Tests the admin analytics dashboard, finance page, and email management:
 * - Analytics page loads with the lean operator metric sections
 * - Finance page loads with revenue data
 * - Email hub and template editor pages load
 * - Email template management works
 */

import { expect,test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { STAFF_TEST_ROUTES } from "./helpers/staff-routes"
import { waitForPageLoad } from "./helpers/test-utils"

test.describe("Admin - Analytics Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login failed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("analytics page loads without errors", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminAnalytics)
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible({
      timeout: 15000,
    })

    // Should NOT show route-level error boundaries or loading failures.
    await expect(page.getByRole("heading", { name: /something went wrong/i })).not.toBeVisible()
    await expect(page.getByText(/failed to load/i)).not.toBeVisible()
  })

  test("analytics page shows key metric cards", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminAnalytics)
    await waitForPageLoad(page)

    const brief = page.getByRole("region", { name: "Operator brief" })
    await expect(brief.getByText("Revenue milestone", { exact: true })).toBeVisible()
    await expect(
      page.getByRole("region", { name: "Revenue" }).getByText("30 days", { exact: true }),
    ).toBeVisible()
  })

  test("analytics page keeps operator reporting source-of-truth sections", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminAnalytics)
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: "Revenue", exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Where patients came from", exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Conversion (30 days)", exact: true })).toBeVisible()
    await page.getByText(/Detailed metrics/).click()
    await expect(page.getByRole("heading", { name: "Queue health", exact: true })).toBeVisible()
    await expect(page.locator(".recharts-responsive-container, .recharts-wrapper")).toHaveCount(0)
  })

  test("overview surfaces the controlled-demand operator brief", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminAnalytics)
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: "Operator brief" })).toBeVisible()
    await expect(page.getByText("Controlled demand validation", { exact: true })).toBeVisible()
    await expect(page.getByText("Revenue milestone", { exact: true })).toBeVisible()
    await expect(page.getByText("Actionable exceptions", { exact: true })).toBeVisible()
    await expect(page.getByText("Google Ads decision", { exact: true })).toBeVisible()
    await expect(page.getByText("Approval required", { exact: true })).toBeVisible()
    await expect(page.getByText(/Support inbox: count-only Telegram alerts/)).toBeVisible()
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
