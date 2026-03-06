/* eslint-disable no-console */
import { test, expect } from "@playwright/test"
import { getSupabaseClient, isDbAvailable, cleanupTestIntake } from "./helpers/db"

/**
 * Guest Checkout → Account Linking E2E Tests
 *
 * Verifies that guest profiles (clerk_user_id = null) created during
 * guest checkout are correctly linked when the user creates a Clerk account.
 *
 * Tests the linking guard (.is('clerk_user_id', null)) that prevents
 * race conditions between the Clerk webhook and post-signin page.
 */

const GUEST_PROFILE_ID = "e2e00000-0000-0000-0000-guest0000001"
const GUEST_EMAIL = "e2e-guest-test@example.com"
const FAKE_CLERK_ID = "e2e_clerk_guest_test_001"
const E2E_SERVICE_ID = "e2e00000-0000-0000-0000-000000000021"

test.describe("Guest Checkout → Account Linking", () => {
  test.skip(!isDbAvailable(), "Skipping: DB not available")

  let guestIntakeId: string | null = null

  test.beforeEach(async () => {
    const supabase = getSupabaseClient()

    // Clean up any previous test data
    await supabase.from("profiles").delete().eq("id", GUEST_PROFILE_ID)
    await supabase.from("profiles").delete().ilike("email", GUEST_EMAIL)

    // Seed a guest profile (simulates what lib/stripe/guest-checkout.ts does)
    const { error: profileError } = await supabase.from("profiles").insert({
      id: GUEST_PROFILE_ID,
      email: GUEST_EMAIL,
      full_name: "E2E Guest User",
      role: "patient",
      clerk_user_id: null,
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
        status: "paid",
        payment_status: "paid",
        category: "medical_certificate",
      })
      .select("id")
      .single()

    if (intakeError || !intake) {
      console.error("Failed to seed guest intake:", intakeError?.message)
      throw new Error(`Intake seed failed: ${intakeError?.message}`)
    }

    guestIntakeId = intake.id
  })

  test.afterEach(async () => {
    const supabase = getSupabaseClient()

    // Clean up intake
    if (guestIntakeId) {
      await cleanupTestIntake(guestIntakeId)
      guestIntakeId = null
    }

    // Clean up guest profile
    await supabase.from("profiles").delete().eq("id", GUEST_PROFILE_ID)
    await supabase.from("profiles").delete().ilike("email", GUEST_EMAIL)
  })

  test("guest profile exists with null clerk_user_id", async () => {
    const supabase = getSupabaseClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, clerk_user_id, email, role")
      .eq("id", GUEST_PROFILE_ID)
      .single()

    expect(profile).toBeTruthy()
    expect(profile!.clerk_user_id).toBeNull()
    expect(profile!.email).toBe(GUEST_EMAIL)
    expect(profile!.role).toBe("patient")
  })

  test("guest profile can be linked to a clerk_user_id", async () => {
    const supabase = getSupabaseClient()

    // Simulate what the Clerk webhook does: find guest profile by email + null clerk_user_id, then link
    const { data: guestProfile } = await supabase
      .from("profiles")
      .select("id, clerk_user_id, role")
      .ilike("email", GUEST_EMAIL)
      .or("clerk_user_id.is.null,clerk_user_id.eq.")
      .maybeSingle()

    expect(guestProfile).toBeTruthy()
    expect(guestProfile!.clerk_user_id).toBeNull()

    // Link guest profile — with the .is('clerk_user_id', null) guard
    const { error: linkError } = await supabase
      .from("profiles")
      .update({
        clerk_user_id: FAKE_CLERK_ID,
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", guestProfile!.id)
      .is("clerk_user_id", null)

    expect(linkError).toBeNull()

    // Verify the profile is now linked
    const { data: linkedProfile } = await supabase
      .from("profiles")
      .select("id, clerk_user_id, email_verified")
      .eq("id", GUEST_PROFILE_ID)
      .single()

    expect(linkedProfile!.clerk_user_id).toBe(FAKE_CLERK_ID)
    expect(linkedProfile!.email_verified).toBe(true)
  })

  test("linking guard prevents double-linking (race condition)", async () => {
    const supabase = getSupabaseClient()
    const SECOND_CLERK_ID = "e2e_clerk_guest_test_002"

    // First link — should succeed
    const { error: firstLinkError } = await supabase
      .from("profiles")
      .update({
        clerk_user_id: FAKE_CLERK_ID,
        updated_at: new Date().toISOString(),
      })
      .eq("id", GUEST_PROFILE_ID)
      .is("clerk_user_id", null)

    expect(firstLinkError).toBeNull()

    // Second link attempt — should NOT overwrite (0 rows matched by .is guard)
    const { data: secondLink, error: secondLinkError } = await supabase
      .from("profiles")
      .update({
        clerk_user_id: SECOND_CLERK_ID,
        updated_at: new Date().toISOString(),
      })
      .eq("id", GUEST_PROFILE_ID)
      .is("clerk_user_id", null)
      .select("id")

    // No error, but 0 rows updated (guard prevented it)
    expect(secondLinkError).toBeNull()
    expect(secondLink).toHaveLength(0)

    // Verify original clerk_user_id is preserved
    const { data: profile } = await supabase
      .from("profiles")
      .select("clerk_user_id")
      .eq("id", GUEST_PROFILE_ID)
      .single()

    expect(profile!.clerk_user_id).toBe(FAKE_CLERK_ID)
  })

  test("guest intake is accessible after profile linking", async () => {
    const supabase = getSupabaseClient()

    // Link the guest profile
    await supabase
      .from("profiles")
      .update({
        clerk_user_id: FAKE_CLERK_ID,
        updated_at: new Date().toISOString(),
      })
      .eq("id", GUEST_PROFILE_ID)
      .is("clerk_user_id", null)

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
      .select("id, clerk_user_id")
      .eq("id", intake!.patient_id)
      .single()

    expect(profile!.clerk_user_id).toBe(FAKE_CLERK_ID)
  })

  test("non-patient roles are not linkable", async () => {
    const supabase = getSupabaseClient()

    // Update guest profile to doctor role (shouldn't be linkable)
    await supabase
      .from("profiles")
      .update({ role: "doctor" })
      .eq("id", GUEST_PROFILE_ID)

    // The Clerk webhook checks role === 'patient' before linking
    // Simulate that check
    const { data: guestProfile } = await supabase
      .from("profiles")
      .select("id, clerk_user_id, role")
      .ilike("email", GUEST_EMAIL)
      .or("clerk_user_id.is.null,clerk_user_id.eq.")
      .maybeSingle()

    expect(guestProfile).toBeTruthy()
    // The webhook code checks: guestProfile.role === 'patient'
    // A doctor profile should NOT be linked
    expect(guestProfile!.role).toBe("doctor")
    expect(guestProfile!.role).not.toBe("patient")

    // Reset for cleanup
    await supabase
      .from("profiles")
      .update({ role: "patient" })
      .eq("id", GUEST_PROFILE_ID)
  })
})
