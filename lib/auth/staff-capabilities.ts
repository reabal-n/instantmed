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

// ── Service routing ──────────────────────────────────────────────────────────
// Maps an intake's service type + subtype to the capability flag a reviewing
// doctor must hold. Phase 7 of dashboard remaster (2026-05-12).

/**
 * The capability a doctor must hold to review / approve / decline an intake
 * for a given service. Returns null when the mapping isn't known (an unknown
 * service falls open — capability gating only blocks recognized service
 * lines).
 */
export function requiredCapabilityForService(
  serviceType: string | null | undefined,
  subtype: string | null | undefined,
): DoctorCapability | null {
  if (!serviceType) return null
  if (serviceType === "med_certs") return "review_med_certs"
  if (serviceType === "repeat_script" || serviceType === "prescription") {
    return "review_repeat_rx"
  }
  if (serviceType === "consult") {
    if (subtype === "ed") return "review_ed"
    if (subtype === "hair_loss") return "review_hair_loss"
    return "review_consults"
  }
  return null
}

/**
 * Whether the given doctor profile is allowed to review the given service.
 * Unknown service types fall open so we don't accidentally block legacy or
 * not-yet-mapped pathways; explicit service lines we DO recognize check the
 * specific capability flag.
 */
export function doctorCanReviewService(
  profile: Pick<Profile, "role"> & Partial<DoctorCapabilityFields>,
  serviceType: string | null | undefined,
  subtype: string | null | undefined,
): boolean {
  if (!hasDoctorAccess(profile)) return false
  const capability = requiredCapabilityForService(serviceType, subtype)
  if (!capability) return true
  return doctorHasCapability(profile, capability)
}

/**
 * Friendly label used in capability-denied error messages.
 */
export function describeServiceCapability(
  serviceType: string | null | undefined,
  subtype: string | null | undefined,
): string {
  if (serviceType === "med_certs") return "medical certificates"
  if (serviceType === "repeat_script" || serviceType === "prescription") {
    return "repeat prescriptions"
  }
  if (serviceType === "consult") {
    if (subtype === "ed") return "ED consults"
    if (subtype === "hair_loss") return "hair loss consults"
    return "consults"
  }
  return "this service"
}
