import "server-only"

import * as Sentry from "@sentry/nextjs"

import { getEmployerCertificateStorageVersion } from "@/lib/crypto/employer-certificate-token"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import {
  type CertificateEventType,
  logCertificateEvent,
  updateEmailStatus,
} from "@/lib/data/issued-certificates"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("certificate-email-delivery-reconciliation")
const RECONCILIATION_ATTEMPTS = 2

type CertificateActorRole = "patient" | "doctor" | "admin" | "support" | "system"
type DeliveryOutcome = "sent" | "failed"
type ReconciliationStep = "certificate_version" | "email_status" | "certificate_audit"

export interface ReconcileCertificateEmailDeliveryInput {
  intakeId: string
  certificateId: string
  expectedStorageVersion: string
  outcome: DeliveryOutcome
  providerMessageId?: string | null
  failureReason?: string | null
  outboxId?: string | null
  actorId: string | null
  actorRole: CertificateActorRole
  source: "initial_approval" | "correction" | "outbox_dispatcher"
  eventData?: Record<string, unknown>
}

export interface ReconcileCertificateEmailDeliveryResult {
  success: boolean
  failedSteps: ReconciliationStep[]
}

interface ReconciliationTarget {
  storagePath: string
}

async function resolveReconciliationTarget(
  input: ReconcileCertificateEmailDeliveryInput,
): Promise<ReconciliationTarget | null> {
  for (let attempt = 1; attempt <= RECONCILIATION_ATTEMPTS; attempt += 1) {
    try {
      const supabase = createServiceRoleClient()
      const { data: certificate, error } = await supabase
        .from("issued_certificates")
        .select("id, intake_id, status, storage_path")
        .eq("id", input.certificateId)
        .maybeSingle()

      if (
        !error &&
        certificate &&
        certificate.intake_id === input.intakeId &&
        certificate.status === "valid" &&
        getEmployerCertificateStorageVersion(certificate.storage_path) ===
          input.expectedStorageVersion
      ) {
        return { storagePath: certificate.storage_path }
      }

      // A missing, invalid, or changed certificate is a durable version
      // mismatch. Retrying cannot make an older provider email current again.
      if (!error) return null
    } catch {
      // Retry only the version lookup. The provider email has already reached
      // its final outcome and is never sent again from this helper.
    }
  }

  return null
}

async function runWithRetry(
  operation: () => Promise<{ success: boolean; error?: string }>,
): Promise<boolean> {
  for (let attempt = 1; attempt <= RECONCILIATION_ATTEMPTS; attempt += 1) {
    try {
      const result = await operation()
      if (result.success) return true
    } catch {
      // Retry only this bookkeeping write. Never call the email provider here.
    }
  }

  return false
}

function alertResidualFailure(
  input: ReconcileCertificateEmailDeliveryInput,
  failedSteps: ReconciliationStep[],
) {
  log.error("Certificate email delivery reconciliation failed", {
    intakeId: input.intakeId,
    certificateId: input.certificateId,
    outboxId: input.outboxId,
    deliveryOutcome: input.outcome,
    deliverySource: input.source,
    failedSteps,
  })
  try {
    Sentry.captureMessage("Certificate email delivery reconciliation failed", {
      level: "error",
      tags: {
        subsystem: "certificate-email-delivery-reconciliation",
        delivery_outcome: input.outcome,
        delivery_source: input.source,
      },
      extra: {
        intakeId: input.intakeId,
        certificateId: input.certificateId,
        outboxId: input.outboxId,
        expectedStorageVersion: input.expectedStorageVersion,
        failedSteps,
      },
    })
  } catch {
    // The structured application log above remains the fallback signal.
  }

  try {
    revalidateStaff({
      intakeId: input.intakeId,
      ops: true,
      emails: true,
    })
  } catch {
    // Revalidation is an operator-visibility assist, never a delivery retry.
  }
}

/**
 * Reconcile a non-resend certificate email after its provider outcome is
 * already known. Status and audit writes retry independently; this helper has
 * no email-provider dependency and therefore cannot duplicate a delivery.
 *
 * The status compare-and-set is bound to the storage path represented by
 * expectedStorageVersion. A correction racing an outbox send can therefore be
 * audited as the older delivery without marking the replacement PDF sent.
 */
export async function reconcileCertificateEmailDelivery(
  input: ReconcileCertificateEmailDeliveryInput,
): Promise<ReconcileCertificateEmailDeliveryResult> {
  const target = await resolveReconciliationTarget(input)
  if (!target) {
    const failedSteps: ReconciliationStep[] = ["certificate_version"]
    alertResidualFailure(input, failedSteps)
    return { success: false, failedSteps }
  }

  const statusSucceeded = await runWithRetry(() => updateEmailStatus(
    input.certificateId,
    input.outcome,
    input.outcome === "sent"
      ? {
          deliveryId: input.providerMessageId ?? undefined,
          expectedStoragePath: target.storagePath,
        }
      : {
          failureReason: input.failureReason ?? undefined,
          expectedStoragePath: target.storagePath,
        },
  ))

  const eventType: CertificateEventType = input.outcome === "sent"
    ? "email_sent"
    : "email_failed"
  const auditSucceeded = await runWithRetry(() => logCertificateEvent(
    input.certificateId,
    eventType,
    input.actorId,
    input.actorRole,
    {
      ...(input.eventData ?? {}),
      certificate_storage_version: input.expectedStorageVersion,
      delivery_source: input.source,
      ...(input.providerMessageId ? { resend_id: input.providerMessageId } : {}),
      ...(input.failureReason ? { error: input.failureReason } : {}),
      ...(input.outboxId ? { outbox_id: input.outboxId } : {}),
    },
  ))

  const failedSteps: ReconciliationStep[] = []
  if (!statusSucceeded) failedSteps.push("email_status")
  if (!auditSucceeded) failedSteps.push("certificate_audit")

  if (failedSteps.length > 0) {
    alertResidualFailure(input, failedSteps)
    return { success: false, failedSteps }
  }

  return { success: true, failedSteps: [] }
}
