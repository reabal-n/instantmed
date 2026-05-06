import { describe, expect, it } from "vitest"

import {
  getRoleCapabilities,
  getStaffDisplayRole,
  hasAdminAccess,
  hasDoctorAccess,
  roleHasAnyCapability,
} from "@/lib/auth/staff-capabilities"
import type { Profile } from "@/types/db"

function profile(role: Profile["role"]): Pick<Profile, "role"> {
  return { role }
}

describe("staff capabilities", () => {
  it("treats admin as the owner-operator role with doctor and admin capabilities", () => {
    expect(getRoleCapabilities("admin")).toEqual(["admin", "doctor"])
    expect(hasAdminAccess(profile("admin"))).toBe(true)
    expect(hasDoctorAccess(profile("admin"))).toBe(true)
    expect(roleHasAnyCapability("admin", ["doctor"])).toBe(true)
    expect(getStaffDisplayRole(profile("admin"))).toBe("Doctor + admin")
  })

  it("keeps ordinary doctors out of admin capabilities", () => {
    expect(getRoleCapabilities("doctor")).toEqual(["doctor"])
    expect(hasDoctorAccess(profile("doctor"))).toBe(true)
    expect(hasAdminAccess(profile("doctor"))).toBe(false)
    expect(roleHasAnyCapability("doctor", ["admin"])).toBe(false)
    expect(getStaffDisplayRole(profile("doctor"))).toBe("Doctor")
  })

  it("does not grant patient capability to staff accounts", () => {
    expect(roleHasAnyCapability("admin", ["patient"])).toBe(false)
    expect(roleHasAnyCapability("doctor", ["patient"])).toBe(false)
    expect(getStaffDisplayRole(profile("patient"))).toBe("Patient")
  })
})
