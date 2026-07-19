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
import {
  markReviewRequestCommunicationOutcome,
  type ReviewRequestPatient,
} from "@/lib/email/review-request-policy"
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

const REVIEW_CANDIDATE_SELECT = `
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

function normalizeCandidate(row: Record<string, unknown>): ReviewRequestCandidate {
  const relation = row.patient
  const patient = Array.isArray(relation) ? relation[0] : relation
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
    review_email_suppressed_at: typeof row.review_email_suppressed_at === "string"
      ? row.review_email_suppressed_at
      : null,
    patient: patient && typeof patient === "object"
      ? patient as ReviewRequestPatient
      : null,
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

  const commonFilters = (query: ReturnType<typeof supabase.from>) => query
    .select(REVIEW_CANDIDATE_SELECT)
    .in("status", ["approved", "completed"])
    .eq("payment_status", "paid")
    .is("review_email_sent_at", null)
    .is("review_email_suppressed_at", null)
    .not("patient_id", "is", null)
    .neq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)

  const [certificateResult, prescribingResult] = await Promise.all([
    commonFilters(supabase.from("intakes"))
      .eq("category", "medical_certificate")
      .gte("document_sent_at", catchUpFloor)
      .lte("document_sent_at", eligibleBefore)
      .order("document_sent_at", { ascending: true })
      .limit(opts.limit),
    commonFilters(supabase.from("intakes"))
      .in("category", ["prescription", "consult"])
      .gte("script_sent_at", catchUpFloor)
      .lte("script_sent_at", eligibleBefore)
      .order("script_sent_at", { ascending: true })
      .limit(opts.limit),
  ])

  const queryError = certificateResult.error || prescribingResult.error
  if (queryError) {
    throw new Error(`Failed to fetch review request candidates: ${queryError.message}`)
  }

  return [
    ...(certificateResult.data ?? []),
    ...(prescribingResult.data ?? []),
  ]
    .map((row) => normalizeCandidate(row as Record<string, unknown>))
    // Keep terminally suppressed recipients in the batch so the processor can
    // stamp review_email_suppressed_at instead of letting the oldest rows
    // occupy every future batch and starve eligible requests.
    .filter((row) => isReviewFulfilmentWithinCatchUpWindow(row, now))
    .sort((a, b) => {
      const aTime = new Date(getReviewFulfilmentAt(a) || 0).getTime()
      const bTime = new Date(getReviewFulfilmentAt(b) || 0).getTime()
      return aTime - bTime
    })
    .slice(0, opts.limit)
}

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

/**
 * Send at most one review ask for this request. The intake-scoped outbox key
 * owns same-request races while the shared policy owns patient-level cooldown.
 */
export async function sendReviewRequestEmail(
  intake: ReviewRequestCandidate,
): Promise<CommunicationOutcome> {
  const patient = intake.patient
  if (!intake.patient_id || !patient?.email) {
    return markReviewRequestCommunicationOutcome(intake.id, {
      kind: "policy_suppressed",
      reason: "missing_recipient",
    })
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
    const marked = await markReviewRequestCommunicationOutcome(intake.id, sent)
    logger.info("Review request delivery confirmed", {
      intakeId: intake.id,
      outboxId: result.outboxId,
    })
    if (marked.kind === "transiently_blocked") {
      Sentry.captureMessage("Review request sent marker needs reconciliation", {
        level: "error",
        tags: { subsystem: "review-request" },
        extra: { intakeId: intake.id, outboxId: result.outboxId },
      })
      return sent
    }
    return marked
  }

  const outcome = result.outcome ?? fallbackSendOutcome(result)
  if (outcome.kind === "policy_suppressed") {
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

export async function reconcileSentReviewRequestMarkers(
  limit = REVIEW_REQUEST_BATCH_SIZE,
): Promise<{ reconciled: number; failed: number }> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intakes")
    .select("id, email_outbox!inner(id)")
    .is("review_email_sent_at", null)
    .is("review_email_suppressed_at", null)
    .eq("email_outbox.email_type", "review_request")
    .eq("email_outbox.status", "sent")
    .limit(limit)

  if (error) {
    throw new Error(`Failed to reconcile sent review request markers: ${error.message}`)
  }

  let reconciled = 0
  let failed = 0
  const intakeIds = new Set(
    (data ?? [])
      .map((row) => typeof row.id === "string" ? row.id : null)
      .filter((id): id is string => Boolean(id)),
  )
  for (const intakeId of intakeIds) {
    const outcome = await markReviewRequestCommunicationOutcome(
      intakeId,
      { kind: "sent" },
    )
    if (outcome.kind === "sent") reconciled += 1
    else failed += 1
  }

  return { reconciled, failed }
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
  const candidates = await findReviewRequestBackfillCandidates({
    sinceDays: opts.sinceDays,
    limit: opts.limit,
  })
  const counts = emptyCounts()

  if (!opts.dryRun) {
    for (const intake of candidates) {
      const outcome = await sendReviewRequestEmail(intake)
      counts[outcome.kind] += 1
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }

  const result = {
    candidates: candidates.length,
    ...counts,
    dryRun: opts.dryRun === true,
  }
  logger.info("Processed review backfill", result)
  return result
}
