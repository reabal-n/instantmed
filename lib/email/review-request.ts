import "server-only"

import * as Sentry from "@sentry/nextjs"
import * as React from "react"

import { getAppUrl } from "@/lib/config/env"
import { SEEDED_E2E_PATIENT_PROFILE_ID } from "@/lib/data/seeded-e2e-data"
import {
  ReviewRequestEmail,
  reviewRequestSubject,
} from "@/lib/email/components/templates/review-request"
import { isEmailSendDeliveryConfirmed } from "@/lib/email/outbox-delivery"
import { finalizeOutboxSequenceDisposition } from "@/lib/email/outbox-disposition"
import type { ReviewRequestPatient } from "@/lib/email/review-request-policy-core"
import { reconcileSentReviewRequestMarkers } from "@/lib/email/review-request-reconciliation"
import {
  getReviewFulfilmentAt,
  isReviewFulfilmentWithinCatchUpWindow,
  REVIEW_REQUEST_BATCH_SIZE,
  REVIEW_REQUEST_CATCH_UP_DAYS,
  REVIEW_REQUEST_DELAY_HOURS,
} from "@/lib/email/review-request-timing"
import type { CommunicationOutcome } from "@/lib/email/send/types"
import { sendEmail } from "@/lib/email/send-email"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("review-request")

interface ReviewRequestCandidate {
  id: string
  patient_id: string
  category: string | null
  status: string
  payment_status: string | null
  document_sent_at: string | null
  script_sent_at: string | null
  review_email_sent_at: string | null
  review_email_suppressed_at: string | null
  patient: ReviewRequestPatient | null
}

function normalizeCandidate(row: Record<string, unknown>): ReviewRequestCandidate {
  const relation = row.patient
  const relatedPatient = Array.isArray(relation) ? relation[0] : relation
  const patient = relatedPatient && typeof relatedPatient === "object"
    ? relatedPatient as ReviewRequestPatient
    : typeof row.patient_email === "string"
      ? {
          email: row.patient_email,
          first_name: typeof row.patient_first_name === "string"
            ? row.patient_first_name
            : null,
          email_bounced: typeof row.patient_email_bounced === "boolean"
            ? row.patient_email_bounced
            : null,
        }
      : null

  return {
    id: String(row.id),
    patient_id: String(row.patient_id),
    category: typeof row.category === "string" ? row.category : null,
    status: String(row.status),
    payment_status: typeof row.payment_status === "string" ? row.payment_status : null,
    document_sent_at: typeof row.document_sent_at === "string" ? row.document_sent_at : null,
    script_sent_at: typeof row.script_sent_at === "string" ? row.script_sent_at : null,
    review_email_sent_at: typeof row.review_email_sent_at === "string"
      ? row.review_email_sent_at
      : null,
    review_email_suppressed_at:
      typeof row.review_email_suppressed_at === "string"
        ? row.review_email_suppressed_at
        : null,
    patient,
  }
}

async function findCandidatesInFulfilmentWindow(opts: {
  sinceDays: number
  limit: number
}): Promise<ReviewRequestCandidate[]> {
  if (opts.limit <= 0) return []

  const supabase = createServiceRoleClient()
  const now = new Date()
  const boundedSinceDays = Math.min(
    Math.max(opts.sinceDays, 0),
    REVIEW_REQUEST_CATCH_UP_DAYS,
  )
  const eligibleBefore = new Date(
    now.getTime() - REVIEW_REQUEST_DELAY_HOURS * 60 * 60 * 1000,
  ).toISOString()
  const catchUpFloor = new Date(
    now.getTime() - boundedSinceDays * 24 * 60 * 60 * 1000,
  ).toISOString()

  const { data, error } = await supabase.rpc(
    "get_review_request_candidates",
    {
      p_catch_up_floor: catchUpFloor,
      p_eligible_before: eligibleBefore,
      p_limit: opts.limit,
      p_excluded_patient_id: SEEDED_E2E_PATIENT_PROFILE_ID,
    },
  )

  if (error) {
    throw new Error(`Failed to fetch review request candidates: ${error.message}`)
  }

  return (data ?? [])
    .map((row: unknown) => normalizeCandidate(row as Record<string, unknown>))
    // The RPC keeps terminally suppressible recipients in the batch so the
    // provider gate can finalize review_email_suppressed_at. Its NOT EXISTS
    // anti-join excludes every durable outbox owner without PostgREST row or
    // URL-size limits, including exhausted failures.
    .filter((row: ReviewRequestCandidate) => (
      isReviewFulfilmentWithinCatchUpWindow(row, now)
    ))
}

/**
 * Daily selection has no 72-hour ceiling. A missed run remains eligible for
 * 120 days and is picked up by the next Sydney-morning batch.
 */
export async function findReviewRequestCandidates(): Promise<ReviewRequestCandidate[]> {
  return findCandidatesInFulfilmentWindow({
    sinceDays: REVIEW_REQUEST_CATCH_UP_DAYS,
    limit: REVIEW_REQUEST_BATCH_SIZE,
  })
}

function fallbackSendOutcome(
  result: Awaited<ReturnType<typeof sendEmail>>,
): CommunicationOutcome {
  if (result.success && result.outboxId) {
    return { kind: "pending", outboxId: result.outboxId }
  }
  return {
    kind: "provider_failed",
    error: result.error ?? "Review request provider attempt failed",
    retryable: result.retryable !== false,
    ...(result.outboxId ? { outboxId: result.outboxId } : {}),
  }
}

async function finalizeReviewRequestDisposition(input: {
  intakeId: string
  outboxId?: string
  disposition: "sent" | "suppressed"
}): Promise<boolean> {
  const result = await finalizeOutboxSequenceDisposition(
    {
      id: input.outboxId ?? `review-request:${input.intakeId}:policy`,
      email_type: "review_request",
      intake_id: input.intakeId,
      metadata: null,
    },
    input.disposition,
  )
  return result.finalized
}

/**
 * Send at most one review ask for this request. The durable outbox idempotency
 * key owns same-request races; the patient cooldown blocks asks for a different
 * request within 30 days.
 */
export async function sendReviewRequestEmail(
  intake: ReviewRequestCandidate,
): Promise<CommunicationOutcome> {
  const patient = intake.patient
  if (!intake.patient_id || !patient?.email) {
    const suppressed: CommunicationOutcome = {
      kind: "policy_suppressed",
      reason: "missing_recipient",
    }
    const finalized = await finalizeReviewRequestDisposition({
      intakeId: intake.id,
      disposition: "suppressed",
    })
    return finalized
      ? suppressed
      : {
          kind: "transiently_blocked",
          reason: "suppressed_marker_write_failed",
        }
  }

  const result = await sendEmail({
    to: patient.email,
    toName: patient.first_name || undefined,
    subject: reviewRequestSubject,
    template: React.createElement(ReviewRequestEmail, {
      patientName: patient.first_name || "",
      appUrl: getAppUrl(),
    }),
    emailType: "review_request",
    intakeId: intake.id,
    patientId: intake.patient_id,
    idempotencyKey: `review-request:${intake.id}`,
    metadata: {
      fulfilment_at: getReviewFulfilmentAt(intake),
    },
    tags: [
      { name: "category", value: "review_request" },
      { name: "intake_id", value: intake.id },
    ],
  })

  if (await isEmailSendDeliveryConfirmed(result)) {
    const sent: CommunicationOutcome = {
      kind: "sent",
      ...(result.messageId ? { messageId: result.messageId } : {}),
      ...(result.outboxId ? { outboxId: result.outboxId } : {}),
    }
    const finalized = await finalizeReviewRequestDisposition({
      intakeId: intake.id,
      outboxId: result.outboxId,
      disposition: "sent",
    })
    logger.info("Review request delivery confirmed", {
      intakeId: intake.id,
      outboxId: result.outboxId,
      markerFinalized: finalized,
    })
    if (!finalized) {
      Sentry.captureMessage("Review request sent marker needs reconciliation", {
        level: "error",
        tags: { subsystem: "review-request" },
        extra: { intakeId: intake.id, outboxId: result.outboxId },
      })
    }
    return sent
  }

  const outcome = result.outcome ?? fallbackSendOutcome(result)
  if (outcome.kind === "policy_suppressed") {
    if ([
      "missing_request_reference",
      "request_missing",
      "review_request_already_handled",
    ].includes(outcome.reason)) {
      return outcome
    }
    const finalized = await finalizeReviewRequestDisposition({
      intakeId: intake.id,
      outboxId: result.outboxId,
      disposition: "suppressed",
    })
    if (!finalized) {
      return {
        kind: "transiently_blocked",
        reason: "suppressed_marker_write_failed",
      }
    }
    logger.info("Review request terminally suppressed", {
      intakeId: intake.id,
      reason: outcome.reason,
    })
    return outcome
  }
  if (outcome.kind === "sent") {
    return {
      kind: "pending",
      ...(outcome.outboxId ? { outboxId: outcome.outboxId } : {}),
    }
  }
  return outcome
}

type ReviewRequestCounts = {
  sent: number
  policy_suppressed: number
  transiently_blocked: number
  pending: number
  provider_failed: number
}

function emptyCounts(): ReviewRequestCounts {
  return {
    sent: 0,
    policy_suppressed: 0,
    transiently_blocked: 0,
    pending: 0,
    provider_failed: 0,
  }
}

export async function processReviewRequests(): Promise<{
  requestReconciled: number
  requestReconciliationFailed: number
  requestSent: number
  requestPolicySuppressed: number
  requestTransientlyBlocked: number
  requestPending: number
  requestProviderFailed: number
}> {
  const reconciliation = await reconcileSentReviewRequestMarkers()
  const candidates = await findReviewRequestCandidates()
  const counts = emptyCounts()

  for (const intake of candidates) {
    const outcome = await sendReviewRequestEmail(intake)
    counts[outcome.kind] += 1
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  const result = {
    requestReconciled: reconciliation.reconciled,
    requestReconciliationFailed: reconciliation.failed,
    requestSent: counts.sent,
    requestPolicySuppressed: counts.policy_suppressed,
    requestTransientlyBlocked: counts.transiently_blocked,
    requestPending: counts.pending,
    requestProviderFailed: counts.provider_failed,
  }
  logger.info("Processed review requests", {
    ...result,
    total: candidates.length,
  })
  return result
}

export async function findReviewRequestBackfillCandidates(
  opts: { sinceDays?: number; limit?: number } = {},
): Promise<ReviewRequestCandidate[]> {
  return findCandidatesInFulfilmentWindow({
    sinceDays: opts.sinceDays ?? REVIEW_REQUEST_CATCH_UP_DAYS,
    limit: opts.limit ?? 500,
  })
}

export async function processReviewRequestBackfill(
  opts: { sinceDays?: number; limit?: number; dryRun?: boolean } = {},
): Promise<{
  candidates: number
  sent: number
  policy_suppressed: number
  transiently_blocked: number
  pending: number
  provider_failed: number
  dryRun: boolean
}> {
  const dryRun = opts.dryRun !== false
  const candidates = await findReviewRequestBackfillCandidates({
    sinceDays: opts.sinceDays,
    limit: opts.limit,
  })

  const counts = emptyCounts()
  if (!dryRun) {
    for (const intake of candidates) {
      const outcome = await sendReviewRequestEmail(intake)
      counts[outcome.kind] += 1
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }

  const result = {
    candidates: candidates.length,
    ...counts,
    dryRun,
  }
  logger.info("Processed review backfill", result)
  return result
}
