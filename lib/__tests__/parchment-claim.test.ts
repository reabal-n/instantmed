import { describe, expect, it } from "vitest"

import {
  getParchmentPatientSyncEligibility,
  getParchmentPrescriberCandidateIds,
  getParchmentPrescribingEligibility,
  getParchmentScriptCompletionEligibility,
  isParchmentClaimSatisfied,
  PARCHMENT_PATIENT_SYNC_STATUSES,
  PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES,
  PARCHMENT_PRESCRIBING_STATUSES,
  PARCHMENT_SCRIPT_COMPLETION_STATUSES,
} from "@/lib/doctor/parchment-claim"

describe("isParchmentClaimSatisfied", () => {
  it("accepts the current doctor as the active claimed reviewer", () => {
    expect(isParchmentClaimSatisfied({
      claimed_by: "doctor-1",
      reviewing_doctor_id: null,
      reviewed_by: null,
    }, "doctor-1")).toBe(true)
  })

  it("accepts the current doctor as reviewer after status transition clears claimed_by", () => {
    expect(isParchmentClaimSatisfied({
      claimed_by: null,
      reviewing_doctor_id: null,
      reviewed_by: "doctor-1",
    }, "doctor-1")).toBe(true)
  })

  it("does not accept another doctor's claim or review", () => {
    expect(isParchmentClaimSatisfied({
      claimed_by: "doctor-2",
      reviewing_doctor_id: null,
      reviewed_by: "doctor-2",
    }, "doctor-1")).toBe(false)
  })
})

describe("getParchmentPrescriberCandidateIds", () => {
  it("returns candidate prescribers in intake ownership order without duplicates", () => {
    expect(getParchmentPrescriberCandidateIds({
      claimed_by: "doctor-1",
      reviewing_doctor_id: "doctor-1",
      reviewed_by: "doctor-2",
    })).toEqual(["doctor-1", "doctor-2"])
  })
})

describe("getParchmentPrescribingEligibility", () => {
  it("allows paid prescribing cases before and after the legacy awaiting-script state", () => {
    for (const status of PARCHMENT_PRESCRIBING_STATUSES) {
      expect(getParchmentPrescribingEligibility({
        category: "consult",
        payment_status: "paid",
        serviceType: "consult",
        status,
        subtype: "ed",
      })).toMatchObject({ eligible: true })
    }
  })

  it("blocks prescribing consults that are no longer active", () => {
    expect(getParchmentPrescribingEligibility({
      category: "consult",
      payment_status: "paid",
      serviceType: "consult",
      status: "completed",
      subtype: "ed",
    })).toMatchObject({
      eligible: false,
      error: "Parchment can only be opened for active prescribing cases under doctor review.",
    })
  })

  it("blocks non-prescribing services even if they are awaiting script", () => {
    expect(getParchmentPrescribingEligibility({
      category: "medical_certificate",
      payment_status: "paid",
      serviceType: "med_certs",
      status: "awaiting_script",
    })).toMatchObject({
      eligible: false,
      error: "Parchment is only available for prescribing cases.",
    })
  })
})

describe("getParchmentPatientSyncEligibility", () => {
  it("keeps prescribing consult subtypes explicit for Parchment recovery surfaces", () => {
    expect(PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES).toEqual(["ed", "hair_loss", "womens_health"])
  })

  it("keeps patient sync statuses aligned with active prescribing recovery states", () => {
    expect(PARCHMENT_PATIENT_SYNC_STATUSES).toEqual(["paid", "in_review", "pending_info", "approved", "awaiting_script"])
  })

  it("keeps prescribe-first statuses explicit for the Parchment handoff", () => {
    expect(PARCHMENT_PRESCRIBING_STATUSES).toEqual(["paid", "in_review", "awaiting_script"])
    expect(PARCHMENT_SCRIPT_COMPLETION_STATUSES).toEqual(["awaiting_script"])
  })

  it("allows active paid prescription requests to sync identity to Parchment", () => {
    expect(getParchmentPatientSyncEligibility({
      category: "prescription",
      payment_status: "paid",
      serviceType: "repeat_rx",
      status: "paid",
    })).toMatchObject({ eligible: true })
  })

  it("allows paid prescribing requests awaiting patient info to sync identity to Parchment", () => {
    expect(getParchmentPatientSyncEligibility({
      category: "prescription",
      payment_status: "paid",
      serviceType: "repeat_rx",
      status: "pending_info",
    })).toMatchObject({ eligible: true })
  })

  it("blocks non-prescribing requests from retrying Parchment patient sync", () => {
    expect(getParchmentPatientSyncEligibility({
      category: "medical_certificate",
      payment_status: "paid",
      serviceType: "med_certs",
      status: "paid",
    })).toMatchObject({
      eligible: false,
      error: "Parchment sync is only available for active paid prescribing requests.",
    })
  })
})

describe("getParchmentScriptCompletionEligibility", () => {
  it("allows only explicit prescribing-session requests to record script completion", () => {
    expect(getParchmentScriptCompletionEligibility({
      category: "prescription",
      payment_status: "paid",
      serviceType: "repeat_rx",
      status: "awaiting_script",
    })).toMatchObject({ eligible: true })

    expect(getParchmentScriptCompletionEligibility({
      category: "prescription",
      payment_status: "paid",
      serviceType: "repeat_rx",
      status: "in_review",
    })).toMatchObject({
      eligible: false,
      error: "Scripts can only be approved after Parchment prescribing for active paid prescribing requests.",
    })
  })

  it("blocks non-prescribing requests from being marked script sent", () => {
    expect(getParchmentScriptCompletionEligibility({
      category: "medical_certificate",
      payment_status: "paid",
      serviceType: "med_certs",
      status: "awaiting_script",
    })).toMatchObject({
      eligible: false,
      error: "Scripts can only be approved after Parchment prescribing for active paid prescribing requests.",
    })
  })

  it("blocks prescribing requests that are no longer active", () => {
    expect(getParchmentScriptCompletionEligibility({
      category: "prescription",
      payment_status: "paid",
      serviceType: "repeat_rx",
      status: "completed",
    })).toMatchObject({
      eligible: false,
      error: "Scripts can only be approved after Parchment prescribing for active paid prescribing requests.",
    })
  })
})
