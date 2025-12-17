import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/client"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { notifyPaymentReceived } from "@/lib/notifications/service"

// Use service role for webhook (bypasses RLS)
function getServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase credentials for webhook")
  }

  return createClient(supabaseUrl, serviceKey)
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
    console.warn("[Stripe Webhook] try_process_stripe_event not available, using legacy check:", error.message)
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
      console.log("[Stripe Webhook] Lost race to process event:", eventId)
      return false
    }
    // Log but continue - the event record is for idempotency, not critical
    console.error("[Stripe Webhook] Error recording event:", insertError)
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
    console.error("[Stripe Webhook] Missing stripe-signature header")
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = getServiceClient()

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const requestId = session.metadata?.request_id
    const patientId = session.metadata?.patient_id

    console.log("[Stripe Webhook] checkout.session.completed received:", {
      eventId: event.id,
      sessionId: session.id,
      requestId,
      patientId,
      amount: session.amount_total,
      paymentStatus: session.payment_status,
    })

    // ATOMIC IDEMPOTENCY CHECK - claim this event for processing
    const shouldProcess = await tryClaimEvent(
      supabase,
      event.id,
      event.type,
      requestId,
      session.id,
      {
        amount: session.amount_total,
        payment_intent: session.payment_intent,
        customer: session.customer,
      }
    )

    if (!shouldProcess) {
      console.log("[Stripe Webhook] Event already processed, skipping:", event.id)
      return NextResponse.json({ received: true, skipped: true })
    }

    if (!requestId) {
      console.error("[Stripe Webhook] CRITICAL: Missing request_id in metadata:", {
        eventId: event.id,
        sessionId: session.id,
      })
      await recordEventError(supabase, event.id, "Missing request_id in session metadata")
      // Return 200 to prevent Stripe retries - this is a data issue, not transient
      return NextResponse.json({ error: "Missing request_id", processed: true }, { status: 200 })
    }

    try {
      // STEP 1: Update payment record
      const { error: paymentError, data: paymentData } = await supabase
        .from("payments")
        .update({
          status: "paid",
          stripe_payment_intent_id: session.payment_intent as string,
          amount_paid: session.amount_total,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id)
        .select()
        .single()

      if (paymentError) {
        console.error("[Stripe Webhook] Payment update error (non-fatal):", {
          sessionId: session.id,
          error: paymentError.message,
        })
        // Continue - payment record is secondary to request status
      } else {
        console.log("[Stripe Webhook] Payment record updated:", {
          paymentId: paymentData?.id,
          sessionId: session.id,
        })
      }

      // STEP 2: Check current request state BEFORE updating
      const { data: currentRequest, error: fetchError } = await supabase
        .from("requests")
        .select("id, status, payment_status, paid")
        .eq("id", requestId)
        .single()

      if (fetchError || !currentRequest) {
        const errorMsg = `Request not found: ${requestId}`
        console.error("[Stripe Webhook] CRITICAL:", errorMsg)
        await recordEventError(supabase, event.id, errorMsg)
        // Return 200 - the request doesn't exist, retrying won't help
        return NextResponse.json({ error: "Request not found", processed: true }, { status: 200 })
      }

      // STEP 3: Guard against double-marking as paid
      if (currentRequest.payment_status === "paid" && currentRequest.paid === true) {
        console.log("[Stripe Webhook] Request already marked as paid, skipping update:", {
          requestId,
          currentStatus: currentRequest.status,
        })
        return NextResponse.json({ received: true, already_paid: true })
      }

      // STEP 4: Update request to paid status
      const { error: requestError, data: requestData } = await supabase
        .from("requests")
        .update({
          paid: true,
          payment_status: "paid",
          status: "pending", // Now visible to doctors
          active_checkout_session_id: null, // Clear the active session
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("payment_status", "pending_payment") // Only update if still pending (prevent race)
        .select()
        .single()

      if (requestError) {
        // Check if the error is because it's already paid (concurrent webhook)
        const { data: recheckRequest } = await supabase
          .from("requests")
          .select("payment_status")
          .eq("id", requestId)
          .single()

        if (recheckRequest?.payment_status === "paid") {
          console.log("[Stripe Webhook] Request was updated by concurrent webhook:", requestId)
          return NextResponse.json({ received: true, concurrent_update: true })
        }

        console.error("[Stripe Webhook] Request update FAILED:", {
          requestId,
          sessionId: session.id,
          error: requestError.message,
        })
        await recordEventError(supabase, event.id, `Request update failed: ${requestError.message}`)
        // Return 500 so Stripe will retry
        return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
      }

      console.log("[Stripe Webhook] Request updated to paid:", {
        requestId,
        newStatus: requestData?.status,
        sessionId: session.id,
      })

      // STEP 5: Save Stripe customer ID to profile (non-critical)
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
            console.error("[Stripe Webhook] Profile customer ID save error (non-fatal):", profileError.message)
          } else {
            console.log("[Stripe Webhook] Customer ID saved to profile:", { patientId, customerId })
          }
        }
      }

      // STEP 6: Send payment notification (non-critical)
      if (patientId && session.amount_total) {
        // Get patient info for notification
        const { data: patientProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", patientId)
          .single()

        if (patientProfile?.email) {
          notifyPaymentReceived({
            requestId,
            patientId,
            patientEmail: patientProfile.email,
            patientName: patientProfile.full_name || "Patient",
            amount: session.amount_total,
          }).catch((err) => {
            console.error("[Stripe Webhook] Notification error (non-fatal):", err)
          })
        }
      }

      const duration = Date.now() - startTime
      console.log("[Stripe Webhook] Payment processed successfully:", {
        eventId: event.id,
        requestId,
        sessionId: session.id,
        durationMs: duration,
      })

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.error("[Stripe Webhook] Unexpected error:", { requestId, error: errorMsg })
      await recordEventError(supabase, event.id, errorMsg)
      return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
  }

  // Handle checkout.session.expired
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session
    const requestId = session.metadata?.request_id

    console.log("[Stripe Webhook] checkout.session.expired received:", {
      eventId: event.id,
      sessionId: session.id,
      requestId,
    })

    // Atomic claim
    const shouldProcess = await tryClaimEvent(
      supabase,
      event.id,
      event.type,
      requestId,
      session.id
    )

    if (!shouldProcess) {
      console.log("[Stripe Webhook] Expired event already processed:", event.id)
      return NextResponse.json({ received: true, skipped: true })
    }

    if (requestId) {
      try {
        // Update payment record to expired
        const { error: expireError } = await supabase
          .from("payments")
          .update({
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_session_id", session.id)

        if (expireError) {
          console.error("[Stripe Webhook] Error expiring payment:", expireError.message)
        }

        // Clear the active checkout session on the request
        await supabase
          .from("requests")
          .update({ active_checkout_session_id: null })
          .eq("id", requestId)
          .eq("active_checkout_session_id", session.id)

        console.log("[Stripe Webhook] Payment marked expired:", {
          requestId,
          sessionId: session.id,
        })

      } catch (error) {
        console.error("[Stripe Webhook] Error handling expired session:", {
          requestId,
          error: error instanceof Error ? error.message : error,
        })
      }
    }
  }

  // Log unhandled event types for visibility
  if (!["checkout.session.completed", "checkout.session.expired"].includes(event.type)) {
    console.log("[Stripe Webhook] Unhandled event type:", event.type)
    // Still try to claim to prevent duplicates
    await tryClaimEvent(supabase, event.id, event.type)
  }

  return NextResponse.json({ received: true })
}
