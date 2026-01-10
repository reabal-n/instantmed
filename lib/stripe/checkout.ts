"use server"

import { stripe, getPriceIdForRequest, type ServiceCategory } from "./client"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"
import { isServiceDisabled, isMedicationBlocked, SERVICE_DISABLED_ERRORS } from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAppUrl } from "@/lib/env"

const logger = createLogger("stripe-checkout")

interface CreateCheckoutInput {
  category: ServiceCategory
  subtype: string
  type: string
  answers: Record<string, unknown>
  serviceSlug?: string // Service slug to look up service_id
  isPriority?: boolean // Priority review upsell
  // Legacy fields - patient info is now fetched from auth
  patientId?: string
  patientEmail?: string
}

interface CheckoutResult {
  success: boolean
  checkoutUrl?: string
  intakeId?: string
  error?: string
}

function getBaseUrl(): string {
  return getAppUrl()
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Map category to service slug
function getServiceSlug(category: ServiceCategory, subtype: string): string {
  const slugMap: Record<string, string> = {
    "medical_certificate:work": "med-cert-sick",
    "medical_certificate:uni": "med-cert-sick",
    "medical_certificate:carer": "med-cert-carer",
    "prescription:repeat": "common-scripts",
    "prescription:chronic_review": "common-scripts",
    "consult:general": "common-scripts",
  }
  return slugMap[`${category}:${subtype}`] || slugMap[category] || "common-scripts"
}

/**
 * Create an intake and Stripe checkout session
 * Uses intakes table as the canonical case object
 */
export async function createIntakeAndCheckoutAction(input: CreateCheckoutInput): Promise<CheckoutResult> {
  try {
    // KILL SWITCH: Check if service category is disabled
    const categoryMap: Record<ServiceCategory, "medical_certificate" | "prescription" | "other"> = {
      medical_certificate: "medical_certificate",
      prescription: "prescription",
      consult: "other",
    }
    const serviceCategory = categoryMap[input.category] || "other"
    
    if (await isServiceDisabled(serviceCategory)) {
      const errorCode = serviceCategory === "medical_certificate" 
        ? SERVICE_DISABLED_ERRORS.MED_CERT_DISABLED
        : serviceCategory === "prescription"
        ? SERVICE_DISABLED_ERRORS.REPEAT_SCRIPTS_DISABLED
        : SERVICE_DISABLED_ERRORS.CONSULTS_DISABLED
      return {
        success: false,
        error: `This service is temporarily unavailable. Please try again later. [${errorCode}]`,
      }
    }

    // Server-side validation for repeat scripts
    if (input.category === "prescription" && input.subtype === "repeat") {
      const validation = validateRepeatScriptPayload(input.answers)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || "Invalid repeat script request.",
        }
      }

      // KILL SWITCH: Check for blocked medications
      const medicationName = input.answers.medication_name as string | undefined
      const medicationDisplay = input.answers.medication_display as string | undefined
      const medCheck = await isMedicationBlocked(medicationName || medicationDisplay)
      if (medCheck.blocked) {
        return {
          success: false,
          error: `This medication cannot be prescribed through our online service for compliance reasons. Please consult your regular GP. [${SERVICE_DISABLED_ERRORS.MEDICATION_BLOCKED}]`,
        }
      }
    }

    // Check blocked medications in consults
    if (input.category === "consult") {
      const medicationName = input.answers.medication_name as string | undefined
      const medicationDisplay = input.answers.medication_display as string | undefined
      const medCheck = await isMedicationBlocked(medicationName || medicationDisplay)
      if (medCheck.blocked) {
        return {
          success: false,
          error: `This medication cannot be prescribed through our online service for compliance reasons. Please consult your regular GP. [${SERVICE_DISABLED_ERRORS.MEDICATION_BLOCKED}]`,
        }
      }
    }

    // 1. Get authenticated user
    let authUser
    try {
      authUser = await getAuthenticatedUserWithProfile()
    } catch (authError) {
      logger.error("Authentication check failed", { error: authError })
      return { 
        success: false, 
        error: "Authentication failed. Please sign in and try again." 
      }
    }
    
    if (!authUser) {
      logger.warn("User not authenticated when attempting checkout")
      return { 
        success: false, 
        error: "You must be logged in to submit a request. Please sign in and try again." 
      }
    }

    // 2. Get the Supabase service role client
    const supabase = createServiceRoleClient()

    // 3. Assert profile exists
    let patientId: string
    if (authUser.profile?.id) {
      patientId = authUser.profile.id
    } else {
      const { ensureProfile } = await import("@/app/actions/ensure-profile")
      const { profileId, error: profileError } = await ensureProfile(
        authUser.user.id,
        authUser.user.email || ""
      )
      
      if (profileError || !profileId) {
        return { success: false, error: `Profile creation failed: ${profileError || "Unknown error"}` }
      }
      
      patientId = profileId
    }

    const patientEmail = authUser.user.email || undefined
    const stripeCustomerId = authUser.profile?.stripe_customer_id || undefined

    const baseUrl = getBaseUrl()
    if (!isValidUrl(baseUrl)) {
      logger.error("Invalid base URL", { baseUrl })
      return { 
        success: false, 
        error: "Server configuration error. Please contact support at help@instantmed.com.au" 
      }
    }

    // 4. Look up service by slug
    const serviceSlug = input.serviceSlug || getServiceSlug(input.category, input.subtype)
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, price_cents, priority_fee_cents")
      .eq("slug", serviceSlug)
      .eq("is_active", true)
      .single()

    if (serviceError || !service) {
      logger.error("Service not found", { serviceSlug, error: serviceError })
      return { success: false, error: "Service not available. Please contact support." }
    }

    // 5. Create the intake with pending_payment status
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .insert({
        patient_id: patientId,
        service_id: service.id,
        status: "pending_payment",
        is_priority: input.isPriority || false,
        priority_review: input.isPriority || false,
        payment_status: "pending",
        amount_cents: service.price_cents + (input.isPriority ? service.priority_fee_cents : 0),
      })
      .select()
      .single()

    if (intakeError || !intake) {
      logger.error("Failed to create intake", { error: intakeError })
      if (intakeError?.code === "23503") {
        return { success: false, error: "Your profile could not be found. Please sign out and sign in again." }
      }
      return { success: false, error: "Failed to create your request. Please try again." }
    }

    // 6. Insert the answers (ATOMIC - fail if answers cannot be saved)
    const { error: answersError } = await supabase.from("intake_answers").insert({
      intake_id: intake.id,
      answers: input.answers,
    })

    if (answersError) {
      logger.error("[Stripe Checkout] Failed to save answers, rolling back intake", {
        intakeId: intake.id,
      }, new Error(answersError.message))
      await supabase.from("intakes").delete().eq("id", intake.id)
      return { success: false, error: "Failed to save your clinical information. Please try again." }
    }

    // 7. Get the price ID
    const priceId = getPriceIdForRequest({
      category: input.category,
      subtype: input.subtype,
      answers: input.answers,
    })

    if (!priceId) {
      await supabase.from("intakes").delete().eq("id", intake.id)
      return { success: false, error: "Unable to determine pricing. Please contact support." }
    }

    // 8. Build success and cancel URLs
    const successUrl = `${baseUrl}/patient/intakes/success?intake_id=${intake.id}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/patient/intakes/cancelled?intake_id=${intake.id}`

    // 9. Build checkout session params
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
        intake_id: intake.id,
        patient_id: patientId,
        category: input.category,
        subtype: input.subtype,
        service_slug: serviceSlug,
      },
      customer: stripeCustomerId || undefined,
      customer_email: !stripeCustomerId && patientEmail ? patientEmail : undefined,
      customer_creation: !stripeCustomerId && patientEmail ? "always" as const : undefined,
    }

    // 10. Create Stripe checkout session
    let session
    try {
      logger.info("Creating Stripe checkout session", { 
        intakeId: intake.id, 
        category: input.category,
        hasPriceId: !!priceId 
      })
      session = await stripe.checkout.sessions.create(sessionParams)
      logger.info("Stripe checkout session created", { 
        sessionId: session.id, 
        hasUrl: !!session.url 
      })
    } catch (stripeError: unknown) {
      await supabase.from("intakes").delete().eq("id", intake.id)
      const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError)
      logger.error("Stripe checkout session creation failed", { 
        error: errorMessage, 
        intakeId: intake.id,
        category: input.category 
      })

      if (errorMessage.includes("No such price")) {
        return { 
          success: false, 
          error: "This service is temporarily unavailable. Please try again later. [ERR_PRICE_CONFIG]" 
        }
      }
      return { 
        success: false, 
        error: `Payment system error. Please try again. [ERR_STRIPE]` 
      }
    }

    if (!session.url) {
      logger.error("Stripe session created but no URL returned", { sessionId: session.id })
      await supabase.from("intakes").delete().eq("id", intake.id)
      return { 
        success: false, 
        error: "Failed to create checkout session. Please try again." 
      }
    }

    // 11. Update intake with payment session ID
    await supabase
      .from("intakes")
      .update({ payment_id: session.id })
      .eq("id", intake.id)

    logger.info("Checkout session created successfully", { 
      intakeId: intake.id, 
      sessionId: session.id 
    })
    return { success: true, checkoutUrl: session.url, intakeId: intake.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logger.error("Unexpected error in createIntakeAndCheckoutAction", { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined 
    })
    return {
      success: false,
      error: `Something went wrong. Please try again or contact support. [ERR_CHECKOUT]`,
    }
  }
}

/**
 * Retry payment for an existing intake with pending_payment status
 */
export async function retryPaymentForIntakeAction(intakeId: string): Promise<CheckoutResult> {
  try {
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { success: false, error: "You must be logged in" }
    }

    const patientId = authUser.profile.id
    const patientEmail = authUser.user.email

    const supabase = createServiceRoleClient()

    // Fetch the existing intake with ownership check
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("*, service:services!service_id(slug, price_cents)")
      .eq("id", intakeId)
      .eq("patient_id", patientId)
      .single()

    if (intakeError || !intake) {
      return { success: false, error: "Request not found" }
    }

    // Verify the intake is in pending_payment status
    if (intake.status !== "pending_payment" && intake.payment_status !== "pending") {
      return { success: false, error: "This request has already been paid or is not awaiting payment" }
    }

    // Get the price ID using service data
    const service = intake.service as { slug: string; price_cents: number } | null
    const priceId = getPriceIdForRequest({
      category: service?.slug?.includes("med-cert") ? "medical_certificate" : "prescription",
      subtype: "",
      answers: {},
    })

    const baseUrl = getBaseUrl()
    if (!isValidUrl(baseUrl)) {
      return { success: false, error: "Server configuration error. Please contact support." }
    }

    const sessionParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment" as const,
      success_url: `${baseUrl}/patient/intakes/success?intake_id=${intake.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/patient/intakes/cancelled?intake_id=${intake.id}`,
      metadata: {
        intake_id: intake.id,
        patient_id: patientId,
        is_retry: "true",
      },
      customer: authUser.profile.stripe_customer_id || undefined,
      customer_email: !authUser.profile.stripe_customer_id && patientEmail ? patientEmail : undefined,
      customer_creation: !authUser.profile.stripe_customer_id && patientEmail ? "always" as const : undefined,
    }

    let session
    try {
      session = await stripe.checkout.sessions.create(sessionParams)
    } catch (stripeError: unknown) {
      if (stripeError instanceof Error) {
        if (stripeError.message.includes("No such price")) {
          return { success: false, error: "This service is temporarily unavailable. Please try again later." }
        }
      }
      return { success: false, error: "Payment system error. Please try again." }
    }

    if (!session.url) {
      return { success: false, error: "Failed to create checkout session. Please try again." }
    }

    // Update intake with new payment session ID
    await supabase
      .from("intakes")
      .update({ payment_id: session.id })
      .eq("id", intake.id)

    return { success: true, checkoutUrl: session.url, intakeId: intake.id }
  } catch {
    return {
      success: false,
      error: "Something went wrong. Please try again or contact support.",
    }
  }
}

