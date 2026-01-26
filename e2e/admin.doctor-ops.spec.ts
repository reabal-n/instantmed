/**
 * Doctor Ops Dashboard E2E Smoke Test
 * 
 * Verifies the doctor ops admin page loads and renders correctly.
 * 
 * Run with: PLAYWRIGHT=1 pnpm e2e --grep "doctor-ops"
 */

import { test, expect } from "@playwright/test"
import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { waitForPageLoad } from "./helpers/test-utils"

test.describe("Doctor Ops Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login as operator (admin+doctor role)
    const result = await loginAsOperator(page)
    expect(result.success, `E2E login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("doctor ops page loads and renders table", async ({ page }) => {
    // Navigate to the doctor ops admin page
    await page.goto("/doctor/admin/ops/doctors")
    await waitForPageLoad(page)

    // Verify page title/heading is visible
    const heading = page.getByRole("heading", { name: /doctor ops/i })
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Verify table is rendered with headers
    const table = page.locator('[data-testid="doctor-ops-table"]')
    await expect(table).toBeVisible()

    // Verify table headers exist
    await expect(page.getByRole("columnheader").filter({ hasText: /doctor/i })).toBeVisible()
    await expect(page.getByRole("columnheader").filter({ hasText: /pending/i })).toBeVisible()
    await expect(page.getByRole("columnheader").filter({ hasText: /first action/i })).toBeVisible()
    await expect(page.getByRole("columnheader").filter({ hasText: /decision/i }).first()).toBeVisible()
    await expect(page.getByRole("columnheader").filter({ hasText: /sla/i })).toBeVisible()
  })

  test("doctor ops shows summary stats cards", async ({ page }) => {
    await page.goto("/doctor/admin/ops/doctors")
    await waitForPageLoad(page)

    // Stats cards should be visible
    await expect(page.getByText(/active doctors/i)).toBeVisible()
    await expect(page.getByText(/total pending/i)).toBeVisible()
    await expect(page.getByText(/total decisions/i)).toBeVisible()
    await expect(page.getByText(/sla breaches/i).first()).toBeVisible()
  })

  test("doctor ops handles empty state gracefully", async ({ page }) => {
    await page.goto("/doctor/admin/ops/doctors")
    await waitForPageLoad(page)

    // Check for either data rows or empty state message
    const table = page.locator('[data-testid="doctor-ops-table"]')
    await expect(table).toBeVisible()

    // Either we have rows or we have "No doctor data available"
    const emptyState = page.getByText(/no doctor data available/i)
    const rows = page.locator('[data-testid="doctor-ops-table"] tbody tr')

    // One of these should be true
    const hasEmptyState = await emptyState.isVisible().catch(() => false)
    const rowCount = await rows.count()

    expect(hasEmptyState || rowCount > 0).toBe(true)
  })

  test("date range toggle works", async ({ page }) => {
    await page.goto("/doctor/admin/ops/doctors")
    await waitForPageLoad(page)

    // Find the 30 days button and click it
    const thirtyDayButton = page.getByRole("button", { name: /30 days/i })
    await expect(thirtyDayButton).toBeVisible()
    await thirtyDayButton.click()

    // URL should update with range parameter
    await page.waitForURL(/range=30d/)

    // Click 7 days to go back
    const sevenDayButton = page.getByRole("button", { name: /7 days/i })
    await sevenDayButton.click()

    // URL should update
    await page.waitForURL(/range=7d/)
  })

  test("column sorting works", async ({ page }) => {
    await page.goto("/doctor/admin/ops/doctors")
    await waitForPageLoad(page)

    // Click on "Doctor" column header to sort
    const doctorHeader = page.getByRole("columnheader").filter({ hasText: /doctor/i })
    await doctorHeader.click()

    // URL should update with sort parameter
    await page.waitForURL(/sort=doctor_name/)

    // Page should still be functional
    const heading = page.getByRole("heading", { name: /doctor ops/i })
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test("refresh button works", async ({ page }) => {
    await page.goto("/doctor/admin/ops/doctors")
    await waitForPageLoad(page)

    // Find and click refresh button
    const refreshButton = page.getByRole("button", { name: /refresh/i })
    await expect(refreshButton).toBeVisible()

    // Click should not error
    await refreshButton.click()

    // Page should still be functional after refresh
    const heading = page.getByRole("heading", { name: /doctor ops/i })
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test("metrics guide is displayed", async ({ page }) => {
    await page.goto("/doctor/admin/ops/doctors")
    await waitForPageLoad(page)

    // Metrics guide section should be visible
    await expect(page.getByRole("heading", { name: /metrics guide/i })).toBeVisible()

    // Descriptions should be visible
    await expect(page.getByText(/time from payment to first doctor action/i)).toBeVisible()
    await expect(page.getByText(/time from payment to approval\/decline/i)).toBeVisible()
  })

  test("unauthenticated access is blocked", async ({ page, context }) => {
    // Clear cookies to simulate logged out state
    await context.clearCookies()

    // Try to access the page directly
    const response = await page.goto("/doctor/admin/ops/doctors")

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
