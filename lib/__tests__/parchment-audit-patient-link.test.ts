import { describe, expect, it } from "vitest"

import { getParchmentAuditPatientId } from "@/lib/parchment/audit-patient-link"

describe("Parchment audit patient links", () => {
  const current = "11111111-1111-4111-8111-111111111111"
  const old = "22222222-2222-4222-8222-222222222222"
  it("uses the current canonical patient despite a redacted legacy field", () => {
    expect(getParchmentAuditPatientId({ patient_id: current, patient_profile_id: "[REDACTED]", partner_patient_id: old })).toBe(current)
  })
  it("rejects redaction markers and invalid link destinations", () => {
    expect(getParchmentAuditPatientId({ patient_profile_id: "[REDACTED]", patient_id: "not-a-profile" })).toBeNull()
  })
})
