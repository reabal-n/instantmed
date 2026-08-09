export interface ParchmentFailureRow {
  id: string
}

export interface ParchmentRetryReceiptRow {
  action: string
  metadata: Record<string, unknown> | null
}

const NON_ACTIONABLE_PARCHMENT_FAILURE_REASONS = new Set([
  "no_awaiting_script_intake",
  "patient_not_found",
])

function metadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function getResolvedParchmentFailureIds(
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
