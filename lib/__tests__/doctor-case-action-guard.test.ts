import { describe, expect, it } from "vitest"

import {
  canMutateDoctorCase,
  getDoctorCaseActionError,
} from "@/lib/doctor/case-action-guard"

describe("doctor case action guard", () => {
  it("allows admins to preserve the existing operator override path", () => {
    expect(getDoctorCaseActionError({
      actorId: "admin-1",
      actorRole: "admin",
      claimed_by: "doctor-1",
      reviewing_doctor_id: "doctor-1",
      reviewed_by: null,
    })).toBeNull()
  })

  it("allows the doctor holding the active claim to mutate the case", () => {
    expect(canMutateDoctorCase({
      actorId: "doctor-1",
      actorRole: "doctor",
      claimed_by: "doctor-1",
      reviewing_doctor_id: null,
      reviewed_by: null,
    })).toBe(true)
  })

  it("allows the doctor holding the review lock to mutate the case", () => {
    expect(canMutateDoctorCase({
      actorId: "doctor-1",
      actorRole: "doctor",
      claimed_by: null,
      reviewing_doctor_id: "doctor-1",
      reviewed_by: null,
    })).toBe(true)
  })

  it("blocks doctors without the active claim or lock", () => {
    expect(getDoctorCaseActionError({
      actorId: "doctor-1",
      actorRole: "doctor",
      claimed_by: "doctor-2",
      reviewing_doctor_id: "doctor-2",
      reviewed_by: null,
    })).toBe("This case is claimed by another doctor. Refresh the queue before taking action.")
  })

  it("blocks unclaimed doctor actions instead of relying on UI-only locking", () => {
    expect(getDoctorCaseActionError({
      actorId: "doctor-1",
      actorRole: "doctor",
      claimed_by: null,
      reviewing_doctor_id: null,
      reviewed_by: null,
    })).toBe("Claim this case before taking action.")
  })
})

 describe("server clinical review access projection", () => {
  it("requires both ownership and the service capability, with the existing admin override", async () => {
    const { getClinicalReviewActionAccess } = await import("@/lib/doctor/case-action-guard")
    const intake = { claimed_by: "doctor-1", service: { type: "repeat_rx" }, subtype: null }
    expect(getClinicalReviewActionAccess({ id: "doctor-1", role: "doctor" }, intake)).toEqual({ allowed: true, reason: null, canReviewService: true })
    expect(getClinicalReviewActionAccess({ id: "doctor-2", role: "doctor" }, intake)).toEqual({ allowed: false, reason: expect.stringContaining("another doctor"), canReviewService: true })
    expect(getClinicalReviewActionAccess({ id: "doctor-1", role: "doctor", can_review_repeat_rx: false }, intake)).toEqual({ allowed: false, reason: expect.stringContaining("not authorised"), canReviewService: false })
    expect(getClinicalReviewActionAccess({ id: "admin", role: "admin", can_review_repeat_rx: false }, intake)).toEqual({ allowed: true, reason: null, canReviewService: true })
    expect(getClinicalReviewActionAccess({ id: "doctor-1", role: "doctor" }, { ...intake, claimed_by: null })).toEqual({ allowed: false, reason: expect.stringContaining("Claim this case"), canReviewService: true })
  })
})
