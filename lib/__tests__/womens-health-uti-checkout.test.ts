import { describe, expect, it, vi } from "vitest"

/**
 * Production-readiness proof for the UTI checkout clinical path.
 *
 * Runs the REAL runClinicalValidation (real validateSafetyFieldsPresent + real
 * checkSafetyForServer) so the UTI safety wiring is exercised end-to-end on the
 * shared authed/guest checkout path. Only the DB/analytics collaborators are
 * mocked.
 */

vi.mock("@/lib/feature-flags", () => ({
  isMedicationBlocked: vi.fn(async () => ({ blocked: false })),
  SERVICE_DISABLED_ERRORS: { MEDICATION_BLOCKED: "MEDICATION_BLOCKED" },
}))
vi.mock("@/lib/analytics/posthog-server", () => ({
  trackSafetyBlock: vi.fn(),
  trackSafetyOutcome: vi.fn(),
}))
vi.mock("@/lib/safety/audit-log", () => ({
  recordSafetyEvaluationForOperators: vi.fn(async () => {}),
}))

import { runClinicalValidation } from "@/lib/stripe/checkout/clinical-validation"

function utiInput(overrides: Record<string, unknown> = {}) {
  return {
    category: "consult",
    subtype: "womens_health",
    serviceSlug: "consult",
    answers: {
      consultSubtype: "womens_health",
      womensHealthOption: "uti",
      utiSymptoms: ["burning"],
      utiRedFlags: "no",
      utiPregnant: "no",
      emergency_symptoms: [],
      ...overrides,
    },
  } as never
}

describe("UTI checkout clinical path", () => {
  it("allows a clean uncomplicated UTI through to payment", async () => {
    const result = await runClinicalValidation(utiInput())
    expect(result.ok).toBe(true)
  })

  it("declines a UTI with red flags before payment", async () => {
    const result = await runClinicalValidation(utiInput({ utiRedFlags: "yes" }))
    expect(result.ok).toBe(false)
  })

  it("declines a UTI when pregnant or possibly pregnant", async () => {
    expect((await runClinicalValidation(utiInput({ utiPregnant: "yes" }))).ok).toBe(false)
    expect((await runClinicalValidation(utiInput({ utiPregnant: "not_sure" }))).ok).toBe(false)
  })

  it("blocks checkout when the UTI safety fields are missing (crafted payload)", async () => {
    const result = await runClinicalValidation(utiInput({ utiRedFlags: undefined, utiPregnant: undefined }))
    expect(result.ok).toBe(false)
  })
})

function ocpInput(overrides: Record<string, unknown> = {}) {
  return {
    category: "consult",
    subtype: "womens_health",
    serviceSlug: "consult",
    answers: {
      consultSubtype: "womens_health",
      womensHealthOption: "ocp_new",
      contraceptionType: "start",
      pregnancyStatus: "no",
      womens_migraine_aura: "no",
      womens_blood_clot_history: "no",
      womens_smoker: "no",
      emergency_symptoms: [],
      ...overrides,
    },
  } as never
}

describe("OCP (new/switch pill) checkout clinical path", () => {
  it("allows a clean, contraindication-free new-pill request through to payment", async () => {
    const result = await runClinicalValidation(ocpInput())
    expect(result.ok).toBe(true)
  })

  it("blocks a confirmed-pregnant new-pill request before payment", async () => {
    const result = await runClinicalValidation(ocpInput({ pregnancyStatus: "yes" }))
    expect(result.ok).toBe(false)
  })

  it("blocks a possibly-pregnant new-pill request before payment", async () => {
    const result = await runClinicalValidation(ocpInput({ pregnancyStatus: "not_sure" }))
    expect(result.ok).toBe(false)
  })

  it("routes combined-pill contraindications (migraine-aura / clot / smoker) to a call before payment", async () => {
    for (const field of ["womens_migraine_aura", "womens_blood_clot_history", "womens_smoker"]) {
      const result = await runClinicalValidation(ocpInput({ [field]: "yes" }))
      expect(result.ok, field).toBe(false)
    }
  })

  it("blocks checkout when the OCP safety fields are missing (crafted payload)", async () => {
    const result = await runClinicalValidation(
      ocpInput({ pregnancyStatus: undefined, womens_migraine_aura: undefined }),
    )
    expect(result.ok).toBe(false)
  })
})
