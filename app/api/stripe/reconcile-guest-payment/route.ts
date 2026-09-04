import * as Sentry from "@sentry/nextjs"
import { after, NextRequest, NextResponse } from "next/server"

import { generateDraftsForIntake } from "@/app/actions/generate-drafts"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { stripe } from "@/lib/stripe/client"
import {
  completeConfirmedPaymentWork,
  finalizeConfirmedCheckoutPayment,
} from "@/lib/stripe/confirmed-payment-finalization"
import { validateCheckoutSessionIntakeMatch } from "@/lib/stripe/payment-integrity"
import { startPostPaymentReviewWork } from "@/lib/stripe/post-payment"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("stripe-reconcile-guest-payment")
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CHECKOUT_SESSION_RE = /^cs_[A-Za-z0-9_]{8,255}$/

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Guest fallback for the narrow race where Stripe is paid before the webhook
 * has durably moved the request into the clinical queue.
 *
 * The pair of high-entropy identifiers is only a lookup capability: payment
 * still settles solely when the supplied Session exactly matches the stored
 * payment_id, Stripe metadata names the same intake, Stripe reports paid, and
 * the shared current-session compare-and-swap accepts the transition.
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request, "sensitive")
  if (rateLimitResponse) return rateLimitResponse

  try {
    let body: { intakeId?: unknown; sessionId?: unknown }
    try {
      body = await request.json() as { intakeId?: unknown; sessionId?: unknown }
    } catch {
      return NextResponse.json({ error: "Invalid payment reference" }, { status: 400 })
    }
    const intakeId = typeof body.intakeId === "string" ? body.intakeId : ""
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : ""

    if (!UUID_RE.test(intakeId) || !CHECKOUT_SESSION_RE.test(sessionId)) {
      return NextResponse.json({ error: "Invalid payment reference" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("id, status, payment_status, payment_id, category, patient_id")
      .eq("id", intakeId)
      .maybeSingle()

    // Do not distinguish a missing request from a stale or foreign Session.
    if (intakeError || !intake || intake.payment_id !== sessionId) {
      return NextResponse.json(
        { error: "Payment reference could not be verified" },
        { status: 409 },
      )
    }

    if (intake.payment_status === "paid") {
      await startPostPaymentReviewWork({
        generateDraftsForIntake,
        intakeId,
        schedule: (task) => after(task),
        serviceCategory: intake.category,
        supabase,
      })
      return NextResponse.json({ success: true, status: "paid", already_paid: true })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const ownership = validateCheckoutSessionIntakeMatch({
      intakeId,
      session,
      storedPaymentId: intake.payment_id,
    })
    if (!ownership.valid) {
      log.warn("Guest payment reconciliation rejected a mismatched Session", {
        reason: ownership.reason,
      })
      return NextResponse.json(
        { error: "Payment reference could not be verified" },
        { status: 409 },
      )
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { success: false, status: "processing" },
        { status: 202 },
      )
    }

    const finalization = await finalizeConfirmedCheckoutPayment({
      intakeId,
      session,
      supabase,
    })

    if (
      finalization.kind === "stale_session" ||
      finalization.kind === "update_conflict" ||
      finalization.kind === "non_retryable" ||
      finalization.kind === "invalid_session"
    ) {
      return NextResponse.json(
        { error: "Payment reference could not be reconciled" },
        { status: 409 },
      )
    }

    if (finalization.kind === "not_found") {
      return NextResponse.json(
        { error: "Payment reference could not be verified" },
        { status: 409 },
      )
    }

    if (finalization.kind === "update_failed") {
      log.error("Guest payment reconciliation update failed", {}, finalization.error)
      return NextResponse.json(
        { error: "Payment reconciliation failed" },
        { status: 500 },
      )
    }

    await completeConfirmedPaymentWork({
      finalizationKind: finalization.kind,
      generateDraftsForIntake,
      intakeId,
      patientId: finalization.intake.patient_id || intake.patient_id,
      requestPath: "/api/stripe/reconcile-guest-payment",
      schedule: (task) => after(task),
      serviceCategory: finalization.intake.category || intake.category,
      session,
      source: "verify_payment_fallback",
      supabase,
    })

    return NextResponse.json({
      success: true,
      status: "paid",
      ...(finalization.kind === "settled"
        ? { fallback_applied: true }
        : { already_paid: true }),
    })
  } catch (error) {
    log.error(
      "Guest payment reconciliation failed",
      {},
      error instanceof Error ? error : undefined,
    )
    Sentry.captureException(error, {
      tags: { route: "reconcile-guest-payment" },
    })
    return NextResponse.json({ error: "Payment reconciliation failed" }, { status: 500 })
  }
}
