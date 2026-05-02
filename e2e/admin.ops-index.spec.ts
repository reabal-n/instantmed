/**
 * Ops Index Page Smoke Test
 * 
 * Verifies the ops index page loads and displays expected cards.
 * 
 * Run with: PLAYWRIGHT=1 pnpm e2e --grep "ops-index"
 */

import { expect,test } from "@playwright/test"

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
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    // Page title
    const heading = page.getByRole("heading", { name: /operations dashboard/i })
    await expect(heading).toBeVisible({ timeout: 10000 })

    await expect(page.getByText("System Status")).toBeVisible()
    await expect(page.getByText("Failed Webhooks")).toBeVisible()
    await expect(page.getByText("Email Success")).toBeVisible()
    await expect(page.getByText("Stuck Intakes")).toBeVisible()
    await expect(page.getByText("Audit Logs (24h)")).toBeVisible()
    await expect(page.getByText("Patient Identity", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Rx Identity Blocks", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Quick Actions")).toBeVisible()
  })

  test("navigate to each ops page and verify headers load", async ({ page }) => {
    // Start at ops index
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("link", { name: "Email Queue" })).toHaveAttribute("href", "/admin/emails/hub")

    await page.getByRole("link", { name: "SLA Monitor" }).click()
    await expect(page).toHaveURL(/\/admin\/ops\/sla/)
    await expect(page.getByRole("heading", { name: /sla/i })).toBeVisible({ timeout: 10000 })
    await page.goto("/admin/ops")

    await page.goto("/admin/ops/intakes-stuck")
    await expect(page).toHaveURL(/\/admin\/ops\/intakes-stuck/)
    await expect(page.getByRole("heading", { name: /stuck intakes/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("link", { name: "Back to Ops" }).first()).toBeVisible()

    // Back to Ops
    await page.getByRole("link", { name: "Back to Ops" }).first().click()
    await expect(page).toHaveURL(/\/admin\/ops$/)

    await page.getByRole("link", { name: "Refunds" }).click()
    await expect(page).toHaveURL(/\/admin\/refunds/)
    await page.goto("/admin/ops")

    await page.getByRole("link", { name: "Merge Audit" }).click()
    await expect(page).toHaveURL(/\/admin\/ops\/patient-merge-audit/)
    await expect(page.getByRole("heading", { name: /merge audit/i })).toBeVisible({ timeout: 10000 })
    await page.goto("/admin/ops")

    await page.getByRole("link", { name: "Rx Identity Blocks" }).click()
    await expect(page).toHaveURL(/\/admin\/ops\/prescribing-identity/)
    await expect(page.getByRole("heading", { name: /prescribing identity/i })).toBeVisible({ timeout: 10000 })
    await page.goto("/admin/ops")

    await page.goto("/admin/ops/reconciliation")
    await expect(page.getByRole("heading", { name: /reconciliation/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("link", { name: "Back to Ops" }).first()).toBeVisible()

    // Back to Ops
    await page.getByRole("link", { name: "Back to Ops" }).first().click()
    await expect(page).toHaveURL(/\/admin\/ops$/)
  })

  test("sidebar ops navigation is visible", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    const sidebar = page.getByRole("complementary", { name: "Admin sidebar" })
    await expect(sidebar).toBeVisible({ timeout: 10000 })
    await expect(sidebar.getByRole("link", { name: "Operations" })).toHaveAttribute("href", "/admin/ops")
  })
})
