"use server"
import { logger } from "@/lib/logger"

import { createClient } from "@/lib/supabase/server"
import { isTestMode } from "@/lib/test-mode"

interface TestRequestResult {
  success: boolean
  requestId?: string
  error?: string
}

/**
 * Create a test request - only works in test mode
 */
export async function createTestRequest(patientId: string, paid = false): Promise<TestRequestResult> {
  // Security gate - never allow in production
  if (!isTestMode) {
    return { success: false, error: "Test actions are not available in production" }
  }

  const supabase = await createClient()

  // Create the request
  const { data: request, error: requestError } = await supabase
    .from("requests")
    .insert({
      patient_id: patientId,
      type: "medical_certificate",
      status: paid ? "pending" : "awaiting_review",
      category: "medical_certificate",
      subtype: "work",
      paid: paid,
      payment_status: paid ? "paid_test" : "pending_payment",
    })
    .select()
    .single()

  if (requestError || !request) {
    logger.error("Error creating test request", { error: String(requestError) })
    return { success: false, error: requestError?.message || "Failed to create request" }
  }

  // Insert test answers
  const { error: answersError } = await supabase.from("request_answers").insert({
    request_id: request.id,
    answers: {
      certType: "work",
      duration: "2 days",
      symptoms: ["Cold/flu", "Headache"],
      notes: "Test request created via Test Tools",
      source: "test_tools",
    },
  })

  if (answersError) {
    logger.error("Error creating test answers", { error: String(answersError) })
  }

  // If paid, create a mock payment record
  if (paid) {
    const { error: paymentError } = await supabase.from("payments").insert({
      request_id: request.id,
      amount: 0,
      amount_paid: 0,
      currency: "aud",
      status: "paid_test",
      stripe_session_id: `test_session_${Date.now()}`,
      stripe_payment_intent_id: `test_pi_${Date.now()}`,
    })

    if (paymentError) {
      logger.error("Error creating test payment", { error: String(paymentError) })
    }
  }

  return { success: true, requestId: request.id }
}

/**
 * Skip payment for a request - only works in test mode
 */
export async function skipPaymentTestMode(requestId: string): Promise<TestRequestResult> {
  // Security gate
  if (!isTestMode) {
    return { success: false, error: "Test actions are not available in production" }
  }

  const supabase = await createClient()

  // Update request to paid_test status
  const { error: updateError } = await supabase
    .from("requests")
    .update({
      paid: true,
      payment_status: "paid_test",
      status: "pending",
    })
    .eq("id", requestId)

  if (updateError) {
    logger.error("Error skipping payment", { error: String(updateError) })
    return { success: false, error: updateError.message }
  }

  // Create mock payment record
  const { error: paymentError } = await supabase.from("payments").insert({
    request_id: requestId,
    amount: 0,
    amount_paid: 0,
    currency: "aud",
    status: "paid_test",
    stripe_session_id: `test_skip_${Date.now()}`,
    stripe_payment_intent_id: `test_skip_pi_${Date.now()}`,
  })

  if (paymentError) {
    logger.error("Error creating skip payment record", { error: String(paymentError) })
  }

  return { success: true, requestId }
}

/**
 * Bootstrap admin user - only works in test mode
 */
export async function bootstrapAdminUser(): Promise<{ success: boolean; message: string }> {
  // Security gate
  if (!isTestMode) {
    return { success: false, message: "Bootstrap is not available in production" }
  }

  const supabase = await createClient()
  const adminEmail = "me@reabal.ai"

  // First, find if a profile exists with this email via auth
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const adminAuthUser = authUsers?.users?.find((u) => u.email === adminEmail)

  if (!adminAuthUser) {
    return {
      success: false,
      message: `No auth user found with email ${adminEmail}. Please sign up first, then run bootstrap.`,
    }
  }

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", adminAuthUser.id)
    .single()

  if (existingProfile) {
    // Update to doctor/admin
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        role: "doctor",
      })
      .eq("auth_user_id", adminAuthUser.id)

    if (updateError) {
      return { success: false, message: `Failed to update profile: ${updateError.message}` }
    }

    return { success: true, message: `Updated ${adminEmail} to doctor role` }
  }

  // Create profile if doesn't exist
  const { error: insertError } = await supabase.from("profiles").insert({
    auth_user_id: adminAuthUser.id,
    full_name: "Dr. Admin",
    role: "doctor",
    onboarding_completed: true,
  })

  if (insertError) {
    return { success: false, message: `Failed to create profile: ${insertError.message}` }
  }

  return { success: true, message: `Created doctor profile for ${adminEmail}` }
}
