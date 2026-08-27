import {
  normalizeSpecialtyExperienceVersion,
  SPECIALTY_EXPERIENCES,
  type SpecialtyExperienceService,
  type SpecialtyExperienceVersion,
} from "@/lib/growth/specialty-experiences"

export interface SpecialtyExperienceRequestContext {
  category?: unknown
  serviceType?: unknown
  subtype?: unknown
}

function resolveService(
  context: SpecialtyExperienceRequestContext,
): SpecialtyExperienceService | null {
  const serviceType = context.serviceType ?? context.category
  if (serviceType !== "consult") return null
  if (context.subtype === "hair_loss") return "hair_loss"
  if (context.subtype === "ed") return "ed"
  return null
}

/** Strict boundary for a new landing CTA claim. */
export function normalizeIncomingGrowthExperienceVersion(
  value: unknown,
  context: SpecialtyExperienceRequestContext,
): SpecialtyExperienceVersion | null {
  const service = resolveService(context)
  if (!service) return null
  return normalizeSpecialtyExperienceVersion(value, service, "landing")
}

/**
 * Boundary for a value already owned by a draft/intake. Registry membership
 * and service ownership remain mandatory, while retirement cannot erase a
 * cohort that was valid when its flow began.
 */
export function normalizePersistedGrowthExperienceVersion(
  value: unknown,
  context: SpecialtyExperienceRequestContext,
): SpecialtyExperienceVersion | null {
  if (typeof value !== "string" || value.length > 64) return null
  const service = resolveService(context)
  if (!service) return null
  const experience = SPECIALTY_EXPERIENCES.find(
    (candidate) =>
      candidate.id === value &&
      candidate.service === service &&
      candidate.surface === "landing",
  )
  return (experience?.id as SpecialtyExperienceVersion | undefined) ?? null
}

/** Strict opaque allowlist for the last-line analytics privacy boundary. */
export function normalizeOpaqueGrowthExperienceVersion(
  value: unknown,
): SpecialtyExperienceVersion | null {
  if (typeof value !== "string" || value.length > 64) return null
  const experience = SPECIALTY_EXPERIENCES.find(
    (candidate) => candidate.id === value,
  )
  return (experience?.id as SpecialtyExperienceVersion | undefined) ?? null
}

/** Database/restored truth wins; a valid candidate can fill only a null slot. */
export function selectGrowthExperienceVersion({
  storedValue,
  candidateValue,
  context,
}: {
  storedValue: unknown
  candidateValue: unknown
  context: SpecialtyExperienceRequestContext
}): SpecialtyExperienceVersion | null {
  if (storedValue !== null && storedValue !== undefined) {
    return normalizePersistedGrowthExperienceVersion(storedValue, context)
  }
  return normalizePersistedGrowthExperienceVersion(candidateValue, context)
}
