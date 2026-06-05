export interface ParchmentWebhookIntakeCandidate {
  id: string
  category?: string | null
  subtype?: string | null
  claimed_by: string | null
  reviewing_doctor_id: string | null
  reviewed_by: string | null
  created_at: string
  service?: { type?: string | null } | { type?: string | null }[] | null
}

const PRESCRIBING_CONSULT_SUBTYPES = new Set(["ed", "hair_loss"])
const PRESCRIBING_SERVICE_TYPES = new Set(["common_scripts", "repeat_rx", "prescription", "repeat-script"])

function getServiceType(service: ParchmentWebhookIntakeCandidate["service"]): string | null {
  return Array.isArray(service) ? service[0]?.type ?? null : service?.type ?? null
}

function isParchmentPrescribingCandidate(candidate: ParchmentWebhookIntakeCandidate): boolean {
  const serviceType = getServiceType(candidate.service)
  return (
    candidate.category === "prescription" ||
    PRESCRIBING_SERVICE_TYPES.has(serviceType ?? "") ||
    (candidate.category === "consult" && PRESCRIBING_CONSULT_SUBTYPES.has(candidate.subtype ?? ""))
  )
}

export function selectParchmentWebhookIntake(
  candidates: ParchmentWebhookIntakeCandidate[],
  prescriberProfileIds: string[] | null,
): ParchmentWebhookIntakeCandidate | null {
  if (!prescriberProfileIds || prescriberProfileIds.length === 0) return null

  const matches = candidates
    .map((candidate) => ({
      candidate,
      prescriberId: isParchmentPrescribingCandidate(candidate)
        ? selectParchmentWebhookPrescriberId(candidate, prescriberProfileIds)
        : null,
    }))
    .filter((match): match is { candidate: ParchmentWebhookIntakeCandidate; prescriberId: string } => (
      match.prescriberId !== null
    ))

  const matchesByPrescriber = new Map<string, number>()
  for (const match of matches) {
    matchesByPrescriber.set(match.prescriberId, (matchesByPrescriber.get(match.prescriberId) ?? 0) + 1)
  }

  if ([...matchesByPrescriber.values()].some((count) => count > 1)) {
    return null
  }

  return matches[0]?.candidate ?? null
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
