/**
 * Payments Reconciliation Admin Page E2E Smoke Test
 * 
 * Verifies the reconciliation admin page loads and renders correctly.
 * 
 * Run with: PLAYWRIGHT=1 pnpm e2e --grep "reconciliation"
 */

import { test, expect } from "@playwright/test"
import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { waitForPageLoad } from "./helpers/test-utils"

test.describe("Payments Reconciliation Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login as operator (admin+doctor role)
    const result = await loginAsOperator(page)
    expect(result.success, `E2E login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("reconciliation page loads and renders table", async ({ page }) => {
    // Navigate to the reconciliation admin page
    await page.goto("/doctor/admin/ops/reconciliation")
    await waitForPageLoad(page)

    // Verify page title/heading is visible
    const heading = page.getByRole("heading", { name: /payments reconciliation/i })
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Verify table is rendered with headers
    const table = page.locator('[data-testid="reconciliation-table"]')
    await expect(table).toBeVisible()

    // Verify table headers exist
    await expect(page.getByRole("columnheader", { name: /reference/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /category/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /status/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /delivery/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /age/i })).toBeVisible()
  })

  test("reconciliation shows summary stats cards", async ({ page }) => {
    await page.goto("/doctor/admin/ops/reconciliation")
    await waitForPageLoad(page)

    // Stats cards should be visible
    await expect(page.getByText(/total records/i)).toBeVisible()
    await expect(page.getByText(/mismatches/i).first()).toBeVisible()
    await expect(page.getByText(/delivered/i).first()).toBeVisible()
    await expect(page.getByText(/pending/i).first()).toBeVisible()
    await expect(page.getByText(/failed/i).first()).toBeVisible()
  })

  test("mismatch only toggle exists and works", async ({ page }) => {
    await page.goto("/doctor/admin/ops/reconciliation")
    await waitForPageLoad(page)

    // Mismatch toggle should be visible
    const mismatchToggle = page.locator('[data-testid="mismatch-toggle"]')
    await expect(mismatchToggle).toBeVisible()

    // Toggle should be ON by default
    await expect(mismatchToggle).toBeChecked()

    // Click to toggle off
    await mismatchToggle.click()

    // URL should update
    await page.waitForURL(/mismatch_only=false/)

    // Click to toggle back on
    await mismatchToggle.click()
    await page.waitForURL(/mismatch_only=true/)
  })

  test("reconciliation handles empty state gracefully", async ({ page }) => {
    await page.goto("/doctor/admin/ops/reconciliation")
    await waitForPageLoad(page)

    // Check for either data rows or empty state message
    const table = page.locator('[data-testid="reconciliation-table"]')
    await expect(table).toBeVisible()

    // Either we have rows or we have "No mismatches found" / "No records found"
    const emptyState = page.getByText(/no (mismatches|records) found/i)
    const rows = page.locator('[data-testid="reconciliation-table"] tbody tr')

    const hasEmptyState = await emptyState.isVisible().catch(() => false)
    const rowCount = await rows.count()

    // One of these should be true
    expect(hasEmptyState || rowCount > 0).toBe(true)
  })

  test("category filter is present", async ({ page }) => {
    await page.goto("/doctor/admin/ops/reconciliation")
    await waitForPageLoad(page)

    // Category filter should be visible
    await expect(page.getByText(/category/i).first()).toBeVisible()
  })

  test("refresh button works", async ({ page }) => {
    await page.goto("/doctor/admin/ops/reconciliation")
    await waitForPageLoad(page)

    // Find and click refresh button
    const refreshButton = page.getByRole("button", { name: /refresh/i })
    await expect(refreshButton).toBeVisible()

    // Click should not error
    await refreshButton.click()

    // Page should still be functional after refresh
    const heading = page.getByRole("heading", { name: /payments reconciliation/i })
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test("delivery status guide is displayed", async ({ page }) => {
    await page.goto("/doctor/admin/ops/reconciliation")
    await waitForPageLoad(page)

    // Delivery status guide section should be visible
    await expect(page.getByRole("heading", { name: /delivery status guide/i })).toBeVisible()

    // Guide content should be visible
    await expect(page.getByText(/medical certificate/i).first()).toBeVisible()
    await expect(page.getByText(/prescription/i).first()).toBeVisible()
  })

  test("unauthenticated access is blocked", async ({ page, context }) => {
    // Clear cookies to simulate logged out state
    await context.clearCookies()

    // Try to access the page directly
    const response = await page.goto("/doctor/admin/ops/reconciliation")

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
