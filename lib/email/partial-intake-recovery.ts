"use server"

import * as React from "react"

import {
  PartialIntakeRecoveryEmail,
  partialIntakeRecoverySubject,
} from "@/lib/email/components/templates/partial-intake-recovery"
import { isEmailSendDeliveryConfirmed } from "@/lib/email/outbox-delivery"
import {
  evaluatePartialIntakeRecoveryPolicy,
  markPartialIntakeRecoveryCommunicationOutcome,
  PARTIAL_RECOVERY_MAX_IDLE_HOURS,
  PARTIAL_RECOVERY_MIN_IDLE_MINUTES,
} from "@/lib/email/partial-intake-recovery-policy"
import type { CommunicationOutcome } from "@/lib/email/send/types"
import { sendEmail } from "@/lib/email/send-email"
import { createLogger } from "@/lib/observability/logger"
import type { EncryptedPHI } from "@/lib/security/phi-encryption"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("partial-intake-recovery")

const PARTIAL_RECOVERY_RECONCILIATION_LIMIT = 50

const SERVICE_NAMES: Record<string, string> = {
  "med-cert": "Medical Certificate",
  prescription: "Repeat Prescription",
  consult: "Doctor Consultation",
}

interface PartialIntakeRecoveryCandidate {
  recovery_tracking_id: string
  session_id: string
  service_type: string
  email: string
  first_name: string | null
  updated_at: string
  expires_at: string
  converted_to_intake_id: string | null
  recovery_email_sent_at: string | null
  recovery_email_suppressed_at: string | null
  answers_encrypted: EncryptedPHI | null
}

type PartialRecoveryCounts = {
  sent: number
  policy_suppressed: number
  transiently_blocked: number
  pending: number
  provider_failed: number
}

function emptyCounts(): PartialRecoveryCounts {
  return {
    sent: 0,
    policy_suppressed: 0,
    transiently_blocked: 0,
    pending: 0,
    provider_failed: 0,
  }
}

export async function reconcileSentPartialIntakeRecoveryMarkers(
  limit = PARTIAL_RECOVERY_RECONCILIATION_LIMIT,
): Promise<{ reconciled: number; failed: number }> {
  const boundedLimit = Math.max(
    1,
    Math.min(limit, PARTIAL_RECOVERY_RECONCILIATION_LIMIT),
  )
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc(
    "get_unmarked_sent_partial_recoveries",
    { p_limit: boundedLimit },
  )

  if (error) {
    throw new Error(
      `Failed to fetch sent partial recovery outbox rows: ${error.message}`,
    )
  }

  let reconciled = 0
  let failed = 0
  for (const row of data ?? []) {
    const recoveryTrackingId = row.recovery_tracking_id
    if (typeof recoveryTrackingId !== "string" || !recoveryTrackingId) {
      failed += 1
      continue
    }
    const outcome = await markPartialIntakeRecoveryCommunicationOutcome(
      recoveryTrackingId,
      { kind: "sent" },
    )
    if (outcome.kind === "sent") reconciled += 1
    else failed += 1
  }

  return { reconciled, failed }
}

export async function findPartialIntakeRecoveryCandidates(
  now: Date,
): Promise<PartialIntakeRecoveryCandidate[]> {
  const supabase = createServiceRoleClient()
  const eligibleBefore = new Date(
    now.getTime() - PARTIAL_RECOVERY_MIN_IDLE_MINUTES * 60 * 1000,
  ).toISOString()
  const eligibleAfter = new Date(
    now.getTime() - PARTIAL_RECOVERY_MAX_IDLE_HOURS * 60 * 60 * 1000,
  ).toISOString()

  const { data, error } = await supabase
    .from("partial_intakes")
    .select(`
      recovery_tracking_id,
      session_id,
      service_type,
      email,
      first_name,
      updated_at,
      expires_at,
      converted_to_intake_id,
      recovery_email_sent_at,
      recovery_email_suppressed_at,
      answers_encrypted
    `)
    .not("email", "is", null)
    .is("converted_to_intake_id", null)
    .is("recovery_email_sent_at", null)
    .is("recovery_email_suppressed_at", null)
    .lte("updated_at", eligibleBefore)
    .gte("updated_at", eligibleAfter)
    .order("updated_at", { ascending: true })
    .limit(50)

  if (error) {
    throw new Error(`Failed to fetch eligible recovery drafts: ${error.message}`)
  }

  return (data ?? []) as PartialIntakeRecoveryCandidate[]
}

function fallbackOutcome(
  result: Awaited<ReturnType<typeof sendEmail>>,
): CommunicationOutcome {
  if (result.success && result.outboxId) {
    return { kind: "pending", outboxId: result.outboxId }
  }
  return {
    kind: "provider_failed",
    error: result.error ?? "Partial recovery provider attempt failed",
    retryable: result.retryable !== false,
    ...(result.outboxId ? { outboxId: result.outboxId } : {}),
  }
}

function countOutcome(
  counts: PartialRecoveryCounts,
  outcome: CommunicationOutcome,
): void {
  counts[outcome.kind] += 1
}

async function finalizeSendOutcome(
  recoveryTrackingId: string,
  result: Awaited<ReturnType<typeof sendEmail>>,
): Promise<CommunicationOutcome> {
  const outcome = result.outcome ?? fallbackOutcome(result)
  if (outcome.kind === "sent") {
    if (!await isEmailSendDeliveryConfirmed(result)) {
      return {
        kind: "pending",
        ...(result.outboxId ? { outboxId: result.outboxId } : {}),
      }
    }
    const marked = await markPartialIntakeRecoveryCommunicationOutcome(
      recoveryTrackingId,
      outcome,
    )
    if (marked.kind === "transiently_blocked") {
      logger.error("Partial recovery sent marker needs reconciliation", {
        recoveryTrackingId,
        outboxId: result.outboxId,
      })
      return outcome
    }
    return marked
  }
  if (outcome.kind === "policy_suppressed") {
    return markPartialIntakeRecoveryCommunicationOutcome(
      recoveryTrackingId,
      outcome,
    )
  }
  return outcome
}

export async function processPartialIntakeRecoveries(): Promise<
  { found: number } & PartialRecoveryCounts
> {
  const now = new Date()
  const reconciliation = await reconcileSentPartialIntakeRecoveryMarkers()
  if (reconciliation.reconciled > 0 || reconciliation.failed > 0) {
    logger.info("Reconciled partial recovery sent markers", reconciliation)
  }
  const candidates = await findPartialIntakeRecoveryCandidates(now)
  const counts = emptyCounts()

  for (const candidate of candidates) {
    const decision = await evaluatePartialIntakeRecoveryPolicy({
      recoveryTrackingId: candidate.recovery_tracking_id,
      expectedRecipient: candidate.email,
      expectedUpdatedAt: candidate.updated_at,
      mode: "initial",
      now,
    })

    if (decision.kind === "transiently_blocked") {
      countOutcome(counts, decision)
      continue
    }
    if (decision.kind === "policy_suppressed") {
      const marked = await markPartialIntakeRecoveryCommunicationOutcome(
        candidate.recovery_tracking_id,
        decision,
      )
      countOutcome(counts, marked)
      continue
    }

    const draft = decision.draft
    const serviceName = SERVICE_NAMES[draft.serviceType] ?? "request"
    try {
      const result = await sendEmail({
        to: draft.email,
        toName: draft.firstName ?? undefined,
        subject: partialIntakeRecoverySubject(serviceName),
        template: React.createElement(PartialIntakeRecoveryEmail, {
          firstName: draft.firstName ?? "",
          serviceName,
          resumeUrl: draft.resumeUrl,
          appUrl: new URL(draft.resumeUrl).origin,
        }),
        emailType: "partial_intake_recovery",
        unsubscribeEmail: draft.email,
        idempotencyKey:
          `partial-intake-recovery:${draft.recoveryTrackingId}`,
        metadata: {
          recovery_tracking_id: draft.recoveryTrackingId,
        },
        partialRecoverySnapshot: {
          evaluatedAt: now.toISOString(),
          expectedUpdatedAt: candidate.updated_at,
        },
      })

      countOutcome(
        counts,
        await finalizeSendOutcome(candidate.recovery_tracking_id, result),
      )
    } catch (error) {
      logger.error("Partial recovery send threw before outcome resolution", {
        error: error instanceof Error ? error.message : String(error),
      })
      countOutcome(counts, {
        kind: "transiently_blocked",
        reason: "send_infrastructure_failed",
      })
    }
  }

  return {
    found: candidates.length,
    ...counts,
  }
}
