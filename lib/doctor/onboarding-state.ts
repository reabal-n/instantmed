import type { Profile } from "@/types/db"

export const DOCTOR_ONBOARDING_STATES = [
  "invited",
  "identity_pending",
  "capability_pending",
  "active",
] as const

export type DoctorOnboardingState = (typeof DOCTOR_ONBOARDING_STATES)[number]

type DoctorOnboardingProfile = {
  auth_user_id: string | null
  role: Profile["role"] | string | null
} & Partial<Pick<
  Profile,
  | "ahpra_number"
  | "can_prescribe_s4"
  | "can_prescribe_s8"
  | "can_review_consults"
  | "can_review_ed"
  | "can_review_hair_loss"
  | "can_review_med_certs"
  | "can_review_repeat_rx"
  | "parchment_user_id"
  | "provider_number"
  | "signature_storage_path"
>>

function hasValue(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0
}

function needsCertificateIdentity(profile: DoctorOnboardingProfile): boolean {
  if (profile.role === "admin") return true
  return profile.can_review_med_certs !== false
}

function needsPrescribingIdentity(profile: DoctorOnboardingProfile): boolean {
  if (profile.role === "admin") return true
  return profile.can_prescribe_s4 !== false || profile.can_prescribe_s8 === true
}

function hasAnyClinicalCapability(profile: DoctorOnboardingProfile): boolean {
  if (profile.role === "admin") return true
  return [
    profile.can_review_med_certs,
    profile.can_review_repeat_rx,
    profile.can_review_consults,
    profile.can_review_ed,
    profile.can_review_hair_loss,
    profile.can_prescribe_s4,
    profile.can_prescribe_s8,
  ].some((value) => value !== false)
}

export function getDoctorOnboardingState(profile: DoctorOnboardingProfile): DoctorOnboardingState {
  if (!profile.auth_user_id) return "invited"

  const identityComplete = (
    hasValue(profile.provider_number) &&
    hasValue(profile.ahpra_number) &&
    (!needsCertificateIdentity(profile) || hasValue(profile.signature_storage_path)) &&
    (!needsPrescribingIdentity(profile) || hasValue(profile.parchment_user_id))
  )

  if (!identityComplete) return "identity_pending"
  if (!hasAnyClinicalCapability(profile)) return "capability_pending"
  return "active"
}

export function getDoctorOnboardingStateLabel(state: DoctorOnboardingState): string {
  switch (state) {
    case "invited":
      return "Invited"
    case "identity_pending":
      return "Identity pending"
    case "capability_pending":
      return "Capability pending"
    case "active":
      return "Active"
  }
}
