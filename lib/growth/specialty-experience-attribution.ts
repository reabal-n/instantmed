import {
  hasSpecialtyExperienceActivationHistory,
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

export interface SpecialtyExperienceEntryState {
  hasExplicitRecovery: boolean
  hasAuthoritativePatientWork: boolean
}

/**
 * Snapshot the ownership boundary at entry. Later structural URL setup may
 * move the wizard to its first subtype step and stamp store state; that must
 * not make a genuinely fresh tagged entry ineligible for its cohort.
 */
export function canClaimSpecialtyExperienceAtEntry({
  hasExplicitRecovery,
  hasAuthoritativePatientWork,
}: SpecialtyExperienceEntryState): boolean {
  return !hasExplicitRecovery && !hasAuthoritativePatientWork
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

/** Resolve a landing claim only after hydrated work has established ownership. */
export function resolveSpecialtyExperienceEntryClaim(
  value: unknown,
  context: SpecialtyExperienceRequestContext,
  entry: SpecialtyExperienceEntryState,
): SpecialtyExperienceVersion | null {
  if (!canClaimSpecialtyExperienceAtEntry(entry)) return null
  return normalizeIncomingGrowthExperienceVersion(value, context)
}

/** A captured claim waits until the live store owns the matching subtype. */
export function isSpecialtyExperienceClaimContextReady(
  value: unknown,
  context: SpecialtyExperienceRequestContext,
): boolean {
  if (typeof value !== "string") return false
  return normalizeIncomingGrowthExperienceVersion(value, context) === value
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
      candidate.surface === "landing" &&
      hasSpecialtyExperienceActivationHistory(candidate),
  )
  return (experience?.id as SpecialtyExperienceVersion | undefined) ?? null
}

/** Strict opaque allowlist for the last-line analytics privacy boundary. */
export function normalizeOpaqueGrowthExperienceVersion(
  value: unknown,
): SpecialtyExperienceVersion | null {
  if (typeof value !== "string" || value.length > 64) return null
  const experience = SPECIALTY_EXPERIENCES.find(
    (candidate) =>
      candidate.id === value &&
      hasSpecialtyExperienceActivationHistory(candidate),
  )
  return (experience?.id as SpecialtyExperienceVersion | undefined) ?? null
}

/** Database/restored truth wins; only the absence of a stored row permits a fresh claim. */
export function selectGrowthExperienceVersion({
  storedValue,
  candidateValue,
  context,
}: {
  storedValue: unknown
  candidateValue: unknown
  context: SpecialtyExperienceRequestContext
}): SpecialtyExperienceVersion | null {
  return storedValue === undefined
    ? normalizeIncomingGrowthExperienceVersion(candidateValue, context)
    : normalizePersistedGrowthExperienceVersion(storedValue, context)
}
