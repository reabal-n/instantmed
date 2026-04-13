"use server"

import { cookies } from "next/headers"

import { trackIntakeFunnelStep,trackOperationalBlock, trackSafetyBlock, trackSafetyOutcome } from "@/lib/analytics/posthog-server"
import {
  logAccuracyAttestationGiven,
  logRequestCreated,
  logTelehealthConsentGiven,
  logTermsConsentGiven,
  type RequestType,
} from "@/lib/audit/compliance-audit"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { isControlledSubstance } from "@/lib/clinical/intake-validation"
import { getAppUrl } from "@/lib/config/env"
import { checkCheckoutBlocked } from "@/lib/config/kill-switches"
import { isAtCapacity,isOutsideBusinessHours } from "@/lib/config/operational-config"
import { CONTACT_EMAIL } from "@/lib/constants"
import { TELEHEALTH_CONSENT_VERSION,TERMS_VERSION } from "@/lib/constants"
import { isMedicationBlocked, isServiceDisabled, SERVICE_DISABLED_ERRORS } from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { checkSafetyForServer, validateSafetyFieldsPresent } from "@/lib/safety/evaluate"
import { runFraudChecks, saveFraudFlags } from "@/lib/security/fraud-detector"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { validateMedCertPayload } from "@/lib/validation/med-cert-schema"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"
import type { ServiceCategory } from "@/types/services"

import { getPriceIdForRequest,stripe } from "./client"
import { createReferralCouponIfEligible } from "./referral-coupon"

const logger = createLogger("stripe-checkout")

function mapCategoryToRequestType(category: string, subtype: string): RequestType {
  if (category === "medical_certificate") return "med_cert"
  if (category === "prescription" && (subtype === "repeat" || subtype === "chronic_review")) return "repeat_rx"
  return "intake"
}

interface CreateCheckoutInput {
  category: string
  subtype: string
  type: string
  answers: Record<string, unknown>
  serviceSlug?: string // Service slug to look up service_id
  idempotencyKey: string // P1 FIX: Required - client-generated key to prevent duplicate submissions
  attribution?: {
    gclid?: string
    gbraid?: string
    wbraid?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
    referrer?: string
    landing_page?: string
    captured_at?: string
  }
  posthogDistinctId?: string // Client-side PostHog distinct ID for identity stitching
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
function getServiceSlug(category: string, subtype: string): string {
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
 * Create an intake and Stripe checkout session
 * Uses intakes table as the canonical case object
 */
export async function createIntakeAndCheckoutAction(input: CreateCheckoutInput): Promise<CheckoutResult> {
  const startTime = Date.now()
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
    const categoryMap: Record<string, "medical_certificate" | "prescription" | "other"> = {
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

    // Business hours (med certs are 24/7 - auto-approved)
    if (input.category !== "medical_certificate") {
      const outsideHours = await isOutsideBusinessHours()
      if (outsideHours.closed) {
        trackOperationalBlock({ blockType: "business_hours", source: "checkout", userId: input.patientId })
        return {
          success: false,
          error: `We're outside our operating hours. We'll be back at ${outsideHours.nextOpen ?? "8am"} AEST.`,
        }
      }
    }

    // Capacity limit
    if (await isAtCapacity()) {
      trackOperationalBlock({ blockType: "capacity_limit", source: "checkout", userId: input.patientId })
      return {
        success: false,
        error: "We're experiencing high demand today. Please try again tomorrow.",
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
        logger.warn("Controlled substance blocked at checkout", { medication: medNameToCheck, category: input.category })
        return {
          success: false,
          error: "This medication cannot be prescribed through our online service. Schedule 8 and controlled substances require an in-person consultation with your regular GP.",
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
          error: `This medication cannot be prescribed through our online service for compliance reasons. Please consult your regular doctor. [${SERVICE_DISABLED_ERRORS.MEDICATION_BLOCKED}]`,
        }
      }
    }

    // SERVER-SIDE SAFETY ENFORCEMENT
    // Evaluate safety rules for ALL service categories to prevent client-side bypass
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
    
    // Track safety outcome for analytics (P3-9)
    trackSafetyOutcome({
      serviceSlug: serviceSlugForSafety,
      outcome: safetyCheck.outcome,
      riskTier: safetyCheck.riskTier,
      triggeredRuleIds: safetyCheck.triggeredRuleIds,
      triggeredRuleCount: safetyCheck.triggeredRuleIds.length,
      evaluationDurationMs: 0, // Server-side check doesn't track duration
    })
    
    if (!safetyCheck.isAllowed) {
      logger.warn("Safety check blocked checkout", {
        serviceSlug: serviceSlugForSafety,
        outcome: safetyCheck.outcome,
        riskTier: safetyCheck.riskTier,
        triggeredRules: safetyCheck.triggeredRuleIds,
      })
      
      // Track safety block event
      trackSafetyBlock({
        serviceSlug: serviceSlugForSafety,
        outcome: safetyCheck.outcome,
        blockReason: safetyCheck.blockReason || "Unknown reason",
        triggeredRuleIds: safetyCheck.triggeredRuleIds,
      })
      
      // Return appropriate error based on outcome
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
      
      // REQUEST_MORE_INFO - should not reach checkout, but handle gracefully
      return {
        success: false,
        error: safetyCheck.blockReason || "Additional information is required. Please go back and complete all questions.",
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

    // CLINICAL AUDIT: Enforce 18+ age requirement (CLAUDE.md eligibility constraint)
    const profileDob = authUser.profile?.date_of_birth as string | null | undefined
    if (profileDob) {
      const dob = new Date(profileDob)
      if (!isNaN(dob.getTime())) {
        const today = new Date()
        let age = today.getFullYear() - dob.getFullYear()
        const monthDiff = today.getMonth() - dob.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--
        }
        if (age < 18) {
          logger.warn("Checkout blocked: patient under 18", { patientId, category: input.category })
          return {
            success: false,
            error: "You must be 18 or older to use this service. If you are under 18, please visit your GP with a parent or guardian.",
          }
        }
      }
    }

    const patientEmail = authUser.user.email || undefined
    const stripeCustomerId = authUser.profile?.stripe_customer_id || undefined

    const baseUrl = getBaseUrl()
    if (!isValidUrl(baseUrl)) {
      logger.error("Invalid base URL", { baseUrl })
      return { 
        success: false, 
        error: `Server configuration error. Please contact support at ${CONTACT_EMAIL}`
      }
    }

    // CLINICAL AUDIT: Validate consent fields are present (CLINICAL.md §Consent Requirements)
    // Consent must be explicit per-episode - never implied by signup
    const hasTermsConsent = input.answers.terms_agreed === true || input.answers.agreedToTerms === true
    const hasAccuracyConsent = input.answers.accuracy_confirmed === true || input.answers.confirmedAccuracy === true
    if (!hasTermsConsent || !hasAccuracyConsent) {
      logger.warn("Checkout blocked: missing consent fields", {
        patientId,
        hasTermsConsent,
        hasAccuracyConsent,
        category: input.category,
      })
      return {
        success: false,
        error: "Please agree to the terms of service and confirm your information is accurate before proceeding.",
      }
    }

    // 4. Look up service by slug
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

    // 5. Run fraud detection checks
    const medicareNumber = input.answers.medicare_number as string | undefined
    const formStartTime = input.answers._form_start_time 
      ? new Date(input.answers._form_start_time as string) 
      : undefined
    const formEndTime = new Date()
    
    const fraudResult = await runFraudChecks({
      patientId,
      medicareNumber,
      category: input.category,
      subtype: input.subtype,
      formStartTime,
      formEndTime,
    })
    
    if (fraudResult.flagged && fraudResult.riskScore >= 60) {
      logger.warn("High-risk fraud flags detected", {
        patientId,
        riskScore: fraudResult.riskScore,
        flags: fraudResult.flags.map(f => f.type),
      })
      // Don't block, but log for review - actual blocking handled by clinical team
    }

    // P1 FIX: Validate idempotency key is provided (now required)
    if (!input.idempotencyKey || input.idempotencyKey.length < 16) {
      logger.error("Missing or invalid idempotency key", { 
        hasKey: !!input.idempotencyKey,
        keyLength: input.idempotencyKey?.length 
      })
      return { 
        success: false, 
        error: "Invalid request. Please refresh the page and try again." 
      }
    }

    // P1 FIX: Rate limit checkout session creation to prevent abuse
    const rateLimitResult = await checkServerActionRateLimit(patientId, "sensitive")
    if (!rateLimitResult.success) {
      logger.warn("Checkout rate limited", { patientId })
      return {
        success: false,
        error: rateLimitResult.error || "Too many checkout attempts. Please wait a moment before trying again.",
      }
    }

    // 6. Create the intake with pending_payment status
    // Store category and subtype at creation for reliable retry pricing
    // Idempotency key prevents duplicate submissions on double-click
    // Get price ID early so we can store it on the intake for retry consistency
    const priceId = getPriceIdForRequest({
      category: input.category as ServiceCategory,
      subtype: input.subtype,
      answers: input.answers,
    })

    if (!priceId) {
      return { success: false, error: "Unable to determine pricing. Please contact support." }
    }

    const isPriority = input.answers.is_priority === true
    const priorityPriceId = isPriority ? process.env.STRIPE_PRICE_PRIORITY_FEE : null

    const intakeData: Record<string, unknown> = {
      patient_id: patientId,
      service_id: service.id,
      status: "pending_payment",
      payment_status: "pending",
      amount_cents: service.price_cents,
      category: input.category,
      subtype: input.subtype,
      is_priority: isPriority,
      idempotency_key: input.idempotencyKey, // P1 FIX: Always required
      stripe_price_id: priceId || null, // Store for retry pricing consistency
      // Attribution: store UTM params for payment attribution in PostHog
      utm_source: input.attribution?.utm_source || null,
      utm_medium: input.attribution?.utm_medium || null,
      utm_campaign: input.attribution?.utm_campaign || null,
    }

    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .insert(intakeData)
      .select("id, status")
      .single()

    // Debug log for intake creation tracing (no PHI)
    if (intake) {
      logger.debug("Intake created", {
        intakeId: intake.id,
        serviceId: service.id,
        serviceSlug: serviceSlug,
        category: input.category,
        subtype: input.subtype,
        status: intake.status,
      })

      trackIntakeFunnelStep({
        step: "intake_started",
        intakeId: intake.id,
        serviceSlug: serviceSlug,
        serviceType: input.category,
        userId: authUser.user.id,
      })
    }

    if (intakeError || !intake) {
      // Check for duplicate idempotency key (unique constraint violation)
      if (intakeError?.code === "23505" && input.idempotencyKey) {
        // Return existing intake instead of creating duplicate
        const { data: existingIntake } = await supabase
          .from("intakes")
          .select("id, status")
          .eq("idempotency_key", input.idempotencyKey)
          .single()
        
        if (existingIntake) {
          logger.info("Returning existing intake for idempotency key", { 
            intakeId: existingIntake.id,
            idempotencyKey: input.idempotencyKey 
          })
          // If already paid, redirect to success
          if (existingIntake.status !== "pending_payment") {
            return {
              success: true,
              intakeId: existingIntake.id,
              checkoutUrl: `${baseUrl}/patient/intakes/${existingIntake.id}`
            }
          }
          // Still pending payment - retry checkout for existing intake
          logger.info("Retrying checkout for existing pending_payment intake", {
            intakeId: existingIntake.id,
          })
          return retryPaymentForIntakeAction(existingIntake.id)
        }
      }

      logger.error("Failed to create intake", { error: intakeError, code: intakeError?.code, message: intakeError?.message, details: intakeError?.details })
      if (intakeError?.code === "23503") {
        return { success: false, error: "Your profile could not be found. Please sign out and sign in again." }
      }
      if (intakeError?.code === "42501") {
        return { success: false, error: "Permission denied. Please sign out and sign in again, or try as a guest." }
      }
      return { success: false, error: `Failed to create your request. ${intakeError?.message ? `(${intakeError.message})` : "Please try again."}` }
    }

    // 6a. Insert the answers (ATOMIC - fail if answers cannot be saved)
    // Answers must be saved BEFORE audit logs to avoid orphaned compliance records
    // if this step fails and the intake is rolled back.
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

    // Compliance audit: log request creation and consent for LegitScript/AHPRA defensibility
    // Placed after answers insert so these records never orphan if the intake is rolled back.
    const requestType = mapCategoryToRequestType(input.category, input.subtype)
    await logRequestCreated(intake.id, requestType, patientId, {
      category: input.category,
      subtype: input.subtype,
    })
    // Per-episode consent evidence (CLINICAL.md)
    await Promise.all([
      logTermsConsentGiven(intake.id, requestType, patientId, TERMS_VERSION),
      logTelehealthConsentGiven(intake.id, requestType, patientId, TELEHEALTH_CONSENT_VERSION),
      logAccuracyAttestationGiven(intake.id, requestType, patientId),
    ])

    // 6b. Save fraud flags if any were detected (non-blocking)
    if (fraudResult.flagged) {
      try {
        await saveFraudFlags(intake.id, patientId, fraudResult.flags)
        logger.info("Fraud flags saved for review", {
          intakeId: intake.id,
          flagCount: fraudResult.flags.length,
          riskScore: fraudResult.riskScore,
        })
      } catch (fraudSaveError) {
        // Don't block checkout if fraud flag save fails - just log
        logger.error("Failed to save fraud flags", { intakeId: intake.id },
          fraudSaveError instanceof Error ? fraudSaveError : undefined)
      }
    }

    // 7. Build success and cancel URLs
    const successUrl = `${baseUrl}/patient/intakes/success?intake_id=${intake.id}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/patient/intakes/cancelled?intake_id=${intake.id}`

    // 9. Build checkout session params
    const cookieStore = await cookies()
    const refCode = cookieStore.get("instantmed_ref")?.value ?? ""

    // Apply referral credit as Stripe coupon if patient has unspent credits
    const referralCoupon = await createReferralCouponIfEligible(patientId, service.price_cents)

    // Subscription mode: use recurring price for repeat scripts when opted in
    const isSubscription = input.answers.subscribe_and_save === true
    const subscriptionPriceId = process.env.STRIPE_PRICE_REPEAT_RX_MONTHLY

    // Build line items. CRITICAL: in subscription mode, line_items must be
    // recurring-only - Stripe rejects mixing one-time prices into a
    // subscription session with a 400. The Express Review one-time fee gets
    // attached via subscription_data.add_invoice_items below so it bills on
    // the first invoice. See launch blocker #4.
    const lineItems: Array<{ price: string; quantity: number }> = isSubscription && subscriptionPriceId
      ? [{ price: subscriptionPriceId, quantity: 1 }]
      : [{ price: priceId, quantity: 1 }]

    // For one-time payment mode, push the priority fee directly into line_items.
    // For subscription mode, defer to add_invoice_items (handled below).
    if (isPriority && priorityPriceId && !isSubscription) {
      lineItems.push({ price: priorityPriceId, quantity: 1 })
    }

    const sessionMetadata = {
      intake_id: intake.id,
      patient_id: patientId,
      category: input.category,
      subtype: input.subtype,
      service_slug: serviceSlug,
      ...(refCode ? { referral_code: refCode } : {}),
      ...(referralCoupon ? {
        referral_coupon_id: referralCoupon.couponId,
        referral_discount_cents: String(referralCoupon.discountCents),
      } : {}),
      ...(input.posthogDistinctId ? { ph_distinct_id: input.posthogDistinctId } : {}),
      ...(isPriority ? { is_priority: "true" } : {}),
      ...(isSubscription ? { is_subscription: "true" } : {}),
      // Google Ads click IDs for Enhanced Conversions attribution
      ...(input.attribution?.gclid ? { gclid: input.attribution.gclid } : {}),
      ...(input.attribution?.gbraid ? { gbraid: input.attribution.gbraid } : {}),
      ...(input.attribution?.wbraid ? { wbraid: input.attribution.wbraid } : {}),
    }

    // allow_promotion_codes is mutually exclusive with `discounts` in Stripe.
    // When a referral coupon is auto-applied, we cannot also accept a manual promo code.
    const allowPromotionCodes = !referralCoupon

    // For subscription mode with Express Review, add the one-time priority fee
    // as a first-invoice add-on. This is the only Stripe-supported way to
    // combine a one-time charge with a recurring subscription in Checkout.
    const subscriptionAddInvoiceItems: Array<{ price: string; quantity: number }> = []
    if (isSubscription && isPriority && priorityPriceId) {
      subscriptionAddInvoiceItems.push({ price: priorityPriceId, quantity: 1 })
    }

    const sessionParams = isSubscription && subscriptionPriceId
      ? {
          // Subscription checkout
          line_items: lineItems,
          ...(referralCoupon ? { discounts: [{ coupon: referralCoupon.couponId }] } : {}),
          ...(allowPromotionCodes ? { allow_promotion_codes: true } : {}),
          mode: "subscription" as const,
          success_url: successUrl,
          cancel_url: cancelUrl,
          subscription_data: {
            metadata: sessionMetadata,
            // Bill the Express Review one-time fee on the first invoice only.
            ...(subscriptionAddInvoiceItems.length > 0
              ? { add_invoice_items: subscriptionAddInvoiceItems }
              : {}),
          },
          metadata: sessionMetadata,
          customer: stripeCustomerId || undefined,
          customer_email: !stripeCustomerId && patientEmail ? patientEmail : undefined,
          customer_creation: !stripeCustomerId && patientEmail ? "always" as const : undefined,
        }
      : {
          // One-time payment checkout
          line_items: lineItems,
          ...(referralCoupon ? { discounts: [{ coupon: referralCoupon.couponId }] } : {}),
          ...(allowPromotionCodes ? { allow_promotion_codes: true } : {}),
          mode: "payment" as const,
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: sessionMetadata,
          customer: stripeCustomerId || undefined,
          customer_email: !stripeCustomerId && patientEmail ? patientEmail : undefined,
          customer_creation: !stripeCustomerId && patientEmail ? "always" as const : undefined,
          // Enable saved payment methods for returning customers
          payment_intent_data: {
            setup_future_usage: "on_session" as const,
          },
          // Show saved payment methods for returning customers
          saved_payment_method_options: stripeCustomerId ? {
            payment_method_save: "enabled" as const,
          } : undefined,
        }

    // 10. Create Stripe checkout session with idempotency key
    let session
    try {
      // Use intake.id as fallback idempotency key if client didn't provide one
      const idempotencyKey = input.idempotencyKey || intake.id
      logger.info("Creating Stripe checkout session", { 
        intakeId: intake.id, 
        category: input.category,
        hasPriceId: !!priceId,
        idempotencyKey,
      })
      
      // Track checkout latency for observability
      const checkoutStartTime = performance.now()
      session = await stripe.checkout.sessions.create(sessionParams, {
        idempotencyKey: `checkout_${idempotencyKey}`,
      })
      const checkoutDurationMs = Math.round(performance.now() - checkoutStartTime)
      
      // Emit checkout latency metric via Sentry
      const Sentry = await import("@sentry/nextjs")
      Sentry.setMeasurement("checkout.stripe_session_create_ms", checkoutDurationMs, "millisecond")
      
      logger.info("Stripe checkout session created", { 
        sessionId: session.id, 
        hasUrl: !!session.url,
        latencyMs: checkoutDurationMs,
      })
    } catch (stripeError: unknown) {
      const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError)
      
      // Soft-delete: Mark as checkout_failed instead of hard delete (preserves audit trail)
      await supabase.from("intakes").update({ 
        status: "checkout_failed",
        checkout_error: errorMessage,
        updated_at: new Date().toISOString(),
      }).eq("id", intake.id)
      
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
      // Soft-delete: Mark as checkout_failed instead of hard delete
      await supabase.from("intakes").update({ 
        status: "checkout_failed",
        checkout_error: "No checkout URL returned from Stripe",
        updated_at: new Date().toISOString(),
      }).eq("id", intake.id)
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

    const latencyMs = Date.now() - startTime
    logger.info("Checkout session created successfully", {
      intakeId: intake.id,
      sessionId: session.id,
      latencyMs,
    })

    // Track funnel: payment initiated (checkout redirect)
    trackIntakeFunnelStep({
      step: "payment_initiated",
      intakeId: intake.id,
      serviceSlug: serviceSlug,
      serviceType: input.category,
      userId: authUser.user.id,
    })
    // Checkout latency tracking for OPERATIONS.md Golden Signals (P95 < 5s)
    if (latencyMs > 5000) {
      const Sentry = await import("@sentry/nextjs")
      Sentry.captureMessage(`Checkout latency exceeded 5s threshold`, {
        level: "warning",
        tags: {
          source: "checkout_latency",
          service_type: input.category,
          consult_subtype: input.subtype,
        },
        extra: { latencyMs, intakeId: intake.id },
      })
    }
    return { success: true, checkoutUrl: session.url, intakeId: intake.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logger.error("Unexpected error in createIntakeAndCheckoutAction", { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      category: input.category,
      subtype: input.subtype,
    })
    
    // Sentry capture with useful tags for money path failures
    const Sentry = await import("@sentry/nextjs")
    Sentry.captureException(error, {
      tags: {
        action: "checkout_session_create",
        service_type: input.category,
        consult_subtype: input.subtype,
        step_id: "checkout_outer_catch",
        checkout_error: "true",
      },
      extra: {
        category: input.category,
        subtype: input.subtype,
        serviceSlug: input.serviceSlug,
        latencyMs: Date.now() - startTime,
      },
    })
    
    return {
      success: false,
      error: "Something went wrong. Please try again or contact support if the issue persists.",
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

    // Rate limit payment retries to prevent abuse
    const rateLimitResult = await checkServerActionRateLimit(authUser.user.id, "sensitive")
    if (!rateLimitResult.success) {
      return { success: false, error: rateLimitResult.error || "Too many payment attempts. Please try again later." }
    }

    const patientId = authUser.profile.id
    const patientEmail = authUser.user.email

    const supabase = createServiceRoleClient()

    // Fetch the existing intake with ownership check, service details, and answers for safety re-validation
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("*, service:services!service_id(id, slug, name, type, price_cents), answers:intake_answers(answers)")
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

    // Re-validate safety rules before allowing retry payment
    // This prevents users from bypassing safety checks by saving an intake then retrying later
    const categoryForSafety = intake.category as ServiceCategory | null
    const serviceForSafety = intake.service as { slug: string; price_cents: number } | null
    const serviceSlugForSafety = serviceForSafety?.slug || getServiceSlug(categoryForSafety || "medical_certificate", intake.subtype || "")
    const intakeAnswers = (intake.answers as Array<{ answers: Record<string, unknown> }> | null)?.[0]?.answers || {}

    // AUDIT FIX: Validate safety-critical fields are present before evaluating rules
    const fieldCheck = validateSafetyFieldsPresent(serviceSlugForSafety, intakeAnswers)
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

    const safetyCheck = checkSafetyForServer(serviceSlugForSafety, intakeAnswers)
    
    if (!safetyCheck.isAllowed) {
      logger.warn("Safety check blocked retry payment", {
        intakeId,
        serviceSlug: serviceSlugForSafety,
        outcome: safetyCheck.outcome,
        triggeredRules: safetyCheck.triggeredRuleIds,
      })
      
      return {
        success: false,
        error: safetyCheck.blockReason || "This request cannot be processed online. Please see your regular doctor.",
      }
    }

    // Expire previous checkout session if it exists (P2 fix)
    if (intake.payment_id) {
      try {
        await stripe.checkout.sessions.expire(intake.payment_id)
        logger.info("Expired previous checkout session", { sessionId: intake.payment_id, intakeId })
      } catch (expireError) {
        // Session may already be expired or completed, that's okay
        logger.debug("Could not expire previous session (may be completed/expired)", { 
          sessionId: intake.payment_id, 
          error: expireError instanceof Error ? expireError.message : String(expireError)
        })
      }
    }

    // P3 FIX: Use stored stripe_price_id if available for pricing consistency
    // Fall back to recalculating from category if not stored (older intakes)
    const service = intake.service as { slug: string; price_cents: number } | null
    const storedPriceId = (intake as { stripe_price_id?: string }).stripe_price_id
    const storedCategory = intake.category as ServiceCategory | null
    
    const priceId = storedPriceId || getPriceIdForRequest({
      category: storedCategory || (service?.slug?.includes("med-cert") ? "medical_certificate" : "prescription"),
      subtype: intake.subtype || "",
      answers: {},
    })

    const baseUrl = getBaseUrl()
    if (!isValidUrl(baseUrl)) {
      return { success: false, error: "Server configuration error. Please contact support." }
    }

    const cookieStore = await cookies()
    const refCode = cookieStore.get("instantmed_ref")?.value ?? ""

    // Apply referral credit as Stripe coupon on retry too
    const priceCents = service?.price_cents ?? 0
    const referralCoupon = priceCents > 0
      ? await createReferralCouponIfEligible(patientId, priceCents)
      : null

    const sessionParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      ...(referralCoupon ? { discounts: [{ coupon: referralCoupon.couponId }] } : {}),
      mode: "payment" as const,
      success_url: `${baseUrl}/patient/intakes/success?intake_id=${intake.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/patient/intakes/cancelled?intake_id=${intake.id}`,
      metadata: {
        intake_id: intake.id,
        patient_id: patientId,
        is_retry: "true",
        category: intake.category || "",
        subtype: intake.subtype || "",
        service_slug: serviceSlugForSafety || "",
        ...(refCode ? { referral_code: refCode } : {}),
        ...(referralCoupon ? {
          referral_coupon_id: referralCoupon.couponId,
          referral_discount_cents: String(referralCoupon.discountCents),
        } : {}),
      },
      customer: authUser.profile.stripe_customer_id || undefined,
      customer_email: !authUser.profile.stripe_customer_id && patientEmail ? patientEmail : undefined,
      customer_creation: !authUser.profile.stripe_customer_id && patientEmail ? "always" as const : undefined,
    }

    let session
    try {
      // Use intake.id for retry idempotency key (stable, not timestamp-based)
      const retryIdempotencyKey = `retry_${intake.id}_${intake.payment_id || 'initial'}`
      session = await stripe.checkout.sessions.create(sessionParams, {
        idempotencyKey: retryIdempotencyKey,
      })
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

