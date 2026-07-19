import "server-only"

import * as Sentry from "@sentry/nextjs"

import type { MarketingEmailDecision } from "@/lib/email/preferences"
import { getMarketingEmailDecision } from "@/lib/email/preferences"
import {
  getNextSydneyReviewRequestRetryAt,
  getReviewFulfilmentAt,
  isReviewFulfilmentWithinCatchUpWindow,
  isSydneyReviewRequestHour,
  REVIEW_REQUEST_DELAY_HOURS,
  REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS,
} from "@/lib/email/review-request-timing"
import type { CommunicationOutcome } from "@/lib/email/send/types"
import type { EmailSuppressionDecision } from "@/lib/email/suppression"
import { getEmailSuppressionDecisions } from "@/lib/email/suppression"
import type { EmailBounceSuppressionDecision } from "@/lib/email/utils"
import { getEmailBounceSuppressionDecision } from "@/lib/email/utils"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("review-request-policy")

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

interface ReviewRequestPolicyFacts {
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

function transientRetry(now: Date, reason: string): ReviewRequestPolicyDecision {
  return {
    kind: "transiently_blocked",
    reason,
    retryAt: getNextSydneyReviewRequestRetryAt(now),
  }
}

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

  const currentIntakeOwnsEarliest = earliest.intake_id === input.currentIntakeId &&
    (!input.currentOutboxId || earliest.id === input.currentOutboxId)
  return !currentIntakeOwnsEarliest
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
    return { kind: "policy_suppressed", reason: "review_request_already_handled" }
  }

  const fulfilledAt = getReviewFulfilmentAt(intake)
  if (!fulfilledAt || !Number.isFinite(new Date(fulfilledAt).getTime())) {
    return { kind: "policy_suppressed", reason: "fulfilment_missing" }
  }
  const ageMs = facts.now.getTime() - new Date(fulfilledAt).getTime()
  if (ageMs < REVIEW_REQUEST_DELAY_HOURS * 60 * 60 * 1000) {
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
    patient.email.trim().toLowerCase() !== facts.expectedRecipient.trim().toLowerCase()
  ) {
    return { kind: "policy_suppressed", reason: "recipient_changed" }
  }
  if (facts.bounceDecision.kind === "policy_suppressed") {
    return { kind: "policy_suppressed", reason: "address_bounced_or_complained" }
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

function normalizeIntake(row: Record<string, unknown>): ReviewRequestPolicyIntake {
  const relation = row.patient
  const patient = Array.isArray(relation) ? relation[0] : relation
  return {
    id: String(row.id),
    patient_id: typeof row.patient_id === "string" ? row.patient_id : null,
    category: typeof row.category === "string" ? row.category : null,
    status: String(row.status),
    payment_status: typeof row.payment_status === "string" ? row.payment_status : null,
    document_sent_at: typeof row.document_sent_at === "string" ? row.document_sent_at : null,
    script_sent_at: typeof row.script_sent_at === "string" ? row.script_sent_at : null,
    review_email_sent_at: typeof row.review_email_sent_at === "string"
      ? row.review_email_sent_at
      : null,
    review_email_suppressed_at: typeof row.review_email_suppressed_at === "string"
      ? row.review_email_suppressed_at
      : null,
    patient: patient && typeof patient === "object"
      ? patient as ReviewRequestPatient
      : null,
  }
}

const POLICY_INTAKE_SELECT = `
  id,
  patient_id,
  category,
  status,
  payment_status,
  document_sent_at,
  script_sent_at,
  review_email_sent_at,
  review_email_suppressed_at,
  patient:profiles!patient_id(email, first_name, email_bounced)
`

export async function evaluateReviewRequestPolicy(input: {
  intakeId: string
  expectedRecipient?: string
  currentOutboxId?: string
  now?: Date
}): Promise<ReviewRequestPolicyDecision & {
  intake?: ReviewRequestPolicyIntake
}> {
  const now = input.now ?? new Date()
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intakes")
    .select(POLICY_INTAKE_SELECT)
    .eq("id", input.intakeId)
    .maybeSingle()

  if (error) {
    return {
      kind: "transiently_blocked",
      reason: "policy_read_failed",
      retryAt: getNextSydneyReviewRequestRetryAt(now),
    }
  }

  const intake = data
    ? normalizeIntake(data as unknown as Record<string, unknown>)
    : null
  const email = intake?.patient?.email
  const patientId = intake?.patient_id
  if (!intake || !email || !patientId) {
    const decision = classifyReviewRequestPolicy({
      now,
      intake,
      expectedRecipient: input.expectedRecipient,
      bounceDecision: { kind: "allowed" },
      addressDecision: { kind: "allowed" },
      preferenceDecision: { kind: "allowed" },
      cooldown: { active: false },
      readErrors: {},
    })
    return { ...decision, ...(intake ? { intake } : {}) }
  }

  const cooldownSince = new Date(
    now.getTime() - REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()
  const [
    bounceDecision,
    addressDecisions,
    preferenceDecision,
    outboxResult,
    markerResult,
  ] = await Promise.all([
    getEmailBounceSuppressionDecision(email),
    getEmailSuppressionDecisions([email]),
    getMarketingEmailDecision(patientId),
    supabase
      .from("email_outbox")
      .select("id, intake_id, created_at")
      .eq("email_type", "review_request")
      .eq("patient_id", patientId)
      .gt("created_at", cooldownSince)
      .in("status", ["pending", "sending", "sent"])
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(2),
    supabase
      .from("intakes")
      .select("id, review_email_sent_at")
      .eq("patient_id", patientId)
      .neq("id", input.intakeId)
      .gt("review_email_sent_at", cooldownSince)
      .order("review_email_sent_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const normalizedEmail = email.trim().toLowerCase()
  const activeRows = (outboxResult.data ?? []) as ReviewRequestCooldownRow[]
  const cooldownActive = hasReviewRequestCooldownReservation({
    activeRows,
    currentIntakeId: input.intakeId,
    currentOutboxId: input.currentOutboxId,
    hasOtherSentMarker: Boolean(markerResult.data),
    now,
  })
  const winningReservation = [...activeRows].sort((a, b) => (
    a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
  ))[0]
  const blockingTime = markerResult.data?.review_email_sent_at
    ? new Date(markerResult.data.review_email_sent_at).getTime()
    : winningReservation
      ? new Date(winningReservation.created_at).getTime()
      : null
  const cooldownExpiresAt = blockingTime !== null && Number.isFinite(blockingTime)
    ? blockingTime +
      REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    : null
  const cooldownRetryAt = cooldownExpiresAt === null
    ? undefined
    : getNextSydneyReviewRequestRetryAt(new Date(cooldownExpiresAt - 1))

  const decision = classifyReviewRequestPolicy({
    now,
    intake,
    expectedRecipient: input.expectedRecipient,
    bounceDecision,
    addressDecision: addressDecisions.get(normalizedEmail) ??
      { kind: "transiently_blocked" },
    preferenceDecision,
    cooldown: {
      active: cooldownActive,
      ...(cooldownRetryAt ? { retryAt: cooldownRetryAt } : {}),
    },
    readErrors: {
      ...(outboxResult.error
        ? { cooldownOutbox: outboxResult.error.message }
        : {}),
      ...(markerResult.error
        ? { cooldownMarker: markerResult.error.message }
        : {}),
    },
  })
  return { ...decision, intake }
}

export async function markReviewRequestCommunicationOutcome(
  intakeId: string,
  outcome: CommunicationOutcome,
): Promise<CommunicationOutcome> {
  if (outcome.kind !== "sent" && outcome.kind !== "policy_suppressed") {
    return outcome
  }

  const marker = outcome.kind === "sent"
    ? "review_email_sent_at"
    : "review_email_suppressed_at"
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intakes")
    .update({ [marker]: new Date().toISOString() })
    .eq("id", intakeId)
    .is("review_email_sent_at", null)
    .is("review_email_suppressed_at", null)
    .select("id")
    .maybeSingle()

  if (error) {
    logger.error("Review request marker write failed", {
      intakeId,
      outcome: outcome.kind,
      error: error.message,
    })
    return {
      kind: "transiently_blocked",
      reason: "review_marker_write_failed",
    }
  }
  if (data) return outcome

  const { data: current, error: readError } = await supabase
    .from("intakes")
    .select("id, review_email_sent_at, review_email_suppressed_at")
    .eq("id", intakeId)
    .maybeSingle()

  if (readError) {
    logger.error("Review request marker reconciliation read failed", {
      intakeId,
      outcome: outcome.kind,
      error: readError.message,
    })
    return {
      kind: "transiently_blocked",
      reason: "review_marker_write_failed",
    }
  }

  if (!current) {
    logger.warn("Review request marker target no longer exists", {
      intakeId,
      outcome: outcome.kind,
    })
    return outcome
  }

  const targetAlreadyWritten = outcome.kind === "sent"
    ? Boolean(current.review_email_sent_at)
    : Boolean(current.review_email_suppressed_at)
  if (targetAlreadyWritten) return outcome

  const oppositeMarkerWritten = outcome.kind === "sent"
    ? Boolean(current.review_email_suppressed_at)
    : Boolean(current.review_email_sent_at)
  if (oppositeMarkerWritten) {
    if (
      outcome.kind === "policy_suppressed" &&
      outcome.reason === "review_request_already_handled"
    ) {
      return outcome
    }
    logger.error("Review request marker invariant conflict", {
      intakeId,
      outcome: outcome.kind,
    })
    Sentry.captureMessage("Review request marker invariant conflict", {
      level: "error",
      tags: { subsystem: "review-request" },
      extra: { intakeId, outcome: outcome.kind },
    })
    return outcome
  }

  logger.error("Review request marker CAS matched no row", {
    intakeId,
    outcome: outcome.kind,
  })
  return {
    kind: "transiently_blocked",
    reason: "review_marker_write_failed",
  }
}
