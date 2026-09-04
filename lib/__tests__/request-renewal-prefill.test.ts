import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildFlowProfilePrefill,
  buildHealthProfilePrefillAnswers,
  buildPrescriptionRenewalPrefillAnswers,
  canApplyPrescriptionRenewalPrefill,
  canApplySavedHealthProfilePrefill,
} from "@/components/request/request-flow"
import {
  normalizePrescriptionHistory,
  PRESCRIPTION_HISTORY_LABELS,
} from "@/lib/clinical/prescription-history"

describe("request prefill", () => {
  it.each([
    ["within_3mo", "within_12_months", "Within 3 months"],
    ["3_6mo", "within_12_months", "3–6 months"],
    ["6_12mo", "within_12_months", "6–12 months"],
    ["over_1yr", "over_12_months", "Over a year"],
  ] as const)(
    "normalizes persisted %s for selection while preserving its historical label",
    (storedValue, selectedValue, label) => {
      expect(normalizePrescriptionHistory(storedValue)).toBe(selectedValue)
      expect(PRESCRIPTION_HISTORY_LABELS[storedValue]).toBe(label)
    },
  )

  it("reuses saved conditions while requiring explicit allergy/reaction and other-medicine answers", () => {
    expect(buildHealthProfilePrefillAnswers({
      allergies: ["Penicillin"],
      conditions: ["Asthma"],
      current_medications: ["Salbutamol"],
    })).toEqual({
      allergies: "Penicillin",
      hasConditions: true,
      conditions: "Asthma",
      healthProfilePrefilled: true,
    })
  })

  it("does not infer negative medical history from empty saved arrays", () => {
    expect(buildHealthProfilePrefillAnswers({
      allergies: [],
      conditions: [],
      current_medications: [],
    })).toEqual({})
  })

  it("keeps saved health history out of restored draft and recovery state", () => {
    expect(canApplySavedHealthProfilePrefill({
      hydrated: true,
      hasExplicitRecovery: false,
      hasMedicalHistoryStep: true,
      lastSavedAt: null,
    })).toBe(true)
    expect(canApplySavedHealthProfilePrefill({
      hydrated: true,
      hasExplicitRecovery: false,
      hasMedicalHistoryStep: true,
      lastSavedAt: "2026-09-04T01:00:00.000Z",
    })).toBe(false)
    expect(canApplySavedHealthProfilePrefill({
      hydrated: true,
      hasExplicitRecovery: true,
      hasMedicalHistoryStep: true,
      lastSavedAt: null,
    })).toBe(false)
    expect(canApplySavedHealthProfilePrefill({
      hydrated: true,
      hasExplicitRecovery: false,
      hasMedicalHistoryStep: false,
      lastSavedAt: null,
    })).toBe(false)
  })

  it("keeps saved health answers out of flows that do not render medical history", () => {
    const accountPrefill = {
      identity: { email: "patient@example.com" },
      answers: { medicareNumber: "2423456711" },
    }
    const savedHealth = {
      allergies: "Peanuts",
      hasConditions: true,
      conditions: "Asthma",
      healthProfilePrefilled: true,
    }

    expect(buildFlowProfilePrefill(accountPrefill, savedHealth, false)).toEqual(accountPrefill)
    expect(buildFlowProfilePrefill(accountPrefill, savedHealth, true)).toEqual({
      identity: accountPrefill.identity,
      answers: { ...accountPrefill.answers, ...savedHealth },
    })
  })

  it("prefills only medication, directions, and history derived from issued date", () => {
    const answers = buildPrescriptionRenewalPrefillAnswers({
      medicationName: "Atorvastatin",
      medicationStrength: "20 mg",
      dosageInstructions: "Take one tablet at night",
      issuedDate: "2026-07-10",
    }, new Date("2026-09-04T00:00:00.000Z"))

    expect(answers).toEqual({
      medications: [{ name: "Atorvastatin", strength: "20 mg", pbsCode: "MANUAL" }],
      medicationName: "Atorvastatin",
      medicationStrength: "20 mg",
      pbsCode: "MANUAL",
      currentDose: "Take one tablet at night",
      dosageInstructions: "Take one tablet at night",
      prescriptionHistory: "within_12_months",
      renewalPrefilled: true,
    })
    expect(answers).not.toHaveProperty("doseChanged")
    expect(answers).not.toHaveProperty("hasSideEffects")
    expect(answers).not.toHaveProperty("sideEffects")
    expect(answers).not.toHaveProperty("indication")
    expect(answers).not.toHaveProperty("approved")
  })

  it("leaves inline strength in the name for MedicationStep to infer without duplicating it", () => {
    expect(buildPrescriptionRenewalPrefillAnswers({
      medicationName: "Sertraline 100 mg",
      medicationStrength: null,
      dosageInstructions: null,
      issuedDate: "2025-08-01",
    }, new Date("2026-09-04T00:00:00.000Z"))).toEqual({
      medications: [{ name: "Sertraline 100 mg", pbsCode: "MANUAL" }],
      medicationName: "Sertraline 100 mg",
      pbsCode: "MANUAL",
      prescriptionHistory: "over_12_months",
      renewalPrefilled: true,
    })

    expect(buildPrescriptionRenewalPrefillAnswers({
      medicationName: "Sertraline unknown strength",
      medicationStrength: null,
      dosageInstructions: null,
      issuedDate: "not-a-date",
    })).toEqual({
      medications: [{ name: "Sertraline unknown strength", pbsCode: "MANUAL" }],
      medicationName: "Sertraline unknown strength",
      pbsCode: "MANUAL",
      renewalPrefilled: true,
    })
  })

  it("keeps the exact 12-month anniversary within the current recency bucket", () => {
    const seed = {
      medicationName: "Sertraline",
      medicationStrength: null,
      dosageInstructions: null,
    }

    expect(buildPrescriptionRenewalPrefillAnswers({
      ...seed,
      issuedDate: "2025-09-04",
    }, new Date("2026-09-04T00:00:00.000Z"))).toMatchObject({
      prescriptionHistory: "within_12_months",
    })
    expect(buildPrescriptionRenewalPrefillAnswers({
      ...seed,
      issuedDate: "2025-09-03",
    }, new Date("2026-09-04T00:00:00.000Z"))).toMatchObject({
      prescriptionHistory: "over_12_months",
    })
  })

  it("does not mark a history-only seed as a visible renewal prefill", () => {
    const answers = buildPrescriptionRenewalPrefillAnswers({
      medicationName: " ",
      medicationStrength: null,
      dosageInstructions: null,
      issuedDate: "2026-08-01",
    }, new Date("2026-09-04T00:00:00.000Z"))

    expect(answers).toEqual({ prescriptionHistory: "within_12_months" })
    expect(answers).not.toHaveProperty("renewalPrefilled")
  })

  it("applies renewal facts only to an authenticated blank repeat flow", () => {
    const fresh = {
      hydrated: true,
      hasRenewalPrefill: true,
      hasExplicitRecovery: false,
      alreadyApplied: false,
      isAuthenticated: true,
      initialService: "repeat-script" as const,
      serviceType: "repeat-script" as const,
      lastSavedAt: null,
    }

    expect(canApplyPrescriptionRenewalPrefill(fresh)).toBe(true)
    expect(canApplyPrescriptionRenewalPrefill({
      ...fresh,
      lastSavedAt: "2026-09-04T01:00:00.000Z",
    })).toBe(false)
    expect(canApplyPrescriptionRenewalPrefill({
      ...fresh,
      hasExplicitRecovery: true,
    })).toBe(false)
    expect(canApplyPrescriptionRenewalPrefill({
      ...fresh,
      isAuthenticated: false,
    })).toBe(false)
    expect(canApplyPrescriptionRenewalPrefill({
      ...fresh,
      hasRenewalPrefill: false,
    })).toBe(false)
  })

  it("loads prefill data on the server under authenticated patient ownership", () => {
    const source = readFileSync(join(process.cwd(), "app/request/page.tsx"), "utf8")

    expect(source).toContain('profile.role === "patient"')
    expect(source).toContain("getHealthProfile(profile.id)")
    expect(source).toContain("isValidPrescriptionId(params.renewal)")
    expect(source).toContain('.eq("patient_id", profile.id)')
    expect(source).toContain('.eq("id", params.renewal)')
    expect(source).toContain("healthProfile={healthProfile}")
    expect(source).toContain("renewalPrefill={renewalPrefill}")
  })
})
