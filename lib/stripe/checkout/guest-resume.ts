import { getAppUrl } from "@/lib/config/env"
import { revalidatePatient, revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { getIntakeAnswersForPaymentSafety } from "@/lib/data/intake-answers"
import { createLogger } from "@/lib/observability/logger"
import { recordSafetyEvaluationForOperators } from "@/lib/safety/audit-log"
import { validateSafetyFieldsPresent } from "@/lib/safety/evaluate"
import { buildGuestCheckoutCancelUrl } from "@/lib/stripe/checkout-recovery-link"
import { getPriceIdForRequest, stripe } from "@/lib/stripe/client"
import { canRetryPaymentForIntake } from "@/lib/stripe/payment-integrity"
import {
  isHighStakesPaymentLock,
  isMissingSafetyInformationPaymentLock,
} from "@/lib/stripe/payment-safety-lock"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ServiceCategory } from "@/types/services"

import {
  attachCheckoutSession,
  cancelHighStakesUnpaidIntake,
  claimCheckoutSessionReplacement,
  confirmCheckoutSessionStillCurrent,
  HIGH_STAKES_PAYMENT_LOCK,
  inspectCheckoutSession,
  invalidateCheckoutSessionForSafety,
} from "./checkout-session-safety"
import { getServiceSlug } from "./helpers"
import {
  getHighStakesCheckoutBlock,
  isMedicalCertificateIntake,
} from "./high-stakes-validation"
import {
  holdCheckoutForMissingSafetyInformation,
  type MissingSafetyPaymentHoldResult,
} from "./missing-safety-payment-hold"
import { preflightPriorityPriceForRecovery } from "./priority-price-recovery"
import { reconcileChangedCheckoutSessionForReturn } from "./return-payment-reconciliation"

const logger = createLogger("checkout-resume")

const SAFETY_BLOCKED_DESTINATION = "/checkout/cancelled?reason=safety_blocked"
const MORE_INFORMATION_REQUIRED_DESTINATION =
  "/checkout/cancelled?reason=more_information_required"
const PAYMENT_STATE_UNRESOLVED_DESTINATION =
  "/checkout/cancelled?reason=payment_state_unresolved"

const SERVICE_START_URLS: Record<string, string> = {
  medical_certificate: "/medical-certificate",
  prescription: "/prescriptions",
  consult: "/request",
}

interface ResumeIntake {
  category: string | null
  checkout_error: string | null
  guest_email: string | null
  id: string
  is_priority: boolean | null
  patient_id: string | null
  payment_id: string | null
  payment_status: string | null
  service: { slug?: string | null; type?: string | null } | null
  status: string | null
  stripe_price_id: string | null
  subtype: string | null
}

const RESUME_INTAKE_SELECT =
  "id, patient_id, status, payment_status, payment_id, checkout_error, category, subtype, stripe_price_id, is_priority, guest_email, service:services!service_id(slug, type)"

function accountCompletionDestination(intakeId: string, sessionId?: string | null): string {
  const destination = `/auth/complete-account?intake_id=${encodeURIComponent(intakeId)}`
  return sessionId
    ? `${destination}&session_id=${encodeURIComponent(sessionId)}`
    : destination
}

function serviceStartDestination(intake: ResumeIntake): string {
  const category = intake.category || intake.service?.type || ""
  return SERVICE_START_URLS[category] ?? "/request"
}

async function resolveCurrentPaymentCompletion(
  supabase: ReturnType<typeof createServiceRoleClient>,
  intakeId: string,
): Promise<string> {
  const refreshed = await readResumeIntake(supabase, intakeId)
  if (refreshed.error || !refreshed.intake) {
    return PAYMENT_STATE_UNRESOLVED_DESTINATION
  }

  const current = refreshed.intake
  const reconciliation = await reconcileChangedCheckoutSessionForReturn({
    intakeId: current.id,
    state: current,
  })
  if (reconciliation.outcome === "payment_in_flight") {
    return accountCompletionDestination(current.id, reconciliation.sessionId)
  }
  return PAYMENT_STATE_UNRESOLVED_DESTINATION
}

async function missingInformationDestination(
  supabase: ReturnType<typeof createServiceRoleClient>,
  hold: MissingSafetyPaymentHoldResult,
  intake: ResumeIntake,
): Promise<string> {
  if (hold === "held") return MORE_INFORMATION_REQUIRED_DESTINATION
  if (hold === "held_invalidation_unresolved") {
    return PAYMENT_STATE_UNRESOLVED_DESTINATION
  }
  if (hold === "payment_in_flight") {
    return resolveCurrentPaymentCompletion(supabase, intake.id)
  }
  return PAYMENT_STATE_UNRESOLVED_DESTINATION
}

function revalidateHeldIntake(intake: ResumeIntake): void {
  revalidateStaff({ intakeId: intake.id, patientId: intake.patient_id || undefined })
  if (intake.patient_id) {
    revalidatePatient({ intakeId: intake.id, patientId: intake.patient_id })
  }
}

async function readResumeIntake(
  supabase: ReturnType<typeof createServiceRoleClient>,
  intakeId: string,
): Promise<{ error: unknown; intake: ResumeIntake | null }> {
  const { data, error } = await supabase
    .from("intakes")
    .select(RESUME_INTAKE_SELECT)
    .eq("id", intakeId)
    .maybeSingle()

  return { error, intake: data as ResumeIntake | null }
}

async function resolveChangedHighStakesPayment(
  supabase: ReturnType<typeof createServiceRoleClient>,
  intakeId: string,
): Promise<string> {
  const refreshed = await readResumeIntake(supabase, intakeId)
  if (refreshed.error || !refreshed.intake) {
    return PAYMENT_STATE_UNRESOLVED_DESTINATION
  }

  const intake = refreshed.intake
  if (intake.payment_status === "paid") {
    return accountCompletionDestination(intake.id, intake.payment_id)
  }

  if (
    intake.checkout_error === HIGH_STAKES_PAYMENT_LOCK &&
    (intake.status === "cancelled" ||
      intake.status === "expired" ||
      intake.payment_status === "expired")
  ) {
    return SAFETY_BLOCKED_DESTINATION
  }

  if (intake.payment_id) {
    const inspection = await inspectCheckoutSession(intake.payment_id, intake.id, {
      intakeStatus: intake.status,
      paymentStatus: intake.payment_status,
      storedPaymentId: intake.payment_id,
    })
    if (inspection.state === "paid" || inspection.state === "payment_in_flight") {
      return accountCompletionDestination(intake.id, intake.payment_id)
    }
  }

  return PAYMENT_STATE_UNRESOLVED_DESTINATION
}

async function rebuildGuestCheckoutSession(
  supabase: ReturnType<typeof createServiceRoleClient>,
  intake: ResumeIntake,
  baseUrl: string,
): Promise<string | null> {
  const priceId =
    intake.stripe_price_id ||
    getPriceIdForRequest({
      category: (intake.category || "medical_certificate") as ServiceCategory,
      subtype: intake.subtype || "",
      answers: {},
    })
  if (!priceId) return null

  const priorityPreflight = await preflightPriorityPriceForRecovery({
    category: intake.category || "",
    intakeId: intake.id,
    isPriority: intake.is_priority === true,
  })
  if (!priorityPreflight.ok) return null

  const lineItems: Array<{ price: string; quantity: number }> = [
    { price: priceId, quantity: 1 },
  ]
  if (priorityPreflight.priceId) {
    lineItems.push({ price: priorityPreflight.priceId, quantity: 1 })
  }

  const replacementState = {
    checkout_error: intake.checkout_error,
    payment_id: intake.payment_id,
    payment_status: intake.payment_status,
    status: intake.status,
  }
  const replacementClaim = await claimCheckoutSessionReplacement({
    initialState: replacementState,
    intakeId: intake.id,
    patientId: intake.patient_id || undefined,
    source: "guest_resume",
    supabase,
  })
  if (
    replacementClaim.outcome === "state_changed" ||
    replacementClaim.outcome === "unresolved"
  ) {
    return null
  }
  try {
    const session = await stripe.checkout.sessions.create(
      {
        line_items: lineItems,
        mode: "payment",
        success_url: `${baseUrl}/auth/complete-account?intake_id=${intake.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: buildGuestCheckoutCancelUrl({ baseUrl, intakeId: intake.id }),
        customer_email: intake.guest_email ?? undefined,
        customer_creation: intake.guest_email ? "always" : undefined,
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

    if (!session.url) {
      await invalidateCheckoutSessionForSafety(session.id, intake.id)
      return null
    }

    const attachResult = await attachCheckoutSession({
      expectedPaymentId: intake.payment_id,
      intakeId: intake.id,
      patientId: intake.patient_id || undefined,
      sessionId: session.id,
      source: "guest_resume",
      supabase,
    })

    if (
      attachResult.outcome === "attached" ||
      attachResult.outcome === "already_attached"
    ) {
      const confirmation = await confirmCheckoutSessionStillCurrent({
        intakeId: intake.id,
        patientId: intake.patient_id || undefined,
        sessionId: session.id,
        source: "guest_resume",
        supabase,
      })
      if (confirmation.outcome === "current") return session.url
      if (confirmation.outcome === "state_changed") {
        return resolveCurrentPaymentCompletion(supabase, intake.id)
      }
    }

    return null
  } catch (error) {
    logger.error(
      "Failed to rebuild checkout session on resume",
      { intakeId: intake.id },
      error instanceof Error ? error : new Error(String(error)),
    )
    return null
  }
}

export async function resolveGuestCheckoutResume(intakeId: string): Promise<string> {
  const supabase = createServiceRoleClient()
  const initial = await readResumeIntake(supabase, intakeId)

  if (initial.error) {
    logger.error(
      "Failed to load guest checkout resume state",
      { intakeId },
      initial.error instanceof Error ? initial.error : new Error(String(initial.error)),
    )
    return PAYMENT_STATE_UNRESOLVED_DESTINATION
  }
  if (!initial.intake) return "/request?error=not_found"

  const intake = initial.intake
  if (intake.payment_status === "paid") {
    return accountCompletionDestination(intake.id, intake.payment_id)
  }

  if (canRetryPaymentForIntake(intake.status, intake.payment_status)) {
    if (isMissingSafetyInformationPaymentLock(intake.checkout_error)) {
      const hold = await holdCheckoutForMissingSafetyInformation({
        intakeId: intake.id,
        missingFields: [],
        source: "guest_resume",
        supabase,
      })
      if (hold !== "state_changed") revalidateHeldIntake(intake)
      return missingInformationDestination(supabase, hold, intake)
    }

    const answers = await getIntakeAnswersForPaymentSafety(intake.id)
    if (answers === null) {
      logger.error(
        "Could not read persisted answers before guest checkout resume",
        { intakeId: intake.id },
        new Error("Authoritative intake answer read failed"),
      )
      return PAYMENT_STATE_UNRESOLVED_DESTINATION
    }
    const highStakesBlock = isMedicalCertificateIntake(intake.category, intake.service)
      ? getHighStakesCheckoutBlock(answers)
      : null

    if (highStakesBlock) {
      await recordSafetyEvaluationForOperators({
        answers,
        context: "guest_resume",
        requestId: intake.id,
        result: highStakesBlock.safetyCheck,
        serviceSlug: intake.service?.slug || "med-cert-sick",
      })

      const cancellation = await cancelHighStakesUnpaidIntake({
        initialState: {
          payment_id: intake.payment_id,
          payment_status: intake.payment_status,
          status: intake.status,
        },
        intakeId: intake.id,
        source: "guest_resume",
        supabase,
      })

      if (cancellation === "cancelled") return SAFETY_BLOCKED_DESTINATION
      if (cancellation === "unresolved") return PAYMENT_STATE_UNRESOLVED_DESTINATION
      return resolveChangedHighStakesPayment(supabase, intake.id)
    }

    // A prior safety attempt may have locked the row while the encrypted answer
    // read is temporarily unavailable. Never return its live payment URL.
    if (isHighStakesPaymentLock(intake.checkout_error)) {
      return resolveChangedHighStakesPayment(supabase, intake.id)
    }

    const serviceSlugForSafety =
      intake.service?.slug || getServiceSlug(intake.category || "", intake.subtype || "")
    const fieldCheck = validateSafetyFieldsPresent(serviceSlugForSafety, answers)
    if (!fieldCheck.valid) {
      await recordSafetyEvaluationForOperators({
        answers,
        context: "guest_resume",
        requestId: intake.id,
        result: {
          isAllowed: false,
          outcome: "REQUEST_MORE_INFO",
          riskTier: "high",
          blockReason: "Required medical information is missing.",
          requiresCall: false,
          triggeredRuleIds: ["missing_safety_fields"],
        },
        serviceSlug: serviceSlugForSafety,
      })
      const hold = await holdCheckoutForMissingSafetyInformation({
        intakeId: intake.id,
        missingFields: fieldCheck.missingFields,
        source: "guest_resume",
        supabase,
      })
      if (hold !== "state_changed") revalidateHeldIntake(intake)
      return missingInformationDestination(supabase, hold, intake)
    }

    let canRebuild = !intake.payment_id
    if (intake.payment_id) {
      const inspection = await inspectCheckoutSession(intake.payment_id, intake.id, {
        intakeStatus: intake.status,
        paymentStatus: intake.payment_status,
        storedPaymentId: intake.payment_id,
      })
      if (inspection.state === "open" && inspection.session?.url) {
        const confirmation = await confirmCheckoutSessionStillCurrent({
          intakeId: intake.id,
          patientId: intake.patient_id || undefined,
          sessionId: intake.payment_id,
          source: "guest_resume",
          supabase,
        })
        if (confirmation.outcome === "current") return inspection.session.url
        if (confirmation.outcome === "state_changed") {
          return resolveCurrentPaymentCompletion(supabase, intake.id)
        }
        return PAYMENT_STATE_UNRESOLVED_DESTINATION
      }
      if (inspection.state === "paid" || inspection.state === "payment_in_flight") {
        return accountCompletionDestination(intake.id, intake.payment_id)
      }
      if (inspection.state === "unresolved") {
        return PAYMENT_STATE_UNRESOLVED_DESTINATION
      }
      canRebuild = inspection.state === "expired" || inspection.state === "failed"
    }

    if (canRebuild) {
      const checkoutUrl = await rebuildGuestCheckoutSession(supabase, intake, getAppUrl())
      if (checkoutUrl) return checkoutUrl
      return PAYMENT_STATE_UNRESOLVED_DESTINATION
    }
  }

  if (intake.checkout_error === HIGH_STAKES_PAYMENT_LOCK) {
    return SAFETY_BLOCKED_DESTINATION
  }

  return serviceStartDestination(intake)
}
