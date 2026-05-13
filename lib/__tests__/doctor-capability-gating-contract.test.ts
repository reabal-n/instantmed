import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  describeServiceCapability,
  doctorCanReviewService,
  doctorHasCapability,
  requiredCapabilityForService,
} from "@/lib/auth/staff-capabilities"
import type { Profile } from "@/types/db"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

function build(overrides: Partial<Profile> & { role: Profile["role"] }): Profile {
  return overrides as Profile
}

describe("doctor capability gating contract", () => {
  it("maps each service type + subtype to the right capability flag", () => {
    expect(requiredCapabilityForService("med_certs", null)).toBe("review_med_certs")
    expect(requiredCapabilityForService("common_scripts", null)).toBe("review_repeat_rx")
    expect(requiredCapabilityForService("prescription", null)).toBe("review_repeat_rx")
    expect(requiredCapabilityForService("repeat_script", null)).toBe("review_repeat_rx")
    expect(requiredCapabilityForService("consult", null)).toBe("review_consults")
    expect(requiredCapabilityForService("consult", "ed")).toBe("review_ed")
    expect(requiredCapabilityForService("consult", "hair_loss")).toBe("review_hair_loss")
    // Unknown service: fall open (returns null) so legacy / not-yet-mapped
    // pathways are not accidentally blocked.
    expect(requiredCapabilityForService("something_new", null)).toBeNull()
    expect(requiredCapabilityForService(null, null)).toBeNull()
  })

  it("admin (owner-operator) always has all clinical capabilities regardless of doctor flags", () => {
    const admin = build({
      role: "admin",
      can_review_med_certs: false,
      can_review_repeat_rx: false,
      can_review_consults: false,
      can_review_ed: false,
      can_review_hair_loss: false,
      can_prescribe_s4: false,
      can_prescribe_s8: false,
    })
    expect(doctorHasCapability(admin, "review_med_certs")).toBe(true)
    expect(doctorHasCapability(admin, "review_repeat_rx")).toBe(true)
    expect(doctorHasCapability(admin, "review_consults")).toBe(true)
    expect(doctorHasCapability(admin, "review_ed")).toBe(true)
    expect(doctorHasCapability(admin, "review_hair_loss")).toBe(true)
    expect(doctorHasCapability(admin, "prescribe_s4")).toBe(true)
    expect(doctorHasCapability(admin, "prescribe_s8")).toBe(true)
    expect(doctorCanReviewService(admin, "consult", "ed")).toBe(true)
    expect(doctorCanReviewService(admin, "common_scripts", null)).toBe(true)
  })

  it("doctor with explicit false on a flag fails the gate for that service", () => {
    const doctor = build({ role: "doctor", can_review_ed: false })
    expect(doctorHasCapability(doctor, "review_ed")).toBe(false)
    expect(doctorCanReviewService(doctor, "consult", "ed")).toBe(false)
    // Other services still pass.
    expect(doctorCanReviewService(doctor, "consult", "hair_loss")).toBe(true)
    expect(doctorCanReviewService(doctor, "med_certs", null)).toBe(true)
  })

  it("blocks doctors without repeat-rx capability from common-scripts cases", () => {
    const doctor = build({ role: "doctor", can_review_repeat_rx: false })
    expect(doctorCanReviewService(doctor, "common_scripts", null)).toBe(false)
  })

  it("patient and support roles never hold clinical capabilities", () => {
    const patient = build({ role: "patient" })
    const support = build({ role: "support" })
    expect(doctorHasCapability(patient, "review_med_certs")).toBe(false)
    expect(doctorHasCapability(support, "review_med_certs")).toBe(false)
    expect(doctorCanReviewService(patient, "med_certs", null)).toBe(false)
    expect(doctorCanReviewService(support, "med_certs", null)).toBe(false)
  })

  it("describes the gated capability in human-readable form for error messages", () => {
    expect(describeServiceCapability("med_certs", null)).toBe("medical certificates")
    expect(describeServiceCapability("repeat_script", null)).toBe("repeat prescriptions")
    expect(describeServiceCapability("consult", "ed")).toBe("ED consults")
    expect(describeServiceCapability("consult", "hair_loss")).toBe("hair loss consults")
    expect(describeServiceCapability("consult", null)).toBe("consults")
    expect(describeServiceCapability(null, null)).toBe("this service")
  })

  it("wires the capability gate into approveAndSendCert (med cert approval)", () => {
    const source = read("app/actions/approve-cert.ts")
    expect(source).toContain('doctorHasCapability(doctorProfile, "review_med_certs")')
    expect(source).toContain("not configured to review medical certificates")
  })

  it("wires the capability gate into updateStatusAction (consult / repeat-rx approval + awaiting_script)", () => {
    const source = read("app/doctor/queue/actions.ts")
    expect(source).toContain("doctorCanReviewService(profile, serviceType, subtype)")
    expect(source).toContain('"DOCTOR_CAPABILITY_DENIED"')
    // Gate must run on both approved AND awaiting_script transitions because
    // moving to awaiting_script also commits the clinical decision.
    expect(source).toContain('status === "approved" || status === "awaiting_script"')
  })

  it("wires the capability gate into declineIntakeAction", () => {
    const source = read("app/doctor/queue/actions.ts")
    // The declineIntakeAction path must check capability BEFORE delegating to
    // the canonical decline pipeline; otherwise a wrong-line doctor could
    // still trigger refund + email.
    const decline = source.slice(source.indexOf("export async function declineIntakeAction"))
    expect(decline).toContain("doctorCanReviewService(profile, serviceType, subtype)")
    expect(decline).toContain("declineIntakeCanonical")
    // Order: capability check first, canonical call second.
    expect(decline.indexOf("doctorCanReviewService")).toBeLessThan(
      decline.indexOf("declineIntakeCanonical("),
    )
  })

  it("keeps owner-admin clinical actions on doctor capability helpers, not raw role checks", () => {
    const dateCorrectionSource = read("app/actions/request-date-correction.ts")
    const manualPatientSource = read("app/actions/manual-patient.ts")
    const doctorIdentitySource = read("app/actions/doctor-identity.ts")
    const searchRouteSource = read("app/api/search/route.ts")
    const scriptsRouteSource = read("app/api/doctor/scripts/route.ts")
    const scriptUpdateRouteSource = read("app/api/doctor/scripts/[id]/route.ts")
    const draftApprovalSource = read("app/actions/draft-approval.ts")
    const certificateDownloadSource = read("app/api/certificates/[id]/download/route.ts")

    expect(dateCorrectionSource).toContain("hasDoctorAccess(authResult.profile)")
    expect(dateCorrectionSource).not.toContain('authResult.profile.role !== "doctor"')

    expect(manualPatientSource).toContain("prescriberProfileId: authResult.profile.id")
    expect(manualPatientSource).not.toContain('authResult.profile.role === "doctor" ? authResult.profile.id : null')

    expect(doctorIdentitySource).toContain("hasDoctorAccess(authUser.profile)")
    expect(doctorIdentitySource).not.toContain('authUser.profile.role !== "doctor"')

    expect(searchRouteSource).toContain("hasDoctorAccess(callerProfile)")
    expect(existsSync(join(root, "app/api/doctor/assign-request/route.ts"))).toBe(false)

    expect(scriptsRouteSource).toContain("hasAdminAccess(authResult.profile)")
    expect(scriptUpdateRouteSource).toContain("hasAdminAccess(profile)")
    expect(draftApprovalSource).toContain("hasAdminAccess(auth.profile)")
    expect(certificateDownloadSource).toContain("hasDoctorAccess(profile)")
    expect(certificateDownloadSource).toContain("hasAdminAccess(profile)")
  })
})
