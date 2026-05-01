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
