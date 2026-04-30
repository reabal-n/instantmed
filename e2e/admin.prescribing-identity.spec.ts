/**
 * Prescribing Identity Ops Page Smoke Test
 *
 * Verifies admins can see a blocked prescription request and open the inline
 * correction form without relying on production patient data.
 */

import { expect, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { getSupabaseClient } from "./helpers/db"

const PATIENT_ID = "e2e00000-0000-0000-0000-000000000090"
const INTAKE_ID = "e2e00000-0000-0000-0000-000000000091"
const SERVICE_ID = "e2e00000-0000-0000-0000-000000000020"
const REFERENCE_NUMBER = "E2E-RX-IDENTITY"

async function cleanup() {
  const supabase = getSupabaseClient()
  await supabase.from("intake_answers").delete().eq("intake_id", INTAKE_ID)
  await supabase.from("intakes").delete().eq("id", INTAKE_ID)
  await supabase.from("profiles").delete().eq("id", PATIENT_ID)
}

test.describe("Prescribing Identity Ops Page", () => {
  test.beforeAll(async () => {
    const supabase = getSupabaseClient()
    await cleanup()

    const { error: profileError } = await supabase.from("profiles").insert({
      id: PATIENT_ID,
      auth_user_id: null,
      email: "e2e-prescribing-identity@test.instantmed.com.au",
      full_name: "E2E Prescribing Identity",
      date_of_birth: "1990-01-01",
      sex: "M",
      role: "patient",
      phone: "0400000000",
      address_line1: "1 E2E Street",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      medicare_number: null,
      medicare_irn: null,
      medicare_expiry: null,
      onboarding_completed: true,
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    expect(profileError?.message).toBeUndefined()

    const { error: intakeError } = await supabase.from("intakes").insert({
      id: INTAKE_ID,
      patient_id: PATIENT_ID,
      service_id: SERVICE_ID,
      reference_number: REFERENCE_NUMBER,
      status: "pending_payment",
      payment_status: "paid",
      category: "prescription",
      subtype: "repeat",
      created_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    expect(intakeError?.message).toBeUndefined()

    const { error: statusError } = await supabase
      .from("intakes")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", INTAKE_ID)
    expect(statusError?.message).toBeUndefined()
  })

  test.afterAll(async () => {
    await cleanup()
  })

  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `E2E login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("admin can open the inline prescribing identity correction form", async ({ page }) => {
    await page.goto("/admin/ops/prescribing-identity")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Prescribing Identity Blocks" })).toBeVisible()
    await expect(page.getByText(REFERENCE_NUMBER)).toBeVisible()

    const blockedItem = page.getByText(REFERENCE_NUMBER).locator("xpath=ancestor::div[contains(@class, 'grid')][1]")
    await blockedItem.getByRole("button", { name: /edit details/i }).click()

    await expect(blockedItem.getByLabel("DOB")).toBeVisible()
    await expect(blockedItem.getByLabel("Medicare", { exact: true })).toBeVisible()
    await expect(blockedItem.getByRole("button", { name: /save details/i })).toBeVisible()
  })
})
