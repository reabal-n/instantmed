/**
 * E2E Tests for Ops Navigation Visibility
 * 
 * Verifies that sensitive ops links (Email Outbox, Reconciliation, Doctor Ops)
 * are only visible to admin users, not regular doctors.
 */

import { test, expect } from "@playwright/test"
import { loginAsOperator, loginAsDoctor, logoutTestUser } from "./helpers/auth"

test.describe("Ops Navigation Visibility", () => {
  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("admin user sees all ops links in sidebar", async ({ page }) => {
    // Login as admin (operator)
    const loginResult = await loginAsOperator(page)
    expect(loginResult.success).toBe(true)

    // Navigate to doctor dashboard
    await page.goto("/doctor/dashboard")
    await page.waitForLoadState("networkidle")

    // Wait for sidebar to load
    const opsSection = page.getByTestId("ops-nav-section")
    await expect(opsSection).toBeVisible({ timeout: 10000 })

    // Admin should see all ops links
    await expect(page.getByTestId("ops-nav-ops")).toBeVisible()
    await expect(page.getByTestId("ops-nav-intakes-stuck")).toBeVisible()
    
    // Admin-only links should be visible
    await expect(page.getByTestId("ops-nav-email-outbox")).toBeVisible()
    await expect(page.getByTestId("ops-nav-reconciliation")).toBeVisible()
    await expect(page.getByTestId("ops-nav-doctors")).toBeVisible()
  })

  test("non-admin doctor sees only base ops links in sidebar", async ({ page }) => {
    // Login as doctor (NOT admin)
    const loginResult = await loginAsDoctor(page)
    expect(loginResult.success).toBe(true)

    // Navigate to doctor dashboard
    await page.goto("/doctor/dashboard")
    await page.waitForLoadState("networkidle")

    // Wait for sidebar to load
    const opsSection = page.getByTestId("ops-nav-section")
    await expect(opsSection).toBeVisible({ timeout: 10000 })

    // Doctor should see base ops links
    await expect(page.getByTestId("ops-nav-ops")).toBeVisible()
    await expect(page.getByTestId("ops-nav-intakes-stuck")).toBeVisible()
    
    // Admin-only links should NOT be visible
    await expect(page.getByTestId("ops-nav-email-outbox")).not.toBeVisible()
    await expect(page.getByTestId("ops-nav-reconciliation")).not.toBeVisible()
    await expect(page.getByTestId("ops-nav-doctors")).not.toBeVisible()
  })

  test("ops page shows external tool links", async ({ page }) => {
    // Login as admin
    const loginResult = await loginAsOperator(page)
    expect(loginResult.success).toBe(true)

    // Navigate to ops page
    await page.goto("/doctor/admin/ops")
    await page.waitForLoadState("networkidle")

    // Verify external tools section exists
    await expect(page.getByText("External Tools")).toBeVisible({ timeout: 10000 })

    // Resend link should always be visible
    await expect(page.getByTestId("external-link-resend")).toBeVisible()

    // Sentry and Vercel may show as "not configured" if env vars not set
    // Just verify the section renders without error
    const sentryLink = page.getByTestId("external-link-sentry")
    const sentryNotConfigured = page.getByText("Sentry Issues (not configured)")
    await expect(sentryLink.or(sentryNotConfigured)).toBeVisible()

    const vercelLink = page.getByTestId("external-link-vercel")
    const vercelNotConfigured = page.getByText("Vercel Logs (not configured)")
    await expect(vercelLink.or(vercelNotConfigured)).toBeVisible()
  })
})
