"use server"

import { withServerAction } from "@/lib/actions/with-server-action"
import { revalidatePatient, revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logAuditEvent } from "@/lib/security/audit-log"
import { stripe } from "@/lib/stripe/client"
import { validateCheckoutSessionIntakeMatch } from "@/lib/stripe/payment-integrity"
import { isPaymentSafetyLock } from "@/lib/stripe/payment-safety-lock"
import type { ActionResult } from "@/types/shared"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CLOSABLE_PAYMENT_STATUSES = new Set(["unpaid", "pending", "failed", "expired"])

type CloseFailedCheckoutData = {
  closedAt: string
}

const closeFailedCheckoutForStaff = withServerAction<string, CloseFailedCheckoutData>(
  { roles: ["admin", "support"], name: "close-failed-checkout" },
  async (intakeId, { supabase, profile, log }): Promise<ActionResult<CloseFailedCheckoutData>> => {
    const rateLimit = await checkServerActionRateLimit(
      `staff:${profile.id}:close-failed-checkout`,
      "sensitive",
    )
    if (!rateLimit.success) {
      return {
        success: false,
        error: rateLimit.error || "Too many close attempts. Please wait and try again.",
      }
    }

    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select("id, status, payment_status, payment_id, stripe_payment_intent_id, checkout_error")
      .eq("id", intakeId)
      .single()

    if (fetchError || !intake) {
      return { success: false, error: "Request not found" }
    }

    if (intake.status !== "checkout_failed") {
      return {
        success: false,
        error: "Only a failed, unpaid checkout can be closed from this queue.",
      }
    }

    if (
      intake.payment_status !== null
      && !CLOSABLE_PAYMENT_STATUSES.has(intake.payment_status)
    ) {
      return {
        success: false,
        error: "This request has payment activity that must be reconciled before closure.",
      }
    }

    if (isPaymentSafetyLock(intake.checkout_error)) {
      return {
        success: false,
        error: "This request has a safety hold and cannot be closed from payment recovery.",
      }
    }

    if (intake.stripe_payment_intent_id && !intake.payment_id) {
      return {
        success: false,
        error: "This request has an unresolved PaymentIntent. Reconcile it before closure.",
      }
    }

    // A stored Checkout Session is live payment authority. Verify that it is
    // the session currently attached to this intake and make it terminal at
    // Stripe before changing the local lifecycle. This prevents a successful
    // payment racing a staff close and leaving a paid + cancelled request.
    if (intake.payment_id) {
      if (!intake.payment_id.startsWith("cs_")) {
        return {
          success: false,
          error: "The stored payment reference is invalid. Reconcile it before closing this request.",
        }
      }

      let checkoutSession
      try {
        checkoutSession = await stripe.checkout.sessions.retrieve(intake.payment_id)
      } catch (error) {
        log.warn("Close failed checkout: Stripe session could not be verified", {
          intakeId,
          sessionId: intake.payment_id,
          error: error instanceof Error ? error.message : String(error),
        })
        return {
          success: false,
          error: "The payment session could not be verified. Try again before closing this request.",
        }
      }

      const sessionMatch = validateCheckoutSessionIntakeMatch({
        intakeId,
        session: checkoutSession,
        storedPaymentId: intake.payment_id,
      })
      if (!sessionMatch.valid) {
        log.error("Close failed checkout: stored Stripe session mismatch", {
          intakeId,
          sessionId: intake.payment_id,
          reason: sessionMatch.reason,
        })
        return {
          success: false,
          error: "The payment session does not match this request. Reconcile it before closing.",
        }
      }

      const sessionPaymentIntentId = typeof checkoutSession.payment_intent === "string"
        ? checkoutSession.payment_intent
        : checkoutSession.payment_intent?.id ?? null
      if (
        intake.stripe_payment_intent_id
        && sessionPaymentIntentId !== intake.stripe_payment_intent_id
      ) {
        log.error("Close failed checkout: stored PaymentIntent mismatch", {
          intakeId,
          sessionId: intake.payment_id,
        })
        return {
          success: false,
          error: "The PaymentIntent does not match this checkout. Reconcile it before closing.",
        }
      }

      if (
        checkoutSession.status === "complete"
        || checkoutSession.payment_status === "paid"
        || checkoutSession.payment_status === "no_payment_required"
      ) {
        return {
          success: false,
          error: "Stripe shows this checkout as completed. Reconcile the payment before closure.",
        }
      }

      if (checkoutSession.status === "open") {
        try {
          await stripe.checkout.sessions.expire(intake.payment_id)
        } catch (expireError) {
          // The expire response may be lost after Stripe commits. Re-read once;
          // only a durable expired state permits local closure.
          try {
            const latestSession = await stripe.checkout.sessions.retrieve(intake.payment_id)
            if (latestSession.status !== "expired") throw expireError
          } catch {
            log.warn("Close failed checkout: Stripe session did not expire", {
              intakeId,
              sessionId: intake.payment_id,
            })
            return {
              success: false,
              error: "The payment session is still active. Try again before closing this request.",
            }
          }
        }
      } else if (checkoutSession.status !== "expired") {
        return {
          success: false,
          error: "The payment session is not safely closable. Reconcile it in Stripe first.",
        }
      }
    }

    const closedAt = new Date().toISOString()
    let closeQuery = supabase
      .from("intakes")
      .update({
        status: "cancelled",
        cancelled_at: closedAt,
        updated_at: closedAt,
      })
      .eq("id", intakeId)
      .eq("status", "checkout_failed")

    // Re-assert every state value used above. If a retry session, webhook,
    // safety lock, or payment update lands after the read, the compare-and-set
    // matches zero rows and the close fails safely.
    closeQuery = intake.payment_status === null
      ? closeQuery.is("payment_status", null)
      : closeQuery.eq("payment_status", intake.payment_status)
    closeQuery = intake.checkout_error === null
      ? closeQuery.is("checkout_error", null)
      : closeQuery.eq("checkout_error", intake.checkout_error)
    closeQuery = intake.payment_id === null
      ? closeQuery.is("payment_id", null)
      : closeQuery.eq("payment_id", intake.payment_id)
    closeQuery = intake.stripe_payment_intent_id === null
      ? closeQuery.is("stripe_payment_intent_id", null)
      : closeQuery.eq("stripe_payment_intent_id", intake.stripe_payment_intent_id)

    const { data: closedRows, error: closeError } = await closeQuery.select("id")
    if (closeError) {
      log.error("Close failed checkout: update failed", {
        intakeId,
        error: closeError.message,
      })
      return { success: false, error: "The request could not be closed. Please try again." }
    }

    if (!closedRows || closedRows.length === 0) {
      return {
        success: false,
        error: "The payment state changed before closure. Refresh and reconcile the latest status.",
      }
    }

    // The database status-change trigger is the durable transition receipt.
    // This companion row preserves the exact staff actor for investigations.
    try {
      await logAuditEvent({
        action: "admin_action",
        actorId: profile.id,
        actorType: profile.role === "support" ? "support" : "admin",
        intakeId,
        fromState: "checkout_failed",
        toState: "cancelled",
        metadata: {
          action_type: "failed_checkout_closed",
          previous_status: "checkout_failed",
          new_status: "cancelled",
          payment_status: intake.payment_status,
        },
      })
    } catch (auditError) {
      // The status-change trigger committed its durable receipt in the same
      // database transaction. Do not report this already-completed closure as
      // failed and invite a misleading retry if the companion actor row queues.
      log.error("Close failed checkout: staff attribution audit queued", {
        intakeId,
        error: auditError instanceof Error ? auditError.message : String(auditError),
      })
    }

    log.info("Failed checkout closed by staff", {
      intakeId,
      actorId: profile.id,
      actorRole: profile.role,
    })
    revalidatePatient({ intakeId })
    revalidateStaff({ intakeId, ops: true })

    return { success: true, data: { closedAt } }
  },
)

export async function closeFailedCheckoutAction(
  intakeId: string,
): Promise<ActionResult<CloseFailedCheckoutData>> {
  if (!UUID_RE.test(intakeId)) {
    return { success: false, error: "Invalid request ID" }
  }
  return closeFailedCheckoutForStaff(intakeId)
}
