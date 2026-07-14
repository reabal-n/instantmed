interface ReviewFulfilmentSnapshot {
  intake: {
    id: string
    script_sent?: boolean | null
    script_sent_at?: string | null
  }
}

/**
 * Returns a stable evidence key only when the same open request moves from
 * pending to durably recorded. Initial page loads and repeated refreshes stay
 * silent, which prevents duplicate fulfilment toasts.
 */
export function getPrescriptionRecordedEvidenceKey(
  previous: ReviewFulfilmentSnapshot | null,
  next: ReviewFulfilmentSnapshot,
): string | null {
  if (!previous || previous.intake.id !== next.intake.id) return null
  if (previous.intake.script_sent === true || next.intake.script_sent !== true) return null

  return `${next.intake.id}:${next.intake.script_sent_at || "recorded"}`
}
