export interface PatientProfileMergeRequestInput {
  canonicalPatientId: string
  duplicatePatientIds: string[]
  mergedByProfileId: string
  reason?: string | null
}

export interface PatientProfileMergeRequest {
  canonicalPatientId: string
  duplicatePatientIds: string[]
  mergedByProfileId: string
  reason: string | null
}

export interface PatientProfileMergeCandidate {
  id: string
  role: string | null
  auth_user_id: string | null
  merged_into_profile_id?: string | null
}

export type PatientProfileMergeValidationResult =
  | { valid: true }
  | { valid: false; error: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_REASON_LENGTH = 240

function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

function cleanReason(reason: string | null | undefined): string | null {
  const trimmed = reason?.trim()
  if (!trimmed) return null
  return trimmed.slice(0, MAX_REASON_LENGTH)
}

export function buildPatientProfileMergeRequest(
  input: PatientProfileMergeRequestInput,
): PatientProfileMergeRequest {
  if (!isUuid(input.canonicalPatientId)) {
    throw new Error("Invalid canonical patient profile.")
  }
  if (!isUuid(input.mergedByProfileId)) {
    throw new Error("Invalid merge operator.")
  }

  const duplicatePatientIds = [...new Set(input.duplicatePatientIds)]

  if (duplicatePatientIds.length === 0) {
    throw new Error("Select at least one duplicate profile to merge.")
  }
  if (duplicatePatientIds.some((id) => !isUuid(id))) {
    throw new Error("Invalid duplicate patient profile.")
  }
  if (duplicatePatientIds.includes(input.canonicalPatientId)) {
    throw new Error("Duplicate profiles cannot include the canonical profile.")
  }

  return {
    canonicalPatientId: input.canonicalPatientId,
    duplicatePatientIds,
    mergedByProfileId: input.mergedByProfileId,
    reason: cleanReason(input.reason),
  }
}

export function validatePatientProfileMergeProfiles(input: {
  canonicalPatientId: string
  duplicatePatientIds: string[]
  profiles: PatientProfileMergeCandidate[]
}): PatientProfileMergeValidationResult {
  const profileById = new Map(input.profiles.map((profile) => [profile.id, profile]))
  const canonical = profileById.get(input.canonicalPatientId)

  if (!canonical || canonical.role !== "patient") {
    return { valid: false, error: "Canonical patient profile was not found." }
  }
  if (canonical.merged_into_profile_id) {
    return { valid: false, error: "Canonical patient profile has already been merged." }
  }

  const duplicateProfiles = input.duplicatePatientIds.map((id) => profileById.get(id))
  if (duplicateProfiles.some((profile) => !profile || profile.role !== "patient")) {
    return { valid: false, error: "One or more duplicate patient profiles were not found." }
  }
  if (duplicateProfiles.some((profile) => profile?.merged_into_profile_id)) {
    return { valid: false, error: "One or more duplicate profiles have already been merged." }
  }
  if (duplicateProfiles.some((profile) => profile?.auth_user_id)) {
    return { valid: false, error: "Signed-in duplicate profiles need manual review before merge." }
  }

  return { valid: true }
}
