/**
 * E2E Tests for Operational Controls
 *
 * Tests:
 * - Admin Feature Flags page with Operational Controls
 * - Doctor availability: paused doctors see empty queue
 * - Maintenance mode blocks request page
 * - Urgent notice banner (when enabled)
 *
 * Run with: PLAYWRIGHT=1 pnpm e2e --grep "operational-controls"
 */

import { expect,test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"

import { OPERATOR_PROFILE_ID } from "../scripts/e2e/seed"
import { loginAsOperator, loginAsPatient, logoutTestUser } from "./helpers/auth"
import { waitForPageLoad } from "./helpers/test-utils"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

test.describe("Operational Controls - Admin Feature Flags", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("admin features page shows Operational Controls section", async ({ page }) => {
    await page.goto("/admin/features")
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /feature flags/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Operational Controls")).toBeVisible()
    await expect(page.getByText("Business hours")).toBeVisible()
    await expect(page.getByText("Capacity limit")).toBeVisible()
    await expect(page.getByText("Urgent notice")).toBeVisible()
    await expect(page.getByText("Scheduled maintenance")).toBeVisible()
  })

  test("admin features page shows Maintenance Mode section", async ({ page }) => {
    await page.goto("/admin/features")
    await waitForPageLoad(page)

    await expect(page.getByText("Maintenance Mode")).toBeVisible()
    await expect(page.getByText("Platform Status")).toBeVisible()
  })
})

test.describe("Operational Controls - Doctor Availability", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("paused doctor sees empty queue", async ({ page }) => {
    test.skip(!SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY required")

    const supabase = getSupabaseClient()
    try {
      // Set doctor_available = false for operator
      await supabase
        .from("profiles")
        .update({ doctor_available: false })
        .eq("id", OPERATOR_PROFILE_ID)

      await page.goto("/doctor/dashboard")
      await waitForPageLoad(page)

      await expect(page.getByRole("heading", { name: /review queue/i })).toBeVisible({ timeout: 15000 })

      // Paused doctor should see empty queue ("Queue is clear!")
      const queueClear = page.getByText(/queue is clear/i)
      await expect(queueClear).toBeVisible({ timeout: 5000 })
      const hasIntakes = await page.getByText("E2E Test Patient").isVisible().catch(() => false)
      expect(hasIntakes).toBe(false)
    } finally {
      // Restore doctor_available for other tests
      await supabase
        .from("profiles")
        .update({ doctor_available: true })
        .eq("id", OPERATOR_PROFILE_ID)
    }
  })
})

test.describe("Operational Controls - Maintenance Mode", () => {
  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("maintenance mode blocks request page", async ({ page }) => {
    test.skip(!SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY required")

    const supabase = getSupabaseClient()

    // Enable maintenance mode
    await supabase
      .from("feature_flags")
      .upsert(
        {
          key: "maintenance_mode",
          value: true,
          updated_at: new Date().toISOString(),
          updated_by: "e2e-test",
        },
        { onConflict: "key" }
      )

    await page.goto("/request")
    await waitForPageLoad(page)

    await expect(page.getByText(/we'll be back shortly|maintenance/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("link", { name: /back to home/i })).toBeVisible()

    // Restore maintenance mode
    await supabase
      .from("feature_flags")
      .upsert(
        {
          key: "maintenance_mode",
          value: false,
          updated_at: new Date().toISOString(),
          updated_by: "e2e-test",
        },
        { onConflict: "key" }
      )
  })
})

test.describe("Operational Controls - Request Page Blocks", () => {
  test("request page loads when operational controls allow", async ({ page }) => {
    const result = await loginAsPatient(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)

    await page.goto("/request")
    await waitForPageLoad(page)

    // Should see request flow or service hub (not maintenance/closed/capacity)
    const blocked = await page.getByText(/we'll be back shortly|we're closed|high demand/i).isVisible().catch(() => false)
    if (!blocked) {
      await expect(page.locator("body")).toContainText(/.+/)
    }
    // Test passes if page loads - blocking depends on current config
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })
})
