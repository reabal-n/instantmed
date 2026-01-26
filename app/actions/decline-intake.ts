"use server"

/**
 * Canonical Decline Intake Action
 * 
 * Single source of truth for declining intakes.
 * Ensures consistent: status update → refund → email → audit
 * 
 * Use this action everywhere decline happens:
 * - Doctor queue
 * - Admin panel
 * - Bulk actions
 * - API routes
 */

import * as Sentry from "@sentry/nextjs"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getCurrentProfile } from "@/lib/data/profiles"
import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"
import { logStatusChange } from "@/lib/data/intake-events"
import { logTriageDeclined } from "@/lib/audit/compliance-audit"
import { sendRequestDeclinedEmailNew } from "@/lib/email/senders"
import type { RequestType } from "@/lib/audit/compliance-audit"

const logger = createLogger("decline-intake")

// ============================================================================
// TYPES
// ============================================================================

export type RefundStatus = 
  | "not_applicable"
  | "not_eligible"
  | "pending"
  | "succeeded"
  | "failed"
  | "skipped_e2e"

export interface DeclineInput {
  intakeId: string
  reason?: string
  reasonCode?: string
  actorId?: string // Override actor (for API key auth)
  skipRefund?: boolean // For testing
}

export interface DeclineResult {
  success: boolean
  error?: string
  alreadyDeclined?: boolean
  refund?: {
    status: RefundStatus
    stripeRefundId?: string
    amount?: number
    error?: string
  }
  emailSent?: boolean
}

// Valid statuses that can be declined
const DECLINABLE_STATUSES = ["paid", "awaiting_review", "in_review", "pending_info", "pending_review"]

// Categories eligible for auto-refund on decline
const REFUND_ELIGIBLE_CATEGORIES = ["medical_certificate", "prescription"]

// ============================================================================
// MAIN ACTION
// ============================================================================

/**
 * Decline an intake with consistent refund, email, and audit handling.
 * 
 * Flow:
 * 1. Validate doctor/admin role
 * 2. Atomic status update to 'declined'
 * 3. Process refund if eligible
 * 4. Send decline email to patient
 * 5. Log intake event for audit
 * 6. Log compliance event
 * 
 * @param input - Decline parameters
 * @returns DeclineResult with status and refund info
 */
export async function declineIntake(input: DeclineInput): Promise<DeclineResult> {
  const { intakeId, reason, reasonCode, skipRefund } = input
  let actorId = input.actorId

  // Add Sentry context
  Sentry.setTag("action", "decline_intake")
  Sentry.setTag("intake_id", intakeId)

  try {
    const supabase = createServiceRoleClient()
    const timestamp = new Date().toISOString()

    // 1. VALIDATE ACTOR
    if (!actorId) {
      const profile = await getCurrentProfile()
      if (!profile) {
        return { success: false, error: "You must be logged in to decline requests" }
      }
      if (profile.role !== "doctor" && profile.role !== "admin") {
        return { success: false, error: "Only doctors and admins can decline requests" }
      }
      actorId = profile.id
    }

    Sentry.setTag("actor_id", actorId)

    // 2. FETCH CURRENT INTAKE STATE
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select(`
        id,
        status,
        category,
        subtype,
        payment_status,
        payment_id,
        stripe_payment_intent_id,
        amount_cents,
        patient_id,
        patient:profiles!patient_id (
          id,
          full_name,
          email,
          clerk_user_id
        )
      `)
      .eq("id", intakeId)
      .single()

    if (fetchError || !intake) {
      logger.warn("[Decline] Intake not found", { intakeId })
      return { success: false, error: "Request not found" }
    }

    // Idempotency: already declined
    if (intake.status === "declined") {
      logger.info("[Decline] Intake already declined", { intakeId })
      return { success: true, alreadyDeclined: true }
    }

    // Validate status is declinable
    if (!DECLINABLE_STATUSES.includes(intake.status)) {
      return {
        success: false,
        error: `Cannot decline request in '${intake.status}' status`,
      }
    }

    // 3. ATOMIC STATUS UPDATE
    const declineNotes = reason ? `Declined: ${reason}` : "Declined"
    
    const { data: updated, error: updateError } = await supabase
      .from("intakes")
      .update({
        status: "declined",
        previous_status: intake.status,
        decision: "declined",
        decline_reason: reason || null,
        decline_reason_code: reasonCode || null,
        decline_reason_note: reason || null,
        doctor_notes: declineNotes,
        reviewed_by: actorId,
        reviewed_at: timestamp,
        decided_at: timestamp,
        declined_at: timestamp,
        updated_at: timestamp,
      })
      .eq("id", intakeId)
      .in("status", DECLINABLE_STATUSES) // Optimistic lock
      .select("id")
      .single()

    if (updateError || !updated) {
      logger.error("[Decline] Failed to update intake status", { intakeId }, updateError)
      
      // Check if status changed (race condition)
      if (updateError?.code === "PGRST116") {
        return {
          success: false,
          error: "Request status changed. Please refresh and try again.",
        }
      }
      return { success: false, error: "Failed to decline request" }
    }

    logger.info("[Decline] Status updated to declined", { intakeId, actorId })

    // 4. PROCESS REFUND
    let refundResult: DeclineResult["refund"] = {
      status: "not_applicable",
    }

    const isPaid = intake.payment_status === "paid"
    const isEligible = REFUND_ELIGIBLE_CATEGORIES.includes(intake.category || "")
    const isE2E = process.env.E2E_MODE === "true" || process.env.PLAYWRIGHT === "1"

    if (isPaid && isEligible && !skipRefund) {
      if (isE2E) {
        // Skip actual Stripe call in E2E mode
        refundResult = { status: "skipped_e2e" }
        
        await supabase
          .from("intakes")
          .update({
            refund_status: "skipped_e2e",
            updated_at: timestamp,
          })
          .eq("id", intakeId)

        logger.info("[Decline] Refund skipped (E2E mode)", { intakeId })
      } else {
        // Process real refund
        refundResult = await processRefund(intakeId, intake, actorId, timestamp)
      }
    } else if (isPaid && !isEligible) {
      refundResult = { status: "not_eligible" }
      
      await supabase
        .from("intakes")
        .update({
          refund_status: "not_eligible",
          updated_at: timestamp,
        })
        .eq("id", intakeId)
    }

    // 5. SEND DECLINE EMAIL
    let emailSent = false
    const patientRaw = intake.patient as unknown
    const patient = (Array.isArray(patientRaw) ? patientRaw[0] : patientRaw) as {
      id: string
      full_name: string | null
      email: string | null
      clerk_user_id: string | null
    } | null

    if (patient?.email) {
      try {
        await sendRequestDeclinedEmailNew({
          to: patient.email,
          patientName: patient.full_name || "there",
          patientId: patient.id,
          intakeId,
          requestType: intake.category || "request",
          reason: reason || "Your request could not be approved at this time.",
        })
        emailSent = true
        logger.info("[Decline] Decline email sent", { intakeId, to: patient.email })
      } catch (emailError) {
        logger.error("[Decline] Failed to send decline email", { intakeId }, emailError instanceof Error ? emailError : undefined)
        // Don't fail the decline if email fails
      }
    }

    // 6. LOG INTAKE EVENT
    try {
      await logStatusChange(
        intakeId,
        intake.status,
        "declined",
        actorId,
        "doctor",
        {
          reason,
          reasonCode,
          refundStatus: refundResult?.status,
          refundStripeId: refundResult?.stripeRefundId,
        }
      )
    } catch (eventError) {
      logger.warn("[Decline] Failed to log intake event", { intakeId }, eventError instanceof Error ? eventError : undefined)
    }

    // 7. LOG COMPLIANCE EVENT
    try {
      const requestType = getRequestType(intake.category)
      await logTriageDeclined(intakeId, requestType, actorId, reason || "Declined")
    } catch (auditError) {
      logger.warn("[Decline] Failed to log compliance event", { intakeId }, auditError instanceof Error ? auditError : undefined)
    }

    return {
      success: true,
      refund: refundResult,
      emailSent,
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Decline] Unexpected error", { intakeId }, error instanceof Error ? error : undefined)
    
    Sentry.captureException(error, {
      tags: { action: "decline_intake", intake_id: intakeId },
    })

    return {
      success: false,
      error: `Failed to decline request: ${errorMessage}`,
    }
  }
}

// ============================================================================
// REFUND PROCESSING
// ============================================================================

async function processRefund(
  intakeId: string,
  intake: {
    payment_id: string | null
    stripe_payment_intent_id: string | null
    amount_cents: number | null
    category: string | null
  },
  actorId: string,
  timestamp: string
): Promise<DeclineResult["refund"]> {
  const supabase = createServiceRoleClient()

  try {
    // Mark as pending
    await supabase
      .from("intakes")
      .update({
        refund_status: "pending",
        updated_at: timestamp,
      })
      .eq("id", intakeId)

    // Get payment intent ID
    let paymentIntentId = intake.stripe_payment_intent_id

    if (!paymentIntentId && intake.payment_id) {
      // Fetch from Stripe checkout session
      try {
        const session = await stripe.checkout.sessions.retrieve(intake.payment_id)
        paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null
      } catch (_stripeError) {
        logger.warn("[Decline] Failed to fetch checkout session", { intakeId, paymentId: intake.payment_id })
      }
    }

    if (!paymentIntentId) {
      const error = "No payment intent ID available for refund"
      
      await supabase
        .from("intakes")
        .update({
          refund_status: "failed",
          refund_error: error,
          updated_at: timestamp,
        })
        .eq("id", intakeId)

      captureRefundError(intakeId, intake.payment_id, error)

      return {
        status: "failed",
        error,
      }
    }

    // Process Stripe refund
    const idempotencyKey = `refund_decline_${intakeId}_${Date.now()}`

    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          intake_id: intakeId,
          category: intake.category || "unknown",
          declined_by: actorId,
          refund_type: "decline",
        },
      },
      { idempotencyKey }
    )

    // Update intake with success
    await supabase
      .from("intakes")
      .update({
        payment_status: "refunded",
        refund_status: "succeeded",
        refund_stripe_id: refund.id,
        refund_amount_cents: refund.amount,
        refunded_at: timestamp,
        refunded_by: actorId,
        updated_at: timestamp,
      })
      .eq("id", intakeId)

    logger.info("[Decline] Refund succeeded", {
      intakeId,
      refundId: refund.id,
      amount: refund.amount,
    })

    return {
      status: "succeeded",
      stripeRefundId: refund.id,
      amount: refund.amount,
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Stripe error"

    await supabase
      .from("intakes")
      .update({
        refund_status: "failed",
        refund_error: errorMessage,
        updated_at: timestamp,
      })
      .eq("id", intakeId)

    captureRefundError(intakeId, intake.payment_id, errorMessage)

    logger.error("[Decline] Refund failed", { intakeId }, error instanceof Error ? error : undefined)

    return {
      status: "failed",
      error: errorMessage,
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getRequestType(category: string | null): RequestType {
  if (category === "medical_certificate") return "med_cert"
  if (category === "prescription") return "repeat_rx"
  return "intake"
}

function captureRefundError(
  intakeId: string,
  paymentId: string | null,
  error: string
): void {
  Sentry.captureMessage(`Refund failed for declined intake`, {
    level: "error",
    tags: {
      action: "refund_on_decline",
      intake_id: intakeId,
      stripe_session_id: paymentId || "unknown",
    },
    extra: {
      error,
    },
    fingerprint: ["refund-failed", intakeId],
  })
}

// ============================================================================
// BULK DECLINE
// ============================================================================

/**
 * Decline multiple intakes.
 * Processes sequentially to avoid race conditions.
 */
export async function declineIntakesBulk(
  intakeIds: string[],
  reason?: string,
  actorId?: string
): Promise<{
  succeeded: string[]
  failed: Array<{ intakeId: string; error: string }>
}> {
  const succeeded: string[] = []
  const failed: Array<{ intakeId: string; error: string }> = []

  for (const intakeId of intakeIds) {
    const result = await declineIntake({ intakeId, reason, actorId })
    
    if (result.success) {
      succeeded.push(intakeId)
    } else {
      failed.push({ intakeId, error: result.error || "Unknown error" })
    }
  }

  return { succeeded, failed }
}
