import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { generateDraftsForIntake } from "@/app/actions/generate-drafts"

const log = createLogger("stripe-verify-payment")

/**
 * Fallback endpoint to verify payment status with Stripe
 * Called from success page if webhook hasn't updated the intake yet
 * This ensures intakes get marked as paid even if webhook fails/delays
 */
export async function POST(req: NextRequest) {
  try {
    const { intakeId, sessionId } = await req.json()

    if (!intakeId) {
      return NextResponse.json({ error: "Missing intake_id" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // 1. Check current intake status
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select("id, status, payment_status, payment_id")
      .eq("id", intakeId)
      .single()

    if (fetchError || !intake) {
      log.error("Intake not found for verification", { intakeId })
      return NextResponse.json({ error: "Intake not found" }, { status: 404 })
    }

    // 2. Already paid - no action needed
    if (intake.payment_status === "paid") {
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

    // 6. Payment confirmed - update intake status (webhook fallback)
    log.info("Webhook fallback: Marking intake as paid", { intakeId })

    const paymentIntentId = typeof session.payment_intent === "string" 
      ? session.payment_intent 
      : session.payment_intent?.id || null
    const stripeCustomerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || null

    const { error: updateError } = await supabase
      .from("intakes")
      .update({
        payment_status: "paid",
        status: "paid",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: stripeCustomerId,
      })
      .eq("id", intakeId)
      .in("payment_status", ["pending", "unpaid"])

    if (updateError) {
      log.error("Failed to update intake via fallback", { intakeId }, updateError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to update intake status" 
      }, { status: 500 })
    }

    log.info("Intake marked as paid via fallback verification", { intakeId })

    // 7. Trigger AI draft generation (non-blocking)
    generateDraftsForIntake(intakeId).catch((err) => {
      log.error("Draft generation failed after fallback payment", { intakeId }, err)
    })

    return NextResponse.json({ 
      success: true, 
      status: "paid",
      fallback_applied: true 
    })

  } catch (error) {
    log.error("Unexpected error in verify-payment", {}, error instanceof Error ? error : undefined)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
