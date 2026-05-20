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
    await expect(sidebar.getByRole("link", { name: "Requests" })).toHaveAttribute("href", STAFF_TEST_ROUTES.adminIntakes)
    await expect(sidebar.getByRole("link", { name: "Review" })).toHaveAttribute(
      "href",
      STAFF_TEST_ROUTES.dashboard + "?status=review#doctor-queue",
    )
    await expect(sidebar.getByRole("link", { name: "Ops" })).toHaveAttribute("href", STAFF_TEST_ROUTES.adminOps)
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
    await expect(sidebar.getByRole("link", { name: "Scripts" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Patients" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Identity" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Requests" })).not.toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Analytics" })).not.toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Ops" })).not.toBeVisible()
  })

  test("ops dashboard exposes current recovery links", async ({ page }) => {
    const loginResult = await loginAsOperator(page)
    expect(loginResult.success).toBe(true)

    await page.goto(STAFF_TEST_ROUTES.adminOps)
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({ timeout: 10000 })

    const cards = page.getByTestId("counter-card")
    await expect(cards).toHaveCount(4)
    await expect(cards.nth(1)).toHaveAttribute("href", STAFF_TEST_ROUTES.adminWebhookDlq)
    await expect(cards.nth(2)).toHaveAttribute("href", STAFF_TEST_ROUTES.adminOpsParchment)
    await expect(cards.nth(3)).toHaveAttribute("href", STAFF_TEST_ROUTES.adminPrescribingIdentity)
  })
})
