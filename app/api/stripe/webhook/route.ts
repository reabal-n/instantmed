import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/client"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { notifyPaymentReceived } from "@/lib/notifications/service"
import { env } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("stripe-webhook")

// Use service role for webhook (bypasses RLS)
function getServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
}

/**
 * Atomically try to claim an event for processing.
 * Uses INSERT...ON CONFLICT to prevent race conditions.
 * Returns true if this instance should process the event, false if already processed.
 */
async function tryClaimEvent(
  supabase: ReturnType<typeof getServiceClient>,
  eventId: string,
  eventType: string,
  requestId?: string,
  sessionId?: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  // Use the database function for atomic operation
  const { data, error } = await supabase.rpc("try_process_stripe_event", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_request_id: requestId || null,
    p_session_id: sessionId || null,
    p_metadata: metadata || {},
  })

  if (error) {
    // If the function doesn't exist yet (migration not applied), fall back to legacy check
    log.warn("try_process_stripe_event not available, using legacy check", { eventId }, error)
    return await legacyClaimEvent(supabase, eventId, eventType, requestId, sessionId)
  }

  return data === true
}

/**
 * Legacy fallback for environments where migration hasn't been applied yet.
 * Uses check-then-insert (less safe but backward compatible).
 */
async function legacyClaimEvent(
  supabase: ReturnType<typeof getServiceClient>,
  eventId: string,
  eventType: string,
  requestId?: string,
  sessionId?: string
): Promise<boolean> {
  // Check if already processed
  const { data: existing } = await supabase
    .from("stripe_webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .single()

  if (existing) {
    return false // Already processed
  }

  // Try to insert (may fail if concurrent request won the race)
  const { error: insertError } = await supabase.from("stripe_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    request_id: requestId || null,
    session_id: sessionId || null,
    processed_at: new Date().toISOString(),
  })

  if (insertError) {
    // Likely a unique constraint violation from concurrent request
    if (insertError.code === "23505") {
      log.info("Lost race to process event", { eventId })
      return false
    }
    // Log but continue - the event record is for idempotency, not critical
    log.error("Error recording event", { eventId }, insertError)
  }

  return true
}

/**
 * Record an error for a webhook event (for debugging)
 */
async function recordEventError(
  supabase: ReturnType<typeof getServiceClient>,
  eventId: string,
  errorMessage: string
): Promise<void> {
  await supabase
    .from("stripe_webhook_events")
    .update({ error_message: errorMessage })
    .eq("event_id", eventId)
}

export async function POST(request: Request) {
  const startTime = Date.now()
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    log.error("Missing stripe-signature header", {})
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let webhookSecret: string
  try {
    webhookSecret = env.stripeWebhookSecret
  } catch (error) {
    log.error("STRIPE_WEBHOOK_SECRET not configured", {}, error)
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    log.error("Signature verification failed", {}, err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = getServiceClient()

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    // Support both intake_id (new) and request_id (legacy) in metadata
    const intakeId = session.metadata?.intake_id || session.metadata?.request_id
    const patientId = session.metadata?.patient_id

    log.info("checkout.session.completed received", {
      eventId: event.id,
      sessionId: session.id,
      intakeId,
      patientId,
      amount: session.amount_total,
      paymentStatus: session.payment_status,
    })

    // ATOMIC IDEMPOTENCY CHECK - claim this event for processing
    const shouldProcess = await tryClaimEvent(
      supabase,
      event.id,
      event.type,
      intakeId,
      session.id,
      {
        amount: session.amount_total,
        payment_intent: session.payment_intent,
        customer: session.customer,
      }
    )

    if (!shouldProcess) {
      log.info("Event already processed, skipping", { eventId: event.id })
      return NextResponse.json({ received: true, skipped: true })
    }

    if (!intakeId) {
      log.error("CRITICAL: Missing intake_id in metadata", {
        eventId: event.id,
        sessionId: session.id,
      })
      await recordEventError(supabase, event.id, "Missing intake_id in session metadata")
      return NextResponse.json({ error: "Missing intake_id", processed: true }, { status: 200 })
    }

    try {
      // STEP 1: Check current intake state BEFORE updating
      const { data: currentIntake, error: fetchError } = await supabase
        .from("intakes")
        .select("id, status, payment_status")
        .eq("id", intakeId)
        .single()

      if (fetchError || !currentIntake) {
        const errorMsg = `Intake not found: ${intakeId}`
        log.error("CRITICAL: Intake not found", { intakeId }, fetchError)
        await recordEventError(supabase, event.id, errorMsg)
        return NextResponse.json({ error: "Intake not found", processed: true }, { status: 200 })
      }

      // STEP 2: Guard against double-marking as paid
      if (currentIntake.payment_status === "paid") {
        log.info("Intake already marked as paid, skipping update", {
          intakeId,
          currentStatus: currentIntake.status,
        })
        return NextResponse.json({ received: true, already_paid: true })
      }

      // STEP 3: Update intake to paid status
      const { error: intakeError, data: intakeData } = await supabase
        .from("intakes")
        .update({
          payment_status: "paid",
          status: "paid", // Now visible to doctor in queue
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", intakeId)
        .in("payment_status", ["pending", "unpaid"]) // Only update if still pending
        .select()
        .single()

      if (intakeError) {
        // Check if already paid (concurrent webhook)
        const { data: recheckIntake } = await supabase
          .from("intakes")
          .select("payment_status")
          .eq("id", intakeId)
          .single()

        if (recheckIntake?.payment_status === "paid") {
          log.info("Intake was updated by concurrent webhook", { intakeId })
          return NextResponse.json({ received: true, concurrent_update: true })
        }

        log.error("Intake update FAILED", {
          intakeId,
          sessionId: session.id,
        }, intakeError)
        await recordEventError(supabase, event.id, `Intake update failed: ${intakeError.message}`)
        return NextResponse.json({ error: "Failed to update intake" }, { status: 500 })
      }

      log.info("Intake updated to paid", {
        intakeId,
        newStatus: intakeData?.status,
        sessionId: session.id,
      })

      // STEP 4: Save Stripe customer ID to profile (non-critical)
      if (session.customer && patientId) {
        const customerId = typeof session.customer === "string" ? session.customer : session.customer.id

        const { data: profile } = await supabase
          .from("profiles")
          .select("stripe_customer_id")
          .eq("id", patientId)
          .single()

        if (profile && !profile.stripe_customer_id) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              stripe_customer_id: customerId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", patientId)

          if (profileError) {
            log.error("Profile customer ID save error (non-fatal)", { patientId }, profileError)
          } else {
            log.info("Customer ID saved to profile", { patientId, customerId })
          }
        }
      }

      // STEP 5: Send payment notification (non-critical)
      if (patientId && session.amount_total) {
        const { data: patientProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", patientId)
          .single()

        if (patientProfile?.email) {
          notifyPaymentReceived({
            requestId: intakeId, // Using intakeId for notification tracking
            patientId,
            patientEmail: patientProfile.email,
            patientName: patientProfile.full_name || "Patient",
            amount: session.amount_total,
          }).catch((err) => {
            log.error("Notification error (non-fatal)", { intakeId }, err)
          })
        }
      }

      const duration = Date.now() - startTime
      log.info("Payment processed successfully", {
        eventId: event.id,
        intakeId,
        sessionId: session.id,
        durationMs: duration,
      })

    } catch (error) {
      log.error("Unexpected error", { intakeId }, error)
      await recordEventError(supabase, event.id, error instanceof Error ? error.message : "Unknown error")
      return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
  }

  // Handle checkout.session.expired
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session
    const intakeId = session.metadata?.intake_id || session.metadata?.request_id

    log.info("checkout.session.expired received", {
      eventId: event.id,
      sessionId: session.id,
      intakeId,
    })

    // Atomic claim
    const shouldProcess = await tryClaimEvent(
      supabase,
      event.id,
      event.type,
      intakeId,
      session.id
    )

    if (!shouldProcess) {
      log.info("Expired event already processed", { eventId: event.id })
      return NextResponse.json({ received: true, skipped: true })
    }

    if (intakeId) {
      try {
        // Update intake status to expired if still pending payment
        const { error: expireError } = await supabase
          .from("intakes")
          .update({
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("id", intakeId)
          .eq("status", "pending_payment")

        if (expireError) {
          log.error("Error expiring intake", { sessionId: session.id }, expireError)
        }

        log.info("Intake session expired", {
          intakeId,
          sessionId: session.id,
        })

      } catch (error) {
        log.error("Error handling expired session", { intakeId }, error)
      }
    }
  }

  // Log unhandled event types for visibility
  if (!["checkout.session.completed", "checkout.session.expired"].includes(event.type)) {
    log.info("Unhandled event type", { eventType: event.type })
    // Still try to claim to prevent duplicates
    await tryClaimEvent(supabase, event.id, event.type)
  }

  return NextResponse.json({ received: true })
}
