/* eslint-disable no-console */
import { expect,test } from "@playwright/test"
import { randomUUID } from "crypto"

import { loginAsPatient } from "./helpers/auth"
import { cleanupTestIntake,getSupabaseClient, isDbAvailable } from "./helpers/db"

/**
 * Guest Checkout → Account Linking E2E Tests
 *
 * Verifies that guest profiles (auth_user_id = null) created during
 * guest checkout are correctly linked when the user creates a Supabase Auth account.
 *
 * Tests the linking guard (.is('auth_user_id', null)) that prevents
 * race conditions between the handle_new_user trigger and post-signin page.
 */

const GUEST_PROFILE_ID = "e2e00000-0000-0000-0000-0000000000a1"
const GUEST_EMAIL = "e2e-guest-test@example.com"
const E2E_SERVICE_ID = "e2e00000-0000-0000-0000-000000000020"
const GUEST_SESSION_ID = "cs_test_e2e_guest_complete_account"

test.describe.serial("Guest Checkout → Account Linking", () => {
  test.skip(!isDbAvailable(), "Skipping: DB not available")

  let guestIntakeId: string | null = null
  let fakeAuthUserId: string | null = null
  let secondAuthUserId: string | null = null
  let authUserIds: string[] = []

  async function createAuthUser(label: string) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email: `e2e-guest-${label}-${Date.now()}-${randomUUID()}@example.com`,
      password: `E2e-${randomUUID()}!`,
      email_confirm: true,
    })

    if (error || !data.user) {
      throw new Error(`Auth user seed failed: ${error?.message || "missing user"}`)
    }

    authUserIds.push(data.user.id)
    return data.user.id
  }

  async function cleanupAuthUsers() {
    const supabase = getSupabaseClient()
    const ids = authUserIds
    authUserIds = []
    fakeAuthUserId = null
    secondAuthUserId = null

    for (const id of ids) {
      await supabase.auth.admin.deleteUser(id)
    }
  }

  async function cleanupGuestData() {
    const supabase = getSupabaseClient()
    const { data: intakes } = await supabase
      .from("intakes")
      .select("id")
      .eq("patient_id", GUEST_PROFILE_ID)

    for (const intake of intakes || []) {
      await cleanupTestIntake(intake.id)
    }

    await supabase.from("profiles").delete().eq("id", GUEST_PROFILE_ID)
    await supabase.from("profiles").delete().ilike("email", GUEST_EMAIL)
  }

  test.beforeEach(async () => {
    const supabase = getSupabaseClient()

    // Clean up any previous test data
    await cleanupGuestData()

    // Seed a guest profile (simulates what lib/stripe/guest-checkout.ts does)
    const { error: profileError } = await supabase.from("profiles").insert({
      id: GUEST_PROFILE_ID,
      email: GUEST_EMAIL,
      full_name: "E2E Guest User",
      role: "patient",
      auth_user_id: null,
      onboarding_completed: false,
      email_verified: false,
    })

    if (profileError) {
      console.error("Failed to seed guest profile:", profileError.message)
      throw new Error(`Seed failed: ${profileError.message}`)
    }

    // Seed an intake for this guest
    const refNum = `E2E-GUEST-${Date.now().toString(36).toUpperCase()}`
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .insert({
        patient_id: GUEST_PROFILE_ID,
        service_id: E2E_SERVICE_ID,
        reference_number: refNum,
        status: "pending_payment",
        payment_status: "pending",
        category: "medical_certificate",
        exclude_from_reporting: true,
      })
      .select("id")
      .single()

    if (intakeError || !intake) {
      console.error("Failed to seed guest intake:", intakeError?.message)
      throw new Error(`Intake seed failed: ${intakeError?.message}`)
    }

    guestIntakeId = intake.id

    const { error: paidError } = await supabase
      .from("intakes")
      .update({
        payment_id: GUEST_SESSION_ID,
        status: "paid",
        payment_status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", guestIntakeId)

    if (paidError) {
      console.error("Failed to transition guest intake to paid:", paidError.message)
      throw new Error(`Intake transition failed: ${paidError.message}`)
    }

    fakeAuthUserId = await createAuthUser("primary")
    secondAuthUserId = await createAuthUser("secondary")
  })

  test.afterEach(async () => {
    // Clean up intake
    if (guestIntakeId) {
      await cleanupTestIntake(guestIntakeId)
      guestIntakeId = null
    }

    // Clean up guest profile and any leftover guest intakes
    await cleanupGuestData()
    await cleanupAuthUsers()
  })

  test("guest profile exists with null auth_user_id", async () => {
    const supabase = getSupabaseClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, auth_user_id, email, role")
      .eq("id", GUEST_PROFILE_ID)
      .single()

    expect(profile).toBeTruthy()
    expect(profile!.auth_user_id).toBeNull()
    expect(profile!.email).toBe(GUEST_EMAIL)
    expect(profile!.role).toBe("patient")
  })

  test("paid guest can continue without an account and no request capability leaks", async ({ page }) => {
    await page.goto(
      `/auth/complete-account?intake_id=${guestIntakeId}&session_id=${GUEST_SESSION_ID}`,
    )

    await expect(page.getByRole("heading", { name: "Your request is confirmed" })).toBeVisible()
    await expect(page.getByText("Optional account", { exact: true })).toBeVisible()
    await expect(page.getByText(/No account is required/i)).toBeVisible()

    await page.getByRole("button", { name: "Continue without an account" }).click()

    await expect(page).toHaveURL(/\/request\/confirmed$/)
    expect(new URL(page.url()).search).toBe("")
    await expect(page.getByRole("heading", { name: "No account needed to finish" })).toBeVisible()
    await expect(page.getByText(/email you when your request is finished/i)).toBeVisible()
    await expect(page.getByRole("link", { name: /create account/i })).toHaveCount(0)
  })

  test("a different signed-in account does not block the no-account path", async ({ page }) => {
    const login = await loginAsPatient(page)
    expect(login.success, login.error).toBe(true)

    await page.goto(
      `/auth/complete-account?intake_id=${guestIntakeId}&session_id=${GUEST_SESSION_ID}`,
    )

    await expect(page.getByRole("heading", { name: "Your request is confirmed" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Continue without an account" })).toBeEnabled()

    await page.getByRole("button", { name: "Continue without an account" }).click()
    await expect(page).toHaveURL(/\/request\/confirmed$/)
  })

  test("paid guest can request a secure account link without retyping email", async ({ page }) => {
    let otpPayload: Record<string, unknown> | null = null
    await page.route("**/auth/v1/otp**", async (route) => {
      otpPayload = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message_id: "e2e-intercepted" }),
      })
    })
    await page.goto(
      `/auth/complete-account?intake_id=${guestIntakeId}&session_id=${GUEST_SESSION_ID}`,
    )

    await page.getByRole("button", { name: "Email me a sign-in link" }).click()

    await expect(page.getByRole("status").filter({ hasText: "Check your inbox" })).toBeVisible()
    expect(otpPayload).toMatchObject({ email: GUEST_EMAIL })
    expect(page.url()).not.toContain("email=")
    await expect(page.getByRole("button", { name: "Continue without an account" })).toBeVisible()
  })

  test("account-link network failure remains retryable", async ({ page }) => {
    await page.route("**/auth/v1/otp**", async (route) => {
      await route.abort("connectionfailed")
    })
    await page.goto(
      `/auth/complete-account?intake_id=${guestIntakeId}&session_id=${GUEST_SESSION_ID}`,
    )

    await page.getByRole("button", { name: "Email me a sign-in link" }).click()

    await expect(
      page.getByText(/couldn.t send the secure link/i, { exact: false }),
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeEnabled()
    await expect(page.getByRole("button", { name: "Continue without an account" })).toBeEnabled()
  })

  test("guest profile can be linked to an auth_user_id", async () => {
    const supabase = getSupabaseClient()

    // Simulate what post-signin does: find guest profile by email + null auth_user_id, then link
    const { data: guestProfile } = await supabase
      .from("profiles")
      .select("id, auth_user_id, role")
      .ilike("email", GUEST_EMAIL)
      .is("auth_user_id", null)
      .maybeSingle()

    expect(guestProfile).toBeTruthy()
    expect(guestProfile!.auth_user_id).toBeNull()

    // Link guest profile - with the .is('auth_user_id', null) guard
    const { error: linkError } = await supabase
      .from("profiles")
      .update({
        auth_user_id: fakeAuthUserId!,
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", guestProfile!.id)
      .is("auth_user_id", null)

    expect(linkError).toBeNull()

    // Verify the profile is now linked
    const { data: linkedProfile } = await supabase
      .from("profiles")
      .select("id, auth_user_id, email_verified")
      .eq("id", GUEST_PROFILE_ID)
      .single()

    expect(linkedProfile!.auth_user_id).toBe(fakeAuthUserId)
    expect(linkedProfile!.email_verified).toBe(true)
  })

  test("linking guard prevents double-linking (race condition)", async () => {
    const supabase = getSupabaseClient()

    // First link - should succeed
    const { error: firstLinkError } = await supabase
      .from("profiles")
      .update({
        auth_user_id: fakeAuthUserId!,
        updated_at: new Date().toISOString(),
      })
      .eq("id", GUEST_PROFILE_ID)
      .is("auth_user_id", null)

    expect(firstLinkError).toBeNull()

    // Second link attempt - should NOT overwrite (0 rows matched by .is guard)
    const { data: secondLink, error: secondLinkError } = await supabase
      .from("profiles")
      .update({
        auth_user_id: secondAuthUserId!,
        updated_at: new Date().toISOString(),
      })
      .eq("id", GUEST_PROFILE_ID)
      .is("auth_user_id", null)
      .select("id")

    // No error, but 0 rows updated (guard prevented it)
    expect(secondLinkError).toBeNull()
    expect(secondLink).toHaveLength(0)

    // Verify original auth_user_id is preserved
    const { data: profile } = await supabase
      .from("profiles")
      .select("auth_user_id")
      .eq("id", GUEST_PROFILE_ID)
      .single()

    expect(profile!.auth_user_id).toBe(fakeAuthUserId)
  })

  test("guest intake is accessible after profile linking", async () => {
    const supabase = getSupabaseClient()

    // Link the guest profile
    await supabase
      .from("profiles")
      .update({
        auth_user_id: fakeAuthUserId!,
        updated_at: new Date().toISOString(),
      })
      .eq("id", GUEST_PROFILE_ID)
      .is("auth_user_id", null)

    // Verify the intake is still associated with the linked profile
    const { data: intake } = await supabase
      .from("intakes")
      .select("id, patient_id, status")
      .eq("id", guestIntakeId!)
      .single()

    expect(intake).toBeTruthy()
    expect(intake!.patient_id).toBe(GUEST_PROFILE_ID)
    expect(intake!.status).toBe("paid")

    // Verify the linked profile owns this intake
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, auth_user_id")
      .eq("id", intake!.patient_id)
      .single()

    expect(profile!.auth_user_id).toBe(fakeAuthUserId)
  })

  test("non-patient roles are not linkable", async () => {
    const supabase = getSupabaseClient()

    if (guestIntakeId) {
      await cleanupTestIntake(guestIntakeId)
      guestIntakeId = null
    }
    await cleanupGuestData()

    const { error: profileError } = await supabase.from("profiles").insert({
      id: GUEST_PROFILE_ID,
      email: GUEST_EMAIL,
      full_name: "E2E Non Patient",
      role: "doctor",
      auth_user_id: null,
      onboarding_completed: true,
      email_verified: true,
    })

    expect(profileError).toBeNull()

    // The post-signin linking code checks role === 'patient' before linking
    const { data: guestProfile } = await supabase
      .from("profiles")
      .select("id, auth_user_id, role")
      .ilike("email", GUEST_EMAIL)
      .eq("role", "patient")
      .is("auth_user_id", null)
      .maybeSingle()

    expect(guestProfile).toBeNull()
  })
})
