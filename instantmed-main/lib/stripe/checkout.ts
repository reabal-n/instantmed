"use server"

import type Stripe from "stripe"
import { stripe, getPriceIdForRequest, type ServiceCategory } from "./client"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"

interface CreateCheckoutInput {
  category: ServiceCategory
  subtype: string
  type: string
  answers: Record<string, unknown>
}

interface CheckoutResult {
  success: boolean
  checkoutUrl?: string
  error?: string
}

/**
 * Check if test mode is enabled
 * Test mode allows bypassing Stripe for testing the flow
 */
function isTestModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === "true"
}

function getBaseUrl(): string {
  // Try NEXT_PUBLIC_SITE_URL first
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL

  // Fallback to VERCEL_URL for Vercel deployments
  if (!baseUrl && process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`
  }

  // Final fallback to localhost
  if (!baseUrl) {
    baseUrl = "http://localhost:3000"
  }

  // Ensure URL doesn't have trailing slash
  return baseUrl.replace(/\/$/, "")
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Create a request and Stripe checkout session
 * Now links Stripe customer to profile and uses existing customer if available
 */
export async function createRequestAndCheckoutAction(input: CreateCheckoutInput): Promise<CheckoutResult> {
  try {
    // 1. Get authenticated user
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { success: false, error: "You must be logged in to submit a request" }
    }

    const patientId = authUser.profile.id
    const patientEmail = authUser.user.email

    // 2. Get the Supabase client
    const supabase = await createClient()

    const baseUrl = getBaseUrl()
    if (!isValidUrl(baseUrl)) {
      console.error("Invalid base URL configuration:", baseUrl)
      return { success: false, error: "Server configuration error. Please contact support." }
    }

    // 3. Create the request with pending_payment status
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .insert({
        patient_id: patientId,
        type: input.type,
        status: "pending",
        category: input.category,
        subtype: input.subtype,
        paid: false,
        payment_status: "pending_payment",
      })
      .select()
      .single()

    if (requestError || !request) {
      console.error("Error creating request:", requestError)
      if (requestError?.code === "23503") {
        return { success: false, error: "Your profile could not be found. Please sign out and sign in again." }
      }
      if (requestError?.code === "42501") {
        return { success: false, error: "You don't have permission to create requests. Please contact support." }
      }
      return { success: false, error: "Failed to create your request. Please try again." }
    }

    // 4. Insert the answers
    const { error: answersError } = await supabase.from("request_answers").insert({
      request_id: request.id,
      answers: input.answers,
    })

    if (answersError) {
      console.error("Error creating answers:", answersError)
      // Don't fail the whole request, answers are supplementary
    }

    // 5. Get the price ID
    const priceId = getPriceIdForRequest({
      category: input.category,
      subtype: input.subtype,
      answers: input.answers,
    })

    if (!priceId) {
      console.error("No price ID found for:", input.category, input.subtype)
      // Clean up the created request
      await supabase.from("requests").delete().eq("id", request.id)
      return { success: false, error: "Unable to determine pricing. Please contact support." }
    }

    // 6. Build success and cancel URLs with validation
    const successUrl = `${baseUrl}/patient/requests/success?request_id=${request.id}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/patient/requests/cancelled?request_id=${request.id}`

    // 7. Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        request_id: request.id,
        patient_id: patientId,
        category: input.category,
        subtype: input.subtype,
      },
    }

    if (authUser.profile.stripe_customer_id) {
      sessionParams.customer = authUser.profile.stripe_customer_id
    } else {
      sessionParams.customer_email = patientEmail || undefined
      sessionParams.customer_creation = "always" // Always create a customer for new users
    }

    // 8. Create Stripe checkout session
    let session
    try {
      session = await stripe.checkout.sessions.create(sessionParams)
    } catch (stripeError: unknown) {
      console.error("Stripe error:", stripeError)
      await supabase.from("requests").delete().eq("id", request.id)

      if (stripeError instanceof Error) {
        if (stripeError.message.includes("Invalid URL")) {
          return { success: false, error: "Server configuration error. Please contact support." }
        }
        if (stripeError.message.includes("No such price")) {
          return { success: false, error: "This service is temporarily unavailable. Please try again later." }
        }
      }
      return { success: false, error: "Payment system error. Please try again." }
    }

    if (!session.url) {
      // Clean up
      await supabase.from("requests").delete().eq("id", request.id)
      return { success: false, error: "Failed to create checkout session. Please try again." }
    }

    // 9. Create payment record
    const { error: paymentError } = await supabase.from("payments").insert({
      request_id: request.id,
      stripe_session_id: session.id,
      amount: session.amount_total || 0,
      currency: session.currency || "aud",
      status: "created",
    })

    if (paymentError) {
      console.error("Error creating payment record:", paymentError)
      // Don't fail - the payment record is for tracking, Stripe is the source of truth
    }

    return { success: true, checkoutUrl: session.url }
  } catch (error) {
    console.error("Error in createRequestAndCheckoutAction:", error)
    return {
      success: false,
      error: "Something went wrong. Please try again or contact support if the problem persists.",
    }
  }
}

/**
 * Create a request with test payment (bypasses Stripe)
 * Only available when NEXT_PUBLIC_ENABLE_TEST_MODE is true
 * This directly marks the request as paid and redirects to success
 */
export async function createTestRequestAction(input: CreateCheckoutInput): Promise<CheckoutResult> {
  // Double-check test mode is enabled (server-side validation)
  if (!isTestModeEnabled()) {
    return { success: false, error: "Test mode is not enabled" }
  }

  try {
    // 1. Get authenticated user
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { success: false, error: "You must be logged in to submit a request" }
    }

    const patientId = authUser.profile.id

    // 2. Get the Supabase client
    const supabase = await createClient()

    const baseUrl = getBaseUrl()
    if (!isValidUrl(baseUrl)) {
      console.error("Invalid base URL configuration:", baseUrl)
      return { success: false, error: "Server configuration error. Please contact support." }
    }

    // 3. Create the request with PAID status (bypassing payment)
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .insert({
        patient_id: patientId,
        type: input.type,
        status: "pending", // Visible to doctors immediately
        category: input.category,
        subtype: input.subtype,
        paid: true, // Mark as paid immediately
        payment_status: "paid", // Skip payment step
      })
      .select()
      .single()

    if (requestError || !request) {
      console.error("Error creating test request:", requestError)
      if (requestError?.code === "23503") {
        return { success: false, error: "Your profile could not be found. Please sign out and sign in again." }
      }
      if (requestError?.code === "42501") {
        return { success: false, error: "You don't have permission to create requests. Please contact support." }
      }
      return { success: false, error: "Failed to create your request. Please try again." }
    }

    // 4. Insert the answers
    const { error: answersError } = await supabase.from("request_answers").insert({
      request_id: request.id,
      answers: input.answers,
    })

    if (answersError) {
      console.error("Error creating answers:", answersError)
      // Don't fail the whole request, answers are supplementary
    }

    // 5. Create a test payment record
    const { error: paymentError } = await supabase.from("payments").insert({
      request_id: request.id,
      stripe_session_id: `test_session_${Date.now()}`,
      amount: 1999, // $19.99 in cents
      currency: "aud",
      status: "paid",
    })

    if (paymentError) {
      console.error("Error creating test payment record:", paymentError)
      // Don't fail - the payment record is for tracking
    }

    // 6. Return success URL (same as real payment success)
    const successUrl = `${baseUrl}/patient/requests/success?request_id=${request.id}&session_id=test_session&test_mode=true`
    
    return { success: true, checkoutUrl: successUrl }
  } catch (error) {
    console.error("Error in createTestRequestAction:", error)
    return {
      success: false,
      error: "Something went wrong. Please try again or contact support if the problem persists.",
    }
  }
}

/**
 * Retry payment for an existing request with pending_payment status
 * Now uses existing Stripe customer if available
 */
export async function retryPaymentForRequestAction(requestId: string): Promise<CheckoutResult> {
  try {
    // 1. Get authenticated user
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { success: false, error: "You must be logged in" }
    }

    const patientId = authUser.profile.id
    const patientEmail = authUser.user.email

    // 2. Get the Supabase client
    const supabase = await createClient()

    // 3. Fetch the existing request with ownership check
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("*")
      .eq("id", requestId)
      .eq("patient_id", patientId)
      .single()

    if (requestError || !request) {
      console.error("Error fetching request for retry:", requestError)
      return { success: false, error: "Request not found" }
    }

    // 4. Verify the request is in pending_payment status
    if (request.payment_status !== "pending_payment") {
      return { success: false, error: "This request has already been paid or is not awaiting payment" }
    }

    // 5. Get the price ID using existing request data
    const priceId = getPriceIdForRequest({
      category: request.category as ServiceCategory,
      subtype: request.subtype || "",
      answers: {},
    })

    // 6. Get base URL for redirects
    const baseUrl = getBaseUrl()
    if (!isValidUrl(baseUrl)) {
      console.error("Invalid base URL configuration:", baseUrl)
      return { success: false, error: "Server configuration error. Please contact support." }
    }

    // 7. Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/patient/requests/success?request_id=${request.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/patient/requests/cancelled?request_id=${request.id}`,
      metadata: {
        request_id: request.id,
        patient_id: patientId,
        category: request.category || "",
        subtype: request.subtype || "",
        is_retry: "true",
      },
    }

    if (authUser.profile.stripe_customer_id) {
      sessionParams.customer = authUser.profile.stripe_customer_id
    } else {
      sessionParams.customer_email = patientEmail || undefined
      sessionParams.customer_creation = "always"
    }

    // 8. Create new Stripe checkout session for retry
    let session
    try {
      session = await stripe.checkout.sessions.create(sessionParams)
    } catch (stripeError: unknown) {
      console.error("Stripe error:", stripeError)
      await supabase.from("requests").delete().eq("id", request.id)

      if (stripeError instanceof Error) {
        if (stripeError.message.includes("Invalid URL")) {
          return { success: false, error: "Server configuration error. Please contact support." }
        }
        if (stripeError.message.includes("No such price")) {
          return { success: false, error: "This service is temporarily unavailable. Please try again later." }
        }
      }
      return { success: false, error: "Payment system error. Please try again." }
    }

    if (!session.url) {
      // Clean up
      await supabase.from("requests").delete().eq("id", request.id)
      return { success: false, error: "Failed to create checkout session. Please try again." }
    }

    // 9. Update or insert payment record for this new session
    const { error: paymentError } = await supabase.from("payments").upsert(
      {
        request_id: request.id,
        stripe_session_id: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || "aud",
        status: "created",
      },
      {
        onConflict: "request_id",
      },
    )

    if (paymentError) {
      console.error("Error updating payment record:", paymentError)
      // Don't fail - the payment record is for tracking, Stripe is the source of truth
    }

    return { success: true, checkoutUrl: session.url }
  } catch (error) {
    console.error("Error in retryPaymentForRequestAction:", error)
    return {
      success: false,
      error: "Something went wrong. Please try again or contact support if the problem persists.",
    }
  }
}
