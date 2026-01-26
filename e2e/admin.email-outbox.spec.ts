/**
 * Email Outbox Admin Viewer E2E Smoke Test
 * 
 * Verifies the email outbox admin page loads and renders correctly.
 * 
 * Run with: PLAYWRIGHT=1 pnpm e2e --grep "email-outbox"
 */

import { test, expect } from "@playwright/test"
import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { waitForPageLoad } from "./helpers/test-utils"

test.describe("Email Outbox Admin Viewer", () => {
  test.beforeEach(async ({ page }) => {
    // Login as operator (admin+doctor role)
    const result = await loginAsOperator(page)
    expect(result.success, `E2E login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("email outbox page loads and renders table", async ({ page }) => {
    // Navigate to the email outbox admin page
    await page.goto("/doctor/admin/email-outbox")
    await waitForPageLoad(page)

    // Verify page title/heading is visible
    const heading = page.getByRole("heading", { name: /email outbox/i })
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Verify table is rendered with headers
    const table = page.locator('[data-testid="email-outbox-table"]')
    await expect(table).toBeVisible()

    // Verify table headers exist
    await expect(page.getByRole("columnheader", { name: /created/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /status/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /type/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /to/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /subject/i })).toBeVisible()
  })

  test("email outbox shows stats cards", async ({ page }) => {
    await page.goto("/doctor/admin/email-outbox")
    await waitForPageLoad(page)

    // Stats cards should be visible
    await expect(page.getByText(/total/i)).toBeVisible()
    await expect(page.getByText(/sent/i)).toBeVisible()
    await expect(page.getByText(/failed/i)).toBeVisible()
  })

  test("email outbox filter controls are present", async ({ page }) => {
    await page.goto("/doctor/admin/email-outbox")
    await waitForPageLoad(page)

    // Filter section should be visible
    await expect(page.getByText(/filters/i)).toBeVisible()

    // Search input should be present
    const searchInput = page.getByPlaceholder(/email address/i)
    await expect(searchInput).toBeVisible()

    // Status filter should be present
    await expect(page.getByText(/status/i).first()).toBeVisible()
  })

  test("email outbox handles empty state", async ({ page }) => {
    // Navigate with a filter that likely returns no results
    await page.goto("/doctor/admin/email-outbox?intake_id=00000000-0000-0000-0000-000000000000")
    await waitForPageLoad(page)

    // Should show "No emails found" or similar empty state
    const emptyState = page.getByText(/no emails found/i)
    await expect(emptyState).toBeVisible({ timeout: 10000 })
  })

  test("clicking row opens detail modal", async ({ page }) => {
    await page.goto("/doctor/admin/email-outbox")
    await waitForPageLoad(page)

    // Wait for table to load
    const table = page.locator('[data-testid="email-outbox-table"]')
    await expect(table).toBeVisible()

    // Check if there are any rows
    const rows = page.locator('[data-testid="email-outbox-table"] tbody tr')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      // Click first data row
      await rows.first().click()

      // Modal should open with "Email Details" title
      const modalTitle = page.getByRole("heading", { name: /email details/i })
      await expect(modalTitle).toBeVisible({ timeout: 5000 })

      // Close modal
      const closeButton = page.getByRole("button", { name: /close/i }).or(
        page.locator('[data-state="open"] button[aria-label*="close" i]')
      ).or(
        page.locator('button:has(svg.lucide-x)')
      )
      
      if (await closeButton.first().isVisible()) {
        await closeButton.first().click()
      } else {
        // Press escape to close
        await page.keyboard.press("Escape")
      }
    } else {
      // No rows - skip this part of the test
      // eslint-disable-next-line no-console
      console.log("[E2E] No email outbox rows found - skipping row click test")
    }
  })

  test("unauthenticated access is blocked", async ({ page, context }) => {
    // Clear cookies to simulate logged out state
    await context.clearCookies()

    // Try to access the page directly
    const response = await page.goto("/doctor/admin/email-outbox")

    // Should redirect to sign-in or return 401/403
    // Check if we're redirected away from the admin page
    const currentUrl = page.url()
    
    expect(
      currentUrl.includes("sign-in") || 
      currentUrl.includes("login") ||
      response?.status() === 401 ||
      response?.status() === 403
    ).toBe(true)
  })
})
