import { describe, expect, it, vi } from "vitest"

// isMedicationBlocked hits a DB-backed feature flag; force "not blocked" so the
// controlled-substance regex check (the behavior under test) is what decides.
vi.mock("@/lib/feature-flags", () => ({
  isMedicationBlocked: vi.fn(async () => ({ blocked: false })),
  SERVICE_DISABLED_ERRORS: { MEDICATION_BLOCKED: "MEDICATION_BLOCKED" },
}))

// Reached only after the controlled check passes; stub the side-effecting deps.
vi.mock("@/lib/analytics/posthog-server", () => ({
  trackSafetyBlock: vi.fn(),
  trackSafetyOutcome: vi.fn(),
}))
vi.mock("@/lib/safety/audit-log", () => ({
  recordSafetyEvaluationForOperators: vi.fn(async () => {}),
}))

import { runClinicalValidation } from "@/lib/stripe/checkout/clinical-validation"

function consultInput(consultDetails: string) {
  return {
    category: "consult",
    subtype: "general",
    type: "consult",
    serviceSlug: "consult",
    idempotencyKey: "idem-key-1234567890",
    answers: { consult_details: consultDetails },
  } as never
}

describe("consult checkout controlled-substance hard block (CLIN-1)", () => {
  it("blocks a consult requesting a Schedule 8 substance in consult_details", async () => {
    const result = await runClinicalValidation(consultInput("Can I get a script for diazepam please"))

    expect(result.ok).toBe(false)
    expect("error" in result ? result.error : "").toMatch(/controlled substance/i)
  })

  it("does not controlled-block a benign consult request", async () => {
    const result = await runClinicalValidation(consultInput("I have a mild skin rash and want advice"))

    // It may still fail later safety/field checks, but NOT for controlled substances.
    if (!result.ok) {
      expect(result.error).not.toMatch(/controlled substance/i)
    }
  })
})
