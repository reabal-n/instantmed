/**
 * Stuck Intakes Admin Viewer E2E Smoke Test
 * 
 * Verifies the stuck intakes admin page loads and renders correctly.
 * 
 * Run with: PLAYWRIGHT=1 pnpm e2e --grep "intakes-stuck"
 */

import { test, expect } from "@playwright/test"
import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { waitForPageLoad } from "./helpers/test-utils"

test.describe("Stuck Intakes Admin Viewer", () => {
  test.beforeEach(async ({ page }) => {
    // Login as operator (admin+doctor role)
    const result = await loginAsOperator(page)
    expect(result.success, `E2E login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("stuck intakes page loads and renders table", async ({ page }) => {
    // Navigate to the stuck intakes admin page
    await page.goto("/doctor/admin/ops/intakes-stuck")
    await waitForPageLoad(page)

    // Verify page title/heading is visible
    const heading = page.getByRole("heading", { name: /stuck intakes/i })
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Verify table is rendered with headers
    const table = page.locator('[data-testid="stuck-intakes-table"]')
    await expect(table).toBeVisible()

    // Verify table headers exist
    await expect(page.getByRole("columnheader", { name: /reference/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /status/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /reason/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /age/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /service/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /patient/i })).toBeVisible()
  })

  test("stuck intakes shows stats cards", async ({ page }) => {
    await page.goto("/doctor/admin/ops/intakes-stuck")
    await waitForPageLoad(page)

    // Stats cards should be visible
    await expect(page.getByText(/total stuck/i)).toBeVisible()
    await expect(page.getByText(/paid, no review/i).first()).toBeVisible()
    await expect(page.getByText(/review timeout/i).first()).toBeVisible()
    await expect(page.getByText(/delivery pending/i).first()).toBeVisible()
    await expect(page.getByText(/delivery failed/i).first()).toBeVisible()
  })

  test("stuck intakes filter controls are present", async ({ page }) => {
    await page.goto("/doctor/admin/ops/intakes-stuck")
    await waitForPageLoad(page)

    // Filter section should be visible
    await expect(page.getByText(/filters/i)).toBeVisible()

    // Reason filter should be present
    await expect(page.getByText(/reason/i).first()).toBeVisible()

    // Service type filter should be present
    await expect(page.getByText(/service type/i)).toBeVisible()

    // Status filter should be present
    await expect(page.getByText(/status/i).first()).toBeVisible()
  })

  test("stuck intakes handles empty state", async ({ page }) => {
    await page.goto("/doctor/admin/ops/intakes-stuck")
    await waitForPageLoad(page)

    // Check for either data rows or empty state message
    const table = page.locator('[data-testid="stuck-intakes-table"]')
    await expect(table).toBeVisible()

    // Either we have rows or we have "No stuck intakes found"
    const emptyState = page.getByText(/no stuck intakes found/i)
    const rows = page.locator('[data-testid="stuck-intakes-table"] tbody tr')

    // One of these should be true
    const hasEmptyState = await emptyState.isVisible().catch(() => false)
    const rowCount = await rows.count()

    expect(hasEmptyState || rowCount > 0).toBe(true)
  })

  test("refresh button works", async ({ page }) => {
    await page.goto("/doctor/admin/ops/intakes-stuck")
    await waitForPageLoad(page)

    // Find and click refresh button
    const refreshButton = page.getByRole("button", { name: /refresh/i })
    await expect(refreshButton).toBeVisible()

    // Click should not error
    await refreshButton.click()

    // Page should still be functional after refresh
    const heading = page.getByRole("heading", { name: /stuck intakes/i })
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test("clicking stats card applies filter", async ({ page }) => {
    await page.goto("/doctor/admin/ops/intakes-stuck")
    await waitForPageLoad(page)

    // Click on the "Paid, No Review" card
    const paidNoReviewCard = page.locator("text=Paid, No Review").first()
    await paidNoReviewCard.click()

    // URL should update with the filter parameter
    await page.waitForURL(/reason=paid_no_review/)

    // Click again to clear filter
    await paidNoReviewCard.click()

    // URL should no longer have the filter
    await page.waitForURL(/\/doctor\/admin\/ops\/intakes-stuck(?!\?.*reason)/)
  })

  test("SLA thresholds legend is displayed", async ({ page }) => {
    await page.goto("/doctor/admin/ops/intakes-stuck")
    await waitForPageLoad(page)

    // SLA thresholds section should be visible
    await expect(page.getByRole("heading", { name: /sla thresholds/i })).toBeVisible()

    // Threshold descriptions should be visible
    await expect(page.getByText(/paid but not picked up within 5 minutes/i)).toBeVisible()
    await expect(page.getByText(/in review or pending info for over 60 minutes/i)).toBeVisible()
    await expect(page.getByText(/approved but no delivery email within 10 minutes/i)).toBeVisible()
  })

  test("unauthenticated access is blocked", async ({ page, context }) => {
    // Clear cookies to simulate logged out state
    await context.clearCookies()

    // Try to access the page directly
    const response = await page.goto("/doctor/admin/ops/intakes-stuck")

    // Should redirect to sign-in or return 401/403
    const currentUrl = page.url()

    expect(
      currentUrl.includes("sign-in") ||
      currentUrl.includes("login") ||
      response?.status() === 401 ||
      response?.status() === 403
    ).toBe(true)
  })
})
