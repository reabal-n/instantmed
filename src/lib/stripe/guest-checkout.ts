"use server"

import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

// Initialize Stripe lazily
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }
  return new Stripe(key)
}

export type ServiceCategory = "medical_certificate" | "prescription" | "referral"

interface GuestCheckoutInput {
  category: ServiceCategory
  subtype: string
  type: string
  answers: Record<string, unknown>
  guestEmail: string
  guestName?: string
}

interface CheckoutResult {
  success: boolean
  checkoutUrl?: string
  error?: string
}

// Service role client to bypass RLS
function getServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase credentials")
  }

  return createClient(supabaseUrl, serviceKey)
}

function getBaseUrl(): string {
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!baseUrl && process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`
  }

  if (!baseUrl) {
    baseUrl = "http://localhost:3000"
  }

  return baseUrl.replace(/\/$/, "")
}

/**
 * Get the correct Stripe price ID based on request category
 */
function getPriceIdForRequest(category: ServiceCategory): string {
  if (category === "medical_certificate") {
    const priceId = process.env.STRIPE_PRICE_MEDCERT
    if (!priceId) {
      throw new Error("Missing STRIPE_PRICE_MEDCERT environment variable")
    }
    return priceId
  }

  if (category === "prescription") {
    const priceId = process.env.STRIPE_PRICE_PRESCRIPTION
    if (!priceId) {
      throw new Error("Missing STRIPE_PRICE_PRESCRIPTION environment variable")
    }
    return priceId
  }

  if (category === "referral") {
    const priceId = process.env.STRIPE_PRICE_PATHOLOGY_BLOODS
    if (!priceId) {
      throw new Error("Missing STRIPE_PRICE_PATHOLOGY_BLOODS environment variable")
    }
    return priceId
  }

  throw new Error(`Unknown category: ${category}`)
}

/**
 * Create a guest checkout session without requiring authentication
 * Creates a minimal guest profile, request, and Stripe checkout
 */
export async function createGuestCheckoutAction(input: GuestCheckoutInput): Promise<CheckoutResult> {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(input.guestEmail)) {
      console.error("[Guest Checkout] Invalid email format:", input.guestEmail)
      return { success: false, error: "Please provide a valid email address." }
    }

    console.log("[Guest Checkout] Starting checkout for:", input.guestEmail)

    const stripe = getStripe()
    const supabase = getServiceClient()
    const baseUrl = getBaseUrl()

    // 1. Check if a guest profile already exists for this email
    let guestProfileId: string

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, auth_user_id")
      .eq("email", input.guestEmail.toLowerCase().trim())
      .is("auth_user_id", null) // Guest profiles have no auth yet
      .single()

    if (existingProfile) {
      guestProfileId = existingProfile.id
      console.log("[Guest Checkout] Reusing existing guest profile:", guestProfileId)
    } else {
      const normalizedEmail = input.guestEmail.toLowerCase().trim()
      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          email: normalizedEmail,
          full_name: input.guestName || normalizedEmail.split("@")[0],
          auth_user_id: null,
          role: "patient",
          onboarding_completed: false,
        })
        .select()
        .single()

      if (profileError || !newProfile) {
        console.error("[Guest Checkout] Error creating guest profile:", {
          error: profileError,
          email: normalizedEmail,
        })
        return { success: false, error: "Failed to create guest profile. Please try again." }
      }

      guestProfileId = newProfile.id
      console.log("[Guest Checkout] Created new guest profile:", guestProfileId)
    }

    // 2. Create the request with pending_payment status
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .insert({
        patient_id: guestProfileId,
        type: input.type,
        status: "draft",
        category: input.category,
        subtype: input.subtype,
        paid: false,
        payment_status: "pending_payment",
      })
      .select()
      .single()

    if (requestError || !request) {
      console.error("[Guest Checkout] Error creating request:", requestError)
      return { success: false, error: "Failed to create your request. Please try again." }
    }

    console.log("[Guest Checkout] Created request:", request.id)

    // 3. Insert the answers
    const { error: answersError } = await supabase.from("request_answers").insert({
      request_id: request.id,
      answers: input.answers,
    })

    if (answersError) {
      console.error("[Guest Checkout] Error creating answers:", answersError)
    }

    // 4. Get the price ID
    const priceId = getPriceIdForRequest(input.category)

    // 5. Build success and cancel URLs
    const successUrl = `${baseUrl}/auth/complete-account?request_id=${request.id}&email=${encodeURIComponent(input.guestEmail)}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/request-cancelled?request_id=${request.id}`

    // 6. Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: input.guestEmail,
      customer_creation: "always",
      metadata: {
        request_id: request.id,
        patient_id: guestProfileId,
        category: input.category,
        subtype: input.subtype,
        guest_checkout: "true",
        guest_email: input.guestEmail,
      },
    })

    if (!session.url) {
      await supabase.from("requests").delete().eq("id", request.id)
      return { success: false, error: "Failed to create checkout session. Please try again." }
    }

    // 7. Create payment record
    const { error: paymentError } = await supabase.from("payments").insert({
      request_id: request.id,
      stripe_session_id: session.id,
      amount: session.amount_total || 0,
      currency: session.currency || "aud",
      status: "created",
    })

    if (paymentError) {
      console.error("[Guest Checkout] Error creating payment record:", paymentError)
    }

    // 8. Track the active checkout session on the request
    await supabase
      .from("requests")
      .update({ active_checkout_session_id: session.id })
      .eq("id", request.id)

    console.log("[Guest Checkout] Session created:", {
      requestId: request.id,
      sessionId: session.id,
      email: input.guestEmail,
    })

    return { success: true, checkoutUrl: session.url }
  } catch (error) {
    console.error("[Guest Checkout] Error in createGuestCheckoutAction:", error)
    return {
      success: false,
      error: "Something went wrong. Please try again or contact support if the problem persists.",
    }
  }
}
