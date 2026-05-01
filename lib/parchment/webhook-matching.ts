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

  return candidates.find((candidate) => (
    selectParchmentWebhookPrescriberId(candidate, prescriberProfileIds) !== null
  )) ?? null
}

export function selectParchmentWebhookPrescriberId(
  candidate: ParchmentWebhookIntakeCandidate,
  prescriberProfileIds: string[] | null,
): string | null {
  if (!prescriberProfileIds || prescriberProfileIds.length === 0) return null
  const prescriberIds = new Set(prescriberProfileIds)

  for (const doctorId of [candidate.claimed_by, candidate.reviewing_doctor_id, candidate.reviewed_by]) {
    if (doctorId && prescriberIds.has(doctorId)) return doctorId
  }

  return null
}
