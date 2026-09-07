"use server"

/**
 * Unified Checkout Action
 * 
 * Bridges the new unified /request flow to existing checkout infrastructure.
 * Handles both authenticated and guest checkout flows.
 */

import { normalizeFlowInstanceId } from "@/lib/analytics/flow-instance"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { getAppUrl } from "@/lib/config/env"
import { updateProfile } from "@/lib/data/profiles"
import { buildSignedCheckoutResumeUrl } from "@/lib/email/recovery-links"
import {
  normalizeIncomingGrowthExperienceVersion,
  selectGrowthExperienceVersion,
} from "@/lib/growth/specialty-experience-attribution"
import { findConvertedPartialIntakeForCheckout } from "@/lib/request/server-draft-conversion"
import {
  resolveCheckoutSubtype,
  transformAnswersForUnifiedCheckout,
  validateAnswersServerSide,
} from "@/lib/request/unified-checkout"
import { createIntakeAndCheckoutAction, retryPaymentForIntakeAction } from "@/lib/stripe/checkout"
import { reconcileTerminalDraftCheckout } from "@/lib/stripe/checkout/restored-draft-recovery"
import type { CheckoutResult } from "@/lib/stripe/checkout/types"
import { checkoutFailure } from "@/lib/stripe/checkout-failure"
import { buildAuthenticatedCheckoutSubmissionKey, buildGuestCheckoutSubmissionKey } from "@/lib/stripe/checkout-submission-key"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"
import { canRetryPaymentForIntake, isTerminalPaidPaymentStatus } from "@/lib/stripe/payment-integrity"
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
  flowInstanceId?: string
  growthExperienceVersion?: string
  serverDraftSessionId?: string
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
async function createCheckoutFromUnifiedFlowInternal(
  input: UnifiedCheckoutInput
): Promise<CheckoutResult> {
  const {
    serviceType,
    answers,
    identity,
    attribution,
    posthogDistinctId,
    serverDraftSessionId,
  } = input
  const flowInstanceId = normalizeFlowInstanceId(input.flowInstanceId) ?? undefined
  const { category, subtype } = mapServiceToCategory(serviceType)
  const draftServiceType = serviceType === "repeat-script"
    ? "prescription"
    : serviceType
  
  // Update subtype based on answers
  const finalSubtype = resolveCheckoutSubtype(serviceType, answers, subtype)
  const growthContext = {
    serviceType,
    subtype: finalSubtype,
  }
  const candidateGrowthExperienceVersion =
    normalizeIncomingGrowthExperienceVersion(
      input.growthExperienceVersion,
      growthContext,
    )
  
  // Server-side validation before proceeding to checkout
  const validationError = validateAnswersServerSide(serviceType, answers, identity)
  if (validationError) {
    return checkoutFailure("clinical_or_input_validation", validationError)
  }

  const transformedAnswers = transformAnswersForUnifiedCheckout(serviceType, answers)

  // Check if user is authenticated
  const authResult = await getAuthenticatedUserWithProfile()
  if (authResult?.user && !authResult.profile) {
    return checkoutFailure("auth_or_session", "We couldn't verify your profile. Please sign in again.")
  }
  const convertedDraft = await findConvertedPartialIntakeForCheckout(
    createServiceRoleClient(),
    {
      category,
      email: authResult?.user.email ?? identity.email,
      patientId: authResult?.profile?.id,
      flowInstanceId,
      serviceType: draftServiceType,
      sessionId: serverDraftSessionId,
      subtype: finalSubtype,
    },
  )

  if (convertedDraft.kind === "blocked") {
    const blockedMessages = {
      discarded:
        "This saved request was discarded. Contact support to check any earlier payment before starting again.",
      identity_mismatch:
        "We couldn’t verify access to this saved request. Sign in with the email you used, or contact support for help.",
      query_error:
        "We couldn’t safely verify this saved request. Contact support before starting another payment.",
      request_mismatch:
        "We couldn’t match this browser to the saved request. Contact support to recover access before starting another payment.",
      service_mismatch:
        "This saved form is for a different service. Contact support to recover it before starting another payment.",
    } as const
    return checkoutFailure(
      convertedDraft.reason === "query_error" ? "persistence" : "auth_or_session",
      blockedMessages[convertedDraft.reason],
      convertedDraft.reason === "identity_mismatch" ? { requiresSignIn: true } : { requiresSupport: true },
    )
  }

  // A draft bearer is useful for submission identity only after the service
  // role has verified that it belongs to this exact flow. Only missing,
  // expired, or malformed bearer inputs fall back to ordinary checkout;
  // verification errors and explicit discard fail closed above.
  const activeServerDraftSessionId =
    convertedDraft.kind === "reusable" ||
    (convertedDraft.kind === "none" && convertedDraft.reason === "not_converted")
      ? serverDraftSessionId
      : undefined
  const growthExperienceVersion = selectGrowthExperienceVersion({
    storedValue:
      convertedDraft.kind === "reusable"
        ? convertedDraft.intake.growthExperienceVersion
        : convertedDraft.kind === "none"
          ? convertedDraft.growthExperienceVersion
          : null,
    candidateValue: candidateGrowthExperienceVersion,
    context: growthContext,
  })
  if (convertedDraft.kind === "reusable" || convertedDraft.kind === "service_changed") {
    const { intake } = convertedDraft
    const isOwnedByAuthenticatedPatient = Boolean(
      authResult?.profile && intake.patientId === authResult.profile.id,
    )

    // A signed-in browser cannot use a foreign draft bearer as a profile
    // switch. Guests need the verified bearer plus the matching captured email.
    if ((authResult?.user && !isOwnedByAuthenticatedPatient) || (!authResult?.user && (
      !intake.patientId || !identity.email || !intake.guestEmail ||
      identity.email.trim().toLowerCase() !== intake.guestEmail.trim().toLowerCase()
    ))) {
      return checkoutFailure("auth_or_session", "We couldn't verify ownership of this saved request. Sign in to the matching account or contact support.", { requiresSignIn: true })
    }

    if (convertedDraft.kind === "service_changed") {
      return checkoutFailure("auth_or_session", "Your saved request is for a different service. Return to it to check its payment status before starting another request.", {
        savedRequestUrl: isOwnedByAuthenticatedPatient
          ? `${getAppUrl().replace(/\/$/, "")}/patient/intakes/${intake.id}`
          : buildSignedCheckoutResumeUrl({ appUrl: getAppUrl(), intakeId: intake.id }),
      })
    }

    if (isTerminalPaidPaymentStatus(intake.paymentStatus)) {
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

    if ((intake.status === "cancelled" || intake.status === "expired") && intake.patientId) {
      return reconcileTerminalDraftCheckout({
        supabase: createServiceRoleClient(), patientId: intake.patientId,
        intake: {
          id: intake.id, status: intake.status, payment_status: intake.paymentStatus,
          payment_id: intake.paymentId, checkout_error: intake.checkoutError,
        },
        existingUrl: isOwnedByAuthenticatedPatient
          ? `${getAppUrl().replace(/\/$/, "")}/patient/intakes/${intake.id}`
          : buildSignedCheckoutResumeUrl({ appUrl: getAppUrl(), intakeId: intake.id }),
      })
    }
    return checkoutFailure("auth_or_session", "This request is not awaiting payment. Please check its status or contact support.", { requiresSupport: true })
  }
  
  if (authResult?.user && authResult?.profile) {
    const identityUpdates = buildCheckoutIdentityProfileUpdates(authResult.profile, identity)
    if (Object.keys(identityUpdates).length > 0) {
      const updatedProfile = await updateProfile(authResult.profile.id, identityUpdates)
      if (!updatedProfile) {
        return checkoutFailure(
          "persistence",
          "Failed to save patient details. Please try again.",
        )
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
      flowInstanceId,
      growthExperienceVersion: growthExperienceVersion ?? undefined,
      posthogDistinctId,
      serverDraftSessionId: activeServerDraftSessionId,
    })
  } else {
    // Guest checkout - requires identity info
    if (!identity.email) {
      return checkoutFailure(
        "clinical_or_input_validation",
        "Email is required for guest checkout",
      )
    }
    
    // Phone required for prescriptions (eScript SMS delivery) and consult callbacks.
    if ((serviceType === 'prescription' || serviceType === 'repeat-script' || serviceType === 'consult') && !identity.phone) {
      return checkoutFailure(
        "clinical_or_input_validation",
        serviceType === 'consult'
          ? 'Phone number is required so the doctor can contact you about your consultation.'
          : 'Phone number is required for prescription requests to receive your eScript via SMS.',
      )
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
      flowInstanceId,
      growthExperienceVersion: growthExperienceVersion ?? undefined,
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

export async function createCheckoutFromUnifiedFlow(
  input: UnifiedCheckoutInput,
): Promise<CheckoutResult> {
  try {
    return await createCheckoutFromUnifiedFlowInternal(input)
  } catch {
    return checkoutFailure(
      "unexpected",
      "Something went wrong. Please try again or contact support if the issue persists.",
    )
  }
}
