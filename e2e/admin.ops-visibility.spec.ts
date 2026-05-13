import { expect, test } from "@playwright/test"

import { loginAsDoctor, loginAsOperator, logoutTestUser } from "./helpers/auth"

test.describe("Ops Navigation Visibility", () => {
  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("admin doctor sees the unified staff cockpit nav and queue", async ({ page }) => {
    const loginResult = await loginAsOperator(page)
    expect(loginResult.success).toBe(true)

    await page.goto("/dashboard")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("region", { name: "Doctor request queue" })).toBeVisible()

    const sidebar = page.getByRole("complementary", { name: "Staff sidebar" })
    await expect(sidebar.getByRole("link", { name: "Requests" })).toHaveAttribute("href", "/admin/intakes")
    await expect(sidebar.getByRole("link", { name: "Review" })).toHaveAttribute(
      "href",
      "/dashboard?status=review#doctor-queue",
    )
    await expect(sidebar.getByRole("link", { name: "Ops" })).toHaveAttribute("href", "/admin/ops")
    await expect(sidebar.getByRole("link", { name: "Admin Panel" })).not.toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Email Suppression" })).not.toBeVisible()
  })

  test("non-admin doctor keeps the clinical-only nav", async ({ page }) => {
    const loginResult = await loginAsDoctor(page)
    expect(loginResult.success).toBe(true)

    await page.goto("/dashboard")
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

    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({ timeout: 10000 })

    await expect(page.getByRole("link", { name: /Payment webhooks/i }).first()).toHaveAttribute(
      "href",
      "/admin/webhook-dlq",
    )
    await expect(page.getByRole("link", { name: /Email delivery/i }).first()).toHaveAttribute(
      "href",
      "/admin/emails/hub",
    )
    await expect(page.getByRole("link", { name: /Prescription delivery/i }).first()).toHaveAttribute(
      "href",
      "/admin/ops/parchment",
    )
  })
})
