"use server"

/**
 * Unified Checkout Action
 * 
 * Bridges the new unified /request flow to existing checkout infrastructure.
 * Handles both authenticated and guest checkout flows.
 */

import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { getAppUrl } from "@/lib/config/env"
import { updateProfile } from "@/lib/data/profiles"
import { buildSignedCheckoutResumeUrl } from "@/lib/email/recovery-links"
import { findConvertedPartialIntakeForCheckout } from "@/lib/request/server-draft-conversion"
import {
  resolveCheckoutSubtype,
  transformAnswersForUnifiedCheckout,
  validateAnswersServerSide,
} from "@/lib/request/unified-checkout"
import { createIntakeAndCheckoutAction, retryPaymentForIntakeAction } from "@/lib/stripe/checkout"
import { buildAuthenticatedCheckoutSubmissionKey, buildGuestCheckoutSubmissionKey } from "@/lib/stripe/checkout-submission-key"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"
import { canRetryPaymentForIntake } from "@/lib/stripe/payment-integrity"
import { buildCheckoutIdentityProfileUpdates } from "@/lib/stripe/prescribing-profile-fields"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ServiceCategory, UnifiedServiceType } from "@/types/services"

interface UnifiedCheckoutInput {
  serviceType: UnifiedServiceType
  answers: Record<string, unknown>
  identity: {
    email?: string
    fullName?: string
    dateOfBirth?: string
    phone?: string
  }
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
  posthogDistinctId?: string
  serverDraftSessionId?: string
}

interface CheckoutResult {
  success: boolean
  checkoutUrl?: string
  intakeId?: string
  error?: string
}

/**
 * Map unified service type to Stripe category and subtype.
 *
 * Both 'prescription' and 'repeat-script' map to subtype: 'repeat' so that
 * persisted localStorage drafts can round-trip safely through checkout.
 *
 * Reason: the UI/URL convention emits `serviceType: 'repeat-script'`, but
 * the draft-storage canonical form is `'prescription'` (see
 * `lib/request/draft-storage.ts` `canonicalizeServiceType`, which normalises
 * `'prescription' | 'repeat-script' | 'repeat-rx' | 'repeat-prescription'`
 * → `'prescription'` before persisting). A returning patient whose draft
 * rehydrates as `'prescription'` must land in the same repeat-script
 * checkout path the URL flow would take.
 *
 * No production UI emits `serviceType: 'prescription'` directly — the
 * patient-request-links contract test forbids `/request?service=prescription`.
 *
 * NEW (not repeat) prescriptions go through the `consult` service type at
 * the new-prescription price point ($49.95), NOT through this mapping.
 */
function mapServiceToCategory(serviceType: UnifiedServiceType): { category: ServiceCategory; subtype: string } {
  // Consult has no base subtype — resolveCheckoutSubtype must read it from
  // answers.consultSubtype. Reaching this with an empty consult subtype is a
  // bug (upstream redirect/validation should have caught it).
  const mapping: Record<UnifiedServiceType, { category: ServiceCategory; subtype: string }> = {
    'med-cert': { category: 'medical_certificate', subtype: 'work' },
    'prescription': { category: 'prescription', subtype: 'repeat' },
    'repeat-script': { category: 'prescription', subtype: 'repeat' },
    'consult': { category: 'consult', subtype: '' },
  }
  return mapping[serviceType] || mapping['med-cert']
}

/**
 * Create checkout session from unified flow data
 */
export async function createCheckoutFromUnifiedFlow(
  input: UnifiedCheckoutInput
): Promise<CheckoutResult> {
  const { serviceType, answers, identity, attribution, posthogDistinctId, serverDraftSessionId } = input
  const { category, subtype } = mapServiceToCategory(serviceType)
  
  // Update subtype based on answers
  const finalSubtype = resolveCheckoutSubtype(serviceType, answers, subtype)
  
  // Server-side validation before proceeding to checkout
  const validationError = validateAnswersServerSide(serviceType, answers, identity)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const transformedAnswers = transformAnswersForUnifiedCheckout(serviceType, answers)

  // Check if user is authenticated
  const authResult = await getAuthenticatedUserWithProfile()
  const convertedDraft = await findConvertedPartialIntakeForCheckout(
    createServiceRoleClient(),
    {
      category,
      email: authResult?.user.email ?? identity.email,
      sessionId: serverDraftSessionId,
      subtype: finalSubtype,
    },
  )

  if (convertedDraft.kind === "blocked") {
    return {
      success: false,
      error: convertedDraft.reason === "identity_mismatch"
        ? "This saved request belongs to a different email. Use the email from the request or contact support."
        : "This saved request does not match the service you are trying to pay for. Please start again.",
    }
  }

  let activeServerDraftSessionId = serverDraftSessionId
  if (convertedDraft.kind === "reusable") {
    const { intake } = convertedDraft
    const isOwnedByAuthenticatedPatient = Boolean(
      authResult?.profile && intake.patientId === authResult.profile.id,
    )

    if (intake.paymentStatus === "paid") {
      return {
        success: true,
        intakeId: intake.id,
        checkoutUrl: isOwnedByAuthenticatedPatient
          ? `${getAppUrl().replace(/\/$/, "")}/patient/intakes/${intake.id}`
          : buildSignedCheckoutResumeUrl({ appUrl: getAppUrl(), intakeId: intake.id }),
      }
    }

    if (canRetryPaymentForIntake(intake.status, intake.paymentStatus)) {
      if (isOwnedByAuthenticatedPatient) {
        return retryPaymentForIntakeAction(intake.id)
      }
      return {
        success: true,
        intakeId: intake.id,
        checkoutUrl: buildSignedCheckoutResumeUrl({ appUrl: getAppUrl(), intakeId: intake.id }),
      }
    }

    // A terminal request should not permanently pin this browser to an old
    // draft. Let a genuinely fresh submission use the normal time bucket.
    activeServerDraftSessionId = undefined
  }
  
  if (authResult?.user && authResult?.profile) {
    const identityUpdates = buildCheckoutIdentityProfileUpdates(authResult.profile, identity)
    if (Object.keys(identityUpdates).length > 0) {
      const updatedProfile = await updateProfile(authResult.profile.id, identityUpdates)
      if (!updatedProfile) {
        return { success: false, error: "Failed to save patient details. Please try again." }
      }
    }

    // Authenticated checkout
    return createIntakeAndCheckoutAction({
      category,
      subtype: finalSubtype,
      type: serviceType,
      answers: transformedAnswers,
      // A saved server draft is the canonical submission identity across guest
      // and authenticated checkout. Without one, preserve the 10-minute
      // double-click bucket so legitimate later requests still create a new row.
      idempotencyKey: buildAuthenticatedCheckoutSubmissionKey({
        answers: transformedAnswers,
        category,
        patientId: authResult.profile.id,
        serverDraftSessionId: activeServerDraftSessionId,
        serviceType,
        subtype: finalSubtype,
      }),
      attribution,
      posthogDistinctId,
      serverDraftSessionId: activeServerDraftSessionId,
    })
  } else {
    // Guest checkout - requires identity info
    if (!identity.email) {
      return {
        success: false,
        error: 'Email is required for guest checkout',
      }
    }
    
    // Phone required for prescriptions (eScript SMS delivery) and consult callbacks.
    if ((serviceType === 'prescription' || serviceType === 'repeat-script' || serviceType === 'consult') && !identity.phone) {
      return {
        success: false,
        error: serviceType === 'consult'
          ? 'Phone number is required so the doctor can contact you about your consultation.'
          : 'Phone number is required for prescription requests to receive your eScript via SMS.',
      }
    }
    
    return createGuestCheckoutAction({
      category,
      subtype: finalSubtype,
      type: serviceType,
      answers: transformedAnswers,
      guestEmail: identity.email,
      guestName: identity.fullName,
      guestDateOfBirth: identity.dateOfBirth,
      guestPhone: identity.phone,
      attribution,
      posthogDistinctId,
      checkoutSubmissionKey: buildGuestCheckoutSubmissionKey({
        answers: transformedAnswers,
        category,
        email: identity.email,
        serverDraftSessionId: activeServerDraftSessionId,
        subtype: finalSubtype,
      }),
      serverDraftSessionId: activeServerDraftSessionId,
    })
  }
}
