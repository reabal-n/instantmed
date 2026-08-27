/**
 * Code-owned product presentation versions for the specialty landing pages.
 *
 * This is deliberately separate from clinical answers and feature flags. A
 * version is assigned only from a validated landing CTA and is safe to carry
 * through a flow as aggregate, non-clinical attribution.
 */

export type SpecialtyExperienceService = "hair_loss" | "ed"
export type SpecialtyExperienceSurface = "landing" | "intake_presentation"
export type SpecialtyExperienceStatus = "baseline" | "active" | "retired"

export interface SpecialtyExperienceDefinition {
  readonly id: string
  readonly service: SpecialtyExperienceService
  readonly surface: SpecialtyExperienceSurface
  readonly hypothesis: string
  readonly status: SpecialtyExperienceStatus
  readonly activationTimestamp: string | null
  readonly retirementTimestamp: string | null
  readonly publicLandingPathname: "/hair-loss" | "/erectile-dysfunction"
}

export const SPECIALTY_EXPERIENCE_VERSION_IDS = [
  "spx_h1_20260828",
  "spx_h2_20260828",
  "spx_h3_20260828",
  "spx_e1_20260828",
  "spx_e2_20260828",
  "spx_e3_20260828",
] as const

export type SpecialtyExperienceVersion = (typeof SPECIALTY_EXPERIENCE_VERSION_IDS)[number]

// The dated IDs use the Sydney operating date. This is midnight AEST on the
// same date, represented in UTC so runtime comparisons remain unambiguous.
const ACTIVE_AT = "2026-08-27T14:00:00.000Z"

export const SPECIALTY_EXPERIENCES: readonly SpecialtyExperienceDefinition[] = [
  {
    id: "spx_h1_20260828",
    service: "hair_loss",
    surface: "landing",
    hypothesis:
      "Visitors need clearer understanding of the private one-off doctor assessment and qualified outcome.",
    status: "active",
    activationTimestamp: ACTIVE_AT,
    retirementTimestamp: null,
    publicLandingPathname: "/hair-loss",
  },
  {
    id: "spx_h2_20260828",
    service: "hair_loss",
    surface: "intake_presentation",
    hypothesis: "Two early presentation screens make one mental task feel longer than it is.",
    status: "baseline",
    activationTimestamp: null,
    retirementTimestamp: null,
    publicLandingPathname: "/hair-loss",
  },
  {
    id: "spx_h3_20260828",
    service: "hair_loss",
    surface: "landing",
    hypothesis: "Privacy-led positioning may improve fit while retaining the winning structure.",
    status: "baseline",
    activationTimestamp: null,
    retirementTimestamp: null,
    publicLandingPathname: "/hair-loss",
  },
  {
    id: "spx_e1_20260828",
    service: "ed",
    surface: "landing",
    hypothesis: "The practical private one-off outcome is obscured by the current landing presentation.",
    status: "active",
    activationTimestamp: ACTIVE_AT,
    retirementTimestamp: null,
    publicLandingPathname: "/erectile-dysfunction",
  },
  {
    id: "spx_e2_20260828",
    service: "ed",
    surface: "intake_presentation",
    hypothesis: "Optional physical-detail presentation makes the identity screen feel longer.",
    status: "baseline",
    activationTimestamp: null,
    retirementTimestamp: null,
    publicLandingPathname: "/erectile-dysfunction",
  },
  {
    id: "spx_e3_20260828",
    service: "ed",
    surface: "landing",
    hypothesis: "Privacy-first positioning may improve fit while retaining the qualified outcome.",
    status: "baseline",
    activationTimestamp: null,
    retirementTimestamp: null,
    publicLandingPathname: "/erectile-dysfunction",
  },
] as const

export const ACTIVE_SPECIALTY_EXPERIENCES = SPECIALTY_EXPERIENCES.filter(
  (experience) => experience.status === "active",
)

function assertRegistryInvariants(
  registry: readonly SpecialtyExperienceDefinition[],
): void {
  const activeByService = new Map<SpecialtyExperienceService, number>()

  for (const experience of registry) {
    if (!/^spx_[he][1-3]_20260828$/.test(experience.id)) {
      throw new Error(`Invalid specialty experience version: ${experience.id}`)
    }

    if (experience.status !== "active") continue

    activeByService.set(experience.service, (activeByService.get(experience.service) ?? 0) + 1)
  }

  for (const [service, activeCount] of activeByService) {
    if (activeCount > 1) {
      throw new Error(`Multiple active specialty experiences for ${service}`)
    }
  }
}

assertRegistryInvariants(SPECIALTY_EXPERIENCES)

function parseStartTime(value: Date | string | number | undefined): number {
  if (value === undefined) return Date.now()
  if (value instanceof Date) return value.getTime()
  if (typeof value === "number") return value
  return Date.parse(value)
}

function isAvailableAt(
  experience: SpecialtyExperienceDefinition,
  startedAt: number,
): boolean {
  if (!Number.isFinite(startedAt) || experience.activationTimestamp === null) return false

  const activatedAt = Date.parse(experience.activationTimestamp)
  if (!Number.isFinite(activatedAt) || startedAt < activatedAt) return false

  if (experience.status === "retired") {
    if (experience.retirementTimestamp === null) return false
    return startedAt < Date.parse(experience.retirementTimestamp)
  }

  return experience.status === "active"
}

export function isSpecialtyExperienceAvailableAt(
  experience: SpecialtyExperienceDefinition,
  startedAt: Date | string | number,
): boolean {
  return isAvailableAt(experience, parseStartTime(startedAt))
}

/**
 * Resolve a version at a trust boundary. Invalid, unknown, mismatched, and
 * inactive values become null so attribution can never block an intake.
 * Supplying startedAt allows a recovered flow to retain a version that was
 * valid when that flow began, even if it has since retired.
 */
export function normalizeSpecialtyExperienceVersion(
  value: unknown,
  service: SpecialtyExperienceService,
  surface: SpecialtyExperienceSurface = "landing",
  startedAt?: Date | string | number,
): SpecialtyExperienceVersion | null {
  if (typeof value !== "string" || value.length > 64) return null
  if (service !== "hair_loss" && service !== "ed") return null
  if (surface !== "landing" && surface !== "intake_presentation") return null

  const experience = SPECIALTY_EXPERIENCES.find(
    (candidate) =>
      candidate.id === value &&
      candidate.service === service &&
      candidate.surface === surface,
  )
  if (!experience || !isSpecialtyExperienceAvailableAt(experience, startedAt ?? Date.now())) return null

  return experience.id as SpecialtyExperienceVersion
}

/** Alias used by persistence/analytics callers that refer to the field name. */
export const normalizeGrowthExperienceVersion = normalizeSpecialtyExperienceVersion

export function getActiveSpecialtyExperience(
  service: SpecialtyExperienceService,
  surface: SpecialtyExperienceSurface = "landing",
): SpecialtyExperienceDefinition | null {
  return (
    ACTIVE_SPECIALTY_EXPERIENCES.find(
      (experience) => experience.service === service && experience.surface === surface,
    ) ?? null
  )
}
