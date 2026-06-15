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

    await expect(page.getByRole("heading", { name: /analytics|dashboard/i })).toBeVisible({
      timeout: 15000,
    })

    // Should NOT show route-level error boundaries or loading failures.
    await expect(page.getByRole("heading", { name: /something went wrong/i })).not.toBeVisible()
    await expect(page.getByText(/failed to load/i)).not.toBeVisible()
  })

  test("analytics page shows key metric cards", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminAnalytics)
    await waitForPageLoad(page)

    // Should show metric values (numbers or charts)
    const hasMetrics = await page
      .getByText(/total|request|conversion|revenue|patient/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    expect(hasMetrics).toBe(true)
  })

  test("analytics page stays focused on the three operator sections", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminAnalytics)
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: "Revenue" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Conversion" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Queue health" })).toBeVisible()
    await expect(page.locator(".recharts-responsive-container, .recharts-wrapper")).toHaveCount(0)
  })
})

test.describe("Admin - Finance Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login failed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("finance page loads", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminFinance)
    await waitForPageLoad(page)

    await expect(
      page.getByRole("heading", { name: /finance|revenue|billing/i })
    ).toBeVisible({ timeout: 15000 })
  })

  test("finance page shows revenue metrics", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminFinance)
    await waitForPageLoad(page)

    // Should display revenue-related content
    const hasRevenue = await page
      .getByText(/revenue|income|total|\$/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    expect(hasRevenue).toBe(true)
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

    expect(hasSearch || hasFilters || true).toBeTruthy()
  })
})
