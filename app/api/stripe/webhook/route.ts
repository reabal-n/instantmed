import crypto from "crypto"
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/client"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { notifyPaymentReceived } from "@/lib/notifications/service"
import { sendRefundEmail, sendPaymentFailedEmail, sendDisputeAlertEmail, sendGuestCompleteAccountEmail } from "@/lib/email/template-sender"
import { env } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"
import { generateDraftsForIntake } from "@/app/actions/generate-drafts"
import * as Sentry from "@sentry/nextjs"
import { getPostHogClient } from "@/lib/posthog-server"

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

/**
 * Add failed event to dead letter queue for manual resolution
 * Also sends Sentry alert so operators are notified immediately
 * P2 FIX: Added threshold alerting when DLQ grows too large
 */
async function addToDeadLetterQueue(
  supabase: ReturnType<typeof getServiceClient>,
  eventId: string,
  eventType: string,
  sessionId: string | null,
  intakeId: string | null,
  errorMessage: string,
  errorCode?: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from("stripe_webhook_dead_letter").insert({
      event_id: eventId,
      event_type: eventType,
      session_id: sessionId,
      intake_id: intakeId,
      error_message: errorMessage,
      error_code: errorCode || null,
      payload: payload || null,
    })
    log.warn("Added to dead letter queue", { eventId, intakeId, errorMessage })
    
    // Alert operators via Sentry - this is a critical payment issue
    Sentry.captureMessage(`Stripe webhook failed: ${errorCode || "UNKNOWN"}`, {
      level: "error",
      tags: {
        source: "stripe-webhook-dlq",
        error_code: errorCode || "unknown",
        event_type: eventType,
      },
      extra: {
        eventId,
        sessionId,
        intakeId,
        errorMessage,
        payload,
      },
    })

    // P2 FIX: Check DLQ size and alert if threshold exceeded
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: dlqCount } = await supabase
      .from("stripe_webhook_dead_letter")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneHourAgo)
      .is("resolved_at", null)
    
    const DLQ_ALERT_THRESHOLD = 5
    if (dlqCount && dlqCount >= DLQ_ALERT_THRESHOLD) {
      Sentry.captureMessage(`CRITICAL: Stripe webhook DLQ has ${dlqCount} unresolved items in last hour`, {
        level: "fatal",
        tags: {
          source: "stripe-webhook-dlq-threshold",
          dlq_count: String(dlqCount),
        },
        extra: {
          threshold: DLQ_ALERT_THRESHOLD,
          recentCount: dlqCount,
          latestEventId: eventId,
        },
      })
      log.error("DLQ threshold exceeded - possible systemic webhook failure", { 
        dlqCount, 
        threshold: DLQ_ALERT_THRESHOLD 
      })
    }
  } catch (dlqError) {
    log.error("Failed to add to dead letter queue", { eventId }, dlqError)
    // Still try to alert even if DLQ insert failed
    Sentry.captureException(dlqError, {
      tags: { source: "stripe-webhook-dlq-insert-failed" },
      extra: { eventId, intakeId, errorMessage },
    })
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")
  
  // Check for admin replay request (from DLQ retry)
  const isAdminReplay = request.headers.get("X-Admin-Replay") === "true"
  const adminReplaySecret = request.headers.get("X-Admin-Replay-Secret")
  const originalEventId = request.headers.get("X-Original-Event-Id")

  let event: Stripe.Event

  if (isAdminReplay) {
    // Verify admin replay secret
    const expectedSecret = process.env.INTERNAL_API_SECRET || ""
    if (
      !adminReplaySecret ||
      !expectedSecret ||
      adminReplaySecret.length !== expectedSecret.length ||
      !crypto.timingSafeEqual(Buffer.from(adminReplaySecret), Buffer.from(expectedSecret))
    ) {
      log.warn("Invalid admin replay secret", { originalEventId })
      return NextResponse.json({ error: "Invalid replay credentials" }, { status: 401 })
    }
    
    // Parse the stored payload directly (signature already verified on first receipt)
    try {
      const payload = JSON.parse(body)
      event = payload as Stripe.Event
      log.info("Processing admin replay", { eventId: event.id, originalEventId, type: event.type })
    } catch (parseError) {
      log.error("Failed to parse admin replay payload", { originalEventId }, parseError)
      return NextResponse.json({ error: "Invalid replay payload" }, { status: 400 })
    }
  } else {
    // Normal webhook flow - verify signature
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

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      log.error("Signature verification failed", {}, err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
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

    Sentry.addBreadcrumb({
      category: "stripe-webhook",
      message: "checkout.session.completed received",
      level: "info",
      data: { eventId: event.id, intakeId, sessionId: session.id },
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
        allMetadata: JSON.stringify(session.metadata),
      })
      await recordEventError(supabase, event.id, "Missing intake_id in session metadata")
      return NextResponse.json({ error: "Missing intake_id", processed: true }, { status: 200 })
    }

    // Validate intake_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(intakeId)) {
      log.error("CRITICAL: Invalid intake_id format in metadata", {
        eventId: event.id,
        sessionId: session.id,
        intakeId,
        intakeIdType: typeof intakeId,
      })
      await recordEventError(supabase, event.id, `Invalid intake_id format: ${intakeId}`)
      return NextResponse.json({ error: "Invalid intake_id format", processed: true }, { status: 200 })
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
        log.error("CRITICAL: Intake not found - adding to dead letter queue", { 
          intakeId,
          fetchErrorCode: fetchError?.code,
          fetchErrorMessage: fetchError?.message,
          fetchErrorDetails: fetchError?.details,
        }, fetchError)
        await recordEventError(supabase, event.id, errorMsg)
        
        // Check if we've already retried this event multiple times
        const { count } = await supabase
          .from("stripe_webhook_dead_letter")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id)
        
        const retryCount = count || 0
        const MAX_RETRIES = 3
        
        // Add to dead letter queue for manual resolution
        await addToDeadLetterQueue(
          supabase,
          event.id,
          event.type,
          session.id,
          intakeId,
          errorMsg,
          "INTAKE_NOT_FOUND",
          { amount: session.amount_total, payment_intent: session.payment_intent, retry_count: retryCount }
        )
        
        // After MAX_RETRIES, stop asking Stripe to retry to prevent 72-hour retry storm
        if (retryCount >= MAX_RETRIES) {
          log.error("Max retries reached for missing intake - stopping retries", { 
            intakeId, 
            eventId: event.id, 
            retryCount 
          })
          return NextResponse.json({ 
            error: "Intake not found after max retries", 
            processed: true,
            dlq: true 
          }, { status: 200 })
        }
        
        // Return 500 to force Stripe retry - intake might be created by a slow concurrent request
        return NextResponse.json({ error: "Intake not found" }, { status: 500 })
      }

      // STEP 2: Guard against double-marking as paid
      if (currentIntake.payment_status === "paid") {
        log.info("Intake already marked as paid, skipping update", {
          intakeId,
          currentStatus: currentIntake.status,
        })
        return NextResponse.json({ received: true, already_paid: true })
      }

      // STEP 3: Update intake to paid status with Stripe identifiers for refund traceability
      const paymentIntentId = typeof session.payment_intent === "string" 
        ? session.payment_intent 
        : session.payment_intent?.id || null
      const stripeCustomerId = typeof session.customer === "string"
        ? session.customer
        : session.customer?.id || null

      Sentry.addBreadcrumb({
        category: "stripe-webhook",
        message: "Updating intake to paid",
        level: "info",
        data: { intakeId, paymentIntentId, stripeCustomerId },
      })

      const { error: intakeError, data: intakeData } = await supabase
        .from("intakes")
        .update({
          payment_status: "paid",
          status: "paid", // Now visible to doctor in queue
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Store Stripe identifiers for refund traceability
          stripe_payment_intent_id: paymentIntentId,
          stripe_customer_id: stripeCustomerId,
        })
        .eq("id", intakeId)
        .in("payment_status", ["pending", "unpaid"]) // Only update if still pending
        .select()
        .single()

      if (intakeError) {
        // Check current intake state for diagnosis
        const { data: recheckIntake, error: recheckError } = await supabase
          .from("intakes")
          .select("id, status, payment_status, paid_at, stripe_payment_intent_id")
          .eq("id", intakeId)
          .single()

        log.error("Intake update FAILED - diagnosing", {
          intakeId,
          sessionId: session.id,
          updateErrorCode: intakeError.code,
          updateErrorMessage: intakeError.message,
          updateErrorDetails: intakeError.details,
          updateErrorHint: intakeError.hint,
          currentIntakeState: recheckIntake,
          recheckError: recheckError?.message,
        }, intakeError)

        if (recheckIntake?.payment_status === "paid") {
          log.info("Intake was updated by concurrent webhook", { intakeId })
          return NextResponse.json({ received: true, concurrent_update: true })
        }

        // If the update failed but intake exists with wrong status, try force update without the IN clause
        if (recheckIntake && recheckIntake.payment_status !== "paid") {
          log.warn("Attempting force update without payment_status filter", { 
            intakeId, 
            currentPaymentStatus: recheckIntake.payment_status 
          })
          
          const { error: forceError, data: forceData } = await supabase
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
            .select()
            .single()
          
          if (!forceError && forceData) {
            log.info("Force update succeeded", { intakeId, newStatus: forceData.status })
            // Don't return early - fall through to continue webhook flow
          } else {
            log.error("Force update also failed", { 
              intakeId, 
              forceErrorCode: forceError?.code,
              forceErrorMessage: forceError?.message,
            }, forceError)
            await recordEventError(supabase, event.id, `Intake update failed: ${intakeError.message}`)
            // Add to dead letter queue for critical failures
            await addToDeadLetterQueue(
              supabase,
              event.id,
              event.type,
              session.id,
              intakeId,
              `Intake update failed: ${intakeError.message}`,
              "UPDATE_FAILED",
              { amount: session.amount_total, payment_intent: session.payment_intent }
            )
            return NextResponse.json({ error: "Failed to update intake" }, { status: 500 })
          }
        } else {
          // Intake doesn't exist or couldn't be recovered - add to DLQ
          await recordEventError(supabase, event.id, `Intake update failed: ${intakeError.message}`)
          await addToDeadLetterQueue(
            supabase,
            event.id,
            event.type,
            session.id,
            intakeId,
            `Intake update failed: ${intakeError.message}`,
            "UPDATE_FAILED",
            { amount: session.amount_total, payment_intent: session.payment_intent }
          )
          return NextResponse.json({ error: "Failed to update intake" }, { status: 500 })
        }
      }

      log.info("Intake updated to paid", {
        intakeId,
        newStatus: intakeData?.status,
        sessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: stripeCustomerId,
      })

      Sentry.addBreadcrumb({
        category: "stripe-webhook",
        message: "Intake marked as paid",
        level: "info",
        data: { intakeId, paymentIntentId, stripeCustomerId },
      })

      // Track payment confirmed in PostHog
      try {
        const posthog = getPostHogClient()
        posthog.capture({
          distinctId: patientId || intakeId,
          event: 'webhook_payment_confirmed',
          properties: {
            intake_id: intakeId,
            amount_cents: session.amount_total,
            payment_method: session.payment_method_types?.[0],
          },
        })
      } catch { /* non-blocking */ }

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
          .select("email, full_name, auth_user_id")
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
          
          // STEP 5b: Send guest account completion email if this was a guest checkout
          const isGuestCheckout = session.metadata?.guest_checkout === "true" || !patientProfile.auth_user_id
          if (isGuestCheckout) {
            const serviceName = session.metadata?.service_slug || "medical certificate"
            sendGuestCompleteAccountEmail({
              to: patientProfile.email,
              patientName: patientProfile.full_name || "there",
              serviceName,
              intakeId,
              patientId,
            }).catch((err) => {
              log.error("Guest account email error (non-fatal)", { intakeId }, err)
            })
            log.info("Guest account completion email queued", { intakeId, email: patientProfile.email })
          }
        }
      }

      // STEP 6: Generate AI drafts (fire-and-forget, non-blocking)
      // This generates clinical note + med cert drafts for doctor review
      // Wrap with timeout to prevent hanging promises from OpenAI
      const AI_DRAFT_TIMEOUT_MS = 30000 // 30 seconds
      const timeoutPromise = new Promise<{ success: false; error: string }>((resolve) => {
        setTimeout(() => resolve({ success: false, error: "AI draft generation timed out after 30s" }), AI_DRAFT_TIMEOUT_MS)
      })
      
      Promise.race([generateDraftsForIntake(intakeId), timeoutPromise])
        .then((result) => {
          if (result.success) {
            log.info("AI drafts generated", {
              intakeId,
              skipped: 'skipped' in result ? result.skipped : undefined,
              clinicalNote: 'clinicalNote' in result ? result.clinicalNote?.status : undefined,
              medCert: 'medCert' in result ? result.medCert?.status : undefined,
            })
          } else {
            log.warn("AI draft generation failed, queueing for retry", {
              intakeId,
              error: result.error,
            })
            // Queue for retry
            supabase.from("ai_draft_retry_queue").upsert({
              intake_id: intakeId,
              attempts: 1,
              last_error: result.error || "Unknown error",
              next_retry_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 min backoff
            }, { onConflict: "intake_id" }).then(() => {
              log.info("Queued draft for retry", { intakeId })
            })
          }
        })
        .catch(async (err) => {
          // Never fail the webhook due to draft generation errors
          log.error("AI draft generation error, queueing for retry", { intakeId }, err)
          // Queue for retry
          const { error } = await supabase.from("ai_draft_retry_queue").upsert({
            intake_id: intakeId,
            attempts: 1,
            last_error: err instanceof Error ? err.message : String(err),
            next_retry_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
          }, { onConflict: "intake_id" })
          if (error) log.error("Failed to queue draft retry", { intakeId, error: error.message })
        })

      const duration = Date.now() - startTime
      log.info("Payment processed successfully", {
        eventId: event.id,
        intakeId,
        sessionId: session.id,
        durationMs: duration,
      })

    } catch (error) {
      Sentry.captureException(error, {
        tags: { source: 'stripe-webhook', event_type: event.type },
        extra: { eventId: event.id, intakeId },
      })
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

  // Handle charge.refunded - update payment status when refund completes
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge
    const paymentIntentId = typeof charge.payment_intent === 'string' 
      ? charge.payment_intent 
      : charge.payment_intent?.id

    log.info("charge.refunded received", {
      eventId: event.id,
      chargeId: charge.id,
      paymentIntentId,
      amountRefunded: charge.amount_refunded,
    })

    const shouldProcess = await tryClaimEvent(supabase, event.id, event.type, undefined, charge.id)
    if (!shouldProcess) {
      return NextResponse.json({ received: true, skipped: true })
    }

    if (paymentIntentId) {
      // Update intake payment_status based on refund
      // Note: payment_id stores checkout session ID, so we need to look up by stripe_payment_intent_id
      // or find the intake via the checkout session that has this payment intent
      const isFullRefund = charge.amount_refunded === charge.amount

      // First try to find intake by stripe_payment_intent_id if we stored it
      let updateResult = await supabase
        .from("intakes")
        .update({
          payment_status: isFullRefund ? "refunded" : "partially_refunded",
          refund_amount_cents: charge.amount_refunded,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_payment_intent_id", paymentIntentId)
        .select("id")

      // If no rows updated, try looking up via Stripe API to get session ID
      if (!updateResult.data?.length) {
        try {
          // Find payment intents that match and get the checkout session
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
          const sessionId = paymentIntent.metadata?.checkout_session_id
          
          if (sessionId) {
            updateResult = await supabase
              .from("intakes")
              .update({
                payment_status: isFullRefund ? "refunded" : "partially_refunded",
                refund_amount_cents: charge.amount_refunded,
                updated_at: new Date().toISOString(),
              })
              .eq("payment_id", sessionId)
              .select("id")
          }
        } catch (stripeError) {
          log.warn("Could not retrieve payment intent for refund lookup", { 
            paymentIntentId,
            error: stripeError instanceof Error ? stripeError.message : "Unknown error"
          })
        }
      }

      // Also update legacy payments table if it exists
      await supabase
        .from("payments")
        .update({
          status: "refunded",
          refund_status: isFullRefund ? "refunded" : "partially_refunded",
          refund_amount: charge.amount_refunded,
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_payment_intent_id", paymentIntentId)

      if (updateResult.error) {
        log.error("Error updating intake after refund", { paymentIntentId }, updateResult.error)
      } else if (updateResult.data?.length) {
        const intakeId = updateResult.data[0].id
        log.info("Intake payment status updated after refund", { 
          paymentIntentId,
          intakeId,
          isFullRefund,
          amountRefunded: charge.amount_refunded,
        })

        // Send refund notification email to patient
        try {
          const { data: intake } = await supabase
            .from("intakes")
            .select("id, patient_id")
            .eq("id", intakeId)
            .single()

          if (intake?.patient_id) {
            const { data: patient } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .eq("id", intake.patient_id)
              .single()

            if (patient?.email) {
              const amountFormatted = `$${(charge.amount_refunded / 100).toFixed(2)}`
              await sendRefundEmail({
                to: patient.email,
                patientName: patient.full_name || "there",
                amount: amountFormatted,
                refundReason: isFullRefund ? "Your request was declined or cancelled" : "Partial refund processed",
                intakeId,
                patientId: patient.id,
              })
              log.info("Refund notification email sent", { intakeId, to: patient.email })
            }
          }
        } catch (emailError) {
          // Don't fail the webhook for email errors
          log.error("Failed to send refund notification email", { intakeId }, emailError)
        }
      } else {
        log.warn("No intake found to update for refund", { paymentIntentId })
      }
    }
  }

  // Handle payment_intent.payment_failed - track failed payments
  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const intakeId = paymentIntent.metadata?.intake_id || paymentIntent.metadata?.request_id

    log.warn("payment_intent.payment_failed received", {
      eventId: event.id,
      paymentIntentId: paymentIntent.id,
      intakeId,
      failureMessage: paymentIntent.last_payment_error?.message,
    })

    const shouldProcess = await tryClaimEvent(supabase, event.id, event.type, intakeId, paymentIntent.id)
    if (!shouldProcess) {
      return NextResponse.json({ received: true, skipped: true })
    }

    if (intakeId) {
      await supabase
        .from("intakes")
        .update({
          payment_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", intakeId)

      // P1 FIX: Send payment failure notification to patient
      try {
        const { data: intake } = await supabase
          .from("intakes")
          .select("category, patient:profiles!patient_id(email, first_name)")
          .eq("id", intakeId)
          .single()

        const patient = intake?.patient as { email?: string; first_name?: string } | null
        const service = { name: intake?.category || "Service" }
        
        if (patient?.email) {
          await sendPaymentFailedEmail({
            to: patient.email,
            patientName: patient.first_name || "there",
            serviceName: service?.name || "your request",
            failureReason: paymentIntent.last_payment_error?.message || "Your payment could not be processed",
            retryUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"}/patient/intakes/${intakeId}?retry=true`,
            intakeId,
          })
          log.info("Sent payment failure notification", { intakeId, email: patient.email })
        }
      } catch (emailError) {
        log.error("Failed to send payment failure notification", { intakeId }, emailError)
      }
    }
  }

  // P0 FIX: Handle charge.dispute.created - critical for revenue protection
  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute
    const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id
    
    log.error("DISPUTE CREATED - Immediate attention required", {
      eventId: event.id,
      disputeId: dispute.id,
      chargeId,
      amount: dispute.amount,
      reason: dispute.reason,
      status: dispute.status,
    })

    const shouldProcess = await tryClaimEvent(supabase, event.id, event.type, undefined, chargeId)
    if (!shouldProcess) {
      return NextResponse.json({ received: true, skipped: true })
    }

    // Find the intake associated with this charge
    let intakeId: string | undefined
    try {
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId)
        const paymentIntentId = typeof charge.payment_intent === "string" 
          ? charge.payment_intent 
          : charge.payment_intent?.id
        
        if (paymentIntentId) {
          const { data: intake } = await supabase
            .from("intakes")
            .select("id")
            .eq("stripe_payment_intent_id", paymentIntentId)
            .single()
          
          intakeId = intake?.id
        }
      }
    } catch {
      // Intake lookup failed - continue with alerting
    }

    // Record dispute in database (upsert to handle duplicates)
    await supabase.from("stripe_disputes").upsert({
      dispute_id: dispute.id,
      charge_id: chargeId,
      intake_id: intakeId || null,
      amount: dispute.amount,
      currency: dispute.currency,
      reason: dispute.reason,
      status: dispute.status,
      created_at: new Date(dispute.created * 1000).toISOString(),
    }, { onConflict: "dispute_id", ignoreDuplicates: true })

    // Update intake if found
    if (intakeId) {
      await supabase
        .from("intakes")
        .update({
          payment_status: "disputed",
          dispute_id: dispute.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", intakeId)
    }

    // Alert admin team via Sentry and email
    Sentry.captureMessage(`Stripe Dispute Created: ${dispute.id}`, {
      level: "error",
      extra: {
        disputeId: dispute.id,
        chargeId,
        intakeId,
        amount: dispute.amount,
        reason: dispute.reason,
      },
    })

    // Send alert email to admin
    try {
      await sendDisputeAlertEmail({
        disputeId: dispute.id,
        chargeId: chargeId || "unknown",
        intakeId,
        amount: (dispute.amount / 100).toFixed(2),
        currency: dispute.currency.toUpperCase(),
        reason: dispute.reason,
        evidenceDueBy: dispute.evidence_details?.due_by 
          ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
          : undefined,
      })
    } catch (emailError) {
      log.error("Failed to send dispute alert email", { disputeId: dispute.id }, emailError)
    }
  }

  // Log unhandled event types for visibility
  const handledEvents = [
    "checkout.session.completed", 
    "checkout.session.expired",
    "charge.refunded",
    "payment_intent.payment_failed",
    "charge.dispute.created",
  ]
  if (!handledEvents.includes(event.type)) {
    log.info("Unhandled event type", { eventType: event.type })
    // Still try to claim to prevent duplicates
    await tryClaimEvent(supabase, event.id, event.type)
  }

  return NextResponse.json({ received: true })
}
