import { expect, test } from "@playwright/test"

import { loginAsDoctor, loginAsOperator, logoutTestUser } from "./helpers/auth"

test.describe("Ops Navigation Visibility", () => {
  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("admin doctor sees admin handoff links in the doctor sidebar", async ({ page }) => {
    const loginResult = await loginAsOperator(page)
    expect(loginResult.success).toBe(true)

    await page.goto("/dashboard")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Review Queue" })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("navigation").filter({ hasText: "Admin Panel" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Admin Panel" })).toHaveAttribute("href", "/admin")
    await expect(page.getByRole("link", { name: "Email Suppression" })).toHaveAttribute("href", "/doctor/email-suppression")
  })

  test("non-admin doctor does not see admin handoff links", async ({ page }) => {
    const loginResult = await loginAsDoctor(page)
    expect(loginResult.success).toBe(true)

    await page.goto("/dashboard")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Review Queue" })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("link", { name: "Admin Panel" })).not.toBeVisible()
    await expect(page.getByRole("link", { name: "Email Suppression" })).not.toBeVisible()
  })

  test("ops dashboard exposes current recovery links", async ({ page }) => {
    const loginResult = await loginAsOperator(page)
    expect(loginResult.success).toBe(true)

    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("button", { name: "Recovery palette" })).toBeVisible()

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
