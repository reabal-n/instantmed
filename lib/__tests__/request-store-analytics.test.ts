import { beforeEach, describe, expect, it, vi } from "vitest"

const captureMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/analytics/capture", () => ({
  capture: captureMock,
}))

import { useRequestStore } from "@/components/request/store"

const FIRST_FLOW_ID = "11111111-1111-4111-8111-111111111111"
const PREFILL_FLOW_ID = "22222222-2222-4222-8222-222222222222"

function prepareMedicationFlow(flowInstanceId: string) {
  useRequestStore.setState({
    serviceType: "repeat-script",
    flowInstanceId,
    currentStepId: "medication",
    answers: {},
  })
}

describe("request store analytics", () => {
  beforeEach(() => {
    captureMock.mockClear()
    useRequestStore.getState().reset()
  })

  it("emits one keyed engagement before privacy-safe answer metadata", () => {
    prepareMedicationFlow(FIRST_FLOW_ID)

    useRequestStore.getState().setAnswer("medicationName", "patient-entered medicine")
    useRequestStore.getState().setAnswer("prescriptionHistory", "less_than_3_months")

    const engagementCalls = captureMock.mock.calls.filter(
      ([event]) => event === "intake_engaged",
    )
    expect(engagementCalls).toEqual([
      [
        "intake_engaged",
        {
          service_type: "prescription",
          flow_instance_id: FIRST_FLOW_ID,
          step_id: "medication",
        },
      ],
    ])
    expect(JSON.stringify(engagementCalls)).not.toContain("patient-entered medicine")

    expect(captureMock).toHaveBeenCalledWith(
      "intake_answer_changed",
      expect.objectContaining({
        flow_instance_id: FIRST_FLOW_ID,
        answer_key: "medicationName",
        value_shape: "redacted",
      }),
    )
  })

  it("does not treat route seeding or profile prefill as engagement", () => {
    prepareMedicationFlow(PREFILL_FLOW_ID)

    useRequestStore.getState().setAnswer(
      "consultSubtype",
      "hair_loss",
      { touch: false },
    )

    expect(captureMock.mock.calls.some(([event]) => event === "intake_engaged")).toBe(false)
  })
})
