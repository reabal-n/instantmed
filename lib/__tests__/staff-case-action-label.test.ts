import { describe, expect, it } from "vitest"

import { resolveStaffCaseActionLabel } from "@/lib/doctor/case-action-label"
import { SERVICE_TYPES } from "@/lib/doctor/service-types"

describe("resolveStaffCaseActionLabel", () => {
  it("keeps paid medical certificates pointed at the certificate decision", () => {
    expect(resolveStaffCaseActionLabel({ status: "paid" }, SERVICE_TYPES.MED_CERTS)).toBe("Approve certificate")
    expect(resolveStaffCaseActionLabel({ status: "in_review" }, SERVICE_TYPES.MED_CERTS)).toBe("Approve certificate")
  })

  it("keeps prescribing requests pointed at prescribing, including consult subtypes", () => {
    expect(resolveStaffCaseActionLabel({ status: "paid" }, SERVICE_TYPES.REPEAT_RX)).toBe("Prescribe")
    expect(resolveStaffCaseActionLabel({ status: "paid" }, SERVICE_TYPES.COMMON_SCRIPTS)).toBe("Prescribe")
    expect(resolveStaffCaseActionLabel({ status: "paid", subtype: "ed" }, SERVICE_TYPES.CONSULT)).toBe("Prescribe")
    expect(resolveStaffCaseActionLabel({ status: "paid", subtype: "hair_loss" }, SERVICE_TYPES.CONSULTS)).toBe("Prescribe")
  })

  it("does not turn non-prescribing consults into prescribing actions", () => {
    expect(resolveStaffCaseActionLabel({ status: "paid" }, SERVICE_TYPES.CONSULT)).toBe("Approve or decline")
    expect(resolveStaffCaseActionLabel({ status: "paid", subtype: "weight_loss" }, SERVICE_TYPES.CONSULT)).toBe("Approve or decline")
  })

  it("uses state-specific labels when the next action is not a clinical decision", () => {
    expect(resolveStaffCaseActionLabel({ status: "pending_info" }, SERVICE_TYPES.MED_CERTS)).toBe("Waiting on patient")
    expect(resolveStaffCaseActionLabel({ status: "awaiting_script" }, SERVICE_TYPES.REPEAT_RX)).toBe("Send script")
    expect(resolveStaffCaseActionLabel({ status: "approved" }, SERVICE_TYPES.MED_CERTS)).toBe("Check certificate delivery")
    expect(resolveStaffCaseActionLabel({ status: "declined" }, SERVICE_TYPES.MED_CERTS)).toBe("Declined")
  })
})
