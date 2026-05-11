import type { Profile, UserRole } from "@/types/db"

/**
 * Granular capabilities that a role can hold. `support` is operations-only:
 * payment recovery, webhook retries, identity chase-ups, no clinical access.
 */
export type RoleCapability = "patient" | "doctor" | "admin" | "support"

export function getRoleCapabilities(role: UserRole): RoleCapability[] {
  if (role === "admin") {
    // Owner-operator: admin also reviews clinically.
    return ["admin", "doctor"]
  }

  return [role]
}

export function roleHasCapability(role: UserRole, capability: RoleCapability): boolean {
  return getRoleCapabilities(role).includes(capability)
}

export function roleHasAnyCapability(role: UserRole, capabilities: RoleCapability[]): boolean {
  return capabilities.some((capability) => roleHasCapability(role, capability))
}

export function profileHasCapability(profile: Pick<Profile, "role">, capability: RoleCapability): boolean {
  return roleHasCapability(profile.role, capability)
}

export function profileHasAnyCapability(profile: Pick<Profile, "role">, capabilities: RoleCapability[]): boolean {
  return roleHasAnyCapability(profile.role, capabilities)
}

export function hasAdminAccess(profile: Pick<Profile, "role">): boolean {
  return profileHasCapability(profile, "admin")
}

export function hasDoctorAccess(profile: Pick<Profile, "role">): boolean {
  return profileHasCapability(profile, "doctor")
}

export function hasSupportAccess(profile: Pick<Profile, "role">): boolean {
  return profileHasCapability(profile, "support")
}

/**
 * Whether this profile is allowed on staff surfaces at all (dashboard, patients,
 * cases, ops). Excludes plain patients.
 */
export function hasStaffAccess(profile: Pick<Profile, "role">): boolean {
  return (
    profileHasCapability(profile, "admin") ||
    profileHasCapability(profile, "doctor") ||
    profileHasCapability(profile, "support")
  )
}

export function getStaffDisplayRole(profile: Pick<Profile, "role">): string {
  if (hasAdminAccess(profile) && hasDoctorAccess(profile)) {
    return "Operator"
  }

  if (hasDoctorAccess(profile)) {
    return "Doctor"
  }

  if (hasAdminAccess(profile)) {
    return "Admin"
  }

  if (hasSupportAccess(profile)) {
    return "Support"
  }

  return "Patient"
}

// ── Per-doctor capability flags ──────────────────────────────────────────────
// Future doctor hires may be scoped before they are verified for a service line.
// The owner-operator is unrestricted; existing rows default true on every flag
// except S8, which requires an explicit grant.

export type DoctorCapability =
  | "review_med_certs"
  | "review_repeat_rx"
  | "review_consults"
  | "review_ed"
  | "review_hair_loss"
  | "prescribe_s4"
  | "prescribe_s8"

type DoctorCapabilityFields = Pick<
  Profile,
  | "can_review_med_certs"
  | "can_review_repeat_rx"
  | "can_review_consults"
  | "can_review_ed"
  | "can_review_hair_loss"
  | "can_prescribe_s4"
  | "can_prescribe_s8"
>

const DOCTOR_CAPABILITY_FIELD: Record<DoctorCapability, keyof DoctorCapabilityFields> = {
  review_med_certs: "can_review_med_certs",
  review_repeat_rx: "can_review_repeat_rx",
  review_consults: "can_review_consults",
  review_ed: "can_review_ed",
  review_hair_loss: "can_review_hair_loss",
  prescribe_s4: "can_prescribe_s4",
  prescribe_s8: "can_prescribe_s8",
}

const DOCTOR_CAPABILITY_DEFAULT: Record<DoctorCapability, boolean> = {
  review_med_certs: true,
  review_repeat_rx: true,
  review_consults: true,
  review_ed: true,
  review_hair_loss: true,
  prescribe_s4: true,
  prescribe_s8: false,
}

/**
 * Whether a doctor profile holds a specific clinical capability. Admin profiles
 * inherit doctor capabilities (owner-operator); support and patient roles never
 * hold clinical capabilities.
 *
 * Missing rows (older profiles) fall back to the per-capability default.
 */
export function doctorHasCapability(
  profile: Pick<Profile, "role"> & Partial<DoctorCapabilityFields>,
  capability: DoctorCapability,
): boolean {
  if (!hasDoctorAccess(profile)) return false
  const field = DOCTOR_CAPABILITY_FIELD[capability]
  const value = profile[field]
  if (typeof value === "boolean") return value
  return DOCTOR_CAPABILITY_DEFAULT[capability]
}
