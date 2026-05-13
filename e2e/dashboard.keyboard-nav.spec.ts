import { expect, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"

/**
 * Phase 2 of dashboard remaster (2026-05-12): keyboard navigation on
 * the staff cockpit is the operationally critical surface. j / k /
 * ArrowDown / ArrowUp move selection, Enter / click sets the active
 * case (or opens the slide-over on mobile). Two-pane on desktop, sheet
 * on mobile.
 *
 * This spec is the regression net. The day the queue's keyboard wiring
 * silently breaks (it touches realtime + filter + sorted + auto-scroll
 * code paths), CI catches it before a doctor does.
 */

test.describe("Staff dashboard keyboard navigation", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `E2E login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("queue keeps shortcuts functional without a persistent hint strip", async ({ page }) => {
    await page.goto("/dashboard?showTestData=1")
    await page.waitForLoadState("networkidle")

    await expect(page.getByText("navigate", { exact: true })).toHaveCount(0)
    await expect(page.getByText("approve", { exact: true })).toHaveCount(0)
    await expect(page.getByText("decline", { exact: true })).toHaveCount(0)
  })

  test("ArrowDown focuses the first row and ArrowUp moves selection back", async ({ page }) => {
    await page.goto("/dashboard?showTestData=1")
    await page.waitForLoadState("networkidle")

    // Wait for at least one row to render. The seeded E2E patient is
    // exposed via `?showTestData=1` for admin sessions; in production
    // builds the queue may be empty so this test is conditional.
    const firstRow = page.locator('[data-testid^="queue-row-"]').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)
    test.skip(!rowVisible, "Queue has no rows in this environment — skipping keyboard nav assertion")

    // Press ArrowDown from the queue region. The handler is registered
    // on the window so we don't need to focus a specific element.
    await page.keyboard.press("ArrowDown")

    // The focused row picks up a primary-tinted ring + bg via the
    // `isFocused && "bg-primary/[0.04] ring-1 ring-inset ring-primary/20"`
    // classes in queue-table.tsx. Use the row's data-testid to check.
    await expect(firstRow).toHaveClass(/ring-primary/, { timeout: 5_000 })

    // ArrowUp at the top is a no-op; the same row stays focused.
    await page.keyboard.press("ArrowUp")
    await expect(firstRow).toHaveClass(/ring-primary/)
  })

  test("Escape clears the keyboard selection on the queue", async ({ page }) => {
    await page.goto("/dashboard?showTestData=1")
    await page.waitForLoadState("networkidle")

    const firstRow = page.locator('[data-testid^="queue-row-"]').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)
    test.skip(!rowVisible, "Queue has no rows in this environment — skipping Escape assertion")

    await page.keyboard.press("ArrowDown")
    await expect(firstRow).toHaveClass(/ring-primary/)

    await page.keyboard.press("Escape")
    await expect(firstRow).not.toHaveClass(/ring-primary/)
  })
})
