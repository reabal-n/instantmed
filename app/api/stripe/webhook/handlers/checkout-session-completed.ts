import type Stripe from "stripe"
import { NextResponse, after } from "next/server"
import { notifyPaymentReceived } from "@/lib/notifications/service"
import { createLogger } from "@/lib/observability/logger"
import { generateDraftsForIntake } from "@/app/actions/generate-drafts"
import * as Sentry from "@sentry/nextjs"
import { getPostHogClient, trackIntakeFunnelStep } from "@/lib/posthog-server"
import type { WebhookContext, HandlerResult } from "./types"
import { tryClaimEvent, recordEventError, addToDeadLetterQueue } from "./utils"

const log = createLogger("stripe-webhook:checkout-completed")

export async function handleCheckoutSessionCompleted(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase, startTime } = ctx
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

  // BECS Direct Debit (AU bank transfers) fire checkout.session.completed with
  // payment_status="unpaid". The real confirmation arrives via
  // checkout.session.async_payment_succeeded. Skip processing here to avoid
  // marking the intake as paid before the money actually moves.
  if (session.payment_status !== "paid") {
    log.info("Skipping checkout.session.completed — payment not yet confirmed (async payment method)", {
      eventId: event.id,
      sessionId: session.id,
      paymentStatus: session.payment_status,
    })
    return NextResponse.json({ received: true, skipped: true, reason: "async_payment_pending" })
  }

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
        .select("id", { count: "exact", head: true })
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
          retryCount,
        })
        return NextResponse.json({
          error: "Intake not found after max retries",
          processed: true,
          dlq: true,
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
      .select("id, status")
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

      // If the update failed but intake exists with wrong status, try force update
      // Uses .neq("payment_status", "paid") as optimistic lock to prevent double-processing
      if (recheckIntake && recheckIntake.payment_status !== "paid") {
        log.warn("Attempting force update with optimistic lock", {
          intakeId,
          currentPaymentStatus: recheckIntake.payment_status,
        })

        const { error: forceError, data: forceRows } = await supabase
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
          .neq("payment_status", "paid")
          .select("id, status")

        const rowsUpdated = forceRows?.length ?? 0

        if (rowsUpdated > 1) {
          log.error("CRITICAL: Force update affected multiple rows", {
            intakeId,
            rowsUpdated,
            affectedIds: forceRows?.map((r) => r.id),
          })
        }

        if (!forceError && rowsUpdated === 1) {
          log.info("Force update succeeded", { intakeId, newStatus: forceRows![0].status })
          // Don't return early - fall through to continue webhook flow
        } else if (!forceError && rowsUpdated === 0) {
          log.info("Force update matched 0 rows — concurrent webhook already processed", { intakeId })
          return NextResponse.json({ received: true, concurrent_update: true })
        } else {
          log.error("Force update also failed", {
            intakeId,
            forceErrorCode: forceError?.code,
            forceErrorMessage: forceError?.message,
            rowsUpdated,
          }, forceError)
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

    // Track funnel: payment completed
    // Fetch clerk_user_id so server-side PostHog distinctId matches client-side identify()
    const { data: phProfile } = await supabase
      .from("profiles")
      .select("clerk_user_id")
      .eq("id", patientId)
      .maybeSingle()

    // Fetch attribution data stored on the intake at checkout time
    const { data: intakeAttribution } = await supabase
      .from("intakes")
      .select("utm_source, utm_medium, utm_campaign, category, subtype")
      .eq("id", intakeId)
      .maybeSingle()

    // Use clerk_user_id as primary distinctId (matches client-side posthog.identify)
    // Fall back to patientId for guest checkouts without Clerk accounts
    const posthogDistinctId = phProfile?.clerk_user_id || patientId || intakeId

    trackIntakeFunnelStep({
      step: "payment_completed",
      intakeId: intakeId!,
      serviceSlug: session.metadata?.service_slug || "unknown",
      serviceType: session.metadata?.category || session.metadata?.service_type || "unknown",
      userId: posthogDistinctId,
      metadata: { amount_cents: session.amount_total },
    })

    Sentry.addBreadcrumb({
      category: "stripe-webhook",
      message: "Intake marked as paid",
      level: "info",
      data: { intakeId, paymentIntentId, stripeCustomerId },
    })

    // Track payment confirmed in PostHog with full attribution
    try {
      const posthog = getPostHogClient()

      // Identity stitching: connect the browser's anonymous PostHog ID to the resolved user
      // ph_distinct_id is the client-side PostHog distinct ID passed through Stripe metadata
      const browserDistinctId = session.metadata?.ph_distinct_id
      if (browserDistinctId && browserDistinctId !== posthogDistinctId) {
        posthog.alias({
          distinctId: posthogDistinctId,
          alias: browserDistinctId,
        })
      }

      // Alias patientId (Supabase UUID) → clerk_user_id so PostHog merges person records
      if (phProfile?.clerk_user_id && patientId && phProfile.clerk_user_id !== patientId) {
        posthog.alias({
          distinctId: phProfile.clerk_user_id,
          alias: patientId,
        })
      }

      posthog.capture({
        distinctId: posthogDistinctId,
        event: "webhook_payment_confirmed",
        properties: {
          intake_id: intakeId,
          amount_cents: session.amount_total,
          payment_method: session.payment_method_types?.[0],
          service_category: intakeAttribution?.category || session.metadata?.category,
          service_subtype: intakeAttribution?.subtype || session.metadata?.service_slug,
          // Attribution — how this customer found us
          utm_source: intakeAttribution?.utm_source || null,
          utm_medium: intakeAttribution?.utm_medium || null,
          utm_campaign: intakeAttribution?.utm_campaign || null,
          // Person properties: $set_once for first-touch, $set for last-touch
          $set_once: {
            initial_utm_source: intakeAttribution?.utm_source || undefined,
            initial_utm_medium: intakeAttribution?.utm_medium || undefined,
            initial_utm_campaign: intakeAttribution?.utm_campaign || undefined,
            first_payment_at: new Date().toISOString(),
          },
          $set: {
            last_payment_at: new Date().toISOString(),
            last_service: intakeAttribution?.category || session.metadata?.category,
          },
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

    // STEP 4b: Mark exit-intent captures as converted (non-critical)
    // If this customer previously triggered an exit-intent nurture, stop further emails
    try {
      const customerEmail = session.customer_details?.email || session.customer_email
      if (customerEmail) {
        await supabase
          .from("exit_intent_captures")
          .update({
            converted: true,
            converted_at: new Date().toISOString(),
          })
          .eq("email", customerEmail.toLowerCase())
          .eq("converted", false)
      }
    } catch {
      // Non-blocking — nurture suppression is best-effort
    }

    // STEP 5: Send payment notification + confirmation email (non-critical)
    if (patientId && session.amount_total) {
      const { data: patientProfile } = await supabase
        .from("profiles")
        .select("email, full_name, clerk_user_id")
        .eq("id", patientId)
        .single()

      if (patientProfile?.email) {
        // 5a: In-app notification
        notifyPaymentReceived({
          intakeId,
          patientId,
          patientEmail: patientProfile.email,
          patientName: patientProfile.full_name || "Patient",
          amount: session.amount_total,
        }).catch((err) => {
          log.error("Notification error (non-fatal)", { intakeId }, err)
        })

        // 5b: Send merged "request received" email (payment receipt + review status)
        try {
          const React = await import("react")
          const { sendEmail } = await import("@/lib/email/send-email")
          const { RequestReceivedEmail, requestReceivedSubject } = await import("@/components/email/templates/request-received")

          const slugDisplayNames: Record<string, string> = {
            "med-cert-sick": "Medical Certificate",
            "med-cert-carer": "Medical Certificate",
            "common-scripts": "Prescription",
            "consult": "Consultation",
          }
          const serviceName = slugDisplayNames[session.metadata?.service_slug ?? ""] || "Medical Request"

          const amountFormatted = `$${(session.amount_total / 100).toFixed(2)}`
          const isGuest = session.metadata?.guest_checkout === "true" || !patientProfile.clerk_user_id

          const emailResult = await sendEmail({
            to: patientProfile.email,
            toName: patientProfile.full_name || "Patient",
            subject: requestReceivedSubject(serviceName),
            template: React.createElement(RequestReceivedEmail, {
              patientName: patientProfile.full_name || "there",
              requestType: serviceName,
              amount: amountFormatted,
              requestId: intakeId,
              isGuest,
            }),
            emailType: "request_received",
            intakeId,
            patientId,
            metadata: {
              amount_cents: session.amount_total,
              service_slug: session.metadata?.service_slug,
            },
          })

          if (emailResult?.success === false) {
            log.error("Request received email failed", { intakeId, email: patientProfile.email, error: emailResult.error })
          } else {
            log.info("Request received email sent", { intakeId, email: patientProfile.email })
          }
        } catch (emailErr) {
          log.error("Request received email error (non-fatal)", { intakeId }, emailErr)
        }

        // 5c: Telegram notification to doctor
        import("@/lib/notifications/telegram")
          .then(({ notifyNewIntakeViaTelegram }) => {
            const serviceSlug = session.metadata?.service_slug ?? ""
            const slugDisplayNames: Record<string, string> = {
              "med-cert-sick": "Medical Certificate",
              "med-cert-carer": "Carers Certificate",
              "common-scripts": "Prescription",
              "consult": "Consultation",
            }
            return notifyNewIntakeViaTelegram({
              intakeId,
              patientName: patientProfile.full_name || "Patient",
              serviceName: slugDisplayNames[serviceSlug] || "Medical Request",
              amount: `$${(session.amount_total! / 100).toFixed(2)}`,
              serviceSlug,
            })
          })
          .catch((err) => {
            log.error("Telegram notification error (non-fatal)", { intakeId }, err)
          })
      }
    }

    // STEP 6: Generate AI drafts + attempt auto-approval (background)
    // Uses Next.js after() to keep the function alive after the response is sent.
    // This ensures draft generation + auto-approval actually completes on Vercel.
    // Fallback: retry-auto-approval cron (every 3 min) catches any that slip through.
    after(async () => {
      try {
        const result = await generateDraftsForIntake(intakeId)

        if (result.success && !("skipped" in result && result.skipped)) {
          log.info("AI drafts generated", {
            intakeId,
            clinicalNote: "clinicalNote" in result ? result.clinicalNote?.status : undefined,
            medCert: "medCert" in result ? result.medCert?.status : undefined,
          })

          // Attempt auto-approval for med certs immediately after drafts are generated.
          // Draft generation already provides a natural delay (10-30s).
          // The retry-auto-approval cron (every 3 min) catches any that slip through
          // (e.g. webhook timeout, transient errors).
          try {
            const { attemptAutoApproval } = await import("@/lib/clinical/auto-approval-pipeline")
            const autoResult = await attemptAutoApproval(intakeId)
            log.info("Auto-approval attempted", {
              intakeId,
              autoApproved: autoResult.autoApproved,
              reason: autoResult.reason,
              certificateId: autoResult.certificateId,
            })
          } catch (autoErr) {
            // Never fail — auto-approval failure just means doctor reviews manually
            log.warn("Auto-approval error (non-fatal, falls back to doctor queue)", {
              intakeId,
              error: autoErr instanceof Error ? autoErr.message : String(autoErr),
            })
          }
        } else if (!result.success) {
          log.warn("AI draft generation failed, queueing for retry", {
            intakeId,
            error: result.error,
          })
          await supabase.from("ai_draft_retry_queue").upsert({
            intake_id: intakeId,
            attempts: 1,
            last_error: result.error || "Unknown error",
            next_retry_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
          }, { onConflict: "intake_id" })
        }
      } catch (err) {
        log.error("AI draft generation error, queueing for retry", { intakeId }, err)
        try {
          const { error: upsertErr } = await supabase.from("ai_draft_retry_queue").upsert({
            intake_id: intakeId,
            attempts: 1,
            last_error: err instanceof Error ? err.message : String(err),
            next_retry_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
          }, { onConflict: "intake_id" })
          if (upsertErr) log.error("Failed to queue draft retry", { intakeId, error: upsertErr.message })
        } catch (queueErr) {
          log.error("Failed to queue draft retry", { intakeId, error: queueErr instanceof Error ? queueErr.message : String(queueErr) })
        }
      }
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
      tags: { source: "stripe-webhook", event_type: event.type },
      extra: { eventId: event.id, intakeId },
    })
    log.error("Unexpected error", { intakeId }, error)
    await recordEventError(supabase, event.id, error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
