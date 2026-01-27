"use server"

import { stripe, getPriceIdForRequest, type ServiceCategory } from "./client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"
import { isServiceDisabled, isMedicationBlocked, SERVICE_DISABLED_ERRORS } from "@/lib/feature-flags"
import { checkCheckoutBlocked } from "@/lib/config/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { getAppUrl } from "@/lib/env"
import { checkSafetyForServer } from "@/lib/flow/safety/evaluate"
import { trackSafetyOutcome, trackSafetyBlock } from "@/lib/posthog-server"

const logger = createLogger("guest-checkout")

interface GuestCheckoutInput {
  category: ServiceCategory
  subtype: string
  type: string
  answers: Record<string, unknown>
  guestEmail: string
  guestName?: string
  guestDateOfBirth?: string
  guestPhone?: string // Required for prescription category (eScript SMS delivery)
  serviceSlug?: string
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
    "prescription:new": "gp-consult",
    "consult:general": "gp-consult",
  }
  return slugMap[`${category}:${subtype}`] || slugMap[category] || "common-scripts"
}

/**
 * Create a guest checkout session without requiring authentication
 * Creates a minimal guest profile, intake, and Stripe checkout
 * Uses intakes table as the canonical case object (same as authenticated flow)
 */
export async function createGuestCheckoutAction(input: GuestCheckoutInput): Promise<CheckoutResult> {
  try {
    // KILL SWITCH (ENV): Fast env-var based kill switch (no DB round-trip)
    const envKillSwitch = checkCheckoutBlocked(input.category, input.subtype)
    if (envKillSwitch.blocked) {
      return {
        success: false,
        error: envKillSwitch.userMessage,
      }
    }

    // KILL SWITCH (DB): Check if service category is disabled in database
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

    // P1 FIX: Require phone for prescription category (eScript SMS delivery)
    if (input.category === "prescription" && !input.guestPhone) {
      return {
        success: false,
        error: "Phone number is required for prescription requests to receive your eScript via SMS.",
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

    // SERVER-SIDE SAFETY ENFORCEMENT (same as authenticated flow)
    const serviceSlugForSafety = input.serviceSlug || getServiceSlug(input.category, input.subtype)
    const safetyCheck = checkSafetyForServer(serviceSlugForSafety, input.answers)
    
    trackSafetyOutcome({
      serviceSlug: serviceSlugForSafety,
      outcome: safetyCheck.outcome,
      riskTier: safetyCheck.riskTier,
      triggeredRuleIds: safetyCheck.triggeredRuleIds,
      triggeredRuleCount: safetyCheck.triggeredRuleIds.length,
      evaluationDurationMs: 0,
    })
    
    if (!safetyCheck.isAllowed) {
      logger.warn("Safety check blocked guest checkout", {
        serviceSlug: serviceSlugForSafety,
        outcome: safetyCheck.outcome,
        riskTier: safetyCheck.riskTier,
        triggeredRules: safetyCheck.triggeredRuleIds,
      })
      
      trackSafetyBlock({
        serviceSlug: serviceSlugForSafety,
        outcome: safetyCheck.outcome,
        blockReason: safetyCheck.blockReason || "Unknown reason",
        triggeredRuleIds: safetyCheck.triggeredRuleIds,
      })
      
      if (safetyCheck.outcome === 'DECLINE') {
        return {
          success: false,
          error: safetyCheck.blockReason || "This request cannot be processed online. Please see your regular GP.",
        }
      }
      
      if (safetyCheck.outcome === 'REQUIRES_CALL') {
        return {
          success: false,
          error: safetyCheck.blockReason || "This request requires a phone consultation. Please contact us to proceed.",
        }
      }
      
      return {
        success: false,
        error: safetyCheck.blockReason || "Additional information is required. Please go back and complete all questions.",
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(input.guestEmail)) {
      return { success: false, error: "Please provide a valid email address." }
    }

    const supabase = createServiceRoleClient()
    const baseUrl = getBaseUrl()

    if (!isValidUrl(baseUrl)) {
      logger.error("Invalid base URL", { baseUrl })
      return { 
        success: false, 
        error: "Server configuration error. Please contact support at help@instantmed.com.au" 
      }
    }

    // 1. Check if a profile already exists for this email
    const normalizedEmail = input.guestEmail.toLowerCase().trim()
    let guestProfileId: string | null = null

    // P1 FIX: Rate limit guest checkout by email to prevent abuse
    const rateLimitResult = await checkServerActionRateLimit(`guest:${normalizedEmail}`, "sensitive")
    if (!rateLimitResult.success) {
      logger.warn("Guest checkout rate limited", { email: normalizedEmail })
      return {
        success: false,
        error: rateLimitResult.error || "Too many checkout attempts. Please wait a moment before trying again.",
      }
    }

    // First check if an authenticated profile exists (user already has account)
    const { data: existingAuthProfile } = await supabase
      .from("profiles")
      .select("id, auth_user_id")
      .eq("email", normalizedEmail)
      .not("auth_user_id", "is", null)
      .single()

    if (existingAuthProfile) {
      return { 
        success: false, 
        error: "An account already exists with this email. Please sign in to continue." 
      }
    }

    // Check for existing guest profile
    // P1 FIX: Only reuse guest profile if it exists and belongs to same session
    // to prevent profile hijacking via email guessing
    const { data: existingGuestProfile } = await supabase
      .from("profiles")
      .select("id, auth_user_id, email_verified")
      .eq("email", normalizedEmail)
      .is("auth_user_id", null)
      .single()

    if (existingGuestProfile) {
      // Only reuse guest profile if email is verified to prevent takeover
      if (existingGuestProfile.email_verified) {
        guestProfileId = existingGuestProfile.id
        // P1 FIX: Update phone if provided (for prescription eScript delivery)
        if (input.guestPhone) {
          await supabase
            .from("profiles")
            .update({ phone: input.guestPhone })
            .eq("id", guestProfileId)
        }
      } else {
        // Unverified guest profile exists - create new one to prevent hijacking
        logger.info("Skipping unverified guest profile reuse", { email: normalizedEmail })
      }
    }
    
    if (!guestProfileId) {
      // Create a new guest profile
      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          email: normalizedEmail,
          full_name: input.guestName || normalizedEmail.split("@")[0],
          date_of_birth: input.guestDateOfBirth || null,
          phone: input.guestPhone || null, // P1 FIX: Store phone for eScript SMS
          auth_user_id: null,
          role: "patient",
        })
        .select()
        .single()

      if (profileError || !newProfile) {
        const pgError = profileError as { code?: string; message?: string } | null
        
        if (pgError?.code === '23505') {
          return { 
            success: false, 
            error: "An account already exists with this email. Please sign in to continue." 
          }
        }
        
        logger.error("Failed to create guest profile", { error: profileError })
        return { success: false, error: "Failed to create guest profile. Please try again." }
      }

      guestProfileId = newProfile.id
    }

    // Ensure we have a valid profile ID
    if (!guestProfileId) {
      logger.error("Guest profile ID missing after creation logic")
      return { success: false, error: "Failed to create guest profile. Please try again." }
    }

    // 2. Look up service by slug
    const serviceSlug = input.serviceSlug || getServiceSlug(input.category, input.subtype)
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, price_cents")
      .eq("slug", serviceSlug)
      .eq("is_active", true)
      .single()

    if (serviceError || !service) {
      logger.error("Service not found", { serviceSlug, error: serviceError })
      return { success: false, error: "Service not available. Please contact support." }
    }

    // 3. Get the price ID early so we can store it on the intake
    const priceId = getPriceIdForRequest({
      category: input.category,
      subtype: input.subtype,
      answers: input.answers,
    })

    // 3. Create the intake with pending_payment status
    // Include category, subtype, idempotency_key, guest_email, and stripe_price_id
    const guestIdempotencyKey = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .insert({
        patient_id: guestProfileId,
        service_id: service.id,
        status: "pending_payment",
        payment_status: "pending",
        amount_cents: service.price_cents,
        category: input.category,
        subtype: input.subtype || null,
        idempotency_key: guestIdempotencyKey,
        guest_email: normalizedEmail, // P1 FIX: Store for abandoned checkout recovery
        stripe_price_id: priceId || null, // P3 FIX: Store for retry pricing consistency
      })
      .select()
      .single()

    if (intakeError || !intake) {
      logger.error("Failed to create intake", { error: intakeError })
      if (intakeError?.code === "23503") {
        return { success: false, error: "Your profile could not be found. Please try again." }
      }
      return { success: false, error: "Failed to create your request. Please try again." }
    }

    // 4. Insert the answers (ATOMIC - fail if answers cannot be saved)
    const { error: answersError } = await supabase.from("intake_answers").insert({
      intake_id: intake.id,
      answers: input.answers,
    })

    if (answersError) {
      logger.error("Failed to save answers, rolling back intake", { intakeId: intake.id }, new Error(answersError.message))
      await supabase.from("intakes").delete().eq("id", intake.id)
      return { success: false, error: "Failed to save your clinical information. Please try again." }
    }

    // 5. Validate price ID (already fetched above)
    if (!priceId) {
      await supabase.from("intakes").delete().eq("id", intake.id)
      return { success: false, error: "Unable to determine pricing. Please contact support." }
    }

    // 6. Build success and cancel URLs
    // Note: Email is passed for account completion flow - retrieved server-side for security
    const successUrl = `${baseUrl}/auth/complete-account?intake_id=${intake.id}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/patient/intakes/cancelled?intake_id=${intake.id}`

    // 7. Create Stripe checkout session
    let session
    try {
      logger.info("Creating guest Stripe checkout session", { 
        intakeId: intake.id, 
        category: input.category,
        guestEmail: normalizedEmail,
      })
      // Use intake ID as idempotency key to prevent duplicate sessions on double-click
      session = await stripe.checkout.sessions.create({
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
          intake_id: intake.id,
          patient_id: guestProfileId,
          category: input.category,
          subtype: input.subtype,
          service_slug: serviceSlug,
          guest_checkout: "true",
          guest_email: input.guestEmail,
        },
      }, {
        idempotencyKey: `guest-checkout-${intake.id}`,
      })
      logger.info("Guest Stripe checkout session created", { 
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
          error: "This service is temporarily unavailable. Please try again later." 
        }
      }
      return { 
        success: false, 
        error: "Payment system error. Please try again or contact support if the issue persists." 
      }
    }

    if (!session.url) {
      logger.error("Stripe session created but no URL returned", { sessionId: session.id })
      await supabase.from("intakes").delete().eq("id", intake.id)
      return { success: false, error: "Failed to create checkout session. Please try again." }
    }

    // 8. Update intake with payment session ID
    await supabase
      .from("intakes")
      .update({ payment_id: session.id })
      .eq("id", intake.id)

    logger.info("Guest checkout session created successfully", { 
      intakeId: intake.id, 
      sessionId: session.id 
    })
    return { success: true, checkoutUrl: session.url, intakeId: intake.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logger.error("Unexpected error in createGuestCheckoutAction", { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined 
    })
    return {
      success: false,
      error: "Something went wrong. Please try again or contact support if the problem persists.",
    }
  }
}
