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

const RETRYABLE_INTAKE_STATUSES = new Set(["pending_payment", "checkout_failed"])
const RETRYABLE_PAYMENT_STATUSES = new Set(["pending", "unpaid", "failed"])
const CANCELLABLE_UNPAID_INTAKE_STATUSES = new Set(["draft", "pending_payment", "checkout_failed"])
const TERMINAL_PAID_PAYMENT_STATUSES = new Set(["paid", "refunded", "partially_refunded", "disputed"])

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
    return {
      success: true,
      checkoutUrl: `${baseUrl}/auth/complete-account?intake_id=${encodeURIComponent(intake.id)}`,
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

  return {
    success: false,
    error: "Checkout is already being prepared. Please wait a few seconds and try again.",
  }
}
