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
import { canSendMarketingEmail } from "@/lib/email/preferences"
import {
  getReviewFulfilmentAt,
  isReviewFulfilmentOldEnough,
  REVIEW_REQUEST_BATCH_SIZE,
  REVIEW_REQUEST_CATCH_UP_DAYS,
  REVIEW_REQUEST_DELAY_HOURS,
  REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS,
} from "@/lib/email/review-request-timing"
import { sendEmail } from "@/lib/email/send-email"
import { getSuppressedEmails } from "@/lib/email/suppression"
import { isEmailSuppressed } from "@/lib/email/utils"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("review-request")

interface ReviewPatient {
  email: string | null
  email_bounced: boolean | null
  first_name: string | null
}

interface ReviewRequestCandidate {
  id: string
  patient_id: string
  category: string | null
  status: string
  payment_status: string | null
  document_sent_at: string | null
  script_sent_at: string | null
  review_email_sent_at: string | null
  patient: ReviewPatient | null
}

type ReviewSendOutcome = "sent" | "suppressed" | "pending" | "failed"

const REVIEW_CANDIDATE_SELECT = `
  id,
  patient_id,
  category,
  status,
  payment_status,
  document_sent_at,
  script_sent_at,
  review_email_sent_at,
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
    patient: patient && typeof patient === "object"
      ? patient as ReviewPatient
      : null,
  }
}

async function findCandidatesInFulfilmentWindow(opts: {
  sinceDays: number
  limit: number
}): Promise<ReviewRequestCandidate[]> {
  if (opts.limit <= 0) return []

  const supabase = createServiceRoleClient()
  const now = Date.now()
  const eligibleBefore = new Date(
    now - REVIEW_REQUEST_DELAY_HOURS * 60 * 60 * 1000,
  ).toISOString()
  const catchUpFloor = new Date(
    now - opts.sinceDays * 24 * 60 * 60 * 1000,
  ).toISOString()

  const [certificateResult, prescribingResult] = await Promise.all([
    supabase
      .from("intakes")
      .select(REVIEW_CANDIDATE_SELECT)
      .eq("category", "medical_certificate")
      .in("status", ["approved", "completed"])
      .eq("payment_status", "paid")
      .is("review_email_sent_at", null)
      .not("patient_id", "is", null)
      .neq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)
      .gte("document_sent_at", catchUpFloor)
      .lte("document_sent_at", eligibleBefore)
      .order("document_sent_at", { ascending: true })
      .limit(opts.limit),
    supabase
      .from("intakes")
      .select(REVIEW_CANDIDATE_SELECT)
      .in("category", ["prescription", "consult"])
      .in("status", ["approved", "completed"])
      .eq("payment_status", "paid")
      .is("review_email_sent_at", null)
      .not("patient_id", "is", null)
      .neq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)
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
    // stamp the request as handled. Filtering them here would let the same
    // oldest rows occupy every future batch and starve eligible requests.
    .filter((row) => isReviewFulfilmentOldEnough(row))
    .sort((a, b) => {
      const aTime = new Date(getReviewFulfilmentAt(a) || 0).getTime()
      const bTime = new Date(getReviewFulfilmentAt(b) || 0).getTime()
      return aTime - bTime
    })
    .slice(0, opts.limit)
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

async function loadCurrentCandidate(
  intakeId: string,
): Promise<{ candidate: ReviewRequestCandidate | null; error?: string }> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intakes")
    .select(REVIEW_CANDIDATE_SELECT)
    .eq("id", intakeId)
    .maybeSingle()

  if (error) {
    return { candidate: null, error: error.message }
  }

  return {
    candidate: data
      ? normalizeCandidate(data as unknown as Record<string, unknown>)
      : null,
  }
}

async function hasPatientCooldown(
  patientId: string,
  intakeId: string,
): Promise<{ blocked: boolean; error?: string }> {
  const supabase = createServiceRoleClient()
  const cooldownSince = new Date(
    Date.now() - REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()

  const [outboxResult, intakeResult] = await Promise.all([
    supabase
      .from("email_outbox")
      .select("id")
      .eq("email_type", "review_request")
      .eq("patient_id", patientId)
      .neq("intake_id", intakeId)
      .gte("created_at", cooldownSince)
      .in("status", ["pending", "sending", "sent", "skipped_e2e"])
      .limit(1)
      .maybeSingle(),
    supabase
      .from("intakes")
      .select("id")
      .eq("patient_id", patientId)
      .neq("id", intakeId)
      .gte("review_email_sent_at", cooldownSince)
      .limit(1)
      .maybeSingle(),
  ])

  const error = outboxResult.error || intakeResult.error
  if (error) return { blocked: true, error: error.message }

  return { blocked: Boolean(outboxResult.data || intakeResult.data) }
}

function isCurrentCandidateEligible(
  candidate: ReviewRequestCandidate,
): boolean {
  return (
    (candidate.status === "approved" || candidate.status === "completed") &&
    candidate.payment_status === "paid" &&
    candidate.review_email_sent_at === null &&
    isReviewFulfilmentOldEnough(candidate)
  )
}

async function markReviewRequestHandled(
  intakeId: string,
  disposition: "sent" | "suppressed",
): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from("intakes")
    .update({ review_email_sent_at: new Date().toISOString() })
    .eq("id", intakeId)
    .is("review_email_sent_at", null)

  if (error) {
    logger.error("Review request handled marker failed", {
      intakeId,
      disposition,
      error: error.message,
    })
    Sentry.captureMessage("Review request handled marker failed", {
      level: "error",
      tags: { subsystem: "review-request" },
      extra: { intakeId, disposition },
    })
  }
}

async function markReviewRequestSent(intakeId: string): Promise<void> {
  await markReviewRequestHandled(intakeId, "sent")
}

async function suppressReviewRequest(
  intakeId: string,
  reason: string,
): Promise<ReviewSendOutcome> {
  logger.info("Suppressing review request", { intakeId, reason })
  // `review_email_sent_at` is the established one-shot lifecycle marker. It
  // also records terminal suppression so a bounced, opted-out, or cooldown-
  // blocked request cannot monopolise the oldest-first catch-up queue.
  await markReviewRequestHandled(intakeId, "suppressed")
  return "suppressed"
}

/**
 * Send at most one review ask for this request. The durable outbox idempotency
 * key owns same-request races; the patient cooldown blocks asks for a different
 * request within 30 days.
 */
export async function sendReviewRequestEmail(
  intake: ReviewRequestCandidate,
): Promise<ReviewSendOutcome> {
  const current = await loadCurrentCandidate(intake.id)
  if (current.error) {
    logger.error("Failed to re-check review request eligibility", {
      intakeId: intake.id,
      error: current.error,
    })
    return "failed"
  }
  if (!current.candidate || !isCurrentCandidateEligible(current.candidate)) {
    logger.info("Skipping review request - request is no longer eligible", {
      intakeId: intake.id,
    })
    return "suppressed"
  }

  const candidate = current.candidate
  const patient = candidate.patient
  if (!patient?.email || patient.email_bounced === true) {
    return suppressReviewRequest(candidate.id, "recipient is unavailable or bounced")
  }
  const email = patient.email

  const addressSuppressed = await getSuppressedEmails([email])
  if (
    addressSuppressed.has(email.trim().toLowerCase()) ||
    await isEmailSuppressed(email)
  ) {
    logger.info("Skipping review request - address is suppressed", {
      intakeId: candidate.id,
    })
    return suppressReviewRequest(candidate.id, "address is suppressed")
  }

  const cooldown = await hasPatientCooldown(candidate.patient_id, candidate.id)
  if (cooldown.error) {
    logger.error("Review request cooldown check failed closed", {
      intakeId: candidate.id,
      error: cooldown.error,
    })
    Sentry.captureMessage("Review request cooldown check failed closed", {
      level: "warning",
      tags: { subsystem: "review-request" },
      extra: { intakeId: candidate.id },
    })
    return "failed"
  }
  if (cooldown.blocked) {
    return suppressReviewRequest(candidate.id, "patient cooldown is active")
  }

  // Keep this as the final asynchronous policy check before sendEmail. A
  // preference change after candidate selection must still stop the message.
  if (!await canSendMarketingEmail(candidate.patient_id)) {
    return suppressReviewRequest(
      candidate.id,
      "marketing preference does not allow send",
    )
  }

  const result = await sendEmail({
    to: email,
    toName: patient.first_name || undefined,
    subject: reviewRequestSubject,
    template: React.createElement(ReviewRequestEmail, {
      patientName: patient.first_name || "",
      appUrl: getAppUrl(),
    }),
    emailType: "review_request",
    intakeId: candidate.id,
    patientId: candidate.patient_id,
    metadata: {
      fulfilment_at: getReviewFulfilmentAt(candidate),
    },
    tags: [
      { name: "category", value: "review_request" },
      { name: "intake_id", value: candidate.id },
    ],
  })

  if (await isEmailSendDeliveryConfirmed(result)) {
    await markReviewRequestSent(candidate.id)
    logger.info("Sent review request email", { intakeId: candidate.id })
    return "sent"
  }

  if (result.suppressed) {
    return suppressReviewRequest(candidate.id, "suppressed immediately before delivery")
  }

  if (result.success) {
    logger.info("Review request already queued; awaiting durable delivery", {
      intakeId: candidate.id,
      outboxId: result.outboxId,
    })
    return "pending"
  }

  logger.error("Failed to send review request email", {
    intakeId: candidate.id,
    error: result.error,
  })
  return "failed"
}

export async function processReviewRequests(): Promise<{
  requestSent: number
  requestSuppressed: number
  requestPending: number
  requestFailed: number
}> {
  const candidates = await findReviewRequestCandidates()
  const counts = {
    requestSent: 0,
    requestSuppressed: 0,
    requestPending: 0,
    requestFailed: 0,
  }

  for (const intake of candidates) {
    const outcome = await sendReviewRequestEmail(intake)
    if (outcome === "sent") counts.requestSent += 1
    else if (outcome === "suppressed") counts.requestSuppressed += 1
    else if (outcome === "pending") counts.requestPending += 1
    else counts.requestFailed += 1

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  logger.info("Processed review requests", {
    ...counts,
    total: candidates.length,
  })

  return counts
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
  suppressed: number
  pending: number
  failed: number
  dryRun: boolean
}> {
  const candidates = await findReviewRequestBackfillCandidates({
    sinceDays: opts.sinceDays,
    limit: opts.limit,
  })

  if (opts.dryRun) {
    return {
      candidates: candidates.length,
      sent: 0,
      suppressed: 0,
      pending: 0,
      failed: 0,
      dryRun: true,
    }
  }

  const counts = { sent: 0, suppressed: 0, pending: 0, failed: 0 }
  for (const intake of candidates) {
    const outcome = await sendReviewRequestEmail(intake)
    counts[outcome] += 1
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  logger.info("Processed review backfill", {
    ...counts,
    candidates: candidates.length,
  })

  return {
    candidates: candidates.length,
    ...counts,
    dryRun: false,
  }
}
