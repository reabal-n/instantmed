import { describe, expect, it } from "vitest"

import { buildQueueSlaBreachPayload } from "@/lib/monitoring/queue-health"

describe("queue health telemetry", () => {
  it("does not send request identifiers to external SLA alerts", () => {
    const payload = buildQueueSlaBreachPayload({
      queueSize: 4,
      oldestRequestAgeMinutes: 91,
      oldestRequestId: "intake-sensitive-id",
      avgWaitTimeMinutes: 43,
      requestsWaitingOver30Min: 3,
      requestsWaitingOver60Min: 2,
      isHealthy: false,
      slaBreached: true,
    })

    expect(JSON.stringify(payload)).not.toContain("intake-sensitive-id")
    expect(payload.extra).toEqual({
      queueSize: 4,
      requestsBreaching: 2,
      oldestRequestMinutes: 91,
    })
  })
})
