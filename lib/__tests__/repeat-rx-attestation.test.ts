import { describe, expect, it } from "vitest"

import {
  getRepeatRxAttestationStatus,
  getRepeatRxPrescribingBlocker,
  hasLegacyRepeatRxReconciliationNote,
  isRepeatRxIntake,
  LEGACY_REPEAT_RX_RECONCILIATION_NOTE,
} from "@/lib/clinical/repeat-rx-attestation"

describe("repeat-Rx regimen attestation", () => {
  it("recognizes repeat-Rx from either category or canonical service type", () => {
    expect(isRepeatRxIntake({ category: "prescription" })).toBe(true)
    expect(isRepeatRxIntake({ serviceType: "common_scripts" })).toBe(true)
    expect(isRepeatRxIntake({ category: "consult", serviceType: "consult" })).toBe(false)
  })

  it("requires the explicit recorded-script reconciliation note", () => {
    expect(hasLegacyRepeatRxReconciliationNote(LEGACY_REPEAT_RX_RECONCILIATION_NOTE)).toBe(true)
    expect(hasLegacyRepeatRxReconciliationNote("Script sent")).toBe(false)
    expect(LEGACY_REPEAT_RX_RECONCILIATION_NOTE).not.toMatch(/before .*rule|cutover/i)
  })

  it("accepts only the raw patient answer as an unchanged-regimen confirmation", () => {
    expect(getRepeatRxAttestationStatus({ doseChanged: false })).toBe("confirmed_unchanged")
  })

  it("treats a historical canonical false without the raw answer as missing", () => {
    expect(getRepeatRxAttestationStatus({ dose_changed: false })).toBe("missing")
  })

  it("distinguishes a reported regimen change from a missing answer", () => {
    expect(getRepeatRxAttestationStatus({ doseChanged: true, dose_changed: false })).toBe("changed")
    expect(getRepeatRxAttestationStatus({})).toBe("missing")
    expect(getRepeatRxAttestationStatus({ doseChanged: "false" })).toBe("missing")
  })

  it("returns a fail-closed prescribing blocker unless the raw answer is false", () => {
    expect(getRepeatRxPrescribingBlocker({ doseChanged: false })).toBeNull()
    expect(getRepeatRxPrescribingBlocker({ doseChanged: true })).toMatchObject({
      code: "REPEAT_RX_REGIMEN_CHANGED",
    })
    expect(getRepeatRxPrescribingBlocker({ dose_changed: false })).toMatchObject({
      code: "REPEAT_RX_REGIMEN_CONFIRMATION_REQUIRED",
      error: expect.stringMatching(/decline.*refund.*new repeat request/i),
    })
  })
})
