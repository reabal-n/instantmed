import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import {
  GOOGLE_ADS_ATTRIBUTION_SELECT,
  type GoogleAdsAttributionRow,
  type GoogleAdsConversionSource,
  runGoogleAdsPostPaymentAttribution,
} from "@/lib/analytics/google-ads-post-payment"
import {
  capturePersonlessPostHogEvent,
  trackIntakeFunnelStep,
} from "@/lib/analytics/posthog-server"
import {
  getOpaquePostHogEventId,
  getOpaquePostHogRequestId,
  resolvePersonlessPostHogDistinctId,
} from "@/lib/analytics/posthog-server-privacy"
import { buildVerifiedCompleteAccountHref } from "@/lib/auth/complete-account-handoff"
import { env } from "@/lib/config/env"
import { sendPaidRequestTelegramNotification } from "@/lib/notifications/paid-request-telegram"
import { notifyPaymentReceived } from "@/lib/notifications/service"
import { createLogger } from "@/lib/observability/logger"
import { canRetryPaymentForIntake } from "@/lib/stripe/payment-integrity"
import { startPostPaymentReviewWork } from "@/lib/stripe/post-payment"

const log = createLogger("confirmed-payment-finalization")

type ConfirmedPaymentIntake = {
  category?: string | null
  id: string
  paid_at?: string | null
  patient_id?: string | null
  payment_id?: string | null
  payment_status?: string | null
  status?: string | null
  stripe_payment_intent_id?: string | null
}

type FinalizationError = {
  code?: string
  details?: string
  hint?: string
  message: string
}

export type ConfirmedPaymentFinalizationResult =
  | { kind: "settled"; intake: ConfirmedPaymentIntake }
  | { kind: "already_paid"; intake: ConfirmedPaymentIntake }
  | { kind: "concurrent_paid"; intake: ConfirmedPaymentIntake }
  | { kind: "not_found"; error?: FinalizationError | null }
  | { kind: "stale_session"; intake: ConfirmedPaymentIntake }
  | { kind: "non_retryable"; intake: ConfirmedPaymentIntake }
  | { kind: "invalid_session"; reason: "amount_missing" | "payment_unconfirmed" }
  | { kind: "update_conflict"; intake?: ConfirmedPaymentIntake | null }
  | { kind: "update_failed"; error: FinalizationError; intake?: ConfirmedPaymentIntake | null }

type ConfirmedCheckoutSession = Pick<
  Stripe.Checkout.Session,
  "amount_total" | "customer" | "id" | "payment_intent" | "payment_status"
>

type FinalizeConfirmedCheckoutPaymentInput = {
  intakeId: string
  now?: Date
  session: ConfirmedCheckoutSession
  supabase: SupabaseClient
}

type PaidFinalizationKind = Extract<
  ConfirmedPaymentFinalizationResult,
  { kind: "settled" | "already_paid" | "concurrent_paid" }
>["kind"]

type CompleteConfirmedPaymentWorkInput = {
  finalizationKind: PaidFinalizationKind
  generateDraftsForIntake: (intakeId: string) => Promise<{
    success: boolean
    error?: string
    skipped?: boolean
  }>
  intakeId: string
  patientId?: string | null
  requestPath?: string | null
  schedule: (task: () => Promise<void>) => void
  serviceCategory?: string | null
  session: Stripe.Checkout.Session
  source: Exclude<GoogleAdsConversionSource, "cron_backfill">
  supabase: SupabaseClient
}

const INTAKE_STATE_SELECT =
  "id, status, payment_status, payment_id, paid_at, category, patient_id, stripe_payment_intent_id"

function stripeObjectId(
  value: string | { id: string } | null,
): string | null {
  return typeof value === "string" ? value : value?.id || null
}

function asIntake(value: unknown): ConfirmedPaymentIntake | null {
  if (!value || typeof value !== "object") return null
  return value as ConfirmedPaymentIntake
}

/**
 * The sole owner of the exact-current Checkout Session -> paid transition.
 *
 * Every confirmed Stripe path delegates here so refund amount, identifiers,
 * retryable-state guards, and concurrent-write diagnosis cannot drift between
 * sync webhooks, async webhooks, and the authenticated browser fallback.
 */
export async function finalizeConfirmedCheckoutPayment({
  intakeId,
  now = new Date(),
  session,
  supabase,
}: FinalizeConfirmedCheckoutPaymentInput): Promise<ConfirmedPaymentFinalizationResult> {
  if (session.payment_status !== "paid") {
    return { kind: "invalid_session", reason: "payment_unconfirmed" }
  }

  if (typeof session.amount_total !== "number") {
    return { kind: "invalid_session", reason: "amount_missing" }
  }

  const { data, error } = await supabase
    .from("intakes")
    .select(INTAKE_STATE_SELECT)
    .eq("id", intakeId)
    .maybeSingle()
  const currentIntake = asIntake(data)

  if (error || !currentIntake) {
    return {
      kind: "not_found",
      error: error as FinalizationError | null,
    }
  }

  // A paid signal can only settle the exact Checkout Session stored on the
  // intake. This is deliberately strict even when payment_id is null.
  if (currentIntake.payment_id !== session.id) {
    return { kind: "stale_session", intake: currentIntake }
  }

  if (currentIntake.payment_status === "paid") {
    return { kind: "already_paid", intake: currentIntake }
  }

  if (!canRetryPaymentForIntake(currentIntake.status, currentIntake.payment_status)) {
    return { kind: "non_retryable", intake: currentIntake }
  }

  const timestamp = now.toISOString()
  const paymentIntentId = stripeObjectId(session.payment_intent)
  const stripeCustomerId = stripeObjectId(session.customer)
  const { data: updatedData, error: updateError } = await supabase
    .from("intakes")
    .update({
      amount_cents: session.amount_total,
      checkout_error: null,
      paid_at: timestamp,
      payment_status: "paid",
      status: "paid",
      stripe_customer_id: stripeCustomerId,
      stripe_payment_intent_id: paymentIntentId,
      updated_at: timestamp,
    })
    .eq("id", intakeId)
    .eq("payment_id", session.id)
    .in("status", ["pending_payment", "checkout_failed"])
    .in("payment_status", ["pending", "unpaid", "failed"])
    .select(INTAKE_STATE_SELECT)
    .maybeSingle()
  const updatedIntake = asIntake(updatedData)

  if (!updateError && updatedIntake) {
    return { kind: "settled", intake: updatedIntake }
  }

  // A zero-row CAS or a PostgREST single-row error can be a legitimate race.
  // Re-read authoritative state before deciding whether to retry or escalate.
  const { data: recheckData } = await supabase
    .from("intakes")
    .select(INTAKE_STATE_SELECT)
    .eq("id", intakeId)
    .maybeSingle()
  const recheckIntake = asIntake(recheckData)

  if (recheckIntake?.payment_id !== session.id) {
    return recheckIntake
      ? { kind: "stale_session", intake: recheckIntake }
      : updateError
        ? {
            kind: "update_failed",
            error: updateError as FinalizationError,
            intake: null,
          }
        : { kind: "update_conflict", intake: null }
  }

  if (recheckIntake.payment_status === "paid") {
    return { kind: "concurrent_paid", intake: recheckIntake }
  }

  if (!canRetryPaymentForIntake(recheckIntake.status, recheckIntake.payment_status)) {
    return { kind: "non_retryable", intake: recheckIntake }
  }

  if (updateError) {
    return {
      kind: "update_failed",
      error: updateError as FinalizationError,
      intake: recheckIntake,
    }
  }

  return { kind: "update_conflict", intake: recheckIntake }
}

type PatientProfile = {
  auth_user_id?: string | null
  email?: string | null
  full_name?: string | null
  stripe_customer_id?: string | null
}

async function loadCompletionContext(
  supabase: SupabaseClient,
  intakeId: string,
  patientId?: string | null,
): Promise<{
  attribution: GoogleAdsAttributionRow | null
  patientProfile: PatientProfile | null
}> {
  const [profileResult, attributionResult] = await Promise.all([
    patientId
      ? supabase
          .from("profiles")
          .select("auth_user_id, email, full_name, stripe_customer_id")
          .eq("id", patientId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("intakes")
      .select(GOOGLE_ADS_ATTRIBUTION_SELECT)
      .eq("id", intakeId)
      .maybeSingle(),
  ])

  return {
    attribution: (attributionResult.data as GoogleAdsAttributionRow | null) ?? null,
    patientProfile: (profileResult.data as PatientProfile | null) ?? null,
  }
}

async function saveStripeCustomerId({
  patientId,
  stripeCustomerId,
  supabase,
}: {
  patientId?: string | null
  stripeCustomerId: string | null
  supabase: SupabaseClient
}): Promise<void> {
  if (!patientId || !stripeCustomerId) return

  const { error } = await supabase
    .from("profiles")
    .update({
      stripe_customer_id: stripeCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patientId)
    .is("stripe_customer_id", null)

  if (error) {
    log.warn("Failed to reconcile Stripe customer id after payment", {
      patientId,
      error: error.message,
    })
  }
}

async function awardReferralCredits({
  intakeId,
  patientId,
  referralCode,
  supabase,
}: {
  intakeId: string
  patientId?: string | null
  referralCode?: string | null
  supabase: SupabaseClient
}): Promise<void> {
  if (!referralCode || !patientId) return

  try {
    const { count: priorPayments } = await supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId)
      .eq("payment_status", "paid")
      .neq("id", intakeId)

    if ((priorPayments ?? 0) > 0) return

    const { data: referrerData } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", referralCode)
      .maybeSingle()
    const referrer = referrerData as { id?: string | null } | null
    if (!referrer?.id || referrer.id === patientId) return

    const { data: existingData } = await supabase
      .from("referral_events")
      .select("id, status")
      .eq("referrer_id", referrer.id)
      .eq("referred_id", patientId)
      .maybeSingle()
    const existing = existingData as { id: string; status: string } | null

    let referralEventId = existing?.id
    if (!existing) {
      const { data: insertedData, error: insertError } = await supabase
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
        .maybeSingle()

      if (insertError) {
        // A concurrent finalizer may have won the unique referrer/referred
        // insert. Re-read instead of double-awarding.
        const { data: racedData } = await supabase
          .from("referral_events")
          .select("id, status")
          .eq("referrer_id", referrer.id)
          .eq("referred_id", patientId)
          .maybeSingle()
        const raced = racedData as { id: string; status: string } | null
        if (!raced || raced.status === "credited") return

        const { data: claimedData, error: claimError } = await supabase
          .from("referral_events")
          .update({
            status: "credited",
            completed_at: new Date().toISOString(),
            credited_at: new Date().toISOString(),
            intake_id: intakeId,
          })
          .eq("id", raced.id)
          .eq("status", raced.status)
          .select("id")
          .maybeSingle()
        const claimedEvent = claimedData as { id: string } | null
        if (claimError) {
          log.warn("Failed to claim raced referral event", {
            intakeId,
            error: claimError.message,
          })
          return
        }
        if (!claimedEvent) return
        referralEventId = claimedEvent.id
      } else {
        referralEventId = (insertedData as { id?: string } | null)?.id
      }
    } else if (existing.status === "credited") {
      return
    } else {
      const { data: claimedData, error } = await supabase
        .from("referral_events")
        .update({
          status: "credited",
          completed_at: new Date().toISOString(),
          credited_at: new Date().toISOString(),
          intake_id: intakeId,
        })
        .eq("id", existing.id)
        .eq("status", existing.status)
        .select("id")
        .maybeSingle()
      const claimedEvent = claimedData as { id: string } | null
      if (error) {
        log.warn("Failed to claim pending referral event", {
          intakeId,
          error: error.message,
        })
        return
      }
      if (!claimedEvent) return
      referralEventId = claimedEvent.id
    }

    if (!referralEventId) return

    // The relationship state is the idempotency ledger. Credits are inserted
    // only by the finalizer that creates or atomically claims the event.
    await Promise.all([
      supabase.from("referral_credits").insert({
        profile_id: referrer.id,
        referral_event_id: referralEventId,
        credit_cents: 500,
        credit_type: "referrer",
      }),
      supabase.from("referral_credits").insert({
        profile_id: patientId,
        referral_event_id: referralEventId,
        credit_cents: 500,
        credit_type: "referred",
      }),
    ])
  } catch (error) {
    log.error("Referral completion failed after payment", { intakeId }, error)
  }
}

async function redeemAppliedReferralCredits({
  couponId,
  intakeId,
  patientId,
  supabase,
}: {
  couponId?: string | null
  intakeId: string
  patientId?: string | null
  supabase: SupabaseClient
}): Promise<void> {
  if (!couponId || !patientId) return

  try {
    const { error } = await supabase
      .from("referral_credits")
      .update({
        applied_at: new Date().toISOString(),
        applied_intake_id: intakeId,
      })
      .eq("profile_id", patientId)
      .is("applied_at", null)

    if (error) {
      log.warn("Failed to mark referral credits as applied", {
        couponId,
        intakeId,
        error: error.message,
      })
    }
  } catch {
    // A later exact-current paid signal can safely retry this idempotent write.
  }
}

function scheduleRequestReceivedEmail({
  intakeId,
  patientId,
  patientProfile,
  schedule,
  session,
}: {
  intakeId: string
  patientId?: string | null
  patientProfile: PatientProfile | null
  schedule: (task: () => Promise<void>) => void
  session: Stripe.Checkout.Session
}): void {
  if (!patientId || !patientProfile?.email || typeof session.amount_total !== "number") return

  schedule(async () => {
    try {
      const React = await import("react")
      const { sendEmail } = await import("@/lib/email/send-email")
      const {
        RequestReceivedEmail,
        requestReceivedSubject,
      } = await import("@/lib/email/components/templates/request-received")
      const {
        emailRequestTypeLabelFromStripeMetadata,
      } = await import("@/lib/email/request-type-label")

      const serviceName = emailRequestTypeLabelFromStripeMetadata({
        serviceSlug: session.metadata?.service_slug,
        category: session.metadata?.category,
        subtype: session.metadata?.subtype,
      })
      const isGuest =
        session.metadata?.guest_checkout === "true" ||
        !patientProfile.auth_user_id

      const result = await sendEmail({
        to: patientProfile.email!,
        toName: patientProfile.full_name || "Patient",
        subject: requestReceivedSubject(serviceName),
        template: React.createElement(RequestReceivedEmail, {
          patientName: patientProfile.full_name || "there",
          requestType: serviceName,
          amount: `$${(session.amount_total! / 100).toFixed(2)}`,
          requestId: intakeId,
          isGuest,
          completeAccountUrl: isGuest
            ? buildVerifiedCompleteAccountHref({
                appUrl: env.appUrl,
                intakeId,
                sessionId: session.id,
              })
            : undefined,
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

      if (result?.success === false) {
        log.warn("Request received email remains queued for retry", {
          intakeId,
          error: result.error,
        })
      }
    } catch (error) {
      log.error("Request received email finalization failed", { intakeId }, error)
    }
  })
}

function trackConfirmedPayment({
  attribution,
  intakeId,
  session,
  source,
}: {
  attribution: GoogleAdsAttributionRow | null
  intakeId: string
  session: Stripe.Checkout.Session
  source: Exclude<GoogleAdsConversionSource, "cron_backfill">
}): string {
  const browserAnonymousId = session.metadata?.ph_distinct_id
  const distinctId = resolvePersonlessPostHogDistinctId({
    anonymousId: browserAnonymousId,
    requestId: intakeId,
  })
  const serviceType =
    attribution?.category ||
    session.metadata?.category ||
    session.metadata?.service_type ||
    "unknown"
  const serviceSubtype =
    attribution?.subtype ||
    session.metadata?.subtype ||
    session.metadata?.service_slug ||
    null

  trackIntakeFunnelStep({
    step: "payment_completed",
    intakeId,
    serviceSlug: session.metadata?.service_slug || "unknown",
    serviceType,
    subtype: serviceSubtype,
    anonymousId: distinctId,
    metadata: {
      amount_cents: session.amount_total,
      finalization_source: source,
    },
  })

  try {
    const attributionProperties = {
      utm_source: attribution?.utm_source || null,
      utm_medium: attribution?.utm_medium || null,
      utm_id: attribution?.utm_id || null,
      utm_campaign: attribution?.utm_campaign || null,
      utm_content: attribution?.utm_content || null,
      campaignid: attribution?.campaignid || null,
      adgroupid: attribution?.adgroupid || null,
      creative: attribution?.creative || null,
      matchtype: attribution?.matchtype || null,
      device: attribution?.device || null,
      network: attribution?.network || null,
      referrer: attribution?.referrer || null,
      landing_page: attribution?.landing_page || null,
      has_gclid: Boolean(attribution?.gclid),
      has_gbraid: Boolean(attribution?.gbraid),
      has_wbraid: Boolean(attribution?.wbraid),
      has_utm_source: Boolean(attribution?.utm_source),
      has_utm_campaign: Boolean(attribution?.utm_campaign),
      has_campaignid: Boolean(attribution?.campaignid),
      has_any_attribution: Boolean(
        attribution?.gclid ||
          attribution?.gbraid ||
          attribution?.wbraid ||
          attribution?.utm_source ||
          attribution?.campaignid ||
          attribution?.referrer
      ),
    }

    capturePersonlessPostHogEvent({
      anonymousId: distinctId,
      event: "webhook_payment_confirmed",
      requestId: intakeId,
      properties: {
        ...attributionProperties,
        $insert_id: getOpaquePostHogEventId("webhook_payment_confirmed", intakeId),
        analytics_request_id: getOpaquePostHogRequestId(intakeId),
        amount_cents: session.amount_total,
        payment_method: session.payment_method_types?.[0],
        service_category: serviceType,
        service_subtype: serviceSubtype,
        finalization_source: source,
      },
    })

    capturePersonlessPostHogEvent({
      anonymousId: distinctId,
      event: "purchase_completed_server",
      requestId: intakeId,
      properties: {
        ...attributionProperties,
        $insert_id: getOpaquePostHogEventId("purchase_completed_server", intakeId),
        analytics_request_id: getOpaquePostHogRequestId(intakeId),
        value: session.amount_total != null ? session.amount_total / 100 : null,
        amount_cents: session.amount_total,
        currency: (session.currency || "aud").toUpperCase(),
        service_category: serviceType,
        service_subtype: serviceSubtype,
        source: "confirmed_payment_finalizer",
        finalization_source: source,
      },
    })
  } catch {
    // Analytics never blocks service delivery.
  }

  return distinctId
}

async function notifyPaidRequestTelegram({
  intakeId,
  patientId,
  session,
  supabase,
}: {
  intakeId: string
  patientId?: string | null
  session: Stripe.Checkout.Session
  supabase: SupabaseClient
}): Promise<void> {
  try {
    await sendPaidRequestTelegramNotification({
      supabase,
      intakeId,
      patientId,
      paymentStatus: "paid",
      amountCents: session.amount_total,
      serviceSlug: session.metadata?.service_slug,
      category: session.metadata?.category,
      subtype: session.metadata?.subtype,
    })
  } catch (error) {
    log.error("Paid-request Telegram finalization failed", { intakeId }, error)
  }
}

/**
 * Runs the idempotent completion work that must follow any exact-current paid
 * result, including a browser fallback that wins before Stripe's webhook.
 */
export async function completeConfirmedPaymentWork({
  finalizationKind,
  generateDraftsForIntake,
  intakeId,
  patientId,
  requestPath,
  schedule,
  serviceCategory,
  session,
  source,
  supabase,
}: CompleteConfirmedPaymentWorkInput): Promise<void> {
  await startPostPaymentReviewWork({
    generateDraftsForIntake,
    intakeId,
    schedule,
    serviceCategory:
      serviceCategory ||
      session.metadata?.category ||
      session.metadata?.service_type,
    serviceSlug: session.metadata?.service_slug,
    supabase,
  })

  const { attribution, patientProfile } = await loadCompletionContext(
    supabase,
    intakeId,
    patientId,
  )
  const stripeCustomerId = stripeObjectId(session.customer)

  await Promise.all([
    saveStripeCustomerId({ patientId, stripeCustomerId, supabase }),
    awardReferralCredits({
      intakeId,
      patientId,
      referralCode: session.metadata?.referral_code,
      supabase,
    }),
    redeemAppliedReferralCredits({
      couponId: session.metadata?.referral_coupon_id,
      intakeId,
      patientId,
      supabase,
    }),
  ])

  const distinctId = trackConfirmedPayment({
    attribution,
    intakeId,
    session,
    source,
  })

  if (attribution) {
    schedule(async () => {
      try {
        await runGoogleAdsPostPaymentAttribution({
          amountCents: session.amount_total,
          intakeId,
          posthogAnonymousId: distinctId,
          requestPath,
          row: attribution,
          source,
          supabase,
        })
      } catch (error) {
        log.warn("Google Ads post-payment finalization failed", {
          intakeId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })
  }

  scheduleRequestReceivedEmail({
    intakeId,
    patientId,
    patientProfile,
    schedule,
    session,
  })

  if (
    finalizationKind === "settled" &&
    patientId &&
    patientProfile?.email &&
    typeof session.amount_total === "number"
  ) {
    schedule(async () => {
      await notifyPaymentReceived({
        intakeId,
        patientId,
        patientEmail: patientProfile.email!,
        patientName: patientProfile.full_name || "Patient",
        amount: session.amount_total!,
      })
    })
  }

  await notifyPaidRequestTelegram({ intakeId, patientId, session, supabase })
}
