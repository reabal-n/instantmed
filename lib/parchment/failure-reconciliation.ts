export interface ParchmentFailureRow {
  id: string
}

export interface ParchmentRetryReceiptRow {
  action: string
  metadata: Record<string, unknown> | null
}

export interface ParchmentStandaloneFailureCandidate extends ParchmentFailureRow {
  intakeId: string | null
  reason: string
  scid: string | null
  patientProfileId: string | null
  partnerPatientId: string | null
}

export interface ParchmentStandalonePrescriptionEvidence {
  intakeId: string | null
  parchmentReference: string | null
  patientId: string | null
}

export interface RecoveredStandaloneParchmentFailurePresentation {
  status: "success"
  label: "Direct prescription synced"
  detail: "No InstantMed request was attached to this Parchment event, and the same prescription is synced to this patient profile."
}

const NON_ACTIONABLE_PARCHMENT_FAILURE_REASONS = new Set([
  "no_awaiting_script_intake",
  "patient_not_found",
])

function metadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function normalizedString(value: string | null): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function getResolvedParchmentFailureIds(
  receipts: ParchmentRetryReceiptRow[],
): Set<string> {
  return new Set(
    receipts.flatMap((receipt) => {
      if (receipt.action !== "admin_action") return []
      if (metadataString(receipt.metadata, "action_type") !== "parchment_webhook_retry") return []
      if (metadataString(receipt.metadata, "result") !== "success") return []

      const failureAuditId = metadataString(receipt.metadata, "failure_audit_id")
      return failureAuditId ? [failureAuditId] : []
    }),
  )
}

export function filterUnresolvedParchmentFailures<T extends ParchmentFailureRow>(
  failures: T[],
  receipts: ParchmentRetryReceiptRow[],
): T[] {
  const resolvedFailureIds = getResolvedParchmentFailureIds(receipts)
  return failures.filter((failure) => !resolvedFailureIds.has(failure.id))
}

export function isNonActionableParchmentFailure(failure: {
  intakeId: string | null
  reason: string
}): boolean {
  return !failure.intakeId && NON_ACTIONABLE_PARCHMENT_FAILURE_REASONS.has(failure.reason)
}

/**
 * A historical invalid-correlation audit row can be presented as recovered
 * only when durable PMS evidence proves that the exact SCID was stored as a
 * standalone prescription for the same patient. The audit row remains
 * immutable; this changes only its read-time classification.
 */
function isRecoveredStandaloneParchmentFailure(
  failure: ParchmentStandaloneFailureCandidate,
  prescriptions: ParchmentStandalonePrescriptionEvidence[],
): boolean {
  if (failure.reason !== "intake_correlation_invalid") return false
  if (normalizedString(failure.intakeId)) return false

  const scid = normalizedString(failure.scid)
  if (!scid) return false

  const patientIds = new Set(
    [failure.patientProfileId, failure.partnerPatientId]
      .map(normalizedString)
      .filter((value): value is string => value !== null),
  )
  if (patientIds.size === 0) return false

  return prescriptions.some((prescription) => (
    !normalizedString(prescription.intakeId)
    && normalizedString(prescription.parchmentReference) === scid
    && patientIds.has(normalizedString(prescription.patientId) ?? "")
  ))
}

export function filterRecoveredStandaloneParchmentFailures<
  T extends ParchmentStandaloneFailureCandidate,
>(
  failures: T[],
  prescriptions: ParchmentStandalonePrescriptionEvidence[],
): T[] {
  return failures.filter((failure) => (
    !isRecoveredStandaloneParchmentFailure(failure, prescriptions)
  ))
}

export function getRecoveredStandaloneParchmentFailurePresentation(
  failure: ParchmentStandaloneFailureCandidate,
  prescriptions: ParchmentStandalonePrescriptionEvidence[],
): RecoveredStandaloneParchmentFailurePresentation | null {
  if (!isRecoveredStandaloneParchmentFailure(failure, prescriptions)) return null

  return {
    status: "success",
    label: "Direct prescription synced",
    detail: "No InstantMed request was attached to this Parchment event, and the same prescription is synced to this patient profile.",
  }
}
