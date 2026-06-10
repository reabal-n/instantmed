import { describe, expect, it, vi } from "vitest"

// Stub the DB-backed + side-effecting deps so the high-stakes branch
// (the behavior under test) is what decides.
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

import { recordSafetyEvaluationForOperators } from "@/lib/safety/audit-log"
import { runClinicalValidation } from "@/lib/stripe/checkout/clinical-validation"

/** A med-cert payload that passes validateMedCertPayload, so the
 *  high-stakes check is the next gate reached. */
function medCertInput(symptomText: string, extra: Record<string, unknown> = {}) {
  return {
    category: "medical_certificate",
    subtype: "1_day",
    type: "med_cert",
    serviceSlug: "med-certs",
    idempotencyKey: "idem-key-1234567890",
    answers: {
      certificate_type: "work",
      duration: "1",
      symptoms_description: symptomText,
      symptom_duration: "today",
      start_date: new Date().toISOString().slice(0, 10),
      telehealth_consent_given: true,
      accuracy_confirmed: true,
      terms_agreed: true,
      ...extra,
    },
  } as never
}

describe("med-cert checkout high-stakes server block (B4)", () => {
  it("blocks an exam-deferral request before payment", async () => {
    const result = await runClinicalValidation(
      medCertInput("I have a migraine and need to defer my exam tomorrow"),
    )

    expect(result.ok).toBe(false)
    const error = "error" in result ? result.error : ""
    expect(error).toMatch(/not been charged/i)
    expect(recordSafetyEvaluationForOperators).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({ triggeredRuleIds: ["high_stakes_use_case"] }),
      }),
    )
  })

  it("blocks a fitness-to-drive request before payment", async () => {
    const result = await runClinicalValidation(
      medCertInput("feeling dizzy, work needs a certificate saying I am fit to drive the forklift"),
    )

    expect(result.ok).toBe(false)
    expect("error" in result ? result.error : "").toMatch(/not been charged/i)
  })

  it("catches high-stakes text in additional-info fields, not just symptoms", async () => {
    const result = await runClinicalValidation(
      medCertInput("bad flu, fever and aches", {
        additional_info: "this is for my workers compensation claim",
      }),
    )

    expect(result.ok).toBe(false)
    expect("error" in result ? result.error : "").toMatch(/not been charged/i)
  })

  it("does not high-stakes-block an ordinary sick-day request", async () => {
    const result = await runClinicalValidation(
      medCertInput("gastro since last night, cramps and vomiting, need a day off work"),
    )

    // It may still fail later safety/field checks, but NOT as high-stakes.
    if (!result.ok) {
      expect(result.error).not.toMatch(/not been charged/i)
    }
  })

  it("does not false-positive on words containing high-stakes substrings (word-boundary)", async () => {
    const result = await runClinicalValidation(
      medCertInput("examined myself for a rash this morning, very itchy and spreading"),
    )

    if (!result.ok) {
      expect(result.error).not.toMatch(/not been charged/i)
    }
  })
})
