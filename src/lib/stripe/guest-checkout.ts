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

  console.log("[Guest Checkout v2] Supabase URL exists:", !!supabaseUrl)
  console.log("[Guest Checkout v2] Service key exists:", !!serviceKey)

  if (!supabaseUrl || !serviceKey) {
    console.error("[Guest Checkout v3] Missing credentials - URL:", !!supabaseUrl, "Key:", !!serviceKey)
    throw new Error(`ENV ERROR: URL=${!!supabaseUrl} KEY=${!!serviceKey}`)
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
      console.error("[Guest Checkout v2] Invalid email format:", input.guestEmail)
      return { success: false, error: "Please provide a valid email address." }
    }

    console.log("[Guest Checkout v2] Starting checkout for:", input.guestEmail)
    console.log("[Guest Checkout v2] Service role key exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    const stripe = getStripe()
    const supabase = getServiceClient()
    const baseUrl = getBaseUrl()

    // 1. Check if a profile already exists for this email
    const normalizedEmail = input.guestEmail.toLowerCase().trim()
    let guestProfileId: string

    // First check if an authenticated profile exists (user already has account)
    const { data: existingAuthProfile } = await supabase
      .from("profiles")
      .select("id, auth_user_id")
      .eq("email", normalizedEmail)
      .not("auth_user_id", "is", null)
      .single()

    if (existingAuthProfile) {
      // User already has an account - they should sign in instead
      console.log("[Guest Checkout] Email already has authenticated account:", normalizedEmail)
      return { 
        success: false, 
        error: "An account already exists with this email. Please sign in to continue." 
      }
    }

    // Check for existing guest profile
    const { data: existingGuestProfile } = await supabase
      .from("profiles")
      .select("id, auth_user_id")
      .eq("email", normalizedEmail)
      .is("auth_user_id", null)
      .single()

    if (existingGuestProfile) {
      // Reuse existing guest profile
      guestProfileId = existingGuestProfile.id
      console.log("[Guest Checkout] Reusing existing guest profile:", guestProfileId)
    } else {
      // Create a new guest profile
      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          email: normalizedEmail,
          full_name: input.guestName || normalizedEmail.split("@")[0],
          auth_user_id: null, // Guest profile - will be linked after account creation
          role: "patient",
        })
        .select()
        .single()

      if (profileError || !newProfile) {
        const errorCode = (profileError as any)?.code
        const errorMessage = (profileError as any)?.message || "Unknown error"
        const errorDetails = (profileError as any)?.details
        const errorHint = (profileError as any)?.hint
        
        console.error("[Guest Checkout] Error creating guest profile:", {
          error: profileError,
          code: errorCode,
          message: errorMessage,
          details: errorDetails,
          hint: errorHint,
          email: normalizedEmail,
        })
        
        // Check if it's a constraint violation (email already exists with auth)
        if (errorCode === '23505') {
          return { 
            success: false, 
            error: "An account already exists with this email. Please sign in to continue." 
          }
        }
        
        // Check for NOT NULL violation (should not happen if migration applied correctly)
        if (errorCode === '23502') {
          console.error("[Guest Checkout v3] NOT NULL constraint violation:", errorMessage)
          return { 
            success: false, 
            error: `NOT NULL error: ${errorMessage}` 
          }
        }
        
        // Return actual error message for debugging
        return { success: false, error: `Profile error (${errorCode}): ${errorMessage}` }
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
    console.error("[Guest Checkout v3] Error in createGuestCheckoutAction:", error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: `Checkout error: ${errorMsg}`,
    }
  }
}
