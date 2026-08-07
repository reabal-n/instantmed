/**
 * Access-affecting checkout refusals must leave a durable, attributable
 * receipt. A `requiresConsult` refusal from `validateRepeatScriptPayload`
 * (new medicine, changed regimen, dedicated-service medicine) denies access
 * to care at the pay step — clinical policy requires that decision to be
 * reconstructable afterwards, which means the operator receipt is recorded
 * BEFORE the refusal is returned and carries a correlation handle.
 *
 * No intake row exists at this point, so `flowInstanceId` is the only
 * privacy-safe identifier available — without it every refusal shares one
 * generic session id and cannot be told apart.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const receiptCalls: Array<Record<string, unknown>> = []

vi.mock("@/lib/safety/audit-log", () => ({
  recordSafetyEvaluationForOperators: vi.fn(async (input: Record<string, unknown>) => {
    receiptCalls.push(input)
  }),
}))
vi.mock("@/lib/analytics/posthog-server", () => ({
  trackSafetyBlock: vi.fn(),
  trackSafetyOutcome: vi.fn(),
}))
vi.mock("@/lib/feature-flags", () => ({
  isMedicationBlocked: vi.fn(async () => ({ blocked: false })),
  SERVICE_DISABLED_ERRORS: { MEDICATION_BLOCKED: "MEDICATION_BLOCKED" },
}))
vi.mock("@/lib/safety/evaluate", () => ({
  validateSafetyFieldsPresent: vi.fn(() => ({ valid: true, missingFields: [] })),
  checkSafetyForServer: vi.fn(() => ({
    isAllowed: true,
    outcome: "ALLOW",
    riskTier: "low",
    blockReason: null,
    requiresCall: false,
    triggeredRuleIds: [],
  })),
}))

import { runClinicalValidation } from "@/lib/stripe/checkout/clinical-validation"
import type { CreateCheckoutInput } from "@/lib/stripe/checkout/types"

function repeatCheckoutInput(overrides: Partial<CreateCheckoutInput> = {}): CreateCheckoutInput {
  return {
    category: "prescription",
    subtype: "repeat",
    serviceSlug: "repeat-script",
    flowInstanceId: "flow_receipt_test_1",
    answers: {
      pbs_code: "MANUAL",
      medication_name: "Sildenafil",
      medication_display: "Sildenafil",
      medication_strength: "100 mg",
      medication_form: "tablet",
      prescribed_before: true,
      doseChanged: false,
      dose_changed: false,
      hasSideEffects: false,
      last_prescribed: "6_to_12_months",
      current_dose: "as needed",
      indication: "ED",
    },
    ...overrides,
  } as CreateCheckoutInput
}

describe("checkout refusal receipts", () => {
  beforeEach(() => {
    receiptCalls.length = 0
  })

  it("records an attributable operator receipt before refusing a hard-routed repeat", async () => {
    const result = await runClinicalValidation(repeatCheckoutInput())

    // The refusal itself.
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("unreachable")
    expect(result.error).toMatch(/erectile dysfunction/i)

    // The receipt was recorded (i.e. awaited) before the refusal returned…
    expect(receiptCalls).toHaveLength(1)
    const receipt = receiptCalls[0]
    // …identifies the attempt via the flow instance (no intake exists yet)…
    expect(receipt.requestId).toBe("flow_receipt_test_1")
    // …and captures the decision shape for reconstruction.
    expect(receipt.context).toBe("checkout")
    expect(receipt.result).toMatchObject({
      isAllowed: false,
      outcome: "DECLINE",
      triggeredRuleIds: ["repeat_script_requires_consult"],
    })
  })

  it("does not write a refusal receipt when the repeat passes", async () => {
    const result = await runClinicalValidation(repeatCheckoutInput({
      answers: {
        pbs_code: "MANUAL",
        medication_name: "Atorvastatin",
        medication_display: "Atorvastatin",
        medication_strength: "20 mg",
        medication_form: "tablet",
        prescribed_before: true,
        doseChanged: false,
        dose_changed: false,
        hasSideEffects: false,
        last_prescribed: "6_to_12_months",
        current_dose: "once daily",
        indication: "cholesterol, I also have erectile dysfunction",
      },
    }))

    expect(result.ok).toBe(true)
    expect(receiptCalls).toHaveLength(0)
  })
})
