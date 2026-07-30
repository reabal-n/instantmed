import { expect, test } from "@playwright/test"

import { loginAsDoctor, loginAsOperator, logoutTestUser } from "./helpers/auth"
import { STAFF_TEST_ROUTES } from "./helpers/staff-routes"

test.describe("Ops Navigation Visibility", () => {
  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("admin doctor sees the unified staff cockpit nav and queue", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop sidebar contract")
    const loginResult = await loginAsOperator(page)
    expect(loginResult.success).toBe(true)

    await page.goto(STAFF_TEST_ROUTES.dashboard)
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("region", { name: "Doctor request queue" })).toBeVisible()

    const sidebar = page.getByRole("complementary", { name: "Staff sidebar" })
    await expect(sidebar.getByRole("link", { name: "Ledger" })).toHaveAttribute("href", STAFF_TEST_ROUTES.adminIntakes)
    // Consolidated 2026-07-12: Review/Scripts were /dashboard?status=… deep
    // links to the page the Dashboard item already opens; the in-page queue
    // tab strip owns those filters now.
    await expect(sidebar.getByRole("link", { name: "Review" })).toHaveCount(0)
    await expect(sidebar.getByRole("link", { name: "Scripts" })).toHaveCount(0)
    await expect(sidebar.getByRole("link", { name: "Business" })).toHaveAttribute("href", "/admin/analytics")
    await expect(sidebar.getByRole("link", { name: "Operations" })).toHaveAttribute("href", STAFF_TEST_ROUTES.adminOps)
    await expect(sidebar.getByRole("link", { name: "Admin Panel" })).not.toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Email Suppression" })).not.toBeVisible()
  })

  test("non-admin doctor keeps the clinical-only nav", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop sidebar contract")
    const loginResult = await loginAsDoctor(page)
    expect(loginResult.success).toBe(true)

    await page.goto(STAFF_TEST_ROUTES.dashboard)
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("region", { name: "Doctor request queue" })).toBeVisible()

    const sidebar = page.getByRole("complementary", { name: "Staff sidebar" })
    await expect(sidebar.getByRole("link", { name: "Queue" })).toBeVisible()
    // Scripts consolidated into the in-page queue tab strip (2026-07-12).
    await expect(sidebar.getByRole("link", { name: "Scripts" })).toHaveCount(0)
    await expect(sidebar.getByRole("link", { name: "Patients" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Identity" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Ledger" })).not.toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Business" })).not.toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Operations" })).not.toBeVisible()
  })

  test("ops dashboard exposes only unresolved work or the single all-clear", async ({ page }) => {
    const loginResult = await loginAsOperator(page)
    expect(loginResult.success).toBe(true)

    await page.goto(STAFF_TEST_ROUTES.adminOps)
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({ timeout: 10000 })

    const allClearCount = await page.locator("[data-ops-all-clear]").count()
    const actionGroupCount = await page.locator("[data-ops-action-group]").count()
    expect(allClearCount + actionGroupCount).toBeGreaterThan(0)
    await expect(page.getByRole("region", { name: "Recovery counters" })).toHaveCount(0)
  })
})
