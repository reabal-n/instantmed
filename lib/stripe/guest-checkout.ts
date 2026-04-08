"use server"

import { stripe, getPriceIdForRequest, type ServiceCategory } from "./client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"
import { validateMedCertPayload } from "@/lib/validation/med-cert-schema"
import { isServiceDisabled, isMedicationBlocked, SERVICE_DISABLED_ERRORS } from "@/lib/feature-flags"
import { checkCheckoutBlocked } from "@/lib/config/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { isControlledSubstance } from "@/lib/clinical/intake-validation"
import { CONTACT_EMAIL } from "@/lib/constants"
import { getAppUrl } from "@/lib/env"
import { checkSafetyForServer, validateSafetyFieldsPresent } from "@/lib/flow/safety/evaluate"
import { trackSafetyOutcome, trackSafetyBlock, trackIntakeFunnelStep } from "@/lib/posthog-server"
import {
  logRequestCreated,
  logTermsConsentGiven,
  logTelehealthConsentGiven,
  logAccuracyAttestationGiven,
  type RequestType,
} from "@/lib/audit/compliance-audit"
import { TERMS_VERSION, TELEHEALTH_CONSENT_VERSION } from "@/lib/constants"

const logger = createLogger("guest-checkout")

function mapCategoryToRequestType(category: string, subtype: string): RequestType {
  if (category === "medical_certificate") return "med_cert"
  if (category === "prescription" && (subtype === "repeat" || subtype === "chronic_review")) return "repeat_rx"
  return "intake"
}

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
  attribution?: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    referrer?: string
  }
  posthogDistinctId?: string // Client-side PostHog distinct ID for identity stitching
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
    "medical_certificate:study": "med-cert-sick",
    "medical_certificate:carer": "med-cert-carer",
    "prescription:repeat": "common-scripts",
    "prescription:chronic_review": "common-scripts",
    "prescription:new": "consult",
    "consult:general": "consult",
  }

  // Category-level fallbacks (when subtype combo isn't found)
  const categoryFallback: Record<string, string> = {
    medical_certificate: "med-cert-sick",
    prescription: "common-scripts",
    consult: "consult",
  }

  return slugMap[`${category}:${subtype}`] || categoryFallback[category] || "consult"
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

    // CLINICAL AUDIT: Enforce 18+ age requirement (CLAUDE.md eligibility constraint)
    if (input.guestDateOfBirth) {
      const dob = new Date(input.guestDateOfBirth)
      if (!isNaN(dob.getTime())) {
        const today = new Date()
        let age = today.getFullYear() - dob.getFullYear()
        const monthDiff = today.getMonth() - dob.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--
        }
        if (age < 18) {
          logger.warn("Guest checkout blocked: patient under 18", { category: input.category })
          return {
            success: false,
            error: "You must be 18 or older to use this service. If you are under 18, please visit your GP with a parent or guardian.",
          }
        }
      }
    }

    // P1 FIX: Require phone for prescription category (eScript SMS delivery)
    if (input.category === "prescription" && !input.guestPhone) {
      return {
        success: false,
        error: "Phone number is required for prescription requests to receive your eScript via SMS.",
      }
    }

    // Server-side validation for medical certificates
    if (input.category === "medical_certificate") {
      const validation = validateMedCertPayload(input.answers)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || "Invalid medical certificate request.",
        }
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

      // KILL SWITCH: Check for blocked medications (DB-based blocklist)
      const medicationName = input.answers.medication_name as string | undefined
      const medicationDisplay = input.answers.medication_display as string | undefined
      const medCheck = await isMedicationBlocked(medicationName || medicationDisplay)
      if (medCheck.blocked) {
        return {
          success: false,
          error: `This medication cannot be prescribed through our online service for compliance reasons. Please consult your regular doctor. [${SERVICE_DISABLED_ERRORS.MEDICATION_BLOCKED}]`,
        }
      }

      // CLINICAL AUDIT: Hard-block Schedule 8 / controlled substances (regex patterns)
      const medNameToCheck = medicationName || medicationDisplay || ""
      if (medNameToCheck && isControlledSubstance(medNameToCheck)) {
        logger.warn("Controlled substance blocked at guest checkout", { medication: medNameToCheck, category: input.category })
        return {
          success: false,
          error: "This medication cannot be prescribed through our online service. Schedule 8 and controlled substances require an in-person consultation with your regular GP.",
        }
      }
    }

    // SERVER-SIDE SAFETY ENFORCEMENT (same as authenticated flow)
    const serviceSlugForSafety = input.serviceSlug || getServiceSlug(input.category, input.subtype)

    // AUDIT FIX: Validate safety-critical fields are present before evaluating rules
    const fieldCheck = validateSafetyFieldsPresent(serviceSlugForSafety, input.answers)
    if (!fieldCheck.valid) {
      logger.warn("Safety fields missing at checkout", {
        serviceSlug: serviceSlugForSafety,
        missingFields: fieldCheck.missingFields,
      })
      return {
        success: false,
        error: `Required medical information is missing. Please go back and complete all questions. Missing: ${fieldCheck.missingFields.join(", ")}`,
      }
    }

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
          error: safetyCheck.blockReason || "This request cannot be processed online. Please see your regular doctor.",
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

    // CLINICAL AUDIT: Validate consent fields are present (CLINICAL.md §Consent Requirements)
    const hasTermsConsent = input.answers.terms_agreed === true || input.answers.agreedToTerms === true
    const hasAccuracyConsent = input.answers.accuracy_confirmed === true || input.answers.confirmedAccuracy === true
    if (!hasTermsConsent || !hasAccuracyConsent) {
      logger.warn("Guest checkout blocked: missing consent fields", {
        hasTermsConsent,
        hasAccuracyConsent,
        category: input.category,
      })
      return {
        success: false,
        error: "Please agree to the terms of service and confirm your information is accurate before proceeding.",
      }
    }

    const supabase = createServiceRoleClient()
    const baseUrl = getBaseUrl()

    if (!isValidUrl(baseUrl)) {
      logger.error("Invalid base URL", { baseUrl })
      return { 
        success: false, 
        error: `Server configuration error. Please contact support at ${CONTACT_EMAIL}`
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
      .select("id, clerk_user_id")
      .eq("email", normalizedEmail)
      .not("clerk_user_id", "is", null)
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
      .select("id, clerk_user_id, email_verified")
      .eq("email", normalizedEmail)
      .is("clerk_user_id", null)
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
          clerk_user_id: null,
          role: "patient",
        })
        .select("id")
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
    // Idempotency key: 10-minute time bucket prevents double-clicks while allowing legitimate repeat requests
    const { createHash } = await import("crypto")
    const guestIdempotencyKey = `guest-${createHash("sha256")
      .update(`${normalizedEmail}:${input.category}:${input.subtype}:${Math.floor(Date.now() / 600_000)}:${JSON.stringify(input.answers)}`)
      .digest("hex")
      .slice(0, 24)}`
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
        // Attribution: store UTM params for payment attribution in PostHog
        utm_source: input.attribution?.utm_source || null,
        utm_medium: input.attribution?.utm_medium || null,
        utm_campaign: input.attribution?.utm_campaign || null,
      })
      .select("id")
      .single()

    if (intakeError || !intake) {
      logger.error("Failed to create intake", { error: intakeError, code: intakeError?.code, message: intakeError?.message, details: intakeError?.details })
      if (intakeError?.code === "23503") {
        return { success: false, error: "Your profile could not be found. Please try again." }
      }
      if (intakeError?.code === "42501") {
        return { success: false, error: "Permission denied. Please try again or contact support." }
      }
      return { success: false, error: `Failed to create your request. ${intakeError?.message ? `(${intakeError.message})` : "Please try again."}` }
    }

    trackIntakeFunnelStep({
      step: "intake_started",
      intakeId: intake.id,
      serviceSlug: serviceSlugForSafety,
      serviceType: input.category,
      sessionId: normalizedEmail,
    })

    // 4. Insert the answers (ATOMIC - fail if answers cannot be saved)
    // Answers must be saved BEFORE audit logs to avoid orphaned compliance records
    // if this step fails and the intake is rolled back.
    const { error: answersError } = await supabase.from("intake_answers").insert({
      intake_id: intake.id,
      answers: input.answers,
    })

    if (answersError) {
      logger.error("Failed to save answers, rolling back intake", { intakeId: intake.id }, new Error(answersError.message))
      await supabase.from("intakes").delete().eq("id", intake.id)
      return { success: false, error: "Failed to save your clinical information. Please try again." }
    }

    // Compliance audit: log request creation and consent for LegitScript/AHPRA defensibility
    // Placed after answers insert so these records never orphan if the intake is rolled back.
    const requestType = mapCategoryToRequestType(input.category, input.subtype || "")
    await logRequestCreated(intake.id, requestType, guestProfileId, {
      category: input.category,
      subtype: input.subtype,
      guest: true,
    })
    // Per-episode consent evidence (CLINICAL.md)
    await Promise.all([
      logTermsConsentGiven(intake.id, requestType, guestProfileId, TERMS_VERSION),
      logTelehealthConsentGiven(intake.id, requestType, guestProfileId, TELEHEALTH_CONSENT_VERSION),
      logAccuracyAttestationGiven(intake.id, requestType, guestProfileId),
    ])

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
        // Enable promo code field on Stripe checkout (campaigns, partner deals, win-back, etc.)
        allow_promotion_codes: true,
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
          ...(input.posthogDistinctId ? { ph_distinct_id: input.posthogDistinctId } : {}),
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

    // Track funnel: payment initiated (checkout redirect)
    trackIntakeFunnelStep({
      step: "payment_initiated",
      intakeId: intake.id,
      serviceSlug: serviceSlug,
      serviceType: input.category,
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
