"use server"

import { withServerAction } from "@/lib/actions/with-server-action"
import { revalidatePatient, revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { stripe } from "@/lib/stripe/client"
import {
  canCancelUnpaidCheckoutIntake,
  CANCELLABLE_UNPAID_INTAKE_STATUSES,
  TERMINAL_PAID_PAYMENT_STATUSES,
} from "@/lib/stripe/payment-integrity"
import {
  isMissingSafetyInformationPaymentLock,
  PAYMENT_SAFETY_LOCK_EXCLUSION_FILTER,
} from "@/lib/stripe/payment-safety-lock"
import type { ActionResult } from "@/types/shared"

/**
 * Server action to cancel a pending_payment intake.
 * Only the patient who owns the intake can cancel it.
 */
export const cancelIntake = withServerAction<string>(
  { auth: "apiAuth", name: "cancel-intake" },
  async (intakeId, { supabase, profile, userId, log }): Promise<ActionResult> => {
    // Rate limiting - prevent abuse
    const rateLimit = await checkServerActionRateLimit(userId, "standard")
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error || "Too many requests. Please wait." }
    }

    // Fetch the intake to verify ownership and status
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select("id, patient_id, status, payment_status, payment_id, checkout_error")
      .eq("id", intakeId)
      .single()

    if (fetchError || !intake) {
      log.warn("Cancel intake: not found", { intakeId, userId: profile.id })
      return { success: false, error: "Request not found" }
    }

    // Verify ownership
    if (intake.patient_id !== profile.id) {
      log.warn("Cancel intake: unauthorized", {
        intakeId,
        ownerId: intake.patient_id,
        userId: profile.id,
      })
      return { success: false, error: "You can only cancel your own requests" }
    }

    if (isMissingSafetyInformationPaymentLock(intake.checkout_error)) {
      log.warn("Cancel intake: missing-information hold is binding", { intakeId })
      return {
        success: false,
        error: "This request cannot be cancelled while more information is required.",
      }
    }

    // Verify status allows cancellation
    // Note: pending_info removed - doctor is waiting for response, patient should respond instead
    if (!canCancelUnpaidCheckoutIntake(intake.status, intake.payment_status)) {
      log.warn("Cancel intake: invalid status", { intakeId, status: intake.status })

      // Provide specific message for pending_info status
      if (intake.status === "pending_info") {
        return {
          success: false,
          error: "This request cannot be cancelled while the doctor is waiting for information. Please respond to the doctor's question first.",
        }
      }

      return {
        success: false,
        error: "This request cannot be cancelled. Only unpaid requests can be cancelled.",
      }
    }

    // Update intake status to cancelled. The pre-check above is check-then-act:
    // the paid webhook can land between the fetch and this write, and the DB
    // trigger allows paid -> cancelled, so the write itself must re-assert the
    // unpaid-cancellable state or we mint a paid+cancelled chargeback row.
    const { data: cancelledRows, error: updateError } = await supabase
      .from("intakes")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)
      .in("status", Array.from(CANCELLABLE_UNPAID_INTAKE_STATUSES))
      .or(`payment_status.is.null,payment_status.not.in.(${Array.from(TERMINAL_PAID_PAYMENT_STATUSES).join(",")})`)
      .or(PAYMENT_SAFETY_LOCK_EXCLUSION_FILTER)
      .select("id")

    if (updateError) {
      log.error("Cancel intake: update failed", { intakeId, error: updateError })
      return { success: false, error: "Failed to cancel request. Please try again." }
    }

    if (!cancelledRows || cancelledRows.length === 0) {
      log.warn("Cancel intake: state changed before cancellation (likely just paid)", { intakeId })
      return {
        success: false,
        error: "This request can no longer be cancelled — it may have just been paid. Please refresh to see its current status.",
      }
    }

    log.info("Intake cancelled successfully", { intakeId, userId: profile.id })

    if (intake.payment_id?.startsWith("cs_")) {
      try {
        await stripe.checkout.sessions.expire(intake.payment_id)
        log.info("Expired cancelled intake checkout session", {
          intakeId,
          sessionId: intake.payment_id,
        })
      } catch (expireError) {
        log.debug("Could not expire cancelled intake checkout session", {
          error: expireError instanceof Error ? expireError.message : String(expireError),
          intakeId,
          sessionId: intake.payment_id,
        })
      }
    }

    // Revalidate paths
    revalidatePatient({ intakeId })
    revalidateStaff({ intakeId })

    return { success: true }
  }
)
