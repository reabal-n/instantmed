import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

export interface RefundResolutionStripe {
  charges: {
    retrieve(id: string): Promise<Stripe.Charge>
  }
  paymentIntents: {
    retrieve(id: string): Promise<Stripe.PaymentIntent>
  }
}

export type StripeRefundIntakeResolution = {
  error: string | null
  intakeId: string | null
  paymentIntentId: string | null
}

type IdentityCandidate = {
  source: string
  value: string
}

type IntakeIdentityRow = {
  id: string
  stripe_payment_intent_id: string | null
}

type PaymentIdentityRow = {
  id: string
  intake_id: string | null
  stripe_payment_intent_id: string | null
}

type RefundAttemptIdentityRow = {
  id: string
  intake_id: string | null
  payment_intent_id: string | null
  stripe_refund_id: string | null
}

/**
 * Resolve a Stripe refund to one local intake without trusting any single
 * mutable mirror. Every identity source that is present must agree; database
 * and Stripe lookup failures remain retryable errors rather than becoming an
 * unlinked observation.
 */
export async function resolveStripeRefundIntake(
  deps: { stripe: RefundResolutionStripe; supabase: SupabaseClient },
  input: {
    eventCharge?: Stripe.Charge | null
    eventPaymentIntentId?: string | null
    refund: Stripe.Refund
  },
): Promise<StripeRefundIntakeResolution> {
  const intakeCandidates: IdentityCandidate[] = []
  const paymentIntentCandidates: IdentityCandidate[] = []
  const paymentMetadataIds = new Map<string, string>()
  const processedPaymentMetadataIds = new Set<string>()
  const intakeRows = new Map<string, IntakeIdentityRow>()
  const loadedPaymentIntents = new Set<string>()

  addCandidate(
    paymentIntentCandidates,
    "event payment_intent",
    input.eventPaymentIntentId,
  )
  addCandidate(
    paymentIntentCandidates,
    "Refund payment_intent",
    stripeId(input.refund.payment_intent),
  )
  collectMetadataIdentities(
    input.refund.metadata,
    "Refund metadata",
    intakeCandidates,
    paymentMetadataIds,
  )

  const attemptId = metadataValue(input.refund.metadata, "refund_attempt_id")
  if (attemptId) {
    const attemptRead = await deps.supabase
      .from("stripe_refund_attempts")
      .select("id, intake_id, payment_intent_id, stripe_refund_id")
      .eq("id", attemptId)
      .maybeSingle()
    if (attemptRead.error) {
      return resolutionError(
        `Stripe refund attempt lookup failed: ${attemptRead.error.message}`,
        null,
      )
    }
    const attempt = attemptRead.data as unknown as RefundAttemptIdentityRow | null
    if (!attempt?.intake_id) {
      return resolutionError("Stripe refund attempt metadata is missing locally", null)
    }
    if (attempt.stripe_refund_id && attempt.stripe_refund_id !== input.refund.id) {
      return resolutionError("Stripe refund attempt conflicts with Refund identity", null)
    }
    addCandidate(intakeCandidates, "refund attempt", attempt.intake_id)
    addCandidate(
      paymentIntentCandidates,
      "refund attempt payment_intent",
      attempt.payment_intent_id,
    )
  }

  const chargeResult = await refundCharge(
    deps.stripe,
    input.refund.charge,
    input.eventCharge ?? null,
  )
  if (chargeResult.error) return resolutionError(chargeResult.error, null)
  addCandidate(
    paymentIntentCandidates,
    "Charge payment_intent",
    stripeId(chargeResult.charge?.payment_intent ?? null),
  )

  let paymentIntentId = singleIdentity(paymentIntentCandidates)
  if (paymentIntentId.error) return resolutionError(paymentIntentId.error, null)

  // Identity discovery can reveal a PaymentIntent from a legacy payment row or
  // a verified intake. Iterate to a bounded fixed point and inspect that PI's
  // metadata and local mirrors before accepting the resolution.
  for (let pass = 0; pass < 3; pass += 1) {
    let discoveredIdentity = false

    for (const [paymentId, source] of paymentMetadataIds) {
      if (processedPaymentMetadataIds.has(paymentId)) continue
      processedPaymentMetadataIds.add(paymentId)
      discoveredIdentity = true

      const paymentRead = await deps.supabase
        .from("payments")
        .select("id, intake_id, stripe_payment_intent_id")
        .eq("id", paymentId)
        .maybeSingle()
      if (paymentRead.error) {
        return resolutionError(
          `Stripe refund ${source} payment lookup failed: ${paymentRead.error.message}`,
          paymentIntentId.value,
        )
      }
      const payment = paymentRead.data as unknown as PaymentIdentityRow | null
      if (!payment?.intake_id) {
        return resolutionError(
          `Stripe refund ${source} payment is missing locally`,
          paymentIntentId.value,
        )
      }
      addCandidate(intakeCandidates, `${source} payment`, payment.intake_id)
      addCandidate(
        paymentIntentCandidates,
        `${source} payment_intent`,
        payment.stripe_payment_intent_id,
      )
    }

    paymentIntentId = singleIdentity(paymentIntentCandidates)
    if (paymentIntentId.error) return resolutionError(paymentIntentId.error, null)

    if (
      paymentIntentId.value &&
      !loadedPaymentIntents.has(paymentIntentId.value)
    ) {
      discoveredIdentity = true
      loadedPaymentIntents.add(paymentIntentId.value)
      const collectionError = await collectPaymentIntentIdentities({
        deps,
        expandedPaymentIntent: expandedPaymentIntent(input.refund.payment_intent),
        intakeCandidates,
        intakeRows,
        paymentIntentCandidates,
        paymentIntentId: paymentIntentId.value,
        paymentMetadataIds,
      })
      if (collectionError) {
        return resolutionError(collectionError, paymentIntentId.value)
      }
    }

    paymentIntentId = singleIdentity(paymentIntentCandidates)
    if (paymentIntentId.error) return resolutionError(paymentIntentId.error, null)

    const intakeId = singleIdentity(intakeCandidates)
    if (intakeId.error) {
      return resolutionError(intakeId.error, paymentIntentId.value)
    }
    if (intakeId.value && !intakeRows.has(intakeId.value)) {
      discoveredIdentity = true
      const intakeRead = await readIntakeById(deps.supabase, intakeId.value)
      if (intakeRead.error) {
        return resolutionError(intakeRead.error, paymentIntentId.value)
      }
      if (!intakeRead.row) {
        return resolutionError(
          "Stripe refund metadata intake is missing locally",
          paymentIntentId.value,
        )
      }
      intakeRows.set(intakeRead.row.id, intakeRead.row)
    }

    if (intakeId.value) {
      const intake = intakeRows.get(intakeId.value)
      const storedPaymentIntentId = normalizedString(
        intake?.stripe_payment_intent_id,
      )
      if (
        storedPaymentIntentId &&
        paymentIntentId.value &&
        storedPaymentIntentId !== paymentIntentId.value
      ) {
        return resolutionError(
          "Stripe refund PaymentIntent conflicts with the resolved intake",
          paymentIntentId.value,
        )
      }
      if (storedPaymentIntentId && !paymentIntentId.value) {
        discoveredIdentity = true
        addCandidate(
          paymentIntentCandidates,
          "resolved intake payment_intent",
          storedPaymentIntentId,
        )
      }
    }

    if (!discoveredIdentity) break
  }

  paymentIntentId = singleIdentity(paymentIntentCandidates)
  if (paymentIntentId.error) return resolutionError(paymentIntentId.error, null)
  const intakeId = singleIdentity(intakeCandidates)
  if (intakeId.error) return resolutionError(intakeId.error, paymentIntentId.value)

  return {
    error: null,
    intakeId: intakeId.value,
    paymentIntentId: paymentIntentId.value,
  }
}

async function collectPaymentIntentIdentities(input: {
  deps: { stripe: RefundResolutionStripe; supabase: SupabaseClient }
  expandedPaymentIntent: Stripe.PaymentIntent | null
  intakeCandidates: IdentityCandidate[]
  intakeRows: Map<string, IntakeIdentityRow>
  paymentIntentCandidates: IdentityCandidate[]
  paymentIntentId: string
  paymentMetadataIds: Map<string, string>
}): Promise<string | null> {
  const directRead = await input.deps.supabase
    .from("intakes")
    .select("id, stripe_payment_intent_id")
    .eq("stripe_payment_intent_id", input.paymentIntentId)
    .maybeSingle()
  if (directRead.error) {
    return `Stripe refund intake lookup failed: ${directRead.error.message}`
  }
  const directIntake = directRead.data as unknown as IntakeIdentityRow | null
  if (directIntake?.id) {
    input.intakeRows.set(directIntake.id, directIntake)
    addCandidate(input.intakeCandidates, "local PaymentIntent binding", directIntake.id)
  }

  const paymentRead = await input.deps.supabase
    .from("payments")
    .select("id, intake_id, stripe_payment_intent_id")
    .eq("stripe_payment_intent_id", input.paymentIntentId)
  if (paymentRead.error) {
    return `Stripe refund legacy payment lookup failed: ${paymentRead.error.message}`
  }
  const payments = (paymentRead.data ?? []) as unknown as PaymentIdentityRow[]
  const linkedIntakeIds = new Set(
    payments
      .map((payment) => normalizedString(payment.intake_id))
      .filter((value): value is string => Boolean(value)),
  )
  if (linkedIntakeIds.size > 1) {
    return "Stripe refund legacy payment rows conflict on intake identity"
  }
  for (const payment of payments) {
    addCandidate(
      input.intakeCandidates,
      "legacy payment binding",
      payment.intake_id,
    )
    addCandidate(
      input.paymentIntentCandidates,
      "legacy payment payment_intent",
      payment.stripe_payment_intent_id,
    )
  }

  let paymentIntent = input.expandedPaymentIntent
  if (!paymentIntent || paymentIntent.id !== input.paymentIntentId) {
    try {
      paymentIntent = await input.deps.stripe.paymentIntents.retrieve(
        input.paymentIntentId,
      )
    } catch {
      return "Stripe refund PaymentIntent metadata lookup failed"
    }
  }
  if (!paymentIntent || paymentIntent.id !== input.paymentIntentId) {
    return "Stripe refund PaymentIntent lookup returned a conflicting identity"
  }
  collectMetadataIdentities(
    paymentIntent.metadata,
    "PaymentIntent metadata",
    input.intakeCandidates,
    input.paymentMetadataIds,
  )
  return null
}

async function readIntakeById(
  supabase: SupabaseClient,
  intakeId: string,
): Promise<{ error: string | null; row: IntakeIdentityRow | null }> {
  const intakeRead = await supabase
    .from("intakes")
    .select("id, stripe_payment_intent_id")
    .eq("id", intakeId)
    .maybeSingle()
  if (intakeRead.error) {
    return {
      error: `Stripe refund metadata intake lookup failed: ${intakeRead.error.message}`,
      row: null,
    }
  }
  return {
    error: null,
    row: intakeRead.data as unknown as IntakeIdentityRow | null,
  }
}

async function refundCharge(
  stripe: RefundResolutionStripe,
  value: Stripe.Refund["charge"],
  eventCharge: Stripe.Charge | null,
): Promise<{ charge: Stripe.Charge | null; error: string | null }> {
  if (eventCharge) {
    const refundChargeId = stripeId(value)
    if (
      !eventCharge.id ||
      (value !== null && !refundChargeId) ||
      (refundChargeId && refundChargeId !== eventCharge.id)
    ) {
      return {
        charge: null,
        error: "Stripe refund Charge conflicts with event Charge identity",
      }
    }
    if (value && typeof value !== "string") {
      const eventPaymentIntentId = stripeId(eventCharge.payment_intent)
      const refundChargePaymentIntentId = stripeId(value.payment_intent)
      if (
        eventPaymentIntentId &&
        refundChargePaymentIntentId &&
        eventPaymentIntentId !== refundChargePaymentIntentId
      ) {
        return {
          charge: null,
          error: "Stripe refund Charge conflicts with event PaymentIntent identity",
        }
      }
    }
    return { charge: eventCharge, error: null }
  }
  if (!value) return { charge: null, error: null }
  if (typeof value !== "string") return { charge: value, error: null }
  try {
    const charge = await stripe.charges.retrieve(value)
    if (!charge || charge.id !== value) {
      return {
        charge: null,
        error: "Stripe refund Charge lookup returned a conflicting identity",
      }
    }
    return { charge, error: null }
  } catch {
    return { charge: null, error: "Stripe refund Charge lookup failed" }
  }
}

function collectMetadataIdentities(
  metadata: Stripe.Metadata | null | undefined,
  source: string,
  intakeCandidates: IdentityCandidate[],
  paymentMetadataIds: Map<string, string>,
): void {
  addCandidate(
    intakeCandidates,
    `${source} intake_id`,
    metadataValue(metadata, "intake_id"),
  )
  addCandidate(
    intakeCandidates,
    `${source} request_id`,
    metadataValue(metadata, "request_id"),
  )
  const paymentId = metadataValue(metadata, "payment_id")
  if (paymentId) paymentMetadataIds.set(paymentId, source)
}

function singleIdentity(
  candidates: IdentityCandidate[],
): { error: string | null; value: string | null } {
  const byValue = new Map<string, string[]>()
  for (const candidate of candidates) {
    const sources = byValue.get(candidate.value) ?? []
    sources.push(candidate.source)
    byValue.set(candidate.value, sources)
  }
  if (byValue.size <= 1) {
    return { error: null, value: byValue.keys().next().value ?? null }
  }
  return {
    error: `Stripe refund identity conflict across ${candidates
      .map((candidate) => candidate.source)
      .join(", ")}`,
    value: null,
  }
}

function addCandidate(
  candidates: IdentityCandidate[],
  source: string,
  value: string | null | undefined,
): void {
  const normalized = normalizedString(value)
  if (normalized) candidates.push({ source, value: normalized })
}

function metadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string,
): string | null {
  return normalizedString(metadata?.[key])
}

function normalizedString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized || null
}

function stripeId(
  value: { id: string } | string | null | undefined,
): string | null {
  return typeof value === "string"
    ? normalizedString(value)
    : normalizedString(value?.id)
}

function expandedPaymentIntent(
  value: Stripe.Refund["payment_intent"],
): Stripe.PaymentIntent | null {
  return value && typeof value !== "string" ? value : null
}

function resolutionError(
  error: string,
  paymentIntentId: string | null,
): StripeRefundIntakeResolution {
  return { error, intakeId: null, paymentIntentId }
}
