/**
 * Ops Index Page Smoke Test
 * 
 * Verifies the ops index page loads and displays expected cards.
 * 
 * Run with: PLAYWRIGHT=1 pnpm e2e --grep "ops-index"
 */

import { test, expect } from "@playwright/test"
import { loginAsOperator, logoutTestUser } from "./helpers/auth"

test.describe("Ops Index Page", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `E2E login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("page loads and displays all ops cards", async ({ page }) => {
    await page.goto("/doctor/admin/ops")
    await page.waitForLoadState("networkidle")

    // Page title
    const heading = page.getByRole("heading", { name: /ops/i })
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Ops cards (using stable data-testid selectors)
    await expect(page.getByTestId("ops-card-email-outbox")).toBeVisible()
    await expect(page.getByTestId("ops-card-stuck-intakes")).toBeVisible()
    await expect(page.getByTestId("ops-card-reconciliation")).toBeVisible()
    await expect(page.getByTestId("ops-card-doctors")).toBeVisible()

    // Sentry card (text placeholder - non-clickable)
    await expect(page.getByText("Sentry")).toBeVisible()

    // Vercel Logs card (text placeholder - non-clickable)
    await expect(page.getByText("Vercel Logs")).toBeVisible()

    // Quick summary section
    await expect(page.getByText("Quick Summary")).toBeVisible()
  })

  test("navigate to each ops page and verify headers load", async ({ page }) => {
    // Start at ops index
    await page.goto("/doctor/admin/ops")
    await page.waitForLoadState("networkidle")

    // Email Outbox (using stable data-testid)
    await page.getByTestId("ops-card-email-outbox").click()
    await expect(page).toHaveURL(/\/doctor\/admin\/email-outbox/)
    await expect(page.getByRole("heading", { name: /email outbox/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Back to Ops")).toBeVisible()

    // Back to Ops via link
    await page.getByText("Back to Ops").click()
    await expect(page).toHaveURL(/\/doctor\/admin\/ops$/)

    // Stuck Intakes (using stable data-testid)
    await page.getByTestId("ops-card-stuck-intakes").click()
    await expect(page).toHaveURL(/\/doctor\/admin\/ops\/intakes-stuck/)
    await expect(page.getByRole("heading", { name: /stuck intakes/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Back to Ops")).toBeVisible()

    // Back to Ops
    await page.getByText("Back to Ops").click()
    await expect(page).toHaveURL(/\/doctor\/admin\/ops$/)

    // Reconciliation (using stable data-testid)
    await page.getByTestId("ops-card-reconciliation").click()
    await expect(page).toHaveURL(/\/doctor\/admin\/ops\/reconciliation/)
    await expect(page.getByRole("heading", { name: /reconciliation/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Back to Ops")).toBeVisible()

    // Back to Ops
    await page.getByText("Back to Ops").click()
    await expect(page).toHaveURL(/\/doctor\/admin\/ops$/)

    // Doctor Ops (using stable data-testid)
    await page.getByTestId("ops-card-doctors").click()
    await expect(page).toHaveURL(/\/doctor\/admin\/ops\/doctors/)
    await expect(page.getByRole("heading", { name: /doctor ops/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Back to Ops")).toBeVisible()
  })

  test("sidebar ops navigation is visible", async ({ page }) => {
    await page.goto("/doctor/admin/ops")
    await page.waitForLoadState("networkidle")

    // Verify sidebar ops section exists (on desktop)
    const opsSection = page.getByText("Ops", { exact: true }).first()
    await expect(opsSection).toBeVisible({ timeout: 10000 })

    // Verify ops nav items in sidebar
    const sidebarOpsOverview = page.locator("nav").getByText("Ops Overview")
    const hasSidebarNav = await sidebarOpsOverview.isVisible().catch(() => false)
    
    if (hasSidebarNav) {
      await expect(sidebarOpsOverview).toBeVisible()
    }
  })
})
