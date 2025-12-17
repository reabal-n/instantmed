"use server"

import { stripe, getPriceIdForRequest, type ServiceCategory } from "./client"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"

interface CreateCheckoutInput {
  category: ServiceCategory
  subtype: string
  type: string
  answers: Record<string, unknown>
  patientId?: string // Optional - passed from client when already authenticated
  patientEmail?: string // Optional - passed from client when already authenticated
}

interface CheckoutResult {
  success: boolean
  checkoutUrl?: string
  error?: string
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

    // 2. Get the Supabase client (use service role for reliability)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      console.error("Missing Supabase credentials")
      return { success: false, error: "Server configuration error" }
    }
    
    const { createClient: createServiceClient } = await import("@supabase/supabase-js")
    const supabase = createServiceClient(supabaseUrl, serviceKey)

    // 3. Assert profile exists - create if missing (server-side)
    let patientId: string
    if (authUser.profile?.id) {
      patientId = authUser.profile.id
      console.log("[Checkout] Profile exists:", patientId)
    } else {
      console.log("[Checkout] Profile missing, creating server-side")
      const { ensureProfile } = await import("@/app/actions/ensure-profile")
      const { profileId, error: profileError } = await ensureProfile(
        authUser.user.id,
        authUser.user.email || ""
      )
      
      if (profileError || !profileId) {
        console.error("[Checkout] Failed to create profile:", profileError)
        return { success: false, error: `Profile creation failed: ${profileError || "Unknown error"}` }
      }
      
      patientId = profileId
      console.log("[Checkout] Profile created:", patientId)
    }

    const patientEmail = authUser.user.email || undefined
    const stripeCustomerId = authUser.profile?.stripe_customer_id || undefined

    const baseUrl = getBaseUrl()
    if (!isValidUrl(baseUrl)) {
      console.error("Invalid base URL configuration:", baseUrl)
      return { success: false, error: "Server configuration error. Please contact support." }
    }

    // 4. Create the request with pending_payment status
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

    // 5. Insert the answers
    const { error: answersError } = await supabase.from("request_answers").insert({
      request_id: request.id,
      answers: input.answers,
    })

    if (answersError) {
      console.error("Error creating answers:", answersError)
      // Don't fail the whole request, answers are supplementary
    }

    // 6. Get the price ID
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

    // 7. Build success and cancel URLs with validation
    const successUrl = `${baseUrl}/patient/requests/success?request_id=${request.id}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/patient/requests/cancelled?request_id=${request.id}`

    // 8. Build checkout session params
    const sessionParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment" as const,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        request_id: request.id,
        patient_id: patientId,
        category: input.category,
        subtype: input.subtype,
      },
      customer: stripeCustomerId || undefined,
      customer_email: !stripeCustomerId && patientEmail ? patientEmail : undefined,
      customer_creation: !stripeCustomerId && patientEmail ? "always" as const : undefined,
    }

    // 9. Create Stripe checkout session
    let session
    try {
      session = await stripe.checkout.sessions.create(sessionParams)
    } catch (stripeError: unknown) {
      console.error("Stripe error:", stripeError)
      await supabase.from("requests").delete().eq("id", request.id)

      const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError)
      console.error("[Checkout] Stripe error details:", { message: errorMessage, baseUrl, successUrl, cancelUrl })

      // Check for URL-related errors
      if (errorMessage.toLowerCase().includes("url") || errorMessage.includes("Invalid") || errorMessage.includes("valid")) {
        return { success: false, error: `Server configuration error: ${errorMessage}` }
      }
      if (errorMessage.includes("No such price")) {
        return { success: false, error: "This service is temporarily unavailable. Please try again later." }
      }
      return { success: false, error: `Payment system error: ${errorMessage}` }
    }

    if (!session.url) {
      // Clean up
      await supabase.from("requests").delete().eq("id", request.id)
      return { success: false, error: "Failed to create checkout session. Please try again." }
    }

    // 10. Create payment record
    const { error: paymentError } = await supabase.from("payments").insert({
      request_id: request.id,
      stripe_session_id: session.id,
      amount: session.amount_total || 0,
      currency: session.currency || "aud",
      status: "created",
    })

    if (paymentError) {
      console.error("[Checkout] Error creating payment record:", paymentError)
      // Don't fail - the payment record is for tracking, Stripe is the source of truth
    }

    // 10. Track the active checkout session on the request
    await supabase
      .from("requests")
      .update({ active_checkout_session_id: session.id })
      .eq("id", request.id)

    console.log("[Checkout] Session created:", {
      requestId: request.id,
      sessionId: session.id,
      category: input.category,
      subtype: input.subtype,
    })

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

    // 2. Get the Supabase service client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      return { success: false, error: "Server configuration error" }
    }
    
    const { createClient: createServiceClient } = await import("@supabase/supabase-js")
    const supabase = createServiceClient(supabaseUrl, serviceKey)

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
    const sessionParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment" as const,
      success_url: `${baseUrl}/patient/requests/success?request_id=${request.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/patient/requests/cancelled?request_id=${request.id}`,
      metadata: {
        request_id: request.id,
        patient_id: patientId,
        category: request.category || "",
        subtype: request.subtype || "",
        is_retry: "true",
      },
      customer: authUser.profile.stripe_customer_id || undefined,
      customer_email: !authUser.profile.stripe_customer_id && patientEmail ? patientEmail : undefined,
      customer_creation: !authUser.profile.stripe_customer_id && patientEmail ? "always" as const : undefined,
    }

    // 8. Create new Stripe checkout session for retry
    let session
    try {
      session = await stripe.checkout.sessions.create(sessionParams)
    } catch (stripeError: unknown) {
      // IMPORTANT: Do NOT delete the request on retry - user's data must be preserved
      console.error("[Stripe Retry] Checkout session creation failed:", {
        requestId: request.id,
        error: stripeError instanceof Error ? stripeError.message : "Unknown error",
      })

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
      // Do NOT delete request - it's a retry, the original data must be preserved
      console.error("[Stripe Retry] No checkout URL returned for request:", request.id)
      return { success: false, error: "Failed to create checkout session. Please try again." }
    }

    // 9. Create a new payment record for the retry session
    // Don't use upsert - each session should have its own payment record
    // The old payment record stays as 'expired' for audit trail
    const { error: paymentError } = await supabase.from("payments").insert({
      request_id: request.id,
      stripe_session_id: session.id,
      amount: session.amount_total || 0,
      currency: session.currency || "aud",
      status: "created",
    })

    if (paymentError) {
      // If unique constraint violation on stripe_session_id, that's expected (shouldn't happen)
      if (paymentError.code !== "23505") {
        console.error("[Checkout Retry] Error creating payment record:", paymentError)
      }
      // Don't fail - the payment record is for tracking, Stripe is the source of truth
    }

    // 10. Track the active checkout session on the request
    await supabase
      .from("requests")
      .update({ active_checkout_session_id: session.id })
      .eq("id", request.id)

    console.log("[Checkout Retry] New session created:", {
      requestId: request.id,
      sessionId: session.id,
      isRetry: true,
    })

    return { success: true, checkoutUrl: session.url }
  } catch (error) {
    console.error("Error in retryPaymentForRequestAction:", error)
    return {
      success: false,
      error: "Something went wrong. Please try again or contact support if the problem persists.",
    }
  }
}
