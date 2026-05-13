import { expect, test } from "@playwright/test"

import { loginAsSupport, logoutTestUser } from "./helpers/auth"
import { STAFF_TEST_ROUTES } from "./helpers/staff-routes"

test.describe("Support Ops Boundary", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsSupport(page)
    expect(result.success, `E2E support login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("support lands in the bounded ops cockpit with support-only navigation", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop sidebar contract")

    await page.goto(STAFF_TEST_ROUTES.dashboard)
    await page.waitForURL(/\/admin\/ops/, { timeout: 30_000 })
    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({ timeout: 15_000 })

    const sidebar = page.getByRole("complementary", { name: "Staff sidebar" })
    await expect(sidebar).toBeVisible({ timeout: 10_000 })

    await expect(sidebar.getByRole("link", { name: "Operations" })).toHaveAttribute("href", STAFF_TEST_ROUTES.adminOps)
    await expect(sidebar.getByRole("link", { name: "Webhook retries" })).toHaveAttribute("href", STAFF_TEST_ROUTES.adminWebhookDlq)
    await expect(sidebar.getByRole("link", { name: "Parchment recovery" })).toHaveAttribute("href", STAFF_TEST_ROUTES.adminOpsParchment)
    await expect(sidebar.getByRole("link", { name: "Identity chase-ups" })).toHaveAttribute("href", STAFF_TEST_ROUTES.adminPrescribingIdentity)

    await expect(sidebar.getByRole("link", { name: "Dashboard" })).toHaveCount(0)
    await expect(sidebar.getByRole("link", { name: "Queue" })).toHaveCount(0)
    await expect(sidebar.getByRole("link", { name: "Scripts" })).toHaveCount(0)
    await expect(sidebar.getByRole("link", { name: "Patients" })).toHaveCount(0)
    await expect(sidebar.getByRole("link", { name: "Analytics" })).toHaveCount(0)
    await expect(sidebar.getByRole("link", { name: "Finance" })).toHaveCount(0)
    await expect(sidebar.getByRole("link", { name: "Settings" })).toHaveCount(0)
    await expect(sidebar.locator('a[aria-current="page"]')).toHaveCount(1)
  })

  test("support is redirected away from admin-only and clinical pages", async ({ page }) => {
    await page.goto(STAFF_TEST_ROUTES.adminPatients)
    await page.waitForURL(/\/admin\/ops/, { timeout: 30_000 })
    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible()

    await page.goto(STAFF_TEST_ROUTES.adminFinance)
    await page.waitForURL(/\/admin\/ops/, { timeout: 30_000 })
    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible()

    await page.goto(STAFF_TEST_ROUTES.dashboard)
    await page.waitForURL(/\/admin\/ops/, { timeout: 30_000 })
    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible()
  })

  test("support can open only masked recovery pages", async ({ page, isMobile }) => {
    await page.goto(STAFF_TEST_ROUTES.adminOpsParchment)
    await expect(page.getByRole("heading", { name: "Parchment ops" })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/hidden in support view/i).first()).toBeVisible()

    if (!isMobile) {
      const sidebar = page.getByRole("complementary", { name: "Staff sidebar" })
      await expect(sidebar.locator('a[aria-current="page"]')).toHaveCount(1)
      await expect(sidebar.getByRole("link", { name: "Parchment recovery" })).toHaveAttribute("aria-current", "page")
      await expect(sidebar.getByRole("link", { name: "Operations" })).not.toHaveAttribute("aria-current", "page")
    }

    await page.goto(STAFF_TEST_ROUTES.adminPrescribingIdentity)
    await expect(page.getByRole("heading", { name: "Prescribing identity blocks" })).toBeVisible({ timeout: 15_000 })

    await page.goto(STAFF_TEST_ROUTES.adminWebhookDlq)
    await expect(page.getByRole("heading", { name: "Payment webhooks" })).toBeVisible({ timeout: 15_000 })
  })
})
