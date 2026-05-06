import type { Profile, UserRole } from "@/types/db"

export type RoleCapability = "patient" | "doctor" | "admin"

export function getRoleCapabilities(role: UserRole): RoleCapability[] {
  if (role === "admin") {
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

export function getStaffDisplayRole(profile: Pick<Profile, "role">): string {
  if (hasAdminAccess(profile) && hasDoctorAccess(profile)) {
    return "Doctor + admin"
  }

  if (hasDoctorAccess(profile)) {
    return "Doctor"
  }

  if (hasAdminAccess(profile)) {
    return "Admin"
  }

  return "Patient"
}
