"use server"

import { normalizeAttributionForStorage } from "@/lib/analytics/attribution-storage"
import { trackIntakeFunnelStep, trackOperationalBlock } from "@/lib/analytics/posthog-server"
import { resolveCheckoutAttribution } from "@/lib/analytics/server-attribution"
import {
  logAccuracyAttestationGiven,
  logRequestCreated,
  logTelehealthConsentGiven,
  logTermsConsentGiven,
  type RequestType,
} from "@/lib/audit/compliance-audit"
import { getAppUrl } from "@/lib/config/env"
import { checkCheckoutBlocked } from "@/lib/config/kill-switches"
import { CONTACT_EMAIL } from "@/lib/constants"
import { TELEHEALTH_CONSENT_VERSION,TERMS_VERSION } from "@/lib/constants"
import { decryptProfilePhi, updateProfile } from "@/lib/data/profiles"
import { isServiceDisabled, SERVICE_DISABLED_ERRORS } from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { isAtCapacity } from "@/lib/operational-controls/config"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { buildAddressAuditMetadata } from "@/lib/request/address-metadata"
import { requiresPrescribingIdentityForRequest } from "@/lib/request/prescribing-identity"
import { markPartialIntakeConverted } from "@/lib/request/server-draft-conversion"
import { recordSafetyEvaluationForOperators } from "@/lib/safety/audit-log"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ServiceCategory } from "@/types/services"

import { runClinicalValidation } from "./checkout/clinical-validation"
import { reportCheckoutSessionFailure } from "./checkout-error-alarm"
import { getAmountCentsForRequest, getOptionalStripePriceEnv, getPriceIdForRequest, stripe } from "./client"
import { shouldReuseGuestProfileForCheckout } from "./guest-profile-dedupe"
import { inferStripeLineItemFailureRole, stripePriceErrorUserMessage } from "./line-item-error"
import { buildPaymentIntentMetadata, canRetryPaymentForIntake, resolveGuestDuplicateCheckoutRecovery } from "./payment-integrity"
import {
  buildPrescribingProfileUpdates,
  validateRequiredPrescribingProfileAnswers,
} from "./prescribing-profile-fields"

const logger = createLogger("guest-checkout")

async function markGuestDraftConvertedIfPresent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  input: GuestCheckoutInput,
  intakeId: string,
): Promise<void> {
  if (!input.serverDraftSessionId) return

  await markPartialIntakeConverted(supabase, {
    intakeId,
    sessionId: input.serverDraftSessionId,
  })
}

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
    gclid?: string
    gbraid?: string
    wbraid?: string
    utm_source?: string
    utm_medium?: string
    utm_id?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
    campaignid?: string
    adgroupid?: string
    keyword?: string
    creative?: string
    matchtype?: string
    device?: string
    network?: string
    referrer?: string
    landing_page?: string
    captured_at?: string
  }
  posthogDistinctId?: string // Client-side PostHog distinct ID for identity stitching
  serverDraftSessionId?: string
}

interface CheckoutResult {
  success: boolean
  checkoutUrl?: string
  intakeId?: string
  error?: string
}

interface ExistingGuestProfile {
  id: string
  email: string | null
  email_verified: boolean | null
  full_name: string | null
  date_of_birth: string | null
  phone: string | null
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

function buildGuestProfileIdentityUpdate(
  existingProfile: ExistingGuestProfile,
  input: GuestCheckoutInput,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {}

  if (input.guestPhone && !existingProfile.phone) {
    updates.phone = input.guestPhone
  }
  if (input.guestDateOfBirth && !existingProfile.date_of_birth) {
    updates.date_of_birth = input.guestDateOfBirth
  }
  if (input.guestName && (!existingProfile.full_name || existingProfile.full_name.includes("@"))) {
    updates.full_name = input.guestName
  }

  return updates
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
 * Rebuild a Stripe checkout session for a guest intake whose prior session
 * has expired or was never created (checkout_failed / pending with null URL).
 * Mirrors the retry-payment flow: expire old session → create new → update intake.
 */
async function rebuildExpiredGuestSession(
  supabase: ReturnType<typeof createServiceRoleClient>,
  intake: {
    id: string
    category: string | null
    subtype: string | null
    stripe_price_id: string | null
    is_priority: boolean | null
    guest_email: string | null
    payment_id: string | null
  },
  fallbackGuestEmail: string,
  baseUrl: string,
): Promise<string | null> {
  if (intake.payment_id) {
    try {
      await stripe.checkout.sessions.expire(intake.payment_id)
    } catch {
      // Already expired or completed — safe to continue
    }
  }

  const priceId =
    intake.stripe_price_id ||
    getPriceIdForRequest({
      category: (intake.category || "medical_certificate") as ServiceCategory,
      subtype: intake.subtype || "",
      answers: {},
    })
  if (!priceId) return null

  const isPriority = intake.is_priority === true
  const priorityPriceId = isPriority ? getOptionalStripePriceEnv("STRIPE_PRICE_PRIORITY_FEE") : null
  const lineItems: Array<{ price: string; quantity: number }> = [{ price: priceId, quantity: 1 }]
  if (isPriority && priorityPriceId) lineItems.push({ price: priorityPriceId, quantity: 1 })

  const guestEmail = intake.guest_email || fallbackGuestEmail

  try {
    const session = await stripe.checkout.sessions.create(
      {
        line_items: lineItems,
        mode: "payment",
        success_url: `${baseUrl}/auth/complete-account?intake_id=${intake.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/patient/intakes/cancelled?intake_id=${intake.id}`,
        customer_email: guestEmail,
        customer_creation: "always",
        metadata: {
          intake_id: intake.id,
          is_retry: "true",
          category: intake.category || "",
          subtype: intake.subtype || "",
          guest_checkout: "true",
        },
      },
      { idempotencyKey: `resume_${intake.id}_${intake.payment_id || "initial"}` },
    )

    if (!session.url) return null

    const { error: updateError } = await supabase
      .from("intakes")
      .update({
        payment_id: session.id,
        payment_status: "pending",
        status: "pending_payment",
        checkout_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intake.id)
      .in("status", ["pending_payment", "checkout_failed"])
      .in("payment_status", ["pending", "unpaid", "failed"])

    if (updateError) {
      logger.error("Failed to update intake after session rebuild", { intakeId: intake.id }, updateError)
      return null
    }

    return session.url
  } catch (error) {
    logger.error("Failed to rebuild guest checkout session", {
      intakeId: intake.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

async function markGuestCheckoutFailed(
  supabase: ReturnType<typeof createServiceRoleClient>,
  intakeId: string,
  checkoutError: string,
) {
  await supabase
    .from("intakes")
    .update({
      checkout_error: checkoutError,
      status: "checkout_failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)
}

/**
 * Create a guest checkout session without requiring authentication
 * Creates a minimal guest profile, intake, and Stripe checkout
 * Uses intakes table as the canonical case object (same as authenticated flow)
 */
export async function createGuestCheckoutAction(input: GuestCheckoutInput): Promise<CheckoutResult> {
  try {
    const resolvedAttribution = await resolveCheckoutAttribution(input.attribution)

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

    // Capacity limit must be enforced at the server action layer, not just the request page.
    if (await isAtCapacity()) {
      trackOperationalBlock({
        blockType: "capacity_limit",
        metadata: { checkout_type: "guest" },
        source: "checkout",
      })
      return {
        success: false,
        error: "We're experiencing high demand today. Please try again tomorrow.",
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

    if (requiresPrescribingIdentityForRequest({ category: input.category, subtype: input.subtype })) {
      const prescribingIdentityError = validateRequiredPrescribingProfileAnswers(input.answers)
      if (prescribingIdentityError) {
        return { success: false, error: prescribingIdentityError }
      }
    }

    // Zod payload validation + blocklist + S8 hard-block + safety fields + safety rules
    const clinicalResult = await runClinicalValidation({
      category: input.category,
      subtype: input.subtype,
      type: input.type,
      answers: input.answers,
      serviceSlug: input.serviceSlug,
      idempotencyKey: "",
    })
    if (!clinicalResult.ok) {
      return { success: false, error: clinicalResult.error }
    }
    const { serviceSlugForSafety, safetyCheck, intakeFlags } = clinicalResult.data

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
      logger.warn("Guest checkout rate limited", { category: input.category })
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

    // Check for existing guest profiles. Verified guest profiles are safe to
    // reuse by email. Unverified profiles require a second identity match so
    // guessed emails cannot hijack a previous guest profile.
    const { data: existingGuestProfiles } = await supabase
      .from("profiles")
      .select(`
        id, auth_user_id, email, email_verified, full_name,
        date_of_birth, date_of_birth_encrypted, phone, phone_encrypted,
        updated_at
      `)
      .eq("email", normalizedEmail)
      .is("auth_user_id", null)
      .order("email_verified", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(10)

    const reusableGuestProfile = (existingGuestProfiles || [])
      .map(row => decryptProfilePhi(row as Record<string, unknown>) as unknown as ExistingGuestProfile)
      .find(profile => shouldReuseGuestProfileForCheckout(profile, {
        guestEmail: input.guestEmail,
        guestName: input.guestName,
        guestDateOfBirth: input.guestDateOfBirth,
        guestPhone: input.guestPhone,
      }))

    if (reusableGuestProfile) {
      guestProfileId = reusableGuestProfile.id
      const profileUpdates = buildGuestProfileIdentityUpdate(reusableGuestProfile, input)
      if (Object.keys(profileUpdates).length > 0) {
        await supabase
          .from("profiles")
          .update(profileUpdates)
          .eq("id", guestProfileId)
      }
    } else if ((existingGuestProfiles || []).length > 0) {
      logger.info("Skipping guest profile reuse because identity evidence did not match", {
        candidateCount: existingGuestProfiles?.length || 0,
      })
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

    if (requiresPrescribingIdentityForRequest({ category: input.category, subtype: input.subtype })) {
      const prescribingUpdates = buildPrescribingProfileUpdates(input.answers)
      if (Object.keys(prescribingUpdates).length > 0) {
        const updatedProfile = await updateProfile(guestProfileId, prescribingUpdates)
        if (!updatedProfile) {
          return { success: false, error: "Failed to save prescribing details. Please try again." }
        }
      }
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
    const amountCents = getAmountCentsForRequest({
      category: input.category,
      subtype: input.subtype,
      answers: input.answers,
    })
    const isPriority = input.answers.is_priority === true || input.answers.isPriority === true
    const priorityPriceId = isPriority ? getOptionalStripePriceEnv("STRIPE_PRICE_PRIORITY_FEE") : null
    if (isPriority && !priorityPriceId) {
      return {
        success: false,
        error: "Express Review is temporarily unavailable. Please try again without Express Review or contact support.",
      }
    }

    // 3. Create the intake with pending_payment status
    // Include category, subtype, idempotency_key, guest_email, and stripe_price_id
    // Idempotency key: 10-minute time bucket prevents double-clicks while allowing legitimate repeat requests
    const { createHash } = await import("crypto")
    const guestIdempotencyKey = `guest-${createHash("sha256")
      .update(`${normalizedEmail}:${input.category}:${input.subtype}:${Math.floor(Date.now() / 600_000)}:${JSON.stringify(input.answers)}`)
      .digest("hex")
      .slice(0, 24)}`
    const attribution = normalizeAttributionForStorage(resolvedAttribution)
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .insert({
        patient_id: guestProfileId,
        service_id: service.id,
        status: "pending_payment",
        payment_status: "pending",
        amount_cents: amountCents,
        category: input.category,
        subtype: input.subtype || null,
        is_priority: isPriority,
        idempotency_key: guestIdempotencyKey,
        guest_email: normalizedEmail, // P1 FIX: Store for abandoned checkout recovery
        stripe_price_id: priceId || null, // P3 FIX: Store for retry pricing consistency
        // Attribution: store UTM params for payment attribution in PostHog
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_id: attribution.utm_id,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
        referrer: attribution.referrer,
        landing_page: attribution.landing_page,
        attribution_captured_at: attribution.attribution_captured_at,
        // Google Ads click identifiers - used by the server-side Conversion API
        // to attribute purchases back to the originating ad click. Recovers
        // ~30% of attribution lost to iOS Safari ITP.
        gclid: attribution.gclid,
        gbraid: attribution.gbraid,
        wbraid: attribution.wbraid,
        // Google Ads ValueTrack fields used to debug campaign/ad group/keyword
        // quality when click IDs are missing or conversion upload is delayed.
        campaignid: attribution.campaignid,
        adgroupid: attribution.adgroupid,
        keyword: attribution.keyword,
        creative: attribution.creative,
        matchtype: attribution.matchtype,
        device: attribution.device,
        network: attribution.network,
      })
      .select("id")
      .single()

    if (intakeError || !intake) {
      if (intakeError?.code === "23505") {
        const { data: existingIntake } = await supabase
          .from("intakes")
          .select("id, status, payment_status, payment_id, category, subtype, stripe_price_id, is_priority, guest_email")
          .eq("idempotency_key", guestIdempotencyKey)
          .eq("patient_id", guestProfileId)
          .maybeSingle()

        if (existingIntake) {
          let checkoutUrl: string | null = null
          if (existingIntake.payment_id && existingIntake.payment_status !== "paid") {
            try {
              const existingSession = await stripe.checkout.sessions.retrieve(existingIntake.payment_id)
              checkoutUrl = existingSession.url || null
            } catch (stripeError) {
              logger.warn("Could not retrieve duplicate guest checkout session", {
                intakeId: existingIntake.id,
                error: stripeError instanceof Error ? stripeError.message : String(stripeError),
              })
            }
          }

          // Retryable intake with no live Stripe URL (expired or failed session) — rebuild.
          if (!checkoutUrl && canRetryPaymentForIntake(existingIntake.status, existingIntake.payment_status)) {
            const rebuiltUrl = await rebuildExpiredGuestSession(
              supabase,
              existingIntake,
              input.guestEmail,
              baseUrl,
            )
            if (rebuiltUrl) {
              await markGuestDraftConvertedIfPresent(supabase, input, existingIntake.id)
              logger.info("Rebuilt expired guest checkout session", { intakeId: existingIntake.id })
              return { success: true, checkoutUrl: rebuiltUrl, intakeId: existingIntake.id }
            }
          }

          const recovery = resolveGuestDuplicateCheckoutRecovery({
            baseUrl,
            checkoutUrl,
            intake: existingIntake,
          })

          if (recovery.success) {
            await markGuestDraftConvertedIfPresent(supabase, input, recovery.intakeId)
            logger.info("Recovered duplicate guest checkout attempt", {
              intakeId: recovery.intakeId,
              hasCheckoutUrl: !!checkoutUrl,
            })
            return {
              success: true,
              checkoutUrl: recovery.checkoutUrl,
              intakeId: recovery.intakeId,
            }
          }

          return { success: false, error: recovery.error }
        }
      }

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

    await markGuestDraftConvertedIfPresent(supabase, input, intake.id)

    await Promise.all([
      recordSafetyEvaluationForOperators({
        answers: input.answers,
        context: "checkout",
        requestId: intake.id,
        result: safetyCheck,
        serviceSlug: serviceSlugForSafety,
      }),
      supabase
        .from("intakes")
        .update({
          risk_tier: safetyCheck.riskTier,
          triage_result: "allow",
          triage_reasons: safetyCheck.triggeredRuleIds,
          requires_live_consult: safetyCheck.requiresCall,
          live_consult_reason: safetyCheck.blockReason || null,
          risk_flags: intakeFlags,
        })
        .eq("id", intake.id),
    ])

    // Compliance audit: log request creation and consent for LegitScript/AHPRA defensibility
    // Placed after answers insert so these records never orphan if the intake is rolled back.
    const requestType = mapCategoryToRequestType(input.category, input.subtype || "")
    await logRequestCreated(intake.id, requestType, guestProfileId, {
      category: input.category,
      subtype: input.subtype,
      guest: true,
      ...buildAddressAuditMetadata(input.answers),
    })
    // Per-episode consent evidence (CLINICAL.md)
    await Promise.all([
      logTermsConsentGiven(intake.id, requestType, guestProfileId, TERMS_VERSION),
      logTelehealthConsentGiven(intake.id, requestType, guestProfileId, TELEHEALTH_CONSENT_VERSION),
      logAccuracyAttestationGiven(intake.id, requestType, guestProfileId),
    ])

    // 5. Validate price ID (already fetched above)
    if (!priceId) {
      await markGuestCheckoutFailed(supabase, intake.id, "Missing Stripe price ID")
      return { success: false, error: "Unable to determine pricing. Please contact support." }
    }

    // 6. Build success and cancel URLs
    // Note: Email is passed for account completion flow - retrieved server-side for security
    const successUrl = `${baseUrl}/auth/complete-account?intake_id=${intake.id}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/patient/intakes/cancelled?intake_id=${intake.id}`

    // 7. Create Stripe checkout session
    let session
    let lineItems: Array<{ price: string; quantity: number }> = []
    try {
      logger.info("Creating guest Stripe checkout session", { 
        intakeId: intake.id, 
        category: input.category,
      })
      const sessionMetadata = buildPaymentIntentMetadata({
        intake_id: intake.id,
        patient_id: guestProfileId,
        category: input.category,
        subtype: input.subtype,
        service_slug: serviceSlug,
        guest_checkout: "true",
        ...(isPriority ? { is_priority: "true" } : {}),
        ...(input.posthogDistinctId ? { ph_distinct_id: input.posthogDistinctId } : {}),
        // Google Ads click IDs for Enhanced Conversions attribution
        ...(attribution.gclid ? { gclid: attribution.gclid } : {}),
        ...(attribution.gbraid ? { gbraid: attribution.gbraid } : {}),
        ...(attribution.wbraid ? { wbraid: attribution.wbraid } : {}),
        ...(attribution.utm_source ? { utm_source: attribution.utm_source } : {}),
        ...(attribution.utm_medium ? { utm_medium: attribution.utm_medium } : {}),
        ...(attribution.utm_id ? { utm_id: attribution.utm_id } : {}),
        ...(attribution.utm_campaign ? { utm_campaign: attribution.utm_campaign } : {}),
        ...(attribution.campaignid ? { campaignid: attribution.campaignid } : {}),
        ...(attribution.adgroupid ? { adgroupid: attribution.adgroupid } : {}),
        ...(attribution.keyword ? { keyword: attribution.keyword } : {}),
        ...(attribution.creative ? { creative: attribution.creative } : {}),
        ...(attribution.matchtype ? { matchtype: attribution.matchtype } : {}),
        ...(attribution.device ? { device: attribution.device } : {}),
        ...(attribution.network ? { network: attribution.network } : {}),
      })
      // Use intake ID as idempotency key to prevent duplicate sessions on double-click
      lineItems = [
        {
          price: priceId,
          quantity: 1,
        },
      ]
      if (isPriority && priorityPriceId) {
        lineItems.push({ price: priorityPriceId, quantity: 1 })
      }
      session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        // Enable promo code field on Stripe checkout (campaigns, partner deals, win-back, etc.)
        allow_promotion_codes: true,
        customer_email: input.guestEmail,
        customer_creation: "always",
        metadata: sessionMetadata,
        payment_intent_data: {
          metadata: sessionMetadata,
        },
      }, {
        idempotencyKey: `guest-checkout-${intake.id}`,
      })
      logger.info("Guest Stripe checkout session created", { 
        sessionId: session.id, 
        hasUrl: !!session.url 
      })
    } catch (stripeError: unknown) {
      const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError)
      const failedPriceRole = inferStripeLineItemFailureRole(errorMessage, lineItems)
      await markGuestCheckoutFailed(supabase, intake.id, errorMessage)

      // Escalate to Sentry. "No such price" is a config catastrophe (every guest
      // checkout for that tier fails until the env is fixed) and previously fired
      // no alarm — logger.error only reaches Sentry when given an Error object.
      const { isMisconfiguredPrice } = await reportCheckoutSessionFailure(stripeError, {
        intakeId: intake.id,
        category: input.category,
        failedPriceRole,
      })

      if (isMisconfiguredPrice) {
        return {
          success: false,
          error: stripePriceErrorUserMessage(failedPriceRole),
        }
      }
      return {
        success: false,
        error: "Payment system error. Please try again or contact support if the issue persists.",
      }
    }

    if (!session.url) {
      logger.error("Stripe session created but no URL returned", { sessionId: session.id })
      await markGuestCheckoutFailed(supabase, intake.id, "No checkout URL returned from Stripe")
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
