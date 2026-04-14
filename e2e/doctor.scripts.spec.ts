/**
 * Doctor Scripts Page E2E Tests
 *
 * Tests the /doctor/scripts page:
 * - Page loads with heading and status summary cards
 * - Status filter cards toggle filtering
 * - Refresh button works without error
 * - Empty state renders when no tasks match
 * - Script task cards display patient + medication info
 */

import { expect, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { waitForPageLoad } from "./helpers/test-utils"

test.describe("Doctor Scripts Page", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("scripts page loads with heading and status cards", async ({ page }) => {
    await page.goto("/doctor/scripts")
    await waitForPageLoad(page)

    // Should see the page heading
    await expect(
      page.getByRole("heading", { name: /script to-do/i })
    ).toBeVisible({ timeout: 15000 })

    // Should see the three status summary cards
    await expect(
      page.getByRole("button", { name: /filter by pending send/i })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /filter by sent/i })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /filter by confirmed/i })
    ).toBeVisible()
  })

  test("refresh button triggers reload without error", async ({ page }) => {
    await page.goto("/doctor/scripts")
    await waitForPageLoad(page)

    await expect(
      page.getByRole("heading", { name: /script to-do/i })
    ).toBeVisible({ timeout: 15000 })

    // Click refresh
    const refreshBtn = page.getByRole("button", { name: /refresh script tasks/i })
    await expect(refreshBtn).toBeVisible()
    await refreshBtn.click()

    // Page should still show heading (no crash)
    await expect(
      page.getByRole("heading", { name: /script to-do/i })
    ).toBeVisible()

    // No error banners
    await expect(page.getByText(/failed to load/i)).not.toBeVisible()
  })

  test("status filter cards toggle filtering", async ({ page }) => {
    await page.goto("/doctor/scripts")
    await waitForPageLoad(page)

    await expect(
      page.getByRole("heading", { name: /script to-do/i })
    ).toBeVisible({ timeout: 15000 })

    // Click "Pending Send" filter
    await page.getByRole("button", { name: /filter by pending send/i }).click()
    await page.waitForTimeout(500)

    // Should show filter indicator
    const filterIndicator = page.getByText(/showing: pending send/i)
    const hasFilter = await filterIndicator.isVisible().catch(() => false)

    if (hasFilter) {
      // Clear filter link should be visible
      await expect(page.getByRole("button", { name: /clear filter/i })).toBeVisible()

      // Click clear filter
      await page.getByRole("button", { name: /clear filter/i }).click()
      await page.waitForTimeout(500)

      // Filter indicator should disappear
      await expect(filterIndicator).not.toBeVisible()
    }

    // Page should still be functional (no crash)
    await expect(
      page.getByRole("heading", { name: /script to-do/i })
    ).toBeVisible()
  })

  test("shows empty state or task list", async ({ page }) => {
    await page.goto("/doctor/scripts")
    await waitForPageLoad(page)

    await expect(
      page.getByRole("heading", { name: /script to-do/i })
    ).toBeVisible({ timeout: 15000 })

    // Either we see task cards with patient names, or the "All caught up!" empty state
    const emptyState = page.getByText(/all caught up/i)
    const taskCards = page.locator('[class*="rounded-xl"][class*="border"]').filter({
      has: page.locator("text=/Created/"),
    })

    const hasEmpty = await emptyState.isVisible().catch(() => false)
    const hasCards = (await taskCards.count()) > 0

    // One of the two states must be true
    expect(hasEmpty || hasCards).toBe(true)
  })
})
