import type Stripe from "stripe"

type CheckoutSessionLike = Pick<Stripe.Checkout.Session, "id" | "metadata">

type SessionMatchInput = {
  intakeId: string
  session: CheckoutSessionLike
  storedPaymentId?: string | null
}

type SessionMatchResult =
  | { valid: true }
  | { valid: false; reason: "metadata_intake_mismatch" | "missing_intake_metadata" }

type GuestDuplicateCheckoutIntake = {
  id: string
  payment_id?: string | null
  payment_status?: string | null
  status?: string | null
}

type GuestDuplicateCheckoutRecovery =
  | { success: true; checkoutUrl: string; intakeId: string }
  | { success: false; error: string }

export type CompleteAccountPaymentState = "paid" | "processing" | "unconfirmed"

type CompleteAccountSessionState =
  | "expired"
  | "failed"
  | "open"
  | "paid"
  | "payment_in_flight"
  | "unresolved"

const RETRYABLE_INTAKE_STATUSES = new Set(["pending_payment", "checkout_failed"])
const RETRYABLE_PAYMENT_STATUSES = new Set(["pending", "unpaid", "failed"])
export const PAYMENT_REPLACEMENT_LOCK = "payment_session_replacement_in_progress"
export const CANCELLABLE_UNPAID_INTAKE_STATUSES = new Set(["draft", "pending_payment", "checkout_failed"])
export const TERMINAL_PAID_PAYMENT_STATUSES = new Set(["paid", "refunded", "partially_refunded", "disputed"])

export function buildPaymentIntentMetadata(
  metadata: Record<string, string | null | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, string] => (
      typeof entry[1] === "string" && entry[1].length > 0
    )),
  )
}

export function canRetryPaymentForIntake(
  intakeStatus: string | null | undefined,
  paymentStatus: string | null | undefined,
): boolean {
  return Boolean(
    intakeStatus &&
    paymentStatus &&
    RETRYABLE_INTAKE_STATUSES.has(intakeStatus) &&
    RETRYABLE_PAYMENT_STATUSES.has(paymentStatus),
  )
}

export function canCancelUnpaidCheckoutIntake(
  intakeStatus: string | null | undefined,
  paymentStatus: string | null | undefined,
): boolean {
  if (!intakeStatus || !CANCELLABLE_UNPAID_INTAKE_STATUSES.has(intakeStatus)) {
    return false
  }
  return !paymentStatus || !TERMINAL_PAID_PAYMENT_STATUSES.has(paymentStatus)
}

export function validateCheckoutSessionIntakeMatch({
  intakeId,
  session,
  storedPaymentId,
}: SessionMatchInput): SessionMatchResult {
  const metadataIntakeId = session.metadata?.intake_id || session.metadata?.request_id

  if (metadataIntakeId) {
    return metadataIntakeId === intakeId
      ? { valid: true }
      : { valid: false, reason: "metadata_intake_mismatch" }
  }

  if (storedPaymentId && session.id === storedPaymentId) {
    return { valid: true }
  }

  return { valid: false, reason: "missing_intake_metadata" }
}

export function resolveCompleteAccountPaymentState({
  intakePaymentStatus,
  sessionMatches,
  sessionState,
}: {
  intakePaymentStatus?: string | null
  sessionMatches: boolean
  sessionState: CompleteAccountSessionState | null
}): CompleteAccountPaymentState {
  // This public route must never expose a paid/processing state from a bare
  // intake id. The high-entropy Checkout Session id must exactly match the id
  // currently stored on the intake first.
  if (!sessionMatches) return "unconfirmed"

  if (intakePaymentStatus === "paid" || sessionState === "paid") return "paid"
  if (sessionState === "payment_in_flight") return "processing"
  return "unconfirmed"
}

export function resolveCompleteAccountAmountCents({
  intakeAmountCents,
  sessionAmountTotal,
  sessionState,
}: {
  intakeAmountCents?: number | null
  sessionAmountTotal?: number | null
  sessionState: CompleteAccountSessionState | null
}): number | undefined {
  // During the redirect-before-webhook race, the intake still carries its
  // seeded list/base amount. Stripe's owned paid Session is authoritative for
  // the actual charge after referral discounts and the Priority line item.
  if (sessionState === "paid" && typeof sessionAmountTotal === "number") {
    return sessionAmountTotal
  }
  return typeof intakeAmountCents === "number" ? intakeAmountCents : undefined
}

export function resolveGuestDuplicateCheckoutRecovery({
  baseUrl,
  checkoutUrl,
  intake,
}: {
  baseUrl: string
  checkoutUrl?: string | null
  intake: GuestDuplicateCheckoutIntake
}): GuestDuplicateCheckoutRecovery {
  if (intake.payment_status === "paid") {
    const destination = `${baseUrl}/auth/complete-account?intake_id=${encodeURIComponent(intake.id)}`
    return {
      success: true,
      checkoutUrl: intake.payment_id
        ? `${destination}&session_id=${encodeURIComponent(intake.payment_id)}`
        : destination,
      intakeId: intake.id,
    }
  }

  if (!canRetryPaymentForIntake(intake.status, intake.payment_status)) {
    return {
      success: false,
      error: "This request is no longer awaiting payment. Please refresh and check your request status.",
    }
  }

  if (checkoutUrl) {
    return {
      success: true,
      checkoutUrl,
      intakeId: intake.id,
    }
  }

  // Terminal fallback: the intake is still payable but we have no live
  // checkout URL and could not rebuild one. That is sometimes transient (a
  // Stripe blip on rebuild) and sometimes not (a session state the rebuild
  // path doesn't cover) — the caller cannot tell which. The old copy here
  // promised "wait a few seconds and try again", which read as guaranteed-
  // transient: one patient retried it 9 times in a row (30d to 2026-07-19)
  // with no exit. Say what to do when retrying doesn't work, without claiming
  // anything about payment state we haven't verified.
  return {
    success: false,
    error:
      "We couldn't open your payment session. Wait a moment and try once more — if it still fails, or you think you may have already paid, email support@instantmed.com.au and we'll finish it for you.",
  }
}
