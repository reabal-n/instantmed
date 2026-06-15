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
