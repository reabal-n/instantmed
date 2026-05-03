import * as Sentry from "@sentry/nextjs"
import { after, NextResponse } from "next/server"
import type Stripe from "stripe"

import { generateDraftsForIntake } from "@/app/actions/generate-drafts"
import { getPostHogClient, trackIntakeFunnelStep } from "@/lib/analytics/posthog-server"
import { sendPaidRequestTelegramNotification } from "@/lib/notifications/paid-request-telegram"
import { notifyPaymentReceived } from "@/lib/notifications/service"
import { createLogger } from "@/lib/observability/logger"
import { startPostPaymentReviewWork } from "@/lib/stripe/post-payment"

import type { HandlerResult, WebhookContext } from "./types"
import { addToDeadLetterQueue, recordEventError, tryClaimEvent } from "./utils"

export { shouldSendPaidRequestTelegramNotification } from "@/lib/notifications/paid-request-telegram"

const log = createLogger("stripe-webhook:checkout-completed")

type ServiceDisplayNameInput = {
  serviceSlug?: string
  category?: string
  subtype?: string
}

/**
 * Resolve a human-friendly service name for patient emails + doctor notifications.
 * Consult intakes distinguish by subtype (ED, hair loss, etc.) so patients and
 * doctors see the specific pathway, not just "Consultation".
 */
function getServiceDisplayName(input: ServiceDisplayNameInput): string {
  const { serviceSlug = "", category = "", subtype = "" } = input

  if (category === "consult" || serviceSlug === "consult") {
    const subtypeLabels: Record<string, string> = {
      ed: "ED Consultation",
      hair_loss: "Hair Loss Consultation",
      womens_health: "Women's Health Consultation",
      weight_loss: "Weight Loss Consultation",
      new_medication: "New Medication Request",
      general: "General Consultation",
    }
    return subtypeLabels[subtype] ?? "Consultation"
  }

  const slugDisplayNames: Record<string, string> = {
    "med-cert-sick": "Medical Certificate",
    "med-cert-carer": "Carers Certificate",
    "common-scripts": "Prescription",
    "consult": "Consultation",
  }
  return slugDisplayNames[serviceSlug] ?? "Medical Request"
}

async function notifyPaidRequestTelegramForSession(
  supabase: WebhookContext["supabase"],
  session: Stripe.Checkout.Session,
  intakeId: string | null | undefined,
  patientId: string | null | undefined,
  patientName?: string | null,
): Promise<void> {
  try {
    await sendPaidRequestTelegramNotification({
      supabase,
      intakeId,
      patientId,
      patientName,
      paymentStatus: session.payment_status,
      amountCents: session.amount_total,
      serviceSlug: session.metadata?.service_slug,
      category: session.metadata?.category,
      subtype: session.metadata?.subtype,
    })
  } catch (err) {
    log.error("Telegram notification error (non-fatal)", { intakeId }, err)
    Sentry.captureException(err, { tags: { source: "telegram-notification" }, extra: { intakeId } })
  }
}

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
    log.info("Skipping checkout.session.completed - payment not yet confirmed (async payment method)", {
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
  const shouldProcess = ctx.adminReplay || await tryClaimEvent(
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
    await notifyPaidRequestTelegramForSession(supabase, session, intakeId, patientId)
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
      await startPostPaymentReviewWork({
        generateDraftsForIntake,
        intakeId,
        schedule: (task) => after(task),
        serviceCategory: session.metadata?.category || session.metadata?.service_type,
        serviceSlug: session.metadata?.service_slug,
        supabase,
      })
      await notifyPaidRequestTelegramForSession(supabase, session, intakeId, patientId)
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
      .in("payment_status", ["pending", "unpaid", "failed"]) // Allow successful retries after failed attempts
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
        await notifyPaidRequestTelegramForSession(supabase, session, intakeId, patientId)
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
          log.info("Force update matched 0 rows - concurrent webhook already processed", { intakeId })
          await notifyPaidRequestTelegramForSession(supabase, session, intakeId, patientId)
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

    await startPostPaymentReviewWork({
      generateDraftsForIntake,
      intakeId,
      schedule: (task) => after(task),
      serviceCategory: session.metadata?.category || session.metadata?.service_type,
      serviceSlug: session.metadata?.service_slug,
      supabase,
    })

    // Track funnel: payment completed
    // Fetch auth_user_id so server-side PostHog distinctId matches client-side identify()
    const { data: phProfile } = await supabase
      .from("profiles")
      .select("auth_user_id")
      .eq("id", patientId)
      .maybeSingle()

    // Fetch attribution data stored on the intake at checkout time
    const { data: intakeAttribution } = await supabase
      .from("intakes")
      .select("utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, landing_page, attribution_captured_at, category, subtype, gclid, gbraid, wbraid, amount_cents")
      .eq("id", intakeId)
      .maybeSingle()

    // Server-side Google Ads Conversion API. Recovers attribution lost to
    // iOS Safari ITP. Browser-side gtag also fires from /patient/intakes/success
    // - Google deduplicates on orderId (intakeId) so duplicates are safe.
    // No-ops cleanly when env vars or click ids are missing.
    if (intakeId && intakeAttribution && (intakeAttribution.gclid || intakeAttribution.gbraid || intakeAttribution.wbraid)) {
      after(async () => {
        try {
          const { fireGoogleAdsPurchaseConversion } = await import("@/lib/analytics/google-ads-conversion-api")
          await fireGoogleAdsPurchaseConversion({
            orderId: intakeId,
            gclid: intakeAttribution.gclid as string | null,
            gbraid: intakeAttribution.gbraid as string | null,
            wbraid: intakeAttribution.wbraid as string | null,
            value: typeof session.amount_total === "number" ? session.amount_total / 100 : (intakeAttribution.amount_cents as number) / 100,
          })
        } catch (err) {
          log.warn("Server-side Google Ads conversion fire failed", {
            error: err instanceof Error ? err.message : String(err),
          })
        }
      })
    }

    // Use auth_user_id as primary distinctId (matches client-side posthog.identify)
    // Fall back to patientId for guest checkouts without authenticated accounts
    const posthogDistinctId = phProfile?.auth_user_id || patientId || intakeId

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

      // Alias patientId (Supabase UUID) → auth_user_id so PostHog merges person records
      if (phProfile?.auth_user_id && patientId && phProfile.auth_user_id !== patientId) {
        posthog.alias({
          distinctId: phProfile.auth_user_id,
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
          // Attribution - how this customer found us
          utm_source: intakeAttribution?.utm_source || null,
          utm_medium: intakeAttribution?.utm_medium || null,
          utm_campaign: intakeAttribution?.utm_campaign || null,
          utm_content: intakeAttribution?.utm_content || null,
          utm_term: intakeAttribution?.utm_term || null,
          referrer: intakeAttribution?.referrer || null,
          landing_page: intakeAttribution?.landing_page || null,
          attribution_captured_at: intakeAttribution?.attribution_captured_at || null,
          // Person properties: $set_once for first-touch, $set for last-touch
          $set_once: {
            initial_utm_source: intakeAttribution?.utm_source || undefined,
            initial_utm_medium: intakeAttribution?.utm_medium || undefined,
            initial_utm_campaign: intakeAttribution?.utm_campaign || undefined,
            initial_utm_content: intakeAttribution?.utm_content || undefined,
            initial_utm_term: intakeAttribution?.utm_term || undefined,
            initial_referrer: intakeAttribution?.referrer || undefined,
            initial_landing_page: intakeAttribution?.landing_page || undefined,
            first_payment_at: new Date().toISOString(),
          },
          $set: {
            last_payment_at: new Date().toISOString(),
            last_referrer: intakeAttribution?.referrer || undefined,
            last_landing_page: intakeAttribution?.landing_page || undefined,
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

    // STEP 4b: Award referral credits on first payment (non-critical)
    // If this checkout included a referral_code, check if this is the referred user's first payment.
    // If so: mark referral_event completed + award $5 to both referrer and referred.
    try {
      const referralCode = session.metadata?.referral_code
      if (referralCode && patientId) {
        // Is this the referred user's first payment?
        const { count: priorPayments } = await supabase
          .from("intakes")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", patientId)
          .eq("payment_status", "paid")
          .neq("id", intakeId) // exclude the current one

        const isFirstPayment = (priorPayments ?? 0) === 0

        if (isFirstPayment) {
          // Look up referrer by code
          const { data: referrer } = await supabase
            .from("profiles")
            .select("id")
            .eq("referral_code", referralCode)
            .maybeSingle()

          if (referrer && referrer.id !== patientId) {
            // Create or find the referral_event (upsert - idempotent if webhook retries)
            const { data: existingEvent } = await supabase
              .from("referral_events")
              .select("id, status")
              .eq("referrer_id", referrer.id)
              .eq("referred_id", patientId)
              .maybeSingle()

            if (!existingEvent) {
              // First time we've seen this pair - create event + award credits
              const { data: newEvent } = await supabase
                .from("referral_events")
                .insert({
                  referrer_id: referrer.id,
                  referred_id: patientId,
                  status: "credited",
                  completed_at: new Date().toISOString(),
                  credited_at: new Date().toISOString(),
                  intake_id: intakeId,
                })
                .select("id")
                .single()

              if (newEvent) {
                // Award $5 to referrer
                await supabase.from("referral_credits").insert({
                  profile_id: referrer.id,
                  referral_event_id: newEvent.id,
                  credit_cents: 500,
                  credit_type: "referrer",
                })
                // Award $5 to referred patient
                await supabase.from("referral_credits").insert({
                  profile_id: patientId,
                  referral_event_id: newEvent.id,
                  credit_cents: 500,
                  credit_type: "referred",
                })
                log.info("Referral credits awarded", {
                  referrerId: referrer.id,
                  referredId: patientId,
                  intakeId,
                })
              }
            } else if (existingEvent.status === "pending") {
              // Referral event exists but not yet credited - complete it
              await supabase
                .from("referral_events")
                .update({
                  status: "credited",
                  completed_at: new Date().toISOString(),
                  credited_at: new Date().toISOString(),
                  intake_id: intakeId,
                })
                .eq("id", existingEvent.id)

              await Promise.all([
                supabase.from("referral_credits").insert({
                  profile_id: referrer.id,
                  referral_event_id: existingEvent.id,
                  credit_cents: 500,
                  credit_type: "referrer",
                }),
                supabase.from("referral_credits").insert({
                  profile_id: patientId,
                  referral_event_id: existingEvent.id,
                  credit_cents: 500,
                  credit_type: "referred",
                }),
              ])
              log.info("Referral credits awarded (existing event)", {
                referrerId: referrer.id,
                referredId: patientId,
                intakeId,
              })
            }
            // If status is already 'credited', idempotent - do nothing
          }
        }
      }
    } catch (referralErr) {
      // Never fail the payment flow over referral logic
      log.error("Referral credit error (non-fatal)", { intakeId }, referralErr as Error)
    }

    // STEP 4b2: Mark referral credits as redeemed if a coupon was applied (non-critical)
    // The checkout flow creates a Stripe coupon from unspent credits and stores the
    // coupon ID + credit IDs in session metadata. Now that payment succeeded, mark
    // those credits as applied so they aren't double-spent on the next checkout.
    try {
      const couponId = session.metadata?.referral_coupon_id
      if (couponId && patientId) {
        const { error: creditErr } = await supabase
          .from("referral_credits")
          .update({
            applied_at: new Date().toISOString(),
            applied_intake_id: intakeId,
          })
          .eq("profile_id", patientId)
          .is("applied_at", null)

        if (!creditErr) {
          log.info("Referral credits marked as applied", { couponId, intakeId, patientId })
        } else {
          log.warn("Failed to mark referral credits as applied", { couponId, intakeId, error: creditErr.message })
        }
      }
    } catch {
      // Non-blocking - credit marking is best-effort, credits can be reconciled later
    }

    // STEP 4d: Create subscription record if this was a subscription checkout
    if (session.metadata?.is_subscription === "true" && session.subscription) {
      try {
        const stripeSubId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id
        const custId = typeof session.customer === "string"
          ? session.customer
          : session.customer?.id

        if (stripeSubId && custId && patientId) {
          await supabase.from("subscriptions").upsert({
            profile_id: patientId,
            stripe_subscription_id: stripeSubId,
            stripe_customer_id: custId,
            status: "active",
            credits_remaining: 1,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: "stripe_subscription_id" })

          log.info("Subscription record created", { subscriptionId: stripeSubId, patientId })
        }
      } catch (subError) {
        log.error("Failed to create subscription record", { intakeId },
          subError instanceof Error ? subError : undefined)
        // Non-blocking - subscription record can be reconciled later
      }
    }

    // STEP 5: Send payment notification + confirmation email (non-critical)
    let patientProfile: { email: string | null; full_name: string | null; auth_user_id: string | null } | null = null
    if (patientId) {
      const { data } = await supabase
        .from("profiles")
        .select("email, full_name, auth_user_id")
        .eq("id", patientId)
        .maybeSingle()
      patientProfile = data

      if (patientProfile?.email && typeof session.amount_total === "number") {
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
          const { RequestReceivedEmail, requestReceivedSubject } = await import("@/lib/email/components/templates/request-received")

          const serviceName = getServiceDisplayName({
            serviceSlug: session.metadata?.service_slug,
            category: session.metadata?.category,
            subtype: session.metadata?.subtype,
          })

          const amountFormatted = `$${(session.amount_total / 100).toFixed(2)}`
          const isGuest = session.metadata?.guest_checkout === "true" || !patientProfile.auth_user_id

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
              paidAt: new Date().toLocaleDateString("en-AU", {
                timeZone: "Australia/Sydney",
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
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
            log.error("Request received email failed", { intakeId, error: emailResult.error })
          } else {
            log.info("Request received email sent", { intakeId })
          }
        } catch (emailErr) {
          log.error("Request received email error (non-fatal)", { intakeId }, emailErr)
        }
      }
    }

    // 5c: Telegram notification to doctor. This is ledgered separately from
    // email so webhook retries can recover a paid request that was marked paid
    // before the external Telegram API call completed.
    await notifyPaidRequestTelegramForSession(supabase, session, intakeId, patientId, patientProfile?.full_name)

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
