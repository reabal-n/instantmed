import "server-only"

import { getMarketingEmailDecision } from "@/lib/email/preferences"
import {
  classifyReviewRequestPolicy,
  hasReviewRequestCooldownReservation,
  type ReviewRequestPatient,
  type ReviewRequestPolicyDecision,
  type ReviewRequestPolicyIntake,
} from "@/lib/email/review-request-policy-core"
import {
  getNextSydneyReviewRequestRetryAt,
  REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS,
} from "@/lib/email/review-request-timing"
import { getEmailSuppressionDecisions } from "@/lib/email/suppression"
import { getEmailBounceSuppressionDecision } from "@/lib/email/utils"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export type { ReviewRequestPolicyDecision } from "@/lib/email/review-request-policy-core"

interface ReviewRequestCooldownRow {
  id: string
  intake_id: string | null
  created_at: string
}

function normalizeIntake(
  row: Record<string, unknown>,
): ReviewRequestPolicyIntake {
  const relation = row.patient
  const patient = Array.isArray(relation) ? relation[0] : relation
  return {
    id: String(row.id),
    patient_id: typeof row.patient_id === "string" ? row.patient_id : null,
    category: typeof row.category === "string" ? row.category : null,
    status: String(row.status),
    payment_status: typeof row.payment_status === "string"
      ? row.payment_status
      : null,
    document_sent_at: typeof row.document_sent_at === "string"
      ? row.document_sent_at
      : null,
    script_sent_at: typeof row.script_sent_at === "string"
      ? row.script_sent_at
      : null,
    review_email_sent_at: typeof row.review_email_sent_at === "string"
      ? row.review_email_sent_at
      : null,
    review_email_suppressed_at:
      typeof row.review_email_suppressed_at === "string"
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

/**
 * Read authoritative request, recipient, suppression, consent, and cooldown
 * state for the final provider gate.
 */
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
    now.getTime() -
      REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
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
  const cooldownExpiresAt = blockingTime !== null &&
      Number.isFinite(blockingTime)
    ? blockingTime +
      REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    : null
  const cooldownRetryAt = cooldownExpiresAt === null
    ? undefined
    : getNextSydneyReviewRequestRetryAt(new Date(cooldownExpiresAt - 1))
  const normalizedEmail = email.trim().toLowerCase()

  const decision = classifyReviewRequestPolicy({
    now,
    intake,
    expectedRecipient: input.expectedRecipient,
    bounceDecision,
    addressDecision: addressDecisions.get(normalizedEmail) ?? {
      kind: "transiently_blocked",
    },
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
