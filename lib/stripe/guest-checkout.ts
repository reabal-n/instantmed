"use server"

import { stripe, getPriceIdForRequest, type ServiceCategory } from "./client"
import { createClient } from "@supabase/supabase-js"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"

interface GuestCheckoutInput {
  category: ServiceCategory
  subtype: string
  type: string
  answers: Record<string, unknown>
  guestEmail: string
  guestName?: string
  guestDateOfBirth?: string
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
 * Create a guest checkout session without requiring authentication
 * Creates a minimal guest profile, request, and Stripe checkout
 */
export async function createGuestCheckoutAction(input: GuestCheckoutInput): Promise<CheckoutResult> {
  try {
    // Server-side validation for repeat scripts using canonical schema
    if (input.category === "prescription" && input.subtype === "repeat") {
      const validation = validateRepeatScriptPayload(input.answers)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || "Invalid repeat script request.",
        }
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(input.guestEmail)) {
      return { success: false, error: "Please provide a valid email address." }
    }

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
    } else {
      // Create a new guest profile
      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          email: normalizedEmail,
          full_name: input.guestName || normalizedEmail.split("@")[0],
          date_of_birth: input.guestDateOfBirth || null,
          auth_user_id: null, // Guest profile - will be linked after account creation
          role: "patient",
        })
        .select()
        .single()

      if (profileError || !newProfile) {
        const pgError = profileError as { code?: string; message?: string } | null
        
        // Check if it's a constraint violation (email already exists with auth)
        if (pgError?.code === '23505') {
          return { 
            success: false, 
            error: "An account already exists with this email. Please sign in to continue." 
          }
        }
        
        return { success: false, error: "Failed to create guest profile. Please try again." }
      }

      guestProfileId = newProfile.id
    }

    // 2. Create the request with pending_payment status
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .insert({
        patient_id: guestProfileId,
        type: input.type,
        status: "draft", // Draft until paid
        category: input.category,
        subtype: input.subtype,
        paid: false,
        payment_status: "pending_payment",
      })
      .select()
      .single()

    if (requestError || !request) {
      return { success: false, error: "Failed to create your request. Please try again." }
    }

    // 3. Insert the answers
    const { error: answersError } = await supabase.from("request_answers").insert({
      request_id: request.id,
      answers: input.answers,
    })

    if (answersError) {
      // Don't fail - answers are supplementary
    }

    // 4. Get the price ID
    const priceId = getPriceIdForRequest({
      category: input.category,
      subtype: input.subtype,
      answers: input.answers,
    })

    if (!priceId) {
      await supabase.from("requests").delete().eq("id", request.id)
      return { success: false, error: "Unable to determine pricing. Please contact support." }
    }

    // 5. Build success and cancel URLs
    const successUrl = `${baseUrl}/auth/complete-account?request_id=${request.id}&email=${encodeURIComponent(input.guestEmail)}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/patient/requests/cancelled?request_id=${request.id}`

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
      // Don't fail - Stripe is the source of truth
    }

    // 8. Track the active checkout session on the request
    await supabase
      .from("requests")
      .update({ active_checkout_session_id: session.id })
      .eq("id", request.id)

    return { success: true, checkoutUrl: session.url }
  } catch {
    return {
      success: false,
      error: "Something went wrong. Please try again or contact support if the problem persists.",
    }
  }
}
