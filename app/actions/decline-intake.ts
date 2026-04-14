"use server"

/**
 * Canonical Decline Intake Action
 *
 * Single source of truth for declining intakes.
 * Ensures consistent: status update -> refund -> email -> audit
 *
 * Use this action everywhere decline happens:
 * - Doctor queue
 * - Admin panel
 * - Bulk actions
 * - API routes
 *
 * Refund processing: ./decline-refund.ts
 * Bulk operations:   ./decline-bulk.ts
 */

import * as Sentry from "@sentry/nextjs"
import { revalidatePath } from "next/cache"

import { trackIntakeFunnelStep } from "@/lib/analytics/posthog-server"
import type { RequestType } from "@/lib/audit/compliance-audit"
import { logTriageDeclined } from "@/lib/audit/compliance-audit"
import { requireRoleOrNull } from "@/lib/auth/helpers"
import { logStatusChange } from "@/lib/data/intake-events"
import { sendRequestDeclinedEmail } from "@/lib/email/senders"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import {
  FULL_REFUND_CATEGORIES,
  PARTIAL_REFUND_CATEGORIES,
  PARTIAL_REFUND_PERCENT,
  processRefund,
} from "./decline-refund"

// Split modules: import directly from ./decline-bulk and ./decline-refund.
// Cannot re-export non-async values from "use server" files.

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
const DECLINABLE_STATUSES = ["paid", "in_review", "pending_info", "awaiting_script"]

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
  let actorId: string

  // Add Sentry context
  Sentry.setTag("action", "decline_intake")
  Sentry.setTag("intake_id", intakeId)

  try {
    const supabase = createServiceRoleClient()
    const timestamp = new Date().toISOString()

    // 1. VALIDATE ACTOR - always require session auth
    const authUser = await requireRoleOrNull(["doctor", "admin"])
    if (!authUser) {
      return { success: false, error: "Only doctors and admins can decline requests" }
    }
    actorId = authUser.profile.id

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
          auth_user_id
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

    trackIntakeFunnelStep({
      step: "declined",
      intakeId,
      serviceSlug: intake.category || "unknown",
      serviceType: intake.category || "unknown",
      userId: actorId,
    })

    // 4. PROCESS REFUND
    let refundResult: DeclineResult["refund"] = {
      status: "not_applicable",
    }

    const isPaid = intake.payment_status === "paid"
    const category = intake.category || ""
    const isFullRefund = FULL_REFUND_CATEGORIES.includes(category)
    const isPartialRefund = PARTIAL_REFUND_CATEGORIES.includes(category)
    const isEligible = isFullRefund || isPartialRefund
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
        // Process real refund - full for med cert/Rx, 50% for consults
        const refundAmountCents = isPartialRefund && intake.amount_cents
          ? Math.floor(intake.amount_cents * PARTIAL_REFUND_PERCENT)
          : undefined // undefined = full refund
        refundResult = await processRefund(intakeId, intake, actorId, timestamp, refundAmountCents)
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
      auth_user_id: string | null
    } | null

    if (patient?.email) {
      try {
        await sendRequestDeclinedEmail({
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

    revalidatePath("/doctor")

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
// HELPERS
// ============================================================================

function getRequestType(category: string | null): RequestType {
  if (category === "medical_certificate") return "med_cert"
  if (category === "prescription") return "repeat_rx"
  return "intake"
}
