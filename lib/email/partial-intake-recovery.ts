"use server"

import * as Sentry from "@sentry/nextjs"
import * as React from "react"

import {
  PartialIntakeRecoveryEmail,
  partialIntakeRecoverySubject,
} from "@/lib/email/components/templates/partial-intake-recovery"
import { isEmailSendDeliveryConfirmed } from "@/lib/email/outbox-delivery"
import { finalizeOutboxSequenceDisposition } from "@/lib/email/outbox-disposition"
import {
  findPartialIntakeRecoveryCandidates,
} from "@/lib/email/partial-intake-recovery-candidates"
import { evaluatePartialIntakeRecoveryPolicy } from "@/lib/email/partial-intake-recovery-policy"
import {
  reconcileSentPartialIntakeRecoveryMarkers,
} from "@/lib/email/partial-intake-recovery-reconciliation"
import type { CommunicationOutcome } from "@/lib/email/send/types"
import { sendEmail } from "@/lib/email/send-email"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("partial-intake-recovery")

const SERVICE_NAMES: Record<string, string> = {
  "med-cert": "Medical Certificate",
  prescription: "Repeat Prescription",
  consult: "Doctor Consultation",
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

async function finalizePartialRecoveryDisposition(input: {
  recoveryTrackingId: string
  outboxId?: string
  disposition: "sent" | "suppressed"
}): Promise<boolean> {
  const result = await finalizeOutboxSequenceDisposition(
    {
      id: input.outboxId ??
        `partial-recovery:${input.recoveryTrackingId}:policy`,
      email_type: "partial_intake_recovery",
      intake_id: null,
      metadata: {
        recovery_tracking_id: input.recoveryTrackingId,
      },
    },
    input.disposition,
  )
  return result.finalized
}

function fallbackSendOutcome(
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

async function resolveSendOutcome(input: {
  recoveryTrackingId: string
  result: Awaited<ReturnType<typeof sendEmail>>
}): Promise<CommunicationOutcome> {
  if (await isEmailSendDeliveryConfirmed(input.result)) {
    const outcome: CommunicationOutcome = {
      kind: "sent",
      ...(input.result.messageId
        ? { messageId: input.result.messageId }
        : {}),
      ...(input.result.outboxId ? { outboxId: input.result.outboxId } : {}),
    }
    const finalized = await finalizePartialRecoveryDisposition({
      recoveryTrackingId: input.recoveryTrackingId,
      outboxId: input.result.outboxId,
      disposition: "sent",
    })
    if (!finalized) {
      Sentry.captureMessage("Partial recovery sent marker needs reconciliation", {
        level: "error",
        tags: { subsystem: "partial-intake-recovery" },
        extra: {
          recoveryTrackingId: input.recoveryTrackingId,
          outboxId: input.result.outboxId,
        },
      })
    }
    return outcome
  }

  const outcome = input.result.outcome ?? fallbackSendOutcome(input.result)
  if (outcome.kind !== "policy_suppressed") {
    return outcome.kind === "sent"
      ? {
          kind: "pending",
          ...(outcome.outboxId ? { outboxId: outcome.outboxId } : {}),
        }
      : outcome
  }

  const finalized = await finalizePartialRecoveryDisposition({
    recoveryTrackingId: input.recoveryTrackingId,
    outboxId: input.result.outboxId,
    disposition: "suppressed",
  })
  return finalized
    ? outcome
    : {
        kind: "transiently_blocked",
        reason: "recovery_suppression_marker_write_failed",
      }
}

export async function processPartialIntakeRecoveries(): Promise<
  { found: number; testSkipped: number } & PartialRecoveryCounts
> {
  const reconciliation = await reconcileSentPartialIntakeRecoveryMarkers()
  if (reconciliation.reconciled > 0 || reconciliation.failed > 0) {
    logger.info("Reconciled partial recovery sent markers", reconciliation)
  }

  const now = new Date()
  const candidates = await findPartialIntakeRecoveryCandidates(now)
  const counts = emptyCounts()
  let testSkipped = 0

  for (const candidate of candidates) {
    const decision = await evaluatePartialIntakeRecoveryPolicy({
      recoveryTrackingId: candidate.recovery_tracking_id,
      expectedRecipient: candidate.email,
      expectedUpdatedAt: candidate.updated_at,
      mode: "initial",
      now,
    })

    if (decision.kind === "transiently_blocked") {
      counts.transiently_blocked += 1
      continue
    }
    if (decision.kind === "policy_suppressed") {
      const finalized = await finalizePartialRecoveryDisposition({
        recoveryTrackingId: candidate.recovery_tracking_id,
        disposition: "suppressed",
      })
      const outcome: CommunicationOutcome = finalized
        ? decision
        : {
            kind: "transiently_blocked",
            reason: "recovery_suppression_marker_write_failed",
          }
      counts[outcome.kind] += 1
      if (decision.reason === "test_identity" && finalized) {
        testSkipped += 1
        logger.info("Skipping recovery email - test identity")
      }
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
        partialRecoveryExpectedUpdatedAt: draft.updatedAt,
      })

      const outcome = await resolveSendOutcome({
        recoveryTrackingId: draft.recoveryTrackingId,
        result,
      })
      counts[outcome.kind] += 1
    } catch (error) {
      counts.transiently_blocked += 1
      logger.error("Partial recovery send failed before outcome resolution", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return {
    found: candidates.length,
    ...counts,
    testSkipped,
  }
}
