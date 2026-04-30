export interface ParchmentWebhookIntakeCandidate {
  id: string
  claimed_by: string | null
  reviewing_doctor_id: string | null
  reviewed_by: string | null
  created_at: string
}

export function selectParchmentWebhookIntake(
  candidates: ParchmentWebhookIntakeCandidate[],
  prescriberProfileIds: string[] | null,
): ParchmentWebhookIntakeCandidate | null {
  if (!prescriberProfileIds || prescriberProfileIds.length === 0) return null
  const prescriberIds = new Set(prescriberProfileIds)

  return candidates.find((candidate) => (
    (candidate.claimed_by && prescriberIds.has(candidate.claimed_by)) ||
    (candidate.reviewing_doctor_id && prescriberIds.has(candidate.reviewing_doctor_id)) ||
    (candidate.reviewed_by && prescriberIds.has(candidate.reviewed_by))
  )) ?? null
}
