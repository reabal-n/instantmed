import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  logger: {
    error: vi.fn(),
  },
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { recordSafetyEvaluationForOperators } from "@/lib/safety/audit-log"

describe("recordSafetyEvaluationForOperators", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("persists a sanitized safety outcome without storing the full answers payload", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn(() => ({ insert })),
    })

    await recordSafetyEvaluationForOperators({
      answers: {
        patientName: "Jane Citizen",
        emergency_symptoms: ["chest_pain"],
        medication_name: "Atorvastatin",
      },
      context: "checkout",
      requestId: "00000000-0000-4000-8000-000000000001",
      result: {
        isAllowed: false,
        outcome: "DECLINE",
        riskTier: "critical",
        blockReason: "Chest pain requires emergency care.",
        requiresCall: false,
        triggeredRuleIds: ["emergency_chest_pain"],
      },
      serviceSlug: "medical-certificate",
    })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      answers_snapshot: {},
      request_id: "00000000-0000-4000-8000-000000000001",
      service_slug: "medical-certificate",
      outcome: "DECLINE",
      risk_tier: "critical",
      triggered_rule_ids: ["emergency_chest_pain"],
      input_data: {
        context: "checkout",
        answer_keys: ["patientName", "emergency_symptoms", "medication_name"],
      },
    }))
  })

  it("does not throw when the safety audit insert fails", async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: "db unavailable" } })
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn(() => ({ insert })),
    })

    await expect(recordSafetyEvaluationForOperators({
      answers: {},
      context: "checkout",
      result: {
        isAllowed: true,
        outcome: "ALLOW",
        riskTier: "low",
        requiresCall: false,
        triggeredRuleIds: [],
      },
      serviceSlug: "consult",
    })).resolves.toBeUndefined()
    expect(mocks.logger.error).toHaveBeenCalled()
  })
})
