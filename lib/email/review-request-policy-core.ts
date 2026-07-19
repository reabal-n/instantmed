import type { MarketingEmailDecision } from "@/lib/email/preferences"
import {
  getNextSydneyReviewRequestRetryAt,
  getReviewFulfilmentAt,
  isReviewFulfilmentOldEnough,
  isReviewFulfilmentWithinCatchUpWindow,
  isSydneyReviewRequestHour,
  REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS,
} from "@/lib/email/review-request-timing"
import type { EmailSuppressionDecision } from "@/lib/email/suppression"
import type { EmailBounceSuppressionDecision } from "@/lib/email/utils"

export interface ReviewRequestPatient {
  email: string | null
  email_bounced: boolean | null
  first_name: string | null
}

export interface ReviewRequestPolicyIntake {
  id: string
  patient_id: string | null
  category: string | null
  status: string
  payment_status: string | null
  document_sent_at: string | null
  script_sent_at: string | null
  review_email_sent_at: string | null
  review_email_suppressed_at: string | null
  patient: ReviewRequestPatient | null
}

interface ReviewRequestCooldownRow {
  id: string
  intake_id: string | null
  created_at: string
}

export interface ReviewRequestPolicyFacts {
  now: Date
  intake: ReviewRequestPolicyIntake | null
  expectedRecipient?: string
  bounceDecision: EmailBounceSuppressionDecision
  addressDecision: EmailSuppressionDecision
  preferenceDecision: MarketingEmailDecision
  cooldown: { active: boolean; retryAt?: string }
  readErrors: {
    intake?: string
    cooldownOutbox?: string
    cooldownMarker?: string
  }
}

export type ReviewRequestPolicyDecision =
  | { kind: "allowed" }
  | { kind: "policy_suppressed"; reason: string }
  | { kind: "transiently_blocked"; reason: string; retryAt?: string }

function transientRetry(
  now: Date,
  reason: string,
): ReviewRequestPolicyDecision {
  return {
    kind: "transiently_blocked",
    reason,
    retryAt: getNextSydneyReviewRequestRetryAt(now),
  }
}

/**
 * The earliest active outbox row owns the patient-level cooldown reservation.
 * This prevents concurrent requests for one patient from both reaching the
 * provider while allowing the winning row to revalidate itself.
 */
export function hasReviewRequestCooldownReservation(input: {
  activeRows: ReviewRequestCooldownRow[]
  currentIntakeId: string
  currentOutboxId?: string
  hasOtherSentMarker: boolean
  now?: Date
}): boolean {
  if (input.hasOtherSentMarker) return true

  const cutoffMs = input.now
    ? input.now.getTime() -
      REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    : Number.NEGATIVE_INFINITY
  const activeRows = input.activeRows.filter(
    (row) => new Date(row.created_at).getTime() > cutoffMs,
  )
  if (activeRows.length === 0) return false

  const earliest = [...activeRows].sort((a, b) => (
    a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
  ))[0]
  const currentOwnsEarliest = earliest.intake_id === input.currentIntakeId &&
    (!input.currentOutboxId || earliest.id === input.currentOutboxId)
  return !currentOwnsEarliest
}

export function classifyReviewRequestPolicy(
  facts: ReviewRequestPolicyFacts,
): ReviewRequestPolicyDecision {
  if (Object.keys(facts.readErrors).length > 0) {
    return transientRetry(facts.now, "policy_read_failed")
  }

  const intake = facts.intake
  if (!intake) {
    return { kind: "policy_suppressed", reason: "request_missing" }
  }
  if (!["approved", "completed"].includes(intake.status)) {
    return { kind: "policy_suppressed", reason: "invalid_request_state" }
  }
  if (intake.payment_status !== "paid") {
    return { kind: "policy_suppressed", reason: "invalid_payment_state" }
  }
  if (intake.review_email_sent_at || intake.review_email_suppressed_at) {
    return {
      kind: "policy_suppressed",
      reason: "review_request_already_handled",
    }
  }

  if (
    !isReviewFulfilmentOldEnough(intake, facts.now)
  ) {
    const fulfilmentAt = getReviewFulfilmentAt(intake)
    if (!fulfilmentAt || !Number.isFinite(new Date(fulfilmentAt).getTime())) {
      return { kind: "policy_suppressed", reason: "fulfilment_missing" }
    }
    return transientRetry(facts.now, "fulfilment_not_old_enough")
  }
  if (!isReviewFulfilmentWithinCatchUpWindow(intake, facts.now)) {
    return { kind: "policy_suppressed", reason: "fulfilment_expired" }
  }
  if (!isSydneyReviewRequestHour(facts.now)) {
    return transientRetry(facts.now, "outside_sydney_send_hour")
  }

  const patient = intake.patient
  if (!intake.patient_id || !patient?.email) {
    return { kind: "policy_suppressed", reason: "missing_recipient" }
  }
  if (patient.email_bounced === true) {
    return { kind: "policy_suppressed", reason: "bounced_recipient" }
  }
  if (
    facts.expectedRecipient &&
    patient.email.trim().toLowerCase() !==
      facts.expectedRecipient.trim().toLowerCase()
  ) {
    return { kind: "policy_suppressed", reason: "recipient_changed" }
  }
  if (facts.bounceDecision.kind === "policy_suppressed") {
    return {
      kind: "policy_suppressed",
      reason: "address_bounced_or_complained",
    }
  }
  if (facts.bounceDecision.kind === "transiently_blocked") {
    return transientRetry(facts.now, "bounce_lookup_or_soft_bounce")
  }
  if (facts.addressDecision.kind === "policy_suppressed") {
    return { kind: "policy_suppressed", reason: "address_suppressed" }
  }
  if (facts.addressDecision.kind === "transiently_blocked") {
    return transientRetry(facts.now, "address_suppression_read_failed")
  }
  if (facts.preferenceDecision.kind === "policy_suppressed") {
    return { kind: "policy_suppressed", reason: "marketing_opt_out" }
  }
  if (facts.preferenceDecision.kind === "transiently_blocked") {
    return transientRetry(facts.now, "preference_read_failed")
  }
  if (facts.cooldown.active) {
    return {
      ...transientRetry(facts.now, "patient_cooldown"),
      ...(facts.cooldown.retryAt ? { retryAt: facts.cooldown.retryAt } : {}),
    }
  }

  return { kind: "allowed" }
}
