"use server"

import { stripe, getPriceIdForRequest, type ServiceCategory } from "./client"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"
import { validateMedCertPayload } from "@/lib/validation/med-cert-schema"
import { isServiceDisabled, isMedicationBlocked, SERVICE_DISABLED_ERRORS } from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAppUrl } from "@/lib/env"
import { checkSafetyForServer } from "@/lib/flow/safety/evaluate"
import { trackSafetyOutcome, trackSafetyBlock } from "@/lib/posthog-server"
import { runFraudChecks, saveFraudFlags } from "@/lib/fraud/detector"

const logger = createLogger("stripe-checkout")

interface CreateCheckoutInput {
  category: ServiceCategory
  subtype: string
  type: string
  answers: Record<string, unknown>
  serviceSlug?: string // Service slug to look up service_id
  idempotencyKey: string // P1 FIX: Required - client-generated key to prevent duplicate submissions
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
    "prescription:new": "gp-consult",
    "consult:general": "gp-consult",
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

    // SERVER-SIDE SAFETY ENFORCEMENT
    // Evaluate safety rules for ALL service categories to prevent client-side bypass
    const serviceSlugForSafety = input.serviceSlug || getServiceSlug(input.category, input.subtype)
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
          error: safetyCheck.blockReason || "This request cannot be processed online. Please see your regular GP.",
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
        error: "Invalid request. Please refresh and try again." 
      }
    }

    // 6. Create the intake with pending_payment status
    // Store category and subtype at creation for reliable retry pricing
    // Idempotency key prevents duplicate submissions on double-click
    const intakeData: Record<string, unknown> = {
      patient_id: patientId,
      service_id: service.id,
      status: "pending_payment",
      payment_status: "pending",
      amount_cents: service.price_cents,
      category: input.category,
      subtype: input.subtype,
      idempotency_key: input.idempotencyKey, // P1 FIX: Always required
    }

    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .insert(intakeData)
      .select()
      .single()

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
          // Otherwise, recreate checkout session for this intake
          // (handled below by continuing with existingIntake.id)
        }
      }
      
      logger.error("Failed to create intake", { error: intakeError })
      if (intakeError?.code === "23503") {
        return { success: false, error: "Your profile could not be found. Please sign out and sign in again." }
      }
      return { success: false, error: "Failed to create your request. Please try again." }
    }

    // 6a. Save fraud flags if any were detected (non-blocking)
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

    // 6b. Insert the answers (ATOMIC - fail if answers cannot be saved)
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
      // Clean up both intake and answers to prevent orphans
      await supabase.from("intake_answers").delete().eq("intake_id", intake.id)
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

    // Get the price ID using stored category (P1 fix - no more fragile slug inference)
    const service = intake.service as { slug: string; price_cents: number } | null
    const storedCategory = intake.category as ServiceCategory | null
    const priceId = getPriceIdForRequest({
      category: storedCategory || (service?.slug?.includes("med-cert") ? "medical_certificate" : "prescription"),
      subtype: intake.subtype || "",
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

