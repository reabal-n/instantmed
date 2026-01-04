"use server"
import { createLogger } from "@/lib/observability/logger"
import { createClient } from "@/lib/supabase/server"
import { clerkClient } from "@clerk/nextjs/server"
import { isTestMode } from "@/lib/test-mode"

const log = createLogger("test-actions")

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
    log.error("Error creating test request", { patientId }, requestError)
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
    log.error("Error creating test answers", { requestId: request.id }, answersError)
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
      log.error("Error creating test payment", { requestId: request.id }, paymentError)
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
    log.error("Error skipping payment", { requestId }, updateError)
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
    log.error("Error creating skip payment record", { requestId }, paymentError)
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

  // First, find if a user exists with this email via Clerk
  const client = await clerkClient()
  const users = await client.users.getUserList({ emailAddress: [adminEmail] })
  const adminUser = users.data[0]

  if (!adminUser) {
    return {
      success: false,
      message: `No user found with email ${adminEmail}. Please sign up first, then run bootstrap.`,
    }
  }

  // Check if profile exists using clerk_user_id
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", adminUser.id)
    .single()

  if (existingProfile) {
    // Update to doctor/admin
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        role: "doctor",
      })
      .eq("clerk_user_id", adminUser.id)

    if (updateError) {
      return { success: false, message: `Failed to update profile: ${updateError.message}` }
    }

    return { success: true, message: `Updated ${adminEmail} to doctor role` }
  }

  // Create profile if doesn't exist
  const { error: insertError } = await supabase.from("profiles").insert({
    clerk_user_id: adminUser.id,
    email: adminEmail,
    full_name: "Dr. Admin",
    role: "doctor",
    onboarding_completed: true,
  })

  if (insertError) {
    return { success: false, message: `Failed to create profile: ${insertError.message}` }
  }

  return { success: true, message: `Created doctor profile for ${adminEmail}` }
}
