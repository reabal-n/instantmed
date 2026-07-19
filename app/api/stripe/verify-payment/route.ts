import * as Sentry from "@sentry/nextjs"
import { after, NextRequest, NextResponse } from "next/server"

import { generateDraftsForIntake } from "@/app/actions/generate-drafts"
import { getApiAuth } from "@/lib/auth/helpers"
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

const log = createLogger("stripe-verify-payment")

/**
 * Fallback endpoint to verify payment status with Stripe
 * Called from success page if webhook hasn't updated the intake yet
 * This ensures intakes get marked as paid even if webhook fails/delays
 *
 * SECURITY: Requires authentication and verifies the caller owns the intake.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit to prevent abuse
    const rateLimitResponse = await applyRateLimit(req, "sensitive")
    if (rateLimitResponse) return rateLimitResponse

    // Require authentication
    const authResult = await getApiAuth()
    if (!authResult || authResult.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { intakeId, sessionId } = await req.json()

    if (!intakeId) {
      return NextResponse.json({ error: "Missing intake_id" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // 1. Check current intake status AND verify ownership
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select("id, status, payment_status, payment_id, category")
      .eq("id", intakeId)
      .eq("patient_id", authResult.profile.id)
      .single()

    if (fetchError || !intake) {
      log.error("Intake not found for verification", { intakeId })
      return NextResponse.json({ error: "Intake not found" }, { status: 404 })
    }

    // 2. Already paid - no action needed
    if (intake.payment_status === "paid") {
      await startPostPaymentReviewWork({
        generateDraftsForIntake,
        intakeId,
        schedule: (task) => after(task),
        serviceCategory: intake.category,
        supabase,
      })

      return NextResponse.json({ 
        success: true, 
        status: intake.status,
        already_paid: true 
      })
    }

    // 3. Verify with Stripe using session ID
    const checkoutSessionId = sessionId || intake.payment_id
    if (!checkoutSessionId) {
      log.warn("No session ID available for verification", { intakeId })
      return NextResponse.json({ 
        success: false, 
        status: intake.status,
        error: "No payment session found" 
      })
    }

    // 4. Retrieve checkout session from Stripe
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(checkoutSessionId)
    } catch (stripeError) {
      log.error("Failed to retrieve Stripe session", { 
        intakeId, 
        sessionId: checkoutSessionId 
      }, stripeError instanceof Error ? stripeError : undefined)
      return NextResponse.json({ 
        success: false, 
        status: intake.status,
        error: "Failed to verify payment with Stripe" 
      })
    }

    const sessionMatch = validateCheckoutSessionIntakeMatch({
      intakeId,
      session,
      storedPaymentId: intake.payment_id,
    })
    if (!sessionMatch.valid) {
      log.warn("Payment verification session mismatch", {
        intakeId,
        reason: sessionMatch.reason,
        sessionId: checkoutSessionId,
      })
      return NextResponse.json({
        success: false,
        status: intake.status,
        error: "Payment session does not match this request",
      }, { status: 409 })
    }

    // 5. Check if payment was successful
    if (session.payment_status !== "paid") {
      log.info("Payment not completed", { 
        intakeId, 
        stripeStatus: session.payment_status 
      })
      return NextResponse.json({ 
        success: false, 
        status: intake.status,
        stripe_status: session.payment_status 
      })
    }

    // 6. Payment confirmed - delegate the exact-current paid transition to the
    // shared finalizer used by both Stripe webhook success paths.
    const finalization = await finalizeConfirmedCheckoutPayment({
      intakeId,
      session,
      supabase,
    })

    if (finalization.kind === "not_found") {
      log.error("Intake disappeared during payment verification", { intakeId })
      return NextResponse.json({ error: "Intake not found" }, { status: 404 })
    }

    if (finalization.kind === "stale_session" || finalization.kind === "update_conflict") {
      log.warn("Payment verification skipped because checkout session is no longer current", {
        intakeId,
        sessionId: session.id,
      })
      return NextResponse.json({
        success: false,
        status: finalization.intake?.status || intake.status,
        error: "Payment session is no longer current",
      }, { status: 409 })
    }

    if (finalization.kind === "non_retryable") {
      log.warn("Payment verification refused for non-retryable intake state", {
        intakeId,
        paymentStatus: finalization.intake.payment_status,
        status: finalization.intake.status,
      })
      return NextResponse.json({
        success: false,
        status: finalization.intake.status,
        error: "This request is not awaiting payment",
      }, { status: 409 })
    }

    if (finalization.kind === "invalid_session") {
      log.error("Paid payment verification session was incomplete", {
        intakeId,
        reason: finalization.reason,
        sessionId: session.id,
      })
      return NextResponse.json({
        success: false,
        status: intake.status,
        error: "Payment confirmation was incomplete",
      }, { status: 409 })
    }

    if (finalization.kind === "update_failed") {
      log.error("Failed to update intake via fallback", { intakeId }, finalization.error)
      return NextResponse.json({
        success: false,
        error: "Failed to update intake status",
      }, { status: 500 })
    }

    log.info("Intake marked as paid via fallback verification", { intakeId })

    await completeConfirmedPaymentWork({
      finalizationKind: finalization.kind,
      generateDraftsForIntake,
      intakeId,
      patientId: authResult.profile.id,
      requestPath: "/api/stripe/verify-payment",
      schedule: (task) => after(task),
      serviceCategory: intake.category,
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
    log.error("Unexpected error in verify-payment", {}, error instanceof Error ? error : undefined)
    Sentry.captureException(error, { tags: { route: "verify-payment" } })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
