import { describe, expect, it } from "vitest"

import { getDoctorOnboardingState } from "@/lib/doctor/onboarding-state"
import type { Profile } from "@/types/db"

function profile(overrides: Partial<Profile> = {}): Pick<Profile, "auth_user_id" | "role"> & Partial<Profile> {
  return {
    auth_user_id: "auth-1",
    role: "doctor",
    provider_number: "123456",
    ahpra_number: "MED0000000001",
    signature_storage_path: "signatures/doctor.png",
    parchment_user_id: "parchment-user-1",
    ...overrides,
  }
}

describe("doctor onboarding state", () => {
  it("keeps invited doctors out of active state until auth is linked", () => {
    expect(getDoctorOnboardingState(profile({ auth_user_id: null }))).toBe("invited")
  })

  it("requires identity before capability activation", () => {
    expect(getDoctorOnboardingState(profile({ provider_number: null }))).toBe("identity_pending")
    expect(getDoctorOnboardingState(profile({ ahpra_number: null }))).toBe("identity_pending")
    expect(getDoctorOnboardingState(profile({ signature_storage_path: null }))).toBe("identity_pending")
    expect(getDoctorOnboardingState(profile({ parchment_user_id: null }))).toBe("identity_pending")
  })

  it("allows non-prescribing doctors without a Parchment user id when prescribing is disabled", () => {
    expect(getDoctorOnboardingState(profile({
      can_prescribe_s4: false,
      can_prescribe_s8: false,
      parchment_user_id: null,
    }))).toBe("active")
  })

  it("marks fully identified doctors with no service capabilities as capability pending", () => {
    expect(getDoctorOnboardingState(profile({
      can_review_med_certs: false,
      can_review_repeat_rx: false,
      can_review_consults: false,
      can_review_ed: false,
      can_review_hair_loss: false,
      can_prescribe_s4: false,
      can_prescribe_s8: false,
    }))).toBe("capability_pending")
  })

  it("treats the owner admin as a doctor once identity is complete", () => {
    expect(getDoctorOnboardingState(profile({
      role: "admin",
      can_review_med_certs: false,
      can_prescribe_s4: false,
    }))).toBe("active")
  })
})
